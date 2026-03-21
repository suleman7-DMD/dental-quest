// ==================== D3 ROADMAP: STATE & UTILITIES ====================
// Globals, defaults, validation, data utilities, date helpers, UI helpers

// ==================== FIREBASE CONFIGURATION ====================
// Same config as Dental Quest main app
const firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};

let firebaseInitialized = false;
let database = null;
let firebaseSyncEnabled = false;
let currentUser = null;
let userPath = null;
let saveDebounceTimer = null;

// Cross-app sync: Main app tasks
let mainAppTasksRef = null;
let mainAppTasks = [];

// ==================== DATA ====================
let roadmapData = {
    pedsLockedIn: 33.3,
    mandatoryItems: {
        gatecontrol: false,
        acutepain: false,
        peextremities: false,
        npi: false,
        orthomodule: false,
        ips: false,
        periodiscussion: false
    },
    grades: {
        oralmed: { quiz1: 100 }, // Quiz 1 done
        paincontrol: {},
        critthink: { quiz1: 100 }, // Already done
        peds: { exam1: 77, headstart: 100 },
        perio: { midterm: null, writtenAssignment: 100 },
        ortho: { midterm: null }
    },
    editedDeadlines: {},
    customDeadlines: {},  // Object with ID keys for Firebase safety
    deletedDeadlines: {}, // Object with ID keys for Firebase safety
    completedDeadlines: {},  // Track completed deadlines with grades - CRITICAL for sync
    examStudyProgress: {}, // Tracks which lectures have been studied: { 'peds-exam2-lec11': true, ... }
    dailyPlanner: {
        date: null,
        focus: '',
        notes: '',
        blocks: {},
        pomodorosCompleted: 0,
        bedtime: '23:00'
    },
    monthlyPlanner: {
        notes: {},
        customTasks: {},
        overriddenStatic: {},
        completedTasks: {},
        hiddenClinicTasks: {},
        currentWeekSchedule: {}
    },
    // Clinical patient tracking
    clinicalData: {
        patients: {},           // Patient records keyed by ID
        appointments: {},       // Object with ID keys for Firebase safety
        completedProcedures: {}, // Object with ID keys for Firebase safety
        competencies: null,     // Graduation requirements - initialized from DEFAULT_COMPETENCIES
        patientRecords: {},     // Detailed patient records (Patients tab — Google Docs style)
        dashboardSnapshots: []
    },
    // Exams array for cross-app integration (Body Comp Tracker pulls this)
    exams: {},  // Object with ID keys for Firebase safety
    // Graduation prep tracking
    graduationPrep: {
        externship: { startDate: null, endDate: null, patients: {}, logistics: '', notes: '' },
        cdcaAdex: { sessions: {}, notes: '' },
        inbde: { notes: '' },
        jobSearch: { notes: '' }
    },
    // Clinic headline stats
    clinicHeadlines: {
        appointments: { completed: 0, target: 90 },
        procedures: { completed: 0, target: 116 }
    },
    lastSaved: null,
    // Version control for conflict detection
    // CRITICAL: _version MUST be 0 for default state so cloud ALWAYS wins on fresh device
    _version: 0,
    _lastModified: null,
    _dataLoaded: false  // Flag to track if real data was loaded
};

// Returns a fresh copy of the default roadmap data structure
// Used by importAndRestoreDirectly() and other reset operations
function getDefaultRoadmapData() {
    return {
        pedsLockedIn: 33.3,
        mandatoryItems: {
            gatecontrol: false,
            acutepain: false,
            peextremities: false,
            npi: false,
            orthomodule: false,
            ips: false,
            periodiscussion: false
        },
        grades: {
            oralmed: { quiz1: 100 },
            paincontrol: {},
            critthink: { quiz1: 100 },
            peds: { exam1: 77, headstart: 100 },
            perio: { midterm: null, writtenAssignment: 100 },
            ortho: { midterm: null }
        },
        editedDeadlines: {},
        customDeadlines: {},
        deletedDeadlines: {},
        completedDeadlines: {},
        examStudyProgress: {},
        dailyPlanner: {
            date: null,
            focus: '',
            notes: '',
            blocks: {},
            pomodorosCompleted: 0,
            bedtime: '23:00'
        },
        monthlyPlanner: {
            notes: {},
            customTasks: {},
            overriddenStatic: {},
            completedTasks: {},
            hiddenClinicTasks: {},
            currentWeekSchedule: {}
        },
        clinicalData: {
            patients: {},
            appointments: {},
            completedProcedures: {},
            competencies: null,
            patientRecords: {},
            dashboardSnapshots: []
        },
        exams: {},
        graduationPrep: {
            externship: { startDate: null, endDate: null, patients: {}, logistics: '', notes: '' },
            cdcaAdex: { sessions: {}, notes: '' },
            inbde: { notes: '' },
            jobSearch: { notes: '' }
        },
        clinicHeadlines: {
            appointments: { completed: 0, target: 90 },
            procedures: { completed: 0, target: 116 }
        },
        lastSaved: null,
        _version: 0,
        _lastModified: null,
        _dataLoaded: false
    };
}

