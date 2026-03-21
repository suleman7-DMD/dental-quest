// ==================== D3 ROADMAP: INIT ====================
// Dashboard rendering, UI initialization, and app bootstrap.
// Loaded LAST — all other modules available at parse time.
// Only this file may auto-execute initialization code.

// ==================== RENDER FUNCTIONS ====================
function renderDashboard() {
    const container = document.getElementById('tab-missioncontrol');
    if (!container) return;

    // Get current date for all calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // === Row 1: Clinic Requirements Card ===
    // Auto-derive completed counts from real clinical data
    roadmapData.clinicHeadlines = roadmapData.clinicHeadlines || {};
    const autoAptCount = getValues(roadmapData.clinicalData?.appointments).filter(function(a) { return a.status === 'completed'; }).length;
    const autoProcCount = getCount(roadmapData.clinicalData?.completedProcedures);
    // Sync auto-derived counts back to clinicHeadlines for cross-app consumers
    if (!roadmapData.clinicHeadlines.appointments) roadmapData.clinicHeadlines.appointments = {};
    if (!roadmapData.clinicHeadlines.procedures) roadmapData.clinicHeadlines.procedures = {};
    roadmapData.clinicHeadlines.appointments.completed = autoAptCount;
    roadmapData.clinicHeadlines.procedures.completed = autoProcCount;
    const clinicHeadlines = {
        appointments: {
            completed: autoAptCount,
            target: roadmapData.clinicHeadlines.appointments?.target ?? 90
        },
        procedures: {
            completed: autoProcCount,
            target: roadmapData.clinicHeadlines.procedures?.target ?? 116
        }
    };

    const aptPct = clinicHeadlines.appointments.target > 0
        ? Math.min(100, Math.round((clinicHeadlines.appointments.completed / clinicHeadlines.appointments.target) * 100))
        : 0;
    const procPct = clinicHeadlines.procedures.target > 0
        ? Math.min(100, Math.round((clinicHeadlines.procedures.completed / clinicHeadlines.procedures.target) * 100))
        : 0;

    // Build competency category progress grid
    const competencies = getCompetenciesData();
    const overallStats = calculateOverallStats(competencies);
    let categoryProgressHTML = '';
    Object.entries(competencies).forEach(function(entry) {
        const key = entry[0];
        const cat = entry[1];
        const stats = calculateCategoryStats(cat);
        const pct = stats.totalUnits > 0 ? Math.round((stats.completedUnits / stats.totalUnits) * 100) : 0;
        categoryProgressHTML += '<div class="comp-mini-card" onclick="switchTab(\'competencies\')" style="cursor:pointer; background:rgba(30,41,59,0.6); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:4px;">'
            + '<div style="display:flex; align-items:center; gap:6px; justify-content:space-between;">'
            + '<span style="font-size:1.1em;">' + (cat.icon ?? '📌') + '</span>'
            + '<span style="flex:1; font-size:0.8em; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(cat.name) + '</span>'
            + '<span style="font-size:0.75em; color:#94a3b8; white-space:nowrap;">' + stats.completed + '/' + stats.totalItems + '</span>'
            + '</div>'
            + '<div style="background:rgba(100,116,139,0.3); border-radius:4px; height:5px; overflow:hidden;">'
            + '<div style="background:' + (cat.color ?? '#3b82f6') + '; height:100%; width:' + pct + '%; transition:width 0.3s;"></div>'
            + '</div>'
            + '</div>';
    });

    // === Row 2: Deadline helper ===
    function renderDeadlineItems(items, emptyMessage) {
        if (items.length === 0) {
            return '<p style="color: #10b981; padding: 20px;">✅ ' + emptyMessage + '</p>';
        }
        return items.map(function(d) {
            const days = getCountdown(d.date);
            return '<div class="action-item">'
                + getCountdownBadge(days, d.tbd)
                + '<div style="flex: 1;">'
                + '<strong>' + escapeHtml(d.what) + '</strong>'
                + '<span style="color: #b0bcc8; margin-left: 10px;">' + escapeHtml(d.course) + '</span>'
                + '</div>'
                + '<span style="color: #b0bcc8;">' + escapeHtml(d.weight || '') + '</span>'
                + '</div>';
        }).join('');
    }

    // Next 7 days - directly from deadlines array (synced with Deadlines tab)
    const next7 = deadlines.filter(function(d) {
        if (d.done) return false;
        const days = getCountdown(d.date);
        return days >= 0 && days <= 7;
    }).sort(function(a, b) { return parseLocalDate(a.date) - parseLocalDate(b.date); });

    // Next 8-14 days
    const next14 = deadlines.filter(function(d) {
        if (d.done) return false;
        const days = getCountdown(d.date);
        return days > 7 && days <= 14;
    }).sort(function(a, b) { return parseLocalDate(a.date) - parseLocalDate(b.date); });

    // Next 15-30 days (next month)
    const nextMonth = deadlines.filter(function(d) {
        if (d.done) return false;
        const days = getCountdown(d.date);
        return days > 14 && days <= 30;
    }).sort(function(a, b) { return parseLocalDate(a.date) - parseLocalDate(b.date); });

    // === Row 4: Key Dates Countdown ===
    const d3End = new Date(2026, 4, 13);       // May 13, 2026
    const extStart = new Date(2026, 4, 19);    // May 19, 2026
    const graduation = new Date(2027, 4, 12);  // May 12, 2027
    const daysTo = function(target) { return Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24))); };

    // Build the full dashboard HTML
    let html = '';

    // Current date display
    html += '<div id="currentDateDisplay" style="text-align:center; color:#94a3b8; font-size:0.9em; margin-bottom:16px;">'
        + today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        + '</div>';

    // === ROW 1: Clinic Requirements Hero Card ===
    html += '<div class="mission-card" style="background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border:1px solid rgba(59,130,246,0.3); border-radius:14px; padding:20px; margin-bottom:16px;">';
    html += '<h2 style="color:#93c5fd; margin:0 0 16px 0; font-size:1.3em;">🏥 Clinic Requirements</h2>';

    // Headline counters
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">';

    // Appointments counter — auto-derived from completed appointments
    html += '<div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:10px; padding:14px;">';
    html += '<div style="font-size:0.85em; color:#93c5fd; margin-bottom:8px; font-weight:600;">Appointments</div>';
    html += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">';
    html += '<span style="font-size:1.4em; font-weight:700; color:#e2e8f0;">' + clinicHeadlines.appointments.completed + '</span>';
    html += '<span style="color:#64748b; font-size:1.1em;">/</span>';
    html += '<input type="number" id="headline-apt-target" value="' + clinicHeadlines.appointments.target + '" min="0" '
        + 'onchange="updateHeadlineTarget(\'appointments\', this.value)" '
        + 'style="width:50px; background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:4px 6px; text-align:center; font-size:1.1em;">';
    html += '</div>';
    html += '<div style="background:rgba(100,116,139,0.3); border-radius:4px; height:6px; overflow:hidden;">';
    html += '<div style="background:#3b82f6; height:100%; width:' + aptPct + '%; transition:width 0.3s;"></div>';
    html += '</div>';
    html += '<div style="font-size:0.7em; color:#64748b; margin-top:4px;">Auto-counted from completed appointments</div>';
    html += '</div>';

    // Procedures counter — auto-derived from recorded procedures
    html += '<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); border-radius:10px; padding:14px;">';
    html += '<div style="font-size:0.85em; color:#6ee7b7; margin-bottom:8px; font-weight:600;">Procedures</div>';
    html += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">';
    html += '<span style="font-size:1.4em; font-weight:700; color:#e2e8f0;">' + clinicHeadlines.procedures.completed + '</span>';
    html += '<span style="color:#64748b; font-size:1.1em;">/</span>';
    html += '<input type="number" id="headline-proc-target" value="' + clinicHeadlines.procedures.target + '" min="0" '
        + 'onchange="updateHeadlineTarget(\'procedures\', this.value)" '
        + 'style="width:50px; background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:4px 6px; text-align:center; font-size:1.1em;">';
    html += '</div>';
    html += '<div style="background:rgba(100,116,139,0.3); border-radius:4px; height:6px; overflow:hidden;">';
    html += '<div style="background:#10b981; height:100%; width:' + procPct + '%; transition:width 0.3s;"></div>';
    html += '</div>';
    html += '<div style="font-size:0.7em; color:#64748b; margin-top:4px;">Auto-counted from recorded procedures</div>';
    html += '</div>';

    html += '</div>'; // end headline counters grid

    // Competency category grid
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; margin-bottom:12px;">';
    html += categoryProgressHTML;
    html += '</div>';

    // Overall competency total
    html += '<div style="text-align:center; color:#94a3b8; font-size:0.85em; margin-bottom:12px;">'
        + 'Competency items: ' + overallStats.completedItems + '/' + overallStats.totalItems + ' completed'
        + ' (' + overallStats.overallPercent + '%)'
        + '</div>';

    // Open Clinical button
    html += '<div style="text-align:center;">';
    html += '<button onclick="switchTab(\'competencies\')" style="background:rgba(124,58,237,0.2); border:1px solid rgba(124,58,237,0.4); color:#a78bfa; padding:8px 20px; border-radius:8px; cursor:pointer; font-size:0.9em; font-weight:600;">Open Competencies →</button>';
    html += '</div>';

    // Patient tracker summary
    if (typeof getPatientRecords === 'function') {
        const ptRecords = roadmapData.clinicalData?.patientRecords || {};
        const ptCount = Object.keys(ptRecords).length;
        if (ptCount > 0) {
            html += '<div class="card" style="border: 2px solid #7c3aed; margin-top: 15px;">'
                + '<div class="card-header"><span class="card-title">🩺 Patient Tracker</span>'
                + '<span style="color: #a78bfa; font-size: 0.85em;">' + ptCount + ' patients</span></div>'
                + '<p style="color: #94a3b8; font-size: 0.9em; margin: 0 0 10px 0;">Track your patient records, requirements fulfillment, and clinical progress.</p>'
                + '<button onclick="switchTab(\'patients\')" style="background:rgba(124,58,237,0.2); border:1px solid rgba(124,58,237,0.4); color:#a78bfa; padding:8px 20px; border-radius:8px; cursor:pointer; font-size:0.9em; font-weight:600;">Open Patients →</button>'
                + '</div>';
        }
    }

    html += '</div>'; // end clinic requirements card

    // === ROW 2: Do Today Widget ===
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:16px; margin-bottom:16px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">';
    html += '<h3 style="color:#fbbf24; margin:0; font-size:1.1em;">⚡ Do Today</h3>';
    html += '<span id="doTodayCount" class="empty" style="background:#f59e0b; color:#000; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">0</span>';
    html += '</div>';
    html += '<div id="doTodayTasksList"></div>';
    html += '</div>';

    // === ROW 3: Deadline Windows ===
    // Next 7 days
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(239,68,68,0.3); border-radius:14px; padding:16px; margin-bottom:12px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#f87171; margin:0; font-size:1.05em;">🔴 Next 7 Days</h3>';
    html += '<span id="next7Count" style="background:' + (next7.length > 0 ? '#dc2626' : '#059669') + '; color:#fff; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">' + next7.length + '</span>';
    html += '</div>';
    html += '<div id="next7Days">' + renderDeadlineItems(next7, 'No deadlines in the next 7 days!') + '</div>';
    html += '</div>';

    // Next 8-14 days
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(217,119,6,0.3); border-radius:14px; padding:16px; margin-bottom:12px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#fbbf24; margin:0; font-size:1.05em;">🟡 Next 8–14 Days</h3>';
    html += '<span id="next14Count" style="background:' + (next14.length > 0 ? '#d97706' : '#059669') + '; color:#fff; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">' + next14.length + '</span>';
    html += '</div>';
    html += '<div id="next14Days">' + renderDeadlineItems(next14, 'No deadlines in days 8-14!') + '</div>';
    html += '</div>';

    // Next 15-30 days
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.3); border-radius:14px; padding:16px; margin-bottom:12px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#94a3b8; margin:0; font-size:1.05em;">📅 Next 15–30 Days</h3>';
    html += '<span id="nextMonthCount" style="background:#475569; color:#fff; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">' + nextMonth.length + '</span>';
    html += '</div>';
    html += '<div id="nextMonthDays">' + renderDeadlineItems(nextMonth, 'No deadlines in days 15-30!') + '</div>';
    html += '</div>';

    // === ROW 4: Key Dates Countdown ===
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:16px; margin-bottom:16px;">';
    html += '<h3 style="color:#fbbf24; margin:0 0 12px 0; font-size:1.1em;">🎯 Key Dates</h3>';
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">';

    // D3 End
    html += '<div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.25); border-radius:10px; padding:12px; text-align:center;">';
    html += '<div style="font-size:1.8em; font-weight:800; color:#60a5fa;">' + daysTo(d3End) + '</div>';
    html += '<div style="font-size:0.75em; color:#94a3b8; margin-top:2px;">days to D3 End</div>';
    html += '<div style="font-size:0.7em; color:#64748b;">May 13, 2026</div>';
    html += '</div>';

    // Externship Start
    html += '<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:10px; padding:12px; text-align:center;">';
    html += '<div style="font-size:1.8em; font-weight:800; color:#34d399;">' + daysTo(extStart) + '</div>';
    html += '<div style="font-size:0.75em; color:#94a3b8; margin-top:2px;">days to Externship</div>';
    html += '<div style="font-size:0.7em; color:#64748b;">May 19, 2026</div>';
    html += '</div>';

    // Graduation
    html += '<div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); border-radius:10px; padding:12px; text-align:center;">';
    html += '<div style="font-size:1.8em; font-weight:800; color:#fbbf24;">' + daysTo(graduation) + '</div>';
    html += '<div style="font-size:0.75em; color:#94a3b8; margin-top:2px;">days to Graduation</div>';
    html += '<div style="font-size:0.7em; color:#64748b;">May 12, 2027</div>';
    html += '</div>';

    html += '</div>'; // end countdown grid
    html += '</div>'; // end key dates card

    // Write the entire dashboard
    container.innerHTML = html;

    // Render Do Today tasks widget (cross-app sync) — populates #doTodayTasksList inside the container
    renderDoTodayTasks();
}


