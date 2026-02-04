# Plan: Split stimulant-elimination-calculator.html into Separate JS Files

## Overview
Split the ~12,200 line single-file app into logical JS modules that load via `<script>` tags. No build tools, no ES modules - just plain JS files with global functions attached to `window`.

## Current Structure
- Lines 1-3475: HTML + CSS
- Lines 3476-12218: JavaScript (all in one `<script>` block)

## Proposed File Structure

```
dental-quest/
├── stimulant-elimination-calculator.html  (HTML/CSS only, ~3500 lines)
└── js/
    └── stimcalc/
        ├── state.js          (~350 lines) - State management + helpers
        ├── calculations.js   (~800 lines) - Pharmacokinetic calculations
        ├── firebase.js       (~700 lines) - Firebase sync + checkpoint system
        ├── ui-main.js        (~900 lines) - Full view UI (meds, caffeine, modifiers)
        ├── ui-focus.js       (~700 lines) - Focus mode UI
        ├── graph.js          (~400 lines) - Graph drawing (Chart.js-like canvas)
        ├── history.js        (~600 lines) - History, calendar, sleep performance
        ├── workout.js        (~400 lines) - Workout planner functions
        └── init.js           (~150 lines) - Initialization + event listeners
```

## File Contents Breakdown

### 1. `js/stimcalc/state.js` (LOAD FIRST)
**Global Variables:**
```javascript
window.state = { ... };
window.isInitialLoad = true;
window.hasLoadedFromCloud = false;
window.pinValidated = false;
window.hyperarousalMode = false;
window.focusMode = true;
window.focusWorkoutType = 'lifting';
window.focusVitCEnabled = true;
```

**Functions (attach to window):**
- `getDefaultState()` - line 3483
- `isEmptyState()` - line 3587
- `hasRealData()` - line 3605
- `getCount()` - line 3610/3679
- `getValues()` - line 3617/3672
- `ensureArray()` - line 3627
- `generateId()` - line 3637
- `migrateArrayToObject()` - line 3643
- `safeLocalStorageSet()` - line 3686
- `BackupManager` object - line 3710
- `getLocalDateString()` - line 3970
- `parseLocalDate()` - line 3975
- `timeToMinutes()` - line 3981
- `minutesToTime()` - line 3990
- `minutesToTimeValue()` - line 3998
- `getCurrentMinutes()` - line 4815
- `formatTime12()` - line 5105
- `formatDateLabel()` - line 4943
- `safeSetValue()` - line 10893
- `safeGetValue()` - line 10899

### 2. `js/stimcalc/calculations.js`
**Functions:**
- `analyzeCircadianPhase()` - line 3793
- `calculateSleepDebtBonus()` - line 4018
- `getSleepDebtBreakdown()` - line 4079
- `getEffectiveThreshold()` - line 4145
- `isHyperarousalMode()` - line 4221
- `getForbiddenZone()` - line 4229
- `getSleepGate()` - line 4237
- `isInForbiddenZone()` - line 4245
- `isInSleepGate()` - line 4255
- `getForbiddenZoneEnd()` - line 4264
- `calculateAmpLoad()` - line 4272
- `calculateCaffLoad()` - line 4469
- `findAmpClearTime()` - line 4509
- `findCaffClearTime()` - line 4545
- `getCortisolClearTime()` - line 4573
- `calculateSleepTime()` - line 4578
- `getYesterdayMedications()` - line 5293
- `getYesterdayCaffeine()` - line 5303
- `calculateYesterdayDoseRemaining()` - line 5313
- `getVitaminCTimeMinutes()` - line 5190
- `isVitaminCEffective()` - line 5223
- `getVitaminCStatus()` - line 5233
- `simulateCaffeineAddition()` - line 7144
- `simulateVitaminC()` - line 7164
- `simulateSauna()` - line 7194
- `simulateNicotineHit()` - line 7212
- `simulateScenario()` - line 7273

### 3. `js/stimcalc/firebase.js`
**Global Variables:**
```javascript
window.firebaseConfig = { ... };
window.firebaseInitialized = false;
window.database = null;
window.firebaseSyncEnabled = false;
window.currentUser = null;
window.userPath = null;
window.localChangesSinceLastSync = false;
window.lastSyncTimestamp = null;
window.realtimeSyncEnabled = false;
window.lastKnownTimestamp = null;
```

**Functions:**
- `updateSyncStatus()` - line 8985
- `deepMerge()` - line 9019
- `markLocalChange()` - line 9040
- `showSyncConflictModal()` - line 9045
- `initFirebase()` - line 9084
- `setupUserAuth()` - line 9140
- `promptForPin()` - line 9154
- `submitPin()` - line 9189
- `skipPin()` - line 9207
- `saveToFirebase()` - line 9217
- `loadFromFirebase()` - line 9256
- `setupRealtimeSync()` - line 9419
- `forceCloudSync()` - line 9525
- `saveState()` - line 10163
- `saveStateImmediate()` - line 10222
- `loadState()` - line 10268
- `applyRemoteState()` - line 10040

