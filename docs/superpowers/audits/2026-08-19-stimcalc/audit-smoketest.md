# Stimulant Elimination Calculator — Live Browser Smoke Test

**Date:** 2026-08-19
**File under test:** `stimulant-elimination-calculator.html` (+ `js/stimcalc/*.js`)
**Method:** Playwright MCP, served via `python3 -m http.server 8765`, PIN skipped via `skipPin()` (offline / Local-only mode). No project files modified.
**Owner report:** "the user interface seems to not work."

## Headline verdict

**The app IS usable offline.** It loads past the PIN screen, renders a fully-styled dashboard, and 6 of the 7 sidebar pages work perfectly. The pharmacokinetic engine produces plausible, input-responsive predictions. There is **one genuine reproducible runtime crash** (Calendar page) and **one functional gap** (two of three modifier toggles do nothing). Neither makes the app globally unusable, but the Calendar crash throws an uncaught exception on every visit and leaves part of that page blank.

---

## Console errors (initial load + full session)

Captured across the entire session (all navigations + 13s recalc-loop dwell):

| Level | Message | Source | Verdict |
|-------|---------|--------|---------|
| ERROR | `Failed to load resource: 404 (File not found)` — favicon.ico | `/favicon.ico` | Harmless. No favicon file; cosmetic only. |
| ERROR | `TypeError: Cannot read properties of undefined (reading 'length')` | `js/stimcalc/graph.js:565:14` (via `drawSleepPerformanceGraph` graph.js:716 → `scNavigate` init.js:1192 → onclick html:4200) | **REAL BUG.** Fires every time the Calendar page is opened. |
| WARNING | `⚠️ BLOCKED: Save attempted before PIN validation` (x2) | `js/stimcalc/firebase-sync.js:1242` | Expected — save-guard correctly blocking writes in offline mode. |
| WARNING | `⚠️ BLOCKED: Save attempted during initial load` | `js/stimcalc/firebase-sync.js:1248` | Expected — save-guard working as designed. |

**No recurring recalc-loop errors.** After sitting on the dashboard for 13 seconds (the `recalculate()` loop runs every ~5s), no new errors or "Calc Error" states appeared. The engine loop is stable.

---

## Bug #1 (REAL, reproducible): Calendar page throws on every open

**Uncaught error each time the Calendar sidebar item is clicked:**
```
TypeError: Cannot read properties of undefined (reading 'length')
    at _drawSleepGraphToCanvas (js/stimcalc/graph.js:565:14)
    at drawSleepPerformanceGraph (js/stimcalc/graph.js:716:5)
    at scNavigate (js/stimcalc/init.js:1192:62)
    at HTMLButtonElement.onclick (stimulant-elimination-calculator.html:4200)
```

**Root cause:**
- `init.js:1192` calls `drawSleepPerformanceGraph()` with **no argument**.
- `graph.js:714` `function drawSleepPerformanceGraph(data)` forwards the (undefined) `data` to `_drawSleepGraphToCanvas('sleepPerformanceGraph', data)`.
- `graph.js:565` executes `if (data.length < 2) return;` — reading `.length` on `undefined` throws.

**Runtime impact:**
1. The **"Sleep Performance" graph** on the Calendar page never draws — it renders as a blank gray box (visible in `smoke-calendar.png`).
2. Because `scNavigate` aborts at line 1192, the **next line `init.js:1193 renderSleepCalendar()` never runs** — anything it would render/refresh is silently skipped.
3. In the real UI (no try/catch), this surfaces as an **uncaught console exception on every Calendar visit**.

**Note:** The rest of the Calendar page (month grid, prediction log, stats & achievements, daily log) DOES render, because `renderSleepCalendarMonth()` and `renderHistory()` (lines 1190–1191) run before the throwing line. So the page is not blank overall — just the Sleep Performance graph, plus the skipped `renderSleepCalendar()` call.

**Fix direction:** `drawSleepPerformanceGraph()` needs the sleep-history data array passed in (the same data the dashboard history renderer uses), or `_drawSleepGraphToCanvas` should guard `if (!data || data.length < 2) return;`. Both would stop the throw; the first also restores the graph.

---

## Bug #2 (REAL, functional): Vitamin C and Sauna modifier toggles have no effect on the prediction

During the functional test (30mg dose @ 08:30, 100mg caffeine @ 14:00, wake 08:00, no modifiers → baseline **11:00 PM** predicted sleep), I toggled each modifier individually and re-read `state.projectedSleepTime`:

| Modifier | Predicted sleep time | Effect |
|----------|---------------------|--------|
| None (baseline) | 11:00 PM | — |
| Vitamin C only (flush @ 18:00) | 11:00 PM | **No change** |
| Vitamin C only (flush @ 20:00) | 11:00 PM | **No change** |
| Sauna only (@ 18:00) | 11:00 PM | **No change** |
| Heavy Lift only | 5:53 PM | −5h (large change) |

- **Vitamin C toggle** (the specific chip the task asked about) does **not** change the projected sleep time at any tested flush time. This is likely the most visible "UI doesn't work" symptom from a user's perspective: toggling the chip appears to do nothing.
- **Sauna toggle** likewise produces no change.
- **Heavy Lift** is the only modifier that moves the needle — and it moves it a lot (5 hours earlier), landing at exactly 5:53 PM. That 5:53 PM figure was also the result when all three modifiers were stale-active on first load, confirming Heavy Lift alone accounts for the entire combined effect (VitC + Sauna contribute nothing).
- The magnitude/pharmacology of Heavy Lift's effect (whether −5h is realistic) is out of scope for this smoke test — flagging for the science audit.

