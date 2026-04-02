# Firebase Sync and Checkpoint System

## Firebase Configuration (~line 8384)

Same config as all Dental Quest apps:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};
```

## PIN Authentication (~line 9488)

```javascript
function setupUserAuth(pin) {
    const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
    currentUser = { uid: hashedPin };
    userPath = 'users/' + hashedPin + '/d3Roadmap';  // NOT d3RoadmapData
    firebaseSyncEnabled = true;
    pinValidated = true;
    loadFromFirebase();
}
```

PIN is stored in `localStorage.getItem('dentalQuestPin')` (shared across all apps).

## Sync Protection System

### 3 Guard Flags (~line 8521-8523)
```javascript
let isInitialLoad = true;       // Block ALL saves until data loaded
let hasLoadedFromCloud = false;  // Track if we've checked Firebase
let pinValidated = false;        // Track if PIN has been validated
```

### 5 Guards in saveData() (~line 10992)
```
GUARD A: isInitialLoad === true         -> return false
GUARD B: hasLoadedFromCloud === false   -> return false
GUARD C: isEmptyState(roadmapData)      -> return false
GUARD D: roadmapData._dataLoaded false  -> return false
GUARD E: firebaseSyncEnabled && !pinValidated -> return false
```

### Save Flow
```
User mutates roadmapData
    -> saveData()
        -> 5 guard checks
        -> markLocalChange()
        -> localStorage.setItem('d3RoadmapData', JSON.stringify(roadmapData))  // IMMEDIATE
        -> setLocalUpdateFlag()  // Prevent realtime echo
        -> Debounced Firebase write (0-300ms):
            -> JSON.parse(JSON.stringify(roadmapData))  // Deep clone
            -> delete cleanData._dataLoaded              // Strip internal flag
            -> sanitizeFirebaseData(cleanData)           // Clean invalid keys
            -> database.ref(userPath).set(cleanData)
            -> On error: retry once after 2 seconds
```

## Load Flow

### initFirebase() (~line 9440)
```
App starts
    -> initFirebase()
        -> 3-second fallback timer (forces UI if Firebase slow)
        -> Check firebase SDK loaded
        -> firebase.initializeApp(firebaseConfig)
        -> setupConnectionMonitor()
        -> Check localStorage for saved PIN
        -> If PIN exists: setupUserAuth(pin)
        -> If no PIN: promptForPin()
```

### reconstructState(source, options) — UNIFIED STATE RECONSTRUCTION (firebase-sync.js ~line 149)
All 5 merge/restore/import paths now call this single function. Three strategies:

| Strategy | Used By | Who Wins | `_version` |
|----------|---------|----------|------------|
| `remote-wins` | `mergeRemoteState` | Source overwrites scalars; collections spread-merge; local wins todoList | `Math.max(source, fallback)` |
| `stored-wins` | `loadFromLocalStorage` | Same as remote-wins EXCEPT: collections use `migrateArrayToObject(source)` only; stored wins todoList | `source ?? fallback ?? 0` |
| `source-wins` | `restoreCheckpoint`, `importBackup`, `importAndRestoreDirectly` | Source unconditionally; fallback fills gaps only | `(source._version ?? 0) + 1` |

Key behavioral differences:
- **todoList spread order**: remote-wins `{...source, ...fallback}` (local wins); stored-wins `{...fallback, ...source}` (stored wins)
- **competencies arg order**: merge strategies `mergeCompetencies(fallback, source)`; source-wins `mergeCompetencies(source, fallback)` — first arg wins structure
- **patientRecords**: remote-wins has full per-patient field-level merge (clinicalBrief newer-wins, importedRequirements fill, briefHistory longer-wins); stored-wins has simple `{...defaults, ...stored}`; source-wins takes wholesale

### loadFromLocalStorage(finalize = true) (firebase-sync.js)
```javascript
function loadFromLocalStorage(finalize = true) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            roadmapData = reconstructState(data, { strategy: 'stored-wins', fallback: roadmapData });
        } catch (e) { /* continue with defaults */ }
    }
    roadmapData._dataLoaded = true;
    migrateInvalidFirebaseKeys(roadmapData);
    clinicalDataDirty = true;
    if (finalize) {
        hasLoadedFromCloud = true;
        isInitialLoad = false;
        lastSyncTimestamp = Date.now();
        initUI();
    }
}
```

### loadFromFirebase() → finishFirebaseLoad(data)
```
loadFromFirebase()
    -> loadFromLocalStorage(finalize=false)  // Get local data first
    -> database.ref(userPath).once('value')
    -> finishFirebaseLoad(data):
        -> If cloud empty/poisoned: keep local, push if real data exists
        -> If local newer: mergeRemoteCollectionsIntoLocal(data) — fill-only
        -> If cloud newer: mergeRemoteState(data) → reconstructState(data, {strategy: 'remote-wins'})
    -> Set flags: hasLoadedFromCloud, isInitialLoad, _dataLoaded
    -> initUI()
    -> setupRealtimeSync()
