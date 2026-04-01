# CLAUDE.md - Dental Student Quest

## CRITICAL RULES

### Development Philosophy (ALWAYS APPLY)
- **Never assume constraints.** Do not pre-compromise features, scope, or ambition based on assumptions about the user's time, skill, or resources. The user has AI-augmented development velocity — what human estimates call "a month of work" completes in a day or less.
- **No time estimates.** Never estimate how long something will take. All estimates are based on obsolete human velocity data. Just describe the work.
- **Vision before scope.** When the user describes a new feature or enhancement, explore the ideal unconstrained version FIRST. Only scope down when the user explicitly asks. Never suggest "a simpler approach" unprompted.
- **Match the user's ambition.** This codebase has 22k-line apps, 12-module architectures, cross-app Firebase sync with 6 guards, pharmacokinetic models, and clinical import systems with 9 block types. The user handles enterprise-grade complexity daily. Don't patronize with "start small" or "keep it simple."
- **No hedging.** Never say "realistically," "given your constraints," "that's ambitious but," or "a good MVP would be." Present the full vision. The user is an adult who will scope for themselves.
- **"Dream big" trigger.** When the user says "dream big" (or any vision-first trigger phrase) -> invoke the `vision-first` skill for the full unconstrained vision workflow before any planning or implementation.

### Never Rebuild Entire Files
- Body-comp is ~22,444 lines. Use surgical `Edit` tool only. Read section first.
- **Split apps** (index.html: 12 modules, graduation-roadmap: 12 modules, stim-calc: 11 modules) — use surgical edits on individual JS module files. NOTE: `js/d3-roadmap/` was deleted; modules are in `js/graduation-roadmap/`.

### Date Parsing (COMMON BUG)
```javascript
// WRONG: new Date('2026-02-02')  — off-by-one in EST
// CORRECT:
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```
- Never use `.toISOString().slice(0,10)` — use `getLocalDateString(date)`.
- `calculatePaceProjection`: `daysSoFar` must use `Math.floor` (not `Math.ceil`).

---

## COMMON BUG PATTERNS

### JS Language Traps
- **Empty array truthy**: `[] || defaults` → `[]`. Check `.length` not truthiness.
- **`||` vs `??`**: `|| default` treats 0/false as falsy. Use `?? default` for numeric/boolean fields (includes `done`/`grade`).
- **Circular calculations**: A computed value must never fall back to itself as input.
- **Wrong field names**: Verify against `getDefaultState()` or `state.js` defaults (e.g., `goalWeight_lbs` not `goalWeight`).
- **onclick string IDs**: `onclick="fn('${taskId}')"` not `onclick="fn(${taskId})"`.
- **XSS in innerHTML**: ALL user text MUST use `escapeHtml()` in innerHTML.
- **`completedTasks` object wrapper**: `getValues(completedTasks)` returns `[{id, value, completedAt}, ...]` not strings. NEVER use `.includes(String(taskId))`. Use `.some(function(c) { return (c.value || c) === String(taskId); })`.

### Firebase Save Safety
- **`undefined` kills saves**: Firebase rejects `undefined` in `.set()` — use `?? null` or `?? false`. `buildSaveData()` must use `?? null`/`?? false` for ALL optional fields. One `undefined` crashes ALL saves silently.
- **`_version: Date.now()`**: Causes data wipe. Must be 0 in defaults.
- **CRUD localStorage safety**: ALL CRUD functions MUST call `safeLocalStorageSet()` BEFORE `saveData()`.
- **No `saveData()` in render paths**: Render functions must NEVER call `saveData()`. Pre-populate defaults separately; save from caller with `hasLoadedFromCloud && !awaitingFirebaseLoad` guards.
- **No state mutation in render paths**: `renderDashboard()` must NOT write back to `roadmapData`. Use local variables for computed values.
- **`initUI` auto-save guards**: Both `setTimeout(() => saveData(), 100)` and `setTimeout(() => saveData(), 2000)` in initUI MUST check `hasLoadedFromCloud && !awaitingFirebaseLoad`.
- **Double `loadData()`**: Causes race conditions. Verify orphan function calls exist before calling.
- **Failsafe timer**: Must set `hasLoadedFromCloud = true` + `markInitialLoadComplete()`.
- **`clinicalDataDirty = true` before ALL clinical CRUD**: 28 functions must set this. Original 10: `savePatient`, `saveAppointment`, `deleteAppointment`, `completeAppointment`, `uncompleteAppointment`, `deleteProcedure`, `backfillClinicalData`, `saveProcedureRecord`, `confirmPatientImport`, `confirmClinicalImport`. Plus 18 more: `savePatientField`, `setPatientReliability`, `addNewPatientRecord`, `deletePatientRecord`, `recordProcedure`, `adjustCompItem`, `setCompItemStatus`, `deleteCompItem`, `saveCompItem`, `acceptReviewSuggestion`, `rejectReviewSuggestion`, `dismissReviewItem`, `removeEvidenceEntry`, `undoRemoveEvidence`, `updateCompNotes`, `saveCompItemNote`, `resetCompetencies`, `prSavePatientField`.
- **Fallback timers = data wipe**: DOMContentLoaded 3s/6s fallback timers must check BOTH `awaitingPinEntry` AND `awaitingFirebaseLoad` flags. 15s safety valve prevents permanent hang.
- **Guard F**: `validateStateIntegrity()` must validate `periodicReviews`, `competencies`, `missingNotes`.
- **`completionEntries` array safety**: Firebase can convert arrays to objects. ALL access MUST use `getValues()` for reads and convert to array before mutations (`.push()`, `.splice()`, `.filter()` assignment).

