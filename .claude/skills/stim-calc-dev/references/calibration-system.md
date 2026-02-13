# Calibration / Accuracy Tracking System

## Table of Contents
- [Overview](#overview)
- [Key Functions](#key-functions)
- [History Entry Structure](#history-entry-structure)
- [Display Functions](#display-functions)

## Overview

The calibration system tracks prediction accuracy over time, allowing threshold adjustment for better predictions.

## Key Functions

### Save Prediction: saveDay() (line ~7516)

Creates or updates a history entry for today:
```javascript
function saveDay() {
    const { sleepTime } = calculateSleepTime();
    const today = getLocalDateString();

    // Check for existing entry
    const existingEntry = getValues(state.history).find(h => h.date === today);

    if (existingEntry) {
        // Update existing entry
        state.history[existingEntry.id].predictedSleep = sleepTime;
        state.history[existingEntry.id].medications = getValues(state.medications);
        state.history[existingEntry.id].caffeine = getValues(state.caffeine);
        state.history[existingEntry.id].modifiers = JSON.parse(JSON.stringify(state.modifiers));
        state.history[existingEntry.id].autoSaved = false;
        state.history[existingEntry.id].lastUpdated = new Date().toISOString();
        state.history[existingEntry.id].inputs = snapshotPredictionInputs();
    } else {
        // Create new entry
        const id = generateId('hist');
        state.history[id] = {
            id, date: today,
            medications: getValues(state.medications),
            caffeine: getValues(state.caffeine),
            modifiers: JSON.parse(JSON.stringify(state.modifiers)),
            predictedSleep: sleepTime,
            actualSleep: null,           // Filled later by feedback
            autoSaved: false,
            predictedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            inputs: snapshotPredictionInputs()
        };
    }
    saveState();
}
```

**Note:** `deltaMinutes` and `absError` are NOT set at save time — they're computed when actual sleep is recorded via `autoPopulateFeedback()` or manual feedback.

### Auto-Fill Actuals: autoPopulateFeedback() (line ~7567)

Automatically fills actual sleep times from sleep history:
```javascript
function autoPopulateFeedback() {
    getValues(state.history).forEach(entry => {
        if (entry.actualSleep !== null) return; // Already filled

        // Look up next day's sleep entry
        const nextDayStr = getLocalDateString(nextDay);
        const sleepEntry = state.sleepHistory[nextDayStr];

        if (sleepEntry && sleepEntry.hoursSlept && sleepEntry.wakeTime) {
            // Compute actual sleep time: wake time - hours slept
            let actualSleep = wakeMinutes - (hoursSlept * 60);
            if (actualSleep < 0) actualSleep += 24 * 60;

            state.history[entry.id].actualSleep = actualSleep;
            state.history[entry.id].autoFilled = true;
            state.history[entry.id].deltaMinutes = computeSleepDelta(entry.predictedSleep, actualSleep);
            state.history[entry.id].absError = Math.abs(state.history[entry.id].deltaMinutes);
        }
    });
}
```

### Compute Delta: computeSleepDelta() (line ~3648)

Handles midnight crossing with +/-720 minute wrapping:
```javascript
function computeSleepDelta(predicted, actual) {
    const p = ((predicted % 1440) + 1440) % 1440;
    const a = ((actual % 1440) + 1440) % 1440;
    let diff = a - p;
    if (diff > 720) diff -= 1440;   // Actual before midnight
    if (diff < -720) diff += 1440;  // Predicted before midnight
    return diff; // Positive = slept later than predicted
}
```

### Calculate Accuracy: calculateAccuracyStats(days) (line ~8968)

Returns detailed accuracy statistics:
```javascript
function calculateAccuracyStats(days = 30) {
    // Returns:
    return {
        totalEntries: count,
        entriesWithFeedback: withFeedbackCount,
        avgError: avgDelta,               // Signed average (bias direction)
        avgAbsError: avgAbsoluteDelta,    // Absolute average
        within30min: percentWithin30,      // % within 30 minutes
        within60min: percentWithin60,      // % within 1 hour
        trend: trendDirection,             // improving/worsening
        recentBias: recentBiasDirection    // early/late tendency
    };
}
```

### Calibration Recommendation: getCalibrationRecommendation() (line ~9045)

Detailed suggestions based on prediction patterns. More sophisticated than `suggestCalibration()`.

### Simple Calibration Toast: suggestCalibration() (line ~9093)

Quick threshold adjustment suggestions:
```javascript
function suggestCalibration() {
    const withFeedback = getValues(state.history)
        .filter(h => h.actualSleep !== null).slice(0, 5);
    if (withFeedback.length < 3) return;

    const avgDiff = average of (actual - predicted);

    if (avgDiff > 30) {
        // Sleeping later than predicted -> lower threshold
        showToast('Try lowering your Sleep Threshold in settings.');
    } else if (avgDiff < -30) {
        // Sleeping earlier -> raise threshold
        showToast('Try raising your Sleep Threshold in settings.');
    }
}
```

### Migration: migrateHistoryEntries() (line ~3678)

Backfills missing fields for older history entries:
- `deltaMinutes` and `absError` (from predicted/actual)
- `autoSaved` (default false)
- `inputs` (default null)
- `predictedAt` (extracted from ID timestamp if possible)

---

## History Entry Structure

```javascript
{
    id: "hist_1707400000000_abc123",
    date: "2026-02-09",

    // Prediction (set at save time)
    predictedSleep: 870,              // Minutes since midnight
    predictedAt: "2026-02-09T20:00:00Z",
    autoSaved: false,

    // Snapshots (set at save time)
    medications: [...],                // Array snapshot
    caffeine: [...],                   // Array snapshot
    modifiers: {...},                  // Deep copy
    inputs: {...},                     // snapshotPredictionInputs()

    // Feedback (set later)
    actualSleep: 900,                 // Minutes since midnight (null until filled)
    autoFilled: true,                 // Was it auto-filled vs manual

    // Computed (set at feedback time)
    deltaMinutes: 30,                 // actual - predicted
    absError: 30,                     // |deltaMinutes|

    lastUpdated: "2026-02-10T08:00:00Z"
}
```

---

## Display Functions

| Function | Line | Purpose |
|----------|------|---------|
| `renderHistory()` | ~7626 | Main history list |
| `renderSleepCalendar()` | ~7778 | Calendar view |
| `renderAccuracyDashboard()` | ~8051 | Stats dashboard with hero metric |
| `renderAccuracyHeroHint()` | ~8117 | Hero accuracy display |
| `renderSleepPerformance()` | ~8160 | Sleep quality metrics |
| `renderSleepAchievements()` | ~8482 | Achievement/streak display |
| `renderSleepHistoryList()` | ~8862 | Detailed history list |
