# Phase 2: Sidebar + Kanban Layout Restructure — Status

## Vision (Synchro-Inspired)
The goal is a **Synchro-style two-panel layout** inspired by 4 reference screenshots:
1. **Synchro workstream** — Kanban board with persistent sidebar nav
2. **Crew management** — Icon rail sidebar + detail panel
3. **Analytics dashboard** — Compact metrics row + clean sections
4. **Document editor** — Clean panels, minimal chrome

Original plan file: `REDESIGN-PHASE2-LAYOUT.md` (detailed architecture + 10-step implementation plan).

---

## What's DONE (Deployed to main)

### Sidebar (Step 2) — COMPLETE
- 240px persistent sidebar with sectioned navigation
- **VIEWS**: Focus (with badge count), All Tasks (with badge count)
- **TOOLS**: Calendar, Planner, Notebook, Financials (all open existing modals)
- **APPS**: Roadmap, Sleep Calc, Body Comp (cross-app links)
- **Footer**: Streak + XP stats, data controls (sync/save/restore/help), sync status
- Desktop: full 240px sidebar
- Tablet (<=1024px): 56px icon-only rail
- Mobile (<=768px): hidden, opens as slide-out drawer via hamburger

### Grid Layout (Step 1 + Step 6) — COMPLETE
- `body.has-sidebar` class activates the new layout
- CSS Grid: `grid-template-columns: 240px 1fr`
- Sidebar is `position: sticky; top: 0; height: 100vh`
- All modals, FAB, toast remain `position: fixed` (layout-independent)

### Top Bar (Step 3) — COMPLETE
- Minimal breadcrumb-style bar: "Dental Quest > [view name]"
- Sync status indicator on right side

### Dashboard Metrics (Step 3) — COMPLETE (polished)
- Compact inline flex bar (not 5 big separate cards)
- Shows: TODAY count, REMAINING, DONE, XP (+Lv), STREAK
- Single row, minimal height

### View Toggle + Category Filter (Step 4) — COMPLETE
- Pill-style view toggle: [List] [Kanban]
- Category filter pills: All, Do Today, Financial, Clinic, Health, School, Academic, Future, Life
- Replaces old horizontal category tabs (hidden in sidebar layout)

### Task List Cleanup — COMPLETE
- Compact task rows: checkbox + text + inline meta tags (S/M/L size, FIN/CLI category, TODAY badge)
- Do-today toggle (sun/check icon) always visible on each task
- Edit/delete buttons: hover-revealed only (ghost style)
- Old clutter hidden: category tabs, XP bar, add-task form, pomodoro timer, medication tracker
- Single-column layout (timer column removed)

### JS Wiring (Steps 8-9) — COMPLETE
- `sidebarNavigate(view)` — switches Focus/Full view, updates sidebar active state
- `switchViewMode(mode)` — toggles list/kanban display
- `updateSidebarStats()` — updates all sidebar + metrics badges
- `updateMetricsRow()` — called from `updateStats()`
- Sidebar responsive init on window resize
- `body.has-sidebar` added on init

### Bug Fixes Applied
- `completedAt` type handling — numeric timestamps vs ISO strings (`.slice()` and `localeCompare` errors)
- CSS specificity: `#fullViewContainer` prefix needed to override mobile styles
- Main content grid: 2-column → 1-column when timer hidden

---

## What's NOT DONE (Needs Finishing)

### HIGH PRIORITY — Core UX Issues

1. **Kanban Board Redesign** — Current implementation has 4 columns (Locked In, Today, Tomorrow, Completed) but is "way too overwhelming." Needs complete rethink:
   - **Proposed**: Simplify to 3 columns: To Do | In Progress | Done
   - Or: Use kanban only in Focus View (triage context), not Full View
   - Cards need to be simpler — current cards have too many elements
   - Consider: Is kanban even useful for this app? Maybe replace with a different view (timeline, calendar, priority matrix)

2. **Focus View Integration** — The focus view (triage/crash out/pomodoro) renders inside `#focusModeContainer` which sits inside `.main-panel`. The sidebar "Focus" nav item works, but:
   - The triage columns should feel more like kanban columns (consistent card design)
   - Crash Out and Pomodoro tabs need to respect the new layout (they currently render fine but haven't been polished)

3. **Add Task UX** — The old add-task form is hidden. Users can still add tasks via Quick Add FAB (bottom-right button), but there's no inline add-task in the new list view. Consider:
   - Inline "Add task" row at bottom of list (like Linear)
   - Or keep FAB as the only add method (like current)

### MEDIUM PRIORITY — Polish

4. **Mobile Responsive Testing** — Tablet (1024px) icon rail and mobile (768px) drawer need real device testing
5. **Sidebar Active State** — Active state doesn't update when switching between Tools items (Calendar, Planner, etc. open modals so sidebar doesn't know which is active)
6. **Empty States** — Kanban columns and filtered task lists need proper empty state messages
7. **Keyboard Shortcuts** — No keyboard nav for sidebar items
8. **Category Filter Persistence** — Filter pills don't persist selection across page loads

### LOW PRIORITY — Nice to Have

9. **Drag-Drop in Kanban** — Basic structure exists but drag between columns isn't wired up
10. **Dashboard Expansion** — "TODAY" and "DONE" metric cards have `onclick` handlers for expansion panels that aren't fully implemented
11. **Sidebar Collapse Toggle** — User should be able to collapse sidebar to icon rail on desktop
12. **Dark Mode** — The warm clinical skin (Phase 1) is light-only. Dark mode could be a future phase.

---

## Architecture Notes for Next Session

### Key Files Modified
| File | What Changed |
|------|-------------|
| `index.html` (CSS) | ~400 new lines: grid layout, sidebar, metrics, kanban, view toggle, responsive, cleanup rules |
| `index.html` (HTML) | New `<aside>` sidebar, metrics row, view toggle + filter pills, kanban container |
| `js/dental-quest/tasks.js` | `sidebarNavigate()`, `switchViewMode()`, `renderKanbanBoard()`, `renderKanbanCard()`, compact task card HTML, `updateSidebarStats()`, `updateMetricsRow()` |
| `js/dental-quest/init.js` | Sidebar responsive init, `body.has-sidebar` class, Lucide icon refresh |
| `js/dental-quest/firebase-sync.js` | `completedAt` type handling in `applyRemoteData()` |

### CSS Class Hierarchy
- `body.has-sidebar` — Activates the new 2-panel layout
- `.app-layout` — CSS Grid container
- `.sidebar` — 240px aside (sticky)
- `.main-panel` — Right content area
- `.content-area` — Padded inner content
- `.metrics-row` — Compact stats bar
- `.view-controls` — Toggle pills + category filters
- `.kanban-board` — 4-column grid (hidden by default)
- `.has-sidebar #fullViewContainer ...` — Rules hiding old Full View clutter

### What NOT to Break
- All `getElementById()` calls still work (IDs preserved)
- All modals are `position: fixed` (layout-independent)
- Quick Add FAB is `position: fixed` (layout-independent)
- Focus mode chrome hiding (`body.focus-active`) still works
- Firebase sync, save guards, all data persistence untouched
- Triage drag-drop, crash out timeline, pomodoro timer all untouched
