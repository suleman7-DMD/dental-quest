// ==================== D3 ROADMAP: STATE & UTILITIES ====================
// This is the canonical shared state layer for graduation-roadmap.
//
// Responsibilities:
// - Defines roadmapData and getDefaultRoadmapData(), the persisted schema every module shares
// - Defines "is this safe/real data?" helpers used by save guards and sync code
// - Provides object/array migration utilities for Firebase safety
// - Hosts cross-module helpers (date parsing, dashboard counters, navigation, propagation)
//
// Non-responsibilities:
// - Boot/load/save orchestration lives in firebase-sync.js
// - Feature-specific rendering lives in the other graduation-roadmap modules

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
// roadmapData is the single in-memory source of truth for the app.
// If you add a new persisted field, keep this declaration in lockstep with
// getDefaultRoadmapData() below and reconstructState() in firebase-sync.js.
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
        oralmed: {},
        paincontrol: {},
        critthink: {},
        peds: {},
        perio: {},
        ortho: {}
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
    // Clinical workspace data
    clinicalData: {
        patients: {},           // Legacy patient store kept for migration/schema compatibility
        appointments: {},       // Object with ID keys for Firebase safety
        completedProcedures: {}, // Object with ID keys for Firebase safety
        competencies: null,     // Graduation requirements, initialized from DEFAULT_COMPETENCIES
        patientRecords: {},     // Detailed patient records (Patients tab — Google Docs style)
        dashboardSnapshots: [],
        missingNotes: {},       // Missing progress notes tracker — keyed by note-{chart}-{dateNoHyphens}
        autoLinkReviewQueue: [] // Deprecated V1 evidence-link feature; kept as [] for schema compatibility
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
    // Periodic review data — must match getDefaultRoadmapData()
    periodicReviews: {
        pr2: {
            reviewDate: null,
            reviewPeriod: '',
            dashboardDiscrepancyNotes: '',
            adminStatsOverrides: {},
            completedProceduresHtml: '',
            inProgressProcedures: {},
            departmentNotes: {},
            subjectiveReport: '',
            patientNotes: {},
            removedPatients: {},
            lastEdited: null
        }
    },
    competencyUIState: {
        expandedCategories: [],
        viewMode: 'department'
    },
    lastSaved: null,
    // Version control for conflict detection
    // CRITICAL: _version MUST be 0 for default state so cloud ALWAYS wins on fresh device
    _version: 0,
    _lastModified: null,
    _dataLoaded: false  // Flag to track if real data was loaded
};

