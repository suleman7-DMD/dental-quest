# CLAUDE.md - Dental Student Quest

## CRITICAL RULES

### Never Rebuild Entire Files
- Body-comp is ~21,854 lines. Use surgical `Edit` tool only. Read section first.
- **Split apps** (index.html: 12 modules, d3-roadmap: 10 modules, stim-calc: 10 modules) — use surgical edits on individual JS module files.

### Date Parsing (COMMON BUG)
```javascript
// WRONG: new Date('2026-02-02')  — off-by-one in EST
// CORRECT:
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```

### Other Common Bugs
- **Empty array truthy**: `[] || defaults` → `[]`. Check `.length` not truthiness.
- **`||` vs `??`**: `|| default` treats 0 as falsy. Use `?? default` for numeric targets/floors/counts.
- **Circular calculations**: A computed value must never fall back to itself as input.
- **Wrong field names**: Verify against `getDefaultState()` (e.g., `goalWeight_lbs` not `goalWeight`).
- **Double loadData()**: Causes race conditions. **Orphan function calls**: Verify function exists.
- **`_version: Date.now()`**: Causes data wipe. Must be 0 in defaults.
- **`undefined` in Firebase `.set()`**: Firebase rejects `undefined` values — use `?? null` or `?? false` for any field that might not be initialized. Crashes ALL saves silently.
- **`doToday` only for eod**: Only `urgency === 'eod'` should set `doToday: true`. Never set it for 'soon' — inflates TODAY count (fixed Mar 2026).
- **Stats cumulative counters**: `stats.totalTasks` drifts over time. Use live count from `getValues(tasks)` instead (fixed Mar 2026 in `updateStats()`).
- **UTC vs local dates**: Never use `.toISOString().slice(0,10)` for date comparisons — use `getLocalDateString(date)`. UTC can be wrong date in EST (fixed Mar 2026 in `updateSidebarStats()`).
- **Wrong field names in focusStats**: `dailyStreak` not `streak`. Always verify field names against `getDefaultState()` or `state.js` defaults.
- **XP dual counters**: `toggleTask()` must use `awardCommandCenterXP()` to update BOTH `stats.totalXPGained` AND `commandCenterData.focusStats.totalXP`. Un-completing must subtract from both.

---

## PROJECT OVERVIEW

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~12,186 | Main app: CSS + HTML only (zero inline JS) |
| `js/dental-quest/*.js` (12 modules) | ~10,762 | Main app JS: state, firebase-sync, medications, financials, calendar, daily-planner, notebook, tasks, triage, crash-out, focus-pomodoro, init |
| `d3-roadmap.html` | ~8,394 | Academic tracker: CSS + HTML only (zero inline JS) |
| `js/d3-roadmap/*.js` (10 modules) | ~9,135 | D3 roadmap JS: state, firebase-sync, deadlines, grades, exam-content, clinical, import-system, daily-planner, monthly-planner, init |
| `stimulant-elimination-calculator.html` | ~3,500 | Sleep prediction app — CSS + HTML only (zero inline JS) |
| `js/stimcalc/*.js` (11 modules) | ~10,877 | Stim calc JS: state, circadian, pharma-engine, sleep-prediction, firebase-sync, med-caffeine, ui-sections, history-calendar, graph, med-inventory, init |
| `body-comp-tracker.html` | ~22,444 | Calorie/protein/workout tracking, cross-app ecosystem, V3 analytics |
| `lecture-prompt-transformer.html` | ~2,800 | Lecture notes prompt builder (standalone) |

- **URL**: suleman7-dmd.github.io/dental-quest/ | **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: Multi-file JS modules (index.html: 12, d3-roadmap: 10, stim calc: 11) + single-file (body-comp, lecture-prompt). No build system. Push to `main` → live in ~30s.

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
// appName = 'appData' | 'stimulantCalculator' | 'd3Roadmap' | 'bodyCompTracker'
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
├── d3Roadmap/
│   ├── grades{}, editedDeadlines{}, customDeadlines{}, deletedDeadlines{}, completedDeadlines{}
│   ├── examStudyProgress{}, exams{}, mandatoryItems{}, pedsLockedIn
│   ├── monthlyPlanner{ notes{}, customTasks{}, overriddenStatic{}, completedTasks{} }
│   ├── clinicalData{ patients{}, appointments{}, competencies{} }
│   ├── dailyPlanner{}, lastSaved, _version: 0, _dataLoaded
│   └── (Body Comp reads exams{} and monthlyPlanner{})
└── bodyCompTracker/
    └── state{ profile{}, settings{}, today{ date, meals{}, workouts{}, targets{}, mode, setupComplete... },
         frequentFoods{}, weighIns{}, bodyCompHistory{}, dailyLogs{}, refeedTracker{},
         gamification{}, achievements{}, ecosystemContext{} (READ-ONLY, stripped on save),
         _version: 0, _dataLoaded }
