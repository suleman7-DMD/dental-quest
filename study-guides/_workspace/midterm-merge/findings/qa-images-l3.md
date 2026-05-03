# QA Image Audit — L3 Epithelial Pathoses & SCC
**Target:** `/Users/suleman/dental-quest/study-guides/od530-midterm-epithelial-pathoses-MASTER.html`
**Ground truth:** INDEX.md + 00-slide-content-map.md
**Audited by:** @qa-images-l3
**Date:** 2026-05-03

---

## 1. Summary Table

| Filename | Slide # | HTML Line | Verdict | One-line issue |
|---|---|---|---|---|
| L3-S1-quiz-case-presentation-1.png | 1 | — | **MISSING** | Image exists on disk; never embedded in HTML. Section 01 has no images at all. |
| L3-S3-quiz-mcq-1.png | 3 | — | **MISSING** | Image exists on disk; never embedded in HTML. Section 01 has no images at all. |
| L3-S8-squamous-papilloma-1.png | 8 | — | **MISSING** | Image exists on disk; never embedded in Section 03. Only S12 is embedded from the entire HPV section. |
| L3-S9-condyloma-acuminatum-1.png | 9 | — | **MISSING** | Image exists on disk; never embedded in Section 03. |
| L3-S10-verruca-vulgaris-1.png | 10 | — | **MISSING** | Image exists on disk; never embedded in Section 03. |
| L3-S12-heck-disease-management-board-pearl-1.png | 12 | 716 | **ANCHOR_WRONG** | Figure placed OUTSIDE the `<section id="hpv-benign">` closing tag (line 714 `</section>`), floating between sections 03 and 04. |
| L3-S15-leukoplakia-fom-buccal-1.png | 15 | 771 | OK | Caption and anchor correct (after leukoplakia definition card, Section 04). |
| L3-S17-leukoplakia-tongue-bilateral-1.png | 17 | 909 | **ANCHOR_WRONG** | INDEX says anchor should be "after leukoplakia prognosis card." Instead it is placed AFTER the MT-rates table and BEFORE the risk-factors triage grid — skipped past the correct anchor by ~130 lines. |
| L3-S19-erythroplakia-lateral-tongue-1.png | 19 | 862 | OK | Caption and anchor correct (after erythroplakia definition card). |
| L3-S24-pvl-fom-1.png | 24 | 1000 | OK | Caption and anchor correct (after PVL criteria card). |
| L3-S25-leukoplakia-spectrum-4panel-1.png | 25 | 1005 | **CAPTION_WRONG** | Caption says "Leukoplakia spectrum: homogeneous white → mixed erythroleukoplakia → exophytic." INDEX says Slide 25 is a 4-panel grid and the recommended caption specifically notes "the red component is always the biopsy target." Caption is partially correct but the INDEX caption also calls out the "exophytic" panel and emphasizes the red-over-white biopsy rule more clearly. Minor — the anchor is correct. Caption is too generic about "spectrum" without naming erythroleukoplakia explicitly vs. INDEX which says "homogeneous white → mixed erythroleukoplakia → exophytic." (OK borderline — flagged CAPTION_LACKING_DETAIL.) |
| L3-S26-pvl-spectrum-5panel-1.png | 26 | 1010 | OK | Caption and anchor correct (PVL gingival ring-around-collar). |
| L3-S29-dysplasia-management-laser-figure-1.png | 29 | 1162 | OK | Caption and anchor correct (Section 06, after evidence table). |
| L3-S30-ala-pdt-sequence-1.png | 30 | 1542 | **ANCHOR_WRONG** | INDEX says anchor should be Section 06 "after dysplasia management toolkit." Instead, the figure is embedded in Section 08 (Chemoprevention), specifically inside the ALA-PDT row of the chemoprevention table explanation (`<div class="explain">` at line 1540), over 400 lines past the Management of Dysplasias section. The section-06 `</section>` closes at line 1220; S30 appears at line 1542. |
| L3-S31-case1-56yo-female-progression-1.png | 31 | 1235 | OK | Caption and anchor correct (Case 1 narrative opener, Section 07). |
| L3-S37-case2-73yo-male-presentation-1.png | 37 | 1282 | OK | Caption and anchor correct (Case 2 narrative opener, Section 07). |
| L3-S38-case2-july2021-1.png | 38 | 1321 | OK | Caption and anchor correct (before imiquimod, Case 2 timeline). |
| L3-S39-case2-sept2021-1.png | 39 | 1326 | OK | Caption and anchor correct (during Aldara). |
| L3-S40-case2-nov2024-1.png | 40 | 1331 | OK | Caption and anchor correct (long-term follow-up). |
| L3-S46-aerodigestive-anatomy-1.png | 46 | 1697 | OK | Caption and anchor correct (opening of SCC section). |
| L3-S50-lip-scc-clinical-1.png | 50 | 1822 | **ANCHOR_WRONG** | INDEX says anchor should be "after UV / lip cancer card" (the lip UV content). In the HTML, S50 appears AFTER S58 (line 1813), not before it. The lower-lip UV explanation text (lines 1817–1819) intervenes between S58 and S50, so the figure order is S57 → S58 → [UV text] → S50. Correct order should be S50 before S58 (both after lip/UV content, but S50 precedes S57/S58 in the deck). |
| L3-S53-scc-carcinogenesis-cascade-1.png | 53 | 1745 | **ANCHOR_WRONG** | INDEX says anchor is "after SCC clinical presentation card." In the HTML it is placed BEFORE the "Sites & presentation" subheading (line 1749) and BEFORE the Clinical Presentation Warning Signs card (line 1771) — appearing in the risk-factors / field-cancerization zone. It should follow the clinical presentation card. |
| L3-S57-scc-lip-case-1.png | 57 | 1791 | OK | Caption and anchor correct (after Clinical Presentation Warning Signs card). |
| L3-S58-tongue-scc-progression-1.png | 58 | 1813 | OK | Caption and anchor correct (after Referral & Workup card). However, S50 appears AFTER this image — see S50 entry for the pair-ordering problem. |
| L3-S65-verrucous-carcinoma-definition-1.png | 65 | 2027 | OK | Caption and anchor correct (opening of Section 13). |
| L3-S66-verrucous-carcinoma-alveolar-1.png | 66 | 2074 | OK | Caption and anchor correct (after treatment list). |
| L3-S66-verrucous-carcinoma-vestibule-2.png | 66 | 2081 | OK | Caption and anchor correct (second case, after alveolar figure). |
| L3-S67-oral-melanoma-features-1.png | 67 | 2119 | **CAPTION_WRONG** | INDEX recommended caption states "5-yr OS ~20–34%." The HTML figcaption states "5-yr OS ~15–25%." The INDEX number (20–34%) matches slide 67 per 00-slide-content-map. The HTML uses a different figure (15–25% is from the comparison table in the HTML body, not the slide). |

