# GROUND TRUTH: DMD 2027 GRADUATION REQUIREMENTS
## Suleman Shaikh — Single Source of Truth
### Last Updated: 2026-04-05

> **THIS FILE IS THE ONLY REQUIREMENTS REFERENCE.**
> It replaces PR_PART_1_SULEMAN_SHAIKH.pdf and GRADUATION_REQUIREMENTS.pdf.
> Both the Claude webchat project and the D3 Graduation Roadmap app
> must use this file as their canonical source for requirement IDs,
> counts, deadlines, and completion status.

---

## HOW TO READ THIS DOCUMENT

- **Requirement ID** = the exact string used in webchat exports and app parsing
- **Required** = how many you need
- **Completed** = how many are done (updated periodically)
- **D3 Deadline** = hard deadline by end of D3 (May 2026), or null if by end of D4
- **Status Tags**: DONE = fully complete. IP = in progress. PENDING = not started.

---

## D3/D4 SPLIT MODEL

Each category has a `yearTarget` property: `'d3'`, `'d4'`, or `'both'`.

- **`d3` categories**: All items appear exclusively in the D3 tab.
- **`d4` categories**: All items appear exclusively in the D4 tab.
- **`both` categories**: Items with a `d3Deadline` appear in the D3 tab; items without appear in the D4 tab.
- **`d4Carryover: true`**: Items marked with this flag appear in BOTH tabs (started in D3, completed in D4).

---

## THE 3 MILESTONES (Non-Negotiable, by May 2026)

From Sam Gaston — hard minimums based on historical lowest-10 students.

| Milestone | Target | Tracking |
|-----------|--------|----------|
| Attended Appointments | ≥ 90 | SPS Dashboard: ATTENDED field |
| Completed Procedures | ≥ 116 | SPS Dashboard: TOTAL_COMPLETED field |
| Clinical Summatives Passed | ≥ 7 | Dynamically counted from isSummative items |

**Consequences:**
- Fail ALL 3 → Academic Probation
- Fail 1 or 2 → Warning letter to Promotions Committee

---

## CATEGORY 1: FIXED PROSTHODONTICS

### Aggregate Trackers (clinical experience requirements)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| fixed-units-total | Total fixed units (start to completion) | 10 | 0 | null (by D4) |
| fixed-fpd | Must include 1 FPD (fixed partial denture) | 1 | 0 | null |
| fixed-implant-crown | Must include 1 implant-supported crown | 1 | 0 | null |
| fixed-cerec | Must include 3 CEREC restorations | 3 | 0 | null |

**Rules:**
- Cast Post and Core does NOT count as a unit
- Up to 2 Pontic, Inlay/Onlay, or Veneer CAN count toward unit credits
- Implant-supported crown can be substituted with activation of implants on an implant overdenture (satisfies implant req but does NOT count toward the 10 fixed units)
- ALL procedures documented on Fixed Prosthodontics Flow Sheet
- ALL steps (columns) signed by faculty

### Formatives (to qualify for summatives)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| fixed-form-prov | Provisional Restoration | 6 | 0 | null |
| fixed-form-prep | Tooth Preparation | 6 | 0 | null |
| fixed-form-impr | Final Impression | 6 | 0 | null |
| fixed-form-cement | Cementation | 6 | 0 | null |

**Unlock Rule:** After completing formatives, email full image of Fixed Prosthodontics Flow Sheet to gdadmin@bu.edu to unlock summatives.

### Summatives

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| fixed-sum-prep | Prep (Tooth Preparation) | 2 | 0 | null |
| fixed-sum-temp | Temp (Provisional Restoration) | 2 | 0 | null |
| fixed-sum-impr | Final Impression | 2 | 0 | null |
| fixed-sum-cement | Cementation | 2 | 0 | null |

### Other Fixed Requirements (all isSummative: true)

