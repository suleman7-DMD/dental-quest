# Stim-Calc Sync & Persistence Audit — audit-sync

**Date:** 2026-08-19
**Scope (READ-ONLY):** `js/stimcalc/firebase-sync.js` (~1462 lines), `js/stimcalc/med-caffeine.js` (~295), `js/stimcalc/ui-sections.js` (~1964). Cross-referenced `state.js`, `pharma-engine.js`, `init.js`.
**Context:** Owner idle ~4.5 months (last change Apr 2 2026). Question: "is it broken / will reviving it lose or corrupt data?"

## Bottom line for the revival scenario
The app is **not structurally broken** and will **not produce wrong sleep predictions** from stale cloud data — the pharmacokinetic engine hard-filters any dose older than 1–3 days (`calculateAmpLoad` skips `daysDiff>1` normal / `>3` always, line 418/421; `calculateCaffLoad` 477/480). Defaults are safe (`_version: 0`, `_dataLoaded: false`), and `saveState`/`saveStateImmediate` carry identical, complete 5-guard sets. The genuine risks are (a) a **recent-edit loss window** because page-load merge is unconditional and `beforeunload` writes localStorage only, and (b) **cosmetic/misleading phantom stale-dose rows + a false STACKED warning on the first launch after a long idle**, which self-heal on the next launch.

---

## A. THE 5 GUARDS

### [GOOD] saveState / saveStateImmediate — identical, complete 5-guard sets
- `saveState()` guards: `pinValidated` (1242), `isInitialLoad` (1248), `hasLoadedFromCloud` (1254), `isEmptyState` (1260), `state._dataLoaded` (1266).
- `saveStateImmediate()` guards: `pinValidated` (1301), `isInitialLoad` (1307), `hasLoadedFromCloud` (1313), `isEmptyState` (1319), `state._dataLoaded` (1325). Verified **identical** to saveState. No drift.
- Both call `markLocalChange()` (1273 / 1332) then `saveToFirebase()`.

### [GOOD] Defaults are wipe-safe
- `getDefaultState()` (state.js): `_version: 0`, `_dataLoaded: false`. Global flags init correctly: `isInitialLoad=true`, `hasLoadedFromCloud=false`, `pinValidated=false`.

