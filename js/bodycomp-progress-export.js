let progressExportReport = null;
let progressExportReturnFocus = null;
let progressExportPreviousOverflow = '';

function getProgressExportRange(preset, today = getLocalDateString()) {
    const start = parseLocalDate(today);
    const end = parseLocalDate(today);
    if (preset === 'yesterday') {
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
    } else if (preset === 'week') {
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    } else if (preset === 'month') {
        start.setDate(1);
    } else if (['7', '30', '90'].includes(preset)) {
        start.setDate(start.getDate() - Number(preset) + 1);
    }
    return { start: getLocalDateString(start), end: getLocalDateString(end) };
}

function generateProgressExport(start, end) {
    // Every existing field keeps its original (raw-model) meaning; the
    // personal TDEE calibration appears only as a separate labeled line.
    if (typeof withRawDeficits === 'function' && _rawDeficitScope === 0) {
        return withRawDeficits(() => generateProgressExport(start, end));
    }
    if (!isValidImportDate(start) || !isValidImportDate(end) || start > end || end > getLocalDateString()) {
        throw new Error('Choose valid dates, with the start on or before the end and no future days.');
    }
    const rows = [];
    // Morning weigh-ins and the smoothed trend from the calibration filter,
    // so each row carries the weight data the TDEE was learned from.
    const energyRun = typeof getEnergyBalanceRun === 'function' ? getEnergyBalanceRun() : null;
    const energyRows = new Map((energyRun?.ok ? energyRun.series : []).map(row => [row.date, row]));
    const calibrationOn = typeof isTdeeCalibrationEnabled === 'function' && isTdeeCalibrationEnabled() && !!energyRun?.ok;
    const cursor = parseLocalDate(start);
    const liveDate = state.today?.date || getLocalDateString();
    while (getLocalDateString(cursor) <= end) {
        const date = getLocalDateString(cursor);
        const live = date === liveDate;
        const log = live ? state.today : state.dailyLogs?.[date];
        const totals = getTotalsForDate(date);
        const workouts = getWorkoutTotalsForDate(date);
        const intake = live || !log?.calories ? (totals.mealCount > 0 ? totals.calories : log?.calories) : log.calories;
        const knownIntake = hasNutritionData(log) && Number.isFinite(intake);
        const deficit = getDisplayDeficitForDate(date);
        const assumed = !hasNutritionData(log) && state.dailyLogs?.[date]?.nutritionStatus === 'assumed';
        const exerciseKnown = workouts.workouts.some(workout => Number.isFinite(workout.calories)) && Number.isFinite(workouts.totalCalories);
        const exerciseIncomplete = workouts.workoutCount > 0 && !workouts.workouts.every(workout => Number.isFinite(workout.calories));
        const energyRow = energyRows.get(date);
        const storedTdee = !live && typeof log?.tdee === 'number' && log.tdee > 0 ? Math.round(log.tdee) : null;
        rows.push({
            date,
            weight: energyRow?.weight ?? null,
            trendWeight: energyRow && Number.isFinite(energyRow.sTrend) ? Math.round(energyRow.sTrend * 10) / 10 : null,
            modelTdee: storedTdee,
            calibratedTdee: storedTdee !== null && calibrationOn ? storedTdee + getActiveCalibrationAdjustment(date) : null,
            intake: knownIntake ? Math.round(intake) : null,
            deficit: Number.isFinite(deficit) ? Math.round(deficit) : null,
            exercise: exerciseKnown ? Math.round(workouts.totalCalories) : null,
            exerciseIncomplete,
            assumed,
            partial: date === getLocalDateString() || live
        });
        cursor.setDate(cursor.getDate() + 1);
    }
    // The in-progress day is listed but never totaled — a half-logged day
    // would understate intake and overstate the balance.
    const completedRows = rows.filter(row => !row.partial);
    const knownBalances = completedRows.filter(row => row.deficit !== null);
    const knownIntakes = completedRows.filter(row => row.intake !== null);
    const knownExercise = completedRows.filter(row => row.exercise !== null);
    const summary = {
        days: rows.length,
        completedDays: completedRows.length,
        inProgressDays: rows.length - completedRows.length,
        balanceDays: knownBalances.length,
        intakeDays: knownIntakes.length,
        exerciseDays: knownExercise.length,
        assumedDays: knownBalances.filter(row => row.assumed).length,
        deficit: knownBalances.length ? knownBalances.reduce((sum, row) => sum + row.deficit, 0) : null,
        intake: knownIntakes.length ? knownIntakes.reduce((sum, row) => sum + row.intake, 0) : null,
        exercise: knownExercise.length ? knownExercise.reduce((sum, row) => sum + row.exercise, 0) : null,
        deficitDays: knownBalances.filter(row => row.deficit > 0).length,
        surplusDays: knownBalances.filter(row => row.deficit < 0).length,
        maintenanceDays: knownBalances.filter(row => row.deficit === 0).length
    };
    // Labeled calibration section for an independent check (absent when
    // off or not in force). Totals above stay on the original formula.
    const calibrationLines = buildProgressExportCalibration(energyRun, calibrationOn, start, end, knownBalances, summary);
    const number = value => value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    const balance = (value, unit = 'kcal') => value === null ? 'Unknown' : `${value > 0 ? 'Deficit' : value < 0 ? 'Surplus' : 'Maintenance'}: ${number(Math.abs(value))} ${unit}`;
    const text = [
        'BODYCOMP PROGRESS EXPORT',
        `Period: ${start} to ${end} (inclusive) | Days: ${summary.days}`,
        '',
        'PERIOD SUMMARY',
        `Net balance — ${balance(summary.deficit)}`,
        `Average daily balance — ${balance(summary.balanceDays ? summary.deficit / summary.balanceDays : null, 'kcal/day')} (${summary.balanceDays} known days; ${summary.assumedDays} assumed)`,
        `Average logged intake: ${summary.intakeDays ? number(summary.intake / summary.intakeDays) + ' kcal/day' : 'Unknown'} (${summary.intakeDays} days with intake)`,
        `Recorded exercise: ${summary.exercise === null ? 'Unknown' : number(summary.exercise) + ' kcal total'} | Average: ${summary.exercise === null ? 'Unknown' : number(summary.exercise / summary.completedDays) + ' kcal/day over ' + summary.completedDays + ' calendar days'}`,
        `Exercise calories recorded: ${summary.exerciseDays}/${summary.completedDays} days; ${completedRows.filter(row => row.exerciseIncomplete).length} incomplete. Other days not inferred as rest.`,
        `Deficit days: ${summary.deficitDays} | Surplus days: ${summary.surplusDays} | Maintenance: ${summary.maintenanceDays} | Unknown balance: ${summary.completedDays - summary.balanceDays}`,
        ...(summary.inProgressDays ? [`In progress: ${rows.filter(row => row.partial).map(row => row.date).join(', ')} — listed below, not included in totals until complete.`] : []),
        '',
        'DAILY DATA',
        ...rows.map(row => `${row.date} | Intake: ${row.intake === null ? 'Not logged' : number(row.intake) + ' kcal'} | ${balance(row.deficit)}${row.assumed ? ' (assumed)' : ''} | Exercise: ${row.exercise === null ? (row.exerciseIncomplete ? 'Incomplete calorie data' : 'Not logged') : number(row.exercise) + ' kcal' + (row.exerciseIncomplete ? ' (incomplete)' : '')} | Weigh-in: ${row.weight === null ? '—' : row.weight + ' lb'}${row.trendWeight === null ? '' : ` (trend ${row.trendWeight})`}${row.modelTdee === null ? '' : ` | TDEE formula ${number(row.modelTdee)}${row.calibratedTdee === null ? '' : ` / calibrated ${number(row.calibratedTdee)}`}`}${row.partial ? ' | In progress' : ''}`),
        ...(calibrationLines.length ? ['', ...calibrationLines] : []),
        '',
        'Notes: Intake is logged food, not proof of complete intake. Unknown balances/intakes are excluded from their averages. Assumed balances are included and labeled. Today/live day is in progress and not totaled. Balances use the original TDEE model (formula); the calibration section shows the learned correction separately. Weigh-ins are the standardized morning readings the calibration uses (one per day). Exercise is reported separately; do not add it again to BodyComp balances. Daily kcal are rounded; totals sum the listed completed-day values.'
    ].join('\n');
    return { text, rows, summary };
}