---

## 2. Per-Image Detail (Non-OK only)

---

### IMAGE 1: L3-S1-quiz-case-presentation-1.png — MISSING
**Should be in:** Section 01, opening of the quiz case presentation  
**Current placement:** Not embedded anywhere in the HTML  
**What INDEX says image shows:** 75-yo male clinical photo of swollen, bleeding gingiva. Sets up the differential before reading the medical history.  
**Proposed figcaption:**  
> Slide 1 — Quiz case: 75-year-old male with 6-month history of swollen, painful, bleeding gingiva. Clinical photo of the intraoral presentation. Before reading the medical history — what questions do you ask? What tests do you order?  
**Proposed anchor:** Inside `<section id="case">`, immediately after the opening `<div class="case-box">` paragraph with the chief complaint, before the Med Hx paragraph. ~line 542.

---

### IMAGE 2: L3-S3-quiz-mcq-1.png — MISSING
**Should be in:** Section 01, after case history, before/at the MCQ card  
**Current placement:** Not embedded anywhere in the HTML  
**What INDEX says image shows:** Multiple-choice question slide for the 75-yo case. Answer = avoidance of benzoates and cinnamon.  
**Proposed figcaption:**  
> Slide 3 — MCQ for the 75-yo male quiz case. Which intervention is MOST likely to improve this patient's condition? Answer: D — avoidance of benzoates and cinnamon-containing products (plasma cell gingivitis / oral lichenoid contact reaction).  
**Proposed anchor:** Inside `<section id="case">`, at the top of the `<div class="card">` for "Test question — confirmed exam material", before the ordered list. ~line 549.

