// ============================================
// PERIODIC REVIEW TAB
// periodic-review.js — PR1 baseline, helpers, sections 1-3
// ============================================

// PR Part 1 frozen baseline (December 2025 data)
const PR1_BASELINE = Object.freeze({
    date: '2025-12-13',

    clinicalProgress: Object.freeze({
        fixed:        Object.freeze({ c: 0, ip: 0, p: 0 }),
        implant:      Object.freeze({ c: 0, ip: 0, spc: 0, p: 0 }),
        implSurg:     Object.freeze({ c: 0 }),
        bridge:       Object.freeze({ c: 0, ip: 0, p: 0 }),
        remoComplete: Object.freeze({ c: 0, ip: 0, p: 0 }),
        overdenture:  Object.freeze({ c: 0, p: 2 }),
        remoPartial:  Object.freeze({ c: 0, ip: 0, p: 0 }),
        operative:    Object.freeze({ c: 6, p: 7 }),
        perioSrp:     Object.freeze({ c: 0, p: 1 }),
        endo:         Object.freeze({ c: 0, p: 0 })
    }),

    adminStats: Object.freeze({
        ptsAssigned: 16,
        notSeen6Mo: 4,
        tpNotConsented: 7,
        booked: 6,
        attended: 30,
        missed: 4,
        unclosed: 2,
        blank: 1,
        unauthorized: 0
    }),

    departments: Object.freeze({
        fixed:     Object.freeze({ completed: 0, inProgress: 0, planned: 2 }),
        operative: Object.freeze({ completed: 6, inProgress: 0, planned: 7 }),
        dentures:  Object.freeze({ completed: 0, inProgress: 2, planned: 2 }),
        rpd:       Object.freeze({ completed: 0, inProgress: 0, planned: 0 }),
        srp:       Object.freeze({ completed: 0, inProgress: 0, planned: 1 }),
        endo:      Object.freeze({ completed: 0, inProgress: 0, planned: 0 })
    }),

    completedProceduresCount: 41,
    inProgressProceduresCount: 2,

    patientRoster: Object.freeze([
        Object.freeze({ chartNumber: '1763380', name: 'Delossantos, Arthur', reliability: 'red', note: 'earliest apt requested for recall - no response - never seen pt' }),
        Object.freeze({ chartNumber: '1647620', name: 'Gil, Anabely', reliability: 'red', note: 'earliest Apt requested for SRP - no response - pt coassigned with post doc pros' }),
        Object.freeze({ chartNumber: '2569813', name: 'Koshkarian, Kavitha', reliability: 'red', note: 'earliest apt requested for recall - no response - never seen pt' }),
        Object.freeze({ chartNumber: '2577113', name: 'Krima, Mohamed', reliability: 'green', note: 'NV 12/04/2025 - #13 DO - reliable' }),
        Object.freeze({ chartNumber: '1186199', name: 'Laplante, Jonathan', reliability: 'red', note: 'earliest apt requested for recall - no response - never seen pt' }),
        Object.freeze({ chartNumber: '23042563', name: 'Mohamed, Karim', reliability: 'red', note: 'earliest apt requested for recall - no response - never seen pt' }),
        Object.freeze({ chartNumber: '2118878', name: 'Murillo, Carmen', reliability: 'yellow', note: 'pt missed last apt - requested new apt for implant LOE - no response' }),
        Object.freeze({ chartNumber: '23048578', name: 'Penn, Aubrey', reliability: 'red', note: 'earliest apt requested for recall - no response - never seen pt' }),
        Object.freeze({ chartNumber: '2467990', name: 'Rosario, Jose', reliability: 'green', note: 'intermaxillary records completed 11/08/2025' }),
        Object.freeze({ chartNumber: '2107896', name: 'Sbardella, Kristen', reliability: 'yellow', note: 'only seen pt once for denture adjustment' }),
        Object.freeze({ chartNumber: '0966540', name: 'Soivilien, Sandrine', reliability: 'red', note: 'earliest apt requested for recall - no response - never seen pt' }),
        Object.freeze({ chartNumber: '079118', name: 'Williams, Kisha', reliability: 'green', note: 'pt scheduled for recall 11/21/2025' }),
        Object.freeze({ chartNumber: '1297657', name: 'Wright, Tawana', reliability: 'green', note: 'pt scheduled for #14 DO 12/13/2025' }),
        Object.freeze({ chartNumber: '2225586', name: 'Lopes, Alirio', reliability: 'remove', note: 'remove pt HTC' }),
        Object.freeze({ chartNumber: '23047754', name: 'Lesmeister, Jamielynn', reliability: 'remove', note: 'remove patient' }),
        Object.freeze({ chartNumber: '1754021', name: 'Nova, Jose', reliability: 'remove', note: 'Not my patient' })
    ]),

    subjectiveReport: 'Since beginning clinic in August 2025 I feel I have grown tremendously in such a short period of time. I am grateful for having my DC rotation the second week of clinic in early August as I feel it greatly helped me get my footing in how things work clinically at GSDM. Since then, I feel I have had a busy workload. I have completed 12 surfaces of operative which is something I am greatly proud of especially because my patients actually return. Once I completed the intermax record appointment for interim dentures, that was another great achievement which similarly took a lot of planning and preparation needed on my own time away from normal clinic/school hours. Similarly, I have completed 4 prophys and can reach near the point of starting a summative prophy to complete that requirement. I also went on oral surgery rotations recently and this grew my confidence even more in administering LA injections and even having extracted four teeth during my time. All in all, I have had a busy workload, successful appointments, good patients, and getting my requirements done as much as I can.\n\nHowever, one major concern remains. I am simply reaching the point where the patients I can actually rely on to return for their next appointment, will soon not be fulfilling any requirements of mine. This leaves me with a roster of unreliable patients who are not treatment planned anything that may help me graduate. As is the case with most classmates I talk to, I am most concerned with my fixed requirements being completed as well as perio SRPs. Furthermore, I am assigned 17 patients on SPS, I can confidently say only 4-6 of these patients are truly reliable and can be expected to return. The rest I have not been able to commit to scheduling an appointment, and thus, have been unable to see them. The patients highlighted in yellow are patients who I have seen at least once, but are co-assigned to another student, leaving me only with recalls for both, and thus unreliable for any requirements to complete.\n\nIf there is one thing I can change is that I may have more patients continuously assigned to me so that I can have an opportunity to get more of my requirements done. This has been a stressful situation to think about.\n\nSpecifically for clinic, I think I can still improve on satisfying all the different GSF needs for how they expect a composite restoration workflow to go. I am mentally working out the differences and similarities seen between their philosophies, and can assume this may be true across many procedures. I need to continue being in the clinic gaining experience in seeing how treatment planning philosophies and specific procedure workflows may vary from doctor to doctor.\n\nAnother major area of improvement I hope to see in myself, is tackling the requirements that do not depend on patients. Whether it be leadership in rounds, dental technician, etc. I should be doing more of these smaller requirements when I am not busy with my own patients.\n\nOverall, as for my personal growth, clinical growth, communication growth and overall satisfaction, I feel my expectations for the first semester of 3rd year clinic at GSDM has exceeded my expectations positively. I feel my GPL and GSF are responsive and will address any concerns. I just hope I can continue seeing patients that will also help me meet my graduation requirements.'
});

// SPS Dashboard category display names (ordered as in SPS)
const SPS_CATEGORIES = [
    { key: 'fixed', label: 'Fixed', fields: ['c', 'ip', 'p'] },
    { key: 'implant', label: 'Implant', fields: ['c', 'ip', 'spc', 'p'] },
    { key: 'implSurg', label: 'Impl Surg', fields: ['c'] },
    { key: 'bridge', label: 'Bridge', fields: ['c', 'ip', 'p'] },
    { key: 'remoComplete', label: 'Remo Complete', fields: ['c', 'ip', 'p'] },
    { key: 'overdenture', label: 'Overdenture', fields: ['c', 'p'] },
    { key: 'remoPartial', label: 'Remo Partial', fields: ['c', 'ip', 'p'] },
    { key: 'operative', label: 'Operative', fields: ['c', 'p'] },
    { key: 'perioSrp', label: 'Perio SRP', fields: ['c', 'p'] },
    { key: 'endo', label: 'Endo', fields: ['c', 'p'] }
];

// Admin stat display config
const ADMIN_STATS_CONFIG = [
    { key: 'ptsAssigned', label: 'Pts Assigned', snapshotPath: 'roster.ptsAssigned' },
    { key: 'notSeen6Mo', label: 'Not Seen in 6 Months', snapshotPath: 'roster.notSeen6Mo' },
    { key: 'tpNotConsented', label: 'TP Not Consented', snapshotPath: 'roster.tpNotConsented' },
    { key: 'booked', label: 'Booked', snapshotPath: 'appointments.booked' },
    { key: 'attended', label: 'Attended', snapshotPath: null },
    { key: 'missed', label: 'Missed', snapshotPath: 'appointments.missed' },
    { key: 'unclosed', label: 'Unclosed', snapshotPath: 'appointments.unclosed' },
    { key: 'blank', label: 'Blank Notes', snapshotPath: 'appointments.blank' },
    { key: 'unauthorized', label: 'Unauthorized', snapshotPath: 'appointments.unauthorized' }
];


// ============================================
// HELPER FUNCTIONS
// ============================================

function getPR2Data() {
    if (!roadmapData.periodicReviews) {
        roadmapData.periodicReviews = getDefaultRoadmapData().periodicReviews;
    }
    if (!roadmapData.periodicReviews.pr2) {
        roadmapData.periodicReviews.pr2 = getDefaultRoadmapData().periodicReviews.pr2;
    }
    return roadmapData.periodicReviews.pr2;
}

function savePR2Field(field, value) {
    const pr2 = getPR2Data();
    pr2[field] = value;
    pr2.lastEdited = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}

function getLatestSnapshot() {
    const snaps = getValues(roadmapData.clinicalData?.dashboardSnapshots);
    if (snaps.length > 0) return snaps[0];
    return null;
}

function getSnapshotValue(snapshot, path) {
    if (!snapshot || !path) return null;
    const parts = path.split('.');
    let val = snapshot;
    for (let i = 0; i < parts.length; i++) {
        if (val == null) return null;
        val = val[parts[i]];
    }
    return val ?? null;
}

function renderDelta(pr1Val, nowVal) {
    const p = parseInt(pr1Val) || 0;
    const n = parseInt(nowVal) || 0;
    const d = n - p;
    if (d > 0) return '<span class="pr-delta-positive">+' + d + '</span>';
    if (d < 0) return '<span class="pr-delta-negative">' + d + '</span>';
    return '<span class="pr-delta-zero">\u2014</span>';
}

