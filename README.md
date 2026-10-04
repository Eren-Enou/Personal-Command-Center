# Personal Command Center

A private, offline workspace for projects, games, media, ideas, notes, useful resources, and things you haven't organized yet. Capture a thought, find it later, and remember your next step.

Python/FastAPI + SQLite, React/TypeScript + Vite. No account, remote database, hosted assets, or runtime cloud services. Dependency installation requires internet access; normal use does not.

## Start locally (Windows PowerShell)

Prerequisites: Python 3.12+ and Node.js 22.12+ (validated with Python 3.12.6 and Node 24.13.0).

From this repository:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-lock.txt
.\.venv\Scripts\python -m alembic upgrade head
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

In a second terminal, from this repository:

```powershell
cd frontend
npm ci
npm run dev -- --strictPort
```

Open [the workspace](http://127.0.0.1:5174). [API documentation](http://127.0.0.1:8010/docs) is available while the backend runs. Keep both terminals open; Ctrl+C stops each server. After initial setup, `scripts/dev.ps1 backend` and `scripts/dev.ps1 frontend` run these commands from the repository root.

On macOS/Linux, use `.venv/bin/python` in place of `.venv\Scripts\python`. The frontend commands are identical.

## First steps

- Enter a thought in Quick capture and press Enter.
- Open Inbox, select the thought, and convert it to a project, game, media item, idea, note, or utility. Conversion copies the text/tags, archives the original, and links the retained capture to its destination. Older conversions are labeled with an unknown destination.
- After capture, optionally choose **Add tags to saved capture** without leaving the page. Enter still saves immediately without tags.
- Open a record to see **Related Notes**; notes name and link their targets.
- Inside Projects, Games, Media, Ideas, or Utilities, click **Add note…**, type an observation, and save. No title, Topic, or Tag is required. Enter adds a line; **Ctrl/Cmd+Enter** saves. **+ Topic** creates local organization; its count selects that Topic's observations, and **All** restores the whole stream. The adjacent **⋯** manages its name, description, or deletion. You can create a Topic while writing without losing the draft.
- Topics belong only to their record (for example, Architecture or Chapter 28). A Context Note may use several Topics without being copied. Optional Tags classify across the workspace (coding, research). Formal Notes remain separate titled documents under **Related Notes**. Inbox and formal Notes do not host Deep Context.
- Create or edit domain records. Titles are required; other fields have defaults or can be empty. Tags are entered with commas, then stored as shared, normalized tags.
- Press **Ctrl/Cmd+K** to focus search, type a phrase, and press Enter. Matching fields and highlights explain each result. Domain buttons filter the current results; Inbox hits identify Active/Archived and conversion state.
- Press **Ctrl/Cmd+Shift+Space** to focus capture. **Escape** closes dialogs. Forms support Enter on single-line fields; use Tab to reach the submit button when editing multiline content.
- Inbox has explicit **Active / Archived** modes with counts. Retained list filters show **Filter active** and **Clear filter**.
- Dashboard shows current projects/games and in-progress media. Activity links return to surviving records; expand six entries to the recent 30.
- Use Settings to export or import a JSON backup.

## Your data

The default database is `backend/data/command-center.db`, independent of the server's working directory. The Settings page shows the actual location. SQLite foreign keys are enabled on every connection. Migrations are explicit; server startup never creates tables.

For an alternate SQLite file, set `PCC_DATABASE_URL` **before** running migrations and starting the backend:

```powershell
$env:PCC_DATABASE_URL = "sqlite:///C:/Users/Aaron/CoderVibe/personal-command-center/backend/data/demo.db"
```

Keep the servers bound to loopback: this application intentionally has no authentication.

Export uses schema version 3 and includes records, conversion provenance, timestamps, formal Note references, Tags, activity (including deleted-record history), Topics, Context Notes, and their Topic/Tag associations. Imports also accept versions 1 and 2, defaulting Deep Context to empty. Version 3 requires both new collections. Import validates the whole backup, then inserts it in one transaction. Existing record/Topic/Context Note/activity IDs reject the entire import with HTTP 409; nothing is overwritten. Tag names merge, preserving existing tag IDs when names match. A tag ID already assigned to another name also rejects the import. Formal Notes and Deep Context must reference parents inside the backup; Topic memberships cannot cross parents. Unsupported versions and malformed content return HTTP 422. Import is for restoring into an empty database or adding a non-conflicting backup, not syncing or replacing data. The browser importer accepts files up to 25 MB; the API currently loads backups in memory.

Before upgrading an existing workspace, stop the backend and preserve a local SQLite copy and JSON export. Milestone 3's `c3_deep_context` migration adds four tables without rewriting existing records. Deleting a Topic removes only its memberships; deleting a parent deletes its local Topics/Context Notes and detaches formal Notes. Downgrading this migration removes Deep Context, so retain a version 3 backup first.

To restore to a fresh database, select a new file with the environment variable, migrate it, start the server, then import. Keep the original file until you've verified the restore. Do not delete your database to resolve an import conflict.

## Optional fictional demo

After migrating an empty database, from `backend`:

```powershell
.\.venv\Scripts\python -m app.seed
```

This adds nine fictional examples and refuses to seed a workspace that already has records. It never runs automatically. Use an alternate `demo.db` to keep demo data separate.

## Checks

From `backend`:

```powershell
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m ruff check app tests migrations
.\.venv\Scripts\python -m ruff format --check app tests migrations
.\.venv\Scripts\python -m mypy app
.\.venv\Scripts\python -m alembic check
```

Tests create isolated, migrated databases. They cover all domain CRUD, capture/conversion, tags, search, relation detachment, Deep Context across five parent types, backup restore, invalid import rejection, transaction rollback, query counts, and clean/previous-schema/downgrade migrations.

From `frontend`:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

`npm run format` formats frontend source; `python -m ruff format app tests migrations` formats Python. Backend direct dependencies are listed in `requirements.txt`; the validated full environment is pinned in `requirements-lock.txt`. Frontend versions are pinned by `package-lock.json`.

Optional Chromium browser test, with development servers stopped (ports 8010 and 5174 must be free):

```powershell
cd frontend
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.browsers'
npx playwright install chromium
npm run test:e2e
```

The test starts isolated servers and a uniquely named `backend/data/e2e-*.db`, exercises the UI against the real API, and writes screenshots/backup JSON to `frontend/test-results/`. Forced Windows process termination may leave an ignored test database file. The normal database is untouched.

For a production bundle preview, run `npm run build` then `npm run preview` with the backend running. The preview server proxies `/api` to the backend, as the development server does. This milestone does not package a desktop executable or a single-process server.

Search includes Topic names/descriptions and Context Note bodies/Tags. Topic results open the parent with that Topic selected; Context Note results open and focus the observation. Record activity tracks edits and capture, while filtering creates no history.

See [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), the [work report index](docs/reports/README.md), and the [Deep Context milestone report](docs/reports/004_deep_context.md).
