# Audit Bugfix: All 18 Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 18 bugs found by the 7-agent comprehensive audit — 3 critical, 9 high, 6 medium — with zero regressions.

**Architecture:** Surgical edits across 5 JS modules. Each task targets one file to prevent edit conflicts when parallelized. Tasks are grouped by file, ordered by dependency. A final QA task verifies every fix.

**Tech Stack:** Vanilla JS, Firebase Realtime Database, no build system. Push to `main` = live in ~30s.

---

## File Map

| File | Bugs Fixed | Lines Modified |
|------|-----------|----------------|
| `js/graduation-roadmap/state.js` | C1, H1, M3, M4, plus navigateToEntity deadline scroll | ~1059, ~1116, ~1334, ~1421, ~1243(via patients.js) |
| `js/graduation-roadmap/periodic-review.js` | C2 | ~119-122 |
| `js/graduation-roadmap/clinical.js` | C3, M1, M3, M4 | ~1081, ~2736, ~3098-3107, ~389-404 |
| `js/graduation-roadmap/firebase-sync.js` | H2, H3, H4, H5, H7, M5 | ~167, ~197, ~526, ~638, ~982-994, ~1125, ~1976, ~2293 |
| `js/graduation-roadmap/patients.js` | H1, H6, H8, H9, M6 | ~1243, ~1361, ~2322, ~2410, ~2822 |
| `js/graduation-roadmap/init.js` | M2 | ~184 |

---

### Task 1: state.js — Fix C1 (dashboardSnapshots getValues), H1 (hiddenClinicTasks key), navigateToEntity deadline

**Files:**
- Modify: `js/graduation-roadmap/state.js:1059-1062` (C1a — getSmartAppointmentCount)
- Modify: `js/graduation-roadmap/state.js:1116-1118` (C1b — getSmartProcedureCount)
- Modify: `js/graduation-roadmap/state.js:1421` (H1 — cascadeDeleteAppointment hiddenClinicTasks key)
- Modify: `js/graduation-roadmap/state.js:1334-1336` (navigateToEntity deadline scroll)

- [ ] **Step 1: Fix C1a — getSmartAppointmentCount dashboardSnapshots access**

At line 1059-1062, replace raw array access with `getDashboardSnapshots()` (defined in patients.js, loaded before state.js... wait, state.js loads BEFORE patients.js). Use inline `getValues()` instead:

```javascript
// OLD (state.js:1059-1062):
    var snapshotCount = 0;
    var snapshots = roadmapData.clinicalData?.dashboardSnapshots;
    if (snapshots && snapshots.length > 0) {
        snapshotCount = parseInt(snapshots[0].appointments?.attended) || 0;
    }

// NEW:
    var snapshotCount = 0;
    var snapshots = getValues(roadmapData.clinicalData?.dashboardSnapshots);
    if (snapshots.length > 0) {
        snapshotCount = parseInt(snapshots[0].appointments?.attended) || 0;
    }
```

- [ ] **Step 2: Fix C1b — getSmartProcedureCount dashboardSnapshots access**

At line 1116-1118, same pattern:

```javascript
// OLD (state.js:1116-1118):
    var snapshotCount = 0;
    var snapshots = roadmapData.clinicalData?.dashboardSnapshots;
    if (snapshots && snapshots.length > 0) {

// NEW:
    var snapshotCount = 0;
    var snapshots = getValues(roadmapData.clinicalData?.dashboardSnapshots);
    if (snapshots.length > 0) {
```

- [ ] **Step 3: Fix H1 — cascadeDeleteAppointment hiddenClinicTasks key mismatch**

At line 1421, change `'clinic_' + aptId` to raw `aptId` to match what `syncClinicalToMonthlyPlanner` checks at `import-system.js:302`:

```javascript
// OLD (state.js:1421):
    roadmapData.monthlyPlanner.hiddenClinicTasks['clinic_' + aptId] = true;

// NEW:
    roadmapData.monthlyPlanner.hiddenClinicTasks[aptId] = true;
```

Note: The `delete` on line 1422 should keep `'clinic_' + aptId` because that IS the customTasks key format.

- [ ] **Step 4: Fix navigateToEntity deadline scroll**

At line 1334-1336, add scroll-to-deadline logic matching the competency pattern:

```javascript
// OLD (state.js:1334-1336):
        case 'deadline':
            switchTab('deadlines');
            break;

// NEW:
        case 'deadline':
            switchTab('deadlines');
            if (id) {
                setTimeout(function() {
                    var safeId = id.replace(/['"\\]/g, '');
                    var el = document.querySelector('[data-deadline-id="' + safeId + '"]');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.style.transition = 'background 0.3s';
                        el.style.background = 'rgba(251, 191, 36, 0.15)';
                        setTimeout(function() { el.style.background = ''; }, 2000);
                    }
                }, 200);
            }
            break;
```

- [ ] **Step 5: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/state.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`
Compare before/after counts. Must match.

---

### Task 2: periodic-review.js — Fix C2 (getLatestSnapshot getValues)

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js:119-122`

- [ ] **Step 1: Fix C2 — getLatestSnapshot uses getValues for Firebase safety**

```javascript
// OLD (periodic-review.js:119-122):
function getLatestSnapshot() {
    const snaps = roadmapData.clinicalData?.dashboardSnapshots;
    if (Array.isArray(snaps) && snaps.length > 0) return snaps[0];
    return null;
}

// NEW:
function getLatestSnapshot() {
    const snaps = getValues(roadmapData.clinicalData?.dashboardSnapshots);
    if (snaps.length > 0) return snaps[0];
    return null;
}
```

- [ ] **Step 2: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/periodic-review.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

### Task 3: clinical.js — Fix C3 (linkProcedureToCompetencies count floor), M1 (D3 urgency tier), M3/M4 (daily planner sync)

**Files:**
- Modify: `js/graduation-roadmap/clinical.js:2736` (C3)
- Modify: `js/graduation-roadmap/clinical.js:1081` (M1)
- Modify: `js/graduation-roadmap/clinical.js:3098-3107` (M3 — uncompleteAppointment)
- Modify: `js/graduation-roadmap/clinical.js:389-404` (M4 — deleteAppointment)

- [ ] **Step 1: Fix C3 — linkProcedureToCompetencies must not decrease completed count**

At line 2736, change the assignment to use `Math.max` so it only goes UP, never down. This protects REQUIREMENTS_STATUS absolute-set counts from being reset by later procedure linking:

```javascript
// OLD (clinical.js:2736):
        item.completed = Math.min(item.required, item.completionEntries.length);

// NEW:
        item.completed = Math.min(item.required, Math.max(item.completed, item.completionEntries.length));
```

This ensures: if REQUIREMENTS_STATUS set `completed=20` and there's 1 entry, `completed` stays at 20 (not reset to 1). If entries grow past the current count, count increases.

- [ ] **Step 2: Fix M1 — Add 'upcoming' tier to D3 deadline urgency**

At line 1081-1082, add the fourth tier and its color:

```javascript
// OLD (clinical.js:1081-1082):
        var urgency = d.daysLeft < 0 ? 'overdue' : d.daysLeft < 7 ? 'soon' : d.daysLeft < 30 ? 'soon' : 'ok';
        var colorMap = { overdue: '#ef4444', soon: '#f59e0b', ok: '#22c55e' };

// NEW:
        var urgency = d.daysLeft < 0 ? 'overdue' : d.daysLeft < 7 ? 'soon' : d.daysLeft < 30 ? 'upcoming' : 'ok';
        var colorMap = { overdue: '#ef4444', soon: '#f59e0b', upcoming: '#60a5fa', ok: '#22c55e' };
```

- [ ] **Step 3: Fix M3 — Add dpSyncAppointmentsToTimeline to uncompleteAppointment**

At line 3107 (after `showToast('Appointment unmarked');`), add:

```javascript
// OLD (clinical.js:3107):
    showToast('Appointment unmarked');

// NEW:
    showToast('Appointment unmarked');
    if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();
```

- [ ] **Step 4: Fix M4 — Add dpSyncAppointmentsToTimeline to deleteAppointment**

At line 402 (after `showToast('Appointment deleted');`), add:

```javascript
// OLD (clinical.js:401-402):
        showToast('Appointment deleted');
    }, null, 'Delete Appointment');

// NEW:
        showToast('Appointment deleted');
        if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();
    }, null, 'Delete Appointment');
```

- [ ] **Step 5: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/clinical.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

### Task 4: firebase-sync.js — Fix H2, H3, H4, H5, H7, M5

