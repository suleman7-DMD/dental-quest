# Clinical Intelligence System v2 — Full Architecture Redesign

**Date:** 2026-03-30
**Status:** Approved for implementation
**Scope:** Patients tab + Clinical tab + Competencies tab — unified data layer, import pipeline, propagation, competency model

---

## 1. Problem Statement

The graduation-roadmap app has three interconnected tabs (Patients, Clinical, Competencies) that evolved independently, creating:

- **Two patient stores** (`clinicalData.patients{}` and `clinicalData.patientRecords{}`) that never sync — patients created on one tab are invisible on the other
- **Two import systems** (patients.js and import-system.js) that write to different stores and have different propagation chains — Clinical import never updates competencies
- **Broken appointment→competency pipeline** — procedure recording is optional after appointment completion, auto-created procedures have empty `competencyItemIds`, competencies silently miss clinical work
- **Asymmetric cascade deletes** — deleting from Clinical tab leaves ghost records in `patientRecords{}`
- **Missing propagation calls** — `saveAppointment()`, `completeAppointment()`, `confirmClinicalImport()`, `initClinicalTab()` all fail to re-render competencies
- **Competency model missing structural metadata** — `DEFAULT_COMPETENCIES` has correct 13 categories and 116+ items (all IDs and counts match 000-REQUIREMENTS.md), but lacks unlock chain metadata, D3 deadline markers, milestone trackers, and 4 clinical experience tracking items (fixed-units, fixed-fpd, fixed-implant, fixed-cerec)
- **4 analyst-discovered bugs** — empty REQUIREMENTS_MATCH silently dropped, reqId case normalization inconsistent, txSummaryBU missing from PR writeups, fixed clinical units not tracked

---

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Patient data | Single canonical store (`patientRecords{}`) | Eliminates entire class of dual-store drift bugs |
| Import pipeline | One parser, tab-specific entry points | Zero code duplication, guaranteed propagation |
| Appointment→competency | Smart auto-link with keyword matching | Maximum automation, minimum clinical workflow friction |
| Clinical tab "My Patients" | Replace with lightweight "Active Roster" | Reads unified store, no duplicate CRUD |
| Competencies tab | Promote to top-level tab | Reflects actual importance as graduation command center |
| Propagation | Single `propagateClinicalChanges()` function | No more ad-hoc render calls, zero propagation gaps |
| Cascade deletes | Shared functions called by all tabs | Symmetric behavior, zero orphaned records |

---

## 3. Unified Patient Data Layer

### 3.1 Canonical Schema: `clinicalData.patientRecords{}`

```javascript
patientRecords[id] = {
  // Identity (deterministic ID from chart number)
  id: 'pt_' + normalizedChartNumber,  // or 'pt_' + randomId if no chart
  name: string,
  chartNumber: string,
  type: string,                        // e.g., 'adult', 'perio', 'peds'

  // Medical Profile
  medicalHx: string,
  medications: string,
  allergies: string,
  asaClass: string,                    // 'ASA I', 'ASA II', etc.
  perioStatus: string,                 // 'healthy', 'gingivitis', 'periodontitis'
  medicalAlerts: string,

  // Dental History
  dentalHx: string,
  txSummaryBU: string,                 // BU-specific treatment narrative
  txCompletedByMe: string,
  txPlan: string,
  recallHistory: string,
  activeStatus: string,

  // Scheduling
  lastVisit: string,                   // YYYY-MM-DD
  nextVisit: string,                   // YYYY-MM-DD
  nextVisitManual: boolean,            // true = user-set, false = auto-computed from appointments
  poeLast: string,
  poeNext: string,
  recallDue: string,

  // Imaging Dates
  lastFMX: string,
  lastBW: string,
  lastCBCT: string,
  lastPANO: string,

  // Clinical Intelligence (from webchat imports)
  clinicalBrief: {                     // Latest Claude-generated brief
    snapshot: string,
    diagnosesAndRisks: string,
    txStatus: string,
    txSequencing: string,
    flaggedConcerns: string,
    gradValue: string,
    nextVisitPlan: string,
    dateGenerated: string
  },
  briefHistory: [],                    // Max 3 prior briefs
  importedRequirements: [],            // [{reqId, description, procedure}]
  priorityNotes: string,
  highValue: boolean,

  // Status & Display
  reliability: 'green' | 'yellow' | 'red',
  status: 'active' | 'inactive',
  outstandingTasks: [],                // [{id, procedure, status}]
  needsXrays: boolean,
  xrayType: string,

  // Metadata
  notes: string,
  lastUpdated: string                  // ISO timestamp
}
```

### 3.2 Migration: `migrateToUnifiedPatientStore()`

**Trigger:** One-time, gated by localStorage flag `unifiedPatientStoreDone_v1`

**Algorithm:**
1. Read all entries from `clinicalData.patients{}`
2. For each entry, find matching `patientRecords{}` record by:
   a. Normalized chart number match (primary)
   b. Case-insensitive name match (fallback for chartless patients)
3. If match found: fill-merge `patients{}` fields into `patientRecords{}` record (never overwrite existing richer data)
4. If no match: create new `patientRecords{}` entry with deterministic ID (`pt_` + normalizedChart or `pt_` + generateId())
5. Copy all fields from `patients{}` schema into unified schema (map `medicalAlerts` → `medicalAlerts`, `outstandingTasks` → `outstandingTasks`, etc.)
6. **Set `clinicalData.patients = {}`** — keep as empty object for schema compatibility. Do NOT delete the field. `getDefaultRoadmapData()`, `isEmptyState()`, `mergeRemoteCollectionsIntoLocal()`, and `validateStateIntegrity()` all reference it. Add comment: `// DEPRECATED: unified into patientRecords. Kept for schema compatibility.`
7. Set localStorage flag
8. Call `saveData()`

**Safety:** Creates checkpoint before migration via `createCheckpoint('pre-unified-patient-migration')`

### 3.3 Unified Access Functions

