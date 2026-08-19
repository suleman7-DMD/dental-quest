# CLAUDE.md - Dental Student Quest

## CRITICAL RULES

### Development Philosophy (ALWAYS APPLY)
- **Never assume constraints.** Do not pre-compromise features, scope, or ambition. The user has AI-augmented development velocity.
- **No time estimates.** Never estimate how long something will take. Just describe the work.
- **Vision before scope.** Explore the ideal unconstrained version FIRST. Only scope down when explicitly asked. Never suggest "a simpler approach" unprompted.
- **Match the user's ambition.** This codebase has 22k-line apps, 12-module architectures, cross-app Firebase sync with 6 guards, pharmacokinetic models, and clinical import systems with 8 block types. Don't patronize with "start small."
- **No hedging.** Never say "realistically," "given your constraints," "that's ambitious but," or "a good MVP would be."
- **"Dream big" trigger.** When the user says "dream big" → invoke the `vision-first` skill.

### Never Rebuild Entire Files
- Body-comp is ~22,444 lines. Use surgical `Edit` tool only. Read section first.
- **Split apps** (index.html: 12 modules, graduation-roadmap: 12 modules, stim-calc: 12 modules) — surgical edits on individual JS module files. `js/d3-roadmap/` deleted; modules in `js/graduation-roadmap/`. `grades.js` and `exam-content.js` retired in the Aug 2026 D4 overhaul (academics tab removed; `grades`/`exams` state fields retained for schema compat).

### Date Parsing (COMMON BUG)
```javascript
// WRONG: new Date('2026-02-02')  — off-by-one in EST
// CORRECT:
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```
- Never use `.toISOString().slice(0,10)` — use `getLocalDateString(date)`.
- **`parseMDYDate()`**: Use for `MM/DD/YYYY` dates (e.g., recall history). `parseLocalDate()` is `YYYY-MM-DD` only.
- `calculatePaceProjection`: `daysSoFar` must use `Math.floor` (not `Math.ceil`).

---

## COMMON BUG PATTERNS

### JS Language Traps
- **Empty array truthy**: `[] || defaults` → `[]`. Check `.length` not truthiness.
- **`||` vs `??`**: `|| default` treats 0/false as falsy. Use `?? default` for numeric/boolean fields (includes `done`/`grade`).
- **Circular calculations**: A computed value must never fall back to itself as input.
- **Wrong field names**: Verify against `getDefaultState()` or `state.js` defaults (e.g., `goalWeight_lbs` not `goalWeight`).
- **onclick string IDs**: `onclick="fn('${taskId}')"` not `onclick="fn(${taskId})"`.
- **XSS in innerHTML**: ALL user text MUST use `escapeHtml()` in innerHTML.
- **`completedTasks` object wrapper**: `getValues(completedTasks)` returns `[{id, value, completedAt}, ...]`. Use `.some(c => (c.value || c) === String(taskId))`.

### Firebase Save Safety
- **`undefined` kills saves**: Firebase rejects `undefined` in `.set()` — use `?? null` or `?? false`. One `undefined` crashes ALL saves silently.
- **`_version: Date.now()`**: Causes data wipe. Must be 0 in defaults.
- **CRUD localStorage safety**: ALL CRUD functions MUST call `safeLocalStorageSet()` BEFORE `saveData()`.
- **No `saveData()` in render paths**: Render functions must NEVER call `saveData()`. Save from caller with `hasLoadedFromCloud && !awaitingFirebaseLoad` guards.
- **No state mutation in render paths**: `renderDashboard()` must NOT write back to `roadmapData`. Use local variables.
- **`initUI` auto-save guards**: Both `setTimeout(() => saveData(), ...)` in initUI MUST check `hasLoadedFromCloud && !awaitingFirebaseLoad`.
- **Double `loadData()`**: Causes race conditions. Verify orphan calls before adding.
- **Failsafe timer**: Must set `hasLoadedFromCloud = true`, `isInitialLoad = false`, `roadmapData._dataLoaded = true`. (Flags set manually, no `markInitialLoadComplete()` function.)
- **`clinicalDataDirty = true` before ALL clinical CRUD**: 29 functions require this — patient CRUD (save/delete/add/field/reliability), appointment CRUD (save/delete/complete/uncomplete), procedures (record/delete/backfill), competencies (adjust/setStatus/delete/save/notes/saveNote/reset), imports (confirmPatient/confirmClinical), `savePatientField`, `toggleMissingNoteStatus`, `clearCompletedMissingNotes`, cross-sync paths (`submitDeadlineGrade`, `toggleDeadlineDone` uncomplete, `mpToggleTaskComplete` fallback, `tsFixRebuildDeadlines`).
- **Fallback timers = data wipe**: DOMContentLoaded 3s/6s timers must check BOTH `awaitingPinEntry` AND `awaitingFirebaseLoad`. 15s safety valve.
- **Guard F**: `validateStateIntegrity()` must validate `periodicReviews`, `competencies`, `missingNotes`.
- **Firebase array→object corruption**: ALL collection access MUST use `getValues()` for reads. Applies to: `appointments`, `completedProcedures`, `patientRecords`, `completedTasks`, `customTasks`, `customDeadlines`, `dashboardSnapshots`, `briefHistory`, `importedRequirements`, competency `sections`/`items`, any stored collection. NEVER use `Object.values()` on Firebase-stored data.
- **`showCustomConfirm()` already escapes**: Function calls `escapeHtml(message)` internally. Callers must NOT pre-escape — causes double-encoding (`&` → `&amp;amp;`).
- **`propagateClinicalChanges()` calls dpSync**: Already calls `dpSyncAppointmentsToTimeline()` internally. Do NOT call dpSync separately after propagation — causes duplicate sync.

