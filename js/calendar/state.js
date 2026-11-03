// ============================================================================
// SULLY CALENDAR — state.js
// Globals, constants, default state, pure date/time helpers, normalization,
// Guard C (isEmptyState), localStorage safety, toast, per-device UI prefs.
// ============================================================================

// [CAL-PURE-START] — everything between these sentinels is DOM-free and is
// extracted verbatim by tests/calendar/*.mjs. Keep it framework-free.

var FIREBASE_APP_NAME = 'sullyCalendar';
var STORAGE_KEY = 'dentalQuestCalendarState';
var CHECKPOINT_KEY = 'dentalQuestCalendarCheckpoints';
var UI_PREFS_KEY = 'dentalQuestCalendarUI';
var FIRED_KEY = 'dentalQuestCalendarFired';
var SEED_STAMP = '2000-01-01T00:00:00.000Z'; // seeds always lose to any real edit/tombstone

var EVENT_TYPES = { event: 'Event', task: 'Task', deadline: 'Deadline', appointment: 'Appointment' };

// Google Calendar palette (24 calendar colors; the first 11 are also event colors)
var CAL_COLORS = {
    tomato: { name: 'Tomato', hex: '#d50000' },
    flamingo: { name: 'Flamingo', hex: '#e67c73' },
    tangerine: { name: 'Tangerine', hex: '#f4511e' },
    banana: { name: 'Banana', hex: '#f6bf26' },
    sage: { name: 'Sage', hex: '#33b679' },
    basil: { name: 'Basil', hex: '#0b8043' },
    peacock: { name: 'Peacock', hex: '#039be5' },
    blueberry: { name: 'Blueberry', hex: '#3f51b5' },
    lavender: { name: 'Lavender', hex: '#7986cb' },
    grape: { name: 'Grape', hex: '#8e24aa' },
    graphite: { name: 'Graphite', hex: '#616161' },
    cocoa: { name: 'Cocoa', hex: '#795548' },
    pumpkin: { name: 'Pumpkin', hex: '#ef6c00' },
    mango: { name: 'Mango', hex: '#f09300' },
    eucalyptus: { name: 'Eucalyptus', hex: '#009688' },
    pistachio: { name: 'Pistachio', hex: '#7cb342' },
    avocado: { name: 'Avocado', hex: '#c0ca33' },
    citron: { name: 'Citron', hex: '#e4c441' },
    cobalt: { name: 'Cobalt', hex: '#4285f4' },
    wisteria: { name: 'Wisteria', hex: '#b39ddb' },
    birch: { name: 'Birch', hex: '#a79b8e' },
    radicchio: { name: 'Radicchio', hex: '#ad1457' },
    cherryblossom: { name: 'Cherry Blossom', hex: '#d81b60' },
    amethyst: { name: 'Amethyst', hex: '#9e69af' }
};
var CAL_PALETTE_ORDER = ['cocoa', 'flamingo', 'tomato', 'tangerine', 'pumpkin', 'mango',
    'eucalyptus', 'basil', 'pistachio', 'avocado', 'citron', 'banana',
    'sage', 'peacock', 'cobalt', 'blueberry', 'lavender', 'wisteria',
    'graphite', 'birch', 'radicchio', 'cherryblossom', 'grape', 'amethyst'];
var EVENT_PALETTE_ORDER = ['tomato', 'flamingo', 'tangerine', 'banana', 'sage', 'basil',
    'peacock', 'blueberry', 'lavender', 'grape', 'graphite'];

var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var DOW_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Resolve a color key / name / hex → '#rrggbb' (or null)
function colorHex(c) {
    if (!c) return null;
    var s = String(c).trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(s)) return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
    var k = s.toLowerCase().replace(/[^a-z]/g, '');
    if (CAL_COLORS[k]) return CAL_COLORS[k].hex;
    // Common plain-English aliases so imports like "COLOR: red" just work
    var alias = { red: 'tomato', pink: 'flamingo', orange: 'tangerine', yellow: 'banana', lightgreen: 'sage',
        green: 'basil', darkgreen: 'basil', teal: 'eucalyptus', blue: 'peacock', lightblue: 'peacock', darkblue: 'blueberry',
        navy: 'blueberry', indigo: 'blueberry', purple: 'grape', violet: 'grape', lilac: 'lavender', gray: 'graphite',
        grey: 'graphite', brown: 'cocoa', gold: 'mango', magenta: 'radicchio', rose: 'cherryblossom' };
    if (alias[k]) return CAL_COLORS[alias[k]].hex;
    return null;
}

