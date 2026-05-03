# QA Report — L2 Image Placement Audit
## Allergies & Immunologic Diseases (sec-allergies)
**Auditor**: @qa-images-l2  
**Date**: 2026-05-03  
**Sources checked**: 06-IMAGE-ANNOTATIONS.md, 00-slide-content-map.md, .image-mapping-draft.md  
**HTML target**: `od531-midterm-complete-study-guide.html` — `#sec-allergies` (lines 2585–3829)  
**Images audited**: 22 / 22

---

## 1. Summary Table

| # | Filename | Slide # | HTML Lines | Verdict | One-line issue |
|---|---|---|---|---|---|
| 1 | `slide-007-corticosteroid-potency-table.png` | 7 | 2736–2741 | **OK** | Correct anchor (RAS Treatment) and correct caption |
| 2 | `slide-013-geographic-tongue-clinical-photos.png` | 13 | 2831–2836 | **OK** | Correct anchor (Geographic Tongue) and correct caption |
| 3 | `slide-016-drug-induced-gingival-hyperplasia-photos.png` | 16 | 2903–2908 | **OK** | Correct anchor (DRGH) and correct caption |
| 4 | `slide-018-allergic-contact-reactions-tongue-arm.png` | 18 | 2971–2976 | **CAPTION_WRONG** | Caption says "tongue + arm" but slide 18 shows oral lichenoid reactions adjacent to amalgam + denture contact stomatitis on palate + skin patch test — no "arm" lichenoid lesion; caption says "lichenoid lesions adjacent to amalgam (a, b)" but panel b in the slide is a patch test on forearm, not a second amalgam lesion |
| 5 | `slide-019-plasma-cell-gingivitis-allergic-stomatitis.png` | 19 | 2988–2993 | **OK** | Correct anchor and caption |
| 6 | `slide-020-allergic-contact-cheilitis.png` | 20 | 3007–3012 | **OK** | Correct anchor and caption |
| 7 | `slide-022-plasma-cell-gingivitis-severe.png` | 22 | 2994–2999 | **OK** | Correct anchor and correct caption |
| 8 | `slide-026-tlp-intro-tongue-instrument.png` | 26 | 3030–3035 | **OK** | Correct anchor (TLP) and caption |
| 9 | `slide-027-tlp-management-tongue-photo.png` | 27 | 3036–3041 | **OK** | Correct anchor and caption |
| 10 | `slide-028-tlp-clinical-three-panel.png` | 28 | 3042–3047 | **CAPTION_WRONG** | Caption says "adult lateral tongue red papule clusters (center)" but slide 28 per content-map shows adult papules on lateral margin mid-tongue at TOP RIGHT; the three-panel layout in the annotation has pediatric left, adult lateral top right, adult diffuse bottom center — but caption calls them left/center/right suggesting a horizontal 3-panel, conflicting with actual slide layout |
| 11 | `slide-030-bmz-yancey-diagram-part2-overview.png` | 30 | 3072–3077 | **ANCHOR_WRONG** | Image is the Yancey 2005 BMZ schematic ONLY (no clinical photos — slide 30 contains only a diagram, not clinical images per content map). Caption correctly describes the diagram, but anchor context is fine. HOWEVER: the image-annotations doc describes this image as "Right column maps autoantigens to immunobullous diseases" while the HTML alt-text and caption correctly convey this. Verdict is OK on closer inspection — see detail. |
| 12 | `slide-034-olp-erosive-reticular-panels.png` | 34 | 3108–3113 | **CAPTION_WRONG** | Caption says "panels a, b = erosive; panels c, d = reticular on lateral tongue" but per the slide content map: panel (b) is ventral tongue/floor with reticular lacy pattern, and panel (c) is dorsal tongue with atrophic/erythematous mixed form, panel (d) is buccal mucosa with dense Wickham striae. The caption inverts erosive/reticular assignment for panels b–d. |
| 13 | `slide-035-olp-cutaneous-histopathology.png` | 35 | 3141–3146 | **CAPTION_WRONG** | Caption calls it "4 P's: Pruritic, Polygonal, Planar, Purple, Papules" — that is FIVE P's listed, not four. The heading in the HTML also says "4 P's" but lists five items. This is an error in both the section text and the caption derived from it. |
| 14 | `slide-036-mmp-bmz-diagram-ocular-eye.png` | 36 | 3212–3217 | **OK** | Correct anchor (MMP section) and caption accurately describes the BMZ diagram + ocular MMP eye photo composite |
| 15 | `slide-040-mmp-clinical-images-six-panel.png` | 40 | 3250–3255 | **OK** | Correct anchor (MMP, after desquamative gingivitis callout) and caption |
| 16 | `slide-043-pemphigus-pegasus-mnemonic-dif.png` | 43 | 3337–3342 | **CAPTION_WRONG** | Caption says "Pegasus flies between the clouds" but the annotation source says the mnemonic is "flies THROUGH the clouds" (the cells are the clouds; acantholysis = cells falling apart = SPACES = the clouds Pegasus flies through). "Between" and "through" convey different spatial concepts; "through" is the correct mnemonic per both the slide content map and the annotations doc |
| 17 | `slide-044-dsg-compensation-diagram.png` | 44 | 3355–3360 | **OK** | Correct anchor (PV, after Pegasus mnemonic) and caption correctly describes DSG compensation. Minor: caption omits Bullous impetigo/SSSS arm of diagram but that is acceptable simplification |
| 18 | `slide-046-pemphigus-vulgaris-clinical-images.png` | 46 | 3374–3379 | **CAPTION_LACKING_DETAIL** | Caption says "multi-panel" but slide 46 has 7 distinct panels (not generic multi-panel). Caption correctly names "shallow ragged erosions following ruptured flaccid bullae" and "Nikolsky-positive" which are accurate, but fails to name any specific oral sites shown. The annotation-recommended caption specifies palatal erosions with serpiginous outlines as the key teaching feature |
| 19 | `slide-048-em-vs-rime-comparison-table.png` | 48 | 3425–3430 | **OK** | Correct anchor (EM/RIME section) and caption |
| 20 | `slide-049-em-rime-clinical-images.png` | 49 | 3454–3459 | **ANCHOR_WRONG** | Image is placed AFTER the EM vs RIME comparison table under the EM/RIME section — that placement is fine. However, the caption says "Target lesions on hands/feet + hemorrhagic lip crusting (EM) vs. severe oral erosions + conjunctivitis ± genital ulcers with minimal skin (RIME)" — this is accurate. Anchor is under alg-em-rime which is correct. This is actually OK. Revising to OK. |
| 21 | `slide-050-sjs-ten-comparison-table.png` | 50 | 3487–3492 | **OK** | Correct anchor (SJS/TEN section) and caption |
| 22 | `slide-053-sjs-ten-severity-clinical-photos.png` | 53 | 3558–3563 | **BOTH_WRONG** | CRITICAL: The caption says "target lesions, hemorrhagic lip crusting, and severe conjunctivitis" — but per the slide content map, slide 53 shows the Wallace Rule of Nines BSA chart + perioral SJS crusting photos. There are NO target lesions and NO conjunctivitis photos in slide 53. Target lesions and conjunctivitis appear in slide 49 (EM/RIME clinical images). The caption (and alt-text) describe slide 49's content, not slide 53. Additionally the anchor places this as an SJS/TEN clinical image — correct disease but wrong content description. |