### Sync & Merge Rules
- **`mergeRemoteState`**: Compare `lastSaved` — if local newer, call `mergeRemoteCollectionsIntoLocal(data)` (NOT skip entirely).
- **Deep merge required**: `patientRecords` must use per-patient field-level IIFE merge (local wins, remote fills gaps). NEVER flat spread `{ ...local, ...remote }`. Same for `todoList.items`, `graduationPrep`, `clinicHeadlines`.
- **`mergeRemoteCollectionsIntoLocal`**: `addMissing(local, remote)` pattern (local wins). Must cover ALL top-level objects. Defaults-provided objects need field-level merge, not `!roadmapData.X` guard. Deep-merge patientRecords fields: `importedRequirements`, `priorityNotes`, `highValue`, `allergies`, `txCompletedByMe`, `recallHistory`, `activeStatus`.
- **Auto-push when local newer**: `finishFirebaseLoad()` → deferred `saveData()` at 500ms. Also pushes when Firebase empty/poisoned.
- **Flag ordering**: ALL sync flags MUST be set BEFORE `initUI()`. Wrap `initUI()` in try/catch.
- **`reconstructState(source, {strategy, fallback})`**: Single function (firebase-sync.js) with 3 strategies: `'remote-wins'`, `'stored-wins'`, `'source-wins'`. **New fields only need adding here.** Key: todoList spread order flips between strategies; competencies arg order flips; patientRecords merge depth varies. **Tombstone filtering**: After merge, purges records present in `deletedAppointmentIds`/`deletedProcedureIds`/`deletedPatientRecordIds` (skipped for `source-wins`).
- **Top-level tombstones (Aug 2026)**: `roadmapData.deletedD4EventIds` + `deletedCriticalReminderIds` — siblings of `d4Events`, NOT under clinicalData. Written by `d4DeleteEvent()`/`mpDeleteReminder()` (id → ISO timestamp) BEFORE `safeLocalStorageSet`. Unioned + purged in BOTH `reconstructState` (purge skipped for `source-wins`) and `mergeRemoteCollectionsIntoLocal` (`addMissing(..., deletedIds)` + purge loop). In defaults, live init, and `isEmptyState()`. Without them the key-union merge resurrects deletes from other devices.
- **`archivedAt` newer-wins**: EVERY archive toggle (`setPatientArchived`, `archiveAllPatients` bulk) must set `archivedAt = new Date().toISOString()`. Factory: `archived: false, archivedAt: null`. Both merge sites (reconstructState patientRecords IIFE + mergeRemoteCollectionsIntoLocal) apply `if (remAt && remAt > locAt) { archived = remote.archived ?? false; archivedAt = remAt }` — in reconstructState compare PRISTINE `local[id]` values (generic fill loop can copy remote archivedAt without archived). No archivedAt on either side → legacy gap-fill only.
- **`mergeRemoteCollectionsIntoLocal`**: Separate from `reconstructState` — mutates roadmapData in place. NOT refactored into it.
- **`mergeCompetencies()` (V2)**: Timestamp-based — most recent `lastVerified` wins. If neither, `Math.max` of counts. First arg wins STRUCTURE conflicts. `source-wins` passes source first; others pass fallback first.
- **Cross-section dedup**: Before adding cloud section with unknown key, checks if items exist in ANY local section (by ID). Prevents duplicates.
- **Migration versioning**: When DEFAULT_COMPETENCIES changes, ALWAYS bump migration version. Old flags prevent re-sync.
- **`syncSchemaFields()`**: Runs every `initUI()`. Syncs `d3Deadline`, `rules`, `text`, `required`, `isSummative`, `d4Carryover`. Also removes orphaned categories/items not in DEFAULT_COMPETENCIES. NEVER sync `completed`, `status`, `note` — user data.
- **`resetCompetencies()`**: Uses `forceUploadToCloud()` (not debounced save). Clears ALL migration flags.
- **`COMPETENCY_ALIASES`**: Maps old→canonical IDs in `applyRequirementCheckoffs()`.
- **Shallow grades merge**: Use deep per-course IIFE merge. Remote `null`/`undefined` must NOT overwrite local.
- **Array merge with `||`**: Empty `[]` is truthy — `data.arr || local.arr || []` loses local data. Use dedicated merge functions.
- **`loadFromLocalStorage()` patientRecords**: Per-patient field-level merge, not flat spread.
- **`createCheckpoint()` 60s dedup**: Prevents duplicate checkpoints.
- **`visibilitychange`**: Must `safeLocalStorageSet()` after merge + `initUI()` on visible path.
- **`initFirebase()` 3s fallback**: Must check BOTH `awaitingFirebaseLoad` AND `awaitingPinEntry`.
- **Shared storage namespace**: NEVER let two apps share localStorage key or Firebase path.
- **Per-record newer-wins stamps (Aug 2026)**: `getRecordStamp(rec, fields)` + STAMP consts in firebase-sync.js (`STAMP_TODO`/`STAMP_APPT`/`STAMP_TASK`/`STAMP_NOTE`/`STAMP_COMPLETED_DL`). EVERY user-edit CRUD site MUST stamp its record: todos `updatedAt`, appointments `lastUpdated`, planner tasks/custom deadlines/edited deadlines `updatedAt`, missing notes `updatedAt`, completedDeadlines `completedAt`. Both merge sites apply strict-`>` overlays (`overlayKeepNewerLocal` in reconstructState remote-wins; remote-newer overlays in mergeRemoteCollectionsIntoLocal) — a record stamped newer wins regardless of which side's `lastSaved` is newer. Ties/unstamped → base behavior (no ping-pong). New collections must get a stamp field + overlay in BOTH merge sites.
- **`mergePreservedNewerLocal` union push**: Set by remote-wins overlays when a newer-stamped LOCAL copy was kept; `mergeRemoteState` then schedules a deferred 600ms guarded `saveData()` so the merged union reaches the cloud. Strict-`>` + equal-stamps-after-push guarantees the loop terminates.
- **3 more tombstone maps (Aug 2026)**: `deletedTodoIds` (todo id → ISO), `deletedCompletedDeadlineIds` (keyed `sanitizeFirebaseKey(deadlineId)`), `deletedPlannerCompletionIds` (keyed `sanitizeFirebaseKey(taskId)`, matched against `completedTasks` entry `.value`). Written by clearCompletedTodos/cascadeDeletePatient, toggleDeadlineDone-uncheck/deleteDeadline/unmarkLinkedDeadlineDone/cascadeDeleteAppointment, and mpToggleTaskComplete-uncomplete/unmarkPlannerTaskDone. Unioned + purged in BOTH merge sites; purge ONLY when tombstone strictly newer than the record's own stamp (re-add/re-complete after delete survives). In defaults + isEmptyState.
- **`reconstructState` customDeadlines content-sig purge**: Same `date|what|course` signature rule as mergeRemoteCollectionsIntoLocal (skip when deadline id embeds creation-ms newer than `deletedAt`). BOTH merge sites have it — remote-wins used to resurrect deleted deadlines.
- **'hidden' handler push is GATED**: Only pushes to Firebase when `localChangesSinceLastSync` (localStorage flush stays unconditional). Unconditional `.set()` on tab-hide re-uploaded stale full snapshots that clobbered other devices' newer saves. Success handler clears `localChangesSinceLastSync`.
- **'visible' handler merges-then-pushes**: No `!localChangesSinceLastSync` gate. Captures `hadPendingLocal`, fetches cloud; remote newer → `mergeRemoteState` (stamp overlays protect unsaved work) + push union if pending; remote not newer → retry the stuck pending push. Never dead-ends.
- **`scheduleRealtimeRecheck()`**: Realtime `on('value')` events skipped during `isLocalUpdate`/keep-local-grace windows schedule a 12s one-shot re-fetch (re-schedules if windows still open) so a remote save arriving during the deaf window is not permanently missed.
- **`sanitizeFirebaseKey` (state.js, single definition)**: STRIPS `.#$/[]'"\\` chars, string-only input — wrap ids in `String()` at call sites. NEVER redeclare it (a second declaration silently wins by load order).
- **Todo IDs are collision-proof**: `addTodoItem` appends a random suffix — two devices adding items offline the same day can no longer mint the same id and silently overwrite each other on merge.

