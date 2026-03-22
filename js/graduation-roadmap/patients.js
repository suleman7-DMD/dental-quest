// ==================== PATIENTS TAB ====================
// Patient Tracker: sidebar-driven Google Docs-style patient records,
// requirement matching, countdown radar, and Claude import system.
// All functions are global (vanilla JS, no modules).

// ==================== SECTION 1: DEFAULT PATIENT RECORDS ====================

const DEFAULT_PATIENT_RECORDS = {
    "pt_2118878": {
        id: "pt_2118878", name: "Murillo, Carmen", chartNumber: "2118878",
        type: "Active Patient (35 y/o F)",
        medicalHx: "Hysterectomy April 2021.",
        medications: "None reported.",
        dentalHx: "History of DC/Tx plan, prophy, re-eval, recall. #29 core/crown, Ext #13, RCT #29/30, implant crown #4, composite #31, crown #30. Implants #12/#13 placed/uncovered 8/21/24 in Post-Doc Perio.",
        txSummaryBU: "History of RCT/Crowns on #29, #30, and implant #4. On 9/10/25, Suleman Shaikh torqued screw-retained implant #4. On 10/1/25, BWs were taken by Suleman Shaikh showing open contact between #12/#13 implants.",
        poeLast: "everytime prophy/POE attempted a new chief complaint comes up. prophy/POE was definitely completed on 8/5/2025 but was not saved in SPS \u2013 TALK TO MASELI",
        poeNext: "8/5/2025 (Overdue) | 3 months overdue for 6mrc/prophy.",
        txPlan: "Overdue 3MRC/Prophy. Remake #12/#13 implant crowns (open contact - no charge). RCT, cast post/core, and Crowns for #14 and #19. Cast post/core for #29. Composite #18. Gingivitis re-eval.",
        lastVisit: "10/1/2025 | BW updates and 6MRC.| Suleman Shaikh",
        nextVisit: "today 1/6/2026 - defective existing restoration MO #18 remove restoration and place 2 surface MO composite (my 20th formative surface). Pt still needs to remake 12/13 implant crowns for open contact - no charge.\n\nTAKE PICTURES TODAY. TAKE IMPRESSION MODELS TODAY. GET GSF TO FIGURE IT OUT W YOU.\n\nTAKE A LOOK AT #14 AND #19 FOR CROWNS\u2026..",
        lastFMX: "11/17/2021", lastBW: "10/1/2025", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Open contact noted #12/#13 via BWs on 10/1/25; crowns to be remade at no charge. Suleman must consult with Dr. Suzuki regarding remake before patient returns. Patient has history of lateness and cancellations; currently unscheduled.",
        reliability: "yellow", lastUpdated: null,
        allergies: 'NKA',
        txCompletedByMe: '9/10/2025: retorqued implant #4. 10/1/2025: BW taken, noted open contact #12/#13.',
        recallHistory: 'Last Recall: 2/5/2025. Frequency: 6-month. Next due: 8/5/2025 (OVERDUE).',
        activeStatus: 'Active'
    },
    "pt_1647620": {
        id: "pt_1647620", name: "Gil, Anabely", chartNumber: "1647620",
        type: "Active - Co-assigned with Post-doc Pros",
        medicalHx: "Arthritis, GERD, hypothyroidism, depression, hypertension, heart murmur. PSH: thyroid, tachycardia, endoscopy, breast surgery. Allergies: LATEX, amlodipine, perflutren, piroxicam, naproxen, tramadol. Precautions: Latex Allergy.",
        medications: "acetaminophen, aspirin, bupropion, dextran 70-hypromellose, docusate, famotidine, ferrous sulfate, ibuprofen, levothyroxine, loratadine, losartan-hydrochlorothiazide, nortriptyline, pantoprazole, polyethylene glycol, prazosin, pregabalin, quetiapine, triamcinolone.",
        dentalHx: "Co-assigned via Post-doc Pros. History: DC T2, OS consult/ext #32, prophy, crown preps #29, #20, #12, #13, FGG & GTR for #20 & #29, lower RPD insertion.",
        txSummaryBU: "History of tx at BU includes Emax crowns #8, #9, #12, #13, lower RPD insertion, and extractions of #20, #29, #32. 11/7/25 CT scan for fixed options. Most recently, Suleman Shaikh performed SRP UL 1-3 on 12/10/25.",
        poeLast: "Last recall: 10/22/2025",
        poeNext: "4/22/2026 | 6mrc recall due.",
        txPlan: "Single anterior implant (Post-doc Pros). Predoc: 1) Full mouth prophy, 2) Re-eval SRP (2-10 weeks), 3) Eval for crown. Check Salud for full pre-doc plan.",
        lastVisit: "12/10/2025 | SRP upper left quadrant 1-3 teeth | Suleman Shaikh",
        nextVisit: "1/6/2026 4pm | Full mouth prophy and evaluate for crown | Suleman Shaikh",
        lastFMX: "11/7/2025", lastBW: "2/11/2025", lastCBCT: "11/7/2025", lastPANO: "4/15/2020 (Due for update)",
        notes: "Monitoring sensitivity post-SRP. Perio sequence in progress. Patient has LOE on 1/7/26 at 4pm for unknown reason (suspected sensitivity post-SRP). Prefers evening sessions. Emotional support dog documentation on file.",
        reliability: "yellow", lastUpdated: null,
        allergies: 'LATEX, amldipine, perflutren, pireoxicam, naproxen, tramadol',
        txCompletedByMe: '10/22/2025 recall + prophy + OHI',
        recallHistory: 'Last Recall: 10/22/2025. Frequency: 6-month. Next due: 4/22/2026.',
        activeStatus: 'Active'
    },
    "pt_79118": {
        id: "pt_79118", name: "Williams, Kisha", chartNumber: "79118",
        type: "(56 y/o F) - Severe dental anxiety and high BP",
        medicalHx: "Congenital heart murmur, COPD, PTSD, Herpes, s/p hysterectomy, s/p appendix/colon/gallbladder removal (2023). Precautions: Consult MD for pre-med, avoid supine position, monitor for anxiety/elevated BP.",
        medications: "omeprazole, dicyclomine, lovastatin, abilify, nifedipine. Allergies: Sulfur and Risperidone.",
        dentalHx: "History of orofacial pain and TMD issues. Previously had ortho consult.",
        txSummaryBU: "History of DC and prophy. Suleman rendered prophy, ortho consult, and alginate impressions for TMD analysis. Recent restoration: #31 OF composite.",
        poeLast: "Last prophy: 8/21/2025 (by Suleman)",
        poeNext: "2/21/2026 | 3mrc recall due.",
        txPlan: "Monitor #31 (potential Class V or Full Crown), 2-surface posterior composite (needs tx plan), TMD consult, and TMD analysis summative with Dr. Maseli.",
        lastVisit: "10/8/2025 | FMX/BW and #31 OF composite restoration | Suleman Shaikh",
        nextVisit: "need to find out and update here (Pending 2-surface comp and TMD consult)",
        lastFMX: "10/8/2025", lastBW: "10/8/2025", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here (NEEDS PANO for Ortho/TMD)",
        notes: "Severe dental anxiety; assistant recommended for soothing. 8/21/25 prophy was completed by Suleman but requires Salud entry/billing update. Monitor BP. Alginate impressions taken for Dr. Maseli. Monitor #31 closely for failure or need for crown.",
        reliability: "green", lastUpdated: null,
        allergies: 'Sulfur and risperidone',
        txCompletedByMe: 'Prophy (on 8/21/2025), ortho consult.',
        recallHistory: 'Last Recall: 8/21/2025 (prophy). Frequency: 3MRC. Next due: 2/21/2026.',
        activeStatus: 'Inactive'
    },
    "pt_2467990": {
        id: "pt_2467990", name: "Rosario, Jose", chartNumber: "2467990",
        type: "Active Patient (Type 2 - Full Mouth Extractions Planned)",
        medicalHx: "52 y/o male. Rotator cuff arthritis (s/p shoulder surgery 2024). Otherwise healthy. Pack-a-day smoker.",
        medications: "None.",
        dentalHx: "Hopeless prognosis of remaining dentition. Previously planned for staged extractions; patient now prefers one-stage extraction with same-day insertion of interim CU/CL dentures.",
        txSummaryBU: "History of tx with Suleman: Prophy/6MRC, treatment plan presentation, preliminary/final impressions with border molding, and intermaxillary records (11/8/25). Lab case (Oral Arts) sent 11/12/25.",
        poeLast: "Last recall: 9/2/2025",
        poeNext: "3/3/2026 | Next recall due.",
        txPlan: "One-stage full mouth extraction of remaining dentition. Fabrication and same-day insertion of interim CU/CL dentures.",
        lastVisit: "11/8/2025 | Intermaxillary records appointment | Suleman Shaikh",
        nextVisit: "need to find out and update here (Pending arrival of lab try-in)",
        lastFMX: "1/9/2025", lastBW: "1/9/2025", lastCBCT: "need to find out and update here", lastPANO: "1/9/2025",
        notes: "Lab case sent to Oral Arts on 11/12/25 with record bases. Once try-in is received, schedule patient for tooth try-in visit. Following try-in, case will return to lab for final processing. Patient must confirm OS consult and schedule extraction date with OS for same-day insertion.",
        reliability: "green", lastUpdated: null,
        allergies: 'No known allergies',
        txCompletedByMe: 'Prophy + 6MRC (9/2/2025), tx planning presentation, preliminary alginate impressions, final impressions w/ border molding, intermaxillary records (last visit 11/8/2025).',
        recallHistory: 'Last Recall: 9/2/2025.',
        activeStatus: 'Active'
    },
    "pt_2568967": {
        id: "pt_2568967", name: "Nsereko, Nababi", chartNumber: "2568967",
        type: "Active - Type 2 Patient (41 y/o F) (from DC)",
        medicalHx: "Healthy. No systemic issues reported.",
        medications: "None.",
        dentalHx: "RCT completed for teeth #5 and #12.",
        txSummaryBU: "Full Data Collection (DC), full perio chart, and radiographs completed 12/8/25. Patient has a complex 7-phase treatment plan involving OS, RPD, and Fixed/Endo work.",
        poeLast: "Full DC completed by d3 on 12/8/2025 - prophy pending",
        poeNext: "Prophy due, POE not due until 6/8/2026 | 6-month recall due (Following active phases).",
        txPlan: "Phase 1: Prophy/Re-eval/OS consult (Ext #2, 16, 17). Phase 2: Interim Upper RPD. Phase 3: #18 Sedative filling (caries control). Phase 4: Composites #19-21, 28-29. Phase 5: Survey crowns #5 (post/core) & #12 (buildup). Phase 6: RCT Retreat #8 (Questionable prognosis). Phase 7: Definitive Cast Upper RPD.",
        lastVisit: "12/8/2025 | Data Collection (DC) + Full Perio Chart + FMX/BW | Previous Student",
        nextVisit: "Initial prophy (Suleman Summative) + Alginate models for Written Analysis (WA) with Dr. Maseli | Suleman Shaikh",
        lastFMX: "12/8/2025", lastBW: "12/8/2025", lastCBCT: "need to find out and update here (Recommended for odontoma/osteitis eval)", lastPANO: "12/8/2025",
        notes: "OS to evaluate osteitis periapical #19 and suspected compound odontoma impacting eruption of #23. Patient aware #18 may need RCT/Crown and #8 restorability is questionable. Written Analysis (WA) requires Dr. Maseli appointment. Patient is currently deciding on continuing at BU due to cost concerns.",
        reliability: "green", lastUpdated: null,
        allergies: '',
        txCompletedByMe: '',
        recallHistory: '',
        activeStatus: 'Active'
    },
    "pt_2577113": {
        id: "pt_2577113", name: "Krima, Mohamed", chartNumber: "2577113",
        type: "Active (Type 2)",
        medicalHx: "21 y/o male. Healthy. Allergy to penicillin medications.",
        medications: "None.",
        dentalHx: "Class III classification with severe TMJ deviation to the left side; clicking and popping sounds heard on both TMJ sides.",
        txSummaryBU: "8/15/25 Data Collection. History of restorations: #4 OFD (10/18/25), #13 DO (11/13/25), and MOD #13 (12/19/25).",
        poeLast: "Last recall: 8/18/2025",
        poeNext: "2/18/2026 | 6mrc recall due.",
        txPlan: "Remaining composites: #12 DO and #14 DO. Pending Gingivitis Re-eval, TMD Analysis summative with Dr. Maseli, and TMJ specialist referral.",
        lastVisit: "12/19/2025 | 3-surface composite MOD #13 | Suleman Shaikh (Note: Needs faculty signature from Dr. Swati)",
        nextVisit: "1/13/2026 8:30am | 2-surface composite #12 DO and TMD Analysis | Suleman Shaikh",
        lastFMX: "8/15/2025", lastBW: "8/15/2025", lastCBCT: "need to find out and update here", lastPANO: "No pano on file.",
        notes: "Faculty signature for 12/19/25 MOD #13 (Dr. Swati) is missing on flowsheet. Referral to Dr. Motro (TMJ Specialist) is required. TMD analysis to be completed after final restorations.",
        reliability: "green", lastUpdated: null,
        allergies: 'Penicillin medications',
        txCompletedByMe: 'T2 DC + prophy. 3 surface posterior composite (#4 OFD).',
        recallHistory: 'Last Recall: 8/18/2025. Frequency: 6-month. Next due: 2/18/2026.',
        activeStatus: 'Active'
    },
    "pt_1875522": {
        id: "pt_1875522", name: "Hector, Lebron", chartNumber: "1875522",
        type: "Active",
        medicalHx: "53 y/o male. Hypertension and Pre-Type II Diabetes.",
        medications: "amlodipine, lisinopril, metformin, metoprolol, omega 3.",
        dentalHx: "History of #20F, #29F, #15M, #11F (Cl 5), implant crown #13, peri-implantitis tx #13 (Abx), and lower RPD delivery/adjustments.",
        txSummaryBU: "Comprehensive tx at BU includes restorations, lower RPD, and implant #13. Suleman is currently managing operative while Shaan is on externship. Last tx was #11F on 10/27/25.",
        poeLast: "Last full perio chart was 10/16/24; full charting must be completed at 1/5 visit",
        poeNext: "1/5/2026 | Full Perio Chart + 3mrc Recall + Prophy + POE due.",
        txPlan: "Pending: 8ML & 10DL composites (potential Cl 5), SRP UL (1-3 teeth) for fair perio prognosis, and Crown #29 (verify with pt).",
        lastVisit: "10/27/2025 | #11 F Class 5 composite | Shaan",
        nextVisit: "1/5/2026 | 3MRC Recall, Prophy, POE, Restorative check, X-rays and OHRA and Full Perio Chart | Suleman Shaikh\n\nPt missed 1/5/2026 apt and his previous apt in november 2025 too. No call no show. It says on salud \"pt discharged?\" what is that about? Figure this guy out seems like dead end",
        lastFMX: "12/2024", lastBW: "12/2024 (NEEDS UPDATED BW: current images are very poor quality)", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Patient missed 11/20/25. pt missed 1/5/2026 apt. 2 no call no shows. Suleman needs to assess 8ML/10DL and #29 crown preference during POE.",
        reliability: "red", lastUpdated: null,
        allergies: '',
        txCompletedByMe: '',
        recallHistory: '',
        activeStatus: 'Active'
    },
    "pt_1297657": {
        id: "pt_1297657", name: "Wright, Tawana", chartNumber: "1297657",
        type: "Active Patient (59 y/o F)",
        medicalHx: "Hep B (remission), high BP, CVD, diabetes, osteoporosis, arthritis. Precautions: Patient on Eliquis (Apixaban)\u2014Consult MD for management before invasive procedures. Monitor BP and Diabetes.",
        medications: "metformin, atorvastatin, losartan, gabapentin, lisinopril, eucarine, Albuterol, Tylenol, Apixaban (Elequis 5mg), Bupropion, Fluticasone, Ipratropium, latanoprost, citalopram, loratadine, ranitidine, risperidone.",
        dentalHx: "History of 30+ year old amalgam restorations with heavy recurrent decay. Prior BU history of prophy, OHI, and recalls.",
        txSummaryBU: "Restorative history with Suleman: #3 OL (10/4/25), #2 OL (11/1/25), and #14 MFD 3-surface (12/13/25). Previous history of restorations on #2, #3, and #14 (Suleman).",
        poeLast: "Last recall: 9/3/2025",
        poeNext: "3/3/2026 | 6MRC + Prophy + Gingivitis Re-eval due.",
        txPlan: "Pending 2-surface posterior composites on #18 and #31. Ortho consult to be scheduled after all restorative work is finalized.",
        lastVisit: "12/13/2025 | #14 MFD 3-surface composite restoration | Suleman Shaikh",
        nextVisit: "need to find out and update here (Pending scheduling for #18 or #31)",
        lastFMX: "7/29/2024", lastBW: "9/3/2025", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Patient takes Eliquis 5mg; ensure MD consult is current for any future surgical/invasive needs. Suleman needs to consult with GPL regarding #14; due to the extent of original amalgam decay, a crown may still be indicated. Ortho consult follows completion of #18 and #31.",
        reliability: "green", lastUpdated: null,
        allergies: 'NKDA',
        txCompletedByMe: 'Recall/prophy/OHI on 9/3/2025, #2 OL (2 surface) on 11/1/2025, #3 OL (2 surface) on 10/4/2025.',
        recallHistory: 'Last Recall: 9/3/2025. Frequency: 6-month. Next due: 3/3/2026.',
        activeStatus: 'Active'
    },
    "pt_2582208": {
        id: "pt_2582208", name: "Carvalho, Alison", chartNumber: "2582208",
        type: "Active Patient (31 y/o F)",
        medicalHx: "Healthy. No systemic issues.",
        medications: "None.",
        dentalHx: "Patient is fresh from Data Collection (DC) completed 12/16/2025.",
        txSummaryBU: "Full Data Collection, full perio chart, and complete X-ray series performed on 12/16/2025. Current plan only includes prophy and \"watch for endo,\" but further restorative needs are suspected by Suleman.",
        poeLast: "POE/DC completed by d3 on 12/16/2025. Pt needs prophy.",
        poeNext: "6/16/2026 | 6-month recall due.",
        txPlan: "Initial Prophy. Pending: Comprehensive restorative check to address caries noted on 12/16/25 radiographs (not currently in official plan). Potential endo monitoring.",
        lastVisit: "12/16/2025 | Full Data Collection (DC) + Perio Chart + FMX/BW | Dr. Haines",
        nextVisit: "Initial Prophy (summative) + Restorative check/Tx Plan confirmation | Suleman Shaikh",
        lastFMX: "12/16/2025", lastBW: "12/16/2025", lastCBCT: "need to find out and update here", lastPANO: "12/16/2025",
        notes: "Suleman noted several caries on X-rays taken 12/16/25 that were not included in the original treatment plan by Dr. Haines. Next visit must include a restorative summative/check to update the treatment plan before proceeding. Monitor for potential endodontic needs.",
        reliability: "green", lastUpdated: null,
        allergies: '',
        txCompletedByMe: '',
        recallHistory: '',
        activeStatus: 'Active'
    },
    "pt_1987861": {
        id: "pt_1987861", name: "Perdomo, Cynthia", chartNumber: "1987861",
        type: "Active (Type 2) - Ortho Patient",
        medicalHx: "37 y/o female. GERD.",
        medications: "Omeprazole, Pantoprazole.",
        dentalHx: "RCT #30 (2019), Retreat RCT #14 (2019), #14 Crown, #31F, #18 MO, #3 OL. Currently in Ortho treatment.",
        txSummaryBU: "History of Endo and Restorative work at BU. Currently in active Ortho phase. Most recent recall/perio recorded 3/17/25; however, note indicates a visit/X-rays on 12/8/25. Patient is a no-show risk (missed 10/2025).",
        poeLast: "12/8/2025 | Recall POE, Full Perio Chart, and X-rays",
        poeNext: "3/8/2026 | 3-month recall due.",
        txPlan: "Continue Ortho. Post-ortho plan: Implant placement for #19 or #29 (verify site preference). Needs alginate models and Written Analysis (WA).",
        lastVisit: "12/8/2025 | Recall POE, Full Perio Chart, and X-rays | Previous Student",
        nextVisit: "3MRC Recall + POE + Prophy + Ortho check | Suleman Shaikh",
        lastFMX: "12/8/2025 (Updated)", lastBW: "12/8/2025 (Updated)", lastCBCT: "need to find out and update here", lastPANO: "6/4/2021 (Due for update)",
        notes: "Patient is a no-show risk; ensure confirmation for next visit. Verify if implant site is #19 or #29 (conflicting notes). Alginate models and WA needed to confirm restorative plan post-ortho. Monitor GERD/acid erosion.",
        reliability: "yellow", lastUpdated: null,
        allergies: '',
        txCompletedByMe: '',
        recallHistory: '',
        activeStatus: 'Active'
    },
    "pt_1763380": {
        id: "pt_1763380", name: "Delossantos, Arthur", chartNumber: "1763380",
        type: "Active",
        medicalHx: "Degenerative eye disease (s/p eye surgery Jan 2025).",
        medications: "Diamox, Cosopt eye drop, Latanoprost eye drop, Bromonidine eye drop.",
        dentalHx: "History of ortho, sealants (#2, 3, 30, 31), gingivectomy (#13, 20), extractions (#17, 32).",
        txSummaryBU: "History of ortho, sealants, gingivectomy, and extractions. DC+Prophy completed 8/23/2024 and 5/19/2025. Next recall due 11/23/2025.",
        poeLast: "5/19/2025 | DC + Prophy + Tx Sequencing",
        poeNext: "11/23/2025 | 6MRC and prophy due",
        txPlan: "Patient is currently in the recall phase; no active pending treatment.",
        lastVisit: "5/19/2025 | DC + Prophy + Tx Sequencing | Previous Student",
        nextVisit: "need to find out and update here (Pt has not scheduled yet)",
        lastFMX: "6/8/2023", lastBW: "8/23/2024", lastCBCT: "-", lastPANO: "-",
        notes: "Missed apt on 3/29/2025. FMX and BW due.",
        reliability: "red", lastUpdated: null,
        allergies: 'None',
        txCompletedByMe: 'None',
        recallHistory: 'Last Recall: 5/19/2025. Frequency: 6-month. Next due: 11/23/2025.',
        activeStatus: 'Active'
    },
    "pt_2107896": {
        id: "pt_2107896", name: "Sbardella, Kristen", chartNumber: "2107896",
        type: "Active Patient (50 y/o F)",
        medicalHx: "HTN, anxiety, thyroid issues, arthritis. Precautions: Controlled HTN (Monitor BP), potential anxiety.",
        medications: "gabapentin, Adderall 30mg, ibuprofen (800mg), risperidone 2mg, metoprolol, citalopram 10mg.",
        dentalHx: "Full mouth extractions, interim CU/CL, and implant placement #22 & #27. Definitive digital CU/CL delivered.",
        txSummaryBU: "History includes FME, implant planning/placement (#22/#27), soft reline, and definitive digital CU/CL. Implants activated with blue retention rings. 9/17/25: U/L denture adjustment by Suleman.",
        poeLast: "9/17/2025 | Denture adjustment",
        poeNext: "9/17/2026 | Annual Denture Recall Due.",
        txPlan: "Yearly denture recall phase. Planned replacement of nylon retention rings for overdenture. FMX and BW series due.",
        lastVisit: "9/17/2025 | Upper/Lower denture adjustment | Suleman Shaikh",
        nextVisit: "need to find out and update here (Pending retrieval of retention rings)",
        lastFMX: "need to find out and update here (FMX + BW due)", lastBW: "need to find out and update here (FMX + BW due)", lastCBCT: "need to find out and update here", lastPANO: "2021 (Due for update)",
        notes: "Suleman needs to retrieve/order nylon retention rings before the next visit; they were not found on the 7th floor. Previous student (Ryann Shaddick) was contacted regarding their location. Suleman must explain the retrieval delay to the patient, as rings were already paid for. Monitor BP due to HTN.",
        reliability: "green", lastUpdated: null,
        allergies: 'None',
        txCompletedByMe: 'Upper/Lower denture adjustment (9/17/2025).',
        recallHistory: 'Last Recall: 9/17/2025. Frequency: Annual. Next due: 9/17/2026.',
        activeStatus: 'Active'
    },
    "pt_2569813": {
        id: "pt_2569813", name: "Koshkarian, Kavitha", chartNumber: "2569813",
        type: "Active (27 y/o F)",
        medicalHx: "Healthy.",
        medications: "None.",
        dentalHx: "Referred to ortho for skeletal class 3 and posterior open bite on recall 6/3/2025.",
        txSummaryBU: "Last visit 6/3/2025 for 6mrc/prophy. Tx completed by me: None (have not seen pt yet).",
        poeLast: "6/3/2025 | 6mrc/prophy",
        poeNext: "12/3/2025 | Recall due (OVERDUE)",
        txPlan: "Gingivitis Re-Reval (non post-operative), prophy, 6mrc.",
        lastVisit: "6/3/2025 | 6mrc/prophy | Previous Student",
        nextVisit: "need to find out and update here (recall overdue)",
        lastFMX: "5/8/2025", lastBW: "5/8/2025", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Patient experiences sensitivity to cold air and water. No significant periodontal findings. Suleman needs to make recall appointment/prophy for pt. Earliest apt requested for recall - no response - never seen pt.",
        reliability: "red", lastUpdated: null,
        allergies: 'No allergies',
        txCompletedByMe: 'None (have not seen pt yet)',
        recallHistory: 'Last Recall: approx. 6/3/2025. Frequency: 6-month. Next due: 12/3/2025.',
        activeStatus: 'Active'
    },
    "pt_1186199": {
        id: "pt_1186199", name: "Laplante, Jonathan", chartNumber: "1186199",
        type: "Active (23 y/o M)",
        medicalHx: "Sickle Cell Anemia. Precautions: Consult w/ MD prior to major surgical procedures. Avoid long/stressful appointments.",
        medications: "Hydroxyurea.",
        dentalHx: "DC, Initial Prophy, #10 Composite, Gingivitis-Re-eval, Bleaching trays. Pt has had orthodontic treatment done at BU.",
        txSummaryBU: "Tx Completed by me: None. Last visit 1/15/2025 (6-month recall + prophy).",
        poeLast: "1/15/2025 | Recall + Prophy",
        poeNext: "7/15/2025 (OVERDUE) | Recall + Prophy",
        txPlan: "Recall + Prophy (OVERDUE). OS Consult for extraction of #1/16/17/32. Treatment plan composite restorations (#14, #16, #1).",
        lastVisit: "1/15/2025 | 6-month recall + prophy | Previous Student",
        nextVisit: "Recall + Prophy, OS Consult. Next Recall Due: 7/15/2025 (OVERDUE).",
        lastFMX: "5/3/2024 (BW due/FMX due)", lastBW: "5/3/2024 (BW due)", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Sickle Cell Anemia - Consult w/ MD prior to major surgical procedures. Avoid long/stressful appointments. Assigned to Suleman for recall due 7/15/2025. Pt has not yet scheduled appointment. Last attempt by Suleman 8/19/2025. Front desk attempted 8/20/2025. Suleman must follow up on overdue recall + OS consult and potentially send HTC letter.",
        reliability: "red", lastUpdated: null,
        allergies: 'NKDA',
        txCompletedByMe: 'None',
        recallHistory: 'Last Recall: 1/15/2025. Frequency: 6-month. Next due: 7/15/2025 (OVERDUE).',
        activeStatus: 'Active'
    },
    "pt_966540": {
        id: "pt_966540", name: "Soivilien, Sandrine", chartNumber: "966540",
        type: "Active (33 y/o F)",
        medicalHx: "Iron deficiency Anemia. Allergies: Iron Transfusion.",
        medications: "Birth control.",
        dentalHx: "DC, Tx Plan, Prophy, SRP LL, Frenectomy (LF), Composite restorations (#3O, #2O, #14OL, #19OF, #31O, #15L, #18O, #17O), Orthodontic tx, Recall, DC, Mock up #7, #10, Veneers #7, #10, Recall.",
        txSummaryBU: "Tx Completed by me: None (Pt has not scheduled apt).",
        poeLast: "5/1/2025 | Recall",
        poeNext: "11/1/2025 (OVERDUE) | 6MRC + prophy",
        txPlan: "None. Patient is in recall phase.",
        lastVisit: "5/30/2025 | ortho adjustment | Previous Student",
        nextVisit: "6MRC + prophy. Next Recall Due: 11/01/2025 (OVERDUE).",
        lastFMX: "3/1/2022 (BW DUE DURING NEXT RECALL VISIT)", lastBW: "8/8/2024", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Precautions: Allergy to Iron Transfusion. PT WAS ASSIGNED TO SULEMAN FOR RECALL NOV. 2025. CALL PATIENT AND/OR SENT HTC LETTER. Earliest apt requested for recall - no response - never seen pt.",
        reliability: "red", lastUpdated: null,
        allergies: 'Iron Transfusion',
        txCompletedByMe: 'None (Pt has not scheduled apt).',
        recallHistory: 'Last Recall: 05/01/2025. Frequency: 6-month. Next due: 11/01/2025 (OVERDUE).',
        activeStatus: 'Active'
    },
    "pt_2225586": {
        id: "pt_2225586", name: "Lopes, Alirio", chartNumber: "2225586",
        type: "Active (94 y/o M)",
        medicalHx: "Pacemaker, high cholesterol, diabetes, Parkinsons disease, COPD. Precautions: Pacemaker (verify precautions for ultrasonic, electrosurg). COPD (avoid fully supine position).",
        medications: "Aspirin, Vit D3, Atorvastatin, Finasteride, Tamsulosin, Metformin, Amantadine, Carbidopa-Levodopa, Trelegy Ellipta. Allergies: Nuts.",
        dentalHx: "OS extractions, interim upper and lower complete denture, denture adjustment.",
        txSummaryBU: "Tx Completed by me: Upper denture Reline (Hard reline on 8/15/2024).",
        poeLast: "N/A Overdue",
        poeNext: "Recall pending scheduling",
        txPlan: "Recall, Upper interim denture reline.",
        lastVisit: "8/15/2024 | Hard reline | Suleman",
        nextVisit: "Upper interim denture reline, recall (pending scheduling).",
        lastFMX: "Not Due", lastBW: "Not Due", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Precautions: Pacemaker (verify precautions for ultrasonic, electrosurg). COPD (avoid fully supine position). Per 8/15/2024 note, no definitive dentures are planned. Pt will come in as needed for relines/adjustments. Pt only uses denture for esthetics. Case evaluated by Dr. Escobar and Dr. Suzuki; patient and daughter agreed to no definitive denture process. Assigned to Suleman for recall, OCS, and potential denture adjustments. Pt was scheduled for reline 10/7/2025 but cancelled and did not follow up. Remove pt HTC.",
        reliability: "red", lastUpdated: null,
        allergies: 'Nuts',
        txCompletedByMe: 'Upper denture Reline (Hard reline on 8/15/2024).',
        recallHistory: 'Last Recall: N/A Overdue.',
        activeStatus: 'Active'
    },
    "pt_23042563": {
        id: "pt_23042563", name: "Mohamed, Karim", chartNumber: "23042563",
        type: "Active (37 y/o M)",
        medicalHx: "Healthy.",
        medications: "None.",
        dentalHx: "Carries control #4, #5; RCT #5; crowns #4, #5, #19; composite #30 DOF, #10 palatal pit, #2 MO, #3 MO, #13 MOD, #14 MO, #15 OL; #20 implant planning and surgical placement.",
        txSummaryBU: "Tx Completed by me: None (pt has not rescheduled apt).",
        poeLast: "8/1/2024 | Last prophy",
        poeNext: "12/1/2024 (OVERDUE) | Recall/prophy",
        txPlan: "Recall/prophy (OVERDUE). Composite 2 surface posterior #14. Premolar RCT #4. Crown lengthening #5.",
        lastVisit: "1/17/2025 | custom abutment zirconia screw retained try in; screw retained implant crown cemented (#20). #5 delivered on 1/9/2025.",
        nextVisit: "need to find out and update here (OVERDUE)",
        lastFMX: "8/1/2024 (DUE)", lastBW: "8/1/2024 (DUE)", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Suleman made phone call attempt on 8/20/2025 (no answer). Front desk made attempt 8/18/2025 (no answer). Earliest apt requested for recall - no response - never seen pt.",
        reliability: "red", lastUpdated: null,
        allergies: 'No known allergies',
        txCompletedByMe: 'None (pt has not rescheduled apt)',
        recallHistory: 'Last Recall: 8/01/2024. Frequency: 4MRC. Next due: 12/01/2024 (OVERDUE).',
        activeStatus: 'Active'
    },
    "pt_23048578": {
        id: "pt_23048578", name: "Penn, Aubrey", chartNumber: "23048578",
        type: "Active (30 y/o F)",
        medicalHx: "Type II diabetes, hypertension.",
        medications: "Lisinopril, metformin.",
        dentalHx: "Type I DC, prophy, #20MOD, #12DO, #15O, #19O, #30O, recall.",
        txSummaryBU: "Tx Completed by me: None.",
        poeLast: "9/16/2024 | Last Recall",
        poeNext: "Now (OVERDUE +1yr) | 6MRC + prophy",
        txPlan: "Recall. (Needs 3rd molars extracted, but is seeking private practice oral surgeon).",
        lastVisit: "9/16/2024 | Recall | Previous Student",
        nextVisit: "6MRC + prophy. Next Recall Due: Now (OVERDUE +1yr).",
        lastFMX: "12/2023 (FMX/BW DUE)", lastBW: "12/2023 (FMX/BW DUE)", lastCBCT: "need to find out and update here", lastPANO: "need to find out and update here",
        notes: "Precautions: Controlled Hypertension and Type II Diabetes. Patient assigned for recalls only. Patient is hard-to-contact. Suleman attempted call 9/25/2025 (no response). Will call again re: intent to return / OS status (can offer OS consult). Earliest apt requested for recall - no response - never seen pt.",
        reliability: "red", lastUpdated: null,
        allergies: 'None mentioned',
        txCompletedByMe: 'None',
        recallHistory: 'Last Recall: 9/16/2024. Next due: Now (OVERDUE +1yr).',
        activeStatus: 'Active'
    },
    "pt_karima": {
        id: "pt_karima", name: "Karima M.", chartNumber: "",
        type: "do this",
        medicalHx: "", medications: "", dentalHx: "", txSummaryBU: "",
        poeLast: "", poeNext: "", txPlan: "",
        lastVisit: "", nextVisit: "",
        lastFMX: "", lastBW: "", lastCBCT: "", lastPANO: "",
        notes: "Needs full charting and data entry.",
        reliability: "yellow", lastUpdated: null,
        allergies: '',
        txCompletedByMe: '',
        recallHistory: '',
        activeStatus: 'Active'
    }
};


