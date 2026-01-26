# CLAUDE.md - Dental Student Quest

## CRITICAL WORKFLOW RULES (READ FIRST!)

### NEVER REBUILD ENTIRE FILES
- Files are 9,000-10,000+ lines each
- Rebuilding causes token explosions and breaks things
- ALWAYS use `str_replace` for surgical, targeted edits ONLY

### str_replace Workflow (FOLLOW EXACTLY)
```
1. FIND the exact code block to change (use grep/view to locate)
2. COPY the exact existing code (old_str must match EXACTLY including whitespace)
3. WRITE the replacement code (new_str)
4. Use str_replace tool with:
   - path: /home/claude/[filename].html
   - old_str: [exact existing code]
   - new_str: [replacement code]
5. VERIFY the edit worked (view the changed section)
```

### str_replace Rules
- `old_str` must be UNIQUE in the file (appears exactly once)
- Include enough context (surrounding lines) to ensure uniqueness
- Preserve exact indentation and whitespace
- If str_replace fails with "not found", the string doesn't match exactly - recheck spacing/characters

### File Handling Workflow
```
1. Copy file from /mnt/project/ or user upload → /home/claude/
2. Make ALL edits with str_replace (multiple calls if needed)
3. Copy final file to /mnt/user-data/outputs/
4. Use present_files tool to deliver
5. Provide deployment steps (below)
```

### Deployment Steps (Give These EVERY Time)
```
1. Download the file from the link above
2. Go to github.com/suleman7-DMD/dental-quest
3. Click on the file → pencil icon
4. Select ALL (Cmd+A / Ctrl+A) → Delete
5. Paste new code (Cmd+V / Ctrl+V)
6. Scroll down → Click "Commit changes"
7. Wait for green checkmark (1-2 minutes)
8. Hard refresh the live site: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## WHO IS SULLY (The User)

### Personal Context
- **Name**: Sully
- **Age**: 29, turning 30 in January 2025
- **Location**: Boston (originally from Naperville, Chicago area)
- **School**: Boston University Goldman School of Dental Medicine
- **Year**: D3 (third-year dental student), graduating May 2027
- **Class Rank**: ~90/110, 3.5 GPA
- **ADHD**: Managed with Adderall XR (45mg max daily: 30mg + 20mg)
- **Coding Experience**: ZERO - Claude has built this entire project through iterative guidance

### Academic Situation (Spring 2026)
- **At-Risk Course**: Pediatric Dentistry (Peds) - scored 77% on Exam 1 (40% of grade)
- **Locked-in Points**: 33.3 pts in Peds (Exam 1: 30.8 + Headstart: 2.5)
- **Critical Exam**: Peds Exam 2 on Feb 18 (45% of grade) - needs ~80%+ to be comfortable
- **Brutal Month**: February 2026 has 5 exams

### Personal Challenges (Why This App Matters)
- **"Demonic Three"** destructive patterns to avoid:
  1. High-risk trading
  2. Relationship rumination
  3. Social isolation
- **Core Principle**: "Action precedes hope" - movement breaks functional freeze
- **Recovery Mode**: Recovering from financial crisis
- The app helps prevent spiraling by keeping everything organized in one place

---

## PROJECT ARCHITECTURE

### Hosting & Deployment
- **URL**: https://suleman7-dmd.github.io/dental-quest/
- **Hosting**: GitHub Pages
- **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: Single-file HTML apps with embedded CSS/JS (NO build system, NO npm, NO tests)

### Files (Current Versions - Updated Jan 26, 2026)
| File | Lines | Size | Purpose |
|------|-------|------|---------|
| `index.html` | ~10,500 | ~458KB | Main app: Focus Mode (1-3-5 rule), tasks/XP, dashboard, financials, notebook, calendar, medications, pomodoro |
| `d3-roadmap.html` | ~13,700 | ~628KB | Academic tracker: 7+ tabs, Clinical Tab with Competencies, Peds AT RISK, grade calculator, deadlines, monthly planner |
| `stimulant-elimination-calculator.html` | ~10,600 | ~523KB | Pharmacokinetic sleep prediction: Process S + Process C circadian modeling, caffeine tracking, sleep debt, workout planner |
| `lecture-prompt-transformer.html` | ~2,800 | ~119KB | Standalone tool: Transform lecture content for Claude study assistance |
| `body-comp-tracker.html` | **~11,200** | ~480KB | **v3 GOD MODE COMPLETE**: 9 predictive intelligence features, cross-app Firebase integration, schedule-aware eating, exam day protocol, sleep debt tracking, stimulant modeling, logic transparency |

### Working Directory
- Files should be copied to `/home/claude/` for editing
- Output to `/mnt/user-data/outputs/` for delivery
- Use `present_files` tool to give user download link

### External Documentation
- **Local Project Path**: `/Users/suleman/coding-projects/dental-quest/`
- **Body Comp v3 Specification**: Detailed consultant spec document exists in project folder (separate from this file)
- Check project folder for any additional planning/specification documents

---

## FIREBASE CONFIGURATION

### Config (SAME Across All 3 Apps - DON'T CHANGE)
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

### PIN Authentication (SAME Across All Apps)
```javascript
// All apps share the same PIN stored in localStorage
const savedPin = localStorage.getItem('dentalQuestPin');
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
userPath = 'users/' + hashedPin + '/[appName]';
// appName = 'appData' | 'stimulantCalculator' | 'd3Roadmap'
```

### Firebase Data Structure
```
users/user_[hashedPin]/
├── appData/                    (index.html)
│   ├── tasks[]
│   ├── stats{}
│   ├── medications{}           ← Body Comp Tracker READS this for pill inventory
│   ├── calendarNotes{}
│   ├── notebook{}
│   ├── financials{}
│   │   ├── masterLiquidity{}
│   │   ├── committedBills[]
│   │   ├── recurringExpenses{}
│   │   ├── monthlyPayments{}    ← tracks Feb/Mar/Apr/May paid status
│   │   ├── creditCards[]
│   │   └── actionItems[]
│   ├── pillAssignments{}
│   ├── calendarEvents[]
│   ├── dailyPlanner{}
│   └── focusModeData{}
├── stimulantCalculator/        (stimulant-elimination-calculator.html)
│   ├── state{}
│   │   ├── ...existing fields...
│   │   ├── projectedSleepTime   ← NEW (v34): String like "11:45 PM"
│   │   └── projectedSleepMinutes ← NEW (v34): Raw minutes for calculations
│   └── lastUpdated
├── d3Roadmap/                  (d3-roadmap.html)
│   ├── pedsLockedIn (default: 33.3)
│   ├── mandatoryItems{}
│   ├── grades{}
│   ├── editedDeadlines{}
│   ├── customDeadlines[]
│   ├── examStudyProgress{}
│   ├── exams[]                  ← NEW (v34): Synced from static exams array
│   ├── monthlyPlanner{}
│   │   ├── notes[]
│   │   ├── customTasks[]
│   │   ├── overriddenStatic[]
│   │   └── completedTasks[]
│   ├── clinicalData{}           ← (v31)
│   │   ├── patients{}
│   │   ├── appointments[]
│   │   ├── completedProcedures[]
│   │   └── competencies{}       ← All graduation requirements
│   ├── dailyPlanner{}
│   └── lastSaved
└── bodyCompTracker/            (body-comp-tracker.html) ← NEW (v34)
    ├── state{}
    │   ├── today{}              ← Daily tracking (date, calories, protein, meals[], workouts[])
    │   ├── ecosystemContext{}   ← Cross-app data (stimulant, inventory, academic)
    │   ├── history[]            ← Historical daily records
    │   ├── gamification{}       ← XP, level, achievements
    │   └── settings{}           ← User preferences, targets
    └── lastUpdated
```

### Sync Pattern (CRITICAL - DON'T BREAK)
```javascript
// On load:
loadFromFirebase() → merge with defaults → initUI()

// On save:
saveData() → localStorage IMMEDIATELY → Firebase debounced (300ms)

// On visibility change:
hidden → save immediately to both
visible → refresh from Firebase

// On beforeunload:
save immediately

