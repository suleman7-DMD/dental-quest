# Gamification & Feedback System Enhancements

## Table of Contents
1. [Current State Analysis](#1-current-state-analysis)
2. [Problems Identified](#2-problems-identified)
3. [Enhancement Designs](#3-enhancement-designs)
   - [3.1 XP Display Enhancement](#31-xp-display-enhancement)
   - [3.2 Streak Enhancement](#32-streak-enhancement)
   - [3.3 Progress Visualization](#33-progress-visualization)
   - [3.4 Task Completion Rewards](#34-task-completion-rewards)
   - [3.5 Idle Nudges](#35-idle-nudges-visual-enhancement)
   - [3.6 Toast Notification Upgrade](#36-toast-notification-upgrade)
   - [3.7 Perfect Day & Milestone Celebrations](#37-perfect-day--milestone-celebrations)
4. [Complete @keyframes Definitions](#4-complete-keyframes-definitions)
5. [CSS Variables](#5-css-variables)

---

## 1. Current State Analysis

### XP System
| Element | Location | Current Implementation |
|---------|----------|----------------------|
| XP display | `index.html:7232-7240` | Static text numbers in stats bar (`<span id="totalXPGained">0</span>`) |
| XP award function | `index.html:18505-18515` | `awardCommandCenterXP(amount, reason)` adds XP and shows basic toast |
| XP amounts | `index.html:16459-16463` | LOCKED IN: 50xp, Crash Out: 75xp, Rolled Over: 40xp, Regular: 25xp, Focus Session: 20xp, All Locked In: 100xp, Perfect Day: 200xp |
| Level display CSS | `index.html:459-466` | `.level-display` class exists but appears unused in Command Center |
| Category XP bars | `index.html:602-627` | `.category-xp-bar` with gradient styling, used in Full View only |

### Streak System
| Element | Location | Current Implementation |
|---------|----------|----------------------|
| Streak data | `index.html:8503-8505` | `focusStreak`, `dailyStreak`, `lockedInStreak` (numbers only) |
| Streak update | `index.html:18606-18644` | `updateStreaks()` calculates daily + LOCKED IN streaks |
| Focus streak increment | `index.html:18321` | Incremented on focus timer complete |
| Streak display | `index.html:7677` | Plain text: `"Focus streak: 4 sessions"` |

### Celebration System
| Element | Location | Current Implementation |
|---------|----------|----------------------|
| Confetti CSS (1) | `index.html:932-952` | Basic confetti fall animation |
| Confetti CSS (2) | `index.html:7000-7021` | **Duplicate** confetti styles (should consolidate) |
| Confetti JS | `index.html:18517-18536` | `showCelebration(size)` creates 20/50/100 divs |
| Perfect day badge CSS | `index.html:7023-7044` | `.perfect-day-badge` with `badgePop` scale animation |
| Perfect day JS | `index.html:18577-18603` | Awards 200xp, shows trophy badge for 2.5s |

### Progress Display
| Element | Location | Current Implementation |
|---------|----------|----------------------|
| Overall progress bar | `index.html:7348-7355` | Simple fill bar with text `"X/Y tasks / Z%"` |
| Mini progress bars | `index.html:7369-7412` | Per-column (LOCKED IN / TODAY / TOMORROW) |
| Progress update JS | `index.html:16218-16229` | `updateOverallProgress()` sets width + text |
| Progress bar CSS | `index.html:5556-5599` | Gradient fill, basic transition |

### Task Completion Flow
| Element | Location | Current Implementation |
|---------|----------|----------------------|
| Toggle complete | `index.html:16443-16489` | `toggleTaskComplete()` awards XP, shows confetti |
| XP toast | `index.html:18513` | `showToast('+50 XP (LOCKED IN task)')` |
| Celebration sizes | `index.html:16470-16471` | big (all locked in), medium (locked in), small (other) |

### Idle/Nudge System
| Element | Location | Current Implementation |
|---------|----------|----------------------|
| Time prompt CSS | `index.html:1500-1529` | White background modal, basic layout |
| Prompt modal JS | `index.html:17049-17087` | `showTimePrompt(task)` with push/dismiss options |
| Prompt check | `index.html:16992-17047` | Fires per scheduled crash out task |

### Toast System
| Element | Location | Current Implementation |
|---------|----------|----------------------|
| Toast CSS | `index.html:2431-2458` | White background, slide-in from right |
| Toast HTML | `index.html:7177-7179` | Single toast element with icon + message |
| Toast JS | `index.html:9632-9646` | `showToast(message, icon)` 3-second display |

---

## 2. Problems Identified

### Critical Issues
1. **No XP feedback loop** - XP gain is a boring toast notification. No visual drama, no sense of accumulation, no "rolling counter" effect. Users don't feel the dopamine hit.
2. **Streaks are invisible** - Streak counts exist in data but are not surfaced anywhere in the main UI. The fire emoji is static text. Zero visual intensity scaling.
3. **No level system** - XP accumulates forever with no levels, no milestones, no "Level Up!" moments. The `.level-display` CSS class exists but is unused.
4. **Confetti is duplicate CSS** - Two identical confetti blocks (lines 932-952 and 7000-7021). Wasteful and confusing.
5. **Progress has no milestones** - The progress bar fills linearly with no celebration at 25%, 50%, 75%, or 100%.
6. **Toast is light-theme** - White background toast clashes with the dark theme used by Command Center.
7. **Time prompts use light theme** - White background modals with dark text clash with the dark UI.
8. **No encouraging messages** - Task completion shows only the XP toast. No motivational text, no variety.
9. **Perfect day badge is generic** - Just a yellow box with trophy emoji. No particle effects, no drama.
10. **Focus complete modal is static** - The "CRUSHED IT!" modal at line 7670 has no entry animation.

### Missing Features
- Animated XP counter (rolling number effect)
- Floating "+50 XP" text that rises and fades
- Level system with progress bar
- Streak fire icon with intensity scaling
- Milestone celebrations at 25/50/75/100%
- Encouraging message rotation
- Daily summary modal
- Progress ring/donut chart alternative
- "Next task?" micro-nudge after completion

---

## 3. Enhancement Designs

### 3.1 XP Display Enhancement

#### Current (line 7232-7240)
Plain `<span>` with static number, updated by `updateStats()` at line 15528.

#### Proposed Enhancement

**A. Animated Rolling Counter**
When XP changes, the number animates from old value to new value over 600ms.

**B. Floating "+XP" Text**
On XP gain, a floating text element rises from the XP display and fades out.

**C. XP Level Bar**
Add a level system: every 500 XP = 1 level. Show current level + progress bar to next level.

#### CSS Code

```css
/* === GAMIFICATION: XP ENHANCEMENTS === */

/* XP Display Container - replaces plain stat-card for XP */
.xp-display-enhanced {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

/* Level badge */
.xp-level-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    font-weight: 800;
    font-size: 0.75em;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
    animation: levelBadgePulse 3s ease-in-out infinite;
}

@keyframes levelBadgePulse {
    0%, 100% { box-shadow: 0 0 12px rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.7); }
}

/* XP mini progress bar (to next level) */
.xp-level-bar {
    width: 60px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
}

.xp-level-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    border-radius: 2px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Floating XP gain text */
.xp-float {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    font-weight: 800;
    font-size: 1.1em;
    color: #22c55e;
    text-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
    pointer-events: none;
    z-index: 100;
    animation: xpFloat 1.2s ease-out forwards;
}

@keyframes xpFloat {
    0% {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
    30% {
        transform: translateX(-50%) translateY(-15px) scale(1.2);
    }
    100% {
        opacity: 0;
        transform: translateX(-50%) translateY(-50px) scale(0.8);
    }
}

/* Rolling counter animation */
.xp-counter-rolling {
    display: inline-block;
    transition: none;
}

.xp-counter-rolling.animating {
    animation: xpCounterPop 0.3s ease-out;
}

@keyframes xpCounterPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); color: #22c55e; }
    100% { transform: scale(1); }
}

/* Level Up overlay */
.level-up-overlay {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    z-index: 10001;
    text-align: center;
    pointer-events: none;
    animation: levelUpPop 2s ease-out forwards;
}

.level-up-overlay .level-up-text {
    font-size: 2.5em;
    font-weight: 900;
    background: linear-gradient(135deg, #fbbf24, #f59e0b, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: none;
    filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.5));
}

.level-up-overlay .level-number {
    font-size: 4em;
    font-weight: 900;
    color: white;
    text-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
    margin-top: -5px;
}

@keyframes levelUpPop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    30% { transform: translate(-50%, -50%) scale(1); }
    70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
}
```

#### HTML Changes (line ~7232)

Replace the XP stat-card:
```html
<!-- BEFORE -->
<div class="stat-card" style="padding: 8px 16px; ...">
    <span style="...">XP Earned</span>
    <span id="totalXPGained" style="...">0</span>
</div>

<!-- AFTER -->
<div class="stat-card xp-display-enhanced" style="padding: 8px 16px; min-width: auto; flex: 0 1 auto; background: rgba(255,255,255,0.08); border-radius: 12px; text-align: center; position: relative;">
    <div style="display: flex; align-items: center; gap: 6px;">
        <span class="xp-level-badge" id="xpLevelBadge">1</span>
        <div>
            <span style="font-size: 0.7em; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">XP</span>
            <span id="totalXPGained" class="xp-counter-rolling" style="font-size: 1.1em; font-weight: 700; color: white; margin-left: 4px;">0</span>
        </div>
    </div>
    <div class="xp-level-bar">
        <div class="xp-level-bar-fill" id="xpLevelBarFill" style="width: 0%;"></div>
    </div>
</div>
```

#### JS Additions (minimal, animation triggers only)

Add inside `awardCommandCenterXP()` at line ~18513, **after** the existing `showToast` call:

```javascript
// Floating XP text
const xpContainer = document.querySelector('.xp-display-enhanced');
if (xpContainer) {
    const floater = document.createElement('div');
    floater.className = 'xp-float';
    floater.textContent = `+${amount}`;
    xpContainer.appendChild(floater);
    setTimeout(() => floater.remove(), 1300);
}

// Rolling counter pop
const counter = document.getElementById('totalXPGained');
if (counter) {
    counter.classList.add('animating');
    setTimeout(() => counter.classList.remove('animating'), 300);
}

// Level check (500 XP per level)
const totalXP = commandCenterData.focusStats.totalXP || 0;
const newLevel = Math.floor(totalXP / 500) + 1;
const prevLevel = Math.floor((totalXP - amount) / 500) + 1;
const levelBadge = document.getElementById('xpLevelBadge');
const levelBar = document.getElementById('xpLevelBarFill');
if (levelBadge) levelBadge.textContent = newLevel;
if (levelBar) levelBar.style.width = `${((totalXP % 500) / 500) * 100}%`;

if (newLevel > prevLevel) {
    // Level up!
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = `<div class="level-up-text">LEVEL UP!</div><div class="level-number">${newLevel}</div>`;
    document.body.appendChild(overlay);
    showCelebration('big');
    setTimeout(() => overlay.remove(), 2200);
}
```

Add inside `updateStats()` at line ~15528, **after** the existing `totalXPElement.textContent = stats.totalXPGained` line:

```javascript
// Update level display
const totalXP = commandCenterData?.focusStats?.totalXP || stats.totalXPGained || 0;
const currentLevel = Math.floor(totalXP / 500) + 1;
const levelBadge = document.getElementById('xpLevelBadge');
const levelBar = document.getElementById('xpLevelBarFill');
if (levelBadge) levelBadge.textContent = currentLevel;
if (levelBar) levelBar.style.width = `${((totalXP % 500) / 500) * 100}%`;
```

---

### 3.2 Streak Enhancement

#### Current (line 7677)
Plain text: `"Focus streak: 4 sessions"` inside the focus timer complete modal only.

#### Proposed Enhancement

**A. Streak badge** visible in the stats bar at all times.

**B. Fire icon with intensity scaling** based on streak length.

**C. Streak-at-risk warning** after 9 PM if no tasks completed today.

#### CSS Code

```css
/* === GAMIFICATION: STREAK ENHANCEMENTS === */

/* Streak badge in stats bar */
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

/* Streak tiers */
.streak-badge.streak-cold {
    background: rgba(100, 116, 139, 0.2);
    border: 1px solid rgba(100, 116, 139, 0.3);
    color: #94a3b8;
}

.streak-badge.streak-warm {
    background: rgba(251, 146, 60, 0.15);
    border: 1px solid rgba(251, 146, 60, 0.3);
    color: #fb923c;
}

.streak-badge.streak-hot {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
}

.streak-badge.streak-blazing {
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid rgba(251, 191, 36, 0.4);
    color: #fbbf24;
    box-shadow: 0 0 16px rgba(251, 191, 36, 0.3);
}

/* Fire icon with animation */
.streak-fire {
    display: inline-block;
    font-size: 1.1em;
}

.streak-warm .streak-fire {
    animation: fireFlickerSubtle 2s ease-in-out infinite;
}

.streak-hot .streak-fire {
    animation: fireFlickerMedium 1.2s ease-in-out infinite;
}

.streak-blazing .streak-fire {
    animation: fireFlickerIntense 0.8s ease-in-out infinite;
}

@keyframes fireFlickerSubtle {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.05) rotate(-2deg); }
    75% { transform: scale(0.98) rotate(2deg); }
}

@keyframes fireFlickerMedium {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
    25% { transform: scale(1.15) rotate(-4deg); opacity: 0.9; }
    50% { transform: scale(1.05) rotate(2deg); }
    75% { transform: scale(1.1) rotate(-2deg); opacity: 0.95; }
}

@keyframes fireFlickerIntense {
    0%, 100% { transform: scale(1) rotate(0deg); filter: brightness(1); }
    15% { transform: scale(1.2) rotate(-5deg); filter: brightness(1.3); }
    30% { transform: scale(1.05) rotate(3deg); }
    45% { transform: scale(1.15) rotate(-3deg); filter: brightness(1.2); }
    60% { transform: scale(1.1) rotate(4deg); }
    80% { transform: scale(1.2) rotate(-2deg); filter: brightness(1.4); }
}

/* Streak at risk warning */
.streak-at-risk {
    animation: streakRiskPulse 2s ease-in-out infinite;
}

@keyframes streakRiskPulse {
    0%, 100% { border-color: rgba(239, 68, 68, 0.3); }
    50% { border-color: rgba(239, 68, 68, 0.7); box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
}

/* Streak milestone flash */
.streak-milestone {
    animation: streakMilestone 0.6s ease-out;
}

@keyframes streakMilestone {
    0% { transform: scale(1); }
    30% { transform: scale(1.3); filter: brightness(1.5); }
    100% { transform: scale(1); filter: brightness(1); }
}
```

#### HTML Changes (line ~7260, after the Completed stat-card)

Add a new streak badge to the stats bar:

```html
<div class="streak-badge streak-cold" id="streakBadge" style="padding: 8px 12px; min-width: auto; flex: 0 1 auto;">
    <span class="streak-fire">&#x1F525;</span>
    <span id="streakCount">0</span>
    <span style="font-size: 0.7em; color: inherit; opacity: 0.8;">day streak</span>
</div>
```

#### JS Additions

Add a function to update the streak badge (call from `updateStreaks()` at line ~18643 and from `updateStats()`):

```javascript
function updateStreakBadge() {
    const badge = document.getElementById('streakBadge');
    const countEl = document.getElementById('streakCount');
    if (!badge || !countEl) return;

    const streak = commandCenterData?.focusStats?.dailyStreak || 0;
    countEl.textContent = streak;

    // Remove all tier classes
    badge.classList.remove('streak-cold', 'streak-warm', 'streak-hot', 'streak-blazing', 'streak-at-risk');

    // Apply tier
    if (streak >= 8) badge.classList.add('streak-blazing');
    else if (streak >= 4) badge.classList.add('streak-hot');
    else if (streak >= 1) badge.classList.add('streak-warm');
    else badge.classList.add('streak-cold');

    // Streak at risk warning (after 9 PM, no tasks done today)
    const hour = new Date().getHours();
    const todayTasks = getTodayTriageTasks();
    const completedToday = todayTasks.some(t => t.completed);
    if (hour >= 21 && !completedToday && streak > 0) {
        badge.classList.add('streak-at-risk');
    }
}
```

---

### 3.3 Progress Visualization

#### Current (lines 7348-7355)
Simple horizontal bar with text percentage.

#### Proposed Enhancement

**A. SVG Progress Ring** (donut chart) showing today's completion.

**B. Milestone markers** at 25%, 50%, 75%, 100%.

**C. Color transitions** as progress increases (blue -> green -> gold).

**D. Celebration triggers** at each milestone.

#### CSS Code

```css
/* === GAMIFICATION: PROGRESS RING === */

.progress-ring-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
}

.progress-ring-svg {
    transform: rotate(-90deg);
    width: 80px;
    height: 80px;
}

.progress-ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 6;
}

.progress-ring-fill {
    fill: none;
    stroke: var(--accent-blue);
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease;
}

/* Color transitions based on progress */
.progress-ring-fill.progress-low { stroke: #3b82f6; }
.progress-ring-fill.progress-mid { stroke: #22c55e; }
.progress-ring-fill.progress-high { stroke: #f59e0b; }
.progress-ring-fill.progress-complete { stroke: #fbbf24; filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.5)); }

.progress-ring-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.2em;
    font-weight: 800;
    color: var(--text-primary);
}

.progress-ring-label {
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.6em;
    color: var(--text-muted);
    white-space: nowrap;
}

/* Milestone pulse on the progress bar */
.progress-milestone-hit {
    animation: milestonePulse 0.6s ease-out;
}

@keyframes milestonePulse {
    0% { filter: brightness(1); }
    30% { filter: brightness(1.6); }
    100% { filter: brightness(1); }
}

/* Enhanced overall progress bar with milestone markers */
.progress-bar-enhanced {
    position: relative;
    width: 100%;
    height: 10px;
    background: var(--bg-page);
    border-radius: 5px;
    overflow: visible;
}

.progress-bar-enhanced .progress-fill-enhanced {
    height: 100%;
    border-radius: 5px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.5s ease;
    position: relative;
}

.progress-fill-enhanced.pf-low { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.progress-fill-enhanced.pf-mid { background: linear-gradient(90deg, #3b82f6, #22c55e); }
.progress-fill-enhanced.pf-high { background: linear-gradient(90deg, #22c55e, #f59e0b); }
.progress-fill-enhanced.pf-complete { background: linear-gradient(90deg, #f59e0b, #fbbf24); box-shadow: 0 0 10px rgba(251, 191, 36, 0.4); }

/* Milestone dots on the bar track */
.progress-milestone-dot {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: background 0.3s, box-shadow 0.3s;
}

.progress-milestone-dot.reached {
    background: #fbbf24;
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
}
```

#### HTML Changes (line ~7348-7355)

Replace the existing progress section in TRIAGE tab:

```html
<!-- BEFORE -->
<div class="triage-overall-progress">
    <span class="progress-label">Today's Progress</span>
    <div class="progress-bar-container">
        <div class="progress-bar-fill" id="overallProgressBar" style="width: 0%;"></div>
    </div>
    <span class="progress-text" id="overallProgressText">0/0 tasks / 0%</span>
</div>

<!-- AFTER -->
<div class="triage-overall-progress" style="gap: 16px;">
    <div class="progress-ring-container">
        <svg class="progress-ring-svg" viewBox="0 0 80 80">
            <circle class="progress-ring-bg" cx="40" cy="40" r="34"/>
            <circle class="progress-ring-fill progress-low" id="progressRingFill" cx="40" cy="40" r="34"
                stroke-dasharray="213.6" stroke-dashoffset="213.6"/>
        </svg>
        <span class="progress-ring-text" id="progressRingPercent">0%</span>
    </div>
    <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="progress-label">Today's Progress</span>
            <span class="progress-text" id="overallProgressText">0/0 tasks</span>
        </div>
        <div class="progress-bar-enhanced">
            <div class="progress-fill-enhanced pf-low" id="overallProgressBar" style="width: 0%;"></div>
            <div class="progress-milestone-dot" style="left: 25%;" id="milestone25"></div>
            <div class="progress-milestone-dot" style="left: 50%;" id="milestone50"></div>
            <div class="progress-milestone-dot" style="left: 75%;" id="milestone75"></div>
        </div>
    </div>
</div>
```

#### JS Additions

Enhance `updateOverallProgress()` at line ~16218:

```javascript
// After calculating percent, add:
const ringFill = document.getElementById('progressRingFill');
const ringPercent = document.getElementById('progressRingPercent');
const circumference = 213.6; // 2 * PI * 34

if (ringFill) {
    const offset = circumference - (percent / 100) * circumference;
    ringFill.style.strokeDashoffset = offset;
    ringFill.classList.remove('progress-low', 'progress-mid', 'progress-high', 'progress-complete');
    if (percent >= 100) ringFill.classList.add('progress-complete');
    else if (percent >= 75) ringFill.classList.add('progress-high');
    else if (percent >= 50) ringFill.classList.add('progress-mid');
    else ringFill.classList.add('progress-low');
}
if (ringPercent) ringPercent.textContent = `${percent}%`;

// Enhanced bar color
const bar = document.getElementById('overallProgressBar');
if (bar) {
    bar.classList.remove('pf-low', 'pf-mid', 'pf-high', 'pf-complete');
    if (percent >= 100) bar.classList.add('pf-complete');
    else if (percent >= 75) bar.classList.add('pf-high');
    else if (percent >= 50) bar.classList.add('pf-mid');
    else bar.classList.add('pf-low');
}

// Milestone dots
[25, 50, 75].forEach(m => {
    const dot = document.getElementById(`milestone${m}`);
    if (dot) {
        if (percent >= m) dot.classList.add('reached');
        else dot.classList.remove('reached');
    }
});

// Milestone celebration triggers
const prevPercent = parseInt(ringPercent?.dataset?.prev || '0');
if (ringPercent) ringPercent.dataset.prev = percent;

if (prevPercent < 25 && percent >= 25) { showCelebration('small'); showToast('25% done! Keep going!', '🎯'); }
if (prevPercent < 50 && percent >= 50) { showCelebration('medium'); showToast('HALFWAY THERE!', '🔥'); }
if (prevPercent < 75 && percent >= 75) { showCelebration('medium'); showToast('75%! Almost there!', '💪'); }
if (prevPercent < 100 && percent >= 100) { showCelebration('big'); showToast('ALL TASKS DONE!', '🏆'); }
```

---

### 3.4 Task Completion Rewards

#### Current (lines 16443-16489)
Awards XP via toast, shows confetti. No encouraging messages, no floating text.

#### Proposed Enhancement

**A. Encouraging message rotation** - Random motivational message on completion.

**B. Enhanced confetti** with more visual variety (shapes, better physics).

**C. Screen pulse** - Subtle green border flash on task complete.

**D. "What's next?" micro-nudge** after a short delay.

#### CSS Code

```css
/* === GAMIFICATION: TASK COMPLETION === */

/* Encouraging message popup */
.completion-message {
    position: fixed;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    z-index: 10000;
    pointer-events: none;
    font-size: 1.4em;
    font-weight: 800;
    color: white;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
    animation: completionMessagePop 1.8s ease-out forwards;
}

@keyframes completionMessagePop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    15% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
    25% { transform: translate(-50%, -50%) scale(1); }
    65% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) translateY(-30px) scale(0.8); opacity: 0; }
}

/* Screen pulse on completion */
.screen-pulse {
    animation: screenPulse 0.4s ease-out;
}

@keyframes screenPulse {
    0% { box-shadow: inset 0 0 0 0 rgba(34, 197, 94, 0); }
    50% { box-shadow: inset 0 0 60px 0 rgba(34, 197, 94, 0.08); }
    100% { box-shadow: inset 0 0 0 0 rgba(34, 197, 94, 0); }
}

/* Enhanced confetti pieces - multi-shape */
.confetti-enhanced {
    position: absolute;
    opacity: 0;
}

.confetti-enhanced.confetti-square {
    width: 10px;
    height: 10px;
    border-radius: 2px;
}

.confetti-enhanced.confetti-circle {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.confetti-enhanced.confetti-strip {
    width: 4px;
    height: 14px;
    border-radius: 2px;
}

@keyframes confettiFallEnhanced {
    0% {
        transform: translateY(-20px) rotate(0deg) scale(1);
        opacity: 1;
    }
    25% {
        transform: translateY(25vh) rotate(180deg) scale(1);
        opacity: 1;
    }
    100% {
        transform: translateY(100vh) rotate(720deg) scale(0.5);
        opacity: 0;
    }
}

/* Completion task card flash */
.task-card-completing {
    animation: taskCardFlash 0.5s ease-out;
}

@keyframes taskCardFlash {
    0% { background: inherit; }
    30% { background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.4); }
    100% { background: inherit; }
}
```

#### JS Additions

Add a new function for encouraging messages (place near `showCelebration` at ~line 18536):

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

Add call to `showCompletionMessage()` inside `toggleTaskComplete()` at line ~16471, after `showCelebration()`:

```javascript
showCompletionMessage();
```

Add screen pulse to the body in the same block:

```javascript
document.body.classList.add('screen-pulse');
setTimeout(() => document.body.classList.remove('screen-pulse'), 500);
```

---

### 3.5 Idle Nudges (Visual Enhancement)

#### Current (lines 17049-17087)
White background modal, basic layout, clashes with dark theme.

#### Proposed Enhancement

**A. Dark theme** matching the rest of the UI.

**B. Progress reminder** included in the nudge.

**C. Slide-in from bottom** instead of abrupt appear.

**D. Warmer, friendlier tone** with gradient accent.

#### CSS Code

```css
/* === GAMIFICATION: IDLE NUDGE REDESIGN === */

.time-prompt-modal-enhanced {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9998;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 0;
}

.time-prompt-content-enhanced {
    background: var(--bg-card, #1e293b);
    border: 1px solid var(--border, #334155);
    border-bottom: none;
    border-radius: 24px 24px 0 0;
    padding: 32px 24px 28px;
    text-align: center;
    max-width: 480px;
    width: 100%;
    animation: slideInBottom 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInBottom {
    0% { transform: translateY(100%); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

.time-prompt-content-enhanced .nudge-progress {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 20px;
    font-size: 0.85em;
    color: #60a5fa;
    margin-bottom: 16px;
}

.time-prompt-content-enhanced .nudge-task-name {
    font-size: 1.2em;
    font-weight: 700;
    color: var(--text-primary, #f1f5f9);
    margin: 12px 0;
}

.time-prompt-content-enhanced .nudge-time {
    color: var(--text-muted, #64748b);
    font-size: 0.9em;
    margin-bottom: 4px;
}

.time-prompt-content-enhanced .nudge-start-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    font-weight: 700;
    font-size: 1em;
    cursor: pointer;
    margin: 16px 0 12px;
    transition: transform 0.15s, box-shadow 0.15s;
}

.time-prompt-content-enhanced .nudge-start-btn:active {
    transform: scale(0.97);
}

.time-prompt-content-enhanced .nudge-push-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin: 12px 0;
}

.time-prompt-content-enhanced .nudge-push-btn {
    padding: 8px 14px;
    border: 1px solid var(--border, #334155);
    border-radius: 8px;
    background: var(--bg-page, #0f172a);
    color: var(--text-secondary, #94a3b8);
    font-weight: 600;
    font-size: 0.85em;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
}

.time-prompt-content-enhanced .nudge-push-btn:hover {
    border-color: var(--accent-blue, #3b82f6);
    color: var(--text-primary, #f1f5f9);
}

.time-prompt-content-enhanced .nudge-dismiss-row {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 12px;
}

.time-prompt-content-enhanced .nudge-dismiss-btn {
    padding: 8px 16px;
    border: 1px solid var(--border, #334155);
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #64748b);
    font-size: 0.85em;
    cursor: pointer;
    transition: color 0.2s;
}

.time-prompt-content-enhanced .nudge-dismiss-btn:hover {
    color: var(--text-secondary, #94a3b8);
}

.time-prompt-content-enhanced .nudge-remove-btn {
    padding: 8px 16px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    background: transparent;
    color: #ef4444;
    font-size: 0.85em;
    cursor: pointer;
}
```

#### JS Changes

In `showTimePrompt(task)` at line ~17049, the innerHTML should be updated to use the new classes. The HTML structure becomes:

```javascript
function showTimePrompt(task) {
    const existing = document.getElementById('timePromptModal');
    if (existing) existing.remove();

    const todayTasks = getTodayTriageTasks();
    const completed = todayTasks.filter(t => t.completed).length;
    const total = todayTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const modal = document.createElement('div');
    modal.className = 'time-prompt-modal-enhanced';
    modal.id = 'timePromptModal';
    modal.innerHTML = `
        <div class="time-prompt-content-enhanced">
            <div class="nudge-progress">${completed}/${total} done today &middot; ${pct}%</div>
            <div class="nudge-time">It's ${task.crashOutTime}</div>
            <div style="color: var(--text-secondary, #94a3b8); margin-bottom: 4px;">Time to start:</div>
            <div class="nudge-task-name">${task.triageTier === 'lockedIn' ? '&#x1F525;' : '&#x1F4CB;'} ${escapeHtml(task.text)}</div>
            <button class="nudge-start-btn" onclick="startTaskFromPrompt('${task.id}')">&#x25B6; START NOW</button>
            <div style="color: var(--text-muted, #64748b); font-size: 0.85em; margin-top: 8px;">Not ready? Push all tasks:</div>
            <div class="nudge-push-grid">
                <button class="nudge-push-btn" onclick="pushAllTasks(5)">+5m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(10)">+10m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(15)">+15m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(20)">+20m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(30)">+30m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(45)">+45m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(60)">+60m</button>
            </div>
            <div class="nudge-dismiss-row">
                <button class="nudge-dismiss-btn" onclick="skipTask('${task.id}')">Dismiss</button>
                <button class="nudge-remove-btn" onclick="removeTaskFromSchedule('${task.id}')">Remove</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
```

---

### 3.6 Toast Notification Upgrade

#### Current (lines 2431-2458)
White background, dark text. Clashes with dark theme.

#### Proposed Enhancement

Dark theme toast with icon glow and categorized colors.

#### CSS Code

```css
/* === GAMIFICATION: TOAST UPGRADE === */

.toast-notification {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: var(--bg-card, #1e293b);
    border: 1px solid var(--border, #334155);
    padding: 14px 22px;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10100;
    transform: translateX(400px);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    max-width: 340px;
}

.toast-notification.show {
    transform: translateX(0);
}

.toast-icon {
    font-size: 1.4em;
    flex-shrink: 0;
}

.toast-message {
    font-weight: 600;
    color: var(--text-primary, #f1f5f9);
    font-size: 0.9em;
    line-height: 1.3;
}

/* XP-specific toast glow */
.toast-notification.toast-xp {
    border-color: rgba(34, 197, 94, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 12px rgba(34, 197, 94, 0.15);
}

/* Warning toast */
.toast-notification.toast-warning {
    border-color: rgba(251, 191, 36, 0.3);
}

/* Error toast */
.toast-notification.toast-error {
    border-color: rgba(239, 68, 68, 0.3);
}
```

Note: The CSS above should **replace** the existing `.toast-notification` styles at lines 2431-2458. The `.toast-message` color changes from `#333` to `var(--text-primary)` and background from `white` to `var(--bg-card)`.

---

### 3.7 Perfect Day & Milestone Celebrations

#### Current (lines 7023-7044, 18594-18603)
Yellow gradient badge with trophy emoji, basic pop animation, disappears after 2.5s.

#### Proposed Enhancement

**A. Full-screen celebration** with gradient background flash.

**B. Animated trophy** with particle ring.

**C. Stats summary** in the badge (tasks done, XP earned).

#### CSS Code

```css
/* === GAMIFICATION: PERFECT DAY UPGRADE === */

.perfect-day-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(251, 191, 36, 0.15), transparent 70%);
    z-index: 9999;
    pointer-events: none;
    animation: perfectDayFlash 3s ease-out forwards;
}

@keyframes perfectDayFlash {
    0% { opacity: 0; }
    10% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
}

.perfect-day-badge {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.15));
    border: 2px solid rgba(251, 191, 36, 0.4);
    backdrop-filter: blur(20px);
    padding: 40px 60px;
    border-radius: 24px;
    text-align: center;
    z-index: 10000;
    animation: badgePopEnhanced 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 0 40px rgba(251, 191, 36, 0.2);
}

@keyframes badgePopEnhanced {
    0% { transform: translate(-50%, -50%) scale(0) rotate(-5deg); opacity: 0; }
    60% { transform: translate(-50%, -50%) scale(1.05) rotate(1deg); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
}

.perfect-day-badge .trophy {
    font-size: 64px;
    margin-bottom: 10px;
    animation: trophyBounce 0.8s ease-in-out;
    display: inline-block;
}

@keyframes trophyBounce {
    0% { transform: scale(0); }
    40% { transform: scale(1.3); }
    60% { transform: scale(0.9); }
    80% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.perfect-day-badge .text {
    font-size: 28px;
    font-weight: 900;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.perfect-day-badge .perfect-day-stats {
    margin-top: 12px;
    font-size: 0.85em;
    color: rgba(251, 191, 36, 0.8);
}

/* Glow ring around trophy */
.perfect-day-badge .trophy-glow {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(251, 191, 36, 0.2), transparent 70%);
    animation: glowPulse 1.5s ease-in-out infinite;
}

@keyframes glowPulse {
    0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.5; }
    50% { transform: translateX(-50%) scale(1.3); opacity: 1; }
}
```

#### JS Changes

Enhance `showPerfectDayBadge()` at line ~18594:

```javascript
function showPerfectDayBadge() {
    // Background flash
    const overlay = document.createElement('div');
    overlay.className = 'perfect-day-overlay';
    document.body.appendChild(overlay);

    const todayTasks = getTodayTriageTasks();
    const totalXP = commandCenterData?.focusStats?.totalXP || 0;

    const badge = document.createElement('div');
    badge.className = 'perfect-day-badge';
    badge.innerHTML = `
        <div class="trophy-glow"></div>
        <div class="trophy">&#x1F3C6;</div>
        <div class="text">PERFECT DAY!</div>
        <div class="perfect-day-stats">${todayTasks.length} tasks completed &middot; +200 XP</div>
    `;
    document.body.appendChild(badge);
    showCelebration('big');

    setTimeout(() => {
        badge.remove();
        overlay.remove();
    }, 3500);
}
```

---

## 4. Complete @keyframes Definitions

All animation keyframes referenced in this document, consolidated:

```css
/* ============================================================
   GAMIFICATION ANIMATIONS - All @keyframes
   ============================================================ */

/* XP float up and fade */
@keyframes xpFloat {
    0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    30% { transform: translateX(-50%) translateY(-15px) scale(1.2); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(0.8); }
}

/* XP counter pop on gain */
@keyframes xpCounterPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); color: #22c55e; }
    100% { transform: scale(1); }
}

/* Level badge subtle pulse */
@keyframes levelBadgePulse {
    0%, 100% { box-shadow: 0 0 12px rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.7); }
}

/* Level up full-screen pop */
@keyframes levelUpPop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    30% { transform: translate(-50%, -50%) scale(1); }
    70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
}

/* Fire flicker - subtle (1-3 day streak) */
@keyframes fireFlickerSubtle {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.05) rotate(-2deg); }
    75% { transform: scale(0.98) rotate(2deg); }
}

/* Fire flicker - medium (4-7 day streak) */
@keyframes fireFlickerMedium {
    0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
    25% { transform: scale(1.15) rotate(-4deg); opacity: 0.9; }
    50% { transform: scale(1.05) rotate(2deg); }
    75% { transform: scale(1.1) rotate(-2deg); opacity: 0.95; }
}

/* Fire flicker - intense (8+ day streak) */
@keyframes fireFlickerIntense {
    0%, 100% { transform: scale(1) rotate(0deg); filter: brightness(1); }
    15% { transform: scale(1.2) rotate(-5deg); filter: brightness(1.3); }
    30% { transform: scale(1.05) rotate(3deg); }
    45% { transform: scale(1.15) rotate(-3deg); filter: brightness(1.2); }
    60% { transform: scale(1.1) rotate(4deg); }
    80% { transform: scale(1.2) rotate(-2deg); filter: brightness(1.4); }
}

/* Streak at risk pulsing border */
@keyframes streakRiskPulse {
    0%, 100% { border-color: rgba(239, 68, 68, 0.3); }
    50% { border-color: rgba(239, 68, 68, 0.7); box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
}

/* Streak milestone flash */
@keyframes streakMilestone {
    0% { transform: scale(1); }
    30% { transform: scale(1.3); filter: brightness(1.5); }
    100% { transform: scale(1); filter: brightness(1); }
}

/* Milestone pulse on progress bar */
@keyframes milestonePulse {
    0% { filter: brightness(1); }
    30% { filter: brightness(1.6); }
    100% { filter: brightness(1); }
}

/* Completion message pop and fade */
@keyframes completionMessagePop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    15% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
    25% { transform: translate(-50%, -50%) scale(1); }
    65% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) translateY(-30px) scale(0.8); opacity: 0; }
}

/* Screen pulse on task complete */
@keyframes screenPulse {
    0% { box-shadow: inset 0 0 0 0 rgba(34, 197, 94, 0); }
    50% { box-shadow: inset 0 0 60px 0 rgba(34, 197, 94, 0.08); }
    100% { box-shadow: inset 0 0 0 0 rgba(34, 197, 94, 0); }
}

/* Enhanced confetti fall with sway */
@keyframes confettiFallEnhanced {
    0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
    25% { transform: translateY(25vh) rotate(180deg) scale(1); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg) scale(0.5); opacity: 0; }
}

/* Task card completion flash */
@keyframes taskCardFlash {
    0% { background: inherit; }
    30% { background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.4); }
    100% { background: inherit; }
}

/* Nudge slide in from bottom */
@keyframes slideInBottom {
    0% { transform: translateY(100%); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

/* Perfect day background flash */
@keyframes perfectDayFlash {
    0% { opacity: 0; }
    10% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
}

/* Enhanced badge pop */
@keyframes badgePopEnhanced {
    0% { transform: translate(-50%, -50%) scale(0) rotate(-5deg); opacity: 0; }
    60% { transform: translate(-50%, -50%) scale(1.05) rotate(1deg); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
}

/* Trophy bounce */
@keyframes trophyBounce {
    0% { transform: scale(0); }
    40% { transform: scale(1.3); }
    60% { transform: scale(0.9); }
    80% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

/* Trophy glow pulse */
@keyframes glowPulse {
    0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.5; }
    50% { transform: translateX(-50%) scale(1.3); opacity: 1; }
}
```

---

## 5. CSS Variables

New CSS custom properties to add to the `:root` block at line ~5451:

```css
:root {
    /* ...existing variables... */

    /* Gamification colors */
    --gam-xp-green: #22c55e;
    --gam-xp-glow: rgba(34, 197, 94, 0.4);
    --gam-level-blue: #3b82f6;
    --gam-level-purple: #8b5cf6;
    --gam-streak-warm: #fb923c;
    --gam-streak-hot: #f87171;
    --gam-streak-blazing: #fbbf24;
    --gam-gold: #fbbf24;
    --gam-celebration: #f59e0b;

    /* Animation durations */
    --gam-fast: 0.3s;
    --gam-normal: 0.6s;
    --gam-slow: 1.2s;
}
```

---

## Summary of Changes by Location

| Line Range | File Section | What Changes |
|------------|-------------|-------------|
| 5451-5466 | `:root` CSS variables | Add 9 gamification color variables + 3 animation duration variables |
| 2431-2458 | `.toast-notification` CSS | Replace with dark-themed toast styles |
| 932-952 | `.confetti-container` CSS | Remove (duplicate of lines 7000-7021) |
| 7000-7021 | `.confetti` CSS | Keep, add enhanced confetti shapes |
| 7023-7044 | `.perfect-day-badge` CSS | Replace with enhanced celebration styles |
| 7232-7240 | XP stat-card HTML | Replace with level badge + XP bar + enhanced display |
| ~7260 | After Completed stat-card | Add streak badge HTML |
| 7348-7355 | Overall progress HTML | Add SVG progress ring + milestone dots |
| 1500-1529 | `.time-prompt` CSS | Add new `.time-prompt-modal-enhanced` styles |
| 15515-15536 | `updateStats()` JS | Add level display update |
| 16443-16489 | `toggleTaskComplete()` JS | Add `showCompletionMessage()` + screen pulse calls |
| 16218-16229 | `updateOverallProgress()` JS | Add ring update + milestone celebrations |
| 17049-17087 | `showTimePrompt()` JS | Replace HTML with dark-themed nudge |
| 18505-18515 | `awardCommandCenterXP()` JS | Add float animation + level check + counter pop |
| 18517-18536 | `showCelebration()` JS | Add enhanced confetti shapes |
| 18577-18603 | `checkForPerfectDay()` + badge JS | Enhanced badge with overlay + stats |
| 18606-18644 | `updateStreaks()` JS | Add `updateStreakBadge()` call |
| ~18536 | After `showCelebration` | Add `COMPLETION_MESSAGES` array + `showCompletionMessage()` + `updateStreakBadge()` |

---

## Implementation Priority

1. **HIGH** - Toast dark theme (quick fix, fixes visual clash)
2. **HIGH** - XP floating text + counter pop (highest dopamine impact)
3. **HIGH** - Streak badge in stats bar (makes streaks visible)
4. **MEDIUM** - Progress ring + milestone celebrations
5. **MEDIUM** - Completion messages rotation
6. **MEDIUM** - Idle nudge dark theme redesign
7. **LOW** - Level system (500 XP per level)
8. **LOW** - Perfect day celebration upgrade
9. **LOW** - Remove duplicate confetti CSS (lines 932-952)

---

## Research Sources

- [Gamification in Product Design 2025 (Arounda)](https://arounda.agency/blog/gamification-in-product-design-in-2024-ui-ux)
- [20 Productivity App Gamification Examples (Trophy)](https://trophy.so/blog/productivity-gamification-examples)
- [CSS Fire Animation Effects (DevSnap)](https://devsnap.me/css-fire-animation)
- [Confetti CSS Only (CodePen)](https://codepen.io/fionnachan/pen/EvaqOB)
- [Pure CSS/SVG Donut Chart (CodePen)](https://codepen.io/janverstr/pen/PvPoaV)
- [Micro-Interaction Design Rules 2026 (DEV)](https://dev.to/devin-rosario/5-micro-interaction-design-rules-for-apps-in-2026-48nb)
- [14 Micro-interaction Examples (UserPilot)](https://userpilot.com/blog/micro-interaction-examples/)
- [CSS Floating Animation (GeeksforGeeks)](https://www.geeksforgeeks.org/css/css-floating-animation/)
