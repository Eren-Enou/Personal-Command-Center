from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Kind = Literal["projects", "games", "media", "ideas", "notes", "inbox", "utilities"]
Title = Annotated[str, Field(min_length=1, max_length=300)]
TagName = Annotated[str, Field(min_length=1, max_length=80)]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] = Field(default_factory=list, max_length=100)

    @field_validator("tags")
    @classmethod
    def normalized_tags(cls, value: list[str]) -> list[str]:
        normalized = sorted(set(tag.strip().casefold() for tag in value))
        if any(not tag or len(tag) > 80 for tag in normalized):
            raise ValueError("Tags must contain 1–80 characters")
        return normalized

    @field_validator("title", "text", check_fields=False)
    @classmethod
    def nonblank_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Content cannot be blank")
        return value


class Metadata(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def aware_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("Timestamps must include a timezone")
        return value


class ProjectInput(InputModel):
    title: Title
    description: str = ""
    status: Literal["active", "paused", "completed", "abandoned"] = "active"
    repository_url: str = ""
    next_step: str = ""
    notes: str = ""

    @field_validator("repository_url")
    @classmethod
    def safe_url(cls, value: str) -> str:
        if value and not value.startswith(("https://", "http://")):
            raise ValueError("Use an http or https repository URL")
        return value


class ProjectOut(ProjectInput, Metadata):
    pass


class GameInput(InputModel):
    title: Title
    status: Literal["playing", "waiting", "paused", "completed", "dropped"] = "playing"
    platform_or_server: str = ""
    character_or_build: str = ""
    current_goal: str = ""
    release_date: str = ""
    links: str = ""
    notes: str = ""

    @field_validator("release_date")
    @classmethod
    def valid_date(cls, value: str) -> str:
        if value:
            date.fromisoformat(value)
        return value


class GameOut(GameInput, Metadata):
    pass


class MediaItemInput(InputModel):
    title: Title
    media_type: str = "book"
    status: Literal["planned", "in_progress", "completed", "dropped"] = "planned"
    progress: str = ""
    rating: Annotated[int | None, Field(ge=0, le=10)] = None
    notes: str = ""


class MediaItemOut(MediaItemInput, Metadata):
    pass


class IdeaInput(InputModel):
    title: Title
    body: str = ""
    category: str = ""
    status: Literal["new", "exploring", "done", "archived"] = "new"


class IdeaOut(IdeaInput, Metadata):
    pass


class NoteInput(InputModel):
    title: Title
    body: str = ""
    related_type: Kind | None = None
    related_id: UUID | None = None

    @model_validator(mode="after")
    def complete_relation(self) -> "NoteInput":
        if (self.related_type is None) != (self.related_id is None):
            raise ValueError("Choose both a related type and record, or neither")
        return self


class NoteOut(NoteInput, Metadata):
    pass


class InboxEntryInput(InputModel):
    text: Annotated[str, Field(min_length=1, max_length=100000)]
    archived: bool = False


class InboxEntryOut(InboxEntryInput, Metadata):
    converted: bool = False
    converted_type: Literal["projects", "games", "media", "ideas", "notes", "utilities"] | None = (
        None
    )
    converted_id: UUID | None = None

    @model_validator(mode="after")
    def complete_destination(self) -> "InboxEntryOut":
        if (self.converted_type is None) != (self.converted_id is None):
            raise ValueError("Conversion destination requires both type and ID")
        if self.converted_type and not self.converted:
            raise ValueError("Destination requires a converted source")
        return self


class UtilityInput(InputModel):
    title: Title
    utility_type: str = "snippet"
    content: str = ""
    notes: str = ""


class UtilityOut(UtilityInput, Metadata):
    pass


class ActivityOut(Metadata):
    model_config = ConfigDict(extra="forbid")
    kind: Kind
    record_id: UUID
    action: Literal[
        "created",
        "updated",
        "deleted",
        "captured",
        "archived",
        "restored",
        "converted",
        "topic_created",
        "topic_updated",
        "topic_deleted",
        "context_note_added",
        "context_note_updated",
        "context_note_deleted",
    ]
    title: str


class TagOut(BaseModel):
    id: UUID
    name: TagName


class Conversion(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    target: Literal["projects", "games", "media", "ideas", "notes", "utilities"]
    title: Title


class ConversionResult(BaseModel):
    kind: Kind
    record: ProjectOut | GameOut | MediaItemOut | IdeaOut | NoteOut | UtilityOut


class ActivityView(ActivityOut):
    record_exists: bool


class SearchResult(BaseModel):
    kind: Kind | Literal["topics", "context_notes"]
    id: UUID
    title: str
    matches: dict[str, str]
    parent_type: Kind | None = None
    parent_id: UUID | None = None
    parent_title: str | None = None
    topic_names: list[str] = Field(default_factory=list)
    note_count: int | None = None
    archived: bool | None = None
    converted: bool = False
    converted_type: Kind | None = None


class DataInfo(BaseModel):
    name: str
    version: str
    database: str
    counts: dict[str, int]


INPUT_SCHEMAS: dict[str, type[InputModel]] = {
    "projects": ProjectInput,
    "games": GameInput,
    "media": MediaItemInput,
    "ideas": IdeaInput,
    "notes": NoteInput,
    "inbox": InboxEntryInput,
    "utilities": UtilityInput,
}


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] | None = None
    title: Title | None = None
    description: str | None = None
    status: Literal["active", "paused", "completed", "abandoned"] | None = None
    repository_url: str | None = None
    next_step: str | None = None
    notes: str | None = None


class GamePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] | None = None
    title: Title | None = None
    status: Literal["playing", "waiting", "paused", "completed", "dropped"] | None = None
    platform_or_server: str | None = None
    character_or_build: str | None = None
    current_goal: str | None = None
    release_date: str | None = None
    links: str | None = None
    notes: str | None = None


class MediaItemPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] | None = None
    title: Title | None = None
    media_type: str | None = None
    status: Literal["planned", "in_progress", "completed", "dropped"] | None = None
    progress: str | None = None
    rating: Annotated[int | None, Field(ge=0, le=10)] = None
    notes: str | None = None


class IdeaPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] | None = None
    title: Title | None = None
    body: str | None = None
    category: str | None = None
    status: Literal["new", "exploring", "done", "archived"] | None = None


class NotePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] | None = None
    title: Title | None = None
    body: str | None = None
    related_type: Kind | None = None
    related_id: UUID | None = None


class InboxEntryPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] | None = None
    text: Annotated[str, Field(min_length=1, max_length=100000)] | None = None
    archived: bool | None = None


class UtilityPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tags: list[TagName] | None = None
    title: Title | None = None
    utility_type: str | None = None
    content: str | None = None
    notes: str | None = None


ParentKind = Literal["projects", "games", "media", "ideas", "utilities"]


class TopicInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Annotated[str, Field(min_length=1, max_length=160)]
    description: str = ""

    @field_validator("name")
    @classmethod
    def display_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Topic name cannot be blank")
        return value


class TopicOut(TopicInput, Metadata):
    parent_type: ParentKind
    parent_id: UUID


class TopicView(TopicOut):
    note_count: int


class ContextNoteInput(InputModel):
    body: Annotated[str, Field(min_length=1, max_length=100000)]
    topic_ids: list[UUID] = Field(default_factory=list, max_length=100)

    @field_validator("body")
    @classmethod
    def nonblank_body(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Note body cannot be blank")
        return value

    @field_validator("topic_ids")
    @classmethod
    def unique_topics(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("Duplicate topic associations")
        return value


class ContextNoteOut(ContextNoteInput, Metadata):
    parent_type: ParentKind
    parent_id: UUID


class ContextSpace(BaseModel):
    topics: list[TopicView]
    context_notes: list[ContextNoteOut]


class Backup(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1, 2, 3]
    projects: list[ProjectOut]
    games: list[GameOut]
    media: list[MediaItemOut]
    ideas: list[IdeaOut]
    notes: list[NoteOut]
    inbox: list[InboxEntryOut]
    utilities: list[UtilityOut]
    tags: list[TagOut]
    activity: list[ActivityOut]
    topics: list[TopicOut] = Field(default_factory=list)
    context_notes: list[ContextNoteOut] = Field(default_factory=list)

    @model_validator(mode="after")
    def context_version(self) -> "Backup":
        if self.schema_version == 3 and not {"topics", "context_notes"}.issubset(
            self.model_fields_set
        ):
            raise ValueError("Version 3 requires Topics and Context Notes collections")
        if self.schema_version < 3 and (self.topics or self.context_notes):
            raise ValueError("Deep Context requires backup version 3")
        return self
