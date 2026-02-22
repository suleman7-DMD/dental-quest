---
name: stim-calc-dev
description: |
  Develop and debug the Stimulant Elimination Calculator app (stimulant-elimination-calculator.html) — a pharmacokinetic sleep prediction app with XR modeling, circadian rhythm, and workout planning.
  Use this skill when the user asks to modify, fix, or add features to stimulant-elimination-calculator.html. Trigger phrases: "stim calc", "stimulant calculator", "stimulant-elimination-calculator.html", "sleep prediction", "pharmacokinetic", "amphetamine", "caffeine", "half-life", "threshold", "forbidden zone", "circadian", "XR", "delayed release", "ghost load", "all-nighter", "VitC", "vitamin C", "workout planner", "nicotine", "sauna bonus", "adderall", "sleep", "meds", "medication timing", "when will I sleep", "sleep time", "drug levels", "elimination", "decay", "clearance", "stimulant", "sleep calculator", "wake time", "sleep debt", "graph", "curves", "what-if", "scenarios", "recommendations", "forecast", "accordion", "recalculate", "split plan".
  Do NOT use this skill for dental quest index.html, d3-roadmap.html, body-comp-tracker.html, or lecture-prompt-transformer.html — those are separate apps with their own skills.
globs:
  - "stimulant-elimination-calculator.html"
  - "js/stimcalc/**"
  - "SPLIT-PLAN-V2.md"
  - ".claude/skills/stim-calc-dev/**"
