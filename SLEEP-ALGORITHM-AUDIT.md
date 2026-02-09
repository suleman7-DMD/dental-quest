# Sleep Prediction Algorithm Audit Report

## Executive Summary
- **Total bugs found**: 8 confirmed + 1 bonus finding
- **Critical**: 2 | **High**: 2 | **Medium**: 3 | **Low**: 2
- **Core issue**: Phase 5 of `calculateSleepTime()` unconditionally overrides the pharmacokinetic floor with a wrapped circadian time, combined with a binary search that assumes monotonically decreasing drug loads (violated by XR delayed-release spikes), producing impossible sleep predictions where predicted sleep time has drug levels 3x above threshold.

## File Under Audit
`stimulant-elimination-calculator.html` — 11,402 lines

---

## Bug 1: Ghost Load Not Added to Calculations

### Severity: LOW (display-only)

### Current Behavior
The forecast displays:
```
GHOST LOAD (Remaining from yesterday):
• Amphetamine: 38.9mg still active
• Caffeine: 18.7mg still active
NOTE: These residual amounts are ADDED to today's calculations.
```
Then displays: `CURRENT AMPHETAMINE LOAD: 47.9mg`

User concludes: total should be 47.9 + 38.9 = ~87mg. But the 47.9mg ALREADY contains the ghost load.

### Root Cause
**NOT a calculation bug — it's a misleading display.**

`calculateAmpLoad()` (line 4016) already includes yesterday's doses. Line 4043:
```javascript
if (daysDiff > 1 && !state.allNighterMode) return;
```
This means `daysDiff === 1` (yesterday) ALWAYS passes through — ghost loads are ALWAYS in the main calculation.

The ghost load display (lines 10786-10802) uses a separate function `calculateYesterdayDoseRemaining()` (line 4957) which calculates a display-only value. The forecast text at lines 10811-10816 misleadingly says these are "ADDED" when they're already included.

Additionally, `calculateYesterdayDoseRemaining()` uses simplified VitC handling (single reduced half-life) while `calculateAmpLoad()` uses accurate 3-segment decay via `calculateDecayWithVitC()`, so the ghost display value can differ slightly from the engine's actual ghost contribution.

### Evidence
- `calculateAmpLoad()` line 4043: daysDiff=1 always included
- `cleanupOldMedications()` line 4457: keeps yesterday's meds
- Ghost display at lines 10786-10802: uses separate calculation
- Text at lines 10811-10816: says "ADDED" (misleading)

### Fix
**Lines 10811-10816** — Change display text to clarify inclusion:
```javascript
// OLD:
"NOTE: These residual amounts are ADDED to today's calculations."

// NEW:
"NOTE: These values are ALREADY INCLUDED in the Current Load above."
"Today's new doses contribute: ~${(ampLoad - ghostAmpTotal).toFixed(1)}mg amp, ~${(caffLoad - ghostCaffTotal).toFixed(0)}mg caffeine"
```

Consider also: use `calculateAmpLoad()` for ghost display calculation instead of the separate `calculateYesterdayDoseRemaining()` to ensure numbers always add up exactly.

---

## Bug 2: Amphetamine Clearance Time Shows as Past

### Severity: MEDIUM (display confusion, contributes to user distrust)

### Current Behavior
At 3:14 AM, the forecast says:
- "Amphetamine: Clears at 2:57 AM" (looks like 17 minutes AGO)
- "Amphetamine: 47.9mg (threshold: 19.0mg) — ABOVE"

These appear contradictory. If it cleared at 2:57, load should be below threshold.

### Root Cause
**Display bug — the clearance calculation is correct but day info is stripped.**

`findAmpClearTime()` binary searches forward from `now` and can return values >1440 (e.g., 1617 = 2:57 AM tomorrow, ~23.7 hours from now). But `minutesToTime()` (line 3624) always wraps to 0-1439:
```javascript
mins = ((mins % 1440) + 1440) % 1440;
```

So `minutesToTime(1617)` = `minutesToTime(177)` = "2:57 AM" — with no "tomorrow" indicator. At 3:14 AM, this looks like the past.

Three display locations strip day info:
1. `minutesToTime()` — line 3624 (core formatter)
2. Blocking factors display — line 5879: `minutesToTime(f.clearsAt % (24*60))`
3. Diagnostic log — line 10738: same pattern

