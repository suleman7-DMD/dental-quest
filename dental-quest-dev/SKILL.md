---
name: dental-quest-dev
description: |
  Develop and debug the Dental Quest main app (index.html) — a gamified task management system for a dental student with focus mode, financial cockpit, calendar, and medication tracking.
  Use this skill when the user asks to modify, fix, or add features to index.html (the main Dental Quest app). Trigger phrases: "index.html", "main app", "task system", "focus mode", "command center", "triage", "crash out", "financial cockpit", "pill counter", "calendar", "pomodoro", "daily planner", "quick add", "full view", "focused view", "XP", "streak", "timeline", "task reorder", "locked in".
  Do NOT use this skill for d3-roadmap.html, body-comp-tracker.html, stimulant-elimination-calculator.html, or lecture-prompt-transformer.html — those are separate apps with their own skills.
globs: ["index.html"]
compatibility: Claude Code CLI. Requires file system access (Read, Edit, Write, Grep, Glob, Bash).
metadata:
  author: suleman7-DMD
  version: "1.2"
  file: index.html
  lines: "~22700"
  last-updated: "2026-02-13"
---

# Dental Quest Main App (index.html)

Single-file HTML app (~22,700 lines) with no build system. CSS (lines 1-10580), HTML structure (10582-11948), and JavaScript (11949-22610) are all in one file. Hosted at `https://suleman7-dmd.github.io/dental-quest/`.

## Instructions

### Step 1: Identify the target area
Read the File Layout table below to find which line range contains the code you need. The file has clear sections — don't read the whole thing.

### Step 2: Read before editing
Always read the target function and 20-50 lines of surrounding context before making changes. Use `references/function-map.md` to find exact line numbers.

### Step 3: Make surgical edits
Use the Edit tool for targeted changes. Never rewrite large sections. Preserve existing patterns — check `references/known-bugs-and-fixes.md` to avoid re-introducing fixed bugs.

### Step 4: Verify all creation paths
If modifying task fields, check ALL 4 creation sites: `addTask()` (18265), `triageQuickAddTask()` (20176), `quickAddFromFocus()` (19343), `submitQuickAdd()` (22572).

### Step 5: Ensure persistence
Every state mutation must call `saveData()` (line 12902). Every UI change must call the appropriate render function. Consult `references/debugging-guide.md` if saves aren't working.

### Step 6: Validate brace balance
After large edits, verify brace/paren balance with: `python3 -c "c=open('index.html').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

## Performance Notes
- Take your time reading surrounding code before editing — understanding context prevents regressions
- Quality is more important than speed — a broken save guard can wipe all user data
- Do not skip checking all 4 task creation paths when modifying task structure
- Always verify `saveData()` is called after mutations

## Critical Rules

### Never Rebuild the File
The file is 22,705 lines. Always use surgical edits. Read the target section first, then make minimal changes.

### Firebase Sync Guards — DO NOT MODIFY
`saveData()` at line 12902 has 4 guards that prevent data wipes on fresh devices. These must never be removed or weakened:

1. `!pinValidated` — don't save before PIN validation
2. `!initialLoadComplete` — don't save during initial load
3. `!hasLoadedFromCloud` — don't save before cloud data arrives
4. `isEmptyState(data)` — don't save empty state to Firebase

The sync flags are declared at lines 11970-11972:
```
let initialLoadComplete = false;  // line 11970
let hasLoadedFromCloud = false;   // line 11971
let pinValidated = false;         // line 11972
```

See [references/app-architecture.md](references/app-architecture.md) for full Firebase config and sync patterns.

### Date Parsing
Always parse dates in local timezone to avoid off-by-one errors:
```javascript
// WRONG
const date = new Date('2026-02-02');
// CORRECT
const [y, m, d] = '2026-02-02'.split('-').map(Number);
const date = new Date(y, m - 1, d);
```

### Empty Array Truthy Bug
```javascript
// WRONG — [] is truthy
const foods = loadedFoods || defaults;
// CORRECT
const foods = loadedFoods?.length > 0 ? loadedFoods : defaults;
```

## Core Concept: The Task Pipeline

Tasks flow through a pipeline from creation to completion:

```
Full View (category lists) → "Do Today" flag → Focused View Triage
    → Tier assignment (Locked In / Today / Tomorrow)
    → Crash Out scheduling (time-blocked)
    → Focus session (pomodoro timer)
    → Completion (XP awarded)
