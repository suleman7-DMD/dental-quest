# EXECUTE: Split index.html (Dental Quest) into Separate JS Files

> **TRIGGER**: When Sully says "execute index split plan", follow this document phase by phase.
> **Skill**: Load `dental-quest-dev` skill for context. Read this file fully before starting.
> **Approach**: Use a multi-agent team — one agent per phase, with verification between phases.
> **Reference**: This plan follows the same proven pattern as SPLIT-PLAN-V2.md (stim calc split, executed successfully Feb 2026).

---

## LINE NUMBER DISCLAIMER

All line numbers in this document are **approximate** — measured against index.html as of Feb 20, 2026 (~22,900 lines). Line numbers may drift ±20 lines due to edits between now and execution. Always use function/variable names + context to locate code, not raw line numbers alone.

---

## DANGER ASSESSMENT — READ THIS FIRST

### Why This Is Extremely High-Risk
This is the largest app in the ecosystem at ~22,900 lines — nearly double the stim calc monolith. You are performing open-heart surgery on a live app while simultaneously:
- **Splitting ~10,750 lines of tightly coupled JS** into 12 interdependent modules
- **Fixing 14 bugs** that have never been tested in combination
- **Touching the Firebase save guard system** — 4 guards (should be 5), `saveDataImmediate()` has ONLY 1 GUARD, 3 duplicated merge locations. One wrong guard = silent data wipe across all devices.
- **87 `saveData()` call sites** across 10 feature domains. If it breaks, nothing persists.
- **index.html has MORE top-level state variables than any other app** — `tasks`, `stats`, `medications`, `financials`, `calendarNotes`, `calendarEvents`, `notebook`, `dailyPlanner`, `focusModeData`, `commandCenterData`, `pillAssignments`, `lastCriticalEODReset`. A function extracted to the wrong file or loaded in the wrong order = undefined errors cascading through the entire app.
- **~365 functions** across 10 feature domains. Many use inline `onclick` handlers that require `window.` global access.
- **TWO separate `<script>` blocks** — main block (lines 11949-22695) and Quick Add/Header block (lines 22747-22893+). The second block monkey-patches functions from the first block.
- **`renderFocusMode()` has 26 callers** across 6+ functional areas — the #1 entanglement point.

### What Can Go Catastrophically Wrong
| Failure Mode | Consequence | Likelihood |
|-------------|-------------|------------|
| Save guard missing after extraction | **All user data silently wiped** on next page load | Medium (Phase 2) |
| `saveDataImmediate()` not fixed (has only 1 guard) | Bypass all sync protection, data wipe via checkpoint/force-save | **HIGH** (Phase 2) |
| `isEmptyState()` not fixed during extraction | Notebook-only data treated as empty, triggers wipe | Medium (Phase 2) |
| Script loading order wrong | `undefined is not a function` errors on every feature | Medium (any phase) |
| Visibility handler not moved to firebase-sync.js | Tab switch causes data loss (inline save path broken) | Medium (Phase 2) |
| Function extracted but not deleted from inline script | Duplicate definitions cause silent wrong behavior | Low (any phase) |
| `saveData()` debounce broken | Data saved before guards are set, wipes cloud | High (Phase 2) |
| Crash Out timeline reorder functions lose `window.` binding | All reorder buttons silently fail | Medium (Phase 6) |
| Focus timer interval lost during extraction | Timer stops updating, session data lost | Medium (Phase 6) |
| Quick Add FAB handler broken | Mobile users can't create tasks | Low (Phase 7) |
| Monkey-patch hooks not integrated cleanly | Compact header, sync dot, view toggle all break | Medium (Phase 7) |
| State initialized as `null` instead of defaults | **Entire app dead** — learned from stim calc split | Low (Phase 1) |

### Mandatory Safety Protocol
1. **NEVER skip Pre-Flight** — checkpoint + git branch are your lifeline
2. **NEVER combine phases** — each phase gets its own commit, its own test, its own verification
3. **NEVER push to main until ALL phases pass** — work on `split-index-html` branch only
4. **After Phase 2 (Firebase)**: Run the FULL Firebase test sequence. If ANY step fails, STOP and revert.
5. **After Phase 7 (init.js)**: Run the FULL 40+ item verification. If ANY step fails, STOP and revert.
6. **If anything feels wrong**: `git checkout main` — you're back to the working app instantly
7. **The original file is always preserved in git history** — you can never permanently lose it
8. **State vars must be initialized with defaults, NEVER `null`** — lesson from stim calc split (state.js:8 caused NPE crash)

---

## CATASTROPHIC FAILURE RECOVERY

### Tier 1: Phase-Level Rollback (90% of problems)
```bash
# If current phase broke something, revert to last good phase:
git log --oneline  # Find the last phase commit
git reset --hard <commit-hash>  # Revert to that commit
# Continue from that phase
```

### Tier 2: Branch Abandon (if multiple phases are tangled)
```bash
# Abandon the entire split attempt, go back to working app:
git checkout main
git branch -D split-index-html  # Delete the broken branch
# App is exactly as it was before. Zero damage.
```

### Tier 3: Checkpoint Restore (if somehow main got corrupted)
```
1. Open the app in browser
2. Click the checkpoint manager button (top right)
3. Find "Pre-split checkpoint" (created during Pre-Flight)
4. Click "Restore" — app data is back to pre-split state
```

### Tier 4: Git History Nuclear Recovery (absolute last resort)
```bash
git log --oneline | grep "Pre-split"
git checkout <that-hash> -- index.html
git add index.html
git commit -m "Restore original single-file app from pre-split"
rm -rf js/dental-quest/
git add -A && git commit -m "Remove failed split files"
git push origin main
```

### What Is NEVER At Risk
- **Firebase cloud data**: The split changes CODE, not DATA. Same state shape, same paths, same PIN.
- **Other apps**: d3-roadmap.html, stimulant-elimination-calculator.html, body-comp-tracker.html are completely separate files.
- **Git history**: Every version of every file is permanently preserved.

---

## WHAT'S BROKEN AND WHY THIS SPLIT FIXES IT

### The Problem (Why the App Has Recurring Bugs)

1. **`saveDataImmediate()` has ONLY 1 GUARD** — Line 13300 checks `!firebaseInitialized || !initialLoadComplete` and falls through to `saveData()`. But when Firebase IS initialized, it bypasses ALL protection: no `pinValidated`, no `hasLoadedFromCloud`, no `isEmptyState()` check. Any code calling `saveDataImmediate()` (checkpoints, force-save) can wipe data. The other 3 apps all have 5 identical guards in BOTH save functions.

2. **`saveDataImmediate()` saves WRONG data** — Missing `commandCenterData` entirely (line 13305-13317). Saves raw `focusModeData` instead of the selective version that `saveData()` carefully constructs (lines 13146-13164). A force-save drops all crash-out, focus stats, and current session data.

3. **Missing 5th save guard (`_dataLoaded`)** — `saveData()` has 4 guards while the other 3 apps all have 5. The `_dataLoaded` check prevents saving before cloud data is fully merged.

4. **`_version` and `_dataLoaded` fields DON'T EXIST** — The other 3 apps all track `_version: 0` in their default state. index.html has neither field.

5. **`isEmptyState()` has a bug** — Line 12159 checks `data.notebook?.entries` but the actual field is `data.notebook?.pages`. The notebook is NEVER counted as "real data", meaning a user with only notebook data could trigger a data wipe.

6. **Focus timer saves every 1 second** — `startFocusTimer()` (line 22048) calls `saveData()` every 1000ms during active sessions. Even with 200ms debounce, this is 1 Firebase write every ~1.2 seconds for the entire session duration. Should batch to every 10 seconds.

7. **3 duplicated merge locations + 1 canonical** — Visibility handler (~155 lines, 14390-14544) duplicates merge logic from `loadDataFromFirebase()` and `setupMainDataRealtimeSync()`. `applyRemoteData()` exists at line 17469 (94 lines) but is only used by force sync. ~425 lines of merge logic → should be ~100.

8. **87 `saveData()` call sites** across the entire codebase — if the save function breaks, every feature silently loses persistence.

9. **`renderCrashOutTimelineTasks()` is a 180-line god function** — Handles grid rendering, task block positioning, NOW marker, wind-down zone, elapsed dimming, and reorder buttons all in one function. Any bug fix risks regressions.

10. **22,900 lines is unmaintainable** — Claude Code cannot reliably hold full context. Every fix attempt risks regressions because the AI can't see all the interconnected pieces.

11. **Two separate `<script>` blocks with monkey-patching** — The second script block (lines 22747-22893+) wraps `updateStats`, `updateSyncStatus`, `switchToFocusMode`, and `switchToFullView` with monkey-patches. This pattern is fragile and order-dependent.

12. **Pill calendar re-initialization** — `generateCalendar()` re-initializes all pill assignments on every render when `hasCustomAssignments` is false, potentially losing user customizations.

### How the Split Fixes It
- **Each module is small enough for Claude Code to fully understand** (~300-1,200 lines vs 10,750)
- **Bugs are fixed during extraction** — save guard gaps, isEmptyState, timer frequency, data object mismatch
- **`saveDataImmediate()` gets full 5 guards** matching `saveData()` — plus correct data object
- **Merge logic consolidated** into single `applyRemoteData()` call
- **Monkey-patching eliminated** — compact header/sync dot updates integrated directly into functions
- **Constants centralized** at module top

