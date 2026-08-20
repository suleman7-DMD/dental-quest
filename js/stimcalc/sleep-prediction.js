// ============================================
// SLEEP PREDICTION ENGINE
// Extracted from stimulant-elimination-calculator.html (Phase 2)
// Dependencies: state.js, circadian.js, pharma-engine.js
// ============================================

// ============================================================
// SLEEP PREDICTION v2 (spec D2)
// sleepTime = latest of: amp clearance, caffeine clearance,
// workout cooldown — then a SOFT circadian gate that only
// delays (never blocks) and is named, not hidden.
// Returns { sleepTime, blockingFactors, pharmacokineticFloor,
//           bindingFactor, gateTime } — superset of v1's shape.
// blockingFactors elements are also a superset: they carry the
// legacy { type:'drug'|'circadian'|'workout', name, clearsAt, note }
// fields the UI reads (init.js/ui-sections.js) AND the v2
// { until, label } fields, so no consumer needs changing.
// ============================================================
function calculateSleepTime() {
    const now = getCurrentMinutes();
    const wakeMin = timeToMinutes(state.wakeTime || '08:00');
    const norm = t => (t < wakeMin ? t + 1440 : t);   // wake-normalized ordering
    const today = getLocalDateString(new Date());
    const blockingFactors = [];

    // --- Pharmacokinetic floor ---
    let sleepTime = now;
    let bindingFactor = 'now';

    const ampClear = findAmpClearTime();
    if (ampClear !== null && norm(ampClear) > norm(sleepTime)) {
        sleepTime = ampClear;
        bindingFactor = 'adderall';
    }
    if (ampClear !== null) {
        blockingFactors.push({ type: 'drug', name: 'Amphetamine', clearsAt: ampClear, until: ampClear,
            label: 'Adderall above threshold until ' + minutesToTimeWithDay(ampClear) });
    }

    const caffClear = findCaffClearTime();
    if (caffClear !== null && norm(caffClear) > norm(sleepTime)) {
        sleepTime = caffClear;
        bindingFactor = 'caffeine';
    }
    if (caffClear !== null) {
        blockingFactors.push({ type: 'drug', name: 'Caffeine', clearsAt: caffClear, until: caffClear,
            label: 'Caffeine above threshold until ' + minutesToTimeWithDay(caffClear) });
    }

    const pharmacokineticFloor = sleepTime;

    // --- Workout hard blocker (intense evening sessions only) ---
    const w = state.modifiers && state.modifiers.workout;
    if (w && w.active && w.intense && (w.date || today) === today) {
        const cooldownEnd = timeToMinutes(w.endTime || '18:00') + 60;
        if (norm(cooldownEnd) > norm(sleepTime)) {
            sleepTime = cooldownEnd;
            bindingFactor = 'workout';
            blockingFactors.push({ type: 'workout', name: 'Post-Workout Cooldown', clearsAt: cooldownEnd, until: cooldownEnd,
                label: 'Post-workout cooldown until ' + minutesToTimeWithDay(cooldownEnd),
                note: 'Core temp elevated from intense session' });
        }
    }

    // --- Soft circadian gate (only when drugs clear soon enough to matter) ---
    let gateTime = null;
    const hoursUntil = (norm(sleepTime) - norm(now)) / 60;
    if (hoursUntil < 18) {
        const fz = getForbiddenZone();   // wake-normalized space
        const s = norm(sleepTime);
        if (s >= fz.start && s < fz.end) {
            sleepTime = fz.end % 1440;
            bindingFactor = 'circadian';
            gateTime = fz.end % 1440;
            blockingFactors.push({ type: 'circadian', name: 'Circadian Alertness Peak',
                clearsAt: fz.end % 1440, until: fz.end % 1440,
                label: 'Circadian alertness peak — realistic onset ~' + minutesToTime(fz.end % 1440),
                note: 'Evening alertness peak before natural sleep onset' });
        }
    }

    // --- Final verification: never return a time where load exceeds threshold ---
    let verifyGuard = 0;
    while (verifyGuard < 5) {
        const v = sleepTime;
        const ampOk = calculateAmpLoad(v) <= getEffectiveThresholdAt(v);
        const caffOk = calculateCaffLoad(v) <= numOr(state.settings.caffThreshold, 25);
        if (ampOk && caffOk) break;
        const ampRe = findAmpClearTime();
        const caffRe = findCaffClearTime();
        let next = v;
        if (!ampOk && ampRe !== null && norm(ampRe) > norm(next)) { next = ampRe; bindingFactor = 'adderall'; }
        if (!caffOk && caffRe !== null && norm(caffRe) > norm(next)) { next = caffRe; bindingFactor = 'caffeine'; }
        if (norm(next) <= norm(v)) break;   // no progress — accept
        sleepTime = next;
        verifyGuard++;
    }

    return {
        sleepTime: sleepTime % 1440,
        blockingFactors: blockingFactors,
        pharmacokineticFloor: pharmacokineticFloor % 1440,
        bindingFactor: bindingFactor,
        gateTime: gateTime
    };
}
