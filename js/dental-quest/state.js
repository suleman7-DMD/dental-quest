/**
 * state.js — Dental Quest: Global State & Utilities (Leaf Module)
 *
 * This is the foundation module with ZERO dependencies on other app code.
 * Contains: all global variable declarations, sync flags, data integrity
 * utilities, safe localStorage, backup manager, toast/modal helpers,
 * date helpers, and deep merge.
 *
 * Script load order: state.js must load FIRST (before all other modules).
 */

// ============================================
// FIREBASE CONFIGURATION
// ============================================

var firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};

// ============================================
// FIREBASE STATE FLAGS
// ============================================

var firebaseInitialized = false;
var database = null;
var currentUser = null;
var initialLoadComplete = false; // CRITICAL: Prevents saving empty data before Firebase loads
var hasLoadedFromCloud = false;  // Track if we've checked Firebase
var pinValidated = false;        // Track if PIN has been validated (prevents race condition)
var userPassword = null; // Simple password for privacy
var saveDebounceTimer = null; // Debounce timer for Firebase saves
var pendingSaveData = null; // Store pending save data
var offlineSyncPending = false; // Flag for pending offline sync

// ============================================
// SYNC PROTECTION — BUG FIX #2: Add _version and _dataLoaded
// ============================================

var _version = 0;
var _dataLoaded = false;

// ============================================
// EMPTY STATE / REAL DATA CHECKS
// ============================================

// Check if data has real user content (not just defaults)
// BUG FIX #1: .entries → .pages for notebook check
function isEmptyState(data) {
    if (!data) return true;

    // Index.html (Dental Quest) specific checks - must have at least ONE of these
    var hasTasks = data.tasks && Object.keys(data.tasks).length > 0;
    var hasCalendarNotes = data.calendarNotes && Object.keys(data.calendarNotes).length > 0;
    var hasCalendarEvents = data.calendarEvents && Object.keys(data.calendarEvents).length > 0;
    var hasNotebookPages = data.notebook?.pages && Object.keys(data.notebook.pages).length > 0;
    var hasXP = data.stats?.totalXPGained > 0;
    var hasFocusData = data.focusModeData?.oneThingId ||
        (data.focusModeData?.microSteps && Object.keys(data.focusModeData.microSteps).length > 0);
    // Command Center data checks
    var hasCommandCenterData = data.commandCenterData?.crashOut?.sleepTime ||
        data.commandCenterData?.focusStats?.totalXP > 0 ||
        data.commandCenterData?.currentSession?.taskId;

    // Empty if NONE of these exist
    return !hasTasks && !hasCalendarNotes && !hasCalendarEvents &&
           !hasNotebookPages && !hasXP && !hasFocusData && !hasCommandCenterData;
}

function hasRealData(data) {
    return !isEmptyState(data);
}

// Hide loading overlay and mark initial load complete
function markInitialLoadComplete() {
    initialLoadComplete = true;

    // Apply focus-active class if starting in focus view
    if (currentView === 'focus') {
        document.body.classList.add('focus-active');
    }

    // Hide loading overlay with fade
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(function() {
            overlay.style.display = 'none';
        }, 300);
    }
}

// ============================================
// APP VARIABLES
// ============================================

var currentCategory = 'dotoday';
var tasks = {}; // Object with ID keys for Firebase safety
var timerInterval = null;
var currentSeconds = 25 * 60;
var isWorkSession = true;
var workMinutes = 25;
var breakMinutes = 5;
var currentTask = null;

// Focus Mode variables
var currentView = 'focus'; // 'focus' or 'full'
var focusModeData = {
    oneThingId: null,
    microSteps: {},  // Object for Firebase safety
    todaysTasks: { big: {}, medium: {}, small: {} },  // Objects: { taskId: true }
    focusTimerSeconds: 0,
    focusTimerRunning: false,
    focusTimerInterval: null,
    lastPlanningDate: null
};
var lastCriticalEODReset = null; // Synced across devices to prevent duplicate resets

// Command Center variables (new Focus View)
var commandCenterData = {
    crashOut: {
        sleepTime: null,
        lastReset: null
    },
    focusStats: {
        totalXP: 0,
        focusStreak: 0,
        dailyStreak: 0,
        lockedInStreak: 0
    },
    currentSession: {
        taskId: null,
        checklist: {},
        timerMinutes: 25,
        timerRemaining: null
    }
};
var editingTaskId = null;
var editingTaskSize = 'medium';
var editingTaskLeverage = false;
var planningMode = 'onething';
var selectedPlanningTaskId = null;

