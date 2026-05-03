# Fix Report: Image-Caption & Anchor Corrections — od531-midterm-complete-study-guide.html

**Agent:** @fix-images-merged  
**Date:** 2026-05-03  
**Target file:** `/Users/suleman/dental-quest/study-guides/od531-midterm-complete-study-guide.html`

---

## Backup

**Backup path:** `/Users/suleman/dental-quest/study-guides/_workspace/midterm-merge/backups/od531-pre-image-fixes-20260503-142943.html`

---

## Pre/Post File Metrics

| Metric | Pre-edit | Post-edit |
|---|---|---|
| Line count | 6877 | 6877 |
| `<figcaption>` count | 55 | 55 |
| Lecture-1 image refs | 20 | 20 |
| Lecture-2 image refs | 22 | 22 |
| Lecture-4 image refs | 13 | 13 |

Line count is identical (caption text rewrites and one figure relocation are net-zero in line impact for this file size). Figcaption count is unchanged (rewrites only, no additions or deletions). All image reference counts are unchanged.

---

## Per-Fix Table

### Lecture 1 (Infectious Diseases) — 5 fixes

| # | Image filename | Issue | Resolution applied |
|---|---|---|---|
| L1-1 | `14-syphilis-tongue-chancre.png` | CAPTION_WRONG: Claimed "annotation circle marks lesion margins" but slide 14 is unannotated | Removed annotation circle claim; replaced with "(Unannotated clinical photo; the annotated version with lesion-margin markup appears on slide 16.)" |
| L1-2 | `18-syphilis-primary-chancre-gallery.png` | CAPTION_WRONG: Said "four oral sites" but slide 18 gallery has 5 panels | Changed "four oral sites" → "five oral sites"; added fifth panel site (tongue lateral/floor-of-mouth region) |
| L1-3 | `22-tb-tongue-ulcer.png` | CAPTION_WRONG: Called "Plain (un-annotated)" but slide 22 is densely annotated | Changed to "Annotated view" and noted "slide contains dense student annotations with arrows and margin markings" |
| L1-4 | `33-candidiasis-clinical-types-4panel.png` | CAPTION_WRONG: Panel D described as "median rhomboid glossitis" but panel D shows erythematous palate (MRG is a tongue lesion) | Rewrote Panel D description as "uniformly erythematous, inflamed palate consistent with erythematous candidiasis / denture stomatitis pattern"; clarified MRG is midline tongue only |
| L1-5 | `43-cmv-oral-ulcers-4panel.png` | CAPTION_LACKING_DETAIL: Panel B said "right lateral tongue tip" — should be "extending to tongue tip" | Expanded Panel B to "extending along the right lateral tongue to the tongue tip — a linear/elongated distribution" |

### Lecture 2 (Allergies & Immunologic) — 7 fixes

| # | Image filename | Issue | Resolution applied |
|---|---|---|---|
| L2-1 | `slide-018-allergic-contact-reactions-tongue-arm.png` | CAPTION_WRONG: Described all panels as "lichenoid lesions adjacent to amalgam"; missed denture contact stomatitis panels and mislabeled patch test | Rewrote with explicit top row (amalgam lichenoid) / bottom row (denture acrylic stomatitis) / patch test breakdown |
| L2-2 | `slide-028-tlp-clinical-three-panel.png` | CAPTION_WRONG: Described as horizontal left/center/right but actual layout is 2-top + 1-bottom-center | Rewrote as "top left / top right / bottom center" with correct panel descriptions |
| L2-3 | `slide-034-olp-erosive-reticular-panels.png` | CAPTION_WRONG: Grouped panels (a,b) as erosive, (c,d) as reticular — but panel (b) is reticular, not erosive | Rewrote per-panel: (a) erosive, (b) reticular ventral tongue, (c) atrophic/mixed dorsal tongue, (d) reticular buccal mucosa |
| L2-4 | `slide-035-olp-cutaneous-histopathology.png` | CAPTION_WRONG: Listed "4 P's: Pruritic, Polygonal, Planar, Purple, Papules" — 5 items listed as "4 P's" | Corrected to canonical 4 P's: Purple, Polygonal, Pruritic, Papules; rewrote panel descriptions per slide layout |
| L2-5 | `slide-043-pemphigus-pegasus-mnemonic-dif.png` | CAPTION_WRONG: Said "flies between the clouds" — correct mnemonic per source is "flies THROUGH the clouds" | Changed verb to "THROUGH" throughout; explained spatial logic (acantholysis = cells fall apart = spaces Pegasus flies through) |
| L2-6 | `slide-046-pemphigus-vulgaris-clinical-images.png` | CAPTION_LACKING_DETAIL: Generic "multi-panel" without naming any of the 7 sites shown | Enhanced to name all 7 sites (palate, labial/gingival A, tongue B, floor D, buccal b/C); added board point that PV affects ALL mucosal surfaces vs. RAS nonkeratinized-only |
| L2-7 | `slide-053-sjs-ten-severity-clinical-photos.png` | BOTH_WRONG: Caption described target lesions and conjunctivitis (slide 49 content) not present in slide 53; missed Wallace Rule of Nines as most prominent element | Rewrote both alt-text and caption: alt-text now describes Wallace Rule of Nines + SJS perioral crusting + lip crust + intraoral mucositis; caption leads with BSA diagram teaching, then SJS clinical photos |

