// ==================== D3 ROADMAP: FIREBASE SYNC ====================
// Auth, save/load, sync, checkpoints, backup, conflict resolution, cross-app sync

// ==================== MODULE VARIABLES ====================

// Connection monitoring
let isFirebaseConnected = false;
let connectionMonitorRef = null;

// Backup system
const BACKUP_STORAGE_KEY = 'graduationRoadmapBackup';
const OLD_BACKUP_STORAGE_KEY = 'd3RoadmapBackup';  // For migration
const MAX_BACKUPS = 3;

// Conflict detection & local change tracking
let localChangesSinceLastSync = false;
let lastSyncTimestamp = null;
// Grace period after "Keep This Device" to prevent visibility handler / realtime from
// overwriting local state before the Firebase write completes
let lastKeepLocalTime = 0;
const KEEP_LOCAL_GRACE_MS = 5000; // 5 second grace period

// FIX 4: isLocalUpdate flag to prevent realtime callback from processing local saves
let isLocalUpdate = false;
let localUpdateTimer = null;

// Realtime sync refs
let realtimeSyncRef = null;
let lastRemoteUpdate = 0;

// Force sync debounce
let lastForceSync = 0;

// Save timing
let lastSaveTime = 0;
let pendingSaveToast = false;

// Firebase load timeout
let firebaseTimeoutTimer = null;

// ==================== SYNC STATUS ====================

function updateSyncStatus(status, text) {
    const iconEl = document.getElementById('syncIcon');
    const textEl = document.getElementById('syncText');
    if (iconEl && textEl) {
        if (status === 'connected') {
            iconEl.textContent = '🟢';
            iconEl.style.color = '#10b981';
            textEl.textContent = text || 'Synced';
            textEl.style.color = '#86efac';
        } else if (status === 'syncing') {
            iconEl.textContent = '🔄';
            iconEl.style.color = '#f59e0b';
            textEl.textContent = text || 'Syncing...';
            textEl.style.color = '#93c5fd';
        } else if (status === 'offline') {
            iconEl.textContent = '🔴';
            iconEl.style.color = '#ef4444';
            textEl.textContent = text || 'Offline';
            textEl.style.color = '#fca5a5';
        } else if (status === 'error') {
            iconEl.textContent = '⚠️';
            iconEl.style.color = '#f59e0b';
            textEl.textContent = text || 'Sync error';
            textEl.style.color = '#fcd34d';
        } else {
            iconEl.textContent = '⏳';
            iconEl.style.color = '#8b949e';
            textEl.textContent = text || 'Connecting...';
            textEl.style.color = 'white';
        }
    }
}

// ==================== DEEP MERGE ====================

// Deep merge helper for nested objects
function deepMerge(target, source) {
    if (!source) return target;
    if (!target) return source;
    const result = { ...target };
    for (const key in source) {
        if (source[key] === null || source[key] === undefined) continue;
        if (Array.isArray(source[key])) {
            result[key] = source[key];
        } else if (typeof source[key] === 'object' && typeof target[key] === 'object') {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

// ==================== DASHBOARD SNAPSHOTS MERGE ====================
// Merges two dashboardSnapshots arrays, deduplicating by capturedAt date.
// Keeps newest first, capped at 20. Prevents data loss from || fallback.
function mergeDashboardSnapshots(localSnaps, remoteSnaps) {
    // Use ensureArray() instead of Array.isArray() — Firebase may convert arrays to objects with numeric keys
    const local = ensureArray(localSnaps, []);
    const remote = ensureArray(remoteSnaps, []);
    if (local.length === 0) return remote.length > 0 ? remote : [];
    if (remote.length === 0) return local;
    // Deduplicate by capturedAt (or timestamp fallback)
    // Local-first iteration: local wins for same capturedAt (consistent with addMissing pattern)
    const seen = new Set();
    const merged = [];
    [...local, ...remote].forEach(snap => {
        if (!snap) return;
        const key = snap.capturedAt || snap.timestamp || JSON.stringify(snap).slice(0, 80);
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(snap);
        }
    });
    // Sort newest first, cap at 20
    merged.sort((a, b) => {
        const ta = a.capturedAt || a.timestamp || '';
        const tb = b.capturedAt || b.timestamp || '';
        return tb > ta ? 1 : tb < ta ? -1 : 0;
    });
    return merged.slice(0, 20);
}

// ==================== MERGE REMOTE-ONLY INTO LOCAL ====================
// When local is newer, we keep all local data but ADD entries from Firebase
// that don't exist locally. This prevents losing data imported on another device.
// Key difference from mergeRemoteState: local wins for all conflicts (same key = keep local).
function mergeRemoteCollectionsIntoLocal(data) {
    if (!data) return;

    // Helper: add remote entries that don't exist locally (local wins for conflicts)
    function addMissing(localObj, remoteObj) {
        if (!remoteObj || typeof remoteObj !== 'object' || Array.isArray(remoteObj)) return;
        if (!localObj || typeof localObj !== 'object') return;
        Object.keys(remoteObj).forEach(key => {
            if (!(key in localObj) && remoteObj[key] != null) {
                localObj[key] = remoteObj[key];
            }
        });
    }

    // Clinical data collections
    if (data.clinicalData) {
        if (!roadmapData.clinicalData) roadmapData.clinicalData = {};
        if (!roadmapData.clinicalData.patients) roadmapData.clinicalData.patients = {};
        if (!roadmapData.clinicalData.appointments) roadmapData.clinicalData.appointments = {};
        if (!roadmapData.clinicalData.completedProcedures) roadmapData.clinicalData.completedProcedures = {};
        if (!roadmapData.clinicalData.patientRecords) roadmapData.clinicalData.patientRecords = {};
        if (!roadmapData.clinicalData.missingNotes) roadmapData.clinicalData.missingNotes = {};
        addMissing(roadmapData.clinicalData.patients, data.clinicalData.patients);
        addMissing(roadmapData.clinicalData.appointments, data.clinicalData.appointments);
        addMissing(roadmapData.clinicalData.completedProcedures, data.clinicalData.completedProcedures);
        addMissing(roadmapData.clinicalData.patientRecords, data.clinicalData.patientRecords);
        // Patient records: field-level merge for existing patients (addMissing only fills new keys)
        if (data.clinicalData.patientRecords) {
            Object.keys(data.clinicalData.patientRecords).forEach(function(ptId) {
                var local = roadmapData.clinicalData.patientRecords[ptId];
                var remote = data.clinicalData.patientRecords[ptId];
                if (!local || !remote) return;
                // Clinical briefs: newer dateGenerated wins
                if (remote.clinicalBrief && remote.clinicalBrief.dateGenerated) {
                    if (!local.clinicalBrief || (remote.clinicalBrief.dateGenerated > (local.clinicalBrief.dateGenerated || ''))) {
                        local.clinicalBrief = remote.clinicalBrief;
                    }
                    if (remote.briefHistory && Array.isArray(remote.briefHistory)) {
                        if (!local.briefHistory || remote.briefHistory.length > local.briefHistory.length) {
                            local.briefHistory = remote.briefHistory;
                        }
                    }
                }
                // Fill import-enriched fields from remote if local doesn't have them
                if (!local.importedRequirements && remote.importedRequirements) local.importedRequirements = remote.importedRequirements;
                if (!local.priorityNotes && remote.priorityNotes) local.priorityNotes = remote.priorityNotes;
                if (local.highValue === undefined && remote.highValue !== undefined) local.highValue = remote.highValue;
                if (!local.allergies && remote.allergies) local.allergies = remote.allergies;
                if (!local.txCompletedByMe && remote.txCompletedByMe) local.txCompletedByMe = remote.txCompletedByMe;
                if (!local.recallHistory && remote.recallHistory) local.recallHistory = remote.recallHistory;
                if (!local.activeStatus && remote.activeStatus) local.activeStatus = remote.activeStatus;
            });
        }
        addMissing(roadmapData.clinicalData.missingNotes, data.clinicalData.missingNotes);
        // dashboardSnapshots: merge arrays
        if (data.clinicalData.dashboardSnapshots) {
            roadmapData.clinicalData.dashboardSnapshots = mergeDashboardSnapshots(
                roadmapData.clinicalData.dashboardSnapshots, data.clinicalData.dashboardSnapshots
            );
        }
        // competencies: deep item-level merge (preserves completionEntries from both devices)
        if (data.clinicalData.competencies) {
            roadmapData.clinicalData.competencies = mergeCompetencies(
                roadmapData.clinicalData.competencies, data.clinicalData.competencies
            );
        }
        // autoLinkReviewQueue: union by procedureId (local wins for same procedureId)
        if (Array.isArray(data.clinicalData.autoLinkReviewQueue) && data.clinicalData.autoLinkReviewQueue.length > 0) {
            if (!Array.isArray(roadmapData.clinicalData.autoLinkReviewQueue)) roadmapData.clinicalData.autoLinkReviewQueue = [];
            var localProcIds = new Set(roadmapData.clinicalData.autoLinkReviewQueue.map(function(q) { return q.procedureId; }));
            data.clinicalData.autoLinkReviewQueue.forEach(function(remoteQ) {
                if (remoteQ.procedureId && !localProcIds.has(remoteQ.procedureId)) {
                    roadmapData.clinicalData.autoLinkReviewQueue.push(remoteQ);
                }
            });
        }
    }

    // Monthly planner collections
    if (data.monthlyPlanner) {
        if (!roadmapData.monthlyPlanner) roadmapData.monthlyPlanner = {};
        if (!roadmapData.monthlyPlanner.notes) roadmapData.monthlyPlanner.notes = {};
        if (!roadmapData.monthlyPlanner.customTasks) roadmapData.monthlyPlanner.customTasks = {};
        if (!roadmapData.monthlyPlanner.completedTasks) roadmapData.monthlyPlanner.completedTasks = {};
        if (!roadmapData.monthlyPlanner.hiddenClinicTasks) roadmapData.monthlyPlanner.hiddenClinicTasks = {};
        if (!roadmapData.monthlyPlanner.overriddenStatic) roadmapData.monthlyPlanner.overriddenStatic = {};
        addMissing(roadmapData.monthlyPlanner.notes, data.monthlyPlanner.notes);
        addMissing(roadmapData.monthlyPlanner.customTasks, data.monthlyPlanner.customTasks);
        addMissing(roadmapData.monthlyPlanner.completedTasks, data.monthlyPlanner.completedTasks);
        addMissing(roadmapData.monthlyPlanner.hiddenClinicTasks, data.monthlyPlanner.hiddenClinicTasks);
        addMissing(roadmapData.monthlyPlanner.overriddenStatic, data.monthlyPlanner.overriddenStatic);
        if (data.monthlyPlanner.currentWeekSchedule) {
            if (!roadmapData.monthlyPlanner.currentWeekSchedule) roadmapData.monthlyPlanner.currentWeekSchedule = {};
            addMissing(roadmapData.monthlyPlanner.currentWeekSchedule, data.monthlyPlanner.currentWeekSchedule);
        }
    }

    // Top-level collections
    if (!roadmapData.customDeadlines) roadmapData.customDeadlines = {};
    if (!roadmapData.completedDeadlines) roadmapData.completedDeadlines = {};
    if (!roadmapData.editedDeadlines) roadmapData.editedDeadlines = {};
    if (!roadmapData.deletedDeadlines) roadmapData.deletedDeadlines = {};
    if (!roadmapData.examStudyProgress) roadmapData.examStudyProgress = {};
    addMissing(roadmapData.customDeadlines, data.customDeadlines);
    addMissing(roadmapData.completedDeadlines, data.completedDeadlines);
    addMissing(roadmapData.editedDeadlines, data.editedDeadlines);
    addMissing(roadmapData.deletedDeadlines, data.deletedDeadlines);
    addMissing(roadmapData.examStudyProgress, data.examStudyProgress);

    // Todo list
    if (data.todoList?.items) {
        if (!roadmapData.todoList) roadmapData.todoList = { items: {}, _nextSeq: 1, lastUpdated: null };
        if (!roadmapData.todoList.items) roadmapData.todoList.items = {};
        addMissing(roadmapData.todoList.items, data.todoList.items);
        roadmapData.todoList._nextSeq = Math.max(roadmapData.todoList._nextSeq || 1, data.todoList._nextSeq || 1);
    }

    // Grades: deep merge (add remote course grades that don't exist locally)
    if (data.grades) {
        if (!roadmapData.grades) roadmapData.grades = {};
        Object.keys(data.grades).forEach(courseId => {
            if (!roadmapData.grades[courseId]) {
                roadmapData.grades[courseId] = data.grades[courseId];
            } else {
                addMissing(roadmapData.grades[courseId], data.grades[courseId]);
            }
        });
    }

    // Graduation prep: field-level additive merge (defaults always exist, so fill-only never fires)
    if (data.graduationPrep) {
        if (!roadmapData.graduationPrep) roadmapData.graduationPrep = {};
        ['externship', 'cdcaAdex', 'inbde', 'jobSearch'].forEach(section => {
            if (!data.graduationPrep[section]) return;
            if (!roadmapData.graduationPrep[section]) {
                roadmapData.graduationPrep[section] = data.graduationPrep[section];
                return;
            }
            var localSec = roadmapData.graduationPrep[section];
            var remoteSec = data.graduationPrep[section];
            // Fill empty scalar fields from remote
            Object.keys(remoteSec).forEach(key => {
                var remoteVal = remoteSec[key];
                if (remoteVal == null) return;
                if (typeof remoteVal === 'object' && !Array.isArray(remoteVal)) {
                    // Sub-objects (e.g., externship.patients, cdcaAdex.sessions): use addMissing
                    if (!localSec[key]) localSec[key] = {};
                    addMissing(localSec[key], remoteVal);
                } else {
                    // Scalars: fill only if local is empty/null/undefined/''
                    if (localSec[key] == null || localSec[key] === '') {
                        localSec[key] = remoteVal;
                    }
                }
            });
        });
        // Merge any other sub-fields beyond the known 4
        Object.keys(data.graduationPrep).forEach(key => {
            if (!['externship', 'cdcaAdex', 'inbde', 'jobSearch'].includes(key) && !(key in roadmapData.graduationPrep)) {
                roadmapData.graduationPrep[key] = data.graduationPrep[key];
            }
        });
    }

    // Mandatory items: add any remote-only items
    if (data.mandatoryItems) {
        if (!roadmapData.mandatoryItems) roadmapData.mandatoryItems = {};
        Object.keys(data.mandatoryItems).forEach(key => {
            if (!(key in roadmapData.mandatoryItems)) {
                roadmapData.mandatoryItems[key] = data.mandatoryItems[key];
            }
        });
    }

    // Periodic reviews: merge pr2 sub-fields (remote-only entries added, local wins conflicts)
    if (data.periodicReviews?.pr2) {
        if (!roadmapData.periodicReviews) roadmapData.periodicReviews = getDefaultRoadmapData().periodicReviews;
        if (!roadmapData.periodicReviews.pr2) roadmapData.periodicReviews.pr2 = getDefaultRoadmapData().periodicReviews.pr2;
        var localPr2 = roadmapData.periodicReviews.pr2;
        var remotePr2 = data.periodicReviews.pr2;
        // Scalar fields: local wins (only fill if local is empty/null)
        if (!localPr2.reviewDate && remotePr2.reviewDate) localPr2.reviewDate = remotePr2.reviewDate;
        if (!localPr2.subjectiveReport && remotePr2.subjectiveReport) localPr2.subjectiveReport = remotePr2.subjectiveReport;
        if (!localPr2.completedProceduresHtml && remotePr2.completedProceduresHtml) localPr2.completedProceduresHtml = remotePr2.completedProceduresHtml;
        if (!localPr2.dashboardDiscrepancyNotes && remotePr2.dashboardDiscrepancyNotes) localPr2.dashboardDiscrepancyNotes = remotePr2.dashboardDiscrepancyNotes;
        // Object fields: addMissing pattern (local wins for same key)
        if (!localPr2.adminStatsOverrides) localPr2.adminStatsOverrides = {};
        addMissing(localPr2.adminStatsOverrides, remotePr2.adminStatsOverrides);
        if (!localPr2.inProgressProcedures) localPr2.inProgressProcedures = {};
        addMissing(localPr2.inProgressProcedures, remotePr2.inProgressProcedures);
        if (!localPr2.departmentNotes) localPr2.departmentNotes = {};
        addMissing(localPr2.departmentNotes, remotePr2.departmentNotes);
        if (!localPr2.patientNotes) localPr2.patientNotes = {};
        addMissing(localPr2.patientNotes, remotePr2.patientNotes);
        if (!localPr2.removedPatients) localPr2.removedPatients = {};
        addMissing(localPr2.removedPatients, remotePr2.removedPatients);
    }

    // Clinic headlines: field-level merge (defaults always exist, so fill-only never fires)
    if (data.clinicHeadlines) {
        if (!roadmapData.clinicHeadlines) roadmapData.clinicHeadlines = {};
        // Merge appointments sub-object
        if (data.clinicHeadlines.appointments) {
            if (!roadmapData.clinicHeadlines.appointments) roadmapData.clinicHeadlines.appointments = { completed: 0, target: 90 };
            // Merge target from remote if local still has the default value and remote differs
            if (roadmapData.clinicHeadlines.appointments.target === 90 && data.clinicHeadlines.appointments.target != null && data.clinicHeadlines.appointments.target !== 90) {
                roadmapData.clinicHeadlines.appointments.target = data.clinicHeadlines.appointments.target;
            }
            addMissing(roadmapData.clinicHeadlines.appointments, data.clinicHeadlines.appointments);
        }
        // Merge procedures sub-object
        if (data.clinicHeadlines.procedures) {
            if (!roadmapData.clinicHeadlines.procedures) roadmapData.clinicHeadlines.procedures = { completed: 0, target: 116 };
            // Merge target from remote if local still has the default value and remote differs
            if (roadmapData.clinicHeadlines.procedures.target === 116 && data.clinicHeadlines.procedures.target != null && data.clinicHeadlines.procedures.target !== 116) {
                roadmapData.clinicHeadlines.procedures.target = data.clinicHeadlines.procedures.target;
            }
            addMissing(roadmapData.clinicHeadlines.procedures, data.clinicHeadlines.procedures);
        }
        // Merge any other sub-fields that might exist on remote but not locally
        Object.keys(data.clinicHeadlines).forEach(key => {
            if (key !== 'appointments' && key !== 'procedures' && !(key in roadmapData.clinicHeadlines)) {
                roadmapData.clinicHeadlines[key] = data.clinicHeadlines[key];
            }
        });
    }

    // competencyUIState: remote wins (UI preference sync)
    if (data.competencyUIState) {
        if (!roadmapData.competencyUIState) roadmapData.competencyUIState = { expandedCategories: [], viewMode: 'department' };
        if (Array.isArray(data.competencyUIState.expandedCategories) && data.competencyUIState.expandedCategories.length > 0) {
            roadmapData.competencyUIState.expandedCategories = data.competencyUIState.expandedCategories;
        }
        if (data.competencyUIState.viewMode) {
            roadmapData.competencyUIState.viewMode = data.competencyUIState.viewMode;
        }
    }
}

// ==================== FIX 7: CONNECTION MONITOR ====================

function setupConnectionMonitor() {
    if (!database) return;

    connectionMonitorRef = database.ref('.info/connected');
    connectionMonitorRef.on('value', snapshot => {
        const wasConnected = isFirebaseConnected;
        isFirebaseConnected = snapshot.val() === true;

        if (isFirebaseConnected) {
            updateSyncStatus('connected', 'Connected');

            // If we just reconnected (NOT initial load), sync data
            // FIX: Added !isInitialLoad guard to prevent auto-sync racing with loadFromFirebase()
            if (!wasConnected && firebaseSyncEnabled && userPath && !isInitialLoad) {
                forceCloudSync();
            }
        } else {
            updateSyncStatus('offline', 'Offline');
        }
    });
}

// ==================== FIX 6: BACKUP SYSTEM ====================

function createBackup(reason = 'manual') {
    const backup = {
        id: generateId('backup'),
        timestamp: Date.now(),
        reason: reason,
        data: JSON.parse(JSON.stringify(roadmapData)),
        version: roadmapData._version || 1
    };

    // Get existing backups
    let backups = [];
    try {
        const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
        if (stored) {
            backups = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Could not load existing backups:', e);
    }

    // Add new backup and keep only last MAX_BACKUPS
    backups.unshift(backup);
    if (backups.length > MAX_BACKUPS) {
        backups = backups.slice(0, MAX_BACKUPS);
    }

    try {
        safeLocalStorageSet(BACKUP_STORAGE_KEY, JSON.stringify(backups));
        return backup.id;
    } catch (e) {
        console.error('Failed to save backup:', e);
        // If localStorage is full, remove oldest backups
        if (e.name === 'QuotaExceededError') {
            backups = backups.slice(0, 2);
            try {
                safeLocalStorageSet(BACKUP_STORAGE_KEY, JSON.stringify(backups));
                return backup.id;
            } catch (e2) {
                console.error('Still cannot save backup:', e2);
            }
        }
        return null;
    }
}

function getBackups() {
    try {
        const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load backups:', e);
        return [];
    }
}

function restoreBackup(backupId) {
    const backups = getBackups();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
        showToast('❌ Backup not found');
        return false;
    }

    // Create a backup of current state before restoring
    createBackup('pre-restore');

    // Restore the data — field-by-field reconstruction so newer fields get defaults
    // even if the backup predates them (mirrors restoreCheckpoint pattern)
    const bData = backup.data;
    const defaults = getDefaultRoadmapData();
    roadmapData = {
        pedsLockedIn: bData.pedsLockedIn !== undefined ? bData.pedsLockedIn : defaults.pedsLockedIn,
        mandatoryItems: bData.mandatoryItems || defaults.mandatoryItems,
        grades: bData.grades || defaults.grades,
        editedDeadlines: bData.editedDeadlines || {},
        completedDeadlines: bData.completedDeadlines || {},
        customDeadlines: migrateArrayToObject(bData.customDeadlines, 'deadline'),
        deletedDeadlines: migrateArrayToObject(bData.deletedDeadlines, 'deleted'),
        examStudyProgress: bData.examStudyProgress || {},
        monthlyPlanner: {
            notes: migrateArrayToObject(bData.monthlyPlanner?.notes, 'note'),
            customTasks: migrateArrayToObject(bData.monthlyPlanner?.customTasks, 'ctask'),
            overriddenStatic: migrateArrayToObject(bData.monthlyPlanner?.overriddenStatic, 'override'),
            completedTasks: migrateArrayToObject(bData.monthlyPlanner?.completedTasks, 'completed'),
            hiddenClinicTasks: bData.monthlyPlanner?.hiddenClinicTasks ?? defaults.monthlyPlanner.hiddenClinicTasks,
            currentWeekSchedule: bData.monthlyPlanner?.currentWeekSchedule ?? defaults.monthlyPlanner.currentWeekSchedule
        },
        clinicalData: {
            patients: bData.clinicalData?.patients || {},
            appointments: migrateArrayToObject(bData.clinicalData?.appointments, 'appt'),
            completedProcedures: migrateArrayToObject(bData.clinicalData?.completedProcedures, 'proc'),
            competencies: mergeCompetencies(defaults.clinicalData?.competencies, bData.clinicalData?.competencies),
            patientRecords: bData.clinicalData?.patientRecords || defaults.clinicalData.patientRecords,
            dashboardSnapshots: mergeDashboardSnapshots(defaults.clinicalData?.dashboardSnapshots, bData.clinicalData?.dashboardSnapshots),
            missingNotes: bData.clinicalData?.missingNotes ?? defaults.clinicalData.missingNotes,
            autoLinkReviewQueue: Array.isArray(bData.clinicalData?.autoLinkReviewQueue) ? bData.clinicalData.autoLinkReviewQueue : defaults.clinicalData.autoLinkReviewQueue
        },
        todoList: {
            items: bData.todoList?.items || {},
            _nextSeq: bData.todoList?._nextSeq ?? 1,
            lastUpdated: bData.todoList?.lastUpdated ?? null
        },
        dailyPlanner: migrateDailyPlannerBlocks(bData.dailyPlanner || defaults.dailyPlanner),
        exams: migrateArrayToObject(bData.exams, 'exam'),
        graduationPrep: bData.graduationPrep ?? defaults.graduationPrep,
        clinicHeadlines: bData.clinicHeadlines ?? defaults.clinicHeadlines,
        periodicReviews: bData.periodicReviews ? {
            pr2: {
                reviewDate: bData.periodicReviews?.pr2?.reviewDate ?? defaults.periodicReviews.pr2.reviewDate,
                reviewPeriod: bData.periodicReviews?.pr2?.reviewPeriod ?? defaults.periodicReviews.pr2.reviewPeriod,
                dashboardDiscrepancyNotes: bData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? defaults.periodicReviews.pr2.dashboardDiscrepancyNotes,
                adminStatsOverrides: bData.periodicReviews?.pr2?.adminStatsOverrides || {},
                completedProceduresHtml: bData.periodicReviews?.pr2?.completedProceduresHtml ?? defaults.periodicReviews.pr2.completedProceduresHtml,
                inProgressProcedures: bData.periodicReviews?.pr2?.inProgressProcedures || {},
                departmentNotes: bData.periodicReviews?.pr2?.departmentNotes || {},
                subjectiveReport: bData.periodicReviews?.pr2?.subjectiveReport ?? defaults.periodicReviews.pr2.subjectiveReport,
                patientNotes: bData.periodicReviews?.pr2?.patientNotes || {},
                removedPatients: bData.periodicReviews?.pr2?.removedPatients || {},
                lastEdited: bData.periodicReviews?.pr2?.lastEdited ?? defaults.periodicReviews.pr2.lastEdited
            }
        } : defaults.periodicReviews,
        competencyUIState: bData.competencyUIState ?? defaults.competencyUIState,
        lastSaved: bData.lastSaved || Date.now(),
        _version: (bData._version ?? 0) + 1,
        _lastModified: new Date().toISOString(),
        _dataLoaded: true
    };

    // Clear migration flags so migrations re-run against restored data
    localStorage.removeItem('unifiedPatientStoreDone_v1');
    localStorage.removeItem('competencyEnhancementsDone_v1');

    migrateInvalidFirebaseKeys(roadmapData);
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));

    // Save to localStorage and Firebase
    saveData();

    // Re-initialize UI
    initUI();

    showToast('✅ Backup restored from ' + new Date(backup.timestamp).toLocaleString());
    return true;
}

