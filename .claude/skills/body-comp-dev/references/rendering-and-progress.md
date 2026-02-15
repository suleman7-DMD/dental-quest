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

Dispatches to 15+ sub-renderers (expanded in V2):

```javascript
function renderProgressTab() {
    renderBodyCompTrend();           // Fat vs lean mass trend
    renderRefeedTracker();           // Cumulative deficit + refeed timing
    renderSummerProgress();          // Progress toward June 1 goal
    renderWeightChart();             // Weight trend over time
    renderDeficitTracking();         // Weekly deficit trend
    renderWeeklySummary();           // This week's daily breakdown
    // V2 Enhanced sections:
    renderWeeklyReportCard();        // V2: Margin-based 0-100 scoring (was A-F)
    renderPersonalRecords();         // Best day, best streak, etc.
    renderConsistencyScore();        // V2: Rich analytics (5 sections, replaces simple %)
    renderSleepPerformanceInsight(); // Sleep quality vs performance correlation
    renderAchievementProgress();     // Next achievement and progress
    renderLifetimeStats();           // Total calories, meals, workouts
    // V2 New renderers:
    renderDailySnapshot();           // Today's real-time progress vs yesterday
    renderWorkoutStats();            // All-time workout analytics
    renderMacroTimingAnalysis();     // Protein timing across 4 windows (ISSN)
    renderDeficitSustainability();   // Deficit consistency via CV, yo-yo detection
    renderRecompPredictor();         // Fat/lean projection at 4/8 weeks, June 1 goal
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
| `renderWeeklyReportCard()` | ~17530 | **V2**: Weighted 0-100 scoring — Deficit 25%, Protein 25%, Cal 20%, Gym 15%, Tracking 15% |
| `renderPersonalRecords()` | ~17620 | Best deficit day, highest protein day, longest streak |
| `renderConsistencyScore()` | ~17700 | **V2**: Replaced with 5-section rich analytics (see below) |
| `renderSleepPerformanceInsight()` | ~17780 | Correlation between sleep hours and deficit adherence |
| `renderAchievementProgress()` | ~17860 | Next unlockable achievement + progress bar |
| `renderLifetimeStats()` | ~17940 | Total: calories logged, meals, workouts, weigh-ins, days tracked |
| `renderDailySnapshot()` | 18243 | **V2**: Today's real-time progress with yesterday comparison |
| `renderWorkoutStats()` | 18317 | **V2**: All-time workout analytics (total, avg/week, avg duration, best streak) |
| `renderMacroTimingAnalysis()` | 18400 | **V2**: Protein distribution across 4 time windows, evenness 0-100 (ISSN research) |
| `renderDeficitSustainability()` | 18554 | **V2**: Deficit consistency via coefficient of variation, yo-yo detection, sparkline |
| `renderRecompPredictor()` | 18693 | **V2**: Fat/lean loss projection at 4/8 weeks, June 1 goal (Longland et al., Mifflin-St Jeor) |

### V2 Rich Analytics (renderConsistencyScore replacement)

The old `renderConsistencyScore()` (simple % days on track) was replaced with 5 sections:
- **Section A**: Status distribution stacked bar (30 days) — shows perfect/deficit_gym/good/gym_only/partial/over/missed
- **Section B**: 30-day nutrition averages with progress bars (avg cal, protein, deficit)
- **Section C**: Gym consistency — gym days, weekly avg, avg duration, gym streak
- **Section D**: Trend comparison — this week vs 30-day average
- **Section E**: Previous 7 days at-a-glance mini cards

### V2 Aggregation Layer

`aggregateDailyLogs(startDateStr, endDateStr)` at line 17712 — shared data source for calendar + progress sync. Returns aggregated stats over any date range.

### V2 Auto-Refresh

`refreshProgressIfActive()` at line 18914 — auto-refreshes progress tab after data changes (meal logging, workout logging, etc.) if the progress tab is currently active.

## Calendar Heatmap

### `renderCalendarHeatmap()` — Line 18056

Monthly calendar showing day status colors (V2: 8 statuses):

| Status | Color | Meaning |
|--------|-------|---------|
| `perfect` | Green | Hit both calorie and protein targets |
| `deficit_gym` | Teal | **V2**: In deficit + worked out (protein not hit) |
| `good` | Blue | In deficit + protein hit |
| `gym_only` | Purple | **V2**: Worked out but not in deficit |
| `partial` | Yellow | In deficit but protein missed, no workout |
| `over` | Red | Over calorie target |
| `missed` | Gray | Tracked but failed targets |
| `no_data` | Dark gray | No data logged |

All 8 statuses determined by shared `determineDayStatus()` function (line 8387).

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
| `renderProgressTab()` | 16980 | Progress tab dispatcher (15+ sub-renders, V2) |
| `aggregateDailyLogs(start, end)` | 17712 | V2 shared data source for calendar + progress |
| `renderDailySnapshot()` | 18243 | V2 today's real-time progress |
| `renderWorkoutStats()` | 18317 | V2 all-time workout analytics |
| `renderMacroTimingAnalysis()` | 18400 | V2 protein timing (ISSN) |
| `renderDeficitSustainability()` | 18554 | V2 deficit consistency (CV) |
| `renderRecompPredictor()` | 18693 | V2 fat/lean projection |
| `refreshProgressIfActive()` | 18914 | V2 auto-refresh progress tab |
| `renderCalendarHeatmap()` | 18056 | Monthly calendar (V2: 8 statuses) |
| `showDayDetails(dateStr)` | ~18200 | Day detail modal |
| `renderAchievements()` | ~18350 | Badges gallery |
| `renderXPBar()` | 16704 | XP/level display |
| `openWeeklyExportModal()` | 12966 | Weekly export |
| `generateLogicLog()` | 13311 | 9-section diagnostic |
| `generateClaudeExportText()` | ~13200 | Claude check-in text |
| `openMetabolicModal()` | ~14200 | Metabolic breakdown |
