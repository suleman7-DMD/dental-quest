# CLAUDE.md - Dental Student Quest

## CRITICAL RULES

### Development Philosophy (ALWAYS APPLY)
- **Never assume constraints.** Do not pre-compromise features, scope, or ambition. The user has AI-augmented development velocity.
- **No time estimates.** Never estimate how long something will take. Just describe the work.
- **Vision before scope.** Explore the ideal unconstrained version FIRST. Only scope down when explicitly asked. Never suggest "a simpler approach" unprompted.
- **Match the user's ambition.** This codebase has 22k-line apps, 12-module architectures, cross-app Firebase sync with 6 guards, pharmacokinetic models, and clinical import systems with 9 block types. Don't patronize with "start small."
- **No hedging.** Never say "realistically," "given your constraints," "that's ambitious but," or "a good MVP would be."
- **"Dream big" trigger.** When the user says "dream big" → invoke the `vision-first` skill.

### Never Rebuild Entire Files
- Body-comp is ~22,444 lines. Use surgical `Edit` tool only. Read section first.
- **Split apps** (index.html: 12 modules, graduation-roadmap: 12 modules, stim-calc: 11 modules) — surgical edits on individual JS module files. `js/d3-roadmap/` deleted; modules in `js/graduation-roadmap/`.

### Date Parsing (COMMON BUG)
```javascript
// WRONG: new Date('2026-02-02')  — off-by-one in EST
// CORRECT:
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```
- Never use `.toISOString().slice(0,10)` — use `getLocalDateString(date)`.
- **`parseMDYDate()`**: Use for `MM/DD/YYYY` dates (e.g., recall history). `parseLocalDate()` is `YYYY-MM-DD` only.
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
- **`completedTasks` object wrapper**: `getValues(completedTasks)` returns `[{id, value, completedAt}, ...]`. Use `.some(c => (c.value || c) === String(taskId))`.

### Firebase Save Safety
- **`undefined` kills saves**: Firebase rejects `undefined` in `.set()` — use `?? null` or `?? false`. One `undefined` crashes ALL saves silently.
- **`_version: Date.now()`**: Causes data wipe. Must be 0 in defaults.
- **CRUD localStorage safety**: ALL CRUD functions MUST call `safeLocalStorageSet()` BEFORE `saveData()`.
- **No `saveData()` in render paths**: Render functions must NEVER call `saveData()`. Save from caller with `hasLoadedFromCloud && !awaitingFirebaseLoad` guards.
- **No state mutation in render paths**: `renderDashboard()` must NOT write back to `roadmapData`. Use local variables.
- **`initUI` auto-save guards**: Both `setTimeout(() => saveData(), ...)` in initUI MUST check `hasLoadedFromCloud && !awaitingFirebaseLoad`.
- **Double `loadData()`**: Causes race conditions. Verify orphan calls before adding.
- **Failsafe timer**: Must set `hasLoadedFromCloud = true`, `isInitialLoad = false`, `roadmapData._dataLoaded = true`. (Flags set manually, no `markInitialLoadComplete()` function.)
- **`clinicalDataDirty = true` before ALL clinical CRUD**: 23 functions require this — patient CRUD (save/delete/add/field/reliability), appointment CRUD (save/delete/complete/uncomplete), procedures (record/delete/backfill), competencies (adjust/setStatus/delete/save/notes/saveNote/reset), imports (confirmPatient/confirmClinical), `prSavePatientField`.
- **Fallback timers = data wipe**: DOMContentLoaded 3s/6s timers must check BOTH `awaitingPinEntry` AND `awaitingFirebaseLoad`. 15s safety valve.
- **Guard F**: `validateStateIntegrity()` must validate `periodicReviews`, `competencies`, `missingNotes`.
- **Firebase array→object corruption**: ALL collection access MUST use `getValues()` for reads. Applies to: `dashboardSnapshots`, `briefHistory`, `importedRequirements`, any stored array.

