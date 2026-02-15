# EXECUTE: Split stimulant-elimination-calculator.html into Separate JS Files

> **TRIGGER**: When Sully says "execute split plan", follow this document phase by phase.
> **Skill**: Load `stim-calc-dev` skill for context. Read this file fully before starting.
> **Approach**: Use a multi-agent team (5+) — one agent per phase, with verification between phases.

---

## WHAT'S BROKEN AND WHY THIS SPLIT FIXES IT

### The Problem (Why the App is ~60% Useful)
Sully's stim calc app predicts when he can fall asleep based on Adderall XR, caffeine, circadian rhythm, and modifiers. The prediction is unreliable because:

1. **The calibration system is broken** — 3 functions use raw `actualSleep - predictedSleep` instead of midnight-safe `computeSleepDelta()`, corrupting accuracy tracking. The calibration never auto-applies — it only suggests changes the user must manually enter.
2. **`recalculate()` is a 400-line god function** that runs every 5 seconds, mixes DOM reads + calculations + DOM writes, and any single runtime error crashes the app repeatedly every 5 seconds with no recovery.
3. **8 redundant `calculateSleepTime()` calls per 5-second cycle** (1 main + 1 workout preview + 6 what-if scenarios) — each triggers iterative binary search calling `calculateAmpLoad()` hundreds of times.
4. **The 11,500-line single file is unmaintainable** — Claude Code cannot reliably debug interconnected features because it can't hold the full context, leading to regressions on every fix attempt.
5. **4 duplicated merge blocks** for Firebase state merging — any fix applied to one is missed in the other 3.
6. **Circadian zones use only today's wake time** instead of the 7-day average, making predictions shift wildly based on a single day's input.
7. **Ghost load display ignores VitC** — shows wrong residual amounts when VitC is active.
8. **Workout planner double-counts adenosine** — both raises threshold AND subtracts time in the display.

### How the Split Fixes It
- **Each module is small enough for Claude Code to fully understand** (~200-900 lines vs 8,400)
- **Bugs are fixed during extraction** — midnight-crossing, double-counting, dead code, duplicated logic
- **`recalculate()` is refactored** into 3 clean phases with try/catch error isolation
- **4 merge blocks consolidated** into 1 `mergeRemoteState()` function
- **Performance optimized** — skip what-if when accordion closed, throttle graph redraws
- **~150 lines of dead code removed** (focus mode CSS/JS)

### What Does NOT Change
- Firebase data structure — identical paths, identical state shape
- PIN auth — same hash, same guards
- All 5 save guards — preserved exactly in both save functions
- GitHub Pages deployment — push to main → live in ~30s
- User experience — app looks and behaves identically (but faster and more reliable)

---

## FILE STRUCTURE (10 JS Files)

```
dental-quest/
├── stimulant-elimination-calculator.html  (CSS + HTML only, ~3,106 lines — no JS)
└── js/
    └── stimcalc/
        ├── state.js              (~400 lines)  - State factory, utilities, time helpers, globals
        ├── pharma-engine.js      (~550 lines)  - Pharmacokinetic calculations + VitC model
        ├── circadian.js          (~200 lines)  - Circadian analysis, forbidden zone, sleep gate
        ├── sleep-prediction.js   (~300 lines)  - The 7-phase sleep prediction algorithm
        ├── firebase-sync.js      (~900 lines)  - Firebase, auth, save/load, sync, checkpoints
        ├── med-caffeine.js       (~400 lines)  - Medication + caffeine CRUD + rendering
        ├── ui-sections.js        (~1,200 lines) - Nicotine, modifiers, all-nighter, workout, what-if, forecast
        ├── history-calendar.js   (~800 lines)  - History, calibration, sleep calendar, performance
        ├── graph.js              (~400 lines)  - Canvas graph + sleep performance graph
        └── init.js               (~500 lines)  - Init, recalculate (refactored), accordion, unified view
```

