// exam-content.js — examContentData, exam study progress, rendering

// ==================== EXAM CONTENT DATA ====================
const examContentData = {
    peds: {
        courseName: 'Pediatric Dentistry',
        courseCode: 'PD530',
        colorClass: 'peds',
        exams: [
            {
                id: 'peds-exam1',
                name: 'Exam 1 (Midterm)',
                date: '2025-10-20',
                weight: 40,
                isCumulative: false,
                isPast: true,
                score: 77,
                room: 'L-1101',
                time: '4:00-6:00 PM',
                lectures: [
                    { num: 1, date: '2025-08-04', day: 'Mon', time: '1:00-2:50 PM', topic: 'Introduction & Risk Assessment', lecturer: 'Dr. Reboucas', room: 'BAKST' },
                    { num: 2, date: '2025-08-11', day: 'Mon', time: '5:00-6:50 PM', topic: 'Dietary Counseling for Pediatric Patients', lecturer: 'Dr. Alayyoubi', room: '670 Aud' },
                    { num: 3, date: '2025-08-13', day: 'Wed', time: '1:00-2:50 PM', topic: 'Prevention: Fluoride, Oral Hygiene & Sealants', lecturer: 'Dr. Nguyen', room: '670 Aud' },
                    { num: 4, date: '2025-08-18', day: 'Mon', time: '1:00-2:50 PM', topic: 'Infant Oral Health & ECC', lecturer: 'Dr. Reboucas', room: '670 Aud' },
                    { num: 5, date: '2025-08-20', day: 'Wed', time: '1:00-2:50 PM', topic: 'Radiology for Pediatric Patients + Head Start', lecturer: 'Dr. Reboucas', room: '670 Aud' },
                    { num: 6, date: '2025-08-25', day: 'Mon', time: '4:00-5:50 PM', topic: 'Managing the Developing Dentition', lecturer: 'Dr. Cella', room: 'BAKST' },
                    { num: 7, date: '2025-09-08', day: 'Mon', time: '1:00-2:50 PM', topic: 'Operative Dentistry', lecturer: 'Dr. Reboucas', room: '670 Aud' },
                    { num: 8, date: '2025-09-15', day: 'Mon', time: '5:15-6:50 PM', topic: 'Growth and Development', lecturer: 'Dr. Tau', room: '670 Aud' },
                    { num: 9, date: '2025-09-22', day: 'Mon', time: '5:15-6:50 PM', topic: 'Head Start Rotation Instructions', lecturer: 'Dr. Tau', room: '670 Aud' },
                    { num: 10, date: '2025-10-06', day: 'Mon', time: '5:00-6:50 PM', topic: 'Space Maintenance + Problems of Eruption', lecturer: 'Dr. Baloul', room: '670 Aud' }
                ]
            },
            {
                id: 'peds-exam2',
                name: 'Exam 2',
                date: '2026-02-18',
                weight: 45,
                isCumulative: true,
                isPast: true,
                room: 'L-1101',
                time: '4:00-5:20 PM',
                notes: '55 questions from Dr. Shikui. SURVIVAL EXAM - you need ~70% to pass the course!',
                reviewContent: [
                    { num: 1, date: '2025-08-04', day: 'Mon', time: '1:00-2:50 PM', topic: 'Introduction & Risk Assessment', lecturer: 'Dr. Reboucas', room: 'BAKST' },
                    { num: 2, date: '2025-08-11', day: 'Mon', time: '5:00-6:50 PM', topic: 'Dietary Counseling for Pediatric Patients', lecturer: 'Dr. Alayyoubi', room: '670 Aud' },
                    { num: 3, date: '2025-08-13', day: 'Wed', time: '1:00-2:50 PM', topic: 'Prevention: Fluoride, Oral Hygiene & Sealants', lecturer: 'Dr. Nguyen', room: '670 Aud' },
                    { num: 4, date: '2025-08-18', day: 'Mon', time: '1:00-2:50 PM', topic: 'Infant Oral Health & ECC', lecturer: 'Dr. Reboucas', room: '670 Aud' },
                    { num: 5, date: '2025-08-20', day: 'Wed', time: '1:00-2:50 PM', topic: 'Radiology for Pediatric Patients + Head Start', lecturer: 'Dr. Reboucas', room: '670 Aud' },
                    { num: 6, date: '2025-08-25', day: 'Mon', time: '4:00-5:50 PM', topic: 'Managing the Developing Dentition', lecturer: 'Dr. Cella', room: 'BAKST' },
                    { num: 7, date: '2025-09-08', day: 'Mon', time: '1:00-2:50 PM', topic: 'Operative Dentistry', lecturer: 'Dr. Reboucas', room: '670 Aud' },
                    { num: 8, date: '2025-09-15', day: 'Mon', time: '5:15-6:50 PM', topic: 'Growth and Development', lecturer: 'Dr. Tau', room: '670 Aud' },
                    { num: 10, date: '2025-10-06', day: 'Mon', time: '5:00-6:50 PM', topic: 'Space Maintenance + Problems of Eruption', lecturer: 'Dr. Baloul', room: '670 Aud' }
                ],
                lectures: [
                    { num: 11, date: '2025-10-27', day: 'Mon', time: '5:15-6:50 PM', topic: 'Dentistry for the Developmentally Disabled', lecturer: 'Dr. Tau', room: '670 Aud' },
                    { num: 12, date: '2025-11-03', day: 'Mon', time: '1:00-2:50 PM', topic: 'Periodontal Diseases in Children', lecturer: 'Dr. Pani', room: '670 Aud' },
                    { num: 13, date: '2025-11-17', day: 'Mon', time: '1:00-2:50 PM', topic: 'Pulp Therapy', lecturer: 'Dr. Reboucas', room: '670 Aud' },
                    { num: 14, date: '2025-11-24', day: 'Mon', time: '1:00-2:50 PM', topic: 'Child Abuse', lecturer: 'Dr. Alayyoubi', room: '670 Aud' },
                    { num: 15, date: '2025-12-01', day: 'Mon', time: '5:15-6:50 PM', topic: 'Dental Trauma', lecturer: 'Dr. Bakhtiari', room: '670 Aud' },
                    { num: 16, date: '2026-01-05', day: 'Mon', time: '5:15-6:50 PM', topic: 'Behavior Management and Sedation', lecturer: 'Dr. Shokoohi/Shikui', room: '670 Aud' },
                    { num: 17, date: '2026-01-12', day: 'Mon', time: '1:00-2:50 PM', topic: 'Oral Medicine/Oral Pathology + NPI Presentation', lecturer: 'Dr. Alayyoubi', room: '670 Aud' },
                    { num: 18, date: '2026-01-26', day: 'Mon', time: '5:15-6:50 PM', topic: 'Pharmacology & Therapeutics', lecturer: 'Dr. Alayyoubi', room: '670 Aud' },
                    { num: 19, date: '2026-02-02', day: 'Mon', time: '1:00-2:50 PM', topic: 'IPS Exercise', lecturer: 'Dr. Tau', room: '670 Aud', mandatory: true, mandatoryNote: 'MUST ATTEND - Auto-fail if missed' },
                    { num: 20, date: '2026-02-09', day: 'Mon', time: '1:00-2:50 PM', topic: 'Treatment Planning + Wire Bending Exercise Instructions', lecturer: 'Dr. Reboucas', room: '670 Aud' }
                ]
            },
            {
                id: 'peds-exam3',
                name: 'Exam 3',
                date: '2026-03-30',
                weight: 7.5,
                isCumulative: false,
                isPast: false,
                room: 'L-1101',
                time: '4:00-5:00 PM',
                notes: 'Lighter exam - only 7.5% of grade. Also has attendance component.',
                lectures: [
                    { num: 21, date: '2026-02-23', day: 'Mon', time: '8:00-9:20 AM', topic: 'Prenatal Oral Health', lecturer: 'Dr. Silk', room: 'REMOTE', note: '⚠️ TIME DISCREPANCY: BB says 2:00-3:20 PM in-person, using GCal 8 AM Remote' },
                    { num: 22, date: '2026-03-02', day: 'Mon', time: '1:00-2:50 PM', topic: 'Behavior Management – Special Needs', lecturer: 'Dr. Bakhtiari', room: 'KEEFER' },
                    { num: 23, date: '2026-03-09', day: 'Mon', time: '1:00-2:20 PM', topic: 'Autism Friendly Initiative', lecturer: 'BMC', room: 'BAKST' },
                    { num: 24, date: '2026-03-16', day: 'Mon', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'TBD', room: '670 Aud' },
                    { num: 25, date: '2026-03-23', day: 'Mon', time: '1:00-2:20 PM', topic: 'Autism Friendly Initiative', lecturer: 'BMC', room: 'BAKST' },
                    { num: 26, date: '2026-03-30', day: 'Mon', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'TBD', room: '670 Aud' }
                ],
                slcSessions: [
                    { date: '2026-03-16', day: 'Mon', time: '4:00-6:20 PM', topic: 'SLC - Wire Bending (AS ONLY)', lecturer: 'Dr. Reboucas', room: 'SLC' },
                    { date: '2026-03-17', day: 'Tue', time: '4:00-6:20 PM', topic: 'SLC - Wire Bending (DMD ONLY)', lecturer: 'Dr. Reboucas', room: 'SLC' },
                    { date: '2026-03-23', day: 'Mon', time: '4:00-6:20 PM', topic: 'SLC - Wire Bending (MAKEUP ONLY)', lecturer: 'Dr. Reboucas', room: 'SLC' }
                ]
            }
        ]
    },

    // ==================== PERIODONTOLOGY 2 (PE530) ====================
    perio: {
        courseName: 'Periodontology 2',
        courseCode: 'PE530',
        colorClass: 'perio',
        otherComponents: [
            { name: 'Written Assignment', weight: 10, status: 'done' },
            { name: 'In-Person Discussion', weight: 5, status: 'pending', note: 'SCHEDULE WITH FLEISHER - 15-20 min, "The longer you wait, the more you need to know"' }
        ],
        exams: [
            {
                id: 'perio-midterm',
                name: 'Midterm',
                date: '2025-11-18',
                weight: 40,
                isCumulative: false,
                isPast: true,
                score: null, // Score unknown
                room: 'L-1101',
                time: '4:00-5:50 PM',
                lectures: [
                    { num: 1, date: '2025-08-27', day: 'Wed', time: '1:00-2:20 PM', topic: 'Introduction', lecturer: 'Dr. Fleisher', room: 'Bakst Aud' },
                    { num: 2, date: '2025-09-10', day: 'Wed', time: '1:00-2:20 PM', topic: 'Non-Surgical Therapy Part 1', lecturer: 'Dr. Fleisher', room: '670 Aud', reading: 'Ch. 24, 50, 51, 52', note: '📝 POSSIBLE ESSAY TOPIC' },
                    { num: 3, date: '2025-09-17', day: 'Wed', time: '1:00-2:20 PM', topic: 'Non-Surgical Therapy Part 2', lecturer: 'Dr. Fleisher', room: '670 Aud', reading: 'Ch. 54', note: '📝 POSSIBLE ESSAY TOPIC' },
                    { num: 4, date: '2025-09-24', day: 'Wed', time: '4:00 PM', topic: 'Basic Surgical Technique', lecturer: 'Dr. Fleisher', room: '670 Aud', reading: 'Ch. 56, 57, 60, 61', note: '⚠️ Different time (4 PM)' },
                    { num: 5, date: '2025-10-01', day: 'Wed', time: '1:00-2:20 PM', topic: 'Osseous Resective Therapy/Diagnosis', lecturer: 'Dr. Fleisher', room: '670 Aud', reading: 'Ch. 62, Suppl. #3' },
                    { num: 6, date: '2025-10-08', day: 'Wed', time: '4:00 PM', topic: 'Crown Lengthening', lecturer: 'Dr. Fleisher', room: '670 Aud', reading: 'Ch. 66', note: '📝 POSSIBLE ESSAY — Cite Gargiulo 1963: Biologic width = 1.07mm CT + 0.97mm JE = ~2.04mm. ⚠️ Different time (4 PM). Syllabus discrepancy: may be listed as "Osseous Surgery Part 2"' },
                    { num: 7, date: '2025-10-22', day: 'Wed', time: '1:00-2:20 PM', topic: 'Occlusal Trauma', lecturer: 'Dr. Fleisher', room: '670 Aud', reading: 'Ch. 35', note: '📝 POSSIBLE ESSAY — Primary vs secondary trauma, diagnosis' },
                    { num: 8, date: '2025-10-29', day: 'Wed', time: '2:00-3:30 PM', topic: 'Periodontal Emergencies', lecturer: 'Dr. Fleisher', room: '670 Aud', reading: 'Ch. 244-260, 320-323, 460-469', note: '⚠️ Different time (2:00-3:30 PM)' },
                    { num: 9, date: '2025-11-05', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBA', lecturer: 'Dr. Fleisher', room: '670 Aud' }
                ]
            },
            {
                id: 'perio-final',
                name: 'Final',
                date: '2026-03-11',
                weight: 45,
                isCumulative: true,
                isPast: true,
                room: 'L-1101',
                time: '12:00-3:50 PM',
                notes: 'Format: MCQ (70%) + Break (~15 min) + 2 Essays (30%, ~45 min each). Blue book, MUST BE LEGIBLE or Fleisher gives 0. Need 1 reference per essay. Answer as numbered list matching question parts.',
                essayTopics: [
                    { topic: 'Crown Lengthening', reference: 'Gargiulo 1963, Journal of Perio', keyPoints: 'Biologic width: 1.07mm CT + 0.97mm JE = ~2.04mm' },
                    { topic: 'Guided Tissue Regeneration (GTR)', reference: 'Nieman 1981, Journal of Clinical Perio', keyPoints: 'Principles of GTR, membrane use' },
                    { topic: 'Non-Surgical Therapy', reference: 'TBD', keyPoints: 'Scaling/root planing, outcomes' },
                    { topic: 'Occlusal Trauma', reference: 'TBD', keyPoints: 'Primary vs secondary, diagnosis' }
                ],
                reviewContent: [
                    { num: 1, date: '2025-08-27', day: 'Wed', time: '1:00-2:20 PM', topic: 'Introduction', lecturer: 'Dr. Fleisher', room: 'Bakst Aud' },
                    { num: 2, date: '2025-09-10', day: 'Wed', time: '1:00-2:20 PM', topic: 'Non-Surgical Therapy Part 1', lecturer: 'Dr. Fleisher', room: '670 Aud', note: '📝 POSSIBLE ESSAY' },
                    { num: 3, date: '2025-09-17', day: 'Wed', time: '1:00-2:20 PM', topic: 'Non-Surgical Therapy Part 2', lecturer: 'Dr. Fleisher', room: '670 Aud', note: '📝 POSSIBLE ESSAY' },
                    { num: 4, date: '2025-09-24', day: 'Wed', time: '4:00 PM', topic: 'Basic Surgical Technique', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 5, date: '2025-10-01', day: 'Wed', time: '1:00-2:20 PM', topic: 'Osseous Resective Therapy/Diagnosis', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 6, date: '2025-10-08', day: 'Wed', time: '4:00 PM', topic: 'Crown Lengthening', lecturer: 'Dr. Fleisher', room: '670 Aud', note: '📝 POSSIBLE ESSAY — Cite Gargiulo 1963' },
                    { num: 7, date: '2025-10-22', day: 'Wed', time: '1:00-2:20 PM', topic: 'Occlusal Trauma', lecturer: 'Dr. Fleisher', room: '670 Aud', note: '📝 POSSIBLE ESSAY' },
                    { num: 8, date: '2025-10-29', day: 'Wed', time: '2:00-3:30 PM', topic: 'Periodontal Emergencies', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 9, date: '2025-11-05', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBA', lecturer: 'Dr. Fleisher', room: '670 Aud' }
                ],
                lectures: [
                    { num: 10, date: '2026-01-07', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 11, date: '2026-01-14', day: 'Wed', time: '1:00-2:20 PM', topic: 'Diagnosis/Prognosis + Essay Preview + Feb 23 Block Announcement', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 12, date: '2026-01-21', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 13, date: '2026-01-28', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 14, date: '2026-02-04', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 15, date: '2026-02-11', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 16, date: '2026-02-18', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 17, date: '2026-02-25', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD', lecturer: 'Dr. Fleisher', room: '670 Aud' },
                    { num: 18, date: '2026-03-04', day: 'Wed', time: '1:00-2:20 PM', topic: 'TBD (likely Review)', lecturer: 'Dr. Fleisher', room: '670 Aud' }
                ],
                blockedDates: [
                    { date: '2026-02-23', day: 'Mon', note: '🚫 SLC BLOCKED — Stroman Implant Session (no patients!)' }
                ]
            }
        ]
    },

    // ==================== ORTHODONTICS (OR530) ====================
    ortho: {
        courseName: 'Orthodontics',
        courseCode: 'OR530',
        colorClass: 'ortho',
        studyTip: '📚 "Old examinations have been released... current year\'s examinations will contain a large number of questions similar to those on old examinations." → USE THE OLD EXAMS on the course website!',
        optionalInfo: 'Invisalign Certification: 2 modules in school + 1 after graduation. Not graded — professional development only.',
        exams: [
            {
                id: 'ortho-midterm',
                name: 'Midterm',
                date: '2025-10-31',
                weight: 50,
                isCumulative: false,
                isPast: true,
                score: null, // Score unknown
                room: '670 Aud',
                time: '3:00-4:50 PM',
                lectures: [
                    { num: 1, date: '2025-08-29', day: 'Fri', time: '3:00-4:50 PM', topic: 'Introduction / Ideal Occlusion', lecturer: 'Ortho Faculty', room: 'Bakst' },
                    { num: 2, date: '2025-09-05', day: 'Fri', time: '3:00-4:50 PM', topic: 'Intraoral/Extraoral Exam', lecturer: 'Ortho Faculty', room: '670 Aud' },
                    { num: 3, date: '2025-09-12', day: 'Fri', time: '3:00-4:50 PM', topic: 'Panos and Cephalometrics', lecturer: 'Ortho Faculty', room: 'Bakst' },
                    { num: 4, date: '2025-10-03', day: 'Fri', time: '3:00-4:50 PM', topic: 'Growth and Development', lecturer: 'Ortho Faculty', room: '670 Aud' },
                    { num: 5, date: '2025-10-10', day: 'Fri', time: '3:00-4:50 PM', topic: 'Etiology', lecturer: 'Ortho Faculty', room: 'Bakst' },
                    { num: 6, date: '2025-10-24', day: 'Fri', time: '3:00-4:50 PM', topic: 'Biomechanics / Bone Biology + Biomechanics – Orthopedics', lecturer: 'Ortho Faculty', room: 'Bakst', note: '⚠️ 2 topics covered in this lecture' }
                ]
            },
            {
                id: 'ortho-final',
                name: 'Final',
                date: '2026-02-06',
                weight: 50,
                isCumulative: true,
                isPast: true,
                room: 'L-1101',
                time: '12:00-1:50 PM',
                notes: '📚 USE OLD EXAMS! "Current year\'s examinations will contain a large number of questions similar to those on old examinations." — Get them from course website!',
                reviewContent: [
                    { num: 1, date: '2025-08-29', day: 'Fri', time: '3:00-4:50 PM', topic: 'Introduction / Ideal Occlusion', lecturer: 'Ortho Faculty', room: 'Bakst' },
                    { num: 2, date: '2025-09-05', day: 'Fri', time: '3:00-4:50 PM', topic: 'Intraoral/Extraoral Exam', lecturer: 'Ortho Faculty', room: '670 Aud' },
                    { num: 3, date: '2025-09-12', day: 'Fri', time: '3:00-4:50 PM', topic: 'Panos and Cephalometrics', lecturer: 'Ortho Faculty', room: 'Bakst' },
                    { num: 4, date: '2025-10-03', day: 'Fri', time: '3:00-4:50 PM', topic: 'Growth and Development', lecturer: 'Ortho Faculty', room: '670 Aud' },
                    { num: 5, date: '2025-10-10', day: 'Fri', time: '3:00-4:50 PM', topic: 'Etiology', lecturer: 'Ortho Faculty', room: 'Bakst' },
                    { num: 6, date: '2025-10-24', day: 'Fri', time: '3:00-4:50 PM', topic: 'Biomechanics / Bone Biology + Biomechanics – Orthopedics', lecturer: 'Ortho Faculty', room: 'Bakst', note: '⚠️ 2 topics covered in this lecture' }
                ],
                lectures: [
                    { num: 7, date: '2025-11-07', day: 'Fri', time: '1:00-2:50 PM', topic: 'Early Treatment', lecturer: 'Ortho Faculty', room: '670 Aud', note: '⚠️ TIME CHANGE: 1 PM (not 3 PM)' },
                    { num: 8, date: '2025-12-05', day: 'Fri', time: '12:00-1:50 PM', topic: 'Interdisciplinary Ortho', lecturer: 'Ortho Faculty', room: '670 Aud', note: '⚠️ TIME CHANGE: 12 PM (not 3 PM)' },
                    { num: 9, date: '2026-01-09', day: 'Fri', time: '1:00-2:50 PM', topic: 'Orthognathics', lecturer: 'Ortho Faculty', room: '670 Aud' },
                    { num: 10, date: '2026-01-23', day: 'Fri', time: '1:00-2:50 PM', topic: 'Invisalign + Retention and Relapse', lecturer: 'Ortho Faculty', room: '670 Aud', note: '⚠️ 2 topics covered in this lecture' }
                ]
            }
        ]
    },

    // ==================== PAIN CONTROL 2 (OS532) ====================
    paincontrol: {
        courseName: 'Pain Control 2',
        courseCode: 'OS532',
        colorClass: 'paincontrol',
        studyTip: '✅ GOOD NEWS: PC2 exams are NOT cumulative — Midterm and Final test DIFFERENT content! Midterm = Lectures 1-4, Final = Lectures 6-11.',
        otherComponents: [
            { name: 'Take Home Exam 1', weight: 12, due: 'Jan 29', status: 'pending', note: 'Due BEFORE class starts — late = 0. Pairs allowed, heavily shared!' },
            { name: 'Take Home Exam 2', weight: 12, due: 'Mar 5', status: 'pending', note: 'Due BEFORE class starts — late = 0. Pairs allowed.' },
            { name: 'Rx Writing #1', weight: 2, due: 'Jan 22', status: 'pending', note: 'Print, both names, hand in at START of class' },
            { name: 'Rx Writing #2', weight: 2, due: 'Feb 26', status: 'pending', note: 'Hand in at start of class' },
            { name: 'Medical Consultation', weight: 2, due: 'Feb 19', status: 'pending', note: 'Hand in at start of class' },
            { name: 'Attendance Bonus', weight: '+2 pts', due: 'Unannounced', status: 'ongoing', note: 'Extra credit for attendance' }
        ],
        requiredModules: [
            { name: 'Gate Control Theory Video', platform: 'Blackboard', due: 'Before Jan 15', examImpact: 'May appear on quizzes/exams', status: 'confirm' },
            { name: 'Acute Dental Pain Module', platform: 'scopeofpain.org', due: 'Before Jan 29', examImpact: 'Questions WILL be on exam', status: 'do_now', note: 'Must create account, print TWO certificates (one for you, one to turn in)' },
            { name: 'PE of Extremities Video', platform: 'Blackboard', due: 'Before Mar 5', examImpact: 'May appear on Final', status: 'pending' }
        ],
        exams: [
            {
                id: 'pc2-midterm',
                name: 'Midterm',
                date: '2026-02-02',
                weight: 30,
                isCumulative: false,
                isPast: true,
                room: 'L-1101',
                time: '4:00-5:15 PM',
                notes: 'NOT cumulative — only Lectures 1-4! Don\'t forget: Gate Control Video (before Jan 15) and Acute Dental Pain Module (before Jan 29) — questions WILL be on exam.',
                lectures: [
                    { num: 1, date: '2026-01-08', day: 'Thu', time: '3:00-4:50 PM', topic: '1) Course Intro 2) Facial Pain: Choosing an Analgesic', lecturer: 'Dr. D\'Innocenzo', room: '670 Aud', reading: 'Malamed pp. 2-22 (Intro)', note: '📹 Gate Control Theory Video due before Jan 15' },
                    { num: 2, date: '2026-01-15', day: 'Thu', time: '3:00-4:50 PM', topic: '1) Physiology of Pain 2) Rx Writing 3) Mass PAT', lecturer: 'Dr. D\'Innocenzo', room: '670 Aud', reading: 'Malamed pp. 57-65, 86-93 (Pain)' },
                    { num: 3, date: '2026-01-22', day: 'Thu', time: '3:00-4:50 PM', topic: '1) Oral Sedation 2) Patient Monitoring', lecturer: 'Dr. Bhagania', room: '670 Aud', reading: 'Malamed pp. 95-119 (Oral Sedation), pp. 66-85 (Monitoring)', note: '📝 Rx #1 DUE (2%) at start of class. Take Home Exam 1 ASSIGNED. Acute Dental Pain module due before Jan 29.' },
                    { num: 4, date: '2026-01-29', day: 'Thu', time: '1:00-2:50 PM', topic: 'Chronic Pain', lecturer: 'Dr. Motro', room: '670 Aud', note: '⚠️ TIME CHANGE: 1 PM (not 3 PM). 📝 TAKE HOME EXAM 1 DUE (12%) before class — late = 0!' }
                ]
            },
            {
                id: 'pc2-final',
                name: 'Final',
                date: '2026-03-19',
                weight: 40,
                isCumulative: false,
                isPast: false,
                room: 'L-1101',
                time: '4:00-5:30 PM',
                notes: 'NOT cumulative — only Lectures 6-11! Don\'t forget: PE of Extremities Video (before Mar 5).',
                lectures: [
                    { num: 6, date: '2026-02-05', day: 'Thu', time: '1:00-2:50 PM', topic: '1) Cardiovascular Exam 2) Pulmonary Exam', lecturer: 'Dr. D\'Innocenzo', room: '670 Aud' },
                    { num: 7, date: '2026-02-12', day: 'Thu', time: '1:00-2:50 PM', topic: 'Nitrous Oxide Technique', lecturer: 'Dr. D\'Innocenzo', room: '670 Aud', reading: 'Malamed pp. 164-272 (Nitrous Oxide) — REQUIRED', note: 'Medical Consultation ASSIGNED' },
                    { num: 8, date: '2026-02-19', day: 'Thu', time: '1:00-2:50 PM', topic: 'Nitrous Oxide Technique (Continued)', lecturer: 'Dr. Sethi / Dr. D\'Innocenzo', room: '670 Aud', note: '📝 MEDICAL CONSULTATION DUE (2%). Rx #2 ASSIGNED.' },
                    { num: 9, date: '2026-02-26', day: 'Thu', time: '1:00-2:50 PM', topic: '1) PE of Extremities, IM/SQ/IV Tech 2) Vaccination Technique 3) IV Sedation/GA', lecturer: 'Dr. D\'Innocenzo', room: '670 Aud', reading: 'Malamed pp. 273-297 (IV/IM Tech), pp. 359-398 (IV Sedation), pp. 407-433 (GA) — Recommended', note: '⚠️ HEAVY LECTURE - 3 major topics! 📝 Rx #2 DUE (2%). Take Home Exam 2 ASSIGNED. PE of Extremities video due before Mar 5.' },
                    { num: 10, date: '2026-03-05', day: 'Thu', time: '1:00-2:50 PM', topic: '1) IV/GA Continued 2) Common Anesthesia Emergencies', lecturer: 'Dr. D\'Innocenzo & Dr. Bhagania', room: '670 Aud', reading: 'Malamed pp. 437-455, 456-494 (Emergencies) — Recommended', note: '📝 TAKE HOME EXAM 2 DUE (12%) before class — late = 0!' },
                    { num: 11, date: '2026-03-12', day: 'Thu', time: '1:00-2:50 PM', topic: 'Case Presentations / Review', lecturer: 'Dr. D\'Innocenzo', room: '670 Aud', note: '📚 REVIEW SESSION — bring questions!' }
                ]
            }
        ]
    },

    // ==================== ORAL MEDICINE (OD531) ====================
    oralmed: {
        courseName: 'Oral Medicine',
        courseCode: 'OD531',
        colorClass: 'oralmed',
        studyTip: '📝 Notecard allowed on exams: Handwritten, 5"×8", double-sided. Write your name on it and turn it in after. Textbook: Neville, Oral and Maxillofacial Pathology, 5th Ed. Read: Overview, Clinical Features, Diagnosis, Treatment, Prognosis — SKIP histopathology sections.',
        otherComponents: [
            { name: 'Participation', weight: 12.5, due: 'Ongoing', status: 'ongoing', note: 'Start with 50 pts; lose only if absent when cold-called. Dr. Henderson has fixed seating!' },
            { name: 'Weekly Quizzes (10)', weight: 25, due: 'Night before each lecture', status: 'ongoing', note: 'Due 11:59 PM night before next lecture. 10 quizzes × 2.5% each.' },
            { name: 'Passion Project', weight: 12.5, due: 'Apr 17, 4:00 PM', status: 'pending', note: 'Any format (TikTok, podcast, campaign, etc.). Needs DATED JOURNAL LOG + 5 references + reflection statement.' },
            { name: 'Extra Credit', weight: '+5%', due: 'Varies', status: 'optional', note: 'Up to 20 pts (+5%) for shadowing, presentations, community building.' }
        ],
        quizSchedule: [
            { num: 1, covers: 'Lecture 1', topic: 'Introduction to Oral Medicine', due: 'Jan 15, 11:59 PM', status: 'done' },
            { num: 2, covers: 'Lecture 2', topic: 'Infectious Diseases', due: 'Jan 22, 11:59 PM', status: 'pending' },
            { num: 3, covers: 'Lecture 3', topic: 'Allergies and Immune Diseases', due: 'Feb 5, 11:59 PM', status: 'pending' },
            { num: 4, covers: 'Lecture 4', topic: 'Epithelial Pathoses and SCC', due: 'Feb 19, 11:59 PM', status: 'pending' },
            { num: 5, covers: 'Lecture 5', topic: 'Salivary Gland Disorders', due: 'Feb 26, 11:59 PM', status: 'pending' },
            { num: 6, covers: 'Lecture 6', topic: 'Hematologic Diseases', due: 'Mar 5, 11:59 PM', status: 'pending' },
            { num: 7, covers: 'Lecture 7', topic: 'Oral Oncology', due: 'Mar 12, 11:59 PM', status: 'pending' },
            { num: 8, covers: 'Lecture 8', topic: 'Systemic and Syndromic Conditions', due: 'Mar 19, 11:59 PM', status: 'pending' },
            { num: 9, covers: 'Lecture 9', topic: 'Disorders of Sensation', due: 'Apr 2, 11:59 PM', status: 'pending' },
            { num: 10, covers: 'All/Review?', topic: 'Comprehensive or Final Prep (verify with Dr. Henderson)', due: 'Apr 16, 11:59 PM', status: 'pending' }
        ],
        passionProject: {
            due: 'Apr 17, 4:00 PM (before Final)',
            requirements: [
                'Original project (any format: TikTok, podcast, campaign, etc.)',
                'Personal process + reflection statement (1-2 pages)',
                'Minimum 5 up-to-date references',
                'Supporting materials showing authentic work',
                'DATED JOURNAL LOG of your process (anti-AI proof)'
            ],
            note: 'Can be solo, group, or entire class. Feb 13 is dedicated work time!'
        },
        examRules: {
            notecard: 'ONE handwritten notecard allowed (5"×8", double-sided). Cannot be typed or shared. Write your name on it. Turn it in after exam.',
            makeup: 'Essay format (if approved)'
        },
        exams: [
            {
                id: 'oralmed-midterm',
                name: 'Midterm',
                date: '2026-02-27',
                weight: 25,
                isCumulative: false,
                isPast: true,
                room: 'L-1101',
                time: '4:00-5:50 PM',
                notes: 'Covers Lectures 1-5 only. Notecard allowed: handwritten, 5"×8", double-sided. Write your name on it!',
                lectures: [
                    { num: 1, date: '2026-01-09', day: 'Fri', time: '3:00-4:50 PM', topic: 'Introduction to Oral Medicine', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 2, date: '2026-01-16', day: 'Fri', time: '3:00-4:50 PM', topic: 'Infectious Diseases', lecturer: 'Dr. Henderson', room: '670 Aud', note: '📝 Quiz 1 was due Jan 15 11:59 PM ✅' },
                    { num: 3, date: '2026-01-23', day: 'Fri', time: '3:00-4:50 PM', topic: 'Allergies and Immune Diseases', lecturer: 'Dr. Henderson', room: '670 Aud', note: '📝 Quiz 2 due Jan 22 11:59 PM' },
                    { num: 4, date: '2026-02-06', day: 'Fri', time: '3:00-4:50 PM', topic: 'Epithelial Pathoses and Squamous Cell Carcinoma', lecturer: 'Dr. Henderson', room: '670 Aud', note: '📝 Quiz 3 due Feb 5 11:59 PM' },
                    { num: 5, date: '2026-02-20', day: 'Fri', time: '2:00-3:50 PM', topic: 'Salivary Gland Disorders', lecturer: 'Dr. Henderson', room: '670 Aud', note: '⚠️ TIME CHANGE: 2 PM (not 3 PM). 📝 Quiz 4 due Feb 19 11:59 PM' }
                ],
                noClassDates: [
                    { date: '2026-02-13', day: 'Fri', note: '❌ NO CLASS — Passion Project work time (GCal may show lecture — trust syllabus!)' }
                ]
            },
            {
                id: 'oralmed-midterm-makeup',
                name: 'Midterm (Makeup)',
                date: '2026-05-06',
                weight: 25,
                isCumulative: false,
                isPast: false,
                room: 'TBD',
                time: 'TBD',
                notes: 'Rescheduled from Feb 27 due to illness. Same content as original midterm (Lectures 1-5). Notecard allowed: handwritten, 5"x8", double-sided. Write your name on it! Confirm room/time with Dr. Henderson.',
                lectures: [
                    { num: 1, date: '2026-01-09', day: 'Fri', time: '3:00-4:50 PM', topic: 'Introduction to Oral Medicine', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 2, date: '2026-01-16', day: 'Fri', time: '3:00-4:50 PM', topic: 'Infectious Diseases', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 3, date: '2026-01-23', day: 'Fri', time: '3:00-4:50 PM', topic: 'Allergies and Immune Diseases', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 4, date: '2026-02-06', day: 'Fri', time: '3:00-4:50 PM', topic: 'Epithelial Pathoses and Squamous Cell Carcinoma', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 5, date: '2026-02-20', day: 'Fri', time: '2:00-3:50 PM', topic: 'Salivary Gland Disorders', lecturer: 'Dr. Henderson', room: '670 Aud' }
                ]
            },
            {
                id: 'oralmed-final',
                name: 'Final',
                date: '2026-04-17',
                weight: 25,
                isCumulative: true,
                isPast: false,
                room: 'L-1101',
                time: '4:00-5:50 PM',
                notes: 'Can cover ALL lectures but FOCUSES on Lectures 6-9. Notecard allowed. Passion Project also due at 4 PM same day!',
                reviewContent: [
                    { num: 1, date: '2026-01-09', day: 'Fri', time: '3:00-4:50 PM', topic: 'Introduction to Oral Medicine', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 2, date: '2026-01-16', day: 'Fri', time: '3:00-4:50 PM', topic: 'Infectious Diseases', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 3, date: '2026-01-23', day: 'Fri', time: '3:00-4:50 PM', topic: 'Allergies and Immune Diseases', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 4, date: '2026-02-06', day: 'Fri', time: '3:00-4:50 PM', topic: 'Epithelial Pathoses and Squamous Cell Carcinoma', lecturer: 'Dr. Henderson', room: '670 Aud' },
                    { num: 5, date: '2026-02-20', day: 'Fri', time: '2:00-3:50 PM', topic: 'Salivary Gland Disorders', lecturer: 'Dr. Henderson', room: '670 Aud' }
                ],
                lectures: [
                    { num: 6, date: '2026-03-06', day: 'Fri', time: '1:00-2:50 PM', topic: 'Hematologic Diseases', lecturer: 'Dr. Henderson', room: '670 Aud', note: '⚠️ TIME CHANGE: 1 PM. 📝 Quiz 6 due Mar 5 11:59 PM' },
                    { num: 7, date: '2026-03-13', day: 'Fri', time: '1:00-2:50 PM', topic: 'Oral Oncology', lecturer: 'Dr. Henderson', room: '670 Aud', note: '📝 Quiz 7 due Mar 12 11:59 PM' },
                    { num: 8, date: '2026-03-20', day: 'Fri', time: '1:00-2:50 PM', topic: 'Systemic and Syndromic Conditions', lecturer: 'Dr. Henderson', room: '670 Aud', note: '📝 Quiz 8 due Mar 19 11:59 PM' },
                    { num: 9, date: '2026-04-03', day: 'Fri', time: '1:00-2:50 PM', topic: 'Disorders of Sensation', lecturer: 'Dr. Henderson', room: '670 Aud', note: '📝 Quiz 9 due Apr 2 11:59 PM' }
                ],
                noClassDates: [
                    { date: '2026-03-27', day: 'Fri', note: '❌ NO CLASS' },
                    { date: '2026-04-10', day: 'Fri', note: '❌ NO CLASS' }
                ]
            }
        ]
    },

    // ==================== GERIATRICS (PH541) ====================
    geriatrics: {
        courseName: 'Geriatrics',
        courseCode: 'PH541',
        colorClass: 'geriatrics',
        studyTip: '👴 SHORT COURSE — Only 3 meeting dates + Final. Done by Feb 11! Each meeting covers 2 lectures = 6 total lectures. One less course to worry about during February gauntlet.',
        courseType: 'Short course (ends Feb 11)',
        otherComponents: [
            { name: 'Final Exam', weight: 'TBD', due: 'Feb 11', status: 'pending', note: 'Likely 100% or majority — pending syllabus confirmation' }
        ],
        pendingInfo: [
            'Syllabus not yet released',
            'Topic names TBD — update after each lecture',
            'Grading breakdown TBD',
            'Attendance policy TBD',
            'Pass threshold likely 60% (standard) — confirm with syllabus'
        ],
        exams: [
            {
                id: 'geriatrics-final',
                name: 'Final Exam',
                date: '2026-02-11',
                weight: 'TBD',
                isCumulative: true,
                isPast: true,
                room: 'L-1101',
                time: '4:00-5:20 PM',
                notes: 'COURSE ENDS after this exam. Covers all 6 lectures (Lectures 1-6). Short course = less content to manage!',
                lectures: [
                    { num: 1, date: '2026-01-13', day: 'Tue', time: '4:00-5:50 PM', topic: 'TBD (Meeting 1, Lecture 1)', lecturer: 'TBD', room: 'G-341', note: 'Meeting 1 covers Lectures 1 & 2' },
                    { num: 2, date: '2026-01-13', day: 'Tue', time: '4:00-5:50 PM', topic: 'TBD (Meeting 1, Lecture 2)', lecturer: 'TBD', room: 'G-341' },
                    { num: 3, date: '2026-01-20', day: 'Tue', time: '4:00-5:50 PM', topic: 'TBD (Meeting 2, Lecture 3)', lecturer: 'TBD', room: 'G-341', note: 'Meeting 2 covers Lectures 3 & 4' },
                    { num: 4, date: '2026-01-20', day: 'Tue', time: '4:00-5:50 PM', topic: 'TBD (Meeting 2, Lecture 4)', lecturer: 'TBD', room: 'G-341' },
                    { num: 5, date: '2026-01-27', day: 'Tue', time: '4:00-5:50 PM', topic: 'TBD (Meeting 3, Lecture 5)', lecturer: 'TBD', room: 'G-341', note: 'Meeting 3 covers Lectures 5 & 6' },
                    { num: 6, date: '2026-01-27', day: 'Tue', time: '4:00-5:50 PM', topic: 'TBD (Meeting 3, Lecture 6)', lecturer: 'TBD', room: 'G-341' }
                ],
                meetingSchedule: [
                    { meeting: 1, date: '2026-01-13', day: 'Tue', time: '4:00-5:50 PM', lectures: 'Lectures 1 & 2', room: 'G-341', status: 'passed' },
                    { meeting: 2, date: '2026-01-20', day: 'Tue', time: '4:00-5:50 PM', lectures: 'Lectures 3 & 4', room: 'G-341', status: 'pending' },
                    { meeting: 3, date: '2026-01-27', day: 'Tue', time: '4:00-5:50 PM', lectures: 'Lectures 5 & 6', room: 'G-341', status: 'pending' }
                ]
            }
        ]
    },

    // ==================== CRITICAL THINKING (GD660) ====================
    critthink: {
        courseName: 'Critical Thinking',
        courseCode: 'GD660',
        colorClass: 'critthink',
        studyTip: '❌ NO FORMAL EXAMS — Project-based course. Only 2 online quizzes (40%) + Evidence-Based Group Project (60%). Pass threshold: 60% (D). ⚠️ SEVERE ATTENDANCE: Unexcused absence = full letter grade deduction PER absence!',
        courseType: 'Project-Based (Evidence-Based Group Project)',
        passThreshold: '60% (D)',
        currentProgress: {
            completed: 41,
            items: ['Quiz 1 (20%)', 'PICO (3%)', 'Individual Article (12%)', 'Group Articles (6%)']
        },
        remainingProgress: {
            remaining: 59,
            items: ['Quiz 2 (20%)', 'Group PowerPoint (12%)', 'Group Video (9%)', 'Systematic Review (12%)', 'Peer Review (6%)']
        },
        otherComponents: [
            { name: 'Quiz 1', weight: 20, due: 'Fall 2025', status: 'done', note: 'Online quiz ✅' },
            { name: 'PICO', weight: 3, due: 'Oct 22, 2025', status: 'done', note: '5% of project, 3% of final ✅' },
            { name: 'Individual Article Review', weight: 12, due: 'Jan 13, 2026', status: 'done', note: '20% of project ✅' },
            { name: 'Group of Articles', weight: 6, due: 'Jan 13, 2026', status: 'done', note: '10% of project ✅' },
            { name: 'Quiz 2', weight: 20, due: 'Jan 29, 2026 (evening)', status: 'pending', note: '1hr window, open Blackboard ONLY. Paul & Elder framework.' },
            { name: 'Group PowerPoint', weight: 12, due: 'Mar 18, 2026 (8 AM)', status: 'pending', note: '20% of project. Upload to Blackboard.' },
            { name: 'Group Video Recording', weight: 9, due: 'Mar 18, 2026 (8 AM)', status: 'pending', note: '15% of project. Zoom recording to cloud.' },
            { name: 'Systematic Review', weight: 12, due: 'Mar 23, 2026 (8 AM)', status: 'pending', note: '20% of project. Upload to Blackboard.' },
            { name: 'Peer Review', weight: 6, due: 'TBD', status: 'pending', note: '10% of project. Review other groups\' work.' }
        ],
        attendancePolicy: {
            warning: '⚠️ SEVERE ATTENDANCE POLICY',
            rules: [
                'Unexcused absence = FULL LETTER GRADE deduction PER absence',
                'Late submissions = Grade of 0',
                'Excused absences: Documented medical/personal emergency OR 1 week advance written request'
            ]
        },
        quiz2Details: {
            date: 'Jan 29, 2026 (Thursday)',
            time: 'Evening, 1-hour window',
            format: 'Online, open Blackboard ONLY',
            weight: '20%',
            content: 'Critical thinking principles (Paul & Elder framework)',
            studyFocus: [
                '8 Universal Elements of Thought',
                'Intellectual Standards',
                'Intellectual Traits/Virtues',
                'How elements, standards, and traits inter-relate'
            ],
            resource: 'Paul & Elder Critical Thinking Guide (on Blackboard)'
        },
        livePresentations: [
            { date: '2026-04-01', day: 'Wed', time: '1:00-3:20 PM', room: '670 Auditorium', note: 'Your group presents on ONE of these dates (TBD)' },
            { date: '2026-04-14', day: 'Tue', time: '1:00-3:20 PM', room: '670 Auditorium' },
            { date: '2026-04-16', day: 'Thu', time: '1:00-2:50 PM', room: '670 Auditorium' }
        ],
        // Using "milestones" instead of "exams" since this is project-based
        exams: [
            {
                id: 'critthink-fall',
                name: 'Fall 2025 Deliverables',
                date: '2025-11-30',
                weight: 23,
                isCumulative: false,
                isPast: true,
                score: 100,
                notes: 'All Fall 2025 deliverables completed! Quiz 1 (20%) + PICO (3%) = 23%',
                lectures: [
                    { num: 1, date: '2025-10-01', day: 'Wed', time: '2:30 PM', topic: 'Lecture #1 — Course Introduction', lecturer: 'Dr. Fleisher', room: '670 Aud', note: '✅ Completed' },
                    { num: 2, date: '2025-10-06', day: 'Mon', time: '8:00 AM', topic: 'Submit group topic choices', lecturer: '—', room: 'Blackboard', note: '✅ Completed' },
                    { num: 3, date: '2025-10-08', day: 'Wed', time: '—', topic: 'Topics assigned to groups', lecturer: '—', room: '—', note: '✅ Completed' },
                    { num: 4, date: '2025-10-20', day: 'Mon', time: '8:00 AM', topic: 'Initial PICO upload', lecturer: '—', room: 'Blackboard', note: '✅ Completed' },
                    { num: 5, date: '2025-10-22', day: 'Wed', time: '2:30-3:50 PM', topic: 'Lecture #2 + PICO Due (3%)', lecturer: 'Dr. Fleisher', room: '670 Aud', note: '📝 PICO DUE ✅' },
                    { num: 6, date: '2025-10-29', day: 'Wed', time: '6:00 PM', topic: 'Final PICO approval', lecturer: '—', room: '—', note: '✅ Completed' },
                    { num: 7, date: '2025-11-15', day: '—', time: 'TBD', topic: 'Quiz 1 — Online (20%)', lecturer: '—', room: 'Blackboard', note: '📝 QUIZ 1 ✅' },
                    { num: 8, date: '2025-12-01', day: '—', time: '—', topic: 'Meet with librarian (Dec 1-7)', lecturer: 'Librarian', room: '—', note: '✅ Completed' },
                    { num: 9, date: '2025-12-15', day: '—', time: '—', topic: 'Face-to-face with faculty mentor', lecturer: 'Faculty Mentor', room: '—', note: '✅ Completed' }
                ]
            },
            {
                id: 'critthink-quiz2',
                name: 'Quiz 2',
                date: '2026-01-29',
                weight: 20,
                isCumulative: false,
                isPast: true,
                room: 'Online (Blackboard)',
                time: 'Evening, 1-hour window',
                notes: 'Open Blackboard ONLY. Study Paul & Elder Critical Thinking Guide. Focus on: 8 Universal Elements of Thought, Intellectual Standards, Intellectual Traits/Virtues.',
                lectures: [
                    { num: 1, date: '2026-01-13', day: 'Mon', time: '8:00 AM', topic: 'Individual Article Review Due (12%)', lecturer: '—', room: 'Blackboard', note: '📝 INDIVIDUAL ARTICLE DUE ✅' },
                    { num: 2, date: '2026-01-13', day: 'Mon', time: '8:00 AM', topic: 'Group of Articles Due (6%)', lecturer: '—', room: 'Blackboard', note: '📝 GROUP ARTICLES DUE ✅' },
                    { num: 3, date: '2026-01-29', day: 'Thu', time: 'Evening', topic: 'Quiz 2 — Online (20%)', lecturer: '—', room: 'Blackboard', note: '📝 QUIZ 2 — 1hr window, open BB only!' }
                ]
            },
            {
                id: 'critthink-project',
                name: 'Group Project Deliverables',
                date: '2026-03-23',
                weight: 33,
                isCumulative: false,
                isPast: false,
                room: 'Blackboard + Cloud',
                notes: 'PowerPoint (12%) + Video (9%) + Systematic Review (12%) = 33%. All due 8:00 AM!',
                lectures: [
                    { num: 1, date: '2026-02-01', day: 'Wed', time: '—', topic: 'Faculty comments/grading returned', lecturer: 'Faculty', room: '—', note: 'Info only — review feedback' },
                    { num: 2, date: '2026-03-18', day: 'Wed', time: '8:00 AM', topic: 'Group PowerPoint Due (12%)', lecturer: '—', room: 'Blackboard', mandatory: true, mandatoryNote: '⚠️ Upload by 8 AM — late = 0!' },
                    { num: 3, date: '2026-03-18', day: 'Wed', time: '8:00 AM', topic: 'Group Video Recording Due (9%)', lecturer: '—', room: 'Cloud (Zoom)', mandatory: true, mandatoryNote: '⚠️ Upload by 8 AM — late = 0!' },
                    { num: 4, date: '2026-03-23', day: 'Mon', time: '8:00 AM', topic: 'Systematic Review Due (12%)', lecturer: '—', room: 'Blackboard', mandatory: true, mandatoryNote: '⚠️ Upload by 8 AM — late = 0!' }
                ]
            },
            {
                id: 'critthink-presentations',
                name: 'Live Presentations + Peer Review',
                date: '2026-04-16',
                weight: 6,
                isCumulative: false,
                isPast: false,
                room: '670 Auditorium',
                notes: 'Your group presents on ONE of these dates (TBD). Peer Review (6%) due TBD.',
                lectures: [
                    { num: 1, date: '2026-04-01', day: 'Wed', time: '1:00-3:20 PM', topic: 'Live Presentation Day 1', lecturer: 'Groups TBD', room: '670 Aud', note: 'Your group presents ONE of these days' },
                    { num: 2, date: '2026-04-14', day: 'Tue', time: '1:00-3:20 PM', topic: 'Live Presentation Day 2', lecturer: 'Groups TBD', room: '670 Aud' },
                    { num: 3, date: '2026-04-16', day: 'Thu', time: '1:00-2:50 PM', topic: 'Live Presentation Day 3', lecturer: 'Groups TBD', room: '670 Aud' },
                    { num: 4, date: '2026-04-30', day: 'TBD', time: 'TBD', topic: 'Peer Review Due (6%)', lecturer: '—', room: 'Blackboard', note: '📝 PEER REVIEW — Date TBD' }
                ]
            }
        ]
    }
    // More courses will be added here as we go
};

// ==================== EXAM CONTENT FUNCTIONS ====================

// Course-specific discrepancies data
const courseDiscrepancies = {
    peds: [
        { text: '<strong>Feb 23 (Prenatal Oral Health):</strong> Blackboard says 2:00-3:20 PM in-person, but GCal says 8:00-9:20 AM REMOTE. Using GCal (8 AM Remote).' },
        { text: '<strong>Mar 2 (Behavior Management):</strong> Blackboard says 1:00-2:20 PM, GCal says 1:00-2:50 PM. Using GCal (slightly longer).' },
        { text: '<strong>Jan 5 Lecturer:</strong> Blackboard says Dr. Shokoohi, transcript says Dr. Shikui. Same person, different spelling.' }
    ],
    perio: [
        { text: '<strong>Oct 8 Topic:</strong> Two syllabus versions exist. Version 1 says "Osseous Surgery Part 2/Review assignment articles." Version 2 says "Crown Lengthening." Using Crown Lengthening.' },
        { text: '<strong>Fall Time Variations:</strong> Sep 24 and Oct 8 were at 4 PM (not 1 PM). Oct 29 was 2:00-3:30 PM. Check GCal for Spring times.' },
        { text: '<strong>Spring Topics:</strong> Syllabus doesn\'t list Spring 2026 topic names. Topics marked TBD - will update as semester progresses.' }
    ],
    ortho: [
        { text: '<strong>Time Variations:</strong> Fall lectures at 3 PM; Nov 7 shifted to 1 PM; Dec 5 shifted to 12 PM; Spring lectures at 1 PM; Final at 12 PM. Check each lecture time!' },
        { text: '<strong>Room Variations:</strong> Alternates between Bakst Aud and 670 Aud. Final is in L-1101.' },
        { text: '<strong>Multi-Topic Lectures:</strong> Oct 24 covers 2 topics (Biomechanics/Bone Biology + Orthopedics). Jan 23 covers 2 topics (Invisalign + Retention/Relapse). Both count for exam!' }
    ],
    paincontrol: [
        { text: '<strong style="color: #10b981;">✅ No Major Discrepancies!</strong> Syllabus and GCal align perfectly.', isGood: true },
        { text: '<strong>Time Change Note:</strong> Lectures 1-3 are at 3:00 PM, but Lecture 4 onwards shifts to 1:00 PM. All confirmed matching between Syllabus and GCal.' }
    ],
    oralmed: [
        { text: '<strong>⚠️ Feb 13 NO CLASS:</strong> GCal may show a lecture 3:00-4:50 PM — this is WRONG! Dr. Henderson explicitly said NO CLASS (Passion Project work time). Trust syllabus!' },
        { text: '<strong>Time Changes Pattern:</strong> Jan 9 - Feb 6 at 3:00 PM → Feb 20 shifts to 2:00 PM → Mar 6 onwards at 1:00 PM. Exams at 4:00 PM.' },
        { text: '<strong>10 Quizzes vs 9 Lectures:</strong> Quiz 10 purpose unclear — may be comprehensive or cover additional material. Verify with Dr. Henderson.' },
        { text: '<strong>Quiz Due Dates:</strong> All quizzes due 11:59 PM the NIGHT BEFORE next lecture (not on lecture day). E.g., Quiz 1 due Jan 15 for Jan 16 lecture.' }
    ],
    geriatrics: [
        { text: '<strong style="color: #fbbf24;">⚠️ Syllabus Not Yet Released:</strong> Topic names, grading breakdown, and attendance policy all TBD. Update after syllabus is available.' },
        { text: '<strong>Short Course:</strong> Only 3 meeting dates (Jan 13, 20, 27) + Final Exam (Feb 11). Course ENDS after Final — one less to worry about!' },
        { text: '<strong>Meeting Structure:</strong> Each meeting covers 2 lectures = 6 total lectures for the Final.' },
        { text: '<strong style="color: #10b981;">✅ GCal Confirmed:</strong> All dates from GCal. No discrepancies with available data.' }
    ],
    critthink: [
        { text: '<strong style="color: #10b981;">❌ NO FORMAL EXAMS:</strong> This is a project-based course. Only 2 online quizzes (40% total) + Evidence-Based Group Project (60% total).', isGood: true },
        { text: '<strong>Date Discrepancies in Syllabus:</strong> Syllabus has internal inconsistencies. Calendar says Mar 18 for PPT/Video, grading section says Mar 19. Using earlier dates to be safe.' },
        { text: '<strong>Articles Due Date:</strong> Syllabus says Jan 12, but actual submission was Jan 13. Already submitted ✅.' },
        { text: '<strong>⚠️ SEVERE ATTENDANCE:</strong> Unexcused absence = FULL LETTER GRADE deduction PER absence. Late submissions = 0. Excused requires documentation or 1 week advance notice.' }
    ]
};

function loadExamCourseContent() {
    const courseKey = document.getElementById('examCoursePicker')?.value;
    const container = document.getElementById('examContentContainer');
    const discrepanciesCard = document.getElementById('discrepanciesCard');
    const discrepanciesList = document.getElementById('discrepanciesList');

    if (!container) return;

    // If no course selected, show placeholder
    if (!courseKey || !examContentData[courseKey]) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px;">
                <p style="color: #b0bcc8; font-size: 1.1em;">
                    ${courseKey && !examContentData[courseKey] ? '🚧 This course data is coming soon! Select another course.' : '👆 Select a course above to view exam content and track your study progress.'}
                </p>
            </div>
        `;
        if (discrepanciesCard) discrepanciesCard.style.display = 'none';
        return;
    }

    const course = examContentData[courseKey];
    let html = '';

    // Course overview card
    html += `
        <div class="card">
            <div class="card-header">
                <span class="card-title">${course.courseName} (${course.courseCode})</span>
            </div>
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <div style="background: #0f172a; padding: 15px 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #f87171;">${course.exams.length}</div>
                    <div style="color: #b0bcc8; font-size: 0.9em;">Exams</div>
                </div>
                <div style="background: #0f172a; padding: 15px 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #60a5fa;">${getTotalTopicsForCourse(courseKey)}</div>
                    <div style="color: #b0bcc8; font-size: 0.9em;">Total Topics</div>
                </div>
                <div style="background: #0f172a; padding: 15px 20px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #10b981;">${getCourseStudyProgress(courseKey)}%</div>
                    <div style="color: #b0bcc8; font-size: 0.9em;">Studied</div>
                </div>
            </div>
            ${course.studyTip ? `<div style="margin-top: 15px; padding: 12px 15px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; font-size: 0.9em; color: #6ee7b7;">${course.studyTip}</div>` : ''}
            ${course.optionalInfo ? `<div style="margin-top: 10px; padding: 10px 15px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; font-size: 0.85em; color: #93c5fd;">ℹ️ ${course.optionalInfo}</div>` : ''}
        </div>
    `;

    // Render required modules if any
    if (course.requiredModules && course.requiredModules.length > 0) {
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📹 Required Modules</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${course.requiredModules.map(mod => `
                        <div class="lecture-row" style="border-left: 3px solid ${mod.status === 'do_now' ? '#ef4444' : mod.status === 'confirm' ? '#f59e0b' : '#6b7280'};">
                            <div class="lecture-info">
                                <div class="lecture-topic" style="font-weight: 600;">
                                    ${mod.name}
                                    ${mod.status === 'do_now' ? '<span class="mandatory-badge">❌ DO NOW</span>' : ''}
                                    ${mod.status === 'confirm' ? '<span class="mandatory-badge" style="background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); color: #fcd34d;">❓ CONFIRM DONE</span>' : ''}
                                </div>
                                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 6px; font-size: 0.85em; color: #b0bcc8;">
                                    <span>📍 ${mod.platform}</span>
                                    <span>📅 Due: ${mod.due}</span>
                                </div>
                                <div style="margin-top: 6px; font-size: 0.85em; color: #fbbf24;">⚠️ Exam Impact: ${mod.examImpact}</div>
                                ${mod.note ? `<div class="lecture-notes">${mod.note}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Render other components (assignments, take-homes, etc.) if any
    if (course.otherComponents && course.otherComponents.length > 0) {
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📋 Other Graded Components</span>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Component</th><th>Weight</th><th>Due</th><th>Notes</th></tr>
                        </thead>
                        <tbody>
                            ${course.otherComponents.map(comp => `
                                <tr>
                                    <td style="font-weight: 600;">${comp.name}</td>
                                    <td><span class="exam-badge weight">${comp.weight}${typeof comp.weight === 'number' ? '%' : ''}</span></td>
                                    <td>${comp.due || '—'}</td>
                                    <td style="font-size: 0.85em; color: #b0bcc8;">${comp.note || '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Render pending info if any (for Geriatrics)
    if (course.pendingInfo && course.pendingInfo.length > 0) {
        html += `
            <div class="card">
                <div class="card-header" style="background: rgba(251, 191, 36, 0.1);">
                    <span class="card-title">⚠️ Pending Information</span>
                </div>
                <ul style="margin: 15px 0 0 20px; color: #fcd34d;">
                    ${course.pendingInfo.map(info => `<li style="margin-bottom: 8px;">${info}</li>`).join('')}
                </ul>
                <div style="margin-top: 15px; padding: 10px 12px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; font-size: 0.85em; color: #93c5fd;">
                    💡 <strong>Action:</strong> Get syllabus when released and update this section!
                </div>
            </div>
        `;
    }

    // Render progress tracker if any (for Critical Thinking)
    if (course.currentProgress && course.remainingProgress) {
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📊 Your Progress</span>
                </div>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                        <div style="font-size: 2em; font-weight: 700; color: #10b981;">${course.currentProgress.completed}%</div>
                        <div style="color: #6ee7b7; font-weight: 600; margin-bottom: 10px;">✅ Completed</div>
                        <ul style="margin: 0; padding-left: 20px; color: #b0bcc8; font-size: 0.85em;">
                            ${course.currentProgress.items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="flex: 1; min-width: 200px; background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <div style="font-size: 2em; font-weight: 700; color: #ef4444;">${course.remainingProgress.remaining}%</div>
                        <div style="color: #fca5a5; font-weight: 600; margin-bottom: 10px;">❌ Remaining</div>
                        <ul style="margin: 0; padding-left: 20px; color: #b0bcc8; font-size: 0.85em;">
                            ${course.remainingProgress.items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Render attendance policy warning if any (for Critical Thinking)
    if (course.attendancePolicy) {
        html += `
            <div class="card" style="border: 2px solid rgba(239, 68, 68, 0.5);">
                <div class="card-header" style="background: rgba(239, 68, 68, 0.15);">
                    <span class="card-title" style="color: #fca5a5;">${course.attendancePolicy.warning}</span>
                </div>
                <ul style="margin: 15px 0 0 20px; color: #fca5a5;">
                    ${course.attendancePolicy.rules.map(rule => `<li style="margin-bottom: 8px;">${rule}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Render Quiz 2 details if any (for Critical Thinking)
    if (course.quiz2Details) {
        const q2 = course.quiz2Details;
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📝 Quiz 2 Details (${q2.weight})</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                    <div style="background: #0f172a; padding: 12px; border-radius: 8px;">
                        <div style="color: #b0bcc8; font-size: 0.8em;">📅 Date</div>
                        <div style="color: #e2e8f0; font-weight: 600;">${q2.date}</div>
                    </div>
                    <div style="background: #0f172a; padding: 12px; border-radius: 8px;">
                        <div style="color: #b0bcc8; font-size: 0.8em;">🕐 Time</div>
                        <div style="color: #e2e8f0; font-weight: 600;">${q2.time}</div>
                    </div>
                    <div style="background: #0f172a; padding: 12px; border-radius: 8px;">
                        <div style="color: #b0bcc8; font-size: 0.8em;">📋 Format</div>
                        <div style="color: #e2e8f0; font-weight: 600;">${q2.format}</div>
                    </div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong style="color: #e2e8f0;">📖 Study Focus:</strong>
                    <ul style="margin: 10px 0 0 20px; color: #b0bcc8;">
                        ${q2.studyFocus.map(focus => `<li style="margin-bottom: 6px;">${focus}</li>`).join('')}
                    </ul>
                </div>
                <div style="padding: 10px 12px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; font-size: 0.85em; color: #93c5fd;">
                    📚 <strong>Resource:</strong> ${q2.resource}
                </div>
            </div>
        `;
    }

    // Render live presentations schedule if any (for Critical Thinking)
    if (course.livePresentations && course.livePresentations.length > 0) {
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">🎤 Live Presentation Dates</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${course.livePresentations.map((pres, idx) => `
                        <div class="lecture-row" style="border-left: 3px solid #a78bfa;">
                            <div class="lecture-info">
                                <div class="lecture-meta">
                                    <span>📅 ${formatExamDate(pres.date)} (${pres.day})</span>
                                    <span>🕐 ${pres.time}</span>
                                    <span>📍 ${pres.room}</span>
                                </div>
                                ${pres.note ? `<div style="margin-top: 6px; color: #c4b5fd; font-size: 0.85em;">${pres.note}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 15px; padding: 10px 12px; background: rgba(167, 139, 250, 0.1); border-radius: 6px; font-size: 0.85em; color: #c4b5fd;">
                    💡 Your group will present on ONE of these dates (assignment TBD).
                </div>
            </div>
        `;
    }

    // Render quiz schedule if any (for Oral Med)
    if (course.quizSchedule && course.quizSchedule.length > 0) {
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📝 Quiz Schedule (10 Quizzes × 2.5% = 25%)</span>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Quiz</th><th>Covers</th><th>Topic</th><th>Due</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            ${course.quizSchedule.map(quiz => `
                                <tr style="${quiz.status === 'done' ? 'opacity: 0.6;' : ''}">
                                    <td style="font-weight: 600;">Quiz ${quiz.num}</td>
                                    <td style="color: #b0bcc8;">${quiz.covers}</td>
                                    <td>${quiz.topic}</td>
                                    <td style="color: #fbbf24;">${quiz.due}</td>
                                    <td>${quiz.status === 'done' ? '<span style="color: #10b981;">✅ Done</span>' : '<span style="color: #f87171;">❌ Pending</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 10px; padding: 10px 12px; background: rgba(251, 191, 36, 0.1); border-radius: 6px; font-size: 0.85em; color: #fcd34d;">
                    ⚠️ <strong>Remember:</strong> Quizzes due 11:59 PM the NIGHT BEFORE the next lecture!
                </div>
            </div>
        `;
    }

    // Render passion project if any (for Oral Med)
    if (course.passionProject) {
        const pp = course.passionProject;
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">🎨 Passion Project (12.5%)</span>
                </div>
                <div style="margin-bottom: 15px;">
                    <div style="font-size: 1.1em; color: #f87171; font-weight: 600;">📅 Due: ${pp.due}</div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong style="color: #e2e8f0;">Requirements:</strong>
                    <ul style="margin: 10px 0 0 20px; color: #b0bcc8;">
                        ${pp.requirements.map(req => `<li style="margin-bottom: 6px;">${req}</li>`).join('')}
                    </ul>
                </div>
                ${pp.note ? `<div style="padding: 10px 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px; font-size: 0.85em; color: #6ee7b7;">💡 ${pp.note}</div>` : ''}
            </div>
        `;
    }

    // Render exam rules if any (for Oral Med)
    if (course.examRules) {
        html += `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">📋 Exam Rules</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div class="lecture-row" style="border-left: 3px solid #60a5fa;">
                        <div class="lecture-info">
                            <div class="lecture-topic" style="font-weight: 600; color: #93c5fd;">📝 Notecard Policy</div>
                            <div style="margin-top: 6px; color: #b0bcc8;">${course.examRules.notecard}</div>
                        </div>
                    </div>
                    <div class="lecture-row" style="border-left: 3px solid #f59e0b;">
                        <div class="lecture-info">
                            <div class="lecture-topic" style="font-weight: 600; color: #fcd34d;">🔄 Makeup Exams</div>
                            <div style="margin-top: 6px; color: #b0bcc8;">${course.examRules.makeup}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render each exam for this course
    course.exams.forEach(exam => {
        html += renderExamCard({
            ...exam,
            courseKey: courseKey,
            courseName: course.courseName,
            courseCode: course.courseCode,
            colorClass: course.colorClass,
            studyTip: course.studyTip
        });
    });

    container.innerHTML = html;

    // Show course-specific discrepancies
    if (discrepanciesCard && discrepanciesList && courseDiscrepancies[courseKey]) {
        discrepanciesList.innerHTML = courseDiscrepancies[courseKey].map(d =>
            `<div class="discrepancy-note">${d.text}</div>`
        ).join('');
        discrepanciesCard.style.display = 'block';
    } else if (discrepanciesCard) {
        discrepanciesCard.style.display = 'none';
    }
}

function getTotalTopicsForCourse(courseKey) {
    const course = examContentData[courseKey];
    if (!course) return 0;
    let total = 0;
    course.exams.forEach(exam => {
        if (exam.lectures) total += exam.lectures.length;
        if (exam.reviewContent) total += exam.reviewContent.length;
    });
    return total;
}

function getCourseStudyProgress(courseKey) {
    const course = examContentData[courseKey];
    if (!course) return 0;
    let studied = 0;
    let total = 0;
    course.exams.forEach(exam => {
        if (exam.lectures) {
            exam.lectures.forEach(lec => {
                total++;
                const key = `${exam.id}-lec${lec.num}`;
                if (roadmapData.examStudyProgress[key]) studied++;
            });
        }
        if (exam.reviewContent) {
            exam.reviewContent.forEach(lec => {
                total++;
                const key = `${exam.id}-review-lec${lec.num}`;
                if (roadmapData.examStudyProgress[key]) studied++;
            });
        }
    });
    return total > 0 ? Math.round((studied / total) * 100) : 0;
}

function getDaysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = parseLocalDate(dateStr);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function formatExamDate(dateStr) {
    if (!dateStr) return dateStr || 'Date TBD';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getExamProgress(examId, lectures, reviewContent) {
    let total = lectures ? lectures.length : 0;
    let studied = 0;

    if (lectures) {
        lectures.forEach((lec, idx) => {
            const key = `${examId}-lec${lec.num}`;
            if (roadmapData.examStudyProgress[key]) studied++;
        });
    }

    // For cumulative exams, also count review content
    let reviewTotal = 0;
    let reviewStudied = 0;
    if (reviewContent) {
        reviewTotal = reviewContent.length;
        reviewContent.forEach((lec, idx) => {
            const key = `${examId}-review-lec${lec.num}`;
            if (roadmapData.examStudyProgress[key]) reviewStudied++;
        });
    }

    return {
        newStudied: studied,
        newTotal: total,
        reviewStudied: reviewStudied,
        reviewTotal: reviewTotal,
        totalStudied: studied + reviewStudied,
        totalCount: total + reviewTotal,
        percent: total + reviewTotal > 0 ? Math.round(((studied + reviewStudied) / (total + reviewTotal)) * 100) : 0
    };
}

function toggleLectureStudied(examId, lecNum, isReview) {
    const key = isReview ? `${examId}-review-lec${lecNum}` : `${examId}-lec${lecNum}`;
    roadmapData.examStudyProgress[key] = !roadmapData.examStudyProgress[key];
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    loadExamCourseContent();
}

function markAllStudied(examId, lectures, isReview, markAs) {
    lectures.forEach(lec => {
        const key = isReview ? `${examId}-review-lec${lec.num}` : `${examId}-lec${lec.num}`;
        roadmapData.examStudyProgress[key] = markAs;
    });
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    loadExamCourseContent();
}

function toggleContentSection(sectionId) {
    const header = document.getElementById(`section-header-${sectionId}`);
    const body = document.getElementById(`section-body-${sectionId}`);
    if (header && body) {
        header.classList.toggle('collapsed');
        body.classList.toggle('collapsed');
    }
}

function renderExamCard(exam) {
    const daysUntil = getDaysUntil(exam.date);
    const progress = getExamProgress(exam.id, exam.lectures, exam.reviewContent);
    const isPast = exam.isPast || daysUntil < 0;

    // Determine urgency
    let urgencyClass = '';
    let daysClass = 'days';
    if (!isPast) {
        if (daysUntil <= 7 && progress.percent < 50) {
            urgencyClass = 'urgent';
            daysClass = 'days urgent';
        } else if (daysUntil <= 7) {
            daysClass = 'days warning';
        }
    } else {
        daysClass = 'days past';
    }

    if (isPast && exam.score) {
        urgencyClass = 'completed';
    }

    const pastClass = isPast ? 'exam-past' : '';

    let html = `
        <div class="exam-card ${urgencyClass} ${pastClass}">
            <div class="exam-card-header ${exam.colorClass}">
                <div class="exam-card-title">
                    <div>
                        <h3>${exam.courseName}</h3>
                        <div style="color: #b0bcc8; font-size: 0.9em; margin-top: 4px;">
                            ${exam.name} • ${formatExamDate(exam.date)}${exam.time ? ` • ${exam.time}` : ''}${exam.room ? ` • ${exam.room}` : ''}
                        </div>
                    </div>
                    <div class="exam-badges">
                        ${exam.isCumulative ? '<span class="exam-badge cumulative">📚 Cumulative</span>' : ''}
                        <span class="exam-badge weight">${exam.weight}%</span>
                        <span class="exam-badge ${daysClass}">
                            ${isPast ? (exam.score ? `Scored: ${exam.score}%` : 'Past') : `${daysUntil} days`}
                        </span>
                        ${isPast ? '<span style="background:#059669; color:white; padding:2px 6px; border-radius:4px; font-size:11px; margin-left:4px;">COMPLETED</span>' : ''}
                    </div>
                </div>

                ${!isPast ? `
                <div class="exam-progress">
                    <div class="exam-progress-bar">
                        <div class="exam-progress-fill ${progress.percent >= 80 ? 'good' : ''}" style="width: ${progress.percent}%"></div>
                    </div>
                    <div class="exam-progress-text">
                        <span>${progress.totalStudied} of ${progress.totalCount} topics studied</span>
                        <span>${progress.percent}% complete</span>
                    </div>
                </div>
                ` : ''}

                ${exam.notes ? `<div style="margin-top: 12px; padding: 10px 12px; background: rgba(220, 38, 38, 0.15); border-radius: 6px; font-size: 0.85em; color: #fca5a5;">⚠️ ${exam.notes}</div>` : ''}
            </div>

            <div class="exam-card-body">
    `;

    // Render review content section for cumulative exams
    if (exam.isCumulative && exam.reviewContent && exam.reviewContent.length > 0) {
        const reviewProgress = getExamProgress(exam.id, null, exam.reviewContent);
        html += `
            <div class="content-section">
                <div class="content-section-header" id="section-header-${exam.id}-review" onclick="toggleContentSection('${exam.id}-review')">
                    <h4>
                        <span class="toggle-icon">▼</span>
                        📚 Review Content (from previous exam)
                        <span style="color: #94a3b8; font-weight: 400;">(${reviewProgress.reviewStudied}/${reviewProgress.reviewTotal})</span>
                    </h4>
                </div>
                <div class="content-section-body" id="section-body-${exam.id}-review">
                    <div class="bulk-actions">
                        <button class="bulk-btn" onclick="markAllStudied('${exam.id}', examContentData['${exam.courseKey}'].exams.find(e => e.id === '${exam.id}').reviewContent, true, true)">✓ Mark all reviewed</button>
                        <button class="bulk-btn" onclick="markAllStudied('${exam.id}', examContentData['${exam.courseKey}'].exams.find(e => e.id === '${exam.id}').reviewContent, true, false)">✗ Clear all</button>
                    </div>
                    ${renderLectureList(exam.id, exam.reviewContent, true)}
                </div>
            </div>
        `;
    }

    // Render new content section
    if (exam.lectures && exam.lectures.length > 0) {
        const sectionTitle = exam.isCumulative ? '🆕 New Content for this Exam' : `📖 Content for ${exam.name}`;
        html += `
            <div class="content-section">
                <div class="content-section-header" id="section-header-${exam.id}-new" onclick="toggleContentSection('${exam.id}-new')">
                    <h4>
                        <span class="toggle-icon">▼</span>
                        ${sectionTitle}
                        <span style="color: #94a3b8; font-weight: 400;">(${progress.newStudied}/${progress.newTotal})</span>
                    </h4>
                </div>
                <div class="content-section-body" id="section-body-${exam.id}-new">
                    <div class="bulk-actions">
                        <button class="bulk-btn" onclick="markAllStudied('${exam.id}', examContentData['${exam.courseKey}'].exams.find(e => e.id === '${exam.id}').lectures, false, true)">✓ Mark all studied</button>
                        <button class="bulk-btn" onclick="markAllStudied('${exam.id}', examContentData['${exam.courseKey}'].exams.find(e => e.id === '${exam.id}').lectures, false, false)">✗ Clear all</button>
                    </div>
                    ${renderLectureList(exam.id, exam.lectures, false)}
                </div>
            </div>
        `;
    }

    // Render SLC sessions if any
    if (exam.slcSessions && exam.slcSessions.length > 0) {
        html += `
            <div class="content-section">
                <div class="content-section-header" id="section-header-${exam.id}-slc" onclick="toggleContentSection('${exam.id}-slc')">
                    <h4>
                        <span class="toggle-icon">▼</span>
                        🔧 SLC Sessions (Wire Bending)
                    </h4>
                </div>
                <div class="content-section-body" id="section-body-${exam.id}-slc">
                    ${exam.slcSessions.map(slc => `
                        <div class="lecture-row">
                            <div class="lecture-info">
                                <div class="lecture-meta">
                                    <span>📅 ${formatExamDate(slc.date)}</span>
                                    <span>🕐 ${slc.time}</span>
                                    <span>📍 ${slc.room}</span>
                                </div>
                                <div class="lecture-topic">${slc.topic}</div>
                                <div class="lecture-lecturer">👤 ${slc.lecturer}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Render Essay Topics if any (for Perio, etc.)
    if (exam.essayTopics && exam.essayTopics.length > 0) {
        html += `
            <div class="content-section">
                <div class="content-section-header" id="section-header-${exam.id}-essays" onclick="toggleContentSection('${exam.id}-essays')">
                    <h4>
                        <span class="toggle-icon">▼</span>
                        ✍️ Essay Topics (Fleisher picks 2)
                    </h4>
                </div>
                <div class="content-section-body" id="section-body-${exam.id}-essays">
                    ${exam.essayTopics.map((essay, idx) => `
                        <div class="lecture-row" style="border-left: 3px solid #8b5cf6;">
                            <div class="lecture-info">
                                <div class="lecture-topic" style="font-weight: 600; color: #a78bfa;">${idx + 1}. ${essay.topic}</div>
                                <div style="margin-top: 8px; font-size: 0.85em;">
                                    <span style="color: #fbbf24;">📖 Reference:</span>
                                    <span style="color: #fcd34d;">${essay.reference}</span>
                                </div>
                                <div style="margin-top: 4px; font-size: 0.85em;">
                                    <span style="color: #60a5fa;">🔑 Key Points:</span>
                                    <span style="color: #93c5fd;">${essay.keyPoints}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    <div style="margin-top: 10px; padding: 10px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; font-size: 0.85em; color: #a78bfa;">
                        💡 <strong>Essay Tips:</strong> ~45 min per essay. Must be LEGIBLE (or 0!). Blue book format. Answer as numbered list (1, 2, 3...) matching question parts. Need 1 reference per essay.
                    </div>
                </div>
            </div>
        `;
    }

    // Render Blocked Dates if any
    if (exam.blockedDates && exam.blockedDates.length > 0) {
        html += `
            <div class="content-section">
                <div class="content-section-header" id="section-header-${exam.id}-blocked" onclick="toggleContentSection('${exam.id}-blocked')" style="background: rgba(220, 38, 38, 0.15);">
                    <h4>
                        <span class="toggle-icon">▼</span>
                        🚫 Blocked Dates
                    </h4>
                </div>
                <div class="content-section-body" id="section-body-${exam.id}-blocked">
                    ${exam.blockedDates.map(blocked => `
                        <div class="lecture-row" style="border-left: 3px solid #ef4444; background: rgba(220, 38, 38, 0.1);">
                            <div class="lecture-info">
                                <div class="lecture-meta">
                                    <span>📅 ${formatExamDate(blocked.date)} (${blocked.day})</span>
                                </div>
                                <div class="lecture-topic" style="color: #fca5a5;">${blocked.note}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Render Meeting Schedule if any (for Geriatrics)
    if (exam.meetingSchedule && exam.meetingSchedule.length > 0) {
        html += `
            <div class="content-section">
                <div class="content-section-header" id="section-header-${exam.id}-meetings" onclick="toggleContentSection('${exam.id}-meetings')" style="background: rgba(16, 185, 129, 0.15);">
                    <h4>
                        <span class="toggle-icon">▼</span>
                        📅 Meeting Schedule (3 Meetings)
                    </h4>
                </div>
                <div class="content-section-body" id="section-body-${exam.id}-meetings">
                    ${exam.meetingSchedule.map(meeting => `
                        <div class="lecture-row" style="border-left: 3px solid ${meeting.status === 'passed' ? '#10b981' : '#60a5fa'}; ${meeting.status === 'passed' ? 'opacity: 0.6;' : ''}">
                            <div class="lecture-info">
                                <div class="lecture-meta">
                                    <span>📅 Meeting ${meeting.meeting}</span>
                                    <span>📆 ${formatExamDate(meeting.date)} (${meeting.day})</span>
                                    <span>🕐 ${meeting.time}</span>
                                    <span>📍 ${meeting.room}</span>
                                </div>
                                <div class="lecture-topic" style="font-weight: 600;">${meeting.lectures}</div>
                                <div style="margin-top: 4px; font-size: 0.85em; color: ${meeting.status === 'passed' ? '#10b981' : '#94a3b8'};">
                                    ${meeting.status === 'passed' ? '✅ Completed' : '⏳ Upcoming'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Render No Class Dates if any (for Oral Med)
    if (exam.noClassDates && exam.noClassDates.length > 0) {
        html += `
            <div class="content-section">
                <div class="content-section-header" id="section-header-${exam.id}-noclass" onclick="toggleContentSection('${exam.id}-noclass')" style="background: rgba(107, 114, 128, 0.15);">
                    <h4>
                        <span class="toggle-icon">▼</span>
                        ❌ No Class Dates
                    </h4>
                </div>
                <div class="content-section-body" id="section-body-${exam.id}-noclass">
                    ${exam.noClassDates.map(noclass => `
                        <div class="lecture-row" style="border-left: 3px solid #6b7280; background: rgba(107, 114, 128, 0.1);">
                            <div class="lecture-info">
                                <div class="lecture-meta">
                                    <span>📅 ${formatExamDate(noclass.date)} (${noclass.day})</span>
                                </div>
                                <div class="lecture-topic" style="color: #9ca3af;">${noclass.note}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

function renderLectureList(examId, lectures, isReview) {
    if (!lectures || lectures.length === 0) return '<p style="color: #94a3b8; padding: 10px;">No lectures listed.</p>';

    return lectures.map(lec => {
        const key = isReview ? `${examId}-review-lec${lec.num}` : `${examId}-lec${lec.num}`;
        const isStudied = roadmapData.examStudyProgress[key] || false;

        return `
            <div class="lecture-row ${isStudied ? 'studied' : ''}">
                <input type="checkbox" class="lecture-checkbox"
                    ${isStudied ? 'checked' : ''}
                    onchange="toggleLectureStudied('${examId}', ${lec.num}, ${isReview})">
                <div class="lecture-info">
                    <div class="lecture-meta">
                        <span>📖 Lec ${lec.num}</span>
                        <span>📅 ${formatExamDate(lec.date)} (${lec.day})</span>
                        <span>🕐 ${lec.time}</span>
                        <span>📍 ${lec.room}</span>
                    </div>
                    <div class="lecture-topic">
                        ${lec.topic}
                        ${lec.mandatory ? '<span class="mandatory-badge">⚠️ MANDATORY</span>' : ''}
                    </div>
                    <div class="lecture-lecturer">👤 ${lec.lecturer}</div>
                    ${lec.reading ? `<div style="font-size: 0.8em; color: #60a5fa; margin-top: 4px;">📚 Reading: ${lec.reading}</div>` : ''}
                    ${lec.mandatoryNote ? `<div class="lecture-notes">${lec.mandatoryNote}</div>` : ''}
                    ${lec.note ? `<div class="lecture-notes">${lec.note}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}
