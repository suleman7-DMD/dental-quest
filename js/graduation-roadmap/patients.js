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
        reliability: "yellow", lastUpdated: null
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
        reliability: "yellow", lastUpdated: null
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
        reliability: "green", lastUpdated: null
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
        reliability: "green", lastUpdated: null
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
        reliability: "green", lastUpdated: null
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
        reliability: "green", lastUpdated: null
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
        reliability: "red", lastUpdated: null
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
        reliability: "green", lastUpdated: null
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
        reliability: "green", lastUpdated: null
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
        reliability: "yellow", lastUpdated: null
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
        reliability: "red", lastUpdated: null
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
        reliability: "green", lastUpdated: null
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
        reliability: "red", lastUpdated: null
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
        reliability: "red", lastUpdated: null
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
        reliability: "red", lastUpdated: null
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
        reliability: "red", lastUpdated: null
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
        reliability: "red", lastUpdated: null
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
        reliability: "red", lastUpdated: null
    },
    "pt_karima": {
        id: "pt_karima", name: "Karima M.", chartNumber: "",
        type: "do this",
        medicalHx: "", medications: "", dentalHx: "", txSummaryBU: "",
        poeLast: "", poeNext: "", txPlan: "",
        lastVisit: "", nextVisit: "",
        lastFMX: "", lastBW: "", lastCBCT: "", lastPANO: "",
        notes: "Needs full charting and data entry.",
        reliability: "yellow", lastUpdated: null
    }
};


// ==================== SECTION 2: CORE RENDERING FUNCTIONS ====================

let activePatientId = null;

function initPatientsTab() {
    // Initialize default records if empty
    getPatientRecords();
    renderDashboardMetrics();
    renderCountdownRadar();
    renderPatientsSidebar();
    // Select first patient if none active
    if (!activePatientId) {
        const records = getPatientRecords();
        const firstId = Object.keys(records)[0];
        if (firstId) selectPatient(firstId);
    } else {
        renderPatientRecord(activePatientId);
    }
}

function getPatientRecords() {
    if (!roadmapData.clinicalData) roadmapData.clinicalData = {};
    if (!roadmapData.clinicalData.patientRecords || Object.keys(roadmapData.clinicalData.patientRecords).length === 0) {
        roadmapData.clinicalData.patientRecords = JSON.parse(JSON.stringify(DEFAULT_PATIENT_RECORDS));
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
        if (added) saveData();
    }
    return roadmapData.clinicalData.patientRecords;
}

