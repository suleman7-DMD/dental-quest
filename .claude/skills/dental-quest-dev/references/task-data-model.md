# Task Data Model

## Table of Contents
- [Storage](#storage)
- [Task Object Schema](#task-object-schema)
- [Categories](#categories)
- [Task Creation Functions](#task-creation-functions)
- [Task Modification Functions](#task-modification-functions)
- [Triage Tier Values](#triage-tier-values)
- [Crash Out Duration Presets](#crash-out-duration-presets)
- [Task Filtering Patterns](#task-filtering-patterns)
- [Task State Transitions](#task-state-transitions)
- [XP Values](#xp-values)
- [Size System](#size-system)
- [Reordering](#reordering)

## Storage

Tasks are stored as a global object keyed by ID (not an array):

```javascript
let tasks = {};  // Line 12038
// Example: tasks['task_1707000000_abc123'] = { id: 'task_1707000000_abc123', text: '...', ... }
```

Firebase-safe: no sparse array issues, no index shifting.

## Task Object Schema

### Creation Fields (set when task is created)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | `generateId('task')` | Unique ID: `task_{timestamp}_{random}` |
| `text` | string | (required) | Task description |
| `category` | string | varies | One of 7 categories (see below) |
| `completed` | boolean | `false` | Whether task is done |
| `doToday` | boolean | `false` or `true` | Whether task appears in Focus View triage |
| `createdAt` | string | `new Date().toISOString()` | ISO timestamp |
| `size` | string | `'medium'` | `'small'` \| `'medium'` \| `'big'` |
| `highLeverage` | boolean | `false` | 20% effort -> 80% impact flag |
| `sortOrder` | number | `getCount(tasks)` | Position in Full View category list |

### Triage Fields (set by triage interactions)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `triageTier` | string\|null | `null` | `'lockedIn'` \| `'today'` \| `'tomorrow'` \| `null` |
| `triageOrder` | number | varies | Sort position within a tier |
| `triageDate` | string | (set on lock-in) | `'YYYY-MM-DD'` when task was locked in (used for rollover detection) |

### Crash Out Fields (set by sendToCrashOut)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `crashOutScheduled` | boolean | `false` | Whether task is on the crash out timeline |
| `crashOutTime` | string | calculated | Display time string, e.g. `'3:45 PM'` |
| `crashOutDuration` | number | based on size | Minutes: `15`\|`30`\|`45`\|`60`\|`90`\|`120` |
| `crashOutOrder` | number | sequential | Position in crash out timeline |

### Completion Fields (set on complete)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `completedAt` | number\|null | `null` | `Date.now()` timestamp when completed |
| `xp` | number | `20` (Full View) or tier-based | XP awarded for completion |

### Rollover Fields (set by checkAndProcessRollovers)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `rolledOver` | object\|undefined | `undefined` | `{ fromDate: 'YYYY-MM-DD', wasTier: 'lockedIn' }` |

### Other Dynamic Fields

| Field | Type | Description |
|-------|------|-------------|
| `mustComplete` | boolean | EOD flag, reset daily at 5 AM by `checkCriticalEODReset()` |

## Categories

7 real categories:

```javascript
const categories = ['financial', 'clinic', 'health', 'school', 'academic', 'future', 'life'];
// Line 18355
```

Plus 1 virtual view:
- `'dotoday'` - not a real category; filters all tasks where `doToday === true`

When adding from the "dotoday" view, tasks default to `category: 'health'` (line 18275).

Category display names (line 18309):

| Key | Display | Icon |
|-----|---------|------|
| `financial` | Financial Progress | `💰` |
| `clinic` | Clinic Requirements Progress | `🦷` |
| `health` | Health & Wellbeing Progress | `❤️` |
| `school` | School Maintenance Progress | `📋` |
| `academic` | Academic & Didactic Progress | `📚` |
| `future` | Future Job & Life Progress | `🚀` |
| `life` | General Life Maintenance Progress | `🏡` |

## Task Creation Functions

### addTask() - Line 18265
Full View task input. Creates task with current category.

```javascript
function addTask() {
    // Input: #taskInput
    // Category: currentCategory (or 'health' if dotoday view)
    // doToday: true only if adding from dotoday view
    // Fields: id, text, category, completed:false, doToday, createdAt, size:'medium', highLeverage:false, sortOrder
}
```

### submitQuickAdd() - Line 22572
Quick Add FAB panel (second script block).

```javascript
function submitQuickAdd() {
    // Input: #qaTaskInput
    // Category: qaSelectedCategory (pill buttons, defaults to last used from localStorage)
    // Size: qaSelectedSize (S/M/L buttons)
    // doToday: qaDoToday (toggle)
    // highLeverage: qaHighLeverage (toggle)
    // Fields: id, text, category, completed:false, doToday, createdAt, size, highLeverage, sortOrder
}
```

### triageQuickAddTask() - Line 20176
Inline quick add in triage mode.

```javascript
function triageQuickAddTask() {
    // Input: #triageQuickAdd
    // Always: category='health', doToday=true, triageTier='today'
    // Fields: id, text, category:'health', completed:false, doToday:true, triageTier:'today', triageOrder, createdAt, size:'medium', highLeverage:false
}
```

### quickAddFromFocus() - Line 19343
Focus mode quick add with size and category selectors.

```javascript
function quickAddFromFocus() {
    // Input: #focusQuickAdd
    // Category: #focusQuickAddCategory dropdown
    // Size: #focusQuickAddSize dropdown
    // Always: doToday=true
    // Fields: id, text, category, completed:false, doToday:true, createdAt, size, highLeverage:false
    // Also adds to focusModeData.todaysTasks[size][id] = true
}
```

## Task Modification Functions

### toggleTask(id) - Line 18524
Full View toggle. Awards or removes XP.

```javascript
function toggleTask(id) {
    task.completed = !task.completed;
    if (completed) {
        xp = task.xp || 20;
        task.xp = xp;  // Store if not already set
        stats.totalXPGained += xp;
        stats.categoryXPGained[category] += xp;
        stats.totalTasks++;
        task.completedAt = Date.now();
        task.doToday = false;  // Remove from Do Today on complete
    } else {
        // Reverse: subtract XP, clear completedAt (but keep task.xp)
    }
}
```

### completeTriageTask(taskId) - Line 19975
Focus View toggle. Awards tier-based XP via `awardCommandCenterXP()`.

```javascript
function completeTriageTask(taskId) {
    // Toggle completed state using spread operator
    tasks[taskId] = { ...task, completed: !wasCompleted, completedAt, doToday: task.doToday };
    if (nowCompleted) {
        // XP based on tier:
        //   lockedIn: 50 XP
        //   crashOutScheduled: 75 XP
        //   rolledOver: 40 XP
        //   other: 25 XP
        awardCommandCenterXP(xp, reason);
        // Check if all locked-in done -> bonus 100 XP + big celebration
        checkForPerfectDay();
        updateStreaks();
    }
}
```

### toggleDoToday(id) - Line 18581
Simple toggle of `doToday` flag.

### deleteTask(id) - Line 18595
Deletes task: `delete tasks[id]`.

### setTaskTier(taskId, tier) - Line 20032
Sets triage tier and removes from crash out if moving away from scheduled.

```javascript
function setTaskTier(taskId, tier) {
    tasks[taskId] = { ...task, triageTier: tier, triageOrder: getTasksByTier(tier).length + 1 };
    if (tier !== 'scheduled' && task.crashOutScheduled) {
        tasks[taskId].crashOutScheduled = false;
        delete tasks[taskId].crashOutTime;
        delete tasks[taskId].crashOutDuration;
    }
}
```

### sendToCrashOut(taskId) - Line 20057
Schedules task on crash out timeline.

```javascript
function sendToCrashOut(taskId) {
    // Requires commandCenterData.crashOut.sleepTime to be set
    // Calculates next available time slot after existing scheduled tasks
    const duration = task.size === 'big' ? 60 : task.size === 'small' ? 15 : 30;
    tasks[taskId] = {
        ...task,
        crashOutScheduled: true,
        crashOutTime: timeStr,        // e.g. '3:45 PM'
        crashOutDuration: duration,   // minutes
        crashOutOrder: newOrder,      // sequential integer
        doToday: true                 // ensures it counts in dashboard progress
    };
}
```

### openTaskEditModal(taskId) / saveTaskEdit() - Lines 22355, 22410
Modal for editing text, size, and highLeverage flag.

```javascript
function saveTaskEdit() {
    task.text = editedText;
    task.size = editingTaskSize;
    task.highLeverage = editingTaskLeverage;
}
```

## Triage Tier Values

Real tiers stored in `task.triageTier`:
- `null` - no tier assigned (default)
- `'lockedIn'` - highest priority, must do today
- `'today'` - should do today
- `'tomorrow'` - pushed to tomorrow

Virtual tiers (computed, not stored in triageTier):
- `'scheduled'` - determined by `task.crashOutScheduled === true` (any triageTier)
- `'rolledOver'` - determined by `task.rolledOver && task.rolledOver.fromDate`

## Crash Out Duration Presets

Duration dropdown options (lines 21097-21102):
- 15 minutes (15m)
- 30 minutes (30m)
- 45 minutes (45m)
- 60 minutes (60m)
- 90 minutes (90m)
- 120 minutes (2h)

Default duration by size (line 20083):
- `'big'` -> 60 minutes
- `'medium'` -> 30 minutes
- `'small'` -> 15 minutes

## Task Filtering Patterns

### getTasksByTier(tier) - Line 19667

```javascript
function getTasksByTier(tier) {
    const filtered = getTodayTriageTasks().filter(t => {
        if (tier === 'lockedIn') return t.triageTier === 'lockedIn' && !t.crashOutScheduled;
        if (tier === 'today')    return (t.triageTier === 'today' || !t.triageTier) && !t.crashOutScheduled && t.triageTier !== 'lockedIn' && t.triageTier !== 'tomorrow';
        if (tier === 'scheduled') return t.crashOutScheduled === true;
        if (tier === 'tomorrow') return t.triageTier === 'tomorrow' && !t.crashOutScheduled;
        if (tier === 'rolledOver') return t.rolledOver && t.rolledOver.fromDate;
    });
    // 'scheduled' sorted by crashOutOrder; others by triageOrder
}
```

### getTodayTriageTasks() - Line 19662
```javascript
function getTodayTriageTasks() {
    return getValues(tasks).filter(t => t.doToday);
}
```

### renderTasks() filtering - Line 18338
```javascript
if (currentCategory === 'dotoday') {
    filteredTasks = getValues(tasks).filter(t => t.doToday && !t.completed);
} else {
    filteredTasks = getValues(tasks).filter(t => t.category === currentCategory && !t.completed);
}
filteredTasks.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
```

## Task State Transitions

```
                 ┌──────────────────────────────────────────┐
                 │              CREATED                      │
                 │  (addTask / submitQuickAdd / etc.)        │
                 │  doToday: false|true, triageTier: null    │
                 └────────────┬─────────────────────────────┘
                              │
              toggleDoToday() │ (sets doToday: true)
                              │
                 ┌────────────▼─────────────────────────────┐
                 │           IN TRIAGE                       │
                 │  doToday: true                            │
                 └──┬─────────┬──────────┬─────────────────┘
                    │         │          │
     setTaskTier()  │         │          │  setTaskTier()
     'lockedIn'     │         │          │  'tomorrow'
                    │         │          │
         ┌──────────▼┐  ┌────▼─────┐  ┌▼───────────┐
         │ LOCKED IN  │  │  TODAY   │  │  TOMORROW   │
         │ tier=      │  │ tier=    │  │  tier=      │
         │ 'lockedIn' │  │ 'today'  │  │  'tomorrow' │
         └─────┬──────┘  └────┬─────┘  └─────────────┘
               │              │
               │  sendToCrashOut()
               │              │
               │    ┌─────────▼──────────┐
               │    │    SCHEDULED        │
               │    │  crashOutScheduled  │
               │    │  = true             │
               │    │  crashOutTime,      │
               │    │  crashOutDuration,  │
               │    │  crashOutOrder      │
               │    └─────────┬──────────┘
               │              │
               │   startTaskInFocus()
               │              │
               ├──────────────┤
               │              │
         ┌─────▼──────────────▼──────────┐
         │        IN FOCUS SESSION        │
         │  commandCenterData             │
         │  .currentSession.taskId = id   │
         └─────────────┬─────────────────┘
                       │
         completeTriageTask() or toggleTask()
                       │
         ┌─────────────▼─────────────────┐
         │          COMPLETED             │
         │  completed: true               │
         │  completedAt: Date.now()       │
         │  xp: tier-based amount         │
         └───────────────────────────────┘
```

### Rollover Path (checkAndProcessRollovers, Line 22226)

```
LOCKED IN (yesterday) + not completed
  -> rolledOver: { fromDate: 'YYYY-MM-DD', wasTier: 'lockedIn' }
  -> triageTier: 'today'  (moved out of locked in)
  -> Appears in "Rolled Over" section
```

## XP Values

### Full View (toggleTask)
- Default: 20 XP per task
- Uses `task.xp || 20`

### Focus View (completeTriageTask)
- `lockedIn`: 50 XP
- `crashOutScheduled`: 75 XP
- `rolledOver`: 40 XP
- Other (today/tomorrow): 25 XP
- All locked-in cleared bonus: 100 XP
- Perfect day (all tasks done, >= 3 tasks): 200 XP

## Size System

Three sizes affect crash out duration defaults and visual display:

| Size | Label | Default Duration |
|------|-------|-----------------|
| `'small'` | S | 15 min |
| `'medium'` | M | 30 min |
| `'big'` | L | 60 min |

Set during task creation or via task edit modal (`saveTaskEdit`, line 22410).

## Reordering

### Full View (sortOrder)
- Drag-and-drop: updates `sortOrder` on filtered tasks (line 18500-18512)
- Insert logic: `draggedIndex < targetIndex ? targetIndex - 1 : targetIndex`

### Triage (triageOrder)
- Drag-and-drop between tier columns via `setTaskTier()`
- Within-tier reorder via triage drag handlers

### Crash Out Timeline (crashOutOrder)
- Drag-and-drop: `reorderTimelineTasks()` with INSERT logic
- Buttons: `moveTaskUp/Down` use `swapAdjacentTasks()` (SWAP logic)
- `moveTaskToTop()`, `moveTaskToBottom()`, `promptTaskPosition()`
- After reorder: `recalculateScheduledTimes()` recalculates all `crashOutTime` values
- `isReorderingLocked` flag with 200ms cooldown prevents rapid double-moves
