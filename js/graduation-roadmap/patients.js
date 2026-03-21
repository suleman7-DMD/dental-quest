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
var patientEditMode = false;
var collapsedSections = {};

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
    var existingSearch = container.querySelector('.pt-sidebar-search');
    var searchTerm = existingSearch ? existingSearch.value.toLowerCase() : '';
    var currentFilter = container.dataset.filter || 'all';

    var dotColors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
    var allItems = [];
    Object.keys(records).forEach(function(id) {
        var p = records[id];
        if (!p) return;
        var name = p.name || 'Unnamed';
        if (searchTerm && !name.toLowerCase().includes(searchTerm) && !(p.chartNumber || '').toLowerCase().includes(searchTerm)) return;
        allItems.push({ id: id, patient: p });
    });

    // Count by category
    var greenCount = 0, attentionCount = 0;
    allItems.forEach(function(item) {
        if (item.patient.reliability === 'green') greenCount++;
        else attentionCount++;
    });

    // Apply filter
    var filtered = allItems;
    if (currentFilter === 'active') filtered = allItems.filter(function(i) { return i.patient.reliability === 'green'; });
    else if (currentFilter === 'attention') filtered = allItems.filter(function(i) { return i.patient.reliability !== 'green'; });

    var listHtml = '';
    filtered.forEach(function(item) {
        var p = item.patient;
        var isActive = item.id === activePatientId;
        var dotColor = dotColors[p.reliability] || '#6b7280';

        listHtml += '<div onclick="selectPatient(\'' + escapeHtml(item.id) + '\')" '
            + 'title="Chart #' + escapeHtml(p.chartNumber || 'N/A') + (p.nextVisit ? ' | Next: ' + escapeHtml((p.nextVisit || '').substring(0, 30)) : '') + '" '
            + 'style="display:flex; align-items:center; gap:8px; padding:7px 12px; cursor:pointer; '
            + 'border-left:3px solid ' + (isActive ? '#3b82f6' : 'transparent') + '; '
            + 'background:' + (isActive ? 'rgba(59,130,246,0.1)' : 'transparent') + '; '
            + 'transition:all 0.12s;" '
            + 'onmouseenter="if(\'' + item.id + '\'!==activePatientId)this.style.background=\'rgba(255,255,255,0.03)\'" '
            + 'onmouseleave="if(\'' + item.id + '\'!==activePatientId)this.style.background=\'transparent\'">'
            + '<span style="width:7px; height:7px; border-radius:50%; background:' + dotColor + '; flex-shrink:0;"></span>'
            + '<span style="color:' + (isActive ? '#f1f5f9' : '#94a3b8') + '; font-size:0.82em; font-weight:' + (isActive ? '600' : '400') + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">' + escapeHtml(p.name || 'Unnamed') + '</span>'
            + '</div>';
    });

    function filterBtn(value, label, count) {
        var isOn = currentFilter === value;
        return '<button onclick="this.closest(\'#patientsSidebar\').dataset.filter=\'' + value + '\'; renderPatientsSidebar()" '
            + 'style="padding:3px 8px; font-size:0.68em; border-radius:10px; cursor:pointer; border:1px solid ' + (isOn ? '#3b82f6' : '#334155') + '; '
            + 'background:' + (isOn ? 'rgba(59,130,246,0.2)' : 'transparent') + '; color:' + (isOn ? '#93c5fd' : '#64748b') + '; font-weight:600; transition:all 0.15s;">'
            + label + ' (' + count + ')</button>';
    }

    container.innerHTML = '<div style="padding:10px 10px 8px;">'
        +   '<input type="text" class="pt-sidebar-search" placeholder="Search..." '
        +     'value="' + escapeHtml(searchTerm) + '" oninput="renderPatientsSidebar()" '
        +     'style="width:100%; padding:6px 9px; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#e2e8f0; font-size:0.8em; outline:none; box-sizing:border-box; margin-bottom:6px;">'
        +   '<div style="display:flex; gap:4px; margin-bottom:6px;">'
        +     filterBtn('all', 'All', allItems.length) + filterBtn('active', 'Active', greenCount) + filterBtn('attention', 'Attn', attentionCount)
        +   '</div>'
        +   '<div style="display:flex; gap:5px;">'
        +     '<button onclick="openPatientImportModal()" style="flex:1; padding:5px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); border-radius:5px; color:#a5b4fc; font-size:0.7em; cursor:pointer; font-weight:600;">Import</button>'
        +     '<button onclick="addNewPatientRecord()" style="flex:1; padding:5px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:5px; color:#6ee7b7; font-size:0.7em; cursor:pointer; font-weight:600;">+ New</button>'
        +   '</div>'
        + '</div>'
        + '<div style="flex:1; overflow-y:auto;">' + listHtml + '</div>';
}