---

## 2. Per-Image Detail (Non-OK Images Only)

---

### IMG-04 · `slide-018-allergic-contact-reactions-tongue-arm.png` — CAPTION_WRONG

**Current placement** (lines 2971–2976): Under "Type IV — Dental Practice Presentations" heading in the Allergic Reactions section. Correct topical anchor.

**Current caption verbatim**:
> "Allergic contact reactions in the oral cavity. Lichenoid lesions adjacent to amalgam restorations (a, b) — characteristic anatomic relationship to triggering material. Skin patch test reactions (b — middle) confirm the suspected contact allergen."

**What slide 53 ACTUALLY shows** (per 00-slide-content-map.md, slide 18):
- Panel (a) top left: White striated/lichenoid reaction on buccal mucosa directly adjacent to amalgam restoration
- Panel (b) top right: Erythematous buccal mucosa near restoration site — allergic contact stomatitis
- Panel (a) bottom left: Palate erythema and sloughing under denture — contact stomatitis from denture acrylic
- Panel (b) bottom center: Skin patch test showing positive reaction on forearm — patch testing for metal allergy
- Panel (c) bottom right: Erythematous palate post-denture removal — acrylic contact reaction

**Problem**: The caption labels panels (a) and (b) as both being "lichenoid lesions adjacent to amalgam" but panel (b) in the actual slide is a patch test on the forearm, not an intraoral amalgam-adjacent lesion. The caption also never mentions the denture contact stomatitis panels (acrylic reactions on palate) which comprise 2 of the 5 photos. The caption creates the misleading impression that all panels show amalgam-related lichenoid reactions.

