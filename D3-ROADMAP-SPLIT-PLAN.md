# D3-ROADMAP-SPLIT-PLAN.md

> **TRIGGER**: When Sully says "execute split d3 roadmap plan", follow this document phase by phase.
> **Skill**: Load `d3-roadmap-dev` skill for context. Read this file fully before starting.
> **Approach**: Use a multi-agent team (5+) — one agent per phase, with verification between phases.
> **Template**: This plan follows the proven SPLIT-PLAN-V2.md methodology (stim-calc split, Feb 2026, commit f1a3998).

---

## DANGER ASSESSMENT — READ THIS FIRST

### Why This Is High-Risk
You are splitting a **17,575-line monolithic HTML file** into **10 interdependent JS modules**.
- **Touching the Firebase sync protection system** — `saveData()` has 5 critical guards. One wrong guard = **silent data wipe across all devices**.
- **4 duplicated merge blocks** must be consolidated into 1 `mergeRemoteState()` function without losing any field mapping.
- **Cross-app data flow** — d3-roadmap reads Do Today tasks from index.html (realtime listener) and writes exams for Body Comp.
- **~250+ onclick handlers** in HTML reference JS functions that must remain globally accessible after extraction.

### What Can Go Catastrophically Wrong

| Failure Mode | Consequence | Likelihood | Phase |
|---|---|---|---|
| Save guard missing after extraction | **All user data silently wiped** on next page load | High | Phase 2 |
| `mergeRemoteState()` loses `_dataLoaded` | Realtime sync wipes data on tab switch | Medium | Phase 2 |
| Script loading order wrong | `undefined is not a function` errors | High | Any |
| Visibility handler not moved to firebase-sync.js | Tab switch causes data loss | Medium | Phase 2 |
| Auto-executing code at parse time | Calls function from later-loaded module → crash | High | Phase 5 |
| Brace imbalance in extracted file | Module fails to parse, all functions undefined | Low | Any |

### Mandatory Safety Protocol
1. **NEVER skip Pre-Flight** — checkpoint + git branch are your lifeline.
2. **NEVER combine phases** — each phase gets its own commit and verification.
3. **NEVER push to main until ALL phases pass** — work on `split-d3-roadmap` branch only.
4. **After Phase 2 (Firebase)**: Run the FULL 9-step Firebase test. If ANY step fails, STOP and revert.
5. **If anything feels wrong**: `git checkout main` — you're back to the working app instantly.

---

## CATASTROPHIC FAILURE RECOVERY

### Tier 1: Phase-Level Rollback (90% of problems)
```bash
git log --oneline
git reset --hard <last-good-commit>
```

### Tier 2: Branch Abandon
```bash
git checkout main
git branch -D split-d3-roadmap
```

### Tier 3: Checkpoint Restore
```
1. Open the app in browser
2. Click the checkpoint manager button
3. Find "Pre-split checkpoint"
4. Click "Restore"
```

### Tier 4: Nuclear Recovery
```bash
git log --oneline | grep "Pre-split"
git checkout <that-hash> -- d3-roadmap.html
rm -rf js/d3-roadmap/
```

---

## WHAT'S BROKEN AND WHY THIS SPLIT FIXES IT

1. **17,575-line monolith**: Unmaintainable. Bug fixes risk breaking unrelated features.
2. **4 duplicated merge blocks**: `loadFromFirebase`, `setupRealtimeSync`, `applyRemoteData`, and `visibilitychange` handler all have ~30 lines of identical field-by-field merge logic. One gets updated, others fall behind → sync bugs.
3. **No error isolation**: If any function throws during init, the entire app fails with no recovery.
4. **9,162 lines of inline JS**: Slow parsing, impossible to navigate, no caching benefit.

---

## FILE STRUCTURE (10 JS Files)

```
d3-roadmap.html                         (~8,413 lines — CSS + HTML only, ZERO inline JS)
js/d3-roadmap/
├── state.js              (~600 lines)  - Globals, defaults, utilities, date/UI helpers
├── firebase-sync.js    (~1,700 lines)  - Auth, load, save, sync, checkpoints, mergeRemoteState
├── deadlines.js          (~700 lines)  - STATIC_DEADLINES, deadline CRUD, rendering
├── grades.js             (~400 lines)  - courseStructures, grade calculator
├── exam-content.js       (~950 lines)  - examContentData, exam cards, study progress
├── clinical.js         (~1,100 lines)  - Patients, appointments, competencies (all 3 subtabs)
├── import-system.js      (~475 lines)  - Lecture/clinical import parsers
├── daily-planner.js      (~560 lines)  - Clock, pomodoro timer, timeline
├── monthly-planner.js  (~1,040 lines)  - Calendar grid, weeks, task CRUD, notes
└── init.js               (~450 lines)  - initUI, dashboard rendering, bootstrap
```

### Script Loading Order (in d3-roadmap.html — ORDER MATTERS)
```html
<!-- Firebase SDK (already in <head>, unchanged) -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>

<!-- App JS Files — dependencies flow downward -->
<script src="js/d3-roadmap/state.js"></script>
<script src="js/d3-roadmap/firebase-sync.js"></script>
<script src="js/d3-roadmap/deadlines.js"></script>
<script src="js/d3-roadmap/grades.js"></script>
<script src="js/d3-roadmap/exam-content.js"></script>
<script src="js/d3-roadmap/clinical.js"></script>
<script src="js/d3-roadmap/import-system.js"></script>
<script src="js/d3-roadmap/daily-planner.js"></script>
<script src="js/d3-roadmap/monthly-planner.js"></script>
<script src="js/d3-roadmap/init.js"></script>
```

