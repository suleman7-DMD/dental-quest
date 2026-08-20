// ============================================
// STATE MANAGEMENT
// ============================================

// ============================================
// GLOBAL VARIABLE DECLARATIONS
// ============================================
var state = getDefaultState();
var isInitialLoad = true;
var hasLoadedFromCloud = false;
var pinValidated = false;
var hyperarousalMode = false;
var focusMode = false;
var currentEditingDate = null;
var currentSITab = 'overview';
var explainerTimeout = null;
var forecastExpanded = false;
var firebaseSaveTimeout = null;
var lastLocalSave = 0;
var lastAutoSavePredictionTime = 0;
var lastAutoSavePredictionMinutes = null;
var calendarViewDate = new Date();

// ============================================
// MEDICATION INVENTORY GLOBALS (cross-app shared data)
// ============================================
var scInvMedications = {
    '30mg': { pills: 0, refillDate: null, lastAutoReduceDate: null, dosesLogged: {}, lastManualChange: null, lastManualChangeType: null },
    '20mg': { pills: 0, refillDate: null, lastAutoReduceDate: null, dosesLogged: {}, lastManualChange: null, lastManualChangeType: null }
};
var scInvPillAssignments = { '30mg': {}, '20mg': {} };
var scInvCalendarNotes = {};
var scInvCurrentMedModal = null;
var scInvCurrentNoteDate = null;

// ============================================
// DEFAULT STATE FACTORY (for restore/reset operations)
// ============================================
function getDefaultState() {
    return {
        wakeTime: '06:45',
        hoursSleptLastNight: 8,
        medications: {},
        caffeine: {},
        allNighterMode: false,
        modifiers: {
            vitaminC: { active: false, time: '17:00', date: null },
            heavyLift: { active: false },
            sauna: { active: false, time: '18:00', date: null },
            workout: { active: false, endTime: '18:00', intense: false, date: null }
        },
        nicotine: {
            active: false,
            type: 'vape',
            lastHitTime: null
        },
        workoutPlan: {
            active: false,
            time: null,
            duration: 45,
            type: 'lifting',
            intensity: 'medium',
            fasted: false,
            coldShower: false,
            applied: false,
            adenosineBonus: 0,
            cortisolDelay: 0,
            thermalDelay: 0,
            cooldownComplete: null
        },
        settings: {
            ampHalfLife: 11,
            sleepThreshold: 14,
            caffHalfLife: 5,
            caffThreshold: 25,
            weight: 190,
            sleepTarget: 8,
            vitcHighDose: false
        },
        calibration: {
            autoFit: true,             // master switch; false = frozen
            fittedThreshold: null,     // mg; null = use settings.sleepThreshold
            lastFitDate: null,         // YYYY-MM-DD of last fit run (once per day)
            lastAdjustment: 0,         // mg delta applied by last fit (for the card)
            lastFitNights: 0,          // nights used in last fit
            manualPauseUntil: null,    // YYYY-MM-DD; manual slider edit pauses auto-fit 7 days
            fittedCaffHalfLife: null   // hours; null = use settings.caffHalfLife
        },
        history: {},
        _version: 0,
        sleepHistory: {},
        sleepDailyLogs: {},
        _sleepDailyLogsMigrated: false,
        _sleepDailyLogsMigratedV2: false,
        _sleepDailyLogsMigratedV3: false,
        _dataLoaded: false
    };
}

// Check if state has real user data (not just defaults)
function isEmptyState(data) {
    if (!data) return true;

    // Stimulant Calculator specific checks - must have at least ONE of these
    const hasMedications = getCount(data.medications) > 0;
    const hasCaffeine = getCount(data.caffeine) > 0;
    const hasHistory = getCount(data.history) > 0;
    const hasSleepHistory = getCount(data.sleepHistory) > 0;
    const hasSleepDailyLogs = getCount(data.sleepDailyLogs) > 0;

    // FIX: Allow saving when allNighterMode is ON or when data has been loaded
    // This fixes the bug where toggling allNighterMode wouldn't persist
    const hasAllNighterMode = data.allNighterMode === true;
    const dataWasLoaded = data._dataLoaded === true;

    // Empty if NONE of these exist
    return !hasMedications && !hasCaffeine && !hasHistory && !hasSleepHistory && !hasSleepDailyLogs && !hasAllNighterMode && !dataWasLoaded;
}

function hasRealData(data) {
    return !isEmptyState(data);
}

