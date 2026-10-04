from uuid import UUID

from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from . import models as m
from . import schemas as s
from .records import convert_inbox, serialize
from .routes import DB, router
from .search import search
from .transfer import export_data, import_data

app = FastAPI(title="Personal Command Center", version="0.1.0")
app.include_router(router)


@app.exception_handler(ValidationError)
async def validation_error(_: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": exc.errors(include_context=False)})


@app.exception_handler(IntegrityError)
async def integrity_error(_: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": "Data conflict; no changes were saved"})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/inbox/{record_id}/convert", status_code=201, response_model=s.ConversionResult)
def convert(record_id: UUID, payload: s.Conversion, db: DB) -> dict[str, object]:
    kind, record = convert_inbox(db, record_id, payload)
    db.commit()
    return {"kind": kind, "record": serialize(record)}


@app.get("/api/search", response_model=list[s.SearchResult])
def global_search(db: DB, q: str = Query(default="", max_length=500)) -> list[s.SearchResult]:
    return search(db, q)


@app.get("/api/tags", response_model=list[s.TagOut])
def tags(db: DB) -> list[m.Tag]:
    return list(db.scalars(select(m.Tag).order_by(m.Tag.name)))


@app.get("/api/activity", response_model=list[s.ActivityView])
def activity(db: DB, limit: int = Query(default=30, ge=1, le=200)) -> list[s.ActivityView]:
    rows = db.scalars(select(m.Activity).order_by(m.Activity.created_at.desc()).limit(limit))
    return [
        s.ActivityView.model_validate(
            {
                **{column.name: getattr(row, column.name) for column in row.__table__.columns},
                "record_exists": db.get(m.RECORD_MODELS[row.kind], row.record_id) is not None,
            }
        )
        for row in rows
    ]


@app.get("/api/export", response_model=s.Backup)
def export(db: DB) -> s.Backup:
    return export_data(db)


@app.post("/api/import")
def import_backup(payload: s.Backup, db: DB) -> dict[str, int]:
    count = import_data(db, payload)
    db.commit()
    return {"imported": count}


@app.get("/api/settings", response_model=s.DataInfo)
def settings(db: DB) -> s.DataInfo:
    return s.DataInfo(
        name="Personal Command Center",
        version="0.1.0",
        database=str(db.get_bind().engine.url.database),
        counts={
            kind: db.scalar(select(func.count()).select_from(model)) or 0
            for kind, model in m.RECORD_MODELS.items()
        },
    )