### Sync & Merge Rules
- **`mergeRemoteState`**: Compare `lastSaved` timestamps — if local is newer, call `mergeRemoteCollectionsIntoLocal(data)` (NOT skip entirely). Adds remote-only entries without overwriting local.
- **`mergeRemoteState` deep merge**: `patientRecords` must use per-patient field-level IIFE merge (local wins for existing patients, remote fills gaps). NEVER flat spread `{ ...local, ...remote }`. Same applies to `todoList.items` (local wins on conflict), `graduationPrep` (fall back to local before defaults), `clinicHeadlines` (fall back to local before defaults).
- **`mergeRemoteCollectionsIntoLocal`**: (1) Pattern: `addMissing(local, remote)` — local wins for conflicts. (2) Must cover ALL top-level objects (add new ones like `periodicReviews`, `clinicHeadlines`). (3) Fill-only trap: defaults-provided objects (clinicHeadlines, graduationPrep) need field-level merge, not `!roadmapData.X` guard. (4) Must deep-merge patientRecords fields: `importedRequirements`, `priorityNotes`, `highValue`, `allergies`, `txCompletedByMe`, `recallHistory`, `activeStatus`.
- **Auto-push when local is newer**: `finishFirebaseLoad()` sets `localWasNewer=true` → deferred `saveData()` at 500ms. Also pushes when Firebase is empty/poisoned.
- **Poisoned Firebase detection**: `isEmptyState(data)` check — if Firebase has data but it's effectively defaults, treat as no data.
- **Flag ordering**: ALL sync flags MUST be set BEFORE `initUI()`. Wrap `initUI()` in try/catch.
- **Field-by-field reconstruction**: ALL 6 merge/restore sites (`mergeRemoteState`, `loadFromLocalStorage`, `restoreCheckpoint`, `importAndRestoreDirectly`, `restoreBackup`, `importBackup`) reconstruct state with `getDefaultRoadmapData()` defaults. New fields MUST be added to ALL sites.
- **`mergeCompetencies()` is item-level**: Deep-merges `completionEntries` (dedup by procedureId for linked, date+note for manual). `completed = Math.min(required, max(local, cloud, entries.length))`. NEVER use `{ ...local, ...cloud }` category spread.
- **`mergeCompetencies()` cross-section dedup**: Before adding a cloud section with unknown key, checks if its items already exist in ANY local section (by item ID). Prevents duplicate items when DEFAULT_COMPETENCIES section structure changes between versions. Never blindly add `cloudSections[secKey]` without this check.
- **Migration versioning rule**: When DEFAULT_COMPETENCIES changes (IDs, d3Deadline, required counts, section structure), ALWAYS bump migration version (e.g., `competencyEnhancementsDone_v3` → `v4`). Old migration flags prevent re-sync of corrected values.
- **`syncSchemaFields()` permanent sync**: Runs on EVERY `initUI()` call. Syncs `d3Deadline`, `rules`, `text`, `required` from DEFAULT_COMPETENCIES. Prevents merge drift. NEVER sync `completed`, `completionEntries`, `status`, `note` — those are user data.
- **`resetCompetencies()` force-push**: Uses `forceUploadToCloud()` (not debounced `saveData()`) to prevent race condition where realtime listener re-introduces old competency data before reset reaches Firebase.
- **`COMPETENCY_ALIASES` in `applyRequirementCheckoffs()`**: Maps old/renamed IDs to canonical IDs (e.g., `'perio-sum-reeval-srp': 'srp-reeval'`). Add new aliases here when IDs are renamed/consolidated.
- **Shallow grades merge**: Use deep per-course IIFE merge. In `mergeRemoteState()`, remote `null`/`undefined` must NOT overwrite local values. Pattern: `var result = { ...local }; Object.keys(remote).forEach(k => { if (remote[k] !== null && remote[k] !== undefined) result[k] = remote[k]; });`
- **Array merge with `||`**: `data.arr || local.arr || []` — empty `[]` is truthy, loses local data. Use dedicated merge functions.
- **`loadFromLocalStorage()` patientRecords**: Must use per-patient field-level IIFE merge (stored wins, defaults fill gaps for new fields). Not flat spread `{ ...defaults, ...stored }`.
- **`createCheckpoint()` 60s dedup**: Skips if last checkpoint with same name was <60s ago. Prevents `backfillClinicalData()` from creating duplicate checkpoints.
- **`visibilitychange` handler**: Must call `safeLocalStorageSet()` after `mergeRemoteState()` + `initUI()` on the visible path. Otherwise merged state is lost if tab closes.
- **`initFirebase()` 3s fallback timer**: Must check BOTH `awaitingFirebaseLoad` AND `awaitingPinEntry`. Without `awaitingPinEntry` check, premature load bypasses PIN if user takes >3s.
- **Shared storage namespace**: NEVER let two apps share the same localStorage key or Firebase path.