### Script Loading Order (in HTML, ORDER MATTERS)
```html
<!-- Firebase SDK (unchanged) -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>

<!-- App JS Files — dependencies flow downward -->
<script src="js/stimcalc/state.js"></script>           <!-- 1. Pure utilities, no deps -->
<script src="js/stimcalc/pharma-engine.js"></script>    <!-- 2. Needs state.js -->
<script src="js/stimcalc/circadian.js"></script>        <!-- 3. Needs state.js -->
<script src="js/stimcalc/sleep-prediction.js"></script> <!-- 4. Needs pharma-engine + circadian -->
<script src="js/stimcalc/firebase-sync.js"></script>    <!-- 5. Needs state.js, calls renderAll -->
<script src="js/stimcalc/med-caffeine.js"></script>     <!-- 6. Needs state.js, calls saveState -->
<script src="js/stimcalc/ui-sections.js"></script>      <!-- 7. Needs pharma + sleep-prediction -->
<script src="js/stimcalc/history-calendar.js"></script> <!-- 8. Needs state.js, calls saveState -->
<script src="js/stimcalc/graph.js"></script>            <!-- 9. Needs pharma-engine + circadian -->
<script src="js/stimcalc/init.js"></script>             <!-- 10. LAST — needs everything -->
```

---

## PRE-FLIGHT CHECKLIST (Do Before Phase 1)

```bash
# 1. Create checkpoint in the app UI (use checkpoint manager button)
# 2. Commit current state
git add -A && git commit -m "Pre-split checkpoint"
# 3. Create feature branch
git checkout -b split-stim-calc
# 4. Create directory
mkdir -p js/stimcalc
# 5. Verify app works — open in browser, check no console errors
```

---

## PHASE 1: Extract Leaf Modules (state.js + circadian.js)

**Risk level**: ZERO — these are pure functions with no dependencies on other app code.

### state.js — What Goes In

**Global variable declarations** (copy from top of `<script>` block, ~lines 3107-3220):
```javascript
// Declare ALL of these at the top of state.js:
var state = null;
var isInitialLoad = true;
var hasLoadedFromCloud = false;
var pinValidated = false;
var hyperarousalMode = false;
var focusMode = false;
var currentEditingDate = null;
var sleepPerfExpanded = true;
var accuracyDashExpanded = true;
var explainerTimeout = null;
var forecastExpanded = false;
var firebaseSaveTimeout = null;
var lastLocalSave = 0;
var lastAutoSavePredictionTime = 0;
var lastAutoSavePredictionMinutes = null;
```

**Functions to extract** (use Read tool to find exact boundaries, then copy):
| Function | Approx Line | Notes |
|----------|-------------|-------|
| `getDefaultState()` | ~3114 | State factory |
| `isEmptyState()` | ~3222 | CRITICAL — save guard |
| `hasRealData()` | ~3240 | |
| `generateId()` | ~3258 | |
| `migrateArrayToObject()` | ~3268 | |
| `getValues()` | ~3293 | |
| `getCount()` | ~3300 | |
| `safeLocalStorageSet()` | ~3310 | |
| `escapeHtml()` | ~3331 | |
| `BackupManager` | ~3338-3414 | Object, not function |
| `getLocalDateString()` | ~3604 | |
| `parseLocalDate()` | ~3609 | |
| `timeToMinutes()` | ~3615 | |
| `minutesToTime()` | ~3624 | |
| `minutesToTimeWithDay()` | ~3634 | |
| `minutesToTimeValue()` | ~3645 | |
| `computeSleepDelta()` | ~3648 | Midnight-safe |
| `snapshotPredictionInputs()` | ~3657 | |
| `migrateHistoryEntries()` | ~3678 | **BUG FIX — see below** |
| `getCurrentMinutes()` | ~4815 | |
| `formatTime12()` | ~5105 | |
| `safeSetValue()` | ~11115 | |
| `safeGetValue()` | ~11121 | |
| `showToast()` | ~10584 | **Keep ONLY this one** (delete duplicate at ~6806) |
| `showCustomAlert()` | ~6840 | |
| `showCustomConfirm()` | ~6855 | |

**BUG FIX in `migrateHistoryEntries()`** (apply during extraction):
```javascript
// WRONG (current code at ~line 3684):
entry.deltaMinutes = entry.actualSleep - entry.predictedSleep;
// FIXED:
entry.deltaMinutes = computeSleepDelta(entry.predictedSleep, entry.actualSleep);
entry.absError = Math.abs(entry.deltaMinutes);
```

### circadian.js — What Goes In

| Function | Approx Line | Notes |
|----------|-------------|-------|
| `analyzeCircadianPhase()` | ~3421 | 7-day circular mean |
| `getForbiddenZone()` | ~3945 | **BUG FIX — see below** |
| `getSleepGate()` | ~3953 | |
| `isInForbiddenZone()` | ~3961 | |
| `isInSleepGate()` | ~3971 | |
| `getForbiddenZoneEnd()` | ~3980 | |

