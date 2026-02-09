# FOCUS TAB (Pomodoro) UI/UX Redesign

## 1. Current State Analysis

### 1.1 HTML Structure (lines 7589-7688)

The Focus/Pomodoro tab (`#focusPomodoroContent`) contains:

- **No Task State** (`#focusNoTask`, line 7593): A centered card with emoji, title, description, and a "Go to Triage" button. Uses inline styles with `#1e293b` background, `#334155` border, `border-radius: 20px`.

- **Active Session Container** (`#focusActiveSession`, line 7601): max-width 550px, margin auto. Contains:

  1. **Timer Card** (line 7603): Background `#1e293b`, border-radius 20px, 40px padding.
     - Title: "FOCUS MODE" with emoji, 1.2em font
     - **Timer Circle** (line 7607): 200x200px SVG with two circles (r=90, stroke-width 12). Background circle `rgba(255,255,255,0.1)`, active circle `#3b82f6`. Uses `stroke-dasharray: 565.48` and `stroke-dashoffset` for progress animation.
     - **Timer Display** (`#focusTimerDisplay`, line 7612): Absolutely positioned center of SVG. 3em font, 700 weight, SF Mono monospace. Shows "25:00".
     - **Timer Controls** (line 7616): Flex row with Start (green `#22c55e`), Pause (amber `#f59e0b`), Resume (green) buttons. 14px 32px padding, border-radius 12px.
     - **Duration Toggles** (line 7623): 25min and 50min pill buttons with `focus-duration-btn` class.

  2. **Current Task Card** (line 7630): Shows "Currently working on:" label, task name (1.2em bold), and tier badge ("from: LOCKED IN" in blue).

  3. **Session Checklist** (line 7637): Card with checklist items, add input, progress bar (gradient blue-purple), count/percent display.

  4. **Complete Task Button** (line 7660): Full-width gradient button (blue to purple), "COMPLETE TASK" text.

  5. **Exit Button** (line 7665): Ghost style, "Exit Focus" text.

- **Timer Complete Modal** (`#focusTimerCompleteModal`, line 7671): Full-screen overlay with completion card showing XP earned, streak, progress, and action buttons (Task Done, Next Task, Take Break, Back to Triage).

### 1.2 CSS Styles

- **Focus Pulse animation** (line 879): `@keyframes focusPulse` - box-shadow pulse on `.focus-timer-active`
- **Checklist items** (lines 888-921): `.focus-checklist-item` - flex layout, light background `#f8fafc` (wrong for dark theme), checkbox 18x18
- **Dark theme overrides** (lines 6807-6870): Duration buttons, checklist items get `!important` dark overrides
- **Timer display override** (lines 6768-6775): 42px font-size, SF Mono
- **Timer buttons** (lines 6784-6805): Green start/resume, amber pause, 14px 36px padding
- **Confetti** (lines 7000-7021): CSS confetti fall animation
- **Mobile** (line 6940-6942): Timer display shrinks to 36px on mobile

### 1.3 JavaScript Functions (lines 18140-18501)

- `renderFocusPomodoroMode()` (18145): Toggles no-task vs active session
- `startTaskInFocus()` (18163): Sets up session, resets timer, switches to focus mode
- `renderActiveSession()` (18199): Updates task text, tier label, timer, checklist
- `updateFocusTimerDisplay()` (18222): Updates digits, SVG circle offset, button visibility
- `startFocusTimer()` (18259): Starts 1s interval, decrements, calls `onFocusTimerComplete()` at 0
- `pauseFocusTimer()` (18278): Clears interval
- `setFocusDuration()` (18293): Sets 25 or 50 minutes
- `onFocusTimerComplete()` (18316): Awards XP, increments streak, shows modal, vibrates
- `showFocusCompleteModal()` (18334): Populates and shows the completion overlay
- `renderFocusChecklist()` (18431): Renders checklist items with progress bar
- `showCelebration()` (18517): JS-created confetti with CSS animation

---

## 2. Problems Identified

### 2.1 Timer Circle
- **Too small**: 200x200px feels cramped on modern screens; the timer is the primary focus element and should dominate
- **Flat single-color stroke**: Solid `#3b82f6` ring with no gradient or glow; looks like a basic SVG demo
- **No color transition**: Stroke stays blue regardless of time remaining; no urgency cues
- **No outer glow**: No ambient lighting effect; timer doesn't "breathe" visually
- **Background circle too subtle**: `rgba(255,255,255,0.1)` is barely visible

### 2.2 Timer Display
- **Good font choice** but could be larger for the larger circle
- **No state indicator**: When paused, the digits just freeze with no visual "PAUSED" label
- **No breathing animation**: Static digits while running; no subtle life to the display