### Sync & Merge Rules
- **`mergeRemoteState`**: Compare `lastSaved` — if local newer, call `mergeRemoteCollectionsIntoLocal(data)` (NOT skip entirely).
- **Deep merge required**: `patientRecords` must use per-patient field-level IIFE merge (local wins, remote fills gaps). NEVER flat spread `{ ...local, ...remote }`. Same for `todoList.items`, `graduationPrep`, `clinicHeadlines`.
- **`mergeRemoteCollectionsIntoLocal`**: `addMissing(local, remote)` pattern (local wins). Must cover ALL top-level objects. Defaults-provided objects need field-level merge, not `!roadmapData.X` guard. Deep-merge patientRecords fields: `importedRequirements`, `priorityNotes`, `highValue`, `allergies`, `txCompletedByMe`, `recallHistory`, `activeStatus`.
- **Auto-push when local newer**: `finishFirebaseLoad()` → deferred `saveData()` at 500ms. Also pushes when Firebase empty/poisoned.
- **Flag ordering**: ALL sync flags MUST be set BEFORE `initUI()`. Wrap `initUI()` in try/catch.
- **`reconstructState(source, {strategy, fallback})`**: Single function (firebase-sync.js) with 3 strategies: `'remote-wins'`, `'stored-wins'`, `'source-wins'`. **New fields only need adding here.** Key: todoList spread order flips between strategies; competencies arg order flips; patientRecords merge depth varies. **Tombstone filtering**: After merge, purges records present in `deletedAppointmentIds`/`deletedProcedureIds`/`deletedPatientRecordIds` (skipped for `source-wins`).
- **`mergeRemoteCollectionsIntoLocal`**: Separate from `reconstructState` — mutates roadmapData in place. NOT refactored into it.
- **`mergeCompetencies()` (V2)**: Timestamp-based — most recent `lastVerified` wins. If neither, `Math.max` of counts. First arg wins STRUCTURE conflicts. `source-wins` passes source first; others pass fallback first.
- **Cross-section dedup**: Before adding cloud section with unknown key, checks if items exist in ANY local section (by ID). Prevents duplicates.
- **Migration versioning**: When DEFAULT_COMPETENCIES changes, ALWAYS bump migration version. Old flags prevent re-sync.
- **`syncSchemaFields()`**: Runs every `initUI()`. Syncs `d3Deadline`, `rules`, `text`, `required`. NEVER sync `completed`, `status`, `note` — user data.
- **`resetCompetencies()`**: Uses `forceUploadToCloud()` (not debounced save). Clears ALL migration flags.
- **`COMPETENCY_ALIASES`**: Maps old→canonical IDs in `applyRequirementCheckoffs()`.
- **Shallow grades merge**: Use deep per-course IIFE merge. Remote `null`/`undefined` must NOT overwrite local.
- **Array merge with `||`**: Empty `[]` is truthy — `data.arr || local.arr || []` loses local data. Use dedicated merge functions.
- **`loadFromLocalStorage()` patientRecords**: Per-patient field-level merge, not flat spread.
- **`createCheckpoint()` 60s dedup**: Prevents duplicate checkpoints.
- **`visibilitychange`**: Must `safeLocalStorageSet()` after merge + `initUI()` on visible path.
- **`initFirebase()` 3s fallback**: Must check BOTH `awaitingFirebaseLoad` AND `awaitingPinEntry`.
- **Shared storage namespace**: NEVER let two apps share localStorage key or Firebase path.

### Guard C / isEmptyState
`isEmptyState()` prevents saving empty/default data to Firebase:
- Must check ALL user-editable collections. When adding new ones, update `isEmptyState()`.
- Defaults MUST be empty: `completed: 0` in DEFAULT_COMPETENCIES, empty grade objects, no hardcoded values.
- Auto-generated data must NOT trigger: don't check `exams`, check `completed > 0` for competencies.
- Must check: `graduationPrep`, all 9 PR2 fields, `todoList.items`, `missingNotes`, and all fields in isEmptyState table.

