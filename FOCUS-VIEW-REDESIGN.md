# Focus View UI/UX Redesign — Master Plan

> Compiled 2026-02-09 | All 5 agent deliverables merged

---

## Design Philosophy

Transform Focus View from "functional but basic" to "polished and delightful" by adopting patterns from Linear, Notion, Sunsama, Todoist, and Akiflow. The redesign focuses on:

1. **Restraint** — Color used sparingly; accent reserved for interactive elements
2. **Consistent rhythm** — 4px spacing grid, 3 border-radius values, 5 shadow levels
3. **Subtle depth** — Barely-visible borders, slight background shifts on hover, minimal shadows
4. **Purposeful animations** — Every animation has a reason (acknowledge, reward, orient)
5. **Progressive disclosure** — Action buttons hidden until hover, reducing visual noise
6. **Dark mode done right** — Multiple surface layers, off-white text, rgba borders

---

## Color Palette

### Backgrounds (darkest → lightest)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-page` | `#0f172a` | Page background (existing) |
| `--bg-card` | `#1e293b` | Cards, panels (existing) |
| `--bg-card-hover` | `#334155` | Hover states (existing) |
| `--bg-elevated` | `#1C1D21` | Modals, popovers |
| `--bg-active` | `#2E3039` | Active/pressed states |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#f1f5f9` | Headings, primary content (existing) |
| `--text-secondary` | `#94a3b8` | Labels, descriptions (existing) |
| `--text-muted` | `#64748b` | Placeholders, timestamps (existing) |

### Accents (existing, preserved)
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-blue` | `#3b82f6` | Primary actions, active states |
| `--accent-green` | `#22c55e` | Success, completion |
| `--accent-amber` | `#f59e0b` | LOCKED IN, warnings, NOW |
| `--accent-teal` | `#14b8a6` | TOMORROW, scheduled |
| `--accent-red` | `#ef4444` | Errors, overdue |

### New Accents
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-purple` | `#8b5cf6` | Wind-down, gradients |
| `--accent-indigo` | `#6366f1` | Sleep zone, secondary accent |
| `--gam-gold` | `#fbbf24` | Perfect day, 100% progress |

### Borders
| Token | Value |
|-------|-------|
| `--border` | `#334155` (existing) |
| `--border-hover` | `#475569` (existing) |
| `--border-accent` | `rgba(59, 130, 246, 0.4)` |

---

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page titles | System sans-serif | 22px | 700 |
| Section headers | System sans-serif | 12-14px uppercase | 700 |
| Body text | System sans-serif | 13-14px | 400-500 |
| Task names | System sans-serif | 13px | 500 |
| Timer digits | SF Mono / monospace | 3.5-4em | 700 |
| Time labels | SF Mono / monospace | 11-13px | 600-700 |
| Badges/pills | System sans-serif | 11px | 600-700 |
| XP numbers | System sans-serif | 1.1em | 700 |

---

## Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-text gaps, inline margins |
| sm | 6-8px | Badge padding, list item gaps |
| md | 10-14px | Card padding, section gaps |
| lg | 16-20px | Card inner padding, progress gaps |
| xl | 24-32px | Section separators |
| 2xl | 40-48px | Page-level padding |

---

## Shadow / Elevation

```
Level 0: none (flat surfaces)
Level 1: 0 1px 3px rgba(0,0,0,0.15) — cards at rest
Level 2: 0 2px 8px rgba(0,0,0,0.2) — hovered cards
Level 3: 0 8px 24px rgba(0,0,0,0.3) — dragging, modals
Level 4: 0 8px 32px rgba(0,0,0,0.5) — toasts
Accent glow: 0 0 12px rgba(accent, 0.3-0.4) — active elements
```

---

## Border Radius

| Element | Value |
|---------|-------|
| Buttons, badges, inputs | 6-8px |
| Task cards, dropdowns | 8-10px |
| Column containers, sections | 10-12px |
| Modals, session cards | 14-24px |
| Pills, progress bars | 9999px (full) |

---

## Component Designs

### Tab Navigation
- Bottom accent indicator (3px bar, scaleX animation)
- Active tab: subtle blue tint background + glow shadow
- Hover: background shift, text brightens
- Smooth 250ms transitions