### Guard C / isEmptyState
`isEmptyState()` prevents saving empty/default data to Firebase:
- Must check ALL user-editable collections. When adding new ones, update `isEmptyState()`.
- Defaults MUST be empty: `completed: 0` in DEFAULT_COMPETENCIES, empty grade objects, no hardcoded values.
- Auto-generated data must NOT trigger: don't check `exams`, check `completed > 0` for competencies.
- Must check: `graduationPrep`, all 9 PR2 fields, `todoList.items`, `missingNotes`, and all fields in isEmptyState table.
- **`dashboardSnapshots` dual-shape**: Firebase may store as object (not array). `isEmptyState` must handle both: `Array.isArray(s) ? s.length > 0 : Object.keys(s).length > 0`.

### Patient Data Integrity
- **`clinicalData.patients` DEPRECATED**: ALL lookups/renders/edits MUST use `clinicalData.patientRecords` or `getAllPatientRecords()`. Never read `patients` in render or CRUD paths.
- **`getAllPatientRecords()` dedup**: Merges both stores. Dedup by chart number then name. Always use for rendering, editing, sidebar, PR roster.
- **Cascade deletes**:

| Function | Must Also Do |
|----------|-------------|
| `deletePatient()` | Delete procedures + write tombstones, unlink competencies, remove planner tasks, add to `hiddenClinicTasks`, set `clinicalDataDirty` |
| `deletePatientRecord()` | Delegate to `cascadeDeletePatient()` — handles all cascade + propagation (incl. todoList cleanup) |
| `deleteAppointment()` | Unlink+delete procedures + write tombstones, add task to `hiddenClinicTasks`, set `clinicalDataDirty` |
| `uncompleteAppointment()` | Delete procedures + write tombstones, unmark deadline/planner, recalc lastVisit |

- **CRUD must merge**: `savePatient()`/`saveAppointment()` MUST spread existing record (`{ ...existing, ...formFields }`).
- **Chart number normalization**: Leading-zero canonical form. `migrateLeadingZeroDedup()` gated by `leadingZeroDedupDone_v1`. FK remapping: `appointments[].patientId`, `completedProcedures[].patientId`, `monthlyPlanner.customTasks[].patientId`.
- **`getPatientRecords()` is read-only**: Injects defaults into memory but does NOT persist. Persistence via next CRUD `saveData()`.
- **Patient `archived` flag (Aug 2026)**: Per-record boolean. Filtering happens at RENDER sites (sidebar, roster, mini review, KPIs), NOT inside `getAllPatientRecords()` — CRUD/restore and accessor-bypassing KPIs must still see archived records. Sidebar has an ARCHIVED section + bulk archive. Merge: `archivedAt` newer-wins (see Sync & Merge Rules); gap-fill (`local.archived === undefined`) kept for legacy records. Mini review counts archived and red separately in its header; post-delete selection prefers first NON-archived record.
- **Skeleton patient records**: auto-created records (e.g. `PATIENT_UPDATE` unknown chart) must carry `name` and `chartNumber` via `createPatientRecord(overrides)`. (`prSavePatientField` no longer exists — field edits go through `savePatientField()`.)
- **PATIENT_UPDATE must validate chart number**: Reject empty (prevents `'pt_'` overwrite).

