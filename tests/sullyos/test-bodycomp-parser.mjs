// SULLYOS-1 body-comp parser harness
// Extracts the [SULLYOS-PARSER-START]/[SULLYOS-PARSER-END] regions from
// body-comp-tracker.html (the REAL shipped code, not a copy) and exercises
// every grammar branch with stubbed date/time providers.
// Run: node tests/sullyos/test-bodycomp-parser.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(ROOT, 'body-comp-tracker.html'), 'utf-8');

const regions = [...html.matchAll(/\/\/ \[SULLYOS-PARSER-START\]([\s\S]*?)\/\/ \[SULLYOS-PARSER-END\]/g)]
    .map(m => m[1]);
if (regions.length !== 3) {
    console.error(`FATAL: expected 3 sentinel regions, found ${regions.length}`);
    process.exit(1);
}

const TODAY = '2026-08-20';
const NOW_TIME = '14:30';

const factory = new Function(
    'getLocalDateString', 'getCurrentTimeET',
    regions.join('\n') + `
    return {
        parseImportText, parseImportLine, logImportDefaultDate,
        parseTimeFlexible, parseKvTail,
        convertMealEditFields, convertWorkoutEditFields, convertWeighInEditFields,
        sullyEntries, sullyMatchMeals, sullyMatchWorkouts, sullyMatchWeighIns,
        normalizeImportWorkoutType, parseImportNumber, isValidImportDate
    };`
);
const api = factory(() => TODAY, () => NOW_TIME);

let pass = 0, fail = 0;
const failures = [];
function t(name, cond, detail) {
    if (cond) { pass++; }
    else { fail++; failures.push(`✗ ${name}${detail !== undefined ? ' — got: ' + JSON.stringify(detail) : ''}`); }
}
const line = s => api.parseImportLine(s);
const ok = r => r && r.ok === true;
const rej = r => r && r.ok === false;

// ---------- parseTimeFlexible ----------
t('24h passthrough', api.parseTimeFlexible('14:30') === '14:30');
t('24h zero-pad', api.parseTimeFlexible('9:05') === '09:05');
t('12h PM', api.parseTimeFlexible('2:30 PM') === '14:30');
t('12h PM no space', api.parseTimeFlexible('2:30PM') === '14:30');
t('12h lowercase am', api.parseTimeFlexible('7:15 am') === '07:15');
t('midnight 12:00 AM', api.parseTimeFlexible('12:00 AM') === '00:00');
t('noon 12:00 PM', api.parseTimeFlexible('12:00 PM') === '12:00');
t('23:59 valid', api.parseTimeFlexible('23:59') === '23:59');
t('24:00 invalid', api.parseTimeFlexible('24:00') === null);
t('minutes > 59 invalid', api.parseTimeFlexible('13:75') === null);
t('13 PM invalid', api.parseTimeFlexible('13:00 PM') === null);
t('0:30 AM invalid', api.parseTimeFlexible('0:30 AM') === null);
t('garbage invalid', api.parseTimeFlexible('noonish') === null);

// ---------- parseKvTail ----------
{
    const r = api.parseKvTail(['MEAL_EDIT', 'X', '2026-08-19', 'cal=850', 'protein=50'], 3);
    t('kv tail parses', !r.err && r.kv.cal === '850' && r.kv.protein === '50', r);
    const dup = api.parseKvTail(['V', 'cal=1', 'cal=2'], 1);
    t('kv duplicate key rejects', !!dup.err, dup);
    const bad = api.parseKvTail(['V', 'justtext'], 1);
    t('kv non key=value rejects', !!bad.err, bad);
    const empt = api.parseKvTail(['V', '', 'cal=5'], 1);
    t('kv empty segment skipped', !empt.err && empt.kv.cal === '5', empt);
}

