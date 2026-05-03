# QA Report — Notecard v2 · L3 Epithelial Pathoses & SCC (Green Column)
**QA date:** 2026-05-03  
**File:** `study-guides/_workspace/midterm-fragments/06-fragment-notecard-v2.html` lines 149–207  
**Sources:** notecard-rebuild-l3.md (157 items), od530-midterm-epithelial-pathoses-condensed.html, od530-midterm-epithelial-pathoses-MASTER.html

---

## ✅ Verified — 42 items confirmed accurate

All of the following match source exactly:

- US 2024 incidence: 36,600 new / 12,230 deaths ✓
- Tongue (lateral) = 41.7% of oral cavity site ✓
- Tobacco × alcohol = 30× multiplicative (not additive) ✓
- Fanconi anemia OR 40.6× ✓
- HPV serotypes: papilloma 6/11, condyloma 6/11, verruca 2/4, Heck 13/32 ✓
- Gardasil 9: 6/11/16/18/31/33/45/52/58 ✓
- Heck NOT covered by Gardasil 9 (exam trap) ✓
- Leukoplakia MT: homogeneous 2.2% · non-homogeneous 2.6–11.9% · nodular/granular 4.1–8.7% · verrucous/PVL 29.2–32.2% ✓
- 39.6% paradox phrasing correct ✓
- Erythroplakia ~50% MT ✓
- Erythroplakia 75–90% already dysplasia/CIS/SCC at biopsy ✓
- Erythroplakia mean 3.7 mo from dx → cancer ✓
- PVL 48–50% MT · ~8× lifetime risk · F > M · often non-smokers · gingiva "ring around collar" ✓
- OSF 5.1% MT · mean 36 mo · areca nut · EMT cascade ✓
- Biopsy mnemonic: "Red over white, edge over center, deep for verrucous, multiple for big" ✓
- Tumor seeding = MYTH ✓
- Scalpel OR 3.6 · CO2 HR 0.14 · diode 93.5% CR · cryotherapy 100% CR · ALA-PDT 66–100% CR ✓
- Imiquimod = TLR-7 agonist ✓
- Beta-carotene CARET trap (↑ lung cancer in smokers) ✓
- SCC >90% of oral malignancies · mean age 66 · M:F 2–4:1 (SCC section) · lateral tongue 42% · induration #1 sign · 5 warning signs ✓
- AJCC 8 DOI added · ENE added · T1 ≤2 cm + DOI ≤5 mm · T3 >4 cm OR DOI >10 mm ✓
- T2 definition correct: ≤2 cm DOI 5–10 OR ≤4 cm DOI ≤10 ✓
- N1: single ipsi ≤3 cm ENE− · N3b: ENE+ (worst) ✓
- HPV-OPSCC: HPV-16 ~90% · 5-yr OS HPV+ ~80–85% vs HPV− ~40% · p16 reliable in oropharynx ONLY · E6→p53 / E7→Rb ✓
- Oral melanoma: ~50% hard palate · UV NOT cause · ~15% amelanotic (NOT 25%) · c-KIT+ → imatinib · BRAF rare ✓
- Verrucous CA: 0% metastasis · deep wedge bx mandatory · avoid RT (anaplastic transformation) ✓
- Pathosis vs pathology definitions correct ✓
- WHO 2017 OPMD nomenclature present ✓
- Visual exam ~60% sens / ~62% spec ✓
- 2nd primary 3–7%/yr · ~17% OPMD progress ✓

---

## ⚠️ Inaccuracies — 3 items

### 1. M:F ratio in Epi section: stated as 2.4:1 — UNSUPPORTED
**Line 160:** `M:F 2.4:1`  
**Source:** Both condensed and MASTER sources give **M:F 2–4:1** for SCC (same as SCC section on line 190 in the same notecard). Neither source gives a single-point value of 2.4:1 for oral cancer overall. The notecard-rebuild-l3.md Section 12 also states `M:F 2–4:1`. The 2.4:1 figure is not present anywhere in the source materials.  
**Fix:** Change to `M:F 2–4:1` or omit — do not invent a precision ratio absent from source.

### 2. N2a definition incomplete — missing ENE+ arm
**Line 193:** `N2a single ipsi 3–6 cm ENE−`  
**Source (MASTER line 1854):** N2a = single ipsilateral >3–6 cm ENE− **OR** single ipsilateral ≤3 cm with ENE+  
The ENE+ arm of N2a is the key teaching point — it's what differentiates N2a from N1 in the ENE context. The notecard only shows the size-based arm and omits `OR ≤3 cm ENE+`.  
**Fix:** `N2a single ipsi 3–6 cm ENE− OR ≤3 cm ENE+`

### 3. OPMD ranking order — PVL placed after erythroplakia, inconsistent with source
**Line 175:** `① Erythroplakia (~50%) ② PVL (~48–50%)`  
**Source (notecard-rebuild-l3.md Section 7):** ranks them `PVL/PL 48–50% >> Erythroplakia ~50%` with PVL first as "highest MT rate of any OPMD." The condensed HTML also states "PVL has the highest malignant transformation rate of any OPMD — >70%." Placing erythroplakia at ① creates a false exam-ready ranking. The source is internally consistent: PVL highest by the condensed guide, roughly tied (~50%) per the rebuild inventory.  
**Fix:** Either swap to `① PVL (~48–50%) ② Erythroplakia (~50%)` or present as tied — do not imply erythroplakia > PVL when source says PVL = highest.

---

## ❌ Missing HIGH-tier items — 3 gaps

1. **M:F for oral cancer overall not stated.** The epi paragraph uses the unsupported 2.4:1 instead of 2–4:1, which is a direct exam target (source: Section 12 HIGH).

2. **OSF median time figure correct but mechanism summary omits "irreversible."** Source (Section 8 HIGH): "Once established, OSF is irreversible." The notecard omits this clinically important qualifier.

3. **No mention of "leukoplakia is a clinical term, not a histologic diagnosis."** This is tagged `prof-highlight, verbatim` in Section 1 HIGH. The notecard mentions the WHO definition but not the histologic-vs-clinical distinction. This is a direct exam trap: biopsy returns "hyperkeratosis" — never "leukoplakia."

---

## 💡 Improvements — 3 suggestions

1. **OPMD ranking: drop DLE (line 175).** DLE (discoid lupus erythematosus) does not appear in any of the three source files as a ranked OPMD. Its presence at position ⑩ is unverified and could be confusing on an exam.

2. **Erythroplakia section: add the TWO-stats callout explicitly.** Currently the ~50% MT and the 75–90% histology stat are listed in sequence without flagging that they are distinct facts. Source (Section 5 HIGH): "These are TWO different stats — the 50% is the eventual MT rate; the 75–90% is the histology at initial presentation." This distinction is an explicit exam trap per the QA-verified corrections table.

3. **Leukoplakia section: "cannot be wiped or scraped" is slightly imprecise.** Source: "cannot be wiped/rubbed off" (distinguishing from pseudomembranous candidiasis). The notecard says "cannot be wiped or scraped" — "scraped" is correct but could conflate with the candida distinction. Consider adding `(unlike pseudomembranous candida)` as a parenthetical.

---

## Summary

| Category | Count |
|----------|-------|
| ✅ Verified | 42 |
| ⚠️ Inaccurate | 3 |
| ❌ Missing HIGH-tier | 3 |
| 💡 Improvements | 3 |

**Priority fixes before exam:** M:F ratio (2.4:1 → 2–4:1), N2a missing ENE+ arm, OPMD ranking order (erythroplakia vs PVL position). The fragment is otherwise densely accurate and covers all the high-stakes numeric facts correctly.
