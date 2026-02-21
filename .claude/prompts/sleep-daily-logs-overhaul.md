# Sleep Daily Logs Overhaul — Execution Prompt

## Context for New Session

You're working on the Stimulant Elimination Calculator app (stim calc). The app was recently given a "Sleep Intelligence" UI overhaul (unified accordion with 4 tabs), but the **data layer is fundamentally broken** — there are two disconnected data stores and most historical sleep data is invisible to the stats/calendar features.

Read the `stim-calc-dev` skill file first (`.claude/skills/stim-calc-dev/SKILL.md`) and the plan file at `.claude/plans/logical-coalescing-puddle.md` (already implemented — for context on what the Sleep Intelligence UI expects).

## The Problem

### Two Disconnected Data Stores

**`state.sleepHistory`** — Date-keyed (`"2026-02-21"`), stores `{ hoursSlept, wakeTime }`.
- Only populated for TODAY when user manually enters hours slept in the main input
- Only ~14 days of data despite 30+ days of app usage
- This is what the calendar, stat cards, and achievements READ from

**`state.history`** — ID-keyed (`"hist_abc123"`), stores prediction entries with `{ date, predictedSleep, actualSleep, medications, caffeine, modifiers, inputs, deltaMinutes, absError }`.
- Has 30+ entries with rich context data (dose amounts, caffeine, modifiers, sleep debt, etc.)
- Each entry's `inputs.hoursSleptLastNight` tells us how much the user slept the PREVIOUS night
- This data is invisible to the calendar/stats — only used by accuracy/insights tabs

### Result
- Calendar shows gaps for days the user was actively using the app
- Stats say "14 days tracked" when user has 30+ days of real data
- Sleep debt, streaks, trends are all computed from incomplete data
- The rich prediction context (what medications, what caffeine, what modifiers) is stored but never connected to the daily sleep record

## What to Build

### 1. `sleepDailyLogs` — Comprehensive Per-Day Snapshot (like body-comp's `dailyLogs`)

Add `sleepDailyLogs: {}` to `getDefaultState()` in `state.js`. Structure:

```javascript
state.sleepDailyLogs = {
    "2026-02-21": {
        date: "2026-02-21",

        // Sleep data
        hoursSlept: 7.5,
        wakeTime: "07:00",
        sleepOnsetMinutes: 1410,     // When they fell asleep (minutes since midnight)

        // Medication context (snapshot of what was taken that day)
        totalAmpDose: 50,
        totalCaffDose: 100,
        medications: [...],           // Deep copy of day's medications
        caffeine: [...],              // Deep copy of day's caffeine

        // Modifiers active that day
        hadWorkout: false,
        hadSauna: false,
        hadVitC: false,
        allNighterMode: false,

        // Prediction accuracy (if prediction exists for this day)
        predictedSleep: 1380,         // minutes
        actualSleep: 1410,            // minutes
        deltaMinutes: 30,
        absError: 30,

        // Pharmacokinetic context
        effectiveThreshold: 16.2,
        sleepDebtBonus: 2.1,
        baseThreshold: 14,
        ampHalfLife: 11,

        // Derived
        sleepTarget: 8,
        sleepDeficit: 0.5,            // target - hoursSlept (0 if surplus)

        // Status for calendar heatmap
        status: "good",              // "great" (≥8h) | "good" (≥7h) | "ok" (≥5.5h) | "poor" (≥4h) | "critical" (<4h) | "allnighter" (0) | "no_data"

        // Data source tracking
        source: "live",              // "live" | "backfilled" | "manual_edit"
        lastUpdated: "2026-02-21T..."
    }
}
```

### 2. Backfill Migration — `migrateSleepDailyLogs()`

One-time migration function that runs on app load (after Firebase load, before rendering). Merges data from BOTH existing stores:

**From `state.history` (prediction entries):**
- Each entry with `inputs.hoursSleptLastNight` on date X tells us sleep on the night of X-1
- Each entry with `actualSleep` tells us sleep onset time for that date
- Medications, caffeine, modifiers, prediction accuracy all come from here
- Mark `source: "backfilled"`