// Sync status indicators:
🟢 connected | 🔄 syncing | 🔴 offline | ⚠️ error | ⏳ connecting
```

### Sync Functions (All 3 Apps Have These Now)
- `updateSyncStatus(status, message)` - Updates UI indicator
- `forceCloudSync()` - Manual refresh button, fetches ALL data from Firebase
- `setupRealtimeSync()` / `setupMainDataRealtimeSync()` - Real-time listener for cross-device updates
- Visibility change handler - saves on tab hide, refreshes on tab show
- Fallback timer (3 seconds) - ensures app works even if Firebase is slow

### Firebase Security Rules (IMPORTANT)
The app uses client-side PIN authentication, not Firebase Auth. Current recommended rules:

```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "$userId.beginsWith('user_')",
        ".write": "$userId.beginsWith('user_')",
        ".validate": "newData.hasChildren()"
      }
    },
    ".read": false,
    ".write": false
  }
}
```

**To verify/update rules:**
1. Go to Firebase Console → https://console.firebase.google.com
2. Select "dental-student-quest" project
3. Build → Realtime Database → Rules tab
4. Paste rules and click "Publish"

**Security Notes:**
- Base64 PIN is NOT a cryptographic hash - it's reversible
- Anyone who guesses your PIN can access your data
- For production: consider adding Firebase Authentication

---

## CRITICAL BUGS TO AVOID

### 1. Double loadData() Calls
- Can cause race conditions and data loss
- Always check if data is already loading before calling again

### 2. Timezone Issues with Dates (VERY COMMON BUG)
```javascript
// WRONG - causes off-by-one errors
// UTC midnight = previous day in EST/local timezone!
const date = new Date('2026-02-02');

// CORRECT - parse in local timezone
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```

### 3. Missing Firebase Fields
- Always check for existence of `pillAssignments`, `calendarEvents`, etc.
- Use defaults/fallbacks when merging:
```javascript
state = {
    ...defaults,
    ...(firebaseData || {})
};
```

### 4. Breaking Cross-Sync Between Components
- Dashboard ↔ Deadlines use same `deadlines` array
- After editing: `saveData() → renderDeadlines() → renderDashboard()`
- Monthly Planner needs deep merge for nested objects

### 5. Orphan Function Calls
- Fixed in v28: `setupPlannerRealtimeSync()` was called but didn't exist
- Always verify functions exist before calling them
- Search for function definition: `grep -n "function functionName" file.html`

### 6. str_replace Failures
- If "string not found" error: whitespace/indentation doesn't match exactly
- Use `view` tool to see exact current code before replacing
- Include enough surrounding context to make old_str unique

---

## GRADE CALCULATOR MATH (D3 Roadmap)

### Formula (BULLETPROOF - DON'T CHANGE)
```javascript
// For each course component
if (grade !== null && grade !== undefined && grade !== '') {
    earnedPoints += (parseFloat(grade) / 100) * comp.weight;
    completedWeight += comp.weight;
} else {
    remainingWeight += comp.weight;
}

