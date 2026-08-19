# Stim-Calc Audit — `history-calendar.js` + `graph.js`

**Auditor:** audit-history subagent (READ-ONLY)
**Date:** 2026-08-19
**Files:** `js/stimcalc/history-calendar.js` (2,991 lines), `js/stimcalc/graph.js` (889 lines)
**Cross-referenced (not modified):** `state.js`, `pharma-engine.js`, `init.js`
**Constraint:** No source files modified. This report is the only artifact written.

Severity legend: **CRITICAL** (data loss / breaks trust) · **HIGH** (wrong output) · **MEDIUM** (misleading UX) · **LOW** (edge-case / cosmetic) · **INFO** (verified-safe / design note).

---

## TASK A — Calibration loop: does it close?

### HEADLINE FINDING — **The calibration loop does NOT close. It is 100% advisory / display-only.** [HIGH]

The app measures its own prediction error in detail and even computes the *exact* threshold adjustment to make — but **no code path ever writes that adjustment back into the model.** The model input is `state.settings.sleepThreshold`, and the only way it changes is the user manually dragging the Settings slider.

Evidence chain:

- **Model reads only the manual base threshold.** `getEffectiveThreshold()` (`pharma-engine.js:247-252`) starts from `state.settings.sleepThreshold` and adds *physiological* bonuses (sleep debt, workout adenosine, sauna, vit-C). It never reads any calibration/accuracy output.
- **`getCalibrationRecommendation()`** (`history-calendar.js:1963-2009`) computes `adjustmentMg` (fixed `-2/-1/0/+1/+2`) and `suggestedThreshold = clamp(currentThreshold + adjustmentMg, 8, 25)` — then **returns them as an advice object.** Nothing consumes `suggestedThreshold`.
- **`suggestCalibration()`** (`history-calendar.js:2012+`) only calls `showToast()` with tips. No state write.
- **`submitFeedback()`** (`history-calendar.js:1875`) records the actual sleep and calls `suggestCalibration()` (`:1906`) → toast only.
- **Directional Bias card** (`renderAccDirectionalBias`, `history-calendar.js:1094-1096`) prints "Consider lowering/raising your Sleep Threshold by `Math.round(|avgError|/15)` mg" as static text.
- Repo-wide grep for consumers of `suggestedThreshold` / `adjustmentMg` / any `applyCalibration` writer: **none exist.** The value is computed and displayed, never applied.

**Why this matters for this user:** the owner stopped trusting the tool because it felt complex. The single highest-value fix is a one-click "Apply this adjustment" button that writes `suggestedThreshold` into `state.settings.sleepThreshold` (+ `saveState()`). The math is already done; only the write-back is missing.

### A-2. Two *different, conflicting* recommendation formulas [MEDIUM]

The app gives the user two different mg numbers for the same situation:

- `getCalibrationRecommendation()` (`:1994-1999`): fixed steps — `avgDelta > 60 → -2`, else `-1`; `avgDelta < -60 → +2`, else `+1`.
- `renderAccDirectionalBias()` (`:1095`): proportional — `Math.round(|avgError| / 15)` mg.

For an avgError of ~45 min these disagree (−1 mg vs −3 mg). Conflicting advice directly undermines the trust the user cares about. Pick one formula.

### A-3. Delta math — **correct** [INFO]

`computeSleepDelta()` (`state.js:329-336`) normalizes both times into `[0,1440)` and wraps the diff into `[-720,+720]`. Midnight crossings and all-nighter wrap-arounds are handled correctly. All 21 sections that compute error call this helper rather than raw subtraction — good consistency.

### A-4. `autoPopulateFeedback()` all-nighter guard — **correct** [INFO]

`history-calendar.js:94-125`. Derives `actualSleep = wakeMinutes − hoursSlept*60`, `+1440` if negative. Line 116 requires `hoursSlept > 0 && wakeTime` before deriving — this correctly excludes 0h all-nighter/no-data rows that would otherwise produce garbage (`wakeTime − 0` treated as a sleep-onset time). Only recomputes auto-filled rows; never overwrites manual feedback (`:101`).

---

## TASK B — Data model duality

Three overlapping stores hold sleep data:

| Store | Key | Shape | Written by |
|-------|-----|-------|-----------|
| `state.history{}` | `generateId('hist')` | `{date, predictedSleep, actualSleep, deltaMinutes, absError, inputs, autoSaved, autoFilled, predictedAt}` | `autoSavePrediction`/`saveDay`/`buildHistoryEntry` (`:6-79`) |
| `state.sleepHistory{}` | `YYYY-MM-DD` | **dual:** bare `number` (hours) **OR** `{hoursSlept, wakeTime}` | calendar edits |
| `state.sleepDailyLogs{}` | `YYYY-MM-DD` | rich snapshot `{date, source, sleepOnsetMinutes, predictedSleep, hoursSlept, ...}` | `saveSleepDayLog`, `autoPopulateFeedback`, migrations |

### B-1. `sleepHistory` polymorphic shape is a recurring bug magnet [MEDIUM]

Every reader must type-check `typeof x === 'number' ? x : x.hoursSlept` (e.g. `:110-112`). This pattern is duplicated across many call sites; a single missed check yields `undefined.hoursSlept`. Not a bug today, but the shape duality is the root cause behind several historical fixes and should be normalized to one shape.

### B-2. Reconciliation is centralized and sound [INFO]

- `getSleepForDate()` (`:355`) is the single unified read: `sleepDailyLogs` first, then `sleepHistory`.
- `gatherAllDayData()` (`:2125`) merges all three stores into unified day objects, using `getSleepForDate()` as source of truth; `allNighterMode` when `hoursSlept <= 0`. All 21 render sections consume this — good single funnel.
- Firebase-safe reads: `getValues(state.history)` is used everywhere history is iterated (`:95, :1032, :1079, :1108`, etc.). Date-keyed objects (`sleepHistory`, `sleepDailyLogs`) are iterated with `Object.keys` — correct, since they are keyed objects not sparse arrays.

### B-3. `cleanupPhantomSleepLogs()` — **SAFE, cannot delete real data** [INFO]

`history-calendar.js:881`. Deletes a `sleepDailyLogs` entry only when **all** hold: `source === 'backfilled'` AND hours are null AND the date is absent from `sleepHistory`. Manual (`manual_edit`), `live`, and `auto_feedback` logs are never touched. Migrations V2/V3 (`:641`, `:823`) that create the backfilled logs are what this cleans up. Verified non-destructive.

### B-4. History de-dup by lexical id compare [LOW]

`cleanupHistory()` (`:291-311`) de-dupes by date keeping the entry whose `entry.id` string-compares greater (`:311`). IDs are `hist_<epoch-ms>_...`; lexical compare of equal-length epoch strings matches numeric order through ~year 2286, so correct in practice. Fragile only if id format changes.

---

## TASK C — KEEP / CUT for the 21 sections

Lens: a real user with **10–60 logged days** who wants "back to basics" and *trust*. CUT-CANDIDATE = low signal at realistic N, redundant, or gamification fluff.

### Insights tab (14 sections)

| # | Section (fn @ line) | Min data gate | Verdict | Rationale |
|---|---------------------|---------------|---------|-----------|
| 1 | Key Metrics (`renderInsKeyMetrics` @2321) | none | **KEEP** | Core at-a-glance numbers; always populates. |
| 2 | Dose-Response (`renderInsDoseResponse` @2373) | 3 | **KEEP** | Most decision-relevant view for an Adderall user (onset vs dose bucket). |
| 3 | Caffeine Impact (`renderInsCaffeineImpact` @2416) | 3 | **KEEP** | With/without comparison is distinct and actionable. |
| 4 | Sleep Patterns (`renderInsSleepPatterns` @2464) | 5 | **KEEP** | Consistency std-dev is valuable; note best/worst-DOW needs ≥2/day (~14+ days) to be meaningful. |
| 5 | Modifier Impact (`renderInsModifierImpact` @2519) | 3 (+≥1 with/without) | **CUT-CANDIDATE** | VitC/Workout/Sauna deltas are noise at 1–2 samples; modifiers rarely logged enough to trust. |
| 6 | Dosing Windows (`renderInsDosingWindows` @2551) | 3 (+meds w/ times) | **CUT-CANDIDATE** | Niche; requires per-dose timestamps; low signal at realistic N. |
| 7 | Caffeine Timing (`renderInsCaffeineTiming` @2586) | 2 | **KEEP** | Actionable gap-to-sleep metric with research anchor. |
| 8 | Sleep Efficiency (`renderInsSleepEfficiency` @2621) | 3 | **KEEP** | Simple, trustworthy, core (efficiency %, week deficit, days below target). |
| 9 | Prediction Reliability by Context (`renderInsPredictionReliability` @2652) | 5 | **CUT-CANDIDATE** | ~80% redundant with Accuracy §5 Context Breakdowns (which additionally shows bias). Fold into Accuracy tab. |
| 10 | Circadian Consistency (`renderInsCircadianConsistency` @2693) | 5 | **KEEP** | Wake variability + social jet lag; strong sleep-science signal, low data need. |
| 11 | Stimulant Trends (`renderInsStimulantTrends` @2728) | 7 | **KEEP** | 4-week dose trend + tolerance indicator; genuinely useful monitoring. |
| 12 | Risk Indicators (`renderInsRiskIndicators` @2777) | 3 | **KEEP** | Safety-relevant and actionable (streaks, deprivation, sleep-debt zone). |
| 13 | Personal Records (`renderInsPersonalRecords` @2840) | 3 | **CUT-CANDIDATE** | Gamification fluff; not decision-relevant for a back-to-basics user. |
| 14 | Research Benchmarks (`renderInsResearchBenchmarks` @2892) | 3 | **CUT-CANDIDATE** | Re-presents §7 (caffeine gap), §8 (duration), §10 (variability) against literature; mostly redundant. Static XR-PK note could relocate. |

