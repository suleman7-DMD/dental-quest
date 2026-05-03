# QA Report: L1 (Infectious Diseases) Image-Caption Accuracy

**Auditor:** @qa-images-l1 agent  
**Date:** 2026-05-03  
**Scope:** `<div class="guide-section" id="sec-infectious">` — all 20 embedded images  
**Source PDF:** `Oral-MED-Midterm-infectious-diseases.pdf` (63 slides)  
**Source transcript:** `infectious diseases audio transcript.txt`  
**Image directory:** `study-guides/images/oral-med-midterm/lecture-1/` (21 files on disk, 20 embedded)  
**Methodology:** Filename → slide number lookup, PDF page visual inspection, figcaption cross-reference, surrounding heading/prose check. No HTML modifications made.

---

## 1. Summary Table

| # | Filename | Slide | Verdict | Issue (one line) |
|---|----------|-------|---------|-----------------|
| 1 | `09-impetigo-perioral-crusts.png` | 9 | **OK** | — |
| 2 | `14-syphilis-tongue-chancre.png` | 14 | **CAPTION_WRONG** | Caption claims a student annotation circle marks lesion margins; slide 14 is unannotated — the circle appears on slide 16 |
| 3 | `17-syphilis-treponema-em.png` | 17 | **OK** | — |
| 4 | `18-syphilis-primary-chancre-gallery.png` | 18 | **CAPTION_WRONG** | Caption says "four oral sites"; slide 18 gallery has 5 panels, not 4 |
| 5 | `19-syphilis-secondary-oral-5panel.png` | 19 | **OK** | — |
| 6 | `20-syphilis-tertiary-gumma-glossitis.png` | 20 | **OK** | — |
| 7 | `22-tb-tongue-ulcer.png` | 22 | **CAPTION_WRONG** | Caption says "plain (un-annotated) view"; slide 22 is densely covered in handwritten student annotations |
| 8 | `24-tb-tongue-ulcer-circled.png` | 24 | **OK** | — |
| 9 | `25-tb-calcified-lymph-nodes-pano.png` | 25 | **OK** | — |
| 10 | `27-candidiasis-pseudomembranous-tongue.png` | 27 | **OK** | — |
| 11 | `33-candidiasis-clinical-types-4panel.png` | 33 | **CAPTION_WRONG** | Panel D described as "median rhomboid glossitis" but slide 33 Panel D shows a uniformly erythematous palate (erythematous candidiasis / denture stomatitis pattern); median rhomboid glossitis is a midline tongue lesion, not a palate lesion |
| 12 | `34-candidiasis-wiki-infobox.png` | 34 | **OK** | — |
| 13 | `38-vesicles-bulla-schematic.png` | 38 | **OK** | — |
| 14 | `38-hsv-alar-rim-vesicles-ab.png` | 38 | **OK** | — |
| 15 | `39-hzo-facial-zoster.png` | 39 | **OK** | — |
| 16 | `41-hsv-gingivostomatitis-6panel.png` | 41 | **OK** | — |
| 17 | `43-cmv-oral-ulcers-4panel.png` | 43 | **CAPTION_LACKING_DETAIL** | Panel B described as "right lateral tongue tip"; slide text says "right lateral tongue to tip of tongue" — slightly imprecise anatomic framing |
| 18 | `52-measles-symptoms-infographic.png` | 52 | **OK** | — |
| 19 | `55-mumps-parotid-swelling.png` | 55 | **OK** | — |
| 20 | `59-ebv-mucocutaneous-ulcer.png` | 59 | **OK** | — |

---

## 2. Per-Image Detail (Non-OK Only)

### Image 2 — `14-syphilis-tongue-chancre.png` | CAPTION_WRONG

**Current figcaption excerpt:**
> "Student annotation circle marks the lesion margins."

**PDF finding:**  
Slide 14 shows a clean, un-annotated clinical photograph of a primary syphilitic chancre on the right lateral tongue. No annotation circle is present on this slide. The annotation circle (a hand-drawn oval marking lesion margins) appears on slide 16, which is a second pass over the same photograph with instructor markup added.

**Exam risk:** A student who memorizes "look for the circle" will be confused when presented with the unannotated slide 14 image and will not be able to identify the lesion boundary using the described annotation.

**Correction needed:** Remove all reference to an annotation circle from the slide 14 figcaption. The annotation circle belongs in the slide 16 entry.

---

### Image 4 — `18-syphilis-primary-chancre-gallery.png` | CAPTION_WRONG

**Current figcaption excerpt:**
> "Gallery of primary syphilitic chancres at four oral sites: oral commissure, lower lip, upper lip, and tongue dorsum"

**PDF finding:**  
Slide 18 ("Wrap Up" slide for primary syphilis) contains a 5-panel image gallery. The five sites shown are: oral commissure, lower lip, upper lip, tongue dorsum, and a fifth panel (tongue lateral / floor of mouth region). The caption omits the fifth panel entirely and states "four" when the image itself shows five discrete panels.

**Exam risk:** A student counting panels on an exam question would arrive at the wrong count. Additionally, the fifth anatomic site is excluded from the study caption.

**Correction needed:** Update count to "five" and add the fifth panel site to the list.

---

### Image 7 — `22-tb-tongue-ulcer.png` | CAPTION_WRONG

**Current figcaption excerpt:**
> "Plain (un-annotated) view of a deep, irregular ulcer on the right lateral tongue"

