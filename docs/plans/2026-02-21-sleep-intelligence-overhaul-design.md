# Sleep Intelligence Module Overhaul — Design Doc

**Date**: 2026-02-21
**Status**: Approved
**Scope**: Insights tab (complete rebuild) + Accuracy tab (complete rebuild)
**Files affected**: `js/stimcalc/history-calendar.js`, `stimulant-elimination-calculator.html`, possibly `js/stimcalc/graph.js`

---

## Current Problems

1. **Insights tab**: Just shows a list of past day cards with predicted/actual times. No aggregate analysis, no actionable insights, no benchmarks. Useless.
2. **Accuracy tab**: Confusing canvas graph that tells nothing. Accuracy calculation is a black box. User can't verify data or understand methodology.

---

## Design: Insights Tab → Analytics Dashboard

Replace day-by-day cards with 13 collapsible analysis sections, each rendered from the existing `state.history`, `state.sleepDailyLogs`, `state.sleepHistory`, and `state.medications`/`state.caffeine` data.

### Section 1: Key Metrics Panel (always expanded)
- **Avg wake time** (from sleepHistory/sleepDailyLogs wakeTime data)
- **Avg sleep onset time** (from history actualSleep minutes)
- **Avg hours slept** (from sleepHistory hoursSlept)
- **Avg Adderall dose/day** (from history.medications or sleepDailyLogs.totalAmpDose)
- **Avg caffeine dose/day** (from sleepDailyLogs.totalCaffDose)
- **All-nighter ratio** (days with allNighterMode true / total days tracked, shown as "X/Y (Z%)")
- **Total days tracked** / **Date range** (earliest to latest)

### Section 2: Dose-Response Analysis
- Bucket days by Adderall dose: 0mg, 10-20mg, 30mg, 40mg, 50mg+
- For each bucket: avg sleep onset time, avg hours slept, count
- Highlight: "On 50mg+ days you sleep X:XX vs Y:YY on 30mg days"

### Section 3: Caffeine Impact
- Days with caffeine vs without: avg sleep onset, avg hours slept
- Bucket by caffeine amount: 0, 1-100mg, 100-200mg, 200mg+
- Last caffeine timing vs sleep onset correlation

### Section 4: Sleep Patterns & Trends
- Weekday vs weekend avg sleep time / hours slept
- Best/worst day of week for sleep
- Sleep consistency score (std dev of sleep onset times)
- Week-over-week trend (last 4 weeks avg hours)

### Section 5: Modifier Impact Analysis
- VitC: avg sleep onset with vs without, delta
- Workout: avg sleep onset with vs without, delta
- Sauna: avg sleep onset with vs without, delta
- Each shows sample size (N days)

### Section 6: Optimal Dosing Windows
- Group by: last dose timing (hours after wake)
- Show avg sleep onset for each timing bucket
- Derive "optimal last dose" cutoff time

### Section 7: Caffeine Timing Impact
- Last caffeine time relative to eventual sleep onset
- Derive personal "caffeine cutoff" recommendation

### Section 8: Sleep Efficiency Score
- Actual hours vs target (8h) — percentage
- Weekly deficit accumulation
- Rolling sleep debt trend

### Section 9: Prediction Reliability by Context
- Which conditions produce most accurate predictions
- Which produce least accurate
- "Algorithm works best when: X, Y, Z"

### Section 10: Circadian Rhythm Consistency
- Wake time variability (std dev in minutes)
- Social jet lag score (weekday vs weekend gap)
- Sleep Regularity Index (SRI)

### Section 11: Stimulant Load Trends
- Weekly average dose (last 4 weeks trend)
- Days/week with stimulants
- Tolerance indicator: same dose → is sleep onset shifting later?

### Section 12: Risk Indicators
- Consecutive high-dose days (>40mg streak)
- Days since last stimulant-free day
- <5h sleep frequency (last 30 days)
- Sleep debt danger zone warning

### Section 13: Personal Records & Milestones
- Earliest sleep achieved
- Longest 7h+ streak
- Best consistency week
- Most accurate prediction

### Section 14: Research-Backed Benchmarks
- Your sleep vs recommended 7-9h (Hirshkowitz et al. 2015)
- Your variability vs <1h target (social jet lag, Wittmann 2006)
- Stimulant pharmacokinetic context (Adderall XR clearance literature)
- Caffeine cutoff research (Drake et al. 2013 — 6h before bed)

---

## Design: Accuracy Tab → Accuracy Transparency

Replace confusing graph with verifiable, transparent methodology.

### Section 1: Overall Accuracy Grade (simplified)
- Big number: ±Xmin average error
- Subtext: "Based on N predictions with feedback out of M total days"
- Color-coded: green ≤30min, yellow 30-60, red >60

### Section 2: Data Inventory Table
- Scrollable table of ALL tracked days
- Columns: Date, Predicted Time, Actual Time, Error (min), Direction (early/late)
- Each row expandable to show: meds taken, caffeine, modifiers, threshold, sleep debt
- User can visually verify every data point

### Section 3: How It's Calculated
- Step-by-step methodology display with actual numbers:
  - "Step 1: Found N days with both predicted and actual sleep times"
  - "Step 2: Calculated delta for each: actual - predicted"
  - "Step 3: Average absolute error = sum(|deltas|) / N = ±X min"
  - "Step 4: Within 30 min = Y/N = Z%"
  - "Step 5: Within 60 min = Y/N = Z%"

### Section 4: Error Distribution
- Bucket chart (HTML bars, no canvas): 0-15min, 15-30, 30-60, 60-90, 90+
- Shows count and percentage for each bucket

### Section 5: Directional Bias Analysis
- Overall: "Algorithm predicts X min too early/late on average"
- By dose level: high dose bias vs low dose bias
- By caffeine: caffeine days bias vs no caffeine
- Actionable threshold adjustment recommendation

### Section 6: Context Breakdowns (improved from current)
- Keep existing context analysis (High Dose, Caffeine, Low Sleep, etc.)
- Add sample sizes and clearer visualization

### Section 7: Input Verification (Today)
- Show today's exact prediction inputs
- Current amp load, caffeine load, threshold, sleep debt, modifiers
- "This is what the algorithm sees right now"

### REMOVED: Accuracy timeline canvas graph (confusing, unhelpful)

---

## Implementation Notes

- All new sections are collapsible (reuse existing accordion pattern)
- All data comes from existing state — no new Firebase fields needed
- Each section has a `renderInsightSection_X()` function
- Research benchmarks are hard-coded constants from literature
- Data inventory table is virtual-scrolled or limited to 50 rows for performance
- Maintain all existing save guards and sync patterns
