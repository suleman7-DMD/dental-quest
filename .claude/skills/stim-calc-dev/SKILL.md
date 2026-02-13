---
name: stim-calc-dev
user-invocable: false
description: |
  Development patterns for Stimulant Elimination Calculator — a pharmacokinetic sleep prediction app.
  Single HTML file (~11,500 lines) with Firebase sync, dark theme UI.
  Use when: debugging sleep predictions, modifying drug calculations, working on XR delayed-release,
  VitC interactions, circadian rhythm, threshold modifiers, ghost load, workout planner, nicotine tracking,
  sauna decay, or any stim calc feature.
  Trigger phrases: "stim calc", "stimulant calculator", "sleep prediction", "pharmacokinetic",
  "amphetamine", "caffeine", "half-life", "threshold", "forbidden zone", "circadian",
  "XR", "delayed release", "ghost load", "all-nighter", "VitC", "vitamin C",
  "workout planner", "nicotine", "sauna bonus".
  Do NOT use for: body-comp-tracker, dental quest index.html, d3-roadmap, or lecture-prompt-transformer.
  Those apps have their own skills.
globs:
  - "stimulant-elimination-calculator.html"
  - ".claude/skills/stim-calc-dev/**"
metadata:
  author: Sully
  version: 2.1.0
  file: stimulant-elimination-calculator.html
  lines: ~11526
  last-verified: 2026-02-13
---

# Stimulant Elimination Calculator Development Patterns

## USE CASES

This skill enables 3 core workflows:

**Use Case 1: Debug a wrong sleep prediction**
Trigger: User says "the prediction is off" or "sleep time is wrong"
Steps: Check calculateSleepTime() phases -> verify threshold -> check clearance search -> check circadian guard
Result: Root cause identified (e.g., sauna bonus not decaying, DR spike missed)
Success criteria: Prediction matches manual calculation of drug load vs threshold at predicted time

**Use Case 2: Add or modify a feature**
Trigger: User says "add melatonin modifier" or "change threshold calculation"
Steps: Read state structure -> find relevant function -> make surgical edit -> verify guards intact -> test
Result: Feature added without breaking sync, guards, or existing calculations
Success criteria: Feature works, all 5 Firebase guards intact in both save functions, brace balance unchanged, recalculate() runs without error

**Use Case 3: Fix a Firebase sync issue**
Trigger: User says "data not saving" or "sync broken" or "state wiped"
Steps: Check 5 guards in saveState() -> check skipPin() flags -> verify _dataLoaded preserved in realtime sync
Result: Sync issue identified and fixed without compromising data protection
Success criteria: saveStateImmediate() returns true, data persists across refresh, all 5 guards still present in both save functions

---

## INSTRUCTIONS

### Step 1: Identify what area of the app is involved
Read the APP OVERVIEW and KEY CONCEPTS below. Determine which subsystem is relevant:
- Drug calculations? -> See `references/pharmacokinetics.md`
- Sleep prediction algorithm? -> See `references/sleep-prediction-algorithm.md`
- Circadian system? -> See `references/circadian-system.md`
- Firebase/sync? -> Check the 5 FIREBASE GUARDS section below
- UI rendering? -> See function map for render functions

### Step 2: Find the exact function and line number
Use the QUICK REFERENCE table below or `references/function-map.md` for the full list.
All line numbers are verified against the actual 11,526-line file.

### Step 3: Read the code before changing it
This is a single 11,526-line HTML file. Always read the target function and 50 lines of surrounding context before editing. Never write blind.

### Step 4: Make the change surgically
Use the Edit tool for targeted changes. NEVER rewrite the whole file.
After editing, verify:
- Brace/paren balance is intact
- No sync guards were removed or weakened
- `_dataLoaded: true` is preserved in any state reconstruction
- `saveState()` and `saveStateImmediate()` still have identical guards

### Step 5: Verify nothing broke
Check that `recalculate()` still works (it runs every 5 seconds).
If you touched Firebase code, verify all 5 guards are still present in both save functions.
If you touched the prediction algorithm, verify all 6 phases are intact.

---

## EXAMPLES

### Example 1: Debug a wrong sleep prediction

**User says:** "The prediction says I can sleep at 10:30 PM but I know I can't sleep until way later"

