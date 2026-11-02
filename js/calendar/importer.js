// ============================================================================
// SULLY CALENDAR — importer.js
// Paste-import block parser. Accepts the Claude-webchat "SULLYCAL" grammar
// AND the Graduation Roadmap APPOINTMENTS / APPOINTMENT_MOVE /
// APPOINTMENT_DELETE blocks verbatim, so one axiUm extraction pastes into
// either app. Foreign blocks (roadmap patient records, stim calc, body comp
// pipe lines) are counted and skipped — never misread as events.
// Output: a list of ops { verb, fields, quick, line } consumed by resolve.js.
// DOM-free — tests/calendar extracts the sentinel section verbatim.
// ============================================================================

// [CAL-IMPORT-START]

var CREATE_VERBS = { APPOINTMENTS: 'appointment', EVENT: 'event', TASK: 'task', DEADLINE: 'deadline' };

var IMPORT_HEADER_ALIASES = {
    APPOINTMENTS: 'APPOINTMENTS', APPOINTMENT: 'APPOINTMENTS', APPTS: 'APPOINTMENTS', APPT: 'APPOINTMENTS',
    PATIENT_APPOINTMENTS: 'APPOINTMENTS', CLINIC_APPOINTMENTS: 'APPOINTMENTS', APPOINTMENT_ADD: 'APPOINTMENTS',
    APPOINTMENT_MOVE: 'APPOINTMENT_MOVE', APPOINTMENT_RESCHEDULE: 'APPOINTMENT_MOVE', APPT_MOVE: 'APPOINTMENT_MOVE', APPT_RESCHEDULE: 'APPOINTMENT_MOVE',
    APPOINTMENT_DELETE: 'APPOINTMENT_DELETE', APPOINTMENT_CANCEL: 'APPOINTMENT_DELETE', APPT_DELETE: 'APPOINTMENT_DELETE', APPT_CANCEL: 'APPOINTMENT_DELETE',
    APPOINTMENT_UPDATE: 'EVENT_UPDATE', APPOINTMENT_EDIT: 'EVENT_UPDATE', APPT_UPDATE: 'EVENT_UPDATE',
    APPOINTMENT_DONE: 'EVENT_DONE', APPT_DONE: 'EVENT_DONE',
    EVENT: 'EVENT', EVENTS: 'EVENT', NEW_EVENT: 'EVENT', EVENT_ADD: 'EVENT', ADD_EVENT: 'EVENT', CALENDAR_EVENT: 'EVENT', CALENDAR_EVENTS: 'EVENT',
    TASK: 'TASK', TASKS: 'TASK', TODO: 'TASK', TODOS: 'TASK', TO_DO: 'TASK', TO_DOS: 'TASK', TASK_ADD: 'TASK', ADD_TASK: 'TASK', NEW_TASK: 'TASK',
    DEADLINE: 'DEADLINE', DEADLINES: 'DEADLINE', DEADLINE_ADD: 'DEADLINE', ADD_DEADLINE: 'DEADLINE', NEW_DEADLINE: 'DEADLINE', DUE_DATES: 'DEADLINE',
    EVENT_UPDATE: 'EVENT_UPDATE', EVENT_EDIT: 'EVENT_UPDATE', UPDATE: 'EVENT_UPDATE', EDIT: 'EVENT_UPDATE', CHANGE: 'EVENT_UPDATE',
    TASK_UPDATE: 'EVENT_UPDATE', TASK_EDIT: 'EVENT_UPDATE', DEADLINE_UPDATE: 'EVENT_UPDATE', DEADLINE_EDIT: 'EVENT_UPDATE',
    EVENT_MOVE: 'EVENT_MOVE', MOVE: 'EVENT_MOVE', RESCHEDULE: 'EVENT_MOVE', EVENT_RESCHEDULE: 'EVENT_MOVE', TASK_MOVE: 'EVENT_MOVE', DEADLINE_MOVE: 'EVENT_MOVE',
    EVENT_DELETE: 'EVENT_DELETE', DELETE: 'EVENT_DELETE', CANCEL: 'EVENT_DELETE', REMOVE: 'EVENT_DELETE', EVENT_CANCEL: 'EVENT_DELETE',
    EVENT_REMOVE: 'EVENT_DELETE', TASK_DELETE: 'EVENT_DELETE', DEADLINE_DELETE: 'EVENT_DELETE',
    EVENT_DONE: 'EVENT_DONE', TASK_DONE: 'EVENT_DONE', DEADLINE_DONE: 'EVENT_DONE', MARK_DONE: 'EVENT_DONE', DONE: 'EVENT_DONE',
    COMPLETE: 'EVENT_DONE', COMPLETED: 'EVENT_DONE', TASK_COMPLETE: 'EVENT_DONE',
    EVENT_UNDONE: 'EVENT_UNDONE', TASK_UNDONE: 'EVENT_UNDONE', DEADLINE_UNDONE: 'EVENT_UNDONE', UNDONE: 'EVENT_UNDONE',
    MARK_UNDONE: 'EVENT_UNDONE', REOPEN: 'EVENT_UNDONE', TASK_REOPEN: 'EVENT_UNDONE',
    CALENDAR: 'CALENDAR', CALENDARS: 'CALENDAR', CALENDAR_ADD: 'CALENDAR', NEW_CALENDAR: 'CALENDAR', CALENDAR_UPDATE: 'CALENDAR', CALENDAR_EDIT: 'CALENDAR'
};