### What Does NOT Change
- Firebase data structure — identical paths, identical state shape
- PIN auth — same hash, same guards (plus the new 5th guard)
- GitHub Pages deployment — push to main → live in ~30s
- User experience — app looks and behaves identically (but more reliable)
- CSS — stays in the HTML file (too many cross-dependencies to extract)

---

## WHAT SHOULD IMPROVE AFTER SPLIT COMPLETES

### 1. No More Silent Data Wipe Risk from Force-Save
Currently `saveDataImmediate()` has 1 guard instead of 5, and its data object is MISSING `commandCenterData`. Every force-save, checkpoint create, and critical operation that uses it is a data wipe risk. **After the fix**, both save functions have identical 5 guards and identical data objects. The most dangerous code path in the app becomes as safe as the normal one.

### 2. Notebook Data Actually Protected
The `isEmptyState()` bug means notebook-only data (pages, notes) is never counted as "real data". If a user's only content is notebook entries, the app thinks the state is empty and allows an overwrite. **After the fix**, `.pages` is checked instead of `.entries`, and notebook data properly blocks wipes.

### 3. Firebase Writes Drop 10x During Focus Sessions
Currently the focus timer triggers `saveData()` every 1 second — that's potentially 1,500 Firebase writes in a 25-minute pomodoro. **After the fix**, timer state saves every 10 seconds (150 writes instead of 1,500). Still responsive enough that no data is lost on crash, but 10x fewer writes.

### 4. Sync Bugs Become One-Fix-Fits-All
The 3 duplicated merge blocks plus 1 canonical `applyRemoteData()` are consolidated into ONE function called from all 4 locations. When a sync edge case is found, you fix it ONCE and it works for initial load, realtime sync, tab refocus, AND force pull.

### 5. Compact Header Updates Are Reliable
Currently the compact header sync dot, streak badge, and view toggle depend on fragile monkey-patching (`_origUpdateStats`, `_origUpdateSyncStatus`, etc.). If the original function isn't defined when the second script block runs, the hooks silently fail. **After the split**, these are direct function calls in the appropriate modules — no monkey-patching, no ordering fragility.

### 6. Future Debugging Actually Works
When something breaks after the split, Claude Code reads a 300-1,200 line file instead of hunting through 10,750 lines. No more "fixed one bug, introduced three others" regressions. Each module has clear boundaries. Features like the multi-round pomodoro system become feasible additions instead of risky surgery.

### 7. Version Tracking Prevents Fresh-Browser Overwrites
With `_version: 0` in defaults and `_dataLoaded: false`, a fresh browser session can't overwrite cloud data with empty defaults — the same protection that the other 3 apps have had since Jan 2026.

### The Honest Assessment
The split doesn't add new features or change the UI. The app looks and works identically. But it eliminates the 3 most dangerous data-loss risks (saveDataImmediate guards, isEmptyState bug, missing _dataLoaded), reduces Firebase load by 10x during pomodoros, and makes the codebase maintainable for future work.

---

## FILE STRUCTURE (12 JS Files)

```
dental-quest/
├── index.html                    (CSS + HTML only, ~12,200 lines — no inline JS)
└── js/
    └── dental-quest/
        ├── state.js              (~550 lines)  - Globals, utilities, date/time helpers, localStorage, toasts, modals
        ├── firebase-sync.js      (~1,000 lines) - Firebase init, PIN, save/load, sync, checkpoints, merge
        ├── medications.js        (~400 lines)  - Pill tracking, med cards, auto-reduce, settings
        ├── financials.js         (~1,200 lines) - All 38 financial functions, 7 renders, help
        ├── calendar.js           (~550 lines)  - Master calendar, countdowns, notes, pill calendar
        ├── daily-planner.js      (~700 lines)  - Timeline, events, clock, planner CRUD, EOD reset
        ├── notebook.js           (~300 lines)  - Pages, editor, keyboard shortcuts
        ├── tasks.js              (~700 lines)  - Task CRUD, categories, drag-drop, dashboard, stats, view switching
        ├── triage.js             (~800 lines)  - Command Center core, triage columns, tiers, drag-drop, quick-add
        ├── crash-out.js          (~900 lines)  - Timeline, scheduling, reorder, time prompts, duration
        ├── focus-pomodoro.js     (~500 lines)  - Timer, checklist, sessions, completion
        └── init.js               (~600 lines)  - Gamification, Quick Add, compact header, rollover, streaks, init wiring
```

### Script Loading Order (in HTML, ORDER MATTERS)
```html
<!-- Firebase SDK (unchanged) -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>

<!-- App JS Files — dependencies flow downward -->
<script src="js/dental-quest/state.js"></script>           <!-- 1. Pure utilities, no deps -->
<script src="js/dental-quest/firebase-sync.js"></script>    <!-- 2. Needs state.js -->
<script src="js/dental-quest/medications.js"></script>      <!-- 3. Needs state + firebase-sync -->
<script src="js/dental-quest/financials.js"></script>       <!-- 4. Needs state + firebase-sync -->
<script src="js/dental-quest/calendar.js"></script>         <!-- 5. Needs state + firebase-sync + medications -->
<script src="js/dental-quest/daily-planner.js"></script>    <!-- 6. Needs state + firebase-sync -->
<script src="js/dental-quest/notebook.js"></script>         <!-- 7. Needs state + firebase-sync -->
<script src="js/dental-quest/tasks.js"></script>            <!-- 8. Needs state + firebase-sync -->
<script src="js/dental-quest/triage.js"></script>           <!-- 9. Needs tasks.js (renderFocusMode, switchCommandCenterMode) -->
<script src="js/dental-quest/crash-out.js"></script>        <!-- 10. Needs tasks + triage -->
<script src="js/dental-quest/focus-pomodoro.js"></script>   <!-- 11. Needs tasks + triage -->
<script src="js/dental-quest/init.js"></script>             <!-- 12. LAST — needs everything -->
```

### Forward Reference Safety
All scripts share the global scope via `var` declarations. Functions defined in later-loaded scripts ARE accessible from earlier-loaded scripts **at runtime** (user clicks, event handlers) but NOT **at parse time** (top-level execution during script load).

**Safe pattern** (runtime reference — executes after all scripts load):
```javascript
// In triage.js (loads before init.js):
function completeTriageTask(taskId) {
    // ... complete task logic ...
    awardCommandCenterXP(taskId, 50);  // ← defined in init.js, but called at runtime — SAFE
}
```

**Unsafe pattern** (parse-time reference — executes during script load):
```javascript
// In triage.js:
var result = awardCommandCenterXP('test', 0);  // ← CRASH: init.js not loaded yet
```

The current codebase has NO parse-time cross-references between the proposed modules, so forward references are safe. Verify this during each phase.

---

## PRE-FLIGHT CHECKLIST (Do Before Phase 1)

```bash
# 1. Create checkpoint in the app UI (use checkpoint manager button)
# 2. Commit current state
git add -A && git commit -m "Pre-split checkpoint"
# 3. Create feature branch
git checkout -b split-index-html
# 4. Create directory
mkdir -p js/dental-quest
# 5. Verify app works — open in browser, check no console errors
```

---

## PHASE 1: Extract state.js (Leaf Module)

**Risk level**: ZERO — pure functions and variable declarations with no dependencies on other app code.

**CRITICAL LESSON FROM STIM CALC SPLIT**: State variables must be initialized with their DEFAULT VALUES, never `null`. The stim calc split used `var state = null` and the entire app crashed with `TypeError: Cannot read properties of null`. Use explicit defaults for every variable.

### state.js — What Goes In

**Global variable declarations** (from top of main `<script>` block, ~lines 12140-12410):
```javascript
// Sync/Firebase state — initialized with safe defaults
var firebaseInitialized = false;
var database = null;
var currentUser = null;
var initialLoadComplete = false;
var hasLoadedFromCloud = false;
var pinValidated = false;
var userPassword = null;
var saveDebounceTimer = null;
var pendingSaveData = null;
var offlineSyncPending = false;
var _version = 0;           // NEW — prevents fresh-browser overwrite
var _dataLoaded = false;     // NEW — 5th save guard (matches other 3 apps)

// App state variables — initialized with structured defaults, NEVER null
var tasks = {};
var currentCategory = 'dotoday';
var currentView = 'focus';
var focusModeData = {
    oneThingId: null,
    todaysTasks: [],
    microSteps: {},
    lastPlanningDate: null
};
var lastCriticalEODReset = null;
var commandCenterData = {
    crashOut: { sleepTime: null, tasks: [] },
    focusStats: { totalXP: 0, totalSessions: 0 },
    currentSession: {
        taskId: null, checklist: {}, timerMinutes: 25,
        timerRemaining: 0, confirmedStarted: false, startedAt: null
    }
};
var stats = {
    totalXPGained: 0, totalXPAvailable: 0,
    level: 1, tasksCompleted: 0,
    streakDays: 0, lastCompletionDate: null,
    perfectDays: 0, lastPerfectDay: null
};
var medications = { '30mg': { remaining: 0 }, '20mg': { remaining: 0 } };
var calendarNotes = {};
var pillAssignments = { '30mg': {}, '20mg': {} };
var calendarEvents = {};
var notebook = { pages: {}, currentPageId: null };
var financials = { /* ... copy full defaults from ~12309 ... */ };
var dailyPlanner = { /* ... copy full defaults from ~12232 ... */ };

// Sync tracking variables
var mainDataSyncEnabled = false;
var lastKnownSaveTime = 0;
var realtimeSyncListener = null;

// Command center state
var commandCenterMode = 'triage';
var isReorderingLocked = false;
var _renderFrame = 0;
var _triageCacheFrame = -1;
var _triageCacheData = {};

// Focus timer state
var focusTimerInterval = null;
var focusTimerSecondsRemaining = 0;
var focusCurrentTaskId = null;
var focusTimerRunning = false;

// Crash out state
var crashOutTimelineInterval = null;
var timePromptInterval = null;
```

