from pathlib import Path
from uuid import UUID

from alembic import command
from alembic.config import Config
from pytest import MonkeyPatch
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app import db
from app.deep_context import save_note, save_topic
from app.records import create_record
from app.schemas import ContextNoteInput, NoteInput, ProjectInput, TopicInput
from app.transfer import export_data, import_data


def test_clean_migrations_and_full_restore_after_reopen(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    first = db.make_engine(f"sqlite:///{(tmp_path / 'first.db').as_posix()}")
    monkeypatch.setattr(db, "engine", first)
    config = Config("alembic.ini")
    command.upgrade(config, "head")
    command.check(config)
    with Session(first) as session:
        project = create_record(
            session, "projects", ProjectInput(title="Persistent", tags=["shared"])
        )
        create_record(
            session,
            "notes",
            NoteInput.model_validate(
                {
                    "title": "Related",
                    "related_type": "projects",
                    "related_id": project.id,
                    "body": "\n    preserve_this\n",
                }
            ),
        )
        topic = save_topic(session, "projects", UUID(project.id), TopicInput(name="Architecture"))
        save_note(
            session,
            "projects",
            UUID(project.id),
            ContextNoteInput(
                body="\n    deep_context\n", topic_ids=[UUID(topic.id)], tags=["shared"]
            ),
        )
        session.commit()
        backup = export_data(session)
    first.dispose()

    second_path = tmp_path / "restored.db"
    second = db.make_engine(f"sqlite:///{second_path.as_posix()}")
    monkeypatch.setattr(db, "engine", second)
    command.upgrade(config, "head")
    with Session(second) as session:
        assert import_data(session, backup) == 4
        session.commit()
    second.dispose()
    reopened = db.make_engine(f"sqlite:///{second_path.as_posix()}")
    with Session(reopened) as session:
        assert export_data(session) == backup
        assert session.connection().exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
        assert session.connection().exec_driver_sql("PRAGMA foreign_key_check").all() == []
    monkeypatch.setattr(db, "engine", reopened)
    command.downgrade(config, "base")
    assert inspect(reopened).get_table_names() == ["alembic_version"]
    command.upgrade(config, "head")
    command.check(config)
    reopened.dispose()