### 2.3 Timer Controls
- **Generic rectangular buttons**: Start/Pause/Resume are just colored rectangles
- **No visual hierarchy**: All three buttons same size/prominence
- **No +5/-5 minute quick-adjust** buttons in the pomodoro view
- **No press feedback**: No scale-down or haptic visual on click
- **No hover effects**: Buttons don't respond to hover (no scale, shadow, or glow)

### 2.4 Task Info
- **Below the timer**: Task name should be above the timer (the "why" before the "how long")
- **Small tier badge**: "from: LOCKED IN" is small plain text, not a visual badge
- **No progress context**: No "Task 3 of 12" indicator
- **Separate card**: Task info is in its own card below timer, creating visual separation from the timer

### 2.5 Checklist
- **Browser default checkboxes**: `input[type="checkbox"]` with no custom styling
- **Light theme background leak**: Base CSS has `background: #f8fafc` (white!) on checklist items
- **No check animation**: Checking is instant with no satisfying transition
- **No strike-through animation**: Text immediately strikes through, no fade
- **No connecting line**: Items float independently with no visual grouping
- **Delete button visible always**: The delete X is always shown, cluttering the UI

### 2.6 Action Buttons
- **Complete button is decent** (gradient) but has no hover glow or press animation
- **Exit button too similar in weight**: Both are full-width, creating equal visual priority
- **No "Skip Task" option**: Only "Complete" and "Exit" -- no middle ground

### 2.7 Completion Celebration
- **Modal-only**: Just shows a modal with static text and emoji
- **No confetti on timer complete**: `showCelebration()` exists but isn't called from `onFocusTimerComplete()`
- **No XP floating animation**: XP text is static in the modal
- **No screen flash**: No background pulse on completion
- **Modal appears instantly**: No entrance animation

### 2.8 Overall
- **All inline styles**: Nearly every element uses inline `style=""` making it hard to maintain and override
- **No visual rhythm**: Cards are evenly spaced with no hierarchy
- **No ambient atmosphere**: The background is flat `#0f172a` with no texture or gradient
- **No session progress indicator**: No visual showing how deep you are into the focus session

---

## 3. Proposed Changes

### 3.1 Timer Circle (line 7607)

**Current HTML:**
```html
<div style="position: relative; width: 200px; height: 200px; margin: 0 auto 25px;">
    <svg width="200" height="200" style="transform: rotate(-90deg);">
        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="12"/>
        <circle id="focusTimerCircle" cx="100" cy="100" r="90" fill="none" stroke="#3b82f6" stroke-width="12" stroke-linecap="round" stroke-dasharray="565.48" stroke-dashoffset="0" style="transition: stroke-dashoffset 1s linear;"/>
    </svg>
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f1f5f9; font-size: 3em; font-weight: 700; font-family: 'SF Mono', Monaco, monospace;" id="focusTimerDisplay">25:00</div>
</div>
```

**New HTML:**
```html
<div class="focus-timer-container" id="focusTimerContainer">
    <!-- Outer glow ring -->
    <div class="focus-timer-glow"></div>
    <svg class="focus-timer-svg" viewBox="0 0 320 320">
        <defs>
            <linearGradient id="timerGradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#22c55e"/>
                <stop offset="100%" stop-color="#3b82f6"/>
            </linearGradient>
            <linearGradient id="timerGradientYellow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#ef4444"/>
            </linearGradient>
            <linearGradient id="timerGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ef4444"/>
                <stop offset="100%" stop-color="#dc2626"/>
            </linearGradient>
            <filter id="timerGlow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <!-- Track circle -->
        <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
        <!-- Tick marks (every 5 minutes for 25-min timer = 5 ticks) -->
        <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="10" stroke-dasharray="4 173.8"/>
        <!-- Progress circle -->
        <circle id="focusTimerCircle" cx="160" cy="160" r="140" fill="none" stroke="url(#timerGradientGreen)" stroke-width="10" stroke-linecap="round" stroke-dasharray="879.6" stroke-dashoffset="0" filter="url(#timerGlow)" class="focus-progress-ring"/>
    </svg>
    <!-- Timer digits -->
    <div class="focus-timer-digits" id="focusTimerDisplay">25:00</div>
    <!-- Paused indicator -->
    <div class="focus-timer-paused" id="focusPausedLabel" style="display: none;">PAUSED</div>
</div>
```

**Line to edit:** 7607-7613

### 3.2 Timer Card Restructure (lines 7603-7627)

