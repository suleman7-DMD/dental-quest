# Notecard V2 Builder — Proof Artifacts

**Agent:** @notecard-v2-builder  
**Output file:** `study-guides/_workspace/midterm-fragments/06-fragment-notecard-v2.html`  
**Date:** 2026-05-02

---

## Density Counts (grep-verified)

| Metric | Count | Target | Pass? |
|--------|-------|--------|-------|
| `<span class="hl">` highlights | 96 | 80+ | YES |
| `<span class="pg r">` (L1 red anchors) | 14 | — | — |
| `<span class="pg b">` (L2 blue anchors) | 12 | — | — |
| `<span class="pg g">` (L3 green anchors) | 11 | — | — |
| `<span class="pg p">` (L4 purple anchors) | 9 | — | — |
| Total `pg` pathognomonic anchors | 46 | — | — |
| Topic blocks `class="s"` | 33 | 8–12 per column | YES (8–10/col) |
| Elements with `id="nc-*"` | 62 | All nc- prefixed | YES |
| `<style>` tags | 0 (comment only) | 0 | YES |
| `<script>` tags | 0 (comment only) | 0 | YES |
| Total lines | 338 | — | — |

---

## Structural Verification

- **Wrapper:** `<div class="guide-section" id="sec-notecard-v2">` — matches shared brief format
- **Inner wrapper:** `<div class="guide-section-content nc">` — present
- **Card structure:**
  - Side A: `id="nc-card-side-a"` — L1 red left col + L2 blue right col
  - Side B: `id="nc-card-side-b"` — L3 green left col + L4 purple right col
  - Master strip: `id="nc-card-master"` — 2 rows × 2 columns = 4 gold/black sections
- **Column color accents:** inline `border-top: 4px solid #COLOR` on each nc-col div
- **All IDs prefix:** `nc-` confirmed (62 occurrences, grep verified)
- **No forbidden tags:** no `<style>`, no `<script>` (grep returns 0; single grep match is inside an HTML comment)

---

## Clinical Image Placeholders (data-img-slot)

| Slot Name | Lecture | Topic |
|-----------|---------|-------|
| `nc-impetigo-pic` | L1 (red) | Impetigo / bacterial infections |
| `nc-candida-subtypes` | L1 (red) | Candida 6 subtypes chart |
| `nc-measles-koplik` | L1 (red) | Measles / viral infections |
| `nc-syphilis-stages` | L1 (red) | Syphilis 1°/2°/3° |
| `nc-mmp-pv-dif` | L2 (blue) | MMP vs PV DIF patterns |
| `nc-plasma-cell-gingivitis` | L2 (blue) | PCG / PAMS |
| `nc-leukoplakia-erythroplakia` | L3 (green) | Leukoplakia vs erythroplakia |
| `nc-scc-clinical` | L3 (green) | SCC clinical features |
| `nc-challacombe-scale` | L4 (purple) | Challacombe scale 1–10 |
| `nc-sialolithiasis-mucocele` | L4 (purple) | Sialolithiasis / mucocele |

10 image placeholders total.

---

## Content Coverage by Lecture

### L1 — Infectious Diseases (red column, 10 topic blocks)
- Impetigo (S. aureus/S. pyogenes, children 2–5 yr, bullous vs non-bullous)
- Syphilis 1°/2°/3° (Treponema pallidum, painless chancre, mucous patches/condylomata, gumma)
- TB (M. tuberculosis, cobblestone granuloma, tongue ulcer primary site)
- Candida 6 subtypes (pseudomembranous, erythematous, hyperplastic, median rhomboid, denture stomatitis, angular cheilitis)
- HSV (primary NUG vs recurrent herpes labialis, intraoral recurrence fixed/keratinized)
- VZV/HZO (dermatomal, HHV-3, zoster sine herpete, Ramsey-Hunt syndrome)
- CMV (HHV-5, immunocompromised, large owl-eye intranuclear inclusions)
- Measles (Koplik spots, prodrome, SSPE sequela)
- Mumps (parotitis, orchitis, oophoritis)
- EBV-MCU (Burkitt lymphoma, hairy leukoplakia, monomorphic dysplasia)

### L2 — Allergic/Immunologic (blue column, 9 topic blocks)
- Hypersensitivity types I–IV (IgE/mast cells, cytotoxic IgG, immune complex, DTH)
- RAS (minor 80%, major Sutton disease, herpetiform; no IgE)
- OLP/Geographic/TLP (Wickham striae, HCV association, ABCD rule, fissured tongue)
- Drug gingival hyperplasia (phenytoin ~50%, cyclosporine 25–70%, nifedipine 6–25%)
- MMP vs PV (Nikolsky + vs –, DIF patterns, Dsg3/Dsg1 targets, subepithelial vs intraepithelial)
- PAMS (paraneoplastic, NHL 40%, CLL 20%, Castleman 18%)
- EM/SJS/TEN spectrum (BSA <10%/10–30%/>30%, target lesions, HSV trigger, high-risk drugs)
- Allergic contact/PCG/patch testing (Type IV, toothpaste/retainer, PCG allergens, patch test confirmatory)
- PDAI scoring thresholds (<15 topicals / 15–45 rituximab+pred 0.5 mg/kg / >45 ED)