**Proposed corrected caption**:
> Allergic contact reactions in dental practice. (Top row) Oral lichenoid contact reactions adjacent to amalgam restorations — white striae and erythema at the anatomic site of the restoration. (Bottom row, left-center) Denture acrylic contact stomatitis — erythema and sloughing of palatal mucosa beneath the prosthesis. (Bottom row, center) Positive skin patch test on forearm confirming metal hypersensitivity — gold standard for Type IV diagnosis. Note: a positive patch test alone does NOT confirm active causation; temporal correlation is required. [Slide 18]

**Corrected anchor**: No anchor change needed; the placement under "Type IV dental presentations" is appropriate.

---

### IMG-10 · `slide-028-tlp-clinical-three-panel.png` — CAPTION_WRONG

**Current placement** (lines 3042–3047): Under "Tier 3 — TLP Clinical Images, Variants & Management Details" in the TLP section. Correct topical anchor.

**Current caption verbatim**:
> "TLP across ages: localized pediatric (left), focal lateral adult (center), and diffuse eruptive (right). Discrete (<3 mm) papules confined to fungiform papillae regions. Source: Kalogirou EM, et al. (2017) J Clin Exp Dent."

**What slide 28 ACTUALLY shows** (per 00-slide-content-map.md, slide 28):
- Top left: Dorsal tongue in a child — multiple small whitish papules at tip, arrows pointing to them
- Top right: Adult dorsal tongue — small red papule clusters on lateral margin, mid-tongue
- Bottom center: Adult dorsal tongue — diffuse generalized papulosis covering most of dorsum — eruptive variant

**Problem**: The caption describes a horizontal three-panel layout ("left/center/right") but the actual slide is a 2+1 layout: two panels on top row, one panel centered on the bottom. Calling the bottom eruptive panel "right" is inaccurate. More importantly, "focal lateral adult (center)" should refer to the top-right panel, not a horizontal center. The description is directionally misleading — a student reading the caption while viewing the image will misidentify which clinical photo illustrates which variant.

**Proposed corrected caption**:
> TLP across ages and severity: localized pediatric form (top left) with arrows marking small whitish papules at tongue tip; focal adult lateral tongue involvement (top right) with red papule clusters on lateral margin; generalized/eruptive adult form (bottom center) with diffuse papulosis across the dorsal surface. Discrete (<3 mm) papules confined to fungiform papillae regions. Source: Kalogirou EM, et al. (2017) J Clin Exp Dent. [Slide 28]

**Corrected anchor**: No change needed.

---

### IMG-12 · `slide-034-olp-erosive-reticular-panels.png` — CAPTION_WRONG

**Current placement** (lines 3108–3113): Hero image at top of OLP section, id="alg-olp-hero". Correct topical anchor.

**Current caption verbatim**:
> "Oral lichen planus: erosive form (a, b) with painful atrophic red areas; reticular form (c, d) with characteristic bilateral lacy Wickham striae — most common pattern. Bilaterality is a key diagnostic clue. Source: Wu T, Bai Y, Jing Y, Chen F (2024) Front Cell Infect Microbiol."

