# QA Report: L2 (Allergies & Immunologic) Post-Swap Verification
**Agent:** @qa-l2  
**Date:** 2026-05-03  
**Target:** `od531-midterm-complete-study-guide.html` (6,877 lines)  
**Section Under Test:** `#sec-allergies` (lines 2585–3831)

---

## A. Static Checks

### A1. Section Anchors (Order + data-tab)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| sec-infectious line | 1699 | 1699 | PASS |
| sec-allergies line | 2585 | 2585 | PASS |
| sec-epithelial line | 3831 | 3831 | PASS |
| sec-salivary line | 5414 | 5414 | PASS |
| sec-notecard-v2 line | 6450 | 6450 | PASS |
| All 5 have data-tab attrs | yes | yes (infectious, allergies, epithelial, salivary, notecard-v2) | PASS |
| Anchors in correct order | yes | yes | PASS |

### A2. Image References (22 unique lecture-2 paths inside #sec-allergies)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Unique `lecture-2/*.png` refs in sec-allergies | 22 | 22 | PASS |
| All 22 image files exist on disk | 22/22 | 22/22 | PASS |

Confirmed images (all present on disk at `study-guides/images/oral-med-midterm/lecture-2/`):
- slide-007-corticosteroid-potency-table.png
- slide-013-geographic-tongue-clinical-photos.png
- slide-016-drug-induced-gingival-hyperplasia-photos.png
- slide-018-allergic-contact-reactions-tongue-arm.png
- slide-019-plasma-cell-gingivitis-allergic-stomatitis.png
- slide-020-allergic-contact-cheilitis.png
- slide-022-plasma-cell-gingivitis-severe.png
- slide-026-tlp-intro-tongue-instrument.png
- slide-027-tlp-management-tongue-photo.png
- slide-028-tlp-clinical-three-panel.png
- slide-030-bmz-yancey-diagram-part2-overview.png
- slide-034-olp-erosive-reticular-panels.png
- slide-035-olp-cutaneous-histopathology.png
- slide-036-mmp-bmz-diagram-ocular-eye.png
- slide-040-mmp-clinical-images-six-panel.png
- slide-043-pemphigus-pegasus-mnemonic-dif.png
- slide-044-dsg-compensation-diagram.png
- slide-046-pemphigus-vulgaris-clinical-images.png
- slide-048-em-vs-rime-comparison-table.png
- slide-049-em-rime-clinical-images.png
- slide-050-sjs-ten-comparison-table.png
- slide-053-sjs-ten-severity-clinical-photos.png

### A3. Figcaptions ≥ 60 chars

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| All 22 figcaptions ≥ 60 chars | 22/22 | 22/22 — 0 short captions found | PASS |

### A4. Hero Figures (class="clinical-img hero-img-full")

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Total hero figures | 8 | 8 | PASS |
| slide-007 (data-slide="7") hero | yes | yes — `id="alg-ras-hero"` | PASS |
| slide-016 (data-slide="16") hero | yes | yes — `id="alg-drgh-hero"` | PASS |
| slide-030 (data-slide="30") hero | yes | yes — `id="alg-bmz-hero"` | PASS |
| slide-036 (data-slide="36") hero | yes | yes — `id="alg-mmp-hero"` | PASS |
| slide-043 (data-slide="43") hero | yes | yes — `id="alg-pv-pegasus"` | PASS |
| slide-044 (data-slide="44") hero | yes | yes — `id="alg-dsg-comp"` | PASS |
| slide-048 (data-slide="48") hero | yes | yes — `id="alg-em-rime-hero"` | PASS |
| slide-050 (data-slide="50") hero | yes | yes — `id="alg-sjs-bsa-hero"` | PASS |

### A5. JS Keys Array

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `const keys = ['infectious', 'allergies', 'epithelial', 'salivary', 'notecard-v2'];` | exact match | exact match (line 6827) | PASS |

### A6. Blockquotes in #sec-allergies

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `<blockquote>` count in sec-allergies | 0 | 0 | PASS |

### A7. Flashcard Count

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `<details class="flashcard">` inside sec-allergies | 15 | 15 | PASS |

### A8. Cross-Cutting Table IDs

| Check | ID | Present | Result |
|-------|-----|---------|--------|
| Nikolsky table | `alg-nikolsky-table` | yes | PASS |
| DIF pattern table | `alg-dif-table` | yes | PASS |
| BSA cutoffs table | `alg-bsa-table` | yes | PASS |
| Histologic level table | `alg-histo-table` | yes | PASS |

### A9. ID Namespace (no prefix collision)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| All IDs in sec-allergies start with `alg-` | yes | yes — 76 IDs total; only `id="sec-allergies"` (the section itself) and `id="sec-epithelial"` (first line of next section at line 3831) are non-`alg-` prefixed | PASS |