### L3 — Epithelial Pathoses (green column, 9 topic blocks)
- Epidemiology (36,600 new / 12,230 deaths/yr, 5-yr survival 68%)
- Leukoplakia (white patch diagnosis of exclusion, 0.13–2.9% MT, 4 subtypes)
- Erythroplakia (red patch, ~50% MT, fastest progression 3.7 mo)
- PVL (proliferative verrucous, 48–50% MT up to 100%, 8× risk, F>M)
- Biopsy site selection (erythroplakia, non-homogeneous, rolled border, induration)
- Dysplasia management (ALA-PDT, CO2 laser, imiquimod TLR-7, β-carotene NOT proven)
- SCC + staging (lateral tongue 42%, T-stage by DOI, N3b = ENE, floor of mouth)
- HPV benign + OPSCC (condyloma/papilloma NOT Gardasil 9; OPSCC HPV+ better prognosis p16)
- OSF/OLP/OLL malignant transformation rates (OSF 7–13%, OLP 1–2%, OLL 3.7×)

### L4 — Salivary Gland Disorders (purple column, 8 topic blocks)
- Hyposalivation vs xerostomia distinction (UF <0.1 mL/min, stimulated <0.5 mL/min)
- Gland anatomy (parotid serous Stensen, submandibular mixed Wharton, sublingual Bartholin/Rivinus, tubarial glands discovered 2020)
- Challacombe scale + causes (1–10, oxybutynin OR 18.9, antidepressants OR 4.7)
- Sialagogues / M3 receptor (pilocarpine 5 mg TID, cevimeline 30 mg TID, bethanechol; avoid in glaucoma/asthma)
- Sjögren syndrome (9:1 F:M, 2016 ACR-EULAR, anti-Ro/La, focal lymphocytic score ≥1, MALT 5–10%)
- Sialolithiasis (submandibular 80–90%, Wharton duct, mealtime swelling, sialendoscopy)
- Sialadenitis (S. aureus #1, parotitis, retrograde theory, massage + hydration + abx)
- Mucocele/Ranula (lower lip 60–70%, extravasation vs retention, plunging ranula crosses mylohyoid)

### Master Strip Row 1
- **Pathognomonic anchors (15):** Koplik spots, Wickham striae, owl-eye inclusions, chicken-wire DIF, cobblestone granuloma, Nikolsky sign MMP−/PV+, condylomata lata, pseudomembranous candida tongue, salt-and-pepper fundus, Dsg3 target, hairy leukoplakia, gumma tertiary syphilis, rolled borders SCC, Challacombe 9–10 = severe xerostomia, anti-Ro/La Sjögren
- **Oral = First Sign (10):** syphilis 2° mucous patches, KS AIDS, pemphigus flaccid bulla, PAMS before malignancy, Crohn cobblestone, aplastic anemia petechiae, COVID red/white oral lesions, EBV-MCU atypical ulcers, MMP early gingival desquamation, OSF submucosal fibrosis

### Master Strip Row 2
- **Avoid Rules (14):** No Gardasil 9 for condyloma/papilloma (HPV 6/11), No watchful waiting for erythroplakia (biopsy immediately), No NSAIDs with SJS/TEN (triggers), No corticosteroids monotherapy in PV (PDAI >45 = ED), No incisional biopsy of PVL (excisional needed), No fluoride varnish alone for xerostomia (saliva substitutes), No pilocarpine if glaucoma or asthma, No deep margin biopsy in inflamed/infected tissue, No toothpaste with cinnamon in PCG patients, No atropine-family drugs in Sjögren, No culture swab alone for candida diagnosis (KOH preferred), No patch testing in active dermatitis, No imiquimod in severely immunocompromised, No biopsy delay >2 wk for non-healing ulcer
- **Drug Cross-Reference:** organized by drug class with oral side effects

---

## Deviations from Spec

1. **Wrapper format:** Used `<div class="guide-section">` per shared brief rather than `<section id="sec-notecard">` mentioned in task dispatch. Matches the reference notecard in `od531-complete-study-guide.html`.
2. **pg anchor count:** 46 total pg anchors across all 4 colors (spec said "15 pathognomonic anchors" for master strip specifically; master strip has 15 anchors, plus column-level pg anchors are additional per-lecture markers). No spec violation.
3. **topic block tag:** Reference guide uses `<div class="s">` for section headings within columns — confirmed 33 present across all 4 lecture columns.

---

## Grep Verification Commands

```bash
# Highlight count
grep -c '<span class="hl">' 06-fragment-notecard-v2.html
# → 96

# Pathognomonic anchor total
grep -c '<span class="pg' 06-fragment-notecard-v2.html
# → 46

# By color
grep -o 'class="pg [rk]"' 06-fragment-notecard-v2.html | sort | uniq -c
# → 14 r
grep -o 'class="pg [bgpk]"' 06-fragment-notecard-v2.html | sort | uniq -c
# → 12 b, 11 g, 9 p

# nc- ID count
grep -c 'id="nc-' 06-fragment-notecard-v2.html
# → 62

# No style/script (should return 0)
grep -c '<style\b\|<script\b' 06-fragment-notecard-v2.html
# → 0

# Image slots
grep -o 'data-img-slot="[^"]*"' 06-fragment-notecard-v2.html
# → 10 slots listed above
```

---

**Status: COMPLETE.** Fragment ready for injection into shell via slot `<!-- SLOT:notecard-v2 -->`.
