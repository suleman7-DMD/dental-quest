// Sully Calendar — the Claude project instructions stay in sync with the docs
// copy, and every worked example in them resolves cleanly against a calendar
// that matches the story they tell.  Run: node --test tests/calendar/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const TODAY = '2026-11-02';
const NOW = '2026-10-01T12:00:00.000Z';
const docPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/sully-calendar-webchat-instructions.md');

// The calendar the examples talk about (today = Mon 2026-11-02)
function exampleCalendar() {
    const mk = (o) => c.normalizeEvent(Object.assign({ createdAt: NOW, updatedAt: NOW }, o));
    const list = [
        { id: 'ev_jane', type: 'appointment', patientName: 'Jane Doe', chartNumber: '001234', calendarId: 'cal_clinic', startDate: '2026-11-04', endDate: '2026-11-04', startTime: '09:00', endTime: '12:00', procedure: 'Crown prep #19' },
        { id: 'ev_lunch', type: 'event', title: 'Lunch with Sam', calendarId: 'cal_personal', startDate: '2026-11-04', endDate: '2026-11-04', startTime: '12:30', endTime: '13:30' },
        { id: 'ev_john', type: 'appointment', patientName: 'John Smith', calendarId: 'cal_clinic', startDate: '2026-11-05', endDate: '2026-11-05', startTime: '10:00', endTime: '12:00', procedure: 'SRP UR/LR' },
        { id: 'ev_mary', type: 'appointment', patientName: 'Mary Lee', calendarId: 'cal_clinic', startDate: '2026-11-05', endDate: '2026-11-05', startTime: '14:00', endTime: '17:00', procedure: 'Perio maintenance' },
        { id: 'ev_study', type: 'event', title: 'Study group', calendarId: 'cal_personal', startDate: '2026-10-01', endDate: '2026-10-01', startTime: '18:00', endTime: '20:00', recurrence: { freq: 'weekly', interval: 1, byDay: 'TH' } },
        { id: 'ev_task', type: 'task', title: 'Order trays', calendarId: 'cal_tasks', startDate: '2026-11-06', endDate: '2026-11-06', startTime: '17:00', endTime: '17:00' },
        { id: 'ev_dent', type: 'event', title: 'Dentist — Dr. Kim cleaning', calendarId: 'cal_personal', startDate: '2026-11-09', endDate: '2026-11-09', startTime: '15:00', endTime: '16:00' },
        { id: 'ev_pr2', type: 'deadline', title: 'PR2 write-up', calendarId: 'cal_deadlines', startDate: '2026-11-10', endDate: '2026-11-10', startTime: '23:59', endTime: '23:59' }
    ];
    const o = {};
    list.forEach((x) => { o[x.id] = mk(x); });
    return o;
}
const plan = (text) => JSON.parse(JSON.stringify(c.planImport(text, {
    events: exampleCalendar(), calendars: c.getDefaultCalendars(), settings: c.getDefaultSettings(), today: TODAY, options: {}
})));

function examples() {
    const txt = c.CLAUDE_PROJECT_INSTRUCTIONS;
    const at = txt.indexOf('EXAMPLES (these pretend today is Mon 2026-11-02');
    assert.ok(at > 0, 'examples section present');
    return [...txt.slice(at).matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1]);
}

test('docs copy is byte-identical to the in-app instructions', () => {
    const md = fs.readFileSync(docPath, 'utf8');
    const m = md.match(/\n````text\n([\s\S]*?)\n````\n?$/);
    assert.ok(m, 'docs file has a ````text block at the end');
    assert.equal(m[1], c.CLAUDE_PROJECT_INSTRUCTIONS);
});

// [target ids or 'new'] per item, in order — what each example must do
const EXPECT = [
    ['create:new'],
    ['delete:ev_john'],
    ['move:ev_mary'],
    ['delete:ev_john', 'delete:ev_mary', 'create:new'],
    ['move:ev_dent'],
    ['move:ev_study'],
    ['delete:ev_study'],
    ['done:ev_task'],
    ['move:ev_pr2'],
    ['delete:ev_mary', 'delete:ev_study'],
    ['create:new'],
    ['update:ev_mary'],
    ['done:ev_jane'],
    ['create:new'],
    ['move:ev_john', 'move:ev_mary'],
    ['update:ev_lunch'],
    ['move:ev_john'],
    ['create:new', 'create:new', 'delete:ev_lunch']
];

test('every worked example applies cleanly: right items, all ticked, no errors or warnings', () => {
    const ex = examples();
    assert.equal(ex.length, EXPECT.length, 'one expectation per example');
    ex.forEach((text, i) => {
        assert.match(text, /^TODAY: Mon 2026-11-02\n/, 'example ' + (i + 1) + ' starts with TODAY:');
        const p = plan(text);
        const got = p.items.map((it) => it.kind + ':' + (it.kind === 'create' ? 'new' : it.targetId));
        assert.deepEqual(got, EXPECT[i], 'example ' + (i + 1));
        p.items.forEach((it) => {
            assert.equal(it.checked, true, 'example ' + (i + 1) + ' item ticked: ' + it.label);
            assert.deepEqual(it.warnings, [], 'example ' + (i + 1) + ' no warnings: ' + it.label);
        });
        assert.deepEqual(p.warnings, [], 'example ' + (i + 1) + ' no plan warnings');
    });
});

test('examples land on the right days and times', () => {
    const ex = examples();
    const pick = (n) => plan(ex[n - 1]).items;
    assert.equal(pick(3)[0].changes.startDate, '2026-11-12');
    assert.equal(pick(3)[0].changes.startTime, '13:00');
    assert.equal(pick(5)[0].changes.startTime, '16:00');                 // SHIFT +1 hour
    assert.equal(pick(6)[0].occ, '2026-11-05');                          // one occurrence of the series
    assert.equal(pick(6)[0].changes.startDate, '2026-11-04');
    assert.equal(pick(7)[0].scope, 'following');
    assert.equal(pick(9)[0].changes.startDate, '2026-11-13');
    assert.equal(pick(10)[1].occ, '2026-11-05');                         // afternoon window hits tonight's study group only
    const gym = pick(11)[0].spec;
    assert.equal(gym.recurrence.byDay, 'MO,WE,FR');
    assert.equal(gym.recurrence.until, '2026-12-18');
    assert.equal(pick(15)[0].changes.startDate, '2026-11-06');
    assert.equal(pick(15)[1].changes.startTime || '14:00', '14:00');    // same times kept
    assert.equal(pick(16)[0].changes.startTime, '13:00');
    assert.equal(pick(16)[0].changes.location, 'Cafe Luna');
    assert.equal(pick(17)[0].changes.endTime, '13:00');                  // EXTEND +1 hour
    assert.equal(pick(18)[0].spec.startDate, '2026-11-03');
});
