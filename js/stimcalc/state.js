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
var sleepPerfExpanded = true;
var accuracyDashExpanded = true;
var explainerTimeout = null;
var forecastExpanded = false;
var firebaseSaveTimeout = null;
var lastLocalSave = 0;
var lastAutoSavePredictionTime = 0;
var lastAutoSavePredictionMinutes = null;

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
            sauna: { active: false, time: '18:00', date: null }
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
            weight: 190
        },
        history: {},
        _version: 0,
        sleepHistory: {},
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

    // FIX: Allow saving when allNighterMode is ON or when data has been loaded
    // This fixes the bug where toggling allNighterMode wouldn't persist
    const hasAllNighterMode = data.allNighterMode === true;
    const dataWasLoaded = data._dataLoaded === true;

    // Empty if NONE of these exist
    return !hasMedications && !hasCaffeine && !hasHistory && !hasSleepHistory && !hasAllNighterMode && !dataWasLoaded;
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

// Safe localStorage wrapper with quota handling
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.error('localStorage quota exceeded - clearing old backups');
            // Try to free space by clearing old backups
            try {
                localStorage.removeItem('stimcalc_backups');
                localStorage.setItem(key, value);
                return true;
            } catch (e2) {
                console.error('Still cannot save after clearing backups:', e2);
                showToast('⚠️ Storage full - data may not persist');
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

// Backup Manager with export/import
var BackupManager = {
    maxBackups: 3,
    createBackup() {
        try {
            const backups = JSON.parse(localStorage.getItem('stimcalc_backups') || '[]');
            const currentData = localStorage.getItem('stimulantCalculatorState');
            if (!currentData) return;
            backups.unshift({ timestamp: Date.now(), data: currentData });
            while (backups.length > this.maxBackups) backups.pop();
            safeLocalStorageSet('stimcalc_backups', JSON.stringify(backups));
        } catch (e) { console.error('Backup failed:', e); }
    },
    restoreBackup(timestamp) {
        const backups = JSON.parse(localStorage.getItem('stimcalc_backups') || '[]');
        const backup = backups.find(b => b.timestamp === timestamp);
        if (backup && confirm(`Restore backup from ${new Date(timestamp).toLocaleString()}?`)) {
            safeLocalStorageSet('stimulantCalculatorState', backup.data);
            location.reload();
        }
    },
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
                renderSleepCalendar();
                renderSleepPerformance();
                renderHistory();
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

// Custom Alert Modal (replaces blocking alert())
function showCustomAlert(message, title = 'Notice', callback = null) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
    modal.innerHTML = `
        <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #30363d;text-align:center;">
            <h3 style="color:#60a5fa;margin:0 0 16px 0;font-size:1.2em;">${title}</h3>
            <p style="color:#e6edf3;margin-bottom:20px;white-space:pre-wrap;">${message}</p>
            <button onclick="this.closest('.custom-modal-overlay').remove(); window._customAlertCallback && window._customAlertCallback();"
                style="padding:12px 32px;background:#3b82f6;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:1em;">OK</button>
        </div>
    `;
    document.body.appendChild(modal);
    window._customAlertCallback = callback;
    modal.querySelector('button').focus();
}

// Custom Confirm Modal (replaces blocking confirm())
function showCustomConfirm(message, onConfirm, onCancel = null, title = 'Confirm') {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
    modal.innerHTML = `
        <div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #30363d;text-align:center;">
            <h3 style="color:#f59e0b;margin:0 0 16px 0;font-size:1.2em;">${title}</h3>
            <p style="color:#e6edf3;margin-bottom:20px;white-space:pre-wrap;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button id="confirmBtn" style="flex:1;padding:12px;background:#3b82f6;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Yes</button>
                <button id="cancelBtn" style="flex:1;padding:12px;background:#64748b;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#confirmBtn').onclick = () => { modal.remove(); if (onConfirm) onConfirm(); };
    modal.querySelector('#cancelBtn').onclick = () => { modal.remove(); if (onCancel) onCancel(); };
    modal.querySelector('#confirmBtn').focus();
}