var stats = {
    totalXPGained: 0,
    totalTasks: 0,
    categoryXPGained: {
        financial: 0,
        clinic: 0,
        health: 0,
        school: 0,
        academic: 0,
        future: 0,
        life: 0
    }
};

var medications = {
    '30mg': {
        pills: 30,
        refillDate: null,
        dosesLogged: {},  // Object: { 'YYYY-MM-DD': { date, count } } for Firebase safety
        lastAutoReduceDate: null,  // YYYY-MM-DD when auto-reduce last ran
        lastManualChange: null,    // ISO timestamp of last manual pill adjustment
        lastManualChangeType: null // 'up' or 'down' for last manual change
    },
    '20mg': {
        pills: 30,
        refillDate: null,
        dosesLogged: {},
        lastAutoReduceDate: null,
        lastManualChange: null,
        lastManualChangeType: null
    }
};

var calendarNotes = {}; // Shared notes: { 'YYYY-MM-DD': 'note text' }
var pillAssignments = {
    '30mg': {}, // { 'YYYY-MM-DD': true/false } - true = has pill assigned
    '20mg': {}
};
var calendarEvents = {}; // Object with ID keys for Firebase safety


var notebook = {
    pages: {},  // Object with page IDs as keys for Firebase safety
    currentPageId: null
};

