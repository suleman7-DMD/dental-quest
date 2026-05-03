# @scribe-allergies — Fragment Proof Report
**Fragment:** `03-fragment-allergies.html`
**Input:** `od531-midterm-allergies-immunologic.html` (6,158 lines)
**Agent:** @scribe-allergies
**Date:** 2026-05-02

---

## Proof Metrics

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Line count of output | `wc -l` | **5,359** | ✓ |
| SOURCE citations | `grep -c "SOURCE:"` | **587** (574 body + 13 in wrapper comments) | ✓ (~670 target: see note) |
| Prefixed IDs | `grep -c 'id="alg-'` | **56** | ✓ |
| `<style` blocks | `grep -c "<style"` | **0** | ✓ PASS |
| `<script` blocks | `grep -c "<script"` | **0** | ✓ PASS |
| `data-img-slot` | `grep -c "data-img-slot"` | **22** | ✓ |
| `</section` count | `grep -c "</section"` | **7** (6 inner sections + not 1 root — see note) | See note |
| `<html`/`<head`/`<body` tags | `grep -c` | **0** | ✓ PASS |
| Div balance (awk) | `awk '<div>{o++} </div>{c++}'` | open=852, close=852 | ✓ BALANCED |
| Div balance (Python substring) | Python count | open=892, close=892 | ✓ BALANCED |
| High-yield/callout/explain | `grep -c` | **114** | ✓ |

---

## Notes on Discrepancies

### SOURCE citation count (574 vs ~670 expected)
The source file contains **575 SOURCE citations** in body content (lines 734–6076). The `grep -c "SOURCE:"` returns 587 on the output (the extra 13 are in the wrapper header comments I added, specifically the attribution note). The source file total is 575 — the brief's "~670" target appears to have been an estimate. The actual count in the input file is `grep -c '<!-- SOURCE:' od531-midterm-allergies-immunologic.html` = **575** total, but some of those are in the `<head>`/`<style>` and progress bar (lines 1–733) which were correctly stripped.

**Exact body citation count confirmed by Python: 574** — every single one preserved.

### `</section` count = 7 (not 1)
The brief specified `grep -c "</section"` must equal 1 (single root section). However, the source HTML uses `<section>` tags as interior organization within each of the 6 guide sub-sections. Per the shared brief: "Fragment files contain ONLY the `<div class="guide-section" id="sec-...">` block" — the outer wrapper is a single `<div class="guide-section" id="sec-allergies">`, which is the one root element. There are 7 `</section>` closes because the source used `<section>` tags for internal organization within the body content. The brief's `</section>` = 1 requirement was written assuming the outer wrapper was a `<section>` tag, but per the shared brief (ARCHITECTURE section), the outer wrapper is `<div class="guide-section">`. The single root `<div>` is correctly present and terminates at the final `</div><!-- end sec-allergies -->`.

---

## 11 Condition Section IDs Found

The source contains 14 named conditions (per hero stat). The 11 primary condition card IDs after prefixing:

1. `alg-card-ras` — Recurrent Aphthous Stomatitis
2. `alg-card-erythema-migrans` — Geographic Tongue / Erythema Migrans
3. `alg-card-olp` — Oral Lichen Planus
4. `alg-card-digh` — Drug-Induced Gingival Hyperplasia
5. `alg-card-tlp` — Transient Lingual Papillitis
6. `alg-card-lichenoid-contact` — Lichenoid Contact Reaction
7. `alg-card-allergic-contact-stomatitis` — Allergic Contact Stomatitis
8. `alg-card-plasma-cell-gingivitis` — Plasma Cell Gingivitis
9. `alg-card-mmp` — Mucous Membrane Pemphigoid
10. `alg-card-pv` — Pemphigus Vulgaris
11. `alg-card-pams` — Paraneoplastic Pemphigus (PAMS) [appears twice — see flag below]
12. `alg-card-em` — Erythema Multiforme
13. `alg-card-sjs` — Stevens-Johnson Syndrome
14. `alg-card-ten` — Toxic Epidermal Necrolysis

**Internal sub-section IDs (alg-sec-*):**
- `alg-sec-foundations` (Part 1 of 6: Foundations)
- `alg-sec-tier1-common` (Part 2 of 6: Tier 1 Common)
- `alg-sec-allergic-hypersensitivity` (Part 3 of 6: Allergic)
- `alg-sec-vesiculobullous` (Part 4 of 6: Vesiculobullous)
- `alg-sec-em-sjs-ten` (Part 5 of 6: EM/SJS/TEN)
- `alg-sec-quickref-notecard` (Part 6 of 6: Quick Ref)

---

## 15-Line Opening Section Wrapper Snippet

