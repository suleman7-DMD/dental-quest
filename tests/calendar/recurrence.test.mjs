// Sully Calendar — date math + recurrence expansion.  Run: node --test tests/calendar/
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const NOW = '2026-11-01T12:00:00.000Z';
const ev = (o) => c.normalizeEvent(Object.assign({ id: 'ev_x', type: 'event', title: 'X', createdAt: NOW, updatedAt: NOW }, o));
const dates = (e, from, to) => JSON.parse(JSON.stringify(c.getEventInstances(e, from, to).map(i => i.startDate)));

test('date math is DST-safe (no UTC parsing, no 23/25h days)', () => {
    assert.equal(c.addDays('2026-10-31', 1), '2026-11-01');
    assert.equal(c.addDays('2026-11-01', 1), '2026-11-02', 'DST ends Nov 1 2026');
    assert.equal(c.addDays('2026-03-07', 2), '2026-03-09', 'DST starts Mar 8 2026');
    assert.equal(c.diffDays('2026-03-01', '2026-04-01'), 31);
    assert.equal(c.weekdayOf('2026-11-02'), 1);
    assert.equal(c.addMonths('2026-01-31', 1), '2026-02-28');
});

test('weekly on several weekdays', () => {
    const e = ev({ startDate: '2026-11-02', endDate: '2026-11-02', startTime: '06:00', endTime: '07:00', recurrence: { freq: 'weekly', interval: 1, byDay: 'MO,WE,FR' } });
    assert.deepEqual(dates(e, '2026-11-01', '2026-11-14'), ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11', '2026-11-13']);
});

test('every other week, with COUNT', () => {
    const e = ev({ startDate: '2026-11-04', endDate: '2026-11-04', startTime: '15:00', endTime: '16:00', recurrence: { freq: 'weekly', interval: 2, byDay: 'WE', count: 3 } });
    assert.deepEqual(dates(e, '2026-11-01', '2027-01-31'), ['2026-11-04', '2026-11-18', '2026-12-02']);
});

test('monthly nth weekday and last weekday', () => {
    const first = ev({ startDate: '2026-11-02', endDate: '2026-11-02', allDay: true, recurrence: { freq: 'monthly', interval: 1, monthlyMode: 'nth' } });
    assert.deepEqual(dates(first, '2026-11-01', '2027-01-31'), ['2026-11-02', '2026-12-07', '2027-01-04'], 'first Monday');
    const last = ev({ startDate: '2026-11-27', endDate: '2026-11-27', allDay: true, recurrence: { freq: 'monthly', interval: 1, monthlyMode: 'last' } });
    assert.deepEqual(dates(last, '2026-11-01', '2027-01-31'), ['2026-11-27', '2026-12-25', '2027-01-29'], 'last Friday');
});

test('monthly on the 31st skips short months; UNTIL is inclusive', () => {
    const e = ev({ startDate: '2026-10-31', endDate: '2026-10-31', allDay: true, recurrence: { freq: 'monthly', interval: 1, monthlyMode: 'day', until: '2027-01-31' } });
    assert.deepEqual(dates(e, '2026-10-01', '2027-03-31'), ['2026-10-31', '2026-12-31', '2027-01-31']);
});

test('deleted occurrences (exceptions) are excluded; overrides move one instance', () => {
    const e = ev({
        startDate: '2026-11-05', endDate: '2026-11-05', startTime: '18:00', endTime: '20:00',
        recurrence: { freq: 'weekly', interval: 1, byDay: 'TH' },
        exceptions: { '2026-11-12': { deleted: true }, '2026-11-19': { startDate: '2026-11-20', endDate: '2026-11-20', startTime: '19:00', endTime: '21:00' } }
    });
    const inst = c.getEventInstances(e, '2026-11-01', '2026-11-30');
    assert.deepEqual(JSON.parse(JSON.stringify(inst.map(i => i.startDate + ' ' + i.startTime))), ['2026-11-05 18:00', '2026-11-20 19:00', '2026-11-26 18:00']);
    assert.equal(inst[1].occ, '2026-11-19', 'an override keeps its original occurrence key');
});

test('multi-day events appear in every range they overlap', () => {
    const e = ev({ startDate: '2026-11-30', endDate: '2026-12-02', allDay: true });
    assert.equal(c.getEventInstances(e, '2026-12-01', '2026-12-31').length, 1);
});

test('US holidays (federal + observances) land on the right dates', () => {
    const h = {};
    c.getUSHolidays(2026).forEach(x => { h[x.title] = x.date; });
    assert.equal(h['Thanksgiving Day'], '2026-11-26');
    assert.equal(h['Memorial Day'], '2026-05-25');
    assert.equal(h['Labor Day'], '2026-09-07');
    assert.equal(h['Independence Day (observed)'] || h['Independence Day'], h['Independence Day (observed)'] ? '2026-07-03' : '2026-07-04');
});
