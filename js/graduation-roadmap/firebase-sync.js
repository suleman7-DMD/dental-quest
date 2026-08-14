// ==================== D3 ROADMAP: FIREBASE SYNC ====================
// This file owns the persisted-state lifecycle for graduation-roadmap.
//
// Read it in four passes:
// 1. Boot/auth: initFirebase(), promptForPin(), loadFromFirebase(), finishFirebaseLoad()
// 2. Merge/reconstruction: reconstructState(), mergeRemoteState(), mergeRemoteCollectionsIntoLocal()
// 3. Realtime/refresh: setupRealtimeSync(), visibilitychange handlers, cross-app task sync
// 4. Persistence/recovery: saveData(), checkpoints, force upload/pull, backup import/export
//
// Core invariant:
// Never let empty/default state reach Firebase before localStorage + cloud have both been
// considered. saveData()'s guard suite is the last line of defense against data wipe bugs.

// ==================== MODULE VARIABLES ====================

// Connection monitoring
let isFirebaseConnected = false;
let connectionMonitorRef = null;

// Backup system (localStorage backups removed — Firebase is the backup)
// Constants kept for one-time cleanup of legacy data
const BACKUP_STORAGE_KEY = 'graduationRoadmapBackup';
const OLD_BACKUP_STORAGE_KEY = 'd3RoadmapBackup';

// Checkpoint cache. Canonical storage is Firebase when available; when created offline,
// checkpoints live here for the rest of the session so restore/export UI still works.
let _cachedCheckpoints = [];

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