// ==================== SECTION 2: CORE RENDERING FUNCTIONS ====================

let activePatientId = null;
var patientEditMode = false;
var patientViewTab = 'brief'; // 'brief' or 'record'
var collapsedSections = {};
var inactiveCollapsed = true; // Red/inactive patients collapsed by default

function initPatientsTab() {
    // Initialize default records if empty
    getPatientRecords();
    try { renderDashboardMetrics(); } catch (e) { console.error('[Patients] renderDashboardMetrics error:', e); }
    try { renderCountdownRadar(); } catch (e) { console.error('[Patients] renderCountdownRadar error:', e); }
    renderPatientsSidebar();
    // Select first patient if none active
    if (!activePatientId) {
        const records = getPatientRecords();
        const ids = Object.keys(records);
        // Select first green, then yellow, then any
        const firstGreen = ids.find(id => records[id].reliability === 'green');
        const firstId = firstGreen || ids[0];
        if (firstId) selectPatient(firstId);
    } else {
        renderPatientRecord(activePatientId);
    }
}

// Bridge function for static HTML search input
function filterPatientsSidebar() {
    var staticInput = document.getElementById('ptSidebarSearch');
    var searchTerm = staticInput ? staticInput.value : '';
    // Store search term for renderPatientsSidebar to pick up
    var sidebar = document.getElementById('patientsSidebar');
    if (sidebar) sidebar.dataset.searchTerm = searchTerm;
    renderPatientsSidebar();
}

