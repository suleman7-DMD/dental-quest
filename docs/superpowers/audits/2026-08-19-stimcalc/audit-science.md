# Scientific Validity Audit — Stimulant Elimination / Sleep-Prediction Model

**Date:** 2026-08-19
**Auditor role:** Scientific validity (pharmacology + sleep science). No code written; no files modified except this report.
**Subject:** The stim-calc app's model for predicting the earliest time the user can fall asleep, given Adderall XR doses, caffeine, circadian phase, sleep debt, exercise, sauna, and nicotine.

**Verdict scale:** SOUND / PARTLY SOUND / UNSUPPORTED — with the specific correction each component needs.

**Top-line:** The pharmacokinetic *backbone* of this model is more defensible than most consumer sleep apps — the Adderall XR two-pulse-at-4h release is a near-verbatim match to the FDA label, and the caffeine, exercise, sauna, and nicotine directions are all literature-supported. The weak points are (a) the vitamin-C half-life multiplier, whose magnitude is overstated for ordinary doses; (b) the circadian "forbidden zone" being anchored to *wake* time and treated as an absolute hard blocker; and (c) the mg-based threshold bonuses (sleep debt, sauna) being physiologically ungrounded *unit conversions* even where their *direction* is correct. Every one of those weak points is exactly the kind of thing N=1 self-calibration should own rather than population constants. Details and the minimal defensible model are below.

---

## Q1 — Adderall XR release: 50/50 two-pulse, second pulse at ~4h — **SOUND**

**The model:** each XR dose = 50% released immediately + 50% released at T+4h; each pulse decays as Dose × 0.5^(hours/half_life) with half-life ≈ 11h.

**Evidence.** This is an unusually close match to the FDA-approved mechanism. The Adderall XR label (mixed amphetamine salts ER) states verbatim:

> "The capsule contains two types of drug-containing beads designed to give a double-pulsed delivery of amphetamines."
> "A single dose of [Adderall XR] 20 mg capsules provided comparable plasma concentration profiles of both d-amphetamine and l-amphetamine to ADDERALL (immediate-release) 10 mg bid administered 4 hours apart."
> "The time to reach maximum plasma concentration (Tmax) … is about 7 hours, which is about 4 hours longer compared to ADDERALL (immediate-release)."

So a 20 mg XR dose is pharmacokinetically equivalent to two equal 10 mg immediate-release pulses given 4 hours apart — i.e., **exactly a 50/50 split with the second pulse at +4h.** The app's two-pulse abstraction is essentially the label's own description.
(DailyMed Adderall XR label: https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=f6c30ba1-53d0-4f85-a515-81acfb922e73&type=display)

**Half-life.** Label / StatPearls values in adults: **d-amphetamine ≈ 10 h, l-amphetamine ≈ 13 h.** Adderall is a 3:1 d:l salt mix, so an exposure-weighted blended half-life is ≈ 10.5–11 h. The app's single 11 h constant is a reasonable one-compartment approximation of a two-enantiomer system. (StatPearls Dextroamphetamine-Amphetamine: https://www.ncbi.nlm.nih.gov/books/NBK507808/)

