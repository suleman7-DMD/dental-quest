// ============================================
// CALENDAR MODULE — Master Calendar + Countdowns + Interactive Pill Calendar + Notes
// Extracted from index.html Phase 4
// Depends on: state.js (globals, getLocalDateString, parseLocalDate, getValues, getCount, generateId, escapeHtml, pillAssignments, calendarEvents, calendarNotes, medications)
// Depends on: firebase-sync.js (saveData)
// ============================================

let currentCalendarDate = new Date();
let editingCountdownId = null;
let currentNoteDate = null;

// ============================================
// MASTER CALENDAR FUNCTIONS
// ============================================

function openCalendar() {
    const modal = document.getElementById('calendarModal');
    if (!modal) {
        console.error('Calendar modal not found');
        return;
    }
    ensureModalOnBody(modal);
    _modalOpenTime = Date.now();
    modal.classList.add('show');
    try {
        renderMasterCalendar();
    } catch (error) {
        console.error('Error rendering calendar:', error);
    }
}

function closeCalendar() {
    const modal = document.getElementById('calendarModal');
    if (modal) modal.classList.remove('show');
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderMasterCalendar();
}

function renderMasterCalendar() {
    // Update today's date
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('calendarTodayDate').textContent = `Today: ${todayStr}`;

    // Update month display
    const monthStr = currentCalendarDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    document.getElementById('currentMonthDisplay').textContent = monthStr;

    // Render calendar grid
    renderCalendarGrid();

    // Render countdowns
    renderCountdowns();
}

