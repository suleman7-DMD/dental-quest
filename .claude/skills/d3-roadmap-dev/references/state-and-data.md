# Complete State Structure

## Main State Object: `roadmapData`

Defined at ~line 8408. NOT called `state` (that's body-comp-tracker).

```javascript
let roadmapData = {
    pedsLockedIn: 33.3,                // Points earned in Peds so far

    mandatoryItems: {                  // Checkbox items on Mandatory tab
        gatecontrol: false,
        acutepain: false,
        peextremities: false,
        npi: false,
        orthomodule: false,
        ips: false,
        periodiscussion: false
    },

    grades: {                          // Saved grades keyed by courseId -> componentId
        oralmed: { quiz1: 100 },
        paincontrol: {},
        critthink: { quiz1: 100 },
        peds: { exam1: 77, headstart: 100 },
        perio: { midterm: null, writtenAssignment: 100 },
        ortho: { midterm: null }
    },

    editedDeadlines: {},               // Overrides to STATIC_DEADLINES fields (keyed by getDeadlineId())
    customDeadlines: {},               // User-added deadlines (object with generateId('custom') keys)
    deletedDeadlines: {},              // Deleted static deadlines (object keys for Firebase)
    completedDeadlines: {},            // Completion status + grades (keyed by getDeadlineId())
    examStudyProgress: {},             // Lecture study tracking: { 'peds-exam2-lec11': true }

    dailyPlanner: {
        date: null,                    // Current planner date
        focus: '',                     // Focus text for the day
        notes: '',                     // General notes
        blocks: {},                    // Time blocks keyed by ID
        pomodorosCompleted: 0,
        bedtime: '23:00'
    },

    monthlyPlanner: {
        notes: {},                     // Notes keyed by ID
        customTasks: {},               // User-added tasks keyed by ID
        overriddenStatic: {},          // Static task overrides
        completedTasks: {}             // Task completion tracking
    },

    clinicalData: {
        patients: {},                  // Patient records keyed by generateId('patient')
        appointments: {},              // Appointments keyed by generateId('apt')
        completedProcedures: {},       // Procedure records
        competencies: null             // Initialized from DEFAULT_COMPETENCIES on first access
    },
    // Patient records in patientRecords{} may include:
    //   .clinicalBrief: { dateGenerated, snapshot, diagnosesAndRisks, txStatus, txSequencing, flaggedConcerns, gradValue, nextVisitPlan }
    //   .briefHistory: [] (max 3 prior versions, pushed before overwrite)

    exams: {},                         // For Body Comp cross-app integration

    lastSaved: null,
    _version: 0,                       // MUST be 0 in defaults
    _lastModified: null,
    _dataLoaded: false
};
```

## Global Variables (~lines 8383-8523)

```javascript
// Firebase
let firebaseInitialized = false;       // ~8396
let database = null;                   // ~8397
let firebaseSyncEnabled = false;       // ~8398
let currentUser = null;                // ~8399
let userPath = null;                   // ~8400
let saveDebounceTimer = null;          // ~8401

// Cross-app sync
let mainAppTasksRef = null;            // ~8404
let mainAppTasks = [];                 // ~8405

// Sync protection flags
let isInitialLoad = true;             // ~8521
let hasLoadedFromCloud = false;        // ~8522
let pinValidated = false;              // ~8523

// Working data (rebuilt each initUI())
let deadlines = [];                    // ~11178 — merged from STATIC + custom - deleted
const exams = [...];                   // ~11180 — static exam countdown array
let lastSaveTime = 0;                  // ~10990

// UI state
let expandedCompCategories = new Set(); // ~14478
```

## Static Data Constants

### STATIC_DEADLINES (~line 11125)
50+ hardcoded deadlines for Spring 2026. Each entry:
```javascript
{ date: '2026-02-18', day: 'Wed', what: 'EXAM 2 (cumulative)...', course: 'Peds', weight: '45%', type: 'EXAM', month: 'february', done: true }
```
Months: january, february, march, april. Types: Quiz, Assignment, EXAM, Take-home, Module, Project, Presentation, Clinical, Blocked, No Class.

### exams (~line 11180)
Static exam countdown array:
```javascript
const exams = [
    { name: 'PC2 Midterm', date: '2026-02-02', weight: '30%', priority: 'HIGH' },
    { name: 'Ortho Final', date: '2026-02-06', weight: '50%', priority: 'HIGH' },
    { name: 'Geriatrics Final', date: '2026-02-11', weight: 'TBD', priority: 'MEDIUM' },
    { name: 'Peds Exam 2', date: '2026-02-18', weight: '45%', priority: 'CRITICAL' },
    { name: 'Oral Med Midterm', date: '2026-02-27', weight: '25%', priority: 'MEDIUM' },
    { name: 'Perio 2 Final', date: '2026-03-11', weight: '45%', priority: 'MEDIUM' },
    { name: 'PC2 Final', date: '2026-03-19', weight: '40%', priority: 'MEDIUM' },
    { name: 'Peds Exam 3', date: '2026-03-30', weight: '7.5%', priority: 'LOW' },
    { name: 'Oral Med Final', date: '2026-04-17', weight: '25%', priority: 'LOW' }
];
```

### courseStructures (~line 11829)
Grade calculator course definitions — see grades-and-deadlines.md for full details.

### DEFAULT_COMPETENCIES (~line 14128)
10-category clinical competency structure — see clinical-and-competencies.md for full details.

## Firebase Structure
```
users/user_{hashedPin}/d3Roadmap/
    pedsLockedIn
    mandatoryItems/
    grades/
        oralmed/ { quiz1, quiz2, ..., midterm, final, passionProject }
        paincontrol/ { rx1, takehome1, midterm, medConsult, rx2, takehome2, final }
        peds/ { exam1, exam2, exam3, headstart, orthoModule }
        ...
    editedDeadlines/
    customDeadlines/
    deletedDeadlines/
    completedDeadlines/
    examStudyProgress/
    dailyPlanner/
    monthlyPlanner/
        notes/
        customTasks/
        overriddenStatic/
        completedTasks/
    clinicalData/
        patients/
        appointments/
        completedProcedures/
        competencies/
    exams/
    lastSaved
    _version
    _lastModified
```

## isEmptyState() (~line 8526)

Note: `clinicalBrief` and `briefHistory` are NOT checked in isEmptyState — they live on patient records, which are already covered via the `clinicalData.patients` check below.

Returns true (empty) only if ALL of these are missing:
- customDeadlines (count > 0)
- monthlyPlanner.customTasks (count > 0)
- clinicalData.appointments (count > 0)
- dailyPlanner.blocks (count > 0)
- monthlyPlanner.notes (count > 0)
- clinicalData.patients (count > 0)
- completedDeadlines (count > 0)
- examStudyProgress (count > 0)
- grades (any course with entries)
- exams (count > 0)
- editedDeadlines (count > 0)

## Utility Functions

| Function | Line | Description |
|----------|------|-------------|
| `generateId(prefix)` | ~9530 | `prefix_timestamp_random6` |
| `getValues(obj)` | ~9537 | Safe `Object.values()` with array passthrough |
| `getCount(obj)` | ~9605 | Safe count for objects/arrays |
| `sanitizeFirebaseKey(key)` | ~9547 | Remove chars Firebase rejects |
| `sanitizeFirebaseData(obj)` | ~9560 | Recursively sanitize all keys |
| `getDeadlineId(deadline)` | ~9551 | Stable ID from deadline properties |
| `migrateArrayToObject(data, prefix)` | ~9612 | Convert arrays to objects for Firebase |
| `migrateCompetencies(comp)` | ~9637 | Migrate competency arrays to objects |
| `ensureArray(val, fallback)` | ~9519 | Ensure value is array |
| `escapeHtml(str)` | ~11799 | XSS protection for innerHTML |
| `getLocalDateString(date)` | ~11195 | Local timezone YYYY-MM-DD |
| `parseLocalDate(dateStr)` | ~11200 | Parse YYYY-MM-DD in local timezone |
| `getCountdown(dateStr)` | ~11206 | Days until a date |
| `formatDate(dateStr)` | ~11233 | Human-readable date |
| `getDaysUntil(dateStr)` | ~13164 | Days until date (for exam content) |
