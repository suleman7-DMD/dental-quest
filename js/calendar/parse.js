// ============================================================================
// SULLY CALENDAR — parse.js
// Natural-language primitives shared by the paste importer and quick add:
// dates (ISO, US, month names, relative words, weekdays), times and time
// ranges (meridiem inheritance + clinic-hours heuristic), durations, repeat
// rules (plain English or RRULE), reminders, status/priority/type values,
// patient-name / chart canonicalization, and the one-line quick-add parser.
// DOM-free — tests/calendar extracts the sentinel section verbatim.
// ============================================================================

// [CAL-PARSE-START]

var MONTH_NAME_SRC = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
var WEEKDAY_SRC = '(sun(?:days?)?|mon(?:days?)?|tue(?:s(?:days?)?)?|wed(?:s|nesdays?)?|thu(?:r(?:s(?:days?)?)?)?|fri(?:days?)?|sat(?:urdays?)?)';
var NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
var RANGE_SEP_SRC = '\\s*(?:-|–|—|to|until|till|thru|through)\\s*';
var TIME_TOK_SRC = '(?:noon|midnight|\\d{1,2}(?::\\d{2})?(?:\\s*[ap]\\.?m\\.?|[ap](?![a-z]))?)';

function monthFromWord(w) {
    var k = String(w || '').toLowerCase().slice(0, 3);
    var i = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(k);
    return i === -1 ? null : i + 1;
}

function weekdayFromWord(w) {
    var k = String(w || '').toLowerCase().slice(0, 2);
    var i = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'].indexOf(k);
    return i === -1 ? null : i;
}

function wordNumber(w) {
    var s = String(w || '').toLowerCase();
    if (/^\d+$/.test(s)) return +s;
    return NUMBER_WORDS[s] || null;
}

function safeYMD(y, m, d) {
    if (!(y >= 1900 && y <= 2200) || !(m >= 1 && m <= 12) || !(d >= 1)) return null;
    if (d > daysInMonth(y, m - 1)) return null;
    return makeYMD(y, m, d);
}

// Year-less dates: the first of (last year, this year, next year) that is no
// more than 60 days in the past — "1/15" typed in November means next January,
// "12/28" typed on Jan 5 means last week.
function inferYearFor(m, d, today) {
    var ty = ymdParts(today).y;
    for (var y = ty - 1; y <= ty + 1; y++) {
        var s = safeYMD(y, m, d);
        if (s && diffDays(today, s) >= -60) return s;
    }
    return safeYMD(ty + 1, m, d);
}

function fullYear(y) {
    var n = +y;
    if (String(y).length <= 2) n = 2000 + n;
    return n;
}

function nextWeekdayOnOrAfter(today, wd) {
    return addDays(today, (wd - weekdayOf(today) + 7) % 7);
}

// Every date mention in text. tier: 0 explicit, 1 relative word, 2 weekday name.
function listDateCandidates(text, today) {
    var s = String(text || '');
    var out = [];
    var re, m;
    function push(idx, len, date, tier, extra) {
        if (!date) return;
        var c = { index: idx, length: len, date: date, tier: tier };
        if (extra) Object.keys(extra).forEach(function(k) { c[k] = extra[k]; });
        out.push(c);
    }
    // ISO 2026-11-05 / 2026/11/05
    re = /(^|[^\d])(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?!\d)/g;
    while ((m = re.exec(s))) push(m.index + m[1].length, m[0].length - m[1].length, safeYMD(+m[2], +m[3], +m[4]), 0);
    // US 11/5/2026, 11/5/26, 11/5
    re = /(^|[^\d\/.\-])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d\/])/g;
    while ((m = re.exec(s))) {
        var d1 = m[4] ? safeYMD(fullYear(m[4]), +m[2], +m[3]) : (+m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31 ? inferYearFor(+m[2], +m[3], today) : null);
        push(m.index + m[1].length, m[0].length - m[1].length, d1, 0);
    }
    // US with dashes 11-05-2026
    re = /(^|[^\d\/.\-])(\d{1,2})-(\d{1,2})-(\d{4})(?![\d\-])/g;
    while ((m = re.exec(s))) push(m.index + m[1].length, m[0].length - m[1].length, safeYMD(+m[4], +m[2], +m[3]), 0);
    // Nov 5, Nov 5th 2026, November 5-7
    re = new RegExp('(^|[^a-z])' + MONTH_NAME_SRC + '\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:-|–|—|to|through|thru)\\s*(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:apm]))?(?![\\d:])(?:,?\\s+(\\d{4}))?(?![\\d:])', 'gi');
    while ((m = re.exec(s))) {
        var mo = monthFromWord(m[2]), dd = +m[3];
        var date = m[5] ? safeYMD(+m[5], mo, dd) : inferYearFor(mo, dd, today);
        var extra = null;
        if (date && m[4] && +m[4] > dd) {
            var p = ymdParts(date);
            var e = safeYMD(p.y, p.m, +m[4]);
            if (e) extra = { endDate: e };
        }
        push(m.index + m[1].length, m[0].length - m[1].length, date, 0, extra);
    }
    // 5 Nov, 5th of November 2026
    re = new RegExp('(^|[^a-z\\d:])(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?' + MONTH_NAME_SRC + '(?![a-z])\\.?(?:,?\\s+(\\d{4}))?(?![\\d:])', 'gi');
    while ((m = re.exec(s))) {
        var mo2 = monthFromWord(m[3]);
        push(m.index + m[1].length, m[0].length - m[1].length, m[4] ? safeYMD(+m[4], mo2, +m[2]) : inferYearFor(mo2, +m[2], today), 0);
    }
    // relative words
    re = /(^|[^a-z])(day after tomorrow|today|tonight|tomorrow|tomorow|tmrw|tmr|yesterday)(?![a-z])/gi;
    while ((m = re.exec(s))) {
        var w = m[2].toLowerCase();
        var off = w === 'day after tomorrow' ? 2 : (w === 'today' || w === 'tonight') ? 0 : w === 'yesterday' ? -1 : 1;
        push(m.index + m[1].length, m[0].length - m[1].length, addDays(today, off), 1, w === 'tonight' ? { tonight: true } : null);
    }
    re = /(^|[^a-z])in\s+(\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?)(?![a-z])/gi;
    while ((m = re.exec(s))) {
        var n = wordNumber(m[2]), u = m[3].toLowerCase().charAt(0);
        var dt = u === 'd' ? addDays(today, n) : u === 'w' ? addDays(today, 7 * n) : addMonths(today, n);
        push(m.index + m[1].length, m[0].length - m[1].length, dt, 1);
    }
    re = /(^|[^a-z])(next|this)\s+(week|weekend|month)(?![a-z])/gi;
    while ((m = re.exec(s))) {
        var which = m[2].toLowerCase(), unit = m[3].toLowerCase(), dt2;
        if (unit === 'week') dt2 = which === 'next' ? addDays(today, 7) : today;
        else if (unit === 'month') dt2 = which === 'next' ? addMonths(today, 1) : today;
        else {
            var sat = weekdayOf(today) === 0 ? today : nextWeekdayOnOrAfter(today, 6);
            dt2 = which === 'next' ? addDays(sat, weekdayOf(today) === 0 ? 6 : 7) : sat;
        }
        push(m.index + m[1].length, m[0].length - m[1].length, dt2, 1);
    }
    // weekday names: "friday", "this fri", "next tuesday"
    re = new RegExp('(^|[^a-z])(?:(next|this|coming|on)\\s+)?' + WEEKDAY_SRC + '(?![a-z])\\.?', 'gi');
    while ((m = re.exec(s))) {
        var word = m[3].toLowerCase();
        // bare "sun"/"sat" are ordinary words — only accept them with a prefix
        if ((word === 'sun' || word === 'sat') && !m[2]) continue;
        var wd = weekdayFromWord(word);
        var prefix = (m[2] || '').toLowerCase();
        var dt3 = nextWeekdayOnOrAfter(today, wd);
        if (prefix === 'next') {
            // "next friday" = the friday of NEXT week
            var thisWeekStart = addDays(today, -weekdayOf(today));
            dt3 = addDays(thisWeekStart, 7 + wd);
            if (dt3 <= today) dt3 = addDays(dt3, 7);
        }
        var startIdx = m.index + m[1].length;
        var len = m[0].length - m[1].length;
        if (prefix === 'on') { startIdx += m[0].slice(m[1].length).toLowerCase().indexOf(word); len = m[0].length - (startIdx - m.index); }
        push(startIdx, len, dt3, 2, { weekday: wd });
    }
    out.sort(function(a, b) { return a.index - b.index || b.length - a.length; });
    return out;
}

// Best single date (+ optional range end) in text → {date, endDate, index, length} or null.
// Explicit dates beat relative words beat weekday names. A weekday name glued to
// an explicit date ("Wed, Nov 5") is folded into the match.
function findDateInText(text, today) {
    var s = String(text || '');
    var cands = listDateCandidates(s, today);
    if (!cands.length) return null;
    var best = null;
    for (var tier = 0; tier <= 2 && !best; tier++) {
        for (var i = 0; i < cands.length; i++) if (cands[i].tier === tier) { best = cands[i]; break; }
    }
    var res = { date: best.date, endDate: best.endDate || null, index: best.index, length: best.length };
    if (best.tier === 0) {
        // fold a leading weekday name ("Wednesday, 11/5")
        cands.forEach(function(c) {
            if (c.tier !== 2) return;
            var gap = s.slice(c.index + c.length, res.index);
            if (c.index < res.index && /^[\s,.]*$/.test(gap)) {
                res.length += res.index - c.index;
                res.index = c.index;
            }
        });
        // explicit range: "11/5 - 11/7", "Nov 5 to Nov 7"
        if (!res.endDate) {
            var after = cands.filter(function(c) { return c.tier === 0 && c.index >= best.index + best.length; })[0];
            if (after) {
                var between = s.slice(best.index + best.length, after.index);
                if (new RegExp('^\\s*(?:' + TIME_TOK_SRC + ')?' + RANGE_SEP_SRC + '$', 'i').test(between) && after.date >= best.date) {
                    res.endDate = after.date;
                    res.rangeEndIndex = after.index;
                    res.rangeEndLength = after.length;
                }
            }
        }
    }
    return res;
}

// ---------------------------------------------------------------- times
function parseTimeTok(tok) {
    var t = String(tok || '').trim().toLowerCase().replace(/\s+/g, '');
    if (t === 'noon') return { h: 12, m: 0, mer: 'p', special: true, hasMin: false };
    if (t === 'midnight') return { h: 0, m: 0, mer: 'a', special: true, hasMin: false };
    var m = t.match(/^(\d{1,2})(?::?(\d{2}))?(?:([ap])\.?(?:m\.?)?)?$/);
    if (!m) return null;
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (mi > 59) return null;
    var mer = m[3] || null;
    if (mer && (h < 1 || h > 12)) return null;
    if (h > 24 || (h === 24 && mi > 0)) return null;
    return { h: h, m: mi, mer: mer, lead0: /^0\d/.test(m[1]), hasMin: !!m[2], special: false };
}

function is24hTok(t) { return !t.special && !t.mer && (t.h === 0 || t.h > 12 || t.lead0); }

function tokMinutes(t, mer) {
    if (t.special) return t.h * 60 + t.m;
    var h = t.h;
    if (h === 24) h = 0;
    if (mer === 'p' && h < 12) h += 12;
    else if (mer === 'a' && h === 12) h = 0;
    return h * 60 + t.m;
}

