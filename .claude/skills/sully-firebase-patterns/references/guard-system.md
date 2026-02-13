# Guard System & Save Functions

## Table of Contents
- [index.html — saveData()](#indexhtml--savedata-line-12902)
- [d3-roadmap — saveData()](#d3-roadmaphtml--savedata-line-10992)
- [stim-calc — saveState()](#stimulant-elimination-calculatorhtml--savestate-line-10322)
- [body-comp — saveState()](#body-comp-trackerhtml--savestate-line-14942)
- [isEmptyState() Details](#isemptystate-details)

---

## index.html — saveData() (line 12902)

**Debounce:** 200ms via `clearTimeout(saveTimeout); saveTimeout = setTimeout(..., 200)`
**Guards (4):**
```javascript
if (!pinValidated) { console.warn('⚠️ BLOCKED: PIN not validated'); return false; }
if (!initialLoadComplete) { console.warn('⚠️ BLOCKED: Initial load not complete'); return false; }
if (!hasLoadedFromCloud) { console.warn('⚠️ BLOCKED: Cloud load incomplete'); return false; }
if (isEmptyState(state)) { console.warn('⚠️ BLOCKED: Empty state'); return false; }
```
**Note:** Does NOT have `_dataLoaded` guard (only app without it).

**Payload saved:**
```javascript
{ tasks, stats, medications, calendarNotes, calendarEvents, notebook,
  focusModeData, commandCenterData, financials, pillAssignments,
  dailyPlanner, pomodoroSettings, lastUpdated }
```

**saveDataImmediate() (line 13080):** Same 4 guards, no debounce, calls `database.ref(userPath).set()` directly.

**Guard vars declared:** line 11970-11972 (`initialLoadComplete=false`, `hasLoadedFromCloud=false`, `pinValidated=false`)

---

## d3-roadmap.html — saveData() (line 10992)

**Debounce:** Smart — 0ms if >2s since last save, else 300ms. Prevents rapid-fire saves while staying responsive.
```javascript
const timeSinceLastSave = Date.now() - lastSaveTime;
const delay = timeSinceLastSave > 2000 ? 0 : 300;
```

**Guards (5):**
```javascript
if (!pinValidated) return false;               // GUARD E
if (isInitialLoad) return false;               // GUARD A
if (!hasLoadedFromCloud) return false;          // GUARD B
if (isEmptyState(roadmapData)) return false;   // GUARD C
if (!roadmapData._dataLoaded) return false;    // GUARD D
```

**Unique features:**
- Calls `sanitizeFirebaseData()` before writing (removes `#`, `/`, `.`, `$`, `[`, `]` from keys)
- Calls `setLocalUpdateFlag()` before Firebase write to prevent echo in realtime listener
- Uses `roadmapData` (not `state`) as the data object

**loadFromLocalStorage(finalize=true) (line 9757):**
- `finalize=true` (terminal path, no Firebase): sets `hasLoadedFromCloud=true`, `isInitialLoad=false`, calls `initUI()`
- `finalize=false` (called from loadFromFirebase): only loads data, caller handles flags

**Guard vars declared:** line 8521-8523

**Default state:** `getDefaultRoadmapData()` at line 8465 — `_version: 0`, `_dataLoaded: false`

---

## stimulant-elimination-calculator.html — saveState() (line 10322)

**Debounce:** 2000ms. localStorage additionally throttled to 500ms.

**Guards (5):**
```javascript
if (!pinValidated) return false;               // GUARD 0
if (isInitialLoad) return false;               // GUARD A
if (!hasLoadedFromCloud) return false;          // GUARD B
if (isEmptyState(state)) return false;          // GUARD C
if (!state._dataLoaded) return false;           // GUARD D
```

**saveStateImmediate() (line 10381):** Same 5 guards, immediate write.

**Guard vars declared:** line 3213-3215

**Default state:** `getDefaultState()` at line 3114 — `_version: 0`, `_dataLoaded: false`

**skipPin() (line 9350):** CORRECTLY sets all 4 flags:
```javascript
pinValidated = true; hasLoadedFromCloud = true; isInitialLoad = false; state._dataLoaded = true;
```

---

## body-comp-tracker.html — saveState() (line 14942)

**Debounce:** 2000ms. localStorage written immediately (no throttle).

**Guards (5):**
```javascript
if (!pinValidated) return false;               // GUARD 0
if (isInitialLoad) return false;               // GUARD A
if (!hasLoadedFromCloud) return false;          // GUARD B
if (isEmptyState(state)) return false;          // GUARD C
if (!state._dataLoaded) return false;           // GUARD D
```

**saveStateImmediate() (line 14996):** Has only 4 guards — **MISSING `!pinValidated`** check (known bug).

**saveToFirebase() (line 15163):** Called by both save functions. Strips `ecosystemContext` before upload:
```javascript
const stateToSave = { ...state };
delete stateToSave.ecosystemContext;  // Read-only cross-app data, don't save
```

**saveDayLog() (line 12228):** Saves current day snapshot to `state.dailyLogs[dateKey]`. Called after every meal add/edit/delete, workout change, setup, and daily transitions. Calls `saveState()` internally.

**Guard vars declared:** line 7632-7634

**Default state:** `getDefaultState()` at line 7317 — `_version: 0`, `_dataLoaded: false`, extensive `ecosystemContext` structure

**skipPin() (line 16624):** BUG — Missing all 4 guard flags. Only sets `firebaseSyncEnabled=false` and calls `initializeUI()`.

---

## isEmptyState() Details

### index.html (line 11979)
```javascript
function isEmptyState(data) {
    // Returns true if ALL of these are missing/empty:
    // tasks, calendarNotes, calendarEvents, notebook.entries,
    // stats.totalXPGained, focusModeData, commandCenterData
}
```

### d3-roadmap (line 8526)
Checks 11 fields: customDeadlines, grades, clinicalData, monthlyPlanner, exams, editedDeadlines, examStudyProgress, mandatoryItems, pedsLockedIn (!=33.3), dailyPlanner, lastSaved.

### stim-calc (line 3222)
Checks medications, caffeine, history, sleepHistory. **Special:** returns `false` (not empty) if `allNighterMode=true` or `_dataLoaded=true`.

### body-comp (line 7637)
Checks weighIns, today.meals, today.workouts, dailyLogs, bodyCompHistory, setupComplete.
