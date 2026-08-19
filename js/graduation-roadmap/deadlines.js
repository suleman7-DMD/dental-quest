// deadlines.js — STATIC_DEADLINES, deadline rendering, CRUD, grade sync

// ==================== UPCOMING DEADLINES CROSS-APP SYNC ====================
// Lightweight rebuild of roadmapData.upcomingDeadlines for Stim Calc visibility.
// Called after every deadline mutation (add, edit date, toggle done, delete).
function rebuildUpcomingDeadlines() {
    // When the last deadline is removed, clear the cross-app object too —
    // otherwise Stim Calc keeps reading stale entries forever
    if (!deadlines || !deadlines.length) { roadmapData.upcomingDeadlines = {}; return; }
    try {
        var todayStr = getLocalDateString(new Date());
        var upcomingObj = {};
        var idx = 0;
        deadlines.forEach(function(d) {
            if (d.date < todayStr || d.done) return;
            var key = 'dl_' + idx++;
            upcomingObj[key] = {
                date: d.date, day: d.day ?? '', what: d.what,
                course: d.course ?? '', weight: d.weight ?? '—', type: d.type ?? 'Other'
            };
        });
        roadmapData.upcomingDeadlines = upcomingObj;
    } catch(e) { console.error('Error rebuilding upcoming deadlines:', e); }
}

// ==================== DEADLINES DATA ====================
// D3 Spring-2026 static deadlines retired 2026-08-13. Deadlines are now fully
// data-driven (roadmapData.customDeadlines + edited/completed overlays).
// Array retained (empty) because init.js seeds the working 'deadlines' array
// from it and overlays customDeadlines on top.
const STATIC_DEADLINES = [];

// Working deadlines array - reset from STATIC_DEADLINES at start of each initUI() call
// to prevent duplicate custom deadlines from accumulating
let deadlines = [];

// D3 Spring-2026 exam countdown retired 2026-08-13 (renderExamCountdown + its
// #examCountdownTable in the Academics tab were deleted with the tab).

