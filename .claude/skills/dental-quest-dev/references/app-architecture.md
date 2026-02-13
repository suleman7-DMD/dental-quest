# index.html Application Architecture

## Table of Contents
- [File Structure](#file-structure)
- [CSS Sections](#css-sections-approximate)
- [HTML Body Structure](#html-body-structure-lines-10581-11948)
- [Global State Objects](#global-state-objects)
- [Firebase Architecture](#firebase-architecture)
- [View System](#view-system)
- [Category System](#category-system)
- [Render Hierarchy](#render-hierarchy)
- [Event Flow: Task Creation](#event-flow-task-creation)
- [Event Flow: Task to Focus](#event-flow-task-to-focus)
- [Daily Reset / Rollover Logic](#daily-reset--rollover-logic)
- [Data Integrity Utilities](#data-integrity-utilities-lines-12455-12500)
- [BackupManager](#backupmanager-lines-12701-12748)
- [Initialization Sequence](#initialization-sequence)

## File Structure

`index.html` is a single-file application (~22,705 lines). No build system, no npm.

```
Lines 1-12        HTML head, Firebase SDK imports
Lines 13-10580    <style> block (all CSS)
Lines 10581-11948 <body> HTML: loading overlay, modals, views, panels
Lines 11949-22474 First <script> block (main application logic)
Lines 22476-22524 Quick Add FAB HTML + Quick Add Panel HTML
Lines 22526-22703 Second <script> block (Quick Add JS, compact header hooks)
Lines 22704-22706 </body></html>
```

## CSS Sections (approximate)

| Range | Content |
|-------|---------|
| 13-49 | Base styles, body gradient, font settings |
| 50-100 | Cross-app navigation bar |
| ~9488 | Mobile compact header styles |
| ~9713 | Quick Add FAB styles |
| ~9904-10225 | Full View mobile overhaul v2 |
| ~10225-10580 | Additional responsive breakpoints |

## HTML Body Structure (Lines 10581-11948)

```
<body>
  Loading overlay (#loadingOverlay)           ~10584
  Toast notification (#toast)                  ~10598
  Cross-app navigation bar                     ~10610
  Compact header (mobile)                      ~10650
  PIN modal (#pinModal)                        ~10700
  Main view toggle (Focus/Full buttons)        ~10730
  Focus Mode container (#focusModeContainer)   ~10745
    Command Center (triage/crashout/focus tabs)
    Welcome overlay
    Progress ring, XP display
    Triage columns (lockedIn, today, tomorrow)
    Scheduled section
    Crash Out timeline
    Focus Pomodoro session
  Full View container (#fullViewContainer)     ~11100
    Category tabs
    Task input
    XP bar, medication tracker
    Task list (#taskList)
  Calendar modal (#calendarModal)              ~11350
  Financial modal (#financialModal)            ~11500
  Notebook modal (#notebookModal)              ~11700
  Daily planner modal                          ~11800
  Task edit modal (#taskEditModal)             ~11850
  Achievement popup                            ~11943
</body>
```

## Global State Objects

### Sync Protection Variables (Line 11966-11976)

```javascript
let firebaseInitialized = false;   // 11967
let database = null;               // 11968
let currentUser = null;            // 11969
let initialLoadComplete = false;   // 11970 (CRITICAL: prevents saving before Firebase loads)
let hasLoadedFromCloud = false;    // 11971
let pinValidated = false;          // 11972
let userPassword = null;           // 11973
let saveDebounceTimer = null;      // 11974
let pendingSaveData = null;        // 11975
let offlineSyncPending = false;    // 11976
```

### App Variables (Lines 12034-12448)

```javascript
// Current state
let currentCategory = 'dotoday';     // 12037 - active category tab
let currentView = 'focus';           // 12047 - 'focus' or 'full'
let currentTask = null;              // 12044 - selected task in Full View

// Task storage
let tasks = {};                      // 12038 - Object with ID keys (Firebase-safe)

// Timer (Full View legacy pomodoro)
let timerInterval = null;            // 12039
let currentSeconds = 25 * 60;       // 12040
let isWorkSession = true;           // 12041
let workMinutes = 25;               // 12042
let breakMinutes = 5;               // 12043

// Focus Mode data (persisted)
let focusModeData = {               // 12048
    oneThingId: null,
    microSteps: {},
    todaysTasks: { big: {}, medium: {}, small: {} },
    focusTimerSeconds: 0,
    focusTimerRunning: false,
    focusTimerInterval: null,
    lastPlanningDate: null
};
let lastCriticalEODReset = null;    // 12057

// Command Center data (persisted)
let commandCenterData = {           // 12060
    crashOut: {
        sleepTime: null,
        lastReset: null
    },
    focusStats: {
        totalXP: 0,
        focusStreak: 0,
        dailyStreak: 0,
        lockedInStreak: 0
    },
    currentSession: {
        taskId: null,
        checklist: {},
        timerMinutes: 25,
        timerRemaining: null
    }
};

// UI editing state
let editingTaskId = null;            // 12078
let editingTaskSize = 'medium';      // 12079
let editingTaskLeverage = false;     // 12080
let planningMode = 'onething';       // 12081
let selectedPlanningTaskId = null;   // 12082

// Stats (persisted)
let stats = {                        // 12084
    totalXPGained: 0,
    totalTasks: 0,
    categoryXPGained: {
        financial: 0, clinic: 0, health: 0,
        school: 0, academic: 0, future: 0, life: 0
    }
};

// Medications (persisted)
let medications = {                  // 12098
    '30mg': {
        pills: 30,
        refillDate: null,
        dosesLogged: {},
        lastAutoReduceDate: null,
        lastManualChange: null,
        lastManualChangeType: null
    },
    '20mg': { /* same structure */ }
};

// Calendar & Notes (persisted)
let calendarNotes = {};              // 12117 - { 'YYYY-MM-DD': 'note text' }
let pillAssignments = {              // 12118 - { '30mg': { 'YYYY-MM-DD': true }, '20mg': {...} }
    '30mg': {}, '20mg': {}
};
let calendarEvents = {};             // 12122 - Object with ID keys

// Notebook (persisted)
let notebook = {                     // 12125
    pages: {},
    currentPageId: null
};

// Financials (persisted)
let financials = {                   // 12131
    masterLiquidity: {
        currentCash: 0, lastUpdated: null,
        loanDisbursementDate: '2026-01-10', loanAmount: 18447,
        targetCushion: 2285, semesterEndDate: '2026-05-14'
    },
    expenseTemplate: { /* 8 expense categories */ },
    months: {
        '2026-02': { label, partial, fraction, expenses: { /* per-expense paid flag */ } },
        '2026-03': { ... }, '2026-04': { ... }, '2026-05': { ... }
    },
    oneTimeBills: { /* keyed by ID, each has: id, description, amount, type, dueDate, paid, category */ },
    creditCards: [ /* array of card objects */ ],
    actionItems: [ /* array of action items */ ],
    customTransactions: []
};

// Daily Planner (persisted)
let dailyPlanner = {                 // 16390
    date: null,
    goal: '',
    bedtime: '23:00',
    blocks: {},
    lastReset: null
};

// Command Center mode (ephemeral)
let commandCenterMode = 'triage';    // 19519

// Focus timer (ephemeral)
let focusTimerInterval = null;       // 19522
let focusTimerRunning = false;       // 19523
let focusTimerSecondsRemaining = 25 * 60;  // 19524
let focusTimerDuration = 25;         // 19525

// UI state (not persisted)
let collapsedMonths = {};            // 12451
let currentMedModal = null;          // 12453
let currentCalendarDate = new Date(); // 15945
```

## Firebase Architecture

### Path Pattern
```
users/user_[hashedPin]/appData/
```

### PIN Handling (Lines 13854-13925)
1. Check `localStorage.getItem('dentalQuestPin')` (primary key)
2. Fallback to `localStorage.getItem('dentalAppPin')` (legacy key)
3. If neither exists, prompt user for new PIN
4. Hash: `'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '')`
5. Set `currentUser = { uid: hashedPin }`
6. Set `pinValidated = true`
7. Call `loadDataFromFirebase()`

### Data Saved to Firebase (saveData, Line 12902)
```javascript
const data = {
    tasks, stats, medications, calendarNotes, notebook,
    financials, pillAssignments, calendarEvents, dailyPlanner,
    focusModeData: { oneThingId, microSteps, todaysTasks, lastPlanningDate },
    commandCenterData: {
        crashOut: { sleepTime, lastReset },
        focusStats: { totalXP, focusStreak, dailyStreak, lockedInStreak },
        currentSession: { taskId, checklist, timerMinutes }
    },
    lastCriticalEODReset,
    lastSaved: Date.now()
};
```

### Save Guards (5 total, Lines 12907-12970)
1. `!pinValidated` - never save before PIN validation
2. `!initialLoadComplete` - never save before initial load
3. `!hasLoadedFromCloud` - never save before cloud data loaded
4. `isEmptyState(data)` - never save empty state (localStorage-only fallback)
5. Firebase initialized checks (implicit in guard conditions)

### Save Flow
```
User action -> saveData()
  -> Guards pass?
    -> markLocalChange()
    -> localStorage.setItem() IMMEDIATELY
    -> Debounced Firebase write (timer-based)
```

### Load Flow (Lines 13928-13968)
```
initializeFirebase()
  -> PIN validation
  -> loadDataFromFirebase()
    -> database.ref('users/.../appData').once('value')
    -> Merge cloud data with defaults (spread operator)
    -> migrateArrayToObject() for tasks, calendarEvents
    -> Set hasLoadedFromCloud = true
    -> markInitialLoadComplete()
    -> initUI -> loadData() -> renderTasks() + initFocusMode()
```

### isEmptyState() (Lines 11978-11998)
Returns true if data has NONE of:
- tasks (any keys)
- calendarNotes (any keys)
- calendarEvents (any keys)
- notebook.entries (any keys)
- stats.totalXPGained > 0
- focusModeData.oneThingId or microSteps
- commandCenterData with crash out or focus stats or session

## View System

### Two Main Views
- **Focus View** (`#focusModeContainer`) - Default. Command Center with 3 tabs.
- **Full View** (`#fullViewContainer`) - Category-based task list with legacy pomodoro.

### View Switching (Lines 18926-18947)

```javascript
function switchToFocusMode() {     // 18926
    currentView = 'focus';
    focusModeContainer.display = 'block';
    fullViewContainer.display = 'none';
    renderFocusMode();
}

function switchToFullView() {      // 18937
    currentView = 'full';
    focusModeContainer.display = 'none';
    fullViewContainer.display = 'block';
    renderTasks();
}
```

### Command Center Modes (Lines 19518-19599)

Three tabs within Focus View:

```javascript
let commandCenterMode = 'triage';  // 19519

function switchCommandCenterMode(mode) {  // 19555
    commandCenterMode = mode;  // 'triage' | 'crashout' | 'focus'
    // Update tab styling
    // Render corresponding mode
    if (mode === 'triage') renderTriageMode();
    else if (mode === 'crashout') renderCrashOutMode();
    else renderFocusPomodoroMode();
}
```

### renderFocusMode() Dispatch (Line 18949)
```
renderFocusMode()
  -> updateCommandCenterGreeting()
  -> updateOverallProgress()
  -> getCurrentCommandCenterMode()
     -> 'triage'   -> renderTriageMode()
     -> 'crashout'  -> renderCrashOutMode()
     -> 'focus'     -> renderFocusPomodoroMode()
```

## Category System

7 task categories + 1 virtual "Do Today" view:

```javascript
const categories = ['financial', 'clinic', 'health', 'school', 'academic', 'future', 'life'];
// Line 18355

const categoryNames = {                    // 18309
    financial: '💰 Financial Progress',
    clinic: '🦷 Clinic Requirements Progress',
    health: '❤️ Health & Wellbeing Progress',
    school: '📋 School Maintenance Progress',
    academic: '📚 Academic & Didactic Progress',
    future: '🚀 Future Job & Life Progress',
    life: '🏡 General Life Maintenance Progress'
};
```

- `currentCategory = 'dotoday'` is a virtual tab that shows all tasks with `doToday: true`
- Category tabs are HTML elements with `data-category` attributes
- Each category shows task count badge: `#count-{category}`

### Category Display (Line 18247)
- Health category: shows medication tracker, hides XP bar
- All other categories: shows XP bar, hides medication tracker

## Render Hierarchy

### Focus View
```
renderFocusMode()                          // 18949
  updateCommandCenterGreeting()            // 19551
  updateOverallProgress()                  // 19604
  renderTriageMode()                       // 19687
    updateTriageGreeting()                 // 19698
    renderTriageColumn('lockedIn')
    renderTriageColumn('today')
    renderTriageColumn('tomorrow')
    renderScheduledSection()
    renderRolledOverSection()
    updateAllTriageProgress()
    initTriageDragDrop()
  OR renderCrashOutMode()                  // 20703
    renderCrashOutTimeline()
    startCrashOutTimelineInterval()
  OR renderFocusPomodoroMode()             // 21686
    renderActiveSession()
```

### Full View
```
renderTasks()                              // 18338
  Filter by currentCategory or doToday
  Sort by sortOrder
  Update all category count badges
  Render task items (2-row DOM structure for mobile)
  updateCategoryXPDisplay()                // 18308
updateStats()                              // 18894
  Update level badge, XP bar, streak
```

### Modal Renders
```
openFinancials() -> renderFinancialCockpit()    // 14742
openCalendar() -> renderMasterCalendar()        // 15948
openNotebook() -> renderNotebook()
openDailyPlanner() -> renderDailyPlanner()
openTaskEditModal()                              // 22355
```

## Event Flow: Task Creation

### From Full View (addTask, Line 18265)
```
User types in #taskInput -> addTask()
  -> Determine category (currentCategory or 'health' if dotoday)
  -> Generate ID: generateId('task')
  -> Create task object { id, text, category, completed:false, doToday, createdAt, size:'medium', highLeverage:false, sortOrder }
  -> tasks[id] = task
  -> renderTasks() + renderFocusMode() + saveData()
```

### From Quick Add FAB (submitQuickAdd, Line 22572)
```
User taps FAB -> openQuickAddPanel()
  -> Fill in text, category pills, size, doToday toggle, highLeverage toggle
  -> submitQuickAdd()
    -> Create task { id, text, category, completed:false, doToday, createdAt, size, highLeverage, sortOrder }
    -> tasks[id] = task
    -> renderTasks() + renderFocusMode() + updateStats() + saveData()
```

### From Triage Quick Add (triageQuickAddTask, Line 20176)
```
User types in #triageQuickAdd -> triageQuickAddTask()
  -> Create task { id, text, category:'health', completed:false, doToday:true, triageTier:'today', triageOrder, createdAt, size:'medium', highLeverage:false }
  -> tasks[id] = task
  -> renderFocusMode() + renderTasks() + saveData()
```

### From Focus Quick Add (quickAddFromFocus, Line 19343)
```
quickAddFromFocus()
  -> Create task { id, text, category, completed:false, doToday:true, createdAt, size, highLeverage:false }
  -> tasks[id] = task
  -> Add to focusModeData.todaysTasks[size]
  -> renderFocusMode() + saveData()
```

## Event Flow: Task to Focus

```
Triage: setTaskTier(taskId, 'lockedIn')    // 20032
  -> task.triageTier = 'lockedIn'

Crash Out: sendToCrashOut(taskId)          // 20057
  -> task.crashOutScheduled = true
  -> task.crashOutTime = calculated time string
  -> task.crashOutDuration = based on size (big:60, small:15, medium:30)
  -> task.crashOutOrder = next sequential
  -> task.doToday = true

Focus Session: startTaskInFocus(taskId)    // 21704
  -> commandCenterData.currentSession.taskId = taskId
  -> commandCenterData.currentSession.checklist = {}
  -> switchCommandCenterMode('focus')
  -> renderFocusPomodoroMode()
```

## Daily Reset / Rollover Logic

### checkCriticalEODReset() (Line 16541)
Runs on app load. Triggers once per day at 5 AM or later:
1. Resets `mustComplete` flag on all tasks
2. Clears `focusModeData`: oneThingId, microSteps, todaysTasks, focusTimerSeconds
3. Stores reset date in both `lastCriticalEODReset` (Firebase-synced) and localStorage

### checkAndProcessRollovers() (Line 22226)
Runs on Focus Mode init. Triggers once per day:
1. Finds tasks with `triageTier === 'lockedIn'` that are incomplete and have a `triageDate` before today
2. Marks them as rolled over: `rolledOver: { fromDate, wasTier: 'lockedIn' }`, moves to `triageTier: 'today'`
3. Updates current locked-in tasks with today's `triageDate`
4. Stores check date in localStorage `lastRolloverCheck`

## Data Integrity Utilities (Lines 12455-12500)

```javascript
generateId(prefix)       // 12462 - Creates unique IDs: `${prefix}_${Date.now()}_${random}`
getDeviceId()            // 12469 - Per-device ID for conflict detection
ensureArray(val)         // 12479 - Firebase converts arrays to objects; this converts back
getValues(obj)           // 12489 - Safe iteration: handles arrays, objects, null
getCount(obj)            // 12496 - Safe length: handles arrays, objects, null
migrateArrayToObject()   // ~12670 - Converts legacy arrays to keyed objects
```

## BackupManager (Lines 12701-12748)

```javascript
const BackupManager = {
    maxBackups: 5,
    createBackup()             // Saves current localStorage to backup array
    listBackups()              // Returns array of { timestamp, date }
    restoreBackup(timestamp)   // Restores from backup, reloads page
};
// Auto-backup every 5 minutes (line 12748)
```

## Initialization Sequence

```
Page load
  -> initializeFirebase()                    // 13854
    -> Check Firebase SDK loaded
    -> firebase.initializeApp(firebaseConfig)
    -> PIN validation (localStorage or prompt)
    -> pinValidated = true
    -> loadDataFromFirebase()                // 13928
      -> database.ref(...).once('value')
      -> Merge cloud data into global vars
      -> hasLoadedFromCloud = true
      -> loadData() (localStorage merge)     // 12750
        -> Parse localStorage
        -> Merge with current state
        -> updateMedicationDisplay()
        -> checkAndApplyDailyPillReduce()
        -> checkCriticalEODReset()
        -> initFocusMode()                   // 22429
          -> checkAndProcessRollovers()
          -> startTimePromptChecker()
          -> checkFocusViewWelcome()
      -> markInitialLoadComplete()           // 12005
        -> initialLoadComplete = true
        -> Hide loading overlay
      -> Set up realtime listener (.on('value'))
      -> updateCategoryDisplay()
```