function selectPatient(patientId) {
    activePatientId = patientId;
    patientEditMode = false;
    renderPatientsSidebar();
    renderPatientRecord(patientId);
}

function renderPatientRecord(patientId) {
    var container = document.getElementById('patientRecordView');
    if (!container) return;

    var records = getPatientRecords();
    var patient = records[patientId];
    if (!patient) {
        container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#475569;">Select a patient</div>';
        return;
    }

    var matches = computeRequirementMatches(patient);
    var isEdit = patientEditMode;

    // Helper: render a field
    function fld(fieldName, label, accentColor) {
        var val = patient[fieldName] || '';
        if (isEdit) {
            return '<div style="margin-bottom:5px;">'
                + '<div style="font-size:0.65em; font-weight:600; color:' + accentColor + '; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px;">' + label + '</div>'
                + '<div contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="' + fieldName + '" onblur="savePatientField(this)" '
                + 'style="background:#0f172a; border:1px solid #334155; border-left:3px solid ' + accentColor + '; border-radius:6px; padding:8px 12px; font-size:0.85em; color:#e2e8f0; white-space:pre-wrap; word-break:break-word; outline:none; min-height:24px; line-height:1.5; cursor:text;" '
                + 'onfocus="this.style.borderColor=\'#475569\'; this.style.borderLeftColor=\'' + accentColor + '\'" '
                + 'onblur="savePatientField(this); this.style.borderColor=\'#334155\'; this.style.borderLeftColor=\'' + accentColor + '\'">'
                + escapeHtml(val)
                + '</div></div>';
        } else {
            if (!val) return '';
            return '<div style="margin-bottom:5px; background:#0b1120; border:1px solid #1a2435; border-left:3px solid ' + accentColor + '33; border-radius:6px; padding:8px 12px;">'
                + '<span style="font-size:0.65em; font-weight:600; color:' + accentColor + '; text-transform:uppercase; letter-spacing:0.06em;">' + label + '</span>'
                + '<div style="font-size:0.85em; color:#cbd5e1; line-height:1.5; margin-top:2px; white-space:pre-wrap; word-break:break-word;">' + escapeHtml(val) + '</div>'
                + '</div>';
        }
    }

    // Collapsible section
    function section(id, title, content) {
        var isCollapsed = collapsedSections[id] || false;
        return '<div style="margin-bottom:10px;">'
            + '<div onclick="collapsedSections[\'' + id + '\']=!collapsedSections[\'' + id + '\']; renderPatientRecord(\'' + escapeHtml(patientId) + '\')" '
            + 'style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:6px; user-select:none;">'
            +   '<span style="font-size:0.6em; color:#475569;">' + (isCollapsed ? '\u25B6' : '\u25BC') + '</span>'
            +   '<span style="font-size:0.68em; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.1em;">' + title + '</span>'
            + '</div>'
            + '<div style="display:' + (isCollapsed ? 'none' : 'block') + ';">' + content + '</div>'
            + '</div>';
    }

    // Imaging inline
    function imgInline() {
        var fields = [
            { f: 'lastFMX', l: 'FMX' }, { f: 'lastBW', l: 'BW' },
            { f: 'lastCBCT', l: 'CBCT' }, { f: 'lastPANO', l: 'PANO' }
        ];
        if (isEdit) {
            var html = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">';
            fields.forEach(function(x) {
                var val = patient[x.f] || '';
                var warn = val.toLowerCase().indexOf('due') !== -1 || val.toLowerCase().indexOf('need') !== -1;
                html += '<div style="background:#0f172a; border:1px solid #334155; border-radius:5px; padding:6px 10px;">'
                    + '<div style="font-size:0.6em; font-weight:600; color:#64748b; text-transform:uppercase;">' + x.l + '</div>'
                    + '<div contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="' + x.f + '" onblur="savePatientField(this)" '
                    + 'style="font-size:0.82em; color:' + (warn ? '#fbbf24' : '#e2e8f0') + '; outline:none; min-height:16px; white-space:pre-wrap; cursor:text;">'
                    + escapeHtml(val) + '</div></div>';
            });
            return html + '</div>';
        } else {
            var parts = [];
            fields.forEach(function(x) {
                var val = patient[x.f] || '\u2014';
                var warn = val.toLowerCase().indexOf('due') !== -1 || val.toLowerCase().indexOf('need') !== -1;
                parts.push('<div style="background:#0b1120; border:1px solid #1a2435; border-radius:5px; padding:5px 10px; flex:1; min-width:100px;">'
                    + '<span style="color:#64748b; font-size:0.65em; font-weight:600; text-transform:uppercase; display:block;">' + x.l + '</span>'
                    + '<span style="color:' + (warn ? '#fbbf24' : '#cbd5e1') + '; font-size:0.82em;">' + escapeHtml(val) + '</span>'
                    + '</div>');
            });
            return '<div style="display:flex; flex-wrap:wrap; gap:6px;">' + parts.join('') + '</div>';
        }
    }

    // Requirements summary (collapsed by default, expandable)
    var reqHtml = '';
    if (matches.length > 0) {
        var isHV = matches.length >= 3;
        var grouped = {};
        matches.forEach(function(m) { if (!grouped[m.category]) grouped[m.category] = []; grouped[m.category].push(m); });

        var expandId = 'reqExpand_' + patientId.replace(/[^a-zA-Z0-9]/g, '');
        reqHtml = '<div style="margin-bottom:10px;">'
            + (isHV ? '<div style="background:rgba(251,191,36,0.08); border:1px solid rgba(251,191,36,0.2); border-radius:6px; padding:5px 12px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">'
                + '<span style="color:#fbbf24; font-weight:700; font-size:0.78em;">HIGH VALUE</span>'
                + '<span style="color:#92400e; font-size:0.72em;">' + matches.length + ' requirements matchable</span></div>' : '')
            + '<div onclick="var d=document.getElementById(\'' + expandId + '\');d.style.display=d.style.display===\'none\'?\'block\':\'none\'" '
            + 'style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:4px 0;">'
            +   '<span style="font-size:0.75em; color:#6366f1; font-weight:600;">Can fulfill ' + matches.length + ' requirements</span>'
            +   '<span style="font-size:0.6em; color:#475569;">&#9660;</span>'
            + '</div>'
            + '<div id="' + expandId + '" style="display:none; padding:6px 0;">';
        Object.keys(grouped).forEach(function(cat) {
            reqHtml += '<div style="margin-bottom:4px;"><span style="font-size:0.65em; font-weight:600; color:' + grouped[cat][0].categoryColor + '; text-transform:uppercase;">' + escapeHtml(cat) + ': </span>';
            reqHtml += '<span style="font-size:0.72em; color:#94a3b8;">' + grouped[cat].map(function(m) { return escapeHtml(m.reqLabel); }).join(', ') + '</span></div>';
        });
        reqHtml += '</div></div>';
    }

    // Reliability dots
    var relColors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
    var currentRel = patient.reliability || 'yellow';
    var relHtml = '';
    ['green', 'yellow', 'red'].forEach(function(r) {
        var isSel = r === currentRel;
        relHtml += '<span onclick="setPatientReliability(\'' + escapeHtml(patientId) + '\', \'' + r + '\')" '
            + 'style="width:12px; height:12px; border-radius:50%; background:' + relColors[r] + '; cursor:pointer; display:inline-block; opacity:' + (isSel ? '1' : '0.25') + '; transition:opacity 0.15s;" '
            + 'onmouseenter="this.style.opacity=\'1\'" onmouseleave="this.style.opacity=\'' + (isSel ? '1' : '0.25') + '\'"></span>';
    });

    // Edit mode toggle button
    var editBtnHtml = '<button onclick="document.querySelectorAll(\'[contenteditable=true]\').forEach(function(el){el.blur()}); patientEditMode=!patientEditMode; renderPatientRecord(\'' + escapeHtml(patientId) + '\')" '
        + 'style="padding:4px 10px; background:' + (isEdit ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)') + '; border:1px solid ' + (isEdit ? '#3b82f6' : '#334155') + '; border-radius:5px; color:' + (isEdit ? '#93c5fd' : '#94a3b8') + '; font-size:0.72em; cursor:pointer; font-weight:600; transition:all 0.15s;">'
        + (isEdit ? 'Done Editing' : 'Edit') + '</button>';

    container.innerHTML = ''
        // Header
        + '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:10px; flex-wrap:wrap;">'
        +   '<div>'
        +     '<div style="font-size:1.2em; font-weight:800; color:#f1f5f9;">' + escapeHtml(patient.name || 'Unnamed') + '</div>'
        +     '<div style="display:flex; align-items:center; gap:8px; margin-top:3px; flex-wrap:wrap;">'
        +       '<span style="font-size:0.78em; color:#64748b;">#' + escapeHtml(patient.chartNumber || 'N/A') + '</span>'
        +       '<span style="font-size:0.68em; background:rgba(99,102,241,0.12); color:#a5b4fc; padding:1px 7px; border-radius:3px; white-space:pre-wrap;">' + escapeHtml(patient.type || 'Active') + '</span>'
        +       '<div style="display:flex; gap:4px; align-items:center;">' + relHtml + '</div>'
        +     '</div>'
        +   '</div>'
        +   '<div style="display:flex; gap:5px;">'
        +     editBtnHtml
        +     '<button onclick="navigator.clipboard.writeText(\'' + escapeHtml(patient.chartNumber || '') + '\');showToast(\'Copied\')" style="padding:4px 8px; background:rgba(255,255,255,0.04); border:1px solid #334155; border-radius:5px; color:#64748b; font-size:0.7em; cursor:pointer;">#Copy</button>'
        +     '<button onclick="deletePatientRecord(\'' + escapeHtml(patientId) + '\')" style="padding:4px 8px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.15); border-radius:5px; color:#ef4444; font-size:0.7em; cursor:pointer; opacity:0.6;" onmouseenter="this.style.opacity=\'1\'" onmouseleave="this.style.opacity=\'0.6\'">Del</button>'
        +   '</div>'
        + '</div>'

        // Requirements (collapsed)
        + reqHtml

        // Sections
        + section('info', 'Patient Information',
            fld('medicalHx', 'Medical History', '#ef4444')
            + fld('medications', 'Medications & Allergies', '#f87171'))

        + section('clinical', 'Clinical History',
            fld('dentalHx', 'Dental History', '#10b981')
            + fld('txSummaryBU', 'Treatment at BU', '#34d399'))

        + section('perio', 'Periodontal & Recall',
            fld('poeLast', 'Last POE / Prophy', '#f59e0b')
            + fld('poeNext', 'Next POE / Prophy', '#fbbf24'))

        + section('treatment', 'Treatment',
            fld('txPlan', 'Treatment Plan', '#3b82f6')
            + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">'
            + fld('lastVisit', 'Last Visit', '#60a5fa')
            + fld('nextVisit', 'Next Visit', '#93c5fd')
            + '</div>')

        + section('imaging', 'Imaging', imgInline())

        + section('notes', 'Notes',
            isEdit
                ? '<div contenteditable="true" data-patient-id="' + escapeHtml(patientId) + '" data-field="notes" onblur="savePatientField(this)" '
                  + 'style="background:#0f172a; border:1px solid #334155; border-left:3px solid #a855f7; border-radius:6px; padding:10px 12px; font-size:0.85em; color:#e2e8f0; white-space:pre-wrap; word-break:break-word; outline:none; min-height:100px; line-height:1.5; cursor:text;">'
                  + escapeHtml(patient.notes || '') + '</div>'
                : '<div style="background:#0b1120; border:1px solid #1a2435; border-left:3px solid #a855f733; border-radius:6px; padding:8px 12px; font-size:0.85em; color:#cbd5e1; line-height:1.5; white-space:pre-wrap; word-break:break-word; min-height:40px;">' + escapeHtml(patient.notes || '') + '</div>');
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

    var competencies = getCompetenciesData();
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

    // Dashboard snapshot data
    var snapshots = getDashboardSnapshots();
    var aptsHtml = '', procsHtml = '', notesHtml = '';
    if (snapshots.length > 0) {
        var s = snapshots[0];
        var a = s.appointments || {};
        var p = s.procedures || {};
        var notesRisk = a.notesAtRisk || 0;
        var nc = notesRisk >= 6 ? '#ef4444' : notesRisk >= 5 ? '#f59e0b' : '#64748b';
        aptsHtml = '<div class="pts-stat-chip" title="Attended appointments toward 90"><span style="color:#3b82f6; font-weight:700;">' + (a.attended||0) + '</span><span style="color:#64748b;">/90 apts</span></div>';
        procsHtml = '<div class="pts-stat-chip" title="Completed procedures toward 116"><span style="color:#a855f7; font-weight:700;">' + (p.totalCompleted||0) + '</span><span style="color:#64748b;">/116 procs</span></div>';
        notesHtml = '<div class="pts-stat-chip" title="Unclosed/blank notes (limit: 6)"><span style="color:' + nc + '; font-weight:700;">' + notesRisk + '</span><span style="color:#64748b;"> notes</span></div>';
    }

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
        +   'style="flex:1; min-height:200px; padding:12px; background:#0f172a; border:1px solid #334155; border-radius:8px; color:#e2e8f0; font-family:monospace; font-size:0.85em; resize:vertical; outline:none; margin-bottom:12px;"></textarea>'
        + '<div style="display:flex; gap:8px; margin-bottom:12px;">'
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
    var result = { canFulfill: [], completedToday: [], chartNumber: '', name: '' };
    var lines = text.split('\n');
    var inSection = null; // 'canFulfill' or 'completedToday'

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
                if (parts2[0]) result.completedToday.push({ reqId: parts2[0], description: parts2[1] || '', procedure: parts2[2] || '', date: parts2[3] || '' });
            }
            return;
        }
        // Other known headers exit the section
        if (upper.indexOf('HIGH_VALUE:') === 0 || upper.indexOf('PRIORITY_NOTES:') === 0 ||
            upper.indexOf('CHART:') === 0 || upper.indexOf('NAME:') === 0) {
            inSection = null;
            if (upper.indexOf('CHART:') === 0) result.chartNumber = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            if (upper.indexOf('NAME:') === 0) result.name = trimmed.substring(trimmed.indexOf(':') + 1).trim();
            return;
        }

        // In a section: parse lines with | delimiter as entries
        if (inSection && trimmed.indexOf('|') !== -1) {
            if (trimmed.toLowerCase().indexOf('(none') === 0 || trimmed.toLowerCase().indexOf('none') === 0) return;
            var parts3 = trimmed.split('|').map(function(s) { return s.trim(); });
            if (!parts3[0]) return;
            if (inSection === 'canFulfill') {
                result.canFulfill.push({ reqId: parts3[0], description: parts3[1] || '', procedure: parts3[2] || '' });
            } else if (inSection === 'completedToday') {
                result.completedToday.push({ reqId: parts3[0], description: parts3[1] || '', procedure: parts3[2] || '', date: parts3[3] || '' });
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