function formatPRDate(dateStr) {
    if (!dateStr) return 'Not set';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthIdx = parseInt(parts[1]) - 1;
    if (monthIdx < 0 || monthIdx > 11) return dateStr;
    return months[monthIdx] + ' ' + parseInt(parts[2]) + ', ' + parts[0];
}

function formatPRMonthYear(dateStr) {
    if (!dateStr) return 'Present';
    const parts = dateStr.split('-');
    if (parts.length < 2) return dateStr;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthIdx = parseInt(parts[1]) - 1;
    if (monthIdx < 0 || monthIdx > 11) return dateStr;
    return months[monthIdx] + ' ' + parts[0];
}


// ============================================
// SECTION RENDERERS
// ============================================

// --- Section 1: Header ---
function renderPRHeader(pr2) {
    const reviewDate = pr2.reviewDate ?? null;
    const reviewDateDisplay = reviewDate ? formatPRDate(reviewDate) : 'Click to set date';
    const periodEnd = reviewDate ? formatPRMonthYear(reviewDate) : 'Present';
    const reviewPeriod = 'December 2025 \u2014 ' + periodEnd;

    let html = '<div class="pr-section" id="pr-section-header">';
    html += '<div style="text-align:center; margin-bottom:32px; padding-bottom:24px; border-bottom:2px solid #17212b;">';
    html += '<div class="pr-header-title">Written Report for Periodic Review</div>';
    html += '<div class="pr-header-subtitle">Suleman Shaikh \u2014 DMD\u201927 \u2014 U67779699</div>';
    html += '<div style="margin-top:16px; font-size:0.85rem; color:#62707c; letter-spacing:0.05em; text-transform:uppercase;">';
    html += 'Part 2: Objective Report';
    html += '</div>';
    html += '<div style="margin-top:12px; font-size:0.9rem; color:#17212b;">';
    html += 'Review Date: <span id="pr-review-date" style="cursor:pointer; border-bottom:1px dashed #1a7f79; color:#1a7f79; padding-bottom:1px;" title="Click to change">';
    // NOTE: reviewDateDisplay is derived from formatPRDate() which only uses parsed date parts, not user input
    html += escapeHtml(reviewDateDisplay);
    html += '</span>';
    html += '</div>';
    html += '<div style="margin-top:6px; font-size:0.85rem; color:#62707c;">';
    html += 'Review Period: ' + escapeHtml(reviewPeriod);
    html += '</div>';
    html += '</div>';
    html += '</div>';

    return html;
}

