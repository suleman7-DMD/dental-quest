# Redesign Execution — Prompt + Failsafe

---

## Failsafe: Git Branch Strategy

**BEFORE starting any redesign work, run these commands:**

```bash
# 1. Make sure main is clean
git add -A && git commit -m "Pre-redesign snapshot"

# 2. Create the redesign branch
git checkout -b redesign/warm-clinical

# 3. Verify you're on the branch
git branch --show-current
# Should show: redesign/warm-clinical
```

**After each phase completes:**
```bash
# Commit the phase
git add -A && git commit -m "Redesign Phase X: [description]"
```

**If it all goes to shit:**
```bash
# Option A: Undo just the last phase (keep earlier phases)
git log --oneline -5          # Find the commit before the bad phase
git reset --hard <commit-hash> # Roll back to that commit

# Option B: Nuclear — abandon entire redesign, back to original
git checkout main
git branch -D redesign/warm-clinical   # Delete the branch entirely

# Option C: Soft undo — keep the code but unstage everything
git reset HEAD~1               # Undo last commit, keep files as unstaged changes
```

**The golden rule**: Every phase is its own commit. You can always roll back to any phase boundary. Main branch is never touched until you're happy with the full result.

**When you're happy with everything:**
```bash
git checkout main
git merge redesign/warm-clinical
```

---

## Execution Prompt

Copy everything below this line and paste it as your first message in a new Claude Code session.

---

```
I'm executing a UI redesign of my Dental Quest app (index.html + 12 JS modules). The full plan is in REDESIGN-PLAN.md — read it completely before doing anything.

IMPORTANT CONTEXT:
- We're on branch `redesign/warm-clinical` (if not, create it from main first)
- The interface-design reference repo is at /dental-quest/interface-design/ — read the SKILL.md and references/principles.md for design principles
- Current app is dark purple gradient with emoji everywhere
- Target is warm cream/olive Synchro-style (light mode, subtle shadows, zero emoji)
- All functionality must be preserved — zero JS logic changes, only visual/string changes

EXECUTE SESSION [NUMBER] FROM REDESIGN-PLAN.md:

Session 1 = Phases 0-3 (tokens, body, nav, header, stats)
Session 2 = Phases 4-5 (task list, mobile header)
Session 3 = Phases 6-7 (modals, triage)
Session 4 = Phases 8-9 (crash out, focus/pomodoro)
Session 5 = Phases 10-11 (polish, mobile audit)

RULES:
1. Read REDESIGN-PLAN.md first. Follow it exactly.
2. Read the current CSS/HTML before editing. Use surgical Edit tool, never rewrite full files.
3. index.html is 12,186 lines. CSS is lines 1-10,749. HTML is lines 10,751-12,186. Read the specific section before editing.
4. JS modules are in js/dental-quest/*.js — only touch these for emoji replacement, never for logic changes.
5. Commit after each phase: git add -A && git commit -m "Redesign Phase X: [description]"
6. After each phase, verify: no console errors, Firebase sync works, task CRUD works, modals open/close.
7. DO NOT touch: firebase-sync.js logic, save guards, isEmptyState(), checkpoint system, date parsing, XP calculation, Firebase config, PIN auth.
8. When replacing emoji in JS files, grep for the emoji first to find all occurrences. Replace with either icon() helper calls or plain text.
9. For inline styles in HTML: override with CSS classes + !important where needed. Don't mass-delete inline styles — migrate them gradually per phase.
10. Dark-to-light transition will expose white-on-white text and rgba(255,255,255,x) artifacts. Check for these after each phase.

DESIGN TOKENS (quick reference — full list in REDESIGN-PLAN.md):
- Canvas: #FAF8F5 (warm cream)
- Surface: #FFFFFF (white cards)
- Text: #2C2825 (primary), #6B635B (secondary), #9C948B (tertiary)
- Accent: #6B7C5E (olive/sage)
- Border: rgba(0,0,0,0.08)
- Shadow: 0 2px 8px rgba(0,0,0,0.06)
- Font heading: 'Source Serif 4', Georgia, serif
- Font body: 'Inter', system-ui, sans-serif
- Spacing base: 4px (scale: 4,8,12,16,20,24,32,48)
- Radius: 6px (small), 8px (medium), 12px (large)

Start with Phase [X] now. Read the relevant CSS section first, then make surgical edits.
```

