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

// ---- schedules that change partway: one sentence → one repeating series per stretch / day group
const FRI = '2026-11-06'; // a Friday — "a new class that starts next week"
const qaAll = (text, interactive = true, today = FRI) => {
    const b = JSON.parse(JSON.stringify(c.buildEventSpec({ verb: 'EVENT', fields: {}, quick: text, interactive }, { today, settings: c.getDefaultSettings(), nowMs: NOW })));
    return {
        warnings: b.warnings,
        series: (b.specs || [b.spec]).map((s) => {
            const r = s.recurrence;
            return [s.title, s.startDate, s.allDay ? 'all day' : s.startTime + '-' + s.endTime,
                r ? r.freq + ':' + (r.byDay || '') + (r.interval > 1 ? '/' + r.interval : '') + (r.until ? '→' + r.until : '') + (r.count ? '#' + r.count : '') : 'once',
                Object.keys(s.exceptions || {}).join(',')].concat(s.color ? [s.color] : []);
        })
    };
};
const TWO_STRETCHES = [
    ['xyz', '2026-11-10', '09:00-11:00', 'weekly:TU,WE→2026-11-15', ''],
    ['xyz', '2026-11-17', '13:00-15:00', 'weekly:TU,TH,FR→2026-11-29', '']
];

test('a class whose days change partway: every way it gets said', () => {
    for (const t of [
        // the way it was asked for — times said afterwards, pointed at by their dates
        'xyz every tue, wed until nov 15 then from nov 17-nov29 every tue, thu, fri. nov 15 ending dates from 9am-11am, nov 17-nov 29 dates from 1pm-3pm',
        'xyz every tue, wed until nov 15 9am-11am then from nov 17-nov 29 every tue, thu, fri 1pm-3pm',
        'xyz tue/wed 9-11am until nov 15, then tue/thu/fri 1-3pm nov 17 - nov 29',
        'xyz tue wed 9-11am through nov 15; tue thu fri 1-3pm from nov 17 to nov 29',
        'xyz starting next week tue & wed 9-11am through nov 15, then starting nov 17 tue thu fri 1-3pm until nov 29',
        'xyz: nov 10-15 tue wed 9-11am; nov 17-29 tue thu fri 1-3pm',
        'xyz tue wed 9-11am until nov 15 and from nov 17 to nov 29 tue thu fri 1-3pm',
        'xyz tues and weds 9 to 11am until nov 15th, after that tues thurs and fris 1 to 3pm until nov 29th',
        'xyz every tue and wed 9-11am till nov 15 then it switches to tue thu fri 1-3pm until nov 29',
        'xyz tue wed 9-11am until 11/15 then tue thu fri 1-3pm 11/17-11/29',
        'xyz tue/wed 9-11 until nov 15 then tue/thu/fri 1-3 until nov 29',
        'xyz every tuesday and wednesday until the 15th 9-11am then tue thu fri 1-3pm until the 29th',
        'xyz every tue, wed until nov 15 from 9am-11am, from nov 17 until nov 29 every tue, thu, fri from 1pm-3pm',
        // times by order, by day group, in turn
        'xyz every tue, wed until nov 15 then every tue, thu, fri until nov 29. first part 9-11am, second part 1-3pm',
        'xyz every tue/wed until nov 15, and every tue/thu/fri from nov 17 through nov 29, 9-11am for the first and 1-3pm for the second',
        'xyz every tue, wed until nov 15 then every tue, thu, fri until nov 29. tue/wed 9-11am, tue/thu/fri 1-3pm',
        'xyz every tue, wed until nov 15 then every tue, thu, fri until nov 29 at 9-11am and 1-3pm respectively',
        // dictated
        'xyz every Tuesday and Wednesday from 9 to 11 a.m. until November 15th. Then from November 17th to the 29th, every Tuesday, Thursday and Friday from 1 to 3 p.m.'
    ]) {
        const r = qaAll(t);
        assert.deepEqual(r.series, TWO_STRETCHES, t);
        assert.deepEqual(r.warnings, [], t);
    }
});

