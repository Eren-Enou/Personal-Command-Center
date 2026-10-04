import sqlite3
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError
from test_api import create, remap_backup

from app import db
from app.models import ContextNote


def topic(client: TestClient, base: str, name: str) -> dict[str, Any]:
    response = client.post(base + "/topics", json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()  # type: ignore[no-any-return]


def note(
    client: TestClient, base: str, body: str, topics: list[str] | None = None
) -> dict[str, Any]:
    response = client.post(
        base + "/notes", json={"body": body, "topic_ids": topics or [], "tags": [" Research "]}
    )
    assert response.status_code == 201, response.text
    return response.json()  # type: ignore[no-any-return]


@pytest.mark.parametrize("kind", ["projects", "games", "media", "ideas", "utilities"])
def test_scoped_context_crud_counts_and_cleanup(client: TestClient, kind: str) -> None:
    owner = create(client, kind, title="Owner")
    base = f"/api/context/{kind}/{owner['id']}"
    one, two = topic(client, base, " Reiner "), topic(client, base, "Chapter 42")
    body = "  Suspicious reaction.\n\n    Preserve indentation  "
    shared = note(client, base, body, [one["id"], two["id"]])
    bare = note(client, base, "A thought with no Topic")
    single = note(client, base, "Just one", [one["id"]])
    space = client.get(base).json()
    assert {t["name"]: t["note_count"] for t in space["topics"]} == {"Chapter 42": 1, "Reiner": 2}
    assert space["context_notes"][0]["id"] == single["id"]
    assert shared["body"] == body and shared["tags"] == ["research"]
    assert client.post(base + "/topics", json={"name": "REINER"}).status_code == 409
    assert client.put(base + f"/topics/{two['id']}", json={"name": "reiner"}).status_code == 409
    renamed = client.put(
        base + f"/topics/{one['id']}",
        json={"name": "Characters", "description": "Local cast observations"},
    )
    assert renamed.status_code == 200 and renamed.json()["created_at"] == one["created_at"]
    edited = client.put(
        base + f"/notes/{shared['id']}",
        json={"body": body + "\nUpdated", "topic_ids": [two["id"]], "tags": ["research"]},
    )
    assert edited.status_code == 200 and edited.json()["created_at"] == shared["created_at"]
    assert edited.json()["topic_ids"] == [two["id"]]
    assert client.delete(base + f"/topics/{two['id']}").status_code == 204
    saved = next(n for n in client.get(base).json()["context_notes"] if n["id"] == shared["id"])
    assert saved["topic_ids"] == [] and saved["body"] == body + "\nUpdated"
    assert client.delete(base + f"/notes/{bare['id']}").status_code == 204
    activities = client.get(f"/api/activity?kind={kind}&record_id={owner['id']}").json()
    assert {e["action"] for e in activities}.issuperset(
        {
            "topic_created",
            "topic_updated",
            "topic_deleted",
            "context_note_added",
            "context_note_updated",
            "context_note_deleted",
        }
    )
    assert all(e["record_exists"] for e in activities)
    assert client.delete(f"/api/{kind}/{owner['id']}").status_code == 204
    export = client.get("/api/export").json()
    assert export["topics"] == [] and export["context_notes"] == []
    assert all(
        not e["record_exists"]
        for e in client.get(f"/api/activity?kind={kind}&record_id={owner['id']}").json()
    )


def test_parent_uniqueness_and_cross_parent_rejections(client: TestClient) -> None:
    a, b = create(client, "media", title="A"), create(client, "media", title="B")
    first, second = f"/api/context/media/{a['id']}", f"/api/context/media/{b['id']}"
    t = topic(client, first, "World   Building")
    topic(client, second, "WORLD BUILDING")
    assert client.post(first + "/topics", json={"name": " world building "}).status_code == 409
    assert (
        client.post(second + "/notes", json={"body": "No", "topic_ids": [t["id"]]}).status_code
        == 404
    )
    assert client.delete(second + f"/topics/{t['id']}").status_code == 404
    n = note(client, first, "Safe")
    assert client.put(second + f"/notes/{n['id']}", json={"body": "Wrong"}).status_code == 404
    assert client.get(f"/api/context/projects/{uuid4()}").status_code == 404
    for unsupported in ["inbox", "notes", "topics"]:
        assert client.get(f"/api/context/{unsupported}/{a['id']}").status_code == 422
    assert client.post(first + "/topics", json={"name": "  "}).status_code == 422
    for values in [
        {"body": "  "},
        {"body": "No", "topic_ids": [t["id"], t["id"]]},
        {"body": "No", "parent_id": b["id"]},
    ]:
        assert client.post(first + "/notes", json=values).status_code == 422
    before = client.get("/api/export").json()
    assert (
        client.put(
            first + f"/notes/{n['id']}",
            json={"body": "Do not partially save", "topic_ids": [str(uuid4())], "tags": ["bad"]},
        ).status_code
        == 404
    )
    assert client.get("/api/export").json() == before


def populated(client: TestClient) -> dict[str, Any]:
    owner = create(client, "projects", title="Atlas")
    base = f"/api/context/projects/{owner['id']}"
    one, two = topic(client, base, "Architecture"), topic(client, base, "Backlinks")
    note(client, base, "Needle provenance\n  stays intact", [one["id"], two["id"]])
    return client.get("/api/export").json()  # type: ignore[no-any-return]


def test_search_parent_and_navigation_metadata(client: TestClient) -> None:
    data = populated(client)
    result = client.get("/api/search?q=needle").json()[0]
    assert result["kind"] == "context_notes" and result["id"] == data["context_notes"][0]["id"]
    assert result["parent_type"] == "projects" and result["parent_id"] == data["projects"][0]["id"]
    assert result["parent_title"] == "Atlas" and result["topic_names"] == [
        "Architecture",
        "Backlinks",
    ]
    result = client.get("/api/search?q=backlinks").json()[0]
    assert result["kind"] == "topics" and result["note_count"] == 1
    base = f"/api/context/projects/{data['projects'][0]['id']}"
    client.put(
        base + f"/topics/{result['id']}",
        json={"name": "Backlinks", "description": "Rare description phrase"},
    )
    assert (
        client.get("/api/search?q=rare description").json()[0]["matches"]["description"]
        == "Rare description phrase"
    )


def test_backup_context_roundtrip(client: TestClient) -> None:
    before = populated(client)
    incoming = remap_backup(before)
    response = client.post("/api/import", json=incoming)
    assert response.status_code == 200, response.text
    assert response.json()["imported"] == 4
    after = client.get("/api/export").json()
    for key in ["topics", "context_notes", "activity"]:
        assert all(row in after[key] for row in incoming[key])
    assert len(incoming["context_notes"][0]["topic_ids"]) == 2


@pytest.mark.parametrize(
    "corruption",
    [
        "parent",
        "cross_parent",
        "topic",
        "duplicate_id",
        "duplicate_name",
        "timestamp",
        "missing_collection",
        "duplicate_association",
        "unknown_tag",
        "bad_parent_type",
    ],
)
def test_invalid_context_backup_is_atomic(client: TestClient, corruption: str) -> None:
    before = populated(client)
    incoming = remap_backup(before)
    n = incoming["context_notes"][0]
    if corruption == "parent":
        n["parent_id"] = str(uuid4())
    if corruption == "cross_parent":
        extra = {**incoming["projects"][0], "id": str(uuid4())}
        incoming["projects"].append(extra)
        n["parent_id"] = extra["id"]
    if corruption == "topic":
        n["topic_ids"] = [str(uuid4())]
    if corruption == "duplicate_id":
        incoming["context_notes"].append(dict(n))
    if corruption == "duplicate_name":
        incoming["topics"][1]["name"] = incoming["topics"][0]["name"].upper()
    if corruption == "timestamp":
        n["updated_at"] = "2026-01-01"
    if corruption == "missing_collection":
        del incoming["topics"]
    if corruption == "duplicate_association":
        n["topic_ids"] *= 2
    if corruption == "unknown_tag":
        n["tags"] = ["not-in-dictionary"]
    if corruption == "bad_parent_type":
        incoming["topics"][0]["parent_type"] = "inbox"
    assert client.post("/api/import", json=incoming).status_code == 422
    assert client.get("/api/export").json() == before


@pytest.mark.parametrize("version", [1, 2])
def test_old_backup_acceptance(client: TestClient, version: int) -> None:
    create(client, "projects", title="Old")
    incoming = remap_backup(client.get("/api/export").json())
    incoming["schema_version"] = version
    incoming.pop("topics")
    incoming.pop("context_notes")
    assert client.post("/api/import", json=incoming).status_code == 200


def test_context_import_database_failure_rolls_back(client: TestClient) -> None:
    before = populated(client)
    incoming = remap_backup(before)

    def fail(*_: object) -> None:
        raise IntegrityError("injected", {}, Exception("fail"))

    event.listen(ContextNote, "before_insert", fail)
    try:
        assert client.post("/api/import", json=incoming).status_code == 409
    finally:
        event.remove(ContextNote, "before_insert", fail)
    assert client.get("/api/export").json() == before


def test_context_read_queries_do_not_grow_per_note(client: TestClient) -> None:
    owner = create(client, "games", title="Query test")
    base = f"/api/context/games/{owner['id']}"
    t = topic(client, base, "Builds")
    for i in range(20):
        note(client, base, f"Observation {i}", [t["id"]])
    queries = []

    def capture(*args: Any) -> None:
        queries.append(args[2])

    event.listen(db.engine, "before_cursor_execute", capture)
    try:
        response = client.get(base)
        assert response.status_code == 200 and response.json()["topics"][0]["note_count"] == 20
    finally:
        event.remove(db.engine, "before_cursor_execute", capture)
    assert len(queries) <= 8, queries


def test_upgrade_from_milestone2_and_downgrade(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "old.db"
    engine = db.make_engine(f"sqlite:///{path.as_posix()}")
    monkeypatch.setattr(db, "engine", engine)
    config = Config("alembic.ini")
    command.upgrade(config, "b2_context_provenance")
    with sqlite3.connect(path) as c:
        c.execute(
            "INSERT INTO projects VALUES ('Original','Body','active','','Next','Notes','owner','created','updated')"
        )
    command.upgrade(config, "head")
    command.check(config)
    with sqlite3.connect(path) as c:
        assert c.execute(
            "SELECT title,next_step,created_at,updated_at FROM projects"
        ).fetchone() == ("Original", "Next", "created", "updated")
        assert c.execute("SELECT count(*) FROM topics").fetchone() == (0,)
    command.downgrade(config, "b2_context_provenance")
    command.upgrade(config, "head")
    command.check(config)
    engine.dispose()