metadata:
  author: Sully
  version: 3.1.0
  file: stimulant-elimination-calculator.html + js/stimcalc/*.js (10 modules)
  lines: ~12,790 total (2,903 HTML + 9,887 JS)
  last-verified: 2026-02-21
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

### Step 2: Find the right module file
The app is split into 10 JS modules. Use the MODULE MAP below to identify which file to edit:
| What to change | File |
|---------------|------|
| State defaults, utilities, time helpers | `js/stimcalc/state.js` (463 lines) |
| Circadian zones, forbidden zone, sleep gate | `js/stimcalc/circadian.js` (229 lines) |
| Drug decay, threshold, VitC, clearance search | `js/stimcalc/pharma-engine.js` (657 lines) |
| Sleep prediction algorithm (7 phases) | `js/stimcalc/sleep-prediction.js` (284 lines) |
| Firebase, save guards, sync, checkpoints | `js/stimcalc/firebase-sync.js` (1,404 lines) |
| Add/remove medications or caffeine | `js/stimcalc/med-caffeine.js` (295 lines) |
| Nicotine, modifiers, workout, what-if, forecast | `js/stimcalc/ui-sections.js` (1,911 lines) |
| History, calibration, calendar, analytics dashboard, accuracy transparency | `js/stimcalc/history-calendar.js` (2,888 lines) |
| Canvas graphs, tooltips | `js/stimcalc/graph.js` (733 lines) |
| recalculate(), init, accordion, hero UI | `js/stimcalc/init.js` (1,090 lines) |
| CSS or HTML markup | `stimulant-elimination-calculator.html` (2,833 lines, zero JS) |

### Step 3: Read the code before changing it
Each module is 200-1,900 lines. Read the target function and surrounding context before editing. Never write blind.

### Step 4: Make the change surgically
Use the Edit tool for targeted changes.
After editing, verify:
- Brace/paren balance is intact: `python3 -c "c=open('FILE').read(); print(c.count('{'), c.count('}'))"`
- No sync guards were removed or weakened (check `firebase-sync.js`)
- `_dataLoaded: true` is preserved in any state reconstruction
- `saveState()` and `saveStateImmediate()` still have identical guards in `firebase-sync.js`

### Step 5: Verify nothing broke
Check that `recalculate()` still works (it runs every 5 seconds via setInterval in init.js).
recalculate() has try/catch — errors show "Calc Error" for 5s then self-heal, but still fix them.
If you touched Firebase code, verify all 5 guards are still present in both save functions.
If you touched the prediction algorithm, verify all 7 phases are intact.

---

## EXAMPLES

### Example 1: Debug a wrong sleep prediction

**User says:** "The prediction says I can sleep at 10:30 PM but I know I can't sleep until way later"

**Actions:**
1. Read `calculateSleepTime()` in `js/stimcalc/sleep-prediction.js` and check each phase's output
2. Run diagnostic in console:
   ```javascript
   const now = getCurrentMinutes();
   console.log('Amp load:', calculateAmpLoad(now).toFixed(1), 'mg');
   console.log('Threshold:', getEffectiveThreshold().toFixed(1), 'mg');
   console.log('Amp clear:', findAmpClearTime() ? minutesToTimeWithDay(findAmpClearTime()) : 'already clear');
   const fz = getForbiddenZone();
   console.log('Forbidden Zone:', minutesToTime(fz.start), '-', minutesToTime(fz.end));
   ```
3. Check if DR spike is being missed — look at `findAmpClearTime()` in `pharma-engine.js` and verify future DR release times are collected
4. Check if sauna/workout bonus is decaying properly in `getEffectiveThreshold()` in `pharma-engine.js`
5. Check if VitC is active when it shouldn't be: `isVitaminCEffective()` in `pharma-engine.js`

**Result:** Root cause found — e.g., sauna bonus was added 7 hours ago but not decaying, artificially raising the threshold and making clearance too early.

### Example 2: Add a new threshold modifier

**User says:** "Add a melatonin modifier that adds +2mg to threshold when taken"

**Actions:**
1. Read `references/state-structure.md` to understand the `modifiers` object
2. Add `melatonin: { active: false, time: null, date: null }` to the modifiers section in `getDefaultState()` in `state.js`
3. Read `getEffectiveThreshold()` in `pharma-engine.js` to see how existing modifiers (sauna, workout) are applied
4. Add melatonin bonus logic INSIDE `getEffectiveThreshold()`, following the sauna decay pattern (peak then decay)
5. Add UI toggle — read `renderAll()` in `firebase-sync.js` and existing modifier UI in `ui-sections.js` for patterns
6. Verify: `saveState()` guards still have all 5 checks in `firebase-sync.js`, brace balance intact, `_dataLoaded` preserved

**Result:** Melatonin modifier added. Threshold increases by +2mg when active, with time-based decay matching existing modifier patterns.

### Example 3: Fix data not saving

**User says:** "I added a medication but it disappeared after refreshing"

**Actions:**
1. Check all 5 guards in console:
   ```javascript
   console.log({ pinValidated, isInitialLoad, hasLoadedFromCloud, _dataLoaded: state._dataLoaded, isEmpty: isEmptyState(state) });
   ```
2. If `hasLoadedFromCloud` is false — check `loadFromFirebase()` and `skipPin()` in `firebase-sync.js`
3. If `isEmptyState()` is true — check `isEmptyState()` in `state.js`. Does the state have meds? All 6 conditions must fail for non-empty.
4. Read both `saveState()` and `saveStateImmediate()` in `firebase-sync.js` — verify both have IDENTICAL 5 guards
5. Check `setupRealtimeSync()` in `firebase-sync.js` — verify `mergeRemoteState()` preserves `_dataLoaded: true`

**Result:** Guard identified as blocking — e.g., `skipPin()` wasn't setting all 4 flags, so offline mode blocked all saves.

---

## TROUBLESHOOTING

### Error: Sleep prediction shows "already clear" when user just took medication
**Cause:** `findAmpClearTime()` binary search didn't account for future DR spike at T+4h. The initial search found clearance before the DR release, but didn't verify load stays below threshold after DR hits.
**Solution:** Check that `findAmpClearTime()` in `pharma-engine.js` collects ALL future DR release times and re-verifies after each. See Pattern 2 in CRITICAL PATTERNS. The iterative loop should run up to 10 times.

### Error: Threshold shows wrong value (too high or too low)
**Cause:** A modifier (sauna, workout, sleep debt) isn't decaying properly, or `isHyperarousalMode()` isn't zeroing the sleep debt bonus.
**Solution:** Read `getEffectiveThreshold()` in `pharma-engine.js`. Check sauna decay (peak 2h, decay 4h more — 6h total). Check workout `adenosineBonus`. Check `calculateSleepDebtBonus()` in `pharma-engine.js` returns 0 when `isHyperarousalMode()` is true. Cap is base + 8mg max.

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
- Run `recalculate()` mentally — it fires every 5 seconds. It has try/catch so errors won't crash the app, but fix them anyway.

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

**Files:** `stimulant-elimination-calculator.html` (2,632 lines CSS+HTML) + `js/stimcalc/*.js` (10 modules, 8,224 lines total)
**Split Feb 2026**: Was 11,526-line monolith → now 10 separate JS modules loaded via `<script src>` tags. Zero inline JS.

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
// In BOTH saveState() and saveStateImmediate() in firebase-sync.js:

if (!pinValidated) return false;        // Guard 0: PIN not validated
if (isInitialLoad) return false;        // Guard A: Still loading
if (!hasLoadedFromCloud) return false;  // Guard B: Haven't loaded yet
if (isEmptyState(state)) return false;  // Guard C: Would wipe data
if (!state._dataLoaded) return false;   // Guard D: State not ready
```

**Both functions have IDENTICAL guards.** Never modify one without the other.

---

## QUICK REFERENCE: KEY FUNCTIONS BY MODULE

### state.js — Globals, Defaults, Utilities
`getDefaultState()`, `isEmptyState()`, `hasRealData()`, `generateId()`, `getValues()`, `getCount()`, `escapeHtml()`, `safeLocalStorageSet()`, `BackupManager`, `getLocalDateString()`, `parseLocalDate()`, `timeToMinutes()`, `minutesToTime()`, `minutesToTimeWithDay()`, `computeSleepDelta()`, `snapshotPredictionInputs()`, `migrateHistoryEntries()`, `getCurrentMinutes()`, `formatTime12()`, `showToast()`, `showCustomAlert()`, `showCustomConfirm()`

### circadian.js — Circadian Analysis
`analyzeCircadianPhase()`, `getForbiddenZone()`, `getSleepGate()`, `isInForbiddenZone()`, `isInSleepGate()`, `getForbiddenZoneEnd()`

### pharma-engine.js — Drug Calculations
`getVitaminCTimeMinutes()`, `isVitaminCEffective()`, `getVitaminCStatus()`, `calculateSleepDebtBonus()`, `getSleepDebtBreakdown()`, `getEffectiveThreshold()`, `isHyperarousalMode()`, `calculateDecayWithVitC()`, `calculateAmpLoad()`, `calculateCaffLoad()`, `findAmpClearTime()`, `findCaffClearTime()`, `getYesterdayMedications()`, `calculateYesterdayDoseRemaining()`

### sleep-prediction.js — Sleep Prediction
`calculateSleepTime()` — the 7-phase algorithm (~284 lines)

### firebase-sync.js — Persistence & Sync
`mergeRemoteState()` (NEW), `initFirebase()`, `submitPin()`, `skipPin()`, `saveToFirebase()`, `loadFromFirebase()`, `setupRealtimeSync()`, `createCheckpoint()`, `showCheckpointManager()`, `restoreCheckpoint()`, `forceUploadToCloud()`, `forcePullFromCloud()`, `renderAll()`, `saveState()` (5 guards), `saveStateImmediate()` (5 guards), `loadState()`

### med-caffeine.js — Medication & Caffeine CRUD
`addMedEntry()`, `removeMedEntry()`, `renderMedEntries()`, `addCaffeine()`, `removeCaffeine()`, `renderCaffeineEntries()`

### ui-sections.js — UI Panels
`logNicotine()`, `updateNicotineDisplay()`, `checkRLSRisk()`, `toggleModifier()`, `toggleAllNighterMode()`, `renderGhostLoad()`, `initWorkoutPlanner()`, `calculateWorkoutImpact()`, `applyWorkoutPlan()`, `updateScenarios()`, `updateForecastLogic()`

### history-calendar.js — History, Calendar, Analytics Dashboard, Accuracy Transparency
`saveDay()`, `renderHistory()`, `renderSleepCalendar()` (7-day overview), `renderSleepCalendarMonth()` (full month grid), `navigateCalendar()`, `renderCalendarLegend()`, `renderCalendarMonthStats()`, `showSleepDayDetails()` (day detail modal), `closeSleepDayDetailModal()`, `cleanupPhantomSleepLogs()`, `saveDailyLogicLog()`, `renderCircadianPhase()`, `renderSleepPerformance()`, `calculateAccuracyStats()`, `suggestCalibration()`, `getCalibrationRecommendation()`,
**Analytics Engine:** `gatherAllDayData()` (unified with Calendar tab via `getSleepForDate()`, builds history lookup by date, uses dailyLogs as primary source, derives allNighterMode from actual sleep hours), `toggleInsSection()`, `buildInsSection()`
**Insights Tab (14 sections):** `renderInsightsTab()`, `renderInsKeyMetrics()`, `renderInsDoseResponse()`, `renderInsCaffeineImpact()`, `renderInsSleepPatterns()`, `renderInsModifierImpact()`, `renderInsDosingWindows()`, `renderInsCaffeineTiming()`, `renderInsSleepEfficiency()`, `renderInsPredictionReliability()`, `renderInsCircadianConsistency()`, `renderInsStimulantTrends()`, `renderInsRiskIndicators()`, `renderInsPersonalRecords()`, `renderInsResearchBenchmarks()`
**Accuracy Tab (7 sections):** `renderAccuracyTab()`, `renderAccOverallGrade()`, `renderAccMethodology()`, `renderAccErrorDistribution()`, `renderAccDirectionalBias()`, `renderAccContextBreakdowns()`, `renderAccDataInventory()`, `renderAccInputVerification()`
**Legacy wrappers:** `renderPredictionInsights()` → `renderInsightsTab()`, `renderAccuracyDashboard()` → `renderAccuracyTab()`, `renderCalibrationContexts()` (no-op)

### graph.js — Canvas Rendering
`drawGraph()`, `setupGraphTooltip()`, `drawSleepPerformanceGraph()`

### init.js — App Bootstrap & Heartbeat
`syncStateFromDOM()`, `runCalculations()`, `updateUI()`, `recalculate()` (try/catch wrapper), `init()`, `scheduleEndOfDayLogicSave()`, `toggleAccordion()`, `updateAccordionSummaries()`, `initUnifiedView()`, `updateRecommendations()`, `updateFeelingsTimeline()`

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

## SPLIT COMPLETE (Feb 20, 2026)

The monolith was split into 10 JS modules via a 6-phase, 6-agent operation. 16 bugs fixed during extraction.
`SPLIT-PLAN-V2.md` in repo root documents the full plan (now historical reference).

Key architectural changes:
- `recalculate()` split into `syncStateFromDOM()` + `runCalculations()` + `updateUI(vm)` with try/catch (in `init.js`)
- 4 duplicated Firebase merge blocks → 1 `mergeRemoteState()` (in `firebase-sync.js`)
- Circadian zones now use 7-day average wake time (in `circadian.js`)
- Ghost load uses VitC-aware decay (in `pharma-engine.js`)
- All midnight-crossing deltas use `computeSleepDelta()` (in `state.js`)

## CONSULT REFERENCES FOR

- **Full architecture details** -> `references/app-architecture.md`
- **Drug decay math** -> `references/pharmacokinetics.md`
- **Sleep prediction algorithm (7 phases)** -> `references/sleep-prediction-algorithm.md`
- **Circadian rhythm system** -> `references/circadian-system.md`
- **Complete state structure** -> `references/state-structure.md`
- **All functions with verified line numbers** -> `references/function-map.md` (NOTE: line numbers are from pre-split; use module file names instead)
- **Bugs we've fixed** -> `references/known-bugs-and-fixes.md`
- **Prediction accuracy tracking** -> `references/calibration-system.md`
- **Debugging issues** -> `references/debugging-guide.md`
- **Original split plan** -> `SPLIT-PLAN-V2.md` (repo root, historical)

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
