from pathlib import Path

from alembic import command
from alembic.config import Config
from pytest import MonkeyPatch
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app import db
from app.records import create_record
from app.schemas import NoteInput, ProjectInput
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
        session.commit()
        backup = export_data(session)
    first.dispose()

    second_path = tmp_path / "restored.db"
    second = db.make_engine(f"sqlite:///{second_path.as_posix()}")
    monkeypatch.setattr(db, "engine", second)
    command.upgrade(config, "head")
    with Session(second) as session:
        assert import_data(session, backup) == 2
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
