// ============================================
// HISTORY, CALIBRATION & SLEEP CALENDAR (Phase 4)
// ============================================

// Shared entry constructor — eliminates duplicate object construction
function buildHistoryEntry(id, date, predictedSleep, autoSaved) {
    return {
        id: id,
        date: date,
        medications: getValues(state.medications),
        caffeine: getValues(state.caffeine),
        modifiers: JSON.parse(JSON.stringify(state.modifiers)),
        predictedSleep: predictedSleep,
        actualSleep: null,
        autoSaved: autoSaved,
        predictedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        inputs: snapshotPredictionInputs()
    };
}

function autoSavePrediction(sleepTimeMinutes) {
    if (!state._dataLoaded || isInitialLoad || !hasLoadedFromCloud) return;

    const now = Date.now();
    const today = getLocalDateString();
    const todayEntry = getValues(state.history).find(h => h.date === today);

    // Don't overwrite manual saves
    if (todayEntry && todayEntry.autoSaved === false) return;

    // Throttle: skip if <10 min AND prediction changed <5 min
    const timeSince = now - lastAutoSavePredictionTime;
    const predDelta = lastAutoSavePredictionMinutes !== null
        ? Math.abs(sleepTimeMinutes - lastAutoSavePredictionMinutes) : Infinity;

    if (todayEntry && timeSince < 600000 && predDelta < 5) return;

    // Ensure history is an object
    if (!state.history || Array.isArray(state.history)) {
        state.history = migrateArrayToObject(state.history, 'hist');
    }

    if (todayEntry) {
        state.history[todayEntry.id].predictedSleep = sleepTimeMinutes;
        state.history[todayEntry.id].medications = getValues(state.medications);
        state.history[todayEntry.id].caffeine = getValues(state.caffeine);
        state.history[todayEntry.id].modifiers = JSON.parse(JSON.stringify(state.modifiers));
        state.history[todayEntry.id].lastUpdated = new Date().toISOString();
        state.history[todayEntry.id].inputs = snapshotPredictionInputs();
    } else {
        const id = generateId('hist');
        state.history[id] = buildHistoryEntry(id, today, sleepTimeMinutes, true);
    }

    lastAutoSavePredictionTime = now;
    lastAutoSavePredictionMinutes = sleepTimeMinutes;
    saveDailyLogicLog();
    saveState();
}

function saveDay() {
    const { sleepTime } = calculateSleepTime();
    const today = getLocalDateString();

    // Ensure history is an object
    if (!state.history || Array.isArray(state.history)) {
        state.history = migrateArrayToObject(state.history, 'hist');
    }

    const existingEntry = getValues(state.history).find(h => h.date === today);

    if (existingEntry) {
        state.history[existingEntry.id].predictedSleep = sleepTime;
        state.history[existingEntry.id].medications = getValues(state.medications);
        state.history[existingEntry.id].caffeine = getValues(state.caffeine);
        state.history[existingEntry.id].modifiers = JSON.parse(JSON.stringify(state.modifiers));
        state.history[existingEntry.id].autoSaved = false;
        state.history[existingEntry.id].lastUpdated = new Date().toISOString();
        state.history[existingEntry.id].inputs = snapshotPredictionInputs();
    } else {
        const id = generateId('hist');
        state.history[id] = buildHistoryEntry(id, today, sleepTime, false);
    }

    saveState();
    saveDailyLogicLog();
    renderHistory();
    showToast('Day saved! Log actual sleep time tomorrow.');
}


// Auto-populate feedback from sleep history (wakeTime - hoursSlept = sleep onset)
function autoPopulateFeedback() {
    const historyValues = getValues(state.history);
    let updated = false;
    let yesterdayFeedback = null;

    historyValues.forEach(entry => {
        // Skip manually-entered feedback, but allow recomputation of auto-filled values
        if (entry.actualSleep !== null && entry.actualSleep !== undefined && !entry.autoFilled) return;
        if (!entry.date || !entry.predictedSleep) return;

        const entryDate = parseLocalDate(entry.date);
        const nextDay = new Date(entryDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = getLocalDateString(nextDay);

        const sleepEntry = state.sleepHistory[nextDayStr];
        const hoursSlept = !sleepEntry ? null :
            typeof sleepEntry === 'number' ? sleepEntry : (sleepEntry && sleepEntry.hoursSlept);
        const wakeTime = (sleepEntry && typeof sleepEntry === 'object') ? sleepEntry.wakeTime : null;

        // BUG FIX: Require hoursSlept > 0 — 0h entries are all-nighters/no-data
        // and produce garbage values (wakeTime - 0 = wakeTime treated as sleep onset)
        if (hoursSlept != null && !isNaN(hoursSlept) && hoursSlept > 0 && wakeTime) {
            let wakeMinutes = timeToMinutes(wakeTime);
            let actualSleep = wakeMinutes - (hoursSlept * 60);
            if (actualSleep < 0) actualSleep += 24 * 60;

            state.history[entry.id].actualSleep = actualSleep;
            state.history[entry.id].autoFilled = true;
            state.history[entry.id].deltaMinutes = computeSleepDelta(entry.predictedSleep, actualSleep);
            state.history[entry.id].absError = Math.abs(state.history[entry.id].deltaMinutes);
            updated = true;

            // Also update sleepDailyLogs with prediction accuracy data
            if (!state.sleepDailyLogs) state.sleepDailyLogs = {};
            if (!state.sleepDailyLogs[entry.date]) {
                state.sleepDailyLogs[entry.date] = { date: entry.date, source: 'auto_feedback' };
            }
            state.sleepDailyLogs[entry.date].sleepOnsetMinutes = actualSleep;
            state.sleepDailyLogs[entry.date].predictedSleep = entry.predictedSleep;
            state.sleepDailyLogs[entry.date].actualSleep = actualSleep;
            state.sleepDailyLogs[entry.date].deltaMinutes = state.history[entry.id].deltaMinutes;
            state.sleepDailyLogs[entry.date].absError = state.history[entry.id].absError;

            // Track yesterday's feedback for toast
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (entry.date === getLocalDateString(yesterday)) {
                const diff = computeSleepDelta(entry.predictedSleep, actualSleep);
                yesterdayFeedback = {
                    predicted: minutesToTime(entry.predictedSleep > 24*60 ? entry.predictedSleep - 24*60 : entry.predictedSleep),
                    actual: minutesToTime(actualSleep),
                    diffMinutes: Math.round(Math.abs(diff)),
                    direction: diff > 0 ? 'later' : 'earlier'
                };
            }
        } else if (entry.autoFilled) {
            // Previously auto-filled but data is now invalid (0h sleep, missing data, etc.)
            // Clear the stale value so it shows "Awaiting feedback" instead of garbage
            state.history[entry.id].actualSleep = null;
            state.history[entry.id].autoFilled = false;
            state.history[entry.id].deltaMinutes = null;
            state.history[entry.id].absError = null;
            updated = true;

            // Also clear from sleepDailyLogs
            if (state.sleepDailyLogs && state.sleepDailyLogs[entry.date]) {
                state.sleepDailyLogs[entry.date].actualSleep = null;
                state.sleepDailyLogs[entry.date].deltaMinutes = null;
                state.sleepDailyLogs[entry.date].absError = null;
            }
        }
    });

    if (updated) {
        saveState();
        if (yesterdayFeedback) {
            const fb = yesterdayFeedback;
            if (fb.diffMinutes <= 15) {
                showToast('Yesterday\u2019s prediction was spot on! Predicted ' + fb.predicted + ', Actual ' + fb.actual);
            } else {
                showToast('Yesterday: Predicted ' + fb.predicted + ' \u2192 Actual ' + fb.actual + ' (' + fb.diffMinutes + ' min ' + fb.direction + ')');
            }
        }
    }
}

// BUG FIX 1: Use computeSleepDelta for accuracy display
function renderHistory() {
    const container = document.getElementById('historyList');
    if (!container) return; // Hidden in unified view

    // Clean up corrupted history entries (from the old bug)
    cleanupHistory();

    const historyValues = getValues(state.history).sort((a, b) => b.date.localeCompare(a.date));

    if (historyValues.length === 0) {
        container.innerHTML = '<p style="color: #6B635B; text-align: center; padding: 20px;">No history yet. Save today\'s data to start tracking accuracy.</p>';
        return;
    }

    // Show up to 30 entries (expanded from 10)
    const displayCount = 30;
    const entriesToShow = historyValues.slice(0, displayCount);

    let html = entriesToShow.map(entry => {
        const date = parseLocalDate(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const totalDose = entry.medications ? entry.medications.reduce((sum, m) => sum + m.dose, 0) : 0;
        const totalCaff = entry.caffeine ? entry.caffeine.reduce((sum, c) => sum + c.amount, 0) : 0;

        let accuracyText = 'Awaiting feedback';
        let accuracyClass = '';

        // Handle actualSleep - check for valid number
        if (entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep)) {
            // FIX 1: Use computeSleepDelta instead of raw subtraction
            const diff = Math.abs(computeSleepDelta(entry.predictedSleep, entry.actualSleep));
            const diffMins = Math.round(diff);
            accuracyText = diffMins <= 30 ? '✓ Accurate' : `${diffMins} min off`;
            accuracyClass = diffMins <= 30 ? 'style="color: #5E8A5E;"' : diffMins <= 60 ? 'style="color: #C4923A;"' : 'style="color: #B85C5C;"';
        }

        // Format predicted sleep time safely
        let predictedStr = '--:--';
        if (entry.predictedSleep !== null && entry.predictedSleep !== undefined && !isNaN(entry.predictedSleep)) {
            predictedStr = minutesToTime(entry.predictedSleep > 24*60 ? entry.predictedSleep - 24*60 : entry.predictedSleep);
        }

        // Format actual sleep time safely
        let actualStr = accuracyText;
        if (entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep)) {
            actualStr = 'Actual: ' + minutesToTime(entry.actualSleep);
        }

        // Calculate delta text for display
        let deltaHtml = '';
        if (entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep)) {
            const rawDiff = computeSleepDelta(entry.predictedSleep, entry.actualSleep);
            const absDiff = Math.abs(Math.round(rawDiff));
            let deltaClass, deltaText;
            if (absDiff <= 15) {
                deltaClass = 'delta-close';
                deltaText = absDiff + ' min off \u2713';
            } else if (rawDiff > 0) {
                deltaClass = absDiff <= 30 ? 'delta-close' : absDiff <= 60 ? 'delta-moderate' : 'delta-late';
                deltaText = absDiff + ' min late' + (absDiff > 30 ? ' \u26a0\ufe0f' : ' \u2713');
            } else {
                deltaClass = absDiff <= 30 ? 'delta-early' : absDiff <= 60 ? 'delta-moderate' : 'delta-late';
                deltaText = absDiff + ' min early' + (absDiff <= 30 ? ' \u2713' : ' \u26a0\ufe0f');
            }
            deltaHtml = '<div class="history-delta ' + deltaClass + '">' + deltaText + '</div>';
        }

        return `
            <div class="history-entry">
                <div>
                    <div class="history-date">${date}</div>
                    <div class="history-details">${totalDose}mg Adderall, ${totalCaff}mg Caffeine</div>
                </div>
                <div class="history-accuracy">
                    <div class="history-predicted">Predicted: ${predictedStr}</div>
                    <div class="history-actual" ${accuracyClass}>${actualStr}</div>
                    ${deltaHtml}
                </div>
            </div>
        `;
    }).join('');

    // Add count indicator if there are more entries
    if (historyValues.length > displayCount) {
        html += `<p style="color: #6B635B; text-align: center; padding: 10px; font-size: 0.85em;">
            Showing ${displayCount} of ${historyValues.length} entries
        </p>`;
    }

    container.innerHTML = html;

    // Update accuracy summary shown when section is collapsed
    const summaryEl = document.getElementById('historyAccuracySummary');
    if (summaryEl) {
        const withFeedback = historyValues.filter(h => h.actualSleep !== null && h.actualSleep !== undefined && !isNaN(h.actualSleep));
        if (withFeedback.length >= 3) {
            const recent = withFeedback.slice(0, 10);
            const avgError = recent.reduce((sum, h) => sum + Math.abs(computeSleepDelta(h.predictedSleep, h.actualSleep)), 0) / recent.length;
            const errMins = Math.round(avgError);
            const color = errMins <= 30 ? '#5E8A5E' : errMins <= 60 ? '#C4923A' : '#B85C5C';
            summaryEl.innerHTML = `Avg prediction error: <span style="color:${color}; font-weight: 600;">&plusmn;${errMins} min</span> (${withFeedback.length} predictions)`;
        } else if (withFeedback.length > 0) {
            summaryEl.textContent = `${withFeedback.length} prediction(s) tracked — need 3+ for accuracy score`;
        } else {
            summaryEl.textContent = 'Click to view prediction accuracy history';
        }
    }
}

// Clean up corrupted history entries
function cleanupHistory() {
    const historyValues = getValues(state.history);
    if (historyValues.length === 0) return;

    // Group entries by date and keep only one per day (the most recent one with valid data)
    const byDate = {};
    const idsToRemove = [];
    historyValues.forEach(entry => {
        const date = entry.date;
        if (!byDate[date]) {
            byDate[date] = entry;
        } else {
            // Keep the one with more data or higher ID (more recent)
            const existing = byDate[date];
            const existingHasMeds = existing.medications && getCount(existing.medications) > 0;
            const newHasMeds = entry.medications && getCount(entry.medications) > 0;

            if (newHasMeds && !existingHasMeds) {
                idsToRemove.push(existing.id);
                byDate[date] = entry;
            } else if (entry.id > existing.id) {
                idsToRemove.push(existing.id);
                byDate[date] = entry;
            } else {
                idsToRemove.push(entry.id);
            }
        }
    });

    // Remove duplicate entries
    if (idsToRemove.length > 0) {
        idsToRemove.forEach(id => {
            if (state.history && state.history[id]) {
                delete state.history[id];
            }
        });
    }

    // Prune entries older than 180 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    let pruned = false;
    const remainingValues = getValues(state.history);
    remainingValues.forEach(entry => {
        if (entry.date && entry.date < cutoffStr) {
            if (state.history && state.history[entry.id]) {
                delete state.history[entry.id];
                pruned = true;
            }
        }
    });

    if (idsToRemove.length > 0 || pruned) {
        saveState();
    }
}

// ============================================
// UNIFIED SLEEP DATA HELPER
// ============================================

// Returns consistent {hoursSlept, wakeTime, source} for any date,
// checking sleepDailyLogs first, then sleepHistory as fallback.
function getSleepForDate(dateStr) {
    // Check sleepDailyLogs first (richer data)
    var dailyLog = state.sleepDailyLogs ? state.sleepDailyLogs[dateStr] : null;
    if (dailyLog && dailyLog.hoursSlept !== undefined && dailyLog.hoursSlept !== null) {
        return {
            hoursSlept: dailyLog.hoursSlept,
            wakeTime: dailyLog.wakeTime ?? null,
            source: dailyLog.source || 'daily_log'
        };
    }

    // Fall back to sleepHistory
    var sleepEntry = state.sleepHistory ? state.sleepHistory[dateStr] : null;
    if (!sleepEntry) return null;

    if (typeof sleepEntry === 'number') {
        return { hoursSlept: sleepEntry, wakeTime: null, source: 'sleep_history' };
    }
    if (typeof sleepEntry === 'object') {
        var hours = sleepEntry.hoursSlept ?? null;
        var wake = sleepEntry.wakeTime ?? null;
        if (hours === null && wake === null) return null;
        return { hoursSlept: hours, wakeTime: wake, source: 'sleep_history' };
    }

    return null;
}

// Returns the total count of unique dates with sleep data across both sources.
// Uses getSleepForDate() for consistent logic with all tabs.
function getTotalDaysTracked() {
    var dateSet = {};
    // Collect all candidate date keys from both sources
    if (state.sleepDailyLogs) {
        Object.keys(state.sleepDailyLogs).forEach(function(k) { dateSet[k] = true; });
    }
    if (state.sleepHistory) {
        Object.keys(state.sleepHistory).forEach(function(k) { dateSet[k] = true; });
    }
    var count = 0;
    Object.keys(dateSet).forEach(function(dateStr) {
        var data = getSleepForDate(dateStr);
        if (data && data.hoursSlept !== null && data.hoursSlept !== undefined) count++;
    });
    return count;
}

// Count days with sleep data in a specific month (matches calendar tab counting).
function countDaysTrackedInMonth(year, month) {
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayStr = getLocalDateString();
    var count = 0;
    for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        if (dateStr > todayStr) break;
        var data = getSleepForDate(dateStr);
        if (data && data.hoursSlept !== null && data.hoursSlept !== undefined) count++;
    }
    return count;
}

// ============================================
// 7-DAY SLEEP HISTORY CALENDAR
// ============================================

function renderSleepCalendar() {
    const container = document.getElementById('sleepCalendar');
    if (!container) return;

    const today = new Date();
    const days = [];

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString(date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
        const isToday = i === 0;

        days.push({ dateStr, dayName, isToday });
    }

    container.innerHTML = days.map(day => {
        const sleepData = getSleepForDate(day.dateStr);
        const hoursSlept = sleepData ? sleepData.hoursSlept : undefined;
        const hasData = hoursSlept !== undefined && hoursSlept !== null;

        let cellClass = '';
        let textClass = 'swc-nodata-text';
        let statusText = '\u2014';

        if (hasData) {
            if (hoursSlept > 6.5) {
                cellClass = 'swc-great';
                textClass = 'swc-great-text';
            } else if (hoursSlept >= 4.5) {
                cellClass = 'swc-ok';
                textClass = 'swc-ok-text';
            } else {
                cellClass = 'swc-poor';
                textClass = 'swc-poor-text';
            }
            statusText = hoursSlept.toFixed(1) + 'h';
        }
        if (day.isToday) cellClass += ' swc-today';

        return '<div class="sleep-week-cell ' + cellClass + '" onclick="openSleepEditModal(\'' + day.dateStr + '\')">'
            + '<div class="swc-day">' + day.dayName + '</div>'
            + '<div class="swc-hours ' + textClass + '">' + statusText + '</div>'
            + (day.isToday ? '<div class="swc-today-dot">TODAY</div>' : '')
            + '</div>';
    }).join('');

    // Update circadian phase display
    renderCircadianPhase();
}

function renderCircadianPhase() {
    const container = document.getElementById('circadianPhaseDisplay');
    if (!container) return;

    const analysis = analyzeCircadianPhase();

    // Truncate recommendation for compact tile display
    const recText = analysis.recommendation.length > 120
        ? analysis.recommendation.substring(0, 117) + '...'
        : analysis.recommendation;

    const consistencyBadge = analysis.consistency !== undefined && analysis.dataPoints >= 3
        ? '<span style="margin-left:auto; font-size:0.75em; font-weight:700; color:' + (analysis.consistency > 70 ? '#5E8A5E' : analysis.consistency > 40 ? '#C4923A' : '#B85C5C') + ';">' + Math.round(analysis.consistency) + '%' + (analysis.stdDev ? ' \u00b1' + Math.round(analysis.stdDev) + 'm' : '') + '</span>'
        : '';

    container.innerHTML = '<div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">'
        + '<span style="font-size:1.3em; line-height:1;">' + analysis.icon + '</span>'
        + '<div style="min-width:0;">'
            + '<div style="font-size:0.65em; color:#6B635B; text-transform:uppercase; letter-spacing:0.3px; line-height:1.2;">Circadian Phase</div>'
            + '<div style="font-size:1em; font-weight:700; color:' + analysis.color + '; line-height:1.2;">' + analysis.label + '</div>'
        + '</div>'
        + consistencyBadge
    + '</div>'
    + (analysis.avgWakeTime ? '<div style="display:flex; gap:10px; font-size:0.75em; color:#6B635B; margin-bottom:4px;">'
        + '<span><b style="color:#2C2825;">' + minutesToTime(analysis.avgWakeTime) + '</b> wake</span>'
        + (analysis.avgSleep ? '<span><b style="color:#2C2825;">' + analysis.avgSleep.toFixed(1) + 'h</b> sleep</span>' : '')
        + (analysis.dataPoints ? '<span><b style="color:#2C2825;">' + analysis.dataPoints + 'd</b> logged</span>' : '')
    + '</div>' : '')
    + '<div style="padding:6px 8px; background:rgba(' + (analysis.color === '#B85C5C' ? '184,92,92' : analysis.color === '#C4923A' ? '196,146,58' : analysis.color === '#5E8A5E' ? '94,138,94' : '94,122,138') + ', 0.1); border-radius:6px; border-left:2px solid ' + analysis.color + ';">'
        + '<div style="font-size:0.73em; color:#2C2825; line-height:1.4;">' + recText + '</div>'
    + '</div>';
}