function exportBackup() {
    const exportData = {
        exportedAt: new Date().toISOString(),
        appVersion: 'd3-roadmap-v3',
        data: roadmapData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `d3-roadmap-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📥 Backup exported');
}

function importBackup(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            // Validate the import
            if (!imported.data || !imported.exportedAt) {
                showToast('❌ Invalid backup file');
                return;
            }

            // Create backup of current state
            createBackup('pre-import');

            // Import the data — field-by-field reconstruction so newer fields get defaults
            // even if the imported backup predates them (mirrors restoreBackup pattern)
            const bData = imported.data;
            const defaults = getDefaultRoadmapData();
            roadmapData = {
                pedsLockedIn: bData.pedsLockedIn !== undefined ? bData.pedsLockedIn : defaults.pedsLockedIn,
                mandatoryItems: bData.mandatoryItems || defaults.mandatoryItems,
                grades: bData.grades || defaults.grades,
                editedDeadlines: bData.editedDeadlines || {},
                completedDeadlines: bData.completedDeadlines || {},
                customDeadlines: migrateArrayToObject(bData.customDeadlines, 'deadline'),
                deletedDeadlines: migrateArrayToObject(bData.deletedDeadlines, 'deleted'),
                examStudyProgress: bData.examStudyProgress || {},
                monthlyPlanner: {
                    notes: migrateArrayToObject(bData.monthlyPlanner?.notes, 'note'),
                    customTasks: migrateArrayToObject(bData.monthlyPlanner?.customTasks, 'ctask'),
                    overriddenStatic: migrateArrayToObject(bData.monthlyPlanner?.overriddenStatic, 'override'),
                    completedTasks: migrateArrayToObject(bData.monthlyPlanner?.completedTasks, 'completed'),
                    hiddenClinicTasks: bData.monthlyPlanner?.hiddenClinicTasks ?? defaults.monthlyPlanner.hiddenClinicTasks,
                    currentWeekSchedule: bData.monthlyPlanner?.currentWeekSchedule ?? defaults.monthlyPlanner.currentWeekSchedule
                },
                clinicalData: {
                    patients: bData.clinicalData?.patients || {},
                    appointments: migrateArrayToObject(bData.clinicalData?.appointments, 'appt'),
                    completedProcedures: migrateArrayToObject(bData.clinicalData?.completedProcedures, 'proc'),
                    competencies: mergeCompetencies(defaults.clinicalData?.competencies, bData.clinicalData?.competencies),
                    patientRecords: bData.clinicalData?.patientRecords || defaults.clinicalData.patientRecords,
                    dashboardSnapshots: mergeDashboardSnapshots(defaults.clinicalData?.dashboardSnapshots, bData.clinicalData?.dashboardSnapshots),
                    missingNotes: bData.clinicalData?.missingNotes ?? defaults.clinicalData.missingNotes,
                    autoLinkReviewQueue: Array.isArray(bData.clinicalData?.autoLinkReviewQueue) ? bData.clinicalData.autoLinkReviewQueue : []
                },
                todoList: {
                    items: bData.todoList?.items || {},
                    _nextSeq: bData.todoList?._nextSeq ?? 1,
                    lastUpdated: bData.todoList?.lastUpdated ?? null
                },
                dailyPlanner: migrateDailyPlannerBlocks(bData.dailyPlanner || defaults.dailyPlanner),
                exams: migrateArrayToObject(bData.exams, 'exam'),
                graduationPrep: bData.graduationPrep ?? defaults.graduationPrep,
                clinicHeadlines: bData.clinicHeadlines ?? defaults.clinicHeadlines,
                periodicReviews: bData.periodicReviews ? {
                    pr2: {
                        reviewDate: bData.periodicReviews?.pr2?.reviewDate ?? defaults.periodicReviews.pr2.reviewDate,
                        reviewPeriod: bData.periodicReviews?.pr2?.reviewPeriod ?? defaults.periodicReviews.pr2.reviewPeriod,
                        dashboardDiscrepancyNotes: bData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? defaults.periodicReviews.pr2.dashboardDiscrepancyNotes,
                        adminStatsOverrides: bData.periodicReviews?.pr2?.adminStatsOverrides || {},
                        completedProceduresHtml: bData.periodicReviews?.pr2?.completedProceduresHtml ?? defaults.periodicReviews.pr2.completedProceduresHtml,
                        inProgressProcedures: bData.periodicReviews?.pr2?.inProgressProcedures || {},
                        departmentNotes: bData.periodicReviews?.pr2?.departmentNotes || {},
                        subjectiveReport: bData.periodicReviews?.pr2?.subjectiveReport ?? defaults.periodicReviews.pr2.subjectiveReport,
                        patientNotes: bData.periodicReviews?.pr2?.patientNotes || {},
                        removedPatients: bData.periodicReviews?.pr2?.removedPatients || {},
                        lastEdited: bData.periodicReviews?.pr2?.lastEdited ?? defaults.periodicReviews.pr2.lastEdited
                    }
                } : defaults.periodicReviews,
                lastSaved: bData.lastSaved || Date.now(),
                _version: (bData._version ?? 0) + 1,
                _lastModified: new Date().toISOString(),
                _dataLoaded: true
            };

            migrateInvalidFirebaseKeys(roadmapData);
            clinicalDataDirty = true;
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));

            // Save and refresh
            saveData();
            initUI();

            showToast('✅ Backup imported from ' + imported.exportedAt);
        } catch (err) {
            console.error('Import failed:', err);
            showToast('❌ Failed to import backup');
        }
    };
    reader.readAsText(file);
}

function showBackupManager() {
    const backups = getBackups();

    const modal = document.createElement('div');
    modal.id = 'backupManagerModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    let backupListHtml = backups.length === 0
        ? '<p style="color:#8b949e;text-align:center;">No backups available</p>'
        : backups.map(b => `
            <div style="background:#21262d;padding:12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="color:#e6edf3;font-size:0.9em;">${new Date(b.timestamp).toLocaleString()}</div>
                    <div style="color:#8b949e;font-size:0.75em;">Reason: ${b.reason} | Version: ${b.version || 'N/A'}</div>
                </div>
                <button onclick="restoreBackup('${b.id}'); closeBackupManager();" style="padding:6px 12px;background:#238636;border:none;border-radius:6px;color:white;cursor:pointer;font-size:0.8em;">Restore</button>
            </div>
        `).join('');

    modal.innerHTML = `
        <div style="background:#161b22;border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;border:1px solid #30363d;">
            <h3 style="color:#e6edf3;margin:0 0 16px 0;font-size:1.2em;">📦 Backup Manager</h3>
            <div style="margin-bottom:20px;">
                ${backupListHtml}
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button onclick="createBackup('manual'); closeBackupManager(); showBackupManager();" style="flex:1;padding:10px;background:#238636;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Create Backup</button>
                <button onclick="exportBackup();" style="flex:1;padding:10px;background:#1f6feb;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Export JSON</button>
            </div>
            <div style="margin-top:12px;">
                <label style="display:block;padding:10px;background:#30363d;border:1px dashed #484f58;border-radius:8px;color:#8b949e;text-align:center;cursor:pointer;">
                    📂 Import from file
                    <input type="file" accept=".json" onchange="importBackup(this.files[0]); closeBackupManager();" style="display:none;">
                </label>
            </div>
            <button onclick="closeBackupManager();" style="width:100%;margin-top:16px;padding:10px;background:#30363d;border:1px solid #484f58;border-radius:8px;color:#8b949e;cursor:pointer;">Close</button>
        </div>
    `;

    document.body.appendChild(modal);

    window.closeBackupManager = function() {
        const m = document.getElementById('backupManagerModal');
        if (m) document.body.removeChild(m);
    };
}

// ==================== CONFLICT DETECTION ====================

function markLocalChange() {
    localChangesSinceLastSync = true;
    pendingSaveToast = true;
}

function setLocalUpdateFlag() {
    isLocalUpdate = true;
    // Clear flag after 10 seconds (longer than debounce + slow network latency on poor connections)
    if (localUpdateTimer) clearTimeout(localUpdateTimer);
    localUpdateTimer = setTimeout(() => {
        isLocalUpdate = false;
    }, 10000);
}

// Show conflict resolution modal
function showSyncConflictModal(localData, remoteData, onResolve) {
    const modal = document.createElement('div');
    modal.id = 'syncConflictModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    const localTime = localData.lastSaved ? new Date(localData.lastSaved).toLocaleTimeString() : 'Unknown';
    const remoteTime = remoteData.lastSaved ? new Date(remoteData.lastSaved).toLocaleTimeString() : 'Unknown';

    modal.innerHTML = `
        <div style="background:#161b22;border-radius:16px;padding:24px;max-width:450px;width:90%;border:1px solid #30363d;">
            <h3 style="color:#f0883e;margin:0 0 16px 0;font-size:1.2em;">⚠️ Sync Conflict Detected</h3>
            <p style="color:#8b949e;margin-bottom:20px;">Changes were made on another device. Which version do you want to keep?</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div style="background:#21262d;padding:16px;border-radius:8px;">
                    <div style="color:#58a6ff;font-weight:600;margin-bottom:8px;">📱 This Device</div>
                    <div style="color:#8b949e;font-size:0.85em;">Last saved: ${localTime}</div>
                </div>
                <div style="background:#21262d;padding:16px;border-radius:8px;">
                    <div style="color:#a371f7;font-weight:600;margin-bottom:8px;">☁️ Cloud</div>
                    <div style="color:#8b949e;font-size:0.85em;">Last saved: ${remoteTime}</div>
                </div>
            </div>
            <div style="display:flex;gap:10px;">
                <button onclick="window.resolveSyncConflict('local')" style="flex:1;padding:12px;background:#238636;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Keep This Device</button>
                <button onclick="window.resolveSyncConflict('remote')" style="flex:1;padding:12px;background:#8957e5;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Keep Cloud</button>
            </div>
            <button onclick="window.resolveSyncConflict('merge')" style="width:100%;margin-top:10px;padding:10px;background:#30363d;border:1px solid #484f58;border-radius:8px;color:#8b949e;cursor:pointer;">Try to Merge Both</button>
        </div>
    `;
    document.body.appendChild(modal);
    window.resolveSyncConflict = function(choice) {
        document.body.removeChild(modal);
        delete window.resolveSyncConflict;
        onResolve(choice);
    };
}

// ==================== FIREBASE INIT & AUTH ====================

function initFirebase() {
    // FALLBACK: Ensure UI loads within 3 seconds no matter what
    // CRITICAL: Skip if Firebase is mid-load (awaitingFirebaseLoad flag)
    const fallbackTimer = setTimeout(() => {
        if (awaitingFirebaseLoad || awaitingPinEntry) return;
        if (!document.getElementById('currentDateDisplay').textContent ||
            document.getElementById('currentDateDisplay').textContent === 'Loading...') {
            loadFromLocalStorage();
        }
    }, 3000);

    try {
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase SDK not loaded - running in offline mode');
            clearTimeout(fallbackTimer);
            firebaseSyncEnabled = false;
            updateSyncStatus('offline', 'Offline mode');
            loadFromLocalStorage();
            return;
        }

        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        firebaseInitialized = true;

        // FIX 7: Setup connection monitor
        setupConnectionMonitor();

        // Check for saved PIN (same as Dental Quest uses)
        const savedPin = localStorage.getItem('dentalQuestPin');

        if (savedPin) {
            clearTimeout(fallbackTimer);
            setupUserAuth(savedPin);
        } else {
            clearTimeout(fallbackTimer);
            awaitingPinEntry = true;  // CRITICAL: Block fallback timers while PIN prompt is showing
            setTimeout(() => promptForPin(), 500);
        }
    } catch (error) {
        console.error('❌ Firebase init error:', error);
        clearTimeout(fallbackTimer);
        firebaseSyncEnabled = false;
        updateSyncStatus('offline', 'Init failed');
        loadFromLocalStorage();
    }
}

function setupUserAuth(pin) {
    const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
    currentUser = { uid: hashedPin };
    userPath = 'users/' + hashedPin + '/' + FIREBASE_APP_NAME;
    firebaseSyncEnabled = true;

    // CRITICAL: Mark PIN as validated BEFORE any Firebase operations
    pinValidated = true;
    awaitingPinEntry = false;  // PIN entered — allow fallback timers if Firebase hangs

    updateSyncStatus('syncing', 'Syncing...');

    // Load from Firebase
    loadFromFirebase();
}

function promptForPin() {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';

    const card = document.createElement('div');
    card.style.cssText = 'background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #334155;text-align:center;';

    const heading = document.createElement('h3');
    heading.style.cssText = 'color:#60a5fa;margin:0 0 16px 0;';
    heading.textContent = 'Enter PIN';

    const desc = document.createElement('p');
    desc.style.cssText = 'color:#e2e8f0;margin-bottom:16px;';
    desc.textContent = 'Enter your Dental Quest PIN to sync across devices';

    const pinInputEl = document.createElement('input');
    pinInputEl.type = 'password';
    pinInputEl.id = 'pinInput';
    pinInputEl.placeholder = 'Enter PIN (4+ characters)';
    pinInputEl.style.cssText = 'width:100%;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:1.1em;text-align:center;box-sizing:border-box;margin-bottom:16px;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    const submitBtn = document.createElement('button');
    submitBtn.style.cssText = 'flex:1;padding:12px;background:#3b82f6;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;';
    submitBtn.textContent = 'Connect';

    const skipBtn = document.createElement('button');
    skipBtn.style.cssText = 'flex:1;padding:12px;background:#64748b;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;';
    skipBtn.textContent = 'Skip (Local Only)';

    btnRow.appendChild(submitBtn);
    btnRow.appendChild(skipBtn);
    card.appendChild(heading);
    card.appendChild(desc);
    card.appendChild(pinInputEl);
    card.appendChild(btnRow);
    modal.appendChild(card);
    document.body.appendChild(modal);

    pinInputEl.focus();
    pinInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitBtn.click();
    });
    submitBtn.onclick = () => {
        const pin = pinInputEl.value;
        modal.remove();
        if (pin && pin.length >= 4) {
            safeLocalStorageSet('dentalQuestPin', pin);
            setupUserAuth(pin);
        } else {
            showToast('PIN must be at least 4 characters', 'warning');
            promptForPin();
        }
    };
    skipBtn.onclick = () => {
        modal.remove();
        awaitingPinEntry = false;  // PIN prompt dismissed
        firebaseSyncEnabled = false;
        updateSyncStatus('offline', 'Local only');
        loadFromLocalStorage();
    };
}

// ==================== CONSOLIDATED MERGE ====================
// Replaces 4 duplicated inline merge blocks (loadFromFirebase, setupRealtimeSync,
// applyRemoteData, visibilitychange handler) with a single function.

function mergeRemoteState(data) {
    if (!data) return;

    roadmapData = {
        ...roadmapData,
        pedsLockedIn: data.pedsLockedIn !== undefined ? data.pedsLockedIn : roadmapData.pedsLockedIn,
        mandatoryItems: { ...roadmapData.mandatoryItems, ...(data.mandatoryItems || {}) },
        grades: (() => {
            const merged = {};
            const allCourses = new Set([
                ...Object.keys(roadmapData.grades || {}),
                ...Object.keys(data.grades || {})
            ]);
            allCourses.forEach(courseId => {
                merged[courseId] = (function() {
                    var local = roadmapData.grades?.[courseId] || {};
                    var remote = data.grades?.[courseId] || {};
                    var result = { ...local };
                    // Remote wins for actual values, but null/undefined in remote doesn't wipe local
                    Object.keys(remote).forEach(function(key) {
                        if (remote[key] !== null && remote[key] !== undefined) {
                            result[key] = remote[key];
                        }
                    });
                    return result;
                })();
            });
            return merged;
        })(),
        editedDeadlines: { ...roadmapData.editedDeadlines, ...(data.editedDeadlines || {}) },
        completedDeadlines: { ...roadmapData.completedDeadlines, ...(data.completedDeadlines || {}) },
        customDeadlines: {
            ...migrateArrayToObject(roadmapData.customDeadlines, 'deadline'),
            ...migrateArrayToObject(data.customDeadlines, 'deadline')
        },
        deletedDeadlines: {
            ...migrateArrayToObject(roadmapData.deletedDeadlines, 'deleted'),
            ...migrateArrayToObject(data.deletedDeadlines, 'deleted')
        },
        examStudyProgress: { ...roadmapData.examStudyProgress, ...(data.examStudyProgress || {}) },
        monthlyPlanner: {
            notes: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.notes, 'note'),
                ...migrateArrayToObject(data.monthlyPlanner?.notes, 'note')
            },
            customTasks: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.customTasks, 'ctask'),
                ...migrateArrayToObject(data.monthlyPlanner?.customTasks, 'ctask')
            },
            overriddenStatic: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.overriddenStatic, 'override'),
                ...migrateArrayToObject(data.monthlyPlanner?.overriddenStatic, 'override')
            },
            completedTasks: {
                ...migrateArrayToObject(roadmapData.monthlyPlanner?.completedTasks, 'completed'),
                ...migrateArrayToObject(data.monthlyPlanner?.completedTasks, 'completed')
            },
            hiddenClinicTasks: {
                ...(roadmapData.monthlyPlanner?.hiddenClinicTasks || {}),
                ...(data.monthlyPlanner?.hiddenClinicTasks || {})
            },
            currentWeekSchedule: data.monthlyPlanner?.currentWeekSchedule ?? roadmapData.monthlyPlanner?.currentWeekSchedule ?? {}
        },
        clinicalData: {
            patients: { ...roadmapData.clinicalData?.patients, ...(data.clinicalData?.patients || {}) },
            appointments: {
                ...migrateArrayToObject(roadmapData.clinicalData?.appointments, 'appt'),
                ...migrateArrayToObject(data.clinicalData?.appointments, 'appt')
            },
            completedProcedures: {
                ...migrateArrayToObject(roadmapData.clinicalData?.completedProcedures, 'proc'),
                ...migrateArrayToObject(data.clinicalData?.completedProcedures, 'proc')
            },
            competencies: mergeCompetencies(
                roadmapData.clinicalData?.competencies,
                data.clinicalData?.competencies
            ),
            patientRecords: (function() {
                var local = roadmapData.clinicalData?.patientRecords || {};
                var remote = data.clinicalData?.patientRecords || {};
                var merged = {};
                // Start with all local records
                Object.keys(local).forEach(function(id) { merged[id] = { ...local[id] }; });
                // Add remote records, field-level merge for existing (local wins for conflicts)
                Object.keys(remote).forEach(function(id) {
                    if (!merged[id]) {
                        merged[id] = { ...remote[id] };
                    } else {
                        // Fill missing fields from remote, local wins for conflicts
                        Object.keys(remote[id]).forEach(function(key) {
                            if (merged[id][key] === undefined || merged[id][key] === null || merged[id][key] === '') {
                                merged[id][key] = remote[id][key];
                            }
                        });
                        // Deep merge specific array/object fields
                        if (remote[id].importedRequirements && !merged[id].importedRequirements) {
                            merged[id].importedRequirements = remote[id].importedRequirements;
                        }
                        if (remote[id].briefHistory && !merged[id].briefHistory) {
                            merged[id].briefHistory = remote[id].briefHistory;
                        }
                    }
                });
                return merged;
            })(),
            dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, data.clinicalData?.dashboardSnapshots),
            missingNotes: { ...(roadmapData.clinicalData?.missingNotes || {}), ...(data.clinicalData?.missingNotes || {}) },
            autoLinkReviewQueue: (() => {
                var local = Array.isArray(roadmapData.clinicalData?.autoLinkReviewQueue) ? roadmapData.clinicalData.autoLinkReviewQueue : [];
                var remote = Array.isArray(data.clinicalData?.autoLinkReviewQueue) ? data.clinicalData.autoLinkReviewQueue : [];
                var localIds = new Set(local.map(function(q) { return q.procedureId; }));
                return local.concat(remote.filter(function(q) { return q.procedureId && !localIds.has(q.procedureId); }));
            })()
        },
        todoList: {
            items: (function() {
                var local = roadmapData.todoList?.items || {};
                var remote = data.todoList?.items || {};
                var merged = { ...remote, ...local };  // local wins on conflict
                return merged;
            })(),
            _nextSeq: Math.max(data.todoList?._nextSeq ?? 1, roadmapData.todoList?._nextSeq ?? 1),
            lastUpdated: (roadmapData.todoList?.lastUpdated && data.todoList?.lastUpdated)
                ? (roadmapData.todoList.lastUpdated > data.todoList.lastUpdated ? roadmapData.todoList.lastUpdated : data.todoList.lastUpdated)
                : roadmapData.todoList?.lastUpdated ?? data.todoList?.lastUpdated ?? null
        },
        dailyPlanner: migrateDailyPlannerBlocks(data.dailyPlanner || roadmapData.dailyPlanner),
        exams: {
            ...migrateArrayToObject(roadmapData.exams, 'exam'),
            ...migrateArrayToObject(data.exams, 'exam')
        },
        graduationPrep: data.graduationPrep ? {
            externship: {
                startDate: data.graduationPrep?.externship?.startDate ?? roadmapData.graduationPrep?.externship?.startDate ?? null,
                endDate: data.graduationPrep?.externship?.endDate ?? roadmapData.graduationPrep?.externship?.endDate ?? null,
                patients: data.graduationPrep?.externship?.patients ?? roadmapData.graduationPrep?.externship?.patients ?? {},
                logistics: data.graduationPrep?.externship?.logistics ?? roadmapData.graduationPrep?.externship?.logistics ?? '',
                notes: data.graduationPrep?.externship?.notes ?? roadmapData.graduationPrep?.externship?.notes ?? ''
            },
            cdcaAdex: {
                sessions: data.graduationPrep?.cdcaAdex?.sessions ?? roadmapData.graduationPrep?.cdcaAdex?.sessions ?? {},
                notes: data.graduationPrep?.cdcaAdex?.notes ?? roadmapData.graduationPrep?.cdcaAdex?.notes ?? ''
            },
            inbde: { notes: data.graduationPrep?.inbde?.notes ?? roadmapData.graduationPrep?.inbde?.notes ?? '' },
            jobSearch: { notes: data.graduationPrep?.jobSearch?.notes ?? roadmapData.graduationPrep?.jobSearch?.notes ?? '' }
        } : (roadmapData.graduationPrep || {
            externship: { startDate: null, endDate: null, patients: {}, logistics: '', notes: '' },
            cdcaAdex: { sessions: {}, notes: '' },
            inbde: { notes: '' },
            jobSearch: { notes: '' }
        }),
        clinicHeadlines: data.clinicHeadlines ? {
            appointments: {
                completed: data.clinicHeadlines?.appointments?.completed ?? roadmapData.clinicHeadlines?.appointments?.completed ?? 0,
                target: data.clinicHeadlines?.appointments?.target ?? roadmapData.clinicHeadlines?.appointments?.target ?? 90
            },
            procedures: {
                completed: data.clinicHeadlines?.procedures?.completed ?? roadmapData.clinicHeadlines?.procedures?.completed ?? 0,
                target: data.clinicHeadlines?.procedures?.target ?? roadmapData.clinicHeadlines?.procedures?.target ?? 116
            }
        } : (roadmapData.clinicHeadlines || {
            appointments: { completed: 0, target: 90 },
            procedures: { completed: 0, target: 116 }
        }),
        periodicReviews: data.periodicReviews ? {
            pr2: {
                reviewDate: data.periodicReviews?.pr2?.reviewDate ?? roadmapData.periodicReviews?.pr2?.reviewDate ?? null,
                reviewPeriod: data.periodicReviews?.pr2?.reviewPeriod ?? roadmapData.periodicReviews?.pr2?.reviewPeriod ?? '',
                dashboardDiscrepancyNotes: data.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? roadmapData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? '',
                adminStatsOverrides: { ...(roadmapData.periodicReviews?.pr2?.adminStatsOverrides || {}), ...(data.periodicReviews?.pr2?.adminStatsOverrides || {}) },
                completedProceduresHtml: data.periodicReviews?.pr2?.completedProceduresHtml ?? roadmapData.periodicReviews?.pr2?.completedProceduresHtml ?? '',
                inProgressProcedures: { ...(roadmapData.periodicReviews?.pr2?.inProgressProcedures || {}), ...(data.periodicReviews?.pr2?.inProgressProcedures || {}) },
                departmentNotes: { ...(roadmapData.periodicReviews?.pr2?.departmentNotes || {}), ...(data.periodicReviews?.pr2?.departmentNotes || {}) },
                subjectiveReport: data.periodicReviews?.pr2?.subjectiveReport ?? roadmapData.periodicReviews?.pr2?.subjectiveReport ?? '',
                patientNotes: { ...(roadmapData.periodicReviews?.pr2?.patientNotes || {}), ...(data.periodicReviews?.pr2?.patientNotes || {}) },
                removedPatients: { ...(roadmapData.periodicReviews?.pr2?.removedPatients || {}), ...(data.periodicReviews?.pr2?.removedPatients || {}) },
                lastEdited: data.periodicReviews?.pr2?.lastEdited ?? roadmapData.periodicReviews?.pr2?.lastEdited ?? null
            }
        } : (roadmapData.periodicReviews || getDefaultRoadmapData().periodicReviews),
        competencyUIState: data.competencyUIState ? {
            expandedCategories: Array.isArray(data.competencyUIState.expandedCategories) ? data.competencyUIState.expandedCategories : (roadmapData.competencyUIState?.expandedCategories || []),
            viewMode: data.competencyUIState.viewMode ?? roadmapData.competencyUIState?.viewMode ?? 'department'
        } : (roadmapData.competencyUIState || { expandedCategories: [], viewMode: 'department' }),
        lastSaved: data.lastSaved,
        _version: Math.max(data._version || 0, roadmapData._version || 0),
        _lastModified: data._lastModified || roadmapData._lastModified,
        _dataLoaded: true  // CRITICAL: Always true after merge
    };

    migrateInvalidFirebaseKeys(roadmapData);

    // Mark clinical data as dirty so next initMonthlyPlanner() will re-sync
    clinicalDataDirty = true;
}

// ==================== LOAD DATA ====================

// Load data from localStorage
// @param finalize - if true, also set flags and call initUI (for standalone use)
//                   if false, just load data (caller handles flags/initUI)
function loadFromLocalStorage(finalize = true) {
    let saved = localStorage.getItem(STORAGE_KEY);

    // ONE-TIME MIGRATION: If new key has no data, check old key
    if (!saved) {
        const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldSaved) {
            console.log('[MIGRATION] Migrating localStorage from', OLD_STORAGE_KEY, 'to', STORAGE_KEY);
            saved = oldSaved;
            // Write to new key immediately
            try { safeLocalStorageSet(STORAGE_KEY, oldSaved); } catch(e) {}
        }
    }

    if (saved) {
        try {
            const data = JSON.parse(saved);
            // FIX: Use explicit field merges (matching loadFromFirebase pattern)
            // Avoids raw spread which can propagate localStorage corruption
            roadmapData = {
                ...roadmapData,
                // Explicit field merges for safety (not raw ...data spread)
                pedsLockedIn: data.pedsLockedIn !== undefined ? data.pedsLockedIn : roadmapData.pedsLockedIn,
                mandatoryItems: { ...roadmapData.mandatoryItems, ...(data.mandatoryItems || {}) },
                grades: (() => {
                    const merged = {};
                    const allCourses = new Set([
                        ...Object.keys(roadmapData.grades || {}),
                        ...Object.keys(data.grades || {})
                    ]);
                    allCourses.forEach(courseId => {
                        merged[courseId] = {
                            ...(roadmapData.grades?.[courseId] || {}),
                            ...(data.grades?.[courseId] || {})
                        };
                    });
                    return merged;
                })(),
                editedDeadlines: { ...roadmapData.editedDeadlines, ...(data.editedDeadlines || {}) },
                completedDeadlines: { ...roadmapData.completedDeadlines, ...(data.completedDeadlines || {}) },
                customDeadlines: migrateArrayToObject(data.customDeadlines, 'deadline'),
                deletedDeadlines: migrateArrayToObject(data.deletedDeadlines, 'deleted'),
                examStudyProgress: { ...roadmapData.examStudyProgress, ...(data.examStudyProgress || {}) },
                monthlyPlanner: {
                    notes: migrateArrayToObject(data.monthlyPlanner?.notes, 'note'),
                    customTasks: migrateArrayToObject(data.monthlyPlanner?.customTasks, 'ctask'),
                    overriddenStatic: migrateArrayToObject(data.monthlyPlanner?.overriddenStatic, 'override'),
                    completedTasks: migrateArrayToObject(data.monthlyPlanner?.completedTasks, 'completed'),
                    hiddenClinicTasks: data.monthlyPlanner?.hiddenClinicTasks ?? roadmapData.monthlyPlanner?.hiddenClinicTasks ?? {},
                    currentWeekSchedule: data.monthlyPlanner?.currentWeekSchedule ?? roadmapData.monthlyPlanner?.currentWeekSchedule ?? {}
                },
                clinicalData: {
                    patients: { ...roadmapData.clinicalData?.patients, ...(data.clinicalData?.patients || {}) },
                    appointments: migrateArrayToObject(data.clinicalData?.appointments, 'appt'),
                    completedProcedures: migrateArrayToObject(data.clinicalData?.completedProcedures, 'proc'),
                    competencies: mergeCompetencies(roadmapData.clinicalData?.competencies, data.clinicalData?.competencies),
                    patientRecords: (function() {
                        var defaults = roadmapData.clinicalData?.patientRecords || {};
                        var stored = data.clinicalData?.patientRecords || {};
                        var merged = {};
                        // Start with stored data (localStorage is authoritative)
                        Object.keys(stored).forEach(function(id) {
                            merged[id] = { ...(defaults[id] || {}), ...stored[id] };
                        });
                        // Add any defaults that don't exist in stored
                        Object.keys(defaults).forEach(function(id) {
                            if (!merged[id]) merged[id] = defaults[id];
                        });
                        return merged;
                    })(),
                    dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, data.clinicalData?.dashboardSnapshots),
                    missingNotes: { ...(roadmapData.clinicalData?.missingNotes || {}), ...(data.clinicalData?.missingNotes || {}) },
                    autoLinkReviewQueue: Array.isArray(data.clinicalData?.autoLinkReviewQueue) ? data.clinicalData.autoLinkReviewQueue : (roadmapData.clinicalData?.autoLinkReviewQueue || [])
                },
                todoList: {
                    items: { ...(roadmapData.todoList?.items || {}), ...(data.todoList?.items || {}) },
                    _nextSeq: Math.max(data.todoList?._nextSeq ?? 1, roadmapData.todoList?._nextSeq ?? 1),
                    lastUpdated: data.todoList?.lastUpdated ?? roadmapData.todoList?.lastUpdated ?? null
                },
                dailyPlanner: migrateDailyPlannerBlocks(data.dailyPlanner || roadmapData.dailyPlanner),
                exams: migrateArrayToObject(data.exams, 'exam'),
                graduationPrep: data.graduationPrep ? {
                    externship: {
                        startDate: data.graduationPrep?.externship?.startDate ?? null,
                        endDate: data.graduationPrep?.externship?.endDate ?? null,
                        patients: data.graduationPrep?.externship?.patients ?? {},
                        logistics: data.graduationPrep?.externship?.logistics ?? '',
                        notes: data.graduationPrep?.externship?.notes ?? ''
                    },
                    cdcaAdex: {
                        sessions: data.graduationPrep?.cdcaAdex?.sessions ?? {},
                        notes: data.graduationPrep?.cdcaAdex?.notes ?? ''
                    },
                    inbde: { notes: data.graduationPrep?.inbde?.notes ?? '' },
                    jobSearch: { notes: data.graduationPrep?.jobSearch?.notes ?? '' }
                } : (roadmapData.graduationPrep || {
                    externship: { startDate: null, endDate: null, patients: {}, logistics: '', notes: '' },
                    cdcaAdex: { sessions: {}, notes: '' },
                    inbde: { notes: '' },
                    jobSearch: { notes: '' }
                }),
                clinicHeadlines: data.clinicHeadlines ? {
                    appointments: {
                        completed: data.clinicHeadlines?.appointments?.completed ?? 0,
                        target: data.clinicHeadlines?.appointments?.target ?? 90
                    },
                    procedures: {
                        completed: data.clinicHeadlines?.procedures?.completed ?? 0,
                        target: data.clinicHeadlines?.procedures?.target ?? 116
                    }
                } : (roadmapData.clinicHeadlines || {
                    appointments: { completed: 0, target: 90 },
                    procedures: { completed: 0, target: 116 }
                }),
                periodicReviews: data.periodicReviews ? {
                    pr2: {
                        reviewDate: data.periodicReviews?.pr2?.reviewDate ?? roadmapData.periodicReviews?.pr2?.reviewDate ?? null,
                        reviewPeriod: data.periodicReviews?.pr2?.reviewPeriod ?? roadmapData.periodicReviews?.pr2?.reviewPeriod ?? '',
                        dashboardDiscrepancyNotes: data.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? roadmapData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? '',
                        adminStatsOverrides: { ...(roadmapData.periodicReviews?.pr2?.adminStatsOverrides || {}), ...(data.periodicReviews?.pr2?.adminStatsOverrides || {}) },
                        completedProceduresHtml: data.periodicReviews?.pr2?.completedProceduresHtml ?? roadmapData.periodicReviews?.pr2?.completedProceduresHtml ?? '',
                        inProgressProcedures: { ...(roadmapData.periodicReviews?.pr2?.inProgressProcedures || {}), ...(data.periodicReviews?.pr2?.inProgressProcedures || {}) },
                        departmentNotes: { ...(roadmapData.periodicReviews?.pr2?.departmentNotes || {}), ...(data.periodicReviews?.pr2?.departmentNotes || {}) },
                        subjectiveReport: data.periodicReviews?.pr2?.subjectiveReport ?? roadmapData.periodicReviews?.pr2?.subjectiveReport ?? '',
                        patientNotes: { ...(roadmapData.periodicReviews?.pr2?.patientNotes || {}), ...(data.periodicReviews?.pr2?.patientNotes || {}) },
                        removedPatients: { ...(roadmapData.periodicReviews?.pr2?.removedPatients || {}), ...(data.periodicReviews?.pr2?.removedPatients || {}) },
                        lastEdited: data.periodicReviews?.pr2?.lastEdited ?? roadmapData.periodicReviews?.pr2?.lastEdited ?? null
                    }
                } : (roadmapData.periodicReviews || getDefaultRoadmapData().periodicReviews),
                competencyUIState: data.competencyUIState ? {
                    expandedCategories: Array.isArray(data.competencyUIState.expandedCategories) ? data.competencyUIState.expandedCategories : [],
                    viewMode: data.competencyUIState.viewMode ?? 'department'
                } : (roadmapData.competencyUIState || { expandedCategories: [], viewMode: 'department' }),
                lastSaved: data.lastSaved || roadmapData.lastSaved,
                _version: data._version ?? roadmapData._version ?? 0,
                _lastModified: data._lastModified ?? roadmapData._lastModified ?? null
            };
        } catch (e) {
            console.error('❌ Failed to parse localStorage data:', e);
            // Don't crash - continue with defaults
        }
    }

    // CRITICAL FIX: Always set _dataLoaded = true after loading from localStorage
    // This was causing saves to be blocked when Firebase was disabled or failed
    roadmapData._dataLoaded = true;

    // Migrate any keys with Firebase-invalid characters (# / . $ [ ])
    migrateInvalidFirebaseKeys(roadmapData);

    // Mark clinical data as dirty so first initMonthlyPlanner() will sync
    clinicalDataDirty = true;

    // If finalize=true, we're the terminal loading function (no Firebase)
    // Set all flags and call initUI
    if (finalize) {
        hasLoadedFromCloud = true;  // We've "checked" cloud (or decided not to use it)
        isInitialLoad = false;      // Initial load is complete
        lastSyncTimestamp = Date.now(); // FIX: Initialize so conflict detection works on first Sync click
        initUI();
    }
}

function loadFromFirebase() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        loadFromLocalStorage();
        return;
    }

    // CRITICAL: Block fallback timers while Firebase is loading
    awaitingFirebaseLoad = true;

    // SAFETY VALVE: If Firebase doesn't respond within 15s, give up and load locally
    firebaseTimeoutTimer = setTimeout(() => {
        if (awaitingFirebaseLoad) {
            console.error('[GRAD-LOAD] 15s timeout: Firebase never responded, falling back to localStorage');
            awaitingFirebaseLoad = false;
            loadFromLocalStorage();
        }
    }, 15000);

    // One-time load from new path first
    database.ref(userPath).once('value')
        .then(snapshot => {
            let data = snapshot.val();

            if (data) {
                // Data exists at new path — proceed normally
                finishFirebaseLoad(data);
            } else {
                // ONE-TIME MIGRATION: No data at new path — check old path
                const hashedPin = userPath.split('/')[1];
                const oldPath = 'users/' + hashedPin + '/' + OLD_FIREBASE_APP_NAME;
                console.log('[MIGRATION] No data at new path, checking old path:', oldPath);

                database.ref(oldPath).once('value')
                    .then(oldSnapshot => {
                        const oldData = oldSnapshot.val();
                        if (oldData) {
                            console.log('[MIGRATION] Found data at old Firebase path — migrating to', userPath);
                            data = oldData;
                            // Write migrated data to new path immediately
                            database.ref(userPath).set(oldData)
                                .then(() => console.log('[MIGRATION] Firebase migration complete'))
                                .catch(e => console.error('[MIGRATION] Firebase write failed:', e));
                        }
                        finishFirebaseLoad(data);
                    })
                    .catch(e => {
                        console.error('[MIGRATION] Old path read failed:', e);
                        finishFirebaseLoad(null);
                    });
                return; // finishFirebaseLoad called asynchronously above
            }
        })
        .catch(error => {
            console.error('❌ Firebase load error:', error);
            awaitingFirebaseLoad = false;
            if (firebaseTimeoutTimer) { clearTimeout(firebaseTimeoutTimer); firebaseTimeoutTimer = null; }
            updateSyncStatus('error', 'Load failed');
            loadFromLocalStorage();
        });
}

// Extracted from loadFromFirebase to avoid duplication with migration path
function finishFirebaseLoad(data) {
    // CRITICAL: Clear Firebase load flag + cancel timeout timer
    awaitingFirebaseLoad = false;
    if (firebaseTimeoutTimer) { clearTimeout(firebaseTimeoutTimer); firebaseTimeoutTimer = null; }

    let localWasNewer = false;

    if (data) {
        // FIX: If Firebase data exists but is effectively empty (poisoned defaults),
        // treat as no data — don't merge defaults over real local data
        if (isEmptyState(data)) {
            console.log('[GRAD-LOAD] Firebase data exists but isEmptyState=true — treating as no data');
            loadFromLocalStorage(false);
            updateSyncStatus('connected', 'Synced');
            // If local has real data, push it to Firebase to replace the poisoned defaults
            if (!isEmptyState(roadmapData)) {
                localWasNewer = true;
            }
        } else {
            // CRITICAL FIX: Load localStorage FIRST so local-only changes are preserved
            loadFromLocalStorage(false);

            // BUG 2 FIX: Compare timestamps — only merge Firebase if it's same-age or newer
            const localLastSaved = roadmapData.lastSaved || 0;
            const remoteLastSaved = data.lastSaved || 0;

            if (localLastSaved > remoteLastSaved) {
                console.log('[GRAD-LOAD] Local data is newer:', localLastSaved, '>', remoteLastSaved, '— keeping local, filling in remote-only entries');
                // FIX: Don't just skip the merge — add remote-only collection entries
                // This handles: Chrome imports notes/todos → saves to Firebase → DuckDuckGo has newer localStorage
                // Without this, DuckDuckGo's data (missing notes/todos) overwrites Firebase
                mergeRemoteCollectionsIntoLocal(data);
                clinicalDataDirty = true;
                roadmapData._dataLoaded = true;
                migrateInvalidFirebaseKeys(roadmapData);
                localWasNewer = true;
            } else {
                mergeRemoteState(data);
            }

            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            updateSyncStatus('connected', 'Synced');
        }
    } else {
        loadFromLocalStorage(false);
        updateSyncStatus('connected', 'Synced');
        // If local has real data but Firebase was empty, push to Firebase
        if (!isEmptyState(roadmapData)) {
            localWasNewer = true;
        }
    }

    // SET ALL FLAGS FIRST — before any rendering
    hasLoadedFromCloud = true;
    isInitialLoad = false;
    roadmapData._dataLoaded = true;
    lastSyncTimestamp = Date.now();

    // THEN render (in try/catch so flags are ALWAYS set even if rendering crashes)
    try {
        initUI();
    } catch (e) {
        console.error('[GRAD-LOAD] initUI error after Firebase load:', e);
    }

    // FIX: If local data was newer than Firebase (or Firebase was empty/poisoned),
    // push local data to cloud so other devices (incognito, new phone) get the latest
    if (localWasNewer && !isEmptyState(roadmapData)) {
        console.log('[GRAD-LOAD] Pushing local data to Firebase (local was newer or Firebase was empty)');
        setTimeout(() => {
            if (hasLoadedFromCloud && !isInitialLoad && roadmapData._dataLoaded) {
                saveData();
            }
        }, 500);
    }

    // Set up sync listeners (in try/catch to not block on errors)
    try {
        setupRealtimeSync();
        setupMainAppTasksSync();
    } catch (e) {
        console.error('[GRAD-LOAD] Sync setup error:', e);
    }
}

// ==================== REALTIME SYNC ====================

// Real-time sync listener for cross-device updates
function setupRealtimeSync() {
    if (!firebaseSyncEnabled || !database || !userPath) return;

    // Remove any existing listener
    if (realtimeSyncRef) {
        realtimeSyncRef.off();
    }

    realtimeSyncRef = database.ref(userPath);

    realtimeSyncRef.on('value', snapshot => {
        const data = snapshot.val();
        if (!data) return;

        // FIX 4: Skip processing if this is a local update
        if (isLocalUpdate) {
            return;
        }

        // FIX: Skip during "Keep This Device" grace period to prevent
        // cloud echo from overwriting local data before write completes
        if (Date.now() - lastKeepLocalTime < KEEP_LOCAL_GRACE_MS) {
            return;
        }

        // Skip during initial load (we handle this separately)
        if (isInitialLoad) {
            return;
        }

        // Skip if cloud data is empty
        if (isEmptyState(data)) {
            return;
        }

        // Only update if this is a newer save from another device
        const remoteLastSaved = data.lastSaved || 0;
        const localLastSaved = roadmapData.lastSaved || 0;

        // If remote is newer by at least 1 second, update
        if (remoteLastSaved > localLastSaved + 1000 && remoteLastSaved > lastRemoteUpdate) {
            lastRemoteUpdate = remoteLastSaved;

            // Use consolidated merge function
            mergeRemoteState(data);
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));

            // Re-render all tabs (initUI rebuilds deadlines[] from roadmapData)
            try {
                initUI();
            } catch (e) {
                console.error('Realtime sync re-render error:', e);
            }

            updateSyncStatus('connected', 'Synced');
            showToast('📡 Updated from another device');
        }
    }, error => {
        // FIXED: Add error handler for realtime sync failures
        console.error('Realtime sync error:', error);
        updateSyncStatus('error', 'Sync connection lost');
        // Try to reconnect after 5 seconds
        setTimeout(() => {
            if (firebaseSyncEnabled && database && userPath) {
                setupRealtimeSync();
            }
        }, 5000);
    });

}

// ==================== CROSS-APP SYNC: MAIN APP TASKS ====================
// Syncs "Do Today" tasks from the main Dental Quest app

function setupMainAppTasksSync() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        updateDoTodaySyncStatus('error', 'Not connected');
        renderDoTodayTasks();
        return;
    }

    // Get the main app data path (same user, different app path)
    const hashedPin = userPath.split('/')[1]; // Extract user_XXX from 'users/user_XXX/graduationRoadmap'
    const mainAppPath = 'users/' + hashedPin + '/appData/tasks';

    // Remove any existing listener
    if (mainAppTasksRef) {
        mainAppTasksRef.off();
    }

    updateDoTodaySyncStatus('syncing', 'Syncing with main app...');

    mainAppTasksRef = database.ref(mainAppPath);

    // Set up real-time listener
    mainAppTasksRef.on('value', snapshot => {
        const tasks = snapshot.val();
        mainAppTasks = ensureArray(tasks, []);
        updateDoTodaySyncStatus('connected', 'Live sync active');
        renderDoTodayTasks();
    }, error => {
        console.error('Main app tasks sync error:', error);
        mainAppTasks = []; // Clear stale data so widget shows empty state, not old cached tasks
        updateDoTodaySyncStatus('error', 'Sync failed');
        renderDoTodayTasks();
    });
}

function updateDoTodaySyncStatus(status, message) {
    const statusEl = document.getElementById('doTodaySyncStatus');
    if (!statusEl) return;

    statusEl.className = 'do-today-sync-status ' + status;

    if (status === 'connected') {
        statusEl.innerHTML = '<span class="sync-dot"></span> 🟢 ' + message;
    } else if (status === 'syncing') {
        statusEl.innerHTML = '<span class="sync-dot"></span> ' + message;
    } else if (status === 'error') {
        statusEl.innerHTML = '<span class="sync-dot"></span> 🔴 ' + message;
    } else {
        statusEl.innerHTML = '<span class="sync-dot"></span> ' + message;
    }
}

function renderDoTodayTasks() {
    const listEl = document.getElementById('doTodayTasksList');
    const countEl = document.getElementById('doTodayCount');
    if (!listEl) return;

    // Filter for doToday tasks (exclude completed ones)
    const doTodayTasks = mainAppTasks.filter(t => t.doToday === true && !t.completed);

    // Update count badge
    if (countEl) {
        countEl.textContent = doTodayTasks.length;
        countEl.classList.toggle('empty', doTodayTasks.length === 0);
    }

    // Empty state
    if (doTodayTasks.length === 0) {
        listEl.innerHTML = `
            <div class="do-today-empty">
                <div class="do-today-empty-icon">✨</div>
                <div>No "Must Do Today" tasks!</div>
                <div style="font-size: 0.85em; color: #9ca3af; margin-top: 5px;">
                    Add tasks in the main app and mark them as "Do Today"
                </div>
                <a href="https://suleman7-dmd.github.io/dental-quest/" target="_blank" class="do-today-open-main">
                    Open Main App →
                </a>
            </div>
        `;
        return;
    }

    // Sort by id (recent first)
    const sorted = [...doTodayTasks].sort((a, b) => {
        return (b.id || 0) - (a.id || 0);
    });

    // Category display names
    const categoryNames = {
        financial: '💰 Financial',
        clinic: '🦷 Clinic',
        health: '❤️ Health',
        school: '📋 School',
        academic: '📚 Academic',
        future: '🚀 Future',
        life: '🏡 Life'
    };

    listEl.innerHTML = sorted.map(task => `
        <div class="do-today-item ${task.completed ? 'completed' : ''}"
             onclick="toggleMainAppTask('${task.id}')">
            <div class="do-today-checkbox">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="do-today-content">
                <div class="do-today-text">${escapeHtml(task.text || 'Untitled task')}</div>
                <div class="do-today-meta">
                    <span class="do-today-category">${categoryNames[task.category] || task.category || 'Task'}</span>
                    ${task.xp ? `<span class="do-today-xp">+${task.xp} XP</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function toggleMainAppTask(taskId) {
    if (!firebaseSyncEnabled || !database || !userPath) {
        showToast('Not connected - cannot update', '⚠️');
        return;
    }

    // Find the task
    const taskIndex = mainAppTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        showToast('Task not found', '⚠️');
        return;
    }

    const task = mainAppTasks[taskIndex];
    const newCompleted = !task.completed;

    // Update locally for immediate feedback
    mainAppTasks[taskIndex].completed = newCompleted;
    renderDoTodayTasks();

    // Update in Firebase (main app's data path) — targeted write, not full collection overwrite
    const hashedPin = userPath.split('/')[1];
    const mainAppPath = 'users/' + hashedPin + '/appData/tasks/' + task.id + '/completed';

    database.ref(mainAppPath).set(newCompleted)
        .then(() => {
            if (newCompleted) {
                showToast('Task completed!');
            } else {
                showToast('Task reopened');
            }
        })
        .catch(error => {
            console.error('Error updating main app task:', error);
            showToast('Failed to save', 'error');
            // Revert local change
            mainAppTasks[taskIndex].completed = !newCompleted;
            renderDoTodayTasks();
        });
}

// ==================== END CROSS-APP SYNC ====================

// ==================== FORCE CLOUD SYNC ====================

// Force sync from cloud - manual refresh button
function forceCloudSync() {
    // FIXED: Add debounce to prevent rapid clicking (2 second cooldown)
    const now = Date.now();
    if (now - lastForceSync < 2000) {
        showToast('Please wait before syncing again');
        return;
    }
    lastForceSync = now;

    if (!firebaseSyncEnabled || !database || !userPath) {
        showToast('❌ Not connected to cloud');
        updateSyncStatus('offline', 'Not connected');
        return;
    }

    updateSyncStatus('syncing', 'Fetching from cloud...');

    // FIX 6: Create backup before syncing to prevent data loss
    createBackup('pre-sync');

    database.ref(userPath).once('value')
        .then(snapshot => {
            const remoteData = snapshot.val();
            if (!remoteData) {
                showToast('No cloud data found');
                updateSyncStatus('connected', 'No cloud data');
                return;
            }

            // Check for conflicts — ALWAYS show modal if local changes exist
            // FIX: Removed lastSyncTimestamp && remoteData.lastSaved > lastSyncTimestamp checks
            // Those conditions prevented the conflict modal from appearing when lastSyncTimestamp
            // was null (first sync) or when the local save hadn't reached Firebase yet
            if (localChangesSinceLastSync) {
                showSyncConflictModal(roadmapData, remoteData, (choice) => {
                    if (choice === 'local') {
                        // FIX: Set grace period BEFORE saveData so visibility handler
                        // and realtime listener won't overwrite local state while
                        // the Firebase write is still in flight
                        lastKeepLocalTime = Date.now();
                        saveData();
                        showToast('✅ Kept local data, pushed to cloud', '📱');
                    } else if (choice === 'remote') {
                        applyRemoteData(remoteData);
                        showToast('✅ Synced from cloud');
                    } else if (choice === 'merge') {
                        const merged = deepMerge(remoteData, roadmapData);
                        merged.lastSaved = Date.now();
                        lastKeepLocalTime = Date.now();
                        // Sanitize merged data
                        migrateInvalidFirebaseKeys(merged);
                        applyRemoteData(merged);
                        saveData();
                        showToast('✅ Merged data from both devices');
                    }
                    localChangesSinceLastSync = false;
                    lastSyncTimestamp = Date.now();
                });
                return;
            }

            applyRemoteData(remoteData);
            localChangesSinceLastSync = false;
            lastSyncTimestamp = Date.now();
            updateSyncStatus('connected', 'Synced');
            showToast('✅ Synced from cloud');
        })
        .catch(err => {
            console.error('Force sync failed:', err);
            updateSyncStatus('error', 'Sync failed');
            showToast('❌ Sync failed: ' + err.message);
        });
}

// Helper to apply remote data to local state
// FIXED: Use explicit merge pattern (matching other merge locations) instead of deepMerge
function applyRemoteData(data) {
    mergeRemoteState(data);
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    initUI();
}

// ==================== CHECKPOINT SYSTEM ====================

function getCheckpointKey() {
    const pin = localStorage.getItem('dentalQuestPin') || 'default';
    // Check new key first, fall back to old key for migration
    const newKey = `gradRoadmap_checkpoints_${btoa(pin).replace(/[^a-zA-Z0-9]/g, '')}`;
    const oldKey = `d3roadmap_checkpoints_${btoa(pin).replace(/[^a-zA-Z0-9]/g, '')}`;
    // One-time migration: if old key exists and new doesn't, copy over
    if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
        try { localStorage.setItem(newKey, localStorage.getItem(oldKey)); } catch(e) {}
    }
    return newKey;
}

function getDataCountForCheckpoint(data) {
    const tasks = getCount(data?.monthlyPlanner?.customTasks) || 0;
    const appointments = getCount(data?.clinicalData?.appointments) || 0;
    const deadlines = getCount(data?.customDeadlines) || 0;
    const blocks = getCount(data?.dailyPlanner?.blocks) || 0;
    const notes = getCount(data?.monthlyPlanner?.notes) || 0;
    const patients = getCount(data?.clinicalData?.patients) || 0;
    return `${tasks} tasks, ${appointments} appts, ${deadlines} deadlines, ${blocks} blocks, ${notes} notes, ${patients} patients`;
}

function createCheckpoint(customName = null) {
    if (isEmptyState(roadmapData)) {
        showToast('Cannot create checkpoint - no data to save');
        return null;
    }

    // 60s dedup: skip if last checkpoint with same name was created < 60s ago
    var existingCheckpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    var dedupName = customName || 'Manual';
    if (existingCheckpoints.length > 0) {
        var last = existingCheckpoints[0];
        var elapsed = Date.now() - (last.timestamp || 0);
        if (elapsed < 60000 && last.name === dedupName) {
            console.log('[CHECKPOINT] Skipping dedup — last checkpoint was ' + Math.round(elapsed/1000) + 's ago');
            return null;
        }
    }

    const timestamp = Date.now();
    const date = new Date().toISOString();
    const name = customName || `Checkpoint ${new Date().toLocaleString()}`;

    const checkpoint = {
        id: `checkpoint_${timestamp}_${Math.random().toString(36).substr(2, 6)}`,
        name: name,
        timestamp: timestamp,
        date: date,
        dataCount: getDataCountForCheckpoint(roadmapData),
        data: JSON.parse(JSON.stringify(roadmapData))
    };

    let checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    checkpoints.unshift(checkpoint);

    // Keep max 5 checkpoints
    if (checkpoints.length > 5) {
        checkpoints.splice(5);
    }

    safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints));

    // FIXED: Also save to Firebase for cross-device access
    if (firebaseSyncEnabled && database && userPath) {
        const cloudCheckpointPath = userPath + '/checkpoints/' + checkpoint.id;
        // Clean checkpoint data before saving
        const cleanCheckpoint = JSON.parse(JSON.stringify(checkpoint));
        if (cleanCheckpoint.data) {
            delete cleanCheckpoint.data._dataLoaded;
        }
        database.ref(cloudCheckpointPath).set(cleanCheckpoint)
            .catch(err => {
                console.error('Failed to save checkpoint to cloud:', err);
            });
    }

    showToast(`✅ Checkpoint created: ${name}`);

    return checkpoint;
}

async function showCheckpointManager() {
    // Get local checkpoints
    let checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');

    // FIXED: Also get cloud checkpoints for cross-device access
    if (firebaseSyncEnabled && database && userPath) {
        try {
            const snapshot = await database.ref(userPath + '/checkpoints').once('value');
            const cloudCheckpoints = snapshot.val();
            if (cloudCheckpoints) {
                const cloudList = Object.values(cloudCheckpoints);
                // Merge: add cloud checkpoints not in local (by ID)
                const localIds = new Set(checkpoints.map(c => c.id));
                cloudList.forEach(cc => {
                    if (cc && cc.id && !localIds.has(cc.id)) {
                        checkpoints.push(cc);
                    }
                });
                // Sort by timestamp descending
                checkpoints.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                // Save merged list back to localStorage (keep max 50)
                safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints.slice(0, 5)));
            }
        } catch (err) {
            console.error('Failed to load cloud checkpoints:', err);
        }
    }

    // Remove existing modal if any
    document.querySelector('.checkpoint-modal-overlay')?.remove();

    const modal = document.createElement('div');
    modal.className = 'checkpoint-modal-overlay';
    modal.innerHTML = `
        <div class="checkpoint-modal">
            <div class="checkpoint-modal-header">
                <h2>📂 Checkpoint Manager</h2>
                <button class="close-btn" onclick="this.closest('.checkpoint-modal-overlay').remove()">✕</button>
            </div>
            <div class="checkpoint-modal-body">
                ${checkpoints.length === 0 ?
                    '<p style="color: #888; text-align: center; padding: 40px;">No checkpoints yet. Create one first!</p>' :
                    `<p style="color: #888; margin-bottom: 16px;">${checkpoints.length} checkpoint(s) saved</p>
                    <div class="checkpoint-list">
                        ${checkpoints.map((cp, i) => `
                            <div class="checkpoint-item">
                                <div class="checkpoint-info">
                                    <strong>${escapeHtmlForCheckpoint(cp.name)}</strong>
                                    <span class="checkpoint-date">${new Date(cp.date).toLocaleString()}</span>
                                    <span class="checkpoint-data">${cp.dataCount}</span>
                                </div>
                                <div class="checkpoint-actions">
                                    <button class="restore-btn" onclick="restoreCheckpoint(${i})">Restore</button>
                                    <button class="export-btn" onclick="exportCheckpoint(${i})">Export</button>
                                    <button class="delete-btn" onclick="deleteCheckpoint(${i})">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
            </div>
            <div class="checkpoint-modal-footer">
                <button class="import-btn" onclick="importCheckpoint()">📥 Import</button>
                <button class="export-all-btn" onclick="exportAllCheckpoints()">📤 Export All</button>
                <button class="restore-direct-btn" onclick="importAndRestoreDirectly()" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">🔄 Restore from File</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function escapeHtmlForCheckpoint(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function restoreCheckpoint(index) {
    const checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    const checkpoint = checkpoints[index];

    if (!checkpoint) {
        showToast('Checkpoint not found');
        return;
    }

    showCustomConfirm(
        `Restore checkpoint?\n\nName: ${escapeHtml(checkpoint.name)}\nDate: ${new Date(checkpoint.date).toLocaleString()}\nData: ${checkpoint.dataCount}\n\nThis will OVERWRITE your current data.\nA backup of current data will be created first.`,
        function() {
            // Backup current state first
            createCheckpoint(`Pre-restore backup (${new Date().toLocaleString()})`);

            // Restore checkpoint - explicitly restore each field (no raw spread)
            const cpData = checkpoint.data;
            roadmapData = {
                pedsLockedIn: cpData.pedsLockedIn !== undefined ? cpData.pedsLockedIn : roadmapData.pedsLockedIn,
                mandatoryItems: cpData.mandatoryItems || roadmapData.mandatoryItems || {},
                grades: cpData.grades || roadmapData.grades || {},
                editedDeadlines: cpData.editedDeadlines || {},
                completedDeadlines: cpData.completedDeadlines || {},
                customDeadlines: migrateArrayToObject(cpData.customDeadlines, 'deadline'),
                deletedDeadlines: migrateArrayToObject(cpData.deletedDeadlines, 'deleted'),
                examStudyProgress: cpData.examStudyProgress || {},
                monthlyPlanner: {
                    notes: migrateArrayToObject(cpData.monthlyPlanner?.notes, 'note'),
                    customTasks: migrateArrayToObject(cpData.monthlyPlanner?.customTasks, 'ctask'),
                    overriddenStatic: migrateArrayToObject(cpData.monthlyPlanner?.overriddenStatic, 'override'),
                    completedTasks: migrateArrayToObject(cpData.monthlyPlanner?.completedTasks, 'completed'),
                    hiddenClinicTasks: cpData.monthlyPlanner?.hiddenClinicTasks ?? roadmapData.monthlyPlanner?.hiddenClinicTasks ?? {},
                    currentWeekSchedule: cpData.monthlyPlanner?.currentWeekSchedule ?? roadmapData.monthlyPlanner?.currentWeekSchedule ?? {}
                },
                clinicalData: {
                    patients: cpData.clinicalData?.patients || {},
                    appointments: migrateArrayToObject(cpData.clinicalData?.appointments, 'appt'),
                    completedProcedures: migrateArrayToObject(cpData.clinicalData?.completedProcedures, 'proc'),
                    competencies: mergeCompetencies(roadmapData.clinicalData?.competencies, cpData.clinicalData?.competencies),
                    patientRecords: cpData.clinicalData?.patientRecords || roadmapData.clinicalData?.patientRecords || {},
                    dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, cpData.clinicalData?.dashboardSnapshots),
                    missingNotes: cpData.clinicalData?.missingNotes ?? roadmapData.clinicalData?.missingNotes ?? {},
                    autoLinkReviewQueue: Array.isArray(cpData.clinicalData?.autoLinkReviewQueue) ? cpData.clinicalData.autoLinkReviewQueue : (roadmapData.clinicalData?.autoLinkReviewQueue || [])
                },
                todoList: {
                    items: { ...(roadmapData.todoList?.items || {}), ...(cpData.todoList?.items || {}) },
                    _nextSeq: Math.max(cpData.todoList?._nextSeq ?? 1, roadmapData.todoList?._nextSeq ?? 1),
                    lastUpdated: cpData.todoList?.lastUpdated ?? roadmapData.todoList?.lastUpdated ?? null
                },
                dailyPlanner: migrateDailyPlannerBlocks(cpData.dailyPlanner || roadmapData.dailyPlanner),
                exams: migrateArrayToObject(cpData.exams, 'exam'),
                graduationPrep: cpData.graduationPrep ?? roadmapData.graduationPrep ?? {
                    externship: { startDate: null, endDate: null, patients: {}, logistics: '', notes: '' },
                    cdcaAdex: { sessions: {}, notes: '' },
                    inbde: { notes: '' },
                    jobSearch: { notes: '' }
                },
                clinicHeadlines: cpData.clinicHeadlines ?? roadmapData.clinicHeadlines ?? {
                    appointments: { completed: 0, target: 90 },
                    procedures: { completed: 0, target: 116 }
                },
                periodicReviews: cpData.periodicReviews ? {
                    pr2: {
                        reviewDate: cpData.periodicReviews?.pr2?.reviewDate ?? roadmapData.periodicReviews?.pr2?.reviewDate ?? null,
                        reviewPeriod: cpData.periodicReviews?.pr2?.reviewPeriod ?? roadmapData.periodicReviews?.pr2?.reviewPeriod ?? '',
                        dashboardDiscrepancyNotes: cpData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? roadmapData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? '',
                        adminStatsOverrides: { ...(roadmapData.periodicReviews?.pr2?.adminStatsOverrides || {}), ...(cpData.periodicReviews?.pr2?.adminStatsOverrides || {}) },
                        completedProceduresHtml: cpData.periodicReviews?.pr2?.completedProceduresHtml ?? roadmapData.periodicReviews?.pr2?.completedProceduresHtml ?? '',
                        inProgressProcedures: { ...(roadmapData.periodicReviews?.pr2?.inProgressProcedures || {}), ...(cpData.periodicReviews?.pr2?.inProgressProcedures || {}) },
                        departmentNotes: { ...(roadmapData.periodicReviews?.pr2?.departmentNotes || {}), ...(cpData.periodicReviews?.pr2?.departmentNotes || {}) },
                        subjectiveReport: cpData.periodicReviews?.pr2?.subjectiveReport ?? roadmapData.periodicReviews?.pr2?.subjectiveReport ?? '',
                        patientNotes: { ...(roadmapData.periodicReviews?.pr2?.patientNotes || {}), ...(cpData.periodicReviews?.pr2?.patientNotes || {}) },
                        removedPatients: { ...(roadmapData.periodicReviews?.pr2?.removedPatients || {}), ...(cpData.periodicReviews?.pr2?.removedPatients || {}) },
                        lastEdited: cpData.periodicReviews?.pr2?.lastEdited ?? roadmapData.periodicReviews?.pr2?.lastEdited ?? null
                    }
                } : (roadmapData.periodicReviews || getDefaultRoadmapData().periodicReviews),
                competencyUIState: cpData.competencyUIState ?? roadmapData.competencyUIState ?? { expandedCategories: [], viewMode: 'department' },
                lastSaved: cpData.lastSaved || Date.now(),
                _version: (cpData._version ?? 0) + 1,
                _lastModified: new Date().toISOString(),
                _dataLoaded: true
            };

            // Clear migration flags so migrations re-run against restored data
            localStorage.removeItem('unifiedPatientStoreDone_v1');
            localStorage.removeItem('competencyEnhancementsDone_v1');

            migrateInvalidFirebaseKeys(roadmapData);
            clinicalDataDirty = true;
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            setLocalUpdateFlag();
            saveData();
            initUI();
            document.querySelector('.checkpoint-modal-overlay')?.remove();
            showToast('Restored: ' + checkpoint.name);
        },
        null,
        'Restore Checkpoint'
    );
}

function deleteCheckpoint(index) {
    showCustomConfirm(
        'Delete this checkpoint?',
        function() {
            const checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
            const checkpoint = checkpoints[index];
            checkpoints.splice(index, 1);
            safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints));

            // Also delete from Firebase
            if (checkpoint && checkpoint.id && firebaseSyncEnabled && database && userPath) {
                database.ref(userPath + '/checkpoints/' + checkpoint.id).remove()
                    .catch(err => console.error('Failed to delete cloud checkpoint:', err));
            }

            // Refresh modal
            document.querySelector('.checkpoint-modal-overlay')?.remove();
            showCheckpointManager();

            showToast('Checkpoint deleted');
        },
        null,
        'Delete Checkpoint'
    );
}

