# D3 Roadmap Split — Execution Prompt

> **How to use**: Copy everything below the line into a fresh Claude Code session when ready to execute.

---

## COPY BELOW THIS LINE

I need you to execute a carefully planned split of my `d3-roadmap.html` monolith (~17,575 lines) into 10 JS modules. The full plan is documented in `D3-ROADMAP-SPLIT-PLAN.md` at the repo root — read it completely before doing anything.

### Context

This is the third monolith-to-modules split in this project. Two prior splits succeeded:

1. **Stim calc** (Feb 2026): 11,526-line monolith → 10 JS modules. Plan: `SPLIT-PLAN-V2.md`. Commit: `f1a3998`.
2. **Index.html** (Feb 2026): 22,900-line monolith → 12 JS modules. Plan: `INDEX-SPLIT-PLAN.md`. Commit: `98de474`.

Both are documented in `CLAUDE.md` and project memory. The d3-roadmap split follows the same proven methodology.

### What you must read before starting

1. **`D3-ROADMAP-SPLIT-PLAN.md`** — The full split plan. Read it top to bottom. Every function-to-module assignment, every line range, every verification step is in there. This is your bible.
2. **`CLAUDE.md`** — Project rules, Firebase patterns, save guard requirements. Already in your context.
3. **`d3-roadmap.html`** — The source file being split. You will need to read specific sections as you work each phase.
4. Load the **`d3-roadmap-dev`** skill for additional app-specific context.

### Execution approach: Agent team with sequential phases

