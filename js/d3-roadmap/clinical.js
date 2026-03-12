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
    renderPatientsList();
    renderAppointmentsList();
    updateClinicalStats();
    renderCompetencies();
}

function updateClinicalStats() {
    const patients = roadmapData.clinicalData?.patients || {};
    const appointments = getValues(roadmapData.clinicalData?.appointments);
    const procedures = getValues(roadmapData.clinicalData?.completedProcedures);

    // Count active patients
    const activePatients = Object.values(patients).filter(p => p.status === 'active').length;
    document.getElementById('clinicalStatPatients').textContent = activePatients;

    // Count this week's appointments
    const today = new Date();
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

// ===== PATIENT MANAGEMENT =====

function renderPatientsList() {
    const container = document.getElementById('patientsList');
    const patients = roadmapData.clinicalData?.patients || {};
    const patientArray = Object.values(patients);

    // Get filter values
    const searchTerm = document.getElementById('patientSearchInput')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('patientFilterStatus')?.value || 'all';

    // Filter patients
    let filtered = patientArray;
    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.name?.toLowerCase().includes(searchTerm) ||
            p.chartNumber?.toLowerCase().includes(searchTerm)
        );
    }
    if (statusFilter === 'active') {
        filtered = filtered.filter(p => p.status === 'active');
    } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(p => p.status !== 'active');
    } else if (statusFilter === 'needsAttention') {
        filtered = filtered.filter(p => p.needsXrays || p.recallDue);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #94a3b8;">
                <div style="font-size: 3em; margin-bottom: 10px;">👤</div>
                <p>${patientArray.length === 0 ? 'No patients yet. Click "Add Patient" to get started.' : 'No patients match your filters.'}</p>
            </div>
        `;
        return;
    }

    // Sort by name
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    container.innerHTML = filtered.map(patient => {
        const needsAttention = patient.needsXrays || patient.recallDue;
        const tasks = patient.outstandingTasks || [];
        const incompleteTasks = tasks.filter(t => t.status !== 'completed');

        // Build flags HTML
        let flagsHtml = '';
        if (patient.needsXrays) {
            flagsHtml += `<span class="patient-flag xray">📷 ${patient.xrayType || 'X-rays'} needed</span>`;
        }
        if (patient.recallDue) {
            const recallDate = parseLocalDate(patient.recallDue);
            const isOverdue = recallDate && recallDate < new Date();
            flagsHtml += `<span class="patient-flag recall">${isOverdue ? '⚠️ Recall OVERDUE' : '🔔 Recall due'}</span>`;
        }
        if (patient.perioStatus && patient.perioStatus !== 'healthy') {
            flagsHtml += `<span class="patient-flag perio">🦷 ${patient.perioStatus}</span>`;
        }

        // Build tasks HTML
        let tasksHtml = '';
        if (incompleteTasks.length > 0) {
            tasksHtml = `
                <div class="patient-tasks">
                    <strong style="font-size: 0.85em; color: #94a3b8;">Outstanding (${incompleteTasks.length}):</strong>
                    ${incompleteTasks.slice(0, 3).map(t => `
                        <div class="patient-task-item">
                            <span>○</span> ${escapeHtml(t.procedure)}
                        </div>
                    `).join('')}
                    ${incompleteTasks.length > 3 ? `<div style="font-size: 0.8em; color: #94a3b8;">+${incompleteTasks.length - 3} more...</div>` : ''}
                </div>
            `;
        }

        return `
            <div class="patient-card ${needsAttention ? 'needs-attention' : ''}" data-patient-id="${patient.id}">
                <div class="patient-card-header">
                    <div>
                        <div class="patient-name">${escapeHtml(patient.name)}</div>
                        <div class="patient-chart">Chart: ${patient.chartNumber || 'N/A'} | ${patient.asaClass || 'ASA I'}</div>
                    </div>
                    <span class="patient-status-badge ${patient.status}">${patient.status}</span>
                </div>
                ${flagsHtml ? `<div class="patient-flags">${flagsHtml}</div>` : ''}
                ${patient.medicalAlerts ? `<div style="font-size: 0.85em; color: #ef4444; margin: 5px 0;">⚠️ ${escapeHtml(patient.medicalAlerts)}</div>` : ''}
                ${tasksHtml}
                <div class="patient-actions">
                    <button class="patient-action-btn primary" onclick="openAddAppointmentModal('${patient.id}')">📅 Schedule Apt</button>
                    <button class="patient-action-btn secondary" onclick="editPatient('${patient.id}')">✏️ Edit</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterPatients() {
    renderPatientsList();
}

function openAddPatientModal() {
    document.getElementById('patientModalTitle').textContent = '➕ Add Patient';
    document.getElementById('patientModalId').value = '';
    document.getElementById('patientModalName').value = '';
    document.getElementById('patientModalChart').value = '';
    document.getElementById('patientModalASA').value = 'ASA I';
    document.getElementById('patientModalPerio').value = 'healthy';
    document.getElementById('patientModalStatus').value = 'active';
    document.getElementById('patientModalNeedsXrays').checked = false;
    document.getElementById('patientModalXrayType').value = '';
    document.getElementById('patientModalRecallDue').checked = false;
    document.getElementById('patientModalRecallDate').value = '';
    document.getElementById('patientModalMedical').value = '';
    document.getElementById('patientModalNotes').value = '';
    document.getElementById('patientDeleteBtn').style.display = 'none';

    currentPatientTasks = [];
    renderPatientTasksInModal();

    document.getElementById('patientModal').style.display = 'flex';
}

function editPatient(patientId) {
    const patient = roadmapData.clinicalData?.patients?.[patientId];
    if (!patient) return;

    document.getElementById('patientModalTitle').textContent = '✏️ Edit Patient';
    document.getElementById('patientModalId').value = patientId;
    document.getElementById('patientModalName').value = patient.name || '';
    document.getElementById('patientModalChart').value = patient.chartNumber || '';
    document.getElementById('patientModalASA').value = patient.asaClass || 'ASA I';
    document.getElementById('patientModalPerio').value = patient.perioStatus || 'healthy';
    document.getElementById('patientModalStatus').value = patient.status || 'active';
    document.getElementById('patientModalNeedsXrays').checked = patient.needsXrays || false;
    document.getElementById('patientModalXrayType').value = patient.xrayType || '';
    document.getElementById('patientModalRecallDue').checked = !!patient.recallDue;
    document.getElementById('patientModalRecallDate').value = patient.recallDue || '';
    document.getElementById('patientModalMedical').value = patient.medicalAlerts || '';
    document.getElementById('patientModalNotes').value = patient.notes || '';
    document.getElementById('patientDeleteBtn').style.display = 'inline-block';

    currentPatientTasks = JSON.parse(JSON.stringify(patient.outstandingTasks || []));
    renderPatientTasksInModal();

    document.getElementById('patientModal').style.display = 'flex';
}

function closePatientModal() {
    document.getElementById('patientModal').style.display = 'none';
    currentPatientTasks = [];
}

function addPatientTask() {
    currentPatientTasks.push({
        id: 'task-' + Date.now(),
        procedure: '',
        status: 'planned'
    });
    renderPatientTasksInModal();
}

function removePatientTask(taskId) {
    const index = currentPatientTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        currentPatientTasks.splice(index, 1);
        renderPatientTasksInModal();
    }
}

