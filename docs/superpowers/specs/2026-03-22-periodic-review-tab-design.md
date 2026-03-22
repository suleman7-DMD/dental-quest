# Periodic Review (PR) Tab — Design Spec

## Summary

Add a "Periodic Review" tab to the Graduation Roadmap app that generates an editable, exportable Written Report for Periodic Review matching BU GSDM's clinical performance review format. The tab auto-populates from existing app data (competencies, patients, appointments, dashboard snapshots), shows deltas against a hard-coded PR Part 1 baseline (December 2025), and exports to PDF via html2pdf.js.

## Context

- **PR Part 1** was submitted December 2025 — a 15-page document covering SPS dashboard stats, completed/in-progress procedures, department-by-department requirements audit, other requirements checklist, subjective narrative, patient roster with reliability colors, and individual patient writeups.
- **PR Part 2** is due late April 2026. Same structure, updated data, showing progress since PR1.
- The graduation roadmap app already tracks ~90% of the data needed (competencies, patients, procedures, appointments, dashboard snapshots). The PR tab reads from this data and adds PR-specific fields (subjective report, discrepancy notes, paste-in procedure tables).

## Architecture

### New Files
- `js/graduation-roadmap/periodic-review.js` — New JS module (~1 file, loaded after clinical.js)

### Modified Files
- `graduation-roadmap.html` — Add tab button + tab content div + `<script>` tag for new module
- `js/graduation-roadmap/state.js` — Add `periodicReviews` to `getDefaultRoadmapData()`, `isEmptyState()`, add `periodicreview` case to `switchTab()` calling `initPeriodicReview()`
- `js/graduation-roadmap/firebase-sync.js` — Add `periodicReviews` to all 4 merge/restore sites: `mergeRemoteState()`, `loadFromLocalStorage()`, `restoreCheckpoint()`, `importAndRestoreDirectly()`. Use `?? ''` (not `|| ''`) for string fields since empty strings are falsy.
- `js/graduation-roadmap/patients.js` — Add 4 new string fields to default patient records: `allergies`, `txCompletedByMe`, `recallHistory`, `activeStatus`
- `js/graduation-roadmap/init.js` — Wire `initPeriodicReview()` into `initUI()` if needed

### Tab Position
Between "Grad Prep" and "Remember" in the tab bar.

