// ============================================================================
// SULLY CALENDAR — import-ui.js
// Import & sync dialog: paste box with live preview (checkbox per change,
// color-coded status), sync-appointments mode, format guide + one-click copy
// of the Claude project instructions, "Export for Claude" snapshot (with IDs
// so Claude can emit MOVE/UPDATE/DELETE verbs), .ics import/export.
// applyImportPlan() runs every change as ONE undoable step.
// ============================================================================

var importDraftText = '';
var importPlan = null;
var importIsIcs = false;

var CLAUDE_GRAMMAR_TEXT = [
    'SULLY CALENDAR — PASTE FORMAT (SULLYCAL-1)',
    'Output exactly ONE triple-backtick code fence. Separate blocks with --- on its own line.',
    'Dates: YYYY-MM-DD (MM/DD/YYYY also works). Times: 9:00 AM, ranges "9:00 AM - 12:00 PM". All times are America/New_York.',
    '',
    'CREATE',
    'EVENT        TITLE, DATE, TIME (range) or ALL_DAY: yes (+ END_DATE for multi-day), LOCATION, CALENDAR, COLOR, REPEAT, UNTIL, COUNT, REMINDER, NOTES, ID',
    'TASK         TITLE, DUE (date [time]), PRIORITY (low|medium|high), CALENDAR, NOTES, ID',
    'DEADLINE     TITLE, DUE (date [time]), PRIORITY, CALENDAR, NOTES, ID',
    'APPOINTMENTS PATIENT, CHART, DATE, TIME, PROCEDURE, CHAIR, NOTES — same as the Grad Roadmap format: a header-only',
    '             APPOINTMENTS block, then one --- separated block per appointment.',
    '',
    'CHANGE — corrections are verbs, never a second add',
    'EVENT_MOVE          ID: or MATCH: (+ FROM: old date [time]) · TO: new date and/or time (duration is kept)',
    'EVENT_UPDATE        ID: or MATCH: (+ ON: date to change one occurrence) · then new values: NEW_TITLE, DATE, TIME,',
    '                    LOCATION, NOTES, NOTES_APPEND, CALENDAR, COLOR, REPEAT, REMINDER, PRIORITY, STATUS · SCOPE: this|following|all',
    'EVENT_DELETE        ID: or MATCH: (+ ON: date) · SCOPE: this|following|all for repeating events',
    'EVENT_DONE          ID: or MATCH: (+ ON: date)      EVENT_UNDONE same fields',
    'APPOINTMENT_MOVE    CHART: or PATIENT: · FROM: date time · TO: new date and/or time',
    'APPOINTMENT_DELETE  CHART: or PATIENT: · DATE: · TIME:',
    'CALENDAR            NAME: · COLOR: · NEW_NAME: · VISIBLE: yes|no',
    '',
    'VALUES',
    'REPEAT: daily | weekdays | weekly on Mon, Wed | every 2 weeks on Tue | monthly on the 15th | monthly on the first Monday |',
    '        monthly on the last Friday | yearly | RRULE:FREQ=WEEKLY;BYDAY=TU,TH   (+ UNTIL: date or COUNT: n)',
    'REMINDER: 30 min, 1 day  (or none)        STATUS: done | open        PRIORITY: low | medium | high',
    'COLOR: tomato flamingo tangerine banana sage basil peacock blueberry lavender grape graphite (red/blue/green… work too)',
    'CALENDAR: an existing calendar name (Personal, Clinic Appointments, School, Deadlines, Tasks) — a new name creates it.',
    '',
    'Re-pasting is safe: identical events are skipped; an event pasted again with the same ID is updated in place.',
    'When the user pastes a SULLY CALENDAR SNAPSHOT, use its ID: values for every MOVE / UPDATE / DELETE / DONE.'
].join('\n');

var IMPORT_EXAMPLE_TEXT = [
    '```',
    'APPOINTMENTS',
    '---',
    'PATIENT: Jane Doe',
    'CHART: 001234',
    'DATE: 2026-11-04',
    'TIME: 9:00 AM - 12:00 PM',
    'PROCEDURE: Crown prep #19',
    'CHAIR: 12',
    '---',
    'EVENT',
    'TITLE: Board review session',
    'DATE: 2026-11-07',
    'TIME: 10:00 AM - 1:00 PM',
    'LOCATION: Room 204',
    'CALENDAR: School',
    '---',
    'DEADLINE',
    'TITLE: PR2 write-up',
    'DUE: 2026-11-10 11:59 PM',
    'PRIORITY: high',
    '---',
    'EVENT_MOVE',
    'MATCH: Study group',
    'FROM: 2026-11-05',
    'TO: 2026-11-06 7:00 PM',
    '```'
].join('\n');

