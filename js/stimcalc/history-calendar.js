// ============================================
// HISTORY, CALIBRATION & SLEEP CALENDAR (Phase 4)
// ============================================

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
        state.history[id] = {
            id: id,
            date: today,
            medications: getValues(state.medications),
            caffeine: getValues(state.caffeine),
            modifiers: JSON.parse(JSON.stringify(state.modifiers)),
            predictedSleep: sleepTimeMinutes,
            actualSleep: null,
            autoSaved: true,
            predictedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            inputs: snapshotPredictionInputs()
        };
    }

    lastAutoSavePredictionTime = now;
    lastAutoSavePredictionMinutes = sleepTimeMinutes;
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
        state.history[id] = {
            id: id,
            date: today,
            medications: getValues(state.medications),
            caffeine: getValues(state.caffeine),
            modifiers: JSON.parse(JSON.stringify(state.modifiers)),
            predictedSleep: sleepTime,
            actualSleep: null,
            autoSaved: false,
            predictedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            inputs: snapshotPredictionInputs()
        };
    }

    saveState();
    renderHistory();
    showToast('Day saved! Log actual sleep time tomorrow.');
}

function toggleHistorySection() {
    const content = document.getElementById('historyContent');
    const icon = document.getElementById('historyToggleIcon');
    if (!content) return;
    const isOpen = content.style.display !== 'none';
    content.style.display = isOpen ? 'none' : 'block';
    if (icon) icon.innerHTML = isOpen ? '&#9654;' : '&#9660;';
}