**Current:** Title "FOCUS MODE" above timer, controls below, duration toggles at bottom of timer card.

**New structure:** Move task name ABOVE the timer, embed controls and duration inside the timer card with better layout.

**New HTML for entire timer card:**
```html
<div class="focus-session-card">
    <!-- Task name prominent at top -->
    <div class="focus-task-header">
        <div class="focus-task-name" id="focusCurrentTaskText">Study Peds Chapter 12</div>
        <div class="focus-task-meta">
            <span class="focus-tier-badge" id="focusCurrentTaskTier">LOCKED IN</span>
            <span class="focus-progress-badge" id="focusTaskProgress">Task 3 of 12</span>
        </div>
    </div>

    <!-- Timer Circle (from 3.1 above) -->
    [Timer circle HTML from 3.1]

    <!-- Timer Controls -->
    <div class="focus-controls">
        <button class="focus-btn-adjust" onclick="adjustFocusTimer(-300)" title="-5 min">-5</button>
        <button class="focus-btn-main focus-btn-start" id="focusStartBtn" onclick="startFocusTimer()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <button class="focus-btn-main focus-btn-pause" id="focusPauseBtn" onclick="pauseFocusTimer()" style="display: none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
        <button class="focus-btn-main focus-btn-start" id="focusResumeBtn" onclick="resumeFocusTimer()" style="display: none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <button class="focus-btn-adjust" onclick="adjustFocusTimer(300)" title="+5 min">+5</button>
    </div>

    <!-- Duration Toggle -->
    <div class="focus-duration-toggle">
        <button onclick="setFocusDuration(15)" class="focus-dur-btn" id="focus15Btn">15m</button>
        <button onclick="setFocusDuration(25)" class="focus-dur-btn active" id="focus25Btn">25m</button>
        <button onclick="setFocusDuration(50)" class="focus-dur-btn" id="focus50Btn">50m</button>
    </div>
</div>
```

**Lines to edit:** 7600-7627 (active session start through duration toggles)
Also remove separate Current Task Card at lines 7630-7634 (now integrated above timer).

### 3.3 Checklist Card (lines 7637-7657)

**Current HTML (rendered in JS, line 18445):**
```html
<div class="focus-checklist-item">
    <input type="checkbox" ...>
    <span class="item-text">Item text</span>
    <button class="delete-item">x</button>
</div>
```

**New HTML (update renderFocusChecklist at line 18445):**
```html
<div class="focus-checklist-item ${item.completed ? 'checked' : ''}">
    <div class="focus-checkbox ${item.completed ? 'checked' : ''}" onclick="toggleFocusChecklistItem('${item.id}')">
        <svg class="focus-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="4,12 10,18 20,6"/>
        </svg>
    </div>
    <span class="item-text ${item.completed ? 'completed' : ''}">${escapeHtml(item.text)}</span>
    <button class="delete-item" onclick="deleteFocusChecklistItem('${item.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
</div>
```

**Note:** This is a JS rendering change (line 18445-18451). The HTML template in `renderFocusChecklist()` should be updated.

### 3.4 Action Buttons (lines 7660-7667)

**Current:**
```html
<div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 16px; cursor: pointer;" onclick="completeFocusTask()">
    <div style="color: white; font-weight: 700; font-size: 1.1em;">COMPLETE TASK</div>
</div>
<div style="text-align: center;">
    <button onclick="exitFocusMode()" style="...">Exit Focus</button>
</div>
```

**New:**
```html
<div class="focus-actions">
    <button class="focus-btn-complete" onclick="completeFocusTask()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="4,12 10,18 20,6"/></svg>
        COMPLETE TASK
    </button>
    <button class="focus-btn-skip" onclick="skipFocusTask()">
        Skip
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
    </button>
    <button class="focus-btn-exit" onclick="exitFocusMode()">Exit Focus</button>
</div>
```

**Lines to edit:** 7660-7667

### 3.5 Completion Modal (lines 7671-7688)

**Current:** Static modal with flat cards.

**New:** Add entrance animation, confetti trigger, floating XP animation.