### Evidence
- `findAmpClearTime()` returns raw minutes (can be >1440)
- `minutesToTime()` line 3624: wraps all values to 0-1439
- No "tomorrow" indicator anywhere in display chain

### Fix
Create a day-aware display wrapper and use it in clearance displays:

```javascript
function formatClearTimeWithDay(mins) {
    const now = getCurrentMinutes();
    const dayOffset = Math.floor(mins / 1440);
    const timeStr = minutesToTime(mins);
    if (dayOffset > 0 || mins > 1440) return timeStr + ' (tomorrow)';
    // Also handle case where clearance is past midnight but "today"
    if (mins < now && (now - mins) > 12 * 60) return timeStr + ' (tomorrow)';
    return timeStr;
}
```

Apply at:
- Line 5879: blocking factors display
- Line 10738: diagnostic log
- Line 5801: main sleep time display

---

## Bug 3: Delayed-Release XR Not Properly Accounted For in Clearance

### Severity: CRITICAL (produces wrong clearance times)

### Current Behavior
- 30mg XR at 23:42 → DR (15mg) releases at 03:42 AM
- 20mg XR at 01:30 → DR (10mg) releases at 05:30 AM
- Binary search may report clearance BEFORE a DR spike

### Root Cause
**`findAmpClearTime()` (line 4122) uses a binary search that assumes `calculateAmpLoad(t)` is monotonically decreasing.** This is FALSE for XR medications.

XR creates non-monotonic load curves:
```
Time:    T+0     T+1h    T+2h    T+3h    T+4h(DR!)  T+5h
Load:    15mg    14mg    13mg    12.2mg  26.7mg      25mg
                                         ↑ SPIKE!
```

The binary search at lines 4140-4147:
```javascript
while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (calculateAmpLoad(mid) > threshold) {
        low = mid;
    } else {
        high = mid;  // Assumes load stays below — WRONG if DR spike coming
    }
}
```

The initial guard (line 4136) checks `now` and `now+240`, but this only protects the current moment, not the binary search midpoints.

**Concrete failure**: Load drops below threshold at 3:00 AM, binary search converges there. But at 3:42 AM, DR releases 15mg → load spikes to 26.7mg. The search already terminated and missed it.

### Evidence
- `calculateAmpLoad()` lines 4069-4074: DR only added when `atMinutes >= delayedReleaseTime`
- `findAmpClearTime()` lines 4140-4147: standard binary search (monotonic assumption)
- Guard at line 4136: only checks now and now+240

### Fix
Replace binary search with DR-aware iterative search. After finding initial clearance time T, verify load stays below threshold at ALL pending DR release times after T:

```javascript
function findAmpClearTime() {
    const threshold = getEffectiveThreshold();
    if (getCount(state.medications) === 0) return null;
    const now = getCurrentMinutes();
    const maxSearchHours = state.allNighterMode ? 48 : 36;
    const maxTime = now + maxSearchHours * 60;

    // Collect ALL future DR release times
    const drReleaseTimes = [];
    const today = getLocalDateString();
    getValues(state.medications).forEach(med => {
        const baseDoseTime = timeToMinutes(med.time);
        const medDate = med.date || today;
        const todayDate = parseLocalDate(today);
        const doseDate = parseLocalDate(medDate);
        const daysDiff = Math.round((todayDate - doseDate) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0 || daysDiff > 3) return;
        if (daysDiff > 1 && !state.allNighterMode) return;
        const effectiveDoseTime = baseDoseTime - (daysDiff * 24 * 60);
        const drTime = effectiveDoseTime + 240;
        if (drTime > now) drReleaseTimes.push(drTime);
    });
    drReleaseTimes.sort((a, b) => a - b);

    // Check if already clear (including all future DR releases)
    if (calculateAmpLoad(now) < threshold) {
        let allClear = true;
        for (const drTime of drReleaseTimes) {
            if (calculateAmpLoad(drTime) >= threshold) { allClear = false; break; }
        }
        if (allClear) return now;
    }

    // Iterative: binary search, then verify against DR spikes
    let searchStart = now;
    let clearTime = null;

    while (true) {
        let low = searchStart;
        let high = maxTime;
        while (high - low > 1) {
            const mid = Math.floor((low + high) / 2);
            if (calculateAmpLoad(mid) > threshold) { low = mid; } else { high = mid; }
        }
        clearTime = high;

        // Verify: no DR spike after clearTime pushes load back above threshold
        let reSpike = false;
        for (const drTime of drReleaseTimes) {
            if (drTime > clearTime && calculateAmpLoad(drTime) >= threshold) {
                searchStart = drTime;  // Restart search from DR spike
                reSpike = true;
                break;
            }
        }
        if (!reSpike) break;
    }

    return (calculateAmpLoad(clearTime) >= threshold) ? maxTime : clearTime;
}
```

