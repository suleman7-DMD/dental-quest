# Known Bugs & Debugging Guide

## Table of Contents
- [Known Bugs (Unpatched)](#known-bugs-unpatched)
  - [Bug 1: `skipPin()` Missing Guard Flags -- Line 16624](#bug-1-skippin-missing-guard-flags--line-16624)
  - [Bug 2: `saveStateImmediate()` Missing PIN Guard -- Line 14996](#bug-2-savestateimmediate-missing-pin-guard--line-14996)
  - [Bug 3: `setupRealtimeSync()` Missing `_dataLoaded` Preservation -- Line ~15441](#bug-3-setuprealtimesync-missing-_dataloaded-preservation--line-15441)
- [Debugging Guide](#debugging-guide)
  - [Step 1: Check Guard Status](#step-1-check-guard-status)
  - [Step 2: Check Firebase Connection](#step-2-check-firebase-connection)
  - [Step 3: Check State Integrity](#step-3-check-state-integrity)
  - [Step 4: Check Ecosystem Data](#step-4-check-ecosystem-data)
  - [Step 5: Verify Save Actually Works](#step-5-verify-save-actually-works)
  - [Step 6: Check localStorage](#step-6-check-localstorage)
  - [Step 7: Force Recovery](#step-7-force-recovery)
- [Common Issues](#common-issues)
  - [Issue: "Data not saving after refresh"](#issue-data-not-saving-after-refresh)
  - [Issue: "Meals show as empty object"](#issue-meals-show-as-empty-object)
  - [Issue: "TDEE seems wrong"](#issue-tdee-seems-wrong)
  - [Issue: "Mode wrong / showing ORANGE when sleep was good"](#issue-mode-wrong--showing-orange-when-sleep-was-good)
  - [Issue: "Ecosystem data not loading"](#issue-ecosystem-data-not-loading)
  - [Issue: "Streak reset unexpectedly"](#issue-streak-reset-unexpectedly)
- [Red Flag Patterns](#red-flag-patterns)
- [Data Integrity Functions](#data-integrity-functions)
  - [`checkStorageHealth()` -- Line ~18915](#checkstoragehealth--line-18915)
  - [`verifyDayLogIntegrity()` -- Line ~18950](#verifydaylogintegrity--line-18950)
  - [`auditRecentDailyLogs()` -- Line ~18990](#auditrecentdailylogs--line-18990)

## Fixed Bugs (V2)

### Bug Fixed: `getTDEEForDate()` Operator Precedence — Line 8328
**Fixed in V2.** Parentheses were missing around addition, causing incorrect TDEE calculation for historical dates.

### Bug Fixed: Status Divergence Across 3 Code Paths
**Fixed in V2.** `saveDayLog()`, `recalculateDayLog()`, and `saveDayLogWithSnapshot()` had divergent inline status logic. All 3 now use shared `determineDayStatus()` (line 8387).

---

## Fixed Bugs (Feb 2026 — TDEE + Progress Tab)

### Bug Fixed: Circular TDEE Inflation — `get7DayAvgActiveCalories()` + `calculateTDEE()`
**Root cause:** `get7DayAvgActiveCalories()` fell back to `state.today.activeCalories`, which was set BY `autoStartDay()` FROM that same function. This created a circular self-reinforcing loop that inflated calorie targets from ~1,900 to 46,000+. Fixed by removing circular fallback — both functions now only use actual workout object data from dailyLogs. `renderSimpleView()` auto-corrects stale targets if TDEE diverges >100 cal.

### Bug Fixed: `||` vs `??` in Progress Tab Analytics
**Affected:** `aggregateDailyLogs()`, `calculateWeekScore()`. Used `||` for target/floor/protein fallbacks, treating explicit `0` (valid in maintenance mode) as falsy. Fixed to `??`.

### Bug Fixed: `gymScore` Exceeding 100 in `calculateWeekScore()`
**Cause:** `gymScore = (gymDays / Math.min(trackDays, 5)) * 100` could produce >100 with 5+ gym days, inflating the weighted average. Fixed with `Math.min(100, ...)` at source.

### Bug Fixed: Wrong Field Name in `renderRecompPredictor()`
**Cause:** Used `state.profile?.goalWeight` (doesn't exist) instead of `state.profile?.goalWeight_lbs`. Was always defaulting to 170 instead of reading the user's actual goal weight.

### Bug Fixed: Calendar Heatmap Simplified Fallback
**Cause:** When `log.status` was missing (old data), fallback logic `(log.perfect ? 'perfect' : deficit > 0 ? 'partial' : 'missed')` only handled 3 of 8 statuses, missing deficit_gym, gym_only, good, over, no_data. Fixed to use `determineDayStatus()` for fallback.

---

## Known Bugs (Unpatched)

### Bug 1: `skipPin()` Missing Guard Flags — Line 16624

**Severity:** HIGH — breaks offline mode entirely

`skipPin()` does NOT set the 4 required guard flags:
- `pinValidated` — stays `false`
- `hasLoadedFromCloud` — stays `false`
- `isInitialLoad` — stays `true`
- `state._dataLoaded` — stays `false`

**Impact:** All saves are blocked by guards. User can use the app but nothing persists.

**Fix:** Add to `skipPin()`:
```javascript
pinValidated = true;
hasLoadedFromCloud = true;
isInitialLoad = false;
state._dataLoaded = true;
```

**Reference:** stim-calc's correct `skipPin()` implementation at line 9350.

---

### Bug 2: `saveStateImmediate()` Missing PIN Guard — Line 14996

**Severity:** MEDIUM — theoretical data safety issue

`saveStateImmediate()` has 4 guards (A, B, C, D) but is missing Guard 0 (`!pinValidated`). This means it could theoretically save before PIN validation in edge cases.

**Fix:** Add as first guard:
```javascript
if (!pinValidated) {
    console.warn('⚠️ BLOCKED: Immediate save attempted before PIN validation');
    return false;
}
```

---

### Bug 3: `setupRealtimeSync()` Missing `_dataLoaded` Preservation — Line ~15441

**Severity:** LOW-MEDIUM — can cause subsequent save blocking

After the realtime merge at line ~15441, `state._dataLoaded` is not explicitly set to `true`. If the cloud data doesn't include this flag (it's stripped during save in some edge cases), `state._dataLoaded` could become `undefined`, blocking subsequent saves via Guard D.

**Fix:** Add after the realtime merge:
```javascript
state._dataLoaded = true;  // Preserve after realtime merge
```

**Note:** `loadFromFirebase()` correctly sets this at line 15314, but the realtime sync path doesn't.

---

## Debugging Guide

### Step 1: Check Guard Status

Open browser console and run:
```javascript
console.log({
    pinValidated,
    isInitialLoad,
    hasLoadedFromCloud,
    _dataLoaded: state._dataLoaded,
    isEmpty: isEmptyState(state),
    firebaseSyncEnabled,
    userPath,
    version: state._version
});
```

If any guard is blocking, saves are silently rejected with `⚠️ BLOCKED:` console warnings.

### Step 2: Check Firebase Connection

```javascript
console.log({
    firebaseSyncEnabled,
    firebaseInitialized,
    database: !!database,
    userPath,
    realtimeSyncEnabled
});
```

### Step 3: Check State Integrity

```javascript
console.log({
    todayDate: state.today.date,
    setupComplete: state.today.setupComplete,
    mealCount: getCount(state.today.meals),
    workoutCount: getCount(state.today.workouts),
    dailyLogCount: Object.keys(state.dailyLogs).length,
    weighInCount: getCount(state.weighIns),
    mode: state.today.mode,
    targets: state.today.targets
});
```

### Step 4: Check Ecosystem Data

```javascript
console.log({
    stimulant: state.ecosystemContext.stimulant,
    inventory: state.ecosystemContext.inventory,
    academic: state.ecosystemContext.academic,
    sleepDebt: state.ecosystemContext.sleepDebt
});
```

### Step 5: Verify Save Actually Works

```javascript
// Attempt a save and check result
const result = saveState();
console.log('Save returned:', result);  // true = saved, false = blocked
```

### Step 6: Check localStorage

```javascript
const stored = JSON.parse(localStorage.getItem('bodyCompTrackerState'));
console.log('localStorage version:', stored?._version);
console.log('localStorage meals:', getCount(stored?.today?.meals));
```

### Step 7: Force Recovery

If data is stuck:
```javascript
// Option A: Force pull from cloud
forcePullFromCloud();

// Option B: Force upload local to cloud
forceUploadToCloud();

// Option C: Restore from checkpoint
showCheckpointManager();
```

## Common Issues

### Issue: "Data not saving after refresh"

**Likely cause:** `saveState()` not called after mutation.

**Check:**
1. Is `saveState()` called after the state change?
2. Is `saveDayLog()` called after meal/workout changes?
3. Are any guards blocking? (Check console for `⚠️ BLOCKED:` messages)

### Issue: "Meals show as empty object"

**Likely cause:** Array-to-object migration not applied.

**Check:**
1. Is `ensureMealsObject()` called before meal operations on historical dates?
2. Does `migrateArrayToObject()` run during load?
3. Check: `console.log(typeof state.today.meals, Array.isArray(state.today.meals))`

### Issue: "TDEE seems wrong"

**Likely cause:** Activity multiplier setting or workout data. (Circular inflation bug FIXED Feb 2026 — `calculateTDEE()` no longer falls back to `state.today.activeCalories`.)

**Check:**
```javascript
console.log({
    bmr: calculateBMR(state.profile.currentWeight_lbs, state.profile.height_cm, state.profile.age),
    activityLevel: state.profile.activityLevel,
    sevenDayAvg: get7DayAvgActiveCalories(),
    todayWorkouts: getValues(state.today.workouts).reduce((s, w) => s + (w.calories || 0), 0),
    todayActive: state.today.activeCalories,
    targets: state.today.targets,
    fullTDEE: calculateTDEE(state.profile.currentWeight_lbs, state.profile.height_cm, state.profile.age, state.today.activeCalories)
});
// If targets seem stale, renderSimpleView() auto-corrects if TDEE diverges >100 cal
```

### Issue: "Mode wrong / showing ORANGE when sleep was good"

**Likely cause:** All-nighter mode or sleep debt override.

**Check:**
```javascript
console.log({
    sleepHours: state.today.sleepHours,
    allNighterMode: state.ecosystemContext?.stimulant?.allNighterMode,
    sleepDebtSeverity: state.ecosystemContext?.sleepDebt?.severity,
    currentMode: state.today.mode
});
```

### Issue: "Ecosystem data not loading"

**Likely cause:** Firebase path wrong or other app data missing.

**Check:**
```javascript
console.log({
    userPath,
    stimPath: userPath?.replace('/bodyCompTracker', '/stimulantCalculator'),
    questPath: userPath?.replace('/bodyCompTracker', '') + '/appData',
    d3Path: userPath?.replace('/bodyCompTracker', '/d3Roadmap')
});
```

### Issue: "Streak reset unexpectedly"

**Likely cause:** Day boundary issue or `lastCompletedDate` out of sync.

**Check:**
```javascript
const today = getLocalDateString();
const yesterdayDate = new Date();
yesterdayDate.setDate(yesterdayDate.getDate() - 1);
const yesterday = getLocalDateString(yesterdayDate);
console.log({
    today,
    yesterday,
    lastCompleted: state.gamification.lastCompletedDate,
    streak: state.gamification.streak
});
```

## Red Flag Patterns

When reviewing code changes, watch for:

1. **Arrays in Firebase collections** — use `generateId()` keys with `{}` objects
2. **Missing `saveState()`** after state mutation
3. **Missing `saveDayLog()`** after meal/workout changes
4. **Saving ecosystemContext to Firebase** — it's read-only, strip before save
5. **Removing or weakening any of the 5 guards** in `saveState()`
6. **Setting `_version: Date.now()`** in default state (must be 0)
7. **`new Date('YYYY-MM-DD')`** — use `parseLocalDate()` instead (UTC bug)
8. **`loadedFoods || defaults`** — empty array is truthy, check `.length > 0`
9. **No deep copy in saveDayLog** — meals/workouts must be `JSON.parse(JSON.stringify())`
10. **Missing `state._dataLoaded = true`** after state reconstruction
11. **`||` for numeric fallbacks** — use `??` for targets/floors/counts where `0` is valid (maintenance mode)
12. **Circular self-reinforcing calculations** — never use a computed output as its own input fallback
13. **Wrong state field names** — always verify field exists in `getDefaultState()` (e.g., `goalWeight_lbs` not `goalWeight`)

## Data Integrity Functions

### `checkStorageHealth()` — Line ~18915

Verifies localStorage isn't corrupted:
- Parses `bodyCompTrackerState` from localStorage
- Checks key fields exist
- Reports missing or malformed data

### `verifyDayLogIntegrity()` — Line ~18950

Checks structure of recent daily logs:
- Verifies meals/workouts are objects (not arrays)
- Checks for missing required fields
- Reports date format issues

### `auditRecentDailyLogs()` — Line ~18990

Audits last 7 days:
- Checks each day's log for completeness
- Verifies calorie/protein totals match meal data
- Flags discrepancies