**Caveats (minor, don't invalidate):**
- Real absorption is not an instantaneous step — each "pulse" has a finite absorption phase (first-order rise then decay), so true plasma curves are smoother/rounded rather than two sharp decays. For a *clearance-time* prediction this over-estimates the very early peak but is accurate on the falling tail, which is the part that matters for "when can I sleep." Acceptable simplification.
- The label describes concentration *profiles*, not a literal 50/50 mass split; the 50/50 is the app's inference. It is the right inference for a 20 mg dose (10+10 bid). For odd formulations (e.g., a 30 mg XR modeled as 15+15) it remains a fair approximation.
- Enantiomer collapse into one 11 h pool ignores that l-amphetamine lingers ~30% longer; if anything this makes the app slightly *optimistic* about late-night clearance of the l-fraction. Negligible for the use case.

**Verdict: SOUND.** Keep the two-pulse-at-4h structure and the ~11 h half-life. This is the strongest part of the model.

---

## Q2 — Vitamin C → half-life × 0.7 for 8 h — **PARTLY SOUND (direction right, magnitude overstated)**

**The model:** taking vitamin C multiplies amphetamine half-life by 0.7 (11 h → 7.7 h) for an 8 h window, via urinary acidification.

**Evidence — the mechanism is real.** Amphetamine is a weak base (pKa ≈ 9.9). In acidic urine it stays ionized, is not reabsorbed in the renal tubule, and is excreted faster; in alkaline urine it is reabsorbed and its half-life lengthens. The FDA label makes this explicit:

> "Urinary acidifying agents (ammonium chloride, sodium acid phosphate, etc.) increase the concentration of the ionized species of the amphetamine molecule, thereby increasing urinary excretion."
> "Gastrointestinal alkalinizing agents (sodium bicarbonate, etc.) increase absorption of amphetamines."

The classic Beckett & Rowland work (J Pharm Pharmacol, 1965) established that amphetamine's half-life swings widely with urine pH — on the order of ~7–8 h under forced-acidic conditions vs. ~16–34 h under alkaline conditions. Modern PBPK modeling reproduces an ~11-fold difference in urinary excretion between acidic and alkaline urine.
(Beckett 1965: https://onlinelibrary.wiley.com/doi/abs/10.1111/j.2042-7158.1965.tb07575.x ; PBPK: https://jpet.aspetjournals.org/content/373/3/488 ; StatPearls pKa/excretion: https://www.ncbi.nlm.nih.gov/books/NBK507808/)

**Why the magnitude is overstated.** The large half-life swings in the literature come from *forcing* urine pH to ~5 with grams of ammonium chloride — not from an ordinary vitamin C tablet. Crucially, **the FDA label's list of acidifying agents does not include ascorbic acid** — it names ammonium chloride and sodium acid phosphate. Ordinary vitamin C is a weak, partial acidifier:
- A **1,000 mg** dose of ascorbic acid lowers urine pH by only ~0.5–1.0 units in healthy adults, and not reliably below the pH ~6 needed to meaningfully shift amphetamine ionization.
- Sustaining urine pH < 6 for acidification purposes classically requires **large repeated doses (grams every few hours, ~12 g/day)** — not a single supplement.
- In animal work, ascorbic acid had **no measurable effect on amphetamine half-life in brain**, i.e., ordinary antioxidant doses don't move central drug levels.
(Urine-acidification magnitude & vitamin C dosing: https://www.sciencedirect.com/topics/medicine-and-dentistry/urine-acidification ; https://tmedweb.tulane.edu/pharmwiki/doku.php/ph_effect_on_drug_elimination)

**Assessment of the specific constants:**
- **× 0.7 (a 30% half-life cut):** achievable only under *forced* acidification. For a realistic single 0.5–2 g vitamin C dose, the true effect is small and variable — plausibly a few-percent-to-~10% shortening, not 30%. The 0.7 multiplier should be treated as an *upper bound for aggressive, repeated, high-dose acid loading*, not the default for one tablet.
- **8 h window:** directionally sensible — a single acidifier dose lowers pH only transiently (hours), so an expiring effect is more physiological than a permanent one. 8 h is a reasonable order of magnitude for how long one dose holds pH down, though the real curve tapers rather than cliff-expires.

**Verdict: PARTLY SOUND.** Keep the *mechanism* and the *expiring window*. Reduce the default magnitude substantially (e.g., ~0.9 for a normal 1 g dose) and reserve 0.7 for explicitly logged high-dose/repeated acid loading. This is a prime candidate for N=1 calibration (see Q9) — the true effect for *this* user's dose and diet is knowable only from his own data.

---

## Q3 — Fixed "mg body-load threshold below which sleep is possible" — **PARTLY SOUND (defensible engineering simplification of a continuous effect)**

**The model:** sleep becomes possible when total amphetamine body-load drops below an effective threshold (base 14 mg + bonuses).

**Evidence.** There is no clean literature "plasma concentration below which sleep switches on." Amphetamine's sleep interference is a **continuous, dose-dependent** phenomenon, not a step function:
- Kidwell et al. 2015 (Pediatrics), meta-analysis of randomized stimulant trials with objective sleep measurement: stimulants significantly **lengthen sleep-onset latency** (effect size 0.54), **shorten total sleep time** (−0.59), and worsen efficiency; **dose frequency was a significant moderator** (more/later dosing → worse). (https://pubmed.ncbi.nlm.nih.gov/26598454/)
- Human/animal PSG work shows amphetamine **dose-dependently** increases wakefulness and sleep-onset latency and suppresses REM. A pooled estimate is on the order of a ~20 min increase in sleep-onset latency at typical clinical doses. (Sleep architecture review: https://sleepreviewmag.com/sleep-disorders/hypersomnias/narcolepsy/pharmacology-and-sleep-disorders/)

**Why a threshold is still reasonable.** For a *decision* app ("what's the earliest realistic sleep time?"), collapsing a continuous dose-response into "sleep is achievable once load < X" is a legitimate engineering abstraction — the same way a caffeine app picks a cutoff. The important scientific honesty is that:
1. X is not a biological constant; it is **person-specific and even night-specific** (it interacts with sleep pressure and circadian phase — which the app correctly makes it do via the bonuses).
2. "Load in mg" is not the same as plasma concentration or CNS occupancy; it's a convenient proxy. As long as the *same* proxy is used to fit X from the user's own successful/failed sleep attempts, the units cancel out and it works.

**Verdict: PARTLY SOUND.** The threshold is an acceptable simplification *provided the base value (14 mg) is treated as a calibratable N=1 parameter, not a literature constant.* No paper supports "14 mg" specifically; it should be fit from his logs (see Q9). Consider surfacing a soft band (e.g., "hard to sleep 14–18 mg, likely below 12 mg") rather than a single hard line, to reflect the continuous reality.

---

## Q4 — Caffeine half-life ~5–6 h + threshold clearance + timing cutoff — **SOUND**

**Evidence.**
- **Half-life:** mean ≈ **5 h in healthy adults**, but with enormous inter-individual range (~1.5–9.5 h; up to ~40-fold clearance variability), driven mostly by **CYP1A2** (~95% of caffeine metabolism). Fast metabolizers ~3 h; slow ~6–10+ h. Modifiers matter here: **smoking/nicotine roughly halves caffeine half-life** (CYP1A2 induction), oral contraceptives can double it. (StatPearls Caffeine: https://www.ncbi.nlm.nih.gov/books/NBK519490/)
- **Timing cutoff:** Drake et al. 2013 (J Clin Sleep Med), double-blind crossover, 400 mg caffeine at 0, 3, and 6 h before bed vs placebo — **even the 6-h-before dose significantly reduced objective (EEG) total sleep time** (7.68 h → 6.50 h, ~1 h lost). This is direct empirical support for a ≥6 h pre-bed caffeine cutoff and for modeling caffeine as a persistent sleep-onset threat. (https://pubmed.ncbi.nlm.nih.gov/24235903/)

**Assessment.** Threshold-clearance modeling (must fall below its own threshold) is exactly the right shape for caffeine, and separating it from the amphetamine channel is correct — different enzymes, different kinetics, additive arousal. The app's 5–6 h assumption is a good *population default.*

**One caution worth encoding:** because caffeine variability is ~40-fold and largely genetic, **the population half-life is the least trustworthy constant to apply to an individual** — this is the single best candidate for N=1 calibration (Q9). Also note the smoking/nicotine interaction: on days the user logs nicotine, his caffeine half-life is likely *shorter*, a coupling the app could eventually model.

**Verdict: SOUND** (with the caveat that the individual half-life should be calibrated, not assumed).

---

## Q5 — Circadian "wake maintenance / forbidden zone," anchored to 7-day average wake, as a hard blocker — **PARTLY SOUND (real phenomenon, wrong anchor + too absolute)**

**Evidence — the zone is real.** The Wake Maintenance Zone / "forbidden zone for sleep" (Lavie 1986; extended by Strogatz) is a well-replicated circadian *alerting* signal in the **2–3 h before habitual sleep onset**, during which sleep propensity is lowest even under high sleep pressure. It sits just before the dim-light melatonin onset (DLMO). (Frontiers 2023: https://www.frontiersin.org/journals/sleep/articles/10.3389/frsle.2023.1304647/full ; JCSM WMZ performance study: https://pubmed.ncbi.nlm.nih.gov/23585751/)

**Problem 1 — anchor.** The zone is fixed to **circadian phase**, best proxied by **habitual sleep-onset time** (it falls ~2–3 h before sleep onset; DLMO ~2–3 h before sleep onset; WMZ ~6–10 h before the core-body-temperature minimum). The app anchors it to **wake time + a fixed 13–15 h offset.** That only coincides with "2–3 h before sleep onset" **if the wake-to-sleep interval is constant (~16 h / 8 h sleep).** For a dental student with ADHD and irregular sleep — the exact person who pulls all-nighters and shifts wake time — wake-anchoring will drift the predicted zone away from his true circadian evening. **Anchoring to habitual sleep onset (or midsleep) is more defensible than wake + offset.** Averaging over 7 days is reasonable for smoothing, but average *sleep onset* (or DLMO estimated from it) is the better quantity to average.

**Problem 2 — hard blocker.** Lavie's "forbidden" is a strong *dip in propensity*, not an absolute physical impossibility — people can and do fall asleep in the WMZ under high sleep debt; it is harder, not barred. Treating it as an inviolable "cannot sleep" hard blocker overstates the physiology and can push predictions later than reality on high-sleep-debt nights (when Process S can partly override the circadian alerting). A **strong penalty / low-probability window** is more faithful than an absolute gate.

**What's right.** Having a circadian term at all — most sleep apps ignore it entirely — is a real strength, and placing peak "can't sleep" alertness in the pre-bed evening is correctly located. The Sleep Gate (optimal) at a later phase is also consistent with the propensity rising after the WMZ toward the nocturnal maximum.

**Verdict: PARTLY SOUND.** Keep a circadian term; **re-anchor it to habitual sleep-onset time (or midsleep) rather than wake+offset**, and **convert the "Forbidden Zone" from a hard blocker into a strong probabilistic penalty** that sufficient sleep debt can partially overcome.

---

## Q6 — Sleep-debt → +0–6 mg threshold bonus (Process S); all-nighter zeroes it (hyperarousal) — **PARTLY SOUND**

**Evidence — sleep pressure part.** Process S (Borbély two-process model) is real and well-established: homeostatic sleep pressure builds with time awake, driven largely by **adenosine** accumulation, and higher sleep pressure raises sleep propensity and shortens latency. So "more sleep debt makes it easier to fall asleep despite stimulant on board" — i.e., **raising the effective threshold** — is directionally correct and principled. (Two-process reappraisal, Borbély 2016: https://pubmed.ncbi.nlm.nih.gov/26762182/)

**But the mg mapping is ungrounded.** There is no literature conversion from "sleep-debt hours" to "milligrams of tolerated amphetamine." The 0–6 mg bonus (3-day weighted) is a heuristic dial, not a measured quantity. That's acceptable *only* as a calibratable N=1 parameter. The 3-day weighting is a fair approximation — Process S recovers over 1–3 nights and recent debt dominates — but the specific weights are again free parameters, not constants from a paper.

**Evidence — all-nighter hyperarousal part (this is the interesting one, and it's real).** Total/severe sleep deprivation paradoxically produces **HPA-axis activation and elevated evening cortisol**, and this cortisol elevation is *coupled to* central hyperarousal (high-frequency waking EEG) and impairs subsequent sleep. So after a true all-nighter, the naive expectation ("massive sleep debt → falls asleep instantly") is partly cancelled by a stress-mediated wired-but-tired state. **Zeroing the sleep-debt bonus after <4 h sleep has a genuine physiological basis.** (HPA/arousal coupling: https://pubmed.ncbi.nlm.nih.gov/11399904/ ; Balbo 2010 review, sleep–HPA: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2902103/)

Two refinements: (1) it's not literally binary at 4 h — hyperarousal scales with the *degree* of deprivation and individual stress reactivity, so a steep taper is more faithful than a hard zero; (2) hyperarousal *reduces* the pressure benefit but rarely *reverses* it below baseline, so flooring the bonus at 0 (rather than going negative) is the right call.

**Verdict: PARTLY SOUND.** The structure (debt raises threshold; extreme deprivation cancels the benefit via cortisol) is scientifically legitimate and, frankly, more sophisticated than most models. The **mg magnitudes are free parameters that must be fit from the user's own data**, and the all-nighter cutoff should taper rather than hard-switch.

---

## Q7 — Exercise cooldown blocker + sauna/passive-heating threshold bonus — **SOUND (direction & rough magnitude)**

**Passive body heating (sauna / warm bath).** Haghayegh et al. 2019 (Sleep Medicine Reviews) meta-analysis (13 trials): passive body heating to **40–42.5 °C for as little as 10 min, 1–2 h before bed, shortened sleep-onset latency by ~36%.** Mechanism: peripheral vasodilation → accelerated core-temperature decline → faster sleep onset. So modeling sauna as something that **makes sleep easier (a threshold bonus)** is directionally correct, and the app's timing (peak effect ~2 h, decaying over ~4 h) is consistent with the 1–2-h-before-bed optimal window. (https://pubmed.ncbi.nlm.nih.gov/31102877/)

Minor nuance: the benefit is contingent on the subsequent core-temp *drop*; immediately post-heating, core temp is transiently *up*. So a bonus that peaks ~1.5–2 h later (not immediately) is the physiologically right shape — which is roughly what the app does.

**Exercise timing.** Systematic-review/meta-analytic evidence: for healthy adults, **evening exercise generally does not harm sleep**, and low-to-moderate-intensity evening exercise tends to **shorten** sleep-onset latency. The exception is **high-strain/vigorous exercise ending <~1 h before bed**, which can delay sleep onset and elevate nocturnal sympathetic activity; ending ≥90 min (ideally ~2–4 h) before bed neutralizes this. (Evening high-intensity exercise meta-analysis: https://www.sciencedirect.com/science/article/abs/pii/S1087079221001209 ; dose-response: https://www.nature.com/articles/s41467-025-58271-x)

So a **"workout cooldown" blocker** is supported specifically for *intense, close-to-bed* sessions — but it should be conditioned on intensity and proximity, not applied to every workout. A light evening workout should, if anything, slightly *help*.

**Verdict: SOUND.** Sauna-as-bonus and intense-workout-as-cooldown-blocker are both literature-consistent. Refinement: gate the workout blocker on intensity/recency (light exercise → small bonus or neutral, not a blocker); keep sauna's delayed-peak shape.

---

## Q8 — Nicotine as sleep-delaying — **SOUND**

**Evidence.** Nicotine is a CNS stimulant. Polysomnographic and epidemiological data consistently show nicotine/active smoking is associated with **longer sleep-onset latency, more fragmentation, reduced slow-wave sleep, lower efficiency, and REM suppression.** Evening use is worse. (Garcia & Salloum review of PSG disturbances in nicotine/caffeine/alcohol/cannabis/opioid users: https://www.med.upenn.edu/cbti/assets/user-content/documents/Garcia_et_al-2015-The_American_Journal_on_Addictions.pdf ; nicotine & sleep review: https://pubmed.ncbi.nlm.nih.gov/19345124/)

**Verdict: SOUND.** Logging nicotine and treating it as sleep-delaying is correct. Two enhancements worth noting: nicotine's own stimulant half-life is short (~1–2 h), so its *direct* sleep-onset effect is concentrated near use; **but** nicotine *induces CYP1A2 and thereby shortens caffeine's half-life*, so on nicotine days the caffeine channel should clear faster — a coupling the app could model for extra fidelity.

---

## Q9 — Synthesis: the minimal scientifically-defensible model for N=1 daily-calibrated sleep-time prediction

**Design principle.** This is a personal, single-subject, daily-logged prediction problem. That changes the scientific standard: population constants are only *priors*; the moment the user has ~2–4 weeks of logs, **his own fitted parameters beat any textbook value**, because the biggest sources of variance here (CYP1A2 caffeine clearance, personal amphetamine sensitivity, his circadian phase, his sleep-debt tolerance) are precisely the ones with 3–40× inter-individual spread. The right architecture is a **small mechanistic model with a handful of free parameters, fit to his data.**

### KEEP (mechanistically sound, keep the structure)
1. **Amphetamine two-pulse-at-4h PK** with ~11 h half-life. This is label-accurate — the crown jewel. Keep as-is. (Optionally split into d/l pools with 10 h/13 h for marginal accuracy; not required.)
2. **Caffeine as a separate exponential-decay channel with its own threshold.** Correct shape. Keep — but make the half-life a *fitted* per-user constant (default 5 h prior).
3. **A circadian term** (most apps lack one). Keep the concept of an evening low-propensity zone and a later sleep gate.
4. **Sleep-pressure raises tolerance; extreme deprivation cancels it via cortisol hyperarousal.** Keep this structure — it's more correct than the naive monotonic "more debt = easier."
5. **Sauna/passive-heating bonus with a delayed peak; nicotine as sleep-delaying; intense-late-workout penalty.** All directionally supported.

### FIX / RE-ANCHOR
6. **Circadian anchor:** switch from *wake + 13–15 h* to *habitual sleep-onset (or midsleep) − 2–3 h* for the forbidden zone, averaged over the trailing week. Anchoring to sleep onset tracks circadian phase; anchoring to wake only works if sleep length is constant.
7. **Forbidden zone → strong probabilistic penalty, not a hard blocker.** Sufficient sleep debt should be able to partially override it. Reserve an absolute block, if any, for a narrow core-WMZ window.
8. **Vitamin-C multiplier:** default ≈ 0.9 (≈10% half-life reduction) for an ordinary ~1 g dose; reserve 0.7 only for explicitly logged high-dose/repeated acid loading. Keep the expiring window but taper rather than cliff-expire. Better still: fit it from his data.
9. **All-nighter cutoff → taper, not hard zero.** Scale the cancellation of the debt bonus with degree of deprivation and floor at 0 (don't go negative).
10. **Workout blocker → conditional on intensity + recency.** Light evening exercise should be neutral-to-slightly-helpful, not a blocker.

### SIMPLIFY / DEMOTE TO CALIBRATED PARAMETERS (no literature constant exists)
11. **The 14 mg base threshold, the 0–6 mg sleep-debt bonus, and the ±mg sauna/workout bonuses** are all *free parameters*, not measured biology. Keep them in the model but label them internally as calibratable and fit them (see below). Consider expressing the threshold as a soft band, not a single line.

### DROP / DE-EMPHASIZE
12. Nothing needs to be *deleted* — every component has a real mechanism. The two things to stop presenting as certainty are (a) the exact mg thresholds and (b) the vitamin-C 30% figure. Present predictions with an uncertainty band, not a single deterministic minute.

### Literature-backed default constants (priors before calibration)
- Amphetamine half-life: **11 h** (or d 10 h / l 13 h). Release: **50% at t=0, 50% at t+4h.**
- Caffeine half-life: **5 h** prior (expect 3–9 h individually; fit it).
- Caffeine practical cutoff: **≥6 h before bed** for meaningful doses (Drake 2013).
- Passive-heating optimal window: **1–2 h before bed**, effect ~−36% SOL.
- Vitamin-C half-life multiplier: **~0.9 default** (ordinary dose), 0.7 only for aggressive acid loading.
- Circadian: forbidden/WMZ ≈ **habitual sleep onset − 2–3 h**; sleep gate begins around/after DLMO ≈ sleep onset − ~2 h and deepens thereafter.

### A simple, defensible N=1 calibration scheme
The app already logs the inputs and (presumably) actual sleep-onset times. That's a supervised dataset. A lightweight scheme:
1. **Each night, record:** the model's computed amphetamine load, caffeine load, circadian phase, sleep-debt state, and the **actual time he fell asleep** (plus whether the attempt "failed" — lay awake).
2. **Fit the few free parameters** — base threshold X, caffeine half-life, sleep-debt→threshold gain, vitamin-C multiplier — by minimizing prediction error between "predicted earliest sleep time" and "actual sleep onset" over the trailing 2–4 weeks. This can be as simple as a per-parameter grid search / gradient step; no ML framework required.
3. **Use a decaying window** (e.g., last 30 nights, recent nights weighted more) so the fit tracks seasonal/behavioral drift.
4. **Anchor circadian phase from the data itself:** trailing 7-day average sleep-onset time is a free, continuous DLMO proxy — better than any survey.
5. **Report an interval, not a point:** the residual spread of his own predictions is his honest uncertainty band ("earliest realistic: 1:10 AM; likely: 1:40 AM").
6. **Keep population priors as the cold-start default** and blend toward fitted values as data accumulates (shrinkage: trust the prior when n is small, trust his data as n grows).

Where N=1 calibration is *most* valuable vs. population constants: **caffeine half-life** (up to 40× spread), **personal amphetamine sensitivity / base threshold** (no population value exists), and **circadian phase** (his, not a textbook's). Where population constants are fine to keep fixed: **amphetamine PK half-life and the 4 h second pulse** (formulation-determined, low inter-individual spread relative to the above).

**Bottom line:** the model's bones are good and, in the case of the Adderall XR release term, genuinely label-accurate. Rebuild trust by (1) re-anchoring the circadian term to sleep onset and softening the hard blocker, (2) dialing the vitamin-C effect down to reality, and (3) explicitly treating the mg thresholds as self-calibrated parameters with an uncertainty band rather than fixed biological constants. Do those three things and this is a defensible personal sleep-timing model.

---

## Sources
- FDA / DailyMed Adderall XR label (bimodal beads, Tmax, half-lives, pH agents): https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=f6c30ba1-53d0-4f85-a515-81acfb922e73&type=display
- StatPearls, Dextroamphetamine-Amphetamine (half-lives, pKa 9.9, urinary excretion): https://www.ncbi.nlm.nih.gov/books/NBK507808/
- Beckett & Rowland, urinary excretion kinetics of amphetamine (pH dependence), J Pharm Pharmacol 1965: https://onlinelibrary.wiley.com/doi/abs/10.1111/j.2042-7158.1965.tb07575.x
- PBPK modeling of urine-pH effect on amphetamine/methamphetamine, JPET 2020: https://jpet.aspetjournals.org/content/373/3/488
- Urine acidification overview (vitamin C dose vs pH; grams needed): https://www.sciencedirect.com/topics/medicine-and-dentistry/urine-acidification
- Tulane PharmWiki, pH effect on drug elimination: https://tmedweb.tulane.edu/pharmwiki/doku.php/ph_effect_on_drug_elimination
- Kidwell et al. 2015, Stimulant Medications and Sleep for Youth With ADHD (meta-analysis), Pediatrics: https://pubmed.ncbi.nlm.nih.gov/26598454/
- Pharmacology and Sleep Disorders (amphetamine dose-dependent SOL/REM effects): https://sleepreviewmag.com/sleep-disorders/hypersomnias/narcolepsy/pharmacology-and-sleep-disorders/
- Caffeine, StatPearls (half-life ~5 h, CYP1A2, variability, smoking induction): https://www.ncbi.nlm.nih.gov/books/NBK519490/
- Drake et al. 2013, Caffeine at 0/3/6 h before bed, J Clin Sleep Med: https://pubmed.ncbi.nlm.nih.gov/24235903/
- Wake maintenance zone / forbidden zone (Lavie/Strogatz), Frontiers in Sleep 2023: https://www.frontiersin.org/journals/sleep/articles/10.3389/frsle.2023.1304647/full
- WMZ neurobehavioral performance, JCSM: https://pubmed.ncbi.nlm.nih.gov/23585751/
- Two-process model reappraisal (Borbély et al. 2016): https://pubmed.ncbi.nlm.nih.gov/26762182/
- HPA-axis / central-arousal coupling under sleep deprivation: https://pubmed.ncbi.nlm.nih.gov/11399904/
- Balbo et al. 2010, sleep & HPA axis (evening cortisol, hyperarousal): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2902103/
- Haghayegh et al. 2019, passive body heating before bed (SOL −36%, 1–2 h window), Sleep Med Rev: https://pubmed.ncbi.nlm.nih.gov/31102877/
- Evening high-intensity exercise & sleep, systematic review/meta-analysis: https://www.sciencedirect.com/science/article/abs/pii/S1087079221001209
- Dose-response of evening exercise & sleep, Nat Commun 2025: https://www.nature.com/articles/s41467-025-58271-x
- Garcia & Salloum 2015, PSG disturbances (nicotine/caffeine/alcohol): https://www.med.upenn.edu/cbti/assets/user-content/documents/Garcia_et_al-2015-The_American_Journal_on_Addictions.pdf
- Nicotine effects on sleep (review): https://pubmed.ncbi.nlm.nih.gov/19345124/
