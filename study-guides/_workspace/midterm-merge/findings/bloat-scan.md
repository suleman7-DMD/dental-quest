# Bloat Scan Report
**File:** `study-guides/od531-midterm-complete-study-guide.html`
**Scanned:** 2026-05-03
**File size:** 453,489 bytes / 6,877 lines

---

## Summary
- **Total recommended deletions:** ~28–34 KB (~200–250 lines of redundant content)
- **Total recommended CSS changes:** 14 rules (duplicates, unused components, spacing tightening)
- **Estimated final file size after fixes:** ~418–425 KB (~7–8% reduction, primarily from content dedup)

---

## A. CSS Spacing Recommendations

| Line | Current | Suggested | Reason |
|------|---------|-----------|--------|
| 64 | `padding: 56px 40px 48px` (hero) | `padding: 40px 32px 36px` | Hero top/bottom gap is outsized; 56px top on a study guide feels like landing page |
| 125 | `.container { padding: 32px 24px 80px }` | `padding: 24px 24px 60px` | 80px bottom padding creates excessive dead space under last card |
| 129–130 | `.section-header { padding: 40px 0 0; margin-bottom: 24px }` | `padding: 28px 0 0; margin-bottom: 18px` | 40px top padding before each section header creates large air gaps between cards and section titles |
| 149 | `.card { padding: 28px; margin-bottom: 20px }` | `padding: 22px; margin-bottom: 16px` | 28px card padding + 20px bottom margin = 48px minimum gap between any two cards; tightening to 22+16 saves ~10px per card transition |
| 305 | `.foundations-box { padding: 28px; margin: 32px 0 }` | `padding: 22px; margin: 24px 0` | Foundations boxes have same oversized padding as cards |
| 647 | `.guide-section-divider { padding: 48px 40px 40px }` | `padding: 32px 32px 28px` | Section divider banners are the biggest vertical-space consumers in the file — 88px total top+bottom is heroic when the content is a single line title |
| 710–711 | `.case-box { margin: 32px auto; padding: 28px 32px }` | `margin: 20px auto; padding: 20px 24px` | Only used once (epithelial section); oversized margins |
| 785 | `.source-info { margin: 40px auto }` | `margin: 24px auto` | Class defined but appears only in CSS (unused in HTML) — candidate for removal |
| 798 | `.part-divider { margin: 48px auto 24px }` | `margin: 32px auto 16px` | Defined but unused in HTML — candidate for CSS removal |
| 5812, 6088, 6199, 6331, 6418 | `style="margin-top:36px"` on salivary section-headers | Move to CSS class `margin-top: 28px` | Inline margin-top on 5 salivary section headers; inconsistent with other sections' 40px padding-top via class; should all use class, not inline |
| 362–363 | `.guide-footer { padding: 40px 24px 32px; margin-top: 40px }` | `padding: 24px; margin-top: 28px` | Duplicate definition (lines 361–364 vs 836–844). Second definition wins. Both are oversized. |
| 200/214/226 | `.high-yield`, `.explain`, `.callout-danger` each `padding: 18px 20px; margin: 16px 0` | `padding: 14px 18px; margin: 12px 0` | These three callout types all have identical padding/margin but different background colors — they stack heavily when appearing in sequence |

**Duplicate CSS rules (should consolidate):**

| Issue | Lines | Action |
|-------|-------|--------|
| `.guide-footer` defined twice | 361–364 (padding: 40px) and 836–844 (padding: 32px) | Delete first definition; the second (line 836) has corrected values but also uses `border-top: 1px solid var(--border-light)` vs first uses `var(--border)` — keep second |
| `body {}` defined twice | 42–49 (font/color) and 692–694 (padding-top: 54px) | Acceptable split — second is additive, not conflicting. Low priority. |
| `html {}` defined three times | 41 (scroll-padding-top: 80px), 703 (scroll-padding-top: 70px !important), 906 inside @media | The 70px override at line 703 makes the 80px at line 41 dead code — delete line 41's scroll-padding-top only |
| `.card {}` media queries | Lines 371, 386, 466, 498, 511 | Non-conflicting overrides; informational only |

---

## B. Content-Level Bloat (per section)

### sec-infectious

**1. Lines 1773–1776 — Impetigo: Two adjacent prof-emphasis blocks say the same thing**
- Line 1773: "honey-colored crusts and cornflakes — memorize both phrasings for exam"
- Line 1776: "honey-colored crusts was a prime example of slide yellow = board exam target"
- **Action:** Delete line 1775–1777 block (tier-1 wrapper + emphasis). The tier-3 block at 1771–1774 already says everything needed. Savings: ~5 lines / ~320 bytes.

