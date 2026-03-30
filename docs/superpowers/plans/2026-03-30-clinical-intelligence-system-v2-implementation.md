# Clinical Intelligence System v2 — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan. Each task is executed by a fresh implementation subagent, then a QA/debugging subagent reviews the work before proceeding. Steps use checkbox (`- [ ]`) syntax for tracking.

## Execution Protocol: Subagent-Driven with QA Gates

**Every task follows this two-stage cycle:**

```
Stage 1: IMPLEMENTATION AGENT (per task)
  - Fresh subagent receives: task description + relevant file context
  - Executes all steps in the task
  - Runs the task's verification commands
  - Reports: files changed, verification output, any concerns

Stage 2: QA/DEBUGGING AGENT (after every task)
  - Fresh subagent receives: task description + diff of changes + verification output
  - Runs independent checks:
    1. Brace balance on ALL modified files (not just the task's target)
    2. grep for dangling references to old function names or stores
    3. Verify saveData() still has 6 guards in firebase-sync.js
    4. Verify isEmptyState() check count hasn't decreased
    5. Verify no new Date('YYYY-MM-DD') date parsing violations
    6. Verify all user text in innerHTML uses escapeHtml()
    7. Verify no undefined values in Firebase-bound objects (?? null safety)
    8. Cross-check: does the change match the spec section it implements?
  - Verdict: PASS (proceed to next task) or FAIL (file issues for implementation agent to fix before proceeding)
  - On FAIL: implementation agent gets the QA report and fixes; QA re-reviews (max 2 retries, then escalate to user)
```

**Phase-level QA gate:** After all tasks in a phase complete, run the Phase Verification Checklist as a dedicated QA agent before starting the next phase.

**QA agent checklist template** (run after EVERY task):
```bash
# 1. Brace balance — ALL JS modules (not just the one edited)
python3 -c "
for f in ['js/graduation-roadmap/state.js', 'js/graduation-roadmap/clinical.js', 'js/graduation-roadmap/firebase-sync.js', 'js/graduation-roadmap/patients.js', 'js/graduation-roadmap/import-system.js', 'js/graduation-roadmap/init.js', 'js/graduation-roadmap/periodic-review.js']:
    c = open(f).read(); o = c.count('{'); cl = c.count('}')
    if o != cl: print(f'FAIL {f}: open={o} close={cl}')
print('Brace balance: all OK' if True else '')
"

# 2. Save guards intact
python3 -c "
c = open('js/graduation-roadmap/firebase-sync.js').read()
guards = ['isInitialLoad', 'hasLoadedFromCloud', 'isEmptyState', '_dataLoaded', 'pinValidated', 'validateStateIntegrity']
for g in guards:
    if g not in c: print(f'FAIL: guard {g} missing from saveData()')
print('Save guards: all present')
"

# 3. No raw Date constructor with string
grep -rn "new Date('[0-9]" js/graduation-roadmap/*.js | head -5
# Expected: 0 lines

# 4. No undefined in Firebase paths (check for missing ?? null)
grep -n "undefined" js/graduation-roadmap/state.js js/graduation-roadmap/firebase-sync.js | grep -v "typeof\|===\|!==\|void\|//" | head -5

# 5. Diff review — show what changed
git diff --stat
```

**Goal:** Unify the patient data layer, import pipeline, and competency model across the Patients/Clinical/Competencies tabs in graduation-roadmap, replacing dual stores, ad-hoc propagation, and broken appointment-to-competency linking with a single canonical store, single import pipeline, smart auto-link engine, and centralized propagation function.

**Architecture:** Single patient store (`patientRecords{}`), one import pipeline (`confirmUnifiedImport()`), centralized `propagateClinicalChanges()` replacing ad-hoc render calls, shared cascade functions for all delete/uncomplete operations, and `autoLinkProcedureToCompetencies()` with keyword matching + review queue. Competencies promoted to top-level tab with milestone dashboard, unlock chains, and search/filter.

**Tech Stack:** Vanilla JS (no build system), Firebase Realtime Database, single HTML file + 12 JS modules. Push to `main` = live in ~30s.

**Spec:** `docs/superpowers/specs/2026-03-30-clinical-intelligence-system-v2-design.md`

---

## Audit Corrections (10 items — integrated into tasks below)

| # | Correction | Affects |
|---|-----------|---------|
| 1 | Migration must remap ALL foreign key references (appointments, procedures, competency entries, planner tasks) using an `idRemapTable` | Task 1.7 |
| 2 | `d3Deadline` must use ISO date strings (`'2026-05-01'`), not human text (`'May 2026'`). Display formatted in UI. | Tasks 1.2, 4.4 |
| 3 | Definitive list of exactly 7 `isSummative: true` items (the 7 clinical summatives from SPS) | Task 1.2 |
| 4 | `completeAppointment()` must guard against non-procedural appointments (empty/whitespace `apt.procedures`) | Task 3.2 |
| 5 | `unlockedBy` changed from single object to array for AND logic: `[{ id, required }]` | Tasks 1.2, 1.6 |
| 6 | `cascadeDeletePatient()` delegates to `cascadeDeleteAppointment(aptId, { skipPropagation: true })` instead of duplicating | Task 1.5 |
| 7 | `propagateClinicalChanges()` gets `dashboard` and `calendars` granularity flags (default true) | Task 1.4 |
| 8 | `inferProcedureType()` explicitly defined using KEYWORD_PATTERNS | Task 3.2 |
| 9 | `docs/000-INSTRUCTIONS.md` updated with 4 new `fixed-*` requirement IDs | New Task 3.6 |
| 10 | Appointment modal patient dropdown reads from `patientRecords{}` (not empty `patients{}`) | Task 3.3 |
| 11 | Review queue schema must include `patientId` field — used by cascade delete filter + FK remapping | Tasks 1.6, 1.7 |
| 12 | Migration wiring moved from Phase 4 to Phase 1 (Task 1.7) — Phases 2-3 assume unified store exists | Task 1.7 |
| 13 | `restoreCheckpoint()` must clear migration localStorage flags (`unifiedPatientStoreDone_v1`, `competencyEnhancementsDone_v1`) | Task 1.3 |
| 14 | `migrateCompetencyEnhancements()` required — `mergeCompetencies()` only preserves completed/completionEntries/status, not new fields | Task 1.2b |
| 15 | FK remapping must include `periodicReviews.pr2.removedPatients`, `pr2.patientNotes`, `pr2.inProgressProcedures` | Task 1.7 |
| 16 | 4 critical consumer functions read from empty `patients{}` post-migration — must redirect to `patientRecords{}` | Task 3.5b |
| 17 | `propagateClinicalChanges()` patients branch must include `renderActiveRoster()` | Task 1.4 |
| 18 | `inferProcedureType()` must derive from `KEYWORD_PATTERNS` (single source of truth), not maintain parallel typeMap | Task 3.2 |

---

## File Map

| File | Lines | Role in CIS v2 |
|------|-------|-----------------|
| `js/graduation-roadmap/state.js` | 1,421 | New: `propagateClinicalChanges()`, 4 cascade functions, `autoLinkProcedureToCompetencies()`, `matchProcedureToCompetencies()`, `isItemUnlocked()`, `recalculatePatientLastVisit()`, `KEYWORD_PATTERNS` const. Modified: `getDefaultRoadmapData()`, `isEmptyState()`, `roadmapData` declaration |
| `js/graduation-roadmap/clinical.js` | 2,395 | Modified: `DEFAULT_COMPETENCIES` enhanced with new fields + 4 new items, `completeAppointment()` redesigned, CRUD rewired to cascades, Active Roster replaces "My Patients", `renderCompetencies()` massively enhanced, `buildCompetencyChecklist()` unlock-aware |
| `js/graduation-roadmap/firebase-sync.js` | 2,643 | Modified: all 6 merge/restore sites + `validateStateIntegrity()` for new fields |
| `js/graduation-roadmap/patients.js` | 3,238 | New: `migrateToUnifiedPatientStore()`, `openUnifiedImportModal()`, `confirmUnifiedImport()`. Modified: `getPatientRecords()` simplified, bug fixes |
| `js/graduation-roadmap/import-system.js` | 681 | Retired: `confirmClinicalImport()` + 5 helpers. Kept: `syncClinicalToMonthlyPlanner()`, `calculateEndTime()`, `timeToMinutes()`, `dedupAppointments()`, lecture functions |
| `js/graduation-roadmap/init.js` | 1,041 | Modified: `initUI()` adds migration call |
| `js/graduation-roadmap/periodic-review.js` | 2,015 | Modified: `renderPRPatientWriteups()` adds txSummaryBU field |
| `graduation-roadmap.html` | 10,742 | Modified: nav bar reorder, Clinical sub-tabs (Active Roster), Competencies tab massive new HTML/CSS |

---

## Dependency Graph

```
Phase 1 (Data Foundation)
  Group A (parallel - schema changes, no cross-file deps):
  |  Task 1.1: state.js defaults + globals
  |  Task 1.2: clinical.js DEFAULT_COMPETENCIES enhancement
  |  Task 1.3: firebase-sync.js all 6 merge/restore sites (+ clear migration flags on restore)
  |
  Task 1.2b: migrateCompetencyEnhancements() migration function (depends on 1.2)
  |
  Group B (parallel - depends on Group A + 1.2b):
  |  Task 1.4: state.js propagateClinicalChanges()
  |  Task 1.5: state.js cascade functions
  |  Task 1.6: state.js auto-link engine + keyword patterns (depends on 1.1 AND 1.2)
  |  Task 1.7: patients.js migrateToUnifiedPatientStore() + initUI wiring (depends on 1.1 AND 1.3)
  |
  Task 1.8: isEmptyState + validateStateIntegrity (depends on Group A)

Phase 2 (Import Pipeline) - depends on Phase 1
  Task 2.1: Bug fix - empty REQUIREMENTS_MATCH (independent)
  Task 2.2: Bug fix - reqId case normalization (independent)
  Task 2.3: patients.js confirmUnifiedImport() (depends on 1.4, 1.6, 2.1, 2.2)
  Task 2.4: patients.js openUnifiedImportModal() (depends on 2.3)
  Task 2.5: import-system.js retire confirmClinicalImport (depends on 2.4)

Phase 3 (Clinical Tab Redesign) - depends on Phase 1
  Task 3.1: Active Roster sub-tab (depends on 1.7)
  Task 3.2: completeAppointment() redesign (depends on 1.4, 1.5, 1.6)
  Task 3.3: Wire all Clinical CRUD to cascades + propagation (depends on 1.4, 1.5)
  Task 3.4: Clinical tab import button rewire (depends on 2.4)
  Task 3.5: txSummaryBU in PR writeups (independent)
  Task 3.5b: Redirect 4 critical consumers from patients{} to patientRecords{} (depends on 1.7)
  Task 3.6: Update 000-INSTRUCTIONS.md (depends on 1.2)

Phase 4 (Competencies Tab UI) - depends on Phases 1-3
  Group A (parallel - HTML/CSS foundation):
  |  Task 4.1: Nav bar reorder + tab routing
  |  Task 4.2: Competencies tab HTML skeleton + CSS
  |
  Group B (parallel - dashboard sections, depend on 4.2):
  |  Task 4.3: Milestone dashboard (3 progress rings)
  |  Task 4.4: D3 deadline alert bar
  |  Task 4.5: What's Next panel (unhide + enhance)
  |  Task 4.6: Review queue UI
  |
  Group C (parallel - category enhancements, depend on 4.2):
  |  Task 4.7: Unlock chain visualization
  |  Task 4.8: Full evidence trail with rich cards
  |  Task 4.9: "Which patients can fulfill this?" badges
  |  Task 4.10: Critical rules display per category
  |  Task 4.11: Pace projection per category
  |
  Group D (parallel - interactive features, depend on 4.2):
  |  Task 4.12: Search and filter bar
  |  Task 4.13: Inline quick-record modal
  |  Task 4.14: Persistent expanded state (competencyUIState)
  |  Task 4.15: Urgency-sorted category accordion
  |  Task 4.16: By Patient view mode toggle
  |  Task 4.17: Inline editable per-item notes
  |
  Task 4.18: Final wiring + verification (depends on all Phase 4 tasks)

Phase 5 (Integration and Verification) - depends on everything
  Tasks 5.1-5.14: End-to-end verification scenarios
  Task 5.15: Cache-busting script tags
```

