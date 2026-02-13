# Complete Function Map (VERIFIED Feb 2026)

All line numbers verified against actual code. Lines marked ~ are within 10 lines.

## Table of Contents
- [State & Defaults (~3114-3242)](#state--defaults-3114-3242)
- [Data Integrity Utilities (~3244-3360)](#data-integrity-utilities-3244-3360)
- [Circadian Analysis (~3421-3600)](#circadian-analysis-3421-3600)
- [Time Utilities (~3600-3700)](#time-utilities-3600-3700)
- [Migration (~3678)](#migration-3678)
- [Threshold System (~3700-3940)](#threshold-system-3700-3940)
- [Circadian Zone Helpers (~3945-3988)](#circadian-zone-helpers-3945-3988)
- [Core Pharmacokinetics (~3988-4140)](#core-pharmacokinetics-3988-4140)
- [Clearance Search (~4145-4240)](#clearance-search-4145-4240)
- [Sleep Prediction (~4242-4520)](#sleep-prediction-4242-4520)
- [Medication Management (~4530-4620)](#medication-management-4530-4620)
- [Caffeine Management (~4726-4770)](#caffeine-management-4726-4770)
- [Vitamin C Helpers (~4879-4990)](#vitamin-c-helpers-4879-4990)
- [All-Nighter / Ghost Load (~4994-5186)](#all-nighter--ghost-load-4994-5186)
- [Workout Planner (~5186-5640)](#workout-planner-5186-5640)
- [Main Recalculation (~5637)](#main-recalculation-5637)
- [Nicotine Tracking (~6483-6500)](#nicotine-tracking-6483-6500)
- [Scenario Simulation (~6918-7030)](#scenario-simulation-6918-7030)
- [Calibration / History (~7516-7780)](#calibration--history-7516-7780)
- [Sleep Performance & Accuracy (~7856-9100)](#sleep-performance--accuracy-7856-9100)
- [Firebase / Auth (~9122-9560)](#firebase--auth-9122-9560)
- [Sync & Cloud Operations (~9655-10170)](#sync--cloud-operations-9655-10170)
- [Save / Load (~10322-10540)](#save--load-10322-10540)
- [Diagnostic / Forecast (~10540-11103)](#diagnostic--forecast-10540-11103)
- [Initialization (~11126-11523)](#initialization-11126-11523)
- [Functions That DO NOT Exist](#functions-that-do-not-exist-common-misconceptions)

## State & Defaults (~3114-3242)

| Function | Line | Description |
|----------|------|-------------|
| `getDefaultState()` | ~3114 | Factory returns default state object |
| `isEmptyState(data)` | ~3222 | 6-condition empty check (meds, caff, history, sleepHistory, allNighterMode, _dataLoaded) |

## Data Integrity Utilities (~3244-3360)

| Function | Line | Description |
|----------|------|-------------|
| `generateId(prefix)` | ~3258 | Generate unique IDs like `med_170740...` |
| `migrateArrayToObject(arr)` | ~3264 | Handle Firebase array-to-object corruption |
| `getValues(obj)` | ~3293 | Safe object-to-array iteration |
| `getCount(obj)` | ~3300 | Safe object key count |
| `escapeHtml(str)` | ~3331 | XSS protection for innerHTML |

## Circadian Analysis (~3421-3600)

| Function | Line | Description |
|----------|------|-------------|
| `analyzeCircadianPhase()` | ~3421 | Full circadian analysis with 7-day circular mean wake averaging |

## Time Utilities (~3600-3700)

| Function | Line | Description |
|----------|------|-------------|
| `getLocalDateString()` | ~3604 | Today's date as YYYY-MM-DD |
| `parseLocalDate(dateStr)` | ~3609 | Parse date string to local Date object |
| `timeToMinutes(time)` | ~3615 | "14:30" -> 870 |
| `minutesToTime(mins)` | ~3624 | 870 -> "14:30" |
| `minutesToTimeWithDay(mins)` | ~3634 | Adds "(tomorrow)" if >= 1440 |
| `minutesToTimeValue(mins)` | ~3640 | Format for time input values |
| `computeSleepDelta(predicted, actual)` | ~3648 | Midnight-crossing-aware delta (+/-720 wrapping) |

## Migration (~3678)

| Function | Line | Description |
|----------|------|-------------|
| `migrateHistoryEntries()` | ~3678 | Backfill deltaMinutes, absError, autoSaved, predictedAt |

## Threshold System (~3700-3940)

| Function | Line | Description |
|----------|------|-------------|
| `calculateSleepDebtBonus()` | ~3719 | 3-day weighted deficit (1.0/0.7/0.4), 0-6mg, hyperarousal check |
| `getEffectiveThreshold()` | ~3848 | Full threshold: base + debt + workout + sauna (capped base+8) |
| `isHyperarousalMode()` | ~3937 | Returns true if < 4h sleep |

## Circadian Zone Helpers (~3945-3988)

| Function | Line | Description |
|----------|------|-------------|
| `getForbiddenZone()` | ~3945 | Returns {start, end} for 13-15h after wake |
| `getSleepGate()` | ~3953 | Returns {start, end} for 15-17h after wake |
| `isInForbiddenZone()` | ~3961 | Boolean: is current time in FZ? |
| `isInSleepGate()` | ~3971 | Boolean: is current time in Sleep Gate? |
| `getForbiddenZoneEnd()` | ~3980 | FZ end time, normalized for midnight |

## Core Pharmacokinetics (~3988-4140)

| Function | Line | Description |
|----------|------|-------------|
| `calculateDecayWithVitC(initialAmount, doseStart, atMinutes, baseHL, reducedHL, vitCTime, vitCExpire)` | ~3988 | 3-segment VitC-aware decay calculation |
| `calculateAmpLoad(atMinutes)` | ~4036 | Sum all amp contributions (XR split + VitC + ghost load) |
| `calculateCaffLoad(atMinutes)` | ~4102 | Sum all caffeine contributions (simple decay) |

## Clearance Search (~4145-4240)

| Function | Line | Description |
|----------|------|-------------|
| `findAmpClearTime()` | ~4145 | Iterative binary search with DR spike re-verification (10 iterations max) |
| `findCaffClearTime()` | ~4209 | Standard binary search for caffeine |

## Sleep Prediction (~4242-4520)

| Function | Line | Description |
|----------|------|-------------|
| `calculateSleepTime()` | ~4242 | Main 6-phase prediction algorithm. Returns {sleepTime, blockingFactors, ...} |
| `getCurrentMinutes()` | ~4521 | Current time in minutes since midnight |

## Medication Management (~4530-4620)

| Function | Line | Description |
|----------|------|-------------|
| `addMedEntry(dose, time)` | ~4530 | Add medication to state |
| `removeMedEntry(id)` | ~4579 | Remove medication by ID |
| `renderMedEntries()` | ~4613 | Render medication list in UI |

## Caffeine Management (~4726-4770)

| Function | Line | Description |
|----------|------|-------------|
| `addCaffeine(amount, name)` | ~4726 | Add caffeine entry |
| `addCustomCaffeine()` | ~4742 | Add custom caffeine from modal |
| `removeCaffeine(id)` | ~4753 | Remove caffeine by ID |
| `renderCaffeineEntries()` | ~4764 | Render caffeine list in UI |

## Vitamin C Helpers (~4879-4990)

| Function | Line | Description |
|----------|------|-------------|
| `updateVitaminCDate()` | ~4879 | VitC date management |
| `getVitaminCTimeMinutes()` | ~4898 | VitC time in minutes (with adjustments) |
| `getRawVitaminCTimeMinutes()` | ~4938 | Raw VitC time without adjustments |
| `isVitaminCEffective()` | ~4960 | Is VitC currently active? (within 8h TTL) |
| `getVitaminCStatus()` | ~4970 | Full VitC status object |

## All-Nighter / Ghost Load (~4994-5186)

| Function | Line | Description |
|----------|------|-------------|
| `toggleAllNighterMode()` | ~4994 | Toggle all-nighter on/off |
| `calculateYesterdayDoseRemaining(dose, time, halfLife, isXR)` | ~5049 | Ghost load with XR split + VitC consistency |
| `renderGhostLoad()` | ~5078 | Ghost load display (uses ghostMedEntries + ghostLoadTotal DOM IDs) |

## Workout Planner (~5186-5640)

| Function | Line | Description |
|----------|------|-------------|
| `initWorkoutPlanner()` | ~5186 | Initialize workout system |
| `updateWorkoutTimeline()` | ~5202 | Update timeline visualization |
| `calculateWorkoutImpact()` | ~5241 | Calculate adenosine, cortisol, thermal effects |
| `updateWorkoutPlan()` | ~5423 | Update workout parameters |
| `applyWorkoutPlan()` | ~5533 | Apply workout effects to state |
| `resetWorkoutPlan()` | ~5582 | Reset workout planner |
| `updateWorkoutStatus()` | ~6049 | Update workout status display |

## Main Recalculation (~5637)

| Function | Line | Description |
|----------|------|-------------|
| `recalculate()` | ~5637 | Main recalc + render (called every 5 seconds) |

## Nicotine Tracking (~6483-6500)

| Function | Line | Description |
|----------|------|-------------|
| `logNicotine(type)` | ~6483 | Log nicotine use |
| `clearNicotine()` | ~6498 | Clear nicotine data |

## Scenario Simulation (~6918-7030)

| Function | Line | Description |
|----------|------|-------------|
| `simulateVitaminC()` | ~6918 | VitC scenario simulation |
| `simulateSauna()` | ~6948 | Sauna scenario simulation |
| `simulateScenario(type)` | ~7027 | General scenario simulator |

## Calibration / History (~7516-7780)

| Function | Line | Description |
|----------|------|-------------|
| `saveDay()` | ~7516 | Save today's prediction to history |
| `autoPopulateFeedback()` | ~7567 | Auto-fill actual sleep from sleep history |
| `renderHistory()` | ~7626 | Render prediction history list |
| `renderSleepCalendar()` | ~7778 | Calendar view of sleep data |

## Sleep Performance & Accuracy (~7856-9100)

| Function | Line | Description |
|----------|------|-------------|
| `renderCircadianPhase()` | ~7856 | Circadian phase display |
| `toggleSleepPerformance()` | ~8028 | Toggle sleep perf section |
| `toggleAccuracyDashboard()` | ~8043 | Toggle accuracy section |
| `renderAccuracyDashboard()` | ~8051 | Prediction accuracy stats display |
| `renderAccuracyHeroHint()` | ~8117 | Accuracy hero section |
| `renderSleepPerformance()` | ~8160 | Sleep quality metrics |
| `renderSleepAchievements()` | ~8482 | Achievement display |
| `renderSleepHistoryList()` | ~8862 | History list view |
| `calculateAccuracyStats(days)` | ~8968 | Returns {totalEntries, avgError, avgAbsError, within30min, within60min, trend, recentBias} |
| `getCalibrationRecommendation()` | ~9045 | Detailed calibration suggestions |
| `suggestCalibration()` | ~9093 | Toast-based threshold adjustment tips (bias > +/-30 min) |

## Firebase / Auth (~9122-9560)

| Function | Line | Description |
|----------|------|-------------|
| `initFirebase()` | ~9227 | Firebase initialization and PIN check |
| `promptForPin()` | ~9297 | Show PIN modal |
| `submitPin()` | ~9332 | Validate and set PIN |
| `skipPin()` | ~9350 | Offline mode (sets all 4 guard flags) |
| `saveToFirebase(stateToSave)` | ~9364 | Actual Firebase write |
| `loadFromFirebase()` | ~9403 | Initial data load from cloud |
| `setupRealtimeSync()` | ~9557 | Cross-device sync listener (preserves _dataLoaded) |

## Sync & Cloud Operations (~9655-10170)

| Function | Line | Description |
|----------|------|-------------|
| `forceCloudSync()` | ~9655 | Force upload current state to cloud |
| `createCheckpoint(name)` | ~9717 | Save state snapshot to localStorage |
| `showCheckpointManager()` | ~9744 | Checkpoint management modal |
| `restoreCheckpoint(index)` | ~9814 | Restore from saved checkpoint |
| `deleteCheckpoint(index)` | ~9846 | Delete a checkpoint |
| `exportCheckpoint(index)` | ~9858 | Download single checkpoint |
| `exportAllCheckpoints()` | ~9880 | Download full backup |
| `importCheckpoint(event)` | ~9924 | Import checkpoint from file |
| `importAndRestoreDirectly()` | ~10010 | Direct file-to-state restore |
| `forcePullFromCloud()` | ~10116 | Force download from cloud |
| `renderAll()` | ~10170 | Master render function |

## Save / Load (~10322-10540)

| Function | Line | Description |
|----------|------|-------------|
| `saveState()` | ~10322 | Debounced save with 5 guards |
| `saveStateImmediate()` | ~10381 | Immediate save with 5 guards (IDENTICAL guards) |
| `loadState()` | ~10433 | Load from localStorage |

## Diagnostic / Forecast (~10540-11103)

| Function | Line | Description |
|----------|------|-------------|
| `updateForecastLogic()` | ~11103 | Diagnostic forecast panel update |

## Initialization (~11126-11523)

| Function | Line | Description |
|----------|------|-------------|
| `init()` | ~11126 | Main entry point (DOMContentLoaded handler) |
| `toggleAccordion(sectionName)` | ~11233 | Unified accordion toggle |
| `initUnifiedView()` | ~11504 | Initialize accordion view |

---

## Functions That DO NOT Exist (Common Misconceptions)

These are often referenced but do not exist in the actual codebase:

| Non-existent Function | What Actually Happens |
|----------------------|----------------------|
| `calculateXRContribution()` | XR split is inline in `calculateAmpLoad()` |
| `calculateIRContribution()` | No IR-only model; all doses use XR split |
| `calculateDoseContribution()` | Routing is inline (no `med.type` field) |
| `calculateAmpWithVitC()` | Use `calculateDecayWithVitC()` instead |
| `getPendingDRReleaseTimes()` | DR times collected inline in `findAmpClearTime()` |
| `getBlockingFactors()` | Built inline in `calculateSleepTime()` |
| `applyCircadianConstraints()` | Applied inline in `calculateSleepTime()` phases 2 & 5 |
| `getCircadianZoneTimes()` | Use `getForbiddenZone()` and `getSleepGate()` separately |
| `calculateAverageWakeTime()` | Circular mean is inline in `analyzeCircadianPhase()` |
| `calculateGhostLoad()` | Ghost load rendered by `renderGhostLoad()`, calculated by `calculateYesterdayDoseRemaining()` |
| `checkAllNighterMode()` | Use `toggleAllNighterMode()` at line 4994 |
| `getSaunaBonus()` | Sauna logic is inline in `getEffectiveThreshold()` |
| `getWorkoutBonus()` | Workout logic is inline in `getEffectiveThreshold()` |
| `checkHyperarousal()` | Use `isHyperarousalMode()` at line 3937 |
| `validatePin()` | Use `submitPin()` at line 9332 |
| `showPinEntry()` | Use `promptForPin()` at line 9297 |
| `render()` | Use `renderAll()` at line 10170 or `recalculate()` at line 5637 |
| `handleAddMedication()` | Use `addMedEntry()` at line 4530 |
| `handleAddCaffeine()` | Use `addCaffeine()` at line 4726 |
| `handleDeleteMedication()` | Use `removeMedEntry()` at line 4579 |
| `handleDeleteCaffeine()` | Use `removeCaffeine()` at line 4753 |