---

## Bug 4: Circadian Override Without Drug Check

### Severity: CRITICAL (produces impossible sleep predictions)

### Current Behavior
- Forbidden Zone ends: 4:46 AM
- Sleep prediction: 4:46 AM
- Amp load at 4:46 AM: ~43mg (threshold 19mg — 2.3x above!)

The algorithm sets sleep onset to Forbidden Zone end without verifying drugs have cleared.

### Root Cause
**Three compounding issues in `calculateSleepTime()`:**

**Problem A — Phase 5 missing `applyCircadianConstraints` guard (line 4398):**
Phase 2 correctly gates circadian checks with `applyCircadianConstraints` (true when hoursUntilClearance < 18). But Phase 5 (Final Circadian Clamp) has NO such guard:
```javascript
// Phase 5 — NO guard!
if (normalizedFinalSleep >= wakeMaintenanceStart && normalizedFinalSleep < forbiddenZone.end) {
    sleepTime = forbiddenZone.end > 24 * 60 ? forbiddenZone.end - 24 * 60 : forbiddenZone.end;
}
```
When Phase 2 correctly skips (clearance >18h away), Phase 5 re-applies the override anyway.

**Problem B — Time wrapping destroys pharmacokinetic floor (line 4400):**
`forbiddenZone.end - 24*60` converts next-day times to today. When `forbiddenZone.end = 1726` (4:46 AM tomorrow), this produces `286` (4:46 AM today). The `pharmacokineticFloor` remains at 1617 (2:57 AM tomorrow), so `sleepTime (286) << pharmacokineticFloor (1617)`.

**Problem C — No post-circadian drug verification:**
After Phase 5 overrides sleepTime, there is ZERO re-verification that drugs have actually cleared at the new time. The Phase 1 comment says "NO modifier can push sleep time earlier than this" — but Phase 5 violates this invariant.

**The full violation path:**
1. Wake at 1:46 PM (826 min). FZ = [1606, 1726].
2. Phase 1: ampClear = 1617, `pharmacokineticFloor = 1617`, `sleepTime = 1617`
3. Phase 2: hoursUntilClearance = 23.7h > 18 → `applyCircadianConstraints = false` → SKIPS (correct)
4. Phase 5: normalizedFinalSleep (1617) falls in FZ range [1486, 1726] → overrides `sleepTime = 1726 - 1440 = 286`
5. **Invariant broken**: sleepTime (286) << pharmacokineticFloor (1617)
6. At minute 286 (4:46 AM): `calculateAmpLoad(286)` ≈ 43mg >> 19mg threshold

### Evidence
- Phase 5: lines 4398-4411 (no `applyCircadianConstraints` check)
- Phase 2: line 4259 (HAS the check — inconsistency)
- Time wrap: line 4400 (`forbiddenZone.end - 24*60`)
- No re-verification after any phase

### Fix
**Fix A** — Add guard to Phase 5 (line 4398):
```javascript
// Change:
if (normalizedFinalSleep >= wakeMaintenanceStart && normalizedFinalSleep < forbiddenZone.end) {
// To:
if (applyCircadianConstraints && normalizedFinalSleep >= wakeMaintenanceStart && normalizedFinalSleep < forbiddenZone.end) {
```