**BUG FIX in `getForbiddenZone()` and `getSleepGate()`** (apply during extraction):
```javascript
// WRONG (current): Uses state.wakeTime directly
// FIXED: Use 7-day average wake time when available
function getForbiddenZone() {
    const phase = analyzeCircadianPhase();
    const wakeMin = (phase && phase.avgWakeTime) ? phase.avgWakeTime : timeToMinutes(state.wakeTime);
    // ... rest of function uses wakeMin instead of timeToMinutes(state.wakeTime)
}
// Apply same pattern to getSleepGate()
```

### Phase 1 Steps
1. Create `js/stimcalc/state.js` with all globals + functions listed above (with bug fixes applied)
2. Create `js/stimcalc/circadian.js` with all circadian functions (with bug fix applied)
3. In `stimulant-elimination-calculator.html`: Add 2 `<script src="...">` tags BEFORE the existing `<script>` block
4. In `stimulant-elimination-calculator.html`: DELETE the extracted functions from the inline `<script>` (keep everything else)
5. Verify brace balance: `python3 -c "c=open('js/stimcalc/state.js').read(); print(c.count('{'), c.count('}'))"`
6. **TEST**: Reload app in browser. No console errors. Sleep prediction still shows.
7. **COMMIT**: `git add -A && git commit -m "Phase 1: Extract state.js + circadian.js (leaf modules)"`

---

## PHASE 2: Extract Calculation Engine (pharma-engine.js + sleep-prediction.js)

**Risk level**: LOW — pure calculation functions, depend only on state.js + circadian.js.

### pharma-engine.js — What Goes In

| Function | Approx Line | Notes |
|----------|-------------|-------|
| `VITAMIN_C_EFFECT_HOURS` (constant) | ~4833 | `= 8` |
| `getVitaminCTimeMinutes()` | ~4898 | |
| `getRawVitaminCTimeMinutes()` | ~4938 | |
| `isVitaminCEffective()` | ~4960 | |
| `getVitaminCStatus()` | ~4970 | |
| `calculateSleepDebtBonus()` | ~3719 | **BUG FIX — see below** |
| `getSleepDebtBreakdown()` | ~3780 | |
| `getEffectiveThreshold()` | ~3848 | |
| `isHyperarousalMode()` | ~3937 | |
| `calculateDecayWithVitC()` | ~3988 | Core 3-segment model |
| `calculateAmpLoad()` | ~4036 | XR 50/50 split |
| `calculateCaffLoad()` | ~4102 | Simple decay |
| `findAmpClearTime()` | ~4145 | Iterative binary search |
| `findCaffClearTime()` | ~4209 | Simple binary search |
| `getYesterdayMedications()` | ~5029 | |
| `getYesterdayCaffeine()` | ~5039 | |
| `calculateYesterdayDoseRemaining()` | ~5049 | **BUG FIX — see below** |

**DO NOT INCLUDE**: `getCortisolClearTime()` (~line 4237) — it's dead code (returns null, never used). Delete it.

**BUG FIX in `calculateSleepDebtBonus()`** (apply during extraction):
```javascript
// WRONG (current): Sets global hyperarousalMode as side effect
//   hyperarousalMode = true;  // line ~3756
// FIXED: Return it as part of result, set global from caller
function calculateSleepDebtBonus() {
    // ... existing calculation ...
    const result = { bonus: totalBonus, isHyperarousal: hoursSlept < 4 };
    hyperarousalMode = result.isHyperarousal;  // Still set global for backward compat
    return result.bonus;  // Return value unchanged for callers
}
```

**BUG FIX in `calculateYesterdayDoseRemaining()`** (apply during extraction):
```javascript
// WRONG (current at ~line 5049): Uses simple decay, ignores VitC
//   const remaining = totalDose * Math.pow(0.5, elapsed / halfLifeMinutes);
// FIXED: Use calculateDecayWithVitC() for consistency with main engine
// (Apply only if VitC was active yesterday — check dates)
```

### sleep-prediction.js — What Goes In

| Function | Approx Line |
|----------|-------------|
| `calculateSleepTime()` | ~4242 |

This is ONE function (~280 lines) — the core 7-phase algorithm. It calls functions from `pharma-engine.js` and `circadian.js`, all accessible via globals.

