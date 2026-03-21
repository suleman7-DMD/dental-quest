// ==================== D3 ROADMAP: FIREBASE SYNC ====================
// Auth, save/load, sync, checkpoints, backup, conflict resolution, cross-app sync

// ==================== MODULE VARIABLES ====================

// Connection monitoring
let isFirebaseConnected = false;
let connectionMonitorRef = null;

// Backup system
const BACKUP_STORAGE_KEY = 'd3RoadmapBackup';
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
    const local = Array.isArray(localSnaps) ? localSnaps : [];
    const remote = Array.isArray(remoteSnaps) ? remoteSnaps : [];
    if (local.length === 0) return remote.length > 0 ? remote : [];
    if (remote.length === 0) return local;
    // Deduplicate by capturedAt (or timestamp fallback)
    const seen = new Set();
    const merged = [];
    [...remote, ...local].forEach(snap => {
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

    // Restore the data
    roadmapData = backup.data;

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

            // Import the data
            roadmapData = imported.data;

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
    const fallbackTimer = setTimeout(() => {
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
    userPath = 'users/' + hashedPin + '/d3Roadmap';
    firebaseSyncEnabled = true;

    // CRITICAL: Mark PIN as validated BEFORE any Firebase operations
    pinValidated = true;

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
                merged[courseId] = {
                    ...(roadmapData.grades?.[courseId] || {}),
                    ...(data.grades?.[courseId] || {})
                };
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
            patientRecords: { ...(roadmapData.clinicalData?.patientRecords || {}), ...(data.clinicalData?.patientRecords || {}) },
            dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, data.clinicalData?.dashboardSnapshots)
        },
        dailyPlanner: migrateDailyPlannerBlocks(data.dailyPlanner || roadmapData.dailyPlanner),
        exams: {
            ...migrateArrayToObject(roadmapData.exams, 'exam'),
            ...migrateArrayToObject(data.exams, 'exam')
        },
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
        lastSaved: data.lastSaved,
        _version: Math.max(data._version || 0, roadmapData._version || 0),
        _lastModified: data._lastModified || roadmapData._lastModified,
        _dataLoaded: true  // CRITICAL: Always true after merge
    };

    migrateInvalidFirebaseKeys(roadmapData);
}

// ==================== LOAD DATA ====================

// Load data from localStorage
// @param finalize - if true, also set flags and call initUI (for standalone use)
//                   if false, just load data (caller handles flags/initUI)
function loadFromLocalStorage(finalize = true) {
    const saved = localStorage.getItem('d3RoadmapData');
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
                    patientRecords: { ...(roadmapData.clinicalData?.patientRecords || {}), ...(data.clinicalData?.patientRecords || {}) },
                    dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, data.clinicalData?.dashboardSnapshots)
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
                lastSaved: data.lastSaved || roadmapData.lastSaved,
                _version: data._version || roadmapData._version || 0,
                _lastModified: data._lastModified || roadmapData._lastModified
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

    // One-time load first
    database.ref(userPath).once('value')
        .then(snapshot => {
            const data = snapshot.val();
            if (data) {
                // CRITICAL FIX: Load localStorage FIRST so local-only changes are preserved
                loadFromLocalStorage(false);

                // BUG 2 FIX: Compare timestamps — only merge Firebase if it's same-age or newer
                const localLastSaved = roadmapData.lastSaved || 0;
                const remoteLastSaved = data.lastSaved || 0;

                if (localLastSaved > remoteLastSaved) {
                    // Local is NEWER — keep local data, don't overwrite with stale Firebase
                    console.log('[D3-LOAD] Local data is newer:', localLastSaved, '>', remoteLastSaved, '— keeping local');
                    roadmapData._dataLoaded = true;
                    migrateInvalidFirebaseKeys(roadmapData);
                } else {
                    // Firebase is same or newer — merge normally
                    mergeRemoteState(data);
                }

                // Also save to localStorage as backup
                safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
                updateSyncStatus('connected', 'Synced');
            } else {
                // No Firebase data - check if we have local data
                // Pass false to skip finalize - we handle flags/initUI below
                loadFromLocalStorage(false);
                updateSyncStatus('connected', 'Synced');
            }

            // BUG 1 FIX: SET ALL FLAGS FIRST — before any rendering
            // Any save triggered during initUI() was blocked because isInitialLoad was still true
            hasLoadedFromCloud = true;
            isInitialLoad = false;
            roadmapData._dataLoaded = true;
            lastSyncTimestamp = Date.now();

            // THEN render (in try/catch so flags are ALWAYS set even if rendering crashes)
            try {
                initUI();
            } catch (e) {
                console.error('[D3-LOAD] initUI error after Firebase load:', e);
            }

            // Set up sync listeners (in try/catch to not block on errors)
            try {
                setupRealtimeSync();
                setupMainAppTasksSync();
            } catch (e) {
                console.error('[D3-LOAD] Sync setup error:', e);
            }
        })
        .catch(error => {
            console.error('❌ Firebase load error:', error);
            updateSyncStatus('error', 'Load failed');
            // loadFromLocalStorage() now sets all flags and calls initUI()
            loadFromLocalStorage();
        });
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
            safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));

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
    const hashedPin = userPath.split('/')[1]; // Extract user_XXX from 'users/user_XXX/d3Roadmap'
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
    safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
    initUI();
}

// ==================== CHECKPOINT SYSTEM ====================

function getCheckpointKey() {
    const pin = localStorage.getItem('dentalQuestPin') || 'default';
    return `d3roadmap_checkpoints_${btoa(pin).replace(/[^a-zA-Z0-9]/g, '')}`;
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
                    dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, cpData.clinicalData?.dashboardSnapshots)
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
                lastSaved: cpData.lastSaved || Date.now(),
                _version: Date.now(),
                _lastModified: new Date().toISOString(),
                _dataLoaded: true
            };

            migrateInvalidFirebaseKeys(roadmapData);
            safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
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
                            dashboardSnapshots: mergeDashboardSnapshots(roadmapData.clinicalData?.dashboardSnapshots, data.clinicalData?.dashboardSnapshots)
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
                        lastSaved: data.lastSaved || Date.now(),
                        _version: Date.now(),
                        _lastModified: new Date().toISOString(),
                        _dataLoaded: true
                    };

                    migrateInvalidFirebaseKeys(roadmapData);
                    safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
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

                roadmapData._version = Date.now();
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
                    safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
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

    // All guards passed — safe to save
    console.log('[D3-SAVE] ✅ All guards passed. editedDeadlines:', getCount(roadmapData.editedDeadlines),
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
        safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
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
        // GUARD: Only save if we have real data and passed initial load
        if (!isInitialLoad && hasLoadedFromCloud && roadmapData._dataLoaded && !isEmptyState(roadmapData)) {
            safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
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
                        }
                    }
                })
                .catch(err => console.error('Refresh on visible failed:', err));
        }
    }
});

// Save on page unload to prevent data loss during debounce window - WITH GUARDS
window.addEventListener('beforeunload', function() {
    // Only save if we have real data and passed initial load
    if (!isInitialLoad && hasLoadedFromCloud && roadmapData._dataLoaded && !isEmptyState(roadmapData)) {
        safeLocalStorageSet('d3RoadmapData', JSON.stringify(roadmapData));
    }
});
