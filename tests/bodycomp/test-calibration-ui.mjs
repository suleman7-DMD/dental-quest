// BodyComp calibration / budget / Progress integration harness (Playwright)
// Loads the real body-comp-tracker.html with the clock fixed at
// 2026-10-09 10:00 ET, seeds the Sep 13 – Oct 8 regression fixture, and checks
// the app-level behavior: exports, disable flag, persistence, the intake
// budget, workout + WEIGHIN imports, completed-day rules, and phone/desktop
// layout. Chromium + WebKit at iPhone and desktop viewports.
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

let checks = 0;
const ok = (cond, message) => { assert(cond, message); checks++; };

async function logicSuite(page) {
    // ---------- Regression aggregates (calibration off/empty ledger) ----------
    const agg = await page.evaluate(() => {
        __seed();
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
            streak: calculateDeficitStreak()
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

    // ---------- Calibration commit, history integrity, persistence ----------
    const cal = await page.evaluate(() => {
        const logsBefore = JSON.stringify(state.dailyLogs);
        const targetsBefore = JSON.stringify(state.today.targets);
        const oct8Before = getDisplayDeficitForDate('2026-10-08');
        const status = getTdeeCalibrationStatus();
        const first = maybeCommitTdeeCalibration();
        const second = maybeCommitTdeeCalibration();
        const ledger = getTdeeCalibrationHistory();
        const entry = ledger[0];
        const est = getLiveTdeeEstimate();
        renderSimpleView();
        document.getElementById('tdeeDetails').open = true;
        renderTdeeDetailsBody();
        saveStateImmediate();
        const stored = JSON.parse(localStorage.getItem('bodyCompTrackerState'));
        loadState();
        const merged = calMergeHistories(getTdeeCalibrationHistory(), [{ ...entry, computedAt: '2099-01-01T00:00:00Z', adjustment: -300 }]);
        return {
            eligible: status.evaluation.eligible, confidence: status.evaluation.confidence,
            first, second, ledgerLength: ledger.length, entry,
            logsUnchanged: JSON.stringify(state.dailyLogs) === logsBefore,
            targetsUnchanged: JSON.stringify(state.today.targets) === targetsBefore,
            oct8Same: getDisplayDeficitForDate('2026-10-08') === oct8Before,
            est, label: document.getElementById('simpleTDEELabel')?.textContent,
            tdeeShown: document.getElementById('simpleTDEE')?.textContent,
            details: document.getElementById('tdeeDetailsBody').innerText,
            storedLength: calNormalizeHistory(stored.settings.tdeeCalibrationLog).length,
            reloadedLength: getTdeeCalibrationHistory().length,
            mergedLength: merged.length, mergedAdj: merged[0].adjustment,
            claude: generateClaudeExport(), weekly: generateWeeklyClaudeExport(), daily: generateExportText(),
            rawDeficitLive: getCurrentRawDeficit(), calibratedLive: getCurrentDeficit(),
            progressRow: generateProgressExport('2026-10-09', '2026-10-09').rows[0].deficit,
            progressText: generateProgressExport('2026-10-02', '2026-10-09').text
        };
    });
    ok(cal.eligible && cal.confidence === 'provisional', `backfilled 26 days → provisional (got ${cal.confidence})`);
    ok(cal.first === true && cal.second === false && cal.ledgerLength === 1, 'one commit per 7 completed days');
    ok(cal.entry.effectiveDate === '2026-10-09' && cal.entry.adjustment < 0 && cal.entry.adjustment >= -100, `first correction negative, ≤ 100 (got ${cal.entry.adjustment})`);
    ok(cal.logsUnchanged, 'historical logs untouched by calibration');
    ok(cal.targetsUnchanged, 'mode targets/budget not lowered by calibration');
    ok(cal.oct8Same, 'days before the effective date are not re-penalized');
    ok(cal.est.calibrated === cal.est.raw + cal.entry.adjustment, 'calibrated = raw + correction');
    ok(cal.label === 'TDEE est.' && cal.tdeeShown.replace(/,/g, '').includes(String(cal.est.calibrated)), 'homepage shows labeled calibrated estimate');
    ok(/Original estimate/.test(cal.details) && /slower than your calorie log predicts/.test(cal.details), 'details show original/correction/explanation');
    ok(cal.storedLength === 1 && cal.reloadedLength === 1 && cal.mergedLength === 1, 'ledger persists without duplication');
    ok(cal.mergedAdj === cal.entry.adjustment, 'cloud merge keeps the first-committed entry');
    ok(cal.calibratedLive === cal.rawDeficitLive + cal.entry.adjustment, 'live calibrated deficit');
    ok(new RegExp(`DEFICIT:${cal.rawDeficitLive}\\n`).test(cal.claude), 'Claude export DEFICIT stays raw');
    ok(/CALIBRATION_ADJ:-\d+\|CALIBRATED_TDEE:\d+\|CALIBRATED_DEFICIT:-?\d+\|CALIBRATION_CONFIDENCE:provisional\|NOTE:estimate/.test(cal.claude), 'Claude export adds labeled calibration line');
    ok(!/NEEDS_REFEED/.test(cal.claude) && !/NEEDS_REFEED/.test(cal.weekly), 'NEEDS_REFEED flag removed');
    ok(/TOTALS\|WeeklyDeficit:3480\|/.test(cal.weekly) && /CALIBRATION\|Adj:-\d+\|Confidence:provisional\|CalibratedWeeklyDeficit:3480\|Note:estimate/.test(cal.weekly), 'weekly export raw 3,480 + labeled line (no correction in force Oct 2–8)');
    ok(/CALIBRATED TDEE \(estimate\)/.test(cal.daily) && /today excluded/.test(cal.daily), 'daily export labeled + completed days');
    ok(cal.progressRow === cal.rawDeficitLive, 'progress export rows stay raw');
    ok(/Personal TDEE calibration \(estimate, not included above\)/.test(cal.progressText), 'progress export labeled calibration line');

    // ---------- Disable flag restores original behavior ----------
    const off = await page.evaluate(() => {
        state.settings.tdeeCalibrationEnabled = false;
        const est = getLiveTdeeEstimate();
        renderSimpleView();
        const result = {
            same: est.calibrated === est.raw,
            deficit: getDisplayDeficitForDate('2026-10-09') === getCurrentRawDeficit(),
            label: document.getElementById('simpleTDEELabel')?.textContent,
            ledgerKept: getTdeeCalibrationHistory().length === 1,
            commit: maybeCommitTdeeCalibration(),
            claudeNoCal: !/CALIBRATION_ADJ/.test(generateClaudeExport())
        };
        state.settings.tdeeCalibrationEnabled = true;
        result.backOn = getLiveTdeeEstimate().adjustment === getTdeeCalibrationHistory()[0].adjustment;
        return result;
    });
    ok(off.same && off.deficit && off.label === 'TDEE', 'disabled → original TDEE and deficit');
    ok(off.ledgerKept && off.commit === false && off.claudeNoCal, 'disabled → no commits, no export extras, ledger kept');
    ok(off.backOn, 're-enabling restores the stored correction');

    // ---------- Daily intake budget (independent of TDEE/workouts/calibration) ----------
    const budget = await page.evaluate(() => {
        const states = [1500, 1615, 1700, 1899, 1900, 1915, 2100].map(v => getIntakeBudgetState(v, 1900));
        const read = () => ({ status: document.getElementById('budgetStatus').textContent, current: document.getElementById('budgetCurrent').textContent, cls: document.getElementById('intakeBudgetRow').className });
        __setTodayIntake(1700);
        renderSimpleView();
        const a = read();
        state.today.workouts = { w: { id: 'w', type: 'Lift', duration: 90, calories: 900 } };
        state.today.activeCalories = 1200;
        state.settings.tdeeCalibrationEnabled = false;
        renderSimpleView();
        const b = read();
        state.settings.tdeeCalibrationEnabled = true;
        state.today.workouts = {};
        state.today.activeCalories = 0;
        const rawBefore = getLiveTdeeEstimate().raw;
        state.today.activeCalories = 900; // overlapping Watch active calories must not add to TDEE
        const rawAfter = getLiveTdeeEstimate().raw;
        state.today.activeCalories = 0;
        __setTodayIntake(2100);
        renderSimpleView();
        const over = read();
        state.settings.intakeBudgetKcal = 2000;
        __setTodayIntake(1900);
        renderSimpleView();
        const custom = read();
        delete state.settings.intakeBudgetKcal;
        return { keys: states.map(s => s.key), a, b, over, custom, rawBefore, rawAfter, overFill: document.getElementById('budgetOverFill').style.width };
    });
    ok(budget.keys.join() === 'normal,approaching,approaching,approaching,reached,reached,above', `budget thresholds (${budget.keys})`);
    ok(/Approaching daily intake target/.test(budget.a.status) && budget.a.status === budget.b.status && budget.a.cls === budget.b.cls, 'budget unaffected by workouts, active calories, calibration');
    ok(/Above target — keep logging normally/.test(budget.over.status) && /2,100 kcal logged, 200 over/.test(budget.over.status) && budget.over.current === '2,100', 'above-target shows actual intake and overage (not truncated)');
    ok(/Approaching/.test(budget.custom.status), 'budget editable (2,000 kcal setting honored)');
    ok(budget.rawBefore === budget.rawAfter, 'active calories never double counted in TDEE');

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
        maybeCommitTdeeCalibration();
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
    await page.evaluate(() => {
        showDetailsView();
        switchDashboardTab('progress');
        renderProgressTab();
        document.getElementById('pm_tdeeCalibration')?.classList.remove('collapsed');
    });
    await clearOverlays();
    const card = await page.evaluate(() => document.getElementById('tdeeCalibration').textContent);
    ok(/Confidence\s*Provisional/.test(card), 'card: 26 days after first review stays Provisional (no self-vouching)');
    ok(/Reviewed through Oct 8: Adjusted/.test(card), 'card reports the committed review, not a phantom next step');
    await page.locator('#tdeeCalibration').scrollIntoViewIfNeeded();
    await fits(page, '#tdeeCalibration');
    await fits(page, '#recompPredictor');
    await page.screenshot({ path: `${shotDir}/bodycomp-cal-progress-${label}.png`, fullPage: false });
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
