# Fix Report — Image Fixes L3 Epithelial Pathoses & SCC
**Target:** `/Users/suleman/dental-quest/study-guides/od530-midterm-epithelial-pathoses-MASTER.html`
**Applied by:** @fix-images-l3
**Date:** 2026-05-03

---

## Backup File

`/Users/suleman/dental-quest/study-guides/_workspace/midterm-merge/backups/od530-pre-image-fixes-20260503-143008.html`

---

## Pre/Post Figure Count

| Metric | Before | After |
|---|---|---|
| `<figure class="lecture-figure">` count | 23 | **28** |
| Images on disk not in HTML | 5 | **0** |
| Line count | 2493 | 2527 |

---

## Per-Fix Table

| Image | Issue Type | Resolution | New Location (line) |
|---|---|---|---|
| L3-S1-quiz-case-presentation-1.png | MISSING | Inserted after `</div>` closing case-box, before MCQ card | Line 548–553 |
| L3-S3-quiz-mcq-1.png | MISSING | Inserted inside MCQ card, after subtitle, before `<ol>` | Line 558–563 |
| L3-S8-squamous-papilloma-1.png | MISSING | Inserted inside `<section id="hpv-benign">`, before exam-trap div | Line 710–716 |
| L3-S9-condyloma-acuminatum-1.png | MISSING | Inserted inside `<section id="hpv-benign">`, after S8 figure | Line 717–724 |
| L3-S10-verruca-vulgaris-1.png | MISSING | Inserted inside `<section id="hpv-benign">`, after S9 figure | Line 724–731 |
| L3-S12-heck-disease-management-board-pearl-1.png | ANCHOR_WRONG | Moved from outside `</section>` (orphaned) to inside hpv-benign section boundary, after memorize list | Line 748–751 (inside section, before line 752 `</section>`) |
| L3-S17-leukoplakia-tongue-bilateral-1.png | ANCHOR_WRONG | Moved from after MT-rates OPMD table to after leukoplakia prognosis card (39.6% paradox block) | Line 863–868 |
| L3-S25-leukoplakia-spectrum-4panel-1.png | CAPTION_LACKING_DETAIL | Caption enriched: added "4-panel grid", named "speckled (non-homogeneous)" stage, clarified "highest-risk area" | Unchanged location |
| L3-S30-ala-pdt-sequence-1.png | ANCHOR_WRONG | Moved from inside Section 08 `<div class="explain">` (chemoprevention zone) to Section 06 after S29 figure, before toolkit-grid | Line 1199–1205 |
| L3-S50-lip-scc-clinical-1.png | ANCHOR_WRONG | Moved from after S58/UV-lip-highlight to before Sites & presentation heading (after field-cancerization explain) | Line 1777–1782 |
| L3-S53-scc-carcinogenesis-cascade-1.png | ANCHOR_WRONG | Moved from before Sites & presentation heading to after Clinical Presentation Warning Signs card, before S57 | Line 1823–1829 |
| L3-S67-oral-melanoma-features-1.png | CAPTION_WRONG | Changed `5-yr OS ~15–25%` → `5-yr OS ~20–34% (vs. ~90% cutaneous melanoma)`. Corrected `c-KIT/NRAS mutations (not BRAF)` per INDEX and 00-slide-content-map | Line 2156 |

---

## Final Order Verification — SCC Section (Section 10)

| Figure | Line | Correct per deck order? |
|---|---|---|
| S46 (aerodigestive anatomy) | 1731 | Yes — section opener |
| S50 (lip SCC / actinic cheilitis) | 1779 | Yes — after field-cancerization explain, before sites |
| S53 (carcinogenesis cascade) | 1825 | Yes — after Clinical Presentation Warning Signs card |
| S57 (lip SCC case) | 1830 | Yes — after S53 |
| S58 (tongue SCC progression) | 1852 | Yes — after S57 |

Deck order is now: S46 → S50 → S53 → S57 → S58 (correct).

---

## Final grep Verification — S67 Stat Correction

### In figcaption (corrected):
```
Line 2156: 5-yr OS ~20–34% (vs. ~90% cutaneous melanoma)
```

### Other occurrences of 15–25% in the file (legitimate — comparison table, NOT in figcaption):
- Line 2181: comparison table row (oral vs. cutaneous 5-yr OS) — correct to stay as-is
- Line 2215: memorize bullet — discusses general oral melanoma prognosis (comparison context)
- Lines 2396, 2419: quiz grid / recap — contextually distinct from the S67 slide caption

The S67 figcaption no longer contains `15–25%`. The value `20–34%` in the figcaption matches both the INDEX.md recommended caption and the 00-slide-content-map for slide 67.

---

## Notes

- All 5 newly inserted images use path `images/lecture-3-epithelial-pathoses/` (consistent with all existing `<img src>` tags in this file).
- S12 was the simplest anchor fix — it was floating outside its parent `</section>` by 2 lines. Moved inside before the closing tag.
- S30 was the most displaced fix — it had drifted >300 lines past its correct section into Section 08. Now correctly placed between S29 and the dysplasia toolkit-grid in Section 06.
- S53 caption content (carcinogenesis cascade) remains accurate; only the anchor was wrong. No caption text was changed for S53.
- The `15–25%` value that remains in the HTML body (oral vs. cutaneous comparison table, memorize bullets, recap grid) is factually correct for those contexts — it describes the general population-level comparison. The `20–34%` in the S67 figcaption reflects the specific slide 67 data per the ground truth sources.
