// BodyComp adaptive TDEE engine harness (Nov 2026 Kalman-filter engine)
// Extracts the [BODYCOMP-CALIBRATION-START]/[BODYCOMP-CALIBRATION-END] region
// from body-comp-tracker.html (the REAL shipped code, not a copy) and checks
// it against simulated people whose true TDEE error is known: recovery of
// the correction, gaps, batch/backdated imports, robust readings, the
// smoother, the walk-forward backtest and the trend. Pure functions only.
// Run: TZ=America/New_York node tests/bodycomp/test-calibration.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(ROOT, 'body-comp-tracker.html'), 'utf-8');
const regions = [...html.matchAll(/\/\/ \[BODYCOMP-CALIBRATION-START\]([\s\S]*?)\/\/ \[BODYCOMP-CALIBRATION-END\]/g)].map(m => m[1]);
if (regions.length !== 1) {
    console.error(`FATAL: expected 1 calibration region, found ${regions.length}`);
    process.exit(1);
}
const api = new Function(regions[0] + `
    return { TDEE_CALIBRATION, CALIBRATION_CONFIDENCE_LABELS, calDayNumber, calAddDays, calIsDate, calTheilSen,
        selectCalibrationWeighIns, calFlagFluctuations, calConfidenceForSd, calRunEnergyBalance,
        calCorrectionForDate, calTrendFromRun, calBacktestEnergyBalance, calPredictionPaths,
        calMergeHistories, calObservedWeightTrend, calGoalForecast };`)();
const C = api.TDEE_CALIBRATION;