```javascript
// READ — single entry point. Post-migration this is a simple read + default seeding.
// The old two-store merge is gone — there's only one store now.
function getPatientRecords() {
  if (!roadmapData.clinicalData.patientRecords) {
    roadmapData.clinicalData.patientRecords = {};
  }
  // Seed DEFAULT_PATIENT_RECORDS (19 pre-filled patients) if not present
  // Uses normalized chart matching to avoid duplicates
  return roadmapData.clinicalData.patientRecords;
}

// WRITE — single entry point for all field updates
function savePatientRecord(patientId, fields) {
  const existing = roadmapData.clinicalData.patientRecords[patientId] || {};
  roadmapData.clinicalData.patientRecords[patientId] = { ...existing, ...fields, lastUpdated: new Date().toISOString() };
  // Caller is responsible for propagateClinicalChanges() and saveData()
}

// DELETE — single cascade function (see Section 10)
function cascadeDeletePatient(patientId) { ... }
```

**Note:** `getAllPatientRecords()` is simplified post-migration. The complex two-store merge + dedup logic is no longer needed. The function handles only: read from `patientRecords{}` + seed defaults. All consumers updated to read from `patientRecords{}` directly — the 5-6 functions that currently read `clinicalData.patients{}` are updated in Phase 3.

### 3.4 All Consumer Updates

Every function that currently reads `clinicalData.patients{}` must be updated to read `patientRecords{}`:

| Function | File | Current Read | New Read |
|----------|------|-------------|----------|
| `renderPatientsList()` | clinical.js | `clinicalData.patients` | `getAllPatientRecords()` → becomes Active Roster |
| `savePatient()` | clinical.js | `clinicalData.patients[id]` | `savePatientRecord(id, fields)` |
| `deletePatient()` | clinical.js | `clinicalData.patients` | `cascadeDeletePatient(id)` |
| `completeAppointment()` | clinical.js | `clinicalData.patients[apt.patientId]` | `patientRecords[apt.patientId]` |
| `confirmClinicalImport()` | import-system.js | `clinicalData.patients` | RETIRED — uses `confirmUnifiedImport()` |
| `syncClinicalToMonthlyPlanner()` | import-system.js | `clinicalData.patients` | `patientRecords` |
| `backfillClinicalData()` | clinical.js | `clinicalData.patients` | `patientRecords` |

---

## 4. Competency Data Model (Preserved + Enhanced)

### 4.1 Current Model is Correct

Independent audit confirmed: all 13 categories, 116+ items, IDs, and required counts in `DEFAULT_COMPETENCIES` match `000-REQUIREMENTS.md` exactly. **No category restructuring. No ID changes. No item removal.**

The SRP category (`srp`) stays as its own category — NOT merged into perio. It's referenced in PROCEDURE_TYPES, buildCompetencyChecklist(), the webchat export format, and existing Firebase user data.

Group Practice stays as ONE category (`grouppractice`) with D3 and D4 items in separate sections — NOT split into `grouppractice4`.

### 4.2 Enhancement: New Item Fields (additive only)

```javascript
{
  id: string,                          // e.g., 'perio-form-prophy'
  text: string,                        // Display text
  required: number,                    // Count needed to complete
  completed: number,                   // Current count (0 in defaults)
  status: string,                      // 'pending' | 'planned' | 'in_progress' | 'completed'
  completionEntries: [],               // Evidence trail (existing)
  note: string,                        // Optional note

  // NEW FIELDS
  d3Deadline: string | null,           // 'May 2026', 'Oct 1, 2025', null if D4/cumulative
  unlockedBy: {                        // Formative prereq for summatives
    id: string,                        // ID of prerequisite item
    required: number                   // How many prereqs needed to unlock
  } | null,
  unlockEmailTo: string | null,        // 'gdadmin@bu.edu' or 'Dr. McManama' if email unlock required
  isSummative: boolean,                // true for summative items (counts toward 7 summatives milestone)
  rules: string | null,                // Critical rules text (e.g., "Must initiate in SPS BEFORE procedure")
  custom: boolean                      // true for user-added items
}
```

### 4.3 Existing 13 Categories (PRESERVED AS-IS)

| Key | Name | Icon | Color | Status |
|-----|------|------|-------|--------|
| `fixed` | Fixed Prosthodontics | 🦷 | #3b82f6 | Correct |
| `operative` | Operative Dentistry | 🔧 | #10b981 | Correct (12 items) |
| `dentures` | Complete Dentures | 🦴 | #8b5cf6 | Correct |
| `rpd` | Removable Partial Dentures | 🔩 | #f59e0b | Correct |
| `srp` | SRPs | 🩺 | #ef4444 | Correct — stays separate, NOT merged into perio |
| `endo` | Endodontics | 🔬 | #06b6d4 | Correct |
| `oralsurg` | Oral Surgery | 🏥 | #ec4899 | Correct |
| `peds` | Pediatric Dentistry | 👶 | #84cc16 | Correct |
| `perio` | Periodontology | 🦠 | #f472b6 | Correct |
| `grouppractice` | Group Practice | 👥 | #0ea5e9 | Correct (includes D3 GD 640 + D4 GD 642 sections) |
| `txplanning` | Treatment Planning (RS 545) | 📋 | #6366f1 | Correct |
| `geriatrics` | Geriatric Dental Medicine | 👴 | #8b5cf6 | Correct |
| `externship` | Externship & SPS | 🌴 | #059669 | Correct |

### 4.4 New Items (Additions Only)

4 clinical experience tracking items under `fixed` category (from 000-REQUIREMENTS.md lines 247-254, currently only in category notes as prose):

| ID | Text | Required | Section |
|----|------|----------|---------|
| `fixed-units` | Minimum clinical units (start to completion) | 10 | Clinical Experience |
| `fixed-fpd` | Must include 1 FPD | 1 | Clinical Experience |
| `fixed-implant` | Must include 1 Implant-Supported Crown | 1 | Clinical Experience |
| `fixed-cerec` | Must include minimum 3 CEREC restorations | 3 | Clinical Experience |

These are ADDITIONS, not gap fixes. Added to a new section within the existing `fixed` category.

### 4.5 Unlock Chains (NEW)

