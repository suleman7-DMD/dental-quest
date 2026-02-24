# Stimulant Elimination Calculator — Warm Clinical Redesign Plan

> **Goal**: Apply the exact same warm clinical design language from the Dental Quest redesign to the Stimulant Elimination Calculator. Pure visual rebrand — zero changes to pharmacokinetic math, sleep prediction algorithms, calibration, Firebase sync, or any underlying logic.

> **Approach**: The stim calc keeps its **accordion layout** (no sidebar). Unlike Dental Quest's multi-tab task manager, stim calc is a single-purpose vertical-scroll calculator where accordion sections are the natural UX pattern. We apply the warm clinical tokens, typography, and component styling to this existing structure.

---

## Architecture Summary

### Files to Modify
| File | What Changes | What Does NOT Change |
|------|-------------|---------------------|
| `stimulant-elimination-calculator.html` | ~2,305 lines of CSS (entire stylesheet) | HTML structure stays identical |
| `js/stimcalc/state.js` | Add `icon()` helper, update `showCustomAlert/Confirm` colors | All state defaults, utilities, time helpers |
| `js/stimcalc/firebase-sync.js` | Update `updateSyncStatus()` colors | All save guards, sync logic, checkpoint system |
| `js/stimcalc/med-caffeine.js` | Update stacking warning colors, date input colors | All medication/caffeine CRUD logic |
| `js/stimcalc/ui-sections.js` | Update nicotine button gradients, modifier colors | All modifier/workout/what-if logic |
| `js/stimcalc/history-calendar.js` | Update calendar day status colors, insight section colors | All analytics calculations, data gathering |
| `js/stimcalc/graph.js` | Update canvas zone colors, grid colors, font family | All pharmacokinetic curve math, threshold logic |
| `js/stimcalc/init.js` | Update hero display colors, sleep quality indicators | All recalculate() math, accordion logic |
| `js/stimcalc/circadian.js` | No changes | Pure math module |
| `js/stimcalc/pharma-engine.js` | No changes | Pure math module |
| `js/stimcalc/sleep-prediction.js` | No changes | Pure math module |

### What MUST NOT Be Touched
- `recalculate()` → `syncStateFromDOM()` → `runCalculations()` → `updateUI()` pipeline
- XR pharmacokinetic model (50/50 split, DR at T+4)
- 7-phase sleep prediction algorithm
- Circadian analysis (forbidden zone, wake maintenance zone, sleep gate)
- VitC 3-segment decay model
- Firebase save guards (5 guards in both save functions)
- `mergeRemoteState()` consolidation
- `isEmptyState()` checks
- Checkpoint system (create/restore/export/import)
- All-nighter ghost load calculations
- History/calibration data integrity
- `gatherAllDayData()` and `getSleepForDate()` (analytics data sources)

---

## Phase 0: Token Foundation & Font Import

### 0A. Add CSS Variables to `:root`
Insert at the very top of the `<style>` block in `stimulant-elimination-calculator.html`:

```css
:root {
    /* Canvas & Surfaces */
    --canvas: #FAF8F5;
    --canvas-subtle: #F5F2ED;
    --canvas-inset: #EFECE6;
    --surface-primary: #FFFFFF;
    --surface-elevated: #FFFFFF;

    /* Text Hierarchy */
    --fg-primary: #2C2825;
    --fg-secondary: #6B635B;
    --fg-tertiary: #9C948B;
    --fg-muted: #C4BCB3;

    /* Accent (Clinical Sage/Olive) */
    --accent: #6B7C5E;
    --accent-hover: #5A6A4F;
    --accent-light: #E8EDE4;
    --accent-lighter: #F2F5F0;
    --accent-fg: #FFFFFF;

    /* Borders */
    --border-default: rgba(0, 0, 0, 0.08);
    --border-subtle: rgba(0, 0, 0, 0.05);
    --border-strong: rgba(0, 0, 0, 0.12);
    --border-focus: #8A9A7B;

    /* Semantic */
    --destructive: #B85C5C;
    --destructive-light: #F5E6E6;
    --warning: #C4923A;
    --warning-light: #FBF3E4;
    --success: #5E8A5E;
    --success-light: #E4EDE4;
    --info: #5E7A8A;
    --info-light: #E4EDF0;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
    --shadow-overlay: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);

    /* Controls */
    --control-bg: #FFFFFF;
    --control-bg-hover: #F5F2ED;
    --control-border: rgba(0, 0, 0, 0.12);
    --control-border-focus: #8A9A7B;
    --control-ring: rgba(107, 124, 94, 0.25);

    /* Category Colors (for stim-calc specific status semantics) */
    --status-safe: #5E8A5E;
    --status-safe-light: #E4EDE4;
    --status-caution: #C4923A;
    --status-caution-light: #FBF3E4;
    --status-danger: #B85C5C;
    --status-danger-light: #F5E6E6;
    --status-blocking: #994444;
    --status-blocking-light: #F0DADA;
    --status-info: #5E7A8A;
    --status-info-light: #E4EDF0;

    /* Graph Colors (Scientific — intentionally brighter for medical clarity) */
    --graph-amp: #4A7C9B;          /* Muted teal-blue (was #3b82f6) */
    --graph-amp-fill: rgba(74, 124, 155, 0.15);
    --graph-caff: #C4923A;         /* Warm amber (was #f59e0b) */
    --graph-threshold: #B85C5C;    /* Warm red (was #ef4444) */
    --graph-forbidden: rgba(184, 92, 92, 0.10);
    --graph-forbidden-text: rgba(184, 92, 92, 0.6);
    --graph-sleepgate: rgba(94, 138, 94, 0.10);
    --graph-sleepgate-text: rgba(94, 138, 94, 0.6);
    --graph-grid: rgba(0, 0, 0, 0.06);
    --graph-label: #9C948B;

    /* Typography */
    --font-heading: 'Source Serif 4', 'Georgia', serif;
    --font-body: 'Inter', -apple-system, system-ui, sans-serif;
    --font-mono: 'SF Mono', 'Consolas', 'Monaco', monospace;

    /* Spacing */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-full: 9999px;
}
```

