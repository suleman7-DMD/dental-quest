// ============================================
// week-glance.js — Week at a Glance + Upcoming Deadlines (cross-app from D3 Roadmap)
// View-only module: reads monthlyPlanner, clinicalData, deadlines from graduationRoadmap Firebase path
// Loaded AFTER med-inventory.js, BEFORE init.js
//
// Dependencies: state.js (globals, utilities), firebase-sync.js (Firebase vars)
//
// Globals used: firebaseSyncEnabled, database, getLocalDateString, parseLocalDate,
//   escapeHtml, getValues, showToast
// ============================================

var scWeekGlanceData = {
    customTasks: {}, completedTasks: {}, appointments: {},
    editedDeadlines: {}, customDeadlines: {}, completedDeadlines: {},
    upcomingDeadlines: {}, currentWeekSchedule: {}
};
var scWeekGlanceListenersSet = false;

// ============================================
// FIREBASE CROSS-APP READ (real-time listeners)
// ============================================

function scWeekGlanceLoadFromFirebase() {
    if (!firebaseSyncEnabled || !database) return;
    if (scWeekGlanceListenersSet) return;

    var pin = localStorage.getItem('dentalQuestPin');
    if (!pin) return;
    var hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
    // Try new path first (graduationRoadmap), fall back to old path (d3Roadmap) for migration
    var base = 'users/' + hashedPin + '/graduationRoadmap/';

    scWeekGlanceListenersSet = true;

    var paths = {
        customTasks: base + 'monthlyPlanner/customTasks',
        completedTasks: base + 'monthlyPlanner/completedTasks',
        appointments: base + 'clinicalData/appointments',
        editedDeadlines: base + 'editedDeadlines',
        customDeadlines: base + 'customDeadlines',
        completedDeadlines: base + 'completedDeadlines',
        upcomingDeadlines: base + 'upcomingDeadlines',
        currentWeekSchedule: base + 'monthlyPlanner/currentWeekSchedule'
    };

    Object.keys(paths).forEach(function(key) {
        database.ref(paths[key]).on('value', function(snapshot) {
            scWeekGlanceData[key] = snapshot.val() || {};
            scWeekGlanceRender();
        }, function(err) {
            console.error('Week glance: failed to load ' + key + ':', err);
        });
    });
}

// ============================================
// DATE HELPERS
// ============================================

function scWeekGlanceGetCurrentWeek() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dayOfWeek = today.getDay();
    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    var monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var label = months[monday.getMonth()] + ' ' + monday.getDate() + '-' + sunday.getDate();
    if (monday.getMonth() !== sunday.getMonth()) {
        label = months[monday.getMonth()] + ' ' + monday.getDate() + ' - ' + months[sunday.getMonth()] + ' ' + sunday.getDate();
    }

    return { start: getLocalDateString(monday), end: getLocalDateString(sunday), label: label };
}

function scWeekGlanceFormatTime(time24) {
    if (!time24) return '';
    var parts = time24.split(':');
    var h = parseInt(parts[0]);
    var m = parseInt(parts[1]) || 0;
    var ampm = h >= 12 ? 'p' : 'a';
    var hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? hour + ampm : hour + ':' + String(m).padStart(2, '0') + ampm;
}

function scWeekGlanceGetDateRange(daysAhead) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var end = new Date(today);
    end.setDate(end.getDate() + daysAhead);
    return { start: getLocalDateString(today), end: getLocalDateString(end) };
}

// ============================================
// TYPE COLOR MAP (stim calc warm theme)
// ============================================

var SC_WEEK_TYPE_COLORS = {
    clinic: '#5E7A8A', exam: '#B85C5C', academic: '#6B7C5E',
    lecture: '#6B7C5E', life: '#5E8A5E', mandatory: '#C4923A',
    Quiz: '#C4923A', EXAM: '#B85C5C', Assignment: '#6B7C5E',
    Project: '#5E7A8A', Clinical: '#5E7A8A', other: '#9C948B'
};

