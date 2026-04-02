# Clinical and Competencies System

## Clinical Tab Overview

The Clinical tab at ~line 13546 has 4 sub-tabs managed by `switchClinicalSubtab()`:
1. **Patients** — Patient record management
2. **Appointments** — Scheduled clinical appointments
3. **Procedures** — Completed procedure logging
4. **Competencies** — Graduation requirement tracking (the most complex)

## Clinical Data Structure

```javascript
roadmapData.clinicalData = {
    patients: {},                // Patient records keyed by generateId('patient')
    appointments: {},            // Appointments keyed by generateId('apt')
    completedProcedures: {},     // Procedure records
    competencies: null           // Initialized from DEFAULT_COMPETENCIES on first access
};
```

## Patients System

### Patient Shape
```javascript
{
    id: 'patient_1707400000000_abc123',
    firstName: 'John',
    lastName: 'Doe',
    age: 45,
    phone: '555-1234',
    status: 'active',          // active | inactive | completed
    notes: '',
    tasks: {},                 // Treatment plan items keyed by ID
    createdAt: '2026-02-01T10:00:00Z',
    importedRequirements: [],   // From REQUIREMENTS_MATCH canFulfill entries (authoritative)
    priorityNotes: '',          // From REQUIREMENTS_MATCH block
    highValue: false,           // From REQUIREMENTS_MATCH block
    clinicalBrief: {                    // Structured prose from Claude webchat analysis (null if not imported)
        dateGenerated, snapshot, diagnosesAndRisks, txStatus, txSequencing,
        flaggedConcerns, gradValue, nextVisitPlan
    },
    briefHistory: [],                   // Max 3 prior briefs (pushed before overwrite)
}
```

### Patient Functions
| Function | Line | Description |
|----------|------|-------------|
| `renderPatientsList()` | ~13588 | Render all patients with filter |
| `filterPatients()` | ~13682 | Filter patients list |
| `openAddPatientModal()` | ~13686 | Show add patient form |
| `editPatient(patientId)` | ~13708 | Edit existing patient |
| `closePatientModal()` | ~13733 | Close patient modal |
| `addPatientTask()` | ~13738 | Add task to patient |
| `removePatientTask(taskId)` | ~13747 | Remove patient task |
| `updatePatientTask(taskId, field, value)` | ~13755 | Update patient task field |
| `renderPatientTasksInModal()` | ~13762 | Render tasks in edit modal |
| `savePatient()` | ~13784 | Save patient to roadmapData + saveData() |
| `deletePatient()` | ~13837 | Delete patient with confirmation |
| `renderClinicalBrief(patient, patientId)` | patients.js | Render 7-section Clinical Brief HTML — SNAPSHOT always visible, accordion on mobile |
| `parseClinicalBrief(text)` | patients.js | Parse CLINICAL_BRIEF block — 10 KEY:value fields with multi-line continuation |

## Appointments System

### Appointment Shape
```javascript
{
    id: 'apt_1707400000000_def456',
    patientId: 'patient_123',     // Links to patient
    date: '2026-02-15',
    time: '09:00',
    duration: 120,                // Minutes
    type: 'restorative',         // restorative | perio | endo | prosth | exam | other
    procedures: 'Class II composite #14',
    notes: '',
    status: 'scheduled',         // scheduled | completed | cancelled
    createdAt: '2026-02-01T10:00:00Z'
}
```

### Appointment Functions
| Function | Line | Description |
|----------|------|-------------|
| `renderAppointmentsList()` | ~13865 | Render appointments |
| `renderAppointmentCard(apt, patients)` | ~13911 | Single appointment card |
| `formatAptTime(time)` | ~13944 | Format appointment time |
| `openAddAppointmentModal(preselectedPatientId)` | ~13952 | Add appointment form |
| `editAppointment(aptId)` | ~13977 | Edit existing appointment |
| `closeAppointmentModal()` | ~14004 | Close appointment modal |
| `saveAppointment()` | ~14008 | Save appointment to roadmapData |
| `deleteAppointment()` | ~14089 | Delete with confirmation |

## Clinical Statistics

`updateClinicalStats()` at ~line 13553 calculates:
- Total patients (active/completed/inactive)
- Total appointments (upcoming/completed)
- Competency progress percentage

`renderClinicalDashboardWidget()` at ~line 11410 renders a compact clinical progress widget on the Dashboard tab.

---

## Competencies System V2 (Manual-Count Model — Apr 2 2026)

### Architecture

Competencies track graduation requirements for BU dental school. Nested structure:
```
competencies -> categories -> sections -> items
```