### Dependency Graph
```
state.js (foundation — no deps)
  ├→ firebase-sync.js (depends: state utilities, safeLocalStorageSet, isEmptyState)
  ├→ deadlines.js (depends: state date helpers, firebase saveData)
  ├→ grades.js (depends: state, firebase saveData, deadlines renderDeadlines)
  ├→ exam-content.js (depends: state, firebase saveData)
  ├→ clinical.js (depends: state, firebase saveData, deadlines renderDeadlines)
  ├→ import-system.js (depends: state, firebase saveData, clinical initClinicalTab)
  ├→ daily-planner.js (depends: state, firebase saveData)
  ├→ monthly-planner.js (depends: state, firebase saveData)
  └→ init.js (depends: ALL — loaded LAST, calls everything)
```

**NOTE**: Since all files use `<script>` tags (non-module, non-strict mode), all `function` declarations are auto-global. Functions defined in earlier scripts are available to later scripts. The loading order only matters for:
1. Global variable declarations (must exist before referenced at parse time)
2. Auto-executing code (AVOID in all files except init.js)

---

## PRE-FLIGHT CHECKLIST (Do Before Phase 1)

```bash
# 1. Create checkpoint in the app UI (use checkpoint manager button)
#    Name it "Pre-split checkpoint for d3-roadmap"

# 2. Verify app works — open in browser, check:
#    - No console errors
#    - Data loads from Firebase
#    - Sync indicator shows 🟢
#    - Can switch between all 11 tabs

# 3. Commit current state
git add -A && git commit -m "Pre-split checkpoint for d3-roadmap"

# 4. Create feature branch
git checkout -b split-d3-roadmap

# 5. Create directory structure
mkdir -p js/d3-roadmap

# 6. Verify clean state
git status  # Should show "working tree clean"
```

---

## PHASE 1: State Foundation (`state.js`) — RISK: ZERO

### What Goes In

**Global Variable Declarations** (lines 8384-8523):
- `firebaseConfig` (8384-8394)
- `firebaseInitialized`, `database`, `firebaseSyncEnabled`, `currentUser`, `userPath`, `saveDebounceTimer` (8396-8405)
- `roadmapData` initialized with `getDefaultRoadmapData()` (8408-8461)
- `isInitialLoad`, `hasLoadedFromCloud`, `pinValidated` (8521-8523)

**Factory & Validation** (8465-8553):
- `getDefaultRoadmapData()` (8465-8516)
- `isEmptyState(data)` (8526-8549)
- `hasRealData(data)` (8551-8553)

**Data Utilities** (9513-9776):
- `ensureArray(val, fallback)` (9513-9521)
- `generateId(prefix)` (9524-9528)
- `getValues(obj)` (9531-9535)
- `sanitizeFirebaseKey(key)` (9541-9543)
- `getDeadlineId(deadline)` (9545-9550)
- `sanitizeFirebaseData(obj)` (9554-9563)
- `migrateInvalidFirebaseKeys(data)` (9567-9595)
- `getCount(obj)` (9598-9602)
- `safeLocalStorageSet(key, value)` (9606-9633)
- `migrateArrayToObject(data, keyPrefix)` (9636-9658)
- `migrateCompetencies(competencies)` (9661-9728)
- `mergeCompetencies(localComp, cloudComp)` (9732-9740)
- `migrateDailyPlannerBlocks(dailyPlanner)` (9743-9776)

**Date Utilities** (11169-11210):
- `getLocalDateString(date)` (11169-11171)
- `parseLocalDate(dateStr)` (11174-11178)
- `getCountdown(dateStr)` (11180-11186)
- `getCountdownBadge(days, isTbd)` (11188-11205)
- `formatDate(dateStr)` (11207-11210)

**UI Helpers** (11213-11278, 11773-11781, 12185-12230):
- `switchTab(tabId, evt)` (11213-11235)
- `toggleLegacyContent()` (11238-11251)
- `toggleCourse(courseId)` (11254-11260)
- `toggleMandatory(itemId)` (11263-11278)
- `escapeHtml(str)` (11773-11781)
- `showToast(message)` (12185-12191)
- `showCustomAlert(message, title, callback)` (12193-12209)
- `showCustomConfirm(message, onConfirm, onCancel, title)` (12211-12230)

### Steps
1. Create `js/d3-roadmap/state.js` with all functions listed above.
2. Delete those exact functions/declarations from the inline `<script>` in d3-roadmap.html.
3. Add `<script src="js/d3-roadmap/state.js"></script>` as the first app script tag (after Firebase SDK).
4. Verify brace balance: `python3 -c "c=open('js/d3-roadmap/state.js').read(); print('{ =', c.count('{'), '} =', c.count('}'))"`

### Verification
- [ ] Reload app in browser — no console errors
- [ ] `roadmapData` accessible from console
- [ ] `isEmptyState({})` returns `true` from console
- [ ] `getLocalDateString()` returns today's date from console
- [ ] All 11 tabs still switch correctly

### Commit
```bash
git add js/d3-roadmap/state.js d3-roadmap.html
git commit -m "Phase 1: Extract state.js (globals, defaults, utilities, date/UI helpers)"
```

---

## PHASE 2: Firebase/Sync Layer (`firebase-sync.js`) — RISK: VERY HIGH

**One wrong move wipes all user data. Go slow. Test every step.**

### What Goes In

