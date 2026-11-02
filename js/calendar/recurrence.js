// ============================================================================
// SULLY CALENDAR — recurrence.js
// Recurrence expansion (daily / weekly-by-day / monthly by day, nth or last
// weekday / yearly, interval, until, count), per-occurrence exceptions,
// instance building, human rule descriptions, US holiday generator.
// The whole file is DOM-free (tests/calendar extracts it verbatim).
// ============================================================================

// [CAL-RECUR-START]

var ORDINAL_WORDS = ['first', 'second', 'third', 'fourth', 'fifth'];
var MAX_RECUR_ITERATIONS = 20000;

// nth weekday of a month (n = 1..5); returns day-of-month or null if absent
function nthWeekdayOfMonth(y, m1, wd, n) {
    var firstWd = weekdayOf(makeYMD(y, m1, 1));
    var d = 1 + ((wd - firstWd + 7) % 7) + (n - 1) * 7;
    return d <= daysInMonth(y, m1 - 1) ? d : null;
}

function lastWeekdayOfMonth(y, m1, wd) {
    var dim = daysInMonth(y, m1 - 1);
    var lastWd = weekdayOf(makeYMD(y, m1, dim));
    return dim - ((lastWd - wd + 7) % 7);
}

function isLastWeekdayOfMonth(ymd) {
    var p = ymdParts(ymd);
    return p.d + 7 > daysInMonth(p.y, p.m - 1);
}

function byDayList(rec, startYmd) {
    var codes = rec.byDay ? String(rec.byDay).split(',') : [];
    var wds = codes.map(function(c) { return DOW_CODES.indexOf(c.trim().toUpperCase()); }).filter(function(n) { return n >= 0; });
    if (!wds.length) wds = [weekdayOf(startYmd)];
    return wds.sort(function(a, b) { return a - b; });
}

// Calls cb(occurrenceYmd) for every ORIGINAL occurrence date d with from <= d <= to,
// ascending, honoring interval/until/count. cb returning false stops iteration.
// Occurrences before the series start are never generated.
function forEachOccurrence(ev, fromYmd, toYmd, cb) {
    var rec = ev && ev.recurrence;
    if (!rec || !ev.startDate) return;
    var S = ev.startDate, Sn = dayNum(S);
    var from = dayNum(fromYmd), to = dayNum(toYmd);
    var limit = rec.until ? Math.min(to, dayNum(rec.until)) : to;
    var hasCount = !!rec.count;
    var count = hasCount ? rec.count : Infinity;
    var interval = Math.max(1, rec.interval || 1);
    var emitted = 0, guard = 0, stopped = false;
    if (limit < Sn) return;

    function emit(dn) {
        if (dn < Sn) return true;
        if (dn > limit) { stopped = true; return false; }
        emitted++;
        if (emitted > count) { stopped = true; return false; }
        if (dn >= from) {
            if (cb(ymdFromDayNum(dn)) === false) { stopped = true; return false; }
        }
        return true;
    }

    var p = ymdParts(S);
    if (rec.freq === 'daily') {
        var k0 = hasCount ? 0 : Math.max(0, Math.floor((from - Sn) / interval));
        for (var k = k0; !stopped && guard++ < MAX_RECUR_ITERATIONS; k++) {
            if (!emit(Sn + k * interval)) break;
        }
    } else if (rec.freq === 'weekly') {
        var wds = byDayList(rec, S);
        var anchor = Sn - weekdayOf(S); // Sunday of the start week
        var w0 = hasCount ? 0 : Math.max(0, Math.floor((from - anchor) / (7 * interval)) - 1);
        for (var w = w0; !stopped && guard++ < MAX_RECUR_ITERATIONS; w++) {
            var base = anchor + w * interval * 7;
            if (base > limit) break;
            for (var i = 0; i < wds.length; i++) {
                if (!emit(base + wds[i])) break;
            }
        }
    } else if (rec.freq === 'monthly') {
        var mStart = p.y * 12 + (p.m - 1);
        var fp = ymdParts(fromYmd);
        var mFrom = fp.y * 12 + (fp.m - 1);
        var mk0 = hasCount ? 0 : Math.max(0, Math.floor((mFrom - mStart) / interval) - 1);
        var wd = weekdayOf(S);
        var nth = Math.ceil(p.d / 7);
        for (var mk = mk0; !stopped && guard++ < MAX_RECUR_ITERATIONS; mk++) {
            var mi = mStart + mk * interval;
            var y = Math.floor(mi / 12), m1 = mi - y * 12 + 1;
            if (dayNum(makeYMD(y, m1, 1)) > limit) break;
            var d = null;
            if (rec.monthlyMode === 'nth') d = nthWeekdayOfMonth(y, m1, wd, nth);
            else if (rec.monthlyMode === 'last') d = lastWeekdayOfMonth(y, m1, wd);
            else d = p.d <= daysInMonth(y, m1 - 1) ? p.d : null;
            if (d === null) continue;
            if (!emit(dayNum(makeYMD(y, m1, d)))) break;
        }
    } else if (rec.freq === 'yearly') {
        var fy = ymdParts(fromYmd).y;
        var yk0 = hasCount ? 0 : Math.max(0, Math.floor((fy - p.y) / interval) - 1);
        for (var yk = yk0; !stopped && guard++ < MAX_RECUR_ITERATIONS; yk++) {
            var yy = p.y + yk * interval;
            if (dayNum(makeYMD(yy, 1, 1)) > limit) break;
            if (p.m === 2 && p.d === 29 && daysInMonth(yy, 1) < 29) continue;
            if (!emit(dayNum(makeYMD(yy, p.m, p.d)))) break;
        }
    }
}