**V2 Model (Apr 2 2026)**: Each item has `completed` (number), `required` (number), `note` (string), `lastVerified` (date|null). No evidence arrays. Counts change ONLY via REQUIREMENTS_STATUS import or inline manual edits (+/- buttons).

**Old model (DELETED)**: `completionEntries[]`, `linkProcedureToCompetencies`, `unlinkProcedureFromCompetencies`, `autoLinkReviewQueue`, review queue, unlock chain visualization — all removed in commit `f496565`.

### DEFAULT_COMPETENCIES (clinical.js ~line 420)

**Ground Truth:** `docs/GROUND_TRUTH_REQUIREMENTS.md` — the SINGLE source of truth for all requirement IDs, counts, deadlines, and completion status. Last updated 2026-04-02.

14 categories of real BU dental school clinical requirements:

| Key | Name | Focus |
|-----|------|-------|
| `fixed` | Fixed Prosthodontics | 10 units, 1 FPD, 1 implant crown, 3 CEREC + formatives + summatives |
| `operative` | Operative | Class V, multisurface composites, mock board |
| `dentures` | Complete Dentures | 4 arches + formatives, summatives, overdenture |
| `rpd` | RPDs | 3 tracks (cast metal, flexible, interim) |
| `srp` | SRPs / Calculus Removal | srp-calc-1/2/3, srp-reeval |
| `endo` | Endodontics | RCTs, pulpectomies, mock board |
| `oralsurg` | Oral Surgery | 3rd/4th year rotations, extractions |
| `peds` | Pediatric Dentistry | PD 530 course, rotations, log sheet |
| `perio` | Periodontology | Surgical assists, formatives, summatives |
| `grouppractice` | Group Practice D3 | Reviews, analyses, comm, PMS, meetings, OHRA |
| `grouppractice4` | Group Practice D4 | Summatives, PTEs, aux, leading rounds |
| `txplanning` | Treatment Planning | Seminar, OHRA, caries detection |
| `geriatrics` | Geriatric Dental Medicine | PH 541 course, rotation, assignment |
| `externship` | Externship & SPS | Case presentation, outreach, SPS log |

### V2 Item Shape
```javascript
{
    id: 'fixed-form-prov',         // Stable ID from GROUND_TRUTH_REQUIREMENTS.md
    text: '6 Provisional Restoration',
    required: 6,                   // How many needed
    completed: 0,                  // How many done (manual-only)
    note: '',                      // Free text
    lastVerified: '2026-04-01',   // Date of last manual audit/edit (null if never verified)
    d3Deadline: null,             // Date string or null (synced from DEFAULT_COMPETENCIES by syncSchemaFields)
    isSummative: false,           // Schema field
    status: 'pending'             // Derived: completed >= required → 'completed', > 0 → 'in_progress', else 'pending'
}
```

**Fields DELETED from saved state by V2 migration**: `completionEntries`, `rules`, `custom`, `unlockedBy`, `unlockEmailTo`. Note: `syncSchemaFields()` re-adds `rules` from DEFAULT_COMPETENCIES on every init (harmless).

### V2 Migration (`migrateToCompetencyV2()` in clinical.js)
One-time migration gated by `competencyV2Migrated` localStorage flag. Runs after `syncSchemaFields()` in `initUI()`. Steps:
1. Strips old fields from all items
2. Wipes all counts to 0
3. Seeds 25 verified values from Apr 1 ground truth audit
4. Clears `autoLinkReviewQueue`

### Key Competency Functions (V2)

| Function | Module | Description |
|----------|--------|-------------|
| `getCompetenciesData()` | clinical.js | Read-only accessor, returns mutable reference |
| `ensureCompetenciesInitialized()` | clinical.js | Init from DEFAULT_COMPETENCIES (call from init paths only) |
| `getItemStatus(item)` | clinical.js | Derive status from completed/required |
| `calculateCategoryStats(cat)` | clinical.js | {completed, inProgress, planned, pending, totalUnits, completedUnits, percent} |
| `calculateOverallStats(comp)` | clinical.js | Aggregate stats across all categories |
| `renderCompetencies()` | clinical.js | V2 3-panel UI with cv2-* classes |
| `cv2ToggleCategory(catKey)` | clinical.js | Expand/collapse category accordion |
| `cv2EditCount(catKey, itemId, el)` | clinical.js | Inline number input on count click |
| `cv2ToggleNote(catKey, itemId, el)` | clinical.js | Toggle inline note editor |
| `cv2ShowPipeline(itemId)` | clinical.js | Show pipeline patients (DOM popup) |
| `cv2FilterCompetencies(query)` | clinical.js | Search filter |
| `cv2AddRequirement(catKey)` | clinical.js | Add custom requirement via prompt |
| `cv2BuildMilestoneStrip(comp, stats)` | clinical.js | KPI milestone cards (apts/procs/summatives) |
| `cv2BuildD3Alert(comp, daysLeft)` | clinical.js | D3 deadline alert bar |
| `cv2BuildWhatsNext(comp)` | clinical.js | What's next panel |
| `adjustCompItem(catKey, itemId, delta)` | clinical.js | +/- count, sets lastVerified, saves |
| `setCompItemStatus(catKey, itemId, status)` | clinical.js | Toggle status, sets lastVerified, saves |
| `saveCompItemNote(catKey, itemId, note)` | clinical.js | Save inline note |
| `resetCompetencies()` | clinical.js | Reset all to defaults, force upload |
| `saveCompItem()` | clinical.js | Save competency item |
| `deleteCompItem(catKey, itemId)` | clinical.js | Delete competency item |
| `mergeCompetencies(local, cloud)` | state.js | Timestamp-based merge (most recent lastVerified wins) |
| `getSmartProcedureCount()` | state.js | V2: sums item.completed, SPS snapshot authoritative |