function renderPatientsSidebar() {
    const container = document.getElementById('patientsSidebar');
    if (!container) return;

    const records = getPatientRecords();
    const searchInput = container.querySelector('.pt-sidebar-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    const reliabilityDotColor = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };

    let listHtml = '';
    Object.keys(records).forEach(function(id) {
        const patient = records[id];
        if (!patient) return;
        const name = patient.name || 'Unnamed';

        // Filter by search
        if (searchTerm && !name.toLowerCase().includes(searchTerm) && !(patient.chartNumber || '').toLowerCase().includes(searchTerm)) {
            return;
        }

        const isActive = id === activePatientId;
        const dotColor = reliabilityDotColor[patient.reliability] || '#6b7280';

        listHtml += '<div class="pt-sidebar-item' + (isActive ? ' pt-sidebar-item-active' : '') + '" '
            + 'onclick="selectPatient(\'' + escapeHtml(id) + '\')" '
            + 'style="display:flex; align-items:center; gap:8px; padding:10px 12px; cursor:pointer; '
            + 'border-left:3px solid ' + (isActive ? '#3b82f6' : 'transparent') + '; '
            + 'background:' + (isActive ? 'rgba(59,130,246,0.12)' : 'transparent') + '; '
            + 'transition: all 0.15s ease;"'
            + ' onmouseenter="if(this.className.indexOf(\'active\')===-1){this.style.background=\'rgba(255,255,255,0.05)\'}"'
            + ' onmouseleave="if(this.className.indexOf(\'active\')===-1){this.style.background=\'transparent\'}"'
            + '>'
            + '<span style="width:8px; height:8px; border-radius:50%; background:' + dotColor + '; flex-shrink:0;"></span>'
            + '<span style="color:' + (isActive ? '#e2e8f0' : '#94a3b8') + '; font-size:0.88em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(name) + '</span>'
            + '</div>';
    });

    // Build the full sidebar content
    container.innerHTML = ''
        + '<div style="padding:12px;">'
        +   '<input type="text" class="pt-sidebar-search" placeholder="Search patients..." '
        +     'value="' + escapeHtml(searchTerm) + '" '
        +     'oninput="renderPatientsSidebar()" '
        +     'style="width:100%; padding:8px 10px; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#e2e8f0; font-size:0.85em; outline:none; margin-bottom:8px; box-sizing:border-box;">'
        +   '<div style="display:flex; gap:6px;">'
        +     '<button onclick="openPatientImportModal()" style="flex:1; padding:7px 0; background:#1e40af; border:none; border-radius:6px; color:#93c5fd; font-size:0.78em; cursor:pointer; font-weight:600;">Import from Claude</button>'
        +     '<button onclick="addNewPatientRecord()" style="flex:1; padding:7px 0; background:#065f46; border:none; border-radius:6px; color:#6ee7b7; font-size:0.78em; cursor:pointer; font-weight:600;">+ Add Patient</button>'
        +   '</div>'
        + '</div>'
        + '<div style="flex:1; overflow-y:auto;">'
        +   listHtml
        + '</div>';
}

function selectPatient(patientId) {
    activePatientId = patientId;
    renderPatientsSidebar();
    renderPatientRecord(patientId);
}

function renderPatientRecord(patientId) {
    const container = document.getElementById('patientRecordView');
    if (!container) return;

    const records = getPatientRecords();
    const patient = records[patientId];
    if (!patient) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">Select a patient from the sidebar.</div>';
        return;
    }

    // Compute requirement matches
    const matches = computeRequirementMatches(patient);
    const badgesHtml = renderRequirementBadges(matches);

    // Build the record fields
    const fields = [
        { field: 'medicalHx', label: 'Medical Hx:', bg: '#f4cccc', labelColor: '#990000' },
        { field: 'medications', label: 'Medications:', bg: '#cfe2f3', labelColor: '#073763' },
        { field: 'dentalHx', label: 'Dental Hx:', bg: '#d9ead3', labelColor: '#274e13' },
        { field: 'txSummaryBU', label: 'Summary of history of tx at bu:', bg: '#fff2cc', labelColor: '#7f6000' },
        { field: 'poeLast', label: 'POE/Prophy/Recall:', bg: '#d9d9d9', labelColor: '#434343' },
        { field: 'poeNext', label: 'POE/Prophy/Recall:', bg: '#d9ead3', labelColor: '#274e13' },
        { field: 'txPlan', label: 'Tx plan:', bg: '#d9d2e9', labelColor: '#351c75' },
        { field: 'lastVisit', label: 'Last Visit:', bg: '#fce5cd', labelColor: '#783f04' },
        { field: 'nextVisit', label: 'Next Visit:', bg: '#d9ead3', labelColor: '#274e13' }
    ];

    let fieldsHtml = '';
    fields.forEach(function(f) {
        fieldsHtml += '<div class="pt-record-field" style="background:' + f.bg + '; padding:12px 16px; border-radius:4px; margin-bottom:8px;">'
            + '<span class="pt-field-label" style="font-weight:700; color:' + f.labelColor + ';">' + f.label + ' </span>'
            + '<span class="pt-field-value" contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="' + f.field + '" onblur="savePatientField(this)" style="white-space:pre-wrap; color:#1a1a1a; outline:none;">' + escapeHtml(patient[f.field] || '') + '</span>'
            + '</div>';
    });

    // Imaging table
    const imagingFields = [
        { field: 'lastFMX', label: 'Last FMX:' },
        { field: 'lastBW', label: 'Last BW:' },
        { field: 'lastCBCT', label: 'Last CBCT:' },
        { field: 'lastPANO', label: 'Last PANO:' }
    ];
    let imagingRows = '';
    imagingFields.forEach(function(f) {
        imagingRows += '<tr>'
            + '<td style="padding:8px 12px; font-weight:600; color:#434343; border:1px solid #d4d4d4; background:#f5f5f5; width:120px;">' + f.label + '</td>'
            + '<td style="padding:8px 12px; border:1px solid #d4d4d4; background:#ffffff;">'
            + '<span contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="' + f.field + '" onblur="savePatientField(this)" style="white-space:pre-wrap; color:#1a1a1a; outline:none; display:block; min-width:200px;">' + escapeHtml(patient[f.field] || '') + '</span>'
            + '</td>'
            + '</tr>';
    });

    // Reliability selector
    const reliabilityOptions = ['green', 'yellow', 'red'];
    let reliabilityHtml = '<div style="display:flex; gap:6px; align-items:center; margin-bottom:12px;">'
        + '<span style="font-weight:600; color:#64748b; font-size:0.85em;">Reliability:</span>';
    reliabilityOptions.forEach(function(r) {
        const colors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
        const isSelected = (patient.reliability || 'yellow') === r;
        reliabilityHtml += '<span onclick="setPatientReliability(\'' + escapeHtml(patientId) + '\', \'' + r + '\')" '
            + 'style="width:20px; height:20px; border-radius:50%; background:' + colors[r] + '; cursor:pointer; display:inline-block; '
            + 'border:3px solid ' + (isSelected ? '#ffffff' : 'transparent') + '; '
            + 'box-shadow:' + (isSelected ? '0 0 0 2px ' + colors[r] : 'none') + ';"'
            + '></span>';
    });
    reliabilityHtml += '</div>';

    // Delete button
    var deleteBtn = '<button onclick="deletePatientRecord(\'' + escapeHtml(patientId) + '\')" '
        + 'style="padding:6px 14px; background:#7f1d1d; border:1px solid #991b1b; border-radius:6px; color:#fca5a5; font-size:0.8em; cursor:pointer; float:right;">'
        + 'Delete Patient</button>';

    container.innerHTML = ''
        // Requirement badges
        + '<div style="margin-bottom:12px;">' + badgesHtml + '</div>'
        // Header row
        + '<div style="background:#4a4a4a; padding:14px 18px; border-radius:6px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">'
        +   '<div style="color:#ffffff; font-weight:700; font-size:1.1em;">Chart #: ' + escapeHtml(patient.chartNumber || '') + ' ' + escapeHtml(patient.name || '') + '</div>'
        +   '<div style="color:#e0e0e0; font-size:0.9em;">Type: ' + escapeHtml(patient.type || '') + '</div>'
        + '</div>'
        // Reliability + delete
        + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">'
        +   reliabilityHtml
        +   deleteBtn
        + '</div>'
        // Fields
        + fieldsHtml
        // Imaging table
        + '<table style="width:100%; border-collapse:collapse; margin-bottom:8px; border-radius:4px; overflow:hidden;">'
        +   imagingRows
        + '</table>'
        // Notes field
        + '<div class="pt-record-field" style="background:#fff2cc; padding:12px 16px; border-radius:4px; margin-bottom:8px; min-height:120px;">'
        +   '<span class="pt-field-label" style="font-weight:700; color:#990000;">NOTES: </span>'
        +   '<span class="pt-field-value" contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="notes" onblur="savePatientField(this)" style="white-space:pre-wrap; color:#1a1a1a; outline:none; display:block; margin-top:6px; min-height:80px;">' + escapeHtml(patient.notes || '') + '</span>'
        + '</div>';
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

function savePatientField(element) {
    var patientId = element.getAttribute('data-patient-id');
    var field = element.getAttribute('data-field');
    if (!patientId || !field) return;

    var records = getPatientRecords();
    if (!records[patientId]) return;

    records[patientId][field] = element.innerText;
    records[patientId].lastUpdated = new Date().toISOString();
    saveData();
}

function setPatientReliability(patientId, reliability) {
    var records = getPatientRecords();
    if (!records[patientId]) return;
    records[patientId].reliability = reliability;
    records[patientId].lastUpdated = new Date().toISOString();
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

    // Combine searchable text
    var searchText = [
        patient.txPlan || '',
        patient.nextVisit || '',
        patient.txSummaryBU || '',
        patient.dentalHx || ''
    ].join(' ').toLowerCase();

    var matches = [];
    var seenReqs = {};

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
        var sections = getValues(cat.sections);
        for (var s = 0; s < sections.length; s++) {
            var items = getValues(sections[s].items);
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
        var sections = getValues(cat.sections);
        for (var s = 0; s < sections.length; s++) {
            var items = getValues(sections[s].items);
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
    if (!matches || matches.length === 0) {
        return '<div style="color:#64748b; font-size:0.82em; font-style:italic;">No outstanding requirements matched for this patient.</div>';
    }

    var html = '';

    // High value patient banner
    if (matches.length >= 3) {
        html += '<div style="background:linear-gradient(90deg, #92400e, #78350f); border:1px solid #d97706; border-radius:6px; padding:8px 14px; margin-bottom:8px; text-align:center;">'
            + '<span style="color:#fbbf24; font-weight:700; font-size:0.9em;">HIGH VALUE PATIENT &mdash; ' + matches.length + ' outstanding requirements matchable</span>'
            + '</div>';
    }

    html += '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
    matches.forEach(function(m) {
        html += '<span style="display:inline-flex; align-items:center; gap:4px; background:' + m.categoryColor + '22; border:1px solid ' + m.categoryColor + '55; color:' + m.categoryColor + '; border-radius:12px; padding:3px 10px; font-size:0.75em; font-weight:600;">'
            + escapeHtml(m.category) + ': ' + escapeHtml(m.reqLabel)
            + '</span>';
    });
    html += '</div>';

    return html;
}


// ==================== SECTION 5: COUNTDOWN RADAR ====================

function renderCountdownRadar() {
    var container = document.getElementById('patientsCountdownRadar');
    if (!container) return;

    // Days until May 15, 2026
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var target = new Date(2026, 4, 15); // May 15, 2026
    var daysRemaining = Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24)));

    // Count outstanding requirements from competencies
    var competencies = getCompetenciesData();
    var outstandingCount = 0;
    var categoryData = [];

    Object.entries(competencies).forEach(function(entry) {
        var catKey = entry[0];
        var cat = entry[1];
        var stats = calculateCategoryStats(cat);
        var outstanding = stats.totalItems - stats.completed;
        outstandingCount += outstanding;
        categoryData.push({
            name: cat.name || catKey,
            color: cat.color || '#64748b',
            completed: stats.completed,
            total: stats.totalItems,
            pctDone: stats.totalItems > 0 ? Math.round((stats.completed / stats.totalItems) * 100) : 0
        });
    });

    // Pace calculation
    var weeksRemaining = Math.max(1, daysRemaining / 7);
    var pace = (outstandingCount / weeksRemaining).toFixed(1);

    // Burndown color
    var burndownColor = '#22c55e';
    if (daysRemaining <= 30) burndownColor = '#ef4444';
    else if (daysRemaining <= 90) burndownColor = '#f59e0b';

    // Pace color
    var paceColor = '#22c55e';
    var paceNum = parseFloat(pace);
    if (paceNum >= 4) paceColor = '#ef4444';
    else if (paceNum >= 2) paceColor = '#f59e0b';

    // Category mini progress bars
    var miniProgressHtml = '';
    categoryData.forEach(function(c) {
        miniProgressHtml += '<div style="flex:1; min-width:80px; background:#1e293b; border-radius:6px; padding:6px 8px; text-align:center;">'
            + '<div style="font-size:0.7em; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(c.name) + '</div>'
            + '<div style="font-size:0.85em; font-weight:700; color:' + c.color + ';">' + c.completed + '/' + c.total + '</div>'
            + '<div style="height:3px; background:#374151; border-radius:2px; margin-top:3px;">'
            + '<div style="height:100%; background:' + c.color + '; border-radius:2px; width:' + c.pctDone + '%;"></div>'
            + '</div>'
            + '</div>';
    });

    // High-value patients
    var records = getPatientRecords();
    var highValueNames = [];
    Object.keys(records).forEach(function(id) {
        var patient = records[id];
        if (!patient) return;
        var matches = computeRequirementMatches(patient);
        if (matches.length >= 3) {
            highValueNames.push(patient.name || 'Unknown');
        }
    });
    var highValueHtml = highValueNames.length > 0
        ? highValueNames.map(function(n) { return escapeHtml(n); }).join(', ')
        : 'None identified';

    // Dashboard snapshot KPIs
    var dashKpiHtml = '';
    var snapshots = getDashboardSnapshots();
    if (snapshots.length > 0) {
        var latest = snapshots[0];
        var apts = latest.appointments || {};
        var procs = latest.procedures || {};
        var notesColor = (apts.notesAtRisk || 0) >= 6 ? '#ef4444' : (apts.notesAtRisk || 0) >= 5 ? '#f59e0b' : '#22c55e';
        dashKpiHtml = '<div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">'
            + '<div style="flex:1; min-width:140px; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); border-radius:8px; padding:12px; text-align:center;">'
            +   '<div style="font-size:0.75em; color:#93c5fd; text-transform:uppercase; letter-spacing:0.05em;">Appointments</div>'
            +   '<div style="font-size:1.8em; font-weight:800; color:#3b82f6;">' + (apts.attended || 0) + '<span style="font-size:0.5em; color:#64748b;">/90</span></div>'
            +   '<div style="font-size:0.75em; color:#64748b;">+' + (apts.booked || 0) + ' booked → ' + (apts.projected || 0) + '/90</div>'
            + '</div>'
            + '<div style="flex:1; min-width:140px; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.3); border-radius:8px; padding:12px; text-align:center;">'
            +   '<div style="font-size:0.75em; color:#c4b5fd; text-transform:uppercase; letter-spacing:0.05em;">Procedures</div>'
            +   '<div style="font-size:1.8em; font-weight:800; color:#a855f7;">' + (procs.totalCompleted || 0) + '<span style="font-size:0.5em; color:#64748b;">/116</span></div>'
            +   '<div style="font-size:0.75em; color:#64748b;">~' + (procs.weeklyPaceNeeded || '?') + '/week needed</div>'
            + '</div>'
            + '<div style="flex:1; min-width:140px; background:rgba(' + (notesColor === '#ef4444' ? '239,68,68' : notesColor === '#f59e0b' ? '245,158,11' : '34,197,94') + ',0.1); border:1px solid rgba(' + (notesColor === '#ef4444' ? '239,68,68' : notesColor === '#f59e0b' ? '245,158,11' : '34,197,94') + ',0.3); border-radius:8px; padding:12px; text-align:center;">'
            +   '<div style="font-size:0.75em; color:' + notesColor + '; text-transform:uppercase; letter-spacing:0.05em;">Notes Risk</div>'
            +   '<div style="font-size:1.8em; font-weight:800; color:' + notesColor + ';">' + (apts.notesAtRisk || 0) + '</div>'
            +   '<div style="font-size:0.75em; color:#64748b;">Unclosed: ' + (apts.unclosed || 0) + ' | Blank: ' + (apts.blank || 0) + '</div>'
            + '</div>'
            + '</div>';
    }

    container.innerHTML = dashKpiHtml
        + '<div style="background:linear-gradient(135deg, #1e293b, #0f172a); border:1px solid #334155; border-radius:12px; padding:16px 20px; margin-bottom:16px;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">'
        +   '<div>'
        +     '<span style="font-size:2em; font-weight:800; color:' + burndownColor + ';">' + daysRemaining + '</span>'
        +     '<span style="color:#94a3b8; margin-left:4px;">days until May 15</span>'
        +   '</div>'
        +   '<div>'
        +     '<span style="font-size:2em; font-weight:800; color:#f59e0b;">' + outstandingCount + '</span>'
        +     '<span style="color:#94a3b8; margin-left:4px;">requirements remaining</span>'
        +   '</div>'
        +   '<div>'
        +     '<span style="font-size:2em; font-weight:800; color:' + paceColor + ';">~' + pace + '</span>'
        +     '<span style="color:#94a3b8; margin-left:4px;">per week needed</span>'
        +   '</div>'
        + '</div>'
        + '<div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">'
        +   miniProgressHtml
        + '</div>'
        + '<div style="margin-top:8px; font-size:0.85em; color:#fbbf24;">'
        +   'High-value: ' + highValueHtml
        + '</div>'
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
    var textarea = modal.querySelector('#patientImportTextarea');
    if (textarea) textarea.value = '';
    var preview = modal.querySelector('#patientImportPreview');
    if (preview) preview.innerHTML = '<div style="color:#64748b; padding:20px; text-align:center;">Paste text and click Preview to see what will be imported.</div>';
    var importBtn = modal.querySelector('#patientImportConfirmBtn');
    if (importBtn) importBtn.disabled = true;

    modal.style.display = 'flex';
}