function getPatientRecords() {
    if (!roadmapData.clinicalData) roadmapData.clinicalData = {};
    // Guard: don't initialize defaults until real data has loaded from cloud
    // This prevents wiping imported data with defaults during the load race
    if (!roadmapData._dataLoaded) {
        return roadmapData.clinicalData.patientRecords || {};
    }
    if (!roadmapData.clinicalData.patientRecords || Object.keys(roadmapData.clinicalData.patientRecords).length === 0) {
        roadmapData.clinicalData.patientRecords = JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORDS));
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
    } else {
        // Merge: fill in any missing default patients without overwriting existing ones
        var defaults = DEFAULT_PATIENT_RECORDS;
        var existing = roadmapData.clinicalData.patientRecords;
        var added = false;
        Object.keys(defaults).forEach(function(id) {
            if (!existing[id]) {
                existing[id] = JSON.parse(JSON.stringify(defaults[id]));
                added = true;
            }
        });
        if (added) {
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            saveData();
        }
    }
    return roadmapData.clinicalData.patientRecords;
}

function renderPatientsSidebar() {
    var container = document.getElementById('patientsSidebar');
    if (!container) return;

    var records = getPatientRecords();
    // Read search from JS-rendered input, static HTML input, or dataset fallback
    var existingSearch = container.querySelector('.pt-sidebar-search');
    var staticSearch = document.getElementById('ptSidebarSearch');
    var searchTerm = (existingSearch ? existingSearch.value : (staticSearch ? staticSearch.value : (container.dataset.searchTerm || ''))).toLowerCase();

    // Build filtered items
    var allItems = [];
    Object.keys(records).forEach(function(id) {
        var p = records[id];
        if (!p) return;
        var name = p.name || 'Unnamed';
        if (searchTerm && !name.toLowerCase().includes(searchTerm) && !(p.chartNumber || '').toLowerCase().includes(searchTerm) && !(p.type || '').toLowerCase().includes(searchTerm)) return;
        allItems.push({ id: id, patient: p });
    });

    // Sort into 3 groups by reliability
    var greenItems = [], yellowItems = [], redItems = [];
    allItems.forEach(function(item) {
        var r = item.patient.reliability || 'yellow';
        if (r === 'green') greenItems.push(item);
        else if (r === 'red') redItems.push(item);
        else yellowItems.push(item);
    });
    // Alpha sort within each group
    var sortFn = function(a, b) { return (a.patient.name || '').localeCompare(b.patient.name || ''); };
    greenItems.sort(sortFn);
    yellowItems.sort(sortFn);
    redItems.sort(sortFn);

    // Build a single patient row — all user text is escaped via escapeHtml()
    function patientRow(item) {
        var p = item.patient;
        var isActive = item.id === activePatientId;
        var dotColors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
        var dotColor = dotColors[p.reliability] || '#6b7280';
        var chart = p.chartNumber ? '#' + escapeHtml(p.chartNumber) : '';
        var safeId = escapeHtml(item.id).replace(/'/g, "\\'");

        return '<div class="pts-sidebar-row' + (isActive ? ' active' : '') + '" onclick="selectPatient(\'' + safeId + '\')" '
            + 'data-patient-id="' + escapeHtml(item.id) + '">'
            + '<span class="pts-dot" style="background:' + dotColor + ';"></span>'
            + '<div class="pts-row-info">'
            +   '<span class="pts-row-name">' + escapeHtml(p.name || 'Unnamed') + '</span>'
            +   (chart ? '<span class="pts-row-chart">' + chart + '</span>' : '')
            +   (p.clinicalBrief && p.clinicalBrief.snapshot ? '<span class="pts-brief-badge" title="Has clinical brief">\uD83D\uDCCB</span>' : '')
            + '</div>'
            + '</div>';
    }

    // Build section with header
    function sectionBlock(label, color, items, collapsible) {
        if (items.length === 0) return '';
        var isCollapsed = collapsible && inactiveCollapsed;
        var toggleJs = collapsible ? ' onclick="inactiveCollapsed=!inactiveCollapsed; renderPatientsSidebar()"' : '';

        var html = '<div class="pts-section-header"' + toggleJs + '>'
            + (collapsible ? '<span class="pts-section-arrow">' + (isCollapsed ? '\u25B6' : '\u25BC') + '</span>' : '')
            + '<span style="color:' + color + ';">' + escapeHtml(label) + '</span>'
            + '<span class="pts-section-count">' + items.length + '</span>'
            + '</div>';
        if (!isCollapsed) {
            items.forEach(function(item) { html += patientRow(item); });
        }
        return html;
    }

    // Build list with grouped sections
    var listHtml = '';
    listHtml += sectionBlock('ACTIVE', '#1a7f79', greenItems, false);
    listHtml += sectionBlock('NEEDS ATTENTION', '#c86b4b', yellowItems, false);
    listHtml += sectionBlock('INACTIVE', '#94a3af', redItems, true);

    if (allItems.length === 0 && searchTerm) {
        listHtml = '<div style="padding:20px; text-align:center; color:#64748b; font-size:0.8em;">No patients match search</div>';
    } else if (allItems.length === 0) {
        listHtml = '<div style="padding:20px; text-align:center; color:#64748b; font-size:0.8em;">No patients yet</div>';
    }

    // Render sidebar — escapeHtml() used on all user-provided values above
    container.innerHTML = '<div class="pts-sidebar-controls">'
        +   '<input type="text" class="pt-sidebar-search" placeholder="Search patients..." '
        +     'value="' + escapeHtml(searchTerm) + '" oninput="renderPatientsSidebar()" '
        +     'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">'
        +   '<div class="pts-sidebar-btns">'
        +     '<button onclick="openPatientImportModal()" class="pts-btn-import">Import</button>'
        +     '<button onclick="addNewPatientRecord()" class="pts-btn-add">+ New</button>'
        +   '</div>'
        + '</div>'
        + '<div class="pts-sidebar-list">' + listHtml + '</div>';

    // Restore cursor focus to search if user was typing
    if (searchTerm) {
        var newInput = container.querySelector('.pt-sidebar-search');
        if (newInput) {
            newInput.focus();
            newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
    }
}

function selectPatient(patientId) {
    activePatientId = patientId;
    patientEditMode = false;
    renderPatientsSidebar();
    renderPatientRecord(patientId);
    // On mobile: show record view, hide sidebar
    var layout = document.getElementById('patientsMainLayout');
    if (layout && window.innerWidth <= 768) {
        layout.classList.add('pts-mobile-record-active');
    }
}

function showMobilePatientList() {
    var layout = document.getElementById('patientsMainLayout');
    if (layout) layout.classList.remove('pts-mobile-record-active');
}

function renderClinicalBrief(patient, patientId) {
    var brief = patient.clinicalBrief;
    if (!brief) {
        return '<div class="ptr-brief-empty">'
            + '<div style="text-align:center; padding:30px 20px; color:#64748b;">'
            + '<div style="font-size:1.3em; margin-bottom:8px;">No Clinical Brief</div>'
            + '<div style="font-size:0.85em;">Re-export this patient from Claude to generate a brief.</div>'
            + '</div></div>';
    }

    var isMobile = window.innerWidth <= 768;
    var safePatientId = escapeHtml(patientId).replace(/'/g, "\\'");

    function briefSection(key, title, icon, alwaysOpen) {
        var val = brief[key];
        if (!val) return '';
        var rendered = escapeHtml(val);
        if (key === 'flaggedConcerns') {
            rendered = rendered.replace(/\((\d+)\)\s*/g, function(match, num, offset) {
                return (offset > 0 ? '</li>' : '') + '<li>';
            });
            if (rendered.indexOf('<li>') !== -1) {
                rendered = '<ol class="ptr-brief-ol">' + rendered + '</li></ol>';
            }
        }
        rendered = rendered.replace(/\n/g, '<br>');

        var sectionId = 'brief_' + key;
        var isCollapsed = !alwaysOpen && isMobile && collapsedSections[sectionId];
        var toggleJs = !alwaysOpen && isMobile
            ? ' onclick="collapsedSections[\'' + sectionId + '\']=!collapsedSections[\'' + sectionId + '\']; renderPatientRecord(\'' + safePatientId + '\')"'
            : '';

        return '<div class="ptr-brief-section">'
            + '<div class="ptr-brief-section-header"' + toggleJs + '>'
            +   '<span class="ptr-brief-icon">' + icon + '</span>'
            +   '<span class="ptr-brief-title">' + escapeHtml(title) + '</span>'
            +   (!alwaysOpen && isMobile ? '<span class="ptr-brief-arrow">' + (isCollapsed ? '\u25B6' : '\u25BC') + '</span>' : '')
            + '</div>'
            + '<div class="ptr-brief-body"' + (isCollapsed ? ' style="display:none;"' : '') + '>' + rendered + '</div>'
            + '</div>';
    }

    var dateStr = brief.dateGenerated ? 'Updated: ' + escapeHtml(brief.dateGenerated) : '';
    var historyCount = Array.isArray(patient.briefHistory) ? patient.briefHistory.length : 0;

    return '<div class="ptr-brief-container">'
        + briefSection('snapshot', 'Snapshot', '\uD83D\uDCCB', true)
        + briefSection('diagnosesAndRisks', 'Key Diagnoses & Risks', '\uD83D\uDD2C', false)
        + briefSection('txStatus', 'Treatment Status', '\uD83D\uDCCA', false)
        + briefSection('txSequencing', 'Treatment Sequencing', '\uD83D\uDCD0', false)
        + briefSection('flaggedConcerns', 'Flagged Concerns', '\u26A0\uFE0F', false)
        + briefSection('gradValue', 'Graduation Value', '\uD83C\uDFAF', false)
        + briefSection('nextVisitPlan', 'Next Visit Plan', '\uD83D\uDCCB', false)
        + '<div class="ptr-brief-footer">'
        +   '<span>' + dateStr + '</span>'
        +   (historyCount > 0 ? '<span class="ptr-brief-history-count">' + historyCount + ' prior version' + (historyCount > 1 ? 's' : '') + '</span>' : '')
        + '</div>'
        + '</div>';
}

function renderPatientRecord(patientId) {
    var container = document.getElementById('patientRecordView');
    if (!container) return;

    var records = getPatientRecords();
    var patient = records[patientId];
    if (!patient) {
        container.innerHTML = '<div class="pts-empty-state"><p>Select a patient from the list</p></div>';
        return;
    }

    var matches = computeRequirementMatches(patient);
    var isEdit = patientEditMode;
    var safePatientId = escapeHtml(patientId).replace(/'/g, "\\'");

    // Helper: render a field — uses CSS classes instead of inline styles for cleaner layout
    function fld(fieldName, label, accentColor) {
        var val = patient[fieldName] || '';
        if (isEdit) {
            return '<div class="ptr-field">'
                + '<div class="ptr-field-label" style="color:' + accentColor + ';">' + escapeHtml(label) + '</div>'
                + '<div contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="' + escapeHtml(fieldName) + '" onblur="savePatientField(this)" '
                + 'class="ptr-field-edit" style="border-left-color:' + accentColor + ';">'
                + escapeHtml(val)
                + '</div></div>';
        } else {
            if (!val) return '';
            return '<div class="ptr-field-view" style="border-left-color:' + accentColor + '40;">'
                + '<span class="ptr-field-label" style="color:' + accentColor + ';">' + escapeHtml(label) + '</span>'
                + '<div class="ptr-field-text">' + escapeHtml(val) + '</div>'
                + '</div>';
        }
    }

    // Collapsible section
    function section(id, title, icon, content) {
        if (!content || content.trim() === '') return '';
        var isCollapsed = collapsedSections[id] || false;
        return '<div class="ptr-section">'
            + '<div class="ptr-section-header" onclick="collapsedSections[\'' + escapeHtml(id) + '\']=!collapsedSections[\'' + escapeHtml(id) + '\']; renderPatientRecord(\'' + safePatientId + '\')">'
            +   '<span class="ptr-section-arrow">' + (isCollapsed ? '\u25B6' : '\u25BC') + '</span>'
            +   '<span class="ptr-section-icon">' + icon + '</span>'
            +   '<span class="ptr-section-title">' + escapeHtml(title) + '</span>'
            + '</div>'
            + '<div style="display:' + (isCollapsed ? 'none' : 'block') + ';">' + content + '</div>'
            + '</div>';
    }

    // Imaging — compact chips (read) or grid (edit). All text escaped via escapeHtml().
    function imgInline() {
        var fields = [
            { f: 'lastFMX', l: 'FMX' }, { f: 'lastBW', l: 'BW' },
            { f: 'lastCBCT', l: 'CBCT' }, { f: 'lastPANO', l: 'PANO' }
        ];
        if (isEdit) {
            var html = '<div class="ptr-imaging-grid">';
            fields.forEach(function(x) {
                var val = patient[x.f] || '';
                var warn = val.toLowerCase().indexOf('due') !== -1 || val.toLowerCase().indexOf('need') !== -1 || val.toLowerCase().indexOf('overdue') !== -1;
                html += '<div class="ptr-imaging-cell">'
                    + '<div class="ptr-imaging-label">' + escapeHtml(x.l) + '</div>'
                    + '<div contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="' + escapeHtml(x.f) + '" onblur="savePatientField(this)" '
                    + 'class="ptr-imaging-edit" style="color:' + (warn ? '#b45309' : '#17212b') + ';">'
                    + escapeHtml(val) + '</div></div>';
            });
            return html + '</div>';
        }
        // Read mode: compact chips
        var html = '<div class="ptr-imaging-chips">';
        fields.forEach(function(x) {
            var val = patient[x.f] || '';
            var displayVal = val || '\u2014';
            html += '<div class="ptr-imaging-chip">'
                + '<span class="ptr-imaging-chip-label">' + escapeHtml(x.l) + '</span>'
                + '<span class="ptr-imaging-chip-value">' + escapeHtml(displayVal) + '</span>'
                + '</div>';
        });
        return html + '</div>';
    }

    // Requirements summary
    var reqHtml = '';
    if (matches.length > 0) {
        var isHV = patient.highValue || matches.length >= 3;
        var grouped = {};
        matches.forEach(function(m) { if (!grouped[m.category]) grouped[m.category] = []; grouped[m.category].push(m); });
        var expandId = 'reqExpand_' + patientId.replace(/[^a-zA-Z0-9]/g, '');

        reqHtml = '<div class="ptr-req-banner">'
            + (isHV ? '<div class="ptr-hv-badge">HIGH VALUE &middot; ' + matches.length + ' requirements</div>' : '')
            + '<div class="ptr-req-toggle" onclick="var d=document.getElementById(\'' + expandId + '\');d.style.display=d.style.display===\'none\'?\'block\':\'none\'">'
            +   '<span>Can fulfill ' + matches.length + ' requirements</span>'
            +   '<span class="ptr-req-arrow">&#9660;</span>'
            + '</div>'
            + '<div id="' + expandId + '" style="display:none; padding:4px 0;">';
        Object.keys(grouped).forEach(function(cat) {
            reqHtml += '<div class="ptr-req-row"><span style="color:' + grouped[cat][0].categoryColor + ';">' + escapeHtml(cat) + ':</span> ';
            reqHtml += '<span>' + grouped[cat].map(function(m) { return escapeHtml(m.reqLabel); }).join(', ') + '</span></div>';
        });
        reqHtml += '</div></div>';
    }

    // Reliability dots
    var relColors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
    var relLabels = { green: 'Active', yellow: 'Attention', red: 'Inactive' };
    var currentRel = patient.reliability || 'yellow';
    var relHtml = '<div class="ptr-rel-dots">';
    ['green', 'yellow', 'red'].forEach(function(r) {
        var isSel = r === currentRel;
        relHtml += '<span class="ptr-rel-dot' + (isSel ? ' selected' : '') + '" style="background:' + relColors[r] + ';" '
            + 'onclick="setPatientReliability(\'' + safePatientId + '\', \'' + r + '\')" '
            + 'title="' + relLabels[r] + '"></span>';
    });
    relHtml += '<span class="ptr-rel-label" style="color:' + relColors[currentRel] + ';">' + relLabels[currentRel] + '</span>';
    relHtml += '</div>';

    // Mobile back button (hidden on desktop via CSS)
    var backBtn = '<button class="ptr-back-btn" onclick="showMobilePatientList()">&larr; All Patients</button>';

    // Edit mode toggle
    var editBtnHtml = '<button class="ptr-edit-btn' + (isEdit ? ' active' : '') + '" '
        + 'onclick="document.querySelectorAll(\'[contenteditable=true]\').forEach(function(el){el.blur()}); patientEditMode=!patientEditMode; renderPatientRecord(\'' + safePatientId + '\')">'
        + (isEdit ? 'Done' : 'Edit') + '</button>';

    // Summary card (light theme) — all user text escaped via escapeHtml()
    var relBadgeClass = { green: 'ptr-summary-badge-active', yellow: 'ptr-summary-badge-yellow', red: 'ptr-summary-badge-red' };
    var relBadgeText = { green: 'Active', yellow: 'Needs Attention', red: 'Inactive' };
    var lastVisitShort = patient.lastVisit ? patient.lastVisit.split('|')[0].trim() : 'None';
    var nextVisitShort = patient.nextVisit ? patient.nextVisit.split('\u2014')[0].trim() : 'None scheduled';
    var nextPoeShort = patient.poeNext ? patient.poeNext.split('\u2014')[0].trim() : '\u2014';
    var needsScheduling = !patient.nextVisit || patient.nextVisit.toLowerCase().indexOf('need') !== -1;

    // Dedup requirement categories for badges
    var reqCategories = {};
    matches.forEach(function(m) { reqCategories[m.category] = true; });

    var summaryCard = '<div class="ptr-summary-card">'
        + '<div class="ptr-summary-left">'
        +   '<div class="ptr-summary-name">' + escapeHtml(patient.name || 'Unnamed') + '</div>'
        +   '<div class="ptr-summary-meta">'
        +     '<span>#' + escapeHtml(patient.chartNumber || 'N/A') + '</span>'
        +     (patient.type ? '<span>\u00b7</span><span>' + escapeHtml(patient.type) + '</span>' : '')
        +   '</div>'
        +   '<div class="ptr-summary-badges">'
        +     '<span class="ptr-summary-badge ' + (relBadgeClass[currentRel] || 'ptr-summary-badge-yellow') + '">' + escapeHtml(relBadgeText[currentRel] || 'Attention') + '</span>'
        +     (patient.highValue || matches.length >= 3 ? '<span class="ptr-summary-badge ptr-summary-badge-hv">HIGH VALUE</span>' : '')
        +   '</div>'
        +   (Object.keys(reqCategories).length > 0 ? '<div class="ptr-summary-req-badges">' + Object.keys(reqCategories).map(function(cat) { return '<span class="ptr-summary-req-badge">' + escapeHtml(cat) + '</span>'; }).join('') + '</div>' : '')
        + '</div>'
        + '<div class="ptr-summary-right">'
        +   '<div class="ptr-summary-kv"><div class="ptr-summary-kv-label">Last Visit</div><div class="ptr-summary-kv-value">' + escapeHtml(lastVisitShort) + '</div></div>'
        +   '<div class="ptr-summary-kv"><div class="ptr-summary-kv-label">Next Visit</div><div class="ptr-summary-kv-value"' + (needsScheduling ? ' style="color:#b45309;"' : '') + '>' + escapeHtml(nextVisitShort) + '</div></div>'
        +   '<div class="ptr-summary-kv"><div class="ptr-summary-kv-label">Next POE</div><div class="ptr-summary-kv-value">' + escapeHtml(nextPoeShort) + '</div></div>'
        + '</div>'
        + '</div>';

    // Priority notes card (repositioned to top, after summary) — escaped via escapeHtml()
    var priorityHtml = '';
    if (patient.priorityNotes) {
        priorityHtml = '<div class="ptr-priority-card">'
            + '<span class="ptr-field-label" style="color:#92400e;">Priority Notes</span>'
            + '<div class="ptr-field-text" style="color:#78350f; font-weight:500;">' + escapeHtml(patient.priorityNotes) + '</div>'
            + '</div>';
    }

    // Tab buttons (Brief / Record)
    var hasBrief = !!(patient.clinicalBrief && patient.clinicalBrief.snapshot);
    var effectiveTab = hasBrief ? patientViewTab : 'record';
    var tabHtml = '<div class="ptr-tabs">'
        + '<button class="ptr-tab' + (effectiveTab === 'brief' ? ' active' : '') + (hasBrief ? '' : ' disabled') + '" '
        +   'onclick="patientViewTab=\'brief\'; renderPatientRecord(\'' + safePatientId + '\')"'
        +   (hasBrief ? '' : ' disabled') + '>'
        +   'Clinical Brief' + (hasBrief ? '' : ' (none)')
        + '</button>'
        + '<button class="ptr-tab' + (effectiveTab === 'record' ? ' active' : '') + '" '
        +   'onclick="patientViewTab=\'record\'; renderPatientRecord(\'' + safePatientId + '\')">Record</button>'
        + '</div>';

    var contentHtml = '';
    if (effectiveTab === 'brief') {
        contentHtml = renderClinicalBrief(patient, patientId);
    } else {
        contentHtml = ''
            + section('info', 'Patient Information', '\uD83C\uDFE5',
                fld('medicalHx', 'Medical History', '#ef4444')
                + fld('medications', 'Medications & Allergies', '#f87171'))
            + section('clinical', 'Clinical History', '\uD83E\uDDB7',
                fld('dentalHx', 'Dental History', '#10b981')
                + fld('txSummaryBU', 'Treatment at BU', '#34d399'))
            + section('perio', 'Periodontal & Recall', '\u26A0\uFE0F',
                isEdit
                    ? fld('poeLast', 'Last POE / Prophy', '#f59e0b') + fld('poeNext', 'Next POE / Prophy', '#fbbf24')
                    : '<div class="ptr-perio-row">'
                      + '<div class="ptr-perio-item"><div class="ptr-perio-label">Last POE / Prophy</div><div class="ptr-perio-value">' + escapeHtml(patient.poeLast || '\u2014') + '</div></div>'
                      + '<div class="ptr-perio-item"><div class="ptr-perio-label">Next POE / Prophy</div><div class="ptr-perio-value">' + escapeHtml(patient.poeNext || '\u2014') + '</div></div>'
                      + '</div>')
            + section('treatment', 'Treatment Plan & Visits', '\uD83D\uDCCB',
                fld('txPlan', 'Treatment Plan', '#3b82f6')
                + fld('lastVisit', 'Last Visit', '#60a5fa')
                + fld('nextVisit', 'Next Visit', '#93c5fd'))
            + section('imaging', 'Imaging', '\uD83D\uDCF7', imgInline())
            + section('notes', 'Notes', '\uD83D\uDCDD',
                isEdit
                    ? '<div contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="notes" onblur="savePatientField(this)" '
                      + 'class="ptr-field-edit ptr-notes-edit" style="border-left-color:#a855f7;">'
                      + escapeHtml(patient.notes || '') + '</div>'
                    : '<div class="ptr-field-view ptr-notes-view" style="border-left-color:#a855f740;">' + escapeHtml(patient.notes || '') + '</div>');
    }

    // Build the record — all user text is escaped via escapeHtml()
    container.innerHTML = ''
        + backBtn
        + summaryCard
        + priorityHtml
        + '<div class="ptr-header">'
        +   '<div class="ptr-header-left">'
        +     '<div class="ptr-meta">' + relHtml + '</div>'
        +   '</div>'
        +   '<div class="ptr-actions">'
        +     editBtnHtml
        +     '<button class="ptr-action-btn" onclick="navigator.clipboard.writeText(\'' + escapeHtml(patient.chartNumber || '') + '\');showToast(\'Copied\')" title="Copy chart #">Copy #</button>'
        +     '<button class="ptr-action-btn danger" onclick="deletePatientRecord(\'' + safePatientId + '\')" title="Delete patient">Del</button>'
        +   '</div>'
        + '</div>'
        + tabHtml
        + reqHtml
        + contentHtml;
}


// ==================== SECTION 3: PATIENT CRUD ====================

function addNewPatientRecord() {
    var chartInput = prompt('Enter chart number (or leave blank):');
    if (chartInput === null) return; // cancelled
    var nameInput = prompt('Enter patient name (Last, First):');
    if (nameInput === null) return; // cancelled

    var chartNumber = (chartInput || '').trim();
    var name = (nameInput || '').trim() || 'New Patient';
    var id = chartNumber ? 'pt_' + chartNumber : generateId('pt');

    var records = getPatientRecords();
    if (records[id]) {
        showToast('Patient with that chart number already exists', 'warning');
        selectPatient(id);
        return;
    }

    records[id] = {
        id: id,
        name: name,
        chartNumber: chartNumber,
        type: '',
        medicalHx: '',
        medications: '',
        dentalHx: '',
        txSummaryBU: '',
        poeLast: '',
        poeNext: '',
        txPlan: '',
        lastVisit: '',
        nextVisit: '',
        lastFMX: '',
        lastBW: '',
        lastCBCT: '',
        lastPANO: '',
        notes: '',
        reliability: 'yellow',
        lastUpdated: new Date().toISOString()
    };

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    selectPatient(id);
    showToast('Patient added: ' + name);
}

function deletePatientRecord(id) {
    var records = getPatientRecords();
    var patient = records[id];
    if (!patient) return;

    showCustomConfirm(
        'Delete patient record for "' + (patient.name || id) + '"?\n\nThis cannot be undone.',
        function() {
            delete roadmapData.clinicalData.patientRecords[id];
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            saveData();

            // If we just deleted the active patient, select the first remaining one
            if (activePatientId === id) {
                activePatientId = null;
                var remaining = Object.keys(getPatientRecords());
                if (remaining.length > 0) {
                    selectPatient(remaining[0]);
                } else {
                    renderPatientsSidebar();
                    var view = document.getElementById('patientRecordView');
                    if (view) view.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">No patients. Click "+ Add Patient" to get started.</div>';
                }
            } else {
                renderPatientsSidebar();
            }
            showToast('Patient deleted');
        }
    );
}

var _suppressBlurSave = false; // Guard against stale blur during import re-render

function savePatientField(element) {
    if (_suppressBlurSave) return; // Skip saves triggered by DOM replacement during import
    var patientId = element.getAttribute('data-patient-id');
    var field = element.getAttribute('data-field');
    if (!patientId || !field) return;

    var records = getPatientRecords();
    if (!records[patientId]) return;

    records[patientId][field] = element.innerText;
    records[patientId].lastUpdated = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}

function setPatientReliability(patientId, reliability) {
    var records = getPatientRecords();
    if (!records[patientId]) return;
    records[patientId].reliability = reliability;
    records[patientId].lastUpdated = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderPatientRecord(patientId);
    renderPatientsSidebar();
}


// ==================== SECTION 4: REQUIREMENTS MATCHING ====================

const REQUIREMENT_KEYWORDS = [
    { patterns: ['crown', 'prep', 'cementation', 'provisional', 'FPD', 'bridge', 'CEREC'], category: 'fixed', color: '#3b82f6', reqs: ['fixed-form-prov','fixed-form-prep','fixed-form-impr','fixed-form-cement','fixed-sum-prep','fixed-sum-temp','fixed-sum-impr','fixed-sum-cement'] },
    { patterns: ['class v', 'class 5', 'cl 5', 'cl5'], category: 'operative', color: '#10b981', reqs: ['op-class5-1','op-class5-2'] },
    { patterns: ['composite', 'restoration', 'DO ', 'MO ', 'MOD', 'OL ', 'OF '], category: 'operative', color: '#10b981', reqs: ['op-multi-5','op-multi-6'] },
    { patterns: ['SRP', 'scaling', 'root planing', 'calculus removal'], category: 'srp', color: '#ef4444', reqs: ['srp-calc-1','srp-calc-2','srp-calc-3'] },
    { patterns: ['prophy'], category: 'perio', color: '#f472b6', reqs: ['perio-sum-prophy','perio-form-recall'] },
    { patterns: ['re-eval', 'reevaluate', 'gingivitis re'], category: 'perio', color: '#f472b6', reqs: ['perio-form-reeval-ging','perio-sum-reeval-ging','perio-3rd-reeval'] },
    { patterns: ['perio chart', 'full charting', 'diagnosis & treatment plan', 'perio dx'], category: 'perio', color: '#f472b6', reqs: ['perio-sum-dx'] },
    { patterns: ['recall'], category: 'perio', color: '#f472b6', reqs: ['perio-form-recall','perio-sum-recall'] },
    { patterns: ['denture', 'CU/CL', 'interim cu', 'interim cl', 'complete upper', 'complete lower'], category: 'dentures', color: '#8b5cf6', reqs: ['cd-form-prelim','cd-form-final','cd-form-records','cd-form-postdam','cd-form-trial','cd-form-insert','cd-form-adjust','cd-sum-prelim','cd-sum-final','cd-sum-records','cd-sum-postdam','cd-sum-trial','cd-sum-insert','cd-sum-adjust'] },
    { patterns: ['RPD', 'partial denture', 'removable partial'], category: 'rpd', color: '#f59e0b', reqs: ['rpd-track1','rpd-track2','rpd-track3'] },
    { patterns: ['RCT', 'root canal', 'endodontic', 'pulpectomy'], category: 'endo', color: '#06b6d4', reqs: ['endo-rct-1','endo-rct-2'] },
    { patterns: ['extraction', 'ext #', 'full mouth extraction'], category: 'oralsurg', color: '#ec4899', reqs: ['os-extract-1','os-extract-2'] },
    { patterns: ['OHRA'], category: 'txplanning', color: '#6366f1', reqs: ['tx-ohra-1'] },
    { patterns: ['written analysis', ' WA ', 'WA)'], category: 'grouppractice', color: '#0ea5e9', reqs: ['gp-form-analysis','gp-sum-analysis'] },
    { patterns: ['implant crown', 'implant supported'], category: 'fixed', color: '#3b82f6', reqs: ['fixed-form-prov','fixed-form-prep'] },
    { patterns: ['overdenture', 'retention ring'], category: 'dentures', color: '#8b5cf6', reqs: ['cd-over-dup','cd-over-abut'] }
];

function computeRequirementMatches(patient) {
    if (!patient) return [];

    var matches = [];
    var seenReqs = {};

    // Use imported requirements from Claude analysis if available (authoritative)
    if (patient.importedRequirements && patient.importedRequirements.length > 0) {
        patient.importedRequirements.forEach(function(ir) {
            if (seenReqs[ir.reqId]) return;
            if (isRequirementOutstanding(ir.reqId)) {
                seenReqs[ir.reqId] = true;
                var reqInfo = getRequirementInfo(ir.reqId);
                // Determine category from reqId prefix
                var catKey = ir.reqId.split('-')[0];
                var catColor = '#818cf8';
                REQUIREMENT_KEYWORDS.forEach(function(g) {
                    if (g.reqs.indexOf(ir.reqId) !== -1) { catKey = g.category; catColor = g.color; }
                });
                matches.push({
                    reqId: ir.reqId,
                    reqLabel: reqInfo ? reqInfo.text : (ir.description || ir.reqId),
                    category: catKey.charAt(0).toUpperCase() + catKey.slice(1),
                    categoryColor: catColor,
                    matchedOn: ir.procedure || 'imported'
                });
            }
        });
        return matches;
    }

    // Fallback: keyword-based matching from patient text fields
    var searchText = [
        patient.txPlan || '',
        patient.nextVisit || '',
        patient.txSummaryBU || '',
        patient.dentalHx || ''
    ].join(' ').toLowerCase();

    REQUIREMENT_KEYWORDS.forEach(function(group) {
        var matched = false;
        var matchedPattern = '';

        for (var i = 0; i < group.patterns.length; i++) {
            if (searchText.indexOf(group.patterns[i].toLowerCase()) !== -1) {
                matched = true;
                matchedPattern = group.patterns[i];
                break;
            }
        }

        if (matched) {
            group.reqs.forEach(function(reqId) {
                if (seenReqs[reqId]) return;
                if (isRequirementOutstanding(reqId)) {
                    seenReqs[reqId] = true;
                    var reqInfo = getRequirementInfo(reqId);
                    matches.push({
                        reqId: reqId,
                        reqLabel: reqInfo ? reqInfo.text : reqId,
                        category: group.category,
                        categoryColor: group.color,
                        matchedOn: matchedPattern
                    });
                }
            });
        }
    });

    return matches;
}

function isRequirementOutstanding(reqId) {
    var competencies = getCompetenciesData();
    if (!competencies) return false;

    for (var catKey in competencies) {
        var cat = competencies[catKey];
        if (!cat || !cat.sections) continue;
        var sections = getValues(cat.sections);
        for (var s = 0; s < sections.length; s++) {
            var sec = sections[s];
            if (!sec || !sec.items) continue;
            var items = getValues(sec.items);
            for (var i = 0; i < items.length; i++) {
                if (items[i].id === reqId) {
                    return (items[i].completed || 0) < (items[i].required || 1);
                }
            }
        }
    }
    return false;
}

function getRequirementInfo(reqId) {
    var competencies = getCompetenciesData();
    if (!competencies) return null;

    for (var catKey in competencies) {
        var cat = competencies[catKey];
        if (!cat || !cat.sections) continue;
        var sections = getValues(cat.sections);
        for (var s = 0; s < sections.length; s++) {
            var sec = sections[s];
            if (!sec || !sec.items) continue;
            var items = getValues(sec.items);
            for (var i = 0; i < items.length; i++) {
                if (items[i].id === reqId) {
                    return items[i];
                }
            }
        }
    }
    return null;
}

function renderRequirementBadges(matches) {
    return '';
}


// ==================== SECTION 5: COUNTDOWN RADAR ====================

function renderCountdownRadar() {
    var container = document.getElementById('patientsCountdownRadar');
    if (!container) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var target = new Date(2026, 4, 15);
    var daysRemaining = Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24)));

    var competencies = typeof getCompetenciesData === 'function' ? getCompetenciesData() : null;
    if (!competencies) return;
    var outstandingCount = 0;
    var categoryData = [];
    Object.entries(competencies).forEach(function(entry) {
        var cat = entry[1];
        var stats = calculateCategoryStats(cat);
        var outstanding = stats.totalItems - stats.completed;
        outstandingCount += outstanding;
        categoryData.push({ name: cat.name || entry[0], color: cat.color || '#64748b', completed: stats.completed, total: stats.totalItems });
    });

    var weeksRemaining = Math.max(1, daysRemaining / 7);
    var pace = (outstandingCount / weeksRemaining).toFixed(1);
    var paceNum = parseFloat(pace);

    var daysColor = daysRemaining <= 30 ? '#ef4444' : daysRemaining <= 60 ? '#f59e0b' : '#22c55e';
    var paceColor = paceNum >= 5 ? '#ef4444' : paceNum >= 3 ? '#f59e0b' : '#22c55e';

    // Smart counting — uses aggregated counts from all data sources
    var smartApts = typeof getSmartAppointmentCount === 'function' ? getSmartAppointmentCount() : { total: 0 };
    var smartProcs = typeof getSmartProcedureCount === 'function' ? getSmartProcedureCount() : { total: 0 };
    var aptTarget = roadmapData.clinicHeadlines?.appointments?.target ?? 90;
    var procTarget = roadmapData.clinicHeadlines?.procedures?.target ?? 116;

    // Dashboard snapshot data for notes-at-risk (still from snapshots since it's import-specific)
    var snapshots = getDashboardSnapshots();
    var notesHtml = '';
    if (snapshots.length > 0) {
        var notesRisk = snapshots[0].appointments?.notesAtRisk || 0;
        var nc = notesRisk >= 6 ? '#ef4444' : notesRisk >= 5 ? '#f59e0b' : '#64748b';
        notesHtml = '<div class="pts-stat-chip" title="Unclosed/blank notes (limit: 6)"><span style="color:' + nc + '; font-weight:700;">' + notesRisk + '</span><span style="color:#64748b;"> notes</span></div>';
    }
    var aptsHtml = '<div class="pts-stat-chip" title="Attended appointments toward ' + aptTarget + '"><span style="color:#3b82f6; font-weight:700;">' + smartApts.total + '</span><span style="color:#64748b;">/' + aptTarget + ' apts</span></div>';
    var procsHtml = '<div class="pts-stat-chip" title="Completed procedures toward ' + procTarget + '"><span style="color:#a855f7; font-weight:700;">' + smartProcs.total + '</span><span style="color:#64748b;">/' + procTarget + ' procs</span></div>';

    // Category progress grid — always visible, compact 3 columns
    var gridHtml = '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:3px 10px; margin-top:8px;">';
    categoryData.forEach(function(c) {
        var pct = c.total > 0 ? Math.min(100, Math.round((c.completed / c.total) * 100)) : 0;
        var done = c.completed >= c.total;
        var hasProgress = c.completed > 0;
        var statusColor = done ? '#22c55e' : (hasProgress ? '#f59e0b' : '#ef4444');
        var shortName = c.name.replace('Fixed Prosthodontics', 'Fixed').replace('Complete Dentures', 'Dentures')
            .replace('Pediatric Dentistry', 'Peds').replace('Periodontology', 'Perio')
            .replace('Endodontics', 'Endo').replace('Oral Surgery', 'Oral Surg')
            .replace('Group Practice (GD 640 & GD 642)', 'Group Prac')
            .replace('Treatment Planning (RS 545)', 'Tx Planning')
            .replace('Geriatric Dental Medicine', 'Geriatrics')
            .replace('Externship & SPS', 'Externship');
        gridHtml += '<div style="display:flex; align-items:center; gap:5px; padding:2px 0;">'
            + '<span style="width:65px; font-size:0.66em; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + escapeHtml(c.name) + '">' + escapeHtml(shortName) + '</span>'
            + '<div style="flex:1; height:3px; background:#1e293b; border-radius:2px; min-width:30px;"><div style="height:100%; background:' + c.color + '; border-radius:2px; width:' + pct + '%; transition:width 0.3s;"></div></div>'
            + '<span style="font-size:0.64em; font-weight:700; color:' + statusColor + '; width:28px; text-align:right;">' + c.completed + '/' + c.total + '</span>'
            + '</div>';
    });
    gridHtml += '</div>';

    container.innerHTML = '<div style="background:#111827; border:1px solid #1e293b; border-radius:10px; padding:10px 14px; margin-bottom:10px;">'
        // Top row: key metrics
        + '<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">'
        +   '<div class="pts-stat-chip"><span style="color:' + daysColor + '; font-weight:800; font-size:1.1em;">' + daysRemaining + '</span><span style="color:#64748b;"> days</span></div>'
        +   aptsHtml + procsHtml
        +   '<div class="pts-stat-chip"><span style="color:#f59e0b; font-weight:700;">' + outstandingCount + '</span><span style="color:#64748b;"> reqs</span></div>'
        +   '<div class="pts-stat-chip"><span style="color:' + paceColor + '; font-weight:700;">~' + pace + '</span><span style="color:#64748b;">/wk</span></div>'
        +   notesHtml
        + '</div>'
        // Category grid — always visible
        + gridHtml
        + '</div>';
}


// ==================== SECTION 6: IMPORT SYSTEM ====================

function openPatientImportModal() {
    var modal = document.getElementById('patientImportModal');
    if (!modal) {
        // Create the modal dynamically if not in HTML
        modal = document.createElement('div');
        modal.id = 'patientImportModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.75); z-index:10000; align-items:center; justify-content:center;';
        modal.innerHTML = buildImportModalHtml();
        document.body.appendChild(modal);
    }
    // Reset contents
    var textarea = modal.querySelector('#patientImportText');
    if (textarea) textarea.value = '';
    var preview = modal.querySelector('#patientImportPreview');
    if (preview) preview.innerHTML = '<div style="color:#64748b; padding:20px; text-align:center;">Paste text and click Preview to see what will be imported.</div>';
    var importBtn = modal.querySelector('#patientImportBtn');
    if (importBtn) importBtn.disabled = true;

    modal.style.display = 'flex';
}

function buildImportModalHtml() {
    return '<div style="background:#1e293b; border-radius:16px; padding:24px; max-width:700px; width:95%; max-height:90vh; display:flex; flex-direction:column; border:1px solid #334155;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
        +   '<h3 style="color:#60a5fa; margin:0; font-size:1.2em;">Import from Claude</h3>'
        +   '<button onclick="closePatientImportModal()" style="background:none; border:none; color:#94a3b8; font-size:1.4em; cursor:pointer; padding:4px 8px;">&times;</button>'
        + '</div>'
        + '<textarea id="patientImportText" placeholder="Paste Claude output here...\n\nSupported formats:\n--- PATIENT_RECORD ---\nNAME: Last, First\nCHART: 1234567\n...\n\n--- PATIENT_UPDATE ---\nCHART: 1234567\nNOTES_APPEND: New note text\n...\n\n--- REQUIREMENTS_MATCH ---\nCAN_FULFILL: req-id | description | procedure\n...\n\n--- REQUIREMENTS_STATUS ---\nUPDATES: req-id | completed: 1 | note: text\n..." '
        +   'style="flex:1; min-height:200px; padding:12px; background:#0f172a; border:1px solid #334155; border-radius:8px; color:#e2e8f0; font-family:monospace; font-size:0.85em; resize:vertical; max-height:200px; outline:none; margin-bottom:12px;"></textarea>'
        + '<div style="display:flex; gap:8px; margin-bottom:12px; flex-shrink:0;">'
        +   '<button onclick="previewPatientImport()" style="flex:1; padding:10px; background:#1e40af; border:none; border-radius:8px; color:#93c5fd; font-weight:600; cursor:pointer;">Preview</button>'
        +   '<button id="patientImportBtn" onclick="confirmPatientImport()" disabled style="flex:1; padding:10px; background:#065f46; border:none; border-radius:8px; color:#6ee7b7; font-weight:600; cursor:pointer; opacity:0.5;">Import</button>'
        + '</div>'
        + '<div id="patientImportPreview" style="max-height:250px; overflow-y:auto; background:#0f172a; border-radius:8px; padding:12px; border:1px solid #334155;">'
        +   '<div style="color:#64748b; padding:20px; text-align:center;">Paste text and click Preview to see what will be imported.</div>'
        + '</div>'
        + '</div>';
}

function closePatientImportModal() {
    var modal = document.getElementById('patientImportModal');
    if (modal) modal.style.display = 'none';
}

function parsePatientImportText(text) {
    var result = { records: [], updates: [], reqMatches: [], reqStatuses: [], dashboardUpdate: null, appointments: [], missingNotes: null, todoList: null, clinicalBriefs: [] };
    if (!text || !text.trim()) return result;

    // Normalize line endings (iPhone/Windows clipboard may have \r\n or \r)
    text = text.replace(/\r\n?/g, '\n');

    // Split by --- delimiter lines
    var blocks = text.split(/^---\s*$/m);
    var pendingHeader = null;

    blocks.forEach(function(block) {
        block = block.trim();
        if (!block) return;

        var firstLine = block.split('\n')[0].trim().toUpperCase();
        var bodyAfterFirstLine = block.indexOf('\n') !== -1 ? block.substring(block.indexOf('\n') + 1).trim() : '';

        // Detect format header from first line
        var header = null;
        if (firstLine.indexOf('PATIENT_RECORD') !== -1) header = 'PATIENT_RECORD';
        else if (firstLine.indexOf('PATIENT_UPDATE') !== -1) header = 'PATIENT_UPDATE';
        else if (firstLine.indexOf('REQUIREMENTS_MATCH') !== -1) header = 'REQUIREMENTS_MATCH';
        else if (firstLine.indexOf('REQUIREMENTS_STATUS') !== -1) header = 'REQUIREMENTS_STATUS';
        else if (firstLine.indexOf('SPS_DASHBOARD_UPDATE') !== -1) header = 'SPS_DASHBOARD_UPDATE';
        else if (firstLine.indexOf('MISSING_NOTES') !== -1) header = 'MISSING_NOTES';
        else if (firstLine.indexOf('TODO_LIST') !== -1) header = 'TODO_LIST';
        else if (firstLine.indexOf('CLINICAL_BRIEF') !== -1) header = 'CLINICAL_BRIEF';
        else if (firstLine.indexOf('APPOINTMENTS') !== -1 && firstLine.indexOf('ATTENDED') === -1) header = 'APPOINTMENTS';

        // If this block is ONLY a header (no meaningful body content), save as pending for next block
        if (header && !bodyAfterFirstLine) {
            pendingHeader = header;
            return;
        }

        // Determine effective header: explicit in this block > pending from previous block > auto-detect
        var effectiveHeader = header || pendingHeader;
        var bodyText = header ? bodyAfterFirstLine : block;
        pendingHeader = null; // consumed

        // Route to appropriate parser
        if (effectiveHeader === 'PATIENT_RECORD') {
            var parsed = parsePatientRecord(bodyText);
            if (parsed && (parsed.name || parsed.chartNumber)) result.records.push(parsed);
        } else if (effectiveHeader === 'PATIENT_UPDATE') {
            var parsed2 = parsePatientUpdate(bodyText);
            if (parsed2 && parsed2.chartNumber) result.updates.push(parsed2);
        } else if (effectiveHeader === 'REQUIREMENTS_MATCH') {
            var parsed3 = parseRequirementsMatch(bodyText);
            if (parsed3.canFulfill.length > 0 || parsed3.completedToday.length > 0) result.reqMatches.push(parsed3);
        } else if (effectiveHeader === 'REQUIREMENTS_STATUS') {
            var parsed4 = parseRequirementsStatus(bodyText);
            if (parsed4.length > 0) result.reqStatuses = result.reqStatuses.concat(parsed4);
        } else if (effectiveHeader === 'SPS_DASHBOARD_UPDATE') {
            var parsed5 = parseDashboardUpdate(bodyText);
            if (parsed5) result.dashboardUpdate = parsed5;
        } else if (effectiveHeader === 'MISSING_NOTES') {
            var parsedNotes = parseMissingNotesBlock(bodyText);
            if (parsedNotes) result.missingNotes = parsedNotes;
        } else if (effectiveHeader === 'TODO_LIST') {
            var parsedTodo = parseTodoListBlock(bodyText);
            if (parsedTodo) result.todoList = parsedTodo;
        } else if (effectiveHeader === 'CLINICAL_BRIEF') {
            var parsedBrief = parseClinicalBrief(bodyText);
            if (parsedBrief && parsedBrief.chartNumber) result.clinicalBriefs.push(parsedBrief);
        } else if (effectiveHeader === 'APPOINTMENTS') {
            // APPOINTMENTS header detected — subsequent blocks will be appointment blocks
            // This block itself might be empty (just the header), handled by pendingHeader above
            // If body has PATIENT: data, parse it as an appointment
            if (bodyText && bodyText.indexOf('PATIENT:') !== -1) {
                var aptParsed = parseImportAppointmentBlock(bodyText);
                if (aptParsed) result.appointments.push(aptParsed);
            }
        } else {
            // Auto-detect: appointment block if has PATIENT: and DATE: and PROCEDURE:
            if (block.indexOf('PATIENT:') !== -1 && block.indexOf('DATE:') !== -1) {
                var autoApt = parseImportAppointmentBlock(block);
                if (autoApt) {
                    result.appointments.push(autoApt);
                    return; // Don't also parse as patient record
                }
            }
            // Auto-detect: patient record if has NAME: or CHART: (but NOT PATIENT: which is appointments)
            if ((block.indexOf('NAME:') !== -1 || block.indexOf('CHART:') !== -1) && block.indexOf('PATIENT:') === -1) {
                var autoParsed = parsePatientRecord(block);
                if (autoParsed && (autoParsed.name || autoParsed.chartNumber)) result.records.push(autoParsed);
            }
            // Auto-detect: dashboard update if has ATTENDED: and TOTAL_COMPLETED:
            if (block.indexOf('ATTENDED:') !== -1 && block.indexOf('TOTAL_COMPLETED:') !== -1) {
                var autoDash = parseDashboardUpdate(block);
                if (autoDash) result.dashboardUpdate = autoDash;
            }
        }
    });

    return result;
}

function parsePatientRecord(text) {
    var record = {};
    var fieldMap = {
        'NAME': 'name', 'CHART': 'chartNumber', 'TYPE': 'type',
        'MEDICAL_HX': 'medicalHx', 'MEDICATIONS': 'medications',
        'ALLERGIES': 'allergies',
        'DENTAL_HX': 'dentalHx', 'TX_SUMMARY_BU': 'txSummaryBU',
        'TX_COMPLETED_BY_ME': 'txCompletedByMe',
        'POE_LAST': 'poeLast', 'POE_NEXT': 'poeNext',
        'TX_PLAN': 'txPlan', 'LAST_VISIT': 'lastVisit',
        'NEXT_VISIT': 'nextVisit', 'LAST_FMX': 'lastFMX',
        'LAST_BW': 'lastBW', 'LAST_CBCT': 'lastCBCT',
        'LAST_PANO': 'lastPANO', 'NOTES': 'notes',
        'RECALL_HISTORY': 'recallHistory',
        'ACTIVE_STATUS': 'activeStatus',
        'RELIABILITY': 'reliability'
    };

    var lines = text.split('\n');
    var currentKey = null;

    lines.forEach(function(line) {
        // Check if line starts with a known key
        var matched = false;
        var trimmedUpper = line.trimStart().toUpperCase();
        Object.keys(fieldMap).forEach(function(key) {
            if (trimmedUpper.indexOf(key + ':') === 0) {
                currentKey = fieldMap[key];
                var value = line.substring(line.indexOf(':') + 1).trim();
                record[currentKey] = value;
                matched = true;
            }
        });
        // Continuation line: any non-empty line that doesn't match a known key
        if (!matched && currentKey && line.trim()) {
            record[currentKey] = (record[currentKey] || '') + ' ' + line.trim();
        }
    });

    return record;
}

function parsePatientUpdate(text) {
    var update = { _notesAppend: false };
    var fieldMap = {
        'NAME': 'name', 'CHART': 'chartNumber', 'TYPE': 'type',
        'MEDICAL_HX': 'medicalHx', 'MEDICATIONS': 'medications',
        'ALLERGIES': 'allergies',
        'DENTAL_HX': 'dentalHx', 'TX_SUMMARY_BU': 'txSummaryBU',
        'TX_COMPLETED_BY_ME': 'txCompletedByMe',
        'POE_LAST': 'poeLast', 'POE_NEXT': 'poeNext',
        'TX_PLAN': 'txPlan', 'LAST_VISIT': 'lastVisit',
        'NEXT_VISIT': 'nextVisit', 'LAST_FMX': 'lastFMX',
        'LAST_BW': 'lastBW', 'LAST_CBCT': 'lastCBCT',
        'LAST_PANO': 'lastPANO', 'NOTES': 'notes',
        'RECALL_HISTORY': 'recallHistory',
        'ACTIVE_STATUS': 'activeStatus',
        'RELIABILITY': 'reliability'
    };

    var lines = text.split('\n');
    var currentKey = null;

    lines.forEach(function(line) {
        var trimmed = line.trimStart();
        var upperTrimmed = trimmed.toUpperCase();

        // Special: NOTES_APPEND
        if (upperTrimmed.indexOf('NOTES_APPEND:') === 0) {
            currentKey = 'notes';
            update._notesAppend = true;
            update.notes = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            return;
        }

        var matched = false;
        Object.keys(fieldMap).forEach(function(key) {
            if (upperTrimmed.indexOf(key + ':') === 0) {
                currentKey = fieldMap[key];
                var value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
                update[currentKey] = value;
                matched = true;
            }
        });

        // Continuation line: any non-empty line that doesn't match a known key
        if (!matched && currentKey && line.trim()) {
            update[currentKey] = (update[currentKey] || '') + ' ' + line.trim();
        }
    });

    return update;
}

function parseRequirementsMatch(text) {
    var result = { canFulfill: [], completedToday: [], chartNumber: '', name: '', highValue: false, priorityNotes: '' };
    var lines = text.split('\n');
    var inSection = null; // 'canFulfill', 'completedToday', or 'priorityNotes'

    lines.forEach(function(line) {
        var trimmed = line.trim();
        if (!trimmed) return;
        var upper = trimmed.toUpperCase();

        // Section headers
        if (upper.indexOf('CAN_FULFILL:') === 0) {
            inSection = 'canFulfill';
            var inlineVal = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            if (inlineVal && inlineVal.indexOf('|') !== -1) {
                var parts = inlineVal.split('|').map(function(s) { return s.trim(); });
                if (parts[0]) result.canFulfill.push({ reqId: parts[0], description: parts[1] || '', procedure: parts[2] || '' });
            }
            return;
        }
        if (upper.indexOf('COMPLETED_TODAY:') === 0) {
            inSection = 'completedToday';
            var inlineVal2 = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            if (inlineVal2 && inlineVal2.indexOf('|') !== -1) {
                var parts2 = inlineVal2.split('|').map(function(s) { return s.trim(); });
                if (parts2[0]) result.completedToday.push({ reqId: parts2[0], description: parts2[1] || '', procedure: parts2[2] || '', date: parts2[3] || '', patientName: parts2[4] || '' });
            }
            return;
        }
        // HIGH_VALUE and PRIORITY_NOTES — capture their values
        if (upper.indexOf('HIGH_VALUE:') === 0) {
            inSection = null;
            var hvVal = trimmed.substring(trimmed.indexOf(':') + 1).trim().toLowerCase();
            result.highValue = hvVal.indexOf('yes') === 0 || hvVal === 'true';
            return;
        }
        if (upper.indexOf('PRIORITY_NOTES:') === 0) {
            inSection = 'priorityNotes';
            result.priorityNotes = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            return;
        }
        // Other known headers exit the section
        if (upper.indexOf('CHART:') === 0 || upper.indexOf('NAME:') === 0) {
            inSection = null;
            if (upper.indexOf('CHART:') === 0) result.chartNumber = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            if (upper.indexOf('NAME:') === 0) result.name = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            return;
        }

        // In a section: parse based on section type
        if (inSection === 'priorityNotes') {
            // Continuation of priority notes — append
            result.priorityNotes = (result.priorityNotes || '') + ' ' + trimmed;
            return;
        }
        if (inSection && trimmed.indexOf('|') !== -1) {
            if (trimmed.toLowerCase().indexOf('(none') === 0 || trimmed.toLowerCase().indexOf('none') === 0) return;
            var parts3 = trimmed.split('|').map(function(s) { return s.trim(); });
            if (!parts3[0]) return;
            if (inSection === 'canFulfill') {
                result.canFulfill.push({ reqId: parts3[0], description: parts3[1] || '', procedure: parts3[2] || '' });
            } else if (inSection === 'completedToday') {
                result.completedToday.push({ reqId: parts3[0], description: parts3[1] || '', procedure: parts3[2] || '', date: parts3[3] || '', patientName: parts3[4] || '' });
            }
        }
    });

    return result;
}

function parseRequirementsStatus(text) {
    var statuses = [];
    var lines = text.split('\n');
    var inUpdates = false;

    lines.forEach(function(line) {
        var trimmed = line.trim();
        if (!trimmed) return;
        var upper = trimmed.toUpperCase();

        // Section header
        if (upper.indexOf('UPDATES:') === 0) {
            inUpdates = true;
            // Check for inline content
            var inlineVal = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            if (inlineVal && inlineVal.indexOf('|') !== -1) {
                var parts = inlineVal.split('|').map(function(s) { return s.trim(); });
                if (parts[0]) {
                    var status = { reqId: parts[0] };
                    for (var i = 1; i < parts.length; i++) {
                        var kv = parts[i].split(':').map(function(s) { return s.trim(); });
                        if (kv[0] === 'completed') status.completed = parseInt(kv[1], 10) || 0;
                        if (kv[0] === 'note') status.note = kv.slice(1).join(':').trim();
                    }
                    statuses.push(status);
                }
            }
            return;
        }

        // Other headers exit the section
        if (upper.indexOf('UPDATED:') === 0 || upper.indexOf('SOURCE:') === 0) {
            return; // metadata lines, skip
        }

        // In updates section: parse lines with | delimiter
        if (inUpdates && trimmed.indexOf('|') !== -1) {
            var parts2 = trimmed.split('|').map(function(s) { return s.trim(); });
            if (parts2[0]) {
                var status2 = { reqId: parts2[0] };
                for (var j = 1; j < parts2.length; j++) {
                    var kv2 = parts2[j].split(':').map(function(s) { return s.trim(); });
                    if (kv2[0] === 'completed') status2.completed = parseInt(kv2[1], 10) || 0;
                    if (kv2[0] === 'note') status2.note = kv2.slice(1).join(':').trim();
                }
                statuses.push(status2);
            }
        }
    });

    return statuses;
}

// ==================== MISSING NOTES PARSER ====================
// Parses MISSING_NOTES block: pipe-delimited rows with 7 fields
// [id] | [date] | [patient name] | [chart #] | [faculty] | [session] | [location]
function parseMissingNotesBlock(text) {
    var result = { dateCaptured: null, totalMissing: 0, notes: [] };
    var lines = text.split('\n');
    var inNotes = false;

    lines.forEach(function(line) {
        line = line.trim();
        if (!line) return;
        var upper = line.toUpperCase();

        if (upper.indexOf('DATE_CAPTURED:') !== -1) {
            result.dateCaptured = line.substring(line.indexOf(':') + 1).trim();
        } else if (upper.indexOf('TOTAL_MISSING:') !== -1) {
            var val = line.substring(line.indexOf(':') + 1).trim();
            result.totalMissing = parseInt(val) || 0;
        } else if (upper.indexOf('NOTES:') === 0) {
            inNotes = true;
        } else if (inNotes && line.indexOf('|') !== -1) {
            var parts = line.split('|').map(function(p) { return p.trim(); });
            if (parts.length >= 7) {
                result.notes.push({
                    id: parts[0],
                    date: parts[1],
                    patientName: parts[2],
                    chartNumber: parts[3],
                    faculty: parts[4],
                    session: parts[5],
                    location: parts[6]
                });
            } else if (parts.length >= 5) {
                // Flexible: at least id, date, patient, chart, faculty
                result.notes.push({
                    id: parts[0],
                    date: parts[1],
                    patientName: parts[2],
                    chartNumber: parts[3],
                    faculty: parts[4],
                    session: parts[5] ?? '',
                    location: parts[6] ?? ''
                });
            }
        }
    });

    if (result.notes.length === 0) return null;
    if (!result.totalMissing) result.totalMissing = result.notes.length;
    return result;
}

// ==================== TODO LIST PARSER ====================
// Parses TODO_LIST block: pipe-delimited rows with 5 fields
// [id] | [description] | [source tag] | [date added] | [source detail]
function parseTodoListBlock(text) {
    var result = { dateExported: null, totalItems: 0, items: [] };
    var lines = text.split('\n');
    var inItems = false;

    lines.forEach(function(line) {
        line = line.trim();
        if (!line) return;
        var upper = line.toUpperCase();

        if (upper.indexOf('DATE_EXPORTED:') !== -1) {
            result.dateExported = line.substring(line.indexOf(':') + 1).trim();
        } else if (upper.indexOf('TOTAL_ITEMS:') !== -1) {
            var val = line.substring(line.indexOf(':') + 1).trim();
            result.totalItems = parseInt(val) || 0;
        } else if (upper.indexOf('ITEMS:') === 0) {
            inItems = true;
        } else if (inItems && line.indexOf('|') !== -1) {
            var parts = line.split('|').map(function(p) { return p.trim(); });
            if (parts.length >= 3) {
                result.items.push({
                    id: parts[0],
                    description: parts[1],
                    source: parts[2] ?? 'MANUAL',
                    dateAdded: parts[3] ?? '',
                    sourceDetail: parts[4] ?? ''
                });
            }
        }
    });

    if (result.items.length === 0) return null;
    if (!result.totalItems) result.totalItems = result.items.length;
    return result;
}

function parseClinicalBrief(text) {
    if (!text || !text.trim()) return null;
    var brief = {};
    var fieldMap = {
        'CHART': 'chartNumber', 'NAME': 'name', 'DATE_GENERATED': 'dateGenerated',
        'SNAPSHOT': 'snapshot', 'DIAGNOSES_AND_RISKS': 'diagnosesAndRisks',
        'TX_STATUS': 'txStatus', 'TX_SEQUENCING': 'txSequencing',
        'FLAGGED_CONCERNS': 'flaggedConcerns', 'GRAD_VALUE': 'gradValue',
        'NEXT_VISIT_PLAN': 'nextVisitPlan'
    };
    var lines = text.split('\n');
    var currentKey = null;
    lines.forEach(function(line) {
        var matched = false;
        var trimmedUpper = line.trimStart().toUpperCase();
        Object.keys(fieldMap).forEach(function(key) {
            if (trimmedUpper.indexOf(key + ':') === 0) {
                currentKey = fieldMap[key];
                var value = line.substring(line.indexOf(':') + 1).trim();
                brief[currentKey] = value;
                matched = true;
            }
        });
        if (!matched && currentKey && line.trim()) {
            brief[currentKey] = (brief[currentKey] || '') + '\n' + line.trim();
        }
    });
    return brief.chartNumber ? brief : null;
}

// Parse a single appointment block from the unified import format
// Handles: PATIENT: / CHART: / DATE: / TIME: / PROCEDURE: / CHAIR:
function parseImportAppointmentBlock(text) {
    var apt = {};
    var lines = text.split('\n');
    lines.forEach(function(line) {
        var trimmed = line.trim();
        if (!trimmed) return;
        var colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) return;
        var key = trimmed.substring(0, colonIdx).trim().toUpperCase();
        var val = trimmed.substring(colonIdx + 1).trim();
        if (key === 'PATIENT') apt.patientName = val;
        else if (key === 'CHART') apt.chartNumber = val;
        else if (key === 'DATE') {
            // Parse various date formats
            if (typeof parseImportDate === 'function') {
                apt.date = parseImportDate(val);
            } else {
                // Fallback: try to extract YYYY-MM-DD
                var dateMatch = val.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                    apt.date = dateMatch[0];
                } else {
                    // Try US format MM/DD/YYYY
                    var usMatch = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                    if (usMatch) {
                        apt.date = usMatch[3] + '-' + usMatch[1].padStart(2, '0') + '-' + usMatch[2].padStart(2, '0');
                    }
                }
            }
        }
        else if (key === 'TIME') {
            // Parse time to HH:MM 24h format
            if (typeof parseImportTime === 'function') {
                apt.time = parseImportTime(val);
            } else {
                // Fallback: manual parse "8:30 AM" → "08:30"
                var timeMatch = val.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                if (timeMatch) {
                    var h = parseInt(timeMatch[1]);
                    var m = timeMatch[2];
                    var ampm = (timeMatch[3] || '').toUpperCase();
                    if (ampm === 'PM' && h < 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    apt.time = String(h).padStart(2, '0') + ':' + m;
                }
            }
        }
        else if (key === 'PROCEDURE') apt.procedure = val;
        else if (key === 'CHAIR') apt.chair = val;
    });

    if (!apt.patientName || !apt.date) return null;
    return apt;
}

