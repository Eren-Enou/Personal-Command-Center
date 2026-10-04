from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from . import records
from . import schemas as s
from .db import get_session

router = APIRouter(prefix="/api")
DB = Annotated[Session, Depends(get_session)]


@router.get("/projects", response_model=list[s.ProjectOut])
def list_projects(db: DB) -> list[dict[str, object]]:
    return [records.serialize(row) for row in records.list_records(db, "projects")]


@router.get("/projects/{record_id}", response_model=s.ProjectOut)
def get_projects(record_id: UUID, db: DB) -> dict[str, object]:
    return records.serialize(records.get_record(db, "projects", record_id))


@router.post("/projects", response_model=s.ProjectOut, status_code=201)
def create_projects(payload: s.ProjectInput, db: DB) -> dict[str, object]:
    row = records.create_record(db, "projects", payload)
    db.commit()
    return records.serialize(row)


@router.patch("/projects/{record_id}", response_model=s.ProjectOut)
def update_projects(record_id: UUID, payload: s.ProjectPatch, db: DB) -> dict[str, object]:
    row = records.update_record(
        db, "projects", record_id, payload.model_dump(exclude_unset=True, mode="json")
    )
    db.commit()
    return records.serialize(row)


@router.delete("/projects/{record_id}", status_code=204)
def delete_projects(record_id: UUID, db: DB) -> Response:
    records.delete_record(db, "projects", record_id)
    db.commit()
    return Response(status_code=204)


@router.get("/games", response_model=list[s.GameOut])
def list_games(db: DB) -> list[dict[str, object]]:
    return [records.serialize(row) for row in records.list_records(db, "games")]


@router.get("/games/{record_id}", response_model=s.GameOut)
def get_games(record_id: UUID, db: DB) -> dict[str, object]:
    return records.serialize(records.get_record(db, "games", record_id))


@router.post("/games", response_model=s.GameOut, status_code=201)
def create_games(payload: s.GameInput, db: DB) -> dict[str, object]:
    row = records.create_record(db, "games", payload)
    db.commit()
    return records.serialize(row)


@router.patch("/games/{record_id}", response_model=s.GameOut)
def update_games(record_id: UUID, payload: s.GamePatch, db: DB) -> dict[str, object]:
    row = records.update_record(
        db, "games", record_id, payload.model_dump(exclude_unset=True, mode="json")
    )
    db.commit()
    return records.serialize(row)


@router.delete("/games/{record_id}", status_code=204)
def delete_games(record_id: UUID, db: DB) -> Response:
    records.delete_record(db, "games", record_id)
    db.commit()
    return Response(status_code=204)


@router.get("/media", response_model=list[s.MediaItemOut])
def list_media(db: DB) -> list[dict[str, object]]:
    return [records.serialize(row) for row in records.list_records(db, "media")]


@router.get("/media/{record_id}", response_model=s.MediaItemOut)
def get_media(record_id: UUID, db: DB) -> dict[str, object]:
    return records.serialize(records.get_record(db, "media", record_id))


@router.post("/media", response_model=s.MediaItemOut, status_code=201)
def create_media(payload: s.MediaItemInput, db: DB) -> dict[str, object]:
    row = records.create_record(db, "media", payload)
    db.commit()
    return records.serialize(row)


@router.patch("/media/{record_id}", response_model=s.MediaItemOut)
def update_media(record_id: UUID, payload: s.MediaItemPatch, db: DB) -> dict[str, object]:
    row = records.update_record(
        db, "media", record_id, payload.model_dump(exclude_unset=True, mode="json")
    )
    db.commit()
    return records.serialize(row)


@router.delete("/media/{record_id}", status_code=204)
def delete_media(record_id: UUID, db: DB) -> Response:
    records.delete_record(db, "media", record_id)
    db.commit()
    return Response(status_code=204)


@router.get("/ideas", response_model=list[s.IdeaOut])
def list_ideas(db: DB) -> list[dict[str, object]]:
    return [records.serialize(row) for row in records.list_records(db, "ideas")]


@router.get("/ideas/{record_id}", response_model=s.IdeaOut)
def get_ideas(record_id: UUID, db: DB) -> dict[str, object]:
    return records.serialize(records.get_record(db, "ideas", record_id))


@router.post("/ideas", response_model=s.IdeaOut, status_code=201)
def create_ideas(payload: s.IdeaInput, db: DB) -> dict[str, object]:
    row = records.create_record(db, "ideas", payload)
    db.commit()
    return records.serialize(row)


