# Patient Tracker — Feature Reference

## What This Is

A "Patients" tab in `graduation-roadmap.html` that replaces a Google Docs-based patient tracking system. It provides:

1. **Google Docs-style patient records** — sidebar with patient names, click to view/edit a color-coded template with 15 clinical fields
2. **Claude webchat import pipeline** — screenshot axiUm → Claude analyzes → structured text → paste into app → auto-populates patient records
3. **D3 graduation requirements cross-referencing** — auto-badges showing which patients can help fulfill which clinical requirements
4. **SPS Dashboard tracking** — import aggregate clinic metrics (appointments/90, procedures/116, clinical progress categories)
5. **Countdown radar** — days until May 15, 2026 deadline with burn-down tracking

## Architecture

### Files

| File | Lines | Purpose |
|------|-------|---------|
| `js/graduation-roadmap/patients.js` | ~1740 | All patient tracker logic: rendering, CRUD, import parsing, requirements matching, dashboard metrics, countdown |
| `graduation-roadmap.html` | Modified | Tab button, tab content container, 2 modals (import + requirements check-off), CSS styles |
| `js/graduation-roadmap/state.js` | Modified | Added `patientRecords: {}` and `dashboardSnapshots: []` to `clinicalData` |
| `js/graduation-roadmap/init.js` | Modified | Dashboard card on Mission Control, tab switch handler |

### Data Paths (Firebase)

- `roadmapData.clinicalData.patientRecords` — Object keyed by `"pt_" + chartNumber`. Each record has 15+ fields.
- `roadmapData.clinicalData.dashboardSnapshots` — Array of timestamped SPS dashboard snapshots (max 20, newest first).

### Key Functions

| Function | Purpose |
|----------|---------|
| `initPatientsTab()` | Entry point — renders dashboard metrics, countdown radar, sidebar, first patient |
| `renderPatientsSidebar()` | Left sidebar with search, import/add buttons, patient list with reliability dots |
| `renderPatientRecord(id)` | Full Google Docs-style template with 12 color-coded contenteditable fields |
| `savePatientField(element)` | Auto-saves on blur of any editable field |
| `computeRequirementMatches(patient)` | Keyword-matches tx plan text against D3 requirement IDs |
| `renderCountdownRadar()` | Days until May 15, requirements remaining, pace needed, category mini-bars |
| `renderDashboardMetrics()` | SPS dashboard card: appointments/procedures/notes risk KPIs, clinical progress grid |
| `openPatientImportModal()` | Opens the import modal |
| `parsePatientImportText(text)` | Master parser — detects all 5 format types, routes to sub-parsers |
| `parseDashboardUpdate(text)` | Parses SPS_DASHBOARD_UPDATE blocks |
| `confirmPatientImport()` | Applies all parsed data: creates/updates patients, checks off requirements, saves snapshots |

## Import Formats (5 types)

All formats use `---` as block delimiters. Paste into the Import modal on the Patients tab.

### 1. PATIENT_RECORD — New patient or full rebuild

```
PATIENT_RECORD
---
NAME: LastName, FirstName
CHART: 1234567
TYPE: Active Patient (30 y/o F)
MEDICAL_HX: Conditions, precautions
MEDICATIONS: Med list. Allergies: if any.
DENTAL_HX: Dental history
TX_SUMMARY_BU: Treatment at BU
POE_LAST: Last POE/prophy info
POE_NEXT: Next recall info
TX_PLAN: Outstanding treatment
LAST_VISIT: date | procedure | provider
NEXT_VISIT: date | planned procedures | provider
LAST_FMX: date
LAST_BW: date
LAST_CBCT: date or unknown
LAST_PANO: date or unknown
NOTES: Clinical notes, alerts
---
```

### 2. PATIENT_UPDATE — Partial update to existing patient

```
PATIENT_UPDATE
---
CHART: 1234567
LAST_VISIT: 3/19/2026 | Prophy + BWs | Suleman Shaikh
NEXT_VISIT: 9/19/2026 | 6mrc recall
NOTES_APPEND: New note to add (doesn't replace existing notes)
---
```

### 3. REQUIREMENTS_MATCH — Link patient procedures to graduation requirements

```
REQUIREMENTS_MATCH
---
CHART: 1234567
NAME: LastName, FirstName
CAN_FULFILL:
  op-multi-5 | Multisurface #5 | MO composite #18
  perio-sum-prophy | Prophy Summative | Full mouth prophy
COMPLETED_TODAY:
  op-multi-5 | Multisurface #5 | MO composite #18 | 2026-03-19
HIGH_VALUE: yes
---
```

### 4. REQUIREMENTS_STATUS — Bulk update requirement counts

```
REQUIREMENTS_STATUS
---
UPDATED: 2026-03-19
SOURCE: Self-report
UPDATES:
  op-multi-5 | completed: 5 | note: MO #18 on Carmen
  perio-sum-prophy | completed: 2 | note: Prophy on Anabely
---
```

