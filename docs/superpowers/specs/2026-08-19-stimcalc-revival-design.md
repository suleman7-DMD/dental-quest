# Stim Calc Revival — Audit Synthesis & Back-to-Basics Design
**Date:** 2026-08-19 · **Status:** AWAITING APPROVAL — no code changed yet
**Audit evidence:** `docs/superpowers/audits/2026-08-19-stimcalc/` (7 reports + 10 screenshots: audit-features, audit-engine, audit-history, audit-sync, audit-crossapp, audit-science, audit-smoketest)

## 1. What the audit found (consolidated)

### The app is NOT fundamentally broken
- All 74 HTML handlers resolve to real functions; zero broken wiring; no duplicate IDs.
- Live smoke test: loads offline past PIN, 6 of 7 pages render fully, prediction responds to inputs, 5s recalc loop stable.
- No data-wipe risk: the 5 guards are identical in both save functions, defaults are wipe-safe, and the engine hard-filters doses older than 1–3 days, so 4.5-month-old data cannot poison predictions.
- The Adderall XR model (50% IR + 50% DR at T+4h, ~11h half-life) is **FDA-label-accurate** — the strongest part of the app.

### Why trust died (root causes, each evidence-backed)
1. **The calibration loop never closes** [HIGH]. The app computes accuracy, bias, and the exact suggested threshold adjustment (`getCalibrationRecommendation`) — then only shows a toast telling the user to go move a slider. Nothing ever writes the suggestion back. The model never learns. Bonus: TWO conflicting recommendation formulas exist.
2. **Circadian layer mis-anchored and over-aggressive.** Forbidden Zone is anchored to wake+13–15h; literature anchors it ~2–3h before *habitual sleep onset*. WMZ is a hard blocker that shoves any prediction landing in it past the END of the FZ — up to a ~3.5h penalty. Plus an anchor-mismatch bug: zone built from 7-day avg wake, day-wrap normalization uses *today's typed* wake (sleep-prediction.js:73/214/242 vs circadian.js:170-176).
3. **Modifiers lie.** Sauna bonus is evaluated at "now" but the clearance search treats it as constant → predictions up to ~2h optimistic (pharma-engine.js:274-327→500). VitC/Sauna chips produce ZERO visible change in live test while Heavy Lift swings −5h. Workout what-if preview uses different math (flat −15min) than the applied model (+1mg threshold). VitC ×0.7 half-life is ~3× stronger than ordinary-dose vitamin C supports (science: ~0.9 realistic; 0.7 only under forced acidification).
4. **Sync silently misbehaved.** `firebase-sync.js` script tag has a stale `?v=20260315` cache-bust — returning browsers ran old sync code for months (html:4807). `loadFromFirebase` merges remote-wins with no timestamp compare + `beforeunload` saves localStorage only → the last edit before tab close silently reverts on next load.
5. **First-launch ambush.** `cleanupOldMedications` runs BEFORE Firebase load, so stale April doses render with a false "STACKED" warning on the first post-idle open (self-heals next launch). Reproduced live. This is very likely the remembered "the app is broken."
6. **Calendar page crashes** on every open: `drawSleepPerformanceGraph()` called with no argument → TypeError at graph.js:565, blank graph AND aborts `renderSleepCalendar()`.
7. **Complexity swamped the purpose.** ~40 features across 7 pages; only ~8 are CORE.
8. **The caffeine cutoff was never real** [Fable verification]. The "cutoff" (init.js:528-539) is a hardcoded *noon* heuristic that renders only when zero caffeine is logged, with an invented "each coffee after 12pm adds ~3 hours" claim. The model never solves for a personalized cutoff — despite this being one of the user's three explicitly-wanted outputs. It must be built, not surfaced.

