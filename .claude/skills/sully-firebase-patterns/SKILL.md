---
name: sully-firebase-patterns
description: |
  Firebase sync, save/load guards, checkpoint system, and cross-app data persistence for all 4 Dental Quest HTML apps.
  Use this skill when the user works on save functions, sync logic, realtime listeners, checkpoint code, force upload/pull, adding new data fields, fixing data wipe or persistence bugs, debugging blocked saves, cross-device sync, or PIN authentication. Trigger phrases: "firebase", "sync", "save", "load", "cloud", "realtime", "PIN", "auth", "checkpoint", "backup", "restore", "force upload", "force pull", "data wipe", "guards", "persistence", "cross-device", "offline", "saveData", "saveState", "loadFromFirebase", "isEmptyState", "sync flags", "debounce", "blocked save", "data loss", "cross-app", "ecosystem".
globs:
  - "index.html"
  - "d3-roadmap.html"
  - "stimulant-elimination-calculator.html"
  - "body-comp-tracker.html"
---

# Firebase Data Persistence Architecture

All 4 apps are single-file HTML apps sharing one Firebase Realtime Database. They use PIN-based auth, object-keyed storage (never arrays), debounced saves with 4-5 guards, and a checkpoint/force-sync backup system.

# Instructions

### Step 1: Before editing any save function

Check the guard system. Every save function has 4-5 guards that prevent the data-wipe-on-fresh-device bug. Never remove or weaken any guard.

Consult `references/guard-system.md` for:
- Exact guard code per app
- Debounce timings
- Save payloads
- isEmptyState() logic

**Save Function Quick Reference:**

| App | Function | Line | Debounce | Guards |
|-----|----------|------|----------|--------|
| index.html | `saveData()` | firebase-sync.js:218 | 200ms | 5 |
| index.html | `saveDataImmediate()` | firebase-sync.js:376 | 0ms | 5 |
| d3-roadmap | `saveData()` | 10992 | 0-300ms smart | 5 |
| stim-calc | `saveState()` | 10322 | 2000ms | 5 |
| stim-calc | `saveStateImmediate()` | 10381 | 0ms | 5 |
| body-comp | `saveState()` | 14942 | 2000ms | 5 |
| body-comp | `saveStateImmediate()` | 14996 | 0ms | 4 (missing PIN guard — known bug) |
| body-comp | `saveDayLog()` | 12228 | N/A (calls saveState) | via saveState |

### Step 2: Before adding new data fields to any app

Use object-based storage with `generateId()` keys — never arrays. Add the field to the save payload, the realtime merge, and the default state. After any realtime merge, preserve `state._dataLoaded = true`.

**CRITICAL: Firebase rejects `undefined` values.** Every field in a save payload must use `?? null` (for nullable values) or `?? false` / `?? 0` (for typed values). If ANY field is `undefined`, the entire `.set()` call fails silently — no data saves at all. For index.html, all fields go through `buildSaveData()` in firebase-sync.js — always null-coalesce there.

Consult `references/auth-and-data-patterns.md` for:
- Complete Firebase data structure tree
- generateId(), getValues(), getCount(), ensureArray() helpers
- Cross-app data reads (body-comp reads from 3 other apps)
- ecosystemContext structure

### Step 3: Before touching realtime sync or visibility handlers

Each app handles conflict resolution differently. Check the correct strategy before modifying.

Consult `references/sync-and-realtime.md` for:
- Realtime listener code per app (with line numbers)
- Conflict resolution strategies (dialog / grace period / timestamp / version)
- Visibility change handlers (save-on-hide, refresh-on-visible)
- Echo prevention patterns

**Conflict Resolution Per App:**

| App | Strategy |
|-----|----------|
| index.html | Manual 3-option dialog (Keep Local / Keep Remote / Merge) |
| d3-roadmap | Grace period (`KEEP_LOCAL_GRACE_MS=5000`) + echo prevention (`setLocalUpdateFlag()`) |
| stim-calc | `lastUpdated` timestamp comparison |
| body-comp | `_version` number comparison (higher wins) |

### Step 3.5: localStorage writes MUST use safeLocalStorageSet()

All 4 apps now have a `safeLocalStorageSet(key, value)` wrapper (added Feb 2026). **NEVER use raw `localStorage.setItem()`** — it will throw `QuotaExceededError` when storage is full, crashing the UI.

The wrapper: tries write → on quota error, clears backups and retries → clears checkpoints and retries → shows toast warning → returns false. Firebase saves are unaffected.