### 5. SPS_DASHBOARD_UPDATE — Aggregate clinic metrics

```
SPS_DASHBOARD_UPDATE
---
DATE_CAPTURED: 2026-03-19
LAST_PROCEDURE_DATE: 2026-03-19

APPOINTMENTS:
  ATTENDED: 54 / 90
  BOOKED: 10
  PROJECTED: 64 / 90
  REMAINING: 36
  MISSED: 17
  NOTES_AT_RISK: 4 (Unclosed: 4, Blank: 4)
  NOTES_STATUS: RED

PROCEDURES:
  TOTAL_COMPLETED: 64 / 116
  REMAINING: 52
  WEEKLY_PACE_NEEDED: 6.5

ROSTER:
  PTS_ASSIGNED: 23
  NOT_SEEN_6MO: 4
  TP_NOT_CONSENTED: 5

CLINICAL_PROGRESS:
  FIXED:        C=0  IP=0  P=4  | target: 10 units
  IMPLANT:      C=0  IP=0  P=0  | target: 1
  IMPL_SURG:    C=0              |
  BRIDGE:       C=0  IP=0  P=0  | target: 1
  REMO_COMP:    C=0  IP=0  P=2  | target: 4 arches
  OVERDENTURE:  C=1.5 P=0       | target: 1
  REMO_PARTIAL: C=0  IP=0  P=0  | target: 1
  OPERATIVE:    C=13  P=18      | target: 8 summatives
  PERIO_SRP:    C=1   P=0       | target: 3
  ENDO:         C=0   P=1       | target: 2

ALERTS:
  [NOTES_AT_RISK = 4 → YELLOW, approaching 6 limit]
  [PERIO_SRP P=0 — NO PIPELINE FOR SRP]
---
```

## Pre-filled Patients (19 total)

1. Carmen Murillo (2118878) — yellow reliability
2. Anabely Gil (1647620) — yellow
3. Kisha Williams (79118) — green
4. Jose Rosario (2467990) — green
5. Nababi Nsereko (2568967) — green
6. Mohamed Krima (2577113) — green
7. Lebron Hector (1875522) — red
8. Tawana Wright (1297657) — green
9. Alison Carvalho (2582208) — green
10. Cynthia Perdomo (1987861) — yellow
11. Arthur Delossantos (1763380) — red
12. Kristen Sbardella (2107896) — green
13. Kavitha Koshkarian (2569813) — red
14. Jonathan Laplante (1186199) — red
15. Sandrine Soivilien (966540) — red
16. Alirio Lopes (2225586) — red
17. Karim Mohamed (23042563) — red
18. Aubrey Penn (23048578) — red
19. Karima M. (placeholder) — yellow

## Requirements Matching Keywords

The system auto-matches patient tx plan text against D3 graduation requirement IDs:

| Keywords | Requirement Category |
|----------|---------------------|
| crown, prep, cementation, FPD, bridge, CEREC | Fixed Prosthodontics |
| class v, class 5, cl 5 | Operative (Class V) |
| composite, DO, MO, MOD, OL, OF | Operative (Multisurface) |
| SRP, scaling, root planing, calculus | SRP |
| prophy | Perio (Prophy) |
| re-eval, gingivitis re | Perio (Re-eval) |
| denture, CU/CL, interim | Complete Dentures |
| RPD, partial denture | RPD |
| RCT, root canal, endo | Endodontics |
| extraction, ext # | Oral Surgery |
| OHRA | Treatment Planning |
| written analysis, WA | Group Practice |

## Claude Webchat Project Integration

The Claude webchat project has instructions to auto-generate export blocks after analyzing axiUm screenshots. Key commands:
- `"export"` → Full PATIENT_RECORD + REQUIREMENTS_MATCH
- `"update export"` → PATIENT_UPDATE + REQUIREMENTS_MATCH
- `"re-export"` → Regenerate full PATIENT_RECORD
- `"requirements"` → REQUIREMENTS_MATCH only
- `"update requirements"` → REQUIREMENTS_STATUS
- `"status"` → What info is missing
- `"countdown"` → Days remaining + requirements pace

SPS dashboard screenshots trigger SPS_DASHBOARD_UPDATE auto-extraction.

## Color Scheme (Google Docs Match)

| Field | Background | Label Color |
|-------|-----------|------------|
| Header (Chart/Name) | #4a4a4a | white |
| Medical Hx | #f4cccc | #990000 |
| Medications | #cfe2f3 | #073763 |
| Dental Hx | #d9ead3 | #274e13 |
| Tx Summary BU | #fff2cc | #7f6000 |
| POE Last | #d9d9d9 | #434343 |
| POE Next | #d9ead3 | #274e13 |
| Tx Plan | #d9d2e9 | #351c75 |
| Last Visit | #fce5cd | #783f04 |
| Next Visit | #d9ead3 | #274e13 |
| Notes | #fff2cc | #990000 |