function exportCheckpoint(index) {
    const checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    const checkpoint = checkpoints[index];

    if (!checkpoint) return;

    const blob = new Blob([JSON.stringify(checkpoint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `d3-roadmap-checkpoint-${checkpoint.name.replace(/[^a-z0-9]/gi, '-')}-${new Date(checkpoint.date).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Checkpoint exported');
}

function exportAllCheckpoints() {
    const checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');

    if (checkpoints.length === 0) {
        showToast('No checkpoints to export');
        return;
    }

    const exportData = {
        _format: 'checkpoint_backup_v1',
        _app: 'd3-roadmap',
        _exportDate: new Date().toISOString(),
        currentState: JSON.parse(JSON.stringify(roadmapData)),
        checkpoints: checkpoints
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `d3-roadmap-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`📤 Full backup exported (${checkpoints.length} checkpoints)`);
}

// Validate d3-roadmap data structure
function isValidAppData(data) {
    if (!data || typeof data !== 'object') return false;
    // Valid if has ANY of these d3-roadmap structures
    return !!(
        data.customDeadlines ||
        data.monthlyPlanner ||
        data.clinicalData ||
        data.dailyPlanner ||
        data.exams ||
        data.courses ||
        data.grades ||
        data.editedDeadlines ||
        data.mandatoryItems
    );
}

function importCheckpoint() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                let checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');

                // ============================================
                // FLEXIBLE FORMAT DETECTION
                // ============================================

                // Format 1: Array of checkpoints
                if (Array.isArray(imported)) {
                    imported.forEach(cp => {
                        if (cp.id && cp.data) checkpoints.unshift(cp);
                        else if (cp.state) checkpoints.unshift({ ...cp, data: cp.state });
                    });
                    showToast(`📥 Imported ${imported.length} checkpoints`);
                }
                // Format 2: Full backup with checkpoints array
                else if (imported.checkpoints && Array.isArray(imported.checkpoints)) {
                    imported.checkpoints.forEach(cp => {
                        if (cp.data || cp.state) {
                            checkpoints.unshift(cp.data ? cp : { ...cp, data: cp.state });
                        }
                    });
                    showToast(`📥 Imported ${imported.checkpoints.length} checkpoints`);
                }
                // Format 3: Single checkpoint with proper structure (id + data)
                else if (imported.id && imported.data) {
                    checkpoints.unshift(imported);
                    showToast(`📥 Imported: ${imported.name || 'checkpoint'}`);
                }
                // Format 4: Single checkpoint with state key
                else if (imported.name && imported.state) {
                    checkpoints.unshift({ ...imported, data: imported.state });
                    showToast(`📥 Imported: ${imported.name}`);
                }
                // Format 5: Raw d3-roadmap data (direct export)
                else if (isValidAppData(imported)) {
                    const newCheckpoint = {
                        id: `checkpoint_${Date.now()}_imported`,
                        name: `Imported: ${file.name}`,
                        timestamp: Date.now(),
                        date: new Date().toISOString(),
                        dataCount: getDataCountForCheckpoint(imported),
                        data: imported
                    };
                    checkpoints.unshift(newCheckpoint);
                    showToast(`📥 Imported raw data as checkpoint`);
                }
                // Format 6: Data nested under common keys
                else if (imported.roadmapData || imported.state || imported.data || imported.appState) {
                    const data = imported.roadmapData || imported.state || imported.data || imported.appState;
                    if (isValidAppData(data)) {
                        const newCheckpoint = {
                            id: `checkpoint_${Date.now()}_imported`,
                            name: `Imported: ${file.name}`,
                            timestamp: Date.now(),
                            date: new Date().toISOString(),
                            dataCount: getDataCountForCheckpoint(data),
                            data: data
                        };
                        checkpoints.unshift(newCheckpoint);
                        showToast(`📥 Imported nested data as checkpoint`);
                    } else {
                        throw new Error('Data structure not recognized');
                    }
                }
                // Format 7: currentState from full backup
                else if (imported.currentState && isValidAppData(imported.currentState)) {
                    const newCheckpoint = {
                        id: `checkpoint_${Date.now()}_imported`,
                        name: `Imported: ${file.name}`,
                        timestamp: Date.now(),
                        date: new Date().toISOString(),
                        dataCount: getDataCountForCheckpoint(imported.currentState),
                        data: imported.currentState
                    };
                    checkpoints.unshift(newCheckpoint);
                    showToast(`📥 Imported backup as checkpoint`);
                }
                else {
                    console.error('Unrecognized format. Keys found:', Object.keys(imported));
                    throw new Error('Unrecognized file format. Check console for details.');
                }

                // Keep max 5 checkpoints
                checkpoints = checkpoints.slice(0, 5);
                safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints));

                document.querySelector('.checkpoint-modal-overlay')?.remove();
                showCheckpointManager();

            } catch (err) {
                console.error('Import error:', err);
                showToast('❌ Import failed: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function importAndRestoreDirectly() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            // Find the actual data
            let data = imported;
            if (imported.currentState) data = imported.currentState;
            if (imported.state) data = imported.state;
            if (imported.data) data = imported.data;
            if (imported.roadmapData) data = imported.roadmapData;
            if (imported.appState) data = imported.appState;

            if (!isValidAppData(data)) {
                showToast('❌ No valid data found in file');
                return;
            }

            const dataCount = getDataCountForCheckpoint(data);

            showCustomConfirm(
                `Restore data from "${escapeHtml(file.name)}"?\n\nData found: ${dataCount}\n\nThis will OVERWRITE your current data.\nA backup will be created first.`,
                function() {
                    createCheckpoint('Auto-backup before direct restore');

                    roadmapData = {
                        pedsLockedIn: data.pedsLockedIn !== undefined ? data.pedsLockedIn : 33.3,
                        mandatoryItems: data.mandatoryItems || getDefaultRoadmapData().mandatoryItems,
                        grades: data.grades || getDefaultRoadmapData().grades,
                        editedDeadlines: data.editedDeadlines || {},
                        completedDeadlines: data.completedDeadlines || {},
                        customDeadlines: migrateArrayToObject(data.customDeadlines, 'deadline'),
                        deletedDeadlines: migrateArrayToObject(data.deletedDeadlines, 'deleted'),
                        examStudyProgress: data.examStudyProgress || {},
                        monthlyPlanner: {
                            notes: migrateArrayToObject(data.monthlyPlanner?.notes, 'note'),
                            customTasks: migrateArrayToObject(data.monthlyPlanner?.customTasks, 'ctask'),
                            overriddenStatic: migrateArrayToObject(data.monthlyPlanner?.overriddenStatic, 'override'),
                            completedTasks: migrateArrayToObject(data.monthlyPlanner?.completedTasks, 'completed'),
                            hiddenClinicTasks: data.monthlyPlanner?.hiddenClinicTasks ?? roadmapData.monthlyPlanner?.hiddenClinicTasks ?? {},
                            currentWeekSchedule: data.monthlyPlanner?.currentWeekSchedule ?? roadmapData.monthlyPlanner?.currentWeekSchedule ?? {}
                        },
                        clinicalData: {
                            patients: data.clinicalData?.patients || {},
                            appointments: migrateArrayToObject(data.clinicalData?.appointments, 'appt'),
                            completedProcedures: migrateArrayToObject(data.clinicalData?.completedProcedures, 'proc'),
                            competencies: mergeCompetencies(roadmapData.clinicalData?.competencies, data.clinicalData?.competencies),
                            patientRecords: data.clinicalData?.patientRecords || roadmapData.clinicalData?.patientRecords || {},
                            dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, data.clinicalData?.dashboardSnapshots),
                            missingNotes: data.clinicalData?.missingNotes ?? roadmapData.clinicalData?.missingNotes ?? {},
                            autoLinkReviewQueue: Array.isArray(data.clinicalData?.autoLinkReviewQueue) ? data.clinicalData.autoLinkReviewQueue : (roadmapData.clinicalData?.autoLinkReviewQueue || [])
                        },
                        todoList: {
                            items: { ...(roadmapData.todoList?.items || {}), ...(data.todoList?.items || {}) },
                            _nextSeq: Math.max(data.todoList?._nextSeq ?? 1, roadmapData.todoList?._nextSeq ?? 1),
                            lastUpdated: data.todoList?.lastUpdated ?? roadmapData.todoList?.lastUpdated ?? null
                        },
                        dailyPlanner: migrateDailyPlannerBlocks(data.dailyPlanner || getDefaultRoadmapData().dailyPlanner),
                        exams: migrateArrayToObject(data.exams, 'exam'),
                        graduationPrep: data.graduationPrep ?? roadmapData.graduationPrep ?? {
                            externship: { startDate: null, endDate: null, patients: {}, logistics: '', notes: '' },
                            cdcaAdex: { sessions: {}, notes: '' },
                            inbde: { notes: '' },
                            jobSearch: { notes: '' }
                        },
                        clinicHeadlines: data.clinicHeadlines ?? roadmapData.clinicHeadlines ?? {
                            appointments: { completed: 0, target: 90 },
                            procedures: { completed: 0, target: 116 }
                        },
                        periodicReviews: data.periodicReviews ? {
                            pr2: {
                                reviewDate: data.periodicReviews?.pr2?.reviewDate ?? roadmapData.periodicReviews?.pr2?.reviewDate ?? null,
                                reviewPeriod: data.periodicReviews?.pr2?.reviewPeriod ?? roadmapData.periodicReviews?.pr2?.reviewPeriod ?? '',
                                dashboardDiscrepancyNotes: data.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? roadmapData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? '',
                                adminStatsOverrides: { ...(roadmapData.periodicReviews?.pr2?.adminStatsOverrides || {}), ...(data.periodicReviews?.pr2?.adminStatsOverrides || {}) },
                                completedProceduresHtml: data.periodicReviews?.pr2?.completedProceduresHtml ?? roadmapData.periodicReviews?.pr2?.completedProceduresHtml ?? '',
                                inProgressProcedures: { ...(roadmapData.periodicReviews?.pr2?.inProgressProcedures || {}), ...(data.periodicReviews?.pr2?.inProgressProcedures || {}) },
                                departmentNotes: { ...(roadmapData.periodicReviews?.pr2?.departmentNotes || {}), ...(data.periodicReviews?.pr2?.departmentNotes || {}) },
                                subjectiveReport: data.periodicReviews?.pr2?.subjectiveReport ?? roadmapData.periodicReviews?.pr2?.subjectiveReport ?? '',
                                patientNotes: { ...(roadmapData.periodicReviews?.pr2?.patientNotes || {}), ...(data.periodicReviews?.pr2?.patientNotes || {}) },
                                removedPatients: { ...(roadmapData.periodicReviews?.pr2?.removedPatients || {}), ...(data.periodicReviews?.pr2?.removedPatients || {}) },
                                lastEdited: data.periodicReviews?.pr2?.lastEdited ?? roadmapData.periodicReviews?.pr2?.lastEdited ?? null
                            }
                        } : (roadmapData.periodicReviews || getDefaultRoadmapData().periodicReviews),
                        competencyUIState: data.competencyUIState ?? roadmapData.competencyUIState ?? { expandedCategories: [], viewMode: 'department' },
                        lastSaved: data.lastSaved || Date.now(),
                        _version: (data._version ?? 0) + 1,
                        _lastModified: new Date().toISOString(),
                        _dataLoaded: true
                    };

                    // Clear migration flags so migrations re-run against restored data
                    localStorage.removeItem('unifiedPatientStoreDone_v1');
                    localStorage.removeItem('competencyEnhancementsDone_v1');

                    migrateInvalidFirebaseKeys(roadmapData);
                    clinicalDataDirty = true;
                    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
                    setLocalUpdateFlag();
                    saveData();

                    showToast('Data restored from file');
                    document.querySelector('.checkpoint-modal-overlay')?.remove();
                    initUI();
                },
                null,
                'Restore from File'
            );

        } catch (err) {
            console.error('Direct restore error:', err);
            showToast('❌ Restore failed: ' + err.message);
        }
    };

    input.click();
}

