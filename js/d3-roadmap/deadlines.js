// deadlines.js — STATIC_DEADLINES, deadline rendering, CRUD, grade sync

// ==================== DEADLINES DATA ====================
// STATIC_DEADLINES: Immutable source of truth for hardcoded deadlines
// Custom deadlines are stored in roadmapData.customDeadlines
const STATIC_DEADLINES = [
    // January
    { date: '2026-01-15', day: 'Wed', what: 'Quiz 1 due (11:59 PM) ✅ DONE', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'january', done: true },
    { date: '2026-01-22', day: 'Thu', what: 'Quiz 2 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'january' },
    { date: '2026-01-22', day: 'Thu', what: 'Rx #1 due (print, both names, hand in physically)', course: 'Pain Control 2', weight: '2%', type: 'Assignment', month: 'january' },
    { date: '2026-01-29', day: 'Thu', what: 'Take Home Exam 1 due (PAIRS, late=0, heavily shared!)', course: 'Pain Control 2', weight: '12%', type: 'Take-home', month: 'january' },
    { date: '2026-01-29', day: 'Thu', what: 'Quiz 2 (evening, 1hr window, open BB ONLY)', course: 'Critical Thinking', weight: '20%', type: 'Quiz', month: 'january' },
    { date: '2026-01-29', day: 'Thu', what: 'Acute Dental Pain module + print TWO certificates', course: 'Pain Control 2', weight: 'MANDATORY', type: 'Module', month: 'january' },

    // February
    { date: '2026-02-02', day: 'Mon', what: 'MIDTERM EXAM (4-5:15pm, L1101)', course: 'Pain Control 2', weight: '30%', type: 'EXAM', month: 'february' },
    { date: '2026-02-05', day: 'Thu', what: 'Quiz 3 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'february' },
    { date: '2026-02-05', day: 'Thu', what: 'PE of Extremities video due', course: 'Pain Control 2', weight: 'Required', type: 'Module', month: 'february' },
    { date: '2026-02-06', day: 'Fri', what: 'FINAL EXAM (cumulative) — USE OLD EXAMS!', course: 'Orthodontics', weight: '50%', type: 'EXAM', month: 'february' },
    { date: '2026-02-06', day: 'Fri', what: 'Tx Plan Apt (Keisha/Maseli) - mounted models + written analysis', course: 'Clinic', weight: '—', type: 'Clinical', month: 'february' },
    { date: '2026-02-09', day: 'Mon', what: 'Practice Management Assignment', course: 'Group Practice 9', weight: 'TBD', type: 'Assignment', month: 'february' },
    { date: '2026-02-11', day: 'Wed', what: 'FINAL EXAM (4-5:20pm, L1101) — Course ends!', course: 'Geriatrics', weight: 'TBD', type: 'EXAM', month: 'february' },
    { date: '2026-02-13', day: 'Fri', what: '❌ NO CLASS — Passion Project work time (GCal wrong!)', course: 'Oral Med', weight: '—', type: 'No Class', month: 'february' },
    { date: '2026-02-18', day: 'Wed', what: 'EXAM 2 (cumulative) 🚨 SURVIVAL EXAM — 55 Q from Shikui', course: 'Peds ⚠️', weight: '45%', type: 'EXAM', month: 'february' },
    { date: '2026-02-19', day: 'Thu', what: 'Quiz 4 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'february' },
    { date: '2026-02-19', day: 'Thu', what: 'Medical Consultation due', course: 'Pain Control 2', weight: '2%', type: 'Assignment', month: 'february' },
    { date: '2026-02-23', day: 'Mon', what: '🚫 SLC BLOCKED — Stroman implant lab (no patients!)', course: 'Perio 2', weight: '—', type: 'Blocked', month: 'february' },
    { date: '2026-02-26', day: 'Thu', what: 'Quiz 5 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'february' },
    { date: '2026-02-26', day: 'Thu', what: 'Rx #2 due', course: 'Pain Control 2', weight: '2%', type: 'Assignment', month: 'february' },
    { date: '2026-02-27', day: 'Fri', what: 'MIDTERM EXAM (4-5:50pm, L1101) — notecard allowed', course: 'Oral Med', weight: '25%', type: 'EXAM', month: 'february' },

    // March
    { date: '2026-03-05', day: 'Thu', what: 'Quiz 6 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'march' },
    { date: '2026-03-05', day: 'Thu', what: 'Take Home Exam 2 due (PAIRS, late=0)', course: 'Pain Control 2', weight: '12%', type: 'Take-home', month: 'march' },
    { date: '2026-03-11', day: 'Wed', what: 'FINAL EXAM (MCQ 70% + 2 Essays 30%)', course: 'Perio 2', weight: '45%', type: 'EXAM', month: 'march' },
    { date: '2026-03-12', day: 'Thu', what: 'Quiz 7 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'march' },
    { date: '2026-03-18', day: 'Wed', what: 'Group PowerPoint uploaded (8am)', course: 'Critical Thinking', weight: '12%', type: 'Project', month: 'march' },
    { date: '2026-03-18', day: 'Wed', what: 'Group Video Recording uploaded (8am)', course: 'Critical Thinking', weight: '9%', type: 'Project', month: 'march' },
    { date: '2026-03-19', day: 'Thu', what: 'Quiz 8 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'march' },
    { date: '2026-03-19', day: 'Thu', what: 'FINAL EXAM (4-5:30pm, L1101)', course: 'Pain Control 2', weight: '40%', type: 'EXAM', month: 'march' },
    { date: '2026-03-23', day: 'Mon', what: 'Systematic Review due (8am)', course: 'Critical Thinking', weight: '12%', type: 'Project', month: 'march' },
    { date: '2026-03-27', day: 'Fri', what: '❌ NO CLASS', course: 'Oral Med', weight: '—', type: 'No Class', month: 'march' },
    { date: '2026-03-30', day: 'Mon', what: 'EXAM 3 + Attendance component', course: 'Peds', weight: '7.5%', type: 'EXAM', month: 'march' },
    { date: '2026-03-30', day: 'Mon', what: 'NPI Exercise due (Google Form on BB)', course: 'Peds ⚠️', weight: 'MANDATORY', type: 'Assignment', month: 'march' },

    // April
    { date: '2026-04-01', day: 'Wed', what: 'Live Presentation (1-3:20pm, 670 Aud)', course: 'Critical Thinking', weight: 'Part of 60%', type: 'Presentation', month: 'april' },
    { date: '2026-04-02', day: 'Thu', what: 'Quiz 9 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'april' },
    { date: '2026-04-10', day: 'Fri', what: '❌ NO CLASS', course: 'Oral Med', weight: '—', type: 'No Class', month: 'april' },
    { date: '2026-04-14', day: 'Tue', what: 'Live Presentation (1-3:20pm, 670 Aud)', course: 'Critical Thinking', weight: 'Part of 60%', type: 'Presentation', month: 'april' },
    { date: '2026-04-16', day: 'Thu', what: 'Quiz 10 due (11:59 PM)', course: 'Oral Med', weight: '2.5%', type: 'Quiz', month: 'april' },
    { date: '2026-04-16', day: 'Thu', what: 'Live Presentation (1-2:50pm, 670 Aud)', course: 'Critical Thinking', weight: 'Part of 60%', type: 'Presentation', month: 'april' },
    { date: '2026-04-17', day: 'Fri', what: 'FINAL EXAM (4-5:50pm, L1101) — notecard allowed', course: 'Oral Med', weight: '25%', type: 'EXAM', month: 'april' },
    { date: '2026-04-17', day: 'Fri', what: 'Passion Project due (4pm) — needs DATED JOURNAL LOG', course: 'Oral Med', weight: '12.5%', type: 'Project', month: 'april' }
];

// Working deadlines array - reset from STATIC_DEADLINES at start of each initUI() call
// to prevent duplicate custom deadlines from accumulating
let deadlines = [];

const exams = [
    { name: 'PC2 Midterm', date: '2026-02-02', weight: '30%', priority: '🔴 HIGH' },
    { name: 'Ortho Final', date: '2026-02-06', weight: '50%', priority: '🔴 HIGH' },
    { name: 'Geriatrics Final', date: '2026-02-11', weight: 'TBD', priority: '🟡 MEDIUM', note: 'Short course ends!' },
    { name: 'Peds Exam 2', date: '2026-02-18', weight: '45%', priority: '🔴 CRITICAL' },
    { name: 'Oral Med Midterm', date: '2026-02-27', weight: '25%', priority: '🟡 MEDIUM' },
    { name: 'Perio 2 Final', date: '2026-03-11', weight: '45%', priority: '🟡 MEDIUM' },
    { name: 'PC2 Final', date: '2026-03-19', weight: '40%', priority: '🟡 MEDIUM' },
    { name: 'Peds Exam 3', date: '2026-03-30', weight: '7.5%', priority: '🟢 LOW' },
    { name: 'Oral Med Final', date: '2026-04-17', weight: '25%', priority: '🟢 LOW' }
];

function renderDeadlines() {
    const months = ['january', 'february', 'march', 'april'];

    // First, sort ALL deadlines by date to ensure correct ordering
    deadlines.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    months.forEach(month => {
        const tbody = document.getElementById(month + 'Body');
        if (!tbody) return;

        // Filter for this month - already sorted from above
        const monthDeadlines = deadlines.filter(d => d.month === month);

        tbody.innerHTML = monthDeadlines.map((d, idx) => {
            const days = getCountdown(d.date);
            const isPassed = days < 0;
            const deadlineId = getDeadlineId(d);
            const isCustom = d.custom || false;
            const isDone = d.done || false;
            const grade = d.grade !== undefined ? d.grade : null;

            // Row styling based on done status
            const rowStyle = isDone ? 'opacity: 0.6; text-decoration: line-through;' : '';
            const rowClass = isPassed ? 'passed' : '';

            return `
                <tr class="${rowClass}" data-deadline-id="${deadlineId}" style="${rowStyle}">
                    <td>
                        <button class="deadline-checkbox-btn" onclick="toggleDeadlineDoneById('${deadlineId}')"
                            style="background: ${isDone ? '#059669' : 'rgba(255,255,255,0.1)'};
                                   border: 2px solid ${isDone ? '#059669' : '#4b5563'};
                                   color: ${isDone ? 'white' : '#94a3b8'};
                                   width: 32px; height: 32px;
                                   border-radius: 6px; cursor: pointer;
                                   font-size: 1.1em; display: flex;
                                   align-items: center; justify-content: center;"
                            title="${isDone ? 'Mark incomplete' : 'Mark complete'}">
                            ${isDone ? '✓' : '○'}
                        </button>
                    </td>
                    <td>
                        <input type="date" class="deadline-date-picker"
                            value="${d.date}"
                            data-deadline-id="${deadlineId}"
                            onchange="handleDateChange(this)">
                    </td>
                    <td>${d.day}</td>
                    <td>${isDone && grade !== null ? `<span style="background: #059669; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${grade}%</span>` : getCountdownBadge(days, d.tbd)}</td>
                    <td class="deadline-what-cell">
                        <input type="text" class="deadline-edit-input"
                            value="${escapeHtml(d.what)}"
                            data-deadline-id="${deadlineId}"
                            data-field="what"
                            data-original="${escapeHtml(d.what)}"
                            onblur="handleTextEdit(this)"
                            onkeydown="if(event.key==='Enter'){this.blur();}"
                            style="background: rgba(255,255,255,0.1); border: 1px dashed #4b5563; padding: 4px 8px; border-radius: 4px; color: #e2e8f0; width: 100%;">
                    </td>
                    <td>
                        <input type="text" class="deadline-edit-input"
                            value="${escapeHtml(d.course)}"
                            data-deadline-id="${deadlineId}"
                            data-field="course"
                            data-original="${escapeHtml(d.course)}"
                            onblur="handleTextEdit(this)"
                            onkeydown="if(event.key==='Enter'){this.blur();}"
                            style="background: rgba(255,255,255,0.1); border: 1px dashed #4b5563; padding: 4px 8px; border-radius: 4px; color: #e2e8f0; width: 120px;">
                    </td>
                    <td>
                        <input type="text" class="deadline-edit-input"
                            value="${escapeHtml(d.weight)}"
                            data-deadline-id="${deadlineId}"
                            data-field="weight"
                            data-original="${escapeHtml(d.weight)}"
                            onblur="handleTextEdit(this)"
                            onkeydown="if(event.key==='Enter'){this.blur();}"
                            style="background: rgba(255,255,255,0.1); border: 1px dashed #4b5563; padding: 4px 8px; border-radius: 4px; color: #e2e8f0; width: 60px;">
                    </td>
                    <td>${d.type}</td>
                    <td>
                        <button onclick="deleteDeadlineById('${deadlineId}')"
                            style="background: rgba(220, 38, 38, 0.2); border: 1px solid #dc2626; color: #f87171; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em;"
                            title="Delete this deadline">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    });
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
        done: deadline.done || false,    // FIXED: Preserve completion status
        grade: deadline.grade || null     // FIXED: Preserve grade
    };

    // Save immediately
    safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }

    // Re-render
    renderDeadlines();
    renderDashboard();

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
        done: deadline.done || false,    // Preserve completion status
        grade: deadline.grade || null    // Preserve grade
    };

    // Save immediately
    safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }

    // Re-render
    renderDeadlines();
    renderDashboard();

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

function renderExamCountdown() {
    const tbody = document.getElementById('examCountdownTable').querySelector('tbody');

    tbody.innerHTML = exams.map(e => {
        const days = getCountdown(e.date);
        const isPassed = days < 0;

        return `
            <tr class="${isPassed ? 'passed' : ''}">
                <td><strong>${e.name}</strong></td>
                <td>${formatDate(e.date)}</td>
                <td>${getCountdownBadge(days)}</td>
                <td>${e.weight}</td>
                <td>${e.priority}</td>
            </tr>
        `;
    }).join('');
}

// ==================== ADD NEW DEADLINE ====================
function addNewDeadline() {
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
        custom: true // Mark as custom so we know it can be deleted
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

    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }
    renderDeadlines();
    renderDashboard();

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

        // Remove from completedDeadlines using original stable ID
        if (roadmapData.completedDeadlines) {
            delete roadmapData.completedDeadlines[deadlineId];
            // Also try to clean up any old index-based entries
            delete roadmapData.completedDeadlines[index];
        }

        // Also update customDeadlines if this is a custom deadline
        if (deadline.custom && deadline.id && roadmapData.customDeadlines[deadline.id]) {
            roadmapData.customDeadlines[deadline.id].done = false;
            roadmapData.customDeadlines[deadline.id].grade = null;
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
            grade: null
        };

        // Update grades if this was synced
        syncDeadlineToGrades(deadline, false);

        const saved = saveData();
        if (!saved) {
            showToast('Save blocked — try refreshing', 'error');
            return;
        }
        renderDeadlines();
        renderDashboard();
        loadCourseGrades();

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
    const deadlineId = deadline._originalStableId || getDeadlineId(deadline);
    const modal = document.createElement('div');
    modal.id = 'gradeInputModal';
    modal.dataset.deadlineId = deadlineId;
    modal.innerHTML = `
        <div class="js-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="js-modal-content" style="background: #1e293b; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; border: 1px solid #334155;">
                <h3 style="color: #10b981; margin-bottom: 15px;">✓ Mark Complete</h3>
                <p style="color: #e2e8f0; margin-bottom: 5px;"><strong>${escapeHtml(deadline.what)}</strong></p>
                <p style="color: #b0bcc8; margin-bottom: 20px;">${deadline.course} | ${deadline.weight}</p>

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
    }

    // Sync to grades tab
    syncDeadlineToGrades(deadline, true, grade);

    // Close modal
    document.getElementById('gradeInputModal').remove();

    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
        return;
    }
    renderDeadlines();
    renderDashboard();
    loadCourseGrades();

    showToast(grade !== null ? `✓ Completed with ${grade}%` : '✓ Completed');
}

// Sync deadline completion to grades tab
function syncDeadlineToGrades(deadline, isComplete, grade = null) {
    const course = deadline.course.toLowerCase();
    const what = deadline.what.toLowerCase();

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
            if (isComplete && grade !== null) {
                roadmapData.grades.oralmed.midterm = grade;
            } else {
                delete roadmapData.grades.oralmed.midterm;
            }
        }
        // Final
        if (what.includes('final') && !what.includes('passion')) {
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
    const _logDeadlineId = getDeadlineId(deadline);
    console.log('[D3-DELETE] Deadline delete requested:', _logDeadlineId, deadline.what);

    showCustomConfirm(
        `Delete this deadline?\n\n"${escapeHtml(deadline.what)}"\n${deadline.date} - ${deadline.course}`,
        function() {
            // Remove from deadlines array
            deadlines.splice(index, 1);

            // Also remove from customDeadlines if it was custom
            if (roadmapData.customDeadlines && deadline.custom && deadline.id) {
                if (roadmapData.customDeadlines[deadline.id]) {
                    delete roadmapData.customDeadlines[deadline.id];
                }
            } else if (roadmapData.customDeadlines) {
                Object.keys(roadmapData.customDeadlines).forEach(id => {
                    const d = roadmapData.customDeadlines[id];
                    if (d && d.date === deadline.date && d.what === deadline.what && d.course === deadline.course) {
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
                date: deadline.date,
                what: deadline.what,
                course: deadline.course,
                deletedAt: new Date().toISOString()
            };

            // Remove from editedDeadlines using original stable ID
            const deadlineId = deadline._originalStableId || getDeadlineId(deadline);
            if (roadmapData.editedDeadlines) {
                if (roadmapData.editedDeadlines[deadlineId]) {
                    delete roadmapData.editedDeadlines[deadlineId];
                }
                if (roadmapData.editedDeadlines[index]) {
                    delete roadmapData.editedDeadlines[index];
                }
            }

            // Also remove from completedDeadlines
            if (roadmapData.completedDeadlines) {
                if (roadmapData.completedDeadlines[deadlineId]) {
                    delete roadmapData.completedDeadlines[deadlineId];
                }
            }

            const saved = saveData();
            if (!saved) {
                showToast('Save blocked — try refreshing', 'error');
                return;
            }
            renderDeadlines();
            renderDashboard();

            showToast('Deadline deleted');
        },
        null,
        'Delete Deadline'
    );
}
