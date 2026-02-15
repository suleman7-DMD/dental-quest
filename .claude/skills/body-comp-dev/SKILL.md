---
name: body-comp-dev
user-invocable: false
description: |
  Development patterns for Body Comp Tracker — a calorie/protein tracking app with cross-app Firebase integration.
  Single HTML file (~19,000 lines) with Firebase sync, dark theme UI, ecosystem reads from 3 other apps.
  Use when: debugging meal/workout tracking, modifying calorie calculations, working on TDEE/mode system,
  weigh-ins, body composition, progress tab, gamification, ecosystem integration, or any body comp feature.
  Trigger phrases: "body comp", "body comp tracker", "calorie tracking", "protein tracking",
  "meal logging", "workout tracking", "weigh-in", "TDEE", "deficit", "mode system",
  "gym streak", "eating nudge", "weekly export", "logic log", "refeed", "body fat",
  "frequent foods", "Navy method", "progress tab", "calendar heatmap".
  Do NOT use for: dental quest index.html, d3-roadmap, stimulant-elimination-calculator, or lecture-prompt-transformer.
  Those apps have their own skills.
globs:
  - "body-comp-tracker.html"
compatibility: Claude Code CLI. Requires file system access (Read, Edit, Write, Grep, Glob, Bash).
metadata:
  author: Sully
  version: 2.0.0
  file: body-comp-tracker.html
  lines: ~20158
  last-verified: 2026-02-14
---

# Body Comp Tracker Development Patterns

## USE CASES

This skill enables 3 core workflows:

**Use Case 1: Debug a tracking or calculation issue**
Trigger: User says "calories are wrong" or "deficit not showing" or "mode is wrong"
Steps: Check getTodayTotals() -> verify calculateTDEE() -> check calculateMode() -> verify saveDayLog() snapshot
Result: Root cause identified (e.g., active calories not included in TDEE, mode override from sleep debt)
Success criteria: Totals match manual sum of meals, TDEE includes 7-day workout average, mode matches sleep hours

**Use Case 2: Add or modify a feature**
Trigger: User says "add supplement tracking" or "change protein target formula"
Steps: Read state structure -> find relevant function -> make surgical edit -> verify guards intact -> test
Result: Feature added without breaking sync, guards, or existing calculations
Success criteria: Feature works, all 5 Firebase guards intact, saveDayLog() captures new data, brace balance unchanged

**Use Case 3: Fix a Firebase sync issue**
Trigger: User says "data not saving" or "sync broken" or "state wiped"
Steps: Check 5 guards in saveState() -> check skipPin() flags -> verify _dataLoaded preserved in realtime sync
Result: Sync issue identified and fixed without compromising data protection
Success criteria: saveState() returns true, data persists across refresh, all 5 guards still present

---

## INSTRUCTIONS

### Step 1: Identify what area of the app is involved
Read the APP OVERVIEW and KEY CONCEPTS below. Determine which subsystem is relevant:
- Meal/food tracking? -> See [references/meal-and-food-system.md](references/meal-and-food-system.md)
- Workouts/TDEE? -> See [references/workout-and-body-comp.md](references/workout-and-body-comp.md)
- Mode/targets? -> See [references/mode-targets-ecosystem.md](references/mode-targets-ecosystem.md)
- Firebase/sync? -> Check the 5 FIREBASE GUARDS section below
- Rendering/UI? -> See [references/rendering-and-progress.md](references/rendering-and-progress.md)
- Gamification? -> See [references/gamification-system.md](references/gamification-system.md)

### Step 2: Find the exact function and line number
Use the QUICK REFERENCE table below or [references/function-map.md](references/function-map.md) for the full 237-function index.
All line numbers are verified against the actual 20,203-line file.

### Step 3: Read the code before changing it
This is a single 19,034-line HTML file. Always read the target function and 50 lines of surrounding context before editing. Never write blind.

### Step 4: Make the change surgically
Use the Edit tool for targeted changes. NEVER rewrite the whole file.
After editing, verify:
- Brace/paren balance is intact
- No sync guards were removed or weakened
- `_dataLoaded: true` is preserved in any state reconstruction
- `saveState()` and `saveStateImmediate()` still have their respective guards

### Step 5: Verify the save chain
Every state mutation must flow through: mutate state -> `saveState()` -> `saveDayLog()` -> re-render.
If you touched meals/workouts, verify `saveDayLog()` is called (it snapshots today into dailyLogs).
If you touched Firebase code, verify all 5 guards are still present in `saveState()`.