// ==================== UNIFIED STATE RECONSTRUCTION ====================
// Single source of truth for building roadmapData from any external source.
// Replaces 5 near-identical inline reconstruction blocks, so new persisted fields
// usually only need to be wired here instead of at every load/restore/import site.
//
// Strategies:
//   'remote-wins'  — mergeRemoteState: source overwrites scalars, spread-merges collections,
//                     mergeCompetencies(fallback, source), per-patient field-level merge,
//                     todoList local wins ({...source, ...fallback})
//   'stored-wins'  — loadFromLocalStorage: same as remote-wins EXCEPT collections use
//                     migrateArrayToObject(source) only (no fallback spread), simpler
//                     patientRecords, todoList stored wins ({...fallback, ...source})
//   'source-wins'  — restoreCheckpoint/importBackup/importAndRestoreDirectly: source wins
//                     unconditionally, mergeCompetencies(source, fallback), no per-patient
//                     field-level merge, _version increments instead of Math.max
//
// @param {Object} source - Data to load (Firebase, localStorage, checkpoint, backup)
// @param {Object} options
// @param {string} options.strategy - 'remote-wins' | 'stored-wins' | 'source-wins'
// @param {Object} options.fallback - What to use when source is missing a field
// @returns {Object} A new roadmapData object
function reconstructState(source, options) {
    var s = source || {};
    var f = options.fallback || {};
    var strategy = options.strategy || 'source-wins';
    var isRemoteWins = (strategy === 'remote-wins');
    var isStoredWins = (strategy === 'stored-wins');
    var isSourceWins = (strategy === 'source-wins');
    var isMerge = isRemoteWins || isStoredWins;
    var defaults = getDefaultRoadmapData();

    // Merge strategies spread fallback to preserve unknown fields;
    // source-wins starts clean (restore = full replacement)
    var result = isMerge ? { ...f } : {};

    // --- Scalars ---
    result.pedsLockedIn = s.pedsLockedIn !== undefined ? s.pedsLockedIn : f.pedsLockedIn;

    // --- Mandatory Items ---
    result.mandatoryItems = isMerge
        ? { ...(f.mandatoryItems || {}), ...(s.mandatoryItems || {}) }
        : (s.mandatoryItems || f.mandatoryItems || {});

    // --- Grades: per-course merge for merge strategies, direct for source-wins ---
    if (isMerge) {
        var gradesMerged = {};
        var allCourses = new Set([
            ...Object.keys(f.grades || {}),
            ...Object.keys(s.grades || {})
        ]);
        allCourses.forEach(function(courseId) {
            var base = { ...(f.grades?.[courseId] || {}) };
            var overlay = s.grades?.[courseId] || {};
            Object.keys(overlay).forEach(function(k) {
                if (overlay[k] !== null && overlay[k] !== undefined) base[k] = overlay[k];
            });
            gradesMerged[courseId] = base;
        });
        result.grades = gradesMerged;
    } else {
        result.grades = s.grades || f.grades || {};
    }

    // --- Simple object fields ---
    if (isMerge) {
        result.editedDeadlines = { ...(f.editedDeadlines || {}), ...(s.editedDeadlines || {}) };
        result.completedDeadlines = { ...(f.completedDeadlines || {}), ...(s.completedDeadlines || {}) };
        result.examStudyProgress = { ...(f.examStudyProgress || {}), ...(s.examStudyProgress || {}) };
    } else {
        result.editedDeadlines = s.editedDeadlines || {};
        result.completedDeadlines = s.completedDeadlines || {};
        result.examStudyProgress = s.examStudyProgress || {};
    }

    // --- Migrated objects (customDeadlines, deletedDeadlines) ---
    // remote-wins: spread fallback + source; stored-wins & source-wins: source only
    if (isRemoteWins) {
        result.customDeadlines = { ...migrateArrayToObject(f.customDeadlines, 'deadline'), ...migrateArrayToObject(s.customDeadlines, 'deadline') };
        result.deletedDeadlines = { ...migrateArrayToObject(f.deletedDeadlines, 'deleted'), ...migrateArrayToObject(s.deletedDeadlines, 'deleted') };
    } else {
        result.customDeadlines = migrateArrayToObject(s.customDeadlines, 'deadline');
        result.deletedDeadlines = migrateArrayToObject(s.deletedDeadlines, 'deleted');
    }

    // --- Monthly Planner ---
    if (isRemoteWins) {
        result.monthlyPlanner = {
            notes: { ...migrateArrayToObject(f.monthlyPlanner?.notes, 'note'), ...migrateArrayToObject(s.monthlyPlanner?.notes, 'note') },
            customTasks: { ...migrateArrayToObject(f.monthlyPlanner?.customTasks, 'ctask'), ...migrateArrayToObject(s.monthlyPlanner?.customTasks, 'ctask') },
            overriddenStatic: { ...migrateArrayToObject(f.monthlyPlanner?.overriddenStatic, 'override'), ...migrateArrayToObject(s.monthlyPlanner?.overriddenStatic, 'override') },
            completedTasks: { ...migrateArrayToObject(f.monthlyPlanner?.completedTasks, 'completed'), ...migrateArrayToObject(s.monthlyPlanner?.completedTasks, 'completed') },
            hiddenClinicTasks: { ...(f.monthlyPlanner?.hiddenClinicTasks || {}), ...(s.monthlyPlanner?.hiddenClinicTasks || {}) },
            currentWeekSchedule: s.monthlyPlanner?.currentWeekSchedule ?? f.monthlyPlanner?.currentWeekSchedule ?? {},
            criticalReminders: { ...(f.monthlyPlanner?.criticalReminders || {}), ...(s.monthlyPlanner?.criticalReminders || {}) }
        };
    } else {
        result.monthlyPlanner = {
            notes: migrateArrayToObject(s.monthlyPlanner?.notes, 'note'),
            customTasks: migrateArrayToObject(s.monthlyPlanner?.customTasks, 'ctask'),
            overriddenStatic: migrateArrayToObject(s.monthlyPlanner?.overriddenStatic, 'override'),
            completedTasks: migrateArrayToObject(s.monthlyPlanner?.completedTasks, 'completed'),
            hiddenClinicTasks: s.monthlyPlanner?.hiddenClinicTasks ?? f.monthlyPlanner?.hiddenClinicTasks ?? {},
            currentWeekSchedule: s.monthlyPlanner?.currentWeekSchedule ?? f.monthlyPlanner?.currentWeekSchedule ?? {},
            criticalReminders: s.monthlyPlanner?.criticalReminders ?? f.monthlyPlanner?.criticalReminders ?? {}
        };
    }

    // --- Clinical Data ---
    var cd = {};

    // patients
    if (isMerge) {
        cd.patients = { ...(f.clinicalData?.patients || {}), ...(s.clinicalData?.patients || {}) };
    } else {
        cd.patients = s.clinicalData?.patients || {};
    }

    // appointments & completedProcedures
    if (isRemoteWins) {
        cd.appointments = { ...migrateArrayToObject(f.clinicalData?.appointments, 'appt'), ...migrateArrayToObject(s.clinicalData?.appointments, 'appt') };
        cd.completedProcedures = { ...migrateArrayToObject(f.clinicalData?.completedProcedures, 'proc'), ...migrateArrayToObject(s.clinicalData?.completedProcedures, 'proc') };
    } else {
        cd.appointments = migrateArrayToObject(s.clinicalData?.appointments, 'appt');
        cd.completedProcedures = migrateArrayToObject(s.clinicalData?.completedProcedures, 'proc');
    }

    // competencies: first arg to mergeCompetencies wins structure conflicts.
    // Merge strategies: fallback (local) first — preserves local section organization.
    // Source-wins: source first — restore/import operation takes precedence.
    // In the V2 manual-count model, mergeCompetencies resolves item counts via
    // lastVerified timestamps (or Math.max when neither side is verified).
    if (isSourceWins) {
        cd.competencies = mergeCompetencies(s.clinicalData?.competencies, f.clinicalData?.competencies);
    } else {
        cd.competencies = mergeCompetencies(f.clinicalData?.competencies, s.clinicalData?.competencies);
    }

    // patientRecords: strategy-specific merge
    if (isRemoteWins) {
        // Full per-patient field-level merge: local base, remote fills empty fields,
        // clinicalBrief newer-wins, importedRequirements fill, briefHistory longer-wins
        cd.patientRecords = (function() {
            var local = f.clinicalData?.patientRecords || {};
            var remote = s.clinicalData?.patientRecords || {};
            var merged = {};
            Object.keys(local).forEach(function(id) { merged[id] = { ...local[id] }; });
            Object.keys(remote).forEach(function(id) {
                if (!merged[id]) {
                    merged[id] = { ...remote[id] };
                } else {
                    Object.keys(remote[id]).forEach(function(key) {
                        if (merged[id][key] === undefined || merged[id][key] === null || merged[id][key] === '') {
                            merged[id][key] = remote[id][key];
                        }
                    });
                    if (remote[id].clinicalBrief && remote[id].clinicalBrief.dateGenerated) {
                        if (!merged[id].clinicalBrief || (remote[id].clinicalBrief.dateGenerated > (merged[id].clinicalBrief.dateGenerated || ''))) {
                            merged[id].clinicalBrief = remote[id].clinicalBrief;
                        }
                    }
                    var localIR = getValues(merged[id].importedRequirements);
                    var remoteIR = getValues(remote[id].importedRequirements);
                    if (remoteIR.length > 0 && localIR.length === 0) {
                        merged[id].importedRequirements = remoteIR;
                    }
                    var localBH = getValues(merged[id].briefHistory);
                    var remoteBH = getValues(remote[id].briefHistory);
                    if (remoteBH.length > localBH.length) {
                        merged[id].briefHistory = remoteBH;
                    }
                }
            });
            return merged;
        })();
    } else if (isStoredWins) {
        // Stored wins: defaults fill gaps, stored data is authoritative
        cd.patientRecords = (function() {
            var dflt = f.clinicalData?.patientRecords || {};
            var stored = s.clinicalData?.patientRecords || {};
            var merged = {};
            Object.keys(stored).forEach(function(id) {
                merged[id] = { ...(dflt[id] || {}), ...stored[id] };
            });
            Object.keys(dflt).forEach(function(id) {
                if (!merged[id]) merged[id] = dflt[id];
            });
            return merged;
        })();
    } else {
        // source-wins: take source or fallback wholesale, no per-patient merge
        cd.patientRecords = s.clinicalData?.patientRecords || f.clinicalData?.patientRecords || {};
    }

    // Apply tombstone filtering — purge records deleted on either device
    if (!isSourceWins) {
        var _delApts = { ...(s.clinicalData?.deletedAppointmentIds || {}), ...(f.clinicalData?.deletedAppointmentIds || {}) };
        var _delProcs = { ...(s.clinicalData?.deletedProcedureIds || {}), ...(f.clinicalData?.deletedProcedureIds || {}) };
        var _delPRs = { ...(s.clinicalData?.deletedPatientRecordIds || {}), ...(f.clinicalData?.deletedPatientRecordIds || {}) };
        Object.keys(cd.appointments || {}).forEach(function(id) { if (_delApts[id]) delete cd.appointments[id]; });
        Object.keys(cd.completedProcedures || {}).forEach(function(id) { if (_delProcs[id]) delete cd.completedProcedures[id]; });
        Object.keys(cd.patientRecords || {}).forEach(function(id) { if (_delPRs[id]) delete cd.patientRecords[id]; });
    }

    // dashboardSnapshots: always dedup-merge via mergeDashboardSnapshots
    cd.dashboardSnapshots = mergeDashboardSnapshots(f.clinicalData?.dashboardSnapshots, s.clinicalData?.dashboardSnapshots);

    // missingNotes
    if (isMerge) {
        cd.missingNotes = { ...(f.clinicalData?.missingNotes || {}), ...(s.clinicalData?.missingNotes || {}) };
    } else {
        cd.missingNotes = s.clinicalData?.missingNotes ?? f.clinicalData?.missingNotes ?? {};
    }

    // autoLinkReviewQueue — dead feature, always empty
    cd.autoLinkReviewQueue = [];

    // Fix #2: Deletion tracking — merge from both sides so deletions propagate across devices
    cd.deletedAppointmentIds = { ...(s.clinicalData?.deletedAppointmentIds || {}), ...(f.clinicalData?.deletedAppointmentIds || {}) };
    cd.deletedProcedureIds = { ...(s.clinicalData?.deletedProcedureIds || {}), ...(f.clinicalData?.deletedProcedureIds || {}) };
    cd.deletedPatientRecordIds = { ...(s.clinicalData?.deletedPatientRecordIds || {}), ...(f.clinicalData?.deletedPatientRecordIds || {}) };

    result.clinicalData = cd;

    // --- Todo List ---
    // Spread order determines conflict winner:
    //   remote-wins: {...source, ...fallback} — fallback (local) wins, because local
    //     edits should not be overwritten by stale remote data during live sync
    //   stored-wins: {...fallback, ...source} — source (stored) wins, because localStorage
    //     IS the authoritative local state being loaded at boot
    if (isRemoteWins) {
        result.todoList = {
            items: { ...(s.todoList?.items || {}), ...(f.todoList?.items || {}) },
            _nextSeq: Math.max(s.todoList?._nextSeq ?? 1, f.todoList?._nextSeq ?? 1),
            lastUpdated: (f.todoList?.lastUpdated && s.todoList?.lastUpdated)
                ? (f.todoList.lastUpdated > s.todoList.lastUpdated ? f.todoList.lastUpdated : s.todoList.lastUpdated)
                : f.todoList?.lastUpdated ?? s.todoList?.lastUpdated ?? null
        };
    } else if (isStoredWins) {
        result.todoList = {
            items: { ...(f.todoList?.items || {}), ...(s.todoList?.items || {}) },
            _nextSeq: Math.max(s.todoList?._nextSeq ?? 1, f.todoList?._nextSeq ?? 1),
            lastUpdated: s.todoList?.lastUpdated ?? f.todoList?.lastUpdated ?? null
        };
    } else {
        result.todoList = {
            items: s.todoList?.items || {},
            _nextSeq: s.todoList?._nextSeq || 1,
            lastUpdated: s.todoList?.lastUpdated ?? null
        };
    }

    // --- Patient To-Do Board ---
    var patientTodoDeletedIds = !isSourceWins
        ? { ...(s.clinicalData?.deletedPatientRecordIds || {}), ...(f.clinicalData?.deletedPatientRecordIds || {}) }
        : (s.clinicalData?.deletedPatientRecordIds || {});
    if (isSourceWins) {
        result.patientTodoBoard = mergePatientTodoBoard(
            s.patientTodoBoard || f.patientTodoBoard || { patients: {}, lastUpdated: null },
            {},
            patientTodoDeletedIds
        );
    } else if (isStoredWins) {
        result.patientTodoBoard = mergePatientTodoBoard(
            s.patientTodoBoard,
            f.patientTodoBoard,
            patientTodoDeletedIds
        );
    } else {
        result.patientTodoBoard = mergePatientTodoBoard(
            f.patientTodoBoard,
            s.patientTodoBoard,
            patientTodoDeletedIds
        );
    }

    // --- General To-Do Board ---
    if (isSourceWins) {
        result.generalTodoBoard = mergeGeneralTodoBoard(
            s.generalTodoBoard || f.generalTodoBoard || { tasks: {}, lastUpdated: null },
            {}
        );
    } else if (isStoredWins) {
        result.generalTodoBoard = mergeGeneralTodoBoard(
            s.generalTodoBoard,
            f.generalTodoBoard
        );
    } else {
        result.generalTodoBoard = mergeGeneralTodoBoard(
            f.generalTodoBoard,
            s.generalTodoBoard
        );
    }

    // --- Daily Planner ---
    result.dailyPlanner = migrateDailyPlannerBlocks(s.dailyPlanner || f.dailyPlanner);

    // --- Exams ---
    if (isRemoteWins) {
        result.exams = { ...migrateArrayToObject(f.exams, 'exam'), ...migrateArrayToObject(s.exams, 'exam') };
    } else {
        result.exams = migrateArrayToObject(s.exams, 'exam');
    }

    // --- D4 Events (rotations, didactics, mock sims, INBDE, ADEX) ---
    if (isRemoteWins) {
        result.d4Events = { ...(f.d4Events || {}), ...(s.d4Events || {}) };
    } else {
        result.d4Events = s.d4Events ?? f.d4Events ?? {};
    }

    // --- Graduation Prep ---
    if (isMerge && s.graduationPrep) {
        if (isRemoteWins) {
            // remote-wins: source ?? fallback ?? default for each sub-field
            result.graduationPrep = {
                externship: {
                    startDate: s.graduationPrep?.externship?.startDate ?? f.graduationPrep?.externship?.startDate ?? null,
                    endDate: s.graduationPrep?.externship?.endDate ?? f.graduationPrep?.externship?.endDate ?? null,
                    patients: s.graduationPrep?.externship?.patients ?? f.graduationPrep?.externship?.patients ?? {},
                    logistics: s.graduationPrep?.externship?.logistics ?? f.graduationPrep?.externship?.logistics ?? '',
                    notes: s.graduationPrep?.externship?.notes ?? f.graduationPrep?.externship?.notes ?? ''
                },
                cdcaAdex: {
                    sessions: s.graduationPrep?.cdcaAdex?.sessions ?? f.graduationPrep?.cdcaAdex?.sessions ?? {},
                    notes: s.graduationPrep?.cdcaAdex?.notes ?? f.graduationPrep?.cdcaAdex?.notes ?? ''
                },
                inbde: { notes: s.graduationPrep?.inbde?.notes ?? f.graduationPrep?.inbde?.notes ?? '' },
                jobSearch: { notes: s.graduationPrep?.jobSearch?.notes ?? f.graduationPrep?.jobSearch?.notes ?? '' }
            };
        } else {
            // stored-wins: source ?? default (no fallback chain through roadmapData)
            result.graduationPrep = {
                externship: {
                    startDate: s.graduationPrep?.externship?.startDate ?? null,
                    endDate: s.graduationPrep?.externship?.endDate ?? null,
                    patients: s.graduationPrep?.externship?.patients ?? {},
                    logistics: s.graduationPrep?.externship?.logistics ?? '',
                    notes: s.graduationPrep?.externship?.notes ?? ''
                },
                cdcaAdex: {
                    sessions: s.graduationPrep?.cdcaAdex?.sessions ?? {},
                    notes: s.graduationPrep?.cdcaAdex?.notes ?? ''
                },
                inbde: { notes: s.graduationPrep?.inbde?.notes ?? '' },
                jobSearch: { notes: s.graduationPrep?.jobSearch?.notes ?? '' }
            };
        }
    } else if (isSourceWins) {
        result.graduationPrep = s.graduationPrep ?? f.graduationPrep ?? defaults.graduationPrep;
    } else {
        // isMerge but source doesn't have graduationPrep
        result.graduationPrep = f.graduationPrep || defaults.graduationPrep;
    }

    // --- Clinic Headlines ---
    if (isMerge && s.clinicHeadlines) {
        if (isRemoteWins) {
            result.clinicHeadlines = {
                appointments: {
                    completed: s.clinicHeadlines?.appointments?.completed ?? f.clinicHeadlines?.appointments?.completed ?? 0,
                    target: s.clinicHeadlines?.appointments?.target ?? f.clinicHeadlines?.appointments?.target ?? 90
                },
                procedures: {
                    completed: s.clinicHeadlines?.procedures?.completed ?? f.clinicHeadlines?.procedures?.completed ?? 0,
                    target: s.clinicHeadlines?.procedures?.target ?? f.clinicHeadlines?.procedures?.target ?? 116
                }
            };
        } else {
            // stored-wins: source ?? default (no fallback through roadmapData)
            result.clinicHeadlines = {
                appointments: {
                    completed: s.clinicHeadlines?.appointments?.completed ?? 0,
                    target: s.clinicHeadlines?.appointments?.target ?? 90
                },
                procedures: {
                    completed: s.clinicHeadlines?.procedures?.completed ?? 0,
                    target: s.clinicHeadlines?.procedures?.target ?? 116
                }
            };
        }
    } else if (isSourceWins) {
        result.clinicHeadlines = s.clinicHeadlines ?? f.clinicHeadlines ?? defaults.clinicHeadlines;
    } else {
        result.clinicHeadlines = f.clinicHeadlines || defaults.clinicHeadlines;
    }

    // --- Competency UI State ---
    if (isMerge) {
        if (s.competencyUIState) {
            if (isRemoteWins) {
                result.competencyUIState = {
                    expandedCategories: Array.isArray(s.competencyUIState.expandedCategories)
                        ? s.competencyUIState.expandedCategories
                        : (f.competencyUIState?.expandedCategories || []),
                    viewMode: s.competencyUIState.viewMode ?? f.competencyUIState?.viewMode ?? 'department'
                };
            } else {
                // stored-wins: no fallback through roadmapData for expandedCategories
                result.competencyUIState = {
                    expandedCategories: Array.isArray(s.competencyUIState.expandedCategories)
                        ? s.competencyUIState.expandedCategories
                        : [],
                    viewMode: s.competencyUIState.viewMode ?? 'department'
                };
            }
        } else {
            result.competencyUIState = f.competencyUIState || { expandedCategories: [], viewMode: 'department' };
        }
    } else {
        result.competencyUIState = s.competencyUIState ?? f.competencyUIState ?? { expandedCategories: [], viewMode: 'department' };
    }

    // --- Metadata ---
    if (isSourceWins) {
        result.lastSaved = s.lastSaved || Date.now();
        result._version = (s._version ?? 0) + 1;
        result._lastModified = new Date().toISOString();
    } else if (isRemoteWins) {
        result.lastSaved = s.lastSaved;
        result._version = Math.max(s._version || 0, f._version || 0);
        result._lastModified = s._lastModified || f._lastModified;
    } else {
        // stored-wins
        result.lastSaved = s.lastSaved || f.lastSaved;
        result._version = s._version ?? f._version ?? 0;
        result._lastModified = s._lastModified ?? f._lastModified ?? null;
    }

    result._dataLoaded = true;

    return result;
}