---

### IMAGE 3: L3-S8-squamous-papilloma-1.png — MISSING
**Should be in:** Section 03, squamous papilloma row/card  
**Current placement:** Not embedded anywhere in the HTML  
**What INDEX says image shows:** Full slide with clinical photo — most common HPV-associated oral lesion (HPV 6/11). Pedunculated, cauliflower-like, soft palate most common.  
**Proposed figcaption:**  
> Slide 8 — Squamous papilloma. Most common HPV-associated oral lesion (HPV 6/11). Pedunculated, solitary (98%), cauliflower-like soft exophytic mass. Most common site: soft palate (23%). Male predilection 1.3:1. 2% recurrence rate. Covered by Gardasil 9.  
**Proposed anchor:** Inside `<section id="hpv-benign">`, after the squamous papilloma row in the comparison table (line ~671), immediately before or after the condyloma row. Alternatively, as a stand-alone figure beneath the table near the papilloma board-pearl content.

---

### IMAGE 4: L3-S9-condyloma-acuminatum-1.png — MISSING
**Should be in:** Section 03, condyloma acuminatum  
**Current placement:** Not embedded anywhere in the HTML  
**What INDEX says image shows:** Full slide with clinical photo — sessile, multiple, 75% HPV+ (highest oral HPV), HPV 6/11, STI concern.  
**Proposed figcaption:**  
> Slide 9 — Condyloma acuminatum. Sessile, multiple pink/white nodules. 75% HPV-positive — highest HPV-positive rate of all oral HPV lesions. HPV 6/11 in >90%. Sexually transmitted. Raises concern for sexual abuse in children even when non-sexual transmission is possible.  
**Proposed anchor:** Inside `<section id="hpv-benign">`, after the condyloma acuminatum row. Recommended near the "Papilloma vs condyloma — how to actually tell them apart" explain box (~line 702).

---

### IMAGE 5: L3-S10-verruca-vulgaris-1.png — MISSING
**Should be in:** Section 03, verruca vulgaris  
**Current placement:** Not embedded anywhere in the HTML  
**What INDEX says image shows:** Full slide — HPV 2/4 (cutaneous types), autoinoculation from hand warts. Always ask about hand/finger warts.  
**Proposed figcaption:**  
> Slide 10 — Verruca vulgaris (oral common wart). Sessile white papule with rough, keratotic surface. HPV 2/4 (cutaneous strains) via autoinoculation from hand warts. Always ask about finger/hand warts. NOT covered by Gardasil 9. Excisional biopsy for treatment; may resolve spontaneously in children.  
**Proposed anchor:** Inside `<section id="hpv-benign">`, after the verruca vulgaris row in the table, near the "ask about hand/finger warts" content.

---

### IMAGE 6: L3-S12-heck-disease-management-board-pearl-1.png — ANCHOR_WRONG
**Current placement:** Lines 715–718, outside `<section id="hpv-benign">` (section closes at line 713 `</section>`), floating in the gap between sections 03 and 04.  
**Current section heading context:** No parent section — orphaned between sections.  
**Current figcaption (verbatim):** `Slide 12 — Heck disease (focal epithelial hyperplasia). HPV 13/32. Board Pearl (cyan on slide): current HPV vaccines do NOT protect against HPV 13/32. Management: imiquimod 5% cream 3×/week × 2–3 months. Benign — zero malignant potential.`  
**What INDEX says:** Section 03, "within Heck disease management card." The figure should be inside `<section id="hpv-benign">`, before the `</section>` closing tag at line 713.  
**Caption assessment:** Caption text is accurate and matches INDEX.  
**Proposed fix:** Move this `<figure>` block inside `<section id="hpv-benign">`, before the `</section>` at line 713. Caption is fine as-is.

---

