# STIMULANT ELIMINATION CALCULATOR - AUDIT REPORT

**Date**: February 8, 2026
**File**: `stimulant-elimination-calculator.html` (10,893 lines)
**Auditors**: 5-agent team (Pharmacokinetics, Caffeine/Threshold, Circadian/Sleep, Firebase/Data, Devil's Advocate)

---

## 1. EXECUTIVE SUMMARY

The stimulant elimination calculator's core math is **fundamentally sound**. The pharmacokinetics engine (exponential decay, XR IR/DR split, 3-segment VitC decay) is mathematically correct and handles edge cases well. The circadian rhythm system uses a robust 5-phase architecture with proper midnight-crossing handling. However, **1 CRITICAL bug** was found: the ghost load feature in all-nighter mode silently renders nothing due to a DOM ID mismatch. **4 HIGH-severity bugs** exist in the Firebase sync layer (offline mode saves blocked, realtime sync drops `_dataLoaded`, missing guard in `saveStateImmediate`) and ghost load VitC inconsistency. **6 MEDIUM issues** and **13 LOW issues** round out the findings.

**Tallies**: 1 CRITICAL | 4 HIGH | 6 MEDIUM | 13 LOW | 1 INFO

---

## 2. CRITICAL ISSUES

### CRITICAL-1: Ghost Load DOM Element Mismatch — `renderGhostLoad()` NEVER Renders Content
- **Agent**: Devil's Advocate
- **Location**: `renderGhostLoad()` lines 4826-4830 vs HTML lines 2577-2580
- **Problem**: The function looks for `document.getElementById('ghostLoadContent')` which does NOT exist in the HTML. The HTML defines `ghostMedEntries` and `ghostLoadTotal` instead. The function hits the `if (!section || !content) return;` guard and silently exits every time.
- **Impact**: When all-nighter mode is active, the ghost load section frame appears but the detailed breakdown (individual medication remaining amounts, caffeine amounts) **never renders**. Core all-nighter mode feature is broken silently.
- **Fix**: Change the DOM ID reference to match the actual HTML, or update the HTML to include a `ghostLoadContent` element.
  ```javascript
  // CURRENT (broken):
  const content = document.getElementById('ghostLoadContent');
  // FIX: match actual HTML IDs
  const medEntries = document.getElementById('ghostMedEntries');
  const totalEl = document.getElementById('ghostLoadTotal');
  ```

---

## 3. HIGH PRIORITY ISSUES

### HIGH-1: `skipPin()` Permanently Blocks ALL Saves (Offline Mode Broken)
- **Agent**: Firebase Auditor
- **Location**: `skipPin()` at line 8765-8772
- **Problem**: When user clicks "Skip (Local Only)", only `firebaseSyncEnabled` is set to `false`. The guard flags (`pinValidated`, `isInitialLoad`, `hasLoadedFromCloud`, `state._dataLoaded`) remain in their blocking state. These flags are ONLY set to permissive values inside the `loadFromFirebase()` callback, which never executes in offline mode.
- **Impact**: In offline mode, ALL save paths are blocked — `saveState()`, `saveStateImmediate()`, visibilitychange, and beforeunload handlers. **Any data entered is lost on page refresh.**
- **Fix**: Add flag resets to `skipPin()`:
  ```javascript
  function skipPin() {
      firebaseSyncEnabled = false;
      pinValidated = true;        // ADD
      hasLoadedFromCloud = true;   // ADD
      isInitialLoad = false;       // ADD
      state._dataLoaded = true;    // ADD
      updateSyncStatus('offline', 'Local only');
      showToast('Using offline mode');
  }
  ```

### HIGH-2: Realtime Sync Drops `_dataLoaded` Flag
- **Agent**: Firebase Auditor
- **Location**: `setupRealtimeSync()` line 9010-9024
- **Problem**: When a realtime update arrives from another device, the code reconstructs the `state` object but does NOT include `_dataLoaded` in the new object. After this merge, `state._dataLoaded` becomes `undefined` (falsy), and Guard D in `saveState()` blocks ALL subsequent saves.
- **Impact**: After receiving a sync from another device, local changes silently stop persisting until page reload.
- **Fix**: Add `_dataLoaded: true` to the state reconstruction at line ~9023.

### HIGH-3: `saveStateImmediate()` Missing `!pinValidated` Guard
- **Agent**: Firebase Auditor + Devil's Advocate (confirmed)
- **Location**: `saveStateImmediate()` at line 9791-9834
- **Problem**: `saveState()` has 5 guards (including `!pinValidated` as Guard 0), but `saveStateImmediate()` only has 4 guards — missing `!pinValidated`. This asymmetry could allow saves before PIN validation completes.
- **Mitigation**: Partially mitigated by `saveToFirebase()` checking `!firebaseSyncEnabled` and by the `isInitialLoad` guard still blocking during startup.
- **Fix**: Add `!pinValidated` guard to `saveStateImmediate()`.

### HIGH-4: Ghost Load VitC Calculation Uses Simplified Decay (Inconsistent with Engine)
- **Agent**: Devil's Advocate (corroborating Pharma Auditor LOW-1)
- **Location**: `calculateYesterdayDoseRemaining()` lines 4797-4823 vs `calculateAmpLoad()` lines 3857-3919
- **Problem**: The ghost load function uses simple exponential decay with a flat half-life (either normal or VitC-reduced for the entire period). The main engine uses the full 3-segment VitC decay model. When VitC is active, the numbers the user sees in ghost load **don't match** the numbers used for sleep prediction.
- **Impact**: User trust issue — displayed residual amounts differ from what the engine actually calculates. Discrepancy grows when VitC had partial coverage over the decay period.
- **Fix**: Refactor ghost load to use `calculateAmpLoad()` directly instead of its own simplified math.

---

## 4. MEDIUM PRIORITY ISSUES

### MEDIUM-1: Binary Search Early Exit Misses Future DR Release
- **Agent**: Pharmacokinetics Auditor
- **Location**: `findAmpClearTime()` line 3976
- **Problem**: For a low-dose XR (e.g., 20mg), the IR component alone (10mg) may be below the 14mg threshold at T=0. The early exit returns "you can sleep now." But 4 hours later, the DR releases 10mg additional, pushing the total above threshold (~17.8mg).
- **Trace**: 20mg XR at T=0 → IR = 10mg → `calculateAmpLoad(now)` = 10mg → 10 < 14 threshold → returns `now` → but at T+4h: IR decayed ~7.8mg + DR 10mg = 17.8mg > 14mg
- **Impact**: Incorrectly optimistic sleep prediction for low XR doses. Sully's typical 50mg dose (combined IR=25mg > 14mg) would NOT trigger this.
- **Fix**: Remove early exit or add check: `if (calculateAmpLoad(now) < threshold && calculateAmpLoad(now + 240) < threshold)`

### MEDIUM-2: Diagnostic Log Sauna Calculation Inconsistent with Actual
- **Agent**: Caffeine Auditor
- **Location**: `generateForecastLogic()` lines 10055-10068
- **Problem**: The diagnostic/forecast log uses simplified, non-date-aware sauna logic while `getEffectiveThreshold()` (lines 3709-3750) uses proper date-aware logic with `state.modifiers.sauna.date` and `parseLocalDate()`.
- **Impact**: Diagnostic display may show incorrect sauna bonus vs what actual threshold uses. Display-only, does NOT affect sleep prediction.

### MEDIUM-3: `analyzeCircadianPhase()` Average Doesn't Handle Midnight Crossings
- **Agent**: Circadian Auditor
- **Location**: Line 3400
- **Problem**: Naive average of wake times fails if times span midnight. E.g., (23:30=1410 + 00:30=30)/2 = 720 = noon, when correct answer is ~midnight. Standard deviation at line 3405 has the same issue.
- **Impact**: LOW for this user (typical wake 6-11 AM). Would only matter for extreme night owls waking near midnight.

### MEDIUM-4: `minutesToTime()` Produces Garbled Output with Negative Input
- **Agent**: Devil's Advocate
- **Location**: Lines 3525-3531
- **Problem**: `Math.floor(-5/60) = -1`, and `-1 % 24 = -1` in JS. So negative minute inputs produce output like "-1:-5 AM". Can occur in edge cases where time subtraction goes negative before normalization.
- **Fix**: Add `mins = ((mins % 1440) + 1440) % 1440;` at function entry.

### MEDIUM-5: VitC Date Restore Logic Only Handles Today/Tomorrow
- **Agent**: Devil's Advocate
- **Location**: `restoreModifierUI()` lines 10796-10798
- **Problem**: If saved VitC date is yesterday or older (user didn't open app for a day), the code defaults to 'tomorrow' which is incorrect. A past VitC date should show as expired or trigger a reset.
- **Fix**: Add date comparison logic to detect past dates.

### MEDIUM-6: Scenario Simulation Mutates Global `hyperarousalMode`
- **Agent**: Devil's Advocate
- **Location**: `simulateCaffeineAddition()` ~lines 6636-6654
- **Problem**: What-If scenario calls `calculateSleepTime()` which internally sets the global `hyperarousalMode` flag via `calculateSleepDebtBonus()`. After simulation, temp caffeine entry is removed but `hyperarousalMode` may have been modified as a side effect.
- **Fix**: Save and restore `hyperarousalMode` before/after simulation.

---

## 5. LOW PRIORITY ISSUES

### LOW-1: Ghost Load Display Ignores VitC Partial Coverage
- **Agent**: Pharmacokinetics Auditor
- **Location**: `calculateYesterdayDoseRemaining()` lines 4853-4860
- **Detail**: Applies reduced half-life for entire decay period if VitC is currently active, or base half-life for entire period if expired. Doesn't account for partial coverage.
- **Impact**: Display-only in ghost load. Actual sleep prediction uses correct 3-segment decay.

### LOW-2: Ghost Load Shows Unreleased DR as "Remaining"
- **Agent**: Pharmacokinetics Auditor
- **Location**: Lines 4812-4815
- **Detail**: When DR hasn't released yet, returns full dose amount as "remaining." Misleading but conservative (safer).
- **Impact**: Display-only.

### LOW-3: CLAUDE.md Says Threshold 15mg, Code Defaults to 14mg
- **Agent**: Caffeine Auditor
- **Location**: `state.settings.sleepThreshold` defaults to 14 at lines 3049, 3098
- **Impact**: Documentation error only.

### LOW-4: Hyperarousal Global Variable with Stale-Read Risk
- **Agent**: Caffeine Auditor
- **Location**: `hyperarousalMode` declared line 3544, set in `calculateSleepDebtBonus()`, read by `isHyperarousalMode()` line 3758
- **Detail**: If `isHyperarousalMode()` is called before any threshold calculation, returns stale `false`. Currently works due to call order but fragile coupling.

### LOW-5: `findCaffClearTime()` Returns Max Search Bound for Extreme Loads
- **Agent**: Caffeine Auditor
- **Location**: Line 4007
- **Detail**: 800mg+ caffeine late yesterday could exceed 24h binary search bound. Behavior is sensible ("you can't sleep today").

### LOW-6: Duplicate `getValues()` and `getCount()` Definitions
- **Agent**: Firebase Auditor
- **Location**: Lines 3143/3150 (first) and 3205/3212 (second)
- **Detail**: Identical implementations, second shadows first. No behavioral impact.

### LOW-7: XSS in Checkpoint Manager (No `escapeHtml()`)
- **Agent**: Firebase Auditor
- **Location**: `showCheckpointManager()` line 9169
- **Detail**: `cp.name` rendered directly in innerHTML. Self-XSS risk only (single-user local app).

### LOW-8: `_version` Mixed Strategy (Date.now() vs Incremental)
- **Agent**: Firebase Auditor
- **Location**: Multiple locations
- **Detail**: Checkpoint restore/force upload use `Date.now()` (~1.7 trillion), while Firebase merge uses `+1` incremental. Makes version comparison unreliable for conflict detection.

### LOW-9: Bottleneck Indicator Doesn't Normalize for Midnight Crossings
- **Agent**: Circadian Auditor
- **Location**: Line 5622
- **Detail**: The `reduce` to find primary blocker uses raw `clearsAt` values without midnight normalization. May show wrong factor name in hero section.
- **Impact**: Cosmetic only — calculated sleep time is correct.

### LOW-10: Legacy Entries Without `.date` Never Cleaned Up
- **Agent**: Firebase Auditor
- **Location**: `cleanupOldMedications()` line 4315
- **Detail**: `if (!med.date) return;` keeps dateless entries forever. Minor data bloat.

### LOW-11: `saveToFirebase()` Has Fewer Guards Than `saveState()`
- **Agent**: Devil's Advocate
- **Location**: Lines 8775-8812
- **Detail**: Has 3 guards vs `saveState()`'s 5. Normally called from guarded callers, but `forceUploadToCloud()` may call it more directly. Defense-in-depth inconsistency.

### LOW-12: Double Pharmacokinetic Calculations in `recalculate()`
- **Agent**: Devil's Advocate
- **Location**: Lines 5594-5617
- **Detail**: `recalculate()` computes `calculateAmpLoad(now)` and `calculateCaffLoad(now)` directly, then calls `calculateSleepTime()` which computes them again internally. Runs every 1 second. Pure wasted computation.

### LOW-13: Dead Code in `setViewMode()`
- **Agent**: Devil's Advocate
- **Location**: Lines 10566-10594
- **Detail**: `return;` at line 10568 makes ~25 lines unreachable. Intentional (unified view replaced dual-view) but dead code remains.

### INFO-1: 1-Second `recalculate()` Interval May Cause Battery Drain
- **Agent**: Devil's Advocate
- **Location**: Line 10549 — `setInterval(recalculate, 1000)`
- **Detail**: Full pharmacokinetic calculation, sleep prediction, DOM updates, and graph redraw every second. Drug levels don't change perceptibly in 1 second. A 5-10 second interval would be sufficient and much lighter on mobile battery.

---

## 6. VERIFIED WORKING

### Core Pharmacokinetics (Agent 1)
| Component | Status | Notes |
|-----------|--------|-------|
| Decay formula: `dose * 0.5^(elapsed/halfLife)` | CORRECT | All code paths verified |
| XR split: 50% IR at T+0, 50% DR at T+4h | CORRECT | Both components use same decay engine |
| Cross-midnight day offset math | CORRECT | `effectiveDoseTime = time - (daysDiff * 1440)` |
| 3-segment VitC decay | CORRECT | Elegant design: raw VitC time + per-point TTL |
| DST resilience (`Math.round()` on daysDiff) | CORRECT | Handles 23h/25h day transitions |
| Default amp half-life: 11h (660 min) | CORRECT | |
| Default caffeine half-life: 5h (300 min) | CORRECT | |

### Caffeine & Thresholds (Agent 2)
| Component | Status | Notes |
|-----------|--------|-------|
| Caffeine decay (simple exponential) | CORRECT | No VitC interaction — pharmacologically accurate |
| Yesterday caffeine included after midnight | CORRECT | `daysDiff === 1` check at line 3943 |
| Missing date fallback: `caff.date \|\| today` | CORRECT | Defensive |
| Sleep debt bonus (3-day rolling, 40/70/100% weights) | CORRECT | Max 6mg |
| Exercise bonus (workout plan OR legacy heavyLift) | CORRECT | Max 3mg |
| Sauna bonus (date-aware, time-of-day adjusted) | CORRECT | +2mg evening, +1mg earlier |
| Threshold cap: base + 8mg max | CORRECT | e.g., 14 + 8 = 22mg max |
| Hyperarousal mode (<4h sleep → bonus = 0) | CORRECT | |
| NaN guard in sleep debt (corrupted → 8h default) | CORRECT | Line 3595 |
| Separate caffeine threshold (25mg, not modified by bonuses) | CORRECT | |

### Circadian & Sleep Prediction (Agent 3)
| Component | Status | Notes |
|-----------|--------|-------|
| Forbidden Zone: 13-15h after wake | CORRECT | |
| Sleep Gate: 15-17h after wake | CORRECT | |
| WMZ: 11-13h after wake | CORRECT | |
| Midnight crossing (normalization by +24h) | CORRECT | |
| 5-phase `calculateSleepTime()` architecture | CORRECT | Robust pipeline |
| Phase 5 safety net (re-checks after Phase 3 mods) | CORRECT | Critical safety feature |
| 18-hour circadian bypass for all-nighters | CORRECT | |
| Cross-app storage (projectedSleepTime/Minutes) | CORRECT | |
| Sleep hours calculation with sanity cap | CORRECT | 14h max |

### Firebase & Data Integrity (Agent 4)
| Component | Status | Notes |
|-----------|--------|-------|
| 5 sync guards in `saveState()` | CORRECT | All present |
| Data migration (array → object) | CORRECT | `migrateArrayToObject()` handles all formats |
| `generateId()` uniqueness (timestamp + random) | CORRECT | |
| `getValues()` null/undefined safety | CORRECT | Returns [] for falsy |
| `getCount()` null/undefined safety | CORRECT | Returns 0 for falsy |
| `isEmptyState()` checks (6 conditions) | CORRECT | Including allNighterMode and _dataLoaded |
| Checkpoint system (create/restore/export/import) | CORRECT | 5 import formats supported |
| Force upload/pull with auto-backup | CORRECT | |
| Firebase load error fallback | CORRECT | Falls back to local data, sets flags |
| Realtime empty-data rejection | CORRECT | `isEmptyState()` check |

---

## 7. RECOMMENDED TESTS

### Must-Test (CRITICAL + HIGH priority fixes)
1. **Ghost load in all-nighter mode**: Enable all-nighter → add yesterday's meds → verify ghost load section shows actual data (not empty)
2. **Offline mode data persistence**: Skip PIN → enter medication → refresh page → verify data persists
3. **Multi-device sync**: Open on two devices → change data on device B → verify device A still saves correctly afterward
4. **Pre-PIN save race**: Rapidly enter data before PIN dialog completes → verify no saves leak to Firebase
5. **Ghost load vs engine accuracy**: Compare ghost load display values with what `calculateAmpLoad()` returns for same doses (especially with VitC active)

### Should-Test (MEDIUM priority)
6. **Low-dose XR prediction**: Enter single 20mg XR → verify "Clears at" time accounts for DR release at T+4h
7. **Sauna diagnostic accuracy**: Set sauna yesterday with date → check diagnostic log matches actual threshold
8. **Late wake time phase analysis**: Set wake times spanning midnight in history → verify phase classification makes sense
9. **VitC date after day boundary**: Set VitC yesterday → close app → reopen next day → verify VitC date picker shows correct state
10. **What-If scenario side effects**: Run a caffeine What-If simulation → verify hyperarousal mode flag isn't changed afterward

### Edge Case Tests
11. **VitC timing**: Set VitC 2 hours ago → toggle off/on → verify all displays update immediately
12. **All-nighter mode**: Enable → verify yesterday's doses appear in calculations → verify circadian bypass works
13. **Midnight boundary**: Enter dose at 11:55 PM → check at 12:05 AM → verify correct clearance time
14. **Extreme caffeine**: Enter 600mg caffeine at 8 PM → verify clearance time is reasonable (should show ~next day)
15. **Checkpoint restore**: Create checkpoint → change data → restore → verify all calculations update
16. **Empty state protection**: Clear all data → verify app doesn't save empty state to Firebase

---

*Generated by 5-agent audit team. All line numbers verified against current file as of Feb 8, 2026.*