function previewPatientImport() {
    var textarea = document.getElementById('patientImportText');
    var preview = document.getElementById('patientImportPreview');
    var importBtn = document.getElementById('patientImportBtn');
    if (!textarea || !preview) return;

    var parsed = parsePatientImportText(textarea.value);
    var hasContent = false;
    var html = '';

    // Preview records
    if (parsed.records.length > 0) {
        hasContent = true;
        parsed.records.forEach(function(rec) {
            var records = getPatientRecords();
            var id = rec.chartNumber ? 'pt_' + rec.chartNumber : null;
            var isUpdate = id && records[id];
            var changedFields = Object.keys(rec).filter(function(k) { return k !== '_notesAppend' && rec[k]; });

            html += '<div style="padding:8px; margin-bottom:6px; background:' + (isUpdate ? '#422006' : '#052e16') + '; border-radius:6px; border-left:3px solid ' + (isUpdate ? '#f59e0b' : '#22c55e') + ';">'
                + '<div style="color:' + (isUpdate ? '#fbbf24' : '#4ade80') + '; font-weight:600; font-size:0.9em;">'
                + (isUpdate ? 'UPDATE' : 'CREATE') + ': ' + escapeHtml(rec.name || 'Unknown') + (rec.chartNumber ? ' (Chart #' + escapeHtml(rec.chartNumber) + ')' : '')
                + '</div>'
                + '<div style="color:#94a3b8; font-size:0.8em; margin-top:4px;">Fields: ' + changedFields.join(', ') + '</div>'
                + '</div>';
        });
    }

    // Preview updates
    if (parsed.updates.length > 0) {
        hasContent = true;
        parsed.updates.forEach(function(upd) {
            var changedFields = Object.keys(upd).filter(function(k) { return k !== '_notesAppend' && k !== 'chartNumber' && upd[k]; });
            html += '<div style="padding:8px; margin-bottom:6px; background:#422006; border-radius:6px; border-left:3px solid #f59e0b;">'
                + '<div style="color:#fbbf24; font-weight:600; font-size:0.9em;">UPDATE Chart #' + escapeHtml(upd.chartNumber || '?') + '</div>'
                + '<div style="color:#94a3b8; font-size:0.8em; margin-top:4px;">Fields: ' + changedFields.join(', ') + (upd._notesAppend ? ' (notes will append)' : '') + '</div>'
                + '</div>';
        });
    }

    // Preview requirements matches
    if (parsed.reqMatches.length > 0) {
        hasContent = true;
        parsed.reqMatches.forEach(function(rm) {
            html += '<div style="padding:8px; margin-bottom:6px; background:#1e1b4b; border-radius:6px; border-left:3px solid #818cf8;">'
                + '<div style="color:#a5b4fc; font-weight:600; font-size:0.9em;">REQUIREMENTS MATCH</div>';
            rm.canFulfill.forEach(function(cf) {
                html += '<div style="color:#94a3b8; font-size:0.8em;">Can fulfill: ' + escapeHtml(cf.reqId) + ' - ' + escapeHtml(cf.description) + '</div>';
            });
            rm.completedToday.forEach(function(ct) {
                html += '<div style="color:#4ade80; font-size:0.8em;">Completed: ' + escapeHtml(ct.reqId) + ' - ' + escapeHtml(ct.description) + '</div>';
            });
            html += '</div>';
        });
    }

    // Preview requirement statuses
    if (parsed.reqStatuses.length > 0) {
        hasContent = true;
        html += '<div style="padding:8px; margin-bottom:6px; background:#1e1b4b; border-radius:6px; border-left:3px solid #818cf8;">'
            + '<div style="color:#a5b4fc; font-weight:600; font-size:0.9em;">REQUIREMENT STATUS UPDATES (' + parsed.reqStatuses.length + ')</div>';
        parsed.reqStatuses.forEach(function(rs) {
            html += '<div style="color:#94a3b8; font-size:0.8em;">' + escapeHtml(rs.reqId) + ': completed=' + (rs.completed || 0) + (rs.note ? ', note: ' + escapeHtml(rs.note) : '') + '</div>';
        });
        html += '</div>';
    }

    // Preview appointments
    if (parsed.appointments.length > 0) {
        hasContent = true;
        var todayStr = getLocalDateString(new Date());
        var pastCount = parsed.appointments.filter(function(a) { return a.date && a.date < todayStr; }).length;
        var futureCount = parsed.appointments.length - pastCount;
        html += '<div style="padding:10px; margin-bottom:6px; background:#052e16; border-radius:6px; border-left:3px solid #22c55e;">'
            + '<div style="color:#4ade80; font-weight:600; font-size:0.9em;">APPOINTMENTS (' + parsed.appointments.length + ')</div>';
        if (pastCount > 0) html += '<div style="color:#6ee7b7; font-size:0.8em;">' + pastCount + ' past (will auto-complete + create procedure records)</div>';
        if (futureCount > 0) html += '<div style="color:#93c5fd; font-size:0.8em;">' + futureCount + ' upcoming (scheduled)</div>';
        parsed.appointments.forEach(function(apt) {
            var isPast = apt.date && apt.date < todayStr;
            html += '<div style="color:#94a3b8; font-size:0.8em; padding:2px 0;">'
                + (isPast ? '✅' : '📅') + ' ' + escapeHtml(apt.date || '?') + ' '
                + escapeHtml(apt.time || '') + ' — '
                + escapeHtml(apt.patientName || '?') + ' — '
                + escapeHtml(apt.procedure || '')
                + '</div>';
        });
        html += '</div>';
    }

    // Preview dashboard update
    if (parsed.dashboardUpdate) {
        hasContent = true;
        var du = parsed.dashboardUpdate;
        var apts = du.appointments || {};
        var procs = du.procedures || {};
        var rost = du.roster || {};
        html += '<div style="padding:10px; margin-bottom:6px; background:#0c4a6e; border-radius:6px; border-left:3px solid #38bdf8;">'
            + '<div style="color:#7dd3fc; font-weight:600; font-size:0.9em;">SPS DASHBOARD UPDATE</div>'
            + '<div style="color:#94a3b8; font-size:0.8em; margin-top:4px;">Appointments: ' + (apts.attended || '?') + '/90 attended, ' + (apts.booked || 0) + ' booked → ' + (apts.projected || '?') + '/90 projected</div>'
            + '<div style="color:#94a3b8; font-size:0.8em;">Procedures: ' + (procs.totalCompleted || '?') + '/116 completed</div>'
            + '<div style="color:#94a3b8; font-size:0.8em;">Roster: ' + (rost.ptsAssigned || '?') + ' pts assigned, ' + (rost.notSeen6Mo || 0) + ' not seen 6mo</div>'
            + '<div style="color:' + ((apts.notesAtRisk || 0) >= 6 ? '#f87171' : '#94a3b8') + '; font-size:0.8em;">Notes at risk: ' + (apts.notesAtRisk || 0) + ' (Unclosed: ' + (apts.unclosed || 0) + ', Blank: ' + (apts.blank || 0) + ')</div>'
            + '</div>';
    }

    // Preview missing notes
    if (parsed.missingNotes) {
        hasContent = true;
        var mn = parsed.missingNotes;
        var alertColor = mn.notes.length >= 6 ? '#ef4444' : (mn.notes.length >= 4 ? '#f59e0b' : '#22c55e');
        var alertLabel = mn.notes.length >= 6 ? 'CRITICAL' : (mn.notes.length >= 4 ? 'WARNING' : 'OK');
        html += '<div style="padding:10px; margin-bottom:6px; background:#1c1917; border-radius:6px; border-left:3px solid ' + alertColor + ';">'
            + '<div style="color:' + alertColor + '; font-weight:600; font-size:0.9em;">MISSING PROGRESS NOTES (' + mn.notes.length + ') — ' + alertLabel + '</div>'
            + '<div style="color:#94a3b8; font-size:0.8em; margin-top:2px;">Hard limit: 6 before write-up</div>';
        // All user text is escaped via escapeHtml() for XSS safety
        mn.notes.forEach(function(note) {
            html += '<div style="color:#e2e8f0; font-size:0.8em; padding:2px 0;">'
                + escapeHtml(note.date) + ' — <strong>' + escapeHtml(note.patientName) + '</strong>'
                + ' (Chart: ' + escapeHtml(note.chartNumber) + ')'
                + ' — Faculty: <span style="color:#fbbf24;">' + escapeHtml(note.faculty) + '</span>'
                + ' [' + escapeHtml(note.session) + ' / ' + escapeHtml(note.location) + ']'
                + '</div>';
        });
        html += '</div>';
    }

    // Preview todo list
    if (parsed.todoList) {
        hasContent = true;
        var tl = parsed.todoList;
        html += '<div style="padding:10px; margin-bottom:6px; background:#1e1b4b; border-radius:6px; border-left:3px solid #a78bfa;">'
            + '<div style="color:#c4b5fd; font-weight:600; font-size:0.9em;">TO-DO LIST (' + tl.items.length + ' items)</div>';
        // All user text is escaped via escapeHtml() for XSS safety
        tl.items.forEach(function(item) {
            var badgeColor = item.source === 'EMAIL' ? '#3b82f6' : item.source === 'CLINIC' ? '#10b981' : item.source === 'SYSTEM' ? '#f59e0b' : item.source === 'SCREENSHOT' ? '#8b5cf6' : '#6b7280';
            html += '<div style="color:#e2e8f0; font-size:0.8em; padding:2px 0;">'
                + '<span style="background:' + badgeColor + '; color:#fff; padding:1px 5px; border-radius:3px; font-size:0.75em;">' + escapeHtml(item.source) + '</span> '
                + escapeHtml(item.description)
                + (item.sourceDetail ? ' <span style="color:#94a3b8;">(' + escapeHtml(item.sourceDetail) + ')</span>' : '')
                + '</div>';
        });
        html += '</div>';
    }

    // Preview clinical briefs
    if (parsed.clinicalBriefs && parsed.clinicalBriefs.length > 0) {
        hasContent = true;
        parsed.clinicalBriefs.forEach(function(brief) {
            html += '<div style="padding:8px; margin-bottom:6px; background:#052e16; border-radius:6px; border-left:3px solid #14b8a6;">'
                + '<div style="color:#5eead4; font-weight:600; font-size:0.9em;">CLINICAL BRIEF: ' + escapeHtml(brief.name || 'Chart #' + (brief.chartNumber || '?')) + '</div>'
                + '<div style="color:#94a3b8; font-size:0.8em; margin-top:4px;">Sections: '
                + (brief.snapshot ? 'Snapshot ' : '') + (brief.diagnosesAndRisks ? 'Dx/Risks ' : '')
                + (brief.txStatus ? 'Status ' : '') + (brief.txSequencing ? 'Sequencing ' : '')
                + (brief.flaggedConcerns ? 'Concerns ' : '') + (brief.gradValue ? 'GradValue ' : '')
                + (brief.nextVisitPlan ? 'NextVisit' : '') + '</div>'
                + '</div>';
        });
    }

    if (!hasContent) {
        html = '<div style="color:#f87171; padding:16px; text-align:center;">No parseable content found. Make sure the text uses the correct format with --- delimiters.</div>';
    }

    preview.innerHTML = html;
    preview.style.display = 'block';
    if (importBtn) {
        importBtn.disabled = !hasContent;
        importBtn.style.opacity = hasContent ? '1' : '0.5';
    }

    // Store parsed data for import step
    window._patientImportParsed = parsed;
}