### Visual Style
Hybrid of Atlas Console + Swiss design systems (both in `docs/style-guides/`):
- **Layout**: Swiss 12-column grid for structure, Atlas Console panels for section containers
- **Typography**: Inter (Swiss) for body/headings, IBM Plex Mono (Atlas Console) for data values and counts
- **Colors**: Atlas Console palette — teal (#1a7f79) for positive/completed, clay (#c86b4b) for behind/critical, amber (#d8a357) for warnings, cream canvas (#f7f5ef) background
- **Sections**: Swiss-style section numbers (01, 02, 03...) in teal accent, uppercase labels
- **Tables**: Swiss clean borders (no rounded corners on tables), Atlas Console hover highlights
- **Buttons**: Swiss rectangular (no border-radius), Atlas Console teal for primary
- **Cards**: Atlas Console panel style (rounded corners, soft shadow) for department audit cards
- **Inputs**: Swiss underline inputs for inline editing
- **Forms**: Swiss textarea style (border, no rounded corners) for rich text areas

## Data Model

### New field on `roadmapData`

```javascript
periodicReviews: {
  pr2: {
    reviewDate: null,                    // editable date string 'YYYY-MM-DD'
    reviewPeriod: 'December 2025 — April 2026',

    // Section 2: SPS Dashboard discrepancy notes
    dashboardDiscrepancyNotes: '',

    // Section 3: Admin stats manual overrides
    adminStatsOverrides: {},             // only stores manual overrides, e.g. { ptsAssigned: 19 }

    // Section 4: Completed procedures (paste-in)
    completedProceduresHtml: '',

    // Section 5: In-progress procedures (editable rows)
    inProgressProcedures: {},        // object with generateId keys, each value: { patientName, chartNo, code, description, toothNo, dateStarted, lastVisit }

    // Section 6-8: Per-department notes
    departmentNotes: {},                 // { fixed: '...', operative: '...', oralsurg: '...', ... }

    // Section 9: Subjective report
    subjectiveReport: '',

    // Section 10-11: Per-patient PR-specific notes
    patientNotes: {},                    // { 'pt_1763380': { nextAppointment: '...', prNotes: '...' } }
    removedPatients: {},                 // { 'chartNumber': 'reason string' } — object not array (Firebase corrupts sparse arrays)

    lastEdited: null
  }
}
```

### New patient record fields (on existing `patientRecords`)

```javascript
// Added to each patient record in patients.js DEFAULT_PATIENTS:
allergies: '',          // dedicated field (currently buried in notes/medicalHx)
txCompletedByMe: '',    // what Suleman specifically has done (vs overall BU tx)
recallHistory: '',      // "Last: 5/19/2025. Freq: 6mo. Next due: 11/23/2025"
activeStatus: 'Active'  // 'Active' | 'Inactive' | 'Remove'
```

### PR1 Baseline Constant

```javascript
const PR1_BASELINE = {
  date: '2025-12-XX',  // exact date TBD from document

  // SPS Dashboard Clinical Progress Summary
  // Keys match parseDashboardUpdate() structure in patients.js (snapshot.clinicalProgress)
  clinicalProgress: {
    fixed:        { c: 0, ip: 0, p: 0 },
    implant:      { c: 0, ip: 0, spc: 0, p: 0 },
    implSurg:     { c: 0 },
    bridge:       { c: 0, ip: 0, p: 0 },
    remoComplete: { c: 0, ip: 0, p: 0 },
    overdenture:  { c: 0, p: 2 },
    remoPartial:  { c: 0, ip: 0, p: 0 },
    operative:    { c: 6, p: 7 },
    perioSrp:     { c: 0, p: 1 },
    endo:         { c: 0, p: 0 }
  },

  // Administrative stats — keys match snapshot structure
  // snapshot.roster.ptsAssigned, snapshot.roster.notSeen6Mo, snapshot.roster.tpNotConsented
  // snapshot.appointments.attended, .booked, .missed, .unclosed, .blank, .unauthorized
  adminStats: {
    ptsAssigned: 16,      // snapshot.roster.ptsAssigned
    notSeen6Mo: 4,        // snapshot.roster.notSeen6Mo
    tpNotConsented: 7,    // snapshot.roster.tpNotConsented
    booked: 6,            // snapshot.appointments.booked
    attended: 30,         // snapshot.appointments.attended
    missed: 4,            // snapshot.appointments.missed
    unclosed: 2,          // snapshot.appointments.unclosed
    blank: 1,             // snapshot.appointments.blank
    unauthorized: 0       // snapshot.appointments.unauthorized
  },

  // Department completion counts
  departments: {
    fixed:     { completed: 0, inProgress: 0, planned: 2 },
    operative: { completed: 6, inProgress: 0, planned: 7 },
    dentures:  { completed: 0, inProgress: 2, planned: 2 },
    rpd:       { completed: 0, inProgress: 0, planned: 0 },
    srp:       { completed: 0, inProgress: 0, planned: 1 },
    endo:      { completed: 0, inProgress: 0, planned: 0 }
  },

  // Total completed procedures
  completedProceduresCount: 41,
  inProgressProceduresCount: 2,

  // Patient roster (chart numbers with reliability)
  patientRoster: [
    { chartNumber: '1763380', name: 'Delossantos, Arthur', reliability: 'red', note: 'earliest apt requested for recall – no response – never seen pt' },
    { chartNumber: '1647620', name: 'Gil, Anabely', reliability: 'red', note: 'earliest Apt requested for SRP – no response – pt coassigned to me with post doc pros' },
    { chartNumber: '2569813', name: 'Koshkarian, Kavitha', reliability: 'red', note: 'earliest apt requested for recall – no response – never seen pt' },
    { chartNumber: '2577113', name: 'Krima, Mohamed', reliability: 'green', note: 'NV 12/04/2025 - #13 DO – reliable' },
    { chartNumber: '1186199', name: 'Laplante, Jonathan', reliability: 'red', note: 'earliest apt requested for recall – no response – never seen pt' },
    { chartNumber: '23042563', name: 'Mohamed, Karim', reliability: 'red', note: 'earliest apt requested for recall – no response – never seen pt' },
    { chartNumber: '2118878', name: 'Murillo, Carmen', reliability: 'yellow', note: 'pt missed last apt – requested new apt for implant LOE – no response' },
    { chartNumber: '23048578', name: 'Penn, Aubrey', reliability: 'red', note: 'earliest apt requested for recall – no response – never seen pt' },
    { chartNumber: '2467990', name: 'Rosario, Jose', reliability: 'green', note: 'intermaxillary records completed 11/08/2025' },
    { chartNumber: '2107896', name: 'Sbardella, Kristen', reliability: 'yellow', note: 'only seen pt once for denture adjustment' },
    { chartNumber: '966540', name: 'Soivilien, Sandrine', reliability: 'red', note: 'earliest apt requested for recall – no response – never seen pt' },
    { chartNumber: '79118', name: 'Williams, Kisha', reliability: 'green', note: 'pt scheduled for recall 11/21/2025' },
    { chartNumber: '1297657', name: 'Wright, Tawana', reliability: 'green', note: 'pt scheduled for #14 DO 12/13/2025' },
    // Removed patients
    { chartNumber: '2225586', name: 'Lopes, Alirio', reliability: 'remove', note: 'remove pt HTC' },
    { chartNumber: '23047754', name: 'Lesmeister, Jamielynn', reliability: 'remove', note: 'remove patient' },
    { chartNumber: '1754021', name: 'Nova, Jose', reliability: 'remove', note: 'Not my patient = Claudette\'s Patient' }
  ],

  // PR1 subjective report (for reference display)
  subjectiveReport: `Since beginning clinic in August 2025 I feel I have grown tremendously in such a short period of time. I am grateful for having my DC rotation the second week of clinic in early August as I feel it greatly helped me get my footing in how things work clinically at GSDM. Since then, I feel I have had a busy workload. I have completed 12 surfaces of operative which is something I am greatly proud of especially because my patients actually return. Once I completed the intermax record appointment for interim dentures, that was another great achievement which similarly took a lot of planning and preparation needed on my own time away from normal clinic/school hours. Similarly, I have completed 4 prophys and can reach near the point of starting a summative prophy to complete that requirement. I also went on oral surgery rotations recently and this grew my confidence even more in administering LA injections and even having extracted four teeth during my time. All in all, I have had a busy workload, successful appointments, good patients, and getting my requirements done as much as I can.

However, one major concern remains. I am simply reaching the point where the patients I can actually rely on to return for their next appointment, will soon not be fulfilling any requirements of mine. This leaves me with a roster of unreliable patients who are not treatment planned anything that may help me graduate. As is the case with most classmates I talk to, I am most concerned with my fixed requirements being completed as well ass perio SRPs. Furthermore, I am assigned 17 patients on SPS, I can confidently say only 4-6 of these patients are truly reliable and can be expected to return (highlighted in green below). The rest I have not been able to commit to scheduling an appointment, and thus, have been unable to see them (highlighted in red below). The patients highlighted in yellow below are patients who I have seen atleast once, but are co-assigned to another student, leaving me only with recalls for both, and thus unreliable for any requirements to complete.

If there is one thing I can change is that I may have more patients continuously assigned to me so that I can have an opportunity to get more of my requirements done. This has been a stressful situation to think about.

Specifically for clinic, I think I can still improve on satisfying all the different GSF's needs for how they expect a composite restoration workflow to go. I am mentally working out the differences and similarities seen between their philosophies, and can assume this may be true across many procedures. I need to continue being in the clinic gaining experience in seeing how treatment planning philosophies and specific procedure workflows may vary from doctor to doctor.

Another major area of improvement I hope to see in myself, is tackling the requirements that do not depend on patients. Whether it be leadership in rounds, dental technician, etc. I should be doing more of these smaller requirements when I am not busy with my own patients.

Overall, as for my personal growth, clinical growth, communication growth and overall satisfaction, I feel my expectations for the first semester of 3rd year clinic at GSDM has exceeded my expectations positively. I feel my GPL and GSF are responsive and will address any concerns. I just hope I can continue seeing patients that will also help me meet my graduation requirements.`
};
```

## 12 Sections — Detailed Behavior

### Section 1: Header
- Static text: "WRITTEN REPORT FOR PERIODIC REVIEW — SULEMAN SHAIKH — DMD'27 — U67779699"
- "Part 2: OBJECTIVE REPORT" label
- Editable review date (click to edit, saves to `pr2.reviewDate`)
- Auto-calculated review period from PR1 date to review date
- Swiss typography: large bold heading, uppercase section label in teal

### Section 2: SPS Dashboard Summary
- Table with columns: Category | C (PR1) | C (Now) | IP (PR1) | IP (Now) | P (PR1) | P (Now)
- 10 rows matching SPS dashboard categories (same keys as `snapshot.clinicalProgress`):
  | SPS Row | Baseline Key | "Now" Source |
  |---------|-------------|--------------|
  | Fixed | `clinicalProgress.fixed` | Latest `dashboardSnapshot.clinicalProgress.fixed` |
  | Implant | `clinicalProgress.implant` | Latest snapshot `.implant` |
  | Impl Surg | `clinicalProgress.implSurg` | Latest snapshot `.implSurg` |
  | Bridge | `clinicalProgress.bridge` | Latest snapshot `.bridge` |
  | Remo Complete | `clinicalProgress.remoComplete` | Latest snapshot `.remoComplete` |
  | Overdenture | `clinicalProgress.overdenture` | Latest snapshot `.overdenture` |
  | Remo Partial | `clinicalProgress.remoPartial` | Latest snapshot `.remoPartial` |
  | Operative | `clinicalProgress.operative` | Latest snapshot `.operative` |
  | Perio SRP | `clinicalProgress.perioSrp` | Latest snapshot `.perioSrp` |
  | Endo | `clinicalProgress.endo` | Latest snapshot `.endo` |
- "PR1" columns from `PR1_BASELINE.clinicalProgress`
- "Now" columns from latest `dashboardSnapshots[0].clinicalProgress` (primary source). If no snapshot exists, show "—" with editable override.
- Note: SPS categories (clinical progress grid) are a DIFFERENT taxonomy from competency category keys. This table shows the SPS view, not the competency view. Do NOT try to map these to competency keys here — that mapping happens in Section 6.
- Delta indicators: green text for positive change, clay text for zero/negative
- Below the table: one text area for discrepancy notes (saves to `pr2.dashboardDiscrepancyNotes`)
- No per-cell edit — just display auto values + text box for corrections

### Section 3: Administrative Statistics
- Two-column comparison table: Metric | PR1 | Current
- Metrics with exact "Current" sources:
  | Metric | PR1 Key | Current Source |
  |--------|---------|----------------|
  | Pts Assigned | `adminStats.ptsAssigned` (16) | `snapshot.roster.ptsAssigned` or override |
  | Not Seen 6 Mo | `adminStats.notSeen6Mo` (4) | `snapshot.roster.notSeen6Mo` or override |
  | TP Not Consented | `adminStats.tpNotConsented` (7) | `snapshot.roster.tpNotConsented` or override |
  | Booked | `adminStats.booked` (6) | `snapshot.appointments.booked` or override |
  | Attended | `adminStats.attended` (30) | `getSmartAppointmentCount().total` |
  | Missed | `adminStats.missed` (4) | `snapshot.appointments.missed` or override |
  | Unclosed | `adminStats.unclosed` (2) | `snapshot.appointments.unclosed` or override |
  | Blank | `adminStats.blank` (1) | `snapshot.appointments.blank` or override |
  | Unauthorized | `adminStats.unauthorized` (0) | `snapshot.appointments.unauthorized` or override |
- "snapshot" = `dashboardSnapshots[0]` (latest). If no snapshot, show editable empty cell.
- Click any "Current" cell to override manually → saves to `pr2.adminStatsOverrides[metricKey]`
- Overrides take precedence over snapshot values when set

### Section 4: Completed Procedures
- Section header: "SPS Dashboard → All Completed Procedures"
- Large text area (paste-in). User pastes Claude-formatted table text.
- Below the textarea: rendered preview of pasted content as a clean HTML table
- Content saved as raw text to `pr2.completedProceduresHtml`
- Parse format: pipe-delimited or tab-delimited rows (No. | Patient Name | Chart# | Date Completed | Code | Description | Tooth#)
- If empty, show placeholder: "Paste completed procedures table from Claude here"

### Section 5: In-Progress Procedures
- Section header: "SPS Dashboard → All In-Progress Procedures"
- Small editable table with columns: Patient Name | Chart# | Code | Description | Tooth# | Date Started | Last Visit
- "Add Row" button to add entries (uses `generateId('iproc')`)
- "Delete Row" button per row
- Content saved to `pr2.inProgressProcedures` as object with generateId keys (NOT array — Firebase safe)
- Each value: `{ patientName, chartNo, code, description, toothNo, dateStarted, lastVisit }`
- Pre-populated with PR1's 2 in-progress items (Jose Rosario interim dentures) as starting point

### Section 6: Department Requirements Audit
- One Atlas Console panel card per department
- 6 departments with explicit key mapping:
  | Display Name | Competency Key | PR1 Baseline Key |
  |-------------|---------------|-----------------|
  | Fixed Prosthodontics | `fixed` | `departments.fixed` |
  | Operative | `operative` | `departments.operative` |
  | Complete Dentures | `dentures` | `departments.dentures` |
  | RPDs | `rpd` | `departments.rpd` |
  | SRPs | `srp` | `departments.srp` |
  | Endodontics | `endo` | `departments.endo` |
- Each card displays:
  - Department name (bold, with colored left border matching category)
  - Summary row: `Completed: X (PR1: Y, Δ+Z) | In-Progress: X | Planned: X`
  - Requirements checklist: read from `competencies[categoryKey].sections[].items[]`
    - Each item: checkbox icon (filled if `completed >= required`), requirement text, `completed/required` count
    - Checkmarks are READ-ONLY — editing happens in Clinical tab
  - Notes text area (saves to `pr2.departmentNotes[categoryKey]`)
- Current counts from `competencies` data
- PR1 counts from `PR1_BASELINE.departments`

### Section 7: Summary "Needed" Table
- Auto-computed from competencies data
- Columns: Category | Required | Completed | Remaining | Status
- Rows derived by summing `item.required` and `item.completed` across each competency category's sections/items. The "Required" numbers come from `DEFAULT_COMPETENCIES` item definitions, NOT hard-coded here. This ensures the table stays accurate if competency data is updated.
- Status badge: teal "On Track" / amber "Behind" / clay "Critical" / gray "Not Started"
- Status logic: completed >= required = "On Track", completed > 0 but < required = "Behind", completed == 0 = "Not Started"
- Entirely derived, no user input needed

### Section 8: Other Requirements Checklist
- Grouped sections with explicit key mapping:
  | Display Name | Competency Key |
  |-------------|---------------|
  | Oral Surgery | `oralsurg` |
  | Pediatric Dentistry | `peds` |
  | Periodontology | `perio` |
  | Group Practice (GD 640 & GD 642) | `grouppractice` |
  | Treatment Planning (RS 545) | `txplanning` |
  | Geriatric Dental Medicine | `geriatrics` |
  | Externship & SPS | `externship` |
- Note: geriatrics and externship were not in PR Part 1 but ARE graduation requirements tracked in competencies. Include them in the checklist.
- Items read from `competencies[catKey].sections[].items[]`
- Display: requirement text + status indicator
  - Green highlight background if `status === 'completed'` or `completed >= required`
  - Yellow highlight if `status === 'in_progress'` or `completed > 0 && completed < required`
  - No highlight if not started
- Per-section notes text area (saves to `pr2.departmentNotes[catKey]`)
- Read-only checkmarks — editing in Clinical tab

### Section 9: Subjective Report
- Collapsed reference panel showing PR1's subjective report (from `PR1_BASELINE.subjectiveReport`)
  - Toggle: "Show PR Part 1 Reference" / "Hide"
- Auto-generated talking points (read-only, computed from data):
  - "Appointments: {PR1_attended} → {current_attended} (+{delta})"
  - "Total completed procedures: {PR1_count} → {current_count} (+{delta})"
  - "Patient roster: {PR1_count} → {current_count} ({new_count} new, {removed_count} removed)"
  - "Departments with progress since PR1: {list}"
  - "Departments with no progress: {list}"
- Rich text editor (contentEditable div):
  - Toolbar: Bold, Italic, Underline, Bullet List, Numbered List
  - Saves to `pr2.subjectiveReport` as HTML string
  - Placeholder: "Write your subjective report here..."

### Section 10: Patient Roster
- Table auto-populated from `clinicalData.patientRecords`
- Columns: #, Chart#, Patient Name, Reliability, Next Appointment, Status
- Reliability shown as colored dot: green/yellow/red (from `patientRecords[].reliability`)
- **Patient ID convention**: patientRecords use `pt_[chartNumber]` as keys (e.g., `pt_2118878`). PR1 baseline uses raw `chartNumber` strings. For "New since PR1" comparison: extract chartNumber from patientRecord key (`id.replace('pt_', '')`) and check against `PR1_BASELINE.patientRoster[].chartNumber`.
- "Next Appointment" column: editable text (saves to `pr2.patientNotes[patientId].nextAppointment` where patientId is the `pt_*` key)
- "New since PR1" badge on patients whose chart numbers are NOT in `PR1_BASELINE.patientRoster`
- At bottom: "Patients to Remove" section
  - Stored in `pr2.removedPatients` as object: `{ 'chartNumber': 'reason string' }` (NOT array)
  - "Add to Remove List" action on each patient row (stores chartNumber key + reason value)
  - Each removed entry has an editable reason field

### Section 11: Patient Writeups
- One collapsible card per patient (from `patientRecords`)
- Default state: collapsed (shows chart#, name, reliability dot, one-line summary)
- Expanded state shows all fields in PR Part 1 format:
  - **Patient**: age/sex (derived from patientRecord)
  - **PMH/RMH**: from `medicalHx` field
  - **Medications**: from `medications` field
  - **Allergies**: from new `allergies` field
  - **Tx Completed (Overall)**: from `dentalHx` field
  - **Tx Completed by me**: from new `txCompletedByMe` field
  - **Radiographs**: from `lastFMX`, `lastBW`, `lastPANO`, `lastCBCT` fields
  - **Tx Pending**: from `txPlan` field
  - **Recall History**: from new `recallHistory` field
  - **Next Visit (NV)**: from `nextVisit` field
  - **Status**: from new `activeStatus` field (dropdown: Active/Inactive). Note: "Remove" status is handled via Section 10's removedPatients mechanism, NOT via this dropdown — keeps the dropdown simple.
  - **Notes**: from `notes` field
- All fields editable inline (click to edit, saves to patientRecord directly via existing CRUD)
- Fields where current value differs from PR1 baseline patient data: shown with subtle left-border highlight
- Patients in `pr2.removedPatients` shown in separate "Removed" section at bottom with minimal info + reason
- "Expand All" / "Collapse All" toggle at top

### Section 12: Export PDF
- Single "Export PR Part 2 as PDF" button (Swiss rectangular, teal)
- Uses html2pdf.js loaded from CDN
- Renders the PR tab content as a clean, print-formatted PDF:
  - Hides edit controls, toolbars, toggle buttons
  - Adds page breaks between major sections (CSS `page-break-before`)
  - Uses print-friendly colors (no cream background, white paper)
  - Keeps table formatting, color-coded highlights, checkmarks
- PDF filename: `PR_Part_2_Suleman_Shaikh_YYYY-MM-DD.pdf`
- Content flows naturally with automatic page breaks — no rigid page-by-page layout spec

## Firebase Integration

### Default value in `getDefaultRoadmapData()`:
```javascript
periodicReviews: {
  pr2: {
    reviewDate: null,
    reviewPeriod: 'December 2025 — April 2026',
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
}
```
Code MUST initialize `roadmapData.periodicReviews.pr2` from this default before accessing nested fields.

### Fields to add to all 4 merge/restore sites in firebase-sync.js:
1. `periodicReviews` — deep merge pr2 fields using `?? ''` for string fields (empty strings are falsy, so `|| ''` would overwrite remote empty strings with local defaults). Object sub-fields (`adminStatsOverrides`, `inProgressProcedures`, `departmentNotes`, `patientNotes`, `removedPatients`) use standard `{ ...local, ...remote }` spread.
2. Patient record fields (`allergies`, `txCompletedByMe`, `recallHistory`, `activeStatus`) — these are on existing `patientRecords` objects, so they flow through existing patient merge logic. Use `?? ''` for these string fields too.

### isEmptyState() update:
Add `periodicReviews` check — but only if pr2 has meaningful data: `pr2.subjectiveReport || Object.keys(pr2.departmentNotes || {}).length > 0 || pr2.completedProceduresHtml`.

### saveData() flow:
PR tab edits → mutate `roadmapData.periodicReviews.pr2` → `safeLocalStorageSet()` → `saveData()` → existing save chain.
Patient field edits → mutate `roadmapData.clinicalData.patientRecords[id]` → `safeLocalStorageSet()` → `saveData()` → existing save chain.

## Dependencies

- **html2pdf.js** — `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js` — lazy-loaded via dynamic `<script>` tag when Export button is clicked (not loaded at page init)
- **No new Google Fonts** — Inter and IBM Plex Mono already available or loadable via existing pattern
- **No new Firebase paths** — all data stored under existing `graduationRoadmap` path

## Security Note

The `subjectiveReport` field stores HTML from contentEditable. This is a **single-user app** with PIN auth — the user is both the author and consumer of this HTML. No third-party input reaches this field. Therefore, the contentEditable HTML is rendered directly without `escapeHtml()`, which is an intentional exception to the CLAUDE.md XSS rule. If this ever becomes multi-user, sanitize on render.

## What This Does NOT Include

Per analyst audit, intentionally excluded:
- Status badges (Draft/Ready/Submitted), progress bars, section completion tracking
- Timeline view, comparison mode, side-by-side PR1 vs PR2
- Graduation readiness score or pace projections in PR context
- Auto-generated executive summary
- Smart suggestions or faculty-ready notes generator
- Multiple PR support UI (data model supports it but no UI for PR3+)
- Quick-update mode, version history
- Multiple export options (Full/Objective/Patient — just one full export)
- Word count indicator
- Per-cell edit on SPS dashboard table
- Auto-generated completed procedures table from app data

## Risks & Mitigations

1. **New field dropped by merge/restore** — Must add `periodicReviews` to all 4 sites. Mitigated by CLAUDE.md checklist + grep verification.
2. **html2pdf.js rendering fidelity** — Complex CSS may not render perfectly. Mitigated by print-friendly CSS fallback and keeping layout simple.
3. **Patient data model changes** — Adding 4 fields to 19 pre-filled records. Mitigated by using simple string fields with empty defaults (not breaking any existing logic).
4. **Large PR1_BASELINE constant** — Adds ~200 lines to periodic-review.js. Acceptable for frozen data.
5. **contentEditable quirks** — Rich text editing can be finnicky. Mitigated by simple toolbar (bold/italic/bullets only) and storing as HTML string.