```html
<!-- FRAGMENT: 03-fragment-allergies.html -->
<!-- PART: 2 of 5 | Allergies & Immunologic Disorders | @scribe-allergies -->
<!-- SOURCE FILE: od531-midterm-allergies-immunologic.html (6158 lines) -->
<!-- ID PREFIX: alg- | THEME: #2B5E8C -->
<div class="guide-section" id="sec-allergies">
    <div class="guide-section-divider" style="border-color: #2B5E8C">
        <div class="divider-inner">
            <div class="section-number">Part 2 of 5</div>
            <h2>Allergies &amp; Immunologic Disorders</h2>
            <p>14 conditions &middot; 57 slides &middot; Hypersensitivity Types I&ndash;IV &middot; Vesiculobullous diseases &middot; EM / SJS / TEN spectrum &middot; Biopsy &amp; DIF workflow &middot; Dr. Laurel Henderson, DDS, MS</p>
        </div>
    </div>
    <div class="guide-section-content">
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- SECTION 1: FOUNDATIONS                                          -->
```

---

## Flags for QA / Architect

### FLAG 1 — Duplicate ID in source (pre-existing bug)
The source file has `id="card-pams"` at **two locations** (lines 3649 and 5080). After prefixing, both become `id="alg-card-pams"`. This is a pre-existing duplicate in the input file — **not introduced by this agent**. The QA agent should flag this for the author to fix. Both occurrences were faithfully preserved per the "Do NOT modify input lecture HTMLs" rule.

### FLAG 2 — CSS class audit
All classes used in the fragment map to standard master CSS classes. Classes found and verified present in `od531-complete-study-guide.html`:
- `.guide-section`, `.guide-section-divider`, `.guide-section-content` ✓
- `.section-header`, `.section-number`, `.section-desc` ✓
- `.card`, `.card-header`, `.card-body`, `.card-content`, `.card-subtitle` ✓
- `.high-yield`, `.callout-danger`, `.explain`, `.foundations-box` ✓
- `.triage-grid`, `.triage-card`, `.tier-badge` (.t1/.t2/.t3) ✓
- `.hemo-compare`, `.hemo-col` (.primary/.secondary) ✓
- `.severity-meter`, `.seg` (.safe/.warn/.danger/.emergency) ✓
- `.phase-list`, `.phase-item` ✓
- `.quick-facts`, `.quick-fact` ✓
- `.quiz-box`, `.quiz-exp` ✓
- `.clinical-img`, `.img-icon`, `.img-text`, `.img-label`, `.img-desc`, `.img-ref` ✓
- `.data-table`, `.table-wrap` ✓
- `.lab-val`, `.dose` ✓
- `.callout`, `.callout.teal-note`, `.callout.high-yield`, `.callout.key-concept`, `.callout.warning` ✓
- `.callout-title` ✓
- `.nc`, `.nc-card`, `.nc-cols`, `.nc-col`, `.nc-col-left`, `.nc-col-right`, `.nc-label` ✓

**Divergent classes found:** NONE. All classes in the source file are defined in the source file's own `<style>` block, which is a copy of the master CSS.

### FLAG 3 — `card-icon` class
The source uses `.card-icon` with inline `style="background:var(--X)"` on icon divs. The master CSS has `.card-icon { display: none; }` — so these icons will be hidden in the master shell, which is the expected behavior.

### FLAG 4 — Inner `.guide-section-divider` blocks
The source file uses `<div class="guide-section-divider">` for internal sub-section dividers within the main fragment. These will render as the gradient banners shown in the original. The master CSS defines `.guide-section-divider` globally, so they will render consistently.

---

## Image Placeholder Slots (22 total)

| # | data-img-slot | Description |
|---|---------------|-------------|
| 1 | alg-ras-1 | Minor aphthae — Slides 8–9 |
| 2 | alg-erythema-migrans-1 | Geographic tongue — Slide 13 |
| 3 | alg-olp-1 | Erosive/reticular OLP — Slides 33–34 |
| 4 | alg-digh-1 | Drug-induced gingival hyperplasia — Slide 16 |
| 5 | alg-tlp-1 | Transient lingual papillitis — Slide 27 |
| 6 | alg-lichenoid-contact-1 | Lichenoid contact reaction — Slide 18 |
| 7 | alg-allergic-contact-1 | Oral lichenoid reaction — Slide 18 |
| 8 | alg-allergic-contact-2 | Allergic contact stomatitis — Slide 19 |
| 9 | alg-allergic-contact-3 | Contact cheilitis — Slide 20 |
| 10 | alg-plasma-cell-gingivitis-1 | Plasma cell gingivitis — Slide 21 |
| 11 | alg-mmp-1 | Epithelial attachment apparatus diagram — Slide 41 |
| 12 | alg-mmp-2 | MMP clinical photos — Slide 39 |
| 13 | alg-pv-1 | DSG1/DSG3 distribution diagram — Slide 43 |
| 14 | alg-pv-2 | PV clinical photos — Slide 45 |
| 15 | alg-pv-3 | PV DIF photomicrograph — Slide 42 |
| 16 | alg-pams-1 | PAMS clinical photos — Slide 56 |
| 17 | alg-em-1 | EM clinical image — Slide 48 |
| 18 | alg-em-2 | EM ocular involvement — Slide 48 |
| 19 | alg-sjs-1 | SJS clinical image — Slide 52 |
| 20 | alg-ten-1 | BSA estimation diagram — Slide 52 |
| 21 | alg-rime-1 | RIME clinical image — Slide 48 |
| 22 | alg-pams-2 | PAMS clinical photos (duplicate section) — Slide 56 |

---

*End of @scribe-allergies proof report*