function renderDeadlines() {
    const container = document.getElementById('deadlinesMonthsContainer');
    if (!container) return;

    // Sort ALL deadlines by date to ensure correct ordering
    deadlines.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    // Determine today for archive split (using local date, no UTC issues)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Split into active vs past-completed (archive)
    const pastCompleted = [];
    const active = [];
    deadlines.forEach(d => {
        const isDone = d.done ?? false;
        const [y, mo, day] = (d.date || '').split('-').map(Number);
        if (y) {
            const dDate = new Date(y, mo - 1, day);
            if (dDate < today && isDone) {
                pastCompleted.push(d);
                return;
            }
        }
        // Active: future, or past-but-not-done (overdue!), or no valid date
        active.push(d);
    });

    // Row builder (shared by all month groups)
    function buildDeadlineRow(d) {
        const days = getCountdown(d.date);
        const isPassed = days < 0;
        const deadlineId = getDeadlineId(d);
        const isDone = d.done ?? false;
        const grade = d.grade !== undefined ? d.grade : null;

        // Row styling based on done status
        const rowStyle = isDone ? 'opacity: 0.6; text-decoration: line-through;' : '';
        const rowClass = isPassed ? 'passed' : '';

        return '<tr class="' + rowClass + '" data-deadline-id="' + deadlineId + '" style="' + rowStyle + '">'
            + '<td>'
            + '<button class="deadline-checkbox-btn" onclick="toggleDeadlineDoneById(\'' + deadlineId + '\')"'
            + ' style="background: ' + (isDone ? '#059669' : 'rgba(255,255,255,0.1)') + ';'
            + ' border: 2px solid ' + (isDone ? '#059669' : '#4b5563') + ';'
            + ' color: ' + (isDone ? 'white' : '#94a3b8') + ';'
            + ' width: 32px; height: 32px;'
            + ' border-radius: 6px; cursor: pointer;'
            + ' font-size: 1.1em; display: flex;'
            + ' align-items: center; justify-content: center;"'
            + ' title="' + (isDone ? 'Mark incomplete' : 'Mark complete') + '">'
            + (isDone ? '✓' : '○')
            + '</button>'
            + '</td>'
            + '<td>'
            + '<input type="date" class="deadline-date-picker"'
            + ' value="' + d.date + '"'
            + ' data-deadline-id="' + deadlineId + '"'
            + ' onchange="handleDateChange(this)">'
            + '</td>'
            + '<td>' + escapeHtml(d.day ?? '') + '</td>'
            + '<td>' + (isDone && grade !== null ? '<span style="background: #059669; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">' + grade + '%</span>' : getCountdownBadge(days, d.tbd)) + '</td>'
            + '<td class="deadline-what-cell">'
            + '<input type="text" class="deadline-edit-input"'
            + ' value="' + escapeHtml(d.what) + '"'
            + ' data-deadline-id="' + deadlineId + '"'
            + ' data-field="what"'
            + ' data-original="' + escapeHtml(d.what) + '"'
            + ' onblur="handleTextEdit(this)"'
            + ' onkeydown="if(event.key===\'Enter\'){this.blur();}"'
            + ' style="background: rgba(255,255,255,0.1); border: 1px dashed #4b5563; padding: 4px 8px; border-radius: 4px; color: #e2e8f0; width: 100%;">'
            + '</td>'
            + '<td>'
            + '<input type="text" class="deadline-edit-input"'
            + ' value="' + escapeHtml(d.course) + '"'
            + ' data-deadline-id="' + deadlineId + '"'
            + ' data-field="course"'
            + ' data-original="' + escapeHtml(d.course) + '"'
            + ' onblur="handleTextEdit(this)"'
            + ' onkeydown="if(event.key===\'Enter\'){this.blur();}"'
            + ' style="background: rgba(255,255,255,0.1); border: 1px dashed #4b5563; padding: 4px 8px; border-radius: 4px; color: #e2e8f0; width: 120px;">'
            + '</td>'
            + '<td>'
            + '<input type="text" class="deadline-edit-input"'
            + ' value="' + escapeHtml(d.weight) + '"'
            + ' data-deadline-id="' + deadlineId + '"'
            + ' data-field="weight"'
            + ' data-original="' + escapeHtml(d.weight) + '"'
            + ' onblur="handleTextEdit(this)"'
            + ' onkeydown="if(event.key===\'Enter\'){this.blur();}"'
            + ' style="background: rgba(255,255,255,0.1); border: 1px dashed #4b5563; padding: 4px 8px; border-radius: 4px; color: #e2e8f0; width: 60px;">'
            + '</td>'
            + '<td>' + escapeHtml(d.type ?? '') + '</td>'
            + '<td>'
            + '<button onclick="deleteDeadlineById(\'' + deadlineId + '\')"'
            + ' style="background: rgba(220, 38, 38, 0.2); border: 1px solid #dc2626; color: #f87171; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em;"'
            + ' title="Delete this deadline">🗑️</button>'
            + '</td>'
            + '</tr>';
    }

    // Group active deadlines by calendar month (YYYY-MM). Entries without a
    // parseable date (e.g. TBD) go into an "Unscheduled" bucket up top.
    const byMonth = {};
    const unscheduled = [];
    active.forEach(d => {
        const key = (d.date || '').slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(key)) {
            (byMonth[key] = byMonth[key] || []).push(d);
        } else {
            unscheduled.push(d);
        }
    });

    // Current month always renders, even when empty
    const currentKey = getLocalDateString(new Date()).slice(0, 7);
    if (!byMonth[currentKey]) byMonth[currentKey] = [];

    const monthKeys = Object.keys(byMonth).sort();
    const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const monthLabel = key => {
        const [y, m] = key.split('-').map(Number);
        return '📅 ' + (MONTH_NAMES[m - 1] || '?') + ' ' + y;
    };

    const theadHtml = '<thead><tr>'
        + '<th style="width: 42px;"></th>'
        + '<th>Date</th>'
        + '<th>Day</th>'
        + '<th>Countdown</th>'
        + '<th class="deadline-what-cell">What</th>'
        + '<th>Course</th>'
        + '<th>% of Grade</th>'
        + '<th>Type</th>'
        + '<th style="width: 50px;"></th>'
        + '</tr></thead>';
    const monthTable = rows =>
        '<div class="table-container"><table>' + theadHtml
        + '<tbody>' + rows.map(buildDeadlineRow).join('') + '</tbody>'
        + '</table></div>';

    let html = '';
    if (unscheduled.length) {
        html += '<div class="month-header">🗓️ UNSCHEDULED / TBD</div>' + monthTable(unscheduled);
    }
    monthKeys.forEach(key => {
        html += '<div class="month-header">' + monthLabel(key) + '</div>';
        if (byMonth[key].length) {
            html += monthTable(byMonth[key]);
        } else {
            html += '<div class="note" style="margin-bottom: 15px; color: #9ca3af;">No deadlines this month — use <strong>+ Add Deadline</strong> above.</div>';
        }
    });

    // Archive of past completed deadlines (collapsible; preserve open state)
    if (pastCompleted.length > 0) {
        const archiveContent = document.getElementById('past-deadlines-archive-content');
        const wasOpen = archiveContent ? archiveContent.style.display !== 'none' : false;

        let pastRows = '';
        pastCompleted.forEach(d => {
            const grade = d.grade !== undefined && d.grade !== null ? d.grade : null;
            const gradeInfo = grade !== null ? (' — Grade: ' + escapeHtml(String(grade)) + '%') : '';
            pastRows += '<div style="padding: 6px 12px; border-bottom: 1px solid #1e293b; font-size: 13px; color: #9ca3af; display: flex; flex-wrap: wrap; gap: 4px; align-items: baseline;">'
                + '<span style="color: #6b7280; min-width: 90px;">' + escapeHtml(d.date || '') + '</span>'
                + '<span style="color: #60a5fa; min-width: 100px;">' + escapeHtml(d.course || '') + '</span>'
                + '<span style="flex: 1;">' + escapeHtml(d.what || '') + '</span>'
                + '<span style="color: #10b981;">' + gradeInfo + '</span>'
                + '</div>';
        });

        html += '<div id="past-deadlines-archive-section">'
            + '<div style="margin-top: 24px; border-top: 1px solid #374151; padding-top: 16px;">'
            + '<button onclick="var arc=document.getElementById(\'past-deadlines-archive-content\'); arc.style.display = arc.style.display===\'none\' ? \'block\' : \'none\'; this.querySelector(\'.archive-arrow\').textContent = arc.style.display===\'none\' ? \'▸\' : \'▾\';"'
            + ' style="background: #1e293b; border: 1px solid #374151; color: #9ca3af; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; width: 100%; text-align: left;">'
            + '<span class="archive-arrow">' + (wasOpen ? '▾' : '▸') + '</span> 📦 Past Deadlines (' + pastCompleted.length + ' completed)'
            + '</button>'
            + '<div id="past-deadlines-archive-content" style="display: ' + (wasOpen ? 'block' : 'none') + '; margin-top: 12px;">'
            + '<div style="opacity: 0.7;">' + pastRows + '</div>'
            + '</div>'
            + '</div>'
            + '</div>';
    }

    container.innerHTML = html;
}