@router.patch("/ideas/{record_id}", response_model=s.IdeaOut)
def update_ideas(record_id: UUID, payload: s.IdeaPatch, db: DB) -> dict[str, object]:
    row = records.update_record(
        db, "ideas", record_id, payload.model_dump(exclude_unset=True, mode="json")
    )
    db.commit()
    return records.serialize(row)


@router.delete("/ideas/{record_id}", status_code=204)
def delete_ideas(record_id: UUID, db: DB) -> Response:
    records.delete_record(db, "ideas", record_id)
    db.commit()
    return Response(status_code=204)


@router.get("/notes", response_model=list[s.NoteOut])
def list_notes(db: DB) -> list[dict[str, object]]:
    return [records.serialize(row) for row in records.list_records(db, "notes")]


@router.get("/notes/{record_id}", response_model=s.NoteOut)
def get_notes(record_id: UUID, db: DB) -> dict[str, object]:
    return records.serialize(records.get_record(db, "notes", record_id))


@router.post("/notes", response_model=s.NoteOut, status_code=201)
def create_notes(payload: s.NoteInput, db: DB) -> dict[str, object]:
    row = records.create_record(db, "notes", payload)
    db.commit()
    return records.serialize(row)


@router.patch("/notes/{record_id}", response_model=s.NoteOut)
def update_notes(record_id: UUID, payload: s.NotePatch, db: DB) -> dict[str, object]:
    row = records.update_record(
        db, "notes", record_id, payload.model_dump(exclude_unset=True, mode="json")
    )
    db.commit()
    return records.serialize(row)


@router.delete("/notes/{record_id}", status_code=204)
def delete_notes(record_id: UUID, db: DB) -> Response:
    records.delete_record(db, "notes", record_id)
    db.commit()
    return Response(status_code=204)


@router.get("/inbox", response_model=list[s.InboxEntryOut])
def list_inbox(db: DB) -> list[dict[str, object]]:
    return [records.serialize(row) for row in records.list_records(db, "inbox")]


@router.get("/inbox/{record_id}", response_model=s.InboxEntryOut)
def get_inbox(record_id: UUID, db: DB) -> dict[str, object]:
    return records.serialize(records.get_record(db, "inbox", record_id))


@router.post("/inbox", response_model=s.InboxEntryOut, status_code=201)
def create_inbox(payload: s.InboxEntryInput, db: DB) -> dict[str, object]:
    row = records.create_record(db, "inbox", payload)
    db.commit()
    return records.serialize(row)


@router.patch("/inbox/{record_id}", response_model=s.InboxEntryOut)
def update_inbox(record_id: UUID, payload: s.InboxEntryPatch, db: DB) -> dict[str, object]:
    row = records.update_record(
        db, "inbox", record_id, payload.model_dump(exclude_unset=True, mode="json")
    )
    db.commit()
    return records.serialize(row)


@router.delete("/inbox/{record_id}", status_code=204)
def delete_inbox(record_id: UUID, db: DB) -> Response:
    records.delete_record(db, "inbox", record_id)
    db.commit()
    return Response(status_code=204)


@router.get("/utilities", response_model=list[s.UtilityOut])
def list_utilities(db: DB) -> list[dict[str, object]]:
    return [records.serialize(row) for row in records.list_records(db, "utilities")]


@router.get("/utilities/{record_id}", response_model=s.UtilityOut)
def get_utilities(record_id: UUID, db: DB) -> dict[str, object]:
    return records.serialize(records.get_record(db, "utilities", record_id))


@router.post("/utilities", response_model=s.UtilityOut, status_code=201)
def create_utilities(payload: s.UtilityInput, db: DB) -> dict[str, object]:
    row = records.create_record(db, "utilities", payload)
    db.commit()
    return records.serialize(row)


@router.patch("/utilities/{record_id}", response_model=s.UtilityOut)
def update_utilities(record_id: UUID, payload: s.UtilityPatch, db: DB) -> dict[str, object]:
    row = records.update_record(
        db, "utilities", record_id, payload.model_dump(exclude_unset=True, mode="json")
    )
    db.commit()
    return records.serialize(row)


@router.delete("/utilities/{record_id}", status_code=204)
def delete_utilities(record_id: UUID, db: DB) -> Response:
    records.delete_record(db, "utilities", record_id)
    db.commit()
    return Response(status_code=204)