**Checkpoint Functions:**
- `createCheckpoint()` - line 9587
- `showCheckpointManager()` - line 9614
- `restoreCheckpoint()` - line 9684
- `deleteCheckpoint()` - line 9716
- `exportCheckpoint()` - line 9728
- `exportAllCheckpoints()` - line 9750
- `isValidAppData()` - line 9780
- `importCheckpoint()` - line 9794
- `importAndRestoreDirectly()` - line 9880
- `forceUploadToCloud()` - line 9951
- `forcePullFromCloud()` - line 9986

### 4. `js/stimcalc/ui-main.js`
**Functions:**
- `addMedEntry()` - line 4824
- `cleanupOldMedications()` - line 4843
- `removeMedEntry()` - line 4873
- `updateMedEntry()` - line 4883
- `renderMedEntries()` - line 4907
- `updateStackingWarning()` - line 4955
- `addCaffeine()` - line 5020
- `removeCaffeine()` - line 5036
- `renderCaffeineEntries()` - line 5047
- `updateCaffeineTime()` - line 5078
- `updateCaffeineDate()` - line 5094
- `toggleModifier()` - line 5116
- `updateModifierTimeInputs()` - line 5136
- `updateVitaminCDate()` - line 5179
- `toggleAllNighterMode()` - line 5257
- `updateAllNighterUI()` - line 5271
- `renderGhostLoad()` - line 5342
- `toggleSettings()` - line 5885
- `recalculate()` - line 5896
- `updateStatusItem()` - line 6289
- `updateWorkoutStatus()` - line 6300
- `updateRecommendations()` - line 6352
- `updateFeelingsTimeline()` - line 6537
- `logNicotine()` - line 6732
- `clearNicotine()` - line 6747
- `updateNicotineTime()` - line 6757
- `updateNicotineDisplay()` - line 6768
- `updateNicotineWarnings()` - line 6852
- `getRelaxationProtocol()` - line 6988
- `checkRLSRisk()` - line 7013
- `getNicotineCooldownTime()` - line 7049
- `showToast()` - line 7055 (keep both definitions, one is duplicate at 10407)
- `showCustomAlert()` - line 7073
- `showCustomConfirm()` - line 7091
- `updateScenarios()` - line 7115
- `updateScenarioDisplay()` - line 7236
- `clearToday()` - line 10360
- `toggleForecastLogic()` - line 10420
- `copyForecastLogic()` - line 10433
- `generateForecastLogic()` - line 10451
- `updateForecastLogic()` - line 10881

### 5. `js/stimcalc/ui-focus.js`
**Functions:**
- `setViewMode()` - line 11000
- `renderFocusMode()` - line 11029
- `renderFocusSleepHistory()` - line 11134
- `focusEditSleepDay()` - line 11178
- `focusUpdateSleep()` - line 11202
- `focusUpdateWake()` - line 11214
- `focusConfirmMeds()` - line 11224
- `focusShowCustomDose()` - line 11250
- `focusHideCustomDose()` - line 11254
- `focusDoseSelectChange()` - line 11260
- `focusConfirmCustomDose()` - line 11270
- `focusEditMeds()` - line 11305
- `updateFocusMedsStatus()` - line 11325
- `renderFocusCaffeineList()` - line 11372
- `toggleSipDetails()` - line 11468
- `focusRemoveSipGroup()` - line 11479
- `focusAddCaffeine()` - line 11501
- `focusUpdateCaffeineTime()` - line 11538
- `focusRemoveCaffeine()` - line 11554
- `focusShowSipMode()` - line 11573
- `focusCloseSipMode()` - line 11606
- `updateSipPreview()` - line 11613
- `focusApplySipMode()` - line 11659
- `updateFocusSleepDisplay()` - line 11759
- `focusClearAllCaffeine()` - line 11832
- `updateFocusCoffeeStatus()` - line 11850
- `focusSelectWorkoutType()` - line 11855
- `focusConfirmWorkout()` - line 11861
- `focusEditWorkout()` - line 11888
- `updateFocusWorkoutStatus()` - line 11898
- `focusLogNicotine()` - line 11918
- `focusClearNicotine()` - line 11923
- `updateFocusNicotineStatus()` - line 11928
- `focusToggleVitC()` - line 11961
- `updateFocusVitCStatus()` - line 11975
- `drawFocusGraph()` - line 11995
- `initFocusMode()` - line 12181

### 6. `js/stimcalc/graph.js`
**Functions:**
- `drawGraph()` - line 7319
- `setupGraphTooltip()` - line 7603
- `hexToRgb()` - line 8507
- `setupSleepGraphTooltip()` - line 8512
- `drawSleepPerformanceGraph()` - line 8605
- `getCardinalSplinePoints()` (nested in drawSleepPerformanceGraph) - line 8661