### Clinical Import System
- **7 block types**: PATIENT_RECORD, PATIENT_UPDATE, REQUIREMENTS_MATCH, SPS_DASHBOARD_UPDATE, APPOINTMENTS, MISSING_NOTES, TODO_LIST — all parseable in one atomic paste. REQUIREMENTS_STATUS removed Aug 2026 (competency counts are manual-only via Competencies tab). CLINICAL_BRIEF removed Aug 2026 (redundant with Record tab). Unrecognized block headers are simply not parsed.
- **Import dedup**: By patient NAME + date + time, not just `patientId`.
- **Clinical Brief RETIRED (Aug 2026)**: All UI/parser/troubleshooting code deleted from patients.js, clinical.js, init.js, patient-todo-tab.js, troubleshooting.js. Stored `clinicalBrief`/`briefHistory` data left DORMANT in Firebase (recoverable); firebase-sync.js merge logic for it deliberately kept (guarded, harmless). Do NOT reintroduce render/parse paths.
- **Multi-line parser**: Lenient — any non-empty line as field continuation, joins with `'\n'`.
- **Parse calls are guarded (Aug 2026)**: `previewPatientImport()` and `confirmUnifiedImport()` wrap `parsePatientImportText()` in try/catch — preview shows an inline error + disables the import button; confirm toasts "nothing was changed" and returns BEFORE `clinicalDataDirty = true`. Keep the guard ahead of any state mutation.
- **Imported requirements**: Stored as `patient.importedRequirements[]`. `computeRequirementMatches()` uses these over keyword fallback.
- **Webchat code fences**: Triple-backtick required. Backup: `docs/claude-webchat-project-instructions.md`.
- **Import auto-completes**: Both confirm paths set `status: 'completed'` for past dates.
- **Dual import propagation**: Both paths MUST call `syncClinicalToMonthlyPlanner()` + `buildCurrentWeekSchedule()` + `mpRenderAllCalendars()`.
- **Import modal defaults**: NEVER set `checked` on destructive-mode checkboxes.
- **Requirement ID matching**: Case-insensitive at both `applyRequirementCheckoffs()` and parse time.
- **`applyRequirementCheckoffs` (V3, Aug 2026)**: COMPLETED_TODAY (`isDelta`) creates procedure records but NEVER touches competency counts/notes. The REQUIREMENTS_STATUS absolute-count path was deleted — NO import path modifies competency counts anymore. Dedup: COMPLETED_TODAY matches on procedure+date+patient.
- **Invalid competency IDs**: `total-procedures` and `clinical-summatives` are synthetic — silently ignored.
- **`PHONE:` field**: In PATIENT_RECORD/UPDATE. Stored as `patient.phone` (pipe-delimited). Display: primary + "+N more". Propagated to profile, mini review, PR roster/writeups, competency popup, sidebar, Active Roster.
- **`DOB:` field (Aug 2026)**: In PATIENT_RECORD/UPDATE. Stored as `patient.dob` (MM/DD/YYYY free text). Shown in profile summary meta row + editable single-line "Date of Birth" field in Patient Information section.
- **Default-injection respects tombstones (Aug 2026)**: `getPatientRecords()` skips `deletedPatientRecordIds` in BOTH default-injection branches (empty-store seed + gap-fill loop) — deleted DEFAULT_PATIENT_RECORDS patients must never resurrect on render.
- **`MEDICAL_HX_APPEND:`**: PATIENT_UPDATE only. Appends to `medicalHx` with `\n\n` (sets `_medicalHxAppend` flag).
- **`PATIENT_UPDATE` auto-creates**: Unknown chart numbers auto-create skeleton via `createPatientRecord()`.
- **`createPatientRecord(overrides)`**: Single factory for all 4 creation sites. New patient fields only need adding here.
- **Perio noise filter**: Routine IDs excluded for non-periodontitis patients. `migratePerioNoiseCleanup()`.
- **Missing Notes**: 7 pipe-delimited fields, dedup by ID, 6-limit. `clinicalData.missingNotes{}`.
- **To-Do list**: 5 pipe-delimited fields. Sources: MANUAL/EMAIL/SCREENSHOT/CLINIC/SYSTEM. `todoList{ items{}, _nextSeq, lastUpdated }`.
- **Dashboard snapshot dedup**: Same `capturedAt` date replaces instead of duplicating.
- **Competency ID changes**: See `docs/GROUND_TRUTH_REQUIREMENTS.md` for canonical list. `COMPETENCY_ALIASES` maps old→new.
- **SPS snapshots**: SPS_DASHBOARD_UPDATE saves a summary snapshot only. Individual competency counts change ONLY via the Competencies tab UI (Format D / REQUIREMENTS_STATUS retired Aug 2026).
- **`showToast(msg, type, options)`**: `{ html: true }` for HTML. Default is `textContent` (safe). `options.duration` overrides auto-hide ms (default 2000, errors 4000) — used by undo toasts (5000).