// ============================================
// DATA INTEGRITY UTILITIES
// ============================================
// Firebase converts arrays to objects - this converts them back
function ensureArray(val, fallback = []) {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') {
        return Object.values(val);
    }
    return fallback;
}

// Generate unique IDs
function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Convert array to object with unique IDs (migration helper)
// This PREVENTS Firebase's array→object corruption by using objects from the start
function migrateArrayToObject(arr, prefix = 'item') {
    if (!arr) return {};
    // Already an object with string keys? Return as-is
    if (!Array.isArray(arr) && typeof arr === 'object') {
        // Check if it looks like our ID-keyed object
        const keys = Object.keys(arr);
        if (keys.length === 0) return {};
        if (keys.every(k => typeof k === 'string' && k.includes('_'))) {
            return arr; // Already migrated
        }
        // Firebase-corrupted sparse object (numeric keys) - convert to proper object
        arr = Object.values(arr).filter(v => v !== null && v !== undefined);
    }
    if (!Array.isArray(arr)) return {};

    const obj = {};
    arr.forEach((item, index) => {
        if (item === null || item === undefined) return;
        // Use existing ID if present, otherwise generate one
        // Add small offset to ensure uniqueness even if items have same timestamp
        const id = item.id && typeof item.id === 'string' && item.id.includes('_')
            ? item.id
            : generateId(prefix) + '_' + index;
        obj[id] = { ...item, id };
    });
    return obj;
}

// Get values from object as array (for iteration)
function getValues(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj; // Backwards compat during migration
    return Object.values(obj).filter(v => v !== null && v !== undefined);
}

// Get count of items in object
function getCount(obj) {
    if (!obj) return 0;
    if (Array.isArray(obj)) return obj.length;
    return Object.keys(obj).length;
}

// Safe localStorage wrapper with quota handling (cross-app cleanup)
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn('localStorage quota exceeded, running cross-app cleanup...');
            var expendableKeys = [
                'dentalquest_backups', 'graduationRoadmapBackup', 'd3RoadmapBackup',
                'bodycomp_backups', 'stimcalc_backups', 'd3RoadmapData',
                'bodyCompCheckpoints', 'stimCalcCheckpoints'
            ];
            var pinHash = localStorage.getItem('dentalQuestPin');
            if (pinHash) {
                expendableKeys.push(
                    'dentalQuest_checkpoints_' + pinHash,
                    'gradRoadmap_checkpoints_' + pinHash,
                    'd3roadmap_checkpoints_' + pinHash
                );
            }
            expendableKeys.forEach(function(k) {
                try { localStorage.removeItem(k); } catch(ignore) {}
            });
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e2) {
                console.error('Storage full even after cross-app cleanup');
                showToast('Storage full - saved to cloud only', 'warning');
                return false;
            }
        }
        console.error('localStorage error:', e);
        return false;
    }
}

// Escape HTML to prevent XSS in innerHTML
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Backup Manager (localStorage backups removed — Firebase is the backup. Export/import preserved.)
var BackupManager = {
    createBackup() { /* no-op: Firebase sync replaces localStorage backups */ },
    restoreBackup() { showToast('Use Force Pull from Cloud to restore', 'info'); },
    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            appVersion: '3.0',
            state: state
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stimulant-calc-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📥 Backup downloaded');
    },
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!imported.state) {
                    showToast('❌ Invalid backup file');
                    return;
                }
                // Create backup of current state before import
                this.createBackup();
                // Apply imported state with migration
                state = {
                    ...state,
                    ...imported.state,
                    medications: migrateArrayToObject(imported.state.medications, 'med'),
                    caffeine: migrateArrayToObject(imported.state.caffeine, 'caf'),
                    history: migrateArrayToObject(imported.state.history, 'hist'),
                    _version: (imported.state._version || state._version || 0) + 1
                };
                safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
                saveToFirebase();
                // Re-render
                document.getElementById('wakeTime').value = state.wakeTime;
                document.getElementById('hoursSlept').value = state.hoursSleptLastNight;
                renderMedEntries();
                renderCaffeineEntries();
                renderSleepIntelligence();
                recalculate();
                showToast('✅ Backup imported successfully');
            } catch (err) {
                console.error('Import failed:', err);
                showToast('❌ Failed to import backup');
            }
        };
        reader.readAsText(file);
    }
};

// ============================================
// TIME HELPERS
// ============================================