// Other suite apps' block headers — counted, skipped, and reported in the preview
var FOREIGN_HEADERS = {
    PATIENT_RECORD: 'Grad Roadmap', PATIENT_UPDATE: 'Grad Roadmap', REQUIREMENTS_MATCH: 'Grad Roadmap',
    SPS_DASHBOARD_UPDATE: 'Grad Roadmap', MISSING_NOTES: 'Grad Roadmap', TODO_LIST: 'Grad Roadmap',
    TODO_DONE: 'Grad Roadmap', TODO_DELETE: 'Grad Roadmap', NOTE_CLEARED: 'Grad Roadmap', PROCEDURE_DELETE: 'Grad Roadmap',
    PATIENT_ARCHIVE: 'Grad Roadmap', PATIENT_DELETE: 'Grad Roadmap', REQUIREMENTS_STATUS: 'Grad Roadmap',
    CLINICAL_BRIEF: 'Grad Roadmap', APPOINTMENTS_ATTENDED: 'Grad Roadmap', COMPLETED_TODAY: 'Grad Roadmap',
    STIM_DAY: 'Stim Calc'
};
var FOREIGN_PIPE_RE = /^(MEAL|WORKOUT|WEIGHIN|FOOD|MEAL_EDIT|MEAL_DELETE|WORKOUT_EDIT|WORKOUT_DELETE|WEIGHIN_EDIT|WEIGHIN_DELETE|CAFF|CAFFEINE|DOSE)\s*\|/i;
// Field keys that only roadmap patient records use — a headerless block with these is not ours
var FOREIGN_FIELD_HINTS = { MEDICAL_HX: 1, DENTAL_HX: 1, TX_PLAN: 1, MEDICATIONS: 1, ALLERGIES: 1, REQUIREMENTS: 1, LAST_VISIT: 1,
    RECALL_HISTORY: 1, ACTIVE_STATUS: 1, PRIORITY_NOTES: 1, TX_SUMMARY: 1, PHONE: 1, DOB: 1, MEDICAL_HX_APPEND: 1, HIGH_VALUE: 1 };