// Financial Data Structure - COCKPIT MODE (v2: per-month expenses)
var financials = {
    // MASTER LIQUIDITY CONTROL
    masterLiquidity: {
        currentCash: 0,
        lastUpdated: null,
        loanDisbursementDate: '2026-01-10',
        loanAmount: 18447,
        targetCushion: 2285,
        semesterEndDate: '2026-05-14'
    },

    // EXPENSE TEMPLATE - used to initialize new months (editing doesn't change existing months)
    expenseTemplate: {
        rent: { name: 'Rent', amount: 1280, category: 'housing' },
        parking: { name: 'Parking', amount: 300, category: 'housing' },
        utilities: { name: 'Utilities', amount: 60, category: 'housing' },
        gym: { name: 'SOWA Gym', amount: 195, category: 'wellness' },
        food: { name: 'Food', amount: 350, category: 'living' },
        social: { name: 'Social/Dating', amount: 250, category: 'living' },
        nicotine: { name: 'Nicotine', amount: 50, category: 'living' },
        creditCards: { name: 'Credit Cards', amount: 235, category: 'debt', notes: 'After negotiation' }
    },

    // PER-MONTH EXPENSES - each independently editable
    months: {
        '2026-02': {
            label: 'February 2026', partial: false, fraction: 1.0,
            expenses: {
                rent: { name: 'Rent', amount: 1280, category: 'housing', paid: false },
                parking: { name: 'Parking', amount: 300, category: 'housing', paid: false },
                utilities: { name: 'Utilities', amount: 60, category: 'housing', paid: false },
                gym: { name: 'SOWA Gym', amount: 195, category: 'wellness', paid: false },
                food: { name: 'Food', amount: 350, category: 'living', paid: false },
                social: { name: 'Social/Dating', amount: 250, category: 'living', paid: false },
                nicotine: { name: 'Nicotine', amount: 50, category: 'living', paid: false },
                creditCards: { name: 'Credit Cards', amount: 235, category: 'debt', paid: false, notes: 'After negotiation' }
            }
        },
        '2026-03': {
            label: 'March 2026', partial: false, fraction: 1.0,
            expenses: {
                rent: { name: 'Rent', amount: 1280, category: 'housing', paid: false },
                parking: { name: 'Parking', amount: 300, category: 'housing', paid: false },
                utilities: { name: 'Utilities', amount: 60, category: 'housing', paid: false },
                gym: { name: 'SOWA Gym', amount: 195, category: 'wellness', paid: false },
                food: { name: 'Food', amount: 350, category: 'living', paid: false },
                social: { name: 'Social/Dating', amount: 250, category: 'living', paid: false },
                nicotine: { name: 'Nicotine', amount: 50, category: 'living', paid: false },
                creditCards: { name: 'Credit Cards', amount: 235, category: 'debt', paid: false, notes: 'After negotiation' }
            }
        },
        '2026-04': {
            label: 'April 2026', partial: false, fraction: 1.0,
            expenses: {
                rent: { name: 'Rent', amount: 1280, category: 'housing', paid: false },
                parking: { name: 'Parking', amount: 300, category: 'housing', paid: false },
                utilities: { name: 'Utilities', amount: 60, category: 'housing', paid: false },
                gym: { name: 'SOWA Gym', amount: 195, category: 'wellness', paid: false },
                food: { name: 'Food', amount: 350, category: 'living', paid: false },
                social: { name: 'Social/Dating', amount: 250, category: 'living', paid: false },
                nicotine: { name: 'Nicotine', amount: 50, category: 'living', paid: false },
                creditCards: { name: 'Credit Cards', amount: 235, category: 'debt', paid: false, notes: 'After negotiation' }
            }
        },
        '2026-05': {
            label: 'May 1-14', partial: true, fraction: 0.45,
            expenses: {
                rent: { name: 'Rent', amount: 576, category: 'housing', paid: false },
                parking: { name: 'Parking', amount: 135, category: 'housing', paid: false },
                utilities: { name: 'Utilities', amount: 27, category: 'housing', paid: false },
                gym: { name: 'SOWA Gym', amount: 88, category: 'wellness', paid: false },
                food: { name: 'Food', amount: 158, category: 'living', paid: false },
                social: { name: 'Social/Dating', amount: 113, category: 'living', paid: false },
                nicotine: { name: 'Nicotine', amount: 23, category: 'living', paid: false },
                creditCards: { name: 'Credit Cards', amount: 106, category: 'debt', paid: false, notes: 'After negotiation' }
            }
        }
    },

    // ONE-TIME BILLS (not tied to any month)
    oneTimeBills: {
        loan_disbursement: { id: 'loan_disbursement', description: 'Loan Disbursement', amount: 18447, type: 'income', dueDate: '2026-01-10', paid: false, category: 'loan' },
        brother: { id: 'brother', description: 'Pay Brother (Full)', amount: 2000, type: 'expense', dueDate: '2026-01-16', paid: false, category: 'debt', notes: 'Back rent help - clear in full' },
        landlord: { id: 'landlord', description: 'Landlord Back Rent', amount: 250, type: 'expense', dueDate: '2026-01-16', paid: false, category: 'debt' },
        roommate: { id: 'roommate', description: 'Roommate Back Utilities', amount: 150, type: 'expense', dueDate: '2026-01-16', paid: false, category: 'debt' },
        chase_jan: { id: 'chase_jan', description: 'Chase Sapphire Payment', amount: 1482, type: 'expense', dueDate: '2026-01-16', paid: false, category: 'credit_card', confirmationNumber: 'Scheduled - Auto-pay' },
        creditone2914_jan: { id: 'creditone2914_jan', description: 'Credit One 2914', amount: 116, type: 'expense', dueDate: '2026-01-05', paid: false, category: 'credit_card', confirmationNumber: '820479', notes: 'PREVENTS CHARGE-OFF JAN 6' },
        creditone1857_jan: { id: 'creditone1857_jan', description: 'Credit One 1857', amount: 39, type: 'expense', dueDate: '2026-01-15', paid: false, category: 'credit_card' },
        discover_jan: { id: 'discover_jan', description: 'Discover', amount: 45, type: 'expense', dueDate: '2026-01-05', paid: false, category: 'credit_card', notes: 'ALREADY PAID - mark complete' },
        milestone_jan: { id: 'milestone_jan', description: 'Milestone', amount: 75, type: 'expense', dueDate: '2026-01-08', paid: false, category: 'credit_card', notes: 'Need to call and negotiate' },
        indigoa_jan: { id: 'indigoa_jan', description: 'Indigo A', amount: 75, type: 'expense', dueDate: '2026-01-08', paid: false, category: 'credit_card', notes: 'Need to call and negotiate' },
        indigob_jan: { id: 'indigob_jan', description: 'Indigo B', amount: 120, type: 'expense', dueDate: '2026-01-09', paid: false, category: 'credit_card', notes: 'Get current with $120' },
        rent_jan: { id: 'rent_jan', description: 'January Rent', amount: 1280, type: 'expense', dueDate: '2026-01-31', paid: false, category: 'housing' },
        parking_jan: { id: 'parking_jan', description: 'January Parking', amount: 300, type: 'expense', dueDate: '2026-01-31', paid: false, category: 'housing' },
        gym_jan: { id: 'gym_jan', description: 'SOWA Gym (January)', amount: 195, type: 'expense', dueDate: '2026-01-31', paid: false, category: 'wellness' },
        utilities_jan: { id: 'utilities_jan', description: 'Utilities', amount: 60, type: 'expense', dueDate: '2026-01-31', paid: false, category: 'housing' },
        food_jan: { id: 'food_jan', description: 'Food Budget', amount: 350, type: 'expense', dueDate: '2026-01-31', paid: false, category: 'living', notes: 'Estimate - adjust as needed' },
        social_jan: { id: 'social_jan', description: 'Social/Dating', amount: 250, type: 'expense', dueDate: '2026-01-31', paid: false, category: 'living' },
        nicotine_jan: { id: 'nicotine_jan', description: 'Nicotine', amount: 50, type: 'expense', dueDate: '2026-01-31', paid: false, category: 'living' }
    },

    creditCards: [
        {
            id: 'chase',
            name: 'Chase Sapphire Preferred',
            balance: 5451,
            limit: 5000,
            daysLate: 30,
            status: 'SAVING',
            statusColor: 'success',
            dotColor: 'green',
            minNow: 1482,
            targetMin: 100,
            apr: 20,
            phone: '1-800-432-3117',
            lastPayment: null,
            confirmationNumber: null,
            negotiationNotes: 'Already got amazing help - waived $121.43 in fees',
            priority: 1
        },
        {
            id: 'discover',
            name: 'Discover it Student',
            balance: 498,
            limit: 500,
            daysLate: 0,
            status: 'PERFECT',
            statusColor: 'success',
            dotColor: 'green',
            minNow: 45,
            targetMin: 15,
            apr: 15,
            phone: '1-800-347-2683',
            lastPayment: { date: '2026-01-05', amount: 45 },
            confirmationNumber: 'PAID',
            negotiationNotes: 'NEVER call this card - keep perfect!',
            priority: 10
        },
        {
            id: 'creditone2914',
            name: 'Credit One 2914',
            balance: 2841,
            limit: 1500,
            daysLate: 182,
            status: 'CLOSED',
            statusColor: 'urgent',
            dotColor: 'red',
            minNow: 116,
            targetMin: 30,
            apr: 25,
            phone: '1-888-729-6274',
            lastPayment: null,
            confirmationNumber: '820479',
            negotiationNotes: 'CHARGE-OFF JAN 6 - $116 scheduled for Jan 5',
            chargeOffDate: '2026-01-06',
            priority: 2
        },
        {
            id: 'creditone1857',
            name: 'Credit One 1857',
            balance: 1054,
            limit: 850,
            daysLate: 151,
            status: 'CLOSED',
            statusColor: 'urgent',
            dotColor: 'red',
            minNow: 39,
            targetMin: 20,
            apr: 25,
            phone: '1-888-729-6274',
            lastPayment: null,
            confirmationNumber: null,
            negotiationNotes: 'Call by Jan 3 to confirm $39 payment for Jan 15',
            priority: 3
        },
        {
            id: 'milestone',
            name: 'Milestone',
            balance: 911,
            limit: 500,
            daysLate: 150,
            status: 'HIGH RISK',
            statusColor: 'urgent',
            dotColor: 'red',
            minNow: 75,
            targetMin: 25,
            apr: 24,
            phone: 'Find on statement',
            lastPayment: null,
            confirmationNumber: null,
            negotiationNotes: 'URGENT - likely 30 days from charge-off',
            priority: 4
        },
        {
            id: 'indigoa',
            name: 'Indigo A',
            balance: 906,
            limit: 500,
            daysLate: 120,
            status: 'HIGH RISK',
            statusColor: 'warning',
            dotColor: 'yellow',
            minNow: 75,
            targetMin: 25,
            apr: 24,
            phone: 'Find on statement',
            lastPayment: null,
            confirmationNumber: null,
            negotiationNotes: '60 days buffer before typical charge-off',
            priority: 5
        },
        {
            id: 'indigob',
            name: 'Indigo B',
            balance: 650,
            limit: 500,
            daysLate: 30,
            status: 'SALVAGEABLE',
            statusColor: 'warning',
            dotColor: 'yellow',
            minNow: 120,
            targetMin: 20,
            apr: 24,
            phone: 'Find on statement',
            lastPayment: null,
            confirmationNumber: null,
            negotiationNotes: 'Most salvageable - only 30 days late',
            priority: 6
        }
    ],

    actionItems: [
        {
            id: 'verify120',
            title: 'Verify $120 from family deposited',
            deadline: '2026-01-05',
            priority: 'urgent',
            completed: false,
            notes: 'Check Chase account morning of Jan 5',
            category: 'payment'
        },
        {
            id: 'creditone2914payment',
            title: 'Credit One 2914 payment - $116',
            deadline: '2026-01-05',
            priority: 'urgent',
            completed: false,
            notes: 'Ref #820479 - PREVENTS CHARGE-OFF',
            category: 'payment'
        },
        {
            id: 'call1857',
            title: 'Call Credit One 1857 - Confirm $39 payment',
            deadline: '2026-01-03',
            priority: 'urgent',
            completed: false,
            notes: '1-888-729-6274 - Confirm Jan 15 payment',
            category: 'call'
        },
        {
            id: 'verifyloan',
            title: 'Verify loan disbursement $18,447',
            deadline: '2026-01-10',
            priority: 'high',
            completed: false,
            notes: 'Check BU student account',
            category: 'verification'
        },
        {
            id: 'callmilestone',
            title: 'Call Milestone - Negotiate payment',
            deadline: '2026-01-08',
            priority: 'high',
            completed: false,
            notes: '$75 payment + $25/mo ongoing',
            category: 'call'
        },
        {
            id: 'callindigoa',
            title: 'Call Indigo A - Negotiate payment',
            deadline: '2026-01-08',
            priority: 'high',
            completed: false,
            notes: '$75 payment + $25/mo ongoing',
            category: 'call'
        },
        {
            id: 'callindigob',
            title: 'Call Indigo B - Negotiate payment',
            deadline: '2026-01-09',
            priority: 'high',
            completed: false,
            notes: '$120 to get current + $20/mo ongoing',
            category: 'call'
        },
        {
            id: 'setupautopay',
            title: 'Set up autopay - All 7 cards',
            deadline: '2026-01-17',
            priority: 'medium',
            completed: false,
            notes: 'Link to Chase checking',
            category: 'setup'
        },
        {
            id: 'applysnap',
            title: 'Apply for SNAP benefits',
            deadline: '2026-01-20',
            priority: 'medium',
            completed: false,
            notes: 'Could save $200/mo = $600 over semester',
            category: 'application'
        }
    ],

    // Additional one-off transactions
    customTransactions: []
};

