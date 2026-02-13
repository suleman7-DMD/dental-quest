# Circadian Rhythm System

## Table of Contents
- [Overview](#overview)
- [Zone Helper Functions](#zone-helper-functions-verified)
- [Circadian Phase Analysis](#circadian-phase-analysis-line-3421)
- [Interaction with Drug Clearance](#interaction-with-drug-clearance)
- [Display](#display-line-7856)

## Overview

The circadian system models the body's internal clock, affecting sleep ability independent of drug levels.

```
                    Wake Time
                        |
                        v
    +------------------------------------------------------+
    |  GOLDEN ZONE (3-11h after wake)                      |
    |  Normal alertness, sleep possible if drugs clear     |
    +------------------------------------------------------+
                        |
                        v +11 hours
    +------------------------------------------------------+
    |  WAKE MAINTENANCE ZONE (11-13h) -- warning           |
    |  Alerting signal ramping up                          |
    |  Sleep difficult even without stimulants             |
    +------------------------------------------------------+
                        |
                        v +13 hours
    +------------------------------------------------------+
    |  FORBIDDEN ZONE (13-15h) -- HARD BLOCKER             |
    |  Peak circadian alertness                            |
    |  CANNOT fall asleep                                  |
    +------------------------------------------------------+
                        |
                        v +15 hours
    +------------------------------------------------------+
    |  SLEEP GATE (15-17h) -- optimal                      |
    |  Circadian trough, optimal sleep window              |
    |  Melatonin rising, body temperature dropping         |
    +------------------------------------------------------+
```

## Zone Helper Functions (VERIFIED)

There is **NO single `getCircadianZoneTimes()` function**. Zone calculations are split across several helpers:

```javascript
getForbiddenZone()       // Line 3945 — returns { start, end } in minutes
getSleepGate()           // Line 3953 — returns { start, end } in minutes
isInForbiddenZone()      // Line 3961 — boolean check for current time
isInSleepGate()          // Line 3971 — boolean check for current time
getForbiddenZoneEnd()    // Line 3980 — normalized FZ end (handles midnight)
```

### Forbidden Zone (line 3945)
```javascript
function getForbiddenZone() {
    const wakeMinutes = timeToMinutes(state.wakeTime);
    const start = wakeMinutes + (13 * 60); // 13 hours after wake
    const end = wakeMinutes + (15 * 60);   // 15 hours after wake
    return { start, end };
}
```

### Sleep Gate (line 3953)
```javascript
function getSleepGate() {
    const wakeMinutes = timeToMinutes(state.wakeTime);
    const start = wakeMinutes + (15 * 60); // 15 hours after wake
    const end = wakeMinutes + (17 * 60);   // 17 hours after wake
    return { start, end };
}
```

### Forbidden Zone End (line 3980)
```javascript
function getForbiddenZoneEnd() {
    const { end } = getForbiddenZone();
    return end > 24 * 60 ? end - 24 * 60 : end; // Normalize for midnight crossing
}
```

---

## Circadian Phase Analysis (line 3421)

`analyzeCircadianPhase()` is a comprehensive function that:
1. Collects 7-day sleep history
2. Calculates average wake time using **circular mean** (handles midnight crossing)
3. Determines current circadian phase
4. Returns detailed phase information

### Circular Mean Wake Time (inside analyzeCircadianPhase, lines ~3494-3498)
```javascript
// Handles midnight crossing correctly using trigonometric averaging
const sinSum = wakeTimesWithData.reduce((s, w) => s + Math.sin(w.wakeMinutes * 2 * Math.PI / 1440), 0);
const cosSum = wakeTimesWithData.reduce((s, w) => s + Math.cos(w.wakeMinutes * 2 * Math.PI / 1440), 0);
let avgWakeMinutes = Math.atan2(sinSum, cosSum) * 1440 / (2 * Math.PI);
if (avgWakeMinutes < 0) avgWakeMinutes += 1440;
```

**NOTE:** There is NO standalone `calculateAverageWakeTime()` function. This logic is inline within `analyzeCircadianPhase()`.

---

## Interaction with Drug Clearance

### The Critical Bug (FIXED)

Previously, circadian constraints unconditionally clamped sleep time to Forbidden Zone end without checking if drugs had cleared.

### Fixed Logic: `applyCircadianConstraints` Guard (line 4302)
```javascript
// Guard: only apply circadian if drug clearance is < 18 hours away
const hoursUntilClearance = (sleepTime - now) / 60;
const applyCircadianConstraints = hoursUntilClearance < 18;
```

This guard is checked in:
- **Phase 2** (line 4315) — initial circadian application
- **Phase 5** (line 4456) — final circadian clamp after workout adjustments

After circadian adjustments, Phase 6 enforces the pharmacokinetic floor, and Phase 7 verifies drugs are actually below threshold at the predicted sleep time.

---

## Display (line 7856)

```javascript
function renderCircadianPhase() {
    // Renders current phase label, blocking status
    // Shows zone times in 12-hour format
    // Uses minutesToTimeWithDay() for "(tomorrow)" suffix
}
```

The diagnostic forecast panel (updateForecastLogic, line 11103) also shows:
- Golden Zone: 3-11 hours after wake
- Forbidden Zone: 13-15 hours after wake
- Wake Maintenance Zone: 2 hours before Forbidden Zone
- Current phase and whether it's blocking sleep
