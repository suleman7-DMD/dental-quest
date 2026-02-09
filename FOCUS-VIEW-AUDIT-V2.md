# Focus View Audit Report v2 — Post-Fix Review

## Summary

| Category | Count | Details |
|----------|-------|---------|
| Original fixes verified | 22 | All v1 proposed fixes confirmed implemented |
| New bugs found | 3 | 1 Medium, 2 Medium-Low |
| Missing fixes from v1 | 3 | Overscheduled warning, adjustSleepTime gaps |
| Code quality issues | 8 | Dead code, duplicate CSS, hardcoded colors, etc. |

**File:** `index.html` (18,758 lines post-fix)
**Reviewed by:** 4 parallel agents (reorder-reviewer, timeline-reviewer, prompt-reviewer, ui-reviewer)
**Base commit:** `79d621e` (Fix 5 Focus View bugs)

---

## BUG 1: Task Reordering — MOSTLY FIXED

### Confirmed Fixes (4/4 original root causes resolved)

| RC | Fix | Status | Lines |
|----|-----|--------|-------|
| RC1 | 5 reorder buttons restored in template | CONFIRMED | 17572-17576 |
| RC2 | Sort uses `??` not `\|\|` for crashOutOrder | CONFIRMED | 16250 |
| RC3 | Adjacent swap detection for drag-drop | CONFIRMED | 17693-17697 |
| RC4 | try-finally lock protection | CONFIRMED | 17702-17725, 17771-17788 |
| -- | Window exposure (13 functions) | CONFIRMED | 17911-17924 |

### NEW BUG: `moveTaskToBottom` places task at second-to-last position

**Severity: MEDIUM**
**Line: 17708**

The `insertIndex` calculation in `moveTaskToPosition()` has an off-by-one when moving a task downward to the end:

```javascript
const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
```

**Example:** Tasks `[A(0), B(1), C(2), D(3), E(4)]`, call `moveTaskToBottom('A')`:
1. Removes A → `['B', 'C', 'D', 'E']`
2. `insertIndex = 4 - 1 = 3`
3. Inserts at 3 → `['B', 'C', 'D', 'A', 'E']`
4. A ends up at position 3 (second-to-last), NOT position 4 (last)

**Also affects:** `setTaskPosition(taskId, N)` via the `#` button when targeting the last position.

**Does NOT affect:** `moveTaskToTop` (upward insert uses `targetIndex` directly, which is correct).

**Proposed fix (line 17708):**
```javascript
// After splice removal, if target was beyond dragged, adjust down by 1
// BUT if target is the last item, use array length to append at end
const insertIndex = draggedIndex < targetIndex
    ? (targetIndex >= taskIds.length ? taskIds.length : targetIndex - 1)
    : targetIndex;
```

Alternatively, `moveTaskToBottom` could bypass `moveTaskToPosition` entirely:
```javascript
function moveTaskToBottom(taskId) {
    if (isReorderingLocked) return;
    isReorderingLocked = true;
    try {
        const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
        if (scheduledTasks.length < 2) { isReorderingLocked = false; return; }
        const taskIds = scheduledTasks.map(t => t.id);
        const idx = taskIds.indexOf(taskId);
        if (idx === -1 || idx === taskIds.length - 1) { isReorderingLocked = false; return; }
        taskIds.splice(idx, 1);
        taskIds.push(taskId); // Append at end
        taskIds.forEach((id, i) => { tasks[id] = { ...tasks[id], crashOutOrder: i }; });
        recalculateScheduledTimes();
        renderCrashOutMode();
        saveData();
    } catch (e) {
        console.error('moveTaskToBottom error:', e);
    } finally {
        setTimeout(() => { isReorderingLocked = false; }, 200);
    }
}
```

---

## BUG 2: NOW Bar — FULLY FIXED

### Confirmed Fixes (3/3)

| Fix | Status | Lines |
|-----|--------|-------|
| Dynamic NOW marker IDs (`dynamicNowMarker`, `dynamicNowTime`) | CONFIRMED | 17513 |
| Lightweight `updateNowMarkerTime()` function | CONFIRMED | 17600-17605 |
| 15-second fast interval + 60-second full rebuild | CONFIRMED | 17234-17255 |
| Both intervals properly cleared on stop | CONFIRMED | 17247-17255 |

No remaining issues. The NOW bar time text updates every 15 seconds via lightweight DOM manipulation, and the full timeline rebuilds every 60 seconds to reposition the marker at task boundaries.

---

## BUG 3: Sleep Time Updates — PARTIALLY FIXED (3 issues remain)

### Confirmed Fixes

| Fix | Status | Lines |
|-----|--------|-------|
| Sleep time adjuster UI (+/-15m, +/-30m, Reset) | CONFIRMED | 7506-7513 |
| `adjustSleepTime()` function with past-time validation | CONFIRMED | 17362-17381 |
| Sleep time label updates on render | CONFIRMED | 17414-17416 |
| `window.adjustSleepTime` exposed | CONFIRMED | 17381 |
| Adjuster CSS (flex layout, dark theme) | CONFIRMED | 6104-6129 |

