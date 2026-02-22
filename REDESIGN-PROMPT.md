# COPY EVERYTHING BELOW THIS LINE INTO A NEW CLAUDE CODE SESSION

---

You are executing a full UI redesign of my Dental Quest app. This is a large, multi-phase operation. You will deploy a team of agents and drive this to completion without stopping.

## Step 1: Read the plan

Read these files completely before doing ANYTHING else:
1. `REDESIGN-PLAN.md` — the full design system, 11 phases, token architecture, icon mapping, component patterns
2. `REDESIGN-EXECUTION.md` — git branch strategy, emergency recovery, testing checklist
3. `interface-design/.claude/skills/interface-design/SKILL.md` — design principles you must internalize
4. `interface-design/.claude/skills/interface-design/references/principles.md` — code-level craft guidance

## Step 2: Git setup

```bash
git add -A && git commit -m "Pre-redesign snapshot" || true
git checkout -b redesign/warm-clinical || git checkout redesign/warm-clinical
```

## Step 3: Deploy agent team

Create a team and deploy 6+ agents. Here's the structure:

### Team Lead (you)
- Coordinates all agents
- Executes Phase 0 (design token foundation) FIRST before spawning workers — every other agent depends on the token system and icon helper being in place
- Runs verification after each phase completes
- Commits after each phase: `git add -A && git commit -m "Redesign Phase X: [description]"`
- Does NOT stop until all 11 phases are complete and verified

### Agent: css-phases-1-3 (general-purpose)
**After Phase 0 is committed**, execute Phases 1, 2, and 3 sequentially on index.html:
- Phase 1: Body & canvas — replace purple gradient background with `var(--canvas)`, update font-family, update body color. Lines ~14-50 of CSS.
- Phase 2: Cross-app nav — restyle `.cross-app-nav` to warm cream, olive accent active state. CSS lines ~50-90.
- Phase 3: Header & stats bar — restyle header, sync bar, view toggles, toolbar, stat cards. CSS lines ~92-200 + heavy inline style overrides in HTML lines ~10854-10941. This is the biggest single effort. Move inline styles to CSS classes where possible, use `!important` overrides where needed.

Read REDESIGN-PLAN.md Phase details for exact specs. Read each CSS section BEFORE editing. Use surgical `Edit` tool — NEVER rewrite large blocks. index.html is 12,186 lines, CSS is lines 1-10,749.

### Agent: css-phases-4-5 (general-purpose)
**After Phases 1-3 are committed**, execute Phases 4 and 5:
- Phase 4: Task list — category tabs (clean underline style), add task form, task items (borderless list, bottom dividers), checkboxes (circle, olive), task metadata, category colors (muted warm variants), medication tracker.
- Phase 5: Compact mobile header — cream background, subtle border, warm hamburger menu panel.

Read REDESIGN-PLAN.md for full specs. This is the proof-of-concept — task list must look polished.

### Agent: css-phases-6-7 (general-purpose)
**After Phases 4-5 are committed**, execute Phases 6 and 7:
- Phase 6: All modals (calendar, notebook, daily planner, financials, help). Each has its own CSS section. Base modal styling first, then per-modal tweaks.
- Phase 7: Triage mode — columns, task cards, drag-drop feedback, quick add. CSS lines ~6145-6700 (focused-view overrides with `!important`).

### Agent: css-phases-8-9 (general-purpose)
**After Phases 6-7 are committed**, execute Phases 8 and 9:
- Phase 8: Crash Out mode — timeline grid, scheduled task cards, duration controls, sleep time header.
- Phase 9: Focus/Pomodoro — SVG timer restyle (olive progress ring), task checklist, duration toggles, XP display (typography only), streak badge. This should be the CALMEST view — maximum whitespace, minimum chrome.

### Agent: js-emoji-cleanup (general-purpose)
**After Phase 0 is committed** (needs the icon helper), work through ALL JS emoji replacements in parallel with CSS agents:
- `tasks.js` — 84 emoji occurrences. Biggest file. Task rendering, category icons, size badges, XP display.
- `financials.js` — 44 emoji. Section headers, status icons, bill type indicators.
- `crash-out.js` — 32 emoji. Timeline rendering, duration labels, skip/remove buttons.
- `triage.js` — 15 emoji. Column headers, quick-add, tier indicators.
- `medications.js` — 9 emoji. Pill tracking, med settings.
- `focus-pomodoro.js` — 5 emoji. Timer display, completion.

For each file: grep for emoji first, then replace with either `icon('name')` helper calls (if the helper was set up in Phase 0), Lucide `<i data-lucide="name"></i>` tags, or plain text. See the emoji→icon mapping table in REDESIGN-PLAN.md Section 3.

Also clean emoji from index.html body (HTML lines 10751-12186) — nav links, button labels, stat labels, modal headers.

### Agent: html-emoji-cleanup (general-purpose)
**After Phase 0 is committed**, clean all ~90 emoji from index.html HTML body (lines 10751-12186):
- Cross-app nav links (🦷📚💊🏋️📝)
- Header title (🦷)
- Toolbar buttons (💾📂🗑️📓📋📅💰💊❓📚)
- Stat cards (💎🔴💪🏆)
- Streak badge (🔥)
- Sync status (⏳🔄⬆️⬇️)
- Modal headers and close buttons
- Loading overlay

Replace with Lucide icon tags or plain text per the mapping in REDESIGN-PLAN.md. Do NOT change any `id=""` attributes or `onclick=""` handlers — only the visible text/emoji content.

