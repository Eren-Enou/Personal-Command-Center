from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .records import list_records, serialize, title_of


def search(session: Session, query: str) -> list[s.SearchResult]:
    needle = query.strip().casefold()
    if not needle:
        return []
    results = []
    for kind in m.RECORD_MODELS:
        for record in list_records(session, kind):
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
                index = text.casefold().find(needle)
                if index >= 0:
                    # Casefold can change character lengths; return a generous context window.
                    start = max(0, index - 60)
                    end = min(len(text), index + len(needle) + 140)
                    if start:
                        boundary = text.find(" ", start, index)
                        if boundary >= 0:
                            start = boundary + 1
                    if end < len(text):
                        boundary = text.rfind(" ", index + len(needle), end)
                        if boundary >= 0:
                            end = boundary
                    matches[field] = (
                        ("\u2026" if start else "")
                        + text[start:end]
                        + ("\u2026" if end < len(text) else "")
                    )
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
    return results