### Phase 2 Steps
1. Create `js/stimcalc/pharma-engine.js` with all pharma functions (with bug fixes)
2. Create `js/stimcalc/sleep-prediction.js` with `calculateSleepTime()`
3. Add 2 `<script src="...">` tags in correct order (pharma before sleep-prediction)
4. Delete extracted functions from inline `<script>`. Also delete dead `getCortisolClearTime()`.
5. Verify brace balance for both new files
6. **TEST**: Reload. Sleep prediction still works. Graph still renders. What-if scenarios work.
7. **COMMIT**: `git add -A && git commit -m "Phase 2: Extract pharma-engine.js + sleep-prediction.js"`

---

## PHASE 3: Extract Firebase/Sync Layer (firebase-sync.js)

**Risk level**: HIGH — this is the most critical module. One wrong move wipes data. Go slow.

### firebase-sync.js — What Goes In

**Global variables:**
```javascript
var firebaseConfig = { /* ... existing config — DO NOT CHANGE ... */ };
var firebaseInitialized = false;
var database = null;
var firebaseSyncEnabled = false;
var currentUser = null;
var userPath = null;
var localChangesSinceLastSync = false;
var lastSyncTimestamp = null;
var realtimeSyncEnabled = false;
var lastKnownTimestamp = null;
```

**Functions** (all from ~lines 8985-10535):
| Function | Approx Line | Category |
|----------|-------------|----------|
| `updateSyncStatus()` | ~8985 | UI |
| `deepMerge()` | ~9019 | Utility |
| `markLocalChange()` | ~9040 | Tracking |
| `showSyncConflictModal()` | ~9045 | UI |
| `initFirebase()` | ~9227 | Init |
| `setupUserAuth()` | ~9280 | Auth |
| `promptForPin()` | ~9297 | Auth UI |
| `submitPin()` | ~9332 | Auth |
| `skipPin()` | ~9350 | Offline mode |
| `saveToFirebase()` | ~9364 | Persistence |
| `loadFromFirebase()` | ~9403 | **REFACTOR — use mergeRemoteState()** |
| `mergeRemoteState()` | **NEW** | **Consolidates 4 duplicated merge blocks** |
| `setupRealtimeSync()` | ~9557 | **REFACTOR — use mergeRemoteState()** |
| `forceCloudSync()` | ~9655 | Manual sync |
| `createCheckpoint()` | ~9717 | Checkpoint |
| `showCheckpointManager()` | ~9744 | Checkpoint UI |
| `restoreCheckpoint()` | ~9814 | Checkpoint |
| `deleteCheckpoint()` | ~9850 | Checkpoint |
| `exportCheckpoint()` | ~9870 | Checkpoint |
| `exportAllCheckpoints()` | ~9880 | Checkpoint |
| `isValidAppData()` | ~9910 | Validation |
| `importCheckpoint()` | ~9924 | Checkpoint |
| `importAndRestoreDirectly()` | ~10010 | Checkpoint |
| `forceUploadToCloud()` | ~10081 | Force sync |
| `forcePullFromCloud()` | ~10116 | **REFACTOR — use mergeRemoteState()** |
| `renderAll()` | ~10170 | Master re-render |
| `applyRemoteState()` | ~10199 | **REFACTOR — use mergeRemoteState()** |
| `saveState()` | ~10322 | **5 GUARDS — do not touch** |
| `saveStateImmediate()` | ~10381 | **5 GUARDS — must match saveState()** |
| `loadState()` | ~10433 | localStorage load |

**Also move into this file** (currently elsewhere):
- Visibility change handler (~line 10249) — has inline save with 4 guards
- beforeunload handler (~line 10307) — has inline localStorage save with 4 guards

