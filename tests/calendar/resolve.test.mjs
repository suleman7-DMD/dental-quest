// Sully Calendar — paste → plan resolver (verbs, dedup, ID upsert, sync mode).  Run: node --test tests/calendar/
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const TODAY = '2026-11-02';
const NOW = '2026-11-01T12:00:00.000Z';
const ev = (o) => c.normalizeEvent(Object.assign({ createdAt: NOW, updatedAt: NOW }, o));

function fixture() {
    return {
        ev_study: ev({ id: 'ev_study', type: 'event', title: 'Study group', calendarId: 'cal_personal', startDate: '2026-11-05', endDate: '2026-11-05', startTime: '18:00', endTime: '20:00', recurrence: { freq: 'weekly', interval: 1, byDay: 'TH' } }),
        ev_jane: ev({ id: 'ev_jane', type: 'appointment', patientName: 'Jane Doe', chartNumber: '001234', calendarId: 'cal_clinic', startDate: '2026-11-04', endDate: '2026-11-04', startTime: '09:00', endTime: '12:00', procedure: 'Crown prep #19' }),
        ev_task: ev({ id: 'ev_task', type: 'task', title: 'Order trays', calendarId: 'cal_tasks', startDate: '2026-11-06', endDate: '2026-11-06', startTime: '17:00', endTime: '17:00' })
    };
}
function plan(text, options) {
    return c.planImport(text, { events: fixture(), calendars: c.getDefaultCalendars(), settings: c.getDefaultSettings(), today: TODAY, options: options || {} });
}
const only = (p, kind) => p.items.filter(i => i.kind === kind);

test('EVENT_MOVE by MATCH + FROM moves one occurrence and keeps duration', () => {
    const p = plan('EVENT_MOVE\nMATCH: Study group\nFROM: 2026-11-05\nTO: 2026-11-06 7:00 PM');
    const [m] = only(p, 'move');
    assert.equal(m.targetId, 'ev_study');
    assert.equal(m.occ, '2026-11-05');
    assert.equal(m.changes.startDate, '2026-11-06');
    assert.equal(m.changes.startTime, '19:00');
    assert.equal(m.changes.endTime, '21:00');
});

test('EVENT_UPDATE by ID changes only the given fields', () => {
    const p = plan('EVENT_UPDATE\nID: ev_study\nLOCATION: Library\nSCOPE: all');
    const [u] = only(p, 'update');
    assert.equal(u.targetId, 'ev_study');
    assert.deepEqual(JSON.parse(JSON.stringify(u.changes)), { location: 'Library' });
});

test('EVENT_DELETE with ON + SCOPE this targets a single occurrence', () => {
    const [d] = only(plan('EVENT_DELETE\nMATCH: Study group\nON: 2026-11-12\nSCOPE: this'), 'delete');
    assert.equal(d.targetId, 'ev_study');
    assert.equal(d.occ, '2026-11-12');
    assert.equal(d.scope, 'this');
});

test('EVENT_DONE marks a task done', () => {
    const [d] = only(plan('EVENT_DONE\nMATCH: Order trays'), 'done');
    assert.equal(d.targetId, 'ev_task');
    assert.equal(d.changes.done, true);
});

test('APPOINTMENT_MOVE / DELETE match by chart (leading zeros ignored) or by "Last, First"', () => {
    const [m] = only(plan('APPOINTMENT_MOVE\nCHART: 1234\nFROM: 2026-11-04 9:00 AM\nTO: 2026-11-05 1:00 PM'), 'move');
    assert.equal(m.targetId, 'ev_jane');
    assert.equal(m.changes.startDate, '2026-11-05');
    assert.equal(m.changes.startTime, '13:00');
    assert.equal(m.changes.endTime, '16:00');
    const [d] = only(plan('APPOINTMENT_DELETE\nPATIENT: Doe, Jane\nDATE: 2026-11-04\nTIME: 9:00 AM'), 'delete');
    assert.equal(d.targetId, 'ev_jane');
});

test('re-pasting an existing appointment is skipped, not duplicated', () => {
    const p = plan('APPOINTMENTS\n---\nPATIENT: Jane Doe\nCHART: 001234\nDATE: 2026-11-04\nTIME: 9:00 AM\nPROCEDURE: Crown prep #19');
    assert.equal(p.counts.create, 0);
    assert.equal(p.counts.skip, 1);
});

test('an event pasted again with its ID updates in place; equivalent REPEAT is not a change', () => {
    const p = plan('EVENT\nID: ev_study\nTITLE: Study group\nDATE: 2026-11-05\nTIME: 7-9pm\nREPEAT: weekly');
    const [u] = only(p, 'update');
    assert.equal(p.counts.create, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(u.changes)), { startTime: '19:00', endTime: '21:00' });
});

test('sync mode removes appointments missing from the pasted days only', () => {
    const p = plan('APPOINTMENTS\n---\nPATIENT: John Smith\nDATE: 2026-11-04\nTIME: 1:00 PM', { syncAppointments: true });
    assert.equal(p.counts.create, 1);
    const dels = only(p, 'delete');
    assert.equal(dels.length, 1);
    assert.equal(dels[0].targetId, 'ev_jane');
    const off = plan('APPOINTMENTS\n---\nPATIENT: John Smith\nDATE: 2026-11-04\nTIME: 1:00 PM');
    assert.equal(off.counts.delete, 0, 'without sync mode nothing is deleted');
});

test('CALENDAR block and unknown CALENDAR: names create calendars', () => {
    const p = plan('CALENDAR\nNAME: Externship\nCOLOR: grape');
    assert.equal(p.counts.calendar, 1);
    const q = plan('EVENT: Rotation kickoff\nDATE: 2026-11-09\nTIME: 8am\nCALENDAR: Externship');
    const [cr] = only(q, 'create');
    assert.equal(cr.newCalendarName, 'Externship');
});

test('an unmatched verb is rejected with a reason instead of guessing; an already-gone delete is a no-op skip', () => {
    const p = plan('EVENT_UPDATE\nMATCH: Nonexistent thing\nLOCATION: Room 4');
    assert.equal(p.counts.update, 0);
    assert.equal(p.counts.reject, 1);
    assert.ok(only(p, 'reject')[0].reason);
    const d = plan('EVENT_DELETE\nMATCH: Nonexistent thing');
    assert.equal(d.counts.delete, 0);
    assert.equal(d.counts.skip, 1, 're-pasting an applied delete must not error');
    assert.equal(d.items[0].checked, false);
});

test('.ics import goes through the same plan (VEVENT → create)', () => {
    const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:abc@x\r\nSUMMARY:Dentist\\, cleaning\r\nDTSTART:20261110T140000\r\nDTEND:20261110T150000\r\nLOCATION:BU\r\nEND:VEVENT\r\nEND:VCALENDAR';
    const p = plan(ics);
    const [cr] = only(p, 'create');
    assert.equal(cr.spec.title, 'Dentist, cleaning');
    assert.equal(cr.spec.startDate, '2026-11-10');
    assert.equal(cr.spec.startTime, '14:00');
});