**Functions to extract:**
| Function | Approx Line | Notes |
|----------|-------------|-------|
| `isEmptyState()` | ~12152 | **BUG FIX — `.entries` → `.pages`** |
| `hasRealData()` | ~12173 | **KEEP — called at line 14340** (Firebase error fallback) |
| `markInitialLoadComplete()` | ~12178 | |
| `generateId(prefix)` | ~12640 | |
| `getDeviceId()` | ~12647 | |
| `ensureArray()` | ~12657 | |
| `getValues()` | ~12667 | |
| `getCount()` | ~12674 | |
| `migrateArrayToObject()` | ~12681 | |
| `migrateFinancials()` | ~12710 | |
| `objectToArray()` | ~12786 | |
| `ensureNotEmpty()` | ~12793 | |
| `removeEmptyPlaceholder()` | ~12801 | |
| `migrateTaskIdArrayToObject()` | ~12812 | |
| `getTaskIds()` | ~12839 | |
| `hasTaskId()` | ~12846 | |
| `migrateDosesLoggedToObject()` | ~12853 | |
| `safeLocalStorageSet()` | ~12880 | |
| `BackupManager` | ~12910-12952 | Object with methods |
| `getLocalDateString()` | ~16604 | Cross-module utility (declared in planner, used everywhere) |
| `getTodayDateString()` | ~16608 | Cross-module utility |
| `parseLocalDate()` | ~16613 | Cross-module utility |
| `deepMerge()` | ~16620 | |
| `markLocalChange()` | ~16650 | |
| `showToast()` | ~13353 | |
| `showCustomAlert()` | ~13373 | |
| `showCustomConfirm()` | ~13391 | |
| `escapeHtml()` | Find in file | String replacement version |
| `ensureModalOnBody()` | ~14928 | Cross-module utility (declared in meds, used everywhere) |
| `safeModalClose()` | ~14936 | |
| `_toastTimer` variable | ~13352 | Used by showToast |

**BUG FIX #1 in `isEmptyState()`** (apply during extraction):
```javascript
// WRONG (current at ~line 12159):
const hasNotebookEntries = data.notebook?.entries && Object.keys(data.notebook.entries).length > 0;
// FIXED:
const hasNotebookEntries = data.notebook?.pages && Object.keys(data.notebook.pages).length > 0;
```

**BUG FIX #2 — Add `_version` and `_dataLoaded` global vars** (shown above in declarations).

### Phase 1 Steps
1. Create `js/dental-quest/state.js` with all globals + functions listed above (with bug fixes applied)
2. In `index.html`: Add `<script src="js/dental-quest/state.js"></script>` BEFORE the existing main `<script>` block
3. In `index.html`: DELETE the extracted functions and variable declarations from the inline `<script>` (keep everything else)
4. **DO NOT delete `hasRealData()`** — it IS called at line 14340 in Firebase error fallback
5. Verify brace balance: `python3 -c "c=open('js/dental-quest/state.js').read(); print(c.count('{'), c.count('}'))"`
6. **TEST**: Reload app in browser. No console errors. Full View and Focused View both work.
7. **COMMIT**: `git add -A && git commit -m "Phase 1: Extract state.js (globals, utilities, isEmptyState fix)"`

---

## PHASE 2: Extract firebase-sync.js (MOST DANGEROUS)

**Risk level**: CRITICAL — this module contains every save guard, every sync handler, and the checkpoint system. One wrong move wipes data.

### firebase-sync.js — What Goes In

**Constants:**
```javascript
var APP_VERSION = '1.0.0';
var firebaseConfig = { /* ... existing config — DO NOT CHANGE ... */ };
```

**Functions to extract:**
| Function | Approx Line | Category |
|----------|-------------|----------|
| `loadData()` | ~12958 | localStorage load |
| `saveData()` | ~13109 | **4→5 GUARDS — add `_dataLoaded` check** |
| `saveDataImmediate()` | ~13289 | **CRITICAL REWRITE — needs full 5 guards + correct data object** |
| `isValidAppData()` | ~13415 | Validation |
| `extractDataFromImport()` | ~13431 | Import parsing |
| `getCheckpointKey()` | ~13467 | Checkpoint |
| `getDataCountForCheckpoint()` | ~13472 | Checkpoint |
| `createCheckpoint()` | ~13482 | Checkpoint |
| `showCheckpointManager()` | ~13545 | Checkpoint UI |
| `restoreCheckpointByIndex()` | ~13636 | Checkpoint |
| `exportCheckpointByIndex()` | ~13680 | Checkpoint |
| `deleteCheckpointByIndex()` | ~13710 | Checkpoint |
| `importCheckpointFile()` | ~13744 | Checkpoint |
| `restoreCheckpoint()` | ~13814 | Checkpoint |
| `clearAllData()` | ~13998 | Data wipe |
| `initializeFirebase()` | ~14065 | Firebase init + PIN |
| `loadDataFromFirebase()` | ~14139 | Cloud load + merge |
| `showSyncConflictModal()` | ~16655 | Conflict UI |
| `updateSyncStatus()` | ~17369 | Status indicator |
| `forceCloudSync()` | ~17403 | Manual sync |
| `applyRemoteData()` | ~17469 | **REFACTOR — make THE canonical merge function** |
| `forceUploadToCloud()` | ~17565 | Force sync |
| `forcePullFromCloud()` | ~17626 | Force sync |
| `window.debugSyncStatus()` | ~17662 | Debug |
| `window.resetSyncPin()` | ~17683 | Debug |
| `setupMainDataRealtimeSync()` | ~17698 | **REFACTOR — use applyRemoteData()** |

**Also move into this file:**
- Visibility change handler (~line 14390, ~155 lines) — has inline save + 12-block merge
- beforeunload handler (~line 14371) — has inline localStorage save
- Firebase init execution code (~line 14356-14360) — the `if (firebaseConfig.apiKey !== ...)` block

### BUG FIX #3 — Add 5th save guard (`_dataLoaded`) to `saveData()`:
```javascript
// In saveData(), add after the existing 4 guards (~line 13130):
// GUARD D: Data loaded check (matches stim-calc, d3-roadmap, body-comp)
if (firebaseInitialized && !_dataLoaded) {
    console.warn('⚠️ BLOCKED: Save attempted before data loaded');
    return;
}
```

### BUG FIX #4 — CRITICAL REWRITE of `saveDataImmediate()`:
The current function (lines 13289-13349) has **only 1 guard**, is **missing `commandCenterData`** from its data object, and saves **raw `focusModeData`** instead of the selective version.

```javascript
// REWRITTEN saveDataImmediate() — must have IDENTICAL guards and data shape to saveData():
function saveDataImmediate() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
    }
    pendingSaveData = null;

    // ===== SAME 5 GUARDS AS saveData() =====
    if (firebaseInitialized && !pinValidated) {
        console.warn('⚠️ BLOCKED: Immediate save before PIN validation');
        return;
    }
    if (firebaseInitialized && !initialLoadComplete) {
        console.warn('⚠️ BLOCKED: Immediate save before initial load');
        return;
    }
    if (firebaseInitialized && !hasLoadedFromCloud) {
        console.warn('⚠️ BLOCKED: Immediate save before cloud load');
        return;
    }
    if (firebaseInitialized && !_dataLoaded) {
        console.warn('⚠️ BLOCKED: Immediate save before data loaded');
        return;
    }

    markLocalChange();

    // ===== SAME data object as saveData() =====
    const saveTimestamp = Date.now();
    const data = buildSaveData(saveTimestamp);

    // GUARD E: Empty state check
    if (firebaseInitialized && isEmptyState(data)) {
        console.warn('⚠️ BLOCKED: Refusing to immediate-save empty state');
        return;
    }

    lastKnownSaveTime = saveTimestamp;

    // Save to localStorage
    try {
        safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));
    } catch (e) {
        console.error('localStorage save failed:', e);
    }

    // Save to Firebase immediately (no debounce)
    if (firebaseInitialized && currentUser && database) {
        // ... existing saving toast + database.ref().set() ...
    }
}
```