// --- Section 2: SPS Dashboard Summary ---
function renderPRDashboardSummary(pr2, snapshot) {
    const cp1 = PR1_BASELINE.clinicalProgress;
    const cpNow = snapshot?.clinicalProgress ?? {};

    let html = '<div class="pr-section" id="pr-section-2">';
    html += '<div class="pr-section-number">02</div>';
    html += '<div class="pr-section-title">SPS Dashboard Summary</div>';
    html += '<div class="pr-panel">';

    // Build column headers dynamically based on all possible fields
    const allFields = ['c', 'ip', 'spc', 'p'];
    const fieldLabels = { c: 'C', ip: 'IP', spc: 'SPC', p: 'P' };

    html += '<div style="overflow-x:auto;">';
    html += '<table class="pr-table">';
    html += '<thead><tr>';
    html += '<th>Category</th>';
    allFields.forEach(function(f) {
        html += '<th class="pr-mono" style="text-align:center;">' + fieldLabels[f] + ' (PR1)</th>';
        html += '<th class="pr-mono" style="text-align:center;">' + fieldLabels[f] + ' (Now)</th>';
        html += '<th style="text-align:center;">\u0394</th>';
    });
    html += '</tr></thead>';

    html += '<tbody>';
    SPS_CATEGORIES.forEach(function(cat) {
        const pr1Cat = cp1[cat.key] ?? {};
        const nowCat = cpNow[cat.key] ?? {};

        html += '<tr>';
        html += '<td style="font-weight:600;">' + escapeHtml(cat.label) + '</td>';
        allFields.forEach(function(f) {
            if (cat.fields.indexOf(f) >= 0) {
                const pr1Val = pr1Cat[f] ?? 0;
                const nowVal = nowCat[f] ?? 0;
                html += '<td class="pr-mono" style="text-align:center;">' + pr1Val + '</td>';
                html += '<td class="pr-mono" style="text-align:center;">' + nowVal + '</td>';
                html += '<td style="text-align:center;">' + renderDelta(pr1Val, nowVal) + '</td>';
            } else {
                // Field not applicable for this category
                html += '<td style="text-align:center; color:#d0d0d0;">\u2014</td>';
                html += '<td style="text-align:center; color:#d0d0d0;">\u2014</td>';
                html += '<td style="text-align:center; color:#d0d0d0;">\u2014</td>';
            }
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    html += '</div>';

    // Snapshot metadata
    if (snapshot?.capturedAt) {
        html += '<div style="margin-top:12px; font-size:0.75rem; color:#62707c;">';
        html += 'Snapshot captured: ' + escapeHtml(snapshot.capturedAt);
        html += '</div>';
    }

    // Discrepancy notes textarea
    html += '<div style="margin-top:20px;">';
    html += '<div class="pr-panel-title">Discrepancy Notes</div>';
    html += '<textarea id="pr-dashboard-discrepancy" class="pr-textarea" placeholder="Note any discrepancies between SPS data and your records...">';
    html += escapeHtml(pr2.dashboardDiscrepancyNotes ?? '');
    html += '</textarea>';
    html += '</div>';

    html += '</div>'; // .pr-panel
    html += '</div>'; // .pr-section

    return html;
}

// --- Section 3: Administrative Statistics ---
function renderPRAdminStats(pr2, snapshot) {
    const overrides = pr2.adminStatsOverrides ?? {};
    const smartApts = getSmartAppointmentCount();

    let html = '<div class="pr-section" id="pr-section-3">';
    html += '<div class="pr-section-number">03</div>';
    html += '<div class="pr-section-title">Administrative Statistics</div>';
    html += '<div class="pr-panel">';

    html += '<table class="pr-table">';
    html += '<thead><tr>';
    html += '<th>Metric</th>';
    html += '<th class="pr-mono" style="text-align:center;">PR1</th>';
    html += '<th class="pr-mono" style="text-align:center;">Current</th>';
    html += '<th style="text-align:center;">\u0394</th>';
    html += '</tr></thead>';

    html += '<tbody>';
    ADMIN_STATS_CONFIG.forEach(function(cfg) {
        const pr1Val = PR1_BASELINE.adminStats[cfg.key] ?? 0;

        // Current value: override > snapshot > smart count (for attended)
        let currentVal;
        if (overrides[cfg.key] != null) {
            currentVal = parseInt(overrides[cfg.key]) || 0;
        } else if (cfg.key === 'attended') {
            // Prefer SPS snapshot ground truth; fall back to smart count only if no snapshot
            var snapshotAttended = parseInt(getSnapshotValue(snapshot, 'appointments.attended'));
            currentVal = !isNaN(snapshotAttended) ? snapshotAttended : (smartApts?.total ?? 0);
        } else {
            currentVal = parseInt(getSnapshotValue(snapshot, cfg.snapshotPath)) || 0;
        }

        html += '<tr>';
        html += '<td style="font-weight:500;">' + escapeHtml(cfg.label) + '</td>';
        html += '<td class="pr-mono" style="text-align:center;">' + pr1Val + '</td>';
        html += '<td class="pr-mono" style="text-align:center; cursor:pointer; position:relative;" ';
        html += 'data-admin-key="' + escapeHtml(cfg.key) + '" ';
        html += 'data-current-val="' + currentVal + '" ';
        html += 'onclick="prEditAdminStat(this)" ';
        html += 'title="Click to override">';
        html += currentVal;
        if (overrides[cfg.key] != null) {
            html += ' <span style="font-size:0.65rem; color:#1a7f79;" title="Manual override">*</span>';
        }
        html += '</td>';
        html += '<td style="text-align:center;">' + renderDelta(pr1Val, currentVal) + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table>';

    html += '<div style="margin-top:8px; font-size:0.7rem; color:#62707c;">';
    html += 'Click any Current value to override. * = manual override.';
    html += '</div>';

    html += '</div>'; // .pr-panel
    html += '</div>'; // .pr-section

    return html;
}


// ============================================
// SECTION 4: COMPLETED PROCEDURES (Paste-in)
// ============================================

function parseProcedureTable(text) {
    if (!text || !text.trim()) return '';
    var lines = text.trim().split('\n');
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        // Skip separator lines (all dashes/pipes/spaces)
        if (/^[\s|\-:]+$/.test(line)) continue;
        var cells;
        if (line.indexOf('|') >= 0) {
            // Pipe-delimited: split on | and trim each cell, strip leading/trailing empty cells
            cells = line.split('|').map(function(c) { return c.trim(); });
            // Remove empty first/last from leading/trailing pipes
            if (cells.length > 0 && cells[0] === '') cells.shift();
            if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        } else {
            // Tab-delimited
            cells = line.split('\t').map(function(c) { return c.trim(); });
        }
        if (cells.length > 0) rows.push(cells);
    }
    if (rows.length === 0) return '';

    var html = '<table class="pr-table">';
    // First row as header
    html += '<thead><tr>';
    for (var h = 0; h < rows[0].length; h++) {
        html += '<th>' + escapeHtml(rows[0][h]) + '</th>';
    }
    html += '</tr></thead>';
    html += '<tbody>';
    for (var r = 1; r < rows.length; r++) {
        html += '<tr>';
        for (var c = 0; c < rows[r].length; c++) {
            html += '<td>' + escapeHtml(rows[r][c]) + '</td>';
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
}

function renderPRCompletedProcedures(pr2) {
    var savedText = pr2.completedProceduresHtml ?? '';

    var html = '<div class="pr-section" id="pr-section-4">';
    html += '<div class="pr-section-number">04</div>';
    html += '<div class="pr-section-title">Completed Procedures</div>';
    html += '<div class="pr-section-subtitle" style="font-size:0.8rem; color:#62707c; margin-top:-8px; margin-bottom:16px;">SPS Dashboard \u2192 All Completed Procedures</div>';
    html += '<div class="pr-panel">';

    // Textarea for pasting
    html += '<div class="pr-panel-title">Paste Procedure Table</div>';
    html += '<textarea id="pr-completed-procedures-textarea" class="pr-textarea" rows="8" placeholder="Paste pipe-delimited or tab-delimited procedure table from Claude...\n\nExample:\nNo. | Patient Name | Chart# | Date | Code | Description | Tooth#\n1 | Doe, Jane | 12345 | 01/15/2026 | D2391 | Composite | 19">';
    html += escapeHtml(savedText);
    html += '</textarea>';

    // Preview area
    html += '<div id="pr-completed-procedures-preview" style="margin-top:16px;">';
    if (savedText) {
        html += '<div class="pr-panel-title">Preview</div>';
        html += '<div style="overflow-x:auto;">';
        html += parseProcedureTable(savedText);
        html += '</div>';
    } else {
        html += '<p style="color:#62707c; font-size:0.85rem;">Paste a procedure table above to see a preview.</p>';
    }
    html += '</div>';

    html += '</div>'; // .pr-panel
    html += '</div>'; // .pr-section
    return html;
}


// ============================================
// SECTION 5: IN-PROGRESS PROCEDURES (Editable)
// ============================================

var IN_PROGRESS_COLUMNS = [
    { key: 'patientName', label: 'Patient Name', width: '150px' },
    { key: 'chartNo', label: 'Chart#', width: '100px' },
    { key: 'code', label: 'Code', width: '80px' },
    { key: 'description', label: 'Description', width: '180px' },
    { key: 'toothNo', label: 'Tooth#', width: '80px' },
    { key: 'dateStarted', label: 'Date Started', width: '110px' },
    { key: 'lastVisit', label: 'Last Visit', width: '110px' }
];

var PR1_IN_PROGRESS_DEFAULTS = [
    { patientName: 'Jose Rosario', chartNo: '2467990', code: 'D5811', description: 'Interim complete lower denture', toothNo: 'MANDI', dateStarted: '09/19/2025', lastVisit: '11/08/2025' },
    { patientName: 'Jose Rosario', chartNo: '2467990', code: 'D5810', description: 'Interim complete upper denture', toothNo: 'MAXI', dateStarted: '09/19/2025', lastVisit: '11/08/2025' }
];

function ensureInProgressDefaults(pr2) {
    if (!pr2.inProgressProcedures || typeof pr2.inProgressProcedures !== 'object' || Object.keys(pr2.inProgressProcedures).length === 0) {
        var defaults = {};
        for (var i = 0; i < PR1_IN_PROGRESS_DEFAULTS.length; i++) {
            var id = generateId('iproc');
            var item = {};
            for (var k in PR1_IN_PROGRESS_DEFAULTS[i]) {
                if (PR1_IN_PROGRESS_DEFAULTS[i].hasOwnProperty(k)) {
                    item[k] = PR1_IN_PROGRESS_DEFAULTS[i][k];
                }
            }
            defaults[id] = item;
        }
        pr2.inProgressProcedures = defaults;
        return true; // defaults were populated — caller should save
    }
    return false;
}

function getInProgressProcedures(pr2) {
    // Read-only accessor — no mutation in render path
    return pr2.inProgressProcedures || {};
}

function renderPRInProgressProcedures(pr2) {
    var procs = getInProgressProcedures(pr2);
    var keys = Object.keys(procs);

    var html = '<div class="pr-section" id="pr-section-5">';
    html += '<div class="pr-section-number">05</div>';
    html += '<div class="pr-section-title">In-Progress Procedures</div>';
    html += '<div class="pr-section-subtitle" style="font-size:0.8rem; color:#62707c; margin-top:-8px; margin-bottom:16px;">SPS Dashboard \u2192 All In-Progress Procedures</div>';
    html += '<div class="pr-panel">';

    html += '<div style="overflow-x:auto;">';
    html += '<table class="pr-table" id="pr-inprogress-table">';
    html += '<thead><tr>';
    for (var c = 0; c < IN_PROGRESS_COLUMNS.length; c++) {
        html += '<th>' + escapeHtml(IN_PROGRESS_COLUMNS[c].label) + '</th>';
    }
    html += '<th style="width:60px;"></th>'; // delete column
    html += '</tr></thead>';

    html += '<tbody>';
    for (var i = 0; i < keys.length; i++) {
        var rowId = keys[i];
        var row = procs[rowId];
        var safeRowId = rowId.replace(/'/g, "\\'");
        html += '<tr data-row-id="' + escapeHtml(rowId) + '">';
        for (var j = 0; j < IN_PROGRESS_COLUMNS.length; j++) {
            var col = IN_PROGRESS_COLUMNS[j];
            var val = row[col.key] ?? '';
            html += '<td>';
            html += '<input type="text" class="pr-input pr-inprogress-input" ';
            html += 'data-row-id="' + escapeHtml(rowId) + '" ';
            html += 'data-field="' + escapeHtml(col.key) + '" ';
            html += 'value="' + escapeHtml(val) + '" ';
            html += 'style="width:' + col.width + '; font-size:0.82rem;" ';
            html += 'placeholder="' + escapeHtml(col.label) + '">';
            html += '</td>';
        }
        html += '<td style="text-align:center;">';
        html += '<button class="pr-btn-delete" data-delete-row="' + escapeHtml(rowId) + '" title="Delete row" ';
        html += 'style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1rem; padding:4px 8px;">';
        html += '\u00d7';
        html += '</button>';
        html += '</td>';
        html += '</tr>';
    }
    html += '</tbody></table>';
    html += '</div>';

    // Add row button
    html += '<div style="margin-top:12px;">';
    html += '<button id="pr-add-inprogress-row" style="background:#1a7f79; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:0.82rem;">';
    html += '+ Add Row';
    html += '</button>';
    html += '</div>';

    html += '</div>'; // .pr-panel
    html += '</div>'; // .pr-section
    return html;
}

function prAddInProgressRow() {
    var pr2 = getPR2Data();
    if (!pr2.inProgressProcedures) pr2.inProgressProcedures = {};
    var procs = pr2.inProgressProcedures;
    var newId = generateId('iproc');
    procs[newId] = {
        patientName: '',
        chartNo: '',
        code: '',
        description: '',
        toothNo: '',
        dateStarted: '',
        lastVisit: ''
    };
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Re-render just section 5
    var sectionEl = document.getElementById('pr-section-5');
    if (sectionEl) {
        var tmp = document.createElement('div');
        tmp.innerHTML = renderPRInProgressProcedures(pr2);
        sectionEl.replaceWith(tmp.firstChild);
        attachPRInProgressListeners();
    }
}

function prDeleteInProgressRow(rowId) {
    var pr2 = getPR2Data();
    if (!pr2.inProgressProcedures) pr2.inProgressProcedures = {};
    var procs = pr2.inProgressProcedures;
    if (procs[rowId]) {
        delete procs[rowId];
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
    }

    // Re-render just section 5
    var sectionEl = document.getElementById('pr-section-5');
    if (sectionEl) {
        var tmp = document.createElement('div');
        tmp.innerHTML = renderPRInProgressProcedures(pr2);
        sectionEl.replaceWith(tmp.firstChild);
        attachPRInProgressListeners();
    }
}

function prSaveInProgressRow(rowId) {
    var pr2 = getPR2Data();
    if (!pr2.inProgressProcedures) pr2.inProgressProcedures = {};
    var procs = pr2.inProgressProcedures;
    if (!procs[rowId]) return;

    // Read values from DOM inputs for this row
    var inputs = document.querySelectorAll('input[data-row-id="' + rowId + '"]');
    for (var i = 0; i < inputs.length; i++) {
        var field = inputs[i].getAttribute('data-field');
        if (field) {
            procs[rowId][field] = inputs[i].value;
        }
    }

    pr2.lastEdited = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}


// ============================================
// SECTION 6: DEPARTMENT REQUIREMENTS AUDIT
// ============================================

var PR_DEPT_CONFIG = [
    { key: 'fixed', label: 'Fixed Prosthodontics', color: '#3b82f6' },
    { key: 'operative', label: 'Operative', color: '#10b981' },
    { key: 'dentures', label: 'Complete Dentures', color: '#8b5cf6' },
    { key: 'rpd', label: 'RPDs', color: '#f59e0b' },
    { key: 'srp', label: 'SRPs', color: '#ef4444' },
    { key: 'endo', label: 'Endodontics', color: '#06b6d4' }
];

function renderPRDepartmentAudit(pr2, competencies) {
    var html = '<div class="pr-section" id="pr-section-6">';
    html += '<div class="pr-section-number">06</div>';
    html += '<div class="pr-section-title">Department Requirements Audit</div>';

    for (var d = 0; d < PR_DEPT_CONFIG.length; d++) {
        var cfg = PR_DEPT_CONFIG[d];
        var cat = competencies[cfg.key];
        if (!cat) continue;

        var catName = cat.name ?? cfg.label;
        var catIcon = cat.icon ?? '';
        var pr1Dept = PR1_BASELINE.departments[cfg.key] ?? {};

        // Count items from sections
        var sectionsList = getValues(cat.sections);
        var totalCompleted = 0;
        var totalInProgress = 0;
        var totalPlanned = 0;

        for (var s = 0; s < sectionsList.length; s++) {
            var itemsList = getValues(sectionsList[s].items);
            for (var i = 0; i < itemsList.length; i++) {
                var item = itemsList[i];
                var comp = item.completed ?? 0;
                var req = item.required ?? 0;
                if (comp >= req && req > 0) {
                    totalCompleted++;
                } else if (comp > 0) {
                    totalInProgress++;
                } else if ((item.status ?? '') === 'planned') {
                    totalPlanned++;
                }
            }
        }

        var pr1C = pr1Dept.completed ?? 0;
        var pr1IP = pr1Dept.inProgress ?? 0;
        var pr1P = pr1Dept.planned ?? 0;

        html += '<div class="pr-panel" style="border-left:4px solid ' + cfg.color + '; margin-bottom:20px;">';

        // Department header
        html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">';
        html += '<span style="font-size:1.2rem;">' + catIcon + '</span>';
        html += '<span style="font-weight:700; font-size:1rem; color:#17212b;">' + escapeHtml(catName) + '</span>';
        html += '</div>';

        // Summary row
        html += '<div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:16px; font-size:0.82rem; color:#62707c;">';
        html += '<span>Completed: <strong style="color:#17212b;">' + totalCompleted + '</strong> <span style="font-size:0.75rem;">(PR1: ' + pr1C + ', ' + renderDelta(pr1C, totalCompleted) + ')</span></span>';
        html += '<span>In-Progress: <strong style="color:#17212b;">' + totalInProgress + '</strong> <span style="font-size:0.75rem;">(PR1: ' + pr1IP + ', ' + renderDelta(pr1IP, totalInProgress) + ')</span></span>';
        html += '<span>Planned: <strong style="color:#17212b;">' + totalPlanned + '</strong> <span style="font-size:0.75rem;">(PR1: ' + pr1P + ', ' + renderDelta(pr1P, totalPlanned) + ')</span></span>';
        html += '</div>';

        // Requirements checklist grouped by section
        for (var s2 = 0; s2 < sectionsList.length; s2++) {
            var sec = sectionsList[s2];
            html += '<div style="margin-bottom:12px;">';
            html += '<div style="font-weight:600; font-size:0.82rem; color:#62707c; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">' + escapeHtml(sec.title ?? '') + '</div>';
            var items2 = getValues(sec.items);
            for (var j = 0; j < items2.length; j++) {
                var it = items2[j];
                var itComp = it.completed ?? 0;
                var itReq = it.required ?? 0;
                var isDone = itComp >= itReq && itReq > 0;
                html += '<div class="pr-req-item" style="display:flex; align-items:center; gap:8px; padding:4px 0; font-size:0.85rem;">';
                html += '<span class="pr-req-check" style="flex-shrink:0; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; font-size:0.75rem;';
                if (isDone) {
                    html += ' background:#10b981; color:#fff;">&#10003;';
                } else {
                    html += ' border:1.5px solid #d0d0d0; color:transparent;">&#10003;';
                }
                html += '</span>';
                html += '<span style="flex:1; color:#17212b;">' + escapeHtml(it.text ?? '') + '</span>';
                html += '<span class="pr-req-count pr-mono" style="flex-shrink:0; font-size:0.82rem; color:' + (isDone ? '#10b981' : '#62707c') + ';">' + itComp + '/' + itReq + '</span>';
                html += '</div>';
            }
            html += '</div>';
        }

        // Notes textarea
        var noteVal = (pr2.departmentNotes ?? {})[cfg.key] ?? '';
        html += '<div style="margin-top:12px;">';
        html += '<div class="pr-panel-title">Notes</div>';
        html += '<textarea class="pr-textarea pr-dept-notes" data-dept-key="' + escapeHtml(cfg.key) + '" rows="2" placeholder="Notes for ' + escapeHtml(catName) + '...">';
        html += escapeHtml(noteVal);
        html += '</textarea>';
        html += '</div>';

        html += '</div>'; // .pr-panel
    }

    html += '</div>'; // .pr-section
    return html;
}


// ============================================
// SECTION 7: SUMMARY "NEEDED" TABLE
// ============================================

function renderPRNeededTable(competencies) {
    var html = '<div class="pr-section" id="pr-section-7">';
    html += '<div class="pr-section-number">07</div>';
    html += '<div class="pr-section-title">Summary: Needed Procedures</div>';
    html += '<div class="pr-panel">';

    html += '<div style="overflow-x:auto;">';
    html += '<table class="pr-table">';
    html += '<thead><tr>';
    html += '<th>Category</th>';
    html += '<th class="pr-mono" style="text-align:center;">Required</th>';
    html += '<th class="pr-mono" style="text-align:center;">Completed</th>';
    html += '<th class="pr-mono" style="text-align:center;">Remaining</th>';
    html += '<th style="text-align:center;">Status</th>';
    html += '</tr></thead>';

    html += '<tbody>';
    var grandRequired = 0;
    var grandCompleted = 0;

    for (var d = 0; d < PR_DEPT_CONFIG.length; d++) {
        var cfg = PR_DEPT_CONFIG[d];
        var cat = competencies[cfg.key];
        if (!cat) continue;

        var sectionsList = getValues(cat.sections);
        var totalRequired = 0;
        var totalCompleted = 0;

        for (var s = 0; s < sectionsList.length; s++) {
            var itemsList = getValues(sectionsList[s].items);
            for (var i = 0; i < itemsList.length; i++) {
                totalRequired += itemsList[i].required ?? 0;
                totalCompleted += itemsList[i].completed ?? 0;
            }
        }

        var remaining = Math.max(0, totalRequired - totalCompleted);
        grandRequired += totalRequired;
        grandCompleted += totalCompleted;

        // Status badge
        var badgeClass, badgeText;
        if (totalCompleted >= totalRequired && totalRequired > 0) {
            badgeClass = 'pr-badge-ontrack';
            badgeText = 'On Track';
        } else if (totalCompleted > 0) {
            badgeClass = 'pr-badge-behind';
            badgeText = 'Behind';
        } else {
            badgeClass = 'pr-badge-notstarted';
            badgeText = 'Not Started';
        }

        html += '<tr>';
        html += '<td style="font-weight:600;">';
        html += '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + cfg.color + '; margin-right:8px;"></span>';
        html += escapeHtml(cfg.label);
        html += '</td>';
        html += '<td class="pr-mono" style="text-align:center;">' + totalRequired + '</td>';
        html += '<td class="pr-mono" style="text-align:center;">' + totalCompleted + '</td>';
        html += '<td class="pr-mono" style="text-align:center; font-weight:600; color:' + (remaining > 0 ? '#e74c3c' : '#10b981') + ';">' + remaining + '</td>';
        html += '<td style="text-align:center;"><span class="' + badgeClass + '">' + badgeText + '</span></td>';
        html += '</tr>';
    }

    // Grand total row
    var grandRemaining = Math.max(0, grandRequired - grandCompleted);
    html += '<tr style="border-top:2px solid #17212b; font-weight:700;">';
    html += '<td>Total</td>';
    html += '<td class="pr-mono" style="text-align:center;">' + grandRequired + '</td>';
    html += '<td class="pr-mono" style="text-align:center;">' + grandCompleted + '</td>';
    html += '<td class="pr-mono" style="text-align:center; color:' + (grandRemaining > 0 ? '#e74c3c' : '#10b981') + ';">' + grandRemaining + '</td>';
    html += '<td></td>';
    html += '</tr>';

    html += '</tbody></table>';
    html += '</div>';

    html += '</div>'; // .pr-panel
    html += '</div>'; // .pr-section
    return html;
}


// ============================================
// SECTION 8: OTHER REQUIREMENTS CHECKLIST
// ============================================

var PR_OTHER_CONFIG = [
    { key: 'oralsurg', label: 'Oral Surgery', color: '#ec4899' },
    { key: 'peds', label: 'Pediatric Dentistry', color: '#84cc16' },
    { key: 'perio', label: 'Periodontology', color: '#f472b6' },
    { key: 'grouppractice', label: 'Group Practice (GD 640 & GD 642)', color: '#0ea5e9' },
    { key: 'txplanning', label: 'Treatment Planning (RS 545)', color: '#6366f1' },
    { key: 'geriatrics', label: 'Geriatric Dental Medicine', color: '#8b5cf6' },
    { key: 'externship', label: 'Externship & SPS', color: '#059669' }
];

function renderPROtherRequirements(pr2, competencies) {
    var html = '<div class="pr-section" id="pr-section-8">';
    html += '<div class="pr-section-number">08</div>';
    html += '<div class="pr-section-title">Other Requirements Checklist</div>';

    for (var d = 0; d < PR_OTHER_CONFIG.length; d++) {
        var cfg = PR_OTHER_CONFIG[d];
        var cat = competencies[cfg.key];
        if (!cat) continue;

        var catName = cat.name ?? cfg.label;
        var catIcon = cat.icon ?? '';

        html += '<div class="pr-panel" style="border-left:4px solid ' + cfg.color + '; margin-bottom:20px;">';

        // Section header
        html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">';
        html += '<span style="font-size:1.2rem;">' + catIcon + '</span>';
        html += '<span style="font-weight:700; font-size:1rem; color:#17212b;">' + escapeHtml(catName) + '</span>';
        html += '</div>';

        // Items grouped by section title
        var sectionsList = getValues(cat.sections);
        for (var s = 0; s < sectionsList.length; s++) {
            var sec = sectionsList[s];
            if (sec.title) {
                html += '<div style="font-weight:600; font-size:0.82rem; color:#62707c; margin-bottom:6px; margin-top:10px; text-transform:uppercase; letter-spacing:0.04em;">' + escapeHtml(sec.title) + '</div>';
            }
            var itemsList = getValues(sec.items);
            for (var i = 0; i < itemsList.length; i++) {
                var it = itemsList[i];
                var comp = it.completed ?? 0;
                var req = it.required ?? 0;
                var isDone = comp >= req && req > 0;
                var isPartial = comp > 0 && comp < req;

                var highlightClass = '';
                if (isDone) {
                    highlightClass = ' pr-highlight-green';
                } else if (isPartial) {
                    highlightClass = ' pr-highlight-yellow';
                }

                html += '<div class="pr-req-item' + highlightClass + '" style="display:flex; align-items:center; gap:8px; padding:5px 8px; font-size:0.85rem; border-radius:4px; margin-bottom:2px;">';
                html += '<span class="pr-req-check" style="flex-shrink:0; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; font-size:0.75rem;';
                if (isDone) {
                    html += ' background:#10b981; color:#fff;">&#10003;';
                } else {
                    html += ' border:1.5px solid #d0d0d0; color:transparent;">&#10003;';
                }
                html += '</span>';
                html += '<span style="flex:1; color:#17212b;">' + escapeHtml(it.text ?? '') + '</span>';
                html += '<span class="pr-req-count pr-mono" style="flex-shrink:0; font-size:0.82rem; color:' + (isDone ? '#10b981' : '#62707c') + ';">' + comp + '/' + req + '</span>';
                html += '</div>';
            }
        }

        // Notes textarea
        var noteVal = (pr2.departmentNotes ?? {})[cfg.key] ?? '';
        html += '<div style="margin-top:12px;">';
        html += '<div class="pr-panel-title">Notes</div>';
        html += '<textarea class="pr-textarea pr-dept-notes" data-dept-key="' + escapeHtml(cfg.key) + '" rows="2" placeholder="Notes for ' + escapeHtml(catName) + '...">';
        html += escapeHtml(noteVal);
        html += '</textarea>';
        html += '</div>';

        html += '</div>'; // .pr-panel
    }

    html += '</div>'; // .pr-section
    return html;
}


// ============================================
// SECTION 9: SUBJECTIVE REPORT
// ============================================

function renderPRSubjectiveReport(pr2) {
    var html = '<div class="pr-section" id="pr-section-9">';
    html += '<div class="pr-section-number">09</div>';
    html += '<div class="pr-section-title">Subjective Report</div>';

    // --- Part 1: PR1 Reference Panel (collapsible) ---
    html += '<div class="pr-panel" style="margin-bottom:16px;">';
    html += '<button id="pr-toggle-pr1-ref" class="pr-btn" style="font-size:0.82rem; margin-bottom:8px;">Show PR Part 1 Reference</button>';
    html += '<div id="pr-pr1-reference" class="pr-reference pr-reference-collapsed">';
    var pr1Text = PR1_BASELINE.subjectiveReport ?? '';
    var escapedText = escapeHtml(pr1Text);
    // Split on double newlines for paragraphs, then replace remaining newlines with <br>
    var paragraphs = escapedText.split('\n\n');
    for (var p = 0; p < paragraphs.length; p++) {
        html += '<p style="margin:0 0 12px 0; line-height:1.6;">' + paragraphs[p].replace(/\n/g, '<br>') + '</p>';
    }
    html += '</div>'; // .pr-reference
    html += '</div>'; // .pr-panel

    // --- Part 2: Auto-Generated Talking Points ---
    html += '<div class="pr-panel pr-talking-points" style="margin-bottom:16px;">';
    html += '<div class="pr-panel-title" style="margin-bottom:10px;">Auto-Generated Talking Points</div>';
    html += '<ul style="margin:0; padding-left:20px;">';

    // 1. Appointments — prefer SPS snapshot; fall back to smart count
    var pr1Attended = PR1_BASELINE.adminStats.attended ?? 30;
    var currentAppts = 0;
    var latestSnap = getLatestSnapshot();
    var snapAttended = latestSnap ? parseInt(getSnapshotValue(latestSnap, 'appointments.attended')) : NaN;
    if (!isNaN(snapAttended)) {
        currentAppts = snapAttended;
    } else if (typeof getSmartAppointmentCount === 'function') {
        currentAppts = getSmartAppointmentCount()?.total ?? 0;
    }
    var apptDelta = currentAppts - pr1Attended;
    html += '<li>Appointments: ' + pr1Attended + ' &rarr; ' + currentAppts + ' (' + (apptDelta >= 0 ? '+' : '') + apptDelta + ')</li>';

    // 2. Total completed procedures
    var pr1Procs = PR1_BASELINE.completedProceduresCount ?? 41;
    var currentProcs = 0;
    if (typeof getSmartProcedureCount === 'function') {
        currentProcs = getSmartProcedureCount()?.total ?? 0;
    }
    var procDelta = currentProcs - pr1Procs;
    html += '<li>Total completed procedures: ' + pr1Procs + ' &rarr; ' + currentProcs + ' (' + (procDelta >= 0 ? '+' : '') + procDelta + ')</li>';

    // 3. Patient roster comparison
    var pr1Roster = PR1_BASELINE.patientRoster ?? [];
    var pr1ChartNums = {};
    for (var ri = 0; ri < pr1Roster.length; ri++) {
        pr1ChartNums[pr1Roster[ri].chartNumber] = true;
    }
    var pr1Count = pr1Roster.length;
    var currentRecords = (roadmapData.clinicalData && roadmapData.clinicalData.patientRecords) ? roadmapData.clinicalData.patientRecords : {};
    var currentPatients = getValues(currentRecords);
    var currentCount = currentPatients.length;
    var newPatients = 0;
    var currentChartNums = {};
    for (var ci = 0; ci < currentPatients.length; ci++) {
        var cn = currentPatients[ci].chartNumber;
        if (cn) currentChartNums[cn] = true;
        if (cn && !pr1ChartNums[cn]) {
            newPatients++;
        }
    }
    var removedPatients = 0;
    for (var rk in pr1ChartNums) {
        if (!currentChartNums[rk]) removedPatients++;
    }
    html += '<li>Patient roster: ' + pr1Count + ' &rarr; ' + currentCount + ' (' + newPatients + ' new, ' + removedPatients + ' removed)</li>';

    // 4 & 5. Department progress comparison
    var competencies = getCompetenciesData();
    var deptKeys = ['fixed', 'operative', 'dentures', 'rpd', 'srp', 'endo'];
    var deptLabels = { fixed: 'Fixed', operative: 'Operative', dentures: 'Dentures', rpd: 'RPD', srp: 'SRP', endo: 'Endo' };
    var withProgress = [];
    var noProgress = [];

    for (var di = 0; di < deptKeys.length; di++) {
        var dKey = deptKeys[di];
        var cat = competencies[dKey];
        var pr1Dept = (PR1_BASELINE.departments && PR1_BASELINE.departments[dKey]) ? PR1_BASELINE.departments[dKey] : {};
        var pr1Completed = pr1Dept.completed ?? 0;

        // Count current completed items in this category
        var currentCompleted = 0;
        if (cat && cat.sections) {
            var sectionsList = getValues(cat.sections);
            for (var si = 0; si < sectionsList.length; si++) {
                var itemsList = getValues(sectionsList[si].items);
                for (var ii = 0; ii < itemsList.length; ii++) {
                    var item = itemsList[ii];
                    var comp = item.completed ?? 0;
                    var req = item.required ?? 0;
                    if (comp >= req && req > 0) {
                        currentCompleted++;
                    }
                }
            }
        }

        if (currentCompleted > pr1Completed) {
            withProgress.push(deptLabels[dKey]);
        } else {
            noProgress.push(deptLabels[dKey]);
        }
    }

    html += '<li>Departments with progress since PR1: ' + (withProgress.length > 0 ? escapeHtml(withProgress.join(', ')) : '<em>none</em>') + '</li>';
    html += '<li>Departments with no progress: ' + (noProgress.length > 0 ? escapeHtml(noProgress.join(', ')) : '<em>none</em>') + '</li>';

    html += '</ul>';
    html += '</div>'; // .pr-talking-points

    // --- Part 3: Rich Text Editor ---
    html += '<div class="pr-panel">';
    html += '<div class="pr-panel-title" style="margin-bottom:10px;">Subjective Report</div>';

    // Toolbar
    html += '<div class="pr-toolbar">';
    html += '<button data-cmd="bold" title="Bold"><strong>B</strong></button>';
    html += '<button data-cmd="italic" title="Italic"><em>I</em></button>';
    html += '<button data-cmd="underline" title="Underline"><u>U</u></button>';
    html += '<button data-cmd="insertUnorderedList" title="Bullets">&#8226;</button>';
    html += '<button data-cmd="insertOrderedList" title="Numbered List">1.</button>';
    html += '</div>';

    // Content-editable editor
    // NOTE (XSS exception): subjectiveReport stores user-authored HTML from contentEditable.
    // This is a single-user PIN-auth app — the user authors and consumes their own HTML.
    // Do NOT escapeHtml on the stored content.
    var savedContent = (pr2.subjectiveReport && typeof pr2.subjectiveReport === 'string') ? pr2.subjectiveReport : '';
    html += '<div id="pr-subjective-editor" class="pr-editor" contenteditable="true" data-placeholder="Write your subjective report here...">';
    html += savedContent;
    html += '</div>';

    html += '</div>'; // .pr-panel

    html += '</div>'; // .pr-section
    return html;
}

function prTogglePR1Reference() {
    var panel = document.getElementById('pr-pr1-reference');
    var btn = document.getElementById('pr-toggle-pr1-ref');
    if (!panel || !btn) return;

    if (panel.classList.contains('pr-reference-collapsed')) {
        panel.classList.remove('pr-reference-collapsed');
        btn.textContent = 'Hide PR Part 1 Reference';
    } else {
        panel.classList.add('pr-reference-collapsed');
        btn.textContent = 'Show PR Part 1 Reference';
    }
}

function prExecCommand(cmd) {
    document.execCommand(cmd, false, null);
}


// ============================================
// SECTION 12: EXPORT PDF
// ============================================

function renderPRExportSection() {
    var html = '<div class="pr-section" id="pr-section-12">';
    html += '<div class="pr-section-number">12</div>';
    html += '<div class="pr-section-title">Export</div>';
    html += '<div class="pr-panel" style="text-align:center; padding:2rem;">';
    html += '<button id="pr-export-pdf-btn" class="pr-btn pr-btn-primary pr-btn-export" style="font-size:1rem; padding:0.75rem 2rem;">';
    html += 'Export PR Part 2 as PDF</button>';
    html += '<p style="color:#62707c; margin-top:0.75rem; font-size:0.85rem;">Generates a clean PDF of this Periodic Review for submission.</p>';
    html += '</div>';
    html += '</div>';
    return html;
}

function loadHtml2Pdf(callback) {
    if (typeof html2pdf !== 'undefined') { callback(); return; }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = callback;
    script.onerror = function() { showToast('Failed to load PDF library'); };
    document.head.appendChild(script);
}

function exportPRToPDF() {
    var btn = document.getElementById('pr-export-pdf-btn');
    var element = document.querySelector('.pr-tab');
    if (!element) { showToast('Nothing to export'); return; }

    // Loading state
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generating PDF...';
    }

    loadHtml2Pdf(function() {
        // Add export mode class — CSS hides toolbars, edit hints, buttons, sets white bg
        element.classList.add('pr-export-mode');

        var dateStr = getLocalDateString(new Date());
        var opt = {
            margin: [15, 15, 20, 15],
            filename: 'PR_Part_2_Suleman_Shaikh_' + dateStr + '.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).toPdf().get('pdf').then(function(pdf) {
            var totalPages = pdf.internal.getNumberOfPages();
            var pageWidth = pdf.internal.pageSize.getWidth();
            var pageHeight = pdf.internal.pageSize.getHeight();
            for (var i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(120, 120, 120);
                var footerText = 'Suleman Shaikh \u2014 DMD\u201927 \u2014 Periodic Review Part 2 \u2014 ' + dateStr;
                pdf.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });
                pdf.text('Page ' + i + ' of ' + totalPages, pageWidth - 15, pageHeight - 8, { align: 'right' });
            }
            pdf.save('PR_Part_2_Suleman_Shaikh_' + dateStr + '.pdf');
        }).then(function() {
            element.classList.remove('pr-export-mode');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Export PR Part 2 as PDF';
            }
            showToast('PDF exported successfully');
        }).catch(function(err) {
            element.classList.remove('pr-export-mode');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Export PR Part 2 as PDF';
            }
            showToast('PDF export failed: ' + (err.message ?? 'unknown error'));
            console.error('PDF export error:', err);
        });
    });
}


// ============================================
// SECTION 10: PATIENT ROSTER
// ============================================

function _getPR1ChartMap() {
    var roster = PR1_BASELINE.patientRoster ?? [];
    var map = {};
    for (var i = 0; i < roster.length; i++) {
        map[roster[i].chartNumber] = roster[i];
    }
    return map;
}

function renderPRPatientRoster(pr2, patients) {
    var pr1Map = _getPR1ChartMap();
    var removed = pr2.removedPatients ?? {};
    var patientNotes = pr2.patientNotes ?? {};

    // Filter out removed patients for the active roster
    var active = [];
    for (var i = 0; i < patients.length; i++) {
        var cn = patients[i].chartNumber ?? '';
        if (!removed[cn]) {
            active.push(patients[i]);
        }
    }
    // Sort alphabetically by name
    active.sort(function(a, b) {
        return (a.name ?? '').localeCompare(b.name ?? '');
    });

    var html = '<div class="pr-section" id="pr-section-10">';
    html += '<div class="pr-section-number">10</div>';
    html += '<div class="pr-section-title">Patient Roster</div>';
    html += '<div class="pr-panel">';

    // Active roster table
    html += '<div style="overflow-x:auto;">';
    html += '<table class="pr-table" id="pr-roster-table">';
    html += '<thead><tr>';
    html += '<th>#</th>';
    html += '<th>Chart #</th>';
    html += '<th>Patient Name</th>';
    html += '<th>Phone</th>';
    html += '<th style="text-align:center;">Reliability</th>';
    html += '<th>Next Appointment</th>';
    html += '<th>Status</th>';
    html += '<th></th>';
    html += '</tr></thead>';
    html += '<tbody>';

    for (var r = 0; r < active.length; r++) {
        var pt = active[r];
        var ptId = pt.id ?? '';
        var cn = pt.chartNumber ?? '';
        var isNew = cn && !pr1Map[cn];
        var rel = (pt.reliability ?? '').toLowerCase();
        var dotClass = rel === 'green' ? 'pr-dot-green' : (rel === 'yellow' ? 'pr-dot-yellow' : (rel === 'red' ? 'pr-dot-red' : ''));

        // Next appointment: prefer pr2 override, fall back to patient record
        var noteObj = patientNotes[ptId] ?? {};
        var nextAppt = noteObj.nextAppointment ?? pt.nextVisit ?? '';

        var status = pt.activeStatus ?? 'Active';

        html += '<tr data-patient-id="' + escapeHtml(ptId) + '">';
        html += '<td>' + (r + 1) + '</td>';
        html += '<td class="pr-mono">' + escapeHtml(cn) + '</td>';
        html += '<td>';
        html += escapeHtml(pt.name ?? '');
        if (isNew) {
            html += ' <span class="pr-badge pr-badge-new">NEW</span>';
        }
        html += '</td>';
        var phones = (pt.phone ?? '').split('|').filter(Boolean);
        var phoneDisplay = phones.length > 0 ? escapeHtml(phones[0].trim()) + (phones.length > 1 ? ' +' + (phones.length - 1) + ' more' : '') : '';
        html += '<td style="font-size:0.85rem; color:#475569;">' + phoneDisplay + '</td>';
        html += '<td style="text-align:center;">';
        if (dotClass) {
            html += '<span class="pr-dot ' + dotClass + '"></span>';
        } else {
            html += '<span style="color:#62707c; font-size:0.8rem;">' + escapeHtml(rel || '\u2014') + '</span>';
        }
        html += '</td>';
        html += '<td>';
        html += '<span class="pr-editable pr-roster-next-appt" data-patient-id="' + escapeHtml(ptId) + '" data-field="nextAppointment">';
        html += escapeHtml(nextAppt || 'Click to set');
        html += '</span>';
        html += '</td>';
        html += '<td>' + escapeHtml(status) + '</td>';
        html += '<td>';
        html += '<button class="pr-btn pr-btn-sm pr-btn-add-remove" data-chart="' + escapeHtml(cn) + '" data-name="' + escapeHtml(pt.name ?? '') + '" title="Add to remove list" style="font-size:0.75rem;">Remove</button>';
        html += '</td>';
        html += '</tr>';
    }

    html += '</tbody></table>';
    html += '</div>';

    // Summary
    html += '<div style="margin-top:12px; font-size:0.82rem; color:#62707c;">';
    html += 'Active patients: <strong>' + active.length + '</strong>';
    var newCount = 0;
    for (var nc = 0; nc < active.length; nc++) {
        if (active[nc].chartNumber && !pr1Map[active[nc].chartNumber]) newCount++;
    }
    if (newCount > 0) {
        html += ' &nbsp;|&nbsp; New since PR1: <strong>' + newCount + '</strong>';
    }
    html += '</div>';

    // --- Removed patients section ---
    var removedKeys = Object.keys(removed);
    html += '<div style="margin-top:24px; border-top:1px solid rgba(23,33,43,0.1); padding-top:16px;">';
    html += '<div class="pr-panel-title" style="margin-bottom:8px;">Patients to Remove</div>';

    if (removedKeys.length === 0) {
        html += '<p style="color:#62707c; font-size:0.85rem;">No patients marked for removal.</p>';
    } else {
        html += '<table class="pr-table" id="pr-removed-table">';
        html += '<thead><tr><th>Chart #</th><th>Name</th><th>Reason</th><th></th></tr></thead>';
        html += '<tbody>';
        for (var rk = 0; rk < removedKeys.length; rk++) {
            var rCn = removedKeys[rk];
            var reason = removed[rCn] ?? '';
            // Find patient name from full list
            var rName = '';
            for (var fn = 0; fn < patients.length; fn++) {
                if (patients[fn].chartNumber === rCn) {
                    rName = patients[fn].name ?? '';
                    break;
                }
            }
            // Also check PR1 baseline for the name
            if (!rName && pr1Map[rCn]) {
                rName = pr1Map[rCn].name ?? '';
            }
            var safeRCn = rCn.replace(/'/g, "\\'");
            html += '<tr data-removed-chart="' + escapeHtml(rCn) + '">';
            html += '<td class="pr-mono">' + escapeHtml(rCn) + '</td>';
            html += '<td>' + escapeHtml(rName) + '</td>';
            html += '<td>';
            html += '<input type="text" class="pr-input pr-removed-reason" data-chart="' + escapeHtml(rCn) + '" value="' + escapeHtml(reason) + '" placeholder="Reason for removal" style="width:100%; font-size:0.85rem;">';
            html += '</td>';
            html += '<td>';
            html += '<button class="pr-btn pr-btn-sm pr-btn-restore" data-chart="' + escapeHtml(rCn) + '" title="Restore patient" style="font-size:0.75rem;">Restore</button>';
            html += '</td>';
            html += '</tr>';
        }
        html += '</tbody></table>';
    }

    html += '</div>'; // removed section

    html += '</div>'; // .pr-panel
    html += '</div>'; // .pr-section
    return html;
}


// ============================================
// SECTION 11: PATIENT WRITEUPS
// ============================================

var _prAllCardsExpanded = false;

function renderPRPatientWriteups(pr2, patients) {
    var pr1Map = _getPR1ChartMap();
    var removed = pr2.removedPatients ?? {};

    // Filter out removed patients
    var active = [];
    for (var i = 0; i < patients.length; i++) {
        var cn = patients[i].chartNumber ?? '';
        if (!removed[cn]) {
            active.push(patients[i]);
        }
    }
    // Sort alphabetically
    active.sort(function(a, b) {
        return (a.name ?? '').localeCompare(b.name ?? '');
    });

    var html = '<div class="pr-section" id="pr-section-11">';
    html += '<div class="pr-section-number">11</div>';
    html += '<div class="pr-section-title">Patient Writeups</div>';
    html += '<div class="pr-panel">';

    // Expand/Collapse All toggle
    html += '<div style="margin-bottom:12px; text-align:right;">';
    html += '<button id="pr-toggle-all-patients" class="pr-btn pr-btn-sm" style="font-size:0.8rem;">Expand All</button>';
    html += '</div>';

    // Patient cards
    for (var c = 0; c < active.length; c++) {
        var pt = active[c];
        var ptId = pt.id ?? '';
        var cn = pt.chartNumber ?? '';
        var rel = (pt.reliability ?? '').toLowerCase();
        var dotClass = rel === 'green' ? 'pr-dot-green' : (rel === 'yellow' ? 'pr-dot-yellow' : (rel === 'red' ? 'pr-dot-red' : ''));
        var pr1Patient = pr1Map[cn] ?? null;
        var relChanged = pr1Patient && pr1Patient.reliability !== rel;
        var isNew = cn && !pr1Map[cn];

        html += '<div class="pr-card" id="pr-patient-' + escapeHtml(ptId) + '" data-patient-id="' + escapeHtml(ptId) + '">';

        // Card header
        html += '<div class="pr-card-header" data-toggle-patient="' + escapeHtml(ptId) + '">';
        html += '<span class="pr-card-chevron">\u25B6</span>';
        if (dotClass) {
            html += '<span class="pr-dot ' + dotClass + '"></span>';
        }
        html += '<strong>' + escapeHtml(cn) + '</strong> \u2014 ' + escapeHtml(pt.name ?? '');
        if (isNew) {
            html += ' <span class="pr-badge pr-badge-new">NEW</span>';
        }
        html += '<span style="margin-left:auto; color:#62707c; font-size:0.85rem;">' + escapeHtml(pt.activeStatus ?? 'Active') + '</span>';
        html += '</div>';

        // Card body — field rows
        html += '<div class="pr-card-body">';

        // Clinical Brief panel — show curated summary when available
        if (pt.clinicalBrief && pt.clinicalBrief.snapshot) {
            var brief = pt.clinicalBrief;
            html += '<div style="background:#f0faf9; border:1px solid #d1e8e5; border-radius:8px; padding:12px 16px; margin-bottom:16px;">';
            html += '<div style="font-weight:700; font-size:0.82rem; color:#1a7f79; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.04em;">Clinical Brief';
            if (brief.dateGenerated) {
                html += ' <span style="font-weight:400; text-transform:none; letter-spacing:0; color:#62707c;">(' + escapeHtml(brief.dateGenerated) + ')</span>';
            }
            html += '</div>';
            var briefSections = [
                { key: 'snapshot', label: 'Snapshot' },
                { key: 'diagnosesAndRisks', label: 'Diagnoses & Risks' },
                { key: 'txStatus', label: 'Treatment Status' },
                { key: 'txSequencing', label: 'Treatment Sequencing' },
                { key: 'flaggedConcerns', label: 'Flagged Concerns' },
                { key: 'gradValue', label: 'Graduation Value' },
                { key: 'nextVisitPlan', label: 'Next Visit Plan' }
            ];
            for (var bs = 0; bs < briefSections.length; bs++) {
                var bsVal = brief[briefSections[bs].key] ?? '';
                if (!bsVal) continue;
                html += '<div style="margin-bottom:8px;">';
                html += '<div style="font-weight:600; font-size:0.78rem; color:#1a7f79; margin-bottom:2px;">' + escapeHtml(briefSections[bs].label) + '</div>';
                html += '<div style="font-size:0.85rem; color:#17212b; line-height:1.5; white-space:pre-wrap;">' + escapeHtml(bsVal) + '</div>';
                html += '</div>';
            }
            html += '</div>';
        }

        // Build field definitions
        var fields = [
            { label: 'Patient', key: 'type', value: pt.type ?? '' },
            { label: 'Phone', key: 'phone', value: (function() { var pp = (pt.phone ?? '').split('|').filter(Boolean); return pp.length > 0 ? pp[0].trim() + (pp.length > 1 ? ' +' + (pp.length - 1) + ' more' : '') : ''; })() },
            { label: 'PMH / RMH', key: 'medicalHx', value: pt.medicalHx ?? '' },
            { label: 'Medications', key: 'medications', value: pt.medications ?? '' },
            { label: 'Allergies', key: 'allergies', value: pt.allergies ?? '' },
            { label: 'Tx Completed (Overall)', key: 'dentalHx', value: pt.dentalHx ?? '' },
            { label: 'Treatment at BU', key: 'txSummaryBU', value: pt.txSummaryBU ?? '' },
            { label: 'Tx Completed by Me', key: 'txCompletedByMe', value: pt.txCompletedByMe ?? '' },
            { label: 'Radiographs', key: '_radiographs', value: _buildRadiographSummary(pt) },
            { label: 'Tx Pending', key: 'txPlan', value: pt.txPlan ?? '' },
            { label: 'Recall History', key: 'recallHistory', value: pt.recallHistory ?? '' },
            { label: 'Next Visit (NV)', key: 'nextVisit', value: pt.nextVisit ?? '' },
            { label: 'Status', key: 'activeStatus', value: pt.activeStatus ?? 'Active', isSelect: true },
            { label: 'Notes', key: 'notes', value: pt.notes ?? '' }
        ];

        for (var fi = 0; fi < fields.length; fi++) {
            var fld = fields[fi];

            html += '<div class="pr-field-row">';
            html += '<div class="pr-field-label">' + escapeHtml(fld.label) + '</div>';
            html += '<div class="pr-field-value">';

            if (fld.isSelect) {
                // Status dropdown
                var statusVal = fld.value;
                html += '<select class="pr-input pr-patient-status-select" data-patient-id="' + escapeHtml(ptId) + '" data-field="activeStatus" style="font-size:0.85rem; padding:4px 8px;">';
                html += '<option value="Active"' + (statusVal === 'Active' ? ' selected' : '') + '>Active</option>';
                html += '<option value="Inactive"' + (statusVal === 'Inactive' ? ' selected' : '') + '>Inactive</option>';
                html += '</select>';
            } else if (fld.key === '_radiographs') {
                // Radiographs are a computed summary — show as read-only text
                html += '<span style="color:#17212b; font-size:0.88rem;">' + escapeHtml(fld.value || 'No radiograph data') + '</span>';
            } else {
                // Editable field
                html += '<span class="pr-editable pr-patient-field" data-patient-id="' + escapeHtml(ptId) + '" data-field="' + escapeHtml(fld.key) + '">';
                html += escapeHtml(fld.value || 'Click to edit');
                html += '</span>';
            }

            html += '</div>'; // .pr-field-value
            html += '</div>'; // .pr-field-row
        }

        html += '</div>'; // .pr-card-body
        html += '</div>'; // .pr-card
    }

    if (active.length === 0) {
        html += '<p style="color:#62707c; font-size:0.85rem;">No patient records found.</p>';
    }

    html += '</div>'; // .pr-panel
    html += '</div>'; // .pr-section
    return html;
}

function _buildRadiographSummary(pt) {
    var parts = [];
    if (pt.lastFMX) parts.push('FMX: ' + pt.lastFMX);
    if (pt.lastBW) parts.push('BW: ' + pt.lastBW);
    if (pt.lastPANO) parts.push('PANO: ' + pt.lastPANO);
    if (pt.lastCBCT) parts.push('CBCT: ' + pt.lastCBCT);
    return parts.join(' | ');
}


// ============================================
// PATIENT ROSTER + WRITEUP INTERACTION FUNCTIONS
// ============================================

function prTogglePatientCard(patientId) {
    var card = document.getElementById('pr-patient-' + patientId);
    if (card) {
        card.classList.toggle('expanded');
    }
}

function prToggleAllPatientCards() {
    var cards = document.querySelectorAll('#pr-section-11 .pr-card');
    var btn = document.getElementById('pr-toggle-all-patients');
    _prAllCardsExpanded = !_prAllCardsExpanded;

    for (var i = 0; i < cards.length; i++) {
        if (_prAllCardsExpanded) {
            cards[i].classList.add('expanded');
        } else {
            cards[i].classList.remove('expanded');
        }
    }

    if (btn) {
        btn.textContent = _prAllCardsExpanded ? 'Collapse All' : 'Expand All';
    }
}

function prStartEditField(patientId, fieldName, element) {
    // Prevent double-edit
    if (element.querySelector('textarea') || element.querySelector('input')) return;

    var currentText = '';
    // Get current value from the patient record
    var records = roadmapData.clinicalData?.patientRecords ?? {};
    var pt = records[patientId];
    if (pt) {
        currentText = pt[fieldName] ?? '';
    }

    var isLongField = ['medicalHx', 'medications', 'dentalHx', 'txSummaryBU', 'txCompletedByMe', 'txPlan', 'notes', 'recallHistory'].indexOf(fieldName) >= 0;

    var committed = false;

    if (isLongField) {
        var textarea = document.createElement('textarea');
        textarea.className = 'pr-textarea';
        textarea.style.cssText = 'width:100%; min-height:60px; font-size:0.85rem; margin:0;';
        textarea.value = currentText;
        element.textContent = '';
        element.appendChild(textarea);
        textarea.focus();

        textarea.addEventListener('blur', function() {
            if (committed) return;
            committed = true;
            var val = textarea.value.trim();
            prSavePatientField(patientId, fieldName, val);
            element.textContent = val || 'Click to edit';
        });
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                committed = true;
                element.textContent = currentText || 'Click to edit';
            }
        });
    } else {
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'pr-input';
        input.style.cssText = 'width:100%; font-size:0.85rem;';
        input.value = currentText;
        element.textContent = '';
        element.appendChild(input);
        input.focus();

        input.addEventListener('blur', function() {
            if (committed) return;
            committed = true;
            var val = input.value.trim();
            prSavePatientField(patientId, fieldName, val);
            element.textContent = val || 'Click to edit';
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                committed = true;
                input.blur();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                committed = true;
                element.textContent = currentText || 'Click to edit';
            }
        });
    }
}

