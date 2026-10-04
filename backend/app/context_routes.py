from uuid import UUID

from fastapi import APIRouter, Response

from . import deep_context as context
from . import schemas as s
from .routes import DB

router = APIRouter(prefix="/api/context/{kind}/{record_id}")


@router.get("", response_model=s.ContextSpace)
def read_context(kind: s.ParentKind, record_id: UUID, db: DB) -> s.ContextSpace:
    return context.space(db, kind, record_id)


@router.post("/topics", response_model=s.TopicOut, status_code=201)
def create_topic(
    kind: s.ParentKind, record_id: UUID, payload: s.TopicInput, db: DB
) -> dict[str, object]:
    topic = context.save_topic(db, kind, record_id, payload)
    db.commit()
    return context.topic_data(topic)


@router.put("/topics/{topic_id}", response_model=s.TopicOut)
def edit_topic(
    kind: s.ParentKind, record_id: UUID, topic_id: UUID, payload: s.TopicInput, db: DB
) -> dict[str, object]:
    topic = context.save_topic(db, kind, record_id, payload, topic_id)
    db.commit()
    return context.topic_data(topic)


@router.delete("/topics/{topic_id}", status_code=204)
def delete_topic(kind: s.ParentKind, record_id: UUID, topic_id: UUID, db: DB) -> Response:
    context.remove_topic(db, kind, record_id, topic_id)
    db.commit()
    return Response(status_code=204)


@router.post("/notes", response_model=s.ContextNoteOut, status_code=201)
def create_context_note(
    kind: s.ParentKind, record_id: UUID, payload: s.ContextNoteInput, db: DB
) -> dict[str, object]:
    note = context.save_note(db, kind, record_id, payload)
    db.commit()
    return context.note_data(note)


@router.put("/notes/{note_id}", response_model=s.ContextNoteOut)
def edit_context_note(
    kind: s.ParentKind, record_id: UUID, note_id: UUID, payload: s.ContextNoteInput, db: DB
) -> dict[str, object]:
    note = context.save_note(db, kind, record_id, payload, note_id)
    db.commit()
    return context.note_data(note)


@router.delete("/notes/{note_id}", status_code=204)
def delete_context_note(kind: s.ParentKind, record_id: UUID, note_id: UUID, db: DB) -> Response:
    context.remove_note(db, kind, record_id, note_id)
    db.commit()
    return Response(status_code=204)
