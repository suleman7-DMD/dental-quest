// BodyComp adaptive TDEE / budget / Progress integration harness (Playwright)
// Loads the real body-comp-tracker.html with the clock fixed at
// 2026-10-09 10:00 ET, seeds the Sep 13 – Oct 8 regression fixture, and checks
// the app-level behavior: the learned correction in targets, deficits and
// exports, backdated imports, disable flag, the intake budget, workout +
// WEIGHIN imports, completed-day rules, the three Progress TDEE cards and
// phone/desktop layout. Chromium + WebKit at iPhone and desktop viewports.
// Run: PLAYWRIGHT_PATH=/path/to/node_modules/playwright node tests/bodycomp/test-calibration-ui.mjs

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = resolve(import.meta.dirname, '..', '..');
const shotDir = process.env.SCREENSHOT_DIR || tmpdir();
const server = createServer(async (request, response) => {
    try {
        const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
        if (!path.startsWith(root + '/')) throw new Error('Invalid path');
        response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(path)] || 'text/plain');
        response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;

async function load(context) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.clock.setFixedTime(new Date('2026-10-09T14:00:00Z')); // 10:00 ET
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.fulfill({ body: '' }));
    await page.addInitScript(() => {
        const add = document.addEventListener.bind(document);
        document.addEventListener = (type, listener, options) => {
            if (type !== 'DOMContentLoaded') add(type, listener, options);
        };
    });
    await page.goto(`${base}/body-comp-tracker.html`);
    await page.evaluate(() => {
        // Sep 13 – Oct 8 regression fixture: 14,293 total raw deficit,
        // ~1,977 intake, Oct 3 = 3,245 kcal (−706), Oct 2–8 = 3,480.
        window.__seed = () => {
            state = getDefaultState();
            state.today.date = getLocalDateString();
            state.today.setupComplete = true;
            state._dataLoaded = true;
            state.calcSchemaVersion = CALC_SCHEMA_VERSION;
            pinValidated = true;
            isInitialLoad = false;
            hasLoadedFromCloud = true;
            const early = [569, 629, 509, 570, 569, 509, 629, 569, 569, 570, 629, 509, 569, 569, 509, 629, 569, 569, 569];
            const late = [700, -706, 698, 697, 697, 697, 697];
            const noise = [0.3, -0.2, 0.1, -0.4, 0.2, 0.0, -0.1, 0.4, -0.3, 0.1, -0.2, 0.3, 0.0, -0.1];
            for (let i = 0; i < 26; i++) {
                const date = calAddDays('2026-09-13', i);
                const deficit = i < 19 ? early[i] : late[i - 19];
                const calories = date === '2026-10-03' ? 3245 : 1926 + (i < 7 ? 1 : 0);
                state.dailyLogs[date] = {
                    date, calories, protein: 160, carbs: 150, deficit, tdee: calories + deficit,
                    nutritionStatus: 'tracked', target: 1900, targetProtein: 165, status: deficit > 0 ? 'good' : 'over',
                    meals: { m1: { name: 'Logged food', calories, protein: 160 } },
                    // Workouts on Mon/Wed/Fri only; other days have no import (not zero exercise)
                    ...(i % 7 === 2 || i % 7 === 4 || i % 7 === 6 ? { workouts: { w1: { type: i % 7 === 4 ? 'Run' : 'Lift', duration: 50, calories: 300 } }, workedOut: true } : {})
                };
                state.weighIns[`wi_${date}`] = { id: `wi_${date}`, date, weight: Math.round((187.7 - 2.1 * i / 25 + noise[i % noise.length]) * 10) / 10, bodyFat: 24, source: 'import' };
            }
            state.weighIns.wi_today = { id: 'wi_today', date: '2026-10-09', weight: 184.9, source: 'import' };
            Object.assign(state.profile, { goalWeight_lbs: 180, targetDate: '2026-11-15', goalSetAt: '2026-09-01T12:00:00.000Z' });
            refreshTodayTargets(); // real app path for the live day's mode targets
        };
        showCelebration = () => {}; // achievement popups would cover screenshots
        window.__setTodayIntake = calories => {
            state.today.meals = calories ? { live: { id: 'live', name: 'Breakfast', calories, protein: 40, time: '08:00' } } : {};
        };
    });
    return { page, errors };
}

async function fits(page, selector) {
    const result = await page.locator(selector).first().evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: innerWidth, overflow: element.scrollWidth - element.clientWidth, docOverflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert(result.left >= -1 && result.right <= result.width + 1, `${selector} off-screen: ${JSON.stringify(result)}`);
    assert(result.overflow <= 1, `${selector} overflows horizontally: ${JSON.stringify(result)}`);
    assert(result.docOverflow <= 1, `page scrolls horizontally: ${JSON.stringify(result)}`);
}

const getDeficitTierKey = d => { const v = Math.round(d); return v < 0 ? 'surplus' : v < 250 ? 'maint' : v < 500 ? 'small' : v < 700 ? 'great' : v < 900 ? 'perfect' : v < 1000 ? 'fire' : 'hot'; };

let checks = 0;
const ok = (cond, message) => { assert(cond, message); checks++; };

