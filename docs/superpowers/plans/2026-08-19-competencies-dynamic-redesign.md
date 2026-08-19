# Competencies Dynamic Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the graduation % to unit-weighted 47% everywhere, make competency requirements dynamically deletable/addable with bulletproof cross-device persistence (tombstones), remove the Mission Control Clinic Volume block, and re-theme the Competencies tab to Mission Control's compact purple/slate aesthetic.

**Architecture:** Five surgical edits across `state.js`, `clinical.js`, `firebase-sync.js`, `init.js`, and the `<style>` block in `graduation-roadmap.html`. New tombstone map `clinicalData.deletedCompItemIds` (`{itemId: ISOtimestamp}`) mirrors the existing `deletedProcedureIds` pattern; a purge pass in `syncSchemaFields()` (runs every init) is the primary backstop, with defense-in-depth filtering at both merge sites. The redesign re-themes the variable-driven cv2 stylesheet by rewriting the `:root --cv2-*` custom properties — no class names change, so all JS keeps working.

**Tech Stack:** Vanilla JS (no build), Firebase Realtime DB, no test framework. "Test" = `node --check` syntax/brace validation + scripted behavioral assertions run in Node against extracted logic where feasible, plus manual browser verification steps.

**Testing note:** This is a browserless static app. Each code task ends with a `node --check` gate (catches syntax/brace errors — the #1 risk of surgical edits) and, where the logic is pure, a tiny Node harness in the scratchpad that asserts behavior. UI/Firebase-coupled behavior gets an explicit manual verification checklist in Task 7.

---

### Task 1: state.js — tombstone default, isEmptyState, mergeCompetencies deletedIds

**Files:**
- Modify: `js/graduation-roadmap/state.js:209-210` (getDefaultState clinicalData tombstones)
- Modify: `js/graduation-roadmap/state.js:337` (isEmptyState hasDeletedRecords)
- Modify: `js/graduation-roadmap/state.js:765` (mergeCompetencies signature + add-item guards)

- [ ] **Step 1: Add `deletedCompItemIds` to default clinicalData**

Change (state.js ~209):
```javascript
            deletedAppointmentIds: {},
            deletedProcedureIds: {},
            deletedPatientRecordIds: {}
```
to:
```javascript
            deletedAppointmentIds: {},
            deletedProcedureIds: {},
            deletedPatientRecordIds: {},
            deletedCompItemIds: {}
```

- [ ] **Step 2: Count competency deletions in isEmptyState**

Change (state.js:337) — append the new tombstone to the `hasDeletedRecords` OR-chain:
```javascript
    var hasDeletedRecords = getCount(data.clinicalData?.deletedAppointmentIds) > 0 || getCount(data.clinicalData?.deletedProcedureIds) > 0 || getCount(data.clinicalData?.deletedPatientRecordIds) > 0 || getCount(data.clinicalData?.deletedCompItemIds) > 0 || getCount(data.deletedD4EventIds) > 0 || getCount(data.deletedCriticalReminderIds) > 0 || getCount(data.deletedPlannerTaskIds) > 0 || getCount(data.deletedPlannerNoteIds) > 0;
```
(Only `deletedCompItemIds` is inserted, right after `deletedPatientRecordIds`.)

- [ ] **Step 3: Add `deletedIds` param to mergeCompetencies and skip tombstoned cloud items**

Change the signature (state.js:765):
```javascript
function mergeCompetencies(localComp, cloudComp) {
```
to:
```javascript
function mergeCompetencies(localComp, cloudComp, deletedIds) {
    var _tomb = deletedIds || {};
```

Then guard the THREE cloud-item add sites. Site A — whole cloud category adopted wholesale (state.js:786):
```javascript
        if (!result[catKey]) { result[catKey] = cloud[catKey]; return; }
```
becomes:
```javascript
        if (!result[catKey]) {
            // Adopt the cloud category but strip any tombstoned items first
            var _adopt = cloud[catKey];
            getValues(_adopt.sections).forEach(function(sec) {
                var its = sec.items || {};
                Object.keys(its).forEach(function(ik) {
                    if (its[ik] && its[ik].id && _tomb[its[ik].id]) delete its[ik];
                });
            });
            result[catKey] = _adopt;
            return;
        }
```

Site B — new-cloud-section filtered items (state.js:810). Change:
```javascript
                    if (ci && ci.id && !allLocalItemIds[ci.id]) {
```
to:
```javascript
                    if (ci && ci.id && !allLocalItemIds[ci.id] && !_tomb[ci.id]) {
```

Site C — new cloud item in an existing section (state.js:827). Change:
```javascript
                if (!localItems[itemId]) { localItems[itemId] = ci; allLocalItemIds[ci.id || itemId] = true; return; }
```
to:
```javascript
                if (!localItems[itemId]) {
                    if (ci.id && _tomb[ci.id]) return; // tombstoned — do not resurrect
                    localItems[itemId] = ci; allLocalItemIds[ci.id || itemId] = true; return;
                }
```

- [ ] **Step 4: Syntax gate**

Run: `node --check js/graduation-roadmap/state.js`
Expected: exits 0, no output.

- [ ] **Step 5: Behavioral test — tombstone skips resurrection**

Write `/private/tmp/claude-501/-Users-suleman-dental-quest/9919f70e-54b6-464d-9b17-003177f706d3/scratchpad/test-merge.js`:
```javascript
// Minimal harness: stub globals mergeCompetencies depends on, then require via eval.
const fs = require('fs');
const src = fs.readFileSync('js/graduation-roadmap/state.js', 'utf8');
// Extract mergeCompetencies + its helper deps by evaluating the whole file in a sandbox
global.getValues = o => o ? Object.values(o) : [];
global.migrateCompetencies = c => c; // identity for the test
global.getCount = o => o ? Object.keys(o).length : 0;
// pull just the function text
const fnStart = src.indexOf('function mergeCompetencies(');
const fnEnd = src.indexOf('\nfunction ', fnStart + 10);
eval(src.slice(fnStart, fnEnd));
const local = { endo: { sections: { s1: { items: { keep: { id: 'keep', completed: 1, required: 1 } } } } } };
const cloud = { endo: { sections: { s1: { items: {
  keep: { id: 'keep', completed: 1, required: 1 },
  pulp2: { id: 'pulp2', completed: 0, required: 1 } // deleted item trying to come back
} } } } };
const merged = mergeCompetencies(local, cloud, { pulp2: '2026-08-19T00:00:00Z' });
const items = merged.endo.sections.s1.items;
if (items.pulp2) { console.error('FAIL: tombstoned pulp2 was resurrected'); process.exit(1); }
if (!items.keep) { console.error('FAIL: keep was dropped'); process.exit(1); }
console.log('PASS: tombstone honored, keep retained');
```
Run: `cd /Users/suleman/dental-quest && node <scratchpad>/test-merge.js`
Expected: `PASS: tombstone honored, keep retained`

- [ ] **Step 6: Commit**

```bash
git add js/graduation-roadmap/state.js
git commit -m "d4 competencies: add deletedCompItemIds tombstone (default, isEmptyState, mergeCompetencies filter)"
```

---

### Task 2: clinical.js — unify %, dynamic delete + undo, always-show delete, syncSchemaFields purge, reset clear

**Files:**
- Modify: `js/graduation-roadmap/clinical.js:2127` (cv2BuildHeader %)
- Modify: `js/graduation-roadmap/clinical.js:2097` (cv2BuildItemRow delete button)
- Modify: `js/graduation-roadmap/clinical.js:2889-2928` (deleteCompItem) + new `cv2UndoDeleteItem`
- Modify: `js/graduation-roadmap/clinical.js:1185` (syncSchemaFields purge)
- Modify: `js/graduation-roadmap/clinical.js:2793` (saveCompItem defensive delete)
- Modify: `js/graduation-roadmap/clinical.js:2697-2706` (resetCompetencies clear tombstones)

- [ ] **Step 1: Unify header % to unit-weighted (47%)**

In `cv2BuildHeader` (clinical.js:2127), change:
```javascript
    var pct = itemsTotal > 0 ? Math.round((itemsDone / itemsTotal) * 100) : 0;
```
to:
```javascript
    // Graduation % is unit-weighted (partial credit) — identical to Mission Control's
    // calculateOverallStats().overallPercent so the two views never disagree.
    var pct = calculateOverallStats(competencies).overallPercent;
```
(`itemsDone`/`itemsTotal` stay — the meta line "X/Y requirements done" and the summatives/left pills still use them. `barColor`/`scoreColor` continue keying off `pct`, now unit-weighted.)

- [ ] **Step 2: Show the delete button on EVERY item row**

In `cv2BuildItemRow` (clinical.js:2096-2099), change:
```javascript
    // Custom item delete
    if (item.custom === true) {
        html += '<span class="cv2-delete-btn" onclick="deleteCompItem(\'' + safeKey + '\',\'' + safeItemId + '\'); event.stopPropagation();" title="Delete">✖</span>';
    }
```
to:
```javascript
    // Delete — any requirement can be removed (school requirements change); undoable
    html += '<span class="cv2-delete-btn" onclick="deleteCompItem(\'' + safeKey + '\',\'' + safeItemId + '\'); event.stopPropagation();" title="Remove requirement">✖</span>';
```

- [ ] **Step 3: Rewrite deleteCompItem — remove custom guard, write tombstone, undoable**

Replace the entire `deleteCompItem` function (clinical.js:2889-2928) with:
```javascript
function deleteCompItem(catKey, itemId) {
    const competencies = getCompetenciesData();
    const cat = competencies[catKey];
    if (!cat) return;

    // Find the item + its section (object-based storage). Snapshot for undo.
    let snapshot = null;
    let foundSectionId = null;
    for (const [secId, sec] of Object.entries(cat.sections)) {
        if (sec.items && sec.items[itemId]) {
            snapshot = JSON.parse(JSON.stringify(sec.items[itemId]));
            foundSectionId = secId;
            break;
        }
    }

    if (!foundSectionId || !snapshot) {
        showToast('Item not found', 'error');
        return;
    }

    const itemText = snapshot.text || snapshot.id || 'requirement';
    showCustomConfirm('Remove "' + itemText + '"? It disappears from all progress and syncs to your other devices. You can undo right after.', function() {
        // Re-lookup after async confirm
        const comp = getCompetenciesData();
        const c = comp[catKey];
        if (!(c && c.sections[foundSectionId] && c.sections[foundSectionId].items[itemId])) return;

        // Tombstone BEFORE deleting so cross-device merges can't resurrect it
        if (!roadmapData.clinicalData.deletedCompItemIds) roadmapData.clinicalData.deletedCompItemIds = {};
        roadmapData.clinicalData.deletedCompItemIds[itemId] = new Date().toISOString();

        delete c.sections[foundSectionId].items[itemId];
        clinicalDataDirty = true;
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        renderCompetencies();
        if (typeof renderDashboard === 'function') renderDashboard();

        // Stash for one-step undo
        cv2LastDelete = { catKey: catKey, sectionId: foundSectionId, itemId: itemId, item: snapshot };
        showToast('Removed "' + escapeHtml(itemText) + '" · <span class="cv2-undo-btn" onclick="cv2UndoDeleteItem()">Undo</span>', 'success', { html: true, duration: 5000 });
    }, null, 'Remove Requirement');
}

// One-step undo for a requirement deletion — clears the tombstone and re-inserts the item
function cv2UndoDeleteItem() {
    if (!cv2LastDelete) { showToast('Nothing to undo'); return; }
    const d = cv2LastDelete;
    cv2LastDelete = null;

    const comp = getCompetenciesData();
    const cat = comp[d.catKey];
    const sec = cat && cat.sections ? cat.sections[d.sectionId] : null;
    if (!cat || !sec) { showToast('Category no longer exists — cannot undo', 'error'); return; }

    if (!sec.items || Array.isArray(sec.items)) sec.items = migrateArrayToObject(sec.items, 'item');
    sec.items[d.itemId] = d.item;

    // Clear the tombstone so the restored item is not re-purged on next init/merge
    if (roadmapData.clinicalData.deletedCompItemIds) delete roadmapData.clinicalData.deletedCompItemIds[d.itemId];

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderCompetencies();
    if (typeof renderDashboard === 'function') renderDashboard();
    showToast('Requirement restored');
}
```

- [ ] **Step 4: Declare the `cv2LastDelete` state variable**

`cv2LastChange` is declared near the other cv2 state vars. Find it:

Run: `grep -n "cv2LastChange\s*=" js/graduation-roadmap/clinical.js | head -3`

At the first declaration line (a `let cv2LastChange = null;` or `var cv2LastChange = null;`), add immediately after it:
```javascript
let cv2LastDelete = null; // snapshot for one-step undo of a requirement deletion
```
(Match `let`/`var` to whatever the existing `cv2LastChange` declaration uses.)

- [ ] **Step 5: Add tombstone purge to syncSchemaFields (primary backstop)**

In `syncSchemaFields` (clinical.js), insert a purge pass immediately after the `defaults` map is built and BEFORE the orphaned-category loop. Change (clinical.js:1193-1194):
```javascript
    });
    // Remove saved categories not in DEFAULT_COMPETENCIES (e.g., stale srp from cloud merge)
```
to:
```javascript
    });

    // Purge tombstoned competency items on EVERY init — this is the backstop that
    // defeats all resurrection vectors (cloud merge, migrations, re-seed) because it
    // runs after them. Keyed on item.id (the id merges/tombstones both match on).
    var _compTombs = roadmapData.clinicalData.deletedCompItemIds || {};
    if (Object.keys(_compTombs).length > 0) {
        getValues(comp).forEach(function(cat) {
            getValues(cat.sections).forEach(function(sec) {
                var items = sec.items || {};
                Object.keys(items).forEach(function(k) {
                    if (items[k] && items[k].id && _compTombs[items[k].id]) {
                        console.log('[SCHEMA-SYNC] Purging tombstoned competency item: ' + items[k].id);
                        delete items[k];
                    }
                });
            });
        });
    }

    // Remove saved categories not in DEFAULT_COMPETENCIES (e.g., stale srp from cloud merge)
```

- [ ] **Step 6: saveCompItem defensive tombstone-clear on add**

In `saveCompItem`, the add branch assigns `section.items[newItemId] = newItem;` (clinical.js:2846). Immediately before that line, add:
```javascript
        // Defensive: a fresh custom id can't collide, but if an id is ever reused,
        // clear any stale tombstone so the new item isn't purged on next init.
        if (roadmapData.clinicalData.deletedCompItemIds) delete roadmapData.clinicalData.deletedCompItemIds[newItemId];
```

- [ ] **Step 7: resetCompetencies clears tombstones**

In `resetCompetencies`, the block clears migration flags (clinical.js:2697-2706). Immediately after `localStorage.removeItem('d4EventsSeeded_v1');` (line 2705) and before `expandedCompCategories.clear();`, add:
```javascript
        // Full clean slate: deleted requirements reappear after a hard reset
        roadmapData.clinicalData.deletedCompItemIds = {};
```

- [ ] **Step 8: Syntax gate**

Run: `node --check js/graduation-roadmap/clinical.js`
Expected: exits 0, no output.

- [ ] **Step 9: Behavioral test — header % equals overall unit-weighted %**

Write `<scratchpad>/test-header.js`:
```javascript
const fs = require('fs');
const src = fs.readFileSync('js/graduation-roadmap/clinical.js', 'utf8');
global.getValues = o => o ? Object.values(o) : [];
global.getItemStatus = it => (it.completed >= it.required ? 'completed' : it.completed > 0 ? 'in_progress' : 'pending');
function grab(name){const s=src.indexOf('function '+name+'(');const e=src.indexOf('\nfunction ',s+10);return src.slice(s,e);}
eval(grab('calculateCategoryStats'));
eval(grab('calculateOverallStats'));
// Two items: 1/1 done, 1/4 partial. Unit-weighted = (1+1)/(1+4)=40%. Binary = 1/2=50%.
const comp = { endo: { sections: { s1: { items: {
  a: { id:'a', completed:1, required:1 },
  b: { id:'b', completed:1, required:4 }
} } } } };
const overall = calculateOverallStats(comp).overallPercent;
if (overall !== 40) { console.error('FAIL expected 40 got ' + overall); process.exit(1); }
console.log('PASS: unit-weighted overall = 40% (not the binary 50%)');
```
Run: `cd /Users/suleman/dental-quest && node <scratchpad>/test-header.js`
Expected: `PASS: unit-weighted overall = 40% (not the binary 50%)`

- [ ] **Step 10: Commit**

```bash
git add js/graduation-roadmap/clinical.js
git commit -m "d4 competencies: unify header % to unit-weighted; dynamic delete-any-requirement with tombstone + undo; syncSchemaFields purge backstop"
```

---

### Task 3: firebase-sync.js — reconstructState + mergeRemoteCollectionsIntoLocal + Guard F

**Files:**
- Modify: `js/graduation-roadmap/firebase-sync.js:271-275` (reconstructState competencies merge — pass tombstone union)
- Modify: `js/graduation-roadmap/firebase-sync.js:351-377` (reconstructState purge + union assignment)
- Modify: `js/graduation-roadmap/firebase-sync.js:640-655` (mergeRemoteCollectionsIntoLocal union)
- Modify: `js/graduation-roadmap/firebase-sync.js:734-751` (init + addMissing + mergeCompetencies arg)
- Modify: `js/graduation-roadmap/firebase-sync.js:779-784` (purge + persist)
- Modify: `js/graduation-roadmap/firebase-sync.js:2717` (Guard F object check)

- [ ] **Step 1: reconstructState — build the tombstone union and pass it to mergeCompetencies**

Change (firebase-sync.js:271-275):
```javascript
    if (isSourceWins) {
        cd.competencies = mergeCompetencies(s.clinicalData?.competencies, f.clinicalData?.competencies);
    } else {
        cd.competencies = mergeCompetencies(f.clinicalData?.competencies, s.clinicalData?.competencies);
    }
```
to:
```javascript
    var _delComps = { ...(s.clinicalData?.deletedCompItemIds || {}), ...(f.clinicalData?.deletedCompItemIds || {}) };
    if (isSourceWins) {
        cd.competencies = mergeCompetencies(s.clinicalData?.competencies, f.clinicalData?.competencies, _delComps);
    } else {
        cd.competencies = mergeCompetencies(f.clinicalData?.competencies, s.clinicalData?.competencies, _delComps);
    }
```

- [ ] **Step 2: reconstructState — purge tombstoned competency items (skip source-wins)**

In the tombstone-filtering block (firebase-sync.js:351-359), after the `patientRecords` purge line, add a competency purge. Change:
```javascript
        Object.keys(cd.patientRecords || {}).forEach(function(id) { if (_delPRs[id]) delete cd.patientRecords[id]; });
    }
```
to:
```javascript
        Object.keys(cd.patientRecords || {}).forEach(function(id) { if (_delPRs[id]) delete cd.patientRecords[id]; });
        // Competency items are nested (category → sections → items)
        if (Object.keys(_delComps).length > 0) {
            getValues(cd.competencies).forEach(function(cat) {
                getValues(cat.sections).forEach(function(sec) {
                    var items = sec.items || {};
                    Object.keys(items).forEach(function(k) {
                        if (items[k] && items[k].id && _delComps[items[k].id]) delete items[k];
                    });
                });
            });
        }
    }
```

- [ ] **Step 3: reconstructState — persist the unioned competency tombstone**

Change (firebase-sync.js:375-377):
```javascript
    cd.deletedAppointmentIds = { ...(s.clinicalData?.deletedAppointmentIds || {}), ...(f.clinicalData?.deletedAppointmentIds || {}) };
    cd.deletedProcedureIds = { ...(s.clinicalData?.deletedProcedureIds || {}), ...(f.clinicalData?.deletedProcedureIds || {}) };
    cd.deletedPatientRecordIds = { ...(s.clinicalData?.deletedPatientRecordIds || {}), ...(f.clinicalData?.deletedPatientRecordIds || {}) };
```
to:
```javascript
    cd.deletedAppointmentIds = { ...(s.clinicalData?.deletedAppointmentIds || {}), ...(f.clinicalData?.deletedAppointmentIds || {}) };
    cd.deletedProcedureIds = { ...(s.clinicalData?.deletedProcedureIds || {}), ...(f.clinicalData?.deletedProcedureIds || {}) };
    cd.deletedPatientRecordIds = { ...(s.clinicalData?.deletedPatientRecordIds || {}), ...(f.clinicalData?.deletedPatientRecordIds || {}) };
    cd.deletedCompItemIds = _delComps;
```

- [ ] **Step 4: mergeRemoteCollectionsIntoLocal — union the competency tombstones**

Change (firebase-sync.js:636-639):
```javascript
    var deletedPRs = {
        ...(roadmapData.clinicalData?.deletedPatientRecordIds || {}),
        ...(data.clinicalData?.deletedPatientRecordIds || {})
    };
```
to:
```javascript
    var deletedPRs = {
        ...(roadmapData.clinicalData?.deletedPatientRecordIds || {}),
        ...(data.clinicalData?.deletedPatientRecordIds || {})
    };
    var deletedComps = {
        ...(roadmapData.clinicalData?.deletedCompItemIds || {}),
        ...(data.clinicalData?.deletedCompItemIds || {})
    };
```

- [ ] **Step 5: mergeRemoteCollectionsIntoLocal — init, addMissing, and pass union to mergeCompetencies**

Change (firebase-sync.js:734-739):
```javascript
        if (!roadmapData.clinicalData.deletedAppointmentIds) roadmapData.clinicalData.deletedAppointmentIds = {};
        if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
        if (!roadmapData.clinicalData.deletedPatientRecordIds) roadmapData.clinicalData.deletedPatientRecordIds = {};
        addMissing(roadmapData.clinicalData.deletedAppointmentIds, data.clinicalData?.deletedAppointmentIds);
        addMissing(roadmapData.clinicalData.deletedProcedureIds, data.clinicalData?.deletedProcedureIds);
        addMissing(roadmapData.clinicalData.deletedPatientRecordIds, data.clinicalData?.deletedPatientRecordIds);
```
to:
```javascript
        if (!roadmapData.clinicalData.deletedAppointmentIds) roadmapData.clinicalData.deletedAppointmentIds = {};
        if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
        if (!roadmapData.clinicalData.deletedPatientRecordIds) roadmapData.clinicalData.deletedPatientRecordIds = {};
        if (!roadmapData.clinicalData.deletedCompItemIds) roadmapData.clinicalData.deletedCompItemIds = {};
        addMissing(roadmapData.clinicalData.deletedAppointmentIds, data.clinicalData?.deletedAppointmentIds);
        addMissing(roadmapData.clinicalData.deletedProcedureIds, data.clinicalData?.deletedProcedureIds);
        addMissing(roadmapData.clinicalData.deletedPatientRecordIds, data.clinicalData?.deletedPatientRecordIds);
        addMissing(roadmapData.clinicalData.deletedCompItemIds, data.clinicalData?.deletedCompItemIds);
```

Then change the competencies merge (firebase-sync.js:747-751):
```javascript
        if (data.clinicalData.competencies) {
            roadmapData.clinicalData.competencies = mergeCompetencies(
                roadmapData.clinicalData.competencies, data.clinicalData.competencies
            );
        }
```
to:
```javascript
        if (data.clinicalData.competencies) {
            roadmapData.clinicalData.competencies = mergeCompetencies(
                roadmapData.clinicalData.competencies, data.clinicalData.competencies, deletedComps
            );
        }
```

- [ ] **Step 6: mergeRemoteCollectionsIntoLocal — purge tombstoned items + persist union**

Change (firebase-sync.js:779-784):
```javascript
    // Persist the unioned clinical tombstones (mirrors deletedD4EventIds below)
    if (roadmapData.clinicalData) {
        roadmapData.clinicalData.deletedAppointmentIds = deletedApts;
        roadmapData.clinicalData.deletedProcedureIds = deletedProcs;
        roadmapData.clinicalData.deletedPatientRecordIds = deletedPRs;
    }
```
to:
```javascript
    // Purge competency items tombstoned on another device (deletes win over key-union).
    // Runs even when the payload carries no clinicalData — remote tombstones still apply.
    if (Object.keys(deletedComps).length > 0 && roadmapData.clinicalData?.competencies) {
        getValues(roadmapData.clinicalData.competencies).forEach(function(cat) {
            getValues(cat.sections).forEach(function(sec) {
                var items = sec.items || {};
                Object.keys(items).forEach(function(k) {
                    if (items[k] && items[k].id && deletedComps[items[k].id]) delete items[k];
                });
            });
        });
    }
    // Persist the unioned clinical tombstones (mirrors deletedD4EventIds below)
    if (roadmapData.clinicalData) {
        roadmapData.clinicalData.deletedAppointmentIds = deletedApts;
        roadmapData.clinicalData.deletedProcedureIds = deletedProcs;
        roadmapData.clinicalData.deletedPatientRecordIds = deletedPRs;
        roadmapData.clinicalData.deletedCompItemIds = deletedComps;
    }
```

- [ ] **Step 7: Guard F — validate deletedCompItemIds is an object if present**

In `validateStateIntegrity` (firebase-sync.js:2717-2720), after the competencies check block, add:
```javascript
    if (data.clinicalData?.deletedCompItemIds !== undefined && data.clinicalData.deletedCompItemIds !== null && typeof data.clinicalData.deletedCompItemIds !== 'object') {
        console.error('[GUARD-F] clinicalData.deletedCompItemIds is not an object');
        errors.push('clinicalData.deletedCompItemIds is not an object');
    }
```
Insert it immediately after the closing `}` of the `clinicalData.competencies` check (the block ending at line 2720).

- [ ] **Step 8: Syntax gate**

Run: `node --check js/graduation-roadmap/firebase-sync.js`
Expected: exits 0, no output.

- [ ] **Step 9: Commit**

```bash
git add js/graduation-roadmap/firebase-sync.js
git commit -m "d4 competencies: wire deletedCompItemIds through reconstructState (3 strategies), mergeRemoteCollectionsIntoLocal, Guard F"
```

---

### Task 4: init.js — remove Mission Control Clinic Volume block

**Files:**
- Modify: `js/graduation-roadmap/init.js:740-745` (remove aptPct/procPct locals)
- Modify: `js/graduation-roadmap/init.js:752-753` (remove aptPace/procPace locals)
- Modify: `js/graduation-roadmap/init.js:899-968` (remove Clinic Volume render block)

Keep `smartApts`, `smartProcs`, `clinicHeadlines` (line 1125 still reads `clinicHeadlines.procedures` for the graduation-window tile).

- [ ] **Step 1: Remove the aptPct/procPct locals**

Delete (init.js:740-745):
```javascript
    const aptPct = clinicHeadlines.appointments.target > 0
        ? Math.min(100, Math.round((clinicHeadlines.appointments.completed / clinicHeadlines.appointments.target) * 100))
        : 0;
    const procPct = clinicHeadlines.procedures.target > 0
        ? Math.min(100, Math.round((clinicHeadlines.procedures.completed / clinicHeadlines.procedures.target) * 100))
        : 0;

```
(Remove all six lines including the trailing blank line. The next line is `    // Graduation readiness`.)

- [ ] **Step 2: Remove the aptPace/procPace locals**

Delete (init.js:751-753):
```javascript
    // Pace projections
    var aptPace = calculatePaceProjection(smartApts.total, clinicHeadlines.appointments.target);
    var procPace = calculatePaceProjection(smartProcs.total, clinicHeadlines.procedures.target);
```
(The next kept line is `    // Build competency category progress grid`.)

- [ ] **Step 3: Remove the Clinic Volume render block**

Delete the entire block from init.js:899 (`// SECONDARY: clinic volume counters...`) through init.js:968 (`html += '</div>'; // end headline counters grid`) inclusive. That is: the `🏥 Clinic Volume` label, the counters grid open, both Appointments and Procedures cards (counters, inputs, bars, breakdowns, pace lines), and the grid close.

The line immediately BEFORE the block is init.js:897 `html += '</div>';` (closes the competency category grid). The line immediately AFTER is init.js:970 `// Quick action buttons`. After the edit, line 897's `html += '</div>';` must be directly followed (after the blank line) by `// Quick action buttons`.

Concretely, replace:
```javascript
    html += '</div>';

    // SECONDARY: clinic volume counters — supporting metrics, no semester framing
```
...through the block...
```javascript
    html += '</div>'; // end headline counters grid

    // Quick action buttons
```
with:
```javascript
    html += '</div>';

    // Quick action buttons
```
(Anchor the first `html += '</div>';` uniquely: it is the one immediately preceded by `html += categoryProgressHTML;` two lines up. Read init.js:894-970 first to capture the exact unique old_string spanning grid-close → block → Quick-action comment, then replace in one Edit.)

- [ ] **Step 4: Syntax gate**

Run: `node --check js/graduation-roadmap/init.js`
Expected: exits 0, no output.

- [ ] **Step 5: Verify no dangling references to removed locals**

Run: `grep -n "aptPct\|procPct\|aptPace\|procPace\|Clinic Volume\|headline-apt-target\|headline-proc-target" js/graduation-roadmap/init.js`
Expected: **no output** (all removed). `updateHeadlineTarget` function definition at ~1610 may remain (now unreferenced, harmless).

- [ ] **Step 6: Commit**

```bash
git add js/graduation-roadmap/init.js
git commit -m "d4 mission control: remove Clinic Volume block (appointments/procedures counters + pace)"
```

---

### Task 5: graduation-roadmap.html — re-theme cv2 CSS to Mission Control (purple/slate, compact)

**Files:**
- Modify: `graduation-roadmap.html` cv2 `:root` variable block (~3915-3958)
- Modify: `graduation-roadmap.html` cv2 header selectors (~5224-5300) + hardcoded-color patches

**Approach:** The cv2 stylesheet is variable-driven, so rewriting the `--cv2-*` custom properties from the warm-light Atlas palette to a dark cool-purple palette re-themes all ~218 selectors at once. Class names are untouched → all JS keeps working.

- [ ] **Step 1: Read the exact variable block**

Run: `sed -n '3910,3960p' graduation-roadmap.html` (via Read tool, offset 3910 limit 55) to capture exact current text of the `--cv2-*` declarations.

- [ ] **Step 2: Rewrite the cv2 variable palette to Mission Control colors**

Replace the warm-light values with the dark cool-purple set (keep the SAME variable names and any names not shown here at their existing definitions; only change the values listed):
```css
            /* Surfaces — slate, matches Mission Control cards */
            --cv2-canvas: #0f172a;
            --cv2-surface: rgba(30,41,59,0.6);
            --cv2-surface-alt: rgba(30,41,59,0.9);
            --cv2-surface-inset: rgba(15,23,42,0.7);
            --cv2-surface-raised: rgba(51,65,85,0.7);
            --cv2-border: rgba(124,58,237,0.25);
            --cv2-border-subtle: rgba(124,58,237,0.15);
            --cv2-border-strong: rgba(124,58,237,0.4);

            /* Ink — light text on slate */
            --cv2-ink: #e2e8f0;
            --cv2-ink-soft: #94a3b8;
            --cv2-muted: #94a3b8;
            --cv2-dim: #64748b;

            /* Status — green/amber/red on dark */
            --cv2-done: #10b981;
            --cv2-done-bg: rgba(16,185,129,0.12);
            --cv2-done-fg: #6ee7b7;
            --cv2-wip: #f59e0b;
            --cv2-wip-bg: rgba(245,158,11,0.12);
            --cv2-wip-fg: #fbbf24;
            --cv2-critical: #ef4444;
            --cv2-critical-bg: rgba(239,68,68,0.12);
            --cv2-critical-fg: #f87171;
            --cv2-locked: #64748b;
            --cv2-accent: #a78bfa;
            --cv2-accent-light: rgba(124,58,237,0.2);

            /* Fonts — system stack, no serif */
            --cv2-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            --cv2-font-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            --cv2-mono: 'SF Mono', 'Consolas', 'Monaco', monospace;

            /* Shadows — deeper for dark bg */
            --cv2-shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
            --cv2-shadow-md: 0 2px 8px rgba(0,0,0,0.35);
            --cv2-shadow-lg: 0 4px 16px rgba(0,0,0,0.4);
```
Match each `--cv2-NAME:` line's replacement to the existing line (same name, new value). For the two `--cv2-font-heading` and `--cv2-font` and `--cv2-mono` lines, replace values as above. Preserve `--cv2-gap`, `--cv2-radius*` unchanged.

- [ ] **Step 3: Verify variable names referenced but not redefined still exist**

Run: `grep -oE "var\(--cv2-[a-z-]+\)" graduation-roadmap.html | sort -u`
Cross-check every referenced variable has a definition in the `:root` block (`grep -n "\-\-cv2-" graduation-roadmap.html | grep ":"`). If any referenced var (e.g. `--cv2-surface-raised`, `--cv2-accent-light`) is used but was never defined, add it to the block with an appropriate dark value. Fix any gaps inline.

- [ ] **Step 4: Read + patch the header selectors for compact hero look**

Read the header CSS: Read tool offset 5224 limit 90 (`.cv2-header`, `.cv2-header-main`, `.cv2-header-score`, `.cv2-header-bar`, `.cv2-header-meta`, `.cv2-header-pills`, `.cv2-header-pill*`). Ensure:
- `.cv2-header` uses a purple gradient background (`linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))`) with `border:1px solid var(--cv2-border-strong)` and `border-radius:14px`.
- `.cv2-header-score` large/bold (font-size ~2em, font-weight 800), colored by `.cv2-color-done/wip/critical`.
- `.cv2-header-bar` thin (height 8px), `.cv2-header-bar-fill` a purple gradient default.
- Pills compact (`.cv2-header-pill` small padding, rounded, slate bg + purple text).

Apply targeted Edits only where the current values conflict with the above (the variable retheme already handles most colors). Keep changes minimal — do not rename classes.

- [ ] **Step 5: Scan for hardcoded warm colors still in cv2 selectors**

Run: `awk 'NR>=3960 && NR<=5560' graduation-roadmap.html | grep -niE "#faf8f5|#ffffff|#f5f2ed|#efece6|#2c2825|#6b635b|#9c948b|#c4bcb3|#5e8a5e|#c4923a|#b85c5c|#6b7c5e|source serif|georgia" | head`
For each hit inside a `.cv2-*` rule, replace the hardcoded warm value with the corresponding `var(--cv2-*)` or a dark equivalent. (Most rules already use variables; this catches stragglers.)

- [ ] **Step 6: Compact the item rows and delete button**

Read `.cv2-req-row`, `.cv2-req-name`, `.cv2-delete-btn` (offsets ~4430-4470 and ~4744-4770). Ensure:
- `.cv2-req-row` tight vertical padding (~8px), subtle bottom border (`var(--cv2-border-subtle)`), hover `var(--cv2-surface-raised)`.
- `.cv2-delete-btn` muted by default (`color: var(--cv2-dim)`), hover red (`color: var(--cv2-critical)`), small, so showing it on every row is not visually noisy.
Apply minimal Edits only where needed.

- [ ] **Step 7: Check the mobile override block**

Read offsets ~5145-5200 and ~5541-5560 (mobile `@media` cv2 overrides). Confirm nothing hardcodes a light background that would break the dark theme on mobile. Patch any `background:#fff`-style values to `var(--cv2-surface)` / `var(--cv2-canvas)`.

- [ ] **Step 8: Commit**

```bash
git add graduation-roadmap.html
git commit -m "d4 competencies: re-theme cv2 tab to Mission Control purple/slate (variable palette + compact rows)"
```

---

### Task 6: Cache-bust script tags

**Files:**
- Modify: `graduation-roadmap.html` `<script src>` tags for the 4 edited modules

- [ ] **Step 1: Find the script tags**

Run: `grep -n "state.js\|clinical.js\|firebase-sync.js\|graduation-roadmap/init.js" graduation-roadmap.html | grep "script src"`

- [ ] **Step 2: Bump `?v=` to 20260819 on each edited module's tag**

For each of `state.js`, `clinical.js`, `firebase-sync.js`, `init.js` script tags, set/replace the `?v=...` query to `?v=20260819`. If a tag has no `?v=`, add `?v=20260819` before the closing quote.

- [ ] **Step 3: Commit**

```bash
git add graduation-roadmap.html
git commit -m "d4: cache-bust competencies redesign modules (v=20260819)"
```

---

### Task 7: Final QA — brace balance, integration, manual checklist

- [ ] **Step 1: Syntax gate all four modules**

Run:
```bash
cd /Users/suleman/dental-quest
for f in state clinical firebase-sync init; do node --check js/graduation-roadmap/$f.js && echo "OK $f"; done
```
Expected: `OK state`, `OK clinical`, `OK firebase-sync`, `OK init`.

- [ ] **Step 2: Tombstone wiring completeness scan**

Run: `grep -rn "deletedCompItemIds" js/graduation-roadmap/`
Expected sites (all present): state.js default (~210), state.js isEmptyState (337); clinical.js deleteCompItem write + cv2UndoDeleteItem clear + syncSchemaFields purge + saveCompItem defensive + resetCompetencies clear; firebase-sync.js reconstructState (union/purge/persist) + mergeRemoteCollectionsIntoLocal (union/init/addMissing/purge/persist) + Guard F.

- [ ] **Step 3: Confirm no leftover `custom`-gated delete or "Cannot delete default"**

Run: `grep -n "Cannot delete default\|item.custom === true" js/graduation-roadmap/clinical.js`
Expected: the `Cannot delete default` string is GONE; `item.custom` may still appear in `saveCompItem` (setting the flag on new items) and orphan-removal guard — that is correct.

- [ ] **Step 4: Manual browser verification (checklist)**

Open `graduation-roadmap.html` locally (or after push, live). Verify:
1. **% parity** — Competencies tab header % == Mission Control Graduation Requirements %. Toggle a multi-count item's counter → both move together, stay equal.
2. **Delete persists** — Delete "Pulpectomy Summative #2" under Endodontics → row gone, category count/denominator drop, header % recomputes. Reload → still gone.
3. **Undo** — Delete a requirement → click **Undo** in the toast (within 5s) → item returns, % restores.
4. **Add** — "+ Add requirement" in a category → new item persists across reload.
5. **Cross-device (simulated)** — In devtools console: `roadmapData.clinicalData.deletedCompItemIds` contains the deleted id with an ISO timestamp.
6. **Clinic Volume gone** — Mission Control shows Graduation Requirements + category grid + quick actions + patient tracker, but **no** 🏥 Clinic Volume counters. No console errors.
7. **Reset** — Competencies → Reset → deleted requirements reappear AND `deletedCompItemIds` is `{}`.
8. **Look** — Competencies tab is dark purple/slate, compact, visually consistent with Mission Control. Search, filter chips, counters, check-off, notes, add, delete all work on desktop + mobile widths.

- [ ] **Step 5: Push**

```bash
git push origin main
```
(Only after the user confirms the manual checklist passes, per project convention on outward-facing changes.)

---

## Self-Review

- **Spec coverage:** Pillar 1 → Task 2 Step 1. Pillar 2 → Task 1 (tombstone default/merge), Task 2 (delete/undo/purge/reset/defensive), Task 3 (merge-site wiring), plus add already works. Pillar 3 → Task 4. Pillar 4 → Task 5. Pillar 5 → tombstone wiring across Tasks 1/2/3 + Guard F + isEmptyState + cache-bust (Task 6) + QA scan (Task 7 Step 2). All five pillars covered.
- **Types/names consistency:** New symbols — `deletedCompItemIds` (map), `cv2LastDelete` (var), `cv2UndoDeleteItem()` (fn), `mergeCompetencies(local, cloud, deletedIds)` (3rd param). Used consistently across all tasks.
- **No placeholders:** every code step shows real code.
- **Ordering:** state.js first (defines the param mergeCompetencies callers rely on), then clinical.js (delete/undo/purge), then firebase-sync.js (passes the union), then init.js (independent), then CSS, then cache-bust, then QA. No forward dependency on an undefined symbol.
