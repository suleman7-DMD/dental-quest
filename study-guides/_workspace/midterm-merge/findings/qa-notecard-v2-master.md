# QA Report — Master Strip (06-fragment-notecard-v2.html)
**Audited against:** notecard-rebuild-l1.md · l2.md · l3.md · l4.md  
**Date:** 2026-05-03

---

## ⚠️ Internal Contradictions (Master Strip vs lecture column)

**1. T2 staging definition — AJCC 8**  
Master Strip (Numbers row): "T2 ≤2 cm DOI 5–10 OR ≤4 cm DOI ≤10"  
L3 inventory (Section 13): "T2 = up to 4 cm AND DOI ≤10 mm"  
The first clause (≤2 cm DOI 5–10) is a **partial description of the transition zone**, not a standalone T2 definition. T2 is simply: ≤4 cm AND DOI ≤10 mm. The "≤2 cm + DOI 5–10" phrasing misleads — it implies two separate T2 arms. **Drop the "≤2 cm DOI 5–10" clause or clarify it as an internal caveat.**

**2. MT rate labels misassigned in Numbers row**  
Master Strip: "Homog leuko 2.2% · Non-hom leuko 2.6–11.9% · Verrucous/PVL 29.2–32.2% · Nodular 4.1–8.7%"  
L3 inventory: 2.2% = no dysplasia; 2.6–11.9% = mild dysplasia; 4.1–8.7% = moderate dysplasia; 29.2–32.2% = **severe dysplasia**  
These are **dysplasia-grade MT rates**, not morphologic type (homogeneous/non-homogeneous) rates. The Master Strip has relabeled them as morphologic types, which is incorrect. Non-hom leuko rate = 15–25% (not 2.6–11.9%). Homogeneous leuko = ~3%, not 2.2%.

**3. "~17% OPMD progress" — no source**  
This number does not appear in any of the four inventory files. Possibly a rounded aggregate, but it is unverifiable and could confuse with the 6.6–8.4% leukoplakia rate. **Flag or remove.**

**4. 3 D's of Geographic Tongue — third D wrong**  
Master Strip (Mnemonics row): "3 D's geographic tongue: Dorsal/lateral · Depapillated · Demarcated white border"  
L2 inventory (Section 4): 3 D's = **Depapillated · Demarcated · Dynamic** (migrates location). "Dorsal/lateral" is the anatomical site, not a D. **Dynamic is the most critical one** (rules out malignancy) and is absent from the Master Strip mnemonic.

**5. OLP MT rate inconsistency**  
Master Strip (Numbers row): "OLP ~1%"  
Master Strip (QA corrections): "OLP MT ~1%, debated"  
L3 inventory (Section 7): **~1.4%**  
Use 1.4% to match the source. The "~1%" is an understatement and inconsistent across the card's own two locations.

---

## ⚠️ Mislabeled Pathognomonics

**6. "Crops of vesicles on keratinized + non-keratinized → primary HSV"**  
Primary HSV gingivostomatitis does involve non-keratinized mucosa in the acute phase, but the characteristic **board-tested** finding for HSV recurrence is keratinized tissue only. The pathognomonic descriptor for **primary HGS** is bilateral fever + diffuse ulceration in a child, not specifically the keratinized/non-keratinized pattern. The label is imprecise — more accurate: "pinhead coalescing vesicles on erythematous base, child, febrile, bilateral → primary HGS."

**7. "Mucous patches / snail-track + palms/soles rash → 2° syphilis"**  
Mucous patches and condyloma lata are pathognomonic; "snail-track" is a synonym used for linear ulcerations of secondary syphilis — acceptable but "snail-track" is less standard board vocabulary than "mucous patches" or "split papules at commissures." Low priority, but split papules are specifically prof-flagged (tier-3) and absent here.

---

## ⚠️ Prof-Quote Inaccuracies

**8. Prof-Quotes row, L4: "Submandibular gland makes 70% of resting saliva — that's why it matters."**  
This is listed as a prof-verbatim quote, but L4 inventory notes the 70% stat is a **gap** — "NOT stated" in the compiled section (Section 2 GAP NOTE). It is accurate scientifically, but presenting it as a direct prof quote when it was not verbally stated is an inaccuracy. Mark as "(standard teaching)" not verbatim.

**9. Prof-Quotes row, L1: "EBV-MCU in immunosenescent patients is the great mimicker — bx and check EBER."**  
The "great mimicker / great imitator" label in L1 inventory is explicitly attached to **syphilis** ("The Great Imitator"). EBV-MCU is described as mimicking malignancy/ANUG/traumatic ulceration, but it is not called "the great mimicker" in the source. The phrase may confuse syphilis vs EBV-MCU on exam. Change wording for EBV-MCU quote.

---

## ⚠️ Number Mismatches

**10. Tubarial glands — year of discovery**  
Master Strip (Numbers): "Tubarial glands 4th pair 2020"  
L4 inventory (Section 2): "Tubarial glands 4th pair **2021** (Valstar et al., Radiother Oncol)"  
**2021 is correct.** Change 2020 → 2021.

**11. "Impetigo 2–5 yr olds" — imprecise**  
L1 inventory: most common bacterial skin infection in **2–5 year olds**. Master Strip matches. ✓

