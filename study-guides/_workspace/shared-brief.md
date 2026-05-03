# Shared Author Brief — OD531 Midterm Allergies & Immunologic Study Guide

**You are one of multiple parallel agents building a single HTML study guide. Read this brief end-to-end before writing any HTML.**

---

## ZERO-HALLUCINATION CONTRACT

- Every clinical fact must be sourced from the PDF: `/Users/suleman/Downloads/Oral-MED-Midterm-Allergies-and-immunologic-diseases.pdf`
- Every `.high-yield`, `.callout-danger`, `.explain` block, table cell, dose, percentage, or named entity must carry `<!-- SOURCE: Slide N -->` immediately before or inside the element
- The audit report at `/Users/suleman/dental-quest/study-guides/_workspace/audit-report.md` is your CANONICAL source. It transcribes every prof-highlighted item with slide numbers. Use it.
- If you need a fact that isn't in the audit report, OPEN the PDF (use Read tool with `pages` parameter, max 20 pages per call) and verify directly. Cite the slide.
- **Plain-English explainers** (`.explain` blocks) may use general medical knowledge to translate jargon for a struggling D3, but must NOT invent specifics not on the slides. Mark these `<!-- EXPLAINER: general -->` so QA audits them differently.
- If you can't source a claim, DROP IT. Don't make stuff up.

---

## DESIGN SYSTEM (from od531-condensed-study-guide.html — DO NOT INVENT NEW CSS)

### CSS variable palette (already loaded in the page CSS — just use the classes below)
- `--bg: #FAF8F4` (warm off-white)
- `--text: #1B2838` (deep navy)
- `--primary: #2B5E8C` (slate blue)
- `--accent: #C8923E` (gold)
- `--success: #2E7D5B` (forest green)
- `--danger: #B5483B` (terracotta red)
- `--purple: #6B4C9A`
- `--teal: #1A8A7D`

### Typography
- Headings: `Crimson Pro` (serif) — already linked
- Body: `Karla` (sans) — already linked
- Numbers/labels: `JetBrains Mono` — already linked

### Component classes you MUST use (don't invent new ones)

```html
<!-- Section -->
<section id="kebab-id">
  <div class="section-header">
    <span class="section-number">Section 0X</span>
    <h2>Topic Name</h2>
    <p class="section-desc">Tier — Description</p>
  </div>
  <!-- cards go inside section -->
</section>

<!-- Disease card -->
<div class="card open" id="card-disease">
  <div class="card-header">
    <div class="card-icon" style="background:var(--accent)">&#119823;</div>
    <div class="card-header-text">
      <h3>Disease Name <span class="tier-badge t1">Tier 1</span></h3>
      <span class="card-subtitle">One-line definition</span>
    </div>
  </div>
  <div class="card-body">
    <div class="card-content">
      <!-- All content goes here -->
    </div>
  </div>
</div>

<!-- Quick stats row -->
<div class="quick-facts">
  <div class="quick-fact"><span class="number">~80%</span><span class="label">Minor variant</span></div>
</div>

<!-- Plain English explainer (gold/lightbulb) -->
<div class="explain">
  <p>Layman explanation here.</p>
</div>

<!-- High Yield (green/star) -->
<div class="high-yield">
  <p>Prof's emphasized fact <strong>verbatim</strong>.</p>
</div>

<!-- Clinical Pearl (purple/staff) -->
<div class="callout-danger">
  <p>Critical pathognomonic finding.</p>
</div>

<!-- Teal note (dental relevance) -->
<div class="callout teal-note">
  <div class="callout-title">DENTAL RELEVANCE</div>
  <p>Why this matters in practice.</p>
</div>

<!-- Severity meter -->
<div class="severity-meter">
  <div class="seg safe"><span class="seg-label">MILD</span><span class="seg-val">value</span></div>
  <div class="seg warn"><span class="seg-label">MODERATE</span><span class="seg-val">value</span></div>
  <div class="seg danger"><span class="seg-label">SEVERE</span><span class="seg-val">value</span></div>
</div>

<!-- Comparison columns (2-up) -->
<div class="hemo-compare">
  <div class="hemo-col primary">
    <h4>Thing A</h4>
    <ul><li>...</li></ul>
  </div>
  <div class="hemo-col secondary">
    <h4>Thing B</h4>
    <ul><li>...</li></ul>
  </div>
</div>

<!-- Phase list (numbered workup steps) -->
<ul class="phase-list">
  <li class="phase-item" data-phase="1"><h5>Step</h5><p>Description</p></li>
</ul>

<!-- Data table -->
<div class="table-wrap">
  <table class="data-table">
    <thead><tr><th>Col A</th><th>Col B</th></tr></thead>
    <tbody><tr><td>...</td><td>...</td></tr></tbody>
  </table>
</div>

<!-- Lab value pill (purple monospace) -->
<span class="lab-val">DIF</span>

<!-- Drug dose pill (teal monospace) -->
<span class="dose">Triamcinolone 0.1% paste QID</span>

<!-- Tier badge -->
<span class="tier-badge t1">Tier 1</span>  <!-- t1=red, t2=gold, t3=green -->

<!-- Triage grid -->
<div class="triage-grid">
  <div class="triage-card tier1">
    <h4>Tier 1</h4>
    <ul><li>Disease A</li></ul>
  </div>
  <!-- repeat for tier2, tier3 -->
</div>

<!-- Foundations box (use BEFORE a section that uses the concept) -->
<div class="foundations-box">
  <span class="section-number">Before we start</span>
  <h3>Concept name</h3>
  <p class="found-sub">One-line subtitle</p>
  <div class="explain"><p>Layman intro</p></div>
  <!-- comparison or content -->
</div>

<!-- Clinical image PLACEHOLDER (no actual <img> — images come later) -->
<div class="clinical-img">
  <div class="img-icon">&#128247;</div>
  <div class="img-text">
    <div class="img-label">Clinical image — Slide N</div>
    <div class="img-desc">Description of what the image shows for the student to recall visually.</div>
    <div class="img-ref">Source: PDF Slide N</div>
  </div>
</div>

<!-- Quiz box -->
<div class="quiz-box">
  <h4>Question text?</h4>
  <ol>
    <li onclick="handleQuiz(this, false)">A. wrong</li>
    <li onclick="handleQuiz(this, true)">B. right</li>
  </ol>
  <div class="quiz-exp"><p>Explanation here.</p></div>
</div>
```

