# Stim Calc Audit — Features, Wiring, Dead Weight (HTML + init.js)

**Scope:** `stimulant-elimination-calculator.html` (4,816 lines) + `js/stimcalc/init.js` (1,351 lines).
**Method:** Read every line of both files; grep-cross-referenced all handler/DOM wiring against all 12 `js/stimcalc/*.js` modules.
**Date:** 2026-08-19. **Last code change to app:** init.js/state.js Apr 2 2026.
**Owner's 3 daily questions:** (1) When can I fall asleep tonight? (2) When must I stop caffeine? (3) How much sleep pressure do I have / will I actually fall asleep?

Classification key: **CORE** = directly answers one of the 3 questions · **SUPPORT** = calibration / trust / sleep-log that feeds the predictions · **BLOAT** = doesn't serve the daily purpose.

---

## HEADLINE FINDINGS

1. **[HIGH] Stale cache-bust on `firebase-sync.js`.** The file was modified **Mar 21 2026 09:48** but its `<script>` tag still says `?v=20260315` (`stimulant-elimination-calculator.html:4807`). A returning user whose browser cached the Mar 15 build will silently keep running the **old sync code** — exactly the kind of "the app seems broken / I don't trust it" symptom the owner describes. Every other module's `?v=` matches its mtime; this is the only mismatch.
2. **[INFO — GOOD] Wiring is clean.** All 74 inline handler references in the HTML resolve to real functions across the modules. All but one `getElementById` in init.js resolve to real elements (the one exception has a graceful fallback). No duplicate IDs. This app is *not* broken by dead handlers — the "broken" feeling is complexity/trust, not wiring.
3. **[MEDIUM] ~75–80% of the UI does not serve the 3 daily questions.** 7 sidebar pages, ~40 distinct features. The 3 questions are answered by roughly 6–8 controls on the Dashboard alone. Insights (15 analytic sub-sections), Accuracy (7 sub-sections), Workout Planner, gamified Achievements, and the two-SKU pill Inventory are all SUPPORT-or-BLOAT surface that buries the daily answer.
4. **[LOW] A whole dead tab system persists** (`switchSITab` + `siTab*` panels) plus a `display:none` "compatibility layer" that live code still writes to every 5 s.

---

## A. FEATURE INVENTORY (7 pages, ~40 distinct features)

### Sidebar / chrome (always visible)
| Feature | Implements | Class |
|---|---|---|
| 5-metric strip: **Sleep At, Remaining, Amp Load, Caff Load, Quality** (`scMetricSleep…scMetricQuality`, HTML 4279-4300) | `init.js updateMetricsRow` (1238) | CORE |
| Sidebar nav (7 pages) + badges (meds/caff/mods counts) | `init.js scNavigate` (1157), `updateSidebarBadges` (1293) | SUPPORT |
| Sync dots (sidebar + top bar) | `firebase-sync.js updateSyncStatus` (34, writes visible dots at 71-74) | SUPPORT |
| Footer: **Force Sync / Checkpoint / Restore / Export** (4240-4251) | firebase-sync / state.js BackupManager | SUPPORT |

