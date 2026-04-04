# Patients Tab Audit — 10 Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10 bugs identified by the Codex gpt-5.4 Patients-tab audit, verified by the Claude Opus review.

**Architecture:** Fixes are grouped by file to prevent edit conflicts. 5 fix agents (one per file) + 1 QA agent. Each agent edits only its assigned file(s). QA agent reads all files after fixes, verifies syntax, logic, and no regressions.

**Tech Stack:** Vanilla JS, no build system. Verification via `node -c` syntax check + manual code review.

---

## File Map

| File | Fixes | Agent |
|------|-------|-------|
| `js/graduation-roadmap/clinical.js` | Fix 1 (4 sites) | Agent A |
| `js/graduation-roadmap/init.js` | Fix 1 (1 site) | Agent A |
| `js/graduation-roadmap/firebase-sync.js` | Fix 2, Fix 4 | Agent B |
| `js/graduation-roadmap/state.js` | Fix 3 | Agent C |
| `js/graduation-roadmap/patients.js` | Fix 5, 6, 7, 8, 9 | Agent D |
| `js/graduation-roadmap/periodic-review.js` | Fix 10 | Agent E |
| All 6 files | QA verification | Agent QA |

---

### Task 1 (Agent A): Fix `status` → `activeStatus` in clinical.js + init.js

**Fixes:** #1 — 5 sites where downstream code reads `p.status` instead of canonical `p.activeStatus`

**Files:**
- Modify: `js/graduation-roadmap/clinical.js:32,51,273,1636`
- Modify: `js/graduation-roadmap/init.js:997`

- [ ] **Step 1: clinical.js line 32 — Active patient count**

Change:
```javascript
const activePatients = Object.values(patients).filter(p => p.status !== 'inactive').length;
```
To:
```javascript
const activePatients = Object.values(patients).filter(p => (p.activeStatus || 'Active') !== 'Inactive').length;
```
Note: `activeStatus` uses title-case `'Active'`/`'Inactive'` per createPatientRecord. Fallback `'Active'` handles legacy records missing the field.

- [ ] **Step 2: clinical.js line 51 — Recalls due filter**

Change:
```javascript
if (!p.recallDue || p.status !== 'active') return false;
const recallDate = parseLocalDate(p.recallDue);
```
To:
```javascript
if ((p.activeStatus || 'Active') === 'Inactive') return false;
if (!p.recallHistory) return false;
var recallMatch = (p.recallHistory || '').match(/Next due:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
if (!recallMatch) return false;
var recallDate = parseLocalDate(recallMatch[1]);
```
Note: `recallDue` is NOT a canonical field — it doesn't exist on patientRecords. The canonical field is `recallHistory` (text like `"Next due: 8/5/2025 (OVERDUE)"`). We parse the date from the text.

- [ ] **Step 3: clinical.js line 273 — Appointment modal patient dropdown**

Change:
```javascript
.filter(p => p.status === 'active')
```
To:
```javascript
.filter(p => (p.activeStatus || 'Active') !== 'Inactive')
```

- [ ] **Step 4: clinical.js line 1636 — Quick-record modal patient dropdown**

Change:
```javascript
if (pt && pt.name && pt.status !== 'inactive') {
```
To:
```javascript
if (pt && pt.name && (pt.activeStatus || 'Active') !== 'Inactive') {
```

- [ ] **Step 5: init.js line 997 — Dashboard recalls due alert**

Change:
```javascript
if (!p.recallDue || p.status !== 'active') return false;
var recallDate = parseLocalDate(p.recallDue);
```
To:
```javascript
if ((p.activeStatus || 'Active') === 'Inactive') return false;
var recallMatch = (p.recallHistory || '').match(/Next due:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
if (!recallMatch) return false;
var recallDate = parseLocalDate(recallMatch[1]);
```

- [ ] **Step 6: Verify syntax**

Run: `node -c js/graduation-roadmap/clinical.js && node -c js/graduation-roadmap/init.js`
Expected: no errors

---

### Task 2 (Agent B): Fix force pull + importedRequirements merge in firebase-sync.js

