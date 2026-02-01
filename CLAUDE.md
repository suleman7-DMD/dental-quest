# CLAUDE.md - Dental Student Quest

## CRITICAL RULES

### Never Rebuild Entire Files
- Files are 10,000-13,000+ lines each
- Use surgical `Edit` tool for targeted changes only
- Always read file section first before editing

### Date Parsing (COMMON BUG)
```javascript
// WRONG - causes off-by-one in EST timezone
const date = new Date('2026-02-02');

// CORRECT - parse in local timezone
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```

### Empty Array Bug
```javascript
// WRONG - empty array is truthy!
const foods = loadedFoods || defaults;  // [] || defaults = []

// CORRECT - check length
const foods = loadedFoods?.length > 0 ? loadedFoods : defaults;
```

---

## PROJECT OVERVIEW

### Files
| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~10,500 | Main app: Focus Mode, tasks, financials, calendar, medications, pomodoro |
| `d3-roadmap.html` | ~13,700 | Academic tracker: grades, deadlines, clinical competencies, monthly planner |
| `stimulant-elimination-calculator.html` | ~10,600 | Sleep prediction, caffeine/Adderall pharmacokinetic modeling |
| `body-comp-tracker.html` | ~12,000 | Calorie/protein tracking with cross-app Firebase integration |
| `lecture-prompt-transformer.html` | ~2,800 | Lecture notes prompt builder |

### Hosting
- **URL**: https://suleman7-dmd.github.io/dental-quest/
- **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: Single-file HTML apps (no build system, no npm)

---

## FIREBASE (CRITICAL - DON'T CHANGE)

### Config
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};
```

### PIN Authentication
```javascript
const savedPin = localStorage.getItem('dentalQuestPin');
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
userPath = 'users/' + hashedPin + '/[appName]';
// appName = 'appData' | 'stimulantCalculator' | 'd3Roadmap' | 'bodyCompTracker'
```

### Complete Data Structure
```
users/user_[hashedPin]/
├── appData/                         (index.html)
│   ├── tasks[]
│   ├── stats{ totalXP, level, streak }
│   ├── medications{
│   │     adderall30: { count, refillDate },
│   │     adderall20: { count, refillDate }
│   │   }
│   ├── calendarNotes{}
│   ├── notebook{ entries[] }
│   ├── financials{
│   │     masterLiquidity: { currentCash, semesterEndDate, targetCushion },
│   │     committedBills[],
│   │     recurringExpenses{},
│   │     monthlyPayments{ '2026-02': { paid, paidDate, label } },
│   │     creditCards[],
│   │     actionItems[]
│   │   }
│   ├── pillAssignments{}
│   ├── calendarEvents[]
│   ├── dailyPlanner{}
│   └── focusModeData{ oneThingId, todaysTasks, microSteps[] }
│
├── stimulantCalculator/             (stimulant-elimination-calculator.html)
│   ├── state{
│   │     wakeTime, sleepHours, targetBedtime,
│   │     medications[{ id, dose, time, date }],
│   │     caffeine[{ id, amount, time, date }],
│   │     modifiers{ vitaminC: { enabled, time, date }, workout: { enabled, time } },
│   │     projectedSleepTime,        ← Body Comp reads this
│   │     projectedSleepMinutes,
│   │     history[{ date, predictedSleep, actualSleep }],
│   │     allNighterMode
│   │   }
│   └── lastUpdated
│
├── d3Roadmap/                       (d3-roadmap.html)
│   ├── pedsLockedIn (default: 33.3)
│   ├── mandatoryItems{}
│   ├── grades{}
│   ├── editedDeadlines{}
│   ├── customDeadlines[]
│   ├── examStudyProgress{}
│   ├── exams[]                      ← Body Comp reads this
│   ├── monthlyPlanner{
│   │     notes[], customTasks[], overriddenStatic[], completedTasks[]
│   │   }
│   ├── clinicalData{
│   │     patients{}, appointments[], completedProcedures[],
│   │     competencies{
│   │       [category]: { name, icon, color, notes, sections[{ title, items[] }] }
│   │     }
│   │   }
│   ├── dailyPlanner{}
│   └── lastSaved
│
└── bodyCompTracker/                 (body-comp-tracker.html)
    ├── state{
    │     profile: { currentWeight_lbs, goalWeight, height_cm, height_inches, age, startingBodyFat },
    │     today: {
    │       date, sleepHours, activeCalories, isBrainDay, mode,
    │       targets: { calories, protein, carbs, floor },
    │       meals[{ id, name, calories, protein, carbs, time }],
    │       workouts[{ id, type, duration, caloriesBurned, time, date }],
    │       setupComplete, workedOut, magnesiumTaken, waterGoalMet,
    │       calTargetAwarded, proteinTargetAwarded, perfectDayAwarded,
    │       alerts: { undereatingShown, lowProteinShown }
    │     },
    │     frequentFoods[{ id, name, calories, protein, carbs, uses }],
    │     weighIns[{ date, weight, bodyFat, leanMass, fatMass }],
    │     bodyCompHistory[{ date, method, weight, bodyFat, measurements }],
    │     dailyLogs{ [date]: { ...todaySnapshot } },
    │     refeedTracker: { cumulativeDeficit, lastRefeedDate },
    │     gamification: { xp, level, streak },
    │     achievements{},
    │     ecosystemContext: { stimulant{}, inventory{}, academic{}, sleepDebt{}, schedule{} }
    │   }
    └── lastUpdated
