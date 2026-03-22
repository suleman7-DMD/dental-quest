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

// ==================== STORAGE KEYS ====================
// CRITICAL: graduation-roadmap uses its OWN namespace, separate from d3-roadmap
const STORAGE_KEY = 'graduationRoadmapData';
const OLD_STORAGE_KEY = 'd3RoadmapData';  // For one-time migration only
const FIREBASE_APP_NAME = 'graduationRoadmap';
const OLD_FIREBASE_APP_NAME = 'd3Roadmap';  // For one-time migration only

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
        dashboardSnapshots: [],
        missingNotes: {}        // Missing progress notes tracker — keyed by note-{chart}-{dateNoHyphens}
    },
    // To-do list — flat checklist for clinic-related tasks from multiple sources
    todoList: {
        items: {},              // Object with ID keys: { "todo-0001-20260321": { id, description, source, ... } }
        _nextSeq: 1,            // Sequential counter for manual adds
        lastUpdated: null       // ISO timestamp of last import/change
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
            dashboardSnapshots: [],
            missingNotes: {}
        },
        todoList: {
            items: {},
            _nextSeq: 1,
            lastUpdated: null
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
let awaitingPinEntry = false;   // True while PIN prompt is showing — blocks fallback timers from firing
let clinicalDataDirty = true;   // True when clinical data changed — gates syncClinicalToMonthlyPlanner(). Starts true for first init.

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
    const hasMissingNotes = getCount(data.clinicalData?.missingNotes) > 0;
    const hasTodoItems = getCount(data.todoList?.items) > 0;

    // Empty if NONE of these exist
    return !hasDeadlines && !hasTasks && !hasAppointments && !hasBlocks &&
           !hasNotes && !hasPatients && !hasCompletedDeadlines &&
           !hasExamStudyProgress && !hasGrades && !hasExams && !hasEditedDeadlines &&
           !hasPatientRecords && !hasDashboardSnapshots && !hasCompletedProcedures && !hasCompetencies &&
           !hasMissingNotes && !hasTodoItems;
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
                localStorage.removeItem(BACKUP_STORAGE_KEY);
                // Also try removing old backup key
                localStorage.removeItem('d3RoadmapBackup');
                localStorage.setItem(key, value);
                return true;
            } catch (e2) {
                try {
                    const pinHash = localStorage.getItem('dentalQuestPin');
                    if (pinHash) {
                        localStorage.removeItem('gradRoadmap_checkpoints_' + pinHash);
                        localStorage.removeItem('d3roadmap_checkpoints_' + pinHash);
                    }
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

// ==================== PROCEDURE TYPES ====================
// Maps to competency category keys for auto-linking procedures → competencies
const PROCEDURE_TYPES = {
    fixed: 'Fixed Prosthodontics',
    operative: 'Operative',
    dentures: 'Complete Dentures',
    rpd: 'RPDs',
    srp: 'SRPs',
    endo: 'Endodontics',
    oralsurg: 'Oral Surgery',
    peds: 'Pediatric Dentistry',
    perio: 'Periodontology',
    grouppractice: 'Group Practice',
    txplanning: 'Treatment Planning',
    geriatrics: 'Geriatric Dental Medicine',
    externship: 'Externship & SPS',
    other: 'Other'
};

// Find a competency item by ID across all categories/sections
// Returns { item, catKey, section } or null
function findCompetencyItem(itemId) {
    const competencies = roadmapData.clinicalData?.competencies;
    if (!competencies) return null;

    for (const catKey in competencies) {
        const cat = competencies[catKey];
        for (const sec of getValues(cat.sections)) {
            if (sec.items && sec.items[itemId]) {
                return { item: sec.items[itemId], catKey, section: sec };
            }
        }
    }
    return null;
}

// Get all competency items for a given category key
function getCompetencyItemsForCategory(catKey) {
    const competencies = roadmapData.clinicalData?.competencies;
    if (!competencies || !competencies[catKey]) return [];

    const items = [];
    getValues(competencies[catKey].sections).forEach(sec => {
        getValues(sec.items).forEach(item => {
            if (item.completed < item.required) {
                items.push(item);
            }
        });
    });
    return items;
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

// ==================== SMART CLINICAL AGGREGATION ====================
// Multi-source appointment count — aggregates from all data islands
function getSmartAppointmentCount() {
    const appointments = getValues(roadmapData.clinicalData?.appointments);
    const patients = roadmapData.clinicalData?.patients || {};
    const patientRecords = roadmapData.clinicalData?.patientRecords || {};
    const completedTasks = roadmapData.monthlyPlanner?.completedTasks || {};

    // Source 1: Appointments with status === 'completed'
    const completedApts = appointments.filter(function(a) { return a.status === 'completed'; });
    const aptIds = new Set(completedApts.map(function(a) { return a.id; }));

    // Source 2: Clinic planner tasks marked complete (clinic_ prefix)
    Object.keys(completedTasks).forEach(function(taskId) {
        if (taskId.startsWith('clinic_')) {
            var aptId = taskId.replace('clinic_', '');
            aptIds.add(aptId);
        }
    });

    // Source 3: Patient visit history (unique visits not already counted)
    var visitKeys = new Set();
    completedApts.forEach(function(a) {
        if (a.patientId && a.date) visitKeys.add(a.patientId + '|' + a.date);
    });

    var extraVisits = 0;
    // From clinical patients
    Object.values(patients).forEach(function(p) {
        if (p.lastVisit && p.id && !visitKeys.has(p.id + '|' + p.lastVisit)) {
            extraVisits++;
            visitKeys.add(p.id + '|' + p.lastVisit);
        }
    });

    // From patient records (detailed records from Patients tab)
    Object.values(patientRecords).forEach(function(pr) {
        if (pr.lastVisit && pr.id && !visitKeys.has(pr.id + '|' + pr.lastVisit)) {
            // Avoid double-counting if patient already counted
            var matchedByClinicalPatient = Object.values(patients).some(function(p) {
                return (p.name === pr.name || p.chartNumber === pr.chartNumber) && p.lastVisit === pr.lastVisit;
            });
            if (!matchedByClinicalPatient) {
                extraVisits++;
                visitKeys.add(pr.id + '|' + pr.lastVisit);
            }
        }
    });

    var computedTotal = aptIds.size + extraVisits;

    // Source 4: SPS Dashboard snapshot (authoritative ground truth from school system)
    var snapshotCount = 0;
    var snapshots = roadmapData.clinicalData?.dashboardSnapshots;
    if (snapshots && snapshots.length > 0) {
        snapshotCount = parseInt(snapshots[0].appointments?.attended) || 0;
    }

    // Use the HIGHER of computed vs snapshot — snapshot is the school's official count
    var total = Math.max(computedTotal, snapshotCount);

    return {
        total: total,
        fromAppointments: completedApts.length,
        fromPlannerSync: Math.max(0, aptIds.size - completedApts.length),
        fromPatientVisits: extraVisits,
        fromSnapshot: snapshotCount,
        snapshotIsFloor: snapshotCount > computedTotal
    };
}

// Multi-source procedure count — aggregates from all data islands
function getSmartProcedureCount() {
    var procedures = getValues(roadmapData.clinicalData?.completedProcedures);
    var competencies = roadmapData.clinicalData?.competencies;

    // Source 1: Formal procedure records
    var formalCount = procedures.length;

    // Source 2: Competency items with completed > 0 (deduped against procedure-linked entries)
    var competencyDerivedCount = 0;

    if (competencies) {
        Object.values(competencies).forEach(function(cat) {
            getValues(cat.sections).forEach(function(sec) {
                getValues(sec.items).forEach(function(item) {
                    if (item.completed > 0) {
                        var evidenceCount = (item.completionEntries || []).length;
                        // Manual adjustments = completed count minus evidence-linked entries
                        var manualCount = Math.max(0, item.completed - evidenceCount);
                        competencyDerivedCount += manualCount;
                    }
                });
            });
        });
    }

    var computedTotal = formalCount + competencyDerivedCount;

    // Source 3: SPS Dashboard snapshot (authoritative ground truth from school system)
    var snapshotCount = 0;
    var snapshots = roadmapData.clinicalData?.dashboardSnapshots;
    if (snapshots && snapshots.length > 0) {
        snapshotCount = parseInt(snapshots[0].procedures?.totalCompleted) || 0;
    }

    // Use the HIGHER of computed vs snapshot — snapshot is the school's official count
    var total = Math.max(computedTotal, snapshotCount);

    return {
        total: total,
        fromProcedureRecords: formalCount,
        fromCompetencyManual: competencyDerivedCount,
        fromSnapshot: snapshotCount,
        snapshotIsFloor: snapshotCount > computedTotal
    };
}

// Calculate graduation readiness as weighted percentage across all 14 competency categories
function calculateGraduationReadiness() {
    var competencies = roadmapData.clinicalData?.competencies;
    if (!competencies || typeof calculateCategoryStats !== 'function') return { percent: 0, details: {} };

    var totalWeight = 0;
    var completedWeight = 0;
    var details = {};

    Object.entries(competencies).forEach(function(entry) {
        var key = entry[0];
        var cat = entry[1];
        var stats = calculateCategoryStats(cat);
        var pct = stats.totalUnits > 0 ? stats.completedUnits / stats.totalUnits : 0;
        var weight = stats.totalUnits; // Weight by number of requirements
        totalWeight += weight;
        completedWeight += pct * weight;
        details[key] = {
            name: cat.name,
            icon: cat.icon ?? '',
            color: cat.color ?? '#3b82f6',
            percent: Math.round(pct * 100),
            completed: stats.completedUnits,
            total: stats.totalUnits,
            status: pct >= 1 ? 'complete' : pct >= 0.5 ? 'on-track' : pct > 0 ? 'behind' : 'not-started'
        };
    });

    return {
        percent: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0,
        details: details
    };
}

// Get competency gaps — items with 0 progress or behind pace
function getCompetencyGaps() {
    var competencies = roadmapData.clinicalData?.competencies;
    if (!competencies) return { zeroProgress: [], behindPace: [], total: 0 };

    var zeroProgress = [];
    var behindPace = [];

    // Calculate weeks remaining to graduation
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var graduation = new Date(2027, 4, 12); // May 12, 2027
    var weeksRemaining = Math.max(1, Math.ceil((graduation - today) / (7 * 24 * 60 * 60 * 1000)));

    Object.entries(competencies).forEach(function(entry) {
        var catKey = entry[0];
        var cat = entry[1];
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                if (item.completed >= item.required) return; // Done

                var remaining = item.required - item.completed;

                if (item.completed === 0) {
                    zeroProgress.push({
                        id: item.id,
                        text: item.text,
                        catKey: catKey,
                        catName: cat.name,
                        catColor: cat.color ?? '#3b82f6',
                        required: item.required,
                        remaining: remaining
                    });
                } else if (remaining > weeksRemaining * 0.5) {
                    // Behind pace: need more than 0.5/week to finish
                    behindPace.push({
                        id: item.id,
                        text: item.text,
                        catKey: catKey,
                        catName: cat.name,
                        catColor: cat.color ?? '#3b82f6',
                        completed: item.completed,
                        required: item.required,
                        remaining: remaining,
                        paceNeeded: (remaining / weeksRemaining).toFixed(1) + '/wk'
                    });
                }
            });
        });
    });

    return { zeroProgress: zeroProgress, behindPace: behindPace, total: zeroProgress.length + behindPace.length };
}

