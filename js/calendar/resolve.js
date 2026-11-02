// ============================================================================
// SULLY CALENDAR — resolve.js
// Turns parsed import ops into a reviewable PLAN against current state:
// re-paste safe dedup (ID → patient/chart+date+time → title+date+time),
// ID upserts (re-emit an event with its ID to reschedule/edit it), roadmap
// APPOINTMENT_MOVE / APPOINTMENT_DELETE semantics, EVENT_UPDATE / MOVE /
// DELETE / DONE verbs with recurring scopes, CALENDAR blocks, optional
// "sync appointments" mode, plus .ics import/export.
// Pure: reads ctx only, never mutates state. import-ui.js applies plans.
// ============================================================================

// [CAL-RESOLVE-START]

var RESOLVE_TIMING_FIELDS = ['startDate', 'endDate', 'startTime', 'endTime', 'allDay'];
var OCC_SCOPED_FIELDS = { title: 1, location: 1, notes: 1, color: 1, done: 1, startDate: 1, endDate: 1, startTime: 1, endTime: 1, allDay: 1 };

function matchCalendarByName(calendars, name) {
    var n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    var list = getValues(calendars).sort(function(a, b) { return (a.order - b.order) || String(a.name).localeCompare(String(b.name)); });
    var norm = function(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var nn = norm(n);
    return list.find(function(c) { return String(c.name).toLowerCase() === n; }) ||
        list.find(function(c) { return norm(c.name) === nn; }) ||
        list.find(function(c) { return nn && norm(c.name).indexOf(nn) === 0; }) ||
        list.find(function(c) { return nn.length >= 3 && norm(c.name).indexOf(nn) !== -1; }) || null;
}

function defaultCalendarForType(calendars, type) {
    var kind = { appointment: 'appointments', deadline: 'deadlines', task: 'tasks', event: 'general' }[type] || 'general';
    var list = getValues(calendars).sort(function(a, b) { return a.order - b.order; });
    return list.find(function(c) { return c.kind === kind; }) || (kind === 'appointments' ? null : (list.find(function(c) { return c.kind === 'general'; }) || list[0] || null));
}

function namesMatch(a, b) {
    var ca = canonPersonName(a), cb = canonPersonName(b);
    if (!ca || !cb) return false;
    if (ca === cb) return true;
    var ta = ca.split(' '), tb = cb.split(' ');
    var small = ta.length <= tb.length ? ta : tb, big = ta.length <= tb.length ? tb : ta;
    return small.every(function(t) { return big.indexOf(t) !== -1; });
}

function parseScope(v) {
    var s = String(v || '').trim().toLowerCase();
    if (!s) return null;
    if (/^(this|this event|only this|single|one|occurrence|this one)$/.test(s)) return 'this';
    if (/(following|future|forward|onward|and after|this and)/.test(s)) return 'following';
    if (/^(all|series|all events|every|whole series|entire series)$/.test(s)) return 'all';
    return null;
}

function hhmm(min) { return min === null || min === undefined ? null : minutesToHHMM(min); }

function fmtWhen(x, settings, today) {
    if (!x || !x.startDate) return '';
    var fmt = (settings && settings.timeFormat) || '12h';
    var out = fmtDateMed(x.startDate, today);
    if (x.allDay) {
        if (x.endDate && x.endDate !== x.startDate) out += ' – ' + fmtDateMed(x.endDate, today);
    } else {
        if (x.endDate && x.endDate !== x.startDate) out += ', ' + fmtTime(x.startTime, fmt) + ' – ' + fmtDateMed(x.endDate, today) + ', ' + fmtTime(x.endTime, fmt);
        else out += ', ' + fmtTimeRange(x.startTime, x.endTime, fmt);
    }
    return out;
}

// Instances of ev that START on date (multi-day all-day events: covering it), optional time
function instancesAt(ev, date, time) {
    var list = getEventInstances(ev, date, date).filter(function(i) {
        return i.startDate === date || (i.allDay && i.startDate <= date && i.endDate >= date);
    });
    if (time) list = list.filter(function(i) { return !i.allDay && i.startTime === time; });
    return list;
}

// crit: { id, match, patient, chart, date, time, type }
function findTargets(ctx, crit) {
    var evs = getValues(ctx.events);
    if (crit.id) {
        var id = String(crit.id).trim();
        evs = ctx.events[id] ? [ctx.events[id]] : evs.filter(function(e) { return e.extKey && e.extKey === id; });
    }
    var mt = crit.match ? normTitle(crit.match) : '';
    var ch = crit.chart ? normChart(crit.chart) : '';
    var out = [];
    evs.forEach(function(ev) {
        if (crit.type && ev.type !== crit.type) return;
        if (ch) {
            var evCh = normChart(ev.chartNumber);
            if (evCh) { if (evCh !== ch) return; }
            else if (!crit.patient || !namesMatch(ev.patientName, crit.patient)) return;
        } else if (crit.patient) {
            if (!namesMatch(ev.patientName, crit.patient)) return;
        }
        var exact = false;
        if (mt) {
            var t = normTitle(displayTitle(ev));
            var pn = normTitle(ev.patientName);
            exact = t === mt || pn === mt;
            if (!exact && t.indexOf(mt) === -1 && (!pn || pn.indexOf(mt) === -1)) return;
        }
        if (crit.date) {
            instancesAt(ev, crit.date, crit.time).forEach(function(i) { out.push({ ev: ev, inst: i, exact: exact }); });
        } else {
            var base = buildInstance(ev, null);
            if (base) { base.occ = null; base.key = ev.id; out.push({ ev: ev, inst: base, exact: exact }); }
        }
    });
    if (mt && out.some(function(o) { return o.exact; })) out = out.filter(function(o) { return o.exact; });
    return out;
}

function describeTargetList(list, settings, today) {
    return list.slice(0, 4).map(function(o) { return '“' + displayTitle(o.inst) + '” ' + fmtWhen(o.inst, settings, today); }).join('; ') + (list.length > 4 ? '; …' : '');
}

// New timing for an instance given partial new values (minutes for times)
// nv: { date, endDate, start, end, allDay (true|false|null), duration }
function computeTimingChanges(inst, nv, settings) {
    var newDate = nv.date || inst.startDate;
    var spanDays = Math.max(0, diffDays(inst.startDate, inst.endDate));
    var dur = inst.allDay ? null : instanceDurationMin(inst);
    if (nv.allDay === true) {
        return { allDay: true, startDate: newDate, endDate: nv.endDate && nv.endDate >= newDate ? nv.endDate : addDays(newDate, inst.allDay ? spanDays : 0), startTime: null, endTime: null };
    }
    var startMin = nv.start;
    if ((startMin === null || startMin === undefined) && nv.allDay === false && inst.allDay) startMin = 9 * 60;
    if (startMin !== null && startMin !== undefined) {
        var s = absOf(newDate, hhmm(startMin)), e;
        if (nv.end !== null && nv.end !== undefined) {
            e = absOf(nv.endDate && nv.endDate >= newDate ? nv.endDate : newDate, hhmm(nv.end));
            if (e < s) e += 1440;
        } else if (nv.duration) e = s + nv.duration;
        else e = s + (dur !== null ? dur : (settings.defaultDuration || 60));
        var sd = absToDateTime(s), ed = absToDateTime(e);
        return { allDay: false, startDate: sd.date, startTime: sd.time, endDate: ed.date, endTime: ed.time };
    }
    if (!inst.allDay && ((nv.end !== null && nv.end !== undefined) || nv.duration)) {
        var s2 = absOf(newDate, inst.startTime), e2;
        if (nv.end !== null && nv.end !== undefined) {
            e2 = absOf(nv.endDate && nv.endDate >= newDate ? nv.endDate : newDate, hhmm(nv.end));
            if (e2 < s2) e2 += 1440;
        } else e2 = s2 + nv.duration;
        var ed2 = absToDateTime(e2);
        return { startDate: newDate, endDate: ed2.date, endTime: ed2.time };
    }
    if (nv.date || nv.endDate) {
        if (inst.allDay) return { startDate: newDate, endDate: nv.endDate && nv.endDate >= newDate ? nv.endDate : addDays(newDate, spanDays) };
        var s3 = absOf(newDate, inst.startTime), e3 = absToDateTime(s3 + dur);
        return { startDate: newDate, endDate: e3.date, endTime: e3.time };
    }
    return {};
}

// Recurrence equality by meaning, not shape: weekly with no byDay repeats on the
// start date's weekday ("REPEAT: weekly" == stored byDay 'TH' for a Thursday
// series); monthlyMode only matters for monthly rules.
function recurrenceSig(r, startDate) {
    var n = normalizeRecurrence(r);
    if (!n) return 'none';
    var byDay = n.byDay;
    if (n.freq === 'weekly' && !byDay && isValidYMD(startDate)) byDay = DOW_CODES[weekdayOf(startDate)];
    return [n.freq, n.interval, n.freq === 'weekly' ? byDay : '', n.freq === 'monthly' ? n.monthlyMode : '', n.until || '', n.count || ''].join('|');
}
function sameRecurrence(a, aStart, b, bStart) {
    return recurrenceSig(a, aStart) === recurrenceSig(b, bStart || aStart);
}

function stripUnchanged(inst, changes) {
    var out = {};
    Object.keys(changes).forEach(function(k) {
        var a = changes[k], b = inst[k];
        if (k === 'recurrence') { if (!sameRecurrence(a, changes.startDate || inst.startDate, b, inst.startDate)) out[k] = a; return; }
        if (k === 'reminders') { if (stableSig(a || null) !== stableSig(b || null)) out[k] = a; return; }
        if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return;
        if (a !== b) out[k] = a;
    });
    return out;
}

function describeChanges(ch, inst, settings, today) {
    var parts = [];
    if (ch.startDate || ch.startTime || ch.endTime || ch.endDate || 'allDay' in ch) {
        var after = Object.assign({}, inst, ch);
        parts.push('→ ' + fmtWhen(after, settings, today));
    }
    if (ch.title) parts.push('title “' + ch.title + '”');
    if (ch.location !== undefined) parts.push('location “' + ch.location + '”');
    if (ch.notes !== undefined) parts.push('notes updated');
    if (ch.notesAppend) parts.push('+ notes');
    if (ch.procedure !== undefined) parts.push('procedure “' + firstLine(ch.procedure) + '”');
    if (ch.chair !== undefined) parts.push('chair ' + ch.chair);
    if (ch.color) parts.push('color ' + colorName(ch.color));
    if (ch.calendarRef) parts.push('calendar “' + ch.calendarRef + '”');
    if ('recurrence' in ch) parts.push(ch.recurrence ? describeRecurrence(ch.recurrence, ch.startDate || inst.startDate) : 'no repeat');
    if (ch.reminders) parts.push('reminders updated');
    if (ch.priority) parts.push(ch.priority + ' priority');
    if ('done' in ch) parts.push(ch.done ? 'mark done' : 'mark not done');
    if (ch.type) parts.push('type ' + ch.type);
    if (ch.patientName) parts.push('patient ' + ch.patientName);
    if (ch.chartNumber) parts.push('chart ' + ch.chartNumber);
    return parts.join(' · ');
}

// Fields of an EVENT_UPDATE op → { changes, timingNv, errors, warnings }
function updateFieldsToChanges(f, ctx, opts) {
    var today = ctx.today, warnings = [], errors = [];
    var ch = {};
    var title = f.NEW_TITLE || (opts.titleIsTarget ? '' : f.TITLE);
    if (title) ch.title = title.trim();
    if (f.LOCATION !== undefined) ch.location = f.LOCATION.trim();
    if (f.NOTES !== undefined) ch.notes = f.NOTES.trim();
    if (f.NOTES_APPEND) ch.notesAppend = f.NOTES_APPEND.trim();
    if (f.PATIENT && !opts.patientIsTarget) ch.patientName = f.PATIENT.trim();
    if (f.CHART && !opts.chartIsTarget) ch.chartNumber = f.CHART.trim();
    if (f.PROCEDURE !== undefined) ch.procedure = f.PROCEDURE.trim();
    if (f.CHAIR !== undefined) ch.chair = f.CHAIR.trim();
    if (f.CALENDAR) ch.calendarRef = f.CALENDAR.trim();
    if (f.COLOR) {
        var c = /^(none|default|calendar|clear)$/i.test(f.COLOR.trim()) ? '' : normalizeColorValue(f.COLOR);
        if (c === null) warnings.push('Unknown COLOR "' + f.COLOR + '"'); else ch.color = c || null;
    }
    if (f.PRIORITY) { var p = parsePriority(f.PRIORITY); if (p) ch.priority = p; else if (/^none$/i.test(f.PRIORITY)) ch.priority = null; else warnings.push('Unknown PRIORITY "' + f.PRIORITY + '"'); }
    if (f.STATUS) { var st = parseStatus(f.STATUS); if (st === null) warnings.push('Unknown STATUS "' + f.STATUS + '"'); else ch.done = st; }
    if (f.REMINDER) { var rm = parseReminders(f.REMINDER); if (rm === null) warnings.push('Could not read REMINDER "' + f.REMINDER + '"'); else ch.reminders = rm; }
    if (f.TYPE) { var ty = parseTypeValue(f.TYPE); if (ty) ch.type = ty; else warnings.push('Unknown TYPE "' + f.TYPE + '"'); }
    if (f.REPEAT) {
        var rp = parseRepeat(f.REPEAT, today);
        if (!rp) warnings.push('Could not read REPEAT "' + f.REPEAT + '"');
        else {
            if (rp.rec && f.UNTIL) { var u = findDateInText(f.UNTIL, today); if (u) rp.rec.until = u.date; }
            if (rp.rec && f.COUNT && +f.COUNT > 0) rp.rec.count = Math.min(999, +f.COUNT);
            ch._repeat = rp;
        }
    }
    var nv = { date: null, endDate: null, start: null, end: null, allDay: null, duration: null }, anyTiming = false;
    var src = opts.dateFields || ['DATE', 'TO'];
    src.forEach(function(k) {
        if (!f[k]) return;
        var v = parseDateTimeValue(f[k], today);
        if (v.date) { nv.date = v.date; anyTiming = true; }
        if (v.endDate) { nv.endDate = v.endDate; anyTiming = true; }
        if (v.start !== null) { nv.start = v.start; anyTiming = true; }
        if (v.end !== null) { nv.end = v.end; anyTiming = true; }
        if (v.allDay) { nv.allDay = true; anyTiming = true; }
        if (!v.date && v.start === null && !v.allDay) errors.push('Could not read ' + k + ' "' + f[k] + '"');
    });
    if (f.TIME) {
        var tv = parseDateTimeValue(f.TIME, today);
        if (tv.allDay) { nv.allDay = true; anyTiming = true; }
        if (tv.start !== null) { nv.start = tv.start; nv.end = tv.end; anyTiming = true; }
        else if (!tv.allDay) warnings.push('Could not read TIME "' + f.TIME + '"');
    }
    if (f.START) { var sv = parseDateTimeValue(f.START, today); if (sv.start !== null) { nv.start = sv.start; anyTiming = true; } if (sv.date && !nv.date) { nv.date = sv.date; anyTiming = true; } }
    if (f.END) { var ev = parseDateTimeValue(f.END, today); if (ev.start !== null) { nv.end = ev.start; anyTiming = true; } if (ev.date) { nv.endDate = ev.date; anyTiming = true; } }
    if (f.END_DATE) { var ed = parseDateTimeValue(f.END_DATE, today); if (ed.date) { nv.endDate = ed.date; anyTiming = true; } }
    if (f.ALL_DAY) { var ab = parseBool(f.ALL_DAY); if (ab !== null) { nv.allDay = ab; anyTiming = true; } }
    if (f.DURATION) { var du = parseDuration(f.DURATION); if (typeof du === 'number' && du > 0) { nv.duration = du; anyTiming = true; } else if (du === 'allday') { nv.allDay = true; anyTiming = true; } }
    return { changes: ch, nv: anyTiming ? nv : null, errors: errors, warnings: warnings };
}

// Split resolved changes into per-occurrence vs whole-series parts
function splitScopedChanges(changes, scope) {
    if (scope !== 'this') return { occ: changes, series: null };
    var occ = {}, series = {}, anySeries = false;
    Object.keys(changes).forEach(function(k) {
        if (OCC_SCOPED_FIELDS[k] || k === 'notesAppend') occ[k] = changes[k];
        else { series[k] = changes[k]; anySeries = true; }
    });
    return { occ: occ, series: anySeries ? series : null };
}

function mkItem(kind, o) {
    return Object.assign({ kind: kind, label: '', when: '', detail: '', checked: kind !== 'skip' && kind !== 'reject', destructive: false, warnings: [], reason: '', line: null }, o || {});
}

function specSignature(spec) {
    var time = spec.allDay ? 'allday' : spec.startTime;
    if (spec.type === 'appointment') {
        var who = normChart(spec.chartNumber) || canonPersonName(spec.patientName) || normTitle(spec.title);
        return 'A|' + who + '|' + spec.startDate + '|' + time;
    }
    return 'E|' + normTitle(spec.title) + '|' + spec.startDate + '|' + time;
}

function findDuplicateEvent(ctx, spec) {
    var evs = getValues(ctx.events);
    var i, ev;
    if (spec.extKey) {
        if (ctx.events[spec.extKey]) return { ev: ctx.events[spec.extKey], by: 'id' };
        for (i = 0; i < evs.length; i++) if (evs[i].extKey && evs[i].extKey === spec.extKey) return { ev: evs[i], by: 'id' };
    }
    for (i = 0; i < evs.length; i++) {
        ev = evs[i];
        if (ev.startDate !== spec.startDate) continue;
        if (spec.allDay ? !ev.allDay : (ev.allDay || ev.startTime !== spec.startTime)) continue;
        if (spec.type === 'appointment') {
            if (ev.type !== 'appointment') continue;
            var c1 = normChart(spec.chartNumber), c2 = normChart(ev.chartNumber);
            if (c1 && c2) { if (c1 === c2) return { ev: ev, by: 'patient' }; continue; }
            if (spec.patientName && ev.patientName && canonPersonName(spec.patientName) === canonPersonName(ev.patientName)) return { ev: ev, by: 'patient' };
            if (!spec.patientName && spec.title && normTitle(displayTitle(ev)) === normTitle(spec.title)) return { ev: ev, by: 'title' };
        } else if (normTitle(displayTitle(ev)) === normTitle(spec.title)) {
            return { ev: ev, by: 'title' };
        }
    }
    return null;
}

function explicitFlags(op) {
    var f = op.fields || {};
    if (op.quick !== null && op.quick !== undefined) return { end: true, status: !!op.checked, timing: true };
    return {
        type: !!f.TYPE, status: !!f.STATUS, reminder: !!f.REMINDER, repeat: !!f.REPEAT, calendar: !!f.CALENDAR,
        end: !!(f.END || f.DURATION || f.END_DATE || (f.TIME && /\d\s*(?:-|–|—|to|until)\s*\d|noon|midnight/i.test(f.TIME))),
        timing: true
    };
}

function diffForUpsert(ev, spec, flags, byId) {
    var ch = {};
    ['title', 'location', 'notes', 'patientName', 'chartNumber', 'procedure', 'chair'].forEach(function(k) {
        if (spec[k] && spec[k] !== (ev[k] || '')) ch[k] = spec[k];
    });
    if (flags.type && spec.type !== ev.type) ch.type = spec.type;
    if (spec.color && spec.color !== ev.color) ch.color = spec.color;
    if (spec.priority && spec.priority !== ev.priority) ch.priority = spec.priority;
    if (flags.status && !!spec.done !== !!ev.done) ch.done = !!spec.done;
    if (flags.reminder && stableSig(spec.reminders || {}) !== stableSig(ev.reminders || {})) ch.reminders = spec.reminders;
    if (flags.repeat && !sameRecurrence(spec.recurrence, spec.startDate || ev.startDate, ev.recurrence, ev.startDate)) ch.recurrence = spec.recurrence;
    if (byId) {
        RESOLVE_TIMING_FIELDS.forEach(function(k) { if ((spec[k] || null) !== (ev[k] || null) && !(k === 'allDay' && !!spec[k] === !!ev[k])) ch[k] = spec[k]; });
    } else if (flags.end && !spec.allDay && (spec.endTime !== ev.endTime || spec.endDate !== ev.endDate)) {
        ch.endTime = spec.endTime; ch.endDate = spec.endDate;
    }
    return ch;
}

// ---------------------------------------------------------------- main resolver
// parsed = parseImportText(...) ; ctx = { events, calendars, settings, today, options: { syncAppointments } }
function resolveImport(parsed, ctx) {
    var settings = ctx.settings || getDefaultSettings(), today = ctx.today;
    var options = ctx.options || {};
    var items = [];
    var seen = {};
    var matchedApptIds = {};
    var pastedApptDates = {};
    var newCalendars = {};

    function calInfo(ref, type) {
        if (ref) {
            var c = matchCalendarByName(ctx.calendars, ref);
            if (c) return { calendarId: c.id, calendarName: c.name, newCalendarName: null };
            var key = ref.trim().toLowerCase();
            if (!newCalendars[key]) newCalendars[key] = ref.trim();
            return { calendarId: null, calendarName: newCalendars[key] + ' (new)', newCalendarName: newCalendars[key] };
        }
        var d = defaultCalendarForType(ctx.calendars, type);
        return { calendarId: d ? d.id : null, calendarName: d ? d.name : (type === 'appointment' ? 'Clinic Appointments (new)' : 'Personal'), newCalendarName: null };
    }

    function resolveCreate(op) {
        var built = buildEventSpec(op, ctx);
        var spec = built.spec;
        var label = displayTitle(spec);
        if (built.errors.length) {
            items.push(mkItem('reject', { label: label || (op.quick || 'Untitled'), reason: built.errors.join(' · '), line: op.line }));
            return;
        }
        if (spec.type === 'appointment') pastedApptDates[spec.startDate] = true;
        var sig = spec.extKey ? 'I|' + spec.extKey : specSignature(spec);
        if (seen[sig]) {
            items.push(mkItem('skip', { label: label, when: fmtWhen(spec, settings, today), reason: 'Duplicate inside this paste', line: op.line }));
            return;
        }
        seen[sig] = true;
        var dup = findDuplicateEvent(ctx, spec);
        var flags = explicitFlags(op);
        if (dup) {
            if (dup.ev.type === 'appointment') matchedApptIds[dup.ev.id] = true;
            var ch = diffForUpsert(dup.ev, spec, flags, dup.by === 'id');
            if (flags.calendar && spec.calendarRef) {
                var ci = calInfo(spec.calendarRef, spec.type);
                if (ci.calendarId !== dup.ev.calendarId) { ch.calendarRef = spec.calendarRef; }
            }
            if (!Object.keys(ch).length) {
                items.push(mkItem('skip', { label: label, when: fmtWhen(spec, settings, today), reason: 'Already on your calendar', line: op.line }));
                return;
            }
            var base = buildInstance(dup.ev, null);
            items.push(mkItem('update', {
                label: displayTitle(dup.ev), when: fmtWhen(base, settings, today), detail: describeChanges(ch, base, settings, today),
                targetId: dup.ev.id, occ: null, scope: 'all', changes: ch, seriesChanges: null, warnings: built.warnings, line: op.line
            }));
            return;
        }
        var cinfo = calInfo(spec.calendarRef, spec.type);
        var detailBits = [cinfo.calendarName];
        if (spec.recurrence) detailBits.push(describeRecurrence(spec.recurrence, spec.startDate));
        if (spec.location) detailBits.push(spec.location);
        if (spec.type === 'appointment' && spec.chair) detailBits.push('Chair ' + spec.chair);
        items.push(mkItem('create', {
            label: label, when: fmtWhen(spec, settings, today), detail: detailBits.join(' · '),
            spec: spec, type: spec.type, calendarId: cinfo.calendarId, newCalendarName: cinfo.newCalendarName,
            exdates: op.exdates && op.exdates.length ? op.exdates : null,
            warnings: built.warnings, line: op.line
        }));
    }

    function pickOne(list, what, op, label) {
        if (!list.length) return { none: true };
        var uniqEv = {};
        list.forEach(function(o) { uniqEv[o.ev.id + '|' + (o.inst.occ || '')] = o; });
        var keys = Object.keys(uniqEv);
        if (keys.length > 1) {
            items.push(mkItem('reject', { label: label, reason: keys.length + ' events match ' + what + ' — add ID:, ON: or a TIME to pick one (' + describeTargetList(list, settings, today) + ')', line: op.line }));
            return { ambiguous: true };
        }
        return { hit: uniqEv[keys[0]] };
    }

    function targetLabel(f) {
        return f.MATCH || f.TITLE || f.PATIENT || (f.CHART ? 'chart ' + f.CHART : '') || f.ID || 'event';
    }

    function resolveVerb(op) {
        var f = op.fields || {};
        var v = op.verb;
        var label = targetLabel(f);

        if (v === 'CALENDAR') {
            var name = (f.TITLE || f.MATCH || '').trim();
            if (!name) { items.push(mkItem('reject', { label: 'Calendar', reason: 'CALENDAR needs NAME:', line: op.line })); return; }
            // exact (punctuation/case-insensitive) name only — fuzzy hits would edit the wrong calendar
            var normName = function(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
            var existing = getValues(ctx.calendars).find(function(c) { return normName(c.name) === normName(name); }) || null;
            var color = f.COLOR ? normalizeColorValue(f.COLOR) : null;
            var vis = f.VISIBLE ? parseBool(f.VISIBLE) : (f.HIDDEN ? !parseBool(f.HIDDEN) : null);
            if (existing) {
                var chg = {};
                if (f.NEW_NAME && f.NEW_NAME.trim() !== existing.name) chg.name = f.NEW_NAME.trim();
                if (color && color !== existing.color) chg.color = color;
                if (vis !== null && vis !== existing.visible) chg.visible = vis;
                if (f.NOTES !== undefined && f.NOTES.trim() !== existing.description) chg.description = f.NOTES.trim();
                if (!Object.keys(chg).length) { items.push(mkItem('skip', { label: 'Calendar “' + existing.name + '”', reason: 'Already exists', line: op.line })); return; }
                items.push(mkItem('calendar', { action: 'update', calId: existing.id, changes: chg, label: 'Calendar “' + existing.name + '”',
                    detail: Object.keys(chg).map(function(k) { return k === 'color' ? 'color ' + colorName(chg.color) : k === 'name' ? 'rename → ' + chg.name : k === 'visible' ? (chg.visible ? 'show' : 'hide') : 'description'; }).join(' · '), line: op.line }));
            } else {
                newCalendars[name.toLowerCase()] = name;
                items.push(mkItem('calendar', { action: 'create', name: name, color: color, visible: vis !== false, description: (f.NOTES || '').trim(),
                    label: 'New calendar “' + name + '”', detail: color ? colorName(color) : 'next free color', line: op.line }));
            }
            return;
        }

        if (v === 'APPOINTMENT_MOVE') {
            if (!f.CHART && !f.PATIENT) { items.push(mkItem('reject', { label: label, reason: 'APPOINTMENT_MOVE needs CHART: or PATIENT:', line: op.line })); return; }
            var fr = parseDateTimeValue(f.FROM || f.ON || f.DATE || '', today);
            var to = parseDateTimeValue(f.TO || f.NEW_DATE || '', today);
            if (!fr.date) { items.push(mkItem('reject', { label: label, reason: 'APPOINTMENT_MOVE needs FROM: <date> <time>', line: op.line })); return; }
            if (!to.date && to.start === null) { items.push(mkItem('reject', { label: label, reason: 'APPOINTMENT_MOVE needs TO: with a new date and/or time', line: op.line })); return; }
            var frTime = hhmm(fr.start);
            var crit = { patient: f.PATIENT, chart: f.CHART, date: fr.date, time: frTime, type: 'appointment' };
            var found = findTargets(ctx, crit);
            if (f.PROCEDURE && found.length > 1) {
                var pp = normTitle(f.PROCEDURE);
                var narrowed = found.filter(function(o) { return normTitle(o.ev.procedure).indexOf(pp) !== -1; });
                if (narrowed.length) found = narrowed;
            }
            var toDate = to.date || fr.date;
            if (!found.length) {
                var already = findTargets(ctx, { patient: f.PATIENT, chart: f.CHART, date: toDate, time: hhmm(to.start), type: 'appointment' });
                if (already.length) items.push(mkItem('skip', { label: f.PATIENT || ('chart ' + f.CHART), reason: 'Already at ' + fmtDateMed(toDate, today) + (to.start !== null ? ' ' + fmtTime(hhmm(to.start), settings.timeFormat) : ''), line: op.line }));
                else items.push(mkItem('reject', { label: f.PATIENT || ('chart ' + f.CHART), reason: 'No appointment found on ' + fmtDateMed(fr.date, today) + (frTime ? ' at ' + fmtTime(frTime, settings.timeFormat) : ''), line: op.line }));
                return;
            }
            var pk = pickOne(found, 'that patient/time', op, f.PATIENT || ('chart ' + f.CHART));
            if (!pk.hit) return;
            matchedApptIds[pk.hit.ev.id] = true;
            var mch = computeTimingChanges(pk.hit.inst, { date: toDate, start: to.start, end: to.end, endDate: null, allDay: to.allDay ? true : null, duration: null }, settings);
            mch = stripUnchanged(pk.hit.inst, mch);
            if (!Object.keys(mch).length) { items.push(mkItem('skip', { label: displayTitle(pk.hit.inst), reason: 'Already at that time', line: op.line })); return; }
            pushTargetItem('move', pk.hit, mch, pk.hit.inst.occ ? 'this' : 'all', op);
            return;
        }

        if (v === 'APPOINTMENT_DELETE') {
            if (!f.CHART && !f.PATIENT) { items.push(mkItem('reject', { label: label, reason: 'APPOINTMENT_DELETE needs CHART: or PATIENT:', line: op.line })); return; }
            var dv = parseDateTimeValue(f.DATE || f.ON || f.FROM || '', today);
            if (!dv.date) { items.push(mkItem('reject', { label: label, reason: 'APPOINTMENT_DELETE needs DATE:', line: op.line })); return; }
            var dt = f.TIME ? parseDateTimeValue(f.TIME, today).start : dv.start;
            var list = findTargets(ctx, { patient: f.PATIENT, chart: f.CHART, date: dv.date, time: hhmm(dt), type: 'appointment' });
            if (!list.length) { items.push(mkItem('skip', { label: f.PATIENT || ('chart ' + f.CHART), reason: 'Nothing to delete — no appointment on ' + fmtDateMed(dv.date, today) + (dt !== null ? ' at ' + fmtTime(hhmm(dt), settings.timeFormat) : ''), line: op.line })); return; }
            var pd = pickOne(list, 'that patient/date', op, f.PATIENT || ('chart ' + f.CHART));
            if (!pd.hit) return;
            matchedApptIds[pd.hit.ev.id] = true;
            pushTargetItem('delete', pd.hit, null, pd.hit.inst.occ ? 'this' : 'all', op);
            return;
        }

        // ---- generic event verbs: target by ID / MATCH / PATIENT / CHART (+ ON / FROM date)
        var hasTarget = f.ID || f.MATCH || f.PATIENT || f.CHART || f.TITLE;
        if (!hasTarget) { items.push(mkItem('reject', { label: v, reason: v + ' needs ID: or MATCH: to find the event', line: op.line })); return; }
        var titleIsTarget = !f.ID && !f.MATCH && !f.PATIENT && !f.CHART && !!f.TITLE;
        var onSrc = f.ON || f.FROM || ((v === 'EVENT_DELETE' || v === 'EVENT_DONE' || v === 'EVENT_UNDONE') ? (f.DATE || '') : '');
        var on = onSrc ? parseDateTimeValue(onSrc, today) : { date: null, start: null };
        if (onSrc && !on.date && on.start === null) { items.push(mkItem('reject', { label: label, reason: 'Could not read the date "' + onSrc + '"', line: op.line })); return; }
        var tcrit = {
            id: f.ID, match: f.MATCH || (titleIsTarget ? f.TITLE : ''),
            patient: (f.PATIENT && !f.MATCH && !f.ID) ? f.PATIENT : '', chart: (f.CHART && !f.ID) ? f.CHART : '',
            date: on.date, time: on.date ? hhmm(on.start) : null
        };
        if ((v === 'EVENT_DELETE' || v === 'EVENT_DONE' || v === 'EVENT_UNDONE') && f.TIME && on.date && !tcrit.time) tcrit.time = hhmm(parseDateTimeValue(f.TIME, today).start);
        var targets = findTargets(ctx, tcrit);
        if (!targets.length) {
            var why = 'No event matches “' + label + '”' + (on.date ? ' on ' + fmtDateMed(on.date, today) : '');
            if (v === 'EVENT_DELETE') items.push(mkItem('skip', { label: label, reason: why + ' — nothing to delete', line: op.line }));
            else items.push(mkItem('reject', { label: label, reason: why, line: op.line }));
            return;
        }
        var pick = pickOne(targets, '“' + label + '”', op, label);
        if (!pick.hit) return;
        var hit = pick.hit;
        var recurring = !!hit.ev.recurrence;
        var scope = parseScope(f.SCOPE) || (recurring && hit.inst.occ ? 'this' : 'all');
        if (!recurring) scope = 'all';
        if (scope !== 'all' && !hit.inst.occ) scope = 'all';
        if (hit.ev.type === 'appointment') matchedApptIds[hit.ev.id] = true;

        if (v === 'EVENT_DELETE') { pushTargetItem('delete', hit, null, scope, op); return; }
        if (v === 'EVENT_DONE' || v === 'EVENT_UNDONE') {
            var want = v === 'EVENT_DONE';
            if (!!hit.inst.done === want) { items.push(mkItem('skip', { label: displayTitle(hit.inst), reason: want ? 'Already done' : 'Already not done', line: op.line })); return; }
            pushTargetItem('done', hit, { done: want }, recurring && hit.inst.occ ? 'this' : 'all', op);
            return;
        }
        // EVENT_MOVE / EVENT_UPDATE
        var conv = updateFieldsToChanges(f, ctx, {
            titleIsTarget: titleIsTarget, patientIsTarget: !!tcrit.patient, chartIsTarget: !!tcrit.chart,
            dateFields: v === 'EVENT_MOVE' ? ['TO', 'DATE'] : ['DATE', 'TO']
        });
        if (conv.errors.length) { items.push(mkItem('reject', { label: label, reason: conv.errors.join(' · '), line: op.line })); return; }
        var changes = conv.changes;
        if (conv.nv) Object.assign(changes, computeTimingChanges(hit.inst, conv.nv, settings));
        if (changes._repeat) {
            var rp = changes._repeat;
            delete changes._repeat;
            changes.recurrence = rp.rec ? normalizeRecurrence(rp.rec) : null;
            if (rp.rec && (rp.anchor || rp.rec.byDay)) {
                var st = changes.startDate || hit.inst.startDate;
                var al = alignStartToRecurrence(st, rp.rec, rp.anchor);
                if (al !== st) Object.assign(changes, computeTimingChanges(Object.assign({}, hit.inst, changes), { date: al }, settings));
            }
            if (scope === 'this') scope = 'all';
        }
        if (changes.notesAppend) {
            var baseNotes = hit.inst.notes || '';
            changes.notes = (changes.notes !== undefined ? changes.notes : baseNotes);
            changes.notes = changes.notes ? changes.notes + '\n\n' + changes.notesAppend : changes.notesAppend;
            delete changes.notesAppend;
        }
        var cal = changes.calendarRef;
        delete changes.calendarRef;
        changes = stripUnchanged(hit.inst, changes);
        if ('recurrence' in changes && sameRecurrence(changes.recurrence, changes.startDate || hit.ev.startDate, hit.ev.recurrence, hit.ev.startDate)) delete changes.recurrence;
        if (cal) {
            var ci = matchCalendarByName(ctx.calendars, cal);
            if (!ci || ci.id !== hit.ev.calendarId) changes.calendarRef = cal;
        }
        if (v === 'EVENT_MOVE' && !conv.nv) { items.push(mkItem('reject', { label: label, reason: 'EVENT_MOVE needs TO: with a new date and/or time', line: op.line })); return; }
        if (!Object.keys(changes).length) { items.push(mkItem('skip', { label: displayTitle(hit.inst), reason: 'No changes — already like that', line: op.line })); return; }
        pushTargetItem(v === 'EVENT_MOVE' || (Object.keys(changes).every(function(k) { return RESOLVE_TIMING_FIELDS.indexOf(k) !== -1; })) ? 'move' : 'update', hit, changes, scope, op, conv.warnings);
    }

    function pushTargetItem(kind, hit, changes, scope, op, warns) {
        var split = changes ? splitScopedChanges(changes, scope) : { occ: null, series: null };
        var scopeTxt = hit.ev.recurrence ? (scope === 'this' ? ' (this occurrence)' : scope === 'following' ? ' (this and following)' : ' (whole series)') : '';
        var detail = kind === 'delete' ? 'Delete' + scopeTxt : kind === 'done' ? (changes.done ? 'Mark done' : 'Mark not done') + scopeTxt : describeChanges(changes, hit.inst, settings, today) + scopeTxt;
        items.push(mkItem(kind, {
            label: displayTitle(hit.inst), when: fmtWhen(hit.inst, settings, today), detail: detail,
            targetId: hit.ev.id, occ: hit.inst.occ || null, scope: scope,
            changes: split.occ, seriesChanges: split.series, destructive: kind === 'delete', warnings: warns || [], line: op.line
        }));
    }

    parsed.ops.forEach(function(op) {
        if (CREATE_VERBS[op.verb]) resolveCreate(op);
        else resolveVerb(op);
    });

    // Sync mode: appointments on pasted dates that the paste didn't mention are removed
    if (options.syncAppointments) {
        Object.keys(pastedApptDates).forEach(function(date) {
            getValues(ctx.events).forEach(function(ev) {
                if (ev.type !== 'appointment' || ev.recurrence || matchedApptIds[ev.id]) return;
                if (ev.startDate !== date) return;
                var stillPlanned = items.some(function(it) { return it.targetId === ev.id; });
                if (stillPlanned) return;
                var inst = buildInstance(ev, null);
                items.push(mkItem('delete', {
                    label: displayTitle(ev), when: fmtWhen(inst, settings, today), detail: 'Not in the pasted schedule for this day (sync mode)',
                    targetId: ev.id, occ: null, scope: 'all', changes: null, seriesChanges: null, destructive: true, sync: true
                }));
            });
        });
    }

    var counts = { create: 0, update: 0, move: 0, delete: 0, done: 0, calendar: 0, skip: 0, reject: 0 };
    items.forEach(function(it) { counts[it.kind] = (counts[it.kind] || 0) + 1; });
    return { items: items, counts: counts, foreign: parsed.foreign || {}, warnings: parsed.warnings || [], newCalendars: newCalendars };
}

// No recognizable blocks → treat short pastes as quick-add lines
function fallbackQuickOps(text, today) {
    var lines = cleanImportText(text).split('\n').map(function(l) { return l.replace(BULLET_RE, '$1').trim(); }).filter(Boolean);
    if (!lines.length || lines.length > 12) return [];
    var ops = [];
    lines.forEach(function(l, i) {
        if (lines.length > 1 && !findDateInText(l, today) && !scanTimes(l, true)) return;
        ops.push({ verb: 'EVENT', fields: {}, quick: l, checked: false, line: i + 1, stray: '' });
    });
    return ops;
}

// One call for the UI: parse → (fallback) → resolve
function planImport(text, ctx) {
    var parsed;
    if (/BEGIN:VCALENDAR/i.test(text)) parsed = icsToParsed(text, ctx.today);
    else parsed = parseImportText(text);
    if (!parsed.ops.length && !Object.keys(parsed.foreign).length) {
        var q = fallbackQuickOps(text, ctx.today);
        if (q.length) { parsed.ops = q; parsed.quickFallback = true; parsed.warnings = []; }
    }
    var plan = resolveImport(parsed, ctx);
    plan.quickFallback = !!parsed.quickFallback;
    plan.blockCount = parsed.blockCount || 0;
    return plan;
}

// ---------------------------------------------------------------- iCalendar (.ics)
function icsUnfold(text) {
    return String(text || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '');
}

function icsUnescape(s) {
    return String(s || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

// "20261105T090000Z" / "20261105T090000" / "20261105" → {date, time, allDay}
function icsParseDate(value, params) {
    var v = String(value || '').trim();
    var m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if (!m) return null;
    if (!m[4] || /VALUE=DATE(?!-)/i.test(params || '')) return { date: makeYMD(+m[1], +m[2], +m[3]), time: null, allDay: true };
    if (m[7]) {
        var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
        return { date: ymdOf(d), time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()), allDay: false };
    }
    return { date: makeYMD(+m[1], +m[2], +m[3]), time: m[4] + ':' + m[5], allDay: false };
}

function icsToParsed(text, today) {
    var lines = icsUnfold(text).split('\n');
    var ops = [], warnings = [], cur = null, depth = 0, n = 0;
    lines.forEach(function(line, idx) {
        var t = line.trim();
        if (/^BEGIN:VEVENT$/i.test(t)) { cur = { props: {}, exdates: [], line: idx + 1 }; depth = 1; return; }
        if (!cur) return;
        if (/^BEGIN:/i.test(t)) { depth++; return; }
        if (/^END:VEVENT$/i.test(t)) {
            n++;
            var p = cur.props;
            var ds = p.DTSTART ? icsParseDate(p.DTSTART.value, p.DTSTART.params) : null;
            if (!ds || p['RECURRENCE-ID']) { if (!ds) warnings.push({ line: cur.line, msg: 'Skipped an event with no start date' }); cur = null; return; }
            var de = p.DTEND ? icsParseDate(p.DTEND.value, p.DTEND.params) : null;
            var fields = {
                TITLE: icsUnescape(p.SUMMARY ? p.SUMMARY.value : '') || '(No title)',
                LOCATION: p.LOCATION ? icsUnescape(p.LOCATION.value) : undefined,
                NOTES: p.DESCRIPTION ? icsUnescape(p.DESCRIPTION.value) : undefined,
                ID: p.UID ? 'ics:' + p.UID.value.slice(0, 180) : undefined
            };
            if (ds.allDay) {
                fields.DATE = ds.date;
                var lastDay = de && de.date > ds.date ? addDays(de.date, -1) : ds.date;
                if (lastDay !== ds.date) fields.END_DATE = lastDay;
                fields.ALL_DAY = 'yes';
            } else {
                fields.DATE = ds.date + ' ' + ds.time;
                if (de) fields.END = de.date + ' ' + de.time;
                else if (p.DURATION) {
                    var dm = p.DURATION.value.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
                    if (dm) fields.DURATION = String((+(dm[1] || 0)) * 1440 + (+(dm[2] || 0)) * 60 + (+(dm[3] || 0)));
                }
            }
            if (p.RRULE) fields.REPEAT = 'RRULE:' + p.RRULE.value;
            Object.keys(fields).forEach(function(k) { if (fields[k] === undefined) delete fields[k]; });
            ops.push({ verb: 'EVENT', fields: fields, quick: null, line: cur.line, exdates: cur.exdates, stray: '' });
            cur = null;
            return;
        }
        if (depth > 1) { if (/^END:/i.test(t)) depth--; return; }
        var ci = line.indexOf(':');
        if (ci < 0) return;
        var head = line.slice(0, ci), val = line.slice(ci + 1);
        var name = head.split(';')[0].toUpperCase();
        var params = head.slice(name.length);
        if (name === 'EXDATE') { val.split(',').forEach(function(x) { var d = icsParseDate(x, params); if (d) cur.exdates.push(d.date); }); return; }
        cur.props[name] = { value: val, params: params };
    });
    return { ops: ops, foreign: {}, warnings: warnings, blockCount: n };
}

function icsEscape(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function icsFold(line) {
    if (line.length <= 74) return line;
    var out = [], i = 0;
    while (i < line.length) { out.push((i ? ' ' : '') + line.slice(i, i + (i ? 73 : 74))); i += i ? 73 : 74; }
    return out.join('\r\n');
}

function icsDate(ymd) { return ymd.replace(/-/g, ''); }
function icsDateTime(ymd, time) { return icsDate(ymd) + 'T' + time.replace(':', '') + '00'; }

function icsRRule(rec) {
    if (!rec) return null;
    var parts = ['FREQ=' + rec.freq.toUpperCase()];
    if (rec.interval > 1) parts.push('INTERVAL=' + rec.interval);
    return parts;
}

// Events → VCALENDAR text (floating local times; overrides as RECURRENCE-ID children)
function buildICS(events, calendars, nowStampIso) {
    var stamp = (nowStampIso || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sully//Sully Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Sully Calendar'];
    function timing(x) {
        if (x.allDay) return ['DTSTART;VALUE=DATE:' + icsDate(x.startDate), 'DTEND;VALUE=DATE:' + icsDate(addDays(x.endDate || x.startDate, 1))];
        return ['DTSTART:' + icsDateTime(x.startDate, x.startTime), 'DTEND:' + icsDateTime(x.endDate || x.startDate, x.endTime || x.startTime)];
    }
    getValues(events).forEach(function(ev) {
        if (!ev || !ev.startDate) return;
        var cal = calendars && calendars[ev.calendarId];
        var uid = ev.id + '@sully-calendar';
        var desc = ev.notes || '';
        if (ev.type === 'appointment') desc = ['Patient: ' + (ev.patientName || ''), ev.chartNumber ? 'Chart: ' + ev.chartNumber : '', ev.procedure ? 'Procedure: ' + ev.procedure : '', ev.chair ? 'Chair: ' + ev.chair : '', desc].filter(Boolean).join('\n');
        var block = ['BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + stamp].concat(timing(ev));
        block.push('SUMMARY:' + icsEscape(displayTitle(ev)));
        if (ev.location) block.push('LOCATION:' + icsEscape(ev.location));
        if (desc) block.push('DESCRIPTION:' + icsEscape(desc));
        if (cal) block.push('CATEGORIES:' + icsEscape(cal.name));
        if (ev.recurrence) {
            var r = ev.recurrence, parts = icsRRule(r);
            if (r.freq === 'weekly' && r.byDay) parts.push('BYDAY=' + r.byDay);
            if (r.freq === 'monthly') {
                var p = ymdParts(ev.startDate), wd = DOW_CODES[weekdayOf(ev.startDate)];
                if (r.monthlyMode === 'nth') parts.push('BYDAY=' + Math.ceil(p.d / 7) + wd);
                else if (r.monthlyMode === 'last') parts.push('BYDAY=-1' + wd);
                else parts.push('BYMONTHDAY=' + p.d);
            }
            if (r.until) parts.push('UNTIL=' + icsDate(r.until) + (ev.allDay ? '' : 'T235959'));
            else if (r.count) parts.push('COUNT=' + r.count);
            block.push('RRULE:' + parts.join(';'));
            var ex = ev.exceptions || {};
            Object.keys(ex).forEach(function(occ) {
                if (ex[occ] && ex[occ].deleted) block.push(ev.allDay ? 'EXDATE;VALUE=DATE:' + icsDate(occ) : 'EXDATE:' + icsDateTime(occ, ev.startTime));
            });
        }
        if ((ev.type === 'task' || ev.type === 'deadline') && ev.done) block.push('STATUS:COMPLETED');
        block.push('END:VEVENT');
        L = L.concat(block);
        if (ev.recurrence) {
            Object.keys(ev.exceptions || {}).forEach(function(occ) {
                var x = ev.exceptions[occ];
                if (!x || x.deleted) return;
                var inst = buildInstance(ev, occ);
                if (!inst) return;
                var o = ['BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + stamp,
                    ev.allDay ? 'RECURRENCE-ID;VALUE=DATE:' + icsDate(occ) : 'RECURRENCE-ID:' + icsDateTime(occ, ev.startTime)].concat(timing(inst));
                o.push('SUMMARY:' + icsEscape(displayTitle(inst)));
                if (inst.location) o.push('LOCATION:' + icsEscape(inst.location));
                if (inst.notes) o.push('DESCRIPTION:' + icsEscape(inst.notes));
                o.push('END:VEVENT');
                L = L.concat(o);
            });
        }
    });
    L.push('END:VCALENDAR');
    return L.map(icsFold).join('\r\n') + '\r\n';
}

// [CAL-RESOLVE-END]