### UNFIXED: Overscheduled warning permanently hidden

**Severity: HIGH**
**Line: 7531**

The v1 audit identified this and proposed removing the inline `style="display: none;"`. **It was NOT fixed.**

```html
<!-- CURRENT (line 7531) — BROKEN -->
<div class="overscheduled-warning" id="overscheduledWarning" style="display: none;">

<!-- SHOULD BE -->
<div class="overscheduled-warning hidden" id="overscheduledWarning">
```

The JS at lines 17474-17478 toggles the `.hidden` class, but the inline `style="display: none;"` always wins. The warning can **never become visible**.

### MISSING: `adjustSleepTime()` doesn't call `recalculateScheduledTimes()`

**Severity: MEDIUM**
**Line: 17374-17376**

Both `setCrashOutSleep()` (line 17309) and `setCustomSleepTime()` (line 17348) call `recalculateScheduledTimes()`, but `adjustSleepTime()` does not. This is an inconsistency — task times won't be recalculated relative to the new sleep boundary.

**Proposed fix — add before `saveData()` on line 17376:**
```javascript
commandCenterData.crashOut.warningDismissed = false; // Reset warning
commandCenterData.crashOut.sleepTime = newSleep.toISOString();
recalculateScheduledTimes(); // Add this
saveData();
renderCrashOutTimeline();
```

### MISSING: `adjustSleepTime()` doesn't reset `warningDismissed`

**Severity: LOW**
**Line: 17362-17380**

When sleep time changes, the overscheduled status may change. Other functions (e.g., `sendToCrashOut`, `removeFromCrashOut`) reset `warningDismissed = false` when conditions change. `adjustSleepTime` does not. (Moot while the warning is permanently hidden, but should be fixed alongside.)

---

## BUG 4: Idle Prompts — FULLY FIXED (with minor improvements possible)

### Confirmed Fixes (3/3)

| Fix | Status | Lines |
|-----|--------|-------|
| Mode guard changed: blocks only during active focus session | CONFIRMED | 17003 |
| Time window widened: -30s to +10min | CONFIRMED | 17028 |
| Catch-up logic for past-due tasks | CONFIRMED | 17035-17046 |
| startTimePromptChecker called at init | CONFIRMED | 18730 |
| Modal HTML/CSS correct (z-index 10000, full-screen) | CONFIRMED | 17049-17087 |
| pushAllTasks updates all tasks, saves, re-renders | CONFIRMED | 17107-17145 |
| startTaskFromPrompt: closes modal, starts focus, starts timer | CONFIRMED | 17089-17094 |

### Improvement opportunities (not bugs)

| # | Severity | Line | Issue |
|---|----------|------|-------|
| 1 | Medium | 17141 | **Re-check guard too restrictive after push.** The `setTimeout` re-check after pushing uses `if (commandCenterMode === 'crashout')`, but the mode guard fix now allows prompts on any tab. If user pushes tasks then switches to triage, the re-check won't fire. Should match main guard logic. |
| 2 | Medium | 17013-17046 | **Modal replacement for overlapping tasks.** `lastPromptedTaskId` is a single variable. With back-to-back tasks, prompt for task A can be silently replaced by task B's prompt after 15 seconds. User loses task A's prompt without interaction. A guard checking if a modal is currently displayed would prevent this. |
| 3 | Minor | 17003 + 17006 | **Dead code.** Guard on line 17003 (`commandCenterMode === 'focus' && currentFocusTaskId`) is entirely redundant because line 17006 (`if (currentFocusTaskId) return`) catches all cases. |
| 4 | Minor | 1487-1498 + 1786-1805 | **Duplicate CSS.** `.time-prompt-modal` defined twice with different values. Second definition overrides first, removing slideUp animation. |
| 5 | Low | 16996 | **Interval never stopped.** `timePromptInterval` runs every 15s forever, even when all tasks are completed. Functionally harmless due to early-return guards. |

---

## BUG 5: UI Compact — FULLY FIXED

### Confirmed Fixes (11/11)

| # | Fix | Status | Lines |
|---|-----|--------|-------|
| 1 | Triage min-height 300px → 180px | CONFIRMED | 5622 |
| 2 | Triage padding 12px → 8px | CONFIRMED | 5621 |
| 3 | Timeline margin-bottom 6px → 4px | CONFIRMED | 6248 |
| 4 | Timeline card padding 6px 10px → 5px 8px | CONFIRMED | 6269 |
| 5 | Timeline card gap 8px → 6px | CONFIRMED | 6272 |
| 6 | Tier badge 22x22 → 18x18 | CONFIRMED | 6285-6286 |
| 7 | Tier badge font 11px → 10px | CONFIRMED | 6291 |
| 8 | task-content flex layout | CONFIRMED | 6303-6308 |
| 9 | task-text inline + ellipsis + flex:1 | CONFIRMED | 6311-6321 |
| 10 | duration-info nowrap + flex-shrink:0 | CONFIRMED | 6324-6328 |
| 11 | Rolled-over cards single-row layout | CONFIRMED | 16391-16404 |

### Impact measurements

