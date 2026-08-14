// monthly-planner.js — Calendar grid, weeks, task CRUD, notes, keyboard shortcuts

// ==================== MONTHLY PLANNER FUNCTIONS ====================

// Week definitions (Mon-Sun)
// D4 rebase (Aug 2026): weeks are seeded at runtime — 6 weeks starting Monday of
// the current week — then extended dynamically by extendWeeksIfNeeded(). The old
// hardcoded Jan–Feb 2026 D3 weeks are gone.
let MP_WEEKS = (function() {
    const weekColors = ['#059669', '#7c3aed', '#0ea5e9', '#8b5cf6', '#06b6d4'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(monday.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
    const weeks = [];
    for (let i = 0; i < 6; i++) {
        const start = new Date(monday);
        start.setDate(start.getDate() + i * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const label = start.getMonth() === end.getMonth()
            ? `WEEK ${i + 1}: ${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}`
            : `WEEK ${i + 1}: ${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`;
        weeks.push({
            num: i + 1,
            start: formatDateYMD(start),
            end: formatDateYMD(end),
            label: label,
            color: weekColors[start.getMonth() % weekColors.length]
        });
    }
    return weeks;
})();

// Dynamic week extension - adds weeks beyond Feb 22 as needed
function extendWeeksIfNeeded() {
    // Get all dates from custom tasks and clinical appointments
    const allDates = [];

    // From Monthly Planner tasks
    if (roadmapData.monthlyPlanner?.customTasks) {
        getValues(roadmapData.monthlyPlanner.customTasks).forEach(task => {
            if (task.date) allDates.push(task.date);
        });
    }

    // From Clinical appointments
    if (roadmapData.clinicalData?.appointments) {
        getValues(roadmapData.clinicalData.appointments).forEach(apt => {
            if (apt.date && apt.status !== 'cancelled') allDates.push(apt.date);
        });
    }

    // From D4 events (rotations, didactics, mock sims, INBDE, ADEX)
    if (roadmapData.d4Events) {
        getValues(roadmapData.d4Events).forEach(ev => {
            if (ev.startDate) allDates.push(ev.startDate);
            if (ev.endDate) allDates.push(ev.endDate);
        });
    }

    if (allDates.length === 0) return;

    // Find the latest date
    const latestDate = allDates.sort().pop();
    const lastWeek = MP_WEEKS[MP_WEEKS.length - 1];

    if (!lastWeek || latestDate <= lastWeek.end) return;

    // Generate weeks until we cover the latest date
    const weekColors = ['#059669', '#7c3aed', '#0ea5e9', '#8b5cf6', '#06b6d4'];
    let currentEnd = parseLocalDate(lastWeek.end);
    let weekNum = lastWeek.num;

    while (true) {
        // Start of new week (day after current end)
        const newStart = new Date(currentEnd);
        newStart.setDate(newStart.getDate() + 1);

        // End of new week (6 days after start = 7 day week)
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + 6);

        weekNum++;
        const startStr = formatDateYMD(newStart);
        const endStr = formatDateYMD(newEnd);

        // Format label based on month
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = monthNames[newStart.getMonth()];
        const endMonth = monthNames[newEnd.getMonth()];
        const startDay = newStart.getDate();
        const endDay = newEnd.getDate();

        let label;
        if (startMonth === endMonth) {
            label = `WEEK ${weekNum}: ${startMonth} ${startDay}-${endDay}`;
        } else {
            label = `WEEK ${weekNum}: ${startMonth} ${startDay} - ${endMonth} ${endDay}`;
        }

        // Determine color based on month (rotating)
        const monthIndex = newStart.getMonth();
        const color = weekColors[monthIndex % weekColors.length];

        MP_WEEKS.push({
            num: weekNum,
            start: startStr,
            end: endStr,
            label: label,
            color: color,
            generated: true // Mark as dynamically generated
        });

        currentEnd = newEnd;

        // Stop if we've covered the latest date
        if (endStr >= latestDate) break;

        // Safety: don't generate more than 52 weeks total
        if (weekNum >= 52) break;
    }
}

function formatDateYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Static tasks — RETIRED for D4 (Aug 2026). The old Jan–Feb 2026 D3 task list is gone;
// kept as an empty array because override/conversion machinery still references it.
const MP_STATIC_TASKS = [];

// Current editing state
let mpCurrentTask = null;
let mpIsEditing = false;

function initMonthlyPlanner() {

    // Initialize data structure
    if (!roadmapData.monthlyPlanner) {
        roadmapData.monthlyPlanner = { notes: [], customTasks: [], overriddenStatic: [], completedTasks: [] };
    }
    if (!roadmapData.monthlyPlanner.notes || Array.isArray(roadmapData.monthlyPlanner.notes)) {
        roadmapData.monthlyPlanner.notes = migrateArrayToObject(roadmapData.monthlyPlanner.notes, 'note');
    }
    if (!roadmapData.monthlyPlanner.customTasks || Array.isArray(roadmapData.monthlyPlanner.customTasks)) {
        roadmapData.monthlyPlanner.customTasks = migrateArrayToObject(roadmapData.monthlyPlanner.customTasks, 'ctask');
    }
    if (!roadmapData.monthlyPlanner.overriddenStatic || Array.isArray(roadmapData.monthlyPlanner.overriddenStatic)) {
        roadmapData.monthlyPlanner.overriddenStatic = migrateArrayToObject(roadmapData.monthlyPlanner.overriddenStatic, 'override');
    }
    if (!roadmapData.monthlyPlanner.completedTasks || Array.isArray(roadmapData.monthlyPlanner.completedTasks)) {
        roadmapData.monthlyPlanner.completedTasks = migrateArrayToObject(roadmapData.monthlyPlanner.completedTasks, 'completed');
    }

    // DATA INTEGRITY CHECK: Ensure all converted tasks have their static sources in overriddenStatic
    let needsSave = false;
    getValues(roadmapData.monthlyPlanner.customTasks).forEach(task => {
        const overriddenValues = getValues(roadmapData.monthlyPlanner.overriddenStatic).map(o => o.value || o);
        if (task.convertedFrom && !overriddenValues.includes(task.convertedFrom)) {
            const overrideId = generateId('override');
            roadmapData.monthlyPlanner.overriddenStatic[overrideId] = { id: overrideId, value: task.convertedFrom };
            needsSave = true;
        }
    });

    if (needsSave && hasLoadedFromCloud && !awaitingFirebaseLoad) {
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
    }

    // Clean up duplicate appointments before sync (idempotent, fast if no dupes)
    if (typeof dedupAppointments === 'function') {
        var deduped = dedupAppointments();
        if (deduped > 0) {
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            saveData();
        }
    }

    // Sync clinical appointments to Monthly Planner — only when clinical data has changed
    if (clinicalDataDirty) {
        syncClinicalToMonthlyPlanner();
    }

    // Build currentWeekSchedule for cross-app consumption (Stim Calc)
    buildCurrentWeekSchedule();

    // Extend weeks dynamically if we have tasks/appointments beyond Feb 22
    extendWeeksIfNeeded();

    mpRenderAllCalendars();
    mpRenderNotes();
    d4RenderScheduleCard();
    mpUpdateStats();
}

function mpToggleTaskComplete(taskId) {
    if (!roadmapData.monthlyPlanner.completedTasks || Array.isArray(roadmapData.monthlyPlanner.completedTasks)) {
        roadmapData.monthlyPlanner.completedTasks = migrateArrayToObject(roadmapData.monthlyPlanner.completedTasks, 'completed');
    }

    const taskIdStr = String(taskId);
    // Check if this task is already completed — use getValues() for object-based storage safety
    const isCompleted = getValues(roadmapData.monthlyPlanner.completedTasks).some(c => (c.value || c) === taskIdStr);

    if (!isCompleted) {
        const completedId = generateId('completed');
        roadmapData.monthlyPlanner.completedTasks[completedId] = { id: completedId, value: taskIdStr, completedAt: Date.now() };

        // CROSS-SYNC: If this is a clinic task, mark the appointment as completed
        if (taskIdStr.startsWith('clinic_')) {
            const aptId = taskIdStr.replace('clinic_', '');
            const apt = roadmapData.clinicalData?.appointments?.[aptId];
            if (apt && apt.status !== 'completed') {
                clinicalDataDirty = true; // Must set BEFORE clinical mutation per CLAUDE.md
                apt.status = 'completed';
                apt.completedAt = new Date().toISOString();

                // Update patient lastVisit — only move forward, never regress
                const patient = roadmapData.clinicalData?.patientRecords?.[apt.patientId];
                if (patient) {
                    var existingVisitDate = (patient.lastVisit || '').split('|')[0].trim();
                    if (!existingVisitDate || existingVisitDate < apt.date) {
                        patient.lastVisit = apt.date;
                    }
                    patient.lastUpdated = new Date().toISOString();
                }

                // Mark linked deadline as done
                if (typeof markLinkedDeadlineDone === 'function') {
                    markLinkedDeadlineDone(aptId);
                }

                showToast('Appointment completed! Record procedures in Clinical tab.');
            } else {
                showToast('Task completed!');
            }
        } else {
            showToast('Task completed!');
        }
    } else {
        // Find and remove the completed entry
        Object.keys(roadmapData.monthlyPlanner.completedTasks).forEach(id => {
            const entry = roadmapData.monthlyPlanner.completedTasks[id];
            if (entry?.value === taskIdStr || entry === taskIdStr) {
                delete roadmapData.monthlyPlanner.completedTasks[id];
            }
        });

        // CROSS-SYNC: If this is a clinic task, uncomplete the appointment (removes procedures, unlinks competencies)
        if (taskIdStr.startsWith('clinic_')) {
            const aptId = taskIdStr.replace('clinic_', '');
            if (typeof uncompleteAppointment === 'function') {
                uncompleteAppointment(aptId);
            } else {
                // Fallback: just reset status
                const apt = roadmapData.clinicalData?.appointments?.[aptId];
                if (apt && apt.status === 'completed') {
                    clinicalDataDirty = true;
                    apt.status = 'scheduled';
                    delete apt.completedAt;
                }
            }

            if (typeof unmarkLinkedDeadlineDone === 'function') {
                unmarkLinkedDeadlineDone(aptId);
            }
        }

        showToast('Task unmarked');
    }

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
    if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();
    if (typeof syncClinicalToMonthlyPlanner === 'function') { clinicalDataDirty = true; syncClinicalToMonthlyPlanner(); }
    mpRenderAllCalendars();
    mpUpdateStats();
}

function mpRenderAllCalendars() {
    const container = document.getElementById('mpCalendarContainer');
    if (!container) return;

    // Clear existing content (no user input involved - safe static rebuild)
    container.innerHTML = '';

    MP_WEEKS.forEach(week => {
        const weekEl = mpCreateWeekSection(week);
        container.appendChild(weekEl);
    });

    // Auto-scroll calendar to today's column on mobile
    mpScrollCalendarToToday();
}

function mpScrollCalendarToToday() {
    if (window.innerWidth > 480) return;
    requestAnimationFrame(() => {
        document.querySelectorAll('.mp-calendar-wrapper').forEach(wrapper => {
            const todayHeader = wrapper.querySelector('.mp-cal-day-header.today');
            if (!todayHeader) return;
            // Scroll so today's column is near the left edge (after time column)
            wrapper.scrollLeft = Math.max(0, todayHeader.offsetLeft - 50);
        });
    });
}

function mpCreateWeekSection(week) {
    const div = document.createElement('div');
    div.className = 'card mp-week-card';
    div.id = `mpWeek${week.num}`;

    const criticalStyle = week.critical ? 'border: 2px solid #fef08a;' : '';
    const today = getLocalDateString();
    const daysOut = mpGetDaysOut(week.start);

    // Check if this is the current week
    const isCurrentWeek = today >= week.start && today <= week.end;
    const isPastWeek = today > week.end;

    // Count tasks for this week
    const weekTasks = mpGetWeekTasks(week);
    const timedCount = weekTasks.filter(t => t.time).length;
    const untimedCount = weekTasks.filter(t => !t.time).length;
    const totalCount = weekTasks.length;

    // Get exam count for urgency indicator
    const examCount = weekTasks.filter(t => t.type === 'exam').length;
    const examBadge = examCount > 0 ? `<span class="mp-exam-badge">${examCount} EXAM${examCount > 1 ? 'S' : ''}</span>` : '';

    // Default: current/future weeks expanded, past weeks collapsed
    const isCollapsed = isPastWeek;

    div.innerHTML = `
        <div class="mp-week-header ${isCurrentWeek ? 'current-week' : ''}"
             style="background: linear-gradient(135deg, ${week.color} 0%, ${week.color}dd 100%); ${criticalStyle}"
             onclick="mpToggleWeek(${week.num})">
            <div class="mp-week-header-left">
                <span class="mp-week-collapse-icon" id="mpCollapseIcon${week.num}">${isCollapsed ? '▶' : '▼'}</span>
                <span class="mp-week-title">${week.label}</span>
                ${examBadge}
            </div>
            <div class="mp-week-header-right">
                <span class="mp-week-task-count">${totalCount} tasks</span>
                <span class="mp-week-days">${daysOut}</span>
                <button onclick="event.stopPropagation(); mpOpenAddModal(${week.num})" class="mp-add-week-btn">+ Add</button>
            </div>
        </div>
        <div class="mp-week-content" id="mpWeekContent${week.num}" style="${isCollapsed ? 'display: none;' : ''}">
            ${mpCreateCalendarGrid(week)}
            <div class="mp-untimed-section" id="mpUntimed${week.num}">
                ${mpCreateUntimedSection(week)}
            </div>
        </div>
    `;

    return div;
}

function mpToggleWeek(weekNum) {
    const content = document.getElementById(`mpWeekContent${weekNum}`);
    const icon = document.getElementById(`mpCollapseIcon${weekNum}`);

    if (content && icon) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        icon.textContent = isHidden ? '▼' : '▶';
    }
}

function mpExpandAllWeeks() {
    MP_WEEKS.forEach(week => {
        const content = document.getElementById(`mpWeekContent${week.num}`);
        const icon = document.getElementById(`mpCollapseIcon${week.num}`);
        if (content) content.style.display = 'block';
        if (icon) icon.textContent = '▼';
    });
}

function mpCollapseAllWeeks() {
    MP_WEEKS.forEach(week => {
        const content = document.getElementById(`mpWeekContent${week.num}`);
        const icon = document.getElementById(`mpCollapseIcon${week.num}`);
        if (content) content.style.display = 'none';
        if (icon) icon.textContent = '▶';
    });
}

function mpJumpToCurrentWeek() {
    const today = getLocalDateString();
    const currentWeek = MP_WEEKS.find(w => today >= w.start && today <= w.end);

    if (currentWeek) {
        // Expand current week
        const content = document.getElementById(`mpWeekContent${currentWeek.num}`);
        const icon = document.getElementById(`mpCollapseIcon${currentWeek.num}`);
        if (content) content.style.display = 'block';
        if (icon) icon.textContent = '▼';

        // Scroll to it
        const weekEl = document.getElementById(`mpWeek${currentWeek.num}`);
        if (weekEl) {
            weekEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function mpGetDaysOut(startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseLocalDate(startDate);
    const diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'This week';
    if (diff === 0) return 'Starts today';
    return `${diff} days out`;
}

// Responsive hour heights — smaller on mobile to fit 7-day view
function mpGetHourHeights() {
    const isMobile = window.innerWidth <= 480;
    return {
        withTask: isMobile ? 50 : 80,
        empty: isMobile ? 22 : 40
    };
}

function mpCreateCalendarGrid(week) {
    const days = mpGetWeekDays(week.start, week.end);
    const today = getLocalDateString();
    const timedTasks = mpGetWeekTasks(week).filter(t => t.time);

    // Calculate hours that have tasks for row expansion
    const hoursWithTasks = new Set();
    let minHour = 23;
    let maxHour = 6;

    timedTasks.forEach(t => {
        const startHour = parseInt(t.time.split(':')[0]);
        const endHour = t.endTime ? parseInt(t.endTime.split(':')[0]) : startHour;
        for (let h = startHour; h <= endHour; h++) {
            hoursWithTasks.add(h);
        }
        minHour = Math.min(minHour, startHour);
        maxHour = Math.max(maxHour, endHour);
    });

    // Smart hour range: show 1 hour before first task to 1 hour after last task
    // But always show at least 6am-9pm if no tasks
    const rangeStart = timedTasks.length > 0 ? Math.max(6, minHour - 1) : 6;
    const rangeEnd = timedTasks.length > 0 ? Math.min(23, maxHour + 1) : 21;

    // Pixel heights for Google Calendar-style layout (responsive)
    const heights = mpGetHourHeights();
    const hourHeightWithTask = heights.withTask;
    const hourHeightEmpty = heights.empty;

    let html = '<div class="mp-calendar-wrapper">';

    // Header row with day names
    html += '<div class="mp-cal-header-row">';
    html += '<div class="mp-cal-corner"></div>';
    days.forEach(day => {
        const isPast = day.date < today;
        const isToday = day.date === today;
        let classes = 'mp-cal-day-header';
        if (isPast) classes += ' past';
        if (isToday) classes += ' today';
        // D4 event chips (rotations, mock sims, INBDE, ADEX) in the day header zone
        let chipsHtml = '';
        mpGetD4EventsForDate(day.date).forEach(ev => {
            const t = D4_EVENT_TYPES[ev.type] || D4_EVENT_TYPES.other;
            const tip = t.label + ': ' + (ev.title || '') + (ev.location ? ' @ ' + ev.location : '');
            chipsHtml += `<div class="mp-d4ev-chip" style="background: ${t.color};" title="${escapeHtml(tip)}" onclick="d4OpenEventModal('${ev.id}')">${escapeHtml(ev.title || '')}</div>`;
        });
        html += `<div class="${classes}">
            <div class="mp-cal-day-name">${day.dayName}</div>
            <div class="mp-cal-day-date">${day.dayNum}</div>
            ${chipsHtml}
        </div>`;
    });
    html += '</div>';

    // Calendar body with time grid
    html += '<div class="mp-cal-body">';
    html += '<div class="mp-cal-grid">';

    // Time column - only show relevant hours
    html += '<div class="mp-cal-time-column">';
    for (let hour = rangeStart; hour <= rangeEnd; hour++) {
        const hasTask = hoursWithTasks.has(hour);
        const rowHeight = hasTask ? hourHeightWithTask : hourHeightEmpty;
        const timeLabel = hour < 12 ? `${hour}A` : hour === 12 ? '12P' : `${hour - 12}P`;
        html += `<div class="mp-cal-time-label" style="height: ${rowHeight}px;">${timeLabel}</div>`;
    }
    html += '</div>';

    // Day columns with tasks
    days.forEach((day, dayIndex) => {
        const isPast = day.date < today;
        const isToday = day.date === today;
        let dayClass = 'mp-cal-day-column';
        if (isPast) dayClass += ' past';
        if (isToday) dayClass += ' today';

        html += `<div class="${dayClass}" data-date="${day.date}">`;

        // Background cells for each hour in range
        for (let hour = rangeStart; hour <= rangeEnd; hour++) {
            const hasTask = hoursWithTasks.has(hour);
            const rowHeight = hasTask ? hourHeightWithTask : hourHeightEmpty;
            html += `<div class="mp-cal-cell" style="height: ${rowHeight}px;" onclick="mpClickCell('${day.date}', ${hour}, ${week.num})"></div>`;
        }

        // Task blocks for this day — compute overlap columns for side-by-side layout
        const dayTasks = timedTasks.filter(t => t.date === day.date);
        var overlapLayout = mpComputeOverlapLayout(dayTasks, hoursWithTasks, rangeStart);
        dayTasks.forEach(function(task) {
            var taskId = task.isStatic ? 'static-' + task.date + '-' + task.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '') : task.id;
            var layout = overlapLayout[taskId] || { col: 0, totalCols: 1 };
            html += mpCreateTaskBlock(task, week.num, hoursWithTasks, rangeStart, layout);
        });

        html += '</div>';
    });

    html += '</div>'; // end grid
    html += '</div>'; // end body
    html += '</div>'; // end wrapper

    return html;
}

function mpGetWeekDays(start, end) {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // FIXED: Use parseLocalDate to avoid UTC timezone issues
    const current = parseLocalDate(start);
    const endDate = parseLocalDate(end);

    if (!current || !endDate) return days;

    while (current <= endDate) {
        days.push({
            date: getLocalDateString(current),
            dayName: dayNames[current.getDay()],
            dayNum: current.getDate()
        });
        current.setDate(current.getDate() + 1);
    }

    return days;
}

function mpGetWeekTasks(week) {
    // Combine static and custom tasks for this week
    const allTasks = [];
    const overridden = getValues(roadmapData.monthlyPlanner?.overriddenStatic);
    const customTasks = getValues(roadmapData.monthlyPlanner?.customTasks);

    // Build a set of all static IDs that have been converted to custom tasks
    // This catches cases where overriddenStatic wasn't updated properly
    const convertedStaticIds = new Set(overridden.map(o => o.value || o));
    customTasks.forEach(ct => {
        if (ct.convertedFrom) {
            convertedStaticIds.add(ct.convertedFrom);
        }
    });

    // Add static tasks (if not overridden/converted)
    MP_STATIC_TASKS.forEach(task => {
        if (task.date >= week.start && task.date <= week.end) {
            const staticId = `static-${task.date}-${task.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '')}`;
            if (!convertedStaticIds.has(staticId)) {
                allTasks.push({ ...task, isStatic: true, id: staticId });
            }
        }
    });

    // Add custom tasks for this week
    customTasks.forEach(task => {
        if (task.date >= week.start && task.date <= week.end) {
            allTasks.push({ ...task, isStatic: false });
        }
    });

    return allTasks.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
    });
}

// Compute side-by-side column assignments for overlapping tasks (Google Calendar style)
function mpComputeOverlapLayout(dayTasks, hoursWithTasks, rangeStart) {
    var layout = {};
    if (!dayTasks || dayTasks.length === 0) return layout;

    // Convert each task to start/end in minutes for overlap detection
    var intervals = dayTasks.map(function(task) {
        var startH = parseInt(task.time.split(':')[0]);
        var startM = parseInt(task.time.split(':')[1]) || 0;
        var startMin = startH * 60 + startM;
        var endMin;
        if (task.endTime) {
            var endH = parseInt(task.endTime.split(':')[0]);
            var endM = parseInt(task.endTime.split(':')[1]) || 0;
            endMin = endH * 60 + endM;
        } else {
            endMin = startMin + 60; // default 1hr for overlap calc
        }
        var taskId = task.isStatic ? 'static-' + task.date + '-' + task.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '') : task.id;
        return { id: taskId, start: startMin, end: endMin };
    });

    // Sort by start time, then by end time descending (longer events first)
    intervals.sort(function(a, b) { return a.start - b.start || b.end - a.end; });

    // Greedy column assignment: place each event in the first column that doesn't overlap
    var columns = []; // columns[colIndex] = end time of last event in that column
    var assigned = {}; // id -> colIndex

    for (var i = 0; i < intervals.length; i++) {
        var ev = intervals[i];
        var placed = false;
        for (var c = 0; c < columns.length; c++) {
            if (columns[c] <= ev.start) {
                columns[c] = ev.end;
                assigned[ev.id] = c;
                placed = true;
                break;
            }
        }
        if (!placed) {
            assigned[ev.id] = columns.length;
            columns.push(ev.end);
        }
    }

    // Now compute totalCols for each overlap group
    // Group events that share overlapping time ranges
    var totalCols = columns.length;

    // For each event, find the max columns among its overlapping peers
    for (var i = 0; i < intervals.length; i++) {
        var ev = intervals[i];
        var maxCol = 0;
        for (var j = 0; j < intervals.length; j++) {
            if (intervals[j].start < ev.end && intervals[j].end > ev.start) {
                maxCol = Math.max(maxCol, assigned[intervals[j].id] + 1);
            }
        }
        layout[ev.id] = { col: assigned[ev.id], totalCols: maxCol };
    }

    return layout;
}