**Actions:**
1. Read `calculateSleepTime()` at ~line 4242 and check each phase's output
2. Run diagnostic in console:
   ```javascript
   const now = getCurrentMinutes();
   console.log('Amp load:', calculateAmpLoad(now).toFixed(1), 'mg');
   console.log('Threshold:', getEffectiveThreshold().toFixed(1), 'mg');
   console.log('Amp clear:', findAmpClearTime() ? minutesToTimeWithDay(findAmpClearTime()) : 'already clear');
   const fz = getForbiddenZone();
   console.log('Forbidden Zone:', minutesToTime(fz.start), '-', minutesToTime(fz.end));
   ```
3. Check if DR spike is being missed — look at `findAmpClearTime()` (~line 4145) and verify future DR release times are collected
4. Check if sauna/workout bonus is decaying properly in `getEffectiveThreshold()` (~line 3848)
5. Check if VitC is active when it shouldn't be: `isVitaminCEffective()` (~line 4960)

**Result:** Root cause found — e.g., sauna bonus was added 7 hours ago but not decaying, artificially raising the threshold and making clearance too early.

### Example 2: Add a new threshold modifier

**User says:** "Add a melatonin modifier that adds +2mg to threshold when taken"

**Actions:**
1. Read `references/state-structure.md` to understand the `modifiers` object
2. Add `melatonin: { active: false, time: null, date: null }` to the modifiers section in `getDefaultState()` (~line 3114)
3. Read `getEffectiveThreshold()` (~line 3848) to see how existing modifiers (sauna, workout) are applied
4. Add melatonin bonus logic INSIDE `getEffectiveThreshold()`, following the sauna decay pattern (peak then decay)
5. Add UI toggle — read `renderAll()` (~line 10170) and existing modifier UI for patterns
6. Verify: `saveState()` guards still have all 5 checks, brace balance intact, `_dataLoaded` preserved

**Result:** Melatonin modifier added. Threshold increases by +2mg when active, with time-based decay matching existing modifier patterns.

### Example 3: Fix data not saving

**User says:** "I added a medication but it disappeared after refreshing"

**Actions:**
1. Check all 5 guards in console:
   ```javascript
   console.log({ pinValidated, isInitialLoad, hasLoadedFromCloud, _dataLoaded: state._dataLoaded, isEmpty: isEmptyState(state) });
   ```
2. If `hasLoadedFromCloud` is false — check `loadFromFirebase()` (~line 9403) and `skipPin()` (~line 9350)
3. If `isEmptyState()` is true — check `isEmptyState()` (~line 3222) conditions. Does the state have meds? All 6 conditions must fail for non-empty.
4. Read both `saveState()` (~line 10322) and `saveStateImmediate()` (~line 10381) — verify both have IDENTICAL 5 guards
5. Check `setupRealtimeSync()` (~line 9557) — verify `_dataLoaded: true` is preserved when merging incoming state

**Result:** Guard identified as blocking — e.g., `skipPin()` wasn't setting all 4 flags, so offline mode blocked all saves.

---

## TROUBLESHOOTING

### Error: Sleep prediction shows "already clear" when user just took medication
**Cause:** `findAmpClearTime()` binary search didn't account for future DR spike at T+4h. The initial search found clearance before the DR release, but didn't verify load stays below threshold after DR hits.
**Solution:** Check that `findAmpClearTime()` (~line 4145) collects ALL future DR release times and re-verifies after each. See Pattern 2 in CRITICAL PATTERNS. The iterative loop should run up to 10 times.

### Error: Threshold shows wrong value (too high or too low)
**Cause:** A modifier (sauna, workout, sleep debt) isn't decaying properly, or `isHyperarousalMode()` isn't zeroing the sleep debt bonus.
**Solution:** Read `getEffectiveThreshold()` (~line 3848). Check sauna decay (peak 2h, decay 4h more — 6h total). Check workout `adenosineBonus`. Check `calculateSleepDebtBonus()` (~line 3719) returns 0 when `isHyperarousalMode()` is true. Cap is base + 8mg max.

### Error: VitC has no effect on prediction
**Cause:** VitC modifier is set but `isVitaminCEffective()` returns false because VitC time/date combination puts it outside the 8-hour TTL window, OR the VitC date doesn't match today.
**Solution:** Check `isVitaminCEffective()` (~line 4960) and `getVitaminCTimeMinutes()` (~line 4898). VitC has 8h TTL — if taken > 8h ago, it's expired. Also check `updateVitaminCDate()` (~line 4879) is setting the correct date.