// ==================== HEADLINE COUNTER HELPERS ====================
function updateHeadlineCounter(type, value) {
    roadmapData.clinicHeadlines = roadmapData.clinicHeadlines || {};
    roadmapData.clinicHeadlines[type] = roadmapData.clinicHeadlines[type] || {};
    roadmapData.clinicHeadlines[type].completed = parseInt(value) || 0;
    saveData();
}

function updateHeadlineTarget(type, value) {
    roadmapData.clinicHeadlines = roadmapData.clinicHeadlines || {};
    roadmapData.clinicHeadlines[type] = roadmapData.clinicHeadlines[type] || {};
    roadmapData.clinicHeadlines[type].target = parseInt(value) || 0;
    saveData();
}

// ==================== GRADUATION PREP TAB ====================
function renderGraduationPrep() {
    const container = document.getElementById('tab-gradprep');
    if (!container) return;

    const gp = roadmapData.graduationPrep || {};
    const ext = gp.externship || {};
    const cdca = gp.cdcaAdex || {};
    const inbde = gp.inbde || {};
    const jobs = gp.jobSearch || {};

    let html = '<h2 style="color:#f59e0b; margin-bottom:16px; font-size:1.3em;">🎓 Graduation Prep</h2>';

    // Externship Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(16,185,129,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#6ee7b7; margin:0 0 12px 0;">🌴 Externship (Florida)</h3>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">';
    html += '<label style="display:flex; flex-direction:column; gap:4px; color:#94a3b8; font-size:0.85em;">Start Date';
    html += '<input type="date" value="' + (ext.startDate || '') + '" onchange="updateGradPrep(\'externship\',\'startDate\',this.value)" '
        + 'style="background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:6px 8px;">';
    html += '</label>';
    html += '<label style="display:flex; flex-direction:column; gap:4px; color:#94a3b8; font-size:0.85em;">End Date';
    html += '<input type="date" value="' + (ext.endDate || '') + '" onchange="updateGradPrep(\'externship\',\'endDate\',this.value)" '
        + 'style="background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:6px 8px;">';
    html += '</label>';
    html += '</div>';
    html += '<h4 style="color:#94a3b8; font-size:0.9em; margin:8px 0 6px 0;">Active Patients Needing Management</h4>';
    html += '<textarea placeholder="Track patients with active treatments, denture deliveries, etc..." '
        + 'onchange="updateGradPrep(\'externship\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(ext.notes || '') + '</textarea>';
    html += '<h4 style="color:#94a3b8; font-size:0.9em; margin:12px 0 6px 0;">Logistics</h4>';
    html += '<textarea placeholder="Housing, travel, schedule details..." '
        + 'onchange="updateGradPrep(\'externship\',\'logistics\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(ext.logistics || '') + '</textarea>';
    html += '</div>';

    // CDCA/ADEX Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(59,130,246,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#93c5fd; margin:0 0 8px 0;">🦷 CDCA/ADEX</h3>';
    html += '<p style="color:#9ca3af; font-size:0.8em; margin:0 0 10px 0;">1 formative + 2-3 summative sessions before externship. Summative scores = 10% of Fixed 2 grade.</p>';
    html += '<textarea placeholder="Session dates, scores, prep notes..." '
        + 'onchange="updateGradPrep(\'cdcaAdex\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(cdca.notes || '') + '</textarea>';
    html += '</div>';

    // INBDE Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(124,58,237,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#a78bfa; margin:0 0 10px 0;">📝 INBDE Prep</h3>';
    html += '<textarea placeholder="Study plan, resources, timeline..." '
        + 'onchange="updateGradPrep(\'inbde\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(inbde.notes || '') + '</textarea>';
    html += '</div>';

    // Job Search Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#fbbf24; margin:0 0 10px 0;">💼 Job Search</h3>';
    html += '<textarea placeholder="Target locations, contacts, timeline..." '
        + 'onchange="updateGradPrep(\'jobSearch\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(jobs.notes || '') + '</textarea>';
    html += '</div>';

    container.innerHTML = html;
}