function mpCreateTaskBlock(task, weekNum, hoursWithTasks, rangeStart, overlapInfo) {
    if (rangeStart === undefined) rangeStart = 6;
    if (!overlapInfo) overlapInfo = { col: 0, totalCols: 1 };
    const typeClass = task.type || 'other';
    const taskId = task.isStatic ? `static-${task.date}-${task.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '')}` : task.id;
    const completedTasks = getValues(roadmapData.monthlyPlanner?.completedTasks);
    const isCompleted = completedTasks.some(c => (c.value || c) === String(taskId));

    // Heights matching mpCreateCalendarGrid (responsive)
    const heights = mpGetHourHeights();
    const heightWithTask = heights.withTask;
    const heightEmpty = heights.empty;

    // Calculate position and height
    const startHour = parseInt(task.time.split(':')[0]);
    const startMin = parseInt(task.time.split(':')[1]) || 0;

    let endHour = startHour;
    let endMin = startMin + 30; // Default 30 min if no end time

    if (task.endTime) {
        endHour = parseInt(task.endTime.split(':')[0]);
        endMin = parseInt(task.endTime.split(':')[1]) || 0;
    }

    // Calculate top position based on hours from rangeStart (not hardcoded 6am)
    let topPx = 0;
    for (let h = rangeStart; h < startHour; h++) {
        topPx += hoursWithTasks.has(h) ? heightWithTask : heightEmpty;
    }
    // Add offset for minutes within the hour
    const hourHeight = hoursWithTasks.has(startHour) ? heightWithTask : heightEmpty;
    topPx += (startMin / 60) * hourHeight;

    // Calculate height
    let heightPx = 0;
    if (task.endTime) {
        // Span from start to end
        for (let h = startHour; h < endHour; h++) {
            heightPx += hoursWithTasks.has(h) ? heightWithTask : heightEmpty;
        }
        // Add partial end hour
        const endHourHeight = hoursWithTasks.has(endHour) ? heightWithTask : heightEmpty;
        heightPx += (endMin / 60) * endHourHeight;
        // Subtract starting offset
        const startHourHeight = hoursWithTasks.has(startHour) ? heightWithTask : heightEmpty;
        heightPx -= (startMin / 60) * startHourHeight;
    } else {
        // Auto-size: minimum height to fit content
        heightPx = Math.max(34, hourHeight - 4);
    }

    const timeDisplay = mpFormatTime(task.time) + (task.endTime ? ' - ' + mpFormatTime(task.endTime) : '');
    const completedClass = isCompleted ? 'mp-task-completed' : '';

    // Parse location from notes (📍 prefix)
    let location = '';
    let otherNotes = task.notes || '';
    if (otherNotes.startsWith('📍 ')) {
        const parts = otherNotes.split('\n');
        location = parts[0].replace('📍 ', '');
        otherNotes = parts.slice(1).join('\n').trim();
    }

    // Use min-height so background extends to cover all content
    // heightPx is based on duration; content may need more space
    const isMobile = window.innerWidth <= 480;
    const minHeight = Math.max(isMobile ? 36 : 60, heightPx);

    // Hide button for clinic-synced tasks
    const hideBtn = (task.syncedFromClinical || task.clinicalAppointmentId)
        ? `<button class="mp-cal-edit-btn" onclick="mpHideClinicTask('${taskId}', '${task.clinicalAppointmentId || ''}'); event.stopPropagation();" title="Hide from planner" style="font-size:0.7em;">👁️‍🗨️</button>`
        : '';

    // Overlap layout: side-by-side columns within day column
    var colPct = 100 / overlapInfo.totalCols;
    var leftPct = overlapInfo.col * colPct;
    var overlapStyle = overlapInfo.totalCols > 1
        ? 'left:' + leftPct + '%; width:' + (colPct - 1) + '%; right:auto;'
        : 'left:2px; right:2px;';

    return `
        <div class="mp-cal-task ${typeClass} ${completedClass}"
             style="top: ${topPx}px; min-height: ${minHeight}px; ${overlapStyle}"
             data-task-id="${taskId}"
             onclick="mpEditTaskFromBlock('${taskId}', ${weekNum}, ${task.isStatic || false})">
            <div class="mp-cal-task-header">
                <label onclick="event.stopPropagation();">
                    <input type="checkbox" class="mp-cal-checkbox" ${isCompleted ? 'checked' : ''}
                           onchange="mpToggleTaskComplete('${taskId}')" />
                </label>
                ${hideBtn}
                <button class="mp-cal-edit-btn" onclick="mpEditTaskFromBlock('${taskId}', ${weekNum}, ${task.isStatic || false}); event.stopPropagation();" title="Edit">✏️</button>
            </div>
            <div class="mp-cal-task-name ${isCompleted ? 'mp-completed-text' : ''}">${escapeHtml(task.item)}</div>
            <div class="mp-cal-task-time">${timeDisplay}</div>
            ${location ? `<div class="mp-cal-task-location">${escapeHtml(location)}</div>` : ''}
            ${otherNotes ? `<div class="mp-cal-task-notes">${escapeHtml(otherNotes)}</div>` : ''}
        </div>
    `;
}

function mpFormatTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`;
}

function mpCreateUntimedSection(week) {
    const tasks = mpGetWeekTasks(week).filter(t => !t.time);
    const completedTasks = getValues(roadmapData.monthlyPlanner?.completedTasks);

    if (tasks.length === 0) {
        return `
            <div class="mp-untimed-header">
                <span class="mp-untimed-title">📋 Untimed Tasks</span>
                <span class="mp-untimed-count">0</span>
            </div>
            <div class="mp-untimed-empty">No untimed tasks for this week</div>
        `;
    }

    const completedCount = tasks.filter(t => {
        const taskId = t.isStatic ? `static-${t.date}-${t.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '')}` : t.id;
        return completedTasks.some(function(c) { return (c.value || c) === String(taskId); });
    }).length;

    let html = `
        <div class="mp-untimed-header">
            <span class="mp-untimed-title">📋 Untimed Tasks</span>
            <span class="mp-untimed-count">${completedCount}/${tasks.length}</span>
        </div>
        <table class="mp-untimed-table">
            <thead>
                <tr>
                    <th style="width: 35px;">✓</th>
                    <th style="width: 65px;">Date</th>
                    <th>Item</th>
                    <th style="width: 80px;">Type</th>
                    <th>Notes</th>
                    <th style="width: 40px;">Edit</th>
                </tr>
            </thead>
            <tbody>
    `;

    tasks.forEach(task => {
        const dateObj = new Date(task.date + 'T12:00:00');
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const typeClass = task.type || 'other';
        const taskId = task.isStatic ? `static-${task.date}-${task.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '')}` : task.id;
        const isCompleted = completedTasks.some(function(c) { return (c.value || c) === String(taskId); });
        const rowClass = isCompleted ? 'mp-completed-row' : '';

        html += `
            <tr class="${rowClass}">
                <td>
                    <input type="checkbox" class="mp-task-checkbox"
                           ${isCompleted ? 'checked' : ''}
                           onchange="mpToggleTaskComplete('${taskId}')" />
                </td>
                <td><strong>${dateStr}</strong></td>
                <td class="${isCompleted ? 'mp-completed-text' : ''}">${escapeHtml(task.item)}</td>
                <td><span class="mp-type ${typeClass}">${typeClass.toUpperCase()}</span></td>
                <td style="color: #b0bcc8; font-size: 0.85em; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(task.notes || '')}">${escapeHtml(task.notes || '')}</td>
                <td><button class="mp-edit-btn" onclick="mpEditTaskFromBlock('${taskId}', ${week.num}, ${task.isStatic || false})" title="Edit Task">✏️</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    return html;
}