| Requirement ID | Description | Required | Completed | D3 Deadline | isSummative |
|---|---|---|---|---|---|
| fixed-occlusal-cr | Occlusal Analysis (Centric Relation) | 1 | 0 | null | true |
| fixed-occlusal-mi | Occlusal Analysis (Max Intercuspation) | 1 | 0 | null | true |
| fixed-mock | Mock Board | 1 | 0 | null | true |
| fixed-sim-1 | Fixed Simulation #1 (Dr. Ferriero) | 1 | 0 | null | true |
| fixed-sim-2 | Fixed Simulation #2 (Dr. Ferriero) | 1 | 0 | null | true |
| fixed-sim-fpd | Simulation: 3-unit Prep and Temp of FPD | 1 | 0 | null | true |
| fixed-case-pres | Case Presentation (on 2 completed fixed or fixed-removable units) | 1 | 0 | null | true |

---

## CATEGORY 2: OPERATIVE DENTISTRY

### Formative Prerequisite

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| op-formatives | Formative surfaces (to unlock summatives) | 20 | 20 | null |
| op-approval | Approval from Dr. McManama (email composite journal to mcmanama@bu.edu) | 1 | 1 | null |

**Status:** DONE — 20/20 formative surfaces completed, Dr. McManama approved, unlocked for summatives.

### Summatives (8 total must be PASSED)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| op-class5-1 | Class V Composite Summative #1 | 1 | 0 | null |
| op-class5-2 | Class V Composite Summative #2 | 1 | 0 | null |
| op-multi-1 | Multisurface Summative #1 | 1 | 1 | null |
| op-multi-2 | Multisurface Summative #2 | 1 | 1 | null |
| op-multi-3 | Multisurface Summative #3 | 1 | 1 | null |
| op-multi-4 | Multisurface Summative #4 | 1 | 1 | null |
| op-multi-5 | Multisurface Summative #5 | 1 | 0 | null |
| op-multi-6 | Multisurface Summative #6 | 1 | 0 | null |

**Rules:**
- 2 Class V summatives required (exactly 2 count, no more)
- 6 additional multisurface from: Class III/IV Composite, Class II Inlay/Onlay, Class II Composite
- Max 4 operative summatives with the same faculty member

### Other Operative Requirements

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| op-assignment | Operative assignment + survey (Blackboard, 10% of grade) | 1 | 0 | null |
| op-license | Licensing Exam Prep with Dr. Bruce Robinson (10% of grade) | 1 | 0 | null |

---

## CATEGORY 3: COMPLETE DENTURES (Removable Prosthodontics)

### Aggregate Tracker

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| cd-units-total | Total CD units (1 unit = 1 full arch of complete, interim, digital, or overdenture) | 4 | 0 | null |

**Rules:**
- ALL steps must be completed by the SAME student — no partial completion or transfer between students
- Digital denture steps may qualify as formative or summative if performed independently

### Formatives

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| cd-form-prelim | Preliminary Impressions (edentulous preferred) | 2 arches | 0 | null |
| cd-form-final | Final Impression (edentulous preferred) | 2 arches | 0 | null |
| cd-form-records | Intermaxillary Records (1 edentulous arch preferred) | 1 case | 0 | null |
| cd-form-postdam | Post Dam Technique (edentulous or max Kennedy Class I) | 1 case | 0 | null |
| cd-form-trial | Trial Denture / Tooth Try-In (1 edentulous arch preferred) | 2 arches | 0 | null |
| cd-form-insert | Insertion / Clinical Remount | 2 arches | 0 | null |
| cd-form-adjust | Adjustment (1 edentulous arch preferred) | 2 arches | 0 | null |

**Unlock Rule:** Email full image of Removable Flow Sheet to gdadmin@bu.edu to unlock summatives.

### Summatives (EDENTULOUS ONLY for most)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| cd-sum-prelim | Preliminary Impressions (Edentulous only) | 1 | 0 | null |
| cd-sum-final | Final Impression (Edentulous only) | 1 | 0 | null |
| cd-sum-records | Intermaxillary Records (Edentulous only) | 1 | 0 | null |
| cd-sum-postdam | Post-Dam Technique (Edentulous or max Kennedy Class I) | 1 | 0 | null |
| cd-sum-trial | Trial Denture / Tooth Try-In (Edentulous only) | 1 | 0 | null |
| cd-sum-insert | Insertion / Clinical Remount (Edentulous only) | 1 | 0 | null |
| cd-sum-adjust | Adjustment (Edentulous only) | 1 | 0 | null |

