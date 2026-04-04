# Audit History

Moved from CLAUDE.md to reduce file size. These are historical records of past audits.

---

## Mar 30 2026 (second pass)
Commit `e368887`. 37 fixes verified. Key categories: procedure count inflation (3 root causes), Firebase array safety (4), sync merge depth (3), import parser (4), XSS (5), propagation (2), rendering (2), HTML (3). Previous audit: Mar 30 commit `38a2a2d` (110 bugs, 73 fixed).

## Apr 1 2026 — Competency ground truth rebuild
Commit `feeb118`. Root cause: `DEFAULT_COMPETENCIES` was built from guesses, not official requirements docs. Fixed Pros formatives falsely marked as D3 deadlines, real D3 deadlines (GP, RS 545, OS, Geriatrics) missing entirely. Import system inflated completion counts via REQUIREMENTS_STATUS absolute-set on clinical items. 3 root cause fixes: (1) Rebuilt `DEFAULT_COMPETENCIES` from single ground truth doc (`docs/GROUND_TRUTH_REQUIREMENTS.md`) — 15 categories, ~140 items, all d3Deadlines corrected. (2) Rendering pipeline: patient badges now green (completed) vs yellow (planned), D3 pills clickable with scroll-to-item, patient chip preview popup. (3) Format D safeguard: console.warn when REQUIREMENTS_STATUS absolute-sets clinical procedure counts. ID changes: removed `perio-sum-calc`, split `gp-comm` into 3, added `fixed-units-total`/`fixed-fpd`/`fixed-implant-crown`/`fixed-cerec`/`cd-units-total`/`gp-meetings`/`gp-ohra`. QA verified: all ground truth IDs present, old IDs absent, brace balance, XSS safety, no saveData in renders.

## Apr 1 2026 — Competency tab overhaul
Commit `f4cad62`. 11-agent audit+fix+QA (6 audit, 4 fix, 1 QA). 37 fixes across 6 files. 3 CRITICAL: renderEvidenceCards() never called (evidence invisible), showCustomConfirm HTML-escaping destroyed review queue panel buttons, undo toast wrong selector. 9 HIGH: migration flag v1→v2 (3 restore sites), restoreCheckpoint mergeCompetencies arg order swapped (4 sites), autoLinkReviewQueue missing getValues() (6 sites), importedRequirements array safety, duplicate style attrs, persistExpandedState/setCompViewMode never saved, troubleshooting resync corrupted SPS data, _compNoteCommitted never cleared after Escape, clinicalDataDirty missing in deleteProcedure/uncompleteAppointment. 18 MEDIUM, 7 LOW.

## Apr 1 2026 — Ground truth corrections (manual audit by Suleman)
6 changes to `docs/GROUND_TRUTH_REQUIREMENTS.md`: op-multi-5 completed 1→0, perio-sum-prophy 2→3, gp-form-analysis 1→2, peds-course 0→1, CD formatives updated. No code changes needed.

## Apr 1 2026 — Post-fix verification + merge corruption fix
Commit `dd5acc1`. 5 parallel audit agents + QA. Key fixes: (1) `mergeCompetencies()` cross-section duplication. (2) v2→v3 migration bump with orphan removal. (3) `resetCompetencies()` race condition → `forceUploadToCloud()`. (4) `syncSchemaFields()` permanent sync. (5) `COMPETENCY_ALIASES` map. (6) `showToast()` html flag. (7) `navigateToCompetencyItem()` CSS.escape. (8) Webchat instructions synced. (9) `getPatientsFulfilling()` getValues at 4 locations. (10) fieldMap parsers forEach→for+break. Also: 3 d3Deadline corrections.

## Apr 1 2026 — Comprehensive data integrity audit
Commit `4d501aa`. 7-agent audit — 159 checks passed, 18 bugs found, 28 warnings. 3 CRITICAL: `getSmartAppointmentCount()`/`getSmartProcedureCount()` accessed `dashboardSnapshots` without `getValues()` (state.js:1059,1116); `getLatestSnapshot()` same issue (periodic-review.js:120); `linkProcedureToCompetencies()` reset absolute-set completed counts. 9 HIGH: `hiddenClinicTasks` key mismatch; migration flag version mismatches; `importBackup()` missing flag clears; `mergeRemoteState` lost newer `clinicalBrief`; `briefHistory` merge rejected Firebase objects; `computeRequirementMatches` `.length` on Firebase object; COMPLETED_TODAY null `patientId`; `migrateLeadingZeroDedup` missing FK remaps. 6 MEDIUM. Plan: `docs/superpowers/plans/2026-04-01-audit-bugfix-all-18-issues.md`.

## Apr 2 2026 — reconstructState refactor + 7-bug fix
Commit `45d0c7a`. Unified 5 reconstruction sites (~800 lines) into `reconstructState()` (~230 lines). 7 bugs: (1) `forceCloudSync` "merge" used `deepMerge` losing data. (2) Missing migration flag clears. (3) `saveAppointment` missing `dpSyncAppointmentsToTimeline`. (4-7) Minor: dropped UIState, localStorage in render path, `localChangesSinceLastSync` never cleared.

## Apr 2 2026 — Feature correctness audit (22 bugs)
Commit `985e2fc`. 6 files, 24 edits. 1 DATA_LOSS: `mpSaveTask()` missing `userEdited`. 2 DATA_CORRUPTION: toast onclick leak + `style.display='none'`; `migrateToUnifiedPatientStore` `|| []` instead of `getValues()`. 13 WRONG_DISPLAY: lastVisit parsing, pace badge color inversion, array safety issues, sync gate issues, invalid end time, inline style overrides, nonexistent modal function, NaN badges. 4 STALE_DISPLAY: missing propagation calls, incomplete cascade delete.

## Apr 2 2026 — Competencies Tab V2 overhaul
Commit `f496565` (PR #11). 12-agent team. Complete overhaul: scrapped evidence-trail model → manual-count system. 8 phases: migration, Guard F update, import detach, dead code deletion (14 functions, ~623 lines), smart counter fix, merge simplification, UI rebuild (Atlas Console cv2-* design), QA. 7 files, net -883 lines.

## Apr 2 2026 — V2 post-overhaul audit (13 bugs)
Commit `219620b`. 1 CRITICAL: 35 missing cv2-* CSS classes. 3 HIGH: class name mismatches. 6 MEDIUM: migration flag, dedup, diagnostics. 2 LOW: item shape, resync logic.

## Apr 2 2026 — Competencies design polish
Commit `b0640fa`. CSS-only + 1 JS fix. Warm parchment palette replacing cold blue-gray. Unified CSS blocks into 1220-line block. Added serif heading font, warm shadows. Mobile: flex-wrap, 40px touch targets. QA: 100/100 classes, braces balanced.