function openSleepEditModal(dateStr) {
    currentEditingDate = dateStr;

    const entry = state.sleepHistory[dateStr];
    const hoursSlept = entry ? (typeof entry === 'object' ? entry.hoursSlept : entry) : 7;
    const wakeTime = entry && typeof entry === 'object' ? entry.wakeTime : '07:00';

    // Format date for display
    const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
    const displayDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    document.getElementById('sleepEditTitle').textContent = `📅 ${displayDate}`;
    document.getElementById('sleepEditHours').value = hoursSlept;
    document.getElementById('sleepEditWakeTime').value = wakeTime;
    document.getElementById('sleepEditModal').classList.add('show');
}

function closeSleepEditModal() {
    document.getElementById('sleepEditModal').classList.remove('show');
    currentEditingDate = null;
}

function setAllNighter() {
    // Set hours to 0 (all-nighter) and save
    document.getElementById('sleepEditHours').value = 0;
    saveSleepEdit();
    showToast('🚫 All-nighter logged (0h sleep)');
}

function clearSleepEntry() {
    if (!currentEditingDate) return;

    // Remove the entry entirely (null = unlogged)
    delete state.sleepHistory[currentEditingDate];
    if (state.sleepDailyLogs) delete state.sleepDailyLogs[currentEditingDate];

    saveState();
    autoPopulateFeedback();

    // If clearing today, reset main inputs to defaults
    const today = getLocalDateString();
    if (currentEditingDate === today) {
        state.hoursSleptLastNight = 7; // Reset to default
        document.getElementById('hoursSlept').value = 7;
        recalculate();
    }

    renderSleepIntelligence();
    closeSleepEditModal();
    showToast('🗑️ Entry cleared (no data for this day)');
}

function saveSleepEdit() {
    if (!currentEditingDate) return;

    const hours = parseFloat(document.getElementById('sleepEditHours').value);
    const wakeTime = document.getElementById('sleepEditWakeTime').value;

    if (isNaN(hours) || hours < 0 || hours > 14) {
        showToast('Invalid hours. Enter 0-14.');
        return;
    }

    // Save as object with both values
    state.sleepHistory[currentEditingDate] = {
        hoursSlept: hours,
        wakeTime: wakeTime
    };

    // Also update sleepDailyLogs
    if (!state.sleepDailyLogs) state.sleepDailyLogs = {};
    var existingLog = state.sleepDailyLogs[currentEditingDate] || {};
    state.sleepDailyLogs[currentEditingDate] = Object.assign({}, existingLog, {
        date: currentEditingDate,
        hoursSlept: hours,
        wakeTime: wakeTime,
        status: computeSleepStatus(hours),
        sleepDeficit: Math.max(0, (state.settings.sleepTarget ?? 8) - hours),
        source: 'manual_edit',
        lastUpdated: new Date().toISOString()
    });

    saveState();
    autoPopulateFeedback();

    // If editing today, also update the main inputs
    const today = getLocalDateString();
    if (currentEditingDate === today) {
        state.hoursSleptLastNight = hours;
        state.wakeTime = wakeTime;
        document.getElementById('hoursSlept').value = hours;
        document.getElementById('wakeTime').value = wakeTime;
        recalculate();
    }

    renderSleepIntelligence();
    closeSleepEditModal();
    showToast(`Saved: ${hours}h sleep, wake ${formatTime12(wakeTime)}`);
}

// Auto-update today's sleep in the calendar when main input changes
function updateTodaySleepHistory() {
    const today = getLocalDateString();
    const existing = state.sleepHistory[today];

    // Preserve wake time if it exists, update hours
    state.sleepHistory[today] = {
        hoursSlept: state.hoursSleptLastNight,
        wakeTime: existing && typeof existing === 'object' ? existing.wakeTime : state.wakeTime
    };

    saveSleepDayLog();
    autoPopulateFeedback();
    renderSleepIntelligence();
}

// Also update when wake time changes
function updateTodayWakeTime() {
    const today = getLocalDateString();
    const existing = state.sleepHistory[today];

    state.sleepHistory[today] = {
        hoursSlept: existing && typeof existing === 'object' ? existing.hoursSlept : state.hoursSleptLastNight,
        wakeTime: state.wakeTime
    };

    saveSleepDayLog();
    autoPopulateFeedback();
    renderSleepIntelligence();
}

// ============================================
// SLEEP DAILY LOGS — Migration & Daily Snapshot
// ============================================

function migrateSleepDailyLogs() {
    // V2 migration: fixes off-by-one date mapping + processes entries without inputs
    if (state._sleepDailyLogsMigratedV2) return;
    if (!state.sleepDailyLogs) state.sleepDailyLogs = {};

    // Clear V1 backfilled entries (keep live/manual_edit from current session)
    Object.keys(state.sleepDailyLogs).forEach(function(dateStr) {
        if (state.sleepDailyLogs[dateStr] && state.sleepDailyLogs[dateStr].source === 'backfilled') {
            delete state.sleepDailyLogs[dateStr];
        }
    });

    var entries = getValues(state.history).slice().sort(function(a, b) {
        if (!a.date || !b.date) return 0;
        return a.date.localeCompare(b.date);
    });

    // Pass 1: Populate from ALL history entries (not just those with inputs)
    entries.forEach(function(entry) {
        if (!entry.date) return;
        var dateStr = entry.date;
        var inp = entry.inputs || {};

        var existing = state.sleepDailyLogs[dateStr] || {};
        // Don't overwrite live/manual_edit entries
        if (existing.source === 'live' || existing.source === 'manual_edit') return;

        // Latest entry for same date wins (by predictedAt)
        var existingAt = existing._predictedAt || '';
        var entryAt = entry.predictedAt || '';
        if (existing._predictedAt && entryAt < existingAt) return;

        // Get hoursSlept: prefer inputs, fall back to sleepHistory for this date
        var hoursSlept = null;
        var wakeTime = null;
        if (inp.hoursSleptLastNight !== undefined && inp.hoursSleptLastNight !== null) {
            hoursSlept = inp.hoursSleptLastNight;
            wakeTime = inp.wakeTime ?? null;
        } else {
            var sleepEntry = state.sleepHistory ? state.sleepHistory[dateStr] : null;
            if (sleepEntry) {
                if (typeof sleepEntry === 'number') {
                    hoursSlept = sleepEntry;
                } else if (typeof sleepEntry === 'object') {
                    hoursSlept = sleepEntry.hoursSlept ?? null;
                    wakeTime = sleepEntry.wakeTime ?? null;
                }
            }
        }

        // Get medications/caffeine from entry top-level (available on all entries)
        var meds = entry.medications ? JSON.parse(JSON.stringify(
            Array.isArray(entry.medications) ? entry.medications : getValues(entry.medications)
        )) : null;
        var caff = entry.caffeine ? JSON.parse(JSON.stringify(
            Array.isArray(entry.caffeine) ? entry.caffeine : getValues(entry.caffeine)
        )) : null;

        var totalAmp = 0;
        var totalCaff = 0;
        if (meds) meds.forEach(function(m) { totalAmp += (m.dose || 0); });
        if (caff) caff.forEach(function(c) { totalCaff += (c.amount || 0); });

        // Check modifiers from entry top-level or inputs
        var mods = entry.modifiers || {};
        var hadWorkout = !!(mods.workout && mods.workout.active) || (inp.hasWorkout ?? false);
        var hadSauna = !!(mods.sauna && mods.sauna.active) || (inp.hasSauna ?? false);
        var hadVitC = !!(mods.vitaminC && mods.vitaminC.active) || (inp.hasVitC ?? false);

        state.sleepDailyLogs[dateStr] = {
            date: dateStr,
            hoursSlept: hoursSlept,
            wakeTime: wakeTime,
            sleepOnsetMinutes: existing.sleepOnsetMinutes ?? null,
            totalAmpDose: totalAmp || (inp.totalAmpDose ?? null),
            totalCaffDose: totalCaff || (inp.totalCaffDose ?? null),
            medications: meds,
            caffeine: caff,
            hadWorkout: hadWorkout,
            hadSauna: hadSauna,
            hadVitC: hadVitC,
            allNighterMode: inp.allNighterMode ?? false,
            predictedSleep: entry.predictedSleep ?? null,
            actualSleep: entry.actualSleep ?? (existing.actualSleep ?? null),
            deltaMinutes: entry.deltaMinutes ?? (existing.deltaMinutes ?? null),
            absError: entry.absError ?? (existing.absError ?? null),
            effectiveThreshold: inp.effectiveThreshold ?? null,
            sleepDebtBonus: inp.sleepDebtBonus ?? null,
            baseThreshold: inp.baseThreshold ?? null,
            ampHalfLife: inp.ampHalfLife ?? null,
            sleepTarget: state.settings.sleepTarget ?? 8,
            sleepDeficit: hoursSlept !== null ? Math.max(0, (state.settings.sleepTarget ?? 8) - hoursSlept) : null,
            status: computeSleepStatus(hoursSlept),
            source: 'backfilled',
            lastUpdated: entry.predictedAt || new Date().toISOString(),
            _predictedAt: entryAt
        };

        // Guard: skip phantom entries with no real data
        if ((state.sleepDailyLogs[dateStr].hoursSlept === null || state.sleepDailyLogs[dateStr].hoursSlept === undefined) &&
            (state.sleepDailyLogs[dateStr].wakeTime === null || state.sleepDailyLogs[dateStr].wakeTime === undefined) &&
            (!state.sleepHistory || !state.sleepHistory[dateStr])) {
            delete state.sleepDailyLogs[dateStr];
            return;
        }
    });

    // Pass 2: Override with sleepHistory (manual entries win, adds dates not in history)
    // Creates COMPLETE entries for dates only in sleepHistory (not just partial updates)
    if (state.sleepHistory) {
        Object.keys(state.sleepHistory).forEach(function(dateStr) {
            var sleepEntry = state.sleepHistory[dateStr];
            if (!sleepEntry) return;

            var hours = null;
            var wakeTime = null;
            if (typeof sleepEntry === 'number') {
                hours = sleepEntry;
            } else if (typeof sleepEntry === 'object') {
                hours = sleepEntry.hoursSlept ?? null;
                wakeTime = sleepEntry.wakeTime ?? null;
            }

            if (hours === null && wakeTime === null) return;

            var existing = state.sleepDailyLogs[dateStr];
            if (existing) {
                // Update existing entry with sleepHistory data
                if (hours !== null) existing.hoursSlept = hours;
                if (wakeTime !== null) existing.wakeTime = wakeTime;
                existing.status = computeSleepStatus(existing.hoursSlept ?? null);
                existing.sleepDeficit = existing.hoursSlept !== null ? Math.max(0, (state.settings.sleepTarget ?? 8) - existing.hoursSlept) : null;
                if (!existing.source || existing.source === 'backfilled') {
                    existing.source = 'manual_edit';
                }
                if (!existing.lastUpdated) existing.lastUpdated = new Date().toISOString();
            } else {
                // Create a COMPLETE new entry for sleepHistory-only dates
                state.sleepDailyLogs[dateStr] = {
                    date: dateStr,
                    hoursSlept: hours,
                    wakeTime: wakeTime,
                    sleepOnsetMinutes: null,
                    totalAmpDose: null,
                    totalCaffDose: null,
                    medications: null,
                    caffeine: null,
                    hadWorkout: false,
                    hadSauna: false,
                    hadVitC: false,
                    allNighterMode: false,
                    predictedSleep: null,
                    actualSleep: null,
                    deltaMinutes: null,
                    absError: null,
                    effectiveThreshold: null,
                    sleepDebtBonus: null,
                    baseThreshold: null,
                    ampHalfLife: null,
                    sleepTarget: state.settings.sleepTarget ?? 8,
                    sleepDeficit: hours !== null ? Math.max(0, (state.settings.sleepTarget ?? 8) - hours) : null,
                    status: computeSleepStatus(hours),
                    source: 'backfilled_from_sleep_history',
                    lastUpdated: new Date().toISOString()
                };
            }
        });
    }

    // Clean up internal tracking field
    Object.keys(state.sleepDailyLogs).forEach(function(dateStr) {
        delete state.sleepDailyLogs[dateStr]._predictedAt;
    });

    state._sleepDailyLogsMigratedV2 = true;
    state._sleepDailyLogsMigrated = true;
    saveState();
}

// V3 migration: backfill sleepHistory-only dates into sleepDailyLogs
// This runs for V2-migrated users who already have _sleepDailyLogsMigratedV2 = true
// but whose sleepDailyLogs is missing entries that only exist in sleepHistory.
function migrateSleepDailyLogsV3() {
    if (state._sleepDailyLogsMigratedV3) return;
    if (!state.sleepHistory) { state._sleepDailyLogsMigratedV3 = true; return; }
    if (!state.sleepDailyLogs) state.sleepDailyLogs = {};

    var added = 0;
    Object.keys(state.sleepHistory).forEach(function(dateStr) {
        // Skip if already has a sleepDailyLogs entry
        if (state.sleepDailyLogs[dateStr]) return;

        var sleepEntry = state.sleepHistory[dateStr];
        if (!sleepEntry) return;

        var hours = null;
        var wakeTime = null;
        if (typeof sleepEntry === 'number') {
            hours = sleepEntry;
        } else if (typeof sleepEntry === 'object') {
            hours = sleepEntry.hoursSlept ?? null;
            wakeTime = sleepEntry.wakeTime ?? null;
        }

        if (hours === null && wakeTime === null) return;

        state.sleepDailyLogs[dateStr] = {
            date: dateStr,
            hoursSlept: hours,
            wakeTime: wakeTime,
            sleepOnsetMinutes: null,
            totalAmpDose: null,
            totalCaffDose: null,
            medications: null,
            caffeine: null,
            hadWorkout: false,
            hadSauna: false,
            hadVitC: false,
            allNighterMode: false,
            predictedSleep: null,
            actualSleep: null,
            deltaMinutes: null,
            absError: null,
            effectiveThreshold: null,
            sleepDebtBonus: null,
            baseThreshold: null,
            ampHalfLife: null,
            sleepTarget: state.settings.sleepTarget ?? 8,
            sleepDeficit: hours !== null ? Math.max(0, (state.settings.sleepTarget ?? 8) - hours) : null,
            status: computeSleepStatus(hours),
            source: 'backfilled_from_sleep_history',
            lastUpdated: new Date().toISOString()
        };
        added++;
    });

    state._sleepDailyLogsMigratedV3 = true;
    if (added > 0) saveState();
}

function cleanupPhantomSleepLogs() {
    if (!state.sleepDailyLogs) return;
    var removed = 0;
    Object.keys(state.sleepDailyLogs).forEach(function(dateStr) {
        var log = state.sleepDailyLogs[dateStr];
        if (log && (log.hoursSlept === null || log.hoursSlept === undefined) &&
            (log.source === 'backfilled' || log.source === 'backfilled_from_sleep_history') &&
            (!state.sleepHistory || !state.sleepHistory[dateStr])) {
            delete state.sleepDailyLogs[dateStr];
            removed++;
        }
    });
    if (removed > 0) saveState();
}

function saveSleepDayLog() {
    var today = getLocalDateString();
    if (!state.sleepDailyLogs) state.sleepDailyLogs = {};
    var existing = state.sleepDailyLogs[today] || {};

    state.sleepDailyLogs[today] = {
        date: today,
        hoursSlept: state.hoursSleptLastNight ?? null,
        wakeTime: state.wakeTime ?? null,
        sleepOnsetMinutes: existing.sleepOnsetMinutes ?? null,
        totalAmpDose: getValues(state.medications).reduce(function(s, m) { return s + (m.dose || 0); }, 0),
        totalCaffDose: getValues(state.caffeine).reduce(function(s, c) { return s + (c.amount || 0); }, 0),
        medications: JSON.parse(JSON.stringify(getValues(state.medications))),
        caffeine: JSON.parse(JSON.stringify(getValues(state.caffeine))),
        hadWorkout: !!(state.workoutPlan && state.workoutPlan.applied),
        hadSauna: !!(state.modifiers && state.modifiers.sauna && state.modifiers.sauna.active),
        hadVitC: !!(state.modifiers && state.modifiers.vitaminC && state.modifiers.vitaminC.active),
        allNighterMode: !!state.allNighterMode,
        predictedSleep: existing.predictedSleep ?? null,
        actualSleep: existing.actualSleep ?? null,
        deltaMinutes: existing.deltaMinutes ?? null,
        absError: existing.absError ?? null,
        effectiveThreshold: typeof getEffectiveThreshold === 'function' ? parseFloat(getEffectiveThreshold().toFixed(1)) : null,
        sleepDebtBonus: typeof calculateSleepDebtBonus === 'function' ? parseFloat(calculateSleepDebtBonus().toFixed(1)) : null,
        baseThreshold: state.settings.sleepThreshold ?? 14,
        ampHalfLife: state.settings.ampHalfLife ?? 11,
        sleepTarget: state.settings.sleepTarget ?? 8,
        sleepDeficit: Math.max(0, (state.settings.sleepTarget ?? 8) - (state.hoursSleptLastNight ?? 0)),
        status: computeSleepStatus(state.hoursSleptLastNight),
        logicLog: existing.logicLog ?? null,
        source: existing.source || 'live',
        lastUpdated: new Date().toISOString()
    };

    // Store predicted sleep from history entry
    var todayPrediction = getValues(state.history).find(function(h) { return h.date === today; });
    if (todayPrediction && todayPrediction.predictedSleep !== undefined) {
        state.sleepDailyLogs[today].predictedSleep = todayPrediction.predictedSleep;
    }

    // Keep sleepHistory in sync (backward compat for autoPopulateFeedback)
    state.sleepHistory[today] = {
        hoursSlept: state.hoursSleptLastNight,
        wakeTime: state.wakeTime
    };
}

function saveDailyLogicLog() {
    var today = getLocalDateString();
    if (!state.sleepDailyLogs) state.sleepDailyLogs = {};
    if (!state.sleepDailyLogs[today]) saveSleepDayLog();
    if (typeof generateForecastLogic === 'function') {
        state.sleepDailyLogs[today].logicLog = generateForecastLogic();
        state.sleepDailyLogs[today].lastUpdated = new Date().toISOString();
    }
}

// ============================================
// 30-DAY SLEEP PERFORMANCE TRACKING
// ============================================


// ============================================
// ACCURACY TAB — 7 SECTION RENDERERS
// ============================================

function renderAccuracyTab() {
    var container = document.getElementById('accuracyContent');
    if (!container) return;
    var stats = calculateAccuracyStats(9999); // all-time
    var stats30 = calculateAccuracyStats(30);
    renderAccOverallGrade(stats, stats30);
    renderAccMethodology(stats);
    renderAccErrorDistribution(stats);
    renderAccDirectionalBias(stats);
    renderAccContextBreakdowns();
    renderAccDataInventory();
    renderAccInputVerification();
    // Hero hint for overview tab
    renderAccuracyHeroHint(stats30);
}