### Patient Data Integrity
- **`clinicalData.patients` DEPRECATED**: ALL lookups/renders/edits MUST use `clinicalData.patientRecords` or `getAllPatientRecords()`. Never read `patients` in render or CRUD paths.
- **`getAllPatientRecords()` dedup**: Merges both stores. Dedup by chart number then name. Always use for rendering, editing, sidebar, PR roster.
- **Cascade deletes**:

| Function | Must Also Do |
|----------|-------------|
| `deletePatient()` | Delete procedures + write tombstones, unlink competencies, remove planner tasks, add to `hiddenClinicTasks`, set `clinicalDataDirty` |
| `deletePatientRecord()` | Delegate to `cascadeDeletePatient()` — handles all cascade + propagation |
| `deleteAppointment()` | Unlink+delete procedures + write tombstones, add task to `hiddenClinicTasks`, set `clinicalDataDirty` |
| `uncompleteAppointment()` | Delete procedures + write tombstones, unmark deadline/planner, recalc lastVisit |

- **CRUD must merge**: `savePatient()`/`saveAppointment()` MUST spread existing record (`{ ...existing, ...formFields }`).
- **Chart number normalization**: Leading-zero canonical form. `migrateLeadingZeroDedup()` gated by `leadingZeroDedupDone_v1`. FK remapping: `appointments[].patientId`, `completedProcedures[].patientId`, `monthlyPlanner.customTasks[].patientId`.
- **`getPatientRecords()` is read-only**: Injects defaults into memory but does NOT persist. Persistence via next CRUD `saveData()`.
- **Skeleton patient records**: `prSavePatientField()` must copy `name` and `chartNumber` from `clinicalData.patients`.
- **PATIENT_UPDATE must validate chart number**: Reject empty (prevents `'pt_'` overwrite).

### Clinical Import System
- **9 block types**: PATIENT_RECORD, PATIENT_UPDATE, REQUIREMENTS_MATCH, REQUIREMENTS_STATUS, SPS_DASHBOARD_UPDATE, APPOINTMENTS, MISSING_NOTES, TODO_LIST, CLINICAL_BRIEF — all parseable in one atomic paste.
- **Import dedup**: By patient NAME + date + time, not just `patientId`.
- **Clinical Brief**: Full-overwrite. Push old to `briefHistory[]` (max 3). Lives on `patientRecords[id]`.
- **Multi-line parser**: Lenient — any non-empty line as field continuation, joins with `'\n'`.
- **Imported requirements**: Stored as `patient.importedRequirements[]`. `computeRequirementMatches()` uses these over keyword fallback.
- **Webchat code fences**: Triple-backtick required. Backup: `docs/claude-webchat-project-instructions.md`.
- **Import auto-completes**: Both confirm paths set `status: 'completed'` for past dates.
- **Dual import propagation**: Both paths MUST call `syncClinicalToMonthlyPlanner()` + `buildCurrentWeekSchedule()` + `mpRenderAllCalendars()`.
- **Import modal defaults**: NEVER set `checked` on destructive-mode checkboxes.
- **Requirement ID matching**: Case-insensitive at both `applyRequirementCheckoffs()` and parse time.
- **`applyRequirementCheckoffs` (V2)**: COMPLETED_TODAY (`isDelta`) creates procedure records but does NOT touch competency counts/notes (gated by `!item.isDelta`). REQUIREMENTS_STATUS sets absolute counts, `lastVerified`, status, note. Only REQUIREMENTS_STATUS modifies counts. Dedup: COMPLETED_TODAY matches on procedure+date+patient.
- **Invalid competency IDs**: `total-procedures` and `clinical-summatives` are synthetic — silently ignored.
- **`PHONE:` field**: In PATIENT_RECORD/UPDATE. Stored as `patient.phone` (pipe-delimited). Display: primary + "+N more". Propagated to profile, mini review, PR roster/writeups, competency popup, sidebar, Active Roster.
- **`MEDICAL_HX_APPEND:`**: PATIENT_UPDATE only. Appends to `medicalHx` with `\n\n` (sets `_medicalHxAppend` flag).
- **`PATIENT_UPDATE` auto-creates**: Unknown chart numbers auto-create skeleton via `createPatientRecord()`.
- **`createPatientRecord(overrides)`**: Single factory for all 4 creation sites. New patient fields only need adding here.
- **Perio noise filter**: Routine IDs excluded for non-periodontitis patients. `migratePerioNoiseCleanup()`.
- **Missing Notes**: 7 pipe-delimited fields, dedup by ID, 6-limit. `clinicalData.missingNotes{}`.
- **To-Do list**: 5 pipe-delimited fields. Sources: MANUAL/EMAIL/SCREENSHOT/CLINIC/SYSTEM. `todoList{ items{}, _nextSeq, lastUpdated }`.
- **Dashboard snapshot dedup**: Same `capturedAt` date replaces instead of duplicating.
- **Format D Safeguard**: Console warning when REQUIREMENTS_STATUS sets clinical procedure counts directly. For patient-level tracking, use COMPLETED_TODAY.
- **Competency ID changes**: See `docs/GROUND_TRUTH_REQUIREMENTS.md` for canonical list. `COMPETENCY_ALIASES` maps old→new.
- **SPS vs REQUIREMENTS_STATUS**: SPS saves summary snapshot. REQUIREMENTS_STATUS sets individual counts. If counts aren't updating, need Format D.
- **`showToast(msg, type, options)`**: `{ html: true }` for HTML. Default is `textContent` (safe).

