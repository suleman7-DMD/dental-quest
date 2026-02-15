# CLAUDE.md - Dental Student Quest

## CRITICAL RULES

### Never Rebuild Entire Files
- Files are 11,000-22,000+ lines each
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
| `index.html` | ~22,700 | Main app: Command Center (Triage/Crash Out/Focus), tasks, financials, calendar, medications, notebook |
| `d3-roadmap.html` | ~17,575 | Academic tracker: 11 tabs (grades, deadlines, clinical, competencies, monthly/daily planner, exams, mandatory) |
| `stimulant-elimination-calculator.html` | ~11,526 | Sleep prediction, pharmacokinetic modeling (amphetamine/caffeine/nicotine), workout planner |
| `body-comp-tracker.html` | ~20,158 | Calorie/protein/workout tracking, cross-app ecosystem, V2 analytics, recomp predictor |
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
│   ├── tasks{}                      (object keyed by ID, not array)
│   ├── stats{ totalXPGained, totalTasks, categoryXPGained{} }
│   ├── medications{
│   │     30mg: { pills, refillDate, dosesLogged{}, lastAutoReduceDate, lastManualChange, lastManualChangeType },
│   │     20mg: { pills, refillDate, dosesLogged{}, lastAutoReduceDate, lastManualChange, lastManualChangeType }
│   │   }
│   ├── calendarNotes{}
│   ├── notebook{ pages{}, currentPageId }
│   ├── financials{
│   │     masterLiquidity: { currentCash, loanDisbursementDate, loanAmount, targetCushion, semesterEndDate },
│   │     expenseTemplate{},          (default monthly expenses)
│   │     months{ '2026-02': { label, partial, fraction, expenses{} } },
│   │     oneTimeBills{},             (income + expenses, keyed by ID)
│   │     creditCards[],
│   │     actionItems[]
│   │   }
│   ├── pillAssignments{ 30mg: {}, 20mg: {} }
│   ├── calendarEvents{}             (object keyed by ID, not array)
│   ├── dailyPlanner{}
│   ├── focusModeData{ oneThingId, todaysTasks, microSteps{}, lastPlanningDate }
│   ├── commandCenterData{ crashOut{}, focusStats{}, currentSession{} }
│   └── lastCriticalEODReset
│
├── stimulantCalculator/             (stimulant-elimination-calculator.html)
│   ├── state{
│   │     wakeTime, hoursSleptLastNight,
│   │     medications{},              (object keyed by ID: { dose, time, date })
│   │     caffeine{},                 (object keyed by ID: { amount, time, date })
│   │     allNighterMode,
│   │     modifiers{ vitaminC: { active, time, date }, heavyLift: { active }, sauna: { active, time, date } },
│   │     nicotine{ active, type, lastHitTime },
│   │     workoutPlan{ active, time, duration, type, intensity, fasted, coldShower, applied, adenosineBonus, cortisolDelay, thermalDelay },
│   │     settings{ ampHalfLife, sleepThreshold, caffHalfLife, caffThreshold, weight },
│   │     history{},                  (object keyed by ID: predictions with accuracy)
│   │     sleepHistory{},             (keyed by YYYY-MM-DD: { hoursSlept, wakeTime })
│   │     projectedSleepTime,        ← Body Comp reads this
│   │     projectedSleepMinutes,
│   │     _version: 0, _dataLoaded
│   │   }
│   └── lastUpdated
│
├── d3Roadmap/                       (d3-roadmap.html)
│   ├── pedsLockedIn (default: 33.3)
│   ├── mandatoryItems{}             (7 auto-fail items, boolean flags)
│   ├── grades{}                     (per-course: { componentId: grade })
│   ├── editedDeadlines{}
│   ├── customDeadlines{}            (object keyed by ID, not array)
│   ├── deletedDeadlines{}           (object keyed by ID)
│   ├── completedDeadlines{}         (deadline grades + completion tracking)
│   ├── examStudyProgress{}          (lecture study tracking per exam)
│   ├── exams{}                      ← Body Comp reads this (object keyed by ID)
│   ├── monthlyPlanner{
│   │     notes{}, customTasks{}, overriddenStatic{}, completedTasks{}
│   │   }
│   ├── clinicalData{
│   │     patients{}, appointments{}, completedProcedures{},
│   │     competencies{
│   │       [category]: { name, icon, color, notes, sections{ [id]: { title, items{ [id]: {...} } } } }
│   │     }
│   │   }
│   ├── dailyPlanner{ date, focus, notes, blocks{}, pomodorosCompleted, bedtime }
│   ├── lastSaved
│   ├── _version: 0
│   └── _dataLoaded
│
└── bodyCompTracker/                 (body-comp-tracker.html)
    ├── state{
    │     profile: {
    │       currentWeight_lbs, startingWeight_lbs, goalWeight_lbs,
    │       height_cm, height_inches, age, startingBodyFat,
    │       tdee_base, tdee_original, lastMilestone, startDate,
    │       targetDate, sleepBaseline, activityLevel
    │     },
    │     settings: { focusMode, hideSleepDebtWarnings },
    │     today: {
    │       date, sleepHours, activeCalories, isBrainDay, mode,
    │       targets: { calories, protein, carbs, floor },
    │       meals{},                 (object keyed by meal_ID)
    │       workouts{},              (object keyed by workout_ID)
    │       setupComplete, workedOut, magnesiumTaken, waterGoalMet,
    │       cnsProtectionAwarded, lastMealTime,
    │       calTargetAwarded, proteinTargetAwarded, perfectDayAwarded,
    │       alerts: { undereatingShown, lowProteinShown }
    │     },
    │     frequentFoods{},           (object keyed by ff_ID)
    │     weighIns{},                (object keyed by weighIn_ID)
    │     bodyCompHistory{},         (object keyed by measurement_ID)
    │     dailyLogs{ [YYYY-MM-DD]: { date, sleepHours, calories, protein, carbs, deficit,
    │                                 meals{}, workouts{}, ecosystemSnapshot{}, logicLog{} } },
    │     refeedTracker: { cumulativeDeficit, lastRefeedDate, weeksInDeficit, lastDietBreak },
    │     gamification: { xp, level, streak, longestStreak, totalDaysTracked, perfectDays, badges{}, lastCompletedDate },
    │     achievements{},            (12 achievements with unlock tracking)
    │     ecosystemContext{},        (READ-ONLY, never saved to Firebase — stripped by saveToFirebase)
    │     _version: 0, _lastModified, _dataLoaded
    │   }
    └── lastUpdated
```

### Sync Pattern (All 4 Apps)
```javascript
// On load:
loadFromFirebase() → merge with defaults → initUI()

// On save:
saveData/saveState() → localStorage IMMEDIATELY → Firebase debounced (2s)

// On visibility change:
hidden → save immediately (saveDataImmediate/saveStateImmediate)
visible → refresh from Firebase (forceCloudSync)

