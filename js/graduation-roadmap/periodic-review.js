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
        Object.freeze({ chartNumber: '966540', name: 'Soivilien, Sandrine', reliability: 'red', note: 'earliest apt requested for recall - no response - never seen pt' }),
        Object.freeze({ chartNumber: '79118', name: 'Williams, Kisha', reliability: 'green', note: 'pt scheduled for recall 11/21/2025' }),
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
    const snaps = roadmapData.clinicalData?.dashboardSnapshots;
    if (Array.isArray(snaps) && snaps.length > 0) return snaps[0];
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
            currentVal = smartApts.total ?? 0;
        } else {
            currentVal = parseInt(getSnapshotValue(snapshot, cfg.snapshotPath)) || 0;
        }

        // Escape the key for safe use in onclick attribute
        const safeKey = cfg.key.replace(/'/g, "\\'");

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
// PLACEHOLDER SECTIONS (4-12)
// ============================================

function renderPRPlaceholder(num, title) {
    let html = '<div class="pr-section" id="pr-section-' + num + '">';
    html += '<div class="pr-section-number">' + String(num).padStart(2, '0') + '</div>';
    html += '<div class="pr-section-title">' + escapeHtml(title) + '</div>';
    html += '<div class="pr-panel"><p style="color:#62707c;">Coming soon...</p></div>';
    html += '</div>';
    return html;
}


// ============================================
// MAIN ENTRY POINT
// ============================================

function initPeriodicReview() {
    const container = document.getElementById('tab-periodicreview');
    if (!container) return;

    const pr2 = getPR2Data();
    const snapshot = getLatestSnapshot();

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

    // Sections 4-12: Placeholders
    html += renderPRPlaceholder(4, 'Completed Procedures');
    html += renderPRPlaceholder(5, 'In-Progress Procedures');
    html += renderPRPlaceholder(6, 'Department Audit');
    html += renderPRPlaceholder(7, 'Needed Procedures');
    html += renderPRPlaceholder(8, 'Other Requirements');
    html += renderPRPlaceholder(9, 'Subjective Report');
    html += renderPRPlaceholder(10, 'Patient Roster');
    html += renderPRPlaceholder(11, 'Patient Writeups');
    html += renderPRPlaceholder(12, 'Export');

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

            function commitDate() {
                const val = inp.value || null;
                savePR2Field('reviewDate', val);
                // Re-render to reflect new date + period
                initPeriodicReview();
            }

            inp.addEventListener('change', commitDate);
            inp.addEventListener('blur', function() {
                // Small delay to allow change event to fire first
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

    function commitAdminStat() {
        const val = inp.value.trim();
        const pr2 = getPR2Data();
        if (!pr2.adminStatsOverrides) pr2.adminStatsOverrides = {};

        if (val === '') {
            // Clear override — revert to auto-detected value
            delete pr2.adminStatsOverrides[key];
        } else {
            pr2.adminStatsOverrides[key] = parseInt(val) || 0;
        }

        pr2.lastEdited = new Date().toISOString();
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();

        // Re-render to show updated delta
        initPeriodicReview();
    }

    inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitAdminStat();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            initPeriodicReview();
        }
    });

    inp.addEventListener('blur', function() {
        setTimeout(commitAdminStat, 100);
    });
}