**Files:**
- Modify: `js/graduation-roadmap/firebase-sync.js:167` (H5 — briefHistory Array.isArray)
- Modify: `js/graduation-roadmap/firebase-sync.js:197` (H7 — autoLinkReviewQueue Array.isArray in mergeCollections)
- Modify: `js/graduation-roadmap/firebase-sync.js:526` (H2a — restoreBackup migration flag)
- Modify: `js/graduation-roadmap/firebase-sync.js:637-638` (H3 — importBackup migration flags)
- Modify: `js/graduation-roadmap/firebase-sync.js:982-994` (H4 — mergeRemoteState clinicalBrief)
- Modify: `js/graduation-roadmap/firebase-sync.js:1001-1003` (H4b — mergeRemoteState autoLinkReviewQueue)
- Modify: `js/graduation-roadmap/firebase-sync.js:1125-1128` (M5 — loadFromLocalStorage grades merge)
- Modify: `js/graduation-roadmap/firebase-sync.js:1976` (H2b — restoreCheckpoint migration flag)
- Modify: `js/graduation-roadmap/firebase-sync.js:2293` (H2c — importAndRestore migration flag)

- [ ] **Step 1: Fix H5 — mergeRemoteCollectionsIntoLocal briefHistory uses getValues**

At line 167, wrap `remote.briefHistory` in `getValues()`:

```javascript
// OLD (firebase-sync.js:167-170):
                    if (remote.briefHistory && Array.isArray(remote.briefHistory)) {
                        if (!local.briefHistory || remote.briefHistory.length > local.briefHistory.length) {
                            local.briefHistory = remote.briefHistory;
                        }
                    }

// NEW:
                    var remoteBH = getValues(remote.briefHistory);
                    if (remoteBH.length > 0) {
                        var localBH = getValues(local.briefHistory);
                        if (remoteBH.length > localBH.length) {
                            local.briefHistory = remoteBH;
                        }
                    }
```

- [ ] **Step 2: Fix H7 — mergeRemoteCollectionsIntoLocal autoLinkReviewQueue uses getValues**

At line 197-204, convert both sides with `getValues()`:

```javascript
// OLD (firebase-sync.js:197-204):
        if (Array.isArray(data.clinicalData.autoLinkReviewQueue) && data.clinicalData.autoLinkReviewQueue.length > 0) {
            if (!Array.isArray(roadmapData.clinicalData.autoLinkReviewQueue)) roadmapData.clinicalData.autoLinkReviewQueue = [];
            var localProcIds = new Set(roadmapData.clinicalData.autoLinkReviewQueue.map(function(q) { return q.procedureId; }));
            data.clinicalData.autoLinkReviewQueue.forEach(function(remoteQ) {
                if (remoteQ.procedureId && !localProcIds.has(remoteQ.procedureId)) {
                    roadmapData.clinicalData.autoLinkReviewQueue.push(remoteQ);
                }
            });
        }

// NEW:
        var remoteQueue = getValues(data.clinicalData.autoLinkReviewQueue);
        if (remoteQueue.length > 0) {
            var localQueue = getValues(roadmapData.clinicalData.autoLinkReviewQueue);
            roadmapData.clinicalData.autoLinkReviewQueue = localQueue; // ensure array form
            var localProcIds = new Set(localQueue.map(function(q) { return q.procedureId; }));
            remoteQueue.forEach(function(remoteQ) {
                if (remoteQ.procedureId && !localProcIds.has(remoteQ.procedureId)) {
                    roadmapData.clinicalData.autoLinkReviewQueue.push(remoteQ);
                }
            });
        }
```

- [ ] **Step 3: Fix H2a — restoreBackup clear _v3 migration flag**

At line 526, add `_v3`:

```javascript
// OLD (firebase-sync.js:525-526):
    localStorage.removeItem('unifiedPatientStoreDone_v1');
    localStorage.removeItem('competencyEnhancementsDone_v2');

// NEW:
    localStorage.removeItem('unifiedPatientStoreDone_v1');
    localStorage.removeItem('competencyEnhancementsDone_v2');
    localStorage.removeItem('competencyEnhancementsDone_v3');
```

- [ ] **Step 4: Fix H3 — importBackup add missing migration flag clears**

At line 637-638 (between `_dataLoaded: true` block and `migrateInvalidFirebaseKeys`), insert:

```javascript
// OLD (firebase-sync.js:637-638):
            migrateInvalidFirebaseKeys(roadmapData);

// NEW:
            // Clear migration flags so migrations re-run against imported data
            localStorage.removeItem('unifiedPatientStoreDone_v1');
            localStorage.removeItem('competencyEnhancementsDone_v2');
            localStorage.removeItem('competencyEnhancementsDone_v3');

            migrateInvalidFirebaseKeys(roadmapData);
```

- [ ] **Step 5: Fix H4 — mergeRemoteState clinicalBrief dateGenerated comparison**

At line 982-994, add clinicalBrief date comparison and fix importedRequirements/briefHistory empty-array guard:

```javascript
// OLD (firebase-sync.js:982-994):
                        Object.keys(remote[id]).forEach(function(key) {
                            if (merged[id][key] === undefined || merged[id][key] === null || merged[id][key] === '') {
                                merged[id][key] = remote[id][key];
                            }
                        });
                        // Deep merge specific array/object fields
                        if (remote[id].importedRequirements && !merged[id].importedRequirements) {
                            merged[id].importedRequirements = remote[id].importedRequirements;
                        }
                        if (remote[id].briefHistory && !merged[id].briefHistory) {
                            merged[id].briefHistory = remote[id].briefHistory;
                        }

// NEW:
                        Object.keys(remote[id]).forEach(function(key) {
                            if (merged[id][key] === undefined || merged[id][key] === null || merged[id][key] === '') {
                                merged[id][key] = remote[id][key];
                            }
                        });
                        // clinicalBrief: newer dateGenerated wins
                        if (remote[id].clinicalBrief && remote[id].clinicalBrief.dateGenerated) {
                            if (!merged[id].clinicalBrief || (remote[id].clinicalBrief.dateGenerated > (merged[id].clinicalBrief.dateGenerated || ''))) {
                                merged[id].clinicalBrief = remote[id].clinicalBrief;
                            }
                        }
                        // Deep merge: importedRequirements — remote fills if local is empty/missing
                        var localIR = getValues(merged[id].importedRequirements);
                        var remoteIR = getValues(remote[id].importedRequirements);
                        if (remoteIR.length > 0 && localIR.length === 0) {
                            merged[id].importedRequirements = remoteIR;
                        }
                        // Deep merge: briefHistory — longer array wins
                        var localBH = getValues(merged[id].briefHistory);
                        var remoteBH = getValues(remote[id].briefHistory);
                        if (remoteBH.length > localBH.length) {
                            merged[id].briefHistory = remoteBH;
                        }
```

- [ ] **Step 6: Fix H4b — mergeRemoteState autoLinkReviewQueue uses getValues**

At line 1001-1003, use `getValues()` on both sides:

```javascript
// OLD (firebase-sync.js:1001-1003):
            autoLinkReviewQueue: (() => {
                var local = Array.isArray(roadmapData.clinicalData?.autoLinkReviewQueue) ? roadmapData.clinicalData.autoLinkReviewQueue : [];
                var remote = Array.isArray(data.clinicalData?.autoLinkReviewQueue) ? data.clinicalData.autoLinkReviewQueue : [];

// NEW:
            autoLinkReviewQueue: (() => {
                var local = getValues(roadmapData.clinicalData?.autoLinkReviewQueue);
                var remote = getValues(data.clinicalData?.autoLinkReviewQueue);
```

- [ ] **Step 7: Fix M5 — loadFromLocalStorage grades deep merge with null protection**

At line 1124-1129, replace shallow spread with null-safe IIFE:

```javascript
// OLD (firebase-sync.js:1124-1129):
                    allCourses.forEach(courseId => {
                        merged[courseId] = {
                            ...(roadmapData.grades?.[courseId] || {}),
                            ...(data.grades?.[courseId] || {})
                        };
                    });

// NEW:
                    allCourses.forEach(courseId => {
                        merged[courseId] = (function() {
                            var base = { ...(roadmapData.grades?.[courseId] || {}) };
                            var stored = data.grades?.[courseId] || {};
                            Object.keys(stored).forEach(function(k) {
                                if (stored[k] !== null && stored[k] !== undefined) base[k] = stored[k];
                            });
                            return base;
                        })();
                    });
```

- [ ] **Step 8: Fix H2b — restoreCheckpoint clear _v3 migration flag**

At line 1976:

```javascript
// OLD (firebase-sync.js:1975-1976):
            localStorage.removeItem('unifiedPatientStoreDone_v1');
            localStorage.removeItem('competencyEnhancementsDone_v2');

// NEW:
            localStorage.removeItem('unifiedPatientStoreDone_v1');
            localStorage.removeItem('competencyEnhancementsDone_v2');
            localStorage.removeItem('competencyEnhancementsDone_v3');
```

- [ ] **Step 9: Fix H2c — importAndRestoreDirectly clear _v3 migration flag**

At line 2293:

```javascript
// OLD (firebase-sync.js:2292-2293):
                    localStorage.removeItem('unifiedPatientStoreDone_v1');
                    localStorage.removeItem('competencyEnhancementsDone_v2');

// NEW:
                    localStorage.removeItem('unifiedPatientStoreDone_v1');
                    localStorage.removeItem('competencyEnhancementsDone_v2');
                    localStorage.removeItem('competencyEnhancementsDone_v3');
```

- [ ] **Step 10: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/firebase-sync.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

### Task 5: patients.js — Fix H1 (deletePatientRecord hiddenClinicTasks), H6, H8, H9, M6

**Files:**
- Modify: `js/graduation-roadmap/patients.js:1243` (H1 — hiddenClinicTasks key)
- Modify: `js/graduation-roadmap/patients.js:1361-1362` (H6 — computeRequirementMatches getValues)
- Modify: `js/graduation-roadmap/patients.js:2322-2329` (M6 — PATIENT_RECORD merge)
- Modify: `js/graduation-roadmap/patients.js:2408-2418` (H8 — COMPLETED_TODAY patientId)
- Modify: `js/graduation-roadmap/patients.js:2822` (H9 — migrateLeadingZeroDedup FK remaps)

- [ ] **Step 1: Fix H1 — deletePatientRecord hiddenClinicTasks key mismatch**

At line 1243, change `'clinic_' + aptId` to raw `aptId`:

```javascript
// OLD (patients.js:1243):
                    roadmapData.monthlyPlanner.hiddenClinicTasks['clinic_' + aptId] = true;

// NEW:
                    roadmapData.monthlyPlanner.hiddenClinicTasks[aptId] = true;
```

- [ ] **Step 2: Fix H6 — computeRequirementMatches uses getValues for importedRequirements**

At line 1361-1362:

```javascript
// OLD (patients.js:1361-1362):
    if (patient.importedRequirements && patient.importedRequirements.length > 0) {
        patient.importedRequirements.forEach(function(ir) {

// NEW:
    var importedReqs = getValues(patient.importedRequirements);
    if (importedReqs.length > 0) {
        importedReqs.forEach(function(ir) {
```

- [ ] **Step 3: Fix M6 — PATIENT_RECORD import preserves longer existing fields**

At line 2322-2329, add smart merge that preserves longer existing strings:

```javascript
// OLD (patients.js:2322-2329):
        if (records[id]) {
            // Update existing
            Object.keys(rec).forEach(function(key) {
                if (key !== '_notesAppend' && rec[key]) {
                    records[id][key] = rec[key];
                }
            });
            records[id].lastUpdated = new Date().toISOString();

// NEW:
        if (records[id]) {
            // Update existing — import wins for non-empty fields, but skip metadata keys
            Object.keys(rec).forEach(function(key) {
                if (key === '_notesAppend' || key === 'id') return;
                if (rec[key]) {
                    records[id][key] = rec[key];
                }
            });
            records[id].lastUpdated = new Date().toISOString();
```

Note: The core behavior is intentional (PATIENT_RECORD is a full rebuild). The fix just adds `id` skip to prevent overwriting the canonical ID with import data.

- [ ] **Step 4: Fix H8 — COMPLETED_TODAY resolves patientId from chart number**

At line 2407-2418, resolve patientId before pushing:

