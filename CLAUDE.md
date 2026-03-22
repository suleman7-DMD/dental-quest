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
- **8 import block types**: PATIENT_RECORD, PATIENT_UPDATE, REQUIREMENTS_MATCH, REQUIREMENTS_STATUS, SPS_DASHBOARD_UPDATE, APPOINTMENTS, MISSING_NOTES, TODO_LIST — all parseable in one atomic paste.
- **Multi-line parser is lenient**: `parsePatientRecord()` and `parsePatientUpdate()` accept ANY non-empty line that doesn't start with a known field key as a continuation of the current field. 2+ space indentation is recommended but NOT required. Fixed Mar 22 2026 — old parser required `^\s{2,}` which silently dropped text when copy-pasted from markdown-rendered Claude webchat output.
- **Imported requirements on patient**: REQUIREMENTS_MATCH `canFulfill` entries are stored as `patient.importedRequirements[]`. `computeRequirementMatches()` uses these (authoritative) instead of keyword fallback when available. Also stores `patient.priorityNotes` and `patient.highValue` from the REQUIREMENTS_MATCH block.
- **Webchat exports MUST use code fences**: Claude webchat project instructions require all export blocks be wrapped in triple-backtick code fences. Without this, markdown rendering destroys `---` delimiters (renders as `<hr>`) and strips leading spaces, causing parser truncation. Webchat instructions backup: `docs/claude-webchat-project-instructions.md`.

---

## PROJECT OVERVIEW

| File | Purpose |
|------|---------|
| `index.html` + `js/dental-quest/*.js` (12 modules) | Main app: gamified task management, focus mode, financials, calendar, meds |
| `d3-roadmap.html` (REDIRECT SHIM) | Redirects to graduation-roadmap.html with localStorage migration. `js/d3-roadmap/` deleted (commit `6b64461`). |
| `graduation-roadmap.html` + `js/graduation-roadmap/*.js` (11 modules) | Graduation tracker: mission control, deadlines, clinical, patients (19 pre-filled), competencies, schedule, academics, grad prep. Patient tracker imports from Claude webchat (5 formats). Own namespace: `graduationRoadmapData` / `graduationRoadmap`. |
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