```

### Sync Pattern (All 4 Apps)
```
Load:  loadFromFirebase() → merge with defaults → initUI()
Save:  saveData/saveState() → localStorage IMMEDIATELY → Firebase debounced (2s)
Hide:  save immediately | Show: refresh from Firebase
Status: 🟢 connected | 🔄 syncing | 🔴 offline | ⚠️ error
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
Stim Calc ──→ projectedSleepTime, meds, caffeine → Body Comp ecosystemContext.stimulant
Index.html ──→ medications (pill counts) → Body Comp ecosystemContext.inventory
Index.html ──→ tasks (doToday flag) → D3 Roadmap "Do Today" widget (realtime listener)
D3 Roadmap ──→ exams, monthlyPlanner → Body Comp ecosystemContext.academic + schedule
```
All cross-app reads are READ-ONLY. Lecture Prompt is standalone.

---

## SYNC PROTECTION SYSTEM (CRITICAL)

### The Data Wipe Bug (FIXED Jan 2026)
Default `_version: Date.now()` caused fresh browser to overwrite cloud with empty data. Fixed with 9 guards across all apps.

### Per-App Save Guards
| App | Function | Flag Name | Guards | Notes |
|-----|----------|-----------|--------|-------|
| index.html | `saveData()` in `firebase-sync.js` | `initialLoadComplete` | 5/5 | Both `saveData()` and `saveDataImmediate()` have 5 guards behind `firebaseInitialized`. Uses `buildSaveData()` shared helper. |
| d3-roadmap | `saveData()` | `isInitialLoad` | 5 | PIN guard last. |
| stim-calc | `saveState()` in `firebase-sync.js` | `isInitialLoad` | 5 | Both save fns have identical guards. |
| body-comp | `saveState()` | `isInitialLoad` | 5/5 | Both save fns have all 5 guards (PIN bug fixed Feb 2026). |

### Standard Guard Pattern (d3/stim/body-comp)
```javascript
if (!pinValidated) return false;
if (isInitialLoad) return false;
if (!hasLoadedFromCloud) return false;
if (isEmptyState(data)) return false;
if (!data._dataLoaded) return false;
```
Index.html now matches the standard pattern (5 guards behind `firebaseInitialized` check) after the Feb 2026 split.

### isEmptyState() Checks
| App | Empty If Missing ALL Of |
|-----|------------------------|
| index.html | tasks, calendarNotes, calendarEvents, notebook.pages, stats.totalXPGained, focusModeData, commandCenterData |
| d3-roadmap | customDeadlines, customTasks, appointments, blocks, notes, patients, completedDeadlines, examStudyProgress, grades, exams |
| stim-calc | medications, caffeine, history, sleepHistory, allNighterMode, _dataLoaded |
| body-comp | weighIns, today.meals, today.workouts, dailyLogs, bodyCompHistory, today.setupComplete |

### Checkpoint System (All 4 Apps)
Functions: `createCheckpoint()`, `showCheckpointManager()`, `restoreCheckpoint()`, `exportCheckpoint()`, `exportAllCheckpoints()`, `importCheckpoint()`, `importAndRestoreDirectly()`
Force sync: `forceUploadToCloud()`, `forcePullFromCloud()`
Storage keys: d3=`d3RoadmapCheckpoints`, body-comp=`bodyCompCheckpoints`, stim=`stimCalcCheckpoints`, index=file-based
Import accepts 6 flexible formats (full backup, single checkpoint, raw data, nested, currentState wrapper, app-specific wrapper).

---

## INDEX.HTML (DENTAL QUEST MAIN APP — Split Feb 2026)

### Architecture: Multi-File (Split from 22,900-line monolith)
```
index.html                              (~13,881 lines — CSS + HTML only, ZERO inline JS)
js/dental-quest/
├── state.js              (1,250 lines) - Globals, defaults, utilities, time helpers, Firebase config, getGreetingString
├── firebase-sync.js      (1,993 lines) - Auth, save/load, sync, checkpoints, buildSaveData, migrateTaskUrgency
├── medications.js          (337 lines) - Pill tracking, med settings, daily auto-reduce
├── financials.js         (1,183 lines) - Financial Cockpit (7 render functions), credit cards
├── calendar.js             (769 lines) - Master calendar, countdowns, calendar events
├── daily-planner.js        (674 lines) - Daily planner, Critical EOD Reset
├── notebook.js             (251 lines) - Multi-page notebook CRUD
├── tasks.js              (2,136 lines) - Task CRUD, Synchro cards, urgency board, Command Center core
├── triage.js               (784 lines) - Triage mode (tiers, columns, drag-drop, urgency propagation)
├── crash-out.js          (1,233 lines) - Crash Out timeline, scheduling, reordering
├── focus-pomodoro.js       (720 lines) - Pomodoro timer, gamification, streaks, rollovers
└── init.js                 (378 lines) - DOMContentLoaded bootstrap, Quick Add FAB, escape handler, urgency picker
```

### Script Loading Order (ORDER MATTERS — dependencies flow downward)
state → firebase-sync → medications → financials → calendar → daily-planner → notebook → tasks → triage → crash-out → focus-pomodoro → init

### Key Module Map
| What to change | File to edit |
|---------------|-------------|
| State defaults, globals, utilities, Firebase config, `getGreetingString()`, custom dialogs | `state.js` |
| Save guards, Firebase load/sync, checkpoints, PIN auth | `firebase-sync.js` |
| Pill tracking, med settings, auto-reduce | `medications.js` |
| Financial Cockpit, bills, projections, credit cards | `financials.js` |
| Master calendar, countdowns, events | `calendar.js` |
| Daily planner, Critical EOD Reset | `daily-planner.js` |
| Notebook pages CRUD | `notebook.js` |
| Task CRUD, rendering, `rerenderCurrentView()`, Command Center core, focus planning | `tasks.js` |
| Triage mode (tiers, columns, drag-drop), `toggleTaskComplete()` | `triage.js` |
| Crash Out timeline, scheduling, reordering | `crash-out.js` |
| Pomodoro timer, gamification, XP, streaks, rollovers | `focus-pomodoro.js` |
| App bootstrap, Quick Add FAB, escape handler, compact header | `init.js` |

### Bootstrap Sequence (init.js)
```
DOMContentLoaded → initApp() → initializeFirebase() → loadDataFromFirebase() (async)
  → .then() callback:
      1. Set sync flags (hasLoadedFromCloud, _dataLoaded, markInitialLoadComplete) — FIRST
      2. try { updateStats(), renderTasks(), initFocusMode(), etc. } catch — AFTER flags
  → 10-second failsafe: set ALL flags + load from localStorage if Firebase hangs