**NEW FUNCTION — `mergeRemoteState(remoteData)`:**
```javascript
// Extract the COMMON merge logic from these 4 locations:
// 1. loadFromFirebase() (~9403)
// 2. setupRealtimeSync() callback (~9557)
// 3. visibilitychange "visible" handler (~10249)
// 4. applyRemoteState() (~10199)
//
// The merge pattern is always:
// - For collections (medications, caffeine, history, sleepHistory): call migrateArrayToObject(), Firebase wins
// - For scalars (wakeTime, settings, etc.): Firebase wins if present
// - ALWAYS preserve state._dataLoaded = true after merge
// - ALWAYS call migrateArrayToObject on meds/caffeine/history/sleepHistory
function mergeRemoteState(remoteData) {
    if (!remoteData) return;
    const remote = remoteData.state || remoteData;

    // Merge collections (Firebase wins)
    if (remote.medications) state.medications = migrateArrayToObject(remote.medications);
    if (remote.caffeine) state.caffeine = migrateArrayToObject(remote.caffeine);
    if (remote.history) state.history = migrateArrayToObject(remote.history);
    if (remote.sleepHistory) state.sleepHistory = migrateArrayToObject(remote.sleepHistory);

    // Merge scalars (Firebase wins if present)
    if (remote.wakeTime) state.wakeTime = remote.wakeTime;
    if (remote.hoursSleptLastNight !== undefined) state.hoursSleptLastNight = remote.hoursSleptLastNight;
    if (remote.settings) state.settings = { ...state.settings, ...remote.settings };
    if (remote.modifiers) state.modifiers = { ...state.modifiers, ...remote.modifiers };
    if (remote.nicotine) state.nicotine = remote.nicotine;
    if (remote.workoutPlan) state.workoutPlan = remote.workoutPlan;
    if (remote.allNighterMode !== undefined) state.allNighterMode = remote.allNighterMode;
    if (remote._version !== undefined) state._version = remote._version;

    // CRITICAL: Always preserve _dataLoaded
    state._dataLoaded = true;
}
```
Then refactor the 4 call sites to use `mergeRemoteState(data)` instead of their inline merge logic.

### Phase 3 Steps
1. Create `js/stimcalc/firebase-sync.js` with all functions listed above
2. Create `mergeRemoteState()` and refactor the 4 merge sites to use it
3. Move visibility + beforeunload handlers into this file
4. Add `<script src="...">` tag after sleep-prediction.js
5. Delete extracted functions from inline `<script>`
6. Verify brace balance
7. **CRITICAL TEST SEQUENCE** (do ALL of these):
   - [ ] Reload app → sync indicator shows 🟢
   - [ ] Add a medication → reload → still there
   - [ ] Add caffeine → reload → still there
   - [ ] Open in second tab → change in one → reflects in other (realtime sync)
   - [ ] Create checkpoint → appears in manager
   - [ ] Export checkpoint → valid JSON
   - [ ] Switch tabs away and back → no data loss
   - [ ] Close browser → reopen → data persists
   - [ ] In incognito → PIN entry → data loads from cloud
8. **COMMIT**: `git add -A && git commit -m "Phase 3: Extract firebase-sync.js, consolidate 4 merge blocks"`

---

## PHASE 4: Extract UI Modules (med-caffeine.js + ui-sections.js + history-calendar.js + graph.js)

**Risk level**: MEDIUM — lots of functions, but each is self-contained.

### med-caffeine.js — Functions from ~lines 4530-4820
`addMedEntry`, `cleanupOldMedications`, `removeMedEntry`, `updateMedEntry`, `renderMedEntries`, `updateStackingWarning`, `addCaffeine`, `addCustomCaffeine`, `removeCaffeine`, `renderCaffeineEntries`, `updateCaffeineTime`, `updateCaffeineDate`

### ui-sections.js — Functions from multiple ranges

**Nicotine** (~6450-6805): `NICOTINE_CONSTANTS`, `logNicotine`, `clearNicotine`, `updateNicotineTime`, `updateNicotineDisplay`, `updateNicotineWarnings`, `getRelaxationProtocol`, `checkRLSRisk`, `getNicotineCooldownTime`

**Modifiers/VitC UI** (~4833-4990 + ~11409-11479): `toggleModifier` (keep ONLY unified view version at ~11479, delete old at ~4833), `updateModifierTimeInputs`, `updateVitaminCDate`, `updateVitCBadge`, `restoreModifierUI`

**All-Nighter** (~4994-5178): `toggleAllNighterMode`, `updateAllNighterUI`, `renderGhostLoad`

**Workout Planner** (~5186-5625 + ~9380): `initWorkoutPlanner`, `updateWorkoutTimeline`, `calculateWorkoutImpact`, `updateWorkoutPlan`, `applyWorkoutPlan`, `resetWorkoutPlan`, `toggleFastedState`, `restoreWorkoutPlanUI`, `updateWorkoutStatus`, `toggleSettings`

**What-If Scenarios** (~6862-7070): `updateScenarios`, `simulateCaffeineAddition`, `simulateVitaminC`, `simulateSauna`, `simulateNicotineHit`, `updateScenarioDisplay`, `simulateScenario`

**Forecast** (~10540-11103): `clearToday`, `toggleForecastLogic`, `copyForecastLogic`, `generateForecastLogic`, `updateForecastLogic`