// ==================== MERGE REMOTE-ONLY INTO LOCAL ====================
// Used only when local lastSaved beats Firebase during boot.
// We keep all local data, then fill in remote-only collection entries so work done on
// another device is not lost. Key difference from mergeRemoteState: local wins for every
// conflict; remote only gets to add missing keys or richer fill-only fields.
function mergeRemoteCollectionsIntoLocal(data) {
    if (!data) return;

    // Fix #2: Collect locally-deleted IDs so addMissing won't resurrect them
    var deletedApts = {
        ...(roadmapData.clinicalData?.deletedAppointmentIds || {}),
        ...(data.clinicalData?.deletedAppointmentIds || {})
    };
    var deletedProcs = {
        ...(roadmapData.clinicalData?.deletedProcedureIds || {}),
        ...(data.clinicalData?.deletedProcedureIds || {})
    };
    var deletedPRs = {
        ...(roadmapData.clinicalData?.deletedPatientRecordIds || {}),
        ...(data.clinicalData?.deletedPatientRecordIds || {})
    };

    // Helper: add remote entries that don't exist locally (local wins for conflicts)
    // Optional 3rd param: set of deleted IDs to skip (prevents resurrection of deleted records)
    function addMissing(localObj, remoteObj, deletedIds) {
        if (!remoteObj || typeof remoteObj !== 'object' || Array.isArray(remoteObj)) return;
        if (!localObj || typeof localObj !== 'object') return;
        Object.keys(remoteObj).forEach(key => {
            if (!(key in localObj) && remoteObj[key] != null) {
                if (deletedIds && deletedIds[key]) return;
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
        addMissing(roadmapData.clinicalData.patients, data.clinicalData.patients, deletedPRs);
        addMissing(roadmapData.clinicalData.appointments, data.clinicalData.appointments, deletedApts);
        addMissing(roadmapData.clinicalData.completedProcedures, data.clinicalData.completedProcedures, deletedProcs);
        addMissing(roadmapData.clinicalData.patientRecords, data.clinicalData.patientRecords, deletedPRs);
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
                    var remoteBH = getValues(remote.briefHistory);
                    if (remoteBH.length > 0) {
                        var localBH = getValues(local.briefHistory);
                        if (remoteBH.length > localBH.length) {
                            local.briefHistory = remoteBH;
                        }
                    }
                }
                // Fill import-enriched fields from remote if local doesn't have them
                if (getValues(local.importedRequirements).length === 0 && getValues(remote.importedRequirements).length > 0) local.importedRequirements = remote.importedRequirements;
                if (!local.priorityNotes && remote.priorityNotes) local.priorityNotes = remote.priorityNotes;
                if (local.highValue === undefined && remote.highValue !== undefined) local.highValue = remote.highValue;
                if (local.archived === undefined && remote.archived !== undefined) local.archived = remote.archived;
                if (!local.allergies && remote.allergies) local.allergies = remote.allergies;
                if (!local.txCompletedByMe && remote.txCompletedByMe) local.txCompletedByMe = remote.txCompletedByMe;
                if (!local.recallHistory && remote.recallHistory) local.recallHistory = remote.recallHistory;
                if (!local.activeStatus && remote.activeStatus) local.activeStatus = remote.activeStatus;
            });
        }
        addMissing(roadmapData.clinicalData.missingNotes, data.clinicalData.missingNotes);
        // Merge deletion tracking from remote (deletions propagate across devices)
        if (!roadmapData.clinicalData.deletedAppointmentIds) roadmapData.clinicalData.deletedAppointmentIds = {};
        if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
        if (!roadmapData.clinicalData.deletedPatientRecordIds) roadmapData.clinicalData.deletedPatientRecordIds = {};
        addMissing(roadmapData.clinicalData.deletedAppointmentIds, data.clinicalData?.deletedAppointmentIds);
        addMissing(roadmapData.clinicalData.deletedProcedureIds, data.clinicalData?.deletedProcedureIds);
        addMissing(roadmapData.clinicalData.deletedPatientRecordIds, data.clinicalData?.deletedPatientRecordIds);
        // dashboardSnapshots: merge arrays
        if (data.clinicalData.dashboardSnapshots) {
            roadmapData.clinicalData.dashboardSnapshots = mergeDashboardSnapshots(
                roadmapData.clinicalData.dashboardSnapshots, data.clinicalData.dashboardSnapshots
            );
        }
        // competencies: V2-aware item-level merge with local-first structure and timestamp-based counts
        if (data.clinicalData.competencies) {
            roadmapData.clinicalData.competencies = mergeCompetencies(
                roadmapData.clinicalData.competencies, data.clinicalData.competencies
            );
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
        if (data.monthlyPlanner.criticalReminders) {
            if (!roadmapData.monthlyPlanner.criticalReminders) roadmapData.monthlyPlanner.criticalReminders = {};
            addMissing(roadmapData.monthlyPlanner.criticalReminders, data.monthlyPlanner.criticalReminders);
        }
        if (data.monthlyPlanner.currentWeekSchedule) {
            if (!roadmapData.monthlyPlanner.currentWeekSchedule) roadmapData.monthlyPlanner.currentWeekSchedule = {};
            addMissing(roadmapData.monthlyPlanner.currentWeekSchedule, data.monthlyPlanner.currentWeekSchedule);
        }
    }

    // D4 events (rotations, didactics, mock sims, INBDE, ADEX)
    if (data.d4Events) {
        if (!roadmapData.d4Events) roadmapData.d4Events = {};
        addMissing(roadmapData.d4Events, data.d4Events);
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

    roadmapData.patientTodoBoard = mergePatientTodoBoard(
        roadmapData.patientTodoBoard,
        data.patientTodoBoard,
        deletedPRs
    );

    roadmapData.generalTodoBoard = mergeGeneralTodoBoard(
        roadmapData.generalTodoBoard,
        data.generalTodoBoard
    );

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

// ==================== BACKUP SYSTEM (localStorage backups removed — Firebase is the backup) ====================

// createBackup is now a no-op. Safety nets before restore/import use createCheckpoint instead.
function createBackup(reason = 'manual') {
    console.log('[backup] localStorage backups disabled, Firebase is the backup. Reason:', reason);
    return null;
}

function getBackups() { return []; }

function restoreBackup(backupId) {
    showToast('Local backups removed — use Checkpoints or Force Pull from Cloud', 'info');
    return false;
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

            // Create checkpoint of current state before import
            createCheckpoint('pre-import');

            const bData = imported.data;
            roadmapData = reconstructState(bData, { strategy: 'source-wins', fallback: getDefaultRoadmapData() });

            // Clear migration flags so migrations re-run against imported data
            localStorage.removeItem('unifiedPatientStoreDone_v1');
            localStorage.removeItem('competencyEnhancementsDone_v2');
            localStorage.removeItem('competencyEnhancementsDone_v3');
            localStorage.removeItem('competencyV2Migrated');
            localStorage.removeItem('competencyD3D4SplitDone_v1');
            localStorage.removeItem('leadingZeroDedupDone_v2');
            localStorage.removeItem('perioNoiseCleanupDone_v1');
            localStorage.removeItem('d4EventsSeeded_v1');

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
    // Local backups removed — redirect to export/import and checkpoints
    var existing = document.getElementById('backupManagerModal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'backupManagerModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    // Build modal using DOM methods (no innerHTML with dynamic content)
    var container = document.createElement('div');
    container.style.cssText = 'background:#161b22;border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;border:1px solid #30363d;';

    var title = document.createElement('h3');
    title.style.cssText = 'color:#e6edf3;margin:0 0 16px 0;font-size:1.2em;';
    title.textContent = 'Backup Manager';

    var info = document.createElement('p');
    info.style.cssText = 'color:#8b949e;font-size:0.85em;margin-bottom:16px;';
    info.textContent = 'Local backups have been replaced by Firebase cloud sync. Use Checkpoints for point-in-time recovery, or Export/Import for file-based backups.';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

    var cpBtn = document.createElement('button');
    cpBtn.style.cssText = 'flex:1;padding:10px;background:#238636;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;';
    cpBtn.textContent = 'Checkpoints';
    cpBtn.onclick = function() { closeBackupManager(); showCheckpointManager(); };

    var exportBtn = document.createElement('button');
    exportBtn.style.cssText = 'flex:1;padding:10px;background:#1f6feb;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;';
    exportBtn.textContent = 'Export JSON';
    exportBtn.onclick = function() { exportBackup(); };

    btnRow.appendChild(cpBtn);
    btnRow.appendChild(exportBtn);

    var importLabel = document.createElement('label');
    importLabel.style.cssText = 'display:block;padding:10px;background:#30363d;border:1px dashed #484f58;border-radius:8px;color:#8b949e;text-align:center;cursor:pointer;margin-top:12px;';
    importLabel.textContent = 'Import from file';
    var importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    importInput.onchange = function() { importBackup(this.files[0]); closeBackupManager(); };
    importLabel.appendChild(importInput);

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'width:100%;margin-top:16px;padding:10px;background:#30363d;border:1px solid #484f58;border-radius:8px;color:#8b949e;cursor:pointer;';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = function() { closeBackupManager(); };

    container.appendChild(title);
    container.appendChild(info);
    container.appendChild(btnRow);
    container.appendChild(importLabel);
    container.appendChild(closeBtn);
    modal.appendChild(container);
    document.body.appendChild(modal);

    window.closeBackupManager = function() {
        var m = document.getElementById('backupManagerModal');
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
    var existing = document.getElementById('syncConflictModal');
    if (existing) existing.remove();
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

    roadmapData = reconstructState(data, { strategy: 'remote-wins', fallback: roadmapData });

    migrateInvalidFirebaseKeys(roadmapData);

    // Mark clinical data as dirty so next initMonthlyPlanner() will re-sync
    clinicalDataDirty = true;
}

// ==================== LOAD DATA ====================

// Load data from localStorage.
// finalize=true means this function is the terminal loader (offline/local-only path).
// finalize=false means a higher-level boot flow is still deciding between local and cloud.
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
            roadmapData = reconstructState(data, { strategy: 'stored-wins', fallback: roadmapData });
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

// Finalize the initial cloud boot decision.
// Decision tree:
// - Firebase empty/poisoned -> keep local and optionally push it up
// - Firebase newer/equal -> mergeRemoteState()
// - local newer -> keep local and pull in remote-only collection entries
// Flags are always set before initUI() so rendering errors cannot permanently block saves.
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

    // Post-merge integrity check (console-only)
    if (typeof runPostMergeIntegrityChecks === 'function') {
        setTimeout(function() { runPostMergeIntegrityChecks('finishFirebaseLoad'); }, 100);
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

// Realtime listener for cross-device writes after boot has already completed.
// It ignores:
// - our own writes (isLocalUpdate)
// - "Keep This Device" grace window echoes
// - empty/default cloud payloads
// - remote saves that are not newer than local lastSaved
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

            // Post-merge integrity check (console-only)
            if (typeof runPostMergeIntegrityChecks === 'function') {
                setTimeout(function() { runPostMergeIntegrityChecks('realtimeSync'); }, 200);
            }
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

    // Sort by id (recent first) — IDs are strings like task_1712345678_abc123
    const sorted = [...doTodayTasks].sort((a, b) => {
        return (b.id || '').localeCompare(a.id || '');
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
                        // Use mergeRemoteState (not deepMerge) so competencies get
                        // item-level merge and dashboardSnapshots get dedup-merge
                        lastKeepLocalTime = Date.now();
                        mergeRemoteState(remoteData);
                        roadmapData.lastSaved = Date.now();
                        migrateInvalidFirebaseKeys(roadmapData);
                        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
                        initUI();
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
    // Force pull = true overwrite. Use source-wins (not remote-wins merge).
    roadmapData = reconstructState(data, { strategy: 'source-wins', fallback: roadmapData });
    migrateInvalidFirebaseKeys(roadmapData);
    clinicalDataDirty = true;
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
    var dedupName = customName || 'Manual';
    if (_cachedCheckpoints.length > 0) {
        var last = _cachedCheckpoints[0];
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

    // Add to in-memory cache (keep max 10)
    _cachedCheckpoints.unshift(checkpoint);
    if (_cachedCheckpoints.length > 10) {
        _cachedCheckpoints.splice(10);
    }

    // Save to Firebase only (no localStorage — saves ~1MB+ per checkpoint)
    if (firebaseSyncEnabled && database && userPath) {
        const cloudCheckpointPath = userPath + '/checkpoints/' + checkpoint.id;
        const cleanCheckpoint = JSON.parse(JSON.stringify(checkpoint));
        if (cleanCheckpoint.data) {
            delete cleanCheckpoint.data._dataLoaded;
        }
        database.ref(cloudCheckpointPath).set(cleanCheckpoint)
            .catch(err => {
                console.error('Failed to save checkpoint to cloud:', err);
            });
    } else {
        console.warn('[CHECKPOINT] Firebase unavailable — checkpoint exists in memory only this session');
    }

    showToast('Checkpoint created: ' + name);

    return checkpoint;
}

async function showCheckpointManager() {
    // Load checkpoints from Firebase (no localStorage — saves space)
    let checkpoints = [];
    if (firebaseSyncEnabled && database && userPath) {
        try {
            const snapshot = await database.ref(userPath + '/checkpoints').once('value');
            const cloudCheckpoints = snapshot.val();
            if (cloudCheckpoints) {
                checkpoints = getValues(cloudCheckpoints).filter(c => c && c.id);
                checkpoints.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
        } catch (err) {
            console.error('Failed to load cloud checkpoints:', err);
        }
    }
    // Merge any in-memory checkpoints not yet in Firebase (created this session while offline)
    const cloudIds = new Set(checkpoints.map(c => c.id));
    _cachedCheckpoints.forEach(cc => {
        if (cc && cc.id && !cloudIds.has(cc.id)) {
            checkpoints.push(cc);
        }
    });
    checkpoints.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    // Update cache
    _cachedCheckpoints = checkpoints;

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
    const checkpoint = _cachedCheckpoints[index];

    if (!checkpoint) {
        showToast('Checkpoint not found');
        return;
    }

    showCustomConfirm(
        `Restore checkpoint?\n\nName: ${escapeHtml(checkpoint.name)}\nDate: ${new Date(checkpoint.date).toLocaleString()}\nData: ${checkpoint.dataCount}\n\nThis will OVERWRITE your current data.\nA backup of current data will be created first.`,
        function() {
            // Backup current state first
            createCheckpoint(`Pre-restore backup (${new Date().toLocaleString()})`);

            const cpData = checkpoint.data;
            roadmapData = reconstructState(cpData, { strategy: 'source-wins', fallback: roadmapData });

            // Clear migration flags so migrations re-run against restored data
            localStorage.removeItem('unifiedPatientStoreDone_v1');
            localStorage.removeItem('competencyEnhancementsDone_v2');
            localStorage.removeItem('competencyEnhancementsDone_v3');
            localStorage.removeItem('competencyV2Migrated');
            localStorage.removeItem('competencyD3D4SplitDone_v1');
            localStorage.removeItem('leadingZeroDedupDone_v2');
            localStorage.removeItem('perioNoiseCleanupDone_v1');
            localStorage.removeItem('d4EventsSeeded_v1');

            migrateInvalidFirebaseKeys(roadmapData);
            clinicalDataDirty = true;
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            setLocalUpdateFlag();
            saveData();
            initUI();
            document.querySelector('.checkpoint-modal-overlay')?.remove();
            showToast('Restored: ' + checkpoint.name);

            // Post-restore integrity check (console-only)
            if (typeof runPostMergeIntegrityChecks === 'function') {
                setTimeout(function() { runPostMergeIntegrityChecks('restoreCheckpoint'); }, 200);
            }
        },
        null,
        'Restore Checkpoint'
    );
}

function deleteCheckpoint(index) {
    showCustomConfirm(
        'Delete this checkpoint?',
        function() {
            const checkpoint = _cachedCheckpoints[index];
            _cachedCheckpoints.splice(index, 1);

            // Delete from Firebase
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
    const checkpoint = _cachedCheckpoints[index];

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
    const checkpoints = _cachedCheckpoints;

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
        data.patientTodoBoard ||
        data.generalTodoBoard ||
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
                let checkpoints = _cachedCheckpoints.slice();

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

                // Keep max 10 checkpoints in cache
                checkpoints = checkpoints.slice(0, 10);
                _cachedCheckpoints = checkpoints;

                // Save imported checkpoints to Firebase
                if (firebaseSyncEnabled && database && userPath) {
                    checkpoints.forEach(function(cp) {
                        if (cp && cp.id) {
                            var cleanCp = JSON.parse(JSON.stringify(cp));
                            if (cleanCp.data) delete cleanCp.data._dataLoaded;
                            database.ref(userPath + '/checkpoints/' + cp.id).set(cleanCp)
                                .catch(function(err) { console.error('Failed to save imported checkpoint:', err); });
                        }
                    });
                }

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

                    roadmapData = reconstructState(data, { strategy: 'source-wins', fallback: roadmapData });

                    // Clear migration flags so migrations re-run against restored data
                    localStorage.removeItem('unifiedPatientStoreDone_v1');
                    localStorage.removeItem('competencyEnhancementsDone_v2');
                    localStorage.removeItem('competencyEnhancementsDone_v3');
                    localStorage.removeItem('competencyV2Migrated');
                    localStorage.removeItem('competencyD3D4SplitDone_v1');
                    localStorage.removeItem('leadingZeroDedupDone_v2');
                    localStorage.removeItem('perioNoiseCleanupDone_v1');
                    localStorage.removeItem('d4EventsSeeded_v1');

                    migrateInvalidFirebaseKeys(roadmapData);
                    clinicalDataDirty = true;
                    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
                    setLocalUpdateFlag();
                    saveData();

                    showToast('Data restored from file');
                    document.querySelector('.checkpoint-modal-overlay')?.remove();
                    initUI();

                    // Post-restore integrity check (console-only)
                    if (typeof runPostMergeIntegrityChecks === 'function') {
                        setTimeout(function() { runPostMergeIntegrityChecks('importAndRestoreDirectly'); }, 200);
                    }
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
    // Cancel any pending debounced save to prevent it overwriting the force upload
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
    }
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
        // Auto-fix Firebase array→object conversion before validation
        if (data.clinicalData.dashboardSnapshots && !Array.isArray(data.clinicalData.dashboardSnapshots) && typeof data.clinicalData.dashboardSnapshots === 'object') {
            console.warn('[GUARD-F] Auto-converting dashboardSnapshots from object to array');
            data.clinicalData.dashboardSnapshots = getValues(data.clinicalData.dashboardSnapshots);
        }
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
    if (data.patientTodoBoard !== undefined && (typeof data.patientTodoBoard !== 'object' || data.patientTodoBoard === null)) {
        console.error('[GUARD-F] patientTodoBoard is not an object');
        errors.push('patientTodoBoard is not an object');
    }
    if (data.generalTodoBoard !== undefined && (typeof data.generalTodoBoard !== 'object' || data.generalTodoBoard === null)) {
        console.error('[GUARD-F] generalTodoBoard is not an object');
        errors.push('generalTodoBoard is not an object');
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
    // competencyUIState must be object if present
    if (data.competencyUIState !== undefined && data.competencyUIState !== null && typeof data.competencyUIState !== 'object') {
        console.error('[GUARD-F] competencyUIState is not an object');
        errors.push('competencyUIState is not an object');
    }
    // d4Events can be undefined (old data) or object — reject anything else
    if (data.d4Events !== undefined && data.d4Events !== null && typeof data.d4Events !== 'object') {
        console.error('[GUARD-F] d4Events is not an object');
        errors.push('d4Events is not an object');
    }
    return errors;
}

// Save pipeline:
// 1. Run Guard A-F to block unsafe writes.
// 2. Stamp lastSaved/_version/_lastModified on the in-memory state.
// 3. Persist to localStorage immediately.
// 4. Debounce Firebase write, stripping _dataLoaded and sanitizing keys first.
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
                        localChangesSinceLastSync = false;
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
