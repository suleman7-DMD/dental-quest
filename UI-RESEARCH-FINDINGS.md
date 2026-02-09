# UI Research Findings: Modern Productivity App Design Patterns

> Compiled 2026-02-09 | For Focus View Redesign

---

## 1. Color Palette Recommendations

### Primary Dark Theme Palette (Recommended)

Based on analysis of Linear, Vercel Geist, shadcn/ui, and leading dark-mode productivity apps.

**Background Layers (darkest to lightest):**

| Token              | Hex       | Usage                                      | Reference App      |
|--------------------|-----------|--------------------------------------------|--------------------|
| `--bg-base`        | `#0C0D0F` | Page/app background                        | Linear, Vercel     |
| `--bg-surface`     | `#141517` | Cards, panels, primary containers          | Linear (#121212)   |
| `--bg-elevated`    | `#1C1D21` | Modals, popovers, dropdowns                | shadcn card        |
| `--bg-hover`       | `#252830` | Hover states on surfaces                   | Linear (#1b1c1d)   |
| `--bg-active`      | `#2E3039` | Active/pressed states                      | Vercel accent      |

**Text Colors:**

| Token              | Hex       | Usage                                      |
|--------------------|-----------|----------------------------------------------|
| `--text-primary`   | `#F1F3F5` | Headings, primary content                  |
| `--text-secondary` | `#9BA1AB` | Descriptions, labels, secondary info       |
| `--text-muted`     | `#5C6370` | Placeholders, disabled text, timestamps    |

**Accent Colors:**

| Token              | Hex       | Usage                                      | Reference          |
|--------------------|-----------|--------------------------------------------|--------------------|
| `--accent-primary` | `#6C63FF` | Primary actions, active states, links      | Linear purple      |
| `--accent-hover`   | `#7B73FF` | Hover on primary accent                    |                    |
| `--accent-muted`   | `rgba(108,99,255,0.12)` | Accent backgrounds, subtle highlights |                    |
| `--accent-secondary`| `#3B82F6`| Secondary highlights, info states          | Tailwind blue-500  |

**Semantic Colors:**

| Token              | Hex       | Usage                                      |
|--------------------|-----------|----------------------------------------------|
| `--success`        | `#22C55E` | Completed tasks, positive feedback         |
| `--success-muted`  | `rgba(34,197,94,0.12)` | Success backgrounds               |
| `--warning`        | `#F59E0B` | Caution states, approaching deadlines      |
| `--warning-muted`  | `rgba(245,158,11,0.12)` | Warning backgrounds              |
| `--error`          | `#EF4444` | Errors, overdue items, destructive actions |
| `--error-muted`    | `rgba(239,68,68,0.12)` | Error backgrounds                 |

**Borders:**

| Token              | Hex       | Usage                                      |
|--------------------|-----------|----------------------------------------------|
| `--border-default` | `rgba(255,255,255,0.08)` | Card borders, dividers            |
| `--border-hover`   | `rgba(255,255,255,0.14)` | Borders on hover                  |
| `--border-accent`  | `rgba(108,99,255,0.4)` | Focused inputs, selected cards     |

### Why These Colors?

- **Never pure black (#000)**: #0C0D0F provides depth without the harshness of pure black. Apps like Linear (#121212), Notion, YouTube (#181818), and VS Code (#1e1e1e) all avoid pure black.
- **OKLCH-informed neutrals**: Following shadcn/ui's move to OKLCH, these grays have consistent perceived lightness across hues.
- **Purple-blue accent**: Linear's success with purple accent (#848CD0 dark mode) demonstrates how purple reads as modern and premium in dark UIs. The recommended #6C63FF is more vibrant for interactive elements.
- **Transparent borders**: Using rgba white with low opacity (8-14%) creates borders that naturally adapt to surface color variations, following Vercel and shadcn conventions.

---

## 2. Typography Scale

### Font Family

```css
/* Primary: Inter (used by Linear, Vercel, many modern apps) */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;

/* Monospace: for numbers, code, timers */
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code',
    ui-monospace, monospace;
```

Inter is available via Google Fonts CDN:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Size Scale

| Token     | Size    | Line Height | Usage                                    |
|-----------|---------|-------------|------------------------------------------|
| `--xs`    | 11px    | 16px (1.45) | Badges, micro labels, timestamps         |
| `--sm`    | 13px    | 20px (1.54) | Secondary text, descriptions, meta       |
| `--base`  | 14px    | 22px (1.57) | Body text, task names, default           |
| `--md`    | 15px    | 24px (1.60) | Emphasized body, card titles             |
| `--lg`    | 18px    | 28px (1.56) | Section headers, modal titles            |
| `--xl`    | 22px    | 30px (1.36) | Page titles, tab headers                 |
| `--2xl`   | 28px    | 36px (1.29) | Hero numbers (XP count, streak)          |
| `--3xl`   | 36px    | 44px (1.22) | Dashboard hero stats                     |

### Weight Usage

| Weight | CSS Value | Usage                                  |
|--------|-----------|----------------------------------------|
| Regular | 400      | Body text, descriptions                |
| Medium  | 500      | Labels, nav items, card titles         |
| Semibold| 600      | Section headers, buttons, emphasis     |
| Bold    | 700      | Hero numbers, page titles              |

### Letter Spacing

```css
--tracking-tight:  -0.02em;  /* Headlines, large text */
--tracking-normal:  0;        /* Body text */
--tracking-wide:    0.02em;   /* All-caps labels, xs text */
--tracking-widest:  0.06em;   /* Micro badges, XP labels */
```

---

## 3. Spacing System

### Base Unit: 4px

| Token   | Value | Common Usage                                         |
|---------|-------|------------------------------------------------------|
| `--sp-1`  | 4px   | Inline element gaps, icon-to-text margin           |
| `--sp-2`  | 8px   | Tight padding (badges, pills), related group gaps  |
| `--sp-3`  | 12px  | Standard padding (buttons, inputs), list item gaps |
| `--sp-4`  | 16px  | Card inner padding, section gaps                   |
| `--sp-5`  | 20px  | Card group gaps                                    |
| `--sp-6`  | 24px  | Section separators                                 |
| `--sp-8`  | 32px  | Major section gaps, modal padding                  |
| `--sp-10` | 40px  | Page-level section separators                      |
| `--sp-12` | 48px  | Top/bottom page padding                            |

### Application Guidelines (Notion 8px grid)

- **Within a component**: 4-8px gaps between related elements
- **Between components**: 12-16px
- **Between sections**: 24-32px
- **Page margins**: 16-24px on mobile, 32-48px on desktop
- Notion uses a 224px sidebar width and 8px grid system for alignment

---

## 4. Shadow / Elevation System

### Dark Mode Shadow Strategy

On dark backgrounds, traditional dark shadows become invisible. The modern approach uses:
1. **Subtle lighter shadows** (white with very low opacity)
2. **Colored glow effects** (accent color as soft shadow)
3. **Border + background shift** to indicate elevation

```css
/* Level 0 - Flat (default surface) */
--shadow-none: none;

/* Level 1 - Slight lift (cards at rest) */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3),
             0 0 0 1px rgba(255, 255, 255, 0.04);

/* Level 2 - Elevated (hovered cards, dropdowns) */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4),
             0 0 0 1px rgba(255, 255, 255, 0.06);

/* Level 3 - Floating (modals, command palette) */
--shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.5),
             0 0 0 1px rgba(255, 255, 255, 0.08);

/* Level 4 - Dramatic (toasts, notifications) */
--shadow-xl: 0 16px 50px rgba(0, 0, 0, 0.6),
             0 0 0 1px rgba(255, 255, 255, 0.1);

/* Accent glow (focused/active elements) */
--shadow-glow: 0 0 0 1px rgba(108, 99, 255, 0.4),
               0 0 20px rgba(108, 99, 255, 0.15);

/* Success glow (completed tasks, celebrations) */
--shadow-success: 0 0 0 1px rgba(34, 197, 94, 0.4),
                  0 0 20px rgba(34, 197, 94, 0.1);

/* Inset shadow (pressed states, input fields) */
--shadow-inset: inset 0 1px 3px rgba(0, 0, 0, 0.3);
```

### Linear's Approach
Linear uses `box-shadow: 0 10px 40px var(--bg)` on cards and combines it with `border: 1px solid var(--alt-bg)` for a subtle but clear elevation hierarchy.

---

## 5. Border Radius Conventions

```css
/* Small - buttons, badges, pills, inputs */
--radius-sm: 6px;

/* Medium - cards, panels, dropdowns */
--radius-md: 10px;

/* Large - modals, dialogs, large containers */
--radius-lg: 14px;

/* Extra large - hero cards, floating elements */
--radius-xl: 18px;

/* Full - circular elements, toggle pills */
--radius-full: 9999px;
```

### Application

| Element              | Radius       |
|----------------------|--------------|
| Buttons              | 6px          |
| Input fields         | 6px          |
| Badges / Pills       | 9999px       |
| Task cards           | 10px         |
| Dropdown menus       | 10px         |
| Progress bars        | 9999px       |
| Modals               | 14px         |
| Avatar images        | 9999px       |
| Tooltip              | 6px          |

Linear uses 3px, 5px, 8px for tight controls. The recommended values above are slightly more rounded, following the 2025-2026 trend toward softer corners (Todoist, Sunsama, Akiflow all trend rounder).

---

## 6. Animation Timing

### Duration Scale

| Type              | Duration  | Usage                                    |
|-------------------|-----------|------------------------------------------|
| Instant           | 50ms      | Color changes, opacity micro-shifts      |
| Quick             | 100ms     | Hover color shifts, toggle states        |
| Standard          | 150ms     | Button hover, card hover lift            |
| Smooth            | 200ms     | Dropdown open, accordion expand          |
| Deliberate        | 300ms     | Modal appear, slide-in panels            |
| Celebration       | 500ms     | XP gain animation, level-up              |
| Dramatic          | 800ms     | Achievement unlock, streak milestone     |

### Easing Functions

```css
/* Standard - most interactions */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);

/* Bouncy - celebrations, achievements */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Snappy - menus, dropdowns */
--ease-snappy: cubic-bezier(0.2, 0, 0, 1);

/* Gentle - fade-ins, subtle transitions */
--ease-gentle: cubic-bezier(0.4, 0, 0.2, 1);

/* Spring - playful interactions (XP, badges) */
--ease-spring: cubic-bezier(0.22, 1.2, 0.36, 1);
```

### CSS Keyframe Patterns

```css
/* Hover lift - cards, interactive elements */
@keyframes hoverLift {
    from { transform: translateY(0); }
    to   { transform: translateY(-2px); }
}

/* Subtle pulse - attention indicators, active timers */
@keyframes subtlePulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.7; }
}

/* Glow pulse - streak on fire, active focus */
@keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(108, 99, 255, 0.2); }
    50%      { box-shadow: 0 0 20px rgba(108, 99, 255, 0.4); }
}

/* Slide in from bottom - toasts, modals */
@keyframes slideUp {
    from { transform: translateY(12px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
}

/* Slide in from right - panel transitions */
@keyframes slideInRight {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
}

/* Fade in - general appearance */
@keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

/* Scale pop - badge earned, task complete */
@keyframes scalePop {
    0%   { transform: scale(0.8); opacity: 0; }
    60%  { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
}

/* XP number fly-up - gamification */
@keyframes xpFlyUp {
    0%   { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-30px); opacity: 0; }
}

/* Checkmark draw - task completion */
@keyframes checkDraw {
    0%   { stroke-dashoffset: 20; }
    100% { stroke-dashoffset: 0; }
}

/* Streak fire flicker */
@keyframes fireFlicker {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25%      { transform: scale(1.05) rotate(-2deg); }
    75%      { transform: scale(0.98) rotate(2deg); }
}

/* Confetti burst (use with JS particle system) */
@keyframes confettiFall {
    0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100px) rotate(720deg); opacity: 0; }
}
```

### Performance Note
Always animate `transform` and `opacity` (GPU-accelerated). Use `will-change: transform` on elements that will animate frequently. Avoid animating `width`, `height`, `top`, `left`, `margin`, or `padding`.

---

## 7. Hover / Active State Patterns

### Card Hover Pattern (Linear-inspired)

```css
.task-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: all 150ms var(--ease-out);
    cursor: pointer;
}

.task-card:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.task-card:active {
    transform: translateY(0px);
    background: var(--bg-active);
    box-shadow: var(--shadow-sm);
    transition-duration: 50ms;
}

.task-card:focus-visible {
    outline: none;
    box-shadow: var(--shadow-glow);
}
```

### Button Hover Patterns

```css
/* Primary button */
.btn-primary {
    background: var(--accent-primary);
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    transition: all 150ms var(--ease-out);
}

.btn-primary:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
}

.btn-primary:active {
    transform: translateY(0);
    box-shadow: none;
    transition-duration: 50ms;
}

/* Ghost button */
.btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid transparent;
    transition: all 100ms var(--ease-out);
}

.btn-ghost:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-default);
}
```

### Focus Ring (Accessibility)

```css
/* Modern focus ring - visible only for keyboard navigation */
*:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
    border-radius: inherit;
}

/* Remove default outline for mouse users */
*:focus:not(:focus-visible) {
    outline: none;
}
```

---

## 8. Key UI Patterns to Adopt

### 8.1 Task Card Design (Linear + Todoist hybrid)

```
+-------------------------------------------------------------------+
|  [checkbox]  Task Title Here                    [priority dot]     |
|              Subtitle or context info     [tag] [tag]  [due date] |
+-------------------------------------------------------------------+
```

Key properties:
- Left-aligned checkbox with custom styling (animated on complete)
- Title in `--text-primary`, `--font-size-base`, `font-weight: 500`
- Subtitle in `--text-secondary`, `--font-size-sm`
- Right-aligned metadata: colored priority dot, tags as pills, due date
- Padding: 12px 16px
- Gap between checkbox and text: 12px
- Border-bottom: 1px solid var(--border-default) for list mode
- OR: standalone card with border-radius, shadow for card mode

### 8.2 Progress Indicator Patterns

**Linear progress bar:**
```css
.progress-bar {
    height: 6px;
    background: var(--bg-hover);
    border-radius: 9999px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-primary), #8B5CF6);
    border-radius: 9999px;
    transition: width 500ms var(--ease-out);
}
```

**Circular progress (for Pomodoro timer):**
- SVG circle with `stroke-dasharray` and `stroke-dashoffset`
- Smooth transition on the offset for countdown
- Accent color stroke with subtle glow

**Stat card with number:**
```
+---------------------+
|  Daily XP           |
|  +245               |
|  [======--]  78%    |
+---------------------+
```

### 8.3 Badge / Pill Patterns

```css
.badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
}

.badge-accent {
    background: var(--accent-muted);
    color: var(--accent-primary);
}

.badge-success {
    background: var(--success-muted);
    color: var(--success);
}

.badge-warning {
    background: var(--warning-muted);
    color: var(--warning);
}
```

### 8.4 Empty State Patterns

```
+-------------------------------------------+
|                                           |
|          [illustration / icon]            |
|                                           |
|        No tasks scheduled yet             |
|    Add your first task to get started     |
|                                           |
|         [ + Add Task ]                    |
|                                           |
+-------------------------------------------+
```

- Centered layout
- Muted icon or simple illustration (32-48px)
- Heading in `--text-primary`, `font-weight: 500`
- Description in `--text-muted`
- Single clear CTA button
- Subtle background: `var(--bg-surface)` with dashed border

### 8.5 Celebration / Reward Patterns

**Task completion:**
1. Checkbox fills with accent color (150ms ease-out)
2. Checkmark draws in via SVG stroke animation (200ms)
3. Task text gets `text-decoration: line-through` with `--text-muted` color
4. Optional: small "+XP" text flies up from the checkbox (500ms, fades out)

**Streak milestone (3, 7, 14, 30 days):**
1. Streak counter scales up briefly (scalePop, 300ms)
2. Glow pulse on the streak container (800ms)
3. Badge appears with slide-in animation
4. Optional confetti burst for major milestones (30+)

**Level up:**
1. Full-width banner slides down from top
2. Background gradient shimmer animation
3. New level number with scale-pop
4. Auto-dismiss after 3 seconds

### 8.6 Pomodoro Timer Pattern (Sunsama-inspired)

```
+-------------------------------------------+
|                                           |
|          [circular timer SVG]             |
|            24:35 remaining                |
|                                           |
|     Working on: Task Name Here            |
|                                           |
|    [Pause]   [Skip]   [Complete]          |
|                                           |
|  Session 3/4     Total: 1h 45m today      |
+-------------------------------------------+
```

- Dominant circular timer with accent stroke
- Time in `--font-mono`, `--3xl`, `font-weight: 700`
- Subtle pulse animation on the timer ring when active
- Control buttons spaced with 12px gap
- Session progress as small dots below timer

---

## 9. What Makes Apps Feel "Premium"

### Common Themes Across Linear, Notion, Sunsama, Todoist, Akiflow

1. **Restraint in color usage**: Premium apps use color sparingly. Most of the UI is neutral grays and whites, with accent color reserved for interactive elements and key data points. Never more than 2-3 accent colors visible at once.

2. **Consistent spacing rhythm**: Every element follows the same spacing grid (typically 4px or 8px base). Nothing feels "eyeballed." Notion's strict 8px grid is a prime example.

3. **Typography hierarchy**: Clear visual hierarchy through weight and size, not through color or decoration. Linear uses Inter with just 3 weights (400, 500, 600) and lets font size do the heavy lifting.

4. **Subtle depth, not heavy shadows**: Modern dark UIs use very subtle elevation cues -- barely-visible borders, slight background shifts on hover, minimal shadows. Heavy drop shadows feel dated.

5. **Purposeful animations**: Every animation has a reason. Hover? Acknowledge interaction. Complete a task? Reward the user. Open a panel? Orient the user spatially. Gratuitous animation feels cheap.

6. **Seamless transitions**: State changes (tab switch, modal open, content load) use 150-300ms transitions rather than instant swaps. The eye tracks movement naturally.

7. **Information density done right**: Premium apps show a lot of data without feeling cluttered. They achieve this through:
   - Tight but consistent spacing
   - Visual weight hierarchy (not everything is bold)
   - Progressive disclosure (details on hover/expand)
   - Muted secondary information

8. **Micro-feedback on every interaction**: Hover states, active states, loading states, success states -- every action gets visual acknowledgment. The 50ms active-state "dip" (scale down slightly) on buttons makes clicks feel tangible.

9. **Dark mode done right**: Not just "invert colors." Premium dark mode means:
   - Multiple surface layers (3-4 shades of dark gray)
   - Text that's off-white (#F1F3F5), not pure white (#FFFFFF)
   - Borders using rgba(255,255,255,0.08) not solid gray
   - Colored elements slightly desaturated compared to light mode
   - Increased padding/spacing (dark surfaces need more breathing room)

10. **Custom details**: The little things that show craft:
    - Custom checkbox animations instead of browser defaults
    - Monospace font for numbers (prevents layout shift)
    - Gradient accents on key elements (progress bars, active tabs)
    - Smooth number transitions (count-up animations)
    - Keyboard shortcuts visible in UI (badges next to buttons)

### What to Avoid (Things That Feel Cheap)

- **Saturated colors on dark backgrounds**: Neon colors directly on #000 feels harsh. Always use slightly desaturated accent colors or add colored backgrounds with low opacity behind bright text.
- **Too many border-radius values**: Mixing 4px, 8px, 12px, 16px, 20px randomly looks inconsistent. Pick 3-4 values and stick to them.
- **Instant state changes**: No transition on hover/active feels broken in 2025+.
- **Heavy gradients as backgrounds**: Gradient-heavy UIs feel 2018. Use gradients sparingly (progress bars, accents, subtle background washes).
- **Too many font sizes**: More than 6-7 distinct sizes in a single view creates visual noise.
- **Gray text on gray background without enough contrast**: WCAG AA requires 4.5:1 for body text. Test all text/bg combos.
- **Overuse of icons**: Every button having an emoji or icon adds clutter. Use icons for recognition, text for explanation.
- **Inconsistent density**: Some sections cramped, others spacious. Pick a density level and maintain it.
- **Animation for animation's sake**: Bouncing elements, spinning loaders for 100ms operations, parallax backgrounds -- these distract rather than assist.
- **Shadow AND border AND background change on hover**: Pick 1-2 properties to change, not all of them. Subtlety is premium.

---

## Quick Reference: CSS Custom Properties Block

```css
:root {
    /* Colors - Background */
    --bg-base: #0C0D0F;
    --bg-surface: #141517;
    --bg-elevated: #1C1D21;
    --bg-hover: #252830;
    --bg-active: #2E3039;

    /* Colors - Text */
    --text-primary: #F1F3F5;
    --text-secondary: #9BA1AB;
    --text-muted: #5C6370;

    /* Colors - Accent */
    --accent-primary: #6C63FF;
    --accent-hover: #7B73FF;
    --accent-muted: rgba(108, 99, 255, 0.12);
    --accent-secondary: #3B82F6;

    /* Colors - Semantic */
    --success: #22C55E;
    --success-muted: rgba(34, 197, 94, 0.12);
    --warning: #F59E0B;
    --warning-muted: rgba(245, 158, 11, 0.12);
    --error: #EF4444;
    --error-muted: rgba(239, 68, 68, 0.12);

    /* Colors - Border */
    --border-default: rgba(255, 255, 255, 0.08);
    --border-hover: rgba(255, 255, 255, 0.14);
    --border-accent: rgba(108, 99, 255, 0.4);

    /* Typography */
    --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;

    --text-xs: 11px;
    --text-sm: 13px;
    --text-base: 14px;
    --text-md: 15px;
    --text-lg: 18px;
    --text-xl: 22px;
    --text-2xl: 28px;
    --text-3xl: 36px;

    /* Spacing */
    --sp-1: 4px;
    --sp-2: 8px;
    --sp-3: 12px;
    --sp-4: 16px;
    --sp-5: 20px;
    --sp-6: 24px;
    --sp-8: 32px;
    --sp-10: 40px;
    --sp-12: 48px;

    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-xl: 18px;
    --radius-full: 9999px;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.04);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06);
    --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
    --shadow-xl: 0 16px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
    --shadow-glow: 0 0 0 1px rgba(108, 99, 255, 0.4), 0 0 20px rgba(108, 99, 255, 0.15);
    --shadow-inset: inset 0 1px 3px rgba(0, 0, 0, 0.3);

    /* Easing */
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
    --ease-gentle: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-spring: cubic-bezier(0.22, 1.2, 0.36, 1);
}
```

---

## Research Sources

- Linear app design: https://linear.app/now/how-we-redesigned-the-linear-ui
- Linear style reference: https://linear.style/
- Linear design trend analysis: https://blog.logrocket.com/ux-design/linear-design/
- shadcn/ui theming: https://ui.shadcn.com/docs/theming
- Vercel Geist design system: https://vercel.com/geist/colors
- Dark mode palettes 2025: https://colorhero.io/blog/dark-mode-color-palettes-2025
- Dark mode best practices: https://www.designstudiouiux.com/blog/dark-mode-ui-design-best-practices/
- 50 shades of dark mode gray: https://blog.karenying.com/posts/50-shades-of-dark-mode-gray/
- Todoist gamification: https://trophy.so/blog/todoist-gamification-case-study
- Gamification in UI/UX: https://www.mockplus.com/blog/post/gamification-ui-ux-design-guide
- CSS animation trends 2025: https://webpeak.org/blog/css-js-animation-trends/
- CSS easing functions: https://easings.net/
- Josh Comeau shadows guide: https://www.joshwcomeau.com/css/designing-shadows/
- Sunsama features: https://www.sunsama.com/features/daily-planning-and-shutdown
- Akiflow design: https://akiflow.com/blog/a-new-chapter
- UI design trends 2025: https://www.pixelmatters.com/insights/8-ui-design-trends-2025