### history-calendar.js — Functions from ~lines 7462-9106
`autoSavePrediction`, `saveDay`, `toggleHistorySection`, `autoPopulateFeedback`, `renderHistory`, `cleanupHistory`, `renderSleepCalendar`, `renderCircadianPhase`, `openSleepEditModal`, `closeSleepEditModal`, `saveSleepEdit`, `setAllNighter`, `clearSleepEntry`, `updateTodaySleepHistory`, `updateTodayWakeTime`, `toggleSleepPerformance`, `toggleAccuracyDashboard`, `renderSleepPerformance`, `getSleepDataForDays`, `renderAccuracyDashboard`, `renderAccuracyHeroHint`, `showExplainer`, `hideExplainer`, `renderSleepAchievements`, `renderSleepHistoryList`, `showFeedbackModal`, `closeFeedbackModal`, `submitFeedback`, `calculateAccuracyStats`, `getCalibrationRecommendation`, `getRecentPredictions`, `suggestCalibration`

### graph.js — Functions from ~lines 7076-7460 + ~8507-8661
`drawGraph`, `setupGraphTooltip`, `hexToRgb`, `drawSleepPerformanceGraph`, `setupSleepGraphTooltip`, `getCardinalSplinePoints`

### Bug Fixes to Apply During Phase 4

**FIX 1 — `renderHistory()` accuracy display** (in history-calendar.js):
```javascript
// WRONG (at ~line 7654):
const diff = Math.abs(entry.actualSleep - entry.predictedSleep);
// FIXED:
const diff = Math.abs(computeSleepDelta(entry.predictedSleep, entry.actualSleep));
```

**FIX 2 — `suggestCalibration()` delta** (in history-calendar.js):
```javascript
// WRONG (at ~line 9097):
const avgDiff = withFeedback.reduce((sum, h) => sum + (h.actualSleep - h.predictedSleep), 0) / withFeedback.length;
// FIXED:
const avgDiff = withFeedback.reduce((sum, h) => sum + computeSleepDelta(h.predictedSleep, h.actualSleep), 0) / withFeedback.length;
```

**FIX 3 — `updateWorkoutPlan()` unnecessary recalc** (in ui-sections.js):
```javascript
// Add at top of updateWorkoutPlan():
if (!state.workoutPlan || !state.workoutPlan.applied) {
    // Just update UI without running full calculateSleepTime()
    return;
}
```

**FIX 4 — `updateScenarios()` skip when closed** (in ui-sections.js):
```javascript
// Add at top of updateScenarios():
const section = document.querySelector('.accordion-section[data-section="whatif"]');
if (section && !section.classList.contains('open')) return;
```

**FIX 5 — Settings parsed with `||` not `??`** (fix in init.js during Phase 5):
```javascript
// WRONG (at ~lines 5663-5667):
state.settings.ampHalfLife = parseFloat(val) || state.settings.ampHalfLife;
// FIXED:
state.settings.ampHalfLife = parseFloat(val) ?? state.settings.ampHalfLife;
```

**FIX 6 — Resolve duplicate `showToast()`**: Delete the simple version (~line 6806). Keep ONLY the version in state.js (~line 10584).

**FIX 7 — Resolve duplicate `toggleModifier()`**: Delete old version (~line 4833). Keep ONLY unified view version from ~line 11479 (goes into ui-sections.js).

### Phase 4 Steps
1. Create all 4 files with their respective functions
2. Apply all 7 bug fixes listed above
3. Add 4 `<script src="...">` tags in correct order
4. Delete extracted functions + both duplicate function bodies from inline `<script>`
5. Verify brace balance for all 4 new files
6. **TEST**: Every accordion section opens. Nicotine logging works. Workout planner works. What-if shows scenarios. History renders. Graph draws. Sleep calendar shows.
7. **COMMIT**: `git add -A && git commit -m "Phase 4: Extract 4 UI modules, fix 7 bugs"`

---

## PHASE 5: Extract init.js and Refactor recalculate()

**Risk level**: HIGH — this is the hardest phase. `recalculate()` is the app's heartbeat.

### init.js — What Goes In

**The refactored `recalculate()`** — split the ~400-line monster into 3 clean phases:

```javascript
function syncStateFromDOM() {
    // Extract from recalculate() lines ~5639-5698
    // Read ~20 DOM inputs → update state
    // wakeTime, hoursSleptLastNight, settings (halfLife, threshold, caffHL, caffThreshold)
    // VitC state, sauna state, modifier states
}

function runCalculations() {
    // Extract from recalculate() lines ~5700-5900
    // Pure calculation → produce results
    // calculateSleepDebtBonus, getEffectiveThreshold, analyzeCircadianPhase,
    // calculateAmpLoad(now), calculateCaffLoad(now), calculateSleepTime(),
    // findAmpClearTime, findCaffClearTime, sleep hours calculation
    // Returns a viewModel object with all computed values
}

function updateUI(vm) {
    // Extract from recalculate() lines ~5900-6036
    // Write results → DOM (50+ elements)
    // Hero display, countdown, status pills, blocking factors,
    // sleep debt display, circadian status, recommendations,
    // feelings timeline, then call:
    // updateStackingWarning, drawGraph, updateScenarios, renderGhostLoad,
    // updateWorkoutPlan, updateAccordionSummaries, updateHeroProgressBar,
    // updateStatusPillColors, updateVitCBadge, updateForecastLogic,
    // updateNicotineDisplay, updateTodaySleepHistory
}

function recalculate() {
    try {
        syncStateFromDOM();
        var vm = runCalculations();
        updateUI(vm);
        autoSavePrediction(vm.sleepTime);
    } catch (e) {
        console.error('[recalculate] Error:', e);
        var heroEl = document.getElementById('sleepTime');
        if (heroEl) heroEl.textContent = 'Calc Error';
    }
}
```

**Other functions for init.js:**
| Function | Current Line |
|----------|-------------|
| `init()` | ~11126 |
| `toggleAccordion()` | ~11233 |
| `restoreAccordionStates()` | ~11243 |
| `updateAccordionSummaries()` | ~11261 |
| `updateHeroProgressBar()` | ~11349 |
| `updateStatusPillColors()` | ~11364 |
| `renderRecentNights()` | ~11381 |
| `initUnifiedView()` | ~11504 |
| `updateStatusItem()` | ~6289 |
| `updateRecommendations()` | ~6352 |
| `updateFeelingsTimeline()` | ~6537 |

**Focus mode stubs** (keep as safety no-ops):
```javascript
function setViewMode() {}
function renderFocusMode() {}
function drawFocusGraph() {}
function focusConfirmMeds() {}
function focusEditMeds() {}
function focusAddCaffeine() {}
function focusRemoveCaffeine() {}
function updateFocusMedsStatus() {}
function updateFocusCoffeeStatus() {}
function renderFocusCaffeineList() {}
function initFocusMode() {}
```

**Event registration** (at bottom of init.js):
```javascript
document.addEventListener('DOMContentLoaded', init);
```

### Phase 5 Steps
1. Create `js/stimcalc/init.js` with refactored recalculate + all init functions
2. Delete the now-empty inline `<script>` block from HTML entirely
3. Add `<script src="js/stimcalc/init.js"></script>` as the LAST script tag
4. **Remove dead CSS** from the `<style>` block:
   - Focus mode CSS (~lines 77-200): `.focus-container`, `.focus-hero`, `.focus-card`, etc.
   - Dead container: `.container { display: none; }`
5. Verify brace balance for init.js
6. Verify the HTML file now has ZERO inline `<script>` content (only `<script src="...">` tags)
7. **FULL TEST** — every single feature:
   - [ ] Hero: sleep time shows, countdown updates, progress bar fills
   - [ ] Graph: canvas renders curves, zones, threshold, markers
   - [ ] Graph tooltip: mouseover shows load values
   - [ ] Medications: add, edit, delete, render
   - [ ] Caffeine: add, remove, time/date change
   - [ ] Modifiers: VitC/sauna/lift toggle, time inputs, VitC badge
   - [ ] All-nighter: toggle, ghost load display
   - [ ] Nicotine: log, clear, display, warnings, RLS risk
   - [ ] Workout: init, impact calc, apply, reset, fasted toggle
   - [ ] What-If: 6 scenarios project correctly
   - [ ] Accordions: open/close, persist in localStorage, summaries update
   - [ ] Sleep calendar: 7-day grid
   - [ ] Circadian phase: displays
   - [ ] History: saves and renders
   - [ ] Accuracy dashboard: stats display
   - [ ] Calibration: suggestion appears with enough data
   - [ ] Sleep performance: 30-day stats + chart
   - [ ] Achievements: render
   - [ ] Forecast logic: diagnostic text generates
   - [ ] Recommendations: render based on state
   - [ ] Recent nights: 7-day pills in header
   - [ ] Status pills: amp/caff badges update
   - [ ] Cross-app: projectedSleepTime saved to Firebase
   - [ ] Mobile: responsive, tappable
   - [ ] 5-second loop: recalculate runs without errors
   - [ ] Error recovery: introduce temp error → app recovers next cycle
   - [ ] Firebase: all Phase 3 tests still pass
