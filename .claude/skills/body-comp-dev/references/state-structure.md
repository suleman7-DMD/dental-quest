# State Structure

## Table of Contents
- [`getDefaultState()` -- Line 7317](#getdefaultstate--line-7317)
- [Complete State Tree](#complete-state-tree)
- [Meal Object Shape](#meal-object-shape)
- [Workout Object Shape](#workout-object-shape)
- [WeighIn Object Shape](#weighin-object-shape)
- [Body Comp History Object Shape](#body-comp-history-object-shape)
- [DailyLog Object Shape (stored in `state.dailyLogs[date]`)](#dailylog-object-shape-stored-in-statedailylogsdate)
- [Frequent Foods (Default 21 items)](#frequent-foods-default-21-items)
- [isEmptyState() -- Line 7637](#isemptystate--line-7637)

## `getDefaultState()` — Line 7317

Factory function that returns the default state object. Used for restore/reset operations.

## Complete State Tree

```javascript
state = {
    // ─── PROFILE ───────────────────────────────────
    profile: {
        currentWeight_lbs: 190,        // Updated on weigh-in
        height_cm: 174,                // 5'8.5" — for BMR calculation
        height_inches: 68.5,           // For Navy method body fat
        age: 30,
        startingWeight_lbs: 190,       // For progress tracking
        startingBodyFat: 27,           // Starting BF% estimate
        goalWeight_lbs: 170,           // Target weight
        tdee_base: 2500,               // Calculated TDEE
        tdee_original: 2500,           // Original reference TDEE
        lastMilestone: 0,              // Every 5 lbs lost milestone
        startDate: null,               // First tracking date
        targetDate: '2026-06-01',      // Goal deadline
        sleepBaseline: 6.5,            // Functional sleep need (hours)
        activityLevel: 'sedentary'     // NEAT level: sedentary|lightlyActive|moderatelyActive|veryActive|extraActive
    },

    // ─── SETTINGS ──────────────────────────────────
    settings: {
        focusMode: false,              // Hide color modes, show plain numbers
        hideSleepDebtWarnings: false   // Dismiss sleep debt warnings
    },

    // ─── TODAY ──────────────────────────────────────
    today: {
        date: null,                    // YYYY-MM-DD string
        sleepHours: null,              // From stim calc or manual
        activeCalories: 0,             // From 7-day workout average
        isBrainDay: false,             // Clinic day — adds 150g carb target
        mode: null,                    // 'GREEN' | 'YELLOW' | 'ORANGE'
        targets: {
            calories: 2000,            // TDEE - deficit
            protein: 172,              // 2g/kg * multiplier
            carbs: 150,                // Brain day carb target
            floor: 1900                // Minimum calories (mode-specific)
        },
        meals: {},                     // Object keyed by generateId('meal')
        setupComplete: false,          // True after autoStartDay or manual setup
        magnesiumTaken: false,         // Micronutrient tracking
        waterGoalMet: false,           // Micronutrient tracking
        cnsProtectionAwarded: false,   // XP flag for mag+water
        workedOut: false,              // True if any workout logged today
        workouts: {},                  // Object keyed by generateId('workout')
        lastMealTime: null,            // For nudge calculations
        calTargetAwarded: false,       // XP flag: hit calorie target
        proteinTargetAwarded: false,   // XP flag: hit protein target
        perfectDayAwarded: false,      // XP flag: perfect day
        alerts: {
            undereatingShown: false,    // Nudge suppression
            lowProteinShown: false
        }
    },

    // ─── ECOSYSTEM CONTEXT (READ-ONLY) ─────────────
    ecosystemContext: {
        stimulant: {                   // From Stim Calc
            sleepHours: null,          // Last night's sleep
            wakeTime: null,            // Today's wake time
            lastAdderallTime: null,    // Most recent dose time
            lastAdderallDose: null,    // Most recent dose mg
            totalAdderallToday: 0,     // Sum of today's doses
            isBooster: false,          // True if >1 dose today
            lastCaffeineTime: null,    // Most recent caffeine time
            caffeineMg: 0,             // Total caffeine today
            projectedSleepTime: null,  // Estimated bedtime
            projectedSleepMinutes: null,
            allNighterMode: false,     // Forces ORANGE mode
            lastSynced: null           // ISO timestamp
        },
        inventory: {                   // From Dental Quest
            pills30mg: null,           // Adderall 30mg count
            pills20mg: null,           // Adderall 20mg count
            refillDate30mg: null,      // Next refill date
            refillDate20mg: null,
            daysUntilRefill: null,
            willRunOut: false,         // Will run out before refill
            lastSynced: null
        },
        academic: {                    // From D3 Roadmap
            nextExam: null,            // { name, date, weight, priority }
            daysUntilExam: null,
            upcomingExams: [],         // Next 30 days
            lastSynced: null
        },
        schedule: {                    // From D3 Roadmap monthly planner
            todayTasks: [],
            tomorrowTasks: [],
            blockedWindows: [],        // Times when can't eat
            eatingWindows: [],         // Available eating times
            totalEatingHours: 0,
            frontLoadRequired: false,  // Need to eat before busy period
            frontLoadDeadline: null,
            scheduleIntensity: 'EASY', // EASY | MEDIUM | HARD
            lastSynced: null
        },
        examDay: {                     // Derived from academic
            isExamDay: false,
            examName: null,
            examTime: null,
            minutesUntilExam: null,
            phase: null                // MORNING_PREP | PRE_EXAM | FINAL_HOUR | DURING_EXAM | POST_EXAM
        },
        sleepDebt: {                   // Calculated from last 7 days
            last7Days: [],
            totalSleep: 0,
            avgSleep: 0,
            weeklyDebt: 0,
            consecutiveBadNights: 0,
            severity: 'LOW'            // LOW | MODERATE | HIGH | SEVERE
        },
        stimulantEffect: {             // Calculated from stim data
            adderallEffect: 0,
            caffeineEffect: 0,
            combinedEffect: 0,
            suppressionLevel: 'LOW',   // LOW | MODERATE | HIGH | SEVERE
            suppressionEnd: null,
            crashRiskWindow: { start: null, end: null, intensity: 'NORMAL' }
        }
    },

    // ─── COLLECTIONS (Object-keyed for Firebase safety) ───
    dailyLogs: {},                     // Keyed by 'YYYY-MM-DD' date string
    frequentFoods: {},                 // Keyed by 'ff_NNN' or generateId('ff')
    weighIns: {},                      // Keyed by generateId('weighin')
    bodyCompHistory: {},               // Keyed by generateId('bodycomp')

    // ─── REFEED TRACKER ────────────────────────────
    refeedTracker: {
        cumulativeDeficit: 0,          // Running total deficit
        lastRefeedDate: null,
        weeksInDeficit: 0,
        lastDietBreak: null
    },

    // ─── GAMIFICATION ──────────────────────────────
    gamification: {
        xp: 0,
        level: 1,
        streak: 0,                     // Current daily streak
        longestStreak: 0,
        totalDaysTracked: 0,
        perfectDays: 0,
        badges: {},                    // Keyed by achievement ID
        lastCompletedDate: null        // YYYY-MM-DD of last tracked day
    },

    // ─── ACHIEVEMENTS ──────────────────────────────
    achievements: {
        first_day:       { id: 'first_day',       name: 'First Steps',      desc: 'Complete first day',     icon: '🚀', xp: 50,   unlocked: false },
        week_streak:     { id: 'week_streak',     name: 'Week Warrior',     desc: '7 day streak',           icon: '🔥', xp: 200,  unlocked: false },
        two_week_streak: { id: 'two_week_streak', name: 'Consistency King', desc: '14 day streak',          icon: '👑', xp: 500,  unlocked: false },
        month_streak:    { id: 'month_streak',    name: 'Iron Will',        desc: '30 day streak',          icon: '💎', xp: 1000, unlocked: false },
        first_lb:        { id: 'first_lb',        name: 'First Pound',      desc: 'Lose first pound',       icon: '⬇️', xp: 100,  unlocked: false },
        five_lbs:        { id: 'five_lbs',        name: 'Milestone 5',      desc: 'Lose 5 pounds',          icon: '🎯', xp: 300,  unlocked: false },
        ten_lbs:         { id: 'ten_lbs',         name: 'Double Digits',    desc: 'Lose 10 pounds',         icon: '🏆', xp: 500,  unlocked: false },
        halfway:         { id: 'halfway',         name: 'Halfway Hero',     desc: 'Reach halfway to goal',  icon: '⭐', xp: 750,  unlocked: false },
        protein_king:    { id: 'protein_king',    name: 'Protein King',     desc: '7 day protein streak',   icon: '🥩', xp: 250,  unlocked: false },
        deficit_master:  { id: 'deficit_master',  name: 'Deficit Master',   desc: '7 day deficit streak',   icon: '📉', xp: 250,  unlocked: false },
        early_bird:      { id: 'early_bird',      name: 'Early Bird',       desc: '5 early breakfasts',     icon: '🌅', xp: 150,  unlocked: false },
        perfect_week:    { id: 'perfect_week',    name: 'Perfect Week',     desc: '7 perfect days',         icon: '✨', xp: 400,  unlocked: false }
    },

    // ─── VERSION CONTROL ───────────────────────────
    _version: 0,                       // MUST be 0 in defaults (cloud always wins on fresh device)
    _lastModified: null,               // ISO timestamp
    _dataLoaded: false                 // True after real data confirmed loaded
};
```

## Meal Object Shape

```javascript
{
    id: 'meal_17074...',       // generateId('meal')
    name: 'Chicken Breast',    // Display name
    calories: 350,             // kcal
    protein: 45,               // grams
    carbs: 0,                  // grams
    fat: 0,                    // grams (optional)
    time: '2:30 PM',          // formatTimeET() output
    date: '2026-02-13',       // YYYY-MM-DD
    _importedAt: null          // ISO timestamp if imported from Claude
}
```

## Workout Object Shape

```javascript
{
    id: 'workout_17074...',    // generateId('workout')
    type: 'Lift',              // Workout type string
    duration: 45,              // Minutes
    calories: 280,             // Calories burned
    time: '5:00 PM',          // formatTimeET() output
    date: '2026-02-13'        // YYYY-MM-DD
}
```

## WeighIn Object Shape

```javascript
{
    id: 'weighin_17074...',    // generateId('weighin')
    date: '2026-02-13',       // YYYY-MM-DD
    weight: 188.5,            // lbs
    bodyFat: 25.3,            // Percentage (null if not measured)
    leanMass: 140.8,          // lbs (calculated)
    fatMass: 47.7             // lbs (calculated)
}
```

## Body Comp History Object Shape

```javascript
{
    id: 'bodycomp_17074...',   // generateId('bodycomp')
    date: '2026-02-13',
    method: 'navy',            // 'navy' or 'scale'
    weight: 188.5,
    bodyFat: 25.3,
    leanMass: 140.8,
    fatMass: 47.7,
    measurements: {            // Navy method only
        neck: 15.5,
        waist: 37.0,
        height: 68.5
    }
}
```

## DailyLog Object Shape (stored in `state.dailyLogs[date]`)

```javascript
{
    date: '2026-02-13',
    // Macros
    calories: 1850,
    protein: 165,
    carbs: 120,
    // Targets (snapshot)
    target: 2000,
    targetProtein: 172,
    targetCarbs: 150,
    floor: 1900,
    // Performance
    tdee: 2500,
    deficit: 650,
    perfect: false,
    status: 'good',           // V2: 'perfect' | 'deficit_gym' | 'good' | 'gym_only' | 'partial' | 'over' | 'missed' | 'no_data'
    calHit: true,
    proteinHit: true,
    carbsHit: false,
    // V2 fields (added by determineDayStatus + scoring functions):
    calScore: 85,              // 0-100 margin-based score (USDA HEI)
    proteinScore: 92,          // 0-100 margin-based score
    deficitScore: 78,          // 0-100 margin-based score
    // Context
    mode: 'GREEN',
    sleepHours: 7,
    activeCalories: 300,
    mealCount: 4,
    workedOut: true,
    // Detailed data (DEEP COPIES)
    meals: {},                 // Deep copy of state.today.meals
    workouts: {},              // Deep copy of state.today.workouts
    // Snapshots
    ecosystemSnapshot: { stimulant: {}, academic: {}, sleepDebt: {} },
    logicLog: '...',           // generateLogicLog() output
    lastUpdated: 'ISO...'
}
```

## Frequent Foods (Default 21 items)

Stored as `state.frequentFoods` — object keyed by `ff_NNN`. If empty after load, repopulated from `getDefaultFrequentFoods()`.

Key items: Just Bare Chicken (6oz/3oz), Vital Farms Eggs, 365 Salmon Patty, Orgain Shakes, Oikos Yogurt, Chipotle bowls, Dave's, 365 Pizza, Wheat Bread, Trail Mix, Flax Cereal, Turkey Burger, Rotisserie Chicken.

Each food: `{ id, name, calories, protein, carbs, uses }` — `uses` counter tracks frequency for sorting.

## isEmptyState() — Line 7637

Returns true if ALL of these are false:
1. `getCount(data.weighIns) > 0`
2. `getCount(data.today?.meals) > 0`
3. `getCount(data.today?.workouts) > 0`
4. `getCount(data.dailyLogs) > 0`
5. `getCount(data.bodyCompHistory) > 0`
6. `data.today?.setupComplete === true`

Must have at least ONE to be considered non-empty.