// ============================================
// SYNC PROTECTION FLAGS - PREVENTS DATA WIPE
// ============================================
let isInitialLoad = true;      // Block ALL saves until data loaded
let hasLoadedFromCloud = false; // Track if we've checked Firebase
let pinValidated = false;       // Track if PIN has been validated (prevents race condition)

// Check if state has real user data (not just defaults)
function isEmptyState(data) {
    if (!data) return true;

    // D3 Roadmap specific checks - must have at least ONE of these
    const hasDeadlines = getCount(data.customDeadlines) > 0;
    const hasTasks = getCount(data.monthlyPlanner?.customTasks) > 0;
    const hasAppointments = getCount(data.clinicalData?.appointments) > 0;
    const hasBlocks = getCount(data.dailyPlanner?.blocks) > 0;
    const hasNotes = getCount(data.monthlyPlanner?.notes) > 0;
    const hasPatients = getCount(data.clinicalData?.patients) > 0;
    const hasCompletedDeadlines = getCount(data.completedDeadlines) > 0;
    const hasExamStudyProgress = getCount(data.examStudyProgress) > 0;
    const hasGrades = data.grades && Object.values(data.grades).some(course =>
        course && Object.keys(course).length > 0
    );
    const hasExams = getCount(data.exams) > 0;
    const hasEditedDeadlines = getCount(data.editedDeadlines) > 0;
    // FIX: Check patientRecords, dashboardSnapshots, completedProcedures
    // Without these, imported patient data could be treated as "empty" and saves blocked by Guard C
    const hasPatientRecords = getCount(data.clinicalData?.patientRecords) > 0;
    const hasDashboardSnapshots = Array.isArray(data.clinicalData?.dashboardSnapshots) && data.clinicalData.dashboardSnapshots.length > 0;
    const hasCompletedProcedures = getCount(data.clinicalData?.completedProcedures) > 0;
    const hasCompetencies = data.clinicalData?.competencies && Object.keys(data.clinicalData.competencies).length > 0;

    // Empty if NONE of these exist
    return !hasDeadlines && !hasTasks && !hasAppointments && !hasBlocks &&
           !hasNotes && !hasPatients && !hasCompletedDeadlines &&
           !hasExamStudyProgress && !hasGrades && !hasExams && !hasEditedDeadlines &&
           !hasPatientRecords && !hasDashboardSnapshots && !hasCompletedProcedures && !hasCompetencies;
}

function hasRealData(data) {
    return !isEmptyState(data);
}

// ==================== DATA UTILITIES ====================

// CRITICAL: Firebase converts arrays to objects with numeric keys
// This helper ensures we always get proper arrays back
function ensureArray(val, fallback = []) {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    // Firebase converted array to object - convert back
    if (typeof val === 'object') {
        return Object.values(val);
    }
    return fallback;
}

// Generate unique IDs for object-based storage (prevents Firebase array corruption)
function generateId(prefix = 'item') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}

// Get values from object as array (works with both objects and arrays)
function getValues(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    return Object.values(obj).filter(v => v !== null && v !== undefined);
}

