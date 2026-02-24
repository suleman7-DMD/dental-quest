# Synchro-Style Dental Quest Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Dental Quest's task list and kanban views into a Synchro-inspired design with 5 time-horizon urgency columns, unified Synchro-style task cards, and mobile-first responsive layout.

**Architecture:** Replace the current 3-column generic kanban (To Do / In Progress / Done) with 5 urgency-based columns (Must Today / Up Next / This Week / This Month / Someday). Create a unified task card component inspired by Synchro's clean rectangular cards with title, category, date, size indicator, and metadata. Rewrite list view to group by urgency sections. Add `task.urgency` field with bidirectional propagation to `doToday` and `triageTier`.

**Design Reference:** Synchro (studiothread.co) — warm cream canvas (#FAF8F5), white card surfaces, olive accents (#6B7C5E), clean typography (Inter body, Source Serif 4 headings), subtle warm shadows.

---

## Design Tokens (Already Exist in :root)

- Canvas: `--canvas: #FAF8F5`, `--canvas-subtle: #F5F2ED`, `--canvas-inset: #EFECE6`
- Surface: `--surface-primary: #FFFFFF`
- Text: `--fg-primary: #2C2825`, `--fg-secondary: #6B635B`, `--fg-tertiary: #9C948B`
- Accent: `--accent: #6B7C5E` (olive)
- Semantic: `--destructive: #B85C5C` (rust), `--warning: #C4923A` (amber), `--success: #5E8A5E`, `--info: #5E7A8A`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg` (warm-tinted)
- Radius: `--radius-sm: 6px`, `--radius-md: 8px`, `--radius-lg: 12px`
- Category colors: `--cat-financial` through `--cat-life` with `-light` variants

## Urgency Column Mapping

| Column | Key | Accent | Propagation |
|--------|-----|--------|-------------|
| Must Today | `eod` | `--destructive` (#B85C5C) | Sets `doToday=true`, `triageTier='lockedIn'` |
| Up Next | `soon` | `--warning` (#C4923A) | Clears lockedIn |
| This Week | `week` | `--accent` (#6B7C5E) | No propagation |
| This Month | `month` | `--info` (#5E7A8A) | No propagation |
| Someday | `inbox` | `--fg-tertiary` (#9C948B) | Default for new tasks |

## Synchro-Style Card Layout

```
┌──────────────────────────────────────┐
│  Review Peds Exam 2 pharm notes      │  ← bold title (13-14px, --fg-primary)
│  ● School     Feb 24, 2026           │  ← category dot + label + date
│  ━━━━━━━░░░░  30 min                 │  ← size/time bar (S=15m, M=30m, L=60m)
│  ☀ Today    ⚡ Leverage       ✎  🗑  │  ← badges + action icons
└──────────────────────────────────────┘
```

Card: white surface, 1px border-subtle, 12px radius, 12px padding, warm shadow-sm hover

## Agent Assignments

1. **@synchro-css** — CSS: 5-column kanban + card styles + capacity bars + animations
2. **@synchro-html** — HTML: 5-column kanban structure + quick add urgency picker
3. **@synchro-tasks-engine** — JS tasks.js: kanban engine + list view + unified card
4. **@synchro-data-model** — JS state.js + firebase-sync.js: urgency field + propagation
5. **@synchro-triage-init** — JS triage.js + init.js: triage updates + quick add + mobile
6. **@synchro-mobile** — CSS + JS: mobile tab-snap kanban + responsive + bug fixes

## Files Modified

- `index.html` — CSS (lines ~11410-11650 kanban CSS rewrite + new sections) + HTML (lines ~11984-12012 kanban structure)
- `js/dental-quest/tasks.js` — renderKanbanBoard, renderKanbanCard, renderTasks, setupKanbanDragDrop, kanbanDropTask, quickAddToColumn, new renderUnifiedCard
- `js/dental-quest/state.js` — urgency field defaults, migration helper
- `js/dental-quest/firebase-sync.js` — buildSaveData urgency field, loadDataFromFirebase migration
- `js/dental-quest/triage.js` — triageQuickAddTask urgency default
- `js/dental-quest/init.js` — submitQuickAdd urgency picker, mobile kanban init

## Merge Strategy

Each agent works in an isolated git worktree. Merge in this order:
1. @synchro-data-model (foundation — urgency field)
2. @synchro-html (structure — 5-column HTML)
3. @synchro-css (styling — kanban CSS)
4. @synchro-tasks-engine (rendering — JS)
5. @synchro-triage-init (support modules)
6. @synchro-mobile (polish — responsive)
