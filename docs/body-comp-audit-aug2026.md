# Body Comp Tracker — Full Audit & Fix (August 2026)

**File:** `body-comp-tracker.html` (single file, ~24k lines after fixes; diff vs HEAD +2,026/−976)
**Method:** 4-phase audit (6-domain parallel read → consolidate → 6 fix waves → automated verification)
**Verification:** 97/97 automated checks passed (Playwright/Chrome, offline boot, deploy-path migrations exercised, independent Python math model)
**Status at time of writing:** All changes local and uncommitted. Goal is intentionally UNSET.

---

## 1. Ranked Bug List (as found in Phase 1–2)

### P0 — Math provably wrong or data loss

1. **Metabolic-adaptation stack double-counted adaptation** (`calculateTDEE` + milestone `tdee_base` decrements). BMR already falls as weight falls; the extra stack suppressed TDEE ~100 cal/day, understating every deficit. *(M4)*
2. **"Streak" counted app usage, not deficits** — `updateStreak()` incremented on app open, and day-rollover auto-credited it. The headline streak number measured nothing about the diet. *(W2d)*
3. **Weekly deficit was Sunday-anchored on some surfaces and trailing on others** — the dashboard chip, weekly summary, and CSV/weekly export could all disagree. *(W2c)*
4. **Rollover snapshot save blocked on every fresh open across midnight** — `initializeUI()` ran before `isInitialLoad = false`, so Guard A blocked the archive save of yesterday's day log. Silent loss window on the most common usage pattern (open app in the morning). *(H4)*
5. **`saveState()` wrote localStorage only after Guard C** — a guard-blocked save lost the mutation entirely while the UI implied it saved. *(P1)*
6. **Import parsers coerced malformed input** — `||30`, `||200`, `||0` fallbacks fabricated durations/calories; `WORKOUT|Run||` produced a phantom 30-minute workout. Zero validation of dates (accepted `2026-13-45` and future dates) or workout types. *(I5, I4, I7)*
7. **Duplicates handled silently** — depending on the path, duplicate pastes were silently added (double-counting calories) with no confirmation. *(I1r)*
8. **Goal hardcoded to June 2026** — pace and recomp predictor projected against a dead date; the goal was not editable and could never be unset. *(W2b)*
9. **`clearAllData()` didn't await the cloud `remove()`** — combined with the pagehide save, wiped data could resurrect. *(P9)*
10. **`_version` not monotonic** — an older device with a larger clock skew could win version comparison and clobber newer data. *(P5)*
11. **`frequentFoods` merge had no tombstones** — deleted foods resurrected from the other device on every merge. *(U3)*

### P1 — Wrong numbers on real surfaces

12. **Workout avg/week divided by logged-day count, not calendar span** — sparse logging inflated the average. *(M19)*
13. **Weight inconsistently sourced** — some functions used `profile.currentWeight_lbs`, others the last weigh-in; TDEE for a given date could differ between surfaces. Unified on `getWeightForDate()`. *(M7)*
14. **`getTotalsForDate`/`getWorkoutTotalsForDate` live-day branch keyed to today's calendar date instead of `state.today.date`** — wrong around midnight before rollover. *(M8)*
15. **Recomp predictor used a dead BMR/multiplier block and `goalWeight` (wrong field name)** — projections from stale inputs. *(M20)*
16. **Month stats skipped days with deficit exactly 0** (falsy check). *(M12)*
17. **Two gym-streak implementations disagreed**; two day-status implementations disagreed (`determineDayStatus` vs `checkDayCompletion`). *(M14, M13)*
18. **initFirebase offline hang** — with no network, load never resolved and no watchdog fired; the app never booted. *(P2)*
19. **`addCustomMeal` read `editingMealId` after nulling it** — editing a meal awarded XP and bumped usage as if newly logged. *(U4)*
20. **XSS: meal/workout time strings rendered unescaped** at 4 innerHTML sinks (dashboard list, historical edit, qty preview, day details). *(I2)*

### P2 — UX / mobile / hygiene

