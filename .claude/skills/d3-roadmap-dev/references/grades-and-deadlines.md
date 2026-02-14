# Grades and Deadlines System

## Grade Calculator

### Course Structures (~line 11829)

```javascript
const courseStructures = {
    oralmed: {
        name: 'Oral Medicine', passing: 60,
        components: [
            { id: 'participation', name: 'Participation', weight: 12.5 },
            { id: 'quiz1'-'quiz10', name: 'Quiz 1-10', weight: 2.5 each },  // 10 quizzes
            { id: 'midterm', name: 'Midterm', weight: 25 },
            { id: 'final', name: 'Final', weight: 25 },
            { id: 'passionProject', name: 'Passion Project', weight: 12.5 }
        ]  // Total: 100%
    },
    paincontrol: {
        name: 'Pain Control 2', passing: 60,
        components: [
            { id: 'rx1', weight: 2 }, { id: 'takehome1', weight: 12 },
            { id: 'midterm', weight: 30 }, { id: 'medConsult', weight: 2 },
            { id: 'rx2', weight: 2 }, { id: 'takehome2', weight: 12 },
            { id: 'final', weight: 40 }
        ]  // Total: 100%
    },
    critthink: {
        name: 'Critical Thinking', passing: 60,
        components: [
            { id: 'quiz1', weight: 20 }, { id: 'quiz2', weight: 20 },
            { id: 'pico', weight: 3 }, { id: 'individualArticle', weight: 12 },
            { id: 'groupArticles', weight: 6 }, { id: 'groupPpt', weight: 12 },
            { id: 'groupVideo', weight: 9 }, { id: 'systematicReview', weight: 12 },
            { id: 'peerReview', weight: 6 }
        ]  // Total: 100%
    },
    peds: {
        name: 'Pediatric Dentistry', passing: 60,
        components: [
            { id: 'exam1', name: 'Exam 1 (Midterm)', weight: 40, defaultGrade: 77 },
            { id: 'exam2', name: 'Exam 2 (Cumulative)', weight: 45 },
            { id: 'exam3', name: 'Exam 3 + Attendance', weight: 7.5 },
            { id: 'headstart', name: 'Headstart Rotation', weight: 2.5, defaultGrade: 100 },
            { id: 'orthoModule', name: 'Orthodontic Module', weight: 5 }
        ]  // Total: 100%
    },
    perio: {
        name: 'Periodontology 2', passing: 65,  // HIGHER THAN STANDARD
        components: [
            { id: 'midterm', weight: 40 },
            { id: 'writtenAssignment', weight: 10, defaultGrade: 100 },
            { id: 'discussion', name: 'In-Person Discussion', weight: 5 },
            { id: 'final', weight: 45 }
        ]  // Total: 100%
    },
    ortho: {
        name: 'Orthodontics', passing: 60,
        components: [
            { id: 'midterm', weight: 50 },
            { id: 'final', weight: 50 }
        ]  // Total: 100%
    }
};
```

Note: Geriatrics is tracked in STATIC_DEADLINES but NOT in courseStructures (no grade entry).

### Grade Calculation Formula

In `loadCourseGrades()` at ~line 11909:
```javascript
// For each component with a grade entered:
earnedPoints += (parseFloat(grade) / 100) * comp.weight;
completedWeight += comp.weight;

// Summary:
remainingWeight = 100 - completedWeight;
currentGrade = completedWeight > 0 ? (earnedPoints / completedWeight * 100) : 0;
```

### "What Do I Need" Calculator

In `calculateNeeded()` at ~line 12104:
```javascript
// For target grades 60%, 70%, 80%, 90%:
const pointsNeeded = targetGrade - earnedPoints;
const avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;
```

### Grade Storage
Grades are saved in `roadmapData.grades[courseId][componentId]` as numbers (0-100).

```javascript
function updateGrade(courseId, componentId, value) {  // ~12005
    roadmapData.grades[courseId][componentId] = value !== '' ? parseFloat(value) : null;
    saveData();
    loadCourseGrades();  // Refresh display
    calculateNeeded();   // Update "what I need"
}
```

### Grade-Deadline Sync

`syncGradeToDeadline(courseId, componentId, grade)` at ~line 12020 — when a grade is entered in the Grades tab, it syncs to the corresponding deadline's completion status.