// Calculate needed average
const pointsNeeded = targetGrade - earnedPoints;
const avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;
```

### Peds Verification Example
- Locked in: 33.3 pts (Exam 1: 77% × 40% + Headstart: 100% × 2.5%)
- Remaining: 57.5% (Exam 2: 45% + Exam 3: 7.5% + Ortho Module: 5%)
- To get 70%: need (70-33.3)/57.5 × 100 = **63.83%** avg
- To get 80%: need (80-33.3)/57.5 × 100 = **81.22%** avg

### Course Passing Thresholds
- Most courses: 60%
- **Perio 2: 65%** (HIGHER - don't forget!)

---

## FINANCIALS SYSTEM (index.html)

### Purpose
Track loan disbursement money from Jan 5 until May 14 (next disbursement). Shows if Sully is on track to have a cushion when next disbursement arrives.

### Data Structure
```javascript
financials = {
    masterLiquidity: {
        currentCash: 0,              // Actual checking account balance
        lastUpdated: null,
        semesterEndDate: '2026-05-14', // Next disbursement date
        targetCushion: 2285          // Goal: have this much on May 14
    },
    committedBills: [...],           // One-time bills (January specific)
    recurringExpenses: {             // Monthly expense categories
        rent: { amount: 1280, category: 'housing' },
        // ... other expenses
    },
    monthlyPayments: {               // Track which months are paid
        '2026-02': { paid: false, paidDate: null, label: 'February 2026' },
        '2026-03': { paid: false, paidDate: null, label: 'March 2026' },
        '2026-04': { paid: false, paidDate: null, label: 'April 2026' },
        '2026-05': { paid: false, paidDate: null, label: 'May 1-14', partial: true, fraction: 0.45 }
    },
    creditCards: [...],              // Credit card tracking
    actionItems: [...]               // To-do items for financial tasks
};
```

### Projection Calculation (CRITICAL - DON'T BREAK)
```javascript
function calculateFinancialStatus() {
    // 1. Start with actual cash
    const liquid = financials.masterLiquidity.currentCash;

    // 2. Calculate unpaid one-time bills
    const unpaidBills = financials.committedBills.filter(bill => !bill.paid);
    const committedExpenses = unpaidBills.filter(b => b.type === 'expense').reduce(...);
    const committedIncome = unpaidBills.filter(b => b.type === 'income').reduce(...);

    // 3. Available after one-time bills
    const availableCash = liquid + committedIncome - committedExpenses;

    // 4. Calculate unpaid monthly expenses (ONLY unchecked months!)
    const monthlyBurn = Object.values(financials.recurringExpenses).reduce(...);
    let unpaidMonthsTotal = 0;
    Object.entries(financials.monthlyPayments).forEach(([key, month]) => {
        if (!month.paid) {
            const fraction = month.partial ? month.fraction : 1;
            unpaidMonthsTotal += monthlyBurn * fraction;
        }
    });

    // 5. Final projection
    const projectedBalance = availableCash - unpaidMonthsTotal;

    return { projectedBalance, healthStatus, ... };
}
```

### Key Functions
- `renderFinancialCockpit()` - Main render function
- `renderMasterCockpit()` - Current cash display
- `renderCommittedBills()` - One-time bills checklist
- `renderRecurringExpenses()` - Monthly expenses + month tracker
- `renderProjectionPanel()` - Calculation breakdown
- `toggleMonthPaid(monthKey)` - Mark month as paid/unpaid
- `toggleBillPaid(billId)` - Mark one-time bill as paid
- `addRecurringExpense()` - Add new expense category
- `deleteRecurringExpense(key)` - Remove expense category

### Health Status Colors
- 🟢 GREEN "ON TRACK": projectedBalance >= targetCushion
- 🟡 YELLOW "BELOW TARGET": projectedBalance > 0 but < targetCushion
- 🔴 RED "DEFICIT PROJECTED": projectedBalance < 0

---

## STIMULANT CALCULATOR - Pharmacokinetic Model

### XR Release Pattern
- 50% immediate release at dose time
- 50% delayed release at T+4 hours
- Each pulse decays independently via half-life formula:
  `remaining = dose × 0.5^(elapsed_hours / half_life)`

### Default Parameters
- Amphetamine half-life: 12 hours
- Sleep threshold: 15mg
- Caffeine half-life: 5 hours
- Caffeine threshold: 25mg

### Vitamin C Effect
- Reduces amphetamine half-life to 70% of normal (12h → 8.4h)
- Only applies AFTER the specified time

### Vitamin C Date Picker
- Uses `<input type="date">` instead of Today/Tomorrow dropdown
- `date` field (YYYY-MM-DD) persists to Firebase
- Calculation uses actual date difference from today
- Summaries show formatted date label when not today
- Same pattern used for med doses and caffeine in All-Nighter mode

### Circadian Rhythm (Process C)
- Wake Maintenance Zone: 2 hours before Forbidden Zone
- Forbidden Zone: 13-15 hours after wake (peak alertness, HARD BLOCKER)
- Sleep Gate: 15-17 hours after wake (optimal sleep window)

---

## RECENT UPDATES (January 2026)

### v34 Body Comp Tracker v3 Overhaul (Jan 26, 2026)

Major overhaul of body-comp-tracker.html with cross-app Firebase integration and simplified UX.

**IMPORTANT:** Detailed v3 specification document is at `/Users/suleman/coding-projects/dental-quest/` (separate file from consultant).

---

#### PHILOSOPHY CHANGE

**OLD:** User must understand TDEE, deficits, protein targets, modes
**NEW:** Wake up → app already knows everything → see if on track → log food with minimal friction

**Key Insight from Sully:** "I don't need this app to prevent a spiral because my sleep tracker app already does that. This app should be mainly meant to track my calories and body comp goals, but integrated with that important data to help me out."

---

#### SULLY'S PHYSICAL STATS (CORRECTED)

| Stat | Value | Notes |
|------|-------|-------|
| Height | 5'8.5" (174 cm / 68.5 inches) | NOT 5'10" as originally spec'd |
| Current Weight | 190 lbs | As of Jan 2026 |
| Goal Weight | 170 lbs | Target by June 1, 2026 |
| Body Fat | ~27% ± 2% | Starting estimate |
| Adderall | 50mg XR max | One 30mg + one 20mg pill (separate counters) |
| Typical Sleep | 4-6 hours | Chronic sleep deprivation |

**The Death Spiral (what the integration prevents):**
Procrastinate → 2pm panic → extra Adderall → undereating → ruined sleep → can't workout → week cooked

---

#### CROSS-APP FIREBASE INTEGRATION (READ-ONLY PULLS)

Body Comp Tracker pulls data from 3 other apps:

```
Source App              | Firebase Path                                    | Data Pulled
------------------------|--------------------------------------------------|---------------------------
Stimulant Calculator    | /users/{pin}/stimulantCalculator/state           | sleepHours, wakeTime, medications, caffeine, projectedSleepTime
Dental Quest (index)    | /users/{pin}/appData/medications                 | 30mg count, 20mg count, refill dates
D3 Roadmap              | /users/{pin}/d3Roadmap/exams                     | exam schedule for "exam week" detection
```

**New Firebase Paths Added:**
- `stimulantCalculator/state.projectedSleepTime` - String like "11:45 PM"
- `stimulantCalculator/state.projectedSleepMinutes` - Raw minutes for calculations
- `d3Roadmap/exams[]` - Array of exam objects synced from static exams array

---

#### ECOSYSTEM CONTEXT (NEW STATE STRUCTURE)

```javascript
state.ecosystemContext = {
    stimulant: {
        sleepHours: null,           // From sleep calculator
        wakeTime: null,             // When user woke up
        lastAdderallTime: null,     // Time of last dose
        lastAdderallDose: null,     // Dose amount (mg)
        totalAdderallToday: 0,      // Sum of all doses
        isBooster: false,           // medications.length > 1 means booster taken
        lastCaffeineTime: null,     // Time of last caffeine
        caffeineMg: 0,              // Total caffeine today
        projectedSleepTime: null,   // When calculator predicts sleep
        lastSynced: null            // Timestamp
    },
    inventory: {
        pills30mg: null,            // Remaining 30mg pills
        pills20mg: null,            // Remaining 20mg pills
        refillDate30mg: null,       // When 30mg refills
        refillDate20mg: null,       // When 20mg refills
        daysUntilRefill: null,      // Days until next refill
        willRunOut: false,          // Warning flag
        lastSynced: null
    },
    academic: {
        nextExam: null,             // Next exam object
        daysUntilExam: null,        // Days until next exam
        upcomingExams: [],          // All upcoming exams
        lastSynced: null
    }
};
```

---

#### SIMPLE VIEW (DEFAULT VIEW)

The new default view shows everything at a glance:

```
┌─────────────────────────────────────────┐
│  [STATUS HERO]                          │
│  🟢 ON TRACK / 🟡 BEHIND / 🔴 WAY BEHIND │
│  + status message                       │
├─────────────────────────────────────────┤
│  [PROGRESS BARS]                        │
│  Calories: ████████░░ 1,200/1,800       │
│  Protein:  ██████░░░░ 90g/150g          │
├─────────────────────────────────────────┤
│  [EATING NUDGE] (stimulant-aware)       │
│  "Adderall wearing off - eat now!"      │
├─────────────────────────────────────────┤
│  [WORKOUT REC]                          │
│  "Recovery day - sleep debt too high"   │
├─────────────────────────────────────────┤
│  [CONTEXT CHIPS]                        │
│  📚 PC2 in 3 days | 💊 12 pills left    │
├─────────────────────────────────────────┤
│  [STIMULANT PANEL]                      │
│  30mg XR @ 8am | Projected sleep: 11pm  │
├─────────────────────────────────────────┤
│  [Log Meal]  [Workout]  [Details →]     │
└─────────────────────────────────────────┘
```

---

#### STIMULANT-AWARE EATING NUDGES

Based on Adderall pharmacokinetics:

| Hours Since Dose | Phase | Nudge |
|------------------|-------|-------|
| 0-4h | Peak suppression | "Appetite suppressed - small snack OK" |
| 4-8h | Wearing off | "⚡ Best eating window - appetite returning!" |
| 8+h | Crash zone | "🔴 Crash zone - eat NOW before too tired" |
| No dose | No meds | Standard hunger-based nudges |

**Booster Detection:** `medications.length > 1` indicates a second dose was taken

---

#### WORKOUT RECOMMENDATIONS

Based on sleep and recovery:

| Sleep Hours | Recommendation |
|-------------|----------------|
| < 5h | "❌ Recovery day - sleep debt too high" |
| 5-6h | "⚠️ Light activity only (walk, stretch)" |
| 6+h | "✅ Good to train - [workout suggestion]" |

Additional factors: exam proximity, consecutive poor sleep days

---

#### CLAUDE PASTE FORMAT (PIPE-DELIMITED)

For quick logging via Claude conversation:

**Meals:**
```
MEAL|Chicken Breast|350|45|0|8
MEAL|Greek Yogurt|150|15|12|5
```
Format: `MEAL|Name|Calories|Protein|Carbs|Fat`

**Workouts:**
```
WORKOUT|Push Day|45|250|14:30
WORKOUT|Cardio|30|300|07:00
```
Format: `WORKOUT|Type|Duration|CaloriesBurned|Time`

---

#### KEY FUNCTIONS ADDED

```javascript
loadEcosystemData(hashedPin)     // Pulls from all 3 Firebase sources
renderSimpleView()               // Renders the Simple View dashboard
getSimpleStatus()                // Returns { icon, label, message, color }
getEatingNudge()                 // Stimulant-aware eating recommendation
getWorkoutRecommendation()       // Sleep-based workout advice
autoStartDay()                   // Skip manual setup, pull sleep from ecosystem
showDetailsView()                // Switch to full dashboard
showSimpleView()                 // Switch back to simple view
openWorkoutModal()               // Quick workout logging
parseWorkoutInput(text)          // Parse Claude paste format for workouts
```

---

#### MODE SYSTEM (UNCHANGED)

Based on sleep hours from ecosystem:
- **GREEN** (6+h): Full deficit, normal training
- **YELLOW** (5-6h): Reduced deficit, lighter training
- **ORANGE** (<5h): Maintenance calories, recovery only

---

#### IMPLEMENTATION STATUS (Jan 26, 2026)

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation (Firebase paths, ecosystemContext) | ✅ Complete |
| 2 | Simple View Dashboard | ✅ Complete |
| 3 | Stimulant-aware nudges | ✅ Complete (part of Phase 2) |
| 4 | Quick-tap meal grid | ✅ Complete |
| 5 | Workout integration | ✅ Complete (part of Phase 2) |
| 6 | Monthly body comp (Navy method) | ✅ Complete |
| 7 | Weekly Claude export | ✅ Complete |
| **8A** | **God Mode Features (8 predictive intelligence features)** | ✅ Complete |
| **8A.9** | **Logic Transparency diagnostic tool** | ✅ Complete |
| **8B** | **Debug Audit (3 bugs fixed)** | ✅ Complete |

**🎉 BODY COMP TRACKER v3 IS COMPLETE!** Deployed January 26, 2026.

---

#### QUICK-TAP MEAL MODAL (Phase 4)

Lightweight modal for minimal-friction meal logging:

```
┌─────────────────────────────────────────┐
│  🍽️ Quick Log                      ×    │
├─────────────────────────────────────────┤
│  Tap to add instantly:                  │
│                                         │
│  ┌──────────┐  ┌──────────┐             │
│  │ Chicken  │  │ Eggs x2  │             │
│  │ 340 • 38g│  │ 140 • 12g│             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ Greek    │  │ Protein  │             │
│  │ Yogurt   │  │ Shake    │             │
│  └──────────┘  └──────────┘             │
│  ... (top 6 frequent foods)             │
│                                         │
│  ─────── Today's Meals ───────          │
│  [Chicken Breast         340 cal]       │
│  [Greek Yogurt           150 cal]       │
│  (tap to repeat)                        │
│                                         │
│  ─────── Claude paste ───────           │
│  ┌─────────────────────────────┐        │
│  │ MEAL|Name|Cal|Pro|Carb|Fat  │        │
│  └─────────────────────────────┘        │
│                                         │
│  [Add Pasted]  [Custom Entry]           │
└─────────────────────────────────────────┘
```

**Key Functions:**
- `openQuickMealModal()` - Creates/shows the quick-tap modal
- `closeQuickMealModal()` - Closes the modal
- `quickAddMeal(foodId)` - One-tap add from frequent foods
- `repeatMeal(mealIndex)` - Repeat a meal from today
- `parseQuickMealPaste()` - Parse Claude pipe-delimited format

**Features:**
- Top 6 frequent foods sorted by usage
- "Today's Meals" section for quick repeats
- Multi-line Claude paste parsing
- One-tap closes modal + updates Simple View
- Awards 10 XP per meal logged

---

#### WEEKLY EXPORT MODAL (Phase 7)

Comprehensive weekly check-in export for Claude feedback sessions:

**Visual Preview Shows:**
- Week date range (e.g., "Jan 20 — Jan 26")
- Days logged count and workout count
- Daily breakdown with calories, protein, deficit, workout indicator
- Weekly totals: avg calories, avg protein, total deficit, est. fat loss
- Weight change if multiple weigh-ins that week
- Workout summary by type
- Flags/alerts for areas to improve

**Claude Export Format:**
```
WEEKLY_CHECK_IN|2026-01-20|2026-01-26
PROFILE|Weight:190|Goal:170|Remaining:20.0
TRACKING|DaysLogged:6/7|PerfectDays:4
AVERAGES|Calories:1850|Protein:145g|Deficit:450|Sleep:5.8h
TOTALS|WeeklyDeficit:2700|EstFatLoss:0.77lbs
WORKOUTS|Count:4|Types:Lift(2),Cardio(2)
---DAILY_BREAKDOWN---
Mon|Cal:1900|Pro:150g|Def:400|Sleep:6h|Workout:Lift
Tue|Cal:1800|Pro:140g|Def:500|Sleep:5h
...
---WEIGH_INS---
2026-01-20|191.5lbs
2026-01-26|190.2lbs
---STIMULANT_CONTEXT---
Adderall:50mg|Caffeine:200mg
---ACADEMIC---
NextExam:PC2 Midterm|In:7days
FLAGS:LOW_PROTEIN,SLEEP_DEBT
---CUMULATIVE---
CumulativeDeficit:12500
Streak:15|Level:5|XP:1250
```

**Key Functions:**
- `openWeeklyExportModal()` - Opens modal with generated preview
- `closeWeeklyExportModal()` - Closes modal
- `calculateFullWeekData()` - Aggregates last 7 days of data
- `renderWeeklyExportPreview()` - Renders visual preview
- `generateWeeklyClaudeExport()` - Generates parseable export string
- `copyWeeklyExport()` - Copies to clipboard + awards 25 XP

**Flags Detected:**
- `LOW_TRACKING` - Less than 5 days logged
- `LOW_PROTEIN` - Average protein < 130g
- `SLEEP_DEBT` - Average sleep < 6h
- `SLOW_PROGRESS` - Weekly deficit < 2500 (with 5+ days logged)
- `LOW_ACTIVITY` - Less than 3 workouts
- `NEEDS_REFEED` - Cumulative deficit >= 7000

---

#### BODY COMP CHECK-IN MODAL (Phase 6)

Monthly body composition tracking using tape measurements (Navy method) or smart scale:

**Two Methods:**
1. **Navy Method (📏)** - Tape measure: neck + waist → calculates body fat %
2. **Smart Scale (⚖️)** - Enter weight + body fat % from smart scale

**Navy Method Formula (Men):**
```
Body Fat % = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
```
- Waist: Measure at belly button level
- Neck: Measure below Adam's apple
- Height: Uses stored profile value (68.5 inches for Sully)

**Live Preview Features:**
- Real-time body fat calculation as measurements are entered
- Body composition breakdown: weight, fat mass, lean mass
- Validates measurements (waist must be larger than neck)
- Visual highlight when valid calculation achieved

**Data Stored:**
```javascript
bodyCompHistory: [
    {
        date: '2026-01-26',
        method: 'navy',           // 'navy' or 'scale'
        weight: 188.5,
        bodyFat: 24.5,
        fatMass: 46.2,
        leanMass: 142.3,
        measurements: {           // Only for Navy method
            neck: 15.5,
            waist: 34
        }
    }
]
```

**Key Functions:**
- `openBodyCompModal()` - Opens modal, pre-fills weight, sets up listeners
- `closeBodyCompModal()` - Closes modal
- `setBodyCompTab(tab)` - Switches between Navy/Scale tabs
- `calculateNavyBodyFat(waist, neck, height)` - Navy method formula
- `updateNavyPreview()` / `updateScalePreview()` - Live calculation display
- `saveNavyMeasurement()` / `saveScaleMeasurement()` - Save to history
- `renderBodyCompHistory()` - Shows last 5 check-ins with change indicators

**Gamification:**
- Awards 50 XP for each body comp check-in
- Also saves to weighIns array for weight tracking integration

---

#### FILES MODIFIED

**body-comp-tracker.html** (+1400 lines total):
- Fixed height: 178 → 174 cm, added height_inches: 68.5
- Added startingBodyFat: 27
- Added ecosystemContext to state
- Added loadEcosystemData() function
- Added Simple View CSS (~250 lines)
- Added Simple View HTML structure (~100 lines)
- Added all Simple View JS functions
- Added workout modal and logging
- Modified loadFromFirebase() to preserve ecosystemContext
- Modified initializeUI() to auto-start and show Simple View
- **Phase 4**: Added Quick Meal Modal CSS (~160 lines)
- **Phase 4**: Added `openQuickMealModal()`, `closeQuickMealModal()`, `quickAddMeal()`, `repeatMeal()`, `parseQuickMealPaste()`
- **Phase 7**: Added Weekly Export Modal CSS (~130 lines)
- **Phase 7**: Added `openWeeklyExportModal()`, `closeWeeklyExportModal()`, `calculateFullWeekData()`, `renderWeeklyExportPreview()`, `generateWeeklyClaudeExport()`, `copyWeeklyExport()`
- **Phase 7**: Added "Weekly Check-In for Claude" button to Simple View
- **Phase 6**: Added Body Comp Modal CSS (~170 lines)
- **Phase 6**: Added `openBodyCompModal()`, `closeBodyCompModal()`, `setBodyCompTab()`, `calculateNavyBodyFat()`, `updateNavyPreview()`, `updateScalePreview()`, `saveNavyMeasurement()`, `saveScaleMeasurement()`, `renderBodyCompHistory()`
- **Phase 6**: Added "Monthly Body Comp Check-In" button to Simple View
- **Phase 6**: Added `bodyCompHistory: []` to state and Firebase sync patterns

**stimulant-elimination-calculator.html** (+6 lines):
- Added storage of projectedSleepTime and projectedSleepMinutes to state

**d3-roadmap.html** (+10 lines):
- Added exams: [] to roadmapData
- Added sync logic to copy static exams array to Firebase

---

### v35 Body Comp v3 God Mode Expansion + Debug Audit (Jan 26, 2026)

Major expansion adding 9 predictive intelligence features and comprehensive debug audit.

---

#### GOD MODE PHILOSOPHY

**The data already exists across Sully's app ecosystem. The app should USE it to be predictive, not just reactive.**

Data sources:
- **Stimulant Calculator**: Sleep history (7 days), caffeine timing, Adderall dosing
- **D3 Roadmap**: Schedule (clinic, lecture, exam times), exam dates
- **Dental Quest**: Pill inventory, refill dates

---

#### GOD MODE FEATURES (8A.1-8A.8)

| Feature | Description | Priority |
|---------|-------------|----------|
| **8A.1** | Schedule-aware eating windows | P1 |
| **8A.2** | Tomorrow preview & meal prep alerts | P6 |
| **8A.3** | Exam day protocol (4 phases) | P2 |
| **8A.4** | Sleep debt accumulation (7-day) | P3 |
| **8A.5** | Exam stress multiplier (+10%/+20%) | P4 |
| **8A.6** | Protein distribution warning | P8 |
| **8A.7** | Weekly rhythm analysis | P7 |
| **8A.8** | Caffeine × Adderall combined modeling | P5 |
| **8A.9** | Logic Transparency diagnostic tool | NEW |

---

#### 8A.1: SCHEDULE-AWARE EATING WINDOWS

Pulls today's schedule from D3 Roadmap Monthly Planner:

```javascript
state.ecosystemContext.schedule = {
    todayTasks: [],           // Tasks from monthlyPlanner
    tomorrowTasks: [],        // For evening preview
    blockedWindows: [],       // { start, end, name, type, startMinutes, endMinutes }
    eatingWindows: [],        // Inverse of blocked (when CAN eat)
    totalEatingHours: 0,      // Sum of eating window durations
    frontLoadRequired: false, // true if <6 hours eating time
    frontLoadDeadline: null,  // Time to get 70% calories by
    scheduleIntensity: 'EASY' // EASY (≥7hr) | MEDIUM (5-7hr) | HARD (<5hr)
};
```

**UI:** Schedule card shows blocked windows, eating hours, intensity badge, front-load warning.

---

#### 8A.3: EXAM DAY PROTOCOL

Detects exams in today's schedule and provides phase-specific guidance:

| Phase | Timing | Nutrition Guidance |
|-------|--------|-------------------|
| MORNING_PREP | 4+ hours before | Complex carbs, moderate protein, hydrate |
| PRE_EXAM | 1-4 hours before | Light snack, hydrate, no new caffeine |
| FINAL_HOUR | <1 hour before | Deep breaths, trust prep |
| POST_EXAM | After exam | Full meal, celebrate appropriately |

**UI:** Exam day card with phase-specific nutrition tips and caffeine cutoff.

---

#### 8A.4: SLEEP DEBT ACCUMULATION

Pulls last 7 days of sleep from Stimulant Calculator:

```javascript
state.ecosystemContext.sleepDebt = {
    last7Days: [],              // Array of { date, hours }
    totalSleep: 0,              // Sum of last 7 days
    avgSleep: 0,                // Average per night
    weeklyDebt: 0,              // 49 - totalSleep (target = 7hr × 7 nights)
    consecutiveBadNights: 0,    // Count of nights <5.5 hours
    severity: 'LOW'             // LOW | MODERATE | HIGH | SEVERE
};
```

**Mode Overrides:**
- **SEVERE** debt → Forces ORANGE mode (maintenance only)
- **HIGH** debt → Bumps GREEN → YELLOW

**UI:** Sleep debt indicator when MODERATE or worse.

---

#### 8A.5: EXAM STRESS MULTIPLIER

Automatically raises calorie targets when exams approach:

| Days Until Exam | Multiplier | Reason |
|-----------------|------------|--------|
| ≤3 days | +20% | Historical pattern: undereating before exams |
| 4-7 days | +10% | Moderate stress period |
| 8+ days | None | Normal operation |

---

#### 8A.8: CAFFEINE × ADDERALL COMBINED MODELING

```javascript
state.ecosystemContext.stimulantEffect = {
    adderallEffect: 0,          // 0-100% based on hours since dose
    caffeineEffect: 0,          // 0-100% based on mg and half-life
    combinedEffect: 0,          // Synergistic formula
    suppressionLevel: 'LOW',    // LOW | MODERATE | HIGH | SEVERE
    suppressionEnd: null,       // Time when appetite returns
    crashRiskWindow: {          // When crash is most likely
        start: null,
        end: null,
        intensity: 'NORMAL'     // NORMAL | SHARP (high caffeine)
    }
};
```

**Adderall Effect Curve:**
- 0-1 hr: 70% (ramping)
- 1-4 hr: 100% (peak)
- 4-8 hr: 60% (wearing off)
- 8-10 hr: 30% (crash zone)
- 10+ hr: 10% (minimal)

**Combined Formula:**
`Adderall + (Caffeine × 0.5) + (Adderall × Caffeine × 0.3)`

---

#### 8A.9: LOGIC TRANSPARENCY

"📋 Show Logic" button generates comprehensive diagnostic log:

**Sections (9 total):**
1. Data Sources (Stim Calc, Dental Quest, D3 Roadmap)
2. Mode Calculation
3. Target Calculation (BMR, TDEE, mode-based)
4. Stimulant Effect Analysis
5. Current Status (meals, progress)
6. Active Nudge Analysis
7. Workout Status
8. Exam Day Status
9. Sync Status

**Usage:** Copy log → paste to Claude → verify calculations correct.

---

#### DEBUG AUDIT RESULTS (Jan 26, 2026)

**3 Bugs Found & Fixed:**

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | CRITICAL | `analyzeWeeklyRhythm()` used `log.totalCalories` instead of `log.calories` | Changed property names |
| 2 | HIGH | `saveDayLog()` missing `workedOut` field | Added to daily log object |
| 3 | HIGH | `loadEcosystemData()` called `renderDashboard()` but app is in Simple View | Changed to `renderSimpleView()` |

**Audit Stats:**
- Lines audited: ~1,500
- Functions examined: 42
- XSS vulnerabilities: 0 (all user input escaped)

---

#### NEW UI COMPONENTS

**Schedule Card:**
```
┌─────────────────────────────────────────┐
│ 📅 Today's Schedule          [HARD]     │
│ 5.5 hours to eat today                  │
│                                         │
│ 🦷 8:30-11:30  Clinic AM               │
│ 📚 12:30-3:30  Lecture                 │
│ 🦷 4:00-7:00   Clinic PM               │
│                                         │
│ ⚠️ Front-load required: 70% by 8:30am  │
└─────────────────────────────────────────┘
```

**Exam Day Card:**
```
┌─────────────────────────────────────────┐
│ 🧠 EXAM DAY: PC2 Midterm at 9:00        │
│                                         │
│ Nutrition:                              │
│ ✅ Complex carbs for brain fuel         │
│ ✅ Moderate protein                     │
│ ❌ Avoid heavy/greasy foods             │
│                                         │
│ ☕ Finish caffeine by 5:00am            │
│ 💡 Eat solid breakfast - brain needs    │
│    glucose                              │
└─────────────────────────────────────────┘
```

**Sleep Debt Indicator:**
```
┌─────────────────────────────────────────┐
│ 😴 Sleep Debt: HIGH                     │
│ 5.2 hr avg (need 7) • 12.6 hr debt     │
│ 3 consecutive nights under 5.5 hours   │
│                                         │
│ ⚠️ Mode bumped GREEN → YELLOW           │
└─────────────────────────────────────────┘
```

---

#### KEY FUNCTIONS ADDED (God Mode)

```javascript
// Schedule (8A.1)
loadTodaySchedule()              // Pulls from D3 Roadmap
calculateEatingWindows()         // Inverse of blocked windows
renderScheduleCard()             // UI rendering
getScheduleAwareNudge()          // "Clinic in 20 min, eat now"

