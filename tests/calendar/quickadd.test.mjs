// Sully Calendar — quick add understands the way you'd text it: days, times,
// repeats, colors, places, reminders, notes.  Run: node --test tests/calendar/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const TODAY = '2026-11-02'; // Monday
const NOW = new Date(2026, 10, 2, 14, 3).getTime();

// interactive = typed in the app (color words on); imports never set it
const qa = (text, interactive = true) => {
    const b = JSON.parse(JSON.stringify(c.buildEventSpec({ verb: 'EVENT', fields: {}, quick: text, interactive }, { today: TODAY, settings: c.getDefaultSettings(), nowMs: NOW })));
    const s = b.spec;
    return {
        title: s.title, type: s.type, date: s.startDate, start: s.startTime, end: s.endTime, allDay: !!s.allDay,
        color: s.color || null, location: s.location || '', notes: s.notes || '', cal: s.calendarRef || null,
        rec: s.recurrence ? s.recurrence.freq + ':' + (s.recurrence.byDay || '') + (s.recurrence.until ? '→' + s.recurrence.until : '') : null,
        rem: Object.keys(s.reminders || {}).join(','), priority: s.priority || null
    };
};
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

test('the recurring lecture, spoken however it comes out', () => {
    const want = { date: '2026-11-03', start: '08:00', end: '10:00', color: 'cobalt', rec: 'weekly:TU→2026-12-18' };
    for (const t of [
        'tues mornings every morning 8am-10am until dec 18th ippm lecture blue',
        'IPPM lecture, Tuesday mornings, 8 to 10 AM, until December 18th, blue.'
    ]) {
        const r = qa(t);
        assert.match(r.title, /^ippm lecture$/i, t);
        assert.deepEqual(pick(r, Object.keys(want)), want, t);
    }
});

test('weekday shorthands and plural weekdays repeat weekly', () => {
    assert.deepEqual(pick(qa('gym MWF 6am until dec 18 green'), ['title', 'start', 'rec', 'color']), { title: 'gym', start: '06:00', rec: 'weekly:MO,WE,FR→2026-12-18', color: 'basil' });
    assert.deepEqual(pick(qa('anatomy lab T/Th 1-4pm'), ['title', 'date', 'start', 'end', 'rec']), { title: 'anatomy lab', date: '2026-11-03', start: '13:00', end: '16:00', rec: 'weekly:TU,TH' });
    assert.deepEqual(pick(qa('study group tuesdays and thursdays 6-8pm in purple'), ['title', 'rec', 'color']), { title: 'study group', rec: 'weekly:TU,TH', color: 'grape' });
    assert.deepEqual(pick(qa('Lecture every tuesday morning until dec 18'), ['title', 'start', 'rec']), { title: 'Lecture', start: '09:00', rec: 'weekly:TU→2026-12-18' });
});

test('color words anywhere set the event color — names and places keep theirs', () => {
    assert.equal(qa('Faculty meeting wed 12:30-1:15 color mango').color, 'mango');
    assert.deepEqual(pick(qa('coffee with priya thursday afternoon light blue'), ['title', 'start', 'color']), { title: 'coffee with priya', start: '14:00', color: 'peacock' });
    assert.deepEqual(pick(qa('PR2 write-up due nov 20 red'), ['title', 'type', 'date', 'color']), { title: 'PR2 write-up', type: 'deadline', date: '2026-11-20', color: 'tomato' });
    for (const [t, title] of [['Red Sox game fri 7pm', 'Red Sox game'], ['Lunch with Dr. Green tomorrow noon', 'Lunch with Dr. Green'], ['Meet Sam Green 3pm thu', 'Meet Sam Green'], ['lunch at Green Street 12pm', 'lunch at Green Street']]) {
        const r = qa(t);
        assert.equal(r.title, title, t);
        assert.equal(r.color, null, t);
    }
});

test('imports (non-interactive) never read color words', () => {
    const r = qa('gym MWF 6am green', false);
    assert.equal(r.color, null);
    assert.match(r.title, /green/);
});

test('relative times, parts of day, reminders, notes, places, calendars', () => {
    assert.deepEqual(pick(qa('call mom in 2 hours'), ['title', 'date', 'start']), { title: 'call mom', date: '2026-11-02', start: '16:05' });
    assert.deepEqual(pick(qa('Gym tomorrow morning'), ['date', 'start']), { date: '2026-11-03', start: '09:00' });
    assert.deepEqual(pick(qa('dentist next thu 2pm @ BU Dental remind me 1 hour before'), ['title', 'date', 'start', 'location', 'rem']), { title: 'dentist', date: '2026-11-12', start: '14:00', location: 'BU Dental', rem: 'm60' });
    assert.deepEqual(pick(qa('board review sat all day // bring flashcards'), ['title', 'date', 'allDay', 'notes']), { title: 'board review', date: '2026-11-07', allDay: true, notes: 'bring flashcards' });
    assert.deepEqual(pick(qa('work shift on my school calendar fri 5pm'), ['title', 'cal', 'start']), { title: 'work shift', cal: 'school', start: '17:00' });
});

test('task phrasing becomes a task', () => {
    assert.deepEqual(pick(qa('task call lab about chen crown fri 3pm'), ['title', 'type', 'date', 'start']), { title: 'call lab about chen crown', type: 'task', date: '2026-11-06', start: '15:00' });
    assert.deepEqual(pick(qa('remind me to order trays tomorrow morning'), ['title', 'type', 'date', 'start']), { title: 'order trays', type: 'task', date: '2026-11-03', start: '09:00' });
});