### Step 6: Validate brace balance
After large edits: `python3 -c "c=open('body-comp-tracker.html').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

## EXAMPLES

### Example 1: Debug wrong calorie total
**User says:** "My calories show 0 even though I logged meals"
**Actions:**
1. Read `getTodayTotals()` at line 8236 — it sums from `getValues(state.today.meals)`
2. Check if `state.today.meals` is an object (not array). Legacy data uses arrays — look for `migrateArrayToObject()` calls
3. Check `ensureMealsObject()` (line 10765) is called before meal operations
4. Verify meals have `calories` field (not `cals` or `kcal`)
**Result:** Array-to-object migration missing in a code path, `getValues()` returned empty.

### Example 2: Add a new data collection
**User says:** "Add supplement tracking to body comp"
**Actions:**
1. Add `supplements: {}` to `getDefaultState()` (line 7317) — empty object, not array
2. Use `generateId('supp')` when creating entries
3. Add to `saveToFirebase()` payload (line 15163) — ensure ecosystemContext is still stripped
4. Add to realtime merge in `setupRealtimeSync()` (line 15366) with `migrateArrayToObject()`
5. Preserve `state._dataLoaded = true` after merge
6. If primary data, add to `isEmptyState()` check (line 7637)
7. Call `saveState()` after any supplement changes, then `saveDayLog()` if it affects daily tracking
**Result:** Collection persists across sessions and devices.

### Example 3: Fix data not saving
**User says:** "I added a meal but it disappeared after refreshing"
**Actions:**
1. Check all 5 guards: `console.log({ pinValidated, isInitialLoad, hasLoadedFromCloud, _dataLoaded: state._dataLoaded, isEmpty: isEmptyState(state) })`
2. If `hasLoadedFromCloud` is false — check `loadFromFirebase()` (line 15217). Did it complete?
3. If `isEmptyState()` returns true — check the 6 conditions at line 7637
4. Read `saveState()` at line 14942 — verify all 5 guards present
5. Check if `skipPin()` was used — known bug at line 16624 (doesn't set guard flags)
**Result:** Guard identified as blocking — e.g., skipPin() left all guards in blocking state.

---

## TROUBLESHOOTING

### Error: Meals/workouts vanish after refresh
**Cause:** `saveState()` not called after mutation, or a guard is blocking saves silently.
**Solution:** Verify every meal/workout function calls `saveState()` then `saveDayLog()`. Check guard status in console.

### Error: TDEE seems wrong (too high or too low)
**Cause:** `calculateTDEE()` (line 8123) uses 7-day rolling average from actual workout objects in dailyLogs. No fallback to `state.today.activeCalories` (circular reference removed Feb 2026).
**Solution:** Check workout objects in `state.today.workouts` and recent dailyLogs. Verify `activityLevel` multiplier in profile (default: sedentary=1.2). If targets seem stale, `renderSimpleView()` auto-corrects if TDEE diverges >100 cal.

### Error: Calorie target wildly inflated (FIXED Feb 2026)
**Cause:** Circular self-reinforcing bug — `get7DayAvgActiveCalories()` fell back to `state.today.activeCalories`, which was set BY `autoStartDay()` FROM that same function. Once inflated, the value persisted forever.
**Solution:** Fixed structurally — `get7DayAvgActiveCalories()` (line 8177) and `calculateTDEE()` (line 8123) now only use actual workout object data. `renderSimpleView()` auto-corrects stale targets. No clamps needed.

### Error: Progress tab showing wrong scores or hiding sections
**Cause:** Several analytics functions had `||` instead of `??` for numeric fallbacks (treating 0 as falsy), wrong field names (`goalWeight` vs `goalWeight_lbs`), or simplified status fallback logic.
**Solution:** Fixed Feb 2026 — all target/floor/protein fallbacks use `??`, gymScore capped at 100, recomp predictor reads `goalWeight_lbs`, calendar heatmap uses `determineDayStatus()` for fallback.

### Error: Mode shows ORANGE when sleep was fine
**Cause:** All-nighter mode from stim calc forces ORANGE regardless of sleep hours. Check `calculateMode()` line 8172.
**Solution:** Check `state.ecosystemContext.stimulant.allNighterMode`. If true, mode is forced ORANGE.

### Error: Data wiped on new device
**Cause:** Default state has `_version: 0` but if any code path sets `_version: Date.now()` before cloud load, empty local state overwrites cloud.
**Solution:** Verify `getDefaultState()` (line 7317) has `_version: 0` and `_dataLoaded: false`. Check all 5 guards. Use `forcePullFromCloud()` to recover.

### Error: Offline mode can't save (skipPin bug)
**Cause:** `skipPin()` at line 16624 doesn't set guard flags (`pinValidated`, `hasLoadedFromCloud`, `isInitialLoad`, `_dataLoaded`). All saves blocked.
**Solution:** Add the 4 missing flag sets to `skipPin()`. Reference stim-calc's correct implementation at line 9350.

### Error: saveStateImmediate() bypasses PIN check
**Cause:** Known bug — `saveStateImmediate()` (line 14996) has 4 guards but missing `!pinValidated` check.
**Solution:** Add `if (!pinValidated) return false;` as the first guard in `saveStateImmediate()`.

---

## PERFORMANCE NOTES

- **Read before you edit.** This is a 20,203-line single file. Always read the target function and 50+ lines of context before making any change. Blind edits break things silently.
- **Quality over speed.** A broken sync guard wipes ALL user data across devices. Take your time verifying guards are intact after every edit.
- **Check the save chain every time.** After any state mutation, verify `saveState()` is called, then `saveDayLog()` if meals/workouts changed, then the appropriate render function. Missing any link in this chain causes silent data loss.
- **Do not skip brace balance checks** after edits touching more than 10 lines. One missing brace in a 19K-line file is nearly impossible to find manually.
- **Verify ecosystem stripping.** After touching `saveToFirebase()` or adding new state fields, confirm `ecosystemContext` is still excluded from the save payload.
- **Deep copy meals/workouts.** Every `saveDayLog()` path must use `JSON.parse(JSON.stringify())` for meals and workouts. Reference mutation bugs are the #1 recurring issue.

---

## ERROR HANDLING

### Null-Safe Ecosystem Access
Ecosystem data comes from 3 external apps and may be missing at any time:
```javascript
// WRONG — crashes if stimulant context missing
const sleep = state.ecosystemContext.stimulant.sleepHours;