### Competencies V2 (Manual-Count Model)
- **V2 model**: Flat manual counts. Item shape: `{ id, text, required, completed, note, lastVerified, d3Deadline, isSummative, status, custom, d4Carryover }`. Old evidence-trail model (completionEntries, review queue, unlock chains) was deleted.
- **Counts are manual-only (Aug 2026)**: Change ONLY via the Competencies tab — check-off button (required=1), +/- counters, inline count edit, or edit modal. NO import path touches counts (REQUIREMENTS_STATUS deleted; COMPLETED_TODAY only creates procedure records).
- **`lastVerified`**: Set on every manual edit. Used by `mergeCompetencies()` for conflict resolution.
- **`migrateToCompetencyV2()`**: One-time migration gated by `competencyV2Migrated`. Wipes old fields, seeds verified values. Must NOT delete `item.custom` flag.
- **V2 idempotence guard (Aug 2026)**: `migrateToCompetencyV2()` detects already-V2 data (`any item.lastVerified truthy` — only V2 seed/edits ever set it) and no-ops + re-sets the flag. Restore/import paths clear `competencyV2Migrated` so PRE-V2 backups still migrate; without this guard, restoring a V2 backup would wipe live counts back to the frozen April-2026 seed.
- **V3 orphan removal**: `syncSchemaFields` deletes items missing from DEFAULT_COMPETENCIES — must guard with `!item.custom` to preserve user-added items. V3 must NOT zero manual counts (completionEntries is dead in V2).
- **Summative ring target**: Dynamic count from `isSummative` items (was hardcoded 7, fixed Apr 2026). Fallback to 7 only if zero summatives found.
- **`adjustCompItem()` / `setCompItemStatus()`**: Simple +/- or toggle. Sets `lastVerified`, derives status. Both snapshot `cv2LastChange` (prev completed/status/lastVerified) BEFORE mutating and show an Undo toast (`{ html: true, duration: 5000 }`).
- **`cv2UndoLastChange()`**: One-step undo. Clears `cv2LastChange` before restoring; if the item no longer exists, toasts an error WITHOUT saving.
- **Targeted re-render pattern**: check-off/counter edits call `cv2UpdateItemRow(catKey, itemId)` + `cv2UpdateHeader()` + `cv2UpdateCategoryHeader(catKey)` (row id `cv2row-{catKey}-{itemId}`) — NEVER a full `renderCompetencies()` in the hot path. Each falls back to full render if its DOM anchor is missing.
- **`cv2UpdateItemRow` filter/boundary escapes (Aug 2026)**: Falls back to FULL `renderCompetencies()` when (a) `compSearchQuery` or `cv2ActiveFilter !== 'all'` is active (row may need to leave/enter the filtered list) or (b) the done-boundary flips (`row.classList.contains('cv2-row-done') !== isDone` — carryover alert and done-styling need rebuild). Keep both checks when touching this function.
- **`calculateCategoryStats` clamp**: `totalUnits += item.required ?? 0; completedUnits += Math.min(item.completed ?? 0, item.required ?? 0)` — over-counted items must not inflate %, missing fields must not produce NaN.
- **`saveCompItem()` must set `lastVerified`**: Both add-new (when completed > 0) and edit-existing paths must set `lastVerified = getLocalDateString(new Date())`.
- **Smart counting**: `getSmartProcedureCount()` sums `item.completed` across procedure categories `{ fixed, operative, dentures, rpd, endo, oralsurg, perio }`. SPS snapshot AUTHORITATIVE when exists.
- **`autoLinkReviewQueue`**: DELETED. Field kept as `[]` for schema compat only.
- **V2 UI (unified, Aug 2026)**: Warm Atlas Console design, `cv2-*` CSS classes. Single unified list — NO D3/D4 year tabs. Layout: item-based header (`#cv2header`: %, N/M requirements, days-to-graduation, left/summatives pills) → search + 5 filter chips (all/left/done/summatives/carryover, same-chip click toggles back to all) → expandable D3-carryover alert card (past-deadline unfinished items only) → 13-category accordion with passive D3/D4/D3+D4 year chips. Category bodies build lazily on expand.
- **Pipeline badges**: `importedRequirements[]` on patient records is source. All `'planned'` (yellow) in V2.
- **Migration flag versioning**: ALL restore/import paths must clear 8 flags: `unifiedPatientStoreDone_v1`, `competencyEnhancementsDone_v2`, `competencyEnhancementsDone_v3`, `competencyV2Migrated`, `competencyD3D4SplitDone_v1`, `leadingZeroDedupDone_v2`, `perioNoiseCleanupDone_v1`, `d4EventsSeeded_v1`. Add new flags to ALL 4 sites (importBackup, restoreCheckpoint, importAndRestoreDirectly, resetCompetencies).
- **`resetCompetencies()` double-confirm**: Nested `showCustomConfirm()` + `createCheckpoint('pre-comp-reset')` before wiping.
- **Guard F (V2)**: Auto-converts `dashboardSnapshots` objects→arrays. No `autoLinkReviewQueue` check.
- **`showCustomConfirm()` escapes HTML**: Never pass raw HTML. Use DOM overlays for rich content.
- **`persistExpandedState()`**: MUST call `safeLocalStorageSet()`.
- **`getCompetenciesData()`**: Returns MUTABLE reference — render functions must not mutate through it.
- **`getDashboardSnapshots()` / `saveDashboardSnapshot()`**: Must use `getValues()` before `.findIndex()`, `.unshift()`, `.slice()`.

### D3/D4 Year Data Model (Apr 2026; unified UI Aug 2026)
- **13 categories** (was 14 — `srp` absorbed into `perio` via migration). Each has `yearTarget: 'd3' | 'd4' | 'both'` — now DISPLAY-ONLY metadata driving the passive year chip (`cv2-year-chip`); it no longer filters rendering.
- **Category keys NEVER renamed**: `grouppractice`, `grouppractice4`, `perio`, `txplanning`, `peds`, `oralsurg`, `geriatrics` (both), `fixed`, `operative`, `dentures`, `rpd`, `endo`, `externship` (d4), `grouppractice` (d3).
- **Year tabs DELETED (Aug 2026)**: `cv2ActiveYearTab`, `cv2SwitchYearTab`, `cv2CategoryVisibleForTab`, `cv2ItemVisibleForTab`, `cv2BuildMilestoneStrip`, `cv2BuildD3Alert`, `cv2GetCarryoverBadge`, `cv2GetCarryoverItems`, `cv2ShowPipeline` all removed. Do NOT reintroduce.
- **`d4Carryover: true`** on items: legacy field, kept in schema and still synced by `syncSchemaFields()`. Currently on: `perio-form-reeval-ging`, `perio-sum-reeval-ging`, `gp4-pms`.
- **"D3 carryover" is now deadline-derived**: `cv2BuildCarryoverAlert()` collects items with a `d3Deadline` that has PASSED and `completed < required` (with `seenIds` dedup), rendered as an expandable alert card + row badge + filter chip. NOT based on the `d4Carryover` flag.
- **Completion %**: Strictly item-based — counts competency items where `completed >= required`, NOT milestone appointments/procedures. Updates in real time on counter +/- via targeted DOM updates.
- **`migrateCompetencyD3D4Split()`**: One-time migration gated by `competencyD3D4SplitDone_v1`. Moves leadership items from `grouppractice4` → `grouppractice`, SRP items from `srp` → `perio`, resolves 3 perio duplicate pairs, adds 4 new items. MUST run before `migrateCompetencyEnhancements()` and `syncSchemaFields()`.
- **`syncSchemaFields()` syncs**: `d3Deadline`, `rules`, `text`, `required`, `isSummative`, `d4Carryover`. Also removes orphaned categories not in DEFAULT_COMPETENCIES (prevents stale `srp` from cloud merge).
- **`migrateCompetencyEnhancements()` leadership exclusion**: The gp4-* removal block (line ~1045) has `leadershipInGP` exclusion set for 6 leadership IDs that now correctly live in `grouppractice`. Prevents fresh-install edge case from undoing the D3/D4 migration.
- **Items moved**: Leadership (gp4-posttreat-eval, gp4-aux-tech/asst, gp4-aux-summatives, gp4-rounds-form/sum) → grouppractice. SRP (srp-calc-1/2/3, srp-reeval) → perio.
- **Items deleted**: perio-3rd-ohi/prophy/reeval (duplicates), perio-sum-prophy (split), tx-ohra-1, tx-caries-1 (auto-satisfied), gp-comm-form-txplan, gp-comm-sum-txplan, gp-ohra (not in HTML).
- **Items added**: gp-milestones, perio-sum-prophy-d3, perio-sum-prophy-d4, perio-dc-rotation.