function prStartEditRosterNextAppt(element) {
    if (element.querySelector('input')) return;

    var patientId = element.getAttribute('data-patient-id');
    var pr2 = getPR2Data();
    var noteObj = pr2.patientNotes?.[patientId] ?? {};
    var pt = (roadmapData.clinicalData?.patientRecords ?? {})[patientId];
    var currentText = noteObj.nextAppointment ?? pt?.nextVisit ?? '';
    var committed = false;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'pr-input';
    input.style.cssText = 'width:100%; font-size:0.85rem;';
    input.value = currentText;
    element.textContent = '';
    element.appendChild(input);
    input.focus();

    input.addEventListener('blur', function() {
        if (committed) return;
        committed = true;
        var val = input.value.trim();
        if (!pr2.patientNotes) pr2.patientNotes = {};
        if (!pr2.patientNotes[patientId]) pr2.patientNotes[patientId] = {};
        pr2.patientNotes[patientId].nextAppointment = val;
        pr2.lastEdited = new Date().toISOString();
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        element.textContent = val || 'Click to set';
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            committed = true;
            input.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            committed = true;
            element.textContent = currentText || 'Click to set';
        }
    });
}

function prSavePatientField(patientId, fieldName, value) {
    if (!roadmapData.clinicalData) roadmapData.clinicalData = {};
    if (!roadmapData.clinicalData.patientRecords) roadmapData.clinicalData.patientRecords = {};
    if (!roadmapData.clinicalData.patientRecords[patientId]) {
        // Look up name/chart from merged records or legacy patients store
        var allRecords = (typeof getAllPatientRecords === 'function') ? getAllPatientRecords() : {};
        var sourcePt = allRecords[patientId] || roadmapData.clinicalData?.patients?.[patientId] || {};
        roadmapData.clinicalData.patientRecords[patientId] = (typeof createPatientRecord === 'function')
            ? createPatientRecord({ id: patientId, name: sourcePt.name ?? '', chartNumber: sourcePt.chartNumber ?? '' })
            : { id: patientId, name: sourcePt.name ?? '', chartNumber: sourcePt.chartNumber ?? '' };
    }
    roadmapData.clinicalData.patientRecords[patientId][fieldName] = value;
    roadmapData.clinicalData.patientRecords[patientId].lastUpdated = new Date().toISOString();
    clinicalDataDirty = true;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();

    // Propagate to downstream views (sidebar, mini review, countdown radar)
    if (['name', 'reliability', 'activeStatus', 'phone', 'lastVisit'].indexOf(fieldName) >= 0) {
        if (typeof propagateClinicalChanges === 'function') {
            propagateClinicalChanges({ patients: true });
        }
    }
}

