# QA Report — Notecard v2 L2 (Allergies & Immunologic, Blue Column)
**File:** `06-fragment-notecard-v2.html` lines 90–133
**Sources:** `notecard-rebuild-l2.md` (125 items) + `od531-midterm-allergies-immunologic.html`
**Date:** 2026-05-03

---

## Verified Count: 38 distinct HIGH-tier claims checked

All of the following are confirmed accurate:
- Hypersensitivity Types I/II/III/IV + pseudoallergic mechanism
- RAS: non-keratinized only, 3 variants, complex aphthosis ≥3 criteria, age >40 workup (Behçet/IBD/celiac/HIV/hematinic def)
- Corticosteroid ladder order (clobetasol > fluocinonide > dex elixir > triamcinolone), vermilion NEVER rule
- Geographic tongue 3 D's = Depapillated, Demarcated, Dynamic (not Dorsal) — correct per source line 1697
- DRGH: 3 drug classes, 1–3 mo onset, plaque control first
- Immunobullous Pegasus/Hades framework, split level, DIF patterns
- OLP: auto-inflammatory NOT autoimmune, 4 P's, Wickham striae bilateral buccal, ~1% MT
- MMP: subepithelial, desquamative gingivitis #1, ophtho refer ALL, Michel's medium, 2-vial trap, "Don't Lose Your Sushi"
- PV: IgG vs DSG3 ± DSG1, >50% oral first, flaccid bullae, chicken-wire DIF, PDAI severity
- SJS/TEN: BSA cutoffs (<10/10–30/>30), allopurinol #1, HLA-B*1502 + carbamazepine, SCORTEN
- PNP/PAMS: always malignancy (NHL/CLL/Castleman/thymoma), bronchiolitis obliterans = death
- Cross-cutting: BSA table, histology table, IBS vs IBD trap (Crohn cobblestone/OFG/pyostomatitis vegetans) — all correct

---

## Inaccuracies

### 1. CRITICAL — MMP listed as Nikolsky+ (wrong)
- **Notecard says:** MMP section (line 119): `Nikolsky+`; Immunobullous section (line 113): "Nikolsky sign: positive in PV, **MMP**, SJS/TEN"; Cross-cutting table (line 131): `Nikolsky+: PV, MMP, SJS/TEN, PNP`
- **Correct:** MMP is **Nikolsky NEGATIVE**. Subepithelial tense blister — harder to shear.
- **Source quote:** "Nikolsky Sign: NEGATIVE in MMP. Because the split is subepithelial (tense blister, thick roof), lateral pressure on intact mucosa does NOT easily produce a blister." (od531 line 3232); "PV = intraepithelial, Nikolsky POSITIVE … MMP = subepithelial, Nikolsky NEGATIVE." (line 5696); notecard-rebuild-l2.md Section 9 HIGH: "Nikolsky sign = NEGATIVE in MMP"
- **Impact:** Appears in 3 separate places in the L2 column — all three must be corrected.

### 2. MINOR — EM 90% HSV trigger (imprecise)
- **Notecard says (line 125):** `EM: target lesions, 90% triggered by HSV`
- **Correct:** EM specifically is triggered by HSV in **~70%** of cases. The 90% figure applies to EM/RIME *combined* as "infection-triggered" broadly.
- **Source quote:** "HSV trigger ~70%; young adults; skin prominent; raised 3-ring targets" (line 1189); quick-fact callout "~70% Triggered by HSV" (line 4202); "EM/RIME infection-triggered: 90% of patients" (line 4971).
- **Impact:** Conflates two statistics. Notecard-rebuild-l2.md Section 11 states "EM = HSV ~70%; RIME = Mycoplasma + other respiratory pathogens" under the 5-row comparison.

### 3. MINOR — Section header mislabels TLP section as "Toxic / Lichenoid / Plasma-cell stomatitis (TLP)"
- **Notecard says (line 109):** `Toxic / Lichenoid / Plasma-cell stomatitis (TLP)`
- **Correct:** TLP = **Transient Lingual Papillitis**. The content below the header correctly describes Plasma Cell Gingivitis (PCG) / cinnamon reaction — it is NOT TLP content. These are two separate Tier 1 entities.
- **Source:** notecard-rebuild-l2.md Section 6 is "TRANSIENT LINGUAL PAPILLITIS (TLP)" (lie bumps, fungiform papillae, reassurance). PCG is a separate section in the source (Section 15). The L2 column has mashed them together under a wrong label.
- **Impact:** A student reading this would conflate TLP (lie bumps, fungiform papillae) with PCG (cinnamon-triggered plasma cell gingivitis). TLP content (lie bumps, 2–15 day resolution, reassurance first-line) is absent.

---

## Missing HIGH-tier Items

1. **TLP actual content absent:** "lie bumps," painful erythematous papules on fungiform papillae tip/dorsolateral tongue, resolves 2–15 days, first-line = reassurance. (notecard-rebuild-l2.md Section 6 HIGH)
2. **Doctor Bob recipe details missing:** Notecard-rebuild-l2.md documents the "Doctor Bob" Rx as a single SLS-free toothpaste brand (not a dex elixir recipe). The notecard's "Doctor Bob recipe" line (line 101) incorrectly presents it as a dex elixir regimen — that is the standard dex protocol, not "Doctor Bob." Doctor Bob = SLS-free, dye-free, gluten-free, unflavored toothpaste. Source: rebuild-l2.md Section 3 HIGH-SLS.
3. **Anti-laminin 332 → cancer screen absent:** 25% of anti-laminin 332-positive MMP patients have occult adenocarcinoma — life-saving step per source (notecard-rebuild-l2.md Section 9 HIGH). Not mentioned in MMP block.

---

## Improvements

1. Fix all three Nikolsky MMP instances: change `Nikolsky+` → `Nikolsky−` in MMP section AND immunobullous framework AND cross-cutting table.
2. Change "90% triggered by HSV" → "~70% triggered by HSV" for EM specifically; keep "90%" only for the combined EM/RIME infection-triggered statistic.
3. Rename the TLP section header to `Transient Lingual Papillitis (TLP)` and add the actual TLP content (lie bumps, fungiform papillae, 2–15 days, reassurance). Move PCG/cinnamon content to its own "Plasma Cell Gingivitis (PCG)" micro-section or the L2 cross-cutting block.
4. Add anti-laminin 332 → cancer screen as a red-flag bullet in the MMP block.
