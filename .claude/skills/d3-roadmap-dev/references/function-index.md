# Complete Function Index

All line numbers verified against d3-roadmap.html (17,575 lines, Feb 14 2026).

## State & Defaults (~8465-8549)
| Function | Line | Description |
|----------|------|-------------|
| `getDefaultRoadmapData()` | ~8465 | Returns fresh default roadmapData |
| `isEmptyState(data)` | ~8526 | Check if data has real user content |
| `hasRealData(data)` | ~8551 | Additional data validation |

## Sync Infrastructure (~9114-9440)
| Function | Line | Description |
|----------|------|-------------|
| `updateSyncStatus(status, text)` | ~9114 | Update sync indicator UI |
| `deepMerge(target, source)` | ~9148 | Deep merge objects |
| `setupConnectionMonitor()` | ~9169 | Firebase connection monitor |
| `createBackup(reason)` | ~9198 | Auto-backup to localStorage |
| `getBackups()` | ~9244 | List backups |
| `restoreBackup(backupId)` | ~9254 | Restore from backup |
| `exportBackup()` | ~9279 | Export backup as file |
| `importBackup(file)` | ~9299 | Import backup from file |
| `showBackupManager()` | ~9330 | Backup manager modal |
| `markLocalChange()` | ~9389 | Mark that local changes exist |
| `setLocalUpdateFlag()` | ~9393 | Prevent realtime echo |
| `showSyncConflictModal(local, remote, onResolve)` | ~9403 | Conflict resolution |

## Firebase Auth & Init (~9440-9530)
| Function | Line | Description |
|----------|------|-------------|
| `initFirebase()` | ~9440 | Firebase init with 3s fallback |
| `setupUserAuth(pin)` | ~9488 | PIN -> hashedPin -> userPath |
| `promptForPin()` | ~9504 | PIN entry prompt |

## Utilities (~9519-9710)
| Function | Line | Description |
|----------|------|-------------|
| `ensureArray(val, fallback)` | ~9519 | Ensure value is array |
| `generateId(prefix)` | ~9530 | Generate unique ID |
| `getValues(obj)` | ~9537 | Safe Object.values() |
| `sanitizeFirebaseKey(key)` | ~9547 | Clean invalid Firebase chars |
| `getDeadlineId(deadline)` | ~9551 | Stable deadline ID |
| `sanitizeFirebaseData(obj)` | ~9560 | Recursively sanitize keys |
| `migrateInvalidFirebaseKeys(data)` | ~9573 | Fix legacy invalid keys |
| `getCount(obj)` | ~9605 | Safe count for objects/arrays |
| `migrateArrayToObject(data, prefix)` | ~9612 | Convert arrays to objects |
| `migrateCompetencies(competencies)` | ~9637 | Migrate competency storage |
| `mergeCompetencies(local, cloud)` | ~9708 | Merge competency data |
| `migrateDailyPlannerBlocks(planner)` | ~9719 | Migrate planner blocks |

## Load & Sync (~9757-10090)
| Function | Line | Description |
|----------|------|-------------|
| `loadFromLocalStorage(finalize)` | ~9757 | Load from localStorage |
| `loadFromFirebase()` | ~9817 | Load from Firebase |
| `setupRealtimeSync()` | ~9906 | Realtime cross-device listener |
| `setupMainAppTasksSync()` | ~10031 | Sync main app tasks |
| `updateDoTodaySyncStatus(status, msg)` | ~10064 | Main app sync status |
| `renderDoTodayTasks()` | ~10081 | Render synced main app tasks |
| `toggleMainAppTask(taskId)` | ~10145 | Toggle main app task |

## Cloud Sync (~10190-10310)
| Function | Line | Description |
|----------|------|-------------|
| `forceCloudSync()` | ~10190 | Force sync operation |
| `applyRemoteData(data)` | ~10264 | Apply remote data to local state |

## Checkpoints (~10308-10840)
| Function | Line | Description |
|----------|------|-------------|
| `getCheckpointKey()` | ~10308 | localStorage key for checkpoints |
| `getDataCountForCheckpoint(data)` | ~10313 | Count data items |
| `createCheckpoint(customName)` | ~10323 | Save checkpoint |
| `showCheckpointManager()` | ~10377 | Checkpoint list modal |
| `escapeHtmlForCheckpoint(text)` | ~10454 | Escape HTML |
| `restoreCheckpoint(index)` | ~10460 | Restore from checkpoint |
| `deleteCheckpoint(index)` | ~10537 | Delete checkpoint |
| `exportCheckpoint(index)` | ~10561 | Export single checkpoint |
| `exportAllCheckpoints()` | ~10578 | Export all checkpoints |
| `isValidAppData(data)` | ~10606 | Validate import data |
| `importCheckpoint()` | ~10622 | Import checkpoint file |
| `importAndRestoreDirectly()` | ~10735 | Direct file restore |