```
Firebase init is called from `initApp()` in init.js (NOT at firebase-sync.js parse time).
All cross-module function calls are safe because init.js loads LAST after all modules.
**CRITICAL**: Sync flags MUST be set BEFORE rendering calls. Post-load rendering MUST be in try/catch. This prevents a rendering error from permanently blocking all saves (bug fixed Feb 2026, commit `29ba742`).
**CRITICAL**: `buildSaveData()` must use `?? null`/`?? false` for ALL `currentSession` fields. Firebase `.set()` rejects `undefined` values — any missing field crashes ALL saves (bug fixed Feb 2026, commit `280b3f6`).
**CRITICAL**: The 10-second failsafe MUST set `hasLoadedFromCloud = true` and call `markInitialLoadComplete()`. Without this, saves are permanently blocked when Firebase connection times out (bug fixed Feb 2026, commit `280b3f6`).

### index.html File Layout (~13,881 lines — CSS + HTML only)
| Range | Content |
|-------|---------|
| 1-~12,200 | **CSS** (includes Synchro card, urgency board, capacity bars, z-index tokens, a11y classes, mobile responsive) |
| ~12,200-13,750 | **HTML body** (structure, modals, tabs, 5-column urgency board, ARIA landmarks) |
| ~13,750-13,770 | **Script tags** (12 module `<script src>` tags) |
| ~13,770-13,881 | **Quick Add FAB HTML** (with urgency picker pills) + closing tags |

### Two Views + View Modes
- **Full View** (`currentView = 'full'`): Category tabs + task list/board. Toggle between list and board via `currentViewMode`.
  - **List mode** (`currentViewMode = 'list'`): Tasks grouped by urgency sections (collapsible). `renderTasks()` in tasks.js.
  - **Board mode** (`currentViewMode = 'kanban'`): 5-column Synchro-style urgency board. `renderKanbanBoard()` in tasks.js.
- **Focused View** (`currentView = 'focus'`): Command Center with 3 modes (Triage → Crash Out → Focus).

### Urgency System (Synchro Board — Feb 2026)
`task.urgency`: `'eod'` | `'soon'` | `'week'` | `'month'` | `'inbox'` (default: `'inbox'`)
- **Must Today** (eod): 4h capacity bar. Auto-propagates `doToday=true`, `triageTier='lockedIn'`.
- **Up Next** (soon): 8h capacity bar. Maps to `triageTier='today'`.
- **This Week** (week): Maps to `triageTier='tomorrow'`.
- **This Month** (month): Low priority, no triage mapping.
- **Someday** (inbox): Default for new tasks. No triage mapping.
- `migrateTaskUrgency()` in firebase-sync.js infers urgency from existing `doToday`/`triageTier` for backward compat.
- Unified card component: `renderSynchroCard(task)` used in both list and board views.
- **Card structure** (Mar 2026): title → meta (dot+category+date) → badges (size badge + today + leverage + stale). Progress bar REMOVED.
- **List view**: urgency-colored left borders (eod=red, soon=amber, week=olive, month=blue, inbox=grey).
- **Sidebar**: 150px width (compressed from 240px, Mar 2026). Text labels preserved at 11px.

### Command Center Modes
`commandCenterMode`: `'triage'` | `'crashout'` | `'focus'`
- **Triage**: 3 columns (Locked In / Today / Tomorrow) + Scheduled + Rolled Over. Drag between columns. Urgency propagation via `setTaskTier()`.
- **Crash Out**: Sleep-time-anchored timeline. Google Calendar grid. Duration adjustment.
- **Focus**: SVG pomodoro timer. Checklist. Duration toggles (15/25/50 min). XP + confetti.

### Task Fields
Core: `id`, `text`, `category`, `completed`, `createdAt`, `doToday`, `size` (small/medium/big), `highLeverage`, `sortOrder`
Urgency: `urgency` (eod/soon/week/month/inbox) — bidirectional sync with doToday + triageTier
Triage: `triageTier` (lockedIn/today/tomorrow), `triageOrder`, `triageDate`
Crash Out: `crashOutScheduled`, `crashOutTime`, `crashOutDuration`, `crashOutOrder`
Other: `rolledOver` ({ fromDate, wasTier }), `xp`, `completedAt`

### Task Creation Sites (MUST update all when adding fields)
1. `addTask()` in tasks.js | 2. `triageQuickAddTask()` in triage.js | 3. `quickAddToColumn(urgency)` in tasks.js | 4. `submitQuickAdd()` in init.js

### Custom Dialog System (replaces native alert/confirm/prompt)
All native `alert()`, `confirm()`, `prompt()` calls replaced with DOM-based modals in state.js:
- `showCustomAlert(title, message)` — informational, single OK button
- `showCustomConfirm(title, message, callback)` — yes/no with callback
- `showCustomPrompt(title, message, defaultVal, callback)` — text input with callback
CSS: `.custom-modal-overlay`, `.custom-modal-card`, `.custom-modal-btn-*`

### Escape Key Handler (init.js)
10-layer priority-ordered handler: custom modal → checkpoint → task details → task edit → planning → time prompt → duration → focus complete → static modals → dashboard expansions

### Color System
All JS-rendered colors use CSS variables — zero hardcoded neon hex values remain.
Category colors use `var(--cat-financial)`, `var(--cat-clinic)`, etc.
Z-index scale: 10 `--z-*` tokens in `:root` (base, sidebar, sticky, header, fab, overlay, modal, toast, loading).

### XP & Gamification
Levels = 500 XP each. Awards: lockedIn=50, crashOut=75, rolledOver=40, default=25. Perfect Day=200 bonus.
EOD Reset at 5 AM: clears mustComplete flags, resets Focus Mode daily tasks.

### Mobile UI
- Compact header (sticky, blur, sync dot, streak pill, view toggle, hamburger)
- Quick Add FAB (bottom-right button, bottom sheet with urgency picker pills)
- Board view: CSS scroll-snap horizontal swipe, one column per screen on mobile (85vw)
- 2-row task layout with explicit DOM (iOS Safari fix — no flex-wrap)
- Breakpoints: 1024px, 768px, 480px

### Focus Mode Chrome Hiding
- `body.focus-active` class added/removed by `switchToFocusMode()`/`switchToFullView()`
- Hides: cross-app nav, app title, toolbar icons, stat labels
- Focused-view CSS overrides at ~6145-6700 use `!important`

### Drag-Drop Performance
- `setTaskTier()` does TARGETED column re-renders, not full `renderFocusMode()`
- Must call `invalidateTriageCache()` + `_renderFrame++` before targeted renders
- `getTodayTriageTasks()` uses frame-level cache (`_renderFrame` counter)
- `escapeHtml()` uses string replacement (no DOM allocation)

### Historical: Crash Out & Task Ordering
- Up/down buttons = `swapAdjacentTasks()` (SWAP). Drag-drop = `moveTaskToPosition()` (INSERT).
- `skipTask()` = dismisses prompt (3-min cooldown). `removeTaskFromSchedule()` = actually removes.
- Pill auto-reduce: `checkAndApplyDailyPillReduce()` on load, catches multi-day gaps.

---

## D3-ROADMAP.HTML (ACADEMIC TRACKER — Split Feb 2026)

### Architecture: Multi-File (Split from 17,575-line monolith)
```
d3-roadmap.html                           (8,394 lines — CSS + HTML only, ZERO inline JS)
js/d3-roadmap/
├── state.js              (614 lines)  - Globals, defaults, roadmapData, sync flags, utilities, date/UI helpers
├── firebase-sync.js    (1,760 lines)  - Auth, save/load, mergeRemoteState, checkpoints, cross-app sync
├── deadlines.js          (804 lines)  - STATIC_DEADLINES, exams, renderDeadlines, deadline CRUD
├── grades.js             (384 lines)  - courseStructures, loadCourseGrades, calculateNeeded, grade sync
├── exam-content.js     (1,327 lines)  - examContentData, exam study tracker, progress calculations
├── clinical.js         (1,451 lines)  - DEFAULT_COMPETENCIES, patients, appointments, competency system
├── import-system.js      (543 lines)  - Lecture import, clinical import, cross-tab sync
├── daily-planner.js      (573 lines)  - Clock, pomodoro timer, timeline, daily blocks
├── monthly-planner.js  (1,142 lines)  - Calendar grid, weeks, task CRUD, notes, keyboard shortcuts
└── init.js               (537 lines)  - renderDashboard, initUI, init, DOMContentLoaded bootstrap
```

### Script Loading Order (ORDER MATTERS — dependencies flow downward)
state → firebase-sync → deadlines → grades → exam-content → clinical → import-system → daily-planner → monthly-planner → init

### Key Module Map
| What to change | File to edit |
|---------------|-------------|
| State defaults, globals, roadmapData, sync flags, utilities | `state.js` |
| Save guards, Firebase load/sync, mergeRemoteState, checkpoints, PIN auth | `firebase-sync.js` |
| STATIC_DEADLINES, exams array, deadline rendering/CRUD | `deadlines.js` |
| courseStructures, grade calculator, grade-deadline sync | `grades.js` |
| examContentData, exam study tracker, progress | `exam-content.js` |
| DEFAULT_COMPETENCIES, patients, appointments, competency system | `clinical.js` |
| Lecture/clinical import, cross-tab sync | `import-system.js` |
| Daily planner, clock, pomodoro, timeline | `daily-planner.js` |
| Monthly planner, calendar grid, weeks, tasks | `monthly-planner.js` |
| Dashboard rendering, initUI, app bootstrap | `init.js` |

### Bootstrap Sequence (init.js)
```
DOMContentLoaded → init() → initFirebase() → loadFromFirebase() (async)
  → .then() callback: mergeRemoteState(data) + initUI()
  → 2s/3s fallback timers: force initUI() if Firebase hangs
