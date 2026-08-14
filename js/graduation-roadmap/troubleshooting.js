// ==================== D3 ROADMAP: TROUBLESHOOTING ====================
// Data Integrity Engine — automated health checks across 6 domains.
// Loaded BEFORE init.js. Works with global roadmapData, existing functions.

// ==================== CONFIGURATION ====================

var TS_DOMAINS = {
    parser: { name: 'Parser Compatibility', icon: '\uD83D\uDD0C', weight: 10 },
    patients: { name: 'Patient Data Integrity', icon: '\uD83D\uDC64', weight: 25 },
    competencies: { name: 'Competency Pipeline', icon: '\uD83C\uDFAF', weight: 25 },
    schedule: { name: 'Schedule Sync', icon: '\uD83D\uDCC5', weight: 15 },
    dashboard: { name: 'Dashboard Accuracy', icon: '\uD83D\uDCCA', weight: 15 },
    firebase: { name: 'Firebase Sync Health', icon: '\u2601\uFE0F', weight: 10 }
};

var TS_CLINICAL_BRIEF_FIELDS = [
    'snapshot', 'diagnosesAndRisks', 'txStatus', 'txSequencing',
    'flaggedConcerns', 'gradValue', 'nextVisitPlan', 'dateGenerated'
];
var TS_BLOCK_TYPES = [
    'PATIENT_RECORD', 'PATIENT_UPDATE', 'REQUIREMENTS_MATCH',
    'SPS_DASHBOARD_UPDATE', 'APPOINTMENTS',
    'MISSING_NOTES', 'TODO_LIST', 'CLINICAL_BRIEF'
];
var TS_PR_FIELD_COUNT = 21; // NAME..RELIABILITY in parsePatientRecord fieldMap
var TS_CB_FIELD_COUNT = 10; // CHART..NEXT_VISIT_PLAN in parseClinicalBrief fieldMap
var TS_APT_FIELDS = ['PATIENT', 'CHART', 'DATE', 'TIME', 'PROCEDURE', 'CHAIR'];
var tsExpandedDomains = {};

// Helper: build a check object
function tsCheck(name, status, detail, fixFn) {
    var c = { name: name, status: status, detail: detail };
    if (fixFn) c.fixFn = fixFn;
    return c;
}

// ==================== MAIN RENDER ====================

function renderTroubleshooting() {
    var container = document.getElementById('troubleshootingContainer');
    if (!container) return;
    var allChecks = runAllIntegrityChecks();
    var score = calculateIntegrityScore(allChecks);
    var scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    var scoreLabel = score >= 80 ? 'Healthy' : score >= 50 ? 'Needs Attention' : 'Critical Issues';

    var html = '<div style="padding:24px;">';
    // Score ring
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap;">';
    html += '<div style="flex-shrink:0;"><div style="width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;'
        + 'background:conic-gradient(' + scoreColor + ' ' + (score * 3.6) + 'deg, #334155 0deg);position:relative;">'
        + '<div style="width:96px;height:96px;border-radius:50%;background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;">'
        + '<span style="font-size:2em;font-weight:700;color:' + scoreColor + ';">' + score + '</span>'
        + '<span style="font-size:0.7em;color:#94a3b8;">/ 100</span></div></div></div>';
    html += '<div><h2 style="color:#f1f5f9;margin:0 0 4px 0;font-size:1.4em;">Data Integrity Score</h2>'
        + '<div style="color:' + scoreColor + ';font-weight:600;font-size:1.1em;">' + escapeHtml(scoreLabel) + '</div>'
        + '<div style="color:#94a3b8;font-size:0.85em;margin-top:4px;">Last checked: ' + escapeHtml(new Date().toLocaleString()) + '</div></div>';
    html += '<div style="margin-left:auto;"><button onclick="renderTroubleshooting()" style="padding:10px 20px;background:#3b82f6;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-size:0.9em;">Re-scan</button></div>';
    html += '</div>';

    // Domain cards grid
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:16px;">';
    var dKeys = Object.keys(TS_DOMAINS);
    for (var i = 0; i < dKeys.length; i++) html += renderDomainCard(dKeys[i], allChecks[dKeys[i]] || []);
    html += '</div>';

    // Quick fixes
    var hasFixable = false;
    var allKeys = Object.keys(allChecks);
    for (var d = 0; d < allKeys.length && !hasFixable; d++) {
        var cks = allChecks[allKeys[d]];
        for (var c = 0; c < cks.length; c++) { if (cks[c].status !== 'pass' && cks[c].fixFn) { hasFixable = true; break; } }
    }
    if (hasFixable) {
        html += '<div style="margin-top:24px;background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155;">'
            + '<h3 style="color:#f59e0b;margin:0 0 12px 0;font-size:1.1em;">Quick Fixes Available</h3>'
            + '<div style="display:flex;flex-wrap:wrap;gap:10px;">' + tsRenderQuickFixButtons(allChecks) + '</div></div>';
    }
    html += '</div>';

    container.textContent = '';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    while (wrap.firstChild) container.appendChild(wrap.firstChild);
}