| Card Type | Pre-fix | Post-fix | Reduction |
|-----------|---------|----------|-----------|
| Triage | ~34px | ~30px | 12% |
| Timeline | ~44px | ~28px | **36%** |
| Rolled-over | ~60px | ~30px | **50%** |

For 8 timeline tasks, this saves ~128px of vertical space (~1 extra visible task without scrolling).

### Remaining improvements (not bugs)

| # | Severity | Line | Issue |
|---|----------|------|-------|
| 1 | Moderate | 17571-17576 | **5 reorder buttons may overflow on mobile.** With 9 action elements per card (5 reorder + start + select + edit + remove) in a nowrap flex row, timeline cards may overflow on screens < 900px. No media query hides or collapses reorder buttons on mobile. |
| 2 | Minor | 6112-6131 | **5 new hardcoded hex colors** in sleep adjuster CSS (`#334155`, `#94a3b8`, `#1e293b`, `#f1f5f9`). Should use CSS variables (`var(--border)`, `var(--text-muted)`, etc.) for consistency. |
| 3 | Minor | 6932 | **Mobile min-height 200px** could be reduced to 150px to match desktop 180px compactness spirit. |

---

## Overall Scorecard

| Bug | v1 Status | v2 Status | Remaining Issues |
|-----|-----------|-----------|------------------|
| BUG 1: Reordering | 4 root causes identified | **4/4 fixed** | 1 new off-by-one in moveTaskToBottom |
| BUG 2: NOW Bar | 3 root causes identified | **3/3 fixed** | None |
| BUG 3: Sleep Time | 2 root causes identified | **2/5 items fixed** | Overscheduled warning unfixed, adjustSleepTime missing calls |
| BUG 4: Idle Prompts | 3 root causes identified | **3/3 fixed** | 2 medium improvements possible |
| BUG 5: UI Compact | 11 changes proposed | **11/11 fixed** | 1 mobile overflow concern |

---

## Prioritized Fix List (Remaining)

### Must Fix (3 items)

1. **Line 7531:** Remove `style="display: none;"` from overscheduled warning, add `class="hidden"`
2. **Line 17374:** Add `recalculateScheduledTimes()` and `warningDismissed = false` to `adjustSleepTime()`
3. **Line 17708 / 17868:** Fix moveTaskToBottom off-by-one (append instead of insert)

### Should Fix (2 items)

4. **Line 17141:** Change re-check guard in `pushAllTasks` setTimeout from `commandCenterMode === 'crashout'` to match main prompt guard logic
5. **Lines 17013-17046:** Add guard to prevent modal replacement when a prompt is already displayed

### Nice to Fix (6 items)

6. **Line 17003:** Remove dead code (redundant mode guard)
7. **Lines 1487-1498 or 1786-1805:** Remove duplicate `.time-prompt-modal` CSS block
8. **Lines 6112-6131:** Replace hardcoded hex colors with CSS variables
9. **Line 6932:** Reduce mobile triage min-height to 150px
10. **Lines 17571-17576:** Add mobile media query to collapse reorder buttons
11. **Line 16996:** Add cleanup to stop `timePromptInterval` when no tasks remain

---

## Test Checklist

### BUG 1: Reordering
- [x] moveTaskUp works (swap with previous)
- [x] moveTaskDown works (swap with next)
- [x] moveTaskToTop works
- [ ] **moveTaskToBottom — OFF BY ONE (task lands at second-to-last)**
- [ ] **promptTaskPosition to last position — SAME OFF BY ONE**
- [x] Drag and drop works (including adjacent)
- [x] isReorderingLocked recovers from errors (try-finally)
- [x] Sort uses ?? not || (crashOutOrder: 0 handled)
- [x] All 13 functions exposed on window

### BUG 2: NOW Bar
- [x] NOW time text updates every 15 seconds
- [x] NOW marker repositions at task boundaries (60s rebuild)
- [x] Both intervals properly cleared on stop
- [x] Static NOW marker hidden

### BUG 3: Sleep Time
- [x] +/-15m and +/-30m adjuster buttons rendered
- [x] adjustSleepTime validates against past time
- [x] Sleep time label updates on adjustment
- [ ] **Overscheduled warning NEVER displays (inline style conflict)**
- [ ] **adjustSleepTime missing recalculateScheduledTimes()**
- [ ] **adjustSleepTime missing warningDismissed reset**

### BUG 4: Idle Prompts
- [x] Prompts fire regardless of active tab (mode guard fixed)
- [x] Time window: -30s early warning, +10min window
- [x] Past-due catch-up logic fires
- [x] Push-back updates all tasks, saves, re-renders
- [x] Start from prompt opens Focus tab, starts timer
- [x] Dismiss prevents re-prompt for that task/time
- [ ] Re-check after push blocked outside crashout tab
- [ ] Modal can be silently replaced by next task's prompt

### BUG 5: UI Compact
- [x] Triage column min-height reduced (180px)
- [x] Timeline task cards single-line (~28px)
- [x] Rolled-over cards single-row (~30px)
- [x] Dark theme colors maintained (with minor hardcoded exceptions)
- [x] All interactive elements functional
- [ ] Mobile overflow possible with 5 reorder buttons
