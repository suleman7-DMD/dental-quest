# Graduation Roadmap: Cross-Tab Clinical Data Sync & Smart Dashboard

**Date:** 2026-03-21
**Status:** Approved
**Scope:** graduation-roadmap.html + js/graduation-roadmap/*.js (11 modules)

## Problem

Mission Control shows 0/90 appointments and 0/116 procedures despite clinical data existing across other tabs. Five data islands (patients, patientRecords, appointments, completedProcedures, competencies) are disconnected. The only way to get counts is a manual 5-step cascade that the user never follows.

## Solution Overview

### Phase 1: Smart Dashboard Counters
**File:** init.js — `renderDashboard()`

Replace narrow counting logic with multi-source aggregation:

**Appointments counter** aggregates:
- `clinicalData.appointments` with `status === 'completed'`
- Unique patient visits from `clinicalData.patients[].lastVisit` (patients visited but no formal appointment record)
- Completed clinic tasks from `monthlyPlanner.completedTasks` with `clinic_` prefix

**Procedures counter** aggregates:
- `clinicalData.completedProcedures` count
- Sum of all competency `item.completed` values (deduped against procedure-linked entries)
- Import-derived procedure counts

Add to dashboard:
- Pace projection sparkline ("At current pace, hit target by [date]")
- Graduation readiness percentage (weighted competency completion)
- Alerts row (competency gaps, recalls due, appointments needing completion)
- Quick action buttons (complete appointment, record procedure, mark competency)

### Phase 2: Data Backfill Engine
**File:** clinical.js — new `backfillClinicalData()`

On-demand function (triggered from Mission Control or auto on first load):
- Scan competency items with `completed > 0` but no `completionEntries[]` — create "manual entry" evidence records
- Scan `clinicalData.patients` with `lastVisit` — create backdated appointment records if none exist for that date
- Scan `patientRecords` for procedure/treatment mentions — create procedure records with competency linking
- Auto-complete past appointments (date before today, status still 'scheduled')
- Dedup all generated records against existing ones

### Phase 3: Unified Patient Model
**File:** patients.js + clinical.js + state.js

Merge `patientRecords` and `patients` into single unified store at `clinicalData.patients`:
- Patient record gains full Google-Docs-style fields from patientRecords
- Patient summary fields (name, chartNumber, status) remain for quick access
- Patient timeline: chronological list of appointments + procedures + competency items
- Migration function converts existing dual-store data
- All tabs read from single `clinicalData.patients`

### Phase 4: Competency Intelligence
**File:** clinical.js

- **Dual counting**: `item.completed` = MAX(manual count, completionEntries.length)
- **Evidence always**: Manual +/- via `adjustCompItem()` creates lightweight evidence entry
- **Gap analysis**: `getCompetencyGaps()` returns items with 0 progress + items behind pace
- **Graduation readiness**: `calculateGraduationReadiness()` returns weighted percentage across all 14 categories
- **Competency export**: `exportCompetencyReport()` generates structured data for advisor review

### Phase 5: Schedule-Clinical Integration
**File:** daily-planner.js + monthly-planner.js

- **Clinic day detection**: Check if today has clinical appointments, auto-switch daily planner to clinic mode
- **Clinic day view**: Shows today's patients, planned procedures, relevant competency items, one-tap completion
- **Week-ahead prep**: In monthly planner, highlight days with clinical appointments and show prep summary
- **Post-clinic summary**: After all today's appointments are completed, show summary card

### Phase 6: Enhanced Import Pipeline
**File:** import-system.js + patients.js

- Import creates full pipeline: patient → appointment (auto-completed if past) → procedure record → competency links
- Import preview shows what will be created before confirming
- Incremental re-import deduplicates against existing records

### Phase 7: Cross-Tab Navigation & Consistency
**Files:** state.js + init.js + clinical.js

- `navigateToEntity(type, id)` function for deep linking: click any patient/appointment/competency reference on any tab to jump to its detail
- Consistency check on save: validate referential integrity (procedures reference real patients, competency links reference real items)
- Auto-checkpoint before any bulk operation (backfill, import)

### Phase 8: Deadline-Clinical Bridge
**File:** deadlines.js + clinical.js

- Auto-suggest clinical deadlines based on competency gaps: "Complete 2 more SRP summatives before externship"
- Link appointments to deadline items when dates match

### Phase 9: Mission Control Alerts & Actions
**File:** init.js

- Alerts row: blockers (0-progress competency items), warnings (recalls due, pace behind), info (appointments this week)
- Quick actions: complete today's appointments, record ad-hoc procedure, navigate to gaps
- Key dates with competency context ("Externship in 55 days — 12/90 appointments")

## Data Model Changes

### New fields on `clinicalData.patients[]`:
```javascript
{
  // Existing quick-view fields preserved
  // NEW: merged from patientRecords
  record: { ... },           // Full Google-Docs-style record content
  timeline: [],              // Auto-derived: [{type, date, id, summary}]
  treatmentPlan: [],          // Planned procedures with competency links
}
```

### New fields on competency items:
```javascript
{
  // completionEntries[] already exists
  // No new fields — just ensuring manual adjustments create entries
}
```

### New top-level functions:
- `backfillClinicalData()` — one-time data population
- `getCompetencyGaps()` — returns unfilled requirements
- `calculateGraduationReadiness()` — weighted readiness score
- `navigateToEntity(type, id)` — cross-tab deep linking
- `getSmartAppointmentCount()` — multi-source appointment aggregation
- `getSmartProcedureCount()` — multi-source procedure aggregation
- `generateClinicDaySummary()` — post-clinic day rollup
- `autoSuggestClinicalDeadlines()` — gap-based deadline suggestions

## Firebase Merge Sites

All new fields added to ALL 4 merge/restore sites:
1. `loadFromLocalStorage()` in firebase-sync.js
2. `loadFromFirebase()` / `mergeRemoteState()` in firebase-sync.js
3. `restoreCheckpoint()` in firebase-sync.js
4. `importAndRestoreDirectly()` in firebase-sync.js

Plus `isEmptyState()` updated if new collection fields added.

## Constraints

- No build system — all changes are surgical edits to existing JS modules
- Firebase RTDB — objects with ID keys, no arrays
- All 6 save guards must remain intact
- All date parsing uses local timezone (never `new Date('YYYY-MM-DD')`)
- `?? null` for optional fields in buildSaveData (never undefined)
- Cache-busting `?v=` params bumped on all script tags after changes