Formative→summative dependencies from 000-REQUIREMENTS.md:

| Formative Prereq | Required Count | Unlocks |
|------------------|---------------|---------|
| `perio-form-ohi` | 2 | `perio-sum-hci` |
| `perio-form-prophy` | 5 | `perio-sum-prophy` |
| `perio-form-quad` | 3 | `perio-sum-calc` |
| `perio-form-reeval-ging` | 3 | `perio-sum-reeval-ging` |
| `perio-form-reeval-srp` | 1 | `perio-sum-reeval-srp` |
| `perio-form-impr` | 3 | `perio-sum-impr` |
| `perio-form-recall` | 6 | `perio-sum-recall` |
| `perio-form-dx` | 4 | `perio-sum-dx` |
| `op-formatives` | 20 | All operative summatives (+ McManama approval) |
| `fixed-form-*` (all 4) | 6 each | All fixed summatives (+ gdadmin email) |
| `cd-form-*` (all 7) | varies | All CD summatives (+ gdadmin email) |

UI renders advisory on summatives: "⚠️ X formatives not yet recorded for [prereq] (Y/Z done)" — this is ADVISORY ONLY, not a hard block. Students may complete formatives outside the app's tracking. The system still allows linking/recording summatives even if formative prereqs show incomplete.

### 4.6 Three Milestone Trackers (NEW)

Top-level counters displayed in Competencies hero dashboard:

```javascript
MILESTONES = {
  attendedAppointments: { target: 90, source: 'getSmartAppointmentCount()' },
  completedProcedures: { target: 116, source: 'getSmartProcedureCount()' },
  summativesPassed: { target: 7, source: 'computed from items where isSummative && completed >= required' }
}
```

### 4.7 D3 Hard Deadline Checklist (NEW)

28 items with `d3Deadline` field set. Competencies tab shows these in a dedicated "D3 Deadlines" alert bar sorted by urgency. Items past deadline shown in red.

### 4.8 Migration: Competency Enhancement Fields

No category restructuring or ID changes needed. Migration adds new fields to EXISTING items:

1. Existing `completionEntries`, `completed`, `status`, `note` fully preserved
2. New fields (`d3Deadline`, `unlockedBy`, `isSummative`, `rules`, `unlockEmailTo`) added with defaults (`null`/`false`) to existing items
3. 4 new `fixed-*` clinical experience items added to `fixed` category with `completed: 0`
4. New fields must be added to ALL 6 merge/restore sites per CLAUDE.md rules: `mergeRemoteState`, `loadFromLocalStorage`, `restoreCheckpoint`, `importAndRestoreDirectly`, `restoreBackup`, `importBackup`
5. Gated by localStorage flag `competencyEnhancementsDone_v1`

### 4.9 Dream-Bigger Enhancements

**Faculty constraint tracking:** Operative requires max 4 summatives with same faculty. When recording a procedure, track which faculty signed off which competency items. Warn at 3/4: "3 of your operative summatives were with Dr. X. Next must be different faculty."

**Per-category completion forecasting:** Not just overall pace, but per-category projections using scheduled patients + historical completion rate: "Fixed: on pace for Nov 2026. Perio: behind pace, projected Feb 2027 unless 2/week."

**Smart scheduling suggestions:** "You need 3 more SRP summatives. Kisha Williams and Carmen Murillo are periodontitis patients with appointments this month — prioritize SRP with them." Cross-references importedRequirements + upcoming appointments + outstanding items.

---

## 5. Unified Import Pipeline

### 5.1 Architecture

```
[Patients Tab "Import" Button]   [Clinical Tab "Import" Button]
         │                                │
         └────────────┬───────────────────┘
                      ▼
           openUnifiedImportModal()
                      │
                      ▼
           parsePatientImportText()        ← EXISTING parser (patients.js)
                      │                       Handles all 9 block types
                      ▼
           previewUnifiedImport()          ← EXISTING preview (patients.js)
                      │                       Color-coded block previews
                      ▼
           confirmUnifiedImport()          ← ENHANCED (was confirmPatientImport)
                      │
    ┌─────────────────┼──────────────────────────────┐
    ▼                 ▼                              ▼
patientRecords{}   appointments{}            competencies{}
    │                 │                              │
    │                 ├─ auto-complete past           ├─ applyRequirementCheckoffs()
    │                 ├─ auto-create procedures       ├─ smart auto-link
    │                 └─ smart auto-link              └─ unlock chain checks
    │
    └─ importedRequirements, clinicalBrief, priorityNotes, highValue
                      │
                      ▼
           propagateClinicalChanges({
             appointments: true,
             procedures: true,
             competencies: true,
             patients: true
           })
```

### 5.2 Block Type Handling (all 9 preserved)

| Block | Parser | Data Target | Propagation |
|-------|--------|-------------|-------------|
| PATIENT_RECORD | `parsePatientRecord()` | `patientRecords{}` (create/update) | patients |
| PATIENT_UPDATE | `parsePatientUpdate()` | `patientRecords{}` (merge, NOTES_APPEND) | patients |
| REQUIREMENTS_MATCH | `parseRequirementsMatch()` | `patientRecords[].importedRequirements` + competencies via `applyRequirementCheckoffs()` | patients, competencies |
| REQUIREMENTS_STATUS | `parseRequirementsStatus()` | competencies via `applyRequirementCheckoffs()` | competencies |
| APPOINTMENTS | `parseImportAppointmentBlock()` | `appointments{}` + auto-procedure + smart auto-link | appointments, procedures, competencies |
| SPS_DASHBOARD_UPDATE | `parseDashboardUpdate()` | `dashboardSnapshots[]` | (dashboard re-render) |
| MISSING_NOTES | `parseMissingNotesBlock()` | `missingNotes{}` | (dashboard re-render) |
| TODO_LIST | `parseTodoListBlock()` | `todoList.items{}` | (dashboard re-render) |
| CLINICAL_BRIEF | `parseClinicalBrief()` | `patientRecords[].clinicalBrief` | patients |

### 5.3 Bug Fix: Empty REQUIREMENTS_MATCH (NEW ISSUE 1)

