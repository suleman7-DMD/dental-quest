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

---

## PROJECT OVERVIEW

### Files
| File | Purpose |
|------|---------|
| `index.html` | Main app: Focus Mode, tasks, financials, calendar, medications |
| `d3-roadmap.html` | Academic tracker: grades, deadlines, clinical competencies |
| `stimulant-elimination-calculator.html` | Sleep prediction, caffeine/Adderall modeling |
| `body-comp-tracker.html` | Calorie/protein tracking with cross-app integration |
| `lecture-prompt-transformer.html` | Lecture notes prompt builder |

### Hosting
- **URL**: https://suleman7-dmd.github.io/dental-quest/
- **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: Single-file HTML apps (no build system)

---

## FIREBASE (CRITICAL)

### Config (SAME across all apps - DON'T CHANGE)
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
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
userPath = 'users/' + hashedPin + '/[appName]';
// appName = 'appData' | 'stimulantCalculator' | 'd3Roadmap' | 'bodyCompTracker'
```

### Data Structure
```
users/user_[hashedPin]/
├── appData/                    (index.html)
├── stimulantCalculator/        (stimulant calculator)
│   └── state { projectedSleepTime, medications[], caffeine[], ... }
├── d3Roadmap/                  (d3-roadmap.html)
│   └── { exams[], monthlyPlanner{}, clinicalData{}, ... }
└── bodyCompTracker/            (body-comp-tracker.html)
    └── state { today{}, ecosystemContext{}, dailyLogs{}, ... }
```

### Sync Pattern
```javascript
// On save: localStorage IMMEDIATELY → Firebase debounced (300ms-2000ms)
// On visibility change: hidden → save | visible → refresh
// Status: 🟢 connected | 🔄 syncing | 🔴 offline
```

---

## BODY COMP TRACKER (v3)

### Cross-App Integration
Body Comp Tracker pulls READ-ONLY data from other apps:
- **Stimulant Calculator**: sleepHours, projectedSleepTime, medications, caffeine
- **Dental Quest**: pill inventory (30mg/20mg counts, refill dates)
- **D3 Roadmap**: exam schedule for "exam week" detection

### Mode System
| Sleep | Mode | Deficit |
|-------|------|---------|
| 6+ hrs | GREEN | Full deficit (500 cal) |
| 5-6 hrs | YELLOW | Reduced deficit |
| <5 hrs | ORANGE | Maintenance only |

### Gym Streak Logic
- Tracks consecutive workout days from `dailyLogs`
- If most recent workout was 2+ days ago, streak resets to 0
- `getWorkoutRecommendation()` returns `{ info, recommendation, color, gymStreak, daysSinceWorkout }`

### Key Functions
- `loadEcosystemData()` - Pulls from all 3 Firebase sources
- `renderSimpleView()` - Main dashboard
- `getWorkoutRecommendation()` - Sleep-based workout advice
- `generateLogicLog()` - Diagnostic output (9 sections)

---

## STIMULANT CALCULATOR

### XR Pharmacokinetics
- 50% immediate release at dose time
- 50% delayed release at T+4 hours
- Decay: `remaining = dose × 0.5^(elapsed_hours / half_life)`

### Defaults
- Amphetamine half-life: 12 hours (11 in settings)
- Sleep threshold: 15mg
- Caffeine half-life: 5 hours
- Caffeine threshold: 25mg

### Vitamin C Effect
- Reduces amphetamine half-life to 70% of normal
- Only applies AFTER the specified time

---

## GRADE CALCULATOR (d3-roadmap)

### Formula (DON'T CHANGE)
```javascript
// Earned points
earnedPoints += (parseFloat(grade) / 100) * comp.weight;
// Needed average
const avgNeeded = (targetGrade - earnedPoints) / remainingWeight * 100;
```

### Peds Example
- Locked in: 33.3 pts (Exam 1: 77% × 40% + Headstart: 2.5%)
- To get 80%: need (80-33.3)/57.5 × 100 = **81.22%** avg

### Passing Thresholds
- Most courses: 60%
- **Perio 2: 65%** (higher!)

---

## SULLY CONTEXT

### Profile
- D3 dental student at BU, graduating May 2027
- ADHD: Adderall XR 50mg max (30mg + 20mg)
- Height: 5'8.5" (174 cm), Weight: 190 lbs, Goal: 170 lbs

### Spring 2026 Critical Dates
- **Feb 2**: PC2 Midterm
- **Feb 18**: PEDS EXAM 2 (45%) - survival exam
- **May 14**: Next loan disbursement

### Physical Stats (Body Comp Tracker)
- Height: 68.5 inches (for Navy method)
- Starting body fat: ~27%
- Target date: June 1, 2026

---

## QUICK REFERENCE

### Empty Array Bug (JavaScript)
```javascript
// WRONG - empty array is truthy!
const foods = loadedFoods || defaults;  // [] || defaults = []

// CORRECT - check length
const foods = loadedFoods?.length > 0 ? loadedFoods : defaults;
```

### Sync Issues
1. Check `forceCloudSync()` exists
2. Check `updateSyncStatus()` exists
3. Verify Firebase config matches
4. Check for orphan function calls

### Things NOT to Change
- Firebase config
- PIN authentication pattern
- Grade calculator math
- XR pharmacokinetic model (50/50 split)
- Date parsing (use local timezone)
