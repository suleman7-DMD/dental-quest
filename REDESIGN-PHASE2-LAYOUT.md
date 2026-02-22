# Dental Quest Layout Restructure — Phase 2 Plan

**Goal**: Transform the single-column stacked layout into a sidebar + main content two-panel layout inspired by Synchro, with card-based task views and dashboard metrics.

**Prerequisite**: Phase 1 redesign (warm clinical skin swap) must be complete and merged. All design tokens, emoji cleanup, and component styles carry over.

**Reference**: Synchro workstream view, analytics dashboard, crew detail page (screenshots from user).

---

## 1. Target Layout

### Desktop (>1024px)
```
┌──────────────────────────────────────────────────┐
│  Top bar: breadcrumb / search / sync status      │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Sidebar   │   Main Content Area                 │
│  (240px)   │                                     │
│            │   ┌─────────────────────────────┐   │
│  DQ logo   │   │  Dashboard metrics row      │   │
│            │   │  (stats cards in grid)       │   │
│  VIEWS     │   └─────────────────────────────┘   │
│  ○ Today   │                                     │
│  ○ All     │   ┌─────────────────────────────┐   │
│    Tasks   │   │  Task view (list/board)      │   │
│  ○ Focus   │   │                              │   │
│            │   │  Category filters as pills   │   │
│  TOOLS     │   │  above the task area         │   │
│  ○ Calendar│   │                              │   │
│  ○ Planner │   └─────────────────────────────┘   │
│  ○ Notebook│                                     │
│  ○ Finance │   ┌─────────────────────────────┐   │
│            │   │  Medication tracker          │   │
│  APPS      │   │  (compact card)              │   │
│  ○ Roadmap │   └─────────────────────────────┘   │
│  ○ Sleep   │                                     │
│  ○ Body    │                                     │
│            │                                     │
│  ──────    │                                     │
│  Streak:12 │                                     │
│  XP: 2450  │                                     │
│  Level: 5  │                                     │
└────────────┴─────────────────────────────────────┘
```

### Tablet (768-1024px)
- Sidebar collapses to icon-only rail (48px wide)
- Hover/click expands to full width overlay
- Main content takes full remaining width

### Mobile (<768px)
- Sidebar hidden entirely
- Hamburger menu in top bar opens sidebar as slide-out drawer
- Compact header stays (already redesigned in Phase 1)
- Main content is full-width

---

## 2. Sidebar Structure

### Sections
1. **Logo/Identity** — "DQ" text or small tooth icon + "Dental Quest"
2. **Views** (primary nav) — Today (Do Today filtered), All Tasks, Focus Mode
3. **Tools** (secondary nav) — Calendar, Daily Planner, Notebook, Financials
4. **Apps** (cross-app links) — D3 Roadmap, Sleep Calc, Body Comp
5. **Stats footer** — Streak count, XP/Level, sync status dot

### Behavior
- Clicking a sidebar item loads that view into the main content area
- Active item: var(--accent-light) bg + var(--accent) text + left border accent
- Inactive: var(--fg-tertiary) text
- Hover: var(--canvas-subtle) bg
- Icons from Lucide (already loaded) + text labels

---

## 3. Main Content Area

### Dashboard Header (always visible)
Inspired by the analytics screenshot — a row of stat cards:
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Do Today │ │ Remaining│ │ Completed│ │ XP Today │
│    4     │ │   12     │ │    8     │ │   +250   │
│ 2 locked │ │ 3 big    │ │ today    │ │ Level 5  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```
- White cards, subtle border, monospace numbers (already styled from Phase 1)
- Clickable — "Do Today" card filters to do-today tasks, etc.

### Task Area
Two view modes toggled by pills in the header:
1. **List view** (default) — Current task list, Linear-style (already styled)
2. **Board view** (new) — Kanban-ish columns: To Do | In Progress | Done
   - Or by category: Financial | Clinic | Health | School | etc.
   - Cards in a responsive grid (like Synchro workstream)

### Category Filters
Move from horizontal tabs above task list to:
- Small filter pills/chips above the task area
- Multi-select (can show multiple categories at once)
- "All" pill selected by default

---

## 4. HTML Changes Required

### New wrapper structure
```html
<body>
  <div class="app-layout">
    <aside class="sidebar" id="sidebar">
      <!-- Logo, nav sections, stats footer -->
    </aside>
    <div class="main-content">
      <header class="top-bar">
        <!-- Breadcrumb, search, sync -->
      </header>
      <div class="content-area">
        <!-- Dashboard metrics + task view + meds -->
      </div>
    </div>
  </div>
