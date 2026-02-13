# PIN Auth, Data Patterns & Cross-App Integration

## Table of Contents
- [PIN Authentication Flow](#pin-authentication-flow)
- [Data Structure Patterns](#data-structure-patterns) (object-based storage, generateId, safe iteration helpers)
- [localStorage Keys Per App](#localstorage-keys-per-app)
- [Cross-App Data Reads](#cross-app-data-reads-body-comp--other-apps)
- [ecosystemContext Structure](#ecosystemcontext-structure-body-comp-state)
- [Complete Firebase Data Structure](#complete-firebase-data-structure)

---

## PIN Authentication Flow

### Shared Across All Apps
```javascript
// localStorage key (shared by all apps):
const savedPin = localStorage.getItem('dentalQuestPin');

// Hash function (identical in all apps):
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');

// Firebase path per app:
userPath = 'users/' + hashedPin + '/appData';              // index.html
userPath = 'users/' + hashedPin + '/stimulantCalculator';   // stim-calc
userPath = 'users/' + hashedPin + '/d3Roadmap';             // d3-roadmap
userPath = 'users/' + hashedPin + '/bodyCompTracker';       // body-comp
```

### PIN Prompt Patterns

| App | PIN Function | Skip/Offline Path |
|-----|-------------|-------------------|
| index.html | Inline prompt (line 13912) | No standalone skipPin(); handles failure in loadDataFromFirebase fallback (line 14003) |
| d3-roadmap | `promptForPin()` (line 9504) | Inline: sets `firebaseSyncEnabled=false`, calls `loadFromLocalStorage()` |
| stim-calc | PIN prompt modal | `skipPin()` (line 9350) — correctly sets all 4 guard flags |
| body-comp | PIN prompt modal | `skipPin()` (line 16624) — BUG: missing guard flags |

### Firebase Config (Same for All Apps)
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

---

## Data Structure Patterns

### Object-Based Storage (Never Arrays)

Firebase converts sparse arrays to objects (e.g., `[undefined, undefined, item]` → `{2: item}`). All apps use object-keyed collections:

```javascript
// CORRECT: Object with generated IDs
state.tasks = {
    'task_1707123456_abc': { name: 'Study', ... },
    'task_1707123457_def': { name: 'Lab', ... }
};

// WRONG: Array (Firebase corrupts these)
state.tasks = [
    { name: 'Study', ... },
    { name: 'Lab', ... }
];
```

### generateId() Pattern (All 4 Apps)
```javascript
function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```
- index.html line 12462
- d3-roadmap line 9530
- stim-calc line 3258
- body-comp line 7670

### Safe Iteration Helpers

```javascript
// getValues(obj) — safe Object.values() that handles arrays, null, undefined
function getValues(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection;
    if (typeof collection === 'object') return Object.values(collection);
    return [];
}

// getCount(obj) — safe length/size counting
function getCount(collection) {
    if (!collection) return 0;
    if (Array.isArray(collection)) return collection.length;
    if (typeof collection === 'object') return Object.keys(collection).length;
    return 0;
}

// ensureArray(val) — Firebase array recovery
function ensureArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [val];
}

// migrateArrayToObject(data, prefix) — convert corrupted arrays to ID-keyed objects
function migrateArrayToObject(data, prefix) {
    if (!data) return {};
    if (Array.isArray(data)) {
        const obj = {};
        data.forEach(item => {
            if (item) obj[generateId(prefix)] = item;
        });
        return obj;
    }
    return data;  // Already an object
}
```

---

## localStorage Keys Per App

| App | State Key | Checkpoint Key |
|-----|-----------|---------------|
| index.html | `dentalQuestState` (or per-field) | `dentalQuest_checkpoints_{hashedPin}` |
| d3-roadmap | `d3RoadmapData` | `d3RoadmapCheckpoints` |
| stim-calc | `stimCalcState` | `stimCalcCheckpoints` |
| body-comp | `bodyCompTrackerState` | `bodyCompCheckpoints` |

Shared: `dentalQuestPin` (PIN storage, used by all 4 apps)

---

## Cross-App Data Reads (Body Comp → Other Apps)

Body comp is the ONLY app that reads from other apps' Firebase paths. All reads are READ-ONLY.

### loadEcosystemData(hashedPin) — line 16211

```javascript
async function loadEcosystemData(hashedPin) {
    // 1. Read stimulant calculator data
    const stimRef = database.ref('users/' + hashedPin + '/stimulantCalculator/state');
    // Extracts: sleepHours, wakeTime, medications, caffeine, projectedSleepTime

    // 2. Read dental quest medications
    const medsRef = database.ref('users/' + hashedPin + '/appData/medications');
    // Extracts: adderall30.count, adderall20.count, refill dates

    // 3. Read d3 roadmap exams
    const examsRef = database.ref('users/' + hashedPin + '/d3Roadmap/exams');
    // Extracts: exam schedule for "exam week" detection
}
```

### ecosystemContext Structure (body-comp state)
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
    },
    examDay: { isExamDay, examName, examTime },
    stimulantEffect: { currentLevel, peakTime, wearOffTime }
};
```

### ecosystemContext on Save
Body comp **strips `ecosystemContext` before Firebase upload** (line 15163):
```javascript
const stateToSave = { ...state };
delete stateToSave.ecosystemContext;
```
This prevents cross-app data from being written back. On load, ecosystemContext is re-populated from live Firebase reads.

### Live Monitoring
- `setupStimulantRealtimeListener()` — watches `/stimulantCalculator/state` for real-time stimulant changes
- `startEcosystemRefresh()` — polls all 3 sources every 60 seconds

### Failure Mode
If a source app's data is wiped/empty, body comp reads empty ecosystem context. Core body comp data (meals, workouts, weight) is NEVER affected. Worst case: empty ecosystem hints, not data loss.

---

## Complete Firebase Data Structure

```
users/user_[hashedPin]/
├── appData/                          (index.html)
│   ├── tasks{}                       // Object-keyed
│   ├── stats{ totalXP, level, streak }
│   ├── medications{ adderall30: {count, refillDate}, adderall20: {...} }
│   ├── calendarNotes{}
│   ├── calendarEvents{}              // Object-keyed
│   ├── notebook{ entries{} }
│   ├── financials{ masterLiquidity, committedBills{}, recurringExpenses{},
│   │               monthlyPayments{}, creditCards{}, actionItems{} }
│   ├── pillAssignments{}
│   ├── dailyPlanner{}
│   ├── focusModeData{ oneThingId, todaysTasks, microSteps{} }
│   ├── commandCenterData{}
│   ├── pomodoroSettings{}
│   └── lastUpdated
│
├── stimulantCalculator/              (stim-calc)
│   ├── state{
│   │     wakeTime, sleepHours, targetBedtime,
│   │     medications{}, caffeine{}, modifiers{},
│   │     projectedSleepTime, projectedSleepMinutes,
│   │     history{}, allNighterMode,
│   │     _version: 0, _dataLoaded: false
│   │   }
│   └── lastUpdated
│
├── d3Roadmap/                        (d3-roadmap)
│   ├── pedsLockedIn
│   ├── mandatoryItems{}
│   ├── grades{}
│   ├── editedDeadlines{}
│   ├── customDeadlines{}             // Object-keyed
│   ├── examStudyProgress{}
│   ├── exams{}                       // Object-keyed
│   ├── monthlyPlanner{ notes{}, customTasks{}, overriddenStatic{}, completedTasks{} }
│   ├── clinicalData{ patients{}, appointments{}, completedProcedures{}, competencies{} }
│   ├── dailyPlanner{}
│   ├── lastSaved
│   ├── _version: 0
│   └── _dataLoaded: false
│
└── bodyCompTracker/                  (body-comp)
    ├── state{
    │     profile{}, today{ meals{}, workouts{}, ... },
    │     frequentFoods{}, weighIns{}, bodyCompHistory{},
    │     dailyLogs{ 'YYYY-MM-DD': { ...snapshot } },
    │     refeedTracker{}, gamification{ badges{} }, achievements{},
    │     _version: 0, _dataLoaded: false
    │     // ecosystemContext is NOT saved to Firebase
    │   }
    └── lastUpdated
```
