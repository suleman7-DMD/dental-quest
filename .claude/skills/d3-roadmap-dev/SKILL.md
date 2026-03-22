---
name: d3-roadmap-dev
description: |
  Develop and debug the Graduation Roadmap app (d3-roadmap.html) — a clinical/academic tracker for a D3/D4 dental student with graduation requirements, competencies, grades, deadlines, planners, and exam content.
  Use this skill when the user asks to modify, fix, or add features to d3-roadmap.html. Trigger phrases: "d3 roadmap", "graduation roadmap", "d3-roadmap.html", "roadmap app", "deadlines", "clinical tracking", "competencies", "dental school", "academic tracker", "grade calculator", "monthly planner", "daily planner", "exam content", "mandatory items", "checkpoint", "course grades", "roadmap", "grades", "GPA", "courses", "classes", "school", "academic", "clinic", "patients", "appointments", "exams", "studying", "schedule", "planner", "tabs", "dashboard", "mission control", "clinic requirements", "graduation prep", "CDCA", "ADEX", "INBDE", "externship", "competency", "formative", "summative", "do today", "always remember".
  Do NOT use this skill for dental quest index.html, body-comp-tracker.html, stimulant-elimination-calculator.html, or lecture-prompt-transformer.html — those are separate apps with their own skills.
globs:
  - "d3-roadmap.html"
  - "js/d3-roadmap/*.js"