// ===== MODAL FUNCTIONS =====
function mpOpenAddModal(weekNum) {
    mpIsEditing = false;
    mpCurrentTask = null;

    const week = MP_WEEKS.find(w => w.num === weekNum);
    if (!week) return;

    document.getElementById('mpModalTitle').textContent = `➕ Add Task to ${week.label.replace(/[⚠️🔴]/g, '').trim()}`;
    document.getElementById('mpModalItem').value = '';
    document.getElementById('mpModalDate').value = '';
    document.getElementById('mpModalDate').min = week.start;
    document.getElementById('mpModalDate').max = week.end;
    document.getElementById('mpModalTime').value = '';
    document.getElementById('mpModalEndTime').value = '';
    document.getElementById('mpModalType').value = 'other';
    document.getElementById('mpModalNotes').value = '';
    document.getElementById('mpDeleteSection').style.display = 'none';
    document.getElementById('mpModalSubmitBtn').textContent = 'Add Task';

    document.getElementById('mpTaskModal').style.display = 'flex';
    setTimeout(() => document.getElementById('mpModalItem').focus(), 100);
}

function mpClickCell(date, hour, weekNum) {
    mpIsEditing = false;
    mpCurrentTask = null;

    const week = MP_WEEKS.find(w => w.num === weekNum);
    if (!week) return;

    document.getElementById('mpModalTitle').textContent = `➕ Add Task`;
    document.getElementById('mpModalItem').value = '';
    document.getElementById('mpModalDate').value = date;
    document.getElementById('mpModalDate').min = week.start;
    document.getElementById('mpModalDate').max = week.end;
    document.getElementById('mpModalTime').value = String(hour).padStart(2, '0') + ':00';
    document.getElementById('mpModalEndTime').value = hour < 23 ? String(hour + 1).padStart(2, '0') + ':00' : '23:59';
    document.getElementById('mpModalType').value = 'other';
    document.getElementById('mpModalNotes').value = '';
    document.getElementById('mpDeleteSection').style.display = 'none';
    document.getElementById('mpModalSubmitBtn').textContent = 'Add Task';

    document.getElementById('mpTaskModal').style.display = 'flex';
    setTimeout(() => document.getElementById('mpModalItem').focus(), 100);
}