// Sync status: 🟢 connected | 🔄 syncing | 🔴 offline | ⚠️ error
```

### Per-App Save Function Names
| App | Primary Save | Immediate Save | Guard Count |
|-----|-------------|----------------|-------------|
| index.html | `saveData()` | `saveDataImmediate()` | 4 guards |
| d3-roadmap | `saveData()` | — | 5 guards |
| stim-calc | `saveState()` | `saveStateImmediate()` | 5 guards (identical) |
| body-comp | `saveState()` | `saveStateImmediate()` | 5 / 4 (bug: missing PIN) |

### Collection Safety (All 4 Apps)
All collections use **objects with ID keys** (not arrays) for Firebase safety:
```javascript
generateId(prefix)    // 'meal_abc123', 'task_xyz789'
getValues(collection) // Safe object→array for iteration (handles undefined/arrays/objects)
getCount(collection)  // Safe key count
```
Firebase silently corrupts sparse arrays into objects — all apps migrated in Jan 2026.

### Cross-App Navigation
All 5 HTML files share a `<nav class="cross-app-nav">` bar linking to each app.

### Deployment
- **GitHub Pages**: Auto-deploys on push to `main` branch
- **No build step**: Push HTML → live in ~30 seconds
- **URL pattern**: `https://suleman7-dmd.github.io/dental-quest/[filename]`
- **Default**: `index.html` loads at root URL

---

## SYNC PROTECTION SYSTEM (CRITICAL)

### The Data Wipe Bug (FIXED Jan 2026)
Opening any app on a fresh browser/device would wipe all cloud data because:
- Default state had `_version: Date.now()` (NEWER than cloud)
- App thought local was newer → overwrote cloud with empty data

### 9 Firebase Bulletproof Fixes (All 4 Apps)
1. Default `_version = 0` (not `Date.now()`) + `_dataLoaded = false`
2. `isEmptyState()` — app-specific validation (see table below)
3. Sync protection flags: `isInitialLoad` / `hasLoadedFromCloud` / `pinValidated`
4. Guards in save functions (4-5 guards, see per-app sections)
5. Protected `loadFromFirebase()` — sets flags AFTER loading
6. Protected realtime listener — only processes updates AFTER initial load
7. Protected visibility handlers — only syncs if `!isInitialLoad && hasLoadedFromCloud`
8. Version comparison on load — cloud wins if local `_version === 0` or local is empty
9. Merge strategy preserves cloud data — never overwrites cloud with empty local state

### App-Specific Guard Differences
| App | Flag Name | Guard Count | Notes |
|-----|-----------|-------------|-------|
| index.html | `initialLoadComplete` | 4 | No `_dataLoaded` check. Guards only apply when `firebaseInitialized`. |
| d3-roadmap | `isInitialLoad` | 5 | PIN guard last (`firebaseSyncEnabled && !pinValidated`). |
| stim-calc | `isInitialLoad` | 5 | Both `saveState` + `saveStateImmediate` have identical guards. |
| body-comp | `isInitialLoad` | 5 / 4 | `saveStateImmediate` missing PIN guard (known bug). |

### App-Specific isEmptyState() Checks
| App | Empty If Missing ALL Of |
|-----|------------------------|
| index.html | tasks, calendarNotes, calendarEvents, notebook.entries, stats.totalXPGained, focusModeData, commandCenterData |
| d3-roadmap | customDeadlines, customTasks, appointments, blocks, notes, patients, completedDeadlines, examStudyProgress, grades, exams, editedDeadlines |
| stim-calc | medications, caffeine, history, sleepHistory, allNighterMode, _dataLoaded |
| body-comp | weighIns, today.meals, today.workouts, dailyLogs, bodyCompHistory, today.setupComplete |

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

## INDEX.HTML (DENTAL QUEST MAIN APP)

### File Layout (~22,700 lines)
| Range | Content |
|-------|---------|
| 1-10,580 | **CSS** — all styles, responsive breakpoints, animations |
| 10,582-11,947 | **HTML** — structure, modals, all UI elements |
| 11,949-22,705 | **JavaScript** — all app logic |

### CSS Layout
| Range | Content |
|-------|---------|
| 1-700 | Global, layout, cross-app nav, stats, category tabs, task items |
| 700-1400 | Command Center modes (triage columns, crash out, focus) |
| 1400-2450 | Modals, animations, medication tracker |
| 2450-2760 | Responsive breakpoints (1024px, 768px, 480px) |
| 2761-4750 | Financial Cockpit (dark theme, stats grid, cards) |
| 4808-5540 | Daily Planner, Notebook |
| 5541-5790 | Calendar, pill assignment grid |
| 5790-6640 | Focus View design system (CSS variables, 25+ keyframe animations) |
| 6640-7930 | Crash Out timeline (vertical rail, Google Calendar grid, NOW marker) |
| 7930-8530 | Duration modal, old focus mode, responsive, tooltips, celebrations |
| 8530-9280 | New Focus/Pomodoro (SVG circular timer, checklist, completion) |
| 9280-9750 | Gamification (XP badges, level-up, streak fire animations) |
| 9750-10,070 | Mobile compact header, hamburger menu |
| 10,070-10,260 | Quick Add FAB (floating action button + bottom sheet) |
| 10,260-10,580 | Full View mobile overhaul v2 (2-row task layout, category tints) |

### HTML Structure
| Range | Content |
|-------|---------|
| 10,582-10,597 | Loading overlay |
| 10,598-10,674 | Mobile compact header + hamburger menu |
| 10,676-10,768 | Desktop header, cross-app nav, stats bar |
| 10,770-10,795 | Dashboard expansion modals (Do Today / Remaining / Completed) |
| 10,797-10,982 | Triage Mode (3 columns, scheduled, rolled over, quick add) |
| 10,984-11,095 | Crash Out Mode (sleep setup, timeline, unscheduled pool) |
| 11,097-11,250 | Focus/Pomodoro (SVG timer, checklist, completion modal) |
| 11,255-11,436 | Full View (category tabs, add form, medication tracker) |
| 11,438-11,870 | Modals (med settings, calendar, financials, notebook, planner) |
| 11,872-11,947 | Planning modal, task edit modal, achievement popup |

### JavaScript Layout
| Range | Content |
|-------|---------|
| 11,949-12,000 | Firebase config, sync flags, `isEmptyState()` |
| 12,034-12,454 | App variables (tasks, stats, medications, financials, etc.) |
| 12,455-12,700 | Data integrity utilities (`generateId`, `getValues`, migrations) |
| 12,701-12,900 | Backup manager, `loadData()` |
| 12,901-13,080 | `saveData()` with 4 sync guards, debounced Firebase save |
| 13,080-13,600 | `saveDataImmediate()`, toast/alert, checkpoint system |
| 13,600-13,850 | Export/import, data management |
| 13,850-14,140 | Firebase init, `loadDataFromFirebase()`, PIN validation |
| 14,140-14,420 | Visibility handlers, online/offline, periodic heartbeat |
| 14,425-14,740 | Medication tracking (`updateMedCard`, `takeMed`, pill auto-reduce) |
| 14,740-15,940 | Financial Cockpit (all 7 render functions + help modal) |
| 15,940-16,540 | Master Calendar + Countdowns |
| 16,540-17,160 | Daily Planner + Critical EOD Reset |
| 17,160-17,660 | Realtime sync, conflict resolution, force upload/pull |
| 17,660-17,900 | Notebook (multi-page editor) |
| 17,900-18,090 | Calendar notes, pill interactive system |
| 18,090-18,520 | Task rendering (2-row layout), `addTask()`, drag-drop |
| 18,520-18,690 | Task completion, toggle, delete, old pomodoro timer |
| 18,690-18,920 | Dashboard expansions, `updateStats()` |
| 18,920-19,515 | Focus Mode v1 (One Thing, micro-steps, task budget) |
| 19,515-19,685 | Command Center core, tab switching, greeting, progress |
| 19,685-20,310 | Triage Mode (tiers, columns, task cards, drag-drop) |
| 20,310-20,670 | Task details modal, time prompts, push logic |
| 20,670-20,960 | Crash Out timeline setup + rendering |
| 20,960-21,140 | Google Calendar grid overlay + timeline tasks |
| 21,140-21,480 | Timeline drag-drop reordering (swap, move, position) |
| 21,480-21,680 | Duration helpers, unscheduled pool, crash out state |
| 21,680-22,100 | Focus/Pomodoro (timer, checklist, completion flow) |
| 22,100-22,225 | Gamification (XP, celebrations, streaks) |
| 22,225-22,350 | Rollover logic, Perfect Day, streak updates |
| 22,350-22,470 | Task edit modal, `initFocusMode()`, responsive layout |
| 22,475-22,610 | Quick Add FAB (panel, submit, category pills) |
| 22,610-22,705 | Header menu, sync dot, compact header hooks |