### TRIAGE Tab (13 improvements)
1. **Column containers** — Subtle gradient backgrounds per tier (amber/blue/teal tint)
2. **Column headers** — Tier-colored names, text-shadow on LOCKED IN, improved count badges
3. **Task cards** — Hover lift (translateY -1px + shadow), tier-specific left borders, reveal-on-hover action buttons
4. **Checkboxes** — Scale on hover, pop animation on check
5. **Progress bar** — Shimmer animation on fill gradient
6. **Empty states** — Dashed borders, tier-specific colors, hover feedback
7. **Drag & drop** — Rotate+scale on dragging, glow on drop zones
8. **Scheduled section** — Time badge pills (monospace, teal background)
9. **Rolled over section** — Amber gradient background, subtle pulse animation
10. **Quick add** — Focus ring glow, hover elevation on buttons
11. **Mini progress bars** — Per-column gradient fills, smoother easing
12. **Drag handle** — Fades in on hover (0.3 → 0.8 opacity)
13. **Touch fallback** — `@media (hover: none)` keeps buttons visible

### CRASH OUT Tab (10 improvements)
1. **Sleep setup** — Moon icon with pulsing ring, "Set Your Crash Time" messaging, hover-lift option cards with distinct color accents per option
2. **Vertical rail** — Gradient line (amber→blue→purple) connecting all timeline entries
3. **NOW marker** — Pulsing amber glow, arrow pointer, animated box-shadow
4. **Task rows** — Reorder buttons hidden by default, revealed on hover; duration as pill badge; start button with glow; edit/remove fade in on hover
5. **Wind-down block** — Purple/indigo theme, diagonal stripe texture, moon icon, distinct from task cards
6. **Sleep marker** — Purple gradient background, breathing emoji animation
7. **Progress bar** — 3-state color (green→amber→red based on buffer)
8. **Unscheduled pool** — Count badge in amber, hover-lift cards
9. **Elapsed tasks** — Dimmed (45% opacity), distinct from future tasks
10. **Active task** — Amber glow border for currently-in-progress slot

### FOCUS Tab (9 improvements)
1. **Timer circle** — 300-340px SVG with gradient strokes (green→yellow→red), gaussian blur glow filter
2. **Timer digits** — 3.5-4em monospace, breathing animation while running, PAUSED label
3. **Task header** — Task name + tier badge ABOVE the timer (the "why" before the "how long")
4. **Controls** — Circular play/pause (56px), +5/-5 pill adjust buttons, press feedback
5. **Duration toggle** — 15m/25m/50m pill buttons
6. **Checklist** — Custom CSS checkboxes with animated checkmark (stroke-dashoffset), delete hidden until hover
7. **Action buttons** — Green "COMPLETE TASK" primary, outline "Skip", ghost "Exit"
8. **Completion modal** — Backdrop blur, slide-up animation, CSS confetti (40 particles), XP float, bouncing emoji, rotating messages
9. **Empty state** — Pulsing ring icon, "Ready to focus?" copy, gradient CTA button

### Gamification Elements (7 systems)
1. **XP display** — Level badge (500 XP per level), animated counter pop, floating "+50 XP" text, level-up celebration overlay
2. **Streaks** — Fire icon with 4 intensity tiers (cold/warm/hot/blazing), animated flicker, at-risk warning after 9 PM
3. **Progress ring** — SVG donut chart, milestone dots at 25/50/75%, color transitions (blue→green→gold), celebration triggers at each milestone
4. **Task completion** — 12 rotating encouragement messages, screen pulse, enhanced confetti
5. **Idle nudges** — Dark theme redesign, slide-in from bottom, progress reminder included
6. **Toast notifications** — Dark theme with colored borders per category
7. **Perfect day** — Full-screen overlay, trophy with glow ring, stats summary

---

## Animation Specifications

### Durations
| Type | Duration | Usage |
|------|----------|-------|
| Instant | 50ms | Color changes |
| Quick | 100-150ms | Hover states, button feedback |
| Standard | 200-250ms | Dropdown, accordion, tab switch |
| Smooth | 300-400ms | Modal appear, slide-in |
| Celebration | 500-800ms | XP gain, level-up |
| Dramatic | 1.5-2s | Perfect day, confetti |

### Easing
```css
Hover/general: cubic-bezier(0.4, 0, 0.2, 1)  /* Material standard */
Bouncy:        cubic-bezier(0.34, 1.56, 0.64, 1) /* Celebrations */
Snappy:        cubic-bezier(0.16, 1, 0.3, 1)   /* Slide-ins */
Spring:        cubic-bezier(0.22, 1.2, 0.36, 1) /* Playful */
```

### All @keyframes (38 total)

**Triage (3):** progressShimmer, checkPop, subtlePulse

**Crash Out (4):** setupRingPulse, nowPulse, sleepBreathe, cascadeShift (existing)

**Focus (13):** focusGlowPulse, focusDigitBreathe, focusPausedBlink, focusCheckPop, focusEmptyPulse, focusOverlayIn, focusCardSlideUp, focusFlashPulse, focusCelebBounce, focusXpFloat, focusConfettiFall, focusConfettiSway, focusBtnPress

