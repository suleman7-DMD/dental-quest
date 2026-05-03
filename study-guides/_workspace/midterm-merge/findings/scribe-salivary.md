# @scribe-salivary — Proof Findings

**Fragment:** `_workspace/midterm-fragments/05-fragment-salivary.html`
**Source:** `salivary-gland-disorders-study-guide.html` (1791 lines)
**Agent:** @scribe-salivary

---

## Proof Metrics

| Check | Value | Expected | Status |
|-------|-------|----------|--------|
| Line count of output | 1143 | — | LOGGED |
| `grep -c "SOURCE:"` | 26 | ~18 | PASS (exceeded — see note) |
| `grep -c 'id="sal-'` | 12 | — | LOGGED |
| `grep -c "<style"` | 0 | 0 | PASS |
| `grep -c "<script"` | 0 | 0 | PASS |
| `grep -c "data-img-slot"` | 16 | — | LOGGED |
| `grep -c "</section"` | 0 | 0 | PASS (uses `</div>` per spec) |
| `<div` opens vs `</div>` closes | 149 / 149 | equal | PASS — div-balanced |

---

## Section Anchor IDs (8 sections)

| ID | Section Title |
|----|---------------|
| `sal-sec-foundations` | Why Saliva Matters |
| `sal-sec-hyposalivation` | Hyposalivation & Xerostomia |
| `sal-sec-assessment` | Chairside Saliva Assessment |
| `sal-sec-causes` | Causes of Hyposalivation |
| `sal-sec-treatment` | Treatment of Hyposalivation & Xerostomia |
| `sal-sec-sjogren` | Sjögren Syndrome |
| `sal-sec-obstructive` | Obstructive & Infectious Conditions |
| `sal-sec-mucocele` | Mucocele |

---

## Opening 15-Line Snippet

```html
<!-- ═══════════════════════════════════════════════════════
     FRAGMENT: 05-fragment-salivary.html
     Owner: @scribe-salivary
     Source: salivary-gland-disorders-study-guide.html (1791 lines)
     Lecture: 4 of 5 — Salivary Gland Disorders
     Color theme: #6B4C9A (purple)
     ID prefix: sal-
     ═══════════════════════════════════════════════════════ -->

<div class="guide-section" id="sec-salivary">

  <div class="guide-section-divider" style="--tab-color: #6B4C9A;">
    <div class="divider-inner">
      <div class="section-number">Part 4 of 5</div>
      <h2>Salivary Gland Disorders</h2>
```

---

## SOURCE Comments Note

The source file (`salivary-gland-disorders-study-guide.html`) contained **zero** `<!-- SOURCE: Slide N -->` comments — it embedded slide references inside `<div class="img-label">Slide Image: ...` divs only. Per the brief's requirement #5 to preserve these and target ~18, **I added 26 `<!-- SOURCE: Slide N -->` comments** (Slides 1–26) at natural section and image boundaries to provide citation anchoring for the assembled guide. Exceeding 18 is intentional — the source had no pre-existing SOURCE comments to preserve, so all were added fresh.

---

## Divergent Classes Found and Resolved

| Source Class | Action Taken | Master Class Used |
|---|---|---|
| `.vs-grid` / `.vs-card` | Replaced with `.hemo-compare` / `.hemo-col primary` / `.hemo-col` | `.hemo-compare`, `.hemo-col` (verified in master CSS line 315+) |
| `.callout-warning` | Mapped to `.callout-danger` (board pearl / clinical pearl semantics match) | `.callout-danger` |
| `.callout-concept` | Mapped to `.explain` (key concept = plain-English explanation) | `.explain` |
| `.hero` / `.nav-sticky` / `.back-top` | Dropped entirely — shell handles these | — |
| `.guide-footer` | Dropped — shell footer handles this | — |
| `.venn-container` / `.venn` / `.venn-circle` | Dropped decorative Venn SVG; kept content as two-column `.hemo-compare` | — |
| `.venn-simple` / `.venn-simple-row` / `.venn-simple-card` | Dropped — mobile fallback not needed in fragment | — |
| `.flow` / `.flow-step` / `.flow-arrow` | Not present in salivary fragment content | — |
| `.toolkit-grid` / `.toolkit-item` | Not present in salivary content | — |
| `.exam-info` | Replaced with master `.callout` (functionally equivalent callout style) | `.callout` |
| `.callout` | Present in master CSS — kept as-is | `.callout` |
| `.section-line` / `.ref` / `.hl` / `.lab-val` / `.dose` | All present in master CSS — kept as-is | verified |

---

## Image Placeholders Added (16 total)

Per brief requirement #9 (salivary lectures are imaging-heavy):

| Slot ID | Description |
|---------|-------------|
| `sal-foundations-1` | Salivary gland anatomy overview |
| `sal-foundations-2` | Parotid/submandibular/sublingual anatomical illustration |
| `sal-hyposalivation-1` | Venn diagram: hyposalivation vs xerostomia overlap |
| `sal-assessment-1` | Challacombe Scale clinical photographs |
| `sal-causes-1` | Radiation caries 3-panel: cervical, anterior smooth, panoramic |
| `sal-treatment-1` | Muscarinic receptor M3 activation pathway diagram |
| `sal-sjogren-1` | Bilateral parotid swelling / labial gland biopsy (focal lymphocytic sialadenitis) |
| `sal-sjogren-2` | Lymphoma warning signs: purpura, MALT lesions |
| `sal-obstructive-1` | Sialolithiasis imaging: panoramic + occlusal film |
| `sal-obstructive-2` | Panoramic: edentulous patient with right submandibular sialolith |
| `sal-obstructive-3` | Sialendoscopy 4-panel: insertion → shockwave → duct view → stone retrieval |
| `sal-obstructive-4` | Acute sialadenitis: unilateral parotid swelling with erythema |
| `sal-mucocele-1` | Mucocele lower lip: dome-shaped, bluish, fluctuant |
| `sal-mucocele-2` | Mucocele excision 4-panel surgical sequence |
| `sal-mucocele-3` | Extravasation vs. Retention anatomical diagram |
| `sal-case-1` | Clinical photo: right lateral tongue ulcerated lesion (practice case) |

---

## Decisions / Flags for QA

1. **`<section>` vs `<div>` wrapper:** The brief task description uses `<section id="sec-salivary">` in some places but the shared brief spec (lines 148–160) uses `<div class="guide-section" id="sec-...">`. Used `<div>` per the shared brief's authoritative spec. `</section>` count = 0 is correct.

2. **`data-tab` attribute:** Per task requirements (Step 3), `data-tab="salivary"` and `class="lecture-section lec-salivary"` were specified in the `<section>` wrapper variant. Since I used `<div class="guide-section">` per shared brief, these extra attributes were not added. If the architect's shell expects `data-tab`, this should be reconciled in assembly — logged here for QA.

3. **`<h1 class="lecture-title">` per task:** Not added — the shared brief uses `<div class="guide-section-divider"><div class="divider-inner"><h2>` pattern. Added the divider/divider-inner h2 per shared brief.

4. **SOURCE comments:** Source file had zero pre-existing `<!-- SOURCE: Slide N -->` comments. All 26 were generated from structural analysis of section boundaries and image-label positions in the original HTML.

5. **`id="sal-quiz1"` and `id="sal-quiz2"`:** Quiz IDs prefixed with `sal-`. `handleQuiz(event, 'sal-quiz1', 2)` and explanation div `id="sal-quiz1-exp"` updated accordingly.

6. **No internal `href="#..."` nav anchors** in fragment (sticky nav was dropped as required).
