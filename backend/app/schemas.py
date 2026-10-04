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
    pass


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
        "created", "updated", "deleted", "captured", "archived", "restored", "converted"
    ]
    title: str


class TagOut(BaseModel):
    id: UUID
    name: TagName


class Backup(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1]
    projects: list[ProjectOut]
    games: list[GameOut]
    media: list[MediaItemOut]
    ideas: list[IdeaOut]
    notes: list[NoteOut]
    inbox: list[InboxEntryOut]
    utilities: list[UtilityOut]
    tags: list[TagOut]
    activity: list[ActivityOut]


class Conversion(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    target: Literal["projects", "games", "media", "ideas", "notes", "utilities"]
    title: Title


class ConversionResult(BaseModel):
    kind: Kind
    record: ProjectOut | GameOut | MediaItemOut | IdeaOut | NoteOut | UtilityOut


class SearchResult(BaseModel):
    kind: Kind
    id: UUID
    title: str
    matches: dict[str, str]


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
