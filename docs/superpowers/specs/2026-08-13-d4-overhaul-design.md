# D4 Overhaul — Design Spec
**Date:** 2026-08-13 | **App:** graduation-roadmap.html | **Status:** Approved (user delegated design judgment; goal: "easy to use but feature rich")

## Timeline Facts (canonical)
- D4 began **May 18, 2026**. Externship (Group 1) ran May 18 – Jul 24, 2026 — **finished**.
- **D4 Semester 1:** May 18, 2026 – Dec 21, 2026
- **D4 Semester 2:** Jan 4, 2027 – May 20, 2027
- **Graduation:** window May 15–20, 2027 (exact date TBD; countdowns target May 15, "window" labeled)
- Today (overhaul date): Aug 13, 2026

## Guiding Decisions
1. **Delete all pre-May-18-2026 content.** D3 Academics tab (all 5 sub-sections), Spring-2026 deadline tables + STATIC_DEADLINES, Spring-2026 planner reminders, D3 key dates.
2. **Keep the sync/data machinery untouched** wherever possible. UI overhaul ≠ data model rewrite. All Firebase guards, merge strategies, checkpoint system, PIN auth stay as-is. Retired *data fields* stay in state defaults/merge (harmless; protects old cloud data) unless already cleanly removed (periodicReviews).
3. **Non-destructive by default.** Old D3 patients get *archived* (hidden everywhere, restorable), never auto-deleted. No auto-migration touches patient data; archiving is user-triggered.
4. **Manual-only competencies.** Text-parse imports never touch competency counts/status again. The Competencies tab becomes the single place counts change, with a bulletproof one-tap check-off UX.

## 1. Deletions
- **D3 Academics tab**: nav button, `#tab-academics` + 5 sub-containers (~760 lines static HTML), `switchTab` academics case, `grades.js` + `exam-content.js` modules (script tags + files). State fields `grades`, `exams`, `examStudyProgress` REMAIN in defaults/merge/isEmptyState (cross-app read path: body-comp reads exams; old cloud data preserved).
- **Deadlines tab**: delete 4 hardcoded month tables (Jan–Apr 2026) + `STATIC_DEADLINES` contents (array stays, empty, for compat). Replace with dynamic month-grouped rendering (see §3).
- **Monthly planner sidebar**: delete hardcoded "Critical Reminders" copy + hardcoded Upcoming Summary numbers. Replace: Upcoming Summary computed live; Critical Reminders becomes a persisted user-editable card seeded with D4 items (INBDE TBD, ADEX TBD).
- **Mission Control**: remove D3 key dates (D3 end / externship start), D3 milestone framing ("by May 2026").
- **Grad Prep**: remove Externship card (done); keep CDCA/ADEX, INBDE, Job Search.
- Ship the already-staged periodic-review retirement + patients.js syntax fix as the baseline commit first.

## 2. D4 Events System (new — powers planner + countdowns)
New state collection `d4Events` (object keyed by `d4ev_*` ids, `getValues()` reads):
```
{ id, type: 'rotation'|'didactic'|'mocksim'|'inbde'|'adex'|'other',
  title, startDate: 'YYYY-MM-DD'|null, endDate: 'YYYY-MM-DD'|null,
  time: 'HH:MM'|null, location, notes, tbd: bool, createdAt, lastEdited }
```
- **Seeded placeholders** (created by one-time migration `d4EventsSeeded_v1`, only if collection empty): INBDE (tbd) and ADEX Clinical Exam (tbd). Placeholders render prominently with a "Set date" action; once dated (`tbd:false`) they flow into calendar + countdowns.
- **Intake UI**: "D4 Schedule" manager card on Monthly Planner — add/edit/delete form (type picker, title, start/end date, time, location, notes). Built to take the user's real data: remaining rotations, last 2–3 didactic classes, mock sims.
- **Rendering**: multi-day events appear as colored chips on every day in range on the monthly calendar (type-colored: rotation=indigo, didactic=blue, mocksim=amber, inbde=purple, adex=red). Mission Control "Key Dates" card lists: next rotation, next mock sim, INBDE, ADEX, semester end, graduation window — each with live countdown; TBD items show "date TBD — set it" link.
- **Sync**: add `d4Events` to state defaults, `reconstructState` (all 3 strategies), `mergeRemoteCollectionsIntoLocal` (addMissing), `isEmptyState` table, Guard F type validation.

## 3. Deadlines Tab — Dynamic Rebuild
- `renderDeadlines()` generates month sections dynamically from live data (customDeadlines + edited/completed overlays), grouped by month, current month → May 2027, only months that have items (current month always shown). Empty state: "No deadlines — add one".
- Full CRUD retained (add/edit/complete/delete/drag). `rebuildUpcomingDeadlines()` unchanged (already data-driven).
- Old completed/edited entries referencing dead static IDs remain in state — harmless orphans.

## 4. Monthly Planner D4 Optimization
- Keep: 5-week battle map, lecture import, clinic appointment sync (`syncClinicalToMonthlyPlanner`), mental notes, hidden tasks.
- Add: D4 Schedule manager card (§2), d4Event chips on calendar days.
- Replace hardcoded sidebar (§1): live Upcoming Summary (computed from deadlines + d4Events + clinic tasks in next 30d), editable Critical Reminders (stored `monthlyPlanner.criticalReminders`, safeLocalStorageSet + saveData on edit).