// Section 1: Overall Grade
function renderAccOverallGrade(stats, stats30) {
    var el = document.getElementById('accOverallGrade');
    if (!el) return;
    var hasEnough = stats.entriesWithFeedback >= 3;
    var avgErr = stats.avgAbsError ?? 0;
    var gradeColor = avgErr <= 30 ? '#5E8A5E' : avgErr <= 60 ? '#C4923A' : '#B85C5C';
    var gradeBg = avgErr <= 30 ? 'rgba(94,138,94,0.1)' : avgErr <= 60 ? 'rgba(196,146,58,0.1)' : 'rgba(184,92,92,0.1)';

    var html = '<div class="acc-hero" style="background:' + gradeBg + ';">';
    html += '<div class="acc-hero__value" style="color:' + gradeColor + ';">' + (hasEnough ? '\u00b1' + avgErr + ' min' : '--') + '</div>';
    html += '<div class="acc-hero__label">' + (hasEnough ? 'Average prediction error' : 'Need 3+ predictions with feedback') + '</div>';
    html += '<div class="acc-hero__sub">Based on ' + stats.entriesWithFeedback + ' predictions with feedback out of ' + stats.totalEntries + ' total days</div>';
    if (hasEnough) {
        html += '<div style="display:flex;justify-content:center;gap:20px;margin-top:10px;font-size:0.82em;">';
        html += '<span>Within 30min: <strong style="color:' + (stats.within30min >= 50 ? '#5E8A5E' : '#C4923A') + ';">' + stats.within30min + '%</strong></span>';
        html += '<span>Within 60min: <strong style="color:' + (stats.within60min >= 70 ? '#5E8A5E' : '#C4923A') + ';">' + stats.within60min + '%</strong></span>';
        html += '</div>';
        if (stats.trend) {
            var trendLabel = stats.trend === 'improving' ? 'Improving &#8593;' : stats.trend === 'worsening' ? 'Worsening &#8595;' : 'Stable &#8596;';
            var trendColor = stats.trend === 'improving' ? '#5E8A5E' : stats.trend === 'worsening' ? '#B85C5C' : '#9C948B';
            html += '<div style="margin-top:6px;font-size:0.78em;color:' + trendColor + ';">Trend: ' + trendLabel + '</div>';
        }
    }
    html += '</div>';
    el.innerHTML = html;
}

