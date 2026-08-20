// SULLY OS — stim calc importer test harness (Task 1)
// Run: node tests/sullyos/test-stimcalc-parser.mjs
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imp = require(path.join(__dirname, '../../js/stimcalc/importer.js'));
const { scNormalizeTime, scValidDateStr, scComputeSleptHours, scParseImportText, scBuildImportOps, scApplyImportOps, scImportApplyText } = imp;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
    if (cond) { pass++; console.log('  PASS  ' + name); }
    else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  got: ' + JSON.stringify(extra) : '')); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

const TODAY = '2026-08-20';
const YESTERDAY = '2026-08-19';
const OPTS = { today: TODAY };

// ---------- time normalization ----------
section('scNormalizeTime');
ok(scNormalizeTime('13:15') === '13:15', '24h passthrough');
ok(scNormalizeTime('1:15 PM') === '13:15', '12h PM');
ok(scNormalizeTime('1:15pm') === '13:15', '12h pm no space');
ok(scNormalizeTime('12:05 am') === '00:05', '12 AM -> 00');
ok(scNormalizeTime('12:30 PM') === '12:30', '12 PM stays 12');
ok(scNormalizeTime('7:05') === '07:05', 'pad hour');
ok(scNormalizeTime('25:00') === null, 'reject 25h');
ok(scNormalizeTime('10:75') === null, 'reject minute 75');
ok(scNormalizeTime('13:15 PM') === null, 'reject 13h with meridiem');
ok(scNormalizeTime('garbage') === null, 'reject garbage');

// ---------- date validation ----------
section('scValidDateStr');
ok(scValidDateStr('2026-08-20') === true, 'valid date');
ok(scValidDateStr('2026-02-30') === false, 'reject Feb 30 (no rollover)');
ok(scValidDateStr('08/20/2026') === false, 'reject MDY format');
ok(scValidDateStr('2026-8-2') === false, 'reject unpadded');

// ---------- sleep hours computation ----------
section('scComputeSleptHours');
ok(scComputeSleptHours('00:40', '06:45') === 6.1, 'midnight-crossed 00:40->06:45 = 6.1');
ok(scComputeSleptHours('22:00', '06:00') === 8, 'pre-midnight 22:00->06:00 = 8');
ok(scComputeSleptHours('23:30', '07:15') === 7.8, '23:30->07:15 = 7.75 rounds 7.8');

// ---------- parse: full block ----------
section('parse: full STIM_DAY block');
{
    const p = scParseImportText(`STIM_DAY
DATE: 2026-08-20
WOKE: 06:45
FELL_ASLEEP: 00:40
DOSE: 30 @ 07:15
DOSE: 20 @ 12:30
CAFFEINE: 160 | Celsius | 10:15
CAFFEINE: 90 | 15:00
WORKOUT: 18:30 | intense
VITC: 21:00 | high
ALL_NIGHTER: no
PLAN_SLEEP: 23:00`, OPTS);
    ok(p.errors.length === 0, 'no errors', p.errors);
    const d = p.days[0];
    ok(d.date === '2026-08-20', 'date');
    ok(d.woke === '06:45', 'woke');
    ok(d.slept === 6.1, 'computed slept 6.1 from FELL_ASLEEP', d.slept);
    ok(d.doses.length === 2 && d.doses[0].dose === 30 && d.doses[0].time === '07:15', 'doses parsed');
    ok(d.caffeine.length === 2, 'caffeine parsed');
    ok(d.caffeine[1].name === 'Caffeine' && d.caffeine[1].amount === 90, '2-part caffeine defaults name');
    ok(d.workout && d.workout.endTime === '18:30' && d.workout.intense === true, 'workout intense');
    ok(d.vitc && d.vitc.time === '21:00' && d.vitc.high === true, 'vitc high');
    ok(d.allNighter === false, 'all-nighter no');
    ok(d.planSleep === '23:00', 'plan sleep');
}

