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
    if (/^(appointment|appointments|appt|appts|patient|clinic|pt)$/.test(s)) return 'appointment';
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

// One line of free text → event fields. Never throws.
// "Lunch w/ Sam tomorrow 12-1pm @ Cafe #personal", "task: submit PR2 fri 5pm !!!",
// "Perio rounds every tue 8am until 12/15", "Board review Nov 5-7 #school"
function parseQuickAdd(text, today, opts) {
    opts = opts || {};
    today = today || getLocalDateString();
    var s = ' ' + String(text || '').replace(/\s+/g, ' ').trim() + ' ';
    var out = {
        type: opts.type || null, title: '', date: null, endDate: null, start: null, end: null,
        allDay: false, durationMin: null, repeat: null, calendarRef: null, location: '', priority: null, chips: []
    };
    function cutAt(idx, len) {
        var before = s.slice(0, idx).replace(/(?:\b(?:on|at|from|by|starting|due)|@)\s*$/i, '');
        s = before + ' ' + s.slice(idx + len);
    }
    var m = s.match(/^\s*(task|todo|to-do|deadline|due|appt|appointment|event|reminder)\s*[:\-–]\s*/i);
    if (m) {
        out.type = parseTypeValue(m[1]) || 'task';
        s = ' ' + s.slice(m[0].length);
    }
    m = s.match(/\s#([A-Za-z0-9][\w-]*)/);
    if (m) { out.calendarRef = m[1].replace(/[-_]+/g, ' '); cutAt(m.index, m[0].length); out.chips.push('#' + m[1]); }
    m = s.match(/\s!(high|urgent|medium|med|low)\b/i) || s.match(/\s(!{1,3})(?=\s)/);
    if (m) { out.priority = parsePriority(m[1]); cutAt(m.index, m[0].length); }
    m = s.match(/\s@\s*([^#!@]+?)\s*$/);
    if (m) { out.location = m[1].trim(); s = s.slice(0, m.index) + ' '; out.chips.push('@ ' + out.location); }
    m = s.match(REPEAT_PHRASE_RE);
    if (m) {
        var rp = parseRepeat(m[0], today);
        if (rp && rp.rec) { out.repeat = rp; cutAt(m.index, m[0].length); out.chips.push(m[0].trim()); }
    }
    // a detached "until <date>" belongs to the repeat rule, never to the event date
    var um = s.match(/\s(?:until|till|thru)\s+/i);
    if (out.repeat && out.repeat.rec && um) {
        var tail = s.slice(um.index + um[0].length);
        var ud = findDateInText(tail, today);
        if (ud && ud.index <= 1) {
            out.repeat.rec.until = ud.date;
            s = s.slice(0, um.index) + ' ' + tail.slice(ud.index + ud.length);
        }
    }
    if (/\bdue\b/i.test(s)) {
        if (!out.type) out.type = 'deadline';
        s = s.replace(/\bdue(?:\s+(?:on|by|at))?\b/i, ' ');
    }
    if (/\ball[\s-]?day\b/i.test(s)) { out.allDay = true; s = s.replace(/\ball[\s-]?day\b/ig, ' '); }
    m = s.match(/\bfor\s+((?:\d+(?:\.\d+)?|an?|one|half an?)\s*(?:h|hrs?|hours?|m|mins?|minutes?)(?:\s*(?:and\s+)?\d+\s*(?:m|mins?|minutes?))?)(?![a-z])/i);
    if (m) {
        var dur = parseDuration(m[1].replace(/^(an?|one)\s*/i, '1 ').replace(/^half an?\s*/i, '0.5 '));
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
    var t = scanTimes(s, true);
    if (t) {
        out.start = t.start;
        out.end = t.end;
        cutAt(t.index, t.length);
    } else if (out._tonight) {
        out.start = 19 * 60;
    }
    delete out._tonight;
    var title = s.replace(/\s+/g, ' ')
        .replace(/^[\s,;:\-–—|]+|[\s,;:\-–—|]+$/g, '')
        .replace(/^(?:on|at|from|by|and)\s+/i, '')
        .replace(/\s+(?:on|at|from|by|and|-)$/i, '')
        .trim();
    out.title = title;
    if (!out.type) out.type = (/\b(submit|turn in|hand in|due|deadline)\b/i.test(text) && out.start === null) ? 'deadline' : 'event';
    if (!out.date) out.date = today;
    if (out.repeat && out.repeat.rec) out.date = alignStartToRecurrence(out.date, out.repeat.rec, out.repeat.anchor);
    return out;
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