### Error: Ghost load not showing in all-nighter mode
**Cause:** DOM mismatch — `renderGhostLoad()` references `ghostMedEntries` and `ghostLoadTotal` element IDs, not `ghostLoadContent`.
**Solution:** Verify HTML has elements with IDs `ghostMedEntries` (line ~2613) and `ghostLoadTotal` (line ~2614). Check `renderGhostLoad()` (~line 5078) uses those exact IDs. Also verify `calculateAmpLoad()` actually includes yesterday's doses when `state.allNighterMode` is true (daysDiff <= 3 threshold).

### Error: Data wiped after opening on a new device
**Cause:** Default state has `_version: 0` but if any code path sets `_version: Date.now()` before cloud load, the empty local state appears "newer" and overwrites cloud.
**Solution:** Verify `getDefaultState()` (~line 3114) has `_version: 0` (NOT `Date.now()`). Check all 5 guards are present in BOTH `saveState()` and `saveStateImmediate()`. Verify `isInitialLoad` starts `true` and only becomes `false` AFTER `loadFromFirebase()` completes. Verify `isEmptyState()` (~line 3222) catches the empty state before it can overwrite.

### Error: saveState() and saveStateImmediate() behave differently
**Cause:** One function has fewer guards than the other (historical bug — was fixed, but could regress).
**Solution:** Both functions MUST have IDENTICAL 5 guards. Compare line ~10322 (saveState) with line ~10381 (saveStateImmediate). See THE 5 FIREBASE GUARDS section. If adding a guard to one, ALWAYS add it to the other.

---

## ERROR HANDLING

### Before any edit:
- Read 50+ lines of context around the target function
- Count braces/parens in the section you're editing
- Note which save function(s) are in scope

### After any edit:
- Verify brace/paren count matches pre-edit count
- If you touched `saveState()`, verify `saveStateImmediate()` still matches (5 identical guards)
- If you touched state reconstruction (realtime sync, loadFromFirebase), verify `_dataLoaded: true` is preserved
- If you touched `isEmptyState()`, verify all 6 conditions are still checked
- Run `recalculate()` mentally — it fires every 5 seconds, so any runtime error will crash the app repeatedly

### If something breaks:
1. Check the browser console for the exact error and line number
2. Use `createCheckpoint('before-fix')` to save current state before attempting repair
3. Use `references/debugging-guide.md` console diagnostics to isolate the issue
4. If sync is broken, check all 5 guards in order: pinValidated → isInitialLoad → hasLoadedFromCloud → _dataLoaded → isEmptyState
5. If prediction is broken, check all 6 phases of `calculateSleepTime()` in order
6. NEVER bypass guards to "fix" a sync issue — find WHY the guard is blocking

### Common mistakes to avoid:
- Do NOT call functions that don't exist — see `references/function-map.md` "Functions That DO NOT Exist" table
- Do NOT use `med.type` to distinguish IR/XR — no such field; ALL doses are XR
- Do NOT assume drug load decreases monotonically — DR spikes break this assumption
- Do NOT use `Date.now()` for time comparisons — the engine uses minutes since midnight via `getCurrentMinutes()`

---

## CRITICAL: FIREBASE RULES APPLY

This app uses the same Firebase patterns as all Sully apps.
**BEFORE ANY CODE CHANGES**, ensure you follow:
- `sully-firebase-patterns` skill rules (when available)
- Use `{}` objects with `generateId()` keys, NEVER arrays
- Use ONLY `saveState()` or `saveStateImmediate()` for persistence
- Respect ALL 5 sync guards

---

## APP OVERVIEW

**Purpose:** Predict when a user can fall asleep based on stimulant and caffeine intake, using real pharmacokinetic models.

**File:** `stimulant-elimination-calculator.html` (11,526 lines, single file)

