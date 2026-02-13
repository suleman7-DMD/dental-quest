# Gamification System

## Table of Contents
- [XP Rewards](#xp-rewards)
  - [Additional XP Sources](#additional-xp-sources)
- [Level System](#level-system)
  - [`getLevelInfo(xp)` -- Line 16743](#getlevelinfoxp--line-16743)
  - [`awardXP(amount, reason)` -- Line 16753](#awardxpamount-reason--line-16753)
- [Streak System](#streak-system)
  - [`updateStreak()` -- Line 16772](#updatestreak--line-16772)
- [Day Completion Checks](#day-completion-checks)
  - [`checkDayCompletion()` -- Line 16808](#checkdaycompletion--line-16808)
- [Achievements](#achievements)
  - [12 Achievements](#12-achievements)
  - [`checkAchievements()` -- Line 16848](#checkachievements--line-16848)
  - [`unlockAchievement(achievementId)` -- Line 16892](#unlockachievementachievementid--line-16892)
- [Celebrations](#celebrations)
  - [`showCelebration(type, data)` -- Line 16912](#showcelebrationtype-data--line-16912)
  - [`triggerConfetti()` -- Line 16954](#triggerconfetti--line-16954)
- [XP Bar Display](#xp-bar-display)
  - [`renderXPBar()` -- Line 16704](#renderxpbar--line-16704)
- [Gamification State](#gamification-state)
- [Key Functions Reference](#key-functions-reference)

## XP Rewards

```javascript
const XP_REWARDS = {
    logMeal: 10,              // Per meal logged
    hitCalorieTarget: 30,     // Calories in range [floor, target]
    hitProteinTarget: 30,     // Protein >= 90% of target
    perfectDay: 50,           // Both cal + protein targets hit
    weeklyWeighIn: 25,        // Each weigh-in
    streakBonus: 5            // Per day of streak (only when streak >= 3)
};
```

### Additional XP Sources
- **CNS Protection**: 10 XP for checking both magnesium + water (`updateMicronutrients()`)
- **Achievement unlocks**: Each achievement has its own XP value (50-1000)

## Level System

```javascript
const LEVEL_THRESHOLDS = [
    { level: 1,  name: 'Beginner',    xpRequired: 0 },
    { level: 2,  name: 'Committed',   xpRequired: 100 },
    { level: 3,  name: 'Consistent',  xpRequired: 300 },
    { level: 4,  name: 'Dedicated',   xpRequired: 600 },
    { level: 5,  name: 'Disciplined', xpRequired: 1000 },
    { level: 6,  name: 'Warrior',     xpRequired: 1500 },
    { level: 7,  name: 'Champion',    xpRequired: 2200 },
    { level: 8,  name: 'Elite',       xpRequired: 3000 },
    { level: 9,  name: 'Master',      xpRequired: 4000 },
    { level: 10, name: 'Legend',       xpRequired: 5500 }
];
```

### `getLevelInfo(xp)` — Line 16743

Returns the highest level threshold where `xp >= xpRequired`.

### `awardXP(amount, reason)` — Line 16753

```javascript
function awardXP(amount, reason) {
    const oldLevel = getLevelInfo(state.gamification.xp).level;
    state.gamification.xp += amount;
    const newLevel = getLevelInfo(state.gamification.xp).level;

    showToast(`+${amount} XP: ${reason}`);

    if (newLevel > oldLevel) {
        setTimeout(() => showCelebration('levelUp', newLevel), 500);
    }

    renderXPBar();
    saveState();
}
```

## Streak System

### `updateStreak()` — Line 16772

Daily completion streak logic:

```javascript
function updateStreak() {
    const today = getLocalDateString();
    const yesterday = getLocalDateString(yesterdayDate);  // DST-safe
    const lastCompleted = state.gamification.lastCompletedDate;

    if (lastCompleted === today) {
        return;  // Already counted today
    } else if (lastCompleted === yesterday) {
        // Streak continues
        state.gamification.streak++;
        state.gamification.lastCompletedDate = today;
        // Bonus XP for streaks >= 3 days
        if (state.gamification.streak >= 3) {
            awardXP(XP_REWARDS.streakBonus * state.gamification.streak,
                     `${state.gamification.streak} day streak!`);
        }
    } else {
        // Streak broken or first day
        state.gamification.streak = 1;
        state.gamification.lastCompletedDate = today;
    }

    // Update longest streak
    if (state.gamification.streak > state.gamification.longestStreak) {
        state.gamification.longestStreak = state.gamification.streak;
    }

    state.gamification.totalDaysTracked++;
    checkAchievements();
    renderXPBar();
}
```

Note: This is a **daily completion streak** (days user has tracked food), NOT a gym streak. The gym streak is calculated separately in `getWorkoutRecommendation()`.

## Day Completion Checks

### `checkDayCompletion()` — Line 16808

Runs after each meal logged. Checks if targets are met and awards XP:

```javascript
// Calorie target: floor <= calories <= target
const calHit = totals.calories >= targets.floor && totals.calories <= targets.calories;

// Protein target: >= 90% of target
const proteinHit = totals.protein >= targets.protein * 0.9;

// Awards (each only once per day):
// - hitCalorieTarget: 30 XP (state.today.calTargetAwarded)
// - hitProteinTarget: 30 XP (state.today.proteinTargetAwarded)
// - perfectDay: 50 XP + confetti (state.today.perfectDayAwarded)
```

## Achievements

### 12 Achievements

| ID | Name | Condition | XP |
|----|------|-----------|-----|
| `first_day` | First Steps | 1 day tracked | 50 |
| `week_streak` | Week Warrior | 7 day streak | 200 |
| `two_week_streak` | Consistency King | 14 day streak | 500 |
| `month_streak` | Iron Will | 30 day streak | 1000 |
| `first_lb` | First Pound | Lose 1 pound | 100 |
| `five_lbs` | Milestone 5 | Lose 5 pounds | 300 |
| `ten_lbs` | Double Digits | Lose 10 pounds | 500 |
| `halfway` | Halfway Hero | Halfway to goal weight | 750 |
| `protein_king` | Protein King | 7 day protein streak | 250 |
| `deficit_master` | Deficit Master | 7 day deficit streak | 250 |
| `early_bird` | Early Bird | 5 early breakfasts | 150 |
| `perfect_week` | Perfect Week | 7 perfect days | 400 |

### `checkAchievements()` — Line 16848

Runs after `updateStreak()`. Checks:
- First day (totalDaysTracked >= 1)
- Streak achievements (streak >= 7/14/30)
- Perfect week (perfectDays >= 7)
- Weight loss milestones (startingWeight - currentWeight >= 1/5/10)
- Halfway (lbsLost >= totalToLose / 2)

### `unlockAchievement(achievementId)` — Line 16892

```javascript
function unlockAchievement(achievementId) {
    achievement.unlocked = true;
    achievement.unlockedDate = getLocalDateString();
    state.gamification.badges[achievementId] = {
        id: achievementId,
        unlockedDate: achievement.unlockedDate
    };
    state.gamification.xp += achievement.xp;
    showCelebration('achievement', achievement);
    saveState();
}
```

## Celebrations

### `showCelebration(type, data)` — Line 16912

Full-screen overlay with confetti animation:
- **Achievement**: Shows icon, name, XP award
- **Level Up**: Shows new level number and name

Auto-closes after 3 seconds. Clicking overlay also closes.

### `triggerConfetti()` — Line 16954

Creates 50 randomly colored confetti particles with fall animation. Colors: green, amber, blue, purple, red, pink.

## XP Bar Display

### `renderXPBar()` — Line 16704

Renders the persistent XP bar at the top of the app:
- Level badge with number
- Level name (Beginner through Legend)
- Total XP + XP to next level
- Progress bar fill width
- Current streak count
- Total days tracked (calculated from dailyLogs + today)
- Perfect days count

## Gamification State

```javascript
state.gamification = {
    xp: 0,
    level: 1,
    streak: 0,               // Current daily completion streak
    longestStreak: 0,
    totalDaysTracked: 0,
    perfectDays: 0,
    badges: {},               // { achievementId: { id, unlockedDate } }
    lastCompletedDate: null   // YYYY-MM-DD
};
```

## Key Functions Reference

| Function | Line | Purpose |
|----------|------|---------|
| `awardXP(amount, reason)` | 16753 | Add XP, check level up |
| `updateStreak()` | 16772 | Update daily streak |
| `checkDayCompletion()` | 16808 | Check cal/protein targets, award XP |
| `checkAchievements()` | 16848 | Check all 12 achievement conditions |
| `unlockAchievement(id)` | 16892 | Unlock + award XP + celebrate |
| `showCelebration(type, data)` | 16912 | Full-screen celebration overlay |
| `triggerConfetti()` | 16954 | Confetti particle animation |
| `renderXPBar()` | 16704 | Update XP bar display |
| `getLevelInfo(xp)` | 16743 | Get level for XP amount |
| `renderAchievements()` | ~18350 | Badges tab gallery |
| `renderAchievementProgress()` | ~17860 | Next achievement progress bar |