**PDF finding:**  
Slide 22 is the heavily annotated version of the TB tongue ulcer photograph. The slide contains dense handwritten student annotations including arrows, labels, and margin markings drawn directly on the clinical image. The "plain" unannotated version would correspond to a different slide or slide state. Slide 24 contains the version with a single clean purple oval annotation circling the ulcer.

**Exam risk:** Describing a visually busy annotated slide as "plain (un-annotated)" directly contradicts what a student sees when they open the image. This misrepresents the nature of the annotated photograph as a clean clinical reference image.

**Correction needed:** Remove "(un-annotated)" qualifier from the slide 22 caption. Note that annotations are present. The clean annotation-free reference is a separate image if available.

---

### Image 11 — `33-candidiasis-clinical-types-4panel.png` | CAPTION_WRONG

**Current figcaption excerpt:**
> "(D) erythematous palate showing central papillary atrophy (median rhomboid glossitis) pattern — the central depapillation mirror-image corresponds to the 'kissing lesion' on the opposing tongue."

**PDF finding:**  
Slide 33 Panel D shows a uniformly erythematous, inflamed palate consistent with erythematous candidiasis / denture stomatitis (Newton's Type II or III). There is no central papillary atrophy visible in the panel, and no midline-focal depapillated zone is depicted. Median rhomboid glossitis (MRG) is by definition a lesion of the posterior midline dorsal tongue, not the palate. The "kissing lesion" concept — where palatal erythematous candidiasis develops opposite a tongue-dorsal MRG — is a real clinical teaching point, but the caption misidentifies Panel D itself as showing MRG when Panel D shows the palate side, not the tongue.

**Exam risk:** This is the highest-risk error in the set. It teaches a direct anatomic falsehood: that median rhomboid glossitis appears on the palate. MRG is a tongue lesion. An exam question showing an erythematous palate and asking "what type of candidiasis is this?" requires the answer "erythematous / denture stomatitis" — not "median rhomboid glossitis." A student who memorized this caption would answer incorrectly.

**Correction needed:** Revise Panel D description to identify it as erythematous candidiasis of the palate (denture stomatitis pattern). If the kissing-lesion / MRG teaching point is desired, add a parenthetical clarifying that the tongue side of the kissing lesion (MRG) is not shown in this panel — only the palatal erythematous counterpart is visible in Panel D.

---

### Image 17 — `43-cmv-oral-ulcers-4panel.png` | CAPTION_LACKING_DETAIL

**Current figcaption excerpt:**
> "Panel B — right lateral tongue tip"

**PDF finding:**  
Slide 43 labels Panel B as a CMV ulcer extending along the "right lateral tongue to tip of tongue" — indicating a linear or elongated distribution from the lateral surface continuing to the tip, not simply a focal "tongue tip" lesion. The current caption truncates the anatomic extent description.

**Exam risk:** Low. The site is recognizable. However, if an exam question asks about the distribution pattern of the CMV ulcer, "lateral tongue to tip" is more precise than "tongue tip" alone.

**Correction needed:** Expand to "right lateral tongue extending to the tongue tip" to match slide text.

---

## 3. Aggregate Counts

| Verdict | Count |
|---------|-------|
| OK | 15 |
| CAPTION_WRONG | 4 |
| CAPTION_LACKING_DETAIL | 1 |
| ANCHOR_WRONG | 0 |
| BOTH_WRONG | 0 |
| **Total images audited** | **20** |

**Error rate:** 5 / 20 (25%) have some inaccuracy; 4 / 20 (20%) have outright wrong captions.

---

## 4. Top 3 Worst Cases (Highest Exam Risk)

### #1 — `33-candidiasis-clinical-types-4panel.png` Panel D (CAPTION_WRONG)

**Why it's worst:** Teaches that median rhomboid glossitis appears on the palate. MRG is a tongue lesion by definition. This is a direct clinical-anatomic falsehood. Candidiasis questions are high-yield on oral med exams; confusing erythematous palatal candidiasis with MRG would cause a student to misidentify the lesion type on an exam slide and choose the wrong diagnosis. The kissing-lesion concept is valid but is applied incorrectly in the caption — Panel D shows the palate side of the pair, not the MRG tongue side.

---

### #2 — `14-syphilis-tongue-chancre.png` (CAPTION_WRONG)

**Why it's second:** The caption directs the student to find an annotation circle that does not exist in the image. Slide 14 is unannotated. The circle is on slide 16. When a student views the image, they will spend time searching for a non-existent annotation, doubt their own perception of the lesion boundary, and potentially confuse which slide they are looking at. For a topic as high-yield as syphilis primary chancre, this creates visual confusion at the exact moment a student should be building a clean lesion recognition pattern.

---

### #3 — `22-tb-tongue-ulcer.png` (CAPTION_WRONG)

**Why it's third:** Describing a densely annotated slide as "plain (un-annotated)" inverts the pedagogic context of the image. Students studying TB oral ulcers rely on the unannotated image to practice raw lesion identification and the annotated image to verify their interpretation. Labeling the annotated slide as the clean reference means a student never gets to practice unguided lesion recognition from this case — they study the already-marked-up version while believing they are looking at an unmarked clinical photo.

---

## 5. Orphaned File (Not Embedded in HTML)

**File:** `38-hsv-alar-vesicles-with-schematic.png`  
**Status:** Present in `images/oral-med-midterm/lecture-1/` but has no corresponding `<figure>` tag anywhere in `sec-infectious`.  
**Action:** Consider embedding under the slide 38 HSV section or deleting from the directory if superseded by the separately embedded `38-vesicles-bulla-schematic.png` and `38-hsv-alar-rim-vesicles-ab.png` files.
