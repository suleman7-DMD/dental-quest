# D3 Roadmap Data Persistence Failure — Root Cause Analysis

## Executive Summary
- **Symptom**: All changes lost on sync, checkpoints don't restore effectively, "stuck on syncing" status
- **Root Cause**: `forceCloudSync()` (the Sync button AND auto-reconnect) defaults to **pulling from cloud and overwriting local data** when conflict detection fails — which is MOST of the time due to `lastSyncTimestamp` being `null`
- **Severity**: CRITICAL — every user-initiated sync and every auto-reconnect can silently destroy local changes
- **Affected**: ALL tabs (Deadlines, Monthly, Clinical, Daily Planner, Exams)

---

## Firebase Setup Analysis

### Authentication Status
**WORKING** — PIN-based, no Firebase Auth. Config matches CLAUDE.md exactly.
- PIN stored in `localStorage('dentalQuestPin')` (line 9462)
- Path: `users/user_<base64hash>/d3Roadmap/` (line 9483)
- `pinValidated` set to `true` before any Firebase ops (line 9487)
- All Firebase operations have error handlers. No silent failures detected.

### Write Operations (7 total)
All use `.set()` (full overwrite). No `.update()`. Located at lines: 10081, 10265, 10443, 10791, 10958, 10973, 15610.

### Read Operations (8 total)
Mix of `.once('value')` and `.on('value')`. Located at lines: 9170, 9748, 9836, 9964, 10122, 10287, 10845, 15618.

---

## ROOT CAUSE #1: `forceCloudSync()` Overwrites Local Data (THE SMOKING GUN)

### The Bug (lines 10102-10164)

`forceCloudSync()` is supposed to sync data, but it **defaults to a CLOUD PULL that overwrites local data**. The conflict modal that should protect local data almost never appears.

**Conflict detection at line 10132:**
```javascript
if (localChangesSinceLastSync && lastSyncTimestamp && remoteData.lastSaved > lastSyncTimestamp) {
    // Show conflict modal — user can choose "Keep This Device"
} else {
    // DEFAULT: Cloud overwrites local — applyRemoteData(remoteData)
}
```

**Why the conflict modal almost NEVER appears:**

| Condition | Problem |
|-----------|---------|
| `lastSyncTimestamp` | Starts as `null` (line 9375). Only set at lines 10148/10155 AFTER `forceCloudSync()` completes successfully. On first sync click, it's ALWAYS null → condition fails → cloud overwrites |
| `localChangesSinceLastSync` | Resets to `false` after every sync (lines 10147/10154). If user makes changes, refreshes page, then syncs — flag is `false` → cloud overwrites |
| `remoteData.lastSaved > lastSyncTimestamp` | If local save hasn't reached Firebase yet (debounce window, slow network), remote appears OLDER → condition fails → cloud overwrites |

**All three conditions must be true simultaneously for the conflict modal to appear. In practice, this almost never happens.**

### How This Causes Data Loss

```
User flow:
1. User opens app → data loads from Firebase ✅
2. User checks deadline → saveData() called → writes to localStorage ✅
3. saveData() debounces Firebase write (0-300ms delay)
4. User clicks "🔄 Sync" button
5. forceCloudSync() → reads from cloud
6. Conflict check: lastSyncTimestamp is null → FAILS
7. applyRemoteData(cloudData) called
8. If Firebase write from step 3 completed: cloud has changes → no visible loss
9. If Firebase write still pending/failed: cloud has STALE data → LOCAL CHANGES LOST
```

### Where `forceCloudSync()` Is Called
| Trigger | Line | Guard? |
|---------|------|--------|
| "🔄 Sync" button click | 5538 → 10102 | 2-second debounce only |
| **Auto-reconnection** | 9181 | `!wasConnected && firebaseSyncEnabled && userPath` |

**CRITICAL**: The connection monitor (line 9166-9188) calls `forceCloudSync()` on **EVERY page load**, because `wasConnected` starts as `false` and the first connection event sets it to `true`:
```javascript
if (!wasConnected && firebaseSyncEnabled && userPath) {
    forceCloudSync();  // Auto-cloud-pull on every page load!
}
```