// Handle date picker changes
function handleDateChange(inputEl) {
    const deadlineId = inputEl.dataset.deadlineId;
    const newDate = inputEl.value; // Already in YYYY-MM-DD format

    if (!deadlineId) {
        console.error('No deadline ID found on input');
        return;
    }

    let index = deadlines.findIndex(d => getDeadlineId(d) === deadlineId);
    // Fallback: search by _originalStableId (handles post-edit IDs)
    if (index === -1) {
        index = deadlines.findIndex(d => d._originalStableId === deadlineId);
    }
    if (index === -1) {
        console.error('Deadline not found for ID:', deadlineId);
        return;
    }

    if (!newDate) {
        return;
    }

    const deadline = deadlines[index];
    const oldDate = deadline.date;

    if (oldDate === newDate) {
        return;
    }

    // Use _originalStableId (set at initUI time) for persistence key
    const originalStableId = deadline._originalStableId || getDeadlineId(deadline);
    console.log('[D3-EDIT] Date changed:', originalStableId, oldDate, '->', newDate);

    // Parse the new date
    const dateObj = new Date(newDate + 'T12:00:00'); // Add time to avoid timezone issues

    // Update the deadline object
    deadline.date = newDate;
    deadline.day = dateObj.toLocaleString('en-US', { weekday: 'short' });
    deadline.month = dateObj.toLocaleString('en-US', { month: 'long' }).toLowerCase();


    // Store the edit using STABLE ID (not array index!)
    if (!roadmapData.editedDeadlines) roadmapData.editedDeadlines = {};
    roadmapData.editedDeadlines[originalStableId] = {
        date: deadline.date,
        day: deadline.day,
        month: deadline.month,
        what: deadline.what,
        course: deadline.course,
        weight: deadline.weight,
        type: deadline.type,
        tbd: deadline.tbd,
        done: deadline.done ?? false,
        grade: deadline.grade ?? null,
        updatedAt: new Date().toISOString()
    };

    // CRITICAL FIX: Also update customDeadlines if this is a custom deadline
    // editedDeadlines are only applied to STATIC deadlines in initUI().
    // Custom deadlines load from customDeadlines — if we don't update it here,
    // the date change is lost on reload.
    if (deadline.custom && deadline.id && roadmapData.customDeadlines && roadmapData.customDeadlines[deadline.id]) {
        roadmapData.customDeadlines[deadline.id].date = deadline.date;
        roadmapData.customDeadlines[deadline.id].day = deadline.day;
        roadmapData.customDeadlines[deadline.id].month = deadline.month;
        roadmapData.customDeadlines[deadline.id].updatedAt = new Date().toISOString();
    }

    // Save immediately
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }

    // Re-render
    renderDeadlines();
    renderDashboard();
    rebuildUpcomingDeadlines();

    showToast('Date updated!');
}

// Handle text field edits (name, course, weight)
function handleTextEdit(inputEl) {
    const deadlineId = inputEl.dataset.deadlineId;
    const field = inputEl.dataset.field;
    const value = inputEl.value.trim();
    const original = inputEl.dataset.original || '';

    if (value === original) {
        return;
    }

    if (!deadlineId) {
        console.error('No deadline ID found on input');
        return;
    }

    let index = deadlines.findIndex(d => getDeadlineId(d) === deadlineId);
    // Fallback: search by _originalStableId (handles post-edit IDs)
    if (index === -1) {
        index = deadlines.findIndex(d => d._originalStableId === deadlineId);
    }
    if (index === -1) {
        console.error('Deadline not found for ID:', deadlineId);
        return;
    }

    const deadline = deadlines[index];

    // Use _originalStableId (set at initUI time) for persistence key
    const originalStableId = deadline._originalStableId || getDeadlineId(deadline);
    console.log('[D3-EDIT] Text changed:', originalStableId, field, ':', original, '->', value);

    // Update the field
    deadline[field] = value;

    // Store the edit using STABLE ID (not array index!)
    if (!roadmapData.editedDeadlines) roadmapData.editedDeadlines = {};
    roadmapData.editedDeadlines[originalStableId] = {
        date: deadline.date,
        day: deadline.day,
        month: deadline.month,
        what: deadline.what,
        course: deadline.course,
        weight: deadline.weight,
        type: deadline.type,
        tbd: deadline.tbd,
        done: deadline.done ?? false,
        grade: deadline.grade ?? null,
        updatedAt: new Date().toISOString()
    };

    // CRITICAL FIX: Also update customDeadlines if this is a custom deadline
    // editedDeadlines are only applied to STATIC deadlines in initUI().
    // Custom deadlines load from customDeadlines — if we don't update it here,
    // name/course/weight changes are lost on reload.
    if (deadline.custom && deadline.id && roadmapData.customDeadlines && roadmapData.customDeadlines[deadline.id]) {
        roadmapData.customDeadlines[deadline.id][field] = value;
        roadmapData.customDeadlines[deadline.id].updatedAt = new Date().toISOString();
    }

    // Save immediately
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }

    // Re-render
    renderDeadlines();
    renderDashboard();
    rebuildUpcomingDeadlines();

    showToast(`${field} updated!`);
}

function handleDeadlineKeydown(event, inputEl) {
    if (event.key === 'Enter') {
        event.preventDefault();
        inputEl.blur();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        inputEl.value = inputEl.dataset.original || '';
        inputEl.blur();
    }
}

