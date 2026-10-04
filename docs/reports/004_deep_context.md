# Personal Command Center — Deep Context

## Summary

Milestone 3 delivers shallow, local Topics and title-free Context Notes inside Projects, Games, Media, Ideas and Utilities. Observations support zero/multiple Topics, optional shared Tags, multiline text, inline capture, editing, deletion, chronology and filtering. Search returns to a selected Topic or focused observation. Existing formal Notes remain independent.

The normal workspace was backed up, migrated and compared row by row. All 43 existing domain records, 17 Tags, 134 existing Tag memberships, four formal Note references and 68 historical activity rows survive unchanged. A deliberate sample adds 12 Topics and 12 tagged observations to four existing codex-demo parents. No original parent fields/timestamps or formal Notes changed. The unrelated repository was not inspected or used.

Validation in this session: 64 backend tests, 33 frontend tests, two browser flows, lint, formatting, mypy, TypeScript, production build, migration drift, clean/previous-schema/downgrade tests, normal persistence and a complete isolated restore. See the validation detail and download-observation limitation below.

## Product Problem

A record's description and current state identify the thing and where work stopped. They do not comfortably hold accumulating observations about characters, chapters, experiments, locations or evidence. Creating a titled formal Note for each sentence introduces unnecessary decisions and navigation. Topics organize observations inside the parent, and Context Notes preserve a thought immediately without deciding it deserves a document.

## Data Model

`Topic` has UUID, parent type/UUID, display name, normalized name, optional description and created/updated timestamps. Names collapse whitespace and casefold for uniqueness within the parent while retaining useful casing. Two parents may independently have Research. The unique constraint also supports parent lookup.

`ContextNote` has UUID, parent type/UUID, multiline body and created/updated timestamps. It has no title. Shared Tags and Topic memberships are optional. Reads order by newest creation timestamp, with UUID as a deterministic tie-breaker; editing does not move an old observation to the top.

`context_note_topics` has a composite primary key and cascading foreign keys to both explicit tables. One observation can appear under multiple Topics without duplication. Deleting a Topic removes memberships, never observations. `context_note_tags` connects observations to the existing shared Tag dictionary with cascading foreign keys.

The typed parent pair follows the existing formal Note convention. A single SQL FK cannot point to five domain tables. Services verify parent existence and same-parent membership; import validates self-contained parents and associations before insertion. Parent deletion removes local context in the same transaction and retains the existing formal Note detachment behavior. Arbitrary external SQL can violate parent ownership, so callers should use the API. Inbox and formal Notes are not supported parents. No nested Topic or domain-specific chapter/build model was added.

## Tags vs Topics

Tags classify across the whole workspace: research, reading, coding and codex-demo. Topics organize only one record: Atlas's Architecture or the manga's Chapter 28. Research in Atlas and Research in Game Archaeologist are two separate Topics, while their research Tag is shared. Topics are not taggable; demonstration descriptions explicitly identify fictional context, and every demonstration observation has codex-demo plus relevant existing Tags.

The UI explains this distinction beside the selector. Topic checkboxes are visible during capture; optional global Tags live in a collapsed disclosure to keep the minimum path short.

## Formal Notes vs Context Notes

Formal Notes retain titles, standalone bodies, their domain and optional existing target pair. Context Notes are parent-owned observations without titles. No formal Note was migrated, converted or merged. Atlas still has its two linked documents under Related Notes, below the separate observation stream. Its architecture document's named target still returns to Atlas.

## Record Detail Experience

Details keep the existing header/state fields before a compact Topic selector, Context Notes, Related Notes and recent activity. All shows the complete chronological stream. Each Topic displays its observation count and a restrained management button. Management supports name/description edits and confirmed deletion that explains observations survive.

Add note opens an inline body editor with immediate focus, optional Topic checkboxes and collapsed Tags. Plain Enter inserts a line; Ctrl/Cmd+Enter saves, with IME composition ignored. Saving a new observation returns to All so an unassociated thought cannot disappear behind a selected filter. Errors keep the draft and memberships. Creating a Topic while writing leaves the inline draft intact; it then appears as a selectable checkbox. Topic/note state lives locally until saved; navigation has no draft recovery.

Observations show body, all local Topic labels, optional Tags, creation/edited time and small edit/delete controls. Topic deletion and observation deletion require their own clear UI confirmation. Topic controls wrap and scroll within a 180px maximum height. There is no separate global Topics page.