// UI state for collapsible month groups (in-memory only, not saved)
var collapsedMonths = {};

var currentMedModal = null;

// Daily Planner data
var dailyPlanner = {
    date: null,
    goal: '',
    bedtime: '23:00',
    blocks: {},  // Object for Firebase safety
    lastReset: null
};

// ============================================
// SCATTERED STATE VARIABLES (from various sections)
// ============================================

// Toast timer
var _toastTimer = null;

// Version compatibility
var APP_VERSION = '1.0.0';

// Modal open time guard (iOS Safari ghost-click bug)
var _modalOpenTime = 0;

// Date/sync helpers
var localChangesSinceLastSync = false;
var lastSyncTimestamp = null;

// Realtime sync state
var mainDataSyncEnabled = false;
var lastKnownSaveTime = 0; // Initialize to 0 instead of null for safe comparisons
var realtimeSyncListener = null; // Store the listener reference for cleanup

// Triage render frame (cache invalidation)
var _renderFrame = 0;

// Command Center mode
var commandCenterMode = 'triage';

// Focus timer state (ephemeral - not persisted to Firebase)
var focusTimerInterval = null;
var focusTimerRunning = false;
var focusTimerSecondsRemaining = 25 * 60;
var focusTimerDuration = 25; // minutes

// Crash Out time prompt state
var timePromptInterval = null;
var lastPromptedTaskId = null;
var dismissedUntil = {}; // { taskId: timestamp } - 3-minute cooldown after dismiss, then re-prompts