// Calculate pace projection — "At current pace, hit target by [date]"
function calculatePaceProjection(currentCount, targetCount, dataStartDate) {
    if (currentCount <= 0 || targetCount <= 0) return null;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var startDate = dataStartDate ? parseLocalDate(dataStartDate) : new Date(2025, 7, 1); // Aug 1, 2025 default D3 start

    var daysSoFar = Math.max(1, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));
    var ratePerDay = currentCount / daysSoFar;

    if (ratePerDay <= 0) return null;

    var remaining = targetCount - currentCount;
    if (remaining <= 0) return { projectedDate: 'Already met!', daysToTarget: 0, ratePerWeek: (ratePerDay * 7).toFixed(1) };

    var daysToTarget = Math.ceil(remaining / ratePerDay);
    var projectedDate = new Date(today);
    projectedDate.setDate(projectedDate.getDate() + daysToTarget);

    return {
        projectedDate: projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysToTarget: daysToTarget,
        ratePerWeek: (ratePerDay * 7).toFixed(1)
    };
}

// Navigate to a specific entity across tabs
function navigateToEntity(type, id) {
    switch (type) {
        case 'patient':
            switchTab('patients');
            setTimeout(function() {
                if (typeof selectPatient === 'function') selectPatient(id);
            }, 100);
            break;
        case 'appointment':
            switchTab('clinical');
            setTimeout(function() {
                var btn = document.querySelector('.clinical-subtab[onclick*="appointments"]');
                if (btn) switchClinicalSubtab('appointments', btn);
            }, 100);
            break;
        case 'procedure':
            switchTab('clinical');
            setTimeout(function() {
                var btn = document.querySelector('.clinical-subtab[onclick*="procedures"]');
                if (btn) switchClinicalSubtab('procedures', btn);
            }, 100);
            break;
        case 'competency':
            switchTab('competencies');
            setTimeout(function() {
                var result = findCompetencyItem(id);
                if (result) {
                    var body = document.getElementById('compBody-' + result.catKey);
                    if (body && !body.classList.contains('expanded')) {
                        toggleCompCategory(result.catKey);
                    }
                }
            }, 100);
            break;
        case 'deadline':
            switchTab('deadlines');
            break;
    }
}

