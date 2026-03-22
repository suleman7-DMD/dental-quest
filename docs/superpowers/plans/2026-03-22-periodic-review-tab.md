# Periodic Review Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Periodic Review" tab to graduation-roadmap.html that auto-populates a Written Report for Periodic Review from existing app data, shows deltas against a hard-coded PR Part 1 baseline, and exports to PDF.

**Architecture:** New `periodic-review.js` module (loaded before init.js) renders 12 sections into a new tab div. Data stored in `roadmapData.periodicReviews.pr2`. PR1 baseline is a frozen constant. PDF export via lazy-loaded html2pdf.js. Visual style: Atlas Console panels + Swiss typography/grid hybrid.

**Tech Stack:** Vanilla JS (no build system), html2pdf.js CDN, Inter + IBM Plex Mono fonts, Firebase Realtime Database (existing).

**Spec:** `docs/superpowers/specs/2026-03-22-periodic-review-tab-design.md`

**Style references:** `docs/style-guides/atlas-console.html`, `docs/style-guides/swiss.html`

**Critical rules from CLAUDE.md:**
- Use surgical `Edit` tool only on existing files - never rewrite
- Add `periodicReviews` to ALL 4 merge/restore sites in firebase-sync.js
- Add to `isEmptyState()` in state.js
- Use `?? ''` not `|| ''` for string fields (empty strings are falsy)
- Use `?? null` for optional fields to avoid Firebase `undefined` rejection
- Use objects with `generateId()` keys, NEVER arrays for Firebase collections
- All date parsing: `new Date(year, month-1, day)` NOT `new Date('YYYY-MM-DD')`
- `safeLocalStorageSet()` before `saveData()` in ALL CRUD functions
- Bump `?v=` cache-busting params on ALL `<script>` tags after changes
- XSS note: `subjectiveReport` stores HTML from contentEditable. This is a single-user app with PIN auth (documented exception in spec Security Note). All other user text fields use `escapeHtml()`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `js/graduation-roadmap/periodic-review.js` | **Create** | PR1 baseline constant, all 12 section renderers, CRUD helpers, PDF export |
| `js/graduation-roadmap/state.js` | Modify | Add `periodicReviews` to defaults + `isEmptyState()` + `switchTab()` |
| `js/graduation-roadmap/firebase-sync.js` | Modify | Add `periodicReviews` merge to all 4 sites |
| `js/graduation-roadmap/patients.js` | Modify | Add 4 new string fields to DEFAULT_PATIENT_RECORDS |
| `graduation-roadmap.html` | Modify | Add tab button, tab content div, script tag, Google Fonts link, PR tab CSS |

---

## Task 1: Data Layer - State Defaults + Firebase Sync

**Files:**
- Modify: `js/graduation-roadmap/state.js:170-185` (getDefaultRoadmapData, before `lastSaved`)
- Modify: `js/graduation-roadmap/state.js:199-231` (isEmptyState)
- Modify: `js/graduation-roadmap/state.js:647-653` (switchTab render calls)
- Modify: `js/graduation-roadmap/firebase-sync.js:596-639` (mergeRemoteState, after clinicHeadlines block)
- Modify: `js/graduation-roadmap/firebase-sync.js:696-712` (loadFromLocalStorage, after clinicalData block)
- Modify: `js/graduation-roadmap/firebase-sync.js:1395-1411` (restoreCheckpoint, after clinicalData block)
- Modify: `js/graduation-roadmap/firebase-sync.js:1691-1707` (importAndRestoreDirectly, after clinicalData block)

- [ ] **Step 1: Add `periodicReviews` to `getDefaultRoadmapData()` in state.js**

Insert BEFORE the `lastSaved: null` line (line 181):

```javascript
        periodicReviews: {
            pr2: {
                reviewDate: null,
                reviewPeriod: 'December 2025 \u2014 April 2026',
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
        },
```

- [ ] **Step 2: Add `periodicReviews` check to `isEmptyState()` in state.js**

After line 223 (`hasTodoItems`), add:

```javascript
    const hasPeriodicReview = data.periodicReviews?.pr2 && (
        (data.periodicReviews.pr2.subjectiveReport ?? '') !== '' ||
        Object.keys(data.periodicReviews.pr2.departmentNotes || {}).length > 0 ||
        (data.periodicReviews.pr2.completedProceduresHtml ?? '') !== ''
    );
```

