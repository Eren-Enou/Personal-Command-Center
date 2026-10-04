import sqlite3
from copy import deepcopy
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from test_api import create, remap_backup

from app import db


def test_conversion_provenance_restore_and_deleted_destination(client: TestClient) -> None:
    source = create(client, "inbox", text="A thought\n  with indentation", tags=["context"])
    result = client.post(
        f"/api/inbox/{source['id']}/convert", json={"target": "notes", "title": "Context"}
    ).json()["record"]
    saved = client.get(f"/api/inbox/{source['id']}").json()
    assert (saved["converted"], saved["converted_type"], saved["converted_id"]) == (
        True,
        "notes",
        result["id"],
    )
    client.patch(f"/api/inbox/{source['id']}", json={"tags": ["context", "new"]})
    assert client.get(f"/api/inbox/{source['id']}").json()["converted_id"] == result["id"]
    backup = client.get("/api/export").json()
    incoming = remap_backup(backup)
    for entry in incoming["inbox"]:
        entry["converted_id"] = incoming["notes"][0]["id"]
    assert client.post("/api/import", json=incoming).status_code == 200
    assert incoming["inbox"][0] in client.get("/api/export").json()["inbox"]
    search = client.get("/api/search?q=thought").json()
    assert all(
        r["archived"] and r["converted_type"] == "notes" for r in search if r["kind"] == "inbox"
    )
    assert client.delete(f"/api/notes/{result['id']}").status_code == 204
    activity = client.get("/api/activity").json()
    assert not any(e["record_exists"] for e in activity if e["record_id"] == result["id"])
    assert client.get(f"/api/inbox/{source['id']}").json()["converted_id"] == result["id"]


def test_legacy_backup_unknown_destination_and_invalid_pair_atomic(client: TestClient) -> None:
    source = create(client, "inbox", text="Old capture")
    client.post(
        f"/api/inbox/{source['id']}/convert",
        json={"target": "projects", "title": "Old destination"},
    )
    old = remap_backup(client.get("/api/export").json())
    old["schema_version"] = 1
    for row in old["inbox"]:
        for key in ["converted", "converted_type", "converted_id"]:
            row.pop(key)
    assert client.post("/api/import", json=old).status_code == 200
    restored = next(r for r in client.get("/api/inbox").json() if r["id"] == old["inbox"][0]["id"])
    assert restored["converted"] and restored["converted_id"] is None
    before = client.get("/api/export").json()
    bad = remap_backup(deepcopy(before))
    bad["inbox"][0]["converted_type"] = "projects"
    bad["inbox"][0]["converted_id"] = None
    assert client.post("/api/import", json=bad).status_code == 422
    assert client.get("/api/export").json() == before


def test_snippet_has_word_boundary_and_ellipsis(client: TestClient) -> None:
    create(client, "notes", title="Snippet", body="prefix " * 20 + "needle " + "trailingword " * 40)
    snippet = client.get("/api/search?q=needle").json()[0]["matches"]["body"]
    assert snippet.startswith("…") and snippet.endswith("…")
    assert snippet.rstrip("…").endswith("trailingword")


def test_upgrade_existing_schema_preserves_rows(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    path = tmp_path / "old.db"
    engine = db.make_engine(f"sqlite:///{path.as_posix()}")
    monkeypatch.setattr(db, "engine", engine)
    config = Config("alembic.ini")
    command.upgrade(config, "7aad0ff7b1ba")
    with sqlite3.connect(path) as connection:
        connection.execute(
            "INSERT INTO inbox VALUES ('old thought',1,'source','created','updated')"
        )
        connection.execute(
            "INSERT INTO activity VALUES ('inbox','source','converted','old thought','event','created','updated')"
        )
    command.upgrade(config, "head")
    command.check(config)
    with sqlite3.connect(path) as connection:
        row = connection.execute(
            "SELECT text,archived,id,created_at,updated_at,converted,converted_type,converted_id FROM inbox"
        ).fetchone()
        assert row == ("old thought", 1, "source", "created", "updated", 1, None, None)
    engine.dispose()