test('own hours per day, own names per day group, a time said once, skipped dates', () => {
    assert.deepEqual(qaAll('xyz tue 9-11am wed 1-3pm until nov 15 then tue thu fri 2-4pm until nov 29').series, [
        ['xyz', '2026-11-10', '09:00-11:00', 'weekly:TU→2026-11-15', ''],
        ['xyz', '2026-11-11', '13:00-15:00', 'weekly:WE→2026-11-15', ''],
        ['xyz', '2026-11-17', '14:00-16:00', 'weekly:TU,TH,FR→2026-11-29', '']
    ]);
    assert.deepEqual(qaAll('IPPM lecture mon wed 9-11am, lab fri 1-4pm until dec 18 except nov 27').series, [
        ['IPPM lecture', '2026-11-09', '09:00-11:00', 'weekly:MO,WE→2026-12-18', ''],
        ['lab', '2026-11-06', '13:00-16:00', 'weekly:FR→2026-12-18', '2026-11-27']
    ]);
    // one time for every stretch
    assert.deepEqual(qaAll('xyz 9-11am every tue, wed until nov 15 then tue, thu, fri until nov 29').series.map((s) => s[2]), ['09:00-11:00', '09:00-11:00']);
    // place, color and a skipped Thanksgiving are shared — the skip lands on the series that meets that day
    assert.deepEqual(qaAll('xyz every tue wed 9-11am until nov 15 then tue thu fri 1-3pm until nov 29 no class nov 26 blue').series, [
        ['xyz', '2026-11-10', '09:00-11:00', 'weekly:TU,WE→2026-11-15', '', 'cobalt'],
        ['xyz', '2026-11-17', '13:00-15:00', 'weekly:TU,TH,FR→2026-11-29', '2026-11-26', 'cobalt']
    ]);
    // a different activity runs alongside instead of after
    assert.deepEqual(qaAll('IPPM lecture tue 8-10am until dec 18. lab thu 1-4pm until dec 18').series.map((s) => [s[0], s[1]]), [['IPPM lecture', '2026-11-10'], ['lab', '2026-11-12']]);
});

test('stretches that end by length or count hand off to the next; weekday spans; every other', () => {
    assert.deepEqual(qaAll('Gym MWF 6am for 4 weeks then tue thu 7am for 4 weeks').series, [
        ['Gym', '2026-11-06', '06:00-07:00', 'weekly:MO,WE,FR→2026-12-03', ''],
        ['Gym', '2026-12-08', '07:00-08:00', 'weekly:TU,TH→2026-12-31', '']
    ]);
    assert.deepEqual(qaAll('xyz tue wed 9-11am 4 times then tue thu fri 1-3pm until nov 29').series.map((s) => [s[1], s[3]]), [['2026-11-10', 'weekly:TU,WE→2026-11-18#4'], ['2026-11-19', 'weekly:TU,TH,FR→2026-11-29']]);
    assert.deepEqual(qaAll('rotation mon-fri 8am-5pm until dec 18 then mon wed fri 8am-12pm until jan 15').series.map((s) => [s[1], s[3]]), [['2026-11-06', 'weekly:MO,TU,WE,TH,FR→2026-12-18'], ['2026-12-21', 'weekly:MO,WE,FR→2027-01-15']]);
    assert.deepEqual(qaAll('study group every other wed 6-8pm until dec 16 then every wed 6-8pm until jan 30').series.map((s) => [s[1], s[3]]), [['2026-11-11', 'weekly:WE/2→2026-12-16'], ['2026-12-23', 'weekly:WE→2027-01-30']]);
    // no dates to tell the stretches apart → still added, with a note saying what to add
    assert.match(qaAll('xyz every tue wed then tue thu fri').warnings.join(' '), /until <date>/);
});