// ==================== CORE ENGINE ====================

function runAllIntegrityChecks() {
    return {
        parser: tsCheckParser(), patients: tsCheckPatients(),
        competencies: tsCheckCompetencies(), schedule: tsCheckSchedule(),
        dashboard: tsCheckDashboard(), firebase: tsCheckFirebase()
    };
}

// ==================== DOMAIN 1: PARSER COMPATIBILITY ====================

function tsCheckParser() {
    var checks = [];
    checks.push(tsCheck('9 block types registered', TS_BLOCK_TYPES.length === 9 ? 'pass' : 'fail',
        TS_BLOCK_TYPES.length + '/9 block types: ' + TS_BLOCK_TYPES.join(', ')));
    checks.push(tsCheck('PATIENT_RECORD field map (' + TS_PR_FIELD_COUNT + ' fields)',
        TS_PR_FIELD_COUNT >= 20 ? 'pass' : 'warn',
        TS_PR_FIELD_COUNT + ' fields mapped: NAME, CHART, TYPE, MEDICAL_HX, MEDICATIONS, ALLERGIES, DENTAL_HX, TX_SUMMARY_BU, TX_COMPLETED_BY_ME, POE_LAST/NEXT, TX_PLAN, LAST_VISIT, NEXT_VISIT, imaging, NOTES, RECALL_HISTORY, ACTIVE_STATUS, RELIABILITY.'));
    checks.push(tsCheck('CLINICAL_BRIEF field map (' + TS_CB_FIELD_COUNT + ' fields)',
        TS_CB_FIELD_COUNT >= 9 ? 'pass' : 'warn',
        TS_CB_FIELD_COUNT + ' fields: CHART, NAME, DATE_GENERATED, SNAPSHOT, DIAGNOSES_AND_RISKS, TX_STATUS, TX_SEQUENCING, FLAGGED_CONCERNS, GRAD_VALUE, NEXT_VISIT_PLAN.'));
    checks.push(tsCheck('Known parser quirks', 'warn',
        'PATIENT_UPDATE: UPDATED/SOURCE discarded (metadata). PRIORITY_NOTES: newline separator. TODO_LIST: 5 pipe-delimited fields. MISSING_NOTES: 7 pipe-delimited fields.'));
    checks.push(tsCheck('APPOINTMENTS field map (' + TS_APT_FIELDS.length + ' fields)',
        TS_APT_FIELDS.length >= 5 ? 'pass' : 'warn', 'Fields: ' + TS_APT_FIELDS.join(', ')));
    return checks;
}

// ==================== DOMAIN 2: PATIENT DATA INTEGRITY ====================