var FIELD_ALIASES = {
    TITLE: 'TITLE', NAME: 'TITLE', SUMMARY: 'TITLE', WHAT: 'TITLE', SUBJECT: 'TITLE', EVENT_TITLE: 'TITLE', EVENT_NAME: 'TITLE', LABEL: 'TITLE', HEADLINE: 'TITLE',
    TASK: 'TASK_T', TODO: 'TASK_T', TO_DO: 'TASK_T',
    EVENT: 'EVENT_T',
    DEADLINE: 'DEADLINE_T', ASSIGNMENT: 'DEADLINE_T',
    NEW_TITLE: 'NEW_TITLE', RENAME_TO: 'NEW_TITLE',
    DATE: 'DATE', DAY: 'DATE', WHEN: 'DATE', START_DATE: 'DATE', DATES: 'DATE',
    ON: 'ON', OCCURRENCE: 'ON', INSTANCE: 'ON',
    START: 'START', STARTS: 'START', BEGIN: 'START', BEGINS: 'START', START_TIME: 'START', STARTS_AT: 'START',
    END: 'END', ENDS: 'END', END_TIME: 'END', FINISH: 'END', ENDS_AT: 'END',
    END_DATE: 'END_DATE', THROUGH: 'END_DATE', THRU: 'END_DATE', LAST_DAY: 'END_DATE',
    TIME: 'TIME', AT: 'TIME', HOURS: 'TIME', TIMES: 'TIME', TIME_SLOT: 'TIME', SLOT: 'TIME',
    ALL_DAY: 'ALL_DAY', ALLDAY: 'ALL_DAY',
    DURATION: 'DURATION', LENGTH: 'DURATION', FOR: 'DURATION',
    DUE: 'DUE', DUE_DATE: 'DUE', BY: 'DUE', DUE_BY: 'DUE', DUE_AT: 'DUE',
    LOCATION: 'LOCATION', WHERE: 'LOCATION', PLACE: 'LOCATION', ROOM: 'LOCATION', ADDRESS: 'LOCATION', LOC: 'LOCATION', CLINIC: 'LOCATION', VENUE: 'LOCATION',
    NOTES: 'NOTES', NOTE: 'NOTES', DESCRIPTION: 'NOTES', DESC: 'NOTES', DETAILS: 'NOTES', INFO: 'NOTES', COMMENTS: 'NOTES', COMMENT: 'NOTES',
    NOTES_APPEND: 'NOTES_APPEND', APPEND_NOTES: 'NOTES_APPEND', ADD_NOTE: 'NOTES_APPEND', APPEND_NOTE: 'NOTES_APPEND',
    CALENDAR: 'CALENDAR', CATEGORY: 'CALENDAR', CAL: 'CALENDAR', LIST: 'CALENDAR', TAG: 'CALENDAR',
    COLOR: 'COLOR', COLOUR: 'COLOR',
    REPEAT: 'REPEAT', REPEATS: 'REPEAT', RECURRENCE: 'REPEAT', RECURRING: 'REPEAT', RRULE: 'REPEAT', EVERY: 'REPEAT', FREQUENCY: 'REPEAT',
    UNTIL: 'UNTIL', REPEAT_UNTIL: 'UNTIL', ENDS_ON: 'UNTIL',
    COUNT: 'COUNT', OCCURRENCES: 'COUNT',
    REMINDER: 'REMINDER', REMINDERS: 'REMINDER', ALERT: 'REMINDER', ALERTS: 'REMINDER', NOTIFY: 'REMINDER', NOTIFICATION: 'REMINDER', NOTIFICATIONS: 'REMINDER',
    PRIORITY: 'PRIORITY', PRI: 'PRIORITY', IMPORTANCE: 'PRIORITY',
    STATUS: 'STATUS', DONE: 'STATUS', COMPLETED: 'STATUS', COMPLETE: 'STATUS',
    ID: 'ID', KEY: 'ID', REF: 'ID', UID: 'ID', EVENT_ID: 'ID',
    TYPE: 'TYPE', KIND: 'TYPE',
    PATIENT: 'PATIENT', PT: 'PATIENT', PATIENT_NAME: 'PATIENT',
    CHART: 'CHART', MRN: 'CHART', CHART_NUMBER: 'CHART', CHART_NO: 'CHART', CHART_NUM: 'CHART',
    PROCEDURE: 'PROCEDURE', PROCEDURES: 'PROCEDURE', PROC: 'PROCEDURE', TX: 'PROCEDURE', TREATMENT: 'PROCEDURE',
    CHAIR: 'CHAIR', OP: 'CHAIR', OPERATORY: 'CHAIR', UNIT: 'CHAIR',
    MATCH: 'MATCH', FIND: 'MATCH', TARGET: 'MATCH', SEARCH: 'MATCH',
    FROM: 'FROM', OLD: 'FROM', WAS: 'FROM',
    TO: 'TO', NEW: 'TO', NOW: 'TO', NEW_TIME: 'TO', NEW_DATE: 'TO',
    SCOPE: 'SCOPE', APPLY_TO: 'SCOPE',
    NEW_NAME: 'NEW_NAME', RENAME: 'NEW_NAME',
    VISIBLE: 'VISIBLE', SHOW: 'VISIBLE', HIDDEN: 'HIDDEN'
};
// Fields whose repeats/continuations append instead of starting a new record
var APPEND_FIELDS = { NOTES: true, NOTES_APPEND: true, PROCEDURE: true };

function normKeyToken(s) {
    return String(s || '').trim().toUpperCase().replace(/[\s\-\/.]+/g, '_').replace(/[^A-Z0-9_]/g, '').replace(/^_+|_+$/g, '');
}