**Fix B** — Add pharmacokinetic floor enforcement after Phase 5 (after line 4411):
```javascript
// PHASE 6: PHARMACOKINETIC FLOOR ENFORCEMENT
// Ensure circadian adjustments never push sleep BEFORE drug clearance
const sleepTimeRaw = sleepTime < getCurrentMinutes() ? sleepTime + 1440 : sleepTime;
const floorRaw = pharmacokineticFloor;
if (sleepTimeRaw < floorRaw) {
    sleepTime = pharmacokineticFloor;
    // Re-normalize if needed
    if (sleepTime >= 1440) sleepTime -= 1440;
}

// PHASE 7: FINAL DRUG VERIFICATION
// Confirm both substances are actually below threshold at predicted sleep time
const verifyTime = sleepTime < getCurrentMinutes() ? sleepTime + 1440 : sleepTime;
if (calculateAmpLoad(verifyTime) >= getEffectiveThreshold()) {
    sleepTime = pharmacokineticFloor;
    if (sleepTime >= 1440) sleepTime -= 1440;
}
if (calculateCaffLoad(verifyTime) >= state.settings.caffThreshold) {
    const caffClear = findCaffClearTime();
    if (caffClear !== null && caffClear > verifyTime) {
        sleepTime = caffClear;
        if (sleepTime >= 1440) sleepTime -= 1440;
    }
}
```

---

## Bug 5: Sleep Debt Display Error

### Severity: MEDIUM (display-only, calculation is correct)

### Current Behavior
```
Today: 0h slept → 8.0h deficit (100% weight)
Total weighted deficit: 0.0h → +0.0mg threshold bonus
```
8.0h × 100% = 8.0h, not 0.0h.

### Root Cause
**Display bug caused by hyperarousal early return.**

`calculateSleepDebtBonus()` (line 3712): When `state.hoursSleptLastNight < 4`, it sets `hyperarousalMode = true` and **returns 0 immediately** (line 3729). The function never computes the weighted deficit.

The display at line 10868 uses `sleepDebtBonus / 1.0` as a proxy for "weighted deficit":
```javascript
`Total weighted deficit: ${(sleepDebtBonus / 1.0).toFixed(1)}h → +${sleepDebtBonus.toFixed(1)}mg threshold bonus`
```
When hyperarousal returns 0, this shows "0.0h" for the deficit — but the per-day breakdown (computed separately at lines 10589-10613) correctly shows 8.0h.

The hyperarousal indicator IS shown at line 10863 but in a different section, so the user sees contradictory numbers without bridging context.

### Evidence
- `calculateSleepDebtBonus()` line 3725-3729: early return 0 when < 4h sleep
- Display line 10868: uses bonus as proxy for deficit
- Per-day display lines 10589-10613: independently computes correct 8.0h

### Fix
**Line 10868** — Compute raw weighted deficit independently:
```javascript
// Compute raw deficit from individual day entries (already available)
const rawWeightedDeficit = debtDetails.reduce((sum, d) => sum + d.weightedDeficit, 0);

if (isHyperarousalMode()) {
    text += `Raw weighted deficit: ${rawWeightedDeficit.toFixed(1)}h\n`;
    text += `⚠️ HYPERAROUSAL ACTIVE (< 4h sleep) → Sleep pressure bonus NEGATED\n`;
    text += `Effective threshold bonus: +0.0mg`;
} else {
    text += `Total weighted deficit: ${rawWeightedDeficit.toFixed(1)}h → +${sleepDebtBonus.toFixed(1)}mg threshold bonus`;
}
```

---

## Bug 6: Crash/Second Wind Times After Predicted Sleep

### Severity: LOW (display-only)

### Current Behavior
- Sleep onset: 4:46 AM
- Crash begins: ~7:30 AM (AFTER sleep!)
- Second wind: 5:16 AM (AFTER sleep!)

### Root Cause
**Two separate display issues:**

**Forecast text (lines 10950-10952):** Crash and second wind are displayed UNCONDITIONALLY with no check against sleep onset time.

**Second wind uses wrong time reference (line 10952):** Uses `forbiddenZone.end + 30` (FZ END plus 30 minutes), but the "second wind" IS the Forbidden Zone onset (when circadian alerting peaks). Should use `forbiddenZone.start`.

**Feelings timeline (lines 6244-6302):** Crash correctly filters by `< sleepTime` (line 6275), but second wind only checks `> now` (line 6290) — missing `< sleepTime` check.

### Evidence
- Forecast crash: line 10950 (no sleepTime check)
- Forecast second wind: line 10952 (no sleepTime check + wrong time)
- Timeline crash: line 6275 (correct filter)
- Timeline second wind: line 6290 (missing sleepTime filter)

### Fix
**Line 10950** — Add sleep time check for crash:
```javascript
${crashTime && crashTime < sleepTimeMinutes ? `• Crash begins: ~${minutesToTime(crashTime)}` : ''}
```

