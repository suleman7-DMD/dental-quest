# Function Map

Complete function index organized by category. Line numbers verified against body-comp-tracker.html (19,034 lines).

## Table of Contents
- [State Management (7311-7654)](#state-management-7311-7654)
- [Data Integrity Utilities (7656-7876)](#data-integrity-utilities-7656-7876)
- [Firebase Config & Helpers (7856-7876)](#firebase-config--helpers-7856-7876)
- [Utility Functions (7877-8079)](#utility-functions-7877-8079)
- [Core Algorithms (8080-8256)](#core-algorithms-8080-8256)
- [Date-Based Calculations (8257-8552)](#date-based-calculations-8257-8552)
- [Simple View Rendering (8553-9363)](#simple-view-rendering-8553-9363)
- [Stimulant Modeling & Nudges (9364-10163)](#stimulant-modeling--nudges-9364-10163)
- [Meal/Workout Rendering (10164-11174)](#mealworkout-rendering-10164-11174)
- [Import & Quick Meal (11175-11835)](#import--quick-meal-11175-11835)
- [Workout Modal (11836-12227)](#workout-modal-11836-12227)
- [Daily Log & Nudges (12228-12467)](#daily-log--nudges-12228-12467)
- [Weigh-In & Export (12468-12961)](#weigh-in--export-12468-12961)
- [Weekly Export & Logic Log (12962-13702)](#weekly-export--logic-log-12962-13702)
- [Body Comp Modal (13703-14066)](#body-comp-modal-13703-14066)
- [UI/UX Functions (14067-14940)](#uiux-functions-14067-14940)
- [Save/Load System (14942-15561)](#saveload-system-14942-15561)
- [Checkpoint System (15562-16109)](#checkpoint-system-15562-16109)
- [Firebase Init & Auth (16110-16209)](#firebase-init--auth-16110-16209)
- [Ecosystem Integration (16211-16635)](#ecosystem-integration-16211-16635)
- [Gamification (16636-16975)](#gamification-16636-16975)
- [Progress Tab (16976-18051)](#progress-tab-16976-18051)
- [Calendar & Badges (18052-18529)](#calendar--badges-18052-18529)
- [Initialization (18530-18912)](#initialization-18530-18912)
- [Data Integrity (18913-19031)](#data-integrity-18913-19031)

## State Management (7311-7654)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `getDefaultState()` | 7317 | `()` | Factory for default state (~110 lines) |
| `isEmptyState(data)` | 7637 | `(data)` | Check if state has real user data |
| `hasRealData(data)` | 7652 | `(data)` | Inverse of isEmptyState |

## Data Integrity Utilities (7656-7876)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `ensureArray(val, fallback)` | 7660 | `(val, fallback=[])` | Convert Firebase objects back to arrays |
| `generateId(prefix)` | 7670 | `(prefix='item')` | Generate unique ID like `meal_17074...` |
| `getValues(obj)` | 7675 | `(obj)` | Safe object-to-array iteration |
| `getCount(obj)` | 7682 | `(obj)` | Safe count of object keys or array length |
| `migrateArrayToObject(data, prefix)` | 7689 | `(data, keyPrefix)` | Convert array to ID-keyed object |
| `mergeFrequentFoods(local, firebase)` | ~7750 | `(local, firebase)` | Merge food libraries preserving local adds |
| `getDefaultFrequentFoods()` | ~7730 | `()` | Default 21 frequent foods |

## Firebase Config & Helpers (7856-7876)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `firebaseConfig` | 7856 | Object | Firebase project config |
| `updateSyncStatus(status, msg)` | ~7872 | `(status, message)` | Update sync indicator UI |

## Utility Functions (7877-8079)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `getLocalDateString(date?)` | 7881 | `(date?)` | Today's date as YYYY-MM-DD (local TZ) |
| `formatTimeET(input)` | 7907 | `(input)` | Format time in Eastern Time |
| `getTimeAgo(date)` | ~7940 | `(date)` | Human-readable time ago string |
| `formatNumber(num)` | 7971 | `(num)` | Locale-formatted number |
| `escapeHtml(str)` | 7976 | `(str)` | XSS protection for innerHTML |
| `showToast(msg, icon?)` | ~7990 | `(message, icon?)` | Toast notification |
| `parseLocalDate(str)` | 16480 | `(str)` | Parse YYYY-MM-DD to local Date |

## Core Algorithms (8080-8256)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `calculateBMR(w, h, a)` | 8084 | `(weight_lbs, height_cm, age)` | Mifflin-St Jeor BMR |
| `calculateTDEE(w, h, a, cal)` | 8090 | `(weight_lbs, height_cm, age, todayActiveCalories)` | BMR * NEAT + 7-day workout avg |
| `get7DayAvgActiveCalories()` | 8143 | `()` | Rolling 7-day workout cal average |
| `calculateMode(sleep, brain)` | 8172 | `(sleepHours, isBrainDay)` | GREEN/YELLOW/ORANGE |
| `calculateTargets(m, t, w, b)` | 8185 | `(mode, tdee, weight_lbs, isBrainDay)` | Cal/protein/carb targets |
| `getModeDisplay(mode)` | 8223 | `(mode)` | Mode emoji/label/class |
| `getTodayTotals()` | 8236 | `()` | Sum calories/protein/carbs from today's meals |
| `getCurrentDeficit()` | 8246 | `()` | TDEE - calories eaten |

## Date-Based Calculations (8257-8552)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `getTotalsForDate(dateStr)` | 8266 | `(dateStr)` | Totals for any date (today or historical) |
| `getDeficitForDate(dateStr)` | ~8310 | `(dateStr)` | Deficit for any date |

## Simple View Rendering (8553-9363)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `renderSimpleView()` | 8557 | `()` | Main dashboard renderer |
| `renderSimpleMealList()` | 8763 | `()` | Inline meal list |
| `toggleSimpleMealList()` | 8802 | `()` | Expand/collapse meal list |
| `renderQuickStats()` | ~8810 | `()` | Quick stat cards |
| `renderSimpleWorkoutSummary()` | ~8840 | `()` | Workout display |
| `renderScheduleCard()` | ~8880 | `()` | D3 roadmap schedule |
| `renderExamDayCard()` | ~8950 | `()` | Exam day phase card |
| `renderSleepDebtIndicator()` | ~9020 | `()` | Sleep debt severity |

## Stimulant Modeling & Nudges (9364-10163)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `getEnhancedStimulantNudge()` | ~9370 | `()` | Pharmacokinetic-based eating nudge |
| `getScheduleAwareNudge()` | ~9440 | `()` | Schedule-based eating nudge |
| `getEveningPrepNudge()` | ~9510 | `()` | Evening meal prep nudge |
| `getWeakDayNudge()` | ~9580 | `()` | Pattern-based weak day warning |
| `analyzeProteinDistribution()` | ~9700 | `()` | Protein timing analysis |
| `getProteinDistributionNudge()` | ~9770 | `()` | Protein timing nudge |
| `getSimpleStatus()` | 9791 | `()` | Dashboard status icon/label |
| `getEatingNudge()` | 9845 | `()` | Main eating nudge dispatcher |
| `getWorkoutRecommendation()` | 9980 | `()` | Sleep-based workout advice + gym streak |

## Meal/Workout Rendering (10164-11174)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `renderMealsList()` | ~10164 | `()` | Full meal list (dashboard view) |
| `renderDashboard()` | ~10300 | `()` | Dashboard view render |
| `editMeal(mealId)` | ~10500 | `(mealId)` | Edit meal inline |
| `deleteMeal(mealId)` | ~10560 | `(mealId)` | Delete meal |
| `addCustomMeal()` | ~10640 | `()` | Manual meal entry |
| `ensureMealsObject(dateStr)` | ~10765 | `(dateStr)` | Array-to-object for dailyLog meals |
| `ensureWorkoutsObject(dateStr)` | ~10790 | `(dateStr)` | Array-to-object for dailyLog workouts |

## Import & Quick Meal (11175-11835)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `openImportMealModal(dateStr)` | 11185 | `(dateStr)` | Claude text import for meals |
| `processImportedMeals()` | 11239 | `()` | Parse MEAL|Name|Cal|Pro|Carb format |
| `openImportWorkoutModal(dateStr)` | 11318 | `(dateStr)` | Claude text import for workouts |
| `processImportedWorkouts()` | 11372 | `()` | Parse WORKOUT|Type|Dur|Cal|Time format |
| `openQuickMealModal()` | 11528 | `()` | Frequent foods modal |
| `confirmQtyAdd(foodId, qty)` | ~11580 | `(foodId, qty)` | Add meal with quantity multiplier |

## Workout Modal (11836-12227)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `openWorkoutModal()` | 12001 | `()` | Workout logging modal |
| `logWorkout()` | ~12100 | `()` | Save workout from modal |

## Daily Log & Nudges (12228-12467)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `saveDayLog()` | 12228 | `()` | Snapshot today to dailyLogs[date] |
| `resetDay()` | 12310 | `()` | Reset today's data with confirmation |
| `checkAndShowNudges()` | 12364 | `()` | Time-based contextual alert banners |
| `dismissNudge()` | 12459 | `()` | Dismiss current nudge |
| `updateMicronutrients()` | 12472 | `()` | Mag/water tracking + CNS XP |

## Weigh-In & Export (12468-12961)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `openWeighInModal()` | ~12468 | `()` | Weight entry modal |
| `saveWeighIn()` | ~12510 | `()` | Save weight + optional BF% |
| `openExportModal()` | ~12600 | `()` | Data export modal |
| `exportData(format)` | ~12650 | `(format)` | Export as JSON/CSV |
| `recalculateDayLog(dateStr)` | ~12850 | `(dateStr)` | Recalculate historical day log |
| `migrateOldDailyLogs()` | ~12900 | `()` | Fix old logs missing totals |

## Weekly Export & Logic Log (12962-13702)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `openWeeklyExportModal()` | 12966 | `()` | Weekly summary modal |
| `calculateFullWeekData()` | 12976 | `()` | 7-day data compilation |
| `renderWeeklyExportPreview(data)` | 13073 | `(weekData)` | Render weekly summary |
| `generateClaudeExportText()` | ~13200 | `()` | Claude check-in text |
| `generateLogicLog()` | 13311 | `()` | 9-section diagnostic |
| `openLogicModal()` | ~13500 | `()` | Logic log modal |

## Body Comp Modal (13703-14066)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `openBodyCompModal()` | 13707 | `()` | Body composition check-in |
| `calculateNavyBodyFat(w, n, h)` | 13768 | `(waist, neck, height)` | Navy method BF% formula |
| `updateNavyPreview()` | 13781 | `()` | Live Navy calculation |
| `updateScalePreview()` | 13838 | `()` | Live scale calculation |
| `saveNavyMeasurement()` | 13891 | `()` | Save Navy method result |
| `saveScaleMeasurement()` | ~13920 | `()` | Save scale BF% result |
| `renderBodyCompHistory()` | ~13960 | `()` | History list in modal |

## UI/UX Functions (14067-14940)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `openSettingsModal()` | ~14070 | `()` | App settings modal |
| `saveSettings()` | ~14150 | `()` | Save settings changes |
| `openMetabolicModal()` | ~14200 | `()` | Metabolic breakdown |
| `toggleFocusMode()` | ~14300 | `()` | Toggle focus mode (plain numbers) |
| `showDayDetails(dateStr)` | ~18200 | `(dateStr)` | Day detail drill-down modal |

## Save/Load System (14942-15561)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `saveState()` | 14942 | `()` | 5-guard save (localStorage + Firebase 2s debounce) |
| `saveStateImmediate()` | 14996 | `()` | 4-guard immediate save (bug: no PIN guard) |
| `loadState()` | 15040 | `()` | Load from localStorage with migrations |
| `saveToFirebase()` | 15163 | `()` | Firebase write (strips ecosystemContext) |
| `loadFromFirebase()` | 15217 | `()` | Firebase load + merge + init |
| `setupRealtimeSync()` | 15366 | `()` | Version-compared realtime listener |
| `forceCloudSync()` | 15461 | `()` | Smart sync (version comparison) |
| `tryGetSleepFromStimCalc()` | 15544 | `async ()` | Direct stim calc sleep read |

## Checkpoint System (15562-16109)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `createCheckpoint(name)` | 15566 | `(name?)` | Save state to localStorage + Firebase |
| `saveCheckpointsToFirebase()` | 15598 | `async ()` | Sync checkpoints to Firebase |
| `showCheckpointManager()` | ~15630 | `()` | Checkpoint list modal |
| `restoreCheckpoint(index)` | ~15660 | `(index)` | Restore from checkpoint |
| `deleteCheckpoint(index)` | ~15690 | `(index)` | Remove checkpoint |
| `exportCheckpoint(index)` | ~15710 | `(index)` | Download single checkpoint |
| `exportAllCheckpoints()` | ~15740 | `()` | Full backup download |
| `importCheckpoint(event)` | ~15780 | `(event)` | Import from file |
| `importAndRestoreDirectly()` | ~15850 | `()` | File → state restore |
| `forceUploadToCloud()` | 15982 | `()` | Bypass guards, overwrite cloud |
| `forcePullFromCloud()` | 16034 | `()` | Overwrite local from cloud |

## Firebase Init & Auth (16110-16209)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `initFirebase()` | 16116 | `()` | Firebase SDK init + PIN check |
| `setupUserAuth(pin)` | 16175 | `(pin)` | Hash PIN, set path, load data |
| `promptForPin()` | ~16190 | `()` | PIN entry modal |
| `skipPin()` | 16624 | `()` | Skip PIN (offline mode — known bug) |
| `setupConnectionMonitor()` | ~16200 | `()` | Firebase .info/connected listener |

## Ecosystem Integration (16211-16635)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `loadEcosystemData(pin)` | 16211 | `async (hashedPin)` | Read from 3 other apps |
| `startEcosystemRefresh()` | ~16500 | `()` | 60s refresh interval |
| `setupStimulantRealtimeListener()` | ~16520 | `()` | Live stim calc listener |
| `calculateSleepDebt()` | ~16540 | `()` | 7-day sleep debt analysis |
| `applySleepDebtModeOverride()` | ~16580 | `()` | Sleep debt → mode override |
| `calculateStimulantEffect()` | ~16600 | `()` | Appetite suppression calc |

## Gamification (16636-16975)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `switchDashboardTab(tab, e)` | 16677 | `(tabName, event)` | Tab switching |
| `renderXPBar()` | 16704 | `()` | XP/level/streak display |
| `getLevelInfo(xp)` | 16743 | `(xp)` | Level for XP amount |
| `awardXP(amount, reason)` | 16753 | `(amount, reason)` | Add XP, check level up |
| `updateStreak()` | 16772 | `()` | Daily completion streak |
| `checkDayCompletion()` | 16808 | `()` | Check targets, award XP |
| `checkAchievements()` | 16848 | `()` | Check 12 achievement conditions |
| `unlockAchievement(id)` | 16892 | `(achievementId)` | Unlock + XP + celebrate |
| `showCelebration(type, data)` | 16912 | `(type, data)` | Full-screen celebration |
| `triggerConfetti()` | 16954 | `()` | Confetti animation |

## Progress Tab (16976-18051)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `renderProgressTab()` | 16980 | `()` | Dispatch to 12 sub-renderers |
| `renderBodyCompTrend()` | 16997 | `()` | Fat vs lean mass trend |
| `renderRefeedTracker()` | ~17060 | `()` | Cumulative deficit + refeed |
| `renderSummerProgress()` | ~17120 | `()` | June 1 goal countdown |
| `renderWeightChart()` | ~17180 | `()` | Weight trend display |
| `renderDeficitTracking()` | ~17250 | `()` | Weekly deficit totals |
| `renderWeeklySummary()` | ~17320 | `()` | 7-day daily breakdown |
| `renderWeeklyReportCard()` | ~17530 | `()` | A-F weekly grade |
| `renderPersonalRecords()` | ~17620 | `()` | Best day/streak/etc |
| `renderConsistencyScore()` | ~17700 | `()` | % days on track |
| `renderSleepPerformanceInsight()` | ~17780 | `()` | Sleep vs performance |
| `renderAchievementProgress()` | ~17860 | `()` | Next achievement progress |
| `renderLifetimeStats()` | ~17940 | `()` | Lifetime totals |

## Calendar & Badges (18052-18529)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `renderCalendarHeatmap()` | 18056 | `()` | Monthly heatmap calendar |
| `renderAchievements()` | ~18350 | `()` | Badges gallery tab |

## Initialization (18530-18912)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `initializeUI()` | 18534 | `async ()` | Main UI init + day rollover |
| `autoStartDay()` | 18583 | `async ()` | Auto-setup using ecosystem |
| `showManualSetup()` | 18641 | `()` | Manual setup override |
| `checkAndResetDayIfNeeded()` | ~18730 | `()` | Midnight day change |

## Data Integrity (18913-19031)

| Function | Line | Signature | Purpose |
|----------|------|-----------|---------|
| `checkStorageHealth()` | ~18915 | `()` | Verify localStorage integrity |
| `verifyDayLogIntegrity()` | ~18950 | `()` | Check dailyLog structure |
| `auditRecentDailyLogs()` | ~18990 | `()` | Audit last 7 days of logs |
