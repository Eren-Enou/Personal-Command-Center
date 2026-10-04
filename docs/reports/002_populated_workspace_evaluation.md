# Personal Command Center — Populated Workspace Evaluation

## Summary

On October 4, 2026, I used the running PCC application at `http://127.0.0.1:5174/` to populate and explore the normal local workspace. Every new record, tag assignment, conversion, relationship, archive/restore action, and content update was performed through browser UI controls. No records were inserted through SQL or mutation API calls, and the isolated Playwright E2E workspace was not used.

The evaluation added **40 demo records** to the three existing records. All 40 new records carry the `codex-demo` tag, including the ten original captures and four records created by conversion. The application was left populated and running, with the dashboard open for manual inspection. No application code or database schema was changed.

Capture, editing, search, conversion, relationships, and persistence worked. The strongest improvement area is recovering context: related notes are not visible from their targets, archived converted captures resemble duplicate search results, and the media dashboard favors new additions over current engagement. Two nonblocking defects were reproduced: dialog initial focus and dashboard horizontal overflow at the current browser width.

Settings export was exercised, but the Codex in-app browser did not provide a downloadable file/event. The actual versioned export JSON was saved through a read-only HTTP fallback and verified. Native browser download completion remains unverified in this session; it is not claimed as a pass.

## Starting State

README and AGENTS instructions were reviewed before population. Both servers were already running: FastAPI on loopback port 8010 and Vite production preview on 5174. Settings showed:

`C:/Users/Aaron/CoderVibe/personal-command-center/backend/data/command-center.db`

The UI showed three content records, including one archived entry:

| Domain | Existing record | ID | State |
| --- | --- | --- | --- |
| Projects | Sidequest | `a37390c8-4c10-49e7-8132-97558c5d4eee` | Active; description `Sidequest`; `personal` tag; repository URL already present; next step and notes empty |
| Inbox | PCC: Initial MVP completed. Need to evaluate actual usability before choosing milestone 2. | `73bf7b94-8563-4b49-9bda-ac0ef9b241e5` | Active, untagged |
| Inbox | Sidequest | `3f5ce250-5ff4-4cc3-a872-028e44e02ef7` | Archived source capture |

Games, media, ideas, notes, and utilities were empty. There was one shared tag (`personal`) and five activity entries. The existing repository link was not followed.

After inspecting these records through the UI, a supplemental **read-only** SQLite inventory was saved before any additions. A final comparison confirmed that all pre-existing rows, timestamps, tags, associations, and activity entries remained unchanged. The starting inventory is stored locally in the ignored evaluation directory.

## Data Added

| Domain | Direct creation | Inbox conversion | New records | Final total, including existing data |
| --- | ---: | ---: | ---: | ---: |
| Projects | 4 | 1 | 5 | 6 |
| Games | 5 | 0 | 5 | 5 |
| Media | 6 | 0 | 6 | 6 |
| Ideas | 4 | 1 | 5 | 5 |
| Notes | 4 | 1 | 5 | 5 |
| Utilities | 3 | 1 | 4 | 4 |
| Inbox | 10 Quick Capture entries | 0 | 10 | 12 |
| **Total** | **36** | **4** | **40** | **43** |

Conversion retains the source inbox entry, so the converted destinations are additional records rather than replacements.

**Projects:** Atlas Notes and EmberSave are active; Tiny Weather Display is paused; Archive Mapper is abandoned; Folder Label Maker is completed. The last project came from Inbox conversion. Atlas Notes and EmberSave use clearly fictional `example.invalid/local/...` repository placeholders. Descriptions, next steps, and multiline notes give each project a reason to return to it.

**Games:** Ashes of Meridian is playing; Ironvale Online is waiting with a fictional March 19, 2027 release date; Hollow Signal is paused; Clockwork Frontier is completed; Kingdoms Below is dropped. Builds, goals, platforms, and checkpoint notes were populated. Hollow Signal was temporarily resumed and then paused again during update testing, leaving all five statuses represented.

**Media:** The Last Cartographer (manga), Signal From Europa (show), and The Quiet Engine (book) are in progress. A Machine Dreaming is completed, rated 8/10. Lanterns Over Nacre (anime) is planned. Broken Orbit Society (show) is dropped, rated 4/10. The supported shared status is `in progress`, rather than separate reading/watching statuses; reading/watching tags provide that distinction.