### 0B. Import Google Fonts
Add to `<head>` before `<style>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet">
```

### 0C. Add Icon Helper to state.js
Copy the `icon()` function from `js/dental-quest/state.js` (lines 588-662) into `js/stimcalc/state.js`. The stim calc needs a subset of icons:
- `moon`, `sun`, `clock`, `pill`, `coffee`, `zap`, `alert-triangle`, `alert-circle`, `info`, `check-circle`, `check`, `x`, `chevron-down`, `chevron-up`, `settings`, `save`, `folder-open`, `upload`, `download`, `refresh-cw`, `help-circle`, `calendar`, `bar-chart`, `target`, `wind`, `activity`, `play`, `pause`, `timer`, `heart`, `thermometer`, `brain`, `eye`

### Validation Gate
- Verify CSS variables parse correctly (no syntax errors)
- Verify fonts load (check network tab)
- Verify `icon()` function works: `console.log(icon('moon'))` returns SVG string
- **No visual changes yet** — this phase only adds infrastructure

---

## Phase 1: Body, Canvas & Typography

### 1A. Body Background
Replace dark gradient with warm cream:
```css
/* BEFORE: background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460) */
/* AFTER: */
body {
    background: var(--canvas);
    color: var(--fg-primary);
    font-family: var(--font-body);
}
```

### 1B. Global Text Colors
- All `color: #e6edf3` → `var(--fg-primary)`
- All `color: #b0b8c4` → `var(--fg-secondary)`
- All `color: #9ca3af` / `#6e7681` → `var(--fg-tertiary)`
- All `color: #8b949e` → `var(--fg-tertiary)`

### 1C. Typography Update
- `h1`, `h2`: `font-family: var(--font-heading)`
- Body text: `font-family: var(--font-body)`
- Time displays, monospace: `font-family: var(--font-mono)`
- Remove text gradients on h1 (use solid `var(--fg-primary)` instead)

### 1D. Link Colors
- Replace `#58a6ff` with `var(--accent)` for interactive text
- Focus outlines: `var(--control-border-focus)` with `var(--control-ring)` glow

### Validation Gate
- Background is warm cream, text is dark warm brown
- Fonts render correctly (Inter body, Source Serif headings)
- All text is legible on cream background
- No white-on-white or invisible text

---

## Phase 2: Cards, Containers & Surfaces

### 2A. Unified Container
```css
/* BEFORE: glass-morphism with rgba(255,255,255,0.06) */
/* AFTER: */
.unified-container {
    background: var(--surface-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    /* Remove backdrop-filter: blur() — not needed on light theme */
}
```

### 2B. Card Backgrounds
All `.card`, section containers, glass-morphism elements:
- Replace `rgba(255,255,255,0.06)` → `var(--surface-primary)`
- Replace `rgba(255,255,255,0.1)` borders → `var(--border-default)`
- Replace `backdrop-filter: blur(12px)` → remove (or keep subtle `blur(4px)` if desired)
- Add `box-shadow: var(--shadow-sm)` for depth

### 2C. Inset Areas
- Input wrappers, nested sections: `background: var(--canvas-subtle)`
- Deeply nested: `background: var(--canvas-inset)`