function updateGradPrep(category, field, value) {
    roadmapData.graduationPrep = roadmapData.graduationPrep || {};
    roadmapData.graduationPrep[category] = roadmapData.graduationPrep[category] || {};
    roadmapData.graduationPrep[category][field] = value;
    saveData();
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

    // Tag each static deadline with its original stableId BEFORE any edits are applied
    // This allows CRUD operations to always use the correct persistence key
    deadlines.forEach(d => { d._originalStableId = getDeadlineId(d); });

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

                // FIX: Also check _originalStableId — if an earlier edit in this loop
                // already mutated a deadline, getDeadlineId(d) may no longer match
                if (deadlineIdx === -1) {
                    deadlineIdx = deadlines.findIndex(d => d._originalStableId === key);
                }

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
                const customStableId = d.id ? sanitizeFirebaseKey(d.id) : getDeadlineId({date: d.date, course: d.course || 'Other', what: d.what});
                // CRITICAL FIX: Check if editedDeadlines has overrides for this custom deadline
                // editedDeadlines loop (above) only matches STATIC deadlines — custom deadline
                // edits stored in editedDeadlines would be orphaned without this check
                const edited = roadmapData.editedDeadlines ? roadmapData.editedDeadlines[customStableId] : null;
                const finalDate = edited?.date || d.date;
                const dateObj = new Date(finalDate + 'T12:00:00');
                const month = edited?.month || dateObj.toLocaleString('en-US', { month: 'long' }).toLowerCase();
                deadlines.push({
                    date: finalDate,
                    day: edited?.day || dateObj.toLocaleString('en-US', { weekday: 'short' }),
                    what: edited?.what || d.what,
                    course: edited?.course || d.course || 'Other',
                    weight: edited?.weight || d.weight || '—',
                    type: edited?.type || d.type || 'Other',
                    month: month,
                    custom: true,
                    id: d.id,  // CRITICAL: Preserve the custom deadline ID!
                    done: edited?.done ?? d.done ?? false,
                    grade: edited?.grade ?? d.grade ?? null,
                    _originalStableId: customStableId
                });
            });
        }
    } catch(e) { console.error('Error adding custom deadlines:', e); }

    // Sort deadlines by date to ensure consistent order
    try {
        deadlines.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
    } catch(e) { console.error('Error sorting deadlines:', e); }

    // Sync upcoming deadlines to roadmapData.upcomingDeadlines for cross-app visibility (Stim Calc)
    try {
        const todayStr = getLocalDateString(new Date());
        const upcomingObj = {};
        let idx = 0;
        deadlines.forEach(d => {
            if (d.date < todayStr || d.done) return;
            const key = 'dl_' + idx++;
            upcomingObj[key] = {
                date: d.date, day: d.day ?? '', what: d.what,
                course: d.course ?? '', weight: d.weight ?? '—', type: d.type ?? 'Other'
            };
        });
        const oldCount = getCount(roadmapData.upcomingDeadlines ?? {});
        roadmapData.upcomingDeadlines = upcomingObj;
        if (oldCount === 0 && idx > 0) {
            setTimeout(() => saveData(), 2000);
        }
    } catch(e) { console.error('Error syncing upcoming deadlines:', e); }

    // CRITICAL FIX: Restore completed deadlines using stable ID matching
    try {
        if (roadmapData.completedDeadlines) {
            Object.entries(roadmapData.completedDeadlines).forEach(([key, completed]) => {
                if (!completed) return;

                // Try to find deadline by stable ID first
                let deadlineIdx = deadlines.findIndex(d => getDeadlineId(d) === key);

                // FIX: Also check _originalStableId — after edits are applied above,
                // getDeadlineId(d) uses post-edit properties, but the completedDeadlines
                // key was stored using the pre-edit _originalStableId
                if (deadlineIdx === -1) {
                    deadlineIdx = deadlines.findIndex(d => d._originalStableId === key);
                }

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

    console.log('[D3-INIT] Deadline restore complete:',
        'total deadlines:', deadlines.length,
        'editedDeadlines keys:', getCount(roadmapData.editedDeadlines),
        'customDeadlines:', getCount(roadmapData.customDeadlines),
        'completedDeadlines:', getCount(roadmapData.completedDeadlines),
        'deletedDeadlines:', getCount(roadmapData.deletedDeadlines),
        'done count:', deadlines.filter(d => d.done).length);

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
    try { renderCompetencies(); } catch(e) { console.error('renderCompetencies error:', e); }
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

    // FALLBACK: If Firebase hangs after 3s, load from localStorage and set ALL sync flags
    // CRITICAL FIX: Skip if user is still typing PIN — firing this with empty localStorage
    // causes defaults to get a recent lastSaved timestamp, which makes finishFirebaseLoad()
    // skip the Firebase merge (thinks local is newer), then saves defaults to Firebase wiping all data.
    setTimeout(() => {
        if (awaitingPinEntry) {
            console.log('[GRAD-FALLBACK] 3s: Skipping — PIN prompt still active');
            return;
        }
        const dateEl = document.getElementById('currentDateDisplay');
        if (dateEl && (dateEl.textContent === 'Loading...' || !dateEl.textContent)) {
            try { loadFromLocalStorage(false); } catch(e) { console.error('3s fallback localStorage load failed:', e); }
            hasLoadedFromCloud = true;
            isInitialLoad = false;
            roadmapData._dataLoaded = true;
            updateSyncStatus('offline', 'Loaded locally');
            try {
                initUI();
            } catch(e) {
                console.error('3s fallback initUI failed:', e);
                try { renderDashboard(); } catch(e2) { console.error('renderDashboard failed:', e2); }
                try { renderDeadlines(); } catch(e3) { console.error('renderDeadlines failed:', e3); }
            }
        }
    }, 3000);

    // UNCONDITIONAL FAILSAFE: If isInitialLoad is STILL true after 6s, force all flags
    // Same fix: skip if user is still at the PIN prompt
    setTimeout(() => {
        if (awaitingPinEntry) {
            console.log('[GRAD-FALLBACK] 6s: Skipping — PIN prompt still active');
            return;
        }
        if (isInitialLoad) {
            console.error('6s failsafe: isInitialLoad still true, forcing flags');
            hasLoadedFromCloud = true;
            isInitialLoad = false;
            roadmapData._dataLoaded = true;
            updateSyncStatus('offline', 'Loaded locally (failsafe)');
            try { initUI(); } catch(e) { console.error('6s failsafe initUI failed:', e); }
        }
    }, 6000);
});
