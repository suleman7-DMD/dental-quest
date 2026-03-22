# Patients Tab UI Overhaul — Design Spec

**Date:** 2026-03-22
**Scope:** graduation-roadmap.html Patients tab — CSS + HTML template changes only. No data model changes.

## Problem

The Patients tab is clunky and hard to use:
- Giant red banner wastes ~200px of vertical space before content
- Sidebar is 260px wide with loose row spacing
- Patient detail panel is trapped in a `max-height: 85vh` scroll container (scroll-within-scroll)
- All sections expanded with uniform visual weight — no hierarchy
- Imaging and Periodontal sections waste vertical space on simple key-value data
- No quick-glance summary — must read every section to understand patient status
- Import dialog stretches beyond viewport when pasting large text blocks

## Design Direction

Full dark-to-light theme swap for the Patients tab content area. Swiss Light aesthetic (matching PR Review tab): cream `#f7f5ef` background, white `#fff` cards, teal `#1a7f79` accents, Inter font. Keep colored left-border accents per section (red=medical, green=clinical, amber=perio, blue=treatment, purple=imaging). The app-wide header and tab bar remain dark (unchanged).

## Changes

### 1. Compact Header (200px → ~50px)

**Current:** Full-width red gradient block with large centered title, subtitle, sync status, and 4 action buttons (Checkpoint, Restore, Force Upload, Force Pull) on a second row.

**New:** Single-row red bar with:
- Left: title + subtitle inline
- Right: sync dot + "Synced" label + compact buttons (Checkpoint, Sync dropdown for Restore/Force Upload/Force Pull)

**CSS changes in:** graduation-roadmap.html `.header` styles
**JS changes:** None — same DOM, just restyled. Sync buttons can stay as-is or be collapsed behind a menu (stretch goal).

### 2. Slim Sidebar (260px → 200px)

**Current:** `#patientsSidebar` at 260px, search + Import/New buttons + patient rows with name + chart#.

**New:**
- Width: 200px
- Row height: tighter padding (6px 10px vs current)
- Font: 12px name, 10px chart#
- Background: white `#fff` with subtle right border (`1px solid rgba(23,33,43,0.08)`)
- Active row: teal `#1a7f79` left-border accent + light teal background `rgba(26,127,121,0.08)`
- Reliability dot inline before name (green/yellow/red/gray)
- Sticky positioning: `position: sticky; top: 0; max-height: 100vh; overflow-y: auto`
- **CRITICAL:** Remove `overflow: hidden` from `#patientsMainLayout` — sticky positioning does NOT work inside an `overflow: hidden` container

**CSS changes in:** graduation-roadmap.html `#patientsSidebar`, `.pts-sidebar-*` styles, `#patientsMainLayout`
**JS changes in:** patients.js `renderPatientsSidebar()` — adjust HTML structure for reliability dot placement

### 3. Remove Scroll Trap

**Current:** `.pts-record-view` has `max-height: 85vh; overflow-y: auto` — creates inner scrollbar.