function tsCheckPatients() {
    var checks = [];
    var records = {}; try { records = getAllPatientRecords(); } catch (e) { console.error('[TS] Error loading patients:', e); }
    var ids = Object.keys(records);
    if (ids.length === 0) return [tsCheck('Patient records exist', 'fail', 'No patient records found.')];
    checks.push(tsCheck('Patient records loaded', 'pass', ids.length + ' patient record(s) found.'));

    var missingBrief = [], incompleteBrief = [], noReq = [], schemaIssues = [];
    for (var i = 0; i < ids.length; i++) {
        var p = records[ids[i]]; if (!p) continue;
        var nm = p.name || ids[i];
        // Brief check
        if (!p.clinicalBrief || !p.clinicalBrief.snapshot) { missingBrief.push(nm); }
        else {
            var mf = [];
            for (var f = 0; f < TS_CLINICAL_BRIEF_FIELDS.length; f++) if (!p.clinicalBrief[TS_CLINICAL_BRIEF_FIELDS[f]]) mf.push(TS_CLINICAL_BRIEF_FIELDS[f]);
            if (mf.length > 0) incompleteBrief.push(nm + ' (missing: ' + mf.join(', ') + ')');
        }
        // importedRequirements
        var reqs = p.importedRequirements;
        if (!reqs || !Array.isArray(reqs) || reqs.length === 0) noReq.push(nm);
        // Required fields
        var miss = [];
        if (!p.name) miss.push('name'); if (!p.chartNumber) miss.push('chartNumber'); if (!p.reliability) miss.push('reliability');
        if (miss.length > 0) schemaIssues.push((p.name || ids[i]) + ' (' + miss.join(', ') + ')');
    }

    checks.push(tsCheck('Clinical briefs present',
        missingBrief.length === 0 ? 'pass' : missingBrief.length <= 5 ? 'warn' : 'fail',
        missingBrief.length === 0 ? 'All ' + ids.length + ' patients have clinical briefs.'
            : missingBrief.length + ' missing: ' + missingBrief.slice(0, 8).join(', ') + (missingBrief.length > 8 ? '...' : ''),
        missingBrief.length > 0 ? 'tsFixValidatePatientSchemas' : null));
    if (incompleteBrief.length > 0)
        checks.push(tsCheck('Brief field completeness', 'warn',
            incompleteBrief.length + ' incomplete: ' + incompleteBrief.slice(0, 5).join('; ') + (incompleteBrief.length > 5 ? '...' : '')));
    checks.push(tsCheck('Imported requirements coverage',
        noReq.length === 0 ? 'pass' : noReq.length <= ids.length / 2 ? 'warn' : 'fail',
        noReq.length === 0 ? 'All patients have imported requirements.'
            : noReq.length + '/' + ids.length + ' without: ' + noReq.slice(0, 6).join(', ') + (noReq.length > 6 ? '...' : '')));
    checks.push(tsCheck('Required fields (name, chartNumber, reliability)',
        schemaIssues.length === 0 ? 'pass' : 'fail',
        schemaIssues.length === 0 ? 'All patients have required fields.'
            : schemaIssues.length + ' issue(s): ' + schemaIssues.slice(0, 5).join('; ')));
    return checks;
}

// ==================== DOMAIN 3: COMPETENCY PIPELINE ====================

function tsCheckCompetencies() {
    var checks = [];
    var comp = {}; try { comp = getCompetenciesData(); } catch (e) { console.error('[TS] Error loading competencies:', e); }
    var catKeys = Object.keys(comp);
    if (catKeys.length === 0) return [tsCheck('Competencies initialized', 'fail', 'No competency data found.')];
    checks.push(tsCheck('Competencies initialized', 'pass', catKeys.length + ' categories loaded.'));

    // V2 competency count validation
    var overCounted = [], unverified = [], totalItems = 0, completedItems = 0;
    for (var ci = 0; ci < catKeys.length; ci++) {
        var secs = getValues(comp[catKeys[ci]].sections);
        for (var si = 0; si < secs.length; si++) {
            var items = getValues(secs[si].items);
            for (var ii = 0; ii < items.length; ii++) {
                var item = items[ii]; totalItems++;
                var c = item.completed ?? 0;
                var r = item.required ?? 0;
                if (c >= r && r > 0) completedItems++;
                if (c > r) {
                    overCounted.push({ id: item.id || '?', completed: c, required: r });
                }
                if (c > 0 && !item.lastVerified) {
                    unverified.push(item.id || '?');
                }
            }
        }
    }
    checks.push(tsCheck('Competency count validity (' + completedItems + '/' + totalItems + ' done)',
        overCounted.length === 0 ? 'pass' : 'warn',
        overCounted.length === 0 ? 'All ' + totalItems + ' items within valid range.'
            : overCounted.length + ' over-counted: ' + overCounted.slice(0, 5).map(function(d) {
                return d.id + '(c=' + d.completed + ' r=' + d.required + ')'; }).join('; '),
        overCounted.length > 0 ? 'tsFixResyncCompCounts' : null));
    if (unverified.length > 0)
        checks.push(tsCheck('Unverified counts', 'info',
            unverified.length + ' item(s) have completed > 0 but no lastVerified date: ' + unverified.slice(0, 5).join(', ') + (unverified.length > 5 ? '...' : '')));

    // Procedure records listing
    var procs = getValues(roadmapData.clinicalData ? roadmapData.clinicalData.completedProcedures : {});
    checks.push(tsCheck('Procedure records', 'info',
        procs.length + ' procedure record(s) on file.'));

    // d3Deadline check for fixed/operative (info only — formatives legitimately have deadlines)
    var deadlineCount = 0;
    ['fixed', 'operative'].forEach(function(ck) {
        if (!comp[ck]) return;
        getValues(comp[ck].sections).forEach(function(s) {
            getValues(s.items).forEach(function(it) { if (it.d3Deadline) deadlineCount++; });
        });
    });
    if (deadlineCount > 0)
        checks.push(tsCheck('Competency deadlines', 'pass', deadlineCount + ' item(s) in fixed/operative with d3Deadline (expected for formatives).'));
    return checks;
}

