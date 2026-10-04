# Roadmap

## NOW — Delivered foundation, context recovery and Deep Context

Local SQLite storage, explicit migrations, seven domain sections, capture and conversion, tags, optional note references, cross-domain search, recent activity, JSON backup/restore, keyboard shortcuts, tests, and plain CSS desktop/mobile layouts. Milestone 2 adds reverse related notes, named references, conversion provenance, current-media summaries, linked compact activity, optional capture tagging, explicit Inbox modes, filter clearing, highlighted/domain-filtered search, and focus/responsive fixes.

Milestone 3 adds shallow local Topics and title-free Context Notes to Projects, Games, Media, Ideas and Utilities. Observations support zero/multiple Topics and optional shared Tags, inline capture, chronology, editing and deletion. Search opens a selected Topic or focused observation. Formal Notes remain separate. Version 3 backup includes all context and memberships; versions 1/2 remain importable.

## NEXT — Evaluate Context Resume from accumulated knowledge

- Use the refined workspace daily and evaluate whether context is recovered faster.
- Candidate Milestone 4: a compact, deliberate resume surface combining the existing current state/next step with recent observations and a chosen local Topic. Validate this against all four demonstration domains before adding new stored fields. Avoid generated summaries: Context Notes supply raw evidence and formal Notes carry substantial analysis.
- Measure how often long context streams bury formal documents or useful observations. Consider a small recent-context preview or pinned resume choice before pagination or domain-specific models.
- Add automated local backups with restore verification and retention controls.
- Benchmark search and long lists; add pagination/FTS5 only when justified.
- Consider status filters and tag suggestions/management only where daily use shows a need.
- Consider optimistic concurrency checks and unsaved-edit protection.
- Extend browser coverage for successful import into a fresh workspace and more failure states.

## LATER — Optional capabilities

- Universal command palette; Tauri desktop wrapper; system-wide capture.
- Attachments/screenshots and richer relationships where specific use cases require them. Conversion provenance is already delivered.
- Calendar and game release views; an activity chooser.
- Opt-in URL metadata, GitHub integration, local repository detection, and media metadata APIs.
- Browser extension or mobile companion, after designing local data ownership and transfer carefully.

## EXPERIMENTAL — Not part of the current architecture

Semantic search, recommendations, optional local LLM experiments, and optional remote LLM integrations. These require separate proposals with measured value, explicit user controls, privacy boundaries, and a complete offline fallback. No AI infrastructure, embeddings, agents, cloud synchronization, accounts, or plugin framework has been added to the MVP.