### 7. `js/stimcalc/history.js`
**Functions:**
- `saveDay()` - line 7708
- `renderHistory()` - line 7736
- `cleanupHistory()` - line 7806
- `renderSleepCalendar()` - line 7850
- `renderCircadianPhase()` - line 7928
- `openSleepEditModal()` - line 7979
- `closeSleepEditModal()` - line 7996
- `setAllNighter()` - line 8001
- `clearSleepEntry()` - line 8008
- `saveSleepEdit()` - line 8030
- `updateTodaySleepHistory()` - line 8066
- `updateTodayWakeTime()` - line 8081
- `toggleSleepPerformance()` - line 8100
- `getSleepDataForDays()` - line 8113
- `renderSleepPerformance()` - line 8146
- `showExplainer()` - line 8445
- `hideExplainer()` - line 8461
- `renderSleepAchievements()` - line 8468
- `renderSleepHistoryList()` - line 8848
- `showFeedbackModal()` - line 8917
- `closeFeedbackModal()` - line 8926
- `submitFeedback()` - line 8930
- `suggestCalibration()` - line 8950

### 8. `js/stimcalc/workout.js`
**Functions:**
- `initWorkoutPlanner()` - line 5451
- `updateWorkoutTimeline()` - line 5467
- `calculateWorkoutImpact()` - line 5506
- `updateWorkoutPlan()` - line 5688
- `toggleFastedState()` - line 5788
- `applyWorkoutPlan()` - line 5792
- `resetWorkoutPlan()` - line 5841
- `restoreWorkoutPlanUI()` - line 9380

### 9. `js/stimcalc/init.js` (LOAD LAST)
**Functions:**
- `init()` - line 10904
- `renderAll()` helper (need to create - calls all render functions)

**Event Listeners:**
- `document.addEventListener('DOMContentLoaded', init)` - line 12217
- `document.addEventListener('visibilitychange', ...)` - line 10090
- `window.addEventListener('resize', ...)` - line 10983

## Script Loading Order in HTML

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>

<!-- App JS Files (order matters!) -->
<script src="js/stimcalc/state.js"></script>
<script src="js/stimcalc/calculations.js"></script>
<script src="js/stimcalc/firebase.js"></script>
<script src="js/stimcalc/graph.js"></script>
<script src="js/stimcalc/history.js"></script>
<script src="js/stimcalc/workout.js"></script>
<script src="js/stimcalc/ui-main.js"></script>
<script src="js/stimcalc/ui-focus.js"></script>
<script src="js/stimcalc/init.js"></script>
```

## Implementation Steps

1. **Create directory structure**
   ```bash
   mkdir -p js/stimcalc
   ```

2. **Create state.js** - Extract state variables and helper functions

3. **Create calculations.js** - Extract all pharmacokinetic calculations

4. **Create firebase.js** - Extract Firebase config, sync functions, checkpoint system

5. **Create graph.js** - Extract graph drawing functions

6. **Create history.js** - Extract history/calendar/sleep tracking functions

7. **Create workout.js** - Extract workout planner functions

8. **Create ui-main.js** - Extract Full View UI functions

9. **Create ui-focus.js** - Extract Focus Mode UI functions

10. **Create init.js** - Extract initialization and event listeners

11. **Update HTML** - Remove all `<script>` content, add `<script src="...">` tags

12. **Create renderAll() helper** in init.js that calls:
    - renderMedEntries()
    - renderCaffeineEntries()
    - renderHistory()
    - renderSleepCalendar()
    - renderSleepPerformance()
    - recalculate()
    - If focusMode: renderFocusMode()

## Critical Sync Guards to Preserve

From CLAUDE.md - these MUST remain intact in firebase.js:

```javascript
// Fix 1: Default _version = 0 (not Date.now()) - in state.js
// Fix 2: isEmptyState() function - in state.js
// Fix 3: Sync protection flags (isInitialLoad, hasLoadedFromCloud, pinValidated) - in state.js
// Fix 4: Guards in saveToFirebase() - in firebase.js
// Fix 5: Protected loadFromFirebase() - in firebase.js
// Fix 6: Protected realtime listener - in firebase.js
// Fix 7: Protected visibility handlers - in init.js
// Fix 8: Version comparison on load - in firebase.js
// Fix 9: Merge strategy preserves cloud data - in firebase.js
```

## Verification Checklist

After splitting, verify:
- [ ] All functions are globally accessible via window
- [ ] State persists across page reloads
- [ ] Firebase sync works (test with PIN)
- [ ] Focus mode toggles correctly
- [ ] Medications/caffeine entries save and display
- [ ] Graph renders correctly
- [ ] History saves and loads
- [ ] Checkpoint system works
- [ ] All onclick handlers in HTML still work
- [ ] No console errors on load

## Files to Modify
- `stimulant-elimination-calculator.html` - Remove JS, add script tags
- Create 9 new files in `js/stimcalc/`

## Test Plan
1. Open the app in browser
2. Check console for errors
3. Add a medication entry - verify it appears
4. Add caffeine - verify it appears
5. Toggle Focus/Full view - verify both work
6. Check Firebase sync indicator
7. Create a checkpoint - verify it saves
8. Refresh page - verify data persists
9. Check graph renders in both views
