// ============================================================
// AUTO-CALIBRATION (model v2, spec D1)
// Nightly decay-weighted fit of the sleep threshold from
// projected-vs-actual sleep onset deltas. 66 min ≈ 1 mg
// (one amp half-life ≈ 11h moves load by factor 2; local
// slope near threshold ≈ threshold*ln2/11h ≈ 1mg per 66min).
// ============================================================

const CALIBRATION = {
    MIN_NIGHTS: 5,
    LOOKBACK_NIGHTS: 21,
    DECAY: 0.9,               // weight = 0.9^ageDays
    MIN_PER_MG: 66,
    MAX_STEP_MG: 1,           // per-day clamp
    THRESHOLD_MIN: 8,
    THRESHOLD_MAX: 22,
    MANUAL_PAUSE_DAYS: 7,
    CAFF_MIN_NIGHTS: 10,      // caffeine-binding nights required
    CAFF_LOOKBACK: 30,
    CAFF_STEP_H: 0.25,
    CAFF_HL_MIN: 3,
    CAFF_HL_MAX: 8,
    CAFF_BIAS_MIN: 15         // |avgDelta| minutes before HL moves
};

function getActiveBaseThreshold() {
    const c = state.calibration || {};
    if (c.autoFit && Number.isFinite(c.fittedThreshold) && c.fittedThreshold !== null) {
        return c.fittedThreshold;
    }
    return numOr(state.settings.sleepThreshold, 14);
}

function getActiveCaffHalfLife() {
    const c = state.calibration || {};
    if (c.autoFit && Number.isFinite(c.fittedCaffHalfLife) && c.fittedCaffHalfLife !== null) {
        return c.fittedCaffHalfLife;
    }
    return numOr(state.settings.caffHalfLife, 5.5);
}

// Gather last-N nights with both prediction and actual; newest first.
function getCalibrationNights(lookback) {
    const entries = getValues(state.history)
        .filter(e => e && e.date && Number.isFinite(e.deltaMinutes))
        .sort((a, b) => b.date.localeCompare(a.date));
    return entries.slice(0, lookback);
}

// Shared math: decay-weighted signed delta over the lookback window.
// Positive avgDelta = user fell asleep LATER than predicted = model too optimistic.
function computeCalibrationFit() {
    const nights = getCalibrationNights(CALIBRATION.LOOKBACK_NIGHTS);
    if (nights.length < CALIBRATION.MIN_NIGHTS) {
        return { eligible: false, nights: nights.length, avgDelta: null, suggestedStep: 0 };
    }
    const newest = nights[0].date;
    const [ny, nm, nd] = newest.split('-').map(Number);
    const newestDate = new Date(ny, nm - 1, nd);
    let wSum = 0, dSum = 0;
    nights.forEach(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        const ageDays = Math.max(0, Math.round((newestDate - new Date(y, m - 1, d)) / 86400000));
        const w = Math.pow(CALIBRATION.DECAY, ageDays);
        wSum += w;
        dSum += w * e.deltaMinutes;
    });
    const avgDelta = wSum > 0 ? dSum / wSum : 0;
    const rawStep = avgDelta / CALIBRATION.MIN_PER_MG;
    const step = Math.max(-CALIBRATION.MAX_STEP_MG, Math.min(CALIBRATION.MAX_STEP_MG, rawStep));
    return { eligible: true, nights: nights.length, avgDelta: avgDelta, suggestedStep: step };
}

// Runs once per local date (from autoPopulateFeedback / morning check-in).
function runAutoCalibration() {
    if (!state.calibration) return;
    const c = state.calibration;
    const today = getLocalDateString(new Date());
    if (c.lastFitDate === today) return;                       // once a day
    if (!c.autoFit) return;                                    // frozen
    if (c.manualPauseUntil && c.manualPauseUntil >= today) return; // manual edit pause

    const fit = computeCalibrationFit();
    if (!fit.eligible) return;

    const prev = Number.isFinite(c.fittedThreshold) && c.fittedThreshold !== null
        ? c.fittedThreshold
        : numOr(state.settings.sleepThreshold, 14);
    // Positive delta (slept later than predicted) → model cleared too early → LOWER threshold.
    const fitted = Math.max(CALIBRATION.THRESHOLD_MIN,
        Math.min(CALIBRATION.THRESHOLD_MAX, prev - fit.suggestedStep));

    c.fittedThreshold = Math.round(fitted * 10) / 10;
    c.lastAdjustment = Math.round((c.fittedThreshold - prev) * 10) / 10;
    c.lastFitNights = fit.nights;
    c.lastFitDate = today;

    fitCaffHalfLife();
}