Deploy a **multi-agent team** to execute the split. The split has **6 phases** that MUST execute sequentially (each phase depends on the prior phase's committed output). However, within phases 3 and 4, multiple modules can be extracted in parallel by separate agents.

**Team structure:**

- **Team lead (you)**: Orchestrate phases, run pre-flight, handle git operations, perform verification between phases, merge at the end. You own Phases 1, 2, 5, and 6 because they are high-risk and require careful sequential attention.
- **Agent per parallel extraction**: Within Phase 3, up to 3 agents can work in parallel (deadlines.js, grades.js, exam-content.js). Within Phase 4, up to 4 agents can work in parallel (clinical.js, import-system.js, daily-planner.js, monthly-planner.js). These agents extract functions and create module files — the team lead integrates their work, deletes the corresponding inline JS from d3-roadmap.html, adds script tags, and commits.

### Phase execution order (STRICT — never skip or combine)

```
Pre-Flight  →  Phase 1 (state.js)  →  Phase 2 (firebase-sync.js)  →  Phase 3 (deadlines + grades + exam-content)  →  Phase 4 (clinical + import + planners)  →  Phase 5 (init.js)  →  Phase 6 (merge)
```

Each phase gets its own git commit. Verification happens after every phase. If verification fails, fix the issue before proceeding — never skip verification.

### Critical safety rules

1. **Work on `split-d3-roadmap` branch only.** Never touch main until Phase 6 merge.
2. **All 5 save guards in `saveData()` must survive intact.** After Phase 2, grep for all 5 guards and verify they're present. The guards are:
   ```
   if (isInitialLoad) return false;
   if (!hasLoadedFromCloud) return false;
   if (isEmptyState(roadmapData)) return false;
   if (!roadmapData._dataLoaded) return false;
   if (firebaseSyncEnabled && !pinValidated) return false;
   ```
3. **`mergeRemoteState()` consolidation is the hardest part.** Phase 2 consolidates 4 duplicated merge blocks into 1 function. The exact implementation is in the plan. Every field must be preserved — if you miss a field, data loss occurs silently.
4. **ZERO auto-executing code except in init.js.** Every other module only defines functions and variables. The `init()` call at the bottom of init.js is the only thing that runs at parse time. Violating this was the root cause of the post-split boot crash in the index.html split.
5. **Use `safeLocalStorageSet()` for ALL localStorage writes.** Never use raw `localStorage.setItem()`.
6. **Brace balance check after every module creation**: `python3 -c "c=open('filename').read(); print(c.count('{'), c.count('}'))"`
7. **Date parsing**: Always use `const [y,m,d] = str.split('-').map(Number); new Date(y, m-1, d)` — never `new Date('2026-02-02')`.
8. **If anything breaks, `git checkout main` gets you back instantly.** Don't fight bugs across phases — revert the phase and redo it.

### Pre-flight (team lead does this first)

Before deploying any agents:

```bash
# 1. Verify the app works — open d3-roadmap.html in browser manually
# 2. Commit clean state
git add -A && git commit -m "Pre-split checkpoint for d3-roadmap"
# 3. Create feature branch
git checkout -b split-d3-roadmap
# 4. Create directory
mkdir -p js/d3-roadmap
# 5. Verify
git status
```

### Phase-by-phase instructions

Follow `D3-ROADMAP-SPLIT-PLAN.md` exactly for each phase. The plan specifies:
- Exact line ranges for every function to extract
- Which module each function belongs to
- Script loading order (state → firebase-sync → deadlines → grades → exam-content → clinical → import-system → daily-planner → monthly-planner → init)
- Verification checklists per phase
- Commit messages per phase

**For each phase, the workflow is:**
1. Read the relevant section of `d3-roadmap.html` to see the current state of the code
2. Create the module `.js` file(s) with the assigned functions (copy verbatim — no refactoring unless the plan explicitly calls for it)
3. Delete the extracted functions from the inline `<script>` block in `d3-roadmap.html`
4. Add the `<script src>` tag(s) in the correct loading order position
5. Verify brace balance in the new module(s)
6. Verify brace balance in d3-roadmap.html (the remaining inline JS should still be balanced)
7. Commit with the exact commit message from the plan

**The ONLY refactoring allowed is what the plan explicitly calls for:**
- Phase 2: Consolidate 4 merge blocks → 1 `mergeRemoteState()` function (code provided in plan)
- Phase 5: Wrap `initUI()` tab renders in try/catch (pattern provided in plan)

Everything else is a verbatim extraction — copy the function out, delete it from the original, wire up the script tag.

### What "done" looks like

When all 6 phases are complete:
- `d3-roadmap.html` contains ONLY CSS + HTML + `<script src>` tags (ZERO inline JavaScript)
- `js/d3-roadmap/` contains exactly 10 `.js` files
- All 10 files have balanced braces
- All 5 save guards present in `firebase-sync.js`
- `mergeRemoteState()` replaces all 4 former merge blocks
- `initUI()` has try/catch per-tab for error isolation
- The app boots, all 11 tabs work, Firebase syncs, checkpoints work
- Everything is on `split-d3-roadmap` branch, ready to merge to main

### Post-completion

After all phases pass verification:
1. Merge to main: `git checkout main && git merge split-d3-roadmap`
2. Push: `git push origin main`
3. Verify live at suleman7-dmd.github.io/dental-quest/d3-roadmap.html
4. Update CLAUDE.md with the new architecture (module map, file layout, key locations)

### Important notes

- **Do NOT rebuild d3-roadmap.html from scratch.** Use surgical `Edit` tool operations to delete extracted functions.
- **Do NOT modify any CSS or HTML.** The split only touches JavaScript.
- **Do NOT add features, refactor logic, or "improve" code** beyond what the plan explicitly calls for.
- **Do NOT touch any other app files** (index.html, body-comp, stim-calc).
- **Read the actual code before extracting.** The plan's line ranges are approximate — always verify by reading the current file state before cutting.
- **After each phase commit, read d3-roadmap.html's script section** to confirm the remaining inline JS is what you expect.
- If you encounter any ambiguity, the plan is the authority. If the plan and the code disagree on line numbers, trust the code (line numbers shift as earlier phases remove content).

Begin by reading `D3-ROADMAP-SPLIT-PLAN.md` in full, then execute the pre-flight, then start Phase 1.