compatibility: Claude Code CLI. Requires file system access (Read, Edit, Write, Grep, Glob, Bash).
metadata:
  author: Sully
  version: 4.0.0
  file: d3-roadmap.html + js/d3-roadmap/*.js (10 modules)
  lines: ~9290 HTML + ~9600 JS
  last-verified: 2026-03-12
---

# D3 Roadmap Development Patterns

## USE CASES

This skill enables 3 core workflows:

**Use Case 1: Debug a grade calculation or deadline issue**
Trigger: User says "grade is wrong" or "deadline not showing" or "peds score off"
Steps: Read `courseStructures` in grades.js -> Read `loadCourseGrades()` in grades.js -> Read `calculateNeeded()` in grades.js -> Read `initUI()` deadline merge in init.js
Result: Root cause identified (e.g., wrong component weight, deadline not in STATIC_DEADLINES, editedDeadlines not applying)
Success criteria: Grade calculation matches manual weighted average, deadlines render correctly, completedDeadlines persist

**Use Case 2: Add or modify a feature**
Trigger: User says "add a new tab" or "change clinical tracking" or "modify competencies"
Steps: Read state structure in references/state-and-data.md -> Grep for relevant function -> Read 50+ lines of context -> Edit surgically -> Read saveData() to verify guards intact
Result: Feature added without breaking sync, guards, or existing data
Success criteria: Feature works, all 5 Firebase guards intact in saveData(), brace balance unchanged

**Use Case 3: Fix a Firebase sync issue**
Trigger: User says "data not saving" or "sync broken" or "changes lost"
Steps: Read `saveData()` in firebase-sync.js (check 5 guards) -> Grep for isInitialLoad/hasLoadedFromCloud/pinValidated flags in firebase-sync.js -> Read `loadFromFirebase()` to verify _dataLoaded preserved
Result: Sync issue identified and fixed without compromising data protection
Success criteria: saveData() returns true, data persists across refresh, all 5 guards still present

---

## INSTRUCTIONS

### Step 1: Identify what area of the app is involved
Read the APP OVERVIEW below. Determine which subsystem is relevant:
- Grade calculations? -> See [references/grades-and-deadlines.md](references/grades-and-deadlines.md)
- Deadline tracking? -> See [references/grades-and-deadlines.md](references/grades-and-deadlines.md)
- Clinical/competencies? -> See [references/clinical-and-competencies.md](references/clinical-and-competencies.md)
- Monthly/daily planner? -> See [references/monthly-and-daily-planner.md](references/monthly-and-daily-planner.md)
- Firebase/sync? -> Check the 5 FIREBASE GUARDS section below, and see [references/sync-and-firebase.md](references/sync-and-firebase.md)
- Tabs/UI rendering? -> See [references/tabs-and-rendering.md](references/tabs-and-rendering.md)

### Step 2: Find the right module and function
Use the MODULE MAP table below or [references/function-index.md](references/function-index.md) for the full list.
The app is split into 10 JS modules in `js/d3-roadmap/`. Use Grep across the directory to find functions.

### Step 3: Read the code before changing it
Read the target function and 50 lines of surrounding context in the relevant module file before editing. Never write blind.

### Step 4: Make the change surgically
Use the Edit tool for targeted changes on the specific module file.
After editing, verify:
- Brace/paren balance is intact in that module
- No sync guards were removed or weakened
- `_dataLoaded: true` is preserved in any state reconstruction
- `saveData()` still has all 5 guards (in firebase-sync.js)

### Step 5: Verify the save chain
Every state mutation must flow through: mutate `roadmapData` -> `saveData()` -> re-render.
If you touched Firebase code, verify all 5 guards are still present in `saveData()` in firebase-sync.js.

### Step 6: Validate brace balance
After large edits: `python3 -c "c=open('js/d3-roadmap/MODULE.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

## EXAMPLES

### Example 1: Debug wrong grade calculation
**User says:** "My Peds grade shows wrong — I got 77% on Exam 1 but the points don't add up"
**Actions:**
1. Read `courseStructures.peds` in grades.js — Exam 1 weight is 40%, defaultGrade is 77
2. Read `loadCourseGrades()` in grades.js — formula: `earnedPoints += (grade / 100) * comp.weight`
3. Check `roadmapData.grades.peds` — should have `{ exam1: 77, headstart: 100 }`
4. Verify: 77/100 * 40 = 30.8 + 100/100 * 2.5 = 2.5 = 33.3 points earned
**Result:** Points match. If user sees wrong value, check if `roadmapData.grades` was overwritten during sync.

### Example 2: Add a custom deadline
**User says:** "Add a new assignment deadline for March 15"
**Actions:**
1. Read `submitNewDeadline()` in deadlines.js — creates deadline with `generateId('custom')`
2. New deadline is stored in `roadmapData.customDeadlines[id]` (object, not array)
3. `initUI()` in init.js merges STATIC_DEADLINES + customDeadlines into working `deadlines` array
4. Verify `saveData()` is called after adding
**Result:** Deadline persists across refresh and syncs to Firebase.

### Example 3: Fix sync guard issue
**User says:** "Changes aren't saving to Firebase"
**Actions:**
1. Read `saveData()` in firebase-sync.js — check diagnostic log output
2. Check all 5 guards: `isInitialLoad`, `hasLoadedFromCloud`, `isEmptyState()`, `roadmapData._dataLoaded`, `pinValidated`
3. If guard B (`hasLoadedFromCloud`) is false, check `loadFromFirebase()` in firebase-sync.js — does it set `hasLoadedFromCloud = true`?
4. Check `loadFromLocalStorage(finalize)` in firebase-sync.js — `finalize=true` sets all flags
**Result:** Identified which guard is blocking saves. Fix the flag that's stuck.

---

## TROUBLESHOOTING

### Error: Grade calculator shows wrong points
**Cause:** Course component weight mismatch — `courseStructures` has wrong weight, or `loadCourseGrades()` formula not applying weight correctly.
**Solution:** Read `courseStructures` in grades.js and verify component weights sum to 100%. Read `loadCourseGrades()` in grades.js and trace the `earnedPoints += (grade / 100) * comp.weight` formula manually.

### Error: Custom deadline disappears after refresh
**Cause:** `saveData()` not called after adding to `roadmapData.customDeadlines`, or a guard is blocking saves silently.
**Solution:** Read `submitNewDeadline()` in deadlines.js. Verify it calls `saveData()` after adding the deadline. Check console for guard block messages.

### Error: Deadline shows incomplete after marking done
**Cause:** Stable ID mismatch — `getDeadlineId()` generates a different key than what's stored in `completedDeadlines` (legacy data used array index).
**Solution:** Read `getDeadlineId()` in state.js. Check `roadmapData.completedDeadlines` keys match the stable ID format. Read `initUI()` in init.js for the legacy fallback matching logic.

### Error: Clinical competency progress resets
**Cause:** `getCompetenciesData()` in clinical.js re-initializes from `DEFAULT_COMPETENCIES` when `roadmapData.clinicalData.competencies` is null or corrupted.
**Solution:** Read `getCompetenciesData()` in clinical.js and verify saved competency data structure matches expected shape. Check `migrateCompetencies()` in state.js for array-to-object migration.

### Error: Data not saving / changes lost
**Cause (most common — fixed Mar 5, 2026):** 8 interconnected bugs: (1) flag ordering — `isInitialLoad = false` set AFTER `initUI()` blocked saves, (2) `mergeRemoteState()` overwrote newer local data with stale Firebase, (3) visibility handler merged without timestamp check, (4) `completedDeadlines` restore missed `_originalStableId` fallback, (5) `editedDeadlines` had stale `done:false`, (6) CRUD functions missing `safeLocalStorageSet()` before `saveData()`, (7) stale array index in delete callback, (8) `isLocalUpdate` timeout too short. All fixed in commit `21acdb0`.
**If still broken after fix:** User's browser may be caching old JS. Check `?v=` params on script tags — bump version to force re-download. Call `debugSaveState()` in browser console to see all guard values.
**Solution:** Read `saveData()` in firebase-sync.js. Call `debugSaveState()` in console — it logs all guard values, collection counts, and timestamps. Check `[D3-SAVE]` console logs for which guard is blocking. Trace the flag that's stuck — see `loadFromFirebase()` and `loadFromLocalStorage()` in firebase-sync.js.

### Error: Changes lost after browser cache serves old JS
**Cause:** GitHub Pages caches JS files aggressively. After deploying code changes, user's browser serves old cached files without the fixes.
**Solution:** Add `?v=YYYYMMDD` cache-busting param to ALL `<script src>` tags in d3-roadmap.html. Bump the version on each deploy. This forces browsers to re-download.

### Error: Custom deadline date/name/weight edits lost on reload (THE BIG ONE — fixed Mar 5, 2026)
**Cause:** `handleDateChange()` and `handleTextEdit()` stored edits ONLY in `roadmapData.editedDeadlines`. But `initUI()` only applies `editedDeadlines` to STATIC deadlines (steps 1-4). Custom deadlines are added later (step 5) from `roadmapData.customDeadlines`, which was NEVER updated by the edit handlers. Result: every reload reverted custom deadline edits to their original `customDeadlines` values.
**Why it was hard to find:** The completion handlers (`toggleDeadlineDone`, `submitDeadlineGrade`) DID update `customDeadlines` — only date/text/weight editors were missing. And testing with newly-created custom deadlines didn't expose the bug because the initial values matched. Only editing EXISTING custom deadlines with stale data in `customDeadlines` revealed the revert.
**Solution (commit `af30cef`):** (1) `handleDateChange()` now also updates `customDeadlines[deadline.id].date/day/month`. (2) `handleTextEdit()` now also updates `customDeadlines[deadline.id][field]`. (3) `initUI()` now applies `editedDeadlines` overrides when loading custom deadlines as a safety net.

### Error: Data wiped on new device
**Cause:** Default state has `_version: Date.now()` instead of `0`, causing empty local state to appear "newer" than cloud data.
**Solution:** Verify `getDefaultRoadmapData()` in state.js has `_version: 0` and `_dataLoaded: false`. Check all 5 guards. Use `forcePullFromCloud()` to recover.

### Error: Data shows on Chrome desktop but empty on other browsers/incognito (fixed Mar 22, 2026)
**Cause:** 4 interconnected bugs: (1) Default grades (`oralmed: {quiz1:100}`) made `isEmptyState()` return false → Guard C let defaults be saved to Firebase. (2) `initUI()` auto-created exams/upcomingDeadlines and triggered `saveData()` without Firebase-load guards → saved defaults with fresh `lastSaved`. (3) `finishFirebaseLoad()` never pushed local to Firebase when local was newer → Firebase permanently stale. (4) When local was newer, merge was skipped ENTIRELY → remote-only entries (notes/todos imported on another browser) lost → `localWasNewer` push then wrote incomplete data to Firebase, wiping remote-only data.
**Solution (commit `0edf0c0`):** (1) Empty default grades in both `roadmapData` and `getDefaultRoadmapData()`. (2) `isEmptyState()` no longer checks `exams` (auto-generated); `hasCompetencies` checks `completed > 0` (auto-initialized = 0). (3) Auto-save triggers guarded with `hasLoadedFromCloud && !awaitingFirebaseLoad`. (4) New `mergeRemoteCollectionsIntoLocal(data)` — when local is newer, adds remote-only entries without overwriting local (local wins for same-key conflicts). (5) `finishFirebaseLoad()` detects poisoned defaults via `isEmptyState(data)`, auto-pushes when local has real data. (6) 8 CRUD functions got missing `safeLocalStorageSet()`.
**Key lesson:** Multi-browser = independent localStorage with different data subsets. "Newer timestamp" ≠ "more complete data". NEVER skip merge entirely — use additive `mergeRemoteCollectionsIntoLocal()` for the local-is-newer path.

### Error: Clinic task edits/deletions not persisting in Monthly Planner (fixed Mar 16, 2026)
**Cause:** `syncClinicalToMonthlyPlanner()` deleted ALL clinic-synced tasks and recreated them from scratch on every `initMonthlyPlanner()` call (page load, tab switch, visibility change), wiping any user edits or deletions.
**Solution (commit `e5124b8`):** Incremental sync: skip tasks with `userEdited: true`, skip appointments in `hiddenClinicTasks`, dedup by patient+date+time. When user deletes a clinic task, its `clinicalAppointmentId` is stored in `hiddenClinicTasks`. When user edits, `userEdited: true` is set. `hiddenClinicTasks` is in all 4 Firebase merge sites + defaults.

### Error: Patient/clinical data disappears on refresh/sync/checkpoint (fixed Mar 21, 2026)
**Cause:** 10 interconnected bugs: (1) `hiddenClinicTasks` and `currentWeekSchedule` missing from monthlyPlanner in all 4 merge/restore sites + defaults, (2) `graduationPrep` and `clinicHeadlines` missing from `restoreCheckpoint()` and `importAndRestoreDirectly()`, (3) `dashboardSnapshots` used unsafe `||` merge that discarded local data when remote had empty `[]`, (4) `isEmptyState()` missing checks for `patientRecords`, `dashboardSnapshots`, `completedProcedures`, `competencies` — Guard C silently blocked saves when only these fields had data, (5) `syncClinicalToMonthlyPlanner()` used nuke-and-rebuild pattern wiping user edits, (6) all CRUD functions in patients.js and clinical.js missing `safeLocalStorageSet()` before `saveData()`, (7) both import functions missing localStorage persistence before saveData().
**Solution (commit `6dbe396`):** Added missing fields to all 4 merge/restore sites + defaults. New `mergeDashboardSnapshots()` function deduplicates by `capturedAt`. Added `patientRecords`/`dashboardSnapshots`/`completedProcedures`/`competencies` to `isEmptyState()`. Replaced nuke-and-rebuild `syncClinicalToMonthlyPlanner()` with incremental sync respecting `hiddenClinicTasks` and `userEdited`. Added `safeLocalStorageSet()` before `saveData()` in all 17 CRUD functions across patients.js and clinical.js.

### Error: Duplicate clinic tasks in Schedule tab weekly calendar (fixed Mar 21, 2026)
**Cause:** 3 interconnected bugs: (1) `_mpDeleteCurrentTaskConfirmed()` deleted clinic tasks from `customTasks` without adding to `hiddenClinicTasks`, so `syncClinicalToMonthlyPlanner()` recreated them on next init. (2) Import dedup only checked `patientId + date + time`, so mismatched patient IDs allowed duplicate appointments. (3) `syncClinicalToMonthlyPlanner()` ran on every `initMonthlyPlanner()` call (tab switch, page load) without checking if data actually changed.
**Solution (commit `fa8ab07`):** (1) Clinic task deletion now adds to `hiddenClinicTasks` same as `mpHideClinicTask()`. (2) Both import functions have secondary dedup by `patientName + date + time`. (3) `clinicalDataDirty` flag gates sync — only runs when clinical data actually changed. `dedupAppointments()` utility runs on init to clean existing duplicates. `safeLocalStorageSet()` added to 5 missing monthly-planner CRUD functions.

### Error: Deadline delete/edit buttons broken (fixed Mar 16, 2026)
**Cause:** `getDeadlineId()` produced IDs containing `'` (apostrophe from deadline text like `can't`), which broke `onclick="fn('${deadlineId}')"` JS syntax. Also, collapsed completed rows had duplicate `style` attributes causing `display:none` to be ignored.
**Solution (commit `e24d328`):** Strip `'"\\` from `getDeadlineId()` key generation. Escape `safeId` in onclick handlers. Merge display:none into the single `rowStyle` in `buildRow()`.

---

## PERFORMANCE NOTES

- **Take your time with each step.** Read before editing. Verify after editing. Do not skip validation steps.
- **Quality over speed.** A broken sync guard wipes ALL user data across devices. Verify guards are intact after every edit.
- **Read 50+ lines of context** around any function before modifying it. Blind edits break things silently.
- **Do not skip brace balance checks** after edits touching more than 10 lines in any module file.
- **Check the save chain every time.** After any `roadmapData` mutation, verify `saveData()` is called, then the appropriate render function. Missing any link causes silent data loss.
- **Verify deadline merge logic** after touching deadline code. The 5-layer hybrid system (STATIC + custom + edited + completed + deleted) rebuilds every `initUI()` — changes to any layer can silently break others.

---

## ERROR HANDLING

### Before any edit:
- Read 50+ lines of context around the target function
- Count braces/parens in the section you're editing
- Note which save function and render function are in scope

### After any edit:
- Verify brace/paren count matches pre-edit count
- If you touched `saveData()`, verify all 5 guards are still present
- If you touched state reconstruction (realtime sync, loadFromFirebase), verify `_dataLoaded: true` is preserved
- If you touched `isEmptyState()`, verify all 11 conditions are still checked

### If something breaks:
1. Check the browser console for the exact error and line number
2. Use `createCheckpoint('before-fix')` to save current state before attempting repair
3. Check all 5 guards in order: pinValidated -> isInitialLoad -> hasLoadedFromCloud -> _dataLoaded -> isEmptyState
4. NEVER bypass guards to "fix" a sync issue — find WHY the guard is blocking

---

## CRITICAL: FIREBASE RULES APPLY

This app uses the same Firebase patterns as all Sully apps.
**BEFORE ANY CODE CHANGES**, ensure you follow:
- `sully-firebase-patterns` skill rules (when available)
- Use `{}` objects with `generateId()` keys, NEVER arrays
- Use ONLY `saveData()` for persistence
- Respect ALL 5 sync guards
- All date parsing must use local timezone (NEVER `new Date('YYYY-MM-DD')`)

---

## CRITICAL PATTERNS

### Pattern 1: Adding a Custom Deadline (Full Flow)
```javascript
// Inside submitNewDeadline():
const id = generateId('custom');
roadmapData.customDeadlines[id] = { id, date, what, course, weight, type, custom: true };
saveData();                    // localStorage + Firebase (debounced)
initUI();                      // Rebuilds working deadlines array from all 5 layers
```

### Pattern 2: Updating a Competency Item
```javascript
// Inside adjustCompItem(catKey, itemId, delta):
const competencies = getCompetenciesData();
// Find item in competencies[catKey].sections[].items[]
item.completed = Math.max(0, item.completed + delta);
saveData();
renderCompetencies();
```

### Pattern 3: Grade-Deadline Bidirectional Sync
```javascript
// When grade entered in Grades tab (grades.js):
syncGradeToDeadline(courseId, componentId, grade);
// When deadline marked complete with grade (deadlines.js):
syncDeadlineToGrades(deadline, isComplete, grade);
```

---

## APP OVERVIEW

**Files:** `d3-roadmap.html` (8,394 lines, CSS + HTML only) + `js/d3-roadmap/*.js` (10 modules, 9,135 lines)
**URL:** https://suleman7-dmd.github.io/dental-quest/d3-roadmap.html

**Purpose:** Track academic requirements, deadlines, clinical competencies, and scheduling for D3 dental school year.

**State object:** `roadmapData` (NOT `state` — that's body-comp-tracker)

**Firebase path:** `users/user_{hashedPin}/d3Roadmap`

**10 Modules (load order):**
state.js (614) -> firebase-sync.js (1,760) -> deadlines.js (804) -> grades.js (384) -> exam-content.js (1,327) -> clinical.js (1,451) -> import-system.js (543) -> daily-planner.js (573) -> monthly-planner.js (1,142) -> init.js (537)

**7 Tabs (redesigned Mar 12, 2026):**
| Tab | ID | Key Function | Module |
|-----|----|-------------|--------|
| Mission Control | `missioncontrol` | `renderDashboard()` | init.js |
| Deadlines | `deadlines` | `renderDeadlines()` | deadlines.js |
| Clinical | `clinical` | `initClinicalTab()` | clinical.js |
| Schedule | `schedule` | Sub-tabs: Monthly + Daily | monthly-planner.js, daily-planner.js |
| D3 Academics | `academics` | Accordion: Grades, Exams, Mandatory, Courses, Classmates | grades.js, exam-content.js |
| Graduation Prep | `gradprep` | `renderGraduationPrep()` | init.js |
| Remember | `remember` | Static HTML | — |

**Old tab IDs map to new:** dashboard→missioncontrol, grades→academics, examcontent→academics, mandatory→academics, courses→academics, classmates→academics, dailyplanner→schedule, monthlyplanner→schedule (backward compat in switchTab)

**Clinical Sub-tabs:** Patients, Appointments, Procedures, Competencies (14 categories now)

---

## KEY STATE STRUCTURE

```javascript
let roadmapData = {
    pedsLockedIn: 33.3,                    // Peds points earned so far
    mandatoryItems: { gatecontrol, acutepain, peextremities, npi, orthomodule, ips, periodiscussion },
    grades: {                               // Course grades keyed by courseId
        oralmed: { quiz1: 100 },
        paincontrol: {},
        critthink: { quiz1: 100 },
        peds: { exam1: 77, headstart: 100 },
        perio: { midterm: null, writtenAssignment: 100 },
        ortho: { midterm: null }
    },
    editedDeadlines: {},                    // Overrides to STATIC_DEADLINES (keyed by stableId)
    customDeadlines: {},                    // User-added deadlines (object with ID keys)
    deletedDeadlines: {},                   // Deleted static deadlines
    completedDeadlines: {},                 // Completed deadlines with grades (keyed by stableId)
    examStudyProgress: {},                  // { 'peds-exam2-lec11': true, ... }
    dailyPlanner: { date, focus, notes, blocks: {}, pomodorosCompleted, bedtime },
    monthlyPlanner: { notes: {}, customTasks: {}, overriddenStatic: {}, completedTasks: {}, hiddenClinicTasks: {}, currentWeekSchedule: {} },
    clinicalData: {
        patients: {},                       // Patient records keyed by ID
        appointments: {},                   // Appointment records keyed by ID
        completedProcedures: {},            // Completed procedure records
        competencies: null,                 // Initialized from DEFAULT_COMPETENCIES
        missingNotes: {}                    // Missing progress notes — keyed by note-{chart}-{dateNoHyphens}
    },
    todoList: {                             // To-do list — flat checklist from multiple sources
        items: {},                          // Keyed by todo-{NNNN}-{dateNoHyphens}
        _nextSeq: 1,                        // Sequential counter for manual adds
        lastUpdated: null                   // ISO timestamp
    },
    exams: {},                              // For cross-app integration (Body Comp reads this)
    graduationPrep: {                       // Graduation Prep tab data
        externship: { startDate, endDate, patients: {}, logistics: '', notes: '' },
        cdcaAdex: { sessions: {}, notes: '' },
        inbde: { notes: '' },
        jobSearch: { notes: '' }
    },
    clinicHeadlines: {                      // Mission Control headline counters
        appointments: { completed: 0, target: 90 },
        procedures: { completed: 0, target: 116 }
    },
    lastSaved: null,
    _version: 0,                            // MUST be 0 in defaults (cloud always wins on fresh device)
    _lastModified: null,
    _dataLoaded: false                      // Flag to track if real data was loaded
};
```

---

## DEADLINE SYSTEM (Hybrid Static + Dynamic)

The deadline system uses a hybrid approach:
- **STATIC_DEADLINES** (const array, in deadlines.js): 50+ hardcoded deadlines for Spring 2026
- **roadmapData.customDeadlines** (object): User-added deadlines with `generateId('custom')` keys
- **roadmapData.editedDeadlines** (object): Overrides to static deadline fields (keyed by `getDeadlineId()`)
- **roadmapData.completedDeadlines** (object): Completion status + grades (keyed by `getDeadlineId()`)
- **roadmapData.deletedDeadlines** (object): Deleted static deadlines
- **Working array `deadlines`** (let): Rebuilt every `initUI()` call from STATIC + custom - deleted

**Deadline shape (STATIC_DEADLINES entry):**
```javascript
{ date: '2026-02-18', day: 'Wed', what: 'EXAM 2...', course: 'Peds', weight: '45%', type: 'EXAM', month: 'february', done: true }
```

**Stable ID function:** `getDeadlineId(deadline)` in state.js — generates a stable key from deadline properties for sync safety.

---

## 5 FIREBASE GUARDS in saveData() (firebase-sync.js)

```
GUARD A: if (isInitialLoad) return false;           // Never save during initial load
GUARD B: if (!hasLoadedFromCloud) return false;      // Never save before cloud data loaded
GUARD C: if (isEmptyState(roadmapData)) return false; // Never save empty state
GUARD D: if (!roadmapData._dataLoaded) return false; // Data must be confirmed loaded
GUARD E: if (firebaseSyncEnabled && !pinValidated) return false; // PIN must be validated
```

**Guard flag locations (state.js):**
```javascript
let isInitialLoad = true;       // cleared in loadFromFirebase/loadFromLocalStorage (firebase-sync.js)
let hasLoadedFromCloud = false;  // set true after Firebase load completes (firebase-sync.js)
let pinValidated = false;        // set true in setupUserAuth() (firebase-sync.js)
let clinicalDataDirty = true;   // gates syncClinicalToMonthlyPlanner() in initMonthlyPlanner(). Set true by data load/merge, false after sync.
```

**Save flow:** mutate `roadmapData` -> `saveData()` -> localStorage IMMEDIATELY -> Firebase debounced (0-300ms) -> `setLocalUpdateFlag()` to prevent realtime echo -> retry on error

---

## GRADE CALCULATOR

**Course structures** defined in `courseStructures` in grades.js. Each course has `name`, `passing` threshold, and `components[]` array.

**Courses (6 graded):**
| Course Key | Name | Passing | Components |
|-----------|------|---------|------------|
| `oralmed` | Oral Medicine | 60% | 14 (participation, 10 quizzes, midterm, final, passion project) |
| `paincontrol` | Pain Control 2 | 60% | 7 (rx1, takehome1, midterm, medConsult, rx2, takehome2, final) |
| `critthink` | Critical Thinking | 60% | 9 (quiz1, quiz2, pico, articles, ppt, video, review, peer) |
| `peds` | Pediatric Dentistry | 60% | 5 (exam1@40%, exam2@45%, exam3@7.5%, headstart@2.5%, orthoModule@5%) |
| `perio` | Periodontology 2 | **65%** | 4 (midterm@40%, writtenAssignment@10%, discussion@5%, final@45%) |
| `ortho` | Orthodontics | 60% | 2 (midterm@50%, final@50%) |

**Grade formula** (in `loadCourseGrades()` in grades.js):
```javascript
earnedPoints += (parseFloat(grade) / 100) * comp.weight;
completedWeight += comp.weight;
remainingWeight = 100 - completedWeight;
currentGrade = completedWeight > 0 ? (earnedPoints / completedWeight * 100) : 0;
```

**"What do I need" formula** (in `calculateNeeded()` in grades.js):
```javascript
pointsNeeded = targetGrade - earnedPoints;
avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;
```

---

## MODULE MAP: Key Functions

| Function | Module | Description |
|----------|--------|-------------|
| `getDefaultRoadmapData()` | state.js | Returns fresh default state |
| `isEmptyState(data)` | state.js | Checks if state has real user data |
| `getDeadlineId(deadline)` | state.js | Stable ID for deadline sync |
| `switchTab(tabId, evt)` | state.js | Tab navigation |
| `escapeHtml(str)` | state.js | HTML escaping for user content |
| `initFirebase()` | firebase-sync.js | Firebase initialization with 3s fallback |
| `setupUserAuth(pin)` | firebase-sync.js | PIN hash + Firebase path setup |
| `mergeRemoteState(data)` | firebase-sync.js | Consolidated merge — remote wins for conflicts (used when remote is newer) |
| `mergeRemoteCollectionsIntoLocal(data)` | firebase-sync.js | Additive merge — local wins for conflicts, adds remote-only entries (used when local is newer) |
| `mergeDashboardSnapshots(local, remote)` | firebase-sync.js | Dedup+merge dashboardSnapshots arrays by capturedAt |
| `loadFromLocalStorage(finalize)` | firebase-sync.js | Load from localStorage (finalize=true sets all flags) |
| `loadFromFirebase()` | firebase-sync.js | Initial Firebase load |
| `setupRealtimeSync()` | firebase-sync.js | Cross-device realtime listener |
| `setupMainAppTasksSync()` | firebase-sync.js | Sync tasks from index.html |
| `createCheckpoint(name)` | firebase-sync.js | Save checkpoint to localStorage |
| `showCheckpointManager()` | firebase-sync.js | Modal with checkpoint list |
| `restoreCheckpoint(index)` | firebase-sync.js | Restore from checkpoint |
| `forceUploadToCloud()` | firebase-sync.js | Bypass guards, push to Firebase |
| `forcePullFromCloud()` | firebase-sync.js | Bypass guards, pull from Firebase |
| `saveData()` | firebase-sync.js | Main save (5 guards + localStorage + Firebase) |
| `renderDeadlines()` | deadlines.js | Deadlines tab rendering |
| `addNewDeadline()` | deadlines.js | Show add deadline modal |
| `submitNewDeadline()` | deadlines.js | Save new custom deadline |
| `toggleDeadlineDone(index)` | deadlines.js | Toggle deadline completion |
| `submitDeadlineGrade(index)` | deadlines.js | Submit grade for deadline |
| `syncDeadlineToGrades(d, done, grade)` | deadlines.js | Sync deadline grade to courseStructures |
| `deleteDeadline(index)` | deadlines.js | Delete a deadline |
| `toggleCompletedDeadlines(month)` | deadlines.js | Toggle collapsed completed rows per month |
| `syncClinicalToMonthlyPlanner()` | import-system.js | Incremental clinic→planner sync (respects hiddenClinicTasks, userEdited) |
| `dedupAppointments()` | import-system.js | Scan/remove duplicate appointments by name+date+time, clean orphaned clinic tasks |
| `loadCourseGrades()` | grades.js | Grade calculator rendering |
| `calculateNeeded()` | grades.js | "What grade do I need" calculator |
| `syncGradeToDeadline()` | grades.js | Sync grade to deadline tab |
| `loadExamCourseContent()` | exam-content.js | Exam content study tracker |
| `initClinicalTab()` | clinical.js | Initialize clinical tab (patients + appointments + procedures) |
| `renderCompetencies()` | clinical.js | Competencies rendering with evidence drill-down |
| `setCompItemStatus(cat, id, status)` | clinical.js | Update competency item status |
| `adjustCompItem(cat, id, delta)` | clinical.js | Increment/decrement competency count |
| `recordProcedure(data)` | clinical.js | Create procedure record with competency linking |
| `deleteProcedure(procId)` | clinical.js | Delete procedure + unlink from competencies |
| `completeAppointment(aptId)` | clinical.js | Completion cascade: deadline+planner+patient+procedure prompt |
| `uncompleteAppointment(aptId)` | clinical.js | Reverse cascade |
| `linkProcedureToCompetencies(proc)` | clinical.js | Add evidence entries to competency items |
| `renderProceduresList()` | clinical.js | Procedures sub-tab list view |
| `toggleAppointmentStatus(aptId, evt)` | clinical.js | Complete/uncomplete appointment toggle |
| `getProceduresForPatient(patientId)` | clinical.js | Filter procedures by patient |
| `getProceduresForCompetency(itemId)` | clinical.js | Filter procedures by competency item |
| `initDailyPlanner()` | daily-planner.js | Daily planner initialization (+ auto-populate from appointments) |
| `dpSyncAppointmentsToTimeline()` | daily-planner.js | Sync today's appointments to daily timeline |
| `initMonthlyPlanner()` | monthly-planner.js | Monthly planner initialization (+ buildCurrentWeekSchedule) |
| `buildCurrentWeekSchedule()` | monthly-planner.js | Pre-build weekly schedule for Stim Calc cross-app |
| `mpHideClinicTask(taskId, aptId)` | monthly-planner.js | Hide clinic task from planner |
| `mpUnhideClinicTask(aptId)` | monthly-planner.js | Restore hidden clinic task |
| `renderDashboard()` | init.js | Mission Control tab (smart counters, readiness score, alerts, pace projections) |
| `renderGraduationPrep()` | init.js | Graduation Prep tab rendering (externship, CDCA, INBDE, job search) |
| `updateHeadlineTarget(type, val)` | init.js | Edit clinic headline target (completed is smart-derived) |
| `updateGradPrep(cat, field, val)` | init.js | Save graduation prep field |
| `findCompetencyItem(itemId)` | state.js | Find competency item across all categories |
| `PROCEDURE_TYPES` | state.js | Maps competency category keys to display names |
| `switchScheduleSubTab(subTabId)` | state.js | Toggle monthly/daily sub-tab in Schedule tab |
| `toggleAcademicsSection(sectionId)` | state.js | Toggle accordion in D3 Academics tab |
| `getSmartAppointmentCount()` | state.js | Multi-source appointment aggregation (appointments + planner + patient visits) |
| `getSmartProcedureCount()` | state.js | Multi-source procedure aggregation (records + competency manual adjustments) |
| `calculateGraduationReadiness()` | state.js | Weighted readiness % across 14 competency categories |
| `getCompetencyGaps()` | state.js | Items at 0% progress or behind pace for graduation |
| `calculatePaceProjection(count, target)` | state.js | "At current pace, hit target by [date]" |
| `navigateToEntity(type, id)` | state.js | Cross-tab deep linking (patient, appointment, procedure, competency, deadline) |
| `backfillClinicalData()` | clinical.js | One-click backfill: auto-complete past apts, create proc records, evidence entries, link patients |
| `autoSuggestClinicalDeadlines()` | deadlines.js | Generate soft deadline suggestions from competency gaps before externship |
| `dpRenderClinicDayBanner()` | daily-planner.js | Clinic day banner with patient list, completion tracking, post-clinic summary |
| `parseMissingNotesBlock(text)` | patients.js | Parse MISSING_NOTES block (7 pipe-delimited fields per note) |
| `parseTodoListBlock(text)` | patients.js | Parse TODO_LIST block (5 pipe-delimited fields per item) |
| `parseImportAppointmentBlock(text)` | patients.js | Parse PATIENT:/CHART:/DATE:/TIME:/PROCEDURE: appointment block from unified import |
| `renderMissingNotesSection()` | init.js | Dashboard section: capacity bar, checkable list, faculty cross-ref, alert banner |
| `renderTodoListSection()` | init.js | Dashboard section: inline quick-add, checkable list with source badges |
| `dashboardAddTodo()` | init.js | Quick-add handler from dashboard input |
| `getMissingNotesAlertLevel(count)` | state.js | Returns 'GREEN'/'YELLOW'/'RED' based on pending count |
| `getMissingNotesPending()` | state.js | Returns array of pending missing notes |
| `getMissingNotesCompleted()` | state.js | Returns array of completed missing notes |
| `toggleMissingNoteStatus(noteId)` | state.js | Toggle note pending/completed + save |
| `clearCompletedMissingNotes()` | state.js | Delete all completed notes + save |
| `getMissingNotesFacultyMatches()` | state.js | Cross-ref faculty with upcoming appointments |
| `getTodoPending()` | state.js | Returns array of pending to-do items |
| `getTodoCompleted()` | state.js | Returns array of completed to-do items |
| `addTodoItem(desc, source, detail)` | state.js | Create new to-do item with auto-ID + save |
| `toggleTodoStatus(todoId)` | state.js | Toggle item pending/completed + save |
| `clearCompletedTodos()` | state.js | Delete all completed todos + save |
| `getTodoSourceBadgeColor(source)` | state.js | Returns hex color for source badge |
| `initUI()` | init.js | Main UI initialization (merges deadlines, restores state) |
| `init()` | init.js | App entry point (calls initFirebase) |

---

## COMPETENCIES SYSTEM

Competencies live at `roadmapData.clinicalData.competencies` and are initialized from `DEFAULT_COMPETENCIES` (in clinical.js).

**14 Categories (real BU DMD 2027 graduation requirements):**
| Key | Name | Icon |
|-----|------|------|
| `fixed` | Fixed Prosthodontics | Formatives + summatives for crowns, FPD, CEREC |
| `operative` | Operative | Class V, multisurface composites, mock board |
| `dentures` | Complete Dentures | Formatives, summatives, overdenture |
| `rpd` | RPDs | 3 track options (cast metal, flexible, interim) |
| `srp` | SRPs | Calculus removal summatives |
| `endo` | Endodontics | RCTs, pulpectomies, mock board |
| `oralsurg` | Oral Surgery | 3rd/4th year rotations, extractions |
| `peds` | Pediatric Dentistry | PD 530 course, rotations, log sheet |
| `perio` | Periodontology | Surgical assists, formatives, summatives |
| `grouppractice` | Group Practice (GD 640 & GD 642) | 3rd+4th year reviews, analyses, leadership |
| `txplanning` | Treatment Planning (RS 545) | Seminar presentation, OHRA, caries detection |
| `geriatrics` | Geriatric Dental Medicine | PH 541 course, rotation, assignment |
| `externship` | Externship & SPS | Case presentation, community outreach, SPS log |

**Each category has:** `{ name, icon, color, summary, notes, sections: [{ title, items: [{ id, text, required, completed, completionEntries[] }] }] }`

**Competency items now have `completionEntries[]`** (evidence trail):
```javascript
completionEntries: [
    { procedureId: 'proc_123', patientId: 'pt-456', patientName: 'Carmen M.', date: '2026-03-15', note: 'MOD Composite #30' }
]
```
When procedures are linked via `recordProcedure()`, entries are auto-added. `item.completed` is synced from `completionEntries.length`. Deleting a procedure via `deleteProcedure()` calls `unlinkProcedureFromCompetencies()` to remove entries and adjust counts.

**Key functions:** `getCompetenciesData()`, `calculateCategoryStats()`, `calculateOverallStats()`, `getWhatsNextItems()`, `renderCompetencies()`, `setCompItemStatus()`, `adjustCompItem()`, `recordProcedure()`, `linkProcedureToCompetencies()`, `unlinkProcedureFromCompetencies()`

---

## CONSULT REFERENCES FOR

- **Tabs and UI structure** -> [references/tabs-and-rendering.md](references/tabs-and-rendering.md)
- **State and data details** -> [references/state-and-data.md](references/state-and-data.md)
- **Grade calculator and deadlines** -> [references/grades-and-deadlines.md](references/grades-and-deadlines.md)
- **Clinical and competencies** -> [references/clinical-and-competencies.md](references/clinical-and-competencies.md)
- **Monthly and daily planner** -> [references/monthly-and-daily-planner.md](references/monthly-and-daily-planner.md)
- **Firebase sync and checkpoints** -> [references/sync-and-firebase.md](references/sync-and-firebase.md)
- **Complete function index** -> [references/function-index.md](references/function-index.md)

---

## RED FLAGS — STOP AND CHECK

If you see ANY of these in code you're writing:
- Save called without `saveData()` (e.g., direct Firebase write)
- Using `state` instead of `roadmapData` (wrong variable name)
- Using `new Date('2026-02-18')` instead of local timezone parsing
- Arrays instead of objects for Firebase-stored data
- Modifying `STATIC_DEADLINES` instead of `roadmapData.editedDeadlines`
- Missing `saveData()` after any `roadmapData` mutation
- Removing or weakening any of the 5 sync guards
- Setting `_version: Date.now()` in defaults (must be 0)
- Using array index as deadline key (use `getDeadlineId()` for stable IDs)
- Computing `getDeadlineId()` AFTER mutating deadline fields — MUST use `deadline._originalStableId` for persistence keys
- Not checking `saveData()` return value in CRUD functions — must show error toast if returns false
- Shallow grades merge: `{ ...roadmapData.grades, ...(data.grades) }` — MUST deep-merge per course
- Using native `alert()`/`confirm()`/`prompt()` — use `showCustomAlert()`/`showCustomConfirm()`/`showToast()` from state.js
- Calling `mergeRemoteState(data)` without first loading localStorage in `loadFromFirebase()`
- Setting sync flags (`isInitialLoad = false`) AFTER `initUI()` — MUST be BEFORE, wrapped in try/catch
- Calling `mergeRemoteState()` without comparing `lastSaved` timestamps — local-newer data gets overwritten
- Missing `safeLocalStorageSet()` BEFORE `saveData()` in CRUD functions — guard blocks lose changes silently
- Using `||` instead of `??` for `done`/`grade` fields — `done || false` loses explicit `false`, `grade || null` loses grade of 0
- Not updating `editedDeadlines[id].done` when completing a previously-edited deadline — stale `done:false` wins on reload
- Missing `_originalStableId` fallback in completedDeadlines restore loop — post-edit `getDeadlineId()` won't match stored key
- Deploying JS changes without bumping `?v=` cache-busting params on `<script src>` tags
- Editing custom deadline date/name/weight without updating `roadmapData.customDeadlines[deadline.id]` — `editedDeadlines` only applies to STATIC deadlines in initUI; custom deadlines load from `customDeadlines` which must ALSO be updated
- Testing only with NEW custom deadlines instead of editing EXISTING ones — custom-vs-static code paths differ and bugs only surface with real user data
- Adding a new field to `roadmapData` without updating ALL 4 merge/restore sites in firebase-sync.js — field gets silently wiped on every sync/refresh/restore/checkpoint
- Adding a new collection field without adding it to `isEmptyState()` in state.js — Guard C silently blocks saves when only that field has data
- Using `data.arr || local.arr || []` for array fields instead of a proper merge function — empty `[]` is truthy and discards local data
- `syncClinicalToMonthlyPlanner()` must use incremental sync, NOT nuke-and-rebuild — respect `hiddenClinicTasks` and `userEdited` flags
- Deleting a `clinic_*` task without adding appointment to `hiddenClinicTasks` — sync will recreate it
- Import dedup by `patientId` only without secondary name-based check — mismatched IDs create duplicates
- Calling `syncClinicalToMonthlyPlanner()` unconditionally in `initMonthlyPlanner()` without `clinicalDataDirty` gate
- Skipping `mergeRemoteState()` entirely when local is newer — MUST use `mergeRemoteCollectionsIntoLocal()` instead to preserve remote-only entries from other browsers/devices
- Adding real data values to `getDefaultRoadmapData()` grades (e.g., `oralmed: { quiz1: 100 }`) — makes `isEmptyState()` return false for defaults, bypassing Guard C
- Checking auto-generated data in `isEmptyState()` — `exams` (from static list) and `competencies` (auto-initialized from DEFAULT_COMPETENCIES) must NOT count as real user data
- `initUI()` auto-save triggers (`setTimeout(() => saveData())`) without `hasLoadedFromCloud && !awaitingFirebaseLoad` guards — can save defaults to Firebase during race
