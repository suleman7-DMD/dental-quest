// ==================== D3 ROADMAP: INIT ====================
// Dashboard rendering, UI initialization, and app bootstrap.
// Loaded LAST — all other modules available at parse time.
// Only this file may auto-execute initialization code.

// ==================== RENDER FUNCTIONS ====================
function renderDashboard() {
    // Get current date for all calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Stats row - dynamically calculated from deadlines array
    const upcomingExams = exams.filter(e => getCountdown(e.date) >= 0 && getCountdown(e.date) <= 30).length;
    const urgentDeadlines = deadlines.filter(d => getCountdown(d.date) >= 0 && getCountdown(d.date) <= 7).length;
    const next14Deadlines = deadlines.filter(d => {
        const days = getCountdown(d.date);
        return days > 7 && days <= 14;
    }).length;
    const mandatoryDone = Object.values(roadmapData.mandatoryItems).filter(v => v).length;

    document.getElementById('dashboardStats').innerHTML = `
        <div class="stat-box">
            <div class="number">${upcomingExams}</div>
            <div class="label">Exams in 30 days</div>
        </div>
        <div class="stat-box">
            <div class="number" style="color: ${urgentDeadlines > 0 ? '#f87171' : '#10b981'};">${urgentDeadlines}</div>
            <div class="label">Due in 7 days</div>
        </div>
        <div class="stat-box">
            <div class="number" style="color: #d97706;">${next14Deadlines}</div>
            <div class="label">Due in 8-14 days</div>
        </div>
        <div class="stat-box">
            <div class="number">${mandatoryDone}/${Object.keys(roadmapData.mandatoryItems).length}</div>
            <div class="label">Mandatory Done</div>
        </div>
    `;

    // Helper function to render deadline items
    function renderDeadlineItems(items, emptyMessage) {
        if (items.length === 0) {
            return `<p style="color: #10b981; padding: 20px;">✅ ${emptyMessage}</p>`;
        }
        return items.map(d => {
            const days = getCountdown(d.date);
            return `
                <div class="action-item">
                    ${getCountdownBadge(days, d.tbd)}
                    <div style="flex: 1;">
                        <strong>${d.what}</strong>
                        <span style="color: #b0bcc8; margin-left: 10px;">${d.course}</span>
                    </div>
                    <span style="color: #b0bcc8;">${d.weight}</span>
                </div>
            `;
        }).join('');
    }

    // Next 7 days - directly from deadlines array (synced with Deadlines tab)
    const next7 = deadlines.filter(d => {
        const days = getCountdown(d.date);
        return days >= 0 && days <= 7;
    }).sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    document.getElementById('next7Days').innerHTML = renderDeadlineItems(next7, 'No deadlines in the next 7 days!');
    document.getElementById('next7Count').textContent = next7.length;
    document.getElementById('next7Count').style.background = next7.length > 0 ? '#dc2626' : '#059669';

    // Next 8-14 days
    const next14 = deadlines.filter(d => {
        const days = getCountdown(d.date);
        return days > 7 && days <= 14;
    }).sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    document.getElementById('next14Days').innerHTML = renderDeadlineItems(next14, 'No deadlines in days 8-14!');
    document.getElementById('next14Count').textContent = next14.length;
    document.getElementById('next14Count').style.background = next14.length > 0 ? '#d97706' : '#059669';

    // Next 15-30 days (next month)
    const nextMonth = deadlines.filter(d => {
        const days = getCountdown(d.date);
        return days > 14 && days <= 30;
    }).sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    document.getElementById('nextMonthDays').innerHTML = renderDeadlineItems(nextMonth, 'No deadlines in days 15-30!');
    document.getElementById('nextMonthCount').textContent = nextMonth.length;

    // Update current date display
    const dateDisplay = document.getElementById('currentDateDisplay');
    if (dateDisplay) {
        dateDisplay.textContent = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Render clinical dashboard widget
    renderClinicalDashboardWidget();

    // Render study progress widget
    renderStudyProgressWidget();

    // Render Do Today tasks widget (cross-app sync)
    renderDoTodayTasks();
}

function renderClinicalDashboardWidget() {
    const container = document.getElementById('clinicalDashboardContent');
    if (!container) return;

    const patients = roadmapData.clinicalData?.patients || {};
    const appointments = getValues(roadmapData.clinicalData?.appointments);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const patientCount = Object.keys(patients).length;
    const activePatients = Object.values(patients).filter(p => p.status === 'active').length;

    // Get upcoming appointments (next 7 days)
    const upcomingApts = appointments.filter(apt => {
        const aptDate = parseLocalDate(apt.date);
        const diffDays = Math.ceil((aptDate - today) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    }).sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    // Get patients needing attention
    const needsAttention = Object.values(patients).filter(p =>
        p.status === 'active' && (p.xrayNeeded || p.recallDue || p.prophyDue)
    );

    if (patientCount === 0 && appointments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 25px; color: #b0bcc8;">
                <div style="font-size: 2em; margin-bottom: 10px;">🏥</div>
                <p>No clinical data yet.</p>
                <button onclick="switchTab('clinical', event)" style="margin-top: 10px; padding: 8px 16px; background: #7c3aed; border: none; border-radius: 6px; color: white; cursor: pointer;">
                    Add Your First Patient
                </button>
            </div>
        `;
        return;
    }

    let html = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px;">
            <div style="background: rgba(16, 185, 129, 0.15); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: 700; color: #10b981;">${activePatients}</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">Active Pts</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.15); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: 700; color: #3b82f6;">${upcomingApts.length}</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">This Week</div>
            </div>
            <div style="background: rgba(245, 158, 11, 0.15); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: 700; color: #f59e0b;">${needsAttention.length}</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">Need Attn</div>
            </div>
            <div style="background: rgba(124, 58, 237, 0.15); padding: 12px; border-radius: 8px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: 700; color: #a78bfa;">${patientCount}</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">Total Pts</div>
            </div>
        </div>
    `;

    // Show upcoming appointments
    if (upcomingApts.length > 0) {
        html += `<div style="margin-bottom: 10px; font-weight: 600; color: #93c5fd;">📅 Upcoming This Week</div>`;
        upcomingApts.slice(0, 3).forEach(apt => {
            const patient = patients[apt.patientId];
            const aptDate = parseLocalDate(apt.date);
            const dayName = aptDate.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            html += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; margin-bottom: 8px;">
                    <div style="min-width: 50px; text-align: center; background: rgba(59, 130, 246, 0.2); padding: 5px; border-radius: 6px;">
                        <div style="font-size: 0.75em; color: #93c5fd;">${dayName}</div>
                        <div style="font-weight: 700;">${dateStr.split(' ')[1]}</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${escapeHtml(patient ? patient.name : 'Unknown Patient')}</div>
                        <div style="font-size: 0.85em; color: #b0bcc8;">${escapeHtml(apt.procedures || 'No procedures listed')}</div>
                    </div>
                    <div style="font-size: 0.85em; color: #93c5fd;">${apt.time || ''}</div>
                </div>
            `;
        });
        if (upcomingApts.length > 3) {
            html += `<div style="text-align: center; color: #7c3aed; font-size: 0.85em; cursor: pointer;" onclick="switchTab('clinical', event)">+ ${upcomingApts.length - 3} more appointments</div>`;
        }
    } else {
        html += `<div style="color: #b0bcc8; padding: 10px; text-align: center; font-style: italic;">No appointments scheduled for this week</div>`;
    }

    container.innerHTML = html;
}

function renderStudyProgressWidget() {
    const container = document.getElementById('studyProgressContent');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get upcoming exams (next 30 days) from examContentData
    const upcomingExams = [];
    Object.entries(examContentData).forEach(([courseKey, course]) => {
        course.exams.forEach(exam => {
            if (!exam.isPast && exam.date) {
                const daysUntil = getDaysUntil(exam.date);
                if (daysUntil >= 0 && daysUntil <= 45) {
                    const progress = getExamProgress(exam.id, exam.lectures, exam.reviewContent);
                    upcomingExams.push({
                        ...exam,
                        courseKey,
                        courseName: course.courseName,
                        colorClass: course.colorClass,
                        daysUntil,
                        progress
                    });
                }
            }
        });
    });

    // Sort by date
    upcomingExams.sort((a, b) => a.daysUntil - b.daysUntil);

    if (upcomingExams.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #b0bcc8;">
                <p>No upcoming exams in the next 45 days.</p>
            </div>
        `;
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';

    upcomingExams.slice(0, 4).forEach(exam => {
        const urgencyColor = exam.daysUntil <= 7 ? '#ef4444' :
                             exam.daysUntil <= 14 ? '#f59e0b' :
                             exam.daysUntil <= 21 ? '#eab308' : '#10b981';

        const progressColor = exam.progress.percent >= 80 ? '#10b981' :
                              exam.progress.percent >= 50 ? '#eab308' :
                              exam.progress.percent >= 25 ? '#f59e0b' : '#ef4444';

        html += `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(30, 41, 59, 0.5); border-radius: 10px; border-left: 4px solid ${urgencyColor};">
                <div style="min-width: 45px; text-align: center;">
                    <div style="font-size: 1.4em; font-weight: 700; color: ${urgencyColor};">${exam.daysUntil}</div>
                    <div style="font-size: 0.7em; color: #b0bcc8;">days</div>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${exam.name}</div>
                    <div style="font-size: 0.8em; color: #93c5fd; margin-bottom: 6px;">${exam.courseName}</div>
                    <div style="background: rgba(100, 116, 139, 0.3); border-radius: 4px; height: 6px; overflow: hidden;">
                        <div style="background: ${progressColor}; height: 100%; width: ${exam.progress.percent}%; transition: width 0.3s;"></div>
                    </div>
                </div>
                <div style="text-align: right; min-width: 60px;">
                    <div style="font-size: 1.1em; font-weight: 700; color: ${progressColor};">${exam.progress.percent}%</div>
                    <div style="font-size: 0.7em; color: #b0bcc8;">${exam.progress.totalStudied}/${exam.progress.totalCount}</div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    if (upcomingExams.length > 4) {
        html += `<div style="text-align: center; margin-top: 10px; color: #7c3aed; font-size: 0.85em; cursor: pointer;" onclick="switchTab('examcontent', event)">+ ${upcomingExams.length - 4} more exams</div>`;
    }

    container.innerHTML = html;
}

// ==================== INITIALIZE ====================
function initUI() {

    // ============================================
    // CRITICAL FIX: Reset deadlines array from STATIC_DEADLINES
    // This prevents duplicate custom deadlines from accumulating
    // when initUI() is called multiple times (tab switch, visibility change, etc.)
    // ============================================
    deadlines.length = 0; // Clear the working array
    STATIC_DEADLINES.forEach(d => deadlines.push({...d})); // Deep copy static deadlines

    // CRITICAL FIX: Filter out deleted static deadlines
    // Without this, deleted static deadlines reappear every time initUI() runs
    // because they get re-added from STATIC_DEADLINES above
    try {
        if (roadmapData.deletedDeadlines && getCount(roadmapData.deletedDeadlines) > 0) {
            const deletedValues = getValues(roadmapData.deletedDeadlines);
            for (let i = deadlines.length - 1; i >= 0; i--) {
                const d = deadlines[i];
                const matchesDeleted = deletedValues.some(del =>
                    del.date === d.date && del.what === d.what && del.course === d.course
                );
                if (matchesDeleted) {
                    deadlines.splice(i, 1);
                }
            }
        }
    } catch(e) { console.error('Error filtering deleted deadlines:', e); }

    // Sync static exams array to roadmapData for cross-app integration
    // Body Comp Tracker pulls this from Firebase
    if (!roadmapData.exams || getCount(roadmapData.exams) === 0) {
        // Convert static exams array to object format
        roadmapData.exams = {};
        exams.forEach((e, i) => {
            const examId = e.id || generateId('exam') + '_' + i;
            roadmapData.exams[examId] = { ...e, id: examId };
        });
        // Save to Firebase so Body Comp Tracker can access exams
        setTimeout(() => saveData(), 100);
    }

    try {
        // Restore mandatory checkboxes
        Object.keys(roadmapData.mandatoryItems).forEach(key => {
            if (roadmapData.mandatoryItems[key]) {
                const item = document.getElementById('mandatory-' + key);
                if (item) {
                    const checkbox = item.querySelector('input');
                    if (checkbox) {
                        checkbox.checked = true;
                        item.classList.remove('unchecked');
                        item.classList.add('checked');
                    }
                }
            }
        });
    } catch(e) { console.error('Error restoring mandatory items:', e); }

    try {
        // Restore Peds locked in value
        const pedsLockedEl = document.getElementById('pedsLockedIn');
        const pedsLockedEl2 = document.getElementById('pedsLockedIn2');
        if (pedsLockedEl) pedsLockedEl.textContent = roadmapData.pedsLockedIn;
        if (pedsLockedEl2) pedsLockedEl2.textContent = roadmapData.pedsLockedIn;
    } catch(e) { console.error('Error restoring peds locked in:', e); }

    try {
        // Restore edited deadlines using STABLE ID matching
        // This survives array reordering and custom deadline additions
        if (roadmapData.editedDeadlines) {
            Object.entries(roadmapData.editedDeadlines).forEach(([key, edited]) => {
                if (!edited) return;

                // Try to find deadline by stable ID first
                let deadlineIdx = deadlines.findIndex(d => getDeadlineId(d) === key);

                // Fallback: Legacy numeric index (for migration from old data)
                if (deadlineIdx === -1 && /^\d+$/.test(key)) {
                    const idx = parseInt(key, 10);
                    if (deadlines[idx]) {
                        // Migrate: re-save with stable ID
                        const stableId = getDeadlineId(deadlines[idx]);
                        roadmapData.editedDeadlines[stableId] = edited;
                        delete roadmapData.editedDeadlines[key];
                        deadlineIdx = idx;
                    }
                }

                if (deadlineIdx !== -1) {
                    // Apply the edit to the deadline
                    const deadline = deadlines[deadlineIdx];
                    if (edited.date) deadline.date = edited.date;
                    if (edited.day) deadline.day = edited.day;
                    if (edited.what) deadline.what = edited.what;
                    if (edited.course) deadline.course = edited.course;
                    if (edited.weight) deadline.weight = edited.weight;
                    if (edited.type) deadline.type = edited.type;
                    if (edited.month) deadline.month = edited.month;
                    if (edited.done !== undefined) deadline.done = edited.done;
                    if (edited.grade !== undefined) deadline.grade = edited.grade;
                }
            });
        }
    } catch(e) { console.error('Error restoring edited deadlines:', e); }

    try {
        // Add any custom deadlines (preserving their ID!)
        const customDeadlineValues = getValues(roadmapData.customDeadlines);
        if (customDeadlineValues.length > 0) {
            customDeadlineValues.forEach(d => {
                const dateObj = new Date(d.date + 'T12:00:00'); // Add noon to avoid timezone issues
                const month = dateObj.toLocaleString('en-US', { month: 'long' }).toLowerCase();
                deadlines.push({
                    date: d.date,
                    day: dateObj.toLocaleString('en-US', { weekday: 'short' }),
                    what: d.what,
                    course: d.course || 'Other',
                    weight: d.weight || '—',
                    type: d.type || 'Other',
                    month: month,
                    custom: true,
                    id: d.id,  // CRITICAL: Preserve the custom deadline ID!
                    done: d.done || false,
                    grade: d.grade || null
                });
            });
        }
    } catch(e) { console.error('Error adding custom deadlines:', e); }

    // Sort deadlines by date to ensure consistent order
    try {
        deadlines.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
    } catch(e) { console.error('Error sorting deadlines:', e); }

    // CRITICAL FIX: Restore completed deadlines using stable ID matching
    try {
        if (roadmapData.completedDeadlines) {
            Object.entries(roadmapData.completedDeadlines).forEach(([key, completed]) => {
                if (!completed) return;

                // Try to find deadline by stable ID first
                let deadlineIdx = deadlines.findIndex(d => getDeadlineId(d) === key);

                // Fallback: If key looks like an old numeric index, try matching by properties
                if (deadlineIdx === -1 && /^\d+$/.test(key)) {
                    // Try to match by date + course + what for legacy index-based data
                    deadlineIdx = deadlines.findIndex(d =>
                        d.date === completed.date &&
                        d.course === completed.course &&
                        d.what === completed.what
                    );
                }

                if (deadlineIdx !== -1) {
                    deadlines[deadlineIdx].done = true;
                    deadlines[deadlineIdx].grade = completed.grade !== undefined ? completed.grade : null;
                }
            });
        }
    } catch(e) { console.error('Error restoring completed deadlines:', e); }

    // Also restore completion status from grades data (bidirectional sync)
    try {
        if (roadmapData.grades) {
            deadlines.forEach((d, idx) => {
                if (d.done) return; // Already marked complete
                const course = d.course.toLowerCase();
                const what = d.what.toLowerCase();

                // Check if this deadline has a grade entered in the grades tab
                let gradeValue = null;

                // Oral Med
                if (course.includes('oral med') && roadmapData.grades.oralmed) {
                    const quizMatch = what.match(/quiz\s*(\d+)/i);
                    if (quizMatch) gradeValue = roadmapData.grades.oralmed['quiz' + quizMatch[1]];
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.oralmed.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.oralmed.final;
                }
                // Pain Control
                if (course.includes('pain control') && roadmapData.grades.paincontrol) {
                    const rxMatch = what.match(/rx\s*#?(\d)/i);
                    if (rxMatch) gradeValue = roadmapData.grades.paincontrol['rx' + rxMatch[1]];
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.paincontrol.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.paincontrol.final;
                }
                // Peds
                if (course.includes('peds') && roadmapData.grades.peds) {
                    const examMatch = what.match(/exam\s*(\d)/i);
                    if (examMatch) gradeValue = roadmapData.grades.peds['exam' + examMatch[1]];
                }
                // Perio
                if (course.includes('perio') && roadmapData.grades.perio) {
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.perio.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.perio.final;
                }
                // Ortho
                if (course.includes('ortho') && roadmapData.grades.ortho) {
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.ortho.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.ortho.final;
                }

                // If a grade was found, mark the deadline as complete
                if (gradeValue !== null && gradeValue !== undefined && gradeValue !== '') {
                    d.done = true;
                    d.grade = gradeValue;
                }
            });
        }
    } catch(e) { console.error('Error syncing grades to deadlines:', e); }

    // ALWAYS try to render, even if above steps failed
    try { renderDashboard(); } catch(e) { console.error('renderDashboard error:', e); }
    try { renderDeadlines(); } catch(e) { console.error('renderDeadlines error:', e); }
    try { loadCourseGrades(); } catch(e) { console.error('loadCourseGrades error:', e); }
    try { renderExamCountdown(); } catch(e) { console.error('renderExamCountdown error:', e); }
    try { initMonthlyPlanner(); } catch(e) { console.error('initMonthlyPlanner error:', e); }
    // Exam Content tab uses dropdown - no auto-load needed

    // Initialize Clinical tab if data exists
    try { initClinicalTab(); } catch(e) { console.error('initClinicalTab error:', e); }
}

function init() {
    // Start Firebase initialization
    initFirebase();
}

// ==================== BOOTSTRAP ====================
// Initialize on DOMContentLoaded to ensure all scripts and DOM are ready.
// init() calls initFirebase() which handles async data loading.
document.addEventListener('DOMContentLoaded', () => {
    init();

    // BULLETPROOF FALLBACK: If UI still hasn't loaded after 2 seconds, force it
    setTimeout(() => {
        const dateEl = document.getElementById('currentDateDisplay');
        if (dateEl && (dateEl.textContent === 'Loading...' || !dateEl.textContent)) {
            try {
                initUI();
            } catch(e) {
                console.error('initUI failed, trying renderDashboard directly:', e);
                try { renderDashboard(); } catch(e2) { console.error('renderDashboard failed:', e2); }
                try { renderDeadlines(); } catch(e3) { console.error('renderDeadlines failed:', e3); }
            }
        }
    }, 2000);

    // EXTRA FALLBACK: Also try after 3 seconds just in case
    setTimeout(() => {
        const dateEl = document.getElementById('currentDateDisplay');
        if (dateEl && (dateEl.textContent === 'Loading...' || !dateEl.textContent)) {
            try { initUI(); } catch(e) { console.error('3s fallback initUI failed:', e); }
        }
    }, 3000);
});
