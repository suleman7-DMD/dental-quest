# Pharmacokinetic Models

## Table of Contents
- [Core Decay Equation](#core-decay-equation)
- [Default Parameters](#default-parameters-verified)
- [XR Model (ALL Amphetamine Doses)](#xr-model-all-amphetamine-doses)
- [Vitamin C 3-Segment Model](#vitamin-c-3-segment-model)
- [Caffeine Model](#caffeine-model)
- [Total Load Calculations](#total-load-calculations)
- [Clearance Time: DR-Aware Search](#clearance-time-dr-aware-search-line-4145)
- [Ghost Load Calculation](#ghost-load-calculation-line-5049)

## Core Decay Equation
```
Remaining = InitialDose * 0.5^(elapsed_hours / half_life)
```

All decay calculations in the codebase use this formula consistently.

## Default Parameters (VERIFIED)

| Parameter | Default | UI Range | Setting Key |
|-----------|---------|----------|-------------|
| Amphetamine half-life | **11 hours** | 8-15 (step 0.5) | `settings.ampHalfLife` |
| Caffeine half-life | **5 hours** | 3-8 (step 0.5) | `settings.caffHalfLife` |
| Sleep threshold | **14 mg** | configurable | `settings.sleepThreshold` |
| Caffeine threshold | **25 mg** | configurable | `settings.caffThreshold` |
| Body weight | **190 lbs** | configurable | `settings.weight` |
| VitC half-life reduction | **0.7** (70%) | hardcoded | calculated at line 4042 |

---

## XR Model (ALL Amphetamine Doses)

**CRITICAL: There is NO IR-only model.** Every amphetamine dose is modeled as XR with 50/50 split. There is no `med.type` field.

### Two-Phase Release
```
Dose taken at T=0
    |
    +-- T+0: 50% releases immediately (IR component)
    |        -> Begins decaying via half-life
    |
    +-- T+4h: 50% releases (DR component)
             -> Begins decaying via half-life from this point
```

### Implementation (inside calculateAmpLoad, line ~4075)
```javascript
const immediateRelease = totalDose * 0.5;      // 50% at T+0
const delayedRelease = totalDose * 0.5;         // 50% at T+4h
const delayedReleaseTime = effectiveDoseTime + 240; // T+4 hours (240 minutes)

// Both components pass through calculateDecayWithVitC()
if (atMinutes >= effectiveDoseTime) {
    totalLoad += calculateDecayWithVitC(
        immediateRelease, effectiveDoseTime, atMinutes,
        baseHalfLife, reducedHalfLife, vitCTime, vitCExpireTime
    );
}
if (atMinutes >= delayedReleaseTime) {
    totalLoad += calculateDecayWithVitC(
        delayedRelease, delayedReleaseTime, atMinutes,
        baseHalfLife, reducedHalfLife, vitCTime, vitCExpireTime
    );
}
```

### Non-Monotonic Curve
```
Load
 ^
 |     +-- DR Release spike at T+4h
 |    / |\
 |   /  | \
 |  /   |  \
 | /    |   \\
 |/     |    \\
 +------+-----\\---------> Time
 T=0    T+4h    \\
                  \\___
```
**CRITICAL:** This non-monotonic behavior breaks naive binary search.

---

## Vitamin C 3-Segment Model

VitC acidifies urine, reducing amphetamine half-life. Effect has an **8-hour TTL**.

### Implementation (calculateDecayWithVitC, line ~3988)
```
Segment A: Before VitC onset -> normal half-life
Segment B: VitC active window -> reduced half-life (70% of normal)
Segment C: After VitC expired (8h TTL) -> back to normal half-life
```

**Key constants:**
```javascript
const reducedHalfLife = baseHalfLife * 0.7;               // Line 4042
const VITAMIN_C_EFFECT_HOURS = 8;                          // Line 4896
const vitCExpireTime = vitCTime + (VITAMIN_C_EFFECT_HOURS * 60); // Line 4043
```

**IMPORTANT:** The shift is **instant** — no gradual transition period. At the VitC time, half-life immediately drops to 70%. At expiration (8h later), it immediately returns to normal.

### VitC Status Helpers
```javascript
getVitaminCTimeMinutes()    // Line 4898 - VitC time in minutes
getRawVitaminCTimeMinutes() // Line 4938 - Raw time without adjustments
isVitaminCEffective()       // Line 4960 - Is VitC currently active?
getVitaminCStatus()         // Line 4970 - Full status object
```

---

## Caffeine Model

Simple exponential decay, no extended release:
```javascript
// Inside calculateCaffLoad() at line 4102
const halfLife = state.settings.caffHalfLife * 60; // Convert hours to minutes
getValues(state.caffeine).forEach(caff => {
    const elapsed = atMinutes - effectiveDoseTime;
    totalLoad += caff.amount * Math.pow(0.5, elapsed / halfLife);
});
```

---

## Total Load Calculations

### Amphetamine Load (line 4036)
```javascript
function calculateAmpLoad(atMinutes) {
    let totalLoad = 0;
    getValues(state.medications).forEach(med => {
        // Day difference calculation
        // Normal mode: include today (daysDiff=0) and yesterday (daysDiff=1)
        // All-nighter: include up to 3 days old (daysDiff <= 3)
        if (daysDiff > 1 && !state.allNighterMode) return;
        if (daysDiff > 3) return;

        // XR split: 50% IR at dose time, 50% DR at T+4h
        // Both through calculateDecayWithVitC()
    });
    return totalLoad;
}
```

### Caffeine Load (line 4102)
```javascript
function calculateCaffLoad(atMinutes) {
    // Same day logic but:
    // Normal: yesterday only (daysDiff <= 1)
    // All-nighter: up to 2 days (daysDiff <= 2)
    if (daysDiff > 1 && !state.allNighterMode) return;
    if (daysDiff > 2) return;
}
```

---

## Clearance Time: DR-Aware Search (line 4145)

### The Challenge
XR delayed release creates non-monotonic curves. Simple binary search fails because load can spike back up at DR release time.

### Actual Implementation: Iterative Binary Search with Re-Spike Detection
```javascript
function findAmpClearTime() {
    // Step 1: Collect ALL future DR release times
    const drReleaseTimes = [];
    getValues(state.medications).forEach(med => {
        const drTime = effectiveDoseTime + 240; // T+4h
        if (drTime > now) drReleaseTimes.push(drTime);
    });
    drReleaseTimes.sort((a, b) => a - b);

    // Step 2: Quick check — already clear at all DR times?
    if (calculateAmpLoad(now) < threshold) {
        let allClear = true;
        for (const drTime of drReleaseTimes) {
            if (calculateAmpLoad(drTime) >= threshold) allClear = false;
        }
        if (allClear) return now;
    }

    // Step 3: Iterative binary search (up to 10 iterations)
    for (let iteration = 0; iteration < 10; iteration++) {
        // Binary search with 1-minute precision
        while (high - low > 1) {
            const mid = Math.floor((low + high) / 2);
            if (calculateAmpLoad(mid) > threshold) low = mid;
            else high = mid;
        }
        clearTime = high;

        // Step 4: Verify no future DR spike re-triggers above threshold
        let reSpike = false;
        for (const drTime of drReleaseTimes) {
            if (drTime > clearTime && calculateAmpLoad(drTime) >= threshold) {
                searchStart = drTime; // Restart from DR spike
                reSpike = true;
                break;
            }
        }
        if (!reSpike) break; // Safe — no re-spike
    }
}
```

### Caffeine Clearance (line 4209)
Simpler — caffeine has no DR spikes, so standard binary search works.

---

## Ghost Load Calculation (line 5049)

```javascript
function calculateYesterdayDoseRemaining(dose, doseTimeMinutes, halfLifeHours, isXR = true) {
    // Mirrors the XR split logic from calculateAmpLoad()
    // For XR with halfLife >= 10h:
    //   50% IR at dose time, 50% DR at T+4h
    //   Both through VitC-aware decay
    // Ensures ghost load display matches engine calculations
}
```

**FIX NOTE:** This was updated to mirror the main engine's XR split + VitC handling for consistency.
