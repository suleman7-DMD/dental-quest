# Clinical Brief + Perio Noise Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CLINICAL_BRIEF import block type with 7-section structured prose per patient, plus strip routine perio noise from existing imported requirements.

**Architecture:** New `parseClinicalBrief()` parser function + import cascade handler in patients.js. `clinicalBrief` + `briefHistory` fields added to patient records, all 4 merge/restore sites in firebase-sync.js, and `mergeRemoteCollectionsIntoLocal`. UI renders as default tab in patient detail with accordion on mobile. One-time perio cleanup migration runs on first load.

**Tech Stack:** Vanilla JS (no build system), Firebase Realtime Database, localStorage

**Spec:** `docs/CLINICAL_BRIEF_FEATURE_SPEC.md`
**Webchat Instructions:** `docs/claude-webchat-project-instructions.md` (V2)

---

### Task 1: Parser — Add CLINICAL_BRIEF block type detection + parser function

**Files:**
- Modify: `js/graduation-roadmap/patients.js:1175` (result object)
- Modify: `js/graduation-roadmap/patients.js:1200-1201` (header detection)
- Modify: `js/graduation-roadmap/patients.js:1233-1235` (routing)
- Modify: `js/graduation-roadmap/patients.js` (new function after `parseTodoListBlock`)

- [ ] **Step 1:** Add `clinicalBriefs: []` to the result object in `parsePatientImportText()` at line 1175
- [ ] **Step 2:** Add `CLINICAL_BRIEF` header detection after `TODO_LIST` line (~1200), before `APPOINTMENTS`
- [ ] **Step 3:** Add `CLINICAL_BRIEF` routing after `TODO_LIST` routing (~1234), calling `parseClinicalBrief()`
- [ ] **Step 4:** Write `parseClinicalBrief()` function — same KEY:value + multi-line continuation pattern as `parsePatientRecord()`. 10 fields: CHART, NAME, DATE_GENERATED, SNAPSHOT, DIAGNOSES_AND_RISKS, TX_STATUS, TX_SEQUENCING, FLAGGED_CONCERNS, GRAD_VALUE, NEXT_VISIT_PLAN. Returns null if no chartNumber.
- [ ] **Step 5:** Verify brace balance

---

### Task 2: Import cascade — Store clinical brief on patient record

**Files:**
- Modify: `js/graduation-roadmap/patients.js:2040-2076` (confirmPatientImport)
- Modify: `js/graduation-roadmap/patients.js:1626-1780` (previewPatientImport)

- [ ] **Step 1:** Add clinical brief processing in `confirmPatientImport()`, BEFORE the `safeLocalStorageSet` call (~line 2042), AFTER todo import. Find patient by chart (fallback: name match). Push old brief to `briefHistory[]` (max 3) before full overwrite. Set 7 content fields + dateGenerated.
- [ ] **Step 2:** Add clinical brief preview in `previewPatientImport()` — teal-themed card showing patient name + which sections are populated.
- [ ] **Step 3:** Add brief count to import toast message (after todosImported line)
- [ ] **Step 4:** Verify brace balance

---

### Task 3: Merge sites — Handle clinicalBrief in mergeRemoteCollectionsIntoLocal

**Files:**
- Modify: `js/graduation-roadmap/firebase-sync.js:128-164` (mergeRemoteCollectionsIntoLocal)

**Key insight:** `clinicalBrief` and `briefHistory` live ON patient records inside `clinicalData.patientRecords[id]`. The 4 main merge sites (`mergeRemoteState`, `loadFromLocalStorage`, `restoreCheckpoint`, `importAndRestoreDirectly`) all spread `patientRecords` objects, so nested properties travel automatically.

The only site needing explicit handling is `mergeRemoteCollectionsIntoLocal` (the local-is-newer additive merge), because `addMissing()` only adds keys that don't exist locally — it won't update a local patient's brief with a newer remote brief.

- [ ] **Step 1:** After the `addMissing(patientRecords)` call (~line 153), add a loop over remote patientRecords. For each patient that exists locally: if remote has a newer `clinicalBrief.dateGenerated`, overwrite local. For `briefHistory`, take the longer array.
- [ ] **Step 2:** Verify all 4 main merge sites preserve nested patient properties (search for `clinicalData.patients` and `clinicalData.patientRecords` spreads — confirm they use `{ ...local, ...remote }` pattern).
- [ ] **Step 3:** Verify brace balance

---

### Task 4: Perio cleanup — One-time migration

**Files:**
- Modify: `js/graduation-roadmap/patients.js` (new function)
- Modify: `js/graduation-roadmap/init.js` (call migration)