```html
<div id="focusTimerCompleteModal" class="focus-complete-overlay" style="display: none;">
    <div class="focus-complete-card">
        <div class="focus-complete-confetti" id="focusConfettiContainer"></div>
        <div class="focus-complete-flash"></div>
        <div class="focus-complete-emoji">
            <span class="focus-complete-bounce">&#127881;</span>
        </div>
        <div class="focus-complete-title">CRUSHED IT!</div>
        <div class="focus-xp-float" id="focusXpFloat">+20 XP</div>
        <div class="focus-complete-stats">
            <div class="focus-stat-row" id="focusXpEarned">
                <span class="focus-stat-icon">&#11088;</span> +20 XP earned
            </div>
            <div class="focus-stat-row" id="focusStreakDisplay">
                <span class="focus-stat-icon">&#128293;</span> Focus streak: 4 sessions
            </div>
            <div class="focus-stat-row" id="focusTodayProgress">
                <span class="focus-stat-icon">&#128202;</span> Today: 3/12 tasks done
            </div>
        </div>
        <div class="focus-complete-checklist" id="focusChecklistSummary">Session checklist: 3/4 completed</div>
        <div class="focus-complete-actions">
            <button class="focus-modal-btn primary" onclick="completeFocusTaskFromModal()">TASK DONE</button>
            <button class="focus-modal-btn secondary" onclick="startNextFocusTask()">NEXT TASK</button>
            <div class="focus-modal-row">
                <button class="focus-modal-btn ghost" onclick="takeBreak()">Take a break</button>
                <button class="focus-modal-btn ghost" onclick="backToTriageFromModal()">Back to Triage</button>
            </div>
        </div>
    </div>
</div>
```

**Lines to edit:** 7671-7688

### 3.6 No Task State (lines 7593-7598)

**Current:** Basic card with emoji, text, button.

**New:** More atmospheric empty state with animated icon and better copy.

```html
<div id="focusNoTask" class="focus-empty-state">
    <div class="focus-empty-icon">
        <div class="focus-empty-ring"></div>
        <span>&#127919;</span>
    </div>
    <div class="focus-empty-title">Ready to focus?</div>
    <div class="focus-empty-desc">Pick a task from Triage or Crash Out to start a deep work session.</div>
    <button class="focus-empty-btn" onclick="switchCommandCenterMode('triage')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
        Go to Triage
    </button>
</div>
```

**Lines to edit:** 7593-7598

---

## 4. New CSS Classes

All new CSS should be added inside the existing Focus View design system block (after line 5466, before the layout rules at line 5468). Alternatively, add a new clearly marked section after the existing focus styles.

### Recommended insertion point: After line 7021 (after existing `.confetti` block ends)