// ==================== FORCE UPLOAD / FORCE PULL ====================

function forceUploadToCloud() {
    if (isEmptyState(roadmapData)) {
        showToast('Cannot force upload - no data');
        return;
    }

    const dataCount = getDataCountForCheckpoint(roadmapData);

    showCustomConfirm(
        `FORCE UPLOAD TO CLOUD\n\nThis will make THIS device's data the master version.\nAll other devices will receive this data.\n\nCurrent data: ${dataCount}\n\nThis OVERWRITES cloud data.`,
        function() {
            showUploadConfirmModal(async function() {
                createCheckpoint('Pre-force-upload backup');

                roadmapData._version = (roadmapData._version || 0) + 1;
                roadmapData._lastModified = new Date().toISOString();
                roadmapData.lastSaved = Date.now();

                updateSyncStatus('syncing', 'Uploading...');

                try {
                    if (!firebaseSyncEnabled) {
                        throw new Error('Firebase sync not enabled. Try refreshing the page.');
                    }
                    if (!database) {
                        throw new Error('Database not initialized. Try refreshing the page.');
                    }
                    if (!userPath) {
                        throw new Error('User path not set. Please enter your PIN again.');
                    }

                    let cleanData = JSON.parse(JSON.stringify(roadmapData));
                    delete cleanData._dataLoaded;
                    cleanData = sanitizeFirebaseData(cleanData);

                    setLocalUpdateFlag();

                    await database.ref(userPath).set(cleanData);
                    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
                    updateSyncStatus('connected', 'Force uploaded');
                    showToast('Force upload complete!');
                } catch (err) {
                    console.error('Force upload failed:', err);
                    updateSyncStatus('error', 'Upload failed');
                    const errorMsg = err.message || 'Unknown error';
                    showCustomAlert('Force upload failed:\n\n' + errorMsg + '\n\nPlease check:\n1. Internet connection\n2. Try refreshing the page\n3. Re-enter your PIN if prompted', 'Upload Failed');
                }
            });
        },
        null,
        'Force Upload'
    );
}

