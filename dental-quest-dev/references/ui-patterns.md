# UI Patterns Reference

> All code lives in `index.html`. Line numbers are approximate (post-Feb 2026 edits).

## Table of Contents
- [1. CSS Custom Properties](#1-css-custom-properties-root-at-line-5795)
- [2. Task Card Patterns](#2-task-card-patterns)
- [3. Button Patterns](#3-button-patterns)
- [4. Mobile Responsive Design](#4-mobile-responsive-design)
- [5. Animation Keyframes](#5-animation-keyframes)
- [6. Z-Index Layering](#6-z-index-layering)
- [7. Dark vs Light Theme Contexts](#7-dark-vs-light-theme-contexts)

---

## 1. CSS Custom Properties (`:root` at ~line 5795)

### Layout & Surface Colors
```css
--bg-page:       #0f172a    /* Deep navy page background */
--bg-card:       #1e293b    /* Card/panel background */
--bg-card-hover: #334155    /* Card hover state */
--bg-input:      #0f172a    /* Input field background */
--border:        #334155    /* Default border */
--border-hover:  #475569    /* Border hover state */
```

### Text Colors
```css
--text-primary:   #f1f5f9   /* Main text, headings */
--text-secondary: #94a3b8   /* Labels, descriptions */
--text-muted:     #64748b   /* Timestamps, hints */
```

### Accent Colors
```css
--accent-blue:    #3b82f6   /* Primary actions, LOCKED IN tier badge */
--accent-green:   #22c55e   /* Success, start buttons, completion */
--accent-amber:   #f59e0b   /* LOCKED IN border, now-line, warnings */
--accent-teal:    #14b8a6   /* Secondary accent */
--accent-red:     #ef4444   /* Destructive, remove buttons */
--accent-purple:  #8b5cf6   /* Level badges, premium feel */
--accent-indigo:  #6366f1   /* Alternative primary */
```

### Gamification Colors
```css
--gam-gold:           #fbbf24   /* Trophy, perfect day, blazing streak */
--gam-xp-green:       #22c55e   /* XP float text */
--gam-streak-warm:    #fb923c   /* Streak 1-3 days */
--gam-streak-hot:     #f87171   /* Streak 4-7 days */
--gam-streak-blazing: #fbbf24   /* Streak 8+ days */
```

---

## 2. Task Card Patterns

The app has three distinct task card styles for its three views.

### 2a. Full View: `.task-item` (~line 636)

Used in the Full View task list. Light theme (white/gray cards, colored left borders).

```css
.task-item {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 15px;
    transition: all 0.3s ease;
    border-left: 4px solid transparent;
    animation: slideIn 0.3s ease-out;
}
```

**Category border colors:**
| Category | Color |
|----------|-------|
| `.financial` | `#43e97b` |
| `.clinic` | `#fa709a` |
| `.health` | `#30cfd0` |
| `.school` | `#a8edea` |
| `.academic` | `#ff9a56` |
| `.future` | `#4facfe` |
| `.life` | `#f093fb` |
| `.dotoday` | `#ff416c` |

**DOM structure** (2-row layout for iOS Safari compatibility):
```html
<div class="task-item [category]">
    <div class="task-row-top">         <!-- Row 1: flex, gap 15px -->
        <input class="task-checkbox" type="checkbox">
        <span class="category-icon">...</span>
        <span class="task-text">Task name</span>
    </div>
    <div class="task-actions">         <!-- Row 2: flex, gap 8px -->
        <button class="do-today-btn">Do Today</button>
        <button class="task-timer-btn">Edit</button>
        <button class="task-delete-btn">Delete</button>
    </div>
</div>
```

On mobile (768px), `.task-item` switches to `flex-direction: column` and `.task-actions` gets `padding-left: 28px` to align under the text (not the checkbox).

### 2b. Command Center Triage: `.cc-task-item` (~line 693)

Used in Triage tab columns (LOCKED IN, Today, Tomorrow). Dark theme, compact.

```css
.cc-task-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    margin-bottom: 4px;
    cursor: grab;
    transition: all 0.15s ease;
    border: 1px solid transparent;
}
```

**Child elements:**
- `.drag-handle` -- Grab cursor, muted color (hidden on touch via `@media (hover: none)`)
- `.task-checkbox` -- 15x15px
- `.task-text` -- 0.85em, flex: 1, strikethrough when `.completed`
- `.task-actions` -- flex container with action buttons:
  - `.crash-out-btn` -- Orange tint (`rgba(255,107,53,0.15)`)
  - `.remove-btn` -- Red tint (`rgba(239,68,68,0.15)`)
  - `.start-btn` -- Green tint (`rgba(16,185,129,0.15)`)
  - `.action-btn` -- Base style: 3px 6px padding, 0.75em font, 4px border-radius

**States:** `.dragging` (opacity 0.5, scale 1.02), `.drag-over` (blue top border)

### 2c. Crash Out Timeline: `.timeline-task` / `.task-card-timeline` (~line 7040)

Used in Crash Out tab. Timeline layout with time markers and vertical rail.

```css
.timeline-task {
    position: relative;
    margin-bottom: 4px;
}

.task-card-timeline {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    position: relative;
}
```

**Subcomponents:**
- `.task-time-marker` -- Absolute positioned left (-88px), shows start time in monospace
- `.task-time-marker::after` -- Blue dot on timeline rail (8px circle)
- `.task-tier-badge` -- 18x18px icon badge
  - `.locked-in` -- Amber gradient
  - `.today` -- Solid blue
- `.task-content` -- Flex container with `.task-text` (13px, ellipsis overflow) and `.task-duration-info` (pill badge)
- `.timeline-task-actions` -- Flex, gap 4px:
  - `.btn-start` -- Green background
  - `.btn-done` -- Teal/emerald background
  - `.btn-push` -- Amber background
  - `.btn-skip` -- Subtle/muted

**LOCKED IN variant:** `.task-card-timeline.locked-in` adds amber left border and gradient background.

### Now Line (~line 7033)

```css
.now-line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-amber), transparent);
    margin-left: 8px;
}
.now-time {
    font-size: 13px;
    color: var(--accent-amber);
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
}
```

---

## 3. Button Patterns

### Full View Buttons (light theme, ~line 1933)

| Class | Background | Color | Purpose |
|-------|-----------|-------|---------|
| `.do-today-btn` | `linear-gradient(135deg, #ff416c, #ff4b2b)` | white | Mark task for today |
| `.do-today-btn.active` | `#28a745` | white | Already marked |
| `.task-timer-btn` | `#667eea` | white | Edit task |
| `.task-delete-btn` | `#ff4757` | white | Delete task |

All three: 44px min-height, 8px border-radius, 0.9em font.

### Command Center Buttons (dark theme, ~line 738)

| Class | Background | Text Color | Purpose |
|-------|-----------|-----------|---------|
| `.start-btn` | `rgba(16,185,129,0.15)` | `#10b981` | Start focus |
| `.crash-out-btn` | `rgba(255,107,53,0.15)` | `#ff6b35` | Send to crash out |
| `.remove-btn` | `rgba(239,68,68,0.15)` | `#ef4444` | Remove task |
| `.action-btn` | (base) | -- | Generic small button |

All: 3px 6px padding, 0.75em font, 4px border-radius. Hover doubles opacity of background.

### Timeline Action Buttons (~line 7155)

Small buttons (3px 6px, 11px font, 4px radius) with solid background colors:
- `.btn-start` -- `var(--accent-green)` with white text
- Hover: filter brightness(1.1)

### Checkbox (`.task-checkbox` ~line 1958)

```css
.task-checkbox {
    width: 44px; height: 44px;
    min-width: 44px; min-height: 44px;
    cursor: pointer;
    accent-color: #667eea;
}
```
Hover: scale(1.15). Checked: `@keyframes check-bounce`.
In `.cc-task-item`: reduced to 15x15px.

---

## 4. Mobile Responsive Design

The app uses 28+ media query blocks across multiple CSS sections. Key breakpoints:

### Breakpoint Summary

| Breakpoint | Target | Key Changes |
|-----------|--------|-------------|
| `1100px` | Tablets landscape | Triage columns: 2-column grid, tomorrow spans 2 |
| `1023px` | Used in some specific overrides | -- |
| `768px` | Tablets portrait / large phones | Full View overhaul kicks in; compact header shown; old header hidden; triage goes 1-column; task-item gets flex-direction: column |
| `700px` | Triage refinement | Single column, min/max height on columns |
| `480px` | Standard phones | Timer: 260x260px, font-size reductions, stat card labels shrink, category tabs compact |
| `420px` | Small phones (iPhone SE) | Tighter padding (8px 4px), checkbox 20x20, action buttons 26px min-height |
| `380px` | Extra small | Further compaction |
| `(hover: none), (pointer: coarse)` | Touch devices | Drag handles hidden |

### Full View Mobile Overhaul v2 (~line 10258)

Activated at 768px. Transforms the Full View into a dark-themed mobile experience:

```css
@media (max-width: 768px) {
    #fullViewContainer .tasks-section {
        padding: 10px 6px;
        border-radius: 12px;
        width: 100%;
    }
    /* Dark themed task cards */
    #fullViewContainer .task-item {
        background: rgba(30, 41, 59, 0.95);
        border-radius: 10px;
        padding: 10px 10px 8px;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        border-left-width: 3px;
    }
}
```

Key mobile adaptations:
- Task items switch to column layout (2-row DOM structure)
- `.task-actions` left-padded to align under text (not checkbox)
- Stagger animation: `@keyframes slideInTask` with `animation-delay: calc(var(--i) * 40ms)`
- `.dotoday` task gets `@keyframes urgentPulse` glow
- Touch targets: `touch-action: manipulation` on all interactive elements
- Completed tasks: 0.5 opacity, strikethrough

### Compact Header (~line 9841)

Replaces the full header on mobile (768px):
```css
.header-compact {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
}
```

Hidden by default; shown via `@media (max-width: 768px) { .header-compact { display: block; } }`.
Old header elements (`.cross-app-nav`, `.data-controls`, `.stats-container`) hidden at 768px.

### Quick Add FAB (~line 10068)

```css
#quickAddFAB {
    position: fixed;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    right: 24px;
    width: 56px; height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}
```

Rotates 45 degrees and changes color when panel is open (`.panel-open`).

---

## 5. Animation Keyframes

### Core UI Animations (~line 2164)

| Keyframe | Effect | Duration (typical) |
|----------|--------|-------------------|
| `fadeIn` | Opacity 0 to 1 | 1s |
| `slideUp` | Translate Y(20px) + opacity to 0,0 | 0.3s |
| `slideIn` | Translate X(-20px) + opacity to 0,0 | 0.3s |
| `slideInBottom` | Translate Y(100%) to 0 | 0.3s |
| `slideInTask` | Translate Y(8px) + opacity to 0,0 | staggered |
| `check-bounce` | Scale 1 -> 1.3 -> 1 | 0.3s |

### Gamification Animations (~line 5820)

| Keyframe | Effect | Used By |
|----------|--------|---------|
| `xpFloat` | Float upward + fade + scale | `.xp-float` on XP award |
| `xpCounterPop` | Scale 1 -> 1.3 (green flash) -> 1 | XP counter `.animating` |
| `levelBadgePulse` | Pulsing blue glow on level badge | `.xp-level-badge` (infinite) |
| `levelUpPop` | Scale 0 -> 1.2 -> 1 -> 0.5 fade | `.level-up-overlay` |
| `progressShimmer` | Translate X shimmer | Progress bars |
| `checkPop` | Scale 1 -> 1.2 -> 1 | Checkbox animation |

### Streak Fire Animations (~line 5866)

| Keyframe | Speed | Tier |
|----------|-------|------|
| `fireFlickerSubtle` | 2s | `.streak-warm` (1-3 days) |
| `fireFlickerMedium` | 1.2s | `.streak-hot` (4-7 days) |
| `fireFlickerIntense` | 0.8s | `.streak-blazing` (8+ days) |
| `streakRiskPulse` | 2s | `.streak-at-risk` (after 9pm, no completion) |

### Celebration Animations (~line 8341)

| Keyframe | Effect | Used By |
|----------|--------|---------|
| `confettiFall` | Translate Y(-20px) to Y(100vh) + rotate 720deg | `.confetti` particles |
| `completionMessagePop` | Scale 0 -> 1.15 -> 1, hold, then float up + fade | `.completion-message` |
| `screenPulse` | Green inset box-shadow flash | `.screen-pulse` on body |
| `perfectDayFlash` | Opacity in -> hold -> fade | `.perfect-day-overlay` |
| `badgePopEnhanced` | Scale 0 + rotate -> bounce in | `.perfect-day-badge` |
| `trophyBounce` | Scale 0 -> 1.3 -> 0.9 -> 1.1 -> 1 | `.trophy` inside badge |
| `glowPulse` | Scale + opacity pulse | `.trophy-glow` |
| `taskCardFlash` | Green background flash | Task card on completion |

### Focus Timer Animations (~line 9751)

| Keyframe | Effect | Used By |
|----------|--------|---------|
| `focusGlowPulse` | Opacity + scale pulse | Timer glow ring |
| `focusDigitBreathe` | Subtle scale breathing | Timer digits |
| `focusPausedBlink` | Opacity blink | Timer when paused |
| `focusConfettiFall` | Custom fall with CSS vars | Focus complete confetti |

### Other Notable Animations

| Keyframe | Effect |
|----------|--------|
| `subtlePulse` | Amber border-left pulsing (active tasks) |
| `setupRingPulse` | Scale + opacity ring pulse (setup indicator) |
| `nowPulse` | Amber glow pulse (now-line marker) |
| `sleepBreathe` | Gentle scale breathing |
| `milestonePulse` | Brightness flash |
| `urgentPulse` | Red glow pulse (Do Today tasks on mobile) |

---

## 6. Z-Index Layering

| Z-Index | Element |
|---------|---------|
| 10001 | `.level-up-overlay` |
| 10000 | `.completion-message`, `.perfect-day-badge` |
| 9999 | `.confetti-container`, `.celebration-overlay`, `#quickAddFAB`, `.perfect-day-overlay` |
| 1000 | `.header-compact` (sticky) |

---

## 7. Dark vs Light Theme Contexts

The app is NOT theme-togglable. Instead:

- **Full View** (legacy): Light theme -- white backgrounds (`#f8f9fa`), dark text, colored borders
- **Focus View / Command Center**: Dark theme -- uses CSS variables (`--bg-page: #0f172a`, etc.)
- **Full View on Mobile (768px)**: Switches to dark theme via media query overhaul

The `:root` variables are scoped to Focus View styles. Full View uses hardcoded light colors. When Full View goes mobile, the `@media (max-width: 768px)` block forces dark backgrounds on `#fullViewContainer` elements.