**Fixes:** #2 — Force pull uses merge instead of overwrite. #4 — Empty-array-is-truthy drops remote importedRequirements.

**Files:**
- Modify: `js/graduation-roadmap/firebase-sync.js:582-588,1667-1671`

- [ ] **Step 1: Fix 2 — Change applyRemoteData to use source-wins for force pull**

The function at line 1667 is called ONLY by `forcePullFromCloud()` (line 2303). Change it from merge to true overwrite:

Change:
```javascript
function applyRemoteData(data) {
    mergeRemoteState(data);
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    initUI();
}
```
To:
```javascript
function applyRemoteData(data) {
    // Force pull = true overwrite. Use source-wins (not remote-wins merge).
    roadmapData = reconstructState(data, { strategy: 'source-wins', fallback: roadmapData });
    migrateInvalidFirebaseKeys(roadmapData);
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    initUI();
}
```

- [ ] **Step 2: Fix 4 — Change empty-array-truthy guards in patient field merge**

Lines 582-588. Change from `!local.X` (fails for empty arrays/strings) to proper emptiness checks:

Change:
```javascript
                if (!local.importedRequirements && remote.importedRequirements) local.importedRequirements = remote.importedRequirements;
                if (!local.priorityNotes && remote.priorityNotes) local.priorityNotes = remote.priorityNotes;
                if (local.highValue === undefined && remote.highValue !== undefined) local.highValue = remote.highValue;
                if (!local.allergies && remote.allergies) local.allergies = remote.allergies;
                if (!local.txCompletedByMe && remote.txCompletedByMe) local.txCompletedByMe = remote.txCompletedByMe;
                if (!local.recallHistory && remote.recallHistory) local.recallHistory = remote.recallHistory;
                if (!local.activeStatus && remote.activeStatus) local.activeStatus = remote.activeStatus;
```
To:
```javascript
                if (getValues(local.importedRequirements).length === 0 && getValues(remote.importedRequirements).length > 0) local.importedRequirements = remote.importedRequirements;
                if (!local.priorityNotes && remote.priorityNotes) local.priorityNotes = remote.priorityNotes;
                if (local.highValue === undefined && remote.highValue !== undefined) local.highValue = remote.highValue;
                if (!local.allergies && remote.allergies) local.allergies = remote.allergies;
                if (!local.txCompletedByMe && remote.txCompletedByMe) local.txCompletedByMe = remote.txCompletedByMe;
                if (!local.recallHistory && remote.recallHistory) local.recallHistory = remote.recallHistory;
                if (!local.activeStatus && remote.activeStatus) local.activeStatus = remote.activeStatus;
```
Note: Only `importedRequirements` is an array. The other fields are strings — `!''` correctly returns true, so `!local.X` is fine for strings. `highValue` already uses `=== undefined` correctly.

- [ ] **Step 3: Verify syntax**

Run: `node -c js/graduation-roadmap/firebase-sync.js`
Expected: no errors

---

### Task 3 (Agent C): Fix missing notes cleanup on patient delete in state.js

**Fixes:** #3 — `cascadeDeletePatient()` leaves orphaned missingNotes entries.

**Files:**
- Modify: `js/graduation-roadmap/state.js:1479-1506`

- [ ] **Step 1: Add missingNotes cleanup to cascadeDeletePatient**

Missing notes are keyed by note ID, associated by `chartNumber` field. Insert cleanup BEFORE the patient record delete (step 4) so we can still read the patient's chartNumber.

After line 1494 (`orphanedProcs` cleanup) and before line 1496 (`// 4. Delete patient record`), insert:

```javascript
    // 3b. Clean missing notes referencing this patient (by chart number or name)
    var deletedPt = roadmapData.clinicalData.patientRecords[patientId];
    if (deletedPt && roadmapData.clinicalData.missingNotes) {
        var ptChart = (deletedPt.chartNumber || '').trim();
        var ptNameLower = (deletedPt.name || '').toLowerCase().trim();
        Object.keys(roadmapData.clinicalData.missingNotes).forEach(function(noteId) {
            var note = roadmapData.clinicalData.missingNotes[noteId];
            var noteChart = (note.chartNumber || '').trim();
            var noteNameLower = (note.patientName || '').toLowerCase().trim();
            if ((ptChart && noteChart && noteChart === ptChart) || (ptNameLower && noteNameLower && noteNameLower === ptNameLower)) {
                delete roadmapData.clinicalData.missingNotes[noteId];
            }
        });
    }
```