```css
/* ================================================================
   FOCUS TAB REDESIGN — PREMIUM POMODORO UI
   ================================================================ */

/* --- TIMER CONTAINER --- */
.focus-timer-container {
    position: relative;
    width: 300px;
    height: 300px;
    margin: 0 auto 30px;
}

@media (min-width: 600px) {
    .focus-timer-container {
        width: 340px;
        height: 340px;
    }
}

.focus-timer-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.focus-progress-ring {
    transition: stroke-dashoffset 1s linear, stroke 0.5s ease;
}

/* Outer glow ring - ambient light behind the timer */
.focus-timer-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 280px;
    height: 280px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
    pointer-events: none;
    transition: background 0.5s ease;
}

.focus-timer-container.running .focus-timer-glow {
    animation: focusGlowPulse 3s ease-in-out infinite;
}

.focus-timer-container.warning .focus-timer-glow {
    background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
}

.focus-timer-container.critical .focus-timer-glow {
    background: radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, transparent 70%);
    animation: focusGlowPulse 1.5s ease-in-out infinite;
}

/* --- TIMER DIGITS --- */
.focus-timer-digits {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -55%);
    color: #f1f5f9;
    font-size: 3.5em;
    font-weight: 700;
    font-family: 'SF Mono', 'Fira Code', Monaco, 'Courier New', monospace;
    letter-spacing: 2px;
    text-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
    font-variant-numeric: tabular-nums;
    transition: text-shadow 0.5s ease;
}

@media (min-width: 600px) {
    .focus-timer-digits {
        font-size: 4em;
    }
}

.focus-timer-container.running .focus-timer-digits {
    animation: focusDigitBreathe 4s ease-in-out infinite;
}

.focus-timer-container.warning .focus-timer-digits {
    text-shadow: 0 0 30px rgba(245, 158, 11, 0.3);
}

.focus-timer-container.critical .focus-timer-digits {
    text-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
    animation: focusDigitBreathe 2s ease-in-out infinite;
}

/* Paused label under the digits */
.focus-timer-paused {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, 20px);
    color: #f59e0b;
    font-size: 0.85em;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    animation: focusPausedBlink 2s ease-in-out infinite;
}

/* --- SESSION CARD --- */
.focus-session-card {
    background: linear-gradient(145deg, #1e293b 0%, #172033 100%);
    border: 1px solid #334155;
    border-radius: 24px;
    padding: 32px 28px 28px;
    text-align: center;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
}

/* Subtle grain texture overlay */
.focus-session-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    opacity: 0.5;
}

/* --- TASK HEADER (above timer) --- */
.focus-task-header {
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
}

.focus-task-name {
    font-size: 1.35em;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 10px;
    line-height: 1.3;
}

.focus-task-meta {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}

.focus-tier-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 0.78em;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.25);
}

.focus-progress-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 0.78em;
    font-weight: 600;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

/* --- TIMER CONTROLS --- */
.focus-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
}

.focus-btn-main {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.2s ease;
    color: white;
    font-size: 1.2em;
}

.focus-btn-main:hover {
    transform: scale(1.08);
}

.focus-btn-main:active {
    transform: scale(0.95);
}

.focus-btn-start {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
}

.focus-btn-start:hover {
    box-shadow: 0 6px 25px rgba(34, 197, 94, 0.45);
}

.focus-btn-pause {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
}

.focus-btn-pause:hover {
    box-shadow: 0 6px 25px rgba(245, 158, 11, 0.45);
}

.focus-btn-adjust {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid #475569;
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    font-size: 0.85em;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}

.focus-btn-adjust:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    border-color: #64748b;
    transform: scale(1.05);
}

.focus-btn-adjust:active {
    transform: scale(0.93);
}

/* --- DURATION TOGGLE --- */
.focus-duration-toggle {
    display: flex;
    justify-content: center;
    gap: 8px;
    position: relative;
    z-index: 1;
}

.focus-dur-btn {
    padding: 6px 18px;
    border: 1px solid #334155;
    border-radius: 20px;
    background: transparent;
    color: #64748b;
    font-size: 0.85em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.focus-dur-btn:hover {
    color: #94a3b8;
    border-color: #475569;
}

.focus-dur-btn.active {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
    color: #60a5fa;
}

/* --- CHECKLIST --- */
.focus-checklist-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 16px;
}

.focus-checklist-title {
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 16px;
    font-size: 0.95em;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* Custom checkbox */
.focus-checkbox {
    width: 22px;
    height: 22px;
    min-width: 22px;
    border: 2px solid #475569;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    color: transparent;
}

.focus-checkbox:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
}

.focus-checkbox.checked {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
    animation: focusCheckPop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.focus-check-icon {
    width: 14px;
    height: 14px;
    stroke-dasharray: 30;
    stroke-dashoffset: 30;
    transition: stroke-dashoffset 0.3s ease 0.1s;
}

.focus-checkbox.checked .focus-check-icon {
    stroke-dashoffset: 0;
}

/* Checklist item */
.focus-checklist-item {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    padding: 10px 12px !important;
    border-radius: 10px !important;
    margin-bottom: 6px !important;
    background: rgba(255, 255, 255, 0.02) !important;
    transition: all 0.25s ease !important;
    border-left: 3px solid transparent !important;
}

.focus-checklist-item:hover {
    background: rgba(255, 255, 255, 0.04) !important;
}

.focus-checklist-item.checked {
    opacity: 0.55;
    border-left-color: #22c55e !important;
}

.focus-checklist-item .item-text {
    flex: 1 !important;
    color: #e2e8f0 !important;
    font-size: 0.92em !important;
    transition: all 0.3s ease !important;
}

.focus-checklist-item .item-text.completed {
    text-decoration: line-through !important;
    color: #64748b !important;
}

.focus-checklist-item .delete-item {
    opacity: 0;
    background: transparent !important;
    border: none !important;
    color: #64748b !important;
    cursor: pointer !important;
    padding: 4px !important;
    border-radius: 4px !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

.focus-checklist-item:hover .delete-item {
    opacity: 1;
}

.focus-checklist-item .delete-item:hover {
    color: #ef4444 !important;
    background: rgba(239, 68, 68, 0.1) !important;
}

/* Checklist progress bar */
.focus-checklist-progress-wrap {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.focus-checklist-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
}

.focus-checklist-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #22c55e);
    background-size: 200% 100%;
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Add item input */
.focus-add-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 12px;
}

.focus-add-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #334155;
    border-radius: 10px;
    font-size: 0.9em;
    background: #0f172a;
    color: #f1f5f9;
    transition: border-color 0.2s ease;
}

.focus-add-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.focus-add-btn {
    padding: 10px 18px;
    border: none;
    border-radius: 10px;
    background: #3b82f6;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.9em;
}

.focus-add-btn:hover {
    background: #2563eb;
    transform: scale(1.02);
}

.focus-add-btn:active {
    transform: scale(0.97);
}

/* --- ACTION BUTTONS --- */
.focus-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    margin-bottom: 16px;
}

.focus-btn-complete {
    width: 100%;
    max-width: 550px;
    padding: 18px 24px;
    border: none;
    border-radius: 16px;
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    font-weight: 700;
    font-size: 1.05em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.25);
    letter-spacing: 0.5px;
}

.focus-btn-complete:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 30px rgba(34, 197, 94, 0.35);
}

.focus-btn-complete:active {
    transform: translateY(0) scale(0.98);
}

.focus-btn-skip {
    padding: 10px 24px;
    border: 1px solid #475569;
    border-radius: 10px;
    background: transparent;
    color: #94a3b8;
    font-weight: 600;
    font-size: 0.9em;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
}

.focus-btn-skip:hover {
    border-color: #64748b;
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.03);
}

.focus-btn-exit {
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    font-weight: 500;
    font-size: 0.85em;
    cursor: pointer;
    transition: color 0.2s ease;
}

.focus-btn-exit:hover {
    color: #94a3b8;
}

/* --- EMPTY STATE --- */
.focus-empty-state {
    background: linear-gradient(145deg, #1e293b 0%, #172033 100%);
    border: 1px solid #334155;
    border-radius: 24px;
    padding: 60px 40px;
    text-align: center;
    max-width: 500px;
    margin: 0 auto;
}

.focus-empty-icon {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5em;
}

.focus-empty-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 2px solid rgba(59, 130, 246, 0.2);
    border-radius: 50%;
    animation: focusEmptyPulse 3s ease-in-out infinite;
}

.focus-empty-title {
    font-size: 1.6em;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 12px;
}

.focus-empty-desc {
    color: #94a3b8;
    font-size: 1em;
    line-height: 1.5;
    margin-bottom: 30px;
    max-width: 360px;
    margin-left: auto;
    margin-right: auto;
}

.focus-empty-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 32px;
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-weight: 700;
    font-size: 1em;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.focus-empty-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
}

.focus-empty-btn:active {
    transform: translateY(0);
}

/* --- COMPLETION OVERLAY --- */
.focus-complete-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: focusOverlayIn 0.3s ease;
}

.focus-complete-card {
    background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid #334155;
    border-radius: 28px;
    padding: 44px 36px 36px;
    text-align: center;
    max-width: 420px;
    width: calc(100% - 40px);
    position: relative;
    overflow: hidden;
    animation: focusCardSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.focus-complete-flash {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, transparent 70%);
    animation: focusFlashPulse 0.6s ease-out;
    pointer-events: none;
}

.focus-complete-emoji {
    font-size: 4em;
    margin-bottom: 12px;
    position: relative;
    z-index: 1;
}

.focus-complete-bounce {
    display: inline-block;
    animation: focusCelebBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.focus-complete-title {
    font-size: 1.6em;
    font-weight: 800;
    color: #f1f5f9;
    margin-bottom: 8px;
    letter-spacing: 1px;
    position: relative;
    z-index: 1;
}

.focus-xp-float {
    font-size: 1.3em;
    font-weight: 800;
    color: #22c55e;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
    animation: focusXpFloat 1.5s ease-out;
}

.focus-complete-stats {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 16px 20px;
    margin-bottom: 16px;
    position: relative;
    z-index: 1;
}

.focus-stat-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    color: #94a3b8;
    font-size: 0.92em;
}

.focus-stat-icon {
    font-size: 1.1em;
}

.focus-complete-checklist {
    color: #64748b;
    font-size: 0.85em;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
}

.focus-complete-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    z-index: 1;
}

.focus-modal-btn {
    width: 100%;
    padding: 14px 20px;
    border: none;
    border-radius: 14px;
    font-weight: 700;
    font-size: 0.95em;
    cursor: pointer;
    transition: all 0.2s ease;
}

.focus-modal-btn.primary {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
}

.focus-modal-btn.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
}

.focus-modal-btn.secondary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
}

.focus-modal-btn.secondary:hover {
    transform: translateY(-1px);
}

.focus-modal-row {
    display: flex;
    gap: 10px;
    margin-top: 4px;
}

.focus-modal-btn.ghost {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    border: 1px solid #334155;
    padding: 10px 16px;
    font-size: 0.88em;
}

.focus-modal-btn.ghost:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #f1f5f9;
}

/* --- MOBILE RESPONSIVE --- */
@media (max-width: 480px) {
    .focus-timer-container {
        width: 260px;
        height: 260px;
    }

    .focus-timer-digits {
        font-size: 2.8em;
    }

    .focus-session-card {
        padding: 24px 16px 20px;
        border-radius: 20px;
    }

    .focus-task-name {
        font-size: 1.15em;
    }

    .focus-btn-main {
        width: 48px;
        height: 48px;
    }

    .focus-btn-adjust {
        width: 36px;
        height: 36px;
        font-size: 0.8em;
    }

    .focus-complete-card {
        padding: 32px 24px 28px;
    }

    .focus-modal-row {
        flex-direction: column;
    }
}
```

