// Sully Calendar — paste grammar + quick-add parser.  Run: node --test tests/calendar/
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const TODAY = '2026-11-02'; // Monday
const ctx = { today: TODAY, settings: c.getDefaultSettings() };
const spec = (op) => c.buildEventSpec(op, ctx).spec;
const L = (a) => JSON.parse(JSON.stringify(a)); // vm-realm arrays → plain arrays for deepEqual
const hm = (m) => (m === null || m === undefined ? m : c.minToHHMM(m));

test('Grad Roadmap APPOINTMENTS format parses unchanged (header-only block, --- per record)', () => {
    const r = c.parseImportText('```\nAPPOINTMENTS\n---\nPATIENT: Jane Doe\nCHART: 001234\nDATE: 2026-11-04\nTIME: 9:00 AM - 12:00 PM\nPROCEDURE: Crown prep #19\nCHAIR: 12\n---\nPATIENT: John Smith\nDATE: 11/04/2026\nTIME: 1:00 PM\nPROCEDURE: SRP UR\nPROCEDURE: SRP UL\n```');
    assert.equal(r.ops.length, 2);
    assert.deepEqual(L(r.ops.map(o => o.verb)), ['APPOINTMENTS', 'APPOINTMENTS']);
    const a = spec(r.ops[0]);
    assert.equal(a.type, 'appointment');
    assert.equal(a.patientName, 'Jane Doe');
    assert.equal(a.chartNumber, '001234');
    assert.equal(a.startDate, '2026-11-04');
    assert.equal(a.startTime, '09:00');
    assert.equal(a.endTime, '12:00');
    assert.equal(a.chair, '12');
    const b = spec(r.ops[1]);
    assert.equal(b.startDate, '2026-11-04');
    assert.equal(b.startTime, '13:00');
    assert.equal(b.endTime, '16:00', 'no end time → appointment default (3h clinic session)');
    assert.equal(b.procedure, 'SRP UR\nSRP UL', 'repeated PROCEDURE lines append');
});

test('a new section header without --- starts a new block (Claude often omits the separator)', () => {
    const r = c.parseImportText('APPOINTMENTS\n---\nPATIENT: John Smith\nDATE: 2026-11-03\nTIME: 1:00 PM\nPROCEDURE: SRP\n\nTASK: Submit PR2 paperwork\nDUE: 2026-11-03 5pm\nPRIORITY: high\n\nEVENT: Study group\nDATE: 2026-11-03\nTIME: 6-8pm\nREPEAT: weekly');
    assert.deepEqual(L(r.ops.map(o => o.verb)), ['APPOINTMENTS', 'TASK', 'EVENT']);
    assert.equal(r.ops[0].fields.PATIENT, 'John Smith');
    assert.equal(r.ops[0].fields.TASK_T, undefined, 'TASK line must not leak into the appointment');
    const t = spec(r.ops[1]);
    assert.equal(t.type, 'task');
    assert.equal(t.startTime, '17:00');
    assert.equal(t.priority, 'high');
    const e = spec(r.ops[2]);
    assert.equal(e.startTime, '18:00');
    assert.equal(e.endTime, '20:00');
    assert.equal(e.recurrence.freq, 'weekly');
});

test('repeated inline create headers inside one block become separate records', () => {
    const r = c.parseImportText('TASKS\n---\nTASK: Buy floss\nDUE: fri\nTASK: Call lab\nDUE: mon');
    assert.deepEqual(L(r.ops.map(o => o.fields.TITLE)), ['Buy floss', 'Call lab']);
    assert.equal(spec(r.ops[0]).startDate, '2026-11-06');
    assert.equal(spec(r.ops[1]).startDate, '2026-11-02', 'a bare weekday that is today means today (chrono/Google behavior)');
});

test('update blocks are not split by title-ish field lines', () => {
    const r = c.parseImportText('EVENT_UPDATE\nMATCH: Study group\nEVENT: Study group\nLOCATION: Library');
    assert.equal(r.ops.length, 1);
    assert.equal(r.ops[0].verb, 'EVENT_UPDATE');
    assert.equal(r.ops[0].fields.LOCATION, 'Library');
});

test('other suite apps\' blocks are counted and skipped, never imported', () => {
    const r = c.parseImportText('PATIENT_RECORD\n---\nNAME: Jane\nCHART: 1\nTASK: looks like ours\nMEDICAL_HX: HTN\n---\nSTIM_DAY\nDOSE: 30mg\n---\nMEAL | chicken | 400\nWORKOUT | push | 45\n---\nEVENT: Real event\nDATE: 2026-11-05\nTIME: 3pm');
    assert.equal(r.ops.length, 1);
    assert.equal(r.ops[0].fields.TITLE, 'Real event');
    assert.equal(r.foreign['Grad Roadmap'], 1);
    assert.equal(r.foreign['Stim Calc'], 1);
    assert.equal(r.foreign['Body Comp'], 2);
});