</body>
```

### Elements to relocate (not delete — move from current positions)
- Cross-app nav links → sidebar "Apps" section
- Category tabs → sidebar "Views" or main content filter pills
- Toolbar buttons (save, checkpoint, etc.) → sidebar "Tools" section
- Stats cards → main content dashboard header
- Streak/XP badge → sidebar footer
- View toggle (Full/Focus) → sidebar "Views" section

### New elements to create
- `<aside class="sidebar">` wrapper
- `<div class="main-content">` wrapper
- `<header class="top-bar">` (minimal)
- Board view container (if adding kanban)
- Sidebar collapse/expand button

---

## 5. CSS Changes

### Layout foundation
```css
.app-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--surface-primary);
  border-right: 1px solid var(--border-default);
  padding: 16px 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.main-content {
  background: var(--canvas);
  padding: 24px 32px;
  overflow-y: auto;
}
```

### Responsive
```css
@media (max-width: 1024px) {
  .app-layout { grid-template-columns: 48px 1fr; }
  .sidebar .nav-label { display: none; }
}

@media (max-width: 768px) {
  .app-layout { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed; left: -240px; z-index: 100;
    transition: left 0.2s ease;
  }
  .sidebar.open { left: 0; }
}
```

---

## 6. JS Changes Required

### Navigation logic
- `switchToView(viewName)` — replaces current tab/view toggle logic
- Sidebar click handlers update active state + load content
- `toggleSidebar()` for mobile drawer

### View management
- Current `currentView = 'full'|'focus'` stays but integrated into sidebar
- Category filtering might change from single-select tabs to multi-select pills
- Board view (if added) needs new render function

### What stays the same
- All task CRUD (addTask, renderTasks, etc.)
- All Firebase sync (save guards, checkpoint system)
- All focus mode logic (triage, crash out, pomodoro)
- All modal logic (calendar, notebook, planner, financials)
- Medication tracking
- XP/gamification

---

## 7. Estimated Effort

| Component | Effort | Risk |
|-----------|--------|------|
| HTML restructure (sidebar + wrapper) | Medium | Medium — must not break JS ID queries |
| CSS layout (grid + sidebar + responsive) | Medium | Low — new CSS, minimal override conflicts |
| JS navigation (sidebar click handlers) | Small | Low — mostly wiring |
| Move toolbar to sidebar | Small | Low — HTML relocation |
| Move stats to dashboard row | Small | Low — HTML relocation |
| Mobile sidebar drawer | Medium | Medium — iOS Safari testing needed |
| Board view (optional) | Large | Medium — new render logic |
| **Total** | **2-3 sessions** | **Medium** |

---

## 8. Execution Strategy

### Session 1: Sidebar + Layout Grid
1. Create sidebar HTML structure
2. Add CSS grid layout (sidebar + main content)
3. Move cross-app nav links to sidebar
4. Move toolbar buttons to sidebar
5. Move stats to dashboard header
6. Wire up sidebar navigation JS
7. Mobile: sidebar as drawer

### Session 2: Content Area Refinement
1. Dashboard metrics row styling
2. Category filter pills (replacing tabs)
3. Task list within new layout
4. Focus mode within new layout
5. All modals still work (they're overlays — should be fine)

### Session 3 (Optional): Board View
1. New board/kanban view for tasks
2. Toggle between list and board
3. Drag-drop between board columns
4. Responsive board layout

---

## 9. What Carries Over from Phase 1

Everything from the current warm-clinical redesign:
- All :root design tokens (colors, fonts, shadows, spacing)
- All component styles (buttons, inputs, cards, badges, pills)
- All emoji → icon replacements
- Task item styling (just re-housed in new layout)
- Modal styling (overlays are layout-independent)
- Mobile component styles (just responsive triggers change)

Phase 1 = correct visual language. Phase 2 = correct spatial organization.