**Line 10952** — Fix second wind time and add check:
```javascript
// Change forbiddenZone.end + 30 to forbiddenZone.start
// Add conditional: only show if before sleep time
${fzStart < sleepTimeMinutes ? `• Second wind: ~${minutesToTime(fzStart)} (circadian alerting peak)` : ''}
```

**Line 6290** — Add sleepTime filter to timeline:
```javascript
if (fzStart > now && fzStart < sleepTime) {
```

---

## Bug 7: Sauna Bonus Persisting Too Long

### Severity: HIGH (inflates threshold, predicts earlier sleep than reality)

### Current Behavior
- Sauna at 19:00
- 3:14 AM (8+ hours later): still showing +2.0mg threshold bonus

### Root Cause
**No time decay on sauna bonus.** In `getEffectiveThreshold()` (lines 3864-3909):

The `saunaTaken` flag is binary — once true, the full bonus (+2.0mg evening / +1.0mg day) applies until a hardcoded 6 AM cutoff. No decay whatsoever.

Cross-midnight handling (line 3889): if `daysDiff === 1 && now < 6*60 && saunaTime >= 17*60`, the bonus persists. This means an evening sauna at 19:00 gives +2.0mg from 19:00 until 6:00 AM = **11 hours at full strength**.

Scientifically, parasympathetic rebound from sauna peaks ~1-2 hours post-sauna and decays over ~4 hours.

**Same issue with legacy `heavyLift` modifier (lines 3859-3862):** Flat +2.0mg with NO date/time tracking, persists indefinitely until manually unchecked.

### Evidence
- Lines 3900-3908: binary bonus, no decay
- Line 3889: cross-midnight extends to 6 AM
- Lines 3859-3862: heavyLift has zero temporal awareness

### Fix
**Lines 3900-3908** — Add time-based decay:
```javascript
if (saunaTaken) {
    // Calculate hours since sauna
    let hoursSinceSauna;
    if (daysDiff === 0) {
        hoursSinceSauna = (now - saunaTime) / 60;
    } else {
        hoursSinceSauna = ((24 * 60 - saunaTime) + now) / 60;
    }

    // Peak for 2 hours, linear decay over next 4 hours (6h total duration)
    const peakDuration = 2;
    const decayDuration = 4;
    let decayFactor = 1.0;
    if (hoursSinceSauna > peakDuration) {
        decayFactor = Math.max(0, 1.0 - (hoursSinceSauna - peakDuration) / decayDuration);
    }

    const baseBonus = saunaTime >= fivePM ? 2.0 : 1.0;
    threshold += baseBonus * decayFactor;
}
```

Apply identical pattern to the display in `generateForecastLogic()` (lines 10582-10583).

---

## Bug 8: Caffeine Not Shown as Blocker

### Severity: MEDIUM (display gap, sleep time calculation is correct)

### Current Behavior
- Caffeine: 97mg (4x above 25mg threshold)
- Blocking factors only show: Forbidden Zone, Amphetamine
- No mention of caffeine

### Root Cause
**Caffeine only added to `blockingFactors` if it clears AFTER amphetamine.**

In `calculateSleepTime()` lines 4208-4226:
```javascript
if (ampClear !== null && ampClear > pharmacokineticFloor) {
    pharmacokineticFloor = ampClear;
    blockingFactors.push({ name: 'Amphetamine', ... });
}
if (caffClear !== null && caffClear > pharmacokineticFloor) {  // ← Only if LATER than amp
    pharmacokineticFloor = caffClear;
    blockingFactors.push({ name: 'Caffeine', ... });
}
```

When amp clears at 2:57 AM and caffeine at 2:30 AM: caffClear (2:30) > pharmacokineticFloor (2:57)? **FALSE** → caffeine omitted. Despite being 4x above threshold, caffeine isn't listed because amphetamine happens to clear slightly later.

**The sleep time calculation IS correct** (uses MAX of all factors). Only the display is incomplete.

### Evidence
- Lines 4208-4226: conditional push to blockingFactors
- Caffeine clearance computed correctly in findCaffClearTime()
- Sleep time correctly uses MAX (pharmacokineticFloor tracks the latest)