function prAddToRemoveList(chartNumber, patientName) {
    var pr2 = getPR2Data();
    if (!pr2.removedPatients) pr2.removedPatients = {};
    pr2.removedPatients[chartNumber] = '';
    pr2.lastEdited = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    showToast('Patient ' + (patientName || chartNumber) + ' added to remove list');
    initPeriodicReview();
}

function prRestoreFromRemoveList(chartNumber) {
    var pr2 = getPR2Data();
    if (pr2.removedPatients) {
        delete pr2.removedPatients[chartNumber];
    }
    pr2.lastEdited = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    showToast('Patient restored');
    initPeriodicReview();
}


// ============================================
// MAIN ENTRY POINT
// ============================================

function initPeriodicReview() {
    const container = document.getElementById('tab-periodicreview');
    if (!container) return;

    const pr2 = getPR2Data();
    const snapshot = getLatestSnapshot();

    // Pre-populate in-progress defaults BEFORE render, with sync guards
    var needsSave = ensureInProgressDefaults(pr2);
    if (needsSave && hasLoadedFromCloud && !awaitingFirebaseLoad) {
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
    }

    // Build all sections as HTML string
    // NOTE: All user-entered text is escaped via escapeHtml() in each render function.
    // This pattern (build HTML string, set via innerHTML) is the standard approach
    // used by all other modules in this app (init.js, clinical.js, patients.js, etc).
    let html = '<div class="pr-tab">';

    // Section 1: Header
    html += renderPRHeader(pr2);

    // Section 2: SPS Dashboard Summary
    html += renderPRDashboardSummary(pr2, snapshot);

    // Section 3: Administrative Statistics
    html += renderPRAdminStats(pr2, snapshot);

    // Section 4: Completed Procedures (paste-in table)
    html += renderPRCompletedProcedures(pr2);

    // Section 5: In-Progress Procedures (editable table)
    html += renderPRInProgressProcedures(pr2);

    // Section 6: Department Requirements Audit
    const competencies = getCompetenciesData();
    html += renderPRDepartmentAudit(pr2, competencies);

    // Section 7: Summary "Needed" Table
    html += renderPRNeededTable(competencies);

    // Section 8: Other Requirements Checklist
    html += renderPROtherRequirements(pr2, competencies);

    // Section 9: Subjective Report
    html += renderPRSubjectiveReport(pr2);

    // Section 10: Patient Roster
    // Use getAllPatientRecords() which properly merges + deduplicates patientRecords + clinicalData.patients
    var prPatientsObj = (typeof getAllPatientRecords === 'function') ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
    var prPatients = getValues(prPatientsObj);
    html += renderPRPatientRoster(pr2, prPatients);

    // Section 11: Patient Writeups
    html += renderPRPatientWriteups(pr2, prPatients);

    // Section 12: Export PDF
    html += renderPRExportSection();

    html += '</div>'; // .pr-tab

    container.innerHTML = html; // All dynamic text escaped via escapeHtml()

    // Wire interactivity
    attachPREventListeners();
}


