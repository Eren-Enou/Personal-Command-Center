# Architecture

## Boundaries and structure

This is one local application with two development processes. FastAPI handles `/api` on loopback port 8010; Vite serves React on 5174 and proxies `/api`. There is no permissive CORS setup, authentication, external runtime service, or automatic data ingestion. Local SQLite is the source of truth. React Query caches server state and invalidates after successful writes.

`backend/app/db.py` owns engine/session setup and SQLite pragmas. `models.py` declares explicit tables. `schemas.py` declares typed create, patch, output, and backup boundaries. `routes.py` has explicit thin CRUD endpoints. `records.py` holds the small common persistence operations and conversion transaction; `transfer.py` owns backup validation/insertion; `search.py` owns search semantics. `main.py` composes the API. A request-scoped session commits only after its service succeeds; close rolls back uncommitted work. No application startup code calls `create_all`.

The shared CRUD helpers operate over a fixed mapping of seven explicit model types. They do not define a runtime schema system or generic entity table. Domain-specific validation remains in the domain schemas. If a domain grows more complex, move its behavior into a dedicated service rather than extending a generic framework.

## Database model

- `projects`: title, description, status, repository URL, next step, notes.
- `games`: title, status, platform/server, character/build, current goal, release date, links, notes.
- `media`: title, media type, status, progress, optional integer rating 0–10, notes.
- `ideas`: title, body, category, status.
- `notes`: title, body, optional related type and UUID.
- `inbox`: arbitrary text, archived flag, converted flag, optional converted type/UUID.
- `utilities`: title, utility type, content, notes. Content is text, never automatically executed.
- `tags`: UUID and unique normalized name.
- Seven association tables connect tags to their concrete domain tables, with composite primary keys and cascading foreign keys.
- `activity`: UUID, kind, record UUID, action, title snapshot, timestamps.

Every content record and activity has a UUID, `created_at`, and `updated_at`. New timestamps are timezone-aware UTC ISO strings; backup serialization preserves their instant. Release dates are optional ISO dates. There are 16 application tables plus Alembic's version table. Initial migration: `7aad0ff7b1ba_initial_schema.py`. Both upgrade and downgrade are tested. Milestone 2 adds `b2_context_provenance.py`, three Inbox columns without changing existing content/timestamps. Old conversion activity marks sources converted, but destinations stay unknown because history has no explicit destination ID.

Note references are a single typed pair rather than a relationship engine. Services validate both fields together and verify the target exists. Deleting a target detaches notes in the same transaction and updates their timestamps. These cross-table references are enforced in services, not database foreign keys; external SQL edits can violate them.

## Tags and activity

Tags are trimmed, Unicode-casefolded, deduplicated, and shared by name. Removing a tag from an item removes its association, not its shared dictionary row. Orphan tag rows are retained in exports; there is no separate tag-management screen yet.

Each mutation writes a lightweight activity entry in its transaction. Entries snapshot titles so deletion does not erase the timeline. Activity is not an undo log, full field diff, or event sourcing. The dashboard shows six entries by default and can expand to 30; surviving targets are linked using a response-only `record_exists` flag. No extra activity columns are stored. The API supports up to 200 per request. A backup includes all activity.

## Search

Search scans the explicit domain records and their tags, compares Unicode-casefolded substrings, and returns labeled results with matching field names and surrounding text. Snippets prefer word boundaries and include explicit truncation ellipses. Inbox state/conversion metadata is returned separately and excluded from matching. Whitespace-only queries return no results. Archived inbox entries and utilities are included. IDs/timestamps/relation IDs are excluded. Literal matching means SQL wildcard and query syntax characters are harmless.

FTS5 is deferred deliberately. A personal collection benefits from predictable arbitrary substrings (including snippets and partial words), without an index synchronization mechanism in this milestone. Search is linear in collection size, has no relevance ranking or pagination, and loads data into memory. Benchmark real usage before replacing it; keep the API's matching-field explanation. Unicode casefold expansion can make snippet boundaries approximate.

## Backup strategy

Export is JSON with `schema_version: 2`; imports accept versions 1 and 2. Version 1 records default conversion metadata to empty; retained converted activity sets the converted flag without guessing a destination. Conversion pointers may outlive targets and are preserved like historical activity. Pydantic validates shapes, supported values, UUIDs, timezone-aware timestamps, tags, dates, and note pairs. Import preflight checks duplicates, collisions, tag consistency, and all note targets before insertion. Every record/activity ID conflict rejects the complete import. Same-name tags merge; different-name collisions on tag IDs reject. All writes and flushes occur in one transaction. Injected database failure is tested to roll everything back.

Tags are associated with records by normalized names in the portable representation; the tag dictionary retains IDs. Restoring into an empty database preserves tag identities, timestamps, relations, content, and historical activity. Merging into an existing workspace retains existing tag IDs for shared names. Historical activity is allowed to reference deleted records. Import does not generate new activity, modify existing records, remap content IDs, or silently replace data.

## Frontend

`App.tsx` owns persistent navigation, search, and routes. `domains.ts` separates field definitions and payload conversion from views. `api.ts` centralizes requests, error formatting, query hooks, and cache invalidation. `shortcuts.ts` centralizes global keyboard behavior and ignores IME composition.

`Dashboard`, `RecordsPage`, `Editor`, `SearchPage`, and `SettingsPage` implement the user flows. `components.tsx` contains the repeated capture form, list, error, empty-state, and native dialog UI. Native dialogs provide Escape behavior, with explicit Tab wrapping, initial editable-field focus after opening, and restoration to the connected opener on close. Plain CSS uses system fonts, compact lists, clear focus states, and a responsive navigation strip on small screens. Data renders as text; snippets are not HTML. Repository links are restricted to HTTP(S).

Related Notes filters the cached Notes list by its existing reference pair on every domain detail. Named targets resolve through the corresponding cached domain list, with a restrained missing-target state. There is no new relationship table or retrieval endpoint. Search domain filters operate on the fetched query result; highlights render React text and `mark` elements without HTML injection. Optional post-capture tagging uses a small dialog and a tags-only Inbox PATCH, independent of the capture form.

## Deliberate limits

This milestone favors simple local operation over deployment infrastructure. Lists, search, and backups are not paginated/streamed. There is no multi-tab conflict detection, concurrent-edit merge, undo, attachments, Markdown rendering, cloud sync, or background integrations. Updates are last-write-wins for this single-user workspace. Browser UI import is capped at 25 MB; server-side size limits are not implemented. Backups should be exported regularly by the user until backup automation is designed.