## Force Upload/Pull (~10837-10990)
| Function | Line | Description |
|----------|------|-------------|
| `forceUploadToCloud()` | ~10837 | Bypass guards, push to Firebase |
| `forcePullFromCloud()` | ~10929 | Bypass guards, pull from Firebase |

## Save (~10990-11120)
| Function | Line | Description |
|----------|------|-------------|
| `saveData()` | ~10992 | Main save (5 guards + localStorage + Firebase) |

## Date/Time Utilities (~11195-11240)
| Function | Line | Description |
|----------|------|-------------|
| `getLocalDateString(date)` | ~11195 | Local YYYY-MM-DD |
| `parseLocalDate(dateStr)` | ~11200 | Parse YYYY-MM-DD locally |
| `getCountdown(dateStr)` | ~11206 | Days until date |
| `getCountdownBadge(days, isTbd)` | ~11214 | Countdown badge HTML |
| `formatDate(dateStr)` | ~11233 | Human-readable date |

## Tab Navigation (~11239-11290)
| Function | Line | Description |
|----------|------|-------------|
| `switchTab(tabId, evt)` | ~11239 | Main tab switcher |
| `toggleLegacyContent()` | ~11264 | Toggle legacy content |
| `toggleCourse(courseId)` | ~11280 | Expand/collapse course |
| `toggleMandatory(itemId)` | ~11289 | Toggle mandatory checkbox |

## Dashboard (~11307-11580)
| Function | Line | Description |
|----------|------|-------------|
| `renderDashboard()` | ~11307 | Main dashboard render |
| `renderDeadlineItems(items, msg)` | ~11341 | Deadline items in dashboard |
| `renderClinicalDashboardWidget()` | ~11410 | Clinical progress widget |
| `renderStudyProgressWidget()` | ~11500 | Study progress widget |

## Deadlines (~11581-11800)
| Function | Line | Description |
|----------|------|-------------|
| `renderDeadlines()` | ~11581 | Full deadlines tab |
| `handleDateChange(inputEl)` | ~11672 | Inline date editing |
| `handleTextEdit(inputEl)` | ~11735 | Inline text editing |
| `handleDeadlineKeydown(event, inputEl)` | ~11788 | Keyboard handler |
| `escapeHtml(str)` | ~11799 | XSS protection |

## Exam Countdown (~11809-11910)
| Function | Line | Description |
|----------|------|-------------|
| `renderExamCountdown()` | ~11809 | Exam countdown display |

## Grades (~11909-12200)
| Function | Line | Description |
|----------|------|-------------|
| `loadCourseGrades()` | ~11909 | Grade calculator UI |
| `updateGrade(courseId, componentId, value)` | ~12005 | Save grade entry |
| `syncGradeToDeadline(courseId, componentId, grade)` | ~12020 | Grade -> deadline sync |
| `calculateNeeded()` | ~12104 | "What do I need" calculator |
| `getGradeLetter(percent)` | ~12198 | Percentage to letter grade |

## UI Helpers (~12212-12260)
| Function | Line | Description |
|----------|------|-------------|
| `showToast(message)` | ~12212 | Toast notification |
| `showCustomAlert(msg, title, callback)` | ~12220 | Custom alert modal |
| `showCustomConfirm(msg, onConfirm, onCancel, title)` | ~12238 | Custom confirm modal |

## Deadline CRUD (~12259-12800)
| Function | Line | Description |
|----------|------|-------------|
| `addNewDeadline()` | ~12259 | Show add deadline modal |
| `submitNewDeadline()` | ~12332 | Save new custom deadline |
| `toggleDeadlineDone(index)` | ~12396 | Toggle completion by index |
| `toggleDeadlineDoneById(deadlineId)` | ~12439 | Toggle completion by ID |
| `deleteDeadlineById(deadlineId)` | ~12450 | Delete by ID |
| `showGradeInputModal(index, deadline)` | ~12460 | Grade entry modal |
| `submitDeadlineGradeById()` | ~12500 | Submit grade by ID |
| `submitDeadlineGrade(index)` | ~12514 | Submit grade by index |
| `syncDeadlineToGrades(d, isComplete, grade)` | ~12563 | Deadline -> grade sync |
| `deleteDeadline(index)` | ~12681 | Delete deadline |