### Guard C / isEmptyState
`isEmptyState()` prevents saving empty/default data to Firebase. Rules:
- Must check ALL user-editable collection fields. When adding new collections, add to `isEmptyState()`.
- Defaults MUST be empty: `completed: 0` in DEFAULT_COMPETENCIES, empty grade objects (`oralmed: {}`), no hardcoded values in `getDefaultRoadmapData()`.
- Auto-generated data must NOT trigger: don't check `exams` (auto-generated in initUI), check `completed > 0` for competencies.
- Must check: `graduationPrep`, all 9 PR2 fields, `todoList.items`, `missingNotes`, and all fields in the isEmptyState table (Sync Protection section).

### Patient Data Integrity
- **CIS v2 patient store**: `clinicalData.patients` is DEPRECATED (emptied by `migrateToUnifiedPatientStore()`). ALL patient lookups, renders, and edits MUST use `clinicalData.patientRecords` or `getAllPatientRecords()`. The `patients` key is kept only for merge/migration/schema compatibility. NEVER read from it in render or CRUD paths.
- **`getAllPatientRecords()` dedup**: Merges `patientRecords` + `clinicalData.patients`. Dedup by chart number (case-exact), then name (case-insensitive). Fill-merge matching entries. Always use this (not `getPatientRecords()`) for rendering, editing, sidebar, and PR roster (sections 10/11).
- **Cascade deletes**:

| Function | Must Also Do |
|----------|-------------|
| `deletePatient()` | Delete procedures, unlink competencies, remove planner tasks, add to `hiddenClinicTasks`, set `clinicalDataDirty` |
| `deletePatientRecord()` | Same as above + delete from `clinicalData.patients` |
| `deleteAppointment()` | Unlink+delete procedures with matching `appointmentId`, add `clinic_` task to `hiddenClinicTasks`, set `clinicalDataDirty` |

- **CRUD must merge, not replace**: `savePatient()` and `saveAppointment()` MUST spread existing record (`{ ...existing, ...formFields }`). Full replacement wipes `clinicalBrief`, `importedRequirements`, `briefHistory`, `completedAt`, etc.
- **Chart number normalization**: Use leading-zero canonical form everywhere. `addNewPatientRecord()` uses `findByNormalizedChart()`. `getPatientRecords()` uses `normalizeChartNumber()`. PR1_BASELINE must include leading zeros. `migrateLeadingZeroDedup()` one-time migration gated by `leadingZeroDedupDone_v1`.
- **Skeleton patient records**: `prSavePatientField()` must copy `name` and `chartNumber` from `clinicalData.patients`.
- **PATIENT_UPDATE must validate chart number**: Reject empty chart numbers (prevents `'pt_'` overwrite).
- **Smart counter name dedup**: Case-insensitive `toLowerCase().trim()` comparison.