```

### Sync Pattern
```javascript
// On load:
loadFromFirebase() → merge with defaults → initUI()

// On save:
saveData() → localStorage IMMEDIATELY → Firebase debounced (300ms-2000ms)

// On visibility change:
hidden → save immediately
visible → refresh from Firebase

// Sync status: 🟢 connected | 🔄 syncing | 🔴 offline | ⚠️ error
```

---

## SYNC PROTECTION SYSTEM (CRITICAL)

### The Data Wipe Bug (FIXED Jan 2026)
Opening any app on a fresh browser/device would wipe all cloud data because:
- Default state had `_version: Date.now()` (NEWER than cloud)
- App thought local was newer → overwrote cloud with empty data

### 9 Firebase Bulletproof Fixes (All 4 Apps)
```javascript
// Fix 1: Default _version = 0 (not Date.now())
_version: 0,
_dataLoaded: false

// Fix 2: isEmptyState() function - app-specific validation
function isEmptyState(data) {
    // Returns true if data has no real user content
}

// Fix 3: Sync protection flags
let isInitialLoad = true;
let hasLoadedFromCloud = false;
let pinValidated = false;

// Fix 4: Guards in saveData()/saveState()
if (!pinValidated) return false;
if (isInitialLoad) return false;
if (!hasLoadedFromCloud) return false;
if (isEmptyState(state)) return false;
if (!state._dataLoaded) return false;

// Fix 5: Protected loadFromFirebase()
// Sets hasLoadedFromCloud = true and isInitialLoad = false AFTER loading

// Fix 6: Protected realtime listener
// Only processes updates AFTER initial load complete

// Fix 7: Protected visibility handlers
// Only syncs if !isInitialLoad && hasLoadedFromCloud

// Fix 8: Version comparison on load
// Cloud wins if local _version === 0 or local is empty