// Section 2: Methodology
function renderAccMethodology(stats) {
    var el = document.getElementById('accMethodology');
    if (!el) return;
    var n = stats.entriesWithFeedback;
    var body = '';
    var steps = [
        ['Found <code>' + stats.totalEntries + '</code> total tracked days', 'Filter history for days with saved predictions'],
        ['Matched <code>' + n + '</code> days with both predicted AND actual sleep times', 'Only days where you logged actual sleep count toward accuracy'],
        ['For each: <code>error = actual - predicted</code> (handles midnight crossing)', 'Positive = slept later than predicted, negative = earlier'],
        ['Average absolute error = <code>sum(|errors|) / ' + n + ' = \u00b1' + (stats.avgAbsError ?? '--') + ' min</code>', 'This is the main accuracy number'],
        ['Within 30 min = <code>' + (stats.within30min ?? '--') + '%</code>, Within 60 min = <code>' + (stats.within60min ?? '--') + '%</code>', 'Percentage of predictions within those windows']
    ];
    steps.forEach(function(step, i) {
        body += '<div class="ins-method-step"><div class="ins-method-num">' + (i + 1) + '</div><div class="ins-method-text"><strong>' + step[0] + '</strong><br><span style="color:#9C948B;">' + step[1] + '</span></div></div>';
    });
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'accMethodology\')">' +
        '<span class="ins-section-title">&#128270; How It\'s Calculated</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 3: Error Distribution
function renderAccErrorDistribution(stats) {
    var el = document.getElementById('accErrorDistribution');
    if (!el) return;
    var entries = getValues(state.history).filter(function(e) {
        return e.actualSleep != null && e.predictedSleep != null && !isNaN(e.actualSleep);
    });
    if (entries.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var buckets = [
        { label: '0-15 min', min: 0, max: 15, count: 0 },
        { label: '15-30 min', min: 15, max: 30, count: 0 },
        { label: '30-60 min', min: 30, max: 60, count: 0 },
        { label: '60-90 min', min: 60, max: 90, count: 0 },
        { label: '90+ min', min: 90, max: 9999, count: 0 }
    ];
    entries.forEach(function(e) {
        var absErr = Math.abs(computeSleepDelta(e.predictedSleep, e.actualSleep));
        for (var i = 0; i < buckets.length; i++) {
            if (absErr >= buckets[i].min && absErr < buckets[i].max) { buckets[i].count++; break; }
        }
    });
    var maxCount = Math.max.apply(null, buckets.map(function(b) { return b.count; }));
    var body = '';
    var colors = ['#5E8A5E', '#5E8A5E', '#C4923A', '#B85C5C', '#B85C5C'];
    buckets.forEach(function(b, i) {
        var pct = maxCount > 0 ? Math.round(b.count / maxCount * 100) : 0;
        var pctTotal = entries.length > 0 ? Math.round(b.count / entries.length * 100) : 0;
        body += '<div class="ins-bucket"><span class="ins-bucket__label">' + b.label + '</span><div class="ins-bucket__bar-wrap"><div class="ins-bucket__bar" style="width:' + pct + '%;background:' + colors[i] + ';"></div></div><span class="ins-bucket__value">' + b.count + ' (' + pctTotal + '%)</span></div>';
    });
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'accErrorDistribution\')">' +
        '<span class="ins-section-title">&#128202; Error Distribution</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 4: Directional Bias
function renderAccDirectionalBias(stats) {
    var el = document.getElementById('accDirectionalBias');
    if (!el) return;
    if (!stats || stats.entriesWithFeedback < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var avgError = stats.avgError; // signed
    var biasDir = avgError > 15 ? 'late (predicts too early)' : avgError < -15 ? 'early (predicts too late)' : 'neutral';
    var biasColor = Math.abs(avgError) <= 15 ? '#5E8A5E' : Math.abs(avgError) <= 30 ? '#C4923A' : '#B85C5C';

    var body = '<div class="ins-metric-row"><span class="ins-metric-label">Overall Bias</span><span class="ins-metric-value" style="color:' + biasColor + ';">' + (avgError > 0 ? '+' : '') + avgError + 'min (' + biasDir + ')</span></div>';

    // Bias by dose level
    var entries = getValues(state.history).filter(function(e) {
        return e.actualSleep != null && e.predictedSleep != null && e.inputs;
    });
    var highDose = entries.filter(function(e) { return e.inputs.totalAmpDose >= 40; });
    var lowDose = entries.filter(function(e) { return e.inputs.totalAmpDose > 0 && e.inputs.totalAmpDose < 40; });
    if (highDose.length >= 2) {
        var hdBias = Math.round(highDose.reduce(function(s, e) { return s + computeSleepDelta(e.predictedSleep, e.actualSleep); }, 0) / highDose.length);
        body += '<div class="ins-metric-row"><span class="ins-metric-label">High Dose (40mg+) Bias</span><span class="ins-metric-value">' + (hdBias > 0 ? '+' : '') + hdBias + 'min (' + highDose.length + ')</span></div>';
    }
    if (lowDose.length >= 2) {
        var ldBias = Math.round(lowDose.reduce(function(s, e) { return s + computeSleepDelta(e.predictedSleep, e.actualSleep); }, 0) / lowDose.length);
        body += '<div class="ins-metric-row"><span class="ins-metric-label">Low Dose (<40mg) Bias</span><span class="ins-metric-value">' + (ldBias > 0 ? '+' : '') + ldBias + 'min (' + lowDose.length + ')</span></div>';
    }

    // Recommendation
    if (Math.abs(avgError) > 15) {
        var rec = avgError > 0 ? 'Consider lowering your Sleep Threshold by ' + Math.round(Math.abs(avgError) / 15) + 'mg' : 'Consider raising your Sleep Threshold by ' + Math.round(Math.abs(avgError) / 15) + 'mg';
        body += '<div style="font-size:0.78em;color:#6B7C5E;margin-top:8px;padding:8px;background:rgba(107,124,94,0.08);border-radius:6px;">' + rec + '</div>';
    }
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'accDirectionalBias\')">' +
        '<span class="ins-section-title">&#128269; Directional Bias</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 5: Context Breakdowns (replaces renderCalibrationContexts)
function renderAccContextBreakdowns() {
    var el = document.getElementById('accContextBreakdowns');
    if (!el) return;
    var entries = getValues(state.history).filter(function(e) {
        return e.actualSleep != null && e.predictedSleep != null && e.inputs;
    });
    if (entries.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var contexts = [
        { label: 'High Dose (40mg+)', icon: '&#128138;', filter: function(e) { return e.inputs.totalAmpDose >= 40; } },
        { label: 'Caffeine Days', icon: '&#9749;', filter: function(e) { return e.inputs.totalCaffDose > 0; } },
        { label: 'Low Sleep (<6h)', icon: '&#128564;', filter: function(e) { return e.inputs.hoursSleptLastNight < 6; } },
        { label: 'Workout Days', icon: '&#127947;', filter: function(e) { return e.inputs.hasWorkout; } },
        { label: 'VitC Days', icon: '&#127818;', filter: function(e) { return e.inputs.hasVitC; } },
        { label: 'No Modifiers', icon: '&#10024;', filter: function(e) { return !e.inputs.hasWorkout && !e.inputs.hasSauna && !e.inputs.hasVitC && !e.inputs.allNighterMode; } }
    ];
    var body = '';
    contexts.forEach(function(ctx) {
        var matched = entries.filter(ctx.filter);
        if (matched.length < 2) return;
        var deltas = matched.map(function(e) { return computeSleepDelta(e.predictedSleep, e.actualSleep); });
        var avgDelta = Math.round(deltas.reduce(function(s, d) { return s + d; }, 0) / deltas.length);
        var avgAbs = Math.round(deltas.map(function(d) { return Math.abs(d); }).reduce(function(s, d) { return s + d; }, 0) / deltas.length);
        var biasColor = Math.abs(avgDelta) <= 15 ? '#5E8A5E' : Math.abs(avgDelta) <= 30 ? '#C4923A' : '#B85C5C';
        body += '<div class="ins-metric-row"><span class="ins-metric-label">' + ctx.icon + ' ' + ctx.label + ' (' + matched.length + ')</span><span class="ins-metric-value">\u00b1' + avgAbs + 'min <span style="color:' + biasColor + ';font-size:0.85em;">bias ' + (avgDelta > 0 ? '+' : '') + avgDelta + '</span></span></div>';
    });
    if (!body) body = '<div style="text-align:center;color:#9C948B;padding:12px;">Not enough context data yet.</div>';
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'accContextBreakdowns\')">' +
        '<span class="ins-section-title">&#128203; Context Breakdowns</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 6: Data Inventory
function renderAccDataInventory() {
    var el = document.getElementById('accDataInventory');
    if (!el) return;
    var days = gatherAllDayData();
    var withBoth = days.filter(function(d) { return d.predictedSleep != null && d.actualSleep != null; });
    if (withBoth.length === 0) { el.style.display = 'none'; return; }
    el.style.display = '';

    var rows = withBoth.slice(0, 50).map(function(d) {
        var delta = computeSleepDelta(d.predictedSleep, d.actualSleep);
        var absDelta = Math.abs(delta);
        var deltaColor = absDelta <= 30 ? '#5E8A5E' : absDelta <= 60 ? '#C4923A' : '#B85C5C';
        var dir = delta > 0 ? 'Late' : delta < 0 ? 'Early' : 'Exact';
        var dateObj = parseLocalDate(d.date);
        var dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return '<tr><td>' + dateStr + '</td><td>' + _fmtOnset(d.predictedSleep) + '</td><td>' + _fmtOnset(d.actualSleep) + '</td><td style="color:' + deltaColor + ';">' + (delta > 0 ? '+' : '') + Math.round(delta) + 'min</td><td>' + dir + '</td></tr>';
    }).join('');

    var body = '<div class="ins-table-wrap"><table class="ins-table"><thead><tr><th>Date</th><th>Predicted</th><th>Actual</th><th>Error</th><th>Dir</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    if (withBoth.length > 50) {
        body += '<div style="text-align:center;font-size:0.72em;color:#9C948B;margin-top:6px;">Showing latest 50 of ' + withBoth.length + ' entries</div>';
    }
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'accDataInventory\')">' +
        '<span class="ins-section-title">&#128196; Data Inventory</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 7: Input Verification (today's algorithm inputs)
function renderAccInputVerification() {
    var el = document.getElementById('accInputVerification');
    if (!el) return;
    el.style.display = '';

    var ampLoad = typeof calculateAmpLoad === 'function' ? calculateAmpLoad(getCurrentMinutes()).toFixed(1) : '--';
    var caffLoad = typeof calculateCaffLoad === 'function' ? calculateCaffLoad(getCurrentMinutes()).toFixed(1) : '--';
    var threshold = typeof getEffectiveThreshold === 'function' ? getEffectiveThreshold().toFixed(1) : '--';
    var sleepDebt = typeof calculateSleepDebtBonus === 'function' ? calculateSleepDebtBonus().toFixed(1) : '--';
    var baseThresh = (state.settings.sleepThreshold ?? 14).toString();
    var hoursSlept = state.hoursSleptLastNight ?? '--';
    var wakeTime = state.wakeTime ?? '--';
    var allNighter = state.allNighterMode ? 'Yes' : 'No';
    var meds = getValues(state.medications);
    var caff = getValues(state.caffeine);
    var modifiers = [];
    if (state.modifiers) {
        if (state.modifiers.vitaminC && state.modifiers.vitaminC.active) modifiers.push('VitC');
        if (state.modifiers.sauna && state.modifiers.sauna.active) modifiers.push('Sauna');
    }
    if (state.workoutPlan && state.workoutPlan.applied) modifiers.push('Workout');

    var rows = [
        ['Current Amp Load', ampLoad + 'mg'],
        ['Current Caff Load', caffLoad + 'mg'],
        ['Effective Threshold', threshold + 'mg (base ' + baseThresh + ' + ' + sleepDebt + ' debt)'],
        ['Hours Slept Last Night', hoursSlept + 'h'],
        ['Wake Time', wakeTime],
        ['All-Nighter Mode', allNighter],
        ['Medications Today', meds.length > 0 ? meds.map(function(m) { return m.dose + 'mg @ ' + m.time; }).join(', ') : 'None'],
        ['Caffeine Today', caff.length > 0 ? caff.map(function(c) { return c.amount + 'mg @ ' + c.time; }).join(', ') : 'None'],
        ['Active Modifiers', modifiers.length > 0 ? modifiers.join(', ') : 'None']
    ];
    var body = '<div style="font-size:0.72em;color:#9C948B;margin-bottom:8px;">This is exactly what the prediction algorithm sees right now.</div>';
    body += rows.map(function(r) {
        return '<div class="ins-metric-row"><span class="ins-metric-label">' + r[0] + '</span><span class="ins-metric-value">' + r[1] + '</span></div>';
    }).join('');
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'accInputVerification\')">' +
        '<span class="ins-section-title">&#128269; Input Verification (Now)</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Legacy wrapper — redirects to new accuracy tab
function renderAccuracyDashboard() {
    renderAccuracyTab();
}

function renderAccuracyHeroHint(stats) {
    var el = document.getElementById('accuracyHeroHint');
    if (!el) return;
    if (!stats || stats.entriesWithFeedback < 3) { el.style.display = 'none'; return; }
    var avgErr = stats.avgAbsError;
    var color = avgErr <= 30 ? '#5E8A5E' : avgErr <= 60 ? '#C4923A' : '#B85C5C';
    el.textContent = '';
    var span = document.createElement('span');
    span.style.color = color;
    span.style.fontWeight = '600';
    span.textContent = '\u00b1' + avgErr + ' min';
    el.appendChild(document.createTextNode('Historical accuracy: '));
    el.appendChild(span);
    el.appendChild(document.createTextNode(' (' + stats.entriesWithFeedback + ' days)'));
    el.style.display = 'block';
}

function getSleepDataForDays(numDays) {
    var today = new Date();
    var data = [];

    for (var i = numDays - 1; i >= 0; i--) {
        var date = new Date(today);
        date.setDate(date.getDate() - i);
        var dateStr = getLocalDateString(date);

        // Use unified helper for consistent data across all tabs
        var sleepInfo = getSleepForDate(dateStr);
        var hoursSlept = (sleepInfo && sleepInfo.hoursSlept !== null && sleepInfo.hoursSlept !== undefined) ? sleepInfo.hoursSlept : null;

        data.push({
            date: date,
            dateStr: dateStr,
            hoursSlept: hoursSlept,
            dayLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            isToday: i === 0
        });
    }

    return data;
}

function calculateSleepStats(data) {
    var validData = data.filter(function(d) { return d.hoursSlept !== null; });
    var avg = 0, best = 0, worst = 0;
    if (validData.length > 0) {
        var hours = validData.map(function(d) { return d.hoursSlept; });
        avg = hours.reduce(function(a, b) { return a + b; }, 0) / hours.length;
        best = Math.max.apply(null, hours);
        worst = Math.min.apply(null, hours);
    }

    var last7 = data.slice(-7).filter(function(d) { return d.hoursSlept !== null; });
    var prev7 = data.slice(-14, -7).filter(function(d) { return d.hoursSlept !== null; });

    var trend = '\u2014';
    var trendColor = '#9C948B';
    if (last7.length >= 3 && prev7.length >= 3) {
        var recentAvg = last7.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / last7.length;
        var olderAvg = prev7.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / prev7.length;
        var diff = recentAvg - olderAvg;
        if (diff > 0.3) { trend = '\u2191+' + diff.toFixed(1) + 'h'; trendColor = '#5E8A5E'; }
        else if (diff < -0.3) { trend = '\u2193' + diff.toFixed(1) + 'h'; trendColor = '#B85C5C'; }
        else { trend = '\u2192 Stable'; trendColor = '#5E7A8A'; }
    } else if (last7.length >= 2) {
        var recentAvg2 = last7.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / last7.length;
        trend = recentAvg2.toFixed(1) + 'h avg';
        trendColor = recentAvg2 >= 7 ? '#5E8A5E' : recentAvg2 >= 5.5 ? '#5E7A8A' : '#C4923A';
    }

    var currentStreak = 0, longestStreak = 0, tempStreak = 0;
    for (var i = data.length - 1; i >= 0; i--) {
        if (data[i].hoursSlept !== null && data[i].hoursSlept >= 7) {
            if (i === data.length - 1 || currentStreak > 0) currentStreak++;
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        } else {
            if (currentStreak > 0) break;
            tempStreak = 0;
        }
    }

    var target = state.settings.sleepTarget ?? 8;
    var sleepDebt = 0;
    last7.forEach(function(d) {
        var deficit = target - d.hoursSlept;
        if (deficit > 0) sleepDebt += deficit;
    });

    var weekScore = 0;
    if (last7.length > 0) {
        var avgLast7 = last7.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / last7.length;
        var avgScore = Math.min(70, (avgLast7 / 8) * 70);
        var variance = last7.reduce(function(sum, d) { return sum + Math.pow(d.hoursSlept - avgLast7, 2); }, 0) / last7.length;
        var consistencyScore = Math.max(0, 20 - (Math.sqrt(variance) * 10));
        var streakScore = Math.min(10, currentStreak * 2);
        weekScore = Math.round(avgScore + consistencyScore + streakScore);
    }

    var daysToRecover = sleepDebt > 0 ? Math.ceil(sleepDebt / 1.5) : 0;

    return {
        avg: avg, best: best, worst: worst,
        trend: trend, trendColor: trendColor,
        currentStreak: currentStreak, longestStreak: longestStreak,
        sleepDebt: sleepDebt, weekScore: weekScore,
        daysLogged: validData.length, daysToRecover: daysToRecover,
        last7Avg: last7.length > 0 ? last7.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / last7.length : 0,
        validData: validData
    };
}

function renderSIStatsGrid(stats) {
    var grid = document.getElementById('siStatsGrid');
    if (!grid) return;

    var cards = [
        { key: 'avg', label: '30-Day Avg', value: stats.daysLogged > 0 ? stats.avg.toFixed(1) + 'h' : '--', color: stats.avg >= 7 ? '#5E8A5E' : stats.avg >= 5.5 ? '#5E7A8A' : '#C4923A' },
        { key: 'best', label: 'Best Night', value: stats.daysLogged > 0 ? stats.best.toFixed(1) + 'h' : '--', color: '#6B7C5E' },
        { key: 'worst', label: 'Worst Night', value: stats.daysLogged > 0 ? stats.worst.toFixed(1) + 'h' : '--', color: stats.worst >= 6 ? '#5E7A8A' : stats.worst >= 4 ? '#C4923A' : '#B85C5C' },
        { key: 'trend', label: '7-Day Trend', value: stats.trend, color: stats.trendColor },
        { key: 'streak', label: 'Streak', value: stats.currentStreak > 0 ? stats.currentStreak + '\ud83d\udd25' : '0', color: stats.currentStreak >= 7 ? '#5E8A5E' : stats.currentStreak > 0 ? '#C4923A' : '#C4BCB3' },
        { key: 'debt', label: 'Sleep Debt', value: stats.sleepDebt > 0 ? stats.sleepDebt.toFixed(1) + 'h' : '0h \u2713', color: stats.sleepDebt > 10 ? '#B85C5C' : stats.sleepDebt > 5 ? '#C4923A' : stats.sleepDebt > 0 ? '#B85C5C' : '#5E8A5E' },
        { key: 'score', label: 'Week Score', value: stats.weekScore > 0 ? stats.weekScore : '--', color: stats.weekScore >= 80 ? '#5E8A5E' : stats.weekScore >= 60 ? '#5E7A8A' : stats.weekScore >= 40 ? '#C4923A' : '#B85C5C' },
        { key: 'recovery', label: 'Recovery', value: stats.sleepDebt > 0 ? stats.daysToRecover + ' days' : '\u2713 Clear', color: stats.daysToRecover > 7 ? '#B85C5C' : stats.daysToRecover > 3 ? '#C4923A' : stats.sleepDebt > 0 ? '#9C948B' : '#5E8A5E' }
    ];

    grid.innerHTML = cards.map(function(c) {
        return '<div class="si-stat" onclick="toggleExplainer(\'' + c.key + '\')">' +
            '<div class="si-stat__label">' + c.label + '</div>' +
            '<div class="si-stat__value" style="color:' + c.color + ';">' + c.value + '</div>' +
        '</div>';
    }).join('');
}

function renderSleepPerformance() {
    var data = getSleepDataForDays(30);
    var stats = calculateSleepStats(data);

    // Store data globally for tooltip access
    window.sleepGraphData = data;

    // Render stat cards dynamically
    renderSIStatsGrid(stats);

    // Store stats globally for explainer
    window.sleepStats = stats;

    // Render Achievements
    renderSleepAchievements(data, stats.validData, stats.currentStreak, stats.longestStreak, stats.weekScore, stats.sleepDebt, stats.avg);

    // Draw graph
    drawSleepPerformanceGraph(data);

    // Setup tooltip hover
    setupSleepGraphTooltip(data, stats.avg);

    // Render history list
    renderSleepHistoryList(data);
}

// ============================================
// DASHBOARD FULL SLEEP HISTORY (scrollable + stat chips)
// ============================================

function renderDashSleepHistoryFull() {
    var canvas = document.getElementById('sleepHistoryGraphDash');
    if (!canvas) return;

    // Find date range — first tracked day to today
    var allDates = [];
    if (state.sleepHistory) Object.keys(state.sleepHistory).forEach(function(k) { allDates.push(k); });
    if (state.sleepDailyLogs) Object.keys(state.sleepDailyLogs).forEach(function(k) {
        if (allDates.indexOf(k) === -1) allDates.push(k);
    });
    allDates.sort();

    var numDays = 30;
    if (allDates.length > 0) {
        var parts = allDates[0].split('-').map(Number);
        var startDate = new Date(parts[0], parts[1] - 1, parts[2]);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        numDays = Math.max(30, Math.ceil((today - startDate) / 86400000) + 1);
    }

    var data = getSleepDataForDays(numDays);

    // Set canvas width for scrolling — 20px per day minimum, or container width
    var scrollContainer = canvas.parentElement;
    var containerWidth = scrollContainer ? scrollContainer.clientWidth - 16 : 600;
    var pxPerDay = 20;
    var canvasWidth = Math.max(containerWidth, numDays * pxPerDay);
    canvas.style.width = canvasWidth + 'px';

    // Draw graph
    _drawSleepGraphToCanvas('sleepHistoryGraphDash', data);

    // Auto-scroll to right (most recent)
    if (scrollContainer) {
        setTimeout(function() { scrollContainer.scrollLeft = scrollContainer.scrollWidth; }, 50);
    }

    // Setup tooltip
    var validData = data.filter(function(d) { return d.hoursSlept !== null; });
    var avgVal = validData.length > 0 ? validData.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / validData.length : 0;
    _setupSleepTooltipForCanvas('sleepHistoryGraphDash', 'sleepHistoryTooltipDash', 'tooltipDateDash', 'tooltipHoursDash', 'tooltipStatusDash', 'tooltipVsAvgDash', data, avgVal);

    // Render stat chips
    renderSleepStatChips(data);
}

function renderSleepStatChips(allData) {
    var container = document.getElementById('sleepHistStatChips');
    if (!container) return;

    var target = state.settings.sleepTarget ?? 8;

    function avgForDays(n) {
        var subset = allData.slice(-n).filter(function(d) { return d.hoursSlept !== null; });
        if (subset.length === 0) return null;
        return subset.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / subset.length;
    }

    function allNightersForDays(n) {
        return allData.slice(-n).filter(function(d) { return d.hoursSlept !== null && d.hoursSlept < 4; }).length;
    }

    // Current sleep debt (last 7 days cumulative deficit)
    var last7 = allData.slice(-7).filter(function(d) { return d.hoursSlept !== null; });
    var sleepDebt = 0;
    last7.forEach(function(d) {
        var deficit = target - d.hoursSlept;
        if (deficit > 0) sleepDebt += deficit;
    });

    // Recovery hours needed to clear debt
    var recoveryHrs = sleepDebt > 0 ? sleepDebt : 0;

    var chips = [
        { label: '7d Avg', value: avgForDays(7), fmt: 'hours' },
        { label: '15d Avg', value: avgForDays(15), fmt: 'hours' },
        { label: '30d Avg', value: avgForDays(30), fmt: 'hours' },
        { label: '60d Avg', value: avgForDays(60), fmt: 'hours' },
        { label: '14d All-Nighters', value: allNightersForDays(14), fmt: 'count' },
        { label: '30d All-Nighters', value: allNightersForDays(30), fmt: 'count' },
        { label: 'Sleep Debt', value: sleepDebt, fmt: 'debt' },
        { label: 'Recovery Needed', value: recoveryHrs, fmt: 'recovery' }
    ];

    // Build chips with safe DOM methods — all values are computed numbers, not user text
    container.textContent = '';
    chips.forEach(function(c) {
        var display, color;
        if (c.fmt === 'hours') {
            if (c.value === null) { display = '--'; color = '#9C948B'; }
            else {
                display = c.value.toFixed(1) + 'h';
                color = c.value >= 7 ? '#5E8A5E' : c.value >= 5.5 ? '#C4923A' : '#B85C5C';
            }
        } else if (c.fmt === 'count') {
            display = String(c.value);
            color = c.value === 0 ? '#5E8A5E' : c.value <= 2 ? '#C4923A' : '#B85C5C';
        } else if (c.fmt === 'debt') {
            display = c.value > 0 ? c.value.toFixed(1) + 'h' : '0h \u2713';
            color = c.value > 10 ? '#B85C5C' : c.value > 5 ? '#C4923A' : c.value > 0 ? '#C4923A' : '#5E8A5E';
        } else if (c.fmt === 'recovery') {
            display = c.value > 0 ? c.value.toFixed(1) + 'h' : '\u2713 Clear';
            color = c.value > 10 ? '#B85C5C' : c.value > 5 ? '#C4923A' : c.value > 0 ? '#9C948B' : '#5E8A5E';
        }

        var chip = document.createElement('div');
        chip.className = 'sc-sleep-stat-chip';

        var labelEl = document.createElement('div');
        labelEl.className = 'sc-sleep-stat-chip__label';
        labelEl.textContent = c.label;
        chip.appendChild(labelEl);

        var valueEl = document.createElement('div');
        valueEl.className = 'sc-sleep-stat-chip__value';
        valueEl.style.color = color;
        valueEl.textContent = display;
        chip.appendChild(valueEl);

        container.appendChild(chip);
    });
}

// Explainer content for stats and achievements
var explainerContent = {
    avg: { icon: '📊', title: '30-Day Average Sleep', getDesc: function(s) { return 'Your average sleep over the last 30 days is ' + s.avg.toFixed(1) + ' hours per night. The recommended amount for adults is 7-9 hours. ' + (s.avg >= 7 ? '✓ You\'re meeting the minimum!' : 'You\'re ' + (7 - s.avg).toFixed(1) + 'h below the minimum recommendation.'); }, getAction: function(s) { return s.avg >= 7 ? 'Keep it up! Consistency is key.' : 'Try to add 30 minutes to your sleep each night.'; } },
    best: { icon: '🌙', title: 'Best Night (30 Days)', getDesc: function(s) { return 'Your longest sleep in the past 30 days was ' + s.best.toFixed(1) + ' hours. This shows your recovery potential when you prioritize rest.'; }, getAction: function(s) { return s.best >= 9 ? 'Great recovery capacity! Use this on weekends.' : 'Try for a 9+ hour recovery night when you can.'; } },
    worst: { icon: '⚠️', title: 'Worst Night (30 Days)', getDesc: function(s) { return 'Your shortest sleep was ' + s.worst.toFixed(1) + ' hours. ' + (s.worst === 0 ? '🚫 This was an all-nighter! Complete sleep deprivation causes severe cognitive impairment equivalent to being legally drunk.' : s.worst < 4 ? 'This is in the dangerous zone - cognitive function drops ~40% below 4 hours.' : s.worst < 6 ? 'This is functional but accumulates sleep debt.' : 'Not too bad, but try to avoid going below 6 hours.'); }, getAction: function(s) { return s.worst === 0 ? 'All-nighters require 2-3 full recovery nights (9+ hours) to clear.' : 'Even one bad night takes 2-3 good nights to fully recover from.'; } },
    trend: { icon: '📈', title: '7-Day Trend', getDesc: function(s) { return 'Compares your last 7 days average to the previous 7 days. This shows if your sleep is improving, declining, or stable over time.'; }, getAction: function(s) { return 'A positive trend means your habits are working. Keep going!'; } },
    streak: { icon: '🔥', title: 'Good Night Streak', getDesc: function(s) { return 'Current streak: ' + s.currentStreak + ' consecutive nights of 7+ hours. ' + (s.currentStreak > 0 ? 'You\'ve maintained good sleep for ' + s.currentStreak + ' night' + (s.currentStreak > 1 ? 's' : '') + ' in a row!' : 'Start building your streak by getting 7+ hours tonight.') + ' Your longest streak ever: ' + s.longestStreak + ' nights.'; }, getAction: function(s) { return s.currentStreak >= 7 ? '🎉 Amazing! A full week of good sleep!' : 'Get 7+ hours tonight to ' + (s.currentStreak > 0 ? 'extend your streak!' : 'start a new streak!'); } },
    debt: { icon: '💤', title: 'Sleep Debt (Last 7 Days)', getDesc: function(s) { return 'Sleep debt is the cumulative hours below 8h over the past week. Your current debt: ' + s.sleepDebt.toFixed(1) + 'h. ' + (s.sleepDebt === 0 ? '✓ You\'re fully recovered!' : s.sleepDebt > 10 ? '🚨 High debt - expect reduced focus, mood issues, and slower reactions.' : s.sleepDebt > 5 ? '⚠️ Moderate debt - you may feel tired in the afternoon.' : 'Mild debt - a couple good nights will clear this.'); }, getAction: function(s) { return s.sleepDebt > 0 ? 'To clear this debt, get 9+ hours for the next ' + Math.ceil(s.sleepDebt / 1.5) + ' nights.' : 'Maintain 7-8h nightly to stay debt-free!'; } },
    score: { icon: '🎯', title: 'Weekly Sleep Score (0-100)', getDesc: function(s) { return 'Your score: ' + s.weekScore + '/100. Calculated from: Average hours (70 pts max) + Consistency bonus (20 pts) + Streak bonus (10 pts). ' + (s.weekScore >= 80 ? '🏆 Excellent!' : s.weekScore >= 60 ? '👍 Good, room to improve.' : s.weekScore >= 40 ? '⚠️ Needs work.' : '🚨 Critical - prioritize sleep.'); }, getAction: function(s) { if (s.weekScore >= 80) return 'You\'re in the top tier! Maintain this level.'; if (s.weekScore >= 60) return 'Boost your score: more consistency + longer streaks.'; return 'Focus on getting 7+ hours consistently to improve.'; } },
    recovery: { icon: '⏱️', title: 'Days to Full Recovery', getDesc: function(s) { return s.sleepDebt > 0 ? 'Based on your ' + s.sleepDebt.toFixed(1) + 'h sleep debt, sleeping 9.5h/night (1.5h extra) would clear your debt in ' + s.daysToRecover + ' days. Sleep debt compounds interest-free, but clearing it takes consistent effort.' : '✓ No recovery needed! You\'re fully rested. Maintain your current habits to stay debt-free.'; }, getAction: function(s) { return s.sleepDebt > 0 ? 'Tonight\'s goal: Get at least 9 hours to start recovering.' : 'Keep getting 7-8 hours to maintain your clear status!'; } },
    first_log: { icon: '📝', title: 'Achievement: First Log', getDesc: function(s) { return s.daysLogged >= 1 ? '✓ UNLOCKED! You\'ve logged ' + s.daysLogged + ' days of sleep data. The journey of a thousand miles begins with a single step.' : 'Log your first night of sleep to unlock this achievement.'; }, getAction: function(s) { return s.daysLogged >= 1 ? 'Keep logging daily to unlock more achievements!' : 'Enter your sleep hours above to get started.'; } },
    week_warrior: { icon: '📅', title: 'Achievement: Week Warrior', getDesc: function(s) { return s.daysLogged >= 7 ? '✓ UNLOCKED! You\'ve logged ' + s.daysLogged + ' days. A full week of tracking gives meaningful insights into your patterns.' : 'Log ' + (7 - s.daysLogged) + ' more days to unlock. Current: ' + s.daysLogged + '/7 days.'; }, getAction: function(s) { return s.daysLogged >= 7 ? 'You\'re building a habit! Next goal: Month Master.' : 'Keep logging daily - you\'re almost there!'; } },
    month_master: { icon: '🗓️', title: 'Achievement: Month Master', getDesc: function(s) { return s.daysLogged >= 30 ? '✓ UNLOCKED! You\'ve logged ' + s.daysLogged + ' days - a full month! You now have meaningful trend data.' : 'Log ' + (30 - s.daysLogged) + ' more days to unlock. Current: ' + s.daysLogged + '/30 days.'; }, getAction: function(s) { return s.daysLogged >= 30 ? 'Amazing commitment! Your data is now statistically significant.' : 'Consistency is key - keep logging every day!'; } },
    streak_3: { icon: '🔥', title: 'Achievement: 3-Day Streak', getDesc: function(s) { return s.longestStreak >= 3 ? '✓ UNLOCKED! You\'ve achieved ' + s.longestStreak + ' consecutive nights of 7+ hours sleep.' : 'Get 7+ hours for 3 nights in a row. Current best streak: ' + s.longestStreak + '. ' + (3 - s.currentStreak > 0 ? 'Need ' + (3 - s.currentStreak) + ' more nights.' : ''); }, getAction: function(s) { return s.longestStreak >= 3 ? 'Proven you can do it! Now aim for 7-Day Streak.' : 'Each 7+ hour night adds to your streak. Tonight counts!'; } },
    streak_7: { icon: '⚡', title: 'Achievement: Week Streak', getDesc: function(s) { return s.longestStreak >= 7 ? '✓ UNLOCKED! You\'ve achieved ' + s.longestStreak + ' consecutive nights of optimal sleep. This is elite-level consistency.' : 'Get 7+ hours for 7 nights in a row. Current best: ' + s.longestStreak + '. Need ' + (7 - s.longestStreak) + ' more consecutive nights.'; }, getAction: function(s) { return s.longestStreak >= 7 ? 'You\'ve proven you can sustain healthy sleep for a full week!' : 'This is the gold standard. Keep building that streak!'; } },
    debt_free: { icon: '💎', title: 'Achievement: Debt Free', getDesc: function(s) { return s.sleepDebt === 0 && s.daysLogged >= 7 ? '✓ UNLOCKED! Zero sleep debt with 7+ days tracked. Your body and mind are operating at full capacity.' : 'Clear your sleep debt to unlock. Current debt: ' + s.sleepDebt.toFixed(1) + 'h. ' + (s.daysLogged < 7 ? 'Also need ' + (7 - s.daysLogged) + ' more days logged.' : ''); }, getAction: function(s) { return s.sleepDebt === 0 ? 'This is the optimal state! Maintain it.' : 'Get 9+ hours for ' + Math.ceil(s.sleepDebt / 1.5) + ' nights to clear debt.'; } },
    perfect_night: { icon: '🌟', title: 'Achievement: Perfect Night', getDesc: function(s) { return s.best >= 8 ? '✓ UNLOCKED! You\'ve logged ' + s.best.toFixed(1) + 'h - a full 8+ hour night of sleep.' : 'Log a night with 8+ hours of sleep. Your current best: ' + s.best.toFixed(1) + 'h. Need ' + (8 - s.best).toFixed(1) + 'h more.'; }, getAction: function(s) { return s.best >= 8 ? 'You know what a full night feels like. Chase that feeling!' : 'Tonight, aim for 8 hours. You\'re so close!'; } },
    recovery_king: { icon: '👑', title: 'Achievement: Recovery King', getDesc: function(s) { return s.best >= 10 ? '✓ UNLOCKED! You\'ve logged ' + s.best.toFixed(1) + 'h - a massive recovery sleep! This shows you prioritize rest when needed.' : 'Log a 10+ hour recovery night. Your current best: ' + s.best.toFixed(1) + 'h. These mega-sleeps are essential for clearing big deficits.'; }, getAction: function(s) { return s.best >= 10 ? 'Use these recovery nights strategically after hard weeks.' : 'Try a weekend recovery sleep - go to bed early, sleep in late.'; } },
    score_80: { icon: '🏆', title: 'Achievement: A+ Student', getDesc: function(s) { return s.weekScore >= 80 ? '✓ UNLOCKED! Week score of ' + s.weekScore + '/100. You\'re in the top tier of sleep optimization.' : 'Achieve a weekly score of 80+. Current: ' + s.weekScore + '. Need ' + (80 - s.weekScore) + ' more points. Score = Avg (70 max) + Consistency (20 max) + Streak (10 max).'; }, getAction: function(s) { return s.weekScore >= 80 ? 'Elite status! This is where cognitive performance peaks.' : 'Focus on consistency (same bedtime) and building your streak.'; } },
    consistent: { icon: '🎯', title: 'Achievement: Consistent', getDesc: function(s) { return s.avg >= 7 && s.daysLogged >= 7 ? '✓ UNLOCKED! 30-day average of ' + s.avg.toFixed(1) + 'h with 7+ days tracked. Consistency beats intensity.' : 'Maintain 7+ hour average over 30 days. Current: ' + s.avg.toFixed(1) + 'h avg, ' + s.daysLogged + ' days logged. ' + (s.avg < 7 ? 'Need +' + (7 - s.avg).toFixed(1) + 'h/night avg.' : 'Keep logging!'); }, getAction: function(s) { return s.avg >= 7 ? 'The most important achievement - you\'ve built sustainable habits!' : 'Small consistent improvements compound over time.'; } }
};

var activeExplainerKey = null;

function toggleExplainer(key) {
    var explainer = document.getElementById('sleepExplainer');
    var content = explainerContent[key];
    var stats = window.sleepStats || { avg: 0, best: 0, worst: 0, currentStreak: 0, longestStreak: 0, sleepDebt: 0, weekScore: 0, daysLogged: 0, daysToRecover: 0 };

    if (!explainer || !content) return;

    // Toggle off if tapping same key
    if (activeExplainerKey === key && explainer.classList.contains('show')) {
        explainer.classList.remove('show');
        activeExplainerKey = null;
        return;
    }

    document.getElementById('explainerIcon').textContent = content.icon;
    document.getElementById('explainerTitle').textContent = content.title;
    document.getElementById('explainerDesc').textContent = content.getDesc(stats);
    document.getElementById('explainerAction').textContent = '\ud83d\udca1 ' + content.getAction(stats);

    explainer.classList.add('show');
    activeExplainerKey = key;
}

// Legacy compat for achievement hover
function showExplainer(key) { toggleExplainer(key); }
function hideExplainer() {}

function renderSleepAchievements(data, validData, currentStreak, longestStreak, weekScore, sleepDebt, avg) {
    const container = document.getElementById('sleepAchievements');
    if (!container) return;

    const best = validData.length > 0 ? Math.max(...validData.map(d => d.hoursSlept)) : 0;

    const achievements = [
        { id: 'first_log', icon: '📝', name: 'First Log', unlocked: validData.length >= 1, color: '#5E7A8A' },
        { id: 'week_warrior', icon: '📅', name: 'Week Warrior', unlocked: validData.length >= 7, color: '#6B7C5E' },
        { id: 'month_master', icon: '🗓️', name: 'Month Master', unlocked: validData.length >= 30, color: '#C4923A' },
        { id: 'streak_3', icon: '🔥', name: '3-Day Streak', unlocked: longestStreak >= 3, color: '#B85C5C' },
        { id: 'streak_7', icon: '⚡', name: 'Week Streak', unlocked: longestStreak >= 7, color: '#C4923A' },
        { id: 'debt_free', icon: '💎', name: 'Debt Free', unlocked: sleepDebt === 0 && validData.length >= 7, color: '#5E7A8A' },
        { id: 'perfect_night', icon: '🌟', name: 'Perfect Night', unlocked: best >= 8, color: '#5E8A5E' },
        { id: 'recovery_king', icon: '👑', name: 'Recovery King', unlocked: best >= 10, color: '#B85C5C' },
        { id: 'score_80', icon: '🏆', name: 'A+ Student', unlocked: weekScore >= 80, color: '#5E8A5E' },
        { id: 'consistent', icon: '🎯', name: 'Consistent', unlocked: avg >= 7 && validData.length >= 7, color: '#6B7C5E' }
    ];

    container.innerHTML = achievements.map(function(a) {
        return '<div class="si-badge' + (a.unlocked ? '' : ' si-badge--locked') + '" onclick="toggleExplainer(\'' + a.id + '\')" style="' +
            'background:' + (a.unlocked ? 'rgba(' + hexToRgb(a.color) + ', 0.15)' : '#EFECE6') + ';' +
            'border-color:' + (a.unlocked ? a.color : 'rgba(0,0,0,0.08)') + ';">' +
            '<div class="si-badge__icon"' + (a.unlocked ? '' : ' style="filter:grayscale(100%);"') + '>' + a.icon + '</div>' +
            '<div class="si-badge__name" style="color:' + (a.unlocked ? a.color : '#C4BCB3') + ';">' + a.name + '</div>' +
        '</div>';
    }).join('');
}

function renderSleepHistoryList(data) {
    const container = document.getElementById('sleepHistoryList');
    if (!container) return;

    // Reverse to show newest first
    const reversed = [...data].reverse();

    container.innerHTML = reversed.map(function(d) {
        var hasData = d.hoursSlept !== null;
        var statusClass = !hasData ? '' : d.hoursSlept >= 7 ? 'green' : d.hoursSlept >= 5.5 ? 'blue' : d.hoursSlept >= 4.5 ? 'yellow' : 'red';
        var textColor = !hasData ? '#9C948B' : d.hoursSlept >= 7 ? '#5E8A5E' : d.hoursSlept >= 5.5 ? '#5E7A8A' : d.hoursSlept >= 4.5 ? '#C4923A' : '#B85C5C';
        var statusIcon = !hasData ? '\u2014' : d.hoursSlept >= 7 ? '\u2713' : d.hoursSlept >= 5.5 ? '\u25cb' : d.hoursSlept >= 4.5 ? '\u26a0\ufe0f' : '\ud83d\udea8';

        return '<div class="si-history-row' + (statusClass ? ' si-history-row--' + statusClass : '') + (d.isToday ? ' si-history-row--today' : '') + '" onclick="openSleepEditModal(\'' + d.dateStr + '\')">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<div style="font-size:1.2em;">' + statusIcon + '</div>' +
                '<div>' +
                    '<div style="font-weight:600;color:#2C2825;font-size:0.9em;">' + d.dayName + ', ' + d.dayLabel +
                        (d.isToday ? ' <span style="color:#6B7C5E;font-size:0.75em;margin-left:8px;">TODAY</span>' : '') +
                    '</div>' +
                    (hasData ? '<div style="font-size:0.8em;color:#6B635B;">' + d.hoursSlept.toFixed(1) + ' hours of sleep</div>' :
                               '<div style="font-size:0.8em;color:#9C948B;">No data logged</div>') +
                '</div>' +
            '</div>' +
            '<div style="font-size:1.3em;font-weight:700;color:' + textColor + ';">' + (hasData ? d.hoursSlept.toFixed(1) + 'h' : '\u2014') + '</div>' +
        '</div>';
    }).join('');
}

// ============================================
// MONTH CALENDAR VIEW
// ============================================

function navigateCalendar(delta) {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
    renderSleepCalendarMonth();
}

function renderSleepCalendarMonth() {
    var daysContainer = document.getElementById('sleepCalendarDays');
    var labelEl = document.getElementById('sleepCalendarMonthLabel');
    if (!daysContainer) return;

    var year = calendarViewDate.getFullYear();
    var month = calendarViewDate.getMonth();
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (labelEl) labelEl.textContent = monthNames[month] + ' ' + year;

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayStr = getLocalDateString();

    var html = '';
    for (var i = 0; i < firstDay; i++) {
        html += '<div class="sleep-cal-day empty"></div>';
    }

    for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        var sleepData = getSleepForDate(dateStr);
        var hoursSlept = (sleepData && sleepData.hoursSlept !== null && sleepData.hoursSlept !== undefined) ? sleepData.hoursSlept : null;

        var status = computeSleepStatus(hoursSlept);
        var isToday = dateStr === todayStr;
        var isFuture = dateStr > todayStr;

        if (isFuture) {
            html += '<div class="sleep-cal-day empty"><span class="cal-day-num" style="color:#C4BCB3;">' + d + '</span></div>';
        } else {
            html += '<div class="sleep-cal-day ' + status + (isToday ? ' today' : '') + '" onclick="showSleepDayDetails(\'' + dateStr + '\')">' +
                '<span class="cal-day-num">' + d + '</span>' +
                (hoursSlept !== null ? '<span class="cal-day-hours">' + hoursSlept.toFixed(1) + 'h</span>' : '') +
                '</div>';
        }
    }

    daysContainer.innerHTML = html;
    renderCalendarLegend();
    renderCalendarMonthStats(year, month, daysInMonth, todayStr);
}

function renderCalendarLegend() {
    var el = document.getElementById('sleepCalendarLegend');
    if (!el) return;
    var items = [
        { cls: 'great', label: '8h+' },
        { cls: 'good', label: '7-8h' },
        { cls: 'ok', label: '5.5-7h' },
        { cls: 'poor', label: '4-5.5h' },
        { cls: 'critical', label: '<4h' },
        { cls: 'allnighter', label: '0h' },
        { cls: 'no_data', label: 'No data' }
    ];
    el.innerHTML = items.map(function(item) {
        return '<span style="display:inline-flex;align-items:center;gap:4px;"><span class="sleep-cal-day ' + item.cls + '" style="width:12px;height:12px;aspect-ratio:auto;border-radius:3px;cursor:default;font-size:0;"></span>' + item.label + '</span>';
    }).join('');
}

function renderCalendarMonthStats(year, month, daysInMonth, todayStr) {
    var el = document.getElementById('sleepCalendarStats');
    if (!el) return;

    var totalHours = 0;
    var daysWithData = 0;
    var statusCounts = { great: 0, good: 0, ok: 0, poor: 0, critical: 0, allnighter: 0 };

    for (var d = 1; d <= daysInMonth; d++) {
        var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        if (dateStr > todayStr) break;

        var sleepData = getSleepForDate(dateStr);
        var hoursSlept = (sleepData && sleepData.hoursSlept !== null && sleepData.hoursSlept !== undefined) ? sleepData.hoursSlept : null;

        if (hoursSlept !== null) {
            totalHours += hoursSlept;
            daysWithData++;
            var st = computeSleepStatus(hoursSlept);
            if (statusCounts[st] !== undefined) statusCounts[st]++;
        }
    }

    if (daysWithData === 0) {
        el.innerHTML = '<div style="text-align:center;color:#9C948B;font-size:0.85em;padding:8px;">No sleep data for this month.</div>';
        return;
    }

    var avg = totalHours / daysWithData;
    var avgColor = avg >= 7 ? '#5E8A5E' : avg >= 5.5 ? '#C4923A' : '#B85C5C';

    el.innerHTML = '<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size:0.82em;color:#6B635B;padding:8px 0;">' +
        '<span>Avg: <strong style="color:' + avgColor + ';">' + avg.toFixed(1) + 'h</strong></span>' +
        '<span>Days tracked: <strong style="color:#2C2825;">' + daysWithData + '</strong></span>' +
        (statusCounts.great > 0 ? '<span style="color:#5E8A5E;">' + statusCounts.great + ' great</span>' : '') +
        (statusCounts.good > 0 ? '<span style="color:#5E7A8A;">' + statusCounts.good + ' good</span>' : '') +
        ((statusCounts.poor + statusCounts.critical + statusCounts.allnighter) > 0 ? '<span style="color:#B85C5C;">' + (statusCounts.poor + statusCounts.critical + statusCounts.allnighter) + ' poor</span>' : '') +
        '</div>';
}

// ============================================
// DAY DETAILS MODAL
// ============================================

function showSleepDayDetails(dateStr) {
    var modal = document.getElementById('sleepDayDetailModal');
    var titleEl = document.getElementById('dayDetailTitle');
    var bodyEl = document.getElementById('dayDetailBody');
    if (!modal || !bodyEl) return;

    var date = parseLocalDate(dateStr);
    if (!date) return;
    var displayDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    if (titleEl) titleEl.textContent = displayDate;

    var dailyLog = state.sleepDailyLogs ? state.sleepDailyLogs[dateStr] : null;
    var predictionEntry = getValues(state.history).find(function(h) { return h.date === dateStr; });

    // Use unified helper for consistent hours/wakeTime
    var sleepData = getSleepForDate(dateStr);
    var hoursSlept = sleepData ? (sleepData.hoursSlept ?? null) : null;
    var wakeTime = sleepData ? (sleepData.wakeTime ?? null) : null;

    var status = computeSleepStatus(hoursSlept);
    var statusColors = {
        great: '#5E8A5E', good: '#5E7A8A', ok: '#C4923A', poor: '#B85C5C',
        critical: '#994444', allnighter: '#7A3B3B', no_data: '#9C948B'
    };
    var statusLabels = {
        great: '8h+ Great', good: '7-8h Good', ok: '5.5-7h OK', poor: '4-5.5h Poor',
        critical: '<4h Critical', allnighter: 'All-Nighter', no_data: 'No Data'
    };
    var statusColor = statusColors[status] || '#9C948B';

    var html = '';

    // Status badge
    html += '<div style="text-align:center;padding:12px;margin-bottom:12px;border-radius:10px;background:rgba(' + hexToRgb(statusColor) + ',0.15);border:1px solid ' + statusColor + ';">';
    html += '<div style="font-size:2em;font-weight:700;color:' + statusColor + ';">' + (hoursSlept !== null ? hoursSlept.toFixed(1) + 'h' : '--') + '</div>';
    html += '<div style="font-size:0.85em;color:' + statusColor + ';">' + statusLabels[status] + '</div>';
    if (wakeTime) html += '<div style="font-size:0.8em;color:#6B635B;margin-top:4px;">Wake: ' + formatTime12(wakeTime) + '</div>';
    html += '</div>';

    // Prediction accuracy
    if (predictionEntry) {
        var predDisplay = predictionEntry.predictedSleep !== null && predictionEntry.predictedSleep !== undefined
            ? formatTime12(minutesToTime(predictionEntry.predictedSleep > 24*60 ? predictionEntry.predictedSleep - 24*60 : predictionEntry.predictedSleep))
            : '--';
        html += '<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:rgba(107,124,94,0.08);border:1px solid rgba(107,124,94,0.15);">';
        html += '<div style="font-size:0.78em;color:#6B7C5E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Prediction</div>';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="color:#2C2825;">Predicted: <strong>' + predDisplay + '</strong></span>';
        if (predictionEntry.actualSleep !== null && predictionEntry.actualSleep !== undefined && !isNaN(predictionEntry.actualSleep)) {
            var actualDisplay = formatTime12(minutesToTime(predictionEntry.actualSleep > 1440 ? predictionEntry.actualSleep - 1440 : predictionEntry.actualSleep));
            var delta = computeSleepDelta(predictionEntry.predictedSleep, predictionEntry.actualSleep);
            var absDelta = Math.abs(Math.round(delta));
            var deltaColor = absDelta <= 30 ? '#5E8A5E' : absDelta <= 60 ? '#C4923A' : '#B85C5C';
            var deltaDir = delta > 0 ? 'late' : 'early';
            html += '<span style="color:' + deltaColor + ';font-weight:600;">' + absDelta + 'min ' + deltaDir + '</span>';
            html += '</div>';
            html += '<div style="font-size:0.85em;color:#6B635B;margin-top:4px;">Actual sleep onset: ' + actualDisplay + '</div>';
        } else {
            html += '<span style="color:#9C948B;font-size:0.85em;">Awaiting feedback</span>';
            html += '</div>';
        }
        html += '</div>';
    }

    // Medications and Caffeine (from daily log)
    if (dailyLog) {
        if (dailyLog.medications && dailyLog.medications.length > 0) {
            html += '<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:#EFECE6;">';
            html += '<div style="font-size:0.78em;color:#6B7C5E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Medications</div>';
            dailyLog.medications.forEach(function(m) {
                html += '<div style="font-size:0.85em;color:#2C2825;margin-bottom:2px;">' + escapeHtml(m.dose + 'mg at ' + (m.time || '--')) + '</div>';
            });
            if (dailyLog.totalAmpDose) html += '<div style="font-size:0.8em;color:#9C948B;margin-top:4px;">Total: ' + dailyLog.totalAmpDose + 'mg</div>';
            html += '</div>';
        }
        if (dailyLog.caffeine && dailyLog.caffeine.length > 0) {
            html += '<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:#EFECE6;">';
            html += '<div style="font-size:0.78em;color:#C4923A;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Caffeine</div>';
            dailyLog.caffeine.forEach(function(c) {
                html += '<div style="font-size:0.85em;color:#2C2825;margin-bottom:2px;">' + escapeHtml((c.amount || 0) + 'mg ' + (c.name || '') + ' at ' + (c.time || '--')) + '</div>';
            });
            if (dailyLog.totalCaffDose) html += '<div style="font-size:0.8em;color:#9C948B;margin-top:4px;">Total: ' + dailyLog.totalCaffDose + 'mg</div>';
            html += '</div>';
        }

        // Modifiers
        var mods = [];
        if (dailyLog.hadVitC) mods.push('Vitamin C');
        if (dailyLog.hadWorkout) mods.push('Workout');
        if (dailyLog.hadSauna) mods.push('Sauna');
        if (dailyLog.allNighterMode) mods.push('All-Nighter');
        if (mods.length > 0) {
            html += '<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:#EFECE6;">';
            html += '<div style="font-size:0.78em;color:#5E8A5E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Modifiers</div>';
            html += '<div style="font-size:0.85em;color:#2C2825;">' + mods.join(' &middot; ') + '</div>';
            html += '</div>';
        }

        // Parameters
        if (dailyLog.effectiveThreshold || dailyLog.sleepDebtBonus || dailyLog.ampHalfLife) {
            html += '<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:#EFECE6;">';
            html += '<div style="font-size:0.78em;color:#5E7A8A;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Parameters</div>';
            if (dailyLog.effectiveThreshold) html += '<div style="font-size:0.82em;color:#6B635B;">Threshold: ' + dailyLog.effectiveThreshold + 'mg</div>';
            if (dailyLog.sleepDebtBonus) html += '<div style="font-size:0.82em;color:#6B635B;">Sleep debt bonus: +' + dailyLog.sleepDebtBonus + 'mg</div>';
            if (dailyLog.ampHalfLife) html += '<div style="font-size:0.82em;color:#6B635B;">Amp half-life: ' + dailyLog.ampHalfLife + 'h</div>';
            html += '</div>';
        }

        // Logic log (collapsible)
        if (dailyLog.logicLog) {
            html += '<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:#EFECE6;">';
            html += '<div style="font-size:0.78em;color:#6B7C5E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'">Forecast Logic (tap to toggle)</div>';
            html += '<pre style="display:none;font-size:0.72em;color:#6B635B;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto;margin:0;">' + escapeHtml(dailyLog.logicLog) + '</pre>';
            html += '</div>';
        }
    } else if (hoursSlept === null) {
        html += '<div style="text-align:center;padding:16px;color:#9C948B;font-size:0.9em;">No data logged for this day.</div>';
    }

    // Edit button
    html += '<div style="text-align:center;margin-top:12px;">';
    html += '<button onclick="closeSleepDayDetailModal(); openSleepEditModal(\'' + dateStr + '\')" style="padding:10px 24px;background:rgba(107,124,94,0.15);border:1px solid rgba(107,124,94,0.25);border-radius:8px;color:#6B7C5E;font-weight:600;cursor:pointer;">Edit Sleep Data</button>';
    html += '</div>';

    bodyEl.innerHTML = html;
    modal.classList.add('show');
}

function closeSleepDayDetailModal() {
    var modal = document.getElementById('sleepDayDetailModal');
    if (modal) modal.classList.remove('show');
}

function showFeedbackModal() {
    // Check if there's a recent entry without feedback (or auto-filled that user can correct)
    const recent = getValues(state.history).find(h => h.actualSleep === null || h.autoFilled === true);
    if (recent) {
        document.getElementById('feedbackPredicted').textContent = minutesToTime(recent.predictedSleep > 24*60 ? recent.predictedSleep - 24*60 : recent.predictedSleep);
        document.getElementById('feedbackModal').classList.add('show');
    }
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('show');
}

function submitFeedback() {
    const actualTime = document.getElementById('actualSleepTime').value;
    if (!actualTime) {
        showToast('Please enter your actual sleep time');
        return;
    }

    const recent = getValues(state.history).find(h => h.actualSleep === null || h.autoFilled === true);
    if (recent && state.history[recent.id]) {
        const actualMinutes = timeToMinutes(actualTime);
        state.history[recent.id].actualSleep = actualMinutes;
        state.history[recent.id].autoFilled = false; // Manual feedback — don't allow auto-recompute
        state.history[recent.id].deltaMinutes = computeSleepDelta(recent.predictedSleep, actualMinutes);
        state.history[recent.id].absError = Math.abs(state.history[recent.id].deltaMinutes);

        // Also update sleepDailyLogs with accuracy data
        if (!state.sleepDailyLogs) state.sleepDailyLogs = {};
        if (!state.sleepDailyLogs[recent.date]) {
            state.sleepDailyLogs[recent.date] = { date: recent.date, source: 'manual_feedback' };
        }
        state.sleepDailyLogs[recent.date].predictedSleep = recent.predictedSleep;
        state.sleepDailyLogs[recent.date].actualSleep = actualMinutes;
        state.sleepDailyLogs[recent.date].deltaMinutes = state.history[recent.id].deltaMinutes;
        state.sleepDailyLogs[recent.date].absError = state.history[recent.id].absError;

        saveState();
        renderSleepIntelligence();
        closeFeedbackModal();
        showToast('Feedback recorded! This helps calibrate your settings.');

        // Suggest calibration if consistently off
        suggestCalibration();
    }
}

function calculateAccuracyStats(days) {
    if (days === undefined) days = 30;
    const entries = getValues(state.history);

    const emptyResult = {
        totalEntries: 0, entriesWithFeedback: 0,
        avgError: null, avgAbsError: null,
        within30min: null, within60min: null,
        trend: null, recentBias: null
    };
    if (entries.length === 0) return emptyResult;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = getLocalDateString(cutoffDate);
    const inRange = entries.filter(e => e.date && e.date >= cutoffStr);
    const withFeedback = inRange.filter(e =>
        e.actualSleep !== null && e.actualSleep !== undefined && !isNaN(e.actualSleep) &&
        e.predictedSleep !== null && e.predictedSleep !== undefined && !isNaN(e.predictedSleep)
    );

    if (withFeedback.length === 0) return Object.assign({}, emptyResult, { totalEntries: inRange.length });

    const deltas = withFeedback.map(e => computeSleepDelta(e.predictedSleep, e.actualSleep));
    const absErrors = deltas.map(d => Math.abs(d));
    const avgError = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    const avgAbsError = absErrors.reduce((s, d) => s + d, 0) / absErrors.length;
    const within30 = absErrors.filter(e => e <= 30).length / absErrors.length;
    const within60 = absErrors.filter(e => e <= 60).length / absErrors.length;

    let trend = null;
    if (withFeedback.length >= 6) {
        const sorted = withFeedback.slice().sort((a, b) => b.date.localeCompare(a.date));
        const recent3 = sorted.slice(0, 3).map(e => Math.abs(computeSleepDelta(e.predictedSleep, e.actualSleep)));
        const older3 = sorted.slice(3, 6).map(e => Math.abs(computeSleepDelta(e.predictedSleep, e.actualSleep)));
        const recentAvg = recent3.reduce((s, v) => s + v, 0) / 3;
        const olderAvg = older3.reduce((s, v) => s + v, 0) / 3;
        const trendDiff = recentAvg - olderAvg;
        trend = trendDiff < -10 ? 'improving' : trendDiff > 10 ? 'worsening' : 'stable';
    }

    return {
        totalEntries: inRange.length,
        entriesWithFeedback: withFeedback.length,
        avgError: Math.round(avgError),
        avgAbsError: Math.round(avgAbsError),
        within30min: Math.round(within30 * 100),
        within60min: Math.round(within60 * 100),
        trend: trend,
        recentBias: avgError > 15 ? 'late' : avgError < -15 ? 'early' : 'neutral'
    };
}

function getCalibrationRecommendation() {
    const allWithFeedback = getValues(state.history).filter(e =>
        e.actualSleep !== null && e.actualSleep !== undefined && !isNaN(e.actualSleep) &&
        e.predictedSleep !== null && e.predictedSleep !== undefined && !isNaN(e.predictedSleep)
    );
    const entries = allWithFeedback.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

    if (entries.length === 0) return {
        recommendation: 'No feedback data yet. Save a prediction and log actual sleep to start calibrating.',
        confidence: 'none', adjustmentMg: null, details: null
    };
    if (entries.length < 3) return {
        recommendation: 'Only ' + entries.length + ' data point(s). Need 3+ for calibration advice.',
        confidence: 'none', adjustmentMg: null, details: null
    };

    const deltas = entries.map(e => computeSleepDelta(e.predictedSleep, e.actualSleep));
    const avgDelta = deltas.reduce((s, v) => s + v, 0) / deltas.length;
    const absErrors = deltas.map(d => Math.abs(d));
    const avgAbsError = absErrors.reduce((s, v) => s + v, 0) / absErrors.length;
    const confidence = allWithFeedback.length >= 15 ? 'high' : allWithFeedback.length >= 5 ? 'medium' : 'low';
    const currentThreshold = state.settings.sleepThreshold;

    if (avgAbsError <= 30) return {
        recommendation: 'Predictions are accurate (avg ' + Math.round(avgAbsError) + ' min off). No adjustment needed.',
        confidence: confidence, adjustmentMg: 0,
        details: { avgDelta: Math.round(avgDelta), avgAbsError: Math.round(avgAbsError), sampleSize: entries.length, currentThreshold: currentThreshold, suggestedThreshold: currentThreshold }
    };

    let adjustmentMg = null, recommendation = '';
    if (avgDelta > 30) {
        adjustmentMg = avgDelta > 60 ? -2 : -1;
        const newTh = Math.max(8, currentThreshold + adjustmentMg);
        recommendation = 'You fall asleep ' + Math.round(avgDelta) + ' min later than predicted. Try lowering Sleep Threshold from ' + currentThreshold + 'mg to ' + newTh + 'mg (you\'re more sensitive than assumed).';
    } else if (avgDelta < -30) {
        adjustmentMg = avgDelta < -60 ? 2 : 1;
        const newTh = Math.min(25, currentThreshold + adjustmentMg);
        recommendation = 'You fall asleep ' + Math.round(Math.abs(avgDelta)) + ' min earlier than predicted. Try raising Sleep Threshold from ' + currentThreshold + 'mg to ' + newTh + 'mg (you\'re less sensitive than assumed).';
    } else {
        recommendation = 'Predictions vary by ' + Math.round(avgAbsError) + ' min avg without consistent direction. May be due to variable sleep debt or exercise timing. Keep logging.';
    }

    return {
        recommendation: recommendation, confidence: confidence, adjustmentMg: adjustmentMg,
        details: { avgDelta: Math.round(avgDelta), avgAbsError: Math.round(avgAbsError), sampleSize: entries.length, currentThreshold: currentThreshold, suggestedThreshold: adjustmentMg !== null ? Math.max(8, Math.min(25, currentThreshold + adjustmentMg)) : currentThreshold }
    };
}

// BUG FIX 2: Use computeSleepDelta instead of raw subtraction
function suggestCalibration() {
    const withFeedback = getValues(state.history).filter(h => h.actualSleep !== null && h.actualSleep !== undefined && !isNaN(h.actualSleep)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    if (withFeedback.length < 3) return;

    const avgDiff = withFeedback.reduce((sum, h) => sum + computeSleepDelta(h.predictedSleep, h.actualSleep), 0) / withFeedback.length;

    if (avgDiff > 30) {
        // Consistently sleeping later than predicted - lower threshold
        showToast('Tip: You seem more sensitive. Try lowering your Sleep Threshold in settings.');
    } else if (avgDiff < -30) {
        // Sleeping earlier - raise threshold
        showToast('Tip: You might be less sensitive. Try raising your Sleep Threshold in settings.');
    }
}

// ============================================
// SLEEP INTELLIGENCE TAB SYSTEM
// ============================================

function switchSITab(tab) {
    // Bridge to sidebar page navigation when new layout is active
    if (document.body.classList.contains('has-sc-sidebar') && typeof scNavigate === 'function') {
        var pageMap = {
            'insights': 'insights',
            'accuracy': 'accuracy',
            'calendar': 'calendar',
            'overview': 'calendar'  // overview content lives in calendar page
        };
        if (pageMap[tab]) {
            scNavigate(pageMap[tab]);
            return;  // Let scNavigate handle the rest
        }
    }

    currentSITab = tab;
    var tabs = document.querySelectorAll('#siTabs .si-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
    }
    var panels = ['siTabOverview', 'siTabInsights', 'siTabAccuracy', 'siTabCalendar'];
    for (var i = 0; i < panels.length; i++) {
        var el = document.getElementById(panels[i]);
        if (el) el.style.display = panels[i] === 'siTab' + tab.charAt(0).toUpperCase() + tab.slice(1) ? 'block' : 'none';
    }
    // Render content for active tab
    if (tab === 'overview') {
        renderSleepCalendar();
        renderSleepPerformance();
    } else if (tab === 'insights') {
        renderInsightsTab();
    } else if (tab === 'accuracy') {
        renderAccuracyTab();
    } else if (tab === 'calendar') {
        renderSleepCalendarMonth();
        renderHistory();
    }
}

function renderSleepIntelligence() {
    updateSleepIntelSummary();
    // Render ALL tabs so data is fresh when user switches
    renderSleepCalendar();
    renderSleepPerformance();
    renderInsightsTab();
    renderAccuracyTab();
    renderSleepCalendarMonth();
    renderHistory();
}

function updateSleepIntelSummary() {
    var el = document.getElementById('sleepIntelSummary');
    if (!el) return;
    var data = getSleepDataForDays(30);
    var valid = data.filter(function(d) { return d.hoursSlept !== null; });
    var parts = [];
    if (valid.length > 0) {
        var avg = valid.reduce(function(a, d) { return a + d.hoursSlept; }, 0) / valid.length;
        parts.push(avg.toFixed(1) + 'h avg');
    }
    // Show current month days tracked (consistent with calendar + accuracy tabs)
    var now = new Date();
    var monthDays = countDaysTrackedInMonth(now.getFullYear(), now.getMonth());
    if (monthDays > 0) {
        parts.push(monthDays + ' days tracked');
    }
    var accStats = calculateAccuracyStats(30);
    if (accStats && accStats.entriesWithFeedback >= 3) {
        parts.push('\u00b1' + accStats.avgAbsError + 'min accuracy');
    }
    el.textContent = parts.length > 0 ? parts.join(' \u00b7 ') : '';
}

// ============================================
// ANALYTICS ENGINE & INSIGHTS/ACCURACY TABS
// ============================================

function toggleInsSection(id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('ins-section--open');
}

function buildInsSection(id, icon, title, bodyHtml, startOpen) {
    var cls = 'ins-section' + (startOpen ? ' ins-section--open' : '');
    return '<div class="' + cls + '" id="' + id + '_wrap">' +
        '<div class="ins-section-hdr" onclick="toggleInsSection(\'' + id + '_wrap\')">' +
            '<span class="ins-section-title">' + icon + ' ' + title + '</span>' +
            '<span class="ins-section-arrow">&#9660;</span>' +
        '</div>' +
        '<div class="ins-section-body">' + bodyHtml + '</div>' +
    '</div>';
}

// Master data collector — merges sleepDailyLogs + history + sleepHistory
function gatherAllDayData() {
    var dayMap = {};

    // Build history lookup by date (most recently updated entry per date)
    var historyByDate = {};
    getValues(state.history).forEach(function(h) {
        if (!h.date || h.date.length !== 10) return;
        if (!historyByDate[h.date] || (h.lastUpdated || '') > (historyByDate[h.date].lastUpdated || '')) {
            historyByDate[h.date] = h;
        }
    });

    // Collect all unique dates from all 3 sources
    var allDates = {};
    if (state.sleepDailyLogs) {
        Object.keys(state.sleepDailyLogs).forEach(function(k) { if (k && k.length === 10) allDates[k] = true; });
    }
    Object.keys(historyByDate).forEach(function(k) { allDates[k] = true; });
    if (state.sleepHistory) {
        Object.keys(state.sleepHistory).forEach(function(k) { if (k && k.length === 10) allDates[k] = true; });
    }

    // For each date, build unified day object using getSleepForDate() as
    // the single source of truth for sleep data (consistent with Calendar tab)
    Object.keys(allDates).forEach(function(date) {
        var sleepData = getSleepForDate(date);
        var hoursSlept = sleepData ? (sleepData.hoursSlept ?? null) : null;
        var wakeTime = sleepData ? (sleepData.wakeTime ?? null) : null;

        var dailyLog = (state.sleepDailyLogs && state.sleepDailyLogs[date]) ? state.sleepDailyLogs[date] : null;
        var histEntry = historyByDate[date] || null;

        var day = {
            date: date,
            hoursSlept: hoursSlept,
            wakeTime: wakeTime,
            sleepOnsetMinutes: null,
            totalAmpDose: null,
            totalCaffDose: null,
            medications: [],
            caffeine: [],
            hadWorkout: false,
            hadSauna: false,
            hadVitC: false,
            allNighterMode: false,
            predictedSleep: null,
            actualSleep: null,
            deltaMinutes: null,
            absError: null,
            effectiveThreshold: null,
            sleepDebtBonus: null,
            baseThreshold: null,
            status: null,
            source: 'merged'
        };

        // Fill from dailyLog first (richest source — end-of-day snapshot)
        if (dailyLog) {
            day.sleepOnsetMinutes = dailyLog.sleepOnsetMinutes ?? null;
            day.totalAmpDose = dailyLog.totalAmpDose ?? null;
            day.totalCaffDose = dailyLog.totalCaffDose ?? null;
            day.medications = dailyLog.medications || [];
            day.caffeine = dailyLog.caffeine || [];
            day.hadWorkout = !!dailyLog.hadWorkout;
            day.hadSauna = !!dailyLog.hadSauna;
            day.hadVitC = !!dailyLog.hadVitC;
            day.predictedSleep = dailyLog.predictedSleep ?? null;
            day.actualSleep = dailyLog.actualSleep ?? null;
            day.deltaMinutes = dailyLog.deltaMinutes ?? null;
            day.absError = dailyLog.absError ?? null;
            day.effectiveThreshold = dailyLog.effectiveThreshold ?? null;
            day.sleepDebtBonus = dailyLog.sleepDebtBonus ?? null;
            day.baseThreshold = dailyLog.baseThreshold ?? null;
            day.status = dailyLog.status ?? null;
            day.source = 'dailyLog';
        }

        // Fill gaps from history entry (predictions, dose data when dailyLog missing)
        if (histEntry) {
            if (day.predictedSleep == null && histEntry.predictedSleep != null) {
                day.predictedSleep = histEntry.predictedSleep;
            }
            if (day.actualSleep == null && histEntry.actualSleep != null) {
                day.actualSleep = histEntry.actualSleep;
            }
            if (day.deltaMinutes == null && histEntry.deltaMinutes != null) {
                day.deltaMinutes = histEntry.deltaMinutes;
                day.absError = histEntry.absError ?? null;
            }
            if (histEntry.inputs) {
                // Only use history inputs for fields dailyLog didn't provide
                if (day.totalAmpDose == null && histEntry.inputs.totalAmpDose != null) {
                    day.totalAmpDose = histEntry.inputs.totalAmpDose;
                }
                if (day.totalCaffDose == null && histEntry.inputs.totalCaffDose != null) {
                    day.totalCaffDose = histEntry.inputs.totalCaffDose;
                }
                if (!day.hadWorkout && histEntry.inputs.hasWorkout) day.hadWorkout = true;
                if (!day.hadSauna && histEntry.inputs.hasSauna) day.hadSauna = true;
                if (!day.hadVitC && histEntry.inputs.hasVitC) day.hadVitC = true;
                if (day.effectiveThreshold == null && histEntry.inputs.effectiveThreshold != null) {
                    day.effectiveThreshold = histEntry.inputs.effectiveThreshold;
                }
                if (day.sleepDebtBonus == null && histEntry.inputs.sleepDebtBonus != null) {
                    day.sleepDebtBonus = histEntry.inputs.sleepDebtBonus;
                }
            }
            // Use history medications/caffeine arrays only if dailyLog has none
            if (day.medications.length === 0 && histEntry.medications && histEntry.medications.length > 0) {
                day.medications = histEntry.medications;
            }
            if (day.caffeine.length === 0 && histEntry.caffeine && histEntry.caffeine.length > 0) {
                day.caffeine = histEntry.caffeine;
            }
            if (day.source === 'merged') day.source = 'history';
        }

        // Determine allNighterMode from ACTUAL sleep data, not the mode toggle
        // hoursSlept === 0 = all-nighter (consistent with computeSleepStatus)
        day.allNighterMode = (hoursSlept !== null && hoursSlept <= 0);

        // Only include dates with at least some meaningful data
        var hasAnyData = hoursSlept != null || wakeTime != null ||
                         day.totalAmpDose != null || day.predictedSleep != null;
        if (hasAnyData) {
            dayMap[date] = day;
        }
    });

    var result = Object.keys(dayMap).map(function(k) { return dayMap[k]; });
    result.sort(function(a, b) { return b.date.localeCompare(a.date); });
    return result;
}

function _fmtOnset(mins) {
    if (mins == null || isNaN(mins)) return '--';
    var m = mins > 1440 ? mins - 1440 : mins;
    return formatTime12(minutesToTime(m));
}

function _stdDev(arr) {
    if (arr.length < 2) return 0;
    var mean = arr.reduce(function(s, v) { return s + v; }, 0) / arr.length;
    var variance = arr.reduce(function(s, v) { return s + (v - mean) * (v - mean); }, 0) / arr.length;
    return Math.sqrt(variance);
}

function _dayOfWeek(dateStr) {
    var d = parseLocalDate(dateStr);
    return d.getDay(); // 0=Sun
}

function _isWeekend(dateStr) {
    var dow = _dayOfWeek(dateStr);
    return dow === 0 || dow === 5 || dow === 6; // Fri/Sat/Sun nights
}

var _DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================
// INSIGHTS TAB — 14 SECTION RENDERERS
// ============================================

function renderInsightsTab() {
    var container = document.getElementById('insightsContent');
    if (!container) return;
    var days = gatherAllDayData();
    if (days.length === 0) {
        container.querySelectorAll('.ins-section').forEach(function(el) {
            el.style.display = 'none';
        });
        var km = document.getElementById('insKeyMetrics');
        if (km) {
            km.style.display = 'block';
            km.className = 'ins-section ins-section--open';
            km.innerHTML = '<div class="ins-section-body" style="display:block;text-align:center;color:#9C948B;padding:24px 0;">Save predictions and log actual sleep to see analytics.</div>';
        }
        return;
    }
    renderInsKeyMetrics(days);
    renderInsDoseResponse(days);
    renderInsCaffeineImpact(days);
    renderInsSleepPatterns(days);
    renderInsModifierImpact(days);
    renderInsDosingWindows(days);
    renderInsCaffeineTiming(days);
    renderInsSleepEfficiency(days);
    renderInsPredictionReliability(days);
    renderInsCircadianConsistency(days);
    renderInsStimulantTrends(days);
    renderInsRiskIndicators(days);
    renderInsPersonalRecords(days);
    renderInsResearchBenchmarks(days);
}

// Section 1: Key Metrics
function renderInsKeyMetrics(days) {
    var el = document.getElementById('insKeyMetrics');
    if (!el) return;
    var withSleep = days.filter(function(d) { return d.hoursSlept != null && d.hoursSlept > 0; });
    var withAnySleep = days.filter(function(d) { return d.hoursSlept != null; });
    var withOnset = days.filter(function(d) { return d.actualSleep != null; });
    var withWake = days.filter(function(d) { return d.wakeTime != null; });
    var withAmp = days.filter(function(d) { return d.totalAmpDose != null && d.totalAmpDose > 0; });
    var withCaff = days.filter(function(d) { return d.totalCaffDose != null && d.totalCaffDose > 0; });
    var allNighters = withAnySleep.filter(function(d) { return d.hoursSlept <= 0; });

    var avgSleep = withSleep.length > 0 ? (withSleep.reduce(function(s, d) { return s + d.hoursSlept; }, 0) / withSleep.length).toFixed(1) : '--';
    var avgOnset = '--';
    if (withOnset.length > 0) {
        var onsetSum = withOnset.reduce(function(s, d) { return s + d.actualSleep; }, 0);
        avgOnset = _fmtOnset(Math.round(onsetSum / withOnset.length));
    }
    var avgWake = '--';
    if (withWake.length > 0) {
        var wakeSum = withWake.reduce(function(s, d) { return s + (typeof d.wakeTime === 'string' ? timeToMinutes(d.wakeTime) : d.wakeTime); }, 0);
        avgWake = _fmtOnset(Math.round(wakeSum / withWake.length));
    }
    var avgAmp = withAmp.length > 0 ? Math.round(withAmp.reduce(function(s, d) { return s + d.totalAmpDose; }, 0) / withAmp.length) : 0;
    var avgCaff = withCaff.length > 0 ? Math.round(withCaff.reduce(function(s, d) { return s + d.totalCaffDose; }, 0) / withCaff.length) : 0;
    var allNighterPct = withAnySleep.length > 0 ? Math.round(allNighters.length / withAnySleep.length * 100) : 0;

    var earliest = days[days.length - 1] ? days[days.length - 1].date : '';
    var latest = days[0] ? days[0].date : '';
    var rangeStr = earliest && latest ? parseLocalDate(earliest).toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ' - ' + parseLocalDate(latest).toLocaleDateString('en-US', {month:'short',day:'numeric'}) : '';

    var rows = [
        ['Avg Sleep', avgSleep + 'h'],
        ['Avg Sleep Onset', avgOnset],
        ['Avg Wake Time', avgWake],
        ['Avg Adderall/Day', avgAmp + 'mg'],
        ['Avg Caffeine/Day', avgCaff + 'mg'],
        ['All-Nighter Ratio', allNighters.length + '/' + withAnySleep.length + ' (' + allNighterPct + '%)'],
        ['Total Days Tracked', withAnySleep.length + (rangeStr ? ' &middot; ' + rangeStr : '')]
    ];
    var body = rows.map(function(r) {
        return '<div class="ins-metric-row"><span class="ins-metric-label">' + r[0] + '</span><span class="ins-metric-value">' + r[1] + '</span></div>';
    }).join('');
    el.className = 'ins-section ins-section--open';
    el.innerHTML = buildInsSection('insKM', '&#128202;', 'Key Metrics', body, true).replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
    // Directly set inner structure
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insKeyMetrics\')">' +
        '<span class="ins-section-title">&#128202; Key Metrics</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 2: Dose-Response
function renderInsDoseResponse(days) {
    var el = document.getElementById('insDoseResponse');
    if (!el) return;
    var withData = days.filter(function(d) { return d.totalAmpDose != null && d.actualSleep != null; });
    if (withData.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var buckets = [
        { label: '0mg', min: 0, max: 0.1, days: [], onset: 0, sleep: 0 },
        { label: '10-20mg', min: 0.1, max: 25, days: [], onset: 0, sleep: 0 },
        { label: '30mg', min: 25, max: 35, days: [], onset: 0, sleep: 0 },
        { label: '40mg', min: 35, max: 45, days: [], onset: 0, sleep: 0 },
        { label: '50mg+', min: 45, max: 9999, days: [], onset: 0, sleep: 0 }
    ];
    withData.forEach(function(d) {
        for (var i = 0; i < buckets.length; i++) {
            if (d.totalAmpDose >= buckets[i].min && d.totalAmpDose < buckets[i].max) {
                buckets[i].days.push(d);
                break;
            }
        }
    });
    var maxCount = Math.max.apply(null, buckets.map(function(b) { return b.days.length; }));
    var body = '';
    buckets.forEach(function(b) {
        if (b.days.length === 0) return;
        var avgOnset = b.days.reduce(function(s, d) { return s + d.actualSleep; }, 0) / b.days.length;
        var avgSleep = b.days.filter(function(d) { return d.hoursSlept != null && d.hoursSlept > 0; });
        var avgSleepH = avgSleep.length > 0 ? (avgSleep.reduce(function(s, d) { return s + d.hoursSlept; }, 0) / avgSleep.length).toFixed(1) + 'h' : '--';
        var pct = Math.round(b.days.length / maxCount * 100);
        body += '<div class="ins-bucket">' +
            '<span class="ins-bucket__label">' + b.label + '</span>' +
            '<div class="ins-bucket__bar-wrap"><div class="ins-bucket__bar" style="width:' + pct + '%;background:#6B7C5E;"></div></div>' +
            '<span class="ins-bucket__value">' + _fmtOnset(Math.round(avgOnset)) + ' / ' + avgSleepH + ' (' + b.days.length + ')</span>' +
        '</div>';
    });
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insDoseResponse\')">' +
        '<span class="ins-section-title">&#128138; Dose-Response</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 3: Caffeine Impact
function renderInsCaffeineImpact(days) {
    var el = document.getElementById('insCaffeineImpact');
    if (!el) return;
    var withOnset = days.filter(function(d) { return d.actualSleep != null; });
    if (withOnset.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var noCaff = withOnset.filter(function(d) { return !d.totalCaffDose || d.totalCaffDose === 0; });
    var yesCaff = withOnset.filter(function(d) { return d.totalCaffDose > 0; });

    var grid = '<div class="ins-compare-grid">';
    if (noCaff.length > 0) {
        var ncOnset = Math.round(noCaff.reduce(function(s, d) { return s + d.actualSleep; }, 0) / noCaff.length);
        grid += '<div class="ins-compare-card" style="background:rgba(94,138,94,0.1);"><div class="ins-compare-card__label">No Caffeine</div><div class="ins-compare-card__value" style="color:#5E8A5E;">' + _fmtOnset(ncOnset) + '</div><div class="ins-compare-card__sub">' + noCaff.length + ' days</div></div>';
    }
    if (yesCaff.length > 0) {
        var ycOnset = Math.round(yesCaff.reduce(function(s, d) { return s + d.actualSleep; }, 0) / yesCaff.length);
        grid += '<div class="ins-compare-card" style="background:rgba(196,146,58,0.1);"><div class="ins-compare-card__label">With Caffeine</div><div class="ins-compare-card__value" style="color:#C4923A;">' + _fmtOnset(ycOnset) + '</div><div class="ins-compare-card__sub">' + yesCaff.length + ' days</div></div>';
    }
    grid += '</div>';

    // Caffeine amount buckets
    var caffBuckets = [
        { label: '1-100mg', min: 1, max: 100, days: [] },
        { label: '100-200mg', min: 100, max: 200, days: [] },
        { label: '200mg+', min: 200, max: 9999, days: [] }
    ];
    yesCaff.forEach(function(d) {
        for (var i = 0; i < caffBuckets.length; i++) {
            if (d.totalCaffDose >= caffBuckets[i].min && d.totalCaffDose < caffBuckets[i].max) {
                caffBuckets[i].days.push(d); break;
            }
        }
    });
    var bucketHtml = '';
    caffBuckets.forEach(function(b) {
        if (b.days.length === 0) return;
        var avgO = Math.round(b.days.reduce(function(s, d) { return s + d.actualSleep; }, 0) / b.days.length);
        bucketHtml += '<div class="ins-metric-row"><span class="ins-metric-label">' + b.label + ' (' + b.days.length + ' days)</span><span class="ins-metric-value">' + _fmtOnset(avgO) + '</span></div>';
    });

    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insCaffeineImpact\')">' +
        '<span class="ins-section-title">&#9749; Caffeine Impact</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + grid + bucketHtml + '</div>';
}

// Section 4: Sleep Patterns
function renderInsSleepPatterns(days) {
    var el = document.getElementById('insSleepPatterns');
    if (!el) return;
    var withOnset = days.filter(function(d) { return d.actualSleep != null; });
    if (withOnset.length < 5) { el.style.display = 'none'; return; }
    el.style.display = '';

    var weekday = withOnset.filter(function(d) { return !_isWeekend(d.date); });
    var weekend = withOnset.filter(function(d) { return _isWeekend(d.date); });

    var body = '<div class="ins-compare-grid">';
    if (weekday.length > 0) {
        var wdOnset = Math.round(weekday.reduce(function(s, d) { return s + d.actualSleep; }, 0) / weekday.length);
        body += '<div class="ins-compare-card" style="background:rgba(94,122,138,0.1);"><div class="ins-compare-card__label">Weekday (Mon-Thu)</div><div class="ins-compare-card__value" style="color:#5E7A8A;">' + _fmtOnset(wdOnset) + '</div><div class="ins-compare-card__sub">' + weekday.length + ' nights</div></div>';
    }
    if (weekend.length > 0) {
        var weOnset = Math.round(weekend.reduce(function(s, d) { return s + d.actualSleep; }, 0) / weekend.length);
        body += '<div class="ins-compare-card" style="background:rgba(107,124,94,0.08);"><div class="ins-compare-card__label">Weekend (Fri-Sun)</div><div class="ins-compare-card__value" style="color:#6B7C5E;">' + _fmtOnset(weOnset) + '</div><div class="ins-compare-card__sub">' + weekend.length + ' nights</div></div>';
    }
    body += '</div>';

    // Best/worst day of week
    var byDow = {};
    withOnset.forEach(function(d) {
        var dow = _dayOfWeek(d.date);
        if (!byDow[dow]) byDow[dow] = [];
        byDow[dow].push(d.actualSleep);
    });
    var bestDow = null, worstDow = null, bestAvg = 9999, worstAvg = 0;
    Object.keys(byDow).forEach(function(dow) {
        if (byDow[dow].length < 2) return;
        var avg = byDow[dow].reduce(function(s, v) { return s + v; }, 0) / byDow[dow].length;
        if (avg < bestAvg) { bestAvg = avg; bestDow = dow; }
        if (avg > worstAvg) { worstAvg = avg; worstDow = dow; }
    });
    if (bestDow !== null) {
        body += '<div class="ins-metric-row"><span class="ins-metric-label">Earliest Sleep Day</span><span class="ins-metric-value" style="color:#5E8A5E;">' + _DOW_NAMES[bestDow] + ' (' + _fmtOnset(Math.round(bestAvg)) + ')</span></div>';
    }
    if (worstDow !== null) {
        body += '<div class="ins-metric-row"><span class="ins-metric-label">Latest Sleep Day</span><span class="ins-metric-value" style="color:#B85C5C;">' + _DOW_NAMES[worstDow] + ' (' + _fmtOnset(Math.round(worstAvg)) + ')</span></div>';
    }

    // Consistency score (std dev of onset times)
    var onsets = withOnset.map(function(d) { return d.actualSleep; });
    var consistency = Math.round(_stdDev(onsets));
    var consColor = consistency <= 60 ? '#5E8A5E' : consistency <= 120 ? '#C4923A' : '#B85C5C';
    body += '<div class="ins-metric-row"><span class="ins-metric-label">Consistency (std dev)</span><span class="ins-metric-value" style="color:' + consColor + ';">&plusmn;' + consistency + 'min</span></div>';

    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insSleepPatterns\')">' +
        '<span class="ins-section-title">&#128164; Sleep Patterns</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 5: Modifier Impact
function renderInsModifierImpact(days) {
    var el = document.getElementById('insModifierImpact');
    if (!el) return;
    var withOnset = days.filter(function(d) { return d.actualSleep != null; });
    if (withOnset.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var modifiers = [
        { key: 'hadVitC', label: 'Vitamin C', icon: '&#127818;' },
        { key: 'hadWorkout', label: 'Workout', icon: '&#127947;' },
        { key: 'hadSauna', label: 'Sauna', icon: '&#128167;' }
    ];
    var body = '';
    modifiers.forEach(function(mod) {
        var withMod = withOnset.filter(function(d) { return d[mod.key]; });
        var withoutMod = withOnset.filter(function(d) { return !d[mod.key]; });
        if (withMod.length < 1 || withoutMod.length < 1) return;
        var avgWith = Math.round(withMod.reduce(function(s, d) { return s + d.actualSleep; }, 0) / withMod.length);
        var avgWithout = Math.round(withoutMod.reduce(function(s, d) { return s + d.actualSleep; }, 0) / withoutMod.length);
        var delta = avgWith - avgWithout;
        var deltaStr = (delta > 0 ? '+' : '') + delta + 'min';
        var deltaColor = delta < 0 ? '#5E8A5E' : delta > 30 ? '#B85C5C' : '#C4923A';
        body += '<div class="ins-metric-row"><span class="ins-metric-label">' + mod.icon + ' ' + mod.label + '</span><span class="ins-metric-value"><span style="color:' + deltaColor + ';">' + deltaStr + '</span> <span style="color:#9C948B;font-size:0.8em;">(' + withMod.length + ' vs ' + withoutMod.length + ')</span></span></div>';
    });
    if (!body) { el.style.display = 'none'; return; }
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insModifierImpact\')">' +
        '<span class="ins-section-title">&#9881; Modifier Impact</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '<div style="font-size:0.72em;color:#9C948B;margin-top:6px;">Negative = earlier sleep. Based on actual sleep onset.</div></div>';
}

// Section 6: Dosing Windows
function renderInsDosingWindows(days) {
    var el = document.getElementById('insDosingWindows');
    if (!el) return;
    var withData = days.filter(function(d) { return d.totalAmpDose > 0 && d.actualSleep != null && d.medications && d.medications.length > 0 && d.wakeTime != null; });
    if (withData.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    // Find last dose time for each day relative to wake
    var buckets = {};
    withData.forEach(function(d) {
        var wakeMins = typeof d.wakeTime === 'string' ? timeToMinutes(d.wakeTime) : d.wakeTime;
        var lastDose = 0;
        (d.medications || []).forEach(function(m) {
            var doseTime = typeof m.time === 'string' ? timeToMinutes(m.time) : m.time;
            if (doseTime > lastDose) lastDose = doseTime;
        });
        var hoursAfterWake = Math.round((lastDose - wakeMins) / 60);
        if (hoursAfterWake < 0) hoursAfterWake = 0;
        var bucket = hoursAfterWake <= 2 ? '0-2h' : hoursAfterWake <= 4 ? '2-4h' : hoursAfterWake <= 6 ? '4-6h' : '6h+';
        if (!buckets[bucket]) buckets[bucket] = [];
        buckets[bucket].push(d.actualSleep);
    });
    var body = '';
    ['0-2h', '2-4h', '4-6h', '6h+'].forEach(function(b) {
        if (!buckets[b] || buckets[b].length === 0) return;
        var avg = Math.round(buckets[b].reduce(function(s, v) { return s + v; }, 0) / buckets[b].length);
        body += '<div class="ins-metric-row"><span class="ins-metric-label">Last dose ' + b + ' after wake</span><span class="ins-metric-value">' + _fmtOnset(avg) + ' <span style="color:#9C948B;font-size:0.8em;">(' + buckets[b].length + ')</span></span></div>';
    });
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insDosingWindows\')">' +
        '<span class="ins-section-title">&#9200; Dosing Windows</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 7: Caffeine Timing
function renderInsCaffeineTiming(days) {
    var el = document.getElementById('insCaffeineTiming');
    if (!el) return;
    var withData = days.filter(function(d) { return d.totalCaffDose > 0 && d.actualSleep != null && d.caffeine && d.caffeine.length > 0; });
    if (withData.length < 2) { el.style.display = 'none'; return; }
    el.style.display = '';

    var gaps = [];
    withData.forEach(function(d) {
        var lastCaff = 0;
        (d.caffeine || []).forEach(function(c) {
            var ct = typeof c.time === 'string' ? timeToMinutes(c.time) : c.time;
            if (ct > lastCaff) lastCaff = ct;
        });
        var onset = d.actualSleep;
        var gap = onset - lastCaff;
        if (gap < 0) gap += 1440;
        gaps.push({ gap: gap, onset: onset });
    });
    gaps.sort(function(a, b) { return a.gap - b.gap; });
    var avgGap = Math.round(gaps.reduce(function(s, g) { return s + g.gap; }, 0) / gaps.length);
    var avgGapH = (avgGap / 60).toFixed(1);

    var body = '<div class="ins-metric-row"><span class="ins-metric-label">Avg gap: last caffeine to sleep</span><span class="ins-metric-value">' + avgGapH + 'h (' + avgGap + 'min)</span></div>';
    var cutoffColor = avgGap < 360 ? '#B85C5C' : avgGap < 480 ? '#C4923A' : '#5E8A5E';
    var cutoffNote = avgGap < 360 ? 'Research suggests 6h+ gap (Drake 2013)' : avgGap < 480 ? 'Good — close to 8h ideal' : 'Excellent caffeine timing';
    body += '<div style="font-size:0.78em;color:' + cutoffColor + ';margin-top:6px;">' + cutoffNote + '</div>';

    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insCaffeineTiming\')">' +
        '<span class="ins-section-title">&#9749; Caffeine Timing</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 8: Sleep Efficiency
function renderInsSleepEfficiency(days) {
    var el = document.getElementById('insSleepEfficiency');
    if (!el) return;
    var withSleep = days.filter(function(d) { return d.hoursSlept != null && d.hoursSlept > 0; });
    if (withSleep.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var target = state.settings.sleepTarget ?? 8;
    var avgHrs = withSleep.reduce(function(s, d) { return s + d.hoursSlept; }, 0) / withSleep.length;
    var efficiency = Math.round(avgHrs / target * 100);
    var effColor = efficiency >= 90 ? '#5E8A5E' : efficiency >= 75 ? '#C4923A' : '#B85C5C';

    // Weekly deficit
    var now = new Date();
    var weekAgo = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
    var thisWeek = withSleep.filter(function(d) { return d.date >= weekAgo; });
    var weekDeficit = 0;
    thisWeek.forEach(function(d) { weekDeficit += Math.max(0, target - d.hoursSlept); });

    var body = '<div class="ins-metric-row"><span class="ins-metric-label">Sleep Efficiency</span><span class="ins-metric-value" style="color:' + effColor + ';">' + efficiency + '% of ' + target + 'h target</span></div>';
    body += '<div class="ins-metric-row"><span class="ins-metric-label">Avg Hours Slept</span><span class="ins-metric-value">' + avgHrs.toFixed(1) + 'h</span></div>';
    body += '<div class="ins-metric-row"><span class="ins-metric-label">This Week Deficit</span><span class="ins-metric-value" style="color:' + (weekDeficit > 5 ? '#B85C5C' : weekDeficit > 2 ? '#C4923A' : '#5E8A5E') + ';">' + weekDeficit.toFixed(1) + 'h</span></div>';
    body += '<div class="ins-metric-row"><span class="ins-metric-label">Days Below Target</span><span class="ins-metric-value">' + withSleep.filter(function(d) { return d.hoursSlept < target; }).length + '/' + withSleep.length + '</span></div>';

    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insSleepEfficiency\')">' +
        '<span class="ins-section-title">&#128200; Sleep Efficiency</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 9: Prediction Reliability by Context
function renderInsPredictionReliability(days) {
    var el = document.getElementById('insPredictionReliability');
    if (!el) return;
    var withBoth = days.filter(function(d) { return d.predictedSleep != null && d.actualSleep != null; });
    if (withBoth.length < 5) { el.style.display = 'none'; return; }
    el.style.display = '';

    var contexts = [
        { label: 'High Dose (40mg+)', filter: function(d) { return d.totalAmpDose >= 40; } },
        { label: 'Low Dose (<30mg)', filter: function(d) { return d.totalAmpDose > 0 && d.totalAmpDose < 30; } },
        { label: 'With Caffeine', filter: function(d) { return d.totalCaffDose > 0; } },
        { label: 'No Caffeine', filter: function(d) { return !d.totalCaffDose; } },
        { label: 'Workout Days', filter: function(d) { return d.hadWorkout; } },
        { label: 'VitC Days', filter: function(d) { return d.hadVitC; } },
        { label: 'Low Sleep (<6h)', filter: function(d) { return d.hoursSlept != null && d.hoursSlept < 6; } },
        { label: 'No Modifiers', filter: function(d) { return !d.hadWorkout && !d.hadSauna && !d.hadVitC; } }
    ];
    var body = '';
    var results = [];
    contexts.forEach(function(ctx) {
        var matched = withBoth.filter(ctx.filter);
        if (matched.length < 2) return;
        var absErrors = matched.map(function(d) { return Math.abs(computeSleepDelta(d.predictedSleep, d.actualSleep)); });
        var avgErr = Math.round(absErrors.reduce(function(s, v) { return s + v; }, 0) / absErrors.length);
        results.push({ label: ctx.label, avgErr: avgErr, count: matched.length });
    });
    results.sort(function(a, b) { return a.avgErr - b.avgErr; });
    results.forEach(function(r) {
        var color = r.avgErr <= 30 ? '#5E8A5E' : r.avgErr <= 60 ? '#C4923A' : '#B85C5C';
        body += '<div class="ins-metric-row"><span class="ins-metric-label">' + r.label + ' (' + r.count + ')</span><span class="ins-metric-value" style="color:' + color + ';">&plusmn;' + r.avgErr + 'min</span></div>';
    });
    if (results.length > 0) {
        body += '<div style="font-size:0.72em;color:#9C948B;margin-top:6px;">Sorted by accuracy (best first)</div>';
    }
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insPredictionReliability\')">' +
        '<span class="ins-section-title">&#127919; Prediction Reliability</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 10: Circadian Consistency
function renderInsCircadianConsistency(days) {
    var el = document.getElementById('insCircadianConsistency');
    if (!el) return;
    var withWake = days.filter(function(d) { return d.wakeTime != null; });
    if (withWake.length < 5) { el.style.display = 'none'; return; }
    el.style.display = '';

    var wakeMins = withWake.map(function(d) { return typeof d.wakeTime === 'string' ? timeToMinutes(d.wakeTime) : d.wakeTime; });
    var wakeStd = Math.round(_stdDev(wakeMins));
    var wakeColor = wakeStd <= 30 ? '#5E8A5E' : wakeStd <= 60 ? '#C4923A' : '#B85C5C';

    // Social jet lag (weekday vs weekend wake difference)
    var weekdayWake = withWake.filter(function(d) { return !_isWeekend(d.date); }).map(function(d) { return typeof d.wakeTime === 'string' ? timeToMinutes(d.wakeTime) : d.wakeTime; });
    var weekendWake = withWake.filter(function(d) { return _isWeekend(d.date); }).map(function(d) { return typeof d.wakeTime === 'string' ? timeToMinutes(d.wakeTime) : d.wakeTime; });
    var sjl = '--';
    var sjlColor = '#9C948B';
    if (weekdayWake.length > 0 && weekendWake.length > 0) {
        var wdAvg = weekdayWake.reduce(function(s, v) { return s + v; }, 0) / weekdayWake.length;
        var weAvg = weekendWake.reduce(function(s, v) { return s + v; }, 0) / weekendWake.length;
        var sjlMin = Math.round(Math.abs(weAvg - wdAvg));
        sjl = sjlMin + 'min';
        sjlColor = sjlMin <= 30 ? '#5E8A5E' : sjlMin <= 60 ? '#C4923A' : '#B85C5C';
    }

    var body = '<div class="ins-metric-row"><span class="ins-metric-label">Wake Time Variability</span><span class="ins-metric-value" style="color:' + wakeColor + ';">&plusmn;' + wakeStd + 'min</span></div>';
    body += '<div class="ins-metric-row"><span class="ins-metric-label">Social Jet Lag</span><span class="ins-metric-value" style="color:' + sjlColor + ';">' + sjl + '</span></div>';
    body += '<div style="font-size:0.72em;color:#9C948B;margin-top:6px;">Target: &lt;60min variability, &lt;30min jet lag (Wittmann 2006)</div>';

    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insCircadianConsistency\')">' +
        '<span class="ins-section-title">&#128336; Circadian Consistency</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 11: Stimulant Load Trends
function renderInsStimulantTrends(days) {
    var el = document.getElementById('insStimulantTrends');
    if (!el) return;
    var withAmp = days.filter(function(d) { return d.totalAmpDose != null; });
    if (withAmp.length < 7) { el.style.display = 'none'; return; }
    el.style.display = '';

    // Last 4 weeks
    var now = new Date();
    var weeks = [];
    for (var w = 0; w < 4; w++) {
        var weekStart = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w + 1) * 7));
        var weekEnd = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7));
        var weekDays = withAmp.filter(function(d) { return d.date > weekStart && d.date <= weekEnd; });
        var avgDose = weekDays.length > 0 ? Math.round(weekDays.reduce(function(s, d) { return s + (d.totalAmpDose || 0); }, 0) / weekDays.length) : 0;
        var stimDays = weekDays.filter(function(d) { return d.totalAmpDose > 0; }).length;
        weeks.push({ label: w === 0 ? 'This Week' : w + ' wk ago', avgDose: avgDose, stimDays: stimDays, total: weekDays.length });
    }
    var maxDose = Math.max.apply(null, weeks.map(function(w) { return w.avgDose; }));
    var body = '';
    weeks.forEach(function(wk) {
        if (wk.total === 0) return;
        var pct = maxDose > 0 ? Math.round(wk.avgDose / maxDose * 100) : 0;
        body += '<div class="ins-bucket"><span class="ins-bucket__label">' + wk.label + '</span><div class="ins-bucket__bar-wrap"><div class="ins-bucket__bar" style="width:' + pct + '%;background:#6B7C5E;"></div></div><span class="ins-bucket__value">' + wk.avgDose + 'mg/day (' + wk.stimDays + '/' + wk.total + ')</span></div>';
    });

    // Tolerance indicator
    if (weeks.length >= 2 && weeks[0].avgDose > 0 && weeks[weeks.length - 1].avgDose > 0) {
        var withOnset = days.filter(function(d) { return d.actualSleep != null && d.totalAmpDose > 30; });
        if (withOnset.length >= 4) {
            var recentOnset = withOnset.slice(0, Math.ceil(withOnset.length / 2));
            var olderOnset = withOnset.slice(Math.ceil(withOnset.length / 2));
            var rAvg = recentOnset.reduce(function(s, d) { return s + d.actualSleep; }, 0) / recentOnset.length;
            var oAvg = olderOnset.reduce(function(s, d) { return s + d.actualSleep; }, 0) / olderOnset.length;
            var shift = Math.round(rAvg - oAvg);
            if (Math.abs(shift) > 15) {
                var toleranceNote = shift > 0 ? 'Sleep onset shifting ' + shift + 'min later at similar doses (possible tolerance)' : 'Sleep onset shifting ' + Math.abs(shift) + 'min earlier at similar doses';
                body += '<div style="font-size:0.78em;color:#C4923A;margin-top:8px;padding:8px;background:rgba(196,146,58,0.1);border-radius:6px;">' + toleranceNote + '</div>';
            }
        }
    }

    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insStimulantTrends\')">' +
        '<span class="ins-section-title">&#128200; Stimulant Trends</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 12: Risk Indicators
function renderInsRiskIndicators(days) {
    var el = document.getElementById('insRiskIndicators');
    if (!el) return;
    if (days.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var risks = [];
    // High-dose streak
    var highDoseStreak = 0, maxStreak = 0;
    days.slice().sort(function(a, b) { return a.date.localeCompare(b.date); }).forEach(function(d) {
        if (d.totalAmpDose >= 40) { highDoseStreak++; maxStreak = Math.max(maxStreak, highDoseStreak); }
        else { highDoseStreak = 0; }
    });
    if (maxStreak >= 3) {
        risks.push({ icon: '&#128293;', label: 'High Dose Streak', detail: maxStreak + ' consecutive days at 40mg+', bg: 'rgba(184,92,92,0.1)' });
    }

    // Days since stim-free
    var sortedByDate = days.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    var daysSinceStimFree = 0;
    for (var i = 0; i < sortedByDate.length; i++) {
        if (!sortedByDate[i].totalAmpDose || sortedByDate[i].totalAmpDose === 0) break;
        daysSinceStimFree++;
    }
    if (daysSinceStimFree >= 7) {
        risks.push({ icon: '&#9888;', label: 'No Stimulant-Free Days', detail: daysSinceStimFree + ' consecutive days with stimulants', bg: 'rgba(196,146,58,0.1)' });
    }

    // <5h sleep frequency (last 30 days)
    var last30 = days.filter(function(d) {
        var cutoff = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 30));
        return d.date >= cutoff;
    });
    var under5 = last30.filter(function(d) { return d.hoursSlept != null && d.hoursSlept < 5; });
    if (under5.length >= 3) {
        risks.push({ icon: '&#128564;', label: 'Frequent Sleep Deprivation', detail: under5.length + '/' + last30.length + ' days with <5h sleep (last 30d)', bg: 'rgba(184,92,92,0.1)' });
    }

    // Sleep debt danger zone
    var recentSleep = days.slice(0, 7).filter(function(d) { return d.hoursSlept != null && d.hoursSlept > 0; });
    if (recentSleep.length > 0) {
        var target = state.settings.sleepTarget ?? 8;
        var weekDebt = recentSleep.reduce(function(s, d) { return s + Math.max(0, target - d.hoursSlept); }, 0);
        if (weekDebt > 10) {
            risks.push({ icon: '&#9762;', label: 'Sleep Debt Danger Zone', detail: weekDebt.toFixed(1) + 'h deficit in last ' + recentSleep.length + ' days', bg: 'rgba(184,92,92,0.15)' });
        }
    }

    var body = '';
    if (risks.length === 0) {
        body = '<div style="text-align:center;color:#5E8A5E;padding:12px;">No risk indicators detected</div>';
    } else {
        risks.forEach(function(r) {
            body += '<div class="ins-risk-card" style="background:' + r.bg + ';"><span class="ins-risk-card__icon">' + r.icon + '</span><div class="ins-risk-card__text"><div class="ins-risk-card__label">' + r.label + '</div><div class="ins-risk-card__detail">' + r.detail + '</div></div></div>';
        });
    }
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insRiskIndicators\')">' +
        '<span class="ins-section-title">&#9888; Risk Indicators</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 13: Personal Records
function renderInsPersonalRecords(days) {
    var el = document.getElementById('insPersonalRecords');
    if (!el) return;
    if (days.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var records = [];
    // Earliest sleep
    var withOnset = days.filter(function(d) { return d.actualSleep != null; });
    if (withOnset.length > 0) {
        var earliest = withOnset.reduce(function(best, d) { return d.actualSleep < best.actualSleep ? d : best; });
        records.push(['Earliest Sleep', _fmtOnset(earliest.actualSleep) + ' (' + parseLocalDate(earliest.date).toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ')']);
    }

    // Most sleep
    var withSleep = days.filter(function(d) { return d.hoursSlept != null && d.hoursSlept > 0; });
    if (withSleep.length > 0) {
        var mostSleep = withSleep.reduce(function(best, d) { return d.hoursSlept > best.hoursSlept ? d : best; });
        records.push(['Most Sleep', mostSleep.hoursSlept.toFixed(1) + 'h (' + parseLocalDate(mostSleep.date).toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ')']);
    }

    // Longest 7h+ streak
    var sorted = days.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
    var streak = 0, maxStreak7 = 0;
    sorted.forEach(function(d) {
        if (d.hoursSlept != null && d.hoursSlept >= 7) { streak++; maxStreak7 = Math.max(maxStreak7, streak); }
        else { streak = 0; }
    });
    if (maxStreak7 > 0) records.push(['Longest 7h+ Streak', maxStreak7 + ' days']);

    // Most accurate prediction
    var withBoth = days.filter(function(d) { return d.predictedSleep != null && d.actualSleep != null; });
    if (withBoth.length > 0) {
        var mostAccurate = withBoth.reduce(function(best, d) {
            var err = Math.abs(computeSleepDelta(d.predictedSleep, d.actualSleep));
            var bestErr = Math.abs(computeSleepDelta(best.predictedSleep, best.actualSleep));
            return err < bestErr ? d : best;
        });
        var bestErr = Math.abs(computeSleepDelta(mostAccurate.predictedSleep, mostAccurate.actualSleep));
        records.push(['Most Accurate Prediction', '&plusmn;' + Math.round(bestErr) + 'min (' + parseLocalDate(mostAccurate.date).toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ')']);
    }

    var body = records.map(function(r) {
        return '<div class="ins-metric-row"><span class="ins-metric-label">' + r[0] + '</span><span class="ins-metric-value">' + r[1] + '</span></div>';
    }).join('');
    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insPersonalRecords\')">' +
        '<span class="ins-section-title">&#127942; Personal Records</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Section 14: Research Benchmarks
function renderInsResearchBenchmarks(days) {
    var el = document.getElementById('insResearchBenchmarks');
    if (!el) return;
    var withSleep = days.filter(function(d) { return d.hoursSlept != null && d.hoursSlept > 0; });
    if (withSleep.length < 3) { el.style.display = 'none'; return; }
    el.style.display = '';

    var avgHrs = withSleep.reduce(function(s, d) { return s + d.hoursSlept; }, 0) / withSleep.length;
    var withOnset = days.filter(function(d) { return d.actualSleep != null; });
    var onsetStd = withOnset.length >= 3 ? Math.round(_stdDev(withOnset.map(function(d) { return d.actualSleep; }))) : null;

    var body = '';
    // Sleep duration benchmark
    var durationPct = Math.min(100, Math.round(avgHrs / 9 * 100));
    var durationColor = avgHrs >= 7 ? '#5E8A5E' : avgHrs >= 6 ? '#C4923A' : '#B85C5C';
    body += '<div class="ins-benchmark"><div class="ins-benchmark__label">Sleep Duration vs Recommended 7-9h (Hirshkowitz 2015)</div>';
    body += '<div class="ins-benchmark__bar"><div class="ins-benchmark__fill" style="width:' + Math.round(7/9*100) + '%;background:rgba(94,138,94,0.15);"></div>';
    body += '<div class="ins-benchmark__marker" style="left:' + durationPct + '%;background:' + durationColor + ';"></div></div>';
    body += '<div class="ins-benchmark__range"><span>0h</span><span style="color:' + durationColor + ';">You: ' + avgHrs.toFixed(1) + 'h</span><span>9h</span></div></div>';

    // Variability benchmark
    if (onsetStd !== null) {
        var varPct = Math.min(100, Math.round(onsetStd / 180 * 100));
        var varColor = onsetStd <= 60 ? '#5E8A5E' : onsetStd <= 120 ? '#C4923A' : '#B85C5C';
        body += '<div class="ins-benchmark"><div class="ins-benchmark__label">Sleep Time Variability vs &lt;60min target (Wittmann 2006)</div>';
        body += '<div class="ins-benchmark__bar"><div class="ins-benchmark__fill" style="width:' + Math.round(60/180*100) + '%;background:rgba(94,138,94,0.15);"></div>';
        body += '<div class="ins-benchmark__marker" style="left:' + varPct + '%;background:' + varColor + ';"></div></div>';
        body += '<div class="ins-benchmark__range"><span>0min</span><span style="color:' + varColor + ';">You: &plusmn;' + onsetStd + 'min</span><span>180min</span></div></div>';
    }

    // Caffeine cutoff benchmark
    var withCaffData = days.filter(function(d) { return d.totalCaffDose > 0 && d.actualSleep != null && d.caffeine && d.caffeine.length > 0; });
    if (withCaffData.length >= 2) {
        var totalGap = 0;
        withCaffData.forEach(function(d) {
            var lastCaff = 0;
            (d.caffeine || []).forEach(function(c) {
                var ct = typeof c.time === 'string' ? timeToMinutes(c.time) : c.time;
                if (ct > lastCaff) lastCaff = ct;
            });
            var gap = d.actualSleep - lastCaff;
            if (gap < 0) gap += 1440;
            totalGap += gap;
        });
        var avgGapMins = Math.round(totalGap / withCaffData.length);
        var gapPct = Math.min(100, Math.round(avgGapMins / 600 * 100));
        var gapColor = avgGapMins >= 360 ? '#5E8A5E' : avgGapMins >= 240 ? '#C4923A' : '#B85C5C';
        body += '<div class="ins-benchmark"><div class="ins-benchmark__label">Caffeine-to-Sleep Gap vs 6h minimum (Drake 2013)</div>';
        body += '<div class="ins-benchmark__bar"><div class="ins-benchmark__fill" style="width:' + Math.round(360/600*100) + '%;background:rgba(94,138,94,0.15);"></div>';
        body += '<div class="ins-benchmark__marker" style="left:' + gapPct + '%;background:' + gapColor + ';"></div></div>';
        body += '<div class="ins-benchmark__range"><span>0h</span><span style="color:' + gapColor + ';">You: ' + (avgGapMins/60).toFixed(1) + 'h</span><span>10h</span></div></div>';
    }

    // Adderall XR context
    body += '<div style="font-size:0.72em;color:#9C948B;margin-top:10px;padding:8px;background:rgba(0,0,0,0.03);border-radius:6px;">';
    body += '<strong>Adderall XR Pharmacokinetics:</strong> Terminal half-life ~11h (FDA label). 50% IR at T+0, 50% DR at T+4h. Full clearance varies by dose and individual metabolism.';
    body += '</div>';

    el.innerHTML = '<div class="ins-section-hdr" onclick="toggleInsSection(\'insResearchBenchmarks\')">' +
        '<span class="ins-section-title">&#128218; Research Benchmarks</span>' +
        '<span class="ins-section-arrow">&#9660;</span></div>' +
        '<div class="ins-section-body">' + body + '</div>';
}

// Legacy wrapper — redirects to new analytics dashboard
function renderPredictionInsights() {
    renderInsightsTab();
}

function getInsightExplanation(entry, delta) {
    var inp = entry.inputs || {};
    var reasons = [];

    if (delta > 30) {
        // Slept LATER than predicted
        if (inp.totalCaffDose > 100) reasons.push('High caffeine (' + inp.totalCaffDose + 'mg) may have delayed sleep onset');
        if (inp.hoursSleptLastNight >= 7.5) reasons.push('Good prior sleep (' + inp.hoursSleptLastNight + 'h) meant less sleep pressure');
        if (inp.hasWorkout) reasons.push('Workout-induced arousal may have lasted longer than modeled');
        if (inp.totalAmpDose >= 40 && !inp.hasVitC) reasons.push('High dose (' + inp.totalAmpDose + 'mg) without VitC extends clearance');
        if (reasons.length === 0) reasons.push('Prediction was ' + Math.round(delta) + 'min early \u2014 consider lowering Sleep Threshold');
    } else if (delta < -30) {
        // Slept EARLIER than predicted
        if (inp.sleepDebtBonus > 2) reasons.push('Sleep debt bonus (+' + inp.sleepDebtBonus.toFixed(1) + 'mg) may have been stronger than modeled');
        if (inp.hasSauna) reasons.push('Sauna rebound effect may have accelerated sleep onset');
        if (inp.hasVitC) reasons.push('VitC shortened half-life, clearing stimulant faster');
        if (inp.hoursSleptLastNight < 5) reasons.push('Severe sleep deprivation (' + inp.hoursSleptLastNight + 'h) increased sleep pressure');
        if (reasons.length === 0) reasons.push('Prediction was ' + Math.round(Math.abs(delta)) + 'min late \u2014 consider raising Sleep Threshold');
    }

    return reasons.join('. ') + '.';
}

// ============================================
// MULTI-DIMENSIONAL CALIBRATION (Phase 5)
// ============================================

// Legacy — functionality moved to renderAccContextBreakdowns()
function renderCalibrationContexts() {
    // No-op: context breakdowns now in accuracy tab
}