**12. Acyclovir dosing for primary HSV**  
Master Strip (Numbers + Drug grid): "Acyclovir 15 mg/kg 5×/d ×7d"  
L1 inventory matches this exactly. ✓

**13. RAS minor size**  
Master Strip: "RAS minor <1 cm"  
L2 inventory: minor = **3–10 mm** (which is <1 cm). ✓ Consistent, minor note only.

---

## ⚠️ Bad DDx Items

**14. "Painless ulcer >2 wk" DDx — TB listed implicitly but not called out**  
The source L1 inventory explicitly states: DDx for painless oral ulcer (ordered) = Syphilis → TUG → SCC → aphthous → Mpox. Master Strip leads with "SCC #1" for this presentation, but the L1 source puts syphilis first for painless ulcers. For >2 wk painless ulcers, SCC is reasonable first, but the DDx should note that **syphilitic chancre** is specifically a painless ulcer and should be high on the list — the Master Strip does include it in the same card, so this is acceptable but ordering should be clarified.

**15. "Target lesions + lip crusts → EM (HSV) · RIME · SJS overlap"**  
The source (L2, Section 11) distinguishes: EM = raised 3-ring iris target lesions (HSV); RIME = prominent mucositis without much skin. The DDx card's grouping is reasonable, but it should note that **RIME does NOT typically have the classic 3-ring target lesions** — they are EM's hallmark. Acceptable for a quick DDx card, but worth a clarifying note.

---

## ⚠️ QA-Correction Self-Errors

**16. "Verrucous CA: 0% metastasis but invasion through BM"**  
L3 inventory (Section 16): Verrucous CA is described as having **wide pushing border** (not infiltrative), and "virtually never metastasizes in pure form." The statement "invasion through BM" is technically inaccurate — the defining feature of verrucous CA is its **pushing, non-infiltrative** border. It technically does breach the BM (it's carcinoma), but the distinguishing feature from conventional SCC is the **lack of infiltrative invasion**. The QA correction should say "broad pushing border" not "invasion through BM" — the latter implies conventional SCC behavior.

**17. "OLP MT ~1%, debated; classified OPMD by WHO but lower than other OPMDs"**  
L3 inventory: ~1.4%. L2 inventory (Section 8): "OLP may NOT be a true OPMD" per prof's updated position. The card does note "debated" which is correct. However, using "~1%" (not 1.4%) creates a minor mismatch. Fix to 1.4%.

All other QA corrections verified correct against the inventories:
- Amelanotic 15% ✓ (L3 inventory explicit)
- HPV− OPSCC ~40% ✓ (L3 inventory explicit exam-trap)
- Tobacco × alcohol multiplicative ~30× ✓ (L3 inventory)
- p16 oropharynx only ✓ (L3 inventory)
- Allopurinol #1 for SJS/TEN ✓ (L2 inventory)
- Carbamazepine + HLA-B*1502 ✓ (L2 inventory)
- Sjögren 30% seroneg ✓ (L4 inventory)
- Erythroplakia 50% MT vs 75–90% already dysplasia — TWO STATS ✓ (L3 inventory)

---

## ❌ Missing Master Strip Items

**18. "Split papules at commissures" for 2° syphilis** — prof-flagged tier-3, absent from pathognomonic anchors. Currently only "mucous patches / snail-track" listed. Add: "Split papules at commissures" as secondary syphilis anchor.

**19. Kondyloma lata** — prof-flagged as board buzzword for 2° syphilis, absent from pathognomonic row.

**20. "Migratory = pathognomonic" for geographic tongue** — the clinically reassuring feature is that it MOVES (rules out cancer). The 3 D's mnemonic drops "Dynamic" (see #4 above). This is high-yield and entirely missing.

**21. "Cornflakes on face"** — prof's own visual mnemonic for impetigo; absent from Master Strip though present in L1 and should be in Mnemonics row.

**22. Serology false-negative window (syphilis 6 weeks)** — L1 marks this as prof-flag-tier-3, high yield. Not in the Master Strip Numbers or DDx.

---

## 💡 Improvements

1. **Fix the 3 D's mnemonic** (highest priority): Replace "Dorsal/lateral" with "Dynamic" — this is the pathognomonic one that rules out malignancy.

2. **Relabel MT rate table in Numbers row**: The 2.2% / 2.6–11.9% / 4.1–8.7% / 29.2–32.2% series are **dysplasia-grade rates**, not morphologic subtypes. Label them correctly: "No dysplasia 2.2% · Mild dysp 2.6–11.9% · Mod dysp 4.1–8.7% · Severe dysp 29.2–32.2%."

3. **T2 staging**: Simplify to "T2 ≤4 cm AND DOI ≤10 mm" — the "≤2 cm DOI 5–10" sub-clause is creating a false impression of two T2 arms.

4. **Tubarial glands year**: 2021 not 2020.

5. **OLP MT rate**: Standardize to 1.4% everywhere (currently 1% in Numbers, 1% in QA corrections, 1.4% in L3 source).

6. **Sialagogue CIs**: "Parkinson" is listed as a CI but L4 inventory lists it under uncommon/de-emphasized causes of dry mouth, not as a pilocarpine CI. The actual canonical CIs from L4 are: uncontrolled asthma, narrow-angle glaucoma, cardiac disease. Parkinson is not a CI in the source — **remove or verify**.