### Agent: polish-and-verify (general-purpose)
**After ALL other phases are committed**, execute Phases 10 and 11:
- Phase 10: Animation audit (150-200ms ease-out), hover state audit, focus ring audit (olive), loading overlay, toast notifications, empty states, scrollbar styling, selection color.
- Phase 11: Mobile responsive audit. Preserve iOS Safari flex workarounds (explicit 2-row DOM, no flex-wrap reliance). Check 1024/768/480px breakpoints. 44px touch targets. FAB button → olive accent. Quick Add bottom sheet.

Then run the FULL testing checklist from REDESIGN-PLAN.md Section 8.

## Critical rules for ALL agents

1. **Read before editing.** Always read the CSS/HTML/JS section before making changes. Use the `Read` tool.
2. **Surgical edits only.** Use the `Edit` tool. NEVER rewrite entire files. index.html is 12,186 lines — treat it like surgery.
3. **Zero logic changes.** No JS logic modifications. Only emoji string replacements and icon helper additions.
4. **DO NOT TOUCH**: firebase-sync.js save guard logic, isEmptyState(), checkpoint system, Firebase config, PIN auth, date parsing, XP calculation, EOD reset, save/sync debounce.
5. **Dark→light artifacts.** When changing from dark theme: check for white text (now invisible on white), `rgba(255,255,255,x)` borders/backgrounds, box shadows invisible on dark. Fix these as you go.
6. **Inline styles.** index.html has 213 inline `style=""` attributes. Override with CSS classes + `!important` where needed. Migrate to classes gradually, don't mass-delete.
7. **iOS Safari.** Do NOT change explicit 2-row DOM structures. Do NOT rely on flex-wrap + min-width for multi-row mobile layouts.
8. **Before changing any CSS class name**, grep for it in all 12 JS files to make sure JS doesn't reference it.
9. **Preserve all `id=""` attributes** — JS queries elements by ID extensively.

## Design tokens (quick reference)

```
Canvas:     #FAF8F5 (warm cream body)
Surface:    #FFFFFF (white cards)
Text:       #2C2825 (primary) / #6B635B (secondary) / #9C948B (tertiary) / #C4BCB3 (muted)
Accent:     #6B7C5E (olive/sage) / #5A6A4F (hover) / #E8EDE4 (light bg) / #F2F5F0 (lighter bg)
Border:     rgba(0,0,0,0.08) default / rgba(0,0,0,0.05) subtle / rgba(0,0,0,0.12) strong
Shadow-sm:  0 1px 2px rgba(0,0,0,0.04)
Shadow-md:  0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
Shadow-lg:  0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)
Font head:  'Source Serif 4', Georgia, serif
Font body:  'Inter', -apple-system, system-ui, sans-serif
Font mono:  'SF Mono', Consolas, Monaco, monospace
Radius:     6px (sm) / 8px (md) / 12px (lg)
Spacing:    4px base → 4, 8, 12, 16, 20, 24, 32, 48
```

## Sequencing constraint

```
Phase 0 (team lead) ──────────────────────────────────────────────┐
  │                                                                │
  ├──→ css-phases-1-3 ──→ css-phases-4-5 ──→ css-phases-6-7 ──→ css-phases-8-9
  │                                                                │
  ├──→ js-emoji-cleanup (parallel with CSS agents) ────────────────┤
  │                                                                │
  ├──→ html-emoji-cleanup (parallel with CSS agents) ──────────────┤
  │                                                                │
  └──────────────────────────────────────────────────────────────→ polish-and-verify (last)
```

CSS phases are SEQUENTIAL (each builds on the previous). JS/HTML emoji cleanup runs in PARALLEL with CSS work. Polish runs LAST after everything else.

## Commit after each phase

```bash
git add -A && git commit -m "Redesign Phase 0: Design token foundation"
git add -A && git commit -m "Redesign Phase 1: Body and canvas"
git add -A && git commit -m "Redesign Phase 2: Cross-app navigation"
git add -A && git commit -m "Redesign Phase 3: Header and stats bar"
git add -A && git commit -m "Redesign Phase 4: Task list"
git add -A && git commit -m "Redesign Phase 5: Compact mobile header"
git add -A && git commit -m "Redesign Phase 6: Modals"
git add -A && git commit -m "Redesign Phase 7: Triage mode"
git add -A && git commit -m "Redesign Phase 8: Crash Out mode"
git add -A && git commit -m "Redesign Phase 9: Focus Pomodoro mode"
git add -A && git commit -m "Redesign Phase 10: Polish pass"
git add -A && git commit -m "Redesign Phase 11: Mobile audit"
```

## Definition of done

The redesign is COMPLETE when:
- [ ] All 11 phases committed
- [ ] Zero console errors on page load
- [ ] Firebase sync works (green dot, saves persist across reload)
- [ ] All 8 category tabs render tasks correctly in Full View
- [ ] Task CRUD works (add, complete, delete, edit)
- [ ] View toggle switches between Full View and Focus View
- [ ] Triage drag-drop works
- [ ] Crash Out timeline renders and scheduling works
- [ ] Focus/Pomodoro timer starts, stops, and completes with XP award
- [ ] All modals open and close (Calendar, Notebook, Planner, Financials, Help)
- [ ] Mobile compact header works (hamburger menu, view toggle, sync dot)
- [ ] Quick Add FAB works
- [ ] Cross-app navigation links work
- [ ] Zero emoji visible anywhere in the UI
- [ ] No white-on-white invisible text
- [ ] No dark-theme artifacts remaining
- [ ] App looks like the Synchro reference — warm cream, olive accents, clean typography, subtle shadows

DO NOT STOP until every checkbox above is checked. If a phase fails, fix it before moving to the next. If an agent's work breaks something, roll back with `git checkout -- [file]` and redo.

Now begin. Read the plan files, set up the git branch, execute Phase 0 yourself, then deploy the team.