// ---------- parse: split-shape reassembly (reference-doc / webchat bug) ----------
// The reference doc's own examples put a `---` BETWEEN the STIM_DAY header and
// its DATE:/WOKE:... fields. That must reassemble into one day, not orphan the
// fields. This is the EXACT block a real webchat export produced.
section('parse: STIM_DAY split from fields by stray ---');
{
    const p = scParseImportText(`SYNTAX: SULLYOS-1
STIM_DAY
---
DATE: 2026-08-19
WOKE: 07:15
---
STIM_DAY
---
DATE: 2026-08-20
FELL_ASLEEP: 03:15
WOKE: 07:30`, OPTS);
    ok(p.unrecognized.length === 0, 'no orphan/unrecognized field blocks', p.unrecognized);
    ok(p.days.length === 2, 'reassembled into 2 days', p.days.length);
    ok(p.days[0].date === '2026-08-19' && p.days[0].woke === '07:15', 'day 1 keeps its fields');
    ok(p.days[1].date === '2026-08-20' && p.days[1].fellAsleep === '03:15' && p.days[1].woke === '07:30', 'day 2 keeps its fields');
    // and it actually applies (dry run) — not "Applied 0"
    const ops = scBuildImportOps(p, OPTS);
    ok(ops.some(o => o.kind && o.kind.indexOf('reject') !== 0), 'produces real ops, not all-reject', ops.map(o => o.kind));
}
// single day, banner-only block between header and fields still reassembles
{
    const p = scParseImportText('STIM_DAY\n---\n@STIMCALC\nDATE: 2026-08-20\nWOKE: 06:45', OPTS);
    ok(p.days.length === 1 && p.days[0].woke === '06:45', 'banner+fields fold onto header', p.days.length);
    ok(p.unrecognized.length === 0, 'no unrecognized with banner in the fold', p.unrecognized);
}
// canonical (no stray ---) still works unchanged
{
    const p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nWOKE: 06:45\n---\nSTIM_DAY\nDATE: 2026-08-19\nWOKE: 07:00', OPTS);
    ok(p.days.length === 2 && p.days[0].date === '2026-08-20' && p.days[1].date === '2026-08-19', 'canonical multi-day unaffected');
}

// ---------- parse: SLEPT wins over FELL_ASLEEP ----------
section('parse: SLEPT precedence');
{
    const p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nFELL_ASLEEP: 00:40\nWOKE: 06:45\nSLEPT: 5.5', OPTS);
    ok(p.days[0].slept === 5.5, 'SLEPT wins when both present', p.days[0].slept);
}

// ---------- parse: missing DATE -> today + VISIBLE warning ----------
section('parse: missing DATE');
{
    const p = scParseImportText('STIM_DAY\nDOSE: 30 @ 07:15', OPTS);
    ok(p.days[0].date === TODAY, 'assumes today');
    ok(p.warnings.some(w => w.includes('assumed today')), 'warning surfaced in res.warnings', p.warnings);
}

// ---------- parse: bounds + invalid lines ----------
section('parse: validation errors');
{
    let p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nDOSE: 0 @ 07:15', OPTS);
    ok(p.errors.some(e => e.reason.includes('1–200')), 'dose 0 rejected');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nDOSE: 201 @ 07:15', OPTS);
    ok(p.errors.some(e => e.reason.includes('1–200')), 'dose 201 rejected');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nCAFFEINE: 1001 | X | 10:00', OPTS);
    ok(p.errors.some(e => e.reason.includes('1–1000')), 'caffeine 1001 rejected');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nSLEPT: 15', OPTS);
    ok(p.errors.some(e => e.reason.includes('0–14')), 'SLEPT 15 rejected');
    p = scParseImportText('STIM_DAY\nDATE: 2026-02-30\nDOSE: 30 @ 07:15', OPTS);
    ok(p.errors.some(e => e.reason.includes('real YYYY-MM-DD')), 'bad calendar date rejected');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nBOGUS_FIELD: 12', OPTS);
    ok(p.errors.some(e => e.reason.includes('Unknown field')), 'unknown field rejected');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nFELL_ASLEEP: 07:00\nWOKE: 23:00', OPTS);
    ok(p.errors.some(e => e.reason.includes('implausible')), 'computed >14h sleep rejected');
    p = scParseImportText('', OPTS);
    ok(p.errors.length === 1, 'empty text errors');
}

