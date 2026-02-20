# Known Bugs, Red Flags & Debugging Guide

## Table of Contents
- [Known Bugs (Unpatched)](#known-bugs-unpatched)
- [Red Flag Patterns (Code Review Checklist)](#red-flag-patterns-code-review-checklist)
- [Debugging Sync Issues (7-Step Workflow)](#debugging-sync-issues)
- [Data Integrity Functions](#data-integrity-functions-body-comp-only)
- [Sync Protection Summary Table](#sync-protection-summary-table)

---

## Known Bugs (Unpatched)

### 1. body-comp skipPin() Missing Guard Flags (CRITICAL)
**File:** body-comp-tracker.html, line 16624
**Impact:** Offline mode saves may be blocked because guard flags aren't set.
```javascript
// CURRENT (broken):
function skipPin() {
    waitingForPin = false;
    firebaseSyncEnabled = false;
    // MISSING: pinValidated = true;
    // MISSING: hasLoadedFromCloud = true;
    // MISSING: isInitialLoad = false;
    // MISSING: state._dataLoaded = true;
    updateSyncStatus('offline', 'Local only');
    showToast('Using offline mode');
    const overlay = document.getElementById('pinPromptOverlay');
    if (overlay) overlay.remove();
    initializeUI();
}

// CORRECT (from stim-calc line 9350):
function skipPin() {
    firebaseSyncEnabled = false;
    pinValidated = true;
    hasLoadedFromCloud = true;
    isInitialLoad = false;
    state._dataLoaded = true;
    updateSyncStatus('offline', 'Local only');
    // ...
}
```

### 2. body-comp saveStateImmediate() Missing PIN Guard
**File:** body-comp-tracker.html, line 14996
**Impact:** Could allow saves before PIN validation if saveStateImmediate() is called directly.
```javascript
// saveState() has: if (!pinValidated) return false;  CORRECT
// saveStateImmediate() is MISSING this guard           BUG
```

### 3. body-comp Realtime Merge Missing _dataLoaded
**File:** body-comp-tracker.html, line ~15441
**Impact:** After realtime merge, `state._dataLoaded` may be unset, blocking subsequent saves.
```javascript
// After merge block (line 15421-15441), need to add:
state._dataLoaded = true;  // Preserve flag after merge
```

### 4. d3-roadmap Offline Path Implicit Flag Setting
**File:** d3-roadmap.html, line 9504-9515
**Impact:** When user cancels PIN, goes offline without explicitly setting `pinValidated`, `hasLoadedFromCloud`, `isInitialLoad`. Relies on `loadFromLocalStorage(finalize=true)` to handle these implicitly.
**Risk:** Lower than body-comp bug since `loadFromLocalStorage(true)` does set the flags, but not `pinValidated`.

---

## Red Flag Patterns (Code Review Checklist)

### 1. _version = Date.now() in Default State
```javascript
// WRONG — CAUSES DATA WIPE on fresh device
const defaultState = { _version: Date.now() };

// CORRECT
const defaultState = { _version: 0 };
```

### 2. Save Without Guards
```javascript
// WRONG — Any save path that skips guard checks
database.ref(userPath).set(state);

// CORRECT — Must go through saveData()/saveState() which has guards
```

### 3. Realtime Merge Not Preserving Flags
```javascript
// WRONG — Spread may overwrite _dataLoaded
state = { ...state, ...firebaseState };

// CORRECT — Preserve after merge
state = { ...state, ...firebaseState };
state._dataLoaded = true;
```

### 4. Empty Array Truthy Check
```javascript
// WRONG — Empty array is truthy
const foods = loadedFoods || defaults;  // [] || defaults = []

// CORRECT — Check length
const foods = loadedFoods?.length > 0 ? loadedFoods : defaults;
```

### 5. UTC Date Parsing
```javascript
// WRONG — Parsed as UTC, causes off-by-one in EST
const date = new Date('2026-02-02');

// CORRECT — Parse in local timezone
const [y, m, d] = '2026-02-02'.split('-').map(Number);
const date = new Date(y, m - 1, d);
```

### 6. Array Storage in Firebase
```javascript
// WRONG — Firebase corrupts arrays
state.items = [item1, item2, item3];

// CORRECT — Object with generated IDs
state.items = {};
state.items[generateId('item')] = item1;
```

### 7. Double loadData() Calls
```javascript
// WRONG — Race condition
loadData();
setupUserAuth(pin);  // Also triggers load

// CORRECT — Sequential with coordination
loadFromLocalStorage(finalize=false);  // Don't mark complete
setupUserAuth(pin);  // Calls loadFromFirebase which finalizes
```

### 8. Realtime Listener During Initial Load
```javascript
// WRONG — Fires during initial load
database.ref(userPath).on('value', snapshot => {
    state = { ...state, ...snapshot.val() };
});

// CORRECT — Guard against initial load
database.ref(userPath).on('value', snapshot => {
    if (isInitialLoad) return;
    // ...
});
```

### 9. Orphan Function Calls
```javascript
// WRONG — Function referenced but not defined
updateSyncStatus('syncing');  // Does this exist?

// CORRECT — Verify all called functions exist in file
```

### 10. skipPin() Without Guard Flags
```javascript
// WRONG — Goes offline but guards block saves
function skipPin() {
    firebaseSyncEnabled = false;
}

// CORRECT — Set all flags for offline mode
function skipPin() {
    firebaseSyncEnabled = false;
    pinValidated = true;
    hasLoadedFromCloud = true;
    isInitialLoad = false;
    state._dataLoaded = true;
}
```

### 11. Undefined Values in Firebase Save Payloads
```javascript
// WRONG — undefined crashes entire .set() call
currentSession: {
    taskId: commandCenterData.currentSession.taskId,
    confirmedStarted: commandCenterData.currentSession.confirmedStarted,  // undefined!
}

// CORRECT — null-coalesce every field
currentSession: {
    taskId: commandCenterData.currentSession.taskId ?? null,
    confirmedStarted: commandCenterData.currentSession.confirmedStarted ?? false,
}
```
**Impact:** Firebase `.set()` rejects ANY undefined in the payload tree. The ENTIRE save fails silently — no partial write, no error in save guards. Only visible as `Uncaught Error: set failed: value argument contains undefined in property '...'` in console. This was the root cause of index.html saves crashing post-split (Feb 2026, commit `280b3f6`).

---

## Debugging Sync Issues

### Step 1: Check Guard Status
```javascript
// In browser console:
console.log({
    pinValidated,
    isInitialLoad: typeof isInitialLoad !== 'undefined' ? isInitialLoad : 'N/A',
    initialLoadComplete: typeof initialLoadComplete !== 'undefined' ? initialLoadComplete : 'N/A',
    hasLoadedFromCloud,
    firebaseSyncEnabled,
    _dataLoaded: (state || roadmapData)?._dataLoaded,
    isEmpty: isEmptyState(state || roadmapData)
});
```

### Step 2: Check Firebase Connection
```javascript
console.log({
    database: !!database,
    userPath: userPath,
    firebaseSyncEnabled: firebaseSyncEnabled
});
```

### Step 3: Watch for Blocked Saves
```javascript
// Refresh page and watch console for:
// "BLOCKED: Save attempted during initial load"
// "BLOCKED: PIN not validated"
// "BLOCKED: Cloud load incomplete"
// "BLOCKED: Empty state"
// "BLOCKED: Data not loaded"
```

### Step 4: Check What Would Be Saved
```javascript
console.log('Would save:', !isEmptyState(state || roadmapData));
console.log('State size:', JSON.stringify(state || roadmapData).length, 'bytes');
```

### Step 5: Check Version Numbers
```javascript
console.log('Local version:', (state || roadmapData)._version);
// Then check Firebase console or force pull to see cloud version
```

### Step 6: Manual Recovery
```javascript
forceUploadToCloud();   // Local → cloud
forcePullFromCloud();   // Cloud → local
checkStorageHealth();   // body-comp only
```

### Step 7: Monitor Realtime Sync
```javascript
// Watch console for these patterns:
// "Realtime: Skipping during initial load"
// "Realtime sync: local version newer, skipping merge"
// "Synced from another device"
// "isLocalUpdate: skipping own echo"
```

---

## Data Integrity Functions (body-comp only)

### checkStorageHealth() (line 18918)
Returns `{ stateSizeKB, totalMB, logCount }`. Warns if approaching 5MB localStorage limit.

### verifyDayLogIntegrity(dateStr) (line 18952)
Recalculates calories/protein from meals, compares to stored totals, auto-fixes if mismatch > 1.

### auditRecentDailyLogs() (line 18974)
Audits last 7 days of logs on app load. Auto-fixes missing calorie/protein totals.

**Note:** Only body-comp has these. Other apps have no post-load integrity audit.

---

## Sync Protection Summary Table

| Check | index.html | d3-roadmap | stim-calc | body-comp |
|-------|-----------|-----------|-----------|-----------|
| Guard block in save | 5 guards | 5 guards | 5 guards | 5 guards (saveState) |
| saveImmediate guard parity | OK | N/A | OK | MISSING PIN guard |
| skipPin sets all flags | N/A | Implicit via load | OK | MISSING all 4 |
| _version=0 in defaults | OK | OK | OK | OK |
| _dataLoaded preserved in realtime | OK | OK | OK | MISSING |
| isEmptyState() exists | OK | OK | OK | OK |
| Realtime reconnect logic | No | Yes (5s retry) | No | No |
| Force upload diagnostics | Basic | Detailed | Basic | Basic |
| Data integrity audit | No | No | No | Yes (3 functions) |
| Firebase key sanitization | No | Yes | No | No |
| Echo prevention | Via timestamp | setLocalUpdateFlag 2s | Via timestamp | Via version |