// Universal edit function - handles both static and custom tasks
function mpEditTaskFromBlock(taskId, weekNum, isStatic) {

    let task = null;

    if (isStatic) {
        // Find in static tasks
        const staticTask = MP_STATIC_TASKS.find(t => {
            const staticId = `static-${t.date}-${t.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '')}`;
            return staticId === taskId;
        });

        if (staticTask) {
            // Convert to editable format
            task = {
                id: 'converting-' + Date.now(),
                item: staticTask.item,
                date: staticTask.date,
                time: staticTask.time,
                endTime: staticTask.endTime || '',
                type: staticTask.type,
                notes: staticTask.notes,
                isStatic: true,
                staticId: taskId
            };
        }
    } else {
        // Find in custom tasks
        task = getValues(roadmapData.monthlyPlanner?.customTasks).find(t => t.id == taskId);
    }

    if (!task) {
        console.error('Task not found:', taskId);
        return;
    }

    mpIsEditing = true;
    mpCurrentTask = task;

    document.getElementById('mpModalTitle').textContent = '✏️ Edit Task';
    document.getElementById('mpModalItem').value = task.item || '';
    document.getElementById('mpModalDate').value = task.date || '';
    // FIXED: Use dynamic date range from MP_WEEKS instead of hardcoded limits
    const firstWeek = MP_WEEKS[0];
    const lastWeek = MP_WEEKS[MP_WEEKS.length - 1];
    document.getElementById('mpModalDate').min = firstWeek ? firstWeek.start : '2026-01-19';
    document.getElementById('mpModalDate').max = lastWeek ? lastWeek.end : '2026-12-31';
    document.getElementById('mpModalTime').value = task.time || '';
    document.getElementById('mpModalEndTime').value = task.endTime || '';
    document.getElementById('mpModalType').value = task.type || 'other';
    document.getElementById('mpModalNotes').value = task.notes || '';
    document.getElementById('mpDeleteSection').style.display = 'block';
    document.getElementById('mpModalSubmitBtn').textContent = 'Save Changes';

    document.getElementById('mpTaskModal').style.display = 'flex';
    setTimeout(() => document.getElementById('mpModalItem').focus(), 100);
}

function mpEditTask(taskId, weekNum) {
    mpEditTaskFromBlock(taskId, weekNum, false);
}

function mpCloseTaskModal() {
    document.getElementById('mpTaskModal').style.display = 'none';
    mpCurrentTask = null;
    mpIsEditing = false;
}

function mpSaveTask() {
    const item = document.getElementById('mpModalItem').value.trim();
    const date = document.getElementById('mpModalDate').value;
    const time = document.getElementById('mpModalTime').value;
    const endTime = document.getElementById('mpModalEndTime').value;
    const type = document.getElementById('mpModalType').value;
    const notes = document.getElementById('mpModalNotes').value.trim();

    if (!item) {
        showToast('Task name is required', 'warning');
        document.getElementById('mpModalItem').focus();
        return;
    }
    if (!date) {
        showToast('Date is required', 'warning');
        document.getElementById('mpModalDate').focus();
        return;
    }

    // Validate end time is after start time
    if (time && endTime && endTime <= time) {
        showToast('End time must be after start time', 'warning');
        document.getElementById('mpModalEndTime').focus();
        return;
    }

    if (mpIsEditing && mpCurrentTask) {
        // Check if this is a static task being converted
        if (mpCurrentTask.isStatic) {
            // Mark static task as overridden
            if (!roadmapData.monthlyPlanner.overriddenStatic || Array.isArray(roadmapData.monthlyPlanner.overriddenStatic)) {
                roadmapData.monthlyPlanner.overriddenStatic = migrateArrayToObject(roadmapData.monthlyPlanner.overriddenStatic, 'override');
            }
            const overriddenValues = getValues(roadmapData.monthlyPlanner.overriddenStatic).map(o => o.value || o);
            if (!overriddenValues.includes(mpCurrentTask.staticId)) {
                const overrideId = generateId('override');
                roadmapData.monthlyPlanner.overriddenStatic[overrideId] = { id: overrideId, value: mpCurrentTask.staticId };
            }

            // Create new custom task
            const newTaskId = generateId('ctask');
            const newTask = {
                id: newTaskId,
                item: item,
                date: date,
                time: time,
                endTime: endTime,
                type: type,
                notes: notes,
                createdAt: new Date().toISOString(),
                convertedFrom: mpCurrentTask.staticId
            };
            if (!roadmapData.monthlyPlanner.customTasks || Array.isArray(roadmapData.monthlyPlanner.customTasks)) {
                roadmapData.monthlyPlanner.customTasks = migrateArrayToObject(roadmapData.monthlyPlanner.customTasks, 'ctask');
            }
            roadmapData.monthlyPlanner.customTasks[newTaskId] = newTask;
            showToast('Task updated!');
        } else {
            // Update existing custom task
            mpCurrentTask.item = item;
            mpCurrentTask.date = date;
            mpCurrentTask.time = time;
            mpCurrentTask.endTime = endTime;
            mpCurrentTask.type = type;
            mpCurrentTask.notes = notes;
            // Mark as user-edited so syncClinicalToMonthlyPlanner won't overwrite
            if (mpCurrentTask.syncedFromClinical || mpCurrentTask.clinicalAppointmentId) {
                mpCurrentTask.userEdited = true;
            }
            showToast('Task updated!');
        }
    } else {
        // Create new task
        const newTaskId = generateId('ctask');
        const newTask = {
            id: newTaskId,
            item: item,
            date: date,
            time: time,
            endTime: endTime,
            type: type,
            notes: notes,
            createdAt: new Date().toISOString()
        };
        if (!roadmapData.monthlyPlanner.customTasks || Array.isArray(roadmapData.monthlyPlanner.customTasks)) {
            roadmapData.monthlyPlanner.customTasks = migrateArrayToObject(roadmapData.monthlyPlanner.customTasks, 'ctask');
        }
        roadmapData.monthlyPlanner.customTasks[newTaskId] = newTask;
        showToast('Task added!');
    }

    // Save immediately and re-render
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Rebuild week schedule for Stim Calc cross-app visibility
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();

    mpCloseTaskModal();
    mpRenderAllCalendars();
    mpUpdateStats();
}

function mpDeleteCurrentTask() {
    if (!mpCurrentTask) return;
    showCustomConfirm('Delete this task?', function() { _mpDeleteCurrentTaskConfirmed(); }, null, 'Delete Task');
}

function _mpDeleteCurrentTaskConfirmed() {
    if (!mpCurrentTask) return;

    if (mpCurrentTask.isStatic) {
        // Mark static task as deleted/hidden
        if (!roadmapData.monthlyPlanner.overriddenStatic || Array.isArray(roadmapData.monthlyPlanner.overriddenStatic)) {
            roadmapData.monthlyPlanner.overriddenStatic = migrateArrayToObject(roadmapData.monthlyPlanner.overriddenStatic, 'override');
        }
        const overriddenValues = getValues(roadmapData.monthlyPlanner.overriddenStatic).map(o => o.value || o);
        if (!overriddenValues.includes(mpCurrentTask.staticId)) {
            const overrideId = generateId('override');
            roadmapData.monthlyPlanner.overriddenStatic[overrideId] = { id: overrideId, value: mpCurrentTask.staticId };
        }
        showToast('Task removed');
    } else if (mpCurrentTask.clinicalAppointmentId || (mpCurrentTask.id && mpCurrentTask.id.startsWith('clinic_'))) {
        // Clinic-synced task: hide via hiddenClinicTasks so sync never recreates it
        if (!roadmapData.monthlyPlanner.hiddenClinicTasks) roadmapData.monthlyPlanner.hiddenClinicTasks = {};
        var aptId = mpCurrentTask.clinicalAppointmentId || mpCurrentTask.id.replace('clinic_', '');
        roadmapData.monthlyPlanner.hiddenClinicTasks[aptId] = {
            hiddenAt: new Date().toISOString(),
            taskId: mpCurrentTask.id
        };
        if (roadmapData.monthlyPlanner?.customTasks?.[mpCurrentTask.id]) {
            delete roadmapData.monthlyPlanner.customTasks[mpCurrentTask.id];
        }
        showToast('Clinic task hidden from planner');
    } else {
        // Delete regular custom task
        if (roadmapData.monthlyPlanner?.customTasks?.[mpCurrentTask.id]) {
            delete roadmapData.monthlyPlanner.customTasks[mpCurrentTask.id];
            showToast('Task deleted');
        }
    }

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
    if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();
    mpCloseTaskModal();
    mpRenderAllCalendars();
    mpUpdateStats();
}

