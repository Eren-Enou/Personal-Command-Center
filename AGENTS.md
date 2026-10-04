# Personal Command Center

Build a private, offline, single-user workspace for capture and retrieval. Preserve SQLite ownership, no authentication, no cloud dependency, and explicit domain tables.

- Backend: Python, typed FastAPI/Pydantic boundaries, SQLAlchemy 2, Alembic migrations. Routes delegate mutations to services. Never use create_all in application startup.
- Frontend: strict TypeScript, React Router, TanStack Query, central API client and shortcuts. Keep domain field definitions separate from views; use plain CSS.
- Keep all work in this standalone project directory. Do not inspect or depend on other repositories.
- Validate important persistence and transfer behavior with pytest, user flows with Testing Library, and run lint, typecheck, build, and clean migrations before reporting completion.
- Changes to models require a migration. Imports must be validated and atomic. Preserve timestamps, relations, tags, and activity in backups.
- No accounts, remote databases, AI infrastructure, generic entity framework, speculative plugins, or event sourcing. Prefer small, direct modules and existing abstractions.
- Keep docs and command examples accurate. Report actual validation results and limitations.