### 2D. Border Updates
- All `rgba(255,255,255,0.1)` → `var(--border-default)`
- All `rgba(255,255,255,0.15)` → `var(--border-strong)`
- All `1px solid #30363d` → `1px solid var(--border-default)`

### Validation Gate
- All containers are white on cream canvas
- Subtle depth visible (white cards on cream background)
- No dark blue/purple containers remaining
- Borders are subtle, not harsh

---

## Phase 3: Cross-App Navigation Bar

### 3A. Nav Bar Styling
```css
.cross-app-nav {
    background: var(--surface-primary);
    border-bottom: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-sm);
}
.cross-app-nav a {
    color: var(--fg-tertiary);
    font-family: var(--font-body);
    font-weight: 500;
}
.cross-app-nav a:hover {
    color: var(--fg-secondary);
    background: var(--canvas-subtle);
}
.cross-app-nav a.active {
    color: var(--accent);
    background: var(--accent-light);
    font-weight: 600;
}
```

### Validation Gate
- Nav bar matches dental quest's nav styling
- Active tab (Sleep Calc) highlighted in olive
- Other tabs in muted warm gray

---

## Phase 4: Hero Section & Status Pills

### 4A. Hero Countdown Display
- `.countdown-time`: Keep large 3.2em size, update colors:
  - `.green` → `color: var(--status-safe)`
  - `.yellow` → `color: var(--status-caution)`
  - `.red` → `color: var(--status-danger)`
- Hero background: `var(--surface-primary)` with `var(--shadow-sm)`
- Remove `text-shadow: 0 0 30px currentColor` (too neon for warm theme)
- Replace hero pulse animation with subtler version (slower, lower opacity range)

### 4B. Status Pills
```css
.status-pills {
    /* Remove glassmorphism blur */
    background: transparent;
}
.status-pill {
    background: var(--surface-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    color: var(--fg-secondary);
    box-shadow: var(--shadow-sm);
    /* Remove backdrop-filter: blur(8px) */
}
```
- Pill status colors: safe=olive border, caution=warm amber border, danger=warm red border

### 4C. Progress Bar
- Replace purple-to-green gradient with `var(--accent)` solid or subtle gradient
- Track: `var(--canvas-inset)`

### 4D. Sleep Quality Badges
- `.quality-badge`: `background: var(--status-safe-light); color: var(--status-safe)` (good)
- Warning: `background: var(--status-caution-light); color: var(--status-caution)`
- Danger: `background: var(--status-danger-light); color: var(--status-danger)`

### Validation Gate
- Hero time is large, colored by severity (olive/amber/red)
- Status pills are white with subtle borders (not glassmorphism)
- No neon glows or text shadows
- Warm, calm aesthetic matching dental quest

---

## Phase 5: Accordion Sections

### 5A. Accordion Headers
```css
.accordion-section .accordion-header {
    background: var(--surface-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--fg-primary);
    font-family: var(--font-body);
    font-weight: 600;
}
.accordion-section .accordion-header:hover {
    background: var(--canvas-subtle);
}
.accordion-section.open .accordion-header {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-color: var(--border-default);
}
```

### 5B. Accordion Bodies
```css
.accordion-section .accordion-body {
    background: var(--surface-primary);
    border: 1px solid var(--border-subtle);
    border-top: none;
    border-bottom-left-radius: var(--radius-md);
    border-bottom-right-radius: var(--radius-md);
}
```

### 5C. Accordion Arrow
- SVG chevron using `icon('chevron-down')` (or CSS transform rotate)
- Color: `var(--fg-tertiary)` → `var(--fg-primary)` on open

### 5D. Summary Text in Headers
- Count badges: `background: var(--canvas-inset); color: var(--fg-secondary)`
- Quick summary values: `color: var(--fg-secondary); font-family: var(--font-mono)`

### Validation Gate
- Accordions look like clean white cards that expand
- Smooth open/close animation preserved (0.35s cubic-bezier)
- Headers have subtle hover effect
- Arrow rotates on open (preserved)

---

## Phase 6: Input Controls & Forms

### 6A. Standard Inputs
```css
input[type="time"], input[type="number"], select {
    background: var(--canvas-subtle);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    color: var(--fg-primary);
    font-family: var(--font-body);
    font-size: 1em;
    min-height: 44px;  /* Preserve accessibility */
}
input:focus, select:focus {
    border-color: var(--control-border-focus);
    box-shadow: 0 0 0 3px var(--control-ring);
    outline: none;
}
```

