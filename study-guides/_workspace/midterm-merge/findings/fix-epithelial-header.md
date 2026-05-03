# FIX-2: Epithelial Section Header — Proof File
Agent: @fix-epithelial-header

## Summary
Replaced the source-specific `<header class="hero">` + `<nav class="nav-sticky">` block at
`sec-epithelial` (lines 8580–8610 before fix) with the canonical
`<div class="guide-section-divider"><div class="divider-inner">...</div></div>` pattern
matching the other 4 sections. Also added `<div class="guide-section-content">` wrapper
with its matching `</div>` close to maintain div balance.

## Before (lines 8580–8612, 33 lines removed)
```html
<div class="guide-section" id="sec-epithelial" data-tab="epithelial">
<h1 class="lecture-title">Lecture 3 — Epithelial Pathoses</h1>

<header class="hero">
  <div class="hero-content">
    <span class="hero-badge">OD 530 · Oral Medicine · Midterm · MASTER</span>
    <h1>Epithelial Pathoses <em>&amp;</em> Squamous Cell Carcinoma</h1>
    <p class="hero-sub">Master study guide — fully merged from both source files · 69 slides + case studies + chemoprevention data · QA-verified facts</p>
    <p class="hero-meta">Boston University Goldman School of Dental Medicine · Class of 2027 · All facts traceable to professor's slide deck · Amelanotic melanoma ~15% · Erythroplakia ~50% MT · HPV− OPSCC ~40% OS</p>
  </div>
</header>

<nav class="nav-sticky" aria-label="Section navigation">
  <div class="nav-inner">
    <a class="nav-link" href="#epi-case">Quiz Case</a>
    <a class="nav-link" href="#epi-epi">Epi</a>
    ... (13 nav links) ...
  </div>
</nav>

<div class="container">
```

## After (lines 8461–8471, 11 lines replacing 33)
```html
<div class="guide-section" id="sec-epithelial" data-tab="epithelial">
  <div class="guide-section-divider">
    <div class="divider-inner">
      <div class="section-number">Part 3 of 5</div>
      <h2>Epithelial Pathoses &amp; Squamous Cell Carcinoma</h2>
      <p class="section-subtitle">OPMDs, dysplasia management, HPV, AJCC TNM staging, melanoma — 69 slides + case studies + chemoprevention data · QA-verified</p>
    </div>
  </div>
  <div class="guide-section-content">

<div class="container">
```

Plus closing `</div><!-- end guide-section-content -->` added near line 10033.

## Verification Results

| Check | Before | After | Pass? |
|-------|--------|-------|-------|
| `class="hero"` count | 1 | 0 | YES |
| `class="nav-sticky"` count | 1 | 0 | YES |
| `class="guide-section-divider"` (section-level) | 4 | 5 | YES |
| `Part X of 5` divs | 4 | 5 | YES |
| `href="#sec-epithelial"` count | 1 | 1 | YES (unchanged) |
| div balance (`<div>` vs `</div>`) | +1 | 0 | YES |

## Notes
- Content text preserved: title "Epithelial Pathoses & Squamous Cell Carcinoma" and descriptive subtitle retained from original hero-sub text
- The 15 nav links inside `<nav class="nav-sticky">` were intentionally dropped — the sticky nav was a source-specific feature not present in other sections; intra-section anchor links remain intact in the content body
- `<h1 class="lecture-title">` orphan line also removed (not present in other sections)
- File: `study-guides/od531-midterm-complete-study-guide.html`
