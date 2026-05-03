# QA Report: Notecard v2 Playwright Render Check
**Fragment**: `study-guides/_workspace/midterm-fragments/06-fragment-notecard-v2.html`
**Assembled file**: `/tmp/notecard-v2-assembled.html` (00-frame.html shell + 06-fragment-notecard-v2.html)
**Browser**: Playwright / Chrome 147 (desktop 1280×900, tablet 768×1024)
**Date**: 2026-05-03

---

## ✅ Render checks passed

- **Two-column layout (Side A, Side B)** renders correctly. Columns are equal-width (~443px / ~427px at 1280px). No overflow (`scrollWidth <= clientWidth` on all `.nc-cols`).
- **`.hl` yellow highlights** render at `rgb(255, 232, 77)` — 604 total across the full notecard. Appear both standalone and nested inside `.pg` spans. Yellow is fully visible on white card background.
- **`.pg` double-underline styling** works correctly: `border-bottom: 2px double currentColor`. `.pg.r` = red double underline, `.pg.b` = blue, `.pg.g` = green, `.pg.p` = purple, `.pg.k` = near-black. No background color (correct per CSS design — these are underline emphasis, not background badges).
- **Section headers (`.s`)**: `font-weight: 700`, `text-decoration: underline`, `font-size: 14px` — visible and well-spaced.
- **Column headers (`.h .r/.b/.g/.p`)**: render in correct color with `2px solid currentColor` border-bottom. `.h.r` = `rgb(204,0,0)`, `.h.b` = `rgb(10,88,160)`, `.h.g` = `rgb(26,122,26)`, `.h.p` = `rgb(122,45,142)`.
- **Border-top inline styles**: working correctly. Verified `border-top: 4px solid rgb(181, 72, 59)` on L1 column (red) renders as expected.
- **`.nc-card` background**: `rgb(255, 255, 248)` — the cream/off-white notecard feel is correct.
- **No JS errors**: Only 1 console error: `favicon.ico 404` — harmless.
- **Master Strip multi-row structure**: All 4 rows (r1–r4) render with correct heights (567px, 586px, 869px, 1268px). No collapsed rows.
- **Row 1** (2 cols: Pathognomonic + Oral-First): correct.
- **Row 3** (3 cols: Reportable + Mnemonics + Prof-Quotes): correct 3-column layout.
- **Tablet responsive** (768px): columns stack vertically per CSS `flex-direction: column` media query — correct behavior, no horizontal overflow.
- **Master Strip gold accent** (`border-top: 4px solid #C8923E` on card and all k-columns): renders correctly.
- **`.k` header text** (`rgb(17,17,17)` near-black with `2px solid` border-bottom): visible and readable.

---

## ❌ Layout / style issues

### Issue 1 — `.clinical-img` renders as bare text (no styled placeholder box)
**Severity**: Minor visual only  
**Screenshot**: `02-side-a-card.png` (top-left of L1 column, below 5-step framework)

The fragment uses:
```html
<div class="clinical-img" data-img-slot="nc-impetigo-pic">Impetigo: honey crusts over lip/perioral skin</div>
```
But the CSS (from 00-frame.html lines 235–249) expects child elements `.img-icon`, `.img-text`, `.img-label`, `.img-desc`. Without them, the div renders as a plain-text block with a light background (`rgb(250,250,248)`) but no icon, no label styling, no visual hierarchy. It reads like a stray paragraph.

**Fix**: Either (a) populate the `.clinical-img` with proper child markup:
```html
<div class="clinical-img" data-img-slot="nc-impetigo-pic">
  <span class="img-icon">🖼</span>
  <div class="img-text">
    <div class="img-label">Clinical image</div>
    <div class="img-desc">Impetigo: honey crusts over lip/perioral skin</div>
  </div>
</div>
```
Or (b) add a CSS fallback: `.clinical-img:not(:has(.img-icon)) { font-style: italic; color: var(--text-muted); border-left: 3px solid var(--border); padding: 6px 10px; }` so bare-text slots look intentional.

---

### Issue 2 — Sticky nav bar overlaps top content in element screenshots (Row 3, Side B)
**Severity**: Visual artifact in element-level screenshots only (not a page rendering bug)  
**Screenshots**: `03-side-b-card.png` (sticky nav partially covers the transition between L3 top and PVL section), `07-master-r3.png` (nav bar visible across the top ~56px of the element)