### IMAGE 7: L3-S17-leukoplakia-tongue-bilateral-1.png — ANCHOR_WRONG
**Current placement:** Line 908–911, after the MT-rates comparison table (slide 20 content, line 895–906) and BEFORE the "Risk Factors for Malignant Transformation" triage card (line 914).  
**Current section heading context:** Section 04, under "Malignant transformation rates by OPMD — Severity Spectrum" (the slide-20 content zone).  
**Current figcaption (verbatim):** `Slide 17 — Bilateral tongue leukoplakia. Prof returned to these images repeatedly to train lesion recognition. Note the fissures, folds, and crisp knife-edge margins — these reflect P53 mutation signals. Used for biopsy decision-making training.`  
**What INDEX says:** Slide 17 is a clinical photo pair used to train lesion recognition, from the "Prognosis" section (slide 16–17 zone). Recommended anchor: "After leukoplakia prognosis card." In the HTML that would be after the "Leukoplakia — Natural History & 5-Year MT Rates by Grade" card (~line 828), NOT after the MT-rates table which covers slide-20 content.  
**Proposed corrected anchor:** Move this figure to immediately after the `</div>` that closes the "Leukoplakia — Natural History" card (after line 828), before the start of the Erythroplakia card (line 830 `<!-- ERYTHROPLAKIA -->`). The figure would then sit at the "prognosis" zone (slides 16–17) rather than the "transformation rates" zone (slide 20).  
**Caption assessment:** Caption is accurate. No change needed.

---

### IMAGE 8: L3-S25-leukoplakia-spectrum-4panel-1.png — CAPTION_LACKING_DETAIL
**Current placement:** Lines 1004–1007. Anchor is correct (after PVL card and S24 figure).  
**Current figcaption (verbatim):** `Slide 25 — Leukoplakia spectrum: homogeneous white → mixed erythroleukoplakia → exophytic presentations across multiple sites. The red component is always the biopsy target — 'biopsy the red over the white.'`  
**What INDEX says:** "Four-panel leukoplakia / erythroleukoplakia spectrum. The red component is always the biopsy target."  
**Assessment:** Caption is accurate and includes the key biopsy rule. The omission is only that it doesn't explicitly mention "4-panel" and doesn't name the sites. This is minor — flagged CAPTION_LACKING_DETAIL rather than CAPTION_WRONG.  
**Proposed enhanced caption:**  
> Slide 25 — Leukoplakia/erythroleukoplakia spectrum — 4-panel grid. Homogeneous white → speckled (non-homogeneous) → mixed erythroleukoplakia → exophytic. Multiple intraoral sites shown. The red component is always the highest-risk area and biopsy target. "Biopsy the red over the white."

---

### IMAGE 9: L3-S30-ala-pdt-sequence-1.png — ANCHOR_WRONG
**Current placement:** Lines 1541–1544, inside `<div class="explain">` within Section 08 (Chemoprevention), specifically nested in the imiquimod mechanism explanation after the chemoprevention tables.  
**Current section heading context:** Section 08 — Chemoprevention → "Part 3 — Emerging Therapies & Clinical Trials" zone (~line 1476+). Section 08 starts at line 1349.  
**Current figcaption (verbatim):** `Slide 30 — ALA-PDT procedure sequence. 20% aminolevulinic acid gel applied 2 hours before laser illumination. ALA → protoporphyrin IX (selective uptake by dysplastic cells) → light activation → reactive oxygen species → ablation. 66–100% complete response rate. 8.3% MT at 3 years.`  
**What INDEX says:** Section 06 "Management of Dysplasias," anchor "after dysplasia management toolkit." Section 06 closes at line 1220.  
**Root cause:** The coder placed the ALA-PDT procedure photo in Section 08 (alongside the ALA-PDT mechanism text) instead of in Section 06 (where the dysplasia management evidence table is, and where the S29 figure already lives).  
**Proposed corrected anchor:** Move this figure to Section 06, after the toolkit-grid `</div>` (line ~1191), immediately after the S29 figure (line 1164). The PDT sequence logically follows the laser evidence table and the toolkit grid. Caption is accurate — no change needed.

---