// ============================================
// EVENT LISTENERS
// ============================================

function attachPREventListeners() {
    // --- Review date click-to-edit ---
    const dateEl = document.getElementById('pr-review-date');
    if (dateEl) {
        dateEl.addEventListener('click', function() {
            const pr2 = getPR2Data();
            const current = pr2.reviewDate ?? '';
            const inp = document.createElement('input');
            inp.type = 'date';
            inp.className = 'pr-input';
            inp.value = current;
            inp.style.cssText = 'width:auto; display:inline-block; font-size:0.9rem; border-bottom:2px solid #1a7f79;';
            dateEl.replaceWith(inp);
            inp.focus();

            var dateCommitted = false;
            function commitDate() {
                if (dateCommitted) return;
                dateCommitted = true;
                const val = inp.value || null;
                savePR2Field('reviewDate', val);
                initPeriodicReview();
            }

            inp.addEventListener('change', commitDate);
            inp.addEventListener('blur', function() {
                setTimeout(commitDate, 100);
            });
        });
    }

    // --- Discrepancy notes auto-save ---
    const discrepancyEl = document.getElementById('pr-dashboard-discrepancy');
    if (discrepancyEl) {
        let discrepancyTimer = null;
        discrepancyEl.addEventListener('input', function() {
            clearTimeout(discrepancyTimer);
            discrepancyTimer = setTimeout(function() {
                savePR2Field('dashboardDiscrepancyNotes', discrepancyEl.value);
            }, 800);
        });
    }

    // --- Completed procedures textarea debounced save + preview ---
    var cpTextarea = document.getElementById('pr-completed-procedures-textarea');
    if (cpTextarea) {
        var cpTimer = null;
        cpTextarea.addEventListener('input', function() {
            clearTimeout(cpTimer);
            cpTimer = setTimeout(function() {
                var text = cpTextarea.value;
                savePR2Field('completedProceduresHtml', text);

                // Update preview
                var previewEl = document.getElementById('pr-completed-procedures-preview');
                if (previewEl) {
                    if (text && text.trim()) {
                        var previewHtml = '<div class="pr-panel-title">Preview</div>';
                        previewHtml += '<div style="overflow-x:auto;">';
                        previewHtml += parseProcedureTable(text);
                        previewHtml += '</div>';
                        previewEl.innerHTML = previewHtml;
                    } else {
                        previewEl.innerHTML = '<p style="color:#62707c; font-size:0.85rem;">Paste a procedure table above to see a preview.</p>';
                    }
                }
            }, 500);
        });
    }

    // --- Department notes auto-save (sections 6 + 8) ---
    var deptTextareas = document.querySelectorAll('.pr-dept-notes');
    for (var dt = 0; dt < deptTextareas.length; dt++) {
        (function(textarea) {
            var deptTimer = null;
            textarea.addEventListener('input', function() {
                clearTimeout(deptTimer);
                deptTimer = setTimeout(function() {
                    var deptKey = textarea.getAttribute('data-dept-key');
                    if (!deptKey) return;
                    var pr2 = getPR2Data();
                    if (!pr2.departmentNotes) pr2.departmentNotes = {};
                    pr2.departmentNotes[deptKey] = textarea.value;
                    pr2.lastEdited = new Date().toISOString();
                    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
                    saveData();
                }, 800);
            });
        })(deptTextareas[dt]);
    }

    // --- PR1 Reference toggle ---
    var pr1RefToggle = document.getElementById('pr-toggle-pr1-ref');
    if (pr1RefToggle) {
        pr1RefToggle.addEventListener('click', prTogglePR1Reference);
    }

    // --- Subjective report toolbar buttons ---
    var toolbarBtns = document.querySelectorAll('.pr-toolbar button[data-cmd]');
    for (var tb = 0; tb < toolbarBtns.length; tb++) {
        (function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var cmd = btn.getAttribute('data-cmd');
                if (cmd) prExecCommand(cmd);
                // Refocus the editor after toolbar click
                var editor = document.getElementById('pr-subjective-editor');
                if (editor) editor.focus();
            });
        })(toolbarBtns[tb]);
    }

    // --- Subjective report editor debounced save ---
    var prSubjectiveEditor = document.getElementById('pr-subjective-editor');
    if (prSubjectiveEditor) {
        var prSubjectiveTimer = null;
        prSubjectiveEditor.addEventListener('input', function() {
            clearTimeout(prSubjectiveTimer);
            prSubjectiveTimer = setTimeout(function() {
                savePR2Field('subjectiveReport', prSubjectiveEditor.innerHTML);
            }, 500);
        });
    }

    // --- Export PDF button ---
    var exportBtn = document.getElementById('pr-export-pdf-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportPRToPDF();
        });
    }

    // --- In-progress procedures: delegate events ---
    attachPRInProgressListeners();

    // --- Patient roster: delegated events ---
    attachPRPatientListeners();
}

