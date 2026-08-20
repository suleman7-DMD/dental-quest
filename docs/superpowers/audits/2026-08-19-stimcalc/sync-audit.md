# Stim Calc Cross-Device Sync Audit — Task 16

Date: 2026-08-19 · Branch: `stimcalc-revival` · Files audited in full: `js/stimcalc/firebase-sync.js` (1552 lines), `js/stimcalc/state.js` (577 lines); CRUD sites mapped across `med-caffeine.js`, `history-calendar.js`, `calibration.js`, `ui-sections.js`, `init.js`.

Reference implementations: body-comp `1fad187`, graduation-roadmap `d3f98fb`, index.html `6d6f76f`, CLAUDE.md "Sync & Merge Rules".

## Verdict

**All 8 root causes of the stale-tab data-loss bug class are PRESENT in stim calc.** It is the last of the 4 apps unfixed. Line references below are pre-fix (commit `49b05b7`).

## Root cause → finding map

### RC1: Whole-snapshot last-write-wins merge, no per-record stamps — PRESENT
- `mergeRemoteState()` firebase-sync.js:134-167 — remote-wins wholesale: `medications: migrateArrayToObject(remote.medications || state.medications, 'med')` (whole-collection replace; same for `caffeine`, `history`). `sleepHistory`/`sleepDailyLogs`/`modifiers`/`settings`/`workoutPlan`/`nicotine` use shallow spreads `{...state.X, ...(remote.X||{})}` — remote wins every key conflict regardless of which side is fresher.
- `loadFromFirebase()` :421-429 — local-newer path (`localTime > remoteTime`) **skips merging cloud entirely** and pushes local at +500ms → clobbers any cloud-only records (the exact "if local newer, merge — do NOT skip" bug from CLAUDE.md).
- Only recency signal is whole-state `_lastModified` — one side's work is discarded entirely on every conflict.
- Partial exception: `history` entries already carry a per-record `lastUpdated` ISO stamp (history-calendar.js:51/:82, `buildHistoryEntry`) but **no merge site reads it**.

### RC2: Unconditional tab-hide full-snapshot push — PRESENT (the killer)
- `visibilitychange 'hidden'` firebase-sync.js:1244-1256 — localStorage flush is guarded, but the Firebase `.set()` of the full snapshot is **unconditional**. A stale tab re-uploads its old snapshot on hide, clobbering every newer save from other devices. This is the primary stale-tab data-loss pathway.

### RC3: Dirty-flag discipline missing — PRESENT
- `localChangesSinceLastSync` exists (:25) and is set by `markLocalChange()` (:122) from both save paths, but:
  - **Never cleared on `saveToFirebase()` success** (:397-399 success handler only flips UI status) — flag is meaningless as a "pending push" signal.
  - The 'hidden' handler push (:1249) does not check it (RC2).
- Cleared only in `loadFromFirebase` (:490) and `forceCloudSync`.

### RC4: Tab-visible handler dead-ends pending pushes — PRESENT
- `'visible'` handler :1257-1284 — merges only when `data.lastUpdated > lastKnownTimestamp`; when remote is not newer it does **nothing**. A stuck pending local change (debounced save killed by tab freeze) is never retried → local-only edits strand until the next unrelated save.

### RC5: Realtime listener deaf window — PRESENT
- `setupRealtimeSync()` :570-573 — "local newer → skip" returns without merging and schedules **no re-fetch** (grad-roadmap uses `scheduleRealtimeRecheck()` 12s one-shot). A remote save arriving while local `_lastModified` is ahead is permanently dropped.
- Echo suppression via `lastKnownTimestamp` (:562) and empty-cloud skip (:556) are sound and stay.

### RC6: No tombstones → delete resurrection — PRESENT
- Zero tombstone maps anywhere in the app. User-intent deletes that resurrect via merge:
  - `removeMedEntry()` med-caffeine.js:~56 (delete `state.medications[id]`)
  - `removeCaffeine()` med-caffeine.js:~233
  - `clearSleepEntry()` history-calendar.js:552-553 (deletes `sleepHistory[date]` + `sleepDailyLogs[date]`)
