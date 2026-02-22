# Redesign Resume Plan — Full Review + Finish

## Status as of Feb 22, 2026
Branch: `redesign/warm-clinical` (6 commits ahead of main)

### Commits on branch:
1. `9189f94` Phase 0: Design token foundation
2. `5563e5a` Phases 1-3 + Wave 1 emoji cleanup
3. `8b3602c` JS emoji cleanup (~181 replacements, 6 files)
4. `733c862` Phases 4-5: Task list + compact mobile header
5. `16fc298` Phases 6-7: Modals + Triage mode
6. `ac385e8` Phases 8-9: Crash Out + Focus/Pomodoro (PARTIAL)

---

## STEP 1: Review All Completed Work (3 agents in parallel)

Before doing anything new, audit everything that's been done. Agents worked fast and may have introduced issues.

### Agent A: @review-tokens-and-body (Explore agent, read-only)
Review Phase 0 + Phases 1-3 work:
1. **:root variables** — verify all tokens are present and correctly valued (check against REDESIGN-PLAN.md Section 2)
2. **icon() helper in state.js** — verify it works (returns valid SVG strings, cache works, all ~55 icons have valid paths)
3. **Google Fonts link** — verify correct URL with Inter + Source Serif 4
4. **Lucide CDN** — verify script tag present, lucide.createIcons() called in init.js
5. **body styles** — verify background is var(--canvas), font is var(--font-body), color is var(--fg-primary)
6. **Cross-app nav** — verify warm styling, no purple remnants, no blur
7. **Header/stats bar** — verify serif title, warm stat cards, olive badges, monospace numbers
8. **Loading overlay** — verify warm cream, not purple
9. **Check for artifacts**: grep for `linear-gradient(135deg, #667eea` in body/nav/header CSS sections — should be 0
10. **Check for white-on-white**: any `color: white` or `color: #fff` in sections that are now light-bg

Report: list of issues found (or "clean").

### Agent B: @review-task-list-and-modals (Explore agent, read-only)
Review Phases 4-7 work:
1. **Category tabs** — verify clean underline style, not pill/button, --cat-* colors used
2. **Task items** — verify borderless list, bottom dividers, warm hover, circle checkboxes
3. **Add task form** — verify warm input, olive button
4. **Medication tracker** — verify clean styling, no emoji
5. **Compact header (mobile)** — verify warm bg, no blur, warm menu panel
6. **All modals** — verify surface-overlay bg, radius-lg, shadow-overlay, lighter backdrop (0.3 not 0.5)
7. **Triage mode** — verify warm columns, olive checkboxes, warm drag states, warm quick-add
8. **Focus-view root variables** — verify the 22-var remap is correct (--bg-page → var(--canvas), etc.)
9. **Check for artifacts**: grep for `#667eea` in task/modal/triage CSS sections
10. **Check for dark hardcoded colors**: grep for `#161b22`, `#21262d`, `#30363d` in these sections

Report: list of issues found (or "clean").

### Agent C: @review-emoji-cleanup (Explore agent, read-only)
Review all emoji cleanup work:
1. **JS files** — grep ALL 6 files for any remaining emoji characters: tasks.js, financials.js, crash-out.js, triage.js, medications.js, focus-pomodoro.js
2. **HTML body** — grep index.html lines 10751+ for any remaining emoji
3. **icon() calls** — spot-check 10-15 icon() calls in tasks.js and financials.js to verify they produce valid HTML (correct string concatenation, no broken quotes)
4. **showToast() calls** — verify emoji removed from toast messages
5. **Category pill emoji** in Quick Add HTML — verify replaced with Lucide tags
6. **Toolbar buttons** — verify emoji replaced with Lucide `<i data-lucide="...">` tags
7. **CSS content properties** — grep for emoji in CSS `content:` rules (there was one at ~line 5880)

Report: list of remaining emoji or broken icon() calls (or "clean").

---

## STEP 2: Fix Any Issues Found in Review

Address all issues from Step 1 before proceeding. Commit fixes:
```
git add -A && git commit -m "Redesign: Fix issues found in review audit"
```

---

## STEP 3: Finish Phases 8-9 (1 agent)

### Agent: @finish-phases-8-9 (general-purpose)
The Phase 8-9 agent completed ~10 of 25 edit groups. Finish the remaining work.

**CRITICAL**: The Phase 6-7 agent remapped 22 focus-view :root variables to warm tokens (--bg-page → var(--canvas), --bg-card → var(--surface-primary), --accent-blue → var(--accent), etc.). This means many CSS rules that use these variables are ALREADY warm. Before editing each section, READ IT FIRST and check if it already uses remapped variables. Only edit sections that still have hardcoded dark values.

Remaining edit groups:
- Crash-out setup section (~L6912-7068): dark bg sleep options → warm
- Timeline header & adjuster (~L7073-7142): dark bg → warm
- Time summary & progress (~L7144-7234): dark bg → canvas-subtle
- Gcal grid (~L7797-8210): dark blue task blocks → warm (BIGGEST remaining section)
- Unscheduled pool (~L7660-7770): dark bg → warm
- Duration modal (~L8211-8318): minor overlay fix
- Focus session card (~L8910): dark gradient → warm
- Timer (~L8813-8908): blue glow → olive (check root var remap first)
- Controls & buttons (~L8968-9043): fix dark borders
- Duration toggle (~L9045-9074): blue → olive
- Checklist card (~L9076-9252): dark bg → warm
- Action buttons (~L9253-9325): gradients → solid accent/success
- Empty state (~L9327-9399): dark gradient → warm
- Complete overlay (~L9401-9560): dark gradient → warm
- Inline mode tabs (~L11166-11168) + sleep picker (~L11342-11348)