// ==================== ADD NEW DEADLINE ====================
function addNewDeadline() {
    // Prevent modal stacking
    var existing = document.getElementById('addDeadlineModal');
    if (existing) existing.remove();
    // Create a modal for better UX
    const modal = document.createElement('div');
    modal.id = 'addDeadlineModal';
    modal.innerHTML = `
        <div class="js-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="js-modal-content" style="background: #1e293b; padding: 25px; border-radius: 12px; width: 90%; max-width: 450px; border: 1px solid #334155;">
                <h3 style="color: #60a5fa; margin-bottom: 20px; font-size: 1.2em;">➕ Add New Deadline</h3>

                <div style="margin-bottom: 15px;">
                    <label style="color: #b0bcc8; display: block; margin-bottom: 5px;">What is it?</label>
                    <input type="text" id="newDeadlineWhat" placeholder="e.g., Quiz 5 due" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="color: #b0bcc8; display: block; margin-bottom: 5px;">Date</label>
                    <input type="date" id="newDeadlineDate" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; box-sizing: border-box;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="color: #b0bcc8; display: block; margin-bottom: 5px;">Course</label>
                        <select id="newDeadlineCourse" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0;">
                            <option value="Oral Med">Oral Med</option>
                            <option value="Pain Control 2">Pain Control 2</option>
                            <option value="Critical Thinking">Critical Thinking</option>
                            <option value="Peds">Peds</option>
                            <option value="Peds ⚠️">Peds ⚠️</option>
                            <option value="Perio 2">Perio 2</option>
                            <option value="Orthodontics">Orthodontics</option>
                            <option value="Geriatrics">Geriatrics</option>
                            <option value="Clinic">Clinic</option>
                            <option value="Group Practice 9">Group Practice 9</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label style="color: #b0bcc8; display: block; margin-bottom: 5px;">Weight</label>
                        <input type="text" id="newDeadlineWeight" placeholder="e.g., 10%" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; box-sizing: border-box;">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="color: #b0bcc8; display: block; margin-bottom: 5px;">Type</label>
                    <select id="newDeadlineType" style="width: 100%; padding: 10px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0;">
                        <option value="Quiz">Quiz</option>
                        <option value="EXAM">EXAM</option>
                        <option value="Assignment">Assignment</option>
                        <option value="Take-home">Take-home</option>
                        <option value="Project">Project</option>
                        <option value="Module">Module</option>
                        <option value="Presentation">Presentation</option>
                        <option value="Clinical">Clinical</option>
                        <option value="Info">Info</option>
                        <option value="No Class">No Class</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="document.getElementById('addDeadlineModal').remove()" style="padding: 10px 20px; background: #374151; border: none; border-radius: 6px; color: #e2e8f0; cursor: pointer;">Cancel</button>
                    <button onclick="submitNewDeadline()" style="padding: 10px 20px; background: #059669; border: none; border-radius: 6px; color: white; font-weight: 600; cursor: pointer;">Add Deadline</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Focus the first input
    document.getElementById('newDeadlineWhat').focus();
}

function submitNewDeadline() {
    const what = document.getElementById('newDeadlineWhat').value.trim();
    const date = document.getElementById('newDeadlineDate').value;
    const course = document.getElementById('newDeadlineCourse').value;
    const weight = document.getElementById('newDeadlineWeight').value.trim() || '—';
    const type = document.getElementById('newDeadlineType').value;

    if (!what) {
        showToast('Please enter what the deadline is for', 'warning');
        return;
    }
    if (!date) {
        showToast('Please select a date', 'warning');
        return;
    }

    // FIX: Check for duplicate deadlines (same date + what + course)
    const isDuplicate = deadlines.some(d =>
        d.date === date &&
        d.what.toLowerCase() === what.toLowerCase() &&
        d.course === course
    );
    if (isDuplicate) {
        showToast('A deadline with the same date, description, and course already exists.', 'warning');
        return;
    }

    const month = new Date(date + 'T12:00:00').toLocaleString('en-US', { month: 'long' }).toLowerCase();

    const newDeadline = {
        date: date,
        day: new Date(date + 'T12:00:00').toLocaleString('en-US', { weekday: 'short' }),
        what: what,
        course: course,
        weight: weight,
        type: type,
        month: month,
        custom: true, // Mark as custom so we know it can be deleted
        createdAt: new Date().toISOString()
    };

    deadlines.push(newDeadline);

    // Sort deadlines by date
    deadlines.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    // Store in roadmapData
    if (!roadmapData.customDeadlines || Array.isArray(roadmapData.customDeadlines)) {
        roadmapData.customDeadlines = migrateArrayToObject(roadmapData.customDeadlines, 'deadline');
    }
    const deadlineId = generateId('deadline');
    newDeadline.id = deadlineId;
    console.log('[D3-ADD] Custom deadline added:', deadlineId, what);
    roadmapData.customDeadlines[deadlineId] = newDeadline;

    // FIX: Write to localStorage BEFORE saveData() so changes persist even if guards block
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }
    renderDeadlines();
    renderDashboard();
    rebuildUpcomingDeadlines();

    // Close modal
    document.getElementById('addDeadlineModal').remove();

    showToast('✅ Deadline added!');
}

// ==================== TOGGLE DEADLINE DONE ====================
function toggleDeadlineDone(index) {
    if (index < 0 || index >= deadlines.length) {
        console.error('Invalid deadline index:', index);
        return;
    }

    const deadline = deadlines[index];
    const deadlineId = deadline._originalStableId || getDeadlineId(deadline);

    if (deadline.done) {
        // Unchecking - mark as incomplete
        deadline.done = false;
        deadline.grade = null;

        // Remove from completedDeadlines using original stable ID.
        // Tombstone first: un-completion is a key-deletion — without it the entry
        // resurrects from the other device's copy during key-union merges.
        if (roadmapData.completedDeadlines) {
            if (!roadmapData.deletedCompletedDeadlineIds) roadmapData.deletedCompletedDeadlineIds = {};
            roadmapData.deletedCompletedDeadlineIds[sanitizeFirebaseKey(deadlineId)] = new Date().toISOString();
            delete roadmapData.completedDeadlines[deadlineId];
            // Also try to clean up any old index-based entries
            delete roadmapData.completedDeadlines[index];
        }

        // Also update customDeadlines if this is a custom deadline
        if (deadline.custom && deadline.id && roadmapData.customDeadlines[deadline.id]) {
            roadmapData.customDeadlines[deadline.id].done = false;
            roadmapData.customDeadlines[deadline.id].grade = null;
            roadmapData.customDeadlines[deadline.id].updatedAt = new Date().toISOString();
        }

        // Store explicit "not done" override so static done:true doesn't win on reload
        if (!roadmapData.editedDeadlines) roadmapData.editedDeadlines = {};
        roadmapData.editedDeadlines[deadlineId] = {
            ...roadmapData.editedDeadlines[deadlineId],
            date: deadline.date,
            day: deadline.day,
            month: deadline.month,
            what: deadline.what,
            course: deadline.course,
            weight: deadline.weight,
            type: deadline.type,
            done: false,
            grade: null,
            updatedAt: new Date().toISOString()
        };

        // Update grades if this was synced
        syncDeadlineToGrades(deadline, false);

        // CROSS-SYNC: If this deadline is linked to a clinical appointment, uncomplete it
        if (deadline.clinicalAptId && typeof uncompleteAppointment === 'function') {
            const apt = roadmapData.clinicalData?.appointments?.[deadline.clinicalAptId];
            if (apt && apt.status === 'completed') {
                clinicalDataDirty = true;
                apt.status = 'scheduled';
                delete apt.completedAt;
                apt.lastUpdated = new Date().toISOString();
                // Uncomplete cascade: remove procedures recorded at completion
                // (with tombstones so merge doesn't resurrect them), then recalc lastVisit
                if (roadmapData.clinicalData.completedProcedures) {
                    if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
                    getValues(roadmapData.clinicalData.completedProcedures)
                        .filter(p => p && p.appointmentId === deadline.clinicalAptId)
                        .forEach(p => {
                            roadmapData.clinicalData.deletedProcedureIds[p.id] = new Date().toISOString();
                            delete roadmapData.clinicalData.completedProcedures[p.id];
                        });
                }
                if (apt.patientId && typeof recalculatePatientLastVisit === 'function') {
                    recalculatePatientLastVisit(apt.patientId);
                }
                // Also unmark the planner task
                if (typeof unmarkPlannerTaskDone === 'function') {
                    unmarkPlannerTaskDone(deadline.clinicalAptId);
                }
            }
        }

        // FIX: Write to localStorage BEFORE saveData() so changes persist even if guards block
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        const saved = saveData();
        if (!saved) {
            showToast('Save blocked — try refreshing', 'error');
            return;
        }
        renderDeadlines();
        renderDashboard();
        rebuildUpcomingDeadlines();
        if (typeof renderAppointmentsList === 'function') renderAppointmentsList();
        if (typeof mpRenderAllCalendars === 'function') mpRenderAllCalendars();

        // BUG-D017: Propagate appointment uncomplete to planner/schedule
        clinicalDataDirty = true;
        if (typeof syncClinicalToMonthlyPlanner === 'function') syncClinicalToMonthlyPlanner();
        if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
        if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();

        showToast('Marked incomplete');
    } else {
        // Checking - show grade input modal
        showGradeInputModal(index, deadline);
    }
}

// ID-based wrapper for toggleDeadlineDone (prevents index race conditions)
function toggleDeadlineDoneById(deadlineId) {
    let index = deadlines.findIndex(d => getDeadlineId(d) === deadlineId);
    // Fallback: search by _originalStableId (handles post-edit IDs)
    if (index === -1) {
        index = deadlines.findIndex(d => d._originalStableId === deadlineId);
    }
    if (index === -1) {
        showToast('Deadline not found', 'error');
        console.error('toggleDeadlineDoneById: Deadline not found for ID:', deadlineId);
        return;
    }
    toggleDeadlineDone(index);
}

// ID-based wrapper for deleteDeadline (prevents index race conditions)
function deleteDeadlineById(deadlineId) {
    let index = deadlines.findIndex(d => getDeadlineId(d) === deadlineId);
    // Fallback: search by _originalStableId (handles post-edit IDs)
    if (index === -1) {
        index = deadlines.findIndex(d => d._originalStableId === deadlineId);
    }
    if (index === -1) {
        showToast('Deadline not found', 'error');
        console.error('deleteDeadlineById: Deadline not found for ID:', deadlineId);
        return;
    }
    deleteDeadline(index);
}

function showGradeInputModal(index, deadline) {
    var existing = document.getElementById('gradeInputModal');
    if (existing) existing.remove();
    const deadlineId = deadline._originalStableId || getDeadlineId(deadline);
    const modal = document.createElement('div');
    modal.id = 'gradeInputModal';
    modal.dataset.deadlineId = deadlineId;
    modal.innerHTML = `
        <div class="js-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="js-modal-content" style="background: #1e293b; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; border: 1px solid #334155;">
                <h3 style="color: #10b981; margin-bottom: 15px;">✓ Mark Complete</h3>
                <p style="color: #e2e8f0; margin-bottom: 5px;"><strong>${escapeHtml(deadline.what)}</strong></p>
                <p style="color: #b0bcc8; margin-bottom: 20px;">${escapeHtml(deadline.course ?? '')} | ${escapeHtml(String(deadline.weight ?? '—'))}</p>

                <div style="margin-bottom: 20px;">
                    <label style="color: #b0bcc8; display: block; margin-bottom: 8px;">What grade did you get? (Leave blank if N/A)</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="number" id="gradeInput" min="0" max="100" placeholder="e.g., 85"
                            style="flex: 1; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; font-size: 1.1em;">
                        <span style="color: #b0bcc8; font-size: 1.2em;">%</span>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="document.getElementById('gradeInputModal').remove()"
                        style="padding: 10px 20px; background: #374151; border: none; border-radius: 6px; color: #e2e8f0; cursor: pointer;">Cancel</button>
                    <button onclick="submitDeadlineGradeById()"
                        style="padding: 10px 20px; background: #059669; border: none; border-radius: 6px; color: white; font-weight: 600; cursor: pointer;">✓ Complete</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('gradeInput').focus();

    // Allow Enter to submit
    document.getElementById('gradeInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitDeadlineGradeById();
    });
}