// ==================== MISSING NOTES HELPERS ====================

function getMissingNotesAlertLevel(pendingCount) {
    if (pendingCount >= 6) return 'RED';
    if (pendingCount >= 4) return 'YELLOW';
    return 'GREEN';
}

function getMissingNotesPending() {
    var notes = roadmapData.clinicalData?.missingNotes ?? {};
    return getValues(notes).filter(function(n) { return n.status === 'pending'; });
}

function getMissingNotesCompleted() {
    var notes = roadmapData.clinicalData?.missingNotes ?? {};
    return getValues(notes).filter(function(n) { return n.status === 'completed'; });
}

function toggleMissingNoteStatus(noteId) {
    var notes = roadmapData.clinicalData.missingNotes;
    if (!notes || !notes[noteId]) return;
    var note = notes[noteId];
    if (note.status === 'pending') {
        note.status = 'completed';
        note.completedAt = new Date().toISOString();
    } else {
        note.status = 'pending';
        note.completedAt = null;
    }
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderDashboard();
}

function clearCompletedMissingNotes() {
    var notes = roadmapData.clinicalData.missingNotes;
    if (!notes) return;
    var keys = Object.keys(notes);
    var cleared = 0;
    for (var i = 0; i < keys.length; i++) {
        if (notes[keys[i]].status === 'completed') {
            delete notes[keys[i]];
            cleared++;
        }
    }
    if (cleared > 0) {
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        renderDashboard();
        showToast(cleared + ' completed note(s) cleared', 'info');
    }
}

