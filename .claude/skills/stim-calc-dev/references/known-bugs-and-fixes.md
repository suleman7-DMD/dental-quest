# Known Bugs and Fixes (All Verified Feb 2026)

## Table of Contents
- [Firebase Sync Fixes (1-5)](#firebase-sync-fixes-1-5)
- [Sleep Algorithm Fixes (6-11)](#sleep-algorithm-fixes-6-11)
- [Prevention Patterns](#prevention-patterns)

## Firebase Sync Fixes (1-5)

### FIX 1: Ghost Load DOM Mismatch (CRITICAL) -- VERIFIED
- **Location:** `renderGhostLoad()` line ~5078
- **Bug:** Function referenced `ghostLoadContent` which didn't exist in HTML.
- **Fix:** Changed to use `ghostMedEntries` (line 5080) and `ghostLoadTotal` (line 5081).
- **HTML:** Both DOM elements exist at lines 2613-2614.

### FIX 2: skipPin() Blocks All Saves (HIGH) -- VERIFIED
- **Location:** `skipPin()` line ~9350
- **Bug:** Set `firebaseSyncEnabled=false` but didn't reset guard flags.
- **Fix:** Now sets all 4 flags:
```javascript
function skipPin() {
    firebaseSyncEnabled = false;
    pinValidated = true;
    hasLoadedFromCloud = true;
    isInitialLoad = false;
    state._dataLoaded = true;
}
```

### FIX 3: Realtime Sync Drops _dataLoaded (HIGH) -- VERIFIED
- **Location:** `setupRealtimeSync()` state reconstruction at line ~9612
- **Bug:** Realtime update reconstructed state but omitted `_dataLoaded`.
- **Fix:** Explicitly sets `_dataLoaded: true` in merged state object.

### FIX 4: saveStateImmediate() Missing Guard (HIGH) -- VERIFIED
- **Location:** `saveStateImmediate()` line ~10381
- **Bug:** Had 4 guards but `saveState()` had 5. Missing `!pinValidated`.
- **Fix:** Both functions now have IDENTICAL 5 guards:
  - Guard 0: `!pinValidated` (line 10327 / 10386)
  - Guard A: `isInitialLoad` (line 10334 / 10393)
  - Guard B: `!hasLoadedFromCloud` (line 10340 / 10399)
  - Guard C: `isEmptyState(state)` (line 10346 / 10405)
  - Guard D: `!state._dataLoaded` (line 10352 / 10411)

### FIX 5: Ghost Load VitC Inconsistency (HIGH) -- VERIFIED
- **Location:** `calculateYesterdayDoseRemaining()` line ~5049
- **Bug:** Ghost load used simple exponential decay, not matching main engine's VitC model.
- **Fix:** Now implements full XR IR/DR split with VitC-aware decay, mirroring `calculateAmpLoad()`.
- **Note:** Uses duplicate implementation (not a shared call) but is mathematically consistent.

---

## Sleep Algorithm Fixes (6-11)

### FIX 6: DR Not in Clearance Search (CRITICAL) -- VERIFIED
- **Location:** `findAmpClearTime()` line ~4145
- **Bug:** Binary search assumed monotonic decrease. XR DR spikes break this.
- **Fix:** Iterative binary search with DR spike re-verification:
  1. Collects ALL future DR release times from all medications
  2. Binary search for first clearance point
  3. Verifies no future DR spike pushes load back above threshold
  4. If re-spike found, restarts search from that DR time
  5. Up to 10 iterations
- **Note:** More sophisticated than a simple "4h-ahead check."

### FIX 7: Circadian Override Without Drug Check (CRITICAL) -- VERIFIED
- **Location:** `calculateSleepTime()` Phase 2 at line ~4302
- **Bug:** Phase 5 unconditionally clamped to FZ end without checking drug levels.
- **Fix:**
  1. Added `applyCircadianConstraints` guard (line 4302):
     ```javascript
     const hoursUntilClearance = (sleepTime - now) / 60;
     const applyCircadianConstraints = hoursUntilClearance < 18;
     ```
  2. Guard checked in Phase 2 (line 4315) and Phase 5 (line 4456)
  3. Phase 6 enforces pharmacokinetic floor
  4. Phase 7 verifies drugs below threshold at predicted time

### FIX 8: Sauna Bonus Never Decays (HIGH) -- VERIFIED
- **Location:** `getEffectiveThreshold()` lines ~3908-3928
- **Bug:** Sauna bonus persisted at full +2.0mg indefinitely.
- **Fix:** Peak for 2 hours, then linear decay over 4 hours (6h total):
```javascript
const peakDuration = 2;
const decayDuration = 4;
let decayFactor = 1.0;
if (hoursSinceSauna > peakDuration) {
    decayFactor = Math.max(0, 1.0 - (hoursSinceSauna - peakDuration) / decayDuration);
}
const baseBonus = saunaTime >= fivePM ? 2.0 : 1.0; // Evening = stronger
threshold += baseBonus * decayFactor;
```
- Also handles cross-midnight timing correctly.

### FIX 9: Caffeine Not Shown as Blocker (MEDIUM) -- VERIFIED
- **Location:** Blocking factors in `calculateSleepTime()` lines ~4272-4282
- **Bug:** Caffeine only added to blockers if it cleared after amphetamine.
- **Fix:** Always adds caffeine as blocker when above threshold:
```javascript
if (caffClear !== null && caffClear > now) {
    blockingFactors.push({ name: 'Caffeine', clearsAt: caffClear, type: 'drug' });
}
```
- Display at lines ~5961-5973 shows all blocking factors.

### FIX 10: Clearance Time "In Past" Display (MEDIUM) -- VERIFIED
- **Location:** `minutesToTimeWithDay()` line ~3634
- **Bug:** Times > 24h showed as past times without context.
- **Fix:** Appends "(tomorrow)" suffix:
```javascript
function minutesToTimeWithDay(mins) {
    const timeStr = minutesToTime(mins);
    if (mins >= 1440) return timeStr + ' (tomorrow)';
    return timeStr;
}
```
- Used in blocking factors display (line 5971) and diagnostic output (line 10862).

### FIX 11: Sleep Debt Display Shows 0.0h (MEDIUM) -- VERIFIED
- **Location:** Diagnostic output lines ~10695-10721
- **Bug:** Hyperarousal zeroed bonus but display showed 0.0h deficit instead of actual deficit.
- **Fix:** Display now shows raw deficit for each day, then shows hyperarousal negation separately:
```
Today: 0h slept -> 8.0h deficit (100% weight)
-> HYPERAROUSAL ACTIVE -> bonus NEGATED -> +0.0mg
```

---

## Prevention Patterns

### XR Clearance Search Pattern
```javascript
// ALWAYS verify no future DR spike after finding clearance
// Collect all DR times, binary search, then verify at each DR time
for (const drTime of drReleaseTimes) {
    if (drTime > clearTime && calculateAmpLoad(drTime) >= threshold) {
        // Re-spike! Search again from drTime
    }
}
```

### Circadian + Drug Pattern
```javascript
// ALWAYS gate circadian on applyCircadianConstraints
// ALWAYS enforce pharmacokinetic floor AFTER circadian
const applyCircadianConstraints = hoursUntilClearance < 18;
if (applyCircadianConstraints && inBlockedZone) {
    sleepTime = fzEnd;
}
// Phase 6: enforce floor
if (sleepTime < pharmacokineticFloor) {
    sleepTime = pharmacokineticFloor;
}
```

### Modifier Decay Pattern
```javascript
// ALWAYS apply time decay to temporary modifiers
const elapsed = hoursSince;
if (elapsed > peakDuration) {
    decayFactor = Math.max(0, 1 - (elapsed - peakDuration) / decayDuration);
}
bonus = maxBonus * decayFactor;
```

### Guard Parity Pattern
```javascript
// saveState() and saveStateImmediate() MUST have IDENTICAL guards
// If you add a guard to one, add it to the other
// Currently: 5 guards in both (lines 10322-10358 and 10381-10420)
```