### 1) DASHBOARD (`scPageDashboard`, HTML 4305-4481)
| Feature | Implements | Class |
|---|---|---|
| **Hero: Projected Sleep Window** — time, countdown, quality text, progress bar, bottleneck (4309-4321) | `init.js runCalculations`+`updateUI` (93/189), `updateHeroProgressBar` (1058) | **CORE** |
| Reset Day button (4320) | `ui-sections.js resetDay` (1417) | SUPPORT |
| **Medications**: All-Nighter toggle, Ghost Load, dose entries, +Add Dose, stacking warning (4324-4338) | `med-caffeine.js addMedEntry`; `init.js` all-nighter/ghost | **CORE** |
| **Drug Concentration graph** (canvas 4340-4346) | `graph.js drawGraph` | CORE/SUPPORT |
| **Inputs**: Wake Time, Hours Slept (4354-4362) | `init.js syncStateFromDOM` (21) | **CORE** |
| **Calibration** inline: Amp t½, Amp Thresh, Caff t½, Caff Thresh, Weight, Sleep Goal (4368-4376) | `init.js syncStateFromDOM` | SUPPORT |
| Sleep Debt display (4364) | `init.js updateUI` (196-219) | CORE/SUPPORT |
| Recent-nights pills (4365) | `init.js renderRecentNights` (1092) | SUPPORT |
| **Caffeine**: 5 presets + Custom + entries + coffee-status (4379-4391) | `med-caffeine.js addCaffeine` | **CORE** |
| Sleep Intelligence card: circadian phase, mini calendar, legend, explainer (4393-4410) | `history-calendar.js renderSleepIntelligence` (2070) | SUPPORT |
| Inventory mini (`scDashInvContent`, 4415-4418) | `med-inventory.js scInvRenderDashboard` | SUPPORT/BLOAT |
| **Week at a Glance** (cross-app roadmap schedule, 4420-4425) | `week-glance.js scWeekGlanceRender` | **BLOAT** (not a sleep question) |
| Modifiers mini: VitC / Heavy Lift / Sauna chips + time rows (4427-4455) | `init.js toggleModifierChip` (1135) | SUPPORT |
| Sleep History card: stat chips + scroll canvas + tooltip (4459-4471) | `history-calendar.js renderDashSleepHistoryFull` | SUPPORT |
| Blocking Factors ("What's Keeping You Awake", 4474-4479, usually hidden) | `init.js updateUI` (325-355) | **CORE** |

### 2) MODIFIERS (`scPageModifiers`, 4484-4547)
| Feature | Implements | Class |
|---|---|---|
| **Nicotine Tracking**: Log Vape, Log Pouch, status, time input, Clear, warning, recommendation, **RLS emergency protocol** (4486-4505) | `ui-sections.js logNicotine/updateNicotineDisplay/clearNicotine` | SUPPORT/BLOAT |
| **Workout Planner**: time/type/duration/intensity/fasted/cold-shower, Apply/Reset, results (4506-4526) | `ui-sections.js updateWorkoutPlan/applyWorkoutPlan` | **BLOAT** |
| **What-If Scenarios**: 6 tiles — coffee/espresso/vitc/sauna/vape/zyn (4527-4537) | `ui-sections.js simulateScenario/updateScenarios` (1152) | SUPPORT |
| **Circadian & Feelings**: forbidden zone, sleep gate, wake, feelings timeline (4538-4546) | `circadian.js` + `init.js updateFeelingsTimeline` (644) | CORE/SUPPORT |

### 3) CALENDAR (`scPageCalendar`, 4550-4588)
| Feature | Implements | Class |
|---|---|---|
| Sleep Calendar month view + prev/next nav (4551-4564) | `history-calendar.js renderSleepCalendarMonth/navigateCalendar` | SUPPORT |
| Prediction Log + accuracy summary (4565-4569) | `history-calendar.js renderHistory` | SUPPORT |
| Sleep Performance graph (4570-4581) | `history-calendar.js drawSleepPerformanceGraph` | SUPPORT/BLOAT |
| **Stats & Achievements** (siStatsGrid, sleepAchievements badges, sleepHistoryList, 4582-4587) | `history-calendar.js` (1331/1559) | **BLOAT** (gamification) |

### 4) INSIGHTS (`scPageInsights`, 4591-4609) — **15 analytic sub-sections**
`insKeyMetrics, insRecommendations, insDoseResponse, insCaffeineImpact, insSleepPatterns, insModifierImpact, insDosingWindows, insCaffeineTiming, insSleepEfficiency, insPredictionReliability, insCircadianConsistency, insStimulantTrends, insRiskIndicators, insPersonalRecords, insResearchBenchmarks` — `history-calendar.js renderInsightsTab` (2288). **Class: mostly BLOAT** (`insRecommendations` is the only near-CORE item; `insCaffeineTiming` partially answers Q2). This is the single largest complexity sink in the app.