// ID-based wrapper for submitDeadlineGrade (prevents index race conditions)
function submitDeadlineGradeById() {
    const modal = document.getElementById('gradeInputModal');
    if (!modal) return;
    const deadlineId = modal.dataset.deadlineId;
    let index = deadlines.findIndex(d => getDeadlineId(d) === deadlineId);
    // Fallback: search by _originalStableId (handles post-edit IDs)
    if (index === -1) {
        index = deadlines.findIndex(d => d._originalStableId === deadlineId);
    }
    if (index === -1) {
        showToast('Error: Deadline not found', 'error');
        console.error('submitDeadlineGradeById: Deadline not found for ID:', deadlineId);
        modal.remove();
        return;
    }
    submitDeadlineGrade(index);
}

function submitDeadlineGrade(index) {
    const gradeInput = document.getElementById('gradeInput').value;
    const grade = gradeInput ? parseFloat(gradeInput) : null;

    if (grade !== null && (grade < 0 || grade > 100)) {
        showToast('Grade must be between 0 and 100', 'warning');
        return;
    }

    const deadline = deadlines[index];
    deadline.done = true;
    deadline.grade = grade;

    // Use _originalStableId for persistence key (survives edits, reloads, reordering)
    const deadlineId = deadline._originalStableId || getDeadlineId(deadline);
    console.log('[D3-DONE] Deadline completed:', deadlineId, 'grade:', grade);

    // Store in completedDeadlines using original stable ID (not array index!)
    if (!roadmapData.completedDeadlines) roadmapData.completedDeadlines = {};
    roadmapData.completedDeadlines[deadlineId] = {
        id: deadlineId,
        date: deadline.date,
        what: deadline.what,
        course: deadline.course,
        weight: deadline.weight,
        grade: grade,
        completedAt: new Date().toISOString()
    };

    // Also update customDeadlines if this is a custom deadline
    if (deadline.custom && deadline.id && roadmapData.customDeadlines[deadline.id]) {
        roadmapData.customDeadlines[deadline.id].done = true;
        roadmapData.customDeadlines[deadline.id].grade = grade;
        roadmapData.customDeadlines[deadline.id].updatedAt = new Date().toISOString();
    }

    // FIX: Also update editedDeadlines so completion persists through initUI restore
    // Without this, if deadline was previously edited, editedDeadlines has done:false
    // which overwrites the completion on reload
    if (!roadmapData.editedDeadlines) roadmapData.editedDeadlines = {};
    if (roadmapData.editedDeadlines[deadlineId]) {
        roadmapData.editedDeadlines[deadlineId].done = true;
        roadmapData.editedDeadlines[deadlineId].grade = grade;
        roadmapData.editedDeadlines[deadlineId].updatedAt = new Date().toISOString();
    }

    // Sync to grades tab
    syncDeadlineToGrades(deadline, true, grade);

    // CROSS-SYNC: If this deadline is linked to a clinical appointment, complete it
    if (deadline.clinicalAptId) {
        const apt = roadmapData.clinicalData?.appointments?.[deadline.clinicalAptId];
        if (apt && apt.status !== 'completed') {
            clinicalDataDirty = true;
            apt.status = 'completed';
            apt.completedAt = new Date().toISOString();
            apt.lastUpdated = new Date().toISOString();

            // Update patient lastVisit (use patientRecords, not deprecated patients store)
            const patient = roadmapData.clinicalData?.patientRecords?.[apt.patientId];
            if (patient) {
                // Forward-only: completing an OLD appointment must not rewind a newer lastVisit
                const existingLV = (patient.lastVisit || '').split('|')[0].trim();
                const existingIsISO = /^\d{4}-\d{2}-\d{2}$/.test(existingLV);
                if (!existingIsISO || existingLV <= (apt.date || '')) {
                    patient.lastVisit = apt.date;
                }
                patient.lastUpdated = new Date().toISOString();
            }

            // Mark planner task done
            if (typeof markPlannerTaskDone === 'function') {
                markPlannerTaskDone(deadline.clinicalAptId);
            }
        }
    }

    // Close modal
    document.getElementById('gradeInputModal').remove();

    // FIX: Write to localStorage BEFORE saveData() so changes persist even if guards block
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }
    renderDeadlines();
    renderDashboard();
    rebuildUpcomingDeadlines();
    if (typeof renderAppointmentsList === 'function') renderAppointmentsList();
    if (typeof mpRenderAllCalendars === 'function') mpRenderAllCalendars();

    // BUG-D018: Propagate appointment complete to planner/schedule
    clinicalDataDirty = true;
    if (typeof syncClinicalToMonthlyPlanner === 'function') syncClinicalToMonthlyPlanner();
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
    if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();

    showToast(grade !== null ? `✓ Completed with ${grade}%` : '✓ Completed');
}

