// ============================================
// CIRCADIAN PHASE DETECTION
// ============================================

function analyzeCircadianPhase() {
    // Collect wake times from last 7 days
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const wakeTimes = [];

    // ALWAYS include today first with current inputs.
    // wakeMinutes is null on purpose: today's typed wake is a live input, not
    // logged history — it must NOT pollute the 7-day circular mean (Bug 7).
    // hoursSlept is real data and still feeds the sleep-average calculations below.
    wakeTimes.push({
        date: todayStr,
        wakeMinutes: null,
        hoursSlept: state.hoursSleptLastNight
    });

    // Then check history for past 6 days (not including today since we added it above)
    for (let i = 1; i <= 6; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString(date);

        // Use unified helper (checks sleepDailyLogs then sleepHistory)
        const sleepData = (typeof getSleepForDate === 'function') ? getSleepForDate(dateStr) : null;
        if (sleepData) {
            const h = Number(sleepData.hoursSlept);
            wakeTimes.push({
                date: dateStr,
                wakeMinutes: sleepData.wakeTime ? timeToMinutes(sleepData.wakeTime) : null,
                hoursSlept: (!isNaN(h) && h >= 0) ? h : 0
            });
        }
    }

    // Filter to only entries with valid historical wake times for phase calculation.
    // Excludes today (wakeMinutes === null) and any corrupted NaN wake values.
    const wakeTimesWithData = wakeTimes.filter(w => w.wakeMinutes !== null && Number.isFinite(w.wakeMinutes));

    // Calculate average sleep from ALL entries (even without wake time)
    const allSleepData = wakeTimes.filter(w => w.hoursSlept > 0);
    const avgSleep = allSleepData.length > 0
        ? allSleepData.reduce((sum, w) => sum + w.hoursSlept, 0) / allSleepData.length
        : state.hoursSleptLastNight;

    if (wakeTimesWithData.length < 1) {
        return {
            phase: 'unknown',
            label: 'Insufficient Data',
            color: '#8b949e',
            icon: '❓',
            avgWakeTime: timeToMinutes(state.wakeTime),
            avgSleep: avgSleep,
            consistency: 0,
            stdDev: 0,
            dataPoints: allSleepData.length,
            recommendation: 'Log wake times in the calendar to detect your circadian phase. Click any day to add data.'
        };
    }

    // Calculate average wake time using circular mean (handles midnight crossing)
    const sinSum = wakeTimesWithData.reduce((s, w) => s + Math.sin(w.wakeMinutes * 2 * Math.PI / 1440), 0);
    const cosSum = wakeTimesWithData.reduce((s, w) => s + Math.cos(w.wakeMinutes * 2 * Math.PI / 1440), 0);
    let avgWakeMinutes = Math.atan2(sinSum, cosSum) * 1440 / (2 * Math.PI);
    if (avgWakeMinutes < 0) avgWakeMinutes += 1440;

    // Calculate consistency (standard deviation using circular distance)
    let stdDev = 0;
    if (wakeTimesWithData.length >= 2) {
        const variance = wakeTimesWithData.reduce((sum, w) => {
            const diff = w.wakeMinutes - avgWakeMinutes;
            const circDist = Math.min(Math.abs(diff), 1440 - Math.abs(diff));
            return sum + (circDist * circDist);
        }, 0) / wakeTimesWithData.length;
        stdDev = Math.sqrt(variance);
    }

    // Detect phase based on average wake time
    let phase, label, color, icon, recommendation;

    // Normal: wake 5am-8am (300-480 minutes)
    // Early Bird: wake before 5am (<300 minutes)
    // Night Owl: wake after 10am (>600 minutes)
    // Extreme Night Owl: wake after noon (>720 minutes) - DANGER

    if (avgWakeMinutes >= 300 && avgWakeMinutes <= 480) {
        phase = 'normal';
        label = 'Normal Phase';
        color = '#5E8A5E';
        icon = '✅';
        recommendation = 'Your circadian rhythm is well-aligned. Maintain consistent wake times to preserve this.';
    } else if (avgWakeMinutes < 300) {
        // Early bird (before 5am)
        if (avgWakeMinutes < 180) {
            // Extreme early (before 3am)
            phase = 'extreme-early';
            label = 'Extreme Early Bird';
            color = '#C4923A';
            icon = '🌅';
            recommendation = 'Waking before 3am consistently may indicate Advanced Sleep Phase Disorder. Consider light therapy in evening and avoiding morning light to shift later.';
        } else {
            phase = 'early';
            label = 'Early Bird';
            color = '#5E7A8A';
            icon = '🐦';
            recommendation = 'Early wake pattern. This is generally healthy if intentional. Ensure you\'re getting enough total sleep hours.';
        }
    } else if (avgWakeMinutes > 720) {
        // Extreme night owl (after noon) - DANGER ZONE
        phase = 'danger-delayed';
        label = 'SEVERELY DELAYED';
        color = '#B85C5C';
        icon = '🚨';
        recommendation = 'DANGER: Waking after noon indicates severely delayed circadian phase. This pattern correlates with depression, metabolic dysfunction, and cognitive impairment. You need aggressive light therapy (10,000 lux) immediately upon waking and strict light avoidance after 8pm.';
    } else if (avgWakeMinutes > 600) {
        // Night owl (after 10am)
        phase = 'delayed';
        label = 'Delayed Phase';
        color = '#C4923A';
        icon = '🦉';
        recommendation = 'Your circadian rhythm is delayed. To shift earlier: get bright light immediately upon waking, avoid screens after 8pm, and gradually wake 15-30 min earlier every few days.';
    } else {
        // Slightly late (8am-10am)
        phase = 'slightly-late';
        label = 'Slightly Late';
        color = '#C4923A';
        icon = '⏰';
        recommendation = 'Wake time is slightly later than ideal. Consider morning light exposure to anchor your rhythm earlier.';
    }

    // Check consistency (only if we have multiple wake times)
    let consistencyWarning = '';
    if (wakeTimesWithData.length >= 3 && stdDev > 120) {
        // More than 2 hour variation
        consistencyWarning = '\n\n⚠️ HIGH VARIABILITY: Your wake times vary by over 2 hours. Inconsistent sleep schedules cause "social jet lag" which impairs cognitive function and metabolism.';
    } else if (wakeTimesWithData.length >= 3 && stdDev > 60) {
        consistencyWarning = '\n\n⚠️ MODERATE VARIABILITY: Try to keep wake times within 1 hour of each other, even on weekends.';
    }

    // Check sleep debt accumulation (use allSleepData which includes entries without wake times)
    let debtWarning = '';
    if (allSleepData.length >= 3) {
        const recentDays = allSleepData.slice(0, 3);
        const recentAvgSleep = recentDays.reduce((sum, w) => sum + w.hoursSlept, 0) / recentDays.length;
        if (recentAvgSleep < 5) {
            debtWarning = '\n\n🚨 CRITICAL SLEEP DEBT: Averaging less than 5 hours over recent days. Hyperarousal risk is extremely high.';
        } else if (recentAvgSleep < 6.5) {
            debtWarning = '\n\n⚠️ ACCUMULATING DEBT: Averaging less than 6.5 hours. This compounds cognitive impairment.';
        }
    }

    return {
        phase,
        label,
        color,
        icon,
        avgWakeTime: avgWakeMinutes,
        avgSleep,
        consistency: wakeTimesWithData.length >= 2 ? Math.max(0, 100 - (stdDev / 2)) : 0,
        stdDev,
        recommendation: recommendation + consistencyWarning + debtWarning,
        dataPoints: allSleepData.length
    };
}