Current: If `canFulfill` and `completedToday` are both empty, entire block is discarded.

Fix: Always store `priorityNotes`, `highValue`, and `importedRequirements: []` on the patient record, even when match arrays are empty. The metadata has independent value.

```javascript
// In confirmUnifiedImport(), REQUIREMENTS_MATCH handling:
if (rm.chartNumber || rm.name) {
  const patient = findPatientByChartOrName(rm.chartNumber, rm.name);
  if (patient) {
    // ALWAYS store metadata, even if canFulfill is empty
    patient.importedRequirements = rm.canFulfill || [];
    if (rm.priorityNotes) patient.priorityNotes = rm.priorityNotes;
    if (rm.highValue !== undefined) patient.highValue = rm.highValue;
  }
}
// THEN process completedToday and canFulfill for competency updates
```

### 5.4 Bug Fix: reqId Case Normalization (NEW ISSUE 2)

All reqId normalization at parse time:

```javascript
// In parseRequirementsMatch(), both inline and continuation paths:
reqId = reqId.toLowerCase().trim();
```

Applies to: `parseRequirementsMatch()`, `parseRequirementsStatus()`, `applyRequirementCheckoffs()`, `computeRequirementMatches()`, `isRequirementOutstanding()`, `getRequirementInfo()`

### 5.5 Retirement of `confirmClinicalImport()`

`import-system.js` `confirmClinicalImport()` is retired. The Clinical tab's import button calls `openUnifiedImportModal()` (same modal as Patients tab). The modal auto-detects content — if it's appointment-only text, it shows appointment preview first. If it's a full multi-block paste, it shows all blocks.

`import-system.js` retains: `syncClinicalToMonthlyPlanner()`, `calculateEndTime()`, `timeToMinutes()`, lecture import functions (separate workflow).

### 5.6 Webchat Format Compatibility

Zero changes to export format:
- Same `---` delimiters
- Same field names (NAME, CHART, DATE, PATIENT, PROCEDURE, etc.)
- Same pipe-delimited formats
- Same code fence wrapping
- Same chart number dedup key
- All 9 block types accepted in any order in a single paste

New requirement IDs (from 000-REQUIREMENTS.md) are additive — existing IDs preserved, new IDs available for webchat reference immediately.

---

## 6. Smart Auto-Link Engine

### 6.1 Purpose

When a procedure is created from any source (appointment completion, import, manual), automatically match it to competency items using keyword patterns — eliminating the need for manual checkbox selection for obvious matches.

### 6.2 Function: `autoLinkProcedureToCompetencies(procedure)`

```javascript
function autoLinkProcedureToCompetencies(procedure) {
  // Step 1: If procedure already has competencyItemIds[], use those (manual override)
  if (procedure.competencyItemIds && procedure.competencyItemIds.length > 0) {
    return linkProcedureToCompetencies(procedure); // existing function
  }

  // Step 2: Match by procedureType → category
  const categoryKey = procedure.procedureType;
  const competencies = getCompetenciesData();

  // Step 3: Keyword matching against procedure text
  const procedureText = (procedure.procedure || '').toLowerCase();
  const matches = matchProcedureToCompetencies(procedureText, categoryKey, competencies);

  // Step 4: Filter to items with remaining > 0
  const actionable = matches.filter(m => {
    const item = m.item;
    return item.completed < item.required;
  });

  // Step 5: Check unlock chains
  const unlocked = actionable.filter(m => isItemUnlocked(m.item, competencies));

  // Step 6: Separate by confidence
  const highConfidence = unlocked.filter(m => m.confidence === 'high');
  const lowConfidence = unlocked.filter(m => m.confidence === 'low');

  // Auto-link high confidence matches
  if (highConfidence.length > 0) {
    procedure.competencyItemIds = highConfidence.map(m => m.item.id);
    procedure.autoLinked = true;
    linkProcedureToCompetencies(procedure);
    showAutoLinkToast(highConfidence, procedure.id);
  }

  // Queue low confidence for review
  if (lowConfidence.length > 0) {
    addToReviewQueue(procedure.id, lowConfidence);
  }
}
```

### 6.3 Keyword Pattern Table (expanded from `computeRequirementMatches`)

| Keywords | Matched Competency IDs | Confidence |
|----------|----------------------|------------|
| crown, prep, FPD, bridge, PFM, e.max | fixed-form-prep, fixed-sum-prep, fixed-form-prov, fixed-sum-temp | high |
| cementation, cement, seat | fixed-form-cement, fixed-sum-cement | high |
| final impression, PVS, digital scan | fixed-form-impr, fixed-sum-impr | high |
| CEREC, same-day | fixed-cerec | high |
| class v, cl 5 | op-class5-1, op-class5-2 | high |
| composite, DO, MO, MOD, class II, class III, class IV | op-multi-1-6 | high |
| SRP, scaling, root planing, quadrant | perio-form-quad, perio-sum-calc | high |
| prophy, prophylaxis, cleaning | perio-form-prophy, perio-sum-prophy | high |
| OHI, oral hygiene instruction, home care | perio-form-ohi, perio-sum-hci | high |
| re-eval, re-evaluation, gingivitis | perio-form-reeval-ging, perio-sum-reeval-ging | high |
| recall, maintenance | perio-form-recall, perio-sum-recall | high |
| RCT, root canal, endo | endo-rct-1, endo-rct-2 | high |
| pulpectomy, pulp | endo-pulp-1, endo-pulp-2 | high |
| extraction, ext #, surgical extraction | os-extract-1, os-extract-2 | high |
| denture, CU/CL, complete denture | cd-form-prelim through cd-sum-adjust | medium |
| RPD, partial denture, flexible | rpd-track1, rpd-track2, rpd-track3 | medium |
| implant crown, implant supported | fixed-implant | high |
| overdenture, implant denture | cd-over-dup, cd-over-abut | medium |
| sealant | peds-sealants | high |
| written analysis, WA | gp-form-analysis, gp-sum-analysis | high |
| OHRA | tx-ohra | high |

Medium confidence items go to review queue. High confidence auto-links with undo toast.