function updatePatientTask(taskId, field, value) {
    const task = currentPatientTasks.find(t => t.id === taskId);
    if (task) {
        task[field] = value;
    }
}

function renderPatientTasksInModal() {
    const container = document.getElementById('patientTasksList');
    if (currentPatientTasks.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.85em; margin: 0;">No tasks yet. Click "+ Add" to add procedures.</p>';
        return;
    }

    container.innerHTML = currentPatientTasks.map((task) => `
        <div class="patient-task-row" data-task-id="${task.id}">
            <input type="text" value="${escapeHtml(task.procedure)}"
                   placeholder="e.g., MOD Composite #30"
                   onchange="updatePatientTask('${task.id}', 'procedure', this.value)">
            <select onchange="updatePatientTask('${task.id}', 'status', this.value)">
                <option value="planned" ${task.status === 'planned' ? 'selected' : ''}>Planned</option>
                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
            <button onclick="removePatientTask('${task.id}')">✕</button>
        </div>
    `).join('');
}

function savePatient() {
    const name = document.getElementById('patientModalName').value.trim();
    if (!name) {
        showToast('Patient name is required', 'error');
        return;
    }

    const patientId = document.getElementById('patientModalId').value || 'pt-' + Date.now();

    // Sync task inputs before saving (by task ID, not index)
    document.querySelectorAll('#patientTasksList .patient-task-row').forEach((row) => {
        const taskId = row.dataset.taskId;
        const input = row.querySelector('input');
        const select = row.querySelector('select');
        const task = currentPatientTasks.find(t => t.id === taskId);
        if (task) {
            task.procedure = input.value;
            task.status = select.value;
        }
    });

    // Filter out empty tasks
    const tasks = currentPatientTasks.filter(t => t.procedure.trim());

    const patient = {
        id: patientId,
        name: name,
        chartNumber: document.getElementById('patientModalChart').value.trim(),
        asaClass: document.getElementById('patientModalASA').value,
        perioStatus: document.getElementById('patientModalPerio').value,
        status: document.getElementById('patientModalStatus').value,
        needsXrays: document.getElementById('patientModalNeedsXrays').checked,
        xrayType: document.getElementById('patientModalXrayType').value,
        recallDue: document.getElementById('patientModalRecallDue').checked ? document.getElementById('patientModalRecallDate').value : null,
        medicalAlerts: document.getElementById('patientModalMedical').value.trim(),
        notes: document.getElementById('patientModalNotes').value.trim(),
        outstandingTasks: tasks,
        lastUpdated: new Date().toISOString()
    };

    if (!roadmapData.clinicalData) roadmapData.clinicalData = { patients: {}, appointments: {}, completedProcedures: {} };
    if (!roadmapData.clinicalData.patients) roadmapData.clinicalData.patients = {};

    roadmapData.clinicalData.patients[patientId] = patient;

    saveData();
    closePatientModal();
    renderPatientsList();
    updateClinicalStats();
    renderDashboard(); // Update dashboard clinical widget
    showToast('Patient saved!');
}

function deletePatient() {
    const patientId = document.getElementById('patientModalId').value;
    if (!patientId) return;

    showCustomConfirm('Are you sure you want to delete this patient? This cannot be undone.', function() {
        delete roadmapData.clinicalData.patients[patientId];

        // Also remove any appointments for this patient
        if (roadmapData.clinicalData.appointments) {
            Object.keys(roadmapData.clinicalData.appointments).forEach(id => {
                if (roadmapData.clinicalData.appointments[id]?.patientId === patientId) {
                    delete roadmapData.clinicalData.appointments[id];
                }
            });
        }

        saveData();
        closePatientModal();
        renderPatientsList();
        renderAppointmentsList();
        updateClinicalStats();
        renderDashboard();
        showToast('Patient deleted');
    }, null, 'Delete Patient');
}

// ===== APPOINTMENT MANAGEMENT =====