// Exam Day (8A.3)
checkExamDay()                   // Detects exam in schedule
getExamPhase()                   // MORNING_PREP | PRE_EXAM | FINAL_HOUR | POST_EXAM
getExamDayGuidance()             // Phase-specific nutrition tips
renderExamDayCard()              // UI rendering

// Sleep Debt (8A.4)
calculateSleepDebt()             // 7-day aggregation
getSleepDebtSeverity()           // LOW | MODERATE | HIGH | SEVERE
applySleepDebtModeOverride()     // SEVERE→ORANGE, HIGH→bump GREEN
renderSleepDebtIndicator()       // UI rendering

// Exam Multiplier (8A.5)
applyExamStressMultiplier()      // +10%/+20% to calorie target

// Tomorrow Preview (8A.2)
getTomorrowPreview()             // Tomorrow's eating hours
getEveningPrepNudge()            // "Tomorrow is brutal, prep meals"

// Weekly Rhythm (8A.7)
analyzeWeeklyRhythm()            // Aggregate by day of week
getWeakDayNudge()                // "Wednesday is your weak day"

// Protein Distribution (8A.6)
analyzeProteinDistribution()     // Before/after 6pm split
getProteinDistributionNudge()    // "50% protein after 6pm"

// Stimulant Modeling (8A.8)
calculateCombinedStimulantEffect() // Adderall + Caffeine synergy
getEnhancedStimulantNudge()      // Crash window warnings

