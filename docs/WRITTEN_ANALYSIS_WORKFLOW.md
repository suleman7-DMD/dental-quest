# Written Analysis (WA) Workflow — Context Pointer

**This document is a signpost, not the workflow itself.** The Written Analysis workflow does **not** live in this repo. It lives on the user's Mac at:

```
~/Downloads/Written Analysis Workflow/
```

If you are a fresh Claude Code session and the user says something like *"I was working on the written analysis workflow and need to make xyz change,"* your first action is to **read the router at the master folder root**:

```
~/Downloads/Written Analysis Workflow/START_HERE.md
```

That file routes you to the right edition and file for any WA request. This repo doc exists so a session started **inside the `dental-quest` repo** can find its way there.

---

## What the WA workflow is

A **Written Analysis** is a graded summative (`gp-sum-analysis`) at BU Goldman's comprehensive-care clinic (GP9): a 6–12 page dense-prose clinical case analysis plus a multi-page treatment-plan table, written from a real patient's chart in a specific first-person student voice. The workflow encodes the template, source-document priority hierarchy, 15 recurring information gaps, hard voice rules, a CDT D-code dictionary, QA gates, and an error catalog distilled from five prior real cases.

It is unrelated to the `dental-quest` app code — it is a personal clinical-writing workflow that happens to be documented here so it's discoverable from the repo the user works in daily.

## The two editions

| Edition | Location | Purpose | PHI |
|---|---|---|---|
| **Claude Code (local)** | `~/Downloads/Written Analysis Workflow/claude-code-edition/` | Full local workflow: file tools, multi-agent audit, python-docx builds, real chart extracts. **Source of truth.** Master manual: `WA_PLAYBOOK.md` (v2.0). | ⚠️ **REAL PHI — local only** |
| **Webchat Project (cloud)** | `~/Downloads/Written Analysis Workflow/webchat-edition/` | De-identified port that runs inside a Claude.ai Project chat. Bundle to upload: playbook + 2 exemplars + template + custom instructions. | ✅ **PHI-free — the only uploadable part** |

The webchat playbook (`WA_PLAYBOOK_WEBCHAT.md`) is a **derived port** of the Claude Code master (`WA_PLAYBOOK.md`). **Change the Claude Code master first, then regenerate the webchat playbook** and re-upload that one file to Project knowledge. Do not let them drift.

## Router (summary — full version in `START_HERE.md`)

- **Produce a new WA (local):** `claude-code-edition/WA_PLAYBOOK.md` → follow §0 QUICKSTART. Artifacts under `claude-code-edition/references/` (see its `MANIFEST.md`).
- **Change the local workflow:** edit `claude-code-edition/WA_PLAYBOOK.md`; keep it a sibling of `references/`. If the change is clinical/voice/QA substance, propagate to the webchat edition.
- **Change / set up the webchat Project:** edit files in `webchat-edition/`; start with `SETUP_GUIDE.md`. Re-upload changed Project-knowledge files to the Claude.ai Project.
- **Audit an existing WA:** local `WA_PLAYBOOK.md` §9–§10 + `references/WA-VERIFICATION-HANDOFF-PROMPT.md`; webchat via a fresh Project chat + §18 fresh-eyes prompt.

## PHI boundary (do not break)

- `claude-code-edition/references/` holds real PHI (completed WAs, chart extracts, radiographs, per-patient project folders). **Never upload, publish, or move to any cloud/Project/Artifact.**
- `webchat-edition/` is PHI-free by construction and is the only uploadable part.
- New-WA real records live only inside the single Claude.ai chat where attached — never in Project knowledge or a shared Artifact.
- The five prior real-patient identifiers are contamination; they must never appear in an exemplar or a new WA. The webchat exemplars are already de-identified with `[placeholder tokens]`.

## History / provenance

- Design spec for the webchat edition: [`docs/superpowers/specs/2026-08-19-wa-webchat-project-design.md`](superpowers/specs/2026-08-19-wa-webchat-project-design.md).
- The webchat Project was built, then verified with an adversarial blind test (a trap-laden fictional patient) run in a fresh Project chat — it passed essentially flawlessly (caught every planted trap, refused all bad asks, matched voice, ran self-QA). The test surfaced two additive `§8` D-code enrichments (crown-code precision + mandibular/acrylic/interim RPD codes), both applied to `WA_PLAYBOOK_WEBCHAT.md`.
- Shipped via draft PR #13 (`design: WA Claude.ai webchat Project + deliverable bundle`).

## Maintenance

- If the master folder moves, update the canonical path here and in `CLAUDE.md`.
- The workflow files themselves (playbooks, references, bundle) are **not** tracked in this repo — they live in `~/Downloads/` and contain PHI. Only these pointer docs are in git.