function mpUpdateStats() {
    // Get all tasks from all weeks - only count FUTURE tasks
    const today = getLocalDateString();
    let allTasks = [];
    const overridden = getValues(roadmapData.monthlyPlanner?.overriddenStatic);
    const customTasks = getValues(roadmapData.monthlyPlanner?.customTasks);

    // Build a set of all static IDs that have been converted to custom tasks
    const convertedStaticIds = new Set(overridden.map(o => o.value || o));
    customTasks.forEach(ct => {
        if (ct.convertedFrom) {
            convertedStaticIds.add(ct.convertedFrom);
        }
    });

    // Add non-overridden static tasks
    MP_STATIC_TASKS.forEach(task => {
        const staticId = `static-${task.date}-${task.item.substring(0,15).replace(/[^a-zA-Z0-9]/g, '')}`;
        if (!convertedStaticIds.has(staticId) && task.date >= today) {
            allTasks.push(task);
        }
    });

    // Add custom tasks (future only)
    customTasks.forEach(task => {
        if (task.date >= today) {
            allTasks.push(task);
        }
    });

    const exams = allTasks.filter(t => t.type === 'exam').length;
    const clinic = allTasks.filter(t => t.type === 'clinic').length;
    const academic = allTasks.filter(t => t.type === 'academic' || t.type === 'mandatory').length;
    const life = allTasks.filter(t => t.type === 'life').length;

    const el1 = document.getElementById('mpStatExams');
    const el2 = document.getElementById('mpStatClinic');
    const el3 = document.getElementById('mpStatAssignments');
    const el4 = document.getElementById('mpStatLife');

    if (el1) el1.textContent = exams;
    if (el2) el2.textContent = clinic;
    if (el3) el3.textContent = academic;
    if (el4) el4.textContent = life;
}

// ===== NOTES FUNCTIONS =====
// Flag to prevent double saves during note editing
let mpNoteSaving = false;

function mpAddNote() {
    const input = document.getElementById('mpNewNote');
    const text = input?.value?.trim();

    if (!text) {
        input?.focus();
        return;
    }

    const noteId = generateId('note');
    const note = {
        id: noteId,
        text: text,
        createdAt: new Date().toISOString()
    };

    // Ensure object exists
    if (!roadmapData.monthlyPlanner) {
        roadmapData.monthlyPlanner = { notes: {}, customTasks: {}, overriddenStatic: {}, completedTasks: {} };
    }
    if (!roadmapData.monthlyPlanner.notes || Array.isArray(roadmapData.monthlyPlanner.notes)) {
        roadmapData.monthlyPlanner.notes = migrateArrayToObject(roadmapData.monthlyPlanner.notes, 'note');
    }

    roadmapData.monthlyPlanner.notes[noteId] = note;
    input.value = '';

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    mpRenderNotes();
    showToast('Note added!');
}