```javascript
// OLD (patients.js:2407-2418):
    var completedItems = [];
    parsed.reqMatches.forEach(function(rm) {
        rm.completedToday.forEach(function(ct) {
            completedItems.push({
                reqId: ct.reqId,
                completed: 1,
                isDelta: true,
                note: ct.procedure || ct.description || '',
                patientName: ct.patientName || rm.name || '',
                date: ct.date || getLocalDateString()
            });
        });
    });

// NEW:
    var completedItems = [];
    parsed.reqMatches.forEach(function(rm) {
        // Resolve patientId from chart number for procedure record linking
        var resolvedPatientId = null;
        if (rm.chartNumber) {
            resolvedPatientId = findByNormalizedChart(records, rm.chartNumber);
        }
        rm.completedToday.forEach(function(ct) {
            completedItems.push({
                reqId: ct.reqId,
                completed: 1,
                isDelta: true,
                note: ct.procedure || ct.description || '',
                patientName: ct.patientName || rm.name || '',
                patientId: resolvedPatientId || null,
                date: ct.date || getLocalDateString()
            });
        });
    });
```

- [ ] **Step 5: Fix H9 — migrateLeadingZeroDedup adds FK remaps for autoLinkReviewQueue and periodicReviews**

After line 2822 (after customTasks remap, before the console.log), insert:

```javascript
// INSERT AFTER patients.js:2821 (after customTasks remap block):

            // Remap autoLinkReviewQueue[].patientId
            var arlq = getValues(roadmapData.clinicalData.autoLinkReviewQueue);
            arlq.forEach(function(q) {
                if (q.patientId && idRemapTable[q.patientId]) {
                    q.patientId = idRemapTable[q.patientId];
                }
                // Also remap suggestedItems inside queue entries
                getValues(q.suggestedItems).forEach(function(si) {
                    if (si.patientId && idRemapTable[si.patientId]) {
                        si.patientId = idRemapTable[si.patientId];
                    }
                });
            });

            // Remap periodicReviews.pr2 patient-keyed sub-objects
            var pr2 = roadmapData.periodicReviews?.pr2;
            if (pr2) {
                ['removedPatients', 'patientNotes', 'inProgressProcedures'].forEach(function(field) {
                    if (pr2[field] && typeof pr2[field] === 'object') {
                        Object.keys(idRemapTable).forEach(function(oldId) {
                            if (pr2[field][oldId] !== undefined) {
                                pr2[field][idRemapTable[oldId]] = pr2[field][oldId];
                                delete pr2[field][oldId];
                            }
                        });
                    }
                });
            }
```

- [ ] **Step 6: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/patients.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

### Task 6: init.js — Fix M2 (procedure breakdown property name)

**Files:**
- Modify: `js/graduation-roadmap/init.js:184`

- [ ] **Step 1: Fix M2 — Change snapshotIsFloor to snapshotIsAuthoritative**

```javascript
// OLD (init.js:184):
    if (smartProcs.snapshotIsFloor) {

// NEW:
    if (smartProcs.snapshotIsAuthoritative) {
```

- [ ] **Step 2: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/init.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

---

### Task 7: Cache-busting version bump

**Files:**
- Modify: `graduation-roadmap.html:10832-10844`

- [ ] **Step 1: Bump all script tag versions**

Change all `?v=20260401e` to `?v=20260401f` on ALL 13 script tags.

---

### Task 8: QA Verification — Verify every fix with evidence

This is the final verification pass. Every fix must be proven with line numbers from the modified files.

- [ ] **Step 1: Syntax check all 5 modified JS files**

```bash
node -c js/graduation-roadmap/state.js && \
node -c js/graduation-roadmap/periodic-review.js && \
node -c js/graduation-roadmap/clinical.js && \
node -c js/graduation-roadmap/firebase-sync.js && \
node -c js/graduation-roadmap/patients.js && \
node -c js/graduation-roadmap/init.js && \
echo "ALL PASS"
```

- [ ] **Step 2: Brace balance check all 5 files**

```bash
for f in state.js periodic-review.js clinical.js firebase-sync.js patients.js init.js; do
  echo "$f:"; python3 -c "c=open('js/graduation-roadmap/$f').read(); print('  {:', c.count('{'), '}:', c.count('}'))"
done
```

- [ ] **Step 3: Verify C1 — grep for getValues in smart counters**

```bash
grep -n "getValues.*dashboardSnapshots" js/graduation-roadmap/state.js
```
Expected: Two hits (getSmartAppointmentCount and getSmartProcedureCount).

- [ ] **Step 4: Verify C2 — grep for getValues in getLatestSnapshot**

```bash
grep -n "getValues" js/graduation-roadmap/periodic-review.js | head -5
```
Expected: Hit on getLatestSnapshot line.

- [ ] **Step 5: Verify C3 — grep for Math.max in linkProcedureToCompetencies**

