# Design Spec — Written Analysis (WA) Claude.ai Webchat Project

**Date:** 2026-08-19
**Status:** Design approved, pending spec review
**Owner:** Suleman Shaikh (BU Goldman, DMD 2027)

---

## 1. Goal

Port the local Claude Code "Written Analysis" (WA) workflow — today a `~/Downloads/written analysis/` folder with a 1,406-line `WA_PLAYBOOK.md`, ~40 reference files, and a 13-role agent/bash/python-docx pipeline — into a **Claude.ai webchat Project** so that:

- On any given day, the user opens the Project, starts a **new chat**, and says *"I have a patient for a WA."*
- That chat already knows the full workflow (principles, template, voice, QA) with **zero re-teaching**.
- Claude then **expertly solicits** the source documents and the 15 information gaps, collects everything on the new patient, and produces a **complete WA** the same way Claude Code would.
- The user's stated worry — "I'm limited by ~10 attachments, I can't upload 40 files" — is resolved.

### Success criteria
- A single, PHI-free folder in `~/Downloads` containing everything to stand up the Project.
- A new chat, given only the new patient's docs, produces a WA at the same quality bar as the Claude Code pipeline (voice, depth, source-priority discipline, QA/forbidden-content compliance).
- The user never has to re-explain the workflow, and never uploads more than one patient's worth of documents per chat.

---

## 2. Key facts that shape the design (verified 2026-08-19)

Claude.ai Projects separate **persistent knowledge** from **per-message attachments** — two different buckets with very different limits:

| | Project Knowledge (reference library) | Per-message attachments (the patient) |
|---|---|---|
| Uploaded | **Once**, persists across every chat in the Project | Fresh each chat |
| Count | **Unlimited files** (30 MB each); auto-scales via RAG (up to 10×) as it grows | **20 files per message** (500 MB each) |
| Images | Text-extracted only | **Read directly** (JPEG/PNG/GIF/WebP, up to 8000×8000) — radiographs work |

**Consequence:** the reference material (playbook + exemplars) is uploaded **once** to Project Knowledge and is present in every chat forever. The "~10 attachment" limit is actually **20 per message** and only ever applies to the *new patient's* chart docs + radiographs — which is exactly the bucket it should apply to, and 20 is more than enough for one patient. There is no consolidation crisis.

