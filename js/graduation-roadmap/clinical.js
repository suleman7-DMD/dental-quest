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
    const activePatients = Object.values(patients).filter(p => (p.activeStatus || 'Active') !== 'Inactive').length;
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
        if ((p.activeStatus || 'Active') === 'Inactive') return false;
        var recallMatch = (p.recallHistory || '').match(/Next due:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
        if (!recallMatch) return false;
        const recallDate = parseMDYDate(recallMatch[1]);
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
            var lastVisitDateStr = p.lastVisit.split('|')[0].trim();
            var lastDate = parseLocalDate(lastVisitDateStr);
            if (!lastDate || isNaN(lastDate.getTime())) {
                var mdyParts = lastVisitDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (mdyParts) lastDate = new Date(parseInt(mdyParts[3]), parseInt(mdyParts[1]) - 1, parseInt(mdyParts[2]));
            }
            if (lastDate && !isNaN(lastDate.getTime()) && lastDate >= thirtyDaysAgo) { recent.push(item); return; }
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
            var phoneSnippet = '';
            if (p.phone) {
                var phoneParts = p.phone.split('|');
                var primaryPhone = phoneParts[0].trim();
                phoneSnippet = ' <span style="color:#64748b;font-size:0.85em;" title="' + escapeHtml(p.phone) + '">\uD83D\uDCF1 ' + escapeHtml(primaryPhone) + (phoneParts.length > 1 ? ' +' + (phoneParts.length - 1) : '') + '</span>';
            }
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);">'
                + '<div>' + reliabilityDot + '<strong>' + escapeHtml(p.name) + '</strong> <span style="color:#64748b;font-size:0.85em;">#' + escapeHtml(p.chartNumber || 'N/A') + '</span>' + phoneSnippet
                + '<div style="font-size:0.8em;color:#94a3b8;margin-top:2px;">Next: ' + nextAptStr + (p.lastVisit ? ' | Last: ' + escapeHtml(p.lastVisit.split('|')[0].trim()) : '') + '</div></div>'
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

    const safeAptId = apt.id.replace(/['"\\]/g, '');
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
                    ${dayName} ${timeDisplay} · ${durationHrs}h ${apt.chair ? '· Chair ' + escapeHtml(apt.chair) : ''}
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
            .filter(p => (p.activeStatus || 'Active') !== 'Inactive')
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

    // Fix #11: Dedup guard for new manual appointments (same patient + date + time)
    if (isNew) {
        var newTime = document.getElementById('appointmentModalTime').value;
        var hasDupe = getValues(roadmapData.clinicalData?.appointments).some(function(ex) {
            return ex.patientId === patientId && ex.date === date && ex.time === newTime;
        });
        if (hasDupe) {
            showToast('An appointment for this patient at this date/time already exists', 'error');
            return;
        }
    }

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

    // Fix #12: If editing an existing appointment, update any linked deadline
    if (!isNew && roadmapData.customDeadlines) {
        var dlPatient = roadmapData.clinicalData.patientRecords?.[patientId];
        var dlPatientName = dlPatient?.name || 'Patient';
        Object.keys(roadmapData.customDeadlines).forEach(function(dlId) {
            var dl = roadmapData.customDeadlines[dlId];
            if (dl && dl.clinicalAptId === aptId) {
                dl.date = date;
                dl.what = '\u{1F3E5} ' + dlPatientName + ' - ' + (formFields.procedures || 'Clinic Apt');
            }
        });
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
    if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();
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
        if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();
    }, null, 'Delete Appointment');
}

// ==================== GRADUATION REQUIREMENTS / COMPETENCIES ====================

