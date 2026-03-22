// import-system.js — Lecture import, clinical import, cross-tab sync

// ==================== IMPORT SYSTEM ====================

// Temporary storage for parsed import data
let parsedLectures = [];
let parsedAppointments = [];

// ========== LECTURE IMPORT ==========

function openLectureImportModal() {
    document.getElementById('lectureImportModal').style.display = 'flex';
    document.getElementById('lectureImportText').value = '';
    document.getElementById('lectureImportPreview').style.display = 'none';
    document.getElementById('lectureImportBtn').disabled = true;
    parsedLectures = [];
}

function closeLectureImportModal() {
    document.getElementById('lectureImportModal').style.display = 'none';
}

function parseLectureFormat(text) {
    const lectures = [];

    // Check if text uses --- separators or not
    if (text.includes('---')) {
        // Original format with separators
        const blocks = text.split('---').filter(b => b.trim());
        blocks.forEach(block => {
            if (block.toUpperCase().includes('LECTURES') && !block.includes('DATE')) return;
            const lecture = parseLectureBlock(block);
            if (lecture) lectures.push(lecture);
        });
    } else {
        // Flexible format: split by DATE: to detect new entries
        const lines = text.split('\n');
        let currentBlock = [];

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.toUpperCase().startsWith('DATE:')) {
                // Save previous block if exists
                if (currentBlock.length > 0) {
                    const lecture = parseLectureBlock(currentBlock.join('\n'));
                    if (lecture) lectures.push(lecture);
                }
                currentBlock = [trimmed];
            } else if (trimmed && !trimmed.toUpperCase().startsWith('LECTURES')) {
                currentBlock.push(trimmed);
            }
        });

        // Don't forget the last block
        if (currentBlock.length > 0) {
            const lecture = parseLectureBlock(currentBlock.join('\n'));
            if (lecture) lectures.push(lecture);
        }
    }

    return lectures;
}

function parseLectureBlock(block) {
    const lines = block.trim().split('\n');
    const lecture = {};

    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            const keyLower = key.trim().toUpperCase();

            if (keyLower === 'DATE') {
                lecture.date = parseImportDate(value);
            } else if (keyLower === 'TIME') {
                // Parse time like "1:00 PM - 2:50 PM"
                const timeParts = value.split('-').map(t => t.trim());
                lecture.startTime = parseImportTime(timeParts[0]);
                lecture.endTime = timeParts[1] ? parseImportTime(timeParts[1]) : null;
            } else if (keyLower === 'COURSE') {
                lecture.course = value;
            } else if (keyLower === 'LOCATION') {
                lecture.location = value;
            }
        }
    });

    if (lecture.date && lecture.course) {
        return lecture;
    }
    return null;
}

function parseImportDate(dateStr) {
    // Handle formats: "2026-02-09", "Feb 9, 2026", "February 9, 2026", "02/09/2026"
    if (!dateStr) return null;

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Try to parse other formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        // Use local date components, not UTC (fixes timezone bug)
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return null;
}

function parseImportTime(timeStr) {
    // Handle formats: "1:00 PM", "13:00", "1 PM", "8am"
    if (!timeStr) return null;

    const str = timeStr.trim().toUpperCase();

    // Already in 24h format
    if (/^\d{1,2}:\d{2}$/.test(str)) {
        const [h, m] = str.split(':').map(Number);
        if (h > 23 || m > 59) return null; // Validate range
        return str.padStart(5, '0');
    }

    // 12h format: "1:00 PM", "8:30 AM"
    const match = str.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const period = match[3] ? match[3].toUpperCase() : null;

        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        if (hours > 23 || minutes > 59) return null; // Validate range
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    return null;
}

function previewLectureImport() {
    const text = document.getElementById('lectureImportText').value;
    parsedLectures = parseLectureFormat(text);

    const previewDiv = document.getElementById('lectureImportPreview');
    const listDiv = document.getElementById('lectureImportPreviewList');
    const importBtn = document.getElementById('lectureImportBtn');

    if (parsedLectures.length === 0) {
        previewDiv.style.display = 'block';
        listDiv.innerHTML = '<p style="color: #f87171;">No valid lectures found. Check the format.</p>';
        importBtn.disabled = true;
        return;
    }

    previewDiv.style.display = 'block';
    listDiv.innerHTML = parsedLectures.map(lec => {
        const timeStr = lec.startTime ? formatTime12h(lec.startTime) + (lec.endTime ? ' - ' + formatTime12h(lec.endTime) : '') : 'No time';
        return `<div style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <strong>${escapeHtml(lec.date)}</strong> | ${timeStr}<br>
            <span style="color: #93c5fd;">${escapeHtml(lec.course)}</span>
            ${lec.location ? '<br><span style="color: #b0bcc8; font-size: 0.85em;">📍 ' + escapeHtml(lec.location) + '</span>' : ''}
        </div>`;
    }).join('');

    importBtn.disabled = false;
}

