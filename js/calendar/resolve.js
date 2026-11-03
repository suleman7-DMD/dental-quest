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

// ---------------------------------------------------------------- fuzzy targeting
// Voice → Claude → paste never carries IDs. An existing item is found by any mix
// of ON date (or range), AT time, MATCH title words, PATIENT, CHART and a type
// preference (APPT_/TASK_/DEADLINE_ headers). Candidates are scored; a unique
// winner is picked, ties are reported instead of guessed.
var MATCH_STOP_WORDS = {};
('a an the my our your his her their me i we us with w for at on of to and or in into from by this that these those is it its be up about have has ' +
    'existing current old same just please one ones thing things stuff item items entry entries ' +
    'apt apts appt appts appointment appointments event events task tasks todo todos deadline deadlines reminder reminders ' +
    'calendar schedule scheduled today tomorrow tonight yesterday am pm noon ' +
    'monday tuesday wednesday thursday friday saturday sunday mon tue tues wed thu thur thurs fri ' +
    'january february march april june july august september october november december jan feb apr jun jul aug sep sept oct nov dec')
    .split(' ').forEach(function(w) { MATCH_STOP_WORDS[w] = 1; });
var MATCH_ABBREV = { dr: 'doctor', doc: 'doctor', drs: 'doctor', mtg: 'meeting', mtgs: 'meeting', hw: 'homework', bday: 'birthday', prof: 'professor', tx: 'treatment', appt: 'appointment' };

function stemWord(w) {
    w = MATCH_ABBREV[w] || w;
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
    if (w.length > 5 && /(ing|ist)$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /(ed|al)$/.test(w)) return w.slice(0, -2);
    return w;
}

// Significant, stemmed words of a phrase ("my 10am Dentist appt" → ["dent"])
function matchWords(text) {
    var out = [];
    String(text || '').toLowerCase().replace(/['’]s\b/g, '').split(/[^a-z0-9]+/).forEach(function(w) {
        if (!w || MATCH_STOP_WORDS[w] || /^\d{1,2}(?:am|pm|a|p)$/.test(w)) return;
        if (w.length === 1 && !/\d/.test(w)) return;
        var st = stemWord(w);
        if (out.indexOf(st) === -1) out.push(st);
    });
    return out;
}

function wordsMatch(a, b) {
    if (a === b) return true;
    var sh = a.length <= b.length ? a : b, lg = a.length <= b.length ? b : a;
    return sh.length >= 3 && lg.indexOf(sh) === 0;
}

// Share of query words found in text (0..1), null when there are no query words
function wordFit(qWords, text) {
    if (!qWords || !qWords.length) return null;
    var hay = matchWords(text);
    var hit = 0;
    qWords.forEach(function(q) { if (hay.some(function(h) { return wordsMatch(q, h); })) hit++; });
    return hit / qWords.length;
}

function instHaystack(inst) {
    return [inst.title, inst.patientName, inst.procedure, inst.location, displayTitle(inst)].join(' ');
}

function editDistance(a, b) {
    if (a === b) return 0;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
        cur = [i];
        for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        prev = cur;
    }
    return prev[b.length];
}

// Voice-tolerant name match: every spoken name token matches one stored token
// (exact, or 1 typo when either is 4+ letters, 2 at 8+) — "Jon Smyth" finds "John Smith".
function patientFits(name, inst) {
    var q = canonPersonName(name).split(' ').filter(Boolean);
    if (!q.length) return false;
    var stored = inst.patientName ? canonPersonName(inst.patientName).split(' ') : matchWords(instHaystack(inst));
    stored = stored.filter(Boolean);
    if (!stored.length) return false;
    return q.every(function(t) {
        return stored.some(function(s) {
            if (s === t || (!inst.patientName && wordsMatch(stemWord(t), s))) return true;
            var mx = Math.max(t.length, s.length);
            var lim = mx >= 8 ? 2 : mx >= 4 ? 1 : 0;
            return lim > 0 && editDistance(t, s) <= lim;
        });
    });
}

// How well a spoken time fits an instance: exact start, inside its span, or ≤60 min off
function timeFit(inst, min) {
    if (inst.allDay) return null;
    var s = instanceStartAbs(inst), e = instanceEndAbs(inst);
    var t = absOf(inst.startDate, hhmm(min));
    if (t === s) return { score: 8, how: 'exact', diff: 0 };
    if (t > s && t < e) return { score: 5, how: 'during', diff: t - s };
    var d = Math.abs(t - s);
    if (d <= 60) return { score: 4 - d / 20, how: 'near', diff: s - t };
    return null;
}