**Module Variables** (declare at top of firebase-sync.js):
- `mainAppTasksRef`, `mainAppTasks` (8402-8403, move from state.js global scope)
- `localChangesSinceLastSync`, `lastSyncTimestamp`, `lastKeepLocalTime`, `KEEP_LOCAL_GRACE_MS` (9373-9377)
- `isLocalUpdate`, `localUpdateTimer` (9379-9380)
- `isFirebaseConnected`, `connectionMonitorRef` (9165-9167)
- `BACKUP_STORAGE_KEY`, `MAX_BACKUPS` (9191-9193)
- `realtimeSyncRef`, `lastRemoteUpdate` (9923-9925)
- `lastForceSync` (10205)
- `lastSaveTime` (10976-10977)

**Sync Status & Connection** (9114-9189, 9385-9396):
- `updateSyncStatus(status, text)` (9114-9145)
- `deepMerge(target, source)` (9148-9163)
- `setupConnectionMonitor()` (9169-9189)
- `markLocalChange()` (9385-9387)
- `setLocalUpdateFlag()` (9389-9396)

**Backup System** (9191-9371):
- `createBackup(reason)` (9195-9238)
- `getBackups()` (9240-9248)
- `restoreBackup(backupId)` (9250-9273)
- `exportBackup()` (9275-9293)
- `importBackup(file)` (9295-9324)
- `showBackupManager()` (9326-9371)

**Conflict Resolution** (9399-9434):
- `showSyncConflictModal(localData, remoteData, onResolve)` (9399-9434)

**Firebase Init & Auth** (9436-9509):
- `initFirebase()` (9436-9481)
- `setupUserAuth(pin)` (9483-9496)
- `promptForPin()` (9498-9509)

**Load & Sync** (9781-10042):
- `loadFromLocalStorage(finalize)` (9781-9838)
- `loadFromFirebase()` (9840-9920) — **REFACTOR**: Replace inline merge with `mergeRemoteState()` call
- `setupRealtimeSync()` (9926-10042) — **REFACTOR**: Replace inline merge with `mergeRemoteState()` call

**NEW: `mergeRemoteState(data)` — Consolidated from 4 locations**

This is the **critical refactoring** of this phase. Currently, 4 functions have duplicated merge logic:
1. `loadFromFirebase()` (9840-9884)
2. `setupRealtimeSync()` (9971-10004)
3. `applyRemoteData()` (10280-10310)
4. `visibilitychange` handler (15763-15796)

Consolidate into ONE function:
```javascript
function mergeRemoteState(data) {
    if (!data) return;

    roadmapData = {
        ...roadmapData,
        pedsLockedIn: data.pedsLockedIn !== undefined ? data.pedsLockedIn : roadmapData.pedsLockedIn,
        mandatoryItems: { ...roadmapData.mandatoryItems, ...(data.mandatoryItems || {}) },
        grades: { ...roadmapData.grades, ...(data.grades || {}) },
        editedDeadlines: { ...roadmapData.editedDeadlines, ...(data.editedDeadlines || {}) },
        completedDeadlines: { ...roadmapData.completedDeadlines, ...(data.completedDeadlines || {}) },
        customDeadlines: {
            ...migrateArrayToObject(roadmapData.customDeadlines, 'deadline'),
            ...migrateArrayToObject(data.customDeadlines, 'deadline')
        },
        deletedDeadlines: {
            ...migrateArrayToObject(roadmapData.deletedDeadlines, 'deleted'),
            ...migrateArrayToObject(data.deletedDeadlines, 'deleted')
        },
        examStudyProgress: { ...roadmapData.examStudyProgress, ...(data.examStudyProgress || {}) },
        monthlyPlanner: {
            notes: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.notes, 'note'),
                ...migrateArrayToObject(data.monthlyPlanner?.notes, 'note')
            },
            customTasks: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.customTasks, 'ctask'),
                ...migrateArrayToObject(data.monthlyPlanner?.customTasks, 'ctask')
            },
            overriddenStatic: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.overriddenStatic, 'override'),
                ...migrateArrayToObject(data.monthlyPlanner?.overriddenStatic, 'override')
            },
            completedTasks: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.completedTasks, 'completed'),
                ...migrateArrayToObject(data.monthlyPlanner?.completedTasks, 'completed')
            }
        },
        clinicalData: {
            patients: { ...roadmapData.clinicalData?.patients, ...(data.clinicalData?.patients || {}) },
            appointments: {
                ...migrateArrayToObject(roadmapData.clinicalData?.appointments, 'appt'),
                ...migrateArrayToObject(data.clinicalData?.appointments, 'appt')
            },
            completedProcedures: {
                ...migrateArrayToObject(roadmapData.clinicalData?.completedProcedures, 'proc'),
                ...migrateArrayToObject(data.clinicalData?.completedProcedures, 'proc')
            },
            competencies: mergeCompetencies(
                roadmapData.clinicalData?.competencies,
                data.clinicalData?.competencies
            )
        },
        dailyPlanner: migrateDailyPlannerBlocks(data.dailyPlanner || roadmapData.dailyPlanner),
        exams: {
            ...migrateArrayToObject(roadmapData.exams, 'exam'),
            ...migrateArrayToObject(data.exams, 'exam')
        },
        lastSaved: data.lastSaved,
        _version: Math.max(data._version || 0, roadmapData._version || 0),
        _lastModified: data._lastModified || roadmapData._lastModified,
        _dataLoaded: true  // CRITICAL: Always true after merge
    };

    migrateInvalidFirebaseKeys(roadmapData);
}
```

**Call sites to refactor**:
- `loadFromFirebase()`: Replace inline merge → `mergeRemoteState(cloudData)`
- `setupRealtimeSync()` callback: Replace inline merge → `mergeRemoteState(snapshot.val())`
- `applyRemoteData()`: Replace inline merge → `mergeRemoteState(data)`
- `visibilitychange` visible handler: Replace inline merge → `mergeRemoteState(cloudData)`