function isOccurrenceDate(ev, ymd) {
    var found = false;
    if (!ev || !ev.recurrence || !isValidYMD(ymd)) return false;
    forEachOccurrence(ev, ymd, ymd, function() { found = true; return false; });
    return found;
}

function countOccurrencesBefore(ev, ymd) {
    var n = 0;
    if (!ev || !ev.recurrence || ymd <= ev.startDate) return 0;
    forEachOccurrence(ev, ev.startDate, addDays(ymd, -1), function() { n++; });
    return n;
}

function lastOccurrenceDate(ev) {
    if (!ev.recurrence) return ev.startDate;
    if (!ev.recurrence.until && !ev.recurrence.count) return null; // infinite
    var last = null;
    var to = ev.recurrence.until || addDays(ev.startDate, 366 * 30);
    forEachOccurrence(ev, ev.startDate, to, function(d) { last = d; });
    return last;
}

// Next occurrence on/after a date (for search results / agenda hints)
function nextOccurrenceOnOrAfter(ev, ymd) {
    if (!ev.recurrence) return ev.startDate >= ymd ? ev.startDate : null;
    var hit = null;
    forEachOccurrence(ev, ymd, addDays(ymd, 366 * 5), function(d) {
        var x = ev.exceptions && ev.exceptions[d];
        if (x && x.deleted) return true;
        hit = d; return false;
    });
    return hit;
}

var OCCURRENCE_FIELDS = ['title', 'startDate', 'endDate', 'startTime', 'endTime', 'allDay', 'location', 'notes', 'color'];

// A concrete, renderable occurrence. occ = original occurrence date (null for single events).
function buildInstance(ev, occ) {
    if (!ev || !ev.startDate) return null;
    var ex = occ && ev.exceptions ? (ev.exceptions[occ] || null) : null;
    if (ex && ex.deleted) return null;
    var span = Math.max(0, diffDays(ev.startDate, ev.endDate || ev.startDate));
    var inst = {
        key: occ ? ev.id + '::' + occ : ev.id,
        id: ev.id,
        occ: occ || null,
        type: ev.type,
        title: ev.title,
        calendarId: ev.calendarId,
        color: ev.color,
        allDay: ev.allDay,
        startDate: occ || ev.startDate,
        endDate: occ ? addDays(occ, span) : (ev.endDate || ev.startDate),
        startTime: ev.startTime,
        endTime: ev.endTime,
        location: ev.location,
        notes: ev.notes,
        done: occ ? !!(ev.doneDates && ev.doneDates[occ]) : !!ev.done,
        recurring: !!ev.recurrence,
        exception: !!ex,
        readOnly: false,
        patientName: ev.patientName,
        chartNumber: ev.chartNumber,
        procedure: ev.procedure,
        chair: ev.chair,
        priority: ev.priority,
        reminders: ev.reminders,
        source: ev.source
    };
    if (ex) {
        OCCURRENCE_FIELDS.forEach(function(f) {
            if (ex[f] !== undefined && ex[f] !== null) inst[f] = ex[f];
        });
        if (ex.allDay === true) { inst.startTime = null; inst.endTime = null; }
        if (ex.allDay === false && !isValidHHMM(inst.startTime)) { inst.startTime = '09:00'; inst.endTime = '10:00'; }
        if (!isValidYMD(inst.endDate) || inst.endDate < inst.startDate) inst.endDate = inst.startDate;
    }
    return inst;
}

function instanceStartAbs(inst) {
    return inst.allDay ? dayNum(inst.startDate) * 1440 : absOf(inst.startDate, inst.startTime);
}

function instanceEndAbs(inst) {
    if (inst.allDay) return (dayNum(inst.endDate) + 1) * 1440;
    return absOf(inst.endDate, inst.endTime);
}

function instanceDurationMin(inst) { return Math.max(0, instanceEndAbs(inst) - instanceStartAbs(inst)); }

