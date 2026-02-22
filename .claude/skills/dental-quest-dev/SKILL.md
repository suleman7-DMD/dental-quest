---
name: dental-quest-dev
description: |
  Develop and debug the Dental Quest main app (index.html + 12 JS modules) — a gamified task management system for a dental student with focus mode, financial cockpit, calendar, and medication tracking.
  Use this skill when the user asks to modify, fix, or add features to the main Dental Quest app. Trigger phrases: "index.html", "main app", "task system", "focus mode", "command center", "triage", "crash out", "financial cockpit", "pill counter", "calendar", "pomodoro", "daily planner", "quick add", "full view", "focused view", "XP", "streak", "timeline", "task reorder", "locked in".
  Do NOT use this skill for d3-roadmap.html, body-comp-tracker.html, stimulant-elimination-calculator.html, or lecture-prompt-transformer.html — those are separate apps with their own skills.
globs: ["index.html", "js/dental-quest/*.js"]
compatibility: Claude Code CLI. Requires file system access (Read, Edit, Write, Grep, Glob, Bash).
metadata:
  author: suleman7-DMD
  version: "2.0"
  file: "index.html + js/dental-quest/*.js"
  lines: "~12,186 HTML + ~10,762 JS (12 modules)"
  last-updated: "2026-02-20"
---

# Dental Quest Main App (index.html + 12 JS Modules)

Multi-file app split from a 22,900-line monolith (Feb 2026). CSS + HTML in index.html (~12,186 lines, zero inline JS). JavaScript in 12 modules under `js/dental-quest/`. No build system. Hosted at `https://suleman7-dmd.github.io/dental-quest/`.

## Instructions

### Step 1: Identify the target module
Read the Module Map below to find which JS file contains the code you need. Each module has a focused responsibility.

### Step 2: Read before editing
Always read the target function and 20-50 lines of surrounding context before making changes.

### Step 3: Make surgical edits
Use the Edit tool for targeted changes. Never rewrite large sections. Preserve existing patterns.

### Step 4: Verify all creation paths
If modifying task fields, check ALL 4 creation sites: `addTask()` (tasks.js), `triageQuickAddTask()` (triage.js), `quickAddFromFocus()` (tasks.js), `submitQuickAdd()` (init.js).

### Step 5: Ensure persistence
Every state mutation must call `saveData()` (firebase-sync.js). Every UI change must call the appropriate render function.

### Step 6: Validate syntax
After edits, verify: `node -c js/dental-quest/FILENAME.js` and brace balance: `python3 -c "c=open('js/dental-quest/FILENAME.js').read(); print(c.count('{'), c.count('}'))"`

## Architecture: 12 JS Modules

### Script Loading Order (ORDER MATTERS — dependencies flow downward)
```
state → firebase-sync → medications → financials → calendar → daily-planner → notebook → tasks → triage → crash-out → focus-pomodoro → init
```