// Normalize a user-supplied color to a storable value: palette key when possible, else hex, else null
function normalizeColorValue(c) {
    if (!c) return null;
    var s = String(c).trim();
    var k = s.toLowerCase().replace(/[^a-z]/g, '');
    if (CAL_COLORS[k]) return k;
    var hex = colorHex(s);
    if (!hex) return null;
    var keys = Object.keys(CAL_COLORS);
    for (var i = 0; i < keys.length; i++) if (CAL_COLORS[keys[i]].hex === hex) return keys[i];
    return hex;
}

function colorName(c) {
    if (!c) return '';
    var k = String(c).toLowerCase();
    if (CAL_COLORS[k]) return CAL_COLORS[k].name;
    return String(c);
}

// Readable text color on top of a background hex
function textOnColor(hex) {
    var h = colorHex(hex) || '#039be5';
    var r = parseInt(h.substr(1, 2), 16) / 255, g = parseInt(h.substr(3, 2), 16) / 255, b = parseInt(h.substr(5, 2), 16) / 255;
    var lin = function(v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.45 ? '#1f1f1f' : '#ffffff';
}

// ---------------------------------------------------------------- dates
// NEVER new Date('YYYY-MM-DD') (UTC off-by-one). Day arithmetic uses UTC day
// numbers so DST transitions can't skew it.
function pad2(n) { return (n < 10 ? '0' : '') + n; }

function ymdOf(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function getLocalDateString(date) { return ymdOf(date || new Date()); }

function daysInMonth(y, m0) { return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); }

function isValidYMD(s) {
    if (typeof s !== 'string') return false;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1) return false;
    return d <= daysInMonth(y, mo - 1);
}

function isValidHHMM(t) { return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }

function ymdParts(s) {
    var p = s.split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
}

function makeYMD(y, m1, d) {
    var ys = String(y);
    while (ys.length < 4) ys = '0' + ys;
    return ys + '-' + pad2(m1) + '-' + pad2(d);
}

function parseYMD(s) {
    var p = ymdParts(s);
    return new Date(p.y, p.m - 1, p.d);
}

function dayNum(s) {
    var p = ymdParts(s);
    return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86400000);
}

