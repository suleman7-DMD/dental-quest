# Clinical Tab Audit: 18 Bug Fixes Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** Fix all 18 bugs found in the clinical tab audit (2 CRITICAL, 5 HIGH, 6 MEDIUM, 5 LOW) across 7 files without introducing regressions.

**Architecture:** Fixes organized by file to enable 5 parallel fix agents (one per file group) plus 1 QA agent. Each agent owns exclusive write access to its files. No cross-agent file conflicts possible.

**Tech Stack:** Vanilla JS, Firebase Realtime DB, no build system.

---

## Agent Assignment (6 agents)

| Agent | Files | Bugs |
|-------|-------|------|
| **fix-clinical** | `js/graduation-roadmap/clinical.js` | #1, #4a, #7, #9, #11, #12, #14, #18 |
| **fix-patients** | `js/graduation-roadmap/patients.js` | #3, #5, #13, #17 |
| **fix-state-sync** | `state.js` + `firebase-sync.js` | #2, #6, #10 |
| **fix-planner** | `monthly-planner.js` + `import-system.js` | #4b, #8 |
| **fix-html** | `graduation-roadmap.html` | #15, #16 |
| **qa-verify** | ALL files (read-only) | Verify all 18 fixes |

Plan saved. See full fix details below per-task.