// Lone time with no am/pm: clinic-hours heuristic (1–6 → pm, 7–11 → am, 12 → noon)
function singleTimeMinutes(t) {
    if (t.mer || t.special) return tokMinutes(t, t.mer);
    if (is24hTok(t)) return tokMinutes(t, null);
    if (t.h === 12) return tokMinutes(t, 'p');
    return tokMinutes(t, t.h <= 6 ? 'p' : 'a');
}

function resolveTimeRange(a, b) {
    var sm = null, em = null;
    if (is24hTok(a) || is24hTok(b)) {
        // 24-hour style on either side ("10:00-22:00", "08:00-12:00") → read both as 24h
        sm = (a.mer || a.special) ? tokMinutes(a, a.mer) : tokMinutes(a, null);
        em = (b.mer || b.special) ? tokMinutes(b, b.mer) : tokMinutes(b, null);
        if (!b.mer && !b.special && !is24hTok(b) && em <= sm && em + 720 > sm) em += 720; // "14:00-4" → 4pm
        return { start: sm, end: em };
    }
    var aKnown = a.mer || a.special;
    var bKnown = b.mer || b.special;
    if (aKnown) sm = tokMinutes(a, a.mer);
    if (bKnown) em = tokMinutes(b, b.mer);
    if (!aKnown && bKnown) {
        var inherit = b.mer || (em >= 720 ? 'p' : 'a');
        sm = tokMinutes(a, inherit);
        if (sm > em) sm = tokMinutes(a, inherit === 'p' ? 'a' : 'p'); // "11-1pm" → 11am
    } else if (aKnown && !bKnown) {
        var inh = a.mer || (sm >= 720 ? 'p' : 'a');
        em = tokMinutes(b, inh);
        if (em <= sm) em = tokMinutes(b, inh === 'a' ? 'p' : 'a'); // "11am-1" → 1pm, "10pm-2" → 2am
    } else if (!aKnown && !bKnown) {
        sm = singleTimeMinutes(a);
        em = tokMinutes(b, 'a');
        if (em <= sm) em = tokMinutes(b, 'p');
    }
    return { start: sm, end: em };
}

function isStrictTimeTok(t) { return !!(t && (t.mer || t.hasMin || t.special)); }

// First time range or single time in text → {start, end|null, index, length} (minutes).
// loose=true (free text): bare numbers only count after "at"/"from"/"@".
function scanTimes(text, loose) {
    var s = String(text || '');
    var lead = '(^|[^\\d:/\\-.a-z])';
    var reR = new RegExp(lead + '(' + TIME_TOK_SRC + ')' + RANGE_SEP_SRC + '(' + TIME_TOK_SRC + ')(?![\\d:/a-z])', 'gi');
    var m;
    while ((m = reR.exec(s))) {
        var a = parseTimeTok(m[2]), b = parseTimeTok(m[3]);
        if (!a || !b) continue;
        var before = s.slice(0, m.index + m[1].length);
        if (loose && !isStrictTimeTok(a) && !isStrictTimeTok(b) && !/(?:\bat|\bfrom|@)\s*$/i.test(before)) continue;
        if (loose && ((!a.hasMin && !a.mer && a.h > 12) || (!b.hasMin && !b.mer && b.h > 12))) continue;
        var r = resolveTimeRange(a, b);
        return { start: r.start, end: r.end, index: m.index + m[1].length, length: m[0].length - m[1].length };
    }
    var re1 = new RegExp(lead + '(' + TIME_TOK_SRC + ')(?![\\d:/a-z])', 'gi');
    while ((m = re1.exec(s))) {
        var t = parseTimeTok(m[2]);
        if (!t) continue;
        var before1 = s.slice(0, m.index + m[1].length);
        if (loose && !isStrictTimeTok(t) && !/(?:\bat|@)\s*$/i.test(before1)) continue;
        return { start: singleTimeMinutes(t), end: null, index: m.index + m[1].length, length: m[0].length - m[1].length };
    }
    return null;
}