function confirmPatientImport() {
    var parsed = window._patientImportParsed;
    if (!parsed) return;

    var records = getPatientRecords();
    var created = 0;
    var updated = 0;
    var lastImportedId = null;

    // Apply records (create or update)
    parsed.records.forEach(function(rec) {
        var chartNumber = (rec.chartNumber || '').trim();
        var id = chartNumber ? 'pt_' + chartNumber : generateId('pt');
        lastImportedId = id;

        if (records[id]) {
            // Update existing
            Object.keys(rec).forEach(function(key) {
                if (key !== '_notesAppend' && rec[key]) {
                    records[id][key] = rec[key];
                }
            });
            records[id].lastUpdated = new Date().toISOString();
            updated++;
        } else {
            // Create new
            records[id] = {
                id: id, name: '', chartNumber: chartNumber, type: '',
                medicalHx: '', medications: '', allergies: '',
                dentalHx: '', txSummaryBU: '', txCompletedByMe: '',
                poeLast: '', poeNext: '', txPlan: '',
                lastVisit: '', nextVisit: '',
                lastFMX: '', lastBW: '', lastCBCT: '', lastPANO: '',
                recallHistory: '', activeStatus: 'Active',
                notes: '', reliability: 'yellow', lastUpdated: new Date().toISOString()
            };
            Object.keys(rec).forEach(function(key) {
                if (key !== '_notesAppend' && rec[key]) {
                    records[id][key] = rec[key];
                }
            });
            created++;
        }
    });

    // Apply updates
    parsed.updates.forEach(function(upd) {
        var chartNumber = (upd.chartNumber || '').trim();
        var id = 'pt_' + chartNumber;
        if (!records[id]) {
            showToast('Update skipped: patient #' + chartNumber + ' not found');
            return;
        }
        lastImportedId = lastImportedId || id;
        Object.keys(upd).forEach(function(key) {
            if (key === '_notesAppend' || key === 'chartNumber') return;
            if (!upd[key]) return;

            if (key === 'notes' && upd._notesAppend) {
                records[id].notes = (records[id].notes || '') + '\n\n' + upd.notes;
            } else {
                records[id][key] = upd[key];
            }
        });
        records[id].lastUpdated = new Date().toISOString();
        updated++;
    });

    // Store imported requirements, priorityNotes, highValue on patient records
    parsed.reqMatches.forEach(function(rm) {
        var chartNumber = (rm.chartNumber || '').trim();
        var id = chartNumber ? 'pt_' + chartNumber : null;
        // Also try matching by name if chart not found
        if (!id || !records[id]) {
            var rmNameLower = (rm.name || '').toLowerCase().trim();
            Object.keys(records).forEach(function(rId) {
                if ((records[rId].name || '').toLowerCase().trim() === rmNameLower) id = rId;
            });
        }
        if (id && records[id]) {
            if (rm.canFulfill.length > 0) records[id].importedRequirements = rm.canFulfill;
            if (rm.priorityNotes) records[id].priorityNotes = rm.priorityNotes;
            if (rm.highValue) records[id].highValue = true;
        }
    });

    // Apply requirement statuses
    if (parsed.reqStatuses.length > 0) {
        applyRequirementCheckoffs(parsed.reqStatuses);
    }

    // Handle completed-today from reqMatches — pass patient context for procedure records
    var completedItems = [];
    parsed.reqMatches.forEach(function(rm) {
        rm.completedToday.forEach(function(ct) {
            completedItems.push({
                reqId: ct.reqId,
                completed: 1,
                note: ct.procedure || ct.description || '',
                patientName: ct.patientName || rm.name || '',
                date: ct.date || getLocalDateString()
            });
        });
    });
    if (completedItems.length > 0) {
        applyRequirementCheckoffs(completedItems);
    }

    // Process appointments from unified import
    var aptsCreated = 0;
    if (parsed.appointments.length > 0) {
        if (!roadmapData.clinicalData) roadmapData.clinicalData = { patients: {}, appointments: {}, completedProcedures: {}, patientRecords: {}, dashboardSnapshots: [] };
        if (!roadmapData.clinicalData.patients) roadmapData.clinicalData.patients = {};
        if (!roadmapData.clinicalData.appointments) roadmapData.clinicalData.appointments = {};
        if (!roadmapData.clinicalData.completedProcedures) roadmapData.clinicalData.completedProcedures = {};

        var todayStr = getLocalDateString(new Date());

        parsed.appointments.forEach(function(apt) {
            if (!apt.patientName || !apt.date) return;

            // Find or create patient in clinicalData.patients
            var patientId = null;
            var existingPatients = Object.entries(roadmapData.clinicalData.patients);
            for (var i = 0; i < existingPatients.length; i++) {
                var p = existingPatients[i][1];
                if (apt.chartNumber && p.chartNumber === apt.chartNumber) { patientId = existingPatients[i][0]; break; }
                if (p.name && p.name.toLowerCase() === apt.patientName.toLowerCase()) { patientId = existingPatients[i][0]; break; }
            }
            if (!patientId) {
                patientId = 'patient_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                roadmapData.clinicalData.patients[patientId] = {
                    id: patientId, name: apt.patientName, chartNumber: apt.chartNumber || '',
                    status: 'active', asaClass: '', perioStatus: '', needsXrays: false,
                    recallDue: null, medicalAlerts: '', outstandingTasks: [],
                    createdAt: new Date().toISOString()
                };
            }

            // Dedup: skip if same patient+date+time already exists (by ID or name)
            var aptTime = apt.time || '09:00';
            var aptNameLower = (apt.patientName || '').toLowerCase().trim();
            var isDupe = getValues(roadmapData.clinicalData.appointments).some(function(ex) {
                // Primary: match by patientId + date + time
                if (ex.patientId === patientId && ex.date === apt.date && ex.time === aptTime) return true;
                // Secondary: match by patientName + date + time (catches mismatched patientIds)
                var exPatient = roadmapData.clinicalData.patients[ex.patientId];
                if (exPatient &&
                    (exPatient.name || '').toLowerCase().trim() === aptNameLower &&
                    ex.date === apt.date &&
                    ex.time === aptTime) return true;
                return false;
            });
            if (isDupe) return;

            var isPast = apt.date < todayStr;
            var appointmentId = generateId('appt');
            var newApt = {
                id: appointmentId, patientId: patientId,
                date: apt.date, time: apt.time || '09:00', duration: 60,
                procedures: apt.procedure || '', notes: apt.chair ? 'Chair: ' + apt.chair : '',
                status: isPast ? 'completed' : 'scheduled', imported: true
            };
            if (isPast) {
                newApt.completedAt = apt.date + 'T17:00:00.000Z';
                var ptEntry = roadmapData.clinicalData.patients[patientId];
                if (ptEntry && (!ptEntry.lastVisit || ptEntry.lastVisit < apt.date)) ptEntry.lastVisit = apt.date;
            }
            roadmapData.clinicalData.appointments[appointmentId] = newApt;
            aptsCreated++;

            // Auto-create procedure record for past appointments
            if (isPast && apt.procedure && typeof recordProcedure === 'function') {
                recordProcedure({
                    patientId: patientId, patientName: apt.patientName || '',
                    appointmentId: appointmentId, date: apt.date,
                    procedureType: 'other', procedure: apt.procedure,
                    notes: 'Auto-created from import', createdAt: new Date().toISOString()
                });
            }
        });

        // Sync to monthly planner
        if (typeof syncClinicalToMonthlyPlanner === 'function') {
            syncClinicalToMonthlyPlanner();
        }
    }

    // Save dashboard snapshot
    if (parsed.dashboardUpdate) {
        saveDashboardSnapshot(parsed.dashboardUpdate);
    }

    // Import missing notes (merge with dedup by ID)
    var notesImported = 0;
    if (parsed.missingNotes && parsed.missingNotes.notes.length > 0) {
        if (!roadmapData.clinicalData.missingNotes || Array.isArray(roadmapData.clinicalData.missingNotes)) {
            roadmapData.clinicalData.missingNotes = {};
        }
        var existingNotes = roadmapData.clinicalData.missingNotes;
        parsed.missingNotes.notes.forEach(function(note) {
            var id = note.id;
            if (!id) return;
            // Dedup: if exists and pending, skip. If exists and completed, leave completed.
            if (existingNotes[id]) return;
            existingNotes[id] = {
                id: id,
                date: note.date ?? '',
                patientName: note.patientName ?? '',
                chartNumber: note.chartNumber ?? '',
                faculty: note.faculty ?? '',
                session: note.session ?? '',
                location: note.location ?? '',
                addedAt: new Date().toISOString(),
                completedAt: null,
                status: 'pending'
            };
            notesImported++;
        });
    }

    // Import todo list items (merge with dedup by ID)
    var todosImported = 0;
    if (parsed.todoList && parsed.todoList.items.length > 0) {
        if (!roadmapData.todoList) {
            roadmapData.todoList = { items: {}, _nextSeq: 1, lastUpdated: null };
        }
        if (!roadmapData.todoList.items || Array.isArray(roadmapData.todoList.items)) {
            roadmapData.todoList.items = {};
        }
        var existingTodos = roadmapData.todoList.items;
        parsed.todoList.items.forEach(function(item) {
            var id = item.id;
            if (!id) return;
            // Dedup: if exists and pending, skip. If exists and completed, leave completed.
            if (existingTodos[id]) return;
            existingTodos[id] = {
                id: id,
                description: item.description ?? '',
                source: item.source ?? 'MANUAL',
                dateAdded: item.dateAdded ?? getLocalDateString(new Date()),
                sourceDetail: item.sourceDetail ?? '',
                addedAt: new Date().toISOString(),
                completedAt: null,
                status: 'pending'
            };
            todosImported++;
            // Track max seq number for manual adds
            var match = id.match(/^todo-(\d+)/);
            if (match) {
                var seq = parseInt(match[1]);
                if (seq >= (roadmapData.todoList._nextSeq ?? 1)) {
                    roadmapData.todoList._nextSeq = seq + 1;
                }
            }
        });
        roadmapData.todoList.lastUpdated = new Date().toISOString();
    }

    // Import clinical briefs (overwrite per patient by chart number)
    var briefsImported = 0;
    if (parsed.clinicalBriefs && parsed.clinicalBriefs.length > 0) {
        parsed.clinicalBriefs.forEach(function(brief) {
            var chartNumber = (brief.chartNumber || '').trim();
            var id = chartNumber ? 'pt_' + chartNumber : null;
            if (!id || !records[id]) {
                var briefNameLower = (brief.name || '').toLowerCase().trim();
                Object.keys(records).forEach(function(rId) {
                    if ((records[rId].name || '').toLowerCase().trim() === briefNameLower) id = rId;
                });
            }
            if (id && records[id]) {
                if (records[id].clinicalBrief && records[id].clinicalBrief.dateGenerated) {
                    if (!Array.isArray(records[id].briefHistory)) records[id].briefHistory = [];
                    records[id].briefHistory.unshift(JSON.parse(JSON.stringify(records[id].clinicalBrief)));
                    if (records[id].briefHistory.length > 3) records[id].briefHistory = records[id].briefHistory.slice(0, 3);
                }
                records[id].clinicalBrief = {
                    dateGenerated: brief.dateGenerated || getLocalDateString(new Date()),
                    snapshot: brief.snapshot || '',
                    diagnosesAndRisks: brief.diagnosesAndRisks || '',
                    txStatus: brief.txStatus || '',
                    txSequencing: brief.txSequencing || '',
                    flaggedConcerns: brief.flaggedConcerns || '',
                    gradValue: brief.gradValue || '',
                    nextVisitPlan: brief.nextVisitPlan || ''
                };
                records[id].lastUpdated = new Date().toISOString();
                briefsImported++;
            }
        });
    }

    // CRITICAL: Persist to localStorage BEFORE saveData() in case guards block
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Re-render with blur suppression to prevent stale onblur handlers from overwriting imported data
    _suppressBlurSave = true;
    closePatientImportModal();
    renderCountdownRadar();
    renderPatientsSidebar();

    // Auto-select the first imported/updated patient
    if (lastImportedId && records[lastImportedId]) {
        selectPatient(lastImportedId);
    } else if (activePatientId && records[activePatientId]) {
        renderPatientRecord(activePatientId);
    }
    _suppressBlurSave = false;

    // Re-render dashboard with updated data
    if (typeof renderDashboard === 'function') {
        try { renderDashboard(); } catch(e) {}
    }
    if (typeof initClinicalTab === 'function' && aptsCreated > 0) {
        try { initClinicalTab(); } catch(e) {}
    }

    var msg = '';
    if (created > 0) msg += created + ' patient(s) created. ';
    if (updated > 0) msg += updated + ' patient(s) updated. ';
    if (aptsCreated > 0) msg += aptsCreated + ' appointment(s) imported. ';
    if (parsed.reqStatuses.length > 0 || completedItems.length > 0) msg += 'Requirements updated. ';
    if (parsed.dashboardUpdate) msg += 'Dashboard snapshot saved. ';
    if (notesImported > 0) msg += notesImported + ' missing note(s) imported. ';
    if (todosImported > 0) msg += todosImported + ' to-do item(s) imported. ';
    if (briefsImported > 0) msg += briefsImported + ' clinical brief(s) imported. ';
    showToast(msg || 'Import complete');
}