- [ ] **Step 1:** Write `migratePerioNoiseCleanup()` function. Gated by `localStorage.getItem('perioNoiseCleanupDone_v1')`. Two tiers: always-strip list (8 IDs: prophy, recall, gingivitis re-eval, OHI) and conditional-strip list (4 IDs: dx, impr — only if patient lacks periodontitis/SRP keywords in txPlan/medicalHx/notes). After stripping, recheck `highValue` (flip to false if remaining < 3). Call `safeLocalStorageSet` + `saveData` if any changes. Set localStorage flag when done.
- [ ] **Step 2:** Call `migratePerioNoiseCleanup()` from `initUI()` in init.js (wrapped in try/catch, after other deferred work)
- [ ] **Step 3:** Verify brace balance on both files

---

### Task 5: UI — Clinical Brief tab as default patient view

**Files:**
- Modify: `js/graduation-roadmap/patients.js:573-791` (renderPatientRecord)
- Modify: `js/graduation-roadmap/patients.js` (new renderClinicalBrief function)
- Modify: `js/graduation-roadmap/patients.js:~487` (sidebar badge)

- [ ] **Step 1:** Add `var patientViewTab = 'brief';` global near other patient globals (activePatientId, patientEditMode)
- [ ] **Step 2:** Write `renderClinicalBrief(patient, patientId)` function. Returns HTML with 7 sections. SNAPSHOT always visible (never collapses). Other 6 sections: accordion on mobile (collapse/expand via `collapsedSections`), flat scroll on desktop. Parse `(1)`, `(2)` patterns in flaggedConcerns into `<ol>` elements. Show dateGenerated + briefHistory count in footer. If no brief, show empty state prompting re-export. All user text through `escapeHtml()`.
- [ ] **Step 3:** Modify `renderPatientRecord()` to add tab buttons (Brief / Record) after summary card. If brief exists, default to brief tab. If no brief, default to record tab with disabled brief button. Move existing record sections into the `record` tab branch. Brief tab shows `renderClinicalBrief()` output.
- [ ] **Step 4:** Add brief badge to sidebar `patientRow()` function — small icon after chart number when `p.clinicalBrief && p.clinicalBrief.snapshot` is truthy.
- [ ] **Step 5:** Verify brace balance

---

### Task 6: CSS — Style the Clinical Brief tab + sections

**Files:**
- Modify: `graduation-roadmap.html` (CSS section, inside `#tab-patients` scope)

- [ ] **Step 1:** Add CSS for `.ptr-tabs`, `.ptr-tab`, `.ptr-tab.active`, `.ptr-tab.disabled` (tab buttons). Swiss light theme: teal active, gray inactive.
- [ ] **Step 2:** Add CSS for `.ptr-brief-container`, `.ptr-brief-section`, `.ptr-brief-section-header`, `.ptr-brief-body`, `.ptr-brief-ol`, `.ptr-brief-footer`, `.ptr-brief-empty`, `.pts-brief-badge`. White cards, subtle borders, clean typography matching Swiss theme.
- [ ] **Step 3:** Add mobile `@media (max-width: 768px)` overrides for brief sections (smaller padding, tighter font sizes).
- [ ] **Step 4:** Bump `?v=` cache-busting params to `20260322` on ALL 12 `<script src>` tags in graduation-roadmap.html.

---

### Task 7: CLAUDE.md + Memory — Document changes

**Files:**
- Modify: `CLAUDE.md`
- Modify: `/Users/suleman/.claude/projects/-Users-suleman-dental-quest/memory/MEMORY.md`

- [ ] **Step 1:** Update "8 import block types" to "9 import block types" adding CLINICAL_BRIEF in CLAUDE.md
- [ ] **Step 2:** Add Clinical Brief patterns to Common Bugs section (full-overwrite rule, perio noise filter)
- [ ] **Step 3:** Add memory entry for Clinical Brief feature

---

### Post-Implementation Verification

1. **Parser test:** Paste example CLINICAL_BRIEF block from spec into import modal — verify preview shows teal card
2. **Import test:** Import the brief — verify patient has `clinicalBrief` object, Brief tab is default
3. **Overwrite test:** Import second brief for same patient — verify old in `briefHistory[0]`, new is current
4. **Perio cleanup test:** Check non-periodontitis patient's `importedRequirements` — routine perio IDs stripped
5. **Mobile test:** SNAPSHOT always visible, other 6 sections accordion
6. **Cross-device test:** Brief persists after refresh and syncs via Firebase