function ymdFromDayNum(n) {
    var d = new Date(n * 86400000);
    return makeYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function addDays(s, n) { return ymdFromDayNum(dayNum(s) + n); }
function diffDays(a, b) { return dayNum(b) - dayNum(a); }

// 0 = Sunday … 6 = Saturday (1970-01-01 was a Thursday)
function weekdayOf(s) { return (((dayNum(s) + 4) % 7) + 7) % 7; }

function addMonths(s, n) {
    var p = ymdParts(s);
    var total = p.y * 12 + (p.m - 1) + n;
    var y = Math.floor(total / 12), m0 = total - y * 12;
    return makeYMD(y, m0 + 1, Math.min(p.d, daysInMonth(y, m0)));
}

function startOfWeek(s, weekStart) {
    var delta = (weekdayOf(s) - (weekStart || 0) + 7) % 7;
    return addDays(s, -delta);
}

function startOfMonth(s) { var p = ymdParts(s); return makeYMD(p.y, p.m, 1); }
function endOfMonth(s) { var p = ymdParts(s); return makeYMD(p.y, p.m, daysInMonth(p.y, p.m - 1)); }

function isoWeekNumber(s) {
    var wdMon0 = (weekdayOf(s) + 6) % 7; // Monday = 0
    var thursday = addDays(s, 3 - wdMon0);
    var jan1 = makeYMD(ymdParts(thursday).y, 1, 1);
    return 1 + Math.floor(diffDays(jan1, thursday) / 7);
}

function timeToMin(t) {
    if (!isValidHHMM(t)) return 0;
    var p = t.split(':');
    return (+p[0]) * 60 + (+p[1]);
}

function minToHHMM(m) {
    m = Math.max(0, Math.min(1439, Math.round(m)));
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}

// Absolute minutes since 1970-01-01 local wall time (DST-free arithmetic)
function absOf(date, time) { return dayNum(date) * 1440 + (time ? timeToMin(time) : 0); }
function absToDateTime(abs) {
    var dn = Math.floor(abs / 1440);
    return { date: ymdFromDayNum(dn), time: minToHHMM(abs - dn * 1440) };
}

// Google-style time labels: 9am · 9:30am · 12pm  (24h: 09:00)
function fmtTime(hhmm, fmt) {
    if (!isValidHHMM(hhmm)) return '';
    var h = +hhmm.slice(0, 2), m = +hhmm.slice(3, 5);
    if (fmt === '24h') return hhmm;
    var suffix = h < 12 ? 'am' : 'pm';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (m ? ':' + pad2(m) : '') + suffix;
}

function fmtTimeRange(s, e, fmt) {
    if (!isValidHHMM(s)) return '';
    if (!isValidHHMM(e) || e === s) return fmtTime(s, fmt);
    if (fmt === '24h') return s + ' – ' + e;
    var sameHalf = (+s.slice(0, 2) < 12) === (+e.slice(0, 2) < 12);
    var a = fmtTime(s, fmt), b = fmtTime(e, fmt);
    if (sameHalf) a = a.replace(/(am|pm)$/, '');
    return a + ' – ' + b;
}

function fmtHourLabel(h, fmt) {
    if (fmt === '24h') return pad2(h) + ':00';
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return (h % 12) + (h < 12 ? ' AM' : ' PM');
}

function fmtDateLong(s) {
    var p = ymdParts(s);
    return DOW[weekdayOf(s)] + ', ' + MONTHS[p.m - 1] + ' ' + p.d;
}

function fmtDateMed(s, todayYmd) {
    var p = ymdParts(s);
    var out = DOW_SHORT[weekdayOf(s)] + ', ' + MONTHS_SHORT[p.m - 1] + ' ' + p.d;
    var ty = todayYmd ? ymdParts(todayYmd).y : new Date().getFullYear();
    if (p.y !== ty) out += ', ' + p.y;
    return out;
}

function fmtDateShort(s) {
    var p = ymdParts(s);
    return MONTHS_SHORT[p.m - 1] + ' ' + p.d;
}

// ---------------------------------------------------------------- ids & collections
function generateId(prefix) {
    return (prefix || 'item') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function getValues(collection) {
    if (!collection) return [];
    if (Array.isArray(collection)) return collection.filter(function(v) { return v !== null && v !== undefined; });
    if (typeof collection === 'object') return Object.keys(collection).map(function(k) { return collection[k]; }).filter(function(v) { return v !== null && v !== undefined; });
    return [];
}

function getCount(collection) {
    if (!collection) return 0;
    if (Array.isArray(collection)) return collection.filter(function(v) { return v !== null && v !== undefined; }).length;
    if (typeof collection === 'object') return Object.keys(collection).length;
    return 0;
}

// Firebase can hand back arrays for sparse numeric keys — always store objects keyed by id
function migrateArrayToObject(data, prefix) {
    if (!data) return {};
    if (Array.isArray(data)) {
        var obj = {};
        data.forEach(function(item, i) {
            if (!item || typeof item !== 'object') return;
            var id = (typeof item.id === 'string' && item.id) ? item.id : (prefix || 'item') + '_mig' + i + '_' + Math.random().toString(36).slice(2, 6);
            obj[id] = item;
        });
        return obj;
    }
    return typeof data === 'object' ? data : {};
}

function nowIso() { return new Date().toISOString(); }

function deepClone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

// Stable stringify (sorted keys) — content signatures for no-op detection
function stableSig(obj) {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableSig).join(',') + ']';
    return '{' + Object.keys(obj).sort().map(function(k) { return JSON.stringify(k) + ':' + stableSig(obj[k]); }).join(',') + '}';
}

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------- defaults
function getDefaultCalendars() {
    function seed(id, name, color, kind, order) {
        return { id: id, name: name, color: color, visible: true, kind: kind, order: order,
            description: '', seeded: true, createdAt: SEED_STAMP, updatedAt: SEED_STAMP };
    }
    return {
        cal_personal: seed('cal_personal', 'Personal', 'peacock', 'general', 0),
        cal_clinic: seed('cal_clinic', 'Clinic Appointments', 'basil', 'appointments', 1),
        cal_school: seed('cal_school', 'School', 'blueberry', 'general', 2),
        cal_deadlines: seed('cal_deadlines', 'Deadlines', 'tomato', 'deadlines', 3),
        cal_tasks: seed('cal_tasks', 'Tasks', 'lavender', 'tasks', 4)
    };
}

function getDefaultSettings() {
    return {
        weekStart: 0,               // 0 = Sunday, 1 = Monday, 6 = Saturday
        timeFormat: '12h',          // '12h' | '24h'
        defaultView: 'week',
        defaultDuration: 60,        // minutes, new events
        apptDuration: 180,          // minutes, imported appointments without an end time (BU clinic session)
        showWeekends: true,
        showWeekNumbers: false,
        dimPastEvents: true,
        showCompletedTasks: true,
        defaultReminder: 30,        // minutes before timed events; -1 = none
        defaultAllDayReminder: -1,  // minutes before 9:00 on all-day events; -1 = none
        dayStartHour: 7,            // your day: grids scroll here; the phone "fit day" view starts here
        dayEndHour: 23,             // ...and ends here (stretched to any item outside it)
        density: 'comfortable'      // 'comfortable' | 'compact'
    };
}

function getDefaultState() {
    return {
        events: {},
        calendars: getDefaultCalendars(),
        settings: getDefaultSettings(),
        tombstones: { events: {}, calendars: {} }, // id -> ISO deleted-at (sync merge engine)
        _stamps: {},           // { settings: ISO } — group newer-wins
        _version: 0,           // MUST be 0 — a fresh device must never look "newer" than the cloud
        _lastModified: null,
        _dataLoaded: false     // MUST be false — no saves until data is confirmed
    };
}

// ---------------------------------------------------------------- normalization
function normalizeReminders(r) {
    var out = {};
    if (!r) return out;
    if (Array.isArray(r)) {
        r.forEach(function(m) { var n = parseInt(m, 10); if (isFinite(n) && n >= 0) out['m' + n] = true; });
        return out;
    }
    if (typeof r === 'object') {
        Object.keys(r).forEach(function(k) {
            if (!r[k]) return;
            var n = parseInt(String(k).replace(/^m/, ''), 10);
            if (isFinite(n) && n >= 0 && n <= 40320) out['m' + n] = true;
        });
    }
    return out;
}

function reminderMinutes(ev) {
    return Object.keys((ev && ev.reminders) || {}).map(function(k) { return parseInt(k.slice(1), 10); })
        .filter(function(n) { return isFinite(n); }).sort(function(a, b) { return a - b; });
}

function normalizeRecurrence(r) {
    if (!r || typeof r !== 'object') return null;
    var freq = String(r.freq || '').toLowerCase();
    if (['daily', 'weekly', 'monthly', 'yearly'].indexOf(freq) === -1) return null;
    var interval = parseInt(r.interval, 10);
    if (!isFinite(interval) || interval < 1) interval = 1;
    if (interval > 99) interval = 99;
    var byDay = '';
    if (freq === 'weekly' && r.byDay) {
        var raw = Array.isArray(r.byDay) ? r.byDay : String(r.byDay).split(',');
        var set = {};
        raw.forEach(function(d) { var c = String(d).trim().toUpperCase().slice(0, 2); if (DOW_CODES.indexOf(c) !== -1) set[c] = true; });
        byDay = DOW_CODES.filter(function(c) { return set[c]; }).join(',');
    }
    var monthlyMode = (r.monthlyMode === 'nth' || r.monthlyMode === 'last') ? r.monthlyMode : 'day';
    var until = isValidYMD(r.until) ? r.until : null;
    var count = parseInt(r.count, 10);
    count = (isFinite(count) && count > 0) ? Math.min(count, 999) : null;
    return { freq: freq, interval: interval, byDay: byDay, monthlyMode: monthlyMode, until: until, count: count };
}

function cleanStr(v, max) {
    var s = (v === null || v === undefined) ? '' : String(v);
    return max && s.length > max ? s.slice(0, max) : s;
}

// Fill/repair every field of an event WITHOUT touching its stamps (normalization
// must never make a record look "newer" in a merge).
function normalizeEvent(ev, id) {
    if (!ev || typeof ev !== 'object') return null;
    var type = EVENT_TYPES[ev.type] ? ev.type : 'event';
    var allDay = !!ev.allDay;
    var startDate = isValidYMD(ev.startDate) ? ev.startDate : null;
    var endDate = isValidYMD(ev.endDate) ? ev.endDate : startDate;
    if (startDate && endDate && endDate < startDate) endDate = startDate;
    var startTime = null, endTime = null;
    if (!allDay) {
        startTime = isValidHHMM(ev.startTime) ? ev.startTime : '09:00';
        endTime = isValidHHMM(ev.endTime) ? ev.endTime : null;
        if (startDate) {
            if (!endTime) {
                var e = absToDateTime(absOf(startDate, startTime) + 60);
                endDate = e.date; endTime = e.time;
            } else if (absOf(endDate, endTime) < absOf(startDate, startTime)) {
                var e2 = absToDateTime(absOf(startDate, startTime) + 60);
                endDate = e2.date; endTime = e2.time;
            }
        }
    }
    var exceptions = {};
    if (ev.exceptions && typeof ev.exceptions === 'object' && !Array.isArray(ev.exceptions)) {
        Object.keys(ev.exceptions).forEach(function(k) {
            var x = ev.exceptions[k];
            if (isValidYMD(k) && x && typeof x === 'object') exceptions[k] = x;
        });
    }
    var doneDates = {};
    if (ev.doneDates && typeof ev.doneDates === 'object' && !Array.isArray(ev.doneDates)) {
        Object.keys(ev.doneDates).forEach(function(k) { if (isValidYMD(k) && ev.doneDates[k]) doneDates[k] = ev.doneDates[k]; });
    }
    var priority = ['low', 'medium', 'high'].indexOf(ev.priority) !== -1 ? ev.priority : null;
    return {
        id: id || ev.id,
        type: type,
        title: cleanStr(ev.title, 500),
        calendarId: ev.calendarId ? String(ev.calendarId) : null,
        color: ev.color ? normalizeColorValue(ev.color) : null,
        allDay: allDay,
        startDate: startDate,
        endDate: endDate,
        startTime: startTime,
        endTime: endTime,
        location: cleanStr(ev.location, 500),
        notes: cleanStr(ev.notes, 20000),
        recurrence: normalizeRecurrence(ev.recurrence),
        exceptions: exceptions,
        done: !!ev.done,
        doneAt: ev.doneAt || null,
        doneDates: doneDates,
        reminders: normalizeReminders(ev.reminders),
        patientName: cleanStr(ev.patientName, 200),
        chartNumber: cleanStr(ev.chartNumber, 40),
        procedure: cleanStr(ev.procedure, 500),
        chair: cleanStr(ev.chair, 40),
        priority: priority,
        source: cleanStr(ev.source || 'manual', 20),
        extKey: ev.extKey ? cleanStr(ev.extKey, 200) : null,
        createdAt: ev.createdAt || null,
        updatedAt: ev.updatedAt || null
    };
}

function normalizeCalendar(cal, id) {
    if (!cal || typeof cal !== 'object') return null;
    return {
        id: id || cal.id,
        name: cleanStr(cal.name || 'Untitled calendar', 120),
        color: normalizeColorValue(cal.color) || 'peacock',
        visible: cal.visible !== false,
        kind: ['general', 'appointments', 'deadlines', 'tasks'].indexOf(cal.kind) !== -1 ? cal.kind : 'general',
        order: isFinite(+cal.order) ? +cal.order : 99,
        description: cleanStr(cal.description, 1000),
        seeded: !!cal.seeded,
        createdAt: cal.createdAt || null,
        updatedAt: cal.updatedAt || null
    };
}

function normalizeSettings(s) {
    var d = getDefaultSettings();
    var out = {};
    s = (s && typeof s === 'object') ? s : {};
    out.weekStart = [0, 1, 6].indexOf(+s.weekStart) !== -1 ? +s.weekStart : d.weekStart;
    out.timeFormat = s.timeFormat === '24h' ? '24h' : '12h';
    out.defaultView = ['day', '3day', '4day', 'week', 'month', 'year', 'schedule'].indexOf(s.defaultView) !== -1 ? s.defaultView : d.defaultView;
    out.defaultDuration = [15, 30, 45, 60, 90, 120].indexOf(+s.defaultDuration) !== -1 ? +s.defaultDuration : d.defaultDuration;
    out.apptDuration = (+s.apptDuration >= 15 && +s.apptDuration <= 600) ? +s.apptDuration : d.apptDuration;
    ['showWeekends', 'showWeekNumbers', 'dimPastEvents', 'showCompletedTasks'].forEach(function(k) {
        out[k] = typeof s[k] === 'boolean' ? s[k] : d[k];
    });
    out.defaultReminder = (s.defaultReminder !== undefined && s.defaultReminder !== null && isFinite(+s.defaultReminder)) ? +s.defaultReminder : d.defaultReminder;
    out.defaultAllDayReminder = (s.defaultAllDayReminder !== undefined && s.defaultAllDayReminder !== null && isFinite(+s.defaultAllDayReminder)) ? +s.defaultAllDayReminder : d.defaultAllDayReminder;
    out.dayStartHour = (+s.dayStartHour >= 0 && +s.dayStartHour <= 20) ? +s.dayStartHour : d.dayStartHour;
    out.dayEndHour = (+s.dayEndHour >= 12 && +s.dayEndHour <= 24) ? Math.max(out.dayStartHour + 1, +s.dayEndHour) : d.dayEndHour;
    out.density = s.density === 'compact' ? 'compact' : 'comfortable';
    return out;
}

// Repair shapes after ANY load (localStorage, Firebase, checkpoint). Firebase
// strips empty objects and may return arrays — every collection is re-objectified.
function normalizeState(raw) {
    var src = (raw && typeof raw === 'object') ? raw : {};
    var out = {
        events: {},
        calendars: {},
        settings: normalizeSettings(src.settings),
        tombstones: { events: {}, calendars: {} },
        _stamps: {},
        _version: isFinite(+src._version) ? +src._version : 0,
        _lastModified: src._lastModified || null,
        _dataLoaded: !!src._dataLoaded
    };
    var evs = migrateArrayToObject(src.events, 'ev');
    Object.keys(evs).forEach(function(id) {
        var n = normalizeEvent(evs[id], id);
        if (n) out.events[id] = n;
    });
    var cals = migrateArrayToObject(src.calendars, 'cal');
    Object.keys(cals).forEach(function(id) {
        var c = normalizeCalendar(cals[id], id);
        if (c) out.calendars[id] = c;
    });
    var t = (src.tombstones && typeof src.tombstones === 'object') ? src.tombstones : {};
    ['events', 'calendars'].forEach(function(k) {
        var m = (t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) ? t[k] : {};
        Object.keys(m).forEach(function(id) { if (typeof m[id] === 'string') out.tombstones[k][id] = m[id]; });
    });
    if (src._stamps && typeof src._stamps === 'object' && typeof src._stamps.settings === 'string') {
        out._stamps.settings = src._stamps.settings;
    }
    return out;
}

// GUARD C — true when the state holds nothing the user created. Seeded default
// calendars and default settings do NOT count; events, tombstones (a delete is
// real work), user/edited calendars and edited settings DO.
function isEmptyState(data) {
    if (!data || typeof data !== 'object') return true;
    if (getCount(data.events) > 0) return false;
    var t = data.tombstones || {};
    if (getCount(t.events) > 0 || getCount(t.calendars) > 0) return false;
    if (getValues(data.calendars).some(function(c) { return c && !c.seeded; })) return false;
    if (data._stamps && data._stamps.settings) return false;
    return true;
}

function hasRealData(data) { return !isEmptyState(data); }

// Structural integrity (Guard F analogue) — blocks saving a truncated/corrupt state
function validateStateIntegrity(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.events || typeof data.events !== 'object' || Array.isArray(data.events)) return false;
    if (!data.calendars || typeof data.calendars !== 'object' || Array.isArray(data.calendars)) return false;
    if (!data.settings || typeof data.settings !== 'object') return false;
    if (!data.tombstones || typeof data.tombstones !== 'object') return false;
    return true;
}