### IMAGE 10: L3-S50-lip-scc-clinical-1.png — ANCHOR_WRONG
**Current placement:** Lines 1821–1824. In Section 10, AFTER S58 (tongue SCC progression, line 1813) and after the "Lower lip UV exposure" prof-highlight box (lines 1817–1819).  
**Current section heading context:** Section 10, after the Referral & Workup card and after S58.  
**Current figcaption (verbatim):** `Slide 50 — Actinic cheilitis → lower-lip SCC spectrum. Diffuse lower lip white stippling with loss of mucocutaneous junction = actinic cheilitis. Indurated/ulcerated component = SCC. Malignant transformation rate: 10–30%. Lower lip receives 3× more UV than upper lip.`  
**What INDEX says:** Slide 50 is "after UV / lip cancer card" (slides 49–50 zone). In the HTML, the UV lip content IS present (the prof-highlight at lines 1817–1819), but S50 appears after S58 (tongue/FOM SCC, slide 58). Correct order: S50 should appear BEFORE S57/S58.  
**Slide deck order:** S46 (anatomy) → S50 (lip SCC spectrum) → S53 (carcinogenesis cascade) → S57 (lip SCC case) → S58 (tongue progression). The HTML has S46 → S53 → S57 → S58 → S50. The S50 figure is 370+ lines past where it belongs.  
**Proposed corrected anchor:** Move S50 to after the "Lower lip UV exposure" prof-highlight (after line ~1819, before the closing `</section>` tag at line 1833) OR — better — move it directly after the risk-factors table in Section 10 and before the carcinogenesis cascade figure (before line 1744), since slide 50 precedes slide 53 in the deck. Given the HTML narrative flow, the best placement is after the UV lip paragraph (which discusses actinic cheilitis → lip SCC, lines 1817–1819) and before the callout-danger at line 1830. This is a within-section ordering error.  
**Caption assessment:** Caption is accurate — no change needed.

---

### IMAGE 11: L3-S53-scc-carcinogenesis-cascade-1.png — ANCHOR_WRONG
**Current placement:** Lines 1744–1747, after the risk-factors table (line 1739) and the "field cancerization" explain box (line 1740), BEFORE the "Sites & presentation" subheading (line 1749) and BEFORE the Clinical Presentation Warning Signs card (line 1771).  
**Current section heading context:** Section 10, in the risk-factors / field-cancerization zone, before clinical presentation.  
**Current figcaption (verbatim):** `Slide 53 — SCC pathogenesis cascade: hyperplasia → dysplasia → CIS → invasion. Molecular drivers at each step: 9p21/13q21 LOH, p16 inactivation, p53 mutation, Cyclin D1 amplification. The 'horseshoe of death' anatomy follows where carcinogen-laden saliva pools.`  
**What INDEX says:** Slide 53 is titled "Clinical Presentation" — the slide covers high-risk sites and clinical appearance. INDEX recommended anchor: "after SCC clinical presentation card." The HTML places it BEFORE the clinical presentation card at line 1771.  
**Note on figcaption content:** The current caption describes molecular carcinogenesis drivers (9p21 LOH, p16, p53, Cyclin D1 — the cascade histology). The INDEX description of slide 53 is: "high-risk sites: lateral/ventral tongue → floor of mouth → soft palate; clinical appearance evolves from early erythroleukoplakia to advanced ulcer." The slide title per 00-slide-content-map.md is "Clinical Presentation." This means the caption content is also wrong — the molecular cascade content matches the 00-content-map description for the *carcinogenesis cascade* topic but that topic is described on the SAME slide 53. However, the INDEX says slide 53 is primarily about clinical presentation. The caption emphasizes the cascade histology correctly but omits the clinical presentation content. The anchor is the more critical error.  
**Proposed corrected anchor:** Move this figure to after the Clinical Presentation Warning Signs card (after the `</div>` closing the card at approximately line 1788), before the Referral & Workup card (line 1796). This places slide-53 content at the "after clinical presentation" position the INDEX specifies.  
**Caption assessment:** Caption is accurate to the cascade diagram visible in the image; the INDEX recommended caption also mentions this cascade. Anchor fix is the primary correction needed.

---

### IMAGE 12: L3-S67-oral-melanoma-features-1.png — CAPTION_WRONG
**Current placement:** Lines 2118–2123, Section 14, after the ABCD callout. Anchor is correct.  
**Current figcaption (verbatim):** `Slide 67 — Oral melanoma, hard palate: irregular asymmetric pigmented mass with color variation (brown, black, red) and focal ulceration. ~50% of oral melanomas occur on the hard palate. UV is NOT the cause — this is a mucosal melanoma driven by genetic translocations (c-KIT, NRAS). 5-yr OS ~15–25%.`  
**What INDEX says:** Recommended caption states `5-yr OS ~20–34%`. The 00-slide-content-map for slide 67 also states `5-year survival ~20–34% (vs. ~90% for cutaneous)`. The HTML uses `15–25%` which is inconsistent with both source documents. The 15–25% figure appears in the oral vs. cutaneous melanoma comparison table elsewhere in the HTML body but is NOT the figure on the slide.  
**Proposed corrected caption:**  
> Slide 67 — Oral melanoma, hard palate: irregular asymmetric pigmented mass with color variation (brown, black, red) and focal ulceration. ~50% of oral melanomas occur on the hard palate. UV is NOT the cause — this is a mucosal melanoma driven by c-KIT/NRAS mutations (not BRAF). 5-yr OS ~20–34% (vs. ~90% cutaneous melanoma).