// ============================================
// COLLECT UPCOMING DEADLINES
// ============================================

function scWeekGlanceGetDeadlines(startDate, endDate) {
    var deadlines = [];
    var completedIds = new Set();

    // Build completed set from completedDeadlines
    getValues(scWeekGlanceData.completedDeadlines).forEach(function(c) {
        if (c.id) completedIds.add(c.id);
    });

    // Custom deadlines (user-created, stored in Firebase)
    getValues(scWeekGlanceData.customDeadlines).forEach(function(dl) {
        if (!dl.date || dl.date < startDate || dl.date > endDate) return;
        var stableId = dl.id ?? '';
        var isDone = dl.done === true || completedIds.has(stableId);
        if (isDone) return;
        deadlines.push({
            date: dl.date,
            what: dl.what ?? 'Deadline',
            course: dl.course ?? '',
            type: dl.type ?? 'other',
            weight: dl.weight ?? '',
            isDone: false
        });
    });

    // Edited deadlines (static deadlines user has interacted with)
    Object.keys(scWeekGlanceData.editedDeadlines).forEach(function(key) {
        var dl = scWeekGlanceData.editedDeadlines[key];
        if (!dl || !dl.date || dl.date < startDate || dl.date > endDate) return;
        var isDone = dl.done === true || completedIds.has(key);
        if (isDone) return;
        // Avoid duplicates with custom deadlines
        var isDuplicate = deadlines.some(function(existing) {
            return existing.date === dl.date && existing.what === dl.what;
        });
        if (isDuplicate) return;
        deadlines.push({
            date: dl.date,
            what: dl.what ?? 'Deadline',
            course: dl.course ?? '',
            type: dl.type ?? 'other',
            weight: dl.weight ?? '',
            isDone: false
        });
    });

    // Upcoming deadlines (all static + recurring, synced from d3-roadmap initUI)
    getValues(scWeekGlanceData.upcomingDeadlines).forEach(function(dl) {
        if (!dl.date || dl.date < startDate || dl.date > endDate) return;
        // Avoid duplicates with custom and edited deadlines
        var isDuplicate = deadlines.some(function(existing) {
            return existing.date === dl.date && existing.what === dl.what;
        });
        if (isDuplicate) return;
        deadlines.push({
            date: dl.date,
            what: dl.what ?? 'Deadline',
            course: dl.course ?? '',
            type: dl.type ?? 'other',
            weight: dl.weight ?? '',
            isDone: false
        });
    });

    deadlines.sort(function(a, b) { return a.date.localeCompare(b.date); });
    return deadlines;
}

// ============================================
// RENDER
// ============================================