// ==================== DOMAIN 4: SCHEDULE SYNC ====================

function tsCheckSchedule() {
    var checks = [];
    var mp = roadmapData.monthlyPlanner || {};
    var cws = mp.currentWeekSchedule || {};
    var cwsArr = getValues(cws);
    var apts = roadmapData.clinicalData ? roadmapData.clinicalData.appointments || {} : {};
    var hidden = mp.hiddenClinicTasks || {};

    // Duplicate check
    var idMap = {}, dupes = [];
    for (var i = 0; i < cwsArr.length; i++) {
        var eid = cwsArr[i].id || '';
        var base = eid.replace(/^clinic_/, '').replace(/^apt_/, '');
        if (base && idMap[base]) dupes.push(base); else if (base) idMap[base] = eid;
    }
    checks.push(tsCheck('Schedule dedup', dupes.length === 0 ? 'pass' : 'warn',
        dupes.length === 0 ? cwsArr.length + ' entries, no duplicates.'
            : dupes.length + ' duplicate(s): ' + dupes.slice(0, 3).join(', '),
        dupes.length > 0 ? 'tsFixDedupSchedule' : null));

    // Missing sync
    var scheduledIds = {};
    for (var j = 0; j < cwsArr.length; j++) { var b = (cwsArr[j].id || '').replace(/^clinic_/, '').replace(/^apt_/, ''); if (b) scheduledIds[b] = true; }
    var ct = mp.customTasks || {};
    Object.keys(ct).forEach(function(k) { if (ct[k] && ct[k].id) scheduledIds[ct[k].id.replace(/^clinic_/, '')] = true; });
    var missSync = [];
    Object.keys(apts).forEach(function(aid) {
        var a = apts[aid]; if (!a || a.status === 'completed' || a.status === 'cancelled') return;
        if (hidden[aid]) return;
        if (!scheduledIds[aid]) missSync.push(aid);
    });
    checks.push(tsCheck('Appointment-to-planner sync', missSync.length === 0 ? 'pass' : missSync.length <= 3 ? 'warn' : 'fail',
        missSync.length === 0 ? 'All active appointments synced.' : missSync.length + ' unsynced: ' + missSync.slice(0, 4).join(', ')));

    // hiddenClinicTasks format
    var htKeys = Object.keys(hidden), badFmt = 0;
    for (var h = 0; h < htKeys.length; h++) if (!hidden[htKeys[h]]) badFmt++;
    checks.push(tsCheck('hiddenClinicTasks format', badFmt === 0 ? 'pass' : 'warn',
        badFmt === 0 ? htKeys.length + ' entries, all truthy.' : badFmt + '/' + htKeys.length + ' falsy entries (should be truthy).'));

    // Current week freshness (Monday-start, matching buildCurrentWeekSchedule)
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var dayOfWeek = today.getDay();
    var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    var wkStart = new Date(today); wkStart.setDate(today.getDate() + mondayOffset);
    var wkEnd = new Date(wkStart); wkEnd.setDate(wkStart.getDate() + 6);
    var hasCurrent = false;
    for (var w = 0; w < cwsArr.length && !hasCurrent; w++) {
        var dp = (cwsArr[w].date || '').split('-').map(Number);
        if (dp.length === 3) { var dt = new Date(dp[0], dp[1] - 1, dp[2]); if (dt >= wkStart && dt <= wkEnd) hasCurrent = true; }
    }
    checks.push(tsCheck('Current week freshness',
        cwsArr.length === 0 ? 'warn' : hasCurrent ? 'pass' : 'warn',
        cwsArr.length === 0 ? 'No entries.' : hasCurrent ? cwsArr.length + ' entries incl. current week.'
            : cwsArr.length + ' entries but none for current week.',
        !hasCurrent ? 'tsFixRebuildWeekSchedule' : null));
    return checks;
}

// ==================== DOMAIN 5: DASHBOARD ACCURACY ====================

