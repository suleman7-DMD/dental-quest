# Focus View Audit Report

## Summary

| Severity | Count | Bugs |
|----------|-------|------|
| Critical | 1 | Task Reordering (BUG 1) |
| High | 3 | NOW Bar (BUG 2), Sleep Time (BUG 3), Idle Prompts (BUG 4) |
| Medium | 1 | UI Clunky (BUG 5) |

**File:** `index.html` (~18,648 lines)
**Investigated by:** 4 parallel agents (reorder-debugger, timeline-debugger, prompt-debugger, ui-redesigner)

---

## BUG 1: Task Reordering Completely Broken (Critical)

### Current Behavior
- All 6 reorder methods appear non-functional
- Drag-drop, up/down arrows, top/bottom, manual position entry

### Root Causes (4 Found)

**RC1: Three buttons removed from template (commit f3ad3ca)**
The `renderCrashOutTimelineTasks()` template (lines 17462-17497) only has 2 buttons (up/down). The previous commit deliberately removed 3 buttons:
- `moveTaskToTop()` button (removed)
- `moveTaskToBottom()` button (removed)
- `promptTaskPosition()` button (removed)

Functions still exist (lines 17718-17798) and are bound to `window` (lines 17804-17806), but no UI to trigger them.

**RC2: Core sort bug was FIXED (but verify)**
The `||` to `??` fix at line 16207 was applied in commit f3ad3ca:
```javascript
// BEFORE (broken): (a.crashOutOrder || 999) — 0 treated as 999
// AFTER (fixed):   (a.crashOutOrder ?? 999) — 0 correctly stays 0
```
Up/down buttons should work now IF the sort fix is properly deployed.

**RC3: Drag-drop one-position-down does nothing**
In `moveTaskToPosition` (line 17599):
```javascript
const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
```
When dragging exactly 1 position down, `insertIndex` equals original position. No visible change.

**RC4: `isReorderingLocked` can get stuck permanently**
In `swapAdjacentTasks` (line 17631) and `moveTaskToPosition` (line 17571):
- Sets `isReorderingLocked = true`
- If `recalculateScheduledTimes()`, `renderCrashOutMode()`, or `saveData()` throws, the `setTimeout` to unlock never fires
- All subsequent reorder attempts silently fail with "Reordering is locked!"
- No try-catch protection

### Fix

**Fix 1: Restore 3 removed buttons** — At line ~17480 in the reorder-buttons div, add back:
```html
<button class="btn-reorder" onclick="event.stopPropagation(); moveTaskToTop('${task.id}')" ${isFirst ? 'disabled' : ''} title="Move to top">&#x2B06;&#x2B06;</button>
<!-- existing up/down buttons -->
<button class="btn-reorder" onclick="event.stopPropagation(); moveTaskToBottom('${task.id}')" ${isLast ? 'disabled' : ''} title="Move to bottom">&#x2B07;&#x2B07;</button>
<button class="btn-reorder" onclick="event.stopPropagation(); promptTaskPosition('${task.id}')" title="Set position">#</button>
```

**Fix 2: Adjacent drag-drop** — At line ~17590, add adjacent swap detection:
```javascript
if (Math.abs(draggedIndex - targetIndex) === 1) {
    isReorderingLocked = false;
    swapAdjacentTasks(draggedId, targetId);
    return;
}
```

**Fix 3: Try-finally for lock** — Wrap logic in both `swapAdjacentTasks` and `moveTaskToPosition`:
```javascript
isReorderingLocked = true;
try {
    // ... existing logic ...
    recalculateScheduledTimes();
    renderCrashOutMode();
    saveData();
} catch (e) {
    console.error('Reorder error:', e);
} finally {
    setTimeout(() => { isReorderingLocked = false; }, 200);
}
```

---

## BUG 2: Timeline NOW Bar Not Moving (High)

### Current Behavior
- NOW marker exists but is a **flow element between task cards**, not an absolutely-positioned line
- Only "jumps" when crossing a task boundary (e.g., 5:30 when Task A ends)
- Between boundaries, it stays at the SAME visual position
- 60-second interval rebuilds entire innerHTML (causes flash)
- Dynamic NOW marker has no ID, so lightweight updates aren't possible

### Root Cause
The NOW bar is inserted into the document flow between task cards (line 17456-17460):
```javascript
if (!_ni && tsd) {
    const ted = new Date(tsd.getTime() + duration * 60 * 1000);
    if (now < ted) { _h += _nm; _ni = true; }
}
```
It's not absolutely positioned relative to a time scale. Position is determined by which task it precedes, not by pixel calculation from current time.

### Fix

**Fix A: Add ID to dynamic NOW marker** — At line 17422, change:
```javascript
const _nm = '<div class="timeline-now" id="dynamicNowMarker"><span class="now-label">NOW</span><span class="now-time" id="dynamicNowTime">' + _ct + '</span><div class="now-line"></div></div>';
```