// Sync deadline completion to grades tab
function syncDeadlineToGrades(deadline, isComplete, grade = null) {
    const course = (deadline.course || '').toLowerCase();
    const what = (deadline.what || '').toLowerCase();
    if (!roadmapData.grades) roadmapData.grades = {};

    // Oral Med quizzes
    if (course.includes('oral med')) {
        const quizMatch = what.match(/quiz\s*(\d+)/i);
        if (quizMatch) {
            const quizNum = parseInt(quizMatch[1]);
            if (!roadmapData.grades.oralmed) roadmapData.grades.oralmed = {};
            if (isComplete && grade !== null) {
                roadmapData.grades.oralmed['quiz' + quizNum] = grade;
            } else {
                delete roadmapData.grades.oralmed['quiz' + quizNum];
            }
        }
        // Midterm
        if (what.includes('midterm')) {
            if (!roadmapData.grades.oralmed) roadmapData.grades.oralmed = {};
            if (isComplete && grade !== null) {
                roadmapData.grades.oralmed.midterm = grade;
            } else {
                delete roadmapData.grades.oralmed.midterm;
            }
        }
        // Final
        if (what.includes('final') && !what.includes('passion')) {
            if (!roadmapData.grades.oralmed) roadmapData.grades.oralmed = {};
            if (isComplete && grade !== null) {
                roadmapData.grades.oralmed.final = grade;
            } else {
                delete roadmapData.grades.oralmed.final;
            }
        }
    }

    // Pain Control 2
    if (course.includes('pain control')) {
        if (what.includes('rx #1') || what.includes('rx#1')) {
            roadmapData.grades.paincontrol = roadmapData.grades.paincontrol || {};
            if (isComplete && grade !== null) roadmapData.grades.paincontrol.rx1 = grade;
            else delete roadmapData.grades.paincontrol.rx1;
        }
        if (what.includes('rx #2') || what.includes('rx#2')) {
            roadmapData.grades.paincontrol = roadmapData.grades.paincontrol || {};
            if (isComplete && grade !== null) roadmapData.grades.paincontrol.rx2 = grade;
            else delete roadmapData.grades.paincontrol.rx2;
        }
        if (what.includes('take home') && what.includes('1')) {
            roadmapData.grades.paincontrol = roadmapData.grades.paincontrol || {};
            if (isComplete && grade !== null) roadmapData.grades.paincontrol.takehome1 = grade;
            else delete roadmapData.grades.paincontrol.takehome1;
        }
        if (what.includes('take home') && what.includes('2')) {
            roadmapData.grades.paincontrol = roadmapData.grades.paincontrol || {};
            if (isComplete && grade !== null) roadmapData.grades.paincontrol.takehome2 = grade;
            else delete roadmapData.grades.paincontrol.takehome2;
        }
        if (what.includes('midterm')) {
            roadmapData.grades.paincontrol = roadmapData.grades.paincontrol || {};
            if (isComplete && grade !== null) roadmapData.grades.paincontrol.midterm = grade;
            else delete roadmapData.grades.paincontrol.midterm;
        }
        if (what.includes('final')) {
            roadmapData.grades.paincontrol = roadmapData.grades.paincontrol || {};
            if (isComplete && grade !== null) roadmapData.grades.paincontrol.final = grade;
            else delete roadmapData.grades.paincontrol.final;
        }
    }

    // Critical Thinking
    if (course.includes('critical thinking')) {
        const quizMatch = what.match(/quiz\s*(\d+)/i);
        if (quizMatch) {
            const quizNum = parseInt(quizMatch[1]);
            roadmapData.grades.critthink = roadmapData.grades.critthink || {};
            if (isComplete && grade !== null) roadmapData.grades.critthink['quiz' + quizNum] = grade;
            else delete roadmapData.grades.critthink['quiz' + quizNum];
        }
    }

    // Peds
    if (course.includes('peds')) {
        if (what.includes('exam 2')) {
            roadmapData.grades.peds = roadmapData.grades.peds || {};
            if (isComplete && grade !== null) roadmapData.grades.peds.exam2 = grade;
            else delete roadmapData.grades.peds.exam2;
        }
        if (what.includes('exam 3')) {
            roadmapData.grades.peds = roadmapData.grades.peds || {};
            if (isComplete && grade !== null) roadmapData.grades.peds.exam3 = grade;
            else delete roadmapData.grades.peds.exam3;
        }
    }

    // Perio 2
    if (course.includes('perio')) {
        if (what.includes('midterm')) {
            roadmapData.grades.perio = roadmapData.grades.perio || {};
            if (isComplete && grade !== null) roadmapData.grades.perio.midterm = grade;
            else delete roadmapData.grades.perio.midterm;
        }
        if (what.includes('final')) {
            roadmapData.grades.perio = roadmapData.grades.perio || {};
            if (isComplete && grade !== null) roadmapData.grades.perio.final = grade;
            else delete roadmapData.grades.perio.final;
        }
    }

    // Ortho
    if (course.includes('orthodontics')) {
        // BUG-D019: Add midterm handling for Ortho
        if (what.toLowerCase().includes('midterm')) {
            roadmapData.grades.ortho = roadmapData.grades.ortho || {};
            if (isComplete && grade !== null) roadmapData.grades.ortho.midterm = grade;
            else delete roadmapData.grades.ortho.midterm;
        }
        if (what.includes('final')) {
            roadmapData.grades.ortho = roadmapData.grades.ortho || {};
            if (isComplete && grade !== null) roadmapData.grades.ortho.final = grade;
            else delete roadmapData.grades.ortho.final;
        }
    }
}