8. **COMMIT**: `git add -A && git commit -m "Phase 5: Extract init.js, refactor recalculate(), remove dead code"`

---

## PHASE 6: Merge and Deploy

```bash
# 1. Final brace balance check on all files
for f in js/stimcalc/*.js; do echo "$f:"; python3 -c "c=open('$f').read(); print('  { }', c.count('{'), c.count('}'))"; done

# 2. Verify HTML has no inline <script> content
grep -c '<script>' stimulant-elimination-calculator.html  # Should show only src= tags

# 3. Merge to main
git checkout main
git merge split-stim-calc

# 4. Push (goes live in ~30s)
git push origin main

# 5. Verify live site works
# Open https://suleman7-dmd.github.io/dental-quest/stimulant-elimination-calculator.html
```

---

## SYNC PROTECTION PRESERVATION MAP

After split, these 9 critical fixes must be in the correct files:

| Fix | What | File |
|-----|------|------|
| 1 | `_version: 0` in defaults | `state.js` → `getDefaultState()` |
| 2 | `isEmptyState()` | `state.js` |
| 3 | Guard flags (`isInitialLoad`, etc.) | `state.js` (declarations) |
| 4 | Guards in `saveToFirebase()` | `firebase-sync.js` |
| 5 | Protected `loadFromFirebase()` | `firebase-sync.js` |
| 6 | Protected realtime listener | `firebase-sync.js` |
| 7 | Protected visibility handlers | `firebase-sync.js` |
| 8 | Version comparison on load | `firebase-sync.js` |
| 9 | Merge preserves cloud data | `firebase-sync.js` → `mergeRemoteState()` |

**Verify after split**: `saveState()` and `saveStateImmediate()` have IDENTICAL 5 guards:
```javascript
if (!pinValidated) return false;
if (isInitialLoad) return false;
if (!hasLoadedFromCloud) return false;
if (isEmptyState(state)) return false;
if (!state._dataLoaded) return false;
```

---

## ROLLBACK STRATEGY

| Situation | Action |
|-----------|--------|
| Phase fails mid-way | `git checkout main` (branch untouched) |
| Split complete but bugs | `git revert HEAD` on main, or revert to any phase commit |
| Data corruption | Restore from pre-split checkpoint (created in Pre-Flight) |
| Nuclear option | `git log --oneline` → find pre-split commit → `git checkout <hash> -- stimulant-elimination-calculator.html` |

Firebase data is NEVER affected by the split — same state shape, same paths, same PIN.

---

## APPENDIX: ALL BUGS FIXED DURING SPLIT

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | `migrateHistoryEntries()` wrong delta (midnight crossing) | state.js | Use `computeSleepDelta()` |
| 2 | `suggestCalibration()` wrong delta (midnight crossing) | history-calendar.js | Use `computeSleepDelta()` |
| 3 | `renderHistory()` accuracy wrong delta (midnight crossing) | history-calendar.js | Use `computeSleepDelta()` |
| 4 | Circadian zones use today's wakeTime, not 7-day avg | circadian.js | Feed `analyzeCircadianPhase().avgWakeTime` |
| 5 | `calculateYesterdayDoseRemaining()` ignores VitC | pharma-engine.js | Use `calculateDecayWithVitC()` |
| 6 | `calculateSleepDebtBonus()` global side effect | pharma-engine.js | Return + set pattern |
| 7 | `updateWorkoutPlan()` runs when no workout applied | ui-sections.js | Short-circuit check |
| 8 | `updateScenarios()` runs when accordion closed | ui-sections.js | Skip when closed |
| 9 | Settings use `\|\|` instead of `??` for numerics | init.js | Use `??` |
| 10 | Duplicate `showToast()` (2 definitions) | state.js | Keep one, delete other |
| 11 | Duplicate `toggleModifier()` (2 definitions) | ui-sections.js | Keep unified view version |
| 12 | Dead `getCortisolClearTime()` | deleted | Was returning null |
| 13 | 4 duplicated merge blocks | firebase-sync.js | Consolidated into `mergeRemoteState()` |
| 14 | Dead focus mode CSS (~120 lines) | HTML | Deleted |
| 15 | Dead focus mode JS stubs (~30 lines) | init.js | Kept as no-ops for safety |
| 16 | `recalculate()` crashes loop on error | init.js | try/catch with recovery |