## Search Integration

Search retains existing literal substring behavior and includes Topic names/descriptions and Context Note bodies/Tags. Results label Topic or Context Note. Topic results include parent title/count; observation results include parent title, Topic names and matching-body snippet. Filters include Topics and Context Notes alongside the seven original domains.

Topic navigation uses the parent path with `?topic=UUID`. Observation navigation uses `?context=UUID#context-UUID`, scrolls to the article, focuses it and adds an outline. Missing query targets show a restrained unavailable message/fallback. Normal use verified Frost Mage and Build Experiments Topic returns and a Mira pauses body result. Existing domain search continues to pass its backend/browser checks.

## Activity Integration

Topic create/update/delete and observation add/update/delete write lightweight events in their mutation transaction. Each records the parent kind/UUID and snapshots parent title plus short Topic name or body. Child deletion leaves a valid parent link; parent deletion leaves safely unavailable history. No filter/selection event is written. Updates are one event each, not field diffs or event sourcing.

Details request their recent six entries using optional activity kind/record_id filters. Dashboard retains its six/30 convention and readable actions. The normal sample adds exactly 26 events: 12 Topic creates, 12 observation adds, one Topic rename and one observation edit. Historical rows remain intact; final activity count is 94.

## Backup / Import Changes

Exports use version 3, requiring `topics` and `context_notes`. An observation's `topic_ids` represents its memberships; Tags retain the existing normalized-name representation. Versions 1/2 remain accepted with empty Deep Context collections; nonempty new collections under old versions are rejected. Existing version 1 conversion recovery remains unchanged.

Validation covers supported parent types, UUIDs, timezone-aware timestamps, blank content, duplicate IDs/names/associations, unknown Tags, missing parents/Topics and cross-parent memberships. Collisions reject the whole import; references must exist inside the incoming backup. Writes remain one transaction, and injected Context Note insertion failure rolls back parents, Tags, Topics, observations and activity. Import generates no new activity or replacement content.

The normal API export was saved and checked: version 3, 12 Topics, 12 observations, 94 activities. The complete normal export restored into a newly migrated isolated database: 67 imported content records (43 main records + 12 Topics + 12 observations). Every exported collection compared equal after restore, including timestamps, references, Tag IDs and Topic associations. The normal database was never imported into or replaced.

## Migration

Previous revision: `b2_context_provenance`. New head: `c3_deep_context` in `backend/migrations/versions/c3_deep_context.py`. It adds four explicit tables and lookup/order/membership indexes without rewriting existing tables. Downgrade drops Deep Context and is destructive to that new content; retain a version 3 backup before using it. Normal data was only upgraded.

Before migration, SQLite's backup API created `test-results/deep-context/before-milestone3.db` (172,032 bytes), verified present/nonempty. A read-only version 2 export (39,451 bytes) and full original table inventory were also saved. Evidence is ignored and private inside this repository.

After upgrade, every original field in every original row and association table matched the backup exactly, excluding Alembic's intentionally changed revision. After the demo, original rows still matched; only new activity/Deep Context were added. SQLite integrity_check is ok and foreign_key_check is empty.

| Collection | Before | After demo |
| --- | ---: | ---: |
| Projects / Games / Media / Ideas | 6 / 5 / 6 / 5 | 6 / 5 / 6 / 5 |
| Notes / Inbox / Utilities | 5 / 12 / 4 | 5 / 12 / 4 |
| Shared Tags | 17 | 17 |
| Original Tag memberships | 134 | 134 |
| Formal Note references | 4 | 4 |
| Historical / total activity | 68 / 68 | 68 / 94 |
| Topics / Context Notes | 0 / 0 | 12 / 12 |
| Context Topic / Tag memberships | 0 / 0 | 12 / 34 |

Clean upgrades, an explicit populated Milestone 2 upgrade, downgrade/reupgrade and drift checks ran against isolated databases. No application startup uses create_all.

## Testing Performed

Commands run from the indicated directory in this session:

| Directory | Command | Actual result |
| --- | --- | --- |
| backend | `.venv/Scripts/python -m pytest -q` | 64 passed; one upstream Starlette/httpx deprecation warning |
| backend | `.venv/Scripts/python -m ruff check app tests migrations` | Passed |
| backend | `.venv/Scripts/python -m ruff format --check app tests migrations` | 21 files already formatted |
| backend | `.venv/Scripts/python -m mypy app` | No issues in 12 source files |
| backend | `.venv/Scripts/python -m alembic upgrade head` | Normal database upgraded to c3_deep_context |
| backend | `.venv/Scripts/python -m alembic check` | No new upgrade operations detected |
| backend | `.venv/Scripts/python -m alembic current` | c3_deep_context (head) |
| frontend | `npm test` | 33 passed in two files |
| frontend | `npm run lint` | Passed |
| frontend | `npm run typecheck` | Passed |
| frontend | `npm run build` | Passed; 98 modules, JS 340.11 kB / gzip 105.64 kB |
| repository | `npx --prefix frontend prettier --check frontend/src frontend/e2e` | All matched files use Prettier style |
| frontend | `$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.browsers'; npm run test:e2e` | Final run: two flows passed in 21.2s |
| backend | `.venv/Scripts/python ../test-results/deep-context/verify_workspace.py` | Original rows preserved, integrity/FKs clean, full isolated restore equal |
| repository | `Invoke-WebRequest -Uri http://127.0.0.1:8010/api/export -OutFile test-results/deep-context/normal-api-export.json` | Normal version 3 export verified |

New backend coverage exercises the complete lifecycle under all five parent types, normalization/uniqueness, scope rejection, nonblank/multiline body, association changes, counts, deletion/history, search parent metadata, old versions, ten malformed-backup variants, database rollback, query count and migration preservation. Persistence testing reopens restored data. New frontend coverage exercises capture with no Topic/multiple Topics, counts/filters/All, Topic CRUD/description, note edits/deletes, draft errors, Topic creation while composing, formal separation, Inbox exclusion, keyboard save and both search returns. Earlier functionality tests were rerun, not merely inherited.

Initial failures were repaired before completion: a missing search import, ordering of UUIDs in a remapped-backup assertion, an inaccurate Inbox test heading, a Testing Library type option and a broad Playwright Observation locator. The first browser launch used the wrong browser-cache path; the existing repository Chromium cache resolved that without installation. These failures are not included in the passing totals.

## Browser E2E

The new coherent flow creates a fictional Media item, Reiner and Chapter 42, one shared observation, one character-only observation and one bare thought. It checks both Topic filters, All, body search/focused navigation, editing with both memberships retained, reload persistence, Topic rename/description, Topic search/selected navigation and a Project observation using the same UI.

It creates 24 additional Topics only in the isolated test database to review a 26-Topic selector. At 390/952/1440px the selector stays within its height bound and the document does not overflow horizontally. It downloads a version 3 backup with 27 Topics/4 observations and verifies the shared association. It then deletes one Topic while preserving notes and deletes a bare observation. No browser page errors were recorded.

The original flow also passed: capture, optional Tags, conversion/provenance, domain creation, formal Note reference/return, search/filter/highlighting, Inbox modes, keyboard/dialog focus, export and conflict rejection. Both flows use a uniquely named migrated E2E database, never the normal workspace.

## Normal Workspace Evaluation

All new sample content was entered through the normal localhost UI after automated validation. Only four existing fictional parents received context:

| Parent | Topics | Observations |
| --- | --- | --- |
| The Last Cartographer — Media | Characters, Chapter 28, Worldbuilding | Mira's hesitation belongs to Characters + Chapter 28; map-ink convention belongs to Worldbuilding; a bare prediction/checkpoint thought |
| Atlas Notes — Project | Architecture, Backlinks, Research | One original-observation/backlink design thought belongs to Architecture + Backlinks; source-comparison thought belongs to Research; bare next experiment |
| Ashes of Meridian — Game | Frost Mage, Ice Tunnels, Build Ideas → Build Experiments | One ice-barrier tactic belongs to build + location; equipment comparison belongs to renamed experiment Topic; bare checkpoint/navigation thought |
| Game Archaeologist — Idea | Research, Provenance, Features | A multiline claim/source uncertainty thought belongs to Research + Provenance; evidence-card experiment belongs to Features; bare scope constraint |

Each parent has three Topics and three observations. Each has a shared observation, a single-Topic observation and an unassociated observation. Every new observation is tagged codex-demo. Descriptions identify Topics as fictional demo context. No new main-domain record was necessary.