**Cross-App Sync** (10047-10200):
- `setupMainAppTasksSync()` (10047-10078)
- `updateDoTodaySyncStatus(status, message)` (10080-10095)
- `renderDoTodayTasks()` (10097-10159)
- `toggleMainAppTask(taskId)` (10161-10200)

**Force Operations** (10206-10974):
- `forceCloudSync()` (10206-10276) — **REFACTOR**: Use `mergeRemoteState()` for merge choice
- `applyRemoteData(data)` (10280-10318) — **REFACTOR**: Call `mergeRemoteState(data)` internally
- `forceUploadToCloud()` (10846-10922)
- `forcePullFromCloud()` (10924-10974)

**Save** (10979-11094):
- `saveData()` — **MUST PRESERVE ALL 5 GUARDS EXACTLY**:
  ```javascript
  if (isInitialLoad) return false;                          // Guard 1
  if (!hasLoadedFromCloud) return false;                    // Guard 2
  if (isEmptyState(roadmapData)) return false;              // Guard 3
  if (!roadmapData._dataLoaded) return false;               // Guard 4
  if (firebaseSyncEnabled && !pinValidated) return false;   // Guard 5
  ```

**Checkpoints** (10324-10840):
- All 12 checkpoint functions: `getCheckpointKey`, `getDataCountForCheckpoint`, `createCheckpoint`, `showCheckpointManager`, `escapeHtmlForCheckpoint`, `restoreCheckpoint`, `deleteCheckpoint`, `exportCheckpoint`, `exportAllCheckpoints`, `isValidAppData`, `importCheckpoint`, `importAndRestoreDirectly`

**Event Handlers** (15727-15811) — MOVE from bottom of file to firebase-sync.js:
- `visibilitychange` listener (15727-15803) — **REFACTOR**: Use `mergeRemoteState()` for visible handler
- `beforeunload` listener (15806-15811)

### CRITICAL TEST SEQUENCE (do ALL of these — if ANY fails, STOP)
- [ ] **Initial Load**: Reload app → sync indicator shows 🟢 connected
- [ ] **Data Persistence**: Add a new deadline → reload page → deadline is still there
- [ ] **Realtime Sync**: Open app in second tab → check off a competency in tab 1 → instantly reflects in tab 2
- [ ] **Checkpoint Create**: Open Checkpoint Manager → Create new checkpoint → appears in list
- [ ] **Checkpoint Export**: Click Export on a checkpoint → valid JSON file downloads
- [ ] **Visibility Guard**: Switch to another browser tab, wait 5 seconds, switch back → no data loss
- [ ] **Auth Flow**: Open in incognito window → enter PIN → data loads from cloud
- [ ] **Cross-App Sync**: Do Today tasks from main app appear on Dashboard
- [ ] **Save Guards**: Verify `saveData()` has ALL 5 guards (grep for the exact pattern)

### Commit
```bash
git add js/d3-roadmap/firebase-sync.js d3-roadmap.html
git commit -m "Phase 2: Extract firebase-sync.js, consolidate 4 merge blocks into mergeRemoteState()"
```

---

## PHASE 3: Deadlines + Grades + Exam Content — RISK: MEDIUM

### `deadlines.js` (~700 lines)

**Static Data**:
- `STATIC_DEADLINES` array (11099-11164) — 44 hardcoded deadlines
- `exams` array (~11099-11164) — 9 major exams
- `let deadlines = []` — working copy, rebuilt each `initUI()`

**Rendering**:
- `renderDeadlines()` (11555-11643)
- `renderExamCountdown()` (11783-11800)

**CRUD**:
- `handleDateChange(inputEl)` (11646-11706)
- `handleTextEdit(inputEl)` (11709-11760)
- `handleDeadlineKeydown(event, inputEl)` (11762-11771)
- `addNewDeadline()` (12232-12304)
- `submitNewDeadline()` (12306-12367)
- `toggleDeadlineDone(index)` (12370-12410)
- `toggleDeadlineDoneById(deadlineId)` (12413-12421)
- `showGradeInputModal(index, deadline)` (12434-12471)
- `submitDeadlineGradeById()` (12474-12486)
- `submitDeadlineGrade(index)` (12488-12534)
- `syncDeadlineToGrades(deadline, isComplete, grade)` (12537-12652)
- `deleteDeadline(index)` (12655-12726)
- `deleteDeadlineById(deadlineId)` (12424-12432)

### `grades.js` (~400 lines)

**Static Data**:
- `courseStructures` (11803-11881) — 6 courses with components and weights

**Functions**:
- `loadCourseGrades()` (11883-11977)
- `updateGrade(courseId, componentId, value)` (11979-11991)
- `syncGradeToDeadline(courseId, componentId, grade)` (11994-12076)
- `calculateNeeded()` (12078-12170)
- `getGradeLetter(percent)` (12172-12183)

### `exam-content.js` (~950 lines)

**Static Data**:
- `examContentData` (8565-9111) — ~550 lines of hardcoded course/lecture data
- `courseDiscrepancies` (12731-12769)

**Functions**:
- `getTotalTopicsForCourse(courseKey)` (13103-13112)
- `getCourseStudyProgress(courseKey)` (13114-13136)
- `getDaysUntil(dateStr)` (13138-13146)
- `formatExamDate(dateStr)` (13148-13151)
- `getExamProgress(examId, lectures, reviewContent)` (13153-13184)
- `toggleLectureStudied(examId, lecNum, isReview)` (13186-13191)
- `markAllStudied(examId, lectures, isReview, markAs)` (13193-13200)
- `toggleContentSection(sectionId)` (13202-13209)
- `renderExamCard(exam)` (13211-13470)
- `renderLectureList(examId, lectures, isReview)` (13472-13503)
- `loadExamCourseContent()` (12771-13100) — massive renderer with course overview, modules, other components, quiz details, presentations

