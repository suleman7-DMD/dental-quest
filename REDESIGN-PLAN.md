# Dental Quest UI Redesign Plan

**Goal**: Transform the dark purple gaming aesthetic into a warm, light, Synchro-inspired interface while preserving 100% of functionality.

**Scope**: index.html + 12 JS modules only. Other apps (d3-roadmap, body-comp, stim-calc) follow later using the same design system.

**Reference**: Synchro screenshot (warm cream/olive project management tool) + interface-design principles from Dammyjay93/interface-design.

---

## 1. Domain Exploration

### Who is this human?

Sully — a D3 dental student at BU Goldman. Opens this app on his phone at 7am with coffee, checking what needs to happen today. Or at 11pm, wrapping up, checking off what got done. ADHD brain that needs calm structure, not flashy stimulation. The app should feel like a tool that reduces cognitive load, not adds to it.

### What must they accomplish?

- See today's tasks at a glance
- Check off completed work
- Plan tomorrow (triage → crash out → focus)
- Track medications
- Monitor financial health
- Stay on streak (gamification)

### How should it feel?

**Clinical Warmth** — a clean productivity tool (like Linear/Notion) with the calm confidence of a well-designed modern dental practice and the comfort of a study nook. Not cold or sterile. Not flashy or gamified-looking. Professional, warm, grounding.

### Domain Concepts (5+)

1. **Treatment plan** — tasks organized like a patient's treatment sequence (triage → schedule → execute)
2. **Clinical calm** — the composed focus of a dental operatory
3. **Charting** — systematic recording, everything in its place
4. **Scrubs green** — the muted olive/sage of clinical attire
5. **Dental ceramic** — clean whites, subtle warmth, handcrafted precision
6. **Study desk** — warm wood, paper, organized stacks, morning coffee

### Color World (5+)

If Dental Quest were a physical space, you'd walk into:

1. **Cream walls** — warm white, not sterile (#FAF8F5, #F5F2ED)
2. **Light wood** — oak reception desk, birch shelving (#D4C5A9, #C2B280)
3. **Olive/sage** — scrub green, clinical calm (#6B7C5E, #8A9A7B)
4. **Stone gray** — countertops, instrument trays (#78716C, #A8A29E)
5. **Warm brown** — coffee, leather chair, wood trim (#92785C)
6. **Clean white** — card surfaces, dental white (#FFFFFF)
7. **Muted clay** — warm red for urgency, not alarming (#B85C5C)

### Signature Element

**The treatment plan progression** — the way tasks flow through Triage → Crash Out → Focus mirrors a dental treatment plan: assess, schedule, execute. The interface should feel like this progression — calm assessment view (Full View), structured scheduling (Triage/Crash Out), focused execution (Focus/Pomodoro). Each mode has a subtly different character but lives in the same warm system.

### Defaults to Reject

| Default | Replacement |
|---------|-------------|
| Dark purple gradient background | Warm cream canvas (#FAF8F5) |
| Glowing effects, backdrop-filter blur | Subtle shadows, surface color shifts |
| Emoji as status indicators (🔴💪🏆🔥💎) | Typography-driven hierarchy + olive accent color |

---

## 2. Design System (system.md)

### Direction

- **Personality**: Clinical Warmth (Warmth & Approachability meets Clean Project Tool)
- **Foundation**: Warm (stone/cream)
- **Depth**: Subtle shadows + surface color shifts

### Tokens

#### Colors (CSS Variables)

```css
:root {
  /* Canvas */
  --canvas: #FAF8F5;
  --canvas-subtle: #F5F2ED;
  --canvas-inset: #EFECE6;

  /* Surfaces */
  --surface-primary: #FFFFFF;
  --surface-elevated: #FFFFFF;
  --surface-overlay: #FFFFFF;

  /* Foreground (text hierarchy) */
  --fg-primary: #2C2825;
  --fg-secondary: #6B635B;
  --fg-tertiary: #9C948B;
  --fg-muted: #C4BCB3;

  /* Borders */
  --border-default: rgba(0, 0, 0, 0.08);
  --border-subtle: rgba(0, 0, 0, 0.05);
  --border-strong: rgba(0, 0, 0, 0.12);
  --border-focus: #8A9A7B;

  /* Accent (olive/sage) */
  --accent: #6B7C5E;
  --accent-hover: #5A6A4F;
  --accent-light: #E8EDE4;
  --accent-lighter: #F2F5F0;
  --accent-fg: #FFFFFF;

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

  /* Control-specific */
  --control-bg: #FFFFFF;
  --control-bg-hover: #F5F2ED;
  --control-border: rgba(0, 0, 0, 0.12);
  --control-border-focus: #8A9A7B;
  --control-ring: rgba(107, 124, 94, 0.25);
}
```

#### Spacing

- **Base**: 4px
- **Scale**: 4, 8, 12, 16, 20, 24, 32, 48, 64
- Micro: 4px (icon gaps, tight pairs)
- Component: 8-12px (within buttons, inputs)
- Section: 16-24px (between groups)
- Major: 32-48px (between distinct areas)

#### Typography

```css
/* Heading font — warm serif for personality */
--font-heading: 'Source Serif 4', 'Georgia', serif;

/* Body font — clean sans for readability */
--font-body: 'Inter', -apple-system, system-ui, sans-serif;

/* Data font — monospace for numbers */
--font-mono: 'SF Mono', 'Consolas', 'Monaco', monospace;

/* Scale */
--text-xs: 0.75rem;    /* 12px — metadata, timestamps */
--text-sm: 0.8125rem;  /* 13px — labels, secondary */
--text-base: 0.875rem; /* 14px — body text */
--text-md: 1rem;       /* 16px — prominent body */
--text-lg: 1.125rem;   /* 18px — section headers */
--text-xl: 1.5rem;     /* 24px — page titles */
--text-2xl: 2rem;      /* 32px — hero numbers */

/* Weights */
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

**Font loading** — add to `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
```

#### Border Radius

- **Small**: 6px (inputs, buttons, small chips)
- **Medium**: 8px (cards, panels)
- **Large**: 12px (modals, large containers)
- **Full**: 9999px (pills, badges)

#### Depth Strategy

**Subtle shadows + surface color shifts** (committed — no borders-only, no layered shadows):

- Cards: `--shadow-sm` + white on cream canvas
- Dropdowns/popovers: `--shadow-md` + white
- Modals: `--shadow-overlay` + white
- Sidebar: Same background as canvas, border separation (not different color)
- Inputs: Slightly inset (cream background, not white)

### Component Patterns

#### Button Primary
- Height: 36px
- Padding: 8px 16px
- Radius: 6px
- Font: 14px, 500 weight, Inter
- Background: var(--accent)
- Color: var(--accent-fg)
- Hover: var(--accent-hover)
- Shadow: none (borders-only for buttons)

#### Button Secondary
- Height: 36px
- Padding: 8px 16px
- Radius: 6px
- Font: 14px, 500 weight
- Background: transparent
- Border: 1px solid var(--border-default)
- Color: var(--fg-secondary)
- Hover: var(--canvas-subtle) background

#### Button Ghost
- Same as secondary but no border
- Hover: var(--canvas-subtle) background

#### Card
- Background: var(--surface-primary)
- Border: 1px solid var(--border-subtle)
- Padding: 16px
- Radius: 8px
- Shadow: var(--shadow-sm)

#### Task Item
- Background: var(--surface-primary)
- Border-bottom: 1px solid var(--border-subtle)
- Padding: 12px 16px
- No border-radius (list items, not cards)
- Hover: var(--canvas-subtle) background
- Checkbox: 16px circle, olive accent when checked
- Category: Small text label, var(--fg-tertiary)
- Task text: var(--fg-primary), 14px, 400 weight
- Size badge: Tiny pill, var(--canvas-inset) background

#### Stat Card (Full View)
- Background: var(--surface-primary)
- Border: 1px solid var(--border-subtle)
- Padding: 12px 16px
- Radius: 8px
- Number: var(--font-mono), var(--text-lg), var(--fg-primary)
- Label: var(--text-xs), var(--fg-tertiary), uppercase, letter-spacing: 0.5px
- No colored backgrounds (current has red/yellow/green tinted backgrounds)
- Clickable ones get hover: var(--canvas-subtle)

#### Input
- Height: 36px
- Background: var(--canvas-subtle)
- Border: 1px solid var(--border-default)
- Radius: 6px
- Padding: 8px 12px
- Focus: border-color var(--control-border-focus) + ring var(--control-ring)

#### Modal
- Background: var(--surface-overlay)
- Radius: 12px
- Shadow: var(--shadow-overlay)
- Backdrop: rgba(0, 0, 0, 0.3) (not 0.5)
- Header: var(--font-heading), var(--text-lg), var(--fg-primary)
- Close button: ghost button, top-right

#### Navigation (Cross-App)
- Sidebar or top bar with same background as canvas
- Active item: var(--accent-light) background, var(--accent) text
- Inactive: var(--fg-tertiary) text
- Hover: var(--canvas-subtle) background
- No emoji in nav items — text only

#### Tabs (Full View Category Tabs)
- Clean underline style (not pill/button tabs)
- Active: var(--fg-primary) text + 2px bottom border var(--accent)
- Inactive: var(--fg-tertiary) text
- Hover: var(--fg-secondary) text

---

## 3. Icon Strategy (Replacing Emoji)

### Approach: Inline SVG via Lucide Icons

**Why Lucide**: Free, MIT license, consistent 24px grid, 1000+ icons, works as inline SVG (no build system needed).

**CDN approach** — add to `<head>`:
```html
<script src="https://unpkg.com/lucide@latest"></script>
```

Then use: `<i data-lucide="check-circle"></i>` and call `lucide.createIcons()` in init.js.

**OR** — for zero external dependency, define a small SVG sprite of just the ~30 icons we need, inline in the HTML.

### Emoji → Icon Mapping

| Current Emoji | Context | Replacement |
|---------------|---------|-------------|
| 🦷 | App identity | Text "DQ" or small tooth SVG icon |
| 🔴 | "Do Today" urgency | Red dot (CSS `::before` pseudo-element) |
| 💪 | "Remaining" tasks | No icon needed — number + label sufficient |
| 🏆 | "Completed" tasks | No icon — number + label |
| 🔥 | Streak | Streak count in accent-colored pill |
| 💎 | XP Available | No icon — just the number |
| 💾 | Save/Checkpoint | `<i data-lucide="save">` |
| 📂 | Checkpoint manager | `<i data-lucide="folder-open">` |
| 🗑️ | Delete/Clear | `<i data-lucide="trash-2">` |
| 📓 | Notebook | `<i data-lucide="book-open">` |
| 📋 | Planner/Tasks | `<i data-lucide="clipboard-list">` |
| 📅 | Calendar | `<i data-lucide="calendar">` |
| 💰 | Financials | `<i data-lucide="wallet">` |
| 💊 | Medications/Sleep calc | `<i data-lucide="pill">` |
| ❓ | Help | `<i data-lucide="help-circle">` |
| 📚 | Roadmap | `<i data-lucide="graduation-cap">` |
| 🎯 | Focus mode | `<i data-lucide="target">` |
| ✅ | Success toast | `<i data-lucide="check-circle">` |
| ⏳ | Loading/Connecting | `<i data-lucide="loader">` |
| 🔄 | Sync | `<i data-lucide="refresh-cw">` |
| ⬆️ | Upload | `<i data-lucide="upload">` |
| ⬇️ | Download/Pull | `<i data-lucide="download">` |
| ✕ | Close | `<i data-lucide="x">` |
| ▼ | Expand | `<i data-lucide="chevron-down">` |
| 🎉 | Confetti/celebration | CSS animation (no icon) |
| 👑 | High leverage | Small crown SVG or accent-colored star |
| ⚡ | XP gain | No icon — just "+50 XP" text |

### Emoji in JS Modules (189 occurrences)

| File | Count | Primary emoji usage |
|------|-------|-------------------|
| tasks.js | 84 | Task rendering, category icons, size badges, XP display |
| financials.js | 44 | Section headers, status icons, bill types |
| crash-out.js | 32 | Timeline rendering, duration labels, skip/remove |
| triage.js | 15 | Column headers, quick-add, tier indicators |
| medications.js | 9 | Pill tracking, med setting |
| focus-pomodoro.js | 5 | Timer display, completion |

**Strategy**: Replace emoji strings in JS with either:
1. SVG icon helper function: `icon('calendar')` → returns inline SVG string
2. Plain text labels where the emoji was purely decorative
3. CSS class-based indicators (colored dots, pills) where emoji conveyed status

---

## 4. Execution Phases

### Phase 0: Design Token Foundation
**Files**: index.html (CSS section, lines 1-50)
**Scope**: ~50 lines added
**Risk**: None (additive only)

1. Add Google Fonts link to `<head>`
2. Add Lucide Icons CDN to `<head>`
3. Inject `:root { }` CSS variables block at top of `<style>`
4. Add `icon()` SVG helper function to state.js
5. Call `lucide.createIcons()` in init.js after DOM renders

**This phase touches no existing styles.** Pure foundation.

### Phase 1: Body & Canvas
**Files**: index.html (CSS lines ~14-50)
**Scope**: ~20 lines changed
**Risk**: Low

1. Replace `body` background from purple gradient to `var(--canvas)`
2. Update `body` font-family to `var(--font-body)`
3. Update `body` color to `var(--fg-primary)`
4. Remove loading overlay purple gradient → warm cream

**Visual impact**: Entire app goes from dark to light. Everything on top will look wrong until subsequent phases fix it.

### Phase 2: Cross-App Navigation
**Files**: index.html (CSS lines ~50-90, HTML lines ~10846-10852)
**Scope**: ~60 lines changed
**Risk**: Low

1. Restyle `.cross-app-nav` — cream background, subtle bottom border, no blur
2. Nav links: warm text colors, olive accent for active state
3. Remove emoji from nav link text (HTML edit)
4. Mobile: keep horizontal scrollable or convert to dropdown

### Phase 3: Header & Stats Bar (Full View - Desktop)
**Files**: index.html (CSS ~92-200, HTML ~10854-10941)
**Scope**: ~150 lines changed (CSS) + ~80 lines (HTML inline style removal)
**Risk**: Medium — heavy inline styles need careful replacement

This is the biggest single-phase effort for Full View:

1. **Header**: Remove white-on-purple styling. Dark text on cream. Serif font for "Dental Student Quest".
2. **Sync status bar**: Restyle from rgba dark pill to subtle light pill with border
3. **View toggle buttons**: From purple/white contrast to olive accent active state
4. **Toolbar icons**: Replace emoji buttons with Lucide icon buttons, warm styling
5. **Stats cards**: Remove colored tinted backgrounds (red/yellow/green). White cards on cream. Monospace numbers. Text labels instead of emoji.
6. **Streak badge**: From fire emoji to clean pill with accent color

**Critical**: The stats bar HTML (lines ~10898-10941) has ~40 inline `style=""` attributes. These need to be moved to CSS classes or overridden with `!important`. Recommend: create new classes like `.stat-pill`, `.stat-number`, `.stat-label` and add them to the HTML, then let CSS handle styling.

### Phase 4: Task List (Full View - The Proof of Concept)
**Files**: index.html (CSS ~various), tasks.js
**Scope**: ~200 lines CSS + ~84 emoji replacements in tasks.js
**Risk**: Medium — tasks.js generates HTML strings with emoji

The core of the app. This is where it either works or doesn't.

1. **Category tabs**: Clean underline tabs, no pills. Serif headers optional.
2. **Add task form**: Warm input styling, olive accent button
3. **Task items**: Borderless list with bottom dividers (Linear-style). White background. Subtle hover.
4. **Task checkboxes**: Circle checkboxes, olive when checked
5. **Task metadata**: Size badges as subtle pills, "Do Today" as small red dot not 🔴
6. **Category colors**: Mute the current bright colors to warm-toned variants
7. **Medication tracker**: Restyle pill counters from emoji-heavy to clean number displays
8. **tasks.js emoji removal**: Replace all 84 emoji in HTML string generation with icon() calls or text

### Phase 5: Compact Header (Mobile)
**Files**: index.html (CSS ~various mobile sections), HTML (~10772-10843)
**Scope**: ~100 lines CSS + ~30 lines HTML
**Risk**: Medium — iOS Safari quirks

1. **Compact header bar**: Cream background, subtle bottom border (not blur)
2. **Sync dot**: Keep but restyle (green/yellow/red dots are fine)
3. **View toggle**: Warm pill toggle, olive accent
4. **Hamburger menu panel**: White panel, subtle shadow, warm text
5. **Menu sections**: Clean headers (serif), icon buttons not emoji buttons

### Phase 6: Modals (Calendar, Notebook, Planner, Financials)
**Files**: index.html (CSS ~various modal sections), calendar.js, notebook.js, daily-planner.js, financials.js
**Scope**: ~300 lines CSS + ~44 emoji in financials.js
**Risk**: Medium — each modal has its own styling

6a. **Base modal**: White background, 12px radius, overlay shadow, warm backdrop
6b. **Calendar modal**: Warm month grid, olive accent for today, subtle day hover
6c. **Notebook modal**: Paper-like feel (cream inset background for text area)
6d. **Daily Planner**: Clean timeline, warm section dividers
6e. **Financials**: Restyle all 7 render functions. Remove 44 emoji. Clean data tables.
6f. **Help modal**: Simple text, warm styling

### Phase 7: Focus View — Triage Mode
**Files**: index.html (CSS ~6145-6700 focused-view overrides), triage.js
**Scope**: ~200 lines CSS + ~15 emoji in triage.js
**Risk**: Medium-High — `!important` overrides, drag-drop visual feedback

1. **Triage columns**: Clean card-per-column layout. Warm headers (serif). Subtle column borders.
2. **Column headers**: "Locked In" / "Today" / "Tomorrow" — text labels, small count badges
3. **Task cards in triage**: Borderless list items (same as Full View tasks but compact)
4. **Drag-drop feedback**: Warm highlight color (olive accent light) during drag
5. **Quick add**: Clean inline input, olive accent button
6. **Rolled over section**: Subtle visual distinction (cream inset background)

### Phase 8: Focus View — Crash Out Mode
**Files**: index.html (CSS), crash-out.js
**Scope**: ~150 lines CSS + ~32 emoji in crash-out.js
**Risk**: Medium — timeline grid styling is complex

1. **Sleep time header**: Clean serif display of bedtime
2. **Timeline grid**: Warm grid lines, clean time labels
3. **Scheduled task cards**: White cards on cream timeline, subtle left border accent
4. **Duration controls**: Clean +/- buttons, warm styling
5. **Google Calendar grid style**: Preserve layout, warm-ify colors

### Phase 9: Focus View — Focus/Pomodoro Mode
**Files**: index.html (CSS), focus-pomodoro.js
**Scope**: ~150 lines CSS + ~5 emoji in focus-pomodoro.js
**Risk**: Medium — SVG timer, confetti animation

This is where the "minimal surface" feel shines:

1. **Pomodoro circle**: Keep SVG circle but restyle. Olive accent progress ring on cream. Clean timer numbers (monospace, large).
2. **Task checklist**: Minimal list, circle checkboxes, olive checked state
3. **Duration toggles**: Clean pill buttons (15/25/50 min)
4. **XP display**: Typography-only, no emoji. "+50 XP" in accent color.
5. **Confetti**: Replace emoji confetti with subtle CSS particle animation or just a toast
6. **Streak display**: Clean pill badge
7. **Overall feel**: This mode should be the CALMEST — maximum whitespace, minimum chrome

### Phase 10: Polish & Consistency
**Files**: All
**Scope**: Variable
**Risk**: Low

1. **Animation audit**: Replace bouncy/dramatic transitions with smooth 150-200ms ease-out
2. **Hover state audit**: Ensure every interactive element has hover/active/focus states
3. **Focus ring audit**: Olive accent focus rings on all interactive elements
4. **Loading overlay**: Warm cream with olive accent loading bar
5. **Toast notifications**: Warm styling, subtle shadow, no emoji
6. **Empty states**: Warm illustrations or just clean text
7. **Scrollbar styling**: Subtle warm scrollbars
8. **Selection color**: Olive tinted text selection

### Phase 11: Mobile Responsive Audit
**Files**: index.html (CSS media queries)
**Scope**: ~100 lines
**Risk**: Medium — iOS Safari flex bugs

1. **Preserve iOS Safari flex workarounds** (explicit 2-row DOM, no flex-wrap reliance)
2. **Responsive breakpoints**: Keep 1024/768/480px
3. **Touch targets**: Ensure 44px minimum
4. **FAB button**: Restyle Quick Add FAB from purple to olive accent
5. **Bottom sheet**: Warm styling for Quick Add bottom sheet

---

## 5. Risk Mitigation

### Inline Styles (213 in index.html)

The HTML has 213 `style=""` attributes. Strategy:

1. **Don't remove inline styles in Phase 0-1** — just override with CSS classes + `!important` where needed
2. **Gradually migrate** inline styles to classes in each phase as you touch that section
3. **Priority inline style areas**:
   - Stats bar (lines ~10898-10941) — heaviest inline styling
   - Header toolbar (lines ~10855-10894) — lots of inline color/spacing
   - Loading overlay (line ~10753) — simple swap

### iOS Safari

- **DO NOT change the explicit 2-row DOM structure** for task layouts
- **DO NOT rely on flex-wrap + min-width** for multi-row layouts
- Test compact header, triage columns, and modals on iOS after each phase

### Functionality Preservation

- **JS modules are untouched** except for emoji string replacement
- **No DOM structure changes** to elements that JS queries by ID
- **No class name changes** on elements that JS uses for `.querySelector()` / `.classList`
- Before changing any class name, grep for it in all 12 JS files
- **Save guards, Firebase sync, checkpoint system** — ZERO changes

### Dark → Light Transition Artifacts

Switching from dark to light will expose:
- White text that was invisible before (now on white background)
- rgba(255,255,255,x) borders/backgrounds that made sense on dark, not on light
- Box shadows that were invisible on dark backgrounds
- **Solution**: Each phase must check for remnant dark-theme assumptions in the CSS sections it touches

---

## 6. Estimated Scope Per Phase

| Phase | CSS Lines | HTML Lines | JS Lines | Sessions |
|-------|-----------|------------|----------|----------|
| 0: Token Foundation | +50 new | +3 (head) | +20 (helpers) | Part of session 1 |
| 1: Body & Canvas | ~20 | ~5 | 0 | Part of session 1 |
| 2: Cross-App Nav | ~60 | ~10 | 0 | Part of session 1 |
| 3: Header & Stats | ~150 | ~80 | 0 | Session 1 |
| 4: Task List | ~200 | ~20 | ~84 (emoji) | Session 2 |
| 5: Compact Header | ~100 | ~30 | 0 | Session 2 |
| 6: Modals | ~300 | ~50 | ~44 (emoji) | Session 3 |
| 7: Triage | ~200 | ~20 | ~15 (emoji) | Session 3 |
| 8: Crash Out | ~150 | ~15 | ~32 (emoji) | Session 4 |
| 9: Focus/Pomodoro | ~150 | ~10 | ~5 (emoji) | Session 4 |
| 10: Polish | ~100 | ~20 | ~10 | Session 5 |
| 11: Mobile Audit | ~100 | ~10 | 0 | Session 5 |
| **Total** | **~1,580** | **~273** | **~210** | **~5 sessions** |

---

## 7. Session Execution Order

### Session 1: Foundation + Full View Shell
**Phases 0-3** — Token system, body, nav, header, stats

After this session: The app opens with a warm cream background, redesigned header, clean stats bar. Task list and modals still look wrong (dark-themed elements on light background) but the foundation is set.

### Session 2: Task List + Mobile Header
**Phases 4-5** — Task rendering, task interactions, compact header

After this session: Full View is complete. Tasks render cleanly. Mobile header works. This is the "proof of concept" milestone — if this looks good, the rest follows the same patterns.

### Session 3: Modals + Triage
**Phases 6-7** — All modals, triage mode

After this session: Calendar, notebook, planner, financials all match. Triage columns are warm-styled.

### Session 4: Crash Out + Focus
**Phases 8-9** — Crash out timeline, pomodoro focus

After this session: All three Command Center modes are redesigned. Focus mode is the calm, minimal experience.

### Session 5: Polish + Mobile
**Phases 10-11** — Animation audit, hover states, mobile testing

After this session: Ship it.

---

## 8. Testing Checklist (Per Session)

After each session, verify:

- [ ] App loads without JS errors (check console)
- [ ] Firebase sync works (save a task, reload, verify)
- [ ] All category tabs render correctly
- [ ] Task CRUD works (add, complete, delete, edit)
- [ ] Triage drag-drop works
- [ ] Crash Out scheduling works
- [ ] Focus timer starts/stops/completes
- [ ] Modals open and close (Calendar, Notebook, Planner, Financials)
- [ ] Mobile compact header works
- [ ] Quick Add FAB works
- [ ] View toggle (Full/Focus) works
- [ ] Cross-app navigation links work
- [ ] No white-on-white invisible text
- [ ] No dark-theme artifacts (rgba white borders, etc.)

---

## 9. Files to NOT Touch

- `js/dental-quest/firebase-sync.js` — save guards, sync logic (except emoji in error messages)
- `js/dental-quest/state.js` — defaults, Firebase config (add icon helper only)
- Save guard logic in any file
- `isEmptyState()` in any file
- Checkpoint system functions
- Any Firebase `.set()` / `.get()` / `.on()` calls
- Date parsing logic
- XP calculation logic
- EOD reset logic

---

## 10. Design Reference Files

Keep these available during execution:

- `/interface-design/.claude/skills/interface-design/SKILL.md` — Core principles
- `/interface-design/.claude/skills/interface-design/references/principles.md` — Code-level craft
- `/interface-design/.claude/skills/interface-design/references/critique.md` — Self-review protocol
- `/interface-design/reference/examples/system-warmth.md` — Warm system template
- This file (`REDESIGN-PLAN.md`) — The execution roadmap