### NEW HELPER — `buildSaveData()`:
Extract the data object construction into a shared function so `saveData()` and `saveDataImmediate()` can never diverge:
```javascript
function buildSaveData(saveTimestamp) {
    return {
        tasks: tasks || {},
        stats,
        medications,
        calendarNotes: calendarNotes || {},
        notebook,
        financials,
        pillAssignments,
        calendarEvents: calendarEvents || {},
        dailyPlanner,
        focusModeData: {
            oneThingId: focusModeData.oneThingId,
            microSteps: focusModeData.microSteps,
            todaysTasks: focusModeData.todaysTasks,
            lastPlanningDate: focusModeData.lastPlanningDate
        },
        commandCenterData: {
            crashOut: commandCenterData.crashOut,
            focusStats: commandCenterData.focusStats,
            currentSession: {
                taskId: commandCenterData.currentSession.taskId,
                checklist: commandCenterData.currentSession.checklist,
                timerMinutes: commandCenterData.currentSession.timerMinutes,
                timerRemaining: commandCenterData.currentSession.timerRemaining,
                confirmedStarted: commandCenterData.currentSession.confirmedStarted,
                startedAt: commandCenterData.currentSession.startedAt
            }
        },
        lastCriticalEODReset,
        _version: _version,
        _dataLoaded: true,
        lastSaved: saveTimestamp
    };
}
```

### BUG FIX #5 — Set `_dataLoaded = true` after successful cloud load:
```javascript
// In loadDataFromFirebase(), after all merges complete (~line 14311):
_dataLoaded = true;

// In loadData() (localStorage path), after successful load:
_dataLoaded = true;
```

### BUG FIX #6 — `applyRemoteData()` field audit:
Before using `applyRemoteData()` as the canonical merge function, verify it handles ALL 14 data fields that `saveData()` writes:

| Field | In saveData()? | In current applyRemoteData()? | Action |
|-------|---------------|-------------------------------|--------|
| `tasks` | ✅ | Verify | Must merge |
| `stats` | ✅ | Verify | Must merge |
| `medications` | ✅ | Verify | Must merge |
| `calendarNotes` | ✅ | Verify | Must merge |
| `notebook` | ✅ | Verify | Must merge |
| `financials` | ✅ | Verify | Must merge |
| `pillAssignments` | ✅ | Verify | Must merge |
| `calendarEvents` | ✅ | Verify | Must merge |
| `dailyPlanner` | ✅ | Verify | Must merge |
| `focusModeData` | ✅ | Verify | Must merge (selective) |
| `commandCenterData` | ✅ | Verify | Must merge (selective) |
| `lastCriticalEODReset` | ✅ | Verify | Must merge |
| `_version` | ✅ (NEW) | Add | Must preserve |
| `_dataLoaded` | ✅ (NEW) | Add | Always set true after merge |
| `lastSaved` | ✅ | Used for comparison | Don't overwrite locally |

**During extraction, read `applyRemoteData()` at line ~17469 and verify every field is handled. Add any missing fields.**

### REFACTOR — Consolidate visibility handler:
```javascript
// BEFORE (current ~14406-14544): ~155 lines of inline merge logic
// AFTER: Replace with applyRemoteData() call:
} else if (document.visibilityState === 'visible') {
    if (firebaseInitialized && currentUser && database && initialLoadComplete) {
        database.ref('users/' + currentUser.uid + '/appData').once('value')
            .then(snapshot => {
                const data = snapshot.val();
                if (!data || isEmptyState(data)) return;
                const incomingTime = data.lastSaved || 0;
                if (incomingTime > lastKnownSaveTime) {
                    applyRemoteData(data);
                    showToast('Refreshed from cloud', '🔄');
                }
            });
    }
}
```

### REFACTOR — Consolidate realtime sync:
```javascript
// In setupMainDataRealtimeSync(), replace the inline merge blocks with:
applyRemoteData(data);
```

### Phase 2 Steps
1. Create `js/dental-quest/firebase-sync.js` with all functions listed above
2. Create `buildSaveData()` helper — used by both `saveData()` and `saveDataImmediate()`
3. Add 5th save guard (`_dataLoaded`) to `saveData()`
4. **REWRITE `saveDataImmediate()`** with full 5 guards + `buildSaveData()` + isEmptyState check
5. Set `_dataLoaded = true` in both load paths
6. **Audit `applyRemoteData()`** for all 14 fields — add any missing
7. Consolidate visibility handler to use `applyRemoteData()`
8. Consolidate realtime sync to use `applyRemoteData()`
9. Move visibility + beforeunload handlers + Firebase init execution into this file
10. Add `<script src="...">` tag after state.js
11. Delete extracted functions from inline `<script>`
12. Verify brace balance
13. **CRITICAL TEST SEQUENCE** (do ALL of these):
    - [ ] Reload app → sync indicator shows green
    - [ ] Add a task → reload → still there
    - [ ] Complete a task → reload → still completed
    - [ ] Open in second tab → change in one → reflects in other (realtime sync)
    - [ ] Create checkpoint → appears in manager
    - [ ] Export checkpoint → valid JSON
    - [ ] **Force Upload** → verify commandCenterData preserved (was missing before fix)
    - [ ] Switch tabs away and back → no data loss
    - [ ] Close browser → reopen → data persists
    - [ ] In incognito → PIN entry → data loads from cloud
    - [ ] Force Pull → data refreshes from cloud
    - [ ] Verify `saveDataImmediate()` has 5 guards by reading the code
14. **COMMIT**: `git add -A && git commit -m "Phase 2: Extract firebase-sync.js, fix saveDataImmediate (5 guards), consolidate merge blocks"`

---

## PHASE 3: Extract medications.js + financials.js

**Risk level**: LOW — these are self-contained feature modules with clear boundaries. Financial module is completely isolated (confirmed by dependency analysis — zero cross-contamination with medications).

### medications.js — Functions (~lines 14631-14941 + saveMedSettings at ~18267)

| Function | Approx Line | Notes |
|----------|-------------|-------|
| `getTimeAgo()` | ~14612 | |
| `updateMedicationDisplay()` | ~14632 | |
| `updateMedCard()` | ~14637 | |
| `takeMed()` | ~14775 | |
| `takeBothMeds()` | ~14805 | |
| `adjustMed()` | ~14834 | |
| `checkAndApplyDailyPillReduce()` | ~14852 | |
| `openMedSettings()` | ~14895 | |
| `closeMedModal()` | ~14909 | |
| `saveMedSettings()` | ~18267 | **NOTE: 3,374 lines away from other med functions** — confirm during extraction |

**NOTE**: `ensureModalOnBody()` and `safeModalClose()` are currently declared near medications (~14928-14936) but are cross-module utilities used by financials, calendar, notebook, etc. These were already extracted to `state.js` in Phase 1.

### financials.js — Functions (~lines 14943-16141)

Completely self-contained — 38 functions, zero dependencies on other feature modules. All call only `saveData()`, `showToast()`, `generateId()`, and `getValues()` from state/firebase.

| Function | Approx Line | Category |
|----------|-------------|----------|
| `openFinancials()` | ~14947 | Modal |
| `closeFinancials()` | ~14979 | Modal |
| `calculateFinancialStatus()` | ~14985 | Core calc |
| `updateCockpitStats()` | ~15049 | Stats |
| `renderFinancialCockpit()` | ~15068 | Master render |
| `renderMasterCockpit()` | ~15087 | Liquidity |
| `updateMasterLiquidity()` | ~15121 | Liquidity |
| `saveMasterLiquidity()` | ~15164 | Liquidity |
| `renderOneTimeBills()` | ~15185 | Bills |
| `toggleOneTimeBillPaid()` | ~15240 | Bills |
| `addOneTimeBill()` | ~15248 | Bills |
| `saveNewOneTimeBill()` | ~15263 | Bills |
| `editOneTimeBill()` | ~15279 | Bills |
| `saveOneTimeBillEdit()` | ~15295 | Bills |
| `deleteOneTimeBill()` | ~15307 | Bills |
| `renderMonthlyExpenses()` | ~15317 | Expenses |
| `toggleMonthCollapse()` | ~15384 | Expenses |
| `toggleMonthExpensePaid()` | ~15398 | Expenses |
| `payAllMonth()` | ~15406 | Expenses |
| `editMonthExpense()` | ~15415 | Expenses |
| `saveMonthExpenseEdit()` | ~15438 | Expenses |
| `deleteMonthExpense()` | ~15451 | Expenses |
| `addExpenseToMonth()` | ~15462 | Expenses |
| `saveNewMonthExpense()` | ~15477 | Expenses |
| `renderExpenseTemplate()` | ~15493 | Template |
| `editTemplateExpense()` | ~15519 | Template |
| `saveTemplateExpenseEdit()` | ~15539 | Template |
| `deleteTemplateExpense()` | ~15550 | Template |
| `addTemplateExpense()` | ~15559 | Template |
| `saveNewTemplateExpense()` | ~15572 | Template |
| `renderProjectionPanel()` | ~15586 | Projection |
| `renderActionItems()` | ~15631 | Actions |
| `toggleActionItem()` | ~15695 | Actions |
| `renderCreditCards()` | ~15709 | Credit cards |
| `editCreditCard()` | ~15770 | Credit cards |
| `saveCreditCardEdit()` | ~15819 | Credit cards |
| `openFinancialHelp()` | ~15847 | Help |
| `closeFinancialHelp()` | ~15854 | Help |
| `showFinancialHelp()` | ~15858 | Help |

### Phase 3 Steps
1. Create `js/dental-quest/medications.js` with all med functions (including `saveMedSettings` from ~18267)
2. Create `js/dental-quest/financials.js` with all financial functions
3. Add 2 `<script src="...">` tags in correct order
4. Delete extracted functions from inline `<script>`
5. Verify brace balance for both new files
6. **TEST**: Medication cards display, pill tracking works, take/adjust pills, med settings modal. Financial cockpit opens with all 7 sections rendering correctly.
7. **COMMIT**: `git add -A && git commit -m "Phase 3: Extract medications.js + financials.js"`

