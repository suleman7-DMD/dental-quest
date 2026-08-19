# Competencies Tab: Dynamic Requirements, Unified %, Mission-Control Redesign

**Date:** 2026-08-19
**App:** graduation-roadmap (D4 era) — `graduation-roadmap.html` + `js/graduation-roadmap/*.js`
**Status:** Approved (design). Next: implementation plan.

## Problem

1. **Two different graduation percentages.** Mission Control → Graduation Requirements shows **47%** (unit-weighted: `completedUnits/totalUnits`, via `calculateOverallStats().overallPercent`). The Competencies tab header shows **38%** (binary item-count: `itemsDone/itemsTotal`, in `cv2BuildHeader`). Same data (`roadmapData.clinicalData.competencies`), two formulas. Reads as a bug.
2. **Requirements are not dynamic.** The school's requirements change (e.g. Endo "Pulpectomy Summative #2" and a Perio requirement may be dropped). Today `deleteCompItem` hard-blocks default items (`if (!item.custom)`), and there is **no tombstone** for competency items, so even a deleted custom item resurrects from another device via `mergeCompetencies`.
3. **Stale tracker.** The school no longer tracks overall appointment/procedure counts as a requirement, but Mission Control still renders the 🏥 Clinic Volume counters (X/90 appts, X/116 procs).
4. **Competencies tab UI** (warm "Atlas Console" theme) is not sleek; user wants it to match Mission Control's compact purple/slate Graduation Requirements card.

## Decisions (locked)

- **Global % = 47% (unit-weighted)** everywhere.
- **Remove = Mission Control 🏥 Clinic Volume render block only.** Keep the two competency "total units" requirements (`fixed-units-total`, `cd-units-total`) and the `clinicHeadlines` data model + its Firebase merge.
- **Delete scope = individual requirements only** (no whole-category delete).
- **Tombstone location = under `clinicalData`** (sibling of `deletedProcedureIds` etc.).
- **Delete is undoable** (5s Undo toast), not "cannot be undone."
- **No `DEFAULT_COMPETENCIES` change → no migration-flag bump.**

## Non-goals

- Whole-category deletion.
- Making edits to a *default* requirement's `required`/`text` persistent (syncSchemaFields re-pins defaults; still reverts). Flagged as a known limitation.
- Any change to competency count math besides the header formula swap.

---

## Pillar 1 — Unify to 47% (unit-weighted)

**File:** `js/graduation-roadmap/clinical.js`, `cv2BuildHeader` (~2107–2150).

- Replace the headline `pct` computation. Currently:
  ```js
  var pct = itemsTotal > 0 ? Math.round((itemsDone / itemsTotal) * 100) : 0;
  ```
  Change to unit-weighted using the shared helper:
  ```js
  var pct = calculateOverallStats(competencies).overallPercent; // completedUnits/totalUnits
  ```
- Keep `itemsDone`/`itemsTotal` for the meta line ("X/Y requirements done · N days to graduation") and keep the summatives + "N left" pills unchanged.
- `barColor`/`scoreColor` thresholds keep keying off `pct` (now unit-weighted).
- `cv2UpdateHeader` (2551) already rebuilds via `cv2BuildHeader` → covered.

**Verify:** Competencies header, every `cv2-cat-bar` (`calculateCategoryStats().percent`, already unit-weighted), and Mission Control (`overallStats.overallPercent`, `readiness.percent`) all show the same 47%.

---

## Pillar 2 — Dynamic delete + tombstones (bulletproof, global)

### New data: `clinicalData.deletedCompItemIds`
Map `{ itemId: ISOtimestamp }`, mirroring `deletedProcedureIds`.

- **Defaults** (`state.js` getDefaultState, ~209): add `deletedCompItemIds: {}` next to `deletedProcedureIds`/`deletedPatientRecordIds`.
- **Live init guards**: wherever clinicalData tombstones are lazily created, add `if (!roadmapData.clinicalData.deletedCompItemIds) roadmapData.clinicalData.deletedCompItemIds = {};`.