### Overdenture Experience (must complete one)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| cd-over-dup | Duplicate denture + implant planning through surgery | 1 | 0 | null |
| cd-over-abut | Abutment selection, placement & activation | 1 | 0 | null |

**Note:** Only ONE of the two overdenture options is required. Completing either one satisfies the requirement.

---

## CATEGORY 4: RPDs (Removable Partial Dentures)

### Clinical Experience (must complete ONE track)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| rpd-track1 | Track 1: 1 cast metal partial denture | 1 | 0 | null |
| rpd-track2 | Track 2: 2 flexible RPDs + OSCE | 2 | 0 | null |
| rpd-track3 | Track 3: 4 interim/resin base RPDs + OSCE | 4 | 0 | null |

**Rules:**
- Flexible RPD or interim/resin RPD counts as a unit only if it has ≥2 clasps AND replaces ≥3 teeth

### Formatives & Summatives

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| rpd-form-abut | Formative: Abutment preparations on mounted casts | 1 | 0 | null |
| rpd-sum-abut | Summative: Abutment Preparations (intra-oral) | 1 | 0 | null |

---

## CATEGORY 5: PERIODONTOLOGY

### D3-Specific Summative Deadlines (HARD)

These are the perio summatives with D3 deadlines. The formatives listed below are PREREQUISITES — you must complete the required formative count before attempting the summative.

1. **OHI Summative** — by October 1, 2025
   - Prereq: 2 OHI Formatives (1 Zoom, 1 in-person)
   - Status: DONE

2. **Scaling & Prophy Summative** — by May 2026
   - Prereq: 5 Prophy Formatives
   - Status: DONE (formatives done, D3 summative completed)

3. **Re-eval Gingivitis Summative** — 1 by May 2026 (d4Carryover)
   - Prereq: 3 Re-eval Gingivitis Formatives (d4Carryover)
   - Status: PENDING (formatives at 0/3)

### Surgical Assists

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| perio-surg-assist | Surgical Assist (max 1 can be implant uncovering) | 7 | 0 | null (by D4, combined D3+D4) |

### Formatives (3rd + 4th Year Cumulative)

These unlock the corresponding summative categories. You cannot attempt a summative until formatives are done.

| Requirement ID | Description | Required | Completed | D3 Deadline | Unlocks | Notes |
|---|---|---|---|---|---|---|
| perio-form-ohi | Oral Hygiene (1 Zoom, 1 in-person) | 2 | 2 | 2026-05-15 | OHI summative — DONE | |
| perio-form-dx | Diagnosis & Treatment Plan | 4 | 4 | 2026-05-15 | Dx & Tx Plan summative — DONE | |
| perio-form-prophy | Prophy | 5 | 5 | 2026-05-15 | Prophy summatives — DONE | |
| perio-form-quad | Quad SRP | 3 | 1 | null | Calculus removal summatives | |
| perio-form-reeval-ging | Re-evaluate Gingivitis | 3 | 0 | 2026-05-15 | Re-eval Gingivitis summatives | d4Carryover: true |
| perio-form-reeval-srp | Re-evaluate SRP | 1 | 0 | null | Re-eval SRP summative | |
| perio-form-impr | Re-evaluate Impression | 3 | 0 | null | Re-eval Impression summative | |
| perio-form-recall | Recall | 6 | 5 | null | Recall summatives | |

### Summatives (3rd + 4th Year Cumulative)