The new manga observation was edited to preserve uncertainty explicitly; its creation timestamp and two memberships remained. Build Ideas was renamed Build Experiments; its observation stayed associated. Refresh and actual backend/preview server restart preserved the data. Search returned to the selected renamed game Topic and focused manga observation. Atlas's two formal Notes and named return link still work. An archived Atlas capture still truthfully says its older conversion destination was not recorded; Inbox has no Topics/Context Notes. Dashboard still shows original current projects/game/media and linked compact Deep Context history.

At 390, 952 and 1440px, regular viewport measurements after layout settled showed scrollWidth equal to clientWidth (375/937/1425px, excluding native scrollbars). Full-page screenshots were reviewed visually, including mobile wrapping, multiline text, multi-Topic labels, editing timestamps, focus outline, Add note and separate Related Notes. The Media page and Atlas page are long, but the original current state remains first and the selector remains restrained. Temporary viewport overrides were reset.

Evidence inside ignored `test-results/deep-context/`: `before-inventory.json`, `migration-preservation.json`, `after-export.json`, `normal-api-export.json`, `final-verification.json`, the original SQLite backup, isolated restore and `atlas-normal-1440.jpg` / `media-normal-390.jpg` / `media-normal-952.jpg` / `media-normal-1440.jpg`. E2E screenshots/downloads live under `frontend/test-results/`.

The normal Settings export button was exercised without an app error. The in-app browser's download-event observer timed out, so a completed native download in that profile is not claimed. Real downloaded JSON is verified by Playwright in the isolated flow; the normal export's payload and complete restore are separately verified via API/services. Normal import and deletion were deliberately not used for evaluation; those actions ran against isolated test data.

## Cross-Domain Abstraction Evaluation

**Did Topic + Context Note feel natural across all tested domains? Yes, for lightweight observations.** It required no different model or view for the four examples. Chapter + character, build + location, architecture + backlinks and research + provenance all described useful overlapping context. One body visibly retaining both labels made membership feel like organizing one thought rather than filing copies.

Media was the clearest fit: the existing Chapter 28 progress field says where reading stopped, while observations hold predictions and clues. Games also fit naturally because a tactic can depend on both the current build and location. Atlas's small design constraint was fast to capture, and keeping the substantial architecture document separate remained useful. Game Archaeologist's uncertain claim fit two research contexts without creating a large taxonomy.

The abstraction is weaker for structured knowledge. A provenance Topic does not enforce a source URL, confidence level or distinction between evidence and interpretation. A build Topic does not encode equipment, and chronological notes do not replace the current-goal field. Topic names can overlap existing record fields; Frost Mage is both the current build and a local discussion context. This was understandable during the sample, but relies on naming and surrounding UI. There is no evidence yet that dedicated chapter/character/build tables would improve the workflow.

Tags versus Topics were workable because Topic membership is visible while research/game/codex-demo Tags have a different # appearance and scope explanation. Nevertheless, Research exists as both a local Topic and a global Tag; repeated optional demo tagging adds clicks. The mandatory path is still body + save, but local organization is an extra decision. Formal Notes versus observations stayed clear at Atlas, although the older generic Notes field creates a third text surface that deserves continued evaluation.

This was a deliberate single-session fictional sample, not a longitudinal human study. It demonstrates a usable reusable abstraction; it cannot establish how users will name hundreds of Topics or whether they consistently choose formal versus lightweight writing.

## UX Observations

**GOOD:** Body-only inline capture, optional organization, preserved multiline text, visible shared membership and counts, useful search return, separate formal documents, and shallow scope all worked. Existing current state stayed at the top. Renaming did not break associations.

**FRICTION:** Long original fields plus observations, formal Notes and activity make the record page long. Formal documents are farther down, especially on mobile. The 26-Topic test keeps height bounded but needs scrolling to discover later Topics; alphabetical ordering puts numbered names in lexical order (1, 10, 11, 2). + Topic uses a separate management dialog while the draft remains in place. Optional repeated Tag entry costs several clicks. Tags are visible on observations but have no clickable cross-workspace links there yet.

**BUG:** A new bare note could have been hidden behind a selected Topic; saving now returns to All and a UI test guards it. Search's singular count initially read “1 context notes”; it now uses “note.” Settings' total now explicitly describes main-section items and its export/import copy includes Deep Context. No unresolved integrity or tested-flow defect was found. The download observer timeout is a tooling limitation, not evidence of successful normal-profile native download.