### 6B. Buttons
| Variant | Background | Border | Color |
|---------|-----------|--------|-------|
| Primary | `var(--accent)` | none | `var(--accent-fg)` |
| Secondary | `var(--surface-primary)` | `var(--border-default)` | `var(--fg-secondary)` |
| Danger | `var(--destructive-light)` | `var(--destructive)` | `var(--destructive)` |
| Ghost | transparent | none | `var(--fg-secondary)` |
| Add (.add-btn) | transparent | dashed `var(--accent)` | `var(--accent)` |

- Remove all `linear-gradient` backgrounds on buttons (use solid colors)
- Hover: darken slightly or add subtle shadow
- Active: `transform: scale(0.98)` preserved

### 6C. Medication Entries
- `.med-entry` background: `var(--canvas-subtle)` (not dark)
- Remove button: `color: var(--destructive)` on hover, ghost style default
- Date input today color: `var(--status-safe)` (green)
- Date input past color: `var(--status-caution)` (amber)

### 6D. Caffeine Entries
- Same pattern as med entries
- Sip part entries: `background: var(--accent-lighter); border-color: var(--accent-light)`
- Sip badge: `color: var(--accent)`

### 6E. Modifier Toggles
- `.modifier-item`: `background: var(--surface-primary); border: 1px solid var(--border-default)`
- `.modifier-item.active`: `background: var(--success-light); border-color: var(--success)`
- `.modifier-item.negative.active`: `background: var(--destructive-light); border-color: var(--destructive)`
- Checkbox: `var(--accent)` when checked (olive checkmark)

### Validation Gate
- All inputs are cream-background with warm brown text
- Focus rings are olive-tinted (not blue)
- Buttons use olive accent (primary) or warm neutrals (secondary)
- Modifier items are clean white cards with green/red active states
- iOS: 16px font size preserved (no zoom trigger)
- Touch targets: 44px minimum preserved

---

## Phase 7: Graph & Canvas Visualization

### 7A. Graph Background & Grid
```javascript
// graph.js — update drawGraph()
// Grid lines: use warm neutral
ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';  // was rgba(255,255,255,0.1)

// Y-axis labels
ctx.fillStyle = '#9C948B';  // var(--fg-tertiary) equivalent
ctx.font = '11px Inter, sans-serif';  // was sans-serif

// X-axis time labels
ctx.fillStyle = '#9C948B';
ctx.font = '11px Inter, sans-serif';
```

### 7B. Zone Bands
```javascript
// Forbidden Zone
ctx.fillStyle = 'rgba(184, 92, 92, 0.08)';   // warm red, lighter for cream bg
ctx.fillText('FORBIDDEN ZONE');
ctx.fillStyle = 'rgba(184, 92, 92, 0.5)';

// Sleep Gate
ctx.fillStyle = 'rgba(94, 138, 94, 0.08)';    // warm green
ctx.fillText('SLEEP GATE');
ctx.fillStyle = 'rgba(94, 138, 94, 0.5)';
```

### 7C. Drug Curves & Threshold
```javascript
// Amphetamine line: warm teal-blue
ctx.strokeStyle = '#4A7C9B';
// Amphetamine fill (blockade shading)
ctx.fillStyle = 'rgba(74, 124, 155, 0.12)';

// Caffeine line: warm amber
ctx.strokeStyle = '#C4923A';

// Threshold line: warm red, dashed
ctx.strokeStyle = '#B85C5C';
ctx.setLineDash([5, 5]);

// Threshold label
ctx.fillStyle = '#B85C5C';
ctx.font = '10px Inter, sans-serif';
```

### 7D. Graph Container
```css
.graph-container {
    background: var(--surface-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    /* Canvas draws on white background now */
}
```

### 7E. Graph Tooltip
```css
.graph-tooltip {
    background: var(--surface-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-lg);
    color: var(--fg-primary);
}
```

### 7F. Legend
- Amp dot: `#4A7C9B` (warm teal-blue)
- Caffeine dot: `#C4923A` (warm amber)
- Threshold: `#B85C5C` (warm red)

### Validation Gate
- Graph is readable on white/cream background
- Forbidden zone is warm pink tint (not neon red)
- Sleep gate is warm green tint
- Drug curves are distinguishable (blue vs amber)
- Threshold line is clearly red (dashed)
- Grid lines are very subtle (nearly invisible)
- All fonts are Inter

---

## Phase 8: Sleep Intelligence Dashboard