Sources: [RAG for projects](https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects), [file upload limits](https://support.claude.com/en/articles/8241126-upload-files-to-claude).

---

## 3. Locked design decisions

1. **Exemplars = de-identified, not raw.** Strip every identifier and replace with placeholder tokens (`[patient name]`, `[chart number]`, etc.) so each exemplar doubles as a **voice reference** *and* a **fill-in-the-blank structural template**. Resolves the playbook's hard PHI rule (never publish real patient data to the cloud).
2. **Master instructions = purpose-built "Webchat Edition."** A rewrite that keeps 100% of the clinical/voice/QA/template substance but strips local-only machinery (bash grep scans, the 9/13-role subagent pipeline, python-docx build, absolute file paths) and swaps in webchat-native equivalents (in-context self-audit, direct radiograph reading, Artifact output). The local `WA_PLAYBOOK.md` remains the source of truth; the Webchat Edition is re-synced when the master materially changes.
3. **Audit rigor = hybrid.** Default single-chat build always ends with an in-context self-audit pass. For high-stakes WAs, an **optional fresh-eyes audit** in a new chat (paste draft → "audit this against the playbook") reproduces the independence of the Claude Code auditor roles.
4. **Output format = text Artifact → paste into Word.** Matches the current flow and the user's final human finishing pass; avoids unreliable in-webchat `.docx` generation.
5. **Deliverable = one PHI-free folder** in `~/Downloads`, ready to upload wholesale.

---

## 4. Mental model — one chat, one patient

Every chat in the Project is one of two intents. **Workflow context is always present** (project knowledge + boot loader auto-load into every chat); **patient data never persists across chats** (only what is pasted/uploaded into that specific chat). The boot loader branches on kickoff:

- **New patient** — *"I have a patient for a WA"* → full intake → build (steps 1–7 below).
- **Recheck existing work** — *"audit / recheck / revise this WA"* → user pastes the prior draft (+ any source docs) → Claude runs the QA/audit pass or targeted revisions. Fresh context makes this chat a genuine independent auditor; the user re-provides the draft because patient state does not carry over.

Both entry paths are written into the boot loader and the playbook's §0 quickstart.

---

## 5. The run flow (pipeline re-architected for single context)

The Claude Code pipeline (13 roles + bash greps + python-docx) becomes **one guided conversation**:

1. **Kickoff** — user starts a new chat and states intent.
2. **Boot + intake** — Claude reads `WA_PLAYBOOK_WEBCHAT.md`, explains the source-priority hierarchy, requests the source docs (visit logs, charting, perio, TX / TX_NOTES, DX, progress notes, radiographs), sends the **15-gap message**, and asks for the rubric if it is not in knowledge.
3. **Collect** — user uploads ≤20 files and answers the gaps.
4. **Reconcile** — Claude builds the verified visit timeline (§3.4) + pre-existing findings table (§3.5), resolves every conflict strictly by hierarchy (**TX > TX_NOTES > PERIO > DX > progress notes > radiographs**; intake is never ground truth), and flags anything still missing before drafting.
5. **Draft** — builds the WA section-by-section against the 10-section template, applying the depth word-targets (§7.B), D-code→prose dictionary (§8), verified PubMed citations (§7.C), RPD design, and the Dx/TP/Sequencing table.
6. **Self-audit (always, in-context)** — runs the QA checklist as a readable pass: em-dash/emoji/forbidden-word scan, the **G15 forbidden-content scan** (no provider names, no calendar dates), the voice pass/fail check (§7.D), the 70-check groups collapsed into a checklist (§10.E), and the cross-patient contamination check. Reports what was verified, then fixes.
7. **Deliver** — outputs the finished WA as a **text Artifact** to paste into the Word template for the final human finishing pass.
8. **Optional fresh-eyes audit (hybrid)** — user opens a new chat in the same Project, pastes the draft, says *"audit this against the playbook."* The audit prompt is included in the playbook.

---

## 6. Consolidated file set

**Runtime-critical (upload once to Project Knowledge):**

| File | Role |
|---|---|
| `WA_PLAYBOOK_WEBCHAT.md` | Master doc — Webchat Edition (see §7) |
| `WA_VOICE_EXEMPLAR_carmen.md` | De-identified Carmen 2118878 — gold-standard voice reference |
| `WA_VOICE_EXEMPLAR_annette.md` | De-identified Annette 2684214 — G15 voice reference |
| `WA_TEMPLATE_BLANK.docx` *(optional)* | Exact-format blank BU 10-section skeleton (already embedded as text in the playbook) |
| `WA_RUBRIC.*` *(optional, when available)* | Grading rubric — not on disk today; enables self-scoring when added |

**Boot loader (paste into the Project custom-instructions field):** `PROJECT_CUSTOM_INSTRUCTIONS.txt` — a compact persona that, on any WA chat, directs Claude to read the playbook fully, branch on intent (new vs recheck), run intake, never invent clinical facts, and hold the voice constraints (zero em dashes, no emojis, G15 rule). Kept short so it survives whatever the field's size cap is; all heavy content lives in knowledge.

**Per-message each session:** the new patient's docs + radiographs (≤20 files). The only per-message uploading the user ever does.

Everything else in the ~40-file reference set is **reference-only** — its lessons are already distilled into the playbook prose (§14 error catalog, §7 voice examples, §15 index) and does not travel to webchat.

---

## 7. `WA_PLAYBOOK_WEBCHAT.md` — contents

A faithful re-expression of the local playbook with machinery removed. Retains, as literal text:

- §0 Quickstart with the **two entry modes** (new / recheck).
- §1 What a WA is / isn't.
- §2 The 10-section template skeleton (HEADER + Key Information, Detailed Analysis [2A Patient Info + 6-column Medications table + bio-med rationale, 2B Clinical/Radiographic Exam + Aesthetic Risk], Dental Diagnoses Summary, Occlusal Analysis, Etiology, Goals of Treatment + TP Overview + RPD design, 6-column Dx/TP/Sequencing table, Literature Citations, Consequences, Presentation Outline + GPL signature).
- §3 Intake checklist incl. §3.4 verified visit timeline, §3.5 pre-existing findings table.
- Source-priority hierarchy (TX > TX_NOTES > PERIO > DX > progress notes > radiographs).
- §5 the 15 gaps + the template message to surface them; §6 gap defaults incl. the **G15 rule** (no names, no dates, relative time only, sole-provider framing).
- §7 Voice/depth: §7.B depth word-targets, §7.C PubMed citation verification, §7.D pass/fail voice examples, §7.E the newest-wins constraint layers.
- §8 D-code→prose dictionary.
- **QA re-expressed for single context:** §10.E 70-check groups as a readable checklist + §10.F QA2 forbidden-content BLOCKING scan (with allowed exceptions) + cross-patient contamination scan — run by Claude in-context, not via bash.
- §14 error catalog rewritten as concise "never repeat these" rules (Carmen, Veronica, Maimouna top-10, Keisha, Annette).
- §16 conventions (zero em dashes, no emojis, filename convention, provider taxonomy).
- §18 final pre-flight checklist.
- **The fresh-eyes audit prompt** to paste into a recheck chat.

**Removed:** bash forbidden-word scans, subagent/agent-brief pipeline (§9.F/§9.G), python-docx build, `/tmp/wa_extracts/` steps, absolute `/Users/...` paths, project-folder conventions (§11).

---

## 8. De-identification rules (local build step)

Applied to the two exemplars, locally, before anything reaches the cloud:

- Patient name → `[patient name]`; chart # → `[chart number]`; DOB → `[DOB]`; exact age → `[age]-year-old`.
- Phone / address / email → removed.
- Provider names & calendar dates → already absent under G15; verify none survive; any residual → `[relative time]`.
- **Kept intact:** all clinical findings, tooth numbers, D-codes, diagnoses, TP logic, and sentence-level voice — the entire point of the exemplar.

Result: a document that reads like a fill-in-the-blank master template while demonstrating the target voice.

---

## 9. Deliverable — `~/Downloads/WA_Webchat_Project/`

Every file is **PHI-free by construction**, so the whole folder is safe to upload wholesale.

```
WA_Webchat_Project/
├── README.txt                          3-line "do this" summary
├── SETUP_GUIDE.md                      create project · paste instructions · upload knowledge ·
│                                         run a WA · run the fresh-eyes audit · add rubric later
├── PROJECT_CUSTOM_INSTRUCTIONS.txt     paste verbatim into the Project instructions field
├── WA_PLAYBOOK_WEBCHAT.md              master doc (knowledge)
├── WA_VOICE_EXEMPLAR_carmen.md         de-identified (knowledge)
├── WA_VOICE_EXEMPLAR_annette.md        de-identified (knowledge)
└── WA_TEMPLATE_BLANK.docx              optional exact-format skeleton (knowledge)
```

---

## 10. Build steps (for the implementation plan)

1. Re-read the source completed WAs for Carmen (2118878) and Annette (2684214) from `~/Downloads/written analysis/references/completed-WAs/`.
2. **De-identify** both into `WA_VOICE_EXEMPLAR_carmen.md` and `WA_VOICE_EXEMPLAR_annette.md` per §8; verify no residual PHI (name/chart/DOB/phone/address/date/provider-name scan).
3. **Author `WA_PLAYBOOK_WEBCHAT.md`** by porting `WA_PLAYBOOK.md` per §7 (substance kept, machinery removed, two entry modes + fresh-eyes audit prompt added).
4. **Write `PROJECT_CUSTOM_INSTRUCTIONS.txt`** (compact boot loader, both entry modes).
5. **Write `SETUP_GUIDE.md`** and `README.txt`.
6. Copy the optional blank template `.docx` in (no PHI).
7. **PHI sweep** the entire assembled folder before declaring done (no real names, chart numbers, DOBs, dates, phones, addresses, provider names anywhere).
8. Place the folder at `~/Downloads/WA_Webchat_Project/`.

---

## 11. Open items / assumptions

- **Rubric:** not present on disk. The Project functions without it (asks the user at intake); adding it to knowledge later upgrades self-scoring. Noted in `SETUP_GUIDE.md`.
- **Maintenance / drift:** the Webchat Edition is a derivative of the local `WA_PLAYBOOK.md`; `SETUP_GUIDE.md` notes it should be re-synced when the master materially changes.
- **Custom-instructions field cap:** exact character limit not verified; mitigated by keeping the boot loader compact and pushing all heavy content into knowledge files.
- **`.docx` vs `.md` for knowledge:** knowledge files are text-extracted; `.md` is preferred for the playbook/exemplars for clean extraction. The optional blank template stays `.docx` for exact formatting on paste-in.