**Insights tally: 9 KEEP / 5 CUT-CANDIDATE.**

### Accuracy tab (7 sections)

| # | Section (fn @ line) | Min data gate | Verdict | Rationale |
|---|---------------------|---------------|---------|-----------|
| 1 | Overall Grade (`renderAccOverallGrade` @979) | 3 feedback | **KEEP** | THE headline accuracy number (±min, within30/60, trend). |
| 2 | How It's Calculated (`renderAccMethodology` @1007) | always | **KEEP** | Transparency builds the trust the user lost; consider collapsed-by-default. |
| 3 | Error Distribution (`renderAccErrorDistribution` @1029) | 3 | **KEEP** | Abs-error histogram; trustworthy at-a-glance. |
| 4 | Directional Bias (`renderAccDirectionalBias` @1066) | 3 | **KEEP** | Highest-value: signed bias + per-dose bias + the "adjust threshold" hint. **Wire this to actually apply** (see A-1/A-2). |
| 5 | Context Breakdowns (`renderAccContextBreakdowns` @1105) | 3 | **KEEP** | Better than Insights §9 (adds directional bias). Keep this one; cut the §9 twin. |
| 6 | Data Inventory (`renderAccDataInventory` @1140) | 1 | **KEEP** | Raw predicted/actual/error table — essential "show me the data" trust anchor. |
| 7 | Input Verification Now (`renderAccInputVerification` @1169) | always | **KEEP** | Shows exactly what the algorithm sees right now; directly answers "is it using the right inputs?" |

**Accuracy tally: 7 KEEP / 0 CUT-CANDIDATE** (the Insights↔Accuracy redundancy is resolved by cutting Insights §9).

**Overall: 16 KEEP / 5 CUT-CANDIDATE across 21 sections.**

---

## TASK D — Rendering bugs

### D-1. Main graph is NOT DPR-scaled → blurry on Retina [LOW]

`drawGraph()` (`graph.js:13-14`) sets `canvas.width = rect.width - 40` / `canvas.height = rect.height - 40` with **no `devicePixelRatio` scaling**. By contrast `_drawSleepGraphToCanvas()` and `drawAccuracyTimeline()` DO scale by DPR. Result: the primary amp/caffeine curve renders soft/blurry on HiDPI displays while the sleep/accuracy canvases are crisp — a visible inconsistency.

### D-2. Graph tooltip coordinate mapping — consistent *if* canvas isn't CSS-stretched [INFO/verify]

`setupGraphTooltip()` (`graph.js:296-319`) takes mouse coords from `canvas.getBoundingClientRect()` (CSS px) and maps them with `graphWidth = canvas.width − padding` (bitmap px). Because `drawGraph` sets the bitmap to `rect.width−40` with no DPR scale and no explicit CSS width, bitmap px == CSS px and the mapping is internally consistent. **Risk:** if CSS ever sets `#graphCanvas { width: … }` (e.g. `100%`), the bitmap would be stretched and the tooltip x→time mapping would be off by the stretch ratio. Worth a one-line CSS check; not a live bug.

### D-3. Division-by-zero guards — present [INFO]