// "KEY: value" → { key, canon, value } for KNOWN keys only (times like "9:30" stay text)
function parseFieldLine(line) {
    var m = String(line).match(/^\s*(?:[-*•▪◦]\s+)?([A-Za-z][A-Za-z0-9 _\/.\-]{0,30}?)\s*:\s?(.*)$/);
    if (!m) return null;
    var key = normKeyToken(m[1]);
    var canon = FIELD_ALIASES[key];
    if (!canon) {
        if (FOREIGN_FIELD_HINTS[key]) return { key: key, canon: null, foreignHint: true, value: m[2].trim() };
        return null;
    }
    return { key: key, canon: canon, value: m[2].trim() };
}

// First line of a block → { verb, inline } | { foreign } | null
function detectHeader(line) {
    var raw = String(line || '').trim();
    if (!raw) return null;
    var stripped = raw.replace(/^[#*=>\s\[]+/, '').replace(/[\]=*#\s]+$/, '');
    var m = stripped.match(/^([A-Za-z][A-Za-z0-9 _\-]*?)\s*(?:\(\s*\d+\s*\))?\s*(?::\s*(.*))?$/);
    if (!m) return null;
    var tok = normKeyToken(m[1]);
    var inline = m[2] !== undefined ? m[2].trim() : '';
    if (FOREIGN_HEADERS[tok]) return { foreign: FOREIGN_HEADERS[tok], token: tok };
    if (/^STIM_/.test(tok)) return { foreign: 'Stim Calc', token: tok };
    var verb = IMPORT_HEADER_ALIASES[tok];
    if (!verb) return null;
    // "DONE: yes" / "CALENDAR: Clinic" are FIELDS, not headers — a key that is
    // also a field alias only acts as a header when it stands alone on its line.
    if (inline && FIELD_ALIASES[tok] && !CREATE_VERBS[verb]) return null;
    return { verb: verb, inline: inline, token: tok };
}

// Strip code fences, SYNTAX/banner lines, invisible chars; normalize newlines
function cleanImportText(text) {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .replace(/[​-‍﻿]/g, '')
        .replace(/ /g, ' ')
        .split('\n')
        .filter(function(l) {
            var t = l.trim();
            if (/^```/.test(t)) return false;
            if (/^SYNTAX\s*:/i.test(t)) return false;
            if (/^@[A-Z][A-Z_]*\s*$/i.test(t)) return false;
            return true;
        })
        .join('\n');
}

// Blocks are '---'-separated, but Claude often starts the next section with
// just a header line ("TASK: Call lab" after an APPOINTMENTS record). A header
// line mid-block therefore opens a new block when it is:
//   • a create verb with an inline title ("TASK: x", "EVENT: x") — unless the
//     block is an update/move/delete/done block, where only a preceding blank
//     line splits;
//   • a bare header line ("APPOINTMENTS", "EVENT_DELETE");
//   • any verb header right after a blank line ("DELETE: Gym").
// Other apps' blocks (Grad Roadmap / Stim Calc) are never split — their
// bodies may carry lines that look like our headers.
function splitImportBlocks(text) {
    var lines = cleanImportText(text).split('\n');
    var blocks = [], cur = [], curStart = 1;
    var prevBlank = false, curForeign = false, curVerb = null;
    var afterForeignHeader = false, pendingVerb = null;
    function flush(bySeparator) {
        if (cur.length) {
            var h0 = detectHeader(cur[0].text);
            var headerOnly = cur.length === 1 && !!h0 && !h0.inline;
            afterForeignHeader = !!bySeparator && headerOnly && !!h0.foreign;
            pendingVerb = bySeparator && headerOnly && h0.verb ? h0.verb : null;
            blocks.push({ lines: cur, line: curStart });
        }
        cur = [];
    }
    function startsNewBlock(l) {
        var h = detectHeader(l);
        if (!h) return false;
        if (h.foreign || !h.inline) return true;
        if (CREATE_VERBS[h.verb]) return prevBlank || !curVerb || !!CREATE_VERBS[curVerb];
        return prevBlank;
    }
    lines.forEach(function(l, i) {
        if (/^\s*(?:-{3,}|={3,}|_{3,}|\*{3,})\s*$/.test(l)) {
            flush(true);
            curStart = i + 2;
            prevBlank = false;
            return;
        }
        if (!l.trim()) {
            // a blank line inside a block is otherwise ignored (roadmap behavior)
            prevBlank = true;
            return;
        }
        if (cur.length && !curForeign && startsNewBlock(l)) flush(false);
        prevBlank = false;
        if (!cur.length) {
            curStart = i + 1;
            var h = detectHeader(l);
            curForeign = !!(h && h.foreign) || afterForeignHeader;
            curVerb = h && h.verb ? h.verb : pendingVerb;
            afterForeignHeader = false;
            pendingVerb = null;
        }
        var fl = parseFieldLine(l);
        if (fl && fl.foreignHint) curForeign = true;
        cur.push({ text: l, line: i + 1 });
    });
    flush(true);
    return blocks;
}

var BULLET_RE = /^\s*(?:[-*•▪◦]|\d{1,2}[.)]|\[[ xX]\])\s+(.*)$/;

// Body lines → records. Repeated non-append keys start a new record, so one
// block may carry several events (or several MATCH targets for a verb). When
// quickOK (create blocks), bullet / plain lines with no open field become
// quick-add records ("- Floss order fri 5pm").
function extractRecords(lines, quickOK) {
    var records = [];
    var cur = null, curField = null;
    function newRec(line) { cur = { fields: {}, quick: null, line: line, foreignHint: false }; records.push(cur); curField = null; }
    lines.forEach(function(L) {
        var text = L.text;
        var fl = parseFieldLine(text);
        if (fl && fl.foreignHint) {
            if (!cur || cur.quick !== null) newRec(L.line);
            cur.foreignHint = true;
            curField = null;
            return;
        }
        if (fl) {
            if (!cur || cur.quick !== null) newRec(L.line);
            var c = fl.canon;
            if (Object.prototype.hasOwnProperty.call(cur.fields, c)) {
                if (APPEND_FIELDS[c]) {
                    cur.fields[c] = cur.fields[c] ? cur.fields[c] + '\n' + fl.value : fl.value;
                    curField = c;
                    return;
                }
                newRec(L.line);
            }
            cur.fields[c] = fl.value;
            curField = c;
            return;
        }
        var b = text.match(BULLET_RE);
        var openAppend = curField && APPEND_FIELDS[curField];
        if (quickOK && !openAppend && (b || !curField)) {
            var q = (b ? b[1] : text).trim();
            if (q) {
                cur = { fields: {}, quick: q, line: L.line, foreignHint: false, checked: /^\s*\[[xX]\]/.test(text) };
                records.push(cur);
                curField = null;
            }
            return;
        }
        if (cur && curField) {
            var sep = (curField === 'NOTES' || curField === 'NOTES_APPEND' || curField === 'PROCEDURE') ? '\n' : ' ';
            cur.fields[curField] = cur.fields[curField] ? cur.fields[curField] + sep + text.trim() : text.trim();
            return;
        }
        if (!cur) newRec(L.line);
        cur.stray = (cur.stray ? cur.stray + '\n' : '') + text.trim();
    });
    return records;
}

function hasAnyField(f, keys) {
    for (var i = 0; i < keys.length; i++) if (f[keys[i]] !== undefined && String(f[keys[i]]).trim() !== '') return true;
    return false;
}

// Headerless record → verb (sticky list header first, then field shape)
function autoDetectVerb(rec, sticky) {
    var f = rec.fields;
    if (rec.quick !== null) return sticky || 'EVENT';
    var t = f.TYPE ? parseTypeValue(f.TYPE) : null;
    if (sticky === 'APPOINTMENTS') {
        if (f.PATIENT || f.CHART || !hasAnyField(f, ['TITLE', 'TASK_T', 'EVENT_T', 'DEADLINE_T'])) return 'APPOINTMENTS';
    } else if (sticky && CREATE_VERBS[sticky]) {
        if (f.PATIENT && !hasAnyField(f, ['TITLE', 'TASK_T', 'EVENT_T', 'DEADLINE_T'])) return 'APPOINTMENTS';
        return sticky;
    }
    if (t === 'appointment') return 'APPOINTMENTS';
    if (t === 'task') return 'TASK';
    if (t === 'deadline') return 'DEADLINE';
    if (t === 'event') return 'EVENT';
    if (f.PATIENT && hasAnyField(f, ['DATE', 'TIME', 'START', 'WHEN'])) return 'APPOINTMENTS';
    if (f.TASK_T) return 'TASK';
    if (f.DEADLINE_T) return 'DEADLINE';
    if (f.EVENT_T) return 'EVENT';
    if (f.DUE && hasAnyField(f, ['TITLE'])) return 'DEADLINE';
    if (hasAnyField(f, ['TITLE']) && hasAnyField(f, ['DATE', 'START', 'TIME', 'END_DATE'])) return 'EVENT';
    return null;
}

// Full paste → { ops, foreign: {app: count}, warnings: [{line, msg}], blockCount }
function parseImportText(text) {
    var blocks = splitImportBlocks(text);
    var ops = [], foreign = {}, warnings = [];
    var sticky = null, pending = null, skipNextFor = null;
    function addForeign(app, n) { foreign[app] = (foreign[app] || 0) + (n || 1); }
    blocks.forEach(function(block) {
        var lines = block.lines;
        var hdr = detectHeader(lines[0].text);
        if (hdr && hdr.foreign) {
            addForeign(hdr.foreign);
            sticky = null; pending = null;
            skipNextFor = lines.length === 1 ? hdr.foreign : null;
            return;
        }
        if (!hdr && lines.every(function(l) { return FOREIGN_PIPE_RE.test(l.text.trim()); })) {
            addForeign('Body Comp', lines.length);
            skipNextFor = null;
            return;
        }
        if (!hdr && skipNextFor) {
            // body of a header-only foreign block ("PATIENT_RECORD" / --- / fields)
            skipNextFor = null;
            return;
        }
        skipNextFor = null;
        var verb = null, body = lines;
        if (hdr) {
            body = lines.slice(1);
            if (!body.length && !hdr.inline) {
                pending = hdr.verb;
                if (CREATE_VERBS[hdr.verb]) sticky = hdr.verb;
                return;
            }
            verb = hdr.verb;
            if (CREATE_VERBS[verb]) sticky = verb;
            pending = null;
            if (hdr.inline) {
                // "TASK: Buy floss" → title; "EVENT_DELETE: Gym" → match
                body = [{ text: (CREATE_VERBS[verb] ? 'TITLE: ' : verb === 'CALENDAR' ? 'NAME: ' : 'MATCH: ') + hdr.inline, line: lines[0].line }].concat(body);
            }
        } else if (pending) {
            verb = pending;
            pending = null;
        }
        var effective = verb || sticky;
        var createish = !effective || !!CREATE_VERBS[effective];
        var recs = extractRecords(body, createish && !!effective);
        recs.forEach(function(rec) {
            if (rec.foreignHint && !hdr) { addForeign('Grad Roadmap'); return; }
            var v = verb;
            if (!v) v = autoDetectVerb(rec, sticky);
            else if (CREATE_VERBS[v] && rec.quick === null) {
                // explicit create header still yields to TYPE: and to patient-shaped records
                var t = rec.fields.TYPE ? parseTypeValue(rec.fields.TYPE) : null;
                if (t) v = t === 'appointment' ? 'APPOINTMENTS' : t.toUpperCase();
            }
            if (!v) {
                if (rec.stray && !Object.keys(rec.fields).length) warnings.push({ line: rec.line, msg: 'Ignored text: "' + rec.stray.split('\n')[0].slice(0, 60) + '"' });
                else warnings.push({ line: rec.line, msg: 'Could not tell what this block is — add a header like EVENT, TASK, DEADLINE or APPOINTMENTS' });
                return;
            }
            ops.push({ verb: v, fields: rec.fields, quick: rec.quick, checked: !!rec.checked, line: rec.line, stray: rec.stray || '' });
        });
    });
    return { ops: ops, foreign: foreign, warnings: warnings, blockCount: blocks.length };
}

// ---------------------------------------------------------------- spec building
function minutesToHHMM(min) { return minToHHMM(((min % 1440) + 1440) % 1440); }

function emptySpecFor(type) {
    return {
        type: type, title: '', calendarRef: null, color: null, allDay: false,
        startDate: null, endDate: null, startTime: null, endTime: null,
        location: '', notes: '', recurrence: null, reminders: null, done: false,
        priority: null, patientName: '', chartNumber: '', procedure: '', chair: '', extKey: null
    };
}

// Interpret a create op's fields → { spec, errors[], warnings[] }
// ctx: { today, settings }
function buildEventSpec(op, ctx) {
    var today = ctx.today, settings = ctx.settings || getDefaultSettings();
    var f = op.fields || {};
    var errors = [], warnings = [];
    var type = CREATE_VERBS[op.verb] || 'event';
    var spec = emptySpecFor(type);

    if (op.quick !== null && op.quick !== undefined) {
        var q = parseQuickAdd(op.quick, today, { type: op.verb === 'EVENT' ? null : type });
        spec.type = q.type || type;
        spec.title = q.title;
        spec.calendarRef = q.calendarRef;
        spec.location = q.location;
        spec.priority = q.priority;
        spec.done = !!op.checked;
        return finishTiming(spec, {
            date: q.date, endDate: q.endDate, start: q.start, end: q.end, allDay: q.allDay,
            duration: q.durationMin, repeat: q.repeat
        }, settings, errors, warnings, today, null);
    }

    var tv = f.TYPE ? parseTypeValue(f.TYPE) : null;
    if (f.TYPE && !tv) warnings.push('Unknown TYPE "' + f.TYPE + '" — using ' + type);
    if (tv) spec.type = tv;
    if (f.TASK_T && !tv && op.verb !== 'APPOINTMENTS') spec.type = 'task';
    if (f.DEADLINE_T && !tv && op.verb !== 'APPOINTMENTS') spec.type = 'deadline';

    // title (DEADLINE: may carry a date instead of a name)
    var title = f.TITLE || f.TASK_T || f.EVENT_T || '';
    var dueRaw = f.DUE || '';
    if (f.DEADLINE_T) {
        var dd = parseDateTimeValue(f.DEADLINE_T, today);
        var leftover = f.DEADLINE_T.replace(/[\d\/\-:,.]|\b(am|pm|noon|midnight)\b/gi, '').trim();
        if (dd.date && leftover.length < 4) { if (!dueRaw) dueRaw = f.DEADLINE_T; }
        else if (!title) title = f.DEADLINE_T;
    }
    spec.title = title.replace(/\s+/g, ' ').trim();
    spec.location = (f.LOCATION || '').trim();
    spec.notes = [f.NOTES, f.NOTES_APPEND].filter(function(x) { return x && String(x).trim(); }).join('\n').trim();
    spec.patientName = (f.PATIENT || '').trim();
    spec.chartNumber = (f.CHART || '').trim();
    spec.procedure = (f.PROCEDURE || '').trim();
    spec.chair = (f.CHAIR || '').trim();
    spec.calendarRef = f.CALENDAR ? f.CALENDAR.trim() : null;
    spec.extKey = f.ID ? String(f.ID).trim().slice(0, 200) : null;
    if (f.COLOR) {
        spec.color = normalizeColorValue(f.COLOR);
        if (!spec.color) warnings.push('Unknown COLOR "' + f.COLOR + '" — calendar color used');
    }
    if (f.PRIORITY) {
        spec.priority = parsePriority(f.PRIORITY);
        if (!spec.priority) warnings.push('Unknown PRIORITY "' + f.PRIORITY + '"');
    }
    if (f.STATUS) {
        var st = parseStatus(f.STATUS);
        if (st === null) warnings.push('Unknown STATUS "' + f.STATUS + '"');
        else spec.done = st;
    }
    if (f.REMINDER) {
        var rm = parseReminders(f.REMINDER);
        if (rm === null) warnings.push('Could not read REMINDER "' + f.REMINDER + '"');
        else spec.reminders = rm;
    }

    // ---- timing
    var t = { date: null, endDate: null, start: null, end: null, allDay: false, duration: null, repeat: null };
    var dateSrc = f.DATE || f.START || dueRaw;
    if (dateSrc) {
        var dv = parseDateTimeValue(dateSrc, today);
        t.date = dv.date; t.endDate = dv.endDate; t.start = dv.start; t.end = dv.end; t.allDay = dv.allDay;
        if (!dv.date && dv.start === null) errors.push('Could not read the date "' + dateSrc + '"');
    }
    if (f.START && f.DATE) {
        var sv = parseDateTimeValue(f.START, today);
        if (sv.start !== null) t.start = sv.start;
        if (sv.date && !t.date) t.date = sv.date;
    }
    if (f.TIME) {
        var tv2 = parseDateTimeValue(f.TIME, today);
        if (tv2.allDay) t.allDay = true;
        if (tv2.start !== null) { t.start = tv2.start; t.end = tv2.end; }
        else if (!tv2.allDay) warnings.push('Could not read TIME "' + f.TIME + '"');
        if (tv2.date && !t.date) t.date = tv2.date;
    }
    if (f.END) {
        var ev = parseDateTimeValue(f.END, today);
        if (ev.start !== null) t.end = ev.start;
        if (ev.date) t.endDate = ev.date;
    }
    if (f.END_DATE) {
        var ed = parseDateTimeValue(f.END_DATE, today);
        if (ed.date) t.endDate = ed.date; else warnings.push('Could not read END_DATE "' + f.END_DATE + '"');
        if (ed.start !== null && t.end === null) t.end = ed.start;
    }
    if (f.ALL_DAY) {
        var ab = parseBool(f.ALL_DAY);
        if (ab !== null) t.allDay = ab;
    }
    if (f.DURATION) {
        var du = parseDuration(f.DURATION);
        if (du === 'allday') t.allDay = true;
        else if (typeof du === 'number' && du > 0) t.duration = du;
        else warnings.push('Could not read DURATION "' + f.DURATION + '"');
    }
    if (f.REPEAT) {
        var rp = parseRepeat(f.REPEAT, today);
        if (!rp) warnings.push('Could not read REPEAT "' + f.REPEAT + '" — created as a single event');
        else t.repeat = rp;
    }
    if (t.repeat && t.repeat.rec) {
        if (f.UNTIL) {
            var uv = findDateInText(f.UNTIL, today);
            if (uv) t.repeat.rec.until = uv.date; else warnings.push('Could not read UNTIL "' + f.UNTIL + '"');
        }
        if (f.COUNT && +f.COUNT > 0) t.repeat.rec.count = Math.min(999, Math.round(+f.COUNT));
    }
    if (op.verb === 'APPOINTMENTS') {
        if (!spec.patientName && !spec.title) errors.push('Appointment needs PATIENT:');
        if (!t.date) errors.push('Appointment needs DATE:');
    } else {
        if (!spec.title) errors.push('Needs a TITLE:');
        if (!t.date) errors.push('Needs a DATE:' + (spec.type === 'deadline' || spec.type === 'task' ? ' (or DUE:)' : ''));
    }
    return finishTiming(spec, t, settings, errors, warnings, today, op.verb);
}

// Shared timing resolution for block + quick records
function finishTiming(spec, t, settings, errors, warnings, today, verb) {
    var date = t.date || null;
    if (!date && !errors.length) date = today;
    var timed = !t.allDay && t.start !== null && t.start !== undefined;
    if (spec.type === 'appointment' || verb === 'APPOINTMENTS') {
        spec.type = 'appointment';
        if (!timed && !t.allDay && date) warnings.push('No TIME — added as an all-day appointment');
    }
    spec.startDate = date;
    if (!timed) {
        spec.allDay = true;
        spec.endDate = t.endDate && date && t.endDate >= date ? t.endDate : date;
        if (t.duration && t.duration >= 1440 && date) spec.endDate = addDays(date, Math.ceil(t.duration / 1440) - 1);
    } else {
        spec.allDay = false;
        spec.startTime = minutesToHHMM(t.start);
        var startAbs = date ? absOf(date, spec.startTime) : 0;
        var endAbs;
        if (t.end !== null && t.end !== undefined) {
            var endDate = t.endDate && t.endDate >= date ? t.endDate : date;
            endAbs = absOf(endDate, minutesToHHMM(t.end));
            if (endAbs < startAbs) endAbs += 1440; // overnight: "10pm-2am"
        } else if (t.duration) {
            endAbs = startAbs + t.duration;
        } else if (spec.type === 'task' || spec.type === 'deadline') {
            endAbs = startAbs; // point in time
        } else {
            endAbs = startAbs + (spec.type === 'appointment' ? (settings.apptDuration || 180) : (settings.defaultDuration || 60));
        }
        if (date) {
            var e = absToDateTime(endAbs);
            spec.endDate = e.date;
            spec.endTime = e.time;
        }
    }
    if (t.repeat && t.repeat.rec && date) {
        var rec = t.repeat.rec;
        var aligned = alignStartToRecurrence(date, rec, t.repeat.anchor);
        if (aligned !== date) {
            var shift = diffDays(date, aligned);
            spec.startDate = aligned;
            spec.endDate = addDays(spec.endDate, shift);
        }
        if (t.repeat.forSpan && !rec.until && !rec.count) rec.until = untilFromSpan(spec.startDate, t.repeat.forSpan);
        if (rec.until && rec.until < spec.startDate) {
            warnings.push('Repeat ends before it starts — created as a single event');
            spec.recurrence = null;
        } else {
            spec.recurrence = normalizeRecurrence(rec);
        }
    }
    if (spec.reminders === null) {
        var def = spec.allDay ? settings.defaultAllDayReminder : settings.defaultReminder;
        spec.reminders = (def !== undefined && def !== null && def >= 0) ? normalizeReminders([def]) : {};
    }
    return { spec: spec, errors: errors, warnings: warnings };
}

// [CAL-IMPORT-END]