## Exam Content (~12797-13230)
| Function | Line | Description |
|----------|------|-------------|
| `loadExamCourseContent()` | ~12797 | Exam study tracker UI |
| `getTotalTopicsForCourse(courseKey)` | ~13129 | Count topics |
| `getCourseStudyProgress(courseKey)` | ~13140 | Study progress stats |
| `getDaysUntil(dateStr)` | ~13164 | Days until exam |
| `formatExamDate(dateStr)` | ~13174 | Format exam date |
| `getExamProgress(examId, lectures, review)` | ~13179 | Per-exam progress |
| `toggleLectureStudied(examId, lecNum, isReview)` | ~13212 | Toggle lecture studied |
| `markAllStudied(examId, lectures, isReview, markAs)` | ~13219 | Mark all studied |
| `toggleContentSection(sectionId)` | ~13228 | Expand/collapse section |
| `renderExamCard(exam)` | ~13237 | Render single exam card |
| `renderLectureList(examId, lectures, isReview)` | ~13498 | Render lecture list |

## Clinical Tab (~13535-13870)
| Function | Line | Description |
|----------|------|-------------|
| `switchClinicalSubtab(subtab, btn)` | ~13535 | Clinical sub-tab navigation |
| `initClinicalTab()` | ~13546 | Initialize clinical tab |
| `updateClinicalStats()` | ~13553 | Update clinical statistics |
| `renderPatientsList()` | ~13588 | Render patients list |
| `filterPatients()` | ~13682 | Filter patients |
| `openAddPatientModal()` | ~13686 | Add patient modal |
| `editPatient(patientId)` | ~13708 | Edit patient |
| `closePatientModal()` | ~13733 | Close patient modal |
| `addPatientTask()` | ~13738 | Add patient task |
| `removePatientTask(taskId)` | ~13747 | Remove patient task |
| `updatePatientTask(taskId, field, value)` | ~13755 | Update patient task |
| `renderPatientTasksInModal()` | ~13762 | Render tasks in modal |
| `savePatient()` | ~13784 | Save patient |
| `deletePatient()` | ~13837 | Delete patient |
| `renderAppointmentsList()` | ~13865 | Render appointments |
| `renderAppointmentCard(apt, patients)` | ~13911 | Single appointment card |
| `formatAptTime(time)` | ~13944 | Format appointment time |
| `openAddAppointmentModal(preselected)` | ~13952 | Add appointment modal |
| `editAppointment(aptId)` | ~13977 | Edit appointment |
| `closeAppointmentModal()` | ~14004 | Close appointment modal |
| `saveAppointment()` | ~14008 | Save appointment |
| `deleteAppointment()` | ~14089 | Delete appointment |

## Competencies (~14128-14990)
| Function | Line | Description |
|----------|------|-------------|
| `getCompetenciesData()` | ~14372 | Get/initialize competencies |
| `getItemStatus(item)` | ~14396 | Determine item status |
| `calculateCategoryStats(cat)` | ~14405 | Single category stats |
| `calculateOverallStats(competencies)` | ~14429 | All categories stats |
| `getWhatsNextItems(competencies)` | ~14456 | Top 5 next items |
| `renderCompetencies()` | ~14480 | Full competencies UI |
| `toggleCompCategory(key)` | ~14639 | Expand/collapse category |
| `setCompItemStatus(catKey, itemId, status)` | ~14658 | Set item status |
| `adjustCompItem(catKey, itemId, delta)` | ~14706 | Adjust completed count |
| `updateCompNotes(catKey, notes)` | ~14751 | Update category notes |
| `showCompMilestone(itemText)` | ~14760 | Show celebration |
| `resetCompetencies()` | ~14777 | Reset to defaults |
| `openAddCompItemModal(catKey, sectionId)` | ~14799 | Add item modal |
| `openEditCompItemModal(catKey, itemId)` | ~14816 | Edit item modal |
| `closeCompItemModal()` | ~14854 | Close item modal |
| `saveCompItem()` | ~14859 | Save competency item |
| `deleteCompItem(catKey, itemId)` | ~14945 | Delete item |

## Import Systems (~14989-15520)
| Function | Line | Description |
|----------|------|-------------|
| `openLectureImportModal()` | ~14989 | Lecture import modal |
| `closeLectureImportModal()` | ~14997 | Close lecture import |
| `parseLectureFormat(text)` | ~15001 | Parse lecture text |
| `parseLectureBlock(block)` | ~15042 | Parse single lecture block |
| `parseImportDate(dateStr)` | ~15073 | Parse imported date |
| `parseImportTime(timeStr)` | ~15095 | Parse imported time |
| `previewLectureImport()` | ~15125 | Preview lecture import |
| `formatTime12h(time24)` | ~15153 | 24h to 12h conversion |
| `confirmLectureImport()` | ~15161 | Confirm lecture import |
| `openClinicalImportModal()` | ~15238 | Clinical import modal |
| `closeClinicalImportModal()` | ~15246 | Close clinical import |
| `parseClinicalFormat(text)` | ~15250 | Parse clinical text |
| `parseAppointmentBlock(block)` | ~15292 | Parse appointment block |
| `previewClinicalImport()` | ~15317 | Preview clinical import |
| `confirmClinicalImport()` | ~15346 | Confirm clinical import |
| `syncClinicalToMonthlyPlanner()` | ~15457 | Sync clinical to monthly |
| `calculateEndTime(start, duration)` | ~15503 | Calculate end time |
| `timeToMinutes(timeStr)` | ~15515 | Convert time to minutes |