function buildImportModalHtml() {
    return '<div style="background:#1e293b; border-radius:16px; padding:24px; max-width:700px; width:95%; max-height:90vh; display:flex; flex-direction:column; border:1px solid #334155;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
        +   '<h3 style="color:#60a5fa; margin:0; font-size:1.2em;">Import from Claude</h3>'
        +   '<button onclick="closePatientImportModal()" style="background:none; border:none; color:#94a3b8; font-size:1.4em; cursor:pointer; padding:4px 8px;">&times;</button>'
        + '</div>'
        + '<textarea id="patientImportTextarea" placeholder="Paste Claude output here...\n\nSupported formats:\n--- PATIENT_RECORD ---\nNAME: Last, First\nCHART: 1234567\n...\n\n--- PATIENT_UPDATE ---\nCHART: 1234567\nNOTES_APPEND: New note text\n...\n\n--- REQUIREMENTS_MATCH ---\nCAN_FULFILL: req-id | description | procedure\n...\n\n--- REQUIREMENTS_STATUS ---\nUPDATES: req-id | completed: 1 | note: text\n..." '
        +   'style="flex:1; min-height:200px; padding:12px; background:#0f172a; border:1px solid #334155; border-radius:8px; color:#e2e8f0; font-family:monospace; font-size:0.85em; resize:vertical; outline:none; margin-bottom:12px;"></textarea>'
        + '<div style="display:flex; gap:8px; margin-bottom:12px;">'
        +   '<button onclick="previewPatientImport()" style="flex:1; padding:10px; background:#1e40af; border:none; border-radius:8px; color:#93c5fd; font-weight:600; cursor:pointer;">Preview</button>'
        +   '<button id="patientImportConfirmBtn" onclick="confirmPatientImport()" disabled style="flex:1; padding:10px; background:#065f46; border:none; border-radius:8px; color:#6ee7b7; font-weight:600; cursor:pointer; opacity:0.5;">Import</button>'
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
    var result = { records: [], updates: [], reqMatches: [], reqStatuses: [], dashboardUpdate: null };
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
        } else {
            // Auto-detect: patient record if has NAME: or CHART:
            if (block.indexOf('NAME:') !== -1 || block.indexOf('CHART:') !== -1) {
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
        'DENTAL_HX': 'dentalHx', 'TX_SUMMARY_BU': 'txSummaryBU',
        'POE_LAST': 'poeLast', 'POE_NEXT': 'poeNext',
        'TX_PLAN': 'txPlan', 'LAST_VISIT': 'lastVisit',
        'NEXT_VISIT': 'nextVisit', 'LAST_FMX': 'lastFMX',
        'LAST_BW': 'lastBW', 'LAST_CBCT': 'lastCBCT',
        'LAST_PANO': 'lastPANO', 'NOTES': 'notes',
        'RELIABILITY': 'reliability'
    };

    var lines = text.split('\n');
    var currentKey = null;

    lines.forEach(function(line) {
        // Check if line starts with a known key
        var matched = false;
        Object.keys(fieldMap).forEach(function(key) {
            if (line.trimStart().toUpperCase().indexOf(key + ':') === 0) {
                currentKey = fieldMap[key];
                var value = line.substring(line.indexOf(':') + 1).trim();
                record[currentKey] = value;
                matched = true;
            }
        });
        // Continuation line (starts with 2+ spaces and we have a current key)
        if (!matched && currentKey && /^\s{2,}/.test(line)) {
            record[currentKey] = (record[currentKey] || '') + '\n' + line.trim();
        }
    });

    return record;
}

