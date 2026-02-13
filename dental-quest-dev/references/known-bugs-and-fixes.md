# Known Bugs and Fixes -- index.html

This document captures the major bug patterns that were identified and fixed, so future work avoids reintroducing them.

## Table of Contents
- [1. Reordering Lock Pattern](#1-reordering-lock-pattern-tryfinally--200ms-cooldown)
- [2. Time Comparison Pattern](#2-time-comparison-pattern-parsecrashoutime-to-date-subtraction)
- [3. Window Exposure Pattern](#3-window-exposure-pattern-for-onclick-handlers)
- [4. NOW Indicator Dual Interval](#4-now-indicator-dual-interval-15s-text--60s-rebuild)
- [5. Sleep Time Cascade](#5-sleep-time-cascade-adjust---recalculate---render---save)
- [6. Data Wipe on Fresh Device](#6-data-wipe-on-fresh-device-sync-protection)
- [7. Insert Index Off-by-One Bug](#7-insert-index-off-by-one-bug)
- [8. Skip vs Remove Confusion](#8-skip-vs-remove-confusion)
- [9. Crash Out Tasks Not Counting](#9-crash-out-tasks-not-counting-in-dashboard-progress)

---

## 1. Reordering Lock Pattern (try/finally + 200ms cooldown)

**Bug**: Rapid drag-drop or button clicks fired multiple reorder operations simultaneously, corrupting `crashOutOrder` values and causing tasks to jump to wrong positions or disappear from the timeline.

**Root cause**: No mutual exclusion on reorder operations. Two simultaneous calls to `moveTaskToPosition()` would both read the same task list, compute independent new orders, and write conflicting results.

**Fix** (lines 21145-21262):

```javascript
let isReorderingLocked = false;

function moveTaskToPosition(draggedId, targetId) {
    if (isReorderingLocked) return;   // Early exit if locked
    isReorderingLocked = true;

    // ... early returns also unlock:
    if (draggedIndex === -1 || targetIndex === -1) {
        isReorderingLocked = false;
        return;
    }

    try {
        // ... reorder logic ...
        recalculateScheduledTimes();
        renderCrashOutMode();
        saveData();
    } catch (e) {
        console.error('Reorder error:', e);
    } finally {
        setTimeout(() => { isReorderingLocked = false; }, 200);
    }
}
```

**Key details**:
- The lock variable `isReorderingLocked` (line 21145) is checked at the top of every reorder function.
- `try/finally` ensures the lock is always released even if an error occurs.
- The 200ms `setTimeout` in `finally` prevents rapid re-triggers (human can't click faster than 200ms).
- Both `moveTaskToPosition()` (line 21203) and `swapAdjacentTasks()` (line 21270) use the same lock variable.
- For adjacent tasks, `moveTaskToPosition` delegates to `swapAdjacentTasks`, releasing its own lock first (`isReorderingLocked = false`) since the swap function manages its own lock.
- Drag handlers also check the lock before initiating a move (line 21148, 21186).

**Lesson**: Any function that mutates shared ordered data (task order, timeline positions) must use the lock pattern. Never add a new reorder path without checking `isReorderingLocked`.

---

## 2. Time Comparison Pattern (parseCrashOutTime to Date subtraction)

**Bug**: Time prompts compared raw time strings like `"2:30 PM"`, which broke because `toLocaleTimeString()` on some browsers inserts non-breaking spaces (Unicode `\u00a0`) instead of regular spaces before AM/PM.

**Root cause**: String comparison of locale-formatted time strings is unreliable. Different browsers and OS locales format times differently.

**Fix** (lines 21485-21507, used at line 20468):

```javascript
function parseCrashOutTime(timeStr) {
    if (!timeStr) return null;
    // Regex handles both regular and non-breaking spaces
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    // Midnight crossover: if parsed time is >12h in past, push to tomorrow
    if (date.getTime() < new Date().getTime() - 12 * 60 * 60 * 1000) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}
```

**Usage** in `checkForTimePrompts()` (line 20468):

```javascript
const taskTime = parseCrashOutTime(task.crashOutTime);
if (!taskTime) continue;
const diff = now - taskTime;  // Millisecond subtraction on Date objects
if (diff >= -30000 && diff <= 600000) { ... }
```

**Key details**:
- `\s*` in the regex matches zero or more whitespace characters including non-breaking spaces.
- Returns a proper `Date` object, enabling reliable millisecond subtraction.
- Midnight crossover logic handles crash-out sessions that span past midnight (e.g., sleep time at 2:00 AM).
- The -30s to +600s window means: show prompt up to 30 seconds before the task starts, and up to 10 minutes after.

**Lesson**: Never compare formatted time strings directly. Always parse to `Date` objects first.

---

## 3. Window Exposure Pattern for onclick Handlers

**Bug**: Functions defined inside a closure (the main `<script>` IIFE or DOMContentLoaded handler) are not accessible from `onclick` attributes in dynamically generated HTML. Clicking buttons rendered with `onclick="moveTaskUp('id')"` threw `ReferenceError: moveTaskUp is not defined`.

**Root cause**: `innerHTML` onclick handlers execute in the global scope (`window`), but functions defined inside a closure are not on `window` by default.

**Fix** (lines 21463-21475):

```javascript
window.moveTaskUp = moveTaskUp;
window.moveTaskDown = moveTaskDown;
window.moveTaskToTop = moveTaskToTop;
window.moveTaskToBottom = moveTaskToBottom;
window.promptTaskPosition = promptTaskPosition;
window.swapAdjacentTasks = swapAdjacentTasks;
window.moveTaskToPosition = moveTaskToPosition;
window.setTaskPosition = setTaskPosition;
window.handleTimelineDragStart = handleTimelineDragStart;
window.handleTimelineDragOver = handleTimelineDragOver;
window.handleTimelineDragLeave = handleTimelineDragLeave;
window.handleTimelineDrop = handleTimelineDrop;
window.handleTimelineDragEnd = handleTimelineDragEnd;
```

Also at line 20828:
```javascript
window.adjustSleepTime = adjustSleepTime;
```

**Key details**:
- Every function referenced in dynamically generated `onclick`, `ondragstart`, `ondragover`, `ondragleave`, `ondrop`, or `ondragend` attributes MUST be exposed on `window`.
- The exposure block includes a verification log (line 21476) that confirms all functions are registered.
- Functions that are only called from other JS code (not from HTML attributes) do NOT need window exposure.

**Lesson**: When adding a new function that will be called from `onclick` in rendered HTML, always add `window.functionName = functionName` after the function definition.

---

## 4. NOW Indicator Dual Interval (15s text + 60s rebuild)

**Bug**: The NOW marker on the crash-out timeline showed stale time, and its position between task blocks became inaccurate over time.

**Root cause**: A single interval doing a full timeline rebuild was either too slow (stale text) or too frequent (performance hit from re-rendering the entire timeline every few seconds).

**Fix** (lines 20675-20690):

```javascript
let crashOutTimelineInterval = null;
let nowTimeInterval = null;

function startCrashOutTimelineInterval() {
    if (crashOutTimelineInterval) clearInterval(crashOutTimelineInterval);
    if (nowTimeInterval) clearInterval(nowTimeInterval);

    // Full rebuild every 60 seconds (repositions NOW between task blocks)
    crashOutTimelineInterval = setInterval(() => {
        if (commandCenterData.crashOut && commandCenterData.crashOut.sleepTime) {
            renderCrashOutTimeline();
        }
    }, 60000);

    // Lightweight NOW time text update every 15 seconds
    nowTimeInterval = setInterval(updateNowMarkerTime, 15000);
}
```

**Key details**:
- Two separate intervals with different purposes:
  - **60s interval**: Calls `renderCrashOutTimeline()` which rebuilds the entire DOM -- repositions the NOW marker relative to task blocks as real time advances.
  - **15s interval**: Calls `updateNowMarkerTime()` (line 21133) which ONLY updates the text content of the NOW marker element (the time string), without touching the DOM structure. Very cheap.
- Both intervals are stored in variables and properly cleared in `stopCrashOutTimelineInterval()` (line 20692).
- `stopCrashOutTimelineInterval()` is called when leaving crash-out mode to prevent memory leaks.
- The shared `gcalGridParams` variable (line 20677) allows `updateNowMarkerTime()` to reposition the NOW marker's pixel position without needing a full rebuild.

**Lesson**: For real-time UI elements, separate expensive rebuilds (low frequency) from cheap text updates (high frequency).

---

## 5. Sleep Time Cascade (adjust -> recalculate -> render -> save)

**Bug**: Changing the sleep time did not update task scheduled times, or updated them but did not re-render the timeline, or re-rendered but did not persist.

**Root cause**: The operations were not called in the correct order, or some steps were missing.

**Fix** (lines 20807-20828):

```javascript
function adjustSleepTime(minutesDelta) {
    if (!commandCenterData.crashOut || !commandCenterData.crashOut.sleepTime) return;

    const currentSleep = new Date(commandCenterData.crashOut.sleepTime);
    const newSleep = new Date(currentSleep.getTime() + minutesDelta * 60 * 1000);

    // Don't allow sleep time to be in the past
    if (newSleep <= new Date()) {
        showToast('Sleep time cannot be in the past', '⚠');
        return;
    }

    commandCenterData.crashOut.warningDismissed = false;
    commandCenterData.crashOut.sleepTime = newSleep.toISOString();

    // THE CASCADE (order matters):
    recalculateScheduledTimes();   // 1. Recalculate all task times
    saveData();                     // 2. Persist to localStorage + Firebase
    renderCrashOutTimeline();       // 3. Re-render the visual timeline

    showToast('Sleep time: ' + timeStr, '✓');
}
```

**The cascade order**:
1. **`recalculateScheduledTimes()`** (line 20117): Walks through all scheduled tasks, computes new `crashOutTime` values based on the new sleep time and task durations. Must run FIRST because render reads these values.
2. **`saveData()`** (line 12902): Persist the updated data. Runs second so the data is saved even if render fails.
3. **`renderCrashOutTimeline()`** (line 20830): Rebuilds the visual timeline from the updated data. Runs last because it reads the already-updated task times.

**Key details**:
- The same cascade pattern is used in `setDurationDirect()` (line 21510), `pushAllTasks()` (line 20551), `sendToCrashOut()` (line 20057), and `removeFromCrashOut()` (line 20137).
- Sleep time is stored as an ISO string (`newSleep.toISOString()`), not as a formatted string, for reliable parsing.
- The `warningDismissed` flag is reset when sleep time changes, so the wind-down warning can re-appear if the new sleep time triggers it.

**Lesson**: Any operation that modifies crash-out scheduling data must call the full cascade: `recalculateScheduledTimes()` -> `saveData()` -> `renderCrashOutMode()` (or `renderCrashOutTimeline()`).

---

## 6. Data Wipe on Fresh Device (Sync Protection)

**Bug**: Opening the app on a new device or cleared browser wiped all cloud data, replacing it with empty defaults.

**Root cause**: Default state had `_version: Date.now()` which was always NEWER than cloud data. The app thought local was more recent and overwrote cloud with empty data.

**Fix** (lines 11970-11998, 12902-12970):

Five sync protection guards in `saveData()`:
1. **Guard 0** (line 12908): `!pinValidated` -- never save before PIN validated
2. **Guard A** (line 12915): `!initialLoadComplete` -- never save before initial load
3. **Guard B** (line 12921): `!hasLoadedFromCloud` -- never save before cloud data checked
4. **Guard C** (line 12961): `isEmptyState(data)` -- never save empty state to Firebase
5. **Visibility handler** (line 14189): Same guards applied to tab-hidden flush

The `isEmptyState()` function (line 11979) checks for presence of ANY real user content: tasks, calendar notes, calendar events, notebook entries, XP, focus data, or command center data.

**Lesson**: NEVER modify the sync guards. NEVER set initial state versions to `Date.now()`. Always let the cloud load complete before allowing any saves.

---

## 7. Insert Index Off-by-One Bug

**Bug**: Dragging a task downward in the timeline placed it one position too low.

**Root cause**: After removing the dragged task from the array with `splice()`, all indices above the removal point shift down by one. The target index was not adjusted for this shift.

**Fix** (line 21244):

```javascript
// Before (broken):
const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
// Both branches were identical - no adjustment!

// After (fixed):
const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
```

**Lesson**: When using splice-remove then splice-insert, always adjust the insert index when dragging downward (`draggedIndex < targetIndex`), because the removal shifts subsequent indices down by one.

---

## 8. Skip vs Remove Confusion

**Bug**: The "Skip" button removed tasks entirely from the schedule. Users lost tasks they meant to defer.

**Fix** (lines 20659-20700):
- `skipTask(taskId)` now only DISMISSES the prompt (adds 3-minute cooldown to `dismissedUntil` map). Task stays in schedule.
- `removeTaskFromSchedule(taskId)` is a separate function that actually removes the task from the crash-out tier.
- UI shows two distinct buttons: "Dismiss" (temporary) and "Remove" (permanent).
- `dismissedUntil` entries auto-expire after 3 minutes (cleaned up in `checkForTimePrompts()`).

---

## 9. Crash Out Tasks Not Counting in Dashboard Progress

**Bug**: Tasks sent to crash-out mode and completed there did not count toward the dashboard progress bar or daily totals.

**Root cause**: `sendToCrashOut()` did not set `doToday: true`, and `completeTriageTask()` did not preserve the `doToday` flag when marking complete.

**Fix**:
- `sendToCrashOut()` (line 20057): Now sets `doToday: true` on the task.
- `completeTriageTask()` (line 19975): Preserves `doToday: true` and adds `completedAt` timestamp using spread pattern.