## 5. Patients / Clinical Roster Overhaul
- Keep entire record system, axiUm ↔ Claude webchat ↔ paste-import flow, appointments, procedures, missing notes, briefs, mini review, patient to-do.
- **Archive system**: `archived: true|false` per patient record (default false). Archived patients excluded from: sidebar roster, Active Roster, Mini Review, Patient To-Do, countdown radar, recall/lastVisit KPIs, requirement-match surfaces. Sidebar gains "Archived (n)" collapsible section with per-patient Restore. Patient record view gains Archive/Restore button. Bulk action: "Archive all patients" (custom confirm; archives every non-archived record) — user runs once to retire the D3 roster.
- `archived` added to per-patient field-level merge lists (reconstructState, mergeRemoteCollectionsIntoLocal, loadFromLocalStorage) so archiving syncs and local wins.
- Cascade rules unchanged; archived ≠ deleted (all data retained).

## 6. Import System Decoupling
- **REQUIREMENTS_STATUS block: removed** (parser + confirm path + webchat instructions doc). It was the only path that wrote competency counts. Unknown block in old pastes → warning toast, ignored.
- COMPLETED_TODAY (procedures) kept — records procedures only, never touches competencies (already V2 behavior; assert stays).
- REQUIREMENTS_MATCH kept — writes `patient.importedRequirements[]` (patient-level planning info shown on the patient record), no competency coupling.
- All other blocks unchanged: PATIENT_RECORD, PATIENT_UPDATE, SPS_DASHBOARD_UPDATE, APPOINTMENTS, MISSING_NOTES, TODO_LIST, CLINICAL_BRIEF.
- `docs/claude-webchat-project-instructions.md` updated to drop REQUIREMENTS_STATUS and state competencies are manual-only.

## 7. Competencies Tab — Full Revamp (manual, simple, bulletproof)
**Data model unchanged** (V2: id/text/required/completed/note/lastVerified/status/isSummative/custom/d4Carryover + 13 categories). All merge/migration machinery untouched. UI rebuilt:
- **Single unified list — no more D3/D4 year tabs.** D3 is over; everything is "by graduation May 2027." `cv2ActiveYearTab` retired.
- **Carryover surfacing**: incomplete items that had a `d3Deadline` render with a red "D3 carryover" badge and appear in a top "Carryover — was due in D3" alert card.
- **Header**: overall progress bar (items complete / total, % — item-based), summatives ring (dynamic target), "X items left" pill, search box, filter chips: All / Left / Done / Summatives / Carryover.
- **Category cards** (13, from DEFAULT_COMPETENCIES): icon, name, progress bar + n/m count, expand/collapse (persisted). Removable Prosthodontics visual grouping retained.
- **Item rows — one-tap check-off**:
  - `required === 1`: large checkbox toggle (tap → done, tap → undone).
  - `required > 1`: big − / + steppers with count pill `completed/required`; auto-done styling at target.
  - Every change: clamp [0, required], stamp `lastVerified = getLocalDateString(new Date())`, derive status, `safeLocalStorageSet` + guarded `saveData()`, instant re-render of the row + header (no full-page rerender), **undo toast** (5s) reverting the exact change.
  - Notes: inline per-item note editor (existing note field), double-fire guarded.
- **Removed from UI**: pipeline badges (importedRequirements coupling), review-queue remnants, D3 milestone KPI cards. Milestone appointment/procedure counters live on Mission Control only.
- Reset All retained behind double custom-confirm + auto-checkpoint.

## 8. Mission Control D4 Reframe
- Key Dates card (from §2): Sem 1 end Dec 21 2026, Sem 2 start Jan 4 2027, Graduation window May 15–20 2027, INBDE/ADEX/mock-sim countdowns.
- Hero card reframed: primary = competency completion (items done/total + summatives), secondary = appointments/procedures counters (informational, SPS-fed, no May-2026 pace math). Pace projection retargeted to May 15, 2027.
- Deadline windows (7/14/30/TBD), Do Today, Missing Notes, alerts — unchanged (data-driven).

## 9. Troubleshooting Module
- Update competency checks for removed UI (no year-tab checks), add d4Events type check to Guard F/`validateStateIntegrity`, integrity checks for archived-patient exclusion counts.

## 10. Cross-cutting
- Cache-bust every touched script tag (`?v=20260813`).
- CLAUDE.md updated: periodic-review removal, academics removal, d4Events, archive system, manual-only competencies, REQUIREMENTS_STATUS removal.
- QA: `node --check` all modules, browser smoke test (boot + every tab + check-off flow + archive flow + d4Event add flow), then commit + push (repo pattern: push to main → live).

## Out of Scope (explicit)
- No changes to: index.html app, stim-calc, body-comp, lecture transformer, Remember tab, To-Do tabs, daily planner mechanics, Firebase config/PIN/guards, checkpoint system.
- Paste-import block for D4 schedule events (possible follow-up; manual form ships now).
- Real rotation/didactic/mock-sim dates: user supplies via the new intake UI after ship.