**What slide 34 ACTUALLY shows** (per 00-slide-content-map.md, slide 34):
- Photo (a): Left buccal mucosa — erosive OLP with ragged ulceration and peripheral white striae → EROSIVE ✓
- Photo (b): Ventral tongue/floor of mouth — white reticular/lacy pattern, bilateral white striations → RETICULAR (NOT erosive)
- Photo (c): Dorsal tongue — atrophic/erythematous patches with surrounding white striations → MIXED atrophic/reticular (NOT purely reticular)
- Photo (d): Buccal mucosa — dense Wickham striae, lacy white pattern without erosion → RETICULAR ✓

**Problem**: The caption groups (a, b) as erosive and (c, d) as reticular. But per the slide content map, panel (b) is the RETICULAR form on ventral tongue with lacy striations. Only panel (a) is erosive. Panels (b), (c), and (d) are all reticular/atrophic-reticular variants. A student reading this caption will incorrectly identify panel (b) as an erosive presentation.

**Proposed corrected caption**:
> Oral lichen planus spectrum: (a) Erosive OLP — ragged ulceration with peripheral white striae on buccal mucosa; (b) Reticular OLP — lacy bilateral white striations on ventral tongue/floor of mouth — most common pattern; (c) Atrophic/mixed OLP — erythematous patches with surrounding white striations on dorsal tongue; (d) Dense Wickham striae on buccal mucosa — classic reticular form without erosion. Bilaterality of the reticular pattern is a key diagnostic clue. Source: Wu T, Bai Y, Jing Y, Chen F (2024) Front Cell Infect Microbiol. [Slide 34]

**Corrected anchor**: No change needed.

---

### IMG-13 · `slide-035-olp-cutaneous-histopathology.png` — CAPTION_WRONG

**Current placement** (lines 3141–3146): Under the "4 P's of Cutaneous Lichen Planus" mnemonic callout in the OLP section. Correct topical anchor.

**Current caption verbatim**:
> "Cutaneous lichen planus (4 P's: Pruritic, Polygonal, Planar, Purple, Papules on flexor surfaces). Histology (bottom right): band-like ("lichenoid") lymphocytic infiltrate at the basement membrane with basal cell vacuolization and saw-tooth rete ridges."

**What slide 35 ACTUALLY shows** (per 00-slide-content-map.md, slide 35 and 06-IMAGE-ANNOTATIONS.md IMG-13):
- Top left: Forearm skin — multiple purple polygonal pruritic papules with flat tops
- Top right (labeled a): Oral erosive OLP — close-up of erosive buccal mucosa with peripheral striae
- Bottom left: Arm (darker skin) — multiple purple-brown flat papules, post-inflammatory hyperpigmentation
- Bottom right (labeled b): Histopathology H&E — saw-tooth rete ridges, band-like lymphocytic infiltrate at dermo-epithelial junction, Civatte bodies

**Problem**: The caption lists "4 P's: Pruritic, Polygonal, Planar, Purple, Papules" — that is FIVE items. The canonical mnemonic is THE 4 P's (Purple Polygonal Pruritic Papules — 4 items). "Planar" is a separate descriptor (flat-topped papules) that may be used in some sources as a 5th P, but the standard boards mnemonic is 4 P's. Listing 5 items in a "4 P's" caption creates direct factual confusion for a student memorizing for the exam. The heading in the HTML section (line 3129) also says "4 P's" but lists Purple, Polygonal, Pruritic, Papules (4 items) correctly — the caption contradicts the nearby heading.

**Proposed corrected caption**:
> Cutaneous lichen planus — the 4 P's: Purple, Polygonal, Pruritic, Papules on flexor surfaces (top left: forearm; bottom left: arm with post-inflammatory hyperpigmentation). Top right (a): Erosive OLP on buccal mucosa with peripheral white striae — oral confirmation of the same disease. Histology (bottom right, b): band-like ("lichenoid") lymphocytic infiltrate at the basement membrane with basal cell vacuolization and saw-tooth rete ridges — pathognomonic pattern. [Slide 35]

**Corrected anchor**: No change needed.

---

### IMG-16 · `slide-043-pemphigus-pegasus-mnemonic-dif.png` — CAPTION_WRONG

