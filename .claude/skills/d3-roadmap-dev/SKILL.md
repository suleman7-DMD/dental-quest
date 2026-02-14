---
name: d3-roadmap-dev
user-invocable: false
description: |
  Development patterns for D3 Roadmap — an academic tracking app for a D3 dental student.
  Single HTML file (~17,575 lines) with Firebase sync, dark theme UI, 11 tabs.
  Use when: debugging grade calculations, modifying deadlines, working on clinical tracking,
  competencies, monthly planner, daily planner, exam content, checkpoint system, or any D3 roadmap feature.
  Trigger phrases: "d3 roadmap", "roadmap app", "deadlines", "clinical tracking",
  "competencies", "dental school", "academic tracker", "grade calculator",
  "monthly planner", "daily planner", "exam content", "mandatory items",
  "checkpoint", "course grades", "peds exam", "perio final".
  Do NOT use for: dental quest index.html, body-comp-tracker, stimulant-elimination-calculator,
  or lecture-prompt-transformer. Those apps have their own skills.
globs:
  - "d3-roadmap.html"
compatibility: Claude Code CLI. Requires file system access (Read, Edit, Write, Grep, Glob, Bash).
metadata:
  author: Sully
  version: 1.0.0
  file: d3-roadmap.html
  lines: ~17575
  last-verified: 2026-02-14
---

# D3 Roadmap Development Patterns

## USE CASES

This skill enables 3 core workflows:

**Use Case 1: Debug a grade calculation or deadline issue**
Trigger: User says "grade is wrong" or "deadline not showing" or "peds score off"
Steps: Read courseStructures (~line 11829) -> Grep for loadCourseGrades() -> Read calculateNeeded() (~line 12104) -> Read initUI() deadline merge (~line 15524)
Result: Root cause identified (e.g., wrong component weight, deadline not in STATIC_DEADLINES, editedDeadlines not applying)
Success criteria: Grade calculation matches manual weighted average, deadlines render correctly, completedDeadlines persist

**Use Case 2: Add or modify a feature**
Trigger: User says "add a new tab" or "change clinical tracking" or "modify competencies"
Steps: Read state structure in references/state-and-data.md -> Grep for relevant function -> Read 50+ lines of context -> Edit surgically -> Read saveData() to verify guards intact
Result: Feature added without breaking sync, guards, or existing data
Success criteria: Feature works, all 5 Firebase guards intact in saveData(), brace balance unchanged

**Use Case 3: Fix a Firebase sync issue**
Trigger: User says "data not saving" or "sync broken" or "changes lost"
Steps: Read saveData() at ~line 10992 (check 5 guards) -> Grep for isInitialLoad/hasLoadedFromCloud/pinValidated flags -> Read loadFromFirebase() to verify _dataLoaded preserved
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

### Step 2: Find the exact function and line number
Use the QUICK REFERENCE table below or [references/function-index.md](references/function-index.md) for the full list.
All line numbers are verified against the actual 17,575-line file.

### Step 3: Read the code before changing it
This is a single 17,575-line HTML file. Always read the target function and 50 lines of surrounding context before editing. Never write blind.

### Step 4: Make the change surgically
Use the Edit tool for targeted changes. NEVER rewrite the whole file.
After editing, verify:
- Brace/paren balance is intact
- No sync guards were removed or weakened
- `_dataLoaded: true` is preserved in any state reconstruction
- `saveData()` still has all 5 guards

### Step 5: Verify the save chain
Every state mutation must flow through: mutate `roadmapData` -> `saveData()` -> re-render.
If you touched Firebase code, verify all 5 guards are still present in `saveData()`.