### Two Views
- **Full View** (`currentView = 'full'`): 8 category tabs (dotoday, financial, clinic, health, school, academic, future, life). Traditional task list with add form, medication tracker.
- **Focused View** (`currentView = 'focus'`): Command Center with 3 modes. Switch via `switchToFocusMode()` / `switchToFullView()`.

### Task Pipeline
```
Full View (category lists) → "Do Today" flag → Focused View Triage
    → Tier assignment (Locked In / Today / Tomorrow)
    → Crash Out scheduling (time-blocked)
    → Focus session (pomodoro timer)
    → Completion (XP awarded)
```

### Command Center (3 Modes)
Controlled by `commandCenterMode`: `'triage'` | `'crashout'` | `'focus'`

**Triage** — 3 columns (Locked In / Today / Tomorrow) + Scheduled + Rolled Over. Drag between columns. Quick add.
**Crash Out** — Sleep-time-anchored timeline. Google Calendar grid view. Duration adjustment. Push/dismiss prompts.
**Focus** — SVG circular pomodoro timer. Checklist. Duration toggles (15/25/50 min). Completion flow with XP + confetti.

### Sync Guards in saveData() (line ~12,902)
```javascript
// GUARD 0: if (firebaseInitialized && !pinValidated) return;
// GUARD A: if (firebaseInitialized && !initialLoadComplete) return;
// GUARD B: if (firebaseInitialized && !hasLoadedFromCloud) return;
// GUARD C: if (firebaseInitialized && isEmptyState(data)) return; // still saves to localStorage
```
**Note**: index.html uses `initialLoadComplete` (not `isInitialLoad` like other apps). 4 guards, not 5 — no `_dataLoaded` check.

### Key State Variables
| Variable | Line | Purpose |
|----------|------|---------|
| `tasks` | 12,038 | Object keyed by ID (not array) |
| `currentView` | 12,047 | `'focus'` or `'full'` |
| `currentCategory` | 12,037 | Active category filter |
| `commandCenterMode` | 19,519 | `'triage'` / `'crashout'` / `'focus'` |
| `commandCenterData` | 12,060 | Crash Out config, focus stats, current session |
| `focusModeData` | 12,048 | One Thing ID, micro steps, today's tasks |
| `stats` | 12,084 | XP totals, task counts, per-category XP |
| `medications` | 12,098 | 30mg + 20mg pill objects |
| `financials` | 12,131 | Cash, months, expenses, credit cards |
| `calendarNotes` | 12,117 | Date-keyed note strings |
| `calendarEvents` | 12,122 | ID-keyed calendar events |
| `notebook` | 12,125 | Pages (keyed by ID), current page |

### Task Fields
| Field | Purpose |
|-------|---------|
| `id`, `text`, `category`, `completed`, `createdAt` | Core fields |
| `doToday` | Shows in Focused View |
| `size` | `small`/`medium`/`big` (15/30/60 min) |
| `highLeverage` | 80/20 priority flag |
| `sortOrder` | Position in category list |
| `triageTier` | `lockedIn`/`today`/`tomorrow` |
| `triageOrder`, `triageDate` | Position + date within tier |
| `crashOutScheduled`, `crashOutTime`, `crashOutDuration`, `crashOutOrder` | Crash Out timeline fields |
| `rolledOver` | `{ fromDate, wasTier }` from previous day |
| `xp`, `completedAt` | Gamification + completion tracking |

### 4 Task Creation Sites (MUST update all when adding task fields)
1. `addTask()` — line ~18,265 (Full View add form)
2. `triageQuickAddTask()` — line ~20,176 (Triage quick add)
3. `quickAddFromFocus()` — line ~19,343 (Focus mode add)
4. `submitQuickAdd()` — line ~22,572 (Quick Add FAB)

### XP & Gamification
- Levels = 500 XP each. Awards: lockedIn=50, crashOut=75, rolledOver=40, default=25 XP
- Perfect Day (all tasks done, 3+ tasks) = 200 XP bonus
- `awardCommandCenterXP(amount, reason)` — adds to both focusStats and stats
- Streak tracking: daily + locked-in streaks with fire animation tiers

### Critical EOD Reset
`checkCriticalEODReset()` runs on app load. At 5 AM: clears `mustComplete` flags, resets Focus Mode daily tasks, syncs reset date across devices.

### Mobile UI
- **Compact header**: Sticky, blur backdrop, sync dot, today pill, streak pill, view toggle, hamburger menu
- **Quick Add FAB**: Fixed bottom-right purple button, opens bottom sheet panel
- **2-row task layout**: Row 1 = checkbox + icon + text. Row 2 = badges + buttons. Uses explicit DOM (not flex-wrap) for iOS Safari compatibility.
- **Breakpoints**: 1024px (single column), 768px (mobile overhaul), 480px (extra-small)

---

## D3-ROADMAP.HTML (ACADEMIC TRACKER)

### File Layout (~17,575 lines)
| Range | Content |
|-------|---------|
| 1-5,520 | **CSS** — all styles, responsive breakpoints |
| 5,523-8,380 | **HTML** — header, 11 tabs, 6 modals |
| 8,383-17,575 | **JavaScript** — all app logic |

### CSS Layout
| Range | Content |
|-------|---------|
| 1-200 | Global, cross-app nav, header, back button |
| 200-560 | Tab nav (sticky), cards, Do Today widget (cross-app sync) |
| 560-950 | Alerts, tables, status/countdown/risk badges, tooltips, editable fields |
| 950-1300 | Priority items, course cards, grade calculator, checklists, grid layouts |
| 1300-1700 | Responsive breakpoints (768px, 480px), toasts, notes, study phases |
| 1700-2120 | Exam Content tab (exam cards, lecture rows, checkboxes) |
| 2120-2720 | Daily Planner (timeline, pomodoro timer, task input) |
| 2720-3050 | Monthly Planner (week cards, calendar grid, sidebar) |
| 3050-3450 | Calendar task blocks (color-coded by type), untimed tasks |
| 3450-4500 | Modals, Clinical tab (patients, appointments, competencies) |
| 4500-5000 | Competencies dashboard (progress rings, category trees, status toggles) |
| 5000-5520 | Always Remember tab (motivational content, purple/gold theming) |