---

## Phase 1: Data Foundation

> MUST complete before any other phase. Creates the unified data layer, propagation system, cascade functions, and auto-link engine.

---

### Task 1.1: Schema Changes in state.js

**Files:**
- Modify: `js/graduation-roadmap/state.js:35-216` (roadmapData declaration + getDefaultRoadmapData)
- Modify: `js/graduation-roadmap/state.js:227` (clinicalDataDirty area)

**Depends on:** Nothing (foundation task)

- [ ] **Step 1: Add `competencyUIState` to `roadmapData` initial declaration (line ~35)**

Inside the `let roadmapData = { ... }` block, add after the `periodicReviews` block (~line 128):

```javascript
competencyUIState: {
    expandedCategories: [],
    viewMode: 'department'
},
```

- [ ] **Step 2: Add `autoLinkReviewQueue` to clinicalData in roadmapData declaration**

In the `clinicalData` sub-object (~line 95), add after `missingNotes: {}`:

```javascript
autoLinkReviewQueue: [],
```

- [ ] **Step 3: Mirror both additions in `getDefaultRoadmapData()` (line 131-216)**

Add the same two fields at matching locations in the returned object.

- [ ] **Step 4: Add `KEYWORD_PATTERNS` const after `PROCEDURE_TYPES` (line ~654)**

```javascript
const KEYWORD_PATTERNS = [
    // Fixed Prosthodontics
    { keywords: ['crown', 'prep', 'fpd', 'bridge', 'pfm', 'e.max', 'emax', 'zirconia'], ids: ['fixed-form-prep', 'fixed-sum-prep'], confidence: 'high' },
    { keywords: ['provisional', 'temp crown', 'temporary'], ids: ['fixed-form-prov', 'fixed-sum-temp'], confidence: 'high' },
    { keywords: ['cementation', 'cement', 'seat crown', 'seat bridge'], ids: ['fixed-form-cement', 'fixed-sum-cement'], confidence: 'high' },
    { keywords: ['final impression', 'pvs', 'digital scan', 'intraoral scan'], ids: ['fixed-form-impr', 'fixed-sum-impr'], confidence: 'high' },
    { keywords: ['cerec', 'same-day', 'same day restoration'], ids: ['fixed-cerec'], confidence: 'high' },
    { keywords: ['implant crown', 'implant supported', 'implant-supported'], ids: ['fixed-implant'], confidence: 'high' },
    // Operative
    { keywords: ['class v', 'cl 5', 'class 5'], ids: ['op-class5-1', 'op-class5-2'], confidence: 'high' },
    { keywords: ['composite', 'do ', 'mo ', 'mod', 'class ii', 'class iii', 'class iv', 'class 2', 'class 3', 'class 4', 'multisurface'], ids: ['op-multi-1-6'], confidence: 'high' },
    // SRP / Perio
    { keywords: ['srp', 'scaling', 'root planing', 'quadrant scaling'], ids: ['perio-form-quad', 'perio-sum-calc'], confidence: 'high' },
    { keywords: ['prophy', 'prophylaxis', 'cleaning', 'adult prophy'], ids: ['perio-form-prophy', 'perio-sum-prophy'], confidence: 'high' },
    { keywords: ['ohi', 'oral hygiene instruction', 'home care instruction'], ids: ['perio-form-ohi', 'perio-sum-hci'], confidence: 'high' },
    { keywords: ['re-eval', 're-evaluation', 'reeval', 'gingivitis re-eval'], ids: ['perio-form-reeval-ging', 'perio-sum-reeval-ging'], confidence: 'high' },
    { keywords: ['recall', 'maintenance', 'perio maintenance'], ids: ['perio-form-recall', 'perio-sum-recall'], confidence: 'high' },
    { keywords: ['periodontal diagnosis', 'perio dx', 'perio diagnosis'], ids: ['perio-form-dx', 'perio-sum-dx'], confidence: 'high' },
    { keywords: ['impression', 'alginate', 'study model'], ids: ['perio-form-impr', 'perio-sum-impr'], confidence: 'high' },
    // Endo
    { keywords: ['rct', 'root canal', 'endodontic'], ids: ['endo-rct-1', 'endo-rct-2'], confidence: 'high' },
    { keywords: ['pulpectomy', 'pulp therapy'], ids: ['endo-pulp-1', 'endo-pulp-2'], confidence: 'high' },
    // Oral Surgery
    { keywords: ['extraction', 'ext #', 'surgical extraction', 'exo'], ids: ['os-extract-1', 'os-extract-2'], confidence: 'high' },
    // Dentures (medium - less specific text)
    { keywords: ['denture', 'cu/cl', 'complete denture', 'cd'], ids: ['cd-form-prelim', 'cd-form-border', 'cd-form-jaw', 'cd-form-try', 'cd-form-process', 'cd-form-insert', 'cd-form-adjust'], confidence: 'medium' },
    { keywords: ['overdenture', 'implant denture'], ids: ['cd-over-dup', 'cd-over-abut'], confidence: 'medium' },
    // RPD (medium)
    { keywords: ['rpd', 'partial denture', 'removable partial', 'flexible partial'], ids: ['rpd-track1', 'rpd-track2', 'rpd-track3'], confidence: 'medium' },
    // Peds
    { keywords: ['sealant', 'pit and fissure'], ids: ['peds-sealants'], confidence: 'high' },
    // Group Practice
    { keywords: ['written analysis', 'wa '], ids: ['gp-form-analysis', 'gp-sum-analysis'], confidence: 'high' },
    // Treatment Planning
    { keywords: ['ohra'], ids: ['tx-ohra'], confidence: 'high' },
];
```

- [ ] **Step 5: Verify brace balance**

```bash
python3 -c "c=open('js/graduation-roadmap/state.js').read(); print('state.js {:', c.count('{'), '}:', c.count('}'))"
```

- [ ] **Step 6: Commit**

```bash
git add js/graduation-roadmap/state.js
git commit -m "feat(cis-v2): add competencyUIState, autoLinkReviewQueue defaults, KEYWORD_PATTERNS"
```

---

### Task 1.2: Enhance DEFAULT_COMPETENCIES in clinical.js

**Files:**
- Modify: `js/graduation-roadmap/clinical.js:686-977` (DEFAULT_COMPETENCIES)

**Depends on:** Nothing (parallel with 1.1 and 1.3)

- [ ] **Step 1: Add new item fields to ALL existing items (~143 items)**

For every item in all 13 categories, add after the existing `note: ''` field:

```javascript
d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false,  // unlockedBy: [{id, required}] | null (array for AND logic)
```