Current limits: **5 checkpoints, 3 backups** per app. Body-comp prunes dailyLogs to 90 days in localStorage. Stim-calc prunes history to 180 days.

### Step 4: Before modifying checkpoint or force-sync code

Checkpoints are localStorage-only (not Firebase). Each app has a limit of **5 checkpoints** and **3 backups**.

Consult `references/checkpoint-system.md` for:
- All checkpoint functions per app
- Export/import formats (d3-roadmap accepts 7 formats)
- Force upload/pull confirmation methods
- Firebase key sanitization (d3-roadmap only)

### Step 5: When debugging sync issues

Follow the 7-step debugging workflow. Check guards first — blocked saves are the most common issue.

Consult `references/bugs-and-debugging.md` for:
- 4 known unpatched bugs with exact fix code
- 10 red flag patterns for code review
- 7-step console debugging checklist
- Data integrity functions (body-comp only)

## Critical Rules

1. **Never remove or weaken save guards** — prevents data-wipe-on-fresh-device bug
2. **Default `_version` MUST be `0`** (never `Date.now()`) — fresh device must lose to cloud
3. **Default `_dataLoaded` MUST be `false`** — prevents saves before data confirmed
4. **Never use arrays for Firebase collections** — Firebase corrupts arrays; use `generateId()` keys
5. **Never parse dates with `new Date('YYYY-MM-DD')`** — UTC causes off-by-one in EST; use `split('-').map(Number)`
6. **Empty arrays are truthy** — check `.length > 0`, never `|| defaults`
7. **Always call `saveDayLog()` after meal/workout changes** in body-comp
8. **Strip `ecosystemContext` before Firebase save** in body-comp
9. **Preserve `_dataLoaded = true` after realtime merges** — cloud data may not include the flag
10. **Never use raw `localStorage.setItem()`** — always use `safeLocalStorageSet()` to prevent QuotaExceededError UI freeze
11. **Checkpoint limit is 5, backup limit is 3** — do not increase these (localStorage is ~5MB shared across all 4 apps)
12. **Firebase `.set()` rejects `undefined`** — every field in save payloads must use `?? null` or `?? false`. One undefined field crashes ALL saves silently. For index.html, audit `buildSaveData()` in firebase-sync.js after adding any field.

## Guard System Overview

| Guard | index.html | d3-roadmap | stim-calc | body-comp |
|-------|-----------|-----------|-----------|-----------|
| PIN validated | `pinValidated` | `pinValidated` | `pinValidated` | `pinValidated` |
| Initial load done | `initialLoadComplete` | `!isInitialLoad` | `!isInitialLoad` | `!isInitialLoad` |
| Cloud loaded | `hasLoadedFromCloud` | `hasLoadedFromCloud` | `hasLoadedFromCloud` | `hasLoadedFromCloud` |
| Not empty | `isEmptyState()` | `isEmptyState()` | `isEmptyState()` | `isEmptyState()` |
| Data loaded | `_dataLoaded` | `roadmapData._dataLoaded` | `state._dataLoaded` | `state._dataLoaded` |

Note: index.html uses inverted naming (`initialLoadComplete=true` means done) vs others (`isInitialLoad=false` means done).

**CRITICAL PATTERN: Flags Before Rendering**
In `loadDataFromFirebase()`, sync flags (`hasLoadedFromCloud`, `_dataLoaded`, `markInitialLoadComplete()`) MUST be set BEFORE rendering calls (`updateStats`, `renderTasks`, `initFocusMode`, etc.). Post-load rendering MUST be wrapped in try/catch. If a rendering error occurs before flags are set, ALL saves are permanently blocked. This was a critical post-split bug in index.html (fixed Feb 2026, commit `29ba742`).

## Known Bugs (Unpatched)

1. **body-comp `skipPin()` missing guard flags** (line 16624) — does NOT set `pinValidated`, `hasLoadedFromCloud`, `isInitialLoad`, `state._dataLoaded`. Breaks offline mode.
2. **body-comp `saveStateImmediate()` missing PIN guard** (line 14996) — has 4 guards but missing `!pinValidated`.
3. **body-comp realtime merge missing `_dataLoaded`** (line ~15441) — after merge, `state._dataLoaded` may be unset.
4. **d3-roadmap offline path implicit flags** (line 9504) — doesn't explicitly set guard flags when user cancels PIN.

# Examples

