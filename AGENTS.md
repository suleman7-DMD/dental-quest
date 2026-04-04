# AGENTS.md - Dental Student Quest

This file provides instructions for AI agents (Codex, Copilot, Gemini, etc.) working on this codebase.

**All project rules, bug patterns, Firebase config, sync protection, and architecture docs are in `CLAUDE.md`.** Read that file for the complete reference.

## Quick Reference

- **4 apps**: index.html (tasks), graduation-roadmap.html (clinical tracker), stimulant-elimination-calculator.html (sleep), body-comp-tracker.html (nutrition)
- **No build system**: Push to `main` → live in ~30s
- **Firebase RTDB**: PIN auth, 4 app paths under `users/user_[hashedPin]/`
- **Split apps use JS modules**: `js/dental-quest/`, `js/graduation-roadmap/`, `js/stimcalc/`
- **Body-comp is ~22k lines**: Surgical edits only
- **Date parsing**: NEVER use `new Date('YYYY-MM-DD')` — off-by-one in EST. Split and construct manually.
- **Firebase saves**: `undefined` crashes all saves. Use `?? null` or `?? false`.
- **Collections are objects**: Use `getValues()` for safe array conversion (Firebase corrupts sparse arrays).
- **XSS**: ALL user text must use `escapeHtml()` in innerHTML.
- **Ground truth**: `docs/GROUND_TRUTH_REQUIREMENTS.md` for all graduation requirement IDs.