test('the in-app example paste parses into create + create + create + move', () => {
    const src = c.parseImportText(['```', 'APPOINTMENTS', '---', 'PATIENT: Jane Doe', 'CHART: 001234', 'DATE: 2026-11-04', 'TIME: 9:00 AM - 12:00 PM', 'PROCEDURE: Crown prep #19', 'CHAIR: 12', '---', 'EVENT', 'TITLE: Board review session', 'DATE: 2026-11-07', 'TIME: 10:00 AM - 1:00 PM', 'LOCATION: Room 204', 'CALENDAR: School', '---', 'DEADLINE', 'TITLE: PR2 write-up', 'DUE: 2026-11-10 11:59 PM', 'PRIORITY: high', '---', 'EVENT_MOVE', 'MATCH: Study group', 'FROM: 2026-11-05', 'TO: 2026-11-06 7:00 PM', '```'].join('\n'));
    assert.deepEqual(L(src.ops.map(o => o.verb)), ['APPOINTMENTS', 'EVENT', 'DEADLINE', 'EVENT_MOVE']);
    const d = spec(src.ops[2]);
    assert.equal(d.type, 'deadline');
    assert.equal(d.startDate, '2026-11-10');
    assert.equal(d.startTime, '23:59');
    assert.equal(d.endTime, '23:59', 'deadlines are point-in-time');
});

test('time ranges: meridiem inheritance and 24h on either side', () => {
    const t = (s) => { const x = c.parseDateTimeValue('2026-11-05 ' + s, TODAY); return hm(x.start) + "-" + hm(x.end); };
    assert.equal(t('9-11am'), '09:00-11:00');
    assert.equal(t('11am-1pm'), '11:00-13:00');
    assert.equal(t('6-8pm'), '18:00-20:00');
    assert.equal(t('10:00-22:00'), '10:00-22:00');
    assert.equal(t('14:00-16:30'), '14:00-16:30');
    assert.equal(t('9:00 AM - 12:00 PM'), '09:00-12:00');
});

test('quick add: natural language → typed spec', () => {
    const q1 = c.parseQuickAdd('Lunch w/ Sam tomorrow 12-1pm @ Cafe #personal', TODAY);
    assert.equal(q1.title, 'Lunch w/ Sam');
    assert.equal(q1.date, '2026-11-03');
    assert.equal(hm(q1.start), '12:00');
    assert.equal(hm(q1.end), '13:00');
    assert.equal(q1.location, 'Cafe');
    assert.equal(q1.calendarRef, 'personal');

    const q2 = c.parseQuickAdd('Read pages 10-20 today', TODAY);
    assert.equal(q2.title, 'Read pages 10-20', 'numeric ranges without time cues stay in the title');
    assert.equal(q2.date, TODAY);

    const q3 = c.parseQuickAdd('task: order impression trays fri !high', TODAY);
    assert.equal(q3.type, 'task');
    assert.equal(q3.date, '2026-11-06');
    assert.equal(q3.priority, 'high');

    const q4 = c.parseQuickAdd('Gym every mon wed fri 6am until dec 15', TODAY);
    assert.equal(q4.repeat.rec.freq, 'weekly');
    assert.equal(q4.repeat.rec.byDay, 'MO,WE,FR');
    assert.equal(hm(q4.start), '06:00');
});

test('relative and named dates resolve against today (Mon 2026-11-02)', () => {
    const d = (s) => c.findDateInText(s, TODAY).date;
    assert.equal(d('tomorrow'), '2026-11-03');
    assert.equal(d('fri'), '2026-11-06');
    assert.equal(d('next tuesday'), '2026-11-10');
    assert.equal(d('Nov 20'), '2026-11-20');
    assert.equal(d('1/15'), '2027-01-15', 'past-ish month/day rolls to next year');
    assert.equal(d('in 2 weeks'), '2026-11-16');
});

test('cleanImportText strips fences, SYNTAX lines and @BANNERS', () => {
    const r = c.parseImportText('@SULLYCAL\nSYNTAX: SULLYCAL-1\n```\nEVENT: Dinner\nDATE: 2026-11-05\nTIME: 7pm\n```');
    assert.equal(r.ops.length, 1);
    assert.equal(r.warnings.length, 0);
});
