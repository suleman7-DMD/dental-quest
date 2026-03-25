# CLAUDE.md - Dental Student Quest

## CRITICAL RULES

### Never Rebuild Entire Files
- Body-comp is ~22,444 lines. Use surgical `Edit` tool only. Read section first.
- **Split apps** (index.html: 12 modules, d3-roadmap: 10 modules, stim-calc: 11 modules) — use surgical edits on individual JS module files.

### Date Parsing (COMMON BUG)
```javascript
// WRONG: new Date('2026-02-02')  — off-by-one in EST
// CORRECT:
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```

### Common Bugs
- **Empty array truthy**: `[] || defaults` → `[]`. Check `.length` not truthiness.
- **`||` vs `??`**: `|| default` treats 0/false as falsy. Use `?? default` for numeric/boolean fields. Includes `done`/`grade` fields.
- **Circular calculations**: A computed value must never fall back to itself as input.
- **Wrong field names**: Verify against `getDefaultState()` or `state.js` defaults (e.g., `goalWeight_lbs` not `goalWeight`, `dailyStreak` not `streak`).
- **`_version: Date.now()`**: Causes data wipe. Must be 0 in defaults.
- **`undefined` in Firebase `.set()`**: Firebase rejects `undefined` — use `?? null` or `?? false`. Crashes ALL saves silently.
- **`doToday` only for eod**: Only `urgency === 'eod'` sets `doToday: true`. Never for 'soon'.
- **UTC vs local dates**: Never use `.toISOString().slice(0,10)` — use `getLocalDateString(date)`.
- **XP dual counters**: `toggleTask()` must use `awardCommandCenterXP()` for BOTH `stats.totalXPGained` AND `focusStats.totalXP`. Uncomplete subtracts tier-based XP (50/75/40/25) from ALL 3 counters.
- **Task creation consistency**: ALL 4 creation sites MUST set triageTier/triageOrder/triageDate when urgency is eod/soon/week.
- **onclick string IDs**: `onclick="fn('${taskId}')"` not `onclick="fn(${taskId})"`.
- **XSS in innerHTML**: ALL user text MUST use `escapeHtml()` in innerHTML.
- **StableId before mutation**: Compute `getDeadlineId(deadline)` BEFORE modifying fields. Use `deadline._originalStableId` for persistence keys.
- **Custom deadline dual-store**: When editing custom deadlines, update BOTH `editedDeadlines` AND `customDeadlines[id]`. `initUI()` only applies `editedDeadlines` to STATIC deadlines.
- **Flag ordering**: ALL sync flags MUST be set BEFORE `initUI()`. Wrap `initUI()` in try/catch.
- **mergeRemoteState**: Compare `lastSaved` timestamps — if local is newer, call `mergeRemoteCollectionsIntoLocal(data)` (NOT skip entirely). This adds remote-only entries without overwriting local changes. Skipping entirely loses data imported on other devices (e.g., Chrome imports todos, DuckDuckGo has newer localStorage → skipping merge loses todos).
- **`mergeRemoteCollectionsIntoLocal` pattern**: When local is newer, `addMissing(local, remote)` — only add keys from remote that don't exist in local. Local wins for conflicts. Covers ALL collection fields.
- **Auto-push when local is newer**: `finishFirebaseLoad()` sets `localWasNewer=true` → deferred `saveData()` at 500ms pushes to Firebase so other devices get the latest. Also pushes when Firebase is empty/poisoned.
- **Poisoned Firebase detection**: `finishFirebaseLoad()` checks `isEmptyState(data)` — if Firebase has data but it's effectively defaults (no real user collections), treat as no data. Prevents merging defaults over real local data.
- **Auto-generated data must NOT pass Guard C**: `isEmptyState()` must NOT check `exams` (auto-generated from static list in initUI). `hasCompetencies` must check `completed > 0` (auto-initialized from DEFAULT_COMPETENCIES all have completed:0). Without this, defaults + auto-generated data pass Guard C and get saved to Firebase.
- **initUI auto-save triggers need guards**: Both `setTimeout(() => saveData(), 100)` (exams sync) and `setTimeout(() => saveData(), 2000)` (upcomingDeadlines) in initUI MUST check `hasLoadedFromCloud && !awaitingFirebaseLoad` — prevents saving defaults during race.
- **CRUD localStorage safety**: ALL CRUD functions MUST call `safeLocalStorageSet()` BEFORE `saveData()`.
- **Cache-busting**: After multi-file JS changes, add `?v=YYYYMMDD` to ALL `<script src>` tags.
- **Shallow grades merge**: Use deep per-course IIFE merge, not `{ ...local, ...firebase }` spread.
- **buildSaveData undefined**: Use `?? null`/`?? false` for ALL optional fields (e.g., currentSession). One undefined crashes all saves.
- **Stats counters**: `stats.totalTasks` drifts — use live `getValues(tasks)` count.
- **Double loadData()**: Causes race conditions. **Orphan function calls**: Verify function exists.
- **Failsafe timer**: Must set `hasLoadedFromCloud = true` + `markInitialLoadComplete()`.
- **Flex full-width items need `flex-wrap`**: When mixing flex columns with full-width cards, the container MUST have `flex-wrap: wrap` and the full-width item needs `flex: 1 1 100%`. Without `flex-wrap`, all items squeeze into one row.
- **Expensive renders in update loops**: Never put heavy canvas/analytics renders in `updateUI()`/`recalculate()` (runs every 5s). Call only on init + navigation events.
- **Canvas tooltip stale closure**: Scrollable/resizable canvas containers must recompute `graphWidth`/`pointSpacing` inside `onmousemove`, not capture at setup time.
- **Division by zero in graph spacing**: Always guard `pointSpacing = width / (data.length - 1)` with `if (data.length < 2) return`.
- **Nuke-and-rebuild sync**: NEVER delete all items then recreate from source on every render/init. Use incremental sync — track user edits (`userEdited: true`) and deletions (`hiddenClinicTasks`) so sync respects them.
- **Clinic task delete without hiding**: `_mpDeleteCurrentTaskConfirmed()` must check for `clinicalAppointmentId` or `clinic_` prefix — clinic tasks must be added to `hiddenClinicTasks` (not just deleted from `customTasks`), or `syncClinicalToMonthlyPlanner()` recreates them on next init. Fixed Mar 21 2026.
- **Import dedup by patientId only**: Both `confirmClinicalImport()` and `confirmPatientImport()` must dedup by patient NAME + date + time as secondary check, not just `patientId` + date + time. If patient matching creates a new ID, the primary dedup fails silently. Fixed Mar 21 2026.
- **syncClinicalToMonthlyPlanner on every tab switch**: Must be gated by `clinicalDataDirty` flag. Without it, hidden/deleted clinic tasks get recreated on every tab switch. Flag set true by mergeRemoteState/loadFromLocalStorage/restoreCheckpoint/importAndRestoreDirectly, set false at end of syncClinicalToMonthlyPlanner(). Fixed Mar 21 2026.
- **DeadlineId in onclick**: `getDeadlineId()` must strip `'"\\` from keys. Escape IDs in onclick: `onclick="fn('${safeId}')"` where `safeId = deadlineId.replace(/'/g, "\\'")`.
- **Duplicate HTML style attributes**: Never pass `style="..."` in extraAttr if the element already has a `style` attr. Browsers use the first and ignore the second. Merge into one style.
- **Cross-app dedup**: Stim calc reads both `appointments` AND `customTasks` from graduationRoadmap — clinic-synced tasks appear in BOTH. Dedup by `clinicalAppointmentId` and by `date|time|name`.
- **Cross-app write exception**: `toggleMainAppTask()` in graduation-roadmap writes to `users/{pin}/appData/tasks/{id}/completed` (index.html's Firebase path). This is an intentional feature for "Do Today" task completion, NOT a bug. It is the ONLY cross-app write — all other cross-app reads are READ-ONLY. Targeted single-field write minimizes conflict risk. Self-heals via `.on('value')` listener.
- **Shared storage namespace = data wipe**: NEVER let two apps share the same localStorage key or Firebase path. graduation-roadmap used to share `d3RoadmapData`/`d3Roadmap` with d3-roadmap — opening d3-roadmap from any nav link wiped all graduation-specific fields. Fixed Mar 21 2026: separate namespace `graduationRoadmapData`/`graduationRoadmap` with one-time migration.
- **Field-by-field reconstruction drops new fields**: All 4 merge/restore sites (`mergeRemoteState`, `loadFromLocalStorage`, `restoreCheckpoint`, `importAndRestoreDirectly`) reconstruct `roadmapData` field-by-field. When adding ANY new field, it MUST be added to ALL 4 sites or it gets silently wiped on every sync/refresh/restore.
- **`isEmptyState()` must check ALL collection fields**: When adding new collection fields to any app, also add them to `isEmptyState()` — otherwise Guard C silently blocks saves when ONLY those fields have data.
- **Array merge with `||` loses data**: `data.arr || local.arr || []` — if remote has empty `[]` (truthy), local data is lost. Use dedicated merge functions for arrays (dedup + concat).
- **Fallback timers fire during PIN prompt OR Firebase load = data wipe**: DOMContentLoaded 3s/6s fallback timers must check BOTH `awaitingPinEntry` AND `awaitingFirebaseLoad` flags. After PIN entry, `awaitingPinEntry` clears but Firebase hasn't responded yet — timers fire, set all flags with defaults, `initUI()` auto-saves defaults with fresh timestamp, then `finishFirebaseLoad()` loads poisoned localStorage, skips merge ("local is newer"), keeps defaults. Fixed Mar 22 2026: `awaitingFirebaseLoad` flag (set in `loadFromFirebase()`, cleared in `finishFirebaseLoad()`) gates all 3 timers. 15s safety valve timeout prevents permanent hang.
- **Default grades bypass Guard C**: Default `getDefaultRoadmapData()` must have EMPTY grade objects (`oralmed: {}`, not `oralmed: { quiz1: 100 }`). Non-empty defaults make `isEmptyState()` return false, allowing default state to pass Guard C and be saved to Firebase. Fixed Mar 22 2026.
- **Default grades make isEmptyState() return false**: Default `roadmapData` has hardcoded grades (oralmed quiz1:100, peds exam1:77, etc.). These pass Guard C, allowing default state to be saved. Never add real data values to `getDefaultRoadmapData()` — use empty objects.
- **Procedure→competency linking**: `recordProcedure()` auto-creates `completionEntries[]` on competency items. `deleteProcedure()` calls `unlinkProcedureFromCompetencies()` to remove entries and adjust counts. Always use these functions, never manually edit `item.completed` for procedure-linked items.
- **Smart counting vs narrow counting**: Mission Control uses `getSmartAppointmentCount()` and `getSmartProcedureCount()` (in state.js) which aggregate from ALL data sources. NEVER replace these with narrow `getValues(appointments).filter(completed)` — that was the original bug (showed 0/90 despite real data existing).
- **Evidence trail on manual adjustments**: `adjustCompItem()` and `setCompItemStatus()` auto-create `completionEntries[]` for manual changes. Do NOT remove this — the smart procedure counter depends on deduping manual entries vs procedure-linked entries.
- **Backfill creates checkpoint**: `backfillClinicalData()` calls `createCheckpoint('pre-backfill')` before mutations. Always preserve this safety net.
- **Import auto-completes past appointments**: `confirmClinicalImport()` AND `confirmPatientImport()` both set `status: 'completed'` for appointments with dates before today. Do NOT revert to always `'scheduled'`.
- **SPS dashboard is ground truth**: `getSmartAppointmentCount()` and `getSmartProcedureCount()` use `MAX(computed, dashboardSnapshots[0])`. The SPS snapshot from the school system is the authoritative floor. Never remove this floor logic.
- **Unified import handles appointments**: `parsePatientImportText()` in patients.js now detects PATIENT:/CHART:/DATE: blocks and creates appointments. The user pastes ONE combined text (SPS_DASHBOARD_UPDATE + APPOINTMENTS) into the patient import modal and everything syncs globally.
- **Missing Notes tracker**: `MISSING_NOTES` block type parsed by `parseMissingNotesBlock()` in patients.js. 7 pipe-delimited fields: id|date|patient|chart|faculty|session|location. Dedup by ID. Dashboard shows capacity bar (6 limit), faculty cross-reference with upcoming appointments. `missingNotes{}` stored under `clinicalData`.
- **To-Do list system**: `TODO_LIST` block type parsed by `parseTodoListBlock()` in patients.js. 5 pipe-delimited fields: id|description|source|dateAdded|sourceDetail. Sources: MANUAL/EMAIL/SCREENSHOT/CLINIC/SYSTEM. Dedup by ID. Dashboard has inline quick-add. `todoList{ items{}, _nextSeq, lastUpdated }` stored at top level.
- **9 import block types**: PATIENT_RECORD, PATIENT_UPDATE, REQUIREMENTS_MATCH, REQUIREMENTS_STATUS, SPS_DASHBOARD_UPDATE, APPOINTMENTS, MISSING_NOTES, TODO_LIST, CLINICAL_BRIEF — all parseable in one atomic paste.
- **Clinical Brief full-overwrite**: CLINICAL_BRIEF always overwrites entirely — never merge old fields into new. Push old to `briefHistory[]` (max 3) before overwriting. `clinicalBrief` and `briefHistory` live ON patient records (nested in `patientRecords[id]`), not as separate collections.
- **Perio noise filter**: Routine perio IDs (prophy, recall, gingivitis re-eval, OHI) are EXCLUDED from requirement matching for non-periodontitis patients. Only SRP/calculus/surgical perio IDs appear for periodontitis patients. One-time migration `migratePerioNoiseCleanup()` strips existing noise (gated by `perioNoiseCleanupDone_v1` localStorage flag).
- **Multi-line parser is lenient**: `parsePatientRecord()` and `parsePatientUpdate()` accept ANY non-empty line that doesn't start with a known field key as a continuation of the current field. 2+ space indentation is recommended but NOT required. Fixed Mar 22 2026 — old parser required `^\s{2,}` which silently dropped text when copy-pasted from markdown-rendered Claude webchat output.
- **Imported requirements on patient**: REQUIREMENTS_MATCH `canFulfill` entries are stored as `patient.importedRequirements[]`. `computeRequirementMatches()` uses these (authoritative) instead of keyword fallback when available. Also stores `patient.priorityNotes` and `patient.highValue` from the REQUIREMENTS_MATCH block.
- **Webchat exports MUST use code fences**: Claude webchat project instructions require all export blocks be wrapped in triple-backtick code fences. Without this, markdown rendering destroys `---` delimiters (renders as `<hr>`) and strips leading spaces, causing parser truncation. Webchat instructions backup: `docs/claude-webchat-project-instructions.md`.
- **Patients tab light theme**: Uses `#tab-patients` CSS specificity prefix to override dark base styles without removing them. New classes: `.ptr-summary-card`, `.ptr-priority-card`, `.ptr-imaging-chips`, `.ptr-perio-row`. Section IDs (`'info'`, `'clinical'`, `'perio'`, `'treatment'`, `'imaging'`, `'notes'`, `'priority'`) must stay unchanged for `collapsedSections` state.
- **Patients tab mobile**: `@media (max-width: 768px)` hides `#dashboardMetricsCard` and `#patientsCountdownRadar` on patients tab. Summary card uses 3-column grid for visit dates. Sidebar goes `position: static` on mobile. `overflow: visible` on `#patientsMainLayout` required for sticky sidebar on desktop.
- **CSS-only tab theming pattern**: To theme a single tab differently, use `#tab-[name] .existing-class` specificity override. Additive — old dark styles remain as fallback for other contexts. Don't delete base styles.
- **Mini Review tab**: Read-only tab (`#tab-minireview`) showing all patients summarized. `renderMiniReview()` in patients.js, called on tab switch. Uses `getAllPatientRecords()` + `getNextScheduledVisit()`. Sorted by reliability (green→yellow→red), then alphabetical. Shows: reliability dot, name, chart#, HIGH VALUE badge, last/next visit, clinical brief snapshot, tx completed by me, treatment plan. No state mutation, no saves.
- **`formatClinicalDisplay()` shared formatter**: Pure display function in patients.js. Takes raw text, escapes it, adds line breaks before Phase/URGENT/SHORT-TERM/MEDIUM-TERM/LONG-TERM headers, sentence breaks for non-sectioned text, color-codes tooth numbers (`fc-tooth`), costs (`fc-green`), section headers (`fc-teal`/`fc-red`/`fc-blue`/`fc-purple`), HIGH VALUE (`fc-hv`). Used by both Mini Review tab and Patients tab Clinical Brief. Zero content change — pure visual formatting. CSS classes prefixed `fc-*`.
- **No saveData() in render paths**: Render functions (called from `initPeriodicReview()`, `renderDashboard()`, etc.) must NEVER call `saveData()` — side-effects during render can fire before sync guards are set. Pre-populate defaults in a separate function, save from the caller with `hasLoadedFromCloud && !awaitingFirebaseLoad` guards.
- **No state mutation in render paths**: `renderDashboard()` must NOT write back to `roadmapData` (e.g., `clinicHeadlines.completed = smartApts.total`). Use local variables for computed values. Mutation during render causes disk/memory divergence. Fixed Mar 22 2026.
- **`getCompetenciesData()` is read-only**: Returns `roadmapData.clinicalData?.competencies || {}` with NO side-effects. Initialization/migration lives in `ensureCompetenciesInitialized()` — called from `initUI()` and `initClinicalTab()`, NEVER from render paths. Fixed Mar 22 2026.
- **Partial re-renders for dashboard sections**: `rerenderMissingNotesSection()` and `rerenderTodoListSection()` (init.js) update ONLY their section's container div. Use these instead of full `renderDashboard()` for todo/note status changes — preserves scroll position, `<details>` open state, and input focus. Callers in state.js use `typeof` guard for backward compatibility.
- **`mergeRemoteCollectionsIntoLocal` fill-only trap**: Objects that exist in defaults (clinicHeadlines, graduationPrep) need field-level merge, NOT fill-only `!roadmapData.X` guard (which never fires because defaults always provide the object). Fixed Mar 22 2026: clinicHeadlines targets merge when local has defaults (90/116), graduationPrep fills empty scalars + addMissing for sub-objects.
- **`restoreBackup()` must use field-by-field reconstruction**: Same pattern as `restoreCheckpoint()` — merge backup.data with `getDefaultRoadmapData()` defaults so newer fields get defaults even if the backup predates them. Raw `roadmapData = backup.data` wipes fields added after backup date. Fixed Mar 22 2026.
- **Smart counter validation**: `getSmartAppointmentCount()` must validate `clinic_` task IDs against actual `appointments` object before counting — phantom IDs inflate the count. Patient visit dedup uses AND (not OR) for name+chartNumber matching. Fixed Mar 22 2026.
- **Procedure count dedup**: `getSmartProcedureCount()` only deducts `completionEntries` with a valid `procedureId` (not null). Entries with `procedureId: null` are manual/backfill entries that should count as manual adjustments, not deductions. Without this, interrupted backfills cause undercounting. Fixed Mar 22 2026.
- **Faculty matching word boundaries**: `getMissingNotesFacultyMatches()` uses `\b` word-boundary regex for faculty names >= 3 chars; exact field match only for names < 3 chars. Prevents "Li" matching "scaling", "Kim" matching "smoking". Fixed Mar 22 2026.
- **Backfill checkpoint dedup**: `backfillClinicalData()` checks if a `pre-backfill` checkpoint exists within 60s before creating another. Prevents repeated clicks from filling localStorage with identical checkpoints. Fixed Mar 22 2026.
- **TBD deadlines on dashboard**: Deadlines with no date or `tbd: true` now show in a separate "Unscheduled" card on Mission Control instead of silently vanishing from all 3 deadline windows. Fixed Mar 22 2026.
- **mergeRemoteCollectionsIntoLocal must cover ALL top-level objects**: When adding new top-level state objects (like `periodicReviews`, `clinicHeadlines`), they must be added to `mergeRemoteCollectionsIntoLocal()` in firebase-sync.js — not just the other 3 merge/restore sites. Without this, the local-is-newer sync path silently drops remote-only entries from other devices.
- **isEmptyState() must check ALL user-editable fields**: `hasPeriodicReview` must check all 9 PR2 fields (not just subjectiveReport/departmentNotes/completedProceduresHtml). Missing checks cause Guard C to block Firebase saves when only those fields have data.
- **SPS snapshot is ground truth for admin stats**: PR tab "Attended" row and talking points must use `snapshot.appointments.attended` (from SPS import), not `getSmartAppointmentCount().total` which aggregates from multiple sources and inflates the number.
- **Double-fire guard on click-to-edit patterns**: When using `change` + `blur` event pairs on inline editors (date pickers, number inputs), always use a `committed` boolean guard flag to prevent the commit function from firing twice. Escape must also set the flag to prevent blur from saving the unwanted value.
- **Import parser fieldMap must match PR writeup fields**: `parsePatientRecord()`/`parsePatientUpdate()` fieldMaps must include ALL fields displayed in `renderPRPatientWriteups()`. Missing: `ALLERGIES`, `TX_COMPLETED_BY_ME`, `RECALL_HISTORY`, `ACTIVE_STATUS` (fixed commit `c5d4578`).
- **Skeleton patient records need core fields**: `prSavePatientField()` creates skeleton records — must copy `name` and `chartNumber` from `clinicalData.patients` to prevent blank roster rows.
- **PR roster must merge both patient stores**: Sections 10/11 must merge `patientRecords` AND `clinicalData.patients` — some patients exist only in `patients{}` (from clinical tab) and not yet in `patientRecords{}` (from import).
- **CRUD must merge, not replace**: `savePatient()` and `saveAppointment()` in clinical.js MUST spread existing record first (`{ ...existing, ...formFields }`) — full replacement wipes `clinicalBrief`, `importedRequirements`, `briefHistory`, `completedAt`, `clinicalAppointmentId`. Fixed Mar 22 2026.
- **DEFAULT_COMPETENCIES must have `completed: 0`**: Non-zero defaults bypass Guard C (isEmptyState returns false for defaults). All 20 non-zero values zeroed in commit `bc68e4e`. Never add non-zero `completed` to DEFAULT_COMPETENCIES.
- **deletePatient() must cascade**: Deleting a patient must also: (1) delete procedure records referencing patient, (2) unlink competency evidence entries, (3) remove clinic planner tasks, (4) add appointment IDs to `hiddenClinicTasks`, (5) set `clinicalDataDirty = true`. Fixed Mar 22 2026.
- **`completionEntries` Firebase array safety**: Firebase can convert arrays to objects. ALL access to `item.completionEntries` MUST use `getValues()` for reads and `if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries)` before mutations (`.push()`, `.splice()`, `.filter()` assignment). 11 sites fixed in commit `bc68e4e`.
- **`buildCurrentWeekSchedule()` propagation**: Must be called after ANY appointment CRUD (save, delete, complete, uncomplete) and planner task changes (save, hide, unhide). Stim Calc reads `currentWeekSchedule` via Firebase — stale data means wrong "Week at a Glance".
- **`rebuildUpcomingDeadlines()` propagation**: Must be called after ANY deadline mutation (add, edit date, complete, delete). Lives in deadlines.js. Stim Calc reads `upcomingDeadlines` via Firebase.
- **`uncompleteAppointment()` must clean up**: Must remove procedure records created during completion (`appointmentId === aptId`), unlink competency evidence, and recalculate patient `lastVisit` from remaining completed appointments.
- **`importBackup()` must use field-by-field reconstruction**: Same pattern as `restoreBackup()` — merge imported data with `getDefaultRoadmapData()` defaults. Raw `roadmapData = imported.data` wipes fields added after backup date. Fixed Mar 22 2026.
- **`isEmptyState()` must check `graduationPrep`**: Data in externship/CDCA/INBDE/jobSearch fields alone must not be treated as empty. `hasGraduationPrep` check added in commit `bc68e4e`.
- **Guard F must validate `periodicReviews`, `competencies`, `missingNotes`**: These 3 fields were missing from `validateStateIntegrity()`. Corrupted values now rejected. Fixed Mar 22 2026.
- **`applyRequirementCheckoffs` isDelta pattern**: COMPLETED_TODAY items use `isDelta: true` to INCREMENT competency counts. REQUIREMENTS_STATUS items SET absolutely. Without `isDelta`, importing one completed procedure could DROP count from 3 to 1.
- **Parser continuation lines use `\n`**: `parsePatientRecord()` and `parsePatientUpdate()` join continuation lines with `'\n'` (not `' '`). Matches `parseClinicalBrief` behavior. Preserves multi-line notes formatting.
- **Patients sidebar must merge both stores**: `renderPatientsSidebar()` uses `getAllPatientRecords()` (patients.js) which merges `patientRecords` + `clinicalData.patients`. Patients created via Clinical tab only exist in `clinicalData.patients` — without merge they're invisible in the sidebar. Fixed Mar 22 2026.
- **`getAllPatientRecords()` dedup by chart number + name**: Merge deduplicates by chart number first (case-exact), then by name (case-insensitive) for chartless patients. When a `clinicalData.patients` entry matches an existing `patientRecords` entry by chart number, fields are fill-merged (missing fields copied, existing fields preserved). Prevents duplicate sidebar rows from different ID schemes (`pt_` vs `pt-` vs `patient_`). `renderPatientRecord()`, `savePatientField()`, and `setPatientReliability()` all use `getAllPatientRecords()` (not `getPatientRecords()`) so clinical-only patients render and edit correctly. Data-layer consolidation deferred — read-side dedup is sufficient. Fixed Mar 22 2026.
- **`deletePatientRecord()` must cascade like `deletePatient()`**: Deleting from Patients tab must also: delete from `clinicalData.patients`, delete appointments, delete procedure records + unlink competencies, hide planner tasks, set `clinicalDataDirty = true`. Fixed Mar 22 2026.
- **Requirement ID matching is case-insensitive**: `applyRequirementCheckoffs()` compares `(id).toLowerCase() === (reqId).toLowerCase()`. Webchat may emit mixed-case IDs. `parseRequirementsMatch()` also lowercases reqId at parse time. Fixed Mar 22 2026.
- **Dashboard snapshot dedup by capturedAt**: `saveDashboardSnapshot()` checks for existing snapshot with same `capturedAt` date — replaces it instead of duplicating. Prevents bloat from same-day re-imports. Fixed Mar 22 2026.
- **`adjustCompItem()` must call `renderDashboard()`**: Without this, Mission Control stats stay stale until tab switch after competency adjustments. Fixed Mar 22 2026.
- **`backfillClinicalData()` running guard**: `_backfillInProgress` flag prevents concurrent/duplicate backfill runs. Whitespace-only patient names skipped in Phase 4 linking. Fixed Mar 22 2026.
- **Contenteditable double-fire guard pattern**: All `contenteditable` fields in patients.js use `onfocus` to store original value, `onkeydown` for Escape revert + committed flag, `onblur` checks committed flag before saving via `savePatientField()`. Prevents double save on Escape+blur.
- **`mergeCompetencies()` is item-level, not category-level**: state.js deep-merges at the item level: `completionEntries` are unioned (dedup by procedureId for linked, date+note for manual), `completed = Math.min(required, max(local, cloud, entries.length))`, status derived from count. NEVER use `{ ...local, ...cloud }` category spread — it destroys local evidence trails. Used by all 4 merge/restore sites + `mergeRemoteCollectionsIntoLocal()`.
- **`applyRequirementCheckoffs` must cache intendedCompleted**: `recordProcedure()` → `linkProcedureToCompetencies()` unconditionally overwrites `item.completed = Math.min(required, completionEntries.length)`. When REQUIREMENTS_STATUS sets `completed: N` directly, cache the value BEFORE `recordProcedure()`, re-apply AFTER. Without this, explicit counts from SPS data get silently reduced to 1.
- **`deleteAppointment()` must cascade to procedures + hidden tasks**: Deleting an appointment must: (1) unlink + delete procedure records with matching `appointmentId`, (2) add `clinic_` task to `hiddenClinicTasks`, (3) set `clinicalDataDirty = true`. Without cascade, orphaned procedures inflate smart counters permanently. Fixed Mar 22 2026.
- **`clinicalDataDirty = true` before ALL clinical CRUD saveData()**: 10 functions must set this flag before save: `savePatient`, `saveAppointment`, `deleteAppointment`, `completeAppointment`, `uncompleteAppointment`, `deleteProcedure`, `backfillClinicalData`, `saveProcedureRecord`, `confirmPatientImport`, `confirmClinicalImport`. Without it, switching to Schedule tab skips `syncClinicalToMonthlyPlanner()` — new appointments don't get clinic tasks. Fixed Mar 22 2026.
- **Dual import paths must mirror propagation**: Both `confirmClinicalImport()` (import-system.js) and `confirmPatientImport()` (patients.js) create appointments. Both MUST call `syncClinicalToMonthlyPlanner()` + `buildCurrentWeekSchedule()` + `mpRenderAllCalendars()` after import. Missing any call causes Schedule tab or Stim Calc cross-app to show stale data. Fixed Mar 25 2026.
- **Import modal destructive defaults**: NEVER set `checked` on destructive-mode checkboxes (like Refresh Mode) in import modals. Default must be the safe/merge path. Users who want destructive replace can opt in.
- **`mergeRemoteCollectionsIntoLocal` must deep-merge patientRecords fields**: After `addMissing()` fills new-key patient records, existing patients need field-level merge for: `importedRequirements`, `priorityNotes`, `highValue`, `allergies`, `txCompletedByMe`, `recallHistory`, `activeStatus`. Without this, fields added on one device are lost when syncing to a device that already has the patient. Fixed Mar 22 2026.
- **`setCompItemStatus` toggle must resync completed from entries**: When toggling to pending, procedure-linked `completionEntries` are kept but `item.completed` was hard-set to 0 — out of sync with remaining entries. Fix: after filtering entries to keep only procedure-linked, resync `item.completed = Math.min(required, entries.length)` and derive status from count. Prevents phantom 0-progress state when procedures are linked.
- **`calculatePaceProjection` uses Math.floor for elapsed days**: `daysSoFar` must use `Math.floor` (not `Math.ceil`) for accurate rate calculation. `Math.ceil` inflates elapsed days by 1, reducing computed pace and shifting projected completion date forward.
- **PATIENT_UPDATE must validate chart number**: `confirmPatientImport()` PATIENT_UPDATE path must reject empty chart numbers with error toast. Without this, empty chart creates ID `'pt_'` which overwrites other chartless patients.
- **Smart counter name dedup is case-insensitive**: `getSmartAppointmentCount()` Source 3 compares patient names using `toLowerCase().trim()`. Without this, "Silva, Maria" and "silva, maria" double-count. Fixed Mar 22 2026.
- **DEFAULT_PATIENT_RECORDS chart numbers must match canonical leading-zero form**: `pt_966540` with chart `966540` caused duplicate because imports created `pt_0966540` with chart `0966540`. Fixed Mar 25 2026: default changed to `pt_0966540`/`0966540`.
- **`getPatientRecords()` fill-merge must use normalized chart matching**: Exact ID check (`!existing[id]`) misses leading-zero variants. Fixed Mar 25 2026: builds `existingNormCharts` index and checks `normalizeChartNumber()` before adding defaults.
- **`periodic-review.js` PR1_BASELINE chart numbers must include leading zeros**: `966540` and `79118` should be `0966540` and `079118`. Without leading zeros, PR roster matching creates phantom entries. Fixed Mar 25 2026.
- **`migrateLeadingZeroDedup()` one-time migration**: Consolidates duplicate patient records caused by leading-zero chart mismatch. Keeps the record with the longer chart number (with leading zero), fill-merges fields from the shorter one, deletes from both `patientRecords` and `clinicalData.patients`. Gated by `leadingZeroDedupDone_v1` localStorage flag. Added Mar 25 2026.
- **`addNewPatientRecord()` must use `findByNormalizedChart()` for dedup**: Exact ID match `records['pt_' + chart]` misses existing records with different leading-zero variants. Fixed Mar 25 2026.

---

## PROJECT OVERVIEW

| File | Purpose |
|------|---------|
| `index.html` + `js/dental-quest/*.js` (12 modules) | Main app: gamified task management, focus mode, financials, calendar, meds |
| `d3-roadmap.html` (REDIRECT SHIM) | Redirects to graduation-roadmap.html with localStorage migration. `js/d3-roadmap/` deleted (commit `6b64461`). |
| `graduation-roadmap.html` + `js/graduation-roadmap/*.js` (12 modules) | Graduation tracker: mission control, deadlines, clinical, patients (19 pre-filled), competencies, schedule, academics, grad prep, **periodic review**. Patient tracker imports from Claude webchat (8 formats). Own namespace: `graduationRoadmapData` / `graduationRoadmap`. |
| `stimulant-elimination-calculator.html` + `js/stimcalc/*.js` (12 modules) | Sleep prediction: pharmacokinetics, circadian rhythm, workout planning |
| `body-comp-tracker.html` (~22,444 lines, single file) | Calorie/protein/workout tracking, cross-app ecosystem, V3 analytics |
| `lecture-prompt-transformer.html` (~2,800 lines) | Lecture notes prompt builder (standalone) |

- **Brand**: "SULEMAN SHAIKH, DMD" (page titles, sidebar, mobile header). localStorage keys still use `dentalQuest*` prefix.
- **URL**: suleman7-dmd.github.io/dental-quest/ | **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: No build system. Push to `main` → live in ~30s.

### Per-App Detail → Skill Files
Each app has a dedicated skill file with full architecture, module maps, bootstrap sequences, key locations, and app-specific patterns. **Use the Skill tool** to load them:

| Skill | Covers |
|-------|--------|
| `dental-quest-dev` | index.html: 12 JS modules, urgency system, command center, task fields, views, financials |
| `d3-roadmap-dev` | HISTORICAL: old d3-roadmap architecture (deleted Mar 21 2026). Use for migration debugging only. |
| `stim-calc-dev` | stim-calc: 11 JS modules, pharmacokinetics, circadian, sleep prediction, warm theme |
| `body-comp-dev` | body-comp: single file, key JS locations, mode system, ecosystem, analytics |
| `sully-firebase-patterns` | Cross-app: save guards, sync flags, checkpoints, PIN auth, data flow |

---

## FIREBASE (CRITICAL - DON'T CHANGE)

### Config
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};
```

### PIN Auth
```javascript
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
userPath = 'users/' + hashedPin + '/[appName]';
// appName = 'appData' | 'stimulantCalculator' | 'graduationRoadmap' | 'bodyCompTracker'
// NOTE: d3Roadmap is the OLD path (dead). graduation-roadmap.html uses 'graduationRoadmap' with one-time migration.
```

### Firebase Data Tree
```
users/user_[hashedPin]/
├── appData/                    (index.html)
│   ├── tasks{}, stats{}, medications{ 30mg{}, 20mg{} }
│   ├── calendarNotes{}, calendarEvents{}, notebook{ pages{}, currentPageId }
│   ├── financials{ masterLiquidity{}, expenseTemplate{}, months{}, oneTimeBills{}, creditCards[], actionItems[] }
│   ├── pillAssignments{}, dailyPlanner{}
│   ├── focusModeData{ oneThingId, todaysTasks, microSteps{} }
│   ├── commandCenterData{ crashOut{}, focusStats{}, currentSession{} }
│   └── lastCriticalEODReset
├── stimulantCalculator/
│   ├── state{ wakeTime, hoursSleptLastNight, medications{}, caffeine{}, allNighterMode,
│   │     modifiers{}, nicotine{}, workoutPlan{}, settings{}, history{}, sleepHistory{},
│   │     projectedSleepTime, _version: 0, _dataLoaded }
│   └── lastUpdated
├── graduationRoadmap/          (graduation-roadmap.html — NEW path, migrated from d3Roadmap)
│   ├── grades{}, editedDeadlines{}, customDeadlines{}, deletedDeadlines{}, completedDeadlines{}
│   ├── examStudyProgress{}, exams{}, mandatoryItems{}, pedsLockedIn
│   ├── monthlyPlanner{ notes{}, customTasks{}, overriddenStatic{}, completedTasks{}, hiddenClinicTasks{}, currentWeekSchedule{} }
│   ├── upcomingDeadlines{} (cross-app: all upcoming deadlines for Stim Calc)
│   ├── clinicalData{ patients{}, appointments{}, completedProcedures{}, competencies{}, patientRecords{}, dashboardSnapshots[], missingNotes{} }
│   ├── todoList{ items{}, _nextSeq, lastUpdated }
│   ├── graduationPrep{ externship{}, cdcaAdex{}, inbde{}, jobSearch{} }
│   ├── clinicHeadlines{ appointments{}, procedures{} }
│   ├── periodicReviews{ pr2{ reviewDate, reviewPeriod, dashboardDiscrepancyNotes, adminStatsOverrides{}, completedProceduresHtml, inProgressProcedures{}, departmentNotes{}, subjectiveReport, patientNotes{}, removedPatients{}, lastEdited } }
│   ├── dailyPlanner{}, lastSaved, _version: 0, _dataLoaded
│   └── (Body Comp reads exams{} and monthlyPlanner{})
├── d3Roadmap/                  (DEAD — old path, kept for migration fallback only)
└── bodyCompTracker/
    └── state{ profile{}, settings{}, today{ date, meals{}, workouts{}, targets{}, mode, setupComplete... },
         frequentFoods{}, weighIns{}, bodyCompHistory{}, dailyLogs{}, refeedTracker{},
         gamification{}, achievements{}, ecosystemContext{} (READ-ONLY, stripped on save),
         _version: 0, _dataLoaded }