### 6.4 Review Queue

```javascript
roadmapData.clinicalData.autoLinkReviewQueue = [
  {
    procedureId: string,
    procedureName: string,
    date: string,
    suggestedItems: [{ itemId, itemText, category, confidence }],
    createdAt: string
  }
];
```

Displayed on Competencies tab: "🔍 X procedures need competency review" badge. User can accept/reject/modify each suggestion.

### 6.5 Confirmation via Review Queue (not timed undo)

Auto-linked procedures show a brief info toast:
```
"Auto-linked: Crown Prep → Fixed Formatives (3/6). Review on Competencies tab."
```

All auto-linked items are added to the review queue (`autoLinkReviewQueue[]`). The Competencies tab shows a persistent "X procedures auto-linked — Review" banner where the user can accept, reject, or modify each suggestion at their leisure. No time pressure, no lost undo windows.

### 6.6 Integration Points

`autoLinkProcedureToCompetencies()` called from:
1. `completeAppointment()` → auto-created procedure from appointment text
2. `confirmUnifiedImport()` → past appointments auto-completed with procedures
3. `saveProcedureRecord()` → when user doesn't manually check any boxes (fallback to auto-link)
4. `recordProcedure()` → when `competencyItemIds` is empty

### 6.7 Patient Context Priority

If patient has `importedRequirements[]`, those take priority over keyword matching:
```javascript
function matchProcedureToCompetencies(text, categoryKey, competencies, patientId) {
  const patient = patientRecords[patientId];
  if (patient?.importedRequirements?.length > 0) {
    // Use imported requirements as authoritative match source
    return patient.importedRequirements
      .filter(req => isRequirementOutstanding(req.reqId))
      .map(req => ({ item: findCompetencyItem(req.reqId), confidence: 'high' }))
      .filter(m => m.item);
  }
  // Fallback to keyword matching
  return keywordMatch(text, categoryKey, competencies);
}
```

---

## 7. Clinical Tab Redesign

### 7.1 Sub-Tab Structure (3 sub-tabs, down from 4)

```
[Active Roster] [Appointments] [Procedures]
```

Competencies removed — promoted to top-level tab (Section 8).

### 7.2 Active Roster Sub-Tab (replaces "My Patients")

**Purpose:** Lightweight clinical quick-reference. Not a patient CRUD — that lives on Patients tab.

**Data source:** `getAllPatientRecords()` (unified store)

**Grouping:**
- **This Week:** Patients with appointments in current Mon-Sun window
- **This Month:** Patients with appointments in current calendar month
- **Recent:** Patients seen in last 30 days (by `lastVisit`)

**Per-row display:**
- Reliability dot (green/yellow/red)
- Patient name + chart number
- Next appointment date + procedure
- Last visit date
- Outstanding tasks count badge
- Quick actions: "Schedule Apt" | "View Record →" (navigates to Patients tab)

**No CRUD:** Cannot add, edit, or delete patients from here. All patient management goes through Patients tab. Active Roster is read-only with navigation links.

### 7.3 Appointments Sub-Tab (enhanced)

Existing CRUD preserved with these changes:

**`saveAppointment()` changes:**
- Writes appointment with patientId referencing unified `patientRecords{}` store
- Calls `propagateClinicalChanges({ appointments: true })`

**`completeAppointment()` redesigned:**
1. Set `apt.status = 'completed'`, record `completedAt` timestamp
2. Update `patientRecords[apt.patientId].lastVisit`
3. **Auto-create procedure record** from `apt.procedures` text (NEW):
   ```javascript
   const proc = recordProcedure({
     patientId: apt.patientId,
     patientName: getPatientName(apt.patientId),
     appointmentId: apt.id,
     date: apt.date,
     procedureType: inferProcedureType(apt.procedures),
     procedure: apt.procedures,
     competencyItemIds: [],  // empty — auto-link will fill
     notes: 'Auto-created from appointment completion'
   });
   ```
4. **Smart auto-link fires** on the created procedure (NEW):
   ```javascript
   autoLinkProcedureToCompetencies(proc);
   ```
5. Mark deadline done: `markLinkedDeadlineDone(apt.id)`
6. Mark planner task done: `markPlannerTaskDone(apt.id)`
7. Full propagation: `propagateClinicalChanges({ appointments: true, procedures: true, competencies: true })`
8. Show toast with auto-link results + "Edit" button to open procedure modal for detailed recording

**User can still open standalone procedure modal** if they want to add details, change procedure type, or manually select different competency items. The auto-created procedure is a starting point, not the final word.

**`deleteAppointment()` changes:**
- Calls `cascadeDeleteAppointment(aptId)` (shared function)

### 7.4 Procedures Sub-Tab (enhanced)

Existing CRUD preserved with these changes:

**New: "Unlinked" filter**
- Toggle showing procedures with empty `competencyItemIds[]` (orphaned from competencies)
- Quick-action "Auto-Link" button per procedure → runs `autoLinkProcedureToCompetencies()`

**`buildCompetencyChecklist()` enhanced:**
- Shows unlock status: locked items grayed out with "🔒 Requires X more [formative]"
- High-confidence auto-suggestions pre-checked (user can uncheck)
- Sorted by relevance to procedure type

**`saveProcedureRecord()` changes:**
- If no competency items manually checked, falls back to `autoLinkProcedureToCompetencies()`
- Calls `propagateClinicalChanges({ procedures: true, competencies: true })`

### 7.5 Import Button

Clinical tab's import button calls `openUnifiedImportModal()` — same modal, same parser, same propagation as Patients tab. The separate `confirmClinicalImport()` pathway is retired.

---

## 8. Competencies Tab (Promoted to Top-Level)

### 8.1 Tab Position

Promoted to main nav bar as a peer tab. Tab ID: `#tab-competencies`. `switchTab('competencies')` triggers `renderCompetencies()`.

Nav order: Mission Control | Patients | **Competencies** | Clinical | Schedule | Academics | Grad Prep