// Fix 9: Merge strategy preserves cloud data
// Never overwrites cloud with empty local state
```

### App-Specific isEmptyState() Checks
| App | Empty If Missing ALL Of |
|-----|------------------------|
| index.html | tasks, calendarNotes, calendarEvents, notebook.entries, stats.totalXPGained, focusModeData |
| d3-roadmap | customDeadlines, grades, clinicalData, monthlyPlanner, exams |
| stim-calc | medications, caffeine, history, sleepHistory |
| body-comp | weighIns, dailyLogs, today.meals, frequentFoods |

---

## CHECKPOINT SYSTEM (All 4 Apps)

### Storage Keys
| App | localStorage Key |
|-----|-----------------|
| d3-roadmap | `d3RoadmapCheckpoints` |
| body-comp-tracker | `bodyCompCheckpoints` |
| stim-calc | `stimCalcCheckpoints` |
| index.html | File-based (.dent files) |

### Checkpoint Functions
```javascript
createCheckpoint(name)           // Save current state to localStorage
showCheckpointManager()          // Modal with list of checkpoints
restoreCheckpoint(index)         // Restore from localStorage checkpoint
deleteCheckpoint(index)          // Remove checkpoint
exportCheckpoint(index)          // Download single checkpoint as JSON
exportAllCheckpoints()           // Download full backup with metadata
importCheckpoint(event)          // Import from file (flexible format)
importAndRestoreDirectly()       // Direct file → state restore
```

### Force Sync Functions
```javascript
forceUploadToCloud()   // Local → Cloud (overwrites cloud)
forcePullFromCloud()   // Cloud → Local (overwrites local)
```

### Export Format (checkpoint_backup_v1)
```javascript
{
    _format: 'checkpoint_backup_v1',
    _app: 'app-name',
    _exportDate: 'ISO timestamp',
    currentState: { /* full state object */ },
    checkpoints: [ /* array of saved checkpoints */ ]
}
```

### Flexible Import (Accepts 6 Formats)
1. **Full backup** - `{ checkpoints: [...], currentState: {...} }`
2. **Single checkpoint** - `{ name: "...", state: {...} }`
3. **Raw data** - Direct state object with app keys
4. **Nested data** - `{ state: {...} }` or `{ data: {...} }`
5. **currentState wrapper** - `{ currentState: {...} }`
6. **App-specific wrapper** - `{ roadmapData/bodyCompData/etc: {...} }`

### UI Controls (Header)
```html
<!-- All apps have these buttons in header -->
💾 Checkpoint     - createCheckpoint()
📂 Restore        - showCheckpointManager()
☁️⬆️ Force Upload - forceUploadToCloud()
☁️⬇️ Force Pull   - forcePullFromCloud()
```

---

## BODY COMP TRACKER v3

### Cross-App Integration (READ-ONLY pulls)
```
Source App              | Firebase Path                          | Data Pulled
------------------------|----------------------------------------|---------------------------
Stimulant Calculator    | /stimulantCalculator/state             | sleepHours, wakeTime, medications, caffeine, projectedSleepTime
Dental Quest            | /appData/medications                   | 30mg count, 20mg count, refill dates
D3 Roadmap              | /d3Roadmap/exams                       | exam schedule for "exam week" detection
D3 Roadmap              | /d3Roadmap/monthlyPlanner              | today's schedule for eating windows
```

### Ecosystem Context Structure
```javascript
state.ecosystemContext = {
    stimulant: {
        sleepHours, wakeTime, lastAdderallTime, lastAdderallDose,
        totalAdderallToday, isBooster, lastCaffeineTime, caffeineMg,
        projectedSleepTime, lastSynced
    },
    inventory: {
        pills30mg, pills20mg, refillDate30mg, refillDate20mg,
        daysUntilRefill, willRunOut, lastSynced
    },
    academic: {
        nextExam, daysUntilExam, upcomingExams[], lastSynced
    },
    sleepDebt: {
        last7Days[], totalSleep, avgSleep, weeklyDebt,
        consecutiveBadNights, severity  // LOW | MODERATE | HIGH | SEVERE
    },
    schedule: {
        todayTasks[], blockedWindows[], eatingWindows[],
        totalEatingHours, frontLoadRequired, scheduleIntensity
    }
};
```

### Mode System
| Sleep Hours | Mode | Deficit | Training |
|-------------|------|---------|----------|
| 6+ hrs | GREEN | 500 cal | Normal |
| 5-6 hrs | YELLOW | 300 cal | Light |
| <5 hrs | ORANGE | 0 (maintenance) | Recovery only |

**Sleep Debt Overrides:**
- SEVERE debt → Forces ORANGE mode
- HIGH debt → Bumps GREEN → YELLOW

### Gym Streak Logic
```javascript
// Collect all workout dates (today + dailyLogs where workedOut=true)
// Sort newest first, count consecutive days (dayDiff === 1)
// If most recent workout was 2+ days ago, streak = 0
getWorkoutRecommendation() → { info, recommendation, color, gymStreak, daysSinceWorkout }
```

### Default Frequent Foods (26 items)
```javascript
getDefaultFrequentFoods() // Returns array with:
// Just Bare Chicken 6oz/3oz, Vital Farms Eggs, Salmon Patty,
// Orgain Shakes, Oikos Yogurt, Chipotle bowls, Rice, Banana,
// Peanut butter, Almonds, Trail mix, Bread, etc.
```

### Key Functions
```javascript
loadEcosystemData(hashedPin)     // Pulls from all 3 Firebase sources
renderSimpleView()               // Main dashboard render
getSimpleStatus()                // { icon, label, message, color }
getEatingNudge()                 // Stimulant-aware eating recommendation
getWorkoutRecommendation()       // Sleep-based workout advice + gym streak
autoStartDay()                   // Auto-setup using ecosystem data
generateLogicLog()               // 9-section diagnostic output
saveDayLog()                     // Save to dailyLogs[date]
openQuickMealModal()             // Fast meal logging
openWeeklyExportModal()          // Weekly Claude check-in export
openBodyCompModal()              // Navy method / scale body comp
```

---

## STIMULANT CALCULATOR

### XR Pharmacokinetics
```javascript
// 50% immediate release at dose time
// 50% delayed release at T+4 hours
// Decay formula:
remaining = dose × 0.5^(elapsed_hours / half_life)
```

### Default Parameters
- Amphetamine half-life: 12 hours (user setting: 11)
- Sleep threshold: 15mg
- Caffeine half-life: 5 hours
- Caffeine threshold: 25mg

### Vitamin C Effect
- Reduces amphetamine half-life to 70% of normal (12h → 8.4h)
- Only applies AFTER the specified time

### Circadian Rhythm (Process C)
- Forbidden Zone: 13-15 hours after wake (peak alertness, blocks sleep)
- Sleep Gate: 15-17 hours after wake (optimal sleep window)

---

## GRADE CALCULATOR (d3-roadmap)

### Formula (BULLETPROOF - DON'T CHANGE)
```javascript
// For each course component with a grade entered:
earnedPoints += (parseFloat(grade) / 100) * comp.weight;
completedWeight += comp.weight;

