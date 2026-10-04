# Personal Command Center

Build a private, offline, single-user workspace for capture and retrieval. Preserve SQLite ownership, no authentication, no cloud dependency, and explicit domain tables.

- Backend: Python, typed FastAPI/Pydantic boundaries, SQLAlchemy 2, Alembic migrations. Routes delegate mutations to services. Never use create_all in application startup.
- Frontend: strict TypeScript, React Router, TanStack Query, central API client and shortcuts. Keep domain field definitions separate from views; use plain CSS.
- Keep all work in this standalone project directory. Do not inspect or depend on other repositories.
- Validate important persistence and transfer behavior with pytest, user flows with Testing Library, and run lint, typecheck, build, and clean migrations before reporting completion.
- Changes to models require a migration. Imports must be validated and atomic. Preserve timestamps, relations, tags, and activity in backups.
- No accounts, remote databases, AI infrastructure, generic entity framework, speculative plugins, or event sourcing. Prefer small, direct modules and existing abstractions.
- Keep docs and command examples accurate. Report actual validation results and limitations.
- At the end of each substantive work session, create a new report in `docs/reports/sessions/` and add it to `docs/reports/README.md`. Use `YYYY-MM-DD_NNN_short-description.md`, with the user's local date and the next unused three-digit sequence for that date. Never overwrite an earlier session report.
- Session reports must explain the request, delivered behavior, important files changed, actual validation and results, decisions, limitations, and outstanding work. Distinguish checks run in that session from earlier evidence; explicitly say when tests were not rerun. Link detailed milestone reports when relevant.