---

## 5. Animation Keyframes

```css
/* ================================================================
   FOCUS TAB ANIMATIONS
   ================================================================ */

/* --- Timer glow pulse (while running) --- */
@keyframes focusGlowPulse {
    0%, 100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
    50% {
        opacity: 0.6;
        transform: translate(-50%, -50%) scale(1.05);
    }
}

/* --- Timer digit breathing (while running) --- */
@keyframes focusDigitBreathe {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.85;
    }
}

/* --- Paused blink --- */
@keyframes focusPausedBlink {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.3;
    }
}

/* --- Custom checkbox pop --- */
@keyframes focusCheckPop {
    0% {
        transform: scale(1);
    }
    40% {
        transform: scale(1.25);
    }
    100% {
        transform: scale(1);
    }
}

/* --- Empty state ring pulse --- */
@keyframes focusEmptyPulse {
    0%, 100% {
        transform: scale(1);
        opacity: 0.3;
    }
    50% {
        transform: scale(1.15);
        opacity: 0.1;
    }
}

/* --- Completion overlay fade-in --- */
@keyframes focusOverlayIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

/* --- Completion card slide up --- */
@keyframes focusCardSlideUp {
    from {
        opacity: 0;
        transform: translateY(40px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* --- Flash pulse on completion --- */
@keyframes focusFlashPulse {
    0% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

/* --- Celebration bounce --- */
@keyframes focusCelebBounce {
    0% {
        transform: scale(0) rotate(-10deg);
    }
    60% {
        transform: scale(1.3) rotate(5deg);
    }
    100% {
        transform: scale(1) rotate(0deg);
    }
}

/* --- XP float-up animation --- */
@keyframes focusXpFloat {
    0% {
        opacity: 0;
        transform: translateY(20px) scale(0.8);
    }
    30% {
        opacity: 1;
        transform: translateY(-5px) scale(1.1);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* --- Confetti (CSS-only) --- */
@keyframes focusConfettiFall {
    0% {
        transform: translateY(-20px) rotate(0deg) scale(0);
        opacity: 0;
    }
    10% {
        opacity: 1;
        transform: translateY(-10px) rotate(30deg) scale(1);
    }
    100% {
        transform: translateY(calc(100vh + 20px)) rotate(720deg) scale(0.5);
        opacity: 0;
    }
}

@keyframes focusConfettiSway {
    0%, 100% {
        transform: translateX(0);
    }
    25% {
        transform: translateX(15px);
    }
    75% {
        transform: translateX(-15px);
    }
}

/* --- Button press feedback --- */
@keyframes focusBtnPress {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(0.95);
    }
    100% {
        transform: scale(1);
    }
}

/* --- Encouraging messages fade --- */
@keyframes focusMessageFade {
    0% {
        opacity: 0;
        transform: translateY(10px);
    }
    15% {
        opacity: 1;
        transform: translateY(0);
    }
    85% {
        opacity: 1;
        transform: translateY(0);
    }
    100% {
        opacity: 0;
        transform: translateY(-10px);
    }
}
```