### Steps
1. Create all 3 files with their assigned functions.
2. Delete those functions from inline `<script>`.
3. Add `<script src>` tags in order: deadlines → grades → exam-content.
4. Verify brace balance for each file.

### Verification
- [ ] **Deadlines tab**: View all 4 months, add new deadline, edit text/date, check off (with grade input), delete
- [ ] **Grades tab**: Pick each course, enter grades, verify "Grade Needed" calculates correctly
- [ ] **Grade-Deadline sync**: Enter a grade in Grades tab → deadline auto-marks as complete
- [ ] **Exam Content tab**: Pick each course, expand/collapse sections, toggle lectures studied, verify progress bar
- [ ] **Dashboard**: Stats render correctly, deadline countdown badges show

### Commit
```bash
git add js/d3-roadmap/deadlines.js js/d3-roadmap/grades.js js/d3-roadmap/exam-content.js d3-roadmap.html
git commit -m "Phase 3: Extract deadlines.js + grades.js + exam-content.js"
```

---

## PHASE 4: Clinical + Import + Planners — RISK: MEDIUM

### `clinical.js` (~1,100 lines)

**Static Data**:
- `DEFAULT_COMPETENCIES` (14102-14344) — 13 categories with sections and items

**Module Variables**:
- `let currentPatientTasks = []` (13507)
- `let expandedCompCategories = new Set()` (14452)
- `let compItemModalState = {}` (14766-14771)

**Clinical Management**:
- `switchClinicalSubtab(subtab, btn)` (13509-13518)
- `initClinicalTab()` (13520-13525)
- `updateClinicalStats()` (13527-13558)

**Patient CRUD** (13562-13835):
- `renderPatientsList`, `filterPatients`, `openAddPatientModal`, `editPatient`, `closePatientModal`, `addPatientTask`, `removePatientTask`, `updatePatientTask`, `renderPatientTasksInModal`, `savePatient`, `deletePatient`

**Appointment CRUD** (13839-14097):
- `renderAppointmentsList`, `renderAppointmentCard`, `formatAptTime`, `openAddAppointmentModal`, `editAppointment`, `closeAppointmentModal`, `saveAppointment`, `deleteAppointment`

**Competencies** (14346-14953):
- `getCompetenciesData`, `getItemStatus`, `calculateCategoryStats`, `calculateOverallStats`, `getWhatsNextItems`, `renderCompetencies`, `toggleCompCategory`, `setCompItemStatus`, `adjustCompItem`, `updateCompNotes`, `showCompMilestone`, `resetCompetencies`, `openAddCompItemModal`, `openEditCompItemModal`, `closeCompItemModal`, `saveCompItem`, `deleteCompItem`

### `import-system.js` (~475 lines)

**Module Variables**:
- `let parsedLectures = []` (14958)
- `let parsedAppointments = []` (14959)

**Lecture Import** (14963-15208):
- `openLectureImportModal`, `closeLectureImportModal`, `parseLectureFormat`, `parseLectureBlock`, `parseImportDate`, `parseImportTime`, `previewLectureImport`, `formatTime12h`, `confirmLectureImport`

**Clinical Import** (15212-15428):
- `openClinicalImportModal`, `closeClinicalImportModal`, `parseClinicalFormat`, `parseAppointmentBlock`, `previewClinicalImport`, `confirmClinicalImport`

**Cross-Tab Sync** (15431-15495):
- `syncClinicalToMonthlyPlanner()`, `calculateEndTime()`, `timeToMinutes()`

### `daily-planner.js` (~560 lines)

**Module Variables** (declare at top):
- `let dpWorkMinutes = 25`, `dpBreakMinutes = 5`, `dpCurrentSeconds = 1500`
- `let dpIsWorkSession = true`, `dpTimerInterval = null`
- `let dpSelectedDuration = 30`, `dpClockInterval = null`

**All dp* functions** (15842-16401):
- `initDailyPlanner`, `dpStartClock`, `dpUpdateCurrentTimeLine`, `dpSelectPomodoro`, `dpStartTimer`, `dpPauseTimer`, `dpResetTimer`, `dpUpdateTimerDisplay`, `dpCompleteSession`, `dpPlayNotification`, `dpPopulateDeadlineDropdown`, `dpSelectFromDropdown`, `dpSetTimeToNow`, `dpSelectDuration`, `dpAddEvent`, `dpRenderTimeline`, `dpRenderEvent`, `dpFormatTime`, `dpQuickAddAtHour`, `dpToggleEvent`, `dpDeleteEvent`, `dpUpdateStats`, `dpScrollToNow`, `dpClearDay`, `saveDailyPlannerData`

### `monthly-planner.js` (~1,040 lines)

**Static Data & Module Variables** (16407-16546):
- `MP_WEEKS` array (16407-16413) — base weeks, dynamically extended
- `MP_STATIC_TASKS` array (16505-16542) — 36 hardcoded tasks
- `let mpCurrentTask = null`, `mpIsEditing = false`, `mpNoteSaving = false`