// CORRECT — optional chaining with fallback
const sleep = state.ecosystemContext?.stimulant?.sleepHours ?? null;
```

### Firebase Operation Errors
All Firebase reads/writes should handle failures gracefully:
```javascript
// Pattern: try-catch around Firebase operations
try {
    await database.ref(userPath).set(stateToSave);
} catch (error) {
    console.error('Firebase save failed:', error);
    updateSyncStatus('error');
    // localStorage save already happened — data is safe locally
}
```

### Guard-Aware Error Recovery
If a save fails, NEVER bypass guards to force it through. Instead:
1. Check which guard is blocking (console shows `⚠️ BLOCKED:` messages)
2. Fix the root cause (e.g., set missing flags)
3. Let the normal save chain retry

### Collection Safety
Always validate collections before iteration:
```javascript
// WRONG — crashes on undefined or array
Object.keys(state.today.meals).forEach(...)

// CORRECT — use safe helpers
getValues(state.today.meals).forEach(...)  // handles undefined, arrays, objects
getCount(state.today.meals)                // safe count
```

### Date Parsing Safety
```javascript
// WRONG — UTC parsing causes off-by-one in EST
new Date('2026-02-13')

// CORRECT — local timezone parsing
parseLocalDate('2026-02-13')
// or manual: const [y,m,d] = str.split('-').map(Number); new Date(y, m-1, d);
```

---

## CRITICAL: FIREBASE RULES APPLY

This app uses the same Firebase patterns as all Sully apps.
**BEFORE ANY CODE CHANGES**, ensure you follow:
- `sully-firebase-patterns` skill rules (when available)
- Use `{}` objects with `generateId()` keys, NEVER arrays
- Use ONLY `saveState()` or `saveStateImmediate()` for persistence
- Respect ALL 5 sync guards
- Strip `ecosystemContext` before Firebase save

---

## APP OVERVIEW

**Purpose:** Track calories, protein, workouts, weight, and body composition for a dental student's cut to 170 lbs by June 2026. Integrates with 3 other apps via Firebase for stimulant-aware eating guidance.

**File:** `body-comp-tracker.html` (20,203 lines, single file, no build system)

**File Layout:**
| Range | Content |
|-------|---------|
| 1-5956 | CSS styles (dark theme, responsive) |
| 5957-7310 | HTML structure, modals (~16 modals) |
| 7311-7654 | State management (getDefaultState, isEmptyState) |
| 7656-7876 | Data integrity utilities, Firebase config |
| 7877-8079 | Utility functions, Eastern timezone helpers |
| 8080-8256 | Core algorithms (TDEE, mode, targets) |
| 8257-8552 | Date-based calculations, UI helpers |
| 8387-8560 | **V2 shared infrastructure**: determineDayStatus(), calculateDayCalScore/ProteinScore/DeficitScore(), recalculateAllDayLogs() |
| 8553-9363 | Simple View rendering, schedule/exam cards |
| 9364-10163 | Stimulant modeling, nudges, status |
| 10164-11174 | Meal/workout rendering and editing |
| 11175-11835 | Import from Claude, quick meal modal, qty selector |
| 11836-12467 | Workout modal, nudges, micronutrients |
| 12468-12961 | Weigh-in, export system |
| 12962-13702 | Weekly export, logic log (9 sections) |
| 13703-14066 | Body comp modal (Navy method + scale) |
| 14067-14940 | UI/UX functions, settings, data management |
| 14942-15561 | **saveState()**, saveStateImmediate(), loadState(), saveToFirebase(), loadFromFirebase(), setupRealtimeSync() |
| 15562-16109 | Checkpoint system (create/restore/export/import) |
| 16110-16635 | Firebase init, PIN auth, ecosystem data integration |
| 16636-16975 | Gamification (XP, levels, streaks, achievements) |
| 16976-17728 | Progress tab (13+ sub-renderers) |
| 17729-18070 | **V2 aggregation**: aggregateDailyLogs(start, end), calculateWeekScore() |
| 18070-18262 | Calendar heatmap (8 statuses including deficit_gym, gym_only) |
| 18263-18423 | **V2 progress**: renderDailySnapshot(), renderWorkoutStats() |
| 18424-18585 | **V2 analytics**: renderMacroTimingAnalysis() (ISSN protein timing) |
| 18586-18728 | **V2 analytics**: renderDeficitSustainability() (CV, yo-yo detection) |
| 18729-18950 | **V2 analytics**: renderRecompPredictor() (Longland et al., Mifflin-St Jeor) |
| 18951-18967 | refreshProgressIfActive() |
| 18968-19178 | Initialization, day management, event listeners |
| 19179-20203 | Calendar tab, data integrity checks, badges tab, DOMContentLoaded |

---

## KEY CONCEPTS

### 1. Save Chain
Every data mutation must follow: `mutate state` -> `saveState()` -> `saveDayLog()` -> re-render.
`saveDayLog()` (line 12228) snapshots `state.today` into `state.dailyLogs[date]` with calculated totals, deep-copied meals/workouts, ecosystem snapshot, and logic log.

### 2. Mode System
```
Sleep >= 6h  -> GREEN  (500 cal deficit, normal training)
Sleep 5-6h   -> YELLOW (300 cal deficit, light training)
Sleep < 5h   -> ORANGE (0 deficit = maintenance, recovery only)
allNighterMode -> ORANGE (forced regardless of sleep)
```
Sleep debt WARNING (not forced override) at SEVERE/HIGH severity.

### 3. Cross-App Ecosystem (READ-ONLY)
Body comp reads from 3 other Firebase paths:
- **Stim Calc**: sleep hours, wake time, medications, caffeine, projected sleep time
- **Dental Quest**: pill counts (30mg, 20mg), refill dates
- **D3 Roadmap**: exam schedule, daily schedule/eating windows
Ecosystem data feeds into: auto-start day, eating nudges, mode, exam stress multiplier.

### 4. Object-Based Storage (Firebase Safety)
ALL collections use `{}` objects with `generateId()` keys, NEVER arrays.
Firebase silently corrupts arrays. Always use `migrateArrayToObject()` when loading data.

---

## THE 5 FIREBASE GUARDS

```javascript
// In saveState() at line 14942:
if (!pinValidated) return false;        // Guard 0: PIN not validated
if (isInitialLoad) return false;        // Guard A: Still loading
if (!hasLoadedFromCloud) return false;  // Guard B: Haven't loaded yet
if (isEmptyState(state)) return false;  // Guard C: Would wipe data
if (!state._dataLoaded) return false;   // Guard D: State not ready
```

Guard flags declared at lines 7632-7634:
```javascript
let isInitialLoad = true;       // line 7632
let hasLoadedFromCloud = false;  // line 7633
let pinValidated = false;        // line 7634
```

**saveStateImmediate() (line 14996) has only 4 guards — missing Guard 0 (PIN check). Known bug.**

---

## QUICK REFERENCE: KEY FUNCTIONS

| Function | Line | Purpose |
|----------|------|---------|
| `getDefaultState()` | 7317 | Factory for default state object (~300 lines) |
| `isEmptyState(data)` | 7637 | Checks 6 conditions (weighIns, meals, workouts, dailyLogs, bodyCompHistory, setupComplete) |
| `generateId(prefix)` | 7670 | Generate unique IDs like `meal_17074...` |
| `getValues(obj)` | 7675 | Safe object-to-array iteration |
| `getCount(obj)` | 7682 | Safe object key count |
| `getLocalDateString()` | 7881 | Today's date as YYYY-MM-DD (local timezone) |
| `parseLocalDate(str)` | 16480 | Parse date string to local Date |
| `formatTimeET(input)` | 7907 | Format time in Eastern Time |
| `escapeHtml(str)` | 7976 | XSS protection for innerHTML |
| `formatNumber(num)` | 7971 | Locale-formatted number display |
| `calculateTDEE(...)` | 8123 | BMR * activity + 7-day avg workout cals (no circular fallback) |
| `get7DayAvgActiveCalories()` | 8177 | Workout-only average from dailyLogs (no activeCalories fallback) |
| `calculateMode(sleep, brain)` | 8209 | Determines GREEN/YELLOW/ORANGE from sleep |
| `calculateTargets(mode, tdee, weight, brain)` | 8222 | Calorie/protein/carb targets for mode |
| `getTodayTotals()` | 8269 | Sum calories/protein/carbs from today's meals |
| `renderSimpleView()` | 8704 | Main dashboard renderer (auto-corrects stale targets) |
| `getSimpleStatus()` | 9791 | Dashboard status icon/label/color |
| `getEatingNudge()` | 9845 | Context-aware stimulant eating nudge |
| `getWorkoutRecommendation()` | 9980 | Sleep-based workout advice + gym streak |
| `openQuickMealModal()` | 11528 | Primary meal entry point |
| `openWorkoutModal()` | 12001 | Workout logging modal |
| `saveDayLog()` | 12387 | Snapshot today to dailyLogs[date] (called ~23 places) |
| `generateLogicLog()` | 13311 | 9-section diagnostic output |
| `openBodyCompModal()` | 13707 | Navy method + scale body fat measurement |
| `saveState()` | 14942 | **CRITICAL** — 5-guard save to localStorage + Firebase |
| `saveStateImmediate()` | 14996 | Immediate save (4 guards — missing PIN, known bug) |
| `saveToFirebase()` | 15163 | Actual Firebase write (strips ecosystemContext) |
| `loadFromFirebase()` | 15217 | Load + merge from Firebase, sets all flags |
| `setupRealtimeSync()` | 15366 | Version-compared realtime listener |
| `createCheckpoint(name)` | 15566 | Save state checkpoint to localStorage + Firebase |
| `forceUploadToCloud()` | 15982 | Bypass guards, overwrite cloud |
| `forcePullFromCloud()` | 16034 | Overwrite local from cloud |
| `loadEcosystemData(pin)` | 16211 | Cross-app reads from stim calc, dental quest, d3 roadmap |
| `autoStartDay()` | 19729 | Auto-setup day from ecosystem data (honest 0 fallback) |
| `initializeUI()` | 19677 | Main UI init, handles day rollover (resets even w/o setupComplete) |
| `determineDayStatus(...)` | 8387 | **V2** Shared status logic (8 statuses), single source of truth |
| `calculateDayCalScore(...)` | 8416 | **V2** Margin-based calorie score 0-100 (USDA HEI) |
| `calculateDayProteinScore(...)` | 8440 | **V2** Margin-based protein score 0-100 |
| `calculateDayDeficitScore(...)` | 8457 | **V2** Margin-based deficit score 0-100 |
| `recalculateAllDayLogs()` | 8561 | **V2** Batch migration for historical dailyLogs |
| `aggregateDailyLogs(start, end)` | 17729 | **V2** Shared data source for calendar + progress (uses ??) |
| `calculateWeekScore(logs)` | 17840 | **V2** Margin-based weekly score, gymScore capped at 100 |
| `renderDailySnapshot()` | 18263 | **V2** Today's real-time progress vs yesterday |
| `renderWorkoutStats()` | 18337 | **V2** All-time workout analytics (friendly empty state) |
| `renderMacroTimingAnalysis()` | 18424 | **V2** Protein distribution across 4 windows (ISSN) |
| `renderDeficitSustainability()` | 18586 | **V2** Deficit consistency via CV (sparse data caveat) |
| `renderRecompPredictor()` | 18729 | **V2** Fat/lean projection (reads goalWeight_lbs) |
| `refreshProgressIfActive()` | 18951 | **V2** Auto-refresh progress tab after data changes |
| `renderProgressTab()` | 17165 | Renders all progress sub-sections (V2: 15+ renderers) |
| `renderCalendarHeatmap()` | 19179 | Calendar (determineDayStatus fallback, 8 statuses) |
| `awardXP(amount, reason)` | 16753 | XP award with level-up check |
| `updateStreak()` | 16772 | Daily completion streak |
| `checkDayCompletion()` | 16808 | Check calorie/protein targets, award XP |

---

## CRITICAL PATTERNS

### Pattern 1: Adding a Meal (Full Flow)
```javascript
// Inside confirmQtyAdd() or addCustomMeal():
const mealId = generateId('meal');
state.today.meals[mealId] = { id: mealId, name, calories, protein, carbs, time: formatTimeET(new Date()), date: getLocalDateString() };
food.uses++;                    // Increment frequent food usage counter
saveState();                    // localStorage + Firebase (debounced 2s)
saveDayLog();                   // Snapshot today into dailyLogs
awardXP(10, 'Logged meal');     // Gamification
checkDayCompletion();           // Check targets, award bonus XP
renderSimpleView();             // Re-render dashboard
```

### Pattern 2: Deep Copy for Daily Logs
```javascript
// ALWAYS deep copy meals/workouts to prevent reference mutation
meals: today.meals ? JSON.parse(JSON.stringify(today.meals)) : {},
workouts: today.workouts ? JSON.parse(JSON.stringify(today.workouts)) : {},
```

### Pattern 3: Array-to-Object Migration
```javascript
// Before any meal/workout operation on loaded data:
if (!state.today.meals || Array.isArray(state.today.meals)) {
    state.today.meals = migrateArrayToObject(state.today.meals, 'meal');
}
```

### Pattern 4: Ecosystem Context Stripping
```javascript
// In saveToFirebase() — ecosystemContext is READ-ONLY, never saved back
const stateToSave = { profile, today, frequentFoods, weighIns, bodyCompHistory,
    dailyLogs, refeedTracker, gamification, achievements, _version, _lastModified };