**Fix B: Add lightweight time update function** — After line 17503:
```javascript
function updateNowMarkerTime() {
    const el = document.getElementById('dynamicNowTime');
    if (el) {
        el.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
}
```

**Fix C: Add faster interval** — In `startCrashOutTimelineInterval()` (line 17176):
```javascript
let nowTimeInterval = null;
// In the function body, after crashOutTimelineInterval setup:
if (nowTimeInterval) clearInterval(nowTimeInterval);
nowTimeInterval = setInterval(updateNowMarkerTime, 15000);
```

---

## BUG 3: Sleep Time Not Updating Timeline (High)

### Current Behavior
- `changeSleepTime()` (line 17290) nulls the sleep time completely, shows full setup screen
- User must re-select from TONIGHT / LATE NIGHT / CUSTOM
- TONIGHT is hardcoded to 11 PM, LATE NIGHT to 2 AM
- No way to make small adjustments (+/- 15 min)

### Root Cause
The code path actually works: `changeSleepTime()` → setup screen → `setCrashOutSleep()` → `recalculateScheduledTimes()` → `renderCrashOutMode()`.

The real issue is **UX friction**: the "change" flow is a destructive reset, not an in-place edit. If user picks the same preset, nothing visually changes.

### Fix

**Add in-place sleep time adjuster** — Replace the "Change Sleep" button (line 7468-7471) with:
```html
<div class="sleep-time-adjuster">
    <button class="btn-adjust-sleep" onclick="adjustSleepTime(-30)">-30m</button>
    <button class="btn-adjust-sleep" onclick="adjustSleepTime(-15)">-15m</button>
    <span class="current-sleep-label" id="sleepTimeLabel">11:00 PM</span>
    <button class="btn-adjust-sleep" onclick="adjustSleepTime(15)">+15m</button>
    <button class="btn-adjust-sleep" onclick="adjustSleepTime(30)">+30m</button>
    <button class="btn-change-sleep" onclick="changeSleepTime()">Reset</button>
</div>
```

**Add `adjustSleepTime()` function** — After line 17294:
```javascript
function adjustSleepTime(minutesDelta) {
    if (!commandCenterData.crashOut || !commandCenterData.crashOut.sleepTime) return;
    const currentSleep = new Date(commandCenterData.crashOut.sleepTime);
    const newSleep = new Date(currentSleep.getTime() + minutesDelta * 60 * 1000);
    if (newSleep <= new Date()) {
        showToast('Sleep time cannot be in the past', 'warning');
        return;
    }
    commandCenterData.crashOut.sleepTime = newSleep.toISOString();
    saveData();
    renderCrashOutTimeline();
    const timeStr = newSleep.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    showToast('Sleep time: ' + timeStr, 'info');
}
```

**Add CSS** (after line 6100):
```css
.sleep-time-adjuster { display: flex; align-items: center; gap: 4px; }
.btn-adjust-sleep { background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-family: 'SF Mono', Monaco, monospace; }
.btn-adjust-sleep:hover { background: #1e293b; color: #f1f5f9; }
.current-sleep-label { color: #f1f5f9; font-weight: 600; font-size: 14px; padding: 0 8px; }
```

**Update `renderCrashOutTimeline()`** — After line 17323:
```javascript
const sleepLabelEl = document.getElementById('sleepTimeLabel');
if (sleepLabelEl) sleepLabelEl.textContent = sleepTimeStr;
```

---

## BUG 4: Idle Prompt System Non-Functional (High)

### Current Behavior
- `startTimePromptChecker()` IS called on init (line 18620)
- Interval runs every 15 seconds
- `showTimePrompt()` modal HTML and CSS exist and are correct
- But prompts NEVER appear

### Root Cause

**PRIMARY: `commandCenterMode !== 'crashout'` guard blocks all prompts (line 16959)**

```javascript
if (commandCenterMode !== 'crashout') return;  // LINE 16959
```

- `commandCenterMode` defaults to `'triage'` (line 16090)
- Only becomes `'crashout'` when user clicks the Crash Out tab
- Typical flow: set schedule in Crash Out → switch to Triage/Focus to work → expect notifications
- But the guard returns early because mode is 'triage' or 'focus'

**SECONDARY: 2-minute window is too narrow (line 16984)**
```javascript
if (diff >= 0 && diff <= 120000) {  // 0 to 2 minutes after scheduled time
```
- Browser tab throttling reduces check frequency in background tabs
- If tab is hidden, browsers throttle to 1 check/min or less
- Easy to miss the entire 2-minute window

**TERTIARY: No catch-up logic for missed prompts**
- If user was away and comes back after the 2-minute window, no prompt fires
- Past-due tasks are permanently missed

### Fix