> Note: `id="sec-epithelial"` at line 3831 is the opening div of the *next* section, which awk captures because the boundary is inclusive. It is NOT inside sec-allergies content — it is the next section's anchor. No collision.

### A10. CSS — #sec-allergies Selectors Injected in midterm-emphasis-tiers

| Selector | Present | Line | Result |
|----------|---------|------|--------|
| `#sec-allergies details.flashcard` | yes | 1582 | PASS |
| `#sec-allergies figure.clinical-img` | yes | 1604 | PASS |
| `#sec-allergies figure.hero-img-full img` | yes | 1616 | PASS |
| `#sec-allergies .prof-emphasis` | yes | 1620 | PASS |
| `#sec-allergies details.tier-3-collapse` | yes | 1631 | PASS |

### A11. Additional Content Validator Counts

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| `slide-ref` count in sec-allergies | 125 (per l2-builder.md) | 125 | PASS |
| `tier-3-collapse` blocks in sec-allergies | 10 (per l2-builder.md) | 10 | PASS |
| `prof-emphasis` count in sec-allergies | 36 (per l2-builder.md) | 36 | PASS |

### A12. Style / Script Block Counts

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `<style>` blocks total | 3 (per swap-l2 spec) | 4 (`<style>`, `<style id="l1-backfill">`, `<style id="midterm-emphasis-tiers">`, note-only comment line) | INFO — pre-existing (same as L1/L4 QA: 4 blocks confirmed) |
| `<script>` blocks | 1 | 1 (line 6784) | PASS |

> The pre-known spec said "3 style blocks" but the file has always had 4 (`l1-backfill` added earlier). This matches the L1/L4 QA finding exactly — not introduced by the L2 swap.

---

## B. Playwright Live Render

Server: `python3 -m http.server 8765` from `study-guides/` directory. Viewport: 1200×900.

### B1. Console Messages

| Level | Count | Details |
|-------|-------|---------|
| Errors | 0 | None |
| Warnings | 0 | None |
| Info/Debug | N/A | Not checked (not required) |

> No favicon 404 was logged this run (browser may have cached it). Zero content errors.

### B2. Image Load Counts (after forcing lazy→eager, 2s settle)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `img[src*="lecture-2"]` total | 22 | 22 | PASS |
| lecture-2 images loaded (naturalWidth > 0) | 22 | 22 | PASS |
| lecture-2 images broken (complete && naturalWidth === 0) | 0 | 0 | PASS |

### B3. HERO Width Measurements (1200px viewport)

| HERO Image | Rendered Width | Viewport Width | Full-Width? | Result |
|-----------|---------------|----------------|-------------|--------|
| slide-007 (alg-ras-hero) | 830px | 1200px | Fills content column | PASS |
| slide-016 (alg-drgh-hero) | 830px | 1200px | Fills content column | PASS |
| slide-030 (alg-bmz-hero) | 816px | 1200px | Fills content column | PASS |
| slide-036 (alg-mmp-hero) | 830px | 1200px | Fills content column | PASS |
| slide-043 (alg-pv-pegasus) | 830px | 1200px | Fills content column | PASS |
| slide-044 (alg-dsg-comp) | 830px | 1200px | Fills content column | PASS |
| slide-048 (alg-em-rime-hero) | 830px | 1200px | Fills content column | PASS |
| slide-050 (alg-sjs-bsa-hero) | 830px | 1200px | Fills content column | PASS |

All 8 HEROs render between 816–830px within the 1200px viewport — correct full-width-within-card behavior (matches L1/L4 QA baseline of 824px; slight variation due to padding).

### B4. Tab Click — sec-allergies Navigation

| Check | Result |
|-------|--------|
| "Allergies & Immunologic" tab link present in nav | PASS |
| Clicking tab scrolls to sec-allergies | PASS (URL hash → `#sec-allergies`) |
| Tab becomes `active` class in viewport | PASS — scroll-driven activation; tab shows "Allergies & Immunologic 4%" (confirmed active at 1200px) |
| sec-allergies `display: block`, `visibility: visible` | PASS |

### B5. Mobile (375×812) Overflow Check

| Check | Result |
|-------|--------|
| `body.scrollWidth` | 614px |
| `window.innerWidth` | 375px |
| Overflow detected | Yes — body.scrollWidth > viewportWidth |
| Cause | `#inf-candidiasis-types-table` (data-table in sec-**infectious**, not sec-allergies) at right=425px |
| L2 elements causing overflow | None |
| True layout-breaking horizontal scroll | No — same pre-existing overflow as L1/L4 QA; no new overflow introduced by L2 swap |

