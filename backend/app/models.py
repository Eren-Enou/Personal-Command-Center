from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RecordColumns:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[str] = mapped_column(String, default=now)
    updated_at: Mapped[str] = mapped_column(String, default=now)


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(80), unique=True)


projects_tags = Table(
    "projects_tags",
    Base.metadata,
    Column("record_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Project(RecordColumns, Base):
    __tablename__ = "projects"
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(Text, default="active")
    repository_url: Mapped[str] = mapped_column(Text, default="")
    next_step: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[Tag]] = relationship(secondary=projects_tags, lazy="selectin")


games_tags = Table(
    "games_tags",
    Base.metadata,
    Column("record_id", ForeignKey("games.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Game(RecordColumns, Base):
    __tablename__ = "games"
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(Text, default="playing")
    platform_or_server: Mapped[str] = mapped_column(Text, default="")
    character_or_build: Mapped[str] = mapped_column(Text, default="")
    current_goal: Mapped[str] = mapped_column(Text, default="")
    release_date: Mapped[str] = mapped_column(Text, default="")
    links: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[Tag]] = relationship(secondary=games_tags, lazy="selectin")


media_tags = Table(
    "media_tags",
    Base.metadata,
    Column("record_id", ForeignKey("media.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class MediaItem(RecordColumns, Base):
    __tablename__ = "media"
    title: Mapped[str] = mapped_column(String(300))
    media_type: Mapped[str] = mapped_column(Text, default="book")
    status: Mapped[str] = mapped_column(Text, default="planned")
    progress: Mapped[str] = mapped_column(Text, default="")
    rating: Mapped[int | None] = mapped_column(Integer, default=None)
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[Tag]] = relationship(secondary=media_tags, lazy="selectin")


ideas_tags = Table(
    "ideas_tags",
    Base.metadata,
    Column("record_id", ForeignKey("ideas.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Idea(RecordColumns, Base):
    __tablename__ = "ideas"
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(Text, default="new")
    tags: Mapped[list[Tag]] = relationship(secondary=ideas_tags, lazy="selectin")


notes_tags = Table(
    "notes_tags",
    Base.metadata,
    Column("record_id", ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Note(RecordColumns, Base):
    __tablename__ = "notes"
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="")
    related_type: Mapped[str | None] = mapped_column(Text, default=None)
    related_id: Mapped[str | None] = mapped_column(Text, default=None)
    tags: Mapped[list[Tag]] = relationship(secondary=notes_tags, lazy="selectin")


inbox_tags = Table(
    "inbox_tags",
    Base.metadata,
    Column("record_id", ForeignKey("inbox.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class InboxEntry(RecordColumns, Base):
    __tablename__ = "inbox"
    text: Mapped[str] = mapped_column(Text, default="")
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list[Tag]] = relationship(secondary=inbox_tags, lazy="selectin")


utilities_tags = Table(
    "utilities_tags",
    Base.metadata,
    Column("record_id", ForeignKey("utilities.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Utility(RecordColumns, Base):
    __tablename__ = "utilities"
    title: Mapped[str] = mapped_column(String(300))
    utility_type: Mapped[str] = mapped_column(Text, default="snippet")
    content: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list[Tag]] = relationship(secondary=utilities_tags, lazy="selectin")


class Activity(RecordColumns, Base):
    __tablename__ = "activity"
    kind: Mapped[str] = mapped_column(String)
    record_id: Mapped[str] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(Text)


Record = Project | Game | MediaItem | Idea | Note | InboxEntry | Utility
RECORD_MODELS: dict[
    str,
    type[Project]
    | type[Game]
    | type[MediaItem]
    | type[Idea]
    | type[Note]
    | type[InboxEntry]
    | type[Utility],
] = {
    "projects": Project,
    "games": Game,
    "media": MediaItem,
    "ideas": Idea,
    "notes": Note,
    "inbox": InboxEntry,
    "utilities": Utility,
}