function tsCheckDashboard() {
    var checks = [];
    var snaps = []; try { snaps = getDashboardSnapshots(); } catch (e) { /* */ }

    if (snaps.length === 0) {
        checks.push(tsCheck('SPS dashboard snapshot', 'warn', 'No snapshots. Import SPS_DASHBOARD_UPDATE for ground truth.'));
    } else {
        var ld = snaps[0].capturedAt || snaps[0].date || null, daysSince = -1;
        if (ld) { var sp = String(ld).split('-').map(Number); if (sp.length === 3) { var sd = new Date(sp[0], sp[1] - 1, sp[2]); var n = new Date(); n.setHours(0,0,0,0); daysSince = Math.floor((n - sd) / 864e5); } }
        checks.push(tsCheck('SPS snapshot freshness',
            daysSince >= 0 && daysSince <= 7 ? 'pass' : daysSince > 7 && daysSince <= 30 ? 'warn' : 'fail',
            daysSince >= 0 ? 'Latest: ' + ld + ' (' + daysSince + 'd ago). ' + snaps.length + ' total.'
                : 'Date unknown. ' + snaps.length + ' stored.'));
    }

    var sa = { total: 0 }; try { sa = getSmartAppointmentCount(); } catch (e) { /* */ }
    var sp2 = { total: 0 }; try { sp2 = getSmartProcedureCount(); } catch (e) { /* */ }
    checks.push(tsCheck('Smart appointment counter', 'pass',
        'Total: ' + sa.total + ' (apts:' + (sa.fromAppointments||0) + ' planner:' + (sa.fromPlannerSync||0) + ' visits:' + (sa.fromPatientVisits||0) + ' snap:' + (sa.fromSnapshot||0) + ')'));
    checks.push(tsCheck('Smart procedure counter', 'pass',
        'Total: ' + sp2.total + ' (formal:' + (sp2.formalCount||0) + ' comp:' + (sp2.competencyDerived||0) + ' snap:' + (sp2.fromSnapshot||0) + ')'));

    var hl = roadmapData.clinicHeadlines || {};
    var at = (hl.appointments ? hl.appointments.target : null) ?? 90;
    var pt = (hl.procedures ? hl.procedures.target : null) ?? 116;
    checks.push(tsCheck('Clinic headline targets', 'pass',
        'Appointments: ' + at + ', Procedures: ' + pt + (at === 90 && pt === 116 ? ' (defaults)' : ' (custom)')));

    var rd = { percent: 0 }; try { rd = calculateGraduationReadiness(); } catch (e) { /* */ }
    checks.push(tsCheck('Graduation readiness',
        typeof rd.percent === 'number' && rd.percent >= 0 && rd.percent <= 100 ? 'pass' : 'fail',
        'Readiness: ' + (rd.percent || 0) + '%. ' + Object.keys(rd.details || {}).length + ' categories.'));
    return checks;
}

// ==================== DOMAIN 6: FIREBASE SYNC HEALTH ====================

function tsCheckFirebase() {
    var checks = [];
    checks.push(tsCheck('_dataLoaded flag', roadmapData._dataLoaded === true ? 'pass' : 'fail',
        roadmapData._dataLoaded === true ? 'Data loaded.' : '_dataLoaded=' + String(roadmapData._dataLoaded)));
    checks.push(tsCheck('_version check', roadmapData._version > 0 ? 'pass' : 'warn',
        roadmapData._version > 0 ? 'Version: ' + roadmapData._version : '_version=' + roadmapData._version + ' (default state?)'));

    var ls = roadmapData.lastSaved, recent = false, age = 'unknown';
    if (ls) { var t = new Date(ls).getTime(); if (!isNaN(t)) { var h = Math.floor((Date.now() - t) / 36e5); age = h < 1 ? '<1 hour' : h + 'h'; recent = h < 24; } }
    checks.push(tsCheck('Last saved recency', recent ? 'pass' : ls ? 'warn' : 'fail',
        ls ? 'Saved ' + age + ' ago (' + escapeHtml(String(ls)) + ').' : 'No lastSaved timestamp.'));

    // Structural integrity (mirrors validateStateIntegrity)
    var errs = [];
    if (typeof roadmapData.clinicalData !== 'object' || !roadmapData.clinicalData) errs.push('clinicalData');
    else {
        if (typeof roadmapData.clinicalData.patients !== 'object') errs.push('clinicalData.patients');
        if (typeof roadmapData.clinicalData.appointments !== 'object') errs.push('clinicalData.appointments');
        if (typeof roadmapData.clinicalData.completedProcedures !== 'object') errs.push('clinicalData.completedProcedures');
        if (roadmapData.clinicalData.patientRecords === undefined) errs.push('clinicalData.patientRecords');
    }
    if (typeof roadmapData.monthlyPlanner !== 'object' || !roadmapData.monthlyPlanner) errs.push('monthlyPlanner');
    if (typeof roadmapData.graduationPrep !== 'object' || !roadmapData.graduationPrep) errs.push('graduationPrep');
    if (typeof roadmapData.clinicHeadlines !== 'object' || !roadmapData.clinicHeadlines) errs.push('clinicHeadlines');
    if (typeof roadmapData.grades !== 'object' || !roadmapData.grades) errs.push('grades');
    if (roadmapData.todoList !== undefined && (typeof roadmapData.todoList !== 'object' || !roadmapData.todoList)) errs.push('todoList');
    checks.push(tsCheck('Critical structure integrity', errs.length === 0 ? 'pass' : 'fail',
        errs.length === 0 ? 'All 8 critical structures valid.' : errs.length + ' missing: ' + errs.join(', ')));

    var fbSync = typeof firebaseSyncEnabled !== 'undefined' ? firebaseSyncEnabled : false;
    var fbInit = typeof firebaseInitialized !== 'undefined' ? firebaseInitialized : false;
    checks.push(tsCheck('Firebase connection', fbInit && fbSync ? 'pass' : fbInit ? 'warn' : 'fail',
        'Init: ' + fbInit + ', Sync: ' + fbSync));
    return checks;
}