// Crash Out timeline state
var crashOutTimelineInterval = null;
var nowTimeInterval = null;
var gcalGridParams = null; // { gridStartMs, pxPerHour } - shared between render and updateNowMarkerTime

// Timeline drag-drop state
var timelineDraggedTaskId = null;
var isReorderingLocked = false;  // Prevent multiple rapid reorders

// ============================================
// DATA INTEGRITY UTILITIES
// ============================================
// These utilities fix Firebase's fundamental array handling issues:
// 1. Arrays become objects when sparse (delete middle item)
// 2. Empty arrays are DELETED entirely by Firebase
// 3. Last write wins with no conflict resolution

// Generate unique IDs for object-based storage
function generateId(prefix) {
    if (prefix === undefined) prefix = 'item';
    var timestamp = Date.now();
    var random = Math.random().toString(36).substring(2, 8);
    return prefix + '_' + timestamp + '_' + random;
}

// Get device ID for conflict detection
function getDeviceId() {
    var deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        safeLocalStorageSet('deviceId', deviceId);
    }
    return deviceId;
}

// CRITICAL: Firebase converts arrays to objects - this converts them back
function ensureArray(val, fallback) {
    if (fallback === undefined) fallback = [];
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') {
        return Object.values(val);
    }
    return fallback;
}

// Get values from object as array (works with both objects and arrays)
function getValues(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    return Object.values(obj).filter(function(v) { return v !== null && v !== undefined; });
}

// Get count of items in object or array
function getCount(obj) {
    if (!obj) return 0;
    if (Array.isArray(obj)) return obj.length;
    return Object.keys(obj).length;
}