function showUploadConfirmModal(onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10002;';

    const card = document.createElement('div');
    card.style.cssText = 'background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #334155;text-align:center;';

    const heading = document.createElement('h3');
    heading.style.cssText = 'color:#f59e0b;margin:0 0 16px 0;';
    heading.textContent = 'Confirm Upload';

    const desc = document.createElement('p');
    desc.style.cssText = 'color:#e2e8f0;margin-bottom:16px;';
    desc.textContent = 'Type UPLOAD (in capital letters) to confirm:';

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'UPLOAD';
    inputEl.style.cssText = 'width:100%;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:1.1em;text-align:center;box-sizing:border-box;margin-bottom:16px;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    const confirmBtn = document.createElement('button');
    confirmBtn.style.cssText = 'flex:1;padding:12px;background:#f59e0b;border:none;border-radius:8px;color:#1e293b;font-weight:600;cursor:pointer;';
    confirmBtn.textContent = 'Upload';

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = 'flex:1;padding:12px;background:#64748b;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;';
    cancelBtn.textContent = 'Cancel';

    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(cancelBtn);
    card.appendChild(heading);
    card.appendChild(desc);
    card.appendChild(inputEl);
    card.appendChild(btnRow);
    modal.appendChild(card);
    document.body.appendChild(modal);

    inputEl.focus();
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmBtn.click();
    });
    confirmBtn.onclick = () => {
        if (inputEl.value !== 'UPLOAD') {
            showToast('You must type UPLOAD exactly', 'warning');
            return;
        }
        modal.remove();
        onConfirm();
    };
    cancelBtn.onclick = () => {
        modal.remove();
        showToast('Cancelled');
    };
}

