# Sully OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD via copy-paste across body comp, stim calc, and grad roadmap — one webchat block, one Command Center paste, data lands everywhere exactly as if manually entered, sync-safe.

**Architecture:** Three per-app dialect layers (each split into a pure Node-testable parse layer + an apply layer that reuses the app's real CRUD/stamp/tombstone paths), a shared block router wrapped around each app's paste surface, and a Firebase relay mailbox (`commandRelay`) for cross-app propagation. One master webchat instructions doc drives generation.

**Tech Stack:** Vanilla JS (no build system), Firebase RTDB, Node for parser harnesses, Playwright MCP for E2E with a throwaway PIN namespace.

**Spec:** `docs/superpowers/specs/2026-08-20-sully-os-design.md` — grammar, semantics, and doctrines live there; this plan is the file-level execution map. Where this plan says "verify at ~line N," the implementer MUST read the actual code before editing — signatures in the live tree win over this document.

**Execution mode (user-mandated):** Fable is lead architect/dev/QA. Parallel implementation via `fork` subagents ONLY (forks run on Fable and inherit this context). Tasks 1–3 and 5 are file-disjoint → run in parallel. Task 4 runs after 1–3. Every fork's diff is re-verified by the lead before QA.

---

### Task 1: Stim calc importer (`js/stimcalc/importer.js` + UI)

**Files:**
- Create: `js/stimcalc/importer.js`
- Modify: `stimulant-elimination-calculator.html` (import card near `#scMedsCard` ~line 3455; `<script>` tag block with cache-bust)
- Modify: `js/stimcalc/ui-sections.js` or dashboard render site ONLY if a hook is needed for the planned-vs-predicted delta line (verify render entry points first)
- Test: `tests/sullyos/test-stimcalc-parser.mjs` (Node; loads importer.js pure layer)

**Steps:**
- [ ] Read `js/stimcalc/med-caffeine.js` (addMedEntry :5, updateMedEntry :73, removeMedEntry :59, addCaffeine :216), `js/stimcalc/calibration.js` (confirmMorningCheckin :203), `js/stimcalc/state.js` (getDefaultState :39-100, isEmptyState :103-120), `js/stimcalc/firebase-sync.js` (getRecStamp :120, mergeCollection :142, getStampGroups :190) and confirm exact record shapes, tombstone-write order, and which globals the apply layer may call.
- [ ] Write `importer.js` with two exported layers:
  - **Pure parse** (no DOM/state): `scParseImportText(text)` → `{ days: [{date, woke, fellAsleep, slept, doses:[{dose,time}], caffeine:[{amount,name,time}], workout:{endTime,intense}|null, vitc:{time,high}|null, allNighter:bool|null, planSleep:'HH:MM'|null, verbs:[{kind:'doseMove'|'doseDelete'|'caffMove'|'caffDelete', from, to}|{kind:'sleepDelete', date}], warnings:[] }], errors: [{line, reason}] }`. Time normalizer `scNormalizeTime(str)` accepts `HH:MM`, `H:MM`, `H:MM AM/PM` (case/space tolerant) → 24h `HH:MM` or null. Date validator: `YYYY-MM-DD` strict, split-and-construct only. Missing DATE → today + warning. `SLEPT` wins over FELL_ASLEEP-derived hours. Midnight rule: fellAsleep > woke → previous calendar evening. Validation: dose 0<d≤200, caffeine 0<a≤1000, hours 0<h≤24.
  - **Apply**: `scBuildImportOps(parsed, state)` (resolve upsert-vs-create by (date,time), resolve verbs to record ids, ambiguity → rejected op) and `scApplyImportOps(ops)` (mutate exactly as manual paths do: create med/caffeine records with `med_/caf_`-style ids matching existing id factories, stamp `updatedAt`; deletes write `tombstones.meds/caffeine/sleepDays` BEFORE removal; sleep writes mirror confirmMorningCheckin's fields incl. `sleepHistory[date]` + `sleepDailyLogs[date]` with stamps; today-only: live wake fields, modifiers, allNighter; `PLAN_SLEEP` → `sleepDailyLogs[date].plannedBedtime` + `lastUpdated`). Batched refresh at end: renderMedEntries/renderCaffeineEntries/renderFocusCaffeineList (+ autoPopulateFeedback + runAutoCalibration if sleep touched) + recalculate + saveState — every call `typeof`-guarded.
  - Node-export shim at bottom: `if (typeof module !== 'undefined') module.exports = { scParseImportText, scNormalizeTime, scBuildImportOps }` (pattern already used by the sync harness sentinel approach).
- [ ] Write the Node harness `tests/sullyos/test-stimcalc-parser.mjs` covering: full STIM_DAY parse; 12h/24h normalization; SLEPT-wins; midnight crossing; multi-day `---` backfill; missing DATE warning; verb parsing; ambiguity/not-found rejection in scBuildImportOps against a fixture state; dose/caffeine bounds rejection; garbage lines → errors not throws; idempotent re-paste produces zero-change ops.
- [ ] Run: `node tests/sullyos/test-stimcalc-parser.mjs` → all assertions pass.
- [ ] Add UI: an "Import / Sully OS" card on the dashboard near the meds card — textarea, Preview button, Apply button (disabled until preview OK), preview list (green ADD / amber EDIT / red DELETE / red rejects with reasons, all text escaped), routing table placeholder (Task 4 fills it). Follow existing card markup/CSS conventions in the HTML.
- [ ] Wire `<script src="js/stimcalc/importer.js?v=20260820">` alongside the other module tags; bump `?v=` on any other stimcalc module touched.
- [ ] Syntax check: `node --check js/stimcalc/importer.js`.

### Task 2: Body comp verb layer (single-file surgical edits)

**Files:**
- Modify: `body-comp-tracker.html` — `parseImportLine` (~16992), `previewImportData` (~16956), `confirmImportData` (~17130), `confirmImportDuplicates` (~14183), delete/edit helpers near `addTombstone` (~8695) and `getRecStamp` (~8706), `saveFrequentFood` (~17766), `recalcDateAndDependents` (~10278), display sites for meal/workout times.
- Test: `tests/sullyos/test-bodycomp-parser.mjs` (sentinel-extracted parser functions).

**Steps:**
- [ ] Read the actual functions listed above before editing; verify current grammar branches and duplicate predicates.
- [ ] Extend `parseImportLine` with: `FOOD|Name|Cal|Protein|Carbs|Fat`; `MEAL_EDIT|Name|Date|key=value…` (keys: cal, protein, carbs, fat, time, name); `WORKOUT_EDIT|Type|Date|key=value…` (duration, cal, time, type); `WEIGHIN_EDIT|Date|key=value…` (weight, bf); `MEAL_DELETE|Name|Date[|Cal]`; `WORKOUT_DELETE|Type|Date[|Duration]`; `WEIGHIN_DELETE|Date[|Weight]`. Time values accept 12h or 24h → normalize to stored 24h `HH:MM` via a new `parseTimeFlexible()`. Dates: reuse the existing date validation (future rejected for logs; edits/deletes must reference existing dates). Wrap parse candidates in `{ ok, type, data }` / `{ ok:false, reason }` per existing pattern.
- [ ] Sentinel-frame the pure parsing pieces (`// [SULLYOS-PARSER-START] … END`) so the Node harness can extract them (same technique as the Task-18 sync harness).
- [ ] Extend `previewImportData` to render the new ops color-coded (edits amber, deletes red with unchecked-by-default apply state NOT required here — body comp deletes are per-record and previewed; keep destructive rows visually red) and to resolve matches against state now (ambiguity → red reject listing candidates; not-found → reject).
- [ ] Extend `confirmImportData` apply: FOOD → upsert `frequentFoods` by name.toLowerCase (mirror `saveFrequentFood` semantics, stamp `updatedAt`); EDIT → locate record by match key, apply key=value fields, stamp `updatedAt`, `recalcDateAndDependents(date)` when a past date or when cal/macros/weight changed; DELETE → `addTombstone(map, date, id)` (exact existing key scheme `date::id`) BEFORE splice/removal, then recalc; ADD exact-duplicate (all normalized fields equal) → auto-skip counted as "already logged" (partial dup keeps `confirmImportDuplicates` advisory). All summary/receipt text escaped.
- [ ] Add `formatTime12(hhmm)` helper next to the other formatters and apply it to the daily-log meal/workout time render sites and import preview rows (display only; storage untouched). Verify each render site individually — no blind regex replace.
- [ ] Node harness `tests/sullyos/test-bodycomp-parser.mjs`: extract sentinel region into a temp module; cover every new grammar branch, key=value parsing, flexible time, ambiguity data shapes, reject reasons, exact-dup detection predicate.
- [ ] Run: `node tests/sullyos/test-bodycomp-parser.mjs` → pass.
- [ ] Brace/paren balance + `node --check` on extracted script body (existing repo pattern: extract `<script>` to temp file and `node --check`).

### Task 3: Roadmap destructive verbs

**Files:**
- Modify: `js/graduation-roadmap/patients.js` — `parsePatientImportText` (~1575), `previewPatientImport` (~2058), `confirmUnifiedImport` (~2235)
- Modify (only if a helper is missing): `js/graduation-roadmap/state.js` — reuse `cascadeDeleteAppointment` (~1685), `cascadeDeletePatient` (~1743), `toggleMissingNoteStatus` (~1872), `toggleTodoStatus` (~1994)
- Modify: `graduation-roadmap.html` `?v=` cache-bust for patients.js (and state.js if touched)
- Test: `tests/sullyos/test-roadmap-verbs.mjs`

**Steps:**
- [ ] Read the three pipeline functions + cascade helpers; confirm appointment record shape (stored `time` format), chart normalization helper, tombstone map names, checkpoint API, `propagateClinicalChanges` signature.
- [ ] Extend `parsePatientImportText` with the 8 verb blocks (APPOINTMENT_MOVE, APPOINTMENT_DELETE, TODO_DONE, TODO_DELETE, NOTE_CLEARED, PROCEDURE_DELETE, PATIENT_ARCHIVE, PATIENT_DELETE) exactly per spec §5 — multi-line `KEY: value` fields, `for`+`break` fieldMap parsing (CLAUDE.md rule), chart normalized, times normalized for comparison (accept 12h/24h). Parse output: `result.verbOps = [...]` alongside existing collections. Sentinel-frame pure helpers for Node testing.
- [ ] Extend `previewPatientImport`: resolve each verbOp against state (find target; ambiguity/not-found → red reject with reason); render cards — MOVE amber ("replaces, not duplicates" annotation), deletes red; PATIENT_DELETE additionally requires CONFIRM_NAME match at parse AND renders an **unchecked-by-default** checkbox; unknown headers listed as unrecognized. All text `escapeHtml`ed.
- [ ] Extend `confirmUnifiedImport`: re-parse in the existing try/catch guard; if any verbOps will apply → `createCheckpoint('pre-paste-verbs')` once, `clinicalDataDirty = true` BEFORE mutations; apply ops: MOVE mutates date/time(+procedure) in place + `lastUpdated` stamp + `userEdited=true` if clinic-synced; APPOINTMENT_DELETE → `cascadeDeleteAppointment(id, { skipPropagation: true })`; TODO_DONE → toggleTodoStatus done-path (stamp `updatedAt`); TODO_DELETE → `deletedTodoIds[id]=ISO` + remove; NOTE_CLEARED → toggleMissingNoteStatus completion (stamp); PROCEDURE_DELETE → remove + `deletedProcedureIds` tombstone; PATIENT_ARCHIVE → `archived` + `archivedAt=new Date().toISOString()`; PATIENT_DELETE (checkbox checked only) → `cascadeDeletePatient`. Then ONE `propagateClinicalChanges(...)` + existing persist path. Competency counts/notes/lastVerified untouched by every branch.
- [ ] Node harness `tests/sullyos/test-roadmap-verbs.mjs`: parse each verb block, field tolerance (12h/24h, PATIENT vs CHART), CONFIRM_NAME mismatch → parse-level reject, resolver ambiguity fixtures.
- [ ] Run harness → pass. `node --check js/graduation-roadmap/patients.js`.

### Task 4: Command Center router + relay (after Tasks 1–3)

**Files:**
- Create: `js/sullyos/router.js` (shared, loaded by all three apps) — OR inline copies if cross-app script sharing conflicts with app isolation; decide after reading how apps load shared code today (they don't — so: one canonical file, three `<script>` includes, no import coupling).
- Modify: `stimulant-elimination-calculator.html` + `js/stimcalc/importer.js` (routing table + relay send/drain), `body-comp-tracker.html` (import tab), `js/graduation-roadmap/patients.js` (+ `graduation-roadmap.html`) — preview routing table + relay send on confirm + drain hooks.
- Test: covered by Task 6 E2E.

**Steps:**
- [ ] `router.js`: `sullyRouteBlocks(rawText)` per spec §6 (split `---`, strip `SYNTAX:`/banners, classify per §2) + `sullyRelaySend(db, userPath, targetApp, text, fromApp)` writing `{text, from, createdAt: Date.now(), appliedAt: null, receipt: null}` to `users/<user>/commandRelay/<targetApp>/relay_<ts>_<rand>` + `sullyRelayDrain(db, userPath, myApp, applyFn)` (list unapplied → applyFn(text) → set appliedAt+receipt; delete applied nodes >14 days). No app-state writes inside router.js — apply is injected per app.
- [ ] Wire each app: preview shows routing table; confirm applies local blocks via that app's pipeline and sends foreign blocks (requires pinValidated + firebase ready; offline → explicit toast, local still applies). Drain: called after each app's load-complete point (all sync flags set), on visibilitychange→visible, and `child_added` listener; drained non-destructive ops auto-apply through the SAME preview-validated pipeline (programmatic path), destructive ops surface the app's confirm UI. Receipts panel: minimal — origin lists its sent nodes with pending/✓ from a one-shot read on preview open.
- [ ] Cache-bust all touched script tags. `node --check` router.js.

### Task 5: Master instructions doc (parallel-safe)

**Files:**
- Create: `docs/sully-os-master-instructions.md`

**Steps:**
- [ ] Read `docs/claude-webchat-project-instructions.md` fully (1638 lines).
- [ ] Write the unified doc per spec §7: Module 0 router + ET doctrine + output contract + gates; Module 1 = clinical doc absorbed INTACT with the 7 scoping fixes edited in-place + verb appendix; Module 2 body comp (grammar tables, HealthKit transcription, macro estimation, worked examples); Module 3 stim calc (STIM_DAY reference, preset table, trigger vocab, worked examples); brief macros; ≥3 end-to-end mixed-brief examples (free-speak → exact block). Every emitted format in the doc must byte-match what the parsers accept (cross-check against Tasks 1–3 grammar).
- [ ] Self-check: grep the doc for every block header and verify against parser grammar list.

### Task 6: Playwright E2E proof (after Tasks 1–4)

**Steps:**
- [ ] `python3 -m http.server` on the repo; throwaway PIN (e.g. `730495`) → isolated Firebase namespace; never enter the real PIN.
- [ ] Stim calc: paste a 2-day STIM_DAY brief → preview → apply → assert med/caffeine entries render, sleep fields set, PLAN_SLEEP delta visible; reload → persists; paste same text again → zero changes; DOSE_MOVE → time changes, count unchanged; DOSE_DELETE → gone after reload (tombstone).
- [ ] Body comp: complete minimal setup with test PIN; paste MEAL/WORKOUT/FOOD/WEIGHIN + verbs → assert applied, edited, deleted (reload-persistent), food library entry present, exact re-paste auto-skips, 12h times render.
- [ ] Roadmap: seed a patient + appointment via existing PATIENT_RECORD/APPOINTMENTS paste; APPOINTMENT_MOVE → count unchanged, new slot present, old gone after reload; APPOINTMENT_DELETE, TODO_DONE, NOTE_CLEARED, PATIENT_ARCHIVE verified similarly.
- [ ] Cross-app: paste a mixed brief into roadmap → routing table correct → confirm → open stim calc + body comp (same test PIN) → relayed blocks auto-apply, receipts show ✓, data reload-persists.
- [ ] Capture screenshots of each proof state for the final report.

### Task 7: Final QA (Fable, inline)

**Steps:**
- [ ] Full `git diff` review against CLAUDE.md constitutional rules: save guards untouched, tombstone-before-delete everywhere, stamps on every mutation, `getValues()` for collection reads, `escapeHtml` on pasted text, `clinicalDataDirty` before clinical mutations, single propagation, checkpoint-before-destructive-batch, unchecked destructive defaults, cache-busted script tags, no storage-format changes, no competency count writes.
- [ ] `node --check` every touched JS file; brace-balance the HTML script bodies.
- [ ] Re-run both Node harnesses.
- [ ] Stage deliberately (only Sully OS files + the pre-existing stimcalc NaN-hardening working-tree changes, which fold into this branch's revival effort) and commit on `stimcalc-revival`. Do NOT push to main (deploy = user's merge decision).
- [ ] Final report: what shipped, proof (test output + screenshots), how to set up the webchat project, exact deploy step.