---

## 3. Aggregate Counts

| Verdict | Count |
|---|---|
| OK | 14 |
| MISSING (never embedded) | 5 |
| ANCHOR_WRONG | 5 |
| CAPTION_WRONG | 1 |
| BOTH_WRONG | 0 |
| CAPTION_LACKING_DETAIL | 1 |
| **Total images in INDEX** | **28** |
| **Total embedded in HTML** | **23** |

---

## 4. Top 3 Worst Cases

### #1 — L3-S30-ala-pdt-sequence-1.png (ANCHOR_WRONG, most displaced)
Placed in Section 08 (Chemoprevention, line 1542) when it belongs in Section 06 (Management of Dysplasias, ~line 1165). Displaced by over 320 lines and an entire section boundary. The S29 laser figure is correctly in Section 06, but the companion PDT sequence photo drifted to Section 08. A student reading Section 06 to study dysplasia management sees incomplete visual evidence; a student reading Section 08 sees a clinical procedure sequence with no immediate context about why dysplasia management uses PDT. Fix: relocate immediately after the S29 figure at line 1164.

### #2 — Five MISSING images: S1, S3, S8, S9, S10 (Section 01 and Section 03 completely dark)
Section 01 (Opening Quiz Case) has zero images embedded despite two images being available and delivered. The 75-yo clinical photo (S1) and the MCQ slide (S3) are exam-critical content — the prof said the MCQ "could show up on your exam." Section 03 is missing three out of four HPV lesion images: only S12 (Heck management) appears; the squamous papilloma, condyloma, and verruca photos are all absent. With these gone, the comparison table in Section 03 has no clinical imagery to anchor the morphologic descriptions. All 5 files exist on disk at the correct path.

### #3 — L3-S53-scc-carcinogenesis-cascade-1.png (ANCHOR_WRONG + caption-content mismatch)
Placed before the "Clinical Presentation" card instead of after it. The figure shows the carcinogenesis histology cascade (the right content) but is anchored in the risk-factors / field-cancerization zone rather than in the clinical presentation zone. Additionally, the figcaption appends "The horseshoe of death anatomy follows where carcinogen-laden saliva pools" — that content matches the horseshoe text at lines 1709–1718, not slide 53 specifically. The caption conflates two adjacent content blocks.

---

## 5. Notes for Fix Agent

1. **Section 01 fix:** Embed S1 and S3 inside `<section id="case">`. S1 goes at the top of the case-box; S3 goes at the top of the MCQ card.
2. **Section 03 fix:** S8, S9, S10 all belong inside `<section id="hpv-benign">` before its `</section>` tag. S12 must be relocated inside that same section (it currently floats outside). Suggested order: S8 after papilloma row, S9 after condyloma row, S10 after verruca row, S12 after the Heck memorize list.
3. **S12 orphan fix:** Move lines 715–718 to before line 713 `</section>`.
4. **S17 anchor fix:** Move lines 908–911 to after the leukoplakia prognosis card (after line ~828), before the erythroplakia card.
5. **S30 relocation:** Move lines 1541–1544 (removing the figure from inside the `<div class="explain">`) and re-insert after the S29 figure in Section 06 (after line 1164).
6. **S50 ordering fix:** Move lines 1821–1824 to before S57 (before line 1790). The lip SCC clinical progression photo logically precedes the tongue SCC progression photo per slide-deck order.
7. **S53 anchor fix:** Move lines 1744–1747 to after the Clinical Presentation Warning Signs card (after approximately line 1788).
8. **S67 caption fix:** Change `5-yr OS ~15–25%` → `5-yr OS ~20–34%` per INDEX and 00-slide-content-map.
