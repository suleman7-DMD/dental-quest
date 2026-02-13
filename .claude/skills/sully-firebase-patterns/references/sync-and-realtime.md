# Sync, Realtime Listeners & Visibility Handlers

## Table of Contents
- [Sync Lifecycle](#sync-lifecycle-all-apps)
- [Realtime Listeners](#realtime-listeners) (index.html, d3-roadmap, stim-calc, body-comp)
- [Visibility Change Handlers](#visibility-change-handlers)
- [Sync Status Indicator](#sync-status-indicator-all-apps)
- [Firebase Write Pattern](#firebase-write-pattern)
- [Data Merge Strategies](#data-merge-strategies)

---

## Sync Lifecycle (All Apps)

```
1. App loads → show PIN prompt
2. PIN entered → hash → set userPath → set pinValidated=true
3. loadFromLocalStorage() → populate state from localStorage
4. loadFromFirebase() → fetch cloud data → merge (cloud wins if local _version=0)
5. Set flags: hasLoadedFromCloud=true, isInitialLoad=false, _dataLoaded=true
6. initUI() → render everything
7. setupRealtimeSync() → listen for remote changes
```

---

## Realtime Listeners

### index.html (line 17507)
```javascript
database.ref(userPath).on('value', snapshot => {
    if (!initialLoadComplete) return;  // Skip during load
    const data = snapshot.val();
    if (!data || isEmptyState(data)) return;  // Skip empty
    // Timestamp comparison for conflict detection
    // Triggers conflict modal if local has unsaved changes
});
```
**Conflict UI:** 3-option modal — Keep Local / Keep Remote / Merge

### d3-roadmap (line 9916)
```javascript
database.ref(userPath).on('value', snapshot => {
    if (isInitialLoad) return;
    if (!hasLoadedFromCloud) return;
    if (isLocalUpdate) return;  // Echo prevention
    // Grace period: KEEP_LOCAL_GRACE_MS = 5000ms
    // If local save happened <5s ago, skip remote update
    const timeSinceLocal = Date.now() - lastLocalSaveTime;
    if (timeSinceLocal < KEEP_LOCAL_GRACE_MS) return;
    // Merge remote data into roadmapData
});
```
**Echo prevention:** `setLocalUpdateFlag()` sets `isLocalUpdate=true` for 2 seconds after each Firebase write, so the realtime listener ignores its own writes bouncing back.

**Connection monitor (line 9173):** Uses `.info/connected` Firebase path. Reconnect retry after 5s on error.

### stim-calc (line ~9255)
```javascript
database.ref(userPath).on('value', snapshot => {
    if (isInitialLoad) return;
    if (!hasLoadedFromCloud) return;
    // Timestamp-based: compares lastUpdated fields
});
```
**Connection monitor (line 9255):** Uses `.info/connected` with 3-second fallback timer for offline detection.

### body-comp (line 15372)
```javascript
database.ref(userPath).on('value', snapshot => {
    if (isInitialLoad) return;
    if (!hasLoadedFromCloud) return;
    const firebaseState = data.state;
    // Version-based conflict resolution
    const localVersion = state._version || 0;
    const cloudVersion = firebaseState._version || 0;
    if (localVersion > cloudVersion) return;  // Local wins
    // Merge using migrateArrayToObject for collections
    // BUG: Does NOT preserve state._dataLoaded after merge
});
```
**Connection monitor (line 7748):** Uses `.info/connected`.
**Native events (line 7764):** Also listens to browser `online`/`offline` events with `pendingSync` queue.
**Stim listener:** `setupStimulantRealtimeListener()` watches stim calc Firebase path for live stimulant data changes.
**Ecosystem refresh:** `startEcosystemRefresh()` polls all cross-app data every 60 seconds.

---

## Visibility Change Handlers

### index.html (line 14181)
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveDataImmediate();  // Flush pending saves
    } else {
        if (initialLoadComplete && hasLoadedFromCloud) {
            loadDataFromFirebase();  // Pull fresh
        }
    }
});
```

### d3-roadmap
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveData();  // Smart debounce (0ms since >2s idle)
    } else {
        if (!isInitialLoad && hasLoadedFromCloud) {
            // Pull fresh from Firebase
        }
    }
});
```

### stim-calc (line 10249-10302)
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveStateImmediate();
    } else {
        // Refresh from Firebase
        // Explicitly preserves: state._dataLoaded = true;
    }
});
```

### body-comp
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveStateImmediate();
    } else {
        if (!isInitialLoad && hasLoadedFromCloud) {
            // Pull fresh from Firebase + refresh ecosystem data
        }
    }
});
```

---

## Sync Status Indicator (All Apps)

```javascript
updateSyncStatus(status, message)
// status: 'connected' | 'syncing' | 'offline' | 'error'
// UI shows: connected | syncing | offline | error
```

---

## Firebase Write Pattern

```javascript
// Standard pattern (all apps):
database.ref(userPath).set(payload)
    .then(() => {
        updateSyncStatus('connected', 'Saved');
    })
    .catch(error => {
        console.error('Firebase save error:', error);
        updateSyncStatus('error', 'Save failed');
    });
```

No retry mechanism exists in any app. Force upload/pull are the manual recovery tools.

---

## Data Merge Strategies

### On Initial Load (cloud vs local)
- If local `_version === 0` or `isEmptyState(local)` → cloud wins completely
- If cloud is empty → keep local
- Otherwise → field-level merge (cloud fields override local, local-only fields preserved)

### On Realtime Update
- **index.html:** Shows conflict dialog if local has pending changes
- **d3-roadmap:** 5-second grace period — skips remote if local save was recent
- **stim-calc:** `lastUpdated` timestamp comparison
- **body-comp:** `_version` number comparison (higher wins), then field-level merge with `migrateArrayToObject()` for collections

### Key Merge Detail (body-comp line 15421-15441)
```javascript
state = {
    ...state,
    profile: { ...state.profile, ...(firebaseState.profile || {}) },
    today: {
        ...state.today,
        ...(firebaseState.today || {}),
        meals: migrateArrayToObject(firebaseState.today?.meals || state.today.meals, 'meal'),
        workouts: migrateArrayToObject(firebaseState.today?.workouts || state.today.workouts, 'workout')
    },
    frequentFoods: mergedFrequentFoods,
    weighIns: migrateArrayToObject(firebaseState.weighIns || state.weighIns, 'weighin'),
    dailyLogs: { ...state.dailyLogs, ...(firebaseState.dailyLogs || {}) },
    // ...
};
// BUG: Missing state._dataLoaded = true; after merge
```