### Fix
**Lines 4208-4226** — Always add substances as blockers when above threshold:
```javascript
if (ampClear !== null && ampClear > now) {
    blockingFactors.push({ name: 'Amphetamine', clearsAt: ampClear, type: 'drug' });
    if (ampClear > pharmacokineticFloor) {
        pharmacokineticFloor = ampClear;
        sleepTime = ampClear;
    }
}
if (caffClear !== null && caffClear > now) {
    blockingFactors.push({ name: 'Caffeine', clearsAt: caffClear, type: 'drug' });
    if (caffClear > pharmacokineticFloor) {
        pharmacokineticFloor = caffClear;
        sleepTime = caffClear;
    }
}
```

---

## Bug 9: Vitamin C Interaction — NO BUG FOUND

Vitamin C logic verified correct:
- Only affects amphetamine (not caffeine) — scientifically accurate
- 70% half-life reduction applied correctly (line 4022)
- 3-segment decay model in `calculateDecayWithVitC()` (lines 3968-4010) handles before/during/after VitC correctly
- 8-hour TTL enforced properly (VITAMIN_C_EFFECT_HOURS = 8, line 4804)
- Date handling supports today/tomorrow scheduling

---

## Algorithm Flow Analysis

### Current (Broken) Flow
1. Calculate drug loads (ghost included correctly)
2. Binary search for amp clearance (BROKEN: assumes monotonic decrease)
3. Binary search for caffeine clearance (correct for caffeine — no DR)
4. `sleepTime = MAX(now, ampClear, caffClear)` (correct)
5. Apply circadian constraints → push to FZ end (Phase 2 — gated correctly)
6. Apply workout/sauna time offsets (Phase 3)
7. **Phase 5 re-applies circadian clamp WITHOUT guard → overwrites with wrapped time**
8. Return (NO drug level verification at final sleep time)

### Correct Flow (After Fixes)
1. Calculate drug loads (ghost included — already correct)
2. **DR-aware search** for amp clearance (verify against ALL future DR release times)
3. Binary search for caffeine clearance (already correct)
4. `pharmacokineticFloor = MAX(now, ampClear, caffClear)` (already correct)
5. Apply circadian constraints with `applyCircadianConstraints` guard (Phase 2 — already correct)
6. Apply workout/sauna time offsets with **decaying sauna bonus** (Phase 3)
7. Phase 5 circadian clamp **WITH `applyCircadianConstraints` guard**
8. **Phase 6: Enforce `sleepTime >= pharmacokineticFloor`**
9. **Phase 7: Final drug verification — confirm both substances below threshold at sleepTime**
10. Calculate crash/second wind **only if before sleepTime**

---

## Implementation Order

### Priority 1 — CRITICAL (fix impossible predictions)
1. **BUG 4 Fix A**: Add `applyCircadianConstraints` guard to Phase 5 (line 4398)
2. **BUG 4 Fix B**: Add Phase 6 pharmacokinetic floor enforcement (after line 4411)
3. **BUG 4 Fix C**: Add Phase 7 final drug verification (after Phase 6)
4. **BUG 3**: Replace binary search in `findAmpClearTime()` with DR-aware search (lines 4122-4156)

### Priority 2 — HIGH (wrong threshold values)
5. **BUG 7**: Add time decay to sauna bonus in `getEffectiveThreshold()` (lines 3900-3908)
6. **BUG 7 display**: Mirror decay in `generateForecastLogic()` (lines 10582-10583)

### Priority 3 — MEDIUM (confusing displays)
7. **BUG 2**: Add day-aware time formatting for clearance displays (lines 3624, 5879, 10738)
8. **BUG 5**: Fix sleep debt total display with hyperarousal label (line 10868)
9. **BUG 8**: Always show both substances as blockers when above threshold (lines 4208-4226)

### Priority 4 — LOW (minor display polish)
10. **BUG 1**: Fix ghost load display text (lines 10811-10816)
11. **BUG 6**: Add sleep time checks for crash/second wind + fix second wind time (lines 10950-10952, 6290)

---

## Test Cases

### Test 1: DR-Aware Clearance
- **Setup**: 30mg XR at 23:42, threshold 14mg, half-life 11h
- **At 03:00 AM**: IR decayed to ~12mg (below threshold)
- **At 03:42 AM**: DR releases → load spikes to ~27mg (above threshold)
- **Expected**: Clearance time must be AFTER the spike resolves (~15h after 03:42)
- **Verify**: `findAmpClearTime()` returns time AFTER all DR spikes resolve

