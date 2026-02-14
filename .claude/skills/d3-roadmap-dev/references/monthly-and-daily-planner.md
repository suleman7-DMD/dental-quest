# Monthly and Daily Planner Systems

## Daily Planner

### Overview
The Daily Planner tab provides a timeline-based day view with a Pomodoro timer, event blocks, and integration with deadlines.

### Data Structure
```javascript
roadmapData.dailyPlanner = {
    date: null,                    // Current planner date (YYYY-MM-DD)
    focus: '',                     // Day's focus text
    notes: '',                     // General notes
    blocks: {},                    // Time blocks keyed by generateId('block')
    pomodorosCompleted: 0,         // Pomodoro session count
    bedtime: '23:00'               // Target bedtime
};
```

### Block Shape
```javascript
{
    id: 'block_1707400000000_abc123',
    title: 'Study Peds Exam 2',
    startTime: '09:00',           // 24h format
    duration: 60,                  // Minutes
    completed: false,
    linkedDeadline: null,          // Optional deadline reference
    color: '#3b82f6'               // Optional custom color
}
```

### Key Functions

| Function | Line | Description |
|----------|------|-------------|
| `initDailyPlanner()` | ~15871 | Initialize planner UI, clock, timeline |
| `dpStartClock()` | ~15907 | Start real-time clock display |
| `dpUpdateCurrentTimeLine()` | ~15959 | Red "now" line on timeline |
| `dpSelectPomodoro(work, break, el)` | ~15983 | Select pomodoro preset |
| `dpStartTimer()` | ~15993 | Start pomodoro timer |
| `dpPauseTimer()` | ~16009 | Pause timer |
| `dpResetTimer()` | ~16016 | Reset timer |
| `dpUpdateTimerDisplay()` | ~16027 | Update timer UI |
| `dpCompleteSession()` | ~16036 | Complete a pomodoro session |
| `dpPlayNotification()` | ~16070 | Play completion sound |
| `dpPopulateDeadlineDropdown()` | ~16092 | Populate deadline picker |
| `dpSelectFromDropdown()` | ~16150 | Select deadline for block |
| `dpSetTimeToNow()` | ~16163 | Set block start to current time |
| `dpSelectDuration(duration)` | ~16178 | Select block duration preset |
| `dpAddEvent()` | ~16189 | Add event block to timeline |
| `dpRenderTimeline()` | ~16240 | Render timeline with blocks |
| `dpRenderEvent(block)` | ~16286 | Render single event block |
| `dpFormatTime(timeStr)` | ~16319 | Format time for display |
| `dpQuickAddAtHour(hour)` | ~16327 | Quick-add block at specific hour |
| `dpToggleEvent(blockId)` | ~16339 | Toggle block completion |
| `dpDeleteEvent(blockId)` | ~16349 | Delete event block |
| `dpUpdateStats()` | ~16359 | Update planner statistics |
| `dpScrollToNow()` | ~16380 | Scroll timeline to current time |
| `dpClearDay()` | ~16393 | Clear all blocks for the day |
| `saveDailyPlannerData()` | ~16420 | Save planner state |

### Save Pattern
`saveDailyPlannerData()` at ~16420 saves `roadmapData.dailyPlanner` via `saveData()`.

---

## Monthly Planner

### Overview
The Monthly Planner tab provides a week-based calendar grid view of the semester. It shows static deadlines from STATIC_DEADLINES plus custom tasks, with week-by-week expand/collapse.

### Data Structure
```javascript
roadmapData.monthlyPlanner = {
    notes: {},                     // Notes keyed by generateId('note')
    customTasks: {},               // Custom tasks keyed by generateId('task')
    overriddenStatic: {},          // Overrides to static tasks
    completedTasks: {}             // Task completion tracking { taskId: true }
};
```

### Custom Task Shape
```javascript
{
    id: 'task_1707400000000_abc123',
    title: 'Study Group Meeting',
    date: '2026-02-15',
    startTime: '14:00',           // Optional
    endTime: '16:00',             // Optional
    type: 'other',                // clinic | exam | academic | life | mandatory | other
    notes: '',
    weekNum: 3                    // Which week this belongs to
}
```

### Note Shape
```javascript
{
    id: 'note_1707400000000_def456',
    text: 'Remember to bring lab models',
    createdAt: '2026-02-10T10:00:00Z',
    weekNum: null                  // Global note if null
}
```

### Week Structure
The planner divides the semester into weeks. `extendWeeksIfNeeded()` at ~16445 dynamically generates week definitions based on the semester date range.

### Key Functions

| Function | Line | Description |
|----------|------|-------------|
| `initMonthlyPlanner()` | ~16577 | Initialize monthly planner |
| `mpToggleTaskComplete(taskId)` | ~16622 | Toggle task completion |
| `mpRenderAllCalendars()` | ~16651 | Render all week calendars |
| `mpCreateWeekSection(week)` | ~16663 | Create collapsible week section |
| `mpToggleWeek(weekNum)` | ~16715 | Expand/collapse week |
| `mpExpandAllWeeks()` | ~16726 | Expand all weeks |
| `mpCollapseAllWeeks()` | ~16735 | Collapse all weeks |
| `mpJumpToCurrentWeek()` | ~16744 | Jump to current week |
| `mpGetDaysOut(startDate)` | ~16763 | Calculate days remaining |
| `mpCreateCalendarGrid(week)` | ~16773 | Create calendar grid for week |
| `mpGetWeekDays(start, end)` | ~16864 | Get days in a week range |
| `mpGetWeekTasks(week)` | ~16885 | Get tasks for a week |
| `mpCreateTaskBlock(task, weekNum, ...)` | ~16926 | Render task block in grid |
| `mpFormatTime(time)` | ~17010 | Format time for display |
| `mpCreateUntimedSection(week)` | ~17018 | Section for tasks without times |
| `mpOpenAddModal(weekNum)` | ~17085 | Open add task modal |
| `mpClickCell(date, hour, weekNum)` | ~17108 | Click on calendar cell |
| `mpEditTaskFromBlock(taskId, weekNum, isStatic)` | ~17132 | Edit task from block click |
| `mpEditTask(taskId, weekNum)` | ~17189 | Edit existing task |
| `mpCloseTaskModal()` | ~17193 | Close task modal |
| `mpSaveTask()` | ~17199 | Save task (create or update) |
| `mpDeleteCurrentTask()` | ~17293 | Delete current task |
| `mpUpdateStats()` | ~17322 | Update planner statistics |
| `mpAddNote()` | ~17372 | Add a note |
| `mpRenderNotes()` | ~17404 | Render notes section |
| `mpEditNote(noteId)` | ~17447 | Edit existing note |
| `mpCancelNoteEdit(noteId)` | ~17475 | Cancel note edit |
| `mpSaveNoteEdit(noteId)` | ~17479 | Save note edit |
| `mpDeleteNote(noteId)` | ~17509 | Delete note |
| `extendWeeksIfNeeded()` | ~16445 | Generate week definitions |
| `formatDateYMD(date)` | ~16526 | Format date as YYYY-MM-DD |

### Task Types
Monthly planner tasks can be: `clinic`, `exam`, `academic`, `life`, `mandatory`, `other`.

### Clinical Integration
`syncClinicalToMonthlyPlanner()` at ~15457 syncs clinical appointments to the monthly planner view, creating corresponding task blocks.

### Save Pattern
All monthly planner mutations save via `saveData()` which handles both localStorage and Firebase persistence.
