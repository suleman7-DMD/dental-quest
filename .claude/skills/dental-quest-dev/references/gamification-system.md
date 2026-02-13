# Gamification System Reference

> All code lives in `index.html`. Line numbers are approximate (post-Feb 2026 edits).

## Table of Contents
- [1. XP System](#1-xp-system)
- [2. Streak System](#2-streak-system)
- [3. Celebrations](#3-celebrations)
- [4. Streak Badge](#4-streak-badge)
- [5. XP Display Components](#5-xp-display-components)
- [6. Trigger Flow Summary](#6-trigger-flow-summary)

---

## 1. XP System

### Core Function: `awardCommandCenterXP(amount, reason)` (~line 22105)

Awards XP, updates UI, checks for level-ups.

```javascript
function awardCommandCenterXP(amount, reason) {
    // 1. Increment commandCenterData.focusStats.totalXP
    commandCenterData.focusStats.totalXP = (commandCenterData.focusStats.totalXP || 0) + amount;
    commandCenterData.focusStats.lastXPGained = amount;

    // 2. Also add to legacy stats.totalXPGained
    if (typeof stats !== 'undefined' && stats) {
        stats.totalXPGained = (stats.totalXPGained || 0) + amount;
    }

    // 3. Show toast: "+20 XP (focus session)"
    showToast(`+${amount} XP (${reason})`, '⭐');

    // 4. Floating "+20" text (CSS class .xp-float, animates via @keyframes xpFloat)
    //    Appended to .xp-display-enhanced container, auto-removed after 1300ms

    // 5. Rolling counter pop on #totalXPGained element

    // 6. Level check (see below)
    saveData();
}
```

### XP Values (Hardcoded Inline -- NOT Constants)

| Context | XP | Where Awarded |
|---------|-----|---------------|
| Complete a default/untiered task | 25 | `toggleTaskComplete()` ~19886, `completeTriageTask()` ~19995 |
| Complete a rolledOver task | 40 | same locations |
| Complete a LOCKED IN task | 50 | same locations |
| Complete a crashOutScheduled task | 75 | same locations |
| All LOCKED IN tasks cleared (bonus) | 100 | same locations (~19900, ~20008) |
| Perfect Day (all triage tasks done, 3+ tasks) | 200 | `checkForPerfectDay()` ~22274 |
| Focus timer session complete | 20 | `onFocusTimerComplete()` ~21884 |
| Full View task toggle (via `toggleTask()`) | task.xp or 20 | `toggleTask()` ~18532 |

**XP tier selection logic** (used in both `toggleTaskComplete` and `completeTriageTask`):
```javascript
const xp = task.triageTier === 'lockedIn' ? 50 :
           task.crashOutScheduled ? 75 :
           task.rolledOver ? 40 : 25;
```

**Full View** uses a different path -- `toggleTask()` at ~18524 reads `task.xp || 20` and adds to `stats.totalXPGained` and `stats.categoryXPGained[task.category]`. It does NOT call `awardCommandCenterXP`.

### Level Calculation (~line 22133)

```javascript
const newLevel = Math.floor(totalXP / 500) + 1;
```

- 500 XP per level
- Level 1 starts at 0 XP
- Level bar fill: `((totalXP % 500) / 500) * 100` percent

### Level-Up Effect (~line 22142)

When `newLevel > prevLevel`:
1. Creates `.level-up-overlay` div with "LEVEL UP!" text and level number
2. Calls `showCelebration('big')`
3. Overlay auto-removes after 2200ms

### Data Storage

```javascript
commandCenterData.focusStats = {
    totalXP: 0,         // Cumulative XP (Command Center tracking)
    focusStreak: 0,      // Focus session counter
    dailyStreak: 0,      // Consecutive active days
    lockedInStreak: 0,   // Consecutive all-locked-in days
    lastXPGained: 0      // Set by awardCommandCenterXP, used by focus complete modal
};

// Legacy stats object also tracks XP:
stats.totalXPGained    // Incremented in parallel by both toggleTask and awardCommandCenterXP
stats.categoryXPGained // { school: 120, life: 50, ... } -- only updated by toggleTask/toggleTaskComplete
```

---

## 2. Streak System

Three independent streak counters, all stored in `commandCenterData.focusStats`.

### 2a. Daily Streak (`dailyStreak`)

**What it tracks:** Consecutive calendar days where at least one triage task was completed.

**Updated by:** `updateStreaks()` at ~line 22305.

**Logic:**
```javascript
function updateStreaks() {
    const today = getTodayDateString();
    const lastActiveDay = localStorage.getItem('lastActiveDay');
    const todayTasks = getTodayTriageTasks();
    const completedToday = todayTasks.some(t => t.completed);

    if (completedToday) {
        if (lastActiveDay) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getLocalDateString(yesterday);

            if (lastActiveDay === yesterdayStr) {
                // Consecutive day: increment
                commandCenterData.focusStats.dailyStreak += 1;
            } else if (lastActiveDay !== today) {
                // Gap detected: reset to 1
                commandCenterData.focusStats.dailyStreak = 1;
            }
            // If lastActiveDay === today, do nothing (already counted today)
        } else {
            // First ever active day
            commandCenterData.focusStats.dailyStreak = 1;
        }
        localStorage.setItem('lastActiveDay', today);
    }
}
```

**localStorage key:** `lastActiveDay` (stores date string like "2026-02-13")

### 2b. LOCKED IN Streak (`lockedInStreak`)

**What it tracks:** Consecutive days where ALL LOCKED IN tasks were completed.

**Updated by:** `updateStreaks()` at ~line 22332.

**Logic:**
```javascript
const lockedInTasks = getTasksByTier('lockedIn');
if (lockedInTasks.length > 0 && lockedInTasks.every(t => t.completed)) {
    const lastLockedInComplete = localStorage.getItem('lastLockedInComplete');
    if (lastLockedInComplete !== today) {
        commandCenterData.focusStats.lockedInStreak += 1;
        localStorage.setItem('lastLockedInComplete', today);
    }
}
```

**localStorage key:** `lastLockedInComplete` (stores date string)

**Note:** Unlike dailyStreak, lockedInStreak only increments -- it never resets to 1 on gap detection. It just stops incrementing if a day is missed.

### 2c. Focus Streak (`focusStreak`)

**What it tracks:** Running count of completed focus timer sessions (NOT consecutive days).

**Updated by:** `onFocusTimerComplete()` at ~line 21887.

```javascript
commandCenterData.focusStats.focusStreak = (commandCenterData.focusStats.focusStreak || 0) + 1;
```

**No localStorage key** -- stored only in `commandCenterData.focusStats.focusStreak` (persisted via Firebase/localStorage through `saveData()`).

### When Streaks Update

`updateStreaks()` is called after every task completion:
- `toggleTaskComplete()` at ~19911
- `completeTriageTask()` at ~20016

Focus streak is updated separately in `onFocusTimerComplete()`.

---

## 3. Celebrations

### 3a. `showCelebration(size)` (~line 22154)

Creates a full-screen confetti overlay with colored particles.

```javascript
function showCelebration(size) {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#ff6b35', '#f7931e', '#ffd700', '#667eea', '#10b981', '#ec4899'];
    const count = size === 'big' ? 100 : size === 'medium' ? 50 : 20;

    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s ease-out forwards`;
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
    }
    setTimeout(() => container.remove(), 3000);
}
```

**Particle counts by size:**
| Size | Particles | Triggered By |
|------|-----------|-------------|
| `'big'` | 100 | All LOCKED IN cleared, level-up |
| `'medium'` | 50 | LOCKED IN task completed |
| `'small'` | 20 | Any other task completed |

### 3b. `showCompletionMessage()` (~line 22182)

Displays a random motivational toast that floats and fades.

```javascript
const COMPLETION_MESSAGES = [
    'Crushed it!', 'Locked in!', 'One down!', 'Lets go!',
    'On fire!', 'Beast mode!', 'Unstoppable!', 'Nailed it!',
    'Money!', 'Easy work!', 'Too smooth!', 'No sweat!'
];

function showCompletionMessage() {
    const msg = document.createElement('div');
    msg.className = 'completion-message';
    msg.textContent = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
}
```

Uses CSS `@keyframes completionMessagePop` -- pops in at center screen, floats up, fades out.

Called via guarded check: `if (typeof showCompletionMessage === 'function') showCompletionMessage();`

### 3c. `showPerfectDayBadge()` (~line 22280)

Full-screen celebration for completing all triage tasks (3+ tasks required).

```javascript
function showPerfectDayBadge() {
    // 1. Background flash overlay (.perfect-day-overlay)
    //    Gold radial gradient, animates via @keyframes perfectDayFlash

    // 2. Trophy badge (.perfect-day-badge)
    //    Contains: .trophy-glow, trophy emoji, "PERFECT DAY!" text, stats line
    //    Animates via @keyframes badgePopEnhanced

    // Both elements auto-remove after 3500ms
}
```

### 3d. `checkForPerfectDay()` (~line 22263)

```javascript
function checkForPerfectDay() {
    const todayTasks = getTodayTriageTasks();
    if (todayTasks.length === 0) return;

    const allCompleted = todayTasks.every(t => t.completed);
    if (allCompleted && todayTasks.length >= 3) {
        const today = getTodayDateString();
        const lastPerfectDay = localStorage.getItem('lastPerfectDayAward');
        if (lastPerfectDay !== today) {
            localStorage.setItem('lastPerfectDayAward', today);
            awardCommandCenterXP(200, 'Perfect Day');
            showPerfectDayBadge();
        }
    }
}
```

**Guard:** Uses `localStorage.lastPerfectDayAward` to prevent awarding twice in one day.

### 3e. Focus Timer Complete Modal (`showFocusCompleteModal()` ~line 21900)

Separate celebration for focus timer sessions:
- Random title from: `['CRUSHED IT!', 'LOCKED IN!', 'BEAST MODE!', 'UNSTOPPABLE!', 'LET\'S GO!', 'ON FIRE!', 'NAILED IT!', 'PURE FOCUS!']`
- 40 confetti particles (CSS-animated, not the `showCelebration` system)
- XP float display showing `+20 XP`
- Uses `.focus-confetti-particle` elements with `@keyframes focusConfettiFall`

### Screen Pulse Effect

On every task completion in the command center:
```javascript
document.body.classList.add('screen-pulse');
setTimeout(() => document.body.classList.remove('screen-pulse'), 500);
```
CSS: `.screen-pulse { animation: screenPulse 0.4s ease-out; }` -- brief green inset box-shadow flash.

---

## 4. Streak Badge

### `updateStreakBadge()` (~line 22190)

Updates the visual streak badge in the header area.

```javascript
function updateStreakBadge() {
    const badge = document.getElementById('streakBadge');
    const countEl = document.getElementById('streakCount');
    if (!badge || !countEl) return;

    const streak = commandCenterData?.focusStats?.dailyStreak || 0;
    countEl.textContent = streak;

    badge.classList.remove('streak-cold', 'streak-warm', 'streak-hot', 'streak-blazing', 'streak-at-risk');

    if (streak >= 8) badge.classList.add('streak-blazing');
    else if (streak >= 4) badge.classList.add('streak-hot');
    else if (streak >= 1) badge.classList.add('streak-warm');
    else badge.classList.add('streak-cold');

    // At-risk: after 9pm with no completions today and active streak
    const hour = new Date().getHours();
    const todayTasks = typeof getTodayTriageTasks === 'function' ? getTodayTriageTasks() : [];
    const completedToday = todayTasks.some(t => t.completed);
    if (hour >= 21 && !completedToday && streak > 0) {
        badge.classList.add('streak-at-risk');
    }
}
```

### Visual Tiers

| Streak Count | CSS Class | Color | Fire Animation |
|-------------|-----------|-------|----------------|
| 0 | `.streak-cold` | Slate (#94a3b8) | None |
| 1-3 | `.streak-warm` | Orange (#fb923c) | `fireFlickerSubtle` 2s |
| 4-7 | `.streak-hot` | Red (#f87171), glow shadow | `fireFlickerMedium` 1.2s |
| 8+ | `.streak-blazing` | Gold (#fbbf24), glow shadow | `fireFlickerIntense` 0.8s |
| Any + at-risk | `.streak-at-risk` | Adds `streakRiskPulse` border animation |

**At-risk condition:** Current hour >= 21 (9 PM) AND no task completed today AND streak > 0.

### Streak Badge CSS (~line 9408)

```css
.streak-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.95em;
    transition: all 0.3s ease;
}
```

Each tier adds colored background, border, and text color. The `.streak-fire` element inside uses progressively faster fire-flicker animations.

---

## 5. XP Display Components

### HTML Structure (in Focus View header)

```html
<div class="xp-display-enhanced">
    <div class="xp-level-badge" id="xpLevelBadge">1</div>
    <div class="xp-level-bar">
        <div class="xp-level-bar-fill" id="xpLevelBarFill" style="width: 0%"></div>
    </div>
    <span id="totalXPGained">0</span> XP
</div>
```

### CSS Components (~line 9318)

- `.xp-display-enhanced` -- Flex column container, positioned relative for floating text
- `.xp-level-badge` -- Circular badge (28x28px), blue-to-purple gradient, pulsing glow (`levelBadgePulse`)
- `.xp-level-bar` -- 60px wide progress bar, dark background
- `.xp-level-bar-fill` -- Animated fill (blue-to-purple gradient, 0.6s cubic-bezier transition)
- `.xp-float` -- Floating "+N" text, green, animates via `@keyframes xpFloat` (1.2s, floats upward and fades)

### Counter Animation

When XP is awarded, `#totalXPGained` gets `.animating` class for 300ms:
```javascript
counter.classList.add('animating');
setTimeout(() => counter.classList.remove('animating'), 300);
```
CSS: `@keyframes xpCounterPop` -- scales up to 1.3x with green color flash.

---

## 6. Trigger Flow Summary

**Task completed in Command Center** (via `toggleTaskComplete` or `completeTriageTask`):
1. Calculate XP by tier (25/40/50/75)
2. `awardCommandCenterXP(xp, reason)` -- toast, float, level check
3. Check if all LOCKED IN done --> bonus 100 XP + `showCelebration('big')`
4. Otherwise --> `showCelebration('medium')` for LOCKED IN, `showCelebration('small')` for others
5. `showCompletionMessage()` -- random motivational text
6. `screen-pulse` body flash
7. `checkForPerfectDay()` -- if all done and 3+ tasks, 200 XP + trophy badge
8. `updateStreaks()` -- daily streak, locked-in streak, streak badge update

**Focus timer completed** (via `onFocusTimerComplete`):
1. `awardCommandCenterXP(20, 'focus session')`
2. Increment `focusStreak`
3. `showFocusCompleteModal()` with confetti and random title
4. Vibration haptic if available

**Task completed in Full View** (via `toggleTask`):
1. Add `task.xp || 20` to `stats.totalXPGained` and `stats.categoryXPGained`
2. Does NOT call `awardCommandCenterXP`
3. Does NOT trigger celebrations or streaks
