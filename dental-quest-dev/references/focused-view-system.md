# Focused View System

## Table of Contents
- [Overview](#overview)
- [Tab Navigation](#tab-navigation)
- [Triage Tab](#triage-tab)
- [Crash Out Tab](#crash-out-tab)
- [Focus (Pomodoro) Tab](#focus-pomodoro-tab)
- [Key Patterns](#key-patterns)
- [Function Index](#function-index)

> Reference for the Command Center in `index.html` -- the three-tab Focus View that replaces the old single-purpose Focus Mode.

## Overview

The Focused View is activated by `switchToFocusMode()` (line 18926). It sets `currentView = 'focus'`, shows `#focusModeContainer`, hides `#fullViewContainer`, and calls `renderFocusMode()`.

`renderFocusMode()` (line 18949) is the top-level dispatcher. It always updates the greeting and overall progress, then delegates to one of three renderers based on `commandCenterMode`:

| Mode value   | Renderer                    | Line  |
|--------------|-----------------------------|-------|
| `'triage'`   | `renderTriageMode()`        | 19687 |
| `'crashout'` | `renderCrashOutMode()`      | 20703 |
| `'focus'`    | `renderFocusPomodoroMode()` | 21686 |

Returning to Full View calls `switchToFullView()` (line 18937), which flips containers and re-renders the full task list.

---

## Tab Navigation

### State

```
let commandCenterMode = 'triage';          // line 19519
```

Ephemeral -- not persisted to Firebase. Defaults to `'triage'` on every page load.

### getCurrentCommandCenterMode() -- line 19551

Returns `commandCenterMode || 'triage'`.

### switchCommandCenterMode(mode) -- line 19555

1. Sets `commandCenterMode = mode`.
2. Removes `.active` from all `.cc-mode-tab` elements, resets to transparent/muted style.
3. Finds the active tab element by ID (`triageModeTab`, `crashOutModeTab`, or `focusPomodoroTab`) and applies active styling.
4. Shows/hides the three content divs (`triageModeContent`, `crashOutModeContent`, `focusPomodoroContent`) at line 19576-19578.
5. Calls `renderFocusMode()` to re-render everything.

---

## Triage Tab

### Purpose

Triage is the day-planning view. Tasks flagged `doToday: true` appear here, organized into tier columns. Users drag tasks between tiers to prioritize, then send them to Crash Out for scheduling or start them directly in Focus.

### Core Data Filter

```javascript
// line 19662
function getTodayTriageTasks() {
    return getValues(tasks).filter(t => t.doToday);
}
```

Only tasks with `doToday === true` appear in Focus View at all.

### Tier System

`getTasksByTier(tier)` (line 19667) filters `getTodayTriageTasks()` by tier. There are 3 real tiers stored on tasks plus 2 virtual tiers:

| Tier         | Filter logic                                                    | Sort key        |
|--------------|-----------------------------------------------------------------|-----------------|
| `lockedIn`   | `triageTier === 'lockedIn' && !crashOutScheduled`               | `triageOrder`   |
| `today`      | `(triageTier === 'today' \|\| !triageTier) && !crashOutScheduled && triageTier !== 'lockedIn' && triageTier !== 'tomorrow'` | `triageOrder`   |
| `tomorrow`   | `triageTier === 'tomorrow' && !crashOutScheduled`               | `triageOrder`   |
| `scheduled`  | `crashOutScheduled === true` (virtual -- any tier)              | `crashOutOrder` |
| `rolledOver` | `rolledOver && rolledOver.fromDate` (virtual -- leftover from previous day) | `triageOrder` |

Tasks default to `today` tier when `triageTier` is falsy.

### renderTriageMode() -- line 19687

1. `updateTriageGreeting()` (line 19698) -- time-based greeting + date string.
2. `renderTriageColumn('lockedIn')` / `renderTriageColumn('today')` / `renderTriageColumn('tomorrow')` -- each renders incomplete tasks for that tier into `#${tier}Tasks`.
3. `renderScheduledSection()` (line 19774) -- shows the `#scheduledSection` if any tasks have `crashOutScheduled === true`. Hidden when empty.
4. `renderRolledOverSection()` (line 19803) -- shows tasks with `rolledOver.fromDate`, styled with amber left border.
5. `updateAllTriageProgress()` (line 19838) -- updates overall progress bar and per-column progress.
6. `initTriageDragDrop()` (line 19934) -- attaches dragover/dragleave/drop listeners to `.column-tasks` elements.

### renderTriageColumn(tier) -- line 19718

Renders into `#${tier}Tasks`. Filters to `!t.completed` tasks only. Empty state shows a helpful message via `getEmptyMessage(tier)` (line 19731). Each task rendered via `renderTaskCard()`.

### renderTaskCard(task, tier) -- line 19741

Renders a `.task-card` with:
- Drag handle (`draggable="true"`)
- Checkbox (calls `toggleTaskComplete`)
- Task text
- Category icon
- Action button: "-> Crash Out" for normal tiers, "<- Remove" for scheduled tier
- Scheduled time badge if applicable

### Column Progress -- updateColumnProgress(tier) -- line 19856

Per-tier: counts total/completed, computes percent, updates `#${tier}Count` (shows incomplete count), `#${tier}Progress` bar width, `#${tier}Percent` text.

### Task Completion -- toggleTaskComplete(taskId) -- line 19873

Toggles `task.completed`. On completion:
- Increments `stats.totalTasks`
- Awards XP by tier: lockedIn=50, crashOutScheduled=75, rolledOver=40, default=25
- Awards category XP
- Sets `task.completedAt = Date.now()`, `task.doToday = false`
- Calls `awardCommandCenterXP()`
- Checks if ALL lockedIn tasks done -> bonus 100 XP + big celebration
- Calls `checkForPerfectDay()`, `updateStreaks()`

On un-complete: reverses stats, clears `completedAt`.

Always calls: `updateStats()`, `renderFocusMode()`, `renderTasks()`, `saveData()`.

### completeTriageTask(taskId) -- line 19975

Alternative completion function (used from Crash Out and Focus tabs). Uses spread pattern for Firebase safety. Same XP logic as `toggleTaskComplete` but preserves `doToday` so completed tasks stay in the progress count. Does NOT set `doToday = false` (unlike `toggleTaskComplete`).

### setTaskTier(taskId, tier) -- line 20032

Sets `triageTier` and assigns `triageOrder` at end of target tier. If moving away from `scheduled`, clears crash out properties (`crashOutScheduled`, `crashOutTime`, `crashOutDuration`). Re-renders and saves.

### Triage Quick Add -- triageQuickAddTask() -- line 20176

Creates a new task with `doToday: true`, `triageTier: 'today'`, default category `'health'`, size `'medium'`.

### Triage Drag-Drop

Two separate drag-drop systems coexist:

**Within-tier reordering (task-on-task):**
- `handleTriageDragStart(event, taskId)` -- line 20207: sets `triageDraggedTaskId`
- `handleTriageDrop(event, targetTaskId, targetTier)` -- line 20227: if same tier, calls `reorderTriageTasks()`; if different tier, calls `setTaskTier()`
- `reorderTriageTasks(draggedId, targetId, tier)` -- line 20253: INSERT logic -- dragged item takes target's position, others shift
- `handleTriageDragEnd(event)` -- line 20246: cleanup

**Cross-column (section-level drop):**
- `handleSectionDragOver(event, tier)` -- line 20278
- `handleSectionDragLeave(event)` -- line 20286
- `handleSectionDrop(event, targetTier)` -- line 20291: if targetTier is `'scheduled'`, calls `sendToCrashOut()`; otherwise calls `setTaskTier()`

### Long Press for Task Details

- `startLongPress(event, taskId)` -- line 20316: 500ms timeout
- `showTaskDetailsModal(taskId)` -- line 20334: shows tier, category, scheduled time, rolled-over info, plus action buttons (Start Focus Session, Send to Crash Out, Edit, Remove from Today)
- `unflagFromToday(taskId)` -- line 20408: sets `doToday: false`, clears `triageTier` and crash out properties

---

## Crash Out Tab

### Purpose

Crash Out is a time-blocking scheduler. Users set a sleep time, then tasks are arranged on a vertical Google-Calendar-style timeline from now until sleep. The system tracks scheduling capacity, warns about overscheduling, and prompts when it is time to start each task.

### Sleep Time Setup

When `commandCenterData.crashOut.sleepTime` is null, the setup screen shows. Three options:

| Function                   | Line  | Behavior                                                |
|----------------------------|-------|---------------------------------------------------------|
| `setCrashOutSleep('tonight')` | 20735 | Sets 11:00 PM today (or tomorrow if past 11 PM)     |
| `setCrashOutSleep('latenight')` | 20745 | Sets 2:00 AM tomorrow                              |
| `setCustomSleepTime()`     | 20770 | Reads from `#customSleepTime` input, if past -> tomorrow |

All store `sleepTime` as ISO string, then call `recalculateScheduledTimes()` + `saveData()` + `renderCrashOutMode()`.

### Sleep Time Adjustment

| Function                   | Line  | Behavior                                                |
|----------------------------|-------|---------------------------------------------------------|
| `adjustSleepTime(minutesDelta)` | 20807 | +/- minutes. Prevents setting in past. Resets overscheduled warning. |
| `changeSleepTime()`        | 20801 | Resets to null (returns to setup screen)                |

`adjustSleepTime` is explicitly bound to `window` at line 20828.

### renderCrashOutMode() -- line 20703

If no sleep time: shows `#crashOutSetup`, hides `#crashOutTimeline`, stops intervals.
If sleep time set: hides setup, shows timeline, calls `renderCrashOutTimeline()` + `startCrashOutTimelineInterval()`.

### Timeline Intervals

- `startCrashOutTimelineInterval()` (line 20679): sets two intervals:
  - Full rebuild every 60 seconds (`renderCrashOutTimeline`)
  - Lightweight NOW position update every 15 seconds (`updateNowMarkerTime`)
- `stopCrashOutTimelineInterval()` (line 20692): clears both

### renderCrashOutTimeline() -- line 20830

Calculates:
1. Time until sleep, wind-down start (1 hour before sleep)
2. Updates time display elements
3. Computes scheduling status: total scheduled minutes vs. gap between last task end and wind-down start
4. Progress bar color: normal / `tight` (<30 min buffer) / `overscheduled` (last task ends after wind-down)
5. Overscheduled warning (dismissible via `commandCenterData.crashOut.warningDismissed`)
6. Calls `renderCrashOutTimelineTasks()` and `renderUnscheduledPool()`

### renderCrashOutTimelineTasks() -- line 20954

Renders a Google-Calendar-style vertical grid:

- **Grid setup**: `PX_PER_HOUR = 80`. Grid starts at current hour floor, ends at sleep time ceiling + 1 hour padding. Minimum 2 hours.
- **Hour lines**: full-hour labels + half-hour dotted lines
- **NOW marker**: red line + dot, positioned by `timeToPx(now)`. ID: `gcalNowMarker`.
- **Task blocks**: positioned absolutely by `timeToPx(parsedStartTime)`, height by `(duration/60) * PX_PER_HOUR` (min 36px). Classes: `.locked-in`, `.elapsed` (end < now), `.active-now` (start <= now < end).
- **Reorder buttons** on each task: Move to Top, Move Up, Move Down, Move to Bottom, Set Position (#)
- **Duration dropdown**: 15m/30m/45m/60m/90m/2h via `setDurationDirect()`
- **Wind-down block**: 1 hour before sleep, purple hatched
- **Sleep marker**: emoji + line at sleep time

Stores `gcalGridParams = { gridStartMs, pxPerHour }` for the lightweight NOW updater.

### updateNowMarkerTime() -- line 21133

Lightweight: repositions `#gcalNowMarker` using `gcalGridParams` without rebuilding the grid. Called every 15 seconds.

### Scheduling Functions

#### sendToCrashOut(taskId) -- line 20057

1. If no sleep time set: switches to Crash Out tab, shows toast, returns.
2. Resets `warningDismissed`.
3. Calculates time: if existing scheduled tasks, starts after last task ends; otherwise starts at now.
4. Duration from task size: `big`=60m, `small`=15m, default=30m.
5. Sets: `crashOutScheduled: true`, `crashOutTime`, `crashOutDuration`, `crashOutOrder` (max+1), `doToday: true`.
6. Re-renders and saves.

#### removeFromCrashOut(taskId) -- line 20137

Clears `crashOutScheduled`, deletes `crashOutTime`/`crashOutDuration`/`crashOutOrder`. Resets `warningDismissed`. Calls `recalculateScheduledTimes()` to shift remaining tasks up.

#### recalculateScheduledTimes() -- line 20117

Iterates scheduled incomplete tasks in order. Starting from `new Date()` (now), assigns each task's `crashOutTime` based on accumulated duration. This means all tasks cascade forward from the current time.

#### recalculateCrashOutTimes() -- line 21633

Similar to `recalculateScheduledTimes()` but called from the duration modal. Same cascade-from-now logic.

### Duration Handling

| Function                          | Line  | Behavior                                    |
|-----------------------------------|-------|---------------------------------------------|
| `setDurationDirect(taskId, val)`  | 21510 | Sets duration from timeline dropdown, cascades times |
| `openDurationModal(taskId)`       | 21560 | Opens modal with +/- buttons and quick-set options   |
| `adjustDuration(taskId, delta)`   | 21600 | +/- delta minutes (min 5m) from modal               |
| `setDuration(taskId, duration)`   | 21614 | Absolute set from modal quick buttons                |

All call `recalculateCrashOutTimes()` + `saveData()`.

Duration dropdown options on the timeline: 15m, 30m, 45m, 60m, 90m, 2h (line 21097-21102).

### Task Reordering

All reorder functions use the `isReorderingLocked` flag (line 21145) with a 200ms cooldown to prevent rapid double-moves.

| Function                              | Line  | Logic                              |
|---------------------------------------|-------|------------------------------------|
| `moveTaskToPosition(draggedId, targetId)` | 21203 | INSERT logic for non-adjacent tasks. For adjacent tasks, delegates to `swapAdjacentTasks`. Removes dragged from array, inserts at `targetIndex - 1` if dragging down, `targetIndex` if dragging up. |
| `swapAdjacentTasks(taskId1, taskId2)` | 21270 | SWAP logic -- exchanges `crashOutOrder` values between two tasks. Used by up/down buttons. |
| `moveTaskUp(taskId)`                  | 21327 | Finds task index, swaps with `index - 1` via `swapAdjacentTasks` |
| `moveTaskDown(taskId)`                | 21345 | Finds task index, swaps with `index + 1` via `swapAdjacentTasks` |
| `moveTaskToTop(taskId)`               | 21364 | Calls `moveTaskToPosition(taskId, firstTaskId)` |
| `moveTaskToBottom(taskId)`            | 21386 | Splices task out, pushes to end, reassigns all `crashOutOrder` values |
| `setTaskPosition(taskId, n)`          | 21423 | 1-indexed position set. Validates range, delegates to `moveTaskToPosition` |
| `promptTaskPosition(taskId)`          | 21444 | `prompt()` dialog for user to enter 1-N position |
| `reorderTimelineTasks(draggedId, targetId)` | 21265 | Legacy alias for `moveTaskToPosition` |

All reorder functions call `recalculateScheduledTimes()` + `renderCrashOutMode()` + `saveData()` after reordering.

Global bindings at lines 21462-21475 ensure all functions are accessible from inline `onclick` handlers.

### Timeline Drag-Drop

Separate from triage drag-drop. Uses `timelineDraggedTaskId` (line 21144).

| Handler                          | Line  |
|----------------------------------|-------|
| `handleTimelineDragStart(event, taskId)` | 21147 |
| `handleTimelineDragOver(event)`  | 21158 |
| `handleTimelineDragLeave(event)` | 21168 |
| `handleTimelineDrop(event, targetTaskId)` | 21176 |
| `handleTimelineDragEnd(event)`   | 21194 |

Drop calls `moveTaskToPosition(timelineDraggedTaskId, targetTaskId)`.

### Unscheduled Pool -- renderUnscheduledPool() -- line 21524

Shows tasks that are `doToday && !completed && !crashOutScheduled`. Each card shows task text, default duration (from size: big=60m, small=15m, default=30m), tier icon, and "Add to Timeline" button that calls `sendToCrashOut()`.

### parseCrashOutTime(timeStr) -- line 21485

Parses time strings like "3:30 PM" back to a `Date` object set to today. Uses regex `(\d{1,2}):(\d{2})\s*(AM|PM)` with case-insensitive match. The `\s*` handles non-breaking spaces from `toLocaleTimeString`. If parsed time is >12 hours in the past, assumes midnight crossover and adds 1 day.

### Reset -- resetCrashOutDay() -- line 21655

Confirms with user, then clears all crash out properties from all tasks and resets sleep time to null.

### Time Prompt System

Automatic nudges that fire when a scheduled task's start time arrives.

#### startTimePromptChecker() -- line 20432

Sets `timePromptInterval` to call `checkForTimePrompts()` every **15 seconds**.

#### checkForTimePrompts() -- line 20437

Guards:
- Skips if no sleep time set
- Skips if in focus mode with an active task (`commandCenterMode === 'focus' && currentFocusTaskId`)
- Skips if any task is actively being worked on (`currentFocusTaskId` or `confirmedStarted`)

Logic:
1. Cleans up expired dismiss cooldowns (older than 3 minutes)
2. Iterates scheduled incomplete tasks looking for one whose `crashOutTime` is within [-30s, +10min] of now
3. Skips tasks matching `lastPromptedTaskId` or within dismiss cooldown
4. Falls back to first past-due task if no current-time match

#### Dismiss Tracking

```javascript
let dismissedUntil = {};   // { taskId: timestamp } -- line 20430
```

`skipTask(taskId)` (line 20659) sets a 3-minute cooldown: `dismissedUntil[taskId] = Date.now() + 3 * 60 * 1000`. Task stays in schedule.

`removeTaskFromSchedule(taskId)` (line 20666) actually removes from crash out via `removeFromCrashOut()`.

#### showTimePrompt(task) -- line 20494

Creates a modal (`#timePromptModal`) with:
- Progress display (X/Y done today)
- Current time and task name
- "START NOW" button -> `startTaskFromPrompt(taskId)` (line 20533): closes prompt, calls `startTaskInFocus(taskId, true)` with auto-start timer
- Push buttons: +5m, +10m, +15m, +20m, +30m, +45m, +60m -> `pushAllTasks(minutes)`
- Dismiss button -> `skipTask(taskId)` (3-min cooldown)
- Remove button -> `removeTaskFromSchedule(taskId)`

#### pushAllTasks(minutes) -- line 20551

1. Closes prompt, resets `lastPromptedTaskId` and `dismissedUntil`
2. Saves undo state (all task IDs + current times)
3. Adds `minutes` to every scheduled task's `crashOutTime` via `parseCrashOutTime` + Date arithmetic
4. Shows cascade animation (staggered `cascade-shift` class)
5. Re-renders crash out mode (if active), saves
6. Shows undo toast with 10-second countdown
7. Schedules a re-check at `minutes * 60 * 1000 + 5000` ms to re-prompt at new time

#### undoPush() -- line 20636

Restores saved times from `undoState`, clears dismiss tracking, re-renders.

---

## Focus (Pomodoro) Tab

### Purpose

The Focus tab provides a distraction-free timer view for working on a single task. Features a circular countdown timer, session checklist, and completion celebrations.

### State

```javascript
let currentFocusTaskId = null;              // line 21684
let focusTimerInterval = null;              // line 19522
let focusTimerRunning = false;              // line 19523
let focusTimerSecondsRemaining = 25 * 60;  // line 19524
let focusTimerDuration = 25;               // line 19525 (minutes)
```

All ephemeral -- not persisted to Firebase. Session info (taskId, checklist, confirmedStarted) is stored in `commandCenterData.currentSession` which IS persisted.

### renderFocusPomodoroMode() -- line 21686

Reads `commandCenterData.currentSession.taskId`. If no task: shows `#focusNoTask` (pick-a-task prompt). If task exists: shows `#focusActiveSession` and calls `renderActiveSession()`.

### startTaskInFocus(taskId, autoStartTimer = false) -- line 21704

1. Sets up session in `commandCenterData.currentSession`: taskId, empty checklist, `confirmedStarted: true`, `startedAt` timestamp
2. Clears dismiss cooldown for this task
3. Sets `lastPromptedTaskId` to prevent re-prompting
4. Resets timer to `timerMinutes` (default 25) * 60 seconds
5. Switches to focus mode via `switchCommandCenterMode('focus')`
6. If `autoStartTimer` is true (from crash out prompt), starts timer after 100ms delay
7. Saves data

### renderActiveSession() -- line 21740

Updates task text, tier label, timer display, and checklist.

### Timer Functions

| Function                  | Line  | Behavior                                           |
|---------------------------|-------|----------------------------------------------------|
| `startFocusTimer()`       | 21827 | Sets `focusTimerRunning = true`, starts 1-second interval decrementing `focusTimerSecondsRemaining`. On zero: stops, calls `onFocusTimerComplete()`. |
| `pauseFocusTimer()`       | 21846 | Stops interval, sets `focusTimerRunning = false`    |
| `resumeFocusTimer()`      | 21857 | Alias for `startFocusTimer()`                       |
| `setFocusDuration(min)`   | 21861 | Sets duration to 15/25/50 min, resets remaining seconds, updates active button styling |
| `adjustFocusTimer(secs)`  | 22213 | Adds/subtracts seconds (min 0), updates display     |

### updateFocusTimerDisplay() -- line 21763

- Updates `#focusTimerDisplay` with MM:SS
- Updates SVG circle progress (`#focusTimerCircle`, circumference 879.6)
- Color transitions: green (default) -> yellow (<=33% remaining) -> red (<=10% remaining) via gradient swaps
- Shows/hides paused label
- Toggles start/pause/resume button visibility

### Timer Completion -- onFocusTimerComplete() -- line 21882

1. Awards 20 XP via `awardCommandCenterXP()`
2. Increments `focusStats.focusStreak`
3. Calls `showFocusCompleteModal()`
4. Vibrates device if supported
5. Saves data

### showFocusCompleteModal() -- line 21900

Shows `#focusTimerCompleteModal` with:
- Random motivational title (8 options like "CRUSHED IT!", "BEAST MODE!")
- CSS confetti (40 particles with random colors, shapes, fall durations)
- XP earned display
- Focus streak count
- Today's progress (X/Y tasks done)
- Session checklist summary

### Completion Actions

| Function                          | Line  | Behavior                                    |
|-----------------------------------|-------|---------------------------------------------|
| `completeFocusTask()`             | 21961 | Calls `completeTriageTask(currentFocusTaskId)` + `exitFocusMode()` |
| `completeFocusTaskFromModal()`    | 21967 | Hides modal, then calls `completeFocusTask()` |
| `startNextFocusTask()`            | 21972 | Finds next task (scheduled -> lockedIn -> today), starts it in focus. If none: toast + exit. |
| `takeBreak()`                     | 21990 | Hides modal, sets timer to 5 min break      |
| `backToTriageFromModal()`         | 21999 | Hides modal, switches to triage              |
| `skipFocusTask()`                 | 22220 | Calls `exitFocusMode()` -- abandons without completing |

### exitFocusMode() -- line 22009

Stops timer interval, clears session data (`taskId`, `checklist`, `confirmedStarted`, `startedAt`), nulls `currentFocusTaskId`, switches to triage, saves.

### Focus Checklist

In-session micro-task list stored in `commandCenterData.currentSession.checklist` (object keyed by item ID).

- `renderFocusChecklist()` (line 22031): renders items with checkboxes
- `addFocusChecklistItem()`: adds item from input
- `toggleFocusChecklistItem(id)`: toggles completed
- `deleteFocusChecklistItem(id)`: removes item

### Legacy Focus Timer (separate system)

Lines 19094-19116 contain `formatFocusTimer()` and `toggleFocusTimer()` from the old Focus Mode. These use `focusModeData.focusTimerRunning` and `focusModeData.focusTimerInterval` -- a completely separate state from the Command Center's Pomodoro timer. The legacy system counts UP; the Pomodoro counts DOWN.

---

## Key Patterns

### Correct Tier Transition

```javascript
// Always use spread to preserve existing task properties
tasks[taskId] = {
    ...task,
    triageTier: newTier,
    triageOrder: getTasksByTier(newTier).length + 1
};

// Clear crash out properties when leaving scheduled
if (newTier !== 'scheduled' && task.crashOutScheduled) {
    tasks[taskId].crashOutScheduled = false;
    delete tasks[taskId].crashOutTime;
    delete tasks[taskId].crashOutDuration;
}
```

### Correct Crash Out Ordering

```javascript
// UP/DOWN buttons: SWAP logic (exchange crashOutOrder values)
tasks[taskId1] = { ...tasks[taskId1], crashOutOrder: order2 };
tasks[taskId2] = { ...tasks[taskId2], crashOutOrder: order1 };

// DRAG-DROP / MOVE-TO: INSERT logic (splice + reassign all orders)
const taskIds = scheduledTasks.map(t => t.id);
const [draggedTaskId] = taskIds.splice(draggedIndex, 1);
const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
taskIds.splice(insertIndex, 0, draggedTaskId);
taskIds.forEach((id, i) => {
    tasks[id] = { ...tasks[id], crashOutOrder: i };
});
```

### Time Comparison for Prompts

```javascript
// parseCrashOutTime handles non-breaking spaces from toLocaleTimeString
const taskTime = parseCrashOutTime(task.crashOutTime);
const diff = now - taskTime;
// Prompt window: -30 seconds to +10 minutes
if (diff >= -30000 && diff <= 600000) { ... }
```

### XP Awards by Context

| Context                     | XP  |
|-----------------------------|-----|
| lockedIn task completed     | 50  |
| crashOut scheduled task     | 75  |
| rolledOver task             | 40  |
| default (today) task        | 25  |
| ALL lockedIn cleared bonus  | 100 |
| Focus session timer done    | 20  |

---

## Function Index

| Function | Line | Tab |
|----------|------|-----|
| `switchToFocusMode()` | 18926 | -- |
| `switchToFullView()` | 18937 | -- |
| `renderFocusMode()` | 18949 | -- |
| `commandCenterMode` (variable) | 19519 | -- |
| `getCurrentCommandCenterMode()` | 19551 | -- |
| `switchCommandCenterMode(mode)` | 19555 | -- |
| `updateCommandCenterGreeting()` | 19584 | -- |
| `updateOverallProgress()` | 19604 | -- |
| `getTodayTriageTasks()` | 19662 | Triage |
| `getTasksByTier(tier)` | 19667 | Triage |
| `renderTriageMode()` | 19687 | Triage |
| `updateTriageGreeting()` | 19698 | Triage |
| `renderTriageColumn(tier)` | 19718 | Triage |
| `getEmptyMessage(tier)` | 19731 | Triage |
| `renderTaskCard(task, tier)` | 19741 | Triage |
| `renderScheduledSection()` | 19774 | Triage |
| `renderRolledOverSection()` | 19803 | Triage |
| `updateAllTriageProgress()` | 19838 | Triage |
| `updateColumnProgress(tier)` | 19856 | Triage |
| `toggleTaskComplete(taskId)` | 19873 | Triage |
| `initTriageDragDrop()` | 19934 | Triage |
| `handleColumnDragOver(e)` | 19945 | Triage |
| `handleColumnDragLeave(e)` | 19951 | Triage |
| `handleColumnDrop(e)` | 19956 | Triage |
| `completeTriageTask(taskId)` | 19975 | Triage |
| `setTaskTier(taskId, tier)` | 20032 | Triage |
| `sendToCrashOut(taskId)` | 20057 | Crash Out |
| `recalculateScheduledTimes()` | 20117 | Crash Out |
| `removeFromCrashOut(taskId)` | 20137 | Crash Out |
| `editTriageTaskText(taskId)` | 20163 | Triage |
| `triageQuickAddTask()` | 20176 | Triage |
| `handleTriageDragStart(e, id)` | 20207 | Triage |
| `handleTriageDrop(e, targetId, tier)` | 20227 | Triage |
| `handleTriageDragEnd(e)` | 20246 | Triage |
| `reorderTriageTasks(draggedId, targetId, tier)` | 20253 | Triage |
| `handleSectionDragOver(e, tier)` | 20278 | Triage |
| `handleSectionDrop(e, tier)` | 20291 | Triage |
| `startLongPress(e, taskId)` | 20316 | Triage |
| `showTaskDetailsModal(taskId)` | 20334 | Triage |
| `unflagFromToday(taskId)` | 20408 | Triage |
| `startTimePromptChecker()` | 20432 | Crash Out |
| `checkForTimePrompts()` | 20437 | Crash Out |
| `showTimePrompt(task)` | 20494 | Crash Out |
| `startTaskFromPrompt(taskId)` | 20533 | Crash Out |
| `closeTimePrompt()` | 20540 | Crash Out |
| `pushAllTasks(minutes)` | 20551 | Crash Out |
| `showCascadeAnimation()` | 20592 | Crash Out |
| `showUndoToast(minutes)` | 20603 | Crash Out |
| `undoPush()` | 20636 | Crash Out |
| `skipTask(taskId)` | 20659 | Crash Out |
| `removeTaskFromSchedule(taskId)` | 20666 | Crash Out |
| `renderCrashOutMode()` | 20703 | Crash Out |
| `setCrashOutSleep(option)` | 20735 | Crash Out |
| `setCustomSleepTime()` | 20770 | Crash Out |
| `changeSleepTime()` | 20801 | Crash Out |
| `adjustSleepTime(minutesDelta)` | 20807 | Crash Out |
| `renderCrashOutTimeline()` | 20830 | Crash Out |
| `renderCrashOutTimelineTasks(...)` | 20954 | Crash Out |
| `updateNowMarkerTime()` | 21133 | Crash Out |
| `handleTimelineDragStart(e, id)` | 21147 | Crash Out |
| `handleTimelineDrop(e, targetId)` | 21176 | Crash Out |
| `moveTaskToPosition(draggedId, targetId)` | 21203 | Crash Out |
| `reorderTimelineTasks(d, t)` | 21265 | Crash Out |
| `swapAdjacentTasks(id1, id2)` | 21270 | Crash Out |
| `moveTaskUp(taskId)` | 21327 | Crash Out |
| `moveTaskDown(taskId)` | 21345 | Crash Out |
| `moveTaskToTop(taskId)` | 21364 | Crash Out |
| `moveTaskToBottom(taskId)` | 21386 | Crash Out |
| `setTaskPosition(taskId, n)` | 21423 | Crash Out |
| `promptTaskPosition(taskId)` | 21444 | Crash Out |
| `parseCrashOutTime(timeStr)` | 21485 | Crash Out |
| `setDurationDirect(taskId, val)` | 21510 | Crash Out |
| `renderUnscheduledPool()` | 21524 | Crash Out |
| `openDurationModal(taskId)` | 21560 | Crash Out |
| `recalculateCrashOutTimes()` | 21633 | Crash Out |
| `dismissOverscheduledWarning()` | 21644 | Crash Out |
| `resetCrashOutDay()` | 21655 | Crash Out |
| `renderFocusPomodoroMode()` | 21686 | Focus |
| `startTaskInFocus(taskId, auto)` | 21704 | Focus |
| `renderActiveSession()` | 21740 | Focus |
| `updateFocusTimerDisplay()` | 21763 | Focus |
| `startFocusTimer()` | 21827 | Focus |
| `pauseFocusTimer()` | 21846 | Focus |
| `resumeFocusTimer()` | 21857 | Focus |
| `setFocusDuration(minutes)` | 21861 | Focus |
| `onFocusTimerComplete()` | 21882 | Focus |
| `showFocusCompleteModal()` | 21900 | Focus |
| `completeFocusTask()` | 21961 | Focus |
| `completeFocusTaskFromModal()` | 21967 | Focus |
| `startNextFocusTask()` | 21972 | Focus |
| `takeBreak()` | 21990 | Focus |
| `exitFocusMode()` | 22009 | Focus |
| `adjustFocusTimer(seconds)` | 22213 | Focus |
| `skipFocusTask()` | 22220 | Focus |