### Competencies V2 (Manual-Count Model)
- **V2 model**: Flat manual counts. Item shape: `{ id, text, required, completed, note, lastVerified, d3Deadline, isSummative, status }`. Old evidence-trail model (completionEntries, review queue, unlock chains) was deleted.
- **Counts are manual-only**: Change via (a) REQUIREMENTS_STATUS import or (b) inline +/- buttons. COMPLETED_TODAY does NOT touch counts.
- **`lastVerified`**: Set on every manual edit and REQUIREMENTS_STATUS import. Used by `mergeCompetencies()` for conflict resolution.
- **`migrateToCompetencyV2()`**: One-time migration gated by `competencyV2Migrated`. Wipes old fields, seeds verified values.
- **`adjustCompItem()` / `setCompItemStatus()`**: Simple +/- or toggle. Sets `lastVerified`, derives status.
- **Smart counting**: `getSmartProcedureCount()` sums `item.completed` across categories. SPS snapshot AUTHORITATIVE when exists.
- **`autoLinkReviewQueue`**: DELETED. Field kept as `[]` for schema compat only.
- **V2 UI**: Warm Atlas Console design, `cv2-*` CSS classes. 3 panels: milestone KPI strip, D3 alert + category accordion, What's Next.
- **Pipeline badges**: `importedRequirements[]` on patient records is source. All `'planned'` (yellow) in V2.
- **Migration flag versioning**: ALL restore/import paths must clear: `unifiedPatientStoreDone_v1`, `competencyEnhancementsDone_v2`, `competencyEnhancementsDone_v3`, `competencyV2Migrated`, `leadingZeroDedupDone_v2`, `perioNoiseCleanupDone_v1`. Add new flags to ALL 3 sites.
- **Guard F (V2)**: Auto-converts `dashboardSnapshots` objects→arrays. No `autoLinkReviewQueue` check.
- **`showCustomConfirm()` escapes HTML**: Never pass raw HTML. Use DOM overlays for rich content.
- **`persistExpandedState()`**: MUST call `safeLocalStorageSet()`.
- **`getCompetenciesData()`**: Returns MUTABLE reference — render functions must not mutate through it.
- **`getDashboardSnapshots()` / `saveDashboardSnapshot()`**: Must use `getValues()` before `.findIndex()`, `.unshift()`, `.slice()`.
- **`briefHistory` array safety**: Use `getValues()` before `.unshift()` / `.slice()`.