**2. Lines 1852–1856 — Syphilis chancre: Two blocks say "chancre is exam-guaranteed"**
- Line 1852: "memorize 'chancre' — will appear on exams. Both the term and pronunciation are tested."
- Line 1855: "chancre as an exam-guaranteed vocabulary word — stated the term directly and drilled pronunciation."
- **Action:** Delete lines 1854–1856 (tier-1 wrapper). Tier-3 at 1850–1853 is sufficient. Savings: ~4 lines / ~280 bytes.

**3. Lines 1962–1966 — Mandatory reporting: Two consecutive blocks**
- Line 1962: "mandatory reportable diseases will be on the exam — guaranteed"
- Line 1966: "triple 'please' is the signal she reserved for absolute must-knows... This is the highest-urgency memorization target"
- **Action:** Merge into one block. The T3 frame label at line 1964–1965 already explains the "triple please" context. Delete lines 1961–1963 (tier-1 wrapper) and keep tier-3 block only. Savings: ~5 lines / ~350 bytes.

**4. Lines 1944–1949 — Tertiary syphilis: Two blocks for gumma/tabes dorsalis**
- Line 1945: "tabes dorsalis = sexy board term. Memorize: tertiary syphilis → tabes dorsalis"
- Line 1948: "gumma is the term for granulomatous inflammation... palatal perforation is mandatory differential"
- These cover distinct facts. Keep both but these could be combined into a single block with bullet points. No deletion recommended since different content.

**5. Lines 2072–2084 — TB mandatory reporting: FOUR consecutive prof blocks**
- Line 2073: "TB is reportable — triple please — TB joins syphilis"
- Line 2077: "TB reportable with same urgency as syphilis — pairing is testable"
- Line 2080: "TB = medical urgency: isolate → notify DPH → refer ID"
- Line 2083: "suspected TB patient must not be in open dental bays"
- Lines 2080 and 2083 have genuinely distinct clinical content (action sequence vs bay protocol). But lines 2073 and 2077 are near-identical restatements of the same fact.
- **Action:** Delete lines 2075–2078 (tier-3 frame + line 2077 emphasis — the repetition of syphilis pairing). Keep lines 2072–2074, 2079–2084. Savings: ~4 lines / ~300 bytes.

**6. Lines 2128–2136 — Candidiasis types: Two consecutive "know the table" blocks**
- Line 2129: "know the candidiasis types table — she held students responsible for all of them"
- Line 2132: "you will be tested on all of this signal, not a pick-and-choose list"
- **Action:** Delete lines 2131–2133 (tier-1 frame + emphasis). Line 2128–2130 is sufficient. Savings: ~3 lines / ~200 bytes.

**7. Lines 2227–2234 — Clotrimazole/azole: Three consecutive blocks**
- Line 2227: "three times in a row: clotrimazole not for diabetics — WILL ask on exam"
- Line 2230: "triple-drilled clotrimazole-diabetes. Clotrimazole = sugar = contraindicated"
- Line 2234: "triple-drilled azole-liver association"
- First two blocks cover the same fact with slight paraphrasing.
- **Action:** Delete lines 2229–2231 (tier-1 wrapper). Lines 2225–2228 (tier-3 with T3 label) and 2233–2235 (azole-liver) are distinct and sufficient. Savings: ~3 lines / ~210 bytes.

**8. Lines 2281–2284 — HHV taxonomy: Two consecutive blocks**
- Line 2281: "HHV 1–8 taxonomy is fair game on exam"
- Line 2284: "prof taught mnemonic system — use the same hooks she built"
- These are distinct (one is a yield flag; one is the actual mnemonic). Keep both. No deletion needed.

**9. Lines 2300–2303 — V1/V2 distinction: Two consecutive blocks within 4 lines**
- Line 2300: "know the difference between V1 and V2 zoster — V1 carries ocular risk"
- Line 2303: "for V1 zoster: always ask about vision — V1 travels up ophthalmic branch"
- Near-duplicate: both say V1 = ophthalmic risk.
- **Action:** Merge into one block. Delete lines 2299–2301 (tier-1 wrapper). Keep lines 2302–2304. Savings: ~3 lines / ~240 bytes.

**10. Lines 2346–2350 — HSV 48-hour window: Two consecutive blocks**
- Line 2346: "prodrome of itching/tingling/warmth 6–24 hrs before vesicles. Determines antiviral window"
- Line 2350: "48-hour antiviral window — question is whether patient is still within window"
- These are distinct (one describes the prodrome, one flags the clinical decision point). Keep both.