// ---------------------------------------------------------------- serialization (for Claude / copy)
function fmt12(hhmm) {
    if (!isValidHHMM(hhmm)) return '';
    var h = +hhmm.slice(0, 2), m = hhmm.slice(3, 5);
    return (h % 12 === 0 ? 12 : h % 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM');
}

function repeatToText(rec, startDate) {
    if (!rec) return '';
    var parts = ['FREQ=' + rec.freq.toUpperCase()];
    if (rec.interval > 1) parts.push('INTERVAL=' + rec.interval);
    if (rec.freq === 'weekly' && rec.byDay) parts.push('BYDAY=' + rec.byDay);
    if (rec.freq === 'monthly') {
        var p = ymdParts(startDate), wd = DOW_CODES[weekdayOf(startDate)];
        if (rec.monthlyMode === 'nth') parts.push('BYDAY=' + Math.ceil(p.d / 7) + wd);
        else if (rec.monthlyMode === 'last') parts.push('BYDAY=-1' + wd);
        else parts.push('BYMONTHDAY=' + p.d);
    }
    if (rec.until) parts.push('UNTIL=' + rec.until.replace(/-/g, ''));
    else if (rec.count) parts.push('COUNT=' + rec.count);
    return 'RRULE:' + parts.join(';') + '   (' + describeRecurrence(rec, startDate) + ')';
}

// A full create/upsert block for one event — re-pasting it (edited) updates the event by ID
function formatEventForImport(ev, inst) {
    if (!ev) return '';
    var x = inst && !ev.recurrence ? inst : ev;
    var header = { appointment: 'APPOINTMENTS', task: 'TASK', deadline: 'DEADLINE', event: 'EVENT' }[ev.type] || 'EVENT';
    var L = [header, 'ID: ' + ev.id];
    if (ev.type === 'appointment') {
        L.push('PATIENT: ' + (ev.patientName || ''));
        if (ev.chartNumber) L.push('CHART: ' + ev.chartNumber);
        if (ev.title) L.push('TITLE: ' + ev.title);
    } else L.push('TITLE: ' + (ev.title || ''));
    var point = (ev.type === 'task' || ev.type === 'deadline');
    if (point) {
        L.push('DUE: ' + x.startDate + (x.allDay ? '' : ' ' + fmt12(x.startTime)));
    } else {
        L.push('DATE: ' + x.startDate);
        if (x.allDay) {
            L.push('ALL_DAY: yes');
            if (x.endDate && x.endDate !== x.startDate) L.push('END_DATE: ' + x.endDate);
        } else {
            L.push('TIME: ' + fmt12(x.startTime) + ' - ' + fmt12(x.endTime));
            if (x.endDate && x.endDate !== x.startDate) L.push('END_DATE: ' + x.endDate);
        }
    }
    if (ev.type === 'appointment') {
        if (ev.procedure) L.push('PROCEDURE: ' + ev.procedure.replace(/\n/g, '\n  '));
        if (ev.chair) L.push('CHAIR: ' + ev.chair);
    }
    if (ev.location) L.push('LOCATION: ' + ev.location);
    var cal = getCalendar(ev.calendarId);
    if (cal) L.push('CALENDAR: ' + cal.name);
    if (ev.color) L.push('COLOR: ' + ev.color);
    if (ev.recurrence) L.push('REPEAT: ' + repeatToText(ev.recurrence, ev.startDate).split('   (')[0]);
    var rms = reminderMinutes(ev);
    L.push('REMINDER: ' + (rms.length ? rms.map(function(m) { return m + ' min'; }).join(', ') : 'none'));
    if (ev.priority) L.push('PRIORITY: ' + ev.priority);
    if (point) L.push('STATUS: ' + (ev.done ? 'done' : 'open'));
    if (ev.notes) L.push('NOTES: ' + ev.notes.replace(/\n/g, '\n  '));
    return L.join('\n');
}

function buildClaudeSnapshot(fromYmd, toYmd) {
    var insts = getInstancesInRange(fromYmd, toYmd, { includeHidden: true, includeDone: true, noOverlays: true });
    var byDay = {};
    insts.forEach(function(i) { (byDay[i.startDate] = byDay[i.startDate] || []).push(i); });
    var now = new Date();
    var L = [
        'SULLY CALENDAR SNAPSHOT — ' + fmtDateMed(getLocalDateString(now)) + ' ' + fmt12(pad2(now.getHours()) + ':' + pad2(now.getMinutes())) + ' (America/New_York)',
        'Range: ' + fromYmd + ' → ' + toYmd + ' · ' + insts.length + ' item' + (insts.length === 1 ? '' : 's'),
        'Calendars: ' + getCalendarList().map(function(c) { return c.name + (c.visible ? '' : ' (hidden)'); }).join(', '),
        'Edit these with EVENT_MOVE / EVENT_UPDATE / EVENT_DELETE / EVENT_DONE using the ID (add ON: <date> for one occurrence of a repeating event).',
        ''
    ];
    Object.keys(byDay).sort().forEach(function(d) {
        L.push(d + ' ' + DOW_SHORT[weekdayOf(d)]);
        byDay[d].forEach(function(i) {
            var ev = state.events[i.id];
            var cal = getCalendar(i.calendarId);
            var time = i.allDay ? (i.endDate !== i.startDate ? 'all day → ' + i.endDate : 'all day')
                : (i.startTime === i.endTime ? fmt12(i.startTime) : fmt12(i.startTime) + ' - ' + fmt12(i.endTime));
            var bits = ['- ' + time, EVENT_TYPES[i.type].toUpperCase(), displayTitle(i)];
            if (i.type === 'appointment') {
                if (i.chartNumber) bits.push('chart ' + i.chartNumber);
                if (i.chair) bits.push('chair ' + i.chair);
            }
            if (i.location) bits.push('@ ' + i.location);
            if (cal) bits.push('[' + cal.name + ']');
            if (i.done) bits.push('[done]');
            if (ev && ev.recurrence) bits.push('(repeats: ' + describeRecurrence(ev.recurrence, ev.startDate) + ')');
            bits.push('ID: ' + i.id + (i.occ ? ' ON: ' + i.occ : ''));
            L.push(bits.join(' · '));
        });
        L.push('');
    });
    if (!insts.length) L.push('(nothing scheduled in this range)');
    return L.join('\n');
}

// ---------------------------------------------------------------- apply
function applyImportPlan(plan) {
    var items = plan.items.filter(function(it) { return it.checked && ['create', 'update', 'move', 'delete', 'done', 'calendar'].indexOf(it.kind) !== -1; });
    if (!items.length) return 0;
    if (items.some(function(it) { return it.destructive; }) || items.length >= 15) createCheckpoint('pre-import', true);
    var ch = beginChange('import (' + items.length + ' change' + (items.length === 1 ? '' : 's') + ')');
    var calByName = {};
    var done = { calendar: 0, create: 0, update: 0, move: 0, done: 0, delete: 0 };
    var failed = 0;

    function resolveCalRef(ref, type) {
        if (!ref) return null;
        var key = String(ref).trim().toLowerCase();
        if (calByName[key] && state.calendars[calByName[key]]) return calByName[key];
        var c = findCalendarByName(ref);
        if (c) return c.id;
        var nc = createCalendar(String(ref).trim(), null, TYPE_TO_KIND[type] || 'general');
        calByName[key] = nc.id;
        return nc.id;
    }

    ['calendar', 'create', 'update', 'move', 'done', 'delete'].forEach(function(kind) {
        items.filter(function(it) { return it.kind === kind; }).forEach(function(it) {
            try {
                if (kind === 'calendar') {
                    if (it.action === 'create') {
                        var key = it.name.toLowerCase();
                        var exists = getCalendarList().find(function(c) { return c.name.toLowerCase() === key; });
                        if (exists) { calByName[key] = exists.id; return; }
                        var c = createCalendar(it.name, it.color, 'general');
                        if (it.description || it.visible === false) patchCalendar(c.id, { description: it.description || '', visible: it.visible !== false });
                        calByName[key] = c.id;
                    } else {
                        if (!state.calendars[it.calId]) { failed++; return; }
                        patchCalendar(it.calId, it.changes);
                    }
                    done.calendar++;
                    return;
                }
                if (kind === 'create') {
                    var spec = deepClone(it.spec);
                    spec.calendarId = it.calendarId && state.calendars[it.calendarId] ? it.calendarId
                        : (it.newCalendarName ? resolveCalRef(it.newCalendarName, spec.type) : getCalendarForType(spec.type).id);
                    delete spec.calendarRef;
                    spec.source = importIsIcs ? 'ics' : 'import';
                    if (spec.done) spec.doneAt = nowIso();
                    var created = createEventRecord(spec);
                    if (it.exdates && created.recurrence) {
                        var ex = {};
                        it.exdates.forEach(function(d) { if (isValidYMD(d)) ex[d] = { deleted: true }; });
                        state.events[created.id].exceptions = ex;
                    }
                    done.create++;
                    return;
                }
                var ev = state.events[it.targetId];
                if (!ev) { failed++; return; }
                var inst = buildInstance(ev, it.occ || null);
                if (!inst) { failed++; return; }
                if (kind === 'delete') { deleteInstance(inst, it.scope || 'all'); done.delete++; return; }
                var occCh = Object.assign({}, it.changes || {});
                var serCh = it.seriesChanges ? Object.assign({}, it.seriesChanges) : null;
                [occCh, serCh].forEach(function(c) {
                    if (c && c.calendarRef) { c.calendarId = resolveCalRef(c.calendarRef, ev.type); delete c.calendarRef; }
                    if (c && c.notesAppend) delete c.notesAppend;
                });
                if (serCh && Object.keys(serCh).length) updateInstance(inst, serCh, 'all');
                if (Object.keys(occCh).length) {
                    var fresh = buildInstance(state.events[ev.id], it.occ || null) || inst;
                    applyInstanceChanges(fresh, occCh, it.scope || 'all');
                }
                done[kind]++;
            } catch (e) {
                console.error('Import item failed', it, e);
                failed++;
            }
        });
    });
    var parts = [];
    if (done.create) parts.push(done.create + ' added');
    if (done.update) parts.push(done.update + ' updated');
    if (done.move) parts.push(done.move + ' moved');
    if (done.done) parts.push(done.done + ' marked');
    if (done.delete) parts.push(done.delete + ' deleted');
    if (done.calendar) parts.push(done.calendar + ' calendar' + (done.calendar === 1 ? '' : 's'));
    var msg = parts.length ? 'Imported: ' + parts.join(', ') : 'Nothing changed';
    if (failed) msg += ' · ' + failed + ' failed';
    finishChange(ch, msg);
    return items.length - failed;
}

// ---------------------------------------------------------------- dialog
var KIND_META = {
    create: { label: 'New', cls: 'new' }, update: { label: 'Update', cls: 'upd' }, move: { label: 'Move', cls: 'move' },
    delete: { label: 'Delete', cls: 'del' }, done: { label: 'Done', cls: 'done' }, calendar: { label: 'Calendar', cls: 'cal' },
    skip: { label: 'Skip', cls: 'skip' }, reject: { label: 'Error', cls: 'err' }
};

function openImportDialog(initialTab, prefillText) {
    closePopover(true);
    if (prefillText !== undefined) importDraftText = prefillText;
    var today = getLocalDateString();
    var html =
        '<div class="gc-import">' +
        '<div class="gc-import-head"><h2>' + icon('content_paste') + 'Import &amp; sync</h2><button class="gc-icon-btn" data-close title="Close">' + icon('close') + '</button></div>' +
        '<div class="gc-tabs" role="tablist">' +
        [['paste', 'Paste'], ['guide', 'Format guide'], ['export', 'Export for Claude'], ['ics', '.ics file']].map(function(t) {
            return '<button class="gc-tab" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        // paste
        '<div class="gc-tabpanel" data-panel="paste">' +
        '<div class="gc-import-grid">' +
        '<div class="gc-import-left">' +
        '<textarea class="gc-import-text" spellcheck="false" placeholder="Paste the code block from your Claude project here…\n\nAPPOINTMENTS\n---\nPATIENT: Jane Doe\nDATE: 2026-11-04\nTIME: 9:00 AM\nPROCEDURE: Crown prep #19\n\n…or just type: Dentist tomorrow 3pm @ BU"></textarea>' +
        '<div class="gc-import-tools">' +
        '<button class="gc-btn tonal sm" data-act="clip">' + icon('content_paste_go') + ' Paste from clipboard</button>' +
        '<button class="gc-btn text sm" data-act="clear">Clear</button>' +
        '<label class="gc-check gc-sync-mode" title="Removes appointments on the pasted days that are not in this paste — for re-pasting a full day\'s axiUm schedule"><input type="checkbox" data-act="sync"><span>Sync mode: remove appointments missing from the pasted days</span></label>' +
        '</div></div>' +
        '<div class="gc-import-right"><div class="gc-import-summary"></div><div class="gc-import-list" aria-live="polite"></div></div>' +
        '</div></div>' +
        // guide
        '<div class="gc-tabpanel" data-panel="guide" hidden>' +
        '<p class="gc-muted">Your Claude project turns screenshots and messages into this text. Paste it on the Paste tab — you see every change before it lands. The same APPOINTMENTS text works in the Grad Roadmap.</p>' +
        '<div class="gc-guide-actions"><button class="gc-btn filled sm" data-act="copygrammar">' + icon('content_copy') + ' Copy Claude project instructions</button>' +
        '<button class="gc-btn tonal sm" data-act="tryexample">' + icon('science') + ' Try the example</button></div>' +
        '<pre class="gc-code">' + escapeHtml(CLAUDE_GRAMMAR_TEXT) + '</pre>' +
        '<h3 class="gc-h3">Example paste</h3><pre class="gc-code">' + escapeHtml(IMPORT_EXAMPLE_TEXT) + '</pre>' +
        '</div>' +
        // export
        '<div class="gc-tabpanel" data-panel="export" hidden>' +
        '<p class="gc-muted">Give Claude your current schedule (with IDs) so it can move, edit, complete or delete exact events instead of guessing.</p>' +
        '<div class="gc-export-row"><select class="gc-input sm" data-act="range">' +
        '<option value="14">Next 2 weeks</option><option value="31" selected>Next 30 days</option><option value="62">Next 2 months</option><option value="month">This month</option><option value="past7">Last 7 days + next 30</option><option value="all">Everything upcoming</option>' +
        '</select><button class="gc-btn filled sm" data-act="copysnap">' + icon('content_copy') + ' Copy snapshot</button></div>' +
        '<textarea class="gc-import-text gc-snapshot" readonly spellcheck="false"></textarea>' +
        '</div>' +
        // ics
        '<div class="gc-tabpanel" data-panel="ics" hidden>' +
        '<p class="gc-muted">Import an .ics export from Google Calendar, Outlook or Apple Calendar — it is previewed on the Paste tab first. Export gives you a file any calendar app can open.</p>' +
        '<div class="gc-ics-row"><label class="gc-btn tonal">' + icon('upload_file') + ' Choose .ics file<input type="file" accept=".ics,text/calendar" data-act="icsfile" hidden></label>' +
        '<button class="gc-btn outlined" data-act="icsexport">' + icon('download') + ' Export all events (.ics)</button></div>' +
        '</div>' +
        '<div class="gc-import-foot"><span class="gc-import-status gc-muted"></span><span class="gc-flex"></span>' +
        '<button class="gc-btn text" data-close>Cancel</button><button class="gc-btn filled" data-act="apply" disabled>Apply</button></div>' +
        '</div>';
    var box = openModal(html, { wide: true, label: 'Import and sync' });
    var ta = box.querySelector('.gc-import-text');
    var syncChk = box.querySelector('[data-act=sync]');
    var applyBtn = box.querySelector('[data-act=apply]');
    var timer = null;
    ta.value = importDraftText || '';

    function setTab(name) {
        box.querySelectorAll('.gc-tab').forEach(function(t) { t.classList.toggle('active', t.getAttribute('data-tab') === name); t.setAttribute('aria-selected', t.getAttribute('data-tab') === name ? 'true' : 'false'); });
        box.querySelectorAll('.gc-tabpanel').forEach(function(p) { p.hidden = p.getAttribute('data-panel') !== name; });
        box.querySelector('.gc-import-foot').classList.toggle('dim', name !== 'paste');
        if (name === 'export') refreshSnapshot();
        if (name === 'paste') setTimeout(function() { try { ta.focus(); } catch (e) {} }, 20);
    }
    box.querySelectorAll('.gc-tab').forEach(function(t) { t.addEventListener('click', function() { setTab(t.getAttribute('data-tab')); }); });

    function recompute() {
        importDraftText = ta.value;
        var text = ta.value;
        importIsIcs = /BEGIN:VCALENDAR/i.test(text);
        if (!text.trim()) { importPlan = null; renderPlan(); return; }
        try {
            importPlan = planImport(text, {
                events: state.events, calendars: state.calendars, settings: state.settings, today: getLocalDateString(),
                options: { syncAppointments: syncChk.checked }
            });
        } catch (e) {
            console.error('Import parse failed', e);
            importPlan = { items: [], counts: {}, foreign: {}, warnings: [{ line: null, msg: 'Could not read this text (' + (e && e.message ? e.message : 'parse error') + ') — nothing was changed' }] };
        }
        renderPlan();
    }

    function renderPlan() {
        var list = box.querySelector('.gc-import-list');
        var sum = box.querySelector('.gc-import-summary');
        if (!importPlan) {
            sum.innerHTML = '<div class="gc-import-empty">' + icon('auto_awesome') + '<div><b>Paste to preview.</b><br><span class="gc-muted">Nothing changes until you press Apply.</span></div></div>';
            list.innerHTML = '';
            updateApply();
            return;
        }
        var c = importPlan.counts;
        var chips = [];
        ['create', 'update', 'move', 'done', 'delete', 'calendar', 'skip', 'reject'].forEach(function(k) {
            if (c[k]) chips.push('<span class="gc-pill ' + KIND_META[k].cls + '">' + c[k] + ' ' + KIND_META[k].label.toLowerCase() + '</span>');
        });
        var foreign = Object.keys(importPlan.foreign || {}).map(function(app) { return importPlan.foreign[app] + ' ' + app + ' block' + (importPlan.foreign[app] === 1 ? '' : 's'); });
        sum.innerHTML = '<div class="gc-pill-row">' + (chips.join('') || '<span class="gc-muted">No calendar changes found</span>') + '</div>' +
            (importPlan.quickFallback ? '<div class="gc-import-note">' + icon('bolt') + ' No blocks found — read as quick-add text.</div>' : '') +
            (foreign.length ? '<div class="gc-import-note">' + icon('apps') + ' Skipped ' + escapeHtml(foreign.join(', ')) + ' — paste those in their own app.</div>' : '') +
            (importPlan.warnings || []).map(function(w) { return '<div class="gc-import-note warn">' + icon('warning') + (w.line ? 'Line ' + w.line + ': ' : '') + escapeHtml(w.msg) + '</div>'; }).join('');
        list.innerHTML = importPlan.items.map(function(it, i) {
            var meta = KIND_META[it.kind];
            var actionable = it.kind !== 'skip' && it.kind !== 'reject';
            return '<label class="gc-import-item k-' + meta.cls + (actionable ? '' : ' muted') + '">' +
                (actionable ? '<input type="checkbox" data-i="' + i + '"' + (it.checked ? ' checked' : '') + '>' : '<span class="gc-import-nochk"></span>') +
                '<span class="gc-pill ' + meta.cls + '">' + meta.label + '</span>' +
                '<span class="gc-import-main"><span class="gc-import-title">' + escapeHtml(it.label || '(No title)') + '</span>' +
                (it.when ? '<span class="gc-import-when">' + escapeHtml(it.when) + '</span>' : '') +
                (it.detail ? '<span class="gc-import-detail">' + escapeHtml(it.detail) + '</span>' : '') +
                (it.reason ? '<span class="gc-import-reason">' + escapeHtml(it.reason) + '</span>' : '') +
                (it.warnings && it.warnings.length ? '<span class="gc-import-warn">' + escapeHtml(it.warnings.join(' · ')) + '</span>' : '') +
                '</span></label>';
        }).join('');
        list.querySelectorAll('input[type=checkbox]').forEach(function(cb) {
            cb.addEventListener('change', function() { importPlan.items[+cb.getAttribute('data-i')].checked = cb.checked; updateApply(); });
        });
        updateApply();
    }

    function updateApply() {
        var n = importPlan ? importPlan.items.filter(function(it) { return it.checked && it.kind !== 'skip' && it.kind !== 'reject'; }).length : 0;
        applyBtn.disabled = !n;
        applyBtn.textContent = n ? 'Apply ' + n + ' change' + (n === 1 ? '' : 's') : 'Apply';
        var st = box.querySelector('.gc-import-status');
        var del = importPlan ? importPlan.items.filter(function(it) { return it.checked && it.destructive; }).length : 0;
        st.textContent = del ? del + ' deletion' + (del === 1 ? '' : 's') + ' — a checkpoint is saved first' : (n ? 'One undo reverts the whole import' : '');
    }

    ta.addEventListener('input', function() { clearTimeout(timer); timer = setTimeout(recompute, 220); });
    syncChk.addEventListener('change', recompute);
    box.querySelector('[data-act=clear]').addEventListener('click', function() { ta.value = ''; recompute(); ta.focus(); });
    box.querySelector('[data-act=clip]').addEventListener('click', function() {
        if (!navigator.clipboard || !navigator.clipboard.readText) { showToast('Clipboard access is blocked — long-press / Ctrl+V into the box'); ta.focus(); return; }
        navigator.clipboard.readText().then(function(t) { ta.value = t || ''; recompute(); }, function() { showToast('Clipboard access is blocked — paste into the box'); ta.focus(); });
    });
    applyBtn.addEventListener('click', function() {
        if (!importPlan) return;
        var dels = importPlan.items.filter(function(it) { return it.checked && it.destructive; }).length;
        var go = function() {
            var n = applyImportPlan(importPlan);
            if (n > 0) {
                importDraftText = '';
                importPlan = null;
                closeModal(box);
            }
        };
        if (dels >= 3) gcConfirm('This import deletes ' + dels + ' events. A checkpoint is saved first and Undo reverts everything.', { title: 'Apply deletions?', okLabel: 'Apply', danger: true }).then(function(ok) { if (ok) go(); });
        else go();
    });
    // guide
    box.querySelector('[data-act=copygrammar]').addEventListener('click', function() { copyText(CLAUDE_GRAMMAR_TEXT, 'Copied — paste into your Claude project instructions'); });
    box.querySelector('[data-act=tryexample]').addEventListener('click', function() {
        ta.value = IMPORT_EXAMPLE_TEXT.replace(/2026-11-0(\d)/g, function(_, d) { return addDays(today, (+d) - 2); }).replace(/2026-11-10/g, addDays(today, 8));
        setTab('paste'); recompute();
    });
    // export
    var rangeSel = box.querySelector('[data-act=range]');
    function snapshotRange() {
        var v = rangeSel.value;
        if (v === 'month') return [startOfMonth(currentDate), endOfMonth(currentDate)];
        if (v === 'past7') return [addDays(today, -7), addDays(today, 30)];
        if (v === 'all') return [today, addDays(today, 730)];
        return [today, addDays(today, (+v) - 1)];
    }
    function refreshSnapshot() { var r = snapshotRange(); box.querySelector('.gc-snapshot').value = buildClaudeSnapshot(r[0], r[1]); }
    rangeSel.addEventListener('change', refreshSnapshot);
    box.querySelector('[data-act=copysnap]').addEventListener('click', function() { refreshSnapshot(); copyText(box.querySelector('.gc-snapshot').value, 'Snapshot copied — paste it into Claude'); });
    // ics
    box.querySelector('[data-act=icsfile]').addEventListener('change', function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function() { ta.value = String(reader.result || ''); setTab('paste'); recompute(); };
        reader.readAsText(file);
        e.target.value = '';
    });
    box.querySelector('[data-act=icsexport]').addEventListener('click', function() {
        downloadFile('sully-calendar-' + today + '.ics', buildICS(state.events, state.calendars), 'text/calendar');
    });

    setTab(initialTab || 'paste');
    recompute();
}

// Drop a pasted block anywhere on the page (outside inputs) → open the import preview
document.addEventListener('paste', function(e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (modalStack.length) return;
    var text = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (!text || !text.trim()) return;
    e.preventDefault();
    openImportDialog('paste', text);
});