### Task & Schedule System
- **`doToday` only for eod**: Only `urgency === 'eod'` sets `doToday: true`.
- **XP dual counters**: `toggleTask()` must update BOTH `stats.totalXPGained` AND `focusStats.totalXP`. Uncomplete subtracts from ALL 3.
- **Task creation consistency**: ALL 4 creation sites MUST set triageTier/triageOrder/triageDate.
- **StableId before mutation**: Compute `getDeadlineId(deadline)` BEFORE modifying fields.
- **Custom deadline dual-store**: Update BOTH `editedDeadlines` AND `customDeadlines[id]`.
- **DeadlineId in onclick**: `getDeadlineId()` must strip `'"\\`.
- **Nuke-and-rebuild sync**: NEVER delete all + recreate. Use incremental sync with `userEdited` and `hiddenClinicTasks`.
- **Clinic task delete**: `_mpDeleteCurrentTaskConfirmed()` must add to `hiddenClinicTasks`.
- **`syncClinicalToMonthlyPlanner` gating**: Gated by `clinicalDataDirty` flag.
- **TBD deadlines**: Separate "Unscheduled" card on Mission Control.
- **Cross-app dedup**: Stim calc dedup by `clinicalAppointmentId` and `date|time|name`.
- **Cross-app write exception**: `toggleMainAppTask()` writes to index.html's Firebase path. Only cross-app write.

### Propagation Requirements

| After | Must Call |
|-------|----------|
| Appointment CRUD | `buildCurrentWeekSchedule()`, `syncClinicalToMonthlyPlanner()`, `dpSyncAppointmentsToTimeline()` |
| Planner task changes | `buildCurrentWeekSchedule()` |
| Deadline mutation | `rebuildUpcomingDeadlines()` |
| `uncompleteAppointment()` | Remove procedure records, recalc patient `lastVisit` |
| `backfillClinicalData()` | `createCheckpoint('pre-backfill')` before mutations |
| Competency adjustment / status toggle | `renderDashboard()` |
| `mpToggleTaskComplete` | `dpSyncAppointmentsToTimeline()` |
| Quick-fix schedule changes | `syncClinicalToMonthlyPlanner()`, `buildCurrentWeekSchedule()` |
| Reliability change (`setPatientReliability`) | `propagateClinicalChanges({ patients: true })` |

### Troubleshooting Module
- **`hiddenClinicTasks` key**: Raw `aptId`, NOT `clinic_` prefixed. Value: `{ hiddenAt, taskId }` (not boolean).
- **Quick-fix functions**: Must call BOTH `syncClinicalToMonthlyPlanner()` AND `buildCurrentWeekSchedule()`.
- **`runPostMergeIntegrityChecks(source)`**: Console-only. No saves, no mutations.
- **`mpUnhideClinicTask()`**: Must set `clinicalDataDirty = true`.
- **`mpSaveTask()`**: Must set `userEdited = true` on clinic-synced tasks.
- **`buildCurrentWeekSchedule()`**: Must filter `convertedStaticIds` and `hiddenClinicTasks[apt.id]`.
- **`tsCheckCompetencies()` (V2)**: Checks over-counted and unverified items.
- **`tsFixResyncCompCounts()` (V2)**: Clamps `completed` to `[0, required]`, derives status.