`syncDeadlineToGrades(deadline, isComplete, grade)` at ~line 12563 — when a deadline is marked complete with a grade, it syncs back to the Grades tab.

---

## Deadline System

### Architecture: Hybrid Static + Dynamic

The system uses a multi-layer approach:

1. **STATIC_DEADLINES** (const array, ~line 11125) — 50+ hardcoded Spring 2026 deadlines
2. **roadmapData.customDeadlines** — User-added deadlines (object with ID keys)
3. **roadmapData.editedDeadlines** — Field overrides for static deadlines
4. **roadmapData.completedDeadlines** — Completion tracking + grades
5. **roadmapData.deletedDeadlines** — Deleted static deadlines
6. **Working `deadlines` array** — Rebuilt every `initUI()` call

### Deadline Entry Shape (STATIC_DEADLINES)
```javascript
{
    date: '2026-02-18',        // YYYY-MM-DD
    day: 'Wed',                // Day abbreviation
    what: 'EXAM 2 (cumulative) SURVIVAL EXAM',  // Description
    course: 'Peds',            // Course name (display string, not key)
    weight: '45%',             // Weight as string
    type: 'EXAM',              // EXAM | Quiz | Assignment | Take-home | Module | Project | Presentation | Clinical | Blocked | No Class
    month: 'february',         // Lowercase month name
    done: true                 // Optional: pre-completed
}
```

### Custom Deadline Shape
```javascript
{
    id: 'custom_1707400000000_abc123',  // generateId('custom')
    date: '2026-03-15',
    what: 'Study group meeting',
    course: 'Other',
    weight: '-',
    type: 'Other',
    custom: true                // Flag for custom deadlines
}
```

### Stable Deadline IDs

`getDeadlineId(deadline)` at ~line 9551 creates a stable ID from deadline properties. This replaced using array index (which broke when custom deadlines were added).

### Key Deadline Functions

| Function | Line | Description |
|----------|------|-------------|
| `addNewDeadline()` | ~12259 | Show the add deadline modal |
| `submitNewDeadline()` | ~12332 | Validate and save new custom deadline to `roadmapData.customDeadlines` |
| `toggleDeadlineDone(index)` | ~12396 | Toggle completion, update `completedDeadlines` by stable ID |
| `toggleDeadlineDoneById(deadlineId)` | ~12439 | Toggle by deadline ID |
| `deleteDeadlineById(deadlineId)` | ~12450 | Delete by deadline ID |
| `showGradeInputModal(index, deadline)` | ~12460 | Show grade entry modal |
| `submitDeadlineGrade(index)` | ~12514 | Save grade to `completedDeadlines` by stable ID |
| `submitDeadlineGradeById()` | ~12500 | Grade submission by ID |
| `deleteDeadline(index)` | ~12681 | Delete deadline (custom -> remove, static -> add to deletedDeadlines) |
| `handleDateChange(inputEl)` | ~11672 | Inline date editing |
| `handleTextEdit(inputEl)` | ~11735 | Inline text editing |
| `syncDeadlineToGrades(d, done, grade)` | ~12563 | Sync deadline completion to grade calculator |

### initUI() Deadline Merge (~line 15524)

Every `initUI()` call:
1. Clears `deadlines` array
2. Deep-copies all `STATIC_DEADLINES` entries
3. Filters out `roadmapData.deletedDeadlines`
4. Applies `roadmapData.editedDeadlines` overrides (matched by stable ID)
5. Appends `roadmapData.customDeadlines` entries
6. Applies `roadmapData.completedDeadlines` status

### renderDeadlines() (~line 11581)

Renders the deadlines tab grouped by month. Each deadline shows:
- Completion checkbox
- Date (editable inline)
- Description (editable inline)
- Course badge (color-coded)
- Weight
- Type badge
- Countdown badge
- Grade entry button (if completed)
- Delete button

### Exam Content Study Tracker

`loadExamCourseContent()` at ~line 12797 provides a study checklist for upcoming exams. Tracks which lectures have been studied in `roadmapData.examStudyProgress`.

Related functions:
- `toggleLectureStudied(examId, lecNum, isReview)` ~13212
- `markAllStudied(examId, lectures, isReview, markAs)` ~13219
- `getCourseStudyProgress(courseKey)` ~13140
- `getExamProgress(examId, lectures, reviewContent)` ~13179