// Generate stable deadline ID based on properties (for static deadlines)
// Custom deadlines use their own 'id' property
// Sanitize a string to be safe as a Firebase RTDB key
// Firebase prohibits: . # $ / [ ] in key names
function sanitizeFirebaseKey(key) {
    return key.replace(/[.#$/\[\]]/g, '');
}

function getDeadlineId(deadline) {
    if (deadline.id) return sanitizeFirebaseKey(deadline.id); // Custom deadlines have their own ID
    // For static deadlines, create a stable hash from key properties
    const key = `${deadline.date}_${deadline.course}_${deadline.what}`.toLowerCase().replace(/\s+/g, '_');
    return sanitizeFirebaseKey('dl_' + key);
}

// Recursively sanitize ALL keys in a nested object for Firebase safety
// This is a safety net applied before every .set() call
function sanitizeFirebaseData(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => sanitizeFirebaseData(item));
    const result = {};
    for (const key of Object.keys(obj)) {
        const safeKey = sanitizeFirebaseKey(key);
        result[safeKey] = sanitizeFirebaseData(obj[key]);
    }
    return result;
}

// Migrate roadmapData keys that contain Firebase-invalid characters
// This fixes data that was stored with old unsanitized getDeadlineId() keys
function migrateInvalidFirebaseKeys(data) {
    if (!data) return;
    const invalidKeyPattern = /[.#$/\[\]]/;
    const fieldsToMigrate = ['editedDeadlines', 'completedDeadlines', 'customDeadlines', 'deletedDeadlines', 'examStudyProgress'];
    let migrated = false;

    fieldsToMigrate.forEach(field => {
        if (data[field] && typeof data[field] === 'object' && !Array.isArray(data[field])) {
            const keys = Object.keys(data[field]);
            keys.forEach(key => {
                if (invalidKeyPattern.test(key)) {
                    const safeKey = sanitizeFirebaseKey(key);
                    if (safeKey !== key) {
                        // Copy value to sanitized key, preserving existing safe-key data
                        if (!data[field][safeKey]) {
                            data[field][safeKey] = data[field][key];
                        }
                        delete data[field][key];
                        migrated = true;
                    }
                }
            });
        }
    });

    if (migrated) {
        console.log('Firebase key migration complete — invalid characters removed');
    }
}

// Get count of items in object or array
function getCount(obj) {
    if (!obj) return 0;
    if (Array.isArray(obj)) return obj.length;
    return Object.keys(obj).length;
}

// Safe localStorage write with quota handling
// Progressively clears backups, then checkpoints if quota exceeded
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn('localStorage quota exceeded, clearing backups...');
            try {
                localStorage.removeItem('d3RoadmapBackup');
                localStorage.setItem(key, value);
                return true;
            } catch (e2) {
                try {
                    const pinHash = localStorage.getItem('dentalQuestPin');
                    if (pinHash) localStorage.removeItem('d3roadmap_checkpoints_' + pinHash);
                    localStorage.setItem(key, value);
                    return true;
                } catch (e3) {
                    console.error('Storage full even after cleanup');
                    if (typeof showToast === 'function') showToast('Storage full - data saved to cloud only', 'warning');
                    return false;
                }
            }
        }
        console.error('localStorage write error:', e);
        return false;
    }
}

// Convert array to object with unique IDs (for migration)
function migrateArrayToObject(data, keyPrefix) {
    if (!data) return {};
    // If it's already an object with non-numeric keys, return as-is
    if (typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        if (keys.length === 0) return {};
        if (keys.every(k => typeof k === 'string' && k.includes('_'))) {
            return data; // Already migrated
        }
        // Has numeric keys - Firebase corrupted it
        data = Object.values(data).filter(v => v !== null && v !== undefined);
    }
    if (!Array.isArray(data)) return {};
    const result = {};
    data.forEach((item, index) => {
        if (item === null || item === undefined) return;
        const id = item.id && typeof item.id === 'string' && item.id.includes('_')
            ? item.id
            : generateId(keyPrefix) + '_' + index;
        result[id] = { ...item, id };
    });
    return result;
}

// Migrate competencies structure: sections array -> object, items array -> object
function migrateCompetencies(competencies) {
    if (!competencies) return null;
    const result = {};

    for (const catKey in competencies) {
        const cat = competencies[catKey];
        result[catKey] = { ...cat };

        // Migrate sections array to object
        if (Array.isArray(cat.sections)) {
            const sectionsObj = {};
            cat.sections.forEach((section, idx) => {
                const secId = section.id || `section_${catKey}_${idx}`;
                sectionsObj[secId] = { ...section, id: secId };

                // Migrate items within each section
                if (Array.isArray(section.items)) {
                    const itemsObj = {};
                    section.items.forEach(item => {
                        const itemId = item.id || generateId('item');
                        itemsObj[itemId] = { ...item, id: itemId };
                    });
                    sectionsObj[secId].items = itemsObj;
                } else if (section.items && typeof section.items === 'object') {
                    // Already an object - ensure all items have ids
                    const itemsObj = {};
                    Object.entries(section.items).forEach(([key, item]) => {
                        if (item) {
                            const itemId = item.id || key;
                            itemsObj[itemId] = { ...item, id: itemId };
                        }
                    });
                    sectionsObj[secId].items = itemsObj;
                }
            });
            result[catKey].sections = sectionsObj;
        } else if (cat.sections && typeof cat.sections === 'object') {
            // Already an object - ensure nested items are also objects
            const sectionsObj = {};
            Object.entries(cat.sections).forEach(([secKey, section]) => {
                if (section) {
                    const secId = section.id || secKey;
                    sectionsObj[secId] = { ...section, id: secId };

                    if (Array.isArray(section.items)) {
                        const itemsObj = {};
                        section.items.forEach(item => {
                            const itemId = item.id || generateId('item');
                            itemsObj[itemId] = { ...item, id: itemId };
                        });
                        sectionsObj[secId].items = itemsObj;
                    } else if (section.items && typeof section.items === 'object') {
                        const itemsObj = {};
                        Object.entries(section.items).forEach(([key, item]) => {
                            if (item) {
                                const itemId = item.id || key;
                                itemsObj[itemId] = { ...item, id: itemId };
                            }
                        });
                        sectionsObj[secId].items = itemsObj;
                    }
                }
            });
            result[catKey].sections = sectionsObj;
        }
    }
    return result;
}