// Time window ("AT: 1:00 PM - 5:00 PM" = everything STARTING in the afternoon); an
// item starting exactly at the window start wins ties ("FROM: 9 AM - 12 PM").
function rangeFit(inst, a, b) {
    if (inst.allDay) return null;
    var s = instanceStartAbs(inst), base = absOf(inst.startDate, null);
    var lo = base + a, hi = base + (b >= 1439 ? 1440 : b);
    if (hi <= lo) hi += 1440;
    if (s < lo || s >= hi) return null;
    return { score: s === lo ? 8 : 6, how: s === lo ? 'exact' : 'range', diff: s - lo };
}

function isUpcomingTarget(ev, inst, today) {
    if (ev.recurrence) return !ev.recurrence.until || ev.recurrence.until >= today;
    return (inst.endDate || inst.startDate) >= today;
}

// crit: { id, words[], exactText, patient, chart, dates[]|null, time (min)|null, typePref, procWords[] }
// opts: { all } → { list: [hit], warnings[], ambiguous: [cand]|null, uncertain, pickedNext, idMiss }
function locateTargets(ctx, crit, opts) {
    opts = opts || {};
    var today = ctx.today, settings = ctx.settings || {};
    var evs = getValues(ctx.events), idHit = false, idMiss = false;
    var timeGiven = crit.time !== null && crit.time !== undefined;
    var res = { list: [], warnings: [], ambiguous: null, uncertain: false, pickedNext: false, idMiss: false };
    if (crit.id) {
        var byId = ctx.events[crit.id] ? [ctx.events[crit.id]] : evs.filter(function(e) { return e.extKey && e.extKey === crit.id; });
        if (byId.length) { evs = byId; idHit = true; }
        else {
            idMiss = res.idMiss = true;
            if (!crit.words.length && !crit.patient && !crit.chart && !crit.dates) return res;
            res.warnings.push('ID ' + crit.id + ' not found — matched by the other fields');
        }
    }
    var named = idHit || !!crit.patient || !!crit.chart;
    var dateSet = null, lo = null, hi = null;
    if (crit.dates && crit.dates.length) {
        dateSet = {};
        crit.dates.forEach(function(d) { dateSet[d] = 1; if (!lo || d < lo) lo = d; if (!hi || d > hi) hi = d; });
    }
    var exactNorm = crit.exactText ? normTitle(crit.exactText) : '';
    var cands = [];
    evs.forEach(function(ev) {
        var insts;
        if (dateSet) {
            insts = getEventInstances(ev, lo, hi).filter(function(i) {
                if (dateSet[i.startDate]) return true;
                if (!i.allDay) return false;
                return Object.keys(dateSet).some(function(d) { return i.startDate <= d && i.endDate >= d; });
            });
        } else {
            var base = buildInstance(ev, null);
            if (!base) return;
            base.occ = null; base.key = ev.id;
            insts = [base];
        }
        insts.forEach(function(inst) {
            var c = { ev: ev, inst: inst, score: idHit ? 100 : 0, titleFrac: null, wordsMiss: false, timeHow: null, timeDiff: 0, timeMiss: false, typeOk: true, exact: false };
            if (crit.chart) {
                var ch = normChart(crit.chart), evCh = normChart(inst.chartNumber);
                if (evCh) { if (evCh !== ch) return; c.score += 20; }
                else if (!crit.patient || !patientFits(crit.patient, inst)) return;
            }
            if (crit.patient) { if (!patientFits(crit.patient, inst)) return; c.score += 15; }
            if (timeGiven) {
                var tf = crit.timeEnd !== null && crit.timeEnd !== undefined ? rangeFit(inst, crit.time, crit.timeEnd) : timeFit(inst, crit.time);
                if (tf) { c.score += tf.score; c.timeHow = tf.how; c.timeDiff = tf.diff; } else c.timeMiss = true;
            }
            if (crit.typePref) { if (inst.type === crit.typePref) c.score += 3; else c.typeOk = false; }
            if (crit.words.length) {
                var frac = wordFit(crit.words, instHaystack(inst));
                if (exactNorm && [displayTitle(inst), inst.title, inst.patientName].some(function(x) { return x && normTitle(x) === exactNorm; })) { c.exact = true; c.score += 5; }
                if (frac) { c.titleFrac = frac; c.score += 10 * frac; }
                else {
                    // words that miss only survive when the slot + type (or a name) pins the item
                    var slotPinned = dateSet && (c.timeHow === 'exact' || c.timeHow === 'during' || c.timeHow === 'range') && crit.typePref && c.typeOk;
                    if (!named && !slotPinned) return;
                    c.wordsMiss = true;
                }
            }
            if (crit.procWords && crit.procWords.length) c.score += 2 * (wordFit(crit.procWords, inst.procedure) || 0);
            if (!dateSet) c.upcoming = isUpcomingTarget(ev, inst, today);
            cands.push(c);
        });
    });

    var hits = cands.filter(function(c) { return !c.timeMiss; });
    var timeLoose = false;
    if (!hits.length && timeGiven && !opts.all && (named || crit.words.length)) {
        hits = cands.filter(function(c) { return !c.wordsMiss; });
        timeLoose = hits.length > 0;
    }
    if (crit.typePref && hits.length) {
        var pref = hits.filter(function(c) { return c.typeOk; });
        if (pref.length || opts.all) hits = pref;
        else if (!named && !crit.words.length && !(timeGiven && hits.some(function(c) { return c.timeHow === 'exact' || c.timeHow === 'during' || c.timeHow === 'range'; }))) hits = [];
    }
    if (!hits.length) return res;

    if (opts.all) {
        res.list = hits.filter(function(c) {
            return !c.wordsMiss && (!timeGiven || c.timeHow === 'exact' || c.timeHow === 'during' || c.timeHow === 'range') && (c.titleFrac === null || c.titleFrac === 1);
        });
        res.list.sort(function(a, b) { return instanceStartAbs(a.inst) - instanceStartAbs(b.inst); });
        if (!res.list.length) res.ambiguous = hits;
        return res;
    }

    hits.sort(function(a, b) { return (b.score - a.score) || (instanceStartAbs(a.inst) - instanceStartAbs(b.inst)); });
    var top = hits[0];
    var tied = hits.filter(function(c) { return top.score - c.score < 0.01; });
    if (tied.length > 1 && !dateSet) {
        var up = tied.filter(function(c) { return c.upcoming; });
        if (up.length) {
            up.sort(function(a, b) { return instanceStartAbs(a.inst) - instanceStartAbs(b.inst); });
            if (up.length > 1) {
                res.warnings.push(tied.length + ' items match — picked the next one (' + fmtWhen(up[0].inst, settings, today) + '). Add ON: <date> to pick another');
                res.pickedNext = true;
            }
            tied = [up[0]];
        }
    }
    if (tied.length > 1) { res.ambiguous = tied; return res; }
    var hit = tied[0];
    var fmt = settings.timeFormat;
    if (timeLoose) res.warnings.push('Nothing at ' + fmtTime(hhmm(crit.time), fmt) + ' — matched “' + displayTitle(hit.inst) + '” at ' + (hit.inst.allDay ? 'all day' : fmtTime(hit.inst.startTime, fmt)) + ' instead');
    else if (hit.timeHow === 'near') res.warnings.push('Starts at ' + fmtTime(hit.inst.startTime, fmt) + ', not ' + fmtTime(hhmm(crit.time), fmt));
    if (!hit.typeOk) {
        res.warnings.push('This is ' + (hit.inst.type === 'appointment' || hit.inst.type === 'event' ? 'an ' : 'a ') + hit.inst.type + ', not ' + (crit.typePref === 'appointment' ? 'an ' : 'a ') + crit.typePref);
        if (!named && !crit.words.length) res.uncertain = true;
    }
    if (hit.wordsMiss) res.warnings.push('Its title does not mention “' + crit.exactText + '” — matched by ' + (named ? 'name' : 'date, time and type'));
    res.list = [hit];
    return res;
}