| Requirement ID | Description | Required | Completed | D3 Deadline | Notes |
|---|---|---|---|---|---|
| perio-sum-hci | Home Care Instruction (= the D3 OHI summative) | 1 | 1 | 2025-10-01 — DONE | |
| perio-sum-dx | Diagnosis & Treatment Plan (Type 2) | 2 | 0 | 2026-05-15 | OHRA/Caries auto-satisfied by this requirement |
| perio-sum-prophy-d3 | Prophy — D3 (isSummative) | 1 | 1 | 2026-05-15 | Summative; split from perio-sum-prophy |
| perio-sum-prophy-d4 | Prophy — D4 (isSummative) | 2 | 2 | null | Summative; split from perio-sum-prophy |
| perio-sum-reeval-ging | Re-evaluate Gingivitis | 1 | 0 | 2026-05-15 | d4Carryover: true |
| perio-sum-reeval-srp | Re-evaluate SRP | 1 | 0 | null | |
| perio-sum-impr | Re-evaluate Impression | 1 | 0 | null | |
| perio-sum-recall | Recall | 2 | 0 | null | |
| perio-sum-mock | Mock Board | 1 | 0 | null | |

### Calculus Removal / SRP (part of Periodontology)

**NOTE:** These are officially part of Periodontology summatives but tracked with their own IDs for cleaner export/import. The standalone SRP IDs below are the CANONICAL IDs. There is NO separate "perio-sum-calc" ID.

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| srp-calc-1 | Calculus Removal Summative #1 | 1 | 0 | null |
| srp-calc-2 | Calculus Removal Summative #2 | 1 | 0 | null |
| srp-calc-3 | Calculus Removal Summative #3 | 1 | 0 | null |
| srp-reeval | Re-evaluate SRP Summative (same as perio-sum-reeval-srp) | 1 | 0 | null |

**IMPORTANT:** srp-reeval and perio-sum-reeval-srp are the SAME requirement. srp-reeval is the canonical export ID. perio-sum-reeval-srp should be treated as an alias if encountered.

### DC Rotation

| Requirement ID | Description | Required | Completed | D3 Deadline | Notes |
|---|---|---|---|---|---|
| perio-dc-rotation | DC Rotation Week | 1 | 0 | null | 4th year requirement |

### PE 640 Clinical Workflow Requirements (Per Patient)

Not tracked as individual requirement IDs — these are course standards that affect the perio grade and graduation sign-off. Every dentulous patient must go through the full clinical sequence:

**Phase 1 — Evaluation/Examination:**
Medical hx review, dental hx + chief complaint, extraoral exam (TMJ), intraoral soft tissue exam, tooth exam (missing teeth, restorations, caries, mobility, occlusion, parafunctional habits, pulpal status), current radiographs, plaque/calculus distribution, soft tissue exam, probing depths/gingival margin/CAL/BOP, mucogingival relationships, furcation invasions, additional diagnostic aids, all findings recorded, referrals documented.

**Phase 2 — OHI (before scaling/SRP):**
Explain plaque, demonstrate toothbrush/floss, identify additional aids needed, demonstrate aids, disclose/identify plaque, record plaque score on SALUD.

**Phase 3 — Initial Therapy (Scaling/Prophy and/or SRP):**
Remove all calculus, plane/smooth roots, no tissue damage, remove stain/plaque, recontour rough restorations, take plaque score of previously scaled quads at each SRP visit.

**Phase 4 — Periodontal Re-evaluation (D0170):**
Required after initial therapy before restorative phase. Gingivitis: 2-12 weeks post scaling/prophy. Periodontitis: 2-8 weeks post first quad SRP. Re-eval prior to final impression (D0170i) required for fixed/removable prosthetics on dentate patients.

**Phase 5 — Recall/Maintenance:**
Update hx, radiographic review, exams, plaque control review, scaling/RP where indicated, polish. Intervals never >6 months.

**CRITICAL SUMMATIVE RULE:** All periodontal summative exams must be initiated on SPS PRIOR to the start of the examination, at the time of authorization. No summative credit once procedure has begun. Faculty intervention = does NOT qualify.

**Perio Grading (affects grade):**
- A = ≥92% summatives + ≥70% of patients through full sequence
- B = ≥85% + ≥50%
- C = ≥75% + ≥45%
- D = ≥70% + <40%
- F = <70% + <35%

---