### HTML Structure
| Range | Content |
|-------|---------|
| 5,523-5,562 | Cross-app nav, header, sync controls, checkpoint buttons, 11 tab buttons |
| 5,564-5,747 | Dashboard tab (Peds alert, Do Today sync, stats, countdowns, priorities) |
| 5,749-5,852 | Deadlines tab (monthly tables Jan-Apr, add deadline button) |
| 5,854-6,200 | Courses tab (8 collapsible course cards with component tables) |
| 6,201-6,270 | Grades tab (course selector, grade entry, target grade, results) |
| 6,272-6,318 | Exam Content tab (course selector, exam cards container) |
| 6,320-6,574 | Classmate Share tab (risk summary, 6 course sections, collaboration plan) |
| 6,576-6,744 | Mandatory tab (7 auto-fail items checklist, study phases, exam countdown) |
| 6,746-6,913 | Daily Planner tab (live clock, timeline, pomodoro, notes) |
| 6,915-6,997 | Monthly Planner tab (week toolbar, sidebar with notes + stats) |
| 7,000-7,096 | Clinical tab (stats row, 3 subtabs: Patients/Appointments/Competencies) |
| 7,098-7,935 | Always Remember tab (motivational content, mainstage + legacy sections) |
| 7,938-8,380 | Modals (Patient, Appointment, Lecture Import, Clinical Import, Competency Item, MP Task) |

### JavaScript Layout
| Range | Content |
|-------|---------|
| 8,383-8,460 | Firebase config, `roadmapData` default state |
| 8,465-8,553 | `getDefaultRoadmapData()`, sync flags, `isEmptyState()` |
| 8,555-8,700 | Daily planner state, exam content data (hardcoded courses/lectures) |
| 8,700-9,110 | Exam content data continued (all 7 courses with lectures) |
| 9,113-9,486 | `updateSyncStatus()`, `deepMerge()`, connection monitor, backup system |
| 9,487-9,635 | PIN auth, `ensureArray()`, `generateId()`, `getDeadlineId()`, Firebase key sanitization |
| 9,635-9,755 | Competency/planner migrations (array → object) |
| 9,757-9,905 | `loadFromLocalStorage(finalize)`, `loadFromFirebase()` |
| 9,906-10,190 | Realtime sync, cross-app Do Today sync, `forceCloudSync()` |
| 10,190-10,310 | `applyRemoteData()` (explicit field merge, no raw spread) |
| 10,310-10,835 | Checkpoint system (create, restore, export, import — 7 flexible formats) |
| 10,835-10,990 | `forceUploadToCloud()`, `forcePullFromCloud()` |
| 10,990-11,120 | `saveData()` with 5 sync guards + debounced Firebase |
| 11,120-11,190 | STATIC_DEADLINES array (44 deadlines), exams array (9 exams) |
| 11,190-11,830 | Dashboard rendering, deadline table generation, `initUI()` helpers |
| 11,830-11,910 | `courseStructures` (6 courses for grade calculator) |
| 11,910-12,210 | Grade calculator (`calculateNeeded()`, `syncGradeToDeadline()`) |
| 12,210-12,260 | Toast, custom alert/confirm |
| 12,260-12,755 | Deadline management (add, toggle, grade input, delete) |
| 12,755-13,530 | Exam content rendering (exam cards, lecture lists, study progress) |
| 13,530-13,860 | Clinical tab init, patient management (CRUD, search/filter) |
| 13,860-14,125 | Appointment management (CRUD, deadline linking) |
| 14,125-14,980 | Competencies (12 default categories, progress rings, status toggles, CRUD) |
| 14,980-15,235 | Lecture import (flexible parsing, preview, confirm) |
| 15,235-15,500 | Clinical import (axiUm format, refresh mode, sync to Monthly Planner) |
| 15,500-15,745 | `initUI()` (main initialization — restores all state, syncs exams to Firebase) |
| 15,745-15,870 | `init()`, visibility/beforeunload handlers, fallback inits |
| 15,870-16,430 | Daily Planner (clock, pomodoro, timeline 5AM-1AM, task CRUD) |
| 16,430-17,575 | Monthly Planner (Google Calendar grid, week management, task modal, notes) |

### 11 Tabs
1. **Dashboard** — Peds at-risk alert, Do Today cross-app sync, countdown sections, priorities
2. **Deadlines** — Monthly tables (Jan-Apr) with stable-ID-based completion tracking
3. **Courses** — 8 collapsible course cards with component tables and alerts
4. **Grades** — Grade calculator with course selector, target grade, needed average
5. **Exam Content** — Lecture study tracking per exam with checkboxes and progress
6. **Classmate Share** — Collaboration risk assessment and planning
7. **Mandatory** — 7 auto-fail items checklist with study phase allocation
8. **Daily Planner** — 5AM-1AM timeline, pomodoro timer, deadline dropdown
9. **Monthly Planner** — Google Calendar-style grid, static + custom tasks, notes
10. **Clinical** — 3 subtabs: Patients (CRUD), Appointments (CRUD), Competencies (12 categories)
11. **Always Remember** — Personal motivational content

### Sync Guards in saveData() (line ~10,992)
```javascript
// GUARD A: if (isInitialLoad) return false;
// GUARD B: if (!hasLoadedFromCloud) return false;
// GUARD C: if (isEmptyState(roadmapData)) return false;
// GUARD D: if (!roadmapData._dataLoaded) return false;
// GUARD E: if (firebaseSyncEnabled && !pinValidated) return false;
```
5 guards. Uses `isInitialLoad` (not `initialLoadComplete` like index.html). Includes `_dataLoaded` check.

### Cross-App Integration
- **Reads FROM index.html**: Do Today tasks synced via `setupMainAppTasksSync()` (realtime Firebase listener)
- **Writes TO Firebase**: `roadmapData.exams` synced for Body Comp cross-app reads
- **Static → Custom conversion**: Static tasks can be edited → converted to custom via `overriddenStatic` tracking

### Key Data Patterns
- **Deadline IDs**: `getDeadlineId(deadline)` generates stable IDs from properties (not array indices)
- **Array → Object migration**: All arrays migrated to objects with ID keys for Firebase safety
- **Competency migration**: `migrateCompetencies()` converts sections/items arrays to objects
- **loadFromLocalStorage(finalize)**: `finalize=true` for terminal path, `finalize=false` when called from loadFromFirebase

### Monthly Planner Architecture
- **5 base weeks** (Jan 19-Feb 22) with critical week markers
- **Dynamic week extension**: `extendWeeksIfNeeded()` generates weeks beyond base based on latest task/appointment date
- **Google Calendar grid**: Dynamic hour range, smart row heights (80px with tasks, 40px empty), positioned task blocks
- **Task types**: lecture (yellow), clinic (cyan), exam (red), academic (purple), life (green), mandatory (orange)
- **Static task conversion**: Editing a static task creates custom task + `overriddenStatic` entry

### Competencies System (12 Categories)
Fixed, Operative, Dentures, RPDs, SRPs, Endo, Oral Surgery, Peds, Perio, Group Practice (+ custom)
- Object-based storage with sections/items
- Status toggles: planned → in_progress → completed
- Counter items for multi-count requirements (e.g., "4 SRPs needed")
- Progress rings (SVG) and expandable category sections