// ---------- ADD lines ----------
{
    const r = line('MEAL|Chipotle Bowl|900|45|80|30|7:30 PM|2026-08-19');
    t('MEAL 12h time ok', ok(r) && r.item.type === 'meal' && r.item.time === '19:30', r);
    t('MEAL fields', ok(r) && r.item.name === 'Chipotle Bowl' && r.item.calories === 900 && r.item.protein === 45, r);
}
{
    const r = line('MEAL|Eggs|300|20|2|22|06:45|2026-08-19');
    t('MEAL 24h time ok', ok(r) && r.item.time === '06:45', r);
}
{
    const r = line('MEAL|Eggs|300|20|2|22|quarter past|2026-08-19');
    t('MEAL bad time rejects', rej(r), r);
}
{
    const r = line('MEAL|Eggs|300|20|2|22||2026-08-19');
    t('MEAL omitted time defaults to now', ok(r) && r.item.time === NOW_TIME, r);
}
{
    const r = line('MEAL|Future|500|20|10|5||2026-08-21');
    t('MEAL future date rejects', rej(r), r);
}
{
    const r = line('WORKOUT|Lift|60|300|6:00 AM|2026-08-19');
    t('WORKOUT 12h time ok', ok(r) && r.item.type === 'workout' && r.item.time === '06:00', r);
    t('WORKOUT type normalized', ok(r) && r.item.workoutType === 'Lift', r);
}
{
    const r = line('WEIGHIN|189.4||2026-08-20');
    t('WEIGHIN empty BF valid', ok(r) && r.item.type === 'weighin' && r.item.weight === 189.4, r);
    t('WEIGHIN empty BF stays unset (never 0)', ok(r) && (r.item.bodyFat === null || r.item.bodyFat === undefined) && r.item.bodyFat !== 0, r);
}
{
    const r = line('WEIGHIN|189.4|22.5|2026-08-20');
    t('WEIGHIN with BF', ok(r) && r.item.bodyFat === 22.5, r);
}

// ---------- FOOD ----------
{
    const r = line('FOOD|Protein Shake|220|40|8|3');
    t('FOOD parses', ok(r) && r.item.type === 'food' && r.item.name === 'Protein Shake' && r.item.calories === 220 && r.item.fat === 3, r);
}
{
    const r = line('FOOD|Snack|150');
    t('FOOD omitted macros default 0', ok(r) && r.item.protein === 0 && r.item.carbs === 0 && r.item.fat === 0, r);
}
t('FOOD missing name rejects', rej(line('FOOD||220|40|8|3')));
t('FOOD bad calories rejects', rej(line('FOOD|X|abc|1|1|1')));
t('FOOD too many fields rejects', rej(line('FOOD|X|220|40|8|3|extra')));

// ---------- MEAL_EDIT ----------
{
    const r = line('MEAL_EDIT|Chipotle Bowl|2026-08-19|cal=850|protein=50');
    t('MEAL_EDIT parses', ok(r) && r.item.type === 'meal_edit' && r.item.matchName === 'Chipotle Bowl' && r.item.date === '2026-08-19', r);
    t('MEAL_EDIT changes converted', ok(r) && r.item.changes.calories === 850 && r.item.changes.protein === 50, r);
}
{
    const r = line('MEAL_EDIT|Chipotle Bowl|cal=850');
    t('MEAL_EDIT omitted date defaults to today', ok(r) && r.item.date === TODAY, r);
}
{
    const r = line('MEAL_EDIT|Chipotle Bowl|2026-08-19|date=2026-08-18');
    t('MEAL_EDIT date= is a MOVE change', ok(r) && r.item.changes.date === '2026-08-18', r);
}
{
    const r = line('MEAL_EDIT|Chipotle Bowl|2026-08-19|time=7:15 PM|name=Chipotle Bowl XL');
    t('MEAL_EDIT time= 12h + name=', ok(r) && r.item.changes.time === '19:15' && r.item.changes.name === 'Chipotle Bowl XL', r);
}
t('MEAL_EDIT unknown key rejects', rej(line('MEAL_EDIT|X|2026-08-19|foo=1')));
t('MEAL_EDIT no changes rejects', rej(line('MEAL_EDIT|X|2026-08-19')));
t('MEAL_EDIT future date= rejects', rej(line('MEAL_EDIT|X|2026-08-19|date=2026-08-25')));
t('MEAL_EDIT bad protein rejects', rej(line('MEAL_EDIT|X|2026-08-19|protein=abc')));

