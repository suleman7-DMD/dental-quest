# Complete State Structure

## Table of Contents
- [Default State](#default-state-from-getdefaultstate-line-3114)
- [Firebase Path](#firebase-path)
- [isEmptyState() — 6 Conditions](#isemptystate--6-conditions-line-3222)
- [Adding New Data Structures](#adding-new-data-structures)

## Default State (from getDefaultState(), line 3114)

```javascript
state = {
  // === DAILY CONTEXT ===
  wakeTime: '06:45',               // Today's wake time (24h format)
  hoursSleptLastNight: 8,          // Hours slept (< 4 triggers hyperarousal)
  allNighterMode: false,           // Computed from hoursSleptLastNight

  // === MEDICATION ENTRIES (object with ID keys) ===
  medications: {
    // "med_1707400000000_abc123": {
    //   id: "med_1707400000000_abc123",
    //   dose: 50,                    // mg (total XR dose)
    //   time: "14:13",               // 24-hour format
    //   date: "2026-02-09",          // YYYY-MM-DD
    //   createdAt: "2026-02-09T14:13:00Z"
    // }
    // NOTE: NO "type" field. ALL doses modeled as XR (50% IR + 50% DR)
  },

  // === CAFFEINE ENTRIES (object with ID keys) ===
  caffeine: {
    // "caff_1707400000000_xyz789": {
    //   id: "caff_1707400000000_xyz789",
    //   amount: 100,                 // mg of caffeine
    //   name: "Coffee",              // Display name
    //   time: "15:08",               // 24-hour format
    //   date: "2026-02-09",          // YYYY-MM-DD
    //   createdAt: "2026-02-09T15:08:00Z"
    // }
  },

  // === MODIFIERS ===
  modifiers: {
    vitaminC: {
      active: false,
      time: '17:00',               // Default time
      date: null                   // Date when active
    },
    heavyLift: {                   // NOTE: "heavyLift" not "heavyLifting"
      active: false
    },
    sauna: {
      active: false,
      time: '18:00',               // Default time
      date: null                   // Date when completed
    }
  },

  // === NICOTINE (consultant missed this) ===
  nicotine: {
    active: false,
    type: 'vape',                  // 'vape' | other
    lastHitTime: null              // When last used
  },

  // === WORKOUT PLANNER (consultant missed this — 12 fields!) ===
  workoutPlan: {
    active: false,
    time: null,                    // Planned workout time
    duration: 45,                  // Minutes
    type: 'lifting',               // 'lifting' | 'cardio' | 'mixed'
    intensity: 'medium',           // 'low' | 'medium' | 'high'
    fasted: false,                 // Fasted workout
    coldShower: false,             // Post-workout cold shower
    applied: false,                // Has been applied to calculations
    adenosineBonus: 0,             // Threshold bonus from workout
    cortisolDelay: 0,              // Minutes of cortisol alertness
    thermalDelay: 0,               // Minutes of thermal cooldown
    cooldownComplete: null         // When cooldown finishes
  },

  // === SETTINGS ===
  settings: {
    ampHalfLife: 11,               // hours (NOT 12)
    sleepThreshold: 14,            // mg (NOT 15)
    caffHalfLife: 5,               // hours
    caffThreshold: 25,             // mg
    weight: 190                    // lbs (Sully's weight)
  },

  // === PREDICTION HISTORY (object with ID keys) ===
  history: {
    // "hist_1707400000000_def456": {
    //   id, date, predictedSleep, predictedAt,
    //   actualSleep, deltaMinutes, absError,
    //   autoSaved, lastUpdated,
    //   medications: [...],         // Snapshot of meds at prediction
    //   caffeine: [...],            // Snapshot of caffeine
    //   modifiers: {...},           // Snapshot of modifiers
    //   inputs: {...}               // Full input snapshot
    // }
  },

  // === SLEEP HISTORY (keyed by date) ===
  sleepHistory: {
    // "2026-02-09": {
    //   hoursSlept: 7.5,
    //   wakeTime: "07:30",
    //   quality: "good"            // Subjective, not algorithmic
    // }
    // OR just a number: "2026-02-09": 7.5
  },

  // === SYNC FLAGS ===
  _version: 0,                     // MUST be 0 in defaults (not Date.now())
  _dataLoaded: false               // MUST be false in defaults
};
```

---

## Firebase Path

```
users/{hashedPin}/stimulantCalculator/
    +-- medications/
    |   +-- {id}/ { id, dose, time, date, createdAt }
    +-- caffeine/
    |   +-- {id}/ { id, amount, name, time, date, createdAt }
    +-- sleepHistory/
    |   +-- {date}/ { hoursSlept, wakeTime, quality }
    +-- history/
    |   +-- {id}/ { id, date, predictedSleep, actualSleep, ... }
    +-- modifiers/
    |   +-- vitaminC/ { active, time, date }
    |   +-- heavyLift/ { active }
    |   +-- sauna/ { active, time, date }
    +-- nicotine/ { active, type, lastHitTime }
    +-- workoutPlan/ { active, time, duration, type, intensity, ... }
    +-- settings/ { ampHalfLife, caffHalfLife, sleepThreshold, caffThreshold, weight }
    +-- wakeTime
    +-- hoursSleptLastNight
    +-- allNighterMode
    +-- _dataLoaded
    +-- _version
```

**Path:** `users/{hashedPin}/stimulantCalculator` (NOT `stimCalcData`)

---

## isEmptyState() — 6 Conditions (line 3222)

```javascript
function isEmptyState(data) {
    if (!data) return true;

    const hasMedications = getCount(data.medications) > 0;
    const hasCaffeine = getCount(data.caffeine) > 0;
    const hasHistory = getCount(data.history) > 0;
    const hasSleepHistory = getCount(data.sleepHistory) > 0;
    const hasAllNighterMode = data.allNighterMode === true;  // CRITICAL
    const dataWasLoaded = data._dataLoaded === true;          // CRITICAL

    // Empty ONLY if ALL 6 are false
    return !hasMedications && !hasCaffeine && !hasHistory &&
           !hasSleepHistory && !hasAllNighterMode && !dataWasLoaded;
}
```

**CRITICAL:** The `allNighterMode` and `_dataLoaded` checks are essential — without them, toggling all-nighter mode wouldn't persist, and loaded data could be considered "empty."

---

## Adding New Data Structures

### 1. Add to getDefaultState() (line 3114)
```javascript
newCollection: {},  // Add with empty default
```

### 2. Update isEmptyState() if it represents real user data
Only include collections that represent "real user data" — settings don't count.

### 3. Handle in realtime sync (setupRealtimeSync, line ~9599)
```javascript
state = {
    ...existingState,
    ...firebaseState,
    newCollection: firebaseState.newCollection || {},
    _dataLoaded: true  // ALWAYS preserve this
};
```

### 4. Handle in loadFromFirebase() merge
Ensure the new collection merges properly with defaults.