### Step 6: Validate brace balance
After large edits: `python3 -c "c=open('d3-roadmap.html').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

## EXAMPLES

### Example 1: Debug wrong grade calculation
**User says:** "My Peds grade shows wrong — I got 77% on Exam 1 but the points don't add up"
**Actions:**
1. Read `courseStructures.peds` at ~line 11878 — Exam 1 weight is 40%, defaultGrade is 77
2. Read `loadCourseGrades()` at ~line 11909 — formula: `earnedPoints += (grade / 100) * comp.weight`
3. Check `roadmapData.grades.peds` — should have `{ exam1: 77, headstart: 100 }`
4. Verify: 77/100 * 40 = 30.8 + 100/100 * 2.5 = 2.5 = 33.3 points earned
**Result:** Points match. If user sees wrong value, check if `roadmapData.grades` was overwritten during sync.

### Example 2: Add a custom deadline
**User says:** "Add a new assignment deadline for March 15"
**Actions:**
1. Read `submitNewDeadline()` at ~line 12332 — creates deadline with `generateId('custom')`
2. New deadline is stored in `roadmapData.customDeadlines[id]` (object, not array)
3. `initUI()` at ~line 15524 merges STATIC_DEADLINES + customDeadlines into working `deadlines` array
4. Verify `saveData()` is called after adding
**Result:** Deadline persists across refresh and syncs to Firebase.

### Example 3: Fix sync guard issue
**User says:** "Changes aren't saving to Firebase"
**Actions:**
1. Read `saveData()` at ~line 10992 — check diagnostic log output
2. Check all 5 guards: `isInitialLoad`, `hasLoadedFromCloud`, `isEmptyState()`, `roadmapData._dataLoaded`, `pinValidated`
3. If guard B (`hasLoadedFromCloud`) is false, check `loadFromFirebase()` at ~line 9817 — does it set `hasLoadedFromCloud = true`?
4. Check `loadFromLocalStorage(finalize)` at ~line 9757 — `finalize=true` sets all flags
**Result:** Identified which guard is blocking saves. Fix the flag that's stuck.

---

## TROUBLESHOOTING

### Error: Grade calculator shows wrong points
**Cause:** Course component weight mismatch — `courseStructures` has wrong weight, or `loadCourseGrades()` formula not applying weight correctly.
**Solution:** Read `courseStructures` at ~line 11829 and verify component weights sum to 100%. Read `loadCourseGrades()` at ~line 11909 and trace the `earnedPoints += (grade / 100) * comp.weight` formula manually.

### Error: Custom deadline disappears after refresh
**Cause:** `saveData()` not called after adding to `roadmapData.customDeadlines`, or a guard is blocking saves silently.
**Solution:** Read `submitNewDeadline()` at ~line 12332. Verify it calls `saveData()` after adding the deadline. Check console for guard block messages.

### Error: Deadline shows incomplete after marking done
**Cause:** Stable ID mismatch — `getDeadlineId()` generates a different key than what's stored in `completedDeadlines` (legacy data used array index).
**Solution:** Read `getDeadlineId()` at ~line 9551. Check `roadmapData.completedDeadlines` keys match the stable ID format. Read `initUI()` at ~line 15524 for the legacy fallback matching logic.

### Error: Clinical competency progress resets
**Cause:** `getCompetenciesData()` at ~line 14372 re-initializes from `DEFAULT_COMPETENCIES` when `roadmapData.clinicalData.competencies` is null or corrupted.
**Solution:** Read `getCompetenciesData()` and verify saved competency data structure matches expected shape. Check `migrateCompetencies()` at ~line 9637 for array-to-object migration.

### Error: Data not saving / changes lost
**Cause:** One of the 5 guards in `saveData()` is blocking. Most common: `hasLoadedFromCloud` stuck false (Firebase load failed silently).
**Solution:** Read `saveData()` at ~line 10992. Check console diagnostic log for which guard is blocking. Trace the flag that's stuck — see `loadFromFirebase()` at ~line 9817 and `loadFromLocalStorage()` at ~line 9757.

### Error: Data wiped on new device
**Cause:** Default state has `_version: Date.now()` instead of `0`, causing empty local state to appear "newer" than cloud data.
**Solution:** Verify `getDefaultRoadmapData()` at ~line 8465 has `_version: 0` and `_dataLoaded: false`. Check all 5 guards. Use `forcePullFromCloud()` to recover.

---

## PERFORMANCE NOTES

- **Take your time with each step.** Read before editing. Verify after editing. Do not skip validation steps.
- **Quality over speed.** A broken sync guard wipes ALL user data across devices. Verify guards are intact after every edit.
- **Read 50+ lines of context** around any function before modifying it. Blind edits in a 17,575-line file break things silently.
- **Do not skip brace balance checks** after edits touching more than 10 lines. One missing brace is nearly impossible to find manually.
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
// When grade entered in Grades tab:
syncGradeToDeadline(courseId, componentId, grade);  // ~line 12020
// When deadline marked complete with grade:
syncDeadlineToGrades(deadline, isComplete, grade);  // ~line 12563
```

---

## APP OVERVIEW

**File:** `d3-roadmap.html` (17,575 lines, single HTML file, no build system)
**URL:** https://suleman7-dmd.github.io/dental-quest/d3-roadmap.html

**Purpose:** Track academic requirements, deadlines, clinical competencies, and scheduling for D3 dental school year.