// "Thu, Nov 5 has: 9 – 12pm Jane Doe — Crown prep (appointment); 6 – 8pm Study group (event)"
function dayDigest(ctx, date) {
    var settings = ctx.settings || {}, list = [];
    getValues(ctx.events).forEach(function(ev) { instancesAt(ev, date, null).forEach(function(i) { list.push(i); }); });
    if (!list.length) return fmtDateMed(date, ctx.today) + ' has nothing on your calendar';
    list.sort(function(a, b) { return (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || String(a.startTime).localeCompare(String(b.startTime)); });
    return fmtDateMed(date, ctx.today) + ' has: ' + list.slice(0, 8).map(function(i) {
        return (i.allDay ? 'all day' : fmtTimeRange(i.startTime, i.endTime, settings.timeFormat)) + ' ' + displayTitle(i) + ' (' + i.type + ')';
    }).join('; ') + (list.length > 8 ? '; …' : '');
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
    var title = f.NEW_TITLE || f.NEW_NAME || (opts.titleIsTarget ? '' : f.TITLE);
    if (title) ch.title = title.trim();
    if (f.LOCATION !== undefined) ch.location = f.LOCATION.trim();
    if (f.NOTES !== undefined) ch.notes = f.NOTES.trim();
    if (f.NOTES_APPEND) ch.notesAppend = f.NOTES_APPEND.trim();
    if (f.NEW_PATIENT) ch.patientName = f.NEW_PATIENT.trim();
    else if (f.PATIENT && !opts.patientIsTarget) ch.patientName = f.PATIENT.trim();
    if (f.NEW_CHART) ch.chartNumber = f.NEW_CHART.trim();
    else if (f.CHART && !opts.chartIsTarget) ch.chartNumber = f.CHART.trim();
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
    var typeSrc = f.NEW_TYPE || (opts.typeIsTarget ? '' : f.TYPE);
    if (typeSrc) { var ty = parseTypeValue(typeSrc); if (ty) ch.type = ty; else warnings.push('Unknown TYPE "' + typeSrc + '"'); }
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
    if (f.TIME && opts.useTime !== false) {
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
        end: !!(f.END || f.DURATION || f.END_DATE || ((f.TIME || f.AT) && /\d\s*(?:-|–|—|to|until)\s*\d|noon|midnight/i.test(f.TIME || f.AT))),
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

    function targetLabel(f) {
        return f.MATCH || f.TITLE || f.TASK_T || f.EVENT_T || f.DEADLINE_T || f.PATIENT || (f.CHART ? 'chart ' + f.CHART : '') || f.ID || '';
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

        // ---- change verbs. The existing item is found WITHOUT an ID by any mix of
        // ON (date or range) · AT (time) · MATCH (title words) · PATIENT · CHART and
        // the header's type (APPOINTMENT_/TASK_/DEADLINE_). New values: TO /
        // NEW_DATE / NEW_TIME / SHIFT / NEW_TITLE / any field. Legacy roles kept:
        // DATE/TIME are "which" for DELETE/DONE and "new" for UPDATE/MOVE unless a
        // TO/NEW_*/SHIFT field already carries the new slot.
        var origVerb = v;
        var typePref = op.typeHint || null;
        if (v === 'APPOINTMENT_MOVE') { v = 'EVENT_MOVE'; typePref = 'appointment'; }
        if (v === 'APPOINTMENT_DELETE') { v = 'EVENT_DELETE'; typePref = 'appointment'; }
        var isDel = v === 'EVENT_DELETE' || v === 'EVENT_DONE' || v === 'EVENT_UNDONE';
        if (!typePref && f.TYPE && !f.ID) typePref = parseTypeValue(f.TYPE);
        if (!typePref && (f.TASK_T || f.DEADLINE_T)) typePref = f.TASK_T ? 'task' : 'deadline';
        var matchText = f.MATCH || f.TASK_T || f.EVENT_T || f.DEADLINE_T || '';
        var titleIsTarget = !f.ID && !matchText && !!f.TITLE && (isDel || (!f.PATIENT && !f.CHART));
        if (titleIsTarget) matchText = f.TITLE;
        var patientIsTarget = !!f.PATIENT && !f.ID;
        var chartIsTarget = !!f.CHART && !f.ID;
        var whatLabel = { appointment: 'appointment', task: 'task', deadline: 'deadline', event: 'event' }[typePref] || 'item';
        var hasNewSlot = !!(f.TO || f.NEW_DATE || f.NEW_TIME || f.SHIFT || f.EXTEND);
        var dateIsWhich = isDel || (!f.ON && !f.FROM && !!f.DATE && hasNewSlot);
        var timeIsWhich = isDel || (!f.AT && !!f.TIME && hasNewSlot);
        var whichSrc = f.ON || f.FROM || (dateIsWhich ? f.DATE : '') || '';
        var wv = whichSrc ? parseDateTimeValue(whichSrc, today) : { date: null, endDate: null, start: null };
        if (whichSrc && !wv.date && wv.start === null) { items.push(mkItem('reject', { label: label || v, reason: 'Could not read the date "' + whichSrc + '" — use ON: YYYY-MM-DD', line: op.line })); return; }
        var whichTime = wv.start, whichEnd = wv.start !== null ? wv.end : null;
        var timeSrc = f.AT || (timeIsWhich ? f.TIME : '') || '';
        if (timeSrc) {
            var atv = parseDateTimeValue(timeSrc, today);
            if (atv.start === null && !atv.date) { items.push(mkItem('reject', { label: label || v, reason: 'Could not read the time "' + timeSrc + '" — use AT: 10:00 AM', line: op.line })); return; }
            if (atv.start !== null) { whichTime = atv.start; whichEnd = atv.end; }
            if (atv.date && !wv.date) wv.date = atv.date;
        }
        var words = matchWords(matchText);
        if (matchText && !words.length && !f.ID && !f.PATIENT && !f.CHART && !wv.date && whichTime === null) words = [normTitle(matchText)].filter(Boolean);
        var identity = !!(f.ID || words.length || (patientIsTarget && f.PATIENT) || (chartIsTarget && f.CHART));
        var pre = [];
        var dates = null;
        if (wv.date) {
            dates = [wv.date];
            if (wv.endDate && wv.endDate > wv.date) for (var dd = addDays(wv.date, 1); dd <= wv.endDate && dates.length < 62; dd = addDays(dd, 1)) dates.push(dd);
        } else if (whichTime !== null && !identity) {
            dates = [today];
            pre.push('No date given — assumed today');
        }
        if (!identity && !dates) {
            items.push(mkItem('reject', { label: label || v, reason: 'Which ' + whatLabel + '? Add ON: <date> and AT: <time>, or MATCH: <words from its title>', line: op.line }));
            return;
        }
        var allMode = false;
        if (f.ALL) allMode = parseBool(f.ALL) === true || /^(all|every|each|both|any)\b/i.test(f.ALL.trim());
        var crit = {
            id: f.ID ? String(f.ID).trim() : '', words: words, exactText: matchText,
            patient: patientIsTarget ? f.PATIENT : '', chart: chartIsTarget ? f.CHART : '',
            dates: dates, time: whichTime, timeEnd: whichEnd, typePref: typePref,
            procWords: origVerb.indexOf('APPOINTMENT_') === 0 && f.PROCEDURE ? matchWords(f.PROCEDURE) : []
        };
        function critText(cr) {
            var bits = [];
            if (cr.exactText) bits.push('“' + cr.exactText + '”');
            if (cr.patient) bits.push('patient ' + cr.patient);
            if (cr.chart) bits.push('chart ' + cr.chart);
            if (cr.id && !bits.length) bits.push('ID ' + cr.id);
            if (cr.time !== null && cr.time !== undefined) bits.push(cr.timeEnd !== null && cr.timeEnd !== undefined ? 'starting ' + fmtTime(hhmm(cr.time), settings.timeFormat) + '–' + fmtTime(hhmm(cr.timeEnd), settings.timeFormat) : 'at ' + fmtTime(hhmm(cr.time), settings.timeFormat));
            if (cr.dates) bits.push('on ' + fmtDateMed(cr.dates[0], today) + (cr.dates.length > 1 ? ' – ' + fmtDateMed(cr.dates[cr.dates.length - 1], today) : ''));
            return bits.join(' ');
        }

        // new values (shared by every matched item; timing is applied per item)
        var conv = null, shift = null, extend = null;
        if (!isDel) {
            conv = updateFieldsToChanges(f, ctx, {
                titleIsTarget: titleIsTarget, patientIsTarget: patientIsTarget, chartIsTarget: chartIsTarget, typeIsTarget: !f.ID,
                dateFields: (dateIsWhich ? [] : ['DATE']).concat(['TO', 'NEW_DATE', 'NEW_TIME']), useTime: !timeIsWhich
            });
            if (conv.errors.length) { items.push(mkItem('reject', { label: label || v, reason: conv.errors.join(' · '), line: op.line })); return; }
            if (f.SHIFT) {
                shift = parseShift(f.SHIFT);
                if (shift === null) { items.push(mkItem('reject', { label: label || v, reason: 'Could not read SHIFT "' + f.SHIFT + '" — use +1 hour, -30 min, +2 days', line: op.line })); return; }
            }
            if (f.EXTEND) {
                extend = parseShift(f.EXTEND);
                if (extend === null) { items.push(mkItem('reject', { label: label || v, reason: 'Could not read EXTEND "' + f.EXTEND + '" — use +1 hour (longer) or -30 min (shorter)', line: op.line })); return; }
            }
            if (v === 'EVENT_MOVE' && !conv.nv && shift === null && extend === null) { items.push(mkItem('reject', { label: label || v, reason: 'MOVE needs the new slot: TO:, NEW_DATE:, NEW_TIME: or SHIFT:', line: op.line })); return; }
        }

        var loc = locateTargets(ctx, crit, { all: allMode });
        var uncertainWhy = null;
        if (loc.ambiguous) {
            var n = loc.ambiguous.length;
            items.push(mkItem('reject', {
                label: label || (typePref ? whatLabel : 'item'), notFound: false,
                reason: (allMode ? 'Only partial matches for ' + critText(crit) + ' — ' : n + ' items match ' + critText(crit) + ' — add AT: <time> or MATCH: <title words> to pick one, or ALL: yes for every one. ') +
                    describeTargetList(loc.ambiguous, settings, today),
                line: op.line
            }));
            return;
        }
        if (!loc.list.length) {
            // Re-paste after it was applied: the item already sits at its new slot / name
            if (!isDel && conv && (conv.nv || shift !== null || conv.changes.title)) {
                var crit2 = Object.assign({}, crit, { timeEnd: null });
                var changedLookup = false;
                if (conv.changes.title && titleIsTarget || (conv.changes.title && f.MATCH)) { crit2.words = matchWords(conv.changes.title); crit2.exactText = conv.changes.title; changedLookup = true; }
                if (conv.nv && (conv.nv.date || conv.nv.start !== null)) {
                    var nd = conv.nv.date || (dates ? dates[0] : null);
                    if (nd) { crit2.dates = [nd]; changedLookup = true; }
                    if (conv.nv.start !== null) { crit2.time = conv.nv.start; changedLookup = true; }
                    else if (conv.nv.date && whichTime !== null) crit2.time = whichTime;
                } else if (shift !== null && dates && whichTime !== null) {
                    var sAbs = absToDateTime(absOf(dates[0], hhmm(whichTime)) + shift);
                    crit2.dates = [sAbs.date]; crit2.time = timeToMin(sAbs.time); changedLookup = true;
                }
                if (changedLookup && (identity || crit2.dates)) {
                    var loc2 = locateTargets(ctx, crit2, {});
                    if (loc2.list.length === 1 && !loc2.warnings.length) {
                        items.push(mkItem('skip', { label: displayTitle(loc2.list[0].inst), when: fmtWhen(loc2.list[0].inst, settings, today), reason: 'Already done — it is already ' + (conv.nv || shift !== null ? 'at the new time' : 'renamed'), line: op.line }));
                        return;
                    }
                }
            }
            // Wrong date by a few days (date math slip)? Only with a name/title to go on.
            if (identity && dates && dates.length === 1 && !allMode && !loc.idMiss) {
                for (var off = 1; off <= 7 && !loc.list.length; off++) {
                    [off, -off].some(function(o) {
                        var l3 = locateTargets(ctx, Object.assign({}, crit, { dates: [addDays(dates[0], o)] }), {});
                        if (l3.list.length === 1) {
                            loc = l3;
                            uncertainWhy = 'Nothing on ' + fmtDateMed(dates[0], today) + ' — found it on ' + fmtDateMed(l3.list[0].inst.startDate, today) + ' instead. Tick it if that is the one';
                            return true;
                        }
                        return false;
                    });
                }
            }
            if (!loc.list.length) {
                var why = 'No ' + whatLabel + ' matches ' + critText(crit) + (dates ? '. ' + dayDigest(ctx, dates[0]) : '');
                if (v === 'EVENT_DELETE') items.push(mkItem('skip', { label: label || whatLabel, reason: why + ' — nothing to delete (already gone?)', line: op.line, notFound: true }));
                else items.push(mkItem('reject', { label: label || whatLabel, reason: why, line: op.line, notFound: true }));
                return;
            }
        }
        if (loc.pickedNext && v === 'EVENT_DELETE') loc.uncertain = true;

        loc.list.forEach(function(hit) {
            var before = items.length;
            applyVerbTo(hit, pre.concat(loc.warnings, uncertainWhy ? [uncertainWhy] : []));
            if (loc.uncertain || uncertainWhy) for (var k = before; k < items.length; k++) items[k].checked = false;
        });

        function applyVerbTo(hit, warns) {
            var recurring = !!hit.ev.recurrence;
            var scope = parseScope(f.SCOPE) || (recurring && hit.inst.occ ? 'this' : 'all');
            if (!recurring) scope = 'all';
            if (scope !== 'all' && !hit.inst.occ) scope = 'all';
            if (hit.ev.type === 'appointment') matchedApptIds[hit.ev.id] = true;
            var hl = displayTitle(hit.inst);

            if (v === 'EVENT_DELETE') { pushTargetItem('delete', hit, null, scope, op, warns); return; }
            if (v === 'EVENT_DONE' || v === 'EVENT_UNDONE') {
                var want = v === 'EVENT_DONE';
                if (!!hit.inst.done === want) { items.push(mkItem('skip', { label: hl, when: fmtWhen(hit.inst, settings, today), reason: want ? 'Already done' : 'Already not done', line: op.line })); return; }
                pushTargetItem('done', hit, { done: want }, recurring && hit.inst.occ ? 'this' : 'all', op, warns);
                return;
            }
            // EVENT_MOVE / EVENT_UPDATE
            var changes = Object.assign({}, conv.changes);
            var nv = conv.nv ? Object.assign({}, conv.nv) : null;
            if (shift !== null) {
                nv = nv || { date: null, endDate: null, start: null, end: null, allDay: null, duration: null };
                if (hit.inst.allDay) {
                    var days = Math.round(shift / 1440);
                    if (!days) { items.push(mkItem('reject', { label: hl, reason: 'All-day items shift by whole days — use SHIFT: +1 day', line: op.line })); return; }
                    nv.date = addDays(hit.inst.startDate, days);
                } else {
                    var sh = absToDateTime(instanceStartAbs(hit.inst) + shift);
                    nv.date = sh.date;
                    nv.start = timeToMin(sh.time);
                }
            }
            if (nv) Object.assign(changes, computeTimingChanges(hit.inst, nv, settings));
            if (extend !== null) {
                var cur = Object.assign({}, hit.inst, changes);
                if (cur.allDay) {
                    var xd = Math.round(extend / 1440);
                    if (!xd) { items.push(mkItem('reject', { label: hl, reason: 'All-day items extend by whole days — use EXTEND: +1 day', line: op.line })); return; }
                    var ne = addDays(cur.endDate || cur.startDate, xd);
                    if (ne < cur.startDate) { items.push(mkItem('reject', { label: hl, reason: 'That would end before it starts', line: op.line })); return; }
                    changes.endDate = ne;
                } else {
                    var endAbs = instanceEndAbs(cur) + extend;
                    if (endAbs <= instanceStartAbs(cur)) { items.push(mkItem('reject', { label: hl, reason: 'That would end before it starts', line: op.line })); return; }
                    var xe = absToDateTime(endAbs);
                    changes.endDate = xe.date; changes.endTime = xe.time;
                }
            }
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
            if (!Object.keys(changes).length) { items.push(mkItem('skip', { label: hl, when: fmtWhen(hit.inst, settings, today), reason: 'No changes — already like that', line: op.line })); return; }
            var timingOnly = Object.keys(changes).every(function(k) { return RESOLVE_TIMING_FIELDS.indexOf(k) !== -1; });
            pushTargetItem(v === 'EVENT_MOVE' || timingOnly ? 'move' : 'update', hit, changes, scope, op, warns.concat(conv.warnings));
        }
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

    // Every date field is cross-checked against the weekday written next to it
    // ("ON: Thu 2026-11-06" → 11-06 is a Friday → item left unticked + flagged).
    var WEEKDAY_CHECK_FIELDS = ['DATE', 'ON', 'FROM', 'TO', 'NEW_DATE', 'START', 'END', 'END_DATE', 'DUE', 'DEADLINE_T', 'UNTIL'];
    parsed.ops.forEach(function(op) {
        var before = items.length;
        if (CREATE_VERBS[op.verb]) resolveCreate(op);
        else resolveVerb(op);
        var wm = null, wmField = '';
        var srcs = op.quick ? [['text', op.quick]] : WEEKDAY_CHECK_FIELDS.map(function(k) { return [k, (op.fields || {})[k]]; });
        srcs.some(function(kv) {
            if (!kv[1]) return false;
            wm = weekdayMismatch(kv[1], today);
            wmField = kv[0];
            return !!wm;
        });
        for (var i = before; i < items.length; i++) {
            items[i].op = { verb: op.verb, line: op.line, raw: op.raw || op.quick || '' };
            if (wm) {
                var msg = 'Check the date: ' + wmField + ' says ' + DOW[wm.said] + ' but ' + fmtDateMed(wm.date, today) + ' is a ' + DOW[wm.actual] + ' — left unticked';
                items[i].warnings = [msg].concat(items[i].warnings || []);
                items[i].checked = false;
                items[i].weekdayMismatch = true;
            }
        }
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

    // Claude's TODAY: line vs this device's date — a mismatch means relative days
    // ("tomorrow", "Friday") may be off, so nothing is pre-ticked.
    var planWarnings = (parsed.warnings || []).slice();
    var todayMismatch = null;
    if (parsed.claudeToday) {
        var ct = findDateInText(parsed.claudeToday, today);
        var cwm = weekdayMismatch(parsed.claudeToday, today);
        if (ct && ct.date !== today) {
            todayMismatch = { claude: ct.date, device: today };
            planWarnings.unshift({ line: null, msg: 'Claude wrote this on ' + fmtDateMed(ct.date, today) + ', but today is ' + fmtDateMed(today, today) +
                ' here — “today/tomorrow/Friday” may be off by ' + Math.abs(diffDays(today, ct.date)) + ' day' + (Math.abs(diffDays(today, ct.date)) === 1 ? '' : 's') + '. Nothing is pre-ticked: check the dates, then tick what is right.' });
        } else if (cwm) {
            planWarnings.unshift({ line: null, msg: 'TODAY line says ' + DOW[cwm.said] + ' but ' + cwm.date + ' is a ' + DOW[cwm.actual] + ' — Claude’s date math is off; check every date. Nothing is pre-ticked.' });
            todayMismatch = { claude: ct ? ct.date : null, device: today };
        }
        if (todayMismatch) items.forEach(function(it) { if (it.kind !== 'skip' && it.kind !== 'reject') it.checked = false; });
    }

    var counts = { create: 0, update: 0, move: 0, delete: 0, done: 0, calendar: 0, skip: 0, reject: 0 };
    items.forEach(function(it) { counts[it.kind] = (counts[it.kind] || 0) + 1; });
    return { items: items, counts: counts, foreign: parsed.foreign || {}, warnings: planWarnings, newCalendars: newCalendars, todayMismatch: todayMismatch };
}

// Problems in a plan, phrased for the Claude project to fix: errors, deletes
// that found nothing, and anything left unticked (weekday/date doubts).
function importIssues(plan) {
    var out = [];
    (plan.warnings || []).forEach(function(w) { out.push({ tag: 'NOT READ', msg: (w.line ? 'Line ' + w.line + ': ' : '') + w.msg, raw: '' }); });
    (plan.items || []).forEach(function(it) {
        var actionable = it.kind !== 'skip' && it.kind !== 'reject';
        var tag = it.kind === 'reject' ? 'ERROR' : (it.kind === 'skip' && it.notFound) ? 'NOT FOUND' : (actionable && !it.checked && !it.sync) ? 'NEEDS CHECK (left unticked)' : null;
        if (!tag) return;
        var msg = it.reason || '';
        if (actionable) msg = (it.label ? '“' + it.label + '” ' + (it.when || '') + ' → ' + (it.detail || it.kind) + '. ' : '') + (it.warnings || []).join(' · ');
        out.push({ tag: tag, msg: msg.trim(), raw: it.op && it.op.raw ? it.op.raw : '' });
    });
    return out;
}

function buildImportIssuesText(plan, today) {
    var issues = importIssues(plan);
    if (!issues.length) return '';
    var fine = (plan.items || []).filter(function(it) { return it.kind !== 'reject' && !(it.kind === 'skip' && it.notFound) && !(it.kind !== 'skip' && !it.checked); }).length;
    var L = [
        'SULLY CALENDAR IMPORT ISSUES — today is ' + DOW_SHORT[weekdayOf(today)] + ' ' + today,
        'Fix ONLY these items. Reply with ONE code block containing just the corrected blocks (the other items are fine).',
        ''
    ];
    issues.forEach(function(x, i) {
        L.push((i + 1) + '. ' + x.tag + ' — ' + x.msg);
        if (x.raw) {
            L.push('   Block that was pasted:');
            x.raw.split('\n').forEach(function(r) { L.push('   ' + r); });
        }
        L.push('');
    });
    if (fine) L.push('(' + fine + ' other item' + (fine === 1 ? ' was' : 's were') + ' fine.)');
    return L.join('\n').trim();
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