```

Tasks live in `let tasks = {}` (line 12038) — an object keyed by generated IDs (not an array) for Firebase safety.

See [references/task-data-model.md](references/task-data-model.md) for complete task field reference.

## Two Main Views

### Full View (`currentView = 'full'`)
Traditional task list organized by 7 categories: `financial`, `clinic`, `health`, `school`, `academic`, `future`, `life`. Plus a special `dotoday` filter that shows tasks with `doToday: true`.

Switch functions: `switchToFullView()` (line 18937), `switchToFocusMode()` (line 18926).

### Focused View (`currentView = 'focus'`)
The Command Center — a 3-tab system controlled by `commandCenterMode` (line 19519). Values: `'triage'`, `'crashout'`, `'focus'`.

Switch tabs with `switchCommandCenterMode(mode)` (line 19555). Each tab renders via `renderFocusMode()` (line 18949) which dispatches to the active tab's renderer.

## Focused View: Three Tabs

### 1. Triage Tab
Categorize today's tasks into priority tiers. Tasks with `doToday: true` appear here.

**Tiers:**
- **Locked In** — must complete today (highest priority)
- **Today** — should complete today (default tier)
- **Tomorrow** — can wait until tomorrow
- **Scheduled** — sent to Crash Out timeline
- **Rolled Over** — incomplete Locked In tasks from yesterday

Key functions: `renderTriageMode()` (19687), `getTasksByTier(tier)` (19667), `setTaskTier(taskId, tier)` (20032).

### 2. Crash Out Tab
Time-block scheduled tasks into a visual timeline anchored to a sleep time.

Key functions: `renderCrashOutMode()` (20703), `sendToCrashOut(taskId)` (20057), `removeFromCrashOut(taskId)` (20137), `recalculateScheduledTimes()` (20117), `renderCrashOutTimeline()` (20830).

### 3. Focus Tab (Pomodoro)
Work on one task at a time with a configurable pomodoro timer.

Key functions: `renderFocusPomodoroMode()` (21686), `startTaskInFocus(taskId)` (21704), `pauseFocusTimer()` (21846), `resumeFocusTimer()` (21857), `completeFocusTask()` (21961).

See [references/focused-view-system.md](references/focused-view-system.md) for detailed behavior, state transitions, and drag-drop reordering.

## Key Patterns

### Modifying Tasks
Always use spread operator to preserve existing fields:
```javascript
tasks[taskId] = { ...task, newField: value };
```
Then call `renderFocusMode()` or `renderTasks()` and `saveData()`.

### Task Tier Transitions
`setTaskTier(taskId, tier)` (line 20032) handles moving between tiers. When sending to Crash Out, use `sendToCrashOut(taskId)` which sets `crashOutScheduled`, `crashOutTime`, `crashOutDuration`, and `crashOutOrder`.

### Crash Out Ordering
The timeline uses `crashOutOrder` for sequencing and `crashOutTime` for display. After reordering, call `recalculateScheduledTimes()` to update all times. Drag-drop uses INSERT logic; up/down buttons use SWAP logic via `swapAdjacentTasks()`.

The reordering lock (`isReorderingLocked`, line 21145) prevents rapid double-moves with a 200ms cooldown.

### Rollover Logic
`checkAndProcessRollovers()` (line 22226) runs once per day. Incomplete Locked In tasks from previous days get `rolledOver: { fromDate, wasTier }` and are moved to the Today tier.

### Gamification
`awardCommandCenterXP(amount, reason)` (line 22105) adds XP to both `commandCenterData.focusStats.totalXP` and `stats.totalXPGained`. Levels = 500 XP each. Perfect Day (all tasks done, 3+ tasks) awards 200 XP.

See [references/gamification-system.md](references/gamification-system.md) for XP values and streak logic.

## State Variables Quick Reference

| Variable | Line | Type | Purpose |
|----------|------|------|---------|
| `tasks` | 12038 | Object | All tasks, keyed by ID |
| `currentView` | 12047 | String | `'focus'` or `'full'` |
| `currentCategory` | 12037 | String | Active category filter in Full View |
| `commandCenterMode` | 19519 | String | `'triage'`, `'crashout'`, or `'focus'` |
| `commandCenterData` | 12060 | Object | Crash Out config, focus stats, current session |
| `focusModeData` | 12048 | Object | One Thing ID, micro steps, today's tasks |
| `stats` | 12084 | Object | XP totals, task counts, per-category XP |
| `medications` | 12098 | Object | Pill counts, refill dates, dose logs |
| `financials` | 12131 | Object | Cash, bills, expenses, projections |
| `calendarNotes` | 12117 | Object | Date-keyed note strings |
| `calendarEvents` | 12122 | Object | ID-keyed calendar events |
| `notebook` | 12125 | Object | Pages (keyed by ID), current page |
| `dailyPlanner` | — | Object | Daily planner entries |

## Task Fields Quick Reference

| Field | Set At | Values | Purpose |
|-------|--------|--------|---------|
| `id` | creation | `task_*` | Unique identifier |
| `text` | creation | string | Task description |
| `category` | creation | 7 categories | Organization bucket |
| `completed` | toggle | boolean | Done state |
| `doToday` | toggle | boolean | Appears in Focused View |
| `createdAt` | creation | ISO string | Creation timestamp |
| `size` | creation/edit | `small`/`medium`/`big` | Duration estimate (15/30/60 min) |
| `highLeverage` | creation/edit | boolean | Priority flag |
| `sortOrder` | creation | number | Position in category list |
| `completedAt` | toggle | timestamp/null | When completed |
| `triageTier` | triage | `lockedIn`/`today`/`tomorrow` | Priority tier |
| `triageOrder` | triage | number | Position within tier |
| `triageDate` | triage | date string | When tier was assigned |
| `crashOutScheduled` | schedule | boolean | In Crash Out timeline |
| `crashOutTime` | schedule | time string | Scheduled start time |
| `crashOutDuration` | schedule | number (min) | Based on size |
| `crashOutOrder` | schedule | number | Timeline sequence |
| `rolledOver` | rollover | `{ fromDate, wasTier }` | Carried from previous day |
| `xp` | completion | number | XP value (default 20) |

## File Layout (Line Ranges)

| Range | Content |
|-------|---------|
| 1-10580 | CSS styles |
| 10582-11948 | HTML structure, modals |
| 11949-12032 | Firebase config, sync flags, `isEmptyState()` |
| 12034-12454 | App variables (tasks, stats, medications, financials, etc.) |
| 12455-12900 | Data integrity, backup utilities |
| 12901-13849 | `saveData()`, checkpoint system |
| 13850-14140 | Firebase load/sync functions |
| 14141-14737 | Initialization, PIN validation |
| 14738-15940 | Financial Cockpit, Help modal |
| 15941-17907 | Calendar, Daily Planner |
| 17908-18921 | Interactive Calendar, task rendering |
| 18922-19513 | Focus Mode switching, planning |
| 19514-19684 | Command Center core, tab switching |
| 19685-20672 | Triage Mode (tiers, drag-drop between columns) |
| 20673-21142 | Crash Out Mode (timeline, scheduling) |
| 21143-21680 | Timeline drag-drop reordering |
| 21681-22102 | Focus/Pomodoro (timer, sessions) |
| 22103-22223 | Gamification (XP, levels, streaks) |
| 22224-22346 | Rollover logic, streaks |
| 22347-22610 | Quick Add FAB, header, state persistence |

## Use Cases and Success Criteria

| Use Case | Trigger | Success Criteria |
|----------|---------|-----------------|
| Fix a bug | "crash out isn't working", "tasks disappear" | Bug identified via reference files, surgical fix applied, `saveData()` called, brace balance verified |
| Add a feature | "add priority field", "new button in triage" | All 4 task creation paths updated (if applicable), renders correctly, data persists across refresh |
| Debug save failures | "data not saving", "sync broken" | Sync guards verified intact, root cause identified using debugging-guide.md, fix preserves all 4 guards |
| Modify UI/CSS | "change the color", "fix mobile layout" | Correct CSS section identified via ui-patterns.md, iOS Safari flex bug avoided, responsive breakpoints respected |
| Understand code flow | "how does crash out work", "explain triage" | Accurate answer referencing correct functions and line numbers from function-map.md |

## Examples

### Example 1: Fix a broken feature
User says: "The crash out timeline isn't showing tasks"
Actions:
1. Read `renderCrashOutTimeline()` at line 20830
2. Check if `getTasksByTier('scheduled')` returns tasks (line 19667)
3. Verify `crashOutScheduled` is being set in `sendToCrashOut()` (line 20057)
4. Check that `recalculateScheduledTimes()` (line 20117) is called after scheduling
Result: Identify the broken link in the chain and fix it surgically

### Example 2: Add a new task field
User says: "Add a priority field to tasks"
Actions:
1. Read task creation in `addTask()` at line 18265 — add default value
2. Read other creation sites: `triageQuickAddTask()` (20176), `quickAddFromFocus()` (19343), `submitQuickAdd()` (22572) — add to all
3. Update `renderTasks()` (18339) and `renderTaskCard()` (19741) to display it
4. Verify `saveData()` is called after changes
Result: Field persists across all creation paths and renders correctly

### Example 3: Debug save failures
User says: "Changes aren't saving to Firebase"
Actions:
1. Check sync guard status — see `references/debugging-guide.md`
2. Verify `pinValidated` (11972), `initialLoadComplete` (11970), `hasLoadedFromCloud` (11971) are all true
3. Check `saveData()` at line 12902 isn't hitting a guard
4. Look for console errors from Firebase
Result: Identify which guard is blocking and trace why

## Troubleshooting

### Error: Tasks disappear after refresh
Cause: `saveData()` not called after task mutation
Solution: Ensure every function that modifies `tasks` calls `saveData()` before returning. Check `references/known-bugs-and-fixes.md`.

### Error: Crash Out reorder doesn't work
Cause: `isReorderingLocked` stuck at `true` (line 21145)
Solution: All reorder functions must use `try/finally` with `setTimeout(() => { isReorderingLocked = false; }, 200)`. Check if the lock is releasing.

### Error: Time prompts never appear
Cause: `checkForTimePrompts()` (line 20437) runs on 15-second interval. May not trigger if `parseCrashOutTime()` fails or task time format is wrong.
Solution: Verify task `crashOutTime` is in "H:MM AM/PM" format. Check `startTimePromptChecker()` (line 20432) was called during init.

### Error: XP not awarding
Cause: `awardCommandCenterXP()` (line 22105) not being called in completion path
Solution: Trace the completion function — `completeTriageTask()` (19975) or `completeFocusTask()` (21961) — and verify they call the XP function.

### Error: Data wiped on new device
Cause: Sync guards missing or bypassed — `saveData()` overwrote cloud with empty local state
Solution: NEVER modify the 4 guards in `saveData()`. Check that `_version: 0` in defaults, not `Date.now()`.

## Reference Files

- [references/app-architecture.md](references/app-architecture.md) — Firebase config, sync pattern, data structure, `saveData()` guards
- [references/task-data-model.md](references/task-data-model.md) — Complete task object spec, categories, creation/mutation patterns
- [references/focused-view-system.md](references/focused-view-system.md) — Triage tiers, Crash Out timeline, Focus pomodoro, drag-drop, state transitions
- [references/gamification-system.md](references/gamification-system.md) — XP awards, levels, streaks, Perfect Day, rollover
- [references/ui-patterns.md](references/ui-patterns.md) — iOS Safari flex bug workaround, mobile layout, toast system, modals
- [references/function-map.md](references/function-map.md) — Complete function index with line numbers and signatures
- [references/known-bugs-and-fixes.md](references/known-bugs-and-fixes.md) — Historical bugs and their fixes (crash out ordering, pill counter, etc.)
- [references/debugging-guide.md](references/debugging-guide.md) — Common issues, sync debugging, guard status logging
