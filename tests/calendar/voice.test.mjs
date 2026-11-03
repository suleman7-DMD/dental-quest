// Sully Calendar — ID-less targeting for voice → Claude → paste changes:
// date/time/name/title matching, ambiguity refusal, ALL, SHIFT/EXTEND, date
// sanity checks, re-paste idempotency and the issues report.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const TODAY = '2026-11-02';
const NOW = '2026-11-01T12:00:00.000Z';
const mk = (o) => c.normalizeEvent(Object.assign({ createdAt: NOW, updatedAt: NOW }, o));

function fixture(mut) {
    const list = [
        { id: 'ev_study', type: 'event', title: 'Study group', calendarId: 'cal_personal', startDate: '2026-11-05', endDate: '2026-11-05', startTime: '18:00', endTime: '20:00', recurrence: { freq: 'weekly', interval: 1, byDay: 'TH' } },
        { id: 'ev_jane', type: 'appointment', patientName: 'Jane Doe', chartNumber: '001234', calendarId: 'cal_clinic', startDate: '2026-11-04', endDate: '2026-11-04', startTime: '09:00', endTime: '12:00', procedure: 'Crown prep #19' },
        { id: 'ev_john', type: 'appointment', patientName: 'John Smith', chartNumber: '5555', calendarId: 'cal_clinic', startDate: '2026-11-05', endDate: '2026-11-05', startTime: '10:00', endTime: '12:00', procedure: 'SRP UR/LR' },
        { id: 'ev_mary', type: 'appointment', patientName: 'Mary Lee', calendarId: 'cal_clinic', startDate: '2026-11-05', endDate: '2026-11-05', startTime: '13:00', endTime: '16:00', procedure: 'Perio maintenance' },
        { id: 'ev_bob', type: 'appointment', patientName: 'Bob Stone', calendarId: 'cal_clinic', startDate: '2026-11-07', endDate: '2026-11-07', startTime: '14:00', endTime: '17:00', procedure: 'Denture try-in' },
        { id: 'ev_task', type: 'task', title: 'Order trays', calendarId: 'cal_tasks', startDate: '2026-11-06', endDate: '2026-11-06', startTime: '17:00', endTime: '17:00' },
        { id: 'ev_dent', type: 'event', title: 'Dentist - Dr. Kim cleaning', calendarId: 'cal_personal', startDate: '2026-11-09', endDate: '2026-11-09', startTime: '15:00', endTime: '16:00' },
        { id: 'ev_gym', type: 'event', title: 'Gym', calendarId: 'cal_personal', startDate: '2026-11-03', endDate: '2026-11-03', startTime: '06:00', endTime: '07:00' },
        { id: 'ev_gym2', type: 'event', title: 'Gym', calendarId: 'cal_personal', startDate: '2026-11-10', endDate: '2026-11-10', startTime: '06:00', endTime: '07:00' },
        { id: 'ev_conf', type: 'event', title: 'ADEA conference', calendarId: 'cal_personal', allDay: true, startDate: '2026-11-12', endDate: '2026-11-14' }
    ];
    const o = {};
    list.forEach((x) => { o[x.id] = mk(x); });
    if (mut) mut(o);
    return o;
}
const plan = (text, mut, today) => JSON.parse(JSON.stringify(c.planImport(text, {
    events: fixture(mut), calendars: c.getDefaultCalendars(), settings: c.getDefaultSettings(), today: today || TODAY, options: {}
})));
const kinds = (p) => p.items.map((i) => i.kind + ':' + (i.targetId || ''));

test('primitives: weekdayMismatch and parseShift', () => {
    assert.equal(c.weekdayMismatch('Thu 2026-11-05', TODAY), null);
    assert.equal(c.weekdayMismatch('Thursday, November 5, 2026', TODAY), null);
    assert.equal(c.weekdayMismatch('2026-11-05 (Thu) 10:00 AM', TODAY), null);
    assert.deepEqual(JSON.parse(JSON.stringify(c.weekdayMismatch('Fri 2026-11-05', TODAY))), { date: '2026-11-05', said: 5, actual: 4 });
    assert.ok(c.weekdayMismatch('Sat 2026-11-06 9 AM', TODAY));
    assert.equal(c.weekdayMismatch('2026-11-05', TODAY), null);
    assert.equal(c.parseShift('+1 hour'), 60);
    assert.equal(c.parseShift('-30 min'), -30);
    assert.equal(c.parseShift('45 minutes earlier'), -45);
    assert.equal(c.parseShift('2 days later'), 2880);
    assert.equal(c.parseShift('+1 week'), 10080);
    assert.equal(c.parseShift('half an hour'), 30);
    assert.equal(c.parseShift('soon'), null);
});