### Module Map
| Module | Lines | Key Functions | Purpose |
|--------|-------|--------------|---------|
| `state.js` | 1,076 | generateId, getValues, getCount, escapeHtml, isEmptyState, hasRealData, deepMerge, safeLocalStorageSet, all global vars | Globals, defaults, utilities |
| `firebase-sync.js` | 1,922 | saveData (5 guards), saveDataImmediate (5 guards), buildSaveData, loadData, loadDataFromFirebase, initializeFirebase, createCheckpoint, forceUploadToCloud | Save/load, Firebase sync, checkpoints |
| `medications.js` | 337 | updateMedicationDisplay, updateMedCard, takeMed, takeBothMeds, adjustMed, checkAndApplyDailyPillReduce, saveMedSettings | Pill tracking, med settings |
| `financials.js` | 1,180 | openFinancials, renderFinancialCockpit, renderMasterLiquidity, renderOneTimeBills, renderMonthlyExpenses, renderCreditCards, renderActionItems | Financial Cockpit (7 renderers) |
| `calendar.js` | 768 | generateCalendar, renderCountdowns, addCalendarEvent | Master calendar, countdowns |
| `daily-planner.js` | 674 | checkCriticalEODReset, checkPlannerReset, renderDailyPlanner | Daily planner, EOD reset |
| `notebook.js` | 252 | renderNotebook, addNotebookPage, deleteNotebookPage | Multi-page notebook CRUD |
| `tasks.js` | 1,599 | addTask, renderTasks, updateStats, updateCategoryDisplay, switchToFocusMode, switchToFullView, renderFocusMode, initFocusMode, switchCommandCenterMode, getTodayTriageTasks, openTaskEditModal | Task CRUD, Command Center core, focus planning |
| `triage.js` | 770 | renderTriageMode, setTaskTier, getTasksByTier, triageQuickAddTask, completeTriageTask | Triage tiers, drag-drop |
| `crash-out.js` | 1,224 | renderCrashOutMode, sendToCrashOut, recalculateScheduledTimes, renderCrashOutTimeline, startTimePromptChecker | Crash Out timeline, reordering |
| `focus-pomodoro.js` | 720 | renderFocusPomodoroMode, startTaskInFocus, awardCommandCenterXP, updateStreaks, checkAndProcessRollovers, checkForPerfectDay, showCelebration | Pomodoro timer, gamification |
| `init.js` | 237 | initApp, submitQuickAdd, openQuickAddPanel, updateCompactHeader, showHelp | Bootstrap, Quick Add FAB, header |

### Cross-Module Dependencies (CRITICAL)
- All functions use `function` declarations → automatically global (no `window.X` needed for most)
- crash-out.js has 32 explicit `window.X` bindings, focus-pomodoro.js has 23 — for onclick in dynamic HTML
- **NEVER add auto-executing code to any module except init.js** — modules 1-11 load before init.js and cannot call functions from later modules at parse time
- Firebase initialization runs from `initApp()` in init.js (after DOMContentLoaded)
- Use `typeof funcName === 'function'` guards when calling functions from later-loaded modules inside functions that might run during init

### Bootstrap Sequence (init.js)
```
DOMContentLoaded → initApp() →
  initializeFirebase() → loadDataFromFirebase() (async .then callback) →
    updateStats(), renderTasks(), initFocusMode(), etc.
  updateCategoryDisplay()  (immediate, for initial render)
  10-second failsafe (force-show UI if Firebase hangs)
  Category tab listeners, escape handler, Quick Add init
```

## Critical Rules

### Firebase Sync Guards — DO NOT MODIFY
`saveData()` and `saveDataImmediate()` in firebase-sync.js each have 5 guards behind `firebaseInitialized`:

1. `!pinValidated` — don't save before PIN validation
2. `!initialLoadComplete` — don't save during initial load
3. `!hasLoadedFromCloud` — don't save before cloud data arrives
4. `!_dataLoaded` — don't save before data is loaded
5. `isEmptyState(data)` — don't save empty state to Firebase

Both functions use `buildSaveData()` shared helper to ensure data consistency (especially `commandCenterData`).

### CRITICAL: Flags Before Rendering Pattern
In `loadDataFromFirebase()`, sync flags (`hasLoadedFromCloud`, `_dataLoaded`, `markInitialLoadComplete()`) are set BEFORE rendering calls. Post-load rendering is wrapped in try/catch. This prevents a rendering error from permanently blocking all saves. **Never move flag-setting to after rendering calls.**

### Date Parsing
Always parse dates in local timezone to avoid off-by-one errors:
```javascript
// WRONG: new Date('2026-02-02')
// CORRECT:
const [y, m, d] = '2026-02-02'.split('-').map(Number);
const date = new Date(y, m - 1, d);
```

### No Auto-Execution in Modules
Modules 1-11 (state.js through focus-pomodoro.js) must NOT have top-level auto-executing code that calls functions from other modules. Only init.js may trigger initialization (via `initApp()` on DOMContentLoaded).