21. **15 frequent foods stored `fat: 0`** despite having real fat (RXBAR 9g, Vital Farms egg 5g, …) — fat macro silently under-reported. Fixed forward-only per decision. *(M17r)*
22. **Meal picker capped, unsearchable, no pinning; usage counts only bumped from one logging path.** *(U1r)*
23. **Touch targets under 44px on iPhone** (meal actions, header buttons, day-details buttons); iOS keyboard covered focused inputs; calendar today-cell blank until the first snapshot existed. *(B1, B2, B3)*
24. **Import preview went stale** — confirm used the parse from preview time, not the live textarea. *(I8)*
25. **Import paths lacked XP parity and P1 lacked time/date column parity.** *(I9, I10)*
26. **Quantity stepper floor 0.5** (couldn't log a quarter portion); 0-calorie foods rejected; `parseInt` on macro inputs truncated decimals. *(U8, U9, I18)*
27. **`saveFrequentFood` duplicated on rename-to-same-name**; delete didn't confirm. *(U2, U3)*
28. **Sync status dishonest** — no "Saving…"/"Not synced" states; save toasts fired regardless of save outcome. *(P3, P1)*
29. **Checkpoint restore rejected `.data`-shaped exports.** *(P11)*
30. **Stray raw `JSON.stringify(state)` localStorage writes** bypassed the pruned writer (quota risk). *(P12)*

---

## 2. What Was Fixed and How (by wave)

**Wave 1 — Core math engine.** Removed the metabolic-adaptation stack; `calculateTDEE()` is now exactly `round(BMR(weight-for-date) × activity) + 7-day workout average` and the TDEE breakdown panel/logic log render the same computation. Weight unified on `getWeightForDate()`; Settings weight change upserts a `source:'settings'` weigh-in. `recalcDateAndDependents` re-snapshots today when in the window.

**Wave 2 — Canonical metrics + goal system.** New canonical helpers used by every surface: `getGoal()`, `getDisplayDeficitForDate()`, `getTrailing7DayDeficit()` (window ends yesterday on the live day), `calculateDeficitStreak(≥500, untracked breaks)`, `calculateLongestDeficitStreak()`, `isDayOnTrack()`, `getCalorieBand()`, one `calculateGymStreak()`. Usage streak and rollover auto-credit deleted. Sunday anchor deleted at every site. Goal is now weight + date in Settings, Firebase-persisted with `goalSetAt`; unset goal renders a "Set a goal" state everywhere (pace, predictor, achievements) and breaks nothing. Achievements re-keyed to longest deficit streak; personal records gained "Best 7-Day Deficit".

**Wave 5 (moved ahead) — Persistence honesty.** localStorage write moved BEFORE Guard C (guards 0/A/B/D still block everything); blocked cloud saves show a visible "Not synced" chip; "Saving…" while debounce armed with a watchdog. `pagehide` + `visibilitychange→hidden` both flush `saveStateImmediate()` (iOS). 10s load watchdog + 5s ecosystem race fix the offline boot hang. `_version` stamped monotonically (`max(local, cloud+1, now)`) and adopted after merges. `clearAllData` awaits cloud remove with failure alert. Rollover flags set before `initializeUI()` in try/catch. All localStorage writes routed through one pruned writer. `frequentFoods` gained `updatedAt` newer-wins + `deletedFrequentFoodIds` tombstones across defaults/payloads/merges/reseed gates.

**Wave 3 — Import parsers.** Shared `parseImportText`/`parseImportLine` with strict numerics (`parseImportNumber`: empty→null, malformed/negative→reject), calendar-round-trip date validation, HH:MM / H:MM AM-PM time validation, 8-type workout whitelist, CRLF/trim/case-insensitive prefixes. Rejection is always visible: preview renders a red block with the exact rejected lines + reasons; toast shows "N added · M rejected"; confirm disabled only when 0 valid lines. `confirmImportDuplicates()` shared across all three paste paths: one confirm listing vs-existing and within-paste dups (key = date|name|calories so a different portion is never flagged), OK keeps all, Cancel drops only flagged. Confirm re-parses the live textarea (no staleness). P1 gained per-line Time/Date columns; P3 gained XP parity for today-dated meals.

**Wave 4 — Fat forward-only + meal picker rebuild + XSS.** Safety check passed first: no code path derives calories from macros. Fat inputs added to log modal, historical edit, and qty preview. `runFrequentFoodFatPatch()` fills fat on exactly 15 exact-normalized-name foods, only when `fat` isn't already >0, flag-gated (`_fatPatch15Applied`) and merge-safe; zero historical log rewrites. Meal picker: uncapped scrollable grid, pin/unpin (📌, rides newer-wins merge via `updatedAt`), Frequents⇄All Foods in-modal toggle, always-visible search over the whole library, `bumpFrequentFoodUsage()` (exact-name, libraryId wins, never creates) called from all four non-picker logging paths with the double-count removed. `escapeHtml` at all four time-string sinks. Qty floor 0.25; 0-cal foods allowed; `parseFloat` everywhere.

**Wave 6 — Mobile.** Coarse-pointer CSS block: ≥44×44 targets for meal actions, header buttons, checkpoint buttons, and the new `.dd-action-btn` class on all 8 day-details render sites; meal actions always visible on touch. `focusin` + `visualViewport` handlers scroll focused modal inputs above the iOS keyboard. Calendar today-cell synthesizes a live log from `state.today` when no snapshot exists.

---

## 3. Math Spec As Implemented

All formulas below were verified at runtime against an independent Python model — 97/97 checks, zero mismatches.

- **BMR** (Mifflin-St Jeor, male): `round(10 × (lbs ÷ 2.205) + 6.25 × height_cm − 5 × age + 5)`
- **Weight for a date**: latest weigh-in on/before that date → else earliest weigh-in → else `profile.currentWeight_lbs`
- **Workout average for a date**: sum of logged workout calories over the 7 days ending at that date, ÷ 7, rounded
- **TDEE(date)** = `round(BMR × activity multiplier)` + workout average. Sedentary = 1.2. **No other metabolic adjustment exists.**
- **Deficit(day)** = `TDEE − calories eaten`. Workout calories enter only through the 7-day average inside TDEE — never added again per-day.
- **Tracked day**: `calories > 0 || protein > 0 || mealCount > 0`. Untracked → deficit is `null`, never 0. A workout-only day is `nutritionStatus: 'unresolved'` → deficit `null`.
- **Deficit streak**: walk back from **yesterday**; a day counts iff deficit ≥ 500; `null` (untracked or workout-only) or < 500 breaks. The live day is pending — it neither counts nor breaks until it completes.
- **Trailing-7 deficit**: sum of non-null deficits over the 7 calendar days ending **yesterday** when computed on the live day (explicit historical end dates use the literal window). This one number feeds the dashboard chip, weekly summary, progress surfaces, and the weekly export — verified equal to the calorie.
- **Pace**: `lbs remaining ÷ days remaining → required lb/wk → required daily deficit (× 3500 ÷ 7)` vs actual trailing average. No goal → "No goal set — add weight + date in Settings". Required rate > 2 lb/wk warns unrealistic. Passed date prompts an update, never silently ignored.

**Deviations, flagged and accepted:**
1. **Historical fat stays 0** on pre-patch log entries (decision 5: forward-only). Historical fat-macro totals read low; calories were always stored as entered, so nothing else is affected.
2. **`isDayOnTrack()` has no legacy reconstruction** — very old logs without a stored deficit may undercount "days on track" (M11: cross-surface consistency was chosen over reconstruction).
3. **One-time history rewrite on first load** (`runHistoryUpgradeV3`, schema v4): every past day's `tdee`/`deficit`/status is recomputed under the corrected formula. Historical deficits shift ≈ +100 cal/day. This is the deliberate correction, not drift — stored meal/workout entries are untouched (`preserveStored` keeps legacy totals-only days' numbers).