function formatTime12h(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function confirmLectureImport() {
    if (parsedLectures.length === 0) return;

    // Initialize data structures
    if (!roadmapData.monthlyPlanner) roadmapData.monthlyPlanner = {};
    if (!roadmapData.monthlyPlanner.customTasks) roadmapData.monthlyPlanner.customTasks = {};

    const existingTasks = getValues(roadmapData.monthlyPlanner.customTasks);
    let imported = 0;
    let skipped = 0;

    parsedLectures.forEach(lec => {
        // Check for duplicates: same date + overlapping time + similar item name
        const isDuplicate = existingTasks.some(existing => {
            // Must be same date
            if (existing.date !== lec.date) return false;

            // Check for time overlap
            if (existing.time && lec.startTime) {
                const existStart = timeToMinutes(existing.time);
                const existEnd = existing.endTime ? timeToMinutes(existing.endTime) : existStart + 60;
                const newStart = timeToMinutes(lec.startTime);
                const newEnd = lec.endTime ? timeToMinutes(lec.endTime) : newStart + 60;

                // Times overlap?
                const timesOverlap = (newStart < existEnd && newEnd > existStart);
                if (!timesOverlap) return false;
            }

            // Check for similar item name (case-insensitive, first 20 chars)
            const existItem = (existing.item || '').toLowerCase().substring(0, 20);
            const newItem = (lec.course || '').toLowerCase().substring(0, 20);
            return existItem === newItem || existing.item === lec.course;
        });

        if (isDuplicate) {
            skipped++;
            return;
        }

        // Create task for Monthly Planner
        const taskId = generateId('ctask');
        const task = {
            id: taskId,
            date: lec.date,
            item: lec.course,
            time: lec.startTime || '',
            endTime: lec.endTime || '',
            type: 'lecture',
            notes: lec.location ? '📍 ' + lec.location : '',
            createdAt: new Date().toISOString(),
            imported: true
        };

        if (!roadmapData.monthlyPlanner.customTasks || Array.isArray(roadmapData.monthlyPlanner.customTasks)) {
            roadmapData.monthlyPlanner.customTasks = migrateArrayToObject(roadmapData.monthlyPlanner.customTasks, 'ctask');
        }
        roadmapData.monthlyPlanner.customTasks[taskId] = task;
        imported++;
    });

    // CRITICAL: Persist to localStorage BEFORE saveData() in case guards block
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    closeLectureImportModal();
    initMonthlyPlanner();

    // Show appropriate toast message
    if (skipped > 0 && imported > 0) {
        showToast(`✅ Imported ${imported} lecture(s), ⚠️ ${skipped} duplicate(s) skipped`);
    } else if (skipped > 0) {
        showToast(`⚠️ All ${skipped} lecture(s) already exist - nothing imported`);
    } else {
        showToast(`✅ Imported ${imported} lecture(s)!`);
    }
}

// ========== CLINICAL IMPORT ==========

function openClinicalImportModal() {
    document.getElementById('clinicalImportModal').style.display = 'flex';
    document.getElementById('clinicalImportText').value = '';
    document.getElementById('clinicalImportPreview').style.display = 'none';
    document.getElementById('clinicalImportBtn').disabled = true;
    parsedAppointments = [];
}

function closeClinicalImportModal() {
    document.getElementById('clinicalImportModal').style.display = 'none';
}

function parseClinicalFormat(text) {
    const appointments = [];

    // Check if text uses --- separators or not
    if (text.includes('---')) {
        // Original format with separators
        const blocks = text.split('---').filter(b => b.trim());
        blocks.forEach(block => {
            if (block.toUpperCase().includes('APPOINTMENTS') && !block.includes('PATIENT')) return;
            const apt = parseAppointmentBlock(block);
            if (apt) appointments.push(apt);
        });
    } else {
        // Flexible format: split by PATIENT: to detect new entries
        // This handles Claude's output without --- separators
        const lines = text.split('\n');
        let currentBlock = [];

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.toUpperCase().startsWith('PATIENT:')) {
                // Save previous block if exists
                if (currentBlock.length > 0) {
                    const apt = parseAppointmentBlock(currentBlock.join('\n'));
                    if (apt) appointments.push(apt);
                }
                currentBlock = [trimmed];
            } else if (trimmed && !trimmed.toUpperCase().startsWith('APPOINTMENTS')) {
                currentBlock.push(trimmed);
            }
        });

        // Don't forget the last block
        if (currentBlock.length > 0) {
            const apt = parseAppointmentBlock(currentBlock.join('\n'));
            if (apt) appointments.push(apt);
        }
    }

    return appointments;
}