function scWeekGlanceRender() {
    var container = document.getElementById('scWeekGlanceContent');
    if (!container) return;

    var week = scWeekGlanceGetCurrentWeek();
    var todayStr = getLocalDateString(new Date());
    var dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // --- Collect weekly schedule items ---
    // Primary source: currentWeekSchedule (pre-built by d3-roadmap, includes static + custom + clinical, pre-deduped)
    // Fallback: customTasks + appointments (if currentWeekSchedule not yet synced)
    var items = [];
    var seenKeys = new Set();

    var scheduleItems = getValues(scWeekGlanceData.currentWeekSchedule);
    if (scheduleItems.length > 0) {
        // Use the pre-built schedule from d3-roadmap (complete: static tasks + custom + clinical)
        scheduleItems.forEach(function(t) {
            if (!t.date || t.date < week.start || t.date > week.end) return;
            var dedupKey = (t.date || '') + '|' + (t.time || '') + '|' + (t.item || '').substring(0, 30);
            if (seenKeys.has(dedupKey)) return;
            seenKeys.add(dedupKey);
            items.push({
                date: t.date, time: t.time ?? null,
                name: t.item ?? 'Untitled', type: t.type ?? 'other',
                id: ''
            });
        });
    } else {
        // Fallback: combine customTasks + appointments (missing static tasks)
        var clinicAptIds = new Set();
        getValues(scWeekGlanceData.customTasks).forEach(function(task) {
            if (task.date && task.date >= week.start && task.date <= week.end) {
                var dedupKey = (task.date || '') + '|' + (task.time || '') + '|' + (task.item || '').substring(0, 30);
                if (seenKeys.has(dedupKey)) return;
                seenKeys.add(dedupKey);
                if (task.clinicalAppointmentId) clinicAptIds.add(task.clinicalAppointmentId);
                items.push({ date: task.date, time: task.time ?? null, name: task.item ?? 'Untitled', type: task.type ?? 'other', id: task.id ?? '' });
            }
        });
        getValues(scWeekGlanceData.appointments).forEach(function(apt) {
            if (apt.date && apt.date >= week.start && apt.date <= week.end && apt.status !== 'cancelled') {
                if (clinicAptIds.has(apt.id)) return;
                var dedupKey = (apt.date || '') + '|' + (apt.time || '') + '|' + (apt.procedures || 'Clinic').substring(0, 30);
                if (seenKeys.has(dedupKey)) return;
                seenKeys.add(dedupKey);
                items.push({ date: apt.date, time: apt.time ?? null, name: apt.procedures ?? 'Clinic', type: 'clinic', id: apt.id ?? '' });
            }
        });
    }

    items.sort(function(a, b) {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return 0;
    });

    var completedSet = new Set();
    getValues(scWeekGlanceData.completedTasks).forEach(function(c) {
        completedSet.add(String(c.value || c));
    });

    // Week dates for dot row
    var weekDates = [];
    var mon = parseLocalDate(week.start);
    for (var i = 0; i < 7; i++) {
        var d = new Date(mon);
        d.setDate(mon.getDate() + i);
        weekDates.push(getLocalDateString(d));
    }

    var itemsByDate = {};
    items.forEach(function(item) {
        if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
        itemsByDate[item.date].push(item);
    });

    // --- Collect upcoming deadlines (today + 20 days) ---
    var dlRange = scWeekGlanceGetDateRange(20);
    var deadlines = scWeekGlanceGetDeadlines(dlRange.start, dlRange.end);

    // --- Clear & render ---
    container.textContent = '';
    container.style.maxHeight = 'none';
    container.style.overflowY = 'visible';
    // Let the parent card handle overflow if needed
    var parentCard = document.getElementById('scWeekGlanceCard');
    if (parentCard) {
        parentCard.style.flex = '1 1 auto';
        parentCard.style.maxHeight = '800px';
        parentCard.style.overflowY = 'auto';
    }

    // == SECTION 1: This Week ==
    var header = document.createElement('div');
    header.className = 'sc-week-glance-header';
    header.textContent = 'This Week: ' + week.label;
    container.appendChild(header);

    // Day dots row
    var dotsRow = document.createElement('div');
    dotsRow.className = 'sc-week-glance-days';
    weekDates.forEach(function(dateStr, idx) {
        var dot = document.createElement('div');
        dot.className = 'sc-week-glance-day-dot';
        if (dateStr === todayStr) dot.classList.add('is-today');
        else if (itemsByDate[dateStr] && itemsByDate[dateStr].length > 0) dot.classList.add('has-items');
        dot.textContent = dayNames[idx];
        dotsRow.appendChild(dot);
    });
    container.appendChild(dotsRow);

    // Weekly items list
    if (items.length > 0) {
        var list = document.createElement('div');
        list.className = 'sc-week-glance-list';
        var lastDate = '';
        items.forEach(function(item) {
            if (item.date !== lastDate) {
                lastDate = item.date;
                var dayLabel = document.createElement('div');
                dayLabel.className = 'sc-week-glance-day-label';
                var dateObj = parseLocalDate(item.date);
                var dayIdx = (dateObj.getDay() + 6) % 7;
                dayLabel.textContent = dayNames[dayIdx] + ' ' + dateObj.getDate();
                list.appendChild(dayLabel);
            }
            var isCompleted = completedSet.has(String(item.id));
            var row = document.createElement('div');
            row.className = 'sc-week-glance-item';
            if (isCompleted) row.classList.add('completed');

            var typeDot = document.createElement('div');
            typeDot.className = 'sc-week-glance-type-dot';
            typeDot.style.background = SC_WEEK_TYPE_COLORS[item.type] ?? SC_WEEK_TYPE_COLORS.other;
            row.appendChild(typeDot);

            var nameSpan = document.createElement('div');
            nameSpan.className = 'sc-week-glance-item-text';
            nameSpan.textContent = item.name;
            row.appendChild(nameSpan);

            if (item.time) {
                var timeSpan = document.createElement('div');
                timeSpan.className = 'sc-week-glance-item-time';
                timeSpan.textContent = scWeekGlanceFormatTime(item.time);
                row.appendChild(timeSpan);
            }
            list.appendChild(row);
        });
        container.appendChild(list);
    } else {
        var empty = document.createElement('div');
        empty.className = 'sc-week-glance-empty';
        empty.textContent = 'No schedule data';
        container.appendChild(empty);
    }

    // == SECTION 2: Upcoming Deadlines (max 15) ==
    if (deadlines.length > 0) {
        var dlHeader = document.createElement('div');
        dlHeader.className = 'sc-week-glance-header';
        dlHeader.style.marginTop = '10px';
        dlHeader.style.paddingTop = '8px';
        dlHeader.style.borderTop = '1px solid var(--border-subtle)';
        dlHeader.textContent = 'Upcoming Deadlines';
        container.appendChild(dlHeader);

        var dlList = document.createElement('div');
        dlList.className = 'sc-week-glance-list';

        var dlToShow = deadlines.slice(0, 15);
        dlToShow.forEach(function(dl) {
            var dateObj = parseLocalDate(dl.date);
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var daysOut = Math.round((dateObj - today) / (1000 * 60 * 60 * 24));

            var row = document.createElement('div');
            row.className = 'sc-week-glance-item';

            // Type dot
            var typeDot = document.createElement('div');
            typeDot.className = 'sc-week-glance-type-dot';
            typeDot.style.background = SC_WEEK_TYPE_COLORS[dl.type] ?? SC_WEEK_TYPE_COLORS.other;
            row.appendChild(typeDot);

            // Deadline text
            var nameSpan = document.createElement('div');
            nameSpan.className = 'sc-week-glance-item-text';
            var text = dl.what;
            if (dl.course) text = dl.course + ': ' + text;
            nameSpan.textContent = text;
            row.appendChild(nameSpan);

            // Days-out badge
            var badge = document.createElement('div');
            badge.className = 'sc-week-glance-item-time';
            if (daysOut === 0) {
                badge.textContent = 'TODAY';
                badge.style.color = 'var(--status-danger)';
                badge.style.fontWeight = '700';
            } else if (daysOut === 1) {
                badge.textContent = 'TMR';
                badge.style.color = 'var(--warning)';
                badge.style.fontWeight = '600';
            } else {
                badge.textContent = daysOut + 'd';
            }
            row.appendChild(badge);

            // Urgency highlight for imminent deadlines
            if (daysOut <= 3) {
                row.style.background = daysOut === 0 ? 'rgba(184, 92, 92, 0.08)' :
                                       daysOut <= 2 ? 'rgba(196, 146, 58, 0.08)' : '';
            }

            dlList.appendChild(row);
        });
        container.appendChild(dlList);

        if (deadlines.length > 15) {
            var moreLabel = document.createElement('div');
            moreLabel.style.cssText = 'text-align:center;color:var(--fg-tertiary);font-size:0.78em;padding:4px 0;';
            moreLabel.textContent = '+ ' + (deadlines.length - 15) + ' more on Roadmap app';
            container.appendChild(moreLabel);
        }
    }
}