### Clinical Import System
- **9 block types**: PATIENT_RECORD, PATIENT_UPDATE, REQUIREMENTS_MATCH, REQUIREMENTS_STATUS, SPS_DASHBOARD_UPDATE, APPOINTMENTS, MISSING_NOTES, TODO_LIST, CLINICAL_BRIEF — all parseable in one atomic paste.
- **Import dedup**: Dedup by patient NAME + date + time as secondary check, not just `patientId`.
- **Clinical Brief**: Full-overwrite always. Push old to `briefHistory[]` (max 3). Lives ON patient records (`patientRecords[id]`).
- **Multi-line parser**: Lenient — accepts ANY non-empty line as field continuation. Joins with `'\n'`.
- **Imported requirements**: Stored as `patient.importedRequirements[]`. `computeRequirementMatches()` uses these over keyword fallback. Also stores `priorityNotes` and `highValue`.
- **Webchat code fences**: Triple-backtick fences required or markdown destroys `---` delimiters. Backup: `docs/claude-webchat-project-instructions.md`.
- **Import auto-completes**: Both `confirmClinicalImport()` and `confirmPatientImport()` set `status: 'completed'` for past dates.
- **Dual import propagation**: Both import paths MUST call `syncClinicalToMonthlyPlanner()` + `buildCurrentWeekSchedule()` + `mpRenderAllCalendars()`.
- **Import modal defaults**: NEVER set `checked` on destructive-mode checkboxes. Default = safe/merge.
- **Requirement ID matching**: Case-insensitive at both `applyRequirementCheckoffs()` and parse time.
- **`applyRequirementCheckoffs`**: COMPLETED_TODAY uses `isDelta: true` to INCREMENT. REQUIREMENTS_STATUS SETs absolutely. Must cache `intendedCompleted` BEFORE `recordProcedure()`, re-apply AFTER. REQUIREMENTS_STATUS (absolute-set, `!isDelta`) must NOT create procedure records — only COMPLETED_TODAY (`isDelta: true`) creates procedure records. Creating records for absolute-set inflates `getSmartProcedureCount()`.
- **`total-procedures` and `clinical-summatives` are NOT valid competency IDs**: These are synthetic/summary concepts, not items in `DEFAULT_COMPETENCIES`. They will be silently ignored by `applyRequirementCheckoffs()`. The SPS `TOTAL_COMPLETED` field sets the authoritative procedure count via `dashboardSnapshots`, not via competency items.
- **Import parser fieldMap**: Must include ALL fields displayed in `renderPRPatientWriteups()`.
- **Perio noise filter**: Routine perio IDs excluded for non-periodontitis patients. `migratePerioNoiseCleanup()` one-time migration.
- **Missing Notes**: `MISSING_NOTES` block, 7 pipe-delimited fields, dedup by ID, 6-limit capacity bar. Stored in `clinicalData.missingNotes{}`.
- **To-Do list**: `TODO_LIST` block, 5 pipe-delimited fields. Sources: MANUAL/EMAIL/SCREENSHOT/CLINIC/SYSTEM. Stored in `todoList{ items{}, _nextSeq, lastUpdated }`.
- **Dashboard snapshot dedup**: Same `capturedAt` date replaces instead of duplicating.
- **Format D Safeguard (REQUIREMENTS_STATUS)**: `applyRequirementCheckoffs()` logs a console warning when REQUIREMENTS_STATUS (non-delta/absolute-set) touches clinical procedure categories (fixed, operative, dentures, rpd, srp, endo, oralsurg, perio). This sets counts directly with NO procedure record backing. The webchat instructions now have safeguard rules preventing auto-generation of Format D entries for clinical procedures unless Suleman explicitly confirms counts. For patient-level procedure tracking, COMPLETED_TODAY (isDelta=true) in Format C is the correct mechanism.
- **Competency ID changes (Apr 2026)**: IDs REMOVED: `perio-sum-calc` (use srp-calc-1/2/3), `gp-comm` (split into gp-comm-workshop/gp-comm-form-txplan/gp-comm-sum-txplan). IDs ADDED: fixed-units-total, fixed-fpd, fixed-implant-crown, fixed-cerec, cd-units-total, gp-comm-workshop, gp-comm-form-txplan, gp-comm-sum-txplan, gp-meetings, gp-ohra. ALIAS: srp-reeval = perio-sum-reeval-srp. See `docs/GROUND_TRUTH_REQUIREMENTS.md` for canonical ID list.
- **SPS_DASHBOARD_UPDATE vs REQUIREMENTS_STATUS**: SPS saves a SUMMARY snapshot for Mission Control (appointments/procedures totals, clinical progress C/IP/P). It does NOT update individual competency item counts. REQUIREMENTS_STATUS (Format D) sets individual `item.completed` counts. Users often confuse these — if competency counts aren't updating after SPS import, they need Format D.
- **`showToast(message, type, options)`**: Third param `options` supports `{ html: true }` for HTML content. Default is `textContent` (safe). Only use `html: true` with pre-escaped content.