function forcePullFromCloud() {
    showCustomConfirm(
        'FORCE PULL FROM CLOUD\n\nThis will OVERWRITE this device\'s data with cloud data.\nA checkpoint will be created first.',
        async function() {
            if (!isEmptyState(roadmapData)) {
                createCheckpoint('Pre-force-pull backup');
            }

            updateSyncStatus('syncing', 'Pulling...');

            try {
                if (!firebaseSyncEnabled) {
                    throw new Error('Firebase sync not enabled. Try refreshing the page.');
                }
                if (!database) {
                    throw new Error('Database not initialized. Try refreshing the page.');
                }
                if (!userPath) {
                    throw new Error('User path not set. Please enter your PIN again.');
                }

                const snapshot = await database.ref(userPath).once('value');
                const cloudData = snapshot.val();

                if (!cloudData || isEmptyState(cloudData)) {
                    showToast('Cloud has no data', 'warning');
                    updateSyncStatus('connected', 'Connected');
                    return;
                }

                applyRemoteData(cloudData);
                roadmapData._dataLoaded = true;

                updateSyncStatus('connected', 'Pulled');
                showToast('Force pull complete! ' + getDataCountForCheckpoint(roadmapData));
            } catch (err) {
                console.error('Force pull failed:', err);
                updateSyncStatus('error', 'Pull failed');
                const errorMsg = err.message || 'Unknown error';
                showCustomAlert('Force pull failed:\n\n' + errorMsg + '\n\nPlease check:\n1. Internet connection\n2. Try refreshing the page\n3. Re-enter your PIN if prompted', 'Pull Failed');
            }
        },
        null,
        'Force Pull'
    );
}