// [CAL-PURE-END]

// ============================================================================
// RUNTIME GLOBALS
// ============================================================================
var state = getDefaultState();
var isInitialLoad = true;         // GUARD A
var hasLoadedFromCloud = false;   // GUARD B
var pinValidated = false;         // GUARD 0
var awaitingPinEntry = false;     // PIN prompt showing — nothing may flip load flags
var firebaseSaveTimeout = null;

// Per-device UI preferences (NOT synced — like Google's per-browser view memory)
var ui = loadUiPrefs();
var currentDate = getLocalDateString();   // anchor date of the visible range
var searchQuery = '';

function getDefaultUiPrefs() {
    return {
        view: null,                // null → settings.defaultView
        sidebarOpen: true,
        theme: 'system',           // 'system' | 'light' | 'dark'
        overlays: { holidays: true, rmDeadlines: false, rmAppointments: false, rmD4: false },
        allDayExpanded: false,
        myCalsOpen: true,
        otherCalsOpen: true,
        gridZoom: null,            // null = auto (fit the day on phones) | 'fit' | 'normal' | px per hour
        installHintDismissed: false
    };
}

function loadUiPrefs() {
    var d = getDefaultUiPrefs();
    try {
        var raw = localStorage.getItem(UI_PREFS_KEY);
        if (!raw) return d;
        var p = JSON.parse(raw) || {};
        return {
            view: p.view || null,
            sidebarOpen: p.sidebarOpen !== false,
            theme: ['system', 'light', 'dark'].indexOf(p.theme) !== -1 ? p.theme : 'system',
            overlays: Object.assign({}, d.overlays, p.overlays || {}),
            allDayExpanded: !!p.allDayExpanded,
            myCalsOpen: p.myCalsOpen !== false,
            otherCalsOpen: p.otherCalsOpen !== false,
            gridZoom: p.gridZoom === 'fit' || p.gridZoom === 'normal' || (typeof p.gridZoom === 'number' && isFinite(p.gridZoom)) ? p.gridZoom : null,
            installHintDismissed: !!p.installHintDismissed
        };
    } catch (e) {
        return d;
    }
}