**Core Algorithm:**
```
Sleep Time = MAX(
  Amphetamine Clearance Time,
  Caffeine Clearance Time,
  Circadian Block End (Forbidden Zone),
  Workout Cooldown End
)

Where:
- Clearance = when drug load drops below effective threshold
- Drug Load = sum of all active doses, each decaying via half-life
- All amphetamine doses modeled as XR (50% IR at T+0, 50% DR at T+4h)
- Effective Threshold = base (14mg) + sleep debt bonus + modifiers
- Circadian Block = WMZ (11-13h) + Forbidden Zone (13-15h after wake)
```

---

## KEY CONCEPTS

### 1. Drug Decay Model
```
Load(t) = Dose * 0.5^(elapsed_hours / half_life)
```

### 2. XR Model (ALL amphetamine doses)
There is NO IR-only model. All amphetamine doses are split:
- **50% Immediate Release (IR):** At time of dose
- **50% Delayed Release (DR):** At T+4 hours
This creates **NON-MONOTONIC** decay curves (load can spike UP at DR release).

### 3. Threshold System
```
Effective Threshold = Base Threshold (14mg default)
                    + Sleep Debt Bonus (0-6mg, 3-day weighted)
                    + Workout Bonus (adenosine-based, from workout planner)
                    + Sauna Bonus (+1-2mg, peaks 2h then decays over 4h more)
Cap: Base + 8mg maximum
```

### 4. Circadian Rhythm
```
Wake Time -> +11-13h -> Wake Maintenance Zone (alerting ramps up)
          -> +13-15h -> Forbidden Zone (CANNOT sleep, hard blocker)
          -> +15-17h -> Sleep Gate (optimal sleep window)
```

### 5. All-Nighter Mode
When user sleeps < 4 hours:
- Includes yesterday's doses in calculations (ghost load)
- Hyperarousal negates sleep debt bonus (cortisol surge)
- Tracks cross-day medication effects (up to 3 days in all-nighter mode)

### 6. Vitamin C Effect
- Reduces amphetamine half-life to 70% of normal (11h -> 7.7h)
- 3-segment model: before VitC (normal) -> VitC active (reduced) -> expired (normal)
- **8-hour TTL** — effect expires 8 hours after taking VitC
- Shift is **instant** (no gradual transition)

---

## THE 5 FIREBASE GUARDS

```javascript
// In BOTH saveState() (~line 10322) and saveStateImmediate() (~line 10381):

if (!pinValidated) return false;        // Guard 0: PIN not validated
if (isInitialLoad) return false;        // Guard A: Still loading
if (!hasLoadedFromCloud) return false;  // Guard B: Haven't loaded yet
if (!state._dataLoaded) return false;   // Guard D: State not ready
if (isEmptyState(state)) return false;  // Guard C: Would wipe data
```

**Both functions have IDENTICAL guards.** Never modify one without the other.

---

## QUICK REFERENCE: KEY FUNCTIONS