This means every page load triggers an automatic cloud pull that can overwrite any local-only changes.

---

## ROOT CAUSE #2: Visibility Handler Overwrites Local Data

### The Bug (lines 15600-15669)

When the user switches away from the tab and comes back:

**On hidden (line 15601-15613):**
- Saves to localStorage + Firebase directly
- Does NOT call `setLocalUpdateFlag()` → realtime listener may re-process the write
- Does NOT increment `_version` or update `lastSaveTime`

**On visible (line 15614-15669):**
- Pulls from Firebase, does full merge where **cloud wins on key conflicts**
- Does NOT check `isLocalUpdate` flag
- Does NOT check `localChangesSinceLastSync`
- Calls `initUI()` which re-renders everything
- Can overwrite in-progress form edits

### Impact
Every time the user switches tabs/apps and returns, cloud data is merged in with cloud winning. If any local changes haven't been written to Firebase yet, they're lost.

---

## ROOT CAUSE #3: `lastSyncTimestamp` Never Initialized

### The Bug (line 9375)

```javascript
let lastSyncTimestamp = null;  // Never set until AFTER first forceCloudSync() completes
```

`lastSyncTimestamp` is only set at two places (lines 10148, 10155), both inside `forceCloudSync()` AFTER sync resolves. There's no initialization from `loadFromFirebase()` or any other load path.

### Impact
On the first user-initiated sync click, `lastSyncTimestamp` is always `null` → conflict check fails → cloud overwrites local without warning.

**Note:** The auto-reconnect `forceCloudSync()` from the connection monitor DOES set `lastSyncTimestamp` on completion. So if that auto-sync completes before the user's first manual sync, `lastSyncTimestamp` would be set. However, this is a race condition — timing is not guaranteed.

---

## Save Flow Analysis (What DOES Work)

### saveData() — Lines 10872-10985
The save function itself is **correctly implemented**:

1. **5 guards** — all properly protect against data wipe:
   - GUARD A (10888): `isInitialLoad` — blocks during initial load
   - GUARD B (10894): `!hasLoadedFromCloud` — blocks before cloud data loaded
   - GUARD C (10900): `isEmptyState(roadmapData)` — blocks empty state saves
   - GUARD D (10906): `!roadmapData._dataLoaded` — blocks before data confirmed
   - GUARD E (10912): `firebaseSyncEnabled && !pinValidated` — blocks before PIN

2. **localStorage write is IMMEDIATE** (line 10930) — never lost
3. **Firebase write is debounced** (0-300ms) with error handling and retry
4. **Diagnostic logging** at line 10878 logs all guard states

### Guard State Transitions — ALL CORRECT
| Flag | Init | Set True | Set False | Stuck? |
|------|------|----------|-----------|--------|
| `isInitialLoad` | `true` | (starts true) | 9735, 9811 | NO |
| `hasLoadedFromCloud` | `false` | 9734, 9800 | (never reset) | NO |
| `pinValidated` | `false` | 9487 | (never reset) | NO |
| `_dataLoaded` | `false` | 9729, 9784, 9900+ | (only in defaults) | NO |
| `firebaseSyncEnabled` | `false` | 9484 | 9446, 9474, 9503 | NO |
| `isLocalUpdate` | `false` | 9386 (2s auto-clear) | 9390 | NO |

**Verdict: No guards are stuck. The save function works correctly. The problem is downstream — data is saved, then OVERWRITTEN by sync operations.**

### `_version` Field — CORRECT
- Default: `0` (not `Date.now()`) — line 8458
- Incremented on save: line 10925
- Force upload uses `Date.now()`: line 10755
- Merges use `Math.max()`: correct

---

## Load Flow Analysis

### Load Triggers
| Trigger | Function | When |
|---------|----------|------|
| Page load | `loadFromFirebase()` | Once on init |
| Tab switch | (none) | Only re-renders, no data load |
| Sync button | `forceCloudSync()` → `applyRemoteData()` | User click |
| Reconnection | `forceCloudSync()` → `applyRemoteData()` | Auto |
| Visibility visible | Direct merge + `initUI()` | Tab focus |
| Realtime listener | Direct merge + re-render active tab | On remote change |

