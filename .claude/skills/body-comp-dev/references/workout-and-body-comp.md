# Workout & Body Composition System

## Table of Contents
- [Workout Logging](#workout-logging)
  - [`openWorkoutModal()` -- Line 12001](#openworkoutmodal--line-12001)
  - [Workout Creation Flow](#workout-creation-flow)
  - [Workout Import](#workout-import)
- [Gym Streak Calculation](#gym-streak-calculation)
  - [`getWorkoutRecommendation()` -- Line 9980](#getworkoutrecommendation--line-9980)
  - [Display in Simple View](#display-in-simple-view)
- [TDEE Calculation](#tdee-calculation)
  - [`calculateBMR(weight_lbs, height_cm, age)` -- Line 8084](#calculatebmrweight_lbs-height_cm-age--line-8084)
  - [`calculateTDEE(weight_lbs, height_cm, age, todayActiveCalories)` -- Line 8090](#calculatetdeeweight_lbs-height_cm-age-todayactivecalories--line-8090)
  - [`get7DayAvgActiveCalories()` -- Line 8143](#get7dayavgactivecalories--line-8143)
  - [Activity Multipliers (NEAT)](#activity-multipliers-neat)
- [Weigh-In System](#weigh-in-system)
  - [`openWeighInModal()` -- Line ~12468](#openweighinmodal--line-12468)
  - [`saveWeighIn()` -- Line ~12510](#saveweighin--line-12510)
- [Body Composition Modal](#body-composition-modal)
  - [`openBodyCompModal()` -- Line 13707](#openbodycompmodal--line-13707)
  - [Saving Body Comp](#saving-body-comp)
- [Body Composition Trend (Progress Tab)](#body-composition-trend-progress-tab)
  - [`renderBodyCompTrend()` -- Line 16997](#renderbodycomptrend--line-16997)
- [Workout Summary in Simple View](#workout-summary-in-simple-view)
  - [`renderSimpleWorkoutSummary()` -- Line ~8840](#rendersimpleworkoutsummary--line-8840)
- [Key Functions Reference](#key-functions-reference)

## Workout Logging

### `openWorkoutModal()` — Line 12001

Opens workout logging modal with options for:
- Quick presets (Lift, Run, Walk, HIIT)
- Custom type entry
- Duration (minutes)
- Calories burned
- Claude text import format

### Workout Creation Flow
```javascript
const workout = {
    id: generateId('workout'),
    type: 'Lift',
    duration: 45,
    calories: 280,
    time: formatTimeET(new Date()),
    date: getLocalDateString()
};
state.today.workouts[workout.id] = workout;
state.today.workedOut = true;
state.today.activeCalories += workout.calories;

// Recalculate targets with new active calories
const tdee = calculateTDEE(..., state.today.activeCalories);
state.today.targets = calculateTargets(state.today.mode, tdee, ...);

saveState();
saveDayLog();
updateStreak();
renderSimpleView();
```

### Workout Import
`processImportedWorkouts()` — Line 11372

Format: `WORKOUT|Type|Duration|Calories|Time|Date` (Time and Date optional)

Works for both today and historical dates (same pattern as meal import).

## Gym Streak Calculation

### `getWorkoutRecommendation()` — Line 9980

Returns workout recommendation based on sleep mode, exam schedule, and gym streak.

**Gym Streak Algorithm:**
```javascript
// 1. Collect all dates with workouts (today + dailyLogs)
// 2. Sort newest first
// 3. Starting from most recent, count consecutive days where dayDiff === 1
// 4. If most recent workout was 2+ days ago, streak = 0
```

Detection checks multiple sources:
- `state.today.workedOut === true`
- `getValues(state.today.workouts).length > 0`
- `log?.workedOut === true`
- `log?.workouts` has entries (handles both array and object formats)

**Recommendation Logic:**
```javascript
// GREEN mode: "Normal training day" or "Great for a workout!"
// YELLOW mode: "Light workout recommended" (reduced intensity)
// ORANGE mode: "Recovery only - walk or gentle yoga"
// Exam <= 3 days: "Rest - exam [name] in [N] days"
```

### Display in Simple View
```javascript
document.getElementById('workoutTitle').textContent = `Gym streak: ${workout.gymStreak || 0} days`;
document.getElementById('workoutDetail').textContent = workout.info;
document.getElementById('workoutRec').textContent = '→ ' + workout.recommendation;
```

## TDEE Calculation

### `calculateBMR(weight_lbs, height_cm, age)` — Line 8084

Mifflin-St Jeor equation for males:
```javascript
const weight_kg = weight_lbs / 2.205;
return Math.round((10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5);
```

### `calculateTDEE(weight_lbs, height_cm, age, todayActiveCalories)` — Line 8090

```
TDEE = (BMR * activityMultiplier) + 7-day average workout calories
```

- BMR uses Mifflin-St Jeor
- Activity multiplier = NEAT level (default: sedentary = 1.2)
- 7-day workout average: includes today, counts ALL days (rest days = 0 cal)
- If <3 days of data: falls back to today's workout calories

### `get7DayAvgActiveCalories()` — Line 8143

Returns `{ avg, days }` — the rolling average of workout calories over last 7 days.

### Activity Multipliers (NEAT)

```javascript
const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,        // Dental student default
    lightlyActive: 1.375,
    moderatelyActive: 1.55,
    veryActive: 1.725,
    extraActive: 1.9
};
```

## Weigh-In System

### `openWeighInModal()` — Line ~12468

Weekly weigh-in tracking. Fields: weight (lbs), optional body fat %.

### `saveWeighIn()` — Line ~12510

```javascript
const weighInId = generateId('weighin');
state.weighIns[weighInId] = {
    id: weighInId,
    date: getLocalDateString(),
    weight: weight,
    bodyFat: bodyFat || null,
    leanMass: bodyFat ? Math.round(weight * (1 - bodyFat/100) * 10) / 10 : null,
    fatMass: bodyFat ? Math.round(weight * bodyFat/100 * 10) / 10 : null
};

// Update current weight in profile
state.profile.currentWeight_lbs = weight;

awardXP(XP_REWARDS.weeklyWeighIn, 'Weekly weigh-in');
saveState();
saveDayLog();
checkAchievements();  // Check weight loss milestones
renderSimpleView();
```

## Body Composition Modal

### `openBodyCompModal()` — Line 13707

Two methods for body fat measurement:

#### Navy Method Tab
- Inputs: weight, neck circumference, waist circumference
- Height from `state.profile.height_inches`
- Live preview as you type

**Formula (males):**
```javascript
BF% = 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76
```

Validates: `waist > neck`, result between 3% and 50%.

#### Scale Method Tab
- Inputs: weight, body fat % (from smart scale)
- Simpler — user enters BF% directly

### Saving Body Comp

```javascript
// saveNavyMeasurement() — Line 13891
// saveScaleMeasurement() — Line ~13920

const entryId = generateId('bodycomp');
state.bodyCompHistory[entryId] = {
    id: entryId,
    date: getLocalDateString(),
    method: 'navy',  // or 'scale'
    weight: weight,
    bodyFat: bodyFat,
    leanMass: leanMass,
    fatMass: fatMass,
    measurements: { neck, waist, height }  // Navy only
};

// Also update latest weigh-in
saveWeighIn();  // or inline equivalent
```

## Body Composition Trend (Progress Tab)

### `renderBodyCompTrend()` — Line 16997

Shows fat vs lean mass changes over time:
- Needs 2+ weigh-ins with body fat data
- Calculates: fat change, lean change, total change
- Fat loss percentage: what % of weight loss was fat

Status indicators:
- **Optimal**: Losing fat, preserving muscle (lean change >= 0, fat change < 0)
- **Warning**: Losing muscle with fat (lean change < -1)
- **Gaining**: Fat increasing

## Workout Summary in Simple View

### `renderSimpleWorkoutSummary()` — Line ~8840

Shows today's workout(s) with type, duration, calories per workout. If no workouts, shows recommendation.

## Key Functions Reference

| Function | Line | Purpose |
|----------|------|---------|
| `openWorkoutModal()` | 12001 | Workout logging modal |
| `logWorkout()` | ~12100 | Save workout from modal |
| `processImportedWorkouts()` | 11372 | Claude text import |
| `getWorkoutRecommendation()` | 9980 | Sleep-based advice + gym streak |
| `calculateBMR(w, h, a)` | 8084 | Mifflin-St Jeor BMR |
| `calculateTDEE(w, h, a, cal)` | 8090 | BMR * NEAT + 7-day avg workouts |
| `get7DayAvgActiveCalories()` | 8143 | Rolling workout average |
| `openWeighInModal()` | ~12468 | Weigh-in entry |
| `saveWeighIn()` | ~12510 | Save weight + optional BF% |
| `openBodyCompModal()` | 13707 | Navy/scale body fat modal |
| `calculateNavyBodyFat(w, n, h)` | 13768 | Navy method formula |
| `saveNavyMeasurement()` | 13891 | Save Navy method result |
| `saveScaleMeasurement()` | ~13920 | Save scale BF% result |
| `renderBodyCompTrend()` | 16997 | Progress tab body comp chart |
| `renderSimpleWorkoutSummary()` | ~8840 | Simple View workout display |