### [GOOD] skipPin() sets all flags — the correct pattern body-comp lacks
- firebase-sync.js:337-340 sets `pinValidated=true`, `hasLoadedFromCloud=true`, `isInitialLoad=false`, `state._dataLoaded=true`. Offline mode can save. (This is the reference implementation the sully-firebase skill cites for fixing body-comp bug #1.)

### [MEDIUM] `saveToFirebase()` has only 3 of 5 guards
- firebase-sync.js:353. Present: `isInitialLoad` (361), `hasLoadedFromCloud` (365), `isEmptyState` (369). **Missing: `pinValidated` and `state._dataLoaded`.**
- Not exploitable through the normal debounced path (saveState/saveStateImmediate guard all 5 first), but `saveToFirebase()` is called **directly** from `restoreCheckpoint` (751), force-upload paths (978, 1288), and `applyRemoteState` (1343) — those bypass the two missing guards. Real risk is low (all run post-load) but this is a defense-in-depth gap; the two entry points should be the only save surface, or `saveToFirebase` should carry the full 5.

### [INFO] isEmptyState can never permanently block a sparse state
- state.js `isEmptyState()` returns "not empty" whenever `_dataLoaded === true` (among other checks). Since every load path sets `_dataLoaded=true`, once loaded a legitimately sparse state is always saveable. Answers the audit question: **no permanent-block risk.** The mild trade-off is that a genuinely emptied state could be pushed, but `sleepHistory`/`sleepDailyLogs` persist through clears, so `getCount>0` keeps it non-empty in practice.

---

## B. MERGE & REALTIME

### [HIGH] `loadFromFirebase()` merges remote unconditionally — no local-vs-remote timestamp compare → recent-edit loss
- firebase-sync.js:391-404. On page load it calls `mergeRemoteState(data.state)` with **no comparison** of local `lastSaved`/`lastUpdated` vs remote `data.lastUpdated`.
- `mergeRemoteState()` (134-161) makes **remote win for every field** via `remote.X || state.X` (144-152); local only fills gaps.
- Combined with `beforeunload` (1225) which saves **localStorage ONLY, not Firebase** (line 1227 guard + `safeLocalStorageSet`, no `saveToFirebase`): any edit made inside the 2s Firebase debounce before the tab closes lands in localStorage but never in the cloud. On the next load, `loadFromFirebase` overwrites that localStorage edit with the older cloud state. **The localStorage-first durability guarantee is defeated by the unconditional merge.**
- This is exactly the bug the sully-firebase skill documents as fixed in d3-roadmap ("compare `roadmapData.lastSaved` vs `data.lastSaved` BEFORE calling `mergeRemoteState()`; if local is newer, skip merge"). It is **unfixed** in stim-calc's automatic load path.
- Not a full wipe: `isEmptyState` (369) + empty-remote guards prevent nuking with defaults. It is silent loss of the single most-recent edit, per reload.
- **Note the asymmetry:** the *manual* `forceCloudSync()` (568) DOES do conflict detection; only the automatic load/realtime paths skip it.

### [MEDIUM] `forceCloudSync()` conflict detection is dead on first use per session
- firebase-sync.js:590 gate requires `lastSyncTimestamp` truthy, but that variable starts `null` (26) and is set **only inside forceCloudSync** (608, 615). `loadFromFirebase` never seeds it. So the first "Force Sync" of a session fails the gate and falls through to `applyRemoteState(remoteState)` (613) — overwriting unsaved local edits with **no conflict prompt**. Subsequent force-syncs work. (`localChangesSinceLastSync` itself is fine — set by `markLocalChange()` on every save.)

### [MEDIUM] Realtime listener clobbers in-progress edits
- `setupRealtimeSync()` callback (494) on any new remote timestamp unconditionally sets `wakeTime.value`/`hoursSlept.value` (532-533) and calls `renderMedEntries()` (534), destroying an `<input>` the user is actively editing. Local time-edits deliberately avoid re-render for this reason (med-caffeine.js:72-75), but the remote-echo path does not. Echo suppression itself is sound: own writes tagged via `lastKnownTimestamp` (375) and skipped (519). Empty-remote guard present (513). Multi-device only.

### [GOOD] Checkpoint create/restore/list
- `createCheckpoint()` (630) deep-clones state, capped list. `restoreCheckpoint()` (728) restores then `saveToFirebase()` (751). Restore cannot wipe cloud with empty defaults (restored state is real data; empty-state guard still applies at save). See LOW note below on `_version`.

### [LOW] Restore/force paths set `state._version = Date.now()`
- firebase-sync.js:746 (restoreCheckpoint), 966, 1014 (force paths). Violates the "_version must be 0" rule in spirit. **Inert in this app** because stim-calc resolves conflicts by `lastUpdated` timestamp, not `_version` comparison (unlike body-comp). Defaults remain `_version:0` (verified). Flag for cross-app consistency only; not a wipe vector here.

---

## C. STALENESS RISK (cold start after 4.5-month gap)

### [GOOD] Sleep predictions are protected from stale doses
- `calculateAmpLoad` (pharma-engine.js:391): computes `daysDiff` from `med.date`; returns early for `daysDiff>1` (normal) / `>3` (always) (lines 413/418/421). `calculateCaffLoad` (457): same, `>1`/`>2` (472/477/480). A 4.5-month-old April dose has `daysDiff≈139` → **excluded**. Predictions will be correct on revival.

### [MEDIUM] Phantom stale-dose rows + false STACKED warning on the FIRST post-idle launch
- Ordering (init.js): `loadState()` (815) new-day-clears meds → `cleanupOldMedications()` (818) runs on now-empty local, deletes nothing → `initFirebase()` (821) → `loadFromFirebase()` async → `mergeRemoteState` restores **April meds from cloud** (144). `cleanupOldMedications` does **not** re-run after the merge.
- `renderMedEntries()` (med-caffeine.js:88-121) does **not** date-filter — it renders every med in `state.medications`, so the April doses show as rows with an orange "old date" selector.
- `updateStackingWarning()` (136-143) sums **all** doses regardless of date → inflated total, and `renderMedEntries` marks `index>0` as "⚠️ STACKED" (114) → today's real entry falsely flagged stacked.
- Self-heals on the **next** launch (new-day-clear + `cleanupOldMedications` before any render). Misleading, not data loss. Fix direction: date-filter the render/stacking to today+yesterday, or re-run `cleanupOldMedications()` after `mergeRemoteState`.

### [INFO] `loadState()` new-day clear is correct but overridden by merge
- loadState clears meds/caffeine/modifiers/workout/nicotine when `lastDate !== today`; the async Firebase merge then restores same-or-newer cloud values. For a normal daily open this is the intended behavior; only the long-idle case produces the phantom rows above.

---

## D. CRUD & COLLECTIONS

### [GOOD] Object-keyed collections, getValues everywhere
- `medications`/`caffeine`/`history` are objects with `generateId` keys; `migrateArrayToObject` guards legacy arrays (med-caffeine.js:32-34, mergeRemoteState 144-146). Iteration uses `getValues()` throughout (calculateAmpLoad 402, renderMedEntries 93, updateStackingWarning 141). No `Object.values()` on Firebase collections observed.
- CRUD is localStorage-first via `saveState()` (which `safeLocalStorageSet`s before debounced Firebase). All mutators call `saveState()` after mutation (removeMedEntry 61, updateMedEntry 84, addCaffeine/etc.).

### [LOW] XSS-adjacent: caffeine name not escaped
- `renderCaffeineEntries()` (med-caffeine.js:261) interpolates `${caff.name}` into `innerHTML` (246) without `escapeHtml`. Currently only preset names, so not currently exploitable; becomes an injection vector the moment a custom/free-text name is allowed. `renderMedEntries` has no free-text field (dose/time/date only), so it is safe today.

### [LOW] Render helpers assume their container exists
- `renderMedEntries` (89) and `renderCaffeineEntries` (~245) do `document.getElementById(...).innerHTML = ...` with **no null-check**. If the node is absent in a given DOM state, this throws and aborts the rest of `loadFromFirebase`'s render block (which runs before flags like nothing critical, but still interrupts UI restore). Add a guard.

---

## E. UI-SECTIONS LOGIC

### [GOOD] What-if & forecast reuse the engine — no math drift
- `updateScenarios()` (ui-sections.js:1152) and the simulate* helpers temp-mutate state → call `calculateSleepTime()` → restore. `generateForecastLogic()` (1487) / `updateForecastLogic()` (1959) use the same engine functions. No duplicated pharmacokinetic math to drift out of sync.

### [INFO] clearToday vs resetDay field coverage
- `clearToday()` (1370) does **not** clear `nicotine` or `allNighterMode`; `resetDay()` (1417) archives (saveDay + daily log) then clears meds/caffeine/modifiers/workoutPlan/**nicotine/allNighterMode** and calls `saveStateImmediate`. Intentional divergence (clearToday is a lighter reset). No double-archive observed — only resetDay archives. Worth a one-line confirmation from the owner that leaving nicotine/all-nighter untouched in clearToday is desired.

### [GOOD] renderGhostLoad DOM ids match
- `renderGhostLoad()` (552) targets `ghostLoadSection`/`ghostMedEntries`/`ghostLoadTotal`, consistent with the all-nighter markup. `toggleAllNighterMode` (517) sets `state._dataLoaded=true` before saving.

---

## F. JS TRAPS

- **[INFO] `||` on numerics in mergeRemoteState:** `hoursSleptLastNight` and `allNighterMode` correctly use `!== undefined` ternaries (141-142), avoiding the `0`/`false` falsy trap. `medications/caffeine/history` use `remote.X || state.X` where empty object is falsy-safe enough (empty `{}` is truthy, so a real-but-empty remote collection still wins — acceptable). No numeric field silently coerced.
- **[GOOD] onclick string IDs quoted:** `updateMedEntry('${med.id}', ...)`, `removeMedEntry('${med.id}')` (med-caffeine.js:105-115) — quoted correctly.
- **[GOOD] No undefined reaching `.set()`:** save payload is `{ state, lastUpdated }` (378-380); state fields are all defaulted. No undefined-crashes-all-saves pattern found.
- **[INFO] `showSyncConflictModal` `doses` field:** the modal reads `localData.doses`/`.lastSaved` (174-175); its only caller `forceCloudSync` passes exactly `{ doses, lastSaved }` (591-592). Consistent — not a bug (earlier suspicion cleared).

---

## Prioritized fix list
1. **[HIGH]** `loadFromFirebase()` — compare local `lastSaved`/`lastUpdated` vs remote `data.lastUpdated` before `mergeRemoteState`; if local is newer, skip the merge (mirror the d3-roadmap fix). Also make `beforeunload` push to Firebase (or at least flush the debounce) so sub-2s-close edits aren't cloud-orphaned.
2. **[MEDIUM]** Add `pinValidated` + `state._dataLoaded` guards to `saveToFirebase()` (or route all saves exclusively through the 5-guarded entry points).
3. **[MEDIUM]** Stale-dose UI: re-run `cleanupOldMedications()` after `mergeRemoteState`, and/or date-filter `renderMedEntries`/`updateStackingWarning` to today+yesterday, so the first post-idle launch doesn't show phantom rows / false STACKED.
4. **[MEDIUM]** `forceCloudSync` — seed `lastSyncTimestamp` in `loadFromFirebase` so the first manual sync of a session honors conflict detection.
5. **[MEDIUM]** Realtime listener — skip re-rendering an input the user is actively focused on (guard on `document.activeElement`).
6. **[LOW]** `escapeHtml(caff.name)` in `renderCaffeineEntries`; null-check containers in both render helpers.

## Verified sound (no action)
Identical 5-guard save pair; safe defaults (`_version:0`/`_dataLoaded:false`); `skipPin` all-flags; engine daysDiff-filtering protecting predictions; object-keyed collections + `getValues`; realtime echo suppression; what-if/forecast engine reuse; quoted onclick IDs; no undefined in save payload.