function migratePerioNoiseCleanup() {
    if (localStorage.getItem('perioNoiseCleanupDone_v1')) return;
    var records = getPatientRecords();
    if (!records || Object.keys(records).length === 0) return;

    var alwaysStrip = [
        'perio-form-prophy', 'perio-sum-prophy',
        'perio-form-recall', 'perio-sum-recall',
        'perio-form-reeval-ging', 'perio-sum-reeval-ging', 'perio-3rd-reeval',
        'perio-form-ohi'
    ];
    var conditionalStrip = [
        'perio-form-dx', 'perio-sum-dx',
        'perio-form-impr', 'perio-sum-impr'
    ];
    var perioKeywords = /periodontitis|srp|scaling.and.root|calculus.removal/i;

    var cleaned = 0;
    Object.keys(records).forEach(function(id) {
        var p = records[id];
        if (!p || !Array.isArray(p.importedRequirements) || p.importedRequirements.length === 0) return;

        var origLen = p.importedRequirements.length;
        var hasPerio = perioKeywords.test(p.txPlan || '') || perioKeywords.test(p.medicalHx || '') || perioKeywords.test(p.notes || '');

        p.importedRequirements = p.importedRequirements.filter(function(req) {
            var reqId = (req.reqId || req).toString();
            if (alwaysStrip.indexOf(reqId) !== -1) return false;
            if (!hasPerio && conditionalStrip.indexOf(reqId) !== -1) return false;
            return true;
        });

        if (p.importedRequirements.length !== origLen) {
            cleaned++;
            if (p.importedRequirements.length < 3) {
                p.highValue = false;
            }
        }
    });

    if (cleaned > 0) {
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        console.log('[PERIO-CLEANUP] Stripped routine perio noise from ' + cleaned + ' patients');
    }
    localStorage.setItem('perioNoiseCleanupDone_v1', 'true');
}