// For components without grades:
remainingWeight += comp.weight;

// Calculate needed average:
const pointsNeeded = targetGrade - earnedPoints;
const avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;
```

### Peds Verification Example
- Locked in: 33.3 pts (Exam 1: 77% × 40% + Headstart: 100% × 2.5%)
- Remaining: 57.5% (Exam 2: 45% + Exam 3: 7.5% + Ortho Module: 5%)
- To get 70%: need (70-33.3)/57.5 × 100 = **63.83%** avg
- To get 80%: need (80-33.3)/57.5 × 100 = **81.22%** avg

### Passing Thresholds
- Most courses: 60%
- **Perio 2: 65%** (higher - don't forget!)

---

## FINANCIALS SYSTEM (index.html)

### Data Structure
```javascript
financials = {
    masterLiquidity: {
        currentCash: 0,              // Actual checking balance
        lastUpdated: null,
        semesterEndDate: '2026-05-14', // Next disbursement
        targetCushion: 2285          // Goal on May 14
    },
    committedBills: [{ id, name, amount, type, paid, dueDate }],
    recurringExpenses: {
        rent: { amount: 1280, category: 'housing' },
        // ... other monthly expenses
    },
    monthlyPayments: {
        '2026-02': { paid: false, paidDate: null, label: 'February 2026' },
        '2026-03': { paid: false, paidDate: null, label: 'March 2026' },
        '2026-04': { paid: false, paidDate: null, label: 'April 2026' },
        '2026-05': { paid: false, paidDate: null, label: 'May 1-14', partial: true, fraction: 0.45 }
    },
    creditCards: [],
    actionItems: []
};
```

### Projection Calculation
```javascript
// 1. Start with actual cash
// 2. Add/subtract unpaid one-time bills
// 3. Subtract ONLY unchecked months' expenses
// projectedBalance = availableCash - unpaidMonthsTotal
// Health: GREEN (>= cushion) | YELLOW (> 0) | RED (< 0)
```

---

## SULLY CONTEXT

### Profile
- **Name**: Sully
- **School**: Boston University Goldman School of Dental Medicine
- **Year**: D3 (third-year), graduating May 2027
- **ADHD**: Adderall XR 50mg max (30mg + 20mg separate pills)
- **Coding**: ZERO experience - Claude built everything

### Physical Stats
- Height: 5'8.5" (174 cm / 68.5 inches)
- Current Weight: 190 lbs
- Goal Weight: 170 lbs by June 1, 2026
- Starting Body Fat: ~27%

### Spring 2026 Critical Dates
**February (5 EXAMS):**
- Feb 2: PC2 Midterm (30%)
- Feb 6: Ortho Final (50%)
- Feb 11: Geriatrics Midterm
- **Feb 18: PEDS EXAM 2 (45%) - SURVIVAL EXAM**
- Feb 27: Oral Med Midterm (25%)

**March:**
- Mar 11: Perio 2 Final (45%)
- Mar 19: PC2 Final (40%)
- Mar 30: Peds Exam 3 (7.5%)

**May 14**: Next loan disbursement

### Peds At-Risk Status
- Scored 77% on Exam 1 (40% of grade)
- Locked in: 33.3 points
- Needs ~80%+ on Exam 2 to be comfortable

---

## QUICK REFERENCE

### Sync Issues Checklist
1. Check `forceCloudSync()` exists and is called
2. Check `updateSyncStatus()` exists
3. Verify Firebase config matches exactly
4. Check for orphan function calls (function called but not defined)
5. Check visibility change handlers
6. **Verify sync protection flags exist** (`isInitialLoad`, `hasLoadedFromCloud`, `pinValidated`)
7. **Verify guards in saveData/saveState** (all 5 guards must be present)
8. **Verify `_version: 0` in default state** (NOT `Date.now()`)

### Things NOT to Change Without Testing
- Firebase config
- PIN authentication pattern
- Save/sync debounce logic
- Grade calculator math
- XR pharmacokinetic model (50/50 split at T+0/T+4)
- Date parsing (MUST use local timezone)
- **Sync protection guards** (prevents data wipe)
- **isEmptyState() logic** (app-specific validation)
- **Checkpoint system functions**

### Common Bugs to Avoid
1. **Double loadData() calls** - causes race conditions
2. **UTC date parsing** - causes off-by-one errors
3. **Missing Firebase field checks** - always use defaults
4. **Empty array truthy** - `[]` is truthy, check `.length`
5. **Orphan function calls** - verify function exists before calling
6. **_version: Date.now() in defaults** - causes data wipe on fresh device
7. **Saving before pinValidated** - causes race condition data wipe
8. **Saving before hasLoadedFromCloud** - overwrites cloud with empty data

### Cross-App Data Reads (Body Comp → Other Apps)
Body Comp reads FROM Firebase directly (READ-ONLY):
- If source app gets wiped, Body Comp reads empty ecosystem data
- Body Comp's core data (meals, workouts, weight) is NEVER affected
- Worst case: empty ecosystem context, not data loss

---

## CRASH OUT MODE FIXES (Jan 31, 2026)

### Task Rearranging Fix
**Problem**: Drag-drop and up/down buttons used same INSERT logic, causing confusion
**Fix**:
- Created `swapAdjacentTasks()` for up/down buttons (SWAP logic)
- Kept `reorderTimelineTasks()` for drag-drop (INSERT logic)
- Location: index.html lines 17000-17060

### Push Dialog & Skip Behavior Fix
**Problem**: Skip removed tasks entirely; prompts reappeared every 30 seconds
**Fix**:
- `skippedTasks` object tracks dismissed prompts by task ID + time
- `skipTask()` now just dismisses (task stays in schedule)
- Added `removeTaskFromSchedule()` for actual removal
- Renamed button "Skip" → "Dismiss", added separate "Remove" button
- Clear `skippedTasks` when pushing (new times = fresh prompts)
- Location: index.html lines 16455-16670

### Confirm Begin Task Toggle
**Problem**: No explicit confirmation task was started; timer didn't auto-start
**Fix**:
- Added `confirmedStarted` flag to session data
- `startTaskFromPrompt()` auto-starts timer
- Prompts won't appear while task is confirmed started
- Location: index.html lines 17300-17330

### Task Completion Counting Fix
**Problem**: Crash out tasks didn't count in dashboard progress
**Fix**:
- `sendToCrashOut()` now sets `doToday: true`
- `completeTriageTask()` preserves `doToday: true` and adds `completedAt` timestamp
- Uses proper spread pattern for Firebase safety
- Location: index.html lines 16030-16145

### Pill Counter Auto-Reduce
**Problem**: Pills only reduced on manual click, not daily
**Fix**:
- Added `lastAutoReduceDate`, `lastManualChange`, `lastManualChangeType` to medication structure
- `checkAndApplyDailyPillReduce()` runs on app load
- Auto-reduces for each day missed (catch-up for multi-day gaps)
- Added "Last Manual Change" display with `getTimeAgo()` helper
- Location: index.html lines 8453-8470, 10538-10790

---

## D3 ROADMAP DEADLINE SYNC FIX (Jan 31, 2026)

### Deadline Sync Bug Fix
**Problem**: `completedDeadlines` used array INDEX as key; indices shift when custom deadlines added
**Fix**:
- Created `getDeadlineId()` for stable IDs based on deadline properties
- `submitDeadlineGrade()` stores by stable ID, not index
- `toggleDeadlineDone()` deletes by stable ID
- `initUI()` matches by stable ID first, falls back to property matching for legacy data
- Custom deadlines preserve their `id` property during array push
- Location: d3-roadmap.html lines 9480-9490, 11994-12100, 15140-15170

### Force Upload Diagnostics
**Problem**: Generic "sync failure" error with no debugging info
**Fix**:
- Added console diagnostics for `firebaseSyncEnabled`, `database`, `userPath`, `pinValidated`
- Specific error messages for each failure case
- Alert dialog with troubleshooting steps
- Same improvements to `forcePullFromCloud()`
- Location: d3-roadmap.html lines 10594-10680

---

## COMMIT HISTORY (Jan 2026 Sync Fixes)

| Commit | Description |
|--------|-------------|
| `62f1ba4` | Firebase Bulletproof Fix: index.html - All 9 fixes |
| `8940b3d` | Firebase Bulletproof Fix: body-comp-tracker.html - All 9 fixes |
| `9f14ed9` | Firebase Bulletproof Fix: d3-roadmap.html - All 9 fixes |
| `a3b7731` | Critical Sync Fix: Prevent data wipe on fresh device/browser |
| `b9c894a` | Add Checkpoint System + PIN Guards to d3-roadmap.html |
| `4d74819` | Add Checkpoint System + PIN Guards to body-comp-tracker.html |
| `7ff8328` | Add Checkpoint System + PIN Guards to stimulant-elimination-calculator.html |
| `d05d689` | Add PIN Guards + Force Upload/Pull to index.html |
| `d896952` | Flexible import: accept raw data, nested formats, and backups |

---

## D3 ROADMAP SAVE FIX (Jan 31, 2026)

### Root Cause: _dataLoaded Flag Being Wiped
**Problem**: Saves blocked permanently because `_dataLoaded`, `hasLoadedFromCloud`, `isInitialLoad` flags weren't properly set in all code paths

### Fix 1: loadFromLocalStorage() Parameter
```javascript
// Added finalize parameter (default=true)
function loadFromLocalStorage(finalize = true) {
    // ... load data ...
    roadmapData._dataLoaded = true;  // ALWAYS set

    if (finalize) {
        hasLoadedFromCloud = true;
        isInitialLoad = false;
        initUI();
    }
}
```
- `finalize=true`: Terminal path (no Firebase) - sets all flags
- `finalize=false`: Called from loadFromFirebase, caller handles flags

### Fix 2: Realtime Sync Preserves _dataLoaded
```javascript
// After realtime merge, explicitly preserve flag:
roadmapData._dataLoaded = true;
```

### Fix 3: Force Upload Prompt Clarity
- Changed prompt to: "Type UPLOAD (in capital letters) to confirm:"
- Separate handling for Cancel vs wrong text
- Shows specific error: "Cancelled - you must type UPLOAD exactly"

### Fix 4: Diagnostic Logging in saveData()
```javascript
console.log('💾 saveData() called - Guard status:', {
    isInitialLoad,
    hasLoadedFromCloud,
    _dataLoaded: roadmapData._dataLoaded,
    firebaseSyncEnabled,
    pinValidated,
    isEmpty: isEmptyState(roadmapData)
});
```

---

## STIMULANT CALCULATOR FIXES (Jan 31, 2026)

### All-Nighter Mode Save Fix
**Problem**: `getDefaultState()` was undefined; `isEmptyState()` blocked saves when only allNighterMode was set

**Fix**:
- Added `getDefaultState()` function returning proper default state
- Modified `isEmptyState()` to return false when `allNighterMode=true` or `_dataLoaded=true`

---

## BODY COMP TRACKER FIXES (Jan 31, 2026)

### Missing getDefaultState()
- Added `getDefaultState()` function at line 6808

### Calendar Legend
- Added blue "good" (Deficit hit) status to legend

### Streak Display Fix
- Changed from showing gym streak to showing daily completion streak (`gam.streak`)

### Streak Updates
- Added `updateStreak()` calls after meal logging and day setup

### All-Nighter Mode Tracking
- Added `allNighterMode` to ecosystem context for cross-app awareness

---

## CRASH OUT TASK ORDERING FIXES (Jan 31, 2026)

### New Positioning Buttons
- **⬆⬆ Move to Top** - `moveTaskToTop(taskId)`
- **⬇⬇ Move to Bottom** - `moveTaskToBottom(taskId)`
- **# Set Position** - `promptTaskPosition(taskId)` - user enters 1-N

### Insert Index Bug Fix
```javascript
// BEFORE (broken):
const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;

// AFTER (fixed):
const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
```

### Reordering Lock
- Added `isReorderingLocked` flag to `moveTaskToPosition()`
- 200ms cooldown prevents rapid double-moves
- Proper unlock on early returns

### Functions Added
```javascript
moveTaskToTop(taskId)      // Move to position 0
moveTaskToBottom(taskId)   // Move to last position
setTaskPosition(taskId, n) // Set exact 1-indexed position
promptTaskPosition(taskId) // Prompt user for position
swapAdjacentTasks(a, b)    // For ▲/▼ buttons (SWAP logic)
moveTaskToPosition(a, b)   // For drag-drop (INSERT logic)
```