**Example 1: Adding a new data collection to body-comp**

User says: "Add supplement tracking to body-comp"

Actions:
1. Add `supplements: {}` to `getDefaultState()` (line 7317) — empty object, not array
2. Use `generateId('supp')` when creating entries
3. Add to `saveToFirebase()` payload (line 15163) — ensure ecosystemContext is still stripped
4. Add to realtime merge in `setupRealtimeSync()` (line 15372) with `migrateArrayToObject()`
5. Add `state._dataLoaded = true` after merge
6. If primary data, add to `isEmptyState()` check (line 7637)
7. Call `saveState()` after any supplement changes

Result: Collection persists across sessions and devices, survives fresh-device loads.

**Example 2: Debugging blocked saves**

User says: "Data isn't saving in d3-roadmap"

Actions:
1. Open browser console, look for `⚠️ BLOCKED:` messages
2. Run guard status check from `references/bugs-and-debugging.md` Step 1
3. Identify which guard is failing (most common: `hasLoadedFromCloud` still false)
4. Trace back to where that flag should be set — `loadFromFirebase()` at line 9817
5. Check if `loadFromFirebase()` completed or failed silently
6. If Firebase unreachable, verify PIN was entered and `firebaseSyncEnabled=true`

Result: Blocked guard identified, root cause found, save path restored.

**Example 3: Fixing data wipe on fresh device**

User says: "Opened app on phone and all data disappeared"

Actions:
1. Check `getDefaultState()` — verify `_version: 0` (NOT `Date.now()`)
2. Check `isEmptyState()` — verify it correctly identifies empty default state
3. Check all 5 save guards are present and not weakened
4. Use `forcePullFromCloud()` to recover data from Firebase
5. If cloud is also wiped, restore from checkpoint via `showCheckpointManager()`

Result: Data recovered, root cause prevented from recurring.

# Troubleshooting

### Error: "BLOCKED: Save attempted during initial load"
**Cause:** `isInitialLoad` still true (or `initialLoadComplete` still false in index.html). `loadFromFirebase()` hasn't completed or failed silently.
**Solution:** Verify `loadFromFirebase()` sets `isInitialLoad=false` after merge. Check for race conditions with double load calls. See `references/bugs-and-debugging.md` red flag #7.

### Error: "BLOCKED: Cloud load incomplete"
**Cause:** `hasLoadedFromCloud` never set to true. Firebase load failed or `skipPin()` didn't set flags.
**Solution:** Check if Firebase is reachable. If offline mode, verify `skipPin()` sets all 4 guard flags (known bug in body-comp — see bug #1).

### Error: Data wiped after opening on new device
**Cause:** `_version` in default state set to `Date.now()` instead of `0`. Fresh browser has NEWER version than cloud, overwrites cloud with empty defaults.
**Solution:** Verify `getDefaultState()` has `_version: 0` and `_dataLoaded: false`. Force pull from cloud to recover. See `references/bugs-and-debugging.md` red flag #1.

### Error: Offline mode can't save (body-comp)
**Cause:** `skipPin()` at line 16624 doesn't set guard flags. All saves blocked by guards.
**Solution:** Add `pinValidated=true`, `hasLoadedFromCloud=true`, `isInitialLoad=false`, `state._dataLoaded=true` to `skipPin()`. Reference: stim-calc's correct implementation at line 9350.

### Error: "set failed: value argument contains undefined in property"
**Cause:** A field in the save payload is `undefined`. Firebase Realtime Database rejects undefined values in `.set()` calls. The ENTIRE save fails — no partial write.
**Solution:** Find which field is undefined (error message includes the property path). Add `?? null` or `?? false` to that field in the save payload builder. For index.html, fix in `buildSaveData()` (firebase-sync.js). Also add the field with a default value to: (1) state defaults, (2) `loadData()`, (3) `loadDataFromFirebase()`, (4) `applyRemoteData()`. This was a critical post-split bug in index.html — `confirmedStarted` and `startedAt` fields in `commandCenterData.currentSession` were undefined after page load (fixed Feb 2026, commit `280b3f6`).

### Error: Realtime listener overwrites local changes
**Cause:** Missing echo prevention or conflict resolution. Own Firebase write bounces back via realtime listener.
**Solution:** Check app's conflict resolution strategy (see Step 3 table). d3-roadmap uses `setLocalUpdateFlag()` 2s timer; body-comp uses version comparison. See `references/sync-and-realtime.md`.