- [ ] **Step 2: Set `d3Deadline` on D3-specific items (AUDIT #2: use ISO dates)**

**All `d3Deadline` values must be ISO format (`'2026-05-01'`), NOT human text.** Display as "May 2026" in UI using a formatter. Parse with `const [y,m,d] = str.split('-').map(Number); new Date(y, m-1, d);`

Key items: all `perio-form-*` and `perio-sum-*` items get `d3Deadline: '2026-05-01'`. Also `op-mock-board: '2026-05-01'`, all `fixed-form-*: '2026-05-01'`, and GP D3 items (`gp-form-review-1`, `gp-form-review-2`, `gp-form-analysis`, `gp-form-pms`: all `'2026-05-01'`).

- [ ] **Step 3: Set `unlockedBy` on summative items (AUDIT #5: array format for AND logic)**

**`unlockedBy` is now an ARRAY for multi-prerequisite AND logic:** `[{ id, required }] | null`. `isItemUnlocked()` checks ALL entries are satisfied.

Per spec Section 4.5 unlock chains (single prereq — array with one entry):
- `perio-sum-hci`: `[{ id: 'perio-form-ohi', required: 2 }]`
- `perio-sum-prophy`: `[{ id: 'perio-form-prophy', required: 5 }]`
- `perio-sum-calc`: `[{ id: 'perio-form-quad', required: 3 }]`
- `perio-sum-reeval-ging`: `[{ id: 'perio-form-reeval-ging', required: 3 }]`
- `perio-sum-reeval-srp`: `[{ id: 'perio-form-reeval-srp', required: 1 }]`
- `perio-sum-impr`: `[{ id: 'perio-form-impr', required: 3 }]`
- `perio-sum-recall`: `[{ id: 'perio-form-recall', required: 6 }]`
- `perio-sum-dx`: `[{ id: 'perio-form-dx', required: 4 }]`

Multi-prerequisite (AND logic — all must be satisfied):
- All `fixed-sum-*` items: `[{ id: 'fixed-form-prep', required: 6 }, { id: 'fixed-form-prov', required: 6 }, { id: 'fixed-form-cement', required: 6 }, { id: 'fixed-form-impr', required: 6 }]`
- All `cd-sum-*` items: `[{ id: 'cd-form-prelim', required: varies }, ...(all 7 cd-form-* items)]`
- All `op-sum-*` items: `[{ id: 'op-formatives', required: 20 }]`

- [ ] **Step 4: Set `isSummative: true` on exactly these 7 items (AUDIT #3: definitive list)**

**The "7 Clinical Summatives Passed" graduation milestone counts EXACTLY these 7 SPS summative exams** (verified against 000-REQUIREMENTS.md and the SPS system). Many items have `-sum-` in their IDs but are formative assessments or departmental summatives that don't count toward the graduation milestone.

The 7 items that get `isSummative: true`:
1. `perio-sum-prophy` — Periodontal Prophylaxis Summative
2. `perio-sum-calc` — Calculus Removal (SRP) Summative
3. `perio-sum-hci` — Home Care Instruction Summative
4. `fixed-sum-prep` — Fixed Prosthodontics Crown Prep Summative
5. `fixed-sum-cement` — Fixed Prosthodontics Cementation Summative
6. `op-sum-class5` — Operative Class V Summative
7. `op-sum-multi` — Operative Multisurface Summative

All other `-sum-` items (e.g., `cd-sum-*`, remaining `perio-sum-*`, `fixed-sum-temp`, `fixed-sum-impr`) are departmental summatives that track graduation requirements but do NOT count toward the "7 Summatives Passed" milestone. They keep `isSummative: false`.

**Verify:** After implementation, `Object.values(competencies).flatMap(c => c.sections.flatMap(s => s.items)).filter(i => i.isSummative).length` must equal exactly 7.

- [ ] **Step 5: Set `unlockEmailTo` where applicable**

Fixed summatives: `'gdadmin@bu.edu'`. CD summatives: `'gdadmin@bu.edu'`. Operative summatives: `'Dr. McManama'`.

- [ ] **Step 6: Set `rules` on items with critical rules**

Perio summatives: `'Must initiate in SPS BEFORE procedure'`. Operative: `'Max 4 summatives with same faculty'`. Fixed formatives: `'Must email Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives'`. RPD tracks 2-3: `'Flexible/interim RPD must have >=2 clasps AND replace >=3 teeth'`.

- [ ] **Step 7: Add 4 new `fixed-*` clinical experience items**

New section "Clinical Experience" in the `fixed` category:

```javascript
{ title: 'Clinical Experience', items: [
    { id: 'fixed-units', text: 'Minimum clinical units (start to completion)', required: 10, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
    { id: 'fixed-fpd', text: 'Must include 1 FPD', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
    { id: 'fixed-implant', text: 'Must include 1 Implant-Supported Crown', required: 1, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
    { id: 'fixed-cerec', text: 'Must include minimum 3 CEREC restorations', required: 3, completed: 0, status: 'pending', completionEntries: [], note: '', d3Deadline: null, unlockedBy: null, unlockEmailTo: null, isSummative: false, rules: null, custom: false },
]}
```

- [ ] **Step 8: Verify brace balance and commit**

```bash
python3 -c "c=open('js/graduation-roadmap/clinical.js').read(); print('clinical.js {:', c.count('{'), '}:', c.count('}'))"
git add js/graduation-roadmap/clinical.js
git commit -m "feat(cis-v2): enhance DEFAULT_COMPETENCIES with d3Deadline, unlockedBy, isSummative, rules, 4 new fixed items"
```

---

### Task 1.2b: Build migrateCompetencyEnhancements() in clinical.js

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (insert after `ensureCompetenciesInitialized()`)

**Depends on:** Task 1.2

- [ ] **Step 1: Add `migrateCompetencyEnhancements()` function**

Gated by `localStorage.getItem('competencyEnhancementsDone_v1')`. Walks all existing competency items in `roadmapData.clinicalData.competencies`. For each item, finds the matching item in `DEFAULT_COMPETENCIES` by ID and spreads new fields with `?? null`/`?? false` to never overwrite existing values.

```javascript
function migrateCompetencyEnhancements() {
    if (localStorage.getItem('competencyEnhancementsDone_v1')) return;
    const comp = roadmapData.clinicalData?.competencies;
    if (!comp || typeof comp !== 'object') return;

    // Build lookup from DEFAULT_COMPETENCIES
    const defaults = {};
    DEFAULT_COMPETENCIES.forEach(cat => {
        (cat.sections || []).forEach(sec => {
            (sec.items || []).forEach(item => { defaults[item.id] = item; });
        });
    });

    // Walk existing items and spread new fields from defaults
    Object.values(comp).forEach(cat => {
        getValues(cat.sections).forEach(sec => {
            const items = sec.items || {};
            Object.values(items).forEach(item => {
                const def = defaults[item.id];
                if (!def) return;
                item.d3Deadline = item.d3Deadline ?? def.d3Deadline ?? null;
                item.unlockedBy = item.unlockedBy ?? def.unlockedBy ?? null;
                item.unlockEmailTo = item.unlockEmailTo ?? def.unlockEmailTo ?? null;
                item.isSummative = item.isSummative ?? def.isSummative ?? false;
                item.rules = item.rules ?? def.rules ?? null;
                item.custom = item.custom ?? def.custom ?? false;
            });
        });
    });

    localStorage.setItem('competencyEnhancementsDone_v1', '1');
    console.log('[CIS-v2] Migrated competency enhancement fields to existing items');
}
```

- [ ] **Step 2: Wire into initUI() after `ensureCompetenciesInitialized()`**

```javascript
try { migrateCompetencyEnhancements(); } catch(e) { console.error('migrateCompetencyEnhancements error:', e); }
```

- [ ] **Step 3: Verify and commit**

```bash
grep "function migrateCompetencyEnhancements" js/graduation-roadmap/clinical.js  # 1
grep "competencyEnhancementsDone_v1" js/graduation-roadmap/clinical.js           # >=2
git add js/graduation-roadmap/clinical.js js/graduation-roadmap/init.js
git commit -m "feat(cis-v2): add migrateCompetencyEnhancements to propagate new fields to existing users"
```

---

### Task 1.3: Update All 6 Merge/Restore Sites in firebase-sync.js

**Files:**
- Modify: `js/graduation-roadmap/firebase-sync.js` at 6 locations:
  - `mergeRemoteCollectionsIntoLocal()` (line 130-342)
  - `restoreBackup()` (line 425-509)
  - `mergeRemoteState()` (line 862-1003)
  - `loadFromLocalStorage()` (line 1010-1153)
  - `restoreCheckpoint()` (line 1776-1869)
  - `importAndRestoreDirectly()` (line 2071-2189)
  - `validateStateIntegrity()` (line 2385-2442)

**Depends on:** Nothing (parallel with 1.1 and 1.2)

- [ ] **Step 1: Update `mergeRemoteCollectionsIntoLocal()` (line 130)**

After the `missingNotes` merge (~line 183), add autoLinkReviewQueue union by procedureId. After `periodicReviews` merge (~line 312), add competencyUIState merge (remote wins). Also add transitional `patients{}` to `patientRecords{}` fill-merge using `normalizeChartNumber()` + `findByNormalizedChart()`.

- [ ] **Step 2: Update `mergeRemoteState()` (line 862)**

In clinicalData reconstruction (~line 918), add `autoLinkReviewQueue` field. After clinicalData, add `competencyUIState` field.

- [ ] **Step 3: Update `loadFromLocalStorage()` (line 1010)**

In state reconstruction (~line 1062), add both fields to clinicalData and top-level.

- [ ] **Step 4: Update `restoreCheckpoint()` (line 1776)**

In state reconstruction (~line 1811), add both fields.

**CRITICAL: Clear migration localStorage flags on restore.** After the state reconstruction block, add:

```javascript
// Clear migration flags so migrations re-run against restored data
localStorage.removeItem('unifiedPatientStoreDone_v1');
localStorage.removeItem('competencyEnhancementsDone_v1');
```

Without this, restoring a pre-migration checkpoint leaves the flags set. Migrations won't re-run, and the app sees incomplete `patientRecords{}` while `patients{}` has the old data. The migrations are idempotent and checkpoint-safe — they create their own checkpoints and skip if already done.

- [ ] **Step 5: Update `restoreBackup()` (line 425)**

In field-by-field reconstruction (~line 459), add both fields.

- [ ] **Step 6: Update `importAndRestoreDirectly()` (line 2071)**

In state reconstruction (~line 2122), add both fields.

- [ ] **Step 7: Update `validateStateIntegrity()` (line 2385)**

After competencies check (~line 2439), add:
- `autoLinkReviewQueue` must be array if present
- `competencyUIState` must be object if present

- [ ] **Step 8: Verify coverage and commit**

```bash
grep -c "autoLinkReviewQueue" js/graduation-roadmap/firebase-sync.js  # Expected: >=12
grep -c "competencyUIState" js/graduation-roadmap/firebase-sync.js    # Expected: >=12
python3 -c "c=open('js/graduation-roadmap/firebase-sync.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"
git add js/graduation-roadmap/firebase-sync.js
git commit -m "feat(cis-v2): update all 6 merge/restore sites for autoLinkReviewQueue, competencyUIState, transitional patients merge"
```

---

### Task 1.4: Build propagateClinicalChanges() in state.js

**Files:**
- Modify: `js/graduation-roadmap/state.js` (insert after `navigateToEntity()` at ~line 1240)

**Depends on:** Task 1.1

- [ ] **Step 1: Add function (AUDIT #7: dashboard/calendars granularity flags)**

```javascript
function propagateClinicalChanges({ appointments = false, procedures = false, competencies = false, patients = false, dashboard = true, calendars = true, source = '' } = {}) {
    clinicalDataDirty = true;
    if (appointments) {
        if (typeof syncClinicalToMonthlyPlanner === 'function') syncClinicalToMonthlyPlanner();
        if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
        if (typeof rebuildUpcomingDeadlines === 'function') rebuildUpcomingDeadlines();
    }
    if (procedures || competencies) {
        if (typeof renderCompetencies === 'function') renderCompetencies();
    }
    if (patients) {
        if (typeof renderPatientsSidebar === 'function') renderPatientsSidebar();
        if (typeof renderCountdownRadar === 'function') renderCountdownRadar();
        if (typeof renderActiveRoster === 'function') renderActiveRoster();  // AUDIT #17: Active Roster must refresh on patient changes
    }
    if (dashboard && typeof renderDashboard === 'function') renderDashboard();
    if (calendars && typeof mpRenderAllCalendars === 'function') mpRenderAllCalendars();
    // NOTE: Does NOT call saveData(). Caller controls save timing.
}
```

**Callers:** Lightweight competency-only operations (`adjustCompItem`, `setCompItemStatus`) pass `{ competencies: true, dashboard: false, calendars: false }`. Import, delete, and appointment operations keep defaults (all true).
```

- [ ] **Step 2: Verify and commit**

```bash
python3 -c "c=open('js/graduation-roadmap/state.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"
git add js/graduation-roadmap/state.js
git commit -m "feat(cis-v2): add propagateClinicalChanges() centralized propagation"
```

---

### Task 1.5: Build Cascade Functions in state.js

**Files:**
- Modify: `js/graduation-roadmap/state.js` (insert after propagateClinicalChanges)

**Depends on:** Task 1.4

- [ ] **Step 1: Add `recalculatePatientLastVisit(patientId)`**

Finds all completed appointments for patient, sets `lastVisit` to most recent date or empty string.

- [ ] **Step 2: Add `cascadeDeleteProcedure(procId)`**

Calls `unlinkProcedureFromCompetencies()`, deletes from `completedProcedures`, calls `propagateClinicalChanges({ procedures: true, competencies: true })`.

- [ ] **Step 3: Add `cascadeDeleteAppointment(aptId, options)` (AUDIT #6: accepts skipPropagation)**

```javascript
function cascadeDeleteAppointment(aptId, { skipPropagation = false } = {}) {
```

Finds+deletes linked procedures (with unlink), hides planner task, unmarks planner/deadline, cleans custom deadlines by `clinicalAptId`, deletes appointment, recalculates patient `lastVisit`. **Only calls `propagateClinicalChanges()` if `skipPropagation` is false.** When called standalone it propagates; when called from `cascadeDeletePatient` it doesn't (parent propagates once at the end).

- [ ] **Step 4: Add `cascadeDeletePatient(patientId)` (AUDIT #6: delegates to cascadeDeleteAppointment)**

**Does NOT duplicate appointment cleanup logic.** Instead:
1. Finds all appointments for patient
2. Calls `cascadeDeleteAppointment(apt.id, { skipPropagation: true })` for EACH — this handles procedure deletion, planner cleanup, deadline cleanup
3. Finds orphaned procedures (by patientId, not linked to any appointment)
4. Deletes patient record from `patientRecords{}`
5. Removes from `autoLinkReviewQueue`
6. Calls `propagateClinicalChanges()` ONCE at the end with all flags true

- [ ] **Step 5: Add `cascadeUncompleteAppointment(aptId)`**

Resets status to 'scheduled', deletes `completedAt`, cascades procedure deletion, unmarks deadline/planner, recalculates `lastVisit`, propagates.

- [ ] **Step 6: Verify and commit**

```bash
grep "^function cascade" js/graduation-roadmap/state.js  # Expected: 4 lines
python3 -c "c=open('js/graduation-roadmap/state.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"
git add js/graduation-roadmap/state.js
git commit -m "feat(cis-v2): add cascade functions for patient, appointment, procedure, uncomplete"
```

Full function bodies are in the spec Sections 10.1-10.5. Copy the exact implementations from there, adapting `typeof fn === 'function'` guards for cross-module calls.

---

### Task 1.6: Build Auto-Link Engine in state.js

**Files:**
- Modify: `js/graduation-roadmap/state.js` (insert after cascade functions)

**Depends on:** Tasks 1.1 (KEYWORD_PATTERNS) AND 1.2 (enhanced competencies — `isItemUnlocked` reads `unlockedBy` field added by 1.2)

- [ ] **Step 1: Add `isItemUnlocked(item, competencies)` (AUDIT #5: array unlockedBy)**

`unlockedBy` is now an array: `[{ id, required }] | null`. Returns `true` if item has no `unlockedBy`, or if ALL prerequisite items satisfy `completed >= required` (AND logic). Advisory only — does not block recording.

```javascript
function isItemUnlocked(item, competencies) {
    if (!item.unlockedBy || !Array.isArray(item.unlockedBy) || item.unlockedBy.length === 0) return true;
    return item.unlockedBy.every(prereq => {
        const prereqItem = findCompetencyItem(prereq.id);
        if (!prereqItem) return true; // Prereq not found = treat as unlocked
        return prereqItem.completed >= prereq.required;
    });
}
```

- [ ] **Step 2: Add `matchProcedureToCompetencies(procedureText, categoryKey, competencies, patientId)`**

Priority 1: If patient has `importedRequirements[]`, use those as authoritative source. Priority 2: Keyword matching against `KEYWORD_PATTERNS`. Returns array of `{ item, confidence, source }`.

- [ ] **Step 3: Add `addToReviewQueue(procedure, suggestions)` (AUDIT #11: must include patientId)**

Deduplicates by procedureId. Pushes to `roadmapData.clinicalData.autoLinkReviewQueue[]`. Each entry MUST include `patientId: procedure.patientId` — required by `cascadeDeletePatient()` filter and FK remapping in migration.

- [ ] **Step 4: Add `autoLinkProcedureToCompetencies(procedure)`**

If procedure already has `competencyItemIds`, uses those directly. Otherwise matches by keyword, filters to items with remaining > 0, checks unlock chains, separates high/low confidence. High confidence: auto-links + toast. Low confidence: queued for review.

- [ ] **Step 5: Add `showAutoLinkToast(matches, procedureId)` helper**

Shows a brief info toast listing what was auto-linked: "✓ Linked to: Crown Prep Formative, Cementation Summative". Used by `autoLinkProcedureToCompetencies()`. Simple implementation: call `showToast()` with a formatted message string built from `matches.map(m => m.item.text).join(', ')`.

- [ ] **Step 6: Add `findPatientByChartOrName(chartNumber, name)` helper**

Used by `confirmUnifiedImport()` for REQUIREMENTS_MATCH handling (spec Section 5.3). Searches `patientRecords{}` by normalized chart number first (using `findByNormalizedChart`), falls back to case-insensitive name match. Returns the patient record or null.

```javascript
function findPatientByChartOrName(chartNumber, name) {
    const records = roadmapData.clinicalData?.patientRecords || {};
    if (chartNumber) {
        const id = findByNormalizedChart(records, chartNumber);
        if (id) return records[id];
    }
    if (name) {
        const nameLower = name.toLowerCase().trim();
        return Object.values(records).find(p => (p.name || '').toLowerCase().trim() === nameLower) || null;
    }
    return null;
}
```

- [ ] **Step 7: Verify and commit**

```bash
grep "function autoLinkProcedureToCompetencies\|function matchProcedureToCompetencies\|function isItemUnlocked\|function addToReviewQueue\|function showAutoLinkToast\|function findPatientByChartOrName" js/graduation-roadmap/state.js
# Expected: 6 lines
git add js/graduation-roadmap/state.js
git commit -m "feat(cis-v2): add auto-link engine with keyword matching + review queue + helpers"
```

Full function bodies are in the spec Section 6.2-6.4.

---

### Task 1.7: Build migrateToUnifiedPatientStore() in patients.js + Wire into initUI

**Files:**
- Modify: `js/graduation-roadmap/patients.js` (insert before `getPatientRecords()` at ~line 422)
- Modify: `js/graduation-roadmap/patients.js:422` (simplify getPatientRecords)
- Modify: `js/graduation-roadmap/patients.js:488` (simplify getAllPatientRecords)
- Modify: `js/graduation-roadmap/init.js:694` (wire migration into initUI)

**Depends on:** Tasks 1.1 AND 1.3 (merge sites must handle unified store before migration runs)

- [ ] **Step 1: Add `migrateToUnifiedPatientStore()`**

Gated by `localStorage.getItem('unifiedPatientStoreDone_v1')`. Creates checkpoint. Iterates `clinicalData.patients{}`, matches to `patientRecords{}` by normalized chart then name, fill-merges matches, creates new entries for unmatched. Sets `clinicalData.patients = {}`.

Full algorithm in spec Section 3.2.

- [ ] **Step 1b: Remap ALL foreign key references (AUDIT #1: critical)**

After patient records are migrated but BEFORE `saveData()`, build an `idRemapTable` mapping old IDs to new canonical IDs, then walk all referencing collections:

```javascript
// Build remap table: { 'pt-17112345': 'pt_079118', ... }
const idRemapTable = {}; // populated during Step 1 when old ID != new ID

// Remap appointments[].patientId
Object.values(roadmapData.clinicalData.appointments || {}).forEach(apt => {
    if (apt.patientId && idRemapTable[apt.patientId]) {
        apt.patientId = idRemapTable[apt.patientId];
    }
});

// Remap completedProcedures[].patientId
Object.values(roadmapData.clinicalData.completedProcedures || {}).forEach(proc => {
    if (proc.patientId && idRemapTable[proc.patientId]) {
        proc.patientId = idRemapTable[proc.patientId];
    }
});

// Remap competency completionEntries[].patientId across ALL categories/sections/items
const comp = roadmapData.clinicalData.competencies;
if (comp && typeof comp === 'object') {
    Object.values(comp).forEach(cat => {
        (cat.sections || []).forEach(sec => {
            (sec.items || []).forEach(item => {
                (item.completionEntries || []).forEach(entry => {
                    if (entry.patientId && idRemapTable[entry.patientId]) {
                        entry.patientId = idRemapTable[entry.patientId];
                    }
                });
            });
        });
    });
}

// Remap monthlyPlanner.customTasks clinic task patient references
Object.values(roadmapData.monthlyPlanner?.customTasks || {}).forEach(task => {
    if (task.patientId && idRemapTable[task.patientId]) {
        task.patientId = idRemapTable[task.patientId];
    }
});

// Remap autoLinkReviewQueue[].patientId
(roadmapData.clinicalData.autoLinkReviewQueue || []).forEach(q => {
    if (q.patientId && idRemapTable[q.patientId]) {
        q.patientId = idRemapTable[q.patientId];
    }
});

// Remap periodicReviews.pr2 patient-keyed sub-objects
const pr2 = roadmapData.periodicReviews?.pr2;
if (pr2) {
    ['removedPatients', 'patientNotes', 'inProgressProcedures'].forEach(field => {
        if (pr2[field] && typeof pr2[field] === 'object') {
            const remapped = {};
            Object.entries(pr2[field]).forEach(([key, val]) => {
                remapped[idRemapTable[key] || key] = val;
            });
            pr2[field] = remapped;
        }
    });
}

console.log('[CIS-v2] Remapped ' + Object.keys(idRemapTable).length + ' patient IDs across all collections');
```

This goes INSIDE `migrateToUnifiedPatientStore()`, after patient record migration and before the localStorage flag is set.

- [ ] **Step 2: Simplify `getPatientRecords()` (line 422)**

Post-migration, remove logic that merges from `clinicalData.patients`. Keep DEFAULT_PATIENT_RECORDS seeding with normalizeChartNumber dedup.

- [ ] **Step 3: Simplify `getAllPatientRecords()` (line 488)**

Post-migration, alias to `getPatientRecords()`. The two-store merge is gone.

- [ ] **Step 4: Wire migration into initUI() (MOVED FROM TASK 4.18)**

**Files:** Also modify `js/graduation-roadmap/init.js:694`

Add migration call in `initUI()` after `ensureCompetenciesInitialized()` (~line 962):

```javascript
try { migrateToUnifiedPatientStore(); } catch(e) { console.error('migrateToUnifiedPatientStore error:', e); }
```

**Rationale:** All of Phases 2-3 assume the unified store exists (`patients{}` empty, `patientRecords{}` canonical). Without wiring the migration at end of Phase 1, every Phase 2-3 function reads from empty `patientRecords{}` and sees zero patients. The function is idempotent (gated by localStorage flag) and safe to wire immediately.

- [ ] **Step 5: Verify and commit**

```bash
grep "function migrateToUnifiedPatientStore" js/graduation-roadmap/patients.js  # Expected: 1
grep "migrateToUnifiedPatientStore" js/graduation-roadmap/init.js               # Expected: 1
python3 -c "c=open('js/graduation-roadmap/patients.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"
git add js/graduation-roadmap/patients.js js/graduation-roadmap/init.js
git commit -m "feat(cis-v2): add migrateToUnifiedPatientStore + wire into initUI, simplify patient access"
```

---

### Task 1.8: Update isEmptyState() and validateStateIntegrity()

**Files:**
- Modify: `js/graduation-roadmap/state.js:230-308` (isEmptyState)

**Depends on:** Tasks 1.1, 1.3

- [ ] **Step 1: Update `hasPatients` check (line 239)**

```javascript
// OLD: const hasPatients = getCount(data.clinicalData?.patients) > 0;
// NEW: Check if patientRecords has user-modified entries
const hasPatients = getValues(data.clinicalData?.patientRecords).some(p => p.lastUpdated);
```

- [ ] **Step 2: Add `hasReviewQueue` check after `hasTodoItems` (~line 273)**

```javascript
const hasReviewQueue = Array.isArray(data.clinicalData?.autoLinkReviewQueue) && data.clinicalData.autoLinkReviewQueue.length > 0;
```

Add to the final return statement.

- [ ] **Step 3: Verify and commit**

```bash
grep -c "const has" js/graduation-roadmap/state.js  # Expected: >=20
git add js/graduation-roadmap/state.js
git commit -m "feat(cis-v2): update isEmptyState for unified patient store + autoLinkReviewQueue"
```

---

### Phase 1 Verification Checklist

```bash
# Brace balance on all modified files
python3 -c "
for f in ['js/graduation-roadmap/state.js', 'js/graduation-roadmap/clinical.js', 'js/graduation-roadmap/firebase-sync.js', 'js/graduation-roadmap/patients.js']:
    c = open(f).read()
    o, cl = c.count('{'), c.count('}')
    status = 'OK' if o == cl else 'MISMATCH'
    print(f'{f}: open={o} close={cl} {status}')
"

# Save guards still present
grep -c "return false" js/graduation-roadmap/firebase-sync.js  # Should be >=6

# New fields in all merge sites
grep -c "autoLinkReviewQueue" js/graduation-roadmap/firebase-sync.js  # >=12
grep -c "competencyUIState" js/graduation-roadmap/firebase-sync.js    # >=12

# New functions exist
grep "function propagateClinicalChanges\|function cascadeDelete\|function cascadeUncomplete\|function autoLinkProcedure\|function migrateToUnified" js/graduation-roadmap/state.js js/graduation-roadmap/patients.js

# New competency items
grep "fixed-units\|fixed-fpd\|fixed-implant\|fixed-cerec" js/graduation-roadmap/clinical.js  # >=4

# isSummative field spread
grep -c "isSummative" js/graduation-roadmap/clinical.js  # >=50
```

---

## Phase 2: Import Pipeline Unification

---

### Task 2.1: Fix Empty REQUIREMENTS_MATCH Bug

**Files:**
- Modify: `js/graduation-roadmap/patients.js:2300-2320` (REQUIREMENTS_MATCH handling in confirmPatientImport)

**Depends on:** Phase 1

- [ ] **Step 1: Always store metadata even when canFulfill is empty**

Find the REQUIREMENTS_MATCH section. Ensure `priorityNotes`, `highValue`, and `importedRequirements: []` are stored on the patient record even when `canFulfill` array is empty. See spec Section 5.3.

- [ ] **Step 2: Commit**

```bash
git add js/graduation-roadmap/patients.js
git commit -m "fix(cis-v2): always store REQUIREMENTS_MATCH metadata even when canFulfill is empty"
```

---

### Task 2.2: Fix reqId Case Normalization

**Files:**
- Modify: `js/graduation-roadmap/patients.js` at lines 1755, 1825, 2697, 1316

**Depends on:** Phase 1

- [ ] **Step 1: Add `.toLowerCase().trim()` to reqId extraction in:**

- `parseRequirementsMatch()` (line 1755) - both inline and continuation paths
- `parseRequirementsStatus()` (line 1825) - UPDATES section
- `applyRequirementCheckoffs()` (line 2697) - all comparisons
- `computeRequirementMatches()` (line 1316) - imported requirement comparisons

- [ ] **Step 2: Verify and commit**

```bash
grep -n "reqId" js/graduation-roadmap/patients.js | grep -v "toLowerCase"  # Check remaining are non-comparison
git add js/graduation-roadmap/patients.js
git commit -m "fix(cis-v2): normalize reqId to lowercase at all parse and comparison sites"
```

---

### Task 2.3: Enhance confirmPatientImport to confirmUnifiedImport

**Files:**
- Modify: `js/graduation-roadmap/patients.js:2230-2582`

**Depends on:** Tasks 1.4, 1.6, 2.1, 2.2

- [ ] **Step 1: Rename function, keep backward-compat alias**

**IMPORTANT:** Delete the existing `function confirmPatientImport()` declaration FIRST, then create the new function and alias. Having both a function declaration and a const with the same name causes errors.

```javascript
// DELETE: function confirmPatientImport() { ... }  (the entire old function body)
// REPLACE WITH:
function confirmUnifiedImport() { /* enhanced body */ }
const confirmPatientImport = confirmUnifiedImport;  // backward-compat alias for any HTML onclick references
```

- [ ] **Step 2: Ensure all patient writes go to `patientRecords{}` only**

Verify no writes to `clinicalData.patients` in the function body.

- [ ] **Step 3: Wire auto-link into appointment import path**

After past appointments auto-create procedures via `recordProcedure()` (~line 2410), call `autoLinkProcedureToCompetencies(proc)`.

- [ ] **Step 4: Replace ad-hoc render calls with propagateClinicalChanges()**

Replace individual re-render calls (~lines 2541-2570) with `propagateClinicalChanges({ appointments: true, procedures: true, competencies: true, patients: true })`.

- [ ] **Step 5: Commit**

```bash
git add js/graduation-roadmap/patients.js
git commit -m "feat(cis-v2): rename confirmPatientImport to confirmUnifiedImport, wire auto-link + propagation"
```

---

### Task 2.4: Create openUnifiedImportModal() Shared Entry Point

**Files:**
- Modify: `js/graduation-roadmap/patients.js:1518`
- Modify: `graduation-roadmap.html` (Patients tab import button)

**Depends on:** Task 2.3

- [ ] **Step 1: Rename and alias**

```javascript
function openUnifiedImportModal() { /* existing body */ }
const openPatientImportModal = openUnifiedImportModal;
```

- [ ] **Step 2: Update HTML import button onclick**

- [ ] **Step 3: Commit**

```bash
git add js/graduation-roadmap/patients.js graduation-roadmap.html
git commit -m "feat(cis-v2): rename to openUnifiedImportModal as shared entry point"
```

---

### Task 2.5: Retire confirmClinicalImport()

**Files:**
- Modify: `js/graduation-roadmap/import-system.js:262-529`
- Modify: `graduation-roadmap.html` (Clinical tab import button)

**Depends on:** Task 2.4

- [ ] **Step 1: Delete 6 retired functions from import-system.js**

**Delete entirely** (not comment out — dead code adds confusion and maintenance burden): `openClinicalImportModal` (262), `closeClinicalImportModal` (270), `parseClinicalFormat` (274), `parseAppointmentBlock` (316), `previewClinicalImport` (341), `confirmClinicalImport` (370).

Keep: `syncClinicalToMonthlyPlanner`, `calculateEndTime`, `timeToMinutes`, `dedupAppointments`, lecture functions.

- [ ] **Step 2: Rewire Clinical tab import button to `openUnifiedImportModal()`**

- [ ] **Step 3: Verify no dangling references and commit**

```bash
grep -rn "openClinicalImportModal\|confirmClinicalImport" js/graduation-roadmap/*.js graduation-roadmap.html | grep -v "RETIRED\|// "
# Expected: 0
git add js/graduation-roadmap/import-system.js graduation-roadmap.html
git commit -m "feat(cis-v2): retire confirmClinicalImport pipeline, Clinical tab uses unified modal"
```

---

### Phase 2 Verification

```bash
grep "function confirmUnifiedImport\|function openUnifiedImportModal" js/graduation-roadmap/patients.js  # 2 lines
grep "autoLinkProcedureToCompetencies" js/graduation-roadmap/patients.js  # >=1
grep "propagateClinicalChanges" js/graduation-roadmap/patients.js         # >=1
```

---

## Phase 3: Clinical Tab Redesign

---

### Task 3.1: Replace "My Patients" Sub-Tab with Active Roster

**Files:**
- Modify: `graduation-roadmap.html:9211` (sub-tab label)
- Modify: `js/graduation-roadmap/clinical.js:62-259` (replace renderPatientsList + patient modal CRUD)

**Depends on:** Task 1.7

- [ ] **Step 1: Change sub-tab label from "My Patients" to "Active Roster"**

- [ ] **Step 2: Replace `renderPatientsList()` (line 62) with `renderActiveRoster()`**

Read-only roster grouped by: This Week (appointments Mon-Sun), This Month, Recent (30 days by lastVisit). Each row: reliability dot, name, chart#, next appointment, "View" link to Patients tab via `navigateToEntity()`.

- [ ] **Step 3: Update `initClinicalTab()` (line 18) to call `renderActiveRoster()`**

- [ ] **Step 4: Remove old patient CRUD functions from clinical.js**

Remove: `renderPatientsList`, `filterPatients`, `openAddPatientModal`, `editPatient`, `closePatientModal`, `addPatientTask`, `removePatientTask`, `updatePatientTask`, `renderPatientTasksInModal`, `savePatient` (lines 62-316). Keep `deletePatient` (rewired in 3.3).

- [ ] **Step 5: Verify and commit**

```bash
python3 -c "c=open('js/graduation-roadmap/clinical.js').read(); print('{:', c.count('{'), '}:', c.count('}'))"
git add js/graduation-roadmap/clinical.js graduation-roadmap.html
git commit -m "feat(cis-v2): replace My Patients with Active Roster - read-only clinical quick-reference"
```

---

### Task 3.2: Redesign completeAppointment()

**Files:**
- Modify: `js/graduation-roadmap/clinical.js:2009-2054`

**Depends on:** Tasks 1.4, 1.5, 1.6

- [ ] **Step 1: Rewrite `completeAppointment()` (AUDIT #4: guard non-procedural appointments)**

New flow: (1) Set completed status, (2) Update `patientRecords[].lastVisit` (not `patients[]`), (3) **ONLY if `apt.procedures` is non-empty**: auto-create procedure from text via `recordProcedure()`, (4) Run `autoLinkProcedureToCompetencies()` on created procedure, (5) Mark deadline/planner done, (6) `propagateClinicalChanges()`, (7) Toast with auto-link results, (8) Open procedure modal for refinement.

**Critical guard (AUDIT #4):** Some appointments are non-procedural (consultations, treatment planning, records). Auto-creating a procedure for these pollutes `completedProcedures{}` and inflates `getSmartProcedureCount()`.

```javascript
// 3. Auto-create procedure ONLY if appointment has procedure text
let proc = null;
if (apt.procedures && apt.procedures.trim()) {
    proc = recordProcedure({
        patientId: apt.patientId,
        patientName: patient?.name || apt.patientName || 'Unknown',
        appointmentId: apt.id,
        date: apt.date,
        procedureType: inferProcedureType(apt.procedures),
        procedure: apt.procedures,
        competencyItemIds: [],
        notes: 'Auto-created from appointment completion'
    });
    // 4. Smart auto-link fires on created procedure
    if (proc && proc.id) autoLinkProcedureToCompetencies(proc);
}
// If apt.procedures is empty, appointment is marked complete WITHOUT a procedure.
// User can still manually open procedure modal via the toast "Edit" button.
```

- [ ] **Step 2: Add `inferProcedureType(text)` function (AUDIT #8 + #18: derives from KEYWORD_PATTERNS)**

**CRITICAL: Must derive from `KEYWORD_PATTERNS` in state.js (single source of truth).** Do NOT maintain a parallel typeMap — dual keyword lists drift and cause mismatches between auto-link and type inference.

```javascript
function inferProcedureType(procedureText) {
    const text = (procedureText || '').toLowerCase();
    // Derive category from KEYWORD_PATTERNS item ID prefix (single source of truth)
    const categoryFromId = {
        'fixed-': 'fixed', 'op-': 'operative', 'perio-': 'perio', 'endo-': 'endo',
        'os-': 'oralsurg', 'cd-': 'dentures', 'rpd-': 'rpd', 'peds-': 'peds',
        'srp-': 'srp', 'gp-': 'grouppractice', 'tx-': 'txplanning'
    };
    for (const pattern of KEYWORD_PATTERNS) {
        if (pattern.keywords.some(kw => text.includes(kw))) {
            const firstId = pattern.ids[0] || '';
            for (const [prefix, cat] of Object.entries(categoryFromId)) {
                if (firstId.startsWith(prefix)) return cat;
            }
        }
    }
    return '';
}
```

- [ ] **Step 3: Commit**

```bash
git add js/graduation-roadmap/clinical.js
git commit -m "feat(cis-v2): redesign completeAppointment with auto-procedure + auto-link"
```

---

### Task 3.3: Wire All Clinical CRUD to Cascades + Propagation

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` at lines 317, 624, 1762, 2056, 536, 2268

**Depends on:** Tasks 1.4, 1.5

- [ ] **Step 1: Rewire `deletePatient()` (317) to call `cascadeDeletePatient()`**
- [ ] **Step 2: Rewire `deleteAppointment()` (624) to call `cascadeDeleteAppointment()`**
- [ ] **Step 3: Rewire `deleteProcedure()` (1762) to call `cascadeDeleteProcedure()`**
- [ ] **Step 4: Rewire `uncompleteAppointment()` (2056) to call `cascadeUncompleteAppointment()`**
- [ ] **Step 5: Add `propagateClinicalChanges()` to `saveAppointment()` (536)**
- [ ] **Step 6: Add `propagateClinicalChanges()` and auto-link fallback to `saveProcedureRecord()` (2268)**
- [ ] **Step 7: Fix appointment modal patient dropdown (AUDIT #10)**

In `openAddAppointmentModal()` (line 480) and `editAppointment()` (line 505), the patient dropdown is populated from `clinicalData.patients{}`. Post-migration that store is empty `{}`, so the dropdown shows zero patients. Change to read from `patientRecords{}`:

```javascript
// OLD: const patients = roadmapData.clinicalData?.patients || {};
// NEW:
const patients = typeof getAllPatientRecords === 'function' ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
```

Apply this change to both `openAddAppointmentModal` and `editAppointment`. Also check `saveAppointment()` (line 536) for any reads from `patients{}` — redirect to `patientRecords{}`.

- [ ] **Step 8: Verify and commit**

```bash
grep "cascadeDelete\|cascadeUncomplete" js/graduation-roadmap/clinical.js  # >=4
grep -c "propagateClinicalChanges" js/graduation-roadmap/clinical.js       # >=3
git add js/graduation-roadmap/clinical.js
git commit -m "feat(cis-v2): wire all Clinical CRUD to cascade functions + propagation"
```

---

### Task 3.4: Clinical Tab Import Button Rewire

**Files:**
- Modify: `graduation-roadmap.html`

**Depends on:** Task 2.4

- [ ] **Step 1: Find and replace `openClinicalImportModal` with `openUnifiedImportModal` in Clinical tab HTML**

```bash
grep -n "openClinicalImportModal" graduation-roadmap.html  # Find the button
```

- [ ] **Step 2: Commit**

---

### Task 3.5: Fix txSummaryBU in PR Writeups

**Files:**
- Modify: `js/graduation-roadmap/periodic-review.js:1372` (field list in renderPRPatientWriteups)
- Modify: `js/graduation-roadmap/patients.js:1661,1703` (parser fieldMaps)

**Depends on:** Nothing (independent)

- [ ] **Step 1: Add field after `dentalHx` (line 1372) in PR writeup field list**

```javascript
{ label: 'Treatment at BU', key: 'txSummaryBU', value: pt.txSummaryBU ?? '' },
```

- [ ] **Step 2: Verify `TX_SUMMARY_BU` in parsePatientRecord/parsePatientUpdate fieldMaps**
- [ ] **Step 3: Commit**

```bash
git add js/graduation-roadmap/periodic-review.js js/graduation-roadmap/patients.js
git commit -m "fix(cis-v2): add txSummaryBU to PR writeups and import parser fieldMaps"
```

---

### Task 3.6: Update 000-INSTRUCTIONS.md with New Requirement IDs (AUDIT #9)

**Files:**
- Modify: `docs/000-INSTRUCTIONS.md`

**Depends on:** Task 1.2

- [ ] **Step 1: Add the 4 new `fixed-*` requirement IDs**

In the requirements reference section of `docs/000-INSTRUCTIONS.md`, add these IDs so the Claude webchat project can reference them in `REQUIREMENTS_STATUS` and `REQUIREMENTS_MATCH` exports:

```
fixed-units    - Minimum clinical units (start to completion) - 10 required
fixed-fpd      - Must include 1 FPD - 1 required
fixed-implant  - Must include 1 Implant-Supported Crown - 1 required
fixed-cerec    - Must include minimum 3 CEREC restorations - 3 required
```

Without this, the webchat project doesn't know these IDs exist and can never export status for them.

- [ ] **Step 2: Commit**

```bash
git add docs/000-INSTRUCTIONS.md
git commit -m "docs: add fixed-units/fpd/implant/cerec requirement IDs to webchat instructions"
```

---

### Task 3.5b: Redirect 4 Critical Consumer Functions from patients{} to patientRecords{} (AUDIT #16)

**Files:**
- Modify: `js/graduation-roadmap/import-system.js:545` (syncClinicalToMonthlyPlanner)
- Modify: `js/graduation-roadmap/import-system.js:627` (dedupAppointments)
- Modify: `js/graduation-roadmap/clinical.js:1827` (backfillClinicalData)
- Modify: `js/graduation-roadmap/periodic-review.js:1569` (prSavePatientField)

**Depends on:** Task 1.7

**Context:** The spec's Section 3.4 table marks these as "Critical (breaks saves or loses data if missed)." Post-migration, `clinicalData.patients{}` is empty. These 4 functions still read from it and will produce "Unknown Patient" labels, broken dedup, failed backfill, and blank skeleton records.

- [ ] **Step 1: Fix `syncClinicalToMonthlyPlanner()` (import-system.js:545)**

```javascript
// OLD (line 545): const patients = roadmapData.clinicalData.patients || {};
// NEW:
const patients = roadmapData.clinicalData.patientRecords || {};
```

Also fix line 575-576 where patient name is read:
```javascript
// OLD: const patient = patients[apt.patientId] || {};
// NEW:
const patient = patients[apt.patientId] || {};  // Now reads from patientRecords
```

- [ ] **Step 2: Fix `dedupAppointments()` (import-system.js:627)**

```javascript
// OLD (line 627): const patients = roadmapData.clinicalData.patients || {};
// NEW:
const patients = roadmapData.clinicalData.patientRecords || {};
```

This fixes the dedup key generation — patient names are used as part of the dedup key. With empty `patients{}`, all names resolve to empty string, breaking grouping.

- [ ] **Step 3: Fix `backfillClinicalData()` (clinical.js:1827,1896,1931)**

All 4 places where `backfillClinicalData` reads from `clinicalData.patients`:

```javascript
// Phase 1 (line 1827): var patient = roadmapData.clinicalData.patients?.[apt.patientId];
// NEW: var patient = roadmapData.clinicalData.patientRecords?.[apt.patientId];

// Phase 3 (line 1896): var pt = roadmapData.clinicalData.patients?.[apt.patientId];
// NEW: var pt = roadmapData.clinicalData.patientRecords?.[apt.patientId];

// Phase 4 (line 1931-1932): Object.values(roadmapData.clinicalData.patients).forEach(...)
// NEW: Object.values(roadmapData.clinicalData.patientRecords || {}).forEach(...)
```

Phase 4 (patient bridging by name) becomes a lightweight fallback — most patients are already in `patientRecords{}` post-migration. Keep the logic but redirect the source.

- [ ] **Step 4: Fix `prSavePatientField()` (periodic-review.js:1569)**

```javascript
// OLD (line 1568-1574):
// var clinicalPt = roadmapData.clinicalData.patients?.[patientId] ?? {};
// NEW:
var clinicalPt = roadmapData.clinicalData.patientRecords?.[patientId] ?? {};
```

This fixes skeleton patient record creation in PR Review — without this fix, new PR entries get blank name/chartNumber.

- [ ] **Step 5: Verify no remaining references to `clinicalData.patients` as data source**

```bash
# Find all reads from clinicalData.patients (excluding comments, schema compat lines, and isEmptyState)
grep -n "clinicalData\.patients" js/graduation-roadmap/import-system.js js/graduation-roadmap/clinical.js js/graduation-roadmap/periodic-review.js | grep -v "//\|patients = {}\|patients:\|DEPRECATED\|compat\|isEmptyState"
# Expected: 0 remaining reads from old store
```

- [ ] **Step 6: Commit**

```bash
git add js/graduation-roadmap/import-system.js js/graduation-roadmap/clinical.js js/graduation-roadmap/periodic-review.js
git commit -m "fix(cis-v2): redirect 4 critical consumer functions from patients{} to patientRecords{}"
```

---

### Phase 3 Verification Checklist

```bash
# 1. Brace balance on all Phase 3 modified files
python3 -c "
for f in ['js/graduation-roadmap/clinical.js', 'js/graduation-roadmap/import-system.js', 'js/graduation-roadmap/periodic-review.js', 'js/graduation-roadmap/patients.js']:
    c = open(f).read(); o = c.count('{'); cl = c.count('}')
    status = 'OK' if o == cl else 'MISMATCH'
    print(f'{f}: open={o} close={cl} {status}')
"

# 2. Active Roster replaces old patient list
grep "function renderActiveRoster" js/graduation-roadmap/clinical.js        # 1
grep "function renderPatientsList" js/graduation-roadmap/clinical.js        # 0 (removed)

# 3. completeAppointment uses auto-procedure guard
grep "apt.procedures && apt.procedures.trim()" js/graduation-roadmap/clinical.js  # >=1

# 4. All CRUD wired to cascades
grep "cascadeDeletePatient\|cascadeDeleteAppointment\|cascadeDeleteProcedure\|cascadeUncompleteAppointment" js/graduation-roadmap/clinical.js  # >=4

# 5. No remaining reads from clinicalData.patients (critical — catches missed redirects)
grep -n "clinicalData\.patients\b" js/graduation-roadmap/import-system.js js/graduation-roadmap/clinical.js js/graduation-roadmap/periodic-review.js js/graduation-roadmap/patients.js | grep -v "//\|patients = {}\|patients:\|DEPRECATED\|compat\|isEmptyState\|getPatientRecords\|getAllPatient\|patients ||"
# Expected: 0 (all redirected to patientRecords)

# 6. inferProcedureType derives from KEYWORD_PATTERNS
grep "KEYWORD_PATTERNS" js/graduation-roadmap/clinical.js  # >=1 (inferProcedureType uses it)

# 7. propagateClinicalChanges used in CRUD
grep -c "propagateClinicalChanges" js/graduation-roadmap/clinical.js  # >=5

# 8. txSummaryBU in PR writeups
grep "txSummaryBU" js/graduation-roadmap/periodic-review.js  # >=1
```

---

## Phase 4: Competencies Tab Promotion + UI/UX

> Massive UI enhancement. Competencies becomes a flagship tab.

---

### Task 4.1: Nav Bar Reorder + Tab Routing

**Files:**
- Modify: `graduation-roadmap.html:7820-7830`

**Depends on:** Phase 3

- [ ] **Step 1: Reorder tab buttons**

New order: Mission Control, Patients, **Competencies**, Clinical, Deadlines, Schedule, Academics, Grad Prep, PR Review, Mini Review, Remember.

- [ ] **Step 2: Verify `switchTab('competencies')` works in state.js**
- [ ] **Step 3: Commit**

---

### Task 4.2: Competencies Tab HTML Skeleton + CSS

**Files:**
- Modify: `graduation-roadmap.html:9280+` and CSS section

**Depends on:** Task 4.1

- [ ] **Step 1: Add structured div skeleton for `#tab-competencies`**

Sections: `#compSearchBar`, `#compViewToggle`, `#compMilestoneDashboard`, `#compD3Deadlines`, `#compWhatsNext`, `#compReviewQueue`, `#competenciesContainer`, `#overallProgressSummary`.

- [ ] **Step 2: Add comprehensive CSS**

Styles for: milestone rings, D3 deadline cards, unlock chains, search bar, filter chips, evidence cards, patient badges, pace projections, quick-record modal, By Patient cards. Including mobile responsive.

- [ ] **Step 3: Commit**

---

### Task 4.3: Milestone Dashboard (3 Progress Rings)

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (in renderCompetencies)

**Depends on:** Task 4.2

- [ ] **Step 1: Render 3 SVG progress rings into `#compMilestoneDashboard`**

Appointments (blue, /90), Procedures (green, /116), Summatives (amber, /7). Plus overall readiness % and pace projection (items/week needed, color-coded).

- [ ] **Step 2: Commit**

---

### Task 4.4: D3 Deadline Alert Bar

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (inside `renderCompetencies()`)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `renderD3DeadlineBar()` function**

Walk all competency items across all categories. Collect items where `item.d3Deadline` is set AND `item.completed < item.required`. Sort by deadline date ascending (nearest first). Parse date with `const [y,m,d] = item.d3Deadline.split('-').map(Number); new Date(y, m-1, d)`.

- [ ] **Step 2: Render into `#compD3Deadlines`**

Each item shows: category icon, item text, progress (X/Y), deadline date formatted as "May 1, 2026". Color coding: red if past due or < 7 days, amber if < 30 days, green otherwise. Use `escapeHtml()` on all item text.

- [ ] **Step 3: Commit**

---

### Task 4.5: What's Next Panel

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (inside `renderCompetencies()`)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `renderWhatsNext()` function**

Call existing `getWhatsNextItems()` (clinical.js:1067). Take top 5 results.

- [ ] **Step 2: Render into `#compWhatsNext`**

Each item: category badge, item text (use `escapeHtml()`), progress bar, "Record" button that calls `openCompQuickRecord(itemId)`. If item has `unlockedBy` and `isItemUnlocked()` returns false, show advisory "⚠️ X formatives needed" in muted text.

- [ ] **Step 3: Commit**

---

### Task 4.6: Review Queue UI

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (new functions)

**Depends on:** Task 4.2

- [ ] **Step 1: Render `autoLinkReviewQueue[]` count into `#compReviewQueue` banner**

Show "🔍 X procedures need competency review" if queue is non-empty, hidden if empty.

- [ ] **Step 2: Add `openReviewQueuePanel()` function**

Renders each queue entry as a card: procedure name (use `escapeHtml()`), date, patient name, list of suggested competency items with Accept/Reject buttons per suggestion and Dismiss for the whole entry.

- [ ] **Step 3: Add `acceptReviewSuggestion(procedureId, itemId)`, `rejectReviewSuggestion(procedureId, itemId)`, `dismissReviewItem(procedureId)` functions**

`accept`: adds item to procedure's `competencyItemIds`, calls `linkProcedureToCompetencies()`, removes suggestion from queue entry. `reject`: removes suggestion from queue entry. `dismiss`: removes entire entry from queue. All call `saveData()` and re-render.

- [ ] **Step 4: Commit**

---

### Task 4.7: Unlock Chain Visualization

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (inside category expansion rendering)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `renderUnlockChain(catKey, items)` function**

For items with `unlockedBy` arrays, build a visual chain: formative item(s) → arrow → summative item. Formative shows progress bar (completed/required). Summative grayed out with 🔒 icon if `isItemUnlocked()` returns false. Use `escapeHtml()` on all item text.

- [ ] **Step 2: Render inside each expanded category section, above the items list**

Only show if category has items with `unlockedBy` set. Perio, operative, fixed, and CD categories will have chains.

- [ ] **Step 3: Commit**

---

### Task 4.8: Full Evidence Trail with Rich Cards

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (inside item detail rendering)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `renderEvidenceCards(item)` function**

Replace current truncated `completionEntries` display. Each entry renders as a card with: type badge (Procedure=blue, Manual=gray, Import=purple, Backfill=amber, Auto-linked=teal), date, patient name (use `escapeHtml()`, clickable via `navigateToEntity('patient', entry.patientId)`), note text, and Remove button.

- [ ] **Step 2: Add `removeEvidenceEntry(catKey, itemId, entryIndex)` function**

Removes entry from `completionEntries`, decrements `completed`, calls `propagateClinicalChanges({ competencies: true, dashboard: false, calendars: false })` + `saveData()`. Show undo toast (5s timeout) that re-adds the entry.

- [ ] **Step 3: Commit**

---

### Task 4.9: "Which Patients Can Fulfill This?" Badges

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (inside item rendering)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `getPatientsFulfilling(itemId)` function**

For items with `item.completed < item.required`, cross-reference all `patientRecords[]` entries. Check each patient's `importedRequirements[]` for matching `reqId`. Return array of `{ patientId, name, nextAppointment }`. Use `getNextScheduledVisit()` for appointment dates.

- [ ] **Step 2: Render as expandable badge below the item**

Show "3 patients can fulfill this" clickable badge. Expanded: patient names (use `escapeHtml()`), next appointment date, "View" link via `navigateToEntity('patient', patientId)`. Only show if `getPatientsFulfilling()` returns non-empty.

- [ ] **Step 3: Commit**

---

### Task 4.10: Critical Rules Display Per Category

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (inside category header rendering)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `renderCategoryRules(catKey, items)` function**

Collect unique `rules` strings from all items in the category (skip null/empty). Deduplicate by exact string match.

- [ ] **Step 2: Render as collapsible `<details>` with red warning styling**

Uses `<details class="comp-rules-details"><summary>⚠️ X Critical Rules</summary>` with red-bordered styling. Each rule is a bullet point. Use `escapeHtml()` on rule text.

- [ ] **Step 3: Commit**

---

### Task 4.11: Pace Projection Per Category

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (inside category expansion rendering)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `renderCategoryPace(catKey, stats)` function**

Calculate: `remaining = totalRequired - totalCompleted` for the category. `weeksLeft = Math.max(1, (graduationDate - now) / (7 * 86400000))`. `pace = remaining / weeksLeft`. Use graduation date May 2027 as default.

- [ ] **Step 2: Render inside each expanded category with color coding**

Display "X items/week needed" with color: green if pace < 0.5, yellow if < 1.5, red if >= 1.5. Show "✅ Complete" if remaining === 0. Guard division by zero with `if (remaining < 1) return 'Complete'`.

- [ ] **Step 3: Commit**

---

### Task 4.12: Search and Filter Bar

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (new functions)

**Depends on:** Task 4.2

- [ ] **Step 1: Render persistent search input + status filter chips into `#compSearchBar`**

Text input with placeholder "Search competencies...", status chips: All, Pending, In Progress, Completed. Persist active filters in `roadmapData.competencyUIState`.

- [ ] **Step 2: Add `filterCompetencies(searchText)`, `toggleCompFilter(status)`, `clearCompFilters()` functions**

`filterCompetencies`: case-insensitive text match against item.text + item.id + category name. `toggleCompFilter`: toggle status chip active state. `clearCompFilters`: reset to all visible.

- [ ] **Step 3: Apply filters in item rendering loop, show result count**

Inside `renderCompetencies()`, filter items before rendering. Show "Showing X of Y items" in `#compSearchBar`. Use `escapeHtml()` on search input value when displaying.

- [ ] **Step 4: Commit**

---

### Task 4.13: Inline Quick-Record Modal

**Files:**
- Modify: `js/graduation-roadmap/clinical.js` (new functions)

**Depends on:** Task 4.2

- [ ] **Step 1: Add `openCompQuickRecord(itemId)` function**

Opens modal overlay with: pre-selected competency item (from `findCompetencyItem(itemId)`), patient dropdown (from `getAllPatientRecords()`), date (default today, parsed with split pattern), notes textarea. All patient names use `escapeHtml()`.

- [ ] **Step 2: Add `submitCompQuickRecord()` function**

Calls `recordProcedure()` with pre-filled `competencyItemIds: [itemId]`. Then `autoLinkProcedureToCompetencies()` on the created procedure. Then `propagateClinicalChanges({ procedures: true, competencies: true })` + `saveData()`. Close modal.

- [ ] **Step 3: Commit**

---

### Task 4.14: Persistent Expanded State

- [ ] Update `toggleCompCategory()` (line 1264) to persist to `roadmapData.competencyUIState.expandedCategories`.
- [ ] In `renderCompetencies()`, restore expanded state from `competencyUIState`.

---

### Task 4.15: Urgency-Sorted Category Accordion

- [ ] Sort categories before rendering: D3 deadline items first, lowest completion % next, 100% categories last.

---

### Task 4.16: By Patient View Mode Toggle

- [ ] Render Department/Patient toggle into `#compViewToggle`.
- [ ] Add `setCompViewMode()` to persist and re-render.
- [ ] By Patient view: patients with outstanding `importedRequirements`, sorted by graduation value.

---

### Task 4.17: Inline Editable Per-Item Notes

- [ ] Make `item.note` field contenteditable with blur-save pattern.
- [ ] Add `saveCompItemNote()` with `_cancelled` escape guard.

---

### Task 4.18: Final Wiring + Phase 4 Verification

**Files:**
- Verify: all Phase 4 JS and HTML changes

**Depends on:** All Phase 4 tasks

**NOTE:** Migration wiring (`migrateToUnifiedPatientStore()` call in `initUI()`) was moved to Task 1.7 Step 4 to unblock Phase 2-3 testing. This task focuses on final integration verification.

- [ ] **Step 1: Verify all Phase 4 functions are callable from tab navigation**

```bash
grep "function filterCompetencies\|function openCompQuickRecord\|function setCompViewMode\|function openReviewQueuePanel\|function renderActiveRoster" js/graduation-roadmap/clinical.js
# Expected: >=4
```

- [ ] **Step 2: Verify all new HTML sections have IDs**

```bash
grep "compSearchBar\|compViewToggle\|compMilestoneDashboard\|compD3Deadlines\|compWhatsNext\|compReviewQueue\|overallProgressSummary" graduation-roadmap.html | wc -l
# Expected: >=7
```

- [ ] **Step 3: Commit**

---

### Phase 4 Verification

```bash
# Nav order check
grep -A12 "tab-nav" graduation-roadmap.html | grep "switchTab"

# Key functions exist
grep "function filterCompetencies\|function openCompQuickRecord\|function setCompViewMode\|function openReviewQueuePanel" js/graduation-roadmap/clinical.js

# Migration wired
grep "migrateToUnifiedPatientStore" js/graduation-roadmap/init.js  # 1

# Full brace balance
python3 -c "
for f in ['js/graduation-roadmap/state.js', 'js/graduation-roadmap/clinical.js', 'js/graduation-roadmap/firebase-sync.js', 'js/graduation-roadmap/patients.js', 'js/graduation-roadmap/import-system.js', 'js/graduation-roadmap/init.js', 'js/graduation-roadmap/periodic-review.js']:
    c = open(f).read(); o = c.count('{'); cl = c.count('}')
    print(f'{f}: open={o} close={cl} {\"OK\" if o==cl else \"MISMATCH\"}')"
```

---

## Phase 5: Integration and Verification

---

### Task 5.1: E2E - 9-Block Import via Patients Tab
Paste full 9-block import. Verify all patients in `patientRecords{}`, requirements stored, past apts auto-completed with procedures, auto-link fires, dashboard updated, clinical tab shows appointments, competencies show evidence.

### Task 5.2: E2E - Import via Clinical Tab
Clinical tab import button opens same modal, same pipeline fires.

### Task 5.3: E2E - Complete Appointment Flow
Complete appointment -> auto-procedure created -> auto-link fires -> competency updated -> procedure modal opens.

### Task 5.4: E2E - Delete Patient Cascade
Delete patient -> all appointments deleted, all procedures deleted, competency evidence unlinked, planner tasks hidden, custom deadlines cleaned, review queue entries removed.

### Task 5.5: E2E - Delete Patient from Clinical Tab
Same cascade fires from any deletion path (shared function).

### Task 5.6: E2E - Delete Appointment Cascade
Procedures deleted, evidence unlinked, planner hidden, deadline cleaned, patient lastVisit recalculated.

### Task 5.7: E2E - Smart Auto-Link
"Crown prep #14" -> high-confidence fixed match. "Denture adjustment" -> medium-confidence queued.

### Task 5.8: E2E - Unlock Chain Advisory
Perio summative with unfulfilled formative shows advisory. Can still manually record (not blocking).

### Task 5.9: E2E - Cross-Device Firebase Sync
Changes on device A sync to device B. Transitional `patients{}` consumed into `patientRecords{}`.

### Task 5.10: E2E - Search and Filter
Text search + status chips + combination + clear all works.

### Task 5.11: E2E - Inline Quick-Record
Record button -> modal -> save -> evidence appears. No tab switching.

### Task 5.12: E2E - By Patient View
Toggle works. Patients with outstanding requirements shown. Click navigates.

### Task 5.13: E2E - Persistent Expanded State
Expand categories -> switch tabs -> come back -> still expanded. Reload -> still expanded.

### Task 5.14: E2E - Empty REQUIREMENTS_MATCH Fix
Import with empty canFulfill. Verify priorityNotes and highValue still stored.

### Task 5.15: Cache-Busting Script Tags

**Files:**
- Modify: `graduation-roadmap.html:10729-10740`

- [ ] **Step 1: Update all `?v=` params to `?v=20260330cis`**

All 12 script tags. Verify count:

```bash
grep -c "?v=" graduation-roadmap.html  # Must equal number of <script src> tags
grep "<script src" graduation-roadmap.html | grep -v "?v=" | head -5  # Expected: 0 (no unversioned tags)
```

- [ ] **Step 2: Commit**

```bash
git add graduation-roadmap.html
git commit -m "chore: bump cache-busting params for CIS v2 deploy"
```

### Task 5.16: Final Comprehensive Reference Sweep

- [ ] **Step 1: Verify zero remaining reads from `clinicalData.patients` as data source**

```bash
# Catches any consumer redirect we missed across ALL JS files
grep -rn "clinicalData\.patients" js/graduation-roadmap/*.js | grep -v "//\|patients = {}\|patients:\|DEPRECATED\|compat\|isEmptyState\|getPatientRecords\|getAllPatient\|patients ||\|autoLinkReviewQueue\|competencyUIState"
# Expected: only schema-compat lines (patients: {} in defaults, merge sites)
```

- [ ] **Step 2: Verify all new functions exist**

```bash
grep "function migrateToUnifiedPatientStore\|function migrateCompetencyEnhancements\|function propagateClinicalChanges\|function cascadeDeletePatient\|function cascadeDeleteAppointment\|function cascadeDeleteProcedure\|function cascadeUncompleteAppointment\|function autoLinkProcedureToCompetencies\|function isItemUnlocked\|function inferProcedureType\|function renderActiveRoster\|function confirmUnifiedImport\|function openUnifiedImportModal\|function showAutoLinkToast\|function findPatientByChartOrName\|function findCompetencyItem\|function recalculatePatientLastVisit" js/graduation-roadmap/*.js | wc -l
# Expected: >=17
```

- [ ] **Step 3: Verify migration flags clear on checkpoint restore**

```bash
grep "unifiedPatientStoreDone_v1\|competencyEnhancementsDone_v1" js/graduation-roadmap/firebase-sync.js | grep "removeItem"
# Expected: 2 lines (both flags cleared in restoreCheckpoint)
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1: Data Foundation | 1.1-1.2b, 1.3-1.8 | Unified store schema, cascade functions, propagation, auto-link engine, merge sites, competency migration, patient migration + initUI wiring |
| 2: Import Pipeline | 2.1-2.5 | confirmUnifiedImport, 2 bug fixes, confirmClinicalImport retired |
| 3: Clinical Tab | 3.1-3.6, 3.5b | Active Roster, redesigned completeAppointment, CRUD cascades, 4 consumer redirects, txSummaryBU fix, 000-INSTRUCTIONS update |
| 4: Competencies UI | 4.1-4.18 | Nav reorder, milestone dashboard, D3 alerts, unlock chains, search/filter, quick-record, By Patient view |
| 5: Integration | 5.1-5.16 | E2E scenarios, cache-busting, comprehensive reference sweep |
| 5: Verification | 5.1-5.15 | 14 E2E scenarios + cache-busting |

**Total: 47 implementation tasks + 15 verification scenarios**

**Max parallelism:** Phase 1 Group A = 3 agents. Phase 4 Groups B+C+D = 13 agents.
