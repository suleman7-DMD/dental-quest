# Sully OS — Unified Text-Parse Command System — Design Spec

**Date:** 2026-08-20
**Branch:** `stimcalc-revival` (the revival merge engine is a hard dependency of the stim calc importer)
**Status:** Approved vision (user: "yes this is perfect"), autonomous build authorized.
**Constraint (locked):** Copy-paste only. No API calls, no background automation. Pipeline: talk to Claude webchat → copy fenced block → paste into app.

---

## 1. What this is

One Claude webchat project ("Sully OS") receives free-speak briefs about the whole day — sleep, doses, caffeine, meals, workouts, weigh-ins, patients, appointments, todos — and emits ONE fenced text block. The user pastes it into a Command Center input in ANY of the three apps (body comp tracker, stim elim calculator, grad roadmap). Blocks for the local app apply through that app's own CRUD paths; blocks for the other apps travel through a Firebase relay mailbox and are applied by the target app through its own guard pipeline. Full CRUD via paste: add, edit, move/reschedule, delete — every verb writes the same stamps and tombstones as a manual button press, so pasted data is indistinguishable from manual entry on every device.

The index.html dental quest app is explicitly OUT of scope.

## 2. Universal grammar (SULLYOS-1)

### Envelope
- Webchat emits ONE triple-backtick fenced block per reply.
- Optional first line: `SYNTAX: SULLYOS-1`. Apps ignore it if absent (backward compat with existing clinical pastes); unknown versions produce a preview warning, never a hard failure.
- Blocks are separated by `---` alone on a line (`/^---\s*$/m`) — identical to the existing clinical convention.
- Blocks from different apps mix freely in one paste.

### Routing (deterministic, no new syntax)
Each block is classified by its header line / line shape:
- **Body comp:** any line matching `^(MEAL|WORKOUT|WEIGHIN|FOOD|MEAL_EDIT|MEAL_DELETE|WORKOUT_EDIT|WORKOUT_DELETE|WEIGHIN_EDIT|WEIGHIN_DELETE)\|` — pipe immediately after keyword.
- **Stim calc:** block header `STIM_DAY`.
- **Roadmap:** existing headers `PATIENT_RECORD`, `PATIENT_UPDATE`, `REQUIREMENTS_MATCH`, `SPS_DASHBOARD_UPDATE`, `APPOINTMENTS`, `MISSING_NOTES`, `TODO_LIST` plus new verb headers `APPOINTMENT_MOVE`, `APPOINTMENT_DELETE`, `TODO_DONE`, `TODO_DELETE`, `NOTE_CLEARED`, `PROCEDURE_DELETE`, `PATIENT_ARCHIVE`, `PATIENT_DELETE`.
- `WORKOUT|` (pipe, standalone line) is body comp; `WORKOUT:` (colon, inside a STIM_DAY block) is a stim field. No collision.
- Optional cosmetic banners `@BODYCOMP` / `@STIMCALC` / `@ROADMAP` are accepted and skipped by parsers.
- Unrecognized blocks are listed in the preview as "unrecognized," never applied, never crash.

### Verb doctrine
- **ADD is the default** — every existing format survives byte-identical.
- **EDIT / MOVE / DELETE** use human match keys (Claude webchat cannot see DB ids): date + name/type + time. Ambiguous match (≥2 candidates, no disambiguator) → loud reject with reason, never guess.
- Every DELETE writes the app's real tombstone map. Every EDIT/MOVE bumps the record's real stamp (`updatedAt`/`lastUpdated`). This is what makes pasted mutations survive cross-device merge.