---

## 4. Five-Minute Phone Test Script (iPhone Chrome)

1. **Boot + migration** (~60s): open the live URL, enter PIN, wait for load. First open runs the one-time history recompute (~2s extra). Check the dashboard chips read **"deficit streak"** and **"7d deficit"**. The streak number may be smaller than before — expected.
2. **Goal state** (~30s): Settings → goal section shows unset ("Set a goal"). Pace card reads "No goal set — add weight + date in Settings". Enter goal weight + target date → pace populates with required lb/wk and required daily deficit.
3. **Meal picker** (~60s): open quick meal. Frequents list scrolls (no 12-item cap). Tap 📌 on a food → it jumps to the front and survives reopening the modal. Switch to All Foods, search a food that isn't a frequent, tap it, step quantity by 0.25, add. Confirm the fat field is present and RXBAR-type foods show real fat.
4. **Import rejection** (~45s): paste into import:
   `MEAL|Test Meal|500|30|40|10`
   `WORKOUT|Run||`
   Preview must show 1 item + a red rejected block quoting `WORKOUT|Run||` with the reason. Confirm — exactly one meal appears, zero phantom workouts.
5. **Duplicate confirm** (~30s): paste the same MEAL line again → a confirm dialog lists it as already logged. Cancel → nothing added. Paste again, OK → it adds (intentional double portion works).
6. **Kill-tab persistence** (~30s): add a meal, immediately swipe the tab closed. Reopen → the meal is there; sync chip settles to Saved.
7. **Mobile ergonomics** (~45s): calendar → today's cell shows live data. Open a past day's details → every button is comfortably tappable. Edit a field → the keyboard does not cover the input.
8. **Export agreement** (~30s): weekly export → `WeeklyDeficit` equals the dashboard 7d-deficit chip exactly; `DeficitStreak` equals the streak chip; PROFILE line shows your goal (or `Goal:not set` before step 2).

---

## Deploy Expectations (first open after push)

- **TDEE rises ~100 cal/day** (adaptation stack removed) — today's target and all recomputed historical deficits shift accordingly. That's correction, not data loss.
- **Goal is null** — pace reads "No goal set" until you set weight + date from your next weigh-in. Correct behavior, not a bug.
- **"Longest Streak" shrinks** — it now measures consecutive ≥500-cal-deficit days instead of app opens. Correction, not data loss.
- One-time migrations run automatically (~1.5s after init): history recompute (schema v4) + 15-food fat patch. Both flag-gated and merge-safe across devices.
