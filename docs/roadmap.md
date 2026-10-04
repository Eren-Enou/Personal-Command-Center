# Roadmap

## NOW — Delivered foundation

Local SQLite storage, explicit migrations, seven domain sections, capture and conversion, tags, optional note references, cross-domain search, recent activity, JSON backup/restore, keyboard shortcuts, tests, and plain CSS desktop/mobile layouts.

## NEXT — Make daily use smoother

- Use the MVP with real data and address observed friction.
- Add automated local backups with restore verification and retention controls.
- Benchmark search and long lists; add pagination/FTS5 only when justified.
- Add status filters, tag suggestions/management, and clearer search highlighting.
- Consider optimistic concurrency checks and unsaved-edit protection.
- Extend browser coverage for successful import into a fresh workspace and more failure states.

## LATER — Optional capabilities

- Universal command palette; Tauri desktop wrapper; system-wide capture.
- Attachments/screenshots; provenance; richer relationships where specific use cases require them.
- Calendar and game release views; an activity chooser.
- Opt-in URL metadata, GitHub integration, local repository detection, and media metadata APIs.
- Browser extension or mobile companion, after designing local data ownership and transfer carefully.

## EXPERIMENTAL — Not part of the current architecture

Semantic search, recommendations, optional local LLM experiments, and optional remote LLM integrations. These require separate proposals with measured value, explicit user controls, privacy boundaries, and a complete offline fallback. No AI infrastructure, embeddings, agents, cloud synchronization, accounts, or plugin framework has been added to the MVP.
