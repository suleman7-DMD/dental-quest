# Dental Quest Post-Redesign Bugfix & Polish Plan

**Created**: Feb 23, 2026
**Status**: IN PROGRESS
**Branch**: main (each agent works in isolated worktree, merged phase by phase)

---

## Overview

6-agent parallel team fixing bugs and polishing the warm clinical redesign.
Each agent's work is committed separately so progress is saved incrementally.

---

## Phases (Commit After Each)

### Phase 1: Task Card Redesign — @card-designer
- **Agent**: card-designer (worktree)
- **Status**: IN PROGRESS
- **Files**: `js/dental-quest/tasks.js` (HTML templates), `index.html` (CSS lines 1-10749)
- **Changes**:
  - [ ] Modern rectangular card layout (Linear/Todoist inspired)
  - [ ] Clean checkbox left, full text center, compact action buttons right
  - [ ] Do-today button always visible (outside .task-actions)
  - [ ] Subtle shadow, border-radius, hover elevation
  - [ ] Completed state: strikethrough, muted
  - [ ] Mobile responsive cards
- **Commit message**: `Post-redesign Phase 1: Modern task card redesign`

### Phase 2: Mobile Responsive Fixes — @mobile-fixer
- **Agent**: mobile-fixer (worktree)
- **Status**: IN PROGRESS
- **Files**: `index.html` (CSS @media queries)
- **Changes**:
  - [ ] Remove task text truncation (no ellipsis on mobile)
  - [ ] Compact action buttons on mobile
  - [ ] Fix category filter pills overflow
  - [ ] Fix metrics bar mobile layout
  - [ ] Fix hamburger menu + sidebar on mobile
  - [ ] iOS Safari flex bug avoidance
  - [ ] Bottom spacing for FAB button
- **Commit message**: `Post-redesign Phase 2: Mobile responsive fixes`

### Phase 3: Kanban View Fix — @kanban-fixer
- **Agent**: kanban-fixer (worktree)
- **Status**: IN PROGRESS
- **Files**: `js/dental-quest/tasks.js` (kanban render), `index.html` (kanban CSS)
- **Changes**:
  - [ ] Fix all kanban rendering bugs
  - [ ] Modern card design in kanban columns
  - [ ] Simplify columns (was "too overwhelming")
  - [ ] Column headers, empty states
  - [ ] Action buttons work in kanban cards
  - [ ] Desktop + mobile kanban layout
- **Commit message**: `Post-redesign Phase 3: Kanban view fix and redesign`

### Phase 4: Toggle Buttons & Action Fixes — @button-fixer
- **Agent**: button-fixer (worktree)
- **Status**: IN PROGRESS
- **Files**: `js/dental-quest/tasks.js`, `js/dental-quest/init.js`
- **Changes**:
  - [ ] Fix complete checkbox onclick
  - [ ] Fix do-today toggle onclick
  - [ ] Fix edit button onclick
  - [ ] Fix delete button onclick
  - [ ] Fix view toggle (List/Kanban)
  - [ ] Fix Focus/Tasks toggle
  - [ ] Verify saveData() called after all mutations
- **Commit message**: `Post-redesign Phase 4: Fix task action buttons and toggles`

### Phase 5: Sidebar & General Bugs — @sidebar-bugfix
- **Agent**: sidebar-bugfix (worktree)
- **Status**: IN PROGRESS
- **Files**: `index.html` (CSS + HTML), `js/dental-quest/init.js`, `js/dental-quest/tasks.js`
- **Changes**:
  - [ ] Fix mobile sidebar drawer (open/close/overlay)
  - [ ] Fix body.has-sidebar toggle
  - [ ] Fix sidebar stats display
  - [ ] Fix category filter pill filtering
  - [ ] Fix metrics bar values updating
  - [ ] Fix Quick Add FAB
  - [ ] General JS error cleanup
- **Commit message**: `Post-redesign Phase 5: Sidebar fixes and general bug cleanup`

### Phase 6: Design Polish — @design-polisher
- **Agent**: design-polisher (worktree)
- **Status**: IN PROGRESS
- **Files**: `index.html` (CSS only)
- **Changes**:
  - [ ] Metrics bar typography polish
  - [ ] Category pill active states + transitions
  - [ ] Header/top bar refinement
  - [ ] View toggle pill design
  - [ ] Empty state designs
  - [ ] Hover states + micro-interactions
  - [ ] Typography hierarchy
  - [ ] Shadow system consistency
  - [ ] Verify all CSS vars used (no hardcoded colors)
- **Commit message**: `Post-redesign Phase 6: Design polish and creative refinement`

---

## Integration Strategy

Each phase is committed to main independently. Because agents edit different concerns:
- **Phase 1 + 4** overlap (tasks.js) — merge card-designer first, button-fixer resolves conflicts
- **Phase 2 + 6** overlap (CSS media queries) — merge mobile-fixer first, design-polisher resolves
- **Phase 3** is mostly independent (kanban-specific code)
- **Phase 5** is mostly independent (sidebar + general)

**Merge order**: 4 (buttons) → 1 (cards) → 5 (sidebar) → 2 (mobile) → 3 (kanban) → 6 (polish)

This order ensures functional fixes land first, then visual changes layer on top.

---

## Resume Instructions (If Session Interrupted)

1. Read this file to see which phases are DONE vs IN PROGRESS
2. Check `git log --oneline -10` to see what's been committed
3. For any IN PROGRESS phase, check if the agent's worktree has uncommitted changes:
   - `ls .claude/worktrees/` to find worktree dirs
   - Or just re-run the agent for that phase
4. For phases marked NOT STARTED, spawn a new agent with the task description above
5. After all phases committed, do a final integration test

---

## Final Verification Checklist (After All Phases)

- [ ] All task action buttons work (complete, do-today, edit, delete)
- [ ] Task text fully visible on mobile (no truncation)
- [ ] Kanban view functional and usable
- [ ] Sidebar opens/closes on mobile
- [ ] View toggle (List/Kanban) works
- [ ] Focus/Tasks toggle works
- [ ] Category filter pills work
- [ ] Metrics bar shows correct values
- [ ] Quick Add FAB works
- [ ] No console errors on load
- [ ] Brace balance verified
- [ ] Save guards intact (firebase-sync.js untouched)
- [ ] Warm clinical theme consistent (no purple, no dark)
- [ ] Works on iOS Safari