Event listeners on `window` (online/offline/beforeunload/visibilitychange) are OK in firebase-sync.js since they fire at runtime.

## Core Concept: The Task Pipeline

```
Full View (category lists) → "Do Today" flag → Focused View Triage
    → Tier assignment (Locked In / Today / Tomorrow)
    → Crash Out scheduling (time-blocked)
    → Focus session (pomodoro timer)
    → Completion (XP awarded)
```

Tasks live in `var tasks = {}` (state.js) — an object keyed by generated IDs (not an array) for Firebase safety.

## Two Main Views

### Full View (`currentView = 'full'`)
Traditional task list organized by 7 categories. Switch: `switchToFullView()` (tasks.js).

### Focused View (`currentView = 'focus'`)
The Command Center — 3-tab system. Switch: `switchToFocusMode()` (tasks.js). Tab switching: `switchCommandCenterMode(mode)` (tasks.js).

## Focused View: Three Tabs

### 1. Triage Tab (triage.js)
Categorize today's tasks into priority tiers (Locked In / Today / Tomorrow / Scheduled / Rolled Over).

### 2. Crash Out Tab (crash-out.js)
Time-block scheduled tasks into a visual timeline anchored to a sleep time.

### 3. Focus Tab (focus-pomodoro.js)
Work on one task at a time with a configurable pomodoro timer. XP and streaks.

## index.html File Layout (~12,186 lines)
| Range | Content |
|-------|---------|
| 1-10,749 | CSS styles |
| 10,751-12,121 | HTML body (structure, modals, tabs) |
| 12,122-12,133 | Script tags (12 module src tags) |
| 12,135-12,186 | Quick Add FAB HTML + closing tags |

## UI Redesign Plan (PLANNED — Feb 2026)

Full redesign from dark purple gaming aesthetic to warm cream/olive Synchro-style interface.

**Plan files** (read before any redesign work):
- `REDESIGN-PLAN.md` — design system, 11 phases, token architecture, icon mapping, component patterns
- `REDESIGN-EXECUTION.md` — git branch strategy, per-session prompts, emergency recovery
- `REDESIGN-PROMPT.md` — copy-paste execution prompt for deploying agent team

**Design reference**: `interface-design/` (cloned from Dammyjay93/interface-design) — design principles, craft foundations, system templates

**Key decisions**:
- Direction: Clinical Warmth (warm productivity tool, not dark gaming aesthetic)
- Canvas: #FAF8F5 (warm cream), Surface: #FFFFFF (white cards)
- Accent: #6B7C5E (olive/sage green)
- Fonts: Source Serif 4 (headings) + Inter (body)
- Emoji: ALL removed → Lucide icons or plain text
- Depth: Subtle shadows + surface color shifts (not borders-only, not layered)
- Density: Full View stays dense, Focus View goes minimal
- Execution: 11 phases, git branch `redesign/warm-clinical`, commit per phase

**Work happens on branch `redesign/warm-clinical`** — main is untouched until merge.

## Post-Split Notes (Feb 2026)

### Function Redistribution
tasks.js absorbed 79 functions (planned 35) — includes Command Center core functions originally planned for triage.js and init.js. This was correct since `renderFocusMode()` (the 26-caller entanglement point) is tightly coupled with task management.

Gamification functions (`awardCommandCenterXP`, `updateStreaks`, `checkForPerfectDay`, `checkAndProcessRollovers`) are in focus-pomodoro.js (not init.js as planned) since they're primarily triggered by session completion.

### Monkey-Patch Elimination
5 monkey-patches from the monolith were properly baked into target functions:
- `updateStats()` → calls `updateCompactHeader()` directly (tasks.js)
- `updateSyncStatus()` → calls `updateSyncDot()` with typeof guard (firebase-sync.js)
- `switchToFocusMode()`/`switchToFullView()` → compact header buttons built in (tasks.js)
- `updateStreakBadge()` → calls `updateCompactHeader()` with typeof guard (focus-pomodoro.js)
