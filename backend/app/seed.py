"""Optional fictional demo data: python -m app.seed. Never runs on startup."""

from uuid import UUID

from sqlalchemy import func, select

from . import models as m
from .db import SessionLocal
from .records import create_record
from .schemas import (
    GameInput,
    IdeaInput,
    InboxEntryInput,
    MediaItemInput,
    NoteInput,
    ProjectInput,
    UtilityInput,
)


def main() -> None:
    with SessionLocal() as session:
        if any(
            session.scalar(select(func.count()).select_from(model))
            for model in m.RECORD_MODELS.values()
        ):
            raise SystemExit(
                "Demo seed requires an empty workspace; existing data was not changed."
            )
        project = create_record(
            session,
            "projects",
            ProjectInput(
                title="Pocket observatory",
                description="A tiny offline sky journal for weekend stargazing.",
                next_step="Sketch the observation entry screen",
                tags=["weekend", "code"],
                repository_url="https://example.com/pocket-observatory",
            ),
        )
        create_record(
            session,
            "projects",
            ProjectInput(
                title="Recipe index",
                status="paused",
                description="Family recipes, without the scrolling.",
                next_step="Decide how to store ingredient quantities",
                tags=["home"],
            ),
        )
        create_record(
            session,
            "games",
            GameInput(
                title="Moonfall Expedition",
                platform_or_server="PC · solo",
                character_or_build="Cartographer / support",
                current_goal="Explore the lighthouse on the northern coast",
                tags=["adventure", "weekend"],
            ),
        )
        create_record(
            session,
            "media",
            MediaItemInput(
                title="The Glass Orchard",
                media_type="book",
                status="in_progress",
                progress="Chapter 8 of 24",
                notes="A fictional tale of a city that grows its buildings.",
                tags=["reading"],
            ),
        )
        create_record(
            session,
            "ideas",
            IdeaInput(
                title="A map of small discoveries",
                body="Record interesting things seen on neighborhood walks.",
                category="tools",
                tags=["weekend"],
            ),
        )
        create_record(
            session,
            "notes",
            NoteInput(
                title="Observatory design notes",
                body="Start with a date, a place, and one observation. Everything else can wait.",
                related_type="projects",
                related_id=UUID(project.id),
                tags=["code"],
            ),
        )
        create_record(
            session,
            "inbox",
            InboxEntryInput(
                text="Try a field journal for the next meteor shower", tags=["weekend"]
            ),
        )
        create_record(
            session, "inbox", InboxEntryInput(text="Find a good recipe for rainy Sundays")
        )
        create_record(
            session,
            "utilities",
            UtilityInput(
                title="Serve a scratch directory",
                utility_type="command",
                content="python -m http.server 8080 --bind 127.0.0.1",
                notes="Run in a directory containing files you want to preview.",
                tags=["code"],
            ),
        )
        session.commit()
    print("Added 9 fictional demo records.")


if __name__ == "__main__":
    main()