### 8.2 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  HERO DASHBOARD                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 52/90    │  │ 78/116   │  │ 4/7      │  Overall: 67%    │
│  │ Appts    │  │ Procs    │  │ Summats  │  [progress ring]  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                             │
│  Pace: 2.3 items/week needed │ On track for Dec 2026       │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ D3 DEADLINES (items due by May 2026)                   │
│  [deadline cards with countdown badges]                     │
├─────────────────────────────────────────────────────────────┤
│  🎯 WHAT'S NEXT (top 5 recommended items)                  │
│  [action cards with one-click record buttons]               │
├─────────────────────────────────────────────────────────────┤
│  🔍 3 procedures need competency review [Review Now]        │
├─────────────────────────────────────────────────────────────┤
│  CATEGORY CARDS (13 categories, expandable)                 │
│  [Each with unlock chain visualization + item details]      │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Milestone Dashboard

Three large progress rings at top:
- **Attended Appointments:** `getSmartAppointmentCount().total` / 90
- **Completed Procedures:** `getSmartProcedureCount().total` / 116
- **Summatives Passed:** computed from `items.filter(i => i.isSummative && i.completed >= i.required).length` / 7

Overall graduation readiness percentage (weighted across all categories).

Pace projection: `(totalRemaining) / (weeksUntilGraduation)` items/week needed. Color-coded: green ≤2/week, yellow ≤4/week, red >4/week.

### 8.4 D3 Deadline Alert Bar

Items with `d3Deadline` field, sorted by date ascending:
- Past deadline: red background, "⚠️ OVERDUE"
- <30 days: red text, countdown badge
- <90 days: yellow text, countdown badge
- >90 days: green text

Each shows: item name, category badge, deadline date, completion status.

### 8.5 What's Next Panel (unhidden)

`getWhatsNextItems()` already exists — remove CSS `display:none` on `.comp-whats-next`.

Shows top 5 items sorted by:
1. Items closest to completion (highest completed/required ratio)
2. Items with scheduled patients (cross-reference appointments)
3. D3 deadline urgency

Each card: category color dot, item name, progress "3/6", "Record Procedure" quick-action button.

### 8.6 Review Queue Panel

Shows `autoLinkReviewQueue[]` items:
- Procedure name + date + patient
- Suggested competency items with Accept/Reject per suggestion
- "Accept All" / "Dismiss" bulk actions

### 8.7 Unlock Chain Visualization

Per category, before the item list:
```
[████████░░] 3/5 Prophy Formatives  →  🔒 Prophy Summatives (0/3)
[██████████] 5/5 Prophy Formatives  →  🔓 Prophy Summatives (1/3)
```

Visual arrow connecting formative bar to summative bar. Locked summatives grayed out. Unlocked summatives show normal progress.

### 8.8 Per-Item Evidence Trail (full, not truncated)

Each completion entry displayed as a mini-card:
- Type badge: 🔗 Procedure (blue) | ✋ Manual (gray) | 📥 Import (purple) | 🔄 Backfill (amber) | 🤖 Auto-linked (teal)
- Patient name (clickable → navigates to Patients tab)
- Full procedure description (not truncated)
- Date + faculty (if recorded)
- "Remove" button with undo

### 8.9 "Which Patients Can Fulfill This?" Badge

For items with remaining > 0, cross-reference `patientRecords[].importedRequirements`:
```
"🏥 3 patients can fulfill this" [expand]
  → Carmen Murillo (next apt: Apr 5)
  → Anabely Gil (next apt: Apr 12)
  → Kisha Williams (no appointment scheduled)
```

Click patient name → navigate to Patients tab. "Schedule" quick-action if no appointment.

### 8.10 Critical Rules Display

Per-category collapsible notes section showing rules from 000-REQUIREMENTS.md:
- Perio: "All periodontal summative exams must be initiated on SPS PRIOR to the start of the examination."
- Operative: "Max 4 summatives with same faculty."
- Fixed: "Must email full image of Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives."
- RPD: "Flexible/interim RPD must have ≥2 clasps AND replace ≥3 teeth."
- Group Practice grade breakdown: "Formatives 25%, Summatives 65%, Communications 10%"

---

## 9. Propagation Architecture

### 9.1 Single Propagation Function

```javascript
function propagateClinicalChanges({
  appointments = false,
  procedures = false,
  competencies = false,
  patients = false,
  source = ''
}) {
  // Set dirty flag for planner sync
  clinicalDataDirty = true;

  // Appointment-triggered updates
  if (appointments) {
    if (typeof syncClinicalToMonthlyPlanner === 'function') syncClinicalToMonthlyPlanner();
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
    if (typeof rebuildUpcomingDeadlines === 'function') rebuildUpcomingDeadlines();
  }

  // Competency/procedure updates
  if (procedures || competencies) {
    if (typeof renderCompetencies === 'function') renderCompetencies();
  }

  // Patient updates
  if (patients) {
    if (typeof renderPatientsSidebar === 'function') renderPatientsSidebar();
    if (typeof renderCountdownRadar === 'function') renderCountdownRadar();
  }

  // Always refresh global views
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof mpRenderAllCalendars === 'function') mpRenderAllCalendars();

  // NOTE: Does NOT call saveData(). Caller controls save timing.
  // This is critical for batch operations (e.g., confirmUnifiedImport)
  // that do multiple mutations and want one save at the end.
  // Caller pattern:
  //   propagateClinicalChanges({ appointments: true });
  //   saveData();  // caller decides when
}
```

### 9.2 Caller Map

| Function | propagateClinicalChanges() args |
|----------|-------------------------------|
| `savePatientRecord()` | `{ patients: true }` |
| `cascadeDeletePatient()` | `{ appointments: true, procedures: true, competencies: true, patients: true }` |
| `saveAppointment()` | `{ appointments: true }` |
| `cascadeDeleteAppointment()` | `{ appointments: true, procedures: true, competencies: true }` |
| `completeAppointment()` | `{ appointments: true, procedures: true, competencies: true }` |
| `cascadeUncompleteAppointment()` | `{ appointments: true, procedures: true, competencies: true }` |
| `recordProcedure()` / `saveProcedureRecord()` | `{ procedures: true, competencies: true }` |
| `cascadeDeleteProcedure()` | `{ procedures: true, competencies: true }` |
| `adjustCompItem()` | `{ competencies: true }` |
| `setCompItemStatus()` | `{ competencies: true }` |
| `confirmUnifiedImport()` | `{ appointments: true, procedures: true, competencies: true, patients: true }` |
| `backfillClinicalData()` | `{ appointments: true, procedures: true, competencies: true, patients: true }` |