Then add `&& !hasPeriodicReview` to the return statement (line 230, before the semicolon).

- [ ] **Step 3: Add `periodicreview` case to `switchTab()` in state.js**

After line 653 (`initPatientsTab`), add:

```javascript
        if (resolvedTabId === 'periodicreview' && typeof initPeriodicReview === 'function') initPeriodicReview();
```

- [ ] **Step 4: Add `periodicReviews` merge to `mergeRemoteState()` in firebase-sync.js**

Insert AFTER the `clinicHeadlines` block (after line 635, before `lastSaved: data.lastSaved`). Follow the same pattern as `graduationPrep`:

```javascript
        periodicReviews: data.periodicReviews ? {
            pr2: {
                reviewDate: data.periodicReviews?.pr2?.reviewDate ?? roadmapData.periodicReviews?.pr2?.reviewDate ?? null,
                reviewPeriod: data.periodicReviews?.pr2?.reviewPeriod ?? roadmapData.periodicReviews?.pr2?.reviewPeriod ?? 'December 2025 \u2014 April 2026',
                dashboardDiscrepancyNotes: data.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? roadmapData.periodicReviews?.pr2?.dashboardDiscrepancyNotes ?? '',
                adminStatsOverrides: { ...(roadmapData.periodicReviews?.pr2?.adminStatsOverrides || {}), ...(data.periodicReviews?.pr2?.adminStatsOverrides || {}) },
                completedProceduresHtml: data.periodicReviews?.pr2?.completedProceduresHtml ?? roadmapData.periodicReviews?.pr2?.completedProceduresHtml ?? '',
                inProgressProcedures: { ...(roadmapData.periodicReviews?.pr2?.inProgressProcedures || {}), ...(data.periodicReviews?.pr2?.inProgressProcedures || {}) },
                departmentNotes: { ...(roadmapData.periodicReviews?.pr2?.departmentNotes || {}), ...(data.periodicReviews?.pr2?.departmentNotes || {}) },
                subjectiveReport: data.periodicReviews?.pr2?.subjectiveReport ?? roadmapData.periodicReviews?.pr2?.subjectiveReport ?? '',
                patientNotes: { ...(roadmapData.periodicReviews?.pr2?.patientNotes || {}), ...(data.periodicReviews?.pr2?.patientNotes || {}) },
                removedPatients: { ...(roadmapData.periodicReviews?.pr2?.removedPatients || {}), ...(data.periodicReviews?.pr2?.removedPatients || {}) },
                lastEdited: data.periodicReviews?.pr2?.lastEdited ?? roadmapData.periodicReviews?.pr2?.lastEdited ?? null
            }
        } : (roadmapData.periodicReviews || getDefaultRoadmapData().periodicReviews),
```

- [ ] **Step 5: Add `periodicReviews` to `loadFromLocalStorage()` in firebase-sync.js**