function parseAppointmentBlock(block) {
    const lines = block.trim().split('\n');
    const apt = {};

    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            const keyLower = key.trim().toUpperCase();

            if (keyLower === 'PATIENT') apt.patientName = value;
            else if (keyLower === 'CHART') apt.chartNumber = value;
            else if (keyLower === 'DATE') apt.date = parseImportDate(value);
            else if (keyLower === 'TIME') apt.time = parseImportTime(value);
            else if (keyLower === 'PROCEDURE') apt.procedure = value;
            else if (keyLower === 'CHAIR') apt.chair = value;
        }
    });

    if (apt.patientName && apt.date) {
        return apt;
    }
    return null;
}

function previewClinicalImport() {
    const text = document.getElementById('clinicalImportText').value;
    parsedAppointments = parseClinicalFormat(text);

    const previewDiv = document.getElementById('clinicalImportPreview');
    const listDiv = document.getElementById('clinicalImportPreviewList');
    const importBtn = document.getElementById('clinicalImportBtn');

    if (parsedAppointments.length === 0) {
        previewDiv.style.display = 'block';
        listDiv.innerHTML = '<p style="color: #f87171;">No valid appointments found. Check the format.</p>';
        importBtn.disabled = true;
        return;
    }

    previewDiv.style.display = 'block';
    listDiv.innerHTML = parsedAppointments.map(apt => {
        const timeStr = apt.time ? formatTime12h(apt.time) : 'No time';
        return `<div style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <strong>${escapeHtml(apt.patientName)}</strong> ${apt.chartNumber ? '(#' + escapeHtml(apt.chartNumber) + ')' : ''}<br>
            <span style="color: #93c5fd;">${escapeHtml(apt.date)} @ ${timeStr}</span>
            ${apt.procedure ? '<br><span style="color: #10b981;">' + escapeHtml(apt.procedure) + '</span>' : ''}
            ${apt.chair ? '<br><span style="color: #b0bcc8; font-size: 0.85em;">Chair: ' + escapeHtml(apt.chair) + '</span>' : ''}
        </div>`;
    }).join('');

    importBtn.disabled = false;
}

