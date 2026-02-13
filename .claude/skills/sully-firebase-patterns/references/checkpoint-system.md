# Checkpoint System & Force Sync

## Table of Contents
- [Storage Keys](#storage-keys)
- [Checkpoint Functions Per App](#checkpoint-functions-per-app) (index.html, d3-roadmap, stim-calc, body-comp)
- [Export Format](#export-format-checkpoint_backup_v1)
- [Import Format Flexibility](#import-format-flexibility-d3-roadmap-accepts-7-formats)
- [Force Upload / Force Pull](#force-upload--force-pull)
- [UI Controls](#ui-controls-all-apps)
- [Firebase Key Sanitization](#firebase-key-sanitization-d3-roadmap-only)

---

## Storage Keys

| App | localStorage Key | Max Checkpoints |
|-----|-----------------|-----------------|
| index.html | `dentalQuest_checkpoints_{hashedPin}` | 50 |
| d3-roadmap | `d3RoadmapCheckpoints` | 50 |
| stim-calc | `stimCalcCheckpoints` | 10 |
| body-comp | `bodyCompCheckpoints` | 10 |

---

## Checkpoint Functions Per App

### index.html (9 functions)
```
createCheckpoint(name)         - Save current state
showCheckpointManager()        - Modal with list
restoreCheckpoint(index)       - Restore from checkpoint
deleteCheckpoint(index)        - Remove checkpoint
exportCheckpoint(index)        - Download single as JSON
exportAllCheckpoints()         - Download full backup
importCheckpoint(event)        - Import from file
importAndRestoreDirectly()     - File → state directly
```
**Export format:** `.dent` files
**No auto-backup on force operations**

### d3-roadmap (11 functions)
```
createCheckpoint(name)         - Save current roadmapData
showCheckpointManager()        - Modal with list
restoreCheckpoint(index)       - Restore from checkpoint
deleteCheckpoint(index)        - Remove checkpoint
exportCheckpoint(index)        - Download single
exportAllCheckpoints()         - Full backup with metadata
importCheckpoint(event)        - Import (7 formats accepted)
importAndRestoreDirectly()     - File → state directly
createAutoBackup()             - Called before force operations
showCreateCheckpointDialog()   - Named checkpoint dialog
// Plus sanitizeFirebaseData() called on save
```
**Most robust import:** Accepts 7 formats (see below)
**Auto-backup:** Creates checkpoint before force upload/pull

### stim-calc (8 functions)
```
createCheckpoint(name)
showCheckpointManager()
restoreCheckpoint(index)
deleteCheckpoint(index)
exportCheckpoint(index)
exportAllCheckpoints()
importCheckpoint(event)
importAndRestoreDirectly()
```
**No Firebase-stored checkpoints**
**No auto-backup on force operations**

### body-comp (10 functions)
```
createCheckpoint(name)
showCheckpointManager()
restoreCheckpoint(index)
deleteCheckpoint(index)
exportCheckpoint(index)
exportAllCheckpoints()
importCheckpoint(event)
importAndRestoreDirectly()
createAutoBackup()             - Before force operations
showCreateCheckpointDialog()
```
**Strips `ecosystemContext` before force upload** (cross-app data shouldn't be pushed)

---

## Export Format (checkpoint_backup_v1)

```javascript
{
    _format: 'checkpoint_backup_v1',
    _app: 'app-name',                    // 'd3-roadmap', 'body-comp-tracker', etc.
    _exportDate: '2026-02-13T...',        // ISO timestamp
    currentState: { /* full state */ },
    checkpoints: [
        {
            name: 'Before exam update',
            timestamp: '2026-02-10T...',
            state: { /* snapshot */ }
        }
    ]
}
```

---

## Import Format Flexibility (d3-roadmap accepts 7 formats)

1. **Full backup** — `{ _format: 'checkpoint_backup_v1', checkpoints: [...], currentState: {...} }`
2. **Single checkpoint** — `{ name: "...", state: {...}, timestamp: "..." }`
3. **Raw data** — Direct state object with app-specific keys (e.g., has `grades`, `clinicalData`)
4. **Nested data** — `{ state: {...} }` or `{ data: {...} }`
5. **currentState wrapper** — `{ currentState: {...} }`
6. **App-specific wrapper** — `{ roadmapData: {...} }` or `{ bodyCompData: {...} }`
7. **Legacy array format** — Older exports with array-based collections

Other apps accept fewer formats (typically 3-5).

---

## Force Upload / Force Pull

### Force Upload to Cloud

All apps have `forceUploadToCloud()` — overwrites cloud with local state.

| App | Confirmation Method | Auto-Backup | Diagnostics |
|-----|-------------------|-------------|-------------|
| index.html | `confirm()` dialog | No | Basic |
| d3-roadmap | Must type "UPLOAD" exactly | Yes (auto checkpoint) | Full diagnostics (firebaseSyncEnabled, database, userPath, pinValidated, data size) |
| stim-calc | `confirm()` dialog | No | Basic |
| body-comp | `confirm()` dialog | Yes (auto checkpoint) | Basic; strips ecosystemContext |

### Force Pull from Cloud

All apps have `forcePullFromCloud()` — overwrites local with cloud state.

| App | Confirmation Method | Auto-Backup |
|-----|-------------------|-------------|
| index.html | `confirm()` dialog | No |
| d3-roadmap | `confirm()` dialog | Yes |
| stim-calc | `confirm()` dialog | No |
| body-comp | `confirm()` dialog | Yes |

### d3-roadmap Force Upload Error Handling (Best Practice)
```javascript
.catch(err => {
    console.error('Force upload failed:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Data size:', JSON.stringify(roadmapData).length, 'bytes');
    updateSyncStatus('error', 'Upload failed');
    alert(`Force upload failed:\n\n${err.message}\n\nPlease check:\n1. Internet connection\n2. Try refreshing the page\n3. Re-enter your PIN if prompted`);
});
```

---

## UI Controls (All Apps)

All apps have these buttons in the header area:
```
Checkpoint      → createCheckpoint() or showCreateCheckpointDialog()
Restore         → showCheckpointManager()
Force Upload    → forceUploadToCloud()
Force Pull      → forcePullFromCloud()
```

---

## Firebase Key Sanitization (d3-roadmap only)

```javascript
// sanitizeFirebaseKey() at line 9547
function sanitizeFirebaseKey(key) {
    return String(key).replace(/[.#$/[\]]/g, '_');
}

// sanitizeFirebaseData() at line 9560 - recursive
function sanitizeFirebaseData(obj) {
    // Walks entire object tree
    // Sanitizes all keys that would be invalid in Firebase
    // Characters removed: # / . $ [ ]
}
```

Called automatically before every Firebase write in d3-roadmap. Other apps rely on `generateId()` producing clean keys.
