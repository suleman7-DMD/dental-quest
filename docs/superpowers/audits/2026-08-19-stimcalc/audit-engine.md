# Stim Calc PK Engine Audit — Math & Logic

**Scope:** `pharma-engine.js`, `sleep-prediction.js`, `circadian.js`, `state.js`
**Date:** 2026-08-19  **Mode:** READ-ONLY (no source files modified)
**Verdict up front:** The core amphetamine-clearance search is more robust than it looks (the DR re-spike loop actually rescues the broken binary-search invariant for the *realistic* case where all doses are already taken). The trust problem lives elsewhere: (1) the sauna bonus is frozen at "now" while the search treats the threshold as constant, making predictions optimistic by up to ~2h when sauna is active; (2) the circadian normalization anchor mixes two different wake-time bases; (3) `findCaffClearTime` has zero protection against non-monotonic load and silently ignores caffeine planned later today; (4) the workout what-if preview and the applied model compute the workout effect two incompatible ways. None of these is a crash, but together they explain "the numbers feel wrong."

---

## CONFIRMED BUGS (ranked)

### [MEDIUM] Sauna threshold bonus is frozen at `now`, but the clearance search treats the threshold as time-invariant → optimistic predictions
`pharma-engine.js:274-327` (sauna decay) feeding `getEffectiveThreshold()`, consumed by `findAmpClearTime()` `:500`.

`getEffectiveThreshold()` computes a **single scalar** threshold. The sauna component decays over 6h (`hoursSinceSauna`, peak 2h, linear decay 4h, `:317-326`) evaluated at `getCurrentMinutes()`. `findAmpClearTime()` then searches for the time at which `calculateAmpLoad(t)` drops below **that fixed number**. But by the actual clear time (hours later) the sauna bonus has decayed toward 0, so the *real* threshold there is lower and the amp curve crosses it later.

Impact: with an evening sauna, `baseBonus = 2.0` (`:325`). At amp half-life 11h (660 min), a +2 mg threshold inflation clears the drug ~`660·log2(16/14) ≈ 127 min` early. So the app can promise sleep up to ~2h sooner than the model's own logic would allow once the sauna bonus is gone. This is a genuine internal inconsistency (the threshold is time-varying in one function but constant in the consumer), not just a modeling simplification.