## CATEGORY 6: ENDODONTICS

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| endo-rct-1 | Root Canal Treatment #1 (on patient) | 1 | 0 | null |
| endo-rct-2 | Root Canal Treatment #2 (on patient) | 1 | 0 | null |
| endo-pulp-1 | Pulpectomy Summative #1 | 1 | 0 | null |
| endo-pulp-2 | Pulpectomy Summative #2 | 1 | 0 | null |
| endo-postdoc | Post-doc Endo Assist | 1 | 0 | null |
| endo-predoc | Pre-doc Endo Assist | 1 | 0 | null |
| endo-mock | Passed Mock Board on manikin | 1 | 0 | null |

**Notes:**
- Pulpectomy summative can receive credit on completed RCT cases when indicated
- Mock Board must be passed regardless of CDCA/WREB results

---

## CATEGORY 7: ORAL SURGERY

### 3rd Year Requirements (D3 Deadline: May 2026)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| os-3rd-rotation | 3rd Year Oral Surgery Rotation | 1 | 1 | 2026-05-15 — DONE |
| os-3rd-consult | Summative: OS Consult Management | 1 | 1 | 2026-05-15 — DONE |
| os-3rd-nerve | Summative: IAN + Long Buccal Nerve Block | 1 | 1 | 2026-05-15 — DONE |
| os-3rd-suture | Summative: Suturing Workshop | 1 | 1 | 2026-05-15 — DONE |

### 4th Year Requirements (by end of D4)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| os-4th-rotation | Complete 2-week scheduled rotation | 1 | 0 | null |
| os-4th-present | Presentation at morning seminar | 1 | 0 | null |
| os-4th-oral | Oral examination at end of rotation | 1 | 0 | null |
| os-4th-rx | Take-home prescription writing exercise | 1 | 0 | null |
| os-4th-mcq | MCQ quiz (Med Emergency, Nitrous, Instrument ID) | 1 | 0 | null |
| os-4th-sim | Medical Simulation Lab at BMC | 1 | 0 | null |
| os-4th-nitrous | Nitrous-Oxide Oxygen Sedation Hands-On training | 1 | 0 | null |

### Clinical Summatives (by end of D4)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| os-extract-1 | Extraction on patient #1 | 1 | 0 | null |
| os-extract-2 | Extraction on patient #2 | 1 | 0 | null |

---

## CATEGORY 8: PEDIATRIC DENTISTRY

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| peds-course | PD 530 Didactic course completion | 1 | 1 | 2026-05-15 — DONE |
| peds-rotation | Rotations (including Franciscan Hospital) | 1 | 0 | null |
| peds-assessment | Post-rotation assessment | 1 | 0 | null |
| peds-recall | New Patient/Recall (on log sheet) | 3 | 0 | null |
| peds-sealants | Sealants (on log sheet) | 3 | 0 | null |
| peds-restore | Restorative procedures (on log sheet) | 3 | 0 | null |

---

## CATEGORY 9: GROUP PRACTICE — D3 (GD 640)

All items in this category have a D3 deadline of May 2026 unless noted.

### Attendance & Meetings

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| gp-attend | Clinical Attendance (4 sessions/week) | ongoing | ongoing | ongoing — DONE (tracking) |
| gp-meetings | Monthly group meetings (mandatory, -2 per absence) | ongoing | ongoing | ongoing |

### Periodic Reviews

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| gp-form-review | Formative Periodic Review (7.5% of grade) | 1 | 1 | 2026-05-15 — DONE |
| gp-sum-review | Summative Periodic Review (30% of grade) | 1 | 0 | 2026-05-15 |

### Written Analyses

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| gp-form-analysis | Formative Written Analyses (7.5% combined) | 2 | 2 | 2026-05-15 — DONE |
| gp-sum-analysis | Summative Written Analysis (35% of grade) | 1 | 0 | 2026-05-15 |

**Rule:** Required for EVERY Type 2 patient — immediately after comprehensive exam/data collection, arrange office meeting with GPL, submit electronically before meeting.

### Practice Management Scenarios

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| gp-pms-3rd | Formative PMS (5% of grade, completed at Leadership Workshop) | 1 | 0 | 2026-05-15 |

### Communication Module (10% of D3 grade)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| gp-comm-workshop | Communication Workshop attendance (40% of comm grade) | 1 | 1 | 2026-05-15 — DONE |

