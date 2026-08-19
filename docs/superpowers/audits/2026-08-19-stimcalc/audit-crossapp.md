# Stim Calc Cross-App Integration Audit — week-glance.js + med-inventory.js

**Date:** 2026-08-19
**Scope:** `js/stimcalc/week-glance.js` (417 lines) and `js/stimcalc/med-inventory.js` (1000 lines)
**Method:** Full read of both modules, then verified every cross-app path/shape against the *current* owning app (graduation-roadmap, index.html/dental-quest, body-comp-tracker).
**Nature:** READ-ONLY audit. No files modified except this report.

---

## TL;DR verdicts

| Integration | Direction | Verdict | Recommendation |
|---|---|---|---|
| 1. Week at a Glance / Upcoming Deadlines | stim calc **reads** graduationRoadmap | **WORKS** | Keep (or optional amputate — peripheral to core) |
| 2. Medication Inventory | stim calc **reads + WRITES** index.html `appData` | **DANGEROUS** | Amputate the write-back, or make read-only |
| 3. Body Comp ecosystem pull | body-comp **reads** stim calc `state` | **WORKS** | Keep — no action |

---

## Integration 1 — Week at a Glance + Upcoming Deadlines (week-glance.js)

### What it does
`scWeekGlanceLoadFromFirebase()` attaches **realtime `.on('value')` listeners** (week-glance.js:47) to 8 sub-paths under the roadmap namespace and re-renders a read-only "This Week" schedule + "Upcoming Deadlines" card. It never writes.

### Path check — CORRECT (not the dead namespace)
- week-glance.js:31 — `base = 'users/' + hashedPin + '/graduationRoadmap/'`. This is the **live** path. The `d3Roadmap` namespace is dead, and week-glance does **not** use it (the line-30 comment claims a "fall back to old path" but there is no such fallback in code — cosmetic/stale comment only).
- Roadmap writes to `graduationRoadmap` too: `firebase-sync.js:1244 userPath = 'users/' + hashedPin + '/' + FIREBASE_APP_NAME` (FIREBASE_APP_NAME = `graduationRoadmap`). **Both sides agree.**

### Field-by-field verification (read side vs. write side)

| Path read (week-glance.js) | Written by roadmap? | Evidence (write side) | Status |
|---|---|---|---|
| `monthlyPlanner/currentWeekSchedule` (line 43) | YES | `firebase-sync.js:232,242` save payload; built by `buildCurrentWeekSchedule()` `monthly-planner.js:1605-1710`. Comment line 191: *"Build currentWeekSchedule for cross-app consumption (Stim Calc)"* | WORKS |
| `monthlyPlanner/customTasks` (line 36) | YES | `firebase-sync.js:228,238` | WORKS |
| `monthlyPlanner/completedTasks` (line 37) | YES | `firebase-sync.js:230,240` | WORKS |
| `clinicalData/appointments` (line 38) | YES | `firebase-sync.js:259,262,669` | WORKS |
| `customDeadlines` (line 41) | YES | `firebase-sync.js:217,220` | WORKS |
| `completedDeadlines` (line 42) | YES | `firebase-sync.js:206,210` | WORKS |
| `upcomingDeadlines` (line 42→line 161 render) | YES | `deadlines.js:22`, `init.js:1839`. `deadlines.js:4` comment: *"Lightweight rebuild of roadmapData.upcomingDeadlines for Stim Calc visibility"* | WORKS |
| `editedDeadlines` (line 39) | YES but effectively empty now | `firebase-sync.js:205,209` still writes it, but D4 overhaul emptied `STATIC_DEADLINES`, so there are no static deadlines to "edit" → node is legacy/empty | WORKS (dead-ish input) |

### Item-shape verification
- `currentWeekSchedule` items are `{ id, date, time, item, type, notes, source, ... }` (`monthly-planner.js:1631-1704`). week-glance reads exactly `t.date / t.time / t.item / t.type` (week-glance.js:204-214). **Shapes match.**
- Fallback path reads `appointments` as `{ date, time, procedures, status, id }` (week-glance.js:227-235); roadmap appointment records carry those fields. **Matches.**
- `customDeadlines` read as `{ date, what, course, type, weight, id, done }` (week-glance.js:124-137) — consistent with roadmap deadline records.