**Ideas:** Game Archaeologist, Context Resume, Screenshot Inbox, Decision Graveyard, and Random Activity Selector. Categories and new/exploring/done statuses were used where appropriate. Random Activity Selector came from conversion.

**Notes:** Atlas Notes architecture thoughts, EmberSave investigation, Things to check before Ironvale launch, Sunday reset checklist, and Atlas research reminder. Four notes have target references: two to Atlas Notes, one to EmberSave, and one to Ironvale Online. Sunday reset checklist is standalone. Atlas research reminder came from conversion and was subsequently linked through Edit. Longer notes include blank lines, lists, and indentation.

**Utilities:** Local development commands, SQLite inspection reminder, Git cleanup reference, and Local read-only file inspection. The last utility came from conversion. These contain example instructions and inspection commands; none of their stored commands were executed.

**Inbox:** Ten thoughts were captured about backlinks, a melee build, another manga series, stale projects, hypothetical save timestamps, search behavior, a finished label-maker project, an activity-selector idea, source interpretation, and safe file inspection. Four were converted; six demo captures remain active and unorganized. The existing reminder also remains active.

All new items are tagged `codex-demo`. Other shared tags include coding, research, game, rpg, reading, watching, local, reference, idea, and backlinks. Atlas's `active` tag was removed and `backlinks` added during editing; its actual status remains active. The dictionary now has **17 tags**, including the original `personal` tag. The activity table has **68 entries**, up from five.

## Workflows Exercised

- Used persistent navigation to visit every domain, Search, Settings, and Dashboard.
- Created records through their modal forms, using supported statuses, dates, ratings, multiline fields, and comma-separated tags.
- Used Ctrl+Shift+Space to focus Quick Capture, submitted ten thoughts with Enter, and confirmed the saved state.
- Opened each new capture and used Edit to add the demo marker and meaningful tags.
- Converted four captures through the actual conversion dialog and inspected their resulting details.
- Filtered Projects by `Atlas`, Games by `Hollow`, and Media by the `reading` tag. Cleared a retained game filter to retrieve another title.
- Changed Atlas's next step to `Add a backlink prototype for two linked notes; verify source excerpts remain distinct.` Added one tag and removed another.
- Resumed Hollow Signal, changed its goal, and later paused it with an updated checkpoint note. Advanced Ashes of Meridian's goal to `Observatory reached; map the ice tunnels beneath it.`
- Advanced The Last Cartographer from Chapter 27 to **Chapter 28**.
- Added a project reference to a converted note, followed the link to Atlas Notes, and navigated backward to the note.
- Archived and restored the demo capture about finding another series, leaving it active at completion.
- Used Ctrl+K for global search and exercised six shared terms.
- Opened new/edit dialogs, observed their initial focus, and used Escape to close an unused creation dialog without creating a record.
- Reviewed the populated dashboard and activity timeline; refreshed records; restarted both servers; and revisited distinctive saved values.
- Used Settings Export twice, with a bounded download wait on the populated attempt. No import was performed.

Browser automation used the existing Codex in-app browser and UI locators. Locator mismatches were resolved by checking current DOM/accessibility state; these tooling problems are not counted as application defects. Supplemental SQL access was read-only and used only for inventory/preservation verification. The sole supplemental HTTP call retrieved the existing export endpoint after browser download verification failed.

## Search Evaluation

| Term | Results | Domains observed | What it demonstrated |
| --- | ---: | --- | --- |
| Atlas | 7 | Projects, media, notes, inbox, utilities | A project can be found alongside its research notes, a media annotation, command reference, and original captures |
| game | 13 | Projects, games, ideas, notes, inbox | Tags connect the game collection to coding work and research ideas |
| research | 14 | All seven domains | Shared tags and body text produce a useful cross-domain trail |
| codex-demo | 40 | All seven domains | Every new record, including archived converted originals, is discoverable by the cleanup marker |
| local | 16 | Projects, media, ideas, notes, inbox, utilities | Both prose and resource snippets are searchable |
| save | 7 | Projects, media, notes, inbox, utilities | Partial words find EmberSave and its investigation, but also unrelated prose such as “Save for a quiet weekend” |

The result labels and matching field names were useful. For example, `research` showed both **notes** and **tags** for The Last Cartographer; `save` showed multiple fields on EmberSave. Ctrl+K correctly focused the global search input. Searches returned without a noticeable delay at this collection size; no timing benchmark was performed.