// Convert array to object with unique IDs (for migration)
function migrateArrayToObject(data, keyPrefix) {
    if (!data) return {};

    // If it's already an object with non-numeric keys, return as-is
    if (typeof data === 'object' && !Array.isArray(data)) {
        var keys = Object.keys(data);
        if (keys.length === 0) return {};
        if (isNaN(parseInt(keys[0]))) return data;
    }

    // Convert array or sparse object to proper object
    var result = {};
    var items = Array.isArray(data) ? data : Object.values(data || {});

    items.forEach(function(item, index) {
        if (item === null || item === undefined) return;
        var id = String(item.id || generateId(keyPrefix));
        result[id] = Object.assign({}, item, {
            id: id,
            createdAt: item.createdAt || Date.now() - (items.length - index) * 1000,
            updatedAt: item.updatedAt || Date.now()
        });
    });

    return result;
}

// Migrate financials from old format (committedBills/recurringExpenses/monthlyPayments) to new (months/expenseTemplate/oneTimeBills)
function migrateFinancials(raw) {
    if (!raw) return financials;

    // Already new format - has 'months' key with content
    if (raw.months && Object.keys(raw.months).length > 0) {
        return {
            masterLiquidity: raw.masterLiquidity || financials.masterLiquidity,
            expenseTemplate: raw.expenseTemplate || financials.expenseTemplate,
            months: raw.months,
            oneTimeBills: raw.oneTimeBills || financials.oneTimeBills,
            creditCards: migrateArrayToObject(raw.creditCards, 'card') || financials.creditCards,
            actionItems: migrateArrayToObject(raw.actionItems, 'action') || financials.actionItems,
            customTransactions: migrateArrayToObject(raw.customTransactions, 'txn') || []
        };
    }

    // OLD FORMAT: migrate from committedBills + recurringExpenses + monthlyPayments
    var oldRecurring = raw.recurringExpenses || {};
    var oldMonthly = raw.monthlyPayments || {};
    var oldBills = migrateArrayToObject(raw.committedBills, 'bill');

    // Build expense template from old recurringExpenses
    var template = {};
    Object.entries(oldRecurring).forEach(function(entry) {
        var key = entry[0], exp = entry[1];
        template[key] = {
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            amount: exp.amount || 0,
            category: exp.category || 'other'
        };
        if (exp.notes) template[key].notes = exp.notes;
    });

    // Build per-month data from old monthlyPayments
    var months = {};
    Object.entries(oldMonthly).forEach(function(entry) {
        var monthKey = entry[0], monthData = entry[1];
        var fraction = monthData.partial ? (monthData.fraction || 0.5) : 1;
        var expenses = {};
        Object.entries(template).forEach(function(tplEntry) {
            var expKey = tplEntry[0], expData = tplEntry[1];
            expenses[expKey] = {
                name: expData.name,
                amount: Math.round(expData.amount * fraction),
                category: expData.category,
                paid: monthData.paid || false
            };
            if (expData.notes) expenses[expKey].notes = expData.notes;
        });
        months[monthKey] = {
            label: monthData.label || monthKey,
            partial: monthData.partial || false,
            fraction: fraction,
            expenses: expenses
        };
    });

    // Move old committedBills to oneTimeBills
    var oneTimeBills = {};
    getValues(oldBills).forEach(function(bill) {
        var id = bill.id || generateId('bill');
        oneTimeBills[id] = Object.assign({}, bill, { id: id });
    });

    return {
        masterLiquidity: raw.masterLiquidity || financials.masterLiquidity,
        expenseTemplate: Object.keys(template).length > 0 ? template : financials.expenseTemplate,
        months: Object.keys(months).length > 0 ? months : financials.months,
        oneTimeBills: Object.keys(oneTimeBills).length > 0 ? oneTimeBills : financials.oneTimeBills,
        creditCards: migrateArrayToObject(raw.creditCards, 'card') || financials.creditCards,
        actionItems: migrateArrayToObject(raw.actionItems, 'action') || financials.actionItems,
        customTransactions: migrateArrayToObject(raw.customTransactions, 'txn') || []
    };
}

// Convert object back to array (for rendering)
function objectToArray(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    return Object.values(obj).filter(function(item) { return item && !item._placeholder; });
}

// Ensure object is not empty (Firebase deletes empty objects)
function ensureNotEmpty(obj) {
    if (!obj || Object.keys(obj).length === 0) {
        return { _placeholder: true };
    }
    return obj;
}

// Remove placeholder before using data
function removeEmptyPlaceholder(obj) {
    if (!obj) return {};
    if (obj._placeholder) {
        var copy = Object.assign({}, obj);
        delete copy._placeholder;
        return copy;
    }
    return obj;
}