// Returns a fresh copy of the default roadmap data structure.
// Keep this shape-identical with the live roadmapData declaration above.
// Guard logic, restore flows, and merge code treat missing keys as corruption/drift.
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
            oralmed: {},
            paincontrol: {},
            critthink: {},
            peds: {},
            perio: {},
            ortho: {}
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
            missingNotes: {},
            autoLinkReviewQueue: [],
            deletedAppointmentIds: {},
            deletedProcedureIds: {},
            deletedPatientRecordIds: {}
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
        periodicReviews: {
            pr2: {
                reviewDate: null,
                reviewPeriod: '',
                dashboardDiscrepancyNotes: '',
                adminStatsOverrides: {},
                completedProceduresHtml: '',
                inProgressProcedures: {},
                departmentNotes: {},
                subjectiveReport: '',
                patientNotes: {},
                removedPatients: {},
                lastEdited: null
            }
        },
        competencyUIState: {
            expandedCategories: [],
            viewMode: 'department'
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
let awaitingFirebaseLoad = false; // True while loadFromFirebase() is in progress — blocks fallback timers from racing
let clinicalDataDirty = true;   // True when clinical data changed — gates syncClinicalToMonthlyPlanner(). Starts true for first init.

// Guard C source of truth.
// This answers "does this state contain any real user-authored data worth protecting?"
// not merely "does the object exist?" Add new user-editable collections here so empty
// defaults never get mistaken for legitimate save payloads.
function isEmptyState(data) {
    if (!data) return true;

    // D3 Roadmap specific checks - must have at least ONE of these
    const hasDeadlines = getCount(data.customDeadlines) > 0;
    const hasTasks = getCount(data.monthlyPlanner?.customTasks) > 0;
    const hasAppointments = getCount(data.clinicalData?.appointments) > 0;
    const hasBlocks = getCount(data.dailyPlanner?.blocks) > 0;
    const hasNotes = getCount(data.monthlyPlanner?.notes) > 0;
    // CIS v2: Check unified patientRecords for user-modified entries (not just existence from defaults)
    const hasPatients = getValues(data.clinicalData?.patientRecords).some(function(p) { return p.lastUpdated; });
    const hasCompletedDeadlines = getCount(data.completedDeadlines) > 0;
    const hasExamStudyProgress = getCount(data.examStudyProgress) > 0;
    const hasGrades = data.grades && getValues(data.grades).some(course =>
        course && Object.keys(course).length > 0
    );
    // NOTE: hasExams intentionally NOT checked — exams are auto-generated from static list in initUI()
    // Checking them would let default state pass Guard C when initUI auto-creates exam entries
    const hasEditedDeadlines = getCount(data.editedDeadlines) > 0;
    // FIX: Check patientRecords, dashboardSnapshots, completedProcedures
    // Without these, imported patient data could be treated as "empty" and saves blocked by Guard C
    const hasPatientRecords = getCount(data.clinicalData?.patientRecords) > 0;
    const hasDashboardSnapshots = (() => {
        var s = data.clinicalData?.dashboardSnapshots;
        if (!s) return false;
        if (Array.isArray(s)) return s.length > 0;
        return typeof s === 'object' && Object.keys(s).length > 0;
    })();
    const hasCompletedProcedures = getCount(data.clinicalData?.completedProcedures) > 0;
    // hasCompetencies: Only count as real data if ANY item has completed > 0.
    // Auto-initialized competencies from DEFAULT_COMPETENCIES all have completed: 0.
    const hasCompetencies = (() => {
        const comps = data.clinicalData?.competencies;
        if (!comps || typeof comps !== 'object') return false;
        for (const catKey of Object.keys(comps)) {
            const cat = comps[catKey];
            if (!cat?.sections) continue;
            const sections = getValues(cat.sections);
            for (const section of sections) {
                if (!section?.items) continue;
                const items = getValues(section.items);
                for (const item of items) {
                    if (item && item.completed > 0) return true;
                }
            }
        }
        return false;
    })();
    const hasMissingNotes = getCount(data.clinicalData?.missingNotes) > 0;
    const hasTodoItems = getCount(data.todoList?.items) > 0;
    var hasDailyPlannerContent = (data.dailyPlanner?.focus ?? '') !== '' ||
                                 (data.dailyPlanner?.notes ?? '') !== '' ||
                                 (data.dailyPlanner?.pomodorosCompleted ?? 0) > 0;
    // clinicHeadlines: only count as real data if user changed the target from default (90/116)
    const hasClinicHeadlines = data.clinicHeadlines && (
        (data.clinicHeadlines.appointments?.target != null && data.clinicHeadlines.appointments.target !== 90) ||
        (data.clinicHeadlines.procedures?.target != null && data.clinicHeadlines.procedures.target !== 116)
    );
    var gradPrep = data.graduationPrep;
    var hasGraduationPrep = gradPrep && (
        (gradPrep.externship?.notes || '') !== '' ||
        (gradPrep.externship?.logistics || '') !== '' ||
        (gradPrep.externship?.startDate || '') !== '' ||
        getCount(gradPrep.externship?.patients) > 0 ||
        getCount(gradPrep.cdcaAdex?.sessions) > 0 ||
        (gradPrep.cdcaAdex?.notes || '') !== '' ||
        (gradPrep.inbde?.notes || '') !== '' ||
        (gradPrep.jobSearch?.notes || '') !== ''
    );
    const hasPeriodicReview = data.periodicReviews?.pr2 && (
        (data.periodicReviews.pr2.subjectiveReport ?? '') !== '' ||
        Object.keys(data.periodicReviews.pr2.departmentNotes || {}).length > 0 ||
        (data.periodicReviews.pr2.completedProceduresHtml ?? '') !== '' ||
        Object.keys(data.periodicReviews.pr2.adminStatsOverrides || {}).length > 0 ||
        data.periodicReviews.pr2.reviewDate != null ||
        Object.keys(data.periodicReviews.pr2.removedPatients || {}).length > 0 ||
        Object.keys(data.periodicReviews.pr2.inProgressProcedures || {}).length > 0 ||
        Object.keys(data.periodicReviews.pr2.patientNotes || {}).length > 0 ||
        (data.periodicReviews.pr2.dashboardDiscrepancyNotes ?? '') !== ''
    );

    var hasDeletedRecords = getCount(data.clinicalData?.deletedAppointmentIds) > 0 || getCount(data.clinicalData?.deletedProcedureIds) > 0 || getCount(data.clinicalData?.deletedPatientRecordIds) > 0;

    // Empty if NONE of these exist
    return !hasDeadlines && !hasTasks && !hasAppointments && !hasBlocks &&
           !hasNotes && !hasPatients && !hasCompletedDeadlines &&
           !hasExamStudyProgress && !hasGrades && !hasEditedDeadlines &&
           !hasPatientRecords && !hasDashboardSnapshots && !hasCompletedProcedures && !hasCompetencies &&
           !hasMissingNotes && !hasTodoItems && !hasDailyPlannerContent && !hasPeriodicReview && !hasGraduationPrep && !hasClinicHeadlines && !hasDeletedRecords;
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
    return key.replace(/[.#$/\[\]'"\\]/g, '');
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
            console.warn('localStorage quota exceeded, running cross-app cleanup...');
            // Cross-app cleanup: remove ALL known expendable keys from ALL apps
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
                if (typeof showToast === 'function') showToast('Storage full - saved to cloud only', 'warning');
                return false;
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

// Merge competencies for the V2 manual-count model.
// Shape after migrate:
// { catKey: { sections: { secId: { items: { itemId: { completed, required, note, lastVerified, status } } } } } }
// The first argument wins section/category structure conflicts. Per-item counts resolve by:
// - newer lastVerified wins
// - if neither side is verified, take Math.max(completed)
// Notes stay fill-only so existing local notes are not blown away by empty remote values.
function mergeCompetencies(localComp, cloudComp) {
    var local = migrateCompetencies(localComp);
    var cloud = migrateCompetencies(cloudComp);
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud || Object.keys(cloud).length === 0) return local;

    var result = {};
    Object.keys(local).forEach(function(k) { result[k] = local[k]; });

    // Build flat set of ALL item IDs across ALL local sections (prevents cross-section duplication)
    var allLocalItemIds = {};
    getValues(result).forEach(function(cat) {
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items || {}).forEach(function(item) {
                if (item && item.id) allLocalItemIds[item.id] = true;
            });
        });
    });

    Object.keys(cloud).forEach(function(catKey) {
        if (!result[catKey]) { result[catKey] = cloud[catKey]; return; }
        var localCat = result[catKey];
        var cloudCat = cloud[catKey];
        if (cloudCat.notes && !localCat.notes) localCat.notes = cloudCat.notes;

        var localSections = localCat.sections || {};
        var cloudSections = cloudCat.sections || {};
        Object.keys(cloudSections).forEach(function(secKey) {
            if (!localSections[secKey]) {
                // Cloud section key doesn't exist locally. Check if its ITEMS already exist
                // in other local sections (different key, same items = structural mismatch from rebuild).
                var cloudSecItems = cloudSections[secKey].items || {};
                var hasNewItems = false;
                getValues(cloudSecItems).forEach(function(ci) {
                    if (ci && ci.id && !allLocalItemIds[ci.id]) hasNewItems = true;
                });
                if (!hasNewItems) {
                    // All items already exist locally under different section keys — skip to prevent duplication
                    return;
                }
                // Section has genuinely new items — add it, but filter out duplicates
                var filteredItems = {};
                Object.keys(cloudSecItems).forEach(function(ik) {
                    var ci = cloudSecItems[ik];
                    if (ci && ci.id && !allLocalItemIds[ci.id]) {
                        filteredItems[ik] = ci;
                        allLocalItemIds[ci.id] = true;
                    }
                });
                if (Object.keys(filteredItems).length > 0) {
                    localSections[secKey] = { title: cloudSections[secKey].title, items: filteredItems };
                }
                return;
            }
            var localItems = localSections[secKey].items || {};
            var cloudItems = cloudSections[secKey].items || {};
            Object.keys(cloudItems).forEach(function(itemId) {
                var ci = cloudItems[itemId];
                if (!ci) return;
                // Skip if this item ID already exists in ANY local section (cross-section dedup)
                if (ci.id && allLocalItemIds[ci.id] && !localItems[itemId]) return;
                if (!localItems[itemId]) { localItems[itemId] = ci; allLocalItemIds[ci.id || itemId] = true; return; }
                var li = localItems[itemId];
                // V2: Timestamp-based merge — most recent lastVerified wins
                if (li.lastVerified && ci.lastVerified) {
                    if (new Date(ci.lastVerified) > new Date(li.lastVerified)) {
                        li.completed = ci.completed ?? li.completed;
                        li.lastVerified = ci.lastVerified;
                    }
                } else if (ci.lastVerified && !li.lastVerified) {
                    li.completed = ci.completed ?? li.completed;
                    li.lastVerified = ci.lastVerified;
                } else if (!li.lastVerified && !ci.lastVerified) {
                    // Neither verified — safe default: take higher count
                    li.completed = Math.max(li.completed || 0, ci.completed || 0);
                }
                li.note = li.note || ci.note || '';
                // Derive status from completed count
                if (li.completed >= (li.required || 999)) {
                    li.status = 'completed';
                } else if (li.completed > 0) {
                    li.status = 'in_progress';
                }
            });
            localSections[secKey].items = localItems;
        });
        localCat.sections = localSections;
    });
    return result;
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
            getValues(dailyPlanner.blocks).forEach(block => {
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
    grouppractice: 'Group Practice — D3 (GD 640)',
    grouppractice4: 'Group Practice — D4 (GD 642) & Leadership',
    txplanning: 'Treatment Planning',
    geriatrics: 'Geriatric Dental Medicine',
    externship: 'Externship & SPS',
    other: 'Other'
};

// Keyword patterns for mapping procedure text to competency items
// Used by inferProcedureType()
const KEYWORD_PATTERNS = [
    // Fixed Prosthodontics
    { keywords: ['crown', 'prep', 'fpd', 'bridge', 'pfm', 'e.max', 'emax', 'zirconia'], ids: ['fixed-form-prep', 'fixed-sum-prep'], confidence: 'high' },
    { keywords: ['provisional', 'temp crown', 'temporary'], ids: ['fixed-form-prov', 'fixed-sum-temp'], confidence: 'high' },
    { keywords: ['cementation', 'cement', 'seat crown', 'seat bridge'], ids: ['fixed-form-cement', 'fixed-sum-cement'], confidence: 'high' },
    { keywords: ['final impression', 'pvs', 'digital scan', 'intraoral scan'], ids: ['fixed-form-impr', 'fixed-sum-impr'], confidence: 'high' },
    { keywords: ['cerec', 'same-day', 'same day restoration'], ids: ['fixed-cerec'], confidence: 'high' },
    { keywords: ['implant crown', 'implant supported', 'implant-supported'], ids: ['fixed-implant-crown'], confidence: 'high' },
    // Operative
    { keywords: ['class v', 'cl 5', 'class 5'], ids: ['op-class5-1', 'op-class5-2'], confidence: 'high' },
    { keywords: ['composite', 'do ', 'mo ', 'mod', 'class ii', 'class iii', 'class iv', 'class 2', 'class 3', 'class 4', 'multisurface'], ids: ['op-multi-1', 'op-multi-2', 'op-multi-3', 'op-multi-4', 'op-multi-5', 'op-multi-6'], confidence: 'high' },
    // SRP / Perio
    { keywords: ['srp', 'scaling', 'root planing', 'quadrant scaling'], ids: ['perio-form-quad', 'srp-calc-1', 'srp-calc-2', 'srp-calc-3'], confidence: 'high' },
    { keywords: ['prophy', 'prophylaxis', 'cleaning', 'adult prophy'], ids: ['perio-form-prophy', 'perio-sum-prophy'], confidence: 'high' },
    { keywords: ['ohi', 'oral hygiene instruction', 'home care instruction'], ids: ['perio-form-ohi', 'perio-sum-hci'], confidence: 'high' },
    { keywords: ['re-eval', 're-evaluation', 'reeval', 'gingivitis re-eval'], ids: ['perio-form-reeval-ging', 'perio-sum-reeval-ging'], confidence: 'high' },
    { keywords: ['recall', 'maintenance', 'perio maintenance'], ids: ['perio-form-recall', 'perio-sum-recall'], confidence: 'high' },
    { keywords: ['periodontal diagnosis', 'perio dx', 'perio diagnosis'], ids: ['perio-form-dx', 'perio-sum-dx'], confidence: 'high' },
    { keywords: ['impression', 'alginate', 'study model'], ids: ['perio-form-impr', 'perio-sum-impr'], confidence: 'high' },
    // Endo
    { keywords: ['rct', 'root canal', 'endodontic'], ids: ['endo-rct-1', 'endo-rct-2'], confidence: 'high' },
    { keywords: ['pulpectomy', 'pulp therapy'], ids: ['endo-pulp-1', 'endo-pulp-2'], confidence: 'high' },
    // Oral Surgery
    { keywords: ['extraction', 'ext #', 'surgical extraction', 'exo'], ids: ['os-extract-1', 'os-extract-2'], confidence: 'high' },
    // Dentures (medium - less specific text)
    { keywords: ['denture', 'cu/cl', 'complete denture', 'cd'], ids: ['cd-form-prelim', 'cd-form-final', 'cd-form-records', 'cd-form-trial', 'cd-form-postdam', 'cd-form-insert', 'cd-form-adjust'], confidence: 'medium' },
    { keywords: ['overdenture', 'implant denture'], ids: ['cd-over-dup', 'cd-over-abut'], confidence: 'medium' },
    // RPD (medium)
    { keywords: ['rpd', 'partial denture', 'removable partial', 'flexible partial'], ids: ['rpd-track1', 'rpd-track2', 'rpd-track3'], confidence: 'medium' },
    // Peds
    { keywords: ['sealant', 'pit and fissure'], ids: ['peds-sealants'], confidence: 'high' },
    // Group Practice
    { keywords: ['written analysis', 'wa '], ids: ['gp-form-analysis', 'gp-sum-analysis'], confidence: 'high' },
    // Treatment Planning
    { keywords: ['ohra'], ids: ['tx-ohra-1'], confidence: 'high' },
];

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

// Parse MM/DD/YYYY or M/D/YYYY dates (used by recall history)
function parseMDYDate(dateStr) {
    if (!dateStr) return null;
    var parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    var m = parseInt(parts[0], 10);
    var d = parseInt(parts[1], 10);
    var y = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
    return new Date(y, m - 1, d);
}

function getCountdown(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = parseLocalDate(dateStr);
    if (!target || isNaN(target.getTime())) return null;
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
    if (resolvedTabId === 'periodicreview' && typeof initPeriodicReview === 'function') initPeriodicReview();
    if (resolvedTabId === 'minireview' && typeof renderMiniReview === 'function') renderMiniReview();
    if (resolvedTabId === 'troubleshooting' && typeof renderTroubleshooting === 'function') renderTroubleshooting();
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
    if (typeof dpStopClock === 'function') dpStopClock();
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

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
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
function showToast(message, type, options) {
    const toast = document.getElementById('toast');
    if (options && options.html) {
        toast.innerHTML = message;
    } else {
        toast.textContent = message;
    }
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('toast-error');
    else if (type === 'warning') toast.classList.add('toast-warning');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), type === 'error' ? 4000 : 2000);
}

// Custom Alert Modal (replaces blocking alert())
function showCustomAlert(message, title = 'Notice', callback = null) {
    var safeTitle = escapeHtml(title);
    var safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
    modal.innerHTML = `
        <div style="background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #334155;text-align:center;">
            <h3 style="color:#60a5fa;margin:0 0 16px 0;font-size:1.2em;">${safeTitle}</h3>
            <p style="color:#e2e8f0;margin-bottom:20px;white-space:pre-wrap;">${safeMessage}</p>
            <button onclick="this.closest('.custom-modal-overlay').remove(); window._customAlertCallback && window._customAlertCallback();"
                style="padding:12px 32px;background:#3b82f6;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:1em;">OK</button>
        </div>
    `;
    document.body.appendChild(modal);
    window._customAlertCallback = callback;
    modal.querySelector('button').focus();
}

// Custom Confirm Modal (replaces blocking confirm())
function showCustomConfirm(message, onConfirm, onCancel = null, title = 'Confirm', rawHtml = false) {
    var existing = document.querySelector('.custom-modal-overlay');
    if (existing) existing.remove();
    var safeTitle = escapeHtml(title);
    var safeMessage = rawHtml ? message : escapeHtml(message).replace(/\n/g, '<br>');
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
    modal.innerHTML = `
        <div style="background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #334155;text-align:center;">
            <h3 style="color:#f59e0b;margin:0 0 16px 0;font-size:1.2em;">${safeTitle}</h3>
            <p style="color:#e2e8f0;margin-bottom:20px;white-space:pre-wrap;">${safeMessage}</p>
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
    const patientRecords = roadmapData.clinicalData?.patientRecords || {};
    const completedTasks = roadmapData.monthlyPlanner?.completedTasks || {};

    // Source 1: Appointments with status === 'completed'
    const completedApts = appointments.filter(function(a) { return a.status === 'completed'; });
    const aptIds = new Set(completedApts.map(function(a) { return a.id; }));

    // Source 2: clinic planner tasks marked complete
    // Keys are random generated IDs (e.g., completed_abc123); the actual task ID
    // (e.g., clinic_appt_xyz) is stored in the entry's value.
    getValues(completedTasks).forEach(function(entry) {
        var taskId = typeof entry === 'string' ? entry : (entry?.value || entry?.id || '');
        if (typeof taskId === 'string' && taskId.startsWith('clinic_')) {
            var aptId = taskId.replace('clinic_', '');
            if (aptId && !aptIds.has(aptId)) {
                // Validate against actual appointments
                if (roadmapData.clinicalData?.appointments?.[aptId]) {
                    aptIds.add(aptId);
                }
            }
        }
    });

    // Source 3: Patient visit history (unique visits not already counted)
    var visitKeys = new Set();
    completedApts.forEach(function(a) {
        if (a.patientId && a.date) visitKeys.add(a.patientId + '|' + a.date);
    });

    var extraVisits = 0;
    // From patient records (canonical store after CIS v2 migration)
    // Fix #6: Normalize legacy pipe-delimited lastVisit format before dedup comparison
    getValues(patientRecords).forEach(function(pr) {
        var lastVisitDate = (pr.lastVisit || '').split('|')[0].trim();
        if (lastVisitDate && pr.id && !visitKeys.has(pr.id + '|' + lastVisitDate)) {
            extraVisits++;
            visitKeys.add(pr.id + '|' + lastVisitDate);
        }
    });

    var computedTotal = aptIds.size + extraVisits;

    // Source 4: SPS Dashboard snapshot (authoritative ground truth from school system)
    // snapshots[0] is the most recent — mergeDashboardSnapshots() sorts newest-first by capturedAt.
    // If a snapshot needs correction, import a corrected SPS_DASHBOARD_UPDATE.
    var snapshotCount = 0;
    var snapshots = getValues(roadmapData.clinicalData?.dashboardSnapshots);
    if (snapshots.length > 0) {
        snapshotCount = parseInt(snapshots[0].appointments?.attended) || 0;
    }

    // Use the HIGHER of computed vs snapshot — snapshot is the school's official count (MAX by design)
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

    // Source 2: Competency items with manual adjustments (not backed by formal procedure records)
    // V2: No completionEntries exist — count items where completed > 0 in procedure categories
    // Only counts as "additional" procedures beyond what's in formal records
    var competencyDerivedCount = 0;
    var procedureCategories = { fixed: 1, operative: 1, dentures: 1, rpd: 1, endo: 1, oralsurg: 1, perio: 1 };

    // Fix #10: Exclude non-procedure items (simulations, mock boards, case presentations,
    // analyses, assists, approvals, assignments, exams) from fallback procedure count
    var NON_PROCEDURE_IDS = {
        'fixed-occlusal-cr': 1, 'fixed-occlusal-mi': 1, 'fixed-mock': 1,
        'fixed-sim-1': 1, 'fixed-sim-2': 1, 'fixed-sim-fpd': 1, 'fixed-case-pres': 1,
        'fixed-units-total': 1, 'fixed-fpd': 1, 'fixed-implant-crown': 1, 'fixed-cerec': 1,
        'op-approval': 1, 'op-assignment': 1, 'op-license': 1,
        'endo-postdoc': 1, 'endo-predoc': 1, 'endo-mock': 1,
        'cd-units-total': 1,
        'perio-surg-assist': 1, 'perio-sum-mock': 1, 'perio-dc-rotation': 1
    };

    if (competencies) {
        Object.entries(competencies).forEach(function(entry) {
            var catKey = entry[0];
            var cat = entry[1];
            if (!procedureCategories[catKey]) return;
            getValues(cat.sections).forEach(function(sec) {
                getValues(sec.items).forEach(function(item) {
                    if (item.completed > 0 && !NON_PROCEDURE_IDS[item.id]) {
                        competencyDerivedCount += item.completed;
                    }
                });
            });
        });
        // Subtract formal procedure records to avoid double-counting
        // (procedures already counted in Source 1)
        competencyDerivedCount = Math.max(0, competencyDerivedCount - formalCount);
    }

    var computedTotal = formalCount + competencyDerivedCount;

    // Source 3: SPS Dashboard snapshot (AUTHORITATIVE ground truth from school system)
    // snapshots[0] is the most recent — mergeDashboardSnapshots() sorts newest-first by capturedAt.
    // When a snapshot exists, it IS the procedure count — it is authoritative, not a floor.
    var snapshotCount = 0;
    var snapshots = getValues(roadmapData.clinicalData?.dashboardSnapshots);
    if (snapshots.length > 0) {
        snapshotCount = parseInt(snapshots[0].procedures?.totalCompleted) || 0;
    }

    // SPS snapshot is AUTHORITATIVE when it exists — computed is fallback only
    var total = snapshotCount > 0 ? snapshotCount : computedTotal;

    return {
        total: total,
        fromProcedureRecords: formalCount,
        fromCompetencyManual: competencyDerivedCount,
        fromSnapshot: snapshotCount,
        snapshotIsAuthoritative: snapshotCount > 0
    };
}

// Calculate graduation readiness as weighted percentage across all 14 competency categories.
// Delegates overall percent to calculateOverallStats() to avoid duplicate computation.
function calculateGraduationReadiness() {
    var competencies = roadmapData.clinicalData?.competencies;
    if (!competencies || typeof calculateCategoryStats !== 'function') return { percent: 0, details: {} };

    var details = {};

    Object.entries(competencies).forEach(function(entry) {
        var key = entry[0];
        var cat = entry[1];
        var stats = calculateCategoryStats(cat);
        if (stats.totalUnits === 0) return; // Skip empty categories — no requirements to track
        var pct = stats.completedUnits / stats.totalUnits;
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

    // Single source of truth for overall percent — calculateOverallStats computes the same weighted average
    var overallPercent = 0;
    if (typeof calculateOverallStats === 'function') {
        overallPercent = calculateOverallStats(competencies).overallPercent;
    }

    return {
        percent: overallPercent,
        details: details
    };
}

// Get competency gaps — items with 0 progress or behind pace
function getCompetencyGaps() {
    var competencies = roadmapData.clinicalData?.competencies;
    if (!competencies) return { zeroProgress: [], behindPace: [], total: 0 };

    var zeroProgress = [];
    var behindPace = [];

    // Calculate weeks remaining to graduation and total program weeks (hoisted outside loops)
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var graduation = new Date(2027, 4, 12); // May 12, 2027
    var weeksRemaining = Math.max(1, Math.ceil((graduation - today) / (7 * 24 * 60 * 60 * 1000)));
    var totalWeeks = Math.ceil((graduation - new Date(2025, 7, 1)) / (7 * 24 * 60 * 60 * 1000)); // D3 start Aug 1, 2025
    var pastMidpoint = weeksRemaining < totalWeeks / 2;
    var NON_GAP_IDS = { 'fixed-units-total': 1, 'fixed-fpd': 1, 'fixed-implant-crown': 1, 'fixed-cerec': 1, 'cd-units-total': 1 };

    Object.entries(competencies).forEach(function(entry) {
        var catKey = entry[0];
        var cat = entry[1];
        getValues(cat.sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                if (item.completed >= item.required) return; // Done
                if (NON_GAP_IDS[item.id]) return; // Skip aggregate trackers

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
                } else {
                    // Dual threshold for behind-pace detection:
                    // 1) High-volume: needs > 0.5/week to finish
                    // 2) Low-volume: < 50% done AND past midpoint of total time
                    var lessThanHalfDone = item.completed < item.required * 0.5;
                    var needsHighRate = remaining > weeksRemaining * 0.5;
                    if (!needsHighRate && !(pastMidpoint && lessThanHalfDone)) return;
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
    var startDate;
    if (dataStartDate) {
        startDate = parseLocalDate(dataStartDate);
    } else {
        // Find earliest completed appointment or SPS snapshot as start date
        var earliest = null;
        var apts = getValues(roadmapData.clinicalData?.appointments);
        apts.forEach(function(a) {
            if (a.status === 'completed' && a.date) {
                var d = parseLocalDate(a.date);
                if (d && (!earliest || d < earliest)) earliest = d;
            }
        });
        var snaps = getValues(roadmapData.clinicalData?.dashboardSnapshots);
        if (snaps.length > 0) {
            var snapDateStr = (snaps[0]?.capturedAt || '').substring(0, 10);
            if (snapDateStr) {
                var sd = parseLocalDate(snapDateStr);
                if (sd && (!earliest || sd < earliest)) earliest = sd;
            }
        }
        startDate = earliest || new Date(2025, 7, 1); // Fallback to Aug 1, 2025
    }

    var daysSoFar = Math.max(1, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
    var ratePerDay = currentCount / daysSoFar;

    if (ratePerDay <= 0) return null;

    var remaining = targetCount - currentCount;
    if (remaining <= 0) return { projectedDate: 'Already met!', daysToTarget: 0, ratePerWeek: (ratePerDay * 7).toFixed(1), behindSchedule: false };

    var daysToTarget = Math.ceil(remaining / ratePerDay);
    var projectedDate = new Date(today);
    projectedDate.setDate(projectedDate.getDate() + daysToTarget);

    // Deadline awareness: flag if projected date exceeds key milestones
    var d3End = new Date(2026, 4, 15);       // May 15, 2026 — D3 year ends
    var graduation = new Date(2027, 4, 12);  // May 12, 2027 — graduation
    var behindSchedule = projectedDate > d3End;
    var pastGraduation = projectedDate > graduation;

    return {
        projectedDate: projectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysToTarget: daysToTarget,
        ratePerWeek: (ratePerDay * 7).toFixed(1),
        behindSchedule: behindSchedule,
        pastGraduation: pastGraduation
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
                    // Scroll to the specific item after category expansion
                    setTimeout(function() {
                        var safeId = id.replace(/['"\\]/g, '');
                        var itemEl = document.querySelector('[data-item-id="' + safeId + '"]');
                        if (itemEl) {
                            itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            itemEl.style.transition = 'background 0.3s';
                            itemEl.style.background = 'rgba(251, 191, 36, 0.15)';
                            setTimeout(function() { itemEl.style.background = ''; }, 2000);
                        }
                    }, 300);
                }
            }, 100);
            break;
        case 'deadline':
            switchTab('deadlines');
            if (id) {
                setTimeout(function() {
                    var safeId = id.replace(/['"\\]/g, '');
                    var el = document.querySelector('[data-deadline-id="' + safeId + '"]');
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.style.transition = 'background 0.3s';
                        el.style.background = 'rgba(251, 191, 36, 0.15)';
                        setTimeout(function() { el.style.background = ''; }, 2000);
                    }
                }, 200);
            }
            break;
    }
}

// Navigate to a specific competency item within its category — expands accordion and scrolls to item
function navigateToCompetencyItem(catKey, itemId) {
    switchTab('competencies');
    setTimeout(function() {
        // Expand the category if not already expanded
        var body = document.getElementById('compBody-' + catKey);
        if (body && !body.classList.contains('expanded')) {
            toggleCompCategory(catKey);
        }
        // Scroll to the specific item after expansion animation
        setTimeout(function() {
            var safeId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(itemId) : itemId.replace(/["\\]/g, '\\$&');
            var itemEl = document.querySelector('[data-item-id="' + safeId + '"]');
            if (itemEl) {
                itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Brief highlight flash
                itemEl.style.transition = 'background-color 0.3s';
                itemEl.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                setTimeout(function() { itemEl.style.backgroundColor = ''; }, 2000);
            }
        }, 300);
    }, 150);
}

// ==================== CIS v2: CENTRALIZED PROPAGATION ====================
// Shared fanout for clinical-side mutations. Feature modules call this after CRUD so the
// planner, dashboard, calendars, and dependent tabs stay in sync without each caller
// re-implementing the same render/rebuild cascade.

function propagateClinicalChanges({ appointments = false, procedures = false, competencies = false, patients = false, dashboard = true, calendars = true, source = '' } = {}) {
    clinicalDataDirty = true;
    if (appointments) {
        if (typeof syncClinicalToMonthlyPlanner === 'function') { try { syncClinicalToMonthlyPlanner(); } catch(e) { console.error('[propagate:' + source + '] syncClinicalToMonthlyPlanner threw:', e); } }
        if (typeof buildCurrentWeekSchedule === 'function') { try { buildCurrentWeekSchedule(); } catch(e) { console.error('[propagate:' + source + '] buildCurrentWeekSchedule threw:', e); } }
        if (typeof rebuildUpcomingDeadlines === 'function') { try { rebuildUpcomingDeadlines(); } catch(e) { console.error('[propagate:' + source + '] rebuildUpcomingDeadlines threw:', e); } }
        if (typeof dpSyncAppointmentsToTimeline === 'function') { try { dpSyncAppointmentsToTimeline(); } catch(e) { console.error('[propagate:' + source + '] dpSyncAppointmentsToTimeline threw:', e); } }
    }
    if (procedures || competencies) {
        if (typeof renderCompetencies === 'function') { try { renderCompetencies(); } catch(e) { console.error('[propagate:' + source + '] renderCompetencies threw:', e); } }
    }
    if (patients) {
        if (typeof renderPatientsSidebar === 'function') { try { renderPatientsSidebar(); } catch(e) { console.error('[propagate:' + source + '] renderPatientsSidebar threw:', e); } }
        if (typeof renderCountdownRadar === 'function') { try { renderCountdownRadar(); } catch(e) { console.error('[propagate:' + source + '] renderCountdownRadar threw:', e); } }
        if (typeof renderActiveRoster === 'function') { try { renderActiveRoster(); } catch(e) { console.error('[propagate:' + source + '] renderActiveRoster threw:', e); } }
        if (typeof renderMiniReview === 'function') { try { renderMiniReview(); } catch(e) { console.error('[propagate:' + source + '] renderMiniReview threw:', e); } }
    }
    if (dashboard && typeof renderDashboard === 'function') { try { renderDashboard(); } catch(e) { console.error('[propagate:' + source + '] renderDashboard threw:', e); } }
    if (calendars && typeof mpRenderAllCalendars === 'function') { try { mpRenderAllCalendars(); } catch(e) { console.error('[propagate:' + source + '] mpRenderAllCalendars threw:', e); } }
    // NOTE: Does NOT call saveData(). Caller controls save timing.
}

// ==================== CIS v2: CASCADE FUNCTIONS ====================

function recalculatePatientLastVisit(patientId) {
    var apts = getValues(roadmapData.clinicalData.appointments)
        .filter(function(a) { return a.patientId === patientId && a.status === 'completed'; });
    var patient = roadmapData.clinicalData.patientRecords[patientId];
    if (!patient) return;
    if (apts.length === 0) {
        patient.lastVisit = '';
    } else {
        apts.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
        patient.lastVisit = apts[0].date;
    }
}

function cascadeDeleteProcedure(procId) {
    if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
    roadmapData.clinicalData.deletedProcedureIds[procId] = new Date().toISOString();
    delete roadmapData.clinicalData.completedProcedures[procId];
    propagateClinicalChanges({ procedures: true, competencies: true, source: 'cascadeDeleteProcedure' });
}

function cascadeDeleteAppointment(aptId, { skipPropagation = false } = {}) {
    var apt = roadmapData.clinicalData.appointments[aptId];
    if (!apt) return;

    // 1. Find + delete linked procedures (track deletions for merge protection)
    if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
    getValues(roadmapData.clinicalData.completedProcedures)
        .filter(function(p) { return p.appointmentId === aptId; })
        .forEach(function(p) {
            roadmapData.clinicalData.deletedProcedureIds[p.id] = new Date().toISOString();
            delete roadmapData.clinicalData.completedProcedures[p.id];
        });

    // 2. Clean planner state
    if (!roadmapData.monthlyPlanner.hiddenClinicTasks) roadmapData.monthlyPlanner.hiddenClinicTasks = {};
    roadmapData.monthlyPlanner.hiddenClinicTasks[aptId] = { hiddenAt: new Date().toISOString(), taskId: 'clinic_' + aptId };
    delete roadmapData.monthlyPlanner.customTasks['clinic_' + aptId];
    if (typeof unmarkPlannerTaskDone === 'function') unmarkPlannerTaskDone(aptId);

    // 3. Clean linked custom deadlines (clinicalAptId backlink)
    Object.keys(roadmapData.customDeadlines || {}).forEach(function(dlId) {
        if (roadmapData.customDeadlines[dlId].clinicalAptId === aptId) {
            if (roadmapData.completedDeadlines) delete roadmapData.completedDeadlines[dlId];
            delete roadmapData.customDeadlines[dlId];
        }
    });

    // 4. Track deletion for merge protection, then delete appointment
    if (!roadmapData.clinicalData.deletedAppointmentIds) roadmapData.clinicalData.deletedAppointmentIds = {};
    roadmapData.clinicalData.deletedAppointmentIds[aptId] = new Date().toISOString();
    delete roadmapData.clinicalData.appointments[aptId];

    // 5. Recalculate patient lastVisit
    if (apt.patientId) recalculatePatientLastVisit(apt.patientId);

    // 6. Propagate (unless called from cascadeDeletePatient, which propagates once at end)
    if (!skipPropagation) {
        propagateClinicalChanges({ appointments: true, procedures: true, competencies: true, source: 'cascadeDeleteAppointment' });
    }
}

function cascadeDeletePatient(patientId) {
    // 1. Find all appointments for patient
    var apts = getValues(roadmapData.clinicalData.appointments)
        .filter(function(a) { return a.patientId === patientId; });

    // 2. Delegate each appointment to cascadeDeleteAppointment (skip propagation)
    apts.forEach(function(apt) {
        cascadeDeleteAppointment(apt.id, { skipPropagation: true });
    });

    // 3. Find orphaned procedures (by patientId, not linked to any appointment)
    var orphanedProcs = getValues(roadmapData.clinicalData.completedProcedures)
        .filter(function(p) { return p.patientId === patientId; });
    if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
    orphanedProcs.forEach(function(p) {
        roadmapData.clinicalData.deletedProcedureIds[p.id] = new Date().toISOString();
        delete roadmapData.clinicalData.completedProcedures[p.id];
    });

    // 3b. Clean missing notes referencing this patient (by chart number or name)
    var deletedPt = roadmapData.clinicalData.patientRecords[patientId];
    if (deletedPt && roadmapData.clinicalData.missingNotes) {
        var ptChart = (deletedPt.chartNumber || '').trim();
        var ptNameLower = (deletedPt.name || '').toLowerCase().trim();
        Object.keys(roadmapData.clinicalData.missingNotes).forEach(function(noteId) {
            var note = roadmapData.clinicalData.missingNotes[noteId];
            var noteChart = (note.chartNumber || '').trim();
            var noteNameLower = (note.patientName || '').toLowerCase().trim();
            if ((ptChart && noteChart && noteChart === ptChart) || (ptNameLower && noteNameLower && noteNameLower === ptNameLower)) {
                delete roadmapData.clinicalData.missingNotes[noteId];
            }
        });
    }

    // 3c. Clean todoList items referencing this patient
    if (roadmapData.todoList?.items) {
        Object.keys(roadmapData.todoList.items).forEach(function(itemId) {
            if (roadmapData.todoList.items[itemId]?.patientId === patientId) {
                delete roadmapData.todoList.items[itemId];
            }
        });
    }

    // 4. Track deletion for merge protection, then delete patient record
    if (!roadmapData.clinicalData.deletedPatientRecordIds) roadmapData.clinicalData.deletedPatientRecordIds = {};
    roadmapData.clinicalData.deletedPatientRecordIds[patientId] = new Date().toISOString();
    delete roadmapData.clinicalData.patientRecords[patientId];
    if (roadmapData.clinicalData?.patients?.[patientId]) delete roadmapData.clinicalData.patients[patientId];

    // 5. Propagate ONCE at the end
    propagateClinicalChanges({
        appointments: true, procedures: true,
        competencies: true, patients: true,
        source: 'cascadeDeletePatient'
    });
}

function cascadeUncompleteAppointment(aptId) {
    var apt = roadmapData.clinicalData.appointments[aptId];
    if (!apt) return;

    // 1. Reset status
    apt.status = 'scheduled';
    delete apt.completedAt;

    // 2. Find + cascade delete all procedures for this appointment
    if (!roadmapData.clinicalData.deletedProcedureIds) roadmapData.clinicalData.deletedProcedureIds = {};
    getValues(roadmapData.clinicalData.completedProcedures)
        .filter(function(p) { return p.appointmentId === aptId; })
        .forEach(function(p) {
            roadmapData.clinicalData.deletedProcedureIds[p.id] = new Date().toISOString();
            delete roadmapData.clinicalData.completedProcedures[p.id];
        });

    // 3. Unmark deadline + planner task
    if (typeof unmarkLinkedDeadlineDone === 'function') unmarkLinkedDeadlineDone(aptId);
    if (typeof unmarkPlannerTaskDone === 'function') unmarkPlannerTaskDone(aptId);

    // 4. Recalculate patient lastVisit
    if (apt.patientId) recalculatePatientLastVisit(apt.patientId);

    // 5. Propagate
    propagateClinicalChanges({
        appointments: true, procedures: true, competencies: true,
        source: 'cascadeUncompleteAppointment'
    });
}

function findPatientByChartOrName(chartNumber, name) {
    var records = roadmapData.clinicalData?.patientRecords || {};
    if (chartNumber) {
        if (typeof findByNormalizedChart === 'function') {
            var id = findByNormalizedChart(records, chartNumber);
            if (id) return records[id];
        }
    }
    if (name) {
        var nameLower = name.toLowerCase().trim();
        return getValues(records).find(function(p) { return (p.name || '').toLowerCase().trim() === nameLower; }) || null;
    }
    return null;
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
    if (!roadmapData.clinicalData?.missingNotes) return;
    var notes = roadmapData.clinicalData.missingNotes;
    if (!notes[noteId]) return;
    var note = notes[noteId];
    if (note.status === 'pending') {
        note.status = 'completed';
        note.completedAt = new Date().toISOString();
    } else {
        note.status = 'pending';
        note.completedAt = null;
    }
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    if (typeof rerenderMissingNotesSection === 'function') rerenderMissingNotesSection(); else renderDashboard();
}

function clearCompletedMissingNotes() {
    if (!roadmapData.clinicalData?.missingNotes) return;
    var notes = roadmapData.clinicalData.missingNotes;
    var keys = Object.keys(notes);
    var cleared = 0;
    for (var i = 0; i < keys.length; i++) {
        if (notes[keys[i]].status === 'completed') {
            delete notes[keys[i]];
            cleared++;
        }
    }
    if (cleared > 0) {
        clinicalDataDirty = true;
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        if (typeof rerenderMissingNotesSection === 'function') rerenderMissingNotesSection(); else renderDashboard();
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
            var aptFacultyField = (apt.faculty ?? '').toLowerCase().trim();
            var matched = false;
            if (facultyLower.length < 3) {
                // Short names: only match against the faculty field (exact field match) to avoid noise
                matched = aptFacultyField === facultyLower;
            } else {
                // Word-boundary match to prevent substring false positives (e.g., "Li" matching "scaling")
                var escapedFaculty = facultyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var facultyRegex = new RegExp('\\b' + escapedFaculty + '\\b', 'i');
                var aptText = ((apt.procedures ?? '') + ' ' + (apt.notes ?? '')).toLowerCase();
                matched = facultyRegex.test(aptText) || facultyRegex.test(aptFacultyField);
            }
            if (matched) {
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
    if (typeof rerenderTodoListSection === 'function') rerenderTodoListSection(); else renderDashboard();
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
        if (typeof rerenderTodoListSection === 'function') rerenderTodoListSection(); else renderDashboard();
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