**All mp* functions and helpers** (16416-17489):
- `extendWeeksIfNeeded`, `formatDateYMD`, `initMonthlyPlanner`, `mpToggleTaskComplete`, `mpRenderAllCalendars`, `mpCreateWeekSection`, `mpToggleWeek`, `mpExpandAllWeeks`, `mpCollapseAllWeeks`, `mpJumpToCurrentWeek`, `mpGetDaysOut`, `mpCreateCalendarGrid`, `mpGetWeekDays`, `mpGetWeekTasks`, `mpCreateTaskBlock`, `mpFormatTime`, `mpCreateUntimedSection`, `mpOpenAddModal`, `mpClickCell`, `mpEditTaskFromBlock`, `mpEditTask`, `mpCloseTaskModal`, `mpSaveTask`, `mpDeleteCurrentTask`, `mpUpdateStats`, `mpAddNote`, `mpRenderNotes`, `mpEditNote`, `mpCancelNoteEdit`, `mpSaveNoteEdit`, `mpDeleteNote`

### Steps
1. Create all 4 files.
2. Delete functions from inline `<script>`.
3. Add `<script src>` tags in order: clinical → import-system → daily-planner → monthly-planner.
4. Verify brace balance for each file.

### Verification
- [ ] **Clinical Patients**: Add patient, edit, delete, filter, search
- [ ] **Clinical Appointments**: Add appointment (with "Add to Deadlines" checkbox), edit, delete
- [ ] **Competencies**: View progress rings, check off items, increment counts, reset all, add/edit/delete custom items
- [ ] **Import Lectures**: Open modal, paste data, preview, confirm import → tasks appear in Monthly Planner
- [ ] **Import Clinical**: Open modal, paste data, preview, confirm → appointments created
- [ ] **Daily Planner**: Start clock, add event, toggle complete, pomodoro timer (start/pause/reset), clear day
- [ ] **Monthly Planner**: Navigate weeks, expand/collapse, add task, edit task (static→custom conversion), delete, toggle complete, jump to current week, add/edit/delete notes

### Commit
```bash
git add js/d3-roadmap/clinical.js js/d3-roadmap/import-system.js js/d3-roadmap/daily-planner.js js/d3-roadmap/monthly-planner.js d3-roadmap.html
git commit -m "Phase 4: Extract clinical.js + import-system.js + daily-planner.js + monthly-planner.js"
```

---

## PHASE 5: Init + Dashboard (`init.js`) — RISK: HIGH

### What Goes In

**Dashboard Rendering** (11281-11553):
- `renderDashboard()` (11281-11382)
- `renderClinicalDashboardWidget()` (11384-11472)
- `renderStudyProgressWidget()` (11474-11553)

**Bootstrap** (15498-15838):
- `initUI()` (15498-15719) — **WRAP in try/catch per-tab for error isolation**:
  ```javascript
  function initUI() {
      // Build deadlines array from STATIC + custom
      // ... (existing deadline build logic)

      // Render each tab in try/catch so one failure doesn't kill all
      try { renderDashboard(); } catch(e) { console.error('[initUI] Dashboard error:', e); }
      try { renderDeadlines(); } catch(e) { console.error('[initUI] Deadlines error:', e); }
      try { loadCourseGrades(); } catch(e) { console.error('[initUI] Grades error:', e); }
      try { renderExamCountdown(); } catch(e) { console.error('[initUI] Exam countdown error:', e); }
      try { initMonthlyPlanner(); } catch(e) { console.error('[initUI] Monthly planner error:', e); }
      try { initClinicalTab(); } catch(e) { console.error('[initUI] Clinical error:', e); }
  }
  ```
- `init()` (15721-15724) — calls `initFirebase()`
- 2-second fallback timeout (15817-15828)
- DOMContentLoaded fallback (15831-15838)

**Keyboard Shortcuts** (17491-17530):
- Escape key handler for modal dismissal
- 'N' key for Monthly Planner note focus

**DOMContentLoaded listener for note input** (17533-17543)

**Direct `init()` call** (15814) — The ONLY auto-executing code. MUST be in init.js.

### CRITICAL RULE
**ZERO auto-executing code in any file except init.js.** All other files only define functions and variables. The direct `init()` call at the bottom of init.js is the ONLY thing that runs at parse time.

### Steps
1. Create `js/d3-roadmap/init.js` with remaining functions.
2. Delete ALL remaining inline `<script>` content from d3-roadmap.html.
3. Verify d3-roadmap.html has ZERO inline JavaScript — only `<script src>` tags.
4. The `<script>` tag section should look exactly like the Loading Order above.
5. Verify brace balance.

### FULL TEST SEQUENCE — Every Single Feature
- [ ] **App Boot**: Page loads without console errors, sync shows 🟢
- [ ] **Tab Navigation**: Click through all 11 tabs rapidly — no glitches or errors
- [ ] **Dashboard**: Stats render, upcoming deadlines show, clinical widget renders, study progress shows, Do Today tasks sync
- [ ] **Deadlines**: All 4 month tables render, add/edit/delete/complete work, countdown badges correct
- [ ] **Courses**: Expand/collapse all 8 courses
- [ ] **Grades**: Grade calculator works for all 6 courses, "Grade Needed" calculates correctly
- [ ] **Exam Content**: All courses load, study progress tracks, lecture checkboxes work
- [ ] **Mandatory**: Checkboxes toggle and persist, exam countdown table renders
- [ ] **Daily Planner**: Clock updates, pomodoro timer works (start/pause/reset/complete), timeline renders events, task add/toggle/delete works
- [ ] **Monthly Planner**: Calendar grids render, week expand/collapse, add/edit/delete tasks, static→custom conversion, notes CRUD, jump to current week
- [ ] **Clinical**: Patients CRUD, appointments CRUD (with deadline creation), competencies progress, all 3 subtabs work
- [ ] **Always Remember**: Content renders, legacy toggle works
- [ ] **Firebase**: Phase 2 tests all still pass (realtime sync, persistence, checkpoints)
- [ ] **Keyboard Shortcuts**: Escape closes modals, 'N' focuses note input on Monthly tab
- [ ] **Mobile**: Resize to mobile width — tabs scroll, tables don't break, cards stack

