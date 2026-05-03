# scribe-epithelial findings

## Output file
`/Users/suleman/dental-quest/study-guides/_workspace/midterm-fragments/04-fragment-epithelial.html`

## wc -l
1594

## grep -c results
| Check | Count |
|-------|-------|
| `<style` | 0 |
| `<script` | 0 |
| `id="epi-` | 16 |
| `<!-- ═` (SECTION comments) | 15 |
| `data-img-slot` | 10 |
| `<table` | 17 |
| `<div` open | 256 |
| `</div>` close | 256 |

NOTE: Source used SECTION header comments (`<!-- ═══ SECTION N — NAME ═══ -->`), not `SOURCE: Slide N` format. All 15 section comments preserved verbatim.

## Div balance
256 open / 256 close — balanced.

## head -5 snippet
```
<div class="guide-section" id="sec-epithelial" data-tab="epithelial">
<h1 class="lecture-title">Lecture 3 — Epithelial Pathoses</h1>

<header class="hero">
  <div class="hero-content">
```

## Section anchor sample
```
<section id="epi-case">
<section id="epi-epi">
<section id="epi-hpv-benign">
```

## Summary
Fragment extracted from od530-midterm-epithelial-pathoses-MASTER.html (body lines 448–2035). Style and script blocks stripped. Single root wrapper `<div class="guide-section" id="sec-epithelial" data-tab="epithelial">` prepended with `<h1 class="lecture-title">`. All 16 internal IDs and href anchors prefixed `epi-`. 10 clinical image placeholders inserted after major section headers (quiz case, epidemiology, HPV benign, leukoplakia, biopsy, patient cases, SCC, HPV-SCC, verrucous carcinoma, oral melanoma). Source file uses SECTION banner comments not SOURCE: Slide N format — all 15 preserved. No `<html>/<head>/<body>/<style>/<script>` tags in output. Tables (17) preserved. Div balance confirmed 256/256.
