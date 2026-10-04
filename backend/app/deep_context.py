from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .records import get_record, resolve_tags, title_of

PARENT_KINDS = {"projects", "games", "media", "ideas", "utilities"}


def parent(session: Session, kind: str, record_id: UUID | str) -> m.Record:
    if kind not in PARENT_KINDS:
        raise HTTPException(422, "This domain does not support Deep Context")
    return get_record(session, kind, record_id)


def topic_data(topic: m.Topic) -> dict[str, Any]:
    return {
        c.name: getattr(topic, c.name)
        for c in topic.__table__.columns
        if c.name != "normalized_name"
    }


def note_data(note: m.ContextNote) -> dict[str, Any]:
    return {
        **{c.name: getattr(note, c.name) for c in note.__table__.columns},
        "topic_ids": sorted(t.id for t in note.topics),
        "tags": sorted(t.name for t in note.tags),
    }


def space(session: Session, kind: str, record_id: UUID) -> s.ContextSpace:
    parent(session, kind, record_id)
    counts = {
        str(row[0]): int(row[1])
        for row in (
            session.execute(
                select(m.context_note_topics.c.topic_id, func.count())
                .join(m.Topic, m.Topic.id == m.context_note_topics.c.topic_id)
                .where(m.Topic.parent_type == kind, m.Topic.parent_id == str(record_id))
                .group_by(m.context_note_topics.c.topic_id)
            ).all()
        )
    }
    topics = session.scalars(
        select(m.Topic)
        .where(m.Topic.parent_type == kind, m.Topic.parent_id == str(record_id))
        .order_by(m.Topic.normalized_name, m.Topic.id)
    )
    notes = session.scalars(
        select(m.ContextNote)
        .where(m.ContextNote.parent_type == kind, m.ContextNote.parent_id == str(record_id))
        .order_by(m.ContextNote.created_at.desc(), m.ContextNote.id)
    )
    return s.ContextSpace(
        topics=[
            s.TopicView.model_validate({**topic_data(t), "note_count": counts.get(t.id, 0)})
            for t in topics
        ],
        context_notes=[s.ContextNoteOut.model_validate(note_data(n)) for n in notes],
    )


def event(session: Session, kind: str, record_id: UUID, action: str, detail: str) -> None:
    owner = parent(session, kind, record_id)
    session.add(
        m.Activity(
            kind=kind,
            record_id=str(record_id),
            action=action,
            title=f"{title_of(owner)} · {detail[:100]}",
        )
    )


def get_topic(session: Session, kind: str, record_id: UUID, topic_id: UUID) -> m.Topic:
    parent(session, kind, record_id)
    topic = session.get(m.Topic, str(topic_id))
    if topic is None or (topic.parent_type, topic.parent_id) != (kind, str(record_id)):
        raise HTTPException(404, "Topic not found in this record")
    return topic


def save_topic(
    session: Session,
    kind: str,
    record_id: UUID,
    payload: s.TopicInput,
    topic_id: UUID | None = None,
) -> m.Topic:
    parent(session, kind, record_id)
    topic = (
        get_topic(session, kind, record_id, topic_id)
        if topic_id
        else m.Topic(parent_type=kind, parent_id=str(record_id))
    )
    normalized = payload.name.casefold()
    duplicate = session.scalar(
        select(m.Topic).where(
            m.Topic.parent_type == kind,
            m.Topic.parent_id == str(record_id),
            m.Topic.normalized_name == normalized,
        )
    )
    if duplicate and duplicate.id != topic.id:
        raise HTTPException(409, "A Topic with this name already exists in this record")
    topic.name, topic.normalized_name, topic.description = (
        payload.name,
        normalized,
        payload.description,
    )
    if topic_id:
        topic.updated_at = m.now()
    session.add(topic)
    session.flush()
    event(session, kind, record_id, "topic_updated" if topic_id else "topic_created", topic.name)
    return topic


def remove_topic(session: Session, kind: str, record_id: UUID, topic_id: UUID) -> None:
    topic = get_topic(session, kind, record_id, topic_id)
    event(session, kind, record_id, "topic_deleted", topic.name)
    session.delete(topic)
    session.flush()


def get_note(session: Session, kind: str, record_id: UUID, note_id: UUID) -> m.ContextNote:
    parent(session, kind, record_id)
    note = session.get(m.ContextNote, str(note_id))
    if note is None or (note.parent_type, note.parent_id) != (kind, str(record_id)):
        raise HTTPException(404, "Context Note not found in this record")
    return note


def save_note(
    session: Session,
    kind: str,
    record_id: UUID,
    payload: s.ContextNoteInput,
    note_id: UUID | None = None,
) -> m.ContextNote:
    parent(session, kind, record_id)
    topics = [get_topic(session, kind, record_id, t) for t in payload.topic_ids]
    note = (
        get_note(session, kind, record_id, note_id)
        if note_id
        else m.ContextNote(parent_type=kind, parent_id=str(record_id))
    )
    note.body = payload.body
    note.topics = topics
    note.tags = resolve_tags(session, payload.tags)
    if note_id:
        note.updated_at = m.now()
    session.add(note)
    session.flush()
    event(
        session,
        kind,
        record_id,
        "context_note_updated" if note_id else "context_note_added",
        note.body,
    )
    return note


def remove_note(session: Session, kind: str, record_id: UUID, note_id: UUID) -> None:
    note = get_note(session, kind, record_id, note_id)
    event(session, kind, record_id, "context_note_deleted", note.body)
    session.delete(note)
    session.flush()


def cleanup_parent(session: Session, kind: str, record_id: UUID) -> None:
    session.execute(
        delete(m.ContextNote).where(
            m.ContextNote.parent_type == kind, m.ContextNote.parent_id == str(record_id)
        )
    )
    session.execute(
        delete(m.Topic).where(m.Topic.parent_type == kind, m.Topic.parent_id == str(record_id))
    )