// ecosystemContext deliberately excluded
```

---

## CONSULT REFERENCES FOR

- **Full file layout + init sequence** -> [references/app-architecture.md](references/app-architecture.md)
- **Complete state object** -> [references/state-structure.md](references/state-structure.md)
- **All 237 functions with line numbers** -> [references/function-map.md](references/function-map.md)
- **Save/load/sync/checkpoints** -> [references/firebase-and-sync.md](references/firebase-and-sync.md)
- **Meals, frequent foods, import** -> [references/meal-and-food-system.md](references/meal-and-food-system.md)
- **Workouts, weigh-ins, body comp** -> [references/workout-and-body-comp.md](references/workout-and-body-comp.md)
- **Mode, TDEE, targets, ecosystem** -> [references/mode-targets-ecosystem.md](references/mode-targets-ecosystem.md)
- **Rendering, progress tab, calendar** -> [references/rendering-and-progress.md](references/rendering-and-progress.md)
- **XP, levels, streaks, achievements** -> [references/gamification-system.md](references/gamification-system.md)
- **Known bugs + debugging** -> [references/known-bugs-and-debugging.md](references/known-bugs-and-debugging.md)

---

## RED FLAGS -- STOP AND CHECK

If you see ANY of these in code you're writing:

- Using arrays for Firebase collections (use objects with generateId keys!)
- Missing `saveState()` after state mutation
- Missing `saveDayLog()` after meal/workout changes
- Saving ecosystemContext to Firebase (it's read-only!)
- Removing or weakening any of the 5 save guards
- Setting `_version: Date.now()` in default state (must be 0)
- Using `new Date('YYYY-MM-DD')` instead of parseLocalDate() for date parsing
- Empty array truthy check: `loadedFoods || defaults` instead of `loadedFoods?.length > 0`
- Not deep-copying meals/workouts in saveDayLog (reference mutation bug)
- Calling functions that don't exist — check [references/function-map.md](references/function-map.md)
- Missing `state._dataLoaded = true` after state reconstruction