### Other D3 GP Requirements

| Requirement ID | Description | Required | Completed | D3 Deadline | Notes |
|---|---|---|---|---|---|
| gp-leader | Leadership Workshop attendance | 1 | 0 | 2026-05-15 | |
| gp-case | Case Presentation at Group Monthly Meeting (5% of grade) | 1 | 1 | 2026-05-15 — DONE | isSummative: true |
| gp-milestones | 3rd Year Milestones | 1 | 0 | 2026-05-15 | |

### Leadership Requirements (moved from D4 GP)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| gp4-posttreat-eval | Post Treatment Evaluations (no form/sum distinction) | 3 | 0 | 2026-05-15 |
| gp4-aux-tech | Formative Aux Assessment with Dental Technician | 1 | 0 | 2026-05-15 |
| gp4-aux-asst | Formative Aux Assessment with Dental Assistant | 1 | 0 | 2026-05-15 |
| gp4-aux-summatives | Summative Aux Assessments (combined Tech+Asst, min 1 each type) | 4 | 0 | 2026-05-15 |
| gp4-rounds-form | Formative Leading Rounds | 1 | 0 | 2026-05-15 |
| gp4-rounds-sum | Summative Leading Rounds | 1 | 0 | 2026-05-15 |

### D3 GD 640 Grade Breakdown

- Formatives 25%: PR 7.5% + WA 7.5% + PMS 5% + Case Pres 5%
- Summatives 65%: PR 30% + WA 35%
- Communications 10%
- Grade Scale: A ≥93, A- 90-92, B+ 87-89, B 83-86, B- 80-82, C+ 77-79, C 73-76, C- 70-72, D 60-69, F <60
- Deductions: Missed meeting -2, PR professionalism -5, PMS professionalism -5, <4 sessions/week -1/week, Missing OHRA -1/-3/-5 escalating

---

## CATEGORY 10: GROUP PRACTICE — D4 (GD 642)

These are formally D4 requirements but formatives can/should be started in D3.

### Summatives

| Requirement ID | Description | Required | Completed | D3 Deadline | Notes |
|---|---|---|---|---|---|
| gp4-comm-txplan | Communication Tx Plan Presentation (SEPARATE from D3 comm) | 1 | 0 | null | |
| gp4-periodicrev-1 | Periodic Reviews (in 4th year) | 2 | 0 | null | |
| gp4-written-analysis | Written Analyses (cumulative total — D3 summative WA counts toward this) | 4 | 0 | null | |
| gp4-pms | Practice Management Scenarios (cumulative — includes D3 formative) | 4 | 0 | null | d4Carryover: true |

---

## CATEGORY 11: TREATMENT PLANNING & PATIENT MANAGEMENT (RS 545)

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| tx-seminar-1 | Summative small group presentation (Type 2 case, 20% of RS 545 grade) | 1 | 0 | 2026-04-24 |
| tx-attend-1 | Attend classmate presentations (80% of RS 545 grade) | 2 | 0 | null (by Apr 23, 2027) |

**Note:** tx-ohra-1 and tx-caries-1 have been removed — auto-satisfied by perio-sum-dx.

---

## CATEGORY 12: GERIATRIC DENTAL MEDICINE

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| geri-course | PH 541 Didactic Course (must challenge Spring 2026) | 1 | 0 | Spring 2026 |
| geri-rotation | Geriatric Rotation (after passing PH 541) | 1 | 0 | null |
| geri-assignment | Clinical Assignment (any GSDM patient, rotation, or externship) | 1 | 0 | null |

---

## CATEGORY 13: EXTERNSHIP (Summer 2026 — post-D3)

Rotation: Group 1, May 18 – July 24, 2026.

| Requirement ID | Description | Required | Completed | D3 Deadline |
|---|---|---|---|---|
| ext-casepres | Case Presentation (+ Blackboard upload + self-assessment + mock referral) | 1 | 0 | null |
| ext-outreach | Community Outreach Project | 1 | 0 | null |
| ext-spslog | SPS Log of all procedures + debriefing | 1 | 0 | null |