function saveUiPrefs() {
    safeLocalStorageSet(UI_PREFS_KEY, JSON.stringify(ui));
}

// Safe localStorage wrapper — quota errors never crash the UI (cross-app cleanup)
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
            console.warn('localStorage quota exceeded, running cross-app cleanup...');
            var expendable = [
                'dentalquest_backups', 'graduationRoadmapBackup', 'd3RoadmapBackup',
                'bodycomp_backups', 'stimcalc_backups', 'd3RoadmapData',
                'bodyCompCheckpoints', 'stimCalcCheckpoints', CHECKPOINT_KEY, FIRED_KEY
            ];
            // Other apps' cloud-backed checkpoint caches (raw PIN → base64 hash, as they key them)
            var pin = localStorage.getItem('dentalQuestPin');
            if (pin) {
                try {
                    var h = btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
                    expendable.push('dentalQuest_checkpoints_' + h, 'gradRoadmap_checkpoints_' + h, 'd3roadmap_checkpoints_' + h);
                } catch (ignore) {}
            }
            expendable.forEach(function(k) {
                if (k === key) return;
                try { localStorage.removeItem(k); } catch (ignore) {}
            });
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e2) {
                console.error('Storage full even after cleanup');
                if (typeof showToast === 'function') showToast('Device storage full — saved to cloud only', { type: 'error' });
                return false;
            }
        }
        console.error('localStorage error:', e);
        return false;
    }
}