Find the field-by-field block in `loadFromLocalStorage()` (around lines 696-712). After the `clinicHeadlines` field, add the same `periodicReviews` merge block as Step 4 (adapting variable names to match that function's local variable pattern).

- [ ] **Step 6: Add `periodicReviews` to `restoreCheckpoint()` in firebase-sync.js**

Find the field-by-field block in `restoreCheckpoint()` (around lines 1395-1411). After the `clinicHeadlines` field, add the same merge block.

- [ ] **Step 7: Add `periodicReviews` to `importAndRestoreDirectly()` in firebase-sync.js**

Find the field-by-field block in `importAndRestoreDirectly()` (around lines 1691-1707). After the `clinicHeadlines` field, add the same merge block.

- [ ] **Step 8: Verify all 4 sites with grep**

Run: `grep -n 'periodicReviews' js/graduation-roadmap/firebase-sync.js`

Expected: 4+ occurrences (one in each of: mergeRemoteState, loadFromLocalStorage, restoreCheckpoint, importAndRestoreDirectly).

- [ ] **Step 9: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/state.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`
Run: `python3 -c "c=open('js/graduation-roadmap/firebase-sync.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

Braces must be equal in both files.

- [ ] **Step 10: Commit**

```bash
git add js/graduation-roadmap/state.js js/graduation-roadmap/firebase-sync.js
git commit -m "feat(pr-tab): add periodicReviews to state defaults + 4 Firebase merge sites"
```

---

## Task 2: Patient Data Model - Add 4 New String Fields

**Files:**
- Modify: `js/graduation-roadmap/patients.js:8-400` (DEFAULT_PATIENT_RECORDS)

- [ ] **Step 1: Identify all 19 patient record blocks**

Run: `grep -n 'id: .pt_' js/graduation-roadmap/patients.js | head -25`

This gives the line number of each patient record. Each needs 4 new fields added at the end (before the closing `}`).

- [ ] **Step 2: Add 4 fields to each patient record**

For EACH of the 19 patient records, add these 4 fields just before the closing `}` and after the existing `lastUpdated: null` line:

```javascript
        allergies: '',
        txCompletedByMe: '',
        recallHistory: '',
        activeStatus: 'Active'
```

Pre-fill from PR Part 1 PDF data where known. For example, for `pt_1763380` (Arthur Delossantos):
```javascript
        allergies: 'None',
        txCompletedByMe: 'None',
        recallHistory: 'Last Recall: 5/19/2025. Frequency: 6-month. Next due: 11/23/2025.',
        activeStatus: 'Active'
```

For `pt_1647620` (Anabely Gil):
```javascript
        allergies: 'LATEX, amldipine, perflutren, pireoxicam, naproxen, tramadol',
        txCompletedByMe: '10/22/2025 recall + prophy + OHI',
        recallHistory: 'Last Recall: 10/22/2025. Frequency: 6-month. Next due: 4/22/2026.',
        activeStatus: 'Active'
```

Pre-fill ALL 19 patients from the PR Part 1 PDF data. For patients where the PR1 PDF had no writeup (like those marked "remove"), use empty strings.

- [ ] **Step 3: Verify brace balance**

Run: `python3 -c "c=open('js/graduation-roadmap/patients.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

- [ ] **Step 4: Commit**

```bash
git add js/graduation-roadmap/patients.js
git commit -m "feat(pr-tab): add allergies, txCompletedByMe, recallHistory, activeStatus to 19 patient records"
```

---

## Task 3: HTML Shell - Tab Button + Content Div + Script Tag + Fonts + CSS

**Files:**
- Modify: `graduation-roadmap.html:6866` (add tab button between gradprep and remember)
- Modify: `graduation-roadmap.html:8337` (add tab content div between gradprep and remember)
- Modify: `graduation-roadmap.html:9765` (add script tag before init.js)
- Modify: `graduation-roadmap.html` (add Google Fonts link in `<head>` and PR tab CSS)

- [ ] **Step 1: Add Google Fonts link in `<head>`**

Find the existing `<head>` section and add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Add tab button**

After the gradprep button (line 6866) and BEFORE the remember button (line 6867), insert:

```html
        <button class="tab-btn" onclick="switchTab('periodicreview', event)">&#128221; PR Review</button>
```

- [ ] **Step 3: Add tab content div**

After the `tab-gradprep` closing `</div>` (line 8336) and BEFORE the `tab-remember` comment (line 8338), insert:

```html

    <!-- ==================== PERIODIC REVIEW TAB ==================== -->
    <div id="tab-periodicreview" class="tab-content">
        <!-- Populated by initPeriodicReview() in periodic-review.js -->
    </div>

```

- [ ] **Step 4: Add script tag**

Before the init.js script tag (line 9766), add:

```html
    <script src="js/graduation-roadmap/periodic-review.js?v=20260322b"></script>
```

- [ ] **Step 5: Bump all existing script cache-busting versions**

Change all `?v=20260322a` to `?v=20260322b` on lines 9756-9766.

- [ ] **Step 6: Add PR tab CSS**

Add a `<style>` block inside `<head>` (or append to existing `<style>`) with all PR tab specific styles. This is a large block - reference the style guides at `docs/style-guides/atlas-console.html` and `docs/style-guides/swiss.html`. Include:
- `.pr-tab` container with cream background (#f7f5ef)
- `.pr-section` with Swiss section numbers in teal (#1a7f79)
- `.pr-panel` with Atlas Console panel styles (rounded corners, soft shadow, white bg)
- `.pr-table` with Swiss clean borders (no rounded corners, clean headers)
- `.pr-kpi` for delta indicators (teal for positive, #c86b4b clay for negative)
- `.pr-btn` with Swiss rectangular buttons (no border-radius), teal primary
- `.pr-input` with Swiss underline inputs (border-bottom only)
- `.pr-editor` for contentEditable rich text area
- `.pr-toolbar` for rich text formatting buttons
- `.pr-card` for collapsible patient cards
- `.pr-dot` for reliability color dots (green/yellow/red)
- `.pr-badge` for "New since PR1" badges
- `.pr-highlight-green` and `.pr-highlight-yellow` for requirement status
- `.pr-field-changed` for left-border highlight on changed fields
- `.pr-export-mode` rules: hide edit controls, white background, page-break rules
- Google Fonts usage: `font-family: 'Inter', sans-serif` for body, `'IBM Plex Mono', monospace` for data values
- Responsive: stack columns on mobile

- [ ] **Step 7: Verify brace balance**

Run: `python3 -c "c=open('graduation-roadmap.html').read(); print('{:', c.count('{'), '}:', c.count('}'))"`

- [ ] **Step 8: Commit**

```bash
git add graduation-roadmap.html
git commit -m "feat(pr-tab): add PR Review tab button, content div, script tag, fonts, CSS"
```

---

## Task 4: Core Module - PR1 Baseline + Init + Section Renderers 1-3

**Files:**
- Create: `js/graduation-roadmap/periodic-review.js`

This is the main new file. Build it incrementally across Tasks 4-8.

- [ ] **Step 1: Create file with PR1_BASELINE constant and helper functions**

Create `js/graduation-roadmap/periodic-review.js` with:
- The full `PR1_BASELINE` constant (from spec lines 90-170 - all baseline data including clinicalProgress, adminStats, departments, patientRoster, subjectiveReport)
- Helper: `getPR2Data()` - safely returns `roadmapData.periodicReviews.pr2` with defaults
- Helper: `savePR2Field(field, value)` - updates pr2 field, sets lastEdited, calls safeLocalStorageSet + saveData
- Helper: `getLatestSnapshot()` - returns `dashboardSnapshots[0]` or null
- Helper: `renderDelta(pr1Val, nowVal)` - returns formatted delta string (green +N or clay -N)
- Helper: `prEscape(str)` - calls `escapeHtml(str)` for safe rendering of user text in generated markup

- [ ] **Step 2: Write `initPeriodicReview()` function**

Main entry point called by `switchTab()`. Gets pr2 data, snapshot, competencies, patients. Builds all section HTML strings via render functions. Sets the tab container content. Then calls `attachPREventListeners()` to wire up interactivity.

- [ ] **Step 3: Write `renderPRHeader()` - Section 1**

Renders: title, "Part 2: OBJECTIVE REPORT", editable review date, review period. Uses Swiss typography (Inter, large bold heading, uppercase teal section number "01").

- [ ] **Step 4: Write `renderPRDashboardSummary()` - Section 2**

Renders the 10-row SPS dashboard comparison table. Reads PR1 from `PR1_BASELINE.clinicalProgress`, "Now" from `snapshot.clinicalProgress`. Shows delta per cell. Includes discrepancy notes textarea.

- [ ] **Step 5: Write `renderPRAdminStats()` - Section 3**

Renders admin stats comparison table. Uses `getSmartAppointmentCount().total` for Attended. Reads other metrics from snapshot. Shows overrides from `pr2.adminStatsOverrides`. Click-to-edit cells.

- [ ] **Step 6: Test by opening the tab**

Open graduation-roadmap.html in browser, click "PR Review" tab. Verify sections 1-3 render correctly with data from the app.

- [ ] **Step 7: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js
git commit -m "feat(pr-tab): create periodic-review.js with PR1 baseline + sections 1-3"
```

---

## Task 5: Sections 4-5 - Completed + In-Progress Procedures

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js`

- [ ] **Step 1: Write `renderPRCompletedProcedures()` - Section 4**

Paste-in textarea with rendered preview. Parses pipe-delimited or tab-delimited text into table rows. Saves to `pr2.completedProceduresHtml`. Uses `escapeHtml()` on pasted content before rendering.

- [ ] **Step 2: Write `renderPRInProgressProcedures()` - Section 5**

Editable table with Add Row / Delete Row. Uses `generateId('iproc')` for keys. Pre-populated with PR1's 2 Jose Rosario items. Saves to `pr2.inProgressProcedures`.

- [ ] **Step 3: Wire into `initPeriodicReview()`**

Add sections 4-5 to the content concatenation.

- [ ] **Step 4: Test sections 4-5**

Verify paste-in table parses and renders. Verify add/delete rows works and persists.

- [ ] **Step 5: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js
git commit -m "feat(pr-tab): add sections 4-5 - completed + in-progress procedures"
```

---

## Task 6: Sections 6-8 - Department Audit + Needed Table + Other Requirements

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js`

- [ ] **Step 1: Write `renderPRDepartmentAudit()` - Section 6**

One Atlas Console panel card per department (fixed, operative, dentures, rpd, srp, endo). Reads from `competencies[catKey]`. Shows C/IP/P with PR1 deltas. Requirements checklist read-only. Notes textarea per department.

- [ ] **Step 2: Write `renderPRNeededTable()` - Section 7**

Auto-computed summary table. Sums `item.required` and `item.completed` across each category's sections/items. Color-coded status badges.

- [ ] **Step 3: Write `renderPROtherRequirements()` - Section 8**

7 sections (oralsurg, peds, perio, grouppractice, txplanning, geriatrics, externship). Reads from competencies. Green/yellow highlighting. Notes per section.

- [ ] **Step 4: Wire sections 6-8 into `initPeriodicReview()`**

- [ ] **Step 5: Test - verify competency data renders correctly**

Open Clinical tab first to confirm competencies loaded, then switch to PR Review. All requirement counts should match.

- [ ] **Step 6: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js
git commit -m "feat(pr-tab): add sections 6-8 - department audit, needed table, other requirements"
```

---

## Task 7: Section 9 - Subjective Report

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js`

- [ ] **Step 1: Write `renderPRSubjectiveReport()` - Section 9**

Three parts:
1. Collapsed PR1 reference panel (toggle show/hide, renders `PR1_BASELINE.subjectiveReport`)
2. Auto-generated talking points (computed from current data vs PR1 baseline)
3. Rich text editor (contentEditable div with toolbar). The subjectiveReport field stores user-authored HTML - see spec Security Note for XSS exception rationale (single-user PIN-authed app).

- [ ] **Step 2: Write toolbar event handlers**

`prExecCommand(cmd)` - wrapper around `document.execCommand()` for bold/italic/underline/insertUnorderedList/insertOrderedList.

- [ ] **Step 3: Write debounced save for contentEditable**

On `input` event, debounce 500ms then save to `pr2.subjectiveReport` via `savePR2Field()`.

- [ ] **Step 4: Wire into `initPeriodicReview()` and test**

Verify PR1 reference toggles, talking points compute, rich text edits persist after tab switch.

- [ ] **Step 5: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js
git commit -m "feat(pr-tab): add section 9 - subjective report with rich text editor"
```

---

## Task 8: Sections 10-11 - Patient Roster + Writeups

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js`

- [ ] **Step 1: Write `renderPRPatientRoster()` - Section 10**

Table from `patientRecords`. Reliability color dots. Editable "Next Appointment" column. "New since PR1" badges. Remove list at bottom.

- [ ] **Step 2: Write `renderPRPatientWriteups()` - Section 11**

Collapsible cards per patient. All fields from patientRecord rendered with `escapeHtml()`. Editable inline (click-to-edit pattern). Expand All / Collapse All toggle. Removed patients section at bottom.

- [ ] **Step 3: Write inline edit handler**

`prEditPatientField(patientId, field, element)` - on blur, saves new value to `roadmapData.clinicalData.patientRecords[patientId][field]`, calls `safeLocalStorageSet()` then `saveData()`.

- [ ] **Step 4: Write PR1 baseline diff highlighting**

Compare current patient field values against PR1 patient data. Add `.pr-field-changed` CSS class when values differ. PR1 patient data lookup built from `PR1_BASELINE.patientRoster` by chartNumber, with key fields from each patient's PR1 writeup hard-coded into `PR1_BASELINE.patientDetails`.

- [ ] **Step 5: Wire sections 10-11 into `initPeriodicReview()` and test**

Verify patient roster renders with correct reliability colors. Verify collapsible cards work. Verify inline edits persist.

- [ ] **Step 6: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js
git commit -m "feat(pr-tab): add sections 10-11 - patient roster + collapsible writeups"
```

---

## Task 9: Section 12 - PDF Export

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js`

- [ ] **Step 1: Write `exportPRToPDF()` - Section 12**

1. Lazy-load html2pdf.js from CDN: `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js`
2. Clone the `.pr-tab` element
3. Add `.pr-export-mode` class to clone (CSS hides edit controls, sets white background)
4. Configure html2pdf options: A4, margins, filename using `getLocalDateString(new Date())`
5. Generate and download PDF
6. Remove export class after completion

- [ ] **Step 2: Add export button to bottom of PR tab**

Render an "Export PR Part 2 as PDF" button at the bottom of `initPeriodicReview()` output.

- [ ] **Step 3: Add print/export CSS rules to graduation-roadmap.html**

```css
.pr-export-mode .pr-toolbar,
.pr-export-mode .pr-btn-add-row,
.pr-export-mode .pr-btn-delete-row,
.pr-export-mode .pr-btn-export,
.pr-export-mode .pr-btn-toggle,
.pr-export-mode .pr-edit-hint,
.pr-export-mode .pr-talking-points { display: none !important; }
.pr-export-mode { background: #fff !important; }
.pr-export-mode .pr-section { page-break-inside: avoid; }
.pr-export-mode .pr-section-major { page-break-before: always; }
```

- [ ] **Step 4: Test PDF export**

Click export button, verify PDF generates with correct filename, correct formatting, no edit controls visible.

- [ ] **Step 5: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js graduation-roadmap.html
git commit -m "feat(pr-tab): add section 12 - PDF export via html2pdf.js"
```

---

## Task 10: Event Listeners + Final Wiring

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js`

- [ ] **Step 1: Write `attachPREventListeners()`**

Central function called after tab content is set in `initPeriodicReview()`. Attaches:
- Click-to-edit on admin stats cells
- Input handlers on textareas (discrepancy notes, department notes, completed procedures paste-in)
- Toolbar button clicks for rich text editor
- ContentEditable `input` event with debounced save
- Add/Delete row buttons for in-progress procedures
- Expand/Collapse toggle for patient writeups
- Inline edit blur handlers for patient fields
- Export PDF button click
- Review date edit click

- [ ] **Step 2: Test all interactive features end-to-end**

1. Switch to PR Review tab - all sections render
2. Edit review date - persists after tab switch
3. Type in discrepancy notes - persists
4. Click admin stat cell to override - persists
5. Paste procedure text - preview renders
6. Add/delete in-progress procedure row - persists
7. Type department notes - persists
8. Toggle PR1 reference - shows/hides
9. Type in subjective report with formatting - persists
10. Edit patient "Next Appointment" - persists
11. Expand/collapse patient cards - works
12. Edit patient field inline - persists
13. Click Export PDF - downloads correctly

- [ ] **Step 3: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js
git commit -m "feat(pr-tab): wire up all event listeners and interactive features"
```

---

## Task 11: Final Verification + Deploy

**Files:**
- All modified files

- [ ] **Step 1: Verify all 4 Firebase merge sites**

```bash
grep -n 'periodicReviews' js/graduation-roadmap/firebase-sync.js
```
Must show 4+ matches.

- [ ] **Step 2: Verify isEmptyState includes periodicReviews**

```bash
grep -n 'hasPeriodicReview\|periodicReview' js/graduation-roadmap/state.js
```

- [ ] **Step 3: Verify brace balance on ALL modified files**

```bash
for f in js/graduation-roadmap/state.js js/graduation-roadmap/firebase-sync.js js/graduation-roadmap/patients.js js/graduation-roadmap/periodic-review.js; do echo "$f:"; python3 -c "c=open('$f').read(); print('{:', c.count('{'), '}:', c.count('}'))"; done
```

All must show equal brace counts.

- [ ] **Step 4: Verify cache-busting versions bumped**

```bash
grep 'v=20260322' graduation-roadmap.html | head -15
```

All scripts should show `?v=20260322b` (or later).

- [ ] **Step 5: Final commit if any remaining changes**

```bash
git add -A
git status
```

If clean, proceed to push. If changes, commit with descriptive message.

- [ ] **Step 6: Push to deploy**

```bash
git push origin main
```

Live in ~30s at suleman7-dmd.github.io/dental-quest/graduation-roadmap.html

- [ ] **Step 7: Verify live deployment**

Open the live URL, enter PIN, navigate to PR Review tab, verify all sections render and PDF export works.