### Task & Schedule System
- **`doToday` only for eod**: Only `urgency === 'eod'` sets `doToday: true`.
- **XP dual counters**: `toggleTask()` must update BOTH `stats.totalXPGained` AND `focusStats.totalXP`. Uncomplete subtracts from ALL 3.
- **Task creation consistency**: ALL 4 creation sites MUST set triageTier/triageOrder/triageDate.
- **StableId before mutation**: Compute `getDeadlineId(deadline)` BEFORE modifying fields.
- **Custom deadline dual-store**: Update BOTH `editedDeadlines` AND `customDeadlines[id]`.
- **DeadlineId in onclick**: `getDeadlineId()` must strip `'"\\`.
- **Nuke-and-rebuild sync**: NEVER delete all + recreate. Use incremental sync with `userEdited` and `hiddenClinicTasks`.
- **Clinic task delete**: `_mpDeleteCurrentTaskConfirmed()` must add to `hiddenClinicTasks`.
- **`syncClinicalToMonthlyPlanner` gating**: Gated by `clinicalDataDirty` flag.
- **TBD deadlines**: Separate "Unscheduled" card on Mission Control.
- **Dynamic deadlines (Aug 2026)**: `STATIC_DEADLINES = []` — ALL deadlines are user-created (`customDeadlines`), rendered month-grouped. Never re-seed static Spring-2026 deadlines.
- **`MP_WEEKS` is dynamic**: Built by an IIFE from the current date (no hardcoded week list). Planner weeks rebase automatically.
- **`d4Events` collection (Aug 2026)**: `roadmapData.d4Events{}` — schedule manager + calendar chips. Seeded once via `d4EventsSeeded_v1` flag (cleared at all 4 restore sites). Merged via `addMissing` in `mergeRemoteCollectionsIntoLocal` and handled in `reconstructState`.
- **`monthlyPlanner.criticalReminders`**: Editable persisted card on Mission Control (was static Spring-2026 copy). Object keyed by id; include in merges.
- **Cross-app dedup**: Stim calc dedup by `clinicalAppointmentId` and `date|time|name`.
- **Cross-app write exception**: `toggleMainAppTask()` writes to index.html's Firebase path. Only cross-app write.

### Propagation Requirements

| After | Must Call |
|-------|----------|
| Appointment CRUD | `buildCurrentWeekSchedule()`, `syncClinicalToMonthlyPlanner()`, `dpSyncAppointmentsToTimeline()` |
| Planner task changes | `buildCurrentWeekSchedule()` |
| Deadline mutation | `rebuildUpcomingDeadlines()` |
| `uncompleteAppointment()` | Remove procedure records, recalc patient `lastVisit` |
| `backfillClinicalData()` | `createCheckpoint('pre-backfill')` before mutations |
| Competency adjustment / status toggle | `cv2UpdateItemRow()` + `cv2UpdateHeader()` + `cv2UpdateCategoryHeader()` + `renderDashboard()` |
| `mpToggleTaskComplete` | `dpSyncAppointmentsToTimeline()` |
| Quick-fix schedule changes | `syncClinicalToMonthlyPlanner()`, `buildCurrentWeekSchedule()` |
| Reliability change (`setPatientReliability`) | `propagateClinicalChanges({ patients: true })` |

### Troubleshooting Module
- **`hiddenClinicTasks` key**: Raw `aptId`, NOT `clinic_` prefixed. Value: `{ hiddenAt, taskId }` (not boolean).
- **Quick-fix functions**: Must call BOTH `syncClinicalToMonthlyPlanner()` AND `buildCurrentWeekSchedule()`.
- **`runPostMergeIntegrityChecks(source)`**: Console-only. No saves, no mutations.
- **`mpUnhideClinicTask()`**: Must set `clinicalDataDirty = true`.
- **`mpSaveTask()`**: Must set `userEdited = true` on clinic-synced tasks.
- **`buildCurrentWeekSchedule()`**: Must filter `convertedStaticIds` and `hiddenClinicTasks[apt.id]`.
- **`tsCheckCompetencies()` (V2)**: Checks over-counted and unverified items.
- **`tsFixResyncCompCounts()` (V2)**: Clamps `completed` to `[0, required]`, derives status. Must set `lastVerified` on changed items (prevents merge revert) and call `renderDashboard()`.