// Cross-reference missing notes faculty with upcoming appointments
function getMissingNotesFacultyMatches() {
    var pending = getMissingNotesPending();
    if (pending.length === 0) return [];
    var appointments = getValues(roadmapData.clinicalData?.appointments ?? {});
    var today = getLocalDateString(new Date());
    var upcoming = appointments.filter(function(a) {
        return a.date >= today && a.status !== 'cancelled';
    });
    var matches = [];
    for (var i = 0; i < pending.length; i++) {
        var note = pending[i];
        var facultyLower = (note.faculty ?? '').toLowerCase().trim();
        if (!facultyLower) continue;
        for (var j = 0; j < upcoming.length; j++) {
            var apt = upcoming[j];
            var aptText = ((apt.procedures ?? '') + ' ' + (apt.notes ?? '')).toLowerCase();
            if (aptText.indexOf(facultyLower) !== -1 || (apt.faculty ?? '').toLowerCase().indexOf(facultyLower) !== -1) {
                matches.push({
                    note: note,
                    appointment: apt,
                    message: 'Dr. ' + escapeHtml(note.faculty) + ' is faculty on your ' + formatDate(apt.date) + ' appointment — get ' + escapeHtml(note.patientName) + ' note signed then.'
                });
            }
        }
    }
    return matches;
}