### 5) ACCURACY (`scPageAccuracy`, 4612-4622) — **7 sub-sections**
`accOverallGrade, accMethodology, accErrorDistribution, accDirectionalBias, accContextBreakdowns, accDataInventory, accInputVerification` — `history-calendar.js renderAccuracyTab` (962). **Class: SUPPORT** (trust-building — legitimately relevant to "I don't trust it") **but heavy**; realistically only `accOverallGrade` needs to be daily-visible.

### 6) TOOLS / SETTINGS (`scPageSettings`, 4625-4646)
| Feature | Implements | Class |
|---|---|---|
| **Forecast Logic** dump (`forecastLogicText` pre + Copy, 4628-4633) | `ui-sections.js updateForecastLogic` (1959), `copyForecastLogic` (1469) | SUPPORT |
| Data Management: Reset Inputs (`clearToday`), Save Prediction (`saveDay`), Export, Import (4634-4645) | `ui-sections.js`/`history-calendar.js`/`state.js BackupManager` | SUPPORT |

### 7) INVENTORY (`scPageInventory`, 4649-4722)
| Feature | Implements | Class |
|---|---|---|
| Quick actions: Take Daily Dose / Take 30mg / Take 20mg (4651-4657) | `med-inventory.js scInvTakeBothMeds/scInvTakeMed` | BLOAT |
| 30mg + 20mg pill cards: pills/refill/lastChange, progress bar, status, ±1, Settings, per-pill calendar assignments (4659-4721) | `med-inventory.js scInvAdjustMed/scInvOpenMedSettings/scInvToggleCalendar/scInvResetPillAssignments` | **BLOAT** (prescription logistics, not a sleep question) |
| Med Settings modal + Calendar Note modal (4728-4761) | `med-inventory.js scInvSaveMedSettings/scInvSaveNote/scInvDeleteNote` | BLOAT |

### Global modals
| Feature | Implements | Class |
|---|---|---|
| Feedback modal "How did you sleep?" (4092-4106) | `history-calendar.js submitFeedback/closeFeedbackModal` | SUPPORT |
| Sleep Edit modal — hours/wake, All-Nighter, Clear (4108-4138) | `history-calendar.js openSleepEditModal/saveSleepEdit/setAllNighter/clearSleepEntry` | SUPPORT |
| Day Detail modal (4140-4149) | `history-calendar.js closeSleepDayDetailModal` | SUPPORT |

**Rough tally:** ~40 distinct features → **CORE ≈ 8**, **SUPPORT ≈ 20**, **BLOAT ≈ 12**. The two SKU-pill inventory pages, workout planner, achievements/gamification, most of the 15 Insights sections, and the cross-app Week-at-a-Glance are the bloat concentration.

---

## B. WIRING AUDIT

### B1. HTML handlers → JS functions (74 references) — **ALL RESOLVE**
Every `onclick/onchange` in the HTML maps to a real, defined function. Verified against a master list of 303 defined function names across all 12 modules. Spot map of the non-obvious ones:
- `BackupManager.exportData()` / `BackupManager.importData()` (4249, 4642, 4643) → `state.js:221 var BackupManager = {…}`. **OK.**
- `switchSITab('overview'…)` (4791-4794) → `history-calendar.js:2031`. **OK** but only reachable from the hidden compat layer (see C).
- `forceCloudSync`, `createCheckpoint`, `showCheckpointManager` (4240-4247) → firebase-sync/state. **OK.**
- All `scInv*` inventory handlers → `med-inventory.js`. **OK.**
- All inline-expression handlers (e.g. `4375` sleepTarget, `4498` nicotine time) reference real globals (`state`, `recalculate`, `renderSleepIntelligence`, `updateNicotineDisplay`). **OK.**