function renderAppointmentsList() {
    const container = document.getElementById('appointmentsList');
    const appointments = getValues(roadmapData.clinicalData?.appointments);
    const patients = roadmapData.clinicalData?.patients || {};

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

    return `
        <div class="appointment-card" onclick="editAppointment('${apt.id}')">
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
            <span class="appointment-status ${status}">${statusLabel}</span>
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
    // Populate patient dropdown
    const patients = roadmapData.clinicalData?.patients || {};
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

    // Populate patient dropdown
    const patients = roadmapData.clinicalData?.patients || {};
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

    const apt = {
        id: aptId,
        patientId: patientId,
        date: date,
        time: document.getElementById('appointmentModalTime').value,
        duration: parseInt(document.getElementById('appointmentModalDuration').value) || 180,
        chair: document.getElementById('appointmentModalChair').value.trim(),
        procedures: document.getElementById('appointmentModalProcedures').value.trim(),
        notes: document.getElementById('appointmentModalNotes').value.trim(),
        status: 'scheduled',
        createdAt: new Date().toISOString()
    };

    if (!roadmapData.clinicalData) roadmapData.clinicalData = { patients: {}, appointments: {}, completedProcedures: {} };
    if (!roadmapData.clinicalData.appointments) roadmapData.clinicalData.appointments = {};

    // Update or add
    if (!roadmapData.clinicalData.appointments || Array.isArray(roadmapData.clinicalData.appointments)) {
        roadmapData.clinicalData.appointments = migrateArrayToObject(roadmapData.clinicalData.appointments, 'appt');
    }
    if (roadmapData.clinicalData.appointments[aptId]) {
        apt.status = roadmapData.clinicalData.appointments[aptId].status; // Preserve status
        roadmapData.clinicalData.appointments[aptId] = apt;
    } else {
        roadmapData.clinicalData.appointments[aptId] = apt;
    }

    // Create deadline if requested
    if (isNew && document.getElementById('appointmentModalCreateDeadline').checked) {
        const patient = roadmapData.clinicalData.patients[patientId];
        const patientName = patient?.name || 'Patient';

        // Add to custom deadlines
        if (!roadmapData.customDeadlines || Array.isArray(roadmapData.customDeadlines)) {
            roadmapData.customDeadlines = migrateArrayToObject(roadmapData.customDeadlines, 'deadline');
        }
        const clinicalDeadlineId = generateId('deadline');
        roadmapData.customDeadlines[clinicalDeadlineId] = {
            id: clinicalDeadlineId,
            date: date,
            what: `🏥 ${patientName} - ${apt.procedures || 'Clinic Apt'}`,
            course: 'Clinical',
            weight: '—',
            type: 'Clinical',
            done: false,
            grade: null,
            clinicalAptId: aptId
        };
    }

    // CRITICAL: Sync to Monthly Planner
    syncClinicalToMonthlyPlanner();

    saveData();
    closeAppointmentModal();
    renderAppointmentsList();
    updateClinicalStats();
    renderDeadlines();
    renderDashboard();

    // Refresh Monthly Planner if initialized
    if (typeof mpRenderAllCalendars === 'function') {
        extendWeeksIfNeeded();
        mpRenderAllCalendars();
    }

    showToast('Appointment saved!');
}

function deleteAppointment() {
    const aptId = document.getElementById('appointmentModalId').value;
    if (!aptId) return;

    showCustomConfirm('Delete this appointment?', function() {
        if (roadmapData.clinicalData.appointments && roadmapData.clinicalData.appointments[aptId]) {
            delete roadmapData.clinicalData.appointments[aptId];
        }

        // Also remove linked deadline if exists
        if (roadmapData.customDeadlines) {
            Object.keys(roadmapData.customDeadlines).forEach(id => {
                if (roadmapData.customDeadlines[id]?.clinicalAptId === aptId) {
                    delete roadmapData.customDeadlines[id];
                }
            });
        }

        // CRITICAL: Sync to Monthly Planner
        syncClinicalToMonthlyPlanner();

        saveData();
        closeAppointmentModal();

        // Refresh Monthly Planner if initialized
        if (typeof mpRenderAllCalendars === 'function') {
            mpRenderAllCalendars();
        }
        renderAppointmentsList();
        updateClinicalStats();
        renderDeadlines();
        renderDashboard();
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
        summary: { completed: 0, inProgress: 0, planned: 2, required: 10, unit: 'units' },
        notes: '2 planned (unreliable). Must include 1 FPD, 1 Implant Crown, 3 CEREC restorations.',
        sections: [
            { title: 'Fixed Formatives (to qualify for summatives)', items: [
                { id: 'fixed-form-prov', text: '6 Provisional Restoration', required: 6, completed: 0 },
                { id: 'fixed-form-prep', text: '6 Tooth Preparation', required: 6, completed: 0 },
                { id: 'fixed-form-impr', text: '6 Final Impression', required: 6, completed: 0 },
                { id: 'fixed-form-cement', text: '6 Cementation', required: 6, completed: 0 }
            ]},
            { title: 'Fixed Summatives', items: [
                { id: 'fixed-sum-prep', text: '2 Prep (Tooth Preparation)', required: 2, completed: 0 },
                { id: 'fixed-sum-temp', text: '2 Temp (Provisional Restoration)', required: 2, completed: 0 },
                { id: 'fixed-sum-impr', text: '2 Final Impression', required: 2, completed: 0 },
                { id: 'fixed-sum-cement', text: '2 Cementation', required: 2, completed: 0 }
            ]},
            { title: 'Other Requirements', items: [
                { id: 'fixed-occlusal-cr', text: 'Occlusal Analysis (Centric Relation)', required: 1, completed: 0 },
                { id: 'fixed-occlusal-mi', text: 'Occlusal Analysis (Maximum Intercuspation)', required: 1, completed: 0 },
                { id: 'fixed-mock', text: 'Mock Board', required: 1, completed: 0 },
                { id: 'fixed-sim-1', text: 'Fixed Simulation #1 (with Dr. Ferriero)', required: 1, completed: 0 },
                { id: 'fixed-sim-2', text: 'Fixed Simulation #2 (with Dr. Ferriero)', required: 1, completed: 0 },
                { id: 'fixed-sim-fpd', text: 'Simulation: 3-unit Prep and Temp of FPD', required: 1, completed: 0 },
                { id: 'fixed-case-pres', text: 'Case Presentation (on 2 completed units)', required: 1, completed: 0 }
            ]}
        ]
    },
    operative: {
        name: 'Operative',
        icon: '🔧',
        color: '#10b981',
        summary: { completed: 4, inProgress: 0, planned: 7, required: 8, unit: 'summatives' },
        notes: '20 formative surfaces completed. 4 summatives done (2x DO composite). NEED CLASS 5 formatives/summatives. Grade: 86% on first DO.',
        sections: [
            { title: 'Summative Requirements (8 total)', items: [
                { id: 'op-class5-1', text: 'Class V Composite Summative #1', required: 1, completed: 0 },
                { id: 'op-class5-2', text: 'Class V Composite Summative #2', required: 1, completed: 0 },
                { id: 'op-multi-1', text: 'Multisurface #1 (DO composite)', required: 1, completed: 1, note: '86% grade' },
                { id: 'op-multi-2', text: 'Multisurface #2 (DO composite)', required: 1, completed: 1, note: 'Awaiting grade' },
                { id: 'op-multi-3', text: 'Multisurface #3', required: 1, completed: 1 },
                { id: 'op-multi-4', text: 'Multisurface #4', required: 1, completed: 1 },
                { id: 'op-multi-5', text: 'Multisurface #5', required: 1, completed: 0 },
                { id: 'op-multi-6', text: 'Multisurface #6', required: 1, completed: 0 }
            ]},
            { title: 'Other Requirements', items: [
                { id: 'op-formatives', text: 'Complete 20 formative surfaces', required: 20, completed: 20 },
                { id: 'op-approval', text: 'Approval from Dr. McManama', required: 1, completed: 0 },
                { id: 'op-assignment', text: 'Operative assignment/survey (Blackboard)', required: 1, completed: 0 },
                { id: 'op-license', text: 'Licensing Exam Prep (Dr. Robinson)', required: 1, completed: 0 }
            ]}
        ]
    },
    dentures: {
        name: 'Complete Dentures',
        icon: '🦴',
        color: '#8b5cf6',
        summary: { completed: 0, inProgress: 2, planned: 2, required: 4, unit: 'arches' },
        notes: 'In-progress: 2 arches interim CU/CL. Planned: 2 arches definitive CU/CL.',
        sections: [
            { title: 'Complete Denture Formatives', items: [
                { id: 'cd-form-prelim', text: '2 arches: Preliminary Impressions', required: 2, completed: 0 },
                { id: 'cd-form-final', text: '2 arches: Final Impression', required: 2, completed: 0 },
                { id: 'cd-form-records', text: '1 case: Inter-maxillary records', required: 1, completed: 0 },
                { id: 'cd-form-postdam', text: '1 case: Post Dam Technique', required: 1, completed: 0 },
                { id: 'cd-form-trial', text: '2 arches: Trial Denture (Tooth Try-In)', required: 2, completed: 0 },
                { id: 'cd-form-insert', text: '2 arches: Insertion / Clinical Remount', required: 2, completed: 0 },
                { id: 'cd-form-adjust', text: '2 arches: Adjustment', required: 2, completed: 0 }
            ]},
            { title: 'Complete Denture Summatives', items: [
                { id: 'cd-sum-prelim', text: 'Preliminary Impressions (Edentulous)', required: 1, completed: 0 },
                { id: 'cd-sum-final', text: 'Final Impression (Edentulous)', required: 1, completed: 0 },
                { id: 'cd-sum-records', text: 'Inter-maxillary records (Edentulous)', required: 1, completed: 0 },
                { id: 'cd-sum-postdam', text: 'Post-Dam Technique', required: 1, completed: 0 },
                { id: 'cd-sum-trial', text: 'Trial Denture (Edentulous)', required: 1, completed: 0 },
                { id: 'cd-sum-insert', text: 'Insertion / Clinical Remount (Edentulous)', required: 1, completed: 0 },
                { id: 'cd-sum-adjust', text: 'Adjustment (Edentulous)', required: 1, completed: 0 }
            ]},
            { title: 'Overdenture Experience (complete one)', items: [
                { id: 'cd-over-dup', text: 'Duplicate denture and implant planning through surgery', required: 1, completed: 0 },
                { id: 'cd-over-abut', text: 'Abutment selection, placement & activation', required: 1, completed: 0 }
            ]}
        ]
    },
    rpd: {
        name: 'RPDs',
        icon: '🔩',
        color: '#f59e0b',
        summary: { completed: 0, inProgress: 0, planned: 0, required: 1, unit: 'track' },
        notes: 'NEED RPDs - Must complete one track.',
        sections: [
            { title: 'Clinical Experience Tracks (choose one)', items: [
                { id: 'rpd-track1', text: 'Track 1: 1 cast metal partial denture', required: 1, completed: 0 },
                { id: 'rpd-track2', text: 'Track 2: 2 flexible RPDs + OSCE', required: 1, completed: 0 },
                { id: 'rpd-track3', text: 'Track 3: 4 interim/resin base RPDs + OSCE', required: 1, completed: 0 }
            ]},
            { title: 'Formatives & Summatives', items: [
                { id: 'rpd-form-abut', text: 'Formative: Abutment preparations (mounted casts)', required: 1, completed: 0 },
                { id: 'rpd-sum-abut', text: 'Summative: Abutment Preparations (Intra-Oral)', required: 1, completed: 0 }
            ]}
        ]
    },
    srp: {
        name: 'SRPs',
        icon: '🩺',
        color: '#ef4444',
        summary: { completed: 0, inProgress: 0, planned: 1, required: 4, unit: 'summatives' },
        notes: '1 planned (unreliable) UL 1-3 teeth.',
        sections: [
            { title: 'Periodontology Summatives', items: [
                { id: 'srp-calc-1', text: 'Calculus Removal Summative #1', required: 1, completed: 0, status: 'planned' },
                { id: 'srp-calc-2', text: 'Calculus Removal Summative #2', required: 1, completed: 0 },
                { id: 'srp-calc-3', text: 'Calculus Removal Summative #3', required: 1, completed: 0 },
                { id: 'srp-reeval', text: 'Re-evaluate (SRP) Summative', required: 1, completed: 0 }
            ]}
        ]
    },
    endo: {
        name: 'Endodontics',
        icon: '🔬',
        color: '#06b6d4',
        summary: { completed: 0, inProgress: 0, planned: 0, required: 2, unit: 'RCTs' },
        notes: '0 completed, 0 planned.',
        sections: [
            { title: 'Requirements', items: [
                { id: 'endo-rct-1', text: 'Root Canal Treatment #1 (on patient)', required: 1, completed: 0 },
                { id: 'endo-rct-2', text: 'Root Canal Treatment #2 (on patient)', required: 1, completed: 0 },
                { id: 'endo-pulp-1', text: 'Pulpectomy Summative #1', required: 1, completed: 0 },
                { id: 'endo-pulp-2', text: 'Pulpectomy Summative #2', required: 1, completed: 0 },
                { id: 'endo-postdoc', text: 'Post-doc Endo Assist', required: 1, completed: 0 },
                { id: 'endo-predoc', text: 'Pre-doc Endo Assist', required: 1, completed: 0 },
                { id: 'endo-mock', text: 'Passed Mock Board on manikin', required: 1, completed: 0 }
            ]}
        ]
    },
    oralsurg: {
        name: 'Oral Surgery',
        icon: '🏥',
        color: '#ec4899',
        summary: { completed: 4, inProgress: 0, planned: 0, required: 16, unit: 'items' },
        notes: '',
        sections: [
            { title: '3rd Year Requirements', items: [
                { id: 'os-3rd-rotation', text: 'Participate in 3rd Year Oral Surgery Rotation', required: 1, completed: 1 },
                { id: 'os-3rd-consult', text: 'Summative: Management of Patient having OS Consult', required: 1, completed: 1 },
                { id: 'os-3rd-nerve', text: 'Summative: Administration of IA and Long Buccal Block', required: 1, completed: 1 },
                { id: 'os-3rd-suture', text: 'Summative: Participation in Suturing Workshop', required: 1, completed: 1 }
            ]},
            { title: '4th Year Requirements', items: [
                { id: 'os-4th-rotation', text: 'Complete 2-week scheduled rotation', required: 1, completed: 0 },
                { id: 'os-4th-present', text: 'Presentation at morning seminar', required: 1, completed: 0 },
                { id: 'os-4th-oral', text: 'Oral examination (end of rotation)', required: 1, completed: 0 },
                { id: 'os-4th-rx', text: 'Take-home prescription writing exercise', required: 1, completed: 0 },
                { id: 'os-4th-mcq', text: 'MCQ quiz (Med Emergency, Nitrous, Instrument ID)', required: 1, completed: 0 },
                { id: 'os-4th-sim', text: 'Medical Simulation Lab at BMC', required: 1, completed: 0 },
                { id: 'os-4th-nitrous', text: 'Nitrous-Oxide Oxygen Sedation Hands-On training', required: 1, completed: 0 }
            ]},
            { title: 'Clinical Summatives', items: [
                { id: 'os-extract-1', text: 'Extraction on patient #1', required: 1, completed: 0 },
                { id: 'os-extract-2', text: 'Extraction on patient #2', required: 1, completed: 0 }
            ]}
        ]
    },
    peds: {
        name: 'Pediatric Dentistry',
        icon: '👶',
        color: '#84cc16',
        summary: { completed: 0, inProgress: 0, planned: 0, required: 7, unit: 'items' },
        notes: '',
        sections: [
            { title: 'Course & Rotations', items: [
                { id: 'peds-course', text: 'Successful completion of PD 530 course', required: 1, completed: 0 },
                { id: 'peds-rotation', text: 'Rotations in Peds (including Franciscan Hospital)', required: 1, completed: 0 },
                { id: 'peds-assessment', text: 'Post-rotation assessment', required: 1, completed: 0 }
            ]},
            { title: 'Clinical Summatives (log sheet)', items: [
                { id: 'peds-recall', text: '3 New Patient/Recall', required: 3, completed: 0 },
                { id: 'peds-sealants', text: '3 Sealants', required: 3, completed: 0 },
                { id: 'peds-restore', text: '3 Restorative procedures', required: 3, completed: 0 }
            ]}
        ]
    },
    perio: {
        name: 'Periodontology',
        icon: '🦠',
        color: '#f472b6',
        summary: { completed: 12, inProgress: 1, planned: 0, required: 37, unit: 'items' },
        notes: '',
        sections: [
            { title: 'Surgical', items: [
                { id: 'perio-surg-assist', text: '7 Surgical Assist (total 3rd/4th yr, max 1 implant uncovering)', required: 7, completed: 0 }
            ]},
            { title: '3rd Year Specific Summatives', items: [
                { id: 'perio-3rd-ohi', text: 'Oral hygiene instructions (by Oct 1)', required: 1, completed: 1 },
                { id: 'perio-3rd-prophy', text: 'Scaling and Prophy (by May 2026)', required: 1, completed: 1, note: '100% - Need SRP summative' },
                { id: 'perio-3rd-reeval', text: 'Re-eval Gingivitis (by May 2026)', required: 1, completed: 0 }
            ]},
            { title: 'Total Formatives (3rd & 4th Year)', items: [
                { id: 'perio-form-ohi', text: '2 Oral Hygiene (1 zoom, 1 in person)', required: 2, completed: 2 },
                { id: 'perio-form-dx', text: '4 Diagnosis & Treatment Plan', required: 4, completed: 4 },
                { id: 'perio-form-prophy', text: '5 Prophy', required: 5, completed: 5 },
                { id: 'perio-form-quad', text: '3 Quad (SRP)', required: 3, completed: 1, note: 'UL quadrant' },
                { id: 'perio-form-reeval-ging', text: '3 Re-evaluate Gingivitis', required: 3, completed: 0 },
                { id: 'perio-form-reeval-srp', text: '1 Re-evaluate (SRP)', required: 1, completed: 0 },
                { id: 'perio-form-impr', text: '3 Re-evaluate Impression', required: 3, completed: 0 },
                { id: 'perio-form-recall', text: '6 Recall', required: 6, completed: 5 }
            ]},
            { title: 'Total Summatives (3rd & 4th Year)', items: [
                { id: 'perio-sum-hci', text: '1 Home Care Instruction', required: 1, completed: 1 },
                { id: 'perio-sum-dx', text: '2 Diagnosis & Treatment Plan (Type 2)', required: 2, completed: 0 },
                { id: 'perio-sum-prophy', text: '3 Prophy (total)', required: 3, completed: 1, note: '100% score' },
                { id: 'perio-sum-calc', text: '3 Calculus removal', required: 3, completed: 0 },
                { id: 'perio-sum-reeval-ging', text: '2 Re-evaluate (Gingivitis)', required: 2, completed: 0 },
                { id: 'perio-sum-reeval-srp', text: '1 Re-evaluate (SRP)', required: 1, completed: 0 },
                { id: 'perio-sum-impr', text: '1 Re-evaluate (Impression)', required: 1, completed: 0 },
                { id: 'perio-sum-recall', text: '2 Recall', required: 2, completed: 0 },
                { id: 'perio-sum-mock', text: '1 Mock Board', required: 1, completed: 0 }
            ]}
        ]
    },
    grouppractice: {
        name: 'Group Practice (GD 640 & GD 642)',
        icon: '👥',
        color: '#0ea5e9',
        summary: { completed: 6, inProgress: 1, planned: 0, required: 9, unit: 'items' },
        notes: '',
        sections: [
            { title: '3rd Year (GD 640)', items: [
                { id: 'gp-attend', text: 'Clinical Attendance (4 per week)', required: 1, completed: 1 },
                { id: 'gp-form-review', text: '1 Formative Periodic Review', required: 1, completed: 1 },
                { id: 'gp-sum-review', text: '1 Summative Periodic Review', required: 1, completed: 0 },
                { id: 'gp-form-analysis', text: '2 Formative Written Analyses', required: 2, completed: 1, note: '1 completed, 1 in progress' },
                { id: 'gp-sum-analysis', text: '1 Summative Written Analysis', required: 1, completed: 0 },
                { id: 'gp-comm', text: 'Communication Workshop', required: 1, completed: 1 },
                { id: 'gp-leader', text: 'Leadership Workshop', required: 1, completed: 0 },
                { id: 'gp-case', text: 'Case Presentation at Group Monthly meeting', required: 1, completed: 1 },
                { id: 'gp-pms-3rd', text: 'Practice Management Scenarios (1 formative + 4 summative, cumulative)', required: 1, completed: 0, note: '', status: 'pending' }
            ]},
            { title: '4th Year (GD 642) Summatives', items: [
                { id: 'gp4-comm-txplan', text: '1 Communication Treatment Plan Presentation', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-periodicrev-1', text: '2 Periodic Reviews', required: 2, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-written-analysis', text: '4 Written Analyses', required: 4, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-pms', text: '4 Practice Management Scenarios (cumulative from 3rd+4th year)', required: 4, completed: 0, note: '', status: 'pending' }
            ]},
            { title: '4th Year Leadership Requirements', items: [
                { id: 'gp4-posttreat-eval', text: '3 Post Treatment Evaluations', required: 3, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-aux-tech', text: 'Auxiliary Team Assessment with Dental Technician - 1 formative', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-aux-asst', text: 'Auxiliary Team Assessment with Dental Assistant - 1 formative', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-aux-summatives', text: 'Auxiliary Team Summatives (Tech + Assistant combined)', required: 4, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-rounds-form', text: 'Leading Rounds - 1 formative', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'gp4-rounds-sum', text: 'Leading Rounds - 1 summative', required: 1, completed: 0, note: '', status: 'pending' }
            ]}
        ]
    },
    txplanning: {
        name: 'Treatment Planning (RS 545)',
        icon: '📋',
        color: '#6366f1',
        summary: { completed: 0, inProgress: 0, planned: 0, required: 7, unit: 'items' },
        notes: 'RS 545 Seminar presentation + Data Collection/Tx Planning Rotation',
        sections: [
            { title: 'Seminar Presentation (20% of grade)', items: [
                { id: 'tx-seminar-1', text: '1 Summative small group presentation - Type 2 case (by Apr 24, 2026)', required: 1, completed: 0, note: '', status: 'pending' }
            ]},
            { title: 'Seminar Attendance (80% of grade)', items: [
                { id: 'tx-attend-1', text: '2 Attend classmate seminar presentations (by Apr 23, 2027)', required: 2, completed: 0, note: '', status: 'pending' }
            ]},
            { title: 'Data Collection/Treatment Planning Rotation', items: [
                { id: 'tx-ohra-1', text: '2 OHRA Summatives', required: 2, completed: 0, note: '', status: 'pending' },
                { id: 'tx-caries-1', text: '2 Caries Detection Summatives', required: 2, completed: 0, note: '', status: 'pending' }
            ]}
        ]
    },
    geriatrics: {
        name: 'Geriatric Dental Medicine',
        icon: '👴',
        color: '#8b5cf6',
        summary: { completed: 0, inProgress: 0, planned: 0, required: 3, unit: 'items' },
        notes: 'DMD 27 must challenge didactic course Spring 2026, then complete rotation + assignment',
        sections: [
            { title: 'Requirements', items: [
                { id: 'geri-course', text: 'Successful completion of PH 541 Didactic Course', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'geri-rotation', text: 'Geriatric Dental Medicine Rotation', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'geri-assignment', text: 'Clinical Assignment (any GSDM patient or rotation/externship patient)', required: 1, completed: 0, note: '', status: 'pending' }
            ]}
        ]
    },
    externship: {
        name: 'Externship & SPS',
        icon: '🌴',
        color: '#059669',
        summary: { completed: 0, inProgress: 0, planned: 0, required: 3, unit: 'items' },
        notes: 'Complete during 10-week externship rotation',
        sections: [
            { title: 'Externship Requirements', items: [
                { id: 'ext-casepres', text: 'Case Presentation (Upload on BB + self-assessment + mock referral)', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'ext-outreach', text: 'Community Outreach Project', required: 1, completed: 0, note: '', status: 'pending' },
                { id: 'ext-spslog', text: 'SPS Log of all procedures + debriefing', required: 1, completed: 0, note: '', status: 'pending' }
            ]}
        ]
    }
};

function getCompetenciesData() {
    // Initialize if not exists
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
    return roadmapData.clinicalData.competencies;
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
let expandedCompCategories = new Set();

function renderCompetencies() {
    const container = document.getElementById('competenciesContainer');
    const dashboardContainer = document.getElementById('overallProgressSummary');
    if (!container) return;

    const competencies = getCompetenciesData();
    const stats = calculateOverallStats(competencies);
    const whatsNext = getWhatsNextItems(competencies);

    // Calculate progress ring values
    const circumference = 2 * Math.PI * 54; // radius = 54
    const dashOffset = circumference - (stats.overallPercent / 100) * circumference;

    // Render overall dashboard with progress ring
    dashboardContainer.innerHTML = `
        <div class="comp-overall-dashboard">
            <div class="comp-overall-stats">
                <div class="comp-stat-card">
                    <div class="comp-stat-value" style="color: #10b981;">${stats.completedItems}</div>
                    <div class="comp-stat-label">Completed</div>
                </div>
                <div class="comp-stat-card">
                    <div class="comp-stat-value" style="color: #fbbf24;">${stats.inProgressItems}</div>
                    <div class="comp-stat-label">In Progress</div>
                </div>
                <div class="comp-stat-card">
                    <div class="comp-stat-value" style="color: #60a5fa;">${stats.plannedItems}</div>
                    <div class="comp-stat-label">Planned</div>
                </div>
                <div class="comp-stat-card">
                    <div class="comp-stat-value" style="color: #94a3b8;">${stats.pendingItems}</div>
                    <div class="comp-stat-label">Not Started</div>
                </div>
            </div>
            <div class="comp-progress-ring-container">
                <div class="comp-progress-ring">
                    <svg width="140" height="140">
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:#10b981"/>
                                <stop offset="100%" style="stop-color:#34d399"/>
                            </linearGradient>
                        </defs>
                        <circle class="comp-progress-ring-bg" cx="70" cy="70" r="54"/>
                        <circle class="comp-progress-ring-fill" cx="70" cy="70" r="54"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${dashOffset}"/>
                    </svg>
                    <div class="comp-progress-ring-text">
                        <div class="comp-progress-ring-pct">${stats.overallPercent}%</div>
                        <div class="comp-progress-ring-label">Complete</div>
                    </div>
                </div>
                <div style="font-size: 0.8em; color: #94a3b8; margin-top: 8px;">
                    ${stats.completedUnits}/${stats.totalUnits} units
                </div>
            </div>
        </div>
    `;

    // Render each category
    let categoriesHtml = '';
    Object.entries(competencies).forEach(([key, cat]) => {
        const catStats = calculateCategoryStats(cat);
        const isExpanded = expandedCompCategories.has(key);
        const isComplete = catStats.percent === 100;

        categoriesHtml += `
            <div class="comp-category ${isComplete ? 'category-complete' : ''}" data-category="${key}">
                <div class="comp-category-header" onclick="toggleCompCategory('${key}')">
                    <div class="comp-category-title">
                        <span style="font-size: 1.2em;">${cat.icon}</span>
                        <h4 style="color: ${cat.color};">${cat.name}</h4>
                        ${isComplete ? '<span class="comp-category-badge">✓ Complete</span>' : ''}
                    </div>
                    <div class="comp-category-progress">
                        <div class="comp-progress-bar">
                            <div class="comp-progress-fill" style="width: ${catStats.percent}%; background: ${cat.color};"></div>
                        </div>
                        <span class="comp-progress-text">
                            <span class="comp-progress-pct">${catStats.percent}%</span>
                            <span style="color: #94a3b8; margin-left: 4px;">(${catStats.completedUnits}/${catStats.totalUnits})</span>
                        </span>
                        <span style="color: #94a3b8; font-size: 1.2em; transition: transform 0.2s;" id="compArrow-${key}">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                <div class="comp-category-body ${isExpanded ? 'expanded' : ''}" id="compBody-${key}">
                    <div class="comp-status-row">
                        <div class="comp-status-item">
                            <div class="comp-status-value" style="color: #10b981;">${catStats.completed}</div>
                            <div class="comp-status-label">Completed</div>
                        </div>
                        <div class="comp-status-item">
                            <div class="comp-status-value" style="color: #fbbf24;">${catStats.inProgress}</div>
                            <div class="comp-status-label">In Progress</div>
                        </div>
                        <div class="comp-status-item">
                            <div class="comp-status-value" style="color: #60a5fa;">${catStats.planned}</div>
                            <div class="comp-status-label">Planned</div>
                        </div>
                        <div class="comp-status-item">
                            <div class="comp-status-value" style="color: #94a3b8;">${catStats.pending}</div>
                            <div class="comp-status-label">Not Started</div>
                        </div>
                    </div>
                    ${cat.notes ? `<div style="background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; padding: 10px; margin-bottom: 12px; border-radius: 6px; font-size: 0.85em; color: #fde68a;">${escapeHtml(cat.notes)}</div>` : ''}
                    ${getValues(cat.sections).map(sec => `
                        <div class="comp-requirements-section" data-section-id="${sec.id}">
                            <div class="comp-requirements-title">${sec.title}</div>
                            ${getValues(sec.items).map(item => {
                                const status = getItemStatus(item);
                                const isCustom = item.custom === true;
                                return `
                                    <div class="comp-req-item status-${status}" data-item-id="${item.id}">
                                        <div class="comp-req-content">
                                            <div class="comp-req-text">${escapeHtml(item.text)}</div>
                                            ${item.note ? `<div class="comp-req-note">${escapeHtml(item.note)}</div>` : ''}
                                        </div>
                                        ${item.required > 1 ? `
                                            <div class="comp-req-counter">
                                                <button class="comp-counter-btn" onclick="adjustCompItem('${key}', '${item.id}', -1); event.stopPropagation();">−</button>
                                                <span class="comp-counter-value">${item.completed}/${item.required}</span>
                                                <button class="comp-counter-btn" onclick="adjustCompItem('${key}', '${item.id}', 1); event.stopPropagation();">+</button>
                                            </div>
                                        ` : `
                                            <div class="comp-status-toggle">
                                                <button class="comp-status-btn btn-planned ${status === 'planned' ? 'active' : ''}"
                                                    onclick="setCompItemStatus('${key}', '${item.id}', 'planned'); event.stopPropagation();">Plan</button>
                                                <button class="comp-status-btn btn-progress ${status === 'in_progress' ? 'active' : ''}"
                                                    onclick="setCompItemStatus('${key}', '${item.id}', 'in_progress'); event.stopPropagation();">WIP</button>
                                                <button class="comp-status-btn btn-done ${status === 'completed' ? 'active' : ''}"
                                                    onclick="setCompItemStatus('${key}', '${item.id}', 'completed'); event.stopPropagation();">Done</button>
                                            </div>
                                        `}
                                        <div class="comp-item-actions">
                                            <button class="comp-edit-btn" onclick="openEditCompItemModal('${key}', '${item.id}'); event.stopPropagation();" title="Edit">✏️</button>
                                            ${isCustom ? `<button class="comp-delete-btn" onclick="deleteCompItem('${key}', '${item.id}'); event.stopPropagation();" title="Delete">🗑️</button>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                            <button class="comp-add-req-btn" onclick="openAddCompItemModal('${key}', '${sec.id}'); event.stopPropagation();">
                                ➕ Add Requirement
                            </button>
                        </div>
                    `).join('')}
                    <div style="margin-top: 15px;">
                        <label style="font-size: 0.85em; color: #94a3b8;">Category Notes:</label>
                        <textarea class="comp-notes-input" rows="2" placeholder="Add notes for ${cat.name}..."
                            onchange="updateCompNotes('${key}', this.value)">${escapeHtml(cat.notes || '')}</textarea>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = categoriesHtml;
}

function toggleCompCategory(key) {
    const body = document.getElementById(`compBody-${key}`);
    const arrow = document.getElementById(`compArrow-${key}`);
    if (!body) return;

    const isExpanded = body.classList.contains('expanded');

    if (isExpanded) {
        body.classList.remove('expanded');
        arrow.textContent = '▶';
        expandedCompCategories.delete(key);
    } else {
        body.classList.add('expanded');
        arrow.textContent = '▼';
        expandedCompCategories.add(key);
    }
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
                item.status = 'pending';
                item.completed = 0;
            } else {
                item.status = newStatus;
                // Set completed count based on status
                if (newStatus === 'completed') {
                    item.completed = item.required;
                } else if (newStatus === 'in_progress' && item.completed === 0) {
                    // Keep completed at 0 for in_progress but set status
                } else if (newStatus === 'pending') {
                    item.completed = 0;
                }
            }

            isNowCompleted = item.completed >= item.required;
            break;
        }
    }

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

    saveData();
    renderCompetencies();

    // Show milestone toast if just completed
    if (!wasCompleted && isNowCompleted) {
        showCompMilestone(itemText);
    }
}

function updateCompNotes(catKey, notes) {
    const competencies = getCompetenciesData();
    if (competencies[catKey]) {
        competencies[catKey].notes = notes;
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
            saveData();
            renderCompetencies();
            showToast(`Deleted: ${itemText}`);
        }
    }, null, 'Delete Item');
}