### Special chips for "Board Favorite" labels
Use this inline span: `<span class="tier-badge" style="background:#FEF7EC;color:#A87730;border:1px solid #C8923E">Board Favorite</span>`

---

## PER-DISEASE TEMPLATE (every disease card MUST have this skeleton)

```html
<!-- ═══ DISEASE NAME ═══ -->
<div class="card open" id="card-...">
  <div class="card-header">
    <div class="card-icon">[icon]</div>
    <div class="card-header-text">
      <h3>Disease Name <span class="tier-badge t1">Tier 1</span></h3>
      <span class="card-subtitle">One-line definition (what it is in plain English)</span>
    </div>
  </div>
  <div class="card-body"><div class="card-content">

    <!-- 1. QUICK FACTS — numerical anchors -->
    <div class="quick-facts">...</div>

    <!-- 2. PLAIN ENGLISH — for the struggling D3 -->
    <div class="explain">
      <!-- EXPLAINER: general -->
      <p>Translation of jargon. What's actually happening biologically.</p>
    </div>

    <!-- 3. HIGH YIELD — prof's emphasized facts (verbatim from audit) -->
    <div class="high-yield">
      <!-- SOURCE: Slide N -->
      <p>Verbatim red-box content.</p>
    </div>

    <!-- 4. CLINICAL FEATURES — bullet list or severity meter -->
    <h4>Clinical Features</h4>
    <ul>...</ul>

    <!-- 5. CLINICAL IMAGE PLACEHOLDER -->
    <div class="clinical-img">...</div>

    <!-- 6. WORKUP — phase list -->
    <h4>Workup / Diagnosis</h4>
    <ul class="phase-list">...</ul>

    <!-- 7. DIFFERENTIAL or COMPARISON (where applicable) -->
    <div class="hemo-compare">...</div>

    <!-- 8. TREATMENT — table or callout with .dose pills -->
    <h4>Treatment</h4>
    <div class="callout high-yield">
      <div class="callout-title">TREATMENT LADDER</div>
      <ul>...</ul>
    </div>

    <!-- 9. DENTAL RELEVANCE (teal-note) -->
    <div class="callout teal-note">
      <div class="callout-title">DENTAL RELEVANCE</div>
      <p>Why the dentist cares.</p>
    </div>

    <!-- 10. CLINICAL PEARL (callout-danger) where pathognomonic finding exists -->
    <div class="callout-danger">
      <!-- SOURCE: Slide N -->
      <p>Pathognomonic anchor.</p>
    </div>

  </div></div>
</div>
```

Not every card needs every block — but the blocks you DO include must use these exact classes.

---

## VOICE / TONE