// ==================== DELETE DEADLINE ====================
function deleteDeadline(index) {
    if (index < 0 || index >= deadlines.length) {
        console.error('Invalid deadline index:', index);
        return;
    }

    const deadline = deadlines[index];
    // Capture stable ID NOW before any mutations or confirm delay
    const stableId = deadline._originalStableId || getDeadlineId(deadline);
    console.log('[D3-DELETE] Deadline delete requested:', stableId, deadline.what);

    showCustomConfirm(
        `Delete this deadline?\n\n"${deadline.what}"\n${deadline.date} - ${deadline.course}`,
        function() {
            // FIX: Re-lookup by stable ID inside callback to prevent stale index
            let currentIndex = deadlines.findIndex(d => (d._originalStableId || getDeadlineId(d)) === stableId);
            if (currentIndex === -1) {
                // Fallback: try original index if it still looks right
                if (index < deadlines.length && (deadlines[index]._originalStableId || getDeadlineId(deadlines[index])) === stableId) {
                    currentIndex = index;
                } else {
                    showToast('Deadline not found — may have been already deleted', 'error');
                    return;
                }
            }
            const targetDeadline = deadlines[currentIndex];

            // Remove from deadlines array
            deadlines.splice(currentIndex, 1);

            // Also remove from customDeadlines if it was custom
            if (roadmapData.customDeadlines && targetDeadline.custom && targetDeadline.id) {
                if (roadmapData.customDeadlines[targetDeadline.id]) {
                    delete roadmapData.customDeadlines[targetDeadline.id];
                }
            } else if (roadmapData.customDeadlines) {
                Object.keys(roadmapData.customDeadlines).forEach(id => {
                    const d = roadmapData.customDeadlines[id];
                    if (d && d.date === targetDeadline.date && d.what === targetDeadline.what && d.course === targetDeadline.course) {
                        delete roadmapData.customDeadlines[id];
                    }
                });
            }

            // Store the deletion (for syncing)
            if (!roadmapData.deletedDeadlines || Array.isArray(roadmapData.deletedDeadlines)) {
                roadmapData.deletedDeadlines = migrateArrayToObject(roadmapData.deletedDeadlines, 'deleted');
            }
            const deletedId = generateId('deleted');
            roadmapData.deletedDeadlines[deletedId] = {
                id: deletedId,
                date: targetDeadline.date,
                what: targetDeadline.what,
                course: targetDeadline.course,
                deletedAt: new Date().toISOString()
            };

            // Remove from editedDeadlines using original stable ID
            if (roadmapData.editedDeadlines) {
                if (roadmapData.editedDeadlines[stableId]) {
                    delete roadmapData.editedDeadlines[stableId];
                }
            }

            // Also remove from completedDeadlines (tombstone so merge can't resurrect it)
            if (roadmapData.completedDeadlines) {
                if (roadmapData.completedDeadlines[stableId]) {
                    if (!roadmapData.deletedCompletedDeadlineIds) roadmapData.deletedCompletedDeadlineIds = {};
                    roadmapData.deletedCompletedDeadlineIds[sanitizeFirebaseKey(stableId)] = new Date().toISOString();
                    delete roadmapData.completedDeadlines[stableId];
                }
            }

            // FIX: Write to localStorage BEFORE saveData() so changes persist even if guards block
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            const saved = saveData();
            if (!saved) {
                showToast('Save blocked — try refreshing', 'error');
                return;
            }
            renderDeadlines();
            renderDashboard();
            rebuildUpcomingDeadlines();

            showToast('Deadline deleted');
        },
        null,
        'Delete Deadline'
    );
}

