// clinical.js — Clinical tab: patients, appointments, competencies

// ==================== CLINICAL TAB FUNCTIONS ====================

let currentPatientTasks = []; // Temporary storage for patient modal tasks

function switchClinicalSubtab(subtab, btn) {
    // Update button states
    document.querySelectorAll('.clinical-subtab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide panels
    document.querySelectorAll('.clinical-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById('clinical-' + subtab);
    if (panel) panel.style.display = 'block';
}

function initClinicalTab() {
    ensureCompetenciesInitialized();
    renderActiveRoster();
    renderAppointmentsList();
    renderProceduresList();
    updateClinicalStats();
}

function updateClinicalStats() {
    const patients = roadmapData.clinicalData?.patientRecords || {};
    const appointments = getValues(roadmapData.clinicalData?.appointments);
    const procedures = getValues(roadmapData.clinicalData?.completedProcedures);

    // Count active patients
    const activePatients = Object.values(patients).filter(p => p.status !== 'inactive').length;
    document.getElementById('clinicalStatPatients').textContent = activePatients;

    // Count this week's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekApts = appointments.filter(apt => {
        const aptDate = parseLocalDate(apt.date);
        return aptDate >= today && aptDate <= weekEnd && apt.status !== 'cancelled';
    }).length;
    document.getElementById('clinicalStatWeekApts').textContent = weekApts;

    // Count procedures done
    document.getElementById('clinicalStatProcedures').textContent = procedures.length;

    // Count recalls due
    const recallsDue = Object.values(patients).filter(p => {
        if (!p.recallDue || p.status !== 'active') return false;
        const recallDate = parseLocalDate(p.recallDue);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return recallDate <= thirtyDaysFromNow;
    }).length;
    document.getElementById('clinicalStatRecalls').textContent = recallsDue;
}

// ===== CIS v2: ACTIVE ROSTER (read-only clinical quick-reference) =====
// Replaces old renderPatientsList() + patient CRUD. Patient management lives on Patients tab.

function renderActiveRoster() {
    var container = document.getElementById('patientsList');
    if (!container) return;

    var records = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    var appointments = getValues(roadmapData.clinicalData?.appointments);
    var now = new Date();
    now.setHours(0, 0, 0, 0);

    // Group patients by upcoming schedule
    var thisWeek = [], thisMonth = [], recent = [];
    var weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + (7 - now.getDay()));
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    var thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build next-appointment lookup
    var patientNextApt = {};
    appointments.filter(function(a) { return a.status !== 'cancelled' && a.status !== 'completed'; }).forEach(function(a) {
        if (!a.patientId || !a.date) return;
        if (!patientNextApt[a.patientId] || a.date < patientNextApt[a.patientId].date) {
            patientNextApt[a.patientId] = a;
        }
    });

    Object.entries(records).forEach(function(entry) {
        var id = entry[0], p = entry[1];
        if (!p || !p.name) return;
        var nextApt = patientNextApt[id];
        var item = { id: id, patient: p, nextApt: nextApt };

        if (nextApt) {
            var aptDate = parseLocalDate(nextApt.date);
            if (aptDate && aptDate >= now && aptDate <= weekEnd) { thisWeek.push(item); return; }
            if (aptDate && aptDate >= now && aptDate <= monthEnd) { thisMonth.push(item); return; }
        }
        if (p.lastVisit) {
            var lastDate = parseLocalDate(p.lastVisit);
            if (lastDate && lastDate >= thirtyDaysAgo) { recent.push(item); return; }
        }
    });

    var sortByNextApt = function(a, b) {
        var ad = a.nextApt?.date || '9999'; var bd = b.nextApt?.date || '9999';
        return ad.localeCompare(bd);
    };
    thisWeek.sort(sortByNextApt);
    thisMonth.sort(sortByNextApt);
    recent.sort(function(a, b) { return (b.patient.lastVisit || '').localeCompare(a.patient.lastVisit || ''); });

    function renderGroup(title, items) {
        if (items.length === 0) return '';
        var rows = items.map(function(item) {
            var p = item.patient;
            var safeId = (item.id || '').replace(/['"\\]/g, '');
            var dotColor = p.reliability === 'red' ? '#ef4444' : p.reliability === 'yellow' ? '#f59e0b' : '#22c55e';
            var reliabilityDot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dotColor + ';margin-right:6px;"></span>';
            var nextAptStr = item.nextApt
                ? escapeHtml(item.nextApt.date) + (item.nextApt.procedures ? ' - ' + escapeHtml(item.nextApt.procedures) : '')
                : '<span style="color:#64748b">No upcoming apt</span>';
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);">'
                + '<div>' + reliabilityDot + '<strong>' + escapeHtml(p.name) + '</strong> <span style="color:#64748b;font-size:0.85em;">#' + escapeHtml(p.chartNumber || 'N/A') + '</span>'
                + '<div style="font-size:0.8em;color:#94a3b8;margin-top:2px;">Next: ' + nextAptStr + (p.lastVisit ? ' | Last: ' + escapeHtml(p.lastVisit) : '') + '</div></div>'
                + '<button onclick="navigateToEntity(\'patient\',\'' + safeId + '\')" style="padding:4px 10px;background:#334155;border:none;border-radius:4px;color:#93c5fd;cursor:pointer;font-size:0.8em;">View</button>'
                + '</div>';
        }).join('');
        return '<div style="margin-bottom:16px;"><h4 style="color:#e2e8f0;font-size:0.95em;margin:0 0 8px 0;">' + escapeHtml(title) + ' (' + items.length + ')</h4>'
            + '<div style="background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);">' + rows + '</div></div>';
    }

    // All user text goes through escapeHtml() above
    var html = renderGroup('This Week', thisWeek) + renderGroup('This Month', thisMonth) + renderGroup('Recent (30 days)', recent);
    if (!html) {
        html = '<div style="text-align:center;padding:40px;color:#94a3b8;"><p>No active patients. Import patients on the Patients tab.</p></div>';
    }
    container.innerHTML = html;
}

function deletePatient(patientId) {
    // Accept patientId directly or fall back to modal field
    patientId = patientId || (document.getElementById('patientModalId') ? document.getElementById('patientModalId').value : null);
    if (!patientId) return;

    showCustomConfirm('Are you sure you want to delete this patient? This cannot be undone.', function() {
        // CIS v2: Delegate to cascade function (handles appointments, procedures, competencies, planner, review queue)
        clinicalDataDirty = true;
        cascadeDeletePatient(patientId);
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        renderAppointmentsList();
        updateClinicalStats();
        showToast('Patient deleted');
    }, null, 'Delete Patient');
}

// ===== APPOINTMENT MANAGEMENT =====

function renderAppointmentsList() {
    const container = document.getElementById('appointmentsList');
    const appointments = getValues(roadmapData.clinicalData?.appointments);
    const patients = (typeof getAllPatientRecords === 'function') ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});

    // Sort by date
    const sorted = [...appointments].sort((a, b) => {
        const dateA = parseLocalDate(a.date);
        const dateB = parseLocalDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
    });

    // Filter to upcoming (or all for now)
    const today = getLocalDateString();
    const upcoming = sorted.filter(apt => apt.date >= today && apt.status !== 'cancelled');
    const past = sorted.filter(apt => apt.date < today || apt.status === 'cancelled');

    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #94a3b8;">
                <div style="font-size: 3em; margin-bottom: 10px;">📅</div>
                <p>No appointments scheduled. Add a patient first, then schedule appointments.</p>
            </div>
        `;
        return;
    }

    let html = '';

    if (upcoming.length > 0) {
        html += '<h4 style="color: #10b981; margin: 0 0 15px 0;">Upcoming</h4>';
        html += upcoming.map(apt => renderAppointmentCard(apt, patients)).join('');
    }

    if (past.length > 0) {
        html += '<h4 style="color: #94a3b8; margin: 20px 0 15px 0;">Past/Cancelled</h4>';
        html += past.slice(0, 5).map(apt => renderAppointmentCard(apt, patients)).join('');
        if (past.length > 5) {
            html += `<p style="color: #94a3b8; font-size: 0.85em;">+${past.length - 5} older appointments...</p>`;
        }
    }

    container.innerHTML = html;
}

function renderAppointmentCard(apt, patients) {
    const patient = patients[apt.patientId] || { name: 'Unknown Patient' };
    const aptDate = parseLocalDate(apt.date);
    const dayNum = aptDate ? aptDate.getDate() : '?';
    const monthName = aptDate ? aptDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
    const dayName = aptDate ? aptDate.toLocaleDateString('en-US', { weekday: 'short' }) : '';

    const timeDisplay = apt.time ? formatAptTime(apt.time) : '';
    const durationHrs = apt.duration ? Math.round((apt.duration / 60) * 10) / 10 : 1;
    const status = apt.status || 'scheduled';
    const statusLabel = status === 'scheduled' ? 'Scheduled' :
                        status === 'completed' ? 'Completed' :
                        status === 'cancelled' ? 'Cancelled' :
                        status === 'no_show' ? 'No Show' : status;

    const safeAptId = apt.id.replace(/'/g, "\\'");
    const completeBtn = status === 'completed'
        ? '<button onclick="toggleAppointmentStatus(\'' + safeAptId + '\', event)" style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#10b981; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:0.8em; font-weight:600;" title="Click to uncomplete">✓ Done</button>'
        : (status === 'scheduled'
            ? '<button onclick="toggleAppointmentStatus(\'' + safeAptId + '\', event)" style="background:rgba(59,130,246,0.2); border:1px solid #3b82f6; color:#93c5fd; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:0.8em; font-weight:600;" title="Mark as completed">Complete</button>'
            : '');

    return `
        <div class="appointment-card" onclick="editAppointment('${safeAptId}')">
            <div class="appointment-date">
                <div class="appointment-date-day">${dayNum}</div>
                <div class="appointment-date-month">${monthName}</div>
            </div>
            <div class="appointment-info">
                <h4>${escapeHtml(patient.name)}</h4>
                <div class="appointment-details">
                    ${dayName} ${timeDisplay} · ${durationHrs}h ${apt.chair ? '· Chair ' + apt.chair : ''}
                </div>
                ${apt.procedures ? `<div style="margin-top: 5px; font-size: 0.9em; color: #f59e0b;">${escapeHtml(apt.procedures)}</div>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                <span class="appointment-status ${status}">${statusLabel}</span>
                ${completeBtn}
            </div>
        </div>
    `;
}

function formatAptTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function openAddAppointmentModal(preselectedPatientId = null) {
    // CIS v2: Populate patient dropdown from unified store (AUDIT #10)
    const patients = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    const patientSelect = document.getElementById('appointmentModalPatient');
    patientSelect.innerHTML = '<option value="">Select patient...</option>' +
        Object.values(patients)
            .filter(p => p.status === 'active')
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(p => `<option value="${p.id}" ${p.id === preselectedPatientId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
            .join('');

    document.getElementById('appointmentModalTitle').textContent = '📅 Schedule Appointment';
    document.getElementById('appointmentModalId').value = '';
    document.getElementById('appointmentModalDate').value = getLocalDateString();
    document.getElementById('appointmentModalTime').value = '09:00';
    document.getElementById('appointmentModalDuration').value = '180';
    document.getElementById('appointmentModalChair').value = '';
    document.getElementById('appointmentModalProcedures').value = '';
    document.getElementById('appointmentModalNotes').value = '';
    document.getElementById('appointmentModalCreateDeadline').checked = true;
    document.getElementById('appointmentDeleteBtn').style.display = 'none';

    document.getElementById('appointmentModal').style.display = 'flex';
}

function editAppointment(aptId) {
    const apt = roadmapData.clinicalData?.appointments?.[aptId];
    if (!apt) return;

    // CIS v2: Populate patient dropdown from unified store (AUDIT #10)
    const patients = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    const patientSelect = document.getElementById('appointmentModalPatient');
    patientSelect.innerHTML = '<option value="">Select patient...</option>' +
        Object.values(patients)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(p => `<option value="${p.id}" ${p.id === apt.patientId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
            .join('');

    document.getElementById('appointmentModalTitle').textContent = '✏️ Edit Appointment';
    document.getElementById('appointmentModalId').value = apt.id;
    document.getElementById('appointmentModalDate').value = apt.date || '';
    document.getElementById('appointmentModalTime').value = apt.time || '09:00';
    document.getElementById('appointmentModalDuration').value = String(apt.duration || 180);
    document.getElementById('appointmentModalChair').value = apt.chair || '';
    document.getElementById('appointmentModalProcedures').value = apt.procedures || '';
    document.getElementById('appointmentModalNotes').value = apt.notes || '';
    document.getElementById('appointmentModalCreateDeadline').checked = false;
    document.getElementById('appointmentDeleteBtn').style.display = 'inline-block';

    document.getElementById('appointmentModal').style.display = 'flex';
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
}

function saveAppointment() {
    const patientId = document.getElementById('appointmentModalPatient').value;
    const date = document.getElementById('appointmentModalDate').value;

    if (!patientId || !date) {
        showToast('Patient and date are required', 'error');
        return;
    }

    const aptId = document.getElementById('appointmentModalId').value || 'apt-' + Date.now();
    const isNew = !document.getElementById('appointmentModalId').value;

    const formFields = {
        id: aptId,
        patientId: patientId,
        date: date,
        time: document.getElementById('appointmentModalTime').value,
        duration: parseInt(document.getElementById('appointmentModalDuration').value) || 180,
        chair: document.getElementById('appointmentModalChair').value.trim(),
        procedures: document.getElementById('appointmentModalProcedures').value.trim(),
        notes: document.getElementById('appointmentModalNotes').value.trim()
    };

    if (!roadmapData.clinicalData) roadmapData.clinicalData = { patients: {}, appointments: {}, completedProcedures: {}, patientRecords: {}, dashboardSnapshots: [] };
    if (!roadmapData.clinicalData.appointments) roadmapData.clinicalData.appointments = {};

    // Migrate if needed
    if (Array.isArray(roadmapData.clinicalData.appointments)) {
        roadmapData.clinicalData.appointments = migrateArrayToObject(roadmapData.clinicalData.appointments, 'appt');
    }

    // Merge form fields INTO existing appointment to preserve completedAt, clinicalAppointmentId, status, etc.
    const existingApt = roadmapData.clinicalData.appointments[aptId] || {};
    roadmapData.clinicalData.appointments[aptId] = {
        ...existingApt,
        ...formFields,
        status: existingApt.status || 'scheduled',
        createdAt: existingApt.createdAt || new Date().toISOString()
    };

    // Create deadline if requested
    if (isNew && document.getElementById('appointmentModalCreateDeadline').checked) {
        const patient = roadmapData.clinicalData.patientRecords?.[patientId];
        const patientName = patient?.name || 'Patient';

        // Add to custom deadlines
        if (!roadmapData.customDeadlines || Array.isArray(roadmapData.customDeadlines)) {
            roadmapData.customDeadlines = migrateArrayToObject(roadmapData.customDeadlines, 'deadline');
        }
        const clinicalDeadlineId = generateId('deadline');
        roadmapData.customDeadlines[clinicalDeadlineId] = {
            id: clinicalDeadlineId,
            date: date,
            what: `🏥 ${patientName} - ${formFields.procedures || 'Clinic Apt'}`,
            course: 'Clinical',
            weight: '—',
            type: 'Clinical',
            done: false,
            grade: null,
            clinicalAptId: aptId
        };
    }

    clinicalDataDirty = true;
    // Propagate FIRST (mutates state), then save
    propagateClinicalChanges({ appointments: true, source: 'saveAppointment' });
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    closeAppointmentModal();
    renderAppointmentsList();
    updateClinicalStats();
    if (typeof renderDeadlines === 'function') renderDeadlines();
    if (typeof extendWeeksIfNeeded === 'function') extendWeeksIfNeeded();
    showToast('Appointment saved!');
}

function deleteAppointment() {
    var aptId = document.getElementById('appointmentModalId').value;
    if (!aptId) return;

    showCustomConfirm('Delete this appointment?', function() {
        // CIS v2: Delegate to cascade function
        clinicalDataDirty = true;
        cascadeDeleteAppointment(aptId);
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        closeAppointmentModal();
        renderAppointmentsList();
        updateClinicalStats();
        showToast('Appointment deleted');
    }, null, 'Delete Appointment');
}

// ==================== GRADUATION REQUIREMENTS / COMPETENCIES ====================

// Default competencies data structure
const DEFAULT_COMPETENCIES = {
    fixed: {
        name: 'Fixed Prosthodontics',
        icon: '🦷',
        color: '#3b82f6',
        notes: '2 planned (unreliable). Must include 1 FPD, 1 Implant Crown, 3 CEREC restorations.',
        sections: [
            { title: 'Fixed Formatives (to qualify for summatives)', items: [
                { id: 'fixed-form-prov', text: '6 Provisional Restoration', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Must email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false },
                { id: 'fixed-form-prep', text: '6 Tooth Preparation', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Must email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false },
                { id: 'fixed-form-impr', text: '6 Final Impression', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Must email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false },
                { id: 'fixed-form-cement', text: '6 Cementation', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Must email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false }
            ]},
            { title: 'Fixed Summatives', items: [
                { id: 'fixed-sum-prep', text: '2 Prep (Tooth Preparation)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'fixed-sum-temp', text: '2 Temp (Provisional Restoration)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'fixed-sum-impr', text: '2 Final Impression', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'fixed-sum-cement', text: '2 Cementation', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Other Requirements', items: [
                { id: 'fixed-occlusal-cr', text: 'Occlusal Analysis (Centric Relation)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-occlusal-mi', text: 'Occlusal Analysis (Maximum Intercuspation)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-mock', text: 'Mock Board', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-sim-1', text: 'Fixed Simulation #1 (with Dr. Ferriero)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-sim-2', text: 'Fixed Simulation #2 (with Dr. Ferriero)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-sim-fpd', text: 'Simulation: 3-unit Prep and Temp of FPD', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-case-pres', text: 'Case Presentation (on 2 completed units)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Clinical Experience', items: [
                { id: 'fixed-units', text: 'Minimum clinical units (start to completion)', required: 10, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-fpd', text: 'Must include 1 FPD', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-implant', text: 'Must include 1 Implant-Supported Crown', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-cerec', text: 'Must include minimum 3 CEREC restorations', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    operative: {
        name: 'Operative',
        icon: '🔧',
        color: '#10b981',
        notes: '20 formative surfaces completed. 4 summatives done (2x DO composite). NEED CLASS 5 formatives/summatives. Grade: 86% on first DO.',
        sections: [
            { title: 'Summative Requirements (8 total)', items: [
                { id: 'op-class5-1', text: 'Class V Composite Summative #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-class5-2', text: 'Class V Composite Summative #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: false, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-1', text: 'Multisurface #1 (DO composite)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '86% grade', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-2', text: 'Multisurface #2 (DO composite)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: 'Awaiting grade', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: false, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-3', text: 'Multisurface #3', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: false, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-4', text: 'Multisurface #4', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: false, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-5', text: 'Multisurface #5', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: false, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-6', text: 'Multisurface #6', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: false, rules: 'Max 4 summatives with same faculty', custom: false }
            ]},
            { title: 'Other Requirements', items: [
                { id: 'op-formatives', text: 'Complete 20 formative surfaces', required: 20, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'op-approval', text: 'Approval from Dr. McManama', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'op-assignment', text: 'Operative assignment/survey (Blackboard)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'op-license', text: 'Licensing Exam Prep (Dr. Robinson)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    dentures: {
        name: 'Complete Dentures',
        icon: '🦴',
        color: '#8b5cf6',
        notes: 'In-progress: 2 arches interim CU/CL. Planned: 2 arches definitive CU/CL.',
        sections: [
            { title: 'Complete Denture Formatives', items: [
                { id: 'cd-form-prelim', text: '2 arches: Preliminary Impressions', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-final', text: '2 arches: Final Impression', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-records', text: '1 case: Inter-maxillary records', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-postdam', text: '1 case: Post Dam Technique', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-trial', text: '2 arches: Trial Denture (Tooth Try-In)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-insert', text: '2 arches: Insertion / Clinical Remount', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-adjust', text: '2 arches: Adjustment', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Complete Denture Summatives', items: [
                { id: 'cd-sum-prelim', text: 'Preliminary Impressions (Edentulous)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'cd-sum-final', text: 'Final Impression (Edentulous)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'cd-sum-records', text: 'Inter-maxillary records (Edentulous)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'cd-sum-postdam', text: 'Post-Dam Technique', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'cd-sum-trial', text: 'Trial Denture (Edentulous)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'cd-sum-insert', text: 'Insertion / Clinical Remount (Edentulous)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false },
                { id: 'cd-sum-adjust', text: 'Adjustment (Edentulous)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Overdenture Experience (complete one)', items: [
                { id: 'cd-over-dup', text: 'Duplicate denture and implant planning through surgery', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-over-abut', text: 'Abutment selection, placement & activation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    rpd: {
        name: 'RPDs',
        icon: '🔩',
        color: '#f59e0b',
        notes: 'NEED RPDs - Must complete one track.',
        sections: [
            { title: 'Clinical Experience Tracks (choose one)', items: [
                { id: 'rpd-track1', text: 'Track 1: 1 cast metal partial denture', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'rpd-track2', text: 'Track 2: 2 flexible RPDs + OSCE', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Flexible/interim RPD must have >=2 clasps AND replace >=3 teeth', custom: false },
                { id: 'rpd-track3', text: 'Track 3: 4 interim/resin base RPDs + OSCE', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Flexible/interim RPD must have >=2 clasps AND replace >=3 teeth', custom: false }
            ]},
            { title: 'Formatives & Summatives', items: [
                { id: 'rpd-form-abut', text: 'Formative: Abutment preparations (mounted casts)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'rpd-sum-abut', text: 'Summative: Abutment Preparations (Intra-Oral)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    srp: {
        name: 'SRPs',
        icon: '🩺',
        color: '#ef4444',
        notes: '1 planned (unreliable) UL 1-3 teeth.',
        sections: [
            { title: 'Periodontology Summatives', items: [
                { id: 'srp-calc-1', text: 'Calculus Removal Summative #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'srp-calc-2', text: 'Calculus Removal Summative #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'srp-calc-3', text: 'Calculus Removal Summative #3', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'srp-reeval', text: 'Re-evaluate (SRP) Summative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    endo: {
        name: 'Endodontics',
        icon: '🔬',
        color: '#06b6d4',
        notes: '0 completed, 0 planned.',
        sections: [
            { title: 'Requirements', items: [
                { id: 'endo-rct-1', text: 'Root Canal Treatment #1 (on patient)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-rct-2', text: 'Root Canal Treatment #2 (on patient)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-pulp-1', text: 'Pulpectomy Summative #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-pulp-2', text: 'Pulpectomy Summative #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-postdoc', text: 'Post-doc Endo Assist', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-predoc', text: 'Pre-doc Endo Assist', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-mock', text: 'Passed Mock Board on manikin', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    oralsurg: {
        name: 'Oral Surgery',
        icon: '🏥',
        color: '#ec4899',
        notes: '',
        sections: [
            { title: '3rd Year Requirements', items: [
                { id: 'os-3rd-rotation', text: 'Participate in 3rd Year Oral Surgery Rotation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-3rd-consult', text: 'Summative: Management of Patient having OS Consult', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-3rd-nerve', text: 'Summative: Administration of IA and Long Buccal Block', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-3rd-suture', text: 'Summative: Participation in Suturing Workshop', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: '4th Year Requirements', items: [
                { id: 'os-4th-rotation', text: 'Complete 2-week scheduled rotation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-present', text: 'Presentation at morning seminar', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-oral', text: 'Oral examination (end of rotation)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-rx', text: 'Take-home prescription writing exercise', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-mcq', text: 'MCQ quiz (Med Emergency, Nitrous, Instrument ID)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-sim', text: 'Medical Simulation Lab at BMC', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-nitrous', text: 'Nitrous-Oxide Oxygen Sedation Hands-On training', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Clinical Summatives', items: [
                { id: 'os-extract-1', text: 'Extraction on patient #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-extract-2', text: 'Extraction on patient #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    peds: {
        name: 'Pediatric Dentistry',
        icon: '👶',
        color: '#84cc16',
        notes: '',
        sections: [
            { title: 'Course & Rotations', items: [
                { id: 'peds-course', text: 'Successful completion of PD 530 course', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'peds-rotation', text: 'Rotations in Peds (including Franciscan Hospital)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'peds-assessment', text: 'Post-rotation assessment', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Clinical Summatives (log sheet)', items: [
                { id: 'peds-recall', text: '3 New Patient/Recall', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'peds-sealants', text: '3 Sealants', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'peds-restore', text: '3 Restorative procedures', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    perio: {
        name: 'Periodontology',
        icon: '🦠',
        color: '#f472b6',
        notes: '',
        sections: [
            { title: 'Surgical', items: [
                { id: 'perio-surg-assist', text: '7 Surgical Assist (total 3rd/4th yr, max 1 implant uncovering)', required: 7, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: '3rd Year Specific Summatives', items: [
                { id: 'perio-3rd-ohi', text: 'Oral hygiene instructions (by Oct 1)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-3rd-prophy', text: 'Scaling and Prophy (by May 2026)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '100% - Need SRP summative', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-3rd-reeval', text: 'Re-eval Gingivitis (by May 2026)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Total Formatives (3rd & 4th Year)', items: [
                { id: 'perio-form-ohi', text: '2 Oral Hygiene (1 zoom, 1 in person)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-dx', text: '4 Diagnosis & Treatment Plan', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-prophy', text: '5 Prophy', required: 5, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-quad', text: '3 Quad (SRP)', required: 3, completed: 0, status: 'pending', completionEntries: [], note: 'UL quadrant', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-reeval-ging', text: '3 Re-evaluate Gingivitis', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-reeval-srp', text: '1 Re-evaluate (SRP)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-impr', text: '3 Re-evaluate Impression', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-recall', text: '6 Recall', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Total Summatives (3rd & 4th Year)', items: [
                { id: 'perio-sum-hci', text: '1 Home Care Instruction', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-ohi', required: 2 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-dx', text: '2 Diagnosis & Treatment Plan (Type 2)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-dx', required: 4 }], unlockEmailTo: null, isSummative: false, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-prophy', text: '3 Prophy (total)', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '100% score', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-prophy', required: 5 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-calc', text: '3 Calculus removal', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-quad', required: 3 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-reeval-ging', text: '2 Re-evaluate (Gingivitis)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-reeval-ging', required: 3 }], unlockEmailTo: null, isSummative: false, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-reeval-srp', text: '1 Re-evaluate (SRP)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-reeval-srp', required: 1 }], unlockEmailTo: null, isSummative: false, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-impr', text: '1 Re-evaluate (Impression)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-impr', required: 3 }], unlockEmailTo: null, isSummative: false, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-recall', text: '2 Recall', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: [{ id: 'perio-form-recall', required: 6 }], unlockEmailTo: null, isSummative: false, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-mock', text: '1 Mock Board', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Must initiate in SPS BEFORE procedure', custom: false }
            ]}
        ]
    },
    grouppractice: {
        name: 'Group Practice (GD 640 & GD 642)',
        icon: '👥',
        color: '#0ea5e9',
        notes: '',
        sections: [
            { title: '3rd Year (GD 640)', items: [
                { id: 'gp-attend', text: 'Clinical Attendance (4 per week)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-form-review', text: '1 Formative Periodic Review', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-sum-review', text: '1 Summative Periodic Review', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-form-analysis', text: '2 Formative Written Analyses', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '1 completed, 1 in progress', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-sum-analysis', text: '1 Summative Written Analysis', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-comm', text: 'Communication Workshop', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-leader', text: 'Leadership Workshop', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-case', text: 'Case Presentation at Group Monthly meeting', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-pms-3rd', text: 'Practice Management Scenarios (1 formative + 4 summative, cumulative)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-01', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: '4th Year (GD 642) Summatives', items: [
                { id: 'gp4-comm-txplan', text: '1 Communication Treatment Plan Presentation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-periodicrev-1', text: '2 Periodic Reviews', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-written-analysis', text: '4 Written Analyses', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-pms', text: '4 Practice Management Scenarios (cumulative from 3rd+4th year)', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: '4th Year Leadership Requirements', items: [
                { id: 'gp4-posttreat-eval', text: '3 Post Treatment Evaluations', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-aux-tech', text: 'Auxiliary Team Assessment with Dental Technician - 1 formative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-aux-asst', text: 'Auxiliary Team Assessment with Dental Assistant - 1 formative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-aux-summatives', text: 'Auxiliary Team Summatives (Tech + Assistant combined)', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-rounds-form', text: 'Leading Rounds - 1 formative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-rounds-sum', text: 'Leading Rounds - 1 summative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    txplanning: {
        name: 'Treatment Planning (RS 545)',
        icon: '📋',
        color: '#6366f1',
        notes: 'RS 545 Seminar presentation + Data Collection/Tx Planning Rotation',
        sections: [
            { title: 'Seminar Presentation (20% of grade)', items: [
                { id: 'tx-seminar-1', text: '1 Summative small group presentation - Type 2 case (by Apr 24, 2026)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Seminar Attendance (80% of grade)', items: [
                { id: 'tx-attend-1', text: '2 Attend classmate seminar presentations (by Apr 23, 2027)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Data Collection/Treatment Planning Rotation', items: [
                { id: 'tx-ohra-1', text: '2 OHRA Summatives', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'tx-caries-1', text: '2 Caries Detection Summatives', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    geriatrics: {
        name: 'Geriatric Dental Medicine',
        icon: '👴',
        color: '#8b5cf6',
        notes: 'DMD 27 must challenge didactic course Spring 2026, then complete rotation + assignment',
        sections: [
            { title: 'Requirements', items: [
                { id: 'geri-course', text: 'Successful completion of PH 541 Didactic Course', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'geri-rotation', text: 'Geriatric Dental Medicine Rotation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'geri-assignment', text: 'Clinical Assignment (any GSDM patient or rotation/externship patient)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    externship: {
        name: 'Externship & SPS',
        icon: '🌴',
        color: '#059669',
        notes: 'Complete during 10-week externship rotation',
        sections: [
            { title: 'Externship Requirements', items: [
                { id: 'ext-casepres', text: 'Case Presentation (Upload on BB + self-assessment + mock referral)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'ext-outreach', text: 'Community Outreach Project', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'ext-spslog', text: 'SPS Log of all procedures + debriefing', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    }
};

// Initialize/migrate competencies — call from init paths only, NOT during render.
function ensureCompetenciesInitialized() {
    if (!roadmapData.clinicalData) roadmapData.clinicalData = {};
    if (!roadmapData.clinicalData.competencies) {
        // Initialize from defaults and migrate to object-based storage
        roadmapData.clinicalData.competencies = migrateCompetencies(
            JSON.parse(JSON.stringify(DEFAULT_COMPETENCIES))
        );
    } else {
        // Ensure existing competencies are migrated (in case loaded as arrays)
        const comp = roadmapData.clinicalData.competencies;
        for (const catKey in comp) {
            const cat = comp[catKey];
            if (Array.isArray(cat.sections)) {
                // Needs migration
                roadmapData.clinicalData.competencies = migrateCompetencies(comp);
                break;
            }
        }
    }
}

// CIS v2: Migrate new competency fields to existing Firebase user data
// Without this, mergeCompetencies() only preserves completed/completionEntries/status — new fields never propagate
function migrateCompetencyEnhancements() {
    if (localStorage.getItem('competencyEnhancementsDone_v1')) return;
    var comp = roadmapData.clinicalData?.competencies;
    if (!comp || typeof comp !== 'object') return;

    // Build lookup from DEFAULT_COMPETENCIES
    var defaults = {};
    Object.values(DEFAULT_COMPETENCIES).forEach(function(cat) {
        (cat.sections || []).forEach(function(sec) {
            (sec.items || []).forEach(function(item) { defaults[item.id] = item; });
        });
    });

    // Walk existing items and spread new fields from defaults
    Object.values(comp).forEach(function(cat) {
        getValues(cat.sections).forEach(function(sec) {
            var items = sec.items || {};
            Object.values(items).forEach(function(item) {
                var def = defaults[item.id];
                if (!def) return;
                item.d3Deadline = item.d3Deadline ?? def.d3Deadline ?? null;
                item.unlockedBy = item.unlockedBy ?? def.unlockedBy ?? null;
                item.unlockEmailTo = item.unlockEmailTo ?? def.unlockEmailTo ?? null;
                item.isSummative = item.isSummative ?? def.isSummative ?? false;
                item.rules = item.rules ?? def.rules ?? null;
                item.custom = item.custom ?? def.custom ?? false;
            });
        });
    });

    localStorage.setItem('competencyEnhancementsDone_v1', '1');
    console.log('[CIS-v2] Migrated competency enhancement fields to existing items');
}

// Pure read-only accessor — no side effects during render.
function getCompetenciesData() {
    return roadmapData.clinicalData?.competencies || {};
}

// Get item status based on completed count and manual status override
function getItemStatus(item) {
    if (item.completed >= item.required) return 'completed';
    if (item.completed > 0) return 'in_progress';
    // Check for manual status override
    if (item.status && item.status !== 'pending') return item.status;
    return 'pending';
}

// Calculate stats for a single category - DYNAMIC (uses getValues for object-based storage)
function calculateCategoryStats(cat) {
    let completed = 0, inProgress = 0, planned = 0, pending = 0;
    let totalUnits = 0, completedUnits = 0;

    getValues(cat.sections).forEach(sec => {
        getValues(sec.items).forEach(item => {
            const status = getItemStatus(item);
            totalUnits += item.required;
            completedUnits += Math.min(item.completed, item.required);

            if (status === 'completed') completed++;
            else if (status === 'in_progress') inProgress++;
            else if (status === 'planned') planned++;
            else pending++;
        });
    });

    const percent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
    const totalItems = completed + inProgress + planned + pending;

    return { completed, inProgress, planned, pending, totalItems, totalUnits, completedUnits, percent };
}

// Calculate overall stats - DYNAMIC
function calculateOverallStats(competencies) {
    let totalItems = 0, completedItems = 0, inProgressItems = 0, plannedItems = 0, pendingItems = 0;
    let totalUnits = 0, completedUnits = 0;
    let completedCategories = 0;
    const categoriesCount = Object.keys(competencies).length;

    Object.values(competencies).forEach(cat => {
        const stats = calculateCategoryStats(cat);
        totalItems += stats.totalItems;
        completedItems += stats.completed;
        inProgressItems += stats.inProgress;
        plannedItems += stats.planned;
        pendingItems += stats.pending;
        totalUnits += stats.totalUnits;
        completedUnits += stats.completedUnits;
        if (stats.percent === 100) completedCategories++;
    });

    const overallPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

    return {
        totalItems, completedItems, inProgressItems, plannedItems, pendingItems,
        totalUnits, completedUnits, overallPercent, completedCategories, categoriesCount
    };
}

// Get "What's Next" recommendations (uses getValues for object-based storage)
function getWhatsNextItems(competencies) {
    const nextItems = [];

    Object.entries(competencies).forEach(([catKey, cat]) => {
        getValues(cat.sections).forEach(sec => {
            getValues(sec.items).forEach(item => {
                const status = getItemStatus(item);
                // Prioritize: in_progress first, then planned
                if (status === 'in_progress') {
                    nextItems.push({ ...item, catKey, catName: cat.name, catColor: cat.color, priority: 1 });
                } else if (status === 'planned') {
                    nextItems.push({ ...item, catKey, catName: cat.name, catColor: cat.color, priority: 2 });
                }
            });
        });
    });

    // Sort by priority (in_progress first), then limit to 5
    return nextItems.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

// Track expanded categories
var expandedCompCategories = new Set();

// ==================== CIS v2: COMPETENCY TAB RENDERING HELPERS ====================
// Tasks 4.3-4.18: Milestone dashboard, D3 deadlines, search/filter, evidence cards,
// unlock chains, quick-record, patient view, pace projections, etc.

// Active filter state for competency search/filter
var compSearchQuery = '';
var compActiveFilters = []; // status filters: 'pending','in_progress','completed','planned'

// --- Task 4.3: Milestone Dashboard (3 Progress Rings) ---
function renderMilestoneDashboard() {
    var container = document.getElementById('compMilestoneDashboard');
    if (!container) return;

    var aptCount = typeof getSmartAppointmentCount === 'function' ? getSmartAppointmentCount() : { total: 0 };
    var procCount = typeof getSmartProcedureCount === 'function' ? getSmartProcedureCount() : { total: 0 };

    // Count summative items completed
    var competencies = getCompetenciesData();
    var summativeCompleted = 0;
    var summativeTotal = 0;
    Object.values(competencies).forEach(function(cat) {
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                if (item.isSummative) {
                    summativeTotal++;
                    if (item.completed >= item.required) summativeCompleted++;
                }
            });
        });
    });
    if (summativeTotal === 0) summativeTotal = 7; // fallback per spec

    var readiness = typeof calculateGraduationReadiness === 'function' ? calculateGraduationReadiness() : { percent: 0 };

    // Build 3 rings + readiness
    var rings = [
        { label: 'Appointments', current: aptCount.total, target: 90, color: '#3b82f6' },
        { label: 'Procedures', current: procCount.total, target: 116, color: '#10b981' },
        { label: 'Summatives', current: summativeCompleted, target: summativeTotal, color: '#f59e0b' }
    ];

    var html = '';
    rings.forEach(function(ring) {
        var pct = ring.target > 0 ? Math.min(100, Math.round((ring.current / ring.target) * 100)) : 0;
        var circumference = 2 * Math.PI * 32;
        var offset = circumference - (pct / 100) * circumference;
        html += '<div class="comp-milestone-ring">'
            + '<svg width="80" height="80" viewBox="0 0 80 80">'
            + '<circle cx="40" cy="40" r="32" fill="none" stroke="#334155" stroke-width="6"/>'
            + '<circle cx="40" cy="40" r="32" fill="none" stroke="' + ring.color + '" stroke-width="6" '
            + 'stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" '
            + 'stroke-linecap="round" transform="rotate(-90 40 40)" style="transition:stroke-dashoffset 0.5s;"/>'
            + '<text x="40" y="38" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="700">' + pct + '%</text>'
            + '<text x="40" y="52" text-anchor="middle" fill="#94a3b8" font-size="9">' + ring.current + '/' + ring.target + '</text>'
            + '</svg>'
            + '<div class="comp-ring-label">' + escapeHtml(ring.label) + '</div>'
            + '</div>';
    });

    // Overall readiness card
    var readinessPct = readiness.percent || 0;
    html += '<div class="comp-milestone-ring" style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.08));">'
        + '<div class="comp-ring-value" style="font-size:2em; color:' + (readinessPct >= 80 ? '#10b981' : readinessPct >= 50 ? '#f59e0b' : '#ef4444') + ';">'
        + readinessPct + '%</div>'
        + '<div class="comp-ring-label" style="margin-top:4px;">Graduation Readiness</div>';
    // Pace projection
    var paceResult = typeof calculatePaceProjection === 'function' ? calculatePaceProjection(aptCount.total, 90) : null;
    if (paceResult && paceResult.ratePerWeek > 0) {
        var paceClass = paceResult.behindSchedule ? 'comp-pace-red' : (paceResult.pastGraduation ? 'comp-pace-yellow' : 'comp-pace-green');
        html += '<div class="comp-pace-badge ' + paceClass + '" style="margin-top:6px;">'
            + paceResult.ratePerWeek + '/wk pace</div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

// --- Task 4.4: D3 Deadline Alert Bar ---
function renderD3Deadlines() {
    var container = document.getElementById('compD3Deadlines');
    if (!container) return;

    var competencies = getCompetenciesData();
    var deadlineItems = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    Object.entries(competencies).forEach(function(entry) {
        var catKey = entry[0], cat = entry[1];
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                if (item.d3Deadline && item.completed < item.required) {
                    var parts = item.d3Deadline.split('-').map(Number);
                    var dlDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    var daysLeft = Math.floor((dlDate - today) / 86400000);
                    deadlineItems.push({
                        item: item,
                        catKey: catKey,
                        catName: cat.name,
                        catColor: cat.color,
                        deadline: item.d3Deadline,
                        dlDate: dlDate,
                        daysLeft: daysLeft
                    });
                }
            });
        });
    });

    if (deadlineItems.length === 0) {
        container.innerHTML = '';
        return;
    }

    deadlineItems.sort(function(a, b) { return a.daysLeft - b.daysLeft; });

    var html = '<div style="font-size:0.85em; color:#94a3b8; margin-bottom:8px; font-weight:600;">D3 Deadlines</div>';
    deadlineItems.forEach(function(d) {
        var urgency = d.daysLeft < 0 ? 'overdue' : d.daysLeft < 7 ? 'overdue' : d.daysLeft < 30 ? 'soon' : 'ok';
        var colorMap = { overdue: '#ef4444', soon: '#f59e0b', ok: '#22c55e' };
        var label = d.daysLeft < 0 ? (Math.abs(d.daysLeft) + 'd overdue') : d.daysLeft === 0 ? 'TODAY' : (d.daysLeft + 'd left');
        html += '<div class="comp-d3-card ' + urgency + '">'
            + '<span style="color:' + (d.catColor || '#94a3b8') + '; font-weight:600;">' + escapeHtml(d.catName) + '</span>'
            + '<span style="color:#e2e8f0;">' + escapeHtml(d.item.text.length > 35 ? d.item.text.substring(0, 35) + '...' : d.item.text) + '</span>'
            + '<span style="color:' + colorMap[urgency] + '; font-weight:600; white-space:nowrap;">' + label + '</span>'
            + '<span style="color:#64748b; font-size:0.9em;">' + d.item.completed + '/' + d.item.required + '</span>'
            + '</div>';
    });

    container.innerHTML = html;
}

// --- Task 4.5: What's Next Panel ---
function renderWhatsNextPanel(competencies) {
    var container = document.getElementById('compWhatsNext');
    if (!container) return;

    var items = getWhatsNextItems(competencies);
    if (items.length === 0) {
        container.innerHTML = '';
        return;
    }

    var html = '<div style="font-size:0.85em; color:#94a3b8; margin-bottom:8px; font-weight:600;">What\'s Next</div>';
    items.forEach(function(item) {
        var pct = item.required > 0 ? Math.round((item.completed / item.required) * 100) : 0;
        var safeId = (item.id || '').replace(/['"\\]/g, '');
        html += '<div class="comp-whatsnext-card">'
            + '<span style="background:' + (item.catColor || '#3b82f6') + '22; color:' + (item.catColor || '#3b82f6') + '; padding:2px 8px; border-radius:4px; font-size:0.75em; white-space:nowrap;">'
            + escapeHtml(item.catName) + '</span>'
            + '<span style="flex:1; color:#e2e8f0; font-size:0.9em;">' + escapeHtml(item.text) + '</span>'
            + '<div class="comp-wn-progress"><div class="comp-wn-bar" style="width:' + pct + '%; background:' + (item.catColor || '#3b82f6') + ';"></div></div>'
            + '<span style="color:#94a3b8; font-size:0.8em; white-space:nowrap;">' + item.completed + '/' + item.required + '</span>'
            + '<button onclick="openCompQuickRecord(\'' + safeId + '\')" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10b981; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:0.8em; white-space:nowrap;">Record</button>'
            + '</div>';
    });

    container.innerHTML = html;
}

// --- Task 4.6: Review Queue UI ---
function renderReviewQueue() {
    var container = document.getElementById('compReviewQueue');
    if (!container) return;

    var queue = roadmapData.clinicalData?.autoLinkReviewQueue;
    if (!Array.isArray(queue)) queue = [];
    queue = queue.filter(function(q) { return q && q.procedureId; });

    if (queue.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<span style="font-weight:600;">' + queue.length + ' procedure'
        + (queue.length > 1 ? 's' : '') + ' pending competency review</span>'
        + ' <span style="color:#818cf8; text-decoration:underline;">Click to review</span>';
    container.onclick = function() { openReviewQueuePanel(); };
}

function openReviewQueuePanel() {
    var queue = roadmapData.clinicalData?.autoLinkReviewQueue;
    if (!Array.isArray(queue) || queue.length === 0) {
        showToast('No items in review queue');
        return;
    }

    var html = '<div style="max-height:60vh; overflow-y:auto;">';
    queue.forEach(function(q, idx) {
        var procDate = q.date ? parseLocalDate(q.date) : null;
        var dateStr = procDate ? procDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        var safeProcId = (q.procedureId || '').replace(/['"\\]/g, '');

        html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.3); border-radius:8px; padding:12px; margin-bottom:10px;">'
            + '<div style="font-weight:600; color:#e2e8f0;">' + escapeHtml(q.procedureName || 'Unknown') + '</div>'
            + '<div style="font-size:0.85em; color:#94a3b8; margin-bottom:8px;">' + dateStr + '</div>';

        if (q.suggestedItems && q.suggestedItems.length > 0) {
            q.suggestedItems.forEach(function(s) {
                var safeItemId = (s.itemId || '').replace(/['"\\]/g, '');
                html += '<div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(100,116,139,0.15);">'
                    + '<span style="flex:1; color:#e2e8f0; font-size:0.9em;">' + escapeHtml(s.itemText || '') + '</span>'
                    + '<span style="color:#94a3b8; font-size:0.75em; padding:2px 6px; border-radius:3px; background:rgba(100,116,139,0.15);">'
                    + escapeHtml(s.confidence || 'medium') + '</span>'
                    + '<button onclick="acceptReviewSuggestion(\'' + safeProcId + '\', \'' + safeItemId + '\')" '
                    + 'style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10b981; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.8em;">Accept</button>'
                    + '<button onclick="rejectReviewSuggestion(\'' + safeProcId + '\', \'' + safeItemId + '\')" '
                    + 'style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#f87171; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.8em;">Reject</button>'
                    + '</div>';
            });
        }

        html += '<button onclick="dismissReviewItem(\'' + safeProcId + '\')" '
            + 'style="margin-top:8px; background:none; border:1px solid #334155; color:#94a3b8; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:0.8em;">Dismiss</button>'
            + '</div>';
    });
    html += '</div>';

    showCustomConfirm(html, null, null, 'Competency Review Queue');
}

function acceptReviewSuggestion(procId, itemId) {
    var proc = roadmapData.clinicalData?.completedProcedures?.[procId];
    if (!proc) { showToast('Procedure not found', 'error'); return; }

    if (!Array.isArray(proc.competencyItemIds)) proc.competencyItemIds = [];
    if (proc.competencyItemIds.indexOf(itemId) === -1) {
        proc.competencyItemIds.push(itemId);
        linkProcedureToCompetencies(proc);
    }

    // Remove this suggestion from queue item
    var queue = roadmapData.clinicalData.autoLinkReviewQueue || [];
    var qItem = queue.find(function(q) { return q.procedureId === procId; });
    if (qItem && qItem.suggestedItems) {
        qItem.suggestedItems = qItem.suggestedItems.filter(function(s) { return s.itemId !== itemId; });
        if (qItem.suggestedItems.length === 0) {
            roadmapData.clinicalData.autoLinkReviewQueue = queue.filter(function(q) { return q.procedureId !== procId; });
        }
    }

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderCompetencies();
    showToast('Competency linked');
}

function rejectReviewSuggestion(procId, itemId) {
    var queue = roadmapData.clinicalData?.autoLinkReviewQueue || [];
    var qItem = queue.find(function(q) { return q.procedureId === procId; });
    if (qItem && qItem.suggestedItems) {
        qItem.suggestedItems = qItem.suggestedItems.filter(function(s) { return s.itemId !== itemId; });
        if (qItem.suggestedItems.length === 0) {
            roadmapData.clinicalData.autoLinkReviewQueue = queue.filter(function(q) { return q.procedureId !== procId; });
        }
    }
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderReviewQueue();
    showToast('Suggestion rejected');
}

function dismissReviewItem(procId) {
    var queue = roadmapData.clinicalData?.autoLinkReviewQueue || [];
    roadmapData.clinicalData.autoLinkReviewQueue = queue.filter(function(q) { return q.procedureId !== procId; });
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderReviewQueue();
    showToast('Review item dismissed');
}

// --- Task 4.7: Unlock Chain Visualization ---
function renderUnlockChain(catKey, items) {
    // Collect items that have unlockedBy prerequisites
    var chainItems = items.filter(function(item) {
        return item.unlockedBy && Array.isArray(item.unlockedBy) && item.unlockedBy.length > 0;
    });
    if (chainItems.length === 0) return '';

    var competencies = getCompetenciesData();
    var html = '';
    chainItems.forEach(function(item) {
        var unlocked = typeof isItemUnlocked === 'function' ? isItemUnlocked(item, competencies) : true;
        var lockIcon = unlocked ? '<span style="color:#10b981;">&#x1f513;</span>' : '<span style="color:#ef4444;">&#x1f512;</span>';

        html += '<div class="comp-unlock-chain">';
        item.unlockedBy.forEach(function(prereq, idx) {
            var prereqResult = typeof findCompetencyItem === 'function' ? findCompetencyItem(prereq.id) : null;
            var prereqItem = prereqResult ? prereqResult.item : null;
            var prereqDone = prereqItem ? prereqItem.completed >= prereq.required : false;
            var prereqPct = prereqItem && prereq.required > 0 ? Math.round((prereqItem.completed / prereq.required) * 100) : 0;

            if (idx > 0) html += '<span class="comp-unlock-arrow">+</span>';
            html += '<span style="color:' + (prereqDone ? '#10b981' : '#f59e0b') + '; font-size:0.85em;">'
                + escapeHtml(prereqItem ? prereqItem.text.substring(0, 25) : prereq.id)
                + ' (' + (prereqItem ? prereqItem.completed : '?') + '/' + prereq.required + ')'
                + '</span>';
        });
        html += '<span class="comp-unlock-arrow">&rarr;</span>';
        html += lockIcon + ' <span style="color:#e2e8f0; font-size:0.85em;">' + escapeHtml(item.text.substring(0, 30)) + '</span>';
        if (item.unlockEmailTo) {
            html += '<span style="color:#64748b; font-size:0.75em; margin-left:4px;">(email ' + escapeHtml(item.unlockEmailTo) + ')</span>';
        }
        html += '</div>';
    });
    return html;
}

// --- Task 4.8: Full Evidence Trail with Rich Cards ---
function renderEvidenceCards(item, catKey) {
    var entries = getValues(item.completionEntries);
    if (entries.length === 0) return '';

    var safeItemId = (item.id || '').replace(/['"\\]/g, '');
    var safeCatKey = (catKey || '').replace(/['"\\]/g, '');

    var html = '<div style="margin: 4px 0 8px 20px;">'
        + '<div style="color:#6ee7b7; font-weight:600; margin-bottom:4px; font-size:0.8em;">Evidence (' + entries.length + '):</div>';

    entries.forEach(function(entry, idx) {
        var entryDate = entry.date ? parseLocalDate(entry.date) : null;
        var dateStr = entryDate ? entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

        // Determine type for styling
        var typeClass = 'type-manual';
        var typeBadge = 'Manual';
        if (entry.procedureId) {
            typeClass = 'type-procedure';
            typeBadge = 'Procedure';
        } else if (entry.note && entry.note.indexOf('Backfill') !== -1) {
            typeClass = 'type-backfill';
            typeBadge = 'Backfill';
        } else if (entry.note && entry.note.indexOf('import') !== -1) {
            typeClass = 'type-import';
            typeBadge = 'Import';
        } else if (entry.note && entry.note.indexOf('auto') !== -1) {
            typeClass = 'type-autolinked';
            typeBadge = 'Auto-linked';
        }

        var patientClickable = entry.patientId
            ? ' onclick="navigateToEntity(\'patient\', \'' + (entry.patientId || '').replace(/['"\\]/g, '') + '\')" style="cursor:pointer; text-decoration:underline;"'
            : '';

        html += '<div class="comp-evidence-card ' + typeClass + '">'
            + '<span style="color:#64748b; font-size:0.75em; padding:1px 5px; border-radius:3px; background:rgba(100,116,139,0.15); white-space:nowrap;">' + typeBadge + '</span>'
            + '<span style="color:#94a3b8; white-space:nowrap;">' + dateStr + '</span>'
            + '<span' + patientClickable + ' style="color:#e2e8f0;' + (entry.patientId ? ' cursor:pointer; text-decoration:underline;' : '') + '">'
            + escapeHtml(entry.patientName || 'Unknown') + '</span>'
            + (entry.note ? '<span style="color:#64748b; flex:1; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(entry.note.substring(0, 50)) + '</span>' : '')
            + '<button onclick="removeEvidenceEntry(\'' + safeCatKey + '\', \'' + safeItemId + '\', ' + idx + '); event.stopPropagation();" '
            + 'style="background:none; border:none; color:#64748b; cursor:pointer; font-size:0.85em; padding:2px 4px;" title="Remove">x</button>'
            + '</div>';
    });

    html += '</div>';
    return html;
}

function removeEvidenceEntry(catKey, itemId, entryIndex) {
    var competencies = getCompetenciesData();
    var cat = competencies[catKey];
    if (!cat) return;

    var foundItem = null;
    getValues(cat.sections).forEach(function(sec) {
        if (sec.items && sec.items[itemId]) foundItem = sec.items[itemId];
    });
    if (!foundItem) return;

    if (!Array.isArray(foundItem.completionEntries)) foundItem.completionEntries = getValues(foundItem.completionEntries);
    if (entryIndex < 0 || entryIndex >= foundItem.completionEntries.length) return;

    var removed = foundItem.completionEntries.splice(entryIndex, 1)[0];
    foundItem.completed = Math.min(foundItem.required, foundItem.completionEntries.length);
    if (foundItem.completed >= foundItem.required) {
        foundItem.status = 'completed';
    } else if (foundItem.completed > 0) {
        foundItem.status = 'in_progress';
    } else {
        foundItem.status = 'pending';
    }

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderCompetencies();

    // Undo toast
    showToast('Evidence removed. <span style="text-decoration:underline; cursor:pointer;" onclick="undoRemoveEvidence(\'' + catKey.replace(/['"\\]/g, '') + '\', \'' + itemId.replace(/['"\\]/g, '') + '\', ' + JSON.stringify(removed).replace(/'/g, "\\'") + ')">Undo</span>');
}

function undoRemoveEvidence(catKey, itemId, removedJson) {
    var competencies = getCompetenciesData();
    var cat = competencies[catKey];
    if (!cat) return;

    var foundItem = null;
    getValues(cat.sections).forEach(function(sec) {
        if (sec.items && sec.items[itemId]) foundItem = sec.items[itemId];
    });
    if (!foundItem) return;

    if (!Array.isArray(foundItem.completionEntries)) foundItem.completionEntries = getValues(foundItem.completionEntries);
    var entry = typeof removedJson === 'string' ? JSON.parse(removedJson) : removedJson;
    foundItem.completionEntries.push(entry);
    foundItem.completed = Math.min(foundItem.required, foundItem.completionEntries.length);
    if (foundItem.completed >= foundItem.required) {
        foundItem.status = 'completed';
    } else if (foundItem.completed > 0) {
        foundItem.status = 'in_progress';
    }

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderCompetencies();
    showToast('Evidence restored');
}

// --- Task 4.9: "Which Patients Can Fulfill This?" Badges ---
function getPatientsFulfilling(itemId) {
    var records = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    var matching = [];

    Object.entries(records).forEach(function(entry) {
        var ptId = entry[0], pt = entry[1];
        if (!pt || !pt.name) return;
        if (Array.isArray(pt.importedRequirements)) {
            var hasMatch = pt.importedRequirements.some(function(req) {
                return req.reqId && req.reqId.toLowerCase() === itemId.toLowerCase();
            });
            if (hasMatch) {
                matching.push({ id: ptId, name: pt.name, chartNumber: pt.chartNumber || '' });
            }
        }
    });
    return matching;
}

function renderPatientBadges(itemId) {
    var patients = getPatientsFulfilling(itemId);
    if (patients.length === 0) return '';

    var html = '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">';
    patients.forEach(function(pt) {
        var safeId = (pt.id || '').replace(/['"\\]/g, '');
        html += '<span class="comp-patient-badge" onclick="navigateToEntity(\'patient\', \'' + safeId + '\')">'
            + escapeHtml(pt.name)
            + (pt.chartNumber ? ' #' + escapeHtml(pt.chartNumber) : '')
            + '</span>';
    });
    html += '</div>';
    return html;
}

// --- Task 4.10: Critical Rules Display Per Category ---
function renderCategoryRules(catKey, items) {
    var uniqueRules = {};
    items.forEach(function(item) {
        if (item.rules && item.rules.trim()) {
            uniqueRules[item.rules.trim()] = true;
        }
    });

    var rulesList = Object.keys(uniqueRules);
    if (rulesList.length === 0) return '';

    var html = '<details class="comp-rules-details">'
        + '<summary>Rules & Requirements (' + rulesList.length + ')</summary>';
    rulesList.forEach(function(rule) {
        html += '<div class="comp-rule-item">' + escapeHtml(rule) + '</div>';
    });
    html += '</details>';
    return html;
}

// --- Task 4.11: Pace Projection Per Category ---
function renderCategoryPace(catKey, stats) {
    if (stats.totalUnits === 0 || stats.completedUnits >= stats.totalUnits) return '';

    var remaining = stats.totalUnits - stats.completedUnits;
    // Calculate weeks until graduation (May 2027)
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var gradDate = new Date(2027, 4, 15); // May 15, 2027
    var weeksLeft = Math.max(1, Math.floor((gradDate - today) / (7 * 86400000)));
    var unitsPerWeek = (remaining / weeksLeft).toFixed(1);

    var paceClass = 'comp-pace-green';
    if (unitsPerWeek > 3) paceClass = 'comp-pace-red';
    else if (unitsPerWeek > 1.5) paceClass = 'comp-pace-yellow';

    return '<span class="comp-pace-badge ' + paceClass + '">'
        + remaining + ' remaining &middot; ' + unitsPerWeek + '/wk needed</span>';
}

// --- Task 4.12: Search and Filter Bar ---
function renderCompSearchBar() {
    var container = document.getElementById('compSearchBar');
    if (!container) return;

    var filters = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Not Started' },
        { key: 'in_progress', label: 'In Progress' },
        { key: 'completed', label: 'Completed' },
        { key: 'planned', label: 'Planned' }
    ];

    var html = '<input type="text" placeholder="Search competencies..." value="' + escapeHtml(compSearchQuery) + '" '
        + 'oninput="compSearchQuery = this.value; filterCompetencies();">';

    filters.forEach(function(f) {
        var isActive = (f.key === 'all' && compActiveFilters.length === 0) || compActiveFilters.indexOf(f.key) !== -1;
        html += '<span class="comp-filter-chip' + (isActive ? ' active' : '') + '" onclick="toggleCompFilter(\'' + f.key + '\')">'
            + f.label + '</span>';
    });

    if (compSearchQuery || compActiveFilters.length > 0) {
        html += '<span class="comp-filter-chip" onclick="clearCompFilters()" style="color:#f87171; border-color:rgba(239,68,68,0.3);">Clear</span>';
    }

    container.innerHTML = html;
}

function filterCompetencies() {
    renderCompetencies();
}

function toggleCompFilter(key) {
    if (key === 'all') {
        compActiveFilters = [];
    } else {
        var idx = compActiveFilters.indexOf(key);
        if (idx !== -1) {
            compActiveFilters.splice(idx, 1);
        } else {
            compActiveFilters.push(key);
        }
    }
    renderCompetencies();
}

function clearCompFilters() {
    compSearchQuery = '';
    compActiveFilters = [];
    renderCompetencies();
}

// Check if an item matches current search/filter criteria
function compItemMatchesFilter(item) {
    // Text search
    if (compSearchQuery) {
        var q = compSearchQuery.toLowerCase();
        var itemText = (item.text || '').toLowerCase();
        var itemNote = (item.note || '').toLowerCase();
        if (itemText.indexOf(q) === -1 && itemNote.indexOf(q) === -1 && (item.id || '').toLowerCase().indexOf(q) === -1) {
            return false;
        }
    }
    // Status filter
    if (compActiveFilters.length > 0) {
        var status = getItemStatus(item);
        if (compActiveFilters.indexOf(status) === -1) return false;
    }
    return true;
}

// Check if any item in a category matches filters (for hiding empty categories)
function compCategoryHasVisibleItems(cat) {
    var hasVisible = false;
    getValues(cat.sections).forEach(function(sec) {
        getValues(sec.items).forEach(function(item) {
            if (compItemMatchesFilter(item)) hasVisible = true;
        });
    });
    return hasVisible;
}

// --- Task 4.13: Inline Quick-Record Modal ---
function openCompQuickRecord(itemId) {
    var result = typeof findCompetencyItem === 'function' ? findCompetencyItem(itemId) : null;
    if (!result) { showToast('Competency item not found', 'error'); return; }

    var item = result.item;
    var records = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});

    // Build patient dropdown options
    var patientOptions = '<option value="">-- No Patient --</option>';
    Object.entries(records).forEach(function(entry) {
        var ptId = entry[0], pt = entry[1];
        if (pt && pt.name && pt.status !== 'inactive') {
            patientOptions += '<option value="' + escapeHtml(ptId) + '">' + escapeHtml(pt.name)
                + (pt.chartNumber ? ' #' + escapeHtml(pt.chartNumber) : '') + '</option>';
        }
    });

    var modalHtml = '<div id="compQuickRecordOverlay" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); z-index:10000; display:flex; align-items:center; justify-content:center;">'
        + '<div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:24px; max-width:400px; width:90%;">'
        + '<h3 style="color:#e2e8f0; margin:0 0 16px;">Quick Record: ' + escapeHtml(item.text.substring(0, 40)) + '</h3>'
        + '<div style="color:#94a3b8; font-size:0.85em; margin-bottom:12px;">' + item.completed + '/' + item.required + ' completed</div>'
        + '<div style="margin-bottom:12px;">'
        + '<label style="color:#94a3b8; font-size:0.85em; display:block; margin-bottom:4px;">Patient</label>'
        + '<select id="compQR_patient" style="width:100%; padding:8px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#e2e8f0;">'
        + patientOptions + '</select></div>'
        + '<div style="margin-bottom:12px;">'
        + '<label style="color:#94a3b8; font-size:0.85em; display:block; margin-bottom:4px;">Date</label>'
        + '<input type="date" id="compQR_date" value="' + getLocalDateString() + '" style="width:100%; padding:8px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#e2e8f0;"></div>'
        + '<div style="margin-bottom:16px;">'
        + '<label style="color:#94a3b8; font-size:0.85em; display:block; margin-bottom:4px;">Notes</label>'
        + '<textarea id="compQR_notes" rows="2" placeholder="Optional notes..." style="width:100%; padding:8px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#e2e8f0; resize:vertical;"></textarea></div>'
        + '<div style="display:flex; gap:8px; justify-content:flex-end;">'
        + '<button onclick="closeCompQuickRecord()" style="padding:8px 16px; background:#334155; border:none; border-radius:6px; color:#e2e8f0; cursor:pointer;">Cancel</button>'
        + '<button onclick="submitCompQuickRecord(\'' + (itemId || '').replace(/['"\\]/g, '') + '\', \'' + (result.catKey || '').replace(/['"\\]/g, '') + '\')" '
        + 'style="padding:8px 16px; background:#10b981; border:none; border-radius:6px; color:white; cursor:pointer; font-weight:600;">Record</button>'
        + '</div></div></div>';

    var overlay = document.createElement('div');
    overlay.innerHTML = modalHtml;
    document.body.appendChild(overlay.firstChild);
}

function closeCompQuickRecord() {
    var overlay = document.getElementById('compQuickRecordOverlay');
    if (overlay) overlay.remove();
}

function submitCompQuickRecord(itemId, catKey) {
    var patientId = document.getElementById('compQR_patient').value;
    var dateVal = document.getElementById('compQR_date').value || getLocalDateString();
    var notes = document.getElementById('compQR_notes').value.trim();

    var patientName = '';
    if (patientId) {
        var records = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : {};
        var pt = records[patientId];
        if (pt) patientName = pt.name || '';
    }

    // Create procedure record
    var proc = recordProcedure({
        patientId: patientId || null,
        patientName: patientName,
        date: dateVal,
        procedureType: catKey || 'other',
        procedure: 'Quick record for competency',
        competencyItemIds: [itemId],
        notes: notes || 'Recorded from Competencies tab',
        faculty: ''
    });

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    closeCompQuickRecord();
    renderCompetencies();
    if (typeof renderDashboard === 'function') renderDashboard();
    showToast('Evidence recorded');
}

// --- Task 4.14: Persistent Expanded State ---
function persistExpandedState() {
    if (!roadmapData.competencyUIState) roadmapData.competencyUIState = { expandedCategories: [], viewMode: 'department' };
    roadmapData.competencyUIState.expandedCategories = Array.from(expandedCompCategories);
    // Lightweight save — no full saveData() needed for UI state
}

function restoreExpandedState() {
    var saved = roadmapData.competencyUIState?.expandedCategories;
    if (Array.isArray(saved) && saved.length > 0) {
        expandedCompCategories = new Set(saved);
    }
}

// --- Task 4.15: Urgency-Sorted Category Keys ---
function getUrgencySortedCategoryKeys(competencies) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var entries = Object.entries(competencies).map(function(entry) {
        var key = entry[0], cat = entry[1];
        var stats = calculateCategoryStats(cat);
        var hasD3Deadline = false;
        var earliestDeadlineDays = Infinity;

        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                if (item.d3Deadline && item.completed < item.required) {
                    hasD3Deadline = true;
                    var parts = item.d3Deadline.split('-').map(Number);
                    var dlDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    var daysLeft = Math.floor((dlDate - today) / 86400000);
                    if (daysLeft < earliestDeadlineDays) earliestDeadlineDays = daysLeft;
                }
            });
        });

        return {
            key: key,
            cat: cat,
            stats: stats,
            hasD3Deadline: hasD3Deadline,
            earliestDeadlineDays: earliestDeadlineDays,
            isComplete: stats.percent === 100
        };
    });

    entries.sort(function(a, b) {
        // 100% complete always last
        if (a.isComplete && !b.isComplete) return 1;
        if (!a.isComplete && b.isComplete) return -1;
        // D3 deadline items first
        if (a.hasD3Deadline && !b.hasD3Deadline) return -1;
        if (!a.hasD3Deadline && b.hasD3Deadline) return 1;
        if (a.hasD3Deadline && b.hasD3Deadline) return a.earliestDeadlineDays - b.earliestDeadlineDays;
        // Lowest completion % next
        return a.stats.percent - b.stats.percent;
    });

    return entries;
}

// --- Task 4.16: By Patient View Mode ---
function renderCompViewToggle() {
    var container = document.getElementById('compViewToggle');
    if (!container) return;

    var mode = roadmapData.competencyUIState?.viewMode || 'department';
    container.innerHTML = '<button onclick="setCompViewMode(\'department\')" '
        + 'style="padding:4px 10px; border-radius:4px 0 0 4px; font-size:0.8em; cursor:pointer; border:1px solid #334155; '
        + (mode === 'department' ? 'background:#3b82f6; color:white; border-color:#3b82f6;' : 'background:#1e293b; color:#94a3b8;')
        + '">By Department</button>'
        + '<button onclick="setCompViewMode(\'patient\')" '
        + 'style="padding:4px 10px; border-radius:0 4px 4px 0; font-size:0.8em; cursor:pointer; border:1px solid #334155; border-left:none; '
        + (mode === 'patient' ? 'background:#3b82f6; color:white; border-color:#3b82f6;' : 'background:#1e293b; color:#94a3b8;')
        + '">By Patient</button>';
}

function setCompViewMode(mode) {
    if (!roadmapData.competencyUIState) roadmapData.competencyUIState = { expandedCategories: [], viewMode: 'department' };
    roadmapData.competencyUIState.viewMode = mode;
    renderCompetencies();
}

function renderByPatientView(container) {
    var records = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    var competencies = getCompetenciesData();

    // Collect patients with outstanding imported requirements
    var patientItems = [];
    Object.entries(records).forEach(function(entry) {
        var ptId = entry[0], pt = entry[1];
        if (!pt || !pt.name || pt.status === 'inactive') return;
        if (!Array.isArray(pt.importedRequirements) || pt.importedRequirements.length === 0) return;

        var outstanding = pt.importedRequirements.filter(function(req) {
            var result = typeof findCompetencyItem === 'function' ? findCompetencyItem(req.reqId) : null;
            if (!result) return false;
            return result.item.completed < result.item.required;
        });

        if (outstanding.length > 0) {
            patientItems.push({ id: ptId, patient: pt, outstanding: outstanding });
        }
    });

    if (patientItems.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;">'
            + '<div style="font-size:2em; margin-bottom:10px;">&#128100;</div>'
            + '<p>No patients with outstanding imported requirements.</p>'
            + '<p style="font-size:0.85em;">Import patient requirements from clinical data to see them here.</p>'
            + '</div>';
        return;
    }

    // Sort by number of outstanding requirements (most first)
    patientItems.sort(function(a, b) { return b.outstanding.length - a.outstanding.length; });

    var html = '';
    patientItems.forEach(function(pi) {
        var safeId = (pi.id || '').replace(/['"\\]/g, '');
        html += '<div style="background:rgba(30,41,59,0.6); border:1px solid rgba(100,116,139,0.2); border-radius:10px; padding:14px; margin-bottom:10px;">'
            + '<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">'
            + '<span style="font-size:1.4em;">&#128100;</span>'
            + '<div>'
            + '<div style="font-weight:600; color:#e2e8f0; cursor:pointer; text-decoration:underline;" onclick="navigateToEntity(\'patient\', \'' + safeId + '\')">'
            + escapeHtml(pi.patient.name) + '</div>'
            + (pi.patient.chartNumber ? '<div style="font-size:0.8em; color:#94a3b8;">#' + escapeHtml(pi.patient.chartNumber) + '</div>' : '')
            + '</div>'
            + '<span style="margin-left:auto; background:rgba(245,158,11,0.15); color:#fcd34d; padding:2px 8px; border-radius:4px; font-size:0.8em;">'
            + pi.outstanding.length + ' remaining</span>'
            + '</div>';

        pi.outstanding.forEach(function(req) {
            var result = typeof findCompetencyItem === 'function' ? findCompetencyItem(req.reqId) : null;
            if (!result) return;
            var item = result.item;
            var pct = item.required > 0 ? Math.round((item.completed / item.required) * 100) : 0;
            var safeItemId = (item.id || '').replace(/['"\\]/g, '');

            html += '<div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(100,116,139,0.1);">'
                + '<span style="flex:1; color:#e2e8f0; font-size:0.9em;">' + escapeHtml(item.text) + '</span>'
                + '<span style="color:#94a3b8; font-size:0.8em; white-space:nowrap;">' + item.completed + '/' + item.required + '</span>'
                + '<div style="width:50px; height:4px; background:#334155; border-radius:2px; overflow:hidden;">'
                + '<div style="height:100%; width:' + pct + '%; background:#10b981; border-radius:2px;"></div></div>'
                + '<button onclick="openCompQuickRecord(\'' + safeItemId + '\')" '
                + 'style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10b981; border-radius:4px; padding:3px 8px; cursor:pointer; font-size:0.8em;">Record</button>'
                + '</div>';
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

// --- Task 4.17: Inline Editable Per-Item Notes ---
var _compNoteCommitted = {};

function saveCompItemNote(catKey, itemId, newNote) {
    if (_compNoteCommitted[catKey + ':' + itemId]) return;
    _compNoteCommitted[catKey + ':' + itemId] = true;

    var competencies = getCompetenciesData();
    var cat = competencies[catKey];
    if (!cat) return;

    getValues(cat.sections).forEach(function(sec) {
        if (sec.items && sec.items[itemId]) {
            sec.items[itemId].note = newNote || null;
        }
    });

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Clear committed flag after save
    setTimeout(function() { delete _compNoteCommitted[catKey + ':' + itemId]; }, 100);
}

// ==================== END CIS v2 HELPER FUNCTIONS ====================

function renderCompetencies() {
    var container = document.getElementById('competenciesContainer');
    var dashboardContainer = document.getElementById('overallProgressSummary');
    if (!container) return;

    var competencies = getCompetenciesData();
    var stats = calculateOverallStats(competencies);

    // Task 4.14: Restore persisted expanded state
    restoreExpandedState();

    // Task 4.12: Render search and filter bar
    renderCompSearchBar();

    // Task 4.16: Render view mode toggle
    renderCompViewToggle();

    // Task 4.3: Render milestone dashboard (3 progress rings)
    renderMilestoneDashboard();

    // Task 4.4: Render D3 deadline alert bar
    renderD3Deadlines();

    // Task 4.5: Render what's next panel
    renderWhatsNextPanel(competencies);

    // Task 4.6: Render review queue banner
    renderReviewQueue();

    // Calculate progress ring values for overall summary
    var circumference = 2 * Math.PI * 54;
    var dashOffset = circumference - (stats.overallPercent / 100) * circumference;

    // Render overall dashboard with progress ring
    if (dashboardContainer) {
        dashboardContainer.innerHTML = '<div class="comp-overall-dashboard">'
            + '<div class="comp-overall-stats">'
            + '<div class="comp-stat-card"><div class="comp-stat-value" style="color: #10b981;">' + stats.completedItems + '</div><div class="comp-stat-label">Completed</div></div>'
            + '<div class="comp-stat-card"><div class="comp-stat-value" style="color: #fbbf24;">' + stats.inProgressItems + '</div><div class="comp-stat-label">In Progress</div></div>'
            + '<div class="comp-stat-card"><div class="comp-stat-value" style="color: #60a5fa;">' + stats.plannedItems + '</div><div class="comp-stat-label">Planned</div></div>'
            + '<div class="comp-stat-card"><div class="comp-stat-value" style="color: #94a3b8;">' + stats.pendingItems + '</div><div class="comp-stat-label">Not Started</div></div>'
            + '</div>'
            + '<div class="comp-progress-ring-container">'
            + '<div class="comp-progress-ring">'
            + '<svg width="140" height="140">'
            + '<defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">'
            + '<stop offset="0%" style="stop-color:#10b981"/><stop offset="100%" style="stop-color:#34d399"/></linearGradient></defs>'
            + '<circle class="comp-progress-ring-bg" cx="70" cy="70" r="54"/>'
            + '<circle class="comp-progress-ring-fill" cx="70" cy="70" r="54" stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + dashOffset.toFixed(1) + '"/>'
            + '</svg>'
            + '<div class="comp-progress-ring-text">'
            + '<div class="comp-progress-ring-pct">' + stats.overallPercent + '%</div>'
            + '<div class="comp-progress-ring-label">Complete</div>'
            + '</div></div>'
            + '<div style="font-size: 0.8em; color: #94a3b8; margin-top: 8px;">' + stats.completedUnits + '/' + stats.totalUnits + ' units</div>'
            + '</div></div>';
    }

    // Task 4.16: Check view mode — "By Patient" renders differently
    var viewMode = roadmapData.competencyUIState?.viewMode || 'department';
    if (viewMode === 'patient') {
        renderByPatientView(container);
        return;
    }

    // Task 4.15: Urgency-sorted category accordion
    var sortedCategories = getUrgencySortedCategoryKeys(competencies);

    var categoriesHtml = '';
    sortedCategories.forEach(function(entry) {
        var key = entry.key;
        var cat = entry.cat;
        var catStats = entry.stats;
        var isExpanded = expandedCompCategories.has(key);
        var isComplete = catStats.percent === 100;

        // Task 4.12: Skip categories with no visible items when filtering
        if ((compSearchQuery || compActiveFilters.length > 0) && !compCategoryHasVisibleItems(cat)) return;

        // Collect all items for this category (for unlock chains, rules, etc.)
        var allCatItems = [];
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) { allCatItems.push(item); });
        });

        categoriesHtml += '<div class="comp-category ' + (isComplete ? 'category-complete' : '') + '" data-category="' + escapeHtml(key) + '">'
            + '<div class="comp-category-header" onclick="toggleCompCategory(\'' + key + '\')">'
            + '<div class="comp-category-title">'
            + '<span style="font-size: 1.2em;">' + (cat.icon || '') + '</span>'
            + '<h4 style="color: ' + (cat.color || '#e2e8f0') + ';">' + escapeHtml(cat.name) + '</h4>'
            + (isComplete ? '<span class="comp-category-badge">&#x2713; Complete</span>' : '')
            + '</div>'
            + '<div class="comp-category-progress">'
            + '<div class="comp-progress-bar"><div class="comp-progress-fill" style="width: ' + catStats.percent + '%; background: ' + (cat.color || '#3b82f6') + ';"></div></div>'
            + '<span class="comp-progress-text">'
            + '<span class="comp-progress-pct">' + catStats.percent + '%</span>'
            + '<span style="color: #94a3b8; margin-left: 4px;">(' + catStats.completedUnits + '/' + catStats.totalUnits + ')</span>'
            + '</span>'
            // Task 4.11: Pace badge in header
            + renderCategoryPace(key, catStats)
            + '<span style="color: #94a3b8; font-size: 1.2em; transition: transform 0.2s;" id="compArrow-' + key + '">' + (isExpanded ? '&#x25BC;' : '&#x25B6;') + '</span>'
            + '</div></div>'
            + '<div class="comp-category-body ' + (isExpanded ? 'expanded' : '') + '" id="compBody-' + key + '">'
            + '<div class="comp-status-row">'
            + '<div class="comp-status-item"><div class="comp-status-value" style="color: #10b981;">' + catStats.completed + '</div><div class="comp-status-label">Completed</div></div>'
            + '<div class="comp-status-item"><div class="comp-status-value" style="color: #fbbf24;">' + catStats.inProgress + '</div><div class="comp-status-label">In Progress</div></div>'
            + '<div class="comp-status-item"><div class="comp-status-value" style="color: #60a5fa;">' + catStats.planned + '</div><div class="comp-status-label">Planned</div></div>'
            + '<div class="comp-status-item"><div class="comp-status-value" style="color: #94a3b8;">' + catStats.pending + '</div><div class="comp-status-label">Not Started</div></div>'
            + '</div>';

        // Category notes
        if (cat.notes) {
            categoriesHtml += '<div style="background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; padding: 10px; margin-bottom: 12px; border-radius: 6px; font-size: 0.85em; color: #fde68a;">'
                + escapeHtml(cat.notes) + '</div>';
        }

        // Task 4.10: Category rules
        categoriesHtml += renderCategoryRules(key, allCatItems);

        // Task 4.7: Unlock chain visualization
        categoriesHtml += renderUnlockChain(key, allCatItems);

        // Render sections and items
        getValues(cat.sections).forEach(function(sec) {
            var visibleItems = getValues(sec.items).filter(function(item) {
                return compItemMatchesFilter(item);
            });
            if (visibleItems.length === 0 && (compSearchQuery || compActiveFilters.length > 0)) return;

            categoriesHtml += '<div class="comp-requirements-section" data-section-id="' + escapeHtml(sec.id) + '">'
                + '<div class="comp-requirements-title">' + escapeHtml(sec.title) + '</div>';

            var itemsToRender = (compSearchQuery || compActiveFilters.length > 0) ? visibleItems : getValues(sec.items);
            itemsToRender.forEach(function(item) {
                var status = getItemStatus(item);
                var isCustom = item.custom === true;
                var safeKey = key;
                var safeItemId = (item.id || '').replace(/['"\\]/g, '');

                categoriesHtml += '<div class="comp-req-item status-' + status + '" data-item-id="' + escapeHtml(item.id) + '">'
                    + '<div class="comp-req-content">'
                    + '<div class="comp-req-text">' + escapeHtml(item.text) + '</div>';

                // Task 4.17: Inline editable note
                var escapedNote = escapeHtml(item.note || '');
                categoriesHtml += '<div class="comp-req-note" contenteditable="true" '
                    + 'data-catkey="' + safeKey + '" data-itemid="' + safeItemId + '" '
                    + 'style="min-height:16px; font-size:0.82em; color:#94a3b8; padding:2px 4px; border-radius:3px; outline:none; cursor:text;" '
                    + 'onfocus="this.style.background=\'rgba(100,116,139,0.1)\'; this.style.border=\'1px solid #334155\';" '
                    + 'onblur="this.style.background=\'transparent\'; this.style.border=\'none\'; saveCompItemNote(\'' + safeKey + '\', \'' + safeItemId + '\', this.textContent.trim());" '
                    + 'onkeydown="if(event.key===\'Escape\'){_compNoteCommitted[\'' + safeKey + ':' + safeItemId + '\']=true; this.blur();} if(event.key===\'Enter\'){event.preventDefault(); this.blur();}" '
                    + 'placeholder="Add note...">'
                    + escapedNote + '</div>';

                // Task 4.9: Patient badges
                categoriesHtml += renderPatientBadges(item.id);

                categoriesHtml += '</div>'; // close comp-req-content

                // Counter or status toggle
                if (item.required > 1) {
                    categoriesHtml += '<div class="comp-req-counter">'
                        + '<button class="comp-counter-btn" onclick="adjustCompItem(\'' + safeKey + '\', \'' + safeItemId + '\', -1); event.stopPropagation();">&minus;</button>'
                        + '<span class="comp-counter-value">' + item.completed + '/' + item.required + '</span>'
                        + '<button class="comp-counter-btn" onclick="adjustCompItem(\'' + safeKey + '\', \'' + safeItemId + '\', 1); event.stopPropagation();">+</button>'
                        + '</div>';
                } else {
                    categoriesHtml += '<div class="comp-status-toggle">'
                        + '<button class="comp-status-btn btn-planned ' + (status === 'planned' ? 'active' : '') + '" '
                        + 'onclick="setCompItemStatus(\'' + safeKey + '\', \'' + safeItemId + '\', \'planned\'); event.stopPropagation();">Plan</button>'
                        + '<button class="comp-status-btn btn-progress ' + (status === 'in_progress' ? 'active' : '') + '" '
                        + 'onclick="setCompItemStatus(\'' + safeKey + '\', \'' + safeItemId + '\', \'in_progress\'); event.stopPropagation();">WIP</button>'
                        + '<button class="comp-status-btn btn-done ' + (status === 'completed' ? 'active' : '') + '" '
                        + 'onclick="setCompItemStatus(\'' + safeKey + '\', \'' + safeItemId + '\', \'completed\'); event.stopPropagation();">Done</button>'
                        + '</div>';
                }

                // Item actions (edit, delete, quick record)
                categoriesHtml += '<div class="comp-item-actions">'
                    + '<button class="comp-edit-btn" onclick="openEditCompItemModal(\'' + safeKey + '\', \'' + safeItemId + '\'); event.stopPropagation();" title="Edit">&#x270F;&#xFE0F;</button>';
                if (item.completed < item.required) {
                    categoriesHtml += '<button class="comp-edit-btn" onclick="openCompQuickRecord(\'' + safeItemId + '\'); event.stopPropagation();" title="Quick Record" style="color:#10b981;">+</button>';
                }
                if (isCustom) {
                    categoriesHtml += '<button class="comp-delete-btn" onclick="deleteCompItem(\'' + safeKey + '\', \'' + safeItemId + '\'); event.stopPropagation();" title="Delete">&#x1F5D1;&#xFE0F;</button>';
                }
                categoriesHtml += '</div>';

                categoriesHtml += '</div>'; // close comp-req-item

                // Task 4.8: Full evidence trail with rich cards
                categoriesHtml += renderEvidenceCards(item, key);
            });

            categoriesHtml += '<button class="comp-add-req-btn" onclick="openAddCompItemModal(\'' + key + '\', \'' + escapeHtml(sec.id) + '\'); event.stopPropagation();">'
                + '&#x2795; Add Requirement</button>'
                + '</div>'; // close comp-requirements-section
        });

        // Category notes textarea
        categoriesHtml += '<div style="margin-top: 15px;">'
            + '<label style="font-size: 0.85em; color: #94a3b8;">Category Notes:</label>'
            + '<textarea class="comp-notes-input" rows="2" placeholder="Add notes for ' + escapeHtml(cat.name) + '..." '
            + 'onchange="updateCompNotes(\'' + key + '\', this.value)">' + escapeHtml(cat.notes || '') + '</textarea>'
            + '</div>';

        categoriesHtml += '</div></div>'; // close comp-category-body and comp-category
    });

    container.innerHTML = categoriesHtml;
}

function toggleCompCategory(key) {
    var body = document.getElementById('compBody-' + key);
    var arrow = document.getElementById('compArrow-' + key);
    if (!body) return;

    var isExpanded = body.classList.contains('expanded');

    if (isExpanded) {
        body.classList.remove('expanded');
        if (arrow) arrow.innerHTML = '&#x25B6;';
        expandedCompCategories.delete(key);
    } else {
        body.classList.add('expanded');
        if (arrow) arrow.innerHTML = '&#x25BC;';
        expandedCompCategories.add(key);
    }

    // Task 4.14: Persist expanded state
    persistExpandedState();
}

// Set item status for single-count items
function setCompItemStatus(catKey, itemId, newStatus) {
    const competencies = getCompetenciesData();
    const cat = competencies[catKey];
    if (!cat) return;

    let wasCompleted = false;
    let isNowCompleted = false;
    let itemText = '';

    // Use object-based storage
    for (const sec of getValues(cat.sections)) {
        if (sec.items && sec.items[itemId]) {
            const item = sec.items[itemId];
            wasCompleted = item.completed >= item.required;
            itemText = item.text;

            // Toggle: if clicking active status, go back to pending
            const currentStatus = getItemStatus(item);
            if (currentStatus === newStatus) {
                // Clear manual evidence entries, keep procedure-linked
                if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries || []);
                item.completionEntries = item.completionEntries.filter(function(e) { return !!e.procedureId; });
                // Resync completed from remaining procedure-linked entries
                item.completed = Math.min(item.required, item.completionEntries.length);
                item.status = item.completed >= item.required ? 'completed' : item.completed > 0 ? 'in_progress' : 'pending';
            } else {
                item.status = newStatus;
                // Set completed count based on status
                if (newStatus === 'completed') {
                    item.completed = item.required;
                    // Add evidence entries for manual completion
                    if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries || []);
                    while (item.completionEntries.length < item.required) {
                        item.completionEntries.push({
                            procedureId: null,
                            patientId: null,
                            patientName: 'Manual entry',
                            date: getLocalDateString(),
                            note: 'Status set to completed'
                        });
                    }
                } else if (newStatus === 'in_progress' && item.completed === 0) {
                    // Keep completed at 0 for in_progress but set status
                } else if (newStatus === 'pending') {
                    // Clear manual entries, keep procedure-linked, resync count
                    if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries || []);
                    item.completionEntries = item.completionEntries.filter(function(e) { return !!e.procedureId; });
                    item.completed = Math.min(item.required, item.completionEntries.length);
                    item.status = item.completed >= item.required ? 'completed' : item.completed > 0 ? 'in_progress' : 'pending';
                }
            }

            isNowCompleted = item.completed >= item.required;
            break;
        }
    }

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderCompetencies();

    // Show milestone toast if just completed
    if (!wasCompleted && isNowCompleted) {
        showCompMilestone(itemText);
    }
}

// Adjust completed count for multi-count items
function adjustCompItem(catKey, itemId, delta) {
    const competencies = getCompetenciesData();
    const cat = competencies[catKey];
    if (!cat) return;

    let wasCompleted = false;
    let isNowCompleted = false;
    let itemText = '';

    // Use object-based storage
    for (const sec of getValues(cat.sections)) {
        if (sec.items && sec.items[itemId]) {
            const item = sec.items[itemId];
            wasCompleted = item.completed >= item.required;
            itemText = item.text;

            const newCompleted = Math.max(0, Math.min(item.required, item.completed + delta));
            item.completed = newCompleted;

            // Evidence trail: create lightweight entry for manual adjustments
            if (delta > 0 && newCompleted > 0) {
                if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries);
                // Only add entry if manual adjustment (not already covered by procedure linking)
                var manualCount = newCompleted - item.completionEntries.length;
                if (manualCount > 0) {
                    item.completionEntries.push({
                        procedureId: null,
                        patientId: null,
                        patientName: 'Manual entry',
                        date: getLocalDateString(),
                        note: 'Manually adjusted +' + delta
                    });
                }
            } else if (delta < 0 && item.completionEntries) {
                if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries);
                // Remove excess manual entries (last ones first, prefer removing manual over procedure-linked)
                while (item.completionEntries.length > newCompleted) {
                    var lastIdx = -1;
                    for (var ei = item.completionEntries.length - 1; ei >= 0; ei--) {
                        if (!item.completionEntries[ei].procedureId) { lastIdx = ei; break; }
                    }
                    if (lastIdx >= 0) {
                        item.completionEntries.splice(lastIdx, 1);
                    } else {
                        // All entries are procedure-linked, remove last one
                        item.completionEntries.pop();
                    }
                }
            }

            // Auto-update status based on completed count
            if (newCompleted >= item.required) {
                item.status = 'completed';
            } else if (newCompleted > 0) {
                item.status = 'in_progress';
            } else {
                // Keep planned status if it was planned, otherwise pending
                if (item.status !== 'planned') {
                    item.status = 'pending';
                }
            }

            isNowCompleted = item.completed >= item.required;
            break;
        }
    }

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderCompetencies();
    if (typeof renderDashboard === 'function') renderDashboard();

    // Show milestone toast if just completed
    if (!wasCompleted && isNowCompleted) {
        showCompMilestone(itemText);
    }
}

function updateCompNotes(catKey, notes) {
    const competencies = getCompetenciesData();
    if (competencies[catKey]) {
        competencies[catKey].notes = notes;
        clinicalDataDirty = true;
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
    }
}

// Show milestone celebration toast
function showCompMilestone(itemText) {
    // Remove any existing toast
    const existing = document.querySelector('.comp-milestone-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'comp-milestone-toast';
    toast.innerHTML = `
        <span class="milestone-icon">🎉</span>
        <span class="milestone-text">Completed: ${escapeHtml(itemText.substring(0, 40))}${itemText.length > 40 ? '...' : ''}</span>
    `;
    document.body.appendChild(toast);

    // Remove after animation
    setTimeout(() => toast.remove(), 3000);
}

function resetCompetencies() {
    showCustomConfirm('Reset ALL competencies to default values? This cannot be undone.', function() {
        // Reset and migrate to object-based storage
        roadmapData.clinicalData.competencies = migrateCompetencies(
            JSON.parse(JSON.stringify(DEFAULT_COMPETENCIES))
        );
        expandedCompCategories.clear();
        clinicalDataDirty = true;
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        renderCompetencies();
        showToast('Competencies reset to defaults');
    }, null, 'Reset Competencies');
}

// ==================== COMPETENCY ADD/EDIT/DELETE ====================

// Store modal state
let compItemModalState = {
    mode: 'add', // 'add' or 'edit'
    catKey: null,
    sectionId: null, // Changed from sectionIndex for object-based storage
    itemId: null
};

function openAddCompItemModal(catKey, sectionId) {
    compItemModalState = {
        mode: 'add',
        catKey: catKey,
        sectionId: sectionId,
        itemId: null
    };

    document.getElementById('compModalTitle').textContent = '➕ Add Requirement';
    document.getElementById('compItemName').value = '';
    document.getElementById('compItemRequired').value = '1';
    document.getElementById('compItemCompleted').value = '0';
    document.getElementById('compItemNotes').value = '';

    document.getElementById('compItemModal').style.display = 'flex';
}

function openEditCompItemModal(catKey, itemId) {
    const competencies = getCompetenciesData();
    const cat = competencies[catKey];
    if (!cat) return;

    // Find the item and its section (using object-based storage)
    let foundItem = null;
    let foundSectionId = null;
    for (const [secId, sec] of Object.entries(cat.sections)) {
        const item = getValues(sec.items).find(it => it.id === itemId);
        if (item) {
            foundItem = item;
            foundSectionId = secId;
            break;
        }
    }

    if (!foundItem) {
        showToast('Item not found', 'error');
        return;
    }

    compItemModalState = {
        mode: 'edit',
        catKey: catKey,
        sectionId: foundSectionId,
        itemId: itemId
    };

    document.getElementById('compModalTitle').textContent = '✏️ Edit Requirement';
    document.getElementById('compItemName').value = foundItem.text;
    document.getElementById('compItemRequired').value = foundItem.required;
    document.getElementById('compItemCompleted').value = foundItem.completed || 0;
    document.getElementById('compItemNotes').value = foundItem.note || '';

    document.getElementById('compItemModal').style.display = 'flex';
}

function closeCompItemModal() {
    document.getElementById('compItemModal').style.display = 'none';
    compItemModalState = { mode: 'add', catKey: null, sectionId: null, itemId: null };
}

function saveCompItem() {
    const name = document.getElementById('compItemName').value.trim();
    const required = parseInt(document.getElementById('compItemRequired').value) || 1;
    const completed = parseInt(document.getElementById('compItemCompleted').value) || 0;
    const notes = document.getElementById('compItemNotes').value.trim();

    if (!name) {
        showToast('Please enter a requirement name', 'error');
        return;
    }

    if (required < 1) {
        showToast('Required count must be at least 1', 'error');
        return;
    }

    const competencies = getCompetenciesData();
    const cat = competencies[compItemModalState.catKey];
    if (!cat) {
        showToast('Category not found', 'error');
        return;
    }

    if (compItemModalState.mode === 'add') {
        // Add new item to the section (using object-based storage)
        const section = cat.sections[compItemModalState.sectionId];
        if (!section) {
            showToast('Section not found', 'error');
            return;
        }

        // Ensure section.items is an object
        if (!section.items || Array.isArray(section.items)) {
            section.items = migrateArrayToObject(section.items, 'item');
        }

        const newItemId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const newItem = {
            id: newItemId,
            text: name,
            required: required,
            completed: Math.max(0, Math.min(completed, required)), // FIXED: Clamp to 0-required range
            note: notes || null,
            custom: true // Mark as custom so it can be deleted
        };

        // Set status based on completed count
        if (newItem.completed >= newItem.required) {
            newItem.status = 'completed';
        } else if (newItem.completed > 0) {
            newItem.status = 'in_progress';
        }

        // Use object assignment instead of push
        section.items[newItemId] = newItem;
        showToast(`Added: ${name}`);
    } else {
        // Edit existing item (using object-based storage)
        for (const sec of getValues(cat.sections)) {
            if (sec.items && sec.items[compItemModalState.itemId]) {
                const item = sec.items[compItemModalState.itemId];
                item.text = name;
                item.required = required;
                item.completed = Math.max(0, Math.min(completed, required)); // FIXED: Clamp to 0-required range
                item.note = notes || null;

                // Update status based on completed count
                if (item.completed >= item.required) {
                    item.status = 'completed';
                } else if (item.completed > 0) {
                    item.status = 'in_progress';
                } else if (item.status === 'completed') {
                    item.status = 'pending';
                }

                break;
            }
        }
        showToast(`Updated: ${name}`);
    }

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderCompetencies();
    closeCompItemModal();
}

function deleteCompItem(catKey, itemId) {
    const competencies = getCompetenciesData();
    const cat = competencies[catKey];
    if (!cat) return;

    // Find the item (using object-based storage)
    let itemText = '';
    let foundSectionId = null;
    for (const [secId, sec] of Object.entries(cat.sections)) {
        if (sec.items && sec.items[itemId]) {
            const item = sec.items[itemId];
            if (!item.custom) {
                showToast('Cannot delete default requirements', 'error');
                return;
            }
            itemText = item.text;
            foundSectionId = secId;
            break;
        }
    }

    if (!foundSectionId) {
        showToast('Item not found', 'error');
        return;
    }

    showCustomConfirm(`Delete "${escapeHtml(itemText)}"? This cannot be undone.`, function() {
        // Re-lookup to ensure data is still valid after async confirm
        const comp = getCompetenciesData();
        const c = comp[catKey];
        if (c && c.sections[foundSectionId] && c.sections[foundSectionId].items[itemId]) {
            delete c.sections[foundSectionId].items[itemId];
            clinicalDataDirty = true;
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            saveData();
            renderCompetencies();
            showToast(`Deleted: ${itemText}`);
        }
    }, null, 'Delete Item');
}

// ==================== PROCEDURE RECORDING SYSTEM ====================
// Brings completedProcedures to life — records every procedure with patient, appointment, and competency links
// All user-provided text is escaped via escapeHtml() before insertion into innerHTML

function recordProcedure(data) {
    clinicalDataDirty = true;
    const id = data.id || generateId('proc');
    const procedure = {
        id: id,
        patientId: data.patientId ?? null,
        patientName: data.patientName || '',
        appointmentId: data.appointmentId ?? null,
        date: data.date || getLocalDateString(),
        procedureType: data.procedureType || 'other',
        procedure: data.procedure || '',
        toothNumbers: data.toothNumbers || '',
        competencyItemIds: data.competencyItemIds || [],
        grade: data.grade ?? null,
        notes: data.notes || '',
        faculty: data.faculty || '',
        createdAt: data.createdAt || new Date().toISOString()
    };

    if (!roadmapData.clinicalData) roadmapData.clinicalData = { patients: {}, appointments: {}, completedProcedures: {}, patientRecords: {}, dashboardSnapshots: [] };
    if (!roadmapData.clinicalData.completedProcedures) roadmapData.clinicalData.completedProcedures = {};

    roadmapData.clinicalData.completedProcedures[id] = procedure;

    // Auto-link to competency items with evidence trail
    if (procedure.competencyItemIds.length > 0) {
        linkProcedureToCompetencies(procedure);
    }

    return procedure;
}

function linkProcedureToCompetencies(procedure) {
    const competencies = getCompetenciesData();

    procedure.competencyItemIds.forEach(function(itemId) {
        const result = findCompetencyItem(itemId);
        if (!result) return;

        const item = result.item;

        // Add completion entry (audit trail)
        if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries);

        // Dedup by procedureId
        if (!item.completionEntries.some(function(e) { return e.procedureId === procedure.id; })) {
            item.completionEntries.push({
                procedureId: procedure.id,
                patientId: procedure.patientId,
                patientName: procedure.patientName,
                date: procedure.date,
                note: procedure.notes || procedure.procedure
            });
        }

        // Sync completed count from evidence entries
        item.completed = Math.min(item.required, item.completionEntries.length);

        // Auto-update status
        if (item.completed >= item.required) {
            item.status = 'completed';
        } else if (item.completed > 0) {
            item.status = 'in_progress';
        }
    });
}

function unlinkProcedureFromCompetencies(procedureId) {
    const competencies = getCompetenciesData();

    Object.values(competencies).forEach(function(cat) {
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                if (!item.completionEntries) return;
                if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries);
                const before = item.completionEntries.length;
                item.completionEntries = item.completionEntries.filter(function(e) { return e.procedureId !== procedureId; });
                if (item.completionEntries.length < before) {
                    item.completed = Math.min(item.required, item.completionEntries.length);
                    if (item.completed >= item.required) {
                        item.status = 'completed';
                    } else if (item.completed > 0) {
                        item.status = 'in_progress';
                    } else {
                        item.status = 'pending';
                    }
                }
            });
        });
    });
}

function deleteProcedure(procId) {
    if (!roadmapData.clinicalData?.completedProcedures?.[procId]) return;

    showCustomConfirm('Delete this procedure record? Competency counts will be adjusted.', function() {
        // CIS v2: Delegate to cascade function
        cascadeDeleteProcedure(procId);
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        renderProceduresList();
        updateClinicalStats();
        showToast('Procedure deleted');
    }, null, 'Delete Procedure');
}

// ==================== DATA BACKFILL ENGINE ====================
// One-time intelligent backfill: creates procedure records from competency data,
// auto-completes past appointments, and links patient records to clinical data.
// Called from Mission Control "Backfill Data" button or auto on first load.

var _backfillInProgress = false;

function backfillClinicalData() {
    if (!roadmapData.clinicalData) return;
    if (_backfillInProgress) { showToast('Backfill already in progress', 'error'); return; }
    _backfillInProgress = true;

    var backfillStats = { proceduresCreated: 0, appointmentsCompleted: 0, evidenceCreated: 0, patientsLinked: 0 };
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = getLocalDateString(today);

    // Create checkpoint before backfill (skip if one was created within last 60s)
    if (typeof createCheckpoint === 'function') {
        var recentBackfillCheckpoint = false;
        try {
            var cpKey = typeof getCheckpointKey === 'function' ? getCheckpointKey() : null;
            if (cpKey) {
                var checkpoints = JSON.parse(localStorage.getItem(cpKey) || '[]');
                if (checkpoints.length > 0) {
                    var latest = checkpoints[checkpoints.length - 1];
                    if (latest.name === 'pre-backfill' && (Date.now() - new Date(latest.timestamp).getTime()) < 60000) {
                        recentBackfillCheckpoint = true;
                    }
                }
            }
        } catch(e) {}
        if (!recentBackfillCheckpoint) {
            createCheckpoint('pre-backfill');
        }
    }

    // === Phase 1: Auto-complete past appointments ===
    var appointments = roadmapData.clinicalData.appointments || {};
    Object.values(appointments).forEach(function(apt) {
        if (apt.status === 'scheduled' && apt.date && apt.date < todayStr) {
            apt.status = 'completed';
            apt.completedAt = apt.date + 'T17:00:00.000Z';
            backfillStats.appointmentsCompleted++;

            // Update patient lastVisit
            if (apt.patientId) {
                var patient = roadmapData.clinicalData.patientRecords?.[apt.patientId];
                if (patient) {
                    if (!patient.lastVisit || patient.lastVisit < apt.date) {
                        patient.lastVisit = apt.date;
                    }
                }
            }

            // Mark linked deadline as done
            if (typeof markLinkedDeadlineDone === 'function') {
                markLinkedDeadlineDone(apt.id);
            }

            // Mark planner task as done
            if (typeof markPlannerTaskDone === 'function') {
                markPlannerTaskDone(apt.id);
            }
        }
    });

    // === Phase 2: Create evidence entries for competency items with manual progress ===
    var competencies = roadmapData.clinicalData.competencies;
    if (competencies) {
        Object.entries(competencies).forEach(function(entry) {
            var catKey = entry[0];
            var cat = entry[1];
            getValues(cat.sections).forEach(function(sec) {
                getValues(sec.items).forEach(function(item) {
                    if (item.completed > 0) {
                        if (!Array.isArray(item.completionEntries)) item.completionEntries = getValues(item.completionEntries);
                        var deficit = item.completed - item.completionEntries.length;
                        for (var i = 0; i < deficit; i++) {
                            item.completionEntries.push({
                                procedureId: null,
                                patientId: null,
                                patientName: 'Backfill entry',
                                date: todayStr,
                                note: 'Backfilled from existing progress (' + item.text + ')'
                            });
                            backfillStats.evidenceCreated++;
                        }
                    }
                });
            });
        });
    }

    // === Phase 3: Create procedure records from completed appointments ===
    if (!roadmapData.clinicalData.completedProcedures) roadmapData.clinicalData.completedProcedures = {};
    var existingProcAptIds = new Set();
    Object.values(roadmapData.clinicalData.completedProcedures).forEach(function(p) {
        if (p.appointmentId) existingProcAptIds.add(p.appointmentId);
    });

    Object.values(appointments).forEach(function(apt) {
        if (apt.status === 'completed' && !existingProcAptIds.has(apt.id)) {
            var procData = {
                patientId: apt.patientId ?? null,
                patientName: '',
                appointmentId: apt.id,
                date: apt.date || todayStr,
                procedureType: 'other',
                procedure: apt.procedures || apt.notes || 'Clinical appointment',
                notes: 'Backfilled from appointment',
                createdAt: apt.completedAt || new Date().toISOString()
            };

            // Get patient name
            if (apt.patientId) {
                var pt = roadmapData.clinicalData.patientRecords?.[apt.patientId];
                if (pt) procData.patientName = pt.name || '';
            }

            // Infer procedure type from appointment text
            var aptText = ((apt.procedures || '') + ' ' + (apt.notes || '')).toLowerCase();
            if (aptText.includes('crown') || aptText.includes('bridge') || aptText.includes('fpd') || aptText.includes('cerec')) {
                procData.procedureType = 'fixed';
            } else if (aptText.includes('composite') || aptText.includes('filling') || aptText.includes('restoration')) {
                procData.procedureType = 'operative';
            } else if (aptText.includes('denture')) {
                procData.procedureType = 'dentures';
            } else if (aptText.includes('rpd') || aptText.includes('partial')) {
                procData.procedureType = 'rpd';
            } else if (aptText.includes('srp') || aptText.includes('scaling') || aptText.includes('calculus')) {
                procData.procedureType = 'srp';
            } else if (aptText.includes('root canal') || aptText.includes('rct') || aptText.includes('endo')) {
                procData.procedureType = 'endo';
            } else if (aptText.includes('extract') || aptText.includes('surgery') || aptText.includes('surgical')) {
                procData.procedureType = 'oralsurg';
            } else if (aptText.includes('perio') || aptText.includes('graft') || aptText.includes('flap')) {
                procData.procedureType = 'perio';
            } else if (aptText.includes('pedo') || aptText.includes('pediatric') || aptText.includes('sealant')) {
                procData.procedureType = 'peds';
            }

            recordProcedure(procData);
            backfillStats.proceduresCreated++;
        }
    });

    // === Phase 4: Link patient records to clinical patients ===
    var patientRecords = roadmapData.clinicalData.patientRecords || {};
    if (!roadmapData.clinicalData.patientRecords) roadmapData.clinicalData.patientRecords = {};
    var existingNames = new Set();
    Object.values(roadmapData.clinicalData.patientRecords).forEach(function(p) {
        if (p.name) existingNames.add(p.name.toLowerCase().trim());
    });

    Object.values(patientRecords).forEach(function(pr) {
        if (!pr.name || !pr.name.trim()) return;
        var nameLower = pr.name.toLowerCase().trim();
        if (existingNames.has(nameLower)) return; // Already linked

        // Create clinical patient from patient record
        var patientId = pr.id || ('pt-' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
        roadmapData.clinicalData.patientRecords[patientId] = {
            id: patientId,
            name: pr.name,
            chartNumber: pr.chartNumber || '',
            asaClass: 'ASA I',
            perioStatus: 'healthy',
            status: 'active',
            needsXrays: false,
            xrayType: '',
            recallDue: null,
            medicalAlerts: pr.medicalHx || '',
            notes: 'Linked from patient record',
            outstandingTasks: [],
            lastVisit: pr.lastVisit ?? null,
            lastUpdated: new Date().toISOString()
        };
        existingNames.add(nameLower);
        backfillStats.patientsLinked++;
    });

    // === Phase 5: Create procedure records from patient outstanding tasks marked completed ===
    Object.values(roadmapData.clinicalData.patientRecords).forEach(function(patient) {
        if (!patient.outstandingTasks) return;
        patient.outstandingTasks.forEach(function(task) {
            if (task.status === 'completed' && task.procedure) {
                // Check if we already have a procedure for this
                var alreadyExists = Object.values(roadmapData.clinicalData.completedProcedures).some(function(p) {
                    return p.patientId === patient.id && p.procedure === task.procedure;
                });
                if (!alreadyExists) {
                    recordProcedure({
                        patientId: patient.id,
                        patientName: patient.name || '',
                        date: patient.lastVisit || todayStr,
                        procedureType: 'other',
                        procedure: task.procedure,
                        notes: 'Backfilled from patient tasks',
                        createdAt: new Date().toISOString()
                    });
                    backfillStats.proceduresCreated++;
                }
            }
        });
    });

    // Save everything
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Propagate to planner/schedule
    if (typeof syncClinicalToMonthlyPlanner === 'function') syncClinicalToMonthlyPlanner();
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();

    // Re-render affected tabs
    try { initClinicalTab(); } catch(e) {}
    try { renderCompetencies(); } catch(e) {}
    try { renderDashboard(); } catch(e) {}

    showToast('Backfill complete: ' + backfillStats.appointmentsCompleted + ' apts, '
        + backfillStats.proceduresCreated + ' procs, '
        + backfillStats.evidenceCreated + ' evidence, '
        + backfillStats.patientsLinked + ' patients linked');

    _backfillInProgress = false;
    return backfillStats;
}

// ==================== APPOINTMENT COMPLETION CASCADE ====================
// Single action triggers: procedure record prompt, competency update, planner done, deadline done, patient updated

// CIS v2: inferProcedureType derives from KEYWORD_PATTERNS (single source of truth)
function inferProcedureType(procedureText) {
    var text = (procedureText || '').toLowerCase();
    var categoryFromId = {
        'fixed-': 'fixed', 'op-': 'operative', 'perio-': 'perio', 'endo-': 'endo',
        'os-': 'oralsurg', 'cd-': 'dentures', 'rpd-': 'rpd', 'peds-': 'peds',
        'srp-': 'srp', 'gp-': 'grouppractice', 'tx-': 'txplanning'
    };
    for (var i = 0; i < KEYWORD_PATTERNS.length; i++) {
        var pattern = KEYWORD_PATTERNS[i];
        var matched = pattern.keywords.some(function(kw) { return text.includes(kw); });
        if (matched) {
            var firstId = pattern.ids[0] || '';
            var prefixes = Object.keys(categoryFromId);
            for (var j = 0; j < prefixes.length; j++) {
                if (firstId.startsWith(prefixes[j])) return categoryFromId[prefixes[j]];
            }
        }
    }
    return '';
}

function completeAppointment(aptId) {
    var apt = roadmapData.clinicalData?.appointments?.[aptId];
    if (!apt) return;

    if (apt.status === 'completed') {
        openProcedureRecordingModal(aptId);
        return;
    }

    // 1. Set completed status
    apt.status = 'completed';
    apt.completedAt = new Date().toISOString();

    // 2. Update patient lastVisit (unified store)
    var patient = roadmapData.clinicalData.patientRecords?.[apt.patientId];
    if (patient) {
        patient.lastVisit = apt.date;
        patient.lastUpdated = new Date().toISOString();
    }

    // 3. Auto-create procedure ONLY if appointment has procedure text (AUDIT #4)
    var proc = null;
    if (apt.procedures && apt.procedures.trim()) {
        proc = typeof recordProcedure === 'function' ? recordProcedure({
            patientId: apt.patientId,
            patientName: patient?.name || apt.patientName || 'Unknown',
            appointmentId: apt.id,
            date: apt.date,
            procedureType: inferProcedureType(apt.procedures),
            procedure: apt.procedures,
            competencyItemIds: [],
            notes: 'Auto-created from appointment completion'
        }) : null;
        // 4. Smart auto-link fires on created procedure
        if (proc && proc.id && typeof autoLinkProcedureToCompetencies === 'function') {
            autoLinkProcedureToCompetencies(proc);
        }
    }

    // 5. Mark deadline + planner done
    markLinkedDeadlineDone(aptId);
    markPlannerTaskDone(aptId);

    // 6. Propagate FIRST (mutates state via syncClinicalToMonthlyPlanner + buildCurrentWeekSchedule), then save
    clinicalDataDirty = true;
    propagateClinicalChanges({ appointments: true, procedures: true, competencies: true, source: 'completeAppointment' });
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderAppointmentsList();
    updateClinicalStats();
    if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();

    // 7. Open procedure recording modal for refinement
    openProcedureRecordingModal(aptId);
}

function uncompleteAppointment(aptId) {
    // CIS v2: Delegate to cascade function
    cascadeUncompleteAppointment(aptId);
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderAppointmentsList();
    renderProceduresList();
    updateClinicalStats();
    showToast('Appointment unmarked');
}

function markLinkedDeadlineDone(aptId) {
    if (!roadmapData.customDeadlines) return;

    Object.values(roadmapData.customDeadlines).forEach(function(dl) {
        if (dl.clinicalAptId === aptId && !dl.done) {
            // Compute stable ID BEFORE mutation (per CLAUDE.md)
            var dlId = dl._originalStableId || getDeadlineId(dl);
            dl.done = true;

            if (!roadmapData.completedDeadlines) roadmapData.completedDeadlines = {};
            roadmapData.completedDeadlines[dlId] = {
                done: true,
                grade: null,
                completedAt: new Date().toISOString()
            };
        }
    });
}

function unmarkLinkedDeadlineDone(aptId) {
    if (!roadmapData.customDeadlines) return;

    Object.values(roadmapData.customDeadlines).forEach(function(dl) {
        if (dl.clinicalAptId === aptId && dl.done) {
            dl.done = false;

            var dlId = dl._originalStableId || getDeadlineId(dl);
            if (roadmapData.completedDeadlines && roadmapData.completedDeadlines[dlId]) {
                delete roadmapData.completedDeadlines[dlId];
            }
        }
    });
}

function markPlannerTaskDone(aptId) {
    var taskId = 'clinic_' + aptId;
    if (!roadmapData.monthlyPlanner) roadmapData.monthlyPlanner = { completedTasks: {} };
    if (!roadmapData.monthlyPlanner.completedTasks) roadmapData.monthlyPlanner.completedTasks = {};

    var isCompleted = Object.values(roadmapData.monthlyPlanner.completedTasks).some(function(c) {
        return c.value === taskId || c === taskId;
    });
    if (isCompleted) return;

    var completedId = generateId('completed');
    roadmapData.monthlyPlanner.completedTasks[completedId] = {
        id: completedId,
        value: taskId,
        completedAt: Date.now()
    };
}

function unmarkPlannerTaskDone(aptId) {
    var taskId = 'clinic_' + aptId;
    if (!roadmapData.monthlyPlanner?.completedTasks) return;

    Object.keys(roadmapData.monthlyPlanner.completedTasks).forEach(function(id) {
        var entry = roadmapData.monthlyPlanner.completedTasks[id];
        if (entry?.value === taskId || entry === taskId) {
            delete roadmapData.monthlyPlanner.completedTasks[id];
        }
    });
}

// ==================== PROCEDURE RECORDING MODAL ====================

function openProcedureRecordingModal(aptId) {
    var apt = roadmapData.clinicalData?.appointments?.[aptId];
    if (!apt) return;

    var patient = roadmapData.clinicalData?.patientRecords?.[apt.patientId];
    var patientName = patient?.name || 'Unknown Patient';

    document.getElementById('procModalAptId').value = aptId;
    document.getElementById('procModalPatientId').value = apt.patientId || '';
    document.getElementById('procModalPatientName').textContent = patientName;
    document.getElementById('procModalDate').value = apt.date || getLocalDateString();
    document.getElementById('procModalProcedure').value = apt.procedures || '';
    document.getElementById('procModalTeeth').value = '';
    document.getElementById('procModalGrade').value = '';
    document.getElementById('procModalFaculty').value = '';
    document.getElementById('procModalNotes').value = apt.notes || '';

    var typeSelect = document.getElementById('procModalType');
    typeSelect.innerHTML = Object.entries(PROCEDURE_TYPES).map(function(entry) {
        return '<option value="' + entry[0] + '">' + escapeHtml(entry[1]) + '</option>';
    }).join('');

    buildCompetencyChecklist(typeSelect.value);

    document.getElementById('procedureRecordingModal').style.display = 'flex';
}

function openStandaloneProcedureModal() {
    document.getElementById('procModalAptId').value = '';
    document.getElementById('procModalPatientId').value = '';
    document.getElementById('procModalPatientName').textContent = 'N/A (standalone)';
    document.getElementById('procModalDate').value = getLocalDateString();
    document.getElementById('procModalProcedure').value = '';
    document.getElementById('procModalTeeth').value = '';
    document.getElementById('procModalGrade').value = '';
    document.getElementById('procModalFaculty').value = '';
    document.getElementById('procModalNotes').value = '';

    var typeSelect = document.getElementById('procModalType');
    typeSelect.innerHTML = Object.entries(PROCEDURE_TYPES).map(function(entry) {
        return '<option value="' + entry[0] + '">' + escapeHtml(entry[1]) + '</option>';
    }).join('');

    buildCompetencyChecklist(typeSelect.value);

    document.getElementById('procedureRecordingModal').style.display = 'flex';
}

function closeProcedureRecordingModal() {
    document.getElementById('procedureRecordingModal').style.display = 'none';
}

function buildCompetencyChecklist(categoryKey) {
    var container = document.getElementById('procModalCompetencies');
    var competencies = getCompetenciesData();
    var cat = competencies[categoryKey];

    if (!cat) {
        container.innerHTML = '<p style="color:#94a3b8; font-size:0.85em;">Select a procedure type to see matching competency items.</p>';
        return;
    }

    var html = '';
    getValues(cat.sections).forEach(function(sec) {
        getValues(sec.items).forEach(function(item) {
            var remaining = item.required - item.completed;
            if (remaining <= 0) return;

            html += '<label style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(100,116,139,0.2); cursor:pointer;">'
                + '<input type="checkbox" class="proc-comp-checkbox" value="' + escapeHtml(item.id) + '" style="width:18px; height:18px; accent-color:#10b981;">'
                + '<span style="flex:1; color:#e2e8f0; font-size:0.9em;">' + escapeHtml(item.text) + '</span>'
                + '<span style="color:' + (remaining <= 1 ? '#f59e0b' : '#94a3b8') + '; font-size:0.8em; white-space:nowrap;">' + item.completed + '/' + item.required + '</span>'
                + '</label>';
        });
    });

    if (!html) {
        html = '<p style="color:#10b981; font-size:0.85em;">All items in this category are complete!</p>';
    }

    container.innerHTML = html;
}

function onProcTypeChange(value) {
    buildCompetencyChecklist(value);
}

function saveProcedureRecord() {
    var procedureText = document.getElementById('procModalProcedure').value.trim();
    if (!procedureText) {
        showToast('Procedure description is required', 'error');
        return;
    }

    var aptId = document.getElementById('procModalAptId').value;
    var patientId = document.getElementById('procModalPatientId').value;
    var patient = roadmapData.clinicalData?.patientRecords?.[patientId];

    var competencyItemIds = [];
    document.querySelectorAll('.proc-comp-checkbox:checked').forEach(function(cb) {
        competencyItemIds.push(cb.value);
    });

    recordProcedure({
        patientId: patientId || null,
        patientName: patient?.name || document.getElementById('procModalPatientName').textContent || '',
        appointmentId: aptId || null,
        date: document.getElementById('procModalDate').value || getLocalDateString(),
        procedureType: document.getElementById('procModalType').value || 'other',
        procedure: procedureText,
        toothNumbers: document.getElementById('procModalTeeth').value.trim(),
        competencyItemIds: competencyItemIds,
        grade: document.getElementById('procModalGrade').value.trim() || null,
        notes: document.getElementById('procModalNotes').value.trim(),
        faculty: document.getElementById('procModalFaculty').value.trim()
    });

    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    closeProcedureRecordingModal();
    renderProceduresList();
    renderCompetencies();
    updateClinicalStats();
    renderDashboard();

    var linkedMsg = competencyItemIds.length > 0
        ? ' (' + competencyItemIds.length + ' competency item' + (competencyItemIds.length > 1 ? 's' : '') + ' linked)'
        : '';
    showToast('Procedure recorded!' + linkedMsg);
}

// ==================== PROCEDURES LIST (SUB-TAB) ====================
// All user text escaped via escapeHtml() for safe innerHTML rendering

function renderProceduresList() {
    var container = document.getElementById('proceduresList');
    if (!container) return;

    var procedures = getValues(roadmapData.clinicalData?.completedProcedures);
    var patients = roadmapData.clinicalData?.patientRecords || {};

    if (procedures.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#94a3b8;">'
            + '<div style="font-size:3em; margin-bottom:10px;">📋</div>'
            + '<p>No procedures recorded yet. Complete an appointment or click "+ Record Procedure" to get started.</p>'
            + '</div>';
        return;
    }

    var sorted = procedures.sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
    });

    var html = '';
    sorted.forEach(function(proc) {
        var typeName = PROCEDURE_TYPES[proc.procedureType] || proc.procedureType || 'Other';
        var procDate = parseLocalDate(proc.date);
        var dateStr = procDate ? procDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : proc.date;
        var safeId = proc.id.replace(/'/g, "\\'");

        var compHtml = '';
        if (proc.competencyItemIds && proc.competencyItemIds.length > 0) {
            compHtml = '<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">';
            proc.competencyItemIds.forEach(function(itemId) {
                var result = findCompetencyItem(itemId);
                if (result) {
                    var cat = roadmapData.clinicalData.competencies[result.catKey];
                    compHtml += '<span style="background:' + (cat?.color || '#3b82f6') + '22; color:' + (cat?.color || '#3b82f6') + '; padding:2px 8px; border-radius:4px; font-size:0.75em;">'
                        + escapeHtml(result.item.text.substring(0, 30)) + '</span>';
                }
            });
            compHtml += '</div>';
        }

        html += '<div class="procedure-card" style="background:rgba(30,41,59,0.6); border:1px solid rgba(100,116,139,0.3); border-radius:10px; padding:14px; margin-bottom:10px;">'
            + '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">'
            + '<div style="flex:1;">'
            + '<div style="font-weight:600; color:#e2e8f0;">' + escapeHtml(proc.procedure) + '</div>'
            + '<div style="font-size:0.85em; color:#94a3b8; margin-top:4px;">'
            + (proc.patientName ? escapeHtml(proc.patientName) + ' · ' : '')
            + escapeHtml(dateStr)
            + (proc.toothNumbers ? ' · #' + escapeHtml(proc.toothNumbers) : '')
            + '</div>'
            + '<div style="font-size:0.8em; color:#64748b; margin-top:2px;">'
            + '<span style="background:rgba(59,130,246,0.15); color:#93c5fd; padding:1px 6px; border-radius:3px;">' + escapeHtml(typeName) + '</span>'
            + (proc.grade ? ' · Grade: ' + escapeHtml(proc.grade) : '')
            + (proc.faculty ? ' · ' + escapeHtml(proc.faculty) : '')
            + '</div>'
            + compHtml
            + '</div>'
            + '<button onclick="deleteProcedure(\'' + safeId + '\')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.1em; padding:4px;" title="Delete procedure record">x</button>'
            + '</div>'
            + '</div>';
    });

    container.innerHTML = html;
}

// ==================== APPOINTMENT STATUS TOGGLE ====================

function toggleAppointmentStatus(aptId, event) {
    if (event) event.stopPropagation();

    var apt = roadmapData.clinicalData?.appointments?.[aptId];
    if (!apt) return;

    if (apt.status === 'completed') {
        uncompleteAppointment(aptId);
    } else {
        completeAppointment(aptId);
    }
}