### Post-D4 behavioral notes (not bugs)
- `MP_STATIC_TASKS = []` (`monthly-planner.js:136`). The "static tasks" branch of `buildCurrentWeekSchedule` is now a no-op, so `currentWeekSchedule` is composed purely of custom tasks + clinical appointments. week-glance still receives a fully-populated schedule. **No functional impact.**
- Stale comments in week-glance.js: line 2 ("cross-app from D3 Roadmap"), line 160 ("synced from d3-roadmap initUI"), line 196 ("pre-built by d3-roadmap"), line 30 (nonexistent d3Roadmap fallback). Misleading but harmless.

### [INFO] Realtime, read-only = safe
Unlike med-inventory, week-glance uses live listeners and never writes → no staleness, no corruption vector. This is the correct cross-app read pattern.

### Verdict: **WORKS**
The roadmap team deliberately maintains `currentWeekSchedule` and `upcomingDeadlines` specifically for the stim calc (two in-code comments prove intent). Every path is live and every shape matches.

### Recommendation
**Keep** — it is functional and safe. It is, however, *peripheral* to the app's core sleep-prediction purpose. For a strict back-to-basics cut it is an **optional amputate** (removing it reduces cross-app coupling and ~417 lines), but there is no correctness reason to remove it. Low priority either way.

---

## Integration 2 — Medication Inventory (med-inventory.js)  ⚠ DANGEROUS

### What it does
Reads **and writes** three sub-nodes of **index.html's** namespace (`appData`), shared with the main Dental Quest app:
- `appData/medications` (med-inventory.js:26, read 31, write 88)
- `appData/pillAssignments` (line 27, read 51, write 93)
- `appData/calendarNotes` (line 28, read 64, write 98)

Writes fire from `scInvSaveMedInventory()` on every take-dose / adjust / settings-save / note-save / pill-assignment-toggle / daily-auto-reduce (called at lines 288, 313, 330, 380, 422, 677, 736, 786, 795).

### Schema check — MATCHES (this is the good news)
- index.html `medications['30mg'|'20mg']` = `{ pills, refillDate, dosesLogged, lastAutoReduceDate, lastManualChange, lastManualChangeType }` (`js/dental-quest/state.js:167-184`).
- stim calc `scInvMedications` = `{ pills, refillDate, lastAutoReduceDate, dosesLogged, lastManualChange, lastManualChangeType }` (`js/stimcalc/state.js:27-29`). **Same 6 fields.**
- Load merges non-destructively: `Object.assign({}, scInvMedications[key], data[key])` (med-inventory.js:36) preserves every remote field. So a round-trip `read → set` does **not** drop fields. `pillAssignments` (`{'30mg':{}, '20mg':{}}`) and `calendarNotes` (`{date: text}`) shapes also match index.html (`state.js:186-189`).
- `scInvRenderDashboard` reads `med.dailyDose ?? 1` and `med.label ?? ...` (med-inventory.js:826-827) — neither field exists in either schema, but both have `??` fallbacks and are never persisted. Harmless.

So the write **shape** is safe. The danger is **staleness + full-node overwrite**, not schema drift.

### [HIGH / DANGEROUS] Stale-snapshot clobber of the main app's medication data
- med-inventory loads via **one-time `.once('value')`** reads (med-inventory.js:31, 51, 64) — it takes a snapshot at stim-calc init and never refreshes.
- index.html saves the **entire** `appData` node via `.set()` (`js/dental-quest/firebase-sync.js:357, 480, 1747, 1929, 1961`) and runs a **realtime listener** on `appData` (`firebase-sync.js:1858`).
- Failure sequence:
  1. Stim calc opens, snapshots `medications` (e.g. 30mg pills = 12).
  2. In the main app the user takes pills / edits refill date → main app now has pills = 9.
  3. Back in the stim calc (stale in memory), the user taps "Take Daily Dose" → `scInvTakeMed`/`scInvSaveMedInventory` writes `.set(appData/medications, scInvMedications)` with the **stale** base (11, not 8).
  4. index.html's realtime listener immediately ingests the stale value → **main-app pill count silently regresses.** `dosesLogged` and `refillDate` edits made in the main app after step 1 are also overwritten.
- Because the writes target the `medications`, `pillAssignments`, and `calendarNotes` sub-nodes specifically (not the whole `appData`), tasks/financials/etc. are safe — but those **three shared sub-trees are corruptible** by the stale stim-calc snapshot. This is the concrete cross-app-write hazard.