### 6 Courses in Grade Calculator
| Course | Key Components |
|--------|----------------|
| Oral Medicine | 10 quizzes (2.5% each), Midterm (25%), Final (40%), Passion Project (12.5%) |
| Pain Control 2 | Midterm (30%), Final (40%), Take-Home Exams (24%), Other (6%) |
| Critical Thinking | Quiz 1 (5%), Quiz 2 (5%), Group Project (30%), Systematic Review (30%), Final (30%) |
| Peds | Exam 1 (40%), Exam 2 (45%), Exam 3 (7.5%), Headstart (2.5%), Ortho Module (5%) |
| Perio 2 | Midterm (40%), Final (45%), Written Assignment (10%), Discussion (5%) — **65% pass** |
| Ortho | Midterm (50%), Final (50%) |

---

## BODY COMP TRACKER (body-comp-tracker.html)

### File Layout (~20,158 lines)
| Range | Content |
|-------|---------|
| 1-5,962 | **CSS** — dark theme, responsive, glassmorphism, 13 animations |
| 5,963-7,343 | **HTML** — cross-app nav, header, simple view, setup screen, ~16 modals |
| 7,344-20,158 | **JavaScript** — all app logic |

### CSS Layout
| Range | Content |
|-------|---------|
| 1-90 | Global, cross-app nav, body gradient |
| 91-600 | Header, checkpoint system, mode banner, targets grid, progress bars |
| 600-1050 | Meals section, modals, metabolic modal, carb target, form elements |
| 1050-2500 | Frequent foods, setup screen, simple view, body comp tabs |
| 2500-3400 | Navy method, calendar heatmap (8 statuses), achievements grid, celebrations |
| 3400-4050 | Weekly summary, dashboard tabs, progress tab (summer goal, weight chart, deficit) |
| 4050-4500 | Calendar tab, badges tab, confetti/bounce/pulse animations |
| 4500-4760 | Mobile optimizations (480px, touch targets, reduced motion) |
| 4760-5270 | V2.0 styles (comp cards, nudge banners, refeed, TDEE, meal items, export) |
| 5270-5810 | Phase 2 UI (header dropdown, import modal, weighin history, collapsible cards) |
| 5810-5962 | Desktop 2-column (900px), date picker, scrollbar styling |

### HTML Structure
| Range | Content |
|-------|---------|
| 5,963-5,972 | Cross-app navigation bar |
| 5,974-6,019 | Header (title, sync status, consolidated dropdown menu) |
| 6,024-6,246 | Simple View dashboard (status hero, progress bars, context cards, meals, workouts, checklist) |
| 6,247-7,343 | Setup screen + modals (quick meal, workout, body comp, settings, import, weekly export, etc.) |

### JavaScript Layout
| Range | Content |
|-------|---------|
| 7,344-7,460 | `getDefaultState()` factory (~110 lines) |
| 7,462-7,660 | State declaration (separate from factory for direct reference) |
| 7,662-7,688 | Sync flags, `isEmptyState()` (6 checks), `hasRealData()` |
| 7,689-7,875 | Data integrity utilities (`ensureArray`, `migrateArrayToObject`, `generateId`, `getValues`, `getCount`) |
| 7,877-8,080 | Firebase config, connection monitor, timezone helpers (`formatTimeET`, `getCurrentTimeET`) |
| 8,080-8,260 | Core algorithms (`calculateTDEE`, `calculateMode`, `calculateTargets`, `getTodayTotals`) |
| 8,260-8,560 | **V2 shared infrastructure** (`determineDayStatus`, `calculateDayCalScore/ProteinScore/DeficitScore`, `recalculateAllDayLogs`) |
| 8,560-9,010 | Simple View rendering (`renderSimpleView` → 6+ sub-renders), tab navigation |
| 9,040-9,320 | Schedule awareness (`renderScheduleCard`, `getScheduleAwareNudge`, `getExpectedProgress`) |
| 9,173-9,320 | Exam Day protocol (5 phases: MORNING_PREP → POST_EXAM) |
| 9,324-9,500 | Sleep debt calculation + severity + mode override warnings |
| 9,510-9,700 | Exam stress multiplier, caffeine×Adderall combined effect modeling |
| 9,700-9,930 | Tomorrow preview, evening prep nudge, weekly rhythm analysis, protein distribution |
| 9,933-10,120 | Status engine (`getSimpleStatus`) + 11-priority nudge system (`getEatingNudge`) |
| 10,120-10,260 | Workout recommendation (gym streak, sleep-based, exam override) |
| 10,260-11,320 | Meal/workout tracking (CRUD, historical editing, date moves, TDEE recalculation) |
| 11,320-11,610 | Import from Claude (MEAL\|/WORKOUT\| pipe format), historical import modals |
| 11,610-11,670 | Morning setup (`startDay()`) |
| 11,670-12,000 | Workout modal, quantity selector, quick meal modal |
| 12,000-12,470 | Workout logging, micronutrients, weigh-in modal, export system |
| 12,470-12,960 | Weekly export + logic log (9-section diagnostic) |
| 12,960-14,070 | Body comp modal (Navy method + scale), UI/UX functions, settings, data management |
| 14,070-14,940 | Frequent foods manager, default foods (26 items), import/confirm data |
| **14,942-15,135** | **CRITICAL**: `saveState()` (5 guards) + `saveStateImmediate()` (4 guards — known bug: missing PIN guard) |
| 15,135-15,365 | `saveToFirebase()` (strips ecosystemContext), `loadFromFirebase()` + merge |
| 15,366-15,560 | `setupRealtimeSync()` (version-compared), `loadState()` |
| 15,562-15,980 | Checkpoint system (create, restore, export, import — flexible formats) |
| 15,980-16,110 | `forceUploadToCloud()`, `forcePullFromCloud()` |
| 16,110-16,340 | Firebase init, PIN auth (`setupUserAuth` → ecosystem load + realtime listener) |
| 16,340-16,640 | `loadEcosystemData()` (reads 4 Firebase paths), `loadTodaySchedule()` |
| 16,640-16,810 | Ecosystem refresh (60s polling) + stimulant realtime listener |
| 16,810-16,975 | Gamification (10 levels, XP rewards, `awardXP`, `updateStreak`, `checkAchievements`) |
| 16,976-17,710 | Progress tab (13+ sub-renderers: body comp trend, refeed, summer goal, weight chart, deficit, weekly) |
| 17,710-18,050 | **V2 aggregation**: `aggregateDailyLogs(start, end)`, `calculateWeekScore`, `scoreToGrade` |
| 18,050-18,920 | **V2 analytics**: daily snapshot, workout stats, macro timing (ISSN), deficit sustainability (CV), recomp predictor (Longland/Mifflin-St Jeor) |
| 18,920-19,140 | Sleep performance insight, achievement progress, lifetime stats |
| 19,142-19,555 | Calendar heatmap (8 statuses), month stats, day details modal, `copyDayLog()` |
| 19,558-19,630 | Achievements/badges tab rendering |
| 19,636-19,750 | `initializeUI()`, `autoStartDay()`, `showManualSetup()` |
| 19,754-19,830 | Event listeners (beforeunload, visibility change, escape key) |
| 19,833-20,005 | End-of-day auto-save, `autoResetForNewDay()`, `saveDayLogWithSnapshot()` |
| 20,008-20,121 | Data integrity (`checkStorageHealth`, `verifyDayLogIntegrity`, `auditRecentDailyLogs`) |
| 20,127-20,158 | DOMContentLoaded (load → Firebase init → end-of-day schedule → V2 migration → 5-min auto-save → health audit) |