**11. Line 1766–1768 — Impetigo: Verbose q-stem**
- The q-stem contains a full in-transcript quote about what DDx means followed by what the student should say. The meta-commentary ("what does differential diagnosis mean? It's a list...") is not clinical content.
- **Action:** Trim the quote to: `"What diagnosis do you think is most likely for this child?" (line 23)`. Savings: ~6 lines / ~380 bytes.

**12. Lines 2002–2006 — TB: Five consecutive q-stem blocks**
- Five q-stems in a row before clinical content creates a wall of blue boxes. The questions duplicate the 5-step framework answers immediately below at lines 2008–2014.
- **Action:** Wrap the 5 q-stems inside a single `<details class="tier-3-collapse"><summary>Prof's case questions (exam simulation)</summary>` block. Savings: 0 bytes but major visual improvement.

---

### sec-allergies

**1. Line 2598–2634 — Triage framework foundations box with heavy inline styles**
- The entire foundations box uses `style="..."` attributes throughout (flex layout, background colors, padding). There are 14+ inline style attributes inside this box.
- **Action:** Move these 6 inline flex containers to named CSS classes (`.alg-tier-box`, `.alg-tier-t1`, `.alg-tier-t2`, `.alg-tier-t3`). Savings: ~200 bytes of inline style noise; cleaner HTML.

**2. Lines 2640–2662 — Quick nav block uses class="quick-facts" incorrectly**
- `quick-facts` is a CSS grid for stat numbers. The nav block misuses it as a generic container and overrides everything with inline flex styles anyway.
- **Action:** Change class to `"alg-quicknav-wrap"` and move the inline flex styles to CSS. Savings: minimal bytes; semantic clarity gain.

**3. Lines 2803–2810 — Geographic tongue 3D mnemonic: completely inline-styled flex boxes**
- 3 colored boxes with `style="flex:1 1 120px;background:#C0392B;color:#fff;..."` etc.
- **Action:** Extract to `.gt-3d-box` CSS class. Same visual result; cleaner markup. Savings: ~180 bytes inline styles.

---

### sec-epithelial

**1. Line 3841 — Nested `.container` inside `.guide-section-content`**
- This section is the only one that wraps its content in `<div class="container">`, creating double max-width nesting (guide-section-content = 940px, container = 900px).
- **Action:** Remove the `<div class="container">` and its closing tag. Content is already constrained by the parent. Saves: 2 lines / visual inconsistency with other sections removed.

**2. Lines 3870–3872 and 3895–3897 — `prof-highlight` class used 20+ times with no CSS definition**
- `.prof-highlight` appears 20+ times in the epithelial section but has no CSS rule defined anywhere in the file. These divs render as unstyled block elements — plain text with no visual differentiation.
- **Action:** Either add a CSS rule for `.prof-highlight` (e.g., same as `callout-danger`) OR rename these to `<div class="callout-danger">` which already has styling. This is a **visual bug**: these blocks look identical to plain `<p>` tags currently. Savings: depends on fix path chosen.

**3. Lines 3873 and 3947 — `exam-trap` class used 10+ times with no CSS definition**
- Same issue: `.exam-trap` has no CSS rule. Renders as unstyled block. 
- **Action:** Add CSS rule for `.exam-trap` (suggested: `background: var(--danger-light); border-left: 4px solid var(--danger); padding: 14px 18px; border-radius: var(--radius); margin: 12px 0`) or alias to `.callout.warning`.

**4. Section headers with inconsistent `section-number` rendering**
- Epithelial uses numeric `section-number` badges (`01`, `02`, etc.) styled as pills. The main `.section-number` CSS (line 133–138) uses the primary blue background. These match. No issue.

---

### sec-salivary

**1. Lines 5812, 6088, 6199, 6331, 6418 — Inline margin-top:36px on section headers**
- Five salivary section sub-headers have `style="margin-top:36px"` applied inline instead of via class.
- **Action:** Remove all inline `style` attributes from these elements; add `.section-header + .section-header { margin-top: 28px }` or a modifier class `section-header--sub`.

**2. Lines 6095–6195 — Eight Tier-3 collapse blocks**
- All 8 T3 blocks in the salivary section are properly scoped to `#sec-salivary`. Good.
- Content lengths are substantive (all > 200 chars). No thin T3 blocks found in salivary.