// "9-11" / "1:30-3" with no am/pm — only trusted where a class time is expected (repeating schedules)
function bareTimeRange(text) {
    var s = String(text || '');
    var re = /(^|[^\d:\/\-.a-z#$])(\d{1,2}(?::\d{2})?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?)(?![\d:\/a-z%])/gi, m;
    while ((m = re.exec(s))) {
        var a = parseTimeTok(m[2]), b = parseTimeTok(m[3]);
        if (!a || !b || a.h < 1 || a.h > 12 || b.h < 1 || b.h > 12) continue;
        var r = resolveTimeRange(a, b);
        if (r.end - r.start > 0 && r.end - r.start <= 10 * 60) return { start: r.start, end: r.end, index: m.index + m[1].length, length: m[0].length - m[1].length };
    }
    return null;
}

function stripTimezone(s) {
    return String(s || '').replace(/\b(?:EST|EDT|ET|Eastern(?:\s+(?:Standard|Daylight))?(?:\s+Time)?)\b/g, ' ');
}

// Field value like "Wed 11/5/2026 9:00 AM - 12:00 PM", "Nov 5-7", "tomorrow at 3"
// → { date, endDate, start, end, allDay } (start/end in minutes or null)
function parseDateTimeValue(v, today) {
    var s = stripTimezone(v).replace(/\s+/g, ' ').trim();
    var out = { date: null, endDate: null, start: null, end: null, allDay: false };
    if (!s) return out;
    if (/\ball[\s-]?day\b/i.test(s)) { out.allDay = true; s = s.replace(/\ball[\s-]?day\b/gi, ' '); }
    var d = findDateInText(s, today);
    if (!d) {
        var t0 = scanTimes(s, false);
        if (t0) { out.start = t0.start; out.end = t0.end; }
        return out;
    }
    out.date = d.date;
    out.endDate = d.endDate;
    if (d.rangeEndIndex !== undefined) {
        // "Nov 5 9am - Nov 7 5pm" — time before the separator starts, time after the 2nd date ends
        var seg1 = s.slice(d.index + d.length, d.rangeEndIndex);
        var seg2 = s.slice(d.rangeEndIndex + d.rangeEndLength);
        var t1 = scanTimes(seg1.replace(new RegExp(RANGE_SEP_SRC + '$', 'i'), ' '), false);
        var t2 = scanTimes(seg2, false);
        if (t1) out.start = t1.start;
        if (t2) out.end = t2.start;
        return out;
    }
    var rest = s.slice(0, d.index) + ' ' + s.slice(d.index + d.length);
    rest = rest.replace(/\b(?:at|from|on|@)\b/gi, ' ');
    var t = scanTimes(rest, false);
    if (t) { out.start = t.start; out.end = t.end; }
    return out;
}

// ---------------------------------------------------------------- durations / reminders
function parseDuration(v) {
    var s = String(v || '').trim().toLowerCase();
    if (!s) return null;
    if (/^all[\s-]?day$/.test(s)) return 'allday';
    if (/^\d+$/.test(s)) return +s;
    var hm = s.match(/^(\d{1,2}):(\d{2})$/);
    if (hm) return (+hm[1]) * 60 + (+hm[2]);
    if (/^(?:an?|one)\s+hour$/.test(s)) return 60;
    if (/^half\s+(?:an?\s+)?hour$/.test(s)) return 30;
    if (/^(?:an?|one)\s+day$/.test(s)) return 1440;
    if (/^(?:an?|one)\s+week$/.test(s)) return 10080;
    var total = 0, found = false;
    s.replace(/(\d+(?:\.\d+)?)\s*(w|wks?|weeks?|d|days?|h|hrs?|hours?|m|mins?|minutes?)(?![a-z])/g, function(_, n, u) {
        var x = parseFloat(n), c = u.charAt(0);
        total += c === 'w' ? x * 10080 : c === 'd' ? x * 1440 : c === 'h' ? x * 60 : x;
        found = true;
        return _;
    });
    return found ? Math.round(total) : null;
}

// "30 min, 1 day before" → {m30:true, m1440:true}; "none" → {}; unparseable → null
function parseReminders(v) {
    var s = String(v || '').trim().toLowerCase();
    if (!s) return null;
    if (/^(none|no|off|false|no reminders?|0 reminders?)$/.test(s)) return {};
    var out = {}, ok = false;
    s.split(/\s*(?:,|;|\band\b|&|\+)\s*/).forEach(function(part) {
        part = part.replace(/\b(before|prior|ahead|early|earlier|reminders?|alerts?|notifications?|notify|me)\b/g, ' ').replace(/\s+/g, ' ').trim();
        if (!part) return;
        if (/^(at (the )?(time|start)( of (the )?event)?|on time|at start|0)$/.test(part)) { out.m0 = true; ok = true; return; }
        var d = parseDuration(part);
        if (typeof d === 'number' && d >= 0 && d <= 40320) { out['m' + d] = true; ok = true; }
    });
    return ok ? out : null;
}

// ---------------------------------------------------------------- repeat rules
var FREQ_WORD = { day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' };
var ORDINAL_N = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5, last: -1 };

function parseRRule(s) {
    var body = String(s).replace(/^\s*RRULE\s*:\s*/i, '');
    var kv = {};
    body.split(/[;\s]+/).forEach(function(part) {
        var i = part.indexOf('=');
        if (i > 0) kv[part.slice(0, i).trim().toUpperCase()] = part.slice(i + 1).trim();
    });
    var freq = String(kv.FREQ || '').toLowerCase();
    if (['daily', 'weekly', 'monthly', 'yearly'].indexOf(freq) === -1) return null;
    var rec = { freq: freq, interval: Math.max(1, parseInt(kv.INTERVAL, 10) || 1), byDay: '', monthlyMode: 'day', until: null, count: null };
    var anchor = null;
    if (kv.UNTIL) {
        var u = kv.UNTIL.match(/^(\d{4})(\d{2})(\d{2})/);
        if (u) rec.until = safeYMD(+u[1], +u[2], +u[3]);
    }
    if (kv.COUNT && +kv.COUNT > 0) rec.count = Math.min(999, +kv.COUNT);
    if (kv.BYDAY) {
        var days = kv.BYDAY.split(',');
        if (freq === 'monthly' && days.length === 1) {
            var bm = days[0].match(/^([+-]?\d)?([A-Z]{2})$/i);
            if (bm && bm[1]) {
                var n = +bm[1], wd = DOW_CODES.indexOf(bm[2].toUpperCase());
                if (wd >= 0) {
                    anchor = n < 0 ? { mode: 'last', wd: wd } : { mode: 'nth', n: n, wd: wd };
                    rec.monthlyMode = anchor.mode;
                }
            }
        } else {
            rec.byDay = days.map(function(d) { return d.replace(/^[+-]?\d/, '').toUpperCase(); })
                .filter(function(c) { return DOW_CODES.indexOf(c) !== -1; }).join(',');
            if (freq !== 'weekly') rec.byDay = '';
        }
    }
    if (kv.BYMONTHDAY && freq === 'monthly' && +kv.BYMONTHDAY >= 1 && +kv.BYMONTHDAY <= 31) {
        anchor = { mode: 'day', day: +kv.BYMONTHDAY };
        rec.monthlyMode = 'day';
    }
    return { rec: rec, anchor: anchor, forSpan: null };
}

// Plain-English repeat rule → { rec, anchor, forSpan } ; {rec:null} = explicitly none ; null = unparseable
function parseRepeat(v, today) {
    var raw = String(v || '').trim();
    if (!raw) return null;
    var low = raw.toLowerCase().replace(/\s+/g, ' ');
    if (/^(none|no|never|once|one[- ]time|does ?n[o']t repeat|do not repeat|n\/a|false|-)$/.test(low)) return { rec: null, anchor: null, forSpan: null };
    if (/freq\s*=/.test(low)) return parseRRule(raw);
    var rec = { freq: null, interval: 1, byDay: '', monthlyMode: 'day', until: null, count: null };
    var anchor = null, forSpan = null, m;
    var um = low.match(/\b(?:until|till|thru|through|ending(?: on)?|ends(?: on)?)\s+(.+)$/);
    if (um) {
        var ud = findDateInText(um[1], today || getLocalDateString());
        if (ud) rec.until = ud.date;
        low = low.slice(0, um.index).trim();
    }
    var cm = low.match(/\b(?:for\s+)?(\d{1,3})\s*(?:times|occurrences|sessions|x)(?![a-z])/) || low.match(/\bx\s*(\d{1,3})\b/) || low.match(/\bcount\s*[:=]?\s*(\d{1,3})\b/);
    if (cm) { rec.count = Math.min(999, Math.max(1, +cm[1])); low = low.replace(cm[0], ' '); }
    var fs = low.match(/\bfor\s+(\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/);
    if (fs) { forSpan = { n: wordNumber(fs[1]), unit: fs[2].replace(/s$/, '') }; low = low.replace(fs[0], ' '); }

    if ((m = low.match(/\bevery\s+other\s+(day|week|month|year)\b/))) { rec.freq = FREQ_WORD[m[1]]; rec.interval = 2; }
    else if (/\bevery\s+other\s+(?:sun|mon|tue|wed|thu|fri|sat)/.test(low)) { rec.freq = 'weekly'; rec.interval = 2; } // "every other wed" (byDay filled below)
    else if ((m = low.match(/\bevery\s+(\d{1,2}|two|three|four|five|six)\s+(days?|weeks?|months?|years?)\b/))) { rec.freq = FREQ_WORD[m[2].replace(/s$/, '')]; rec.interval = wordNumber(m[1]); }
    else if (/\b(bi-?weekly|fortnightly)\b/.test(low)) { rec.freq = 'weekly'; rec.interval = 2; }
    else if (/\b(every ?weekday|each weekday|weekdays|mon(?:day)?\s*(?:-|–|to|thru|through)\s*fri(?:day)?|m-f)\b/.test(low)) { rec.freq = 'weekly'; rec.byDay = 'MO,TU,WE,TH,FR'; }
    else if (/\b(daily|every ?day|each day|nightly)\b/.test(low)) rec.freq = 'daily';
    else if (/\b(weekly|every week|each week)\b/.test(low)) rec.freq = 'weekly';
    else if (/\b(monthly|every month|each month)\b/.test(low)) rec.freq = 'monthly';
    else if (/\b(yearly|annually|annual|every year|each year)\b/.test(low)) rec.freq = 'yearly';

    var nth = low.match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\s+(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
    if (nth && (!rec.freq || rec.freq === 'monthly')) {
        var n = ORDINAL_N[nth[1]], wd = weekdayFromWord(nth[2]);
        rec.freq = 'monthly';
        anchor = n === -1 ? { mode: 'last', wd: wd } : { mode: 'nth', n: n, wd: wd };
        rec.monthlyMode = anchor.mode;
    } else if (rec.freq === 'monthly' && (m = low.match(/\b(?:on\s+(?:the\s+)?(?:day\s+)?|the\s+|day\s+)(\d{1,2})(?:st|nd|rd|th)?\b/))) {
        var day = +m[1];
        if (day >= 1 && day <= 31) { anchor = { mode: 'day', day: day }; rec.monthlyMode = 'day'; }
    }
    if (!rec.byDay && (!rec.freq || rec.freq === 'weekly') && !nth) {
        var wds = low.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/g);
        if (wds && wds.length) {
            var set = {};
            wds.forEach(function(w) { var i = weekdayFromWord(w); if (i !== null) set[i] = true; });
            var codes = [0, 1, 2, 3, 4, 5, 6].filter(function(i) { return set[i]; }).map(function(i) { return DOW_CODES[i]; });
            if (codes.length) { rec.freq = 'weekly'; rec.byDay = codes.join(','); }
        }
    }
    if (!rec.freq) return null;
    return { rec: rec, anchor: anchor, forSpan: forSpan };
}

// Move a series start onto its first real occurrence (weekly by-day / monthly anchors)
function alignStartToRecurrence(start, rec, anchor) {
    if (!rec || !isValidYMD(start)) return start;
    if (rec.freq === 'weekly' && rec.byDay) {
        var codes = rec.byDay.split(',');
        for (var i = 0; i < 7; i++) {
            var d = addDays(start, i);
            if (codes.indexOf(DOW_CODES[weekdayOf(d)]) !== -1) return d;
        }
        return start;
    }
    if (rec.freq === 'monthly' && anchor) {
        var p = ymdParts(start);
        for (var k = 0; k < 36; k++) {
            var q = ymdParts(addMonths(makeYMD(p.y, p.m, 1), k));
            var day = anchor.mode === 'day' ? (anchor.day <= daysInMonth(q.y, q.m - 1) ? anchor.day : null)
                : anchor.mode === 'last' ? lastWeekdayOfMonth(q.y, q.m, anchor.wd)
                : nthWeekdayOfMonth(q.y, q.m, anchor.wd, anchor.n);
            if (day) {
                var cand = makeYMD(q.y, q.m, day);
                if (cand >= start) return cand;
            }
        }
    }
    return start;
}

function untilFromSpan(start, forSpan) {
    if (!forSpan || !forSpan.n) return null;
    var end = forSpan.unit === 'day' ? addDays(start, forSpan.n)
        : forSpan.unit === 'week' ? addDays(start, 7 * forSpan.n)
        : forSpan.unit === 'month' ? addMonths(start, forSpan.n)
        : addMonths(start, 12 * forSpan.n);
    return addDays(end, -1);
}

// ---------------------------------------------------------------- scalar values
function parseStatus(v) {
    var s = String(v || '').trim().toLowerCase();
    if (/^(done|yes|y|true|complete|completed|finished|x|\[x\]|✓|✔|✅|checked|1|attended)$/.test(s)) return true;
    if (/^(no|n|false|open|pending|todo|to do|not done|incomplete|undone|0|reopen|reopened|\[ \]|scheduled|upcoming)$/.test(s)) return false;
    return null;
}

function parsePriority(v) {
    var s = String(v || '').trim().toLowerCase();
    if (/^(high|urgent|important|critical|asap|!!!|p1|1|top)$/.test(s)) return 'high';
    if (/^(medium|med|normal|moderate|!!|p2|2)$/.test(s)) return 'medium';
    if (/^(low|minor|someday|!|p3|3)$/.test(s)) return 'low';
    return null;
}

function parseTypeValue(v) {
    var s = String(v || '').trim().toLowerCase();
    if (/^(event|events|meeting|class|lecture|exam|social)$/.test(s)) return 'event';
    if (/^(task|tasks|todo|to-do|to do|reminder|chore)$/.test(s)) return 'task';
    if (/^(deadline|deadlines|due|assignment|submission)$/.test(s)) return 'deadline';
    if (/^(appointment|appointments|appt|appts|apt|apts|patient|clinic|pt)$/.test(s)) return 'appointment';
    return null;
}

function parseBool(v) {
    var s = String(v || '').trim().toLowerCase();
    if (/^(yes|y|true|1|on|all ?day)$/.test(s)) return true;
    if (/^(no|n|false|0|off|timed)$/.test(s)) return false;
    return null;
}

// "Doe, Jane A." == "jane doe" — order-free, initials dropped
function canonPersonName(n) {
    var s = String(n || '').toLowerCase().replace(/\(.*?\)/g, ' ').trim();
    if (s.indexOf(',') !== -1) {
        var parts = s.split(',');
        s = parts.slice(1).join(' ') + ' ' + parts[0];
    }
    var toks = s.replace(/['’`-]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function(t) { return t.length > 1; });
    return toks.sort().join(' ');
}

function normChart(c) {
    var s = String(c || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
    return s.replace(/^0+(?=.)/, '');
}

function normTitle(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

// ---------------------------------------------------------------- quick add
// weekday lists: "mon, wed & fri" / "mon/wed/fri" / "mon wed fri" / "monday wednesday and friday"
var WEEKDAY_LIST_SEP_SRC = '(?:\\s*[,&\\/]\\s*|\\s+)(?:and\\s+)?';
var REPEAT_PHRASE_RE = new RegExp(
    '\\b(?:every\\s+(?:other\\s+)?(?:\\d{1,2}\\s+)?(?:(?:first|second|third|fourth|last|1st|2nd|3rd|4th)\\s+)?' +
    '(?:days?|weeks?|months?|years?|weekdays?|' + WEEKDAY_SRC + '(?:' + WEEKDAY_LIST_SEP_SRC + WEEKDAY_SRC + '\\b)*)' +
    '|daily|weekly|monthly|yearly|annually|bi-?weekly|on weekdays|weekdays)' +
    '(?:\\s+on\\s+(?:the\\s+)?(?:(?:first|second|third|fourth|last|1st|2nd|3rd|4th)\\s+' + WEEKDAY_SRC + '|\\d{1,2}(?:st|nd|rd|th)?|' + WEEKDAY_SRC + '(?:' + WEEKDAY_LIST_SEP_SRC + WEEKDAY_SRC + '\\b)*))?' +
    '(?:\\s+(?:until|till)\\s+(?:' + MONTH_NAME_SRC + '\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?|\\d{4}-\\d{2}-\\d{2}))?' +
    '(?:\\s+(?:for\\s+)?\\d{1,3}\\s+(?:times|weeks|days|months))?', 'i');

// Plain color words the quick-add box understands (palette names need a cue:
// "color mango", "#mango"). blue → Cobalt so it stands out from Personal's Peacock.
var QUICK_COLOR_WORDS = {
    'red': 'tomato', 'dark red': 'radicchio', 'orange': 'tangerine', 'dark orange': 'pumpkin', 'yellow': 'banana', 'gold': 'mango',
    'green': 'basil', 'dark green': 'basil', 'light green': 'sage', 'lime': 'pistachio', 'mint': 'sage',
    'teal': 'eucalyptus', 'turquoise': 'eucalyptus', 'blue': 'cobalt', 'light blue': 'peacock', 'sky blue': 'peacock',
    'dark blue': 'blueberry', 'navy': 'blueberry', 'navy blue': 'blueberry', 'indigo': 'blueberry',
    'purple': 'grape', 'violet': 'grape', 'light purple': 'lavender', 'lavender': 'lavender', 'lilac': 'wisteria',
    'pink': 'flamingo', 'hot pink': 'cherryblossom', 'magenta': 'radicchio',
    'gray': 'graphite', 'grey': 'graphite', 'black': 'graphite', 'brown': 'cocoa'
};
function quickColorKey(w) {
    var k = String(w || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (QUICK_COLOR_WORDS[k]) return QUICK_COLOR_WORDS[k];
    var flat = k.replace(/[^a-z]/g, '');
    return CAL_COLORS[flat] ? flat : null;
}

// "… lecture blue" / "Blue: ippm lecture" / "color mango" / "in green" → { color, s } with
// the words cut out. A bare color word only counts at the edge of a phrase
// (start, end, or next to a date/time that was cut) and never inside a name:
// "Red Sox", "Dr. Green", "Green Street" stay in the title.
function extractQuickColor(s) {
    var palette = Object.keys(CAL_COLORS).concat(['cherry blossom']).join('|');
    var basic = Object.keys(QUICK_COLOR_WORDS).sort(function(a, b) { return b.length - a.length; }).join('|').replace(/ /g, '\\s+');
    var cue = s.match(new RegExp('\\b(?:colou?r(?:ed)?|make\\s+it|mark\\s+(?:it\\s+)?)\\s*[:=]?\\s*(' + basic + '|' + palette + ')\\b', 'i')) ||
        s.match(new RegExp('\\b(' + basic + '|' + palette + ')\\s+colou?r(?:ed)?\\b', 'i'));
    if (cue && quickColorKey(cue[1])) return { color: quickColorKey(cue[1]), s: s.slice(0, cue.index) + '  ' + s.slice(cue.index + cue[0].length) };
    var words = [], re = /[^\s,]+/g, mm, lastEnd = 0;
    while ((mm = re.exec(s))) {
        var gap = s.slice(lastEnd, mm.index);
        words.push({ w: mm[0], start: mm.index, end: mm.index + mm[0].length, brk: !words.length || /\s{2,}|,/.test(gap) });
        lastEnd = re.lastIndex;
    }
    var best = null;
    for (var i = 0; i < words.length; i++) {
        var j = i, key = null;
        if (i + 1 < words.length && !words[i + 1].brk && QUICK_COLOR_WORDS[(words[i].w + ' ' + words[i + 1].w).toLowerCase()]) { j = i + 1; key = QUICK_COLOR_WORDS[(words[i].w + ' ' + words[i + 1].w).toLowerCase()]; }
        else key = QUICK_COLOR_WORDS[words[i].w.toLowerCase().replace(/[.!?:;]+$/, '')] || null;
        if (!key) continue;
        var from = i;
        if (i > 0 && !words[i].brk && /^(in|as)$/i.test(words[i - 1].w)) from = i - 1;
        var atStart = words[from].brk, atEnd = j === words.length - 1 || words[j + 1].brk;
        if (!atStart && !atEnd) continue;
        if (i > 0 && !words[i].brk && /^(dr|mr|mrs|ms|prof|st|mt|coach)\.?$/i.test(words[i - 1].w)) continue;
        var cap = /^[A-Z]/.test(words[i].w);
        if (cap && ((j + 1 < words.length && !words[j + 1].brk && /^[A-Z]/.test(words[j + 1].w)) || (i > 0 && !words[i].brk && /^[A-Z]/.test(words[i - 1].w)))) continue;
        if (words.length - (j - from + 1) < 1) continue; // never eat the whole title
        best = { color: key, a: words[from].start, b: words[j].end };
        i = j; // "light blue" is one color, not "light" + blue
    }
    if (!best) return null;
    return { color: best.color, s: s.slice(0, best.a) + '  ' + s.slice(best.b) };
}

// "remind me 10 min before" / "alert 1 hour" / "reminder the day before" → minutes; "no reminder" → -1
var QUICK_REMINDER_RE = /\b(?:no\s+(?:reminders?|alerts?|notifications?))\b|\b(?:remind(?:er)?(?:\s+me)?|alert(?:\s+me)?|notify(?:\s+me)?|notification)\s+(?:(\d+(?:\.\d+)?)\s*(m|mins?|minutes?|h|hrs?|hours?|d|days?|w|wks?|weeks?)|(an?|one)\s+(hour|day|week)|(half\s+an\s+hour)|(the\s+(?:day|night)|a\s+day))(?:\s+(?:before|prior|early|ahead|in\s+advance|beforehand))?(?![a-z])/i;
function quickReminderMinutes(m) {
    if (/^no\s/i.test(m[0])) return -1;
    if (m[1]) { var n = parseFloat(m[1]), u = m[2].toLowerCase()[0]; return Math.round(n * (u === 'm' ? 1 : u === 'h' ? 60 : u === 'd' ? 1440 : 10080)); }
    if (m[4]) return m[4].toLowerCase() === 'hour' ? 60 : m[4].toLowerCase() === 'day' ? 1440 : 10080;
    if (m[5]) return 30;
    return 1440;
}

var PART_OF_DAY_MIN = { morning: 9 * 60, afternoon: 14 * 60, evening: 18 * 60, night: 20 * 60 };
var QA_WD = '(?:sun(?:day)?s?|mon(?:day)?s?|tue(?:s(?:day)?)?s?|wed(?:s|nesday)?s?|thu(?:r(?:s(?:day)?)?)?s?|fri(?:day)?s?|sat(?:urday)?s?)';
var QA_WD_LIST = QA_WD + '(?:(?:\\s*[,&\\/]\\s*|\\s+)(?:and\\s+)?' + QA_WD + ')*';
var SCHOOL_DAYS = { mwf: 'MO,WE,FR', 'm/w/f': 'MO,WE,FR', mw: 'MO,WE', 'm/w': 'MO,WE', tth: 'TU,TH', 't/th': 'TU,TH', 'tu/th': 'TU,TH', 'tue/thu': 'TU,TH', 'tues/thurs': 'TU,TH', 'tue/thurs': 'TU,TH', 'tues/thu': 'TU,TH' };
function weekdayCodesIn(text) {
    var set = {};
    (String(text).toLowerCase().match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/g) || []).forEach(function(w) { var i = weekdayFromWord(w); if (i !== null) set[i] = true; });
    return [0, 1, 2, 3, 4, 5, 6].filter(function(i) { return set[i]; }).map(function(i) { return DOW_CODES[i]; }).join(',');
}
function weeklyRepeat(byDay) { return { rec: { freq: 'weekly', interval: 1, byDay: byDay, monthlyMode: 'day', until: null, count: null }, anchor: null, forSpan: null }; }
function dailyRepeat() { return { rec: { freq: 'daily', interval: 1, byDay: '', monthlyMode: 'day', until: null, count: null }, anchor: null, forSpan: null }; }
// a weekday that is a real day name even when bare — "sat"/"sun" alone are ordinary words
var QA_WD_STRICT = '(?:sun(?:day)?s|sunday|mon(?:day)?s?|tue(?:s(?:day)?)?s?|wed(?:s|nesday)?s?|thu(?:r(?:s(?:day)?)?)?s?|fri(?:day)?s?|sat(?:urday)?s|saturday)';
var QA_WD_LIST_STRICT = QA_WD_STRICT + '(?:(?:\\s*[,&\\/]\\s*|\\s+)(?:and\\s+)?' + QA_WD_STRICT + ')+';
var QA_WD_RANGE_SRC = '(' + QA_WD + ')\\s*(?:-|–|—|to|thru|through)\\s*(' + QA_WD + ')';
// "mon-fri" / "tue thru thu" → every day in between
function weekdayRangeCodes(a, b) {
    var i = weekdayFromWord(a), j = weekdayFromWord(b);
    if (i === null || j === null || i === j) return '';
    var out = [];
    for (var k = i; out.length < 7; k = (k + 1) % 7) { out.push(k); if (k === j) break; }
    return [0, 1, 2, 3, 4, 5, 6].filter(function(x) { return out.indexOf(x) !== -1; }).map(function(x) { return DOW_CODES[x]; }).join(',');
}
// match of "(every )?<wd> - <wd>|m-f" → codes when it means a repeat: mon–fri always, other spans only after "every"
function rangeRepeatCodes(m) {
    if (!m[2]) return 'MO,TU,WE,TH,FR';
    var codes = weekdayRangeCodes(m[2], m[3]);
    return codes && (codes === 'MO,TU,WE,TH,FR' || /^every/i.test(m[1] || '')) ? codes : '';
}

// Typing / dictation cleanup shared by quick add and the schedule reader:
// "a.m." → "am", "nov29" → "nov 29", "11/17-11/29" → "11/17 - 11/29", "nov 17 to the 29th" → "nov 17 to 29th"
function tidyQuickText(text, today) {
    var s = String(text || '').replace(/\s+/g, ' ').trim()
        .replace(/(^|[\d\s])([ap])\.m\.?(?=[\s,;.]|$)/gi, '$1$2m')
        .replace(new RegExp('\\b' + MONTH_NAME_SRC + '\\.?(\\d{1,2})(st|nd|rd|th)?(?![\\d:])', 'gi'), '$1 $2$3')
        .replace(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–—]\s*(?=\d{1,2}\/\d)/g, '$1 - ')
        .replace(new RegExp('(\\b' + MONTH_NAME_SRC + '\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\s+(?:to|through|thru|-|until|till))\\s+the\\s+(?=\\d)', 'gi'), '$1 ');
    // "until the 15th" — the next 15th from today
    if (today) {
        s = s.replace(/\b(until|till|thru|through|ending|ends|before|from|starting|beginning|after|on)\s+the\s+(\d{1,2})(st|nd|rd|th)\b/gi, function(all, kw, d, suf) {
            var p = ymdParts(today), mo = +d >= p.d ? p.m : p.m % 12 + 1;
            return +d >= 1 && +d <= 31 ? kw + ' ' + MONTHS_SHORT[mo - 1].toLowerCase() + ' ' + d + suf : all;
        });
    }
    return s;
}

// "except nov 26" / "no class nov 11 and 25" / "skip 12/24-12/31" → { dates[], s } with the words cut out
var QUICK_EXCEPT_RE = /\s(?:except(?:\s+(?:for|on))?|excluding|exclude|not\s+on|skip(?:ping)?(?:\s+on)?|but\s+not(?:\s+on)?|no\s+(?:class(?:es)?|lectures?|labs?|sessions?|meetings?|clinic|school|gym|practice)(?:\s+on)?|off\s+on|cancell?ed\s+on)\s+/i;
function extractQuickExceptions(s, today) {
    var m = s.match(QUICK_EXCEPT_RE);
    if (!m) return null;
    var pos = m.index + m[0].length, tail = s.slice(pos);
    var cands = listDateCandidates(tail, today).filter(function(c) { return c.tier <= 1; });
    var dates = [], at = 0, last = null;
    function addSpan(a, b) {
        for (var d = a, n = 0; d <= b && n < 62; d = addDays(d, 1), n++) dates.push(d);
    }
    for (var guard = 0; guard < 20; guard++) {
        var gap = tail.slice(at).match(dates.length ? /^\s*(?:,|&|\+|\band\b|\bor\b)?\s*(?:\band\b)?\s*/i : /^\s*/)[0];
        var p = at + gap.length;
        var c = cands.filter(function(x) { return x.index === p; })[0];
        if (c) {
            var end = c.endDate || null, stop = c.index + c.length;
            var nx = cands.filter(function(x) { return x.index > stop; })[0];
            if (!end && nx && new RegExp('^' + RANGE_SEP_SRC + '$', 'i').test(tail.slice(stop, nx.index)) && nx.date > c.date) { end = nx.date; stop = nx.index + nx.length; }
            if (end) addSpan(c.date, end); else dates.push(c.date);
            last = c.date; at = stop;
            continue;
        }
        // "nov 26 and 27" — a bare day keeps the month before it
        var dm = last && tail.slice(p).match(/^(\d{1,2})(?:st|nd|rd|th)?(?![\d:\/])(?!\s*(?:[ap]\.?m|o'?clock)\b)/i);
        if (dm) {
            var lp = ymdParts(last), dd = safeYMD(lp.y, lp.m, +dm[1]);
            if (dd) { dates.push(dd); at = p + dm[0].length; continue; }
        }
        break;
    }
    if (!dates.length) return null;
    var seen = {};
    dates = dates.filter(function(d) { if (seen[d]) return false; seen[d] = 1; return true; }).sort();
    return { dates: dates, s: s.slice(0, m.index) + '  ' + s.slice(pos + at) };
}

// One line of free text → event fields. Never throws.
// "Lunch w/ Sam tomorrow 12-1pm @ Cafe #personal", "task: submit PR2 fri 5pm !!!",
// "Perio rounds every tue 8am until 12/15", "Board review Nov 5-7 #school"
function parseQuickAdd(text, today, opts) {
    opts = opts || {};
    today = today || getLocalDateString();
    var s = ' ' + tidyQuickText(text, today) + ' ';
    var out = {
        type: opts.type || null, title: '', date: null, endDate: null, start: null, end: null,
        allDay: false, durationMin: null, repeat: null, calendarRef: null, location: '', priority: null, chips: [],
        color: null, notes: '', reminder: null, exdates: []
    };
    function cutAt(idx, len) {
        var before = s.slice(0, idx).replace(/(?:\b(?:on|at|from|by|starting|due)|@)\s*$/i, '');
        s = before + '  ' + s.slice(idx + len); // double space marks a cut (color-word edge detection)
    }
    // dictation: "…at 3 PM." — a trailing period is punctuation, not a token
    s = s.replace(/([^.])\.+\s*$/, '$1 ');
    // bare "sat"/"sun" are ordinary words for the date scanner — here, next to a time or at the end, they're days
    s = s.replace(/\b(sat|sun)\b(?=\s+(?:\d|all[\s-]?day|morning|afternoon|evening|night|noon|midnight)|[\s,]*$)/gi, function(w) { return w.toLowerCase() === 'sat' ? 'saturday' : 'sunday'; });
    // "pt Moe 8:30" / "apt Sarah K 4pm" → patient appointment (clinic length, e.g. 3 h)
    var m = s.match(/^\s*(task|todo|to-do|deadline|due|appt|apt|pt|patient|appointment|event|reminder)\s*[:\-–]\s*/i) ||
        s.match(/^\s*(task|todo|to-do|deadline|reminder|pt|apt|appt|patient)\s+(?=\S)/i);
    if (m) {
        out.type = parseTypeValue(m[1]) || 'task';
        s = ' ' + s.slice(m[0].length);
    } else if ((m = s.match(/^\s*remind\s+me\s+to\s+/i))) {
        out.type = 'task';
        s = ' ' + s.slice(m[0].length);
    }
    // "… // bring insurance card" → notes
    m = s.match(/\s(?:\/\/|--|notes?:)\s*(\S.*)$/i);
    if (m) { out.notes = m[1].trim(); s = s.slice(0, m.index) + ' '; }
    // "except nov 26" — skipped occurrences, cut before any date scan sees them
    for (var xg = 0; xg < 4; xg++) {
        var qx = extractQuickExceptions(s, today);
        if (!qx) break;
        out.exdates = out.exdates.concat(qx.dates);
        s = qx.s;
    }
    m = s.match(QUICK_REMINDER_RE);
    if (m) { out.reminder = quickReminderMinutes(m); cutAt(m.index, m[0].length); }
    // "in 2 hours" / "in 30 min" → starts that long from now
    m = s.match(/\bin\s+(\d+(?:\.\d+)?|an?|one|half\s+an?)\s*(m|mins?|minutes?|h|hrs?|hours?)(?![a-z])/i);
    if (m) {
        var qty = /^half/i.test(m[1]) ? 0.5 : /^(an?|one)$/i.test(m[1]) ? 1 : parseFloat(m[1]);
        var addMin = Math.round(qty * (/^h/i.test(m[2]) ? 60 : 1));
        if (addMin > 0 && addMin <= 48 * 60) {
            var at = new Date((opts.nowMs || Date.now()) + addMin * 60000);
            var rounded = Math.ceil((at.getHours() * 60 + at.getMinutes()) / 5) * 5;
            out._relDate = getLocalDateString(at);
            out._relStart = Math.min(rounded, 1439);
            cutAt(m.index, m[0].length);
        }
    }
    // "tues mornings" / "mon & wed evenings" → weekly on those days at that part of the day
    var partOfDay = null;
    m = s.match(new RegExp('\\b(' + QA_WD_LIST + ')\\s+(morning|afternoon|evening|night)s\\b', 'i'));
    if (m && weekdayCodesIn(m[1])) { out.repeat = weeklyRepeat(weekdayCodesIn(m[1])); partOfDay = PART_OF_DAY_MIN[m[2].toLowerCase()]; cutAt(m.index, m[0].length); }
    // "tomorrow morning" / "this afternoon" / "friday night" → a time hint (the day word stays for the date scan)
    m = s.match(new RegExp('\\b(this|tomorrow|tonight|today|in\\s+the|' + QA_WD + ')\\s+(morning|afternoon|evening|night)\\b', 'i'));
    if (m) {
        if (partOfDay === null) partOfDay = PART_OF_DAY_MIN[m[2].toLowerCase()];
        var keepWord = /^(this|in\s+the)$/i.test(m[1]) ? (/^this$/i.test(m[1]) ? ' today ' : ' ') : ' ' + m[1] + ' ';
        s = s.slice(0, m.index) + keepWord + s.slice(m.index + m[0].length);
    }
    m = s.match(/\s#([A-Za-z0-9][\w-]*)/);
    if (m) { out.calendarRef = m[1].replace(/[-_]+/g, ' '); cutAt(m.index, m[0].length); out.chips.push('#' + m[1]); }
    m = s.match(/\s!(high|urgent|medium|med|low)\b/i) || s.match(/\s(!{1,3})(?=\s)/);
    if (m) { out.priority = parsePriority(m[1]); cutAt(m.index, m[0].length); }
    m = s.match(/\s@\s*([^#!@]+?)\s*$/);
    if (m) { out.location = m[1].trim(); s = s.slice(0, m.index) + ' '; out.chips.push('@ ' + out.location); }
    // "mon-fri" / "m-f" / "every tue thru thu" — before "every tue" can claim the first day ("conference wed-fri" stays a 3-day event)
    m = out.repeat ? null : s.match(new RegExp('(?:^|\\s)(every\\s+|on\\s+)?(?:' + QA_WD_RANGE_SRC + '|m-f)(?![a-z])', 'i'));
    if (m && rangeRepeatCodes(m)) { out.repeat = weeklyRepeat(rangeRepeatCodes(m)); cutAt(m.index, m[0].length); out.chips.push(m[0].trim()); }
    m = out.repeat ? null : s.match(REPEAT_PHRASE_RE);
    if (m) {
        var rp = parseRepeat(m[0], today);
        if (rp && rp.rec) { out.repeat = rp; cutAt(m.index, m[0].length); out.chips.push(m[0].trim()); }
    }
    if (!out.repeat) {
        // class schedules: "MWF" / "T/Th"; plural days: "tuesdays and thursdays"
        m = s.match(/(?:^|\s)(mwf|m\/w\/f|mw|m\/w|tth|t\/th|tu\/th|tue\/thu|tues\/thurs|tue\/thurs|tues\/thu)(?=\s|$|,)/i);
        if (m) { out.repeat = weeklyRepeat(SCHOOL_DAYS[m[1].toLowerCase()]); cutAt(m.index, m[0].length); }
        else if ((m = s.match(/\b(?:sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays)(?:(?:\s*[,&\/]\s*|\s+)(?:and\s+)?(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)*\b/i))) {
            out.repeat = weeklyRepeat(weekdayCodesIn(m[0]));
            cutAt(m.index, m[0].length);
        }
        // two or more bare day names: "tue wed 9-11am", "tue, thu, fri", "mon & wed"
        else if ((m = s.match(new RegExp('(?:^|\\s)(?:on\\s+)?(' + QA_WD_LIST_STRICT + ')(?![a-z])', 'i'))) && weekdayCodesIn(m[1]).indexOf(',') !== -1) {
            out.repeat = weeklyRepeat(weekdayCodesIn(m[1]));
            cutAt(m.index, m[0].length);
        }
    }
    // "every morning" — daily, or just the time hint when the days are already known
    m = s.match(/\b(?:every|each)\s+(morning|afternoon|evening|night)\b/i);
    if (m) {
        if (partOfDay === null) partOfDay = PART_OF_DAY_MIN[m[1].toLowerCase()];
        if (!out.repeat) {
            var wdc = weekdayCodesIn(s.replace(m[0], ' '));
            out.repeat = wdc ? weeklyRepeat(wdc) : { rec: { freq: 'daily', interval: 1, byDay: '', monthlyMode: 'day', until: null, count: null }, anchor: null, forSpan: null };
        }
        cutAt(m.index, m[0].length);
    }
    // "on my school calendar" / "to work cal"
    m = out.calendarRef ? null : s.match(/\s(?:on|in|to|into|for)\s+(?:my\s+|the\s+)?([a-z][a-z0-9&'-]*(?:\s+[a-z][a-z0-9&'-]*)?)\s+cal(?:endar)?\b/i);
    if (m) { out.calendarRef = m[1]; cutAt(m.index, m[0].length); }
    // "ortho tue 9am until dec 18" — one day name running until a date repeats weekly on it
    if (!out.repeat) {
        var su = s.match(/\s(?:until|till|thru|through|ending|ends)\s+/i);
        var sw = su && s.slice(0, su.index).match(new RegExp('(^|\\s)(?:on\\s+|every\\s+)?(' + QA_WD_STRICT + ')(?![a-z])', 'i'));
        if (sw && !/\b(?:next|this|coming)\s*$/i.test(s.slice(0, sw.index + sw[1].length)) &&
            !listDateCandidates(s.slice(sw.index + sw[0].length), today).some(function(c) { return c.tier === 0 && /^[\s,]*$/.test(s.slice(sw.index + sw[0].length).slice(0, c.index)); })) {
            var sc = listDateCandidates(s.slice(su.index + su[0].length), today)[0];
            if (sc && sc.tier <= 1 && sc.index <= 1) {
                out.repeat = weeklyRepeat(DOW_CODES[weekdayFromWord(sw[2])]);
                cutAt(sw.index + sw[1].length, sw[0].length - sw[1].length);
            }
        }
    }
    // a detached "until <date>" belongs to the repeat rule, never to the event date
    var um = s.match(/\s(?:until|till|thru|through|ending|ends)\s+/i);
    if (out.repeat && out.repeat.rec && um) {
        var tail = s.slice(um.index + um[0].length);
        var ud = findDateInText(tail, today);
        if (ud && ud.index <= 1) {
            out.repeat.rec.until = ud.date;
            s = s.slice(0, um.index) + ' ' + tail.slice(ud.index + ud.length);
        }
    }
    // …and so does a detached "for 6 weeks" / "10 times" ("weekdays 7am for 6 weeks")
    if (out.repeat && out.repeat.rec && !out.repeat.rec.until && !out.repeat.rec.count && !out.repeat.forSpan) {
        m = s.match(/\s(?:for\s+)?(\d{1,3})\s*(?:times|sessions|occurrences)(?![a-z])/i);
        if (m) { out.repeat.rec.count = Math.min(999, Math.max(1, +m[1])); cutAt(m.index, m[0].length); }
        else if ((m = s.match(/\sfor\s+(\d{1,3}|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?|months?|years?)\b/i))) {
            out.repeat.forSpan = { n: wordNumber(m[1].toLowerCase()), unit: m[2].toLowerCase().replace(/s$/, '') };
            cutAt(m.index, m[0].length);
        }
    }
    if (/\bdue\b/i.test(s)) {
        if (!out.type) out.type = 'deadline';
        s = s.replace(/\bdue(?:\s+(?:on|by|at))?\b/i, ' ');
    }
    if (/\ball[\s-]?day\b/i.test(s)) { out.allDay = true; s = s.replace(/\ball[\s-]?day\b/ig, ' '); }
    m = s.match(/\bfor\s+((?:\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|half an?)\s*(?:h|hrs?|hours?|m|mins?|minutes?)(?:\s*(?:and\s+)?\d+\s*(?:m|mins?|minutes?))?)(?![a-z])/i);
    if (m) {
        var dur = parseDuration(m[1].replace(/^half an?\s*/i, '0.5 ').replace(/^([a-z]+)\s*/i, function(w, n) { return wordNumber(n) + ' '; }));
        if (typeof dur === 'number' && dur > 0) { out.durationMin = dur; cutAt(m.index, m[0].length); }
    }
    var d = findDateInText(s, today);
    if (d) {
        out.date = d.date;
        out.endDate = d.endDate;
        var spanEnd = d.rangeEndIndex !== undefined ? d.rangeEndIndex + d.rangeEndLength : d.index + d.length;
        if (d.rangeEndIndex !== undefined) {
            // keep times that sat between the two dates for the time scan
            var mid = s.slice(d.index + d.length, d.rangeEndIndex).replace(new RegExp(RANGE_SEP_SRC + '$', 'i'), ' ');
            s = s.slice(0, d.index).replace(/(?:\b(?:on|from|by|starting))\s*$/i, '') + ' ' + mid + ' ' + s.slice(spanEnd);
        } else {
            cutAt(d.index, d.length);
        }
        if (/\btonight\b/i.test(text) && out.start === null) out._tonight = true;
    }
    var t = scanTimes(s, true) || (out.repeat || opts.bareTimes ? bareTimeRange(s) : null);
    if (t) {
        out.start = t.start;
        out.end = t.end;
        cutAt(t.index, t.length);
    } else if (out._relStart !== undefined) {
        out.start = out._relStart;
        if (!d) out.date = out._relDate;
    } else if (partOfDay !== null && !out.allDay) {
        out.start = partOfDay;
    } else if (out._tonight) {
        out.start = 19 * 60;
    }
    delete out._tonight; delete out._relStart; delete out._relDate;
    if (opts.colors) {
        var qc = extractQuickColor(s);
        if (qc) { out.color = qc.color; s = qc.s; }
    }
    var title = s.replace(/\s+/g, ' ')
        .replace(/\s+,/g, ',').replace(/,(?:\s*,)+/g, ',')
        .replace(/^[\s,;:\-–—|]+|[\s,;:\-–—|]+$/g, '')
        .replace(/^(?:on|at|from|by|and|for|to)\s+/i, '')
        .replace(/\s+(?:on|at|from|by|and|in|-)$/i, '')
        .trim();
    out.title = title;
    if (!out.type) out.type = (/\b(submit|turn in|hand in|due|deadline)\b/i.test(text) && out.start === null) ? 'deadline' : 'event';
    if (!out.date) out.date = today;
    if (out.repeat && out.repeat.rec) out.date = alignStartToRecurrence(out.date, out.repeat.rec, out.repeat.anchor);
    return out;
}

// ---------------------------------------------------------------- quick add: schedules that change
// One sentence → several repeating series, each read by parseQuickAdd:
//   "xyz every tue, wed until nov 15 9-11am then from nov 17-nov 29 every tue, thu, fri 1-3pm"
//   "xyz every tue, wed until nov 15 then nov 17-29 tue thu fri. nov 15 ending dates 9-11am, nov 17-nov 29 dates 1-3pm"
//   "anatomy lecture mon wed 9-11am, lab fri 1-4pm until dec 18 except nov 27"
// Phases split at "then" / ";" / a sentence end / a new start or end date after a
// phase already has one; inside a phase every day group with its own time is its
// own series. A clause with a time but no days hands its time to the phase it
// names — by date ("nov 15 ending dates 9-11am"), by order ("second part 1-3pm"),
// by the same days ("tue/wed 9-11am") or in turn ("9-11am and 1-3pm respectively").
// A phase with no start begins the day after the one before it ends; one with its
// own title ("…, lab thu 1-3pm until dec 18") runs alongside instead.
// → { items: [parseQuickAdd-shaped], warnings[] } or null when it's one plain series.
var QS_CONNECTOR_RE = /[\s,]*(?:;|\b(?:and\s+|but\s+)?then\b|\b(?:and\s+)?after\s+that\b|\bafterwards?\b|\bthereafter\b|\bfollowed\s+by\b|\b(?:and\s+|but\s+)?(?:(?:it|that|this|the\s+class|class|the\s+schedule|schedule)\s+)?(?:switch(?:es)?|chang(?:es)?|turns?|moves?|shifts?)\s+(?:(?:in)?to|over\s+to)\b|\b(?:and\s+|but\s+)?(?:it|that|this)\s+becomes?\b)[\s,:]*/gi;
var QS_UNTIL_KW_RE = /(?:^|\s)(until|till|til|thru|through|ending(?:\s+on)?|ends?(?:\s+on)?|up\s+to|upto|to|before|by|last\s+(?:class|day|session|lecture|one)\s+(?:is\s+)?(?:on\s+)?)\s*$/i;
var QS_START_KW_RE = /(?:^|\s)(from|between|starting(?:\s+(?:on|from|the\s+week\s+of))?|starts?(?:\s+on)?|beginning(?:\s+(?:on|the\s+week\s+of))?|begins?(?:\s+on)?|commencing|as\s+of|effective|after|on|(?:the\s+)?week\s+of|first\s+(?:class|day|session|lecture)\s+(?:is\s+)?(?:on\s+)?)\s*$/i;
var QS_START_KW_WD_RE = /(?:^|\s)(from|starting(?:\s+on)?|starts?(?:\s+on)?|beginning(?:\s+on)?|begins?(?:\s+on)?|as\s+of|effective|after|until|till|thru|through|ending(?:\s+on)?|ends?(?:\s+on)?|before)\s*$/i;
var QS_DAYS_RE = new RegExp('(^|[^a-z\\/])((?:(?:every|each)\\s+(?:other\\s+)?|on\\s+)?(?:' + QA_WD_RANGE_SRC.replace(/\((?!\?)/g, '(?:') + '|' + QA_WD_LIST +
    '|m\\/w\\/f|mwf|m\\/w|mw|t\\/th|tu\\/th|tue\\/thu|tues\\/thurs|tue\\/thurs|tues\\/thu|tth|m-f|every\\s+weekday|weekdays|every\\s*day|daily)(?:\\s+(?:morning|afternoon|evening|night)s)?)(?![a-z\\/])', 'gi');
var QS_ORDINAL_RE = /(^|[^a-z])((?:for\s+)?(?:the\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|last|final|former|latter)\s+(?:part|phase|half|one|block|section|period|portion|stretch|chunk|leg|segment|set|stint|round|run)s?\b|for\s+the\s+(first|second|third|fourth|last|former|latter)(?![a-z]))/gi;
var QS_FILLER_RE = /\b(?:and|or|the|a|an|then|from|starting|start|until|till|for|on|at|in|of|to|it|its|they|class|classes|meets?|meeting|schedule|dates?|days?|ending|ends?|ones?|parts?|phase|half|block|period|portion|same|times?|both|all|each|every|respectively|order|after|that|this|those|these|is|are|will|be|now|instead|again|as|well|also|plus|with|weeks?|first|second|third|last|final|former|latter|instead|hours?)\b/gi;

function qsMeaningful(t) { return String(t || '').replace(QS_FILLER_RE, ' ').replace(/[^a-z0-9]+/gi, ' ').trim().length >= 2; }
function qsOrdinalN(w) {
    w = String(w || '').toLowerCase();
    return /^(first|1st|former)$/.test(w) ? 1 : /^(second|2nd)$/.test(w) ? 2 : /^(third|3rd)$/.test(w) ? 3 : /^(fourth|4th)$/.test(w) ? 4 : -1;
}
function qsDayCodes(txt) {
    var t = String(txt).toLowerCase().replace(/^(?:(?:every|each)\s+(?:other\s+)?|on\s+)/, '').replace(/\s+(?:morning|afternoon|evening|night)s$/, '').trim();
    if (SCHOOL_DAYS[t]) return SCHOOL_DAYS[t];
    if (/^(?:every\s*day|daily)$/.test(t)) return 'daily';
    if (t === 'm-f' || /weekday/.test(t)) return 'MO,TU,WE,TH,FR';
    var r = t.match(new RegExp('^' + QA_WD_RANGE_SRC + '$', 'i'));
    if (r) return weekdayRangeCodes(r[1], r[2]);
    return weekdayCodesIn(t);
}
function qsUnionCodes(a, b) {
    if (a === 'daily' || b === 'daily') return 'daily';
    var set = {};
    (a + ',' + b).split(',').forEach(function(c) { if (c) set[c] = 1; });
    return DOW_CODES.filter(function(c) { return set[c]; }).join(',');
}
function qsFmt(d) { var p = ymdParts(d); return MONTHS_SHORT[p.m - 1] + ' ' + p.d; }

// Every schedule word in s, in order: conn | date (start / until / range / bare) | days | time | ord
function qsScanAtoms(s, today, respectively) {
    var atoms = [], taken = [], m;
    function free(a, b) { return !taken.some(function(t) { return a < t[1] && b > t[0]; }); }
    function claim(x) { atoms.push(x); taken.push([x.index, x.index + x.length]); }
    QS_CONNECTOR_RE.lastIndex = 0;
    while ((m = QS_CONNECTOR_RE.exec(s))) {
        if (!m[0].length) { QS_CONNECTOR_RE.lastIndex++; continue; }
        claim({ kind: 'conn', index: m.index, length: m[0].length, then: !/^[\s,]*;/.test(m[0]) });
    }
    var pr = /\.+(?=\s|$)/g;
    while ((m = pr.exec(s))) {
        var w = (s.slice(0, m.index).match(/([a-z]+)$/i) || [])[1] || '';
        if (/^(?:dr|mr|mrs|ms|st|prof|mt|jr|sr|vs|ave|rd|apt|rm|no|approx|etc|wk|wks|hr|hrs|min|mins)$/i.test(w)) continue;
        var e = m.index + m[0].length;
        while (s.charAt(e) === ' ') e++;
        if (free(m.index, e)) claim({ kind: 'conn', index: m.index, length: e - m.index, then: false });
    }
    // weekday spans first, so "mon through fri" is never an end date
    var wr = new RegExp('(^|[^a-z])((?:(?:every|each)\\s+)?(?:' + QA_WD_RANGE_SRC + '|m-f))(?![a-z])', 'gi');
    while ((m = wr.exec(s))) {
        var ri = m.index + m[1].length, rc = m[3] ? weekdayRangeCodes(m[3], m[4]) : 'MO,TU,WE,TH,FR';
        if (rc && free(ri, ri + m[2].length)) claim({ kind: 'days', index: ri, length: m[2].length, codes: rc, strong: /^(?:every|each)/i.test(m[2]) || rc === 'MO,TU,WE,TH,FR' });
    }
    // dates (a weekday name only counts as a date after "from"/"until"/"next"…)
    var cands = [], lastEnd = -1;
    listDateCandidates(s, today).forEach(function(c) {
        if (c.index < lastEnd || !free(c.index, c.index + c.length)) return;
        if (c.tier === 2 && !/^(?:next|this|coming)\b/i.test(s.substr(c.index, c.length)) && !QS_START_KW_WD_RE.test(s.slice(0, c.index))) return;
        cands.push(c);
        lastEnd = c.index + c.length;
    });
    for (var i = 0; i < cands.length; i++) {
        var c = cands[i], nx = cands[i + 1];
        var a0 = c.index, a1 = c.index + c.length, role = null, date = c.date, until = null;
        if (c.endDate) { role = 'range'; until = c.endDate; }
        else if (nx && nx.date >= c.date && (/^\s*(?:-|–|—|to|until|till|thru|through)\s*$/i.test(s.slice(a1, nx.index)) ||
            (/^\s*and\s*$/i.test(s.slice(a1, nx.index)) && /\bbetween\s*$/i.test(s.slice(0, a0))))) { role = 'range'; until = nx.date; a1 = nx.index + nx.length; i++; }
        var pre = s.slice(0, a0), km;
        var word = s.substr(c.index, c.length).toLowerCase();
        if ((km = pre.match(QS_UNTIL_KW_RE))) { // checked first: "ending on nov 15" is an end, not "on nov 15"
            a0 = pre.length - km[0].length + km[0].match(/^\s*/)[0].length;
            if (!role) { role = 'until'; if (/^before$/i.test(km[1])) date = addDays(date, -1); }
        } else if ((km = pre.match(QS_START_KW_RE))) {
            a0 = pre.length - km[0].length + km[0].match(/^\s*/)[0].length;
            if (!role) role = 'start';
            if (role === 'start' && /^after$/i.test(km[1])) date = addDays(date, 1);
        }
        if (!role) {
            var post = s.slice(a1);
            role = /^\s*(?:onwards?|and\s+(?:after|on|beyond))\b/i.test(post) ? 'start' : /^\s*(?:end(?:s|ing)?|and\s+before)\b/i.test(post) ? 'until' : 'bare';
        }
        // "starting next week" = from the start of that week, not a week from today
        if (role === 'start' || role === 'bare') {
            if (/^next\s+week$/.test(word)) date = addDays(today, 7 - weekdayOf(today));
            else if (/^this\s+week$/.test(word)) date = today;
            else if (/^next\s+month$/.test(word)) { var nm = ymdParts(addMonths(today, 1)); date = makeYMD(nm.y, nm.m, 1); }
        }
        if (role === 'until') { until = date; }
        claim({ kind: 'date', index: a0, length: a1 - a0, role: role, date: date, until: until });
    }
    QS_DAYS_RE.lastIndex = 0;
    while ((m = QS_DAYS_RE.exec(s))) {
        var di = m.index + m[1].length, txt = m[2];
        if (!free(di, di + txt.length)) continue;
        var codes = qsDayCodes(txt);
        if (!codes) continue;
        var prefixed = /^(?:every|each|on)\s/i.test(txt);
        var multi = codes === 'daily' || codes.indexOf(',') !== -1;
        if (!multi && !prefixed && /^(?:sat|sun)$/i.test(txt)) continue;
        // "tue, nov 10" — a weekday glued to a date is that date
        var de = di + txt.length;
        if (!multi && !prefixed && atoms.some(function(x) { return x.kind === 'date' && x.role === 'bare' && x.index >= de && /^[\s,]*$/.test(s.slice(de, x.index)); })) continue;
        claim({ kind: 'days', index: di, length: txt.length, codes: codes, soft: /(?:morning|afternoon|evening|night)s$/i.test(txt),
            strong: prefixed && !/^on\s/i.test(txt) || multi || /days\b/i.test(txt) || !!SCHOOL_DAYS[txt.toLowerCase()] || /(?:morning|afternoon|evening|night)s$/i.test(txt) });
    }
    // times, with every claimed span blanked so "nov 17-29" can never read as a time
    var work = s.split('');
    taken.forEach(function(t) { for (var k = t[0]; k < t[1]; k++) work[k] = ' '; });
    work = work.join('');
    for (var g = 0; g < 16; g++) {
        var t = scanTimes(work, true) || bareTimeRange(work);
        if (!t) break;
        claim({ kind: 'time', index: t.index, length: t.length });
        work = work.slice(0, t.index) + new Array(t.length + 1).join(' ') + work.slice(t.index + t.length);
    }
    QS_ORDINAL_RE.lastIndex = 0;
    while ((m = QS_ORDINAL_RE.exec(s))) {
        var oi = m.index + m[1].length;
        if (free(oi, oi + m[2].length)) claim({ kind: 'ord', index: oi, length: m[2].length, n: qsOrdinalN(m[3] || m[4]) });
    }
    atoms.sort(function(a, b) { return a.index - b.index; });
    // "9-11am for the first" — a time said right before its ordinal belongs to that ordinal's clause
    // ("first part 9-11am, second part 1-3pm" already has its ordinal in front — and a comma ends the clause)
    atoms.forEach(function(a, k) {
        var nx = atoms[k + 1], pv = atoms[k - 1];
        if (a.kind === 'time' && nx && nx.kind === 'ord' && /^\s*$/.test(s.slice(a.index + a.length, nx.index)) &&
            !(pv && pv.kind === 'ord' && /^\s*$/.test(s.slice(pv.index + pv.length, a.index)))) a.ordAfter = true;
    });
    // "… at 9-11am and 1-3pm respectively" — the trailing times are handed out in order
    if (respectively) {
        var lastDays = -1;
        atoms.forEach(function(a, k) { if (a.kind === 'days') lastDays = k; });
        atoms.forEach(function(a, k) { if (k > lastDays && a.kind === 'time') a.inTurn = true; });
    }
    return atoms;
}

function parseQuickSchedule(text, today, opts) {
    opts = opts || {};
    today = today || getLocalDateString();
    var s = ' ' + tidyQuickText(text, today) + ' ';
    if (!/[a-z]/i.test(s)) return null;
    var notes = '', exdates = [], m;
    // bare "sat"/"sun" next to a time or at the end are days (same rule as parseQuickAdd)
    s = s.replace(/\b(sat|sun)\b(?=\s+(?:\d|all[\s-]?day|morning|afternoon|evening|night|noon|midnight)|[\s,.]*$)/gi, function(w) { return w.toLowerCase() === 'sat' ? 'saturday' : 'sunday'; });
    if ((m = s.match(/\s(?:\/\/|--|notes?:)\s*(\S.*)$/i))) { notes = m[1].trim(); s = s.slice(0, m.index) + ' '; }
    for (var xg = 0; xg < 6; xg++) {
        var qx = extractQuickExceptions(s, today);
        if (!qx) break;
        exdates = exdates.concat(qx.dates);
        s = qx.s;
    }
    var respectively = /\b(?:respectively|in\s+that\s+order)\b/i.test(s);
    if (respectively) s = s.replace(/[\s,]*\b(?:respectively|in\s+that\s+order)\b/gi, ' ');
    var atoms = qsScanAtoms(s, today, respectively);
    if (!atoms.some(function(a) { return a.kind === 'days'; })) return null;

    // ---- group the words into phases (date stretches) and slots (one day group + time each)
    var phases = [], P = null, S = null, lastEnd = 0;
    function mkSlot(from) { return { from: from, to: s.length, days: null, time: false, soft: false, strong: false }; }
    function open(from, opener) {
        if (P) { P.to = from; S.to = from; }
        P = { from: from, to: s.length, opener: opener || null, dates: [], start: null, until: null, bare: null, boundAfter: false, ordinal: null, slots: [mkSlot(from)] };
        S = P.slots[0];
        phases.push(P);
    }
    function anyDays() { return P.slots.some(function(x) { return x.days; }); }
    function busy() { return anyDays() || P.slots.some(function(x) { return x.time || x.soft; }) || P.dates.length || P.ordinal !== null; }
    // a new piece starts after the last comma since the previous word ("…9-11am, lab thu 1-3pm")
    function cut(a) { var gap = s.slice(lastEnd, a.index), k = gap.lastIndexOf(','); return k >= 0 ? lastEnd + k + 1 : lastEnd; }
    function nextSlot(a) { var at = cut(a); S.to = at; S = mkSlot(at); P.slots.push(S); }
    open(0);
    atoms.forEach(function(a) {
        if (a.kind === 'conn') {
            if (busy()) open(a.index + a.length, a.then ? 'then' : 'stop');
        } else if (a.kind === 'date') {
            var split = a.role === 'until' ? !!P.until : !!(P.start || P.until || P.bare);
            if (split) open(cut(a), 'date');
            if (a.role === 'range') { P.start = a.date; P.until = a.until; }
            else if (a.role === 'start') P.start = a.date;
            else if (a.role === 'until') P.until = a.until;
            else P.bare = a.date;
            P.dates.push(a);
            if (anyDays()) P.boundAfter = true;
        } else if (a.kind === 'days') {
            if (P.boundAfter) open(cut(a), 'date');
            else if (S.days && (S.time || S.soft)) nextSlot(a);
            S.days = { codes: S.days ? qsUnionCodes(S.days.codes, a.codes) : a.codes };
            S.soft = S.soft || a.soft;
            S.strong = S.strong || a.strong;
        } else if (a.kind === 'time') {
            if (a.inTurn) { if (busy()) open(cut(a), 'turn'); P.inTurn = true; }
            else if (a.ordAfter) { if (busy()) open(cut(a), 'ord'); }
            else if (S.time) {
                if (!anyDays() || P.boundAfter) open(cut(a), 'time');
                else nextSlot(a);
            }
            S.time = true;
        } else if (a.kind === 'ord') {
            if (P.ordinal !== null || anyDays()) open(cut(a), 'ord');
            P.ordinal = a.n;
        }
        lastEnd = a.index + a.length;
    });

    // ---- read each piece with parseQuickAdd (dates, connectors and ordinals masked out)
    var mask = [];
    atoms.forEach(function(a) { if (a.kind === 'conn' || a.kind === 'date' || a.kind === 'ord') for (var k = a.index; k < a.index + a.length; k++) mask[k] = 1; });
    function textOf(from, to) { var o = ''; for (var k = from; k < to; k++) o += mask[k] ? ' ' : s.charAt(k); return o; }
    var qopts = { type: opts.type || null, colors: !!opts.colors, nowMs: opts.nowMs, bareTimes: true };
    var series = [], titles = [], extras = [];
    phases.forEach(function(p) {
        p.series = [];
        p.isSched = p.slots.some(function(x) { return x.days; });
        if (!p.start && p.bare && p.isSched) p.start = p.bare;
        if (!p.isSched) {
            p.q = parseQuickAdd(textOf(p.from, p.to), today, qopts);
            if (opts.colors && p.q.title && !p.q.color && quickColorKey(p.q.title.replace(/^(?:in|as)\s+/i, ''))) { p.q.color = quickColorKey(p.q.title.replace(/^(?:in|as)\s+/i, '')); p.q.title = ''; }
            p.timed = p.q.start !== null || p.q.allDay;
            extras.push(p.q);
            if (!p.timed && !p.dates.length && p.ordinal === null && p.q.title) titles.push({ at: p.from, t: p.q.title });
            return;
        }
        var prevRep = null;
        p.slots.forEach(function(sl) {
            var q = parseQuickAdd(textOf(sl.from, sl.to), today, qopts);
            var rep = q.repeat && q.repeat.rec ? q.repeat : null;
            if (sl.days) {
                var codes = sl.days.codes;
                if (codes === 'daily') { if (!rep || rep.rec.freq !== 'daily') rep = dailyRepeat(); }
                else if (!rep || rep.rec.freq !== 'weekly') rep = weeklyRepeat(codes);
                else rep.rec.byDay = codes;
            } else if (prevRep) {
                rep = JSON.parse(JSON.stringify(prevRep)); // "tue 9-11am and 1-3pm" — same days, second session
            } else return;
            rep.rec.until = null;
            prevRep = rep;
            // "…1-3pm nov 17-29 blue" — a color word alone in its piece is that piece's color, not its name
            if (opts.colors && q.title && !q.color && quickColorKey(q.title.replace(/^(?:in|as)\s+/i, ''))) { q.color = quickColorKey(q.title.replace(/^(?:in|as)\s+/i, '')); q.title = ''; }
            var x = { phase: p, slot: sl, q: q, repeat: rep, timed: q.start !== null || q.allDay };
            p.series.push(x);
            series.push(x);
            if (q.title) titles.push({ at: sl.from, t: q.title, x: x });
        });
    });
    var sched = phases.filter(function(p) { return p.isSched && p.series.length; });
    if (!sched.length) return null;
    // a bare single weekday only repeats inside a real schedule (a dated phase or next to "every …")
    // ("dentist tue 9am, then gym MWF 6pm" is a one-off + a series — left to plain quick add)
    if (sched.some(function(p, i) { return !p.start && !p.until && !p.slots.some(function(x) { return x.strong; }) && !(i > 0 && sched[i - 1].until); })) return null;

    // ---- titles: the first one said names everything; a later series with its own words keeps them
    titles.sort(function(a, b) { return a.at - b.at; });
    var baseTitle = (titles.filter(function(t) { return qsMeaningful(t.t); })[0] || titles[0] || { t: '' }).t;
    series.forEach(function(x) { x.own = x.q.title && qsMeaningful(x.q.title) && x.q.title.toLowerCase() !== baseTitle.toLowerCase(); x.title = x.own ? x.q.title : baseTitle; });

    // ---- "tue/wed 9-11am, tue/thu/fri 1-3pm" after the dates: the same day groups again = their times
    var warnings = [];
    for (var pi = sched.length - 1; pi > 0; pi--) {
        var rp = sched[pi];
        if (rp.dates.length || rp.opener === 'then' || rp.series.some(function(x) { return !x.timed || x.own; })) continue;
        var earlier = [];
        sched.slice(0, pi).forEach(function(p) { earlier = earlier.concat(p.series.filter(function(x) { return !x.timed; })); });
        var hits = rp.series.map(function(x) { return earlier.filter(function(y) { return y.repeat.rec.byDay === x.repeat.rec.byDay && y.repeat.rec.freq === x.repeat.rec.freq; }); });
        if (!hits.every(function(h) { return h.length; })) continue;
        rp.series.forEach(function(x, k) { hits[k].forEach(function(y) { qsGiveTime(y, x.q); }); });
        series = series.filter(function(x) { return x.phase !== rp; });
        sched.splice(pi, 1);
    }

    // ---- date stretches: a phase starts where the one before it ended (unless it's its own thing)
    sched.forEach(function(p, i) { p.alongside = i > 0 && p.series[0].own; });
    sched.forEach(function(p, i) {
        var nx = sched[i + 1];
        if (!p.until && nx && nx.start && !nx.alongside) p.until = addDays(nx.start, -1);
    });
    sched.forEach(function(p, i) {
        var pv = sched[i - 1];
        if (!p.start) {
            if (i > 0 && !p.alongside && pv.until) p.start = addDays(pv.until, 1);
            else {
                p.start = today;
                if (i > 0 && !p.alongside && !pv.until) warnings.push('Couldn\'t tell when the schedule changes — say “until <date>” or “from <date>”');
            }
        }
        // "for 4 weeks" / "10 times" end a phase too — the next one picks up after it
        if (!p.until) {
            p.series.forEach(function(x) {
                var r = x.repeat, end = null;
                if (r.forSpan) end = untilFromSpan(p.start, r.forSpan);
                else if (r.rec.count) end = lastOccurrenceDate({ startDate: alignStartToRecurrence(p.start, r.rec, r.anchor), recurrence: r.rec });
                if (end && (!p.until || end > p.until)) p.until = end;
            });
        }
    });
    sched.forEach(function(p) {
        p.first = null;
        p.series.forEach(function(x) { var f = alignStartToRecurrence(p.start, x.repeat.rec, x.repeat.anchor); if (!p.first || f < p.first) p.first = f; });
    });

    // ---- clauses with a time but no days hand it to the phase they point at
    var inTurn = [];
    phases.forEach(function(c) {
        if (c.isSched || !c.timed) return;
        var target = null;
        if (c.inTurn) { inTurn.push(c); return; }
        if (c.ordinal !== null) target = c.ordinal === -1 ? sched[sched.length - 1] : sched[c.ordinal - 1] || null;
        else if (c.dates.length) {
            var best = 0;
            sched.forEach(function(p) { var sc = qsRefScore(p, c.dates); if (sc > best) { best = sc; target = p; } });
        }
        if (target) qsGivePhase(target, c.q, true);
        else inTurn.push(c);
    });
    if (inTurn.length) {
        var waiting = sched.filter(function(p) { return p.series.some(function(x) { return !x.timed; }); });
        if (inTurn.length === 1 && waiting.length > 1) waiting.forEach(function(p) { qsGivePhase(p, inTurn[0].q, false); });
        else inTurn.forEach(function(c, k) { if (waiting[k]) qsGivePhase(waiting[k], c.q, false); });
    }
    // still no time → same as the rest of its phase, else the phase before, else the one after
    sched.forEach(function(p, i) {
        p.series.forEach(function(x) {
            if (x.timed) return;
            var src = p.series.filter(function(y) { return y.timed; })[0];
            for (var k = i - 1; !src && k >= 0; k--) src = sched[k].series.filter(function(y) { return y.timed; })[0];
            for (var j = i + 1; !src && j < sched.length; j++) src = sched[j].series.filter(function(y) { return y.timed; })[0];
            if (src) qsGiveTime(x, src.q);
        });
    });

    // ---- shared details: color, place, calendar, reminder, priority, notes — said once, used by all
    var pool = series.map(function(x) { return x.q; }).concat(extras);
    function firstOf(k, empty) { for (var i = 0; i < pool.length; i++) { var v = pool[i][k]; if (v !== null && v !== undefined && v !== empty) return v; } return k === 'location' || k === 'notes' ? '' : null; }
    var shared = { color: firstOf('color'), location: firstOf('location', ''), calendarRef: firstOf('calendarRef'), reminder: firstOf('reminder'), priority: firstOf('priority'), notes: notes || firstOf('notes', '') };
    var type = series[0].q.type;

    var items = [];
    sched.forEach(function(p) {
        p.series.forEach(function(x) {
            var rec = Object.assign({}, x.repeat.rec, { until: p.until || null });
            if (x.repeat.forSpan && !rec.until && !rec.count) rec.until = untilFromSpan(p.start, x.repeat.forSpan);
            var first = alignStartToRecurrence(p.start, rec, x.repeat.anchor);
            if (rec.until && rec.until < first) {
                warnings.push('No ' + describeRecurrence(rec, first).replace(/^Weekly on /, '').replace(/, until.*$/, '') + ' between ' + qsFmt(p.start) + ' and ' + qsFmt(rec.until) + ' — that part was left out');
                return;
            }
            var q = x.q;
            items.push({
                type: type, title: x.title, date: first, endDate: null, start: q.start, end: q.end, allDay: !!q.allDay && q.start === null,
                durationMin: q.durationMin, repeat: { rec: rec, anchor: x.repeat.anchor, forSpan: null },
                calendarRef: q.calendarRef || shared.calendarRef, location: q.location || shared.location, priority: q.priority || shared.priority,
                color: q.color || shared.color, notes: q.notes || shared.notes, reminder: q.reminder !== null && q.reminder !== undefined ? q.reminder : shared.reminder,
                exdates: exdates.slice(), chips: []
            });
        });
    });
    if (!items.length) return null;
    var clauseUsed = phases.some(function(c) { return !c.isSched && c.timed; }) || series.length < phases.reduce(function(n, p) { return n + (p.isSched ? p.slots.length : 0); }, 0);
    if (items.length === 1 && !clauseUsed) return null; // one plain series — parseQuickAdd already reads it
    return { items: items, warnings: warnings };
}

// How well a clause's dates ("nov 15 ending", "nov 17-nov 29") name a phase
function qsRefScore(p, refs) {
    var sc = 0, until = p.until || '9999-12-31';
    refs.forEach(function(r) {
        if (r.role === 'range') {
            if (r.date === p.start || r.date === p.first) sc += 4;
            if (r.until === p.until) sc += 4;
            if (r.date <= until && r.until >= p.start) sc += 1;
        } else {
            var d = r.role === 'until' ? r.until : r.date;
            if (d === p.until) sc += r.role === 'start' ? 2 : 4;
            if (d === p.start || d === p.first) sc += r.role === 'until' ? 2 : 4;
            if (d >= p.start && d <= until) sc += 1;
        }
    });
    return sc;
}
function qsGiveTime(x, q) {
    x.q.start = q.start; x.q.end = q.end; x.q.allDay = !!q.allDay; x.q.durationMin = q.durationMin;
    x.timed = true;
}
// explicit (by date / order) beats a time the phase already had; "in turn" only fills gaps
function qsGivePhase(p, q, explicit) {
    var gaps = p.series.filter(function(x) { return !x.timed; });
    (gaps.length ? gaps : explicit ? p.series : []).forEach(function(x) { qsGiveTime(x, q); });
}

// ---------------------------------------------------------------- import safety checks
// "Thu 2026-11-05" / "Thursday, November 5, 2026" / "2026-11-05 (Thu)" → the
// weekday written next to an explicit date must be that date's weekday. LLMs
// slip on date arithmetic ("next Thursday" → wrong day); the weekday the user
// spoke is the cross-check. → { date, said, actual } (weekday indexes) or null.
var WD_BEFORE_RE = new RegExp('(?:^|[^a-z])' + WEEKDAY_SRC + '\\.?[\\s,]*\\(?\\s*$', 'i');
var WD_AFTER_RE = new RegExp('^\\s*,?\\s*\\(?\\s*' + WEEKDAY_SRC + '(?![a-z])', 'i');
function weekdayMismatch(text, today) {
    var s = String(text || '');
    var cands = listDateCandidates(s, today || getLocalDateString());
    for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        if (c.tier !== 0 || !c.date) continue;
        var bm = s.slice(0, c.index).match(WD_BEFORE_RE);
        var am = s.slice(c.index + c.length).match(WD_AFTER_RE);
        var word = bm ? bm[1] : am ? am[1] : null;
        if (!word) continue;
        var said = weekdayFromWord(word);
        if (said === null) continue;
        var actual = weekdayOf(c.date);
        if (said !== actual) return { date: c.date, said: said, actual: actual };
    }
    return null;
}

// "+1 hour" / "-30 min" / "2 days later" / "45 minutes earlier" → signed minutes, or null
function parseShift(v) {
    var s = String(v || '').trim().toLowerCase();
    if (!s) return null;
    var neg = /^-|^minus\b|\b(earlier|sooner|before|back(?:ward)?s? in time)\b/.test(s);
    var body = s.replace(/^[+-]\s*|^(?:plus|minus)\s+/, '')
        .replace(/\b(later|earlier|sooner|after|before|forward|ahead|back|by|push(?:ed)?|move(?:d)?|shift(?:ed)?)\b/g, ' ')
        .replace(/\s+/g, ' ').trim();
    var d = parseDuration(body.replace(/^(an?|one)\s+/, '1 ').replace(/^half\s+(?:an?\s+)?hour$/, '30 min'));
    if (typeof d !== 'number' || !d) return null;
    return neg ? -d : d;
}

// [CAL-PARSE-END]
