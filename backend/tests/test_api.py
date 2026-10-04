from copy import deepcopy
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app import db, seed
from app.models import Utility


def create(client: TestClient, kind: str, **values: Any) -> dict[str, Any]:
    response = client.post(f"/api/{kind}", json=values)
    assert response.status_code == 201, response.text
    return response.json()  # type: ignore[no-any-return]


def test_project_crud_tags_activity(client: TestClient) -> None:
    row = create(client, "projects", title="Workshop", tags=[" Local ", "local", "TOOLS"])
    assert row["tags"] == ["local", "tools"]
    url = f"/api/projects/{row['id']}"
    updated = client.patch(url, json={"next_step": "Write a parser", "status": "paused"})
    assert updated.status_code == 200
    assert updated.json()["created_at"] == row["created_at"]
    assert updated.json()["updated_at"] >= row["updated_at"]
    assert client.get(url).json()["next_step"] == "Write a parser"
    assert len(client.get("/api/projects").json()) == 1
    assert len(client.get("/api/tags").json()) == 2
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404
    assert [event["action"] for event in client.get("/api/activity").json()] == [
        "deleted",
        "updated",
        "created",
    ]


@pytest.mark.parametrize(
    "kind,values",
    [
        ("games", {"title": "Orbit", "release_date": "2027-01-01"}),
        ("media", {"title": "Cloud atlas", "rating": 8}),
        ("ideas", {"title": "Clockwork", "body": "hello"}),
        ("notes", {"title": "Sketch", "body": " world "}),
        ("utilities", {"title": "Build command", "content": "python -m build"}),
        ("inbox", {"text": "remember this"}),
    ],
)
def test_domain_crud(client: TestClient, kind: str, values: dict[str, Any]) -> None:
    row = create(client, kind, **values)
    url = f"/api/{kind}/{row['id']}"
    assert client.get(url).json()["id"] == row["id"]
    assert client.patch(url, json={"tags": ["testing"]}).json()["tags"] == ["testing"]
    assert client.delete(url).status_code == 204
    assert client.get(f"/api/{kind}").json() == []


@pytest.mark.parametrize(
    "target,field",
    [
        ("projects", "description"),
        ("games", "notes"),
        ("media", "notes"),
        ("ideas", "body"),
        ("notes", "body"),
        ("utilities", "content"),
    ],
)
def test_capture_convert_preserves_text_and_tags(
    client: TestClient, target: str, field: str
) -> None:
    text = "  Idea:\n    preserve_indentation  "
    source = create(client, "inbox", text=text, tags=["weekend"])
    url = f"/api/inbox/{source['id']}"
    response = client.post(f"{url}/convert", json={"target": target, "title": "Weekend"})
    assert response.status_code == 201
    record = response.json()["record"]
    assert record[field] == text
    assert record["tags"] == ["weekend"]
    assert client.get(url).json()["archived"] is True
    assert client.get(url).json()["text"] == text
    assert (
        client.post(f"{url}/convert", json={"target": target, "title": "Again"}).status_code == 409
    )
    assert len(client.get(f"/api/{target}").json()) == 1
    assert client.patch(url, json={"archived": False}).json()["archived"] is False


def test_search_across_every_domain(client: TestClient) -> None:
    create(client, "projects", title="NEBULA tool")
    create(client, "games", title="Adventure", current_goal="Find nebula")
    create(client, "media", title="Book", tags=["nebula"])
    create(client, "ideas", title="Idea", body="nebula")
    create(client, "notes", title="Note", body="NEBULA")
    create(client, "utilities", title="Utility", content="nebula")
    create(client, "inbox", text="nebula", archived=True)
    results = client.get("/api/search", params={"q": "Nebula"}).json()
    assert {r["kind"] for r in results} == {
        "projects",
        "games",
        "media",
        "ideas",
        "notes",
        "utilities",
        "inbox",
    }
    assert next(r for r in results if r["kind"] == "media")["matches"] == {"tags": "nebula"}
    assert client.get("/api/search", params={"q": "   "}).json() == []
    assert client.get("/api/search", params={"q": "%' OR 1=1"}).json() == []


def test_note_relation_validation_and_detach(client: TestClient) -> None:
    row = create(client, "projects", title="Referenced")
    note = create(client, "notes", title="Note", related_type="projects", related_id=row["id"])
    assert (
        client.post(
            "/api/notes", json={"title": "Bad", "related_type": "games", "related_id": row["id"]}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/notes", json={"title": "Incomplete", "related_type": "projects"}
        ).status_code
        == 422
    )
    client.delete(f"/api/projects/{row['id']}")
    result = client.get(f"/api/notes/{note['id']}").json()
    assert result["related_type"] is None and result["related_id"] is None


@pytest.mark.parametrize(
    "kind,values",
    [
        ("projects", {"title": " "}),
        ("projects", {"title": "Bad", "status": "unknown"}),
        ("projects", {"title": "Bad", "repository_url": "javascript:alert(1)"}),
        ("games", {"title": "Bad", "release_date": "not a date"}),
        ("media", {"title": "Bad", "rating": 11}),
        ("inbox", {"text": "  "}),
    ],
)
def test_invalid_inputs(client: TestClient, kind: str, values: dict[str, Any]) -> None:
    assert client.post(f"/api/{kind}", json=values).status_code == 422
    assert client.get(f"/api/{kind}").json() == []