function persistLocal() {
    return safeLocalStorageSet(STORAGE_KEY, JSON.stringify(state));
}

// ============================================================================
// TOAST / SNACKBAR (Google-style, bottom-left, optional action)
// ============================================================================
var toastTimer = null;
function showToast(message, opts) {
    opts = opts || {};
    var el = document.getElementById('gcToast');
    if (!el) return;
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    el.innerHTML = '';
    var msg = document.createElement('span');
    msg.className = 'gc-toast-msg';
    msg.textContent = String(message == null ? '' : message);
    el.appendChild(msg);
    if (opts.actionLabel && typeof opts.onAction === 'function') {
        var btn = document.createElement('button');
        btn.className = 'gc-toast-action';
        btn.textContent = opts.actionLabel;
        btn.onclick = function() {
            hideToast();
            try { opts.onAction(); } catch (e) { console.error(e); }
        };
        el.appendChild(btn);
    }
    var close = document.createElement('button');
    close.className = 'gc-toast-close';
    close.setAttribute('aria-label', 'Dismiss');
    close.innerHTML = '<span class="ms">close</span>';
    close.onclick = hideToast;
    el.appendChild(close);
    el.classList.toggle('error', opts.type === 'error');
    el.classList.add('show');
    var dur = opts.duration || (opts.actionLabel ? 6000 : (opts.type === 'error' ? 5000 : 3000));
    toastTimer = setTimeout(hideToast, dur);
}

function hideToast() {
    var el = document.getElementById('gcToast');
    if (el) el.classList.remove('show');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
}

// Material Symbols glyph helper (font is subset to the names listed in calendar.html)
function icon(name, extraClass) {
    return '<span class="ms' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true">' + name + '</span>';
}