**State object:** `roadmapData` (NOT `state` — that's body-comp-tracker)

**Firebase path:** `users/user_{hashedPin}/d3Roadmap`

**11 Tabs:**
| Tab | ID | Icon | Key Function |
|-----|----|------|-------------|
| Dashboard | `dashboard` | `renderDashboard()` ~11307 |
| Deadlines | `deadlines` | `renderDeadlines()` ~11581 |
| Courses | `courses` | Static HTML display |
| Grades | `grades` | `loadCourseGrades()` ~11909 |
| Exam Content | `examcontent` | `loadExamCourseContent()` ~12797 |
| Classmate Share | `classmates` | Static HTML |
| Mandatory | `mandatory` | `toggleMandatory()` ~11289 |
| Daily Planner | `dailyplanner` | `initDailyPlanner()` ~15871 |
| Monthly | `monthlyplanner` | `initMonthlyPlanner()` ~16577 |
| Clinical | `clinical` | `initClinicalTab()` ~13546 |
| Remember | `remember` | Static HTML |

**Clinical Sub-tabs:** Patients, Appointments, Procedures, Competencies

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
    monthlyPlanner: { notes: {}, customTasks: {}, overriddenStatic: {}, completedTasks: {} },
    clinicalData: {
        patients: {},                       // Patient records keyed by ID
        appointments: {},                   // Appointment records keyed by ID
        completedProcedures: {},            // Completed procedure records
        competencies: null                  // Initialized from DEFAULT_COMPETENCIES
    },
    exams: {},                              // For cross-app integration (Body Comp reads this)
    lastSaved: null,
    _version: 0,                            // MUST be 0 in defaults (cloud always wins on fresh device)
    _lastModified: null,
    _dataLoaded: false                      // Flag to track if real data was loaded
};
```

---

## DEADLINE SYSTEM (Hybrid Static + Dynamic)

The deadline system uses a hybrid approach:
- **STATIC_DEADLINES** (const array, ~line 11125): 50+ hardcoded deadlines for Spring 2026
- **roadmapData.customDeadlines** (object): User-added deadlines with `generateId('custom')` keys
- **roadmapData.editedDeadlines** (object): Overrides to static deadline fields (keyed by `getDeadlineId()`)
- **roadmapData.completedDeadlines** (object): Completion status + grades (keyed by `getDeadlineId()`)
- **roadmapData.deletedDeadlines** (object): Deleted static deadlines
- **Working array `deadlines`** (let): Rebuilt every `initUI()` call from STATIC + custom - deleted

**Deadline shape (STATIC_DEADLINES entry):**
```javascript
{ date: '2026-02-18', day: 'Wed', what: 'EXAM 2...', course: 'Peds', weight: '45%', type: 'EXAM', month: 'february', done: true }
```

**Stable ID function:** `getDeadlineId(deadline)` at ~line 9551 — generates a stable key from deadline properties for sync safety.

---

## 5 FIREBASE GUARDS in saveData() (~line 10992)

```
GUARD A: if (isInitialLoad) return false;           // Never save during initial load
GUARD B: if (!hasLoadedFromCloud) return false;      // Never save before cloud data loaded
GUARD C: if (isEmptyState(roadmapData)) return false; // Never save empty state
GUARD D: if (!roadmapData._dataLoaded) return false; // Data must be confirmed loaded
GUARD E: if (firebaseSyncEnabled && !pinValidated) return false; // PIN must be validated
```

**Guard flag locations:**
```javascript
let isInitialLoad = true;       // ~line 8521 — cleared in loadFromFirebase/loadFromLocalStorage
let hasLoadedFromCloud = false;  // ~line 8522 — set true after Firebase load completes
let pinValidated = false;        // ~line 8523 — set true in setupUserAuth()
```

**Save flow:** mutate `roadmapData` -> `saveData()` -> localStorage IMMEDIATELY -> Firebase debounced (0-300ms) -> `setLocalUpdateFlag()` to prevent realtime echo -> retry on error

---

## GRADE CALCULATOR

**Course structures** defined in `courseStructures` at ~line 11829. Each course has `name`, `passing` threshold, and `components[]` array.

**Courses (6 graded):**
| Course Key | Name | Passing | Components |
|-----------|------|---------|------------|
| `oralmed` | Oral Medicine | 60% | 14 (participation, 10 quizzes, midterm, final, passion project) |
| `paincontrol` | Pain Control 2 | 60% | 7 (rx1, takehome1, midterm, medConsult, rx2, takehome2, final) |
| `critthink` | Critical Thinking | 60% | 9 (quiz1, quiz2, pico, articles, ppt, video, review, peer) |
| `peds` | Pediatric Dentistry | 60% | 5 (exam1@40%, exam2@45%, exam3@7.5%, headstart@2.5%, orthoModule@5%) |
| `perio` | Periodontology 2 | **65%** | 4 (midterm@40%, writtenAssignment@10%, discussion@5%, final@45%) |
| `ortho` | Orthodontics | 60% | 2 (midterm@50%, final@50%) |

**Grade formula** (in `loadCourseGrades()` ~line 11909):
```javascript
earnedPoints += (parseFloat(grade) / 100) * comp.weight;
completedWeight += comp.weight;
remainingWeight = 100 - completedWeight;
currentGrade = completedWeight > 0 ? (earnedPoints / completedWeight * 100) : 0;
```

**"What do I need" formula** (in `calculateNeeded()` ~line 12104):
```javascript
pointsNeeded = targetGrade - earnedPoints;
avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;
```

---

## QUICK REFERENCE: Key Functions

| Function | Line | Description |
|----------|------|-------------|
| `getDefaultRoadmapData()` | ~8465 | Returns fresh default state |
| `isEmptyState(data)` | ~8526 | Checks if state has real user data |
| `initFirebase()` | ~9440 | Firebase initialization with 3s fallback |
| `setupUserAuth(pin)` | ~9488 | PIN hash + Firebase path setup |
| `getDeadlineId(deadline)` | ~9551 | Stable ID for deadline sync |
| `loadFromLocalStorage(finalize)` | ~9757 | Load from localStorage (finalize=true sets all flags) |
| `loadFromFirebase()` | ~9817 | Initial Firebase load |
| `setupRealtimeSync()` | ~9906 | Cross-device realtime listener |
| `setupMainAppTasksSync()` | ~10031 | Sync tasks from index.html |
| `createCheckpoint(name)` | ~10323 | Save checkpoint to localStorage |
| `showCheckpointManager()` | ~10377 | Modal with checkpoint list |
| `restoreCheckpoint(index)` | ~10460 | Restore from checkpoint |
| `forceUploadToCloud()` | ~10837 | Bypass guards, push to Firebase |
| `forcePullFromCloud()` | ~10929 | Bypass guards, pull from Firebase |
| `saveData()` | ~10992 | Main save (5 guards + localStorage + Firebase) |
| `renderDashboard()` | ~11307 | Dashboard tab rendering |
| `renderDeadlines()` | ~11581 | Deadlines tab rendering |
| `loadCourseGrades()` | ~11909 | Grade calculator rendering |
| `calculateNeeded()` | ~12104 | "What grade do I need" calculator |
| `addNewDeadline()` | ~12259 | Show add deadline modal |
| `submitNewDeadline()` | ~12332 | Save new custom deadline |
| `toggleDeadlineDone(index)` | ~12396 | Toggle deadline completion |
| `submitDeadlineGrade(index)` | ~12514 | Submit grade for deadline |
| `syncDeadlineToGrades(d, done, grade)` | ~12563 | Sync deadline grade to courseStructures |
| `deleteDeadline(index)` | ~12681 | Delete a deadline |
| `loadExamCourseContent()` | ~12797 | Exam content study tracker |
| `initClinicalTab()` | ~13546 | Initialize clinical tab |
| `renderCompetencies()` | ~14480 | Competencies rendering |
| `setCompItemStatus(cat, id, status)` | ~14658 | Update competency item status |
| `adjustCompItem(cat, id, delta)` | ~14706 | Increment/decrement competency count |
| `initUI()` | ~15524 | Main UI initialization (merges deadlines, restores state) |
| `init()` | ~15747 | App entry point |
| `initDailyPlanner()` | ~15871 | Daily planner initialization |
| `initMonthlyPlanner()` | ~16577 | Monthly planner initialization |
| `switchTab(tabId, evt)` | ~11239 | Tab navigation |

---

## COMPETENCIES SYSTEM

Competencies live at `roadmapData.clinicalData.competencies` and are initialized from `DEFAULT_COMPETENCIES` (~line 14128).

**10 Categories (real BU dental school requirements):**
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
| `grouppractice` | Group Practice (GD 640) | Reviews, analyses, workshops |

**Each category has:** `{ name, icon, color, summary, notes, sections: [{ title, items: [{ id, text, required, completed }] }] }`

**Key functions:** `getCompetenciesData()`, `calculateCategoryStats()`, `calculateOverallStats()`, `getWhatsNextItems()`, `renderCompetencies()`, `setCompItemStatus()`, `adjustCompItem()`

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