### Fable verification pass (personal re-check of agent work — new findings)
The Opus agents' findings all verified against source; nothing they reported was wrong. Reading the engine and wiring myself surfaced six additions:
- **F1 [root cause of ledger #5] — Binding-constraint masking.** The smoke test's inert VitC/Sauna chips are not broken wiring: the tested prediction was pinned at 11:00 PM by a NON-amphetamine constraint (circadian clamp or caffeine). VitC and sauna act only on the amphetamine term of the MAX(), so when amp isn't binding they mathematically cannot move the output — and the UI never names the binding factor, so the chips look dead. Heavy Lift's larger bonus tipped amp load below threshold entirely → "already clear" → the observed 5h07m jump to 5:53 PM.
- **F2 — Threshold-cliff discontinuity.** That 5-hour jump from a 2mg threshold change is a trust-killer of the same class as the WMZ hard-block: tiny input changes must not teleport the prediction. v2 requires continuous transitions + always showing the pharma floor alongside any gate.
- **F3 — Modifiers are silently conditional on their default times.** Sauna's bonus is gated by `now >= saunaTime` (default 18:00) — toggling the chip before 6 PM does literally nothing, with zero feedback (pharma-engine.js:289-291). VitC default 17:00 behaves the same ("scheduled" = inert). Chips imply "active now"; the engine disagrees silently.
- **F4 [LOW] — `toggleModifier()` with an unmapped name creates a junk `state.modifiers['undefined']` key** (ui-sections.js:367-371).
- **F5 — Cache-bust claim sharpened via file mtimes.** Only `firebase-sync.js` is genuinely stale (modified 2026-03-21, tag still `?v=20260315`); the other 11 tags currently match or postdate their files. Fix stands (bump all + adopt a bump-on-edit rule), but the months-of-stale-sync-code impact traces to that one file.
- **F6 [HIGH] — Fake caffeine cutoff** (detailed as root cause #8 above).
Also personally re-verified as SOUND (no fix needed): the 3-segment VitC decay math, the DR-aware iterative clearance search, ghost-load day-window logic, and `calculateYesterdayDoseRemaining`'s consistency with the main engine.

### Full confirmed-bug ledger (for the fix wave)
| # | Sev | Bug | Where |
|---|-----|-----|-------|
| 1 | HIGH | Calibration display-only, never applies; 2 conflicting formulas | history-calendar.js:1963/2012/1094-1095 |
| 2 | HIGH | Stale `?v=20260315` on firebase-sync.js script tag | html:4807 |
| 3 | HIGH | Remote-wins load + localStorage-only beforeunload → last-edit loss | firebase-sync.js:391-404,144-152,1225-1227 |
| 4 | HIGH | Calendar TypeError: drawSleepPerformanceGraph() no arg | init.js:1192, graph.js:565/714 |
| 5 | HIGH | VitC + Sauna chips have zero effect on prediction — ROOT CAUSE FOUND: binding-constraint masking (F1) + silent time-gating (F3); fix = binding-factor display + per-chip effect readout | ui-sections/init/pharma-engine |
| 6 | MED | Sauna bonus frozen at "now" in clearance search → up to ~2h optimistic | pharma-engine.js:274-327→500 |
| 7 | MED | Circadian anchor mismatch (avg wake vs today's wake) + live input pollutes 7-day avg | sleep-prediction.js:73/214/242, circadian.js:170-176 |
| 8 | MED | findCaffClearTime: no future-dose/re-spike protection | pharma-engine.js:564-589 |
| 9 | MED | findAmpClearTime: future IR spikes (dose later today) not in re-spike set | pharma-engine.js:512-523 |
| 10 | MED | Workout what-if preview math ≠ applied model | ui-sections.js:833 |
| 11 | MED | cleanupOldMedications before Firebase load → stale-dose render + false STACKED | init.js:818-821, med-caffeine.js:88/136 |
| 12 | MED | Realtime listener clobbers focused inputs (multi-device) | firebase-sync.js:532-534 |
| 13 | MED | forceCloudSync conflict check dead on first use (lastSyncTimestamp never seeded) | firebase-sync.js |
| 14 | MED | saveToFirebase has 3/5 guards; direct callers bypass pinValidated/_dataLoaded | firebase-sync.js:353,751,978,1288,1343 |
| 15 | MED | sleepHistory dual shape (number OR object) — normalize | history-calendar.js:110 |
| 16 | MED | **Inventory card writes stale whole-node snapshots into index.html's appData** (pill-count regression, calendarNotes clobber, double auto-reduce) | med-inventory.js:31/51/64 + set() paths |
| 17 | LOW | VitC status legacy 'today'/'tomorrow' strings → NaN → 'effective' badge | pharma-engine.js:87-105 |
| 18 | LOW | No NaN guards on settings.sleepThreshold/ampHalfLife/caffThreshold | pharma-engine.js:248/393/565 |
| 19 | LOW | Main drawGraph not DPR-scaled (blurry on Retina) | graph.js:13 |
| 20 | LOW | cleanupHistory uses toISOString().split('T')[0] (UTC trap) | history-calendar.js:332 |
| 21 | LOW | Unescaped innerHTML: caff.name; accuracy input-verification m.time/c.time | med-caffeine.js:261, history-calendar.js:1198 |
| 22 | LOW | Mobile 390px: hero text + med date input clip right edge | html/CSS |
| 23 | LOW | restoreCheckpoint/force paths set _version=Date.now() (inert but rule-violating) | firebase-sync.js:746/966/1014 |
| 24 | INFO | Dead weight: hidden compat layer written every 5s; switchSITab + siTab panels dead; orphan CSS | html:4763-4800, history-calendar.js:2031, init.js |
| 25 | HIGH | Caffeine cutoff is a fake noon heuristic (renders only at zero caffeine; bogus "+3h/coffee" copy); real personalized cutoff never computed (F6) | init.js:528-539 |
| 26 | MED | Modifier chips silently inert before their default times (sauna `now >= saunaTime` gate; VitC "scheduled") with no UI feedback (F3) | pharma-engine.js:289-291, state.js:47-49 |
| 27 | MED | Threshold-cliff discontinuity: small threshold change flips MAX-branch → multi-hour prediction jump (F2) | sleep-prediction.js (phase structure), pharma-engine.js:500-561 |
| 28 | LOW | toggleModifier(unmapped name) creates junk `state.modifiers['undefined']` key (F4) | ui-sections.js:367-371 |

### Science verdicts (audit-science.md, cited)
- **SOUND:** XR two-pulse @+4h & ~11h blend · caffeine model + ≥6h cutoff (Drake 2013) · sauna-as-threshold-bonus (Haghayegh 2019) · nicotine-as-delaying.
- **PARTLY SOUND (fix):** VitC ×0.7 → default ×0.9 · FZ/WMZ anchor → habitual sleep onset, soft penalty not hard bar · fixed 14mg threshold → openly calibrated N=1 parameter · sleep-debt mg mapping → calibrated free parameter; all-nighter hyperarousal real but should taper, not binary at 4h.
- **Key synthesis:** this is an N=1 supervised-fit problem. Amp PK stays fixed (formulation-determined); the personal parameters (base threshold, caffeine half-life, debt gain) should be fit from his own logged nights; report an interval, not a single minute.

## 2. Design decisions (taken autonomously, per mandate)

**D1 — Fix-in-place, no rewrite.** The wiring is intact, the PK core is label-accurate, the guards work. A rewrite would discard the app's best assets and its logged history.

**D2 — Calibration becomes automatic, transparent, and clamped.** One unified formula. Auto-fit `sleepThreshold` over a trailing 21-night exponentially-decaying window (min 5 nights with feedback), clamped to [8, 22] mg, max ±1 mg change per day. A visible Calibration card always shows: current fitted value, nights used, last adjustment and why, and a "reset to default / freeze" control. (Manual slider still works and pauses auto-fit for 7 days.) Caffeine half-life becomes a second calibratable parameter (clamped [3, 8]h) once ≥10 caffeine-present nights exist; until then, fixed 5.5h.

**D3 — Circadian v2.** Anchor = 7-day average of *actual sleep onset* from his own log (fallback: avg wake + 16h when <3 logged nights). FZ = anchor −3h → anchor −1h. WMZ hard-block removed. FZ becomes a soft penalty: if pharma clearance lands inside FZ, show primary prediction at FZ end but ALSO show the pharma floor ("drugs clear 11:15 PM; circadian gate opens ~12:40 AM") — never silently add hours. Today's typed wake time no longer pollutes the historical average.

**D4 — Honest output = window + named binding factor.** Hero shows `T ± avgAbsError(last 14 nights)` (fallback ±45 min) AND names what's binding: "Limited by: caffeine — clears ~10:40 PM" / "Limited by: Adderall" / "Drugs clear 9:50 PM; circadian gate ~11:30 PM". This single line dissolves the F1 masking problem (chips that can't move the output now say why) and the F2 cliff problem (branch flips become visible, explained transitions instead of silent 5-hour teleports). Trust comes from honesty about uncertainty and about causality.

**D5 — Modifiers: three survive, each provably honest.** Survivors: **sleep debt** (automatic, calibratable gain), **VitC chip** (default ×0.9; settings option "high-dose acidification protocol" enables ×0.7), **workout chip** (single "trained hard" toggle + end time; decaying threshold bonus; blocker only when intense and <1h before candidate sleep). Threshold evaluated AT the candidate clearance time inside the search (decay respected — fixes the frozen-threshold bug class). What-if previews call the same engine functions as the applied model. Every surviving chip renders a live effect readout: "tonight: −22 min" or "tonight: ±0 — Adderall isn't your limiting factor" or "expired (logged 9h ago)". A chip that can't explain itself doesn't ship.

**D6 — The daily loop is the product.** One habit: open app → **Morning check-in strip** (one-tap confirm auto-filled actual sleep/wake → feeds calibration) → log doses as taken → glance at hero window + **a REAL computed caffeine cutoff on the Dashboard**: solve for the latest dose time such that caffeine load at target bedtime < caffThreshold, per dose size — "Last call: 2:40 PM for a full coffee, 4:10 PM for half." (Correction from verification pass: the current 'cutoff' is a fake noon heuristic — bug #25 — so this is new engine work, not a re-surface.)

**D7 — Cut list (back-to-basics).**
- **REMOVE: Inventory page + its write path** (bug #16 — it can corrupt the main app's pill data; the identical feature already lives in index.html). Replace with nothing; the main app owns pills. (Optional future: tiny read-only pill count on dashboard.)
- **REMOVE: Achievements/gamification, Personal Records, Research Benchmarks, Modifier Impact, Dosing Windows, Prediction Reliability-by-context** (Insights 14 → 9… minus 1 redundant = 9 kept per audit-history KEEP list).
- **REMOVE: Week-at-a-Glance + Upcoming Deadlines cards** (they work, but they're the roadmap's job; module file kept on disk for easy revert).
- **REMOVE: Sauna modifier** (user explicitly suspected it; "moves the needle" test fails: its +1–2mg is inside the noise the nightly auto-calibration will absorb, it carried two live bugs — frozen threshold #6, silent time-gating #26 — and its honest fixed version still can't beat calibration. ~30-line re-add if ever missed).
- **REMOVE: Nicotine logging + RLS advisory** (same test: rarely used, acts through the same threshold noise, one more input to maintain).
- **SIMPLIFY: Workout planner → the single workout chip of D5**; blocker applies only when intense and <1h before candidate sleep (per science); cortisol/fasted/cold-shower subtleties dropped. Kills bug #10 by construction (one code path).
- **KEEP: Accuracy page, all 7 sections** (trust-builders), with Directional Bias wired to the new auto-calibration. **KEEP:** all-nighter/ghost-load mode (tapered hyperarousal), sleep-debt bonus (calibratable), body-comp read integration (untouched).
- **DELETE dead weight:** hidden compat layer + its 5s writers, switchSITab + siTab panels, orphan CSS classes.
- **Navigation: 7 pages → 5** (Dashboard · Calendar/Log · Insights(9) · Accuracy · Settings). Modifiers page folds into Dashboard (chips already there) + Settings.

## 3. Execution plan (phased, agents by file per audit methodology)

**Phase 0 — Safety net:** git branch `stimcalc-revival`; `createCheckpoint('pre-revival')` documented as first manual step on next real use.
**Phase 1 — Correctness wave (bugs #2,4,7,8,9,11,12,13,14,15,17–23,28):** 4 fix agents split by file (pharma-engine+sleep-prediction+circadian / firebase-sync / history-calendar+graph / init+ui-sections+med-caffeine+html). Bug #16: amputate inventory write path (page removal lands in Phase 3, but the `.set()` calls are disabled here). Bugs #5/#6/#10/#26 are resolved structurally by Phase 2–3 (binding-factor display, threshold-at-candidate-time, single workout code path, sauna removal) rather than patched.
**Phase 2 — Model v2 (D2, D3, D4, D5, D6-engine):** unified auto-calibration + Calibration card; circadian re-anchor + soft FZ; hero window ± band + named binding factor (#27); threshold evaluated at candidate time; per-chip live effect readouts; REAL computed caffeine cutoff (#25); morning check-in strip.
**Phase 3 — Back-to-basics UI (D6-surface, D7):** cut list incl. sauna + nicotine removal, nav collapse 7→5, dead-weight deletion, mobile clipping fix, cache-bust bump on ALL script tags.
**Phase 4 — QA gate:** brace-balance checks; 5-guard verification in both save fns; Playwright end-to-end re-run of the smoke test (calendar opens clean, every surviving chip moves the prediction or explains why, hero names the binding factor, caffeine cutoff reacts to logged doses, morning check-in feeds calibration, mobile 390px clean); cross-app regression: main-app medications untouched, body-comp read path still served; only then commit + push to main.

**Rollback:** every phase is a separate commit; the app has checkpoint restore; branch merge only after QA gate passes.

## 4. Success criteria
1. Zero console errors across all pages (except favicon).
2. Every surviving modifier chip changes the prediction or displays an explicit "why not" (live effect readout).
3. Prediction shown as a window; hero names the binding factor; calibration card shows fitted parameters + provenance.
4. A real computed caffeine cutoff visible on Dashboard at all times, reactive to logged doses and target bedtime.
5. Morning check-in → one tap → accuracy stats + auto-calibration update.
6. Main app (index.html) medication data provably untouched by stim calc.
7. ≤5 pages; Dashboard alone answers all 3 daily questions.