**From `state.sleepHistory`:**
- Direct `hoursSlept` and `wakeTime` values (these are more reliable than derived values)
- Override backfilled values when both exist (user's manual entry wins)

**Logic:**
```
For each entry in state.history (sorted by date):
  1. If entry has inputs.hoursSleptLastNight:
     - previousDate = entry.date - 1 day
     - If sleepDailyLogs[previousDate] doesn't exist, create it
     - Set hoursSlept = inputs.hoursSleptLastNight
  2. If entry has actualSleep:
     - Set sleepOnsetMinutes for entry.date
  3. Copy medications, caffeine, modifiers, prediction data
  4. Copy inputs snapshot fields (threshold, sleepDebtBonus, etc.)

For each entry in state.sleepHistory:
  - If sleepDailyLogs[date] exists, override hoursSlept/wakeTime (manual wins)
  - If not, create new entry with source: "manual_edit"

For each final entry:
  - Compute sleepDeficit, status
  - Set source appropriately
```

### 3. Auto-Save Daily Log — `saveSleepDayLog()`

Like body-comp's `saveDayLog()`. Called:
- When `saveState()` runs (piggyback on existing save cycle)
- When sleep data changes (hours slept input, wake time input)
- When prediction is auto-saved
- At end of day (visibility change / midnight detection)

```javascript
function saveSleepDayLog() {
    var today = getLocalDateString();
    var existing = state.sleepDailyLogs[today] || {};

    state.sleepDailyLogs[today] = {
        date: today,
        hoursSlept: state.hoursSleptLastNight,
        wakeTime: state.wakeTime,
        sleepOnsetMinutes: existing.sleepOnsetMinutes || null,
        totalAmpDose: getValues(state.medications).reduce((s, m) => s + m.dose, 0),
        totalCaffDose: getValues(state.caffeine).reduce((s, c) => s + c.amount, 0),
        medications: JSON.parse(JSON.stringify(getValues(state.medications))),
        caffeine: JSON.parse(JSON.stringify(getValues(state.caffeine))),
        hadWorkout: !!(state.workoutPlan && state.workoutPlan.applied),
        hadSauna: !!(state.modifiers && state.modifiers.sauna && state.modifiers.sauna.active),
        hadVitC: !!(state.modifiers && state.modifiers.vitaminC && state.modifiers.vitaminC.active),
        allNighterMode: !!state.allNighterMode,
        predictedSleep: existing.predictedSleep || null,
        actualSleep: existing.actualSleep || null,
        deltaMinutes: existing.deltaMinutes || null,
        absError: existing.absError || null,
        effectiveThreshold: parseFloat(getEffectiveThreshold().toFixed(1)),
        sleepDebtBonus: parseFloat(calculateSleepDebtBonus().toFixed(1)),
        baseThreshold: state.settings.sleepThreshold,
        ampHalfLife: state.settings.ampHalfLife,
        sleepTarget: state.settings.sleepTarget ?? 8,
        sleepDeficit: Math.max(0, (state.settings.sleepTarget ?? 8) - state.hoursSleptLastNight),
        status: computeSleepStatus(state.hoursSleptLastNight),
        source: existing.source || "live",
        lastUpdated: new Date().toISOString()
    };
}
```

### 4. Refactor Sleep Intelligence to Read from `sleepDailyLogs`

**`getSleepDataForDays(numDays)`** — Currently reads from `state.sleepHistory`. Refactor to read from `state.sleepDailyLogs` with fallback to `sleepHistory` for backward compatibility.

**`calculateSleepStats(data)`** — Already works with the data array from `getSleepDataForDays()`. Will automatically benefit from richer data.

**Calendar rendering** — Currently shows hoursSlept only. With dailyLogs, can show medication context, prediction accuracy, status colors.

**Insights tab** — Currently reads from `state.history`. Can now cross-reference with dailyLogs for richer context.

### 5. Sync `sleepHistory` ← `sleepDailyLogs`

Keep `sleepHistory` in sync as a lightweight mirror (backward compat for `autoPopulateFeedback`):
```javascript
// In saveSleepDayLog():
state.sleepHistory[today] = {
    hoursSlept: state.hoursSleptLastNight,
    wakeTime: state.wakeTime
};
```

### 6. Update Prediction Feedback Flow

When `autoPopulateFeedback()` computes `actualSleep` for a prediction entry, also write it to the corresponding `sleepDailyLogs[date]`:
```javascript
// After computing actualSleep:
if (state.sleepDailyLogs[entry.date]) {
    state.sleepDailyLogs[entry.date].sleepOnsetMinutes = actualSleep;
    state.sleepDailyLogs[entry.date].predictedSleep = entry.predictedSleep;
    state.sleepDailyLogs[entry.date].actualSleep = actualSleep;
    state.sleepDailyLogs[entry.date].deltaMinutes = delta;
    state.sleepDailyLogs[entry.date].absError = Math.abs(delta);
}
```

### 7. localStorage Pruning

Like body-comp prunes `dailyLogs` to 90 days in localStorage:
```javascript
// In safeLocalStorageSet or before save:
// Prune sleepDailyLogs to 180 days in localStorage (full history in Firebase)
```

## Files to Edit

| File | Changes |
|------|---------|
| `js/stimcalc/state.js` | Add `sleepDailyLogs: {}` to defaults, add `computeSleepStatus()` helper |
| `js/stimcalc/history-calendar.js` | Add `migrateSleepDailyLogs()`, `saveSleepDayLog()`, refactor `getSleepDataForDays()` to read from dailyLogs, update `autoPopulateFeedback()` to write to dailyLogs |
| `js/stimcalc/init.js` | Call `migrateSleepDailyLogs()` after Firebase load, call `saveSleepDayLog()` in appropriate spots |
| `js/stimcalc/firebase-sync.js` | Ensure `sleepDailyLogs` is included in save/load/merge, add pruning |

## Critical Rules

1. **Firebase guards** — Both `saveState()` and `saveStateImmediate()` in firebase-sync.js have 5 identical guards. NEVER modify one without the other.
2. **No arrays in Firebase** — Use objects with date keys (already the plan).
3. **Deep copy snapshots** — `JSON.parse(JSON.stringify())` for medications/caffeine arrays stored in dailyLogs.
4. **`?? null` for Firebase** — Every field in dailyLogs that could be undefined MUST use `?? null`. Firebase rejects `undefined`.
5. **Migration runs ONCE** — Use a flag like `state._sleepDailyLogsMigrated` to prevent re-running.
6. **Backward compat** — Keep `sleepHistory` updated as mirror. Don't break `autoPopulateFeedback()`.
7. **Brace balance** — Verify after every file edit: `python3 -c "c=open('FILE').read(); print(c.count('{'), c.count('}'))"`
8. **`_dataLoaded` preserved** — Any state reconstruction must keep `_dataLoaded: true`.

## Agent Team Structure

Use 3-4 agents deployed sequentially (not parallel — files overlap):

1. **Agent 1: Data Layer** — Add `sleepDailyLogs` to state defaults, add `computeSleepStatus()`, add `migrateSleepDailyLogs()`, add `saveSleepDayLog()`, wire into init.js load sequence
2. **Agent 2: Backfill + Sync** — Implement the migration logic, update `autoPopulateFeedback()` to write to dailyLogs, update firebase-sync.js save/load/merge, add pruning
3. **Agent 3: Refactor Readers** — Refactor `getSleepDataForDays()` to read from dailyLogs, update calendar rendering to use richer data, update stats to show accurate "days tracked" count
4. **Agent 4: Verify** — Brace balance all files, verify save guards, verify migration logic handles edge cases (no data, partial data, legacy number format in sleepHistory)

## Verification Checklist

After implementation:
- [ ] `migrateSleepDailyLogs()` correctly backfills from both `state.history` and `state.sleepHistory`
- [ ] Migration only runs once (flag-guarded)
- [ ] `saveSleepDayLog()` fires on sleep input change, prediction auto-save, and state save
- [ ] `getSleepDataForDays(30)` returns data for all 30+ logged days (not just 14)
- [ ] Calendar shows entries for all days that have ANY data
- [ ] Stats (avg, streak, debt, score) use the full dataset
- [ ] `sleepHistory` stays in sync (backward compat)
- [ ] `autoPopulateFeedback()` still works correctly
- [ ] Firebase save/load includes `sleepDailyLogs`
- [ ] `mergeRemoteState()` merges `sleepDailyLogs` properly
- [ ] All 5 save guards intact in both save functions
- [ ] All edited JS files are brace-balanced
- [ ] No `undefined` values in saved data (all use `?? null`)
- [ ] localStorage pruning works (180 days)
- [ ] `recalculate()` 5-second loop continues without errors
