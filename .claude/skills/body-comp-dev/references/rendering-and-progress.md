# Rendering & Progress System

## Table of Contents
- [Main Render Function](#main-render-function)
  - [`renderSimpleView()` -- Line 8557](#rendersimpleview--line-8557)
  - [Key UI Elements Updated](#key-ui-elements-updated)
  - [`renderSimpleMealList()` -- Line 8763](#rendersimplemeallist--line-8763)
  - [`renderQuickStats()` -- Line ~8810](#renderquickstats--line-8810)
  - [`renderSimpleWorkoutSummary()` -- Line ~8840](#rendersimpleworkoutsummary--line-8840)
- [Tab System](#tab-system)
  - [`switchDashboardTab(tabName, e)` -- Line 16677](#switchdashboardtabtabname-e--line-16677)
- [Progress Tab](#progress-tab)
  - [`renderProgressTab()` -- Line 16980](#renderprogresstab--line-16980)
  - [Sub-Renderer Details](#sub-renderer-details)
- [Calendar Heatmap](#calendar-heatmap)
  - [`renderCalendarHeatmap()` -- Line 18056](#rendercalendarheatmap--line-18056)
  - [`showDayDetails(dateStr)` -- Line ~18200](#showdaydetailsdatestr--line-18200)
- [Badges/Achievements Tab](#badgesachievements-tab)
  - [`renderAchievements()` -- Line ~18350](#renderachievements--line-18350)
- [XP Bar](#xp-bar)
  - [`renderXPBar()` -- Line 16704](#renderxpbar--line-16704)
- [Weekly Export](#weekly-export)
  - [`openWeeklyExportModal()` -- Line 12966](#openweeklyexportmodal--line-12966)
  - [`generateClaudeExportText()` -- Line ~13200](#generateclaudeexporttext--line-13200)
- [Logic Log](#logic-log)
  - [`generateLogicLog()` -- Line 13311](#generatelogiclog--line-13311)
- [Metabolic Dashboard](#metabolic-dashboard)
  - [`openMetabolicModal()` -- Line ~14200](#openmetabolicmodal--line-14200)
- [Key Functions Reference](#key-functions-reference)

## Main Render Function

### `renderSimpleView()` — Line 8557

The primary dashboard renderer. Calls 6+ sub-renders:

```
renderSimpleView()
├── getSimpleStatus()           → Status icon/label/color/subtitle
├── Update progress bars        → Calories, protein, carbs
├── Update burn summary         → TDEE, eaten, deficit
├── getEatingNudge()            → Context-aware eating nudge
├── getWorkoutRecommendation()  → Gym streak + workout advice
├── Update ecosystem chips      → Exam countdown, pill inventory, stim data
├── Update mode badge           → GREEN/YELLOW/ORANGE (focus mode: plain text)
├── renderScheduleCard()        → Today's schedule from D3 roadmap
├── renderExamDayCard()         → Exam day phase indicator
├── renderSleepDebtIndicator()  → Sleep debt severity warning
├── renderSimpleMealList()      → Inline meal list with edit/delete
├── renderQuickStats()          → Quick stats cards
└── renderSimpleWorkoutSummary()→ Today's workout summary
```

### Key UI Elements Updated

| Element | ID | Data |
|---------|----|------|
| Status | `statusIcon`, `statusLabel`, `statusSubtitle` | getSimpleStatus() |
| Calories | `calCurrent`, `calTarget`, `calProgressFill` | getTodayTotals() |
| Protein | `proCurrent`, `proTarget`, `proProgressFill` | getTodayTotals() |
| Carbs | `carbCurrent`, `carbTarget`, `carbProgressFill` | getTodayTotals() |
| TDEE | `simpleTDEE` | calculateTDEE() |
| Eaten | `simpleEaten` | totals.calories |
| Deficit | `simpleDeficit`, `simpleDeficitLabel` | TDEE - eaten |
| Nudge | `eatingNudge`, `nudgeIcon`, `nudgeTitle`, `nudgeDetail` | getEatingNudge() |
| Workout | `workoutTitle`, `workoutDetail`, `workoutRec` | getWorkoutRecommendation() |
| Exam | `examChip`, `examInfo` | ecosystemContext.academic |
| Pills | `pillsChip`, `pillsInfo` | ecosystemContext.inventory |
| Stim | `stimAdderall`, `stimCaffeine`, `stimSleep`, `stimSleepHours` | ecosystemContext.stimulant |
| Mode | `modeBadge` | state.today.mode |

### `renderSimpleMealList()` — Line 8763

Inline expandable meal list. Sorts by time, shows name, macros, edit/delete buttons.

### `renderQuickStats()` — Line ~8810

Quick stat cards below the meal list.

### `renderSimpleWorkoutSummary()` — Line ~8840

Today's workout summary or workout recommendation if no workouts logged.

## Tab System

### `switchDashboardTab(tabName, e)` — Line 16677

Switches between 4 tabs:
- **Dashboard**: Shows `simpleView` (default)
- **Progress**: Triggers `renderProgressTab()`
- **Calendar**: Triggers `renderCalendarHeatmap()`
- **Badges**: Triggers `renderAchievements()`

## Progress Tab

### `renderProgressTab()` — Line 16980

Dispatches to 12 sub-renderers:

```javascript
function renderProgressTab() {
    renderBodyCompTrend();           // Fat vs lean mass trend
    renderRefeedTracker();           // Cumulative deficit + refeed timing
    renderSummerProgress();          // Progress toward June 1 goal
    renderWeightChart();             // Weight trend over time
    renderDeficitTracking();         // Weekly deficit trend
    renderWeeklySummary();           // This week's daily breakdown
    // Enhanced sections:
    renderWeeklyReportCard();        // A/B/C/D/F grade for the week
    renderPersonalRecords();         // Best day, best streak, etc.
    renderConsistencyScore();        // % of days on track
    renderSleepPerformanceInsight(); // Sleep quality vs performance correlation
    renderAchievementProgress();     // Next achievement and progress
    renderLifetimeStats();           // Total calories, meals, workouts
}
```

### Sub-Renderer Details

| Function | Line | Purpose |
|----------|------|---------|
| `renderBodyCompTrend()` | 16997 | Fat vs lean mass changes (needs 2+ weigh-ins with BF%) |
| `renderRefeedTracker()` | ~17060 | Cumulative deficit, weeks in deficit, refeed recommendation |
| `renderSummerProgress()` | ~17120 | Countdown to June 1, projected weight at goal date |
| `renderWeightChart()` | ~17180 | Weight data points over time (text-based, no D3) |
| `renderDeficitTracking()` | ~17250 | Weekly deficit totals, estimated fat loss |
| `renderWeeklySummary()` | ~17320 | 7-day breakdown: cal, protein, deficit, workout per day |
| `renderWeeklyReportCard()` | ~17530 | Grades based on: deficit adherence, protein, consistency, workouts |
| `renderPersonalRecords()` | ~17620 | Best deficit day, highest protein day, longest streak |
| `renderConsistencyScore()` | ~17700 | % of tracked days that met targets |
| `renderSleepPerformanceInsight()` | ~17780 | Correlation between sleep hours and deficit adherence |
| `renderAchievementProgress()` | ~17860 | Next unlockable achievement + progress bar |
| `renderLifetimeStats()` | ~17940 | Total: calories logged, meals, workouts, weigh-ins, days tracked |

## Calendar Heatmap

### `renderCalendarHeatmap()` — Line 18056

Monthly calendar showing day status colors:

| Status | Color | Meaning |
|--------|-------|---------|
| `perfect` | Green | Hit both calorie and protein targets |
| `good` | Blue | In deficit + protein hit |
| `partial` | Yellow | In deficit but protein missed |
| `over` | Red | Over calorie target |
| `missed` | Gray | No data or failed |

Navigation: Previous/next month buttons. Clicking a day opens `showDayDetails(dateStr)`.

### `showDayDetails(dateStr)` — Line ~18200

Modal showing full breakdown for any historical date:
- Macros vs targets
- Meal list (with import option)
- Workout list (with import option)
- Mode, sleep, ecosystem snapshot
- Logic log

## Badges/Achievements Tab

### `renderAchievements()` — Line ~18350

Gallery of all 12 achievements:
- Locked: Grayed out with lock icon
- Unlocked: Full color with unlock date
- XP value shown for each

## XP Bar

### `renderXPBar()` — Line 16704

Always visible at top of app. Shows:
- Level badge number
- Level name
- Total XP
- XP to next level
- Progress bar fill
- Current streak
- Total days tracked
- Perfect days count

## Weekly Export

### `openWeeklyExportModal()` — Line 12966

7-day summary for Claude check-in. Shows:
- Daily breakdown (cal, protein, deficit, workouts)
- Weekly averages
- Weight change (if weigh-ins available)
- Estimated fat loss from deficit

### `generateClaudeExportText()` — Line ~13200

Generates copyable text formatted for Claude analysis.

## Logic Log

### `generateLogicLog()` — Line 13311

9-section diagnostic output:

1. **Mode Decision** — Sleep hours, mode, allNighter status
2. **Target Calculation** — TDEE breakdown, deficit, targets
3. **Current Progress** — Eaten vs targets, deficit
4. **Ecosystem Context** — Stim data, pill inventory, exams
5. **Sleep Debt Analysis** — 7-day average, severity
6. **Stimulant Effect** — Suppression level, crash window
7. **Schedule Awareness** — Eating windows, schedule intensity
8. **Workout Analysis** — Gym streak, 7-day workout average
9. **Recommendations** — Combined analysis

## Metabolic Dashboard

### `openMetabolicModal()` — Line ~14200

Detailed metabolic breakdown:
- BMR calculation
- Activity multiplier
- TDEE components
- Current deficit
- Protein requirements
- Projected weight loss rate

## Key Functions Reference

| Function | Line | Purpose |
|----------|------|---------|
| `renderSimpleView()` | 8557 | Main dashboard render |
| `renderSimpleMealList()` | 8763 | Inline meal list |
| `renderQuickStats()` | ~8810 | Quick stat cards |
| `renderSimpleWorkoutSummary()` | ~8840 | Workout display |
| `switchDashboardTab(tab, e)` | 16677 | Tab switching |
| `renderProgressTab()` | 16980 | Progress tab dispatcher (12 sub-renders) |
| `renderCalendarHeatmap()` | 18056 | Monthly calendar |
| `showDayDetails(dateStr)` | ~18200 | Day detail modal |
| `renderAchievements()` | ~18350 | Badges gallery |
| `renderXPBar()` | 16704 | XP/level display |
| `openWeeklyExportModal()` | 12966 | Weekly export |
| `generateLogicLog()` | 13311 | 9-section diagnostic |
| `generateClaudeExportText()` | ~13200 | Claude check-in text |
| `openMetabolicModal()` | ~14200 | Metabolic breakdown |