// ==================== SAVE DATA ====================

// Diagnostic: log all guard values for debugging save failures
function debugSaveState() {
    const guardValues = {
        isInitialLoad: isInitialLoad,
        hasLoadedFromCloud: hasLoadedFromCloud,
        isEmptyState: isEmptyState(roadmapData),
        _dataLoaded: roadmapData._dataLoaded,
        pinValidated: pinValidated,
        firebaseSyncEnabled: firebaseSyncEnabled,
        userPath: !!userPath,
        database: !!database,
        localChangesSinceLastSync: localChangesSinceLastSync,
        lastSyncTimestamp: lastSyncTimestamp,
        lastSaveTime: lastSaveTime,
        isLocalUpdate: isLocalUpdate,
        editedDeadlines: getCount(roadmapData.editedDeadlines),
        customDeadlines: getCount(roadmapData.customDeadlines),
        completedDeadlines: getCount(roadmapData.completedDeadlines),
        deletedDeadlines: getCount(roadmapData.deletedDeadlines),
        lastSaved: roadmapData.lastSaved,
        _version: roadmapData._version
    };
    console.log('[D3-SAVE] 🔍 Debug save state:', guardValues);
    return guardValues;
}

// ==================== STRUCTURAL INTEGRITY VALIDATOR ====================
// Circuit breaker: checks that all critical top-level fields exist before allowing save.
// If a merge/restore accidentally dropped a field, this blocks the save instead of
// persisting the truncated state and causing permanent data loss.
function validateStateIntegrity(data) {
    const errors = [];
    // Check top-level structure
    if (typeof data !== 'object' || data === null) {
        errors.push('roadmapData is not an object');
        return errors;
    }
    // Check critical nested structures exist (not necessarily populated — just not deleted)
    if (typeof data.clinicalData !== 'object' || data.clinicalData === null) {
        errors.push('clinicalData missing');
    } else {
        // clinicalData sub-fields must be objects (not undefined)
        if (typeof data.clinicalData.patients !== 'object') errors.push('clinicalData.patients missing');
        if (typeof data.clinicalData.appointments !== 'object') errors.push('clinicalData.appointments missing');
        if (typeof data.clinicalData.completedProcedures !== 'object') errors.push('clinicalData.completedProcedures missing');
        // patientRecords can be {} but must exist
        if (data.clinicalData.patientRecords === undefined) errors.push('clinicalData.patientRecords missing');
        // dashboardSnapshots must be array
        if (!Array.isArray(data.clinicalData.dashboardSnapshots) && data.clinicalData.dashboardSnapshots !== undefined) {
            // Not fatal if undefined (will default to []), but object would be corrupt
            if (typeof data.clinicalData.dashboardSnapshots === 'object' && data.clinicalData.dashboardSnapshots !== null) {
                errors.push('clinicalData.dashboardSnapshots is object, not array');
            }
        }
    }
    if (typeof data.monthlyPlanner !== 'object' || data.monthlyPlanner === null) {
        errors.push('monthlyPlanner missing');
    }
    if (typeof data.graduationPrep !== 'object' || data.graduationPrep === null) {
        errors.push('graduationPrep missing');
    }
    if (typeof data.clinicHeadlines !== 'object' || data.clinicHeadlines === null) {
        errors.push('clinicHeadlines missing');
    }
    if (typeof data.grades !== 'object' || data.grades === null) {
        errors.push('grades missing');
    }
    // todoList must be object (not undefined) — can be empty
    if (data.todoList !== undefined && (typeof data.todoList !== 'object' || data.todoList === null)) {
        errors.push('todoList is not an object');
    }
    // periodicReviews can be undefined (defaults) or object — reject anything else
    if (data.periodicReviews !== undefined && data.periodicReviews !== null && typeof data.periodicReviews !== 'object') {
        console.error('[GUARD-F] periodicReviews is not an object');
        errors.push('periodicReviews is not an object');
    }
    // clinicalData.missingNotes can be undefined (defaults) or object — reject anything else
    if (data.clinicalData?.missingNotes !== undefined && data.clinicalData.missingNotes !== null && typeof data.clinicalData.missingNotes !== 'object') {
        console.error('[GUARD-F] clinicalData.missingNotes is not an object');
        errors.push('clinicalData.missingNotes is not an object');
    }
    // competencies can be null (default) or object — only reject if it's something else
    if (data.clinicalData?.competencies !== undefined && data.clinicalData.competencies !== null && typeof data.clinicalData.competencies !== 'object') {
        console.error('[GUARD-F] clinicalData.competencies is not an object');
        errors.push('clinicalData.competencies is not an object');
    }
    // autoLinkReviewQueue must be array if present
    if (data.clinicalData?.autoLinkReviewQueue !== undefined && !Array.isArray(data.clinicalData.autoLinkReviewQueue)) {
        console.error('[GUARD-F] clinicalData.autoLinkReviewQueue is not an array');
        errors.push('clinicalData.autoLinkReviewQueue is not an array');
    }
    // competencyUIState must be object if present
    if (data.competencyUIState !== undefined && data.competencyUIState !== null && typeof data.competencyUIState !== 'object') {
        console.error('[GUARD-F] competencyUIState is not an object');
        errors.push('competencyUIState is not an object');
    }
    return errors;
}