Results appeared in domain blocks, with more recently updated items near the top within each block. This was predictable for browsing but did not prioritize relevance across domains. The utility result stayed below the notes and inbox entries even when it provided practical context.

Archived originals are included, as promised. However, the Atlas research reminder appeared both as a note and as its source capture, and the search view did not identify the source as archived or converted. Domain labels help, but understanding the duplication requires extra reading.

Snippets generally supplied enough context to choose a result. Search terms were not highlighted. Some excerpts ended midword without a closing truncation marker, such as the command reference ending in `local projec`; this is a readability limitation. The 40-result demo-tag search required substantial scrolling and had no domain/status filter on the result page.

## Dashboard Evaluation

| User question | Observation |
| --- | --- |
| What am I currently working on? | Good: Atlas Notes and EmberSave show their next steps; the existing active Sidequest record remains visible |
| What am I currently playing? | Good: playing games show their current goal. The dashboard reflected Hollow's temporary resume and later pause; Ashes remains visible in the final state |
| What have I recently captured? | Partial: four waiting items are visible, with a View all link. Seven active entries exist. Restoring an older capture moves it ahead of newer captures because its update is recent |
| What media am I currently engaged with? | Weak: the section is “Recently added media,” not current media. It displayed a dropped show, planned anime, completed book, and one active book, while the active manga and show were absent |
| What changed recently? | Partial: the latest actions are present, including archive/restore, edits, and conversions. The timeline says “updated” without identifying the changed field and cannot be used directly to open a record |
| Can I quickly decide where to go next? | Mostly: next steps, goals, section links, and persistent capture are helpful. Recovering supporting notes requires another search or visit to Notes |

The compact lists make the top of the dashboard useful. The 30-entry activity timeline is long after bulk population, and each capture/tag edit or conversion contributes repeated entries. The evaluation's concentrated data entry exaggerates this effect; it should not be treated as a measured ordinary-day pattern. Nonetheless, the visible timeline consumed much more vertical space than the decision-making sections.

The dashboard overflowed horizontally at the current 952px browser width, as described below. Other detail pages checked at that width fit normally.

## GOOD

- Quick Capture works from any page, gives a saved confirmation, and does not force a domain decision.
- Project next steps and game goals are visible in both lists and dashboard summaries, making them useful for resuming context.
- Conversion preserves the complete original text and tags and navigates directly to the destination.
- Explicit note relationships work, and normal backward navigation returns to the source note.
- Multiline body text and indentation survive saving, refreshing, and server restart.
- Status badges and meaningful tag labels make a varied collection scannable.
- Cross-domain search finds content in prose, titles, snippets, URLs, and tags and explains matching fields.
- The normal database location and backup conflict strategy are visible in Settings.
- Existing user records and their history were preserved, verified against a saved starting inventory.

## FRICTION

- Tagging an otherwise instant capture takes a list visit, detail visit, Edit, tag entry, and Save. Ten captures required ten separate tagging edits.
- A retained list filter initially hid Ashes when returning from Hollow's detail. Preserving context can be useful, but there is no prominent one-click clear control.
- “Show archived” replaces the active inbox with an archived-only list rather than adding archived entries. The label does not make that mode switch especially clear.
- Converted source entries have no visible link to their destination. Search shows both versions without archive/conversion badges.
- A note's relationship reads only “Open related project,” not the target title. The project itself provides no related-note list.
- Broad searches require scrolling through a single result list. There is no relevance explanation/order control, match highlighting, or result-domain filter.
- Updating one progress value opens the entire editor. This worked, but is heavier than the quick capture experience.
- The media dashboard does not answer current engagement well, even after updating an active record.
- Activity entries can confirm that an edit occurred, but not what changed or how to navigate back to its record.

## BUGS

### 1. New/edit dialogs focus Close instead of the first field

- **Reproduction:** Open Projects, click New project, and inspect the focused element. The same behavior was observed after opening Edit on Atlas Notes.
- **Expected:** Keyboard entry should begin in the first editable field, allowing immediate typing of the title or content.
- **Observed:** The focused element was the button with `aria-label="Close dialog"`. The browser accessibility state also identified Close as focused. A keyboard user must move focus before entering content.
- **Severity:** Low; recurring keyboard/capture friction, not data loss.
- **Evidence:** `test-results/evaluation-2026-10-04/dialog-focus.jpg` and browser focus observations.
- **Disposition:** Documented; no code change was necessary to continue. Escape successfully closed the unused dialog.