**Current placement** (lines 3337–3342): Hero mnemonic image in the PV section, id="alg-pv-pegasus". Correct topical anchor.

**Current caption verbatim**:
> "Mnemonic: 'Pegasus (sounds like Pemphigus) flies between the clouds' — DIF shows intercellular IgG/C3 deposition in a netting/fishnet pattern between keratinocytes (the 'clouds' of cytoplasm). Pemphigus is intra-epithelial; pemphigoid is sub-epithelial ('PemphigOID lives DEEP like Hades')."

**What slide 43 ACTUALLY shows** (per 06-IMAGE-ANNOTATIONS.md IMG-16 and 00-slide-content-map.md slide 43):
- Slide 43 contains the Pegasus mnemonic image
- Per slide content map: mnemonic is "Pegasus (sounds like pemphigus) flies **through** the clouds"
- Per annotations doc: "Pegasus (sounds like Pemphigus) flies **through** the clouds" — DIF shows intercellular pattern **between** keratinocytes (the "clouds")
- The distinction: Pegasus flies THROUGH the clouds (the clouds = cytoplasm of keratinocyte cells). The CLEAVAGE/DIF pattern appears BETWEEN cells. The mnemonic has Pegasus traveling through the clouds (intraepithelial path), not between separate clouds. "Between" describes the DIF antibody deposition location correctly but corrupts the mnemonic verb.

**Problem**: The caption conflates the mnemonic action with the DIF location. The professor's exact mnemonic per the slide content map is "flies THROUGH the clouds" — not "between." Changing the verb word breaks the mnemonic's logic (acantholysis = cells falling apart = Pegasus can fly THROUGH the gaps where cells used to be connected).

**Proposed corrected caption**:
> Mnemonic: "Pegasus (sounds like Pemphigus) flies THROUGH the clouds" — the keratinocytes are the clouds; acantholysis (cells falling apart from desmoglein destruction) creates the spaces Pegasus flies through. DIF pattern: intercellular IgG/C3 deposition in a "chicken wire" / fishnet netting pattern between keratinocytes throughout the spinous layer — pathognomonic for PV. Pemphigus = intra-epithelial (UP HIGH, like Pegasus); PemphigoiD = sub-epithelial ("lives DEEP like Hades"). [Slide 43]

**Corrected anchor**: No change needed.

---

### IMG-18 · `slide-046-pemphigus-vulgaris-clinical-images.png` — CAPTION_LACKING_DETAIL

**Current placement** (lines 3374–3379): Under the PV section after DSG compensation diagram. Correct topical anchor.

**Current caption verbatim**:
> "Pemphigus vulgaris oral lesions: shallow ragged erosions following ruptured flaccid bullae. Nikolsky-positive. Serpiginous map-like outlines are characteristic. Source: Gilligan G, et al. (2025) J Oral Diagn."

**What slide 46 ACTUALLY shows** (per 00-slide-content-map.md slide 46):
Seven distinct intraoral photos: maxillary alveolar/palate raw erosive areas, labial/gingival ragged erosions (A), tongue dorsum large erosive patch (B), palatal erosive foci (a), buccal mucosa with sloughing (b), large buccal erosion with fibrinous base (C), floor of mouth erosion (D).

**Issue**: The caption is factually accurate but generic. It describes the lesion type without identifying any of the seven specific site panels, and omits the teaching point that PV involves ALL oral surfaces (unlike RAS which is limited to nonkeratinized mucosa). The annotation specifically calls out "serpiginous map-like outlines" and "ragged erosions" which ARE present in the caption — so the caption is not wrong. This is CAPTION_LACKING_DETAIL rather than CAPTION_WRONG.

**Proposed enhanced caption**:
> Pemphigus vulgaris oral lesions (7-panel): shallow, ragged erosions from ruptured flaccid bullae involving ALL oral surfaces — palate (top left), labial/gingival mucosa (A), tongue dorsum (B), floor of mouth (D), buccal mucosa (b, C). Nikolsky-positive. Serpiginous map-like outlines are characteristic. Key board point: PV affects ALL mucosal surfaces (keratinized AND nonkeratinized) — unlike RAS which is limited to nonkeratinized mucosa. Source: Gilligan G, et al. (2025) J Oral Diagn. [Slide 46]

