# Architecture

## Boundaries and structure

This is one local application with two development processes. FastAPI handles `/api` on loopback port 8010; Vite serves React on 5174 and proxies `/api`. There is no permissive CORS setup, authentication, external runtime service, or automatic data ingestion. Local SQLite is the source of truth. React Query caches server state and invalidates after successful writes.

`backend/app/db.py` owns engine/session setup and SQLite pragmas. `models.py` declares explicit tables. `schemas.py` declares typed create, patch, output, and backup boundaries. `routes.py` has explicit thin CRUD endpoints. `records.py` holds the small common persistence operations and conversion transaction; `transfer.py` owns backup validation/insertion; `search.py` owns search semantics. `main.py` composes the API. A request-scoped session commits only after its service succeeds; close rolls back uncommitted work. No application startup code calls `create_all`.

`context_routes.py` exposes scoped `/api/context/{kind}/{record_id}` reads and `/topics` and `/notes` mutations. `deep_context.py` validates ownership, performs mutations and parent cleanup, and writes lightweight activity in the same transaction. Update endpoints use PUT with complete body/associations, not partial patches. The allowed parent set is fixed to Projects, Games, Media, Ideas and Utilities; Inbox and formal Notes are excluded.

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
- `topics`: UUID, typed parent pair, display name, normalized name, optional description, timestamps. Whitespace is collapsed and names are Unicode-casefolded for a unique `(parent_type, parent_id, normalized_name)` constraint. Display casing is retained; the same name may exist on different parents.
- `context_notes`: UUID, typed parent pair, multiline body, timestamps. No title or mandatory Topic/Tag.
- `context_note_topics`: composite primary key, cascading FKs to the observation and Topic. Topic deletion removes membership only.
- `context_note_tags`: composite primary key, cascading FKs to observations/shared Tags.

Every content record and activity has a UUID, `created_at`, and `updated_at`. New timestamps are timezone-aware UTC ISO strings; backup serialization preserves their instant. Release dates are optional ISO dates. There are 20 application tables plus Alembic's version table. Initial migration: `7aad0ff7b1ba_initial_schema.py`. Both upgrade and downgrade are tested. Milestone 2 adds `b2_context_provenance.py`, three Inbox columns without changing existing content/timestamps. Old conversion activity marks sources converted, but destinations stay unknown because history has no explicit destination ID. Milestone 3 adds `c3_deep_context.py`, four tables and lookup/order/membership indexes; no existing table is rewritten. Its downgrade deletes Deep Context tables and data.

Note references are a single typed pair rather than a relationship engine. Services validate both fields together and verify the target exists. Deleting a target detaches notes in the same transaction and updates their timestamps. These cross-table references are enforced in services, not database foreign keys; external SQL edits can violate them.

Topic and Context Note parent pairs follow the same convention: one SQL foreign key cannot target five domain tables. Services validate existence/scope and delete local context before deleting the parent. Import validates self-contained parents and memberships before writing. Association FKs enforce cleanup; arbitrary external SQL can still violate parent ownership. Context edits update their own timestamps and activity, preserving the parent's existing fields/timestamps. Formal Notes are never converted into observations.

## Tags and activity

Tags are trimmed, Unicode-casefolded, deduplicated, and shared by name. Removing a tag from an item removes its association, not its shared dictionary row. Orphan tag rows are retained in exports; there is no separate tag-management screen yet.

Tags provide cross-workspace classification, such as research. Topics provide organization inside one record, such as Architecture or Chapter 28. Formal Notes are standalone titled documents with an optional target; Context Notes are title-free parent-owned observations with zero/multiple Topics and optional shared Tags. These are separate explicit tables, not a generic knowledge graph.

Each mutation writes a lightweight activity entry in its transaction. Entries snapshot titles so deletion does not erase the timeline. Activity is not an undo log, full field diff, or event sourcing. The dashboard shows six entries by default and can expand to 30; surviving targets are linked using a response-only `record_exists` flag. No extra activity columns are stored. The API supports up to 200 per request. A backup includes all activity.

Deep Context actions use `topic_created/updated/deleted` and `context_note_added/updated/deleted`, linking to the parent and snapshotting parent title plus a short Topic name/body. Deleting a child keeps a safe parent link; deleting the parent marks history unavailable. Topic filtering creates no activity. `/api/activity` accepts optional kind and record_id filters; details show their recent six entries.

## Search

Search scans the explicit domain records and their tags, compares Unicode-casefolded substrings, and returns labeled results with matching field names and surrounding text. Snippets prefer word boundaries and include explicit truncation ellipses. Inbox state/conversion metadata is returned separately and excluded from matching. Whitespace-only queries return no results. Archived inbox entries and utilities are included. IDs/timestamps/relation IDs are excluded. Literal matching means SQL wildcard and query syntax characters are harmless.