---

## 6. CSS-only Confetti Implementation

This creates purely CSS-driven confetti particles. The JS only needs to add elements with the `.focus-confetti-particle` class to the container; the animation is 100% CSS.

```css
/* --- CSS Confetti System --- */
.focus-confetti-wrap {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
}

.focus-confetti-particle {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    animation: focusConfettiFall var(--fall-duration, 2s) ease-out var(--fall-delay, 0s) forwards;
}

/* Variant shapes */
.focus-confetti-particle.circle {
    border-radius: 50%;
}

.focus-confetti-particle.rect {
    width: 6px;
    height: 12px;
    border-radius: 1px;
}

.focus-confetti-particle.diamond {
    transform: rotate(45deg);
}
```

### Minimal JS to trigger confetti (class toggle only, no logic changes):

Add to `showFocusCompleteModal()` (line 18334):

```javascript
// After modal.style.display = 'flex';
// Trigger CSS confetti
const confettiWrap = document.getElementById('focusConfettiContainer');
if (confettiWrap) {
    confettiWrap.innerHTML = '';
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
    const shapes = ['', 'circle', 'rect', 'diamond'];
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = `focus-confetti-particle ${shapes[Math.floor(Math.random() * shapes.length)]}`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.setProperty('--fall-duration', `${1.5 + Math.random() * 2}s`);
        p.style.setProperty('--fall-delay', `${Math.random() * 0.4}s`);
        confettiWrap.appendChild(p);
    }
}
```