### Save Chain (Every data mutation must follow this)
```
mutate state → saveState() → saveDayLog() → re-render
```
- `saveState()` (line 14,942): localStorage immediately + Firebase debounced 2s. **5 guards.**
- `saveDayLog()` (line 12,228): Snapshot `state.today` → `state.dailyLogs[date]` with deep-copy meals/workouts, calculated totals, ecosystem snapshot, logic log.
- `saveToFirebase()`: Strips `ecosystemContext` before saving (READ-ONLY data, never saved back).

### Sync Guards in saveState() (line ~14,942)
```javascript
// GUARD 0: if (!pinValidated) return false;
// GUARD A: if (isInitialLoad) return false;
// GUARD B: if (!hasLoadedFromCloud) return false;
// GUARD C: if (isEmptyState(state)) return false;
// GUARD D: if (!state._dataLoaded) return false;
```
5 guards. Uses `isInitialLoad` (same as d3-roadmap/stim-calc). **Known bug**: `saveStateImmediate()` (line 15,137) has only 4 guards — missing Guard 0 (PIN check).

### Cross-App Ecosystem Integration (READ-ONLY)
```
Source App              | Firebase Path                          | Data Pulled
------------------------|----------------------------------------|---------------------------
Stimulant Calculator    | /stimulantCalculator/state             | sleepHours, wakeTime, medications, caffeine, projectedSleepTime, allNighterMode
Dental Quest            | /appData/medications                   | 30mg count, 20mg count, refill dates
D3 Roadmap              | /d3Roadmap/exams                       | exam schedule for "exam week" detection
D3 Roadmap              | /d3Roadmap/monthlyPlanner              | today's schedule for eating windows + blocked windows
```
- Loaded via `loadEcosystemData(pin)` (line 16,211) + `loadTodaySchedule()` (line 16,480)
- Refreshed via 60-second polling (`startEcosystemRefresh`) + stimulant realtime listener
- **Never saved to Firebase** — `saveToFirebase()` strips `ecosystemContext`

### Ecosystem Context Structure
```javascript
state.ecosystemContext = {
    stimulant: { sleepHours, wakeTime, lastAdderallTime, lastAdderallDose,
                 totalAdderallToday, isBooster, lastCaffeineTime, caffeineMg,
                 projectedSleepTime, allNighterMode, lastSynced },
    inventory: { pills30mg, pills20mg, refillDate30mg, refillDate20mg,
                 daysUntilRefill, willRunOut, lastSynced },
    academic:  { nextExam, daysUntilExam, upcomingExams[], lastSynced },
    schedule:  { todayTasks[], tomorrowTasks[], blockedWindows[], eatingWindows[],
                 totalEatingHours, frontLoadRequired, frontLoadDeadline,
                 scheduleIntensity, lastSynced },
    examDay:   { isExamDay, examName, examTime, minutesUntilExam, phase },
    sleepDebt: { last7Days[], totalSleep, avgSleep, weeklyDebt,
                 consecutiveBadNights, severity },
    stimulantEffect: { adderallEffect, caffeineEffect, combinedEffect,
                       suppressionLevel, suppressionEnd, crashRiskWindow }
};
```

### Mode System
| Sleep Hours | Mode | Deficit | Training |
|-------------|------|---------|----------|
| 6+ hrs | GREEN | 500 cal | Normal |
| 5-6 hrs | YELLOW | 300 cal | Light |
| <5 hrs / allNighterMode | ORANGE | 0 (maintenance) | Recovery only |

**Sleep Debt Warnings** (not forced overrides — user decides):
- SEVERE debt → WARNING suggesting ORANGE mode
- HIGH debt → WARNING suggesting YELLOW mode

### 11-Priority Nudge Engine (`getEatingNudge`)
1. Schedule-aware (block starting, front-load deadline)
2. Enhanced stimulant (combined Adderall+caffeine suppression)
3. Peak suppression (0-4h post-dose, <400 cal)
4. Wearing-off (4-8h post-dose, <800 cal)
5. Crash zone (8+ hrs post-dose, <1000 cal)
6. Late sleep projected (midnight+ sleep, <70% cal by 6pm)
7. Evening protein (<50% protein target after 6pm)
8. Time checkpoint (expected pace vs actual)
9. Evening prep (tomorrow preview 7-10pm)
10. Weak day (historically weak day of week)
11. Protein distribution (>50% after 6pm)

### Exam Day Protocol (5 Phases)
MORNING_PREP (4+ hrs) → PRE_EXAM (1-4 hrs) → FINAL_HOUR → DURING_EXAM → POST_EXAM
Each phase gives specific nutrition guidance (carbs timing, caffeine cutoff, meal size).

### Stimulant Effect Modeling
```javascript
// Adderall XR curve: 0-1hr=70%, 1-4hr=100% (peak), 4-8hr=60%, 8-10hr=30%, 10+=10%
// Caffeine: normalized to 200mg, uses 5hr half-life
// Combined synergistic: adderall + (caffeine × 0.5) + (adderall × caffeine × 0.3)
// Suppression levels: SEVERE | HIGH | MODERATE | LOW
// Crash window: 8-10h post-dose (SHARP if >200mg caffeine)
```

### V2 Analytics System
- **`determineDayStatus()`**: Single source of truth for 8 statuses (RED, YELLOW, GREEN, DEFICIT_HIT, DEFICIT_GYM, GYM_ONLY, PROTEIN_ONLY, MAINTENANCE)
- **`calculateDayCalScore/ProteinScore/DeficitScore()`**: Margin-based 0-100 scoring (USDA HEI-style)
- **`aggregateDailyLogs(start, end)`**: Shared data source for calendar + progress tabs
- **`renderWeeklyReportCard()`**: Letter grades (A+ through F) based on 5-category weighted scoring
- **`renderMacroTimingAnalysis()`**: Protein distribution across 4 windows (ISSN research)
- **`renderDeficitSustainability()`**: Coefficient of variation analysis, yo-yo detection
- **`renderRecompPredictor()`**: Fat/lean projection using Longland et al. + Mifflin-St Jeor

### Calendar Heatmap (8 Statuses)
perfect (green), good (blue-green), partial (yellow), over (red), missed (gray), deficit_gym (teal), gym_only (purple), no-data (gray)

### Gamification
- **10 levels**: Beginner (0) → Legend (5500 XP)
- **XP**: logMeal=10, hitCalorie/Protein=30 each, perfectDay=50, weeklyWeighIn=25, streakBonus=5/day
- **12 achievements**: first_day, week/two_week/month_streak, first_lb/5lbs/10lbs/halfway, protein_king, deficit_master, early_bird, perfect_week
- **Streak**: Daily completion streak (not gym streak). Calls `updateStreak()` after meals + setup.

### Day Lifecycle
```
DOMContentLoaded → loadState() → initFirebase() → scheduleEndOfDaySave()
    → autoStartDay() (ecosystem data → mode → TDEE → targets → setupComplete)
    → renderSimpleView()

11:59:59 PM → saveDayLogWithSnapshot() (comprehensive end-of-day save)
12:01:09 AM → autoResetForNewDay() (clear today, show setup)

Visibility change → checkAndResetDayIfNeeded() (cross-midnight detection)
Every 5 min → saveDayLog() safety net
After 3s → checkStorageHealth() + auditRecentDailyLogs()
```