### V2 UI Design System
- CSS: `cv2-*` classes (Atlas Console adapted, light theme #f7f5ef)
- 3 panels: milestone strip (sticky), D3 alert + category accordion, What's Next
- Mobile-first: 44px touch targets, responsive grid
- Design tokens: `--cv2-done` (#1a7f79 teal), `--cv2-wip` (#d8a357 amber), `--cv2-critical` (#c86b4b clay)
- Pipeline data from `patient.importedRequirements[]` (NOT on competency items)

### V2 Merge Strategy
```javascript
// In mergeCompetencies(): timestamp-based, most recent lastVerified wins
if (both have lastVerified) → newer date takes the count
if (only cloud has lastVerified) → cloud wins
if (neither has lastVerified) → Math.max of completed counts
note: local.note || cloud.note (keep whichever non-empty)
```

### V2 Post-Overhaul Audit (commit 219620b, Apr 2 2026)
11-agent audit found and fixed 13 bugs across 4 files. Key fixes:
- **CSS/JS mismatch**: 35 cv2-* classes had no CSS (D3 Alert, What's Next, category notes). 49 CSS rules added. Root cause: CSS and JS rendering written with different class names.
- **resetCompetencies()**: Now clears `competencyV2Migrated` + 5 other migration flags so V2 migration re-runs after reset.
- **saveCompItem()**: Fixed V2 item shape — removed `completionEntries`, `unlockedBy`, `unlockEmailTo`; added `lastVerified: null`.
- **COMPLETED_TODAY dedup**: Changed from `competencyItemIds.some()` (always empty in V2) to `procedure + date + patient` match.
- **COMPLETED_TODAY note isolation**: Both note write paths gated by `!item.isDelta`.
- **getPatientsFulfilling()**: Dead `completedPatientIds` removed. Pipeline badges always 'planned' in V2.
- **tsCheckCompetencies()**: Rewritten for V2 — checks over-counted, unverified. No completionEntries refs.
- **tsFixResyncCompCounts()**: Rewritten — clamps [0, required], derives status.
- **Milestone toast + comp-modal**: CSS added for both (were completely unstyled).

### Deleted Functions (14 total, commit f496565)
`renderEvidenceCards`, `removeEvidenceEntry`, `undoRemoveEvidence`, `renderUnlockChain`, `linkProcedureToCompetencies`, `unlinkProcedureFromCompetencies`, `renderByPatientView`, `openReviewQueuePanel`, `acceptReviewSuggestion`, `rejectReviewSuggestion`, `dismissReviewItem`, `renderReviewQueue`, `autoLinkProcedureToCompetencies`, `matchProcedureToCompetencies`, `addToReviewQueue`, `isItemUnlocked`

### Lecture Import System

For importing lecture schedules into clinical appointments:
| Function | Line | Description |
|----------|------|-------------|
| `openLectureImportModal()` | ~14989 | Open import modal |
| `parseLectureFormat(text)` | ~15001 | Parse lecture text format |
| `previewLectureImport()` | ~15125 | Preview parsed lectures |
| `confirmLectureImport()` | ~15161 | Import lectures as appointments |

### Clinical Import System

For importing clinical appointment data:
| Function | Line | Description |
|----------|------|-------------|
| `openClinicalImportModal()` | ~15238 | Open clinical import modal |
| `parseClinicalFormat(text)` | ~15250 | Parse clinical text format |
| `previewClinicalImport()` | ~15317 | Preview parsed appointments |
| `confirmClinicalImport()` | ~15346 | Import clinical data |
| `syncClinicalToMonthlyPlanner()` | ~15457 | Sync clinical to monthly planner |