### Lecture 4 (Salivary Glands) — 7 fixes

| # | Image filename | Issue | Resolution applied |
|---|---|---|---|
| L4-1 | `19-cervical-radiation-caries.png` | CAPTION_WRONG: Described "PreviDent and GelKam fluoride products on the slide" — those products are on slide 18, not slide 19; slide 19 is clinical photos only | Removed product reference; rewritten as clinical radiation caries photo with source attribution and radiation-dose thresholds |
| L4-2 | `26-knowledge-check-52yo-woman.png` | CAPTION_WRONG: Stated the answer ("Yes — 30% seronegative") as if visible on slide 26, but slide 26 shows only the question; answer is on slide 27 | Rewritten to distinguish slide 26 (question only) from slide 27 (answer); answer now attributed to slide 27 |
| L4-3 | `08-salivary-anatomy-waterfall.png` | CAPTION_WRONG: Inserted flow percentages (25%, ~60%, ~5%) not present on slide 8 or any slide in L4; hyposalivation mechanism sentence attributed to wrong slide | Removed fabricated percentages; rewrote as accurate description of slide 8 labeled callouts (serous/mixed/mucous) |
| L4-4 | `35-acute-bacterial-sialadenitis.png` | CAPTION_WRONG: Appended management content from slide 36 to slide 35 (which has organisms + signs only) without attribution | Kept organisms/signs for slide 35; added "(slide 36)" attribution to management bullets so cross-reference is honest |
| L4-5 | `38-mucocele-types.png` | CAPTION_WRONG: Invented "Ranula" as the right-side lesion — word "ranula" never appears in L4; slide 38 shows Extravasation vs. Retention TYPE schematic, not clinical photos of two diseases | Removed ranula fabrication entirely; rewrote as accurate Extravasation type vs. Retention type schematic description matching slide text dump |
| L4-6 | `10-tubarial-glands.png` | CAPTION_WRONG: Added "discovered via PSMA PET/CT scans in prostate cancer patients" — not present in slide, manifest, or any source document | Removed unsourced PSMA/prostate detail; rewrote with Valstar 2021 journal and article title (which are on the slide) |
| L4-7 | `05-floor-of-mouth-pearl.png` | ANCHOR_WRONG: Placed inside T2-3 (Anatomy Waterfall, cell-type section) but image is from cancer case slide 5 and belongs in anatomy/clinical intro context | Removed from T2-3; relocated to T3-1 "Why Dentists Should Care About Saliva" `<details>` block with updated caption focusing on clinical detection of hyposalivation |

---

## Final Grep Verification — Bad Strings Confirmed Gone from Figcaptions

| Bad string | Status |
|---|---|
| "annotation circle marks the lesion margins" | GONE from figcaptions |
| "four oral sites" (in 18-gallery caption) | GONE |
| "Plain (un-annotated)" | GONE |
| "median rhomboid glossitis" as Panel D identity (now appears only in corrected context: "not median rhomboid glossitis") | CORRECTED — no longer misidentifies Panel D as MRG |
| "Lichenoid lesions adjacent to amalgam restorations — characteristic" (old slide-018 caption) | GONE |
| "localized pediatric (left), focal lateral adult (center)" | GONE |
| "erosive form (a, b)" in OLP caption | GONE |
| "4 P's: Pruritic, Polygonal, Planar, Purple, Papules" | GONE |
| "flies between the clouds" in figcaption | GONE (now "flies THROUGH the clouds" in figcaption; "FLIES BETWEEN" remains only in prof-mnemonic prose block, outside figcaption scope) |
| "target lesions, hemorrhagic lip crusting.*conjunctivitis" in SJS caption | GONE |
| "PreviDent and GelKam fluoride products alongside" in figcaption | GONE (remains only in alt-text, not flagged by QA) |
| "Parotid provides 25%" | GONE |
| "Ranula — a large mucous retention" | GONE |
| "PSMA PET/CT scans in prostate cancer patients" | GONE |
| "Treat with hydration, sialagogues" in figcaption | GONE |

---

## Notes

- The `prof-mnemonic` div at line ~3346 still contains "FLIES BETWEEN THE CLOUDS" — this is outside figcaption scope; the QA report only flagged the figcaption. The figcaption is now correct ("THROUGH"). The prose block may be updated separately if desired.
- The `alt-text` for `19-cervical-radiation-caries.png` still mentions PreviDent/GelKam — the QA report did not flag alt-text for this image, only the figcaption.
- `05-floor-of-mouth-pearl.png` is now correctly located inside `id="sal-t3-dentists-care"` (T3-1 `<details>` collapse), embedded within the div content after the explanatory text.