Commit when done:
```
git add -A && git commit -m "Redesign Phases 8-9: Crash Out + Focus/Pomodoro (complete)"
```

---

## STEP 4: Phase 10 — Polish & Consistency (1 agent)

### Agent: @phase-10-polish (general-purpose)
Full polish pass. ~40 edits.

**10A. Kill ALL remaining purple** — grep for #667eea, #764ba2, rgba(102,126,234 and replace every one:
- Border colors → var(--accent)
- Gradients → var(--accent) solid
- rgba purple → rgba(107,124,94,...) olive equivalent
- Focus borders → var(--control-border-focus)
- ~27 locations identified (see line numbers below, but RE-GREP because line numbers shifted)

**10B. Kill ALL remaining dark-theme colors in base CSS**:
- Triage section (~L1280-1620): #21262d, #30363d, #484f58, #161b22 → warm tokens
- Toast + undo-toast: dark bg → var(--surface-primary)
- Focus checklist, unscheduled cards: hardcoded grays → warm
- Financial edit panel + cash flow: dark → warm
- Pomodoro/timer remaining: dark borders/bg → warm
- Daily planner: gradients → var(--accent), borders → warm

**10C. Add global polish CSS** (append near end of style block):
```css
/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--canvas-inset); }
::-webkit-scrollbar-thumb { background: var(--fg-muted); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: var(--fg-tertiary); }

/* Selection */
::selection { background: var(--accent-light); color: var(--fg-primary); }

/* Focus rings */
*:focus-visible {
  outline: 2px solid var(--control-border-focus);
  outline-offset: 2px;
}
```

**10D. Animation audit**: Find transitions > 300ms or with bouncy cubic-bezier. Normalize to 150-200ms ease-out.

**10E. focusPulse keyframes**: rgba(102,126,234,...) → rgba(107,124,94,...)

Commit when done:
```
git add -A && git commit -m "Redesign Phase 10: Polish pass — zero purple remaining"
```

---

## STEP 5: Phase 11 — Mobile Audit (1 agent)

### Agent: @phase-11-mobile (general-purpose)

**11A. Quick Add bottom sheet** (CSS ~L10399-10515) — ENTIRE panel still dark-themed:
- Panel bg #161b22 → var(--surface-primary)
- Handle, title, close-btn, input, placeholder, label → warm tokens
- Category pills: neon gradient selected states → --cat-* color tokens
- Size buttons, option toggles, submit button → warm/olive

**11B. Override dark inline HTML styles via CSS !important** (~15 rules to add):
- Focus Welcome Overlay (~L11123-11160): card gradient, text colors, button
- CC Mode Tabs (~L11167-11169): dark button inline styles
- Custom Sleep Picker (~L11344-11348): dark select/input inline styles
- Calendar Modal (~L11965-12005): dark bg, header gradient, section bg
- Countdown Modal (~L11807-11855): dark inputs/labels/buttons
- Planning Modal (~L12198-12210): dark bg, title, button colors
- Task Edit Modal (~L12215-12265): dark bg, title, inputs, labels, buttons

Strategy: Add CSS override rules with !important targeting the element IDs/classes. Do NOT edit the inline style="" attributes directly (JS may set them).

**11C. color: white audit** — fix these specific ones:
- Undo-toast text → var(--fg-primary)
- Toast-message fallback → var(--fg-primary)
- Triage-quick-add-btn → var(--accent-fg)

**11D. Verify mobile is fine**:
- Touch targets already 44px+ (confirmed)
- FAB already warm (confirmed)
- iOS Safari flex workarounds preserved (DO NOT TOUCH)

Commit when done:
```
git add -A && git commit -m "Redesign Phase 11: Mobile audit + inline style overrides"
```

---

## STEP 6: Final Verification (1 agent)

### Agent: @final-verify (Explore agent, read-only)

Run complete verification:
1. `grep -c '#667eea\|#764ba2' index.html` → should be 0
2. `grep -c '#161b22\|#0d1117\|#1e293b' index.html` → should be 0 or near 0
3. `grep -c '#21262d\|#30363d' index.html` → should be 0 or near 0
4. Grep all 6 JS files + index.html HTML body for emoji characters → should be 0
5. Brace balance: `python3 -c "c=open('index.html').read(); print('{ =', c.count('{'), '} =', c.count('}'))"`
6. Verify icon() function in state.js is intact
7. Verify lucide.createIcons() in init.js is intact
8. Verify all 5 save guards in firebase-sync.js are intact (grep for `return false`)
9. Verify isEmptyState() in state.js is intact
10. Check for any `color: white` or `color: #fff` on elements with light backgrounds

Report: PASS/FAIL with details.

---

## Resume Prompt (copy-paste into new session):
```
I'm resuming the Dental Quest UI redesign. Branch: `redesign/warm-clinical` (6 commits ahead of main).

Read REDESIGN-REMAINING-WORK.md — it has the full resume plan with 6 steps:
1. Review all completed work (3 parallel audit agents)
2. Fix any issues found
3. Finish Phases 8-9 (crash out + pomodoro)
4. Phase 10 polish (kill all remaining purple + dark artifacts)
5. Phase 11 mobile audit (Quick Add panel + inline style overrides)
6. Final verification

Also read REDESIGN-PLAN.md for the full design system and token reference.

Execute the plan step by step. Commit after each step. Don't skip the review — agents worked fast and may have introduced issues.
```