// Default competencies data structure
// Ground Truth: docs/GROUND_TRUTH_REQUIREMENTS.md — SINGLE source of truth for all requirement IDs, counts, deadlines.
// Last synced: 2026-04-01. Changes from prior: perio-sum-calc REMOVED (use srp-calc-1/2/3), gp-comm SPLIT into 3,
// ADDED: fixed-units-total, fixed-fpd, fixed-implant-crown, fixed-cerec, cd-units-total, gp-comm-workshop,
// gp-comm-form-txplan, gp-comm-sum-txplan, gp-meetings, gp-ohra. ALIAS: srp-reeval = perio-sum-reeval-srp.
const DEFAULT_COMPETENCIES = {
    fixed: {
        name: 'Fixed Prosthodontics',
        icon: '🦷',
        color: '#3b82f6',
        notes: 'Must include 1 FPD, 1 Implant Crown, 3 CEREC restorations. Cast Post/Core does NOT count as a unit. Up to 2 Pontic/Inlay/Onlay/Veneer CAN count.',
        sections: [
            { title: 'Aggregate Trackers (clinical experience)', items: [
                { id: 'fixed-units-total', text: 'Total fixed units (start to completion)', required: 10, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'ALL procedures on Fixed Prosthodontics Flow Sheet, ALL steps signed by faculty', custom: false },
                { id: 'fixed-fpd', text: 'Must include 1 FPD (fixed partial denture)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-implant-crown', text: 'Must include 1 Implant-Supported Crown', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Can substitute with activation of implants on implant overdenture (satisfies implant req but does NOT count toward 10 fixed units)', custom: false },
                { id: 'fixed-cerec', text: 'Must include 3 CEREC restorations', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Fixed Formatives (to qualify for summatives)', items: [
                { id: 'fixed-form-prov', text: '6 Provisional Restoration', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false },
                { id: 'fixed-form-prep', text: '6 Tooth Preparation', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false },
                { id: 'fixed-form-impr', text: '6 Final Impression', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false },
                { id: 'fixed-form-cement', text: '6 Cementation', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false }
            ]},
            { title: 'Fixed Summatives', items: [
                { id: 'fixed-sum-prep', text: '2 Prep (Tooth Preparation)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'fixed-sum-temp', text: '2 Temp (Provisional Restoration)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'fixed-sum-impr', text: '2 Final Impression', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'fixed-sum-cement', text: '2 Cementation', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Other Fixed Requirements', items: [
                { id: 'fixed-occlusal-cr', text: 'Occlusal Analysis (Centric Relation)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-occlusal-mi', text: 'Occlusal Analysis (Maximum Intercuspation)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-mock', text: 'Mock Board', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-sim-1', text: 'Fixed Simulation #1 (with Dr. Ferriero)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-sim-2', text: 'Fixed Simulation #2 (with Dr. Ferriero)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-sim-fpd', text: 'Simulation: 3-unit Prep and Temp of FPD', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'fixed-case-pres', text: 'Case Presentation (on 2 completed fixed or fixed-removable units)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    operative: {
        name: 'Operative',
        icon: '🔧',
        color: '#10b981',
        notes: '2 Class V required (exactly 2). 6 additional multisurface. Max 4 summatives with same faculty.',
        sections: [
            { title: 'Formative Prerequisite', items: [
                { id: 'op-formatives', text: 'Complete 20 formative surfaces', required: 20, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Email composite journal sheet to mcmanama@bu.edu', custom: false },
                { id: 'op-approval', text: 'Approval from Dr. McManama', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Summative Requirements (8 total)', items: [
                { id: 'op-class5-1', text: 'Class V Composite Summative #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-class5-2', text: 'Class V Composite Summative #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-1', text: 'Multisurface Summative #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-2', text: 'Multisurface Summative #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-3', text: 'Multisurface Summative #3', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-4', text: 'Multisurface Summative #4', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-5', text: 'Multisurface Summative #5', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false },
                { id: 'op-multi-6', text: 'Multisurface Summative #6', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'op-formatives', required: 20 }], unlockEmailTo: 'Dr. McManama', isSummative: true, rules: 'Max 4 summatives with same faculty', custom: false }
            ]},
            { title: 'Other Operative Requirements', items: [
                { id: 'op-assignment', text: 'Operative assignment/survey (Blackboard, 10% of grade)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'op-license', text: 'Licensing Exam Prep (Dr. Robinson, 10% of grade)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    dentures: {
        name: 'Complete Dentures',
        icon: '🦴',
        color: '#8b5cf6',
        notes: 'ALL steps must be completed by SAME student. Digital denture steps may qualify if performed independently.',
        sections: [
            { title: 'Aggregate Tracker', items: [
                { id: 'cd-units-total', text: 'Total CD units (1 unit = 1 full arch)', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Complete Denture Formatives', items: [
                { id: 'cd-form-prelim', text: '2 arches: Preliminary Impressions', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Email Removable Flow Sheet to gdadmin@bu.edu to unlock summatives', custom: false },
                { id: 'cd-form-final', text: '2 arches: Final Impression', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-records', text: '1 case: Inter-maxillary records', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-postdam', text: '1 case: Post Dam Technique', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-trial', text: '2 arches: Trial Denture (Tooth Try-In)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-insert', text: '2 arches: Insertion / Clinical Remount', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-form-adjust', text: '2 arches: Adjustment', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Complete Denture Summatives (Edentulous only)', items: [
                { id: 'cd-sum-prelim', text: 'Preliminary Impressions', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'cd-sum-final', text: 'Final Impression', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'cd-sum-records', text: 'Inter-maxillary records', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'cd-sum-postdam', text: 'Post-Dam Technique', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'cd-sum-trial', text: 'Trial Denture / Tooth Try-In', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'cd-sum-insert', text: 'Insertion / Clinical Remount', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false },
                { id: 'cd-sum-adjust', text: 'Adjustment', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'cd-form-prelim', required: 1 }, { id: 'cd-form-final', required: 1 }, { id: 'cd-form-records', required: 1 }, { id: 'cd-form-trial', required: 1 }, { id: 'cd-form-postdam', required: 1 }, { id: 'cd-form-insert', required: 1 }, { id: 'cd-form-adjust', required: 1 }], unlockEmailTo: 'gdadmin@bu.edu', isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Overdenture Experience (complete one)', items: [
                { id: 'cd-over-dup', text: 'Duplicate denture + implant planning through surgery', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'cd-over-abut', text: 'Abutment selection, placement & activation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    rpd: {
        name: 'RPDs',
        icon: '🔩',
        color: '#f59e0b',
        notes: 'Must complete one track. Flexible/interim RPD must have >=2 clasps AND replace >=3 teeth.',
        sections: [
            { title: 'Clinical Experience Tracks (choose one)', items: [
                { id: 'rpd-track1', text: 'Track 1: 1 cast metal partial denture', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'rpd-track2', text: 'Track 2: 2 flexible RPDs + OSCE', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Flexible RPD must have >=2 clasps AND replace >=3 teeth', custom: false },
                { id: 'rpd-track3', text: 'Track 3: 4 interim/resin base RPDs + OSCE', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Interim RPD must have >=2 clasps AND replace >=3 teeth', custom: false }
            ]},
            { title: 'Formatives & Summatives', items: [
                { id: 'rpd-form-abut', text: 'Formative: Abutment preparations on mounted casts', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'rpd-sum-abut', text: 'Summative: Abutment Preparations (intra-oral)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]}
        ]
    },
    srp: {
        name: 'SRPs / Calculus Removal',
        icon: '🩺',
        color: '#ef4444',
        notes: 'Officially Periodontology summatives, tracked with standalone IDs. NO separate perio-sum-calc ID exists.',
        sections: [
            { title: 'Calculus Removal Summatives', items: [
                { id: 'srp-calc-1', text: 'Calculus Removal Summative #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'perio-form-quad', required: 3 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'srp-calc-2', text: 'Calculus Removal Summative #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'perio-form-quad', required: 3 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'srp-calc-3', text: 'Calculus Removal Summative #3', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'perio-form-quad', required: 3 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'srp-reeval', text: 'Re-evaluate SRP Summative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'perio-form-reeval-srp', required: 1 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure. Alias: perio-sum-reeval-srp', custom: false }
            ]}
        ]
    },
    endo: {
        name: 'Endodontics',
        icon: '🔬',
        color: '#06b6d4',
        notes: 'Pulpectomy summative can receive credit on completed RCT cases. Mock Board must be passed regardless of CDCA/WREB results.',
        sections: [
            { title: 'Requirements', items: [
                { id: 'endo-rct-1', text: 'Root Canal Treatment #1 (on patient)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-rct-2', text: 'Root Canal Treatment #2 (on patient)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'endo-pulp-1', text: 'Pulpectomy Summative #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'endo-pulp-2', text: 'Pulpectomy Summative #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
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
            { title: '3rd Year Requirements (D3 Deadline)', items: [
                { id: 'os-3rd-rotation', text: '3rd Year Oral Surgery Rotation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-3rd-consult', text: 'Summative: OS Consult Management', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'os-3rd-nerve', text: 'Summative: IAN + Long Buccal Nerve Block', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'os-3rd-suture', text: 'Summative: Suturing Workshop', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]},
            { title: '4th Year Requirements', items: [
                { id: 'os-4th-rotation', text: 'Complete 2-week scheduled rotation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-present', text: 'Presentation at morning seminar', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-oral', text: 'Oral examination at end of rotation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-rx', text: 'Take-home prescription writing exercise', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-mcq', text: 'MCQ quiz (Med Emergency, Nitrous, Instrument ID)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-sim', text: 'Medical Simulation Lab at BMC', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'os-4th-nitrous', text: 'Nitrous-Oxide Oxygen Sedation Hands-On training', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Clinical Summatives', items: [
                { id: 'os-extract-1', text: 'Extraction on patient #1', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'os-extract-2', text: 'Extraction on patient #2', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
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
                { id: 'peds-course', text: 'PD 530 Didactic course completion', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'peds-rotation', text: 'Rotations (including Franciscan Hospital)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'peds-assessment', text: 'Post-rotation assessment', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Clinical Summatives (on log sheet)', items: [
                { id: 'peds-recall', text: '3 New Patient/Recall', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'peds-sealants', text: '3 Sealants', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'peds-restore', text: '3 Restorative procedures', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]}
        ]
    },
    perio: {
        name: 'Periodontology',
        icon: '🦠',
        color: '#f472b6',
        notes: 'All summative exams must be initiated on SPS BEFORE procedure. Faculty intervention = does NOT qualify.',
        sections: [
            { title: 'Surgical', items: [
                { id: 'perio-surg-assist', text: '7 Surgical Assist (max 1 implant uncovering)', required: 7, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: '3rd Year Summatives (D3 Deadlines)', items: [
                { id: 'perio-3rd-ohi', text: 'OHI Summative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2025-10-01', unlockedBy: [{ id: 'perio-form-ohi', required: 2 }], unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'perio-3rd-prophy', text: 'Scaling & Prophy Summative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: [{ id: 'perio-form-prophy', required: 5 }], unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'perio-3rd-reeval', text: 'Re-eval Gingivitis Summative', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: [{ id: 'perio-form-reeval-ging', required: 3 }], unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Formatives (3rd + 4th Year Cumulative)', items: [
                { id: 'perio-form-ohi', text: '2 Oral Hygiene (1 Zoom, 1 in-person)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-dx', text: '4 Diagnosis & Treatment Plan', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-prophy', text: '5 Prophy', required: 5, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-quad', text: '3 Quad SRP', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-reeval-ging', text: '3 Re-evaluate Gingivitis', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-reeval-srp', text: '1 Re-evaluate SRP', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-impr', text: '3 Re-evaluate Impression', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'perio-form-recall', text: '6 Recall', required: 6, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Summatives (3rd + 4th Year Cumulative)', items: [
                { id: 'perio-sum-hci', text: '1 Home Care Instruction', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2025-10-01', unlockedBy: [{ id: 'perio-form-ohi', required: 2 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-dx', text: '2 Diagnosis & Treatment Plan (Type 2)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'perio-form-dx', required: 4 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-prophy', text: '3 Prophy (total)', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: [{ id: 'perio-form-prophy', required: 5 }], unlockEmailTo: null, isSummative: true, rules: '1 of 3 due by D3 (May 2026); remaining 2 by D4', custom: false },
                { id: 'perio-sum-reeval-ging', text: '2 Re-evaluate Gingivitis', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: [{ id: 'perio-form-reeval-ging', required: 3 }], unlockEmailTo: null, isSummative: true, rules: '1 of 2 due by D3 (May 2026); remaining 1 by D4', custom: false },
                { id: 'perio-sum-impr', text: '1 Re-evaluate Impression', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'perio-form-impr', required: 3 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-recall', text: '2 Recall', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'perio-form-recall', required: 6 }], unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false },
                { id: 'perio-sum-mock', text: '1 Mock Board', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: 'Must initiate in SPS BEFORE procedure', custom: false }
            ]}
        ]
    },
    grouppractice: {
        name: 'Group Practice — D3 (GD 640)',
        icon: '👥',
        color: '#0ea5e9',
        notes: 'Grade: Formatives 25% (PR 7.5% + WA 7.5% + PMS 5% + Case 5%) + Summatives 65% (PR 30% + WA 35%) + Comm 10%.',
        sections: [
            { title: 'Attendance & Meetings', items: [
                { id: 'gp-attend', text: 'Clinical Attendance (4 sessions/week)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: '-1 point grade deduction per week under 4 sessions', custom: false },
                { id: 'gp-meetings', text: 'Monthly group meetings (mandatory)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: '-2 per unexcused absence', custom: false }
            ]},
            { title: 'Periodic Reviews', items: [
                { id: 'gp-form-review', text: '1 Formative Periodic Review (7.5%)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-sum-review', text: '1 Summative Periodic Review (30%)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Written Analyses', items: [
                { id: 'gp-form-analysis', text: '2 Formative Written Analyses (7.5%)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Required for EVERY Type 2 patient — submit electronically before GPL meeting', custom: false },
                { id: 'gp-sum-analysis', text: '1 Summative Written Analysis (35%)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Practice Management', items: [
                { id: 'gp-pms-3rd', text: '1 Formative PMS (5%, at Leadership Workshop)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Communication Module (10%)', items: [
                { id: 'gp-comm-workshop', text: 'Communication Workshop attendance (40% of comm)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Excused absence + makeup = full credit; 0 if nothing attended', custom: false },
                { id: 'gp-comm-form-txplan', text: '1 Formative Tx Plan Presentation (20% of comm)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-comm-sum-txplan', text: '1 Summative Tx Plan Presentation (40% of comm)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Other D3 GP Requirements', items: [
                { id: 'gp-leader', text: 'Leadership Workshop attendance', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-case', text: 'Case Presentation at Group Monthly Meeting (5%)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp-ohra', text: 'OHRA at every PE/Tx Plan appointment', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: 'Penalty: 1st offense -1, 2nd -3, 3rd -5 escalating', custom: false }
            ]}
        ]
    },
    grouppractice4: {
        name: 'Group Practice — D4 (GD 642) & Leadership',
        icon: '🎓',
        color: '#7c3aed',
        notes: 'Formally D4 requirements but formatives can/should be started in D3.',
        sections: [
            { title: '4th Year Summatives', items: [
                { id: 'gp4-comm-txplan', text: '1 Communication Tx Plan Presentation (SEPARATE from D3)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'gp4-periodicrev-1', text: '2 Periodic Reviews (in 4th year)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'gp4-written-analysis', text: '4 Written Analyses (cumulative — D3 summative WA counts)', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'gp4-pms', text: '4 Practice Management Scenarios (cumulative incl D3)', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Leadership Requirements', items: [
                { id: 'gp4-posttreat-eval', text: '3 Post Treatment Evaluations', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-aux-tech', text: 'Aux Assessment with Dental Technician (1 formative)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-aux-asst', text: 'Aux Assessment with Dental Assistant (1 formative)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-aux-summatives', text: 'Aux Team Summatives (min 1 Tech + 1 Asst, 4 total)', required: 4, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'gp4-rounds-form', text: 'Leading Rounds (1 formative)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'gp4-rounds-sum', text: 'Leading Rounds (1 summative)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]}
        ]
    },
    txplanning: {
        name: 'Treatment Planning (RS 545)',
        icon: '📋',
        color: '#6366f1',
        notes: '',
        sections: [
            { title: 'Seminar Presentation (20% of RS 545 grade)', items: [
                { id: 'tx-seminar-1', text: '1 Summative Type 2 case presentation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-04-24', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]},
            { title: 'Seminar Attendance (80% of RS 545 grade)', items: [
                { id: 'tx-attend-1', text: '2 Attend classmate presentations (by Apr 23, 2027)', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]},
            { title: 'Data Collection/Tx Planning Rotation', items: [
                { id: 'tx-ohra-1', text: '2 OHRA Summatives', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false },
                { id: 'tx-caries-1', text: '2 Caries Detection Summatives', required: 2, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: true, rules: null, custom: false }
            ]}
        ]
    },
    geriatrics: {
        name: 'Geriatric Dental Medicine',
        icon: '👴',
        color: '#8b5cf6',
        notes: 'DMD 27 must challenge PH 541 Spring 2026, then rotation + assignment.',
        sections: [
            { title: 'Requirements', items: [
                { id: 'geri-course', text: 'PH 541 Didactic Course (Spring 2026)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: '2026-05-15', unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'geri-rotation', text: 'Geriatric Dental Medicine Rotation', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'geri-course', required: 1 }], unlockEmailTo: null, isSummative: false, rules: null, custom: false },
                { id: 'geri-assignment', text: 'Clinical Assignment (any GSDM/rotation/externship patient)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: [{ id: 'geri-course', required: 1 }], unlockEmailTo: null, isSummative: false, rules: null, custom: false }
            ]}
        ]
    },
    externship: {
        name: 'Externship & SPS',
        icon: '🌴',
        color: '#059669',
        notes: 'Group 1 rotation: May 18 - July 24, 2026.',
        sections: [
            { title: 'Externship Requirements', items: [
                { id: 'ext-casepres', text: 'Case Presentation (BB upload + self-assessment + mock referral)', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
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

// CIS v3: Force-sync schema fields from DEFAULT_COMPETENCIES to saved data
// v1 used ?? which preserved old incorrect d3Deadline values; v2 ALWAYS overwrites but ran before ground truth rebuild
// v3: re-syncs after ground truth rebuild + removes orphaned items (perio-sum-calc, gp-comm, etc.)
function migrateCompetencyEnhancements() {
    if (localStorage.getItem('competencyEnhancementsDone_v3')) return;
    var comp = roadmapData.clinicalData?.competencies;
    if (!comp || typeof comp !== 'object') return;

    // Build flat lookup of all DEFAULT_COMPETENCIES items
    var defaults = {};
    Object.keys(DEFAULT_COMPETENCIES).forEach(function(catKey) {
        (DEFAULT_COMPETENCIES[catKey].sections || []).forEach(function(sec) {
            (sec.items || []).forEach(function(item) { defaults[item.id] = item; });
        });
    });

    // 1. Add missing categories (e.g., grouppractice4 from D3/D4 split)
    Object.keys(DEFAULT_COMPETENCIES).forEach(function(catKey) {
        if (!comp[catKey]) {
            var fresh = {};
            fresh[catKey] = DEFAULT_COMPETENCIES[catKey];
            comp[catKey] = migrateCompetencies(JSON.parse(JSON.stringify(fresh)))[catKey];
        }
    });

    // 2. Remove D4 items from old grouppractice (now in grouppractice4)
    if (comp.grouppractice) {
        Object.values(comp.grouppractice.sections || {}).forEach(function(sec) {
            var items = sec.items || {};
            Object.keys(items).forEach(function(itemKey) {
                if ((items[itemKey].id || itemKey).indexOf('gp4-') === 0) {
                    delete items[itemKey];
                }
            });
        });
    }

    // 3. Update category metadata from defaults (name, color, icon)
    Object.keys(DEFAULT_COMPETENCIES).forEach(function(catKey) {
        if (comp[catKey]) {
            comp[catKey].name = DEFAULT_COMPETENCIES[catKey].name;
            comp[catKey].color = DEFAULT_COMPETENCIES[catKey].color;
            comp[catKey].icon = DEFAULT_COMPETENCIES[catKey].icon;
        }
    });

    // 4. Force-sync schema fields + clean phantom progress + remove orphans
    Object.values(comp).forEach(function(cat) {
        getValues(cat.sections).forEach(function(sec) {
            var items = sec.items || {};
            Object.keys(items).forEach(function(itemKey) {
                var item = items[itemKey];
                if (!item) return;
                var def = defaults[item.id];
                if (def) {
                    // FORCE overwrite — these are schema fields, not user data
                    item.d3Deadline = def.d3Deadline ?? null;
                    item.unlockedBy = def.unlockedBy ?? null;
                    item.unlockEmailTo = def.unlockEmailTo ?? null;
                    item.isSummative = def.isSummative ?? false;
                    item.rules = def.rules ?? null;
                    item.text = def.text;
                    item.required = def.required;
                    item.custom = item.custom ?? def.custom ?? false;
                } else {
                    // Orphaned item: exists in saved data but NOT in DEFAULT_COMPETENCIES
                    // Remove it (e.g., perio-sum-calc, gp-comm)
                    console.log('[CIS-v3] Removing orphaned competency item: ' + (item.id || itemKey));
                    delete items[itemKey];
                    return;
                }
                // Clean phantom progress: completed > 0 but no evidence trail
                var entries = getValues(item.completionEntries);
                if (item.completed > 0 && entries.length === 0) {
                    item.completed = 0;
                    item.status = 'pending';
                }
            });
        });
    });

    localStorage.setItem('competencyEnhancementsDone_v3', '1');
    console.log('[CIS-v3] Migrated competency enhancements v3: re-synced schema fields after ground truth rebuild, removed orphans');
}

// Competency V2 Migration: Strip evidence-trail model, seed from manual audit
// Old model: completionEntries[], rules, unlockedBy, unlockEmailTo, custom, autoLinkReviewQueue
// New model: completed (number), required (number), note (string), lastVerified (date|null)
function migrateToCompetencyV2() {
    if (localStorage.getItem('competencyV2Migrated')) return;
    var comp = roadmapData.clinicalData?.competencies;
    if (!comp || typeof comp !== 'object') return;

    // Seed counts from verified manual audit (2026-04-01 ground truth)
    var SEED_COUNTS = {
        // OPERATIVE (completed items)
        'op-formatives': 20, 'op-approval': 1,
        'op-multi-1': 1, 'op-multi-2': 1, 'op-multi-3': 1, 'op-multi-4': 1,
        // PERIO FORMATIVES
        'perio-form-ohi': 2, 'perio-form-dx': 4, 'perio-form-prophy': 5,
        'perio-form-quad': 1, 'perio-form-recall': 5,
        // PERIO 3RD YEAR SUMMATIVES
        'perio-3rd-ohi': 1, 'perio-3rd-prophy': 1,
        // PERIO SUMMATIVES
        'perio-sum-hci': 1, 'perio-sum-prophy': 3,
        // ORAL SURGERY 3RD YEAR
        'os-3rd-rotation': 1, 'os-3rd-consult': 1, 'os-3rd-nerve': 1, 'os-3rd-suture': 1,
        // PEDS
        'peds-course': 1,
        // GP D3
        'gp-attend': 1, 'gp-form-review': 1, 'gp-case': 1,
        'gp-comm-workshop': 1, 'gp-form-analysis': 2
    };

    // Iterate ALL items across ALL categories/sections
    Object.values(comp).forEach(function(cat) {
        getValues(cat.sections).forEach(function(sec) {
            var items = sec.items || {};
            Object.keys(items).forEach(function(itemKey) {
                var item = items[itemKey];
                if (!item) return;

                // Strip old evidence-trail fields
                delete item.completionEntries;
                delete item.rules;
                delete item.custom;
                delete item.unlockedBy;
                delete item.unlockEmailTo;

                // Wipe count, then seed from ground truth if applicable
                item.completed = 0;
                var itemId = item.id || itemKey;
                if (SEED_COUNTS[itemId] !== undefined) {
                    item.completed = SEED_COUNTS[itemId];
                    item.lastVerified = '2026-04-01';
                } else {
                    item.lastVerified = null;
                }
            });
        });
    });

    // Delete the autoLinkReviewQueue entirely
    roadmapData.clinicalData.autoLinkReviewQueue = [];

    localStorage.setItem('competencyV2Migrated', '1');
    console.log('[COMP-V2] Migration complete: wiped evidence, seeded from ground truth audit');
}

// Permanent d3Deadline sync — runs on EVERY initUI to prevent merge drift
// d3Deadline is a SCHEMA field, not user data. Must always match DEFAULT_COMPETENCIES.
function syncSchemaFields() {
    var comp = roadmapData.clinicalData?.competencies;
    if (!comp || typeof comp !== 'object') return;
    var defaults = {};
    Object.keys(DEFAULT_COMPETENCIES).forEach(function(catKey) {
        (DEFAULT_COMPETENCIES[catKey].sections || []).forEach(function(sec) {
            (sec.items || []).forEach(function(item) { defaults[item.id] = item; });
        });
    });
    Object.values(comp).forEach(function(cat) {
        getValues(cat.sections).forEach(function(sec) {
            var items = sec.items || {};
            Object.values(items).forEach(function(item) {
                var def = defaults[item.id];
                if (def) {
                    item.d3Deadline = def.d3Deadline ?? null;
                    item.rules = def.rules ?? null;
                    item.text = def.text;
                    item.required = def.required;
                }
            });
            // Remove orphaned items not in DEFAULT_COMPETENCIES
            // Prevents zombie re-addition from cloud merge inflating totalUnits
            Object.keys(items).forEach(function(itemKey) {
                var item = items[itemKey];
                if (item && item.id && !defaults[item.id] && !item.custom) {
                    console.log('[SCHEMA-SYNC] Removing orphaned item: ' + item.id);
                    delete items[itemKey];
                }
            });
        });
    });
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
    var aptTarget = roadmapData.clinicHeadlines?.appointments?.target ?? 90;
    var procTarget = roadmapData.clinicHeadlines?.procedures?.target ?? 116;
    var rings = [
        { label: 'Appointments', current: aptCount.total, target: aptTarget, color: '#3b82f6' },
        { label: 'Procedures', current: procCount.total, target: procTarget, color: '#10b981' },
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
        var paceClass = paceResult.pastGraduation ? 'comp-pace-red' : (paceResult.behindSchedule ? 'comp-pace-yellow' : 'comp-pace-green');
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
        var urgency = d.daysLeft < 0 ? 'overdue' : d.daysLeft < 7 ? 'soon' : d.daysLeft < 30 ? 'upcoming' : 'ok';
        var colorMap = { overdue: '#ef4444', soon: '#f59e0b', upcoming: '#60a5fa', ok: '#22c55e' };
        var label = d.daysLeft < 0 ? (Math.abs(d.daysLeft) + 'd overdue') : d.daysLeft === 0 ? 'TODAY' : (d.daysLeft + 'd left');
        var safeCatKey = (d.catKey || '').replace(/['"\\]/g, '');
        var safeItemId = (d.item.id || '').replace(/['"\\]/g, '');
        html += '<div class="comp-d3-card ' + urgency + '" onclick="navigateToCompetencyItem(\'' + safeCatKey + '\', \'' + safeItemId + '\')" style="cursor:pointer;" title="Click to view in competencies list">'
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
// --- Task 4.9: "Which Patients Can Fulfill This?" Badges ---
// Returns patients matching this competency item, with fulfillment status:
//   'completed' = has a procedure record linked to this item
//   'planned' = in importedRequirements (CAN_FULFILL) but no procedure record
function getPatientsFulfilling(itemId) {
    var records = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    var matching = [];

    // V2: Pipeline badges show planned fulfillment from importedRequirements.
    // completedPatientIds removed — V2 disconnected procedures from competencies,
    // so all pipeline badges are 'planned' (yellow). Green badges require re-linking
    // procedures to competency items, which V2 intentionally does not do.
    var itemIdLower = (itemId || '').toLowerCase();

    Object.entries(records).forEach(function(entry) {
        var ptId = entry[0], pt = entry[1];
        if (!pt || !pt.name) return;
        var ptReqs = getValues(pt.importedRequirements);
        if (ptReqs.length > 0) {
            var hasMatch = ptReqs.some(function(req) {
                return req.reqId && req.reqId.toLowerCase() === itemIdLower;
            });
            if (hasMatch) {
                matching.push({
                    id: ptId,
                    name: pt.name,
                    chartNumber: pt.chartNumber || '',
                    fulfillmentStatus: 'planned'
                });
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
        var safeItemId = (itemId || '').replace(/['"\\]/g, '');
        var isCompleted = pt.fulfillmentStatus === 'completed';
        var badgeClass = isCompleted ? 'comp-patient-badge badge-completed' : 'comp-patient-badge badge-planned';
        var statusLabel = isCompleted ? ' \u2713' : ' (planned)';
        html += '<span class="' + badgeClass + '" onclick="showPatientCompPreview(\'' + safeId + '\', \'' + safeItemId + '\'); event.stopPropagation();" title="' + (isCompleted ? 'Completed — click to preview' : 'Planned/potential — click to preview') + '">'
            + escapeHtml(pt.name)
            + (pt.chartNumber ? ' #' + escapeHtml(pt.chartNumber) : '')
            + statusLabel
            + '</span>';
    });
    html += '</div>';
    return html;
}

// --- Patient Competency Preview Popup ---
// Uses mr-* CSS classes from Mini Review for consistent card styling.
// All user text sanitized via escapeHtml() or formatClinicalDisplay() (which escapes internally).
function showPatientCompPreview(patientId, itemId) {
    var records = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    var pt = records[patientId];
    if (!pt) { showToast('Patient not found'); return; }

    var compResult = findCompetencyItem(itemId);
    var compText = compResult ? compResult.item.text : (itemId || '');
    var compCatName = compResult ? (getCompetenciesData()[compResult.catKey]?.name || '') : '';
    var isCompleted = compResult ? compResult.item.completed >= (compResult.item.required || 1) : false;

    var matchedReq = null;
    var ptReqsPreview = getValues(pt.importedRequirements);
    if (ptReqsPreview.length > 0) {
        matchedReq = ptReqsPreview.find(function(req) {
            return req.reqId && req.reqId.toLowerCase() === (itemId || '').toLowerCase();
        });
    }

    var rel = pt.reliability || 'yellow';
    var safePatientId = (patientId || '').replace(/['"\\]/g, '');

    // Last visit — from appointment data first, fall back to field
    var lastCompleted = typeof getLastCompletedVisit === 'function' ? getLastCompletedVisit(pt, patientId) : null;
    var lastVisitRaw = pt.lastVisit || '';
    var lastVisitParts = lastVisitRaw.split('|').map(function(s) { return s.trim(); });
    var lastVisitDate = lastCompleted ? lastCompleted.date : (lastVisitParts[0] || '');
    var lastVisitProc = lastCompleted ? lastCompleted.procedures : (lastVisitParts[1] || '');
    var lastVisitProvider = lastCompleted ? lastCompleted.provider : (lastVisitParts[2] || '');

    // Next visit
    var autoNext = typeof getNextScheduledVisit === 'function' ? getNextScheduledVisit(pt, patientId) : '';
    var effectiveNext = pt.nextVisitManual ? (pt.nextVisit || '') : (autoNext || '');
    var nextVisitDate = '';
    var nextVisitProc = '';
    if (effectiveNext) {
        var dashIdx = effectiveNext.indexOf('\u2014');
        if (dashIdx !== -1) {
            nextVisitDate = effectiveNext.substring(0, dashIdx).trim();
            nextVisitProc = effectiveNext.substring(dashIdx + 1).trim();
        } else {
            nextVisitDate = effectiveNext.split('|')[0].trim();
        }
    }

    var isHV = pt.highValue || false;
    if (!isHV && ptReqsPreview.length >= 3) isHV = true;
    var statusColor = isCompleted ? '#22c55e' : '#f59e0b';
    var statusText = isCompleted ? 'COMPLETED' : 'PLANNED / POTENTIAL';
    var statusBg = isCompleted ? '#f0fdf4' : '#fef9ee';

    // Build entire popup via DOM (XSS safe — all text via escapeHtml or textContent)
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10001; display:flex; align-items:center; justify-content:center; padding:20px;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var modal = document.createElement('div');
    modal.className = 'mr-card';
    modal.style.cssText = 'max-width:440px; width:100%; max-height:80vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,0.15); border-color:#e2e0d8;';

    // Header (mr-card-header)
    var header = document.createElement('div');
    header.className = 'mr-card-header';
    var dot = document.createElement('span');
    dot.className = 'mr-rel-dot mr-rel-' + rel;
    header.appendChild(dot);
    var nameEl = document.createElement('span');
    nameEl.className = 'mr-name';
    nameEl.textContent = pt.name || 'Unnamed';
    header.appendChild(nameEl);
    if (isHV) {
        var hvBadge = document.createElement('span');
        hvBadge.className = 'mr-hv';
        hvBadge.textContent = 'HIGH VALUE';
        header.appendChild(hvBadge);
    }
    var chartEl = document.createElement('span');
    chartEl.className = 'mr-chart';
    chartEl.textContent = '#' + (pt.chartNumber || 'N/A');
    header.appendChild(chartEl);
    modal.appendChild(header);

    // Competency match box (unique to this popup)
    if (itemId) {
        var matchBox = document.createElement('div');
        matchBox.style.cssText = 'background:' + statusBg + '; border-left:3px solid ' + statusColor + '; padding:8px 12px; border-radius:0 6px 6px 0; margin-bottom:10px;';
        var statusLabel = document.createElement('div');
        statusLabel.className = 'mr-visit-label';
        statusLabel.style.color = statusColor;
        statusLabel.textContent = statusText;
        matchBox.appendChild(statusLabel);
        var compTextEl = document.createElement('div');
        compTextEl.style.cssText = 'font-size:0.85em; color:#17212b; font-weight:600; margin-top:2px;';
        compTextEl.textContent = compCatName + ' \u2192 ' + compText;
        matchBox.appendChild(compTextEl);
        if (matchedReq && matchedReq.description) {
            var descEl = document.createElement('div');
            descEl.style.cssText = 'font-size:0.78em; color:#62707c; margin-top:3px;';
            descEl.textContent = matchedReq.description;
            matchBox.appendChild(descEl);
        }
        if (matchedReq && matchedReq.procedure) {
            var procEl = document.createElement('div');
            procEl.style.cssText = 'font-size:0.78em; color:#62707c;';
            procEl.textContent = 'Procedure: ' + matchedReq.procedure;
            matchBox.appendChild(procEl);
        }
        modal.appendChild(matchBox);
    }

    // Visit dates row (mr-visits — identical to mini review)
    var visits = document.createElement('div');
    visits.className = 'mr-visits';
    var lastBox = document.createElement('div');
    lastBox.className = 'mr-visit-box';
    var lastLabel = document.createElement('div');
    lastLabel.className = 'mr-visit-label';
    lastLabel.textContent = 'Last Visit';
    lastBox.appendChild(lastLabel);
    if (lastVisitDate) {
        var lastVal = document.createElement('div');
        lastVal.className = 'mr-visit-value';
        lastVal.textContent = lastVisitDate;
        lastBox.appendChild(lastVal);
        if (lastVisitProc) {
            var lastDet = document.createElement('div');
            lastDet.className = 'mr-visit-detail';
            lastDet.textContent = lastVisitProc;
            lastBox.appendChild(lastDet);
        }
        if (lastVisitProvider) {
            var lastProv = document.createElement('div');
            lastProv.className = 'mr-visit-provider';
            lastProv.textContent = lastVisitProvider;
            lastBox.appendChild(lastProv);
        }
    } else {
        var lastNone = document.createElement('div');
        lastNone.className = 'mr-visit-value mr-none';
        lastNone.textContent = 'None recorded';
        lastBox.appendChild(lastNone);
    }
    visits.appendChild(lastBox);
    var nextBox = document.createElement('div');
    nextBox.className = 'mr-visit-box';
    var nextLabel = document.createElement('div');
    nextLabel.className = 'mr-visit-label';
    nextLabel.textContent = 'Next Visit';
    nextBox.appendChild(nextLabel);
    if (nextVisitDate) {
        var nextVal = document.createElement('div');
        nextVal.className = 'mr-visit-value';
        nextVal.textContent = nextVisitDate;
        nextBox.appendChild(nextVal);
        if (nextVisitProc) {
            var nextDet = document.createElement('div');
            nextDet.className = 'mr-visit-detail';
            nextDet.textContent = nextVisitProc;
            nextBox.appendChild(nextDet);
        }
    } else {
        var nextNone = document.createElement('div');
        nextNone.className = 'mr-visit-value mr-none';
        nextNone.textContent = 'Not scheduled';
        nextBox.appendChild(nextNone);
    }
    visits.appendChild(nextBox);
    modal.appendChild(visits);

    // Clinical Brief (uses formatClinicalDisplay — already escapes internally)
    var briefSnap = (pt.clinicalBrief && pt.clinicalBrief.snapshot) ? pt.clinicalBrief.snapshot.trim() : '';
    if (briefSnap) {
        var briefLabel2 = document.createElement('div');
        briefLabel2.className = 'mr-section-label';
        briefLabel2.textContent = 'Clinical Brief';
        modal.appendChild(briefLabel2);
        var briefDiv = document.createElement('div');
        briefDiv.className = 'mr-brief-snap';
        briefDiv.innerHTML = formatClinicalDisplay(briefSnap);
        modal.appendChild(briefDiv);
    }

    // Treatment Plan (uses formatClinicalDisplay)
    var txPlan = (pt.txPlan || '').trim();
    if (txPlan) {
        var txLabel = document.createElement('div');
        txLabel.className = 'mr-section-label';
        txLabel.textContent = 'Treatment Plan';
        modal.appendChild(txLabel);
        var txDiv = document.createElement('div');
        txDiv.className = 'mr-text';
        txDiv.innerHTML = formatClinicalDisplay(txPlan);
        modal.appendChild(txDiv);
    }

    // Tx completed
    var txDone = (pt.txCompletedByMe || '').trim();
    if (txDone) {
        var doneLabel = document.createElement('div');
        doneLabel.className = 'mr-section-label';
        doneLabel.textContent = 'Completed by Me';
        modal.appendChild(doneLabel);
        var doneDiv = document.createElement('div');
        doneDiv.className = 'mr-text';
        doneDiv.innerHTML = formatClinicalDisplay(txDone);
        modal.appendChild(doneDiv);
    }

    if (!briefSnap && !txPlan && !txDone && !itemId) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'mr-text mr-empty';
        emptyDiv.textContent = 'No treatment data recorded yet';
        modal.appendChild(emptyDiv);
    }

    // Footer: View Full Record
    var footer = document.createElement('div');
    footer.style.cssText = 'text-align:center; margin-top:12px; padding-top:10px; border-top:1px solid #f0ede6;';
    var viewBtn = document.createElement('button');
    viewBtn.style.cssText = 'background:#fff; border:1px solid #1a7f79; color:#1a7f79; border-radius:6px; padding:7px 18px; cursor:pointer; font-size:0.85em; font-weight:500;';
    viewBtn.textContent = 'View Full Record \u2192';
    viewBtn.onclick = function() { overlay.remove(); navigateToEntity('patient', safePatientId); };
    viewBtn.onmouseenter = function() { viewBtn.style.background = '#1a7f79'; viewBtn.style.color = '#fff'; };
    viewBtn.onmouseleave = function() { viewBtn.style.background = '#fff'; viewBtn.style.color = '#1a7f79'; };
    footer.appendChild(viewBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
        if (pt && pt.name && (pt.activeStatus || 'Active') !== 'Inactive') {
            patientOptions += '<option value="' + escapeHtml(ptId) + '">' + escapeHtml(pt.name)
                + (pt.chartNumber ? ' #' + escapeHtml(pt.chartNumber) : '') + '</option>';
        }
    });

    var modalHtml = '<div id="compQuickRecordOverlay" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.3); z-index:10000; display:flex; align-items:center; justify-content:center;">'
        + '<div style="background:#FFFFFF; border:1px solid rgba(0,0,0,0.12); border-radius:12px; padding:24px; max-width:400px; width:90%; box-shadow:0 8px 32px rgba(0,0,0,0.12);">'
        + '<h3 style="color:#2C2825; margin:0 0 16px;">Quick Record: ' + escapeHtml(item.text.substring(0, 40)) + '</h3>'
        + '<div style="color:#9C948B; font-size:0.85em; margin-bottom:12px;">' + item.completed + '/' + item.required + ' completed</div>'
        + '<div style="margin-bottom:12px;">'
        + '<label style="color:#9C948B; font-size:0.85em; display:block; margin-bottom:4px;">Patient</label>'
        + '<select id="compQR_patient" style="width:100%; padding:8px; background:#F5F2ED; border:1px solid rgba(0,0,0,0.12); border-radius:6px; color:#2C2825;">'
        + patientOptions + '</select></div>'
        + '<div style="margin-bottom:12px;">'
        + '<label style="color:#9C948B; font-size:0.85em; display:block; margin-bottom:4px;">Date</label>'
        + '<input type="date" id="compQR_date" value="' + getLocalDateString() + '" style="width:100%; padding:8px; background:#F5F2ED; border:1px solid rgba(0,0,0,0.12); border-radius:6px; color:#2C2825;"></div>'
        + '<div style="margin-bottom:16px;">'
        + '<label style="color:#9C948B; font-size:0.85em; display:block; margin-bottom:4px;">Notes</label>'
        + '<textarea id="compQR_notes" rows="2" placeholder="Optional notes..." style="width:100%; padding:8px; background:#F5F2ED; border:1px solid rgba(0,0,0,0.12); border-radius:6px; color:#2C2825; resize:vertical;"></textarea></div>'
        + '<div style="display:flex; gap:8px; justify-content:flex-end;">'
        + '<button onclick="closeCompQuickRecord()" style="padding:8px 16px; background:#F5F2ED; border:none; border-radius:6px; color:#2C2825; cursor:pointer;">Cancel</button>'
        + '<button onclick="submitCompQuickRecord(\'' + (itemId || '').replace(/['"\\]/g, '') + '\', \'' + (result.catKey || '').replace(/['"\\]/g, '') + '\')" '
        + 'style="padding:8px 16px; background:#5E8A5E; border:none; border-radius:6px; color:white; cursor:pointer; font-weight:600;">Record</button>'
        + '</div></div></div>';

    var overlay = document.createElement('div');
    overlay.innerHTML = modalHtml;
    document.body.appendChild(overlay.firstChild);
    var overlayEl = document.getElementById('compQuickRecordOverlay');
    if (overlayEl) overlayEl.onclick = function(e) { if (e.target === overlayEl) closeCompQuickRecord(); };
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
    showToast('Procedure recorded');
}

// --- Task 4.14: Persistent Expanded State ---
function persistExpandedState() {
    if (!roadmapData.competencyUIState) roadmapData.competencyUIState = { expandedCategories: [], viewMode: 'department' };
    roadmapData.competencyUIState.expandedCategories = Array.from(expandedCompCategories);
    // Lightweight save — persist to localStorage for UI state
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
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
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    renderCompetencies();
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
    if (!container) return;

    var competencies = getCompetenciesData();
    var stats = calculateOverallStats(competencies);

    // Restore persisted expanded state
    restoreExpandedState();

    // Save scroll position
    var scrollParent = container.closest('.tab-content') || container.parentElement;
    var savedScroll = scrollParent ? scrollParent.scrollTop : 0;

    // Hide old containers no longer used in cv2 layout
    var oldDashboard = document.getElementById('overallProgressSummary');
    if (oldDashboard) oldDashboard.innerHTML = '';
    var oldViewToggle = document.getElementById('compViewToggle');
    if (oldViewToggle) oldViewToggle.innerHTML = '';
    var oldMilestone = document.getElementById('compMilestoneDashboard');
    if (oldMilestone) oldMilestone.innerHTML = '';
    var oldD3 = document.getElementById('compD3Deadlines');
    if (oldD3) oldD3.innerHTML = '';
    var oldSearchBar = document.getElementById('compSearchBar');
    if (oldSearchBar) oldSearchBar.innerHTML = '';
    var oldWhatsNext = document.getElementById('compWhatsNext');
    if (oldWhatsNext) oldWhatsNext.innerHTML = '';
    var oldReviewQueue = document.getElementById('compReviewQueue');
    if (oldReviewQueue) oldReviewQueue.innerHTML = '';

    // === ALL 3 PANELS rendered into competenciesContainer ===
    var html = '<div class="cv2-container">';

    // === PANEL 1: MILESTONE STRIP + D3 ALERT ===
    html += cv2BuildMilestoneStrip(competencies, stats);

    // === SEARCH BAR (inline) ===
    html += '<input class="cv2-search" type="text" placeholder="Search requirements..." oninput="cv2FilterCompetencies(this.value)"'
        + (compSearchQuery ? ' value="' + escapeHtml(compSearchQuery) + '"' : '') + '>';

    // === PANEL 2: CATEGORY ACCORDION ===
    var sortedCategories = getUrgencySortedCategoryKeys(competencies);

    sortedCategories.forEach(function(entry) {
        var key = entry.key, cat = entry.cat, catStats = entry.stats;
        var isExpanded = expandedCompCategories.has(key);
        var pct = catStats.percent || 0;
        var barCls = pct >= 100 ? 'cv2-bar-done' : pct > 0 ? 'cv2-bar-wip' : 'cv2-bar-critical';
        var safeKey = (key || '').replace(/['"\\]/g, '');

        // Skip if search/filter active and no visible items
        if ((compSearchQuery || compActiveFilters.length > 0) && !compCategoryHasVisibleItems(cat)) return;

        html += '<div class="cv2-category' + (isExpanded ? ' expanded' : '') + '" data-cat="' + escapeHtml(key) + '">';
        html += '<div class="cv2-cat-header" onclick="cv2ToggleCategory(\'' + safeKey + '\')">';
        html += '<span class="cv2-cat-icon">' + (cat.icon || '') + '</span>';
        html += '<span class="cv2-cat-name">' + escapeHtml(cat.name || key) + '</span>';
        html += '<span class="cv2-cat-count">' + catStats.completedUnits + '/' + catStats.totalUnits + '</span>';
        html += '<div class="cv2-cat-bar"><div class="cv2-cat-bar-fill ' + barCls + '" style="width:' + pct + '%"></div></div>';
        html += '<span class="cv2-cat-pct">' + pct + '%</span>';
        html += '<span class="cv2-cat-chevron">' + (isExpanded ? '\u25BC' : '\u25B6') + '</span>';
        html += '</div>'; // close cv2-cat-header

        // Category body
        html += '<div class="cv2-cat-body"' + (isExpanded ? '' : ' style="display:none;"') + '>';
        if (isExpanded) {
            // Category notes callout
            if (cat.notes) {
                html += '<div class="cv2-cat-notes">' + escapeHtml(cat.notes) + '</div>';
            }

            // Category rules
            var allCatItems = [];
            getValues(cat.sections).forEach(function(sec) {
                getValues(sec.items).forEach(function(item) { allCatItems.push(item); });
            });
            html += renderCategoryRules(key, allCatItems);

            // Sections and items
            getValues(cat.sections).forEach(function(sec) {
                var visibleItems = getValues(sec.items).filter(function(item) {
                    return compItemMatchesFilter(item);
                });
                if (visibleItems.length === 0 && (compSearchQuery || compActiveFilters.length > 0)) return;

                if (sec.title) {
                    html += '<div class="cv2-section-title">' + escapeHtml(sec.title) + '</div>';
                }

                var itemsToRender = (compSearchQuery || compActiveFilters.length > 0) ? visibleItems : getValues(sec.items);
                itemsToRender.forEach(function(item) {
                    if (!item || !item.id) return;
                    var completed = item.completed || 0;
                    var required = item.required || 1;
                    var safeItemId = (item.id || '').replace(/['"\\]/g, '');

                    // Status icon
                    var statusIcon = '\u2B1C'; // white square
                    if (completed >= required) {
                        statusIcon = '\u2705'; // green check
                    } else if (completed > 0) {
                        statusIcon = '\uD83D\uDFE1'; // yellow circle
                    }

                    var pipelineCount = typeof getPatientsFulfilling === 'function' ? getPatientsFulfilling(item.id).length : 0;
                    var hasNote = item.note && item.note.trim().length > 0;

                    html += '<div class="cv2-req-row" data-item="' + escapeHtml(item.id) + '">';
                    html += '<span class="cv2-req-name" onclick="cv2ShowPipeline(\'' + safeItemId + '\')">' + escapeHtml(item.text || item.id) + '</span>';
                    html += '<div class="cv2-counter">';
                    html += '<button class="cv2-counter-btn" onclick="event.stopPropagation();adjustCompItem(\'' + safeKey + '\',\'' + safeItemId + '\',-1)">\u2212</button>';
                    html += '<span class="cv2-counter-val" onclick="event.stopPropagation();cv2EditCount(\'' + safeKey + '\',\'' + safeItemId + '\',this)">'
                        + completed + '/' + required + '</span>';
                    html += '<button class="cv2-counter-btn" onclick="event.stopPropagation();adjustCompItem(\'' + safeKey + '\',\'' + safeItemId + '\',1)">+</button>';
                    html += '</div>';
                    html += '<span class="cv2-status">' + statusIcon + '</span>';

                    // Pipeline badge
                    if (pipelineCount > 0) {
                        html += '<span class="cv2-pipeline" onclick="event.stopPropagation();cv2ShowPipeline(\'' + safeItemId + '\')">'
                            + pipelineCount + ' pt' + (pipelineCount > 1 ? 's' : '') + '</span>';
                    } else {
                        html += '<span class="cv2-pipeline cv2-pipeline-empty">0 pts</span>';
                    }

                    // Notes icon
                    html += '<span class="cv2-notes-icon' + (hasNote ? ' cv2-has-note' : '') + '" onclick="event.stopPropagation();cv2ToggleNote(\'' + safeKey + '\',\'' + safeItemId + '\',this)"'
                        + ' title="' + (hasNote ? escapeHtml(item.note) : 'Add note') + '">\uD83D\uDCDD</span>';

                    // Quick record for incomplete items
                    if (completed < required) {
                        html += '<span class="cv2-quick-record" onclick="openCompQuickRecord(\'' + safeItemId + '\'); event.stopPropagation();" title="Quick record">+</span>';
                    }

                    // Custom item delete
                    if (item.custom === true) {
                        html += '<span class="cv2-delete-btn" onclick="deleteCompItem(\'' + safeKey + '\',\'' + safeItemId + '\'); event.stopPropagation();" title="Delete">\u2716</span>';
                    }

                    html += '</div>'; // close cv2-req-row
                });

                // Add requirement button per section
                var safeSectionId = (sec.id || '').replace(/['"\\]/g, '');
                html += '<button class="cv2-add-req-btn" onclick="openAddCompItemModal(\'' + safeKey + '\',\'' + safeSectionId + '\'); event.stopPropagation();">'
                    + '+ Add Requirement</button>';
            });

            // Category notes textarea
            html += '<div class="cv2-cat-notes-edit">'
                + '<label class="cv2-cat-notes-label">Category Notes:</label>'
                + '<textarea class="cv2-cat-notes-textarea" rows="2" placeholder="Add notes for ' + escapeHtml(cat.name) + '..." '
                + 'onchange="updateCompNotes(\'' + safeKey + '\', this.value)">' + escapeHtml(cat.notes || '') + '</textarea>'
                + '</div>';
        }
        html += '</div></div>'; // close cv2-cat-body and cv2-category
    });

    // === PANEL 3: WHAT'S NEXT ===
    html += cv2BuildWhatsNext(competencies);

    html += '</div>'; // close cv2-container

    container.innerHTML = html;
    if (scrollParent) scrollParent.scrollTop = savedScroll;
}

// === CV2 PANEL 1: Build Milestone Strip + D3 Alert (returns HTML string) ===
function cv2BuildMilestoneStrip(competencies, stats) {
    var aptCount = typeof getSmartAppointmentCount === 'function' ? getSmartAppointmentCount() : { total: 0 };
    var procCount = typeof getSmartProcedureCount === 'function' ? getSmartProcedureCount() : { total: 0 };

    // Count summatives
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
    if (summativeTotal === 0) summativeTotal = 7;

    var aptTarget = roadmapData.clinicHeadlines?.appointments?.target ?? 90;
    var procTarget = roadmapData.clinicHeadlines?.procedures?.target ?? 116;

    var kpis = [
        { label: 'Appointments', current: aptCount.total, target: aptTarget },
        { label: 'Procedures', current: procCount.total, target: procTarget },
        { label: 'Summatives', current: summativeCompleted, target: summativeTotal }
    ];

    var html = '<div class="cv2-milestones">';

    kpis.forEach(function(kpi) {
        var pct = kpi.target > 0 ? Math.min(100, Math.round((kpi.current / kpi.target) * 100)) : 0;
        var colorClass = pct >= 80 ? 'on-track' : pct >= 40 ? 'behind' : 'critical';
        var barClass = pct >= 100 ? 'cv2-bar-done' : pct > 0 ? 'cv2-bar-wip' : 'cv2-bar-critical';
        html += '<div class="cv2-kpi-card">'
            + '<div class="cv2-kpi-value cv2-color-' + colorClass + '">' + kpi.current + '/' + kpi.target + '</div>'
            + '<div class="cv2-kpi-label">' + escapeHtml(kpi.label) + '</div>'
            + '<div class="cv2-kpi-bar"><div class="cv2-kpi-bar-fill ' + barClass + '" style="width:' + pct + '%;"></div></div>'
            + '<div class="cv2-kpi-pct">' + pct + '%</div>'
            + '</div>';
    });

    // Readiness card
    var overallPct = stats.overallPercent || 0;
    var gradDate = new Date(2027, 4, 15); // May 15, 2027
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var daysLeft = Math.max(0, Math.ceil((gradDate - today) / 86400000));
    var weeksLeft = Math.max(1, Math.floor(daysLeft / 7));
    var remainingUnits = Math.max(0, stats.totalUnits - stats.completedUnits);
    var itemsPerWeek = weeksLeft > 0 ? (remainingUnits / weeksLeft).toFixed(1) : '0';
    var readinessColor = overallPct >= 80 ? 'done' : overallPct >= 40 ? 'wip' : 'critical';

    html += '<div class="cv2-readiness">'
        + '<div class="cv2-readiness-score cv2-color-' + readinessColor + '">' + overallPct + '% Ready</div>'
        + '<div class="cv2-readiness-meta">' + daysLeft + ' days left \u00B7 ' + itemsPerWeek + ' items/week needed</div>'
        + '</div>';

    html += '</div>'; // close cv2-milestones

    // D3 Deadline alert bar
    html += cv2BuildD3Alert(competencies, daysLeft);

    return html;
}

// === D3 Alert Bar (returns HTML string) ===
function cv2BuildD3Alert(comp, daysLeft) {
    var d3Items = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    Object.entries(comp).forEach(function(entry) {
        var catKey = entry[0], cat = entry[1];
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                if (item.d3Deadline && item.completed < (item.required || 1)) {
                    var parts = item.d3Deadline.split('-').map(Number);
                    var dlDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    var itemDaysLeft = Math.floor((dlDate - today) / 86400000);
                    d3Items.push({
                        catKey: catKey,
                        item: item,
                        catName: cat.name || catKey,
                        catColor: cat.color || '#94a3b8',
                        daysLeft: itemDaysLeft
                    });
                }
            });
        });
    });

    if (d3Items.length === 0) return '';

    d3Items.sort(function(a, b) { return a.daysLeft - b.daysLeft; });
    var zeroProgress = d3Items.filter(function(d) { return (d.item.completed || 0) === 0; });

    var html = '<div class="cv2-d3-alert" onclick="this.classList.toggle(\'expanded\')">'
        + '<div class="cv2-d3-alert-header">'
        + '<span class="cv2-d3-alert-icon">\u26A0\uFE0F</span>'
        + '<span class="cv2-d3-alert-text">' + d3Items.length + ' D3 deadline' + (d3Items.length > 1 ? 's' : '') + ' remaining';
    if (zeroProgress.length > 0) {
        html += ' \u00B7 <strong>' + zeroProgress.length + ' with zero progress</strong>';
    }
    html += ' \u00B7 ' + daysLeft + ' days left</span>'
        + '<span class="cv2-d3-alert-toggle">\u25BC</span>'
        + '</div>';

    html += '<div class="cv2-d3-alert-list">';
    d3Items.forEach(function(d) {
        var urgency = d.daysLeft < 0 ? 'overdue' : d.daysLeft < 7 ? 'soon' : d.daysLeft < 30 ? 'upcoming' : 'ok';
        var label = d.daysLeft < 0 ? (Math.abs(d.daysLeft) + 'd overdue') : d.daysLeft === 0 ? 'TODAY' : (d.daysLeft + 'd left');
        var safeCatKey = (d.catKey || '').replace(/['"\\]/g, '');
        var safeItemId = (d.item.id || '').replace(/['"\\]/g, '');
        html += '<div class="cv2-d3-item cv2-d3-' + urgency + '" onclick="event.stopPropagation();navigateToCompetencyItem(\'' + safeCatKey + '\',\'' + safeItemId + '\')">'
            + '<span class="cv2-d3-cat" style="color:' + d.catColor + ';">' + escapeHtml(d.catName) + '</span>'
            + '<span class="cv2-d3-name">' + escapeHtml(d.item.text.length > 40 ? d.item.text.substring(0, 40) + '...' : d.item.text) + '</span>'
            + '<span class="cv2-d3-countdown cv2-d3-' + urgency + '">' + label + '</span>'
            + '<span class="cv2-d3-progress">' + d.item.completed + '/' + d.item.required + '</span>'
            + '</div>';
    });
    html += '</div></div>';

    return html;
}

// === CV2 PANEL 3: What's Next (returns HTML string) ===
function cv2BuildWhatsNext(competencies) {
    var items = getWhatsNextItems(competencies);

    // Gather upcoming appointment pipeline
    var appointments = getValues(roadmapData.clinicalData?.appointments);
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var upcomingApts = appointments
        .filter(function(apt) {
            if (!apt.date || apt.status === 'completed' || apt.status === 'cancelled') return false;
            var parts = (apt.date || '').split('-').map(Number);
            if (parts.length < 3) return false;
            var aptDate = new Date(parts[0], parts[1] - 1, parts[2]);
            return aptDate >= today;
        })
        .sort(function(a, b) {
            return (a.date || '').localeCompare(b.date || '');
        })
        .slice(0, 5);

    if (items.length === 0 && upcomingApts.length === 0) return '';

    var html = '<div class="cv2-whatsnext">';
    html += '<div class="cv2-whatsnext-title">What\'s Next</div>';

    // In-progress / planned items
    if (items.length > 0) {
        html += '<div class="cv2-whatsnext-section">Active Items</div>';
        items.forEach(function(item) {
            var pct = item.required > 0 ? Math.round((item.completed / item.required) * 100) : 0;
            var barClass = pct === 0 ? 'cv2-bar-critical' : pct >= 100 ? 'cv2-bar-done' : 'cv2-bar-wip';
            var safeId = (item.id || '').replace(/['"\\]/g, '');
            html += '<div class="cv2-wn-card">'
                + '<span class="cv2-wn-badge" style="background:' + (item.catColor || '#3b82f6') + '22; color:' + (item.catColor || '#3b82f6') + ';">' + escapeHtml(item.catName) + '</span>'
                + '<span class="cv2-wn-name">' + escapeHtml(item.text) + '</span>'
                + '<div class="cv2-wn-bar-container"><div class="cv2-wn-bar-fill ' + barClass + '" style="width:' + pct + '%;"></div></div>'
                + '<span class="cv2-wn-count">' + item.completed + '/' + item.required + '</span>'
                + '<button class="cv2-wn-record-btn" onclick="openCompQuickRecord(\'' + safeId + '\')">Record</button>'
                + '</div>';
        });
    }

    // Upcoming appointments
    if (upcomingApts.length > 0) {
        html += '<div class="cv2-whatsnext-section">Upcoming Appointments</div>';
        upcomingApts.forEach(function(apt) {
            var ptName = escapeHtml(apt.patientName || apt.patient || 'Unknown');
            var aptDate = apt.date || '';
            var proc = escapeHtml(apt.procedure || apt.procedures || '');
            html += '<div class="cv2-wn-apt">'
                + '<span class="cv2-wn-apt-date">' + escapeHtml(aptDate) + '</span>'
                + '<span class="cv2-wn-apt-patient">' + ptName + '</span>'
                + '<span class="cv2-wn-apt-proc">' + proc + '</span>'
                + '</div>';
        });
    }

    html += '</div>';
    return html;
}

// === CV2 HELPER: Toggle category expanded/collapsed ===
function cv2ToggleCategory(catKey) {
    if (expandedCompCategories.has(catKey)) {
        expandedCompCategories.delete(catKey);
    } else {
        expandedCompCategories.add(catKey);
    }
    persistExpandedState();
    renderCompetencies();
}

// Keep old name as alias for external callers
function toggleCompCategory(key) {
    cv2ToggleCategory(key);
}

// === CV2 HELPER: Search filter ===
function cv2FilterCompetencies(query) {
    compSearchQuery = (query || '').trim();
    renderCompetencies();
}

// === CV2 HELPER: Inline count edit ===
function cv2EditCount(catKey, itemId, el) {
    var parts = el.textContent.split('/');
    var current = parseInt(parts[0]) || 0;
    var required = parseInt(parts[1]) || 1;
    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'cv2-counter-input';
    input.value = current;
    input.min = 0;
    input.max = required;
    el.replaceWith(input);
    input.focus();
    input.select();
    var committed = false;
    function commit() {
        if (committed) return;
        committed = true;
        var newVal = Math.max(0, Math.min(required, parseInt(input.value) || 0));
        var delta = newVal - current;
        if (delta !== 0) {
            adjustCompItem(catKey, itemId, delta);
        } else {
            renderCompetencies();
        }
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { committed = true; renderCompetencies(); }
    });
}

// === CV2 HELPER: Toggle inline note editor ===
function cv2ToggleNote(catKey, itemId, el) {
    var row = el.closest('.cv2-req-row');
    if (!row) return;
    var existing = row.querySelector('.cv2-note-editor');
    if (existing) { existing.remove(); return; }
    var comp = getCompetenciesData();
    var item = null;
    var cat = comp[catKey];
    if (cat) {
        getValues(cat.sections).forEach(function(sec) {
            if (sec.items) {
                Object.values(sec.items).forEach(function(it) {
                    if (it.id === itemId) item = it;
                });
            }
        });
    }
    var textarea = document.createElement('textarea');
    textarea.className = 'cv2-note-editor';
    textarea.value = (item && item.note) || '';
    textarea.placeholder = 'Add notes...';
    row.appendChild(textarea);
    textarea.focus();
    textarea.addEventListener('blur', function() {
        saveCompItemNote(catKey, itemId, textarea.value);
    });
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { textarea.remove(); }
    });
}

// === CV2 HELPER: Show pipeline patients for a requirement ===
function cv2ShowPipeline(itemId) {
    var patients = typeof getPatientsFulfilling === 'function' ? getPatientsFulfilling(itemId) : [];
    if (patients.length === 0) {
        showToast('No patients in pipeline for this requirement', 'info');
        return;
    }
    if (patients.length === 1) {
        showPatientCompPreview(patients[0].id || patients[0].patientId, itemId);
        return;
    }
    // Multi-patient popup using DOM construction (XSS safe)
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;';
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border:1px solid #ddd;border-radius:12px;padding:20px;max-width:340px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.15);';
    var title = document.createElement('h4');
    title.textContent = 'Pipeline Patients';
    title.style.cssText = 'margin:0 0 12px;color:#1a1a2e;font-size:1em;';
    card.appendChild(title);
    patients.forEach(function(p) {
        var row = document.createElement('div');
        row.style.cssText = 'padding:10px 8px;cursor:pointer;border-bottom:1px solid #eee;color:#1a1a2e;font-size:0.9em;border-radius:6px;';
        row.textContent = (p.name || 'Unknown') + ' #' + (p.chartNumber || '');
        row.onmouseenter = function() { row.style.background = '#f0f0f0'; };
        row.onmouseleave = function() { row.style.background = 'transparent'; };
        row.onclick = function() {
            overlay.remove();
            showPatientCompPreview(p.id || p.patientId, itemId);
        };
        card.appendChild(row);
    });
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'margin-top:12px;padding:8px 20px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;color:#666;cursor:pointer;font-size:0.85em;';
    closeBtn.onclick = function() { overlay.remove(); };
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

// === CV2 HELPER: Show item detail (navigate + expand category) ===
function cv2ShowItemDetail(catKey, itemId) {
    if (!expandedCompCategories.has(catKey)) {
        expandedCompCategories.add(catKey);
        persistExpandedState();
        renderCompetencies();
    }
    setTimeout(function() {
        navigateToCompetencyItem(catKey, itemId);
    }, 50);
}

// === CV2 HELPER: Add requirement (delegates to existing modal) ===
function cv2AddRequirement(catKey) {
    var comp = getCompetenciesData();
    var cat = comp[catKey];
    if (!cat) return;
    var firstSection = getValues(cat.sections)[0];
    var sectionId = firstSection ? (firstSection.id || '') : '';
    openAddCompItemModal(catKey, sectionId);
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

            // V2: Simple status toggle — no evidence entries
            const currentStatus = getItemStatus(item);
            if (currentStatus === newStatus) {
                // Toggle off — reset to derived status
                item.completed = 0;
                item.status = 'pending';
            } else {
                item.status = newStatus;
                if (newStatus === 'completed') {
                    item.completed = item.required;
                } else if (newStatus === 'pending') {
                    item.completed = 0;
                }
                // in_progress keeps current count
            }
            // Set lastVerified
            var now = new Date();
            item.lastVerified = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

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

            // V2: Set lastVerified on manual edit
            var now = new Date();
            item.lastVerified = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

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
        // Clear migration flags so migrateToCompetencyV2() re-seeds verified counts on next init
        localStorage.removeItem('competencyV2Migrated');
        localStorage.removeItem('unifiedPatientStoreDone_v1');
        localStorage.removeItem('competencyEnhancementsDone_v2');
        localStorage.removeItem('competencyEnhancementsDone_v3');
        localStorage.removeItem('leadingZeroDedupDone_v2');
        localStorage.removeItem('perioNoiseCleanupDone_v1');
        expandedCompCategories.clear();
        clinicalDataDirty = true;
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        // Force immediate push to Firebase (not debounced) to prevent merge race condition
        // where realtime listener re-introduces old competency data before save completes
        if (typeof forceUploadToCloud === 'function') {
            forceUploadToCloud();
        } else {
            saveData();
        }
        renderCompetencies();
        showToast('Competencies reset to defaults and synced to cloud');
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
    document.getElementById('compItemModal').onclick = function(e) { if (e.target === this) closeCompItemModal(); };
}

function openEditCompItemModal(catKey, itemId) {
    const competencies = getCompetenciesData();
    const cat = competencies[catKey];
    if (!cat) return;

    // Find the item and its section (using object-based storage)
    let foundItem = null;
    let foundSectionId = null;
    for (const [secId, sec] of Object.entries(cat.sections)) {
        if (sec.items && sec.items[itemId]) {
            foundItem = sec.items[itemId];
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
    document.getElementById('compItemModal').onclick = function(e) { if (e.target === this) closeCompItemModal(); };
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
        const clampedCompleted = Math.max(0, Math.min(completed, required));
        const newItem = {
            id: newItemId,
            text: name,
            required: required,
            completed: clampedCompleted,
            note: notes || null,
            custom: true, // Mark as custom so it can be deleted
            lastVerified: null,
            status: clampedCompleted >= required ? 'completed' : (clampedCompleted > 0 ? 'in_progress' : 'pending'),
            d3Deadline: null,
            isSummative: false,
            rules: null
        };

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
                } else {
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

    showCustomConfirm('Delete "' + itemText + '"? This cannot be undone.', function() {
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

    return procedure;
}

function deleteProcedure(procId) {
    if (!roadmapData.clinicalData?.completedProcedures?.[procId]) return;

    showCustomConfirm('Delete this procedure record?', function() {
        // CIS v2: Delegate to cascade function
        clinicalDataDirty = true;
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

    // Phase 2 REMOVED (V2): completionEntries is dead in V2 — competency counts are manual-only.
    // Old Phase 2 created synthetic completionEntries which polluted state with obsolete V1 data.

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

    // 2. Update patient lastVisit (unified store) — only move forward, never regress
    var patient = roadmapData.clinicalData.patientRecords?.[apt.patientId];
    if (patient) {
        var existingVisitDate = (patient.lastVisit || '').split('|')[0].trim();
        if (!existingVisitDate || existingVisitDate < apt.date) {
            patient.lastVisit = apt.date;
        }
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
        // V2: autoLinkProcedureToCompetencies removed — competency counts are manual-only
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
    clinicalDataDirty = true;
    cascadeUncompleteAppointment(aptId);
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderAppointmentsList();
    renderProceduresList();
    updateClinicalStats();
    showToast('Appointment unmarked');
    if (typeof dpSyncAppointmentsToTimeline === 'function') dpSyncAppointmentsToTimeline();
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

    // Fix #1: Check if a procedure record already exists for this appointment
    var existingProc = null;
    var procs = getValues(roadmapData.clinicalData?.completedProcedures);
    for (var i = 0; i < procs.length; i++) {
        if (procs[i].appointmentId === aptId) { existingProc = procs[i]; break; }
    }

    document.getElementById('procModalAptId').value = aptId;
    document.getElementById('procModalPatientId').value = apt.patientId || '';
    document.getElementById('procModalPatientName').textContent = patientName;
    document.getElementById('procModalDate').value = (existingProc?.date || apt.date) || getLocalDateString();
    document.getElementById('procModalProcedure').value = existingProc?.procedure || apt.procedures || '';
    document.getElementById('procModalTeeth').value = existingProc?.toothNumbers || '';
    document.getElementById('procModalGrade').value = existingProc?.grade || '';
    document.getElementById('procModalFaculty').value = existingProc?.faculty || '';
    document.getElementById('procModalNotes').value = existingProc?.notes || apt.notes || '';

    // Store existing procedure ID so saveProcedureRecord() updates instead of creating duplicate
    document.getElementById('procModalAptId').dataset.existingProcId = existingProc?.id || '';

    var typeSelect = document.getElementById('procModalType');
    typeSelect.innerHTML = Object.entries(PROCEDURE_TYPES).map(function(entry) {
        return '<option value="' + entry[0] + '">' + escapeHtml(entry[1]) + '</option>';
    }).join('');

    // Fix #9: Infer type from procedure text instead of defaulting to first option
    var inferredType = inferProcedureType(existingProc?.procedure || apt.procedures) || typeSelect.options[0]?.value || 'other';
    if (typeSelect.querySelector('option[value="' + inferredType + '"]')) {
        typeSelect.value = inferredType;
    }

    buildCompetencyChecklist(typeSelect.value);

    document.getElementById('procedureRecordingModal').style.display = 'flex';
}

function openStandaloneProcedureModal() {
    document.getElementById('procModalAptId').value = '';
    document.getElementById('procModalAptId').dataset.existingProcId = '';
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

    // Default to 'other' for standalone procedures (no appointment to infer from)
    if (typeSelect.querySelector('option[value="other"]')) {
        typeSelect.value = 'other';
    }
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

    // Fix #1: If a procedure already exists for this appointment, update it instead of creating a new one
    var existingProcId = document.getElementById('procModalAptId').dataset.existingProcId || '';

    recordProcedure({
        id: existingProcId || undefined,
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
        ? ' (' + competencyItemIds.length + ' competency item' + (competencyItemIds.length > 1 ? 's' : '') + ' tagged)'
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
        var safeId = proc.id.replace(/['"\\]/g, '');

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