// Auto-populate feedback from sleep history (wakeTime - hoursSlept = sleep onset)
function autoPopulateFeedback() {
    const historyValues = getValues(state.history);
    let updated = false;
    let yesterdayFeedback = null;

    historyValues.forEach(entry => {
        if (entry.actualSleep !== null && entry.actualSleep !== undefined) return;
        if (!entry.date || !entry.predictedSleep) return;

        const entryDate = parseLocalDate(entry.date);
        const nextDay = new Date(entryDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = getLocalDateString(nextDay);

        const sleepEntry = state.sleepHistory[nextDayStr];
        if (!sleepEntry) return;

        const hoursSlept = typeof sleepEntry === 'number' ? sleepEntry : (sleepEntry && sleepEntry.hoursSlept);
        const wakeTime = typeof sleepEntry === 'object' ? sleepEntry.wakeTime : null;

        if (hoursSlept != null && !isNaN(hoursSlept) && wakeTime) {
            let wakeMinutes = timeToMinutes(wakeTime);
            let actualSleep = wakeMinutes - (hoursSlept * 60);
            if (actualSleep < 0) actualSleep += 24 * 60;

            state.history[entry.id].actualSleep = actualSleep;
            state.history[entry.id].autoFilled = true;
            state.history[entry.id].deltaMinutes = computeSleepDelta(entry.predictedSleep, actualSleep);
            state.history[entry.id].absError = Math.abs(state.history[entry.id].deltaMinutes);
            updated = true;

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

    const historyValues = getValues(state.history).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (historyValues.length === 0) {
        container.innerHTML = '<p style="color: #b0b8c4; text-align: center; padding: 20px;">No history yet. Save today\'s data to start tracking accuracy.</p>';
        return;
    }

    // Show up to 30 entries (expanded from 10)
    const displayCount = 30;
    const entriesToShow = historyValues.slice(0, displayCount);

    let html = entriesToShow.map(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
            accuracyClass = diffMins <= 30 ? 'style="color: #10b981;"' : diffMins <= 60 ? 'style="color: #f59e0b;"' : 'style="color: #ef4444;"';
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
        html += `<p style="color: #b0b8c4; text-align: center; padding: 10px; font-size: 0.85em;">
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
            const color = errMins <= 30 ? '#10b981' : errMins <= 60 ? '#f59e0b' : '#ef4444';
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
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const isToday = i === 0;

        days.push({ dateStr, dayName, dayNum, isToday });
    }

    container.innerHTML = days.map(day => {
        const entry = state.sleepHistory[day.dateStr];
        // Handle both old format (just number) and new format (object)
        const hoursSlept = entry ? (typeof entry === 'object' ? entry.hoursSlept : entry) : undefined;
        const wakeTime = entry && typeof entry === 'object' ? entry.wakeTime : undefined;
        const hasData = hoursSlept !== undefined;

        let bgColor, borderColor, textColor, statusText, wakeTimeDisplay;

        if (!hasData) {
            bgColor = 'rgba(0,0,0,0.2)';
            borderColor = 'rgba(255,255,255,0.1)';
            textColor = '#6e7681';
            statusText = '—';
            wakeTimeDisplay = '';
        } else if (hoursSlept > 6.5) {
            bgColor = 'rgba(16, 185, 129, 0.2)';
            borderColor = '#10b981';
            textColor = '#10b981';
            statusText = `${hoursSlept.toFixed(1)}h`;
            wakeTimeDisplay = wakeTime ? formatTime12(wakeTime) : '';
        } else if (hoursSlept >= 4.5) {
            bgColor = 'rgba(245, 158, 11, 0.2)';
            borderColor = '#f59e0b';
            textColor = '#f59e0b';
            statusText = `${hoursSlept.toFixed(1)}h`;
            wakeTimeDisplay = wakeTime ? formatTime12(wakeTime) : '';
        } else {
            bgColor = 'rgba(239, 68, 68, 0.2)';
            borderColor = '#ef4444';
            textColor = '#ef4444';
            statusText = `${hoursSlept.toFixed(1)}h ⚠️`;
            wakeTimeDisplay = wakeTime ? formatTime12(wakeTime) : '';
        }

        return `
            <div onclick="openSleepEditModal('${day.dateStr}')" style="
                background: ${bgColor};
                border: 2px solid ${borderColor};
                border-radius: 8px;
                padding: 10px 6px;
                text-align: center;
                cursor: pointer;
                transition: transform 0.2s;
                ${day.isToday ? 'box-shadow: 0 0 10px rgba(88, 166, 255, 0.5);' : ''}
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div style="font-size: 0.75em; color: #b0b8c4; margin-bottom: 4px;">${day.dayName}</div>
                <div style="font-size: 1.1em; font-weight: 600; color: #e6edf3; margin-bottom: 2px;">${day.dayNum}</div>
                <div style="font-size: 0.85em; font-weight: 600; color: ${textColor};">${statusText}</div>
                ${wakeTimeDisplay ? `<div style="font-size: 0.65em; color: #b0b8c4; margin-top: 2px;">⏰ ${wakeTimeDisplay}</div>` : ''}
                ${day.isToday ? '<div style="font-size: 0.65em; color: #58a6ff; margin-top: 2px;">TODAY</div>' : ''}
            </div>
        `;
    }).join('');

    // Update circadian phase display
    renderCircadianPhase();
}

function renderCircadianPhase() {
    const container = document.getElementById('circadianPhaseDisplay');
    if (!container) return;

    const analysis = analyzeCircadianPhase();

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px;">
            <div style="flex: 1; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 1.8em;">${analysis.icon}</span>
                    <div>
                        <div style="font-size: 0.75em; color: #b0b8c4; text-transform: uppercase; letter-spacing: 0.5px;">Circadian Phase</div>
                        <div style="font-size: 1.2em; font-weight: 700; color: ${analysis.color};">${analysis.label}</div>
                    </div>
                </div>
                ${analysis.avgWakeTime ? `
                    <div style="display: flex; gap: 20px; font-size: 0.85em; color: #b0b8c4;">
                        <div>
                            <span style="color: #e6edf3; font-weight: 600;">${minutesToTime(analysis.avgWakeTime)}</span> avg wake
                        </div>
                        ${analysis.avgSleep ? `
                            <div>
                                <span style="color: #e6edf3; font-weight: 600;">${analysis.avgSleep.toFixed(1)}h</span> avg sleep
                            </div>
                        ` : ''}
                        ${analysis.dataPoints ? `
                            <div>
                                <span style="color: #e6edf3; font-weight: 600;">${analysis.dataPoints}</span> days logged
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            ${analysis.consistency !== undefined && analysis.dataPoints >= 3 ? `
                <div style="text-align: right;">
                    <div style="font-size: 0.75em; color: #b0b8c4;">Consistency</div>
                    <div style="font-size: 1.4em; font-weight: 700; color: ${analysis.consistency > 70 ? '#10b981' : analysis.consistency > 40 ? '#f59e0b' : '#ef4444'};">${Math.round(analysis.consistency)}%</div>
                    ${analysis.stdDev ? `<div style="font-size: 0.7em; color: #6e7681;">±${Math.round(analysis.stdDev)}min variation</div>` : ''}
                </div>
            ` : ''}
        </div>
        <div style="margin-top: 12px; padding: 12px; background: rgba(${analysis.color === '#ef4444' ? '239, 68, 68' : analysis.color === '#f59e0b' ? '245, 158, 11' : analysis.color === '#10b981' ? '16, 185, 129' : '88, 166, 255'}, 0.1); border-radius: 8px; border-left: 3px solid ${analysis.color};">
            <div style="font-size: 0.85em; color: #c9d1d9; line-height: 1.5; white-space: pre-wrap;">${analysis.recommendation}</div>
        </div>
    `;
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

    saveState();

    // If clearing today, reset main inputs to defaults
    const today = getLocalDateString();
    if (currentEditingDate === today) {
        state.hoursSleptLastNight = 7; // Reset to default
        document.getElementById('hoursSlept').value = 7;
        recalculate();
    }

    renderSleepCalendar();
    renderSleepPerformance();
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

    saveState();

    // If editing today, also update the main inputs
    const today = getLocalDateString();
    if (currentEditingDate === today) {
        state.hoursSleptLastNight = hours;
        state.wakeTime = wakeTime;
        document.getElementById('hoursSlept').value = hours;
        document.getElementById('wakeTime').value = wakeTime;
        recalculate();
    }

    renderSleepCalendar();
    renderSleepPerformance();
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

    renderSleepCalendar();
    renderSleepPerformance();
}

// Also update when wake time changes
function updateTodayWakeTime() {
    const today = getLocalDateString();
    const existing = state.sleepHistory[today];

    state.sleepHistory[today] = {
        hoursSlept: existing && typeof existing === 'object' ? existing.hoursSlept : state.hoursSleptLastNight,
        wakeTime: state.wakeTime
    };

    renderSleepCalendar();
    renderSleepPerformance();
}

// ============================================
// 30-DAY SLEEP PERFORMANCE TRACKING
// ============================================

function toggleSleepPerformance() {
    sleepPerfExpanded = !sleepPerfExpanded;
    const content = document.getElementById('sleepPerformanceContent');
    const icon = document.getElementById('sleepPerfToggleIcon');

    if (content) {
        content.style.display = sleepPerfExpanded ? 'block' : 'none';
    }
    if (icon) {
        icon.textContent = sleepPerfExpanded ? '▼' : '▶';
    }
}

function toggleAccuracyDashboard() {
    accuracyDashExpanded = !accuracyDashExpanded;
    const content = document.getElementById('accuracyDashboardContent');
    const icon = document.getElementById('accuracyToggleIcon');
    if (content) content.style.display = accuracyDashExpanded ? 'block' : 'none';
    if (icon) icon.textContent = accuracyDashExpanded ? '\u25bc' : '\u25b6';
}

function renderAccuracyDashboard() {
    const stats = calculateAccuracyStats(30);
    const cal = getCalibrationRecommendation();

    const avgErr = stats.avgAbsError;
    const hasData = stats.entriesWithFeedback >= 1;
    const hasEnough = stats.entriesWithFeedback >= 3;

    let gradeColor = '#10b981', gradeBg = 'rgba(16,185,129,0.1)', gradeBorder = 'rgba(16,185,129,0.2)';
    if (avgErr > 60) { gradeColor = '#ef4444'; gradeBg = 'rgba(239,68,68,0.1)'; gradeBorder = 'rgba(239,68,68,0.2)'; }
    else if (avgErr > 30) { gradeColor = '#f59e0b'; gradeBg = 'rgba(245,158,11,0.1)'; gradeBorder = 'rgba(245,158,11,0.2)'; }

    const banner = document.getElementById('accuracyGradeBanner');
    if (banner) { banner.style.background = gradeBg; banner.style.borderColor = gradeBorder; }

    const gradeVal = document.getElementById('accuracyGradeValue');
    if (gradeVal) {
        gradeVal.textContent = hasEnough ? '\u00b1' + avgErr + ' min' : '--';
        gradeVal.style.color = gradeColor;
    }
    const gradeLabel = document.getElementById('accuracyGradeLabel');
    if (gradeLabel) gradeLabel.textContent = hasData ? stats.entriesWithFeedback + ' predictions tracked' : 'Need 3+ days with feedback';

    const daysEl = document.getElementById('accStatDaysTracked');
    if (daysEl) daysEl.textContent = hasData ? stats.entriesWithFeedback : '--';

    const avgEl = document.getElementById('accStatAvgError');
    if (avgEl) { avgEl.textContent = hasEnough ? '\u00b1' + avgErr + 'm' : '--'; avgEl.style.color = gradeColor; }

    const w30El = document.getElementById('accStatWithin30');
    if (w30El) {
        w30El.textContent = hasEnough ? stats.within30min + '%' : '--';
        if (hasEnough) w30El.style.color = stats.within30min >= 50 ? '#10b981' : stats.within30min >= 30 ? '#f59e0b' : '#ef4444';
    }
    const w60El = document.getElementById('accStatWithin60');
    if (w60El) {
        w60El.textContent = hasEnough ? stats.within60min + '%' : '--';
        if (hasEnough) w60El.style.color = stats.within60min >= 70 ? '#10b981' : stats.within60min >= 50 ? '#f59e0b' : '#ef4444';
    }

    const bar30Fill = document.getElementById('accBar30Fill');
    const bar30Label = document.getElementById('accBar30Label');
    if (bar30Fill) bar30Fill.style.width = (hasEnough ? stats.within30min : 0) + '%';
    if (bar30Label) bar30Label.textContent = (hasEnough ? stats.within30min : 0) + '%';

    const bar60Fill = document.getElementById('accBar60Fill');
    const bar60Label = document.getElementById('accBar60Label');
    if (bar60Fill) bar60Fill.style.width = (hasEnough ? stats.within60min : 0) + '%';
    if (bar60Label) bar60Label.textContent = (hasEnough ? stats.within60min : 0) + '%';

    const trendBox = document.getElementById('accuracyTrendBox');
    const trendText = document.getElementById('accuracyTrendText');
    if (trendBox && trendText) {
        trendBox.style.borderLeftColor = gradeColor;
        if (!hasEnough) {
            trendText.innerHTML = '\ud83d\udca1 Track 3+ days to see accuracy analysis';
        } else {
            const trendLabel = stats.trend === 'improving' ? 'Improving \u2191' : stats.trend === 'worsening' ? 'Worsening \u2193' : 'Stable';
            const recIcon = avgErr <= 30 ? '\u2713' : avgErr <= 60 ? '\u26a0\ufe0f' : '\ud83d\udd27';
            trendText.innerHTML = '<strong>' + trendLabel + '</strong> ' + recIcon + '<br><span style="font-size:0.9em; color:#8b9cb6;">\ud83d\udca1 ' + cal.recommendation + '</span>';
        }
    }

    renderAccuracyHeroHint(stats);
}

function renderAccuracyHeroHint(stats) {
    const el = document.getElementById('accuracyHeroHint');
    if (!el) return;
    if (!stats || stats.entriesWithFeedback < 3) { el.style.display = 'none'; return; }
    const avgErr = stats.avgAbsError;
    const color = avgErr <= 30 ? '#10b981' : avgErr <= 60 ? '#f59e0b' : '#ef4444';
    el.innerHTML = 'Historical accuracy: <span style="color:' + color + '; font-weight:600;">\u00b1' + avgErr + ' min</span> (' + stats.entriesWithFeedback + ' days)';
    el.style.display = 'block';
}

function getSleepDataForDays(numDays) {
    const today = new Date();
    const data = [];

    for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString(date);

        const entry = state.sleepHistory[dateStr];
        let hoursSlept = null;

        if (entry) {
            if (typeof entry === 'number') {
                hoursSlept = entry;
            } else if (typeof entry === 'object' && entry.hoursSlept !== undefined) {
                hoursSlept = entry.hoursSlept;
            }
        }

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

function renderSleepPerformance() {
    const data = getSleepDataForDays(30);
    // null = unlogged, 0 = all-nighter (valid data)
    const validData = data.filter(d => d.hoursSlept !== null);

    // Store data globally for tooltip access
    window.sleepGraphData = data;

    // Calculate basic stats
    let avg = 0, best = 0, worst = 0;
    if (validData.length > 0) {
        const hours = validData.map(d => d.hoursSlept);
        avg = hours.reduce((a, b) => a + b, 0) / hours.length;
        best = Math.max(...hours);
        worst = Math.min(...hours); // 0 is valid (all-nighter)

        document.getElementById('sleepStatAvg').textContent = avg.toFixed(1) + 'h';
        document.getElementById('sleepStatBest').textContent = best.toFixed(1) + 'h';
        document.getElementById('sleepStatWorst').textContent = worst.toFixed(1) + 'h';
    } else {
        document.getElementById('sleepStatAvg').textContent = '--';
        document.getElementById('sleepStatBest').textContent = '--';
        document.getElementById('sleepStatWorst').textContent = '--';
    }

    // Calculate 7-day trend (compare last 7 days to previous 7 days)
    const last7 = data.slice(-7).filter(d => d.hoursSlept !== null);
    const prev7 = data.slice(-14, -7).filter(d => d.hoursSlept !== null);

    let trend = '—';
    let trendColor = '#8b949e';

    if (last7.length >= 3 && prev7.length >= 3) {
        const recentAvg = last7.reduce((a, d) => a + d.hoursSlept, 0) / last7.length;
        const olderAvg = prev7.reduce((a, d) => a + d.hoursSlept, 0) / prev7.length;
        const diff = recentAvg - olderAvg;

        if (diff > 0.3) {
            trend = `↑+${diff.toFixed(1)}h`;
            trendColor = '#10b981';
        } else if (diff < -0.3) {
            trend = `↓${diff.toFixed(1)}h`;
            trendColor = '#ef4444';
        } else {
            trend = '→ Stable';
            trendColor = '#60a5fa';
        }
    } else if (last7.length >= 2) {
        const recentAvg = last7.reduce((a, d) => a + d.hoursSlept, 0) / last7.length;
        trend = `${recentAvg.toFixed(1)}h avg`;
        trendColor = recentAvg >= 7 ? '#10b981' : recentAvg >= 5.5 ? '#60a5fa' : '#f59e0b';
    }

    document.getElementById('sleepStatTrend').textContent = trend;
    document.getElementById('sleepStatTrend').style.color = trendColor;

    // Calculate Sleep Streak (consecutive days of ≥7h sleep)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Go backwards from today
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].hoursSlept !== null && data[i].hoursSlept >= 7) {
            if (i === data.length - 1 || currentStreak > 0) {
                currentStreak++;
            }
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        } else if (data[i].hoursSlept !== null) {
            if (currentStreak > 0) break; // Current streak broken
            tempStreak = 0;
        }
    }

    const streakEl = document.getElementById('sleepStatStreak');
    if (currentStreak > 0) {
        streakEl.textContent = currentStreak + '🔥';
        streakEl.style.color = currentStreak >= 7 ? '#10b981' : '#fbbf24';
    } else {
        streakEl.textContent = '0';
        streakEl.style.color = '#6b7280';
    }

    // Calculate Sleep Debt (sum of deficit over last 7 days)
    let sleepDebt = 0;
    last7.forEach(d => {
        const deficit = 8 - d.hoursSlept;
        if (deficit > 0) sleepDebt += deficit;
    });

    const debtEl = document.getElementById('sleepStatDebt');
    if (sleepDebt > 0) {
        debtEl.textContent = sleepDebt.toFixed(1) + 'h';
        debtEl.style.color = sleepDebt > 10 ? '#ef4444' : sleepDebt > 5 ? '#f59e0b' : '#f472b6';
    } else {
        debtEl.textContent = '0h ✓';
        debtEl.style.color = '#10b981';
    }

    // Calculate Weekly Sleep Score (0-100)
    let weekScore = 0;
    if (last7.length > 0) {
        // Base score from average hours (max 70 points)
        const avgLast7 = last7.reduce((a, d) => a + d.hoursSlept, 0) / last7.length;
        const avgScore = Math.min(70, (avgLast7 / 8) * 70);

        // Consistency bonus (max 20 points) - low variance = more points
        const variance = last7.reduce((sum, d) => sum + Math.pow(d.hoursSlept - avgLast7, 2), 0) / last7.length;
        const stdDev = Math.sqrt(variance);
        const consistencyScore = Math.max(0, 20 - (stdDev * 10));

        // Streak bonus (max 10 points)
        const streakScore = Math.min(10, currentStreak * 2);

        weekScore = Math.round(avgScore + consistencyScore + streakScore);
    }

    const scoreEl = document.getElementById('sleepStatScore');
    scoreEl.textContent = weekScore > 0 ? weekScore : '--';
    scoreEl.style.color = weekScore >= 80 ? '#10b981' : weekScore >= 60 ? '#22d3ee' : weekScore >= 40 ? '#f59e0b' : '#ef4444';

    // Calculate Days to Recovery (how many 9h nights to clear debt)
    const recoveryEl = document.getElementById('sleepStatRecovery');
    if (sleepDebt > 0) {
        const daysToRecover = Math.ceil(sleepDebt / 1.5); // ~1.5h extra per night to recover
        recoveryEl.textContent = daysToRecover + ' days';
        recoveryEl.style.color = daysToRecover > 7 ? '#ef4444' : daysToRecover > 3 ? '#f59e0b' : '#a8a29e';
    } else {
        recoveryEl.textContent = '✓ Clear';
        recoveryEl.style.color = '#10b981';
    }

    // Render Achievements
    renderSleepAchievements(data, validData, currentStreak, longestStreak, weekScore, sleepDebt, avg);

    // Store stats globally for explainer
    window.sleepStats = {
        avg, best, worst, currentStreak, longestStreak, sleepDebt, weekScore,
        daysLogged: validData.length,
        last7Avg: last7.length > 0 ? last7.reduce((a, d) => a + d.hoursSlept, 0) / last7.length : 0,
        daysToRecover: sleepDebt > 0 ? Math.ceil(sleepDebt / 1.5) : 0
    };

    // Draw graph
    drawSleepPerformanceGraph(data);

    // Setup tooltip hover
    setupSleepGraphTooltip(data, avg);

    // Render history list
    renderSleepHistoryList(data);
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

function showExplainer(key) {
    clearTimeout(explainerTimeout);
    const explainer = document.getElementById('sleepExplainer');
    const content = explainerContent[key];
    const stats = window.sleepStats || { avg: 0, best: 0, worst: 0, currentStreak: 0, longestStreak: 0, sleepDebt: 0, weekScore: 0, daysLogged: 0, daysToRecover: 0 };

    if (!explainer || !content) return;

    document.getElementById('explainerIcon').textContent = content.icon;
    document.getElementById('explainerTitle').textContent = content.title;
    document.getElementById('explainerDesc').textContent = content.getDesc(stats);
    document.getElementById('explainerAction').textContent = '💡 ' + content.getAction(stats);

    explainer.style.display = 'block';
}

function hideExplainer() {
    explainerTimeout = setTimeout(() => {
        const explainer = document.getElementById('sleepExplainer');
        if (explainer) explainer.style.display = 'none';
    }, 100);
}

function renderSleepAchievements(data, validData, currentStreak, longestStreak, weekScore, sleepDebt, avg) {
    const container = document.getElementById('sleepAchievements');
    if (!container) return;

    const best = validData.length > 0 ? Math.max(...validData.map(d => d.hoursSlept)) : 0;

    const achievements = [
        { id: 'first_log', icon: '📝', name: 'First Log', unlocked: validData.length >= 1, color: '#60a5fa' },
        { id: 'week_warrior', icon: '📅', name: 'Week Warrior', unlocked: validData.length >= 7, color: '#8b5cf6' },
        { id: 'month_master', icon: '🗓️', name: 'Month Master', unlocked: validData.length >= 30, color: '#f59e0b' },
        { id: 'streak_3', icon: '🔥', name: '3-Day Streak', unlocked: longestStreak >= 3, color: '#ef4444' },
        { id: 'streak_7', icon: '⚡', name: 'Week Streak', unlocked: longestStreak >= 7, color: '#fbbf24' },
        { id: 'debt_free', icon: '💎', name: 'Debt Free', unlocked: sleepDebt === 0 && validData.length >= 7, color: '#22d3ee' },
        { id: 'perfect_night', icon: '🌟', name: 'Perfect Night', unlocked: best >= 8, color: '#10b981' },
        { id: 'recovery_king', icon: '👑', name: 'Recovery King', unlocked: best >= 10, color: '#f472b6' },
        { id: 'score_80', icon: '🏆', name: 'A+ Student', unlocked: weekScore >= 80, color: '#10b981' },
        { id: 'consistent', icon: '🎯', name: 'Consistent', unlocked: avg >= 7 && validData.length >= 7, color: '#6366f1' }
    ];

    container.innerHTML = achievements.map(a => `
        <div onmouseenter="showExplainer('${a.id}')" onmouseleave="hideExplainer()" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 60px;
            padding: 8px;
            background: ${a.unlocked ? `rgba(${hexToRgb(a.color)}, 0.15)` : 'rgba(0,0,0,0.2)'};
            border: 1px solid ${a.unlocked ? a.color : 'rgba(255,255,255,0.1)'};
            border-radius: 10px;
            opacity: ${a.unlocked ? 1 : 0.4};
            transition: all 0.3s;
            cursor: help;
        ">
            <div style="font-size: 1.4em; ${a.unlocked ? '' : 'filter: grayscale(100%);'}">${a.icon}</div>
            <div style="font-size: 0.55em; color: ${a.unlocked ? a.color : '#6b7280'}; margin-top: 4px; text-align: center; white-space: nowrap;">${a.name}</div>
        </div>
    `).join('');
}

function renderSleepHistoryList(data) {
    const container = document.getElementById('sleepHistoryList');
    if (!container) return;

    // Reverse to show newest first
    const reversed = [...data].reverse();

    container.innerHTML = reversed.map(d => {
        const hasData = d.hoursSlept !== null;

        let bgColor, textColor, statusIcon;
        if (!hasData) {
            bgColor = 'rgba(0,0,0,0.2)';
            textColor = '#6e7681';
            statusIcon = '—';
        } else if (d.hoursSlept >= 7) {
            bgColor = 'rgba(16, 185, 129, 0.15)';
            textColor = '#10b981';
            statusIcon = '✓';
        } else if (d.hoursSlept >= 5.5) {
            bgColor = 'rgba(96, 165, 250, 0.15)';
            textColor = '#60a5fa';
            statusIcon = '○';
        } else if (d.hoursSlept >= 4.5) {
            bgColor = 'rgba(245, 158, 11, 0.15)';
            textColor = '#f59e0b';
            statusIcon = '⚠️';
        } else {
            bgColor = 'rgba(239, 68, 68, 0.15)';
            textColor = '#ef4444';
            statusIcon = '🚨';
        }

        return `
            <div onclick="openSleepEditModal('${d.dateStr}')" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                background: ${bgColor};
                border-radius: 8px;
                cursor: pointer;
                transition: transform 0.15s;
                ${d.isToday ? 'border: 1px solid rgba(88, 166, 255, 0.5);' : ''}
            " onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='scale(1)'">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 1.2em;">${statusIcon}</div>
                    <div>
                        <div style="font-weight: 600; color: #e6edf3; font-size: 0.9em;">
                            ${d.dayName}, ${d.dayLabel}
                            ${d.isToday ? '<span style="color: #58a6ff; font-size: 0.75em; margin-left: 8px;">TODAY</span>' : ''}
                        </div>
                        ${hasData ? `
                            <div style="font-size: 0.8em; color: #b0b8c4;">
                                ${d.hoursSlept.toFixed(1)} hours of sleep
                            </div>
                        ` : `
                            <div style="font-size: 0.8em; color: #6e7681;">No data logged</div>
                        `}
                    </div>
                </div>
                <div style="font-size: 1.3em; font-weight: 700; color: ${textColor};">
                    ${hasData ? d.hoursSlept.toFixed(1) + 'h' : '—'}
                </div>
            </div>
        `;
    }).join('');
}

function showFeedbackModal() {
    // Check if there's a recent entry without feedback
    const recent = getValues(state.history).find(h => h.actualSleep === null);
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

    const recent = getValues(state.history).find(h => h.actualSleep === null);
    if (recent && state.history[recent.id]) {
        const actualMinutes = timeToMinutes(actualTime);
        state.history[recent.id].actualSleep = actualMinutes;
        state.history[recent.id].deltaMinutes = computeSleepDelta(recent.predictedSleep, actualMinutes);
        state.history[recent.id].absError = Math.abs(state.history[recent.id].deltaMinutes);
        saveState();
        renderHistory();
        renderAccuracyDashboard();
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

function getRecentPredictions(n) {
    if (n === undefined) n = 7;
    const entries = getValues(state.history);
    if (entries.length === 0) return [];
    const sorted = entries.slice().sort((a, b) => b.date.localeCompare(a.date));
    return sorted.slice(0, n).map(entry => {
        const hasActual = entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep);
        const hasPredicted = entry.predictedSleep !== null && entry.predictedSleep !== undefined && !isNaN(entry.predictedSleep);
        let delta = null, absError = null;
        if (hasActual && hasPredicted) {
            delta = computeSleepDelta(entry.predictedSleep, entry.actualSleep);
            absError = Math.abs(delta);
        }
        return {
            id: entry.id, date: entry.date,
            predictedSleep: hasPredicted ? entry.predictedSleep : null,
            predictedStr: hasPredicted ? minutesToTime(entry.predictedSleep > 24*60 ? entry.predictedSleep - 24*60 : entry.predictedSleep) : '--:--',
            actualSleep: hasActual ? entry.actualSleep : null,
            actualStr: hasActual ? minutesToTime(entry.actualSleep) : null,
            delta: delta, absError: absError,
            status: hasActual ? (absError <= 30 ? 'accurate' : absError <= 60 ? 'close' : 'off') : 'pending'
        };
    });
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
    const withFeedback = getValues(state.history).filter(h => h.actualSleep !== null).slice(0, 5);
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