// ---------- parse: fences, banners, SYNTAX header, unknown blocks, multi-block ----------
section('parse: envelope handling');
{
    let p = scParseImportText('```\nSYNTAX: SULLYOS-1\n@STIMCALC morning brief\nSTIM_DAY\nDATE: 2026-08-20\nDOSE: 30 @ 07:15\n```', OPTS);
    ok(p.errors.length === 0 && p.days.length === 1, 'code fences + banner + SYNTAX stripped', p.errors);
    p = scParseImportText('SYNTAX: SULLYOS-9\nSTIM_DAY\nDATE: 2026-08-20\nDOSE: 30 @ 07:15', OPTS);
    ok(p.warnings.some(w => w.includes('Unknown syntax version')), 'unknown version -> warning not failure');
    ok(p.days.length === 1, 'still parsed');
    p = scParseImportText('BODY_DAY\nDATE: 2026-08-20\nWEIGHT: 190', OPTS);
    ok(p.unrecognized.length === 1 && p.days.length === 0, 'unknown block listed not parsed');
    ok(p.errors.some(e => e.reason.includes('No STIM_DAY')), 'no STIM_DAY error when only foreign blocks');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-19\nDOSE: 30 @ 07:15\n---\nSTIM_DAY\nDATE: 2026-08-20\nDOSE: 30 @ 07:20', OPTS);
    ok(p.days.length === 2, 'multi-block split on ---');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nDOSE_MOVE: 12:30 ->', OPTS);
    ok(p.errors.some(e => e.reason.includes('from time')), 'bad DOSE_MOVE format rejected');
    p = scParseImportText('STIM_DAY\nDATE: 2026-08-20\nALL_NIGHTER: maybe', OPTS);
    ok(p.errors.some(e => e.reason.includes('yes or no')), 'ALL_NIGHTER garbage rejected');
}

// ---------- ops: fixture state ----------
function freshState() {
    return {
        medications: {
            med_a: { id: 'med_a', dose: 30, time: '07:15', date: TODAY, updatedAt: '2026-08-20T07:20:00.000Z' },
            med_y: { id: 'med_y', dose: 20, time: '13:00', date: YESTERDAY, updatedAt: '2026-08-19T13:05:00.000Z' }
        },
        caffeine: {
            caf_a: { id: 'caf_a', amount: 160, name: 'Celsius', time: '10:15', date: TODAY, updatedAt: '2026-08-20T10:20:00.000Z' }
        },
        sleepHistory: {
            '2026-08-20': { hoursSlept: 6.1, wakeTime: '06:45', updatedAt: '2026-08-20T07:00:00.000Z' },
            '2026-08-18': { hoursSlept: 7.5, wakeTime: '07:00', updatedAt: '2026-08-18T08:00:00.000Z' }
        },
        sleepDailyLogs: {
            '2026-08-20': { actualSleep: 6.1, wakeTime: '06:45', checkedIn: true, source: 'checkin', lastUpdated: '2026-08-20T07:00:00.000Z' }
        },
        allNighterMode: false,
        modifiers: { vitaminC: { active: false, time: '17:00', date: null }, workout: { active: false, endTime: '18:00', intense: false, date: null } },
        settings: { sleepTarget: 8, vitcHighDose: false },
        tombstones: { meds: {}, caffeine: {}, sleepDays: {} }
    };
}
function opsFor(text, st) {
    const p = scParseImportText(text, OPTS);
    if (p.errors.length) throw new Error('unexpected parse errors: ' + JSON.stringify(p.errors));
    return scBuildImportOps(p, st, OPTS);
}
const kinds = ops => ops.map(o => o.kind).join(',');