### Date & time doctrine (Eastern Time)
- The webchat instructions REQUIRE all relative language ("today", "yesterday", "last night") to be resolved to explicit `YYYY-MM-DD` **in America/New_York (ET)** at generation time. A brief written 11:58 PM pastes safely at 12:01 AM.
- **A night is keyed by its wake date.** "Fell asleep 12:40, woke 6:45" and "fell asleep 11:30 PM, woke 6:45" both key to the wake date; evening clock times are understood as the previous calendar evening.
- Times: grammar accepts both `HH:MM` 24-hour and `H:MM AM/PM` 12-hour. Parsers normalize to the app's existing canonical storage format (24h `HH:MM` strings — storage format is NOT changed anywhere; persistence logic stays untouched).
- Body comp display fix: a `formatTime12()` helper renders times as 12-hour AM/PM on user-facing surfaces (log lists, import preview). Display-only; stored values unchanged.
- In-app date parsing always uses the split-and-construct pattern (`split('-').map(Number)` → `new Date(y, m-1, d)`) — never `new Date('YYYY-MM-DD')` (EST off-by-one, per CLAUDE.md).

### Idempotence doctrine
- Re-pasting any block is safe everywhere.
- Upsert-keyed types (STIM_DAY sleep fields, doses by date+time, weigh-in edits by date) overwrite themselves — re-paste is a no-op.
- Add-keyed types (meals, workouts, appointments, todos, missing notes) auto-skip EXACT duplicates with an "already logged" receipt. Partial matches (same key, different payload) keep existing advisory behavior (body comp confirm dialog / roadmap merge semantics).
- Corrections are verbs, never re-adds.