function confirmClinicalImport() {
    if (parsedAppointments.length === 0) return;

    const isRefreshMode = document.getElementById('clinicalRefreshMode').checked;

    // Ensure clinicalData structure exists
    if (!roadmapData.clinicalData) {
        roadmapData.clinicalData = { patients: {}, appointments: {}, completedProcedures: {}, patientRecords: {}, dashboardSnapshots: [] };
    }
    if (!roadmapData.clinicalData.patients) roadmapData.clinicalData.patients = {};
    if (!roadmapData.clinicalData.appointments) roadmapData.clinicalData.appointments = {};

    // In refresh mode, clear all existing appointments
    if (isRefreshMode) {
        roadmapData.clinicalData.appointments = {};
    }

    let patientsAdded = 0;
    let appointmentsAdded = 0;

    parsedAppointments.forEach(apt => {
        // Check if patient exists (by chart number or name)
        let patientId = null;
        const existingPatients = Object.entries(roadmapData.clinicalData.patients);

        for (const [id, patient] of existingPatients) {
            if (apt.chartNumber && patient.chartNumber === apt.chartNumber) {
                patientId = id;
                break;
            }
            if (patient.name.toLowerCase() === apt.patientName.toLowerCase()) {
                patientId = id;
                break;
            }
        }

        // Create new patient if not found
        if (!patientId) {
            patientId = 'patient_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            roadmapData.clinicalData.patients[patientId] = {
                id: patientId,
                name: apt.patientName,
                chartNumber: apt.chartNumber || '',
                status: 'active',
                asaClass: '',
                perioStatus: '',
                needsXrays: false,
                recallDue: null,
                prophyDue: false,
                medicalAlerts: '',
                outstandingTasks: [],
                createdAt: new Date().toISOString()
            };
            patientsAdded++;
        }

        // Skip duplicates only in non-refresh mode
        if (!isRefreshMode) {
            const aptTime = apt.time || '09:00';
            const aptNameLower = (apt.patientName || '').toLowerCase().trim();
            const isDuplicateApt = getValues(roadmapData.clinicalData.appointments).some(existing => {
                // Primary: match by patientId + date + time
                if (existing.patientId === patientId &&
                    existing.date === apt.date &&
                    existing.time === aptTime) return true;
                // Secondary: match by patientName + date + time (catches mismatched patientIds)
                const existingPatient = roadmapData.clinicalData.patients[existing.patientId];
                if (existingPatient &&
                    (existingPatient.name || '').toLowerCase().trim() === aptNameLower &&
                    existing.date === apt.date &&
                    existing.time === aptTime) return true;
                return false;
            });
            if (isDuplicateApt) return;
        }

        // Create appointment
        const appointmentId = generateId('appt');
        if (!roadmapData.clinicalData.appointments || Array.isArray(roadmapData.clinicalData.appointments)) {
            roadmapData.clinicalData.appointments = migrateArrayToObject(roadmapData.clinicalData.appointments, 'appt');
        }
        // Auto-complete past appointments and set scheduled for future
        var todayStr = getLocalDateString(new Date());
        var isPast = apt.date && apt.date < todayStr;

        var newApt = {
            id: appointmentId,
            patientId: patientId,
            date: apt.date,
            time: apt.time || '09:00',
            duration: 60,
            procedures: apt.procedure || '',
            notes: apt.chair ? 'Chair: ' + apt.chair : '',
            status: isPast ? 'completed' : 'scheduled',
            imported: true
        };

        if (isPast) {
            newApt.completedAt = apt.date + 'T17:00:00.000Z';
            // Update patient lastVisit
            var ptEntry = roadmapData.clinicalData.patients[patientId];
            if (ptEntry && (!ptEntry.lastVisit || ptEntry.lastVisit < apt.date)) {
                ptEntry.lastVisit = apt.date;
            }
        }

        roadmapData.clinicalData.appointments[appointmentId] = newApt;
        appointmentsAdded++;

        // Auto-create procedure record for completed past appointments
        if (isPast && apt.procedure) {
            if (!roadmapData.clinicalData.completedProcedures) roadmapData.clinicalData.completedProcedures = {};
            if (typeof recordProcedure === 'function') {
                recordProcedure({
                    patientId: patientId,
                    patientName: apt.patientName || '',
                    appointmentId: appointmentId,
                    date: apt.date,
                    procedureType: 'other',
                    procedure: apt.procedure,
                    notes: 'Auto-created from import',
                    createdAt: new Date().toISOString()
                });
            }
        }
    });

    // CRITICAL: Sync to Monthly Planner
    syncClinicalToMonthlyPlanner();

    // CRITICAL: Persist to localStorage BEFORE saveData() in case guards block
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    closeClinicalImportModal();
    initClinicalTab();

    // Refresh Monthly Planner and Dashboard
    if (typeof mpRenderAllCalendars === 'function') {
        mpRenderAllCalendars();
    }
    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }

    if (isRefreshMode) {
        showToast('Refreshed: ' + appointmentsAdded + ' appointment(s), ' + patientsAdded + ' new patient(s)!');
    } else {
        var totalParsed = parsedAppointments.length;
        var skippedApts = totalParsed - appointmentsAdded;
        var pastCount = parsedAppointments.filter(function(a) { return a.date && a.date < todayStr; }).length;
        var msg = 'Imported ' + appointmentsAdded + ' apt(s), ' + patientsAdded + ' patient(s)';
        if (pastCount > 0) msg += ' | ' + pastCount + ' auto-completed';
        if (skippedApts > 0) msg += ' | ' + skippedApts + ' dupes skipped';
        showToast(msg);
    }
}