// ==================== TODO LIST HELPERS ====================

function getTodoPending() {
    var items = roadmapData.todoList?.items ?? {};
    return getValues(items).filter(function(t) { return t.status === 'pending'; });
}

function getTodoCompleted() {
    var items = roadmapData.todoList?.items ?? {};
    return getValues(items).filter(function(t) { return t.status === 'completed'; });
}

function addTodoItem(description, source, sourceDetail) {
    if (!roadmapData.todoList) {
        roadmapData.todoList = { items: {}, _nextSeq: 1, lastUpdated: null };
    }
    if (!roadmapData.todoList.items || Array.isArray(roadmapData.todoList.items)) {
        roadmapData.todoList.items = {};
    }
    var seq = roadmapData.todoList._nextSeq ?? 1;
    var today = getLocalDateString(new Date());
    var dateCompact = today.replace(/-/g, '');
    var id = 'todo-' + String(seq).padStart(4, '0') + '-' + dateCompact;
    roadmapData.todoList.items[id] = {
        id: id,
        description: description,
        source: source ?? 'MANUAL',
        dateAdded: today,
        sourceDetail: sourceDetail ?? '',
        addedAt: new Date().toISOString(),
        completedAt: null,
        status: 'pending'
    };
    roadmapData.todoList._nextSeq = seq + 1;
    roadmapData.todoList.lastUpdated = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    return id;
}

function toggleTodoStatus(todoId) {
    var items = roadmapData.todoList?.items;
    if (!items || !items[todoId]) return;
    var item = items[todoId];
    if (item.status === 'pending') {
        item.status = 'completed';
        item.completedAt = new Date().toISOString();
    } else {
        item.status = 'pending';
        item.completedAt = null;
    }
    roadmapData.todoList.lastUpdated = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderDashboard();
}

function clearCompletedTodos() {
    var items = roadmapData.todoList?.items;
    if (!items) return;
    var keys = Object.keys(items);
    var cleared = 0;
    for (var i = 0; i < keys.length; i++) {
        if (items[keys[i]].status === 'completed') {
            delete items[keys[i]];
            cleared++;
        }
    }
    if (cleared > 0) {
        roadmapData.todoList.lastUpdated = new Date().toISOString();
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        renderDashboard();
        showToast(cleared + ' completed task(s) cleared', 'info');
    }
}

function getTodoSourceBadgeColor(source) {
    switch (source) {
        case 'EMAIL': return '#3b82f6';
        case 'SCREENSHOT': return '#8b5cf6';
        case 'CLINIC': return '#10b981';
        case 'SYSTEM': return '#f59e0b';
        default: return '#6b7280'; // MANUAL = gray
    }
}
