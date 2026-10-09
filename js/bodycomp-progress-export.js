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
        rows.push({
            date,
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
    // Optional labeled calibration line (absent when off or not in force)
    let calibrationLine = null;
    if (typeof getActiveCalibrationAdjustment === 'function') {
        const calDays = knownBalances.filter(row => !row.assumed);
        const adjTotal = calDays.reduce((sum, row) => sum + getActiveCalibrationAdjustment(row.date), 0);
        const liveAdj = getActiveCalibrationAdjustment(state.today?.date || getLocalDateString());
        if (adjTotal !== 0 || liveAdj !== 0) {
            summary.calibrationAdjustmentTotal = adjTotal;
            const sign = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
            calibrationLine = `Personal TDEE calibration (estimate, not included above): ${sign(liveAdj)} kcal/day in force now; applied to this period's food-logged days it would change the net balance by ${sign(adjTotal)} kcal.`;
        }
    }
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
        ...(calibrationLine ? [calibrationLine] : []),
        '',
        'DAILY DATA',
        ...rows.map(row => `${row.date} | Intake: ${row.intake === null ? 'Not logged' : number(row.intake) + ' kcal'} | ${balance(row.deficit)}${row.assumed ? ' (assumed)' : ''} | Exercise: ${row.exercise === null ? (row.exerciseIncomplete ? 'Incomplete calorie data' : 'Not logged') : number(row.exercise) + ' kcal' + (row.exerciseIncomplete ? ' (incomplete)' : '')}${row.partial ? ' | In progress' : ''}`),
        '',
        'Notes: Intake is logged food, not proof of complete intake. Unknown balances/intakes are excluded from their averages. Assumed balances are included and labeled. Today/live day is in progress and not totaled. Balances use the original TDEE model. Exercise is reported separately; do not add it again to BodyComp balances. Daily kcal are rounded; totals sum the listed completed-day values.'
    ].join('\n');
    return { text, rows, summary };
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