---

## Per-Session Prompt Variants

### Session 1 Prompt
Replace `[NUMBER]` with `1` and `[X]` with `0`. Add:
```
This is the first session. Start by:
1. Reading REDESIGN-PLAN.md fully
2. Reading interface-design/.claude/skills/interface-design/SKILL.md
3. Creating the git branch if not already on redesign/warm-clinical
4. Execute Phases 0, 1, 2, 3 in order
5. Commit after each phase
```

### Session 2 Prompt
Replace `[NUMBER]` with `2` and `[X]` with `4`. Add:
```
Session 1 is done (Phases 0-3). The app has warm cream canvas, redesigned header and stats.
Execute Phases 4 and 5 now. This is the proof-of-concept session — task list must look great.
The icon() helper function was added in Phase 0 — use it for emoji replacements in tasks.js.
```

### Session 3 Prompt
Replace `[NUMBER]` with `3` and `[X]` with `6`. Add:
```
Sessions 1-2 done (Phases 0-5). Full View works. Mobile header works.
Execute Phases 6 and 7. Modals + Triage mode.
financials.js has 44 emoji — biggest JS cleanup in this session.
Each modal (calendar, notebook, planner, financials) has its own CSS section — read each before editing.
```

### Session 4 Prompt
Replace `[NUMBER]` with `4` and `[X]` with `8`. Add:
```
Sessions 1-3 done (Phases 0-7). Full View complete. Modals complete. Triage complete.
Execute Phases 8 and 9. Crash Out timeline + Focus/Pomodoro.
crash-out.js has 32 emoji. focus-pomodoro.js has 5.
Focus mode should be the CALMEST view — maximum whitespace, minimum chrome.
The Pomodoro SVG circle stays but gets restyled: olive progress ring on cream.
```

### Session 5 Prompt
Replace `[NUMBER]` with `5` and `[X]` with `10`. Add:
```
Sessions 1-4 done (Phases 0-9). All views redesigned.
Execute Phases 10 and 11. Polish pass + mobile audit.
Check: every hover state, every focus ring, every animation duration.
Test on iOS Safari viewport if possible (320px, 375px, 390px widths).
Preserve the explicit 2-row DOM structure for task layouts (iOS Safari flex bug).
After this session, the redesign is complete. Run full testing checklist from REDESIGN-PLAN.md.
```

---

## Emergency Recovery Cheat Sheet

| Situation | Command |
|-----------|---------|
| Last phase broke things | `git reset --hard HEAD~1` |
| Last 2 phases broke things | `git reset --hard HEAD~2` |
| Everything is broken | `git checkout main` |
| Want to see what changed | `git diff HEAD~1` |
| Want to see all redesign changes | `git diff main..HEAD` |
| Keep branch but start phase over | `git checkout -- index.html` (resets file) |
| App won't load at all | `git stash` then test, `git stash pop` to restore |
| Firebase sync broken | You touched firebase-sync.js logic — `git checkout -- js/dental-quest/firebase-sync.js` |
| Save guards broken | Same — `git checkout -- js/dental-quest/firebase-sync.js` |
| Specific JS file broken | `git checkout -- js/dental-quest/[filename].js` |
| Need to compare with original | `git show main:index.html > /tmp/original.html` then open both |

---

## Pre-Flight Checklist (Run Before Session 1)

```bash
# 1. Verify clean state
git status

# 2. Commit anything uncommitted
git add -A && git commit -m "Pre-redesign snapshot"

# 3. Create branch
git checkout -b redesign/warm-clinical

# 4. Verify branch
git branch --show-current

# 5. Create an in-app checkpoint too (belt + suspenders)
# Open the app in browser → click 💾 Checkpoint button

# 6. Verify the plan file exists
cat REDESIGN-PLAN.md | head -5

# 7. Verify interface-design reference exists
ls interface-design/.claude/skills/interface-design/SKILL.md

# Ready to go.
```
