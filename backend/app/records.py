from typing import Any, cast
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s


def serialize(record: m.Record) -> dict[str, Any]:
    values = {column.name: getattr(record, column.name) for column in record.__table__.columns}
    values["tags"] = sorted(tag.name for tag in record.tags)
    return values


def title_of(record: m.Record) -> str:
    return record.text[:300] if isinstance(record, m.InboxEntry) else record.title


def list_records(session: Session, kind: str) -> list[m.Record]:
    model = m.RECORD_MODELS[kind]
    return list(session.scalars(select(model).order_by(model.updated_at.desc(), model.id)))


def get_record(session: Session, kind: str, record_id: str | UUID) -> m.Record:
    record = session.get(m.RECORD_MODELS[kind], str(record_id))
    if record is None:
        raise HTTPException(404, "Record not found")
    return cast(m.Record, record)


def resolve_tags(session: Session, names: list[str]) -> list[m.Tag]:
    result = []
    for name in names:
        tag = session.scalar(select(m.Tag).where(m.Tag.name == name))
        if tag is None:
            tag = m.Tag(name=name)
            session.add(tag)
            session.flush()
        result.append(tag)
    return result


def log(session: Session, kind: str, record: m.Record, action: str) -> None:
    session.add(m.Activity(kind=kind, record_id=record.id, action=action, title=title_of(record)))


def validate_relation(session: Session, values: dict[str, Any]) -> None:
    if values.get("related_type"):
        get_record(session, values["related_type"], values["related_id"])


def create_record(session: Session, kind: str, payload: s.InputModel) -> m.Record:
    values = payload.model_dump(mode="json")
    names = values.pop("tags")
    validate_relation(session, values)
    record = m.RECORD_MODELS[kind](**values)
    record.tags = resolve_tags(session, names)
    session.add(record)
    session.flush()
    log(session, kind, record, "captured" if kind == "inbox" else "created")
    return record


def update_record(
    session: Session, kind: str, record_id: UUID, changes: dict[str, Any]
) -> m.Record:
    record = get_record(session, kind, record_id)
    before = serialize(record)
    values = {
        key: value
        for key, value in before.items()
        if key
        not in {"id", "created_at", "updated_at", "converted", "converted_type", "converted_id"}
    }
    values.update(changes)
    validated = s.INPUT_SCHEMAS[kind].model_validate(values).model_dump(mode="json")
    validate_relation(session, validated)
    record.tags = resolve_tags(session, validated.pop("tags"))
    for key, value in validated.items():
        setattr(record, key, value)
    record.updated_at = m.now()
    action = "updated"
    if kind == "inbox" and before["archived"] != validated["archived"]:
        action = "archived" if validated["archived"] else "restored"
    log(session, kind, record, action)
    return record


def delete_record(session: Session, kind: str, record_id: UUID) -> None:
    record = get_record(session, kind, record_id)
    for note in session.scalars(
        select(m.Note).where(m.Note.related_type == kind, m.Note.related_id == str(record_id))
    ):
        note.related_id = None
        note.related_type = None
        note.updated_at = m.now()
    log(session, kind, record, "deleted")
    session.delete(record)


def convert_inbox(session: Session, record_id: UUID, payload: s.Conversion) -> tuple[str, m.Record]:
    source = get_record(session, "inbox", record_id)
    assert isinstance(source, m.InboxEntry)
    if source.archived:
        raise HTTPException(409, "Restore the archived entry before converting it")
    field = {
        "projects": "description",
        "games": "notes",
        "media": "notes",
        "ideas": "body",
        "notes": "body",
        "utilities": "content",
    }[payload.target]
    values = {"title": payload.title, field: source.text, "tags": [tag.name for tag in source.tags]}
    result = create_record(
        session, payload.target, s.INPUT_SCHEMAS[payload.target].model_validate(values)
    )
    source.converted = True
    source.converted_type = payload.target
    source.converted_id = result.id
    source.archived = True
    source.updated_at = m.now()
    log(session, "inbox", source, "converted")
    return payload.target, result