// Calibration + accuracy-check section of the progress export: what the
// filter learned, how it did out of sample, and the period's numbers, so an
// analyst can recompute the correction from the daily rows.
function buildProgressExportCalibration(run, calibrationOn, start, end, knownBalances, summary) {
    if (!calibrationOn || typeof calTrendFromRun !== 'function') return [];
    const C = TDEE_CALIBRATION;
    const cur = run.current;
    const r = value => Math.round(value).toLocaleString('en-US');
    const sign = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
    const lb = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)} lb`;
    const liveDate = state.today?.date || getLocalDateString();
    const rawToday = calculateTDEE(getWeightForDate(liveDate), state.profile.height_cm, state.profile.age, state.today?.date);
    const lines = [
        'TDEE CALIBRATION (estimate; Kalman filter over all history, re-fit whenever data changes)',
        `Data used: ${run.trackedDays} food-logged days + ${run.weighInDays} morning weigh-ins, ${run.startDate} to ${run.endDate}${run.downweighted ? ` (${run.downweighted} unusual readings down-weighted)` : ''}`,
        `Learned correction now: ${sign(cur.correction)} ± ${Math.round(cur.correctionSd)} kcal/day (90%: ${sign(cur.correction - C.CI_Z * cur.correctionSd)} to ${sign(cur.correction + C.CI_Z * cur.correctionSd)}), ${CALIBRATION_CONFIDENCE_LABELS[cur.confidence] || cur.confidence}`,
        `TDEE today: formula ${r(rawToday)} → calibrated ${r(rawToday + getActiveCalibrationAdjustment(liveDate))} kcal/day. The correction combines under-logged intake, formula and workout-calorie error and adaptation; it is not an extra subtractor on top.`
    ];
    const trend = calTrendFromRun(run);
    if (trend) {
        lines.push(`4-week trend: ${lb(trend.lbPerWeek)}/wk (90%: ${lb(trend.lbPerWeekRange[0])} to ${lb(trend.lbPerWeekRange[1])}), trend weight ${trend.trendWeight.toFixed(1)} ± ${trend.trendWeightSd.toFixed(1)} lb`);
    }
    const calDays = knownBalances.filter(row => !row.assumed);
    const adjTotal = calDays.reduce((sum, row) => sum + getActiveCalibrationAdjustment(row.date), 0);
    if (adjTotal !== 0 && summary.deficit !== null) {
        summary.calibrationAdjustmentTotal = adjTotal;
        const net = value => `${value >= 0 ? 'deficit' : 'surplus'} ${r(Math.abs(value))} kcal`;
        lines.push(`This period with the correction applied to its ${calDays.length} food-logged days: net ${net(summary.deficit + adjTotal)} (formula: ${net(summary.deficit)}).`);
    }
    // Period check: smoothed trend change vs. each prediction from the log
    const from = start < run.startDate ? run.startDate : start;
    const to = calAddDays(end, 1) > run.endDate ? run.endDate : calAddDays(end, 1);
    if (from < to) {
        const paths = calPredictionPaths(run, from).filter(p => p.date <= to);
        if (paths.length > 1) {
            const a = paths[0], b = paths[paths.length - 1];
            lines.push(`Period check (${from} morning → ${to} morning): scale trend ${lb(b.trend - a.trend)}; original formula predicted ${lb(b.model - a.model)}; calibrated (correction known each morning) predicted ${lb(b.calibrated - a.calibrated)}.`);
        }
    }
    const tests = [7, 14, 28].map(h => getEnergyBalanceBacktest(h)).filter(t => t.n >= 3);
    if (tests.length) {
        lines.push('Walk-forward backtest over all history (from each weigh-in, predict the weight N days later from the food log only; error = predicted − actual, lb):');
        tests.forEach(t => lines.push(`  ${t.horizon} days (n=${t.n}): formula bias ${t.model.bias.toFixed(2)}, MAE ${t.model.mae.toFixed(2)}, RMSE ${t.model.rmse.toFixed(2)} | calibrated bias ${t.calibrated.bias.toFixed(2)}, MAE ${t.calibrated.mae.toFixed(2)}, RMSE ${t.calibrated.rmse.toFixed(2)}`));
    }
    lines.push(`Model: trend(t+1) = trend(t) + (intake − formula TDEE − correction) / ${C.KCAL_PER_LB} on food-logged days; scale = trend + noise (SD ${C.SCALE_NOISE_LB} lb); logged-day noise SD ${C.TRACKED_DAY_KCAL_SD} kcal; unlogged days uninformative (SD ${C.UNTRACKED_DAY_KCAL_SD} kcal); correction random walk SD ${C.CORRECTION_DRIFT_KCAL} kcal/day; prior 0 ± ${C.PRIOR_CORRECTION_SD_KCAL}; Huber down-weighting beyond z=${C.ROBUST_Z}.`);
    return lines;
}

function openProgressExport(trigger = document.activeElement) {
    const modal = document.getElementById('progressExportModal');
    if (modal.classList.contains('active')) return;
    progressExportReturnFocus = trigger;
    progressExportPreviousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.classList.add('active');
    selectProgressExportRange('7');
    modal.querySelector('.modal-close').focus({ preventScroll: true });
}

function closeProgressExport() {
    const modal = document.getElementById('progressExportModal');
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('active');
    document.body.style.overflow = progressExportPreviousOverflow;
    progressExportReturnFocus?.focus({ preventScroll: true });
}

function selectProgressExportRange(preset) {
    const custom = preset === 'custom';
    document.getElementById('progressExportDates').hidden = !custom;
    document.querySelectorAll('[data-progress-range]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.progressRange === preset));
    });
    const range = getProgressExportRange(preset);
    for (const edge of ['start', 'end']) {
        const input = document.getElementById(`progressExport-${edge}`);
        input.max = getLocalDateString();
        if (!custom || !input.value) input.value = range[edge];
    }
    updateProgressExport();
}

function updateProgressExport() {
    const copy = document.getElementById('progressExportCopy');
    const status = document.getElementById('progressExportStatus');
    const preview = document.getElementById('progressExportPreview');
    copy.textContent = 'Copy to Clipboard';
    status.textContent = '';
    try {
        progressExportReport = generateProgressExport(document.getElementById('progressExport-start').value, document.getElementById('progressExport-end').value);
        preview.textContent = progressExportReport.text;
        preview.scrollTop = 0;
        const summary = progressExportReport.summary;
        const net = summary.deficit === null ? 'Balance unknown' : `${summary.deficit > 0 ? 'Net deficit' : summary.deficit < 0 ? 'Net surplus' : 'Net maintenance'}: ${Math.abs(summary.deficit).toLocaleString('en-US')} kcal`;
        document.getElementById('progressExportCoverage').textContent = `${net}\n${summary.days} days · ${summary.balanceDays} balances known`;
        copy.disabled = false;
    } catch (error) {
        progressExportReport = null;
        preview.textContent = '';
        document.getElementById('progressExportCoverage').textContent = 'Check your date range';
        status.textContent = error.message;
        copy.disabled = true;
    }
}

async function copyProgressExport() {
    document.getElementById('progressExport-start').blur();
    document.getElementById('progressExport-end').blur();
    updateProgressExport();
    if (!progressExportReport) return;
    const text = progressExportReport.text;
    document.getElementById('progressExportCopy').textContent = 'Copy to Clipboard';
    let copied = false;
    try {
        await navigator.clipboard.writeText(text);
        copied = true;
    } catch {
        const fallback = document.createElement('textarea');
        fallback.value = text;
        fallback.readOnly = true;
        fallback.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
        document.getElementById('progressExportModal').appendChild(fallback);
        fallback.focus({ preventScroll: true });
        fallback.select();
        fallback.setSelectionRange(0, text.length);
        try { copied = document.execCommand('copy'); } catch {}
        fallback.remove();
    }
    const status = document.getElementById('progressExportStatus');
    if (progressExportReport?.text !== text) {
        status.textContent = copied ? 'Copied the previous range. Copy again for the selected dates.' : 'The range changed. Tap Copy to try again.';
        return;
    }
    if (copied) {
        document.getElementById('progressExportCopy').textContent = '✓ Copied';
        document.getElementById('progressExportCopy').focus({ preventScroll: true });
        status.textContent = 'Ready to paste into ChatGPT.';
    } else {
        const preview = document.getElementById('progressExportPreview');
        preview.focus({ preventScroll: true });
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(preview);
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = 'Copy unavailable. Press and hold the report, then choose Select All → Copy.';
    }
}

function handleProgressExportKey(event) {
    const modal = document.getElementById('progressExportModal');
    if (!modal?.classList.contains('active')) return;
    if (event.key === 'Escape') {
        event.stopPropagation();
        closeProgressExport();
    }
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('button, input, [tabindex="0"]')].filter(element => !element.disabled && element.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!modal.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

document.addEventListener('keydown', handleProgressExportKey, true);