**OPPORTUNITY:** Provide a compact recent-context/resume view and restrained section jumps before adding more record structure. Measure whether a chosen Topic plus latest observation helps users resume without scrolling past the whole stream. Consider lightweight Tag suggestions only after repeated manual use establishes value. Keep source/confidence semantics in formal writing until a concrete structured-evidence task warrants its own design.

## Performance / Query Considerations

One scoped aggregate query computes counts; select-in eager loading batches Topic/Tag associations. The 20-observation test stays at eight SQL statements, including BEGIN. A normal Atlas measurement with three Topics/three observations also used eight statements. This verifies absence of obvious per-observation reads, not latency under thousands of rows.

The unique Topic index serves parent/name lookup. Observation parent/created/id index supports scope/order. Topic membership has a reverse topic_id index; its composite PK supports note lookup. Existing arbitrary substring search scans explicit collections in memory, with parent titles reused from that scan. Ordinary text indexes would not accelerate its casefolded substring behavior, so no search engine or misleading text index was introduced.

Streams, search and exports are still unpaginated. The scoped API and deterministic ordering leave a clear path for future cursor pagination. Hundreds of observations were not visually/latency benchmarked. The browser test stresses dozens of Topics, not a whole long-term personal knowledge corpus.

## Known Limitations

- Parent ownership is service-enforced; direct SQL can create orphans/cross-parent associations despite association FKs.
- Search and streams load full collections; no ranking, FTS, pagination or measured large-corpus performance.
- No draft recovery, navigation warning, concurrency merge, undo or autosave.
- Topic creation preserves but does not automatically assign the new Topic to the draft.
- Observation edits preserve the parent's timestamps; recent context appears in activity rather than changing existing list ordering.
- Activity links go to parents, not directly to children; snapshots truncate long content.
- Topics have no Tag field; optional Context Note Tags have no suggestions or clickable labels.
- The existing Notes field, formal Notes and Context Notes remain distinct surfaces; longer-term use should assess terminology and page length.
- Normal-profile native download completion was not observed; automated browser download and normal API payload/restore were verified separately.
- One upstream TestClient deprecation warning remains. No dependency change was necessary.

## Deferred Features

Nested Topics; domain-specific chapter/character/build models; AI summarization; semantic search; attachments; automatic Topic generation. Also deferred: generated resume prose, global Topic browsing, pinning/reordering, structured evidence fields, Markdown/rich-text rendering, Tag suggestions, pagination/FTS, undo and draft/concurrency protection. None was required for Milestone 3.

## Recommended Milestone 4

The evidence supports **evaluating Context Resume as the next narrow milestone**. The game now has both a current goal and a checkpoint observation, Media has progress plus an unresolved prediction, Atlas has a next step plus constraints, and the Idea has a scope observation. Recovering those together is useful, while opening a record now exposes a longer stream before formal documents.

Start with a compact view of existing current state/next step, recent observations and a deliberate Topic/section jump. Use stored facts and links, without generating summaries or adding a domain-specific framework. Test whether this reduces scrolling and helps resume a real record after time away across the same four domains. This sample supports a candidate direction, not a proven need for AI, pinned entities or more stored fields. Keep backup/restore reliability and draft protection as separate practical priorities.

## Repository State

Important backend changes: `models.py`, `schemas.py`, `deep_context.py`, `context_routes.py`, parent cleanup in `records.py`, activity filtering/router composition in `main.py`, `search.py`, `transfer.py`, and `c3_deep_context.py`. Tests add `test_deep_context.py` and extend API/restore/migration coverage.

Important frontend changes: `deep-context.ts`, `DeepContext.tsx`, `RecordActivity.tsx`, detail integration, search/API types, activity labels, Settings copy and plain CSS. `DeepContext.test.tsx` and `e2e/deep-context.spec.ts` cover new behavior. README, AGENTS, architecture and roadmap describe the final conventions. This report and Session 004 are indexed without replacing earlier reports.

Final counts: 64 backend tests, 33 frontend tests, two browser E2E flows. Backend lint/format/mypy/drift and frontend lint/format/typecheck/production build pass. Git diff whitespace and updated-document UTF-8 checks pass. A final read-only comparison after browser testing confirms original data remains preserved with four formal references, 12 observations and 94 activities; no cross-parent links or FK violations. Normal schema is c3_deep_context. Source changes are local and uncommitted; no PR or deployment was requested. SQLite data/backups/screenshots/build output remain ignored. Normal backend and preview are left running at loopback ports 8010/5174 after validation; health is ok and the frontend returns HTTP 200.