// Save data with debounce - BULLETPROOF VERSION
function saveData() {
    // Log all guard values for diagnostics
    debugSaveState();
    // ============================================
    // SYNC PROTECTION GUARDS - PREVENTS DATA WIPE
    // ============================================

    // GUARD A: Never save during initial load
    if (isInitialLoad) {
        console.warn('[D3-SAVE] ⚠️ BLOCKED by Guard A: isInitialLoad =', isInitialLoad);
        return false;
    }

    // GUARD B: Never save if we haven't loaded cloud data yet
    if (!hasLoadedFromCloud) {
        console.warn('[D3-SAVE] ⚠️ BLOCKED by Guard B: hasLoadedFromCloud =', hasLoadedFromCloud);
        return false;
    }

    // GUARD C: Never save empty state
    if (isEmptyState(roadmapData)) {
        console.warn('[D3-SAVE] ⚠️ BLOCKED by Guard C: isEmptyState =', isEmptyState(roadmapData));
        return false;
    }

    // GUARD D: Verify we have real data loaded
    if (!roadmapData._dataLoaded) {
        console.warn('[D3-SAVE] ⚠️ BLOCKED by Guard D: _dataLoaded =', roadmapData._dataLoaded);
        return false;
    }

    // GUARD E: Never save to Firebase if PIN not validated (race condition prevention)
    if (firebaseSyncEnabled && !pinValidated) {
        console.warn('[D3-SAVE] ⚠️ BLOCKED by Guard E: pinValidated =', pinValidated, 'firebaseSyncEnabled =', firebaseSyncEnabled);
        return false;
    }

    // GUARD F: Structural integrity check — block save if critical fields were dropped
    const integrityErrors = validateStateIntegrity(roadmapData);
    if (integrityErrors.length > 0) {
        console.error('[GRAD-SAVE] ⚠️ BLOCKED by Guard F: structural integrity check failed:', integrityErrors);
        return false;
    }

    // All guards passed — safe to save
    console.log('[GRAD-SAVE] ✅ All guards passed. editedDeadlines:', getCount(roadmapData.editedDeadlines),
        'customDeadlines:', getCount(roadmapData.customDeadlines),
        'completedDeadlines:', getCount(roadmapData.completedDeadlines),
        'deletedDeadlines:', getCount(roadmapData.deletedDeadlines));

    // Mark that local changes exist (for conflict detection)
    markLocalChange();

    const now = Date.now();
    roadmapData.lastSaved = now;

    // Version control for conflict detection (FIX 2)
    roadmapData._version = (roadmapData._version || 0) + 1;
    roadmapData._lastModified = new Date().toISOString();

    // Always save to localStorage IMMEDIATELY
    try {
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    } catch (e) {
        console.error('localStorage save failed:', e);
    }

    // Debounce Firebase saves (300ms) but allow immediate if it's been > 2 seconds
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }

    const timeSinceLastSave = now - lastSaveTime;
    const delay = timeSinceLastSave > 2000 ? 0 : 300;

    if (firebaseSyncEnabled && database && userPath) {
        updateSyncStatus('syncing', 'Saving...');

        // FIX 4: Set flag to prevent realtime listener from processing this save
        setLocalUpdateFlag();

        saveDebounceTimer = setTimeout(() => {
            lastSaveTime = Date.now();

            try {
                // FIXED: Clean data before Firebase write
                // JSON.parse(JSON.stringify()) strips undefined values that Firebase rejects
                let cleanData = JSON.parse(JSON.stringify(roadmapData));
                // Remove internal flags that shouldn't be in Firebase
                delete cleanData._dataLoaded;
                // CRITICAL FIX: Sanitize ALL keys to prevent Firebase InvalidKey throws
                cleanData = sanitizeFirebaseData(cleanData);

                database.ref(userPath).set(cleanData)
                    .then(() => {
                        updateSyncStatus('connected', 'Synced');
                        if (pendingSaveToast) {
                            pendingSaveToast = false;
                            showToast('Saved to cloud');
                        }
                    })
                    .catch(error => {
                        console.error('❌ Firebase save error:', error);
                        updateSyncStatus('error', 'Save failed - retrying...');
                        showToast('Save failed — retrying...', 'error');
                        // Retry once after 2 seconds
                        setTimeout(() => {
                            try {
                                if (firebaseSyncEnabled && database && userPath) {
                                    // FIX: Set local update flag for retry to prevent
                                    // realtime listener from processing the retry echo
                                    setLocalUpdateFlag();
                                    let retryData = JSON.parse(JSON.stringify(roadmapData));
                                    delete retryData._dataLoaded;
                                    retryData = sanitizeFirebaseData(retryData);
                                    database.ref(userPath).set(retryData)
                                        .then(() => {
                                            updateSyncStatus('connected', 'Synced');
                                        })
                                        .catch(e => {
                                            console.error('Retry failed:', e);
                                            showToast('Save retry failed', 'error');
                                        });
                                }
                            } catch (retryErr) {
                                console.error('❌ Retry threw:', retryErr);
                            }
                        }, 2000);
                    });
            } catch (syncError) {
                console.error('❌ Firebase .set() threw synchronously:', syncError);
                updateSyncStatus('error', 'Save error: ' + syncError.message);
            }
        }, delay);
    }

    return true;
}

// ==================== EVENT LISTENERS ====================
// These register at parse time but only fire on events (safe for module loading)

// Handle visibility changes - save when hiding, refresh when showing - WITH GUARDS
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // Tab is being hidden - ensure data is saved immediately
        // GUARD: Full guard suite — must match saveData() guards to prevent saving defaults
        if (!isInitialLoad && hasLoadedFromCloud && roadmapData._dataLoaded && !isEmptyState(roadmapData)
            && pinValidated && validateStateIntegrity(roadmapData).length === 0) {
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            if (firebaseSyncEnabled && database && userPath) {
                // FIX: Set local update flag to prevent realtime listener from re-processing this write
                setLocalUpdateFlag();
                // FIXED: Clean data before Firebase write
                let cleanData = JSON.parse(JSON.stringify(roadmapData));
                delete cleanData._dataLoaded;
                // CRITICAL FIX: Sanitize keys to prevent Firebase InvalidKey throws
                cleanData = sanitizeFirebaseData(cleanData);
                database.ref(userPath).set(cleanData)
                    .catch(err => console.error('Save on hide failed:', err));
            }
        }
    } else if (document.visibilityState === 'visible') {
        // Tab is visible again - refresh from Firebase
        // GUARD: Only refresh if we've completed initial load
        // FIX: Skip cloud refresh if local changes are pending (prevents overwriting unsaved work)
        // FIX: Skip during "Keep This Device" grace period to prevent stale cloud data overwrite
        if (firebaseSyncEnabled && database && userPath && !isInitialLoad && !localChangesSinceLastSync && (Date.now() - lastKeepLocalTime >= KEEP_LOCAL_GRACE_MS)) {
            database.ref(userPath).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();

                        // GUARD: Skip empty cloud data
                        if (isEmptyState(data)) {
                            return;
                        }

                        // BUG 3 FIX: Only apply Firebase data if it's actually NEWER than local
                        // Prevents stale cloud data from overwriting recent local changes
                        if (data.lastSaved && data.lastSaved > (roadmapData.lastSaved || 0) + 1000) {
                            mergeRemoteState(data);
                            initUI();
                            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
                        }
                    }
                })
                .catch(err => console.error('Refresh on visible failed:', err));
        }
    }
});

// Save on page unload to prevent data loss during debounce window - WITH GUARDS
window.addEventListener('beforeunload', function() {
    // GUARD: Full guard suite — must match saveData() guards to prevent saving defaults
    if (!isInitialLoad && hasLoadedFromCloud && roadmapData._dataLoaded && !isEmptyState(roadmapData)
        && pinValidated && validateStateIntegrity(roadmapData).length === 0) {
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    }
});