### 8A. Tab Navigation
```css
.si-tabs {
    background: var(--canvas-inset);
    border-radius: var(--radius-md);
    padding: 3px;
}
.si-tab {
    color: var(--fg-tertiary);
    font-family: var(--font-body);
    font-weight: 500;
    border-radius: var(--radius-sm);
}
.si-tab:hover {
    color: var(--fg-secondary);
    background: var(--canvas-subtle);
}
.si-tab.active {
    background: var(--surface-primary);
    color: var(--fg-primary);
    box-shadow: var(--shadow-sm);
    /* Remove purple #8b5cf6 — use white card on inset bg instead */
}
```

### 8B. Calendar Grid Day Status Colors
Map the 8 statuses to warm palette:
| Status | Old Color | New Color | CSS Variable |
|--------|-----------|-----------|-------------|
| `great` | Bright green | `var(--status-safe)` #5E8A5E | `--cal-great` |
| `good` | Blue | `var(--info)` #5E7A8A | `--cal-good` |
| `ok` | Yellow | `var(--status-caution)` #C4923A | `--cal-ok` |
| `poor` | Red | `var(--status-danger)` #B85C5C | `--cal-poor` |
| `critical` | Dark red | `var(--status-blocking)` #994444 | `--cal-critical` |
| `allnighter` | Maroon | `#7A3B3B` (deep warm red) | `--cal-allnighter` |
| `no_data` | Gray | `var(--fg-muted)` #C4BCB3 | `--cal-nodata` |
| `today` | Ring shadow | `2px solid var(--accent)` | — |

### 8C. Insight Sections
- `.ins-section` header: `background: var(--canvas-subtle); color: var(--fg-primary)`
- `.ins-metric-row`: `border-bottom: 1px solid var(--border-subtle)`
- `.ins-bucket-bar`: use warm accent for fill, canvas-inset for track
- `.ins-table`: `background: var(--surface-primary)`, sticky header `var(--canvas-subtle)`, hover `var(--canvas-subtle)`

### 8D. Accuracy Tab
- Hero accuracy grade: large Source Serif font, color coded (safe/caution/danger)
- Methodology sections: clean white cards with subtle borders
- Error distribution bars: warm semantic colors

### Validation Gate
- Tabs are white-on-inset (not purple-on-dark)
- Calendar days have warm colors (sage green, amber, warm red)
- Insight sections are clean, readable on light background
- Tables have subtle striping/hover

---

## Phase 9: Modals & Overlays

### 9A. Modal Overlay
```css
.modal-overlay {
    background: rgba(0, 0, 0, 0.3);  /* Lighter than current 0.8 */
}
.modal-content {
    background: var(--surface-primary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-overlay);
    color: var(--fg-primary);
}
```

### 9B. Sleep Edit Modal
- Input styling matches Phase 6 controls
- Quick buttons (All-Nighter, Clear): ghost style with warm semantics
- Save button: `var(--accent)` primary
- Cancel button: secondary style

### 9C. Day Detail Modal
- Header: `font-family: var(--font-heading); color: var(--fg-primary)`
- Close button: ghost, `var(--fg-tertiary)` → `var(--fg-primary)` on hover
- Content: standard body text styling

### 9D. Feedback Modal
- Same modal shell as above
- Input fields: Phase 6 styling
- Emoji time buttons: replace with `var(--accent)` styled pills

### 9E. JS Custom Modals (state.js)
Update `showCustomAlert()` and `showCustomConfirm()`:
```javascript
// Modal overlay: rgba(0,0,0,0.3)
// Container: background var(--surface-primary) equivalent: #FFFFFF
// Title: color var(--fg-primary): #2C2825
// Text: color var(--fg-secondary): #6B635B
// Primary button: background var(--accent): #6B7C5E
// Cancel button: background transparent, border var(--border-default)
```

### 9F. Sync Conflict Modal (firebase-sync.js)
Update `showSyncConflictModal()`:
- Overlay: `rgba(0,0,0,0.3)`
- Container: `#FFFFFF` (white)
- Heading: `var(--warning)` #C4923A (warm amber, not orange)
- Local device box: `var(--canvas-subtle)` background, `var(--info)` text
- Cloud box: `var(--canvas-subtle)` background, `var(--accent)` text
- "Keep This Device" button: `var(--accent)` background (olive)
- "Keep Cloud" button: `var(--info)` #5E7A8A background
- "Try to Merge" button: `var(--surface-primary)` background, `var(--border-default)` border

### Validation Gate
- Modals are white on semi-transparent backdrop (not dark on dark)
- All modal text is readable
- Button hierarchy is clear (primary olive, secondary neutral)
- Sync conflict modal is clearly readable with warm colors

---

## Phase 10: JS Inline Color Updates (40+ Touchpoints)