This happens because `element.screenshot()` in Playwright captures the element in its scrolled-into-view position while the sticky `position: fixed` nav stays in the viewport. The actual page HTML is correct — the nav doesn't clip content when a user scrolls. The underlying cause is the `.progress-bar-strip` header being `position: sticky` / `position: fixed`.

**Not a real bug for users.** But if print/PDF output is planned, the `@media print` rule should add `display: none` to `.progress-bar-strip` and `.nav-sticky`.

---

### Issue 3 — `.k` columns in Master Strip lack visual differentiation from body text
**Severity**: Low — stylistic concern  
**Screenshot**: `04-master-strip.png`, `05-master-r1.png`

`.nc .k` is defined as `color: #111` (near-black, no special weight), and `.pg.k` double-underline is also near-black on white background. This makes the Master Strip "gold" sections look visually identical to normal body text — there's no gold/amber tint. The border-top `4px solid #C8923E` (gold) on each column helps but the column header `.h.k` text `color: #111` with `border-bottom: 2px solid #111` is grey-black, not gold.

**Fix** (optional): In the CSS, change `.nc .k` to `color: #7A5200` (dark amber) so gold/master columns have a warm amber tint matching the accent color `--accent: #C8923E`. This would tie visual identity to the gold border-top already in place.

---

### Issue 4 — Master Row 4 is very tall (1268px) — possible print/cram concern
**Severity**: Informational  
**Screenshot**: `08-master-r4.png`

Row 4 (Numbers + DDx + QA Corrections) is 1268px tall at 1280px viewport — more than a full viewport height. The DDx mini-cards column in particular is very long. This is correct HTML, not a bug, but it means this section would span multiple printed pages if exported to PDF. If a compact print version is ever needed, consider `column-count: 2` CSS on the DDx column.

---

## ⚠️ Console errors

| Level | Message |
|-------|---------|
| ERROR | `http://localhost:8877/favicon.ico` — 404 File not found |

**One error, harmless.** No JS runtime errors. No missing resource errors for the HTML content itself. The Google Fonts load (Crimson Pro, Karla, JetBrains Mono) succeeded.

---

## 💡 Visual improvements

1. **`.pg` emphasis is subtle** — the double-underline is the only differentiation for high-yield spans. Consider pairing it with a very light background: `.nc .pg { background: rgba(255,232,77,0.18); }` to make these "double-emphasis" spans pop more against dense text.

2. **Side B column headers** have no visual separator between L3 (green) and L4 (purple) except the `border-top` inline style. Adding a `margin-top: 0` override to `.nc-col-right .h:first-child` would remove the gap artifact that appears at the very top of the right column in some viewports.

3. **Master Strip row dividers** — rows r1–r4 run continuously inside `.nc-card-master` with no visual breaks. Adding `border-top: 1px solid var(--border-light)` between rows (a `.sep` div or CSS `+ .nc-cols` rule) would improve scannability, especially since Row 3 has 3 columns while rows 1/2 have 2.

4. **Clinical image placeholders** (Issue 1 fix above) — once structured correctly, these would add welcome visual anchors to the L1 column which is currently all text.

5. **Font size** — at 13px (`font-size: 13px` on `.nc-col`), the density is very high. On tablet, it bumps to 14px (mobile override) which reads better. Consider bumping desktop to 13.5px for the full v2 notecard to reduce eye strain during cram.

---

## Summary

| Check | Status |
|-------|--------|
| Two-column layout (Side A, B) | ✅ Correct |
| `.hl` yellow highlights | ✅ 604 spans, all rendering |
| `.pg` double-underline colors | ✅ Color-matched to lecture |
| Section headers `.s` | ✅ Underlined, bold |
| Column headers `.h .r/b/g/p/k` | ✅ Color-bordered |
| `border-top` inline styles | ✅ Rendering |
| Master Strip 4 rows | ✅ Correct structure |
| Master Strip 3-col row | ✅ Row 3 has 3 cols |
| `.clinical-img` placeholders | ❌ No child markup = bare text |
| `.k` gold visual identity | ⚠️ Near-black, no amber tint |
| Console JS errors | ✅ None (favicon 404 only) |
| Tablet responsive | ✅ Stacks correctly |
| Overflow | ✅ None detected |

**Screenshots**: `/Users/suleman/dental-quest/study-guides/.midterm-build/screenshots-notecard-v2/` (10 files: 01–10)