// ==================== RENDER HELPERS ====================

function renderDomainCard(domainKey, checks) {
    var dom = TS_DOMAINS[domainKey]; if (!dom) return '';
    var pass = 0, warn = 0, fail = 0;
    for (var i = 0; i < checks.length; i++) { if (checks[i].status === 'pass') pass++; else if (checks[i].status === 'warn') warn++; else if (checks[i].status === 'info') pass++; else fail++; }
    var light = fail > 0 ? '#ef4444' : warn > 0 ? '#f59e0b' : '#10b981';
    var isExp = tsExpandedDomains[domainKey] === true;
    var safeKey = escapeHtml(domainKey).replace(/'/g, "\\'");
    var issues = warn + fail;

    var h = '<div style="background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">';
    h += '<div onclick="tsToggleDomain(\'' + safeKey + '\')" style="padding:16px;cursor:pointer;display:flex;align-items:center;gap:12px;">'
        + '<span style="font-size:1.5em;">' + (dom.icon || '') + '</span>'
        + '<div style="flex:1;"><div style="color:#f1f5f9;font-weight:600;">' + escapeHtml(dom.name) + '</div>'
        + '<div style="color:#94a3b8;font-size:0.8em;">' + checks.length + ' checks, ' + issues + ' issue(s)</div></div>'
        + '<span style="width:12px;height:12px;border-radius:50%;background:' + light + ';flex-shrink:0;display:inline-block;"></span>'
        + '<span style="color:#94a3b8;font-size:0.85em;transform:rotate(' + (isExp ? '180' : '0') + 'deg);">&#x25BC;</span></div>';
    if (isExp) {
        h += '<div style="border-top:1px solid #334155;padding:12px 16px;">';
        for (var c = 0; c < checks.length; c++) h += renderCheckResult(checks[c]);
        h += '</div>';
    }
    return h + '</div>';
}

function renderCheckResult(check) {
    var icons = { pass: '&#x2705;', warn: '&#x26A0;&#xFE0F;', fail: '&#x274C;', info: '&#x2139;&#xFE0F;' };
    var colors = { pass: '#10b981', warn: '#f59e0b', fail: '#ef4444', info: '#3b82f6' };
    return '<div style="padding:8px 0;border-bottom:1px solid rgba(51,65,85,0.5);">'
        + '<div style="display:flex;align-items:flex-start;gap:8px;">'
        + '<span style="flex-shrink:0;">' + (icons[check.status] || '&#x2753;') + '</span>'
        + '<div style="flex:1;"><div style="color:' + (colors[check.status] || '#94a3b8') + ';font-weight:500;font-size:0.9em;">' + escapeHtml(check.name) + '</div>'
        + (check.detail ? '<div style="color:#94a3b8;font-size:0.8em;margin-top:2px;line-height:1.4;">' + escapeHtml(check.detail) + '</div>' : '')
        + '</div></div></div>';
}

function tsToggleDomain(domainKey) {
    tsExpandedDomains[domainKey] = !tsExpandedDomains[domainKey];
    renderTroubleshooting();
}

// ==================== QUICK FIX BUTTONS ====================

function tsRenderQuickFixButtons(allChecks) {
    var fixes = {}, labels = {
        'tsFixResyncCompCounts': 'Re-sync Competency Counts',
        'tsFixValidatePatientSchemas': 'Add Missing Brief Defaults',
        'tsFixDedupSchedule': 'De-duplicate Schedule',
        'tsFixRebuildDeadlines': 'Rebuild Deadlines',
        'tsFixRebuildWeekSchedule': 'Rebuild Week Schedule'
    };
    var dks = Object.keys(allChecks);
    for (var d = 0; d < dks.length; d++) {
        var cks = allChecks[dks[d]];
        for (var c = 0; c < cks.length; c++) if (cks[c].status !== 'pass' && cks[c].fixFn) fixes[cks[c].fixFn] = true;
    }
    var html = '', fks = Object.keys(fixes);
    for (var i = 0; i < fks.length; i++) {
        html += '<button onclick="' + escapeHtml(fks[i]) + '()" style="padding:8px 16px;background:rgba(245,158,11,0.15);'
            + 'border:1px solid rgba(245,158,11,0.4);color:#f59e0b;border-radius:8px;cursor:pointer;font-size:0.85em;font-weight:600;">'
            + escapeHtml(labels[fks[i]] || fks[i]) + '</button>';
    }
    return html;
}

// ==================== QUICK FIX ACTIONS ====================

function tsFixResyncCompCounts() {
    var comp = {}; try { comp = getCompetenciesData(); } catch (e) { return; }
    var fixCount = 0;
    Object.keys(comp).forEach(function(ck) {
        getValues(comp[ck].sections).forEach(function(sec) {
            getValues(sec.items).forEach(function(item) {
                var c = item.completed ?? 0;
                var r = item.required ?? 0;
                var changed = false;
                // Clamp completed to valid range [0, required]
                if (c > r) { item.completed = r; changed = true; }
                if (c < 0) { item.completed = 0; changed = true; }
                // Derive correct status
                var expected = (item.completed ?? 0) >= r && r > 0 ? 'completed' : (item.completed ?? 0) > 0 ? 'in_progress' : 'pending';
                if (item.status !== expected) { item.status = expected; changed = true; }
                if (changed) { item.lastVerified = getLocalDateString(new Date()); fixCount++; }
            });
        });
    });
    if (fixCount > 0) { clinicalDataDirty = true; safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData)); saveData(); }
    showToast(fixCount > 0 ? 'Fixed ' + fixCount + ' item(s) (clamped counts + derived status)' : 'All counts valid', 'warning');
    if (fixCount > 0 && typeof renderDashboard === 'function') renderDashboard();
    renderTroubleshooting();
}