```

### Sync Pattern (All 4 Apps)
```
Load:  loadFromFirebase() → merge with defaults → initUI()
       If local newer: mergeRemoteCollectionsIntoLocal(data) → initUI() → deferred saveData() pushes to Firebase
       If Firebase empty/poisoned: loadFromLocalStorage() → push if real data exists
Save:  saveData/saveState() → localStorage IMMEDIATELY → Firebase debounced (2s)
Hide:  save immediately | Show: refresh from Firebase
Status: green connected | syncing | red offline | warning error
```

### Collection Safety
All collections use **objects with ID keys** (not arrays — Firebase corrupts sparse arrays):
```javascript
generateId(prefix)    // 'meal_abc123', 'task_xyz789'
getValues(collection) // Safe object→array (handles undefined/arrays/objects)
getCount(collection)  // Safe key count
```

### Cross-App Data Flow
```
Stim Calc --> projectedSleepTime, meds, caffeine --> Body Comp ecosystemContext.stimulant
Index.html --> medications (pill counts) --> Body Comp ecosystemContext.inventory
Index.html --> medications (pill counts) --> Stim Calc inventory module (shared read/write)
Index.html --> tasks (doToday flag) --> Graduation Roadmap "Do Today" widget (realtime listener)
Graduation Roadmap --> exams, monthlyPlanner --> Body Comp ecosystemContext.academic + schedule (via /graduationRoadmap/)
Graduation Roadmap --> monthlyPlanner/currentWeekSchedule --> Stim Calc "Week at a Glance" schedule (via /graduationRoadmap/)
Graduation Roadmap --> monthlyPlanner/customTasks, clinicalData/appointments --> Stim Calc "Week at a Glance" (fallback)
Graduation Roadmap --> upcomingDeadlines --> Stim Calc "Week at a Glance" Upcoming Deadlines (realtime, capped 15, Xd badges)
```
All cross-app reads are READ-ONLY. Lecture Prompt is standalone.

---

## SYNC PROTECTION SYSTEM (CRITICAL)

### Standard Save Guard Pattern (All 4 Apps)
```javascript
if (!pinValidated) return false;
if (isInitialLoad) return false;
if (!hasLoadedFromCloud) return false;
if (isEmptyState(data)) return false;
if (!data._dataLoaded) return false;
// Guard F (graduation-roadmap only): validateStateIntegrity() — blocks save if critical fields missing
// ALSO: awaitingPinEntry flag gates DOMContentLoaded 3s/6s fallback timers (graduation-roadmap only)
```
Index.html: 5 guards behind `firebaseInitialized` check, uses `buildSaveData()` helper.
Graduation-roadmap: 6 guards — adds `validateStateIntegrity()` (Guard F) checking 8 critical structures.

### isEmptyState() Checks
| App | Empty If Missing ALL Of |
|-----|------------------------|
| index.html | tasks, calendarNotes, calendarEvents, notebook.pages, stats.totalXPGained, focusModeData, commandCenterData |
| d3-roadmap | customDeadlines, customTasks, appointments, blocks, notes, patients, completedDeadlines, examStudyProgress, grades, exams, editedDeadlines, patientRecords, dashboardSnapshots, completedProcedures, competencies, missingNotes, todoList.items |
| stim-calc | medications, caffeine, history, sleepHistory, allNighterMode, _dataLoaded |
| body-comp | weighIns, today.meals, today.workouts, dailyLogs, bodyCompHistory, today.setupComplete |

### Checkpoint System (All 4 Apps)
Functions: `createCheckpoint()`, `showCheckpointManager()`, `restoreCheckpoint()`, `exportCheckpoint()`, `exportAllCheckpoints()`, `importCheckpoint()`, `importAndRestoreDirectly()`
Force sync: `forceUploadToCloud()`, `forcePullFromCloud()`
Import accepts 6 flexible formats.

---

## SULLY CONTEXT

- **D3 dental student** at BU Goldman, graduating May 2027. ADHD: Adderall XR 50mg max (30mg+20mg).
- **Physical**: 5'8.5", 190 lbs, goal 170 by June 1 2026, ~27% body fat.
- **Key dates**: Perio 2 Final Mar 11, PC2 Final Mar 19, Peds Exam 3 Mar 30, May 14 loan disbursement.

---

## THINGS NOT TO CHANGE WITHOUT TESTING
Firebase config, PIN auth, save/sync debounce, grade calculator math, XR pharmacokinetic model, date parsing, sync protection guards, `isEmptyState()`, checkpoint system.