**Caveat:** I only measured `state.projectedSleepTime`. It's possible VitC/Sauna influence other displayed values (concentration curve shading, what-if panel) but not the headline sleep-time projection. Even so, from the user's point of view the primary output does not respond to two of three chips.

---

## Per-page results (7 sidebar pages)

| Page | scNavigate key | Renders? | Notes |
|------|---------------|----------|-------|
| Dashboard | `dashboard` | ✅ Fully | 5-stat row, projected-sleep hero, med/caffeine cards, drug-concentration graph, sleep-intelligence, inventory, week-at-a-glance, modifiers, sleep-history graph — all render and are well-styled. |
| Modifiers | `modifiers` | ✅ Fully | Nicotine tracking, workout planner, what-if scenarios, circadian & feelings. `smoke-modifiers.png` |
| Inventory | `inventory` | ✅ Fully | Take Daily Dose, two med cards with pill counts / refill dates / adjust buttons. `smoke-inventory.png` |
| Calendar | `calendar` | ⚠️ Partial | Month grid + prediction log + stats render; **Sleep Performance graph blank** and throws (Bug #1). `smoke-calendar.png` |
| Insights | `insights` | ✅ Fully | Key Metrics expanded + 14 collapsible analytic sections. `smoke-insights.png` |
| Accuracy | `accuracy` | ✅ Fully | ±236 min headline + 6 accordion sections. `smoke-accuracy.png` |
| Tools | `settings` | ✅ Fully | Forecast Logic panel + Data Management. `smoke-tools.png` |

**Important test-methodology note:** The sidebar "Tools" item calls `scNavigate('settings')` and its page element is `scPageSettings` (there is no `scPageTools`). My first attempt navigated to the non-existent key `'tools'`, which produced a blank page — that was a **test artifact, not a bug**. Navigating with the real key `'settings'` renders the Tools page correctly.

---

## Functional test (Dashboard engine)

Inputs applied via the real functions (`addMedEntry`, `addCaffeine`, wake-time set), stale April-2026 data cleared first:
- Wake 08:00, hours slept 12.
- Medication: 30mg @ 08:30 (today).
- Caffeine: 100mg Coffee @ 14:00 (today).

Results:
- **Predicted sleep time renders and is plausible:** 11:00 PM (with no modifiers), 9h 13m remaining. Physiologically sensible for a single morning 30mg XR dose.
- **5-stat metrics row renders** with live values: SLEEP AT 11:00 PM · REMAINING 9h 13m · AMP LOAD 24.6 · CAFF LOAD 0.0 · QUALITY Good.
- **Drug Concentration graph renders** a proper curve: amphetamine (orange) + caffeine (blue) traces, NOW marker, 17mg threshold line, Forbidden Zone + Sleep Gate shading.
- **Sleep History graph renders** a full multi-month time-series with color-coded points.
- **Prediction responds to inputs** (dose/caffeine/wake all change the output; Heavy Lift modifier changes it). See Bug #2 for the VitC/Sauna exception.

See `smoke-dashboard-functional.png`.

---

## Mobile check (390 × 844)

- **Sidebar collapses to a hamburger drawer** (top-left ☰ → `scToggleSidebar()`). Drawer opens with a scrim and the full nav list (Dashboard…Body Comp) + Sync/Checkpoint/Restore/Export footer. Works cleanly. `smoke-mobile-drawer.png`
- **Dashboard remains usable** — content reflows to a single stacked column. `smoke-mobile.png`
- **Minor responsive issue:** several elements clip on the right edge at 390px — the "Projected Sleep Window" hero card text ("Bottleneck: Wake Ma…", "Projected Sleep Dur…"), the medication date `<input>` (a full-width black bar overflowing the container), and the drug-concentration graph extend past the viewport. Cosmetic; does not block use.

---

## Observations (not bugs)

- On first load the app showed **stale test data from a prior session** in this browser profile (medications/caffeine dated 2026-04-05, three modifiers active). This produced the confusing first-load state where "SLEEP AT" equaled the current time (drug from April had fully eliminated → AMP LOAD 0.0) and a "DOSE STACKING DETECTED" warning. Not a code defect — just leftover localStorage.
- `resetDay()` opens a confirmation modal ("Save today's prediction… then clear…") rather than clearing immediately — correct/intended behavior.
- `toggleModifier(name)` (as opposed to the correct `toggleModifierChip('vitaminC')`) is lenient and will create a junk `state.modifiers['undefined'] = {}` key if called with an unmapped name. Minor robustness nit surfaced during testing; not the reported issue.

## Screenshot inventory
`smoke-dashboard.png` (first load, stale data), `smoke-dashboard-functional.png` (clean functional test), `smoke-modifiers.png`, `smoke-inventory.png`, `smoke-calendar.png`, `smoke-insights.png`, `smoke-accuracy.png`, `smoke-tools.png`, `smoke-mobile.png`, `smoke-mobile-drawer.png` — all in this directory.