- Mechanical deletes that do NOT need tombstones (idempotent, re-derivable post-merge): `cleanupOldMedications()` med-caffeine.js:~47 (date-based), history dedup history-calendar.js:334-340, retention prunes (below), sleepDailyLogs V2 migration/phantom cleanup (history-calendar.js:661/:756/:825/:902 — flag-gated or content-derived).

### RC7: No scalar-object stamping — PRESENT
- No group stamps for `settings`, `calibration`, `modifiers`, `workoutPlan`, `nicotine`, or the day-scalars (`wakeTime`, `hoursSleptLastNight`, `allNighterMode`). Merge takes remote wholesale (`remote.x !== undefined ? remote.x : local`) — a config edit on device A is silently reverted by any stale snapshot from device B arriving through RC1/RC2.
- Write sites (for stamping): settings init.js:53-59; calibration calibration.js:147-178+; modifiers ui-sections.js:16-33, init.js:71-73; day-scalars calibration.js:212-213, history-calendar.js:561/:607-608, init.js:30/38/42, ui-sections.js:199/:557.

### RC8: Prune-then-push data loss — PRESENT (mitigated differently than grad-roadmap)
- `loadState()` firebase-sync.js:1513-1521 (sleepHistory >365d) and :1524-1533 (sleepDailyLogs >180d, comment claims "full history in Firebase" — currently false) mutate state at boot; history-calendar.js:343-355 prunes `history` >180d. Under RC1's local-newer keep-and-push path, a pruned local snapshot wipes the cloud's older entries.
- Guard B (`hasLoadedFromCloud`) already blocks any push *before* cloud load, so the pre-load window is safe. The loss path is exclusively via RC1's skip-merge push.
- **Resolution chosen:** these are treated as *intentional retention caps*, enforced consistently post-merge inside the new merge engine (both sides pruned to the same cutoffs), so no resurrection ping-pong and no silent loss beyond the documented caps (history/dailyLogs 180d, sleepHistory 365d). No `historyFullyLoaded` gate is needed once merges are union — the gate exists in grad-roadmap because its prune was *not* a deliberate cap.

## Additional findings (fixed in Task 17 alongside)

- `forceCloudSync()` :622-678 — conflict modal path uses crude `deepMerge(remoteState, state)`; rewired to the merge engine. `showSyncConflictModal()` (:173-211) and `applyRemoteState()` (:1184-1237) become dead → deleted.
- Dead calls: `scInvLoadFromFirebase`/`scWeekGlanceLoadFromFirebase` (:499/:501/:1172/:1173 — modules deleted in P3); `restoreWorkoutPlanUI` is an empty stub (ui-sections.js:341) called 4× (:460/:601/:1165/:1228) → calls + stub removed.
- `updateSyncStatus()` targets `syncIcon`/`syncText` which no longer exist in the HTML (only `scSidebarSync*`/`scTopBarSync*` do) — null-guarded, lookups trimmed.
- `_version` inflation in mergeRemoteState (`remote._version+1` per merge) — cosmetic only (versions are display/checkpoint metadata post Bug-23 fix); normalized to `max(local, remote)+1`.

## Fix architecture (Task 17)

Per-record `updatedAt` stamps at every CRUD site (history reuses existing `lastUpdated`); a pure shared merge engine (`mergeCollection` strict-`>` newer-wins union + tombstone purge; group-stamp newer-wins for scalar objects via persisted signature stamping in the save path); tombstone maps `state.tombstones.{meds,caffeine,sleepDays}` written before persist, unioned max-per-key, purge only when tombstone strictly newer than record stamp (re-add survives), pruned >60d; `mergeNeedsPush` → deferred guarded push-back; save-success clears the dirty flag (restore-on-failure); 'hidden' push gated on the dirty flag and routed through `saveToFirebase()` (keeps all 5 guards); 'visible' merges-then-pushes and retries stuck pending pushes; realtime local-newer skip deleted (merge is always safe now). The 5 save guards, PIN auth, Firebase path, and config are untouched. Verified by `scripts/stimcalc-sync-replay.mjs` (Task 18) running the REAL merge functions through 8 scenarios.