// ---------- ops: adds + idempotent re-paste ----------
section('ops: add + idempotence');
{
    const st = freshState();
    let ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE: 20 @ 12:30\nCAFFEINE: 90 | Coffee | 15:00', st);
    ok(kinds(ops) === 'add-med,add-caff', 'new entries -> adds', kinds(ops));
    // exact duplicates of what's already in state -> pure skips
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nWOKE: 06:45\nSLEPT: 6.1\nDOSE: 30 @ 07:15\nCAFFEINE: 160 | Celsius | 10:15', st);
    ok(ops.every(o => o.kind === 'skip'), 'exact re-paste -> all skips', kinds(ops));
}

// ---------- ops: same-time upsert (merge, never replace) ----------
section('ops: same-date merge semantics');
{
    const st = freshState();
    let ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE: 50 @ 07:15', st);
    ok(ops.length === 1 && ops[0].kind === 'update-med' && ops[0].id === 'med_a' && ops[0].detail.dose === 50, 'same time new dose -> update-med (upsert)', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nCAFFEINE: 200 | Celsius | 10:15', st);
    ok(ops.length === 1 && ops[0].kind === 'update-caff' && ops[0].detail.amount === 200, 'same time new amount -> update-caff', ops[0]);
    // evening brief after morning brief: booster + workout + plan, NO sleep lines
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE: 20 @ 12:30\nWORKOUT: 18:30 | intense\nPLAN_SLEEP: 23:00', st);
    ok(kinds(ops) === 'add-med,plan-sleep,set-workout', 'evening paste: booster+workout+plan only', kinds(ops));
    ok(!ops.some(o => o.id === 'med_a' || (o.kind && o.kind.indexOf('sleep-') === 0)), 'morning dose + sleep untouched');
    // WOKE-only paste keeps existing hours (field-level merge)
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nWOKE: 07:30', st);
    ok(ops.length === 1 && ops[0].kind === 'sleep-upsert' && ops[0].detail.hours === 6.1 && ops[0].detail.wake === '07:30', 'WOKE-only merge keeps hours', ops[0]);
}

// ---------- ops: date gating ----------
section('ops: date gates');
{
    const st = freshState();
    let ops = opsFor('STIM_DAY\nDATE: 2026-08-19\nDOSE: 25 @ 09:00', st);
    ok(ops.length === 1 && ops[0].kind === 'add-med', 'yesterday dose allowed', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-17\nDOSE: 25 @ 09:00\nCAFFEINE: 90 | X | 10:00', st);
    ok(ops.every(o => o.kind === 'reject'), 'older-than-yesterday dose+caffeine rejected', kinds(ops));
    ops = opsFor('STIM_DAY\nDATE: 2026-08-21\nDOSE: 25 @ 09:00\nSLEPT: 7\nPLAN_SLEEP: 23:00', st);
    ok(ops.filter(o => o.kind === 'reject').length === 2, 'future dose + future sleep rejected', kinds(ops));
    ok(ops.some(o => o.kind === 'plan-sleep'), 'PLAN_SLEEP is the only future-valid field', kinds(ops));
    // modifiers on a past day -> skip not mutate
    ops = opsFor('STIM_DAY\nDATE: 2026-08-19\nWORKOUT: 18:00\nVITC: 21:00\nALL_NIGHTER: yes', st);
    ok(ops.every(o => o.kind === 'skip' || o.kind === 'add-med'), 'past-day modifiers skipped', kinds(ops));
}

// ---------- ops: modifiers today ----------
section('ops: modifiers (today)');
{
    const st = freshState();
    let ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nWORKOUT: 18:30 | intense\nVITC: 21:00 | high\nALL_NIGHTER: yes', st);
    ok(kinds(ops) === 'set-workout,set-vitc,set-allnighter', 'today modifiers -> set ops', kinds(ops));
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nALL_NIGHTER: no', st);
    ok(ops.length === 1 && ops[0].kind === 'skip', 'all-nighter already off -> skip', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nWORKOUT: none', st);
    ok(ops.length === 1 && ops[0].kind === 'set-workout' && ops[0].detail === null, 'WORKOUT none -> deactivate op', ops[0]);
}

// ---------- ops: PLAN_SLEEP ----------
section('ops: PLAN_SLEEP');
{
    const st = freshState();
    let ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nPLAN_SLEEP: 23:00', st);
    ok(ops.length === 1 && ops[0].kind === 'plan-sleep' && ops[0].detail.time === '23:00', 'plan-sleep op', ops[0]);
    st.sleepDailyLogs['2026-08-20'].plannedBedtime = '23:00';
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nPLAN_SLEEP: 23:00', st);
    ok(ops.length === 1 && ops[0].kind === 'skip', 'plan already set -> skip', ops[0]);
}

// ---------- ops: verbs ----------
section('ops: MOVE / DELETE verbs');
{
    const st = freshState();
    let ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE_MOVE: 07:15 -> 08:00', st);
    ok(ops.length === 1 && ops[0].kind === 'update-med' && ops[0].id === 'med_a' && ops[0].detail.time === '08:00', 'move resolves by date+time', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE_MOVE: 05:00 -> 08:00', st);
    ok(ops.length === 1 && ops[0].kind === 'reject', 'move with nothing at from -> reject', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE_MOVE: 05:00 -> 07:15', st);
    ok(ops.length === 1 && ops[0].kind === 'skip' && ops[0].reason.includes('already moved'), 're-pasted move (entry at to) -> skip', ops[0]);
    // ambiguity: two meds at same slot
    const st2 = freshState();
    st2.medications.med_b = { id: 'med_b', dose: 10, time: '07:15', date: TODAY, updatedAt: '2026-08-20T07:30:00.000Z' };
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE_MOVE: 07:15 -> 08:00', st2);
    ok(ops.length === 1 && ops[0].kind === 'reject' && ops[0].reason.includes('Ambiguous'), 'ambiguous move -> reject', ops[0]);
    // target occupied
    const st3 = freshState();
    st3.medications.med_c = { id: 'med_c', dose: 10, time: '08:00', date: TODAY, updatedAt: '2026-08-20T08:05:00.000Z' };
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE_MOVE: 07:15 -> 08:00', st3);
    ok(ops.length === 1 && ops[0].kind === 'reject' && ops[0].reason.includes('already sits'), 'occupied target -> reject', ops[0]);
    // deletes
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE_DELETE: 07:15', st);
    ok(ops.length === 1 && ops[0].kind === 'delete-med' && ops[0].destructive === true && ops[0].id === 'med_a', 'delete resolves + destructive flag', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nDOSE_DELETE: 05:00', st);
    ok(ops.length === 1 && ops[0].kind === 'reject', 'delete with no entry -> loud reject', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nCAFF_DELETE: 10:15', st);
    ok(ops.length === 1 && ops[0].kind === 'delete-caff' && ops[0].destructive === true, 'caff delete destructive', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nSLEEP_DELETE: 2026-08-18', st);
    ok(ops.length === 1 && ops[0].kind === 'sleep-delete' && ops[0].destructive === true && ops[0].detail.isToday === false, 'sleep delete by own date', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nSLEEP_DELETE: 2026-08-01', st);
    ok(ops.length === 1 && ops[0].kind === 'skip', 'sleep delete of nothing -> skip', ops[0]);
    ops = opsFor('STIM_DAY\nDATE: 2026-08-20\nSLEEP_DELETE: 2026-08-20', st);
    ok(ops.length === 1 && ops[0].detail.isToday === true, 'sleep delete today flags isToday', ops[0]);
}

// ---------- APPLY LAYER (browser globals stubbed) ----------
// scApplyImportOps resolves state/generateId/etc. as free variables -> stub
// them on globalThis exactly like state.js defines them in the browser.
let idSeq = 0;
globalThis.generateId = prefix => prefix + '_gen' + (++idSeq);
globalThis.getLocalDateString = d => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
globalThis.migrateArrayToObject = (arr, prefix) => {
    if (!arr) return {};
    if (!Array.isArray(arr)) return arr;
    const out = {}; arr.forEach(e => { const id = e.id || generateId(prefix); out[id] = { ...e, id }; }); return out;
};
globalThis.computeSleepStatus = h => h >= 7 ? 'good' : h >= 5.5 ? 'ok' : 'poor';

function applyText(text, st) {
    globalThis.state = st;
    const p = scParseImportText(text, OPTS);
    if (p.errors.length) throw new Error('parse errors: ' + JSON.stringify(p.errors));
    const ops = scBuildImportOps(p, st, OPTS);
    return { counts: scApplyImportOps(ops), ops };
}
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

section('apply: add mirrors manual CRUD shape');
{
    const st = freshState();
    const { counts } = applyText('STIM_DAY\nDATE: 2026-08-20\nDOSE: 20 @ 12:30\nCAFFEINE: 90 | Coffee | 15:00', st);
    ok(counts.applied === 2, 'both applied', counts);
    const med = Object.values(st.medications).find(m => m.time === '12:30');
    ok(med && med.id.startsWith('med_') && med.dose === 20 && med.date === TODAY && ISO_RE.test(med.updatedAt), 'med entry shape == addMedEntry()', med);
    ok(med.id === Object.keys(st.medications).find(k => st.medications[k] === med), 'keyed by own id');
    const caf = Object.values(st.caffeine).find(c => c.time === '15:00');
    ok(caf && caf.id.startsWith('caf_') && caf.amount === 90 && caf.name === 'Coffee' && ISO_RE.test(caf.updatedAt), 'caffeine entry shape == addCaffeine()', caf);
}

section('apply: update bumps stamp');
{
    const st = freshState();
    st.medications.med_a.updatedAt = '2000-01-01T00:00:00.000Z'; // clearly older than runtime clock
    const before = st.medications.med_a.updatedAt;
    applyText('STIM_DAY\nDATE: 2026-08-20\nDOSE: 50 @ 07:15', st);
    ok(st.medications.med_a.dose === 50 && st.medications.med_a.updatedAt > before, 'dose updated + updatedAt bumped', st.medications.med_a);
}

section('apply: delete writes tombstone BEFORE removal');
{
    const st = freshState();
    applyText('STIM_DAY\nDATE: 2026-08-20\nDOSE_DELETE: 07:15\nCAFF_DELETE: 10:15', st);
    ok(!st.medications.med_a && ISO_RE.test(st.tombstones.meds.med_a), 'med gone + tombstone stamped', st.tombstones.meds);
    ok(!st.caffeine.caf_a && ISO_RE.test(st.tombstones.caffeine.caf_a), 'caffeine gone + tombstone stamped', st.tombstones.caffeine);
}

section('apply: sleep upsert (today == confirmMorningCheckin)');
{
    const st = freshState();
    delete st.sleepHistory[TODAY]; delete st.sleepDailyLogs[TODAY];
    applyText('STIM_DAY\nDATE: 2026-08-20\nWOKE: 06:45\nFELL_ASLEEP: 00:40', st);
    ok(st.wakeTime === '06:45' && st.hoursSleptLastNight === 6.1, 'live wake/hours set');
    const sh = st.sleepHistory[TODAY];
    ok(sh && sh.hoursSlept === 6.1 && sh.wakeTime === '06:45' && ISO_RE.test(sh.updatedAt), 'sleepHistory shape', sh);
    const dl = st.sleepDailyLogs[TODAY];
    ok(dl && dl.actualSleep === 6.1 && dl.checkedIn === true && dl.source === 'import' && ISO_RE.test(dl.lastUpdated), 'sleepDailyLogs shape', dl);
}

section('apply: sleep upsert (past == saveSleepEdit)');
{
    const st = freshState();
    applyText('STIM_DAY\nDATE: 2026-08-17\nSLEPT: 7.5\nWOKE: 07:00', st);
    const dl = st.sleepDailyLogs['2026-08-17'];
    ok(dl && dl.hoursSlept === 7.5 && dl.status === 'good' && dl.sleepDeficit === 0.5 && dl.source === 'import', 'past log has status/deficit', dl);
    ok(st.wakeTime === undefined && st.hoursSleptLastNight === undefined, 'past edit does NOT touch live wake/hours');
}

section('apply: sleep delete == clearSleepEntry');
{
    const st = freshState();
    st.hoursSleptLastNight = 6.1;
    applyText('STIM_DAY\nDATE: 2026-08-20\nSLEEP_DELETE: 2026-08-20', st);
    ok(!st.sleepHistory[TODAY] && !st.sleepDailyLogs[TODAY] && ISO_RE.test(st.tombstones.sleepDays[TODAY]), 'both stores cleared + tombstone');
    ok(st.hoursSleptLastNight === 7, 'today delete resets hoursSleptLastNight to 7');
}

section('apply: plan sleep + modifiers');
{
    const st = freshState();
    applyText('STIM_DAY\nDATE: 2026-08-20\nPLAN_SLEEP: 23:00\nWORKOUT: 18:30 | intense\nVITC: 21:00 | high\nALL_NIGHTER: yes', st);
    const dl = st.sleepDailyLogs[TODAY];
    ok(dl.plannedBedtime === '23:00' && dl.actualSleep === 6.1 && dl.source === 'checkin', 'plannedBedtime merged WITHOUT clobbering checkin fields', dl);
    ok(st.modifiers.workout.active === true && st.modifiers.workout.endTime === '18:30' && st.modifiers.workout.intense === true && st.modifiers.workout.date === globalThis.getLocalDateString(), 'workout == toggleModifier()');
    ok(st.modifiers.vitaminC.active === true && st.modifiers.vitaminC.time === '21:00' && st.settings.vitcHighDose === true, 'vitc + high-dose flag');
    ok(st.allNighterMode === true && st._dataLoaded === true, 'all-nighter == toggleAllNighterMode()');
}

section('apply: end-to-end idempotence (paste -> apply -> re-paste == all skips)');
{
    const st = freshState();
    const text = 'STIM_DAY\nDATE: 2026-08-20\nWOKE: 06:45\nSLEPT: 6.1\nDOSE: 20 @ 12:30\nCAFFEINE: 90 | Coffee | 15:00\nPLAN_SLEEP: 23:00\nWORKOUT: 18:30 | intense\nALL_NIGHTER: no';
    const first = applyText(text, st);
    ok(first.counts.applied > 0, 'first paste applies', first.counts);
    const second = applyText(text, st);
    ok(second.ops.every(o => o.kind === 'skip' || (o.kind === 'set-workout')), 'second paste: only skips (workout set-op is state-identical)', second.ops.map(o => o.kind + ':' + (o.reason || '')));
    ok(second.ops.filter(o => o.kind !== 'skip').every(o => !o.destructive), 'nothing destructive on re-paste');
}

section('scImportApplyText (relay entry)');
{
    const st = freshState();
    globalThis.state = st;
    let r = scImportApplyText('STIM_DAY\nDATE: 2026-08-20\nDOSE: 20 @ 12:30\nDOSE_DELETE: 07:15', { autoApply: true, today: TODAY });
    ok(r.ok === true && r.applied === 1 && r.pendingDestructive === 1, 'autoApply applies safe op, queues destructive', r);
    ok(st.medications.med_a !== undefined, 'destructive op NOT auto-applied');
    ok(Object.values(st.medications).some(m => m.time === '12:30'), 'safe add applied');
    r = scImportApplyText('STIM_DAY\nDATE: 2026-08-20\nDOSE: 999 @ 07:15', { autoApply: true, today: TODAY });
    ok(r.ok === false && r.errors.length === 1, 'parse errors -> ok:false zero mutation', r);
    ok(st.medications.med_a.dose === 30, 'state untouched on parse error');
}

// ---------- summary ----------
console.log('\n' + '='.repeat(40));
console.log('TOTAL: ' + (pass + fail) + '  PASS: ' + pass + '  FAIL: ' + fail);
if (fail > 0) process.exit(1);
console.log('ALL GREEN');