### Commit
```bash
git add js/d3-roadmap/init.js d3-roadmap.html
git commit -m "Phase 5: Extract init.js, add try/catch error isolation to initUI()"
```

---

## PHASE 6: Merge & Deploy

### Pre-Merge Verification

**Code Quality**:
```bash
# Verify all 10 modules have balanced braces
for f in js/d3-roadmap/*.js; do
  echo -n "$f: "
  python3 -c "c=open('$f').read(); o=c.count('{'); cl=c.count('}'); print(f'{{ {o}  }} {cl}  {\"✓ BALANCED\" if o==cl else \"✗ MISMATCH\"}')"
done

# Verify zero inline JS in HTML
grep -c '<script>' d3-roadmap.html  # Should match only <script src="..."> tags
```

**Functional**: ALL Phase 5 tests pass.

**Sign-Off Checklist**:
- [ ] All 10 modules have balanced braces
- [ ] HTML has ZERO inline `<script>` content (only `<script src>` tags)
- [ ] All 5 save guards present in firebase-sync.js `saveData()`
- [ ] `mergeRemoteState()` used at all 4 call sites (no duplicated merge logic)
- [ ] No duplicate function definitions across modules
- [ ] Script loading order matches dependency graph
- [ ] No auto-executing code in any file except init.js

### Merge & Push
```bash
git checkout main
git merge split-d3-roadmap
git push origin main
# Live in ~30s at: https://suleman7-dmd.github.io/dental-quest/d3-roadmap.html
```

### Post-Deploy Verification
- [ ] Open live URL — app loads, sync shows 🟢
- [ ] All 11 tabs work
- [ ] Create a test checkpoint → export it → verify JSON is valid
- [ ] Open in second device → data syncs correctly

---

## SYNC PROTECTION PRESERVATION MAP

After split, these protections must be in the correct files:

| Protection | What | File |
|---|---|---|
| 1 | Guard flags (`isInitialLoad`, `hasLoadedFromCloud`, `pinValidated`) | `state.js` (declarations) |
| 2 | Default state (`_version: 0`, `_dataLoaded: false`) | `state.js` → `getDefaultRoadmapData()` |
| 3 | 5 guards in `saveData()` | `firebase-sync.js` |
| 4 | Protected `loadFromFirebase()` | `firebase-sync.js` |
| 5 | Protected `setupRealtimeSync()` with echo prevention | `firebase-sync.js` |
| 6 | Protected `visibilitychange` + `beforeunload` handlers | `firebase-sync.js` |
| 7 | `mergeRemoteState()` preserves `_dataLoaded = true` | `firebase-sync.js` |
| 8 | `safeLocalStorageSet()` quota protection | `state.js` |
| 9 | Cross-app Do Today sync (read-only) | `firebase-sync.js` |
| 10 | `isEmptyState()` checks 10+ field groups | `state.js` |

---

## COMPARISON TO SUCCESSFUL SPLITS

| Metric | Stim-Calc (10 modules) | Index.html (12 modules) | D3-Roadmap (10 modules) |
|---|---|---|---|
| Original lines | 11,526 | 22,900 | 17,575 |
| JS module lines | 8,224 | 10,762 | ~7,975 |
| HTML-only lines | 2,632 | 12,186 | ~8,413 |
| Largest module | 1,911 (ui-sections) | 1,599 (tasks) | ~1,700 (firebase-sync) |
| Smallest module | 229 (circadian) | 237 (init) | ~400 (grades) |
| Phase count | 6 | 8 | 6 |
| Save guards | 5 | 5 | 5 |
| Merge consolidation | 4→1 mergeRemoteState | buildSaveData helper | 4→1 mergeRemoteState |
| Key refactor | recalculate() try/catch | buildSaveData() | initUI() try/catch |

---

## APPENDIX: FUNCTION-TO-MODULE COMPLETE ASSIGNMENT

### state.js (34 functions + globals)
`firebaseConfig`, `roadmapData`, sync flags, `getDefaultRoadmapData`, `isEmptyState`, `hasRealData`, `ensureArray`, `generateId`, `getValues`, `sanitizeFirebaseKey`, `getDeadlineId`, `sanitizeFirebaseData`, `migrateInvalidFirebaseKeys`, `getCount`, `safeLocalStorageSet`, `migrateArrayToObject`, `migrateCompetencies`, `mergeCompetencies`, `migrateDailyPlannerBlocks`, `getLocalDateString`, `parseLocalDate`, `getCountdown`, `getCountdownBadge`, `formatDate`, `switchTab`, `toggleLegacyContent`, `toggleCourse`, `toggleMandatory`, `escapeHtml`, `showToast`, `showCustomAlert`, `showCustomConfirm`

### firebase-sync.js (42 functions + NEW mergeRemoteState)
`updateSyncStatus`, `deepMerge`, `setupConnectionMonitor`, `markLocalChange`, `setLocalUpdateFlag`, `createBackup`, `getBackups`, `restoreBackup`, `exportBackup`, `importBackup`, `showBackupManager`, `showSyncConflictModal`, `initFirebase`, `setupUserAuth`, `promptForPin`, `loadFromLocalStorage`, `loadFromFirebase`, `setupRealtimeSync`, **`mergeRemoteState`** (NEW), `setupMainAppTasksSync`, `updateDoTodaySyncStatus`, `renderDoTodayTasks`, `toggleMainAppTask`, `forceCloudSync`, `applyRemoteData`, `forceUploadToCloud`, `forcePullFromCloud`, `saveData`, `getCheckpointKey`, `getDataCountForCheckpoint`, `createCheckpoint`, `showCheckpointManager`, `escapeHtmlForCheckpoint`, `restoreCheckpoint`, `deleteCheckpoint`, `exportCheckpoint`, `exportAllCheckpoints`, `isValidAppData`, `importCheckpoint`, `importAndRestoreDirectly`, visibilitychange handler, beforeunload handler