// All occurrences of one event overlapping [fromYmd, toYmd] (inclusive days)
function getEventInstances(ev, fromYmd, toYmd) {
    var out = [];
    if (!ev || !isValidYMD(ev.startDate)) return out;
    var fromAbs = dayNum(fromYmd) * 1440, toAbs = (dayNum(toYmd) + 1) * 1440;
    function overlaps(inst) {
        var s = instanceStartAbs(inst), e = instanceEndAbs(inst);
        if (e <= s) return s >= fromAbs && s < toAbs;
        return s < toAbs && e > fromAbs;
    }
    if (!ev.recurrence) {
        var one = buildInstance(ev, null);
        if (one && overlaps(one)) out.push(one);
        return out;
    }
    var span = Math.max(0, diffDays(ev.startDate, ev.endDate || ev.startDate));
    var seen = {};
    forEachOccurrence(ev, addDays(fromYmd, -span - 1), toYmd, function(occ) {
        seen[occ] = true;
        var inst = buildInstance(ev, occ);
        if (inst && overlaps(inst)) out.push(inst);
    });
    // Occurrences moved INTO the window from an original date outside it
    Object.keys(ev.exceptions || {}).forEach(function(occ) {
        if (seen[occ]) return;
        var x = ev.exceptions[occ];
        if (!x || x.deleted || !x.startDate) return;
        if (!isOccurrenceDate(ev, occ)) return;
        var inst = buildInstance(ev, occ);
        if (inst && overlaps(inst)) out.push(inst);
    });
    return out;
}

function compareInstances(a, b) {
    // all-day / multi-day first, then by start, longer first, then title
    var aAll = a.allDay ? 0 : 1, bAll = b.allDay ? 0 : 1;
    if (aAll !== bAll) return aAll - bAll;
    var d = instanceStartAbs(a) - instanceStartAbs(b);
    if (d) return d;
    var l = instanceDurationMin(b) - instanceDurationMin(a);
    if (l) return l;
    return displayTitle(a).localeCompare(displayTitle(b));
}

function firstLine(s) { return String(s || '').split('\n')[0].trim(); }

function displayTitle(x) {
    if (!x) return '';
    if (x.title && String(x.title).trim()) return String(x.title).trim();
    if (x.type === 'appointment') {
        var t = x.patientName ? String(x.patientName).trim() : 'Patient';
        if (x.procedure) t += ' — ' + firstLine(x.procedure);
        return t;
    }
    return '(No title)';
}

// ---------------------------------------------------------------- descriptions
function describeRecurrence(rec, startYmd) {
    if (!rec) return 'Does not repeat';
    var iv = rec.interval || 1;
    var out = '';
    var p = ymdParts(startYmd);
    if (rec.freq === 'daily') {
        out = iv === 1 ? 'Daily' : 'Every ' + iv + ' days';
    } else if (rec.freq === 'weekly') {
        var wds = byDayList(rec, startYmd);
        if (iv === 1 && wds.join(',') === '1,2,3,4,5') out = 'Every weekday (Monday to Friday)';
        else {
            var names = wds.length === 7 ? 'all days' : wds.map(function(w) { return DOW[w]; }).join(', ');
            out = (iv === 1 ? 'Weekly' : 'Every ' + iv + ' weeks') + ' on ' + names;
        }
    } else if (rec.freq === 'monthly') {
        var head = iv === 1 ? 'Monthly' : 'Every ' + iv + ' months';
        var wd = weekdayOf(startYmd);
        if (rec.monthlyMode === 'nth') out = head + ' on the ' + ORDINAL_WORDS[Math.ceil(p.d / 7) - 1] + ' ' + DOW[wd];
        else if (rec.monthlyMode === 'last') out = head + ' on the last ' + DOW[wd];
        else out = head + ' on day ' + p.d;
    } else if (rec.freq === 'yearly') {
        out = (iv === 1 ? 'Annually' : 'Every ' + iv + ' years') + ' on ' + MONTHS[p.m - 1] + ' ' + p.d;
    }
    if (rec.until) {
        var u = ymdParts(rec.until);
        out += ', until ' + MONTHS_SHORT[u.m - 1] + ' ' + u.d + ', ' + u.y;
    } else if (rec.count) {
        out += ', ' + rec.count + (rec.count === 1 ? ' time' : ' times');
    }
    return out;
}