### Competencies & Procedures
- **Procedure→competency linking**: `recordProcedure()` auto-creates `completionEntries[]`. `deleteProcedure()` calls `unlinkProcedureFromCompetencies()`. Never manually edit `item.completed`.
- **Smart counting**: Mission Control uses `getSmartAppointmentCount()` and `getSmartProcedureCount()` (state.js). NEVER replace with narrow `getValues().filter()`. Validate `clinic_` task IDs against actual `appointments`. Patient visit dedup uses AND for name+chartNumber.
- **Evidence trail**: `adjustCompItem()` and `setCompItemStatus()` auto-create `completionEntries[]`. Required for smart counter dedup.
- **SPS dashboard is ground truth**: `getSmartProcedureCount()` uses SPS snapshot as AUTHORITATIVE when it exists (`snapshotCount > 0 ? snapshotCount : computedTotal`). NOT a floor/MAX — the snapshot IS the procedure count. `getSmartAppointmentCount()` still uses `MAX(computed, snapshot)` for appointments. PR tab "Attended" row uses `snapshot.appointments.attended` (not smart counter total).
- **Procedure count categories**: `getSmartProcedureCount()` only counts competency-derived procedures from actual clinical categories: `fixed`, `operative`, `dentures`, `rpd`, `srp`, `endo`, `oralsurg`, `perio`. Non-procedure categories (`grouppractice`, `grouppractice4`, `txplanning`, `geriatrics`, `externship`, `peds`) are excluded.
- **`getCompetenciesData()` is read-only**: Initialization in `ensureCompetenciesInitialized()`, called from `initUI()` and `initClinicalTab()` only. Returns a MUTABLE reference (not a copy) — render functions must not mutate through it.
- **`setCompItemStatus` toggle**: After filtering entries to keep procedure-linked, resync `item.completed = Math.min(required, entries.length)`.
- **Procedure count dedup**: Only deducts entries with valid `procedureId` (not null). Null = manual/backfill.
- **`adjustCompItem()`**: Must call `renderDashboard()` after changes.
- **`saveCompItem()` new items**: Must include ALL default fields: `completionEntries: []`, `status: 'pending'`, `d3Deadline: null`, `unlockedBy: null`, `unlockEmailTo: null`, `isSummative: false`, `rules: null`. Missing fields = `undefined` → Firebase save crash.
- **`removeEvidenceEntry()`**: Must use `getValues()` to convert `completionEntries` before index-based access, then `filter()` to reassign (not `splice()`). Firebase array→object conversion makes index-based splice fragile.
- **`completionEntries` / `completed` divergence**: When REQUIREMENTS_STATUS sets `completed = 20` but only 1 `completionEntry` exists, any code that recalculates `completed = min(required, entries.length)` (like `linkProcedureToCompetencies`) will reset it. This is why REQUIREMENTS_STATUS must NOT call `recordProcedure()`.
- **`autoLinkReviewQueue` array safety**: Firebase converts arrays to objects. ALL reads must use `getValues()` — includes `renderReviewQueue()`, `openReviewQueuePanel()`, `acceptReviewSuggestion()`, `rejectReviewSuggestion()`, `dismissReviewItem()`. Also `suggestedItems` inside queue items.
- **`showCustomConfirm()` escapes HTML**: Never pass raw HTML as the message — it will be destroyed by `escapeHtml()`. Use DOM-based overlays for rich content (buttons, forms). A `rawHtml` 5th parameter exists but prefer DOM construction.
- **`renderCompetencies()` full rebuild**: Destroys scroll position, focus, contenteditable input. Scroll is saved/restored. For new features needing partial re-render, update specific DOM elements instead of full `container.innerHTML`.
- **`persistExpandedState()` / `setCompViewMode()`**: MUST call `safeLocalStorageSet()` to persist UI state. Without it, expanded categories and view mode are lost on reload.
- **`_compNoteCommitted` guard**: Prevents double-fire on contenteditable blur+change. Flag MUST be cleared on `onfocus` — otherwise note becomes permanently unsaveable after Escape.
- **`applyRequirementCheckoffs` must derive status**: The absolute-set (`!isDelta`) path must set `status` to 'completed'/'in_progress' after setting `completed`. Without this, items show completed=20 but status='pending'.
- **Migration flag versioning**: `migrateCompetencyEnhancements()` is gated by `competencyEnhancementsDone_v2`. ALL restore/import paths (restoreCheckpoint, restoreBackup, importAndRestoreDirectly) must clear `_v2`, NOT `_v1`.
- **`restoreCheckpoint` / `restoreBackup` mergeCompetencies direction**: First arg to `mergeCompetencies(local, cloud)` wins conflicts. For RESTORE operations, the checkpoint/backup data MUST be the first arg so it wins over current state.
- **Guard F array tolerance**: `validateStateIntegrity()` must auto-convert `dashboardSnapshots` and `autoLinkReviewQueue` from objects to arrays (via `getValues()`) BEFORE the `Array.isArray` checks, or Firebase array→object conversion permanently blocks ALL saves.
- **`migrateLeadingZeroDedup()` FK remapping**: Migration must remap `loserId → winnerId` in `appointments[].patientId`, `completedProcedures[].patientId`, competency `completionEntries[].patientId`, and `monthlyPlanner.customTasks[].patientId`. Gated by `leadingZeroDedupDone_v2`.
- **`getDashboardSnapshots()` / `saveDashboardSnapshot()`**: Must use `getValues()` for Firebase array→object safety before any `.findIndex()`, `.unshift()`, `.slice()`.
- **`briefHistory` array safety**: Use `getValues()` before `.unshift()` / `.slice()` — Firebase converts arrays to objects.