### Data Integrity
- `checkStorageHealth()`: Monitors localStorage size (warns at 4MB+)
- `verifyDayLogIntegrity(dateStr)`: Recalculates from meals, auto-fixes mismatches
- `auditRecentDailyLogs()`: Checks last 7 days — fixes status, flags, zero-calorie logs
- `recalculateAllDayLogs()`: V2 migration batch (runs once on first load)

---

## STIMULANT CALCULATOR (stimulant-elimination-calculator.html)

### File Layout (~11,526 lines)
| Range | Content |
|-------|---------|
| 1-2,481 | **CSS** — unified view, accordions, graph, modals, responsive |
| 2,485-3,105 | **HTML** — unified hero, 10 accordion sections, modals |
| 3,107-11,526 | **JavaScript** — all app logic |

### CSS Layout
| Range | Content |
|-------|---------|
| 1-650 | Global, cross-app nav, header, legacy focus mode |
| 650-1,080 | Main grid, cards, medication/caffeine entries |
| 1,080-1,520 | Graph, recommendations, settings, history, checkpoint system |
| 1,520-1,840 | Toast, modals, blocking factors, tooltip system |
| 1,841-2,481 | Unified view (hero, accordions, modifiers, scenarios, nicotine, circadian) |

### HTML Structure (Unified View — 10 Accordions)
| Section | Content |
|---------|---------|
| Hero | Projected sleep time, time remaining, quality badge, progress bar |
| Graph | Canvas pharmacokinetic visualization + status pills |
| 1. Sleep & Wake | Wake time, hours slept, sleep debt, recent nights |
| 2. Medications | All-nighter toggle, ghost load, med entries, stacking warning |
| 3. Caffeine | Quick presets (Coffee/Celsius/Starbucks/Espresso/Tea), custom, entries |
| 4. Modifiers | Vitamin C, Heavy Lifting, Sauna with time inputs |
| 5. Nicotine | Vape/Zyn quick buttons, RLS emergency protocol |
| 6. Workout | Time/type/duration/intensity, fasted, cold shower |
| What-If | 6 scenario buttons (Coffee, Espresso, VitC, Sauna, Vape, Zyn) |
| 7. Circadian | Forbidden Zone, Sleep Gate, feelings timeline |
| 8. Sleep Calendar | 7-day heatmap + 30-day performance stats + achievements |
| 9. Recommendations | Context-aware sleep advice |
| 10. Forecast Logic | Full diagnostic calculation breakdown |

### JavaScript Layout
| Range | Content |
|-------|---------|
| 3,107-3,240 | `getDefaultState()`, global state, sync flags, `isEmptyState()` |
| 3,244-3,415 | Data integrity (`generateId`, `getValues`, migrations, backup manager) |
| 3,417-3,600 | `analyzeCircadianPhase()` (7-day phase detection) |
| 3,600-3,840 | Time helpers, sleep debt calculation (3-day weighted) |
| 3,840-3,985 | `getEffectiveThreshold()` (base + debt + modifiers, 8mg cap) |
| 3,985-4,140 | `calculateDecayWithVitC()`, `calculateAmpLoad()`, `calculateCaffLoad()` |
| 4,140-4,240 | `findAmpClearTime()` (iterative binary search with DR spike verification) |
| 4,240-4,530 | `calculateSleepTime()` — 7-phase prediction algorithm |
| 4,530-4,830 | Medication/caffeine CRUD + stacking warning |
| 4,830-4,990 | Modifier toggles, Vitamin C (8h TTL, 3-segment decay) |
| 4,990-5,180 | All-Nighter mode, ghost load calculation |
| 5,180-5,625 | Workout planner (adenosine/cortisol/thermal impacts) |
| 5,625-6,000 | `recalculate()` main loop + sleep debt/circadian/drug load display |
| 6,000-6,100 | Status updates, workout bonus display |
| 6,100-6,450 | Recommendations engine (10+ context-aware cards) |
| 6,450-6,810 | Nicotine tracking (pharmacokinetics, RLS risk, wind-down protocol) |
| 6,810-7,070 | What-If scenarios (6 simulations with delta display) |
| 7,070-7,460 | Graph rendering (canvas: amp/caff curves, zones, blockade shading) |
| 7,460-7,780 | History & feedback (auto-save, accuracy tracking) |
| 7,780-8,870 | Sleep calendar, performance dashboard (30-day stats), achievements (10 badges) |
| 8,870-9,110 | Accuracy dashboard, calibration recommendations |
| 9,110-9,660 | Firebase init, PIN auth, `saveToFirebase()`, `loadFromFirebase()`, realtime sync |
| 9,660-10,080 | Checkpoint system (create, restore, export, import — 6 flexible formats) |
| 10,080-10,310 | Force upload/pull, `renderAll()`, `applyRemoteState()`, visibility handlers |
| 10,310-10,540 | `saveState()` + `saveStateImmediate()` (both with 5 identical guards), `loadState()` |
| 10,540-11,110 | `clearToday()`, toast, forecast logic generator (9 sections) |
| 11,110-11,210 | `init()` (DOMContentLoaded entry point) |
| 11,210-11,526 | Unified view (accordion management, summaries, progress, modifier UI) |

### XR Pharmacokinetics (ALL doses are XR)
```javascript
// 50% immediate release at dose time (T+0)
// 50% delayed release at T+4 hours
// Decay formula: remaining = dose × 0.5^(elapsed_hours / half_life)
// Creates NON-MONOTONIC curves — load can spike UP at DR release
```
**No IR-only model exists.** All amphetamine doses use this XR split.

### 7-Phase Sleep Prediction (`calculateSleepTime()`)
1. **Pharmacokinetic Floor** — when drugs clear threshold
2. **Circadian Constraints** — Forbidden Zone + Wake Maintenance Zone
3. **Time-Based Blockers** — cortisol delay, thermal cooldown from workouts
4. **Nicotine Advisory** — quality modifier (not hard blocker)
5. **Circadian Clamp** — re-check after other factors
6. **Pharmacokinetic Floor Enforcement** — drugs can't be overridden by circadian
7. **Final Drug Verification** — confirm both substances below threshold

### Threshold System
```
Effective = Base (14mg) + Sleep Debt Bonus (0-6mg) + Workout Bonus + Sauna Bonus
Cap: Base + 8mg maximum
Hyperarousal (<4h sleep): Sleep debt bonus = 0 (cortisol surge)
```

### Default Settings
| Parameter | Default | Range |
|-----------|---------|-------|
| Amphetamine half-life | 11 hours | 8-15 |
| Sleep threshold | 14mg | — |
| Caffeine half-life | 5 hours | — |
| Caffeine threshold | 25mg | — |
| Weight | 190 lbs | — |

### Vitamin C Effect
- Reduces amphetamine half-life to 70% of normal (11h → 7.7h)
- 3-segment decay model: before VitC (normal) → active (reduced) → expired (normal)
- **8-hour TTL** — effect expires 8 hours after taking
- Instant shift (no gradual transition)

### Circadian Rhythm (Process C)
- **Wake Maintenance Zone**: 11-13h after wake (alerting ramps up)
- **Forbidden Zone**: 13-15h after wake (CANNOT sleep, hard blocker)
- **Sleep Gate**: 15-17h after wake (optimal sleep window)