function mpRenderNotes() {
    const container = document.getElementById('mpNotesList');
    const noNotesMsg = document.getElementById('mpNoNotesMessage');

    if (!container) return;

    const notes = getValues(roadmapData.monthlyPlanner?.notes);

    if (notes.length === 0) {
        container.innerHTML = '';
        if (noNotesMsg) noNotesMsg.style.display = 'block';
        return;
    }

    if (noNotesMsg) noNotesMsg.style.display = 'none';

    // Sort by createdAt descending (newest first)
    const sortedNotes = notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = sortedNotes.map(note => {
        const date = new Date(note.createdAt);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        return `
            <div class="mp-note-item" data-id="${note.id}">
                <div class="mp-note-content">
                    <div class="mp-note-text">${escapeHtml(note.text)}</div>
                    <div class="mp-note-timestamp">${dateStr}</div>
                </div>
                <div class="mp-note-actions">
                    <button class="mp-note-action-btn" onclick="mpEditNote('${note.id}')" title="Edit">✏️</button>
                    <button class="mp-note-action-btn delete" onclick="mpDeleteNote('${note.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function mpEditNote(noteId) {
    const note = roadmapData.monthlyPlanner?.notes?.[noteId];
    if (!note) return;

    const noteEl = document.querySelector(`.mp-note-item[data-id="${noteId}"]`);
    if (!noteEl) return;

    const contentEl = noteEl.querySelector('.mp-note-content');
    const currentText = note.text;

    // Replace with editable textarea — Escape handler doesn't need currentText arg (mpCancelNoteEdit just re-renders)
    contentEl.innerHTML = `
        <textarea class="mp-note-edit-input" id="mpEditInput-${noteId}"
            onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();mpSaveNoteEdit('${noteId}');}"
            onkeyup="if(event.key==='Escape'){mpCancelNoteEdit('${noteId}');}">${escapeHtml(currentText)}</textarea>
        <div class="mp-note-edit-actions">
            <button onclick="mpSaveNoteEdit('${noteId}')" class="mp-note-save-btn">Save</button>
            <button onclick="mpCancelNoteEdit('${noteId}')" class="mp-note-cancel-btn">Cancel</button>
        </div>
    `;

    const textarea = document.getElementById(`mpEditInput-${noteId}`);
    if (textarea) {
        textarea.focus();
        textarea.selectionStart = textarea.value.length;
    }
}

function mpCancelNoteEdit(noteId) {
    mpRenderNotes();
}

function mpSaveNoteEdit(noteId) {
    if (mpNoteSaving) return; // Prevent double saves

    const textarea = document.getElementById(`mpEditInput-${noteId}`);
    if (!textarea) return;

    mpNoteSaving = true;

    const newText = textarea.value.trim();
    const note = roadmapData.monthlyPlanner?.notes?.[noteId];

    if (!note) {
        mpNoteSaving = false;
        return;
    }

    if (newText === '') {
        mpNoteSaving = false;
        mpDeleteNote(noteId);
        return;
    }

    roadmapData.monthlyPlanner.notes[noteId].text = newText;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    mpRenderNotes();
    showToast('Note updated');

    setTimeout(() => { mpNoteSaving = false; }, 100);
}

function mpDeleteNote(noteId) {
    showCustomConfirm('Delete this note?', function() {
        if (!roadmapData.monthlyPlanner?.notes?.[noteId]) return;

        delete roadmapData.monthlyPlanner.notes[noteId];
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        mpRenderNotes();
        showToast('Note deleted');
    }, null, 'Delete Note');
}

// ==================== D4 SCHEDULE (rotations, didactics, mock sims, INBDE, ADEX) ====================

const D4_EVENT_TYPES = {
    rotation: { label: 'Rotation', color: '#6366f1' },
    didactic: { label: 'Didactic', color: '#3b82f6' },
    mocksim:  { label: 'Mock Sim', color: '#f59e0b' },
    inbde:    { label: 'INBDE', color: '#8b5cf6' },
    adex:     { label: 'ADEX', color: '#ef4444' },
    other:    { label: 'Other', color: '#64748b' }
};

// One-time seed: TBD INBDE + ADEX placeholders and starter critical reminders.
// Seeds carry `seeded: true` so isEmptyState() doesn't count them as user data
// (Guard C). d4SaveEvent()/user reminder adds produce entries WITHOUT the flag.
function migrateD4EventsSeed() {
    if (localStorage.getItem('d4EventsSeeded_v1')) return;
    if (!roadmapData.d4Events) roadmapData.d4Events = {};
    if (!roadmapData.monthlyPlanner) {
        roadmapData.monthlyPlanner = { notes: {}, customTasks: {}, overriddenStatic: {}, completedTasks: {} };
    }
    if (!roadmapData.monthlyPlanner.criticalReminders) roadmapData.monthlyPlanner.criticalReminders = {};
    var now = new Date().toISOString();
    if (getCount(roadmapData.d4Events) === 0) {
        [['inbde', 'INBDE'], ['adex', 'ADEX Clinical Exam']].forEach(function(pair) {
            var id = generateId('d4ev');
            roadmapData.d4Events[id] = {
                id: id, type: pair[0], title: pair[1],
                startDate: null, endDate: null, time: null, location: '', notes: '',
                tbd: true, seeded: true, createdAt: now, lastEdited: now
            };
        });
    }
    if (getCount(roadmapData.monthlyPlanner.criticalReminders) === 0) {
        ['🦷 INBDE — date TBD, set it in D4 Schedule',
         '🦷 ADEX Clinical Exam — date TBD; mock sims precede it'].forEach(function(text) {
            var id = generateId('crem');
            roadmapData.monthlyPlanner.criticalReminders[id] = { id: id, text: text, seeded: true, createdAt: now };
        });
    }
    localStorage.setItem('d4EventsSeeded_v1', '1');
}

function mpFormatShortDate(dateStr) {
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var d = parseLocalDate(dateStr);
    if (isNaN(d)) return dateStr;
    return monthNames[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
}

function mpGetD4EventsForDate(dateStr) {
    return getValues(roadmapData.d4Events).filter(ev =>
        ev && !ev.tbd && ev.startDate && dateStr >= ev.startDate && dateStr <= (ev.endDate || ev.startDate)
    );
}

function d4RenderScheduleCard() {
    var container = document.getElementById('d4ScheduleList');
    if (!container) return;

    var events = getValues(roadmapData.d4Events);
    if (events.length === 0) {
        container.innerHTML = '<div class="mp-no-notes-message" style="display: block;">No D4 events yet. Add rotations, didactics, mock sims, INBDE, ADEX.</div>';
        return;
    }

    // TBD events first (they need dates!), then chronological
    events.sort(function(a, b) {
        var aTbd = !a.startDate, bTbd = !b.startDate;
        if (aTbd !== bTbd) return aTbd ? -1 : 1;
        return String(a.startDate || '').localeCompare(String(b.startDate || ''));
    });

    var today = getLocalDateString();
    container.innerHTML = events.map(function(ev) {
        var t = D4_EVENT_TYPES[ev.type] || D4_EVENT_TYPES.other;
        var isPast = ev.startDate && (ev.endDate || ev.startDate) < today;
        var dateHtml;
        if (!ev.startDate) {
            dateHtml = '<span style="color: #f59e0b; font-weight: 600;">⚠ TBD — set date</span>';
        } else {
            dateHtml = escapeHtml(mpFormatShortDate(ev.startDate));
            if (ev.endDate && ev.endDate !== ev.startDate) dateHtml += ' → ' + escapeHtml(mpFormatShortDate(ev.endDate));
            if (ev.time) dateHtml += ' · ' + escapeHtml(ev.time);
        }
        return '<div class="d4ev-row" style="display: flex; align-items: center; gap: 8px; padding: 7px 4px; border-bottom: 1px solid rgba(148,163,184,0.12);' + (isPast ? ' opacity: 0.45;' : '') + '">'
            + '<span style="width: 9px; height: 9px; border-radius: 50%; background: ' + t.color + '; flex-shrink: 0;" title="' + t.label + '"></span>'
            + '<div style="flex: 1; min-width: 0;">'
            + '<div style="font-size: 0.86em; color: #e2e8f0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + escapeHtml(ev.title || '') + '</div>'
            + '<div style="font-size: 0.76em; color: #94a3b8;">' + dateHtml
            + (ev.location ? ' <span style="color: #64748b;">@ ' + escapeHtml(ev.location) + '</span>' : '') + '</div>'
            + '</div>'
            + '<button onclick="d4OpenEventModal(\'' + ev.id + '\')" class="mp-note-action-btn" title="Edit">✏️</button>'
            + '<button onclick="d4DeleteEvent(\'' + ev.id + '\')" class="mp-note-action-btn delete" title="Delete">🗑️</button>'
            + '</div>';
    }).join('');
}

function d4CloseEventModal() {
    var overlay = document.getElementById('d4EventModalOverlay');
    if (overlay) overlay.remove();
}

function d4OpenEventModal(eventId) {
    d4CloseEventModal();
    var ev = eventId ? roadmapData.d4Events?.[eventId] : null;
    if (eventId && !ev) return;

    var typeOptions = Object.keys(D4_EVENT_TYPES).map(function(key) {
        var sel = (ev ? ev.type === key : key === 'rotation') ? ' selected' : '';
        return '<option value="' + key + '"' + sel + '>' + D4_EVENT_TYPES[key].label + '</option>';
    }).join('');

    var inputStyle = 'width: 100%; padding: 8px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; font-size: 0.9em; box-sizing: border-box;';
    var labelStyle = 'display: block; font-size: 0.75em; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 10px 0 4px;';

    var overlay = document.createElement('div');
    overlay.id = 'd4EventModalOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 16px;';
    overlay.innerHTML = '<div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto;">'
        + '<h3 style="margin: 0 0 4px; color: #f1f5f9; font-size: 1.05em;">' + (ev ? 'Edit D4 Event' : 'Add D4 Event') + '</h3>'
        + '<div style="font-size: 0.78em; color: #64748b; margin-bottom: 8px;">Rotations, didactics, mock sims, INBDE, ADEX. Leave dates blank for TBD.</div>'
        + '<label style="' + labelStyle + '">Type</label>'
        + '<select id="d4evType" style="' + inputStyle + '">' + typeOptions + '</select>'
        + '<label style="' + labelStyle + '">Title *</label>'
        + '<input type="text" id="d4evTitle" style="' + inputStyle + '" value="' + escapeHtml(ev?.title || '') + '" placeholder="e.g. Oral Surgery Rotation">'
        + '<div style="display: flex; gap: 10px;">'
        + '<div style="flex: 1;"><label style="' + labelStyle + '">Start date</label>'
        + '<input type="date" id="d4evStart" style="' + inputStyle + '" value="' + (ev?.startDate || '') + '"></div>'
        + '<div style="flex: 1;"><label style="' + labelStyle + '">End date</label>'
        + '<input type="date" id="d4evEnd" style="' + inputStyle + '" value="' + (ev?.endDate || '') + '"></div>'
        + '</div>'
        + '<div style="display: flex; gap: 10px;">'
        + '<div style="flex: 1;"><label style="' + labelStyle + '">Time</label>'
        + '<input type="time" id="d4evTime" style="' + inputStyle + '" value="' + (ev?.time || '') + '"></div>'
        + '<div style="flex: 1;"><label style="' + labelStyle + '">Location</label>'
        + '<input type="text" id="d4evLocation" style="' + inputStyle + '" value="' + escapeHtml(ev?.location || '') + '" placeholder="optional"></div>'
        + '</div>'
        + '<label style="' + labelStyle + '">Notes</label>'
        + '<textarea id="d4evNotes" rows="2" style="' + inputStyle + ' resize: vertical;">' + escapeHtml(ev?.notes || '') + '</textarea>'
        + '<div style="display: flex; gap: 8px; margin-top: 16px;">'
        + '<button onclick="d4SaveEvent(' + (eventId ? '\'' + eventId + '\'' : 'null') + ')" style="flex: 1; background: #6366f1; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;">Save</button>'
        + '<button onclick="d4CloseEventModal()" style="background: rgba(255,255,255,0.08); color: #94a3b8; border: 1px solid #334155; padding: 10px 16px; border-radius: 8px; cursor: pointer;">Cancel</button>'
        + '</div>'
        + '</div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) d4CloseEventModal(); });
    document.body.appendChild(overlay);
    document.getElementById('d4evTitle')?.focus();
}

function d4SaveEvent(eventId) {
    var title = document.getElementById('d4evTitle')?.value?.trim();
    if (!title) {
        showToast('Title is required', 'error');
        document.getElementById('d4evTitle')?.focus();
        return;
    }
    var type = document.getElementById('d4evType')?.value || 'other';
    var startDate = document.getElementById('d4evStart')?.value || null;
    var endDate = document.getElementById('d4evEnd')?.value || null;
    var time = document.getElementById('d4evTime')?.value || null;
    var location = document.getElementById('d4evLocation')?.value?.trim() || '';
    var notes = document.getElementById('d4evNotes')?.value?.trim() || '';
    if (startDate && endDate && endDate < startDate) endDate = startDate;
    if (!startDate) endDate = null;

    if (!roadmapData.d4Events) roadmapData.d4Events = {};
    var now = new Date().toISOString();
    var id = eventId || generateId('d4ev');
    var existing = roadmapData.d4Events[id] || {};
    // Rebuilt without the `seeded` flag: any user save makes this real data (Guard C)
    roadmapData.d4Events[id] = {
        id: id, type: type, title: title,
        startDate: startDate ?? null, endDate: endDate ?? null, time: time ?? null,
        location: location, notes: notes,
        tbd: !startDate,
        createdAt: existing.createdAt || now,
        lastEdited: now
    };

    d4CloseEventModal();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    extendWeeksIfNeeded();
    d4RenderScheduleCard();
    mpRenderAllCalendars();
    if (typeof renderDashboard === 'function') renderDashboard();
    showToast('D4 event saved');
}

function d4DeleteEvent(eventId) {
    var ev = roadmapData.d4Events?.[eventId];
    if (!ev) return;
    showCustomConfirm('Delete "' + (ev.title || 'this event') + '" from the D4 schedule?', function() {
        delete roadmapData.d4Events[eventId];
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        d4RenderScheduleCard();
        mpRenderAllCalendars();
        if (typeof renderDashboard === 'function') renderDashboard();
        showToast('D4 event deleted');
    }, null, 'Delete D4 Event');
}

// ==================== CURRENT WEEK SCHEDULE BUILDER ====================
// Builds a pre-compiled weekly schedule for cross-app consumption (Stim Calc "Week at a Glance")

function buildCurrentWeekSchedule() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find current week boundaries (Monday-Sunday)
    var dayOfWeek = today.getDay();
    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    var monday = new Date(today);
    monday.setDate(monday.getDate() + mondayOffset);
    var sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    var mondayStr = getLocalDateString(monday);
    var sundayStr = getLocalDateString(sunday);

    var schedule = {};
    var seen = {}; // Dedup by date+time+item

    // Build set of overridden/converted static task IDs
    var overridden = getValues(roadmapData.monthlyPlanner?.overriddenStatic);
    var convertedStaticIds = {};
    overridden.forEach(function(o) { convertedStaticIds[o.value || o] = true; });
    getValues(roadmapData.monthlyPlanner?.customTasks).forEach(function(ct) {
        if (ct.convertedFrom) convertedStaticIds[ct.convertedFrom] = true;
    });

    // 1. Add static tasks for current week
    MP_STATIC_TASKS.forEach(function(task) {
        if (task.date >= mondayStr && task.date <= sundayStr) {
            var staticId = 'static-' + task.date + '-' + task.item.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '');
            if (convertedStaticIds[staticId]) return;

            var key = task.date + '|' + (task.time || '') + '|' + task.item;
            if (seen[key]) return;
            seen[key] = true;

            var id = 'static_' + task.date + '_' + task.item.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '');
            schedule[id] = {
                id: id,
                date: task.date,
                time: task.time || '',
                item: task.item,
                type: task.type || 'academic',
                notes: task.notes || '',
                source: 'static'
            };
        }
    });

    // 2. Add custom tasks for current week
    getValues(roadmapData.monthlyPlanner?.customTasks).forEach(function(task) {
        if (!task.date || task.date < mondayStr || task.date > sundayStr) return;

        var key = task.date + '|' + (task.time || '') + '|' + task.item;
        if (seen[key]) return;
        seen[key] = true;

        schedule[task.id] = {
            id: task.id,
            date: task.date,
            time: task.time || '',
            endTime: task.endTime || '',
            item: task.item,
            type: task.type || 'other',
            notes: task.notes || '',
            source: task.syncedFromClinical ? 'clinical' : 'custom',
            clinicalAppointmentId: task.clinicalAppointmentId || null
        };
    });

    // 3. Add clinical appointments for current week (dedup with synced planner tasks)
    getValues(roadmapData.clinicalData?.appointments).forEach(function(apt) {
        if (!apt.date || apt.date < mondayStr || apt.date > sundayStr) return;
        if (apt.status === 'cancelled') return;
        var hiddenClinic = roadmapData.monthlyPlanner?.hiddenClinicTasks || {};
        if (hiddenClinic[apt.id]) return;

        // Skip if already added via synced custom task (prevents duplicate entries)
        if (schedule['clinic_' + apt.id]) return;

        var patient = roadmapData.clinicalData?.patientRecords?.[apt.patientId];
        var patientName = patient?.name || 'Patient';
        var itemText = patientName + ' - ' + (apt.procedures || 'Appointment');

        var key = apt.date + '|' + (apt.time || '') + '|' + itemText;
        if (seen[key]) return;
        seen[key] = true;

        var id = 'apt_' + apt.id;
        schedule[id] = {
            id: id,
            date: apt.date,
            time: apt.time || '',
            endTime: apt.time ? calculateEndTime(apt.time, apt.duration || 180) : '',
            item: itemText,
            type: 'clinic',
            notes: apt.notes || '',
            source: 'clinical',
            clinicalAppointmentId: apt.id,
            status: apt.status
        };
    });

    // Save to state
    if (!roadmapData.monthlyPlanner) roadmapData.monthlyPlanner = {};
    roadmapData.monthlyPlanner.currentWeekSchedule = schedule;
}

// ==================== HIDE/UNHIDE CLINIC TASKS ====================

function mpHideClinicTask(taskId, clinicalAppointmentId) {
    showCustomConfirm('Hide this clinic task from the planner? The appointment will remain in the Clinical tab.', function() {
        if (!roadmapData.monthlyPlanner.hiddenClinicTasks) roadmapData.monthlyPlanner.hiddenClinicTasks = {};

        var aptId = clinicalAppointmentId || taskId.replace('clinic_', '');
        roadmapData.monthlyPlanner.hiddenClinicTasks[aptId] = {
            hiddenAt: new Date().toISOString(),
            taskId: taskId
        };

        if (roadmapData.monthlyPlanner.customTasks && roadmapData.monthlyPlanner.customTasks[taskId]) {
            delete roadmapData.monthlyPlanner.customTasks[taskId];
        }

        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();

        // Rebuild week schedule for Stim Calc cross-app visibility
        if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();

        mpRenderAllCalendars();
        mpUpdateStats();
        showToast('Clinic task hidden from planner');
    }, null, 'Hide Task');
}

function mpUnhideClinicTask(aptId) {
    if (!roadmapData.monthlyPlanner?.hiddenClinicTasks?.[aptId]) return;
    delete roadmapData.monthlyPlanner.hiddenClinicTasks[aptId];
    clinicalDataDirty = true;
    syncClinicalToMonthlyPlanner();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Rebuild week schedule for Stim Calc cross-app visibility
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();

    mpRenderAllCalendars();
    mpUpdateStats();
    showToast('Task restored to planner');
}

function mpToggleHiddenTasksView() {
    var container = document.getElementById('mpHiddenTasksList');
    if (!container) return;

    if (container.style.display === 'none') {
        var hidden = roadmapData.monthlyPlanner?.hiddenClinicTasks || {};
        var appointments = roadmapData.clinicalData?.appointments || {};
        var patients = roadmapData.clinicalData?.patientRecords || {};
        var keys = Object.keys(hidden);

        if (keys.length === 0) {
            container.textContent = 'No hidden tasks.';
            container.style.cssText = 'color:#94a3b8; font-size:0.85em; padding:8px; display:block;';
        } else {
            // Build hidden tasks list — all text escaped via escapeHtml()
            var html = '';
            keys.forEach(function(aptId) {
                var apt = appointments[aptId];
                var aptName = apt ? (patients[apt.patientId]?.name || 'Patient') + ' - ' + (apt.procedures || 'Apt') : 'Deleted appointment';
                var safeId = aptId.replace(/'/g, "\\'");
                html += '<div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(100,116,139,0.2);">'
                    + '<span style="flex:1; color:#94a3b8; font-size:0.85em;">' + escapeHtml(aptName) + '</span>'
                    + '<button onclick="mpUnhideClinicTask(\'' + safeId + '\')" style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#10b981; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:0.8em;">Unhide</button>'
                    + '</div>';
            });
            container.innerHTML = html;
        }
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function calculateEndTime(startTime, durationMinutes) {
    if (!startTime) return '';
    var parts = startTime.split(':').map(Number);
    var totalMinutes = parts[0] * 60 + parts[1] + durationMinutes;
    var hours = Math.floor(totalMinutes / 60) % 24;
    var mins = totalMinutes % 60;
    return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape to close all modals
    if (e.key === 'Escape') {
        // Monthly Planner task modal
        const mpModal = document.getElementById('mpTaskModal');
        if (mpModal && mpModal.style.display === 'flex') {
            mpCloseTaskModal();
            return;
        }
        // Dynamic modals (created at runtime)
        const dynamicModals = ['addDeadlineModal', 'gradeInputModal', 'addPatientModal',
            'addAppointmentModal', 'lectureImportModal', 'confirmModal',
            'addCompItemModal', 'editCompItemModal'];
        for (const modalId of dynamicModals) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
                return;
            }
        }
    }

    // Quick add shortcuts (only when not in input/textarea)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }

    // 'N' key to focus note input when on Monthly tab
    if (e.key === 'n' || e.key === 'N') {
        const monthlyTab = document.getElementById('monthlyPlannerTab');
        if (monthlyTab && monthlyTab.style.display !== 'none') {
            const noteInput = document.getElementById('mpNewNote');
            if (noteInput) {
                e.preventDefault();
                noteInput.focus();
            }
        }
    }
});

// Handle Enter key in note input
document.addEventListener('DOMContentLoaded', function() {
    const noteInput = document.getElementById('mpNewNote');
    if (noteInput) {
        noteInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                mpAddNote();
            }
        });
    }
});