- [ ] **Step 2: Verify syntax**

Run: `node -c js/graduation-roadmap/state.js`
Expected: no errors

---

### Task 4 (Agent D): Fix 5 bugs in patients.js (import dedup, stale cache, silent drops, toast, propagation)

**Fixes:** #5, #6, #7, #8, #9

**Files:**
- Modify: `js/graduation-roadmap/patients.js:1296-1316,2332-2334,2390-2393,2403-2418,2623-2654,2684-2693`

- [ ] **Step 1: Fix 9 — Add propagation to savePatientField for key fields**

At line 1315, after `saveData();`, add selective propagation:

Change:
```javascript
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}
```
To:
```javascript
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    // Propagate for fields that affect downstream views
    if (field === 'name' || field === 'activeStatus' || field === 'lastVisit' || field === 'phone' || field === 'reliability') {
        if (typeof propagateClinicalChanges === 'function') {
            propagateClinicalChanges({ patients: true, dashboard: true, calendars: false, source: 'savePatientField' });
        }
    }
}
```

- [ ] **Step 2: Fix 6 — Re-parse textarea on confirm instead of using stale cache**

At lines 2332-2334, change confirmUnifiedImport to re-parse:

Change:
```javascript
function confirmUnifiedImport() {
    var parsed = window._patientImportParsed;
    if (!parsed) return;
```
To:
```javascript
function confirmUnifiedImport() {
    // Re-parse current textarea to avoid stale cache if user edited after preview
    var textarea = document.getElementById('patientImportText');
    var parsed = textarea ? parsePatientImportText(textarea.value) : window._patientImportParsed;
    if (!parsed) return;
```

- [ ] **Step 3: Fix 5 — Add suffix dedup for NOTES_APPEND / MEDICAL_HX_APPEND**

At lines 2390-2393, add dedup check before appending:

Change:
```javascript
            if (key === 'notes' && upd._notesAppend) {
                records[id].notes = (records[id].notes || '') + '\n\n' + upd.notes;
            } else if (key === 'medicalHx' && upd._medicalHxAppend) {
                records[id].medicalHx = (records[id].medicalHx || '') + '\n\n' + upd.medicalHx;
```
To:
```javascript
            if (key === 'notes' && upd._notesAppend) {
                var existingNotes = records[id].notes || '';
                if (existingNotes.indexOf(upd.notes.trim()) === -1) {
                    records[id].notes = existingNotes + '\n\n' + upd.notes;
                }
            } else if (key === 'medicalHx' && upd._medicalHxAppend) {
                var existingHx = records[id].medicalHx || '';
                if (existingHx.indexOf(upd.medicalHx.trim()) === -1) {
                    records[id].medicalHx = existingHx + '\n\n' + upd.medicalHx;
                }
```

- [ ] **Step 4: Fix 7 — Add skip counters and toast warnings for unmatched REQUIREMENTS_MATCH**

At the reqMatches loop (~line 2403), add a counter before the loop and an else branch:

Before `parsed.reqMatches.forEach(function(rm) {` (line 2403), add:
```javascript
    var reqMatchSkipped = 0;
```

Change the gate at line 2413 from:
```javascript
        if (id && records[id]) {
```
To:
```javascript
        if (id && records[id]) {
```
(no change to the if)

After the closing `}` of the if block (before the end of the forEach callback), add:
```javascript
         else {
            reqMatchSkipped++;
            console.warn('[IMPORT] REQUIREMENTS_MATCH skipped — no patient found for chart: ' + (rm.chartNumber || '?') + ', name: ' + (rm.name || '?'));
        }
```

- [ ] **Step 5: Fix 7 — Add skip counters for unmatched CLINICAL_BRIEF**

At the clinicalBriefs loop (~line 2623), add a counter before the loop:

Before `parsed.clinicalBriefs.forEach(function(brief) {` (line 2623 area), add:
```javascript
    var briefsSkipped = 0;
```

After the closing `}` of the `if (id && records[id])` block inside the briefs forEach, add:
```javascript
         else {
            briefsSkipped++;
            console.warn('[IMPORT] CLINICAL_BRIEF skipped — no patient found for chart: ' + (brief.chartNumber || '?') + ', name: ' + (brief.name || '?'));
        }
```

- [ ] **Step 6: Fix 8 — Enhance import toast with skip reporting**

Change the toast block at lines 2684-2693:

Change:
```javascript
    var msg = '';
    if (created > 0) msg += created + ' patient(s) created. ';
    if (updated > 0) msg += updated + ' patient(s) updated. ';
    if (aptsCreated > 0) msg += aptsCreated + ' appointment(s) imported. ';
    if (parsed.reqStatuses.length > 0 || completedItems.length > 0) msg += 'Requirements updated. ';
    if (parsed.dashboardUpdate) msg += 'Dashboard snapshot saved. ';
    if (notesImported > 0) msg += notesImported + ' missing note(s) imported. ';
    if (todosImported > 0) msg += todosImported + ' to-do item(s) imported. ';
    if (briefsImported > 0) msg += briefsImported + ' clinical brief(s) imported. ';
    showToast(msg || 'Import complete');
```
To:
```javascript
    var msg = '';
    if (created > 0) msg += created + ' patient(s) created. ';
    if (updated > 0) msg += updated + ' patient(s) updated. ';
    if (aptsCreated > 0) msg += aptsCreated + ' appointment(s) imported. ';
    if (parsed.reqStatuses.length > 0 || completedItems.length > 0) msg += 'Requirements updated. ';
    if (parsed.dashboardUpdate) msg += 'Dashboard snapshot saved. ';
    if (notesImported > 0) msg += notesImported + ' missing note(s) imported. ';
    if (todosImported > 0) msg += todosImported + ' to-do item(s) imported. ';
    if (briefsImported > 0) msg += briefsImported + ' clinical brief(s) imported. ';
    var skipped = (reqMatchSkipped || 0) + (briefsSkipped || 0);
    if (skipped > 0) msg += skipped + ' item(s) skipped (no matching patient). ';
    showToast(msg || 'Import complete', skipped > 0 ? 'warning' : undefined);
```

- [ ] **Step 7: Verify syntax**

Run: `node -c js/graduation-roadmap/patients.js`
Expected: no errors

---

### Task 5 (Agent E): Fix prSavePatientField factory bypass in periodic-review.js

**Fixes:** #10 — Creates bare `{id, name, chartNumber}` instead of using `createPatientRecord()`.

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js:1585-1593`

- [ ] **Step 1: Route through createPatientRecord factory**

Change:
```javascript
    if (!roadmapData.clinicalData.patientRecords[patientId]) {
        // Look up name/chart from merged records or legacy patients store (NOT from patientRecords which we just confirmed is null)
        var allRecords = (typeof getAllPatientRecords === 'function') ? getAllPatientRecords() : {};
        var sourcePt = allRecords[patientId] || roadmapData.clinicalData?.patients?.[patientId] || {};
        roadmapData.clinicalData.patientRecords[patientId] = {
            id: patientId,
            name: sourcePt.name ?? '',
            chartNumber: sourcePt.chartNumber ?? ''
        };
    }
```
To:
```javascript
    if (!roadmapData.clinicalData.patientRecords[patientId]) {
        // Look up name/chart from merged records or legacy patients store
        var allRecords = (typeof getAllPatientRecords === 'function') ? getAllPatientRecords() : {};
        var sourcePt = allRecords[patientId] || roadmapData.clinicalData?.patients?.[patientId] || {};
        roadmapData.clinicalData.patientRecords[patientId] = (typeof createPatientRecord === 'function')
            ? createPatientRecord({ id: patientId, name: sourcePt.name ?? '', chartNumber: sourcePt.chartNumber ?? '' })
            : { id: patientId, name: sourcePt.name ?? '', chartNumber: sourcePt.chartNumber ?? '' };
    }
