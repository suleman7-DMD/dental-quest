# QA Images L4 — Salivary Gland Disorders
**Auditor:** @qa-images-l4
**Date:** 2026-05-03
**Target HTML:** `/Users/suleman/dental-quest/study-guides/od531-midterm-complete-study-guide.html`
**Section lines audited:** 5414–6433 (`id="sec-salivary"`)
**Ground truth used:** image-manifest.md, slide-highlights.md, 05-pdf-text-by-slide.md
**Total L4 images:** 13 (all present in image dir, all embedded in HTML)

---

## 1. Summary Table

| Filename | Slide # | HTML Line | Section Anchor | Verdict | One-line Issue |
|---|---|---|---|---|---|
| `29-lymphoma-risk-oral-montage.png` | 29 | 5502 | T1 #2 — MALT Lymphoma Risk | **OK** | Caption accurate and complete |
| `19-cervical-radiation-caries.png` | 19 | 5567 | T1 #4 — Radiation-Induced Caries Pattern | **CAPTION_WRONG** | Slide 19 is a clinical-photo-only slide (no product tubes); product images are on slide 18. Caption conflates two slides' content. |
| `07-saliva-functions-wheel.png` | 7 | 5642 | T1 #6 — Saliva Functions | **OK** | Caption accurately describes hub-and-spoke diagram |
| `34-sialolith-pano.png` | 34 | 5699 | T1 #8 — Sialolithiasis Classic Presentation | **OK** | Caption accurate; image-only slide, pano confirmed |
| `26-knowledge-check-52yo-woman.png` | 26 | 5785 | T1 #12 — Seronegative Sjögren's | **CAPTION_WRONG** | Slide 26 shows only the unanswered knowledge-check question. The caption states the answer ("Yes — up to 30% are seronegative"), which belongs to slide 27. |
| `08-salivary-anatomy-waterfall.png` | 8 | 5872 | T2-3 — Anatomy Waterfall | **CAPTION_WRONG** | Caption states "Parotid provides 25% of stimulated flow; submandibular provides ~60% of unstimulated flow; sublingual ~5%." Those percentages are not on slide 8 (text dump is absent); they are synthesis/inference. The actual slide content is the serous/mucous gland type waterfall with labeled callouts. Caption adds invented statistics not sourced from the slide. |
| `05-floor-of-mouth-pearl.png` | 5 | 5877 | T2-3 — Anatomy Waterfall (inset) | **ANCHOR_WRONG** | Image is from Slide 5 — a practice question slide about a floor-of-mouth cancer case (histopathology biopsy slide). The manifest notes it shows "sublingual caruncles + Wharton duct openings" but the source slide is the 77 y.o. FOM cancer practice question, NOT an anatomy teaching slide. The caption describes it as a foundational anatomy image, but it is embedded inside the "Anatomy Waterfall" subsection. Image content may be accurate (FOM view) but source-slide context is a cancer case vignette, not an anatomy introduction. |
| `14-challacombe-scale.png` | 14 | 5925 | T2-5 — Challacombe Scale | **OK** | Caption accurately describes the 10-point scale and severity tiers |
| `35-acute-bacterial-sialadenitis.png` | 35 | 5984 | T2-7 — Acute Bacterial Sialadenitis | **CAPTION_WRONG** | Caption says "Treat with hydration, sialagogues, warm compresses, and antibiotics." Slide 35 covers organisms and clinical signs ONLY. Management (including the sialagogues/warm compresses language) is on slide 36. Slide 35 has no management content. Caption mixes two slides. |
| `38-mucocele-types.png` | 38 | 6015 | T2-8 — Mucocele Presentation | **CAPTION_WRONG** | Caption says "Right: Ranula — a large mucous retention/extravasation lesion on the floor of the mouth." The manifest and slide content describe slide 38 as showing the **extravasation vs. retention type diagram** — a schematic showing mucin pooling in soft tissue vs. inside the duct. It is NOT a side-by-side clinical photo of a mucocele vs. a ranula. The word "ranula" appears nowhere in the slide 38 text dump. Ranula is not mentioned anywhere in the lecture (slide 38 text dump confirms: "Extravasation type / Retention type"). Caption invents ranula content. |
| `33-sialendoscopy-procedure.png` | 33 | 6044 | T2-9 — Sialolithiasis Management | **OK** | Caption accurate; slide 33 is procedural photo collage |
| `10-tubarial-glands.png` | 10 | 6064 | T2-10 — Tubarial Glands | **CAPTION_WRONG** | Caption claims discovery was "via PSMA PET/CT scans in prostate cancer patients." The slide text and manifest say the study was published in *Radiother Oncol* 2021 (Valstar et al.) — a radiation oncology journal focused on radiation therapy, not prostate cancer PSMA imaging. The PSMA PET/CT detail is not in any source document. Caption inserts unsourced clinical backstory. |
| `39-mucocele-excision.png` | 39 | 6180 | T3-7 — Mucocele Surgery (collapsed) | **OK** | Caption accurate; slide 39 is confirmed image-only surgical excision sequence |