- **Audience:** D3 dental student with a poor grasp of immune-mediated mucosal disease but solid clinical fundamentals
- **Goal:** crammable but fully detailed; layman terms but scientifically rigorous
- **Plain-English (.explain) blocks:** translate jargon. "Desmoglein" → "the protein glue holding skin cells together." "Subepithelial blistering" → "the whole top layer of skin lifts off as one sheet — like peeling a sticker."
- **High-yield (.high-yield) blocks:** preserve the prof's exact wording. Don't paraphrase. If audit says verbatim, copy verbatim.
- **No fluff, no padding.** If something doesn't help comprehension, recall, or organization, cut it.
- **Conservative use of foundational explainers.** Use `.foundations-box` ONLY where multiple downstream diseases need the same concept (e.g., "subepithelial vs intraepithelial," "Type I vs IV hypersensitivity," "DIF/IIF basics"). Don't add a foundations box for every disease.

---

## OUTPUT INSTRUCTIONS

- Write your fragment as a complete `.html` file in `/Users/suleman/dental-quest/study-guides/_workspace/midterm-fragments/[your-filename].html`
- Your fragment should be JUST the content sections you own — do NOT include `<html>`, `<head>`, `<body>`, or `<style>` tags. The frame builder will inject your fragment between `<!-- SLOT: section-N -->` markers.
- Wrap each major section in a `<!-- ═══ TOPIC NAME ═══ -->` comment for navigability
- Include a header comment at the top of your file:

```html
<!--
  FRAGMENT: [your-section-name]
  AUTHOR: [@your-handle]
  PDF SOURCE: /Users/suleman/Downloads/Oral-MED-Midterm-Allergies-and-immunologic-diseases.pdf
  SLIDES COVERED: [list slide numbers]
  AUDIT SOURCE: /Users/suleman/dental-quest/study-guides/_workspace/audit-report.md
  GENERATED: [date]
-->
```

- After writing, output a SHORT summary back to the orchestrator: (1) filename written, (2) line count, (3) sections covered, (4) high-yield blocks count, (5) any facts you couldn't source

---

## ANTI-PATTERNS (do not do)

- ❌ Writing your own `<style>` block — all CSS lives in the frame; just use the existing classes
- ❌ Inventing CSS class names — use only the ones in the cheat sheet above
- ❌ Inserting `<img src="...">` tags — use `.clinical-img` placeholder boxes only
- ❌ Paraphrasing prof-highlighted text — copy verbatim
- ❌ Adding facts not in the audit report or PDF
- ❌ Using rounded percentages where the audit gives exact ones (e.g., write "61-70%" not "~65%")
- ❌ Skipping `<!-- SOURCE: Slide N -->` comments
- ❌ Including the closing Camus quote (slide 57) — user explicitly excluded
- ❌ Writing prose paragraphs longer than 4 sentences — break it up with components

---

## SCOPE BOUNDARIES (so you don't overlap with other agents)

The 5 content authors split the lecture as follows:

| Author handle | Slides | Diseases |
|---|---|---|
| @foundations-pnp-quickref-author | 2, 3, 35-36 conceptually, 53-56 | Hero MCQ (slide 2), Triage grid (slide 3), Foundations box (subepi vs intraepi, hypersensitivity I-IV, DIF basics, corticosteroid potency), Paraneoplastic Pemphigus (slides 53-56), Notecard-Worthy section, Pathognomonic quick-ref table |
| @tier1-author | 4-16, 25-27, 30-34 | RAS (4-10), Erythema Migrans (11-13), Drug Gingival Hyperplasia (14-16), Transient Lingual Papillitis (25-27), Oral Lichen Planus (30-34) |
| @allergic-author | 17-24 | Type I/IV/Pseudoallergic table, Allergic Contact Stomatitis, patch testing, Cinnamon/Benzoate diet, Plasma Cell Gingivitis brief mention |
| @vesiculobullous-author | 35-45 | Mucous Membrane Pemphigoid (35-39), Pemphigus Vulgaris (40-45), MMP-vs-PV synthesized comparison table |
| @em-ten-author | 46-52 | Erythema Multiforme + RIME (46-48), SJS/TEN (49-52), EM-vs-RIME and EM-vs-SJS-TEN tables, Board Favorite drug list |

**Slides 1, 28, 29, 41, 43, 57 are structural/transition/diagram slides and don't need standalone cards.** Diagrams on 41 and 43 should be referenced inside vesiculobullous content as `.clinical-img` placeholders.

---

## QA REVIEW CRITERIA (what the QA verifier will check on your fragment)

The QA verifier will reject your fragment if:
1. Any high-yield block lacks a `<!-- SOURCE: Slide N -->` comment
2. Any verbatim quote doesn't match the audit report's exact phrasing
3. Any percentage, drug, or named entity isn't traceable to the PDF
4. You used a CSS class not in the cheat sheet
5. You included `<img>` tags (only `.clinical-img` placeholders allowed)
6. Your fragment is missing slides from your assigned scope
7. You overlap with another author's scope