### Task & Schedule System
- **`doToday` only for eod**: Only `urgency === 'eod'` sets `doToday: true`.
- **XP dual counters**: `toggleTask()` must update BOTH `stats.totalXPGained` AND `focusStats.totalXP`. Uncomplete subtracts tier-based XP (50/75/40/25) from ALL 3 counters.
- **Task creation consistency**: ALL 4 creation sites MUST set triageTier/triageOrder/triageDate when urgency is eod/soon/week.
- **StableId before mutation**: Compute `getDeadlineId(deadline)` BEFORE modifying fields. Use `deadline._originalStableId`.
- **Custom deadline dual-store**: Update BOTH `editedDeadlines` AND `customDeadlines[id]`.
- **DeadlineId in onclick**: `getDeadlineId()` must strip `'"\\`. Escape: `onclick="fn('${safeId}')"`.
- **Nuke-and-rebuild sync**: NEVER delete all + recreate. Use incremental sync with `userEdited` and `hiddenClinicTasks`.
- **Clinic task delete**: `_mpDeleteCurrentTaskConfirmed()` must add clinic tasks to `hiddenClinicTasks`, or `syncClinicalToMonthlyPlanner()` recreates them.
- **`syncClinicalToMonthlyPlanner` gating**: Must be gated by `clinicalDataDirty` flag. Flag set true by mergeRemote/load/restore/import, false at end of sync.
- **TBD deadlines**: Show in separate "Unscheduled" card on Mission Control.
- **Cross-app dedup**: Stim calc dedup by `clinicalAppointmentId` and `date|time|name`.
- **Cross-app write exception**: `toggleMainAppTask()` writes to index.html's Firebase path. Intentional ONLY cross-app write. Self-heals via `.on('value')` listener.

### Propagation Requirements

| After | Must Call |
|-------|----------|
| Appointment CRUD (save/delete/complete/uncomplete) | `buildCurrentWeekSchedule()`, `syncClinicalToMonthlyPlanner()` |
| Planner task changes (save/hide/unhide) | `buildCurrentWeekSchedule()` |
| Deadline mutation (add/edit/complete/delete) | `rebuildUpcomingDeadlines()` |
| `uncompleteAppointment()` | Remove procedure records, unlink competency evidence, recalc patient `lastVisit` |
| `backfillClinicalData()` | `createCheckpoint('pre-backfill')` before mutations (dedup within 60s). `_backfillInProgress` guard. |
| Competency adjustment | `renderDashboard()` |

### UI & Rendering
- **Flex full-width + flex-wrap**: Container needs `flex-wrap: wrap`, full-width item needs `flex: 1 1 100%`.
- **Expensive renders**: Never in `updateUI()`/`recalculate()` (runs every 5s). Only on init + navigation.
- **Canvas tooltip**: Recompute `graphWidth`/`pointSpacing` inside `onmousemove`, not at setup time.
- **Division by zero**: Guard `pointSpacing = width / (data.length - 1)` with `if (data.length < 2) return`.
- **Duplicate HTML style attributes**: Never pass `style="..."` in extraAttr if element already has `style`. Merge into one.
- **CSS-only tab theming**: `#tab-[name] .existing-class` specificity override. Additive — don't delete base styles.
- **Patients tab**: Light theme via `#tab-patients` prefix. Section IDs unchanged for `collapsedSections`. Mobile: `@media (max-width: 768px)` hides metrics cards, sidebar `position: static`, `overflow: visible` on `#patientsMainLayout`.
- **Mini Review tab**: Read-only `#tab-minireview`. `renderMiniReview()` in patients.js. Sorted by reliability. No state mutation, no saves. Shows full last visit details (date + procedure + provider) parsed from `lastVisit` field (pipe-delimited: `date | procedure | provider`). CSS: `.mr-visit-detail` (procedure), `.mr-visit-provider` (provider name in teal).
- **`formatClinicalDisplay()`**: Pure display function. CSS classes prefixed `fc-*`. Zero content change.
- **Partial re-renders**: `rerenderMissingNotesSection()` and `rerenderTodoListSection()` for targeted updates instead of full `renderDashboard()`.
- **Double-fire guard**: Both click-to-edit (`change`+`blur`) and contenteditable fields need `committed` boolean flag. Escape must set flag to prevent blur from saving.
- **Cache-busting**: After multi-file JS changes, add `?v=YYYYMMDD` to ALL `<script src>` tags.
- **Stats counters**: `stats.totalTasks` drifts — use live `getValues(tasks)` count.
- **Faculty matching**: `\b` word-boundary regex for names >= 3 chars; exact match for < 3 chars.
- **fieldMap parsers use `for`+`break`**: `parsePatientRecord()`, `parsePatientUpdate()`, `parseClinicalBrief()` use `for` loop with `break` after first key match (not `forEach`). Prevents future prefix-collision bugs if keys like `TX` and `TX_STATUS` coexist.

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

- **Ground Truth Requirements:** `docs/GROUND_TRUTH_REQUIREMENTS.md` -- the SINGLE source of truth for all graduation requirement IDs, counts, deadlines, and completion status. Both the Claude webchat project and this app use this file as their canonical reference.
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