---

## 2. Per-Image Detail (Non-OK Only)

---

### IMAGE 2 — `19-cervical-radiation-caries.png` (Slide 19)

**HTML lines:** 5566–5569
**Section heading:** "4. Radiation-Induced Hyposalivation — Caries Pattern" (`id="sal-radiation-caries"`, T1 #4)
**`data-slide` attribute:** `data-slide="19"` ✓ correct

**Current figcaption (verbatim):**
> "Prof-emphasized slide showing PreviDent and GelKam fluoride products alongside the characteristic radiation-induced caries pattern: cervical, facial-to-circumferential distribution on the mandibular anterior smooth surfaces and maxillary molars (where parotid saliva normally washes). Parotid gland sustains irreversible damage above 25 Gy; submandibular above 39 Gy — standard tumor doses of 65–70 Gy always exceed both thresholds, making radiation caries an expected sequela."

**What slide 19 ACTUALLY shows (per manifest + PDF text dump):**
- Slide 19 is a **clinical photo slide only** — it shows radiation caries photos with white arrows pointing to cervical/root-surface caries lesions
- Text extract from slide 19 is entirely a citation: `Palmier NR, et al. 2020. Oral Surg Oral Med Oral Pathol Oral Radiol. 130(1):52–62.`
- The manifest description for image #6 confirms: "Side-by-side: PreviDent + GelKam tubes ON the slide itself" — however, these product images and the caries pattern highlights are **on slide 18**, not slide 19
- Slide 18 is the text-heavy "Radiation-Induced Hyposalivation" slide with the yellow-highlighted caries pattern bullets AND the visible PreviDent/GelKam product images in the upper right corner
- Slide 19 is clinical photographs of actual radiation caries with arrows — it has no text, no product images

**Issue:** Caption describes slide 18 content (product photos + pattern bullets) but is attached to slide 19 (clinical photo). The `data-slide` is technically right (the image filename is `19-*`) but the caption text describes slide 18 content. The manifest note "PreviDent + GelKam tubes ON the slide itself" was mistakenly applied to the image; the products are on slide 18 (the preceding text slide), not slide 19 (the clinical photo slide).

**Verdict:** CAPTION_WRONG — describes the wrong slide's content

**Proposed corrected figcaption:**
> Clinical photographs of radiation-induced caries (Palmier NR et al. 2020): ipsilateral cervical and root-surface lesions with white arrows highlighting the characteristic facial-to-circumferential pattern on mandibular anterior smooth surfaces and maxillary molars — the exact distribution produced by parotid hyposalivation after head-and-neck radiation. The pattern results from parotid destruction at >25 Gy and submandibular destruction at >39 Gy; standard tumor doses (65–70 Gy) always exceed both thresholds.

**Anchor recommendation:** Keep in T1 #4 (Radiation Caries) — anchor is correct. The image illustrates the clinical photos from slide 19 in the right topical context.

---

### IMAGE 5 — `26-knowledge-check-52yo-woman.png` (Slide 26)

**HTML lines:** 5784–5787
**Section heading:** "12. Seronegative Sjögren's — Can Diagnosis Still Be Made?" (`id="sal-seroneg-sjogren"`, T1 #12)
**`data-slide` attribute:** `data-slide="26"` ✓ correct

**Current figcaption (verbatim):**
> "52-year-old female presenting with dry mouth and dry eyes, negative anti-SSA/SSB — can she still have Sjögren's? **Yes — up to 30% of Sjögren's patients are seronegative**. Biopsy can be patchy; scores from biopsy (3 pts) + Schirmer test (1 pt) alone can reach the ≥4 ACR-EULAR threshold without positive serology."

**What slide 26 ACTUALLY shows (per slide highlights + PDF text):**
- Slide 26 is the **knowledge check question slide ONLY** — it poses the question in italic text and shows a headshot/photo of the 52-year-old woman
- The answer ("Yes — up to 30%...") appears on **slide 27**, not slide 26
- Slide 26 text dump: "A 52-year-old woman with objectively dry mouth and dry eyes has negative anti-SSA and anti-SSB. Can she have Sjögren syndrome?" + URL `https://rheumforprimarycare.org/sjogrens/`
- The manifest note for this image says caption should be: "52yo F, dry mouth + dry eyes, anti-SSA/SSB negative — can she still have Sjögren? Yes — up to 30% are seronegative." — but the manifest recommended caption was intended to combine the Q+A narrative for study purposes; it does NOT mean the answer appears on slide 26

**Issue:** The figcaption provides the answer (slide 27 content) as if it's visible in the slide 26 image. A student looking at the image would see only the question, not the answer. The figcaption conflates two slides.

**Verdict:** CAPTION_WRONG — states the answer as if it's on the question slide

**Proposed corrected figcaption:**
> Slide 26 knowledge check: "A 52-year-old woman with objectively dry mouth and dry eyes has negative anti-SSA and anti-SSB. Can she have Sjögren syndrome?" (slide 26 — question only). Answer on slide 27: Yes — up to 30% of Sjögren's patients with positive biopsy/Schirmer may be seronegative for SSA/SSB antibodies. Biopsy (3 pts) + Schirmer test (1 pt) alone can reach the ≥4 ACR-EULAR threshold without any positive serology.

**Anchor recommendation:** Keep in T1 #12 — anchor is correct.

---

### IMAGE 6 — `08-salivary-anatomy-waterfall.png` (Slide 8)

**HTML lines:** 5871–5874
**Section heading:** "T2-3. Salivary Gland Cell Types + Waterfall Mnemonic" (`id="sal-anatomy-waterfall"`, T2-3)
**`data-slide` attribute:** `data-slide="8"` ✓ correct

**Current figcaption (verbatim):**
> "Parotid (serous/thin/fast) → Submandibular (mixed) → Sublingual (mucous/thick/slow) — the waterfall mnemonic. Parotid provides 25% of stimulated flow; submandibular provides ~60% of unstimulated flow; sublingual ~5%. In hyposalivation, the mucous-dominant submandibular and sublingual glands are affected first, as water loss concentrates the remaining mucins."

**What slide 8 ACTUALLY shows (per PDF text dump + slide highlights):**
- Slide 8 text dump: "Serous = thin, watery, fast flow / Serous glands / Mucous glands / Serous + Mucous glands / Mucous = thick, syrupy, slow flow"
- Five labeled callout boxes: "Serous glands" (parotid), "Mucous glands" (sublingual), "Serous + Mucous glands" (submandibular), "Serous = thin, watery, fast flow", "Mucous = thick, syrupy, slow flow"
- **No percentage figures appear anywhere on slide 8** — no "25%", no "60%", no "5%" are in the text dump
- Those flow percentage figures are not present in any of the 39 slide text extracts
- The "submandibular ~60% of unstimulated flow" statistic is plausible clinically but is NOT sourced from this slide; it appears to be external knowledge or synthesis

**Issue:** Caption fabricates quantitative flow percentages (25%, ~60%, ~5%) that do not appear on slide 8 or any other slide in this lecture. Caption also adds the hyposalivation mechanism sentence ("water loss concentrates mucins") which is from slide 9, not slide 8.

**Verdict:** CAPTION_WRONG — inserts flow percentage statistics not present on slide 8; slide 9 mechanism attributed to slide 8

**Proposed corrected figcaption:**
> Slide 8 — Salivary gland cell types: Parotid = "Serous glands" (thin, watery, fast flow). Submandibular = "Serous + Mucous glands" (mixed). Sublingual = "Mucous glands" (thick, syrupy, slow flow). The visual waterfall from parotid → submandibular → sublingual maps fast-flowing serous secretion at the top to thick mucous secretion at the bottom. This is the foundation for understanding why hyposalivation produces sticky/ropy saliva — the mucous-dominant floor-of-mouth glands go first.

**Anchor recommendation:** Keep in T2-3. Anchor is correct.

---

### IMAGE 7 — `05-floor-of-mouth-pearl.png` (Slide 5)

**HTML lines:** 5876–5879
**Section heading:** "T2-3. Salivary Gland Cell Types + Waterfall Mnemonic" (`id="sal-anatomy-waterfall"`, T2-3)
**`data-slide` attribute:** `data-slide="5"` — this is the slide number but requires context

**Current figcaption (verbatim):**
> "Floor-of-mouth anatomy showing sublingual caruncles and Wharton duct openings (bilateral), where submandibular gland saliva empties. These are the first glands to show impaired function in hyposalivation — clinically detectable by reduced or absent pooling in the floor of the mouth on examination."

**What slide 5 ACTUALLY shows (per manifest + PDF text):**
- Slide 5 text: "Practice Question / Prior Histopathology report / A. RIGHT TONGUE LESION BIOPSY / Squamous mucosa with ulceration and granulation tissue. Negative for dysplasia. / Describe the lesion / DDx / Tests / Plan"
- This is the **practice question slide about the 77-year-old FOM cancer case** — the second of two case slides (slide 4 was the patient history, slide 5 was the histopathology + tasks)
- The manifest notes this image shows "sublingual caruncles + Wharton duct openings" and suggests it for an anatomy intro panel — but the manifest itself describes it as the "Why Dentists Should Care About Saliva / FOM anatomy" framing, meaning it shows the clinical anatomy of the floor of mouth visible in the cancer case
- The image was taken FROM the cancer case practice slide, which has no anatomy teaching context on the slide itself

**Issue:** The figcaption presents this as a foundational anatomy image in a pure anatomy teaching context. The source slide is the floor-of-mouth cancer case. The caption is not wrong about what the image SHOWS (it does appear to show FOM anatomy) but it is placed under T2-3 (Anatomy Waterfall) which is about gland cell types and flow rates — not about duct orifice anatomy or the floor of mouth. Additionally, the manifest explicitly categorized this as a small inset for the anatomy intro (not the waterfall section).

**Verdict:** ANCHOR_WRONG — image belongs in an anatomy overview or "why dentists care" intro context, not embedded directly after the waterfall cell-type diagram. Caption text itself is plausible given the image content, but placement breaks the teaching flow.

**Proposed corrected anchor:** Move figure to T3-1 "Why Dentists Should Care About Saliva" (currently text-only) as a small inset showing the FOM duct openings, OR add as an inset at the top of T2-3 before the waterfall image (not after it, where it interrupts the gland-type → hyposalivation teaching narrative).

**Proposed corrected figcaption (if moved to T3-1 / anatomy intro):**
> Floor-of-mouth clinical view showing the sublingual caruncles and bilateral Wharton duct openings, where submandibular gland saliva empties into the oral cavity. Dentists are ideally positioned to detect early hyposalivation: inspect the floor of mouth for reduced or absent pooling — absence of the normal salivary pool is a key early sign.

---

### IMAGE 9 — `35-acute-bacterial-sialadenitis.png` (Slide 35)

**HTML lines:** 5983–5986
**Section heading:** "T2-7. Acute Bacterial Sialadenitis" (`id="sal-acute-sialadenitis"`, T2-7)
**`data-slide` attribute:** `data-slide="35"` ✓ correct

**Current figcaption (verbatim):**
> "Acute bacterial sialadenitis: unilateral parotid gland swelling with suppurative (purulent) discharge expressible from Stensen duct on gland milking. *Staphylococcus aureus* is the most common causative organism. Treat with hydration, sialagogues, warm compresses, and antibiotics (amoxicillin-clavulanate or clindamycin). Urgent referral to ED/ENT/OMFS if signs of sepsis, trismus, or airway compromise."

**What slide 35 ACTUALLY shows (per slide highlights + PDF text dump):**
- Slide 35 covers: clinical signs (painful swollen gland, fever, purulence at duct orifice, erythema, firm/tender) + common organisms (*Staph aureus*, *Streptococcus* spp, anaerobes)
- Slide 35 contains NO management content — the text dump has zero management bullets on this slide
- Management content (antibiotics, hydration, culture, imaging, urgent referral criteria) is entirely on **slide 36** ("Management of Acute Sialadenitis")
- The "sialagogues, warm compresses" treatment language appears in the manifest description for this image but is again slide 36 content mixed in
- The "Urgent referral" criteria (sepsis, trismus, airway compromise) are also **slide 36 content**

**Issue:** The figcaption correctly identifies the image content (clinical presentation photo) but appends slide 36 management content as if it belongs to the slide 35 image. A student using the figcaption to cross-reference the slide would be confused — slide 35 has organisms and signs only.

**Verdict:** CAPTION_WRONG — management information from slide 36 incorrectly appended to slide 35 image caption

**Proposed corrected figcaption:**
> Acute bacterial sialadenitis (slide 35): unilateral parotid gland swelling with suppurative (purulent) discharge expressible from Stensen duct on gland milking — the classic clinical presentation. Common organisms: *Staphylococcus aureus* (most common), *Streptococcus* species, anaerobes. Management (slide 36): amoxicillin-clavulanate or clindamycin + aggressive hydration; urgent ED/ENT/OMFS referral for sepsis, immunocompromised patient, trismus, or airway compromise.

**Note:** If the figure is being kept single-slide (slide 35 only), the management sentence should be fully removed from the caption. The proposed above adds a "(slide 36)" attribution to keep it academically honest.

---

### IMAGE 10 — `38-mucocele-types.png` (Slide 38)

**HTML lines:** 6014–6017
**Section heading:** "T2-8. Mucocele Classic Presentation + Pathophysiology" (`id="sal-mucocele-presentation"`, T2-8)
**`data-slide` attribute:** `data-slide="38"` ✓ correct

**Current figcaption (verbatim):**
> "Left: Superficial extravasation mucocele on the lower lip — small, fluctuant, bluish vesicle from minor salivary gland duct rupture (Tyndall effect gives the characteristic blue color). Right: Ranula — a large mucous retention/extravasation lesion on the floor of the mouth, blue translucent dome, often arising from the sublingual or submandibular gland. Both types are yellow-highlighted on the slide as equally testable; treatment for both is surgical excision plus removal of the feeding minor salivary gland to prevent recurrence."

**What slide 38 ACTUALLY shows (per slide highlights + PDF text dump):**
- Slide 38 text dump (key excerpt): "Extravasation type / Retention type / Mucocele / Trauma to duct / Granulation wall / Mucin pooling in soft tissue / Classic presentation: Lower lip (most common site 60–70%), Fluctuant swelling, Bluish color, History of trauma, Painless / Pathophysiology: Trauma to minor salivary gland duct, Mucin spillage into connective tissue, Extravasation phenomenon"
- Slide-highlights confirm: "YELLOW HIGHLIGHT (diagram label box): 'Extravasation type'" and "'Retention type'" — these are schematic diagram labels showing mucin pathways, NOT clinical photographs
- The slide 38 image (per manifest) is explicitly "Side-by-side: superficial mucocele (lower lip vesicle) vs ranula (floor of mouth, blue translucent dome)"
- **CRITICAL CONFLICT:** The manifest claims the image shows a mucocele vs. ranula side-by-side clinical photo, but the slide text dump for slide 38 does NOT contain the word "ranula" anywhere — neither does any other slide in the lecture
- The slide shows a schematic diagram of Extravasation type vs. Retention type mucin flow, not clinical photos of two separate lesions
- The word "ranula" is a clinically known term for a floor-of-mouth mucocele from the sublingual gland, but it is NOT used or taught in this lecture

**Issue:** The figcaption describes a "ranula" on the right side of a side-by-side clinical photo. There is no ranula discussed, labeled, or shown in lecture 4 at any point. The slide 38 image appears to be a diagram showing Extravasation type vs. Retention type (labeled on the diagram), not a clinical photograph. The manifest may have over-interpreted the image content. The figcaption invents content not present in the source lecture.

**Verdict:** CAPTION_WRONG — "ranula" is not mentioned in this lecture at any point; caption describes invented content not present on slide 38; the diagram labels (Extravasation type / Retention type) are what the slide actually highlights

**Proposed corrected figcaption:**
> Slide 38 — Mucocele types: schematic diagram showing Extravasation type (mucin spills outside the duct into connective tissue after trauma — the most common mechanism) vs. Retention type (mucin accumulates inside the duct due to obstruction). Both type labels are yellow-highlighted on the slide. Classic presentation of either: fluctuant, bluish lesion on the lower lip (60–70% of cases); bluish color from the Tyndall effect. Treatment for both types: surgical excision including the feeding minor salivary gland to prevent recurrence.

---

### IMAGE 12 — `10-tubarial-glands.png` (Slide 10)

**HTML lines:** 6064–6067
**Section heading:** "T2-10. Tubarial Salivary Glands — 'New Glands!'" (`id="sal-tubarial-glands"`, T2-10)
**`data-slide` attribute:** `data-slide="10"` ✓ correct

**Current figcaption (verbatim):**
> "The tubarial salivary glands (blue arrow) — newly identified at the torus tubarius in the nasopharynx, discovered in 2021 via PSMA PET/CT scans in prostate cancer patients. These glands contribute to posterior oral cavity saliva flow. The key testable point: spare tubarial glands during head-and-neck radiation planning to help preserve salivary function — an overlooked organ-at-risk."

**What slide 10 ACTUALLY shows (per manifest + PDF text + slide highlights):**
- Slide 10 text: "New Glands! / Valstar MH, et al. 2021. Radiother Oncol. 154:292–298."
- The article title (visible on screen in an article screenshot embed) is: "The tubarial salivary glands: A potential new organ at risk for radiotherapy"
- The journal is *Radiotherapy and Oncology* — a radiation oncology journal, focused on radiation therapy
- "PSMA PET/CT" and "prostate cancer patients" do NOT appear in the slide text dump, the manifest, or the slide highlights
- The manifest states only: "Newly identified tubarial glands at torus tubarius. Pearl callout — small inset is fine."
- No source document mentions PSMA PET/CT or prostate cancer in any context

**Issue:** The caption adds "discovered via PSMA PET/CT scans in prostate cancer patients" — this is accurate to the real-world discovery story (the Valstar 2021 study did use PSMA PET/CT in prostate cancer patients) but this detail is NOT on the slide, NOT in the manifest, NOT in the slide highlights, and NOT in the text dump. It is unsourced external knowledge inserted into the caption as if it came from the lecture.

**Verdict:** CAPTION_WRONG — adds clinical backstory (PSMA PET/CT, prostate cancer) that does not appear in any L4 source document; this is factually real-world correct but unsourced from the lecture

**Proposed corrected figcaption:**
> The tubarial salivary glands (blue arrow) at the torus tubarius in the nasopharynx — newly identified in 2021 (Valstar MH et al., *Radiother Oncol.* 154:292–298; article title: "A potential new organ at risk for radiotherapy"). These glands contribute to posterior oral cavity saliva flow. Key testable point: spare tubarial glands during head-and-neck radiation planning to preserve salivary function — an overlooked organ-at-risk.

---

## 3. Aggregate Counts

| Verdict | Count | Images |
|---|---|---|
| OK | 6 | 29-lymphoma, 07-functions-wheel, 34-sialolith-pano, 14-challacombe-scale, 33-sialendoscopy, 39-mucocele-excision |
| CAPTION_WRONG | 6 | 19-radiation-caries, 26-sjogren-kc, 08-anatomy-waterfall, 35-sialadenitis, 38-mucocele-types, 10-tubarial-glands |
| ANCHOR_WRONG | 1 | 05-floor-of-mouth-pearl |
| BOTH_WRONG | 0 | — |
| CAPTION_LACKING_DETAIL | 0 | — (no captions are merely thin; the issues are all factual inaccuracies) |

**Total non-OK: 7 out of 13 images (54%)**

---

## 4. Top 3 Worst Cases

### #1 WORST — `38-mucocele-types.png` (CAPTION_WRONG, severity: HIGH)
The caption invents a "ranula" that does not appear anywhere in the lecture. The word "ranula" is never used in L4. The image shows an Extravasation/Retention type schematic diagram, and the caption re-describes it as a clinical side-by-side photo of two different clinical entities including one (ranula) that was never taught. A student who reads this caption will study "ranula" as testable content from this lecture when it is not. **Most dangerous error in the set.**

### #2 WORST — `19-cervical-radiation-caries.png` (CAPTION_WRONG, severity: HIGH)
The caption says the image shows "PreviDent and GelKam fluoride products" on the slide. It does not — slide 19 is a clinical photo-only slide with no product photos. The products are on slide 18. The figcaption has been written as if the image is slide 18 (the management/products slide) rather than slide 19 (the clinical radiation caries photos). Since slide 19 is cited and the image filename is `19-*`, this is a slide-description mismatch that will confuse any student cross-referencing the figure against their notes.

### #3 WORST — `08-salivary-anatomy-waterfall.png` (CAPTION_WRONG, severity: MEDIUM)
Caption states specific flow percentages (parotid 25%, submandibular ~60%, sublingual ~5%) that are not present on slide 8 or any slide in the lecture. These figures are clinically accurate externally but are presented as if they come from the slide when they do not. A student looking at this image will memorize percentages that were not taught in class and may write them on their notecard believing they are lecture content.

---

## 5. Correct Embed Order vs. Actual Embed Order

The manifest specified an ideal embed order for the coder (anatomy → functions → FOM pearl → tubarial → challacombe → radiation → sjogren KC → lymphoma → sialolith pano → sialendoscopy → sialadenitis → mucocele types → mucocele excision).

**Actual embed order in HTML:**
1. `29-lymphoma-risk-oral-montage.png` (line 5502)
2. `19-cervical-radiation-caries.png` (line 5567)
3. `07-saliva-functions-wheel.png` (line 5642)
4. `34-sialolith-pano.png` (line 5699)
5. `26-knowledge-check-52yo-woman.png` (line 5785)
6. `08-salivary-anatomy-waterfall.png` (line 5872)
7. `05-floor-of-mouth-pearl.png` (line 5877)
8. `14-challacombe-scale.png` (line 5925)
9. `35-acute-bacterial-sialadenitis.png` (line 5984)
10. `38-mucocele-types.png` (line 6015)
11. `33-sialendoscopy-procedure.png` (line 6044)
12. `10-tubarial-glands.png` (line 6064)
13. `39-mucocele-excision.png` (line 6180)

**Verdict on order:** The section is organized by TRIAGE TIER (T1 highest-yield first), not by topic-progression order, so the embed order intentionally deviates from manifest order. This is a valid pedagogical choice (Sjögren MALT lymphoma image leads because T1 #2 is highest-yield Tier 1). Order deviations are NOT errors; they reflect the triage-card structure. No order corrections needed.

---

## 6. Data-Slide Attribute Accuracy

All 13 `data-slide` attributes are numerically correct (match the filename prefix exactly). No errors found in `data-slide` values.

---

*Generated by @qa-images-l4. Do NOT modify HTML directly from this file. Pass to a fix agent.*
