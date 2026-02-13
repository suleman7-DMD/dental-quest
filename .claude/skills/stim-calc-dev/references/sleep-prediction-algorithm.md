# Sleep Prediction Algorithm

## Table of Contents
- [Algorithm Overview: 6 Phases (NOT 7)](#algorithm-overview-6-phases-not-7)
- [Phase Details](#phase-details)
- [Sleep Debt Bonus Calculation](#sleep-debt-bonus-calculation-line-3719)
- [Threshold Calculation](#threshold-calculation-line-3848)
- [Blocking Factors](#blocking-factors)

## Algorithm Overview: 6 Phases (NOT 7)

The `calculateSleepTime()` function at line ~4242 implements 6 phases. There is NO Phase 4 — it goes Phase 1, 2, 3, then 5, 6, 7. A nicotine integration section exists between Phase 3 and Phase 5 but is unnumbered and advisory only.

```
calculateSleepTime()                              // Line 4242
    |
    +-- PHASE 1: ESTABLISH PHARMACOKINETIC FLOOR   // Line 4252
    |   +-- Collect amp clearance time (findAmpClearTime)
    |   +-- Collect caff clearance time (findCaffClearTime)
    |   +-- Set baseline: sleepTime = max(ampClear, caffClear)
    |   +-- Build blockingFactors array inline
    |
    +-- PHASE 2: CIRCADIAN CONSTRAINTS              // Line 4285
    |   +-- Calculate applyCircadianConstraints guard
    |   +-- Check WMZ and Forbidden Zone
    |   +-- Push sleep time to FZ end if in blocked zone
    |
    +-- PHASE 3: TIME-BASED BLOCKERS ONLY           // Line 4338
    |   +-- Workout cortisol delay
    |   +-- Thermal cooldown from workout
    |
    +-- (Nicotine integration - advisory, no phase number) // Line 4414
    |
    +-- PHASE 5: FINAL CIRCADIAN CLAMP              // Line 4444
    |   +-- Re-check circadian after all adjustments
    |   +-- Apply applyCircadianConstraints guard again
    |
    +-- PHASE 6: PHARMACOKINETIC FLOOR ENFORCEMENT  // Line 4472
    |   +-- Simple comparison (NOT a while loop)
    |   +-- Normalize times for midnight crossing
    |   +-- Enforce floor if sleep < pharmacokinetic floor
    |
    +-- PHASE 7: FINAL DRUG VERIFICATION            // Line 4484
        +-- Verify amp load < threshold at predicted sleep time
        +-- Verify caff load < caff threshold at predicted sleep time
        +-- Return { sleepTime, blockingFactors, ... }
```

## Phase Details

### Phase 1: Pharmacokinetic Floor (line 4252)
```javascript
// Get clearance times
const ampClear = findAmpClearTime();    // DR-aware binary search
const caffClear = findCaffClearTime();  // Simple binary search

// Initial sleep estimate = latest clearance
let pharmacokineticFloor = Math.max(ampClear || now, caffClear || now);
let sleepTime = pharmacokineticFloor;

// Build blocking factors inline (NOT a separate function)
let blockingFactors = [];
if (ampClear !== null && ampClear > now) {
    blockingFactors.push({ name: 'Amphetamine', clearsAt: ampClear, type: 'drug' });
}
if (caffClear !== null && caffClear > now) {
    blockingFactors.push({ name: 'Caffeine', clearsAt: caffClear, type: 'drug' });
}
```

### Phase 2: Circadian Constraints (line 4285)
```javascript
// Guard: only apply circadian if clearance is < 18 hours away
const hoursUntilClearance = (sleepTime - now) / 60;
const applyCircadianConstraints = hoursUntilClearance < 18;

// Check WMZ and FZ
if (applyCircadianConstraints && sleepTimeInWMZ) {
    sleepTime = forbiddenZone.start; // Push to FZ start
}
if (applyCircadianConstraints && sleepTimeInFZ) {
    sleepTime = forbiddenZone.end;   // Push to FZ end
}
```

### Phase 3: Time-Based Blockers (line 4338)
```javascript
// Workout effects (from workout planner)
// - Cortisol delay: exercise creates alertness for ~2-3h
// - Thermal cooldown: body needs to cool down before sleep
if (workoutCooldownEnd > sleepTime) {
    sleepTime = workoutCooldownEnd;
}
```

### Phase 5: Final Circadian Clamp (line 4444)
```javascript
// Re-check after workout adjustments may have moved sleep time
// Uses same applyCircadianConstraints guard
if (applyCircadianConstraints && normalizedFinalSleep >= wmzStart && normalizedFinalSleep < fzEnd) {
    sleepTime = forbiddenZone.end;
}
```

### Phase 6: Pharmacokinetic Floor Enforcement (line 4472)
```javascript
// IMPORTANT: This is a SIMPLE COMPARISON, NOT a while loop
// No iterations, no 15-minute increments
const wakeMin = timeToMinutes(state.wakeTime);
let sleepNorm = sleepTime < wakeMin ? sleepTime + 1440 : sleepTime;
let floorNorm = pharmacokineticFloor < wakeMin ? pharmacokineticFloor + 1440 : pharmacokineticFloor;
if (sleepNorm < floorNorm) {
    sleepTime = pharmacokineticFloor >= 1440 ? pharmacokineticFloor - 1440 : pharmacokineticFloor;
}
```

### Phase 7: Final Drug Verification (line 4484)
```javascript
// Assert both drugs below threshold at predicted sleep time
const finalAmpLoad = calculateAmpLoad(sleepTime);
const finalCaffLoad = calculateCaffLoad(sleepTime);
// Verification and return
return { sleepTime, blockingFactors, ... };
```

---

## Sleep Debt Bonus Calculation (line 3719)

```javascript
function calculateSleepDebtBonus() {
    // 3-day weighted rolling calculation
    const todayDeficit = Math.max(0, 8 - state.hoursSleptLastNight);    // Weight: 1.0
    const yesterdayDeficit = Math.max(0, 8 - yesterdaySleep);            // Weight: 0.7
    const twoDaysAgoDeficit = Math.max(0, 8 - twoDaysAgoSleep);        // Weight: 0.4

    const totalDeficit = (todayDeficit * 1.0) + (yesterdayDeficit * 0.7) + (twoDaysAgoDeficit * 0.4);

    // HYPERAROUSAL CHECK: < 4 hours sleep negates all bonus
    if (state.hoursSleptLastNight < 4) {
        hyperarousalMode = true;
        return 0; // Cortisol surge negates adenosine
    }
    hyperarousalMode = false;

    // 1mg per hour of weighted deficit, capped at 6mg
    return Math.min(6, totalDeficit * 1.0);
}
```

---

## Threshold Calculation (line 3848)

```javascript
function getEffectiveThreshold() {
    const baseThreshold = state.settings.sleepThreshold; // 14mg default

    let threshold = baseThreshold;

    // + Sleep debt bonus (0-6mg)
    threshold += calculateSleepDebtBonus();

    // + Workout adenosine bonus (from workout planner)
    if (state.workoutPlan.applied && state.workoutPlan.adenosineBonus > 0) {
        threshold += state.workoutPlan.adenosineBonus;
    }

    // + Sauna bonus with decay (peak 2h, linear decay over 4h more)
    // Evening sauna (>= 5PM) = +2.0mg base, earlier = +1.0mg
    if (state.modifiers.sauna.active) {
        const peakDuration = 2;
        const decayDuration = 4;
        let decayFactor = 1.0;
        if (hoursSinceSauna > peakDuration) {
            decayFactor = Math.max(0, 1.0 - (hoursSinceSauna - peakDuration) / decayDuration);
        }
        const baseBonus = saunaTime >= fivePM ? 2.0 : 1.0;
        threshold += baseBonus * decayFactor;
    }

    // Cap at base + 8mg
    const maxThreshold = baseThreshold + 8;
    return Math.min(threshold, maxThreshold);
}
```

---

## Blocking Factors

There is **NO standalone `getBlockingFactors()` function**. Blocking factors are built as an inline array within `calculateSleepTime()`:

```javascript
// Inside calculateSleepTime():
let blockingFactors = [];

// Added for amphetamine when above threshold
blockingFactors.push({ name: 'Amphetamine', clearsAt: ampClear, type: 'drug' });

// Added for caffeine when above threshold
blockingFactors.push({ name: 'Caffeine', clearsAt: caffClear, type: 'drug' });

// Added for circadian blocking
blockingFactors.push({ name: 'Forbidden Zone', clearsAt: fzEnd, type: 'circadian' });

// Returned as part of the result object
return { sleepTime, blockingFactors, ... };
```
