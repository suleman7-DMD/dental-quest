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
    createdAt: '2026-02-01T10:00:00Z'
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

## Competencies System

### Architecture

Competencies track graduation requirements for BU dental school. They use a nested structure:
```
competencies -> categories -> sections -> items
```

Each item has `required` (count needed) and `completed` (count done) fields, making it a quantity-based system (NOT a binary signed/unsigned system).

### DEFAULT_COMPETENCIES (~line 14128)

10 categories of real BU dental school clinical requirements:

| Key | Name | Icon | Color | Focus |
|-----|------|------|-------|-------|
| `fixed` | Fixed Prosthodontics | `#3b82f6` | Crowns, FPD, CEREC, impressions |
| `operative` | Operative | `#10b981` | Composites (Class V, multisurface), mock board |
| `dentures` | Complete Dentures | `#8b5cf6` | Formatives, summatives, overdenture |
| `rpd` | RPDs | `#f59e0b` | 3 tracks (cast metal, flexible, interim) |
| `srp` | SRPs | `#ef4444` | Calculus removal summatives |
| `endo` | Endodontics | `#06b6d4` | RCTs, pulpectomies, mock board |
| `oralsurg` | Oral Surgery | `#ec4899` | 3rd/4th year rotations, extractions |
| `peds` | Pediatric Dentistry | `#84cc16` | PD 530 course, rotations, log sheet |
| `perio` | Periodontology | `#f472b6` | Surgical assists, formatives, summatives |
| `grouppractice` | Group Practice (GD 640) | `#0ea5e9` | Reviews, analyses, workshops |

### Category Shape
```javascript
{
    name: 'Fixed Prosthodontics',
    icon: '...',
    color: '#3b82f6',
    summary: { completed: 0, inProgress: 0, planned: 2, required: 10, unit: 'units' },
    notes: '2 planned. Must include 1 FPD, 1 Implant Crown, 3 CEREC restorations.',
    sections: [
        {
            title: 'Fixed Formatives (to qualify for summatives)',
            items: [
                { id: 'fixed-form-prov', text: '6 Provisional Restoration', required: 6, completed: 0 },
                { id: 'fixed-form-prep', text: '6 Tooth Preparation', required: 6, completed: 0 },
                // ...
            ]
        },
        {
            title: 'Fixed Summatives',
            items: [ /* ... */ ]
        }
    ]
}
```

### Item Shape
```javascript
{
    id: 'fixed-form-prov',         // Stable ID
    text: '6 Provisional Restoration',
    required: 6,                   // How many needed
    completed: 0,                  // How many done
    note: 'Optional note',        // Optional
    status: 'planned'             // Optional manual override: pending | in_progress | planned | completed
}
```

### Status Logic (`getItemStatus()` ~line 14396)
```javascript
if (item.completed >= item.required) return 'completed';
if (item.completed > 0) return 'in_progress';
if (item.status && item.status !== 'pending') return item.status;  // Manual override
return 'pending';
```

### Data Access
`getCompetenciesData()` at ~line 14372 initializes competencies from DEFAULT_COMPETENCIES if null, handles migration from array-based to object-based storage.

Competencies are stored in `roadmapData.clinicalData.competencies` and migrated via `migrateCompetencies()` at ~line 9637 to use object keys instead of arrays (for Firebase safety).

### Key Competency Functions

| Function | Line | Description |
|----------|------|-------------|
| `getCompetenciesData()` | ~14372 | Get/initialize competencies |
| `getItemStatus(item)` | ~14396 | Determine item status |
| `calculateCategoryStats(cat)` | ~14405 | Stats for one category |
| `calculateOverallStats(competencies)` | ~14429 | Stats across all categories |
| `getWhatsNextItems(competencies)` | ~14456 | Top 5 in-progress/planned items |
| `renderCompetencies()` | ~14480 | Full competencies UI with progress ring |
| `toggleCompCategory(key)` | ~14639 | Expand/collapse category |
| `setCompItemStatus(catKey, itemId, newStatus)` | ~14658 | Set item status manually |
| `adjustCompItem(catKey, itemId, delta)` | ~14706 | Increment/decrement completed count |
| `updateCompNotes(catKey, notes)` | ~14751 | Update category notes |
| `showCompMilestone(itemText)` | ~14760 | Show celebration modal |
| `resetCompetencies()` | ~14777 | Reset all to defaults |
| `openAddCompItemModal(catKey, sectionId)` | ~14799 | Add custom competency item |
| `openEditCompItemModal(catKey, itemId)` | ~14816 | Edit competency item |
| `saveCompItem()` | ~14859 | Save competency item |
| `deleteCompItem(catKey, itemId)` | ~14945 | Delete competency item |

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