### 10A. firebase-sync.js — `updateSyncStatus()`
| Status | Old Icon Color | New Icon Color | Old Text Color | New Text Color |
|--------|---------------|---------------|---------------|----------------|
| connected | `#10b981` | `#5E8A5E` (success) | `#86efac` | `#5E8A5E` |
| syncing | `#60a5fa` | `#5E7A8A` (info) | `#93c5fd` | `#5E7A8A` |
| offline | `#ef4444` | `#B85C5C` (destructive) | `#fca5a5` | `#B85C5C` |
| error | `#f59e0b` | `#C4923A` (warning) | `#fcd34d` | `#C4923A` |
| default | `#8b949e` | `#9C948B` (tertiary) | `white` | `#6B635B` (secondary) |

### 10B. med-caffeine.js — Stacking Warnings
- High dose header: `#f59e0b` → `#C4923A`
- High dose bg: `rgba(245,158,11,0.1)` → `rgba(196,146,58,0.08)`
- High-risk header: `#ef4444` → `#B85C5C`
- High-risk bg: `rgba(239,68,68,0.15)` → `rgba(184,92,92,0.08)`
- High-risk alert: `#fca5a5` → `#B85C5C`
- Moderate stacking: same warm amber as high dose

### 10C. med-caffeine.js — Date Input Colors
- Today: `#10b981` → `#5E8A5E`
- Past: `#f59e0b` → `#C4923A`
- Background: `#161b22` → `#FAF8F5` (canvas) or `#F5F2ED` (canvas-subtle)
- Border: `#30363d` → `rgba(0,0,0,0.12)`
- Sip entries: `rgba(139,92,246,0.1)` → `rgba(107,124,94,0.08)` (accent-based)
- Sip badge: `#a78bfa` → `#6B7C5E` (accent)

### 10D. ui-sections.js — Nicotine Buttons
- Vape selected: `linear-gradient(135deg, #ef4444, #dc2626)` → `background: #B85C5C` (solid warm red)
- Pouch selected: `linear-gradient(135deg, #10b981, #059669)` → `background: #5E8A5E` (solid warm green)
- Deselected: `linear-gradient(135deg, #6b7280, #4b5563)` → `background: var(--canvas-inset)` equivalent

### 10E. ui-sections.js — Level Colors
- HIGH: `#f87171` → `#B85C5C`
- MODERATE: `#f59e0b` → `#C4923A`
- LOW: `#10b981` → `#5E8A5E`
- MINIMAL: `#10b981` → `#5E8A5E`

### 10F. init.js — Hero Display Colors
- Hyperarousal alert bg: `rgba(239,68,68,0.1)` → `rgba(184,92,92,0.06)`
- Hyperarousal text: `#ef4444` → `#B85C5C`
- Action item box: `rgba(239,68,68,0.2)` → `rgba(184,92,92,0.10)`
- Sleep deficit: `#f59e0b` → `#C4923A`
- No deficit: `#10b981` → `#5E8A5E`
- No data: `#6e7681` → `#9C948B`

### 10G. init.js — Sleep Quality Indicators
- Green class message: `#5E8A5E` (warm green)
- Yellow class message: `#C4923A` (warm amber)
- Red class message: `#B85C5C` (warm red)

### 10H. history-calendar.js — Calendar Status Colors
Update all inline color assignments to use warm palette values (matching Phase 8B calendar mapping).

### 10I. Emoji Replacement
Replace status emoji with `icon()` calls or text:
- `🟢` → `icon('check-circle')` or colored dot span
- `🔄` → `icon('refresh-cw')`
- `🔴` → `icon('alert-circle')` or colored dot span
- `⚠️` → `icon('alert-triangle')`
- `⏳` → `icon('clock')`
- `🚨` → `icon('alert-triangle')` (red)
- `📱` → `icon('smartphone')` or text "This Device"
- `☁️` → `icon('cloud')` or text "Cloud"
- Toast emoji (📥 ✅ ❌): → `icon('download')`, `icon('check-circle')`, `icon('x')`
- Checkpoint buttons (💾 📂 ☁️⬆️ ☁️⬇️): → `icon('save')`, `icon('folder-open')`, `icon('upload')`, `icon('download')`