### 2. Populated dashboard overflows at an intermediate desktop width

- **Reproduction:** Open the populated dashboard in the current in-app browser with a 952px viewport. Inspect the page width and right-side dashboard controls.
- **Expected:** The dashboard and its section controls fit within the viewport or adapt their layout.
- **Observed:** `window.innerWidth` was **952px**, while both the document and body scroll widths were **985px**. The right edge of the playing/media column and its View all controls was clipped in the viewport screenshot. The related-note detail, checked at the same width, had a 952px document width and fit normally.
- **Severity:** Medium; layout/navigation impairment at a practical side-panel width. The data and other routes remain usable.
- **Evidence:** `test-results/evaluation-2026-10-04/dashboard-overview.jpg` and the recorded geometry observation.
- **Disposition:** Documented; no dashboard redesign or CSS change was made during evaluation.

No save, conversion, relationship, or data-persistence defect was observed. The export download limitation below could not be attributed conclusively to application code and is therefore not listed as an application bug.

## OPPORTUNITIES

- Show related notes directly on project/game detail pages and name the target on note references.
- Add archive/converted state labels to search and connect retained source captures with their destinations.
- Give the dashboard a current-media view, or a clear way to switch between current engagement and recent additions.
- Make activity items open their records and distinguish a progress/next-step update from a generic edit.
- Reduce the steps required to add tags after capture, while retaining a minimal default input.
- Provide explicit Active/Archived inbox modes and an easy way to clear list filters.
- Improve search snippets with highlighting and clear truncation, and consider simple domain filtering before more elaborate search machinery.

These are observations and candidate changes only; none was implemented automatically.

## Conversion Evaluation

| Source thought | Destination | Preserved field | Subsequent action |
| --- | --- | --- | --- |
| Finished Folder Label Maker script | Project: Folder Label Maker | Description | Set status to completed and added a retention-oriented next step |
| Activity selection with 20 minutes and low effort | Idea: Random Activity Selector | Body | Kept the default new status |
| Atlas source excerpts and uncertainty reminder | Note: Atlas research reminder | Body | Linked it to Atlas Notes through Edit |
| Safe JSON inspection of a copied fixture | Utility: Local read-only file inspection | Content | Retained as a stored snippet; not executed |

All four destinations retained the source text verbatim and inherited its tags, including `codex-demo`. The sources remained archived with their original text/tags and became searchable alongside the destinations. The dialog explained this behavior before submission, which was reassuring.

The destination title initially contains the whole captured thought, so I shortened it to a useful record title before conversion. Only type and title are requested; status and relationship refinement require a later edit. That is a reasonable simple workflow, with additional navigation when organization is needed.

The archived originals are understandable when viewed in Inbox, but neither their details nor search results point to the resulting record. Four demo sources remain archived; no original was deleted or converted twice.

## Persistence Verification

Distinctive values recorded from the UI included:

- Atlas's revised backlink next step and updated tag set.
- Ashes's new observatory/ice-tunnel goal and multiline Frost Mage build.
- The Last Cartographer's Chapter 28 progress.
- The architecture note's blank lines, indentation, source/interpretation text, and Atlas target link.
- Six active demo captures and four archived conversion sources.

The note and project were refreshed and their record fields compared before/after. Transient “Saved to inbox” status text was excluded from the comparison, and record loading was allowed to finish before reading values. Saved content and relationships remained intact.

Both existing local server processes were then stopped and restarted with the normal backend and Vite preview commands:

```text
backend: .venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
frontend: npm run preview -- --strictPort
```

No migration, seed, import, reset, or cleanup command was run against the normal database. After a browser reload, Settings showed the same `command-center.db` and **43 records**. The distinctive project, game, media, note, and target-link values were checked again through the UI. Search still returned **40** demo-tag matches. Inbox showed **7 active** and **5 archived** entries, including the preserved existing entries.

A supplemental read-only inventory comparison confirmed that every baseline row and association still exists with identical values. Evidence is saved in `starting-inventory.json`, `final-inventory.json`, `verification-summary.json`, and `restart-persistence.json` under the ignored evaluation directory.

## Backup Verification

The Settings UI's Export all data button was used on both the starting and populated workspace. The populated attempt used a five-second bounded download wait. The in-app browser did not return a download event/path; no matching generated file was found in the checked Downloads folder. Settings displayed no error, and the inspected browser error log was empty. This does **not** prove a completed native download or establish the application as the cause.