### `deleteCompItem(catKey, itemId)` (clinical.js:2889)
- **Remove** the `if (!item.custom) { showToast('Cannot delete default requirements'...); return; }` block (2900–2903).
- Before deleting, **snapshot** the item + its `sectionId` + `catKey` for undo.
- On confirm:
  1. `roadmapData.clinicalData.deletedCompItemIds[item.id] = new Date().toISOString();` (key on `item.id`, the id merges/syncSchemaFields match on).
  2. `delete c.sections[foundSectionId].items[itemId];`
  3. `clinicalDataDirty = true;` → `safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));` → `saveData();`
  4. `renderCompetencies();`
  5. **Undo toast** (`showToast(..., 'success', { html:true, duration:5000 })` with an Undo action) → `cv2UndoDeleteItem()` which: clears the tombstone entry, re-inserts the snapshotted item into its section, persists, re-renders. If the section/category no longer exists, toast an error without mutating.
- Confirmation copy (clear, non-scary): "Remove \"<text>\"? It'll disappear from all progress and sync to your other devices. You can undo right after."

### Enforcement backstop: `syncSchemaFields()` purge (clinical.js:1185)
Runs on **every** init, after all migrations. Add a purge pass (before the field-sync loop):
```js
var tombstones = roadmapData.clinicalData.deletedCompItemIds || {};
getValues(comp).forEach(cat => getValues(cat.sections).forEach(sec => {
  var items = sec.items || {};
  Object.keys(items).forEach(k => {
    var it = items[k];
    if (it && it.id && tombstones[it.id]) { delete items[k]; }
  });
}));
```
This single loop defeats every resurrection vector (cloud merge re-add, D3D4Split re-add, enhancement re-seed) because it runs after them each init.

### Cross-device merge: honor + union tombstones
- **`mergeCompetencies(local, cloud, deletedIds)`** (`state.js:758`): add a 3rd param `deletedIds` (the unioned tombstone set). When adding a cloud-only item (822–827) or a cloud-only section (806–817), **skip any item whose `id` is in `deletedIds`**.
- **`reconstructState`** (`firebase-sync.js:272–274`): union `deletedCompItemIds` from source+fallback (mirror `deletedD4EventIds` at 477–484), pass the union into `mergeCompetencies`, and **post-merge purge** competency items whose id is tombstoned (skip purge for `source-wins`, matching the existing tombstone convention). Set `result.clinicalData.deletedCompItemIds = union`.
- **`mergeRemoteCollectionsIntoLocal`** (`firebase-sync.js` ~659): `addMissing(roadmapData.clinicalData.deletedCompItemIds ||= {}, remote.clinicalData?.deletedCompItemIds)` (newer-wins union), then purge tombstoned competency items in place.

### Guards / lifecycle
- **`isEmptyState`** (`state.js:337`): add `getCount(data.clinicalData?.deletedCompItemIds) > 0` to `hasDeletedRecords` (a state with only competency deletions must still save).
- **Guard F / `validateStateIntegrity`** (`firebase-sync.js` ~2716): add an object-type check for `deletedCompItemIds` (mirror the `competencyUIState` check; allow undefined/null/object).
- **`resetCompetencies`** (`clinical.js:2678`): clear `deletedCompItemIds = {}` as part of the reset (full clean slate). Tombstones are otherwise **preserved** through restore/import (they are data, not migration flags — do NOT add to the 8-flag clear list).
- **`saveCompItem` add path**: defensively `delete deletedCompItemIds[newItemId]` (no-op for fresh custom ids; guards re-add/id-reuse edge).

### Add requirement
Already implemented (`openAddCompItemModal`/`saveCompItem`, custom items survive orphan removal). Surface the existing per-category **"+ Add requirement"** button prominently in the redesign (Pillar 4).

---

## Pillar 3 — Remove Mission Control 🏥 Clinic Volume block

**File:** `js/graduation-roadmap/init.js`.

- Delete the render block **~899–968** (the "🏥 Clinic Volume" label, the appointments/procedures counters grid, pace projection lines, `updateHeadlineTarget` inputs).
- Prune locals that feed **only** that block: `aptPct`/`procPct` (740–745), `aptPace`/`procPace` (752–753). Verify `smartApts`/`smartProcs`/`clinicHeadlines` aren't used later in the same function (patient tracker summary etc.) before removing their computation; if used elsewhere, leave them.
- **Keep:** `clinicHeadlines` data model, its Firebase merge (`firebase-sync.js:541–569`, `978+`), `updateHeadlineTarget` function definition (harmless if now unreferenced — or remove if provably unused). The Competency Completion, Graduation Readiness, category grid, quick-action buttons, and patient tracker summary all stay.

