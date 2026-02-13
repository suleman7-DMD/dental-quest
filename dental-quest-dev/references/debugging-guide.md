# Debugging Guide -- index.html (Dental Quest)

Practical guide for diagnosing and fixing issues in the Dental Quest main app.

## Table of Contents
- [1. Key State Variables](#1-key-state-variables)
- [2. Console Debugging Commands](#2-console-debugging-commands)
- [3. Common Issues and Diagnosis](#3-common-issues-and-diagnosis)
- [4. Render Function Quick Reference](#4-render-function-quick-reference)
- [5. Data Flow: From User Action to Firebase](#5-data-flow-from-user-action-to-firebase)
- [6. LocalStorage Keys](#6-localstorage-keys)
- [7. Firebase Data Path](#7-firebase-data-path)
- [8. Midnight Reset Behavior](#8-midnight-reset-behavior)
- [9. Common Anti-Patterns to Avoid](#9-common-anti-patterns-to-avoid)

---

## 1. Key State Variables

These are the primary in-memory variables. All are declared at the top of the main `<script>` block.

| Variable | Line | Type | Description |
|----------|------|------|-------------|
| `tasks` | 12038 | `{}` (object) | All tasks keyed by ID. NOT an array. |
| `stats` | 12084 | `{}` | XP totals, task counts, per-category XP |
| `calendarNotes` | 12117 | `{}` | Notes keyed by `'YYYY-MM-DD'` |
| `calendarEvents` | 12122 | `{}` | Countdown events keyed by ID |
| `notebook` | 12125 | `{}` | `{ pages: {}, currentPageId }` |
| `financials` | 12131 | `{}` | Master liquidity, bills, expenses, projections |
| `commandCenterData` | 12060 | `{}` | Crash-out config, focus stats, current session |
| `focusModeData` | *(nearby)* | `{}` | One Thing, micro-steps, today's tasks |
| `currentView` | 12047 | `string` | `'focus'` or `'full'` |
| `commandCenterMode` | 19519 | `string` | `'triage'`, `'crashout'`, or `'focus'` |
| `currentFocusTaskId` | 21684 | `string\|null` | ID of task in active focus session |

### Sync Protection Flags

| Variable | Line | Default | Purpose |
|----------|------|---------|---------|
| `initialLoadComplete` | 11970 | `false` | Blocks saves until Firebase load finishes |
| `hasLoadedFromCloud` | 11971 | `false` | Blocks saves until cloud data is checked |
| `pinValidated` | 11972 | `false` | Blocks saves until PIN is validated |

---

## 2. Console Debugging Commands

### Built-in Debug Functions

**`debugSyncStatus()`** (line 17455) -- Call from browser console:
```javascript
debugSyncStatus()
```
Returns:
```javascript
{
  firebaseInitialized: true,
  currentUser: "uid_string",
  hasDatabase: true,
  initialLoadComplete: true,
  pinSet: true,
  userPath: "users/user_abc123/appData",
  lastKnownSaveTime: 1707856200000,
  mainDataSyncEnabled: true,
  hasRealtimeListener: true,
  tasksCount: 15
}
```

**`resetSyncPin()`** (line 17476) -- Reset PIN if mismatched across devices:
```javascript
resetSyncPin()
```

### Manual State Inspection

Check task data:
```javascript
// Count tasks
Object.keys(tasks).length

// Inspect a specific task
tasks['task_1707856200000_abc123']

// Find all doToday tasks
Object.values(tasks).filter(t => t.doToday && !t.completed)

// Find all scheduled (crash-out) tasks
Object.values(tasks).filter(t => t.triageTier === 'scheduled' && !t.completed)

// Check crash-out config
commandCenterData.crashOut
```

Check sync state:
```javascript
// All sync flags at once
console.log({
    initialLoadComplete,
    hasLoadedFromCloud,
    pinValidated,
    firebaseInitialized,
    currentUser: currentUser?.uid,
    hasDatabase: !!database
})
```

Check financials:
```javascript
financials.masterLiquidity
financials.monthlyPayments
```

Check notebook:
```javascript
Object.keys(notebook.pages).length
notebook.currentPageId
```

---

## 3. Common Issues and Diagnosis

### "Save not working" / Data not persisting

**Step 1**: Check sync guards.
```javascript
debugSyncStatus()
```
If `initialLoadComplete` is `false`, the app never finished loading. Check:
- Is Firebase reachable? (network tab)
- Did PIN validation succeed? (`pinValidated`)
- Is the loading overlay still visible? (10-second failsafe at line 12020)

**Step 2**: Check for empty state blocking.
```javascript
isEmptyState({ tasks, stats, calendarNotes, calendarEvents, notebook, financials, commandCenterData, focusModeData })
```
If this returns `true`, Guard C is blocking saves. The app has no user content.

**Step 3**: Force save manually.
```javascript
saveData()        // Normal (debounced 200ms)
saveDataImmediate()  // Bypass debounce
```

**Step 4**: Nuclear options.
```javascript
forceUploadToCloud()   // Push local to cloud (with confirm dialog)
forcePullFromCloud()   // Pull cloud to local (with confirm dialog)
```

---

### Tasks not appearing in triage / crash-out

**Check the task's flags**:
```javascript
const task = tasks['TASK_ID'];
console.log({
    doToday: task.doToday,
    completed: task.completed,
    triageTier: task.triageTier,
    crashOutOrder: task.crashOutOrder,
    crashOutTime: task.crashOutTime
})
```

- **Not in triage at all**: `doToday` must be `true`.
- **Not in expected column**: Check `triageTier` value (`'lockedIn'`, `'ifTime'`, or `'scheduled'`).
- **Not in crash-out timeline**: Must have `triageTier === 'scheduled'` AND a valid `crashOutOrder` number.
- **Completed but still showing**: `completed` should be `true`. Check if render is filtering correctly.

**Force re-render**:
```javascript
renderTriageMode()      // Rebuilds triage columns
renderCrashOutMode()    // Rebuilds crash-out timeline
```

---

### Time prompts not appearing / appearing too often

**Check prompt state**:
```javascript
console.log({
    lastPromptedTaskId,
    dismissedUntil,
    commandCenterMode,
    currentFocusTaskId,
    hasSleepTime: !!commandCenterData?.crashOut?.sleepTime
})
```

- **No sleep time set**: Prompts require `commandCenterData.crashOut.sleepTime` to exist.
- **In focus session**: Prompts are suppressed when `currentFocusTaskId` is set (line 20440-20443).
- **Dismissed cooldown**: `dismissedUntil[taskId]` has a 3-minute cooldown. Check timestamps.
- **Already prompted**: `lastPromptedTaskId` prevents duplicate prompts for the same task.

**Force check**:
```javascript
checkForTimePrompts()
```

---

### Crash-out timeline looks wrong (times off, tasks missing)

**Step 1**: Check sleep time is set and valid.
```javascript
commandCenterData.crashOut
// Should have: { sleepTime: "ISO string", windDownMinutes: 30 }
```

**Step 2**: Check scheduled tasks have valid order.
```javascript
Object.values(tasks)
    .filter(t => t.triageTier === 'scheduled' && !t.completed)
    .sort((a,b) => (a.crashOutOrder||0) - (b.crashOutOrder||0))
    .map(t => ({ id: t.id, text: t.text, order: t.crashOutOrder, time: t.crashOutTime, duration: t.duration }))
```

**Step 3**: Force recalculate and re-render.
```javascript
recalculateScheduledTimes()
renderCrashOutTimeline()
```

---

### Financial projection seems wrong

```javascript
calculateFinancialStatus()
// Then check:
financials.masterLiquidity
// Look at monthlyPayments to see which months are marked paid
Object.entries(financials.monthlyPayments).map(([k,v]) => ({ month: k, paid: v.paid }))
```

The projection formula: `projectedBalance = currentCash - unpaidMonthsExpenseTotal`. Only months where `paid === false` are subtracted.

---

### XP / Level display wrong

```javascript
console.log(stats)
// Check: totalXPGained, totalTasks, categoryXPGained
updateStats()  // Force recalculate
```

---

## 4. Render Function Quick Reference

When the UI is stale, call the appropriate render function:

| What's stale | Call |
|-------------|------|
| Task list (full view) | `renderTasks()` |
| Triage columns | `renderTriageMode()` |
| Crash-out timeline | `renderCrashOutMode()` |
| Focus view dashboard | `renderFocusMode()` |
| Focus pomodoro session | `renderFocusPomodoroMode()` |
| Financial cockpit | `renderFinancialCockpit()` |
| Calendar | `renderMasterCalendar()` |
| Notebook | `renderNotebookContent()` |
| Medication cards | `updateMedicationDisplay()` |
| Daily planner | `renderPlannerTimeline()` |
| Stats / XP | `updateStats()` |
| Streak badge | `updateStreakBadge()` |
| Compact header | `updateCompactHeader()` |

---

## 5. Data Flow: From User Action to Firebase

```
User clicks button
    |
    v
Handler function modifies in-memory state (tasks, stats, etc.)
    |
    v
saveData() called
    |
    +--> Guard checks (5 guards must ALL pass)
    |
    +--> localStorage.setItem() -- IMMEDIATE, synchronous
    |
    +--> Firebase debounce timer starts (200ms)
         |
         +--> (if no more saves in 200ms)
              |
              v
              database.ref(...).set(data)
                  |
                  +--> Success: show "Synced" toast
                  +--> Failure: retry after 2s
                       |
                       +--> Retry failure: mark offlineSyncPending
```

---

## 6. LocalStorage Keys

| Key | Used By | Content |
|-----|---------|---------|
| `dentalStudentQuestData` | Main app state | Full JSON of all app data |
| `dentalQuestPin` | PIN auth | User's sync PIN |
| `dentalAppPin` | PIN auth (legacy) | Same PIN, legacy key |
| `deviceId` | Conflict detection | Unique device identifier |
| `dentalQuestCheckpoints` | Checkpoint system | Array of state snapshots |
| `dentalQuestOfflineSyncPending` | Offline sync | Flag for pending sync |

---

## 7. Firebase Data Path

```
users/user_{btoa(pin)}/appData/
    tasks/
    stats/
    medications/
    calendarNotes/
    calendarEvents/
    notebook/
    financials/
    pillAssignments/
    dailyPlanner/
    focusModeData/
    commandCenterData/
    lastSaved
    lastCriticalEODReset
```

The `currentUser.uid` in code maps to the hashed PIN path. The actual Firebase auth is anonymous, but the data path is determined by the PIN.

---

## 8. Midnight Reset Behavior

Two reset mechanisms run daily:

1. **`checkPlannerReset()`** (line 16499): Resets daily planner blocks at midnight. Checks `dailyPlanner.date` against today's date.

2. **`checkCriticalEODReset()`** (line 16541): End-of-day task processing. Tracked by `lastCriticalEODReset`. Handles:
   - Clearing crash-out sleep time for new day
   - Processing task rollovers

3. **`checkAndProcessRollovers()`** (line 22226): Moves incomplete doToday tasks to next day, preserving tier assignments.

---

## 9. Common Anti-Patterns to Avoid

### DO NOT: Use UTC date parsing
```javascript
// WRONG - off by one day in EST timezone
const date = new Date('2026-02-02');

// CORRECT - local timezone
const [y, m, d] = '2026-02-02'.split('-').map(Number);
const date = new Date(y, m - 1, d);
```

### DO NOT: Treat empty arrays as falsy
```javascript
// WRONG - [] is truthy
const foods = loadedFoods || defaults;

// CORRECT
const foods = loadedFoods?.length > 0 ? loadedFoods : defaults;
```

### DO NOT: Iterate tasks as an array
```javascript
// WRONG - tasks is an object, not an array
tasks.forEach(...)

// CORRECT
Object.values(tasks).forEach(...)
getValues(tasks).forEach(...)
```

### DO NOT: Save without sync guards
```javascript
// WRONG - bypasses protection
database.ref(path).set(data);

// CORRECT - use the guarded function
saveData();
```

### DO NOT: Generate HTML with unescaped user input
```javascript
// WRONG - XSS vulnerability
innerHTML = `<div>${task.text}</div>`;

// CORRECT
innerHTML = `<div>${escapeHtml(task.text)}</div>`;
```

### DO NOT: Modify sync guard logic
The five guards in `saveData()` (lines 12908-12970) prevent data wipe on fresh devices. Never weaken, remove, or reorder them.