// Helper to get local date string (avoids UTC timezone issues)
function getLocalDateString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Helper to parse YYYY-MM-DD as local date (avoids UTC timezone issues)
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const [hours, mins] = parts.map(Number);
    if (isNaN(hours) || isNaN(mins)) return 0;
    return hours * 60 + mins;
}

function minutesToTime(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    const hours = Math.floor(mins / 60) % 24;
    const minutes = Math.floor(mins % 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Day-aware time formatter: appends "(tomorrow)" when clearance is next day
function minutesToTimeWithDay(mins) {
    const timeStr = minutesToTime(mins);
    if (mins >= 1440) return timeStr + ' (tomorrow)';
    return timeStr;
}

function minutesToTimeValue(mins) {
    const hours = Math.floor(mins / 60) % 24;
    const minutes = Math.floor(mins % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Compute signed sleep time delta handling midnight crossing
// Returns minutes: positive = actual later than predicted, negative = earlier
function computeSleepDelta(predicted, actual) {
    const p = ((predicted % 1440) + 1440) % 1440;
    const a = ((actual % 1440) + 1440) % 1440;
    let diff = a - p;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return diff;
}

function snapshotPredictionInputs() {
    const now = getCurrentMinutes();
    return {
        wakeTime: state.wakeTime,
        hoursSleptLastNight: state.hoursSleptLastNight,
        ampLoadAtPrediction: parseFloat(calculateAmpLoad(now).toFixed(1)),
        caffLoadAtPrediction: parseFloat(calculateCaffLoad(now).toFixed(1)),
        effectiveThreshold: parseFloat(getEffectiveThreshold().toFixed(1)),
        sleepDebtBonus: parseFloat(calculateSleepDebtBonus().toFixed(1)),
        baseThreshold: state.settings.sleepThreshold,
        ampHalfLife: state.settings.ampHalfLife,
        caffHalfLife: state.settings.caffHalfLife,
        totalAmpDose: getValues(state.medications).reduce((s, m) => s + m.dose, 0),
        totalCaffDose: getValues(state.caffeine).reduce((s, c) => s + c.amount, 0),
        hasWorkout: !!(state.workoutPlan && state.workoutPlan.applied),
        hasSauna: !!(state.modifiers && state.modifiers.sauna && state.modifiers.sauna.active),
        hasVitC: !!(state.modifiers && state.modifiers.vitaminC && state.modifiers.vitaminC.active),
        allNighterMode: !!state.allNighterMode
    };
}

function computeSleepStatus(hours) {
    if (hours === null || hours === undefined || isNaN(hours)) return 'no_data';
    if (hours === 0) return 'allnighter';
    if (hours < 4) return 'critical';
    if (hours < 5.5) return 'poor';
    if (hours < 7) return 'ok';
    if (hours < 8) return 'good';
    return 'great';
}

// BUG FIX: Use computeSleepDelta for midnight-crossing-safe delta calculation
function migrateHistoryEntries() {
    const entries = getValues(state.history);
    let changed = false;
    entries.forEach(entry => {
        if (entry.deltaMinutes === undefined) {
            if (entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep)) {
                entry.deltaMinutes = computeSleepDelta(entry.predictedSleep, entry.actualSleep);
                entry.absError = Math.abs(entry.deltaMinutes);
            } else {
                entry.deltaMinutes = null;
                entry.absError = null;
            }
            changed = true;
        }
        if (entry.autoSaved === undefined) { entry.autoSaved = false; changed = true; }
        if (entry.inputs === undefined) { entry.inputs = null; changed = true; }
        if (entry.predictedAt === undefined) {
            const idParts = entry.id ? entry.id.split('_') : [];
            const ts = idParts.length >= 2 ? parseInt(idParts[1]) : null;
            entry.predictedAt = (ts && !isNaN(ts) && ts > 1000000000000) ? new Date(ts).toISOString() : null;
            changed = true;
        }
        if (state.history[entry.id]) state.history[entry.id] = entry;
    });
    return changed;
}

function getCurrentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

function formatTime12(time24) {
    if (!time24 || typeof time24 !== 'string') return '--:--';
    const parts = time24.split(':');
    if (parts.length !== 2) return '--:--';
    const [hours, mins] = parts.map(Number);
    if (isNaN(hours) || isNaN(mins)) return '--:--';
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
}

// ============================================
// UI HELPERS
// ============================================

// Helper function to safely set element value
function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// Helper function to safely get element value
function safeGetValue(id, defaultValue) {
    const el = document.getElementById(id);
    return el ? el.value : defaultValue;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// ICON HELPER — Lucide SVG icon inline strings
// ============================================
var _iconCache = {};
function icon(name, size) {
    if (size === undefined) size = 16;
    var key = name + '_' + size;
    if (_iconCache[key]) return _iconCache[key];
    var icons = {
        'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
        'circle': '<circle cx="12" cy="12" r="10"/>',
        'check': '<polyline points="20 6 9 17 4 12"/>',
        'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
        'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
        'trash-2': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
        'save': '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
        'folder-open': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
        'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        'pill': '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
        'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'refresh-cw': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
        'upload': '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
        'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
        'chevron-up': '<polyline points="18 15 12 9 6 15"/>',
        'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
        'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
        'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
        'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
        'moon': '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
        'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
        'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        'edit': '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
        'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
        'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
        'coffee': '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
        'wind': '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
        'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
        'heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
        'thermometer': '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
        'brain': '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>',
        'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
        'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
        'pause': '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
        'timer': '<circle cx="12" cy="14" r="8"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="10" y1="2" x2="14" y2="2"/>',
        'cloud': '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
        'smartphone': '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
        'loader': '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>'
    };
    var paths = icons[name] || '';
    if (!paths) {
        _iconCache[key] = '';
        return '';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
    _iconCache[key] = svg;
    return svg;
}

// Custom Alert Modal (replaces blocking alert())
function showCustomAlert(message, title = 'Notice', callback = null) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:10001;';
    const alertContainer = document.createElement('div');
    alertContainer.style.cssText = 'background:#FFFFFF;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid rgba(0,0,0,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.12);text-align:center;';
    const alertH3 = document.createElement('h3');
    alertH3.style.cssText = 'color:#5E7A8A;margin:0 0 16px 0;font-size:1.2em;';
    alertH3.textContent = title;
    const alertP = document.createElement('p');
    alertP.style.cssText = 'color:#2C2825;margin-bottom:20px;white-space:pre-wrap;';
    alertP.textContent = message;
    const alertBtn = document.createElement('button');
    alertBtn.style.cssText = 'padding:12px 32px;background:#6B7C5E;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:1em;';
    alertBtn.textContent = 'OK';
    alertBtn.onclick = function() { modal.remove(); if (callback) callback(); };
    alertContainer.appendChild(alertH3);
    alertContainer.appendChild(alertP);
    alertContainer.appendChild(alertBtn);
    modal.appendChild(alertContainer);
    document.body.appendChild(modal);
    alertBtn.focus();
}

// Custom Confirm Modal (replaces blocking confirm())
function showCustomConfirm(message, onConfirm, onCancel = null, title = 'Confirm') {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:10001;';
    const confirmContainer = document.createElement('div');
    confirmContainer.style.cssText = 'background:#FFFFFF;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid rgba(0,0,0,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.12);text-align:center;';
    const confirmH3 = document.createElement('h3');
    confirmH3.style.cssText = 'color:#C4923A;margin:0 0 16px 0;font-size:1.2em;';
    confirmH3.textContent = title;
    const confirmP = document.createElement('p');
    confirmP.style.cssText = 'color:#2C2825;margin-bottom:20px;white-space:pre-wrap;';
    confirmP.textContent = message;
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';
    const yesBtn = document.createElement('button');
    yesBtn.id = 'confirmBtn';
    yesBtn.style.cssText = 'flex:1;padding:12px;background:#6B7C5E;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;';
    yesBtn.textContent = 'Yes';
    const noBtn = document.createElement('button');
    noBtn.id = 'cancelBtn';
    noBtn.style.cssText = 'flex:1;padding:12px;background:#EFECE6;border:1px solid rgba(0,0,0,0.08);border-radius:8px;color:#6B635B;font-weight:600;cursor:pointer;';
    noBtn.textContent = 'No';
    btnRow.appendChild(yesBtn);
    btnRow.appendChild(noBtn);
    confirmContainer.appendChild(confirmH3);
    confirmContainer.appendChild(confirmP);
    confirmContainer.appendChild(btnRow);
    modal.appendChild(confirmContainer);
    document.body.appendChild(modal);
    modal.querySelector('#confirmBtn').onclick = () => { modal.remove(); if (onConfirm) onConfirm(); };
    modal.querySelector('#cancelBtn').onclick = () => { modal.remove(); if (onCancel) onCancel(); };
    modal.querySelector('#confirmBtn').focus();
}