test('no ID: an appointment is found by day + time alone', () => {
    const p = plan('APPOINTMENT_DELETE\nON: Thu 2026-11-05\nAT: 10:00 AM');
    assert.deepEqual(kinds(p), ['delete:ev_john']);
    assert.equal(p.items[0].checked, true);
    const m = plan('APPOINTMENT_MOVE\nON: Thu 2026-11-05\nAT: 10:00 AM\nTO: Thu 2026-11-12 1:00 PM').items[0];
    assert.equal(m.targetId, 'ev_john');
    assert.equal(m.changes.startDate, '2026-11-12');
    assert.equal(m.changes.startTime, '13:00');
    assert.equal(m.changes.endTime, '15:00');
});

test('two candidates and no tie-breaker → refused, both listed; ALL: yes takes every one', () => {
    const r = plan('APPOINTMENT_DELETE\nON: Thu 2026-11-05').items[0];
    assert.equal(r.kind, 'reject');
    assert.match(r.reason, /2 items match/);
    assert.match(r.reason, /John Smith/);
    assert.match(r.reason, /Mary Lee/);
    assert.deepEqual(kinds(plan('APPOINTMENT_DELETE\nON: Thu 2026-11-05\nALL: yes')), ['delete:ev_john', 'delete:ev_mary']);
});

test('ALL with a type never spills onto other kinds of items', () => {
    const p = plan('APPOINTMENT_DELETE\nON: Tue 2026-11-03\nALL: yes');
    assert.deepEqual(kinds(p), ['skip:']);
});

test('voice-garbled names still match; a different person never does', () => {
    assert.deepEqual(kinds(plan('APPOINTMENT_DELETE\nPATIENT: Jon Smyth\nON: 2026-11-05')), ['delete:ev_john']);
    assert.deepEqual(kinds(plan('APPOINTMENT_DELETE\nPATIENT: Doe, Jane\nDATE: 2026-11-04\nTIME: 9:00 AM')), ['delete:ev_jane']);
    const miss = plan('APPOINTMENT_DELETE\nPATIENT: Tom Brady\nON: 2026-11-05').items[0];
    assert.equal(miss.kind, 'skip');
    assert.match(miss.reason, /Thu, Nov 5 has: .*John Smith/);
});

test('title words are stemmed and fuzzy ("dental appointment" finds "Dentist - Dr. Kim cleaning")', () => {
    const m = plan('EVENT_MOVE\nMATCH: dental appointment\nON: Mon 2026-11-09\nTO: 4:00 PM').items[0];
    assert.equal(m.targetId, 'ev_dent');
    assert.equal(m.changes.startTime, '16:00');
});

test('a misremembered time within an hour still matches, with a visible note', () => {
    const p = plan('EVENT_MOVE\nMATCH: dentist\nON: 2026-11-09\nAT: 2:30 PM\nTO: 2026-11-10');
    assert.equal(p.items[0].targetId, 'ev_dent');
    assert.match(p.items[0].warnings.join(' '), /Starts at 3pm, not 2:30pm/);
    assert.equal(p.items[0].checked, true);
});

test('title words that miss: kept only when the slot + kind pin the item', () => {
    const d = plan('APPOINTMENT_DELETE\nMATCH: perio\nON: 2026-11-05\nAT: 10:00 AM').items[0];
    assert.equal(d.targetId, 'ev_john');
    assert.match(d.warnings.join(' '), /does not mention/);
    assert.equal(plan('EVENT_DELETE\nMATCH: yoga\nON: 2026-11-05\nAT: 6 PM').items[0].kind, 'skip');
});

test('weekday written next to a date must match it — otherwise the item is left unticked', () => {
    const p = plan('APPOINTMENT_DELETE\nON: Fri 2026-11-05\nAT: 10:00 AM');
    assert.equal(p.items[0].kind, 'delete');
    assert.equal(p.items[0].checked, false);
    assert.match(p.items[0].warnings[0], /says Friday but Thu, Nov 5 is a Thursday/);
    const ok = plan('TASK\nTITLE: Call lab\nDUE: Fri 2026-11-06 9:00 AM').items[0];
    assert.equal(ok.checked, true);
    const bad = plan('TASK\nTITLE: Call lab\nDUE: Thu 2026-11-06 9:00 AM').items[0];
    assert.equal(bad.checked, false);
});