**No broken forward references.**

### B2. init.js DOM refs → HTML elements — **1 dead ref, gracefully handled**
- `getElementById('recommendations')` (`init.js:465`) has **no** `#recommendations` element. **[LOW]** But the line is `getElementById('insRecommendations') || getElementById('recommendations')`, and `#insRecommendations` exists (4594), so it's a harmless legacy fallback — not a runtime failure.
- `querySelector('.unified-hero')` (318), `.sc-page` (1181), `.sc-sidebar-item[data-page]` (1161) all exist. **OK.**
- All other init.js `getElementById` targets exist in the HTML. **OK.**

---

## C. DEAD WEIGHT

### C1. The hidden "compatibility layer" (`display:none`, HTML 4763-4800)
A `display:none; aria-hidden` block preserving pre-sidebar markup. Mapping of what it holds and whether live JS still writes to it:

| Element(s) | Still written by live JS? | Verdict |
|---|---|---|
| `status-pills`: `ampStatusPill`, `caffStatusPill`, `circadianPill`, `currentAmpLoad`, `currentCaffLoad`, `circadianStatus` | **Yes** — `init.js updateStatusPillColors` (1073) + `updateUI` (282-285) run **every 5 s** | Live-but-invisible. Wasted DOM writes; can't delete without removing the calls. |
| `circadianStatusItem`/`Indicator`, `ampStatus`/`Indicator`, `caffStatus`/`Indicator`, `workoutStatusItem`/`Status`/`Indicator` | **Yes** — `updateUI` (232-292), `updateStatusItem`, `updateWorkoutStatus` every 5 s | Live-but-invisible dead weight. |
| `syncStatus` / `syncIcon` / `syncText` | **Yes** — `firebase-sync.js:35-36` (redundant; it *also* updates the real visible dots at 71-74) | Redundant duplicate of the visible sync UI. |
| 11 `accordion-section[data-section=…]` (sleep/meds/caffeine/modifiers/nicotine/workout/circadian/sleepIntel/recs/forecast/settings/whatif) + summary spans | **Yes** — `init.js updateAccordionSummaries` (943) every 5 s writes all summaries; `toggleAccordion`/`restoreAccordionStates` still target them; `ui-sections.js:1157` reads `data-section="whatif"` | The entire pre-sidebar accordion model is still being maintained invisibly every 5 s. Largest single chunk of dead weight. |
| `siTabs` + 4 `si-tab` buttons + `siTabOverview/Insights/Accuracy/Calendar` panels | **No** — `switchSITab` (2031) is only invoked by these hidden buttons; `renderSleepIntelligence` (2070) does **not** write these panels (it calls the newer page renderers). | **Fully dead.** `switchSITab` + siTab panels are unreachable/unused code. |

**Takeaway:** the compat layer is not inert — `updateUI()` spends work every 5 s updating invisible pills, status items, and 11 accordion summaries. Removing it requires also removing those calls in init.js (updateAccordionSummaries, updateStatusPillColors, updateStatusItem, updateWorkoutStatus, the hidden branches of updateUI). The `siTab*`/`switchSITab` cluster can be deleted outright.

### C2. Duplicate IDs — **none** (clean).

### C3. Redundant reset actions — **[LOW]** two separate "reset" verbs: **Reset Day** (`resetDay`, dashboard hero 4320) and **Reset Inputs** (`clearToday`, settings 4638). Distinct functions (`ui-sections.js` 1417 / 1370); worth confirming they're not confusingly overlapping (defer detail to the ui-sections audit).

### C4. Orphaned CSS — **[LOW/INFO]**
The `<style>` block is ~4,060 lines (HTML 18-4082) with ~416 class tokens; ~300 are referenced (many only inside module-generated `innerHTML`, so not visible to a naive HTML-only scan). Confirmed **true orphans** (defined in CSS, referenced nowhere in HTML or any JS): `.blocking-item`, `.force-pull`, `.force-upload`, `.loading-spinner`, `.empty-state`, `.button-row`. Low priority, but indicative of accumulated cruft. A full orphan sweep of the 4k-line CSS is out of scope for this slice.