| Function | Actual Line | Purpose |
|----------|-------------|---------|
| `getDefaultState()` | ~3114 | Factory for default state object |
| `isEmptyState(data)` | ~3222 | Checks 6 conditions (meds, caff, history, sleepHistory, allNighterMode, _dataLoaded) |
| `generateId(prefix)` | ~3258 | Generate unique IDs like `med_170740...` |
| `getValues(obj)` | ~3293 | Safe object-to-array iteration |
| `getCount(obj)` | ~3300 | Safe object key count |
| `escapeHtml(str)` | ~3331 | XSS protection |
| `analyzeCircadianPhase()` | ~3421 | Full circadian analysis with circular mean wake averaging |
| `getLocalDateString()` | ~3604 | Today's date as YYYY-MM-DD |
| `parseLocalDate(str)` | ~3609 | Parse date string to local Date |
| `timeToMinutes(time)` | ~3615 | "14:30" -> 870 |
| `minutesToTime(mins)` | ~3624 | 870 -> "14:30" |
| `minutesToTimeWithDay(mins)` | ~3634 | Adds "(tomorrow)" suffix if >= 1440 |
| `computeSleepDelta()` | ~3648 | Handles midnight crossing with +/-720 wrapping |
| `migrateHistoryEntries()` | ~3678 | Backfill deltaMinutes/absError for old entries |
| `calculateSleepDebtBonus()` | ~3719 | 3-day weighted deficit -> 0-6mg bonus |
| `getEffectiveThreshold()` | ~3848 | Full threshold with all modifiers + sauna decay |
| `isHyperarousalMode()` | ~3937 | Check if < 4h sleep |
| `getForbiddenZone()` | ~3945 | Returns {start, end} in minutes |
| `getSleepGate()` | ~3953 | Returns {start, end} in minutes |
| `isInForbiddenZone()` | ~3961 | Boolean check |
| `isInSleepGate()` | ~3971 | Boolean check |
| `getForbiddenZoneEnd()` | ~3980 | Normalized FZ end time |
| `calculateDecayWithVitC()` | ~3988 | Core 3-segment VitC-aware decay |
| `calculateAmpLoad(atMinutes)` | ~4036 | Sum all amp contributions (XR split + VitC) |
| `calculateCaffLoad(atMinutes)` | ~4102 | Sum all caffeine contributions |
| `findAmpClearTime()` | ~4145 | Iterative binary search with DR spike verification |
| `findCaffClearTime()` | ~4209 | Caffeine clearance search |
| `calculateSleepTime()` | ~4242 | Main 6-phase prediction algorithm |
| `addMedEntry(dose, time)` | ~4530 | Add medication |
| `removeMedEntry(id)` | ~4579 | Remove medication |
| `renderMedEntries()` | ~4613 | Render medication list |
| `addCaffeine(amount, name)` | ~4726 | Add caffeine entry |
| `removeCaffeine(id)` | ~4753 | Remove caffeine entry |
| `renderCaffeineEntries()` | ~4764 | Render caffeine list |
| `updateVitaminCDate()` | ~4879 | VitC date management |
| `getVitaminCTimeMinutes()` | ~4898 | VitC time in minutes |
| `isVitaminCEffective()` | ~4960 | Is VitC currently active |
| `toggleAllNighterMode()` | ~4994 | Toggle all-nighter |
| `calculateYesterdayDoseRemaining()` | ~5049 | Ghost load calculation (mirrors XR split logic) |
| `renderGhostLoad()` | ~5078 | Ghost load display (uses ghostMedEntries + ghostLoadTotal DOM IDs) |
| `initWorkoutPlanner()` | ~5186 | Initialize workout system |
| `calculateWorkoutImpact()` | ~5241 | Workout effect on threshold |
| `applyWorkoutPlan()` | ~5533 | Apply workout to state |
| `recalculate()` | ~5637 | Main recalc + render (called every 5 seconds via setInterval) |
| `logNicotine(type)` | ~6483 | Log nicotine use |
| `simulateVitaminC()` | ~6918 | VitC scenario simulation |
| `simulateSauna()` | ~6948 | Sauna scenario simulation |
| `saveDay()` | ~7516 | Save today's prediction to history |
| `autoPopulateFeedback()` | ~7567 | Auto-fill actual sleep from sleep history |
| `renderHistory()` | ~7626 | Render prediction history |
| `renderSleepCalendar()` | ~7778 | Sleep calendar view |
| `renderCircadianPhase()` | ~7856 | Circadian display |
| `renderAccuracyDashboard()` | ~8051 | Prediction accuracy stats |
| `renderSleepPerformance()` | ~8160 | Sleep quality metrics |
| `renderSleepAchievements()` | ~8482 | Achievement display |
| `renderSleepHistoryList()` | ~8862 | History list view |
| `calculateAccuracyStats(days)` | ~8968 | Returns totalEntries, avgError, within30min, within60min, trend, recentBias |
| `getCalibrationRecommendation()` | ~9045 | Detailed calibration suggestions |
| `suggestCalibration()` | ~9093 | Threshold adjustment tips (bias > +/-30 min) |
| `initFirebase()` | ~9227 | Firebase initialization |
| `promptForPin()` | ~9297 | PIN modal |
| `submitPin()` | ~9332 | PIN validation |
| `skipPin()` | ~9350 | Offline mode (sets all 4 guard flags) |
| `saveToFirebase(state)` | ~9364 | Actual Firebase write |
| `loadFromFirebase()` | ~9403 | Initial data load from cloud |
| `setupRealtimeSync()` | ~9557 | Cross-device sync listener |
| `forceCloudSync()` | ~9655 | Force upload to cloud |
| `createCheckpoint(name)` | ~9717 | Save state snapshot |
| `showCheckpointManager()` | ~9744 | Checkpoint modal |
| `restoreCheckpoint(index)` | ~9814 | Restore from checkpoint |
| `exportAllCheckpoints()` | ~9880 | Export full backup |
| `importCheckpoint(event)` | ~9924 | Import checkpoint |
| `forcePullFromCloud()` | ~10116 | Force download from cloud |
| `renderAll()` | ~10170 | Master render function |
| `saveState()` | ~10322 | Debounced save with 5 guards |
| `saveStateImmediate()` | ~10381 | Immediate save with 5 guards |
| `loadState()` | ~10433 | Load from localStorage |
| `updateForecastLogic()` | ~11103 | Diagnostic forecast panel |
| `init()` | ~11126 | Main entry point (DOMContentLoaded) |
| `initUnifiedView()` | ~11504 | Unified accordion view setup |