// ---------- WORKOUT_EDIT ----------
{
    const r = line('WORKOUT_EDIT|Lift|2026-08-19|duration=75|cal=350');
    t('WORKOUT_EDIT parses', ok(r) && r.item.type === 'workout_edit' && r.item.matchType === 'Lift', r);
    t('WORKOUT_EDIT changes', ok(r) && r.item.changes.duration === 75 && r.item.changes.calories === 350, r);
}
{
    const r = line('WORKOUT_EDIT|Lift|2026-08-19|type=Run');
    t('WORKOUT_EDIT type= change normalized', ok(r) && r.item.changes.type === 'Run', r);
}
t('WORKOUT_EDIT unknown match type rejects', rej(line('WORKOUT_EDIT|Zumba|2026-08-19|duration=30')));
t('WORKOUT_EDIT duration=0 rejects', rej(line('WORKOUT_EDIT|Lift|2026-08-19|duration=0')));

// ---------- WEIGHIN_EDIT ----------
{
    const r = line('WEIGHIN_EDIT|2026-08-19|weight=188.6');
    t('WEIGHIN_EDIT parses', ok(r) && r.item.type === 'weighin_edit' && r.item.changes.weight === 188.6, r);
}
{
    const r = line('WEIGHIN_EDIT|weight=188.6|bf=22.1');
    t('WEIGHIN_EDIT omitted date defaults', ok(r) && r.item.date === TODAY && r.item.changes.bodyFat === 22.1, r);
}
t('WEIGHIN_EDIT bf=75 rejects', rej(line('WEIGHIN_EDIT|2026-08-19|bf=75')));
t('WEIGHIN_EDIT bf=0 rejects', rej(line('WEIGHIN_EDIT|2026-08-19|bf=0')));
t('WEIGHIN_EDIT weight=90 rejects', rej(line('WEIGHIN_EDIT|2026-08-19|weight=90')));
t('WEIGHIN_EDIT no changes rejects', rej(line('WEIGHIN_EDIT|2026-08-19')));

// ---------- DELETE verbs ----------
{
    const r = line('MEAL_DELETE|Chipotle Bowl|2026-08-19');
    t('MEAL_DELETE parses', ok(r) && r.item.type === 'meal_delete' && r.item.matchName === 'Chipotle Bowl' && r.item.matchCal === null, r);
}
{
    const r = line('MEAL_DELETE|Chipotle Bowl|2026-08-19|900');
    t('MEAL_DELETE cal disambiguator', ok(r) && r.item.matchCal === 900, r);
}
t('MEAL_DELETE bad disambiguator rejects', rej(line('MEAL_DELETE|X|2026-08-19|abc')));
t('MEAL_DELETE too many fields rejects', rej(line('MEAL_DELETE|X|2026-08-19|900|extra')));
{
    const r = line('WORKOUT_DELETE|Lift|2026-08-19|60');
    t('WORKOUT_DELETE duration disambiguator', ok(r) && r.item.type === 'workout_delete' && r.item.matchDuration === 60, r);
}
t('WORKOUT_DELETE unknown type rejects', rej(line('WORKOUT_DELETE|Zumba|2026-08-19')));
{
    const r = line('WEIGHIN_DELETE|2026-08-19|189.4');
    t('WEIGHIN_DELETE weight disambiguator', ok(r) && r.item.type === 'weighin_delete' && r.item.matchWeight === 189.4, r);
}
{
    const r = line('WEIGHIN_DELETE|2026-08-19');
    t('WEIGHIN_DELETE no disambiguator', ok(r) && r.item.matchWeight === null, r);
}
t('WEIGHIN_DELETE future date rejects', rej(line('WEIGHIN_DELETE|2026-08-22')));