```
Note: The fallback `{ id, name, chartNumber }` is kept for safety in case `createPatientRecord` is somehow not loaded (patients.js loads before periodic-review.js so this should never happen, but defensive coding).

- [ ] **Step 2: Verify syntax**

Run: `node -c js/graduation-roadmap/periodic-review.js`
Expected: no errors

---

### Task 6 (Agent QA): Verify all fixes across all 6 files

**Files:** All 6 modified files

- [ ] **Step 1: Syntax check all files**

Run: `node -c js/graduation-roadmap/clinical.js && node -c js/graduation-roadmap/init.js && node -c js/graduation-roadmap/firebase-sync.js && node -c js/graduation-roadmap/state.js && node -c js/graduation-roadmap/patients.js && node -c js/graduation-roadmap/periodic-review.js`
Expected: no errors from any file

- [ ] **Step 2: Verify Fix 1 — No remaining `p.status` / `pt.status` patient reads**

Run: `grep -n '\.status' js/graduation-roadmap/clinical.js js/graduation-roadmap/init.js | grep -v 'appointment\|apt\|a\.\|item\.\|task\.\|note\.\|mod\.\|quiz\.\|meeting\.\|check\.\|activeStatus\|recallHistory\|completedAt\|status ===\|status !=='`
Expected: No patient `.status` reads remain. Only appointment/item status reads.

- [ ] **Step 3: Verify Fix 2 — applyRemoteData uses source-wins**

Confirm `applyRemoteData` calls `reconstructState(data, { strategy: 'source-wins'` NOT `mergeRemoteState`.

- [ ] **Step 4: Verify Fix 3 — missingNotes cleanup in cascadeDeletePatient**

Read cascadeDeletePatient and confirm missingNotes cleanup block exists between orphaned procs cleanup and patient record deletion.

- [ ] **Step 5: Verify Fix 4 — importedRequirements uses getValues().length**

Confirm line uses `getValues(local.importedRequirements).length === 0` not `!local.importedRequirements`.

- [ ] **Step 6: Verify Fix 5 — NOTES_APPEND has dedup**

Confirm `indexOf(upd.notes.trim()) === -1` guard before append.

- [ ] **Step 7: Verify Fix 6 — confirmUnifiedImport re-parses textarea**

Confirm function reads from textarea via `parsePatientImportText(textarea.value)`.

- [ ] **Step 8: Verify Fix 7 — Unmatched blocks log + count**

Confirm `reqMatchSkipped` and `briefsSkipped` counters exist with `console.warn` in else branches.

- [ ] **Step 9: Verify Fix 8 — Toast reports skipped items**

Confirm toast includes `skipped + ' item(s) skipped'` line and uses `'warning'` type.

- [ ] **Step 10: Verify Fix 9 — savePatientField propagates for key fields**

Confirm `propagateClinicalChanges` call after `saveData()` gated by field name check.

- [ ] **Step 11: Verify Fix 10 — prSavePatientField uses createPatientRecord**

Confirm `createPatientRecord({ id: patientId, ...})` call in periodic-review.js.

- [ ] **Step 12: Brace balance check all files**

Run: `for f in js/graduation-roadmap/clinical.js js/graduation-roadmap/init.js js/graduation-roadmap/firebase-sync.js js/graduation-roadmap/state.js js/graduation-roadmap/patients.js js/graduation-roadmap/periodic-review.js; do echo "$f:"; python3 -c "c=open('$f').read(); print('  {:', c.count('{'), '}:', c.count('}'), '(:', c.count('('), '):', c.count(')'))" ; done`
Expected: `{` count equals `}` count, `(` count equals `)` count for all files.

- [ ] **Step 13: Check save guards intact**

Verify `saveData()` function in firebase-sync.js still has all 6 guards (pinValidated, isInitialLoad, hasLoadedFromCloud, isEmptyState, _dataLoaded, validateStateIntegrity).

- [ ] **Step 14: Verify no saveData() in render paths**

Run: `grep -n 'saveData()' js/graduation-roadmap/patients.js | grep -i 'render'`
Expected: No matches — saveData must never be in render functions.
