from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .records import list_records, serialize


def export_data(session: Session) -> s.Backup:
    data: dict[str, Any] = {
        kind: [serialize(row) for row in list_records(session, kind)] for kind in m.RECORD_MODELS
    }
    data.update(
        schema_version=2,
        tags=[{"id": tag.id, "name": tag.name} for tag in session.scalars(select(m.Tag))],
        activity=[
            {column.name: getattr(row, column.name) for column in row.__table__.columns}
            for row in session.scalars(select(m.Activity).order_by(m.Activity.created_at))
        ],
    )
    return s.Backup.model_validate(data)


def import_data(session: Session, backup: s.Backup) -> int:
    data = backup.model_dump(mode="json")
    # Complete preflight before any writes. References must be self-contained.
    ids: dict[str, set[str]] = {}
    for kind, model in {**m.RECORD_MODELS, "activity": m.Activity}.items():
        rows = data[kind]
        ids[kind] = {row["id"] for row in rows}
        if len(ids[kind]) != len(rows):
            raise HTTPException(422, f"Duplicate IDs in {kind}")
        if any(session.get(model, record_id) is not None for record_id in ids[kind]):
            raise HTTPException(
                409, f"Import conflicts with existing {kind} IDs; nothing was imported"
            )
    tag_names = {tag["name"] for tag in data["tags"]}
    tag_ids = {tag["id"] for tag in data["tags"]}
    if len(tag_names) != len(data["tags"]) or len(tag_ids) != len(data["tags"]):
        raise HTTPException(422, "Duplicate tag names or IDs")
    for tag in data["tags"]:
        if tag["name"] != tag["name"].strip().casefold():
            raise HTTPException(422, "Tag names must be normalized")
        existing = session.get(m.Tag, tag["id"])
        if existing and existing.name != tag["name"]:
            raise HTTPException(409, "Tag ID belongs to a different name")
    for kind in m.RECORD_MODELS:
        for row in data[kind]:
            if not set(row["tags"]).issubset(tag_names):
                raise HTTPException(422, f"Unknown tag in {kind}")
    for note in data["notes"]:
        if note["related_type"] and note["related_id"] not in ids[note["related_type"]]:
            raise HTTPException(422, "Note references a record missing from the backup")
    # Conversion pointers, like activity, may reference deleted records.
    if backup.schema_version == 1:
        converted_ids = {
            row["record_id"]
            for row in data["activity"]
            if row["kind"] == "inbox" and row["action"] == "converted"
        }
        for row in data["inbox"]:
            if row["id"] in converted_ids:
                row["converted"] = True
    # Activity may reference deleted records, intentionally.
    tags = {}
    for values in data["tags"]:
        tag = session.scalar(select(m.Tag).where(m.Tag.name == values["name"]))
        if tag is None:
            tag = m.Tag(**values)
            session.add(tag)
        tags[tag.name] = tag
    for kind, model in m.RECORD_MODELS.items():
        for values in data[kind]:
            names = values.pop("tags")
            record = model(**values)
            record.tags = [tags[name] for name in names]
            session.add(record)
    for values in data["activity"]:
        session.add(m.Activity(**values))
    session.flush()
    return sum(len(data[kind]) for kind in m.RECORD_MODELS)