function tsFixValidatePatientSchemas() {
    var recs = {}; try { recs = getAllPatientRecords(); } catch (e) { return; }
    var fixCount = 0;
    Object.keys(recs).forEach(function(id) {
        var p = recs[id]; if (!p) return;
        var needsFix = false;
        if (!p.clinicalBrief) { p.clinicalBrief = {}; needsFix = true; }
        for (var f = 0; f < TS_CLINICAL_BRIEF_FIELDS.length; f++) {
            if (p.clinicalBrief[TS_CLINICAL_BRIEF_FIELDS[f]] === undefined) {
                p.clinicalBrief[TS_CLINICAL_BRIEF_FIELDS[f]] = '';
                needsFix = true;
            }
        }
        if (needsFix) {
            fixCount++;
            // Write to canonical store, not merged view
            if (!roadmapData.clinicalData.patientRecords[id]) {
                roadmapData.clinicalData.patientRecords[id] = {};
            }
            Object.keys(p).forEach(function(key) {
                roadmapData.clinicalData.patientRecords[id][key] = p[key];
            });
        }
    });
    if (fixCount > 0) { clinicalDataDirty = true; safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData)); saveData(); }
    showToast(fixCount > 0 ? 'Added brief defaults to ' + fixCount + ' patient(s)' : 'All patients have clinicalBrief', 'warning');
    renderTroubleshooting();
}