---

## 10. Cascade Operations (Symmetric)

### 10.1 `cascadeDeletePatient(patientId)`

```javascript
function cascadeDeletePatient(patientId) {
  // 1. Find all appointments for patient
  const apts = getValues(roadmapData.clinicalData.appointments)
    .filter(a => a.patientId === patientId);

  // 2. For each appointment: cascade delete
  apts.forEach(apt => {
    // Find + delete linked procedures
    const procs = getValues(roadmapData.clinicalData.completedProcedures)
      .filter(p => p.appointmentId === apt.id);
    procs.forEach(p => {
      unlinkProcedureFromCompetencies(p.id);
      delete roadmapData.clinicalData.completedProcedures[p.id];
    });
    // Hide planner task
    roadmapData.monthlyPlanner.hiddenClinicTasks['clinic_' + apt.id] = true;
    delete roadmapData.monthlyPlanner.customTasks['clinic_' + apt.id];
    // Delete appointment
    delete roadmapData.clinicalData.appointments[apt.id];
  });

  // 3. Find orphaned procedures (by patientId, no appointment match)
  const orphanedProcs = getValues(roadmapData.clinicalData.completedProcedures)
    .filter(p => p.patientId === patientId);
  orphanedProcs.forEach(p => {
    unlinkProcedureFromCompetencies(p.id);
    delete roadmapData.clinicalData.completedProcedures[p.id];
  });

  // 4. Delete patient record
  delete roadmapData.clinicalData.patientRecords[patientId];

  // 5. Remove from review queue
  if (roadmapData.clinicalData.autoLinkReviewQueue) {
    roadmapData.clinicalData.autoLinkReviewQueue =
      roadmapData.clinicalData.autoLinkReviewQueue.filter(q => q.patientId !== patientId);
  }

  // 6. Propagate
  propagateClinicalChanges({
    appointments: true, procedures: true,
    competencies: true, patients: true,
    source: 'cascadeDeletePatient'
  });
}
```

### 10.2 `cascadeDeleteAppointment(aptId)`

```javascript
function cascadeDeleteAppointment(aptId) {
  const apt = roadmapData.clinicalData.appointments[aptId];
  if (!apt) return;

  // 1. Find + delete linked procedures
  getValues(roadmapData.clinicalData.completedProcedures)
    .filter(p => p.appointmentId === aptId)
    .forEach(p => {
      unlinkProcedureFromCompetencies(p.id);
      delete roadmapData.clinicalData.completedProcedures[p.id];
    });

  // 2. Hide planner task
  roadmapData.monthlyPlanner.hiddenClinicTasks['clinic_' + aptId] = true;
  delete roadmapData.monthlyPlanner.customTasks['clinic_' + aptId];

  // 3. Delete appointment
  delete roadmapData.clinicalData.appointments[aptId];

  // 4. Recalculate patient lastVisit
  if (apt.patientId) {
    recalculatePatientLastVisit(apt.patientId);
  }

  // 5. Propagate
  propagateClinicalChanges({
    appointments: true, procedures: true, competencies: true,
    source: 'cascadeDeleteAppointment'
  });
}
```

### 10.3 `cascadeDeleteProcedure(procId)`

```javascript
function cascadeDeleteProcedure(procId) {
  unlinkProcedureFromCompetencies(procId);
  delete roadmapData.clinicalData.completedProcedures[procId];
  propagateClinicalChanges({
    procedures: true, competencies: true,
    source: 'cascadeDeleteProcedure'
  });
}
```

### 10.4 `cascadeUncompleteAppointment(aptId)`

```javascript
function cascadeUncompleteAppointment(aptId) {
  const apt = roadmapData.clinicalData.appointments[aptId];
  if (!apt) return;

  // 1. Reset status
  apt.status = 'scheduled';
  delete apt.completedAt;

  // 2. Find + cascade delete all procedures for this appointment
  getValues(roadmapData.clinicalData.completedProcedures)
    .filter(p => p.appointmentId === aptId)
    .forEach(p => {
      unlinkProcedureFromCompetencies(p.id);
      delete roadmapData.clinicalData.completedProcedures[p.id];
    });

  // 3. Unmark deadline + planner task
  unmarkLinkedDeadlineDone(aptId);
  unmarkPlannerTaskDone(aptId);

  // 4. Recalculate patient lastVisit
  if (apt.patientId) {
    recalculatePatientLastVisit(apt.patientId);
  }

  // 5. Propagate
  propagateClinicalChanges({
    appointments: true, procedures: true, competencies: true,
    source: 'cascadeUncompleteAppointment'
  });
}
```

---

## 11. Bug Fix: txSummaryBU in PR Writeups (NEW ISSUE 3)

In `periodic-review.js`, `renderPRPatientWriteups()`:

Add `txSummaryBU` as its own section between `dentalHx` and `txCompletedByMe`:

```javascript
// After dentalHx section:
if (patient.txSummaryBU) {
  html += '<div class="pr-field"><span class="pr-field-label">Treatment at BU:</span> ';
  html += escapeHtml(patient.txSummaryBU);
  html += '</div>';
}
```

Also add to `parsePatientRecord()` / `parsePatientUpdate()` fieldMap if not already present (confirmed in CLAUDE.md that ALLERGIES, TX_COMPLETED_BY_ME, RECALL_HISTORY, ACTIVE_STATUS were already added — verify TX_SUMMARY_BU is in the map).

---

## 12. Firebase Sync Updates

### 12.1 `mergeRemoteCollectionsIntoLocal()` Changes