function applyRequirementCheckoffs(items, importContext) {
    if (!items || items.length === 0) return;

    var competencies = getCompetenciesData();
    if (!competencies) return;

    // importContext may have { patientName, patientId, date } for procedure record creation
    var ctx = importContext || {};

    items.forEach(function(item) {
        for (var catKey in competencies) {
            var cat = competencies[catKey];
            var sections = cat.sections;
            if (!sections) continue;

            var sectionList = getValues(sections);
            for (var s = 0; s < sectionList.length; s++) {
                var sec = sectionList[s];
                if (!sec || !sec.items) continue;

                var itemList = getValues(sec.items);
                for (var i = 0; i < itemList.length; i++) {
                    if (itemList[i].id === item.reqId) {
                        // Increment or set completed count
                        if (typeof item.completed === 'number') {
                            itemList[i].completed = item.completed;
                        } else {
                            itemList[i].completed = (itemList[i].completed || 0) + 1;
                        }
                        if (item.note) {
                            itemList[i].note = item.note;
                        }

                        // Write back to the actual storage (handle object-based storage)
                        if (typeof sec.items === 'object' && !Array.isArray(sec.items)) {
                            for (var key in sec.items) {
                                if (sec.items[key] && sec.items[key].id === item.reqId) {
                                    sec.items[key].completed = itemList[i].completed;
                                    if (item.note) sec.items[key].note = item.note;

                                    // CROSS-SYNC: Create procedure record with evidence trail
                                    if (typeof recordProcedure === 'function') {
                                        var procDate = ctx.date || item.date || getLocalDateString();
                                        var patientName = ctx.patientName || item.patientName || '';
                                        var patientId = ctx.patientId || item.patientId || null;

                                        // Dedup: check if procedure already recorded for same req+date+patient
                                        var procs = getValues(roadmapData.clinicalData?.completedProcedures);
                                        var isDupe = procs.some(function(p) {
                                            return p.competencyItemIds && p.competencyItemIds.includes(item.reqId)
                                                && p.date === procDate
                                                && p.patientName === patientName;
                                        });

                                        if (!isDupe && (patientName || item.note)) {
                                            recordProcedure({
                                                patientId: patientId,
                                                patientName: patientName,
                                                date: procDate,
                                                procedureType: catKey,
                                                procedure: item.note || sec.items[key].text || 'Imported procedure',
                                                competencyItemIds: [item.reqId],
                                                notes: 'Imported via requirement checkoff'
                                            });
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        return;
                    }
                }
            }
        }
    });

    // Refresh competencies display if available
    if (typeof renderCompetencies === 'function') {
        try { renderCompetencies(); } catch (e) { /* ignore */ }
    }

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}

// ==================== SPS DASHBOARD FUNCTIONS ====================

function getDashboardSnapshots() {
    return roadmapData.clinicalData.dashboardSnapshots || [];
}

function saveDashboardSnapshot(snapshot) {
    if (!roadmapData.clinicalData.dashboardSnapshots) {
        roadmapData.clinicalData.dashboardSnapshots = [];
    }
    var snaps = roadmapData.clinicalData.dashboardSnapshots;

    // Compute delta against previous snapshot
    if (snaps.length > 0) {
        snapshot.delta = computeDashboardDelta(snapshot, snaps[0]);
    } else {
        snapshot.delta = null;
    }

    // Add timestamp if not present
    if (!snapshot.capturedAt) {
        snapshot.capturedAt = new Date().toISOString().split('T')[0];
    }

    // Prepend (newest first)
    snaps.unshift(snapshot);

    // Trim to 20 max
    if (snaps.length > 20) {
        roadmapData.clinicalData.dashboardSnapshots = snaps.slice(0, 20);
    }

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Re-render
    if (typeof renderDashboardMetrics === 'function') {
        try { renderDashboardMetrics(); } catch(e) { /* */ }
    }
    if (typeof renderCountdownRadar === 'function') {
        try { renderCountdownRadar(); } catch(e) { /* */ }
    }
}

function computeDashboardDelta(current, previous) {
    var delta = {};

    // Appointments
    var curApts = current.appointments || {};
    var prevApts = previous.appointments || {};
    if (curApts.attended != null && prevApts.attended != null) {
        var diff = curApts.attended - prevApts.attended;
        if (diff !== 0) delta.attended = (diff > 0 ? '+' : '') + diff;
    }
    if (curApts.booked != null && prevApts.booked != null) {
        var diff2 = curApts.booked - prevApts.booked;
        if (diff2 !== 0) delta.booked = (diff2 > 0 ? '+' : '') + diff2;
    }

    // Procedures
    var curProcs = current.procedures || {};
    var prevProcs = previous.procedures || {};
    if (curProcs.totalCompleted != null && prevProcs.totalCompleted != null) {
        var diff3 = curProcs.totalCompleted - prevProcs.totalCompleted;
        if (diff3 !== 0) delta.totalCompleted = (diff3 > 0 ? '+' : '') + diff3;
    }

    // Clinical progress
    var curCp = current.clinicalProgress || {};
    var prevCp = previous.clinicalProgress || {};
    var cpCategories = ['fixed','implant','implSurg','bridge','remoComplete','overdenture','remoPartial','operative','perioSrp','endo'];
    cpCategories.forEach(function(cat) {
        var cur = curCp[cat] || {};
        var prev = prevCp[cat] || {};
        ['c','ip','p'].forEach(function(field) {
            if (cur[field] != null && prev[field] != null) {
                var d = cur[field] - prev[field];
                if (d !== 0) delta[cat + '_' + field] = (d > 0 ? '+' : '') + d;
            }
        });
    });

    // Notes risk
    if (curApts.notesAtRisk != null && prevApts.notesAtRisk != null) {
        var diff4 = curApts.notesAtRisk - prevApts.notesAtRisk;
        if (diff4 !== 0) delta.notesAtRisk = (diff4 > 0 ? '+' : '') + diff4;
    }

    return Object.keys(delta).length > 0 ? delta : null;
}

function parseDashboardUpdate(text) {
    if (!text || !text.trim()) return null;

    var snapshot = {
        capturedAt: null,
        lastProcedureDate: null,
        appointments: {
            attended: 0, booked: 0, projected: 0, remaining: 0,
            missed: 0, unclosed: 0, blank: 0, notesAtRisk: 0,
            notesStatus: 'GREEN', unauthorized: 0
        },
        procedures: { totalCompleted: 0, remaining: 0, weeklyPaceNeeded: 0 },
        roster: { ptsAssigned: 0, notSeen6Mo: 0, tpNotConsented: 0 },
        clinicalProgress: {
            fixed: { c: 0, ip: 0, p: 0 },
            implant: { c: 0, ip: 0, spc: 0, p: 0 },
            implSurg: { c: 0 },
            bridge: { c: 0, ip: 0, p: 0 },
            remoComplete: { c: 0, ip: 0, p: 0 },
            overdenture: { c: 0, p: 0 },
            remoPartial: { c: 0, ip: 0, p: 0 },
            operative: { c: 0, p: 0 },
            perioSrp: { c: 0, p: 0 },
            endo: { c: 0, p: 0 }
        },
        alerts: [],
        deltaText: null
    };

    var lines = text.split('\n');
    var inClinicalProgress = false;
    var inAlerts = false;
    var inDelta = false;
    var deltaLines = [];

    lines.forEach(function(line) {
        var trimmed = line.trim();
        if (!trimmed) return;

        // Section detection
        if (trimmed.indexOf('CLINICAL_PROGRESS:') === 0) { inClinicalProgress = true; inAlerts = false; return; }
        if (trimmed.indexOf('ALERTS:') === 0) { inAlerts = true; inClinicalProgress = false; return; }
        if (trimmed.indexOf('DELTA_FROM_LAST') === 0) {
            inAlerts = false; inClinicalProgress = false; inDelta = true;
            // Handle both "DELTA_FROM_LAST: text" and "DELTA_FROM_LAST (context): text"
            var deltaColonIdx = trimmed.indexOf(':');
            if (deltaColonIdx !== -1) {
                var firstDeltaLine = trimmed.substring(deltaColonIdx + 1).trim();
                if (firstDeltaLine) deltaLines.push(firstDeltaLine);
            }
            return;
        }

        // Delta section lines — capture multi-line delta content
        if (inDelta) {
            // Exit delta if we hit another section
            if (trimmed.indexOf('ALERTS:') === 0) {
                inDelta = false; inAlerts = true;
                return;
            }
            if (/^[A-Z_]{5,}:/.test(trimmed)) {
                inDelta = false;
                // Fall through to parse as top-level field
            } else {
                deltaLines.push(trimmed);
                return;
            }
        }

        // Non-section top-level fields
        if (!inClinicalProgress && !inAlerts) {
            var match = trimmed.match(/^([A-Z_]+)\s*:\s*(.+)/);
            if (!match) return;
            var key = match[1];
            var val = match[2].trim();

            // Parse number, handling "54 / 90" or "54/90" patterns
            function pn(v) {
                var m = v.match(/^([\d.]+)/);
                return m ? parseFloat(m[1]) : 0;
            }

            switch(key) {
                case 'DATE_CAPTURED': snapshot.capturedAt = val; break;
                case 'LAST_PROCEDURE_DATE': snapshot.lastProcedureDate = val; break;
                case 'ATTENDED': snapshot.appointments.attended = pn(val); break;
                case 'BOOKED': snapshot.appointments.booked = pn(val); break;
                case 'PROJECTED': snapshot.appointments.projected = pn(val); break;
                case 'REMAINING':
                    // Could be appointments or procedures — use context
                    // If procedures section was started (TOTAL_COMPLETED seen), it's procedures
                    if (snapshot.procedures.totalCompleted > 0) {
                        snapshot.procedures.remaining = pn(val);
                    } else {
                        snapshot.appointments.remaining = pn(val);
                    }
                    break;
                case 'MISSED': snapshot.appointments.missed = pn(val); break;
                case 'NOTES_AT_RISK':
                    snapshot.appointments.notesAtRisk = pn(val);
                    // Parse sub-values: "8 (Unclosed: 4, Blank: 4)"
                    var unMatch = val.match(/Unclosed:\s*(\d+)/i);
                    var blMatch = val.match(/Blank:\s*(\d+)/i);
                    if (unMatch) snapshot.appointments.unclosed = parseInt(unMatch[1]);
                    if (blMatch) snapshot.appointments.blank = parseInt(blMatch[1]);
                    break;
                case 'NOTES_STATUS': snapshot.appointments.notesStatus = val.replace(/[^A-Z]/g, ''); break;
                case 'UNAUTHORIZED': snapshot.appointments.unauthorized = pn(val); break;
                case 'TOTAL_COMPLETED': snapshot.procedures.totalCompleted = pn(val); break;
                case 'WEEKLY_PACE_NEEDED': snapshot.procedures.weeklyPaceNeeded = parseFloat(val) || 0; break;
                case 'PTS_ASSIGNED': snapshot.roster.ptsAssigned = pn(val); break;
                case 'NOT_SEEN_6MO': snapshot.roster.notSeen6Mo = pn(val); break;
                case 'TP_NOT_CONSENTED': snapshot.roster.tpNotConsented = pn(val); break;
            }
        }

        // Clinical progress lines: "FIXED: C=[n] IP=[n] P=[n] | target: 10 units"
        if (inClinicalProgress) {
            var cpMatch = trimmed.match(/^([A-Z_]+)\s*:/);
            if (!cpMatch) return;
            var catName = cpMatch[1].toLowerCase().replace(/_/g, '');

            // Map names
            var catMap = {
                'fixed': 'fixed', 'implant': 'implant', 'implsurg': 'implSurg',
                'bridge': 'bridge', 'remocomp': 'remoComplete', 'overdenture': 'overdenture',
                'remopartial': 'remoPartial', 'operative': 'operative',
                'periosrp': 'perioSrp', 'endo': 'endo'
            };
            var catKey = catMap[catName];
            if (!catKey) return;

            var cMatch = trimmed.match(/C\s*=\s*([\d.]+)/i);
            var ipMatch = trimmed.match(/IP\s*=\s*([\d.]+)/i);
            var pMatch = trimmed.match(/P\s*=\s*([\d.]+)/i);
            var spcMatch = trimmed.match(/SPC\s*=\s*([\d.]+)/i);

            if (snapshot.clinicalProgress[catKey]) {
                if (cMatch) snapshot.clinicalProgress[catKey].c = parseFloat(cMatch[1]);
                if (ipMatch && snapshot.clinicalProgress[catKey].ip !== undefined) snapshot.clinicalProgress[catKey].ip = parseFloat(ipMatch[1]);
                if (pMatch && snapshot.clinicalProgress[catKey].p !== undefined) snapshot.clinicalProgress[catKey].p = parseFloat(pMatch[1]);
                if (spcMatch && snapshot.clinicalProgress[catKey].spc !== undefined) snapshot.clinicalProgress[catKey].spc = parseFloat(spcMatch[1]);
            }
        }

        // Alerts — capture lines starting with [, emoji (⛔⚠️✅), or any non-empty line in ALERTS section
        if (inAlerts) {
            // Skip section headers like "APPOINTMENTS:" that might follow
            if (/^[A-Z_]{3,}:/.test(trimmed) && trimmed.indexOf('=') === -1) {
                inAlerts = false;
                return;
            }
            // Clean brackets and leading emojis for display
            var alertText = trimmed.replace(/^\[|\]$/g, '').trim();
            if (alertText) {
                snapshot.alerts.push(alertText);
            }
        }
    });

    // Assemble delta text from collected lines
    if (deltaLines.length > 0) {
        snapshot.deltaText = deltaLines.join('\n');
    }

    // Compute derived values if not provided
    if (snapshot.appointments.projected === 0 && snapshot.appointments.attended > 0) {
        snapshot.appointments.projected = snapshot.appointments.attended + snapshot.appointments.booked;
    }
    if (snapshot.appointments.remaining === 0 && snapshot.appointments.attended > 0) {
        snapshot.appointments.remaining = Math.max(0, 90 - snapshot.appointments.attended);
    }
    if (snapshot.procedures.remaining === 0 && snapshot.procedures.totalCompleted > 0) {
        snapshot.procedures.remaining = Math.max(0, 116 - snapshot.procedures.totalCompleted);
    }
    if (snapshot.appointments.notesAtRisk === 0) {
        // Notes categories overlap (blank note is also unclosed) — use MAX, not sum
        snapshot.appointments.notesAtRisk = Math.max(snapshot.appointments.unclosed, snapshot.appointments.blank);
    }
    // Always recompute status from data (don't trust Claude's stated status — rules may differ)
    {
        var nar = snapshot.appointments.notesAtRisk;
        // GREEN if < 5, YELLOW if = 5, RED if >= 6
        snapshot.appointments.notesStatus = nar >= 6 ? 'RED' : nar >= 5 ? 'YELLOW' : 'GREEN';
    }

    // Validate: only return if we got meaningful data
    if (snapshot.appointments.attended === 0 && snapshot.procedures.totalCompleted === 0) {
        return null;
    }

    return snapshot;
}

function renderDashboardMetrics() {
    var container = document.getElementById('dashboardMetricsCard');
    if (container) container.innerHTML = '';
}