---

## PHASE 4: Extract calendar.js + daily-planner.js + notebook.js

**Risk level**: LOW — self-contained feature modules.

### calendar.js — Functions (~lines 16143-16600 + 18112-18648)

Includes both master calendar and pill calendar (they share data via `pillAssignments`).

| Function | Approx Line | Group |
|----------|-------------|-------|
| `openCalendar()` | ~16153 | Master calendar |
| `closeCalendar()` | ~16169 | |
| `changeMonth()` | ~16174 | |
| `renderMasterCalendar()` | ~16179 | |
| `renderCalendarGrid()` | ~16196 | |
| `getMedStatus()` | ~16339 | |
| `renderCountdowns()` | ~16375 | |
| `openAddCountdown()` | ~16486 | |
| `closeAddCountdown()` | ~16501 | |
| `saveCountdown()` | ~16506 | |
| `editCountdown()` | ~16559 | |
| `deleteCountdown()` | ~16579 | |
| `handleCalendarDayClick()` | ~18119 | Pill calendar |
| `assignPillToNearestAvailableDay()` | ~18147 | |
| `removePillFromNearestAssignedDay()` | ~18172 | |
| `resetPillAssignments()` | ~18193 | |
| `generateCalendar()` | ~18296 | |
| `toggleCalendar()` | ~18284 | |
| `openNoteModal()` | ~18206 | Calendar notes |
| `closeNoteModal()` | ~18230 | |
| `saveNote()` | ~18235 | |
| `deleteNote()` | ~18255 | |

### daily-planner.js — Functions (~lines 16591-17399)

**NOTE**: `getLocalDateString()`, `getTodayDateString()`, and `parseLocalDate()` are currently declared in this section (~16604-16613) but are cross-module utilities used everywhere. They were already extracted to `state.js` in Phase 1. Do NOT extract them again.

| Function | Approx Line |
|----------|-------------|
| `checkPlannerReset()` | ~16704 |
| `checkCriticalEODReset()` | ~16746 |
| `loadDailyPlanner()` | ~16796 |
| `saveDailyPlanner()` | ~16841 |
| `openDailyPlanner()` | ~16857 |
| `closeDailyPlanner()` | ~16919 |
| `startPlannerClock()` | ~16927 |
| `updateCurrentTimeLine()` | ~16949 |
| `scrollToCurrentTime()` | ~16975 |
| `populateTaskDropdown()` | ~16988 |
| `selectTaskFromDropdown()` | ~17031 |
| `setTimeToNow()` | ~17049 |
| `selectDuration()` | ~17065 |
| `toggleEndTimeMode()` | ~17083 |
| `calculateDurationFromEndTime()` | ~17112 |
| `renderPlannerTimeline()` | ~17132 |
| `renderPlannerEvent()` | ~17178 |
| `formatTime()` | ~17209 |
| `addPlannerEvent()` | ~17217 |
| `quickAddAtHour()` | ~17266 |
| `togglePlannerEvent()` | ~17278 |
| `deletePlannerEvent()` | ~17290 |
| `updatePlannerFooterStats()` | ~17300 |
| `clearDailyPlanner()` | ~17319 |
| `addQuickPomodoro()` | ~17348 |
| `addQuickBreak()` | ~17333 |

**Legacy alias stubs — KEEP as backward compatibility** (NOT dead code):
```javascript
// These are one-liner aliases, not empty stubs. Keep them:
function renderPlannerBlocks() { renderPlannerTimeline(); }      // ~17329
function updatePlannerProgress() { updatePlannerFooterStats(); }  // ~17330
function updatePlannerStats() { updatePlannerFooterStats(); }     // ~17331
function addPlannerBlock() { document.getElementById('plannerNewTask')?.focus(); }  // ~17332
```
These may be called from HTML onclick handlers or other code. Search for callers before deciding to remove.

### notebook.js — Functions (~lines 17868-18110)

| Function | Approx Line |
|----------|-------------|
| `openNotebook()` | ~17868 |
| `closeNotebook()` | ~17899 |
| `createNewPage()` | ~17905 |
| `deletePage()` | ~17930 |
| `switchPage()` | ~17954 |
| `renderNotebookTabs()` | ~17963 |
| `renderNotebookContent()` | ~17982 |
| `handleEditorInput()` | ~18008 |
| `handlePaste()` | ~18013 |
| `handleKeyboardShortcuts()` | ~18020 |
| `formatText()` | ~18035 |
| `updateCharCount()` | ~18043 |
| `scheduleNotebookSave()` | ~18065 |
| `saveCurrentPageContent()` | ~18085 |
| `renamePage()` | ~18096 |
| `saveNotebook()` | ~18108 |