### Merge Strategy — Cloud Wins on Key Conflicts
All merge operations use the pattern:
```javascript
{ ...roadmapData.field, ...data.field }
```
Cloud data spreads SECOND, overwriting any matching local keys.

**Notable:**
- `dailyPlanner`: `data.dailyPlanner || roadmapData.dailyPlanner` — cloud REPLACES local entirely (no key merge)
- `competencies`: First non-null wins (cloud checked first)
- `_version`: `Math.max()` — highest wins

### initUI() Exam Sync Side Effect (line 15409)
```javascript
if (!roadmapData.exams || getCount(roadmapData.exams) === 0) {
    roadmapData.exams = { ... };
    setTimeout(() => saveData(), 100);
}
```
This calls `saveData()` during `initUI()`. If `isInitialLoad` is still `true` (which it is when called from `loadFromFirebase()`), the save is correctly blocked by GUARD A.

---

## Manual Sync Analysis

### "🔄 Sync" Button (line 5538 → `forceCloudSync()`)
- **User expectation**: "Push my local changes to the cloud"
- **Actual behavior**: "Pull from cloud and merge (cloud wins)" when no conflict detected
- **Problem**: "This Device" option only appears in the conflict modal, which rarely shows

### Conflict Modal Options (when it DOES show)
| Option | Action | Preserves Local? |
|--------|--------|-----------------|
| "Keep This Device" | `saveData()` — pushes local to cloud | YES |
| "Keep Cloud" | `applyRemoteData()` — cloud overwrites local | NO |
| "Try to Merge Both" | `deepMerge()` then save | PARTIAL |

### Force Upload (line 10722)
**WORKS CORRECTLY** — bypasses guards, writes directly to Firebase with double confirmation. This should reliably push local data to cloud. If the user's Force Upload "doesn't work," the issue may be that a subsequent auto-sync overwrites the uploaded data.

### Force Pull (line 10809)
Works correctly — pulls from cloud and overwrites local.

---

## Checkpoint System Analysis

### Two Separate Systems
| System | Storage Key | Functions | UI Button |
|--------|-------------|-----------|-----------|
| **Backups** | `d3RoadmapBackup` | `createBackup()`, `restoreBackup()` | Auto-created before sync operations |
| **Checkpoints** | `d3roadmap_checkpoints_<pin>` + Firebase | `createCheckpoint()`, `restoreCheckpoint()` | "💾 Checkpoint" / "📂 Restore" |

### Checkpoint Creation — WORKS
- `createCheckpoint()` (line 10226) captures full `roadmapData` via `JSON.parse(JSON.stringify())`
- Stores to localStorage AND Firebase (`userPath/checkpoints/<id>`)
- Guard: blocked if `isEmptyState(roadmapData)` returns true

### Checkpoint Restore — WORKS BUT VULNERABLE TO OVERWRITE
- `restoreCheckpoint()` (line 10363) does field-by-field merge with migration
- Saves to localStorage BEFORE `saveData()` (line 10421) — safe
- Calls `saveData()` to push to Firebase
- Calls `initUI()` to re-render
- **Vulnerability**: After restore, if `forceCloudSync()` fires (auto-reconnect or user click) and the save hasn't reached Firebase yet, cloud data overwrites the restore

### importAndRestoreDirectly() — BUG
- Does NOT save to localStorage before `saveData()` (unlike `restoreCheckpoint()`)
- If `saveData()` guards block, restored data exists only in memory
- **Fix needed**: Add `localStorage.setItem()` before `saveData()`

### Why "Nothing Happens" on Restore
Most likely: checkpoint restores correctly, but an auto-sync (connection monitor or visibility handler) immediately overwrites the restored data with stale cloud data before the user notices. The sequence:
1. Restore checkpoint → `roadmapData` updated in memory + localStorage
2. `saveData()` called → Firebase write debounced (0-300ms)
3. Realtime listener fires from the write → `isLocalUpdate` flag should skip it ✅
4. BUT: if connection monitor fires `forceCloudSync()` before Firebase write completes → cloud (stale) overwrites restored data