// Preset menu for the editor's "Repeat" select (Google's list, computed from the start date)
function recurrencePresets(startYmd) {
    var wd = weekdayOf(startYmd);
    var p = ymdParts(startYmd);
    var nth = Math.ceil(p.d / 7);
    var presets = [
        { key: 'none', label: 'Does not repeat', rec: null },
        { key: 'daily', label: 'Daily', rec: { freq: 'daily', interval: 1 } },
        { key: 'weekly', label: 'Weekly on ' + DOW[wd], rec: { freq: 'weekly', interval: 1, byDay: DOW_CODES[wd] } }
    ];
    if (nth <= 4) presets.push({ key: 'monthly-nth', label: 'Monthly on the ' + ORDINAL_WORDS[nth - 1] + ' ' + DOW[wd], rec: { freq: 'monthly', interval: 1, monthlyMode: 'nth' } });
    if (isLastWeekdayOfMonth(startYmd)) presets.push({ key: 'monthly-last', label: 'Monthly on the last ' + DOW[wd], rec: { freq: 'monthly', interval: 1, monthlyMode: 'last' } });
    presets.push({ key: 'monthly-day', label: 'Monthly on day ' + p.d, rec: { freq: 'monthly', interval: 1, monthlyMode: 'day' } });
    presets.push({ key: 'yearly', label: 'Annually on ' + MONTHS[p.m - 1] + ' ' + p.d, rec: { freq: 'yearly', interval: 1 } });
    presets.push({ key: 'weekdays', label: 'Every weekday (Monday to Friday)', rec: { freq: 'weekly', interval: 1, byDay: 'MO,TU,WE,TH,FR' } });
    presets.push({ key: 'custom', label: 'Custom…', rec: null });
    return presets;
}

function presetKeyForRecurrence(rec, startYmd) {
    if (!rec) return 'none';
    if (rec.until || rec.count || (rec.interval || 1) !== 1) return 'custom';
    var wd = weekdayOf(startYmd);
    if (rec.freq === 'daily') return 'daily';
    if (rec.freq === 'weekly') {
        var b = byDayList(rec, startYmd).join(',');
        if (b === String(wd)) return 'weekly';
        if (b === '1,2,3,4,5') return 'weekdays';
        return 'custom';
    }
    if (rec.freq === 'monthly') {
        if (rec.monthlyMode === 'nth') return Math.ceil(ymdParts(startYmd).d / 7) <= 4 ? 'monthly-nth' : 'custom';
        if (rec.monthlyMode === 'last') return isLastWeekdayOfMonth(startYmd) ? 'monthly-last' : 'custom';
        return 'monthly-day';
    }
    if (rec.freq === 'yearly') return 'yearly';
    return 'custom';
}

// ---------------------------------------------------------------- holidays (US)
function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return makeYMD(y, month, day);
}

var holidayCache = {};
function getUSHolidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    var list = [];
    function add(m1, d, title, federal) { if (d) list.push({ date: makeYMD(y, m1, d), title: title, federal: !!federal }); }
    function addFixedFederal(m1, d, title) {
        add(m1, d, title, true);
        var wd = weekdayOf(makeYMD(y, m1, d));
        if (wd === 6) list.push({ date: addDays(makeYMD(y, m1, d), -1), title: title + ' (observed)', federal: true });
        if (wd === 0) list.push({ date: addDays(makeYMD(y, m1, d), 1), title: title + ' (observed)', federal: true });
    }
    addFixedFederal(1, 1, "New Year's Day");
    add(1, nthWeekdayOfMonth(y, 1, 1, 3), 'Martin Luther King Jr. Day', true);
    add(2, 14, "Valentine's Day", false);
    add(2, nthWeekdayOfMonth(y, 2, 1, 3), "Presidents' Day", true);
    add(3, 17, "St. Patrick's Day", false);
    add(3, nthWeekdayOfMonth(y, 3, 0, 2), 'Daylight Saving Time starts', false);
    var easter = easterSunday(y);
    list.push({ date: easter, title: 'Easter Sunday', federal: false });
    add(5, nthWeekdayOfMonth(y, 5, 0, 2), "Mother's Day", false);
    add(5, lastWeekdayOfMonth(y, 5, 1), 'Memorial Day', true);
    addFixedFederal(6, 19, 'Juneteenth');
    add(6, nthWeekdayOfMonth(y, 6, 0, 3), "Father's Day", false);
    addFixedFederal(7, 4, 'Independence Day');
    add(9, nthWeekdayOfMonth(y, 9, 1, 1), 'Labor Day', true);
    add(10, nthWeekdayOfMonth(y, 10, 1, 2), "Columbus Day / Indigenous Peoples' Day", true);
    add(10, 31, 'Halloween', false);
    add(11, nthWeekdayOfMonth(y, 11, 0, 1), 'Daylight Saving Time ends', false);
    addFixedFederal(11, 11, 'Veterans Day');
    add(11, nthWeekdayOfMonth(y, 11, 4, 4), 'Thanksgiving Day', true);
    add(12, 24, 'Christmas Eve', false);
    addFixedFederal(12, 25, 'Christmas Day');
    add(12, 31, "New Year's Eve", false);
    list.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    holidayCache[y] = list;
    return list;
}

// [CAL-RECUR-END]
