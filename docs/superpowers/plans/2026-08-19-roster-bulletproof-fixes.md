# Roster Bulletproof Fixes — Implementation Plan (from 6-agent audit)

**Goal:** Make the Patients roster a reliable clinic-management workhorse: edits persist globally, deletes stay deleted, cross-device sync is trustworthy, iPhone Chrome editing works, and every surface shows the same truth.

**Source:** Aug 2026 six-domain audit (CRUD / sync / parse / UI / mobile / IA), every finding personally verified by lead architect before inclusion.

## Wave 1 — Sync integrity (firebase-sync.js) [P0]
- [x] 1.1 `reconstructState` remote-wins patientRecords merge: per-record `lastUpdated` newer-wins for scalar fields (non-empty remote values only; clinicalBrief/briefHistory/importedRequirements/archived/archivedAt keep their dedicated rules). Fixes: cross-device edits to filled fields silently lost + reverted.
- [x] 1.2 `mergeRemoteCollectionsIntoLocal`: same per-record newer-wins in the per-patient field merge block.
- [x] 1.3 `mergeRemoteCollectionsIntoLocal`: purge loops for appointments / completedProcedures / patientRecords / legacy patients against unioned tombstones (mirrors existing criticalReminders/d4Events pattern) + persist unioned clinical tombstones unconditionally. Fixes: deleted patients resurrect via local-newer boot path.
- [x] 1.4 visibilitychange(hidden): force-blur focused contenteditable/input before flush (commits in-progress edit). Add `pagehide` flush with full guard suite; add blur to `beforeunload`. Fixes: iPhone backgrounding loses mid-edit text.
- [x] 1.5 Stamp `lastUpdated` on any patientRecords mutation path that misses it (grep inventory).

## Wave 2 — One source of truth for visit facts [P1]
- [x] 2.1 `visitDateToISO(raw)` helper: normalizes bare ISO, pipe-delimited, and MM/DD/YYYY to YYYY-MM-DD (timezone-safe, no Date parsing of strings).
- [x] 2.2 `getPatientNextVisitInfo(patient)` / `getPatientLastVisitInfo(patient)` shared accessors: manual → next scheduled appointment → stored import fallback; last completed appointment → stored lastVisit. Used by summary card, sidebar, roster, clinical record card, mini review, patient to-do.
- [x] 2.3 Summary card shows purpose next to dates (stop `split('—')[0]` discard).
- [x] 2.4 `completeAppointment` forward-only lastVisit guard compares normalized ISO (fixes lexicographic MM/DD/YYYY vs ISO bug).
- [x] 2.5 Archived filtering consistent on all roster surfaces (verify 4 sites).

## Wave 3 — iPhone Chrome edit experience [P1]
- [x] 3.1 16px font on `#tab-patients [contenteditable]` within the mobile media block (stops iOS auto-zoom).
- [x] 3.2 `autocorrect="off" autocapitalize="off" spellcheck="false"` on all patient edit contenteditables (matches search input).
- [x] 3.3 Enter commits (blur) on single-line fields instead of inserting a saved newline; trailing-whitespace trim + newline collapse for single-line fields on save.
- [x] 3.4 Search: stop rebuilding the focused input every keystroke — input renders once, only the list re-renders.
- [x] 3.5 Reliability dot tap targets to ≥40px on mobile.

## Wave 4 — Import & CRUD hardening [P1/P2]
- [x] 4.1 COMPLETED_TODAY-only paste must not wipe `importedRequirements` (only overwrite when canFulfill non-empty).
- [x] 4.2 To-do pipe parser: locate source token (MANUAL/EMAIL/SCREENSHOT/CLINIC/SYSTEM) instead of blind positional split — pipes in description no longer misroute fields.
- [x] 4.3 RELIABILITY value normalized (case) at parse.
- [x] 4.4 Empty import confirm: no-op paste must not toast success/save.
- [x] 4.5 `getPatientRecords()` detached-literal race: add/edit paths re-fetch the live record like the import path does.
- [x] 4.6 Phone displayed formatted (primary + “+N more”) in Info section, not raw pipes.
- [x] 4.7 Perio section hidden in read mode when both fields empty.
- [x] 4.8 Rename propagates to planner task names (dirty flag before propagate).

## Wave 5 — QA + ship
- [x] 5.1 `node --check` all edited JS; brace/paren balance; grep-verify each fix in place.
- [x] 5.2 Independent QA agent reviews full diff against CLAUDE.md rules (guards, getValues, escapeHtml, date parsing, no undefined to Firebase).
- [x] 5.3 Cache-bust `?v=20260819` on edited script tags; update stale CLAUDE.md notes (Object.values debt resolved).
- [x] 5.4 Commit + push (push-to-main = deploy).