**3. Lines 5449–5482 — Two adjacent `prof-emphasis` blocks within 5 lines (lines 3524, 3528)**
- (Confirmed from cluster scan.) Check context:
  - These are in the salivary section. From the raw scan result: CLUSTER at lines 3524–3528. This is inside sec-allergies (OLP section), not salivary.

---

### sec-notecard-v2

- Notecard section uses the `.nc` component system with `.nc-card`, `.nc-cols`, `.nc-col` — all properly defined and used. No structural bloat.
- The `l1-backfill` style block (lines 1440–1488) contains a complete `.nc-embed` mini-system with 48 CSS rules. This is used only in the notecard section and is self-contained. Acceptable.
- No redundant content found in notecard section.

---

## C. Visual Hierarchy Issues

| Location | Issue | Suggested Fix |
|----------|-------|---------------|
| `guide-section-divider` banners (lines 1700, 2586, 3832, 5415, 6452) | Each section opens with a full-bleed dark gradient banner (`padding: 48px 40px 40px`). Five of these in one document creates visual monotony and excessive vertical consumption (~88px each = 440px total for banners alone). | Reduce to `padding: 28px 32px 24px`. The banners will still read clearly as section breaks. |
| Section headers inside epithelial (lines 3845, 3881, 3954, etc.) | Some use `.section-number` as blue pill badges (`01`, `02`…). Others in other sections use the same class as a text label ("PART 1 OF 5"). Inconsistent visual language for the same CSS class. | Acceptable — section-scoped. Informational note only. |
| Lines 2601–2633 (allergies tier framework) | Three colored boxes (`#FFEAEA`, `#FFF3CD`, `#EDE7F6`) as inline-styled flex children inside a `.foundations-box`. This creates a 4-background-color stack: outer warm-white bg → dark gradient divider above → light card → 3 colored boxes. Rainbow effect in opening of allergies section. | Move to CSS classes (`.alg-tier-t1 / t2 / t3`) with slightly less saturated backgrounds that harmonize with the Atlas Console palette. |
| Lines 2808–2823 (3D mnemonic) | Three bright `#C0392B` red boxes as full-color fill tiles. On the warm off-white background, these are jarring. | Replace solid fill with `background: #FFEAEA; color: #C0392B; border: 2px solid #C0392B` (light fill + colored border). Same visual identity, dramatically less visual weight. |
| `.section-header { padding: 40px 0 0 }` | Creates 40px of blank white space before every section title within a section. When multiple section-headers appear in sequence (epithelial has 20+), the page reads as alternating wide gaps and dense content blocks. | Reduce to `padding: 24px 0 0`. |
| `figcaption` margins: `.guide-section-content figcaption { margin-top: 8px; padding: 0 8px }` vs section-scoped `#sec-infectious figure.clinical-img figcaption { margin-top: 12px; padding: 0 4px }` | Two different figcaption rules for the same elements — the scoped rule (12px margin, 4px padding) overrides the generic (8px margin, 8px padding). Result: infectious section figures have different caption spacing than epithelial. | Consolidate to one rule. Keep the scoped `margin-top: 10px; padding: 0 6px` as the canonical value. |
| Desktop tab bar | `progress-nav` uses `flex` with no overflow constraint at large viewports. At 1400px+ wide, tabs spread to fill — text becomes sparse and looks broken. | Add `max-width: 900px` to `.progress-nav` wrapper. |

---

## D. Redundant prof-emphasis Stacking

The file contains **12 large clusters** (4+ consecutive prof blocks within 5 lines of each other). The worst offenders:

| Lines | Cluster Size | Description | Action |
|-------|-------------|-------------|--------|
| 2067–2084 | **10 blocks** | TB mandatory reporting — 4 prof-flag-tier + prof-emphasis stacks, 3 of which say "TB is reportable" | Delete lines 2075–2078. Keep 4 blocks → 8 blocks → trimmed to 6. |
| 2225–2240 | **8 blocks** | Clotrimazole/azole — 3 tier flags + 3 emphases repeating "clotrimazole = no diabetics" | Delete one duplicate (lines 2229–2231). |
| 2123–2136 | **7 blocks** | Candidiasis types "know this table" — 2 nearly identical tier-1 emphasis blocks + orphaned T3 label | Delete lines 2131–2133. |
| 1850–1856 | **4 blocks** | Chancre = exam word — two emphases say the same thing | Delete tier-1 block at 1854–1856. |
| 1961–1966 | **4 blocks** | Mandatory reporting — tier-1 + tier-3 both say "guaranteed exam" | Delete tier-1 block at 1961–1963. |
| 1771–1786 | **4 blocks** | Impetigo honey crusts — tier-3 + tier-1 + tier-2, first two are near-identical | Delete tier-1 at 1775–1777. |
| 2280–2284 | **4 blocks** | HHV taxonomy — these cover distinct content (yield flag vs mnemonic). Keep both. |
| 2299–2303 | **4 blocks** | V1 vs V2 distinction — both say "V1 = ophthalmic risk" | Delete tier-1 at 2299–2301. |
| 2415–2419 | **4 blocks** | CMV DDx — "GI pain favors CMV" + "CMV and EBV are a pair" — distinct content. Keep both. |
| 2044–2054 | **5 blocks** | TB treatment — "isoniazid + rifampin appear on every exam" + DOT explanation + miliary mnemonic — all distinct. Keep all. |
| 1944–1948 | **4 blocks** | Gumma + tabes dorsalis — different facts (distinct terms). Keep both. |
| 3182–3183 | **2 blocks** | OLP steroid lip rule + clobetasol/dex commit — these are adjacent and both HIGH yield. Keep both. |