---

## CRITICAL PATTERNS

### Pattern 1: XR Dose Calculation (ALL doses use this)
```javascript
// Inside calculateAmpLoad() — NO separate XR/IR functions
const immediateRelease = totalDose * 0.5;
const delayedRelease = totalDose * 0.5;
const delayedReleaseTime = effectiveDoseTime + 240; // T+4h in minutes

// Both pass through calculateDecayWithVitC() for VitC-aware decay
totalLoad += calculateDecayWithVitC(immediateRelease, effectiveDoseTime, ...);
if (atMinutes >= delayedReleaseTime) {
  totalLoad += calculateDecayWithVitC(delayedRelease, delayedReleaseTime, ...);
}
```

### Pattern 2: DR-Aware Clearance Search
```javascript
// findAmpClearTime() uses iterative binary search:
// 1. Collect ALL future DR release times from all medications
// 2. Binary search for first time load < threshold
// 3. Verify no future DR spike pushes load back above threshold
// 4. If re-spike found, restart search from that DR time
// 5. Repeat up to 10 iterations
```

### Pattern 3: Sauna Bonus Decay
```javascript
// Inside getEffectiveThreshold():
// Peak for first 2 hours, then linear decay over next 4 hours (6h total)
const peakDuration = 2;
const decayDuration = 4;
let decayFactor = 1.0;
if (hoursSinceSauna > peakDuration) {
  decayFactor = Math.max(0, 1.0 - (hoursSinceSauna - peakDuration) / decayDuration);
}
const baseBonus = saunaTime >= fivePM ? 2.0 : 1.0; // Evening sauna = stronger
threshold += baseBonus * decayFactor;
```

### Pattern 4: Ghost Load (All-Nighter Mode)
```javascript
// calculateAmpLoad includes yesterday's doses when allNighterMode=true
// Normal mode: today + yesterday only (daysDiff <= 1)
// All-nighter: up to 3 days old (daysDiff <= 3)
if (daysDiff > 1 && !state.allNighterMode) return; // Skip old
if (daysDiff > 3) return; // Skip very old regardless
```

---

## CONSULT REFERENCES FOR

- **Full architecture details** -> `references/app-architecture.md`
- **Drug decay math** -> `references/pharmacokinetics.md`
- **Sleep prediction algorithm (6 phases)** -> `references/sleep-prediction-algorithm.md`
- **Circadian rhythm system** -> `references/circadian-system.md`
- **Complete state structure** -> `references/state-structure.md`
- **All functions with verified line numbers** -> `references/function-map.md`
- **Bugs we've fixed** -> `references/known-bugs-and-fixes.md`
- **Prediction accuracy tracking** -> `references/calibration-system.md`
- **Debugging issues** -> `references/debugging-guide.md`

---

## RED FLAGS -- STOP AND CHECK

If you see ANY of these in code you're writing:

- Binary search assuming monotonic decrease (XR has DR spikes!)
- Circadian override without `applyCircadianConstraints` guard
- Missing `state._dataLoaded` in state reconstruction
- `saveStateImmediate()` with fewer guards than `saveState()`
- Time comparison without handling midnight crossing
- Ghost load displayed but not calculated in engine
- Sauna/workout bonus without time decay
- DR release not included in future load calculations
- Using `med.type` to distinguish IR/XR (no such field exists — all doses are XR)
- Calling functions that don't exist: `calculateDoseContribution()`, `calculateXRContribution()`, `getCircadianZoneTimes()`, `getSaunaBonus()`, `calculateGhostLoad()`