def test_invalid_patch_is_atomic(client: TestClient) -> None:
    row = create(client, "projects", title="Original", tags=["old"])
    for payload in [
        {"title": None},
        {"title": "  "},
        {"tags": None},
        {"id": str(uuid4())},
        {"repository_url": "file:///something", "tags": ["new"]},
    ]:
        assert client.patch(f"/api/projects/{row['id']}", json=payload).status_code == 422
    assert client.get(f"/api/projects/{row['id']}").json() == row
    assert [tag["name"] for tag in client.get("/api/tags").json()] == ["old"]


def populated_backup(client: TestClient) -> dict[str, Any]:
    project = create(client, "projects", title="Export project", tags=["shared"])
    create(
        client,
        "notes",
        title="Export note",
        related_type="projects",
        related_id=project["id"],
        body="\n    code_block\n",
        tags=["shared"],
    )
    for kind in ["games", "media", "ideas", "utilities"]:
        create(client, kind, title=f"Export {kind}")
    create(client, "inbox", text="Export inbox", archived=True)
    response = client.get("/api/export")
    assert response.status_code == 200
    return response.json()  # type: ignore[no-any-return]


def remap_backup(data: dict[str, Any]) -> dict[str, Any]:
    data = deepcopy(data)
    mapping = {
        row["id"]: str(uuid4())
        for kind, rows in data.items()
        if isinstance(rows, list)
        for row in rows
    }
    for kind, rows in data.items():
        if not isinstance(rows, list):
            continue
        for row in rows:
            row["id"] = mapping[row["id"]]
            for field in ["related_id", "record_id"]:
                if row.get(field) in mapping:
                    row[field] = mapping[row[field]]
    return data


def test_import_export_roundtrip_and_conflict(client: TestClient) -> None:
    data = populated_backup(client)
    assert data["schema_version"] == 1
    assert client.post("/api/import", json=data).status_code == 409
    assert client.get("/api/export").json() == data
    incoming = remap_backup(data)
    response = client.post("/api/import", json=incoming)
    assert response.status_code == 200, response.text
    assert response.json() == {"imported": 7}
    exported = client.get("/api/export").json()
    for kind, rows in incoming.items():
        if isinstance(rows, list) and kind != "tags":
            for row in rows:
                assert row in exported[kind]
    assert len(exported["tags"]) == 1  # Shared names merge despite different IDs.


@pytest.mark.parametrize(
    "corruption",
    [
        "version",
        "uuid",
        "missing",
        "duplicate",
        "reference",
        "tag",
        "timestamp",
        "extra",
        "tag_id",
        "activity",
    ],
)
def test_invalid_import_changes_nothing(client: TestClient, corruption: str) -> None:
    before = populated_backup(client)
    data = remap_backup(before)
    if corruption == "version":
        data["schema_version"] = 2
    if corruption == "uuid":
        data["projects"][0]["id"] = "bad"
    if corruption == "missing":
        del data["games"]
    if corruption == "duplicate":
        data["projects"].append(deepcopy(data["projects"][0]))
    if corruption == "reference":
        data["notes"][0]["related_id"] = str(uuid4())
    if corruption == "tag":
        data["tags"] = []
    if corruption == "timestamp":
        data["projects"][0]["created_at"] = "2026-01-01T00:00:00"
    if corruption == "extra":
        data["projects"][0]["unknown"] = "no"
    if corruption == "tag_id":
        data["tags"][0]["id"] = before["tags"][0]["id"]
        data["tags"][0]["name"] = "different"
    if corruption == "activity":
        data["activity"][0]["id"] = before["activity"][0]["id"]
    assert client.post("/api/import", json=data).status_code in {409, 422}
    assert client.get("/api/export").json() == before


def test_metadata_routes_and_malformed_json(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/settings").json()["counts"]["projects"] == 0
    assert (
        client.post(
            "/api/import", content="{", headers={"Content-Type": "application/json"}
        ).status_code
        == 422
    )
    assert client.get("/api/projects/not-a-uuid").status_code == 422


def test_import_database_failure_rolls_back_all_tables(client: TestClient) -> None:
    before = populated_backup(client)
    incoming = remap_backup(before)

    def fail(*_: object) -> None:
        raise IntegrityError("injected failure", {}, Exception("constraint"))

    event.listen(Utility, "before_insert", fail)
    try:
        assert client.post("/api/import", json=incoming).status_code == 409
    finally:
        event.remove(Utility, "before_insert", fail)
    assert client.get("/api/export").json() == before


def test_demo_seed_requires_empty_workspace(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(seed, "SessionLocal", sessionmaker(db.engine))
    seed.main()
    assert sum(client.get("/api/settings").json()["counts"].values()) == 9
    before = client.get("/api/export").json()
    with pytest.raises(SystemExit, match="requires an empty workspace"):
        seed.main()
    assert client.get("/api/export").json() == before