## COMPREHENSIVE AUDIT METHODOLOGY
For "debug everything" requests, use this proven 4-phase approach:
- **Phase 1**: 6 parallel audit agents by domain: patients, clinical/competencies, import/parsers, firebase-sync, dashboard/tabs/rendering, HTML/CSS. Each reads EVERY line and reports bugs without making changes.
- **Phase 2**: Consolidate findings, deduplicate (same bug found by multiple agents), categorize by file.
- **Phase 3**: 5 parallel fix agents organized BY FILE (prevents edit conflicts): firebase-sync.js, clinical.js+state.js, patients.js, periodic-review.js+monthly-planner.js+init.js+import-system.js, deadlines.js+grades.js+exam-content.js+HTML.
- **Phase 4**: QA agent verifies all fixes (syntax, brace balance, spot-check critical changes, scan for regressions). Then sweep for stale `clinicalData.patients` references.
- **Last audit**: Mar 30 2026 (second pass), commit `e368887`. 37 fixes verified. Key categories: procedure count inflation (3 root causes), Firebase array safety (4), sync merge depth (3), import parser (4), XSS (5), propagation (2), rendering (2), HTML (3). Previous audit: Mar 30 commit `38a2a2d` (110 bugs, 73 fixed).
- **Apr 1 2026 competency ground truth rebuild**, commit `feeb118`. Root cause: `DEFAULT_COMPETENCIES` was built from guesses, not official requirements docs. Fixed Pros formatives falsely marked as D3 deadlines, real D3 deadlines (GP, RS 545, OS, Geriatrics) missing entirely. Import system inflated completion counts via REQUIREMENTS_STATUS absolute-set on clinical items. 3 root cause fixes: (1) Rebuilt `DEFAULT_COMPETENCIES` from single ground truth doc (`docs/GROUND_TRUTH_REQUIREMENTS.md`) — 15 categories, ~140 items, all d3Deadlines corrected. (2) Rendering pipeline: patient badges now green (completed) vs yellow (planned), D3 pills clickable with scroll-to-item, patient chip preview popup. (3) Format D safeguard: console.warn when REQUIREMENTS_STATUS absolute-sets clinical procedure counts. ID changes: removed `perio-sum-calc`, split `gp-comm` into 3, added `fixed-units-total`/`fixed-fpd`/`fixed-implant-crown`/`fixed-cerec`/`cd-units-total`/`gp-meetings`/`gp-ohra`. QA verified: all ground truth IDs present, old IDs absent, brace balance, XSS safety, no saveData in renders.
- **Apr 1 2026 competency tab overhaul**, commit `f4cad62`. 11-agent audit+fix+QA (6 audit, 4 fix, 1 QA). 37 fixes across 6 files. 3 CRITICAL: renderEvidenceCards() never called (evidence invisible), showCustomConfirm HTML-escaping destroyed review queue panel buttons, undo toast wrong selector. 9 HIGH: migration flag v1→v2 (3 restore sites), restoreCheckpoint mergeCompetencies arg order swapped (4 sites), autoLinkReviewQueue missing getValues() (6 sites), importedRequirements array safety, duplicate style attrs, persistExpandedState/setCompViewMode never saved, troubleshooting resync corrupted SPS data, _compNoteCommitted never cleared after Escape, clinicalDataDirty missing in deleteProcedure/uncompleteAppointment. 18 MEDIUM: D3 urgency mapping, saveCompItem status reset, safeKey escaping, milestone hardcoded targets, navigateToEntity scroll, Guard F array tolerance, applyRequirementCheckoffs status derivation, modal backdrop dismiss, scroll preservation, and more. 7 LOW: mobile CSS classes, touch targets, contenteditable placeholder, troubleshooting container targeting.
- **Apr 1 2026 ground truth corrections** (manual audit by Suleman). 6 changes to `docs/GROUND_TRUTH_REQUIREMENTS.md`: op-multi-5 completed 1→0 (only 4 multisurface summatives done), perio-sum-prophy 2→3 (all 3 prophy summatives done), gp-form-analysis 1→2 (both formative WAs done), peds-course 0→1 (PD 530 finished), CD formatives prelim/final/records/postdam/trial all updated to done (Jose Rosario interim through try-in), cd-form-insert and cd-form-adjust confirmed still 0. No code changes needed — `DEFAULT_COMPETENCIES` correctly has `completed: 0` for all items (actual completion lives in Firebase state).
- **Apr 1 2026 post-fix verification + merge corruption fix**, commit `dd5acc1`. 5 parallel audit agents + QA cross-check verified 14 bugs from ground truth rebuild. Key new bugs found and fixed: (1) `mergeCompetencies()` cross-section duplication — old Firebase data with different section keys created duplicate items when merged with rebuilt DEFAULT_COMPETENCIES. Fixed with flat item ID set + cross-section dedup. (2) v2 migration ran with pre-ground-truth defaults, set flag, never re-ran — bumped to v3 with orphan removal. (3) `resetCompetencies()` race condition with debounced save — now uses `forceUploadToCloud()`. (4) `syncSchemaFields()` added as permanent d3Deadline/rules/text/required sync on every `initUI()`. (5) `COMPETENCY_ALIASES` map for renamed IDs in `applyRequirementCheckoffs()`. (6) `showToast()` html flag for undo actions. (7) `navigateToCompetencyItem()` CSS.escape. (8) Webchat instructions synced with ground truth IDs. (9) `getPatientsFulfilling()` Array.isArray→getValues at 4 locations. (10) fieldMap parsers forEach→for+break. Also: 3 d3Deadline corrections (perio-sum-hci, perio-sum-prophy, perio-sum-reeval-ging).
- **Apr 1 2026 comprehensive data integrity audit**, commit `4d501aa`. 7-agent audit (requirements accuracy, import parser, competency rendering, patient lifecycle, appointment pipeline, Firebase sync, cross-tab dependencies) — 159 checks passed, 18 bugs found, 28 warnings. 5 parallel fix agents (one per file), QA verification agent (20/20 pass). 3 CRITICAL: `getSmartAppointmentCount()`/`getSmartProcedureCount()` accessed `dashboardSnapshots` without `getValues()` — Firebase array→object killed Mission Control numbers (state.js:1059,1116); `getLatestSnapshot()` same issue destroyed PR Review SPS data (periodic-review.js:120); `linkProcedureToCompetencies()` reset absolute-set completed counts via `Math.min(required, entries.length)` — now uses `Math.max(completed, entries.length)` floor (clinical.js:2737). 9 HIGH: `hiddenClinicTasks` key mismatch `'clinic_'+aptId` vs raw `aptId` (state.js:1433, patients.js:1243); migration flag `_v2` cleared but gate checks `_v3` in 4 restore/import sites; `importBackup()` missing ALL migration flag clears; `mergeRemoteState` lost newer `clinicalBrief` (no dateGenerated comparison); `briefHistory` merge rejected Firebase objects (Array.isArray without getValues); `computeRequirementMatches` `.length` on Firebase object; `autoLinkReviewQueue` Array.isArray in both merge functions; COMPLETED_TODAY procedure records had null `patientId`; `migrateLeadingZeroDedup` missing FK remaps for autoLinkReviewQueue + periodicReviews.pr2. 6 MEDIUM: D3 urgency collapsed 'upcoming' into 'soon' (now 4 tiers); proc breakdown used wrong property name `snapshotIsFloor`; `uncompleteAppointment`/`deleteAppointment` missing `dpSyncAppointmentsToTimeline`; `loadFromLocalStorage` grades shallow merge allowed null overwrite; PATIENT_RECORD import overwrote canonical `id`. BONUS: `navigateToEntity('deadline')` now scrolls with highlight. Also verified: all 6 course weight sums = 100%, all 135 ground truth requirement IDs match DEFAULT_COMPETENCIES exactly. Plan: `docs/superpowers/plans/2026-04-01-audit-bugfix-all-18-issues.md`.
- **Areas NOT covered by all audits through Apr 1** (check these in next session): (1) ~~`grades.js` `courseStructures` weights correctness~~ VERIFIED Apr 1 audit (all 6 sum to 100%). (2) `exam-content.js` `examContentData` accuracy — 1000+ lines of hardcoded content not verified against syllabi. (3) `monthly-planner.js` calendar rendering edge cases (month boundaries, week-start offsets). (4) `periodic-review.js` PDF export (`exportPRToPDF`) — not tested with actual html2pdf.js. (5) `daily-planner.js` pomodoro timer and bedtime logic. (6) Cross-app data flow to body-comp-tracker and stim-calc (read paths only). (7) `restoreCheckpoint()` and `importAndRestoreDirectly()` merge todoList items instead of replacing (LOW bugs found but not fixed). (8) ~~`restoreCheckpoint()` merges competencies from current state instead of checkpoint state~~ FIXED Apr 1 commit `f4cad62`. (9) `deepMerge()` in `forceCloudSync()` "merge" mode replaces arrays instead of merging (MEDIUM unfixed — competency-aware merge functions not called in this path). (10) `backfillClinicalData()` Phase 4 self-referential iteration (LOW dead code). (11) `ensureCompetenciesInitialized()` does NOT add new categories incrementally — only `migrateCompetencyEnhancements()` does, but it's gated by a one-time flag. Future DEFAULT_COMPETENCIES additions need either a new migration version or ungated incremental category check. (12) `isEmptyState()` uses `Array.isArray` for `dashboardSnapshots` and `autoLinkReviewQueue` — works in Guard C context (only called on roadmapData which is always array-form after init) but fragile if called on raw Firebase data. (13) Field-reconstruction sites (restoreBackup, importBackup, loadFromLocalStorage, restoreCheckpoint, importAndRestoreDirectly) still use `Array.isArray` for autoLinkReviewQueue — acceptable since they reconstruct from known-format data, but inconsistent with merge functions that now use `getValues()`.

---

## THINGS NOT TO CHANGE WITHOUT TESTING
Firebase config, PIN auth, save/sync debounce, grade calculator math, XR pharmacokinetic model, date parsing, sync protection guards, `isEmptyState()`, checkpoint system.