async function logicSuite(page) {
    // ---------- Regression aggregates (original formula: calibration off) ----------
    const agg = await page.evaluate(() => {
        __seed();
        state.settings.tdeeCalibrationEnabled = false;
        __setTodayIntake(150); // Oct 9 in progress: 150 kcal by mid-morning
        saveDayLog();
        let total = 0, intake = 0, n = 0;
        for (let d = '2026-09-13'; d <= '2026-10-08'; d = calAddDays(d, 1)) {
            total += getVerifiedDeficitForDate(d); intake += state.dailyLogs[d].calories; n++;
        }
        const exp = generateProgressExport('2026-09-13', '2026-10-09');
        let week = 0;
        for (let d = '2026-10-02'; d <= '2026-10-08'; d = calAddDays(d, 1)) week += getDisplayDeficitForDate(d);
        return {
            total, avgIntake: intake / n, n, week,
            oct3: getDisplayDeficitForDate('2026-10-03'),
            todayCompleted: isCompletedDay('2026-10-09'), oct8Completed: isCompletedDay('2026-10-08'),
            oct9Verified: getVerifiedDeficitForDate('2026-10-09'),
            exportDeficit: exp.summary.deficit, exportInProgress: exp.summary.inProgressDays, exportDays: exp.summary.days,
            exportHasInProgress: exp.text.includes('not included in totals'),
            oct9Row: exp.rows.find(r => r.date === '2026-10-09'),
            noWorkoutRow: exp.rows.find(r => r.date === '2026-09-13'),
            streak: calculateDeficitStreak(),
            restore: (state.settings.tdeeCalibrationEnabled = true)
        };
    });
    ok(agg.total === 14293, `cumulative 14,293 (got ${agg.total})`);
    ok(Math.round(agg.avgIntake) === 1977, `avg intake 1,977 (got ${agg.avgIntake})`);
    ok(Math.round(agg.total / agg.n) === 550, 'avg deficit ≈ 550');
    ok(agg.week === 3480, `Oct 2–8 = 3,480 (got ${agg.week})`);
    ok(agg.oct3 === -706, 'Oct 3 surplus 706 preserved');
    ok(!agg.todayCompleted && agg.oct8Completed, 'Oct 9 in progress, Oct 8 completed');
    ok(agg.oct9Verified === null, 'Oct 9 never a verified result');
    ok(agg.exportDeficit === 14293 && agg.exportInProgress === 1 && agg.exportDays === 27 && agg.exportHasInProgress, 'progress export totals exclude Oct 9 but list it');
    ok(agg.oct9Row && agg.oct9Row.partial === true, 'Oct 9 row labeled in progress');
    ok(agg.noWorkoutRow.exercise === null && agg.noWorkoutRow.deficit === 569, 'day without workout import: complete, exercise unknown (not 0)');
    ok(agg.streak === 5, `deficit streak = Oct 4–8: completed days only, Oct 3 surplus breaks it, Oct 9 not counted (got ${agg.streak})`);

    // ---------- Records / Progress text (completed days only, no refeed/summer/fat-lean) ----------
    const progress = await page.evaluate(() => {
        showDetailsView();
        switchDashboardTab('progress');
        renderProgressTab();
        return {
            text: document.getElementById('progressTab').textContent,
            records: document.getElementById('personalRecords').textContent
        };
    });
    ok(!/Refeed Day Recommended|REFEED RECOMMENDED/i.test(progress.text), 'no refeed recommendation');
    ok(!/170 lb|by June|Summer/i.test(progress.text), 'no 170-by-June / Summer goal text');
    ok(!/fat lost\/week|lean lost\/week|Fat vs Lean Loss Ratio/i.test(progress.text), 'no fat/lean predictions');
    ok(!/Deload Recommended/i.test(progress.text), 'no deload directive');
    ok(/TDEE Calibration/.test(progress.text) && /Weight Trend & Training/.test(progress.text), 'new/renamed cards present');
    const runLabel = await page.evaluate(() => {
        const saved = JSON.stringify(state.dailyLogs);
        Object.values(state.dailyLogs).forEach(log => { if (log.workouts?.w1) log.workouts.w1.type = 'Run'; });
        renderWorkoutStats();
        const text = document.getElementById('workoutStats').textContent;
        state.dailyLogs = JSON.parse(saved);
        return text;
    });
    ok(/Run \/ stairs/.test(runLabel) && /stairs & incline walks are logged as Run/.test(runLabel), '"Run" shown as Run / stairs');
    ok(!/Biggest Deficit\s+Oct 9/.test(progress.records) && !/Best Protein Day\s+Oct 9/.test(progress.records) && /Biggest Deficit/.test(progress.records), 'deficit/protein records exclude the in-progress day');

    // ---------- Adaptive TDEE: learned from the data, no commit schedule ----------
    const cal = await page.evaluate(() => {
        __seed();
        __setTodayIntake(150);
        const logsBefore = JSON.stringify(state.dailyLogs);
        const status = getTdeeCalibrationStatus();
        const est = getLiveTdeeEstimate();
        const targetsCal = JSON.stringify(state.today.targets);
        const expected = JSON.stringify({ ...calculateTargets(est.raw + est.adjustment, state.today.isBrainDay, state.today.date), planTdee: est.raw + est.adjustment });
        state.settings.tdeeCalibrationEnabled = false;
        refreshTodayTargets();
        const targetsRaw = JSON.stringify(state.today.targets);
        state.settings.tdeeCalibrationEnabled = true;
        refreshTodayTargets();
        renderSimpleView();
        document.getElementById('tdeeDetails').open = true;
        renderTdeeDetailsBody();
        // A backdated weigh-in counts the moment it's imported
        const before = getActiveCalibrationAdjustment(state.today.date);
        state.weighIns.wi_backdated = { id: 'wi_backdated', date: '2026-10-07', weight: 183.4, source: 'import' };
        const after = getActiveCalibrationAdjustment(state.today.date);
        delete state.weighIns.wi_backdated;
        const restored = getActiveCalibrationAdjustment(state.today.date);
        saveStateImmediate();
        loadState();
        return {
            ok: status.run.ok, trackedDays: status.trackedDays, weighInDays: status.weighInDays,
            correction: status.current.correction, sd: status.current.correctionSd, confidence: status.confidence,
            est, targetsCal, targetsRaw, expected, before, after, restored,
            afterReload: getActiveCalibrationAdjustment(state.today.date),
            noLedger: !state.settings.tdeeCalibrationLog,
            logsUnchanged: JSON.stringify(state.dailyLogs) === logsBefore,
            oct8: getDisplayDeficitForDate('2026-10-08'), oct8Adj: getActiveCalibrationAdjustment('2026-10-08'),
            label: document.getElementById('simpleTDEELabel')?.textContent,
            tdeeShown: document.getElementById('simpleTDEE')?.textContent,
            details: document.getElementById('tdeeDetailsBody').innerText,
            summary: document.getElementById('tdeeDetailsSummary').textContent,
            homeChart: !!document.querySelector('#tdeeDetailsBody svg.tcal-chart[role="img"]'),
            ...(() => {
                setHomeTrendRange(56);
                const r = {
                    range8: document.querySelector('#tdeeDetailsBody .tcal-range button[aria-pressed="true"]')?.textContent,
                    range8Chart: !!document.querySelector('#tdeeDetailsBody svg.tcal-chart'),
                    rangeStored: localStorage.getItem('bodyCompHomeTrendRange')
                };
                setHomeTrendRange(28);
                return r;
            })(),
            claude: generateClaudeExport(), weekly: generateWeeklyClaudeExport(), daily: generateExportText(),
            rawDeficitLive: getCurrentRawDeficit(), calibratedLive: getCurrentDeficit(),
            progressRow: generateProgressExport('2026-10-09', '2026-10-09').rows[0].deficit,
            progressExp: generateProgressExport('2026-10-02', '2026-10-09')
        };
    });
    ok(cal.ok && cal.trackedDays === 26 && cal.weighInDays === 27, `filter sees 26 logged days + 27 weigh-ins (got ${cal.trackedDays}/${cal.weighInDays})`);
    ok(cal.correction < -60 && cal.correction > -400, `log says ~550/day, scale ~300/day → negative correction (got ${Math.round(cal.correction)})`);
    ok(cal.confidence !== 'high' && cal.sd > 60, `26 days is not High confidence (got ${cal.confidence}, ±${Math.round(cal.sd)})`);
    ok(cal.est.adjustment === Math.round(cal.correction) && cal.est.calibrated === cal.est.raw + cal.est.adjustment, 'calibrated TDEE = formula + learned correction');
    ok(cal.targetsCal === cal.expected && cal.targetsCal !== cal.targetsRaw, 'daily targets plan against the calibrated TDEE');
    const tgt = JSON.parse(cal.targetsCal);
    ok(tgt.calories === 1900 + Math.round(cal.correction) && tgt.deficit === cal.est.calibrated - tgt.calories && tgt.floor === 1500 && JSON.parse(cal.targetsRaw).calories === 1900,
        `no modes: calorie target = calibrated budget (${tgt.calories}), planned deficit vs calibrated TDEE (${tgt.deficit}); calibration off → 1,900`);
    ok(cal.after !== cal.before && cal.restored === cal.before, `backdated weigh-in moves the correction immediately (${cal.before} → ${cal.after})`);
    ok(cal.afterReload === cal.before && cal.noLedger, 'estimate is a pure function of the data: same after reload, no ledger written');
    ok(cal.logsUnchanged, 'stored day logs keep raw formula values');
    ok(cal.oct8 === 697 + cal.oct8Adj && cal.oct8Adj < 0, 'past days show the calibrated deficit (raw + that day\'s correction)');
    ok(cal.label === 'TDEE est.' && cal.tdeeShown.replace(/,/g, '').includes(String(cal.est.calibrated)), 'homepage shows labeled calibrated estimate');
    ok(/your tdee/i.test(cal.details) && /formula [\d,]+/.test(cal.details) && /correction/i.test(cal.details) && /don't subtract extra/.test(cal.details), 'home dropdown: TDEE, formula, correction, no-extra-subtractor note');
    ok(/Re-learned every day from 26 food-logged days and 27 morning weigh-ins/.test(cal.details), 'home dropdown names the data used');
    ok(/Scale vs\. food log/.test(cal.details) && /Scale trend\s*[−+]?\d+\.\d lb/.test(cal.details) && /Formula\s*[−+]?\d+\.\d lb/.test(cal.details) && cal.homeChart, 'home dropdown: trend vs. model chart + legend values');
    ok(/This morning/.test(cal.details) && /expected 18\d\.\d ± \d\.\d/.test(cal.details) && /Tomorrow's expected weigh-in/.test(cal.details), 'home dropdown: this morning vs. expected + tomorrow\'s expectation');
    ok(/Verified on your data: \d-week forecasts/.test(cal.details), 'home dropdown: out-of-sample accuracy line');
    ok(/^Trend vs\. model · [−+]\d\.\d\d lb\/wk · calibration −\d+\/day$/.test(cal.summary), `home dropdown summary (got ${cal.summary})`);
    ok(cal.range8 === '8W' && cal.range8Chart && cal.rangeStored === '56', 'home chart range toggle (4W/8W/12W) re-renders and is remembered');
    ok(cal.calibratedLive === cal.rawDeficitLive + cal.est.adjustment, 'live calibrated deficit');
    ok(new RegExp(`DEFICIT:${cal.rawDeficitLive}\\n`).test(cal.claude), 'Claude export DEFICIT stays raw');
    ok(/CALIBRATION_ADJ:-\d+\|CALIBRATED_TDEE:\d+\|CALIBRATED_DEFICIT:-?\d+\|CALIBRATION_SD:\d+\|CALIBRATION_CONFIDENCE:\w+\|NOTE:kalman_filter_estimate/.test(cal.claude), 'Claude export adds labeled calibration line with SD');
    ok(!/NEEDS_REFEED/.test(cal.claude) && !/NEEDS_REFEED/.test(cal.weekly), 'NEEDS_REFEED flag removed');
    const weekCal = cal.weekly.match(/CALIBRATION\|Adj:-\d+\|SD:\d+\|Confidence:\w+\|CalibratedWeeklyDeficit:(\d+)\|Note:estimate/);
    ok(/TOTALS\|WeeklyDeficit:3480\|/.test(cal.weekly) && weekCal && Number(weekCal[1]) < 3480, 'weekly export: raw 3,480 + labeled calibrated weekly deficit');
    ok(/CALIBRATED TDEE \(estimate\)/.test(cal.daily) && /learned correction −\d+ ±\d+/.test(cal.daily) && /today excluded/.test(cal.daily), 'daily export labeled + completed days');
    ok(cal.progressRow === cal.rawDeficitLive, 'progress export rows stay raw');
    const pText = cal.progressExp.text;
    ok(/TDEE CALIBRATION \(estimate; Kalman filter/.test(pText) && /Learned correction now: −\d+ ± \d+ kcal\/day/.test(pText), 'progress export calibration section');
    ok(/Walk-forward backtest/.test(pText) && /7 days \(n=\d+\): formula bias/.test(pText), 'progress export includes the backtest');
    ok(/2026-10-05 \| .*Weigh-in: \d+\.\d lb \(trend \d+\.\d\) \| TDEE formula [\d,]+ \/ calibrated [\d,]+/.test(pText), 'progress export rows carry weigh-in, trend and both TDEEs');
    ok(cal.progressExp.rows.find(r => r.date === '2026-10-05').weight !== null, 'progress export row weight field');

    // ---------- Disable flag restores original behavior ----------
    const off = await page.evaluate(() => {
        state.settings.tdeeCalibrationEnabled = false;
        const est = getLiveTdeeEstimate();
        refreshTodayTargets();
        renderSimpleView();
        renderProgressTab();
        const result = {
            same: est.calibrated === est.raw && est.adjustment === 0,
            deficit: getDisplayDeficitForDate('2026-10-09') === getCurrentRawDeficit(),
            oct8: getDisplayDeficitForDate('2026-10-08'),
            label: document.getElementById('simpleTDEELabel')?.textContent,
            summaryOff: document.getElementById('tdeeDetailsSummary').textContent,
            claudeNoCal: !/CALIBRATION_ADJ/.test(generateClaudeExport()),
            progressNoCal: !/TDEE CALIBRATION/.test(generateProgressExport('2026-10-02', '2026-10-08').text),
            card: document.getElementById('tdeeCalibration').textContent
        };
        state.settings.tdeeCalibrationEnabled = true;
        refreshTodayTargets();
        result.backOn = getLiveTdeeEstimate().adjustment !== 0;
        return result;
    });
    ok(off.same && off.deficit && off.oct8 === 697 && off.label === 'TDEE', 'disabled → original TDEE and deficits');
    ok(off.claudeNoCal && off.progressNoCal, 'disabled → no export extras');
    ok(/calibration off$/.test(off.summaryOff), `disabled → home summary says calibration off (got ${off.summaryOff})`);
    ok(/not applied — off/.test(off.card), 'disabled → card says the calibration is not applied');
    ok(off.backOn, 're-enabling restores the learned correction');

    // ---------- Deficit tiers: home average badges + calendar (calibrated) ----------
    const tiers = await page.evaluate(() => {
        __seed();
        __setTodayIntake(1800);
        saveDayLog();
        renderSimpleView();
        const bounds = [[-1, 'surplus'], [0, 'maint'], [249, 'maint'], [250, 'small'], [499, 'small'], [500, 'great'], [699, 'great'],
            [700, 'perfect'], [899, 'perfect'], [900, 'fire'], [999, 'fire'], [1000, 'hot'], [2400, 'hot']].every(([v, k]) => getDeficitTier(v).key === k);
        // Independent averages: raw stored deficit + that day's learned correction
        const indep = n => {
            let t = 0, k = 0;
            for (let i = 1; i <= n; i++) {
                const d = calAddDays('2026-10-09', -i);
                const log = state.dailyLogs[d];
                if (log && hasNutritionData(log)) { t += log.deficit + getActiveCalibrationAdjustment(d); k++; }
            }
            return k ? { avg: t / k, k } : { avg: null, k };
        };
        const tiles = [...document.querySelectorAll('#deficitAverages .davg')].map(el => ({
            cls: el.className, val: el.querySelector('.davg-val').textContent, cov: el.querySelector('.davg-cov').textContent, title: el.getAttribute('title')
        }));
        const expected = [3, 7, 14, 30, 60].map(n => { const e = indep(n); return { n, ...e, tier: getDeficitTier(e.avg)?.key, val: e.avg == null ? '—' : formatCompactDeficit(e.avg) }; });
        // Calendar: September + October 2026
        showDetailsView(); switchDashboardTab('calendar');
        const cells = {};
        for (const [y, m] of [[2026, 8], [2026, 9]]) {
            calendarViewDate = new Date(y, m, 1);
            renderCalendarHeatmap();
            document.querySelectorAll('#calendarDays .calendar-day:not(.empty)').forEach(el => {
                const day = Number(el.querySelector('.cal-num')?.textContent);
                const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                cells[date] = { cls: el.className, def: el.querySelector('.cal-def')?.textContent ?? null, gym: !!el.querySelector('.cal-gym') };
            });
        }
        const calOk = [];
        for (let d = '2026-09-13'; d <= '2026-10-08'; d = calAddDays(d, 1)) {
            const def = getDisplayDeficitForDate(d);
            const tier = getDeficitTier(def).key;
            const log = state.dailyLogs[d];
            const gym = !!(log.workedOut || hasWorkoutData(log));
            calOk.push(cells[d].cls.includes(`t-${tier}`) && cells[d].def === formatCompactDeficit(def) && cells[d].gym === gym ? 'ok' : `${d}:${JSON.stringify(cells[d])} want ${tier} ${formatCompactDeficit(def)} gym=${gym}`);
        }
        // On-track judged on the calibrated deficit: raw +100 with a 'good'
        // stored status is a calibrated surplus, so not on track
        const probe = { ...state.dailyLogs['2026-10-08'], deficit: 100, status: 'good', perfect: false, protein: 200 };
        const onTrackRaw100 = isDayOnTrack(probe, '2026-10-08');
        renderConsistencyScore();
        return {
            bounds, tiles, expected, calOk: calOk.filter(x => x !== 'ok'),
            oct3: cells['2026-10-03'], oct9: cells['2026-10-09'], sep12: cells['2026-09-12'],
            legend: document.querySelector('.cal-legend')?.innerText,
            onTrackRaw100, mix: document.getElementById('consistencyScore').innerText
        };
    });
    ok(tiers.bounds, 'tier boundaries: <0 surplus · 0–249 · 250–499 · 500 great · 700 perfect · 900 fire · 1000+ too aggressive');
    ok(tiers.tiles.length === 5 && tiers.tiles.map(t => t.title.match(/^(\d+)-day/)[1]).join() === '3,7,14,30,60', 'home badges: 3/7/14/30/60-day');
    tiers.expected.forEach((e, i) => {
        ok(tiers.tiles[i].val === e.val && tiers.tiles[i].cls.includes(`t-${e.tier ?? 'none'}`) && tiers.tiles[i].cov === `${e.k}/${e.n} days`,
            `${e.n}D badge = independent calibrated average ${e.val} (${e.tier}, ${e.k}/${e.n}) — got ${JSON.stringify(tiers.tiles[i])}`);
    });
    ok(/Oct 2 – Oct 8/.test(tiers.tiles[1].title), `7D window = last 7 completed days, live day excluded (${tiers.tiles[1].title})`);
    ok(tiers.calOk.length === 0, `every calendar day colored by its calibrated tier, labeled with its deficit, gym dot when trained: ${tiers.calOk.join('; ')}`);
    ok(tiers.oct3.cls.includes('t-surplus') && tiers.oct3.def.startsWith('−'), 'Oct 3 surplus is red with a negative number');
    ok(tiers.oct9.cls.includes('today') && !/\bt-/.test(tiers.oct9.cls) && tiers.oct9.def === null, 'live day: ring only, not graded while in progress');
    ok(tiers.sep12.cls.includes('past-empty') && tiers.sep12.def === null, 'untracked past day: dashed, no number');
    ok(/Surplus/.test(tiers.legend) && /Great/.test(tiers.legend) && /Perfect/.test(tiers.legend) && /Fire/.test(tiers.legend) && /gym/.test(tiers.legend) && /calibrated deficit/.test(tiers.legend), 'calendar legend explains the tier scale');
    ok(tiers.onTrackRaw100 === false, 'on-track uses the calibrated deficit (raw +100 / stored "good" is not on track)');
    ok(/Deficit Tiers \(calibrated\)/.test(tiers.mix) && !/Day Status Distribution/.test(tiers.mix), '30-day analytics shows the calibrated tier mix');

    // Next morning: the badges and calendar move forward a day on their own
    await page.clock.setFixedTime(new Date('2026-10-10T14:00:00Z'));
    const nextDay = await page.evaluate(() => {
        checkAndResetDayIfNeeded();
        state.today.setupComplete = true;
        refreshTodayTargets();
        renderSimpleView();
        calendarViewDate = new Date(2026, 9, 1);
        renderCalendarHeatmap();
        const oct9 = [...document.querySelectorAll('#calendarDays .calendar-day')].find(el => el.querySelector('.cal-num')?.textContent === '9');
        return {
            title7: document.querySelector('#deficitAverages .davg:nth-child(2)').getAttribute('title'),
            title3: document.querySelector('#deficitAverages .davg:nth-child(1)').getAttribute('title'),
            oct9Def: getDisplayDeficitForDate('2026-10-09'),
            oct9Cls: oct9.className
        };
    });
    await page.clock.setFixedTime(new Date('2026-10-09T14:00:00Z'));
    ok(/Oct 3 – Oct 9/.test(nextDay.title7) && /Oct 7 – Oct 9/.test(nextDay.title3), `after rollover the windows end on the new yesterday (${nextDay.title7})`);
    ok(nextDay.oct9Def != null && nextDay.oct9Cls.includes(`t-${getDeficitTierKey(nextDay.oct9Def)}`), `Oct 9 becomes a completed, graded day (${nextDay.oct9Cls})`);

    // ---------- Daily intake budget = base (Settings) + learned correction ----------
    const budget = await page.evaluate(() => {
        __seed();
        const states = [1500, 1615, 1700, 1899, 1900, 1915, 2100].map(v => getIntakeBudgetState(v, 1900));
        const read = () => ({ status: document.getElementById('budgetStatus').textContent, current: document.getElementById('budgetCurrent').textContent,
            target: document.getElementById('budgetTarget').textContent, tag: document.getElementById('budgetCalTag'), cls: document.getElementById('intakeBudgetRow').className });
        const adj = getActiveCalibrationAdjustment(state.today.date);
        const goals = getIntakeGoals();
        __setTodayIntake(1600);
        renderSimpleView();
        const a = read();
        const aTag = { hidden: a.tag.hidden, text: a.tag.textContent };
        state.today.workouts = { w: { id: 'w', type: 'Lift', duration: 90, calories: 900 } };
        state.today.activeCalories = 1200;
        renderSimpleView();
        const withWorkout = read();
        state.today.workouts = {};
        state.today.activeCalories = 0;
        state.settings.tdeeCalibrationEnabled = false;
        renderSimpleView();
        const off = read();
        const offTagHidden = off.tag.hidden;
        state.settings.tdeeCalibrationEnabled = true;
        const rawBefore = getLiveTdeeEstimate().raw;
        state.today.activeCalories = 900; // overlapping Watch active calories must not add to TDEE
        const rawAfter = getLiveTdeeEstimate().raw;
        state.today.activeCalories = 0;
        __setTodayIntake(2100);
        renderSimpleView();
        const over = read();
        state.settings.intakeBudgetKcal = 2000;
        const custom = getIntakeGoals();
        openSettingsModal?.();
        const settingsShows = document.getElementById('settingsIntakeBudget')?.value;
        closeSettingsModal?.();
        delete state.settings.intakeBudgetKcal;
        return { keys: states.map(s => s.key), adj, goals, a, aTag, withWorkout, off, offTagHidden, over, custom, settingsShows, rawBefore, rawAfter };
    });
    ok(budget.keys.join() === 'normal,approaching,approaching,approaching,reached,reached,above', `budget thresholds (${budget.keys})`);
    ok(budget.adj < 0 && budget.goals.baseBudget === 1900 && budget.goals.budget === 1900 + budget.adj && budget.goals.budgetCorrection === budget.adj, `budget = 1,900 + correction (${budget.adj}) = ${budget.goals.budget}`);
    ok(budget.a.target.replace(/,/g, '') === String(1900 + budget.adj) && !budget.aTag.hidden && budget.aTag.text === `1,900 − ${Math.abs(budget.adj)} calibration`, `home shows the calibrated budget with its math (${budget.a.target}, "${budget.aTag.text}")`);
    ok(budget.withWorkout.status === budget.a.status && budget.withWorkout.target === budget.a.target, 'budget unaffected by workouts / active calories');
    ok(budget.off.target === '1,900' && budget.offTagHidden, 'calibration off → base budget 1,900, no tag');
    ok(new RegExp(`2,100 kcal logged, ${2100 - (1900 + budget.adj)} over`).test(budget.over.status) && budget.over.current === '2,100', `above-target overage measured against the calibrated budget (${budget.over.status})`);
    ok(budget.custom.baseBudget === 2000 && budget.custom.budget === 2000 + budget.adj && budget.settingsShows === '2000', 'custom base budget honored; Settings shows/saves the base (no double subtraction)');
    ok(budget.rawBefore === budget.rawAfter, 'active calories never double counted in TDEE');

    // Data arriving without a refresh call (cloud sync from another device)
    // must re-plan today's stored targets on the next render, never stick.
    const resync = await page.evaluate(() => {
        __seed(); refreshTodayTargets(); renderSimpleView();
        const before = { adj: getActiveCalibrationAdjustment(state.today.date), plan: state.today.targets.planTdee };
        const last = getValues(state.weighIns).sort((a, b) => a.date < b.date ? -1 : 1).pop();
        state.weighIns.w_sync = { id: 'w_sync', date: state.today.date, weight: last.weight - 3, source: 'sync' };
        renderSimpleView();
        const now = getPlanningTDEE(getWeightForDate(state.today.date), state.today.date);
        const after = { adj: getActiveCalibrationAdjustment(state.today.date), plan: state.today.targets.planTdee, now,
            budget: document.getElementById('budgetTarget').textContent };
        delete state.weighIns.w_sync;
        return { before, after };
    });
    ok(resync.after.adj !== resync.before.adj && resync.after.plan === resync.after.now && resync.after.plan !== resync.before.plan
        && resync.after.budget.replace(/,/g, '') === String(1900 + resync.after.adj),
        `synced weigh-in re-fits the correction (${resync.before.adj} → ${resync.after.adj}) and re-plans targets + budget on render`);

    // ---------- Copied-text WORKOUT import (regression) ----------
    const workout = await page.evaluate(() => {
        __seed();
        const parsed = parseImportLine('WORKOUT|Lift|45|280|17:00|2026-10-07');
        document.getElementById('importClaudeInput').value = 'WORKOUT|Lift|45|280|17:00|2026-10-07';
        confirmImportData();
        const w = getValues(state.dailyLogs['2026-10-07'].workouts).find(x => x.duration === 45);
        const runParsed = parseImportLine('WORKOUT|Run|30|260|07:00|2026-10-06');
        return { parsed: parsed.ok, type: w?.type, duration: w?.duration, calories: w?.calories, run: runParsed.ok && runParsed.item.workoutType };
    });
    ok(workout.parsed && workout.type === 'Lift' && workout.duration === 45 && workout.calories === 280, 'WORKOUT line imported unchanged');
    ok(workout.run === 'Run', 'Run stays Run in the stored schema');

    // ---------- WEIGHIN backfill (regression) ----------
    const wi = await page.evaluate(() => {
        __seed();
        const existing = state.weighIns['wi_2026-10-01'].weight;
        const before = getValues(state.weighIns).length;
        const grammar = parseImportLine(`WEIGHIN|${existing}||2026-10-01`);
        document.getElementById('importClaudeInput').value = `WEIGHIN|${existing}|24|2026-10-01`;
        confirmImportData(); // identical → skipped
        const afterDup = getValues(state.weighIns).length;
        document.getElementById('importClaudeInput').value = 'WEIGHIN|189.9||2026-10-01\nWEIGHIN|187.9|24.1|2026-09-12';
        confirmImportData();
        const sameDay = getValues(state.weighIns).filter(w => w.date === '2026-10-01').map(w => w.weight).sort();
        const added = getValues(state.weighIns).find(w => w.date === '2026-09-12');
        const sel = selectCalibrationWeighIns(getValues(state.weighIns), '2026-10-08').days.find(d => d.date === '2026-10-01');
        renderWeighInHistory();
        return {
            grammar: grammar.ok && grammar.item.type === 'weighin' && grammar.item.weight === existing,
            before, afterDup, sameDay, existing,
            addedSource: added?.source, addedBf: added?.bodyFat, selWeight: sel.weight,
            coverage: document.getElementById('weighInCoverage')?.innerHTML.length > 0
        };
    });
    ok(wi.grammar, 'WEIGHIN|Weight|BodyFat|YYYY-MM-DD grammar unchanged');
    ok(wi.afterDup === wi.before, 'identical WEIGHIN skipped');
    ok(wi.sameDay.length === 2 && wi.sameDay.includes(wi.existing), 'different same-day reading added, original never overwritten');
    ok(wi.addedSource === 'import' && wi.addedBf === 24.1, 'backfilled reading stored with provenance');
    ok(wi.selWeight === wi.existing, 'calibration uses one (morning/lowest) reading per day');
    ok(wi.coverage, 'weigh-in coverage strip rendered');

    // ---------- Manual weigh-in: no silent overwrite ----------
    const manual = await page.evaluate(() => {
        __seed();
        openWeighInModal();
        document.getElementById('weighInDateInput').value = '2026-10-05';
        document.getElementById('weightInput').value = '190.5';
        const original = state.weighIns['wi_2026-10-05'].weight;
        saveWeighIn();
        const afterFirst = getValues(state.weighIns).filter(w => w.date === '2026-10-05').map(w => w.weight);
        const noteShown = !document.getElementById('weighInConfirmNote').hidden;
        saveWeighIn();
        const afterSecond = getValues(state.weighIns).filter(w => w.date === '2026-10-05').map(w => w.weight);
        return { original, afterFirst, noteShown, afterSecond };
    });
    ok(manual.afterFirst.length === 1 && manual.afterFirst[0] === manual.original && manual.noteShown, 'first tap asks, does not overwrite');
    ok(manual.afterSecond.length === 1 && manual.afterSecond[0] === 190.5, 'explicit second tap replaces');
}

async function layoutSuite(page, label) {
    await page.evaluate(() => {
        __seed();
        __setTodayIntake(2100);
        saveDayLog();
        showSimpleView?.();
        renderSimpleView();
        document.getElementById('tdeeDetails').open = true;
        renderTdeeDetailsBody();
    });
    const clearOverlays = () => page.evaluate(() => document.querySelectorAll('.celebration-overlay, .celebration-content, .confetti, .confetti-piece, [class*="celebration"], [class*="confetti"], .toast').forEach(el => el.remove()));
    await clearOverlays();
    await page.locator('#intakeBudgetRow').scrollIntoViewIfNeeded();
    await fits(page, '#intakeBudgetRow');
    await fits(page, '#tdeeDetails');
    await page.screenshot({ path: `${shotDir}/bodycomp-cal-home-${label}.png`, fullPage: false });
    await page.locator('#deficitAverages').scrollIntoViewIfNeeded();
    await fits(page, '#deficitAverages');
    await page.locator('.recent-progress').screenshot({ path: `${shotDir}/bodycomp-badges-${label}.png` });
    await page.evaluate(() => { showDetailsView(); switchDashboardTab('calendar'); calendarViewDate = new Date(2026, 9, 1); renderCalendarHeatmap(); });
    await clearOverlays();
    await page.locator('#calendarHeatmap').scrollIntoViewIfNeeded();
    await fits(page, '#calendarHeatmap');
    await fits(page, '.cal-legend');
    await page.screenshot({ path: `${shotDir}/bodycomp-calendar-${label}.png`, fullPage: false });
    await page.evaluate(() => {
        showDetailsView();
        switchDashboardTab('progress');
        renderProgressTab();
        ['tdeeCalibration', 'rateOfWeightLoss', 'metabolicAdaptation'].forEach(id => document.getElementById('pm_' + id)?.classList.remove('collapsed'));
    });
    await clearOverlays();
    const cards = await page.evaluate(() => ({
        cal: document.getElementById('tdeeCalibration').textContent,
        rate: document.getElementById('rateOfWeightLoss').textContent,
        model: document.getElementById('metabolicAdaptation').textContent,
        svgs: ['tdeeCalibration', 'rateOfWeightLoss', 'metabolicAdaptation'].map(id => document.querySelectorAll(`#${id} svg[role="img"]`).length)
    }));
    ok(/Learned correction\s*−\d+ ±\d+ kcal\/day/.test(cards.cal) && /90% range/.test(cards.cal) && /Confidence\s*(Provisional|Moderate)/.test(cards.cal), 'calibration card: correction ± SD, 90% range, confidence');
    ok(/Latest update · Oct 9/.test(cards.cal) && /Don't add a separate under-counting subtractor/.test(cards.cal), 'calibration card: latest weigh-in update + no-extra-subtractor note');
    ok(/Current rate \(4-week trend\)/.test(cards.rate) && /Cross-check, weigh-ins only/.test(cards.rate), 'rate card: filter rate + raw cross-check');
    ok(/scale trend/.test(cards.model) && /original formula said/.test(cards.model) && /Accuracy check on your data/.test(cards.model) && /Formula bias/.test(cards.model), 'model card: 4-week comparison + backtest table');
    ok(cards.svgs.every(n => n >= 1), `each card draws its chart (${cards.svgs})`);
    for (const id of ['tdeeCalibration', 'rateOfWeightLoss', 'metabolicAdaptation']) {
        await page.locator('#' + id).scrollIntoViewIfNeeded();
        await fits(page, '#' + id);
    }
    await fits(page, '#recompPredictor');
    await page.locator('#tdeeCalibration').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shotDir}/bodycomp-cal-progress-${label}.png`, fullPage: false });
    await page.locator('#metabolicAdaptation').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shotDir}/bodycomp-cal-model-${label}.png`, fullPage: false });
}

try {
    for (const engine of [chromium, webkit]) {
        const browser = await engine.launch();
        try {
            for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
                const context = await browser.newContext({ viewport, timezoneId: 'America/New_York', hasTouch: viewport.width < 600 });
                const { page, errors } = await load(context);
                page.on('dialog', dialog => dialog.dismiss());
                const label = `${engine.name()}-${viewport.width}`;
                if (viewport.width === 390) await logicSuite(page);
                await layoutSuite(page, label);
                assert.deepEqual(errors, [], `page errors: ${errors.join('\n')}`);
                console.log(`PASS ${engine.name()} ${viewport.width}×${viewport.height}`);
                await context.close();
            }
        } finally {
            await browser.close();
        }
    }
    console.log(`\n${checks} checks passed · screenshots in ${shotDir}`);
} finally {
    server.close();
}