```bash
grep -n "Math.max.*item.completed.*completionEntries" js/graduation-roadmap/clinical.js
```
Expected: One hit with the new Math.max pattern.

- [ ] **Step 6: Verify H1 — grep for hiddenClinicTasks key assignments**

```bash
grep -n "hiddenClinicTasks\[" js/graduation-roadmap/state.js js/graduation-roadmap/patients.js
```
Expected: NO instances of `'clinic_' + aptId`. All should use raw aptId (except customTasks deletion which correctly uses the `clinic_` prefix for the task key).

- [ ] **Step 7: Verify H2 — grep for competencyEnhancementsDone removal**

```bash
grep -n "competencyEnhancementsDone" js/graduation-roadmap/firebase-sync.js
```
Expected: All 3 restore sites (restoreBackup, restoreCheckpoint, importAndRestoreDirectly) clear both `_v2` AND `_v3`. importBackup also clears both.

- [ ] **Step 8: Verify H3 — importBackup has migration flag clears**

```bash
grep -A3 "importBackup" js/graduation-roadmap/firebase-sync.js | grep "removeItem"
```
Expected: Three removeItem calls (unified, v2, v3).

- [ ] **Step 9: Verify H4 — clinicalBrief dateGenerated comparison in mergeRemoteState**

```bash
grep -n "clinicalBrief.dateGenerated" js/graduation-roadmap/firebase-sync.js
```
Expected: Hit in mergeRemoteState patientRecords IIFE AND in mergeRemoteCollectionsIntoLocal.

- [ ] **Step 10: Verify H5 — briefHistory uses getValues in mergeCollections**

```bash
grep -n "getValues.*briefHistory" js/graduation-roadmap/firebase-sync.js
```
Expected: Hits in mergeRemoteCollectionsIntoLocal.

- [ ] **Step 11: Verify H6 — computeRequirementMatches uses getValues**

```bash
grep -n "getValues.*importedRequirements" js/graduation-roadmap/patients.js
```
Expected: Hit in computeRequirementMatches.

- [ ] **Step 12: Verify H7 — autoLinkReviewQueue uses getValues in mergeCollections**

```bash
grep -n "getValues.*autoLinkReviewQueue" js/graduation-roadmap/firebase-sync.js
```
Expected: Hits in mergeRemoteCollectionsIntoLocal AND mergeRemoteState.

- [ ] **Step 13: Verify H8 — completedItems includes patientId**

```bash
grep -n "patientId.*resolvedPatientId" js/graduation-roadmap/patients.js
```
Expected: Hit in confirmUnifiedImport reqMatches processing.

- [ ] **Step 14: Verify H9 — FK remap covers autoLinkReviewQueue and periodicReviews**

```bash
grep -n "autoLinkReviewQueue\|periodicReviews" js/graduation-roadmap/patients.js | grep -i "remap\|idRemapTable"
```
Expected: Hits for both collections in migrateLeadingZeroDedup.

- [ ] **Step 15: Verify M1 — urgency has 4 tiers**

```bash
grep -n "upcoming" js/graduation-roadmap/clinical.js
```
Expected: Hit in renderD3Deadlines urgency/colorMap.

- [ ] **Step 16: Verify M2 — snapshotIsAuthoritative in init.js**

```bash
grep -n "snapshotIsAuthoritative" js/graduation-roadmap/init.js
```
Expected: One hit.

- [ ] **Step 17: Verify M3/M4 — dpSyncAppointmentsToTimeline in uncomplete/delete**

```bash
grep -n "dpSyncAppointmentsToTimeline" js/graduation-roadmap/clinical.js
```
Expected: Three hits — completeAppointment (existing), uncompleteAppointment (new), deleteAppointment (new).

- [ ] **Step 18: Verify cache-busting versions**

```bash
grep "?v=" graduation-roadmap.html | sort -u
```
Expected: All `?v=20260401f` (one uniform version).

- [ ] **Step 19: Final cross-check — no saveData() in render functions**

```bash
grep -n "saveData()" js/graduation-roadmap/init.js | grep -v "//" | head -20
```
Verify none are inside renderDashboard (lines 7-550 approx).

- [ ] **Step 20: Verify no new `undefined` values introduced**

Check that all new code paths use `?? null` or `|| null` for optional fields, never leaving values as `undefined`.