**Net deletable clusters: 8 pair-merges → removes ~28 lines of duplicate prof blocks**

---

## Top 10 Highest-Impact Fixes

1. **`guide-section-divider` padding** [line 647] — Reduce `padding: 48px 40px 40px` → `32px 32px 28px`. Five banners × ~16px saved each = 80px of vertical air removed. **~0 bytes / high visual impact.**

2. **`prof-highlight` + `exam-trap` unstyled classes** [lines 3870+, 3873+] — Add CSS rules for these 2 classes (30+ total elements across epithelial). Without CSS these are invisible-on-white blocks. **Bug fix + zero byte cost.**

3. **TB mandatory reporting 10-block cluster** [lines 2067–2084] — Delete 4 lines / ~300 bytes of redundant "TB is reportable" restatements. **~300 bytes / highest concentration of repetition in the file.**

4. **`.section-header` top padding** [line 129] — Reduce `padding: 40px 0 0` → `24px 0 0`. Epithelial alone has 20+ section headers, each contributing 40px of blank space. **~0 bytes / major rhythm improvement.**

5. **Duplicate `.guide-footer` definition** [lines 361–364 vs 836–844] — Delete first definition (6 lines / ~120 bytes). Second definition is correct. **~120 bytes.**

6. **Candidiasis duplicate "know the table" blocks** [lines 2128–2136] — Delete lines 2131–2133. **~200 bytes / clean repetition removal.**

7. **Clotrimazole duplicate block** [lines 2229–2231] — Delete tier-1 block. **~210 bytes / clean repetition.**

8. **Chancre duplicate "exam-guaranteed" blocks** [lines 1854–1856] — Delete tier-1 block. **~280 bytes / clean repetition.**

9. **Five salivary inline `margin-top:36px` → CSS class** [lines 5812, 6088, 6199, 6331, 6418] — Removes 5 inline style attributes; standardizes section sub-header spacing. **~75 bytes / maintainability.**

10. **Figcaptions over 400 chars** [~12 captions] — Cap at 2 sentences for standard figcaptions; move excess scientific context to a `<details>` reveal or trim entirely. The six longest (lines 1927, 1955, 2110, 2195, 2359, 2404, 2506, 2546) average 580 chars and read as research-paper footnotes rather than visual anchors. **~2,800 bytes saved / reading-speed improvement.**

---

## Bonus: Unused CSS Components (Dead Rules)

These CSS classes are defined but have **zero HTML usages** in the merged guide. Safe to delete their definitions:

| Class | Defined at | Bytes wasted |
|-------|-----------|--------------|
| `.source-info` | line 782–792 | ~130 bytes |
| `.part-divider` + `.part-divider .part-label` + `.part-divider h2` + `.part-divider .part-tag` | lines 796–819 + 1313–1316 | ~280 bytes |
| `.grade-scale` + `.grade-item.*` | lines 1152–1168 | ~220 bytes |
| `.phase-list` + `.phase-item` | lines 1170–1191 | ~240 bytes |
| `.objectives` + `.obj-item` + `.obj-check.*` | lines 1266–1284 | ~260 bytes |
| `.figure-row` + `.dark-fig` | lines 1209–1212 | ~80 bytes |
| `.section-divider` (4px gradient hr) | lines 1214–1218 | ~80 bytes |
| `.step` + `.step-num` + `.step-content` | lines 1251–1264 | ~180 bytes |
| `.quick-facts-item` | used only 5× for 5-step list; no CSS definition exists anyway | N/A — add or alias |

**Total unused CSS removable: ~1,470 bytes / ~35 lines**