// ============================================
// PROCESS C: Circadian Rhythm
// ============================================

// BUG FIX: Use 7-day average wake time when available
function getForbiddenZone() {
    // Forbidden Zone: 13-15 hours after wake time
    const phase = analyzeCircadianPhase();
    const wakeMin = (phase && phase.avgWakeTime) ? phase.avgWakeTime : timeToMinutes(state.wakeTime);
    const start = wakeMin + (13 * 60); // 13 hours after wake
    const end = wakeMin + (15 * 60);   // 15 hours after wake
    return { start, end };
}

// BUG FIX: Use 7-day average wake time when available
function getSleepGate() {
    // Sleep Gate: 15-17 hours after wake time (optimal window)
    const phase = analyzeCircadianPhase();
    const wakeMin = (phase && phase.avgWakeTime) ? phase.avgWakeTime : timeToMinutes(state.wakeTime);
    const start = wakeMin + (15 * 60); // 15 hours after wake
    const end = wakeMin + (17 * 60);   // 17 hours after wake
    return { start, end };
}

function isInForbiddenZone(timeMinutes) {
    const { start, end } = getForbiddenZone();
    // Handle day rollover
    let checkTime = timeMinutes;
    if (checkTime < timeToMinutes(state.wakeTime)) {
        checkTime += 24 * 60; // Next day
    }
    return checkTime >= start && checkTime < end;
}

function isInSleepGate(timeMinutes) {
    const { start, end } = getSleepGate();
    let checkTime = timeMinutes;
    if (checkTime < timeToMinutes(state.wakeTime)) {
        checkTime += 24 * 60;
    }
    return checkTime >= start && checkTime <= end;
}

function getForbiddenZoneEnd() {
    const { end } = getForbiddenZone();
    return end > 24 * 60 ? end - 24 * 60 : end;
}
