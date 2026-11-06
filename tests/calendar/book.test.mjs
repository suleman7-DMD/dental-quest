// Sully Calendar — full refresh of the patient book from an axiUm screenshot
// (BOOK: line) reconciles against loose quick-adds: same / changed / new / cancelled.
// Run: node --test tests/calendar/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const TODAY = '2026-11-02';
const NOW = '2026-10-01T12:00:00.000Z';

function calendar() {
    const mk = (o) => c.normalizeEvent(Object.assign({ createdAt: NOW, updatedAt: NOW, endDate: o.startDate }, o));
    const o = {};
    [
        { id: 'q_moe', type: 'event', title: 'Moe', calendarId: 'cal_personal', startDate: '2026-11-03', startTime: '08:30', endTime: '09:30', color: 'basil' },
        { id: 'q_sarah', type: 'event', title: 'Sarah', calendarId: 'cal_personal', startDate: '2026-11-04', startTime: '13:00', endTime: '14:00', color: 'basil' },
        { id: 'q_kim', type: 'event', title: 'kim crown', calendarId: 'cal_personal', startDate: '2026-11-05', startTime: '16:00', endTime: '17:00' },
        { id: 'a_john', type: 'appointment', patientName: 'John Smith', calendarId: 'cal_clinic', startDate: '2026-11-05', startTime: '08:30', endTime: '11:30' },
        { id: 'a_mary', type: 'appointment', patientName: 'Mary Lee', calendarId: 'cal_clinic', startDate: '2026-11-06', startTime: '13:00', endTime: '16:00', procedure: 'Perio maintenance' },
        { id: 'a_jane', type: 'appointment', patientName: 'Jane Doe', calendarId: 'cal_clinic', startDate: '2026-11-10', startTime: '08:30', endTime: '11:30' },
        { id: 'e_lunch', type: 'event', title: 'Lunch with Sam', calendarId: 'cal_personal', startDate: '2026-11-04', startTime: '12:00', endTime: '13:00' },
        { id: 'a_later', type: 'appointment', patientName: 'Out Of Range', calendarId: 'cal_clinic', startDate: '2026-11-30', startTime: '08:30', endTime: '11:30' }
    ].forEach((x) => { o[x.id] = mk(x); });
    return o;
}
const plan = (text) => JSON.parse(JSON.stringify(c.planImport(text, {
    events: calendar(), calendars: c.getDefaultCalendars(), settings: c.getDefaultSettings(), today: TODAY, options: {}
})));
const appts = (list) => list.map(([who, day, time, proc]) => 'APPOINTMENTS\nPATIENT: ' + who + '\nDATE: ' + day + '\nTIME: ' + time + (proc ? '\nPROCEDURE: ' + proc : '')).join('\n---\n');
const BOOK = [
    ['Mohammed Ali', 'Tue 2026-11-03', '8:30 AM', 'Crown prep #30'],
    ['Kimberly Wong', 'Thu 2026-11-05', '4:00 PM'],
    ['Mary Lee', 'Thu 2026-11-12', '1:00 PM', 'Perio maintenance'],
    ['Jane Doe', 'Tue 2026-11-10', '8:30 AM'],
    ['Priya Patel', 'Wed 2026-11-11', '4:00 PM', 'New patient exam']
];
const byTarget = (p) => Object.fromEntries(p.items.map((it) => [it.targetId || 'new:' + it.label, it]));