**Fix A: Remove the crashout mode guard** — Line 16959, change:
```javascript
if (commandCenterMode !== 'crashout') return;
```
To:
```javascript
// Only skip if actively in a focus session with a task
if (commandCenterMode === 'focus' && currentFocusTaskId) return;
```

**Fix B: Widen the time window** — Line 16984, change:
```javascript
if (diff >= 0 && diff <= 120000) {
```
To:
```javascript
if (diff >= -30000 && diff <= 600000) {  // 30s early warning, 10min window
```

**Fix C: Add catch-up logic** — After the main time-check loop, add:
```javascript
if (!promptShown) {
    const pastDueTasks = scheduledTasks.filter(task => {
        if (!task.crashOutTime || task.id === lastPromptedTaskId) return false;
        if (skippedTasks[task.id] === task.crashOutTime) return false;
        const taskTime = parseCrashOutTime(task.crashOutTime);
        if (!taskTime) return false;
        return (now - taskTime) > 0;
    });
    if (pastDueTasks.length > 0) {
        lastPromptedTaskId = pastDueTasks[0].id;
        showTimePrompt(pastDueTasks[0]);
    }
}
```

---

## BUG 5: UI Too Clunky (Medium)

### Current State

**Triage cards** (~34-38px per card): Already reasonably compact. Single flex row with inline actions. Padding 6px 10px, font 13px.

**Timeline cards** (~44px per task): TWO content lines (task text + duration info below). Tier badge 22x22px. Margin 6px.

**Rolled Over cards** (~60px per card): TWO-div layout — `task-card-main` and separate `task-card-actions` stacked vertically.

**Column sizing**: min-height 300px, padding 12px — wastes space with few tasks.

### Fix

**CSS Changes:**

| Line | Property | Current | New |
|------|----------|---------|-----|
| 5621 | `.triage-column` padding | `12px !important` | `8px !important` |
| 5622 | `.triage-column` min-height | `300px !important` | `180px !important` |
| 6219 | `.timeline-task` margin-bottom | `6px !important` | `4px !important` |
| 6240 | `.task-card-timeline` padding | `6px 10px !important` | `5px 8px !important` |
| 6243 | `.task-card-timeline` gap | `8px !important` | `6px !important` |
| 6256-6257 | `.task-tier-badge` width/height | `22px !important` | `18px !important` |
| 6262 | `.task-tier-badge` font-size | `11px !important` | `10px !important` |
| 6274-6277 | `.task-content` layout | block stacking | `display: flex; align-items: center; gap: 6px` |
| 6280 | `.task-content .task-text` display | `block` | `inline` + flex:1, min-width:0 |
| 6283 | `.task-content .task-text` margin-bottom | `1px` | `0` |
| 6290-6293 | `.task-duration-info` font-size | `11px` | `10px` + nowrap + flex-shrink:0 |

**HTML Change — Rolled Over cards** (lines 16348-16361): Move `.task-card-actions` inside `.task-card-main` for single-row layout.

**Impact:**
- Timeline: ~44px → ~34px per task (saves ~10px/task, 80-100px with 8-10 tasks)
- Triage columns: ~24px saved from reduced padding, lower min-height
- Rolled over: ~60px → ~34px per card

---

## Implementation Order

1. **BUG 4: Idle Prompts** (safest — single guard line change, no UI impact)
2. **BUG 1: Task Reordering** (restore buttons + try-finally protection)
3. **BUG 2: NOW Bar** (add IDs + lightweight interval)
4. **BUG 3: Sleep Time** (new adjuster UI + function)
5. **BUG 5: UI Compact** (CSS-only changes + rolled-over HTML)

---

## Test Checklist

- [ ] moveTaskUp works (swap with previous task)
- [ ] moveTaskDown works (swap with next task)
- [ ] moveTaskToTop works (restored button)
- [ ] moveTaskToBottom works (restored button)
- [ ] promptTaskPosition works (restored button)
- [ ] Drag and drop works (including 1-position moves)
- [ ] isReorderingLocked recovers from errors
- [ ] NOW bar time text updates every 15 seconds
- [ ] NOW bar repositions at task boundaries (60s rebuild)
- [ ] Changing sleep time with +/-15m/30m buttons works
- [ ] Wind-down hour updates with sleep time change
- [ ] Progress bar recalculates with sleep time change
- [ ] Reset button still shows full setup screen
- [ ] Idle prompt appears when task time arrives (in triage mode)
- [ ] Idle prompt appears when task time arrives (in crashout mode)
- [ ] +5/+10/+15 min push back works
- [ ] Push back updates ALL subsequent task times
- [ ] Start from prompt opens Focus tab and starts timer
- [ ] Dismiss prevents re-prompt for that task/time
- [ ] Past-due catch-up prompt fires on return
- [ ] Triage column min-height reduced
- [ ] Timeline task cards are single-line (~34px)
- [ ] Rolled-over cards are single-row
- [ ] All data persists after refresh
- [ ] Dark theme colors maintained
