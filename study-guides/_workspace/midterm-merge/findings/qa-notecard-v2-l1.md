# QA Report — Notecard v2, L1 Infectious Diseases (Red Column)
**Date:** 2026-05-03  
**File audited:** `06-fragment-notecard-v2.html` lines 39–85 (`#nc-col-l1`)  
**Sources:** `notecard-rebuild-l1.md` (104-item inventory) + `od531-midterm-infectious-diseases.html` (lecture material)

---

## Verified Facts

~65 factual claims checked. Roughly **75% verified clean** — pathogen pairings, HHV taxonomy (1–8), PPD cutoffs, RIPE/RI durations, mupirocin dose, fluconazole range, Koplik/measles, owl-eye/CMV, EBER ISH/EBV-MCU, Hutchinson sign, reportable disease list (syphilis/TB/measles/mumps), keratinized vs non-keratinized rule, Augmentin weight cutoff, and clotrimazole-diabetes CI are all correct.

---

## Inaccuracies

### 1. Syphilis — "cursed corkscrews" linked to silver stain (wrong stain method)

**Notecard line (line 55):**
> `— silver stain shows "cursed corkscrews"`

**Problem:** The lecture source explicitly states that silver stain (Warthin-Starry) has **0–41% sensitivity** and is described as the "older, less sensitive method." The primary recommended method is **immunohistochemistry (IHC), 64–94% sensitivity**. The "cursed corkscrews" mnemonic is Henderson's general description of *T. pallidum* morphology on biopsy — it applies to IHC, not specifically to silver stain.

**Source (lecture file, card-syphilis-1):**
> "Silver stain (Warthin-Starry): 0–41% ... Older method, much less sensitive"
> "IHC (immunohistochemistry): 64–94% ... First-line on biopsy"

**Fix:** Change to `— on biopsy (IHC preferred; silver stain 0–41% sensitivity)` and drop the implication that silver stain is the method of choice.

---

### 2. Syphilis — Primary chancre onset "3 wk post-exposure"

**Notecard line (line 56):**
> `PRIMARY: painless chancre 3 wk post-exposure, heals 3–6 wk untreated`

**Problem:** The lecture states onset is **"3–90 days post-exposure"** (highlighted). Writing "3 wk" as a fixed number collapses the entire range (3–90 days = ~1–13 weeks) and could cause an exam error if a vignette specifies 6 or 8 weeks.

**Source (lecture file, card-syphilis-1):**
> "Onset: 3–90 days post-exposure (highlighted)"

**Fix:** Change to `3–90 d post-exposure` (or at minimum `~3 wk avg, range up to 90 d`).

---

### 3. HSV — Acyclovir dose window "72h" (notecard) vs "5 days" (source)

**Notecard line (line 65):**
> `acyclovir 15 mg/kg 5×/d ×7d if <72 hr`

**Cross-cuts traps section (line 83):**
> `Acyclovir window 72h`

**Problem:** The lecture source drug table explicitly states acyclovir must be started **"≤ 5 days from onset"**, NOT 72 hours. The 48-hour window mentioned in the inventory refers to starting antivirals generally (acyclovir or valacyclovir for RHL/cutaneous), not a 72-hour cutoff for PrHGS. The notecard compounds this error by also stating "Acyclovir window 72h" in the traps section.

**Source (lecture file, card-hsv-drugs table):**
> "Must start ≤ 5 days from onset"

**Source (notecard inventory, Section 5 HIGH):**
> "THE exam question: is patient still within 48-hr window to start acyclovir/valacyclovir?"

**Clarification needed:** The 48-hour rule applies to initiating antivirals to abort an RHL episode (within 48h of prodrome). For PrHGS/primary HSV, the lecture source says ≤ 5 days. The notecard conflates these into a single "72h" claim that matches neither source.

**Fix:** Split into two rules: `PrHGS: start acyclovir ≤5 d from onset` | `RHL: start within 48h of prodrome for best effect`. Delete the blanket "Acyclovir window 72h" in traps.

---

### 4. HSV — Valacyclovir for RHL: "2 g BID ×1d" (not in source)

**Notecard line (line 65):**
> `severe → valacyclovir 2 g BID ×1d`

**Problem:** The lecture's drug master table lists valacyclovir as **"1 g PO BID × 5 d"** for nasal/cutaneous HSV, and **"1 g PO TID × 7 d"** for HZO. The "2 g BID ×1d" single-day regimen does not appear anywhere in the lecture source. This is a standard one-day high-dose regimen from other guidelines (Famvir/1-day dosing concept), but it is **not in Henderson's lecture material** and could be wrong on her exam.

**Source (lecture file, card-hsv-drugs and drug master table):**
> "Valacyclovir 1 g PO BID × 5 d (nasal/cutaneous HSV)"

**Fix:** Change to `valacyclovir 1 g BID ×5d` to match the lecture source.

---

### 5. EBV-MCU discriminators — LDH/IL-2R direction inverted

**Notecard line (line 80):**
> `Discriminators: ↑LDH, ↑IL-2R, EBV DNA viral load`