test('TODAY: line that disagrees with the device date unticks everything and explains why', () => {
    const text = 'TODAY: Tue 2026-11-03\nTASK\nTITLE: Call lab\nDUE: Wed 2026-11-04 9:00 AM';
    const p = plan(text);
    assert.equal(p.items[0].checked, false);
    assert.match(p.warnings[0].msg, /Claude wrote this on Tue, Nov 3, but today is Mon, Nov 2/);
    const same = plan(text, null, '2026-11-03');
    assert.equal(same.items[0].checked, true);
    assert.deepEqual(same.warnings, []);
});

test('SHIFT and EXTEND move or stretch relative to where the item is now', () => {
    const s = plan('APPOINTMENT_MOVE\nON: 2026-11-05\nAT: 1 PM\nSHIFT: +30 min').items[0];
    assert.equal(s.targetId, 'ev_mary');
    assert.equal(s.changes.startTime, '13:30');
    assert.equal(s.changes.endTime, '16:30');
    const occ = plan('EVENT_MOVE\nMATCH: study group\nON: Thu 2026-11-05\nSHIFT: +1 hour').items[0];
    assert.equal(occ.occ, '2026-11-05');
    assert.equal(occ.scope, 'this');
    assert.equal(occ.changes.startTime, '19:00');
    const day = plan('EVENT_MOVE\nMATCH: ADEA\nSHIFT: +1 day').items[0];
    assert.equal(day.changes.startDate, '2026-11-13');
    assert.equal(day.changes.endDate, '2026-11-15');
    const x = plan('APPOINTMENT_UPDATE\nPATIENT: John Smith\nON: 2026-11-05\nEXTEND: +1 hour').items[0];
    assert.equal(x.changes.endTime, '13:00');
    assert.equal(x.changes.startTime, undefined);
    assert.equal(plan('APPOINTMENT_UPDATE\nPATIENT: John\nON: 2026-11-05\nEXTEND: -3 hours').items[0].kind, 'reject');
});

test('time windows and date ranges with ALL', () => {
    assert.deepEqual(kinds(plan('EVENT_DELETE\nON: Thu 2026-11-05\nAT: 12:00 PM - 11:59 PM\nALL: yes')), ['delete:ev_mary', 'delete:ev_study']);
    assert.deepEqual(kinds(plan('EVENT_DELETE\nON: 2026-11-03 to 2026-11-10\nMATCH: gym\nALL: yes')), ['delete:ev_gym', 'delete:ev_gym2']);
    const mv = plan('APPOINTMENT_MOVE\nON: Thu 2026-11-05\nALL: yes\nNEW_DATE: Fri 2026-11-06').items;
    assert.deepEqual(mv.map((i) => i.changes.startDate + ' ' + (i.changes.startTime || '')), ['2026-11-06 ', '2026-11-06 ']);
});

test('no date given: the next upcoming match is used (deletes stay unticked when several match)', () => {
    const del = plan('EVENT_DELETE\nMATCH: gym').items[0];
    assert.equal(del.targetId, 'ev_gym');
    assert.equal(del.checked, false);
    const mv = plan('EVENT_MOVE\nMATCH: gym\nNEW_TIME: 7:00 AM').items[0];
    assert.equal(mv.targetId, 'ev_gym');
    assert.equal(mv.checked, true);
    assert.equal(plan('TASK_DONE\nMATCH: order trays').items[0].checked, true);
});

test('date off by a few days: found nearby, but left unticked for a look', () => {
    const m = plan('TASK_MOVE\nMATCH: Order trays\nON: Thu 2026-11-05\nTO: Mon 2026-11-09 5:00 PM').items[0];
    assert.equal(m.targetId, 'ev_task');
    assert.equal(m.checked, false);
    assert.match(m.warnings.join(' '), /found it on Fri, Nov 6 instead/);
});

test('re-pasting an applied change is a harmless skip', () => {
    const moved = (o) => { Object.assign(o.ev_john, { startDate: '2026-11-12', endDate: '2026-11-12', startTime: '13:00', endTime: '15:00' }); };
    const p = plan('APPOINTMENT_MOVE\nON: Thu 2026-11-05\nAT: 10:00 AM\nTO: Thu 2026-11-12 1:00 PM', moved);
    assert.deepEqual(kinds(p), ['skip:']);
    assert.match(p.items[0].reason, /Already done/);
    const gone = (o) => { delete o.ev_john; };
    assert.deepEqual(kinds(plan('APPOINTMENT_DELETE\nON: Thu 2026-11-05\nAT: 10:00 AM', gone)), ['skip:']);
    const done = (o) => { o.ev_task.done = true; };
    assert.match(plan('TASK_DONE\nMATCH: order trays', done).items[0].reason, /Already done/);
});