**Gamification (18):** xpFloat, xpCounterPop, levelBadgePulse, levelUpPop, fireFlickerSubtle, fireFlickerMedium, fireFlickerIntense, streakRiskPulse, streakMilestone, milestonePulse, completionMessagePop, screenPulse, confettiFallEnhanced, taskCardFlash, slideInBottom, perfectDayFlash, badgePopEnhanced, trophyBounce, glowPulse

---

## Implementation Order

### Phase 1: Foundation (Global CSS)
- Add new CSS variables to `:root` block (~line 5451)
- Add all @keyframes blocks
- Update toast notification styles (dark theme)
- Consolidate duplicate confetti CSS

### Phase 2: Tab Navigation
- Update `.cc-mode-tab` with bottom accent indicator
- Add hover and active state transitions

### Phase 3: Triage Tab
- Column containers (gradient backgrounds)
- Column headers (tier-colored names)
- Task cards (hover lift, tier borders, button reveal)
- Progress bar (shimmer)
- Empty states (dashed borders)
- Drag & drop feedback
- Scheduled/rolled over sections
- Quick add section

### Phase 4: Crash Out Tab
- Sleep setup screen overhaul (HTML + CSS)
- Vertical timeline rail
- NOW marker with pulse
- Task row hover-reveal
- Wind-down block (purple theme)
- Sleep marker
- Progress bar (3-state)
- Unscheduled pool
- Elapsed/active task states (minimal JS)

### Phase 5: Focus Tab
- Timer circle SVG (320px, gradients, glow)
- Timer display (larger, breathing)
- Task header above timer (HTML restructure)
- Controls (circular, +5/-5)
- Duration toggle pills
- Checklist (custom checkboxes)
- Action buttons (visual hierarchy)
- Completion modal (confetti, slide-up)
- Empty state
- Timer color transition (minimal JS)

### Phase 6: Gamification
- XP display (level badge, counter pop, float)
- Streak badge (fire tiers)
- Progress ring (SVG donut)
- Completion messages
- Idle nudge dark theme
- Perfect day celebration

### Phase 7: Polish & Testing
- Cross-tab consistency check
- Mobile responsive verification
- Animation performance audit
- Accessibility contrast check

---

## Estimated Scope

| Category | Lines Added | Lines Modified | Lines Removed |
|----------|-------------|----------------|---------------|
| CSS (new classes + keyframes) | ~1,800 | ~600 | ~50 (duplicates) |
| HTML structure changes | ~120 | ~80 | ~60 |
| JS (animation triggers only) | ~100 | ~30 | 0 |
| **Total** | **~2,020** | **~710** | **~110** |

---

## Files to Edit

All changes in **`/Users/suleman/dental-quest/index.html`** only.

### CSS Changes
| Line Range | Section | Change |
|-----------|---------|--------|
| 5451-5466 | `:root` variables | Add gamification + new color vars |
| 5507-5530 | Mode tabs | Replace with enhanced active state + bottom indicator |
| 5533-5554 | Greeting | Better typography, letter spacing |
| 5557-5600 | Overall progress | Shimmer effect, smoother transitions |
| 5603-5650 | Three columns | Gradient backgrounds, better shadows |
| 5652-5698 | Column headers | Tier colors, text-shadow, count badge |
| 5716-5757 | Task cards | Hover lift, tier borders |
| 5760-5768 | Checkbox | Scale, pop animation |
| 5770-5821 | Task buttons | Hidden by default, hover reveal |
| 5823-5880 | Scheduled/rolled over | Pulse, time badges |
| 5882-5950 | Quick add | Focus ring, button hover |
| 5953-5982 | Mini progress | Per-column gradients |
| 5984-5991 | Empty states | Dashed borders, tier colors |
| 5993-6071 | Sleep setup | Complete overhaul |
| 6076-6131 | Timeline header | Refined adjuster |
| 6133-6178 | Time summary | 3-state progress |
| 6208-6244 | Timeline + NOW | Vertical rail, pulsing NOW |
| 6246-6442 | Task rows + reorder | Hover-reveal actions |
| 6444-6506 | Wind-down + sleep | Purple theme |
| 6508-6602 | Unscheduled pool | Card redesign |
| 6768-6870 | Focus tab CSS | Timer, buttons, checklist overrides |
| 7000-7044 | Confetti + badge | Enhanced celebration |
| 7046-7060 | Drag & drop | Rotate, glow |
| 2431-2458 | Toast CSS | Dark theme |
| 932-952 | Duplicate confetti | Remove |
| After 7021 | NEW: Focus tab CSS block | ~600 lines |