### Phase 4 Steps
1. Create all 3 files with their respective functions
2. Keep planner legacy stubs (they're aliases, not dead code)
3. Don't re-extract date utilities already in state.js
4. Add 3 `<script src="...">` tags in correct order
5. Delete extracted functions from inline `<script>`
6. Verify brace balance for all 3 new files
7. **TEST**: Calendar opens with countdowns, pill tracking, notes. Daily planner opens with timeline and events. Notebook opens with pages, formatting works.
8. **COMMIT**: `git add -A && git commit -m "Phase 4: Extract calendar.js + daily-planner.js + notebook.js"`

---

## PHASE 5: Extract tasks.js

**Risk level**: MEDIUM — task CRUD touches many parts of the app. Must verify all 4 creation paths work.

### tasks.js — Functions from multiple ranges

**Task CRUD:**
| Function | Approx Line |
|----------|-------------|
| `addTask()` | ~18472 |
| `renderTasks()` | ~18546 |
| `toggleTask()` | ~18733 |
| `toggleDoToday()` | ~18787 |
| `deleteTask()` | ~18801 |

**Full View Task Editing:**
| Function | Approx Line |
|----------|-------------|
| `openTaskEditModal()` | ~22576 |
| `closeTaskEditModal()` | ~22597 |
| `selectTaskSize()` | ~22602 |
| `updateSizeSelection()` | ~22607 |
| `toggleLeverage()` | ~22615 |
| `updateLeverageToggle()` | ~22620 |
| `saveTaskEdit()` | ~22628 |

**Full View Drag & Drop:**
| Function | Approx Line |
|----------|-------------|
| `handleDragStart()` | ~18660 |
| `handleDragOver()` | ~18666 |
| `handleDragLeave()` | ~18675 |
| `handleDrop()` | ~18682 |
| `handleDragEnd()` | ~18724 |

**Timer (Full View — separate from Focus Pomodoro timer):**
| Function | Approx Line | Notes |
|----------|-------------|-------|
| `startTaskTimer()` | ~18824 | Full View per-task timer |
| `selectPomodoro()` | ~18846 | |
| `startTimer()` | ~18858 | |
| `pauseTimer()` | ~18874 | |
| `resetTimer()` | ~18881 | |
| `updateTimerDisplay()` | ~18892 | |
| `completeSession()` | ~18899 | |
| `playNotification()` | ~18929 | |

**Category & Dashboard:**
| Function | Approx Line |
|----------|-------------|
| `updateCategoryDisplay()` | ~18454 |
| `updateCategoryXPDisplay()` | ~18515 |
| `toggleDashboardExpansion()` | ~18951 |
| `closeAllExpansions()` | ~18973 |
| `updateDashboardExpansion()` | ~18984 |
| `toggleTaskFromDashboard()` | ~19061 |
| `uncompleteTaskFromDashboard()` | ~19067 |
| `toggleCompletedTasks()` | ~19083 |
| `renderCompletedTasks()` | ~19087 |
| `uncompleteTask()` | ~19092 |
| `updateStats()` | ~19096 |

**View Switching:**
| Function | Approx Line |
|----------|-------------|
| `switchToFocusMode()` | ~19138 |
| `switchToFullView()` | ~19150 |
| `renderFocusMode()` | ~19164 |

**NOTE on `renderFocusMode()`**: This function has **26 callers** across triage, crash-out, focus, and tasks modules. Since it's defined in tasks.js (loads before triage/crash-out/focus), all forward references work fine at runtime. It's the #1 entanglement point — verify all callers still work after extraction.

**NOTE on `toggleCompletedTasks()` and `uncompleteTask()`**: These are one-liner aliases:
```javascript
function toggleCompletedTasks() { toggleDashboardExpansion('completed'); }
function uncompleteTask(id) { uncompleteTaskFromDashboard(id); }
```
Search for callers in HTML onclick handlers before removing. If called from HTML, **keep them**. If only called from JS, inline at callsites.

### Phase 5 Steps
1. Create `js/dental-quest/tasks.js` with all functions listed above
2. Search for callers of alias functions before removing — keep if called from HTML
3. Add `<script src="...">` tag after notebook.js
4. Delete extracted functions from inline `<script>`
5. Verify brace balance
6. **TEST**: Add task in each category, toggle complete, delete task, drag-drop reorder, Do Today toggle, view switch between Full and Focused, stats update correctly. Full View timer works.
7. **COMMIT**: `git add -A && git commit -m "Phase 5: Extract tasks.js (CRUD, categories, dashboard, view switching)"`

---

## PHASE 6: Extract triage.js + crash-out.js + focus-pomodoro.js (Command Center)

**Risk level**: HIGH — these are the most interconnected modules. Triage feeds Crash Out feeds Focus. Drag-drop and inline onclick handlers require `window.` bindings.

### triage.js — Command Center Core + Triage Mode

This module contains both the shared Command Center functions (used by all 3 modes) and the triage-specific functions. It must load BEFORE crash-out.js and focus-pomodoro.js.

**Command Center Core (shared by all 3 modes):**
| Function | Approx Line |
|----------|-------------|
| `updateFocusGreeting()` | ~19181 |
| `renderOneThingCard()` | ~19192 |
| `renderMicroSteps()` | ~19263 |
| `addMicroStep()` | ~19280 |
| `toggleMicroStep()` | ~19294 |
| `removeMicroStep()` | ~19302 |
| `formatFocusTimer()` | ~19310 |
| `toggleFocusTimer()` | ~19318 |
| `completeOneThing()` | ~19334 |
| `quickAddFromFocus()` | ~19559 |
| `switchCommandCenterMode()` | ~19555 |

**Triage Rendering:**
| Function | Approx Line |
|----------|-------------|
| `getTodayTriageTasks()` | Find in file |
| `invalidateTriageCache()` | Find in file |
| `renderTriageMode()` | ~19913 |
| `renderTriageColumn()` | ~19944 |
| `renderTaskCard()` | ~19967 |
| `renderScheduledSection()` | ~20000 |
| `renderRolledOverSection()` | ~20029 |
| `setTaskTier()` | ~20032 |
| `toggleTriageTask()` | Find in file |
| `triageQuickAddTask()` | ~20426 |

**Triage Drag-Drop:**
| Function | Approx Line |
|----------|-------------|
| `handleTriageDragStart()` | ~20469 |
| `handleTriageDragLeave()` | ~20473 |
| `handleTriageDrop()` | ~20478 |
| `handleTriageDragEnd()` | ~20497 |
| `reorderTriageTasks()` | ~20504 |
| `handleSectionDragOver()` | ~20532 |
| `handleSectionDragLeave()` | ~20540 |
| `handleSectionDrop()` | ~20545 |
| `startLongPress()` | ~20570 |
| `endLongPress()` | ~20579 |

**Task Details & Actions:**
| Function | Approx Line |
|----------|-------------|
| `showTaskDetailsModal()` | ~20588 |
| `closeTaskDetailsModal()` | ~20656 |
| `unflagFromToday()` | ~20662 |
| `sendToCrashOut()` | ~20057 |
| `removeFromCrashOut()` | ~20137 |
| `recalculateScheduledTimes()` | ~20117 |

### crash-out.js — Crash Out Mode

**Crash Out Setup:**
| Function | Approx Line |
|----------|-------------|
| `renderCrashOutMode()` | ~20955 |
| `updateCrashOutSetupDate()` | ~20974 |
| `setCrashOutSleep()` | ~20987 |
| `showCustomSleepPicker()` | ~21012 |
| `hideCustomSleepPicker()` | ~21017 |
| `setCustomSleepTime()` | ~21022 |
| `changeSleepTime()` | ~21053 |
| `adjustSleepTime()` | ~21059 |
| `startCrashOutTimelineInterval()` | ~20931 |
| `stopCrashOutTimelineInterval()` | ~20944 |

**Timeline Rendering:**
| Function | Approx Line |
|----------|-------------|
| `renderCrashOutTimeline()` | ~21082 |
| `renderCrashOutTimelineTasks()` | ~21206 |
| `updateNowMarkerTime()` | ~21385 |
| `renderUnscheduledPool()` | ~21729 |
| `parseCrashOutTime()` | ~21690 |

**Timeline Reordering:**
| Function | Approx Line |
|----------|-------------|
| `handleTimelineDragStart()` | ~21399 |
| `handleTimelineDragOver()` | ~21410 |
| `handleTimelineDragLeave()` | ~21420 |
| `handleTimelineDrop()` | ~21428 |
| `handleTimelineDragEnd()` | ~21446 |
| `moveTaskToPosition()` | ~21455 |
| `reorderTimelineTasks()` | ~21511 |
| `swapAdjacentTasks()` | ~21516 |
| `moveTaskUp()` | ~21559 |
| `moveTaskDown()` | ~21572 |
| `moveTaskToTop()` | ~21586 |
| `moveTaskToBottom()` | ~21602 |
| `setTaskPosition()` | ~21637 |
| `promptTaskPosition()` | ~21658 |

**Duration:**
| Function | Approx Line |
|----------|-------------|
| `setDurationDirect()` | ~21715 |
| `openDurationModal()` | ~21765 |
| `adjustDuration()` | ~21805 |
| `setDuration()` | ~21819 |
| `closeDurationModal()` | ~21832 |
| `recalculateCrashOutTimes()` | ~21838 |
| `dismissOverscheduledWarning()` | ~21849 |
| `resetCrashOutDay()` | ~21860 |

**Time Prompts:**
| Function | Approx Line |
|----------|-------------|
| `startTimePromptChecker()` | ~20686 |
| `checkForTimePrompts()` | ~20691 |
| `showTimePrompt()` | ~20748 |
| `startTaskFromPrompt()` | ~20787 |
| `closeTimePrompt()` | ~20794 |
| `pushAllTasks()` | ~20805 |
| `showCascadeAnimation()` | ~20844 |
| `showUndoToast()` | ~20855 |
| `undoPush()` | ~20888 |
| `skipTask()` | ~20911 |
| `removeTaskFromSchedule()` | ~20918 |

**CRITICAL: Window bindings at bottom of crash-out.js:**
```javascript
// Required for inline onclick handlers in dynamically rendered HTML.
// These 14 bindings already exist at lines 21675-21688 — preserve them:
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

**ALSO audit ALL `onclick` strings in `renderCrashOutTimelineTasks()` and other render functions for additional functions that need `window.` binding.** Common pattern:
```javascript
// In render functions, onclick handlers like:
`onclick="setDurationDirect('${id}', 30)"`
`onclick="openDurationModal('${id}')"`
`onclick="sendToCrashOut('${id}')"`
// ALL function names used in onclick strings must be on window
```

### focus-pomodoro.js — Focus/Pomodoro Mode

| Function | Approx Line |
|----------|-------------|
| `renderFocusPomodoroMode()` | ~21891 |
| `startTaskInFocus()` | ~21909 |
| `renderActiveSession()` | ~21945 |
| `updateFocusTimerDisplay()` | ~21975 |
| `startFocusTimer()` | ~22039 |
| `pauseFocusTimer()` | ~22064 |
| `resumeFocusTimer()` | ~22075 |
| `setFocusDuration()` | ~22079 |
| `onFocusTimerComplete()` | ~22103 |
| `showFocusCompleteModal()` | ~22121 |
| `completeFocusTask()` | ~22182 |
| `completeFocusTaskFromModal()` | ~22188 |
| `startNextFocusTask()` | ~22193 |
| `takeBreak()` | ~22211 |
| `backToTriageFromModal()` | ~22220 |
| `hideFocusCompleteModal()` | ~22225 |
| `exitFocusMode()` | ~22230 |
| `renderFocusChecklist()` | ~22254 |
| `addFocusChecklistItem()` | ~22291 |
| `toggleFocusChecklistItem()` | ~22310 |
| `deleteFocusChecklistItem()` | ~22318 |
| `adjustFocusTimer()` | ~22435 |
| `skipFocusTask()` | ~22442 |

**BUG FIX #7 — Timer save frequency:**
```javascript
// In startFocusTimer() (~line 22039), change save interval:
// CURRENT: saveData() called every 1000ms (line 22048)
// FIXED: Only save every 10 seconds, and always on pause/complete
var focusTimerSaveCounter = 0;
focusTimerInterval = setInterval(function() {
    focusTimerSecondsRemaining--;
    if (commandCenterData.currentSession) {
        commandCenterData.currentSession.timerRemaining = focusTimerSecondsRemaining;
        focusTimerSaveCounter++;
        if (focusTimerSaveCounter >= 10) {  // Save every 10 seconds, not every 1
            focusTimerSaveCounter = 0;
            saveData();
        }
    }
    updateFocusTimerDisplay();
    if (focusTimerSecondsRemaining <= 0) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
        focusTimerRunning = false;
        onFocusTimerComplete();
    }
}, 1000);