### UI & Rendering
- **Flex full-width + flex-wrap**: Container needs `flex-wrap: wrap`, full-width item `flex: 1 1 100%`.
- **Expensive renders**: Never in `updateUI()`/`recalculate()` (runs every 5s). Only on init + navigation.
- **Canvas tooltip**: Recompute `graphWidth`/`pointSpacing` inside `onmousemove`.
- **Division by zero**: Guard with `if (data.length < 2) return`.
- **Duplicate HTML style attributes**: Never pass `style="..."` in extraAttr if element already has `style`.
- **CSS-only tab theming**: `#tab-[name] .existing-class` specificity override. Additive.
- **Patients tab**: Light theme via `#tab-patients` prefix. Mobile: hides metrics, sidebar `position: static`.
- **Mini Review tab**: Read-only. No state mutation, no saves. Rendered from 3 sites: `switchTab`, `propagateClinicalChanges`, `initUI`. Filters out red patients; sorts scheduled-first.
- **Partial re-renders**: `rerenderMissingNotesSection()` and `rerenderTodoListSection()` for targeted updates.
- **Double-fire guard**: Click-to-edit and contenteditable need `committed` boolean. Escape must set flag.
- **Toast onclick**: NEVER `toastEl.style.display = 'none'`. Use `classList.remove('show')` + `setTimeout` auto-clear.
- **`lastVisit` field**: Programmatic: bare `YYYY-MM-DD`. Defaults: pipe-delimited. For date comparison: `split('|')[0].trim()`. Mini review prefers `getLastCompletedVisit()`.
- **Pace badge color order**: Check `pastGraduation` (red) BEFORE `behindSchedule` (yellow).
- **`mpClickCell` end time**: Clamp hour 23 to `'23:59'`.
- **Inline styles vs CSS classes**: NEVER put `background`/`color` in `style=""` if CSS class controls state.
- **Cache-busting**: After JS changes, add `?v=YYYYMMDD` to `<script src>` tags.
- **Stats counters**: `stats.totalTasks` drifts — use live `getValues(tasks)` count.
- **Faculty matching**: `\b` word-boundary for names >= 3 chars; exact match for < 3.
- **fieldMap parsers**: Use `for`+`break` (not `forEach`). Prevents prefix-collision bugs.

### Smart Text Formatting (patients.js)
- **`decodeEntities(str)`**: Decodes pre-escaped HTML entities (`&#039;` → `'`). MUST be called before `escapeHtml()` on all display paths. Fixes double-encoding from imports. Used in `fld()` edit mode, `formatClinicalDisplay()`, `formatRecordField()`, flaggedConcerns, notes, perio values.
- **`formatRecordField(text, fieldType)`**: Read-mode only formatter. Calls `decodeEntities()` → `escapeHtml()` → field-specific formatting. Field types: `medicalHx`, `dentalHx`, `txSummaryBU`, `txCompletedByMe` (sentence breaks + highlights), `medications` (per-med list items + allergy pills), `allergies` (pill badges), `txPlan` (phase headers + sentences), `recallHistory` (pipe-delimited), `activeStatus` (status badges), `priorityNotes` (sentences), `notes`/default (highlights + `<br>`).
- **`rfReflow(text)`**: Joins hard-wrapped lines (from copy-paste imports) back into flowing text. Only preserves `\n` after `.!?` or at double-newline paragraph breaks. All other `\n` → space. Applied in `rfSentences()`, `formatClinicalDisplay()`, and flaggedConcerns.
- **`rfSentences(t, highlight)`**: Splits on sentence boundaries (`. ` + capital or `#`). Outputs `<br>`-joined flowing text (NOT block divs). If `highlight=true`, applies `rfHighlights()` per-sentence. MUST receive raw escaped text (before rfHighlights) so HTML tags don't break the sentence regex.
- **`rfHighlights(t)`**: Inline condition badges (`rf-cond`: ASA, HTN, COPD, etc.), alert badges (`rf-alert`: NEEDED, URGENT, etc.), negative emphasis (`rf-neg`: NOT, NEVER), tooth numbers (`rf-tooth`), arrows (`rf-arrow`), costs (`rf-cost`), dates (`rf-date`). Applied AFTER escapeHtml, per-sentence.
- **Edit mode flow**: `escapeHtml(decodeEntities(val))` → contenteditable plain text → `innerText` on save → clean text stored. `savePatientField()` untouched — no formatting in save path.
- **`formatClinicalDisplay()`**: Enhanced with `decodeEntities()`, `rfReflow()`, condition badges (`rf-cond`), and date highlights (`rf-date`) via `(?![^<]*<\/)` negative lookahead to avoid matching inside existing tags.
- **CSS classes**: `rf-cond` (red condition badge), `rf-alert` (amber alert badge), `rf-neg` (red bold), `rf-med`/`rf-med-list` (medication items), `rf-allergy` (red pill badge), `rf-arrow` (amber), `rf-date` (purple), `rf-tooth` (indigo), `rf-cost` (green), `rf-label` (section divider), `rf-status-ok`/`rf-status-warn`.

---

## PROJECT OVERVIEW

| File | Purpose |
|------|---------|
| `index.html` + `js/dental-quest/*.js` (12 modules) | Main app: gamified tasks, focus mode, financials, calendar, meds |
| `d3-roadmap.html` (REDIRECT SHIM) | Redirects to graduation-roadmap.html |
| `graduation-roadmap.html` + `js/graduation-roadmap/*.js` (12 modules) | Graduation tracker (D4 era): mission control, deadlines, clinical, patients, competencies, schedule, grad prep, to-do tabs, troubleshooting (academics tab retired Aug 2026) |
| `stimulant-elimination-calculator.html` + `js/stimcalc/*.js` (12 modules) | Sleep prediction: pharmacokinetics, circadian, workout planning |
| `body-comp-tracker.html` (~22,444 lines, single file) | Calorie/protein/workout tracking, cross-app ecosystem |
| `lecture-prompt-transformer.html` (~2,800 lines) | Lecture notes prompt builder (standalone) |

- **Ground Truth**: `docs/GROUND_TRUTH_REQUIREMENTS.md` — canonical source for graduation requirement IDs, counts, deadlines, completion status.
- **Brand**: "SULEMAN SHAIKH, DMD". localStorage keys use `dentalQuest*` prefix.
- **URL**: suleman7-dmd.github.io/dental-quest/ | **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: No build system. Push to `main` → live in ~30s.

### Per-App Detail → Skill Files

| Skill | Covers |
|-------|--------|
| `dental-quest-dev` | index.html: modules, urgency, command center, tasks, views, financials |
| `d3-roadmap-dev` | HISTORICAL: old architecture (deleted). Migration debugging only. |
| `stim-calc-dev` | stim-calc: modules, pharmacokinetics, circadian, sleep prediction |
| `body-comp-dev` | body-comp: key locations, mode system, ecosystem, analytics |
| `sully-firebase-patterns` | Cross-app: save guards, sync flags, checkpoints, PIN auth, data flow |