---

## MASTER CHECKLIST: HARD D3 DEADLINES (by May 2026)

Everything that MUST be done specifically by end of D3:

| # | Requirement | Requirement ID | Deadline | Status |
|---|---|---|---|---|
| 1 | 90 Attended Appointments | (milestone) | May 2026 | IP |
| 2 | 116 Completed Procedures | (milestone) | May 2026 | IP |
| 3 | 7 Clinical Summatives Passed | (milestone) | May 2026 | IP |
| 4 | Perio: OHI Summative | perio-sum-hci | Oct 1, 2025 | DONE |
| 5 | Perio: D3 Prophy Summative | perio-sum-prophy-d3 | May 2026 | DONE |
| 6 | Perio: Re-eval Gingivitis Summative | perio-sum-reeval-ging | May 2026 | PENDING |
| 7 | Perio: Dx & Tx Plan Summative | perio-sum-dx | May 2026 | PENDING |
| 8 | Perio: OHI Formatives | perio-form-ohi | May 2026 | DONE |
| 9 | Perio: Dx Formatives | perio-form-dx | May 2026 | DONE |
| 10 | Perio: Prophy Formatives | perio-form-prophy | May 2026 | DONE |
| 11 | Perio: Re-eval Gingivitis Formatives | perio-form-reeval-ging | May 2026 | PENDING |
| 12 | GP: 1 Formative Periodic Review | gp-form-review | May 2026 | DONE |
| 13 | GP: 1 Summative Periodic Review | gp-sum-review | May 2026 | PENDING |
| 14 | GP: 2 Formative Written Analyses | gp-form-analysis | May 2026 | DONE |
| 15 | GP: 1 Summative Written Analysis | gp-sum-analysis | May 2026 | PENDING |
| 16 | GP: 1 Formative PMS | gp-pms-3rd | May 2026 | PENDING |
| 17 | GP: Communication Workshop attended | gp-comm-workshop | May 2026 | DONE |
| 18 | GP: Leadership Workshop attended | gp-leader | May 2026 | PENDING |
| 19 | GP: 1 Case Presentation at group meeting | gp-case | May 2026 | DONE |
| 20 | GP: 3rd Year Milestones | gp-milestones | May 2026 | PENDING |
| 21 | GP: Post Treatment Evaluations | gp4-posttreat-eval | May 2026 | PENDING |
| 22 | GP: Formative Aux — Dental Technician | gp4-aux-tech | May 2026 | PENDING |
| 23 | GP: Formative Aux — Dental Assistant | gp4-aux-asst | May 2026 | PENDING |
| 24 | GP: Summative Aux Assessments | gp4-aux-summatives | May 2026 | PENDING |
| 25 | GP: Formative Leading Rounds | gp4-rounds-form | May 2026 | PENDING |
| 26 | GP: Summative Leading Rounds | gp4-rounds-sum | May 2026 | PENDING |
| 27 | GP: 4 clinic sessions/week maintained | gp-attend | Ongoing | DONE |
| 28 | GP: Group meetings attended (mandatory) | gp-meetings | Monthly | Ongoing |
| 29 | RS 545: 1 Summative Type 2 presentation | tx-seminar-1 | April 24, 2026 | PENDING |
| 30 | PH 541 Geriatrics Didactic Course | geri-course | Spring 2026 | PENDING |
| 31 | OS: 3rd Year Rotation completed | os-3rd-rotation | May 2026 | DONE |
| 32 | OS: Summative — OS Consult Management | os-3rd-consult | May 2026 | DONE |
| 33 | OS: Summative — IAN + Long Buccal Block | os-3rd-nerve | May 2026 | DONE |
| 34 | OS: Summative — Suturing Workshop | os-3rd-suture | May 2026 | DONE |
| 35 | Peds: PD 530 Didactic Course | peds-course | May 2026 | DONE |
| 36 | Perio Patient Progress Report up to date | (workflow) | Ongoing | Ongoing |

---

## CHANGES FROM PRIOR SYSTEM (for migration reference)

