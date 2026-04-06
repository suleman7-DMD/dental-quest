---
name: d3-roadmap-dev
description: |
  Historical skill for the old d3-roadmap app architecture. Use only for migration debugging or legacy references related to d3-roadmap.html and the pre-split roadmap code.
  Trigger phrases: "d3 roadmap", "d3-roadmap.html", "legacy roadmap", "old roadmap", "migration debugging", "redirect shim", "historical roadmap".
  Do NOT use this skill for the current Graduation Roadmap app, Dental Quest, Body Comp Tracker, Stim Calc, or Lecture Prompt Transformer.
globs:
  - "graduation-roadmap.html"
  - "js/graduation-roadmap/*.js"
compatibility: Claude Code CLI. Requires file system access (Read, Edit, Write, Grep, Glob, Bash).
metadata:
  author: Sully
  version: 5.0.0
  file: graduation-roadmap.html + js/graduation-roadmap/*.js (12 modules)
  lines: ~10825 HTML + ~12700 JS
  last-verified: 2026-04-01 (post-merge-corruption-fix, commit dd5acc1)
---

# D3 Roadmap Development Patterns

## USE CASES

This skill enables 3 core workflows:

**Use Case 1: Debug a grade calculation or deadline issue**
Trigger: User says "grade is wrong" or "deadline not showing" or "peds score off"
Steps: Read `courseStructures` in grades.js -> Read `loadCourseGrades()` in grades.js -> Read `calculateNeeded()` in grades.js -> Read `initUI()` deadline merge in init.js
Result: Root cause identified (e.g., wrong component weight, deadline not in STATIC_DEADLINES, editedDeadlines not applying)
Success criteria: Grade calculation matches manual weighted average, deadlines render correctly, completedDeadlines persist

**Use Case 2: Add or modify a feature**
Trigger: User says "add a new tab" or "change clinical tracking" or "modify competencies"
Steps: Read state structure in references/state-and-data.md -> Grep for relevant function -> Read 50+ lines of context -> Edit surgically -> Read saveData() to verify guards intact
Result: Feature added without breaking sync, guards, or existing data
Success criteria: Feature works, all 5 Firebase guards intact in saveData(), brace balance unchanged

**Use Case 3: Fix a Firebase sync issue**
Trigger: User says "data not saving" or "sync broken" or "changes lost"
Steps: Read `saveData()` in firebase-sync.js (check 5 guards) -> Grep for isInitialLoad/hasLoadedFromCloud/pinValidated flags in firebase-sync.js -> Read `loadFromFirebase()` to verify _dataLoaded preserved
Result: Sync issue identified and fixed without compromising data protection
Success criteria: saveData() returns true, data persists across refresh, all 5 guards still present

---

## INSTRUCTIONS

### Step 0: Check if this is a vision-first request
If the user says "dream big" or is describing an ambitious new feature, redesign, or reimagining (not a bug fix, debug, or small tweak), invoke the `vision-first` skill FIRST. That skill handles unconstrained vision exploration and alignment before any planning or implementation begins. Return here for surgical edits only after the vision is locked and a plan exists.

### Step 1: Identify what area of the app is involved
Read the APP OVERVIEW below. Determine which subsystem is relevant:
- Grade calculations? -> See [references/grades-and-deadlines.md](references/grades-and-deadlines.md)
- Deadline tracking? -> See [references/grades-and-deadlines.md](references/grades-and-deadlines.md)
- Clinical/competencies? -> See [references/clinical-and-competencies.md](references/clinical-and-competencies.md)
- Monthly/daily planner? -> See [references/monthly-and-daily-planner.md](references/monthly-and-daily-planner.md)
- Firebase/sync? -> Check the 5 FIREBASE GUARDS section below, and see [references/sync-and-firebase.md](references/sync-and-firebase.md)
- Tabs/UI rendering? -> See [references/tabs-and-rendering.md](references/tabs-and-rendering.md)

### Step 2: Find the right module and function
Use the MODULE MAP table below or [references/function-index.md](references/function-index.md) for the full list.
The app is split into 12 JS modules in `js/graduation-roadmap/`. Use Grep across the directory to find functions.

### Step 3: Read the code before changing it
Read the target function and 50 lines of surrounding context in the relevant module file before editing. Never write blind.

### Step 4: Make the change surgically
Use the Edit tool for targeted changes on the specific module file.
After editing, verify:
- Brace/paren balance is intact in that module
- No sync guards were removed or weakened
- `_dataLoaded: true` is preserved in any state reconstruction
- `saveData()` still has all 5 guards (in firebase-sync.js)

### Step 5: Verify the save chain
Every state mutation must flow through: mutate `roadmapData` -> `saveData()` -> re-render.
If you touched Firebase code, verify all 5 guards are still present in `saveData()` in firebase-sync.js.

### Step 6: Validate brace balance
After large edits: `python3 -c "c=open('js/graduation-roadmap/MODULE.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

## EXAMPLES

### Example 1: Debug wrong grade calculation
**User says:** "My Peds grade shows wrong — I got 77% on Exam 1 but the points don't add up"
**Actions:**
1. Read `courseStructures.peds` in grades.js — Exam 1 weight is 40%, defaultGrade is 77
2. Read `loadCourseGrades()` in grades.js — formula: `earnedPoints += (grade / 100) * comp.weight`
3. Check `roadmapData.grades.peds` — should have `{ exam1: 77, headstart: 100 }`
4. Verify: 77/100 * 40 = 30.8 + 100/100 * 2.5 = 2.5 = 33.3 points earned
**Result:** Points match. If user sees wrong value, check if `roadmapData.grades` was overwritten during sync.

### Example 2: Add a custom deadline
**User says:** "Add a new assignment deadline for March 15"
**Actions:**
1. Read `submitNewDeadline()` in deadlines.js — creates deadline with `generateId('custom')`
2. New deadline is stored in `roadmapData.customDeadlines[id]` (object, not array)
3. `initUI()` in init.js merges STATIC_DEADLINES + customDeadlines into working `deadlines` array
4. Verify `saveData()` is called after adding
**Result:** Deadline persists across refresh and syncs to Firebase.

### Example 3: Fix sync guard issue
**User says:** "Changes aren't saving to Firebase"
**Actions:**
1. Read `saveData()` in firebase-sync.js — check diagnostic log output
2. Check all 5 guards: `isInitialLoad`, `hasLoadedFromCloud`, `isEmptyState()`, `roadmapData._dataLoaded`, `pinValidated`
3. If guard B (`hasLoadedFromCloud`) is false, check `loadFromFirebase()` in firebase-sync.js — does it set `hasLoadedFromCloud = true`?
4. Check `loadFromLocalStorage(finalize)` in firebase-sync.js — `finalize=true` sets all flags
**Result:** Identified which guard is blocking saves. Fix the flag that's stuck.

---

## TROUBLESHOOTING

### Error: Grade calculator shows wrong points
**Cause:** Course component weight mismatch — `courseStructures` has wrong weight, or `loadCourseGrades()` formula not applying weight correctly.
**Solution:** Read `courseStructures` in grades.js and verify component weights sum to 100%. Read `loadCourseGrades()` in grades.js and trace the `earnedPoints += (grade / 100) * comp.weight` formula manually.

### Error: Custom deadline disappears after refresh
**Cause:** `saveData()` not called after adding to `roadmapData.customDeadlines`, or a guard is blocking saves silently.
**Solution:** Read `submitNewDeadline()` in deadlines.js. Verify it calls `saveData()` after adding the deadline. Check console for guard block messages.

### Error: Deadline shows incomplete after marking done
**Cause:** Stable ID mismatch — `getDeadlineId()` generates a different key than what's stored in `completedDeadlines` (legacy data used array index).
**Solution:** Read `getDeadlineId()` in state.js. Check `roadmapData.completedDeadlines` keys match the stable ID format. Read `initUI()` in init.js for the legacy fallback matching logic.

### Error: Clinical competency progress resets
**Cause:** `getCompetenciesData()` in clinical.js re-initializes from `DEFAULT_COMPETENCIES` when `roadmapData.clinicalData.competencies` is null or corrupted.
**Solution:** Read `getCompetenciesData()` in clinical.js and verify saved competency data structure matches expected shape. Check `migrateCompetencies()` in state.js for array-to-object migration.

### Error: Competency shows 0 progress after toggling status (fixed Mar 22, 2026)
**Cause:** `setCompItemStatus()` set `item.completed = 0` on toggle-to-pending but kept procedure-linked `completionEntries`. Count was out of sync with evidence — adjustments and procedure linking would then malfunction.
**Solution (commit `5a52d38`):** After filtering entries to keep only procedure-linked, resync `item.completed = Math.min(required, entries.length)` and derive status from count. Both the toggle path (currentStatus === newStatus) and explicit pending path now resync.

### Error: Data not saving / changes lost
**Cause (most common — fixed Mar 5, 2026):** 8 interconnected bugs: (1) flag ordering — `isInitialLoad = false` set AFTER `initUI()` blocked saves, (2) `mergeRemoteState()` overwrote newer local data with stale Firebase, (3) visibility handler merged without timestamp check, (4) `completedDeadlines` restore missed `_originalStableId` fallback, (5) `editedDeadlines` had stale `done:false`, (6) CRUD functions missing `safeLocalStorageSet()` before `saveData()`, (7) stale array index in delete callback, (8) `isLocalUpdate` timeout too short. All fixed in commit `21acdb0`.
**If still broken after fix:** User's browser may be caching old JS. Check `?v=` params on script tags — bump version to force re-download. Call `debugSaveState()` in browser console to see all guard values.
**Solution:** Read `saveData()` in firebase-sync.js. Call `debugSaveState()` in console — it logs all guard values, collection counts, and timestamps. Check `[D3-SAVE]` console logs for which guard is blocking. Trace the flag that's stuck — see `loadFromFirebase()` and `loadFromLocalStorage()` in firebase-sync.js.

### Error: Changes lost after browser cache serves old JS
**Cause:** GitHub Pages caches JS files aggressively. After deploying code changes, user's browser serves old cached files without the fixes.
**Solution:** Add `?v=YYYYMMDD` cache-busting param to ALL `<script src>` tags in d3-roadmap.html. Bump the version on each deploy. This forces browsers to re-download.

### Error: Custom deadline date/name/weight edits lost on reload (THE BIG ONE — fixed Mar 5, 2026)
**Cause:** `handleDateChange()` and `handleTextEdit()` stored edits ONLY in `roadmapData.editedDeadlines`. But `initUI()` only applies `editedDeadlines` to STATIC deadlines (steps 1-4). Custom deadlines are added later (step 5) from `roadmapData.customDeadlines`, which was NEVER updated by the edit handlers. Result: every reload reverted custom deadline edits to their original `customDeadlines` values.
**Why it was hard to find:** The completion handlers (`toggleDeadlineDone`, `submitDeadlineGrade`) DID update `customDeadlines` — only date/text/weight editors were missing. And testing with newly-created custom deadlines didn't expose the bug because the initial values matched. Only editing EXISTING custom deadlines with stale data in `customDeadlines` revealed the revert.
**Solution (commit `af30cef`):** (1) `handleDateChange()` now also updates `customDeadlines[deadline.id].date/day/month`. (2) `handleTextEdit()` now also updates `customDeadlines[deadline.id][field]`. (3) `initUI()` now applies `editedDeadlines` overrides when loading custom deadlines as a safety net.

### Error: Data wiped on new device
**Cause:** Default state has `_version: Date.now()` instead of `0`, causing empty local state to appear "newer" than cloud data.
**Solution:** Verify `getDefaultRoadmapData()` in state.js has `_version: 0` and `_dataLoaded: false`. Check all 5 guards. Use `forcePullFromCloud()` to recover.

### Error: Data shows on Chrome desktop but empty on other browsers/incognito (fixed Mar 22, 2026)
**Cause:** 4 interconnected bugs: (1) Default grades (`oralmed: {quiz1:100}`) made `isEmptyState()` return false → Guard C let defaults be saved to Firebase. (2) `initUI()` auto-created exams/upcomingDeadlines and triggered `saveData()` without Firebase-load guards → saved defaults with fresh `lastSaved`. (3) `finishFirebaseLoad()` never pushed local to Firebase when local was newer → Firebase permanently stale. (4) When local was newer, merge was skipped ENTIRELY → remote-only entries (notes/todos imported on another browser) lost → `localWasNewer` push then wrote incomplete data to Firebase, wiping remote-only data.
**Solution (commit `0edf0c0`):** (1) Empty default grades in both `roadmapData` and `getDefaultRoadmapData()`. (2) `isEmptyState()` no longer checks `exams` (auto-generated); `hasCompetencies` checks `completed > 0` (auto-initialized = 0). (3) Auto-save triggers guarded with `hasLoadedFromCloud && !awaitingFirebaseLoad`. (4) New `mergeRemoteCollectionsIntoLocal(data)` — when local is newer, adds remote-only entries without overwriting local (local wins for same-key conflicts). (5) `finishFirebaseLoad()` detects poisoned defaults via `isEmptyState(data)`, auto-pushes when local has real data. (6) 8 CRUD functions got missing `safeLocalStorageSet()`.
**Key lesson:** Multi-browser = independent localStorage with different data subsets. "Newer timestamp" ≠ "more complete data". NEVER skip merge entirely — use additive `mergeRemoteCollectionsIntoLocal()` for the local-is-newer path.

### Error: Clinic task edits/deletions not persisting in Monthly Planner (fixed Mar 16, 2026)
**Cause:** `syncClinicalToMonthlyPlanner()` deleted ALL clinic-synced tasks and recreated them from scratch on every `initMonthlyPlanner()` call (page load, tab switch, visibility change), wiping any user edits or deletions.
**Solution (commit `e5124b8`):** Incremental sync: skip tasks with `userEdited: true`, skip appointments in `hiddenClinicTasks`, dedup by patient+date+time. When user deletes a clinic task, its `clinicalAppointmentId` is stored in `hiddenClinicTasks`. When user edits, `userEdited: true` is set. `hiddenClinicTasks` is in all 4 Firebase merge sites + defaults.

### Error: Patient/clinical data disappears on refresh/sync/checkpoint (fixed Mar 21, 2026)
**Cause:** 10 interconnected bugs: (1) `hiddenClinicTasks` and `currentWeekSchedule` missing from monthlyPlanner in all 4 merge/restore sites + defaults, (2) `graduationPrep` and `clinicHeadlines` missing from `restoreCheckpoint()` and `importAndRestoreDirectly()`, (3) `dashboardSnapshots` used unsafe `||` merge that discarded local data when remote had empty `[]`, (4) `isEmptyState()` missing checks for `patientRecords`, `dashboardSnapshots`, `completedProcedures`, `competencies` — Guard C silently blocked saves when only these fields had data, (5) `syncClinicalToMonthlyPlanner()` used nuke-and-rebuild pattern wiping user edits, (6) all CRUD functions in patients.js and clinical.js missing `safeLocalStorageSet()` before `saveData()`, (7) both import functions missing localStorage persistence before saveData().
**Solution (commit `6dbe396`):** Added missing fields to all 4 merge/restore sites + defaults. New `mergeDashboardSnapshots()` function deduplicates by `capturedAt`. Added `patientRecords`/`dashboardSnapshots`/`completedProcedures`/`competencies` to `isEmptyState()`. Replaced nuke-and-rebuild `syncClinicalToMonthlyPlanner()` with incremental sync respecting `hiddenClinicTasks` and `userEdited`. Added `safeLocalStorageSet()` before `saveData()` in all 17 CRUD functions across patients.js and clinical.js.

### Error: Duplicate clinic tasks in Schedule tab weekly calendar (fixed Mar 21, 2026)
**Cause:** 3 interconnected bugs: (1) `_mpDeleteCurrentTaskConfirmed()` deleted clinic tasks from `customTasks` without adding to `hiddenClinicTasks`, so `syncClinicalToMonthlyPlanner()` recreated them on next init. (2) Import dedup only checked `patientId + date + time`, so mismatched patient IDs allowed duplicate appointments. (3) `syncClinicalToMonthlyPlanner()` ran on every `initMonthlyPlanner()` call (tab switch, page load) without checking if data actually changed.
**Solution (commit `fa8ab07`):** (1) Clinic task deletion now adds to `hiddenClinicTasks` same as `mpHideClinicTask()`. (2) Both import functions have secondary dedup by `patientName + date + time`. (3) `clinicalDataDirty` flag gates sync — only runs when clinical data actually changed. `dedupAppointments()` utility runs on init to clean existing duplicates. `safeLocalStorageSet()` added to 5 missing monthly-planner CRUD functions.

### Error: Duplicate patients in sidebar + crash on click (fixed Mar 22, 2026)
**Cause:** `getAllPatientRecords()` merged `patientRecords` + `clinicalData.patients` by ID only — no dedup by chart number or name. Same patient created via different paths got different ID schemes (`pt_2685773` in patientRecords vs `pt-171...` in clinicalData.patients), both appeared in sidebar. Clicking the duplicate (grey dot, no reliability field) crashed because `renderPatientRecord()`, `savePatientField()`, and `setPatientReliability()` used `getPatientRecords()` (narrow store) — patient from `clinicalData.patients` returned null.
**Solution (commit `7afe1d3`):** (1) `getAllPatientRecords()` now deduplicates by chart number (exact) then name (case-insensitive). Matched entries get fill-merged (missing fields copied, existing preserved). (2) `renderPatientRecord()`, `savePatientField()`, `setPatientReliability()` now use `getAllPatientRecords()` so clinical-only patients render and edit correctly. Data-layer store consolidation deferred — read-side dedup is sufficient.
**Key lesson:** When two data stores use different ID schemes for the same entities, ID-only merge will always produce duplicates. Dedup must use business keys (chart number, patient name), not storage keys. Functions that look up records for display/edit must use the merged store, not a single source.

### Error: Leading-zero chart numbers cause persistent duplicate patient records (fixed Mar 25, 2026)
**Cause:** FOUR interconnected bugs: (1) `DEFAULT_PATIENT_RECORDS` had `pt_966540` with chart `966540` — should be `pt_0966540`/`0966540`. Imports created correct `pt_0966540`, but fill-merge re-injected bad default every init. (2) `getPatientRecords()` fill-merge at line 438 used exact ID match (`!existing[id]`) — missed leading-zero variants. (3) `periodic-review.js` PR1_BASELINE had `966540` and `79118` without leading zeros. (4) No data-layer cleanup — `getAllPatientRecords()` read-side dedup couldn't prevent duplicates from being re-created by defaults.
**Solution (commit `cf914c6`):** (1) Fixed default to `pt_0966540`/`0966540`. (2) Fill-merge now builds `existingNormCharts` index and checks `normalizeChartNumber()` before adding defaults. (3) Fixed PR1_BASELINE charts to `0966540`/`079118`. (4) Added `migrateLeadingZeroDedup()` one-time migration — consolidates duplicates by keeping record with longer chart (leading zero), fill-merges fields from shorter one, deletes from both `patientRecords` and `clinicalData.patients`. Gated by `leadingZeroDedupDone_v1`. (5) `addNewPatientRecord()` now uses `findByNormalizedChart()` instead of exact ID match.
**Key lesson:** Read-side dedup is NOT sufficient when defaults re-inject bad records on every init. Data-layer cleanup (migration) is needed when the source of duplicates is hardcoded defaults. All ID-creation and fill-merge paths must use normalized matching, not exact key comparison.

### Error: Patient import truncates multi-line fields (fixed Mar 22, 2026)
**Cause:** TWO-SIDED: (1) `parsePatientRecord()` and `parsePatientUpdate()` required continuation lines to start with 2+ spaces (`/^\s{2,}/`). When text was copy-pasted from Claude webchat's markdown-rendered output, indentation was stripped → only first line of each field survived. (2) Claude webchat rendered export blocks as markdown, turning `---` into `<hr>` and stripping leading spaces before copy-paste.
**Solution (commit `51a305a`):** (1) Parser now accepts any non-empty line not matching a known field key as continuation (no indentation required). (2) Webchat instructions updated to require triple-backtick code fences around export blocks. (3) REQUIREMENTS_MATCH now stores `canFulfill`, `priorityNotes`, `highValue` on patient records. (4) `computeRequirementMatches()` uses imported requirements (authoritative) with keyword fallback. (5) Patient detail view shows Priority Notes section.
**Key lesson:** When text passes through markdown rendering before copy-paste, ALL formatting-dependent parsing is at risk. Code fences preserve raw text. Parser should never rely on whitespace that markdown may strip.

### Error: Deadline delete/edit buttons broken (fixed Mar 16, 2026)
**Cause:** `getDeadlineId()` produced IDs containing `'` (apostrophe from deadline text like `can't`), which broke `onclick="fn('${deadlineId}')"` JS syntax. Also, collapsed completed rows had duplicate `style` attributes causing `display:none` to be ignored.
**Solution (commit `e24d328`):** Strip `'"\\` from `getDeadlineId()` key generation. Escape `safeId` in onclick handlers. Merge display:none into the single `rowStyle` in `buildRow()`.

### Error: PR Review tab — 12-bug audit (fixed Mar 22, 2026)
**Cause:** 12 bugs found via systematic audit: (1) `getInProgressProcedures()` saveData() in render path. (2) `periodicReviews` missing from `mergeRemoteCollectionsIntoLocal()`. (3) `isEmptyState()` only checked 3/9 PR2 fields. (4) Attended row used inflated smart count. (5) Roster missed `clinicalData.patients`. (6) Clinical Brief absent from writeups. (7) Skeleton records lacked name/chartNumber. (8) 4 import parser fields missing. (9-10) Double-fire on date/admin editors. (11) Escape overridden by blur. (12) Dead code.
**Solution (commit `c5d4578`):** Extracted `ensureInProgressDefaults()` with guarded save. Full PR2 merge in `mergeRemoteCollectionsIntoLocal()`. `hasPeriodicReview` checks all 9 fields. SPS snapshot preferred. Both patient stores merged. Clinical Brief panel added. `committed` guard flags on inline editors.
**Key lesson:** Render paths must NEVER call `saveData()`. `mergeRemoteCollectionsIntoLocal()` must cover ALL top-level state objects. `isEmptyState()` must check ALL user-editable fields.

### Error: Mission Control dashboard — 22-bug audit (fixed Mar 22, 2026)
**Cause:** Deep audit of Mission Control tab found 22 bugs across 4 categories:
**Persistence (5):** (1) `clinicHeadlines` fill-only merge in `mergeRemoteCollectionsIntoLocal` — defaults always exist so `!roadmapData.clinicHeadlines` never fires, dropping remote custom targets. (2) Same bug for `graduationPrep` — externship/CDCA data from other devices lost. (3) `overriddenStatic` missing from `mergeRemoteCollectionsIntoLocal`. (4) `restoreBackup()` raw `roadmapData = backup.data` wipes newer fields. (5) `periodicReviews` missing from initial `roadmapData` declaration.
**Smart counters (6):** (6) `clinic_` task IDs not validated against real appointments (phantom counts). (7) Patient visit dedup used OR instead of AND. (8) `getSmartProcedureCount()` deducted null-procedureId completionEntries (backfill undercount). (9) `getCompetencyGaps()` threshold too loose for single-requirement items. (10) Empty competency categories polluted readiness details. (11) Pace projection used hardcoded Aug 2025 start date.
**Rendering (7):** (12) Full `innerHTML` rebuild destroyed `<details>` state, scroll, and input focus. (13) `renderDashboard()` mutated `roadmapData.clinicHeadlines` during render. (14) `getCompetenciesData()` had initialization side-effects during render. (15) Dead `updateHeadlineCounter()` function. (16) TBD deadlines silently vanished. (17) `dashboardAddTodo()` lost input focus. (18) `toggleMissingNoteStatus()`/`clearCompletedMissingNotes()` crashed without optional chaining.
**Other (4):** (19) Faculty substring match false positives. (20) `backfillClinicalData()` created duplicate checkpoints. (21) SPS snapshot one-way ratchet (documented, by design). (22) `calculatePaceProjection` default start date too conservative.
**Solution:** All 22 bugs fixed across state.js, firebase-sync.js, init.js, clinical.js. Key architectural changes: (1) Partial re-renders via `rerenderMissingNotesSection()`/`rerenderTodoListSection()`. (2) `getCompetenciesData()` split into read-only accessor + `ensureCompetenciesInitialized()`. (3) `mergeRemoteCollectionsIntoLocal` field-level merge for defaulted objects. (4) `restoreBackup()` full field-by-field reconstruction. (5) Dual threshold for behind-pace (rate-based + midpoint-based).
**Key lessons:** (a) Objects in defaults need field-level merge, not fill-only guards. (b) Render functions must be pure — no state mutation, no initialization. (c) Section-specific re-renders preserve UX for frequent actions. (d) Smart counters must validate IDs against source data.

### Error: Procedure count inflated (shows 91+ instead of 70) (fixed Mar 30, 2026)
**Cause:** THREE interconnected root causes: (1) `getSmartProcedureCount()` used `MAX(computed, snapshot)` — SPS snapshot was a floor, never a ceiling. If computed inflated to 91, `MAX(91, 70) = 91`. (2) `applyRequirementCheckoffs()` created phantom procedure records for REQUIREMENTS_STATUS items (absolute-set). Each `recordProcedure()` call added to `completedProcedures` count AND created a `completionEntry` that diverged from the imported `completed` count. (3) Non-procedure competency categories (grouppractice, txplanning, geriatrics, externship, peds) were included in the `competencyDerivedCount`, inflating totals with non-clinical items.
**Solution (commit `e368887`):** (1) SPS snapshot is now AUTHORITATIVE: `snapshotCount > 0 ? snapshotCount : computedTotal`. (2) `applyRequirementCheckoffs()` only calls `recordProcedure()` when `item.isDelta` is true (COMPLETED_TODAY from REQUIREMENTS_MATCH). REQUIREMENTS_STATUS (absolute-set) skips procedure record creation. (3) `procedureCategories` filter: only `fixed`, `operative`, `dentures`, `rpd`, `srp`, `endo`, `oralsurg`, `perio` contribute to competency-derived procedure count.
**Key lesson:** SPS dashboard is THE authoritative source for total procedure count. Computed counts are fallback only. Never create procedure records for status sync imports — they are informational, not events.

### Error: 37-bug comprehensive audit (fixed Mar 30, 2026)
**Cause:** 6-agent parallel audit found 1 CRITICAL, 9 HIGH, 20 MEDIUM bugs across all 12 JS modules + HTML/CSS. Key categories: Firebase array→object safety (4 bugs in dashboardSnapshots, briefHistory, completionEntries), sync merge depth (3 bugs in grades, patientRecords, visibility handler), import parser (4 bugs in appointment continuation, REMAINING dispatch, case-sensitive dedup, activeStatus casing), procedure count inflation (3 root causes), XSS (5 bugs in contenteditable, chair field, ID escaping), and propagation (2 bugs in deadline text edits, daily planner field name).
**Solution (commit `e368887`):** 37 fixes across 9 files. QA verification: 37/37 PASS. All 8 JS files pass `node -c` syntax check. Key architectural changes: (a) SPS snapshot authoritative for procedure count. (b) `getValues()` safety on all Firebase-stored arrays. (c) Per-patient IIFE merge in `loadFromLocalStorage()`. (d) 60s dedup for `createCheckpoint()`. (e) Deep per-course grades merge with null protection. (f) `isDelta` guard on `recordProcedure()` in import path. (g) Mini Review shows full last visit details.
**Areas NOT audited** (for next session): grades.js courseStructures weight sums, exam-content.js data accuracy, monthly-planner calendar edge cases, PDF export, pomodoro timer, cross-app data flow to body-comp/stim-calc, restoreCheckpoint/importAndRestoreDirectly todoList merge-vs-replace, deepMerge array handling in forceCloudSync.

### Error: Competencies showing wrong data — ground truth rebuild (fixed Apr 1, 2026)
**Cause:** THREE interconnected root causes: (1) `DEFAULT_COMPETENCIES` was built from guesses, not official requirements docs. Fixed Pros formatives falsely marked as D3 deadlines (`d3Deadline: '2026-05-01'` on all 4 fixed formatives — they are cumulative by D4, NOT D3 deadlines). Real D3 deadlines (GP Summative PR, Summative WA, Communication presentations, Leadership Workshop, RS 545, OS 3rd year, Geriatrics) missing entirely or had `d3Deadline: null`. Several GP items (formative/summative tx plan presentations, group meetings, OHRA tracking) not in DEFAULT_COMPETENCIES at all. `gp-comm` was a single item covering 3 separate requirements. SRP calculus removal tracked twice (`perio-sum-calc` AND `srp-calc-1/2/3`). (2) Import system inflated completion counts: `applyRequirementCheckoffs()` REQUIREMENTS_STATUS (absolute-set) set `completed = 1` on 4 fixed formatives during a March 30 import, but user had 0 actual fixed procedures — phantom progress showed 10% (4/39). No distinction between CAN_FULFILL (planned/potential from patient tx plan) and COMPLETED_TODAY (actually done) in the rendering. (3) Patient chips on competency items were non-interactive dead ends — clicked to navigate but didn't explain WHY the patient was listed or whether the requirement was planned vs completed.
**Solution (commit `feeb118`):** (1) Created `docs/GROUND_TRUTH_REQUIREMENTS.md` as SINGLE source of truth. Rebuilt `DEFAULT_COMPETENCIES` from scratch: 15 categories, ~140 items, all d3Deadlines correct, new IDs (fixed-units-total, fixed-fpd, fixed-implant-crown, fixed-cerec, cd-units-total, gp-comm-workshop, gp-comm-form-txplan, gp-comm-sum-txplan, gp-meetings, gp-ohra), removed perio-sum-calc, split grouppractice into D3/D4, aliased srp-reeval = perio-sum-reeval-srp. (2) `getPatientsFulfilling()` now checks `completionEntries[]` for actual procedure records to distinguish completed (green badge) vs planned (yellow badge). `renderPatientBadges()` renders different colors. `calculateCategoryStats()` unchanged — only `item.completed` counts, not badge status. Format D safeguard: console.warn on REQUIREMENTS_STATUS absolute-set for clinical categories. (3) `showPatientCompPreview()` popup: DOM-based mini patient card with requirement match status, clinical brief, tx plan, "View Full Record" button. `renderD3Deadlines()` pills now clickable via `navigateToCompetencyItem()` which expands category + scrolls to item with highlight flash.
**Key lesson:** When the data model (DEFAULT_COMPETENCIES) is wrong, ALL downstream rendering is wrong. Fix the data first, then fix the rendering. A single ground truth document eliminates the "4 sources that should be 1" problem. The webchat export format (CAN_FULFILL vs COMPLETED_TODAY) was correct all along — the app just wasn't rendering the distinction.

### Error: Competency tab fully broken — 37-bug overhaul (fixed Apr 1, 2026)
**Cause:** 33 unique bugs found by 6 parallel audit agents across 6 files. THREE critical bugs made core features invisible/non-functional: (1) `renderEvidenceCards()` was defined (Task 4.8, 50 lines) but NEVER called in `renderCompetencies()` — evidence trail completely invisible. (2) `openReviewQueuePanel()` passed HTML with buttons to `showCustomConfirm()` which `escapeHtml()`'d the entire message, rendering all Accept/Reject/Dismiss buttons as literal `&lt;button&gt;` text. (3) `removeEvidenceEntry()` undo toast used selector `.toast-notification` but actual element has id `toast`. NINE high-severity bugs: Firebase `autoLinkReviewQueue` array→object corruption (6 sites missing `getValues()`), `restoreCheckpoint` mergeCompetencies had args swapped (current state won over checkpoint), migration flag `competencyEnhancementsDone_v1` never matched gate checking `_v2`, `persistExpandedState()`/`setCompViewMode()` never called `safeLocalStorageSet()`, `_compNoteCommitted` flag never cleared on re-focus after Escape (note permanently unsaveable), `deleteProcedure`/`uncompleteAppointment` missing `clinicalDataDirty = true`.
**Solution (commit `f4cad62`):** 37 fixes across clinical.js (21), state.js (2), firebase-sync.js (3), troubleshooting.js (6), patients.js (1), graduation-roadmap.html (4). Key changes: (1) Evidence cards wired in after patient badges. (2) Review queue uses DOM-based overlay instead of showCustomConfirm. (3) Toast selector fixed. (4) All autoLinkReviewQueue accesses + suggestedItems use getValues(). (5) mergeCompetencies arg order swapped in 4 restore/import sites. (6) Migration flag v1→v2 in 3 sites. (7) Guard F auto-converts arrays before validation. (8) D3 deadline urgency: <7 days = 'soon' not 'overdue'. (9) safeKey escaped in 5+ onclick locations. (10) Milestone dashboard reads clinicHeadlines targets. (11) navigateToEntity scrolls to item with highlight. (12) applyRequirementCheckoffs derives status. (13) Modal backdrop dismiss on compItemModal + Quick Record. (14) Scroll position preserved on re-render. (15) showCustomConfirm rawHtml parameter added. (16) Troubleshooting resync upward-only (preserves SPS counts). (17) Mobile CSS class fix + touch targets + contenteditable placeholder.
**Key lessons:** (a) Features can be built but never wired in — always grep for call sites of new functions. (b) `showCustomConfirm()` escapes ALL HTML — never pass rich content to it; use DOM construction. (c) Migration flag versions MUST match across gate AND clear sites. (d) `mergeCompetencies(local, cloud)` first-arg-wins — restore operations need checkpoint as first arg. (e) Firebase array→object affects ALL array fields, not just well-known ones — `autoLinkReviewQueue` and `suggestedItems` were missed in prior audits. (f) Contenteditable double-fire guards need flag CLEAR on focus, not just SET on escape. (g) Troubleshooting quick-fix functions that recalculate `completed = min(required, entries.length)` are DESTRUCTIVE to SPS absolute-set counts — must only sync upward.

### Error: 18-bug comprehensive data integrity audit (fixed Apr 1, 2026 — second audit)
**Cause:** 7-agent parallel audit (requirements accuracy, import parser, competency rendering, patient lifecycle, appointment pipeline, Firebase sync, cross-tab dependencies) — 159 checks, 18 bugs, 28 warnings. Top recurring pattern: Firebase array→object conversion (`getValues()` missing in 7 locations across smart counters, PR Review, merge functions, patient matching). Second pattern: merge functions losing data due to shallow guards (empty `[]` truthy, `!field` falsy, no date comparison). Third pattern: missing propagation calls (daily planner not synced on uncomplete/delete).
**Solution (commit `4d501aa`):** 5 parallel fix agents (one per file), QA verification agent (20/20 pass). 3 CRITICAL: `getSmartAppointmentCount()`/`getSmartProcedureCount()` + `getLatestSnapshot()` now use `getValues()` for dashboardSnapshots (state.js:1059,1116; periodic-review.js:120); `linkProcedureToCompetencies()` uses `Math.max(item.completed, entries.length)` floor to protect REQUIREMENTS_STATUS absolute-set counts (clinical.js:2737). 9 HIGH: `hiddenClinicTasks` key fixed from `'clinic_'+aptId` to raw `aptId` (state.js:1433, patients.js:1243); migration flag `_v3` clear added to all 4 restore/import sites (firebase-sync.js:531,646,2002,2320); `importBackup()` now clears all 3 migration flags; `mergeRemoteState` clinicalBrief uses dateGenerated comparison + getValues for importedRequirements/briefHistory (firebase-sync.js:998-1015); `briefHistory` and `autoLinkReviewQueue` merge functions use getValues; `computeRequirementMatches()` uses getValues; COMPLETED_TODAY resolves patientId via findByNormalizedChart; `migrateLeadingZeroDedup` now remaps autoLinkReviewQueue + periodicReviews.pr2 FKs. 6 MEDIUM: D3 urgency 4 tiers (upcoming=#60a5fa); proc breakdown uses snapshotIsAuthoritative; uncomplete/delete appointment sync daily planner; loadFromLocalStorage grades null protection; PATIENT_RECORD skip id overwrite.
**Key lessons:** (a) `getValues()` must be used on ANY field that passes through Firebase — arrays convert to objects silently. Every new Firebase-stored array needs getValues at every access point. (b) `importBackup()` is easy to forget when adding migration flag clears — always check all 4 restore/import sites. (c) `Math.min(required, entries.length)` silently destroys absolute-set counts — use `Math.max(current, entries.length)` as floor. (d) hiddenClinicTasks keys must match what syncClinicalToMonthlyPlanner checks — raw aptId, not prefixed. (e) COMPLETED_TODAY from REQUIREMENTS_MATCH must resolve patientId from chart number before creating procedure records. (f) All 6 course weight sums verified = 100% (first time checked).

### Error: 22-bug feature correctness audit (fixed Apr 2, 2026)
**Cause:** Cross-verified from two independent consultants (senior found 21, mid-tier found 1 unique). Six categories: (1) DATA_LOSS: `mpSaveTask()` missing `userEdited` flag — clinic-synced task edits silently overwritten by next `syncClinicalToMonthlyPlanner()`. (2) DATA_CORRUPTION: stale `toastEl.onclick` handler leaked to subsequent toasts + `style.display='none'` permanently broke all future toasts; `migrateToUnifiedPatientStore` used `|| []` instead of `getValues()` on `autoLinkReviewQueue`. (3) WRONG_DISPLAY (13 bugs): `renderActiveRoster` pipe-delimited `lastVisit` parsing failure; pace badge color logic inverted (yellow unreachable); Firebase array safety on `importedRequirements` in 2 locations; `confirmUnifiedImport` lastVisit comparison against pipe-delimited value; `mpUnhideClinicTask` missing `clinicalDataDirty`; `buildCurrentWeekSchedule` leaking overridden statics + hidden appointments to Stim Calc; `mpClickCell` invalid `24:00` end time; schedule sub-tab inline styles overriding CSS class; clinical "Add Patient" calling removed function; unscheduled deadline NaN badge. (4) STALE_DISPLAY (4 bugs): `setCompItemStatus` missing `renderDashboard()`; `mpToggleTaskComplete` + `propagateClinicalChanges()` missing `dpSyncAppointmentsToTimeline()`; `deletePatientRecord()` inline cascade missing 5 operations vs `cascadeDeletePatient()`. (5) COSMETIC: mobile CSS border shorthand order; 95-line dead `#patientModal` HTML.
**Solution (commit `985e2fc`):** 24 surgical edits across 6 files. Key patterns: named toast handler with `setTimeout` auto-clear (no `display:none`); `lastVisit.split('|')[0].trim()` before date parsing; `buildCurrentWeekSchedule` builds `convertedStaticIds` set + checks `hiddenClinicTasks`; `deletePatientRecord` delegates to `cascadeDeletePatient`; `propagateClinicalChanges` now includes `dpSyncAppointmentsToTimeline`. Mid-tier consultant audit: their `calculatePaceProjection` getValues fix was false positive (already applied); their grade-deadline sync in `renderDashboard` was dangerous (duplicated logic in render path).
**Key lessons:** (a) Toast handlers MUST auto-clear — never use `style.display='none'` (inline overrides CSS class permanently). (b) `lastVisit` field has dual format (bare YYYY-MM-DD from programmatic writes, pipe-delimited from defaults) — always split on `|` first. (c) `buildCurrentWeekSchedule` is cross-app facing — must respect ALL planner visibility rules (overridden statics, hidden clinic tasks, cancelled appointments). (d) Inline `style="background:..."` makes CSS class toggles invisible — put togglable properties in CSS rules only. (e) When `cascadeDeletePatient()` exists with full propagation, ALWAYS delegate — never maintain a parallel inline cascade.

---

## PERFORMANCE NOTES

- **Take your time with each step.** Read before editing. Verify after editing. Do not skip validation steps.
- **Quality over speed.** A broken sync guard wipes ALL user data across devices. Verify guards are intact after every edit.
- **Read 50+ lines of context** around any function before modifying it. Blind edits break things silently.
- **Do not skip brace balance checks** after edits touching more than 10 lines in any module file.
- **Check the save chain every time.** After any `roadmapData` mutation, verify `saveData()` is called, then the appropriate render function. Missing any link causes silent data loss.
- **Verify deadline merge logic** after touching deadline code. The 5-layer hybrid system (STATIC + custom + edited + completed + deleted) rebuilds every `initUI()` — changes to any layer can silently break others.

---

## ERROR HANDLING

### Before any edit:
- Read 50+ lines of context around the target function
- Count braces/parens in the section you're editing
- Note which save function and render function are in scope

### After any edit:
- Verify brace/paren count matches pre-edit count
- If you touched `saveData()`, verify all 5 guards are still present
- If you touched state reconstruction (realtime sync, loadFromFirebase), verify `_dataLoaded: true` is preserved
- If you touched `isEmptyState()`, verify all 11 conditions are still checked

### If something breaks:
1. Check the browser console for the exact error and line number
2. Use `createCheckpoint('before-fix')` to save current state before attempting repair
3. Check all 5 guards in order: pinValidated -> isInitialLoad -> hasLoadedFromCloud -> _dataLoaded -> isEmptyState
4. NEVER bypass guards to "fix" a sync issue — find WHY the guard is blocking

---

## CRITICAL: FIREBASE RULES APPLY

This app uses the same Firebase patterns as all Sully apps.
**BEFORE ANY CODE CHANGES**, ensure you follow:
- `sully-firebase-patterns` skill rules (when available)
- Use `{}` objects with `generateId()` keys, NEVER arrays
- Use ONLY `saveData()` for persistence
- Respect ALL 5 sync guards
- All date parsing must use local timezone (NEVER `new Date('YYYY-MM-DD')`)

---

## CRITICAL PATTERNS

### Pattern 1: Adding a Custom Deadline (Full Flow)
```javascript
// Inside submitNewDeadline():
const id = generateId('custom');
roadmapData.customDeadlines[id] = { id, date, what, course, weight, type, custom: true };
saveData();                    // localStorage + Firebase (debounced)
initUI();                      // Rebuilds working deadlines array from all 5 layers
```

### Pattern 2: Updating a Competency Item
```javascript
// Inside adjustCompItem(catKey, itemId, delta):
const competencies = getCompetenciesData();
// Find item in competencies[catKey].sections[].items[]
item.completed = Math.max(0, item.completed + delta);
saveData();
renderCompetencies();
```

### Pattern 3: Grade-Deadline Bidirectional Sync
```javascript
// When grade entered in Grades tab (grades.js):
syncGradeToDeadline(courseId, componentId, grade);
// When deadline marked complete with grade (deadlines.js):
syncDeadlineToGrades(deadline, isComplete, grade);
```

---

## APP OVERVIEW

**Files:** `graduation-roadmap.html` (~10,825 lines, CSS + HTML only) + `js/graduation-roadmap/*.js` (12 modules, ~12,700 lines)
**URL:** https://suleman7-dmd.github.io/dental-quest/graduation-roadmap.html (d3-roadmap.html is a redirect shim)

**Purpose:** Track academic requirements, deadlines, clinical competencies, and scheduling for D3 dental school year.

**State object:** `roadmapData` (NOT `state` — that's body-comp-tracker)

**Firebase path:** `users/user_{hashedPin}/d3Roadmap`

**12 Modules (load order):**
state.js (680) -> firebase-sync.js (2,200) -> deadlines.js (804) -> grades.js (384) -> exam-content.js (1,327) -> clinical.js (1,451) -> patients.js (2,160) -> import-system.js (543) -> daily-planner.js (573) -> monthly-planner.js (1,142) -> periodic-review.js (1,962) -> init.js (537)

**9 Tabs (7 original + PR Review Mar 22, Mini Review Mar 25):**
| Tab | ID | Key Function | Module |
|-----|----|-------------|--------|
| Mission Control | `missioncontrol` | `renderDashboard()` | init.js |
| Deadlines | `deadlines` | `renderDeadlines()` | deadlines.js |
| Clinical | `clinical` | `initClinicalTab()` | clinical.js |
| Schedule | `schedule` | Sub-tabs: Monthly + Daily | monthly-planner.js, daily-planner.js |
| D3 Academics | `academics` | Accordion: Grades, Exams, Mandatory, Courses, Classmates | grades.js, exam-content.js |
| Graduation Prep | `gradprep` | `renderGraduationPrep()` | init.js |
| PR Review | `periodicreview` | `initPeriodicReview()` | periodic-review.js |
| Mini Review | `minireview` | `renderMiniReview()` | patients.js |
| Remember | `remember` | Static HTML | — |

**Old tab IDs map to new:** dashboard→missioncontrol, grades→academics, examcontent→academics, mandatory→academics, courses→academics, classmates→academics, dailyplanner→schedule, monthlyplanner→schedule (backward compat in switchTab)

**Clinical Sub-tabs:** Patients, Appointments, Procedures, Competencies (14 categories now)

**Patients Tab (9th tab, added to main tab bar):** Swiss light theme (`#f7f5ef` background, white cards, teal `#1a7f79` accents). CSS uses `#tab-patients` specificity prefix to override dark base styles. Key rendering: `renderPatientsSidebar()` (200px sticky sidebar) and `renderPatientRecord()` (summary card + priority notes + collapsible sections). Section IDs: `info`, `clinical`, `perio`, `treatment`, `imaging`, `notes`, `priority`. Imaging uses compact chips (read) / grid (edit). Perio uses side-by-side cards (read) / fld() (edit). Mobile hides `#dashboardMetricsCard` and `#patientsCountdownRadar`. Patient detail has Brief/Record tabs — Clinical Brief tab is default when a brief exists (shows 7-section structured prose: Snapshot, Diagnoses & Risks, Treatment Status, Treatment Sequencing, Flagged Concerns, Graduation Value, Next Visit Plan). Record tab shows structured fields. `renderClinicalBrief()` renders brief content. `patientViewTab` global tracks active tab.

---

## KEY STATE STRUCTURE

```javascript
let roadmapData = {
    pedsLockedIn: 33.3,                    // Peds points earned so far
    mandatoryItems: { gatecontrol, acutepain, peextremities, npi, orthomodule, ips, periodiscussion },
    grades: {                               // Course grades keyed by courseId
        oralmed: { quiz1: 100 },
        paincontrol: {},
        critthink: { quiz1: 100 },
        peds: { exam1: 77, headstart: 100 },
        perio: { midterm: null, writtenAssignment: 100 },
        ortho: { midterm: null }
    },
    editedDeadlines: {},                    // Overrides to STATIC_DEADLINES (keyed by stableId)
    customDeadlines: {},                    // User-added deadlines (object with ID keys)
    deletedDeadlines: {},                   // Deleted static deadlines
    completedDeadlines: {},                 // Completed deadlines with grades (keyed by stableId)
    examStudyProgress: {},                  // { 'peds-exam2-lec11': true, ... }
    dailyPlanner: { date, focus, notes, blocks: {}, pomodorosCompleted, bedtime },
    monthlyPlanner: { notes: {}, customTasks: {}, overriddenStatic: {}, completedTasks: {}, hiddenClinicTasks: {}, currentWeekSchedule: {} },
    clinicalData: {
        patients: {},                       // Patient records keyed by ID
        appointments: {},                   // Appointment records keyed by ID
        completedProcedures: {},            // Completed procedure records
        competencies: null,                 // Initialized from DEFAULT_COMPETENCIES
        missingNotes: {}                    // Missing progress notes — keyed by note-{chart}-{dateNoHyphens}
        // NOTE: Patient records in patientRecords{} may also have:
        //   clinicalBrief: { dateGenerated, snapshot, diagnosesAndRisks, txStatus, txSequencing, flaggedConcerns, gradValue, nextVisitPlan }
        //   briefHistory: [] (max 3 prior briefs)
    },
    todoList: {                             // To-do list — flat checklist from multiple sources
        items: {},                          // Keyed by todo-{NNNN}-{dateNoHyphens}
        _nextSeq: 1,                        // Sequential counter for manual adds
        lastUpdated: null                   // ISO timestamp
    },
    exams: {},                              // For cross-app integration (Body Comp reads this)
    graduationPrep: {                       // Graduation Prep tab data
        externship: { startDate, endDate, patients: {}, logistics: '', notes: '' },
        cdcaAdex: { sessions: {}, notes: '' },
        inbde: { notes: '' },
        jobSearch: { notes: '' }
    },
    clinicHeadlines: {                      // Mission Control headline counters
        appointments: { completed: 0, target: 90 },
        procedures: { completed: 0, target: 116 }
    },
    lastSaved: null,
    _version: 0,                            // MUST be 0 in defaults (cloud always wins on fresh device)
    _lastModified: null,
    _dataLoaded: false                      // Flag to track if real data was loaded
};
```

---

## DEADLINE SYSTEM (Hybrid Static + Dynamic)

The deadline system uses a hybrid approach:
- **STATIC_DEADLINES** (const array, in deadlines.js): 50+ hardcoded deadlines for Spring 2026
- **roadmapData.customDeadlines** (object): User-added deadlines with `generateId('custom')` keys
- **roadmapData.editedDeadlines** (object): Overrides to static deadline fields (keyed by `getDeadlineId()`)
- **roadmapData.completedDeadlines** (object): Completion status + grades (keyed by `getDeadlineId()`)
- **roadmapData.deletedDeadlines** (object): Deleted static deadlines
- **Working array `deadlines`** (let): Rebuilt every `initUI()` call from STATIC + custom - deleted

**Deadline shape (STATIC_DEADLINES entry):**
```javascript
{ date: '2026-02-18', day: 'Wed', what: 'EXAM 2...', course: 'Peds', weight: '45%', type: 'EXAM', month: 'february', done: true }
```

**Stable ID function:** `getDeadlineId(deadline)` in state.js — generates a stable key from deadline properties for sync safety.

---

## 5 FIREBASE GUARDS in saveData() (firebase-sync.js)

```
GUARD A: if (isInitialLoad) return false;           // Never save during initial load
GUARD B: if (!hasLoadedFromCloud) return false;      // Never save before cloud data loaded
GUARD C: if (isEmptyState(roadmapData)) return false; // Never save empty state
GUARD D: if (!roadmapData._dataLoaded) return false; // Data must be confirmed loaded
GUARD E: if (firebaseSyncEnabled && !pinValidated) return false; // PIN must be validated
```

**Guard flag locations (state.js):**
```javascript
let isInitialLoad = true;       // cleared in loadFromFirebase/loadFromLocalStorage (firebase-sync.js)
let hasLoadedFromCloud = false;  // set true after Firebase load completes (firebase-sync.js)
let pinValidated = false;        // set true in setupUserAuth() (firebase-sync.js)
let clinicalDataDirty = true;   // gates syncClinicalToMonthlyPlanner() in initMonthlyPlanner(). Set true by data load/merge, false after sync.
```

**Save flow:** mutate `roadmapData` -> `saveData()` -> localStorage IMMEDIATELY -> Firebase debounced (0-300ms) -> `setLocalUpdateFlag()` to prevent realtime echo -> retry on error

---

## GRADE CALCULATOR

**Course structures** defined in `courseStructures` in grades.js. Each course has `name`, `passing` threshold, and `components[]` array.

**Courses (6 graded):**
| Course Key | Name | Passing | Components |
|-----------|------|---------|------------|
| `oralmed` | Oral Medicine | 60% | 14 (participation, 10 quizzes, midterm, final, passion project) |
| `paincontrol` | Pain Control 2 | 60% | 7 (rx1, takehome1, midterm, medConsult, rx2, takehome2, final) |
| `critthink` | Critical Thinking | 60% | 9 (quiz1, quiz2, pico, articles, ppt, video, review, peer) |
| `peds` | Pediatric Dentistry | 60% | 5 (exam1@40%, exam2@45%, exam3@7.5%, headstart@2.5%, orthoModule@5%) |
| `perio` | Periodontology 2 | **65%** | 4 (midterm@40%, writtenAssignment@10%, discussion@5%, final@45%) |
| `ortho` | Orthodontics | 60% | 2 (midterm@50%, final@50%) |

**Grade formula** (in `loadCourseGrades()` in grades.js):
```javascript
earnedPoints += (parseFloat(grade) / 100) * comp.weight;
completedWeight += comp.weight;
remainingWeight = 100 - completedWeight;
currentGrade = completedWeight > 0 ? (earnedPoints / completedWeight * 100) : 0;
```

**"What do I need" formula** (in `calculateNeeded()` in grades.js):
```javascript
pointsNeeded = targetGrade - earnedPoints;
avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;
```

---

## MODULE MAP: Key Functions

| Function | Module | Description |
|----------|--------|-------------|
| `getDefaultRoadmapData()` | state.js | Returns fresh default state |
| `isEmptyState(data)` | state.js | Checks if state has real user data |
| `getDeadlineId(deadline)` | state.js | Stable ID for deadline sync |
| `switchTab(tabId, evt)` | state.js | Tab navigation |
| `escapeHtml(str)` | state.js | HTML escaping for user content |
| `initFirebase()` | firebase-sync.js | Firebase initialization with 3s fallback |
| `setupUserAuth(pin)` | firebase-sync.js | PIN hash + Firebase path setup |
| `mergeRemoteState(data)` | firebase-sync.js | Consolidated merge — remote wins for conflicts (used when remote is newer) |
| `mergeRemoteCollectionsIntoLocal(data)` | firebase-sync.js | Additive merge — local wins for conflicts, adds remote-only entries (used when local is newer) |
| `mergeDashboardSnapshots(local, remote)` | firebase-sync.js | Dedup+merge dashboardSnapshots arrays by capturedAt |
| `loadFromLocalStorage(finalize)` | firebase-sync.js | Load from localStorage (finalize=true sets all flags) |
| `loadFromFirebase()` | firebase-sync.js | Initial Firebase load |
| `setupRealtimeSync()` | firebase-sync.js | Cross-device realtime listener |
| `setupMainAppTasksSync()` | firebase-sync.js | Sync tasks from index.html |
| `createCheckpoint(name)` | firebase-sync.js | Save checkpoint to localStorage |
| `showCheckpointManager()` | firebase-sync.js | Modal with checkpoint list |
| `restoreCheckpoint(index)` | firebase-sync.js | Restore from checkpoint |
| `forceUploadToCloud()` | firebase-sync.js | Bypass guards, push to Firebase |
| `forcePullFromCloud()` | firebase-sync.js | Bypass guards, pull from Firebase |
| `saveData()` | firebase-sync.js | Main save (5 guards + localStorage + Firebase) |
| `renderDeadlines()` | deadlines.js | Deadlines tab rendering |
| `addNewDeadline()` | deadlines.js | Show add deadline modal |
| `submitNewDeadline()` | deadlines.js | Save new custom deadline |
| `toggleDeadlineDone(index)` | deadlines.js | Toggle deadline completion |
| `submitDeadlineGrade(index)` | deadlines.js | Submit grade for deadline |
| `syncDeadlineToGrades(d, done, grade)` | deadlines.js | Sync deadline grade to courseStructures |
| `deleteDeadline(index)` | deadlines.js | Delete a deadline |
| `toggleCompletedDeadlines(month)` | deadlines.js | Toggle collapsed completed rows per month |
| `syncClinicalToMonthlyPlanner()` | import-system.js | Incremental clinic→planner sync (respects hiddenClinicTasks, userEdited) |
| `dedupAppointments()` | import-system.js | Scan/remove duplicate appointments by name+date+time, clean orphaned clinic tasks |
| `loadCourseGrades()` | grades.js | Grade calculator rendering |
| `calculateNeeded()` | grades.js | "What grade do I need" calculator |
| `syncGradeToDeadline()` | grades.js | Sync grade to deadline tab |
| `loadExamCourseContent()` | exam-content.js | Exam content study tracker |
| `ensureCompetenciesInitialized()` | clinical.js | Init/migrate competencies from DEFAULT_COMPETENCIES (call from init paths only, NOT render) |
| `initClinicalTab()` | clinical.js | Initialize clinical tab (patients + appointments + procedures) |
| `renderCompetencies()` | clinical.js | Competencies rendering — evidence cards, search/filter, milestones, D3 deadlines, by-patient view. Saves/restores scroll position. |
| `renderEvidenceCards(item, catKey)` | clinical.js | Rich evidence cards with type badges (procedure/manual/backfill/import), patient links, remove button |
| `renderReviewQueue()` | clinical.js | Auto-link review queue banner. Click opens DOM overlay panel (NOT showCustomConfirm). |
| `renderCompSearchBar()` | clinical.js | Search input + status filter chips (All/Not Started/In Progress/Completed/Planned) |
| `renderByPatientView(container)` | clinical.js | Alternative view grouping requirements by patient. Uses getValues() on importedRequirements. |
| `openCompQuickRecord(itemId)` | clinical.js | Quick record modal — patient dropdown, date, notes. Creates procedure + links to competency. |
| `setCompItemStatus(cat, id, status)` | clinical.js | Update competency item status. Toggle (click active = revert). Preserves procedure-linked entries. |
| `adjustCompItem(cat, id, delta)` | clinical.js | Increment/decrement competency count. Creates/removes evidence entries. Calls renderDashboard(). |
| `persistExpandedState()` | clinical.js | Save expanded categories to roadmapData + localStorage. MUST call safeLocalStorageSet(). |
| `recordProcedure(data)` | clinical.js | Create procedure record with competency linking |
| `deleteProcedure(procId)` | clinical.js | Delete procedure + unlink from competencies. MUST set clinicalDataDirty before cascade. |
| `completeAppointment(aptId)` | clinical.js | Completion cascade: deadline+planner+patient+procedure prompt |
| `uncompleteAppointment(aptId)` | clinical.js | Reverse cascade |
| `linkProcedureToCompetencies(proc)` | clinical.js | Add evidence entries to competency items |
| `renderProceduresList()` | clinical.js | Procedures sub-tab list view |
| `toggleAppointmentStatus(aptId, evt)` | clinical.js | Complete/uncomplete appointment toggle |
| `getProceduresForPatient(patientId)` | clinical.js | Filter procedures by patient |
| `getProceduresForCompetency(itemId)` | clinical.js | Filter procedures by competency item |
| `initDailyPlanner()` | daily-planner.js | Daily planner initialization (+ auto-populate from appointments) |
| `dpSyncAppointmentsToTimeline()` | daily-planner.js | Sync today's appointments to daily timeline |
| `initMonthlyPlanner()` | monthly-planner.js | Monthly planner initialization (+ buildCurrentWeekSchedule) |
| `buildCurrentWeekSchedule()` | monthly-planner.js | Pre-build weekly schedule for Stim Calc cross-app |
| `mpHideClinicTask(taskId, aptId)` | monthly-planner.js | Hide clinic task from planner |
| `mpUnhideClinicTask(aptId)` | monthly-planner.js | Restore hidden clinic task |
| `renderDashboard()` | init.js | Mission Control tab (smart counters, readiness score, alerts, pace projections) |
| `rerenderMissingNotesSection()` | init.js | Partial re-render: missing notes only (preserves scroll/details state) |
| `rerenderTodoListSection()` | init.js | Partial re-render: todo list only (preserves scroll/details state, refocuses input) |
| `renderGraduationPrep()` | init.js | Graduation Prep tab rendering (externship, CDCA, INBDE, job search) |
| `updateHeadlineTarget(type, val)` | init.js | Edit clinic headline target (completed is smart-derived) |
| `updateGradPrep(cat, field, val)` | init.js | Save graduation prep field |
| `findCompetencyItem(itemId)` | state.js | Find competency item across all categories |
| `PROCEDURE_TYPES` | state.js | Maps competency category keys to display names |
| `switchScheduleSubTab(subTabId)` | state.js | Toggle monthly/daily sub-tab in Schedule tab |
| `toggleAcademicsSection(sectionId)` | state.js | Toggle accordion in D3 Academics tab |
| `getSmartAppointmentCount()` | state.js | Multi-source appointment aggregation (appointments + planner + patient visits) |
| `getSmartProcedureCount()` | state.js | Multi-source procedure aggregation (records + competency manual adjustments) |
| `calculateGraduationReadiness()` | state.js | Weighted readiness % across 14 competency categories |
| `getCompetencyGaps()` | state.js | Items at 0% progress or behind pace for graduation |
| `calculatePaceProjection(count, target)` | state.js | "At current pace, hit target by [date]" |
| `navigateToEntity(type, id)` | state.js | Cross-tab deep linking (patient, appointment, procedure, competency, deadline) |
| `backfillClinicalData()` | clinical.js | One-click backfill: auto-complete past apts, create proc records, evidence entries, link patients |
| `autoSuggestClinicalDeadlines()` | deadlines.js | Generate soft deadline suggestions from competency gaps before externship |
| `dpRenderClinicDayBanner()` | daily-planner.js | Clinic day banner with patient list, completion tracking, post-clinic summary |
| `parseMissingNotesBlock(text)` | patients.js | Parse MISSING_NOTES block (7 pipe-delimited fields per note) |
| `parseTodoListBlock(text)` | patients.js | Parse TODO_LIST block (5 pipe-delimited fields per item) |
| `parseImportAppointmentBlock(text)` | patients.js | Parse PATIENT:/CHART:/DATE:/TIME:/PROCEDURE: appointment block from unified import |
| `renderMissingNotesSection()` | init.js | Dashboard section: capacity bar, checkable list, faculty cross-ref, alert banner |
| `renderTodoListSection()` | init.js | Dashboard section: inline quick-add, checkable list with source badges |
| `dashboardAddTodo()` | init.js | Quick-add handler from dashboard input |
| `initPeriodicReview()` | periodic-review.js | PR Review tab entry point — renders all 12 sections |
| `renderPRHeader(pr2)` | periodic-review.js | Section 1: title, review date, period |
| `renderPRDashboardSummary(pr2, snap)` | periodic-review.js | Section 2: SPS dashboard comparison table (10 categories) |
| `renderPRAdminStats(pr2, snap)` | periodic-review.js | Section 3: admin stats comparison (9 metrics) |
| `renderPRCompletedProcedures(pr2)` | periodic-review.js | Section 4: paste-in procedure table |
| `renderPRInProgressProcedures(pr2)` | periodic-review.js | Section 5: editable in-progress table |
| `renderPRDepartmentAudit(pr2, comp)` | periodic-review.js | Section 6: 6 dept cards with requirements checklists |
| `renderPRNeededTable(comp)` | periodic-review.js | Section 7: auto-computed needed summary |
| `renderPROtherRequirements(pr2, comp)` | periodic-review.js | Section 8: 7 non-procedural dept checklists |
| `renderPRSubjectiveReport(pr2)` | periodic-review.js | Section 9: rich text editor + PR1 reference + talking points |
| `renderPRPatientRoster(pr2, patients)` | periodic-review.js | Section 10: patient table with reliability dots + NEW badges |
| `renderPRPatientWriteups(pr2, patients)` | periodic-review.js | Section 11: collapsible patient cards with inline editing |
| `exportPRToPDF()` | periodic-review.js | Section 12: lazy-load html2pdf.js, generate PDF with footer |
| `getPR2Data()` | periodic-review.js | Safe accessor for roadmapData.periodicReviews.pr2 |
| `savePR2Field(field, value)` | periodic-review.js | Save pr2 field + localStorage + Firebase |
| `ensureInProgressDefaults(pr2)` | periodic-review.js | Pre-populate in-progress defaults (returns true if populated, caller saves with guards) |
| `getMissingNotesAlertLevel(count)` | state.js | Returns 'GREEN'/'YELLOW'/'RED' based on pending count |
| `getMissingNotesPending()` | state.js | Returns array of pending missing notes |
| `getMissingNotesCompleted()` | state.js | Returns array of completed missing notes |
| `toggleMissingNoteStatus(noteId)` | state.js | Toggle note pending/completed + save |
| `clearCompletedMissingNotes()` | state.js | Delete all completed notes + save |
| `getMissingNotesFacultyMatches()` | state.js | Cross-ref faculty with upcoming appointments |
| `getTodoPending()` | state.js | Returns array of pending to-do items |
| `getTodoCompleted()` | state.js | Returns array of completed to-do items |
| `addTodoItem(desc, source, detail)` | state.js | Create new to-do item with auto-ID + save |
| `toggleTodoStatus(todoId)` | state.js | Toggle item pending/completed + save |
| `clearCompletedTodos()` | state.js | Delete all completed todos + save |
| `getTodoSourceBadgeColor(source)` | state.js | Returns hex color for source badge |
| `getAllPatientRecords()` | patients.js | Merge+dedup patientRecords + clinicalData.patients by chart number then name. Use for ALL lookups/renders/edits. |
| `getPatientRecords()` | patients.js | Returns patientRecords only (narrow store). Fill-merge uses normalizeChartNumber() to prevent re-injecting defaults with different leading-zero IDs. |
| `normalizeChartNumber(chart)` | patients.js | Strip leading zeros for matching: "079118"→"79118". Used by fill-merge, findByNormalizedChart, getAllPatientRecords dedup. |
| `findByNormalizedChart(records, rawChart)` | patients.js | Find patient record ID by normalized chart number. Exact ID first, then normalized scan. |
| `migrateLeadingZeroDedup()` | patients.js | One-time migration: consolidate duplicate records from leading-zero chart mismatch. Gated by `leadingZeroDedupDone_v1`. |
| `renderPatientsSidebar()` | patients.js | Sidebar list with reliability grouping (green/yellow/red), search, uses getAllPatientRecords() |
| `renderPatientRecord(patientId)` | patients.js | Patient detail view — uses getAllPatientRecords() for merged lookup |
| `savePatientField(element)` | patients.js | Contenteditable save handler — uses getAllPatientRecords() for merged lookup |
| `setPatientReliability(patientId, r)` | patients.js | Set reliability dot color — uses getAllPatientRecords() for merged lookup |
| `selectPatient(patientId)` | patients.js | Set active patient, render sidebar + record, mobile layout toggle |
| `parseClinicalBrief(text)` | patients.js | Parse CLINICAL_BRIEF block — 10 KEY:value fields with multi-line continuation, returns brief object keyed by chartNumber |
| `renderClinicalBrief(patient, patientId)` | patients.js | Render 7-section Clinical Brief HTML — SNAPSHOT always visible, other 6 sections accordion on mobile, flat scroll desktop. Uses `formatClinicalDisplay()` for non-flaggedConcerns sections. Parses (1),(2) in flaggedConcerns to `<ol>` |
| `formatClinicalDisplay(rawText)` | patients.js | Pure display formatter — escapes text, adds line breaks before Phase/URGENT/SHORT-TERM/MEDIUM-TERM/LONG-TERM headers, sentence breaks for non-sectioned text, color-codes tooth numbers/costs/keywords. CSS classes: `fc-teal`, `fc-red`, `fc-blue`, `fc-purple`, `fc-amber`, `fc-green`, `fc-hv`, `fc-tooth`, `fc-dim`. Used by renderMiniReview() and renderClinicalBrief(). Zero content change. |
| `getLastCompletedVisit(patient, patientId)` | patients.js | Returns `{ date, procedures, provider }` from most recent completed appointment. 3-way patient matching (id, normalized chart, name). Returns null if none found. Used by renderMiniReview() for rich last-visit display. |
| `renderMiniReview()` | patients.js | Mini Review tab — read-only summary of all patients. Uses getAllPatientRecords() + getLastCompletedVisit() + getNextScheduledVisit(). Sorted by reliability then alpha. Shows: reliability dot, name, chart#, phone, HIGH VALUE, last/next visit with procedure details, clinical brief snapshot, tx completed, tx plan. No state mutation. |
| `migratePerioNoiseCleanup()` | patients.js | One-time migration: strips routine perio IDs from importedRequirements on non-periodontitis patients. Gated by `perioNoiseCleanupDone_v1` localStorage flag |
| `createPatientRecord(overrides)` | patients.js | Single factory for new patient record shape. All 4 creation sites use it. New fields (like `phone`) only added here. |
| `parsePatientRecord(text)` | patients.js | Parse PATIENT_RECORD block — continuation lines: any non-key line appends to current field (no 2-space indent required) |
| `parsePatientUpdate(text)` | patients.js | Parse PATIENT_UPDATE block — same lenient continuation logic as parsePatientRecord. Supports NOTES_APPEND and MEDICAL_HX_APPEND special fields. PATIENT_UPDATE auto-creates records for unknown chart numbers. |
| `parseRequirementsMatch(text)` | patients.js | Parse REQUIREMENTS_MATCH block — now captures HIGH_VALUE, PRIORITY_NOTES, stores canFulfill on patient |
| `computeRequirementMatches(patient)` | patients.js | Uses patient.importedRequirements[] (authoritative) with keyword fallback for pre-import patients |
| `initUI()` | init.js | Main UI initialization (merges deadlines, restores state) |
| `init()` | init.js | App entry point (calls initFirebase) |

---

## COMPETENCIES SYSTEM V2 (Manual-Count Model — Apr 2 2026)

Competencies live at `roadmapData.clinicalData.competencies` and are initialized from `DEFAULT_COMPETENCIES` (in clinical.js).

**Ground Truth:** `docs/GROUND_TRUTH_REQUIREMENTS.md` — the SINGLE source of truth for all requirement IDs, counts, deadlines, and completion status. Last updated 2026-04-02.

**V2 Model**: Flat manual counts. Each item: `{ id, text, required, completed, note, lastVerified, d3Deadline, isSummative }`. No evidence arrays. Counts change ONLY via REQUIREMENTS_STATUS import or inline +/- edits. COMPLETED_TODAY creates procedure records but does NOT touch competency counts.

**V2 UI**: Atlas Console design system (`cv2-*` CSS classes). Light theme (#f7f5ef). 3 panels: milestone KPI strip (sticky), D3 deadline alert + category accordion with +/- editing, What's Next. Mobile-first (44px touch targets).

**V2 Merge**: Timestamp-based — most recent `lastVerified` wins. Fallback: `Math.max` of counts.

**14 Categories:** fixed, operative, dentures, rpd, srp, endo, oralsurg, peds, perio, grouppractice (D3), grouppractice4 (D4), txplanning, geriatrics, externship. See `docs/GROUND_TRUTH_REQUIREMENTS.md` for all ~140 requirement IDs.

**Key functions:** `getCompetenciesData()`, `calculateCategoryStats()`, `calculateOverallStats()`, `renderCompetencies()` (V2 3-panel), `adjustCompItem()`, `setCompItemStatus()`, `cv2ToggleCategory()`, `cv2EditCount()`, `cv2ShowPipeline()`, `mergeCompetencies()` (timestamp-based), `getSmartProcedureCount()` (V2: no completionEntries)

**Deleted in V2** (commit `f496565`): `completionEntries[]`, `linkProcedureToCompetencies`, `unlinkProcedureFromCompetencies`, `autoLinkReviewQueue`, `renderEvidenceCards`, `renderUnlockChain`, `renderByPatientView`, `openReviewQueuePanel`, `acceptReviewSuggestion`, `rejectReviewSuggestion`, `dismissReviewItem`, `autoLinkProcedureToCompetencies`, `matchProcedureToCompetencies`, `addToReviewQueue`, `isItemUnlocked` — 14 functions, ~623 lines

---

## CONSULT REFERENCES FOR

- **Tabs and UI structure** -> [references/tabs-and-rendering.md](references/tabs-and-rendering.md)
- **State and data details** -> [references/state-and-data.md](references/state-and-data.md)
- **Grade calculator and deadlines** -> [references/grades-and-deadlines.md](references/grades-and-deadlines.md)
- **Clinical and competencies** -> [references/clinical-and-competencies.md](references/clinical-and-competencies.md)
- **Monthly and daily planner** -> [references/monthly-and-daily-planner.md](references/monthly-and-daily-planner.md)
- **Firebase sync and checkpoints** -> [references/sync-and-firebase.md](references/sync-and-firebase.md)
- **Complete function index** -> [references/function-index.md](references/function-index.md)

---

## RED FLAGS — STOP AND CHECK

If you see ANY of these in code you're writing:
- Save called without `saveData()` (e.g., direct Firebase write)
- Using `state` instead of `roadmapData` (wrong variable name)
- Using `new Date('2026-02-18')` instead of local timezone parsing
- Arrays instead of objects for Firebase-stored data
- Modifying `STATIC_DEADLINES` instead of `roadmapData.editedDeadlines`
- Missing `saveData()` after any `roadmapData` mutation
- Removing or weakening any of the 5 sync guards
- Setting `_version: Date.now()` in defaults (must be 0)
- Using array index as deadline key (use `getDeadlineId()` for stable IDs)
- Computing `getDeadlineId()` AFTER mutating deadline fields — MUST use `deadline._originalStableId` for persistence keys
- Not checking `saveData()` return value in CRUD functions — must show error toast if returns false
- Shallow grades merge: `{ ...roadmapData.grades, ...(data.grades) }` — MUST deep-merge per course
- Using native `alert()`/`confirm()`/`prompt()` — use `showCustomAlert()`/`showCustomConfirm()`/`showToast()` from state.js
- Calling `mergeRemoteState(data)` without first loading localStorage in `loadFromFirebase()`
- Setting sync flags (`isInitialLoad = false`) AFTER `initUI()` — MUST be BEFORE, wrapped in try/catch
- Calling `mergeRemoteState()` without comparing `lastSaved` timestamps — local-newer data gets overwritten
- Missing `safeLocalStorageSet()` BEFORE `saveData()` in CRUD functions — guard blocks lose changes silently
- Using `||` instead of `??` for `done`/`grade` fields — `done || false` loses explicit `false`, `grade || null` loses grade of 0
- Not updating `editedDeadlines[id].done` when completing a previously-edited deadline — stale `done:false` wins on reload
- Missing `_originalStableId` fallback in completedDeadlines restore loop — post-edit `getDeadlineId()` won't match stored key
- Deploying JS changes without bumping `?v=` cache-busting params on `<script src>` tags
- Editing custom deadline date/name/weight without updating `roadmapData.customDeadlines[deadline.id]` — `editedDeadlines` only applies to STATIC deadlines in initUI; custom deadlines load from `customDeadlines` which must ALSO be updated
- Testing only with NEW custom deadlines instead of editing EXISTING ones — custom-vs-static code paths differ and bugs only surface with real user data
- Adding a new field to `roadmapData` without updating ALL 4 merge/restore sites + mergeRemoteCollectionsIntoLocal in firebase-sync.js — field gets silently wiped on every sync/refresh/restore/checkpoint
- Adding a new collection field without adding it to `isEmptyState()` in state.js — Guard C silently blocks saves when only that field has data
- Using `data.arr || local.arr || []` for array fields instead of a proper merge function — empty `[]` is truthy and discards local data
- `syncClinicalToMonthlyPlanner()` must use incremental sync, NOT nuke-and-rebuild — respect `hiddenClinicTasks` and `userEdited` flags
- Deleting a `clinic_*` task without adding appointment to `hiddenClinicTasks` — sync will recreate it
- Import dedup by `patientId` only without secondary name-based check — mismatched IDs create duplicates
- Calling `syncClinicalToMonthlyPlanner()` unconditionally in `initMonthlyPlanner()` without `clinicalDataDirty` gate
- Skipping `mergeRemoteState()` entirely when local is newer — MUST use `mergeRemoteCollectionsIntoLocal()` instead to preserve remote-only entries from other browsers/devices
- Adding real data values to `getDefaultRoadmapData()` grades (e.g., `oralmed: { quiz1: 100 }`) — makes `isEmptyState()` return false for defaults, bypassing Guard C
- Checking auto-generated data in `isEmptyState()` — `exams` (from static list) and `competencies` (auto-initialized from DEFAULT_COMPETENCIES) must NOT count as real user data
- `initUI()` auto-save triggers (`setTimeout(() => saveData())`) without `hasLoadedFromCloud && !awaitingFirebaseLoad` guards — can save defaults to Firebase during race
- Calling `saveData()` inside a render function (e.g., `getInProgressProcedures()` pre-populating defaults) — render functions fire before sync guards may be set; extract side-effects to the caller with guards
- Adding user-editable fields to `periodicReviews.pr2` without adding them to `hasPeriodicReview` check in `isEmptyState()` — Guard C blocks Firebase saves when only those fields have data
- Inline editors using `change` + `blur` without a `committed` guard flag — both events fire on normal interaction, causing double saves/renders; Escape must also set the flag
- `parsePatientRecord()` fieldMap missing keys that `renderPRPatientWriteups()` displays — imported patients show "Click to edit" for those fields forever
- Inline patient record object literal instead of `createPatientRecord(overrides)` — drift between creation sites when fields are added. ALL new patient records MUST use the factory function.
- Using `!roadmapData.X` as fill guard in `mergeRemoteCollectionsIntoLocal` when X has defaults — defaults always provide the object, so the guard never fires. Use field-level merge instead.
- Calling `getCompetenciesData()` expecting initialization side-effects — it is now a pure read-only accessor. Call `ensureCompetenciesInitialized()` from init paths (initUI, initClinicalTab) instead.
- Using full `renderDashboard()` for todo/note status toggles — use `rerenderTodoListSection()` or `rerenderMissingNotesSection()` to preserve scroll position, `<details>` open state, and input focus.
- Mutating `roadmapData` inside `renderDashboard()` or any render function — use local variables for computed values; state writes belong in save/CRUD paths only.
- Using substring `indexOf()` for faculty name matching — use word-boundary regex (`\b`) or exact field matching to prevent false positives from short names.
- `restoreBackup()` using raw `roadmapData = backup.data` — must use field-by-field reconstruction matching `restoreCheckpoint()` pattern to preserve newer fields.
- Deleting an appointment without cascading to procedure records — `deleteAppointment()` must unlink+delete procedures with matching `appointmentId`, add to `hiddenClinicTasks`, set `clinicalDataDirty = true`.
- Missing `clinicalDataDirty = true` before `saveData()` in clinical CRUD — 10 functions need it: `savePatient`, `saveAppointment`, `deleteAppointment`, `completeAppointment`, `uncompleteAppointment`, `deleteProcedure`, `backfillClinicalData`, `saveProcedureRecord`, `confirmPatientImport`, `confirmClinicalImport`.
- Both appointment import paths (`confirmClinicalImport` in import-system.js, `confirmPatientImport` in patients.js) must call `syncClinicalToMonthlyPlanner()` + `buildCurrentWeekSchedule()` + `mpRenderAllCalendars()` — missing any causes stale Schedule tab or cross-app data.
- Using `{ ...local, ...cloud }` category spread in `mergeCompetencies()` — destroys local `completionEntries`. Use deep item-level merge (union entries by procedureId, max completed, derive status).
- `mergeRemoteCollectionsIntoLocal` not deep-merging patientRecords fields — `addMissing()` fills new-key patients but existing patients need field-level merge for `importedRequirements`, `priorityNotes`, `highValue`, `allergies`, `txCompletedByMe`, `recallHistory`, `activeStatus`.
- Case-sensitive patient name dedup in `getSmartAppointmentCount()` — must use `toLowerCase().trim()` for name comparison in Source 3 visit dedup.
- Using `getPatientRecords()` instead of `getAllPatientRecords()` for patient lookup/render/edit — `getPatientRecords()` only returns `patientRecords`, not `clinicalData.patients`. Functions that display or modify a patient by ID (`renderPatientRecord`, `savePatientField`, `setPatientReliability`) MUST use `getAllPatientRecords()`. Only use `getPatientRecords()` for creation paths that write to `patientRecords` directly.
- `getAllPatientRecords()` without chart-number dedup — `clinicalData.patients` and `patientRecords` use different ID schemes (`pt_` vs `pt-` vs `patient_`). ID-only merge shows duplicates. Must dedup by chart number (exact) then name (case-insensitive).
- `DEFAULT_PATIENT_RECORDS` chart numbers without leading zeros — e.g. `pt_966540` instead of `pt_0966540`. The fill-merge in `getPatientRecords()` re-injects the bad default every init because exact ID match misses the imported record with leading zero. Always use canonical leading-zero chart numbers in defaults.
- `getPatientRecords()` fill-merge using exact ID match only — must use `normalizeChartNumber()` to check if a record with the same normalized chart already exists before adding defaults.
- `addNewPatientRecord()` using `records['pt_' + chart]` for dedup — must use `findByNormalizedChart()` to catch leading-zero variants.
- Using `Math.max(computedTotal, snapshotCount)` in `getSmartProcedureCount()` — SPS snapshot is AUTHORITATIVE (`snapshotCount > 0 ? snapshotCount : computedTotal`). Only appointments use MAX.
- Including non-procedure categories in `getSmartProcedureCount()` — only `fixed`, `operative`, `dentures`, `rpd`, `srp`, `endo`, `oralsurg`, `perio` count. NOT `grouppractice`, `txplanning`, `geriatrics`, `externship`, `peds`.
- Creating procedure records in `applyRequirementCheckoffs()` for REQUIREMENTS_STATUS (absolute-set, `!isDelta`) items — inflates procedure count. Only COMPLETED_TODAY (`isDelta: true`) should create records.
- `total-procedures` or `clinical-summatives` as competency IDs in REQUIREMENTS_STATUS — these are NOT valid competency item IDs and are silently ignored. Use `SPS_DASHBOARD_UPDATE` `TOTAL_COMPLETED` to set procedure count.
- `saveCompItem()` new items missing `completionEntries: []` or `status` field — `undefined` values crash Firebase saves.
- `getDashboardSnapshots()` or `saveDashboardSnapshot()` using array methods without `getValues()` — Firebase array→object conversion crashes `.findIndex()`, `.unshift()`, `.slice()`.
- `dpSyncAppointmentsToTimeline()` setting `done:` instead of `completed:` — all consumers read `block.completed`.
- `initUI()` edited deadline restore using truthiness (`if (edited.date)`) instead of `!== undefined` — empty string edits are silently dropped on reload.
- `handleTextEdit()` in deadlines.js not calling `rebuildUpcomingDeadlines()` — Stim Calc cross-app gets stale deadline text.
- `migrateLeadingZeroDedup()` without FK remapping — orphans appointment/procedure/competency references to deleted patient IDs. Must remap `loserId → winnerId` across all collections. Gated by `leadingZeroDedupDone_v2`.
- Contenteditable elements saving raw user HTML via `onblur="saveData()"` without sanitization — use `this.textContent=this.textContent;` before save to strip HTML.
- Using old competency IDs: `perio-sum-calc` (removed — use srp-calc-1/2/3), `gp-comm` (split into gp-comm-workshop/gp-comm-form-txplan/gp-comm-sum-txplan), `fixed-units` (now `fixed-units-total`), `fixed-implant` (now `fixed-implant-crown`). See `docs/GROUND_TRUTH_REQUIREMENTS.md` for canonical ID list.
- Adding d3Deadline to Fixed Pros items — Fixed formatives/summatives are cumulative by D4, NOT D3 deadlines. Only perio 3rd-year summatives, GP D3 items, OS 3rd-year, RS 545, and Geriatrics PH 541 have D3 deadlines.
- Generating REQUIREMENTS_STATUS (Format D) for clinical procedure counts without explicit user confirmation — inflates competency tracker with no procedure record backing. Use COMPLETED_TODAY (Format C, isDelta=true) for patient-level procedure tracking instead.
