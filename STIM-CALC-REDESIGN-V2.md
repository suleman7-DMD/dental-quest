# Stimulant Elimination Calculator — Fresh Redesign Plan V2

> **Created**: Feb 24, 2026 by 11-agent team (5 scouts + 6 architects)
> **Goal**: Complete warm clinical rebrand — every pixel transformed, zero logic changes
> **Philosophy**: Not a color swap. A visual hierarchy redesign with the warm clinical design system.

---

## WHY V2 (What Was Wrong With V1)

The V1 plan (STIM-CALC-REDESIGN-PLAN.md) completed 7/13 phases but:
1. **Color swap, not a redesign** — mapped hex values 1:1 without rethinking visual hierarchy
2. **Unified view untouched** — the entire hero, accordion, status pill, and modal system (~670 CSS lines) still uses dark glassmorphism
3. **5 of 7 JS files still dark** — init.js, ui-sections.js, history-calendar.js, firebase-sync.js, state.js have 110+ hardcoded neon colors
4. **No structural improvement** — no serif headings, no accent stripes, no warm shadows

V2 builds on the good foundation work (tokens, fonts, base CSS) and does the real redesign.

---

## CREATIVE VISION

**Clinical Dashboard** — medical monitoring software meets premium weather app:

- **Canvas**: Warm cream (#FAF8F5) with white card surfaces
- **Hero**: Premium clinical card — large serif time, warm semantic colors, left accent stripe
- **Accordion sections**: Clean white cards with olive left-accent borders (not glassmorphism)
- **Typography**: Source Serif 4 headings (section names, hero time), Inter body text
- **Colors**: Warm sage/olive accent, desaturated semantics (no neon green/red/purple)
- **Shadows**: Brown-tinted warm shadows (not black)
- **Modals**: White surfaces on warm backdrop (not dark slate)
- **Graph**: Scientific colors preserved but framed in warm white card
- **Sleep Intelligence**: Pill-toggle tabs, warm collapsible sections, warm calendar grid

---

## WHAT MUST NOT BE TOUCHED

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

## WHAT'S ALREADY DONE (From V1 — Keep These)

| Component | Status | Lines |
|-----------|--------|-------|
| CSS design tokens (70+ vars in `:root`) | DONE | 23-107 |
| Google Fonts (Inter + Source Serif 4) | DONE | 13-16 |
| `icon()` SVG helper in state.js | DONE | ~588-662 |
| Body background + typography base | DONE | 115-122 |
| Cross-app nav warm styling | DONE | 124-164 |
| Card/container base styles | DONE | 274-296 |
| Input controls (outside unified view) | DONE | 427-446 |
| Med entry styling (outside unified view) | DONE | 449-487 |
| Modifier items (outside unified view) | DONE | 556-632 |
| Graph container/tooltip (CSS classes) | DONE | 700-780 |
| Recommendations section CSS | DONE | 782-821 |
| Settings section CSS | DONE | 854-858 |
| Sleep Intelligence CSS (si-*, ins-*, acc-*) | DONE | 950-1224 |
| graph.js canvas colors | DONE | (warm scientific palette) |
| med-caffeine.js inline colors | DONE | (warm palette) |

---

## EXECUTION PHASES

### Phase A — CSS: Hero + Header + Graph Wrap
**File**: `stimulant-elimination-calculator.html` (CSS lines ~1744-1900)
**Scope**: Convert the top 3 unified-view components from dark glassmorphism to warm clinical

| Target | Before | After |
|--------|--------|-------|
| `.unified-container` font | `-apple-system, system-ui...` | `var(--font-body)` |
| `.unified-container` max-width | `600px` | `700px` |
| `.unified-header` bg | `rgba(0,0,0,0.3)` | `var(--surface-primary)` + border + shadow |
| Checkpoint buttons | `rgba(255,255,255,0.05)`, `#b0b8c4` | `var(--canvas-subtle)`, `var(--fg-secondary)` |
| `.unified-hero` bg | purple/green gradient + blur | `var(--surface-primary)` + `border-left: 4px solid var(--accent)` + shadow |
| `.hero-label` | `#9ca3af` | `var(--fg-tertiary)`, `var(--font-body)`, weight 600 |
| `.hero-time` | `font-weight: 700` | Add `var(--font-heading)` (Source Serif 4) |
| `.hero-time.green` | `#10b981` | `var(--status-safe)` |
| `.hero-time.yellow` | `#f59e0b` | `var(--status-caution)` |
| `.hero-time.red` | `#ef4444` | `var(--status-danger)` |
| `.hero-quality.green` | `rgba(16,185,129,0.15)` | `var(--status-safe-light)` |
| `.hero-quality.yellow` | `rgba(245,158,11,0.15)` | `var(--status-caution-light)` |
| `.hero-quality.red` | `rgba(239,68,68,0.15)` | `var(--status-danger-light)` |
| `.hero-countdown` | `#10b981` | `var(--fg-secondary)` |
| `.hero-countdown.urgent` | pulse + `#ef4444` | `var(--status-danger)`, weight 700, NO pulse |
| Progress bar track | `rgba(255,255,255,0.08)` | `var(--canvas-inset)` |
| Progress bar fill | purple→green gradient | `var(--accent)` solid |
| `.status-pill` | dark glass + blur | `var(--surface-primary)` + border + shadow |
| `.unified-graph-wrap` | dark glass + blur | `var(--surface-primary)` + border + shadow |
| `heroPulse` animation | opacity 0.5 | opacity 0.7 (softer) |

**New CSS classes to add:**
- `.unified-hero.state-green/yellow/red` — left border color by state
- `.status-pill.pill-safe/pill-danger` — semantic pill states
- `#bottleneckIndicator` — styled as warm caution pill

**Est. ~150 CSS lines changed/added**

---

### Phase B — CSS: Accordion Sections + Body Controls
**File**: `stimulant-elimination-calculator.html` (CSS lines ~1904-2090)
**Scope**: Convert accordion system from dark glassmorphism to warm white cards

| Target | Before | After |
|--------|--------|-------|
| `.accordion-section` bg | `rgba(255,255,255,0.04)` + blur | `var(--surface-primary)` + shadow |
| `.accordion-section` border | `rgba(255,255,255,0.06)` | `var(--border-default)` |
| `.accordion-section:hover` | `rgba(255,255,255,0.12)` | `var(--border-strong)` |
| `.accordion-section.open` | `rgba(255,255,255,0.05)` | `border-color: var(--accent-light)` |
| `.accordion-section.has-content` | purple left border | `border-left: 3px solid var(--accent)` (olive) |
| `.accordion-header` | `#e6edf3` | `var(--fg-primary)`, add `var(--font-heading)` |
| `.accordion-header:hover` | `rgba(255,255,255,0.04)` | `var(--canvas-subtle)` |
| `.accordion-summary` | `#9ca3af` | `var(--fg-tertiary)` |
| `.accordion-arrow` | `#6e7681` / `#8b949e` | `var(--fg-muted)` / `var(--accent)` |
| Body inputs/selects | dark bg, white text | `var(--control-bg)`, `var(--fg-primary)` |
| Body focus ring | purple | `var(--control-border-focus)` + `var(--control-ring)` |
| `.quick-btn` | dark glass | `var(--canvas-subtle)` + border |
| `.add-btn` hover | purple tint | `var(--accent-lighter)` |
| `.unified-entry` | `rgba(0,0,0,0.2)` | `var(--canvas-subtle)` + border |
| `.entry-delete` | `#f87171` | `var(--destructive)` |
| `.modifier-toggle` label | `#c9d1d9` | `var(--fg-primary)` |
| `.modifier-toggle` input | dark bg | `var(--control-bg)` |

**Add: `.accordion-section.open .accordion-body { border-top: 1px solid var(--border-subtle); }`**

**Est. ~180 CSS lines changed**

---

### Phase C — CSS: Buttons + Blocking + Specialty Components
**File**: `stimulant-elimination-calculator.html` (CSS lines ~2090-2416)
**Scope**: All remaining CSS dark-theme remnants

| Target | Before | After |
|--------|--------|-------|
| `.btn-primary` | blue/purple gradient | `var(--accent)` solid |
| `.btn-secondary` | dark glass | `var(--surface-primary)` + border |
| `.btn-danger` | dark red glass | `var(--destructive-light)` + `var(--destructive)` |
| `.action-btn-primary` | purple gradient | `var(--accent)` solid |
| `.action-btn-secondary` | `rgba(255,255,255,0.06)` | `var(--surface-primary)` |
| `.action-btn-small` | `rgba(255,255,255,0.04)` | `var(--canvas-subtle)` |
| `.unified-blocking` | `rgba(239,68,68,0.08)` | `var(--status-blocking-light)` |
| `.unified-blocking h4` | `#f87171` | `var(--status-blocking)` |
| `.all-nighter-btn` | amber glass | `var(--warning-light)` + `var(--warning)` |
| `.sleep-debt-display` | `rgba(0,0,0,0.2)` | `var(--canvas-subtle)` |
| `.stacking-warning` | amber glass | `var(--warning-light)` + `var(--warning)` |
| `.circadian-box.forbidden` | red glass | `var(--destructive-light)` + `var(--destructive)` |
| `.circadian-box.gate` | green glass | `var(--success-light)` + `var(--success)` |
| `.nic-quick-btns button` | dark glass | `var(--canvas-subtle)` + border |
| `.recent-night-pill` | `rgba(255,255,255,0.1)` border | `var(--border-default)` |
| `.scenario-label` | `#7d8590` | `var(--fg-tertiary)` |
| `.scenario-compact:hover` | `brightness(1.2)` | `translateY(-2px)` + shadow |
| `.sleep-cal-day.great` | `rgba(94,138,94,0.35)` | `var(--success-light)` |
| `.sleep-cal-day.good` | `rgba(94,122,138,0.35)` | `var(--info-light)` |
| `.sleep-cal-day.ok` | `rgba(196,146,58,0.3)` | `var(--warning-light)` |
| `.sleep-cal-day.poor` | `rgba(184,92,92,0.3)` | `var(--destructive-light)` |
| Toast | plain white | Add `border-left: 3px solid var(--accent)` |

**Est. ~120 CSS lines changed**

---

### Phase D — HTML: Inline Style Corrections
**File**: `stimulant-elimination-calculator.html` (HTML body, lines ~2419-3007)
**Scope**: All hardcoded `style=""` attributes in HTML elements

~35 specific inline style replacements including:
- Sync status/button colors (lines 2457-2460)
- Hero quality badge inline style (line 2475)
- Ghost load section (lines 2546-2549)
- VitC date select (line 2598)
- Nicotine status section (lines 2634-2644)
- Workout labels/buttons (lines 2695-2709)
- What-if scenario cards — 6 cards (lines 2718-2748)
- Sleep overview legend/explainer (lines 2794-2822)
- Calendar nav buttons (lines 2864-2867)
- Day detail modal (lines 2885-2892)
- Forecast logic pre/button (lines 2914-2915)
- Sleep edit modal buttons (lines 2985-2995)
- Feedback modal text (line 2429)

**Color mapping for inline HTML:**
- `#b0b8c4` / `#9ca3af` / `#c9d1d9` → `var(--fg-secondary)` or `var(--fg-tertiary)`
- `#e6edf3` → `var(--fg-primary)`
- `rgba(0,0,0,0.2-0.3)` → `var(--canvas-subtle)` or `var(--canvas-inset)`
- `rgba(255,255,255,0.1)` → `var(--border-default)`
- `#ef4444` / `#f87171` → `var(--destructive)`
- `#10b981` → `var(--success)` or `var(--status-safe)`
- `#f59e0b` → `var(--warning)`
- `#8b5cf6` → `var(--accent)`

**Est. ~35 inline style edits**

---

### Phase E — JS: Inline Color Updates (5 files, parallelizable)
**Files**: init.js, ui-sections.js, history-calendar.js, firebase-sync.js, state.js
**Scope**: Every hardcoded hex/rgb color in JS → warm clinical equivalents

#### Color Master Map (for all JS files):
```
NEON → WARM
#ef4444  → #B85C5C  (destructive)
#f87171  → #C97070  (lighter destructive)
#10b981  → #5E8A5E  (success/safe)
#86efac  → #8AAB8A  (light success)
#f59e0b  → #C4923A  (warning)
#fbbf24  → #C4923A  (warning variant)
#fcd34d  → #DDB86A  (light warning)
#60a5fa  → #5E7A8A  (info)
#58a6ff  → #5E7A8A  (info)
#93c5fd  → #8AACBD  (light info)
#8b5cf6  → #6B7C5E  (accent — was purple)
#6366f1  → #6B7C5E  (accent)
#a78bfa  → #6B7C5E  (accent)
#c084fc  → #6B7C5E  (accent)
#7d8590  → #9C948B  (tertiary)
#8b949e  → #9C948B  (tertiary)
#6e7681  → #9C948B  (tertiary)
#6b7280  → #C4BCB3  (muted)
#b0b8c4  → #6B635B  (secondary)
#e6edf3  → #2C2825  (primary — inverted: was bright-on-dark)
#c9d1d9  → #2C2825  (primary)
#22d3ee  → #5E7A8A  (info, was cyan)
#f472b6  → #B85C5C  (destructive, was pink)
#34d399  → #5E8A5E  (success, was neon green)
#a8a29e  → #9C948B  (tertiary)

DARK BACKGROUNDS → WARM BACKGROUNDS
#1a1a2e  → #FFFFFF  (surface-primary)
#0f172a  → #FFFFFF  (surface-primary)
#161b22  → #FFFFFF  (surface-primary)
#1e293b  → #FFFFFF  (surface-primary)
#21262d  → #F5F2ED  (canvas-subtle)
#30363d  → rgba(0,0,0,0.12)  (border-strong)
#475569  → #EFECE6  (canvas-inset)

DARK OVERLAYS → WARM OVERLAYS
rgba(0,0,0,0.7-0.8) → rgba(0,0,0,0.35)  (modal backdrop)
rgba(0,0,0,0.2-0.3) → var(--canvas-inset) or rgba(0,0,0,0.03)

GRADIENTS
linear-gradient(#6366f1, #8b5cf6) → #6B7C5E solid (accent)
linear-gradient(#1e3a5f, #2d1b4e) → var(--canvas-subtle)
linear-gradient(#3b82f6, #8b5cf6) → var(--accent) solid
#238636 → #5E8A5E  (success)
#8957e5 → #6B7C5E  (accent)
#f0883e → #C4923A  (warning)
#3b82f6 → #6B7C5E  (accent — was CTA blue)
```

#### Per-File Touchpoint Count:
| File | Touchpoints | Key Areas |
|------|-------------|-----------|
| `init.js` | ~30 | Sleep debt borders, blocking factors HTML, accordion summaries, status pill colors, hero state class |
| `history-calendar.js` | ~55 | Calendar day cards, day detail modal, insights tri-colors, accuracy bars, achievement badges, circadian phase |
| `ui-sections.js` | ~25 | Nicotine button gradients, level colors, workout result borders, modifier header colors, forecast display |
| `firebase-sync.js` | ~8 | Sync status colors, PIN modal, checkpoint modal, sync conflict modal |
| `state.js` | ~3 | showCustomAlert overlay/card, showCustomConfirm overlay/card |
| `graph.js` | 1 | Line 111: vertical grid `rgba(255,255,255,0.1)` → `rgba(0,0,0,0.06)` |

**CRITICAL: In init.js, replace inline `style.borderColor` on status pills with `classList.toggle('pill-safe'/'pill-danger')` to use Phase A's new CSS classes.**

**CRITICAL: In history-calendar.js, the `statusColors` object (line 1661) and `hexToRgb()` calls need special handling — replace status color hex values with warm hex (not CSS vars) to maintain compatibility with `hexToRgb()`. Or create a `statusBgStyle(status)` helper that bypasses hexToRgb entirely.**

---

### Phase F — Final Polish + Mobile Verification
**Files**: All
**Scope**: Visual QA, remaining artifacts, animation tuning

Tasks:
- [ ] grep for ALL remaining dark-theme colors across all files
- [ ] Verify mobile at 375px, 480px, 768px breakpoints
- [ ] Verify touch targets ≥44px on all interactive elements
- [ ] Verify iOS input zoom prevention (16px font)
- [ ] Verify accordion open/close animation still smooth
- [ ] Verify graph renders correctly on white canvas card
- [ ] Test cross-app nav links work
- [ ] Add warm scrollbar styling if needed

---

## EXECUTION DEPENDENCIES

```
Phase A (hero/header) ← builds on existing tokens
    ↓
Phase B (accordions) ← needs hero context
    ↓
Phase C (buttons/specialty) ← needs accordion context
    ↓
Phase D (HTML inline) ← needs all CSS done
    ↓
Phase E (JS colors) ← needs all CSS/HTML done for visual verification
    ↓
Phase F (polish) ← needs everything done
```

**Within Phase E — all 5 JS files can be edited in PARALLEL** (no interdependency):
```
E1: init.js        ─┐
E2: history-cal.js  ├─ ALL PARALLEL
E3: ui-sections.js  │
E4: firebase-sync.js│
E5: state.js       ─┘
E6: graph.js (1 line) ← trivial, do anytime
```

---

## VERIFICATION CHECKLIST

### Per-Phase Checks:
- [ ] App loads without console errors
- [ ] `recalculate()` fires every 5 seconds (check console)
- [ ] Firebase sync works (add med → reload → still there)
- [ ] Brace balance: `python3 -c "c=open('FILE').read(); print(c.count('{'), c.count('}'))"`

### Final QA:
```bash
# Zero dark theme colors in CSS:
grep -n '#1a1a2e\|#0f3460\|#161b22\|#21262d\|#30363d' stimulant-elimination-calculator.html

# Zero neon colors in CSS:
grep -n '#8b5cf6\|#10b981\|#ef4444\|#f59e0b\|#3b82f6\|#58a6ff' stimulant-elimination-calculator.html

# Zero glassmorphism:
grep -n 'backdrop-filter' stimulant-elimination-calculator.html

# Zero neon colors in JS:
grep -rn '#ef4444\|#10b981\|#f59e0b\|#8b5cf6\|#e6edf3\|#c9d1d9\|#b0b8c4' js/stimcalc/

# Save guards intact:
grep -n 'pinValidated\|isInitialLoad\|hasLoadedFromCloud\|isEmptyState\|_dataLoaded' js/stimcalc/firebase-sync.js
```

### Logic Integrity:
- [ ] `saveState()` has exactly 5 guards in firebase-sync.js
- [ ] `saveStateImmediate()` has same 5 guards
- [ ] `recalculate()` pipeline intact in init.js
- [ ] `isEmptyState()` checks all 6 conditions in state.js
- [ ] `mergeRemoteState()` not duplicated
- [ ] `_version: 0` in defaults (NOT `Date.now()`)

### Functional:
- [ ] PIN auth → green sync dot
- [ ] Add medication → graph updates → sleep time updates → persists on reload
- [ ] All 8 accordion sections open/close smoothly
- [ ] Sleep Intelligence 4 tabs render
- [ ] Calendar month navigation works
- [ ] Day detail modal opens with warm colors
- [ ] 6 what-if scenario cards show projections
- [ ] Checkpoint create/restore cycle works
- [ ] Force upload/pull work

### Mobile (375px):
- [ ] No horizontal scroll
- [ ] All tap targets ≥44px
- [ ] Status pills scroll horizontally
- [ ] Inputs don't trigger iOS zoom

---

## RISK REGISTER

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | `hexToRgb(statusColor)` breaks with CSS var strings | HIGH | Keep warm HEX values (not CSS vars) in statusColors object, or create statusBgStyle() helper |
| 2 | JS template literal quote escaping errors | HIGH | Read full function context before editing; brace-balance check after each file |
| 3 | Firebase checkpoint modal (line 653) has entire HTML in JS string | HIGH | Surgical color-only edits inside string; test checkpoint create/restore after |
| 4 | CSS specificity conflict between SI classes and unified-view classes | MEDIUM | Use specific selectors (.accordion-body .input-group input) not bare element selectors |
| 5 | `.stacking-warning` has two CSS definitions (tooltip badge vs accordion body) | MEDIUM | Audit which elements use which; convert only the accordion version |
| 6 | `analysis.color` string comparison in circadian phase | MEDIUM | Add `statusKey` field to circadian.js return object; use that for styling |
| 7 | Achievement badge hexToRgb dependency | MEDIUM | Keep achievement colors as hex (warm hex, not CSS vars) |
| 8 | Source Serif 4 font load failure | LOW | Georgia serif fallback is acceptable |
| 9 | Status pills JS inline border vs CSS class conflict | LOW | Must apply JS changes (Phase E) together with CSS (Phase A) |

---

## ESTIMATED SCOPE

| Phase | CSS Lines | HTML Lines | JS Lines | Risk |
|-------|-----------|------------|----------|------|
| A: Hero/Header | ~150 | 0 | 0 | LOW |
| B: Accordions | ~180 | 0 | 0 | LOW |
| C: Buttons/Specialty | ~120 | 0 | 0 | LOW |
| D: HTML Inline | 0 | ~35 | 0 | LOW |
| E: JS Colors | 0 | 0 | ~120 | MEDIUM |
| F: Polish | ~20 | ~5 | ~5 | LOW |
| **TOTAL** | **~470** | **~40** | **~125** | — |

All phases are pure visual. Zero logic changes. Zero math changes. Zero Firebase changes.
