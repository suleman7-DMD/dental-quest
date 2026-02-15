# App Architecture

## Table of Contents
- [File: `body-comp-tracker.html` (20,158 lines)](#file-body-comp-trackerhtml-19034-lines)
- [File Layout](#file-layout)
- [Initialization Sequence](#initialization-sequence)
- [Global Variables](#global-variables)
- [Firebase Configuration](#firebase-configuration)
- [Tab System](#tab-system)
- [Key Patterns](#key-patterns)
  - [Object-Based Storage](#object-based-storage)
  - [Save Chain](#save-chain)
  - [Deep Copy for Daily Logs](#deep-copy-for-daily-logs)

## File: `body-comp-tracker.html` (20,158 lines)

Single-file HTML app with no build system. Dark theme, responsive mobile-first design.

## File Layout

| Range | Content |
|-------|---------|
| 1-12 | DOCTYPE, head, Firebase SDK imports |
| 13-5956 | CSS styles (dark theme, responsive, modals, progress, calendar) |
| 5957-7310 | HTML structure (~16 modals: setup, meals, workouts, weigh-in, export, settings, body comp, weekly export, logic log, metabolic, quick meal, import, checkpoint, day detail) |
| 7311-7427 | `getDefaultState()` factory (~110 lines) |
| 7429-7627 | `state` object declaration (mirrors getDefaultState) |
| 7629-7654 | Sync protection flags + `isEmptyState()` + `hasRealData()` |
| 7656-7876 | Data integrity utilities (ensureArray, generateId, getValues, getCount, migrateArrayToObject, mergeFrequentFoods, getDefaultFrequentFoods, Firebase config) |
| 7877-8079 | Utility functions (getLocalDateString, formatTimeET, escapeHtml, formatNumber, getTimeAgo, parseLocalDate) |
| 8080-8256 | Core algorithms (calculateBMR, calculateTDEE, get7DayAvgActiveCalories, calculateMode, calculateTargets, getModeDisplay, getTodayTotals, getCurrentDeficit) |
| 8257-8552 | Date-based calculations (getTotalsForDate, getDeficitForDate), UI helper functions |
| 8553-9363 | Simple View rendering (renderSimpleView, renderSimpleMealList, renderQuickStats, renderSimpleWorkoutSummary, schedule/exam/sleep debt cards) |
| 9364-10163 | Stimulant modeling/nudges (getEnhancedStimulantNudge, getScheduleAwareNudge, getEveningPrepNudge, getWeakDayNudge, getProteinDistributionNudge, getSimpleStatus, getEatingNudge, getWorkoutRecommendation) |
| 10164-11174 | Meal/workout rendering and editing (renderMealsList, renderDashboard, editMeal, deleteMeal, addCustomMeal, quantity selector) |
| 11175-11835 | Import from Claude, quick meal modal, qty selector (openImportMealModal, processImportedMeals, openImportWorkoutModal, openQuickMealModal, confirmQtyAdd) |
| 11836-12467 | Workout modal, nudges, micronutrients (openWorkoutModal, logWorkout, checkAndShowNudges, updateMicronutrients) |
| 12468-12961 | Weigh-in, export system (openWeighInModal, saveWeighIn, openExportModal, exportData) |
| 12962-13702 | Weekly export, logic log (openWeeklyExportModal, calculateFullWeekData, generateLogicLog, generateClaudeExportText) |
| 13703-14066 | Body comp modal (openBodyCompModal, calculateNavyBodyFat, saveNavyMeasurement, saveScaleMeasurement) |
| 14067-14940 | UI/UX functions (settings modal, data management, reset, metabolic dashboard) |
| 14942-15038 | `saveState()` (5 guards) + `saveStateImmediate()` (4 guards) |
| 15040-15161 | `loadState()` (localStorage parse, migrations, day rollover) |
| 15163-15215 | `saveToFirebase()` (strips ecosystemContext) |
| 15217-15364 | `loadFromFirebase()` (merge, set flags, initUI) |
| 15366-15458 | `setupRealtimeSync()` (version-compared listener) |
| 15461-15561 | `forceCloudSync()`, `tryGetSleepFromStimCalc()` |
| 15562-16109 | Checkpoint system (create, restore, export, import, Firebase backup) |
| 16110-16209 | Firebase init, PIN auth (`initFirebase`, `setupUserAuth`, `promptForPin`, `skipPin`) |
| 16211-16635 | Ecosystem data integration (`loadEcosystemData`, stim calc reader, dental quest reader, d3 roadmap reader, sleep debt calculator, stimulant effect calculator) |
| 16636-16975 | Gamification system (LEVEL_THRESHOLDS, XP_REWARDS, ACTIVITY_MULTIPLIERS, renderXPBar, awardXP, updateStreak, checkDayCompletion, checkAchievements, unlockAchievement, showCelebration, triggerConfetti) |
| 16976-17527 | Progress tab (renderProgressTab dispatches to 15+ sub-renderers, V2 expanded) |
| 17528-17711 | Progress enhancements (renderWeeklyReportCard V2 margin scoring, renderPersonalRecords, renderConsistencyScore V2 rich analytics, renderSleepPerformanceInsight, renderAchievementProgress, renderLifetimeStats) |
| 17712-18051 | **V2**: aggregateDailyLogs() shared data source |
| 18052-18242 | Calendar heatmap (V2: 8 statuses incl. deficit_gym, gym_only) + badges tab |
| 18243-18399 | **V2**: renderDailySnapshot(), renderWorkoutStats() |
| 18400-18553 | **V2**: renderMacroTimingAnalysis() (ISSN protein timing) |
| 18554-18692 | **V2**: renderDeficitSustainability() (CV, yo-yo detection) |
| 18693-18913 | **V2**: renderRecompPredictor() (Longland et al., Mifflin-St Jeor) |
| 18914-18930 | **V2**: refreshProgressIfActive() |
| 18931-19100 | Initialization (initializeUI, autoStartDay, showManualSetup), event listeners |
| 19100-20158 | Data integrity checks (V2: enhanced audit with determineDayStatus cross-check) + DOMContentLoaded |

## Initialization Sequence

```
DOMContentLoaded
  → loadState() from localStorage
  → initFirebase()
    → Check for saved PIN in localStorage
    → If saved PIN: setupUserAuth(pin)
      → Set userPath, pinValidated = true
      → loadEcosystemData(hashedPin) [parallel reads from 3 other apps]
      → loadFromFirebase()
        → Merge Firebase data with local state
        → Set state._dataLoaded = true
        → Set hasLoadedFromCloud = true
        → initializeUI()
        → setupRealtimeSync()
        → Set isInitialLoad = false
      → loadCheckpointsFromFirebase()
      → startEcosystemRefresh() [60s interval]
      → setupStimulantRealtimeListener()
    → If no PIN: promptForPin() → setupUserAuth(pin)
    → If PIN skipped: initializeUI() [offline mode — known bug: guards not set]

initializeUI()
  → Check for day rollover (save previous day log if needed)
  → autoStartDay() [pulls sleep from ecosystem, calculates mode/targets]
  → Show Simple View
  → renderSimpleView()
```

## Global Variables

| Variable | Line | Type | Purpose |
|----------|------|------|---------|
| `state` | 7429 | Object | Main app state (mirrors getDefaultState) |
| `isInitialLoad` | 7632 | Boolean | Guard: blocks saves during load |
| `hasLoadedFromCloud` | 7633 | Boolean | Guard: blocks saves before cloud data |
| `pinValidated` | 7634 | Boolean | Guard: blocks saves before PIN |
| `database` | 7863 | Firebase ref | Firebase database reference |
| `userPath` | 7864 | String | Firebase path for this user |
| `firebaseSyncEnabled` | 7865 | Boolean | Whether Firebase is connected |
| `firebaseInitialized` | 7866 | Boolean | Whether Firebase SDK initialized |
| `currentUser` | 7867 | Object | Current user auth object |
| `realtimeSyncEnabled` | 7868 | Boolean | Whether realtime listener is active |
| `firebaseSaveTimeout` | 7869 | Timeout | Debounce timer for Firebase saves |
| `lastKnownTimestamp` | 7870 | String | Last known Firebase timestamp (echo prevention) |
| `waitingForPin` | 16114 | Boolean | Prevents premature initializeUI during PIN prompt |
| `calendarViewDate` | 16641 | Date | Current month shown in calendar tab |
| `dismissedNudges` | 12362 | Set | IDs of dismissed contextual alerts |
| `importTargetDate` | 11179 | String | Target date for Claude import modal |

## Firebase Configuration

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

Firebase path: `users/user_[hashedPin]/bodyCompTracker`

## Tab System

3 main tabs controlled by `switchDashboardTab(tabName)`:
- **Dashboard** (default): Simple View with status, progress bars, meals, nudges
- **Progress**: 12 sub-renderers for trends, charts, records
- **Calendar**: Monthly heatmap with day-detail drill-down
- **Badges**: Achievement gallery

## Key Patterns

### Object-Based Storage
All collections use `{}` with `generateId()` keys, never arrays. Firebase silently corrupts arrays.

### Save Chain
`mutate state` -> `saveState()` -> `saveDayLog()` -> re-render

### Deep Copy for Daily Logs
```javascript
meals: today.meals ? JSON.parse(JSON.stringify(today.meals)) : {},
workouts: today.workouts ? JSON.parse(JSON.stringify(today.workouts)) : {},
```
