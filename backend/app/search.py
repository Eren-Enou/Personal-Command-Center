from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .deep_context import note_data
from .records import list_records, serialize, title_of


def search(session: Session, query: str) -> list[s.SearchResult]:
    needle = query.strip().casefold()
    if not needle:
        return []
    results = []
    parents = {}
    for kind in m.RECORD_MODELS:
        for record in list_records(session, kind):
            if kind in {"projects", "games", "media", "ideas", "utilities"}:
                parents[(kind, record.id)] = title_of(record)
            matches = {}
            for field, value in serialize(record).items():
                if field in {
                    "id",
                    "created_at",
                    "updated_at",
                    "related_id",
                    "related_type",
                    "archived",
                    "converted",
                    "converted_type",
                    "converted_id",
                }:
                    continue
                text = ", ".join(value) if isinstance(value, list) else str(value or "")
                if needle in text.casefold():
                    matches[field] = snippet(text, needle)
            if matches:
                results.append(
                    s.SearchResult.model_validate(
                        {
                            "kind": kind,
                            "id": record.id,
                            "title": title_of(record),
                            "matches": matches,
                            "archived": record.archived
                            if isinstance(record, m.InboxEntry)
                            else None,
                            "converted": record.converted
                            if isinstance(record, m.InboxEntry)
                            else False,
                            "converted_type": record.converted_type
                            if isinstance(record, m.InboxEntry)
                            else None,
                        }
                    )
                )
    topics = list(session.scalars(select(m.Topic)))
    counts = {
        str(row[0]): int(row[1])
        for row in (
            session.execute(
                select(m.context_note_topics.c.topic_id, func.count()).group_by(
                    m.context_note_topics.c.topic_id
                )
            ).all()
        )
    }
    for topic in topics:
        matches = {
            field: snippet(value, needle)
            for field, value in {"name": topic.name, "description": topic.description}.items()
            if needle in value.casefold()
        }
        if matches and (topic.parent_type, topic.parent_id) in parents:
            results.append(
                s.SearchResult.model_validate(
                    {
                        "kind": "topics",
                        "id": topic.id,
                        "title": topic.name,
                        "matches": matches,
                        "parent_type": topic.parent_type,
                        "parent_id": topic.parent_id,
                        "parent_title": parents[(topic.parent_type, topic.parent_id)],
                        "note_count": counts.get(topic.id, 0),
                    }
                )
            )
    for note in session.scalars(
        select(m.ContextNote).order_by(m.ContextNote.created_at.desc(), m.ContextNote.id)
    ):
        values = {"body": note.body, "tags": ", ".join(note_data(note)["tags"])}
        matches = {
            field: snippet(value, needle)
            for field, value in values.items()
            if needle in value.casefold()
        }
        if matches and (note.parent_type, note.parent_id) in parents:
            results.append(
                s.SearchResult.model_validate(
                    {
                        "kind": "context_notes",
                        "id": note.id,
                        "title": parents[(note.parent_type, note.parent_id)],
                        "matches": matches,
                        "parent_type": note.parent_type,
                        "parent_id": note.parent_id,
                        "parent_title": parents[(note.parent_type, note.parent_id)],
                        "topic_names": sorted(t.name for t in note.topics),
                    }
                )
            )
    return results


def snippet(text: str, needle: str) -> str:
    index = text.casefold().find(needle)
    start, end = max(0, index - 60), min(len(text), index + len(needle) + 140)
    if start:
        boundary = text.find(" ", start, index)
        if boundary >= 0:
            start = boundary + 1
    if end < len(text):
        boundary = text.rfind(" ", index + len(needle), end)
        if boundary >= 0:
            end = boundary
    return ("…" if start else "") + text[start:end] + ("…" if end < len(text) else "")
