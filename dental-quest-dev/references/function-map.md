# Function Map -- index.html (Dental Quest)

> All line numbers verified against the current codebase (Feb 2026).
> File total: ~22,700 lines.

## Table of Contents
- [Data Integrity Utilities](#data-integrity-utilities-12455-12700)
- [Sync Protection](#sync-protection-11970-12032)
- [Load / Save / Sync](#load--save--sync-12751-13080)
- [Checkpoint System](#checkpoint-system-13254-13650)
- [UI Utilities](#ui-utilities-13143-13210)
- [Firebase Init](#firebase-init-13854-14180)
- [Medication System](#medication-system-14406-14720)
- [Financial Cockpit](#financial-cockpit-14742-15940)
- [Calendar & Countdown System](#calendar--countdown-system-15948-16440)
- [Daily Planner](#daily-planner-16499-17160)
- [Notebook](#notebook-17661-17920)
- [Calendar Notes & Med Settings](#calendar-notes--med-settings-17912-18090)
- [Task CRUD & Display](#task-crud--display-18247-18620)
- [Pomodoro Timer](#pomodoro-timer-18618-18690)
- [Dashboard Expansions](#dashboard-expansions-18745-18920)
- [View Switching](#view-switching-18926-18965)
- [Focus Mode Planning](#focus-mode-planning-18976-19460)
- [Command Center Core](#command-center-core-19519-19660)
- [Triage Mode](#triage-mode-19662-20330)
- [Time Prompts](#time-prompts-20429-20670)
- [Crash Out Mode](#crash-out-mode-20674-21145)
- [Timeline Drag & Drop](#timeline-drag--drop-21145-21200)
- [Reordering Functions](#reordering-functions-21203-21530)
- [Window Exposures](#window-exposures-21463-21475)
- [Focus Pomodoro Mode](#focus-pomodoro-mode-21681-22100)
- [Gamification & Streaks](#gamification--streaks-22103-22350)
- [Task Edit & Init](#task-edit--init-22350-22470)
- [Quick Add Panel & Compact Header](#quick-add-panel--compact-header-22533-22700-second-script-block)

---

## Data Integrity Utilities (12455-12700)

| Line | Function | Purpose |
|------|----------|---------|
| 12462 | `generateId(prefix)` | Unique ID: `prefix_timestamp_random` |
| 12469 | `getDeviceId()` | Stable device ID in localStorage for conflict detection |
| 12479 | `ensureArray(val, fallback)` | Firebase object-to-array conversion |
| 12489 | `getValues(obj)` | Safe iteration: handles arrays and objects |
| 12496 | `getCount(obj)` | Safe count: arrays and objects |
| 12503 | `migrateArrayToObject(data, keyPrefix)` | Convert legacy arrays to keyed objects |
| 12532 | `migrateFinancials(raw)` | Upgrade old financial schema to current |
| 12661 | `getTaskIds(obj)` | Extract task ID keys from object |
| 12675 | `migrateDosesLoggedToObject(data)` | Convert dose log arrays to objects |

---

## Sync Protection (11970-12032)

| Line | Variable / Function | Purpose |
|------|---------------------|---------|
| 11970 | `initialLoadComplete` | Guard: no saves until Firebase load finishes |
| 11971 | `hasLoadedFromCloud` | Guard: no saves until cloud data checked |
| 11972 | `pinValidated` | Guard: no saves until PIN validated |
| 11979 | `isEmptyState(data)` | Returns true if data has zero user content |
| 12000 | `hasRealData(data)` | Inverse of isEmptyState |
| 12005 | `markInitialLoadComplete()` | Sets flag + hides loading overlay |

---

## Load / Save / Sync (12751-13080)

| Line | Function | Purpose |
|------|----------|---------|
| 12751 | `loadData()` | Load from localStorage, migrate arrays, merge defaults |
| 12902 | `saveData()` | Guarded save: localStorage immediate, Firebase debounced 200ms |
| 13080 | `saveDataImmediate()` | Bypass debounce for critical ops (checkpoints) |
| 13928 | `loadDataFromFirebase()` | Fetch from Firebase, merge with local, call markInitialLoadComplete |
| 16445 | `markLocalChange()` | Mark that local changes exist for conflict detection |
| 17164 | `updateSyncStatus(status, message)` | Update sync indicator (connected/syncing/offline/error) |
| 17264 | `applyRemoteData(data)` | Overwrite all local state from remote snapshot |
| 17360 | `forceUploadToCloud()` | Manual: local overwrites cloud (with confirm) |
| 17419 | `forcePullFromCloud()` | Manual: cloud overwrites local (with confirm) |
| 17491 | `setupMainDataRealtimeSync()` | Firebase `on('value')` listener for live sync |

---

## Checkpoint System (13254-13650)

| Line | Function | Purpose |
|------|----------|---------|
| 13254 | `getCheckpointKey()` | Returns localStorage key for checkpoints |
| 13259 | `getDataCountForCheckpoint()` | Stats summary for checkpoint label |
| 13269 | `createCheckpoint()` | Save current state snapshot to localStorage |
| 13333 | `showCheckpointManager()` | Modal: list, restore, export, delete checkpoints |
| 13424 | `restoreCheckpointByIndex(index)` | Restore state from a numbered checkpoint |
| 13468 | `exportCheckpointByIndex(index)` | Download single checkpoint as JSON file |
| 13498 | `deleteCheckpointByIndex(index)` | Remove one checkpoint from localStorage |
| 13533 | `importCheckpointFile(event)` | Import checkpoint from file (6 format variants) |
| 13603 | `restoreCheckpoint(event)` | Direct file-to-state restore |

---

## UI Utilities (13143-13210)

| Line | Function | Purpose |
|------|----------|---------|
| 13143 | `showToast(message, icon)` | Ephemeral toast notification |
| 13160 | `showCustomAlert(message, title, callback)` | Modal alert replacement |
| 13178 | `showCustomConfirm(message, onConfirm, onCancel, title)` | Modal confirm replacement |

---

## Firebase Init (13854-14180)

| Line | Function | Purpose |
|------|----------|---------|
| 13854 | `initializeFirebase()` | Config, auth, PIN hashing, start load chain |
| 14181 | *(visibilitychange handler)* | Hidden: flush pending save; Visible: refresh from Firebase |

---

## Medication System (14406-14720)

| Line | Function | Purpose |
|------|----------|---------|
| 14406 | `getTimeAgo(date)` | Human-readable time delta ("2 hours ago") |
| 14426 | `updateMedicationDisplay()` | Refresh all med cards |
| 14431 | `updateMedCard(medType)` | Render single medication card |
| 14646 | `checkAndApplyDailyPillReduce()` | Auto-reduce pill count daily (catch-up for missed days) |
| 14690 | `openMedSettings(medType)` | Open medication settings modal |
| 14704 | `closeMedModal()` | Close medication modal |
| 14709 | `showHelp()` | Open help modal |
| 14717 | `closeHelp()` | Close help modal |

---

## Financial Cockpit (14742-15940)

| Line | Function | Purpose |
|------|----------|---------|
| 14742 | `openFinancials()` | Show financial cockpit panel |
| 14774 | `closeFinancials()` | Hide financial cockpit panel |
| 14780 | `calculateFinancialStatus()` | Projection math: cash - unpaid months = projected balance |
| 14844 | `updateCockpitStats()` | Refresh cockpit header numbers |
| 14863 | `renderFinancialCockpit()` | Orchestrate all financial sub-renders |
| 14882 | `renderMasterCockpit()` | Master liquidity section |
| 14916 | `updateMasterLiquidity()` | Update cash/date/cushion fields |
| 14959 | `saveMasterLiquidity()` | Persist master liquidity edits |
| 14980 | `renderOneTimeBills()` | One-time bills list |
| 15035 | `toggleOneTimeBillPaid(billId)` | Toggle paid status on a bill |
| 15043 | `addOneTimeBill()` | Show add-bill form |
| 15058 | `saveNewOneTimeBill()` | Save new one-time bill |
| 15090 | `saveOneTimeBillEdit(billId)` | Save edits to existing bill |
| 15102 | `deleteOneTimeBill(billId)` | Remove a bill |
| 15112 | `renderMonthlyExpenses()` | Monthly recurring expenses grid |
| 15179 | `toggleMonthCollapse(monthKey)` | Collapse/expand a month section |
| 15193 | `toggleMonthExpensePaid(monthKey, expenseKey)` | Toggle monthly expense paid |
| 15233 | `saveMonthExpenseEdit(monthKey, expenseKey)` | Save edited monthly expense |
| 15246 | `deleteMonthExpense(monthKey, expenseKey)` | Delete monthly expense |
| 15257 | `addExpenseToMonth(monthKey)` | Add expense to specific month |
| 15272 | `saveNewMonthExpense(monthKey)` | Save new monthly expense |
| 15288 | `renderExpenseTemplate()` | Template expenses section |
| 15334 | `saveTemplateExpenseEdit(expKey)` | Save template expense edit |
| 15345 | `deleteTemplateExpense(expKey)` | Delete template expense |
| 15354 | `addTemplateExpense()` | Add new template expense |
| 15367 | `saveNewTemplateExpense()` | Save new template expense |
| 15381 | `renderProjectionPanel()` | Financial projection (burn rate) panel |
| 15426 | `renderActionItems()` | Financial action items list |
| 15490 | `toggleActionItem(itemId)` | Toggle action item complete |
| 15504 | `renderCreditCards()` | Credit cards section |
| 15614 | `saveCreditCardEdit(cardId)` | Save credit card edits |
| 15642 | `openFinancialHelp()` | Financial help modal |
| 15649 | `closeFinancialHelp()` | Close financial help |
| 15653 | `showFinancialHelp(topic)` | Show help for specific topic |

---

## Calendar & Countdown System (15948-16440)

| Line | Function | Purpose |
|------|----------|---------|
| 15948 | `openCalendar()` | Open master calendar modal |
| 15964 | `closeCalendar()` | Close calendar modal |
| 15974 | `renderMasterCalendar()` | Full calendar render orchestrator |
| 15991 | `renderCalendarGrid()` | Month grid with day cells |
| 16134 | `getMedStatus(medType)` | Pill status for calendar day |
| 16170 | `renderCountdowns()` | Countdown timers section |
| 16281 | `openAddCountdown()` | Add countdown modal |
| 16296 | `closeAddCountdown()` | Close countdown modal |
| 16301 | `saveCountdown()` | Save new countdown |
| 16374 | `deleteCountdown(eventId)` | Delete a countdown |
| 16399 | `getLocalDateString(date)` | Format date as `YYYY-MM-DD` in local timezone |
| 16403 | `getTodayDateString()` | Shortcut for today's date string |
| 16408 | `parseLocalDate(dateStr)` | Parse `YYYY-MM-DD` to Date in local timezone |
| 16445 | `markLocalChange()` | Mark local data as modified |
| 16450 | `showSyncConflictModal(localData, remoteData, onResolve)` | Conflict resolution UI |

---

## Daily Planner (16499-17160)

| Line | Function | Purpose |
|------|----------|---------|
| 16499 | `checkPlannerReset()` | Auto-reset planner at midnight |
| 16541 | `checkCriticalEODReset()` | End-of-day critical reset |
| 16591 | `loadDailyPlanner()` | Load planner from state |
| 16636 | `saveDailyPlanner()` | Save planner to state |
| 16652 | `openDailyPlanner()` | Open planner panel |
| 16714 | `closeDailyPlanner()` | Close planner panel |
| 16725 | `updateClock()` | Live clock display in planner |
| 16744 | `updateCurrentTimeLine()` | Current time indicator line |
| 16844 | `setTimeToNow()` | Set event time to current time |
| 16878 | `toggleEndTimeMode()` | Switch between duration and end-time |
| 16907 | `calculateDurationFromEndTime()` | Derive duration from end time |
| 16927 | `renderPlannerTimeline()` | Render planner time blocks |
| 16973 | `renderPlannerEvent(block, blockId)` | Render single planner event |
| 17012 | `addPlannerEvent()` | Add new planner event |
| 17073 | `togglePlannerEvent(blockId)` | Toggle planner event complete |
| 17085 | `deletePlannerEvent(event, blockId)` | Delete planner event |
| 17095 | `updatePlannerFooterStats()` | Planner footer stats |
| 17124 | `renderPlannerBlocks()` | Alias for renderPlannerTimeline |
| 17125 | `updatePlannerProgress()` | Alias for updatePlannerFooterStats |
| 17126 | `updatePlannerStats()` | Alias for updatePlannerFooterStats |
| 17127 | `addPlannerBlock()` | Focus the new-task input |
| 17128 | `addQuickBreak()` | Add 15-min break block |
| 17143 | `addQuickPomodoro()` | Add 25-min pomodoro block |

---

## Notebook (17661-17920)

| Line | Function | Purpose |
|------|----------|---------|
| 17661 | `openNotebook()` | Open notebook panel |
| 17692 | `closeNotebook()` | Close notebook panel |
| 17723 | `deletePage(pageId)` | Delete a notebook page |
| 17756 | `renderNotebookTabs()` | Render page tabs |
| 17775 | `renderNotebookContent()` | Render active page content |
| 17801 | `handleEditorInput()` | Editor input handler with auto-save |
| 17806 | `handlePaste(event)` | Paste as plain text |
| 17813 | `handleKeyboardShortcuts(e)` | Ctrl+B/I/S shortcuts |
| 17836 | `updateCharCount()` | Character count display |
| 17878 | `saveCurrentPageContent()` | Save editor content to page |
| 17901 | `saveNotebook()` | Persist notebook to state |

---

## Calendar Notes & Med Settings (17912-18090)

| Line | Function | Purpose |
|------|----------|---------|
| 17912 | `handleCalendarDayClick(event, medType, dateStr, displayDate, isRefillDay, totalPills)` | Calendar day click handler |
| 17999 | `openNoteModal(dateStr, displayDate)` | Open note for calendar date |
| 18023 | `closeNoteModal()` | Close note modal |
| 18028 | `saveNote()` | Save calendar note |
| 18048 | `deleteNote()` | Delete calendar note |
| 18060 | `saveMedSettings()` | Save medication settings |
| 18077 | `toggleCalendar(medType)` | Show/hide med calendar |

---

## Task CRUD & Display (18247-18620)

| Line | Function | Purpose |
|------|----------|---------|
| 18247 | `updateCategoryDisplay()` | Update task category filter tabs |
| 18265 | `addTask()` | Create new task from full-view form |
| 18308 | `updateCategoryXPDisplay()` | Update XP per category display |
| 18339 | `renderTasks()` | Render task list (2-row mobile layout) |
| 18451 | `handleDragStart(event, taskId)` | Full-view drag start |
| 18457 | `handleDragOver(event)` | Full-view drag over |
| 18466 | `handleDragLeave(event)` | Full-view drag leave |
| 18473 | `handleDrop(event, targetTaskId)` | Full-view drop handler |
| 18515 | `handleDragEnd(event)` | Full-view drag end cleanup |
| 18524 | `toggleTask(id)` | Toggle task complete (full view) |
| 18581 | `toggleDoToday(id)` | Toggle doToday flag on task |
| 18595 | `deleteTask(id)` | Delete task by ID |

---

## Pomodoro Timer (18618-18690)

| Line | Function | Purpose |
|------|----------|---------|
| 18618 | `startTaskTimer(id)` | Start pomodoro for a specific task |
| 18652 | `startTimer()` | Start the pomodoro countdown |
| 18668 | `pauseTimer()` | Pause pomodoro |
| 18675 | `resetTimer()` | Reset pomodoro to default duration |
| 18686 | `updateTimerDisplay()` | Render timer MM:SS display |

---

## Dashboard Expansions (18745-18920)

| Line | Function | Purpose |
|------|----------|---------|
| 18745 | `toggleDashboardExpansion(type)` | Expand/collapse dashboard section |
| 18767 | `closeAllExpansions()` | Close all dashboard expansions |
| 18778 | `updateDashboardExpansion(type)` | Refresh expanded section content |
| 18855 | `toggleTaskFromDashboard(taskId, expansionType)` | Toggle task from dashboard panel |
| 18861 | `uncompleteTaskFromDashboard(taskId)` | Uncomplete a task from dashboard |
| 18877 | `toggleCompletedTasks()` | Show/hide completed tasks |
| 18881 | `renderCompletedTasks()` | Render completed tasks list |
| 18890 | `updateStats()` | Recalculate XP, totals, level display |

---

## View Switching (18926-18965)

| Line | Function | Purpose |
|------|----------|---------|
| 18926 | `switchToFocusMode()` | Switch to Focus view (sets `currentView = 'focus'`) |
| 18937 | `switchToFullView()` | Switch to Full view (sets `currentView = 'full'`) |
| 18949 | `renderFocusMode()` | Render the Focus view dashboard |
| 18965 | `updateFocusGreeting()` | Time-based greeting in focus view |

---

## Focus Mode Planning (18976-19460)

| Line | Function | Purpose |
|------|----------|---------|
| 18976 | `renderOneThingCard()` | "One Thing" focus card |
| 19047 | `renderMicroSteps()` | Micro-steps checklist |
| 19064 | `addMicroStep()` | Add a micro-step |
| 19078 | `toggleMicroStep(stepId)` | Toggle micro-step complete |
| 19094 | `formatFocusTimer(seconds)` | Format seconds to MM:SS |
| 19102 | `toggleFocusTimer()` | Start/pause the focus timer |
| 19136 | `openOneThingPicker()` | Choose "One Thing" task |
| 19169 | `openAddTasksModal(size)` | Open task planning modal by size |
| 19201 | `renderPlanningTaskOption(task)` | Render task option in planning modal |
| 19270 | `closePlanningModal()` | Close planning modal |
| 19276 | `renderTaskBudget()` | Task budget display |
| 19310 | `updateTimeEstimate(counts)` | Update time estimate based on task sizes |
| 19343 | `quickAddFromFocus()` | Quick-add task from focus view |
| 19379 | `renderBudgetBar(containerId, filled, total, color)` | Budget bar visualization |
| 19390 | `renderTodaysTasks()` | Render today's task list in focus view |
| 19395 | `renderTaskSizeSection(size, containerId)` | Render tasks grouped by size |
| 19454 | `toggleFocusTask(taskId)` | Toggle task from focus view |
| 19459 | `updateBacklogCount()` | Update backlog count badge |
| 19478 | `getCategoryInfo(category)` | Get icon/color for task category |
| 19491 | `escapeHtml(text)` | XSS-safe HTML escaping |
| 19528 | `checkFocusViewWelcome()` | Check if welcome screen should show |
| 19536 | `showFocusViewWelcome()` | Show focus view onboarding |

---

## Command Center Core (19519-19660)

| Line | Function | Purpose |
|------|----------|---------|
| 19519 | `commandCenterMode` (variable) | Current tab: 'triage', 'crashout', 'focus' |
| 19551 | `getCurrentCommandCenterMode()` | Getter for mode |
| 19555 | `switchCommandCenterMode(mode)` | Switch between triage/crashout/focus tabs |
| 19584 | `updateCommandCenterGreeting()` | Update greeting in command center |
| 19604 | `updateOverallProgress()` | Update progress bar across all tasks |

---

## Triage Mode (19662-20330)

| Line | Function | Purpose |
|------|----------|---------|
| 19662 | `getTodayTriageTasks()` | Get all doToday tasks |
| 19667 | `getTasksByTier(tier)` | Filter tasks by tier (lockedIn/ifTime/scheduled) |
| 19687 | `renderTriageMode()` | Render full triage view |
| 19698 | `updateTriageGreeting()` | Triage greeting text |
| 19718 | `renderTriageColumn(tier)` | Render single tier column |
| 19731 | `getEmptyMessage(tier)` | Empty state text per tier |
| 19741 | `renderTaskCard(task, tier)` | Render task card in triage |
| 19774 | `renderScheduledSection()` | Scheduled tasks section |
| 19803 | `renderRolledOverSection()` | Rolled-over tasks section |
| 19838 | `updateAllTriageProgress()` | Refresh all progress bars |
| 19856 | `updateColumnProgress(tier)` | Single column progress |
| 19873 | `toggleTaskComplete(taskId)` | Toggle task complete from triage |
| 19929 | `startFocusSession(taskId)` | Start focus session for a task |
| 19934 | `initTriageDragDrop()` | Initialize triage drag-drop |
| 19945 | `handleColumnDragOver(e)` | Column drag over handler |
| 19951 | `handleColumnDragLeave(e)` | Column drag leave handler |
| 19956 | `handleColumnDrop(e)` | Column drop handler |
| 19970 | `updateTriageSectionCounts()` | Update section task counts |
| 19975 | `completeTriageTask(taskId)` | Complete task from triage |
| 20032 | `setTaskTier(taskId, tier)` | Set task tier (lockedIn/ifTime) |
| 20057 | `sendToCrashOut(taskId)` | Move task to crash-out scheduled tier |
| 20117 | `recalculateScheduledTimes()` | Recalculate all scheduled times based on order |
| 20137 | `removeFromCrashOut(taskId)` | Remove task from crash-out schedule |
| 20176 | `triageQuickAddTask()` | Quick-add task from triage view |
| 20207 | `handleTriageDragStart(event, taskId)` | Triage drag start |
| 20214 | `handleTriageDragOver(event)` | Triage drag over |
| 20222 | `handleTriageDragLeave(event)` | Triage drag leave |
| 20227 | `handleTriageDrop(event, targetTaskId, targetTier)` | Triage drop |
| 20246 | `handleTriageDragEnd(event)` | Triage drag end |
| 20253 | `reorderTriageTasks(draggedId, targetId, tier)` | Reorder within tier |
| 20278 | `handleSectionDragOver(event, tier)` | Section-level drag over |
| 20286 | `handleSectionDragLeave(event)` | Section-level drag leave |
| 20291 | `handleSectionDrop(event, targetTier)` | Drop onto section header (tier change) |
| 20334 | `showTaskDetailsModal(taskId)` | Task detail popup in triage |
| 20402 | `closeTaskDetailsModal()` | Close task detail popup |

---

## Time Prompts (20429-20670)

| Line | Function | Purpose |
|------|----------|---------|
| 20429 | `lastPromptedTaskId` (variable) | Prevents duplicate prompts |
| 20430 | `dismissedUntil` (variable) | 3-min cooldown map: `{ taskId: timestamp }` |
| 20432 | `startTimePromptChecker()` | Start 30s interval for time checks |
| 20437 | `checkForTimePrompts()` | Find task due now, show prompt |
| 20494 | `showTimePrompt(task)` | Render time prompt modal |
| 20533 | `startTaskFromPrompt(taskId)` | Start task from prompt (auto-starts timer) |
| 20540 | `closeTimePrompt()` | Close prompt modal |
| 20551 | `pushAllTasks(minutes)` | Push all scheduled times forward |
| 20592 | `showCascadeAnimation()` | Visual cascade feedback |
| 20603 | `showUndoToast(minutes)` | Undo toast for push |
| 20659 | `skipTask(taskId)` | Dismiss prompt (3-min cooldown) |
| 20666 | `removeTaskFromSchedule(taskId)` | Remove task from crash-out schedule |

---

## Crash Out Mode (20674-21145)

| Line | Function | Purpose |
|------|----------|---------|
| 20675 | `crashOutTimelineInterval` (variable) | Full rebuild interval ID |
| 20676 | `nowTimeInterval` (variable) | NOW text update interval ID |
| 20679 | `startCrashOutTimelineInterval()` | Start dual intervals (60s + 15s) |
| 20692 | `stopCrashOutTimelineInterval()` | Clear both intervals |
| 20703 | `renderCrashOutMode()` | Render setup or timeline |
| 20722 | `updateCrashOutSetupDate()` | Show current date/time on setup screen |
| 20735 | `setCrashOutSleep(option)` | Set sleep time from preset |
| 20760 | `showCustomSleepPicker()` | Show custom time picker |
| 20765 | `hideCustomSleepPicker()` | Hide custom time picker |
| 20770 | `setCustomSleepTime()` | Set sleep time from custom input |
| 20801 | `changeSleepTime()` | Reset sleep time (back to setup) |
| 20807 | `adjustSleepTime(minutesDelta)` | Adjust sleep +/- minutes (cascade: recalculate + render + save) |
| 20830 | `renderCrashOutTimeline()` | Full Google-Calendar-style timeline render |
| 20954 | `renderCrashOutTimelineTasks(scheduledTasks, now, sleepTime, windDownStart)` | Render task blocks on timeline |
| 21133 | `updateNowMarkerTime()` | Lightweight NOW marker text refresh |

---

## Timeline Drag & Drop (21145-21200)

| Line | Function | Purpose |
|------|----------|---------|
| 21145 | `isReorderingLocked` (variable) | Reorder lock flag |
| 21147 | `handleTimelineDragStart(event, taskId)` | Timeline drag start |
| 21158 | `handleTimelineDragOver(event)` | Timeline drag over |
| 21168 | `handleTimelineDragLeave(event)` | Timeline drag leave |
| 21176 | `handleTimelineDrop(event, targetTaskId)` | Timeline drop |
| 21194 | `handleTimelineDragEnd(event)` | Timeline drag end cleanup |

---

## Reordering Functions (21203-21530)

| Line | Function | Purpose |
|------|----------|---------|
| 21203 | `moveTaskToPosition(draggedId, targetId)` | INSERT logic: remove + insert at target |
| 21265 | `reorderTimelineTasks(draggedId, targetId)` | Legacy alias for moveTaskToPosition |
| 21270 | `swapAdjacentTasks(taskId1, taskId2)` | SWAP logic for up/down buttons |
| 21327 | `moveTaskUp(taskId)` | Move task one position up |
| 21345 | `moveTaskDown(taskId)` | Move task one position down |
| 21364 | `moveTaskToTop(taskId)` | Move task to first position |
| 21386 | `moveTaskToBottom(taskId)` | Move task to last position |
| 21423 | `setTaskPosition(taskId, newPosition)` | Set exact 1-indexed position |
| 21444 | `promptTaskPosition(taskId)` | Prompt user for position number |
| 21485 | `parseCrashOutTime(timeStr)` | Parse "HH:MM AM/PM" to Date object |
| 21510 | `setDurationDirect(taskId, newDuration)` | Set task duration + cascade recalculate |
| 21524 | `renderUnscheduledPool()` | Render unscheduled tasks pool |
| 21560 | `openDurationModal(taskId)` | Duration picker modal |
| 21614 | `setDuration(taskId, duration)` | Set duration from modal |
| 21627 | `closeDurationModal()` | Close duration modal |

---

## Window Exposures (21463-21475)

These functions are registered on `window` for onclick handlers in dynamically generated HTML:

| Line | Exposed As |
|------|------------|
| 21463 | `window.moveTaskUp` |
| 21464 | `window.moveTaskDown` |
| 21465 | `window.moveTaskToTop` |
| 21466 | `window.moveTaskToBottom` |
| 21467 | `window.promptTaskPosition` |
| 21468 | `window.swapAdjacentTasks` |
| 21469 | `window.moveTaskToPosition` |
| 21470 | `window.setTaskPosition` |
| 21471-21475 | `window.handleTimeline*` (5 drag handlers) |
| 20828 | `window.adjustSleepTime` |
| 17455 | `window.debugSyncStatus` |
| 17476 | `window.resetSyncPin` |

---

## Focus Pomodoro Mode (21681-22100)

| Line | Function | Purpose |
|------|----------|---------|
| 21684 | `currentFocusTaskId` (variable) | Currently focused task ID |
| 21686 | `renderFocusPomodoroMode()` | Render focus tab content |
| 21704 | `startTaskInFocus(taskId, autoStartTimer)` | Begin focus session on task |
| 21740 | `renderActiveSession()` | Render active focus session UI |
| 21763 | `updateFocusTimerDisplay()` | Update timer display in focus mode |
| 21827 | `startFocusTimer()` | Start focus countdown |
| 21846 | `pauseFocusTimer()` | Pause focus countdown |
| 21857 | `resumeFocusTimer()` | Resume focus countdown |
| 21861 | `setFocusDuration(minutes)` | Set focus duration |
| 21900 | `showFocusCompleteModal()` | Show task complete modal |
| 21961 | `completeFocusTask()` | Complete current focus task |
| 21967 | `completeFocusTaskFromModal()` | Complete from modal |
| 22004 | `hideFocusCompleteModal()` | Hide complete modal |
| 22031 | `renderFocusChecklist()` | Focus session checklist |
| 22068 | `addFocusChecklistItem()` | Add checklist item |
| 22087 | `toggleFocusChecklistItem(itemId)` | Toggle checklist item |
| 22095 | `deleteFocusChecklistItem(itemId)` | Delete checklist item |

---

## Gamification & Streaks (22103-22350)

| Line | Function | Purpose |
|------|----------|---------|
| 22105 | `awardCommandCenterXP(amount, reason)` | Award XP with toast |
| 22154 | `showCelebration(size)` | Confetti animation |
| 22182 | `showCompletionMessage()` | All-tasks-done message |
| 22190 | `updateStreakBadge()` | Refresh streak badge display |
| 22213 | `adjustFocusTimer(seconds)` | Manually adjust focus timer |
| 22220 | `skipFocusTask()` | Skip current focus task |
| 22226 | `checkAndProcessRollovers()` | Process midnight task rollovers |
| 22263 | `checkForPerfectDay()` | Check if all tasks done today |
| 22280 | `showPerfectDayBadge()` | Show perfect day celebration |
| 22305 | `updateStreaks()` | Calculate and update streak count |

---

## Task Edit & Init (22350-22470)

| Line | Function | Purpose |
|------|----------|---------|
| 22355 | `openTaskEditModal(taskId)` | Open task edit dialog |
| 22376 | `closeTaskEditModal()` | Close task edit dialog |
| 22386 | `updateSizeSelection()` | Update size picker UI |
| 22394 | `toggleLeverage()` | Toggle leverage flag |
| 22399 | `updateLeverageToggle()` | Update leverage toggle UI |
| 22407 | `saveTaskEdit()` | Save task edits |
| 22429 | `initFocusMode()` | Initialize focus mode on load |
| 22464 | `handleResponsiveLayout()` | Window resize handler |

---

## Quick Add Panel & Compact Header (22533-22700, second script block)

| Line | Function | Purpose |
|------|----------|---------|
| 22533 | `openQuickAddPanel()` | Open quick-add FAB panel |
| 22540 | `closeQuickAddPanel()` | Close quick-add panel |
| 22562 | `toggleQADoToday()` | Toggle doToday in quick add |
| 22567 | `toggleQALeverage()` | Toggle leverage in quick add |
| 22572 | `submitQuickAdd()` | Submit quick-add task |
| 22600 | `initQuickAddPanel()` | Initialize quick-add event listeners |
| 22612 | `toggleHeaderMenu()` | Toggle compact header menu |
| 22622 | `updateSyncDot(status)` | Update header sync indicator dot |
| 22632 | `updateMenuStats()` | Update stats in header menu |
| 22643 | `updateCompactHeader()` | Refresh compact header content |