function parsePatientUpdate(text) {
    var update = { _notesAppend: false };
    var fieldMap = {
        'NAME': 'name', 'CHART': 'chartNumber', 'TYPE': 'type',
        'MEDICAL_HX': 'medicalHx', 'MEDICATIONS': 'medications',
        'DENTAL_HX': 'dentalHx', 'TX_SUMMARY_BU': 'txSummaryBU',
        'POE_LAST': 'poeLast', 'POE_NEXT': 'poeNext',
        'TX_PLAN': 'txPlan', 'LAST_VISIT': 'lastVisit',
        'NEXT_VISIT': 'nextVisit', 'LAST_FMX': 'lastFMX',
        'LAST_BW': 'lastBW', 'LAST_CBCT': 'lastCBCT',
        'LAST_PANO': 'lastPANO', 'NOTES': 'notes',
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

        if (!matched && currentKey && /^\s{2,}/.test(line)) {
            update[currentKey] = (update[currentKey] || '') + '\n' + line.trim();
        }
    });

    return update;
}

function parseRequirementsMatch(text) {
    var result = { canFulfill: [], completedToday: [] };
    var lines = text.split('\n');

    lines.forEach(function(line) {
        var trimmed = line.trim();
        var upper = trimmed.toUpperCase();

        if (upper.indexOf('CAN_FULFILL:') === 0) {
            var value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            var parts = value.split('|').map(function(s) { return s.trim(); });
            if (parts.length >= 1) {
                result.canFulfill.push({
                    reqId: parts[0],
                    description: parts[1] || '',
                    procedure: parts[2] || ''
                });
            }
        } else if (upper.indexOf('COMPLETED_TODAY:') === 0) {
            var value2 = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            var parts2 = value2.split('|').map(function(s) { return s.trim(); });
            if (parts2.length >= 1) {
                result.completedToday.push({
                    reqId: parts2[0],
                    description: parts2[1] || '',
                    procedure: parts2[2] || '',
                    date: parts2[3] || ''
                });
            }
        }
    });

    return result;
}