Remove `clinicalData.patients` merge (store retired). Add:
- `clinicalData.autoLinkReviewQueue` — addMissing
- Ensure `patientRecords` deep-merge covers new fields: `asaClass`, `perioStatus`, `outstandingTasks`, `medicalAlerts`

### 12.2 `isEmptyState()` Changes

Remove `clinicalData.patients` check (retired). Verify `patientRecords` check covers the unified store.

### 12.3 `validateStateIntegrity()` (Guard F) Changes

Add validation for `autoLinkReviewQueue` (array, not corrupted).

### 12.4 All 4 Merge/Restore Sites

`mergeRemoteState`, `loadFromLocalStorage`, `restoreCheckpoint`, `importAndRestoreDirectly` — all must handle:
- Missing `clinicalData.patients` gracefully (post-migration)
- New `autoLinkReviewQueue` field
- New competency item fields (`d3Deadline`, `unlockedBy`, `isSummative`, `rules`, `unlockEmailTo`)

---

## 13. Implementation Phases

### Phase 1: Data Foundation (must complete before anything else)
1. Build `migrateToUnifiedPatientStore()` with checkpoint safety
2. Build shared cascade functions (`cascadeDeletePatient`, `cascadeDeleteAppointment`, `cascadeDeleteProcedure`, `cascadeUncompleteAppointment`) in state.js
3. Build `propagateClinicalChanges()` in state.js (re-render only, caller controls save)
4. Build `autoLinkProcedureToCompetencies()` + expanded keyword patterns + review queue
5. Add enhancement fields (`d3Deadline`, `unlockedBy`, `isSummative`) to existing DEFAULT_COMPETENCIES items (no restructuring)
6. Add 4 new `fixed-*` clinical experience items to DEFAULT_COMPETENCIES
7. Update all 6 merge/restore sites for unified store + new competency fields
8. Update `isEmptyState()` and `validateStateIntegrity()` for schema changes

### Phase 2: Import Pipeline Unification
9. Enhance `confirmPatientImport()` → `confirmUnifiedImport()` with full propagation
10. Fix empty REQUIREMENTS_MATCH bug (NEW ISSUE 1)
11. Fix reqId case normalization (NEW ISSUE 2)
12. Wire auto-link into appointment import path
13. Add `openUnifiedImportModal()` as shared entry point
14. Retire `confirmClinicalImport()` — Clinical tab import calls unified modal

### Phase 3: Clinical Tab Redesign
15. Replace "My Patients" sub-tab with Active Roster
16. Remove Competencies sub-tab from Clinical (promoted)
17. Redesign `completeAppointment()` with auto-procedure + auto-link
18. Wire all Clinical CRUD to shared cascade functions
19. Wire all Clinical CRUD to `propagateClinicalChanges()`
20. Fix txSummaryBU in PR writeups (NEW ISSUE 3)

### Phase 4: Competencies Tab Promotion
21. Add to main nav bar, update `switchTab()` routing
22. Build milestone dashboard (3 progress rings + pace projection)
23. Build D3 deadline alert bar
24. Unhide "What's Next" section with enhanced sorting
25. Build review queue UI
26. Build unlock chain visualization
27. Build full evidence trail (not truncated)
28. Build "Which patients can fulfill this?" badges
29. Add critical rules display per category

### Phase 5: Integration & Verification
30. End-to-end: Paste 9-block import via Patients tab → verify all stores updated
31. End-to-end: Paste appointments via Clinical tab → verify same pipeline, competencies updated
32. End-to-end: Complete appointment → verify auto-procedure + auto-link + competency update
33. End-to-end: Delete patient from Patients tab → verify full cascade across all stores
34. End-to-end: Delete patient from Clinical tab → verify same cascade (shared function)
35. End-to-end: Smart auto-link → verify high-confidence auto-links, low-confidence queued
36. End-to-end: Unlock chain → verify locked summatives can't be linked until formatives met
37. Cross-device: Firebase sync → verify unified store merges correctly, no dual-store artifacts
38. Cache-busting: Update all `<script src>` tags with `?v=20260330`

---

## 14. Files Modified

| File | Changes |
|------|---------|
| `js/graduation-roadmap/state.js` | `propagateClinicalChanges()`, cascade functions, `autoLinkProcedureToCompetencies()`, `matchProcedureToCompetencies()`, migration functions, `isItemUnlocked()`, milestone computation |
| `js/graduation-roadmap/clinical.js` | `DEFAULT_COMPETENCIES` rebuilt, Active Roster rendering, `completeAppointment()` redesigned, `buildCompetencyChecklist()` unlock-aware, Competencies sub-tab removed |
| `js/graduation-roadmap/patients.js` | `confirmUnifiedImport()` (enhanced), `openUnifiedImportModal()` (shared), bug fixes (ISSUE 1, 2), `parseRequirementsMatch()` normalization |
| `js/graduation-roadmap/import-system.js` | `confirmClinicalImport()` retired, Clinical import button rewired |
| `js/graduation-roadmap/init.js` | Dashboard milestone widgets, tab routing for promoted Competencies |
| `js/graduation-roadmap/periodic-review.js` | txSummaryBU in PR writeups (ISSUE 3) |
| `js/graduation-roadmap/firebase-sync.js` | Merge/restore sites updated for unified store + new fields |
| `graduation-roadmap.html` | Nav bar updated (Competencies promoted), Active Roster HTML, CSS for unlock chains + milestones + review queue |

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Migration wipes patient data | Checkpoint created before migration. One-time flag prevents re-run. |
| Competency ID remapping breaks evidence | `migrateCompetencyIds()` updates both item IDs and completionEntries references |
| Auto-link creates false positives | Confidence levels + review queue. High confidence only auto-links. Undo available. |
| Dual-store references in Firebase from other devices | `mergeRemoteCollectionsIntoLocal()` handles missing `clinicalData.patients` gracefully post-migration. Other devices get migration on next load. |
| Breaking webchat export format | Zero format changes. Same delimiters, field names, block types. |
| `confirmClinicalImport()` callers break | Search all files for callers, rewire to `confirmUnifiedImport()` |
| Unlock chains too restrictive | Unlock is visual guidance only — manual override still possible via adjustCompItem() |