// Logic Transparency (8A.9)
generateLogicLog()               // 9-section diagnostic output
showLogicModal()                 // Modal display
copyLogicLog()                   // Clipboard copy
```

---

#### FILE STATS

**body-comp-tracker.html:**
- Lines: 10,668 → 11,159 (+491 lines)
- Functions: 156 total
- CSS: +100 lines (God Mode cards, logic modal)
- JS: +380 lines (God Mode features, logic transparency)

---

#### COMMITS

```
38ab1a1 Debug audit + Logic Transparency (8A.9): Fix 3 bugs, add diagnostic tool
c879e25 Body Comp Tracker v3 God Mode: 8 predictive intelligence features
```

---

#### DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| `body-comp-v3-godmode-spec.md` | Full God Mode implementation spec |
| `body-comp-v3-master-backup.md` | Complete project context backup |
| `body-comp-v3-accountability.md` | Phase checklist and checkpoints |
| `body-comp-v3-coder-briefing.md` | Expansion briefing for coder |
| `body-comp-v3-logic-transparency.md` | 8A.9 feature spec |
| `body-comp-v3-debugger-prompt.md` | 8-phase debug audit prompt |

---

### v33 Lecture Prompt v3.2-FINAL + Multi-Portion Workflow (Jan 25, 2026)

Extended session involving rigorous Analyst A/B debate to optimize lecture-to-notes prompt engineering.

---

#### BACKGROUND: The Problem Being Solved

**Sully's Original Workflow (Painful):**
1. Download audio transcript from Echo360
2. Download PDF lecture slides
3. Break 1-2 hour lectures into 15-20 minute chunks (5-8 portions per lecture)
4. Use comprehensive prompt to generate notes
5. Output too long → use condensation prompt
6. Manual markdown → Word conversion
7. Run on both LLMs (Claude and Gemini), compare outputs
8. **Pain point:** 4-6 iterations per lecture chunk, inconsistent results

**Goal:** Reduce iterations, improve consistency, create sustainable workflow for 5 exams in February.

---

#### PHASE 1: v3.2-FINAL Prompt Development

**Trial Run Results (4 trials across 2 models):**
- Original prompt vs NEW prompt comparison
- **Finding:** 61% word count reduction with no content loss
- **Finding:** 4-6 iterations → 1 iteration (70% time savings)

**Research Applied:**
| Technique | How Applied |
|-----------|-------------|
| Prompt Repetition (Dec 2025 Google Research) | Key instructions repeated, placed close to generation point |
| Step-back Prompting | "Classify first, then format" processing pattern |
| Cognitive Load Theory (7±2) | Consolidated from 13 sections to 7 sections |
| Pink Elephant Problem | Reframed negatives as positives (what TO do, not what NOT to do) |
| ReAct Framework | Classify → Format → Verify pattern |

**v3.2-FINAL Key Features:**
1. **INSTRUCTION PRIORITY section** - Clear hierarchy for conflict resolution
2. **CALIBRATION** - 500-800 words per 15-min portion (flexible)
3. **Depth Tiering** - HIGH/MEDIUM/LOW YIELD classification
4. **Algorithm Code Blocks** - For branching decisions:
   ```
   [Decision question?]
       /    \
     YES    NO
      ↓      ↓
   [Action] [Action]
   ```
5. **Protocol Code Blocks** - For prescriptions (Rx/Disp/Sig format)
6. **Format Selection Priority** - Anti-overuse clause prevents format inflation
7. **Grounding Rule** - Mark heavy inference with [INFERENCE]
8. **Synthesis Rule** - NO direct professor quotes (synthesize all content)

---

#### PHASE 2: Multi-Portion Workflow Debate (Analyst A vs B)

**The Core Question:** How to handle portions 2-N within the same chat conversation?

**Analyst B's Initial Proposal (Simple):**
- Portion 1: Full prompt
- Portions 2-N: Just paste content with `## NEXT PORTION` header
- Rationale: Instructions already in context

