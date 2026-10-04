from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .deep_context import note_data, topic_data
from .records import list_records, serialize


def export_data(session: Session) -> s.Backup:
    data: dict[str, Any] = {
        kind: [serialize(row) for row in list_records(session, kind)] for kind in m.RECORD_MODELS
    }
    data.update(
        schema_version=3,
        topics=[topic_data(t) for t in session.scalars(select(m.Topic).order_by(m.Topic.id))],
        context_notes=[
            note_data(n) for n in session.scalars(select(m.ContextNote).order_by(m.ContextNote.id))
        ],
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
    for kind, model in {
        **m.RECORD_MODELS,
        "topics": m.Topic,
        "context_notes": m.ContextNote,
        "activity": m.Activity,
    }.items():
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
    for kind in [*m.RECORD_MODELS, "context_notes"]:
        for row in data[kind]:
            if not set(row["tags"]).issubset(tag_names):
                raise HTTPException(422, f"Unknown tag in {kind}")
    for note in data["notes"]:
        if note["related_type"] and note["related_id"] not in ids[note["related_type"]]:
            raise HTTPException(422, "Note references a record missing from the backup")
    topic_map = {row["id"]: row for row in data["topics"]}
    topic_keys = set()
    for row in [*data["topics"], *data["context_notes"]]:
        if row["parent_id"] not in ids[row["parent_type"]]:
            raise HTTPException(422, "Deep Context parent missing from backup")
    for row in data["topics"]:
        key = (row["parent_type"], row["parent_id"], row["name"].casefold())
        if key in topic_keys:
            raise HTTPException(422, "Duplicate Topic name within parent")
        topic_keys.add(key)
    for note in data["context_notes"]:
        for topic_id in note["topic_ids"]:
            topic = topic_map.get(topic_id)
            if not topic or (topic["parent_type"], topic["parent_id"]) != (
                note["parent_type"],
                note["parent_id"],
            ):
                raise HTTPException(
                    422, "Topic association crosses parent or references missing Topic"
                )
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
    topics = {}
    for values in data["topics"]:
        topic = m.Topic(**values, normalized_name=values["name"].casefold())
        topics[topic.id] = topic
        session.add(topic)
    session.flush()
    for values in data["context_notes"]:
        topic_ids = values.pop("topic_ids")
        names = values.pop("tags")
        note = m.ContextNote(**values)
        note.topics = [topics[topic_id] for topic_id in topic_ids]
        note.tags = [tags[name] for name in names]
        session.add(note)
    for values in data["activity"]:
        session.add(m.Activity(**values))
    session.flush()
    return sum(len(data[kind]) for kind in [*m.RECORD_MODELS, "topics", "context_notes"])