---

## D. SCRIPT TAGS & CACHE-BUST

13 `<script>` tags (3 Firebase CDN + 10... actually 12 local modules). Firebase pinned to 9.22.0 compat. Local module version params vs file mtimes:

| Module | mtime | `?v=` | Status |
|---|---|---|---|
| state.js | Apr 2 00:59 | 20260402a | OK |
| circadian.js | Feb 24 | 20260315 | OK (bust ≥ mtime) |
| pharma-engine.js | Feb 20 | 20260315 | OK |
| sleep-prediction.js | Feb 20 | 20260315 | OK |
| **firebase-sync.js** | **Mar 21 09:48** | **20260315** | **[HIGH] STALE — bust predates file by 6 days** |
| med-caffeine.js | Mar 14 | 20260315 | OK |
| ui-sections.js | Mar 14 | 20260315 | OK |
| history-calendar.js | Mar 14 | 20260315 | OK |
| graph.js | Mar 14 | 20260315 | OK |
| med-inventory.js | Mar 16 | 20260316 | OK |
| week-glance.js | Mar 21 | 20260321c | OK |
| init.js | Apr 2 01:08 | 20260402a | OK |

**Fix:** bump `firebase-sync.js?v=` (e.g. `?v=20260402a`) so cached clients pull the Mar 21 sync build. This is the highest-leverage one-line fix in this audit given the owner's "app seems broken / I don't trust it" complaint — a device stuck on the Mar 15 sync code would sync inconsistently.

---

## E. COMPLEXITY ASSESSMENT

**Fraction serving the 3 daily questions:** roughly **20–25%.** The daily answer lives entirely on the **Dashboard**, in ~6–8 controls: the hero sleep-window + countdown, the Medications card, the Caffeine card, Wake/Hours inputs, the Sleep-Debt readout, and (when relevant) the Blocking-Factors card. Everything else — Modifiers page (workout planner especially), Calendar, the 15-section Insights page, the 7-section Accuracy page, the two-SKU pill Inventory, gamified Achievements, cross-app Week-at-a-Glance — is SUPPORT or BLOAT.

**Question-by-question coverage:**
- **Q1 "when can I fall asleep"** — well served by the hero + blocking factors + Sleep-At metric. **Strong.**
- **Q2 "when must I stop caffeine"** — *under*-served on the surface. There's a Caff-Load metric and caffeine card, but the actual cutoff guidance is buried in `updateRecommendations` (init.js 528-539, "noon caffeine cutoff") which only renders on the **Insights** page, not the Dashboard. A returning daily user never sees the direct answer without navigating away. **Gap.**
- **Q3 "sleep pressure / will I fall asleep"** — served by Sleep-Debt display + circadian sleep-gate/forbidden-zone, but split across the Dashboard Sleep-Debt card and the Modifiers-page Circadian card. **Partial / scattered.**

**Minimal daily-use surface using what already exists (no new code):** collapse to the **Dashboard main column only** —
1. Hero (Projected Sleep Window + countdown + quality),
2. Medications card,
3. Caffeine card **plus a surfaced "stop caffeine by HH:MM" line** (compute already exists in `updateRecommendations`; just needs to render on the dashboard),
4. Wake/Hours inputs,
5. one combined Sleep-Pressure readout (merge Sleep-Debt + circadian sleep-gate),
6. Blocking-Factors (auto-show when blocked).

Demote Inventory, Insights, Accuracy, Workout Planner, Achievements, and Week-at-a-Glance behind an "Advanced" affordance. That is ~6 cards on one page versus today's 7 pages / ~40 features — and it is achievable purely by hiding/relocating existing, already-wired components, plus the one caffeine-cutoff render already computed in init.js.