// Merge competencies: cloud over local at category level
// FIXES: empty cloud competencies ({}) no longer wipes local data
function mergeCompetencies(localComp, cloudComp) {
    const local = migrateCompetencies(localComp);
    const cloud = migrateCompetencies(cloudComp);
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud || Object.keys(cloud).length === 0) return local;
    // Deep merge: cloud categories override local, but local-only categories preserved
    return { ...local, ...cloud };
}

// Migrate dailyPlanner.blocks array to object
function migrateDailyPlannerBlocks(dailyPlanner) {
    if (!dailyPlanner) return { date: null, focus: '', notes: '', blocks: {}, pomodorosCompleted: 0, bedtime: '23:00' };

    const result = { ...dailyPlanner };

    if (Array.isArray(dailyPlanner.blocks)) {
        const blocksObj = {};
        dailyPlanner.blocks.forEach((block, idx) => {
            if (block) {
                const blockId = block.id ? `block_${block.id}` : generateId('block');
                blocksObj[blockId] = { ...block, id: blockId };
            }
        });
        result.blocks = blocksObj;
    } else if (dailyPlanner.blocks && typeof dailyPlanner.blocks === 'object') {
        // Check if it's a Firebase-corrupted sparse array (numeric keys)
        const keys = Object.keys(dailyPlanner.blocks);
        if (keys.length > 0 && keys.some(k => /^\d+$/.test(k))) {
            const blocksObj = {};
            Object.values(dailyPlanner.blocks).forEach(block => {
                if (block) {
                    const blockId = block.id ? `block_${block.id}` : generateId('block');
                    blocksObj[blockId] = { ...block, id: blockId };
                }
            });
            result.blocks = blocksObj;
        }
        // Otherwise already proper object
    } else {
        result.blocks = {};
    }

    return result;
}

// ==================== DATE UTILITIES ====================

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