### UI & Rendering
- **Flex full-width + flex-wrap**: Container needs `flex-wrap: wrap`, full-width item `flex: 1 1 100%`.
- **Expensive renders**: Never in `updateUI()`/`recalculate()` (runs every 5s). Only on init + navigation.
- **Canvas tooltip**: Recompute `graphWidth`/`pointSpacing` inside `onmousemove`.
- **Division by zero**: Guard with `if (data.length < 2) return`.
- **Duplicate HTML style attributes**: Never pass `style="..."` in extraAttr if element already has `style`.
- **CSS-only tab theming**: `#tab-[name] .existing-class` specificity override. Additive.
- **Patients tab**: Light theme via `#tab-patients` prefix. Mobile: hides metrics, sidebar `position: static`.
- **Mini Review tab**: Read-only. No state mutation, no saves. Rendered from 3 sites: `switchTab`, `propagateClinicalChanges`, `initUI`. Filters out red patients; sorts scheduled-first.
- **Partial re-renders**: `rerenderMissingNotesSection()` and `rerenderTodoListSection()` for targeted updates.
- **Double-fire guard**: Click-to-edit and contenteditable need `committed` boolean. Escape must set flag.
- **Toast onclick**: NEVER `toastEl.style.display = 'none'`. Use `classList.remove('show')` + `setTimeout` auto-clear.
- **`lastVisit` field**: Programmatic: bare `YYYY-MM-DD`. Defaults: pipe-delimited. For date comparison: `split('|')[0].trim()`. Mini review prefers `getLastCompletedVisit()`.
- **Pace badge color order**: Check `pastGraduation` (red) BEFORE `behindSchedule` (yellow).
- **`mpClickCell` end time**: Clamp hour 23 to `'23:59'`.
- **Inline styles vs CSS classes**: NEVER put `background`/`color` in `style=""` if CSS class controls state.
- **Cache-busting**: After JS changes, add `?v=YYYYMMDD` to `<script src>` tags.
- **Stats counters**: `stats.totalTasks` drifts — use live `getValues(tasks)` count.
- **Faculty matching**: `\b` word-boundary for names >= 3 chars; exact match for < 3.
- **fieldMap parsers**: Use `for`+`break` (not `forEach`). Prevents prefix-collision bugs.

---

## PROJECT OVERVIEW

| File | Purpose |
|------|---------|
| `index.html` + `js/dental-quest/*.js` (12 modules) | Main app: gamified tasks, focus mode, financials, calendar, meds |
| `d3-roadmap.html` (REDIRECT SHIM) | Redirects to graduation-roadmap.html |
| `graduation-roadmap.html` + `js/graduation-roadmap/*.js` (12 modules) | Graduation tracker: mission control, deadlines, clinical, patients, competencies, schedule, academics, grad prep, periodic review |
| `stimulant-elimination-calculator.html` + `js/stimcalc/*.js` (12 modules) | Sleep prediction: pharmacokinetics, circadian, workout planning |
| `body-comp-tracker.html` (~22,444 lines, single file) | Calorie/protein/workout tracking, cross-app ecosystem |
| `lecture-prompt-transformer.html` (~2,800 lines) | Lecture notes prompt builder (standalone) |

- **Ground Truth**: `docs/GROUND_TRUTH_REQUIREMENTS.md` — canonical source for graduation requirement IDs, counts, deadlines, completion status.
- **Brand**: "SULEMAN SHAIKH, DMD". localStorage keys use `dentalQuest*` prefix.
- **URL**: suleman7-dmd.github.io/dental-quest/ | **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: No build system. Push to `main` → live in ~30s.

### Per-App Detail → Skill Files

| Skill | Covers |
|-------|--------|
| `dental-quest-dev` | index.html: modules, urgency, command center, tasks, views, financials |
| `d3-roadmap-dev` | HISTORICAL: old architecture (deleted). Migration debugging only. |
| `stim-calc-dev` | stim-calc: modules, pharmacokinetics, circadian, sleep prediction |
| `body-comp-dev` | body-comp: key locations, mode system, ecosystem, analytics |
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
```

### Firebase Data Tree
```
users/user_[hashedPin]/
├── appData/             (index.html — tasks, stats, medications, calendar, notebook, financials, focus, commandCenter)
├── stimulantCalculator/ (state: meds, caffeine, sleep, history, workouts, settings)
├── graduationRoadmap/   (grades, deadlines, monthlyPlanner, clinicalData, todoList, graduationPrep, periodicReviews, competencies, patientRecords, dashboardSnapshots, missingNotes)
├── d3Roadmap/           (DEAD — migration fallback only)
└── bodyCompTracker/     (state: profile, today, meals, workouts, weighIns, dailyLogs, gamification)
```

### Sync Pattern (All 4 Apps)
```
Load:  loadFromFirebase() → merge with defaults → initUI()
       Local newer: mergeRemoteCollectionsIntoLocal() → initUI() → deferred saveData()
       Firebase empty/poisoned: loadFromLocalStorage() → push if real data