---

### IMG-22 · `slide-053-sjs-ten-severity-clinical-photos.png` — BOTH_WRONG ⭐ WORST CASE

**Current placement** (lines 3558–3563): In the SJS/TEN section, after the drug list and SCORTEN table, id="alg-sjs-clinical". The anchor disease (SJS/TEN) is correct.

**Current alt-text verbatim**:
> "Multi-panel clinical photograph: arm with multiple raised target lesions; two patients with severe hemorrhagic lip crusting; both eyes with severe purulent conjunctivitis, periorbital erythema, and yellow exudate."

**Current caption verbatim**:
> "Severe SJS/TEN presentation: target lesions, hemorrhagic lip crusting (similar to EM but more severe), and severe conjunctivitis. 50% of survivors develop permanent ocular scarring. Source: Trayes KP, et al. (2019) Am Fam Physician 100(2):82–88."

**What slide 53 ACTUALLY shows** (per 00-slide-content-map.md, slide 53):
- Left panel: **Wallace Rule of Nines chart** — adult, child (1–14 years), infant (<1 year) body surface area percentages + Palmar Method explanation. This is a BSA ASSESSMENT DIAGRAM, not a clinical photo.
- Top right (large): SJS patient — **perioral hemorrhagic crusting, facial erythema and early skin sloughing** — classic SJS perioral/facial presentation
- Bottom right (labeled A): Severe lip crusting — **thick hemorrhagic crusts covering entire vermilion border** with perioral edema
- Bottom right (labeled B): **Intraoral view** — erosive mucositis, limited mouth opening, pale erythematous mucosa

**The problem is severe**: The alt-text and caption both describe an image that contains "arm with raised target lesions" and "both eyes with purulent conjunctivitis" — but NEITHER of these appear in slide 53. Target lesions and conjunctivitis are from slide 49 (EM/RIME clinical images). The caption has been written as if this were slide 49, not slide 53. The entire factual description of the image is wrong.

Furthermore, the most visually prominent element in slide 53 is the **Wallace Rule of Nines BSA chart** — a critical teaching tool for SJS/TEN severity classification — which is not mentioned anywhere in the caption or alt-text.

**Proposed corrected caption**:
> SJS/TEN severity assessment tools and clinical features: (Left) Wallace Rule of Nines — BSA skin detachment calculator for classifying SJS (<10%), overlap (10–30%), and TEN (>30%); use patient's own palm (= 1% TBSA) for irregular areas. (Right) Clinical SJS: perioral hemorrhagic crusting with facial erythema (large), severe lip crust covering the entire vermilion border (A), and erosive intraoral mucositis with restricted mouth opening (B). Manage in burn unit — stop the suspected drug immediately. 50% of survivors develop permanent ocular sequelae. Source: Trayes KP, et al. (2019) Am Fam Physician 100(2):82–88. [Slide 53]

**Proposed corrected alt-text**:
> Four-image composite of SJS/TEN clinical assessment: left panel shows Wallace Rule of Nines body surface area diagram for adult, child, and infant with Palmar Method notation; top right shows SJS patient with perioral hemorrhagic crusting and facial erythema; bottom right panel A shows close-up of thick hemorrhagic lip crusts on vermilion border; bottom right panel B shows intraoral view of erosive mucositis with restricted opening.

**Corrected anchor**: No anchor change needed — SJS/TEN section placement is correct. However, the surrounding text (line 3565–3567) references a "SJS/TEN Onset Timeline" pearl which is appropriate. The BSA content in the image should be cross-referenced to the BSA table that already appears in the HTML (lines 3496–3503).

---

## 3. Aggregate Counts