## Initialization (~15524-15870)
| Function | Line | Description |
|----------|------|-------------|
| `initUI()` | ~15524 | Main UI init (merge deadlines, restore state) |
| `init()` | ~15747 | App entry point |

## Daily Planner (~15871-16445)
| Function | Line | Description |
|----------|------|-------------|
| `initDailyPlanner()` | ~15871 | Initialize daily planner |
| `dpStartClock()` | ~15907 | Start clock |
| `dpUpdateCurrentTimeLine()` | ~15959 | Current time indicator |
| `dpSelectPomodoro(work, break, el)` | ~15983 | Pomodoro preset |
| `dpStartTimer()` | ~15993 | Start timer |
| `dpPauseTimer()` | ~16009 | Pause timer |
| `dpResetTimer()` | ~16016 | Reset timer |
| `dpUpdateTimerDisplay()` | ~16027 | Update timer UI |
| `dpCompleteSession()` | ~16036 | Complete pomodoro |
| `dpPlayNotification()` | ~16070 | Play sound |
| `dpPopulateDeadlineDropdown()` | ~16092 | Deadline picker |
| `dpSelectFromDropdown()` | ~16150 | Select deadline |
| `dpSetTimeToNow()` | ~16163 | Set time to now |
| `dpSelectDuration(duration)` | ~16178 | Duration preset |
| `dpAddEvent()` | ~16189 | Add event block |
| `dpRenderTimeline()` | ~16240 | Render timeline |
| `dpRenderEvent(block)` | ~16286 | Render event block |
| `dpFormatTime(timeStr)` | ~16319 | Format time |
| `dpQuickAddAtHour(hour)` | ~16327 | Quick add at hour |
| `dpToggleEvent(blockId)` | ~16339 | Toggle event |
| `dpDeleteEvent(blockId)` | ~16349 | Delete event |
| `dpUpdateStats()` | ~16359 | Update stats |
| `dpScrollToNow()` | ~16380 | Scroll to now |
| `dpClearDay()` | ~16393 | Clear day |
| `saveDailyPlannerData()` | ~16420 | Save planner data |

## Monthly Planner (~16445-17510)
| Function | Line | Description |
|----------|------|-------------|
| `extendWeeksIfNeeded()` | ~16445 | Generate week definitions |
| `formatDateYMD(date)` | ~16526 | Format date YYYY-MM-DD |
| `initMonthlyPlanner()` | ~16577 | Initialize monthly planner |
| `mpToggleTaskComplete(taskId)` | ~16622 | Toggle task completion |
| `mpRenderAllCalendars()` | ~16651 | Render all calendars |
| `mpCreateWeekSection(week)` | ~16663 | Create week section |
| `mpToggleWeek(weekNum)` | ~16715 | Expand/collapse week |
| `mpExpandAllWeeks()` | ~16726 | Expand all |
| `mpCollapseAllWeeks()` | ~16735 | Collapse all |
| `mpJumpToCurrentWeek()` | ~16744 | Jump to current |
| `mpGetDaysOut(startDate)` | ~16763 | Days remaining |
| `mpCreateCalendarGrid(week)` | ~16773 | Calendar grid |
| `mpGetWeekDays(start, end)` | ~16864 | Week days |
| `mpGetWeekTasks(week)` | ~16885 | Week tasks |
| `mpCreateTaskBlock(task, week, ...)` | ~16926 | Task block |
| `mpFormatTime(time)` | ~17010 | Format time |
| `mpCreateUntimedSection(week)` | ~17018 | Untimed section |
| `mpOpenAddModal(weekNum)` | ~17085 | Add task modal |
| `mpClickCell(date, hour, weekNum)` | ~17108 | Cell click handler |
| `mpEditTaskFromBlock(taskId, week, isStatic)` | ~17132 | Edit from block |
| `mpEditTask(taskId, weekNum)` | ~17189 | Edit task |
| `mpCloseTaskModal()` | ~17193 | Close modal |
| `mpSaveTask()` | ~17199 | Save task |
| `mpDeleteCurrentTask()` | ~17293 | Delete task |
| `mpUpdateStats()` | ~17322 | Update stats |
| `mpAddNote()` | ~17372 | Add note |
| `mpRenderNotes()` | ~17404 | Render notes |
| `mpEditNote(noteId)` | ~17447 | Edit note |
| `mpCancelNoteEdit(noteId)` | ~17475 | Cancel edit |
| `mpSaveNoteEdit(noteId)` | ~17479 | Save edit |
| `mpDeleteNote(noteId)` | ~17509 | Delete note |

**Total: ~218 functions across 17,575 lines**