### Validation Gate
- Run through every JS file with `grep -n '#[0-9a-f]'` — no old neon colors remaining
- Run through every JS file with `grep -n 'rgba('` — all updated to warm palette
- Emoji count should be near zero (some may remain in educational tooltip content — that's OK)
- All status messages readable on light background

---

## Phase 11: Recommendations & Forecast Sections

### 11A. Recommendation Cards
```css
.recommendation {
    background: var(--surface-primary);
    border-left: 4px solid;
    border-radius: var(--radius-sm);
    padding: 16px;
}
.recommendation.warning {
    border-left-color: var(--warning);
    background: var(--warning-light);
}
.recommendation.danger {
    border-left-color: var(--destructive);
    background: var(--destructive-light);
}
.recommendation.success {
    border-left-color: var(--success);
    background: var(--success-light);
}
```

### 11B. What-If Scenario Cards
- Background: `var(--surface-primary)` with `var(--border-subtle)` border
- Hover: `var(--canvas-subtle)` + slight translateY
- Active scenario: `var(--accent-light)` background, `var(--accent)` border
- Delta labels: positive=`var(--success)`, negative=`var(--destructive)`, neutral=`var(--fg-tertiary)`

### 11C. Forecast Logic Display
- Code/monospace text: `font-family: var(--font-mono); background: var(--canvas-inset)`
- Section dividers: `var(--border-subtle)`

### 11D. Settings Panel
- Toggle controls: `var(--surface-primary)` background
- Dropdowns: Phase 6 input styling
- Section headers: `var(--font-body); font-weight: 600; color: var(--fg-primary)`

### Validation Gate
- Recommendations have warm tinted backgrounds (not neon overlays)
- What-if cards are clean, white, interactive
- Settings look like a proper form (not dark panel)

---

## Phase 12: Polish & Mobile

### 12A. Toast Notifications
```css
#toast {
    background: var(--surface-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    color: var(--fg-primary);
}
```

### 12B. Tooltip System
- Background: `var(--surface-primary)` (white) — NOT dark gradient
- Border: `var(--border-default)`
- Shadow: `var(--shadow-lg)`
- Label text: `var(--warning)` (warm amber, matches dental quest)
- Highlight box border: `var(--accent)` (olive)

### 12C. Scrollbar Styling
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--canvas-subtle); }
::-webkit-scrollbar-thumb { background: var(--fg-muted); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--fg-tertiary); }
```

### 12D. Loading States
- Spinner: `border-color: var(--border-default); border-top-color: var(--accent)`
- Loading overlay: `var(--canvas)` with `opacity: 0.8`

### 12E. Responsive Preservation
Verify ALL existing breakpoints still work:
- `@900px`: Grid column collapse
- `@600px`: Countdown size, med-entry wrap, modifier grid
- `@500px`: Hero time shrink, accordion compact
- `@380px`: What-if 3→2 columns

### 12F. Mobile-Specific
- Keep `font-size: 16px` on inputs (iOS zoom prevention)
- Keep `min-height: 44px` on interactive elements
- Keep `touch-action: manipulation` on entries
- Keep `-webkit-overflow-scrolling: touch` on scrollable containers
- Verify status pills horizontal scroll works on light theme

### 12G. Animation Audit
- Verify all transitions use warm-appropriate timing (150-250ms ease-out)
- Hero pulse: soften (reduce opacity range, slower)
- Accordion: keep existing cubic-bezier (proven smooth)
- Tab fade: keep existing (0.25s ease)

### 12H. Checkpoint Control Buttons
Replace emoji buttons with `icon()` SVG calls in HTML:
- 💾 → `icon('save', 14)` (Create checkpoint)
- 📂 → `icon('folder-open', 14)` (Restore)
- ☁️⬆️ → `icon('upload', 14)` (Force upload)
- ☁️⬇️ → `icon('download', 14)` (Force pull)

### Validation Gate (FINAL)
- [ ] Zero neon/bright colors remaining in CSS
- [ ] Zero hardcoded dark theme colors (#1a1a2e, #161b22, #21262d, #30363d) in CSS
- [ ] Zero neon colors in JS files (grep all 10 modules)
- [ ] All emoji replaced with icon() calls (except educational content)
- [ ] Brace balance check: `python3 -c "c=open('file').read(); print(c.count('{'), c.count('}'))"`
- [ ] All save guards intact (5 guards in both save functions)
- [ ] `recalculate()` pipeline untouched
- [ ] `isEmptyState()` untouched
- [ ] Checkpoint system works
- [ ] Firebase sync status displays correctly
- [ ] Graph renders correctly on white canvas
- [ ] Calendar day colors are distinguishable
- [ ] All modals open/close properly
- [ ] All accordion sections expand/collapse
- [ ] Mobile: all breakpoints working
- [ ] Mobile: iOS zoom prevention intact (16px font on inputs)
- [ ] Mobile: touch targets ≥44px
- [ ] Fonts load (Inter + Source Serif 4)
- [ ] No console errors

---

## Execution Strategy

### Recommended Approach: 3-4 Agent Team, Sequential Phases with Parallel Sub-tasks

Based on the dental quest redesign lessons:

1. **Work on a branch**: `git checkout -b redesign/stim-calc-warm`
2. **One commit per phase** (enables bisect if bugs found)
3. **Validation gate after each phase** before proceeding

### Agent Allocation (When Executing)
| Agent | Responsibility | Phases |
|-------|---------------|--------|
| **css-lead** | All CSS changes in stimulant-elimination-calculator.html | 0-6, 8, 11-12 |
| **js-updater-1** | state.js (icon helper) + init.js + graph.js colors | 0C, 7, 10F-G |
| **js-updater-2** | firebase-sync.js + med-caffeine.js + ui-sections.js colors | 10A-E, 9E-F |
| **js-updater-3** | history-calendar.js colors + emoji replacement across all files | 8B (JS), 10H-I |
| **validator** | Runs validation gates after each phase, checks brace balance, save guards | All phases |

### Estimated Effort
- Phase 0 (Token Foundation): ~15 min
- Phase 1-2 (Body + Containers): ~30 min
- Phase 3-4 (Nav + Hero): ~20 min
- Phase 5-6 (Accordion + Forms): ~30 min
- Phase 7 (Graph): ~20 min
- Phase 8 (Sleep Intelligence): ~25 min
- Phase 9 (Modals): ~20 min
- Phase 10 (JS Colors): ~40 min (largest phase — 40+ touchpoints)
- Phase 11 (Recommendations): ~15 min
- Phase 12 (Polish): ~25 min
- **Total: ~4 hours of focused work**

### Risk Mitigation
1. **Branch-based**: All work on `redesign/stim-calc-warm`, main stays clean
2. **CSS-first, JS-second**: CSS changes are safest (can't break logic). JS color changes come later.
3. **Pure math modules untouched**: circadian.js, pharma-engine.js, sleep-prediction.js have ZERO edits
4. **Graph tested separately**: Canvas rendering on white bg needs visual verification
5. **Save guards verified**: After JS changes, explicitly verify all 5 guards in both save functions

---

## Color Mapping Cheat Sheet

| Old (Dark Theme) | New (Warm Clinical) | Usage |
|-------------------|-------------------|-------|
| `#1a1a2e` / `#16213e` / `#0f3460` | `#FAF8F5` (canvas) | Body background |
| `rgba(255,255,255,0.06)` | `#FFFFFF` (surface) | Card backgrounds |
| `rgba(255,255,255,0.1)` | `rgba(0,0,0,0.08)` (border) | Borders |
| `#e6edf3` | `#2C2825` (fg-primary) | Primary text |
| `#b0b8c4` | `#6B635B` (fg-secondary) | Secondary text |
| `#9ca3af` / `#8b949e` | `#9C948B` (fg-tertiary) | Muted text |
| `#58a6ff` | `#6B7C5E` (accent) | Interactive/focus |
| `#8b5cf6` / `#a78bfa` | `#6B7C5E` (accent) | Purple → olive |
| `#3b82f6` | `#4A7C9B` (graph-amp) | Amp line |
| `#f59e0b` | `#C4923A` (warning) | Warnings/caff |
| `#ef4444` | `#B85C5C` (destructive) | Danger/threshold |
| `#10b981` | `#5E8A5E` (success) | Success/safe |
| `#161b22` / `#21262d` | `#F5F2ED` (canvas-subtle) | Dark surfaces → cream |
| `#30363d` | `rgba(0,0,0,0.08)` | Dark borders → light |
| `rgba(0,0,0,0.7-0.8)` | `rgba(0,0,0,0.3)` | Modal overlays (lighter) |

---

## Files Quick Reference

```
stimulant-elimination-calculator.html    ← CSS: Phases 0-6, 8, 11-12
js/stimcalc/state.js                     ← Phase 0C (icon helper), Phase 9E (custom modals)
js/stimcalc/firebase-sync.js             ← Phase 10A (sync status), Phase 9F (conflict modal)
js/stimcalc/med-caffeine.js              ← Phase 10B-C (stacking warnings, date colors)
js/stimcalc/ui-sections.js               ← Phase 10D-E (nicotine, level colors)
js/stimcalc/history-calendar.js          ← Phase 8B JS, Phase 10H (calendar colors)
js/stimcalc/graph.js                     ← Phase 7 (canvas rendering)
js/stimcalc/init.js                      ← Phase 10F-G (hero, sleep quality)
js/stimcalc/circadian.js                 ← NO CHANGES (pure math)
js/stimcalc/pharma-engine.js             ← NO CHANGES (pure math)
js/stimcalc/sleep-prediction.js          ← NO CHANGES (pure math)
```
