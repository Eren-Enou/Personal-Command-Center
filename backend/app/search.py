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
                if field in {"id", "created_at", "updated_at", "related_id", "related_type"}:
                    continue
                text = ", ".join(value) if isinstance(value, list) else str(value or "")
                index = text.casefold().find(needle)
                if index >= 0:
                    # Casefold can change character lengths; return a generous context window.
                    start = max(0, index - 60)
                    matches[field] = ("…" if start else "") + text[
                        start : index + len(needle) + 140
                    ]
            if matches:
                results.append(
                    s.SearchResult.model_validate(
                        {
                            "kind": kind,
                            "id": record.id,
                            "title": title_of(record),
                            "matches": matches,
                        }
                    )
                )
    return results
