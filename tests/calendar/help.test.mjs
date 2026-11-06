// Sully Calendar — the Help page only teaches what actually works: every tappable
// quick-add example parses the way its caption says, the phrase table's claims
// hold, and every listed key is wired in init.js.  Run: node --test tests/calendar/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const TODAY = '2026-11-02'; // Monday
const NOW = new Date(2026, 10, 2, 14, 3).getTime();

const qa = (text) => {
    const b = JSON.parse(JSON.stringify(c.buildEventSpec({ verb: 'EVENT', fields: {}, quick: text, interactive: true }, { today: TODAY, settings: c.getDefaultSettings(), nowMs: NOW })));
    const s = b.spec;
    const r = s.recurrence;
    return {
        series: (b.specs || [s]).length, skips: Object.keys(s.exceptions || {}).join(','),
        title: s.title, type: s.type, patient: s.patientName || '', date: s.startDate, endDate: s.endDate, start: s.startTime, end: s.endTime, allDay: !!s.allDay,
        color: s.color || null, location: s.location || '', notes: s.notes || '', cal: s.calendarRef || null, priority: s.priority || null,
        rec: r ? r.freq + (r.interval > 1 ? '/' + r.interval : '') + ':' + (r.byDay || '') + (r.until ? '→' + r.until : '') + (r.count ? '#' + r.count : '') : null,
        rem: Object.keys(s.reminders || {}).join(',')
    };
};
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

// what each Help example must produce (keep in step with HELP_QUICK_EXAMPLES)
const EXPECT = {
    'IPPM lecture tues mornings 8-10am until dec 18 blue': { title: 'IPPM lecture', date: '2026-11-03', start: '08:00', end: '10:00', color: 'cobalt', rec: 'weekly:TU→2026-12-18' },
    'Gym MWF 6am for 4 weeks green': { title: 'Gym', start: '06:00', color: 'basil', rec: 'weekly:MO,WE,FR→2026-11-29' },
    'Dentist next thu 2pm @ BU Dental remind me 1 hour before': { title: 'Dentist', date: '2026-11-12', start: '14:00', location: 'BU Dental', rem: 'm60' },
    "task: call the lab about Chen's crown fri 3pm !high": { title: "call the lab about Chen's crown", type: 'task', date: '2026-11-06', start: '15:00', priority: 'high' },
    'PR2 write-up due nov 20 red': { title: 'PR2 write-up', type: 'deadline', date: '2026-11-20', color: 'tomato' },
    'pt Moe tue 8:30': { type: 'appointment', patient: 'Moe', title: '', date: '2026-11-03', start: '08:30', end: '11:30' },
    'study group every other wed 6-8pm purple': { title: 'study group', date: '2026-11-04', start: '18:00', end: '20:00', color: 'grape', rec: 'weekly/2:WE' },
    'Coffee tomorrow afternoon for 90 min light blue': { title: 'Coffee', date: '2026-11-03', start: '14:00', end: '15:30', color: 'peacock' },
    'board review sat all day // bring flashcards': { title: 'board review', date: '2026-11-07', allDay: true, notes: 'bring flashcards' },
    'Lab cleanup daily 4pm 10 times no reminder': { title: 'Lab cleanup', start: '16:00', rec: 'daily:#10', rem: '' },
    // multi-series examples: the first series here, every series in quickadd.test.mjs
    'Ortho tue/wed 9-11am until nov 15 then tue/thu/fri 1-3pm nov 17-29': { title: 'Ortho', date: '2026-11-03', start: '09:00', end: '11:00', rec: 'weekly:TU,WE→2026-11-15', series: 2 },
    'Anatomy mon wed 9-11am, lab fri 1-4pm until dec 18 except nov 27': { title: 'Anatomy', date: '2026-11-02', start: '09:00', end: '11:00', rec: 'weekly:MO,WE→2026-12-18', series: 2 }
};

test('every tappable Help example makes what its caption says', () => {
    assert.ok(c.HELP_QUICK_EXAMPLES.length >= 6);
    for (const [text, caption] of c.HELP_QUICK_EXAMPLES) {
        const want = EXPECT[text];
        assert.ok(want, 'no expectation for Help example: ' + text);
        assert.ok(caption && caption.length < 48, 'caption: ' + text);
        assert.deepEqual(pick(qa(text), Object.keys(want)), want, text);
    }
});

