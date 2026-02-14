# Tabs and Rendering

## File Structure (~17,575 lines)

```
Lines 1-5550       CSS styles (dark theme, responsive, modals)
Lines 5550-8383    HTML structure (tabs, containers, modals, forms)
Lines 8383-17575   JavaScript (single script block)
```

## Tab System

11 tabs, switched via `switchTab(tabId, evt)` at ~line 11239.

Tab buttons at ~line 5551-5561, each using class `tab-btn` with `onclick="switchTab(tabId, event)"`:

| Button | Tab ID | Label |
|--------|--------|-------|
| Active default | `dashboard` | Dashboard |
| Tab 2 | `deadlines` | Deadlines |
| Tab 3 | `courses` | Courses |
| Tab 4 | `grades` | Grades |
| Tab 5 | `examcontent` | Exam Content |
| Tab 6 | `classmates` | Classmate Share |
| Tab 7 | `mandatory` | Mandatory |
| Tab 8 | `dailyplanner` | Daily Planner |
| Tab 9 | `monthlyplanner` | Monthly |
| Tab 10 | `clinical` | Clinical |
| Tab 11 | `remember` | Remember |

### Tab Details

| Tab | Container ID | Render Function | Notes |
|-----|-------------|----------------|-------|
| Dashboard | `dashboard` | `renderDashboard()` ~11307 | Upcoming deadlines, clinical widget, study progress |
| Deadlines | `deadlines` | `renderDeadlines()` ~11581 | Full deadline list with edit/complete/grade/delete |
| Courses | `courses` | Static HTML | Course info cards |
| Grades | `grades` | `loadCourseGrades()` ~11909 | Grade entry table + "what do I need" calculator |
| Exam Content | `examcontent` | `loadExamCourseContent()` ~12797 | Study checklist per exam |
| Classmate Share | `classmates` | Static HTML | Shared resources |
| Mandatory | `mandatory` | `toggleMandatory()` ~11289 | Checkbox list of mandatory items |
| Daily Planner | `dailyplanner` | `initDailyPlanner()` ~15871 | Timeline, pomodoro timer, event blocks |
| Monthly | `monthlyplanner` | `initMonthlyPlanner()` ~16577 | Week-based calendar grid |
| Clinical | `clinical` | `initClinicalTab()` ~13546 | Patients, appointments, procedures, competencies |
| Remember | `remember` | Static HTML | Always-visible reminders |

### switchTab() (~line 11239)
```javascript
function switchTab(tabId, evt) {
    // Close any open modals
    // Remove 'active' from all tab-btn
    // Add 'active' to clicked button
    // Hide all tab-content divs
    // Show selected tab-content
    // Call tab-specific init functions:
    if (tabId === 'grades') loadCourseGrades();
    if (tabId === 'deadlines') renderDeadlines();
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'examcontent') loadExamCourseContent();
    if (tabId === 'dailyplanner') initDailyPlanner();
    if (tabId === 'monthlyplanner') initMonthlyPlanner();
    if (tabId === 'clinical') initClinicalTab();
}
```

## Clinical Sub-tabs

Within the Clinical tab, there are sub-tabs managed by `switchClinicalSubtab()` at ~line 13535:
- **Patients** — Patient records and management
- **Appointments** — Scheduled clinical appointments
- **Procedures** — Completed procedure logging
- **Competencies** — Graduation requirement tracking

```javascript
function switchClinicalSubtab(subtab, btn) {
    // Toggle visibility of sub-tab containers
    // Update active button state
}
```

## Dashboard (~line 11307)

`renderDashboard()` builds:
1. Upcoming deadlines widget (next 14 days)
2. Clinical progress widget via `renderClinicalDashboardWidget()` ~11410
3. Study progress widget via `renderStudyProgressWidget()` ~11500
4. Exam countdown via `renderExamCountdown()` ~11809

## Header Structure

The header contains:
- App title "D3 Roadmap"
- Sync status indicator
- Checkpoint buttons: Save, Restore, Force Upload, Force Pull
- PIN display

## CSS Theme

Dark theme with:
- Background: `#0f1419` (main), `#1a2332` (cards)
- Text: `#e2e8f0` (primary), `#b0bcc8` (secondary)
- Accent colors per course (defined in courseStructures)
- Responsive: Mobile breakpoints at 768px and 480px
- Tab buttons use `.tab-btn` class with `.active` state

## Toast Notification

```javascript
function showToast(message) {  // ~line 12212
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}
```

## Modal System

Custom modals:
```javascript
function showCustomAlert(message, title, callback)   // ~12220
function showCustomConfirm(message, onConfirm, onCancel, title)  // ~12238
```

These replace browser `alert()` and `confirm()` with styled dark-theme modals.
