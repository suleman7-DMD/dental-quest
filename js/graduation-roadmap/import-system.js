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

// ========== CLINICAL IMPORT (RETIRED — CIS v2) ==========
// confirmClinicalImport pipeline retired. Clinical tab uses openUnifiedImportModal() from patients.js.
// Kept: syncClinicalToMonthlyPlanner, calculateEndTime, timeToMinutes, dedupAppointments, lecture functions.

// ========== CROSS-TAB SYNC: Clinical → Monthly Planner ==========
// INCREMENTAL SYNC: Respects hiddenClinicTasks and userEdited flags.
// Does NOT nuke-and-rebuild — only adds new, removes cancelled, skips user-edited.
function syncClinicalToMonthlyPlanner() {
    if (!roadmapData.clinicalData?.appointments) return;
    if (!clinicalDataDirty) return;
    if (!roadmapData.monthlyPlanner) roadmapData.monthlyPlanner = {};
    if (!roadmapData.monthlyPlanner.customTasks || Array.isArray(roadmapData.monthlyPlanner.customTasks)) {
        roadmapData.monthlyPlanner.customTasks = migrateArrayToObject(roadmapData.monthlyPlanner.customTasks, 'ctask');
    }
    if (!roadmapData.monthlyPlanner.hiddenClinicTasks) {
        roadmapData.monthlyPlanner.hiddenClinicTasks = {};
    }

    const appointments = roadmapData.clinicalData.appointments;
    const patients = roadmapData.clinicalData.patientRecords || {};
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
    const patients = roadmapData.clinicalData.patientRecords || {};
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