---

## isEmptyState() Analysis (line 8526)

### Checks (9 conditions — ALL must be false for "empty")
1. `customDeadlines` count > 0
2. `monthlyPlanner.customTasks` count > 0
3. `clinicalData.appointments` count > 0
4. `dailyPlanner.blocks` count > 0
5. `monthlyPlanner.notes` count > 0
6. `clinicalData.patients` count > 0
7. `completedDeadlines` count > 0
8. `examStudyProgress` count > 0
9. `grades` has at least one course with data

### Missing Checks
- `exams` — user with only exam data could trigger false empty
- `editedDeadlines` — edited deadline dates not counted
- `mandatoryItems` — checked mandatory items not counted
- `dailyPlanner.notes` / `dailyPlanner.focus` — only `blocks` checked

### Impact
Low risk for the save-failure bug (most users have at least one of the 9 checked items), but could theoretically block saves for users with minimal data.

---

## The Fix

### Fix 1: Make `forceCloudSync()` ALWAYS Show Conflict Modal When Local Changes Exist (CRITICAL)
- **File**: d3-roadmap.html
- **Line**: 10132
- **Change**: Remove `lastSyncTimestamp` requirement from conflict check
```javascript
// BEFORE (line 10132):
if (localChangesSinceLastSync && lastSyncTimestamp && remoteData.lastSaved > lastSyncTimestamp) {

// AFTER:
if (localChangesSinceLastSync) {
```
- **Why**: `lastSyncTimestamp` starts null and prevents conflict detection. When local changes exist, the user MUST be warned before cloud data overwrites.

### Fix 2: Initialize `lastSyncTimestamp` After Initial Load
- **File**: d3-roadmap.html
- **Line**: After 9811 (end of `loadFromFirebase()` success path)
- **Change**: Set `lastSyncTimestamp` when data is first loaded
```javascript
// After line 9811 (isInitialLoad = false):
lastSyncTimestamp = Date.now();
```
- **Also** add after line 9735 (in `loadFromLocalStorage(finalize=true)`):
```javascript
lastSyncTimestamp = Date.now();
```
- **Why**: Ensures `lastSyncTimestamp` is always initialized after data loads, so conflict detection works on the first Sync click.

### Fix 3: Guard Connection Monitor Auto-Sync Against Initial Load
- **File**: d3-roadmap.html
- **Line**: 9179
- **Change**: Add `isInitialLoad` guard
```javascript
// BEFORE (line 9179):
if (!wasConnected && firebaseSyncEnabled && userPath) {

// AFTER:
if (!wasConnected && firebaseSyncEnabled && userPath && !isInitialLoad) {
```
- **Why**: Prevents `forceCloudSync()` from firing during initial load, which would race with `loadFromFirebase()`. The initial load handles data loading; auto-sync should only fire on genuine reconnections AFTER the app is fully loaded.

### Fix 4: Fix Visibility Handler to Protect Local Changes
- **File**: d3-roadmap.html
- **Line**: 15606-15612 (hidden handler)
- **Change**: Add `setLocalUpdateFlag()` before Firebase write
```javascript
// BEFORE line 15607:
if (firebaseSyncEnabled && database && userPath) {

// AFTER:
if (firebaseSyncEnabled && database && userPath) {
    setLocalUpdateFlag();  // Prevent realtime listener from re-processing
```

- **Line**: 15617-15665 (visible handler)
- **Change**: Add local changes check before cloud merge
```javascript
// BEFORE line 15618:
database.ref(userPath).once('value')

// AFTER - skip refresh if we have pending local changes:
if (localChangesSinceLastSync) {
    console.log('⏭️ Visibility refresh skipped: local changes pending');
    return;
}
database.ref(userPath).once('value')
```
- **Why**: Prevents visibility handler from overwriting unsaved local changes.