**Analyst A's Rebuttal:**
- Cited prompt repetition research: Instructions at END of context have stronger influence
- By Portion 5, original instructions buried under ~10,000 tokens
- "Lost in the Middle" phenomenon: Models attend less to middle of long contexts
- Simple continuation leads to DRIFT (model starts quoting directly, stops using tables)

**Analyst B's Counter-Attack:**
1. **Scope creep concern** - Reinforcement block getting bloated
2. **Arbitrary checkpoint formula** - "Portion 5" has no empirical basis
3. **Correction embedding conflicts** - Need hierarchical priority integration
4. **Adaptive Reinforcement proposal** - Only reinforce what's actually drifting

**Final Convergence (Both Analysts Agreed):**

| Element | Converged Position |
|---------|-------------------|
| Reinforcement Block needed? | ✅ Yes |
| Token budget | ~65 tokens (principled inclusion criteria) |
| Checkpoint timing | Portion 5 for 8+ portion lectures (simple rule + behavioral override) |
| Corrections | Priority-level insertion (2, 2.5, 3, 4) |
| "PORTION X of ~Y" framing | ❌ Dropped (no proven benefit, estimate errors) |
| A/B testing needed | ✅ Yes (theoretical debate has diminishing returns) |

**Principled Inclusion Criteria for Reinforcement Block:**
Include ONLY instructions that:
1. Have high drift probability (synthesis rule drifts most)
2. Are invisible in output (can't self-correct by looking)
3. Are novel to v3.2-FINAL (algorithms/protocols may be forgotten)

---

#### PHASE 3: Implementation

**Templates Added to lecture-prompt-transformer.html:**

```javascript
// Full prompt (~600 tokens)
const DEFAULT_TEMPLATE = `# LECTURE NOTES TRANSFORMATION v3.2-FINAL...`

// Reinforcement block (~65 tokens)
const STANDARD_REINFORCEMENT_TEMPLATE = `## CONTINUATION - PORTION [PORTION_NUM]

**Maintain v3.2-FINAL:**
- NO direct quotes (synthesize)
- Algorithm blocks for branching decisions
- Protocol blocks for prescriptions/dosing
- HIGH YIELD → full detail | LOW YIELD → one line or omit

**Slides:**
[SLIDE_TEXT]

---

**Transcript:**
[AUDIO_TEXT]

---

Continue notes.`

// Correction block (~80 tokens)
const CORRECTION_TEMPLATE = `## CORRECTION + CONTINUATION - PORTION [PORTION_NUM]

**Correction (Priority [CORRECTION_PRIORITY]):** [CORRECTION_TEXT]

**Maintain v3.2-FINAL:**
- NO direct quotes (synthesize)
- Algorithm blocks for branching decisions
- Protocol blocks for prescriptions/dosing
- HIGH YIELD → full detail | LOW YIELD → one line or omit

**Slides:**
[SLIDE_TEXT]

---

**Transcript:**
[AUDIO_TEXT]

---

Continue notes with correction applied.`
```

**UI Changes (Both Build + Transform Existing tabs):**
- Portion Type dropdown: First Portion / Continuation / Checkpoint / Correction
- Portion Number input (shown for non-first portions)
- Correction fields: text input + priority dropdown
- Help tooltip explaining each option

**Functions Added:**
- `updatePortionTypeUI()` - Show/hide fields based on selection
- `updateTransformPortionTypeUI()` - Same for Transform tab
- Modified `generateBuildPrompt()` and `generateTransformPrompt()` to handle all portion types

---

#### RECOMMENDED WORKFLOW

**For Sully's typical 5-8 portion lectures (each lecture = separate chat):**

```
LECTURE START (new chat)
├── Portion 1 → First Portion (full v3.2-FINAL)
├── Portion 2 → Continuation
├── Portion 3 → Continuation
├── Portion 4 → Continuation
├── Portion 5 → Checkpoint (if 6+ portions total)
├── Portion 6 → Continuation
├── Portion 7 → Continuation
└── Portion 8 → Continuation

DRIFT DETECTED AT ANY POINT?
└── Use Correction instead, specify what's wrong + priority level
```

**Correction Priority Levels:**
| Priority | Meaning | When to Use |
|----------|---------|-------------|
| 2 | HIGH | Right after synthesis rule (most important) |
| 2.5 | MID-HIGH | Default, good for most corrections |
| 3 | MEDIUM | After HIGH YIELD rule |
| 4 | LOW | Sacrifice last if conflicts |

**When to Use Each Portion Type:**
| Situation | Select |
|-----------|--------|
| Starting any new lecture | First Portion |
| Portions 2, 3, 4 in same chat | Continuation |
| Portion 5+ of long lecture (8+ portions) | Checkpoint |
| Model quoting directly, missing tables, etc. | Correction |

---

#### TESTING STATUS

**Status:** User testing in progress (Jan 25, 2026)

**What to Monitor:**
- Format consistency across portions (tables, algorithms, no direct quotes)
- Whether Continuation block maintains quality vs full prompt
- Drift patterns that trigger Correction usage
- Optimal checkpoint timing for different lecture lengths

**Post-Testing TODO:**
- Adjust Reinforcement Block content based on observed drift
- Refine checkpoint timing formula if needed
- Consider Adaptive Reinforcement (only reinforce drifting elements) as power-user option

---

#### TECHNICAL REFERENCE

**File:** `lecture-prompt-transformer.html`

**Key Constants:**
- `DEFAULT_TEMPLATE` - Full v3.2-FINAL prompt (line ~1344)
- `STANDARD_REINFORCEMENT_TEMPLATE` - Continuation block (line ~1493)
- `CORRECTION_TEMPLATE` - Correction block (line ~1512)
- `LEGACY_TEMPLATE` - Old simple format (kept for comparison)

**Key Functions:**
- `generateBuildPrompt()` - Build tab prompt generation
- `generateTransformPrompt()` - Transform tab prompt generation
- `updatePortionTypeUI()` - Build tab UI updates
- `updateTransformPortionTypeUI()` - Transform tab UI updates
- `getCurrentTemplate()` - Returns custom or default template

**Placeholders:**
- `[COURSE_NAME]` - Course name
- `[LECTURE_TOPIC]` - Lecture topic
- `[SLIDE_TEXT]` - Slide content
- `[AUDIO_TEXT]` - Transcript content
- `[PORTION_NUM]` - Portion number (continuation/correction)
- `[CORRECTION_TEXT]` - What needs fixing (correction only)
- `[CORRECTION_PRIORITY]` - Priority level (correction only)

**localStorage:**
- `lecturePromptTemplate` - Custom template storage
- User must "Reset to Default" in Template tab to get v3.2-FINAL if old template cached

---

#### COMMITS (Jan 25, 2026)

```
82cb4c5 Add portion type selector to Transform Existing tab
d9f8ab7 Add multi-portion workflow system to lecture transformer
80d3cd6 Implement v3.2-FINAL lecture prompt template
```

---

### v32.1 Deep Audit & Cross-App Enhancements (Jan 23, 2026)

Extended session with comprehensive improvements across all apps.

#### Cross-App Navigation Bar (ALL 4 APPS)
Added consistent navigation header to all apps for easy switching:
- **Files updated:** index.html, d3-roadmap.html, stimulant-elimination-calculator.html, lecture-prompt-transformer.html
- Purple gradient header with app links
- Current app highlighted, others show on hover
- Mobile responsive (stacks vertically)

#### Offline Sync Queue (index.html)
- Added `pendingSyncQueue[]` for offline operations
- Online/offline event listeners auto-process queue
- Operations saved to localStorage when offline, synced when back online
- Pattern: `queueSyncOperation(operation)` → process on `navigator.onLine`

#### Date Picker Overhaul (stimulant-elimination-calculator.html)
**Changed from Today/Tomorrow dropdown to precise date pickers:**
- All 3 components now use `<input type="date">` for max precision
- Works in BOTH regular mode AND All-Nighter mode
- Meds and caffeine have `max="${today}"` to prevent future dates
- Vitamin C allows future dates (for planning)

**State structure changes:**
```javascript
// OLD: modifiers.vitaminC.isNextDay (boolean)
// NEW: modifiers.vitaminC.date (YYYY-MM-DD string)

// Medication entries now include: { id, dose, time, date }
// Caffeine entries now include: { id, amount, time, date, ... }
```

#### Pharmacokinetic Calculation Fixes (CRITICAL)
**Bug: calculateCaffLoad() only handled today/yesterday**
- Old code silently ignored dates 2+ days ago
- Fix: Days-difference calculation handles any past date
```javascript
const daysDiff = Math.round((todayDate - doseDate) / (1000 * 60 * 60 * 24));
if (daysDiff < 0) return; // Skip future
if (daysDiff > 2) return; // Skip >48h (caffeine)
const effectiveDoseTime = baseDoseTime - (daysDiff * 24 * 60);
```

**Bug: Undefined `doseTime` variable in calculateAmpLoad()**
- XR calculation section referenced `doseTime` but only `baseDoseTime` was defined
- Would cause ReferenceError for today's fresh doses
- Fix: Changed all references to `baseDoseTime`

**Bug: calculateAmpLoad() only handled today/yesterday**
- Same pattern as caffeine - now uses days-difference
- Skips doses >72h old (~6 half-lives = negligible)

#### Deleted Redundant File
- Removed `lecture-prompt-transformer.jsx` (HTML version already exists)

#### Commits (Jan 23, 2026 Session)
```
47b483f Fix pharmacokinetic calculations for arbitrary date pickers
becb36e Show date pickers in both regular and All-Nighter modes
3dfc86c Update CLAUDE.md with Firebase rules + date picker docs
90e37fa Replace date dropdowns with proper date inputs
a37c0a6 Add offline sync queue to index.html
090d8d7 Add cross-app navigation to all 4 apps
```

---

### v32 Production Audit Bug Fixes (Jan 23, 2026)

Comprehensive production-grade audit of all 3 apps with 10 bugs fixed total.

#### stimulant-elimination-calculator.html (6 bugs fixed)

**Bug 1: Time Input Not Persisting**
- **Problem:** Changing medication time would reset the input field
- **Cause:** `updateMedEntry()` called `renderMedEntries()` for every field change, destroying the active input
- **Fix:** Added conditional to skip re-render for time-only changes (line 4276):
  ```javascript
  } else if (field === 'time') {
      med.time = value;
      // DON'T re-render for time changes - it destroys the active input!
  }
  ```

**Bug 2: Caffeine Double-Counting When Switching Views**
- **Problem:** Caffeine entries appeared twice after switching between Focus/Full view
- **Cause:** `setViewMode()` and Firebase sync didn't call `renderFocusCaffeineList()`
- **Fix:** Added missing render calls to `setViewMode('full')` and `syncStateFromFirebase()` (lines 9527, 9080)

**Bug 3: Vitamin C Toggle Reset on Reload**
- **Problem:** Vitamin C and workout modifiers cleared on every page load when history was empty
- **Cause:** Code checked `if (lastDate !== today)` without verifying lastDate existed
- **Fix:** Changed to `if (lastDate && lastDate !== today)` (line 8879)

**Bug 4: All-Nighter Mode Missing Date Selectors**
- **Problem:** Can't specify if med/caffeine was taken "yesterday" in all-nighter mode
- **Fix:** Added Today/Yesterday dropdowns when `allNighterMode = true` (lines 4315-4319, 4458-4462)
- **New function:** `updateCaffeineDate(index, newDate)` (line 4490)

**Bug 5: Focus/Full View Caffeine Desync**
- **Problem:** Adding/removing caffeine in one view didn't update the other
- **Fix:** Added `renderFocusCaffeineList()` calls to `addCaffeine()`, `removeCaffeine()`, `clearToday()` (lines 4425, 4447, 4545)

**Bug 6: Mobile Touch/Zoom Issues**
- **Problem:** Mobile interface had small touch targets, iOS auto-zoom on inputs
- **Fix:** Added CSS for 44px touch targets, 16px font size, `touch-action: manipulation` (lines 544-562)

#### index.html (4 bugs fixed)

**Bug 1: deleteTask() Orphaned References**
- **Problem:** Deleting a task didn't clean up references in `focusModeData`
- **Cause:** Task could still be referenced in `oneThingId` or `todaysTasks` after deletion
- **Fix:** Added cleanup code to `deleteTask()` (line 10722):
  ```javascript
  if (focusModeData.oneThingId === id) {
      focusModeData.oneThingId = null;
      focusModeData.microSteps = [];
  }
  ['big', 'medium', 'small'].forEach(size => {
      focusModeData.todaysTasks[size] = focusModeData.todaysTasks[size].filter(taskId => taskId !== id);
  });
  ```

**Bug 2: loadData() Crash on Corrupted localStorage**
- **Problem:** App would crash if localStorage contained invalid JSON
- **Fix:** Wrapped `JSON.parse()` in try-catch with graceful fallback (line 5674):
  ```javascript
  try {
      data = JSON.parse(saved);
  } catch (e) {
      console.error('❌ Failed to parse localStorage data:', e);
      showToast('Data corrupted - starting fresh', '⚠️');
      return;
  }
  ```

**Bug 3: Escape Key Didn't Close All Modals**
- **Problem:** Escape key only closed class-based modals, not display-based ones
- **Fix:** Extended escape handler to check `taskEditModal` and `planningModal` (line 8640)

**Bug 4: Medications Refill Date Off-by-One Day**
- **Problem:** Refill date could be wrong by 1 day in EST/local timezone
- **Cause:** `new Date("2026-02-15")` parses as UTC midnight, which is Feb 14th in EST
- **Fix:** Changed 3 locations to use `parseLocalDate()` instead of `new Date(string)`:
  - Line 6739: Display refill date
  - Line 6754: Calculate days until refill
  - Line 8502: Quick summary calculation

### v31 Clinical Tab & Competencies System (d3-roadmap.html)

#### NEW: Clinical Tracker Tab
Full clinical tracking system added to d3-roadmap.html with multiple sub-tabs:
- **Overview** - Summary dashboard of clinical progress
- **Patients** - Patient roster with status tracking
- **Appointments** - Upcoming appointments with axiUm import
- **Competencies** - Graduation requirements tracker (see below)
- **Lectures** - Lecture tracking with import from Claude

#### Competencies System (Graduation Requirements)
Tracks all clinical competencies across 10 disciplines:
- Fixed Prosthodontics, Operative, Complete Dentures, RPDs
- SRPs, Endodontics, Oral Surgery, Pediatric Dentistry
- Periodontology, Group Practice

**Data Structure:**
```javascript
clinicalData.competencies = {
    fixed: {
        name: 'Fixed Prosthodontics',
        icon: '🦷',
        color: '#3b82f6',
        notes: '',
        sections: [
            { title: 'Fixed Formatives', items: [
                { id: 'fixed-form-prov', text: '6 Provisional Restoration', required: 6, completed: 0 },
                // ... more items
            ]},
            { title: 'Fixed Summatives', items: [...] },
            // ... more sections
        ]
    },
    // ... other disciplines
};
```

**Add/Edit/Delete Requirements (NEW):**
- **➕ Add Requirement** button at bottom of each section
- **✏️ Edit** button appears on hover for ALL requirements
- **🗑️ Delete** button appears only for custom-added items (`custom: true`)
- Modal interface for adding/editing with fields: name, required count, progress, notes

**Key Functions:**
```javascript
openAddCompItemModal(catKey, sectionIndex)  // Open modal to add new requirement
openEditCompItemModal(catKey, itemId)        // Open modal to edit existing
deleteCompItem(catKey, itemId)               // Delete custom requirement (with confirm)
saveCompItem()                               // Save from modal (add or edit mode)
closeCompItemModal()                         // Close modal
```

**Dynamic Calculations:**
- `calculateCategoryStats(cat)` - Returns { completed, inProgress, planned, pending, percent, totalUnits, completedUnits }
- `calculateOverallStats(competencies)` - Aggregates all categories
- Stats automatically update when items are added/edited/deleted
- Progress ring and bars update in real-time

**Status System:**
- `pending` - Not started (gray)
- `planned` - Planning to do (blue)
- `in_progress` - Working on it (yellow)
- `completed` - Done (green)

For items with `required > 1`, shows counter buttons (−/+) instead of status toggle.

#### Task Block Height Fix (Monthly Planner)
- **Problem:** Task blocks showed content outside colored background
- **Fix:** Changed from `height: ${heightPx}px; min-height: ${minHeight}px;` to just `min-height: ${minHeight}px;`
- Background now expands to fit all content (Google Calendar style)

#### Appointment Card Fix
- **Problem:** "undefined" showing in appointment status
- **Fix:** Added fallback: `const status = apt.status || 'scheduled';`
- Status now shows proper label (Scheduled/Completed/Cancelled/No Show)

#### Firebase Data Structure Update
```
d3Roadmap/
    ├── clinicalData/           ← NEW
    │   ├── patients{}
    │   ├── appointments[]
    │   ├── completedProcedures[]
    │   └── competencies{}      ← Stores all competency progress
    ├── ...existing fields...