function parseRequirementsStatus(text) {
    var statuses = [];
    var lines = text.split('\n');

    lines.forEach(function(line) {
        var trimmed = line.trim();
        var upper = trimmed.toUpperCase();

        if (upper.indexOf('UPDATES:') === 0) {
            var value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            var parts = value.split('|').map(function(s) { return s.trim(); });
            if (parts.length >= 1) {
                var status = { reqId: parts[0] };
                for (var i = 1; i < parts.length; i++) {
                    var kv = parts[i].split(':').map(function(s) { return s.trim(); });
                    if (kv[0] === 'completed') status.completed = parseInt(kv[1], 10) || 0;
                    if (kv[0] === 'note') status.note = kv.slice(1).join(':').trim();
                }
                statuses.push(status);
            }
        }
    });

    return statuses;
}

function previewPatientImport() {
    var textarea = document.getElementById('patientImportTextarea');
    var preview = document.getElementById('patientImportPreview');
    var importBtn = document.getElementById('patientImportConfirmBtn');
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

    if (!hasContent) {
        html = '<div style="color:#f87171; padding:16px; text-align:center;">No parseable content found. Make sure the text uses the correct format with --- delimiters.</div>';
    }

    preview.innerHTML = html;
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

    // Apply records (create or update)
    parsed.records.forEach(function(rec) {
        var chartNumber = (rec.chartNumber || '').trim();
        var id = chartNumber ? 'pt_' + chartNumber : generateId('pt');

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
                medicalHx: '', medications: '', dentalHx: '', txSummaryBU: '',
                poeLast: '', poeNext: '', txPlan: '',
                lastVisit: '', nextVisit: '',
                lastFMX: '', lastBW: '', lastCBCT: '', lastPANO: '',
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
            // Patient not found, skip
            return;
        }
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

    // Apply requirement statuses
    if (parsed.reqStatuses.length > 0) {
        applyRequirementCheckoffs(parsed.reqStatuses);
    }

    // Handle completed-today from reqMatches
    var completedItems = [];
    parsed.reqMatches.forEach(function(rm) {
        rm.completedToday.forEach(function(ct) {
            completedItems.push({ reqId: ct.reqId, completed: 1, note: ct.procedure || ct.description || '' });
        });
    });
    if (completedItems.length > 0) {
        applyRequirementCheckoffs(completedItems);
    }

    // Save dashboard snapshot
    if (parsed.dashboardUpdate) {
        saveDashboardSnapshot(parsed.dashboardUpdate);
    }

    saveData();

    // Re-render
    closePatientImportModal();
    renderCountdownRadar();
    renderPatientsSidebar();
    if (activePatientId && records[activePatientId]) {
        renderPatientRecord(activePatientId);
    }

    var msg = '';
    if (created > 0) msg += created + ' patient(s) created. ';
    if (updated > 0) msg += updated + ' patient(s) updated. ';
    if (parsed.reqStatuses.length > 0 || completedItems.length > 0) msg += 'Requirements updated. ';
    if (parsed.dashboardUpdate) msg += 'Dashboard snapshot saved. ';
    showToast(msg || 'Import complete');
}

function applyRequirementCheckoffs(items) {
    if (!items || items.length === 0) return;

    var competencies = getCompetenciesData();
    if (!competencies) return;

    items.forEach(function(item) {
        for (var catKey in competencies) {
            var cat = competencies[catKey];
            var sections = cat.sections;
            if (!sections) continue;

            // Sections can be object or array
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
                            // Object-based: find the key matching this item's id
                            for (var key in sec.items) {
                                if (sec.items[key] && sec.items[key].id === item.reqId) {
                                    sec.items[key].completed = itemList[i].completed;
                                    if (item.note) sec.items[key].note = item.note;
                                    break;
                                }
                            }
                        }
                        return; // Found and updated, move to next item
                    }
                }
            }
        }
    });

    // Refresh competencies display if available
    if (typeof renderCompetencies === 'function') {
        try { renderCompetencies(); } catch (e) { /* ignore */ }
    }

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
    if (!container) return;

    var snapshots = getDashboardSnapshots();
    if (snapshots.length === 0) {
        container.innerHTML = '';
        return;
    }

    var latest = snapshots[0];
    var apts = latest.appointments || {};
    var procs = latest.procedures || {};
    var rost = latest.roster || {};
    var cp = latest.clinicalProgress || {};
    var delta = latest.delta || {};

    // Notes color
    var nar = apts.notesAtRisk || 0;
    var notesColor = nar >= 6 ? '#ef4444' : nar >= 5 ? '#f59e0b' : '#22c55e';
    var notesBg = nar >= 6 ? 'rgba(239,68,68,0.1)' : nar >= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';
    var notesBorder = nar >= 6 ? 'rgba(239,68,68,0.3)' : nar >= 5 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)';

    // Clinical progress categories
    var categories = [
        { key: 'fixed', label: 'Fixed', target: 10, color: '#3b82f6' },
        { key: 'operative', label: 'Operative', target: 8, color: '#10b981' },
        { key: 'remoComplete', label: 'Dentures', target: 4, color: '#8b5cf6' },
        { key: 'perioSrp', label: 'Perio SRP', target: 3, color: '#ef4444' },
        { key: 'remoPartial', label: 'RPD', target: 1, color: '#f59e0b' },
        { key: 'endo', label: 'Endo', target: 2, color: '#06b6d4' },
        { key: 'implant', label: 'Implant', target: 1, color: '#ec4899' },
        { key: 'bridge', label: 'Bridge', target: 1, color: '#6366f1' },
        { key: 'overdenture', label: 'Overdenture', target: 1, color: '#84cc16' },
        { key: 'implSurg', label: 'Impl Surg', target: 0, color: '#a1a1aa' }
    ];

    var cpGridHtml = '';
    categories.forEach(function(cat) {
        var data = cp[cat.key] || {};
        var c = data.c || 0;
        var ip = data.ip || 0;
        var p = data.p || 0;
        var target = cat.target;
        var pctDone = target > 0 ? Math.min(100, Math.round((c / target) * 100)) : (c > 0 ? 100 : 0);

        // Status color
        var statusColor = '#ef4444'; // red = gap
        if (c >= target && target > 0) statusColor = '#22c55e'; // green = done
        else if (c + ip + p >= target && target > 0) statusColor = '#f59e0b'; // yellow = pipeline exists

        // Delta for this category
        var catDelta = delta[cat.key + '_c'] ? ' (' + delta[cat.key + '_c'] + ')' : '';

        cpGridHtml += '<div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">'
            + '<div style="width:80px; font-size:0.8em; color:#94a3b8; font-weight:600;">' + cat.label + '</div>'
            + '<div style="width:50px; text-align:center;">'
            +   '<span style="font-size:0.9em; font-weight:700; color:' + statusColor + ';">' + c + '</span>'
            +   (target > 0 ? '<span style="font-size:0.7em; color:#64748b;">/' + target + '</span>' : '')
            + '</div>'
            + '<div style="flex:1; height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">'
            +   '<div style="height:100%; background:' + cat.color + '; border-radius:3px; width:' + pctDone + '%;"></div>'
            + '</div>'
            + '<div style="width:80px; font-size:0.72em; color:#64748b; text-align:right;">'
            +   (ip > 0 ? 'IP:' + ip + ' ' : '') + (p > 0 ? 'P:' + p : '')
            +   '<span style="color:' + statusColor + ';">' + catDelta + '</span>'
            + '</div>'
            + '</div>';
    });

    // Delta summary text
    var deltaHtml = '';
    if (delta && Object.keys(delta).length > 0) {
        var deltaParts = [];
        if (delta.attended) deltaParts.push('Apts: ' + delta.attended);
        if (delta.totalCompleted) deltaParts.push('Procs: ' + delta.totalCompleted);
        Object.keys(delta).forEach(function(k) {
            if (k.endsWith('_c') && delta[k]) {
                var catLabel = k.replace('_c', '');
                deltaParts.push(catLabel + ' C: ' + delta[k]);
            }
        });
        if (deltaParts.length > 0) {
            deltaHtml = '<div style="margin-top:8px; padding:6px 10px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.2); border-radius:6px; font-size:0.78em; color:#4ade80;">'
                + 'Since last update: ' + deltaParts.join(' | ')
                + '</div>';
        }
    }

    // Alerts
    var alertsHtml = '';
    if (latest.alerts && latest.alerts.length > 0) {
        latest.alerts.forEach(function(alert) {
            alertsHtml += '<div style="padding:6px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:6px; font-size:0.8em; color:#f87171; margin-top:4px;">'
                + escapeHtml(alert)
                + '</div>';
        });
    }

    container.innerHTML = '<div style="background:#111827; border:1px solid #1e293b; border-radius:12px; padding:16px; margin-bottom:12px;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">'
        +   '<div style="font-weight:700; color:#e2e8f0; font-size:1.05em;">SPS Dashboard</div>'
        +   '<div style="font-size:0.75em; color:#64748b;">Updated: ' + escapeHtml(latest.capturedAt || 'Unknown') + '</div>'
        + '</div>'
        // Three KPI blocks
        + '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:14px;">'
        +   '<div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); border-radius:8px; padding:10px; text-align:center;">'
        +     '<div style="font-size:0.7em; color:#93c5fd; text-transform:uppercase; letter-spacing:0.05em;">Appointments</div>'
        +     '<div style="font-size:1.6em; font-weight:800; color:#3b82f6;">' + (apts.attended || 0) + '<span style="font-size:0.45em; color:#64748b; font-weight:400;">/90</span></div>'
        +     '<div style="font-size:0.7em; color:#64748b;">+' + (apts.booked || 0) + ' booked → ' + (apts.projected || 0) + '/90</div>'
        +   '</div>'
        +   '<div style="background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.2); border-radius:8px; padding:10px; text-align:center;">'
        +     '<div style="font-size:0.7em; color:#c4b5fd; text-transform:uppercase; letter-spacing:0.05em;">Procedures</div>'
        +     '<div style="font-size:1.6em; font-weight:800; color:#a855f7;">' + (procs.totalCompleted || 0) + '<span style="font-size:0.45em; color:#64748b; font-weight:400;">/116</span></div>'
        +     '<div style="font-size:0.7em; color:#64748b;">~' + (procs.weeklyPaceNeeded || '?') + '/week needed</div>'
        +   '</div>'
        +   '<div style="background:' + notesBg + '; border:1px solid ' + notesBorder + '; border-radius:8px; padding:10px; text-align:center;">'
        +     '<div style="font-size:0.7em; color:' + notesColor + '; text-transform:uppercase; letter-spacing:0.05em;">Notes Risk</div>'
        +     '<div style="font-size:1.6em; font-weight:800; color:' + notesColor + ';">' + nar + '</div>'
        +     '<div style="font-size:0.7em; color:#64748b;">Unclosed: ' + (apts.unclosed || 0) + ' | Blank: ' + (apts.blank || 0) + '</div>'
        +   '</div>'
        + '</div>'
        // Clinical progress grid
        + '<div style="font-weight:600; color:#94a3b8; font-size:0.8em; margin-bottom:6px;">CLINICAL PROGRESS</div>'
        + cpGridHtml
        // Roster
        + '<div style="margin-top:10px; font-size:0.78em; color:#64748b;">'
        +   'Roster: ' + (rost.ptsAssigned || 0) + ' pts | ' + (rost.notSeen6Mo || 0) + ' not seen 6mo | ' + (rost.tpNotConsented || 0) + ' no TP consent | ' + (apts.missed || 0) + ' missed'
        + '</div>'
        + deltaHtml
        + alertsHtml
        + '</div>';
}