function renderCalendarGrid() {
    const grid = document.getElementById('masterCalendarGrid');
    if (!grid) {
        console.error('Master calendar grid element not found');
        return;
    }

    // Safety check for medications data
    if (!medications || !medications['30mg'] || !medications['20mg']) {
        grid.innerHTML = '<div style="color: #b0b8c4; padding: 20px; text-align: center;">Loading medication data...</div>';
        return;
    }

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Category icons
    const categoryIcons = {
        financial: '\u{1F4B0}',
        academic: '\u{1F393}',
        clinic: '\u{1F3E5}',
        health: '\u2764\uFE0F',
        school: '\u{1F4DA}',
        future: '\u{1F680}',
        life: '\u{1F31F}'
    };

    let html = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">';

    // Day headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        html += `<div style="text-align: center; font-weight: 700; color: #b0b8c4; padding: 12px; font-size: 1.1em;">${day}</div>`;
    });

    // Empty cells before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div style="background: transparent;"></div>';
    }

    // Days of the month
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = getLocalDateString(currentDate);
        const isToday = currentDate.getTime() === todayDate.getTime();

        // Check if this is a refill day for either medication
        const is30mgRefill = medications['30mg'].refillDate &&
                            medications['30mg'].refillDate === dateStr;
        const is20mgRefill = medications['20mg'].refillDate &&
                            medications['20mg'].refillDate === dateStr;

        // Check pill assignments for color coding
        const has30mgPill = pillAssignments['30mg'][dateStr] === true;
        const has20mgPill = pillAssignments['20mg'][dateStr] === true;

        // Determine if this day needs pills (only if before refill date and refill is set)
        const needs30mg = medications['30mg'].refillDate &&
                         currentDate < parseLocalDate(medications['30mg'].refillDate) && !is30mgRefill;
        const needs20mg = medications['20mg'].refillDate &&
                         currentDate < parseLocalDate(medications['20mg'].refillDate) && !is20mgRefill;

        // Get events for this day
        const dayEvents = getValues(calendarEvents).filter(e => e.dateStr === dateStr);

        let dayBg = '#0d1117';
        let borderColor = '#30363d';

        if (isToday) {
            borderColor = '#3b82f6';
            dayBg = 'rgba(59, 130, 246, 0.1)';
        }

        html += `
            <div style="background: ${dayBg}; border: 2px solid ${borderColor}; border-radius: 8px; padding: 8px; height: 120px; max-height: 120px; overflow: hidden; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column;"
                 onmouseover="this.style.background='rgba(59, 130, 246, 0.15)'"
                 onmouseout="this.style.background='${dayBg}'">

                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px; flex-shrink: 0;">
                    <div style="font-size: 1.1em; font-weight: 700; color: ${isToday ? '#58a6ff' : '#e6edf3'};">
                        ${day}
                    </div>
                    ${(needs30mg || needs20mg) ? `
                        <div style="display: flex; gap: 3px;">
                            ${needs30mg ? `<div style="width: 8px; height: 8px; border-radius: 50%; background: ${has30mgPill ? '#10b981' : '#dc2626'}; flex-shrink: 0;"></div>` : ''}
                            ${needs20mg ? `<div style="width: 8px; height: 8px; border-radius: 50%; background: ${has20mgPill ? '#10b981' : '#dc2626'}; flex-shrink: 0;"></div>` : ''}
                        </div>
                    ` : ''}
                </div>

                <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px;">
                    ${is30mgRefill || is20mgRefill ? `
                        <div style="flex-shrink: 0;">
                            ${is30mgRefill ? `
                                <div style="background: rgba(16, 185, 129, 0.2); padding: 2px 4px; border-radius: 3px; margin-bottom: 2px; font-size: 0.65em; color: #10b981; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    \u{1F389} 30mg Refill
                                </div>
                                <div style="font-size: 0.6em; color: #b0b8c4; margin-left: 2px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${getMedStatus('30mg')}
                                </div>
                            ` : ''}
                            ${is20mgRefill ? `
                                <div style="background: rgba(16, 185, 129, 0.2); padding: 2px 4px; border-radius: 3px; margin-bottom: 2px; font-size: 0.65em; color: #10b981; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    \u{1F389} 20mg Refill
                                </div>
                                <div style="font-size: 0.6em; color: #b0b8c4; margin-left: 2px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${getMedStatus('20mg')}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${dayEvents.length > 0 ? `
                        <div style="flex: 1; overflow: hidden;">
                            ${dayEvents.slice(0, 2).map(event => `
                                <div style="background: rgba(59, 130, 246, 0.2); padding: 2px 4px; border-radius: 3px; margin-bottom: 2px; font-size: 0.65em; color: #e6edf3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${event.description}">
                                    ${categoryIcons[event.category]} ${event.description}
                                </div>
                            `).join('')}
                            ${dayEvents.length > 2 ? `
                                <div style="font-size: 0.6em; color: #b0b8c4; margin-top: 2px;">
                                    +${dayEvents.length - 2} more
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    html += '</div>';
    grid.innerHTML = html;
}

function getMedStatus(medType) {
    // Safety checks
    if (!medications || !medications[medType]) {
        return 'Loading...';
    }

    const med = medications[medType];
    if (!med.refillDate) {
        return 'No refill set';
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const refillDate = parseLocalDate(med.refillDate);

        const daysFromTomorrow = Math.ceil((refillDate - tomorrow) / (1000 * 60 * 60 * 24));
        const pillsNeeded = Math.max(0, daysFromTomorrow);
        const actualPills = med.pills || 0;
        const difference = actualPills - pillsNeeded;

        if (difference > 0) {
            return `${difference} pill${difference > 1 ? 's' : ''} ahead \u2713`;
        } else if (difference === 0) {
            return 'On track \u2713';
        } else {
            return `${Math.abs(difference)} pill${Math.abs(difference) > 1 ? 's' : ''} behind \u26A0\uFE0F`;
        }
    } catch (error) {
        console.error('Error in getMedStatus:', error);
        return 'Error calculating status';
    }
}

function renderCountdowns() {
    const container = document.getElementById('countdownsList');

    if (getCount(calendarEvents) === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #b0b8c4;">
                <p style="font-size: 1.2em;">No countdowns yet. Click "+ Add New Countdown" to create one!</p>
            </div>
        `;
        return;
    }

    // Sort by date (soonest first)
    const sortedEvents = getValues(calendarEvents).sort((a, b) => {
        return parseLocalDate(a.dateStr) - parseLocalDate(b.dateStr);
    });

    const categoryIcons = {
        financial: '\u{1F4B0}',
        academic: '\u{1F393}',
        clinic: '\u{1F3E5}',
        health: '\u2764\uFE0F',
        school: '\u{1F4DA}',
        future: '\u{1F680}',
        life: '\u{1F31F}'
    };

    const categoryNames = {
        financial: 'Financial',
        academic: 'Academic',
        clinic: 'Clinic',
        health: 'Health',
        school: 'School',
        future: 'Future',
        life: 'Life'
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const html = sortedEvents
        .filter(event => event && event.dateStr && typeof event.dateStr === 'string')
        .map(event => {
        // Parse date in local timezone to avoid off-by-one errors
        const parts = event.dateStr.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return '';
        const [year, month, day] = parts;
        const eventDate = new Date(year, month - 1, day);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgencyColor = '#10b981'; // Green (>14 days)
        let urgencyIcon = '';

        if (diffDays < 0) {
            // Past event - should have been filtered out
            return '';
        } else if (diffDays <= 7) {
            urgencyColor = '#dc2626'; // Red (<7 days)
            urgencyIcon = '\u26A0\uFE0F';
        } else if (diffDays <= 14) {
            urgencyColor = '#f59e0b'; // Yellow (7-14 days)
            urgencyIcon = '\u26A1';
        }

        const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = event.time ? ` at ${event.time}` : '';

        return `
            <div style="background: #0d1117; border-left: 4px solid ${urgencyColor}; padding: 20px; margin-bottom: 15px; border-radius: 8px; cursor: pointer; transition: all 0.2s;"
                 onmouseover="this.style.background='#161b22'"
                 onmouseout="this.style.background='#0d1117'"
                 onclick="editCountdown('${event.id}')">

                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <div style="font-size: 1.4em; font-weight: 700; color: #e6edf3; margin-bottom: 8px;">
                            ${urgencyIcon} ${escapeHtml(event.description)}
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; color: #b0b8c4; font-size: 0.95em;">
                            <span>${categoryIcons[event.category]} ${categoryNames[event.category]}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 2em; font-weight: 700; color: ${urgencyColor}; font-family: 'Monaco', monospace;">
                            ${diffDays}
                        </div>
                        <div style="color: #b0b8c4; font-size: 0.9em;">
                            day${diffDays !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                <div style="color: #b0b8c4; margin-bottom: 8px;">
                    \u{1F4C5} ${dateStr}${timeStr}
                </div>

                ${event.notes ? `
                    <div style="color: #b0b8c4; font-style: italic;">
                        \u{1F4DD} ${escapeHtml(event.notes)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function openAddCountdown() {
    editingCountdownId = null;
    document.getElementById('countdownDescription').value = '';
    document.getElementById('countdownCategory').value = 'financial';
    document.getElementById('countdownDate').value = '';
    document.getElementById('countdownTime').value = '';
    document.getElementById('countdownNotes').value = '';
    document.getElementById('countdownDeleteBtn').style.display = 'none';
    document.getElementById('saveCountdownBtn').textContent = '\u2713 Create Countdown';
    const modal = document.getElementById('addCountdownModal');
    ensureModalOnBody(modal);
    _modalOpenTime = Date.now();
    modal.classList.add('show');
}

function closeAddCountdown() {
    document.getElementById('addCountdownModal').classList.remove('show');
    editingCountdownId = null;
}

function saveCountdown() {
    const description = document.getElementById('countdownDescription').value.trim();
    const category = document.getElementById('countdownCategory').value;
    const date = document.getElementById('countdownDate').value;
    const time = document.getElementById('countdownTime').value;
    const notes = document.getElementById('countdownNotes').value.trim();

    if (!description || !date) {
        alert('Please enter a description and date!');
        return;
    }

    // Parse date in local timezone to avoid off-by-one errors
    const [year, month, day] = date.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day);
    eventDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
        alert('Cannot create countdown for past dates!');
        return;
    }

    if (editingCountdownId) {
        // Editing existing
        if (calendarEvents[editingCountdownId]) {
            calendarEvents[editingCountdownId].description = description;
            calendarEvents[editingCountdownId].category = category;
            calendarEvents[editingCountdownId].dateStr = date;
            calendarEvents[editingCountdownId].time = time;
            calendarEvents[editingCountdownId].notes = notes;
        }
    } else {
        // Creating new
        const id = generateId('event');
        calendarEvents[id] = {
            id: id,
            description,
            category,
            dateStr: date,
            time,
            notes
        };
    }

    saveData();
    renderMasterCalendar();
    closeAddCountdown();
    showToast(editingCountdownId ? 'Countdown updated!' : 'Countdown created!', '\u2713');
}

function editCountdown(eventId) {
    const event = calendarEvents[eventId];
    if (!event) return;

    const action = confirm(`Edit or Delete "${event.description}"?\n\nOK = Edit\nCancel = Go back\n\nTo delete, click Edit then use the Delete button.`);

    if (action) {
        // Edit
        editingCountdownId = eventId;
        document.getElementById('countdownDescription').value = event.description;
        document.getElementById('countdownCategory').value = event.category;
        document.getElementById('countdownDate').value = event.dateStr;
        document.getElementById('countdownTime').value = event.time || '';
        document.getElementById('countdownNotes').value = event.notes || '';
        document.getElementById('countdownDeleteBtn').style.display = 'block';
        document.getElementById('saveCountdownBtn').textContent = '\u2713 Save Changes';
        document.getElementById('addCountdownModal').classList.add('show');
    }
}

function deleteCountdown(eventId) {
    if (confirm('Delete this countdown?')) {
        if (calendarEvents[eventId]) {
            delete calendarEvents[eventId];
        }
        saveData();
        renderMasterCalendar();
        closeAddCountdown();
        showToast('Countdown deleted', '\u{1F5D1}\uFE0F');
    }
}

// ============================================
// INTERACTIVE CALENDAR FUNCTIONS (Pill Calendar)
// ============================================

function handleCalendarDayClick(event, medType, dateStr, displayDate, isRefillDay, totalPills) {
    // Right-click or ctrl-click opens note modal
    if (event.ctrlKey || event.metaKey || event.button === 2) {
        openNoteModal(dateStr, displayDate);
        return;
    }

    // Can't modify refill day
    if (isRefillDay) {
        openNoteModal(dateStr, displayDate);
        return;
    }

    // Toggle pill assignment
    const currentlyHas = pillAssignments[medType][dateStr] === true;

    if (currentlyHas) {
        // Removing pill - need to assign it to another day
        assignPillToNearestAvailableDay(medType, dateStr, totalPills);
    } else {
        // Adding pill - need to remove from another day
        removePillFromNearestAssignedDay(medType, dateStr, totalPills);
    }

    saveData();
    updateMedicationDisplay();
}

function assignPillToNearestAvailableDay(medType, excludeDate, totalPills) {
    // Remove pill from this day
    delete pillAssignments[medType][excludeDate];

    // Find nearest available day to assign pill (prioritize weekdays, then nearest)
    const allDates = Object.keys(pillAssignments[medType]).sort();
    const weekdays = allDates.filter(date => {
        const d = parseLocalDate(date);
        const dow = d.getDay();
        return dow >= 1 && dow <= 5 && !pillAssignments[medType][date];
    });

    const weekends = allDates.filter(date => {
        const d = parseLocalDate(date);
        const dow = d.getDay();
        return (dow === 0 || dow === 6) && !pillAssignments[medType][date];
    });

    // Try weekdays first, then weekends
    const targetDate = weekdays[0] || weekends[0];
    if (targetDate) {
        pillAssignments[medType][targetDate] = true;
    }
}

function removePillFromNearestAssignedDay(medType, targetDate, totalPills) {
    // Count current assignments
    const currentAssignments = Object.values(pillAssignments[medType]).filter(v => v === true).length;

    // Can't exceed total pills
    if (currentAssignments >= totalPills) {
        // Need to remove from another day - find nearest assigned day
        const assignedDates = Object.keys(pillAssignments[medType])
            .filter(date => pillAssignments[medType][date] === true && date !== targetDate)
            .sort();

        if (assignedDates.length > 0) {
            // Remove from first assigned day (nearest to start)
            delete pillAssignments[medType][assignedDates[0]];
        }
    }

    // Assign pill to target day
    pillAssignments[medType][targetDate] = true;
}

function resetPillAssignments(medType) {
    if (!confirm('Reset pill assignments to default (first available days)?')) {
        return;
    }

    // Clear all assignments for this med type
    pillAssignments[medType] = {};

    saveData();
    updateMedicationDisplay();
    showToast('Pill assignments reset', '\u{1F504}');
}

// ============================================
// CALENDAR NOTE FUNCTIONS
// ============================================

function openNoteModal(dateStr, displayDate) {
    currentNoteDate = dateStr;
    const noteInput = document.getElementById('noteInput');
    const charCount = document.getElementById('noteCharCount');
    const modalTitle = document.getElementById('noteModalTitle');

    // Set title
    modalTitle.textContent = `Note for ${displayDate}`;

    // Load existing note if any
    noteInput.value = calendarNotes[dateStr] || '';
    charCount.textContent = noteInput.value.length;

    // Add input listener for character count
    noteInput.oninput = function() {
        charCount.textContent = this.value.length;
    };

    const modal = document.getElementById('noteModal');
    ensureModalOnBody(modal);
    _modalOpenTime = Date.now();
    modal.classList.add('show');
}

function closeNoteModal() {
    document.getElementById('noteModal').classList.remove('show');
    currentNoteDate = null;
}

function saveNote() {
    if (!currentNoteDate) return;

    const noteInput = document.getElementById('noteInput');
    const noteText = noteInput.value.trim();

    if (noteText) {
        calendarNotes[currentNoteDate] = noteText;
        showToast('Note saved!', '\u{1F4DD}');
    } else {
        // If empty, delete the note
        delete calendarNotes[currentNoteDate];
        showToast('Note removed', '\u2139\uFE0F');
    }

    saveData();
    updateMedicationDisplay(); // Refresh both calendars
    closeNoteModal();
}

function deleteNote() {
    if (!currentNoteDate) return;

    if (confirm('Delete this note?')) {
        delete calendarNotes[currentNoteDate];
        saveData();
        updateMedicationDisplay();
        closeNoteModal();
        showToast('Note deleted', '\u{1F5D1}\uFE0F');
    }
}

// Toggle calendar breakdown
function toggleCalendar(medType) {
    const calendar = document.getElementById(`calendar${medType}`);
    const icon = document.getElementById(`expandIcon${medType}`);

    if (calendar && icon) {
        const isShowing = calendar.classList.contains('show');
        calendar.classList.toggle('show');
        icon.classList.toggle('expanded');
    }
}

// Generate calendar breakdown
function generateCalendar(medType, startDate, refillDate, pillsAvailable, daysNeeded) {
    const contentElement = document.getElementById(`calendarContent${medType}`);
    if (!contentElement) return;

    // Create calendar grid
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = '<div class="calendar-grid">';

    // Add day headers
    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Figure out what day of week to start
    const firstDay = new Date(startDate);
    const startDayOfWeek = firstDay.getDay();

    // Add empty cells for alignment
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Collect all days first
    const allDays = [];
    const current = new Date(startDate);
    const lastDay = new Date(refillDate);

    while (current <= lastDay) {
        const dateStr = getLocalDateString(current);
        const dayOfWeek = current.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isRefillDay = current.getTime() === lastDay.getTime();

        allDays.push({
            date: new Date(current),
            dateStr: dateStr,
            dayNum: current.getDate(),
            dayOfWeek: dayOfWeek,
            isWeekday: isWeekday,
            isRefillDay: isRefillDay
        });

        current.setDate(current.getDate() + 1);
    }

    // Check if we have custom assignments, otherwise use default
    const hasCustomAssignments = Object.keys(pillAssignments[medType]).length > 0;

    if (!hasCustomAssignments) {
        // Initialize default assignments (first N days get pills)
        for (let i = 0; i < allDays.length && i < pillsAvailable; i++) {
            if (!allDays[i].isRefillDay) {
                pillAssignments[medType][allDays[i].dateStr] = true;
            }
        }
    }

    // Render each day
    let pillsRemaining = pillsAvailable;
    allDays.forEach((day, index) => {
        const note = calendarNotes[day.dateStr] || '';
        const hasPill = pillAssignments[medType][day.dateStr] === true;

        let dayClass = '';
        let icon = '';
        let title = '';

        if (day.isRefillDay) {
            dayClass = 'refill';
            icon = '\u{1F389}';
            title = 'Refill Day!';
        } else if (hasPill) {
            dayClass = 'has-pill';
            icon = '\u{1F48A}';
            title = `Take pill - Click to unassign`;
            pillsRemaining--;
        } else {
            // No pill assigned
            if (day.isWeekday) {
                dayClass = 'no-pill-weekday';
                icon = '\u{1F6A8}';
                title = 'No medication - WEEKDAY - Click to assign pill';
            } else {
                dayClass = 'no-pill-weekend';
                icon = '\u26A0\uFE0F';
                title = 'No medication - Weekend - Click to assign pill';
            }
        }

        if (note) {
            title += ` | Note: ${note.replace(/\n/g, ' ')}`;
        }

        // Escape HTML and convert newlines to <br> for display
        const noteDisplay = note ? note
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>') : '';

        html += `
            <div class="calendar-day ${dayClass}" title="${title}"
                 onclick="handleCalendarDayClick(event, '${medType}', '${day.dateStr}', '${day.date.toDateString()}', ${day.isRefillDay}, ${pillsAvailable})">
                <button class="day-note-btn"
                        onclick="event.stopPropagation(); openNoteModal('${day.dateStr}', '${day.date.toDateString()}')"
                        title="Add/edit note">+</button>
                <div class="calendar-day-num">${day.dayNum}</div>
                <div class="calendar-day-icon">${icon}</div>
                ${noteDisplay ? `<div class="calendar-day-note">${noteDisplay}</div>` : ''}
            </div>
        `;
    });

    html += '</div>';

    // Add legend
    html += `
        <div class="calendar-legend">
            <div class="legend-item">
                <div class="legend-box has-pill"></div>
                <span>Have pill</span>
            </div>
            <div class="legend-item">
                <div class="legend-box no-pill-weekday"></div>
                <span>No pill (weekday)</span>
            </div>
            <div class="legend-item">
                <div class="legend-box no-pill-weekend"></div>
                <span>No pill (weekend)</span>
            </div>
            <div class="legend-item">
                <div class="legend-box surplus"></div>
                <span>Extra pill</span>
            </div>
            <div class="legend-item">
                <div class="legend-box refill"></div>
                <span>Refill day</span>
            </div>
        </div>
    `;

    contentElement.innerHTML = html;
}