### Fix 5: Fix `importAndRestoreDirectly()` Missing localStorage Save
- **File**: d3-roadmap.html
- **Line**: Before `saveData()` call in `importAndRestoreDirectly()` (~line 10700)
- **Change**: Add localStorage save before `saveData()`
```javascript
// ADD before saveData() call:
localStorage.setItem('d3RoadmapData', JSON.stringify(roadmapData));
```
- **Why**: Matches `restoreCheckpoint()` pattern. Ensures restored data persists even if `saveData()` guards block.

### Fix 6: Add `exams` and `editedDeadlines` to `isEmptyState()` (MINOR)
- **File**: d3-roadmap.html
- **Line**: 8526-8546
- **Change**: Add two more checks
```javascript
const hasExams = getCount(data.exams) > 0;
const hasEditedDeadlines = getCount(data.editedDeadlines) > 0;
// Add to the return condition
```
- **Why**: Prevents edge case where users with only exam/deadline data have saves blocked.

---

## Implementation Order

1. **Fix 1** — `forceCloudSync()` conflict detection (HIGHEST PRIORITY — stops active data loss)
2. **Fix 3** — Connection monitor guard (stops auto-sync data loss on page load)
3. **Fix 2** — Initialize `lastSyncTimestamp` (belt-and-suspenders for Fix 1)
4. **Fix 4** — Visibility handler protection (stops data loss on tab switch)
5. **Fix 5** — `importAndRestoreDirectly()` localStorage save (fixes checkpoint import)
6. **Fix 6** — `isEmptyState()` additions (minor edge case)

---

## Testing Protocol

### Test 1: Basic Deadline Save
1. Open app, wait for "Synced" status
2. Go to Deadlines tab
3. Check a deadline, enter a grade
4. Verify console shows `💾 saveData() called` with all guards passing
5. Verify sync status changes: "Saving..." → "Synced"
6. Hard refresh (Ctrl+Shift+R)
7. Verify deadline is still checked with grade

### Test 2: Sync Button Preserves Data
1. Check 3 deadlines
2. Click "🔄 Sync" button
3. **Expected**: Conflict modal appears (because local changes exist)
4. Select "Keep This Device"
5. Verify all 3 deadlines still checked
6. Verify sync status shows "Synced"

### Test 3: Page Refresh Preserves Data
1. Make changes across multiple tabs (deadlines, monthly, clinical)
2. Wait for "Synced" status
3. Refresh page
4. Verify ALL changes persist

### Test 4: Tab Switch Preserves Data
1. Make changes in Deadlines tab
2. Switch to another app/tab (trigger visibility change)
3. Switch back
4. Verify changes preserved

### Test 5: Checkpoint Create & Restore
1. Make multiple changes
2. Click "💾 Checkpoint" — verify success toast
3. Make MORE changes (or click Sync to overwrite)
4. Click "📂 Restore" — select checkpoint
5. Verify data reverts to checkpoint state
6. Refresh page — verify checkpoint data persists

### Test 6: Force Upload
1. Make changes
2. Click "☁️⬆️ Force Upload"
3. Confirm with "UPLOAD"
4. Verify success
5. Open in incognito/different device
6. Verify changes synced

### Test 7: Cross-Device Sync
1. Device A: Make changes, wait for "Synced"
2. Device B: Open app (or refresh)
3. Verify Device B sees Device A's changes
4. Device B: Make changes
5. Device A: Click Sync
6. Verify conflict modal appears
7. Select "Try to Merge Both"
8. Verify both devices' changes preserved

---

## Verification Checklist
- [ ] Deadline checkbox saves and persists across refresh
- [ ] Grade entry saves and persists
- [ ] Date changes save and persist
- [ ] Sync button shows conflict modal when local changes exist
- [ ] "Keep This Device" preserves local changes
- [ ] Checkpoint creation works
- [ ] Checkpoint restore works and persists
- [ ] Force upload actually uploads
- [ ] All tabs work (Deadlines, Monthly, Clinical, Daily, Exams)
- [ ] Cross-device sync works
- [ ] No console errors
- [ ] Auto-reconnect doesn't overwrite local changes
- [ ] Tab switching doesn't overwrite local changes
- [ ] importAndRestoreDirectly saves to localStorage