// Caffeine HL second-parameter fit: only trains on nights where
// caffeine was the binding factor (stored on history entries by Task 8).
function fitCaffHalfLife() {
    const c = state.calibration;
    const caffNights = getCalibrationNights(CALIBRATION.CAFF_LOOKBACK)
        .filter(e => e.bindingFactor === 'caffeine');
    if (caffNights.length < CALIBRATION.CAFF_MIN_NIGHTS) return;
    const avgDelta = caffNights.reduce((s, e) => s + e.deltaMinutes, 0) / caffNights.length;
    if (Math.abs(avgDelta) < CALIBRATION.CAFF_BIAS_MIN) return;
    const prev = Number.isFinite(c.fittedCaffHalfLife) && c.fittedCaffHalfLife !== null
        ? c.fittedCaffHalfLife
        : numOr(state.settings.caffHalfLife, 5.5);
    // Slept later than predicted on caffeine-bound nights → caffeine lingers longer → raise HL.
    const step = avgDelta > 0 ? CALIBRATION.CAFF_STEP_H : -CALIBRATION.CAFF_STEP_H;
    c.fittedCaffHalfLife = Math.max(CALIBRATION.CAFF_HL_MIN,
        Math.min(CALIBRATION.CAFF_HL_MAX, Math.round((prev + step) * 100) / 100));
}

// ---- Calibration card (Accuracy page) ----
function renderCalibrationCard() {
    const el = document.getElementById('calibrationCard');
    if (!el) return;
    const c = state.calibration || {};
    const fit = computeCalibrationFit();
    const active = getActiveBaseThreshold();
    const paused = c.manualPauseUntil && c.manualPauseUntil >= getLocalDateString(new Date());
    let statusLine;
    if (!c.autoFit) statusLine = 'Auto-fit is <strong>frozen</strong> — using manual threshold.';
    else if (paused) statusLine = 'Paused until ' + escapeHtml(c.manualPauseUntil) + ' (manual threshold edit).';
    else if (!fit.eligible) statusLine = 'Learning — needs ' + (CALIBRATION.MIN_NIGHTS - fit.nights) + ' more logged nights.';
    else statusLine = 'Fitting nightly from your last ' + fit.nights + ' logged nights.';
    const adj = c.lastAdjustment || 0;
    const adjTxt = adj === 0 ? 'no change' : (adj > 0 ? '+' : '') + adj + ' mg';
    el.innerHTML =
        '<div class="sc-cal-value">Threshold: <strong>' + active.toFixed(1) + ' mg</strong>'
        + (c.autoFit && c.fittedThreshold !== null ? ' <span class="sc-cal-tag">auto-fit</span>' : '') + '</div>'
        + '<div class="sc-cal-status">' + statusLine + '</div>'
        + '<div class="sc-cal-last">Last adjustment: ' + adjTxt + ' (' + (c.lastFitNights || 0) + ' nights)</div>'
        + (c.fittedCaffHalfLife !== null ? '<div class="sc-cal-caff">Caffeine half-life fitted: ' + c.fittedCaffHalfLife + ' h</div>' : '')
        + '<div class="sc-cal-actions">'
        + '<label><input type="checkbox" id="calFreezeToggle" ' + (c.autoFit ? '' : 'checked') + ' onchange="calToggleFreeze(this)"> Freeze auto-fit</label> '
        + '<button class="sc-btn-sm" onclick="calResetFit()">Reset fit</button>'
        + '</div>';
}

function calToggleFreeze(cb) {
    state.calibration.autoFit = !cb.checked;
    renderCalibrationCard();
    recalculate();
    saveState();
}

function calResetFit() {
    showCustomConfirm('Reset auto-calibration? The fitted threshold and caffeine half-life will be cleared and relearned.', function() {
        state.calibration.fittedThreshold = null;
        state.calibration.fittedCaffHalfLife = null;
        state.calibration.lastAdjustment = 0;
        state.calibration.lastFitNights = 0;
        state.calibration.lastFitDate = null;
        renderCalibrationCard();
        recalculate();
        saveState();
        showToast('Calibration reset');
    });
}

// Settings threshold input handler (spec D1 step 4.3): a genuine manual edit
// pauses auto-fit for MANUAL_PAUSE_DAYS days and clears the fitted value, then
// runs the normal recalculation. Wired from the #sleepThreshold input's onchange
// so it fires ONLY on real user edits — not on the 5s recalculate tick or on
// cloud-merge DOM resyncs (both of which route through recalculate() directly).
function calOnThresholdInput(el) {
    const p = parseFloat(el && el.value);
    if (Number.isFinite(p) && p !== numOr(state.settings.sleepThreshold, 14) && state.calibration) {
        const _t = new Date();
        const _pause = new Date(_t.getFullYear(), _t.getMonth(), _t.getDate() + CALIBRATION.MANUAL_PAUSE_DAYS);
        state.calibration.manualPauseUntil = getLocalDateString(_pause);
        state.calibration.fittedThreshold = null;
        saveState();
    }
    recalculate();
}