### All-Nighter Mode
- Includes yesterday's doses in calculations (ghost load)
- Hyperarousal negates sleep debt bonus (cortisol surge)
- Cross-day medication effects tracked up to 3 days

### Sync Guards (BOTH saveState + saveStateImmediate have IDENTICAL 5 guards)
```javascript
if (!pinValidated) return false;
if (isInitialLoad) return false;
if (!hasLoadedFromCloud) return false;
if (!state._dataLoaded) return false;
if (isEmptyState(state)) return false;
```

### Key Architecture
- **`recalculate()`** runs every 5 seconds via setInterval — any runtime error crashes repeatedly
- **Cross-app**: `projectedSleepTime` + `projectedSleepMinutes` written to Firebase for Body Comp reads
- **Two save functions**: `saveState()` (debounced 2s) and `saveStateImmediate()` — must keep guards identical
- **Forecast logic**: 9-section diagnostic text generator for calculation transparency

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

### Data Structure (v2: Per-Month Expenses)
```javascript
financials = {
    masterLiquidity: {
        currentCash: 0,              // Actual checking balance
        lastUpdated: null,
        loanDisbursementDate: '2026-01-10',
        loanAmount: 18447,
        targetCushion: 2285,         // Goal balance on May 14
        semesterEndDate: '2026-05-14' // Next disbursement
    },
    // Template used to initialize new months (editing template doesn't change existing months)
    expenseTemplate: {
        rent: { name: 'Rent', amount: 1280, category: 'housing' },
        parking: { name: 'Parking', amount: 300, category: 'housing' },
        utilities: { name: 'Utilities', amount: 60, category: 'housing' },
        gym: { name: 'SOWA Gym', amount: 195, category: 'wellness' },
        food: { name: 'Food', amount: 350, category: 'living' },
        social: { name: 'Social/Dating', amount: 250, category: 'living' },
        nicotine: { name: 'Nicotine', amount: 50, category: 'living' },
        creditCards: { name: 'Credit Cards', amount: 235, category: 'debt' }
    },
    // Each month has its own independently editable copy of expenses
    months: {
        '2026-02': { label: 'February 2026', partial: false, fraction: 1.0,
                     expenses: { rent: { name, amount, category, paid }, ... } },
        '2026-03': { ... },
        '2026-04': { ... },
        '2026-05': { label: 'May 1-14', partial: true, fraction: 0.45, expenses: { ... } }
    },
    // One-time income/expenses not tied to a month
    oneTimeBills: { [id]: { id, description, amount, type: 'income'|'expense', dueDate, paid, category } },
    creditCards: [{ id, name, balance, limit, daysLate, status, minNow, targetMin, apr, phone, negotiationNotes }],
    actionItems: [{ id, title, deadline, priority, completed, notes, category }]
};
```

### Projection Calculation
```javascript
// 1. Start with actual cash (masterLiquidity.currentCash)
// 2. Add unpaid income one-time bills, subtract unpaid expense one-time bills
// 3. Subtract ONLY months with unpaid expenses (each month tracked independently)
// projectedBalance = availableCash - unpaidMonthsTotal
// Health: GREEN (>= cushion) | YELLOW (> 0) | RED (< 0)
```

### Financial Cockpit Functions
```javascript
calculateFinancialStatus()     // Compute projection to May 14
renderFinancialCockpit()       // Calls 7 render functions:
  renderMasterLiquidity()      //   Current cash + health status
  renderOneTimeBills()         //   Income/expenses list
  renderMonthlyExpenses()      //   Per-month collapsible cards
  renderExpenseTemplate()      //   Default monthly template
  renderProjectionPanel()      //   Balance projection + progress bar
  renderActionItems()          //   Priority checklist
  renderCreditCards()          //   7-card tracker
openFinancialHelp()            // Help modal with negotiation scripts
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
7. **Verify guards in saveData/saveState** (4-5 guards per app — see App-Specific Guard Differences)
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

### Cross-App Data Flow Map
```
Stim Calc ──writes──→ projectedSleepTime, medications, caffeine, allNighterMode
    ↓ (Body Comp reads)
    └──→ Body Comp ecosystemContext.stimulant

Index.html ──writes──→ medications (pill counts, refill dates)
    ↓ (Body Comp reads)
    └──→ Body Comp ecosystemContext.inventory

Index.html ──writes──→ tasks (with doToday flag)
    ↓ (D3 Roadmap reads via realtime listener)
    └──→ D3 Roadmap Dashboard "Do Today" widget

D3 Roadmap ──writes──→ exams, monthlyPlanner
    ↓ (Body Comp reads)
    └──→ Body Comp ecosystemContext.academic + schedule

Stim Calc ──writes──→ (nothing reads stim-calc besides body-comp)
Lecture Prompt ──────→ (standalone, no cross-app dependencies)
```
All cross-app reads are **READ-ONLY via Firebase**. If a source app is wiped, readers get empty data — their own data is never affected.

---

## INDEX.HTML HISTORICAL FIXES (Condensed Reference)

### Crash Out & Task Ordering (Jan 2026)
- **Drag vs Swap**: Up/down buttons use `swapAdjacentTasks()` (SWAP), drag-drop uses `moveTaskToPosition()` (INSERT)
- **Skip vs Remove**: `skipTask()` dismisses prompt (3-min cooldown), `removeTaskFromSchedule()` actually removes
- **Task start**: `confirmedStarted` flag + `startTaskFromPrompt()` auto-starts timer
- **Completion counting**: `sendToCrashOut()` sets `doToday: true`, `completeTriageTask()` preserves it
- **Reorder buttons**: ⬆⬆ Top, ⬇⬇ Bottom, # Position + `isReorderingLocked` 200ms cooldown
- **Pill auto-reduce**: `checkAndApplyDailyPillReduce()` runs on app load, catches up multi-day gaps

---

## D3 ROADMAP HISTORICAL FIXES (Condensed Reference)

### Deadline Sync (Jan 2026)
- **Stable IDs**: `getDeadlineId()` generates IDs from deadline properties (not array index) — prevents data loss when custom deadlines added
- **Bidirectional sync**: `syncGradeToDeadline()` and `syncDeadlineToGrades()` keep Grades and Deadlines tabs in sync
- **Force upload/pull**: Requires typing "UPLOAD" exactly, with diagnostic logging and specific error messages

### Save Fix (Jan 2026)
- **`loadFromLocalStorage(finalize)`**: `finalize=true` for terminal path (sets all flags + calls initUI), `finalize=false` when called from loadFromFirebase
- **Realtime sync**: Explicitly preserves `_dataLoaded = true` after merge
- **Diagnostic logging**: `saveData()` logs all guard statuses on every call

---

## ALL-APP HISTORICAL FIXES (Condensed Reference)

### Stim Calc — All-Nighter Mode Save Fix (Jan 2026)
- Added `getDefaultState()` function. Modified `isEmptyState()` to return false when `allNighterMode=true` or `_dataLoaded=true`.

### Body Comp — Missing Functions & V2 Upgrade (Jan 2026)
- Added `getDefaultState()`. Calendar: 8 statuses (was 5) including deficit_gym, gym_only. Streak: daily completion (`gam.streak`), not gym streak. Added `updateStreak()` calls after meal logging. Added `allNighterMode` to ecosystem context.
- V2 upgrade: margin-based scoring, `determineDayStatus()`, `aggregateDailyLogs()`, recomp predictor, macro timing analysis, deficit sustainability analytics.

---

