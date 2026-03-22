# Clinical Brief — New Feature Spec for Graduation Roadmap App

**From:** Suleman (Sully) Shaikh — via Claude Project  
**For:** Developer building the Graduation Roadmap web app  
**Date:** March 22, 2026  
**Status:** v2 — added Perio Noise Filter (global rule change)

---

## CHANGE 1: Perio Noise Filter (Global — Affects All Exports)

### The Problem

Every patient in the clinic needs a prophy, a gingivitis re-eval, a recall, and OHI. That's baseline dental care — it's not noteworthy. But the current system treats these routine perio items as graduation requirement opportunities for EVERY patient, which clutters the REQUIREMENTS_MATCH block and makes every patient look like a perio goldmine when they're just a normal patient who needs a cleaning.

The result: Sully's app is full of perio requirement matches that are meaningless noise. When everything is highlighted, nothing is highlighted.

### The New Rule

**Perio content (in requirement matching, Clinical Briefs, and patient analysis) only appears if the patient has a diagnosed periodontitis (AAP Stage I-IV) with treatment-planned SRPs or calculus removal indicated.**

If the patient is a normal gingivitis patient (which is most of them), there is ZERO perio content in:
- The `CAN_FULFILL` list in REQUIREMENTS_MATCH
- The `GRAD_VALUE` section in CLINICAL_BRIEF
- The `DIAGNOSES_AND_RISKS` section (no probing depths, no BOP%, no "generalized 2-3mm")
- The `TX_SEQUENCING` section (no "prophy before implant" sequencing — that's assumed)

### What QUALIFIES for perio content

| Condition | Include? |
|-----------|----------|
| Patient has periodontitis diagnosis (Stage I-IV) | YES — staging, grading, reasoning |
| SRPs are treatment planned | YES — which quadrants, sequencing |
| Calculus removal summative opportunity (srp-calc-1/2/3) | YES — in GRAD_VALUE |
| Perio surgical assist (CLP, osseous surgery, etc.) | YES — in GRAD_VALUE |
| SRP re-evaluation (post-SRP, not post-prophy) | YES — perio-form-reeval-srp, perio-sum-reeval-srp |

### What gets EXCLUDED (noise — true for every patient)

| Item | Status |
|------|--------|
| Routine prophy / prophy summatives (perio-sum-prophy, perio-form-prophy) | EXCLUDE always |
| Gingivitis re-eval (perio-form-reeval-ging, perio-sum-reeval-ging, perio-3rd-reeval) | EXCLUDE always |
| Recall (perio-form-recall, perio-sum-recall) | EXCLUDE always |
| OHI | EXCLUDE always |
| Perio dx formatives/summatives for gingivitis patients | EXCLUDE |
| Perio impression re-eval for gingivitis patients | EXCLUDE |
| BOP%, probing depths, perio chart narratives for gingivitis patients | EXCLUDE from Clinical Brief |

### Coder Action Items

**This is primarily a Claude-side fix** — Claude generates the REQUIREMENTS_MATCH blocks, the app just imports and displays. However:

1. **One-time data cleanup (recommended):** Migration script to scan all existing patient records and strip the following requirement IDs from stored `CAN_FULFILL` lists:
   - `perio-form-recall`, `perio-sum-recall`
   - `perio-form-reeval-ging`, `perio-sum-reeval-ging`, `perio-3rd-reeval`
   - `perio-sum-prophy`, `perio-form-prophy`
   - `perio-form-dx`, `perio-sum-dx` (UNLESS patient TX_PLAN or MEDICAL_HX contains "periodontitis" or "SRP")
   - `perio-form-impr`, `perio-sum-impr` (same condition)

2. **No structural changes needed** to parser, data model, or display logic.

3. **Future-proofing (optional):** If the app displays requirement match counts per category (e.g., "Perio: 6 patients can help"), counts will now be accurate — only real perio patients appear.

---

## CHANGE 2: Clinical Brief Feature (New)

### The Problem

Right now, the app imports structured patient records via copy-paste blocks (PATIENT_RECORD format). These blocks are flat key-value data — chart number, medical history, tx plan, last visit, etc. They're great for the database and for tracking, but they lose **all the clinical intelligence** that Claude generates during analysis.

Here's what happens in practice:

1. Sully uploads 10+ axiUm screenshots into a Claude project chat
2. Claude produces an **incredibly rich 8-part clinical analysis** — periodontal staging with reasoning, radiographic interpretation, treatment sequencing logic, risk assessments, behavioral reads, graduation requirement strategy, flagged concerns, and actionable next-visit game plans
3. Claude then outputs the structured PATIENT_RECORD + REQUIREMENTS_MATCH blocks
4. Sully copies the structured blocks into the app
5. **The rich analysis stays trapped in the chat and is never accessible from the app**

The structured record says: `MEDICAL_HX: Stage III Grade B generalized periodontitis. 38% BOP.`

The full analysis says: *"Stage III justified by CAL 6-7mm at worst sites, radiographic bone loss extending to middle third of roots, multiple missing teeth. Grade B due to moderate progression rate — age 45, bone loss pattern suggests years of progression. BOP at 38% is significant — well above the 10% threshold. Perio must be stabilized before implant #19 proceeds."*

**That second version is what Sully actually needs when Dr. Maseli walks up and asks about a patient.** The structured record is a database entry. The Clinical Brief is the attending's dictated summary.

---

## The Solution: Clinical Brief

A new per-patient rich-text document that captures the clinical intelligence, stored alongside the existing structured record. Think of it as adding a "Notes" tab next to the "Chart" tab — but structured enough to be scannable, not just a wall of text.

### What It Stores

The Clinical Brief is a **structured prose document** — short labeled sections with 2-4 sentence narrative blocks under each. Not raw key-value pairs, not paragraph blobs. Scannable headings with meaningful prose.

**Sections (7 total — refined from coder feedback):**

| Section | Purpose | Example |
|---------|---------|---------|
| **Snapshot** | 30-second elevator pitch. If you have 15 seconds before Dr. Maseli asks. | "45F, ASA I-II, Stage III Grade B generalized periodontitis. Mid-treatment — crown #31 just completed, being transferred from prior student. Complex case: implant #19 planned, CLP #30 needed, multiple composites outstanding. HIGH VALUE patient." |
| **Key Diagnoses & Risks** | Clinical findings that matter for THIS patient. Perio staging WITH reasoning ONLY for periodontitis patients. Caries risk, medical risk, behavioral risk. | "Stage III justified by CAL up to 7mm at #4, BOP 38%, mobility Grade I on #24-25. Caries risk moderate-high — 4 defective restorations, multiple active dentin caries sites. Medical hx 3+ years stale — must update before any surgical procedures." |
| **Treatment Status** | Narrative of the treatment arc — what's been done, by whom, current phase | "Shaan completed crown #31 sequence (prep → impression → cementation, July-Sept 2025). Patient being transferred as Shaan leaves for externship. Prior students completed crowns #3 and #30, RCTs on #3/#4/#30, and multiple composites." |
| **Treatment Sequencing** | The WHY behind the order of treatment. Not just what's planned — the logic. No routine prophy/OHI/recall. | "CLP #30 before post/core — short clinical crown needs lengthening for ferrule. Sedative filling #18 urgent to prevent pulpal involvement. Perio stabilization needed before implant (periodontitis patient)." |
| **Flagged Concerns** | Things that would bite you if forgotten + unresolved questions (merged from previous FLAGGED_CONCERNS + OPEN_QUESTIONS) | "#31 vitality — dentin caries despite new crown. Medical hx stale 3+ yrs — MUST update before surgery. What are the 'monthly injections'? Is patient still interested in implant?" |
| **Graduation Value** | Strategic value of this patient for Sully's graduation requirements. Only includes perio if periodontitis patient with SRPs indicated. | "HIGH VALUE. Implant crown #19 = mandatory implant-supported crown for fixed. RCT #31 if needed = endo opportunity at 0/2 RCTs. CLP #30 = perio surgical assist (periodontitis pt). Composites if replanned from amalgam = operative summatives." |
| **Next Visit Plan** | Actionable checklist — only noteworthy items, not routine prophy/OHI/recall | "1/12/2026: Update medical hx (3+ yrs stale). Sedative filling #18 if time. Vitality test #31. Discuss implant timeline. Order CBCT. Assess SRP need given periodontitis dx." |
| **Open Questions** | Unresolved items that need follow-up | "What are the 'monthly injections'? Is patient still interested in implant? Is #31 symptomatic since cementation?" |

---

## How It Gets Into the App

### Option A: New Export Block (Recommended)

Claude outputs a new `CLINICAL_BRIEF` block alongside the existing PATIENT_RECORD and REQUIREMENTS_MATCH blocks. Same paste, same import modal, same parser — just a new block type.

```
CLINICAL_BRIEF
---
CHART: 1869817
NAME: De Oliveira, Renata S
DATE_GENERATED: 2026-03-22
SNAPSHOT: 45F, ASA I-II, Stage III Grade B generalized
  periodontitis. Mid-treatment — crown #31 just completed,
  being transferred from Shaan Bhambra (externship). Complex
  case: implant #19 planned, CLP #30 needed, multiple
  composites outstanding. Moderate reliability (no-showed
  11/10/2025). HIGH VALUE — implant crown, potential RCT,
  perio surgical assist, operative composites.
DIAGNOSES_AND_RISKS: Perio: Stage III Grade B generalized
  periodontitis — CAL up to 7mm at #4, BOP 38%, mobility
  Grade I on #24-25. Caries risk moderate-high — multiple
  active sites, 4 defective restorations. Medical risk low
  but medical hx 3+ years stale. Behavioral: moderate concern
  — no-showed 11/10, but completed 3-visit crown sequence
  reliably Jul-Sept 2025.
TX_STATUS: Shaan Bhambra completed crown #31 sequence (prep
  7/14, impression 8/4, cementation 9/22/2025 — zirconia,
  RelyX GIC, supervised Dr. Alvarez). Prior students did
  crowns #3/#30, RCTs #3/#4/#30, multiple composites.
  Patient being transferred. Next appt 1/12/2026 8:30 AM.
TX_SEQUENCING: CLP #30 before post/core — short clinical
  crown needs lengthening for ferrule. Sedative filling #18
  urgent — prevent pulpal involvement before definitive
  restoration. Perio stabilization needed before implant #19
  (periodontitis patient, 38% BOP). Sequence: sedative fill
  → CBCT → composites → CLP #30 → post/core #30 → implant
  #19 placement → healing → abutment + crown. RCT #31 on
  standby — only if symptomatic.
FLAGGED_CONCERNS: (1) #31 vitality — dentin caries despite
  new crown, RCT may be needed, access through crown. (2)
  Medical hx stale 3+ yrs — MUST update before CLP or
  implant. (3) #18 caries urgent. (4) #30 short clinical
  crown needs CLP before post/core. (5) Composites planned
  as amalgam — replan as composite for operative credit. (6)
  What are "monthly injections" in med hx? (7) Is patient
  still interested in implant #19? (8) Who is new assigned
  provider?
GRAD_VALUE: HIGH VALUE. Implant crown #19 = mandatory fixed
  implant unit (0/10). RCT #31 = endo opportunity (0/2). CLP
  #30 = perio surgical assist. Periodontitis pt — SRP if
  indicated = calculus removal summative. Composites if
  replanned from amalgam = operative summatives.
NEXT_VISIT_PLAN: 1/12/2026 — Update med hx (3+ years stale).
  Sedative filling #18 if time. Vitality test #31. Discuss
  implant #19 timeline. Order CBCT. Assess whether SRPs
  indicated given periodontitis dx. Arrange faculty if
  targeting summative credit on any procedures.
---
```

### Parser Changes Needed

1. **Recognize `CLINICAL_BRIEF` as a new block type** (same pattern as existing blocks — keyword on its own line, then `---`, then key-value fields)
2. **Store per patient, keyed by chart number** — same as PATIENT_RECORD
3. **Fields are all multi-line text** (same continuation-line logic as TX_PLAN and NOTES in PATIENT_RECORD)
4. **DATE_GENERATED for versioning** — newer briefs overwrite older ones (or optionally keep a history stack, max 5)
5. **On import:** if CHART matches existing patient, attach/update the Clinical Brief on that patient record

### New Fields to Parse

```
SNAPSHOT
DIAGNOSES_AND_RISKS
TX_STATUS
TX_SEQUENCING
FLAGGED_CONCERNS
GRAD_VALUE
NEXT_VISIT_PLAN
```

7 fields total. All are free-text multi-line. No special sub-parsing needed (unlike CLINICAL_PROGRESS which has C=, IP=, P= patterns). Note: OPEN_QUESTIONS was merged into FLAGGED_CONCERNS to keep the section count tight.

---

## How It Displays in the App

### Option 1: Tab on Patient Detail Page — CONFIRMED

Clinical Brief tab is the **default view** when opening a patient. Structured record becomes "Data" tab. Rendering:

- **Mobile:** Accordion (sections collapse/expand). SNAPSHOT never collapses — always visible.
- **Desktop:** Flat scroll. All sections visible.
- **Formatting:** Parse `(1)`, `(2)` patterns in FLAGGED_CONCERNS into actual `<ol>` elements for scannability.
- **Badge:** Patient list shows 📋 icon when a Clinical Brief exists.
- **V1 scope:** Display tab + badge only. No calendar integration, no search indexing yet.
- **V2 (later):** SNAPSHOT on patient cards, NEXT_VISIT_PLAN on calendar tooltips, brief text searchable.

```
┌─────────────────────────────────────────────────┐
│  De Oliveira, Renata S          Chart: 1869817  │
│  ┌──────┐ ┌────────────────┐ ┌────────────┐     │
│  │Record│ │ Clinical Brief │ │Requirements│     │
│  └──────┘ └────────────────┘ └────────────┘     │
│                                                  │
│  📋 SNAPSHOT                           ▼         │
│  45F, ASA I-II, Stage III Grade B gen.           │
│  periodontitis. Mid-treatment — crown #31        │
│  just completed, being transferred...            │
│                                                  │
│  🔬 KEY DIAGNOSES & RISKS              ▼         │
│  Perio: Stage III Grade B — CAL up to 7mm...     │
│                                                  │
│  📊 TREATMENT STATUS                   ▼         │
│  Shaan completed crown #31 sequence...           │
│                                                  │
│  📐 TREATMENT SEQUENCING               ▼         │
│  CLP #30 before post/core — short clinical...    │
│                                                  │
│  ⚠️ FLAGGED CONCERNS                   ▼         │
│  (1) #31 vitality — dentin caries...             │
│  (7) What are "monthly injections"?...           │
│                                                  │
│  🎯 GRADUATION VALUE                   ▼         │
│  HIGH VALUE. Implant crown #19 = mandatory...    │
│                                                  │
│  📋 NEXT VISIT PLAN                    ▼         │
│  1/12/2026 — Update med hx. Sedative fill...    │
│                                                  │
│  Last updated: March 22, 2026                    │
└─────────────────────────────────────────────────┘
```

---

## Data Model

```javascript
// Addition to existing patient record structure
patientRecord: {
  // ... existing fields (name, chart, medicalHx, txPlan, etc.)
  
  clinicalBrief: {
    dateGenerated: "2026-03-22",       // ISO date string
    snapshot: "45F, ASA I-II...",
    diagnosesAndRisks: "Perio: Stage III...",
    txStatus: "Shaan Bhambra completed...",
    txSequencing: "CLP #30 before post/core...",
    flaggedConcerns: "(1) #31 vitality...",
    gradValue: "HIGH VALUE...",
    nextVisitPlan: "1/12/2026 — Update..."
  }
}
```

**Storage:** Same localStorage + Firebase sync as existing patient records. The Clinical Brief is just a nested object on the patient record. **Important:** The coder needs to add `clinicalBrief` to all 4 merge/restore sites in firebase-sync.js (mergeRemoteState, loadFromLocalStorage, restoreCheckpoint, importAndRestoreDirectly) to prevent silent field-dropping on sync.

**Import cascade:** After parsing a CLINICAL_BRIEF block, find the patient by chart number (same `pt_${chart}` key), and **always full-overwrite** the `clinicalBrief` property. Push old brief to `briefHistory[]` (max 3) before overwriting. There is no partial-patch mode — every CLINICAL_BRIEF is the complete current picture, whether it appears alongside a PATIENT_RECORD or a PATIENT_UPDATE.

Field mapping:

| Export Field | JS Property |
|---|---|
| SNAPSHOT | snapshot |
| DIAGNOSES_AND_RISKS | diagnosesAndRisks |
| TX_STATUS | txStatus |
| TX_SEQUENCING | txSequencing |
| FLAGGED_CONCERNS | flaggedConcerns |
| GRAD_VALUE | gradValue |
| NEXT_VISIT_PLAN | nextVisitPlan |

---

## Update Workflow

When Sully updates a patient (new screenshots, post-appointment update), Claude will output a new CLINICAL_BRIEF block alongside the PATIENT_UPDATE block. The app overwrites the old brief with the new one.

Optionally: keep a `briefHistory` array (max 3-5 entries) so Sully can see how the clinical picture evolved over time. Each entry has `dateGenerated` + the full brief content.

---

## Interaction with Existing Features

- **Mission Control:** Could pull SNAPSHOT text for patient cards in the overview
- **Monthly Planner:** When a patient has a scheduled appointment, the NEXT_VISIT_PLAN section could show as a tooltip on that calendar entry
- **Requirements tab:** GRAD_VALUE section could surface as a badge or highlight on the requirements matching view
- **Patient list:** FLAGGED_CONCERNS count could show as a warning badge (e.g., "5 concerns" in red)

---

## Confirmed Decisions (from coder review)

1. **Accordion on mobile, flat scroll on desktop.** SNAPSHOT never collapses.
2. **Keep 3 brief versions** in briefHistory[] before overwriting.
3. **Parse (1), (2) into `<ol>` elements.** Bullet patterns too.
4. **V1: display tab + badge only.** V2: SNAPSHOT on cards, NEXT_VISIT_PLAN on calendar, search.
5. **Brief text searchable — not V1 blocker,** add in V2.
6. **Claude-side changes live** — project instructions updated, perio filter in memory. CLINICAL_BRIEF auto-generates on every patient export going forward.
7. **CLINICAL_BRIEF always full-overwrites** — no partial patch mode, works same alongside PATIENT_RECORD or PATIENT_UPDATE.
8. **Add clinicalBrief to all 4 merge/restore sites** in firebase-sync.js.

---

## Summary

**Change 1 — Perio Noise Filter:**  
Routine perio items (prophy, recall, gingivitis re-eval, OHI) are stripped from requirement matching for all patients. Perio content only appears when a patient has diagnosed periodontitis with indicated SRPs. This is primarily a Claude-side fix, but a one-time cleanup script is recommended to strip existing noise from imported data.

**Change 2 — Clinical Brief:**  
A new `CLINICAL_BRIEF` export block captures the rich prose analysis that currently gets trapped in chat. 8 scannable sections (Snapshot, Diagnoses & Risks, Treatment Sequencing, Treatment Status, Flagged Concerns, Graduation Value, Next Visit Plan, Open Questions) give Sully the "attending's summary" per patient, accessible from the app anytime. Same import pipeline, same parser logic — just a new block type with free-text multi-line fields.

**The goal:** If Dr. Maseli asks about any patient, Sully pulls up the Clinical Brief on his phone and knows (A) the patient's overall status, (B) where he is in the treatment workflow, (C) key findings/diagnoses/concerns, and (D) what he should be doing next — all in 60 seconds of reading. And the requirement matches he sees are only the ones that actually matter.
