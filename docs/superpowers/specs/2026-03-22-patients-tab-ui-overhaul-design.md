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

Swiss Light aesthetic (matching PR Review tab): cream `#f7f5ef` background, white cards, teal `#1a7f79` accents, Inter font. Keep colored left-border accents per section (red=medical, green=clinical, amber=perio, blue=treatment, purple=imaging).

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
- Background: white `#fff` with subtle right border
- Active row: teal left-border accent + light teal background
- Reliability dot inline before name
- Sticky positioning so sidebar stays visible while detail panel scrolls

**CSS changes in:** graduation-roadmap.html `#patientsSidebar`, `.pts-sidebar-*` styles
**JS changes in:** patients.js `renderPatientsSidebar()` — adjust HTML structure for reliability dot placement

### 3. Remove Scroll Trap

**Current:** `.pts-record-view` has `max-height: 85vh; overflow-y: auto` — creates inner scrollbar.

**New:** Remove `max-height` and `overflow-y: auto` from `.pts-record-view`. The entire page scrolls naturally. Sidebar gets `position: sticky; top: [header height]; max-height: calc(100vh - [header height]); overflow-y: auto` so patient list stays pinned while detail scrolls.

**CSS changes in:** graduation-roadmap.html `.pts-record-view` and `#patientsSidebar` styles

### 4. Patient Summary Card

**New element** at top of patient detail, before all sections.

Layout:
- Left column: Name (18px bold), meta line (chart#, age, sex, ASA), status badges (Active, Reliability, HIGH VALUE), requirement badges (compact chips), action buttons (Edit, Export, Delete)
- Right column: Last Visit date, Next Visit date/status, Next POE date

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

**CSS changes in:** graduation-roadmap.html — new `.field-card`, `.field-item` classes replacing `.ptr-field-view`
**JS changes in:** patients.js `renderPatientRecord()` — restructure field HTML to use card groupings

### 6. Compact Imaging & Periodontal

**Current:** Imaging uses a 2x2 grid of dark blocks. Periodontal has two stacked field blocks.

**New:**
- Imaging: horizontal row of 4 inline chips (label + value side-by-side), flex-wrap for mobile
- Periodontal: two side-by-side cards (Last POE | Next POE), flex-wrap to stack on mobile

**JS changes in:** patients.js `renderPatientRecord()` — change imaging grid and perio section HTML

### 7. Import Dialog Overflow Fix

**Current:** Import modal textarea/preview area has no max-height — large paste content pushes buttons off-screen.

**New:**
- Import modal: `max-height: 80vh; overflow-y: auto` on the modal body
- Textarea: `max-height: 200px; overflow-y: auto` (scrollable input)
- Preview area: `max-height: 300px; overflow-y: auto` (scrollable preview)
- Action buttons: fixed at bottom of modal, always visible

**CSS changes in:** graduation-roadmap.html import modal styles
**JS changes in:** patients.js — modal HTML may need structural adjustment for sticky footer buttons

## Files Modified

| File | Changes |
|------|---------|
| `graduation-roadmap.html` | CSS: header, sidebar, record view, field, imaging, perio, import modal styles. Approximately 200 lines of CSS changed/added. |
| `js/graduation-roadmap/patients.js` | `renderPatientsSidebar()`: tighter HTML, reliability dot. `renderPatientRecord()`: summary card, field card groupings, compact imaging/perio, priority notes repositioned. Import modal HTML. |

## What Does NOT Change

- Data model (no new fields, no Firebase changes)
- Save/sync/merge logic
- Edit mode (contenteditable + save-on-blur)
- Mobile back button behavior
- Patient CRUD operations
- Import parsing logic
- Other tabs (Mission Control, Clinical, etc.)
- Requirement matching / countdown radar

## Risk Assessment

**Low risk.** All changes are CSS + HTML template strings in render functions. The data layer is untouched. The render functions already build HTML strings that get set via `innerHTML` — we're changing what HTML they build, not how data flows.

**Testing:** Load the app, verify each patient renders correctly, test edit mode toggle, test import dialog with large paste, verify mobile layout, check that save/sync still works after viewing patients.