### [MEDIUM] Double daily auto-reduce
Both apps independently auto-decrement pills once per day (`scInvCheckAndApplyDailyPillReduce` med-inventory.js:341; index.html has its own equivalent). They coordinate through the shared `lastAutoReduceDate`, but because the stim calc reads it only once (stale snapshot), it can auto-reduce against an out-of-date `lastAutoReduceDate` and write back, double-counting a day's decrement across the two apps.

### [MEDIUM] calendarNotes full-node overwrite
`scInvSaveMedInventory` does `.set(appData/calendarNotes, scInvCalendarNotes)` (med-inventory.js:98) — a whole-node replace with the stim calc's (possibly stale) copy. A note the user adds in the main app after stim-calc init is wiped on the stim calc's next save. Same root cause (stale once() + full-node set).

### Verdict: **DANGEROUS**
In single-app / same-session use it appears to work (schema matches). Under realistic concurrent or even sequential multi-app use it silently corrupts the main app's medication/pill/notes data via stale-snapshot last-writer-wins.

### Recommendation — **AMPUTATE the write-back (highest-value change)**
The stim calc's core job is pharmacokinetic sleep prediction. The medication *inventory* (pill counting, refill calendar, pill-day assignments, calendar notes) is a **duplicate of the identical feature already in index.html** and is the single largest cross-app write liability in the module.
- **Preferred:** remove `scInvSaveMedInventory()` writes entirely and render the inventory **read-only** (display main-app pill counts / refill status without writing). This kills all three hazards and keeps the useful at-a-glance display.
- **If write-back must stay:** convert the three `.once('value')` reads to realtime `.on('value')` listeners (eliminates staleness) **and** replace whole-node `.set()` with targeted field updates (`update()` on specific keys) so a stale in-memory copy can't clobber unrelated fields.
- Either way, do **not** leave the current once()+`.set()` pattern — it is the corruption source.

---

## Integration 3 — Body Comp ecosystem pull (reads stim calc `state`)

### What it does
body-comp-tracker.html reads the stim calc's state **read-only** to compute sleep debt and pull "medications taken today" / caffeine:
- `database.ref(basePath + '/stimulantCalculator/state')` at body-comp-tracker.html:11082, 18483, 18659.

### Path + write verification
- Stim calc writes `database.ref(userPath).set({ state: state, ... })` where `userPath = 'users/'+hashedPin+'/stimulantCalculator'` (`js/stimcalc/firebase-sync.js:271, 378-379, 1017-1018, 1188-1189`). So the node body-comp reads (`stimulantCalculator/state`) **is** the node stim calc writes. **Matches.**

### Field verification
- `state.sleepHistory` — object keyed by date, entries carry `hoursSlept` (used by `graph.js:456-518`; body-comp reads `stimData.sleepHistory[date].hoursSlept` at ~11095). **Produced.** ✓
- `state.medications` — dose-event collection; each entry stamped with `.date` (`med-caffeine.js:42,78`). Stored as an **object** post-migration (`firebase-sync.js:144 migrateArrayToObject(...,'med')`). body-comp reads via `ensureArray(stimData.medications, [])` which does `Object.values()` (body-comp-tracker.html:8509-8516) then `.filter(m => m.date === today)`. Object shape is handled correctly. ✓
- `state.caffeine` — same object-migration treatment (`firebase-sync.js:145`), also consumed via `ensureArray`. ✓

### Verdict: **WORKS**
Read-only from body-comp's side → it **cannot** corrupt the stim calc. The stim calc still writes every field body-comp depends on, at the path body-comp reads. The array→object migration is transparently absorbed by body-comp's `ensureArray`.

### Recommendation
**Keep — no action.** It's cheap (read-only), correct, and independent of the stim calc's internals. This is the model the other two integrations should follow (read-only, tolerant of shape).

---

## Priority actions (back-to-basics lens)

1. **[HIGH] Neutralize med-inventory write-back** — amputate to read-only, or fix (realtime listener + targeted `update()`). This is the only integration that can corrupt another app's data.
2. **[INFO] week-glance** — leave as-is functionally; optionally cut for simplicity. Clean up the stale "d3-roadmap" comments if touched.
3. **[NONE] body-comp read** — no change needed.

## Core-purpose framing
The app's essential function is sleep prediction (pharma-engine, circadian, sleep-prediction modules). Of the three integrations, **only body-comp's read is intrinsic to the ecosystem and safe.** Week-glance is a convenience dashboard, and the medication inventory is a risky duplicate of an index.html feature. A back-to-basics cut would keep body-comp's read, keep or drop week-glance, and **strip or read-only-ify the medication inventory write path.**