// ---- Morning check-in (Dashboard strip; spec D5) ----
function renderMorningCheckin() {
    const el = document.getElementById('morningCheckin');
    if (!el) return;
    const today = getLocalDateString(new Date());
    const log = (state.sleepDailyLogs || {})[today];
    if (log && log.checkedIn) {
        el.innerHTML = '<div class="sc-checkin-done">✓ Checked in — slept ' + escapeHtml(String(log.actualSleep ?? '?')) + 'h</div>';
        return;
    }
    el.innerHTML =
        '<div class="sc-checkin-row">'
        + '<span class="sc-checkin-label">Morning check-in:</span> '
        + 'woke <input type="time" id="checkinWake" value="' + escapeHtml(state.wakeTime || '08:00') + '"> '
        + 'after <input type="number" id="checkinHours" min="0" max="14" step="0.5" value="' + escapeHtml(String(state.hoursSleptLastNight ?? 7)) + '"> h '
        + '<button class="sc-btn-sm" onclick="confirmMorningCheckin()">Confirm</button>'
        + '</div>';
}

function confirmMorningCheckin() {
    const wakeEl = document.getElementById('checkinWake');
    const hrsEl = document.getElementById('checkinHours');
    if (!wakeEl || !hrsEl) return;
    const wake = wakeEl.value;
    const hrs = Number(hrsEl.value);
    if (!wake || !Number.isFinite(hrs) || hrs < 0 || hrs > 14) { showToast('Enter a valid wake time and hours', 'error'); return; }
    const today = getLocalDateString(new Date());

    state.wakeTime = wake;
    state.hoursSleptLastNight = hrs;
    state.sleepHistory = state.sleepHistory || {};
    state.sleepHistory[today] = { hoursSlept: hrs, wakeTime: wake, updatedAt: new Date().toISOString() };
    state.sleepDailyLogs = state.sleepDailyLogs || {};
    state.sleepDailyLogs[today] = Object.assign({}, state.sleepDailyLogs[today] || {}, {
        actualSleep: hrs, wakeTime: wake, checkedIn: true, source: 'checkin',
        lastUpdated: new Date().toISOString()
    });

    if (typeof autoPopulateFeedback === 'function') autoPopulateFeedback();
    runAutoCalibration();
    const wakeInput = document.getElementById('wakeTime');
    if (wakeInput) wakeInput.value = wake;
    const hrsInput = document.getElementById('hoursSlept');
    if (hrsInput) hrsInput.value = hrs;
    renderMorningCheckin();
    recalculate();
    saveState();
    showToast('Checked in — calibration updated');
}

// ---- Real caffeine cutoff (Dashboard; spec D6) ----
// "If I want ONE more dose of caffeine today, when's the last moment it can
// land and still be under the caffeine threshold by tonight's predicted onset?"
// Closed-form: solve doseMg * (1/2)^(minutesBefore / (hl*60)) = allowance.
function computeCaffeineCutoff(doseMg) {
    const pred = calculateSleepTime();
    const wakeMin = timeToMinutes(state.wakeTime || '08:00');
    const norm = t => (t < wakeMin ? t + 1440 : t);       // wake-normalized ordering
    const bed = norm(pred.sleepTime);
    const caffThresh = numOr(state.settings.caffThreshold, 25);
    const hl = getActiveCaffHalfLife();
    const loadAtBed = calculateCaffLoad(pred.sleepTime);
    const allowance = caffThresh - loadAtBed;
    if (allowance <= 0) return { status: 'closed' };          // existing caffeine already fills budget
    if (doseMg <= allowance) return { status: 'anytime' };    // dose fits even taken at bedtime
    const minutesBefore = hl * 60 * Math.log2(doseMg / allowance);
    const cutoffNorm = bed - minutesBefore;
    const cutoff = ((cutoffNorm % 1440) + 1440) % 1440;
    if (cutoffNorm <= norm(getCurrentMinutes())) return { status: 'passed', cutoff: cutoff };
    return { status: 'open', cutoff: cutoff, minutesLeft: Math.round(cutoffNorm - norm(getCurrentMinutes())) };
}

function renderCaffeineCutoffCard() {
    const el = document.getElementById('caffeineCutoffCard');
    if (!el) return;
    const rows = [{ mg: 95, label: 'Full coffee (95mg)' }, { mg: 45, label: 'Half cup / soda (45mg)' }];
    el.innerHTML = rows.map(r => {
        const c = computeCaffeineCutoff(r.mg);
        let txt;
        if (c.status === 'closed') txt = 'budget already spent — no more today';
        else if (c.status === 'anytime') txt = 'fine anytime before bed';
        else if (c.status === 'passed') txt = 'cutoff passed (' + minutesToTime(c.cutoff) + ')';
        else txt = 'last call ' + minutesToTime(c.cutoff) + ' (' + Math.floor(c.minutesLeft / 60) + 'h ' + (c.minutesLeft % 60) + 'm left)';
        return '<div class="sc-cutoff-row"><span>' + r.label + '</span><span class="sc-cutoff-val sc-cutoff-' + c.status + '">' + txt + '</span></div>';
    }).join('');
}