```

#### Removed: What's Next Panel
- Removed from Competencies UI (user feedback: "nice but not useful")
- CSS and function kept but not rendered

### v30 Financials Page Overhaul (index.html)

#### Month-by-Month Payment Tracking (NEW SYSTEM)
The financials page now tracks recurring expenses by individual month instead of estimating:
```javascript
financials.monthlyPayments = {
    '2026-02': { paid: false, paidDate: null, label: 'February 2026' },
    '2026-03': { paid: false, paidDate: null, label: 'March 2026' },
    '2026-04': { paid: false, paidDate: null, label: 'April 2026' },
    '2026-05': { paid: false, paidDate: null, label: 'May 1-14', partial: true, fraction: 0.45 }
};
```

#### New Projection Calculation Logic
**Old (broken):** `monthlyBurn × Math.floor(monthsRemaining)` - inaccurate estimate
**New (accurate):** Only subtracts months that are NOT checked off:
```javascript
// For each month in monthlyPayments:
if (!monthData.paid) {
    const fraction = monthData.partial ? monthData.fraction : 1;
    const amount = monthlyBurn * fraction;
    unpaidMonthsTotal += amount;
}
projectedBalance = availableCash - unpaidMonthsTotal;
```

#### Recurring Expenses Management
- **+ Add Expense** button - create new expense categories
- **Edit** button - change amount for any expense
- **Delete ×** button - remove expense categories
- Functions: `addRecurringExpense()`, `deleteRecurringExpense()`, `editRecurringExpense()`

#### Month Payment Tracker UI
- Visual checklist for Feb/Mar/Apr/May
- Click month to toggle paid/unpaid
- Shows paid date when checked
- Running total of unpaid months
- Function: `toggleMonthPaid(monthKey)`

#### Key Date Change
- Changed from May 15 to **May 14** (next loan disbursement date)
- `semesterEndDate: '2026-05-14'` in masterLiquidity

### v29.1 Medication Calendar & Modal Fixes (index.html)

#### Medication Calendar UI Fix
- **Problem:** + note button was overlapping/blocking date numbers
- **Fix:** Moved button to top-right corner with new `.day-note-btn` class
- Button is subtle (60% opacity) until hovering over day cell
- Date numbers now larger and bolder (1.2em, font-weight 700)
- Calendar grid has subtle background with improved spacing
- Weekday headers styled in purple with uppercase

#### Modal Close Button Consistency
- Added `.modal-close-x` class for universal × close buttons
- Added × buttons to: medModal, noteModal, addCountdownModal, helpModal, notebookModal
- Style: 32px circular button, gray background, red on hover
- Cleaned up duplicate `.planner-close-btn` CSS definition

### v29 UI/UX Accessibility & Feedback Overhaul (All 3 Apps)

#### Color Contrast Fixes (WCAG Compliance)
- Replaced all low-contrast grays across apps:
  - `#8b949e` → `#b0b8c4` (better readability)
  - `#94a3b8` → `#b0bcc8` (d3-roadmap specific)
  - `#888` → `#a3a3a3` (index.html specific)