### Test 2: Circadian + Drug Interaction
- **Setup**: Wake at 14:00, FZ ends 05:00 AM, ampClear at 08:00 AM
- **Expected**: sleepTime = 08:00 AM (drugs are bottleneck, not circadian)
- **Verify**: Phase 5 does NOT override to 05:00 AM

### Test 3: Phase 5 Guard
- **Setup**: hoursUntilClearance = 20h (>18h threshold)
- **Expected**: Phase 2 skips (correct), Phase 5 also skips (fix)
- **Verify**: `applyCircadianConstraints = false` prevents Phase 5 override

### Test 4: Caffeine as Bottleneck
- **Setup**: Amp clears 03:00 AM, caffeine 100mg at 01:00 AM (5h HL, 25mg threshold)
- **Caffeine clears**: ~11:00 AM
- **Expected**: sleepTime = 11:00 AM, blocking factors shows BOTH amp and caffeine
- **Verify**: caffeine appears in blockingFactors list

### Test 5: Ghost Load Display
- **Setup**: All-nighter mode, yesterday 50mg XR at 14:00
- **At 02:00 AM**: `calculateAmpLoad()` returns ~25mg (includes ghost)
- **Expected**: Display says "25mg total (including ~25mg from yesterday)" not "25mg + 25mg ghost"
- **Verify**: No double-counting confusion

### Test 6: Sauna Decay
- **Setup**: Sauna at 19:00
- **At 21:00 (2h later)**: Full +2.0mg bonus (within peak)
- **At 23:00 (4h later)**: +1.0mg (50% decayed)
- **At 01:00 (6h later)**: +0.0mg (fully decayed)
- **Verify**: `getEffectiveThreshold()` returns decreasing bonus over time

### Test 7: Sleep Debt + Hyperarousal Display
- **Setup**: 0 hours slept (hyperarousal triggered)
- **Expected display**: "Raw deficit: 8.0h → HYPERAROUSAL ACTIVE → Bonus: +0.0mg"
- **Verify**: No contradictory 8.0h vs 0.0h display

### Test 8: Clearance Time Display
- **Setup**: Clearance at minute 1617 (2:57 AM tomorrow), current time 3:14 AM
- **Expected**: "Clears at 2:57 AM (tomorrow)"
- **Verify**: Day indicator present when clearance > current time + wraps past midnight

---

## Verification Checklist
- [ ] Ghost load display says "already included" (not "ADDED")
- [ ] Clearance times show "(tomorrow)" when applicable
- [ ] DR releases verified after initial clearance in findAmpClearTime()
- [ ] Phase 5 gated by `applyCircadianConstraints`
- [ ] Pharmacokinetic floor enforced after all phases
- [ ] Drug levels verified at final predicted sleep time
- [ ] Sleep debt display shows hyperarousal explanation when active
- [ ] Sauna bonus decays over 6 hours (2h peak + 4h linear)
- [ ] Caffeine shown as blocker whenever above threshold
- [ ] Crash/second wind only shown if before sleep time
- [ ] Second wind uses FZ start (not FZ end + 30)
- [ ] All changes preserve Firebase sync guards
- [ ] No new save paths created
- [ ] `saveState()` guards untouched

## Files Modified
- `stimulant-elimination-calculator.html`:
  - Lines 3900-3908: Sauna decay (BUG 7)
  - Lines 4122-4156: DR-aware clearance search (BUG 3)
  - Lines 4208-4226: Caffeine blocker display (BUG 8)
  - Lines 4398-4411: Phase 5 guard + floor enforcement (BUG 4)
  - After line 4411: New Phase 6+7 verification (BUG 4)
  - Lines 5879, 10738: Day-aware time display (BUG 2)
  - Lines 6290: Second wind timeline filter (BUG 6)
  - Lines 10582-10583: Sauna display decay (BUG 7)
  - Lines 10811-10816: Ghost load text (BUG 1)
  - Lines 10868: Sleep debt display (BUG 5)
  - Lines 10950-10952: Crash/second wind display (BUG 6)

## Risk Assessment
- **Breaking changes**: None — all fixes are additive guards and display improvements
- **Firebase safety**: No save paths modified, no sync guards touched
- **Backward compatibility**: Existing state structure unchanged, no new fields required (except optional sauna decay — uses existing fields)
- **Calculation impact**: BUG 3+4 fixes will change predicted sleep times to be LATER (more conservative/accurate). Users who relied on overly optimistic predictions will see later times.