### HTML Changes
| Line Range | Section | Change |
|-----------|---------|--------|
| 7232-7240 | XP stat card | Level badge + XP bar |
| ~7260 | After stats | Add streak badge |
| 7348-7355 | Progress section | SVG ring + milestones |
| 7466-7497 | Sleep setup | Moon icon, card redesign |
| 7551-7558 | Wind-down | Moon icon, label update |
| 7593-7598 | Focus empty state | Pulsing ring, better copy |
| 7603-7627 | Timer card | Task header above timer |
| 7607-7613 | Timer circle SVG | 320px with gradients + glow |
| 7630-7634 | Task info card | Remove (integrated above timer) |
| 7660-7667 | Action buttons | Visual hierarchy |
| 7671-7688 | Complete modal | Confetti, slide-up, XP float |

### JS Changes (animation triggers only — NO logic)
| Line | Function | Change |
|------|----------|--------|
| 16218 | `updateOverallProgress()` | Ring update, milestones, celebrations |
| 16471 | `toggleTaskComplete()` | `showCompletionMessage()` + screen pulse |
| 17049 | `showTimePrompt()` | Dark theme HTML template |
| 17556 | `renderCrashOutTimelineTasks()` | `.elapsed` / `.active-now` classes |
| 17467 | `renderCrashOutTimeline()` | `.tight` class on progress |
| 18222 | `updateFocusTimerDisplay()` | Timer color/state class toggles |
| 18334 | `showFocusCompleteModal()` | Confetti trigger, random message |
| 18445 | `renderFocusChecklist()` | Updated item template |
| 18505 | `awardCommandCenterXP()` | Float + counter pop + level check |
| 15528 | `updateStats()` | Level display update |
| 18536 | After `showCelebration` | New helper functions |
| 18594 | `showPerfectDayBadge()` | Enhanced celebration |
| 18643 | `updateStreaks()` | `updateStreakBadge()` call |

---

## Risk Assessment

### Breaking Changes: NONE
- All CSS changes are additive or replace existing styles
- HTML changes preserve all IDs and onclick handlers
- JS changes are additive (class toggles, DOM element creation)
- No data structure changes
- No save/load changes
- Firebase sync completely untouched

### Browser Compatibility
- CSS animations: All modern browsers (Chrome 80+, Safari 14+, Firefox 78+)
- SVG filters: Universal support
- `backdrop-filter: blur()`: Safari 9+, Chrome 76+, Firefox 103+
- `stroke-dashoffset`: Universal SVG support
- `@media (hover: none)`: Touch device fallback for hover-reveal buttons

### Performance
- All animations use `transform` and `opacity` (GPU-accelerated)
- No `width/height/top/left` animations
- Confetti: 40 particles max, auto-removed after animation
- `will-change` not needed (short-duration animations)
- CSS-only where possible, JS only for class toggles

---

## Test Checklist

### Functionality (must not break)
- [ ] All 3 tabs render correctly
- [ ] Tab switching works
- [ ] Task CRUD (create, complete, delete) works
- [ ] Drag & drop reordering works
- [ ] Crash Out timeline scheduling works
- [ ] Focus timer starts, pauses, resumes, completes
- [ ] XP awards correctly
- [ ] Streaks calculate correctly
- [ ] Data saves to localStorage + Firebase
- [ ] Force upload/pull still works
- [ ] Checkpoint system works

### Visual (new enhancements)
- [ ] Task cards lift on hover
- [ ] Action buttons appear on hover, always on touch
- [ ] Progress bar has shimmer animation
- [ ] NOW marker pulses
- [ ] Timer circle shows gradient + glow
- [ ] Timer color transitions (green→yellow→red)
- [ ] Completion confetti appears
- [ ] XP float text shows on gain
- [ ] Streak badge visible and updates
- [ ] Progress ring renders correctly
- [ ] Milestone celebrations trigger
- [ ] Toast is dark-themed

### Responsive
- [ ] Functional on mobile (zoom: 0.7)
- [ ] Timer scales down on small screens
- [ ] Touch devices: buttons always visible
- [ ] No horizontal overflow

### Performance
- [ ] No jank during animations
- [ ] No layout shift from timer digits (monospace)
- [ ] Confetti auto-cleans up
- [ ] No memory leaks from DOM elements

---

## Detailed Specs by Agent

Full specifications with line-by-line code are in:
- `UI-RESEARCH-FINDINGS.md` — Design system, patterns, CSS variables
- `TRIAGE-REDESIGN.md` — 13 CSS improvements with code
- `CRASHOUT-REDESIGN.md` — 10 proposals with code
- `FOCUS-REDESIGN.md` — 9 improvements, 13 keyframes, confetti system
- `GAMIFICATION-ENHANCEMENTS.md` — 7 systems, 18 keyframes, level system