**New:** Remove `max-height` and `overflow-y: auto` from `.pts-record-view`. The entire page scrolls naturally. Sidebar stays pinned via sticky positioning (see #2).

**CSS changes in:** graduation-roadmap.html `.pts-record-view` and `#patientsMainLayout` styles

### 4. Patient Summary Card

**New element** at top of patient detail, before all sections.

Layout:
- Left column: Name (18px bold), meta line (chart# + status), status badges (Active/Inactive, Reliability dot, HIGH VALUE if `highValue` flag set), requirement badges (compact chips from `importedRequirements` or `computeRequirementMatches()`), action buttons (Edit, Copy Chart#, Delete — same as current, no new functions)
- Right column: Last Visit date, Next Visit date/status, Next POE date (from `periodontal.nextPoe`)

**Note:** Age/sex/ASA are NOT dedicated fields on patient records. Only display if parseable from medicalHx text; otherwise omit. Do NOT add new data model fields.

**JS changes in:** patients.js `renderPatientRecord()` — add summary card HTML before existing sections. Data already available in patient object.

### 5. Tighter Field Density

**Current:** `.ptr-field-view` has `padding: 6px 10px`, `border-left: 3px solid`, thick borders. Labels are 0.7em uppercase.

**New:**
- White card containers grouping related fields (Medical History + Medications in one card)
- Field items separated by thin 1px dividers within cards
- Labels: 10px uppercase with section color
- Text: 13px, `#334155`, line-height 1.5
- Card: white background, 1px border, 8px radius, subtle shadow
- Priority Notes: amber background card (`#fffbeb`) with 4px amber left border, positioned right after summary card (most actionable info first)

**Section IDs remain unchanged:** `'info'`, `'clinical'`, `'perio'`, `'treatment'`, `'imaging'`, `'notes'`, `'priority'` — so `collapsedSections` state is preserved across re-renders.

**Edit mode:** `contenteditable` divs keep `data-patient-id` and `data-field` attributes unchanged. The `savePatientField()` function and `_suppressBlurSave` guard are not affected.

**CSS changes in:** graduation-roadmap.html — new `.field-card`, `.field-item` classes replacing `.ptr-field-view`
**JS changes in:** patients.js `renderPatientRecord()` — restructure field HTML to use card groupings

### 6. Compact Imaging & Periodontal

**Current:** Imaging uses a 2x2 grid of dark blocks. Periodontal has two stacked field blocks.

**New:**
- Imaging: horizontal row of 4 inline chips (label + value side-by-side), flex-wrap for mobile
- Periodontal: two side-by-side cards (Last POE | Next POE), flex-wrap to stack on mobile

**JS changes in:** patients.js `renderPatientRecord()` — change imaging grid and perio section HTML

### 7. Import Dialog Overflow Fix

**Current:** `buildImportModalHtml()` already has `max-height: 90vh` on outer container, `flex: 1; min-height: 200px; resize: vertical` on textarea, and `max-height: 250px; overflow-y: auto` on preview. The bug is that `resize: vertical` has no max constraint — user can drag textarea to fill entire modal, pushing buttons off-screen.

**Fix:**
- Textarea: add `max-height: 200px` (replaces unbounded `resize: vertical` growth) and keep `overflow-y: auto`
- Ensure action buttons row has `flex-shrink: 0` so it never gets squeezed off-screen
- Keep existing `max-height: 90vh` on outer container and `max-height: 250px` on preview

**CSS changes in:** graduation-roadmap.html import modal styles
**JS changes in:** patients.js `buildImportModalHtml()` — add max-height to textarea, flex-shrink to button row

## Files Modified

| File | Changes |
|------|---------|
| `graduation-roadmap.html` | CSS: header, sidebar, `#patientsMainLayout` (remove overflow:hidden), record view, field, imaging, perio, import modal styles. Light theme for patients tab. ~200 lines CSS changed/added. Mobile `@media` blocks updated for new widths/density. |
| `js/graduation-roadmap/patients.js` | `renderPatientsSidebar()`: tighter HTML, reliability dot inline. `renderPatientRecord()`: summary card, field card groupings, compact imaging/perio, priority notes repositioned. `buildImportModalHtml()`: textarea max-height + button flex-shrink. |

## What Does NOT Change

- Data model (no new fields, no Firebase changes)
- Save/sync/merge logic
- Edit mode (contenteditable + save-on-blur, same data-* attributes)
- Mobile back button behavior
- Patient CRUD operations
- Import parsing logic
- `collapsedSections` state and section IDs
- Other tabs (Mission Control, Clinical, etc.)
- Requirement matching / countdown radar
- `savePatientField()` function and `_suppressBlurSave` guard

## Risk Assessment

**Low risk.** All changes are CSS + HTML template strings in render functions. The data layer is untouched. The render functions already build HTML strings that get set via `innerHTML` — we're changing what HTML they build, not how data flows.

**Key implementation notes:**
- Preserve all `data-patient-id` and `data-field` attributes on contenteditable elements
- Preserve all `onclick` handlers and their escaped IDs
- Use `escapeHtml()` on all user text in innerHTML
- Keep mobile `@media (max-width: 768px)` overrides working (sidebar hidden, back button shown)
- Test that `collapsedSections` toggle still works with new card structure

**Testing:** Load the app, verify each patient renders correctly, test edit mode toggle, test import dialog with large paste, verify mobile layout, check that save/sync still works after viewing patients.