function attachPRInProgressListeners() {
    // Add row button
    var addBtn = document.getElementById('pr-add-inprogress-row');
    if (addBtn) {
        addBtn.addEventListener('click', prAddInProgressRow);
    }

    // Delete buttons (event delegation on table)
    var table = document.getElementById('pr-inprogress-table');
    if (table) {
        table.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-delete-row]');
            if (btn) {
                var rowId = btn.getAttribute('data-delete-row');
                if (rowId) prDeleteInProgressRow(rowId);
            }
        });

        // Blur save on inputs
        table.addEventListener('focusout', function(e) {
            if (e.target && e.target.classList.contains('pr-inprogress-input')) {
                var rowId = e.target.getAttribute('data-row-id');
                if (rowId) prSaveInProgressRow(rowId);
            }
        });
    }
}

// --- Patient roster + writeup event wiring ---
function attachPRPatientListeners() {
    // Expand/Collapse All button
    var toggleAllBtn = document.getElementById('pr-toggle-all-patients');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', prToggleAllPatientCards);
    }

    // Delegated: patient card header toggle
    var section11 = document.getElementById('pr-section-11');
    if (section11) {
        section11.addEventListener('click', function(e) {
            var header = e.target.closest('[data-toggle-patient]');
            if (header) {
                var ptId = header.getAttribute('data-toggle-patient');
                if (ptId) prTogglePatientCard(ptId);
                return;
            }

            // Editable patient field click
            var editable = e.target.closest('.pr-patient-field');
            if (editable) {
                var patientId = editable.getAttribute('data-patient-id');
                var fieldName = editable.getAttribute('data-field');
                if (patientId && fieldName) {
                    prStartEditField(patientId, fieldName, editable);
                }
                return;
            }
        });

        // Status dropdown change (delegated)
        section11.addEventListener('change', function(e) {
            if (e.target && e.target.classList.contains('pr-patient-status-select')) {
                var patientId = e.target.getAttribute('data-patient-id');
                var fieldName = e.target.getAttribute('data-field');
                if (patientId && fieldName) {
                    prSavePatientField(patientId, fieldName, e.target.value);
                    // Update the card header status text
                    var card = document.getElementById('pr-patient-' + patientId);
                    if (card) {
                        var headerStatus = card.querySelector('.pr-card-header span:last-child');
                        if (headerStatus) headerStatus.textContent = e.target.value;
                    }
                }
            }
        });
    }

    // Delegated: roster table interactions
    var section10 = document.getElementById('pr-section-10');
    if (section10) {
        section10.addEventListener('click', function(e) {
            // Add to Remove button
            var addRemoveBtn = e.target.closest('.pr-btn-add-remove');
            if (addRemoveBtn) {
                var chart = addRemoveBtn.getAttribute('data-chart');
                var name = addRemoveBtn.getAttribute('data-name');
                if (chart) prAddToRemoveList(chart, name);
                return;
            }

            // Restore button
            var restoreBtn = e.target.closest('.pr-btn-restore');
            if (restoreBtn) {
                var chart = restoreBtn.getAttribute('data-chart');
                if (chart) prRestoreFromRemoveList(chart);
                return;
            }

            // Next appointment editable click
            var rosterEditable = e.target.closest('.pr-roster-next-appt');
            if (rosterEditable) {
                prStartEditRosterNextAppt(rosterEditable);
                return;
            }
        });

        // Removed patient reason field blur-save (delegated)
        section10.addEventListener('focusout', function(e) {
            if (e.target && e.target.classList.contains('pr-removed-reason')) {
                var chart = e.target.getAttribute('data-chart');
                if (chart) {
                    var pr2 = getPR2Data();
                    if (!pr2.removedPatients) pr2.removedPatients = {};
                    pr2.removedPatients[chart] = e.target.value.trim();
                    pr2.lastEdited = new Date().toISOString();
                    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
                    saveData();
                }
            }
        });
    }
}