**Mobile verdict: No layout-breaking overflow introduced by L2. The one offender is a pre-existing sec-infectious table, confirmed identical to L1/L4 QA finding.**

---

## C. Cross-Section Regression Checks

### C1. Total prof-emphasis Count

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Total `class="prof-emphasis"` in file | 93–99 (57 prior + 36 L2) | 99 | PASS |

Breakdown by section:
- sec-infectious (L1): 49
- sec-allergies (L2): 36
- sec-epithelial (L3): 0 (uses different markup — not blockquotes, different class scheme)
- sec-salivary (L4): 14
- **Total: 99** (within spec range of 93–99)

### C2. sec-infectious Regression

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `prof-emphasis` blocks in sec-infectious | > 0 | 49 | PASS |
| `<blockquote>` in sec-infectious | 0 | 0 | PASS |

### C3. sec-salivary Notecard List

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `<ol class="notecard-candidates" id="sal-notecard-list">` present | yes | yes (line 6337) | PASS |
| `<li id="sal-nc-N">` count | 15 | 15 (sal-nc-1 through sal-nc-15) | PASS |

---

## Screenshots

| # | File | Description | Status |
|---|------|-------------|--------|
| 01 | `.midterm-build/screenshots-l2/01-l2-top.png` | L2 desktop 1200×900 — Tier framework explainer with T1/T2/T3 columns + Quick Navigation | Saved |
| 02 | `.midterm-build/screenshots-l2/02-l2-ras-corticosteroid-hero.png` | L2 desktop — RAS section: dexamethasone elixir drug hero + corticosteroid potency table (slide 7 content rendered as data-table) | Saved |
| 03 | `.midterm-build/screenshots-l2/03-l2-bmz-yancey-hero.png` | L2 desktop — Part 2 BMZ overview: Yancey diagram HERO (slide-030) full-width + Epithelial Attachment Apparatus heading | Saved |
| 04 | `.midterm-build/screenshots-l2/04-l2-pv-pegasus.png` | L2 desktop — PV section: Pegasus HERO figure (slide-043, 830px wide) + Pegasus mnemonic text + DSG compensation table context | Saved |
| 05 | `.midterm-build/screenshots-l2/05-mobile-l2-top.png` | L2 mobile 375×812 — Tier framework top: "How Prof Roehm Triaged These Diseases" heading visible, no horizontal overflow, PROF EMPHASIZED block styled correctly | Saved |

All 5 screenshots saved to `/Users/suleman/dental-quest/study-guides/.midterm-build/screenshots-l2/`.

---

## Issues Found (Non-Blocking)

| # | Severity | Issue | Location | Notes |
|---|----------|-------|----------|-------|
| 1 | INFO | Style block count is 4, not 3 | Line 9 (main `<style>`), 1440 (`l1-backfill`), 1489 (`midterm-emphasis-tiers`) | Pre-existing — identical to L1/L4 QA finding; not introduced by L2 swap |
| 2 | INFO | `body.scrollWidth = 614px > 375px` on mobile | `#inf-candidiasis-types-table` in sec-infectious | Pre-existing — same overflow as L1/L4 QA; zero new overflow from L2 elements |
| 3 | INFO | `id="sec-epithelial"` appears in awk extraction of lines 2585–3831 | Line 3831 (boundary line, first line of next section) | Not a bug — the boundary is correct; `sec-epithelial` div opens exactly at line 3831 which is the first line outside sec-allergies content |
| 4 | INFO | sec-epithelial has 0 `prof-emphasis` blocks | sec-epithelial uses different class scheme | Pre-existing; L3 was written with a different markup vocabulary (not a regression from L2 swap) |

**No FAIL-level issues found.**

---

## Final Verdict

**PASS**

All 22 images confirmed in HTML and on disk. All 22 images loaded in browser (0 broken). All 22 figcaptions ≥ 60 chars. All 8 HEROs (slides 7, 16, 30, 36, 43, 44, 48, 50) confirmed with `class="clinical-img hero-img-full"` and rendering 816–830px wide at 1200px viewport. JS keys array unchanged. Zero blockquotes. 15 flashcards. All 4 cross-cutting table IDs present. All IDs in sec-allergies prefixed `alg-`. CSS selectors (`#sec-allergies .prof-emphasis`, `#sec-allergies figure.clinical-img`, `#sec-allergies details.flashcard`) injected in `midterm-emphasis-tiers` block. 36 prof-emphasis blocks in sec-allergies (36 expected). 125 slide-refs. 10 tier-3-collapse blocks. Total prof-emphasis = 99 (within spec 93–99). Zero console errors. No new mobile overflow from L2. sec-infectious and sec-salivary notecard list fully intact post-swap.