`_drawSleepGraphToCanvas` (`graph.js:565`) and `_setupSleepTooltipForCanvas` (`graph.js:448`) both guard `if (data.length < 2) return`; `drawAccuracyTimeline` (`graph.js:753`) renders an explicit message for <2 entries. `_stdDev` (`history-calendar.js:2266`) returns 0 for `<2`. All per-section renderers gate on min-N before dividing. No divide-by-zero found.

### D-4. `getCardinalSplinePoints` arity mismatch — harmless [INFO]

Defined `(points, tension)` (`graph.js:401`) but called `(points, 0.3, 16)` at `graph.js:818`. The third arg is ignored. Cosmetic.

### D-5. `renderSleepIntelligence()` is NOT in the 5s loop — verified safe [INFO]

The expensive full re-render (`history-calendar.js:2070`) is called only on init (`init.js:838`, and again at `:883` after a 2.5s migration pass), on import, on navigation, and after feedback saves. `updateUI()`/`recalculate()` (the 5s `setInterval` at `init.js:887`) explicitly excludes it (`init.js:370-373` comment + omission). No "expensive render in the 5s loop" violation.

### D-6. escapeHtml on user text [LOW]

The 21 section renderers build `innerHTML` from computed numbers, `toLocaleDateString` output, and hard-coded labels — no free-text user fields, so XSS surface is minimal. The one place raw user-entered strings reach `innerHTML` without `escapeHtml()` is `renderAccInputVerification` (`:1198-1199`), which injects `m.time` / `c.time` (and `m.dose` / `c.amount`). These come from `<input type="time">`/numeric fields so are practically constrained, but escaping them would be correct-by-construction. Low risk.

---

## TASK E — Date handling

### E-1. `cleanupHistory()` 180-day prune uses UTC (`toISOString`) — off-by-one boundary [LOW]

`history-calendar.js:332`: `const cutoffStr = cutoffDate.toISOString().split('T')[0];` — the exact `.toISOString().slice(0,10)` trap called out in CLAUDE.md. In EST the cutoff string can shift ±1 day, so the prune boundary is off by up to a day. Inconsistent with `calculateAccuracyStats()` (`:1924`) which correctly uses `getLocalDateString(cutoffDate)`. Low impact (a 180-day boundary), but should use `getLocalDateString()` for consistency.

### E-2. All other date handling — correct [INFO]

- `parseLocalDate()` + `getLocalDateString()` used correctly for the `autoPopulateFeedback` next-day link (`:104-107`), weekly buckets (`:2635`, `:2739`), and 30-day windows (`:2807`).
- `_dayOfWeek`/`_isWeekend` (`:2272-2280`) parse via `parseLocalDate` — UTC-safe. (`_isWeekend` treats Fri/Sat/Sun as "weekend nights" — an intentional semantic, not a bug.)
- String date comparisons (`d.date >= weekAgo`, `d.date > weekStart`) operate on `YYYY-MM-DD` strings — lexical order == chronological order. Correct.
- Calendar month grid `renderSleepCalendarMonth` uses `new Date(year, month, 1).getDay()` (`:1635`) — local constructor, correct first-weekday offset.

---

## Summary of actionable items (by severity)

| Sev | Item | Location |
|-----|------|----------|
| HIGH | Calibration never applied — add "Apply adjustment" write-back to `state.settings.sleepThreshold` | A-1 (`:1963`, `:1094`, `pharma-engine.js:247`) |
| MEDIUM | Two conflicting recommendation formulas — unify | A-2 (`:1095` vs `:1994`) |
| MEDIUM | `sleepHistory` dual number/object shape — normalize | B-1 (`:110`) |
| LOW | Main graph not DPR-scaled (blurry) | D-1 (`graph.js:13`) |
| LOW | 180-day prune uses `toISOString` UTC | E-1 (`:332`) |
| LOW | `renderAccInputVerification` injects `m.time`/`c.time` unescaped | D-6 (`:1198`) |
| CUT | 5 Insights sections low-signal/redundant | C (§5,6,9,13,14) |
| INFO | `cleanupPhantomSleepLogs` verified non-destructive | B-3 (`:881`) |
| INFO | `renderSleepIntelligence` correctly excluded from 5s loop | D-5 (`init.js:370`) |
| INFO | `computeSleepDelta` midnight math correct | A-3 (`state.js:329`) |