### IDs REMOVED (do not use these anymore)
- `perio-sum-calc` — replaced by srp-calc-1/2/3 (same 3 calculus removal summatives)
- `gp-comm` — split into gp-comm-workshop, gp-comm-form-txplan, gp-comm-sum-txplan
- `perio-3rd-ohi` — duplicate of perio-sum-hci (deleted 2026-04-05)
- `perio-3rd-prophy` — replaced by perio-sum-prophy-d3 (deleted 2026-04-05)
- `perio-3rd-reeval` — duplicate of perio-sum-reeval-ging (deleted 2026-04-05)
- `perio-sum-prophy` — split into perio-sum-prophy-d3 and perio-sum-prophy-d4 (2026-04-05)
- `gp-comm-form-txplan` — removed (2026-04-05)
- `gp-comm-sum-txplan` — removed (2026-04-05)
- `gp-ohra` — removed, OHRA auto-satisfied by perio-sum-dx (2026-04-05)
- `tx-ohra-1` — auto-satisfied by perio-sum-dx (2026-04-05)
- `tx-caries-1` — auto-satisfied by perio-sum-dx (2026-04-05)

### IDs ADDED (new in this version)
- `fixed-units-total` — 10 unit aggregate tracker
- `fixed-fpd` — 1 FPD sub-requirement
- `fixed-implant-crown` — 1 implant crown sub-requirement
- `fixed-cerec` — 3 CEREC sub-requirement
- `cd-units-total` — 4 CD unit aggregate tracker
- `gp-comm-workshop` — workshop attendance (was part of gp-comm)
- `gp-meetings` — monthly group meetings attendance
- `perio-sum-prophy-d3` — D3 prophy summative (split from perio-sum-prophy, 2026-04-05)
- `perio-sum-prophy-d4` — D4 prophy summative (split from perio-sum-prophy, 2026-04-05)
- `perio-dc-rotation` — DC Rotation Week, 4th year (2026-04-05)
- `gp-milestones` — 3rd Year Milestones (2026-04-05)

### IDs MOVED (2026-04-05 D3/D4 split)
- `gp4-posttreat-eval`, `gp4-aux-tech`, `gp4-aux-asst`, `gp4-aux-summatives`, `gp4-rounds-form`, `gp4-rounds-sum` — moved from D4 GP (GD 642) to D3 GP (GD 640) Leadership Requirements, all with D3 Deadline: 2026-05-15
- `srp-calc-1`, `srp-calc-2`, `srp-calc-3`, `srp-reeval` — consolidated under Periodontology (were already there, now explicitly part of perio category)

### IDs ALIASED
- `srp-reeval` = `perio-sum-reeval-srp` (same requirement, srp-reeval is canonical)

---

## DOCUMENT VERSION HISTORY

| Date | Change |
|---|---|
| 2026-04-01 | Initial ground truth document created. Replaces PR_PART_1_SULEMAN_SHAIKH.pdf and GRADUATION_REQUIREMENTS.pdf. Resolves SRP duplication, adds aggregate trackers, splits GP comm module, adds missing D3 deadline items. |
| 2026-04-02 | Manual audit corrections: op-multi-5 completed 1→0 (only 4 multisurface summatives done), perio-sum-prophy completed 2→3 (all 3 done), gp-form-analysis completed 1→2 (both formative WAs done), peds-course completed 0→1 (PD 530 finished). Master checklist updated accordingly. |
| 2026-04-05 | D3/D4 split overhaul: Added yearTarget/d4Carryover model. Deleted perio-3rd-ohi/prophy/reeval duplicates. Split perio-sum-prophy into d3/d4. Added d3Deadlines to perio formatives. Moved Leadership Requirements from D4 GP to D3 GP. Deleted gp-comm-form-txplan, gp-comm-sum-txplan, gp-ohra. Added gp-milestones, perio-dc-rotation. Removed tx-ohra-1/tx-caries-1 (auto-satisfied by perio-sum-dx). Updated perio-sum-reeval-ging required 2→1. Made fixed Other Requirements isSummative. Updated gp-case to isSummative. Added peds-course D3 deadline. Summative milestone now dynamically counted. |