function getCountdown(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = parseLocalDate(dateStr);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function getCountdownBadge(days, isTbd = false) {
    if (isTbd) {
        return `<span class="find-date">⚠️ FIND DATE</span>`;
    }
    if (days < 0) {
        return `<span class="countdown countdown-passed">PASSED</span>`;
    } else if (days === 0) {
        return `<span class="countdown countdown-critical">TODAY</span>`;
    } else if (days === 1) {
        return `<span class="countdown countdown-critical">TOMORROW</span>`;
    } else if (days <= 7) {
        return `<span class="countdown countdown-critical">${days} DAYS</span>`;
    } else if (days <= 14) {
        return `<span class="countdown countdown-warning">${days} days</span>`;
    } else {
        return `<span class="countdown countdown-normal">${days} days</span>`;
    }
}

function formatDate(dateStr) {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ==================== TAB SWITCHING ====================

// Map old tab IDs to new ones for backward compatibility
const TAB_ID_MAP = {
    'dashboard': 'missioncontrol',
    'grades': 'academics',
    'mandatory': 'academics',
    'dailyplanner': 'schedule',
    'monthlyplanner': 'schedule',
    'exams': 'academics',
    'examcontent': 'academics'
};

function switchTab(tabId, evt) {
    // Close any open modals when switching tabs
    document.querySelectorAll('.mp-modal-overlay').forEach(modal => {
        modal.style.display = 'none';
    });

    // Map old tab IDs to new ones for backward compatibility
    const resolvedTabId = TAB_ID_MAP[tabId] || tabId;

    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    } else {
        // Find and activate the matching tab button
        const matchingBtn = document.querySelector(`.tab-btn[onclick*="'${resolvedTabId}'"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
    }

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + resolvedTabId);
    if (tabEl) tabEl.classList.add('active');

    // Refresh dynamic content
    if (resolvedTabId === 'missioncontrol') renderDashboard();
    if (resolvedTabId === 'deadlines') renderDeadlines();
    if (resolvedTabId === 'clinical') initClinicalTab();
    if (resolvedTabId === 'academics' && typeof loadCourseGrades === 'function') loadCourseGrades();
    if (resolvedTabId === 'gradprep' && typeof renderGraduationPrep === 'function') renderGraduationPrep();
    if (resolvedTabId === 'competencies' && typeof renderCompetencies === 'function') renderCompetencies();
    if (resolvedTabId === 'patients' && typeof initPatientsTab === 'function') initPatientsTab();
    // schedule and remember tabs: sub-tabs / static content handle their own init

    // If navigating to exam content, open the exams accordion
    if (tabId === 'examcontent' || tabId === 'exams') {
        const examsContent = document.getElementById('academics-exams-content');
        const examsArrow = document.getElementById('academics-exams-arrow');
        if (examsContent) {
            examsContent.style.display = 'block';
            if (examsArrow) examsArrow.textContent = '\u25be';
        }
    }
}

// ==================== SCHEDULE SUB-TABS ====================
function switchScheduleSubTab(subTabId) {
    document.querySelectorAll('.schedule-subtab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.schedule-subtab-btn').forEach(btn => btn.classList.remove('active'));
    const target = document.getElementById('schedule-' + subTabId);
    if (target) target.style.display = 'block';
    const btn = document.getElementById('schedule-' + subTabId + '-btn');
    if (btn) btn.classList.add('active');
    if (subTabId === 'monthly' && typeof initMonthlyPlanner === 'function') initMonthlyPlanner();
    if (subTabId === 'daily' && typeof initDailyPlanner === 'function') initDailyPlanner();
}

// ==================== ACADEMICS ACCORDION ====================
function toggleAcademicsSection(sectionId) {
    const content = document.getElementById('academics-' + sectionId + '-content');
    const arrow = document.getElementById('academics-' + sectionId + '-arrow');
    if (!content) return;
    const isOpen = content.style.display !== 'none';
    content.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.textContent = isOpen ? '\u25b8' : '\u25be';
    // Auto-load exam content when opening exams section
    if (!isOpen && sectionId === 'exams' && typeof loadExamCourseContent === 'function') {
        loadExamCourseContent();
    }
}

// ==================== REMEMBER TAB TOGGLE ====================
function toggleLegacyContent() {
    const legacyContent = document.getElementById('legacyRememberContent');
    const toggleBtn = document.querySelector('.toggle-legacy-btn');

    if (legacyContent.classList.contains('visible')) {
        legacyContent.classList.remove('visible');
        toggleBtn.textContent = 'Read more in a different way';
    } else {
        legacyContent.classList.add('visible');
        toggleBtn.textContent = 'Hide legacy content';
        // Scroll to the legacy content
        legacyContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==================== COURSE ACCORDION ====================
function toggleCourse(courseId) {
    const body = document.getElementById('course-' + courseId);
    const header = body.previousElementSibling;

    body.classList.toggle('show');
    header.classList.toggle('expanded');
}

// ==================== MANDATORY CHECKBOXES ====================
function toggleMandatory(itemId) {
    const item = document.getElementById('mandatory-' + itemId);
    const checkbox = item.querySelector('input');

    roadmapData.mandatoryItems[itemId] = checkbox.checked;

    if (checkbox.checked) {
        item.classList.remove('unchecked');
        item.classList.add('checked');
    } else {
        item.classList.remove('checked');
        item.classList.add('unchecked');
    }

    saveData();
}

// ==================== HTML ESCAPE ====================
function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==================== TOAST & MODALS ====================
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('toast-error');
    else if (type === 'warning') toast.classList.add('toast-warning');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), type === 'error' ? 4000 : 2000);
}

// Custom Alert Modal (replaces blocking alert())
function showCustomAlert(message, title = 'Notice', callback = null) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
    modal.innerHTML = `
        <div style="background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #334155;text-align:center;">
            <h3 style="color:#60a5fa;margin:0 0 16px 0;font-size:1.2em;">${title}</h3>
            <p style="color:#e2e8f0;margin-bottom:20px;white-space:pre-wrap;">${message}</p>
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
        <div style="background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #334155;text-align:center;">
            <h3 style="color:#f59e0b;margin:0 0 16px 0;font-size:1.2em;">${title}</h3>
            <p style="color:#e2e8f0;margin-bottom:20px;white-space:pre-wrap;">${message}</p>
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
