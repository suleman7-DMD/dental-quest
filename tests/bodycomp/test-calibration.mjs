// BodyComp TDEE calibration engine harness
// Extracts the [BODYCOMP-CALIBRATION-START]/[BODYCOMP-CALIBRATION-END] region
// from body-comp-tracker.html (the REAL shipped code, not a copy) and checks
// eligibility, trend math, update limits, the effective-dated ledger, and the
// Sep 13 – Oct 8 regression aggregates. Pure functions only — no DOM.
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
    return { TDEE_CALIBRATION, calDayNumber, calAddDays, calIsDate, calTheilSen,
        selectCalibrationWeighIns, calFlagFluctuations, calEvaluateWindow,
        calNormalizeHistory, calAdjustmentForDate, calMergeHistories, calShouldCommit,
        evaluateTdeeCalibration, calBuildHistoryEntry, calObservedWeightTrend, calGoalForecast };`)();
const C = api.TDEE_CALIBRATION;

let pass = 0, fail = 0;
const failures = [];
function t(name, cond, detail) {
    if (cond) pass++;
    else { fail++; failures.push(`✗ ${name}${detail !== undefined ? ' — got: ' + JSON.stringify(detail) : ''}`); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---------- fixture builders ----------
// Deterministic ±0.4 lb "noise" so trends are realistic but reproducible
const NOISE = [0.3, -0.2, 0.1, -0.4, 0.2, 0.0, -0.1, 0.4, -0.3, 0.1, -0.2, 0.3, 0.0, -0.1];
function dates(start, n) { return Array.from({ length: n }, (_, i) => api.calAddDays(start, i)); }

/** endDate = last completed day. slope in lb/day (negative = losing). */
function scenario({ endDate = '2026-10-08', days = 42, deficit = 550, intake = 1977, slope = -550 / 3500,
    startWeight = 190, skipWeighIns = [], skipIntake = [], noise = true, extraWeighIns = [] } = {}) {
    const start = api.calAddDays(endDate, -(days - 1));
    const intakeDays = dates(start, days).filter(d => !skipIntake.includes(d)).map(date => ({
        date, tracked: true, assumed: false, calories: intake, rawDeficit: deficit, rawTdee: intake + deficit
    }));
    const weighIns = dates(start, days).filter(d => !skipWeighIns.includes(d)).map((date, i) => ({
        id: `wi_${date}`, date,
        weight: Math.round((startWeight + slope * (api.calDayNumber(date) - api.calDayNumber(start)) + (noise ? NOISE[i % NOISE.length] : 0)) * 10) / 10,
        bodyFat: 25
    }));
    return { endDate, intakeDays, weighIns: [...weighIns, ...extraWeighIns], history: [] };
}

// ---------- 1. insufficient weigh-ins ----------
{
    const s = scenario({ days: 28 });
    s.weighIns = s.weighIns.filter((_, i) => i % 3 === 0); // ~10 readings
    const ev = api.evaluateTdeeCalibration(s);
    t('1 insufficient weigh-ins → not eligible', ev.eligible === false, ev.window.reasons);
    t('1 → collecting state', ev.confidence === 'collecting');
    t('1 → no adjustment proposed', ev.proposedAdjustment === 0);
    t('1 → reason names weigh-ins', ev.window.reasons.some(r => /weigh-in/.test(r)), ev.window.reasons);
}
{
    const s = scenario({ days: 28 });
    s.intakeDays = s.intakeDays.slice(0, 18);
    const ev = api.evaluateTdeeCalibration(s);
    t('1b 18 intake days → not eligible', !ev.eligible && ev.window.reasons.some(r => /food-log/.test(r)), ev.window.reasons);
}

// ---------- 2/4. trend slower than log → negative correction ----------
{
    // Log says 550/day; scale says ~300/day → gap ≈ −250
    const s = scenario({ slope: -300 / 3500 });
    const ev = api.evaluateTdeeCalibration(s);
    t('2 adequate records → eligible', ev.eligible, ev.window.reasons);
    t('2 → gap negative ≈ −250', ev.window.gap < -150 && ev.window.gap > -350, Math.round(ev.window.gap));
    t('2 → applied negative step', ev.decision === 'applied' && ev.proposedAdjustment < 0, [ev.decision, ev.proposedAdjustment]);
    t('2 → first step ≤ 100', Math.abs(ev.step) <= C.FIRST_STEP_CAP_KCAL, ev.step);
    t('2 → provisional (no history)', ev.confidence === 'provisional', ev.confidence);
}
{
    // TDEE far too high: scale shows almost nothing lost
    const s = scenario({ slope: -50 / 3500 });
    const ev = api.evaluateTdeeCalibration(s);
    t('4 TDEE too high → negative', ev.proposedAdjustment < 0, ev.proposedAdjustment);
    t('4 → first step capped at −100', ev.proposedAdjustment === -100, ev.proposedAdjustment);
    t('4 → target bounded at −300 or above', ev.target >= C.MIN_ADJUSTMENT_KCAL, ev.target);
}

// ---------- 3. accurate TDEE → ~0 ----------
{
    const s = scenario({ slope: -550 / 3500 });
    const ev = api.evaluateTdeeCalibration(s);
    t('3 accurate TDEE → eligible', ev.eligible, ev.window.reasons);
    t('3 → |gap| small', Math.abs(ev.window.gap) < C.NOISE_KCAL, Math.round(ev.window.gap));
    t('3 → held as noise, stays 0', ev.decision === 'held-noise' && ev.proposedAdjustment === 0, [ev.decision, ev.proposedAdjustment]);
}

// ---------- 5. TDEE too low → positive ----------
{
    const s = scenario({ slope: -800 / 3500 });
    const ev = api.evaluateTdeeCalibration(s);
    t('5 TDEE too low → positive', ev.decision === 'applied' && ev.proposedAdjustment > 0, [ev.decision, ev.proposedAdjustment]);
    t('5 → within +150 bound', ev.proposedAdjustment <= C.MAX_ADJUSTMENT_KCAL);
}

// ---------- 6. sudden 3 lb water spike ----------
{
    const base = api.evaluateTdeeCalibration(scenario({ slope: -550 / 3500 }));
    const s = scenario({ slope: -550 / 3500 });
    s.weighIns = s.weighIns.map(w => w.date === '2026-10-06' ? { ...w, weight: w.weight + 3 } : w);
    const ev = api.evaluateTdeeCalibration(s);
    t('6 single 3 lb spike flagged as fluctuation', ev.window.fluctuationDays.includes('2026-10-06'), ev.window.fluctuationDays);
    t('6 → no dramatic change', Math.abs(ev.proposedAdjustment - base.proposedAdjustment) <= 10, [base.proposedAdjustment, ev.proposedAdjustment]);
    // Sustained late water retention (+3 lb for the final 4 days, 28-day window)
    const s2 = scenario({ days: 28, slope: -550 / 3500 });
    s2.weighIns = s2.weighIns.map(w => w.date >= '2026-10-05' ? { ...w, weight: w.weight + 3 } : w);
    const ev2 = api.evaluateTdeeCalibration(s2);
    t('6b sustained late spike → step limited to ≤ 50 or held',
        ev2.decision !== 'applied' || Math.abs(ev2.step) <= C.WATER_LIMITED_STEP_CAP_KCAL || ev2.window.waterReversible === false && Math.abs(ev2.step) <= C.FIRST_STEP_CAP_KCAL,
        [ev2.decision, ev2.step, Math.round(ev2.window.gap), Math.round(ev2.window.disagreement)]);
    t('6b → never beyond first-step cap', Math.abs(ev2.proposedAdjustment) <= C.FIRST_STEP_CAP_KCAL, ev2.proposedAdjustment);
}

// ---------- 7. one missed weigh-in ----------
{
    const full = api.evaluateTdeeCalibration(scenario({ slope: -300 / 3500 }));
    const miss = api.evaluateTdeeCalibration(scenario({ slope: -300 / 3500, skipWeighIns: ['2026-09-20'] }));
    t('7 one missed weigh-in → still eligible', miss.eligible, miss.window.reasons);
    t('7 → same decision/adjustment', miss.proposedAdjustment === full.proposedAdjustment, [full.proposedAdjustment, miss.proposedAdjustment]);
    t('7 → gap within 25 kcal', near(miss.window.gap, full.window.gap, 25), [full.window.gap, miss.window.gap]);
}

// ---------- 8. duplicate RENPHO readings ----------
{
    const s = scenario({ slope: -300 / 3500 });
    const dupes = s.weighIns.slice(0, 10).map(w => ({ ...w, id: w.id + '_dup', source: 'import' }));
    const ev = api.evaluateTdeeCalibration({ ...s, weighIns: [...s.weighIns, ...dupes] });
    const ref = api.evaluateTdeeCalibration(s);
    t('8 duplicates counted', ev.duplicateReadings === 10, ev.duplicateReadings);
    t('8 one observation per day', api.selectCalibrationWeighIns([...s.weighIns, ...dupes]).days.length === s.weighIns.length);
    t('8 result identical to de-duplicated data', ev.proposedAdjustment === ref.proposedAdjustment && ev.window.gap === ref.window.gap);
}

// ---------- 9. evening weight excluded ----------
{
    const s = scenario({ slope: -300 / 3500 });
    const ref = api.evaluateTdeeCalibration(s);
    const evening = s.weighIns.slice(5, 15).map(w => ({ ...w, id: w.id + '_pm', weight: w.weight + 2.4, weighInContext: 'nonstandard' }));
    const ev = api.evaluateTdeeCalibration({ ...s, weighIns: [...s.weighIns, ...evening] });
    t('9 nonstandard (evening) readings excluded', ev.excludedWeighIns.filter(x => x.reason === 'nonstandard').length === 10);
    t('9 result unchanged by evening readings', ev.window.gap === ref.window.gap && ev.proposedAdjustment === ref.proposedAdjustment);
    // Unflagged same-day later reading: the lower (morning) value is used
    const sel = api.selectCalibrationWeighIns([{ date: '2026-10-01', weight: 186.0 }, { date: '2026-10-01', weight: 188.4 }]);
    t('9b same-day higher reading not used', sel.days[0].weight === 186.0 && sel.days[0].distinctReadings === 2);
    const ex = api.selectCalibrationWeighIns([{ date: '2026-10-01', weight: 186, weighInContext: 'excluded' }, { date: '2026-10-02', weight: 50 }]);
    t('9c excluded + invalid readings kept out (not deleted)', ex.days.length === 0 && ex.excluded.length === 2);
}

// ---------- 10. unlogged day not treated as zero ----------
{
    const skip = ['2026-09-20', '2026-09-27', '2026-10-04'];
    const s = scenario({ slope: -300 / 3500, skipIntake: skip });
    // An assumed day with a fake 0 must also be ignored
    s.intakeDays.push({ date: '2026-09-21', tracked: false, assumed: true, calories: NaN, rawDeficit: 0, rawTdee: NaN });
    const ev = api.evaluateTdeeCalibration(s);
    t('10 unlogged days absent, mean deficit undiluted', ev.window.meanRawDeficit === 550, ev.window.meanRawDeficit);
    t('10 intake count excludes unlogged/assumed', ev.window.intakeDays === 42 - skip.length, ev.window.intakeDays);
}

// ---------- 11. current incomplete day excluded ----------
{
    const s = scenario({ slope: -300 / 3500 });
    const ref = api.evaluateTdeeCalibration(s);
    s.intakeDays.push({ date: '2026-10-09', tracked: true, assumed: false, calories: 150, rawDeficit: 2400, rawTdee: 2550 });
    s.weighIns.push({ id: 'wi_today', date: '2026-10-09', weight: 184.9 });
    const ev = api.evaluateTdeeCalibration(s);
    t('11 in-progress day (Oct 9) ignored', ev.window.meanRawDeficit === ref.window.meanRawDeficit && ev.window.gap === ref.window.gap);
    t('11 window ends Oct 8', ev.window.windowEnd === '2026-10-08');
}

// ---------- 12. a valid 3,245 kcal day stays in ----------
{
    const s = scenario({ slope: -300 / 3500 });
    s.intakeDays = s.intakeDays.map(d => d.date === '2026-10-03' ? { ...d, calories: 3245, rawDeficit: -706, rawTdee: 2539 } : d);
    const ev = api.evaluateTdeeCalibration(s);
    t('12 3,245 kcal day counted', ev.window.intakeDays === 42 && !ev.window.lowIntakeDays.includes('2026-10-03'));
    t('12 its −706 included in mean', near(ev.window.meanRawDeficit, (550 * 41 - 706) / 42, 0.01), ev.window.meanRawDeficit);
    // Only implausible (<800 kcal) partial-looking days are set aside, and listed
    const s2 = scenario({ slope: -300 / 3500 });
    s2.intakeDays[3] = { ...s2.intakeDays[3], calories: 420, rawDeficit: 2100 };
    const ev2 = api.evaluateTdeeCalibration(s2);
    t('12b <800 kcal day listed, not silently used', ev2.window.lowIntakeDays.length === 1);
}

// ---------- methods disagreement → held ----------
{
    // Smooth trend but endpoints distorted in opposite directions (water) → methods disagree
    const s = scenario({ days: 28, slope: -300 / 3500, noise: false });
    s.weighIns = s.weighIns.map(w => {
        const k = api.calDayNumber(w.date) - api.calDayNumber('2026-09-11');
        if (k < 7) return { ...w, weight: w.weight - 2.5 };
        if (k >= 21) return { ...w, weight: w.weight + 2.5 };
        return w;
    });
    const ev = api.evaluateTdeeCalibration(s);
    t('disagreement > 150 → held, no change', ev.eligible && ev.decision === 'held-disagreement' && ev.proposedAdjustment === 0 && ev.confidence === 'provisional',
        [ev.eligible, ev.decision, ev.window.disagreement && Math.round(ev.window.disagreement)]);
}

// ---------- 16 / 21. ledger: effective dates, persistence, no compounding ----------
{
    const s = scenario({ slope: -300 / 3500 });
    const ev1 = api.evaluateTdeeCalibration(s);
    const e1 = api.calBuildHistoryEntry(ev1, '2026-10-09T12:00:00.000Z');
    t('21 entry is Firebase-safe (no null/undefined)', Object.values(e1).every(v => v !== null && v !== undefined));
    t('16 effective the day after evaluation', e1.effectiveDate === '2026-10-09');
    const hist1 = api.calMergeHistories([], [e1]);
    t('16 earlier dates untouched (0)', api.calAdjustmentForDate(hist1, '2026-10-08') === 0);
    t('16 new dates get the adjustment', api.calAdjustmentForDate(hist1, '2026-10-09') === e1.adjustment);
    // Re-evaluating with the committed entry: same day → not due; adjustment not re-applied
    t('21 commit cadence: not due again same week', api.calShouldCommit(hist1, '2026-10-12') === false);
    t('21 due after 7 more completed days', api.calShouldCommit(hist1, '2026-10-15') === true);
    t('21 merge is idempotent (no duplicates)', api.calMergeHistories(hist1, hist1).length === 1);
    const cloudCopy = { ...e1, computedAt: '2026-10-09T15:00:00.000Z', adjustment: e1.adjustment - 5 };
    const merged = api.calMergeHistories(hist1, [cloudCopy]);
    t('21 two devices, same week → one entry (earliest wins)', merged.length === 1 && merged[0].adjustment === e1.adjustment);
    // Firebase may hand the array back as an object
    t('21 object-form history normalized', api.calNormalizeHistory({ 0: e1 }).length === 1);
    // Next week: second step limited to 50 and builds on the first (no compounding of the gap)
    const s2 = scenario({ slope: -300 / 3500, endDate: '2026-10-15' });
    s2.history = hist1;
    const ev2 = api.evaluateTdeeCalibration(s2);
    t('21 second evaluation starts from current adjustment', ev2.currentAdjustment === e1.adjustment);
    const same = api.evaluateTdeeCalibration({ ...s, history: hist1 });
    t('21 re-evaluating committed evidence does not vouch for itself', same.priorStable === 0 && same.confidence === 'provisional', [same.priorStable, same.confidence]);
    t('21 later step ≤ 50/week', Math.abs(ev2.step) <= C.WEEKLY_STEP_CAP_KCAL, ev2.step);
    const e2 = api.calBuildHistoryEntry(ev2, '2026-10-16T12:00:00.000Z');
    const hist2 = api.calMergeHistories(hist1, [e2]);
    t('16 dates before 2nd update keep 1st adjustment', api.calAdjustmentForDate(hist2, '2026-10-12') === e1.adjustment);
    t('16 dates before 1st update still 0', api.calAdjustmentForDate(hist2, '2026-09-30') === 0);
    // Many weeks of the same evidence converge toward (never past) the target
    let hist = [];
    let adj = 0;
    for (let week = 0; week < 12; week++) {
        const end = api.calAddDays('2026-10-08', week * 7);
        const sc = scenario({ slope: -300 / 3500, endDate: end });
        sc.history = hist;
        const ev = api.evaluateTdeeCalibration(sc);
        hist = api.calMergeHistories(hist, [api.calBuildHistoryEntry(ev, `${end}T12:00:00Z`)]);
        adj = ev.proposedAdjustment;
    }
    const target = api.evaluateTdeeCalibration({ ...scenario({ slope: -300 / 3500, endDate: '2027-01-07' }), history: hist }).target;
    t('21 converges toward target without overshoot', adj <= 0 && adj >= target - 5, [adj, target]);
    const conf = api.evaluateTdeeCalibration({ ...scenario({ slope: -300 / 3500, endDate: '2027-01-07' }), history: hist }).confidence;
    t('21 repeated agreeing evidence raises confidence', conf === 'moderate' || conf === 'high', conf);
}

// ---------- bounds ----------
{
    const hist = [{ effectiveDate: '2026-09-01', adjustment: -900 }, { effectiveDate: '2026-09-15', adjustment: 400 }];
    t('bounds: stored values clamped to [−300, +150]', api.calAdjustmentForDate(hist, '2026-09-10') === -300 && api.calAdjustmentForDate(hist, '2026-09-20') === 150);
}

// ---------- 20. Eastern time + DST date boundaries ----------
{
    t('20 DST end (Nov 1 2026) day step', api.calAddDays('2026-10-31', 1) === '2026-11-01' && api.calAddDays('2026-11-01', 1) === '2026-11-02');
    t('20 DST start (Mar 8 2026) day step', api.calAddDays('2026-03-07', 1) === '2026-03-08' && api.calAddDays('2026-03-08', 1) === '2026-03-09');
    t('20 day numbers are integral across DST', api.calDayNumber('2026-11-02') - api.calDayNumber('2026-10-31') === 2 && api.calDayNumber('2026-03-09') - api.calDayNumber('2026-03-07') === 2);
    t('20 year boundary', api.calAddDays('2026-12-31', 1) === '2027-01-01');
    const s = scenario({ slope: -300 / 3500, endDate: '2026-11-15' });
    const ev = api.evaluateTdeeCalibration(s);
    t('20 window spanning DST stays 42 days', ev.window.windowStart === '2026-10-05' && ev.window.windowDays === 42, [ev.window.windowStart, ev.window.windowDays]);
    t('20 endpoint elapsed days are whole numbers', Number.isInteger(ev.window.endpointElapsedDays * 5), ev.window.endpointElapsedDays);
}

// ---------- body fat never read ----------
{
    const s = scenario({ slope: -300 / 3500 });
    const a = api.evaluateTdeeCalibration(s);
    const b = api.evaluateTdeeCalibration({ ...s, weighIns: s.weighIns.map(w => ({ ...w, bodyFat: 40 })) });
    t('RENPHO body fat has no effect', a.window.gap === b.window.gap && a.proposedAdjustment === b.proposedAdjustment);
}

// ---------- observed trend + goal forecast ----------
{
    const s = scenario({ slope: -0.1, startWeight: 190, noise: false });
    const trend = api.calObservedWeightTrend(s.weighIns, '2026-10-08');
    t('trend slope −0.7 lb/wk', near(trend.lbPerWeek, -0.7, 0.01), trend.lbPerWeek);
    const f = api.calGoalForecast(trend, 180, '2026-10-09');
    t('forecast gives a date range', f.status === 'range' && f.earliest <= f.latest, f);
    t('forecast reached when trend ≤ goal', api.calGoalForecast(trend, 190, '2026-10-09').status === 'reached');
    t('forecast insufficient without trend', api.calGoalForecast(null, 180, '2026-10-09').status === 'insufficient');
    const flat = api.calObservedWeightTrend(scenario({ slope: 0, noise: true }).weighIns, '2026-10-08');
    t('flat/uncertain trend → no date', ['uncertain', 'beyond-horizon'].includes(api.calGoalForecast(flat, 180, '2026-10-09').status));
    t('sparse weigh-ins → no trend', api.calObservedWeightTrend(s.weighIns.slice(-5), '2026-10-08') === null);
}

// ---------- regression fixture: Sep 13 – Oct 8, 2026 ----------
// Synthetic per-day values constructed to match the user's reported
// aggregates (the raw export was not available in the repository).
{
    const days = dates('2026-09-13', 26);
    const early = [569, 629, 509, 570, 569, 509, 629, 569, 569, 570, 629, 509, 569, 569, 509, 629, 569, 569, 569]; // Sep 13 – Oct 1 (sum 10,813)
    const late = { '2026-10-02': 700, '2026-10-03': -706, '2026-10-04': 698, '2026-10-05': 697, '2026-10-06': 697, '2026-10-07': 697, '2026-10-08': 697 };
    const deficits = days.map((d, i) => i < 19 ? early[i] : late[d]);
    const intakes = days.map(d => d === '2026-10-03' ? 3245 : 1926);
    for (let i = 0; i < 7; i++) intakes[i] += 1; // 25 × 1926 + 7 + 3,245 = 51,402 (1,977 × 26)
    const intakeDays = days.map((date, i) => ({ date, tracked: true, assumed: false, calories: intakes[i], rawDeficit: deficits[i], rawTdee: intakes[i] + deficits[i] }));
    // Oct 9 is the live day — present in data but must be excluded
    intakeDays.push({ date: '2026-10-09', tracked: true, assumed: false, calories: 640, rawDeficit: 1900, rawTdee: 2540 });

    const completed = intakeDays.filter(d => d.date <= '2026-10-08');
    const total = completed.reduce((s, d) => s + d.rawDeficit, 0);
    const meanIntake = completed.reduce((s, d) => s + d.calories, 0) / completed.length;
    const meanTdee = completed.reduce((s, d) => s + d.rawTdee, 0) / completed.length;
    const week = completed.filter(d => d.date >= '2026-10-02').reduce((s, d) => s + d.rawDeficit, 0);
    t('R cumulative deficit 14,293', total === 14293, total);
    t('R average intake ≈ 1,977', Math.round(meanIntake) === 1977, meanIntake);
    t('R average deficit ≈ 550', Math.round(total / completed.length) === 550, total / completed.length);
    t('R average app TDEE ≈ 2,527', Math.round(meanTdee) === 2527, meanTdee);
    t('R Oct 3 surplus 706 preserved', completed.find(d => d.date === '2026-10-03').rawDeficit === -706);
    t('R Oct 2–8 weekly deficit 3,480', week === 3480, week);

    // Sparse weigh-ins (roughly what BodyComp holds before a RENPHO backfill)
    const sparse = [['2026-09-13', 187.7], ['2026-09-20', 187.0], ['2026-09-28', 186.4], ['2026-10-05', 185.9], ['2026-10-08', 185.6], ['2026-10-09', 184.9]]
        .map(([date, weight]) => ({ id: date, date, weight }));
    const evSparse = api.evaluateTdeeCalibration({ endDate: '2026-10-08', intakeDays, weighIns: sparse, history: [] });
    t('R sparse weigh-ins → Calibration: collecting data', !evSparse.eligible && evSparse.confidence === 'collecting');
    t('R Oct 9 not counted', evSparse.window.intakeDays === 26, evSparse.window.intakeDays);

    // After a daily RENPHO backfill (~187.7 → ~185.6 trend; synthetic readings)
    const backfill = days.map((date, i) => ({ id: `r_${date}`, date, weight: Math.round((187.7 - 2.1 * i / 25 + NOISE[i % NOISE.length]) * 10) / 10 }));
    const ev = api.evaluateTdeeCalibration({ endDate: '2026-10-08', intakeDays, weighIns: [...backfill, sparse[5]], history: [] });
    t('R backfilled → eligible', ev.eligible, ev.window.reasons);
    t('R 26 days never reaches High', ev.confidence !== 'high', ev.confidence);
    t('R first correction negative and ≤ 100', ev.proposedAdjustment < 0 && ev.proposedAdjustment >= -100, ev.proposedAdjustment);
    console.log(`  regression: observed ${Math.round(ev.window.observedDeficit)} kcal/day vs logged ${Math.round(ev.window.meanRawDeficit)}; gap ${Math.round(ev.window.gap)}; water ±${Math.round(ev.window.waterSensitivity)}; first step ${ev.proposedAdjustment} (${ev.confidence}, ${ev.decision})`);
}

console.log(`\n${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail) {
    console.log(failures.join('\n'));
    process.exit(1);
}
console.log('ALL GREEN');
