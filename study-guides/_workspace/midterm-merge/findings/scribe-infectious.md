# Scribe Findings — @scribe-infectious

## Proof Artifacts

| Metric | Value |
|--------|-------|
| Input line count | 1851 |
| Fragment line count | 1550 |
| `grep -c "SOURCE:"` | 0 (source file contained zero SOURCE comments) |
| `grep -c 'id="inf-'` | 36 |
| `grep -c "<style"` | 0 ✅ |
| `grep -c "<script"` | 0 ✅ |
| `grep -c "clinical-img"` | 9 (9 already present in source, 0 data-img-slot added since placeholders preserved as-is) |
| `grep -c "high-yield\|callout-danger\|explain"` | 23 |
| `<div` opens | 265 |
| `</div>` closes | 265 ✅ (balanced) |
| No `<html>/<head>/<body>` | 0 ✅ |

## Head 5 Lines

```html
<div class="guide-section" id="sec-infectious" data-tab="infectious">
  <div class="guide-section-divider">
    <div class="divider-inner">
      <div class="section-number">Part 1 of 5</div>
      <h2>Infectious Diseases</h2>
```

## Divergent CSS Classes (log for architect/QA)

The following classes are used in the infectious diseases fragment but NOT found in the master CSS (`od531-complete-study-guide.html` lines 9–1437):

| Class | Used for | Recommendation |
|-------|----------|----------------|
| `.cmp` | Comparison layout container | Architect backfill |
| `.col-red` | Red column highlight | Architect backfill |
| `.cols-b` | Column variant (bottom?) | Architect backfill |
| `.cols-ph` | Pharmacology columns | Architect backfill |
| `.cols-top` | Top-aligned column variant | Architect backfill |
| `.dangerline` | Danger border/line indicator | Architect backfill |
| `.hemo-col` | Hematology column | Architect backfill (`.hemo-compare` IS in master) |
| `.img-desc` | Image description text | Architect backfill |
| `.img-icon` | Image icon container | Architect backfill |
| `.img-label` | Image label | Architect backfill |
| `.img-text` | Image caption text | Architect backfill |
| `.key-concept` | Key concept callout | Architect backfill |
| `.nc-embed` | Embedded notecard block | Architect backfill |
| `.ph` | Pharmacology base class | Architect backfill |
| `.ph-blue` | Blue pharmacology variant | Architect backfill |
| `.ph-green` | Green pharmacology variant | Architect backfill |
| `.ph-purple` | Purple pharmacology variant | Architect backfill |
| `.phase-item` | Phase list item | Architect backfill (`.phase-list` IS in master) |
| `.redb` | Red bold emphasis | Architect backfill |
| `.sc` | Small caps? | Present 5× in master but may be different usage |
| `.strip` | Bottom strip layout | Architect backfill |
| `.tbar` | Table bar/header | Architect backfill |

**Decision**: Per spec fallback rule, all divergent classes are kept as-is and logged here for the architect to backfill into `01-shell.html`'s `<style>` block.

## Notes

- Source file had **zero** `<!-- SOURCE: Slide N -->` comments — this is not an omission by the scribe. The input file (`od531-midterm-infectious-diseases.html`) was built without SOURCE annotations. Logged here so QA knows total SOURCE count will not include L1 contributions.
- The source used `<section class="guide-section">` tags internally; these were converted to `<div class="guide-section">` per spec requirement (fragment uses divs).
- The source's progress-shell nav, hero banner, and per-lecture `<style>`/`<script>` blocks were stripped.
- The outer wrapper `id="sec-infectious"` is NOT prefixed (per spec: "The OUTER id does NOT get prefixed"). All 36 inner IDs correctly carry `inf-` prefix.
- 9 `.clinical-img` placeholders from source preserved verbatim (no `<img>` tags inserted).