Save:  saveData() → localStorage IMMEDIATELY → Firebase debounced (2s)
```

### Collection Safety
All collections use **objects with ID keys** (not arrays — Firebase corrupts sparse arrays):
```javascript
generateId(prefix)    // 'meal_abc123'
getValues(collection) // Safe object→array
getCount(collection)  // Safe key count
```

### Cross-App Data Flow
All cross-app reads are READ-ONLY. Exception: `toggleMainAppTask()` writes to index.html's path.
- Stim Calc ↔ Body Comp: projected sleep, meds, caffeine
- Index.html → Body Comp + Stim Calc: medication inventory
- Index.html → Graduation Roadmap: doToday tasks (realtime listener)
- Graduation Roadmap → Body Comp: exams, schedule
- Graduation Roadmap → Stim Calc: week schedule, upcoming deadlines

---

## SYNC PROTECTION SYSTEM (CRITICAL)

### Standard Save Guard Pattern (All 4 Apps)
```javascript
if (!pinValidated) return false;
if (isInitialLoad) return false;
if (!hasLoadedFromCloud) return false;
if (isEmptyState(data)) return false;
if (!data._dataLoaded) return false;
// Guard F (graduation-roadmap only): validateStateIntegrity()
// awaitingPinEntry flag gates fallback timers
```

### isEmptyState() Checks
| App | Empty If Missing ALL Of |
|-----|------------------------|
| index.html | tasks, calendarNotes, calendarEvents, notebook.pages, stats.totalXPGained, focusModeData, commandCenterData |
| graduation-roadmap | customDeadlines, customTasks, appointments, blocks, notes, patients, completedDeadlines, examStudyProgress, grades, exams, editedDeadlines, patientRecords, dashboardSnapshots, completedProcedures, competencies, missingNotes, todoList.items |
| stim-calc | medications, caffeine, history, sleepHistory, allNighterMode, _dataLoaded |
| body-comp | weighIns, today.meals, today.workouts, dailyLogs, bodyCompHistory, today.setupComplete |

### Checkpoint System (All 4 Apps)
Functions: `createCheckpoint()`, `showCheckpointManager()`, `restoreCheckpoint()`, `exportCheckpoint()`, `exportAllCheckpoints()`, `importCheckpoint()`, `importAndRestoreDirectly()`
Force sync: `forceUploadToCloud()`, `forcePullFromCloud()`

---

## SULLY CONTEXT
- **D3 dental student** at BU Goldman, graduating May 2027. ADHD: Adderall XR 50mg max (30mg+20mg).
- **Physical**: 5'8.5", 190 lbs, goal 170 by June 1 2026, ~27% body fat.

---

## AUDIT METHODOLOGY
For "debug everything" requests, use this 4-phase approach:
- **Phase 1**: 6 parallel audit agents by domain (patients, clinical/competencies, import/parsers, firebase-sync, dashboard/rendering, HTML/CSS). Read EVERY line, report bugs, no changes.
- **Phase 2**: Consolidate, deduplicate, categorize by file.
- **Phase 3**: 5 parallel fix agents organized BY FILE (prevents edit conflicts).
- **Phase 4**: QA agent verifies all fixes (syntax, brace balance, spot-check, regression scan).

Full audit history: `docs/audit-history.md`

### Unaudited Areas
- `exam-content.js` `examContentData` accuracy (1000+ lines, not verified against syllabi)
- `monthly-planner.js` calendar rendering edge cases (month boundaries, week-start offsets)
- `periodic-review.js` PDF export — not tested with html2pdf.js
- `daily-planner.js` pomodoro timer and bedtime logic
- Cross-app data flow to body-comp-tracker and stim-calc (read paths)
- `syncSchemaFields()` re-adds dead `rules` field (~2KB per save)
- DEFAULT_COMPETENCIES still has `completionEntries: []` on templates (stripped by migration)

---

## THINGS NOT TO CHANGE WITHOUT TESTING
Firebase config, PIN auth, save/sync debounce, grade calculator math, XR pharmacokinetic model, date parsing, sync protection guards, `isEmptyState()`, checkpoint system.