Note the sleep-debt bonus (`:168`) and workout `adenosineBonus` (`:262`) are *also* constant across the evening, but those are at least self-consistent (they don't decay in `getEffectiveThreshold`). Sauna is the only one that decays-then-gets-frozen. (Secondary concern: workout adenosine never decays by time-of-day at all — a 6 AM lift still grants full threshold credit at 11 PM. LOW modeling gap.)

### [MEDIUM] Circadian normalization uses `state.wakeTime` while the Forbidden Zone is anchored to the 7-day circular-mean wake time
`sleep-prediction.js:73, 214, 242-243, 262-263` vs `circadian.js:170-176`.

`getForbiddenZone()` builds `start/end` from `phase.avgWakeTime` (circular mean of up to 7 days, `circadian.js:61-64`). But every "is this sleep time inside the zone?" normalization in `calculateSleepTime()` adds 1440 based on `timeToMinutes(state.wakeTime)` — today's typed input, not the average:

```js
if (sleepTime < timeToMinutes(state.wakeTime)) sleepTimeNormalized = sleepTime + 24*60;  // :73
```

When today's `wakeTime` differs from the 7-day average (common: a what-if edit, an off day, sparse history), the normalization boundary and the FZ boundary sit at different anchors. There is a window `[state.wakeTime, avgWakeTime]` where a candidate sleep time gets wrapped to the wrong day relative to the zone it is being tested against, so the FZ containment check (`>= wmStart && < FZ.end`) can fire or fail to fire incorrectly. The fix would be to normalize against the same `avgWakeTime` the zone was built from. Latent but real; produces "why is it blocking / not blocking at this hour" surprises.

Related coupling: `analyzeCircadianPhase()` always injects **today** using the live `state.wakeTime` input (`circadian.js:12-16`) into the average. So editing the wake-time input for a forecast perturbs the "habitual" circadian baseline itself, shifting the FZ. Input and baseline should be decoupled.

### [MEDIUM] `findCaffClearTime()` assumes monotonic decay and has no re-spike guard — ignores caffeine scheduled later today
`pharma-engine.js:564-589`.

`calculateCaffLoad()` only counts a dose once `atMinutes >= effectiveDoseTime` (`:487`), so a caffeine entry with a **future time today** (daysDiff 0, time not yet reached) creates an upward **step** in the load curve. `findCaffClearTime()` is a plain binary search (`:579-587`) plus an early `if (calculateCaffLoad(now) < threshold) return now;` (`:575`). If a coffee is planned for 3 PM and it's 10 AM, `load(now)=0<25` returns `now` immediately, and even without the early return the binary search collapses toward `now` and steps right over the afternoon spike. Unlike `findAmpClearTime`, there is no DR/spike re-verification at all. Caffeine forecasting is a plausible use of the what-if feature, so this silently under-predicts caffeine clearance whenever future caffeine exists.

### [MEDIUM] `findAmpClearTime()` re-spike verification covers DR releases but not the IR spike of a dose scheduled later today
`pharma-engine.js:512-523`.

`drReleaseTimes` collects only `effectiveDoseTime + 240` (the DR step). A dose whose **IR** time is still in the future today (daysDiff 0, time > now) produces an IR step at `effectiveDoseTime` that is never added to the verification set. If `load(now) < threshold`, the "already clear + all DR clear" check (`:527-533`) can return `now`, or the broken-invariant binary search can settle before the future IR spike. The DR re-spike loop happens to rescue the common *retrospective* case (all doses already taken — see "What actually works" below), but not a dose planned for later today. Same edge class as the caffeine bug; uncommon but real.

### [LOW] `getVitaminCStatus()` does not sanitize legacy `'today'`/`'tomorrow'` date strings
`pharma-engine.js:87-105` vs the guards in `getVitaminCTimeMinutes()` (`:20-25`) and `getRawVitaminCTimeMinutes()` (`:59-65`).

`getVitaminCStatus()` does `const vitCDate = state.modifiers.vitaminC.date || today;` with no `'today'`/`'tomorrow'` normalization. If legacy state holds `date: 'tomorrow'`, `parseLocalDate('tomorrow')` → `new Date(NaN,…)` → `daysDiff = NaN` → `hoursSinceVitC = NaN`; both comparisons are false and the function falls through to `return 'effective'`. The engine math itself is safe (it uses the two guarded getters), so this only mislabels the UI badge, but it's an inconsistency with the two functions right above it.

### [LOW] No NaN guards on `settings.sleepThreshold` / `ampHalfLife` / `caffThreshold` → "sleep now"
`pharma-engine.js:248, 393, 565`.

If any of these settings is missing/corrupt, `baseThreshold`/`baseHalfLife`/`caffThreshold` become `undefined` → threshold or load becomes `NaN`. Every `load > NaN` comparison is false, so the binary search collapses to `now` and the final `load >= NaN` guard is false, so `findAmpClearTime`/`findCaffClearTime` return ~`now` and the app says "you can sleep now." Defaults provide all three and merges backfill, so risk is low, but there is no defensive clamp. (Same failure mode reachable via `getEffectiveThreshold` returning `NaN`.)

### [LOW] Workout what-if preview and the applied model compute the workout effect two incompatible ways
`ui-sections.js:833` vs `pharma-engine.js:259-264`.

Preview (`calculateWorkoutImpact`): `predictedSleep = baseSleepTime - adenosineBonus + cortisolDelay` — treats `adenosineBonus` as a **flat 15-min-earlier** time shift off drug clearance.
Applied (`getEffectiveThreshold`): `thresholdBonus = min(3.0, adenosineBonus/15)` → **+1.0 mg threshold** (15/15), which through the decay curve is ~`660·log2(15/14) ≈ 65 min` earlier near threshold and **load-dependent** (less when load is far above threshold). So the previewed "-15 min" and the realized shift disagree, and the realized shift changes with how much drug is on board. This is a strong candidate for the felt "it told me one thing then did another." (Also: `/15` cap of 3.0 is unreachable since max `adenosineBonus` is 15 → real max bonus is 1.0 mg; the cap is dead.)

---

## What actually works (verified, so we don't "fix" it)

- **DR re-spike handling in `findAmpClearTime` is correct for the realistic case.** Traced single-dose XR (IR at T, DR at T+4h): binary search returns a premature clearTime in the pre-DR dip, then the `drReleaseTimes` loop (`:548-557`) detects `load(drTime) >= threshold`, restarts `searchStart = drTime`, and converges after the last spike. Because DR release is a step, `load(drTime)` is exactly the local max, so checking *at* the spike catches the peak. The broken binary-search invariant (searching when `load(now) < threshold`) is masked by this loop. Correct for all-doses-already-taken. (10-iteration cap is ample for 1-3 meds.)
- **3-segment VitC decay (`calculateDecayWithVitC`, `:343-385`) is correct.** All three cases check out: dose-before-VitC (baseHL → reducedHL → baseHL), dose-during-window (skip segment A, reducedHL → baseHL), dose-after-expiry / no-VitC (pure baseHL). Cursor advancement and `min(…, atMinutes)` clamping are right. TTL boundary `vitCExpireTime = vitCTime + 8h` applied per-evaluation-point.
- **Ghost-load windows match the documented model:** amp includes daysDiff ≤ 1 normal / ≤ 3 all-nighter (`:418-421`); caffeine ≤ 1 / ≤ 2 (`:477-480`). Future doses (daysDiff < 0) skipped.
- **Date handling is clean.** No `new Date('YYYY-MM-DD')` and no `.toISOString().slice(0,10)` used for logic anywhere in these four files; all date math goes through `parseLocalDate` / `getLocalDateString`. The two `toISOString` uses (`state.js:228,234`) are an export timestamp and a filename — harmless.
- **`computeSleepDelta` (`state.js:329-336`) is midnight-safe** (wraps to [-720, 720]).
- **`minutesToTime` normalization** `((mins%1440)+1440)%1440` (`:306`) correctly handles negative and >1440 minute values.
- **Sleep-debt 3-day weighting matches the doc:** today ×1.0, yesterday ×0.7, day-before ×0.4, capped at +6 (`:139,160,168`); hyperarousal gate at `<4h` zeroes the bonus and sets the global (`:130-134`). Sauna cross-midnight decay (`:310-315`) returns 0 in the stale range rather than a wrong value.
- **Phases 6 & 7 floor enforcement** (`sleep-prediction.js:241-268`) correctly prevent circadian pushes from landing before drug clearance, and the amp/caffeine re-verification falls back to `pharmacokineticFloor`, which is provably below threshold because `findAmpClearTime` guarantees no post-clearance spike.
- **Phase 5 re-clamp** correctly catches cortisol/thermal pushing sleep *into* the WMZ/FZ from before it.
- **Units are not mixed:** amphetamine load is compared only to `getEffectiveThreshold()` (mg), caffeine only to `settings.caffThreshold` (mg); Phase 1 combines them by comparing **clear *times***, not loads. No mg-space cross-contamination.

---

## INFO / minor (no action required)

- `calculateSleepDebtBonus`: `daysWithData` is incremented but never read (`:120,161`); empty `if (totalDeficit>0){}` block (`:171-172`) is dead.
- `getSleepDebtBreakdown` (`:180-235`) hardcodes the fallback `hoursSlept = 8` (`:206`) instead of `sleepTarget`, has no NaN guard, and ignores hyperarousal — so the *displayed* breakdown can diverge from the value `calculateSleepDebtBonus` actually uses when `sleepTarget ≠ 8`.
- `analyzeCircadianPhase` "Insufficient Data" branch (`:45-58`) is effectively unreachable — today is always pushed with a wake time (`:12-16`), so `wakeTimesWithData.length >= 1` always. Circular mean degenerates to `avgWakeMinutes = 0` (midnight) only in the pathological antipodal case (`atan2(0,0)`).
- `minutesToTimeWithDay` (`state.js:315-319`) labels anything `>=1440` "(tomorrow)", so a 48h all-nighter clearance 2 days out is mislabeled "tomorrow."
- `isInSleepGate` uses `<= end` (`:205`) while `isInForbiddenZone` uses `< end` (`:196`) — cosmetic boundary inconsistency; not used inside `calculateSleepTime`.
- `isHyperarousalMode()` reads a global set only as a side effect of `calculateSleepDebtBonus()`; any caller that reads it before a threshold calc this cycle gets a stale value (`init.js:99,477` call `getEffectiveThreshold`/`calculateSleepDebtBonus` first, so current callers are fine).
- `getEffectiveThreshold()` is recomputed many times per render (each call re-runs `analyzeCircadianPhase`'s 7-day loop via the FZ path elsewhere, and re-fetches `now`); pure perf, no correctness issue.
- `isEmptyState` (`state.js:90-107`) doesn't count a workout/sauna/nicotine/settings-only state as "real data," so a config with no meds/caffeine wouldn't persist until `_dataLoaded` flips true. Edge, low risk.

---

## HARDCODED MODEL CONSTANTS (for cross-check against pharmacology literature)

| Constant | Value | File:line | Controls |
|---|---|---|---|
| `VITAMIN_C_EFFECT_HOURS` | 8 | pharma-engine.js:13 | VitC urinary-acidification TTL window |
| VitC half-life multiplier | ×0.7 (30% reduction) | pharma-engine.js:397 | Reduced amp HL during VitC window |
| Sleep-debt bonus per hour deficit | ×1.0 mg/h | pharma-engine.js:168 | Deficit→threshold conversion |
| Sleep-debt bonus cap | 6 mg | pharma-engine.js:168 | Max Process-S threshold bonus |
| 3-day debt weights | today 1.0 / yest 0.7 / prior 0.4 | pharma-engine.js:139 (0.7,0.4) | Rolling debt decay weights |
| Hyperarousal trigger | `hoursSleptLastNight < 4` | pharma-engine.js:130 | Zeroes debt bonus (cortisol/adrenaline) |
| Workout adenosine→threshold | `min(3.0, adenosineBonus/15)` | pharma-engine.js:262 | Lift/cardio threshold bonus (real max 1.0 mg) |
| Legacy heavy-lift bonus | +2.0 mg | pharma-engine.js:267 | Deprecated modifier path |
| Sauna base bonus | 2.0 (≥17:00) / 1.0 (<17:00) | pharma-engine.js:325 | Parasympathetic threshold bonus |
| Sauna peak duration | 2 h | pharma-engine.js:317,321 | Flat-bonus window post-sauna |
| Sauna decay duration | 4 h | pharma-engine.js:318,322 | Linear decay to 0 (6h total) |
| Max threshold cap | base + 8 mg | pharma-engine.js:332 | Ceiling on all bonuses combined |
| XR IR/DR split | 50% / 50% | pharma-engine.js:431-432 | Immediate vs delayed release fraction |
| DR release delay | 240 min (T+4h) | pharma-engine.js:433 | XR second-peak timing |
| Amp ghost-load window | ≤1 day / ≤3 all-nighter | pharma-engine.js:418,421 | Which past amp doses count |
| Caffeine ghost-load window | ≤1 day / ≤2 all-nighter | pharma-engine.js:477,480 | Which past caffeine doses count |
| Amp search horizon | 36 h / 48 h all-nighter | pharma-engine.js:506 | `findAmpClearTime` max search |
| Amp clear re-spike iterations | 10 | pharma-engine.js:539 | DR verification loop cap |
| Caffeine search horizon | 24 h / 36 h all-nighter | pharma-engine.js:572 | `findCaffClearTime` max search |
| Circadian window: past days sampled | 6 (+today = 7) | circadian.js:19 | Wake-time averaging window |
| Wake Maintenance Zone | wake +11h → +13h | sleep-prediction.js:64 (FZ.start − 2h) | Hard sleep blocker |
| Forbidden Zone | wake +13h → +15h | circadian.js:174-175 | Hard sleep blocker |
| Sleep Gate | wake +15h → +17h | circadian.js:184-185 | Optimal window (display) |
| Circadian-skip gate | clearance ≥ 18 h out | sleep-prediction.js:70 | Ignore today's rhythm if drugs clear too late |
| Consistency high-variability | stdDev > 120 min | circadian.js:132 | "social jet lag" warning |
| Consistency moderate | stdDev > 60 min | circadian.js:135 | Moderate variability warning |
| Critical sleep-debt warn | recent avg < 5 h | circadian.js:144 | Hyperarousal-risk banner |
| Accumulating-debt warn | recent avg < 6.5 h | circadian.js:146 | Debt banner |
| **Defaults →** amp half-life | 11 h | state.js:71 | Amphetamine decay HL |
| Default sleep threshold | 14 mg | state.js:72 | Base amp sleep threshold |
| Default caffeine half-life | 5 h | state.js:73 | Caffeine decay HL |
| Default caffeine threshold | 25 mg | state.js:74 | Caffeine sleep threshold |
| Default weight | 190 lb | state.js:75 | (unused in decay math here) |
| Default sleep target | 8 h | state.js:76 | Deficit baseline |
| Default wake time | 06:45 | state.js:41 | Circadian anchor fallback |
| `_version` default | 0 | state.js:79 | Must be 0 (data-wipe guard) — OK |