// ALSO: Ensure saveData() is called in pauseFocusTimer() and onFocusTimerComplete()
// to capture the latest state (verify these already do — they should)
```

### Phase 6 Steps
1. Create `js/dental-quest/triage.js` with CC core + triage functions
2. Create `js/dental-quest/crash-out.js` with crash out functions + window bindings
3. Create `js/dental-quest/focus-pomodoro.js` with focus/pomodoro functions
4. Apply timer save frequency fix
5. **Audit ALL onclick strings** in render functions — add `window.X` bindings for any missing
6. Add 3 `<script src="...">` tags in correct order (triage before crash-out before focus)
7. Delete extracted functions from inline `<script>`
8. Verify brace balance for all 3 new files
9. **TEST**: Switch between all 3 Command Center tabs. Triage: drag between columns, quick-add, task details modal. Crash Out: set sleep time, schedule tasks, reorder with up/down buttons AND drag-drop, duration adjust, NOW marker moves. Focus: start timer, pause/resume, checklist add/toggle/delete, complete task, XP awards. Time prompts fire.
10. **COMMIT**: `git add -A && git commit -m "Phase 6: Extract triage.js + crash-out.js + focus-pomodoro.js, fix timer save frequency"`

---

## PHASE 7: Extract init.js (Wiring Layer)

**Risk level**: HIGH — this is the last module. Everything must work after extraction. This phase also integrates the second `<script>` block (Quick Add + compact header hooks).

### init.js — What Goes In

**Gamification:**
| Function | Approx Line |
|----------|-------------|
| `awardCommandCenterXP()` | ~22328 |
| `showCelebration()` | ~22376 |
| `showCompletionMessage()` | ~22404 |
| `updateStreakBadge()` | ~22412 |
| `checkAndProcessRollovers()` | ~22448 |
| `checkForPerfectDay()` | ~22485 |
| `showPerfectDayBadge()` | ~22502 |
| `updateStreaks()` | ~22527 |

**Quick Add FAB (from second `<script>` block, lines 22747-22830):**
| Function | Approx Line |
|----------|-------------|
| `openQuickAddPanel()` | ~22754 |
| `closeQuickAddPanel()` | ~22761 |
| `selectQACategory()` | ~22768 |
| `selectQASize()` | ~22776 |
| `toggleQADoToday()` | ~22783 |
| `toggleQALeverage()` | ~22788 |
| `submitQuickAdd()` | ~22793 |
| `initQuickAddPanel()` | ~22821 |

Quick Add state variables:
```javascript
var qaSelectedCategory = localStorage.getItem('qaLastCategory') || 'health';
var qaSelectedSize = 'medium';
var qaDoToday = false;
var qaHighLeverage = false;
```

**Compact Header (from second `<script>` block, lines 22832-22900+):**
| Function | Approx Line |
|----------|-------------|
| `toggleHeaderMenu()` | ~22833 |
| `updateSyncDot()` | ~22843 |
| `updateMenuStats()` | ~22853 |
| `updateCompactHeader()` | ~22864 |

**ELIMINATE MONKEY-PATCHING — integrate directly:**

The current second script block wraps several functions with monkey-patches:
```javascript
// CURRENT (fragile monkey-patching):
const _origUpdateStats = typeof updateStats === 'function' ? updateStats : null;
if (_origUpdateStats) {
    updateStats = function() { _origUpdateStats.apply(this, arguments); updateCompactHeader(); };
}
```

**AFTER SPLIT**: Instead of monkey-patching, directly call the compact header updates from the source functions:

1. In `tasks.js`: Add `updateCompactHeader()` call at the end of `updateStats()`
2. In `firebase-sync.js`: Add `updateSyncDot(status)` call at the end of `updateSyncStatus()`
3. In `tasks.js`: Add compact header toggle update at the end of `switchToFocusMode()` and `switchToFullView()`

This eliminates all 4 monkey-patches. The `updateCompactHeader()`, `updateSyncDot()`, and `updateMenuStats()` functions must be defined in `init.js` (which loads last), so they're accessed as forward references — safe because they're only called from event handlers at runtime.

**Init & Layout:**
| Function | Approx Line |
|----------|-------------|
| `initFocusMode()` | ~22650 |
| `handleResponsiveLayout()` | ~22685 |

**BUG FIX #8 — Init flow with error handling:**
```javascript
// Create a proper init function with try/catch (currently init code is at parse-time, ~14356):
function initApp() {
    try {
        if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
            initializeFirebase();
        } else {
            loadData();
            markInitialLoadComplete();
        }

        // Setup intervals
        setInterval(function() { BackupManager.createBackup(); }, 5 * 60 * 1000);

        // Focus mode init
        initFocusMode();
        handleResponsiveLayout();
        window.addEventListener('resize', handleResponsiveLayout);

        // Daily reset checks
        checkCriticalEODReset();
        checkPlannerReset();
        checkAndProcessRollovers();

        // Quick Add panel
        initQuickAddPanel();
    } catch (e) {
        console.error('Init error:', e);
        // Still try to load local data
        try { loadData(); markInitialLoadComplete(); } catch (e2) { /* last resort */ }
    }
}