test('plain quick adds stay one item, and pasted imports never split', () => {
    for (const t of ['Lunch w/ Sam tomorrow 12-1pm @ Cafe', 'lunch thu 1pm, gym fri 6pm', 'dentist tue 9am, then gym MWF 6pm', 'gym MWF 6am until dec 18 green', 'Board review Nov 5-7 #school']) {
        assert.equal(qaAll(t).series.length, 1, t);
    }
    assert.equal(qaAll('xyz tue/wed 9-11am until nov 15 then tue/thu/fri 1-3pm nov 17-29', false).series.length, 1);
});

test('one series: bare day lists, one day until a date, glued dates, mon-fri, except', () => {
    assert.deepEqual(qaAll('xyz tue wed 9-11am until nov 15').series, [['xyz', '2026-11-10', '09:00-11:00', 'weekly:TU,WE→2026-11-15', '']]);
    assert.deepEqual(qaAll('ortho tue 9am until dec 18').series, [['ortho', '2026-11-10', '09:00-10:00', 'weekly:TU→2026-12-18', '']]);
    assert.deepEqual(qaAll('gym MWF 6am until dec18').series[0].slice(0, 4), ['gym', '2026-11-06', '06:00-07:00', 'weekly:MO,WE,FR→2026-12-18']);
    assert.deepEqual(qaAll('IPPM lecture every tue 8-10am until dec 18 except nov 24, dec 1').series, [['IPPM lecture', '2026-11-10', '08:00-10:00', 'weekly:TU→2026-12-18', '2026-11-24,2026-12-01']]);
    assert.match(qaAll('gym MWF 6am except nov 26').warnings.join(' '), /Nov 26 isn't one of its days/);
    // a weekday span is a repeat only when it's the work week or said with "every"
    assert.equal(qaAll('Conference wed-fri').series[0][3], 'once');
    assert.equal(qaAll('clinic every tue thru thu 8am').series[0][3], 'weekly:TU,WE,TH');
});

const dayBoxes = (text, interactive = true) => qaAll(text, interactive).series.map((s) => s[1] + ' ' + s[2] + ' ' + s[3]);
const THANKSGIVING = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-30'].map((d) => d + ' 08:00-19:00 once');

test('the same thing on several days with a time → a separate box on each day', () => {
    assert.deepEqual(dayBoxes('thanksgiving break nov 26-28 8am-7pm'), THANKSGIVING.slice(0, 3));
    assert.equal(qaAll('thanksgiving break nov 26-28 8am-7pm').series[0][0], 'thanksgiving break');
    for (const t of ['thanksgiving break nov 26, 27, 28 and 30 8am-7pm', 'thanksgiving break nov 26, nov 27, and nov 28, nov 30  8am-7pm',
        'thanksgiving break nov 26-28 and nov 30 8am-7pm', 'thanksgiving break nov 26-30 except nov 29 8am-7pm', 'thanksgiving break 8am-7pm on nov 26, 27, 28, 30',
        'thanksgiving break 11/26, 11/27, 11/28 & 11/30 from 8am to 7pm', 'thanksgiving break thu nov 26 - sat nov 28 and mon nov 30 8-7pm']) {
        assert.deepEqual(dayBoxes(t), THANKSGIVING, t);
    }
    // a day said twice is added once, with the likely-meant day named
    const dup = qaAll('thanksgiving break nov 27, nov 27, and nov 28, nov 30  8am-7pm');
    assert.deepEqual(dup.series.map((s) => s[1]), ['2026-11-27', '2026-11-28', '2026-11-30']);
    assert.match(dup.warnings.join(' '), /Nov 27 is listed twice — added once \(meant Nov 26\?\)/);
    assert.deepEqual(qaAll('break nov 26-28 and nov 30 8am-7pm blue').series.map((s) => s[5]), ['cobalt', 'cobalt', 'cobalt', 'cobalt']);
    assert.deepEqual(dayBoxes('shift today and tomorrow 3pm-11pm'), ['2026-11-06 15:00-23:00 once', '2026-11-07 15:00-23:00 once']);
    assert.match(qaAll('call thu nov 26 and fri nov 28 9am').warnings.join(' '), /Nov 28 is a Saturday, not a Friday/);
    // a long stretch is one daily series, not dozens of events
    const long = qaAll('rotation jan 5 - mar 20 8am-5pm');
    assert.deepEqual(long.series.map((s) => s[3]), ['daily:→2027-03-20']);
    assert.match(long.warnings.join(' '), /75 days — added as one daily series/);
});

test('day spans that stay one item: all-day bars, times on each end, repeats bounded by the span', () => {
    assert.deepEqual(qaAll('Retreat dec 4 to dec 6').series.map((s) => s[2]), ['all day']);
    assert.equal(c.buildEventSpec({ verb: 'EVENT', fields: {}, quick: 'Retreat dec 4 to dec 6', interactive: true }, { today: FRI, settings: c.getDefaultSettings(), nowMs: NOW }).spec.endDate, '2026-12-06');
    const trip = c.buildEventSpec({ verb: 'EVENT', fields: {}, quick: 'trip nov 26 8am - nov 28 7pm', interactive: true }, { today: FRI, settings: c.getDefaultSettings(), nowMs: NOW });
    assert.deepEqual([trip.spec.startDate, trip.spec.startTime, trip.spec.endDate, trip.spec.endTime, !!trip.specs], ['2026-11-26', '08:00', '2026-11-28', '19:00', false]);
    assert.deepEqual(qaAll('gym MWF nov 10 - dec 18 6am').series[0].slice(1, 4), ['2026-11-11', '06:00-07:00', 'weekly:MO,WE,FR→2026-12-18']);
    assert.deepEqual(qaAll('break every day nov 26-28 8am-7pm').series, [['break', '2026-11-26', '08:00-19:00', 'daily:→2026-11-28', '']]);
    // pasted imports never split
    assert.equal(qaAll('thanksgiving break nov 26, 27, 28 and 30 8am-7pm', false).series.length, 1);
});

test('8:30am, 12:30pm and 4pm with no end time run the 3-hour clinic session', () => {
    const when = (t, interactive = true) => qaAll(t, interactive).series.map((s) => s[2]);
    for (const [t, want] of [['lecture fri 8:30am', '08:30-11:30'], ['lecture fri 8:30', '08:30-11:30'], ['lecture fri 12:30pm', '12:30-15:30'], ['lecture fri 12:30', '12:30-15:30'],
        ['lecture fri 4:00pm', '16:00-19:00'], ['lecture fri 4pm', '16:00-19:00'], ['lecture fri 4:00', '16:00-19:00'], ['gym MWF 8:30am', '08:30-11:30'], ['pt Moe tue 12:30', '12:30-15:30']]) {
        assert.deepEqual(when(t), [want], t);
    }
    // repeating series, schedule changes and per-day lists follow it too
    assert.deepEqual(when('x tue/wed 8:30am until nov 15 then tue/thu/fri 12:30pm nov 17-29'), ['08:30-11:30', '12:30-15:30']);
    assert.deepEqual(when('break nov 26-28 4pm'), ['16:00-19:00', '16:00-19:00', '16:00-19:00']);
    // an end time or a length wins; other times keep the normal hour; tasks and deadlines stay a due time
    for (const [t, want] of [['lecture 8:30-9:45 am', '08:30-09:45'], ['lecture 8:30am to 10', '08:30-10:00'], ['lecture 8:30am for 1 hour', '08:30-09:30'], ['lecture 12:30-1:15', '12:30-13:15'],
        ['lecture fri 8:30 pm', '20:30-21:30'], ['lecture fri 4am', '04:00-05:00'], ['lecture fri 9am', '09:00-10:00'], ['lecture fri 12:45pm', '12:45-13:45'],
        ['remind me to call mom fri 4pm', '16:00-16:00'], ['rent due fri 4pm', '16:00-16:00']]) {
        assert.deepEqual(when(t), [want], t);
    }
    // typed quick add only — pasted imports keep the default length
    assert.deepEqual(when('lecture fri 8:30am', false), ['08:30-09:30']);
});