#### Motion Accessibility (prefers-reduced-motion)
All apps now respect user's motion preferences:
```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    .pulse { animation: none; }
}
```

#### Touch Targets (Mobile Accessibility)
- All interactive elements now have 44px minimum hit areas
- Applies to: buttons, checkboxes, data-btns, task items

#### New CSS Classes Added (All Apps)
```css
.empty-state          /* Centered italic message for empty lists */
.loading-spinner      /* 24px purple spinning loader */
.btn-loading          /* Dimmed button with cursor:wait */
```

#### Visual Feedback Animations

**index.html:**
- Task checkboxes: 28px with bounce animation on completion
- Clickable cards: Purple border highlight on hover
- Medication buttons: Green success flash + pulse on log
- Button click feedback: Subtle scale(0.97) on active

**d3-roadmap.html:**
- Editable fields: Pencil icon (✏️) appears on hover
- Help tooltips: `?` icons reveal explanations on hover

**stimulant-elimination-calculator.html:**
- Caffeine buttons: Lift effect on hover + green flash on add
- Sleep prediction: Added explanatory text below result

#### Tooltip System (index.html & d3-roadmap.html)
```css
.help-icon            /* Small ? circle that reveals tooltip on hover */
.help-tooltip         /* Hidden tooltip content, shown on parent hover */
```
- Added 1-3-5 Rule explanation tooltip in Focus Mode
- Improved calendar legend with header and pill-style badges

### v28 Sync Status System (All 3 Apps)
- Added sync status bar in header
- Added "Sync Now" / refresh button for manual refresh
- Added `forceCloudSync()` function
- Added `visibilitychange` handler (save on hide, refresh on show)
- Added fallback timers (3 second timeout ensures app loads)
- Consistent status colors across all apps

### Bug Fixes
- **index.html**: Removed orphan `setupPlannerRealtimeSync()` call that crashed on load
- **All apps**: Better error handling with retry logic for Firebase saves

---

## MOBILE RESPONSIVENESS

### Breakpoints
- 768px (tablet)
- 480px (phone)

### Stimulant Calculator Special
- Container scales at 0.85 transform for less scrolling
- Focus Mode has separate mobile-optimized layout

---

## QUICK REFERENCE

### If Sully says "fix/update [app name]"
1. Ask which file if not clear
2. Copy file to /home/claude/
3. Use `grep` to find the relevant code section
4. Make surgical edits with `str_replace`
5. Copy to /mnt/user-data/outputs/
6. Use `present_files` tool
7. Give deployment steps

### If Sully mentions "at-risk" or "Peds"
- Pediatric Dentistry course
- 77% on Exam 1, needs ~80% on Exam 2 (Feb 18)
- 33.3 points locked in out of 100

### If Sully mentions "sync not working"
- Check `forceCloudSync()` exists and is called
- Check `updateSyncStatus()` exists
- Verify no orphan function calls
- Check Firebase config is correct

### If Sully seems stressed
- Remind him: "Action precedes hope"
- Gym helps clear his head
- The app prevents spiraling

---

## THINGS NOT TO CHANGE WITHOUT CAREFUL TESTING
- Firebase config
- PIN authentication pattern
- Save/sync debounce logic (300ms)
- Grade calculator math
- XR pharmacokinetic model (50/50 split at T+0/T+4)
- Date parsing (MUST use local timezone)
- Sync status indicator logic

---

## KEY DATES (Spring 2026)

### February (BRUTAL MONTH - 5 EXAMS)
- Feb 2: PC2 Midterm (30%)
- Feb 6: Ortho Final (50%)
- Feb 11: Geriatrics Midterm
- **Feb 18: PEDS EXAM 2 (45%) - SURVIVAL EXAM**
- Feb 27: Oral Med Midterm (25%)

### March
- Mar 11: Perio 2 Final (45%)
- Mar 19: PC2 Final (40%)
- Mar 30: Peds Exam 3 (7.5%)