test('one paste, many changes: separate blocks or repeated keys in one block', () => {
    const batch = 'APPOINTMENT_DELETE\nON: Thu 2026-11-05\nAT: 10:00 AM\n---\nAPPOINTMENT_DELETE\nON: Sat 2026-11-07\nAT: 2:00 PM\n---\nTASK\nTITLE: Call lab\nDUE: Fri 2026-11-06 9:00 AM';
    assert.deepEqual(kinds(plan(batch)), ['delete:ev_john', 'delete:ev_bob', 'create:']);
    assert.deepEqual(kinds(plan('APPOINTMENT_DELETE\nON: 2026-11-05\nAT: 10:00 AM\nON: 2026-11-07\nAT: 2:00 PM')), ['delete:ev_john', 'delete:ev_bob']);
});

test('header spellings and chat markdown are tolerated', () => {
    assert.deepEqual(kinds(plan('**CANCEL_APPOINTMENT**\n- **ON:** Thursday, November 5, 2026\n- **AT:** 1pm')), ['delete:ev_mary']);
    assert.deepEqual(kinds(plan('APPT_RESCHEDULE\nON: 2026-11-05\nAT: 10am\nTO: 11am')), ['move:ev_john']);
    assert.deepEqual(kinds(plan('TASK_COMPLETE\nMATCH: trays')), ['done:ev_task']);
    assert.deepEqual(kinds(plan('MOVE_EVENT\nMATCH: dentist\nON: 2026-11-09\nSHIFT: -30 min')), ['move:ev_dent']);
    // Roadmap-owned headers stay foreign even though they look like ours
    assert.deepEqual(JSON.parse(JSON.stringify(c.parseImportText('TODO_DONE\nID: x').foreign)), { 'Grad Roadmap': 1 });
});

test('a lowercase "Done" line inside NOTES is text, not a new block', () => {
    const p = plan('EVENT\nTITLE: Packing\nDATE: 2026-11-08\nNOTES: Checklist:\nDone\nTape');
    assert.equal(p.items.length, 1);
    assert.equal(p.items[0].spec.notes, 'Checklist:\nDone\nTape');
});

test('a weekday-less "which" with only a time defaults to today, with a note', () => {
    const p = plan('EVENT_DELETE\nAT: 6:00 AM', null, '2026-11-03');
    assert.equal(p.items[0].targetId, 'ev_gym');
    assert.match(p.items[0].warnings.join(' '), /assumed today/);
    assert.equal(plan('EVENT_DELETE\nNOTES: hi').items[0].kind, 'reject');
});

test('issues report carries the problem, what is on that day and the pasted block', () => {
    const p = plan('TODAY: Mon 2026-11-02\nAPPOINTMENT_DELETE\nON: Thu 2026-11-05\nAT: 8:00 AM\n---\nTASK\nTITLE: Call lab\nDUE: Thu 2026-11-06\n---\nEVENT\nTITLE: Fine\nDATE: 2026-11-08');
    const txt = c.buildImportIssuesText(p, TODAY);
    assert.match(txt, /^SULLY CALENDAR IMPORT ISSUES — today is Mon 2026-11-02/);
    assert.match(txt, /1\. NOT FOUND — .*Thu, Nov 5 has: 10am – 12pm John Smith/);
    assert.match(txt, / {3}APPOINTMENT_DELETE\n {3}ON: Thu 2026-11-05\n {3}AT: 8:00 AM/);
    assert.match(txt, /2\. NEEDS CHECK \(left unticked\) — .*says Thursday but Fri, Nov 6 is a Friday/);
    assert.match(txt, / {3}TASK\n {3}TITLE: Call lab/);
    assert.match(txt, /\(1 other item was fine\.\)/);
    assert.equal(c.buildImportIssuesText(plan('EVENT\nTITLE: Fine\nDATE: 2026-11-08'), TODAY), '');
});

test('legacy SULLYCAL-1 change blocks keep working', () => {
    const m = plan('EVENT_MOVE\nMATCH: Study group\nFROM: 2026-11-05\nTO: 2026-11-06 7:00 PM').items[0];
    assert.equal(m.occ, '2026-11-05');
    assert.equal(m.changes.startTime, '19:00');
    const u = plan('EVENT_UPDATE\nMATCH: Dentist\nDATE: 2026-11-10\nTIME: 1pm-2pm').items[0];
    assert.equal(u.changes.startDate, '2026-11-10');
    assert.equal(u.changes.startTime, '13:00');
    const roadmap = plan('APPOINTMENT_MOVE\nCHART: 1234\nFROM: 2026-11-04 9:00 AM\nTO: 2026-11-05 1:00 PM').items[0];
    assert.equal(roadmap.targetId, 'ev_jane');
    assert.equal(roadmap.changes.startTime, '13:00');
});