```

### setupRealtimeSync() (~line 9906)
Listens for cross-device changes:
```javascript
database.ref(userPath).on('value', snapshot => {
    // Skip if this is our own write (localUpdateTimestamp check)
    // Skip during initial load
    // Apply remote data via applyRemoteData()
    // Preserve roadmapData._dataLoaded = true
    // Re-render active tab
});
```

`setLocalUpdateFlag()` at ~line 9393 sets a timestamp to prevent the realtime listener from processing echoes of our own writes.

## Cross-App Sync

### Main App Tasks Sync (~line 10031)
`setupMainAppTasksSync()` listens to `users/{pin}/appData/tasks` to pull tasks marked `doToday` from the main Dental Quest app. Rendered via `renderDoTodayTasks()` on the Dashboard.

## Checkpoint System

Checkpoints stored in **Firebase only** (`userPath/checkpoints/`) + in-memory `_cachedCheckpoints` cache. localStorage backups removed (commit `5ab70b1`).

### Checkpoint Functions

| Function | Line | Description |
|----------|------|-------------|
| `getCheckpointKey()` | ~10308 | Returns localStorage key name |
| `getDataCountForCheckpoint(data)` | ~10313 | Count data items for display |
| `createCheckpoint(customName)` | ~10323 | Save current state as checkpoint |
| `showCheckpointManager()` | ~10377 | Modal with checkpoint list |
| `restoreCheckpoint(index)` | ~10460 | Restore state from checkpoint |
| `deleteCheckpoint(index)` | ~10537 | Delete a checkpoint |
| `exportCheckpoint(index)` | ~10561 | Download single checkpoint as JSON |
| `exportAllCheckpoints()` | ~10578 | Download full backup |
| `isValidAppData(data)` | ~10606 | Validate imported data |
| `importCheckpoint()` | ~10622 | Import checkpoint from file |
| `importAndRestoreDirectly()` | ~10735 | Direct file -> state restore |
| `escapeHtmlForCheckpoint(text)` | ~10454 | Escape HTML in checkpoint names |

### Checkpoint Shape
```javascript
{
    name: 'Before sync test',
    timestamp: '2026-02-13T10:00:00.000Z',
    dataCount: { deadlines: 5, patients: 3, appointments: 2 },
    data: { /* deep copy of full roadmapData */ }
}
```

### createCheckpoint() (~line 10323)
```javascript
function createCheckpoint(customName = null) {
    const checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    const checkpoint = {
        name: customName || 'Checkpoint ' + new Date().toLocaleString(),
        timestamp: new Date().toISOString(),
        dataCount: getDataCountForCheckpoint(roadmapData),
        data: JSON.parse(JSON.stringify(roadmapData))
    };
    checkpoints.push(checkpoint);
    localStorage.setItem(getCheckpointKey(), JSON.stringify(checkpoints));
    showToast('Checkpoint created!');
}
```

### restoreCheckpoint() (~line 10460)
Restores roadmapData from checkpoint, preserves `_dataLoaded: true`, calls `saveData()` + `initUI()`.

## Force Upload/Pull

### forceUploadToCloud() (~line 10837)
```javascript
async function forceUploadToCloud() {
    // Confirmation prompt: type "UPLOAD" exactly
    // Diagnostic logging of all guard states
    // Direct database.ref(userPath).set(cleanData)
    // Bypasses normal saveData() guards
    // Shows success/failure feedback
}
```

### forcePullFromCloud() (~line 10929)
```javascript
async function forcePullFromCloud() {
    // Confirmation prompt: type "PULL" exactly
    // database.ref(userPath).once('value')
    // Overwrites local roadmapData with cloud data
    // Sets _dataLoaded = true
    // Saves to localStorage
    // Calls initUI()
}
```

## Connection Monitor (~line 9169)
`setupConnectionMonitor()` monitors `.info/connected` to show online/offline status.

## Backup System (~line 9198)
Additional backup functions:
| Function | Line | Description |
|----------|------|-------------|
| `createBackup(reason)` | ~9198 | Auto-backup to localStorage |
| `getBackups()` | ~9244 | List available backups |
| `restoreBackup(backupId)` | ~9254 | Restore from auto-backup |
| `exportBackup()` | ~9279 | Export backup as file |
| `importBackup(file)` | ~9299 | Import backup from file |
| `showBackupManager()` | ~9330 | Backup manager modal |

## Sync Conflict Resolution (~line 9403)
`showSyncConflictModal(localData, remoteData, onResolve)` — shows a modal when local and remote versions conflict, letting user choose which to keep.

## Import Format Support
`importCheckpoint()` and `importAndRestoreDirectly()` accept multiple formats:
1. Full backup with checkpoints array
2. Single checkpoint object
3. Raw roadmapData object
4. Nested `{ state: {...} }` or `{ data: {...} }` wrapper
5. `{ currentState: {...} }` wrapper
6. App-specific wrapper (`{ roadmapData: {...} }`)

### Import Block Types (9 total)
The patient import system (`parsePatientImportText()` in patients.js) parses 9 block types in a single atomic paste:
1. PATIENT_RECORD
2. PATIENT_UPDATE
3. REQUIREMENTS_MATCH
4. REQUIREMENTS_STATUS
5. SPS_DASHBOARD_UPDATE
6. APPOINTMENTS
7. MISSING_NOTES
8. TODO_LIST
9. CLINICAL_BRIEF

### Merge Site Notes
`mergeRemoteCollectionsIntoLocal()` has explicit `clinicalBrief` handling: newer `dateGenerated` wins, longer `briefHistory` wins.