function tsFixDedupSchedule() {
    var cws = roadmapData.monthlyPlanner ? roadmapData.monthlyPlanner.currentWeekSchedule || {} : {};
    var groups = {}, removeCount = 0;
    Object.keys(cws).forEach(function(k) {
        var e = cws[k]; if (!e || !e.id) return;
        var base = e.id.replace(/^clinic_/, '').replace(/^apt_/, '');
        if (!groups[base]) groups[base] = [];
        groups[base].push({ key: k, id: e.id });
    });
    Object.keys(groups).forEach(function(base) {
        var g = groups[base]; if (g.length <= 1) return;
        var hasClinic = g.some(function(x) { return x.id.indexOf('clinic_') === 0; });
        if (hasClinic) g.forEach(function(x) { if (x.id.indexOf('clinic_') !== 0) { delete cws[x.key]; removeCount++; } });
    });
    if (removeCount > 0) { clinicalDataDirty = true; if (typeof syncClinicalToMonthlyPlanner === 'function') syncClinicalToMonthlyPlanner(); if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule(); safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData)); saveData(); }
    showToast(removeCount > 0 ? 'Removed ' + removeCount + ' duplicate(s)' : 'No duplicates found', 'warning');
    renderTroubleshooting();
}

function tsFixRebuildDeadlines() {
    if (typeof rebuildUpcomingDeadlines === 'function') {
        rebuildUpcomingDeadlines();
        // Per CLAUDE.md propagation table: deadline mutation requires sync + persistence
        clinicalDataDirty = true;
        if (typeof syncClinicalToMonthlyPlanner === 'function') syncClinicalToMonthlyPlanner();
        if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
        saveData();
        showToast('Deadlines rebuilt', 'warning');
    }
    else showToast('rebuildUpcomingDeadlines not available', 'error');
    renderTroubleshooting();
}

function tsFixRebuildWeekSchedule() {
    if (typeof buildCurrentWeekSchedule === 'function') buildCurrentWeekSchedule();
    if (typeof syncClinicalToMonthlyPlanner === 'function') {
        clinicalDataDirty = true;
        syncClinicalToMonthlyPlanner();
    }
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    showToast('Week schedule rebuilt', 'warning');
    renderTroubleshooting();
}

// ==================== AUTOMATIC INTEGRITY CHECKS ====================
// Lightweight checks that run after external data enters roadmapData.
// Console-only output — no UI alerts, no state mutations, no saves.
// Designed to surface corruption immediately instead of waiting for
// the user to manually navigate to the Troubleshooting tab.
function runPostMergeIntegrityChecks(source) {
    try {
        var start = performance.now();
        var issues = [];

        // Firebase structure (< 1ms)
        var fbChecks = tsCheckFirebase();
        fbChecks.forEach(function(c) {
            if (c.status === 'fail') issues.push('[firebase] ' + c.name + ': ' + c.detail);
        });

        // Schedule sync (< 5ms)
        var schedChecks = tsCheckSchedule();
        schedChecks.forEach(function(c) {
            if (c.status === 'fail') issues.push('[schedule] ' + c.name + ': ' + c.detail);
        });

        // Competency pipeline (< 15ms)
        var compChecks = tsCheckCompetencies();
        compChecks.forEach(function(c) {
            if (c.status === 'fail') issues.push('[competencies] ' + c.name + ': ' + c.detail);
        });

        var elapsed = Math.round(performance.now() - start);

        if (issues.length > 0) {
            console.warn('[INTEGRITY] Post-merge check (' + source + ', ' + elapsed + 'ms): ' + issues.length + ' issue(s)');
            issues.forEach(function(issue) { console.warn('  \u2192 ' + issue); });
        } else {
            console.log('[INTEGRITY] Post-merge check (' + source + ', ' + elapsed + 'ms): clean');
        }
    } catch (e) {
        console.error('[INTEGRITY] Check failed:', e);
    }
}

// ==================== INTEGRITY SCORE ====================

function calculateIntegrityScore(allChecks) {
    var totalW = 0, earnedW = 0;
    Object.keys(TS_DOMAINS).forEach(function(dk) {
        var w = TS_DOMAINS[dk].weight || 10;
        var cks = allChecks[dk] || [];
        totalW += w;
        if (cks.length === 0) { earnedW += w; return; }
        var pass = 0, warn = 0;
        for (var c = 0; c < cks.length; c++) { if (cks[c].status === 'pass' || cks[c].status === 'info') pass++; else if (cks[c].status === 'warn') warn++; }
        earnedW += w * (pass + warn * 0.5) / cks.length;
    });
    return totalW > 0 ? Math.round((earnedW / totalW) * 100) : 0;
}