// ========== CROSS-TAB SYNC: Clinical → Monthly Planner ==========
// INCREMENTAL SYNC: Respects hiddenClinicTasks and userEdited flags.
// Does NOT nuke-and-rebuild — only adds new, removes cancelled, skips user-edited.
function syncClinicalToMonthlyPlanner() {
    if (!roadmapData.clinicalData?.appointments) return;
    if (!roadmapData.monthlyPlanner) roadmapData.monthlyPlanner = {};
    if (!roadmapData.monthlyPlanner.customTasks || Array.isArray(roadmapData.monthlyPlanner.customTasks)) {
        roadmapData.monthlyPlanner.customTasks = migrateArrayToObject(roadmapData.monthlyPlanner.customTasks, 'ctask');
    }
    if (!roadmapData.monthlyPlanner.hiddenClinicTasks) {
        roadmapData.monthlyPlanner.hiddenClinicTasks = {};
    }

    const appointments = roadmapData.clinicalData.appointments;
    const patients = roadmapData.clinicalData.patients || {};
    const hiddenClinicTasks = roadmapData.monthlyPlanner.hiddenClinicTasks;
    const customTasks = roadmapData.monthlyPlanner.customTasks;

    // Build set of current appointment IDs for orphan detection
    const currentAptIds = new Set(getValues(appointments).map(a => a.id));

    // Remove orphaned clinic tasks (appointment was deleted) — but NOT user-edited ones
    Object.keys(customTasks).forEach(id => {
        const task = customTasks[id];
        if (!task?.clinicalAppointmentId) return; // Not a clinic task
        if (task.userEdited) return; // User edited — preserve
        if (!currentAptIds.has(task.clinicalAppointmentId)) {
            // Appointment no longer exists — remove orphan
            delete customTasks[id];
        }
    });

    // Add/update clinic tasks from current appointments
    getValues(appointments).forEach(apt => {
        if (apt.status === 'cancelled') return; // Skip cancelled

        // Skip if user explicitly hid this appointment from planner
        if (hiddenClinicTasks[apt.id]) return;

        const taskId = 'clinic_' + apt.id;

        // Skip if user has edited this task
        if (customTasks[taskId]?.userEdited) return;

        const patient = patients[apt.patientId] || {};
        const patientName = patient.name || 'Unknown Patient';

        // Create/update task linked to this appointment
        customTasks[taskId] = {
            id: taskId,
            clinicalAppointmentId: apt.id,
            date: apt.date,
            item: `${patientName} - ${apt.procedures || 'Appointment'}`,
            time: apt.time || '09:00',
            endTime: calculateEndTime(apt.time || '09:00', apt.duration || 60),
            type: 'clinic',
            notes: apt.notes || '',
            createdAt: customTasks[taskId]?.createdAt || new Date().toISOString(),
            syncedFromClinical: true
        };
    });

    // Extend MP_WEEKS if needed for dates beyond current range
    extendWeeksIfNeeded();

    // Reset dirty flag — sync is up to date
    clinicalDataDirty = false;
}

function calculateEndTime(startTime, durationMinutes) {
    if (!startTime || !startTime.includes(':')) return '';
    const parts = startTime.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    const totalMinutes = h * 60 + m + (durationMinutes || 0);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

// Helper function for time conversion
function timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h * 60 + m;
}

// ==================== APPOINTMENT DEDUP ====================
// Scans all appointments, groups by patientName+date+time, keeps earliest, removes duplicates.
// Also cleans orphaned clinic_ tasks from customTasks.
function dedupAppointments() {
    if (!roadmapData.clinicalData?.appointments) return 0;

    const appointments = roadmapData.clinicalData.appointments;
    const patients = roadmapData.clinicalData.patients || {};
    const allApts = getValues(appointments);

    if (allApts.length === 0) return 0;

    // Group by patientName (lowercased) + date + time
    const groups = {};
    allApts.forEach(apt => {
        const patient = patients[apt.patientId];
        const name = (patient?.name || '').toLowerCase().trim();
        const key = name + '|' + (apt.date || '') + '|' + (apt.time || '09:00');
        if (!groups[key]) groups[key] = [];
        groups[key].push(apt);
    });

    let removed = 0;
    const removedAptIds = new Set();

    Object.values(groups).forEach(group => {
        if (group.length <= 1) return;
        // Sort by createdAt or id (keep earliest)
        group.sort((a, b) => {
            if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt);
            return (a.id || '').localeCompare(b.id || '');
        });
        // Keep first, delete rest
        for (let i = 1; i < group.length; i++) {
            const dupeId = group[i].id;
            if (dupeId && appointments[dupeId]) {
                delete appointments[dupeId];
                removedAptIds.add(dupeId);
                removed++;
            }
        }
    });

    // Clean orphaned clinic_ tasks from customTasks
    if (removed > 0 && roadmapData.monthlyPlanner?.customTasks) {
        const customTasks = roadmapData.monthlyPlanner.customTasks;
        Object.keys(customTasks).forEach(taskId => {
            const task = customTasks[taskId];
            if (!task?.clinicalAppointmentId) return;
            if (removedAptIds.has(task.clinicalAppointmentId)) {
                delete customTasks[taskId];
            }
        });
    }

    if (removed > 0) {
        console.log('[DEDUP] Removed ' + removed + ' duplicate appointment(s)');
    }

    return removed;
}
