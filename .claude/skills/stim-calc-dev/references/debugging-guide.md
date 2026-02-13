# Debugging Guide

## Table of Contents
- [Quick Diagnostic Commands (Browser Console)](#quick-diagnostic-commands-browser-console)
- [Common Issues](#common-issues)
- [Testing Calculations](#testing-calculations)
- [Force State Operations](#force-state-operations)
- [Performance Check](#performance-check)
- [Functions That DON'T Exist](#functions-that-dont-exist-dont-try-these)

## Quick Diagnostic Commands (Browser Console)

**IMPORTANT:** All load functions use **minutes since midnight**, not `Date.now()`. Use `getCurrentMinutes()` to get current time in the right format.

```javascript
// Current time in minutes (what the engine uses)
const now = getCurrentMinutes();

// Current loads
console.log('Amp load:', calculateAmpLoad(now).toFixed(1), 'mg');
console.log('Caff load:', calculateCaffLoad(now).toFixed(1), 'mg');
console.log('Threshold:', getEffectiveThreshold().toFixed(1), 'mg');

// Medication count
const today = getLocalDateString();
console.log("Today's meds:", getValues(state.medications).filter(m => m.date === today).length);
console.log('Total meds:', Object.keys(state.medications).length);

// All-nighter mode
console.log('All-nighter:', state.allNighterMode);
console.log('Hours slept:', state.hoursSleptLastNight);
console.log('Hyperarousal:', isHyperarousalMode());

// Sync state
console.log({
    pinValidated,
    isInitialLoad,
    hasLoadedFromCloud,
    _dataLoaded: state._dataLoaded,
    firebaseSyncEnabled
});
```

---

## Common Issues

### Issue: Sleep Prediction Way Off

**Check 1:** XR delayed release timing
```javascript
const now = getCurrentMinutes();
const today = getLocalDateString();
getValues(state.medications)
  .filter(m => m.date === today)
  .forEach(m => {
    const doseMin = timeToMinutes(m.time);
    const drMin = doseMin + 240;
    console.log(`${m.dose}mg at ${m.time} -> DR at ${minutesToTime(drMin)}`);
    console.log('  IR remaining:', calculateDecayWithVitC(m.dose * 0.5, doseMin, now, state.settings.ampHalfLife * 60, state.settings.ampHalfLife * 0.7 * 60, 0, 0).toFixed(1), 'mg');
  });
```

**Check 2:** Ghost load
```javascript
if (state.allNighterMode) {
    console.log('Ghost load active');
    // renderGhostLoad() shows the breakdown in the UI
}
```

**Check 3:** Modifiers
```javascript
console.log('VitC active:', state.modifiers.vitaminC.active);
console.log('VitC effective:', isVitaminCEffective());
console.log('VitC status:', getVitaminCStatus());
console.log('Sauna active:', state.modifiers.sauna.active);
console.log('Workout applied:', state.workoutPlan.applied);
console.log('Workout adenosine:', state.workoutPlan.adenosineBonus);
console.log('Nicotine active:', state.nicotine.active);
```

**Check 4:** Circadian phase
```javascript
// analyzeCircadianPhase takes NO parameters
const phase = analyzeCircadianPhase();
console.log('Phase:', phase);

// Zone times
const fz = getForbiddenZone();
const sg = getSleepGate();
console.log('Forbidden Zone:', minutesToTime(fz.start), '-', minutesToTime(fz.end));
console.log('Sleep Gate:', minutesToTime(sg.start), '-', minutesToTime(sg.end));
console.log('In FZ:', isInForbiddenZone());
console.log('In Sleep Gate:', isInSleepGate());
```

### Issue: Nothing Saves

**Check 1:** All 5 guards
```javascript
console.log('Guard check:', {
    pinValidated,              // Must be true
    isInitialLoad,             // Must be false
    hasLoadedFromCloud,        // Must be true
    _dataLoaded: state._dataLoaded,  // Must be true
    isEmpty: isEmptyState(state)     // Must be false
});
// All 5 must pass for saves to work
```

**Check 2:** Manual save test
```javascript
console.log('Testing save...');
const result = saveStateImmediate();
console.log('Save result:', result);
// Check console for guard warnings
```

**Check 3:** Firebase connection
```javascript
console.log({
    firebaseSyncEnabled,
    firebaseInitialized,
    database: !!database,
    userPath
});
```

### Issue: VitC Not Working

```javascript
console.log('VitC active:', state.modifiers.vitaminC.active);
console.log('VitC time:', state.modifiers.vitaminC.time);
console.log('VitC date:', state.modifiers.vitaminC.date);
console.log('VitC effective:', isVitaminCEffective());
console.log('VitC status:', getVitaminCStatus());
console.log('VitC time (minutes):', getVitaminCTimeMinutes());
console.log('Raw VitC time:', getRawVitaminCTimeMinutes());

// VitC has 8-hour TTL
// Check: is current time within 8 hours of VitC time?
```

### Issue: Workout Not Affecting Prediction

```javascript
console.log('Workout plan:', JSON.stringify(state.workoutPlan, null, 2));
// Key fields to check:
// - active: must be true
// - applied: must be true (call applyWorkoutPlan() if false)
// - adenosineBonus: should be > 0
// - cortisolDelay: minutes of post-workout alertness
// - thermalDelay: minutes of thermal cooldown
```

---

## Testing Calculations

### Test Full Prediction
```javascript
const result = calculateSleepTime();
console.log('Result:', result);
console.log('Predicted sleep:', minutesToTimeWithDay(result.sleepTime));
console.log('Blocking factors:', result.blockingFactors);

const now = getCurrentMinutes();
console.log('Amp at sleep:', calculateAmpLoad(result.sleepTime).toFixed(1), 'mg');
console.log('Caff at sleep:', calculateCaffLoad(result.sleepTime).toFixed(1), 'mg');
console.log('Threshold:', getEffectiveThreshold().toFixed(1), 'mg');
```

### Test Clearance
```javascript
const ampClear = findAmpClearTime();
const caffClear = findCaffClearTime();
console.log('Amp clears at:', ampClear ? minutesToTimeWithDay(ampClear) : 'already clear');
console.log('Caff clears at:', caffClear ? minutesToTimeWithDay(caffClear) : 'already clear');
```

### Test Accuracy
```javascript
const stats = calculateAccuracyStats();
console.log('Accuracy stats:', stats);
const recommendation = getCalibrationRecommendation();
console.log('Calibration recommendation:', recommendation);
```

---

## Force State Operations

```javascript
// Force save (respects guards)
saveStateImmediate();

// Force reload from Firebase
loadFromFirebase();

// Force upload to cloud
forceCloudSync();

// Force pull from cloud
forcePullFromCloud();

// Create checkpoint before risky operations
createCheckpoint('before-debugging');

// Full recalculate + render
recalculate();

// Reset workout plan
resetWorkoutPlan();
```

---

## Performance Check

```javascript
console.time('Full recalculate');
recalculate();
console.timeEnd('Full recalculate');

const now = getCurrentMinutes();
console.time('Amp load x100');
for (let i = 0; i < 100; i++) calculateAmpLoad(now);
console.timeEnd('Amp load x100');
// Should be < 10ms for 100 iterations

console.time('Sleep prediction');
calculateSleepTime();
console.timeEnd('Sleep prediction');
```

---

## Functions That DON'T Exist (Don't Try These)

These will throw `ReferenceError` in the console:
- `getCircadianZoneTimes()` -- use `getForbiddenZone()` and `getSleepGate()` instead
- `getSaunaBonus()` -- sauna logic is inside `getEffectiveThreshold()`
- `calculateGhostLoad()` -- use `renderGhostLoad()` for display, or check `calculateAmpLoad()` with allNighterMode
- `calculateXRContribution()` -- XR split is inside `calculateAmpLoad()`
- `checkHyperarousal()` -- use `isHyperarousalMode()`
- `calculateDoseContribution()` -- no such routing function