test('full refresh: loose quick-adds are matched, fixed to 3-hour visits, cancellations proposed', () => {
    const p = plan('TODAY: Mon 2026-11-02\nBOOK: Tue 2026-11-03 to Fri 2026-11-13\n' + appts(BOOK));
    const t = byTarget(p);
    // "Moe" (Personal, 8:30–9:30) ≈ Mohammed Ali 8:30 → converted, 3 hours, flagged as a loose match
    assert.equal(t.q_moe.kind, 'update');
    assert.deepEqual([t.q_moe.changes.type, t.q_moe.changes.patientName, t.q_moe.changes.endTime, t.q_moe.changes.title], ['appointment', 'Mohammed Ali', '11:30', '']);
    assert.equal(t.q_moe.checked, true);
    assert.match(t.q_moe.warnings.join(' '), /Loose match/);
    // "kim crown" → Kimberly Wong (prefix), same slot
    assert.equal(t.q_kim.changes.patientName, 'Kimberly Wong');
    assert.equal(t.q_kim.changes.endTime, '19:00');
    // rescheduled to another booked day → move, not delete + add
    assert.equal(t.a_mary.kind, 'move');
    assert.equal(t.a_mary.changes.startDate, '2026-11-12');
    // unchanged → skipped
    assert.equal(t.a_jane.kind, 'skip');
    // new
    assert.equal(p.items.filter((it) => it.kind === 'create').length, 1);
    // cancelled booked visit → delete, ticked; colored personal quick-add → offered, unticked
    assert.equal(t.a_john.kind, 'delete');
    assert.equal(t.a_john.checked, true);
    assert.equal(t.q_sarah.kind, 'delete');
    assert.equal(t.q_sarah.checked, false);
    // never touched: plain personal events, anything outside BOOK
    assert.equal(t.e_lunch, undefined);
    assert.equal(t.a_later, undefined);
    assert.deepEqual(p.book, { from: '2026-11-03', to: '2026-11-13', same: 1, changed: 3, added: 1, cancelled: 1, maybe: 1 });
});

test('without BOOK: loose matches still prevent duplicates, but nothing is removed', () => {
    const p = plan('TODAY: Mon 2026-11-02\n' + appts([BOOK[0]]));
    assert.deepEqual(p.items.map((it) => it.kind + ':' + (it.targetId || 'new')), ['update:q_moe']);
});

test('re-pasting the same book after applying it changes nothing', () => {
    const text = 'TODAY: Mon 2026-11-02\nBOOK: Tue 2026-11-03 to Fri 2026-11-13\n' + appts(BOOK);
    const events = calendar();
    const first = c.planImport(text, { events, calendars: c.getDefaultCalendars(), settings: c.getDefaultSettings(), today: TODAY, options: {} });
    // apply the ticked items the way the app does (enough for this check)
    first.items.filter((it) => it.checked).forEach((it) => {
        if (it.kind === 'create') { const id = 'new_' + Math.random().toString(36).slice(2); events[id] = c.normalizeEvent(Object.assign({}, it.spec, { id, calendarId: 'cal_clinic', createdAt: NOW, updatedAt: NOW })); }
        else if (it.kind === 'delete') delete events[it.targetId];
        else events[it.targetId] = c.normalizeEvent(Object.assign({}, events[it.targetId], it.changes || {}, it.seriesChanges || {}));
    });
    const again = JSON.parse(JSON.stringify(c.planImport(text, { events, calendars: c.getDefaultCalendars(), settings: c.getDefaultSettings(), today: TODAY, options: {} })));
    const real = again.items.filter((it) => it.kind !== 'skip' && !it.maybe);
    assert.deepEqual(real, [], JSON.stringify(real.map((it) => it.kind + ' ' + it.label + ' ' + it.detail)));
});

test('a BOOK range with the wrong weekday leaves cancellations unticked', () => {
    const p = plan('TODAY: Mon 2026-11-02\nBOOK: Mon 2026-11-03 to Fri 2026-11-13\n' + appts(BOOK));
    assert.equal(p.items.find((it) => it.targetId === 'a_john').checked, false);
    assert.match(p.warnings[0].msg, /BOOK says Monday/);
});

test('quick add "pt Moe 8:30" is a 3-hour patient visit named Moe', () => {
    const s = JSON.parse(JSON.stringify(c.buildEventSpec({ verb: 'EVENT', fields: {}, quick: 'pt Moe tue 8:30', interactive: true }, { today: TODAY, settings: c.getDefaultSettings() }))).spec;
    assert.deepEqual([s.type, s.patientName, s.title, s.startDate, s.startTime, s.endTime], ['appointment', 'Moe', '', '2026-11-03', '08:30', '11:30']);
    const g = JSON.parse(JSON.stringify(c.buildEventSpec({ verb: 'EVENT', fields: {}, quick: 'Gym tue 9:30', interactive: true }, { today: TODAY, settings: c.getDefaultSettings() }))).spec;
    assert.deepEqual([g.type, g.title, g.endTime], ['event', 'Gym', '10:30']); // not a visit — and not a session start (8:30 → 3h, see quickadd.test.mjs)
});