**Problem:** The source states that EBV MCU is **distinguished from aggressive lymphoma** by having **NORMAL (not elevated) LDH and NORMAL (not elevated) IL-2R**, plus low/absent peripheral EBV DNA. The notecard's upward arrows imply elevated values, which is the lymphoma pattern — the exact opposite of the EBV MCU pattern.

**Source (lecture file, card-ebv-mcu):**
> "normal LDH + normal IL-2R + EBV DNA < 1,000 copies/mL"

**Source (inventory, Section 9 HIGH):**
> "Distinguished from aggressive lymphoma by: Normal LDH + normal IL-2R + low/absent peripheral EBV DNA"

**Fix:** Change to `Discriminators (vs lymphoma): normal LDH · normal IL-2R · EBV DNA <1,000 copies/mL`.

---

### 6. "Wipes off → Candida; doesn't wipe → leukoplakia/lichenoid" (imprecise and partially wrong)

**Notecard line (line 47 and line 83):**
> `"if it wipes off → Candida; if it doesn't → leukoplakia/lichenoid"`
> `"Wipes off" rule → Candida; doesn't wipe → leukoplakia/lichenoid`

**Problem:** The lecture's DDx for "white plaques that wipe off" is: **Candidiasis → strep throat → herpangina → gonorrhea** (not just Candida). More critically, the source's "wipe-off" rule for Candida specifically is: "wipes off = pseudomembranous; **doesn't wipe = hyperplastic candidiasis** (biopsy needed)" — leukoplakia/lichenoid is a broader clinical decision, not the direct second branch of this rule. The current framing is clinically imprecise and misses the key point that **hyperplastic Candida also doesn't wipe off and requires biopsy**.

**Source (inventory, Cross-cutting HIGH):**
> "White plaque that wipes off → DDx: candidiasis, strep, herpangina, gonorrhea. Does NOT wipe off → hyperplastic candidiasis (biopsy)"

**Fix:** Revise to `"wipes off" → Candida (pseudo) — DDx also strep/herpangina; doesn't wipe → hyperplastic Candida (biopsy) OR leukoplakia`.

---

## Missing HIGH-Tier Items

### 7. 48-hour antiviral window (explicit exam question)

The inventory marks this as **HIGH / prof-flag-tier-1**: "THE exam question: is patient still within 48-hr window to start acyclovir/valacyclovir?" This specific clinical decision-making trigger is absent from the notecard. The current card conflates it into a wrong "72h" claim instead.

**Should add:** A distinct callout — `48h prodrome window: RHL — start antiviral within 48h of first tingle for max benefit`.

---

### 8. TB: "do NOT biopsy first" — explicitly missing

The inventory marks this as **HIGH / prof-flag-tier-2**: "Do NOT biopsy first if TB is suspected — perform biopsy ONLY after workup." The notecard covers TB drug regimens but **never states the no-biopsy-first rule**, which is Henderson's most drilled procedural point for TB at the dental chair.

**Should add:** After the TB Dx line: `NEVER biopsy first — workup + airborne PPE + ID referral FIRST`.

---

### 9. Tertiary syphilis — "3-dose" claim not in source

**Notecard line (line 56):**
> `Penicillin G IM (single dose primary; 3-dose tertiary)`

The lecture source does not specify a "3-dose tertiary" regimen — it only lists "Benzathine Penicillin G 2.4 MU IM × 1" for primary/secondary and refers tertiary/neurosyphilis to ID without stating a dose count. This is technically from standard guidelines (3 weekly doses for late latent/tertiary) but **not stated in Henderson's lecture** and should not appear as a tested fact without source confirmation.

**Note:** This is a minor flag — the 3-dose fact is medically correct from general guidelines. Mark it as "not explicitly sourced from Henderson's slides" on the card if it is kept.

---

## Improvements

1. **Syphilis secondary**: Add "snail-track ulcers" only as a synonym note (it is not the slide term — the slide says "serpentine pattern"); the current `"snail-track ulcers"` phrasing in the secondary mucous patches line is not verbatim from Henderson and could confuse with a different entity. The slide term is "serpentine mucous patches."

2. **Mumps IgM caveat is missing**: The notecard lists `RT-PCR buccal swab + IgM` but the source specifically highlights that **IgM can be falsely negative in vaccinated patients** — RT-PCR is the gold standard for this reason. The notecard's pairing implies they are equally reliable, which is the exact trap Henderson set.

3. **Congenital syphilis — Hutchinson triad naming collision**: The triad is correct (Hutchinson incisors, mulberry molars, interstitial keratitis) but note that "Hutchinson sign" appears in two places — Hutchinson triad (congenital syphilis) AND Hutchinson sign (VZV nasal tip). Consider labeling one as "Hutchinson nasal-tip sign" and the other as "Hutchinson incisors (congenital syph)" to prevent mix-up under exam pressure.

4. **Primary HSV location rule**: The notecard states crops of vesicles "on KERATINIZED + non-keratinized mucosa" for primary HSV. This is correct for PrHGS (primary can hit both). However, the Recurrent HSV line correctly restricts to keratinized only. The distinction is already there but the KERATINIZED capitalization in the primary section may cause students to think keratinized is the restriction rather than the emphasis.

5. **Density opportunity**: The TB section could add "oral TB = always secondary" in one phrase — this is HIGH per inventory and is currently absent from the card.
