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

var currentCategory = localStorage.getItem('dq_currentCategory') || 'all';
var tasks = {}; // Object with ID keys for Firebase safety
var timerInterval = null;
var currentSeconds = 25 * 60;
var isWorkSession = true;
var workMinutes = 25;
var breakMinutes = 5;
var currentTask = null;

// Focus Mode variables
var currentView = localStorage.getItem('dq_currentView') || 'focus'; // 'focus', 'full', or 'financials'
var currentFinTab = localStorage.getItem('dq_finTab') || 'overview';
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
        timerRemaining: null,
        confirmedStarted: false,
        startedAt: null
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
var commandCenterMode = localStorage.getItem('dq_commandCenterMode') || 'triage';

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
// ICON HELPER — Lucide SVG icon inline strings
// ============================================

// Returns inline SVG string for a Lucide icon name.
// Usage: icon('calendar') or icon('check-circle', 16)
// Falls back to empty string if lucide is not loaded.
var _iconCache = {};
function icon(name, size) {
    if (size === undefined) size = 16;
    var key = name + '_' + size;
    if (_iconCache[key]) return _iconCache[key];
    // Map of commonly used icons to inline SVG paths
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
        'wallet': '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
        'pill': '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
        'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
        'clipboard-list': '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
        'graduation-cap': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
        'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'refresh-cw': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
        'upload': '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
        'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
        'chevron-up': '<polyline points="18 15 12 9 6 15"/>',
        'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
        'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
        'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
        'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        'crown': '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>',
        'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
        'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
        'edit': '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
        'grip-vertical': '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
        'moon': '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
        'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
        'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
        'pause': '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
        'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
        'timer': '<circle cx="12" cy="14" r="8"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="10" y1="2" x2="14" y2="2"/>',
        'menu': '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
        'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
        'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
        'dollar-sign': '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
        'credit-card': '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
        'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
        'trending-down': '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
        'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
        'layout-grid': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
        'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
        'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
        'lock': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        'rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
        'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
        'heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
        'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'loader': '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
        'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
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

// ==================== BACKUP MANAGER (localStorage backups removed — Firebase is the backup) ====================
var BackupManager = {
    createBackup: function() { /* no-op: Firebase sync replaces localStorage backups */ },
    listBackups: function() { return []; },
    restoreBackup: function() { if (typeof showToast === 'function') showToast('Use Force Pull from Cloud to restore', 'info'); }
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
// All title/message args are escaped via escapeHtml() before insertion
function showCustomAlert(message, title, callback) {
    if (title === undefined) title = 'Notice';
    if (callback === undefined) callback = null;
    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.onclick = function(e) { if (e.target === modal) { modal.remove(); if (callback) callback(); } };
    var card = document.createElement('div');
    card.className = 'custom-modal-card';
    var h3 = document.createElement('h3');
    h3.className = 'custom-modal-title';
    h3.style.color = 'var(--info, #5E7A8A)';
    h3.textContent = title;
    var p = document.createElement('p');
    p.className = 'custom-modal-message';
    p.textContent = message;
    var btn = document.createElement('button');
    btn.className = 'custom-modal-btn custom-modal-btn-primary';
    btn.textContent = 'OK';
    btn.onclick = function() { modal.remove(); if (callback) callback(); };
    card.appendChild(h3);
    card.appendChild(p);
    card.appendChild(btn);
    modal.appendChild(card);
    document.body.appendChild(modal);
    btn.focus();
}

// Custom Confirm Modal (replaces blocking confirm())
function showCustomConfirm(message, onConfirm, onCancel, title) {
    if (onCancel === undefined) onCancel = null;
    if (title === undefined) title = 'Confirm';
    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.onclick = function(e) { if (e.target === modal) { modal.remove(); if (onCancel) onCancel(); } };
    var card = document.createElement('div');
    card.className = 'custom-modal-card';
    var h3 = document.createElement('h3');
    h3.className = 'custom-modal-title';
    h3.style.color = 'var(--warning)';
    h3.textContent = title;
    var p = document.createElement('p');
    p.className = 'custom-modal-message';
    p.textContent = message;
    var actions = document.createElement('div');
    actions.className = 'custom-modal-actions';
    var yesBtn = document.createElement('button');
    yesBtn.className = 'custom-modal-btn custom-modal-btn-primary';
    yesBtn.textContent = 'Yes';
    yesBtn.onclick = function() { modal.remove(); if (onConfirm) onConfirm(); };
    var noBtn = document.createElement('button');
    noBtn.className = 'custom-modal-btn custom-modal-btn-secondary';
    noBtn.textContent = 'No';
    noBtn.onclick = function() { modal.remove(); if (onCancel) onCancel(); };
    actions.appendChild(yesBtn);
    actions.appendChild(noBtn);
    card.appendChild(h3);
    card.appendChild(p);
    card.appendChild(actions);
    modal.appendChild(card);
    document.body.appendChild(modal);
    yesBtn.focus();
}

// Custom Prompt Modal (replaces blocking prompt())
function showCustomPrompt(message, defaultValue, onSubmit, title) {
    if (defaultValue === undefined) defaultValue = '';
    if (title === undefined) title = 'Input';
    var modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    var cancelFn = function() { modal.remove(); if (onSubmit) onSubmit(null); };
    modal.onclick = function(e) { if (e.target === modal) { cancelFn(); } };
    var card = document.createElement('div');
    card.className = 'custom-modal-card';
    var h3 = document.createElement('h3');
    h3.className = 'custom-modal-title';
    h3.style.color = 'var(--accent)';
    h3.textContent = title;
    var p = document.createElement('p');
    p.className = 'custom-modal-message';
    p.textContent = message;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'custom-modal-input';
    input.value = defaultValue;
    var actions = document.createElement('div');
    actions.className = 'custom-modal-actions';
    var okBtn = document.createElement('button');
    okBtn.className = 'custom-modal-btn custom-modal-btn-primary';
    okBtn.textContent = 'OK';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'custom-modal-btn custom-modal-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    var submitFn = function() {
        var val = input.value;
        modal.remove();
        if (onSubmit) onSubmit(val);
    };
    okBtn.onclick = submitFn;
    cancelBtn.onclick = cancelFn;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') submitFn();
        if (e.key === 'Escape') cancelFn();
    });
    actions.appendChild(okBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(h3);
    card.appendChild(p);
    card.appendChild(input);
    card.appendChild(actions);
    modal.appendChild(card);
    document.body.appendChild(modal);
    input.focus();
    input.select();
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
// GREETING HELPER
// ============================================

function getGreetingString() {
    var hour = new Date().getHours();
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    if (hour >= 21 || hour < 5) return 'Good night';
    return 'Good morning';
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