// Migrate task ID array to object (for todaysTasks)
// Handles: [], [1,2,3], {}, {0: 1, 1: 2}, {id1: true, id2: true}
function migrateTaskIdArrayToObject(data) {
    if (!data) return {};
    // Already an object with non-numeric keys (correct format)
    if (typeof data === 'object' && !Array.isArray(data)) {
        var keys = Object.keys(data);
        if (keys.length === 0) return {};
        // Check if it's already in { taskId: true } format
        if (keys.every(function(k) { return isNaN(parseInt(k)); })) return data;
        // It's a sparse array from Firebase (numeric keys) - convert values
        var result = {};
        Object.values(data).forEach(function(id) {
            if (id) result[id] = true;
        });
        return result;
    }
    // It's an array - convert each ID to key
    if (Array.isArray(data)) {
        var result2 = {};
        data.forEach(function(id) {
            if (id) result2[id] = true;
        });
        return result2;
    }
    return {};
}

// Get task IDs from todaysTasks object (returns array for iteration)
function getTaskIds(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;  // Legacy support
    return Object.keys(obj).filter(function(k) { return obj[k] === true; });
}

// Check if task ID is in todaysTasks object
function hasTaskId(obj, taskId) {
    if (!obj || !taskId) return false;
    if (Array.isArray(obj)) return obj.includes(taskId);  // Legacy support
    return !!obj[taskId];
}

// Migrate dosesLogged array to object keyed by date
function migrateDosesLoggedToObject(data) {
    if (!data) return {};
    // Already an object with date keys
    if (typeof data === 'object' && !Array.isArray(data)) {
        var keys = Object.keys(data);
        if (keys.length === 0) return {};
        // Check if it's already in { 'YYYY-MM-DD': { date, count } } format
        if (keys.every(function(k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); })) return data;
        // It's a sparse array from Firebase (numeric keys) - convert
        var result = {};
        Object.values(data).forEach(function(item) {
            if (item && item.date) result[item.date] = item;
        });
        return result;
    }
    // It's an array - convert each item using date as key
    if (Array.isArray(data)) {
        var result2 = {};
        data.forEach(function(item) {
            if (item && item.date) result2[item.date] = item;
        });
        return result2;
    }
    return {};
}