// --- Admin stat inline edit ---
function prEditAdminStat(cell) {
    const key = cell.getAttribute('data-admin-key');
    const currentVal = cell.getAttribute('data-current-val') ?? '';
    if (!key) return;

    // Prevent double-click creating multiple inputs
    if (cell.querySelector('input')) return;

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'pr-input';
    inp.value = currentVal;
    inp.style.cssText = 'width:60px; text-align:center; font-size:0.85rem; font-family:"IBM Plex Mono",monospace;';
    cell.textContent = '';
    cell.appendChild(inp);
    inp.focus();
    inp.select();

    var adminCommitted = false;
    function commitAdminStat() {
        if (adminCommitted) return;
        adminCommitted = true;
        const val = inp.value.trim();
        const pr2 = getPR2Data();
        if (!pr2.adminStatsOverrides) pr2.adminStatsOverrides = {};

        if (val === '') {
            delete pr2.adminStatsOverrides[key];
        } else {
            pr2.adminStatsOverrides[key] = parseInt(val) || 0;
        }

        pr2.lastEdited = new Date().toISOString();
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        initPeriodicReview();
    }

    inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitAdminStat();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            adminCommitted = true; // prevent blur from saving
            initPeriodicReview();
        }
    });

    inp.addEventListener('blur', function() {
        setTimeout(commitAdminStat, 100);
    });
}