---

## Pillar 4 — Redesign Competencies tab → Mission Control theme

**File:** `graduation-roadmap.html` (single inline `<style>` block; `cv2-*` selectors ~3962–5559 + mobile overrides after ~6645). **~218 selectors.**

- **Keep DOM structure and every `cv2-*` class name** so all JS (`cv2BuildHeader/Toolbar/CarryoverAlert/ItemRow`, `cv2UpdateItemRow/Header/CategoryHeader`, filters, counters) keeps working unchanged.
- **Rewrite CSS values** from the warm Atlas palette to Mission Control's cool identity:
  - Accents: `#7c3aed` / `#a78bfa` / `#c4b5fd` (violet).
  - Surfaces: `rgba(15,23,42,·)` / `rgba(30,41,59,·)` slate; borders `rgba(124,58,237,0.25–0.3)`.
  - Text: `#e2e8f0` primary, `#94a3b8` secondary, `#64748b` muted.
  - Progress bars: thin (5–8px), purple gradient (`linear-gradient(90deg,#7c3aed,#a78bfa)`); done=green `#10b981`, wip=amber `#f59e0b`, critical=red `#ef4444`.
  - Tighter padding, smaller type scale, compact rows — information-dense like the hero card.
- **Header** → compact purple-gradient hero (big unit-weighted %, thin gradient bar, meta line, pills).
- **Category headers/rows** → sleek `comp-mini-card`-style (icon, name, count, thin bar, %).
- **Item rows** → refined counters/checkboxes; **delete (✖) now on all rows** (Pillar 2 change to `cv2BuildItemRow` line ~2097: render delete for every item, not just `item.custom`); **"+ Add requirement"** button styled prominently.
- Update the mobile-override block to match.

---

## Pillar 5 — Bulletproof persistence (cross-cutting acceptance)

- Every mutating path: `clinicalDataDirty = true` → `safeLocalStorageSet(STORAGE_KEY, …)` → `saveData()`.
- Tombstone wired into **all** sites: defaults, live-init guards, `deleteCompItem`, `syncSchemaFields` purge, `mergeCompetencies`, `reconstructState` (×3 strategies), `mergeRemoteCollectionsIntoLocal`, `isEmptyState`, Guard F, `resetCompetencies` clear, `saveCompItem` defensive delete.
- No `DEFAULT_COMPETENCIES` schema change → no migration-flag bump.
- **Cache-bust:** bump `?v=YYYYMMDD` on the edited `<script src>` tags (clinical.js, state.js, firebase-sync.js, init.js) and the HTML if applicable.

## Test / verification plan

1. **% parity:** Open Competencies + Mission Control → both show identical unit-weighted % (47). Toggle a counter → both update, still equal.
2. **Delete persists on-device:** Delete "Pulpectomy Summative #2" → gone from list, denominator drops, % recomputes. Reload page → still gone (syncSchemaFields purge holds).
3. **Delete persists cross-device (simulated):** Confirm tombstone present in `clinicalData.deletedCompItemIds`; simulate a remote payload still containing the item through `mergeCompetencies`/`mergeRemoteCollectionsIntoLocal` → item stays deleted.
4. **Undo:** Delete → Undo toast → item restored, tombstone cleared, % back.
5. **Add:** Add a custom requirement → persists across reload, survives `syncSchemaFields` orphan removal (custom-guarded).
6. **Clinic Volume gone:** Mission Control no longer renders the 🏥 block; no console errors; readiness/grid intact.
7. **Save guards:** A state whose only clinical change is a competency deletion still saves (isEmptyState passes via `hasDeletedRecords`); Guard F passes.
8. **Reset:** `resetCompetencies` restores defaults AND clears tombstones (deleted requirements reappear after a full reset).
9. **Redesign:** Competencies tab visually matches Mission Control (purple/slate, compact); all interactions (search, chips, counters, check-off, notes, add, delete) work on desktop + mobile.