test('the phrase table holds: lengths, repeat endings, reminders, calendars, priority, ranges', () => {
    assert.deepEqual(pick(qa('Meeting for two hours fri 3pm'), ['title', 'start', 'end']), { title: 'Meeting', start: '15:00', end: '17:00' });
    assert.deepEqual(pick(qa('Nap for half an hour 2pm'), ['title', 'end']), { title: 'Nap', end: '14:30' });
    assert.deepEqual(pick(qa('Ortho seminar weekdays 7am for 6 weeks'), ['title', 'rec']), { title: 'Ortho seminar', rec: 'weekly:MO,TU,WE,TH,FR→2026-12-13' });
    assert.deepEqual(pick(qa('Huddle every tuesday 7:30am for a month'), ['title', 'rec']), { title: 'Huddle', rec: 'weekly:TU→2026-12-02' });
    assert.deepEqual(pick(qa('Rent due dec 1 remind me the day before'), ['type', 'rem']), { type: 'deadline', rem: 'm1440' });
    assert.equal(qa('Shift fri 5pm #school').cal, 'school');
    assert.equal(qa('Shift fri 5pm on my school calendar').cal, 'school');
    assert.equal(qa('Pay card bill fri !low').priority, 'low');
    assert.equal(qa('Pay card bill !!! fri').priority, 'high');
    assert.deepEqual(pick(qa('Retreat dec 4 to dec 6'), ['title', 'date', 'endDate', 'allDay']), { title: 'Retreat', date: '2026-12-04', endDate: '2026-12-06', allDay: true });
    assert.equal(qa('Mock boards 12/15 8am-5pm navy').color, 'blueberry');
    assert.deepEqual(pick(qa('remind me to order trays tomorrow morning'), ['title', 'type', 'start']), { title: 'order trays', type: 'task', start: '09:00' });
    assert.deepEqual(pick(qa('lecture T/Th 1-4pm'), ['rec']), { rec: 'weekly:TU,TH' });
    // a length is not a repeat ending, and an event that doesn't repeat keeps "for 2 days" out of its title
    assert.deepEqual(pick(qa('Gym MWF 6am for 1 hour'), ['end', 'rec']), { end: '07:00', rec: 'weekly:MO,WE,FR' });
    assert.deepEqual(pick(qa('lecture tue wed 9-11am'), ['title', 'rec']), { title: 'lecture', rec: 'weekly:TU,WE' });
    assert.deepEqual(pick(qa('shift mon-fri 7am'), ['title', 'rec']), { title: 'shift', rec: 'weekly:MO,TU,WE,TH,FR' });
    assert.deepEqual(pick(qa('Gym MWF 6am until dec 18 except nov 26'), ['rec', 'skips']), { rec: 'weekly:MO,WE,FR→2026-12-18', skips: '' }); // Thu — not a gym day
    assert.equal(qa('lecture every wed 9am no class nov 11 and 25').skips, '2026-11-11,2026-11-25');
    assert.equal(qa('lecture every wed 9am skip 12/23-12/31').skips, '2026-12-23,2026-12-30');
    assert.equal(qa('tue/wed 9-11am until nov 15 then tue/thu/fri 1-3pm nov 17-29').series, 2);
    assert.equal(qa('mon wed 9-11am, fri 1-4pm').series, 2);
    assert.equal(qa('x every tue until nov 15 then thu until nov 29. nov 15 ending dates 9-11am, nov 17-29 dates 1-3pm').start, '09:00');
    assert.equal(qa('x every tue until nov 15 then thu until nov 29. first part 9-11am, second part 1-3pm').start, '09:00');
    assert.equal(qa('x every tue until nov 15 then thu until nov 29 at 9-11am and 1-3pm respectively').start, '09:00');
});

test('every key the Help page lists is wired in init.js', () => {
    const src = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../js/calendar/init.js'), 'utf8');
    const map = src.slice(src.indexOf('var map = {'), src.indexOf('var fn = map[k]'));
    assert.ok(map.length > 100, 'key map not found');
    const listed = c.SHORTCUTS.flatMap((g) => g[1].map((k) => k[0]));
    for (const combo of listed) {
        for (const key of combo.split(/\s+(?:\/|or)\s+/)) {
            if (key.length !== 1) continue; // Esc / Delete / Ctrl+Z / Enter combos are handled outside the map
            const esc = key.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
            const inMap = new RegExp("(?:^|[\\s{,])(?:" + esc + "|'" + esc + "'):").test(map);
            const onEvent = src.includes("k === '" + key + "'"); // e: only while an event is open
            assert.ok(inMap || onEvent, 'key "' + key + '" is listed in Help but not wired in init.js');
        }
    }
    assert.match(src, /e\.key === 'Delete'|k === 'Delete'/);
    assert.match(src, /e\.key === 'z'/);
});
