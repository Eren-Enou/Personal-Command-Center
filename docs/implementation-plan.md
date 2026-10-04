# Initial implementation plan

This is a standalone repository. All application code, data, scripts, and documentation stay here.

1. Establish explicit SQLAlchemy domain tables, typed Pydantic boundaries, shared tags, and Alembic migrations.
2. Implement CRUD, capture/archive/conversion, field-aware search, activity, and validated atomic JSON transfer.
3. Build persistent navigation, dashboard, compact record editors, search, settings, and centralized shortcuts.
4. Add optional fictional seed data and tests. Run clean migrations, API and UI flows, lint, type checking, and production build.
5. Document actual results and remaining limitations in the milestone report.

## Decisions and assumptions

- Bind development servers to loopback. Use backend port 8010 and frontend port 5174.
- Use explicit projects, games, media, ideas, notes, inbox, and utilities tables, with UUIDs and UTC timestamps.
- Normalize shared tags and use per-domain association tables.
- Start with Unicode case-insensitive substring search and matching-field snippets; defer FTS5 until scale warrants its tokenization and indexing complexity.
- Validate an entire versioned backup before an atomic insertion. Reject colliding record/activity IDs; merge tags by name; never overwrite existing records.
- Notes have one optional typed reference, validated on write. Target deletion detaches notes.
- Conversion retains captured text and tags, archives the source, and creates activity in one transaction.
- Use plain CSS and no hosted fonts or runtime network services. Demo data is opt-in.

## Risks to verify

Import rollback, malformed references, timestamp preservation, tag identity remapping, SQLite foreign keys, conversion atomicity, and shortcuts across routes. Search is a linear scan suitable for a modest personal collection; backups are loaded in memory.
