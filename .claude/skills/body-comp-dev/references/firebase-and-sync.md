# Firebase & Sync System

## Table of Contents
- [Save Functions](#save-functions)
  - [`saveState()` -- Line 14942](#savestate--line-14942)
  - [`saveStateImmediate()` -- Line 14996](#savestateimmediate--line-14996)
  - [`saveToFirebase()` -- Line 15163](#savetofirebase--line-15163)
  - [`saveDayLog()` -- Line 12228](#savedaylog--line-12228)
- [Load Functions](#load-functions)
  - [`loadState()` -- Line 15040](#loadstate--line-15040)
  - [`loadFromFirebase()` -- Line 15217](#loadfromfirebase--line-15217)
  - [`setupRealtimeSync()` -- Line 15366](#setuprealtimesync--line-15366)
- [Guard Flags](#guard-flags)
- [Checkpoint System](#checkpoint-system)
  - [Storage](#storage)
  - [Functions](#functions)
  - [Export Format](#export-format)
- [Force Sync Functions](#force-sync-functions)
- [Firebase Init Sequence](#firebase-init-sequence)
  - [`initFirebase()` -- Line 16116](#initfirebase--line-16116)
  - [`setupUserAuth(pin)` -- Line 16175](#setupuserauthpin--line-16175)
- [Cross-App Ecosystem Reads](#cross-app-ecosystem-reads)
  - [`loadEcosystemData(hashedPin)` -- Line 16211](#loadecosystemdatahashedpin--line-16211)
  - [Refresh](#refresh)
- [Visibility Handlers](#visibility-handlers)
- [Conflict Resolution Strategy](#conflict-resolution-strategy)

## Save Functions

### `saveState()` — Line 14942

Primary save function. 5 guards + localStorage immediate + Firebase debounced (2 seconds).

```javascript
function saveState() {
    // Guard 0: !pinValidated → return false
    // Guard A: isInitialLoad → return false
    // Guard B: !hasLoadedFromCloud → return false
    // Guard C: isEmptyState(state) → return false
    // Guard D: !state._dataLoaded → return false

    state._version = Date.now();
    state._lastModified = new Date().toISOString();
    localStorage.setItem('bodyCompTrackerState', JSON.stringify(state));

    // Firebase debounced 2000ms
    clearTimeout(firebaseSaveTimeout);
    firebaseSaveTimeout = setTimeout(() => saveToFirebase(), 2000);
    return true;
}
```

### `saveStateImmediate()` — Line 14996

Immediate save (no debounce). **KNOWN BUG: Missing Guard 0 (`!pinValidated`).**

Has only 4 guards: A (isInitialLoad), B (!hasLoadedFromCloud), C (isEmptyState), D (!_dataLoaded).

Called by: `visibilitychange` handler (when tab goes hidden), `beforeunload` doesn't use this.

### `saveToFirebase()` — Line 15163

Actual Firebase write. Has its own 3 guards (isInitialLoad, !hasLoadedFromCloud, isEmptyState).

**Critical**: Strips `ecosystemContext` before saving:
```javascript
const stateToSave = {
    profile, today, frequentFoods, weighIns, bodyCompHistory,
    dailyLogs, refeedTracker, gamification, achievements,
    _version, _lastModified
    // ecosystemContext deliberately excluded
};
database.ref(userPath).set({ state: stateToSave, lastUpdated: saveTime });
```

### `saveDayLog()` — Line 12228

Snapshots `state.today` into `state.dailyLogs[date]` with calculated totals, deep-copied meals/workouts, ecosystem snapshot, and logic log. Called ~23 places throughout the app.

Does NOT check `setupComplete` — only skips if `!today.date`.

```javascript
// Key: Deep copy to prevent reference mutation
meals: today.meals ? JSON.parse(JSON.stringify(today.meals)) : {},
workouts: today.workouts ? JSON.parse(JSON.stringify(today.workouts)) : {},
```

Calls `saveState()` at the end.

## Load Functions

### `loadState()` — Line 15040

Loads from localStorage. Handles:
- Spread-merge with defaults (preserves new fields)
- frequentFoods: uses `migrateArrayToObject()`, repopulates defaults if empty
- weighIns/bodyCompHistory: `migrateArrayToObject()`
- New day detection: saves previous day to dailyLogs, resets today
- Migration: ensures today has alerts, weigh-ins have body comp fields
- Migration: `migrateOldDailyLogs()` (delayed 1s to not block render)

### `loadFromFirebase()` — Line 15217

Firebase load + merge. Sequence:
1. Preserve `ecosystemContext` (local-only)
2. Merge frequentFoods using `mergeFrequentFoods()`
3. Spread-merge all state sections
4. Migrate all arrays to objects (meals, workouts, weighIns, bodyCompHistory, badges, dailyLog meals/workouts)
5. Repopulate frequentFoods defaults if empty
6. Handle day rollover (same as loadState)
7. Set `state._dataLoaded = true`
8. Save to localStorage
9. Set `hasLoadedFromCloud = true`
10. Call `initializeUI()` + `setupRealtimeSync()`
11. Set `isInitialLoad = false`

On error: if local data exists, sets all flags to allow saves with local data.

### `setupRealtimeSync()` — Line 15366

Version-compared realtime listener. Skips:
- First load (already handled by loadFromFirebase)
- During initial load
- Empty cloud data
- Same timestamp as lastKnownTimestamp (echo prevention)
- Local version newer than cloud version

On valid update: merges state, migrates arrays, saves to localStorage, re-renders.

**KNOWN BUG**: Does NOT explicitly set `state._dataLoaded = true` after merge (line ~15441). If cloud data lacks this flag, subsequent saves may be blocked.

## Guard Flags

Declared at lines 7632-7634:
```javascript
let isInitialLoad = true;       // line 7632
let hasLoadedFromCloud = false;  // line 7633
let pinValidated = false;        // line 7634
```

Set to "safe" values in `loadFromFirebase()`:
- `hasLoadedFromCloud = true` — line 15339
- `isInitialLoad = false` — line 15346
- `pinValidated = true` — set in `setupUserAuth()` line 16180
- `state._dataLoaded = true` — set in loadFromFirebase lines 15314/15326/15333

## Checkpoint System

### Storage
- localStorage key: `bodyCompCheckpoints`
- Max 10 checkpoints (oldest pruned)
- Also synced to Firebase: `userPath + '/checkpoints'`

### Functions

| Function | Line | Purpose |
|----------|------|---------|
| `createCheckpoint(name)` | 15566 | Save full state deep copy to localStorage + Firebase |
| `showCheckpointManager()` | ~15630 | Modal with list, restore, delete, export buttons |
| `restoreCheckpoint(index)` | ~15660 | Restore state from checkpoint, save, re-render |
| `deleteCheckpoint(index)` | ~15690 | Remove from array, update localStorage + Firebase |
| `exportCheckpoint(index)` | ~15710 | Download single checkpoint as JSON |
| `exportAllCheckpoints()` | ~15740 | Full backup with `_format: 'checkpoint_backup_v1'` |
| `importCheckpoint(event)` | ~15780 | Import from file (6 accepted formats) |
| `importAndRestoreDirectly()` | ~15850 | File -> state restore directly |
| `saveCheckpointsToFirebase()` | 15598 | Sync checkpoints to Firebase |
| `loadCheckpointsFromFirebase()` | ~15620 | Pull checkpoints from Firebase |

### Export Format
```javascript
{
    _format: 'checkpoint_backup_v1',
    _app: 'body-comp-tracker',
    _exportDate: 'ISO timestamp',
    currentState: { /* full state */ },
    checkpoints: [ /* array of saved checkpoints */ ]
}
```

## Force Sync Functions

| Function | Line | Purpose |
|----------|------|---------|
| `forceUploadToCloud()` | 15982 | Bypass guards, overwrite cloud with local |
| `forcePullFromCloud()` | 16034 | Overwrite local with cloud data |
| `forceCloudSync()` | 15461 | Smart sync: compare versions, push newer |

## Firebase Init Sequence

### `initFirebase()` — Line 16116
1. Set 3-second fallback timer for offline mode
2. Check if Firebase SDK loaded
3. Initialize Firebase app
4. Check for saved PIN in localStorage
5. If saved: `setupUserAuth(pin)`
6. If not: `promptForPin()`

### `setupUserAuth(pin)` — Line 16175
1. Hash PIN: `'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '')`
2. Set `userPath = 'users/' + hashedPin + '/bodyCompTracker'`
3. Set `pinValidated = true`
4. Setup connection monitor
5. Load ecosystem data (parallel)
6. Load from Firebase
7. Load checkpoints from Firebase
8. Start ecosystem refresh (60s interval)
9. Setup stimulant realtime listener

## Cross-App Ecosystem Reads

### `loadEcosystemData(hashedPin)` — Line 16211

Reads from 3 other Firebase paths (READ-ONLY):

1. **Stim Calculator** (`/stimulantCalculator/state`):
   - Sleep hours, wake time, medications (filter by today), caffeine
   - Projected sleep time, all-nighter mode
   - Auto-sets `state.today.sleepHours` if null

2. **Dental Quest** (`/appData/medications`):
   - Pill counts (30mg, 20mg), refill dates
   - Calculates days until refill, will-run-out warning

3. **D3 Roadmap** (`/d3Roadmap/exams` + `/d3Roadmap/monthlyPlanner`):
   - Upcoming exams (next 30 days)
   - Today's schedule, eating windows

Also calculates derived data:
- Sleep debt (last 7 days from dailyLogs)
- Stimulant suppression effect
- Schedule intensity

### Refresh
- `startEcosystemRefresh()`: 60-second interval re-read
- `setupStimulantRealtimeListener()`: Firebase `.on('value')` for live stim calc changes

## Visibility Handlers

```javascript
// Tab hidden → save immediately
document.hidden → saveStateImmediate()

// Tab visible → check day change, then force sync
!document.hidden → checkAndResetDayIfNeeded() → forceCloudSync()
```

## Conflict Resolution Strategy

**Version number comparison** — higher `_version` wins:
- `state._version` is set to `Date.now()` on every save
- In `setupRealtimeSync()`: if `localVersion > cloudVersion`, skip merge
- In `forceCloudSync()`: if `localVersion > cloudVersion`, push local to cloud instead

No dialog prompt — automatic resolution.