---

## FIREBASE (CRITICAL - DON'T CHANGE)

### Config
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};
```

### PIN Auth
```javascript
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
userPath = 'users/' + hashedPin + '/[appName]';
// appName = 'appData' | 'stimulantCalculator' | 'graduationRoadmap' | 'bodyCompTracker'
```

### Firebase Data Tree
```
users/user_[hashedPin]/
├── appData/             (index.html — tasks, stats, medications, calendar, notebook, financials, focus, commandCenter)
├── stimulantCalculator/ (state: meds, caffeine, sleep, history, workouts, settings)
├── graduationRoadmap/   (grades, deadlines, monthlyPlanner, clinicalData, todoList, graduationPrep, periodicReviews, competencies, patientRecords, dashboardSnapshots, missingNotes)
├── d3Roadmap/           (DEAD — migration fallback only)
└── bodyCompTracker/     (state: profile, today, meals, workouts, weighIns, dailyLogs, gamification)
```

### Sync Pattern (All 4 Apps)
```
Load:  loadFromFirebase() → merge with defaults → initUI()
       Local newer: mergeRemoteCollectionsIntoLocal() → initUI() → deferred saveData()
       Firebase empty/poisoned: loadFromLocalStorage() → push if real data
Save:  saveData() → localStorage IMMEDIATELY → Firebase debounced (2s)
```

### Collection Safety
All collections use **objects with ID keys** (not arrays — Firebase corrupts sparse arrays):
```javascript
generateId(prefix)    // 'meal_abc123'
getValues(collection) // Safe object→array
getCount(collection)  // Safe key count
```

### Cross-App Data Flow
All cross-app reads are READ-ONLY. Exception: `toggleMainAppTask()` writes to index.html's path.
- Stim Calc ↔ Body Comp: projected sleep, meds, caffeine
- Index.html → Body Comp + Stim Calc: medication inventory
- Index.html → Graduation Roadmap: doToday tasks (realtime listener)
- Graduation Roadmap → Body Comp: exams, schedule
- Graduation Roadmap → Stim Calc: week schedule, upcoming deadlines

---

## SYNC PROTECTION SYSTEM (CRITICAL)

### Standard Save Guard Pattern (All 4 Apps)
```javascript
if (!pinValidated) return false;
if (isInitialLoad) return false;
if (!hasLoadedFromCloud) return false;
if (isEmptyState(data)) return false;
if (!data._dataLoaded) return false;
// Guard F (graduation-roadmap only): validateStateIntegrity()
// awaitingPinEntry flag gates fallback timers
```

### isEmptyState() Checks
| App | Empty If Missing ALL Of |
|-----|------------------------|
| index.html | tasks, calendarNotes, calendarEvents, notebook.pages, stats.totalXPGained, focusModeData, commandCenterData |
| graduation-roadmap | customDeadlines, customTasks, appointments, blocks, notes, patients, completedDeadlines, examStudyProgress, grades, exams, editedDeadlines, patientRecords, dashboardSnapshots, completedProcedures, competencies, missingNotes, todoList.items |
| stim-calc | medications, caffeine, history, sleepHistory, allNighterMode, _dataLoaded |
| body-comp | weighIns, today.meals, today.workouts, dailyLogs, bodyCompHistory, today.setupComplete |

### Checkpoint System (All 4 Apps)
Functions: `createCheckpoint()`, `showCheckpointManager()`, `restoreCheckpoint()`, `exportCheckpoint()`, `exportAllCheckpoints()`, `importCheckpoint()`, `importAndRestoreDirectly()`
Force sync: `forceUploadToCloud()`, `forcePullFromCloud()`

---

## SULLY CONTEXT
- **D3 dental student** at BU Goldman, graduating May 2027. ADHD: Adderall XR 50mg max (30mg+20mg).
- **Physical**: 5'8.5", 190 lbs, goal 170 by June 1 2026, ~27% body fat.
- **Business**: "RCT Analytics" — registered on Stripe (acct_1T8r9yBSlJEf37g1). Accepted to Stripe Startups.
- **Startup guide trigger**: When user says "pull up the startup plan", "funding guide", "startup stuff", or "RCT Analytics" → reference `docs/RCT_ANALYTICS_MASTER_FUNDING_GUIDE.md`.
- **CCMeter**: Installed at `~/.cargo/bin/ccmeter`. Dock app at `~/Applications/CCMeter.app`. tmux session auto-starts via `.zshrc`.

---

## AUDIT METHODOLOGY
For "debug everything" requests, use this 4-phase approach:
- **Phase 1**: 6 parallel audit agents by domain (patients, clinical/competencies, import/parsers, firebase-sync, dashboard/rendering, HTML/CSS). Read EVERY line, report bugs, no changes.
- **Phase 2**: Consolidate, deduplicate, categorize by file.
- **Phase 3**: 5 parallel fix agents organized BY FILE (prevents edit conflicts).
- **Phase 4**: QA agent verifies all fixes (syntax, brace balance, spot-check, regression scan).

Full audit history: `docs/audit-history.md`

### Unaudited Areas
- `exam-content.js` `examContentData` accuracy (1000+ lines, not verified against syllabi)
- `monthly-planner.js` calendar rendering edge cases (month boundaries, week-start offsets)
- `periodic-review.js` PDF export — not tested with html2pdf.js
- `daily-planner.js` pomodoro timer and bedtime logic
- Cross-app data flow to body-comp-tracker and stim-calc (read paths)
- `syncSchemaFields()` re-adds dead `rules` field (~2KB per save)
- DEFAULT_COMPETENCIES still has `completionEntries: []` on templates (stripped by migration)
- ~~17 remaining `Object.values()` on Firebase collections~~ — RESOLVED Aug 2026: zero `Object.values()` on Firebase collections in `patients.js`/`clinical.js`

---

## THINGS NOT TO CHANGE WITHOUT TESTING
Firebase config, PIN auth, save/sync debounce, grade calculator math, XR pharmacokinetic model, date parsing, sync protection guards, `isEmptyState()`, checkpoint system.