```
Firebase init called from `init()` in init.js (NOT at firebase-sync.js parse time).
All cross-module function calls safe because init.js loads LAST after all modules.
`mergeRemoteState(data)` consolidated from 4 identical merge blocks into 1 function in firebase-sync.js.

### d3-roadmap.html File Layout (~8,394 lines — CSS + HTML only)
| Range | Content |
|-------|---------|
| 1-5,520 | **CSS** |
| 5,522-8,381 | **HTML body** (header, 11 tabs, 6 modals) |
| 8,383-8,392 | **Script tags** (10 module `<script src>` tags) |
| 8,393-8,394 | `</body></html>` |

### 11 Tabs
Dashboard, Deadlines, Courses, Grades, Exam Content, Classmate Share, Mandatory, Daily Planner, Monthly Planner, Clinical (3 subtabs: Patients/Appointments/Competencies), Always Remember

### Key Patterns
- **Deadline IDs**: `getDeadlineId()` in state.js — stable IDs from properties (not array index)
- **`loadFromLocalStorage(finalize)`**: `finalize=true` terminal, `finalize=false` from loadFromFirebase
- **Static → Custom conversion**: Editing static task creates custom + `overriddenStatic` entry
- **Monthly Planner**: 5 base weeks, `extendWeeksIfNeeded()`, Google Calendar grid, 6 task types
- **Competencies**: 10 categories in clinical.js, object-based, status toggles, progress rings
- **Cross-app**: Reads Do Today tasks from index.html via `setupMainAppTasksSync()`. Writes exams for Body Comp.
- **mergeRemoteState()**: Single consolidated function in firebase-sync.js (replaces 4 duplicated merge blocks)

### Grade Calculator (DON'T CHANGE — in grades.js)
```javascript
earnedPoints += (grade / 100) * comp.weight;  // per component with grade
remainingWeight += comp.weight;                // per component without grade
avgNeeded = ((targetGrade - earnedPoints) / remainingWeight) * 100;
```

### 6 Courses (courseStructures in grades.js)
| Course | Key Components | Pass |
|--------|----------------|------|
| Oral Medicine | 10 quizzes (2.5% ea), Midterm (25%), Final (40%), Passion Project (12.5%) | 60% |
| Pain Control 2 | Midterm (30%), Final (40%), Take-Home (24%), Other (6%) | 60% |
| Critical Thinking | Quiz 1+2 (5% ea), Group Project (30%), Systematic Review (30%), Final (30%) | 60% |
| Peds | Exam 1 (40%), Exam 2 (45%), Exam 3 (7.5%), Headstart (2.5%), Ortho (5%) | 60% |
| Perio 2 | Midterm (40%), Final (45%), Written (10%), Discussion (5%) | **65%** |
| Ortho | Midterm (50%), Final (50%) | 60% |

---

## BODY COMP TRACKER (body-comp-tracker.html)

### File Layout (~22,444 lines)
| Range | Content |
|-------|---------|
| 1-6,548 | **CSS** (includes 375px iPhone SE breakpoint) |
| 6,549-7,400 | **HTML** — header (with settings gear), simple view (reordered: hero → progress → burn → chips → **actions** → collapsible context → meals), setup, ~16 modals |
| 7,400-22,444 | **JavaScript** |

### Key JS Locations (approximate — shifted by +590 lines from Mar 2026 overhaul)
| Range | Content |
|-------|---------|
| ~7,400-7,520 | `getDefaultState()` factory |
| ~7,720-7,750 | Sync flags, `isEmptyState()`, `hasRealData()` |
| ~7,750-7,940 | Data integrity (`generateId`, `getValues`, `getCount`) |
| ~8,140-8,330 | Core: `calculateTDEE`, `calculateMode`, `calculateTargets`, `refreshTodayTargets` |
| ~8,330-8,620 | V2: `determineDayStatus`, score calculators, `recalculateAllDayLogs` |
| ~8,620-9,100 | `renderSimpleView` (auto-corrects stale targets, shows remaining context on progress bars) |
| ~8,700-8,720 | Toast queue system (`showToast`, `processToastQueue`, `toastQueue[]`) |
| ~10,000-10,180 | Status engine (`getSimpleStatus`) + 11-priority nudge (`getEatingNudge`) |
| ~10,320-11,400 | Meal/workout CRUD, historical editing, "Add Another" on meal modal |
| ~11,400-11,680 | Import from Claude (MEAL\|/WORKOUT\| pipe format) |
| ~12,300 | `saveDayLog()` — snapshot today → dailyLogs[date] |
| ~12,400-12,700 | Quick Meal modal (date picker for historical routing) |
| ~16,097-16,200 | **CRITICAL**: `saveState()` (5 guards) + `saveStateImmediate()` (5 guards) |
| ~16,200-16,620 | `saveToFirebase()` (strips ecosystemContext), `loadFromFirebase()`, realtime sync |
| ~17,170-17,400 | Firebase init, PIN auth |
| ~17,400-17,870 | `loadEcosystemData()` (reads 4 Firebase paths), ecosystem refresh (60s polling) |
| ~17,870-18,040 | Gamification (10 levels, XP, streaks, achievements) |
| ~18,040-18,400 | Progress tab: `renderProgressSummary()` (3 cards), `addProgressGroupHeaders()` (6 groups) |
| ~18,400-19,700 | **V3 analytics**: 6 research-backed modules + V2 analytics + aggregation |
| ~20,500-21,400 | Calendar heatmap (8 statuses), day details modal (with weigh-in section + empty day CTAs) |
| ~21,400-22,444 | Initialization, day management, data integrity, DOMContentLoaded |

### Save Chain
```
mutate state → saveState() → saveDayLog() → re-render
```
- `saveToFirebase()` strips `ecosystemContext` (READ-ONLY data never saved back)
- Deep copy meals/workouts in day logs: `JSON.parse(JSON.stringify(data))`

### Ecosystem Integration (READ-ONLY)
| Source | Firebase Path | Data |
|--------|--------------|------|
| Stim Calc | /stimulantCalculator/state | sleep, meds, caffeine, projectedSleepTime, allNighterMode |
| Index.html | /appData/medications | pill counts, refill dates |
| D3 Roadmap | /d3Roadmap/exams | exam schedule |
| D3 Roadmap | /d3Roadmap/monthlyPlanner | today's schedule |

Loaded via `loadEcosystemData()` (~16,340) + 60s polling + stimulant realtime listener.

### Mode System
| Sleep | Mode | Deficit | Training |
|-------|------|---------|----------|
| 6+ hrs | GREEN | 500 cal | Normal |
| 5-6 hrs | YELLOW | 300 cal | Light |
| <5 hrs | ORANGE | 0 (maintenance) | Recovery only |

### V2/V3 Analytics
- `determineDayStatus()`: 8 statuses (perfect/good/partial/over/missed/deficit_gym/gym_only/no_data)
- `aggregateDailyLogs(start, end)`: Shared data source for calendar + progress
- `calculateWeekScore`: Letter grades A+ through F, gymScore capped at 100
- **V3 (Feb 2026)**: 6 new research-backed modules, all collapsible accordion, achievements at bottom
- V3 modules: Rate of Weight Loss (Helms), Metabolic Adaptation (Trexler), Protein Efficiency (Morton), Recomp Trajectory (Barakat), Deficit Adherence Patterns, Training Volume & Recovery (Schoenfeld)

### Day Lifecycle
```
DOMContentLoaded → loadState() → initFirebase() → scheduleEndOfDaySave()
  → autoStartDay() (ecosystem → mode → TDEE → targets → setupComplete) → renderSimpleView()