// ==================== SAFE LOCALSTORAGE ====================
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn('localStorage quota exceeded, clearing backups...');
            try {
                localStorage.removeItem('dentalquest_backups');
                localStorage.setItem(key, value);
                return true;
            } catch (e2) {
                try {
                    var pinHash = localStorage.getItem('dentalQuestPin');
                    if (pinHash) localStorage.removeItem('dentalQuest_checkpoints_' + pinHash);
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

// ==================== BACKUP MANAGER ====================
var BackupManager = {
    maxBackups: 3,

    createBackup: function() {
        try {
            var backups = JSON.parse(localStorage.getItem('dentalquest_backups') || '[]');
            var currentData = localStorage.getItem('dentalStudentQuestData');
            if (!currentData) return;

            backups.unshift({
                timestamp: Date.now(),
                data: currentData
            });

            while (backups.length > this.maxBackups) {
                backups.pop();
            }

            safeLocalStorageSet('dentalquest_backups', JSON.stringify(backups));
        } catch (e) {
            console.error('Backup failed:', e);
        }
    },

    listBackups: function() {
        var backups = JSON.parse(localStorage.getItem('dentalquest_backups') || '[]');
        return backups.map(function(b) {
            return {
                timestamp: b.timestamp,
                date: new Date(b.timestamp).toLocaleString()
            };
        });
    },

    restoreBackup: function(timestamp) {
        var backups = JSON.parse(localStorage.getItem('dentalquest_backups') || '[]');
        var backup = backups.find(function(b) { return b.timestamp === timestamp; });
        if (backup && confirm('Restore backup from ' + new Date(timestamp).toLocaleString() + '?')) {
            safeLocalStorageSet('dentalStudentQuestData', backup.data);
            location.reload();
            return true;
        }
        return false;
    }
};

// ============================================
// TOAST & MODAL HELPERS
// ============================================

// Toast notification
function showToast(message, icon) {
    if (icon === undefined) icon = '\u2705';
    var toast = document.getElementById('toast');
    var toastIcon = document.getElementById('toastIcon');
    var toastMessage = document.getElementById('toastMessage');

    if (toastIcon) toastIcon.textContent = icon;
    if (toastMessage) toastMessage.textContent = message;

    if (toast) {
        // Clear previous timer to prevent stacking timeouts
        if (_toastTimer) clearTimeout(_toastTimer);
        toast.classList.add('show');
        _toastTimer = setTimeout(function() {
            toast.classList.remove('show');
            _toastTimer = null;
        }, 3000);
    }
}

// Custom Alert Modal (replaces blocking alert())
function showCustomAlert(message, title, callback) {
    if (title === undefined) title = 'Notice';
    if (callback === undefined) callback = null;
    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
    modal.innerHTML =
        '<div style="background:#161b22;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #30363d;text-align:center;">' +
            '<h3 style="color:#58a6ff;margin:0 0 16px 0;font-size:1.2em;">' + title + '</h3>' +
            '<p style="color:#e6edf3;margin-bottom:20px;white-space:pre-wrap;">' + message + '</p>' +
            '<button onclick="this.closest(\'.custom-modal-overlay\').remove(); window._customAlertCallback && window._customAlertCallback();"' +
                ' style="padding:12px 32px;background:#238636;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:1em;">OK</button>' +
        '</div>';
    document.body.appendChild(modal);
    window._customAlertCallback = callback;
    modal.querySelector('button').focus();
}

// Custom Confirm Modal (replaces blocking confirm())
function showCustomConfirm(message, onConfirm, onCancel, title) {
    if (onCancel === undefined) onCancel = null;
    if (title === undefined) title = 'Confirm';
    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10001;';
    modal.innerHTML =
        '<div style="background:#161b22;border-radius:16px;padding:24px;max-width:400px;width:90%;border:1px solid #30363d;text-align:center;">' +
            '<h3 style="color:#f0883e;margin:0 0 16px 0;font-size:1.2em;">' + title + '</h3>' +
            '<p style="color:#e6edf3;margin-bottom:20px;white-space:pre-wrap;">' + message + '</p>' +
            '<div style="display:flex;gap:12px;justify-content:center;">' +
                '<button id="confirmBtn" style="flex:1;padding:12px;background:#238636;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Yes</button>' +
                '<button id="cancelBtn" style="flex:1;padding:12px;background:#6e7681;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">No</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.querySelector('#confirmBtn').onclick = function() { modal.remove(); if (onConfirm) onConfirm(); };
    modal.querySelector('#cancelBtn').onclick = function() { modal.remove(); if (onCancel) onCancel(); };
    modal.querySelector('#confirmBtn').focus();
}

// VERSION COMPATIBILITY SYSTEM
// Validate dental-quest data structure
function isValidAppData(data) {
    if (!data || typeof data !== 'object') return false;
    // Valid if has ANY of these dental-quest structures
    return !!(
        data.tasks ||
        data.calendarEvents ||
        data.calendarNotes ||
        data.notebook ||
        data.financials ||
        data.focusModeData ||
        data.medications ||
        data.stats
    );
}

// ============================================
// MODAL UTILITIES
// ============================================

// Ensure modal is a direct child of document.body so it's never
// trapped inside a hidden parent (fullViewContainer / timer-section)
function ensureModalOnBody(modal) {
    if (modal && modal.parentNode !== document.body) {
        document.body.appendChild(modal);
    }
}

// Guard against ghost clicks closing modals immediately after opening (iOS Safari bug)
function safeModalClose(closeFn, event) {
    // Only close if: (1) click target is the overlay itself, and (2) 400ms have passed since open
    if (event && event.target !== event.currentTarget) return;
    if (Date.now() - _modalOpenTime < 400) return;
    closeFn();
}

// ============================================
// DATE HELPERS
// ============================================

// Helper to get local date string (avoids UTC timezone issues)
function getLocalDateString(date) {
    if (date === undefined) date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function getTodayDateString() {
    return getLocalDateString();
}

// Helper to parse YYYY-MM-DD as local date (avoids UTC timezone issues)
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    var parts = dateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

// ============================================
// DEEP MERGE
// ============================================

// Deep merge helper for nested objects (preserves arrays, merges objects recursively)
function deepMerge(target, source) {
    if (!source) return target;
    if (!target) return source;

    var result = Object.assign({}, target);

    for (var key in source) {
        if (source[key] === null || source[key] === undefined) {
            continue; // Don't overwrite with null/undefined
        }

        if (Array.isArray(source[key])) {
            // Arrays: use source array (don't merge array elements)
            result[key] = source[key];
        } else if (typeof source[key] === 'object' && typeof target[key] === 'object') {
            // Objects: recursive merge
            result[key] = deepMerge(target[key], source[key]);
        } else {
            // Primitives: use source value
            result[key] = source[key];
        }
    }

    return result;
}

// ============================================
// LOCAL CHANGE TRACKING
// ============================================

// Track local changes for conflict detection
function markLocalChange() {
    localChangesSinceLastSync = true;
}

// ============================================
// HTML ESCAPING
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
