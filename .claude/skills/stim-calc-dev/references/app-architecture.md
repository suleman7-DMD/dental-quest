# Stimulant Elimination Calculator Architecture

## Table of Contents
- [File Structure](#file-structure)
- [Application Boot Sequence](#application-boot-sequence)
- [Global Variables](#global-variables-all-verified)
- [Firebase Path](#firebase-path)
- [Core Calculation Flow](#core-calculation-flow)
- [Modifier System](#modifier-system)
- [Rendering System](#rendering-system)

## File Structure

Single file: `stimulant-elimination-calculator.html` (11,526 lines)

```
ACTUAL Line Ranges (verified Feb 2026):
Lines 1-2482:      HTML head, meta, CSS styles (dark theme)
Line 2482:          </style> (CSS ENDS)
Lines 2483-3106:    HTML structure (body, modals, nav, inputs, display sections)
Line 3107:          <script> tag STARTS
Lines 3114-3157:    getDefaultState() factory function
Lines 3159-3208:    let state = {...} (main state object initialization)
Lines 3210-3242:    Sync protection flags + isEmptyState()
Lines 3244-3360:    Data integrity utilities (generateId, getCount, getValues, etc.)
Lines 3360-3420:    BackupManager, misc utilities
Lines 3421-3700:    Circadian analysis, time utilities, migration
Lines 3700-3950:    Sleep debt, threshold calculation, hyperarousal, circadian zones
Lines 3950-4240:    Pharmacokinetic calculations (decay, amp load, caff load, clearance)
Lines 4242-4520:    Sleep prediction algorithm (calculateSleepTime - 6 phases)
Lines 4520-4880:    Medication/caffeine add/remove/render, VitC date helpers
Lines 4880-5080:    VitC status, all-nighter toggle, ghost load calculation
Lines 5078-5186:    Ghost load rendering, misc UI
Lines 5186-5640:    Workout planner system (init, calculate, apply, reset)
Lines 5637-6480:    recalculate(), main UI rendering, forecast display
Lines 6483-6920:    Nicotine tracking, scenario simulators (VitC, sauna)
Lines 6920-7516:    Simulation UI, scenario rendering
Lines 7516-7780:    Calibration: saveDay(), autoPopulateFeedback(), renderHistory()
Lines 7778-8860:    Sleep calendar, circadian display, accuracy dashboard, achievements
Lines 8862-9100:    Sleep history list, accuracy stats, calibration recommendations
Lines 9122-9360:    Firebase init, PIN system (initFirebase, promptForPin, submitPin, skipPin)
Lines 9364-9560:    Firebase save/load (saveToFirebase, loadFromFirebase)
Lines 9557-9715:    Realtime sync, force sync functions
Lines 9717-10010:   Checkpoint system (create, restore, export, import)
Lines 10010-10170:  Force pull, checkpoint helpers
Lines 10170-10320:  renderAll(), updateSyncStatus()
Lines 10322-10540:  saveState(), saveStateImmediate(), loadState()
Lines 10540-11100:  Forecast/diagnostic panel (generateLogicLog, updateForecastLogic)
Lines 11126-11210:  init() function (MAIN ENTRY POINT)
Lines 11212-11500:  Unified accordion view, focus mode
Lines 11504-11523:  initUnifiedView()
Line 11523:         document.addEventListener('DOMContentLoaded', init)
Line 11524:         </script>
Line 11526:         </html>
```

## Application Boot Sequence

```
document.addEventListener('DOMContentLoaded', init)    // Line 11523
                    |
                    v
init() {                                                // Line 11126
  1. loadState()                    // Load from localStorage
  2. cleanupOldMedications()        // Remove expired meds
  3. initFirebase()                 // Initialize Firebase
     |
     +-- Checks localStorage for 'dentalQuestPin'
     +-- If found: setupUserAuth(pin)
     |     +-- Sets userPath = 'users/{hashedPin}/stimulantCalculator'
     |     +-- Sets pinValidated = true
     |     +-- Calls loadFromFirebase()
     |     |     +-- Firebase query for data at userPath
     |     |     +-- Merges with defaults
     |     |     +-- Sets hasLoadedFromCloud = true
     |     |     +-- Sets isInitialLoad = false
     |     +-- Calls setupRealtimeSync()
     +-- If NOT found: promptForPin()
  4. Set DOM input values from state
  5. renderMedEntries(), renderCaffeineEntries(), renderHistory()
  6. updateAllNighterUI()
  7. initWorkoutPlanner()
  8. recalculate()                   // Initial calculation
  9. setupGraphTooltip()
  10. autoPopulateFeedback()
  11. migrateHistoryEntries()
  12. setInterval(recalculate, 5000)  // Periodic recalc every 5 seconds
  13. initUnifiedView()
}
```

## Global Variables (ALL verified)

```javascript
// State object
let state = {...};                     // Line 3159 — main state

// Sync protection flags
let isInitialLoad = true;              // Line 3213
let hasLoadedFromCloud = false;        // Line 3214
let pinValidated = false;              // Line 3215

// Auto-save tracking
let lastAutoSavePredictionTime = 0;    // Line 3218
let lastAutoSavePredictionMinutes = null; // Line 3219

// Hyperarousal flag
let hyperarousalMode = false;          // Line 3710

// UI state
let currentEditingDate = null;         // Line 7905
let sleepPerfExpanded = true;          // Line 8026
let accuracyDashExpanded = true;       // Line 8041
let explainerTimeout = null;           // Line 8457
let forecastExpanded = false;          // Line 10595
let focusMode = false;                 // Line 11212

// Firebase
let firebaseInitialized = false;       // Line 9122
let database = null;                   // Line 9123
let firebaseSyncEnabled = false;       // Line 9124 (NOTE: starts FALSE)
let currentUser = null;                // Line 9125
let userPath = null;                   // Line 9126

// Sync tracking
let localChangesSinceLastSync = false; // Line 9180
let lastSyncTimestamp = null;          // Line 9181

// Realtime sync
let realtimeSyncEnabled = false;       // Line 9554
let lastKnownTimestamp = null;         // Line 9555

// Save debouncing
let firebaseSaveTimeout = null;        // Line 10319
let lastLocalSave = 0;                 // Line 10320
```

## Firebase Path

```javascript
// Line 9287
userPath = 'users/' + hashedPin + '/stimulantCalculator';

// Where hashedPin (line 9285):
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
```

**IMPORTANT:** Path is `stimulantCalculator`, NOT `stimCalcData`.

## Core Calculation Flow

```
User adds medication (addMedEntry)
        |
        v
recalculate() [runs every 5 seconds via setInterval]
        |
        +-- calculateAmpLoad(currentMinutes)
        |     +-- Iterate all medications via getValues()
        |     +-- Each dose: 50% IR at T+0, 50% DR at T+4h
        |     +-- Apply VitC 3-segment decay via calculateDecayWithVitC()
        |     +-- Include ghost load if allNighterMode (up to 3 days)
        |
        +-- calculateCaffLoad(currentMinutes)
        |     +-- Simple exponential decay for each entry
        |     +-- Include yesterday in allNighterMode
        |
        +-- getEffectiveThreshold()
        |     +-- Base threshold (14mg default)
        |     +-- + Sleep debt bonus (3-day weighted, 0-6mg)
        |     +-- + Workout adenosine bonus
        |     +-- + Sauna bonus (peak 2h, decay over 4h more)
        |     +-- Cap at base + 8mg
        |
        +-- calculateSleepTime() [6 phases]
        |     +-- Phase 1: Pharmacokinetic floor (max of amp/caff clearance)
        |     +-- Phase 2: Circadian constraints (WMZ + FZ blocking)
        |     +-- Phase 3: Time-based blockers (workout cooldown)
        |     +-- Phase 5: Final circadian clamp
        |     +-- Phase 6: Pharmacokinetic floor enforcement
        |     +-- Phase 7: Final drug verification
        |
        +-- Update UI (loads, threshold, prediction, circadian phase)
```

## Modifier System

```javascript
// Modifiers affect threshold, NOT clearance rate (except VitC)
// Higher threshold = earlier sleep (drug crosses it sooner)

VitaminC: {
  effect: 'half-life reduction',  // 70% of normal, 8-hour TTL
  timing: 'instant on/off',      // No gradual transition
  model: '3-segment'             // Before VitC | VitC active | VitC expired
}

Sauna: {
  effect: 'threshold boost',     // +1-2mg depending on time of day
  timing: 'after completion',    // Peak for 2h, then decay
  decay: '6h total',             // 2h peak + 4h linear decay
  evening_bonus: true            // >= 5PM gives +2.0, earlier gives +1.0
}

Workout: {
  effect: 'threshold boost',     // Adenosine-based
  timing: 'planned',             // Via workout planner system
  subsystem: 'workoutPlan'       // Complex 12-field state object
}

Nicotine: {
  effect: 'advisory only',       // Tracked but doesn't modify algorithm
  types: ['vape', 'other'],      // Logging for awareness
  subsystem: 'state.nicotine'
}
```

## Rendering System

```javascript
// Master render
function renderAll() { ... }             // Line 10170

// Main recalculation (called every 5 seconds)
function recalculate() { ... }           // Line 5637

// Specific renderers
function renderMedEntries() { ... }      // Line 4613
function renderCaffeineEntries() { ... } // Line 4764
function renderGhostLoad() { ... }       // Line 5078
function renderHistory() { ... }         // Line 7626
function renderSleepCalendar() { ... }   // Line 7778
function renderCircadianPhase() { ... }  // Line 7856
function renderAccuracyDashboard() { ... } // Line 8051
function renderSleepPerformance() { ... } // Line 8160
function renderSleepAchievements() { ... } // Line 8482
function renderSleepHistoryList() { ... } // Line 8862
function updateForecastLogic() { ... }   // Line 11103
```