// ---------- unknown verb ----------
{
    const r = line('NONSENSE|foo|bar');
    t('unknown verb rejects with verb list', rej(r) && /MEAL_EDIT/.test(r.reason) && /WEIGHIN_DELETE/.test(r.reason), r);
}

// ---------- parseImportText (multi-line) ----------
{
    const text = [
        '@BODYCOMP',
        'MEAL|Chipotle Bowl|900|45|80|30|7:30 PM|2026-08-19',
        'FOOD|Protein Shake|220|40|8|3',
        'MEAL_EDIT|Eggs|2026-08-19|cal=310',
        'MEAL_DELETE|Toast|2026-08-19',
        'total garbage line',
        ''
    ].join('\n');
    const r = api.parseImportText(text);
    t('banner line skipped silently', r.items.length === 4 && r.rejected.length === 1, { items: r.items.length, rejected: r.rejected.length });
    t('_line stamped on items', r.items.every(it => typeof it._line === 'string' && it._line.length > 0), r.items.map(i => i._line));
    t('rejected carries reason', r.rejected[0] && !!r.rejected[0].reason, r.rejected);
}

// ---------- matchers (ambiguity machinery) ----------
{
    const meals = {
        m1: { id: 'm1', name: 'Chipotle Bowl', calories: 900, time: '12:30' },
        m2: { id: 'm2', name: 'chipotle bowl', calories: 650, time: '19:00' },
        m3: { id: 'm3', name: 'Eggs', calories: 300 }
    };
    const entries = api.sullyEntries(meals);
    t('sullyEntries object → pairs', entries.length === 3 && entries[0].length === 2);
    const two = api.sullyMatchMeals(entries, 'CHIPOTLE BOWL', null);
    t('meal match case-insensitive, 2 hits = ambiguous', two.length === 2, two.length);
    const one = api.sullyMatchMeals(entries, 'Chipotle Bowl', 650);
    t('meal cal disambiguator narrows to 1', one.length === 1 && one[0][0] === 'm2', one);
    const none = api.sullyMatchMeals(entries, 'Pizza', null);
    t('meal no match', none.length === 0);
}
{
    const workouts = {
        w1: { id: 'w1', type: 'Lift', duration: 60, calories: 300 },
        w2: { id: 'w2', type: 'lift', duration: 45, calories: 200 }
    };
    const entries = api.sullyEntries(workouts);
    t('workout 2 hits without disambiguator', api.sullyMatchWorkouts(entries, 'Lift', null).length === 2);
    const one = api.sullyMatchWorkouts(entries, 'Lift', 45);
    t('workout duration narrows to 1', one.length === 1 && one[0][0] === 'w2', one);
}
{
    const wis = {
        a: { id: 'a', date: '2026-08-19', weight: 189.4 },
        b: { id: 'b', date: '2026-08-19', weight: 190.2 },
        c: { id: 'c', date: '2026-08-18', weight: 191.0 }
    };
    const entries = api.sullyEntries(wis);
    t('weighin date match 2 hits', api.sullyMatchWeighIns(entries, '2026-08-19', null).length === 2);
    const one = api.sullyMatchWeighIns(entries, '2026-08-19', 190.2);
    t('weighin weight narrows to 1', one.length === 1 && one[0][0] === 'b', one);
}
{
    const arr = [{ id: 'x1', name: 'A' }, null, { id: 'x2', name: 'B' }];
    const entries = api.sullyEntries(arr);
    t('sullyEntries array with holes', entries.length === 2 && entries[0][0] === 'x1');
    t('sullyEntries falsy → []', api.sullyEntries(null).length === 0);
}

// ---------- report ----------
console.log(`\n${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length) {
    console.log(failures.join('\n'));
    process.exit(1);
}
console.log('ALL GREEN');