To retain a usable backup and inspect its content without changing the app, I saved the real response from the same export route with this read-only fallback:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5174/api/export' -OutFile 'test-results/evaluation-2026-10-04/populated-workspace.json'
```

The saved JSON is **schema version 1**, includes **43 records**, **17 tags**, and **68 activities**, and represents both the existing records and all **40 demo-tagged** records. Its domain counts, original IDs, timestamps, relationships, tags, and conversion sources were inspected/validated. It is the application's actual backup format, not a database dump or reconstructed substitute.

**No backup was imported.** The normal database was not replaced or cleaned. A manual download check in a browser that exposes file downloads is still needed to close the native-download verification gap.

## Screenshots

Screenshots and supporting evidence are stored in the ignored directory `test-results/evaluation-2026-10-04/`. They are available locally and are intentionally excluded from source control. Record detail screenshots were recaptured with the settled viewport screenshot API after an initial full-page capture artifact was noticed.

| View | Local file |
| --- | --- |
| Populated dashboard, full page | [dashboard.jpg](../../test-results/evaluation-2026-10-04/dashboard.jpg) |
| Dashboard viewport and right-edge overflow | [dashboard-overview.jpg](../../test-results/evaluation-2026-10-04/dashboard-overview.jpg) |
| Projects | [projects.jpg](../../test-results/evaluation-2026-10-04/projects.jpg) |
| Games, final five-status collection | [games.jpg](../../test-results/evaluation-2026-10-04/games.jpg) |
| Active inbox | [inbox.jpg](../../test-results/evaluation-2026-10-04/inbox.jpg) |
| Archived inbox | [inbox-archived.jpg](../../test-results/evaluation-2026-10-04/inbox-archived.jpg) |
| Atlas global search results | [search-atlas.jpg](../../test-results/evaluation-2026-10-04/search-atlas.jpg) |
| Forty demo-tag results | [search-demo.jpg](../../test-results/evaluation-2026-10-04/search-demo.jpg) |
| Atlas project detail | [project-detail.jpg](../../test-results/evaluation-2026-10-04/project-detail.jpg) |
| Ashes game detail | [game-detail.jpg](../../test-results/evaluation-2026-10-04/game-detail.jpg) |
| Architecture note with project relationship | [related-note.jpg](../../test-results/evaluation-2026-10-04/related-note.jpg) |
| Creation-dialog focus evidence | [dialog-focus.jpg](../../test-results/evaluation-2026-10-04/dialog-focus.jpg) |
| Settings and normal database count | [settings.jpg](../../test-results/evaluation-2026-10-04/settings.jpg) |

Search result text, record creation provenance, read-only inventories, persistence observations, and the actual export JSON are also saved in that directory.

## Recommended Milestone 2

**Make it easier to resume context in a populated workspace.** Based on this evaluation, the coherent sequence is:

1. Fix the reproduced dialog-focus and intermediate-width overflow defects. Also close the native-download verification gap in a normal browser before deciding whether export needs an application fix.
2. Bring related notes onto target detail pages, name note targets, and connect converted captures with their destinations. Label archived search hits so context does not look like accidental duplication.
3. Improve dashboard usefulness for current media and make recent activity lead back to records. Retain the compact project next steps and game goals that already worked.
4. Reduce post-capture tagging steps and clarify inbox/filter modes. Add search highlighting and simple domain filters where the observed broad result lists justify them.

This milestone should improve the existing workflows and information relationships. The evaluation supplies no reason to prioritize AI, remote integrations, a plugin system, or a new database/search architecture.

## Final Database State

**All 40 generated demo records remain in the normal local PCC database for manual inspection.** The database now contains 43 content records: 6 projects, 5 games, 6 media records, 5 ideas, 5 notes, 4 utilities, and 12 inbox entries. Six demo captures remain active; four are retained as archived conversion sources. The two pre-existing inbox entries and the existing Sidequest project are intact and unchanged.

The normal servers were left running, and the populated dashboard was left open at `http://127.0.0.1:5174/`. No reset, deletion, cleanup, or import was performed.

This session changed reports/index documentation and created ignored local evidence plus application data through the UI. It made no application source/schema changes. Automated unit tests, lint/type checks, builds, and migration suites were not rerun for this exploratory session; previous milestone results are not presented as new validation. The validation here consists of the live UI workflows, refresh/restart checks, preserved-row comparison, screenshot review, and export inspection described above.