### Minimal JS to update timer color (class toggle only):

Add to `updateFocusTimerDisplay()` (line 18222), after the circle progress update:

```javascript
// Update timer container state classes for CSS color transitions
const timerContainer = document.getElementById('focusTimerContainer');
if (timerContainer) {
    const pctRemaining = focusTimerSecondsRemaining / (focusTimerDuration * 60);
    timerContainer.classList.toggle('running', focusTimerRunning);
    timerContainer.classList.toggle('warning', pctRemaining <= 0.33 && pctRemaining > 0.1);
    timerContainer.classList.toggle('critical', pctRemaining <= 0.1);

    // Switch SVG gradient
    const circle = document.getElementById('focusTimerCircle');
    if (circle) {
        if (pctRemaining <= 0.1) {
            circle.setAttribute('stroke', 'url(#timerGradientRed)');
        } else if (pctRemaining <= 0.33) {
            circle.setAttribute('stroke', 'url(#timerGradientYellow)');
        } else {
            circle.setAttribute('stroke', 'url(#timerGradientGreen)');
        }
    }
}

// Show/hide paused label
const pausedLabel = document.getElementById('focusPausedLabel');
if (pausedLabel) {
    pausedLabel.style.display = (!focusTimerRunning && focusTimerSecondsRemaining < focusTimerDuration * 60) ? 'block' : 'none';
}
```

---

## 7. Summary of Lines to Edit

| Section | Lines | Change |
|---------|-------|--------|
| Focus Pulse CSS | 879-885 | Keep existing, add new keyframes nearby |
| Checklist CSS | 888-921 | Override with new `.focus-checklist-item` styles |
| Timer display CSS | 6768-6775 | Update for new `.focus-timer-digits` class |
| Timer button CSS | 6784-6805 | Update for new `.focus-btn-main` / `.focus-btn-start` / `.focus-btn-pause` |
| Duration btn CSS | 6807-6819 | Replace with `.focus-dur-btn` styles |
| Checklist dark overrides | 6839-6870 | Replace with unified dark-only styles |
| No task state HTML | 7593-7598 | Replace with `.focus-empty-state` structure |
| Timer circle HTML | 7607-7613 | Replace with 320x320 SVG with gradients/glow |
| Timer card HTML | 7603-7627 | Restructure: task header above timer |
| Task card HTML | 7630-7634 | Remove (integrated into timer card) |
| Checklist HTML | 7637-7657 | Update class names to new system |
| Complete button HTML | 7660-7662 | Replace with `.focus-btn-complete` |
| Exit button HTML | 7665-7667 | Replace with `.focus-actions` group |
| Complete modal HTML | 7671-7688 | Replace with animated `.focus-complete-overlay` |
| `updateFocusTimerDisplay()` JS | 18222-18257 | Add ~15 lines for color/state class toggles |
| `renderFocusChecklist()` JS | 18445-18451 | Update checklist item template |
| `showFocusCompleteModal()` JS | 18334-18358 | Add confetti trigger (~10 lines) |
| New CSS block | After 7021 | Insert all new classes + keyframes (~500 lines) |

**Total estimated changes:** ~600 lines of new CSS, ~40 lines of HTML restructuring, ~30 lines of minimal JS (class toggles + confetti elements only).

---

## 8. Color Transition Map (Timer States)

| Time Remaining | State Class | Stroke Gradient | Glow Color | Digit Shadow |
|---------------|-------------|-----------------|------------|-------------|
| >33% | (none/default) | green-to-blue | blue 12% | blue 30% |
| 10-33% | `.warning` | amber-to-red | amber 15% | amber 30% |
| <10% | `.critical` | red-to-darkred | red 18% | red 40% |
| Paused | (no `.running`) | unchanged | no pulse | no breathe |

---

## 9. Encouraging Messages (Rotating on Complete)

Array of completion messages to randomly show instead of always "CRUSHED IT!":

```javascript
const completeMessages = [
    'CRUSHED IT!',
    'LOCKED IN!',
    'BEAST MODE!',
    'UNSTOPPABLE!',
    'LET\'S GO!',
    'ON FIRE!',
    'NAILED IT!',
    'PURE FOCUS!'
];
```

This is a 1-line change in `showFocusCompleteModal()` to pick a random message.