// ==================== CLINICAL DEADLINE SUGGESTIONS ====================
// Auto-generate soft deadline suggestions based on competency gaps
function autoSuggestClinicalDeadlines() {
    var gaps = typeof getCompetencyGaps === 'function' ? getCompetencyGaps() : { zeroProgress: [], behindPace: [] };
    if (gaps.zeroProgress.length === 0 && gaps.behindPace.length === 0) {
        showToast('No competency gaps found — looking good!');
        return;
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var externshipDate = new Date(2026, 4, 19); // May 19, 2026
    var weeksToExternship = Math.max(1, Math.ceil((externshipDate - today) / (7 * 24 * 60 * 60 * 1000)));

    // Generate soft deadlines for high-priority gaps
    var created = 0;
    var allGaps = gaps.behindPace.concat(gaps.zeroProgress.slice(0, 5)); // Top 5 zero-progress items

    allGaps.forEach(function(gap) {
        // Check if a deadline already exists for this competency item
        var existing = deadlines.some(function(d) {
            return d.what && d.what.includes(gap.text.substring(0, 20));
        });
        if (existing) return;

        // Calculate suggested deadline: spread evenly across remaining weeks
        var suggestedWeeks = Math.min(weeksToExternship, Math.ceil(gap.remaining / 0.5)); // 0.5/week minimum pace
        var suggestedDate = new Date(today);
        suggestedDate.setDate(suggestedDate.getDate() + suggestedWeeks * 7);
        if (suggestedDate > externshipDate) suggestedDate = new Date(externshipDate);

        var dateStr = getLocalDateString(suggestedDate);
        var dayStr = suggestedDate.toLocaleString('en-US', { weekday: 'short' });

        var id = generateId('clinical');
        if (!roadmapData.customDeadlines) roadmapData.customDeadlines = {};
        roadmapData.customDeadlines[id] = {
            id: id,
            date: dateStr,
            day: dayStr,
            what: 'Complete ' + gap.remaining + 'x ' + gap.text,
            course: gap.catName || 'Clinical',
            weight: gap.paceNeeded || '—',
            type: 'Clinical',
            custom: true,
            clinicalSuggested: true,
            createdAt: new Date().toISOString()
        };
        created++;
    });

    if (created > 0) {
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        initUI();
        showToast(created + ' clinical deadline suggestion' + (created > 1 ? 's' : '') + ' created');
    } else {
        showToast('All gap items already have deadlines');
    }
}