// Register init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
```

### Phase 7 Steps
1. Create `js/dental-quest/init.js` with gamification + Quick Add + compact header + init functions
2. Integrate compact header calls directly into source functions (eliminate monkey-patching)
3. Wrap init code in `initApp()` with try/catch
4. Delete BOTH inline `<script>` blocks from HTML entirely (main block AND Quick Add/header block)
5. Add `<script src="js/dental-quest/init.js"></script>` as the LAST script tag
6. Verify the HTML file now has ZERO inline `<script>` content (only `<script src="...">` tags)
7. Verify brace balance for init.js
8. **FULL TEST** — every single feature:
    - [ ] Full View: categories display, add task, complete task, delete task
    - [ ] Full View: drag-drop reorder, Do Today toggle, dashboard expansions
    - [ ] Full View: timer (select/start/pause/reset/complete)
    - [ ] Focused View: switch from Full View, greeting shows
    - [ ] Triage: 3 columns render, drag between columns, quick-add
    - [ ] Triage: tier colors correct (amber/blue/teal)
    - [ ] Triage: task details modal opens
    - [ ] Crash Out: set sleep time, schedule tasks, timeline renders
    - [ ] Crash Out: reorder buttons (up/down/top/bottom/position)
    - [ ] Crash Out: drag-drop reorder, duration adjust, NOW marker
    - [ ] Crash Out: time prompts fire, push/dismiss/skip work
    - [ ] Focus: start task, timer counts down, pause/resume
    - [ ] Focus: duration toggles (15/25/50 min), checklist
    - [ ] Focus: complete task → XP awards, celebration
    - [ ] Medications: both cards display, take/adjust pills
    - [ ] Medications: calendar with pill assignments
    - [ ] Medications: settings modal opens/saves
    - [ ] Financials: cockpit opens, all 7 sections render
    - [ ] Financials: add/edit/delete bills, expenses, action items
    - [ ] Calendar: master calendar renders, countdowns display
    - [ ] Calendar: notes (add/edit/delete)
    - [ ] Daily Planner: opens, timeline renders, add/delete events
    - [ ] Notebook: opens, pages work, formatting works
    - [ ] Quick Add FAB: opens bottom sheet, submits task
    - [ ] Compact header: sync dot updates, streak badge, do-today count
    - [ ] Header menu: opens, stats display correctly
    - [ ] Gamification: XP awards, level up, streak badges
    - [ ] Rollover: incomplete Locked In tasks roll over at 5 AM
    - [ ] Perfect Day: all tasks done → 200 XP bonus
    - [ ] Firebase: all Phase 2 tests still pass
    - [ ] Mobile: responsive layout, tappable targets, iOS safe
    - [ ] View toggle: Full ↔ Focus works, chrome hides/shows
    - [ ] Cross-app: medication data visible in Body Comp
    - [ ] Cross-app: doToday tasks visible in D3 Roadmap
9. **COMMIT**: `git add -A && git commit -m "Phase 7: Extract init.js, eliminate monkey-patching, add error-handled init"`

---

## PHASE 8: Merge and Deploy

```bash
# 1. Final brace balance check on all files
for f in js/dental-quest/*.js; do echo "$f:"; python3 -c "c=open('$f').read(); print('  { }', c.count('{'), c.count('}'))"; done

# 2. Verify HTML has no inline <script> content
grep -n '<script>' index.html  # Should show only src= tags + Firebase SDK

# 3. Verify total line counts
wc -l index.html js/dental-quest/*.js

# 4. Merge to main
git checkout main
git merge split-index-html

# 5. Push (goes live in ~30s)
git push origin main

# 6. Verify live site works
# Open https://suleman7-dmd.github.io/dental-quest/
# Run through smoke tests: add task, complete task, switch views, medications, financials
```

---

## SYNC PROTECTION PRESERVATION MAP

After split, these 12 critical protections must be in the correct files:

| # | What | File |
|---|------|------|
| 1 | `_version = 0` global var | `state.js` |
| 2 | `_dataLoaded = false` global var | `state.js` |
| 3 | `isEmptyState()` with `.pages` fix | `state.js` |
| 4 | `hasRealData()` wrapper (NOT dead code) | `state.js` |
| 5 | Guard flags (`initialLoadComplete`, `pinValidated`, `hasLoadedFromCloud`) | `state.js` (declarations) |
| 6 | 5 Guards in `saveData()` | `firebase-sync.js` |
| 7 | 5 Guards in `saveDataImmediate()` | `firebase-sync.js` |
| 8 | `buildSaveData()` shared helper | `firebase-sync.js` |
| 9 | Protected `loadDataFromFirebase()` with `_dataLoaded = true` | `firebase-sync.js` |
| 10 | Protected realtime listener using `applyRemoteData()` | `firebase-sync.js` |
| 11 | Protected visibility handler using `applyRemoteData()` | `firebase-sync.js` |
| 12 | `applyRemoteData()` as canonical merge (all 14 fields) | `firebase-sync.js` |

**Verify after split**: `saveData()` and `saveDataImmediate()` have IDENTICAL 5 guards:
```javascript
if (firebaseInitialized && !pinValidated) return;
if (firebaseInitialized && !initialLoadComplete) return;
if (firebaseInitialized && !hasLoadedFromCloud) return;
if (firebaseInitialized && !_dataLoaded) return;             // NEW — 5th guard
if (firebaseInitialized && isEmptyState(data)) return;       // With .pages fix
```

**AND both use `buildSaveData()` to construct identical data objects** (including `commandCenterData`).

---

## APPENDIX A: ALL BUGS FIXED DURING SPLIT

| # | Bug | Severity | File | Fix |
|---|-----|----------|------|-----|
| 1 | `isEmptyState()` checks `.entries` instead of `.pages` for notebook | **HIGH** — data wipe risk | state.js | Change to `.pages` |
| 2 | Missing `_dataLoaded` field — 4 guards instead of 5 | **HIGH** — data wipe risk | state.js + firebase-sync.js | Add field + 5th guard |
| 3 | Missing `_version: 0` in defaults | **HIGH** — fresh-browser overwrite | state.js | Add global var |
| 4 | `saveDataImmediate()` has ONLY 1 guard (should be 5) | **CRITICAL** — data wipe risk | firebase-sync.js | Full rewrite with 5 guards |
| 5 | `saveDataImmediate()` missing `commandCenterData` | **HIGH** — data loss on force-save | firebase-sync.js | Use `buildSaveData()` |
| 6 | `saveDataImmediate()` saves raw `focusModeData` | **MEDIUM** — timer state leak | firebase-sync.js | Use `buildSaveData()` |
| 7 | Focus timer saves every 1 second | **MEDIUM** — excessive Firebase writes | focus-pomodoro.js | Save every 10 seconds |
| 8 | Visibility handler has ~155 lines of inline merge logic | **LOW** — maintainability | firebase-sync.js | Use `applyRemoteData()` |
| 9 | 3 duplicated merge locations | **LOW** — maintainability | firebase-sync.js | Consolidate to `applyRemoteData()` |
| 10 | No error handling in init flow | **MEDIUM** — crash recovery | init.js | Wrap in try/catch |
| 11 | Monkey-patching for compact header updates | **LOW** — fragile, order-dependent | init.js + tasks.js + firebase-sync.js | Direct function calls |
| 12 | Console.log left in production | **LOW** — noise | deleted | Remove debug logs |
| 13 | `applyRemoteData()` may be missing fields | **MEDIUM** — sync gaps | firebase-sync.js | Audit all 14 fields |
| 14 | No `buildSaveData()` helper — data objects can diverge | **HIGH** — data mismatch | firebase-sync.js | Create shared helper |

---

## APPENDIX B: FUNCTIONS BY MODULE (~365 Total)

| Module | Count | Key Functions |
|--------|-------|---------------|
| state.js | ~32 | generateId, getValues, getCount, isEmptyState, hasRealData, safeLocalStorageSet, showToast, ensureModalOnBody, escapeHtml, getLocalDateString, parseLocalDate |
| firebase-sync.js | ~27 | saveData (5 guards), saveDataImmediate (5 guards), buildSaveData, loadDataFromFirebase, applyRemoteData, setupMainDataRealtimeSync, checkpoint system (8 funcs), initializeFirebase |
| medications.js | ~10 | updateMedCard, takeMed, checkAndApplyDailyPillReduce, saveMedSettings |
| financials.js | ~38 | 7 render functions, CRUD for bills/expenses/cards/actions, calculateFinancialStatus |
| calendar.js | ~22 | renderCalendarGrid, renderCountdowns, generateCalendar, pill assignment CRUD, calendar notes |
| daily-planner.js | ~28 | renderPlannerTimeline, events CRUD, clock, EOD reset, checkCriticalEODReset, checkPlannerReset |
| notebook.js | ~16 | pages CRUD, editor, formatting, keyboard shortcuts |
| tasks.js | ~35 | addTask, renderTasks, toggleTask, dashboard, updateStats, renderFocusMode, switchToFocusMode/FullView |
| triage.js | ~35 | switchCommandCenterMode, renderTriageMode, setTaskTier, drag-drop, quickAddFromFocus, triageQuickAddTask |
| crash-out.js | ~40 | renderCrashOutTimeline, reorder system (14 funcs), duration, time prompts (12 funcs), scheduling |
| focus-pomodoro.js | ~23 | timer, checklist, completion, XP awards |
| init.js | ~20 | awardCommandCenterXP, gamification (8 funcs), Quick Add (8 funcs), compact header (4 funcs), initApp |

---

## APPENDIX C: 4 TASK CREATION PATHS (Must ALL work after split)

| Site | Function | File After Split | Approx Line (Current) |
|------|----------|-----------------|----------------------|
| 1 | `addTask()` | tasks.js | ~18472 |
| 2 | `triageQuickAddTask()` | triage.js | ~20426 |
| 3 | `quickAddFromFocus()` | triage.js | ~19559 |
| 4 | `submitQuickAdd()` | init.js | ~22793 |

### Task Field Checklist — ALL 4 paths must create tasks with these fields:
```javascript
{
    id: generateId('task'),        // ← verify all 4 use generateId
    text: <user input>,
    category: <selected>,
    completed: false,
    doToday: <true/false>,
    createdAt: new Date().toISOString(),
    size: <small/medium/big>,      // ← verify all 4 include size
    highLeverage: <true/false>,    // ← verify all 4 include highLeverage
    sortOrder: getCount(tasks)     // ← verify all 4 include sortOrder
}
```

After split, read all 4 functions and verify identical field sets. If `triageQuickAddTask()` or `quickAddFromFocus()` are missing `size` or `highLeverage`, add them with sensible defaults.

---

## APPENDIX D: WINDOW.X BINDINGS REQUIRED

Functions used in dynamically generated `onclick` strings must be explicitly bound to `window`. After extraction to separate files, `var` function declarations in one file are on `window` globally — BUT it's safest to add explicit bindings for functions used in innerHTML.

### Already Bound (lines 21675-21688 — move to bottom of crash-out.js):
```
moveTaskUp, moveTaskDown, moveTaskToTop, moveTaskToBottom,
promptTaskPosition, swapAdjacentTasks, moveTaskToPosition,
setTaskPosition, handleTimelineDragStart, handleTimelineDragOver,
handleTimelineDragLeave, handleTimelineDrop, handleTimelineDragEnd
```

### Audit Required — Functions used in onclick strings across ALL render functions:
Search the codebase for patterns like `onclick="functionName(` in all rendering functions. Common candidates:
- `setDurationDirect`, `openDurationModal` (crash-out timeline)
- `sendToCrashOut`, `removeFromCrashOut` (triage cards)
- `startTaskInFocus` (triage/crash-out)
- `toggleTriageTask`, `showTaskDetailsModal` (triage cards)
- `unflagFromToday` (task details)
- `setTaskTier` (triage columns)
- `selectQACategory`, `selectQASize` (Quick Add — in HTML, not dynamic)
- All financial cockpit edit/delete functions (in financials.js render functions)
- All calendar/planner edit/delete functions

**Rule**: After extraction, test every button in every render. If a button silently fails, check console for "X is not a function" — add the missing `window.X = X` binding.

---

## APPENDIX E: KEY DEPENDENCIES & ENTANGLEMENT

### Top 5 Most-Called Functions (affect loading order)
| Function | Call Count | Defined In | Called From |
|----------|-----------|------------|-------------|
| `saveData()` | 87 | firebase-sync.js | ALL modules |
| `renderFocusMode()` | 26 | tasks.js | tasks, triage, crash-out, focus, init |
| `showToast()` | ~40 | state.js | ALL modules |
| `renderTasks()` | ~15 | tasks.js | tasks, triage, crash-out, focus, init |
| `updateStats()` | ~12 | tasks.js | tasks, triage, crash-out, focus, init |

### Clean Module Boundaries (zero cross-contamination)
- **financials.js** ↔ medications.js: ZERO shared functions
- **notebook.js** ↔ everything: Only calls saveData() and showToast()
- **calendar.js** ↔ financials.js: ZERO shared functions

### High Entanglement (requires careful ordering)
- **triage.js** → calls `renderFocusMode()` (tasks.js), `awardCommandCenterXP()` (init.js — forward ref, safe at runtime)
- **crash-out.js** → calls `renderFocusMode()` (tasks.js), functions from triage.js
- **focus-pomodoro.js** → calls `renderFocusMode()` (tasks.js), `awardCommandCenterXP()` (init.js — forward ref)

All cross-module calls are runtime (event handlers), not parse-time. Loading order ensures availability.

---

## ROLLBACK STRATEGY

| Situation | Action | Time to recover |
|-----------|--------|----------------|
| Phase fails mid-way | `git reset --hard <last-good-commit>` | 5 seconds |
| Multiple phases tangled | `git checkout main && git branch -D split-index-html` | 5 seconds |
| Somehow pushed bad code to main | `git revert HEAD && git push` | 30 seconds |
| Need to restore app data | Use checkpoint manager → restore "Pre-split checkpoint" | 10 seconds |
| Everything is on fire | `git log --oneline`, find pre-split commit, checkout that file | 1 minute |

**Firebase data is NEVER affected** — same state shape, same paths, same PIN. Your data is safe no matter what happens to the code.
