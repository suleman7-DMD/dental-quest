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

### Things NOT to Change Without Testing
- Firebase config
- PIN authentication pattern
- Save/sync debounce logic
- Grade calculator math
- XR pharmacokinetic model (50/50 split at T+0/T+4)
- Date parsing (MUST use local timezone)

### Common Bugs to Avoid
1. **Double loadData() calls** - causes race conditions
2. **UTC date parsing** - causes off-by-one errors
3. **Missing Firebase field checks** - always use defaults
4. **Empty array truthy** - `[]` is truthy, check `.length`
5. **Orphan function calls** - verify function exists before calling