11:59:59 PM → saveDayLogWithSnapshot() | 12:01:09 AM → autoResetForNewDay()
Visibility → checkAndResetDayIfNeeded() | Every 5 min → saveDayLog()
```

### Gamification
10 levels (0-5500 XP). XP: logMeal=10, hitCalorie/Protein=30, perfectDay=50, weeklyWeighIn=25, streakBonus=5/day.
12 achievements. Daily completion streak (not gym streak). `updateStreak()` after meals + setup.

### Key Features (Mar 2026 Overhaul)
- **Retroactive data input**: All date max constraints removed. Quick Meal modal has date picker. Calendar day details has weigh-in section + empty day CTAs.
- **`refreshTodayTargets()`**: Auto-recalculates TDEE/targets after any historical data change (14 call sites). Fixes stale targets after past-date workout/meal/weigh-in edits.
- **Home screen reorder**: Action buttons immediately after progress bars. Context cards in collapsible section (collapsed by default, persisted).
- **Progress tab**: 3 summary cards (Weekly Weight, Avg Deficit, Protein Compliance) + 6 group headers + improved empty states.
- **Data propagation fixes**: 6 bugs fixed — missing `renderCalendarHeatmap()` after meal edits, missing `saveDayLog()` after weigh-in/body comp, `deleteWeighIn()` reverts profile weight, TDEE recalc after weigh-in changes.
- **Modal UX**: "Add Another" button on meal save, toast queue system, direct qty input, morning boot toast, settings gear icon.
- **375px breakpoint**: iPhone SE support (2x2 chips, 44px touch targets, ellipsis overflow).

### Key Historical Fixes
- **TDEE circular inflation** (Feb 2026): `get7DayAvgActiveCalories()` and `calculateTDEE()` only use workout object data, no `activeCalories` fallback. `renderSimpleView` auto-corrects stale targets.
- **Progress tab V2** (Feb 2026): `??` for numeric fallbacks, gymScore capped, `goalWeight_lbs` field, `determineDayStatus()` in calendar fallback.
- **Progress tab V3** (Feb 2026): 8 bugs fixed (undefined wrapProgressModules, hard-coded targets, streak gaps, achievement unlock truthiness, stale today data, surplus misclassified as missed, perfect_week cumulative→consecutive, saveStateImmediate PIN guard). 6 new research-backed analytics modules added. All modules collapsible. Achievements moved to bottom.

---

## STIMULANT CALCULATOR (11 JS Modules — Split Feb 2026, Warm Clinical Theme Feb 2026)

### Architecture: Multi-File (Split from 11,526-line monolith)
```
stimulant-elimination-calculator.html  (~3,500 lines — CSS + HTML only, ZERO inline JS)
js/stimcalc/
├── state.js              (475 lines)  - Globals, defaults, utilities, time helpers
├── circadian.js          (229 lines)  - Circadian analysis, forbidden zone, sleep gate
├── pharma-engine.js      (657 lines)  - Drug decay, VitC model, threshold, clearance
├── sleep-prediction.js   (284 lines)  - 7-phase sleep prediction algorithm
├── firebase-sync.js    (1,408 lines)  - Auth, save/load, sync, checkpoints, mergeRemoteState
├── med-caffeine.js       (295 lines)  - Medication + caffeine CRUD
├── ui-sections.js      (1,911 lines)  - Nicotine, modifiers, workout, what-if, forecast
├── history-calendar.js (2,888 lines)  - History, calibration, calendar, analytics, accuracy
├── graph.js              (733 lines)  - Canvas graphs, tooltips, spline interpolation
├── med-inventory.js      (755 lines)  - Cross-app medication pill tracker (shared with index.html)
└── init.js             (1,108 lines)  - recalculate() (3 phases + try/catch), init, sidebar nav
```

### Script Loading Order (ORDER MATTERS — dependencies flow downward)
state → circadian → pharma-engine → sleep-prediction → firebase-sync → med-caffeine → ui-sections → history-calendar → graph → med-inventory → init

### Key Module Map
| What to change | File to edit |
|---------------|-------------|
| State defaults, utilities, time helpers | `state.js` |
| Circadian zones, forbidden zone, sleep gate | `circadian.js` |
| Drug decay, threshold, VitC, clearance search | `pharma-engine.js` |
| Sleep prediction algorithm (7 phases) | `sleep-prediction.js` |
| Firebase, save guards, sync, checkpoints | `firebase-sync.js` |
| Add/remove medications or caffeine | `med-caffeine.js` |
| Nicotine, modifiers, workout, what-if, forecast | `ui-sections.js` |
| History, calibration, calendar, analytics dashboard, accuracy transparency | `history-calendar.js` |
| Canvas graphs, tooltips | `graph.js` |
| Medication inventory, pill tracking, refill calendar | `med-inventory.js` |
| recalculate(), init, accordion, hero UI, sidebar nav | `init.js` |

### Theme: Warm Clinical (Feb 2026)
- 70+ CSS vars in `:root` matching index.html design system. Canvas=#FAF8F5, accent=#6B7C5E (olive), fg=#2C2825.
- All JS-rendered colors use warm hex values (no neon). Status: success=#5E8A5E, warning=#C4923A, destructive=#B85C5C, info=#5E7A8A.
- Circadian phase colors in `circadian.js` use warm palette. `history-calendar.js` color comparisons match.
- Graph uses clean 2px lines with 3.5px dots (no glow/blur effects). Canvas background is transparent (inherits from CSS).
- classList approach for status pills (`pill-safe`/`pill-danger`) and hero state (`state-green`/`state-yellow`/`state-red`).
- When adding new JS-rendered colors, use warm hex values from the palette above — never use neon (#58a6ff, #10b981, #ef4444, etc.).

### recalculate() — Refactored (init.js)
```javascript
recalculate() → try {
    syncStateFromDOM()    // Read ~20 DOM inputs → state
    runCalculations()     // Pure math → returns viewModel
    updateUI(vm)          // viewModel → 50+ DOM elements
} catch (e) { hero shows "Calc Error", self-heals next 5s cycle }
```

### mergeRemoteState() — Consolidated (firebase-sync.js)
Previously 4 duplicated merge blocks → now 1 function called by loadFromFirebase, setupRealtimeSync, visibilitychange handler.

### XR Pharmacokinetics (ALL doses are XR — DON'T CHANGE)
```javascript
// 50% immediate release at T+0, 50% delayed release at T+4
// remaining = dose × 0.5^(elapsed / half_life)
// Creates NON-MONOTONIC curves — load spikes UP at DR release
```

### 7-Phase Sleep Prediction (sleep-prediction.js)
1. Pharmacokinetic Floor (drugs clear threshold)
2. Circadian Constraints (Forbidden Zone + Wake Maintenance Zone)
3. Time-Based Blockers (cortisol/thermal from workouts)
4. Nicotine Advisory (quality modifier, not hard blocker)
5. Circadian Clamp (re-check)
6. Pharmacokinetic Floor Enforcement (drugs can't be overridden)
7. Final Drug Verification

### Key Parameters
| Parameter | Default |
|-----------|---------|
| Amp half-life | 11h (range 8-15) |
| Sleep threshold | 14mg |
| Caff half-life | 5h |
| Caff threshold | 25mg |

### Vitamin C: Reduces amp half-life to 70%, 8h TTL, 3-segment decay model.
### Circadian: Uses 7-day avg wake time (not raw daily). WMZ 11-13h, FZ 13-15h, Sleep Gate 15-17h.
### All-Nighter: Ghost load (yesterday's doses via VitC-aware decay), hyperarousal negates sleep debt bonus.
### Cross-app: Writes `projectedSleepTime` + `projectedSleepMinutes` to Firebase for Body Comp.

---

## FINANCIALS SYSTEM (index.html)

### Data Structure (v2: Per-Month Expenses)
```javascript
financials = {
    masterLiquidity: { currentCash, loanDisbursementDate: '2026-01-10', loanAmount: 18447,
                       targetCushion: 2285, semesterEndDate: '2026-05-14' },
    expenseTemplate: { rent: {name,amount,category}, ... },  // defaults for new months
    months: { '2026-02': { label, partial, fraction, expenses: {rent:{name,amount,category,paid},...} }, ... },
    oneTimeBills: { [id]: { id, description, amount, type: 'income'|'expense', dueDate, paid } },
    creditCards: [{ id, name, balance, limit, daysLate, apr, phone, negotiationNotes }],
    actionItems: [{ id, title, deadline, priority, completed, notes }]
};
```
Projection: `availableCash - unpaidMonthsTotal`. Health: GREEN (≥cushion) | YELLOW (>0) | RED (<0).
7 render functions: `renderMasterLiquidity`, `renderOneTimeBills`, `renderMonthlyExpenses`, `renderExpenseTemplate`, `renderProjectionPanel`, `renderActionItems`, `renderCreditCards`.

---

## SULLY CONTEXT

- **D3 dental student** at BU Goldman, graduating May 2027. ADHD: Adderall XR 50mg max (30mg+20mg).
- **Physical**: 5'8.5", 190 lbs, goal 170 by June 1 2026, ~27% body fat.
- **Peds at-risk**: 77% on Exam 1 (40%), locked in 33.3 pts. Needs ~80%+ on Exam 2.
- **Key dates**: Perio 2 Final Mar 11, PC2 Final Mar 19, Peds Exam 3 Mar 30, May 14 loan disbursement.

---

## THINGS NOT TO CHANGE WITHOUT TESTING
Firebase config, PIN auth, save/sync debounce, grade calculator math, XR pharmacokinetic model, date parsing, sync protection guards, `isEmptyState()`, checkpoint system.