The same scan includes Topic name/description and Context Note body/Tags. Results carry parent type/UUID/title; Topics include aggregate counts, observations include Topic names. Parent titles reuse the domain scan, avoiding one lookup per match. Topic links select `?topic=UUID`; observation links use `?context=UUID#context-UUID` and focus/highlight the article. Missing/deleted query targets fall back safely.

FTS5 is deferred deliberately. A personal collection benefits from predictable arbitrary substrings (including snippets and partial words), without an index synchronization mechanism in this milestone. Search is linear in collection size, has no relevance ranking or pagination, and loads data into memory. Benchmark real usage before replacing it; keep the API's matching-field explanation. Unicode casefold expansion can make snippet boundaries approximate.

## Backup strategy

Export is JSON with `schema_version: 3`; imports accept versions 1, 2 and 3. Versions 1/2 default Deep Context collections to empty and cannot carry new content under an old version. Version 3 requires `topics` and `context_notes`; each observation's `topic_ids` stores its memberships, and Tags retain the existing normalized-name representation. Version 1 records default conversion metadata to empty; retained converted activity sets the converted flag without guessing a destination. Conversion pointers may outlive targets and are preserved like historical activity. Pydantic validates shapes, supported values, UUIDs, timezone-aware timestamps, tags, dates, and note pairs. Import preflight checks duplicate IDs and normalized Topic names, collisions, tag consistency, all parents/Note targets, and same-parent memberships before insertion. Every record/Topic/Context Note/activity ID conflict rejects the complete import. Same-name tags merge; different-name collisions on tag IDs reject. All writes and flushes occur in one transaction. Injected domain and Context Note insertion failures are tested to roll everything back.

Tags are associated with records by normalized names in the portable representation; the tag dictionary retains IDs. Restoring into an empty database preserves tag identities, timestamps, relations, content, and historical activity. Merging into an existing workspace retains existing tag IDs for shared names. Historical activity is allowed to reference deleted records. Import does not generate new activity, modify existing records, remap content IDs, or silently replace data.

## Frontend

`App.tsx` owns persistent navigation, search, and routes. `domains.ts` separates field definitions and payload conversion from views. `api.ts` centralizes requests, error formatting, query hooks, and cache invalidation. `shortcuts.ts` centralizes global keyboard behavior and ignores IME composition.

`Dashboard`, `RecordsPage`, `Editor`, `SearchPage`, and `SettingsPage` implement the user flows. `components.tsx` contains the repeated capture form, list, error, empty-state, and native dialog UI. Native dialogs provide Escape behavior, with explicit Tab wrapping, initial editable-field focus after opening, and restoration to the connected opener on close. Plain CSS uses system fonts, compact lists, clear focus states, and a responsive navigation strip on small screens. Data renders as text; snippets are not HTML. Repository links are restricted to HTTP(S).

Related Notes filters the cached Notes list by its existing reference pair on every domain detail. Named targets resolve through the corresponding cached domain list, with a restrained missing-target state. There is no new relationship table or retrieval endpoint. Search domain filters operate on the fetched query result; highlights render React text and `mark` elements without HTML injection. Optional post-capture tagging uses a small dialog and a tags-only Inbox PATCH, independent of the capture form.

`deep-context.ts` defines Topic/Context Note types separately from `DeepContext.tsx`. The detail section fetches one scoped workspace, shows bounded wrapping Topic controls and an inline body editor, optional Topic checkboxes and collapsed Tags. New notes return to All so a bare observation cannot disappear behind the selected filter. Plain Enter preserves lines; Ctrl/Cmd+Enter saves with IME protection. Topic management uses the existing accessible dialog; an open observation draft survives creating a Topic. Formal Related Notes and recent activity remain separate sections.

Topics use their unique parent/name index for lookup; observations use `(parent_type, parent_id, created_at, id)` for newest-created ordering, and Topic memberships index `topic_id` in addition to the composite PK. Counts aggregate in one parent-scoped query. Select-in eager loading batches observation Topics/Tags; a 20-observation regression test bounds reads at eight statements instead of per-note queries. Current streams remain unpaginated; scope and deterministic order permit future cursor pagination without altering ownership. Ordinary text indexes cannot accelerate arbitrary casefolded substring scans, so no misleading body/name search index is added.

## Deliberate limits

This milestone favors simple local operation over deployment infrastructure. Lists, search, and backups are not paginated/streamed. There is no multi-tab conflict detection, concurrent-edit merge, undo, attachments, Markdown rendering, cloud sync, or background integrations. Updates are last-write-wins for this single-user workspace. Browser UI import is capped at 25 MB; server-side size limits are not implemented. Backups should be exported regularly by the user until backup automation is designed.