| Verdict | Count | Images |
|---|---|---|
| **OK** | 14 | slide-007, slide-013, slide-016, slide-019, slide-020, slide-022, slide-026, slide-027, slide-030, slide-036, slide-040, slide-044, slide-048, slide-050 |
| **CAPTION_WRONG** | 5 | slide-018 (IMG-04), slide-028 (IMG-10), slide-034 (IMG-12), slide-035 (IMG-13), slide-043 (IMG-16) |
| **ANCHOR_WRONG** | 0 | — |
| **BOTH_WRONG** | 1 | slide-053 (IMG-22) |
| **CAPTION_LACKING_DETAIL** | 1 | slide-046 (IMG-18) |
| **BOTH_WRONG (revised to OK)** | 1 | slide-049 re-reviewed → OK |

**Corrected final counts**: OK: 15 · CAPTION_WRONG: 5 · ANCHOR_WRONG: 0 · BOTH_WRONG: 1 · CAPTION_LACKING_DETAIL: 1

---

## 4. Top 3 Worst Cases (Most Misleading for Student)

### #1 WORST — `slide-053-sjs-ten-severity-clinical-photos.png` (BOTH_WRONG)
**Why it's the most dangerous**: A student studying SJS/TEN would look at this image caption and believe they're seeing target lesions and bilateral purulent conjunctivitis — but those features belong to EM/RIME (slide 49). Slide 53 actually contains the Wallace Rule of Nines BSA chart (the most important clinical tool for SJS/TEN severity classification) and SJS-specific perioral crusting/mucositis. A student on the exam who confuses EM/RIME features with SJS features because of this caption mislabeling could choose the wrong answer on a recognition question. Both the alt-text and the caption are completely wrong about what the image depicts.

### #2 WORST — `slide-034-olp-erosive-reticular-panels.png` (CAPTION_WRONG)
**Why it matters**: This is a hero image placed at the top of the OLP section. The caption incorrectly classifies panel (b) — a classic reticular OLP image of ventral tongue with lacy bilateral striations — as "erosive form." OLP diagnosis fundamentally rests on distinguishing erosive from reticular forms, and a student who relies on this caption to learn the visual difference will misidentify the reticular pattern as erosive. This directly undermines a core learning objective for the section.

### #3 WORST — `slide-043-pemphigus-pegasus-mnemonic-dif.png` (CAPTION_WRONG)
**Why it matters**: The Pegasus mnemonic is explicitly the professor's primary memory tool for PV diagnosis and the DIF pattern. The verb change from "through" (correct per both source documents) to "between" (in the HTML caption) breaks the spatial logic of the mnemonic. "Through" conveys that Pegasus travels inside the epithelium, passing through cells (acantholysis = cells falling apart). "Between" implies Pegasus goes around the cells, which could be misread as subepithelial. For a Tier-1 T1 topic where the DIF pattern and blister level are high-yield board targets, mnemonic precision is critical.

---

## 5. Additional Notes

**Note on slide-030 (BMZ Yancey diagram)**: The annotation doc says this slide has both the Yancey 2005 schematic AND the right column mapping autoantigens to diseases. The content map confirms slide 30 is text + diagram only (no clinical photo). The HTML uses this image as a structural overview for ALL Part-2 diseases, which matches the recommended placement. Caption and anchor are both accurate. No issue.

**Note on slide-018 alt-text**: The alt-text (line 2973) says "bottom row shows... forearm contact dermatitis (linear pattern)" — this matches the patch test photo but mislabels it as "contact dermatitis" when it is a patch test reaction (not contact dermatitis in the clinical sense). Minor inaccuracy in alt-text only, not in figcaption.

**Note on TLP slides (26, 27, 28)**: All three are nested inside a `<details class="tier-3-collapse">` element. This means they are hidden by default and the student must actively expand the section. The image placements and captions are correct, but the structural decision to collapse these images means a student doing a quick visual pass will not see them. This is a study-guide design note, not a QA fault.

**Note on missing images**: The HTML has ZERO images for RAS (slides 9, 10 — clinical aphthous ulcer photos) and ZERO images for the SLS-free toothpaste brands (slide 8). These slides have clinical images per the source materials but were not embedded. This is outside the QA scope (existing images only) but flagged for completeness.

---

*Report generated by @qa-images-l2 · 2026-05-03*