### deadlines.js (14 functions + static data)
`STATIC_DEADLINES`, `exams`, `deadlines`, `renderDeadlines`, `renderExamCountdown`, `handleDateChange`, `handleTextEdit`, `handleDeadlineKeydown`, `addNewDeadline`, `submitNewDeadline`, `toggleDeadlineDone`, `toggleDeadlineDoneById`, `showGradeInputModal`, `submitDeadlineGradeById`, `submitDeadlineGrade`, `syncDeadlineToGrades`, `deleteDeadline`, `deleteDeadlineById`

### grades.js (5 functions + static data)
`courseStructures`, `loadCourseGrades`, `updateGrade`, `syncGradeToDeadline`, `calculateNeeded`, `getGradeLetter`

### exam-content.js (11 functions + static data)
`examContentData`, `courseDiscrepancies`, `getTotalTopicsForCourse`, `getCourseStudyProgress`, `getDaysUntil`, `formatExamDate`, `getExamProgress`, `toggleLectureStudied`, `markAllStudied`, `toggleContentSection`, `renderExamCard`, `renderLectureList`, `loadExamCourseContent`

### clinical.js (28 functions + static data)
`DEFAULT_COMPETENCIES`, `currentPatientTasks`, `expandedCompCategories`, `compItemModalState`, `switchClinicalSubtab`, `initClinicalTab`, `updateClinicalStats`, `renderPatientsList`, `filterPatients`, `openAddPatientModal`, `editPatient`, `closePatientModal`, `addPatientTask`, `removePatientTask`, `updatePatientTask`, `renderPatientTasksInModal`, `savePatient`, `deletePatient`, `renderAppointmentsList`, `renderAppointmentCard`, `formatAptTime`, `openAddAppointmentModal`, `editAppointment`, `closeAppointmentModal`, `saveAppointment`, `deleteAppointment`, `getCompetenciesData`, `getItemStatus`, `calculateCategoryStats`, `calculateOverallStats`, `getWhatsNextItems`, `renderCompetencies`, `toggleCompCategory`, `setCompItemStatus`, `adjustCompItem`, `updateCompNotes`, `showCompMilestone`, `resetCompetencies`, `openAddCompItemModal`, `openEditCompItemModal`, `closeCompItemModal`, `saveCompItem`, `deleteCompItem`

### import-system.js (15 functions)
`parsedLectures`, `parsedAppointments`, `openLectureImportModal`, `closeLectureImportModal`, `parseLectureFormat`, `parseLectureBlock`, `parseImportDate`, `parseImportTime`, `previewLectureImport`, `formatTime12h`, `confirmLectureImport`, `openClinicalImportModal`, `closeClinicalImportModal`, `parseClinicalFormat`, `parseAppointmentBlock`, `previewClinicalImport`, `confirmClinicalImport`, `syncClinicalToMonthlyPlanner`, `calculateEndTime`, `timeToMinutes`

### daily-planner.js (25 functions)
Timer state vars, `initDailyPlanner`, `dpStartClock`, `dpUpdateCurrentTimeLine`, `dpSelectPomodoro`, `dpStartTimer`, `dpPauseTimer`, `dpResetTimer`, `dpUpdateTimerDisplay`, `dpCompleteSession`, `dpPlayNotification`, `dpPopulateDeadlineDropdown`, `dpSelectFromDropdown`, `dpSetTimeToNow`, `dpSelectDuration`, `dpAddEvent`, `dpRenderTimeline`, `dpRenderEvent`, `dpFormatTime`, `dpQuickAddAtHour`, `dpToggleEvent`, `dpDeleteEvent`, `dpUpdateStats`, `dpScrollToNow`, `dpClearDay`, `saveDailyPlannerData`

### monthly-planner.js (31 functions + static data)
`MP_WEEKS`, `MP_STATIC_TASKS`, `mpCurrentTask`, `mpIsEditing`, `mpNoteSaving`, `extendWeeksIfNeeded`, `formatDateYMD`, `initMonthlyPlanner`, `mpToggleTaskComplete`, `mpRenderAllCalendars`, `mpCreateWeekSection`, `mpToggleWeek`, `mpExpandAllWeeks`, `mpCollapseAllWeeks`, `mpJumpToCurrentWeek`, `mpGetDaysOut`, `mpCreateCalendarGrid`, `mpGetWeekDays`, `mpGetWeekTasks`, `mpCreateTaskBlock`, `mpFormatTime`, `mpCreateUntimedSection`, `mpOpenAddModal`, `mpClickCell`, `mpEditTaskFromBlock`, `mpEditTask`, `mpCloseTaskModal`, `mpSaveTask`, `mpDeleteCurrentTask`, `mpUpdateStats`, `mpAddNote`, `mpRenderNotes`, `mpEditNote`, `mpCancelNoteEdit`, `mpSaveNoteEdit`, `mpDeleteNote`

### init.js (6 functions + bootstrap)
`renderDashboard`, `renderClinicalDashboardWidget`, `renderStudyProgressWidget`, `initUI`, `init`, keyboard shortcuts handler, DOMContentLoaded handler, direct `init()` call