### Failure doctrine
- Parse/validate happens BEFORE any state mutation. On parse failure: preview shows inline error; confirm paths toast "nothing was changed" and return before dirty flags are set (the roadmap's existing guard pattern becomes the standard in all three apps).
- Valid blocks apply, invalid blocks reject loudly with per-line reasons. Nothing silent.
- All pasted text rendered in previews/receipts goes through `escapeHtml()`.

---

## 3. Dialect 1 — Stim calc (NEW importer; the must-add)

### Ground truth (explorer-verified)
No text import exists. State (js/stimcalc/state.js `getDefaultState()`): `medications{}` (`{id, dose, time, date, updatedAt}`, id `med_<ts>_<rand>`), `caffeine{}` (`{id, amount, name, time, date, updatedAt}`), `modifiers` (`vitaminC{active,time,date}`, `workout{active,endTime,intense,date}`), `sleepHistory{}` date-keyed `{hoursSlept, wakeTime, updatedAt}`, `sleepDailyLogs{}` date-keyed (`lastUpdated` stamp), `tombstones{meds, caffeine, sleepDays}`, `settings.vitcHighDose`, `allNighterMode`. Manual paths: `addMedEntry`/`updateMedEntry`/`removeMedEntry` (med-caffeine.js), `addCaffeine`, `confirmMorningCheckin` (calibration.js) → `autoPopulateFeedback → runAutoCalibration → recalculate → saveState`. Merge engine (firebase-sync.js): `mergeCollection` strictly-newer-wins via `getRecStamp`, tombstone purge only if strictly newer, 6 scalar stamp groups via `getStampGroups`. Caffeine presets: Coffee 100 / Celsius 160 / Starbucks 225 / Espresso 63 / Tea 47 mg. **No planned-bedtime field exists** — PLAN_SLEEP is a new capability.

### Block format
```
STIM_DAY
DATE: 2026-08-20
WOKE: 06:45
FELL_ASLEEP: 00:40        ← or SLEPT: 6.1 hours; if both, SLEPT wins
DOSE: 30 @ 07:15
DOSE: 20 @ 12:30
CAFFEINE: 160 | Celsius | 10:15
CAFFEINE: 100 | Coffee | 15:05
WORKOUT: 18:30 | intense
VITC: 21:00 | high
ALL_NIGHTER: no
PLAN_SLEEP: 23:00
DOSE_MOVE: 12:30 -> 13:15
DOSE_DELETE: 07:15
CAFF_MOVE: 15:05 -> 16:00
CAFF_DELETE: 10:15
SLEEP_DELETE: 2026-08-18
```
All lines optional except `DATE:` is strongly expected (missing DATE → today with a preview notice). Multiple STIM_DAY blocks (separated by `---`) backfill multiple days.

### Semantics
- **Sleep lines** run the morning-check-in write path: `sleepHistory[date]` (`hoursSlept`, `wakeTime`, `updatedAt`) + `sleepDailyLogs[date]` (mirroring what `confirmMorningCheckin` writes, `lastUpdated` stamped). If date === today, also update the live check-in fields exactly as `confirmMorningCheckin` does. FELL_ASLEEP + WOKE compute hours (midnight crossing: if fell-asleep time > wake time it belongs to the previous calendar day).
- **DOSE** upserts `state.medications` by (date, time): existing record at same date+time → update dose + `updatedAt`; else create via the same path as `addMedEntry` (new id, stamp). Validation: 0 < dose ≤ 200.
- **CAFFEINE** upserts `state.caffeine` by (date, time). Validation: 0 < amount ≤ 1000. Name free text (presets are a webchat-side mg lookup, not an app-side whitelist).
- **DOSE_MOVE / CAFF_MOVE** `HH:MM -> HH:MM`: find by (date, oldTime); not found or ambiguous → reject line. Retime + stamp.
- **DOSE_DELETE / CAFF_DELETE**: find by (date, time) → tombstone (`tombstones.meds[id]` / `tombstones.caffeine[id]` = now) BEFORE removal, exactly like `removeMedEntry`.
- **SLEEP_DELETE: YYYY-MM-DD**: tombstone `tombstones.sleepDays[date]` + remove `sleepHistory[date]` / `sleepDailyLogs[date]`.
- **WORKOUT / VITC**: date === today → set `modifiers.workout {active:true, endTime, intense, date}` / `modifiers.vitaminC {active:true, time, date}` (same shape the toggles write). `high` flag → `settings.vitcHighDose = true` (settings scalar group stamp). Past dates → annotate `sleepDailyLogs[date]` (accuracy context) without touching live modifiers.
- **ALL_NIGHTER: yes** → only honored when date === today; routes through the same state change as `toggleAllNighterMode`.
- **PLAN_SLEEP: HH:MM** → NEW field `sleepDailyLogs[date].plannedBedtime` (rides the existing date-keyed record + `lastUpdated` stamp — no new collection, no new merge site needed). Dashboard: planned-vs-predicted delta line in the sleep prediction card. Accuracy tab: planned vs predicted vs actual where data exists.

### Apply pipeline
`js/stimcalc/importer.js` (new module):
1. **Pure parse layer** `scParseImportText(text) → {days: [...], errors: [...]}` — no DOM, no state; Node-testable.
2. **Validate layer** — resolves ops against current state (upsert vs create, verb target resolution, ambiguity checks) → op list with per-op status.
3. **Preview** — card on the dashboard (textarea + Preview + Apply), color-coded ops (ADD green / EDIT amber / DELETE red), rejects with reasons.
4. **Apply** — executes ops through the same mutations the manual UI performs, then ONE batched refresh: `renderMedEntries()`, `renderCaffeineEntries()`, `renderFocusCaffeineList()`, and if sleep touched `autoPopulateFeedback()` + `runAutoCalibration()`, then `recalculate()` + `saveState()`. All render/engine calls guarded with `typeof fn === 'function'`.

### Sync-safety checklist (per revival engine)
- All records stamped (`updatedAt` / `lastUpdated`). Tombstones written before deletes. `plannedBedtime` lives inside already-merged `sleepDailyLogs` records. No new collections → no new merge sites, no `isEmptyState()` change (importer only creates data via existing collections which are already covered). Retention caps already apply. Script tag added to HTML with cache-bust `?v=`.

---

## 4. Dialect 2 — Body comp (existing grammar grows verbs)

### Ground truth (explorer-verified)
`body-comp-tracker.html` (~24.9k lines). Canonical parser `parseImportLine` (~16992); apply `confirmImportData` (~17130) is pure add-only append; dedup advisory-only via `confirmImportDuplicates` (~14183). Existing grammar: `MEAL|Name|Cal|Protein|Carbs|Fat|Time|Date` (name+cal required), `WORKOUT|Type|Duration|Cal|Time|Date` (type in 8-whitelist), `WEIGHIN|Weight|BodyFat|Date` (100–400). Trailing date optional, future rejected, backfill via `recalcDateAndDependents` (~10278). Records stamped `updatedAt` (`getRecStamp` ~8706); tombstones `deletedMealIds`/`deletedWorkoutIds`/`deletedWeighInIds` keyed `` `${dateStr}::${id}` `` via `addTombstone` (~8695); `deletedFrequentFoodIds` (~8565). Food library `state.frequentFoods` (`{id,name,calories,protein,carbs,fat,uses,updatedAt}`), `saveFrequentFood()` (~17766) dedupes by name.toLowerCase — NO paste format reaches it today.

### New blocks
- **`FOOD|Name|Cal|Protein|Carbs|Fat`** → upsert `frequentFoods` by `name.toLowerCase()` (same dedupe rule as `saveFrequentFood`), stamp `updatedAt`. New entries get fresh ids (a previously tombstoned id never resurrects; same-name re-add is a new id — allowed and correct).
- **Edit verbs** (`key=value` tail, any subset):
  - `MEAL_EDIT|<Name>|<Date>|cal=520|protein=45|carbs=60|fat=18|time=12:30|name=New Name`
  - `WORKOUT_EDIT|<Type>|<Date>|duration=50|cal=300|time=17:30|type=Run`
  - `WEIGHIN_EDIT|<Date>|weight=189.4|bf=26.8`
- **Delete verbs** (optional third field disambiguates):
  - `MEAL_DELETE|<Name>|<Date>[|<Cal>]`
  - `WORKOUT_DELETE|<Type>|<Date>[|<Duration>]`
  - `WEIGHIN_DELETE|<Date>[|<Weight>]`
- Match keys mirror the app's own duplicate predicates: meal = date + name.lower (+cal), workout = date + type.lower (+duration), weighin = date (+weight). Ambiguity → loud reject listing candidates.
- Deletes route through the app's real delete paths (tombstone via `addTombstone` with the container-scoped `date::id` key, then removal, then recalc). Edits stamp `updatedAt` and, for past dates, trigger `recalcDateAndDependents(date)`.

### Idempotence upgrade
In the import path: an ADD line whose EXACT payload (all fields equal after normalization) already exists → auto-skip, counted in the receipt as "already logged." Same-key-different-payload keeps the existing advisory confirm. Quick-paste surfaces (`parseQuickMealPaste`, `parseWorkoutInput`) keep their current behavior except they gain the same exact-dup auto-skip.

### 12-hour display
`formatTime12('17:30') → '5:30 PM'` helper; applied to meal/workout time rendering in the daily log lists and import previews. Times PARSE from either format; STORE unchanged (24h `HH:MM`).

---

## 5. Dialect 3 — Grad roadmap (importer learns destructive verbs)

### Ground truth (explorer-verified)
Pipeline: `parsePatientImportText` (patients.js ~1575) → `previewPatientImport` (~2058) → `confirmUnifiedImport` (~2235); block split `/^---\s*$/m`; parse guarded in try/catch with "nothing was changed" before `clinicalDataDirty`. Appointment dedup key: (patientId||name)+date+time. Reusable machinery: `cascadeDeleteAppointment` (state.js ~1685), `cascadeDeletePatient` (~1743), `toggleMissingNoteStatus` (~1872), `toggleTodoStatus` (~1994); tombstone maps `deletedAppointmentIds`/`deletedProcedureIds`/`deletedPatientRecordIds`/`deletedTodoIds`; `propagateClinicalChanges` (~1636) does NOT save — caller persists.

### New verb blocks
```
APPOINTMENT_MOVE
CHART: 12345            (or PATIENT: Name)
FROM: 2026-08-21 09:00
TO: 2026-08-22 13:00
PROCEDURE: Crown prep    (optional override)
```
- Find by (chart-normalized patientId OR name-lower) + FROM date + FROM time (time compared normalized — accepts 12h or 24h in paste, matches against stored format). Not found / ambiguous → reject with reason. Apply: mutate `date`/`time` (+ optional procedure) in place, stamp `lastUpdated` (STAMP_APPT), record `userEdited` where applicable. **This kills the reschedule-duplicates-forever bug.**

```
APPOINTMENT_DELETE
CHART: 12345
DATE: 2026-08-21
TIME: 09:00
```
→ `cascadeDeleteAppointment(id, { skipPropagation: true })` (tombstones + planner cleanup + procedure unlink all inherited).

- **`TODO_DONE`** / **`TODO_DELETE`**: `ID: todo-0042-20260820` or `MATCH: <description substring>` (unique-match required). DONE → `toggleTodoStatus` path; DELETE → `deletedTodoIds` tombstone + removal.
- **`NOTE_CLEARED`**: `ID: note-<chart>-<date>` or `CHART:` + `DATE:` → `toggleMissingNoteStatus` completion path.
- **`PROCEDURE_DELETE`**: `CHART:` + `DATE:` + `PROCEDURE: <text match>` → remove from `completedProcedures` + `deletedProcedureIds` tombstone.
- **`PATIENT_ARCHIVE`**: `CHART:` + `ARCHIVED: yes|no` → set `archived` + `archivedAt = new Date().toISOString()` (newer-wins field per merge rules).
- **`PATIENT_DELETE`**: `CHART:` + `CONFIRM_NAME: <name>` — grammar-level safety: name must match the record. Preview renders a red destructive card with an **unchecked-by-default** checkbox (CLAUDE.md rule); unchecked at confirm → skipped. Applies via `cascadeDeletePatient`.

### Constitutional lines
- Competency counts remain MANUAL-ONLY. No verb block touches counts, notes, or `lastVerified`.
- Every applying batch: `createCheckpoint('pre-paste-verbs')` first, `clinicalDataDirty = true` BEFORE mutations, cascades called with `skipPropagation`, ONE `propagateClinicalChanges` + persist at the end. Existing 7 block types byte-identical.

---

## 6. Command Center (router + relay)

### Router
A shared function per app — `sullyRouteBlocks(rawText) → { local: [...blocks], foreign: { bodyComp: [...], stimCalc: [...], roadmap: [...] }, unknown: [...] }` — splits on `---`, strips `SYNTAX:` header and `@APP` banners, classifies by header/line-shape (section 2). It wraps each app's existing paste surface:
- **Roadmap:** the existing unified import box (Patients tab) becomes the Command Center — local blocks flow into `parsePatientImportText` unchanged; foreign blocks show in the routing preview and relay on confirm.
- **Body comp:** the Import tab paste box gains the router the same way.
- **Stim calc:** the new importer card includes the router from day one.
- Preview shows a routing table: "3 blocks → here · 1 → Stim Calc · 2 → Body Comp", plus unknown blocks in red.

### Relay mailbox (Firebase)
- Path: `users/user_<hashedPin>/commandRelay/<targetApp>/<msgId>` where targetApp ∈ `bodyComp | stimCalc | roadmap`; msgId = `relay_<ts>_<rand>`.
- Node shape: `{ text, from, createdAt, appliedAt: null, receipt: null }` — raw block text, never records. Single consumer. This is a mailbox, not shared state: no app ever writes another app's state path (CLAUDE.md namespace rule respected).
- **Send:** on confirm in the origin app, foreign blocks are written to the mailbox (one node per target app per paste). Requires `pinValidated` + Firebase ready; offline → toast "relay requires connection; those blocks were not sent" (local blocks still apply).
- **Drain:** target app checks its mailbox (a) after its Firebase load completes (all sync flags set — never before), (b) on `visibilitychange` → visible, (c) via a realtime `child_added` listener. For each unapplied node: parse → validate → non-destructive ops auto-apply through the normal pipeline → destructive ops open the app's confirm UI. Then set `appliedAt` + `receipt` (summary counts) on the node.
- **Receipts:** origin app renders relay nodes it sent with applied/pending status ("landed in Stim Calc ✓"). Applied nodes older than 14 days are deleted during drain.
- **Undo:** every applying paste batch creates a checkpoint first (all three apps have the checkpoint system) — restore = batch undo.

---

## 7. Sully OS master webchat instructions

One doc: `docs/sully-os-master-instructions.md` — the single source of truth, uploaded to a NEW Claude webchat project ("Sully OS"). A "Copy Sully OS instructions" affordance in the Command Center links the served doc (GitHub Pages serves /docs).

- **Module 0 — Router:** intent detection (clinical / nutrition / stim-sleep; one sentence can hit all three), ET date-time doctrine, output contract (one fence, `SYNTAX: SULLYOS-1`, `---` separators, mixed-app blocks), clarify-don't-guess rule for ambiguous matches, bare-image gate ("which system is this for?" unless unambiguous).
- **Module 1 — Clinical:** the existing 1638-line `docs/claude-webchat-project-instructions.md` absorbed intact, with the 7 audited collision fixes: chat-scope ("each chat = one patient") demoted to clinical-context chats; generic triggers (`export`, `status`, `countdown`, `reminder:`, `I need to…`, `check email`, `add:`/`done:`) bound to clinical context; bare-upload auto-extraction gated; SYSTEM todo auto-suggest scoped to clinical analysis. Plus the verb appendix (APPOINTMENT_MOVE etc.).
- **Module 2 — Body comp:** full grammar + verbs, HealthKit workout transcription spec, macro-estimation rules for novel foods, portion multipliers, FOOD-library workflow, 12h/24h time guidance.
- **Module 3 — Stim calc:** STIM_DAY + verbs, wake-date sleep convention, caffeine preset mg table, trigger vocabulary ("woke up at", "taking my 30", "second coffee", "planning to sleep at", "pulled an all-nighter").
- **Brief macros:** "morning brief" / "evening brief" → emit one combined block, no follow-up questions, all dates resolved absolute ET.
- Worked end-to-end examples (free-speak in → exact block out) for single-app and mixed-app briefs.

---

## 8. Testing & proof strategy

1. **Node parser harnesses** (pattern proven by the Task 18 sync replay harness): the stim calc parse layer is a pure function; body comp and roadmap parser extensions are sentinel-extracted or exercised via extracted pure logic. Coverage: upserts, every verb, ambiguity rejection, 12h/24h normalization, midnight crossing, multi-day backfill, idempotent re-paste, malformed input rejected before mutation.
2. **Playwright E2E with a throwaway test PIN.** The PIN hash namespaces Firebase (`user_<btoa(pin)>`), so a test PIN gives a fully isolated namespace — real Firebase, real sync path, ZERO risk to live data. Prove: paste STIM_DAY → entries render + engine recalcs → reload → persists (localStorage + Firebase); body comp verbs edit/delete real records with tombstones; roadmap APPOINTMENT_MOVE replaces (record count unchanged, old slot gone); mixed paste in one app relays to the other two and they apply + receipt.
3. **QA pass (Fable):** full-diff review against CLAUDE.md constitutional rules (save guards, tombstones, stamps, `getValues`, `escapeHtml`, `clinicalDataDirty`, cache-busting), brace/syntax balance on every touched file.

## 9. Explicit non-goals / risk containment
- No storage-format changes anywhere (times stay 24h strings; dates stay `YYYY-MM-DD`; collections stay object-keyed).
- No changes to Firebase config, PIN auth, debounce timing, save guards, `isEmptyState()` semantics, or the merge engines beyond documented additive fields.
- No API-based automation. No new Firebase paths other than `commandRelay`.
- Timezone: apps continue to run on device-local time (device = ET); the ET guarantee is enforced at generation time by the webchat instructions. A global `Date`-interception refactor is deliberately rejected as an unacceptable risk to rigorously debugged date logic.
- index.html app untouched (except nothing — zero edits).