let pass = 0, fail = 0;
const failures = [];
function t(name, cond, detail) {
    if (cond) pass++;
    else { fail++; failures.push(`✗ ${name}${detail !== undefined ? ' — got: ' + JSON.stringify(detail) : ''}`); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const r1 = v => Math.round(v * 10) / 10;

// ---------- simulator ----------
// Deterministic PRNG (mulberry32) + Box–Muller so runs are reproducible.
function rng(seed) {
    let a = seed >>> 0;
    const uni = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let x = Math.imul(a ^ (a >>> 15), 1 | a);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    return { uni, normal: () => Math.sqrt(-2 * Math.log(uni() + 1e-12)) * Math.cos(2 * Math.PI * uni()) };
}

/**
 * A person whose real TDEE = formula TDEE + offset (offset lumps formula
 * error and under-logging). endDate is the live day: weigh-ins through it,
 * food through the day before. Water is an AR(1) process on top of tissue.
 */
function simulate({ endDate = '2026-11-06', days = 120, offset = -250, formula = 2530, intakeMean = 2000,
    intakeSd = 300, startWeight = 190, scaleSd = 0.45, waterSd = 0.5, waterPhi = 0.7, weighEvery = 1,
    untracked = [], untrackedSurplus = 0, seed = 7 } = {}) {
    const R = rng(seed);
    const start = api.calAddDays(endDate, -days);
    let tissue = startWeight, water = 0;
    const foodDays = [], weighIns = [], truth = [];
    for (let i = 0; i <= days; i++) {
        const date = api.calAddDays(start, i);
        water = waterPhi * water + Math.sqrt(1 - waterPhi ** 2) * waterSd * R.normal();
        truth.push({ date, tissue });
        if (i % weighEvery === 0) {
            weighIns.push({ id: `wi_${date}`, date, weight: r1(tissue + water + scaleSd * R.normal()), bodyFat: 24 });
        }
        if (i === days) break;
        const gap = untracked.some(([a, b]) => date >= a && date <= b);
        const intake = Math.round(intakeMean + intakeSd * R.normal());
        const eaten = gap ? intake + untrackedSurplus : intake;
        tissue += (eaten - (formula + offset)) / C.KCAL_PER_LB;
        if (!gap) foodDays.push({ date, intake, modelTdee: formula });
    }
    return { input: { endDate, days: foodDays, weighIns }, truth };
}
const run = input => api.calRunEnergyBalance(input);

// ---------- 1. no weigh-ins / no food ----------
{
    const r = run({ endDate: '2026-11-06', days: [], weighIns: [] });
    t('1 no weigh-ins → not ok', r.ok === false && r.trackedDays === 0);
    const { input } = simulate({ days: 60 });
    const w = run({ ...input, days: [] });
    t('1b weigh-ins only → correction stays at prior 0', w.ok && near(w.current.correction, 0, 1e-9), w.current.correction);
    t('1b → uncertainty stays near the prior (collecting)', w.current.correctionSd > 200 && w.current.confidence === 'collecting', w.current.correctionSd);
}

// ---------- 2. recovers the true correction ----------
for (const [offset, seed] of [[-250, 7], [-250, 11], [0, 3], [200, 5], [-400, 9]]) {
    const { input } = simulate({ offset, seed, days: 150 });
    const r = run(input);
    const c = r.current.correction, sd = r.current.correctionSd;
    t(`2 offset ${offset} (seed ${seed}) recovered within 2.5 SD`, near(c, offset, 2.5 * sd), { c: Math.round(c), sd: Math.round(sd) });
    t(`2 offset ${offset} → SD under 100 after 150 days`, sd < 100, Math.round(sd));
}
{
    // Calibration of the uncertainty: across many people the error/SD is ~N(0,1)
    let inside = 0, total = 0;
    for (let seed = 100; seed < 140; seed++) {
        const offset = -400 + (seed % 9) * 100;
        const r = run(simulate({ offset, seed, days: 120 }).input);
        total++;
        if (Math.abs(r.current.correction - offset) <= C.CI_Z * r.current.correctionSd) inside++;
    }
    t('2b 90% interval covers the truth ≥ 80% of the time (40 people)', inside / total >= 0.8, `${inside}/${total}`);
}

// ---------- 3. untracked gaps teach nothing ----------
{
    // 30 unlogged days of eating 800 kcal over: weight rises, but the
    // correction must not read that as a TDEE error
    const gap = [['2026-08-01', '2026-08-30']];
    const { input } = simulate({ offset: -250, days: 150, untracked: gap, untrackedSurplus: 800, seed: 21 });
    const r = run(input);
    t('3 surplus during a logging gap does not bias the correction', near(r.current.correction, -250, 2.5 * r.current.correctionSd), Math.round(r.current.correction));
    t('3 gap days are not tracked', r.trackedDays === 150 - 30, r.trackedDays);
    const gapRows = r.series.filter(s => s.date >= '2026-08-01' && s.date <= '2026-08-30');
    t('3 gap rows flagged untracked', gapRows.length === 30 && gapRows.every(s => !s.tracked));
}

// ---------- 4. order, batch and backdated imports ----------
{
    const { input } = simulate({ days: 90, seed: 31 });
    const a = run(input);
    const shuffled = { ...input, weighIns: [...input.weighIns].reverse(), days: [...input.days].reverse() };
    const b = run(shuffled);
    t('4 result independent of import order', a.current.correction === b.current.correction && a.current.trend === b.current.trend);
    const weekly = run({ ...input, weighIns: input.weighIns.filter((_, i) => i % 7 === 0) });
    t('4 weekly-only weigh-ins still produce an estimate', weekly.ok && Number.isFinite(weekly.current.correction));
    t('4 backfilling daily weigh-ins tightens it immediately', a.current.correctionSd < weekly.current.correctionSd, [a.current.correctionSd, weekly.current.correctionSd]);
    // No commit schedule: the estimate is a pure function of the data
    t('4 same data → same answer (no hidden state)', run(input).current.correction === a.current.correction);
}

// ---------- 5. robust to a bad reading ----------
{
    const { input } = simulate({ days: 90, seed: 41 });
    const ref = run(input);
    const bad = input.weighIns.map((w, i) => i === 60 ? { ...w, weight: w.weight + 7 } : w);
    const r = run({ ...input, weighIns: bad });
    t('5 a +7 lb reading is down-weighted', r.downweighted >= 1 && r.series.find(s => s.date === input.weighIns[60].date).downweighted === true, r.downweighted);
    t('5 it moves the correction by < 40 kcal', Math.abs(r.current.correction - ref.current.correction) < 40, Math.round(r.current.correction - ref.current.correction));
}

// ---------- 6. smoother and per-date lookup ----------
{
    const { input } = simulate({ days: 120, seed: 51 });
    const r = run(input);
    const s = r.series;
    t('6 one row per calendar day', s.length === 121 && s[0].date === r.startDate && s[s.length - 1].date === r.endDate);
    t('6 every row smoothed', s.every(x => Number.isFinite(x.sTrend) && Number.isFinite(x.sCorrection)));
    t('6 smoothed SD ≤ filtered SD', s.every(x => x.sCorrectionSd <= x.correctionSd + 1e-9 && x.sTrendSd <= x.trendSd + 1e-9));
    t('6 last row: smoothed = filtered', s[s.length - 1].sCorrection === s[s.length - 1].correction);
    t('6 lookup before start = first smoothed value', api.calCorrectionForDate(r, '2020-01-01') === s[0].sCorrection);
    t('6 lookup on/after end = current', api.calCorrectionForDate(r, r.endDate) === r.current.correction && api.calCorrectionForDate(r, '2030-01-01') === r.current.correction);
    t('6 lookup inside = smoothed', api.calCorrectionForDate(r, s[40].date) === s[40].sCorrection);
    t('6 lookup on failed run = 0', api.calCorrectionForDate({ ok: false }, '2026-10-01') === 0);
}

// ---------- 7. input hygiene ----------
{
    const { input } = simulate({ days: 60, seed: 61 });
    const ref = run(input);
    // Live day's food never counts
    const live = run({ ...input, days: [...input.days, { date: input.endDate, intake: 400, modelTdee: 2530 }] });
    t('7 live day food ignored', live.current.correction === ref.current.correction && live.trackedDays === ref.trackedDays);
    // Weigh-ins after the live day never count; the live morning does
    const future = run({ ...input, weighIns: [...input.weighIns, { date: '2026-11-08', weight: 150 }] });
    t('7 future weigh-in ignored', future.current.correction === ref.current.correction);
    t('7 live-morning weigh-in counts', ref.series[ref.series.length - 1].weight != null);
    // Implausible partial days (< 800 kcal) are unknown, not a huge deficit
    const partial = input.days.map((d, i) => i % 10 === 0 ? { ...d, intake: 450 } : d);
    const p = run({ ...input, days: partial });
    t('7 <800 kcal days treated as unlogged', p.trackedDays === ref.trackedDays - Math.ceil(input.days.length / 10), [p.trackedDays, ref.trackedDays]);
    // Non-morning / excluded readings never reach the filter
    const evening = input.weighIns.slice(5, 15).map(w => ({ ...w, id: w.id + '_pm', weight: w.weight + 2.4, weighInContext: 'nonstandard' }));
    const e = run({ ...input, weighIns: [...input.weighIns, ...evening] });
    t('7 evening readings excluded and listed', e.current.correction === ref.current.correction && e.excludedWeighIns.filter(x => x.reason === 'nonstandard').length === 10);
    // Duplicate imports collapse to one reading per day
    const dupes = input.weighIns.slice(0, 10).map(w => ({ ...w, id: w.id + '_dup', source: 'import' }));
    t('7 duplicate readings change nothing', run({ ...input, weighIns: [...input.weighIns, ...dupes] }).current.correction === ref.current.correction);
    // Body fat is never read
    t('7 body fat has no effect', run({ ...input, weighIns: input.weighIns.map(w => ({ ...w, bodyFat: 40 })) }).current.correction === ref.current.correction);
    // Same-day readings: lower (morning) value; invalid/excluded kept out
    const sel = api.selectCalibrationWeighIns([{ date: '2026-10-01', weight: 186.0 }, { date: '2026-10-01', weight: 188.4 }]);
    t('7 same-day higher reading not used', sel.days[0].weight === 186.0 && sel.days[0].distinctReadings === 2);
    const ex = api.selectCalibrationWeighIns([{ date: '2026-10-01', weight: 186, weighInContext: 'excluded' }, { date: '2026-10-02', weight: 50 }]);
    t('7 excluded + invalid readings kept out (not deleted)', ex.days.length === 0 && ex.excluded.length === 2);
    // History older than MAX_HISTORY_DAYS is dropped
    const old = run({ ...input, weighIns: [{ date: '2020-01-01', weight: 260 }, ...input.weighIns] });
    t('7 readings beyond the history limit ignored', old.startDate === ref.startDate);
}

// ---------- 8. walk-forward backtest ----------
{
    const { input } = simulate({ offset: -250, days: 180, seed: 71 });
    const r = run(input);
    const bt = api.calBacktestEnergyBalance(r, 28);
    t('8 backtest has many origins', bt.n > 100, bt.n);
    t('8 formula over-predicts loss ≈ 2 lb / 4 wk', near(bt.model.bias, -250 * 28 / C.KCAL_PER_LB, 0.7), r1(bt.model.bias));
    t('8 calibrated bias small', Math.abs(bt.calibrated.bias) < 0.7, r1(bt.calibrated.bias));
    t('8 calibrated MAE beats formula', bt.calibrated.mae < bt.model.mae, [r1(bt.calibrated.mae), r1(bt.model.mae)]);
    const zero = api.calBacktestEnergyBalance(run(simulate({ offset: 0, days: 180, seed: 72 }).input), 28);
    t('8 accurate formula → both near zero', Math.abs(zero.model.bias) < 0.7 && Math.abs(zero.calibrated.bias) < 0.7, [r1(zero.model.bias), r1(zero.calibrated.bias)]);
    t('8 no run → n 0', api.calBacktestEnergyBalance({ ok: false }, 28).n === 0);
    const sparseFood = run({ ...input, days: input.days.filter((_, i) => i % 2 === 0) });
    t('8 origins with < 80% logged days skipped', api.calBacktestEnergyBalance(sparseFood, 28).n === 0);
}

// ---------- 9. trend and prediction paths ----------
{
    const { input, truth } = simulate({ offset: -250, days: 120, seed: 81 });
    const r = run(input);
    const tr = api.calTrendFromRun(r);
    const real = (truth[truth.length - 1].tissue - truth[truth.length - 1 - 28].tissue) / 4;
    t('9 trend rate within its 90% range of the truth', tr.lbPerWeekRange[0] - 0.15 <= real && real <= tr.lbPerWeekRange[1] + 0.15, { est: r1(tr.lbPerWeek), real: r1(real), range: tr.lbPerWeekRange.map(r1) });
    t('9 trend weight close to tissue', near(tr.trendWeight, truth[truth.length - 1].tissue, 1.2), [r1(tr.trendWeight), r1(truth[truth.length - 1].tissue)]);
    t('9 trend needs enough weigh-ins', api.calTrendFromRun(run({ ...input, weighIns: input.weighIns.slice(0, 80) })) === null);
    const from = api.calAddDays(r.endDate, -56);
    const paths = api.calPredictionPaths(r, from);
    t('9 path covers fromDate → end', paths.length === 57 && paths[0].date === from && paths[56].date === r.endDate);
    t('9 paths start on the trend', paths[0].model === paths[0].trend && paths[0].calibrated === paths[0].trend);
    const end = paths[paths.length - 1];
    t('9 formula path predicts more loss than happened', end.model < end.trend - 2, [r1(end.model), r1(end.trend)]);
    t('9 calibrated path tracks the trend', Math.abs(end.calibrated - end.trend) < 1.5, [r1(end.calibrated), r1(end.trend)]);
}

// ---------- 10. confidence, bounds ----------
{
    const T = C.CONFIDENCE_MAX_SD;
    t('10 confidence bands', api.calConfidenceForSd(T.high) === 'high' && api.calConfidenceForSd(T.high + 1) === 'moderate' &&
        api.calConfidenceForSd(T.moderate + 1) === 'provisional' && api.calConfidenceForSd(T.provisional + 1) === 'collecting' &&
        api.calConfidenceForSd(NaN) === 'collecting');
    t('10 every confidence has a label', ['collecting', 'provisional', 'moderate', 'high'].every(k => typeof api.CALIBRATION_CONFIDENCE_LABELS[k] === 'string'));
    const absurd = run(simulate({ offset: -2500, days: 60, intakeMean: 2000, seed: 91 }).input);
    t('10 current correction clamped to ±1000', Math.abs(absurd.current.correction) <= C.MAX_ABS_CORRECTION_KCAL);
    t('10 legacy ledger merge still deterministic', api.calMergeHistories([{ effectiveDate: '2026-10-10', adjustment: -35 }], [{ effectiveDate: '2026-10-10', adjustment: -35 }]).length === 1);
}

// ---------- 11. Eastern time + DST date boundaries ----------
{
    t('11 DST end (Nov 1 2026) day step', api.calAddDays('2026-10-31', 1) === '2026-11-01' && api.calAddDays('2026-11-01', 1) === '2026-11-02');
    t('11 DST start (Mar 8 2026) day step', api.calAddDays('2026-03-07', 1) === '2026-03-08' && api.calAddDays('2026-03-08', 1) === '2026-03-09');
    t('11 day numbers are integral across DST', api.calDayNumber('2026-11-02') - api.calDayNumber('2026-10-31') === 2 && api.calDayNumber('2026-03-09') - api.calDayNumber('2026-03-07') === 2);
    t('11 year boundary', api.calAddDays('2026-12-31', 1) === '2027-01-01');
    const r = run(simulate({ endDate: '2026-11-15', days: 60, seed: 95 }).input);
    t('11 run across DST has one row per day', r.series.length === 61 && r.series.every((x, i) => i === 0 || api.calDayNumber(x.date) - api.calDayNumber(r.series[i - 1].date) === 1));
}

// ---------- 12. raw cross-check trend + goal forecast ----------
{
    const weighIns = Array.from({ length: 42 }, (_, i) => ({ date: api.calAddDays('2026-08-28', i), weight: r1(190 - 0.1 * i) }));
    const trend = api.calObservedWeightTrend(weighIns, '2026-10-08');
    t('12 Theil–Sen slope −0.7 lb/wk', near(trend.lbPerWeek, -0.7, 0.01), trend.lbPerWeek);
    const f = api.calGoalForecast(trend, 180, '2026-10-09');
    t('12 forecast gives a date range', f.status === 'range' && f.earliest <= f.latest, f);
    t('12 forecast reached when trend ≤ goal', api.calGoalForecast(trend, 190, '2026-10-09').status === 'reached');
    t('12 forecast insufficient without trend', api.calGoalForecast(null, 180, '2026-10-09').status === 'insufficient');
    t('12 sparse weigh-ins → no raw trend', api.calObservedWeightTrend(weighIns.slice(-5), '2026-10-08') === null);
    const r = run(simulate({ days: 120, seed: 99 }).input);
    const fk = api.calGoalForecast(api.calTrendFromRun(r), 170, r.endDate);
    t('12 forecast works from the filter trend', ['range', 'beyond-horizon', 'uncertain'].includes(fk.status), fk);
}

// ---------- regression fixture: Sep 13 – Oct 8, 2026 ----------
// Synthetic per-day values matching the user's reported aggregates.
{
    const days = Array.from({ length: 26 }, (_, i) => api.calAddDays('2026-09-13', i));
    const early = [569, 629, 509, 570, 569, 509, 629, 569, 569, 570, 629, 509, 569, 569, 509, 629, 569, 569, 569];
    const late = { '2026-10-02': 700, '2026-10-03': -706, '2026-10-04': 698, '2026-10-05': 697, '2026-10-06': 697, '2026-10-07': 697, '2026-10-08': 697 };
    const deficits = days.map((d, i) => i < 19 ? early[i] : late[d]);
    const intakes = days.map(d => d === '2026-10-03' ? 3245 : 1926);
    for (let i = 0; i < 7; i++) intakes[i] += 1;
    const food = days.map((date, i) => ({ date, intake: intakes[i], modelTdee: intakes[i] + deficits[i] }));
    const total = deficits.reduce((s, d) => s + d, 0);
    t('R cumulative deficit 14,293', total === 14293, total);
    t('R average intake ≈ 1,977', Math.round(intakes.reduce((s, v) => s + v, 0) / 26) === 1977);
    // Oct 9 is the live day; its food must not count
    food.push({ date: '2026-10-09', intake: 640, modelTdee: 2540 });
    const NOISE = [0.3, -0.2, 0.1, -0.4, 0.2, 0.0, -0.1, 0.4, -0.3, 0.1, -0.2, 0.3, 0.0, -0.1];
    const backfill = days.map((date, i) => ({ id: `r_${date}`, date, weight: r1(187.7 - 2.1 * i / 25 + NOISE[i % NOISE.length]) }));
    const r = run({ endDate: '2026-10-09', days: food, weighIns: [...backfill, { date: '2026-10-09', weight: 184.9 }] });
    t('R Oct 9 food not counted', r.trackedDays === 26, r.trackedDays);
    t('R log says 550/day, scale ~300/day → negative correction', r.current.correction < -60 && r.current.correction > -400, Math.round(r.current.correction));
    t('R 26 days is not High confidence', r.current.confidence !== 'high', r.current.confidence);
    console.log(`  regression: correction ${Math.round(r.current.correction)} ± ${Math.round(r.current.correctionSd)} (${r.current.confidence})`);
}

console.log(`\n${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail) {
    console.log(failures.join('\n'));
    process.exit(1);
}
console.log('ALL GREEN');
