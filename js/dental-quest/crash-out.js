// ==================== CRASH OUT MODE + TIME PROMPTS ====================
// Extracted from index.html Phase 6

// timePromptInterval, lastPromptedTaskId, dismissedUntil extracted to state.js

function startTimePromptChecker() {
    if (timePromptInterval) clearInterval(timePromptInterval);
    timePromptInterval = setInterval(checkForTimePrompts, 15000); // Check every 15 seconds for responsive prompts
}

function checkForTimePrompts() {
    if (!commandCenterData.crashOut || !commandCenterData.crashOut.sleepTime) return;
    // Allow prompts in triage and crashout modes — only block during active focus session
    if (commandCenterMode === 'focus' && currentFocusTaskId) return;

    // Don't show prompts if a task is actively being worked on
    if (currentFocusTaskId) return;
    if (commandCenterData.currentSession && commandCenterData.currentSession.confirmedStarted) return;

    const now = new Date();
    const nowMs = now.getTime();
    const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);

    // Clean up expired dismissals (older than 3 minutes)
    for (const tid in dismissedUntil) {
        if (dismissedUntil[tid] <= nowMs) {
            delete dismissedUntil[tid];
        }
    }

    // Find task that should be starting now
    for (const task of scheduledTasks) {
        if (!task.crashOutTime) continue;

        // Skip if already prompted for this task at this time
        if (task.id === lastPromptedTaskId) continue;

        // Skip if within 3-minute dismiss cooldown
        if (dismissedUntil[task.id] && dismissedUntil[task.id] > nowMs) continue;

        // Use parseCrashOutTime() which handles non-breaking spaces from toLocaleTimeString
        const taskTime = parseCrashOutTime(task.crashOutTime);
        if (!taskTime) continue;

        // If within 2 minutes of start time
        const diff = now - taskTime;
        if (diff >= -30000 && diff <= 600000) {
            lastPromptedTaskId = task.id;
            showTimePrompt(task);
            return;
        }
    }

    // Catch-up: show prompt for first past-due unstarted task
    const pastDueTasks = scheduledTasks.filter(task => {
        if (!task.crashOutTime || task.id === lastPromptedTaskId) return false;
        if (dismissedUntil[task.id] && dismissedUntil[task.id] > nowMs) return false;
        const taskTime = parseCrashOutTime(task.crashOutTime);
        if (!taskTime) return false;
        return (now - taskTime) > 0;
    });
    if (pastDueTasks.length > 0) {
        lastPromptedTaskId = pastDueTasks[0].id;
        showTimePrompt(pastDueTasks[0]);
    }
}

function showTimePrompt(task) {
    // Close any existing prompt modal to prevent stacking
    const existing = document.getElementById('timePromptModal');
    if (existing) existing.remove();

    const todayTasks = typeof getTodayTriageTasks === 'function' ? getTodayTriageTasks() : [];
    const completed = todayTasks.filter(t => t.completed).length;
    const total = todayTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const modal = document.createElement('div');
    modal.className = 'time-prompt-modal-enhanced';
    modal.id = 'timePromptModal';
    modal.innerHTML = `
        <div class="time-prompt-content-enhanced">
            <div class="nudge-progress">${completed}/${total} done today &middot; ${pct}%</div>
            <div style="color: var(--text-muted, #64748b); font-size: 0.9em;">It's ${task.crashOutTime}</div>
            <div style="color: var(--text-secondary, #94a3b8); margin-bottom: 4px;">Time to start:</div>
            <div class="nudge-task-name">${task.triageTier === 'lockedIn' ? '&#x1F525;' : '&#x1F4CB;'} ${typeof escapeHtml === 'function' ? escapeHtml(task.text) : task.text}</div>
            <button class="nudge-start-btn" onclick="startTaskFromPrompt('${task.id}')">&#x25B6; START NOW</button>
            <div style="color: var(--text-muted, #64748b); font-size: 0.85em; margin-top: 8px;">Not ready? Push all tasks:</div>
            <div class="nudge-push-grid">
                <button class="nudge-push-btn" onclick="pushAllTasks(5)">+5m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(10)">+10m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(15)">+15m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(20)">+20m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(30)">+30m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(45)">+45m</button>
                <button class="nudge-push-btn" onclick="pushAllTasks(60)">+60m</button>
            </div>
            <div class="nudge-dismiss-row">
                <button class="nudge-dismiss-btn" onclick="skipTask('${task.id}')">Dismiss</button>
                <button class="nudge-remove-btn" onclick="removeTaskFromSchedule('${task.id}')">Remove</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function startTaskFromPrompt(taskId) {
    closeTimePrompt();
    // Auto-start timer when task is confirmed from crash out prompt
    startTaskInFocus(taskId, true);
    showToast('Task started! Timer running.', '▶️');
}

function closeTimePrompt() {
    const modal = document.getElementById('timePromptModal');
    if (modal) modal.remove();
    // Reset so future prompts can fire (dismissedUntil handles dismiss-specific blocking)
    lastPromptedTaskId = null;
}

// Push all tasks forward by X minutes with cascade animation
var undoState = null;
var undoTimeout = null;

function pushAllTasks(minutes) {
    closeTimePrompt();

    // CRITICAL: Reset tracking so popups re-appear at new times
    lastPromptedTaskId = null;
    dismissedUntil = {}; // Clear dismiss cooldowns since all times are changing

    // Save state for undo
    const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    undoState = scheduledTasks.map(t => ({ id: t.id, time: t.crashOutTime }));

    // Add minutes to all scheduled tasks (direct mutation keeps cache valid)
    scheduledTasks.forEach(task => {
        if (task.crashOutTime) {
            const parsedTime = parseCrashOutTime(task.crashOutTime);
            if (!parsedTime) return;
            const newTime = new Date(parsedTime.getTime() + minutes * 60 * 1000);
            task.crashOutTime = newTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        }
    });

    // Show cascade animation
    showCascadeAnimation();

    // Only re-render crashout UI if we're in crashout mode; push works from any page
    if (commandCenterMode === 'crashout') {
        renderCrashOutMode();
    }
    saveData();

    // Show undo toast
    showUndoToast(minutes);

    // Schedule a re-check so popup re-appears when new time arrives (works from any mode)
    setTimeout(() => {
        checkForTimePrompts();
    }, minutes * 60 * 1000 + 5000); // Re-check 5 seconds after the pushed time arrives
}

function showCascadeAnimation() {
    // Use correct selector - timeline tasks have data-task-id attribute
    const taskElements = document.querySelectorAll('[data-task-id]');
    taskElements.forEach((el, i) => {
        setTimeout(() => {
            el.classList.add('cascade-shift');
            setTimeout(() => el.classList.remove('cascade-shift'), 500);
        }, i * 100);
    });
}

function showUndoToast(minutes) {
    // Remove existing toast
    const existing = document.querySelector('.undo-toast');
    if (existing) existing.remove();

    var countdown = 10;
    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `
        <span>Pushed all tasks +${minutes}m</span>
        <button onclick="undoPush()">Undo</button>
        <div class="countdown">${countdown}</div>
    `;
    document.body.appendChild(toast);

    const countdownEl = toast.querySelector('.countdown');
    const interval = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(interval);
            toast.remove();
            undoState = null;
        }
    }, 1000);

    if (undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
        toast.remove();
        undoState = null;
    }, 10000);
}

function undoPush() {
    if (!undoState) return;

    undoState.forEach(({ id, time }) => {
        if (tasks[id]) {
            tasks[id].crashOutTime = time;
        }
    });

    undoState = null;
    dismissedUntil = {}; // Clear since times changed back
    lastPromptedTaskId = null;
    const toast = document.querySelector('.undo-toast');
    if (toast) toast.remove();
    if (undoTimeout) clearTimeout(undoTimeout);

    if (commandCenterMode === 'crashout') {
        renderCrashOutMode();
    }
    saveData();
    showToast('Undone!', '↩️');
}

function skipTask(taskId) {
    closeTimePrompt();
    // Set 3-minute cooldown before this task can prompt again
    dismissedUntil[taskId] = Date.now() + 3 * 60 * 1000;
    showToast('Dismissed for 3 min - task stays in schedule', '⏭️');
}

function removeTaskFromSchedule(taskId) {
    // Use this to actually remove from crash out (renamed from old skipTask behavior)
    closeTimePrompt();
    removeFromCrashOut(taskId);
    showToast('Task removed from schedule', '🗑️');
}

// ==================== CRASH OUT MODE ====================
// crashOutTimelineInterval, nowTimeInterval, gcalGridParams extracted to state.js

function startCrashOutTimelineInterval() {
    if (crashOutTimelineInterval) clearInterval(crashOutTimelineInterval);
    if (nowTimeInterval) clearInterval(nowTimeInterval);
    // Full rebuild every 60 seconds (repositions NOW between tasks)
    crashOutTimelineInterval = setInterval(() => {
        if (commandCenterData.crashOut && commandCenterData.crashOut.sleepTime) {
            renderCrashOutTimeline();
        }
    }, 60000);
    // Lightweight NOW time text update every 15 seconds
    nowTimeInterval = setInterval(updateNowMarkerTime, 15000);
}

function stopCrashOutTimelineInterval() {
    if (crashOutTimelineInterval) {
        clearInterval(crashOutTimelineInterval);
        crashOutTimelineInterval = null;
    }
    if (nowTimeInterval) {
        clearInterval(nowTimeInterval);
        nowTimeInterval = null;
    }
}

function renderCrashOutMode() {
    const setupEl = document.getElementById('crashOutSetup');
    const timelineEl = document.getElementById('crashOutTimeline');

    if (!commandCenterData.crashOut.sleepTime) {
        // Show setup screen
        if (setupEl) setupEl.style.display = 'block';
        if (timelineEl) timelineEl.style.display = 'none';
        updateCrashOutSetupDate();
        stopCrashOutTimelineInterval();
    } else {
        // Show timeline
        if (setupEl) setupEl.style.display = 'none';
        if (timelineEl) timelineEl.style.display = 'block';
        renderCrashOutTimeline();
        startCrashOutTimelineInterval();
    }
}

function updateCrashOutSetupDate() {
    const el = document.getElementById('crashOutSetupDate');
    if (el) {
        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[now.getDay()];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[now.getMonth()];
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        el.textContent = `📅 It's ${dayName}, ${monthName} ${now.getDate()} • ${timeStr}`;
    }
}

function setCrashOutSleep(option) {
    var sleepTime;
    const now = new Date();

    if (option === 'tonight') {
        sleepTime = new Date(now);
        sleepTime.setHours(23, 0, 0, 0);
        if (sleepTime <= now) {
            sleepTime.setDate(sleepTime.getDate() + 1);
        }
    } else if (option === 'latenight') {
        // 2:00 AM - for late night work sessions
        sleepTime = new Date(now);
        sleepTime.setDate(sleepTime.getDate() + 1);
        sleepTime.setHours(2, 0, 0, 0);
    }

    if (sleepTime) {
        commandCenterData.crashOut.sleepTime = sleepTime.toISOString();
        recalculateScheduledTimes();
        saveData();
        renderCrashOutMode();
    }
}

function showCustomSleepPicker() {
    const picker = document.getElementById('customSleepPicker');
    if (picker) picker.style.display = 'block';
}

function hideCustomSleepPicker() {
    const picker = document.getElementById('customSleepPicker');
    if (picker) picker.style.display = 'none';
}

function setCustomSleepTime() {
    const input = document.getElementById('customSleepTime');
    if (!input || !input.value) {
        showToast('Please select a time', '⚠️');
        return;
    }

    const [hours, minutes] = input.value.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        showToast('Invalid time format', '⚠️');
        return;
    }

    const sleepTime = new Date();
    sleepTime.setHours(hours, minutes, 0, 0);

    // If time is in the past, assume tomorrow
    if (sleepTime <= new Date()) {
        sleepTime.setDate(sleepTime.getDate() + 1);
    }

    commandCenterData.crashOut.sleepTime = sleepTime.toISOString();
    hideCustomSleepPicker();
    recalculateScheduledTimes();
    saveData();
    renderCrashOutMode();

    const timeStr = sleepTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    showToast(`Sleep time set: ${timeStr}`, '✓');
}

function changeSleepTime() {
    commandCenterData.crashOut.sleepTime = null;
    saveData();
    renderCrashOutMode();
}

function adjustSleepTime(minutesDelta) {
    if (!commandCenterData.crashOut || !commandCenterData.crashOut.sleepTime) return;

    const currentSleep = new Date(commandCenterData.crashOut.sleepTime);
    const newSleep = new Date(currentSleep.getTime() + minutesDelta * 60 * 1000);

    // Don't allow sleep time to be in the past
    if (newSleep <= new Date()) {
        showToast('Sleep time cannot be in the past', '⚠️');
        return;
    }

    commandCenterData.crashOut.warningDismissed = false;
    commandCenterData.crashOut.sleepTime = newSleep.toISOString();
    recalculateScheduledTimes();
    saveData();
    renderCrashOutTimeline();

    const timeStr = newSleep.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    showToast('Sleep time: ' + timeStr, '✓');
}
window.adjustSleepTime = adjustSleepTime;

function renderCrashOutTimeline() {
    if (!commandCenterData.crashOut || !commandCenterData.crashOut.sleepTime) return;

    const sleepTime = new Date(commandCenterData.crashOut.sleepTime);
    const now = new Date();
    const msUntilSleep = sleepTime - now;
    const hoursUntilSleep = msUntilSleep / (1000 * 60 * 60);
    const windDownStart = new Date(sleepTime.getTime() - 60 * 60 * 1000); // 1 hour before

    // Update time displays
    const timeUntilEl = document.getElementById('timeUntilSleep');
    const sleepMarkerEl = document.getElementById('sleepMarkerTime');
    const currentTimeEl = document.getElementById('currentTimeDisplay');
    const windDownEl = document.getElementById('windDownTimeRange');

    const sleepTimeStr = sleepTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const windDownStartStr = windDownStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (hoursUntilSleep > 0) {
        const hours = Math.floor(hoursUntilSleep);
        const minutes = Math.floor((hoursUntilSleep % 1) * 60);
        if (timeUntilEl) timeUntilEl.textContent = `${hours}h ${minutes}m until sleep (${sleepTimeStr})`;
    } else {
        if (timeUntilEl) timeUntilEl.textContent = `Past sleep time (${sleepTimeStr})`;
    }

    if (sleepMarkerEl) sleepMarkerEl.textContent = sleepTimeStr;
    if (currentTimeEl) currentTimeEl.textContent = currentTimeStr;
    if (windDownEl) windDownEl.textContent = `${windDownStartStr} - ${sleepTimeStr}`;

    // Update inline sleep time label in header adjuster
    const sleepLabelEl = document.getElementById('sleepTimeLabel');
    if (sleepLabelEl) sleepLabelEl.textContent = sleepTimeStr;

    // Calculate scheduled time based on LAST TASK'S END TIME vs WIND-DOWN START
    const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    const totalScheduledMinutes = scheduledTasks.reduce((sum, t) => sum + (t.crashOutDuration || 30), 0);

    // Find the last task's end time by looking at tasks with crashOutTime
    var lastTaskEndTime = null;
    scheduledTasks.forEach(task => {
        if (task.crashOutTime) {
            const startDate = parseCrashOutTime(task.crashOutTime);
            if (startDate) {
                const endDate = new Date(startDate.getTime() + (task.crashOutDuration || 30) * 60 * 1000);
                if (!lastTaskEndTime || endDate > lastTaskEndTime) {
                    lastTaskEndTime = endDate;
                }
            }
        }
    });

    // Calculate scheduling status based on last task end vs wind-down start
    const scheduledTextEl = document.getElementById('scheduledTimeText');
    const progressEl = document.getElementById('crashOutTimelineProgress');
    const warningEl = document.getElementById('overscheduledWarning');
    const overByEl = document.getElementById('overByAmount');

    if (lastTaskEndTime && windDownStart) {
        const gapMinutes = (windDownStart - lastTaskEndTime) / (1000 * 60);
        const gapHours = Math.abs(gapMinutes / 60).toFixed(1);

        if (scheduledTextEl) {
            const totalH = (totalScheduledMinutes / 60).toFixed(1);
            if (gapMinutes < 0) {
                // Overscheduled: last task ends AFTER wind-down starts
                scheduledTextEl.textContent = `${totalH}h scheduled • ${gapHours}h over wind-down`;
            } else if (gapMinutes < 30) {
                // Tight but OK
                scheduledTextEl.textContent = `${totalH}h scheduled • ${Math.round(gapMinutes)}m buffer`;
            } else {
                // Good buffer
                scheduledTextEl.textContent = `${totalH}h scheduled • ${gapHours}h buffer until wind-down`;
            }
        }

        // Progress bar: show how much of time until wind-down is used
        if (progressEl) {
            const timeUntilWindDown = Math.max(0, (windDownStart - now) / (1000 * 60)); // minutes until wind-down
            const percent = timeUntilWindDown > 0 ? Math.min(150, (totalScheduledMinutes / timeUntilWindDown) * 100) : 0;
            progressEl.style.width = `${Math.min(100, percent)}%`;
            if (gapMinutes < 0) {
                progressEl.classList.add('overscheduled');
                progressEl.classList.remove('tight');
            } else if (gapMinutes < 30) {
                progressEl.classList.add('tight');
                progressEl.classList.remove('overscheduled');
            } else {
                progressEl.classList.remove('overscheduled', 'tight');
            }
        }

        // Show warning only if tasks end AFTER wind-down starts AND not dismissed
        const warningDismissed = commandCenterData.crashOut && commandCenterData.crashOut.warningDismissed;
        if (gapMinutes < 0 && !warningDismissed) {
            if (warningEl) warningEl.classList.remove('hidden');
            if (overByEl) overByEl.textContent = `${gapHours}h`;
        } else {
            if (warningEl) warningEl.classList.add('hidden');
        }
    } else {
        // No scheduled tasks with times, or no wind-down set
        const availableMinutes = Math.max(0, (hoursUntilSleep - 1) * 60);
        if (scheduledTextEl) {
            const scheduledH = (totalScheduledMinutes / 60).toFixed(1);
            const availH = (availableMinutes / 60).toFixed(1);
            scheduledTextEl.textContent = `${scheduledH}h / ${availH}h scheduled`;
        }
        if (progressEl) {
            const percent = availableMinutes > 0 ? Math.min(100, (totalScheduledMinutes / availableMinutes) * 100) : 0;
            progressEl.style.width = `${percent}%`;
            progressEl.classList.remove('overscheduled');
        }
        if (warningEl) warningEl.classList.add('hidden');
    }

    // Render Google Calendar grid with tasks, NOW marker, wind-down, and sleep
    renderCrashOutTimelineTasks(scheduledTasks, now, sleepTime, windDownStart);

    // Render unscheduled pool
    renderUnscheduledPool();
}

function renderCrashOutTimelineTasks(scheduledTasks, now, sleepTime, windDownStart) {
    const container = document.getElementById('timelineContent');
    if (!container) return;

    var PX_PER_HOUR = 80;

    // Calculate grid range: floor now to current hour, ceil sleep to next hour
    var gridStart = new Date(now);
    gridStart.setMinutes(0, 0, 0);

    var gridEnd = new Date(sleepTime);
    if (gridEnd.getMinutes() > 0 || gridEnd.getSeconds() > 0) {
        gridEnd.setHours(gridEnd.getHours() + 1);
    }
    gridEnd.setMinutes(0, 0, 0);
    // Add 1 more hour padding after sleep
    gridEnd.setHours(gridEnd.getHours() + 1);

    // Ensure at least 2 hours of grid
    if (gridEnd <= gridStart) {
        gridEnd.setTime(gridStart.getTime() + 2 * 60 * 60 * 1000);
    }

    var totalMs = gridEnd - gridStart;
    var totalHours = totalMs / (1000 * 60 * 60);
    var totalHeight = totalHours * PX_PER_HOUR;

    // Store for lightweight NOW updates
    gcalGridParams = { gridStartMs: gridStart.getTime(), pxPerHour: PX_PER_HOUR };

    function timeToPx(time) {
        var ms = (time instanceof Date ? time.getTime() : time) - gridStart.getTime();
        return (ms / (1000 * 60 * 60)) * PX_PER_HOUR;
    }

    function formatHourLabel(date) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    }

    // Pre-compute maximum bottom position to ensure grid contains all elements
    var maxBottom = totalHeight;
    scheduledTasks.forEach(function(task) {
        if (task.crashOutTime) {
            var tsd = parseCrashOutTime(task.crashOutTime);
            if (tsd) {
                var taskTop = timeToPx(tsd);
                var heightPx = Math.max(36, ((task.crashOutDuration || 30) / 60) * PX_PER_HOUR);
                maxBottom = Math.max(maxBottom, taskTop + heightPx);
            }
        }
    });
    // Wind-down block bottom
    maxBottom = Math.max(maxBottom, timeToPx(windDownStart) + PX_PER_HOUR);
    // Sleep marker with padding
    maxBottom = Math.max(maxBottom, timeToPx(sleepTime) + 40);

    var gridHeight = maxBottom;
    var html = '<div class="timeline-grid" style="height: ' + gridHeight + 'px;">';

    // --- Hour grid lines ---
    var hourTime = new Date(gridStart);
    while (hourTime <= gridEnd) {
        var top = timeToPx(hourTime);
        var label = formatHourLabel(hourTime);
        html += '<div class="gcal-hour" style="top: ' + top + 'px;">';
        html += '<span class="gcal-hour-label">' + label + '</span>';
        html += '<div class="gcal-hour-line"></div>';
        html += '</div>';
        // Half-hour line
        var halfHour = new Date(hourTime.getTime() + 30 * 60 * 1000);
        if (halfHour < gridEnd) {
            var halfTop = timeToPx(halfHour);
            html += '<div class="gcal-half-line" style="top: ' + halfTop + 'px;"></div>';
        }
        hourTime = new Date(hourTime.getTime() + 60 * 60 * 1000);
    }

    // --- NOW marker (single red line + dot) ---
    var nowTop = timeToPx(now);
    html += '<div class="gcal-now" id="gcalNowMarker" style="top: ' + nowTop + 'px;">';
    html += '<div class="gcal-now-dot"></div>';
    html += '<div class="gcal-now-ruler"></div>';
    html += '</div>';

    // --- Task blocks ---
    if (scheduledTasks.length === 0) {
        html += '<div class="gcal-empty" style="top: ' + (nowTop + 20) + 'px;">';
        html += '<div class="gcal-empty-icon">📋</div>';
        html += '<div class="gcal-empty-text">No tasks scheduled yet</div>';
        html += '<div class="gcal-empty-hint">Send tasks from Triage or add from below</div>';
        html += '</div>';
    } else {
        scheduledTasks.forEach(function(task, index) {
            var isLockedIn = task.triageTier === 'lockedIn';
            var tierIcon = isLockedIn ? '🔥' : '📋';
            var duration = task.crashOutDuration || 30;
            var isFirst = index === 0;
            var isLast = index === scheduledTasks.length - 1;

            var startTimeStr = task.crashOutTime || 'TBD';
            var endTimeStr = '';
            var tsd = null;
            if (task.crashOutTime) {
                tsd = parseCrashOutTime(task.crashOutTime);
                if (tsd) {
                    var endDate = new Date(tsd.getTime() + duration * 60 * 1000);
                    endTimeStr = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                }
            }

            var taskEndTime = tsd ? new Date(tsd.getTime() + duration * 60 * 1000) : null;
            var isElapsed = tsd && taskEndTime && taskEndTime < now;
            var isActiveNow = tsd && tsd <= now && taskEndTime > now;

            // Position and size
            var taskTop = tsd ? timeToPx(tsd) : (nowTop + 20);
            var heightPx = Math.max(36, (duration / 60) * PX_PER_HOUR);

            var stateClass = (isLockedIn ? ' locked-in' : '') + (isElapsed ? ' elapsed' : '') + (isActiveNow ? ' active-now' : '');

            html += '<div class="gcal-task' + stateClass + '" '
                + 'data-task-id="' + task.id + '" data-order="' + (task.crashOutOrder ?? index) + '" '
                + 'style="top: ' + taskTop + 'px; height: ' + heightPx + 'px;" '
                + 'draggable="true" '
                + 'ondragstart="handleTimelineDragStart(event, \'' + task.id + '\')" '
                + 'ondragover="handleTimelineDragOver(event)" '
                + 'ondragleave="handleTimelineDragLeave(event)" '
                + 'ondrop="handleTimelineDrop(event, \'' + task.id + '\')" '
                + 'ondragend="handleTimelineDragEnd(event)">';
            html += '<div class="gcal-task-content">';
            html += '<div class="gcal-task-title">' + tierIcon + ' ' + escapeHtml(task.text) + '</div>';
            html += '<div class="gcal-task-time">' + startTimeStr + (endTimeStr ? ' – ' + endTimeStr : '') + ' · ' + duration + 'm</div>';
            html += '</div>';
            html += '<div class="gcal-task-actions">';
            html += '<div class="reorder-buttons">';
            html += '<button class="btn-reorder" onclick="event.stopPropagation(); moveTaskToTop(\'' + task.id + '\')" ' + (isFirst ? 'disabled' : '') + ' title="Move to top">⬆⬆</button>';
            html += '<button class="btn-reorder" onclick="event.stopPropagation(); moveTaskUp(\'' + task.id + '\')" ' + (isFirst ? 'disabled' : '') + ' title="Move up">▲</button>';
            html += '<button class="btn-reorder" onclick="event.stopPropagation(); moveTaskDown(\'' + task.id + '\')" ' + (isLast ? 'disabled' : '') + ' title="Move down">▼</button>';
            html += '<button class="btn-reorder" onclick="event.stopPropagation(); moveTaskToBottom(\'' + task.id + '\')" ' + (isLast ? 'disabled' : '') + ' title="Move to bottom">⬇⬇</button>';
            html += '<button class="btn-reorder" onclick="event.stopPropagation(); promptTaskPosition(\'' + task.id + '\')" title="Set position">#</button>';
            html += '</div>';
            html += '<button class="btn-start" onclick="startTaskInFocus(\'' + task.id + '\')" title="Start">▶</button>';
            html += '<select class="duration-select" onchange="setDurationDirect(\'' + task.id + '\', this.value)">';
            html += '<option value="15"' + (duration === 15 ? ' selected' : '') + '>15m</option>';
            html += '<option value="30"' + (duration === 30 ? ' selected' : '') + '>30m</option>';
            html += '<option value="45"' + (duration === 45 ? ' selected' : '') + '>45m</option>';
            html += '<option value="60"' + (duration === 60 ? ' selected' : '') + '>60m</option>';
            html += '<option value="90"' + (duration === 90 ? ' selected' : '') + '>90m</option>';
            html += '<option value="120"' + (duration === 120 ? ' selected' : '') + '>2h</option>';
            html += '</select>';
            html += '<button class="btn-edit" onclick="openTaskEditModal(\'' + task.id + '\')" title="Edit">✎</button>';
            html += '<button class="btn-remove" onclick="removeFromCrashOut(\'' + task.id + '\')" title="Remove">✕</button>';
            html += '</div>';
            html += '</div>';
        });
    }

    // --- Wind-down block (purple hatched) ---
    var windDownTop = timeToPx(windDownStart);
    var windDownStartStr = windDownStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    var sleepTimeStr = sleepTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    html += '<div class="gcal-winddown" style="top: ' + windDownTop + 'px; height: ' + PX_PER_HOUR + 'px;">';
    html += '<div class="gcal-winddown-label">🌙 Wind Down</div>';
    html += '<div class="gcal-winddown-time">' + windDownStartStr + ' – ' + sleepTimeStr + '</div>';
    html += '</div>';

    // --- Sleep marker ---
    var sleepTop = timeToPx(sleepTime);
    html += '<div class="gcal-sleep" style="top: ' + sleepTop + 'px;">';
    html += '<span class="gcal-sleep-icon">😴</span>';
    html += '<span class="gcal-sleep-label">Sleep ' + sleepTimeStr + '</span>';
    html += '<div class="gcal-sleep-line"></div>';
    html += '</div>';

    html += '</div>'; // close timeline-grid
    container.innerHTML = html;
}

// Lightweight NOW marker time update (no full rebuild)
function updateNowMarkerTime() {
    var el = document.getElementById('gcalNowMarker');
    if (el && gcalGridParams) {
        var now = new Date();
        var ms = now.getTime() - gcalGridParams.gridStartMs;
        var newTop = (ms / (1000 * 60 * 60)) * gcalGridParams.pxPerHour;
        el.style.top = newTop + 'px';
    }
}

// ==================== TIMELINE DRAG-DROP REORDERING ====================
// timelineDraggedTaskId, isReorderingLocked extracted to state.js

function handleTimelineDragStart(event, taskId) {
    if (isReorderingLocked) {
        event.preventDefault();
        return;
    }
    timelineDraggedTaskId = taskId;
    event.target.classList.add('gcal-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);  // Required for Firefox
}

function handleTimelineDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    var taskEl = event.target.closest('[data-task-id]');
    if (taskEl && !taskEl.classList.contains('gcal-dragging')) {
        taskEl.classList.add('gcal-drag-over');
    }
}

function handleTimelineDragLeave(event) {
    event.stopPropagation();
    var taskEl = event.target.closest('[data-task-id]');
    if (taskEl) {
        taskEl.classList.remove('gcal-drag-over');
    }
}

function handleTimelineDrop(event, targetTaskId) {
    event.preventDefault();
    event.stopPropagation();

    var taskEl = event.target.closest('[data-task-id]');
    if (taskEl) {
        taskEl.classList.remove('gcal-drag-over');
    }

    // Prevent if locked or invalid
    if (isReorderingLocked) return;
    if (!timelineDraggedTaskId || timelineDraggedTaskId === targetTaskId) return;

    // Move dragged task to target position
    // NOTE: moveTaskToPosition handles its own locking internally
    moveTaskToPosition(timelineDraggedTaskId, targetTaskId);
}

function handleTimelineDragEnd(event) {
    event.target.classList.remove('gcal-dragging');
    document.querySelectorAll('[data-task-id]').forEach(el => {
        el.classList.remove('gcal-drag-over');
    });
    timelineDraggedTaskId = null;
}

// BULLETPROOF REORDER: Move a task to a specific position (replaces the target position)
function moveTaskToPosition(draggedId, targetId) {
    if (isReorderingLocked) {
        return;
    }
    isReorderingLocked = true;

    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    var draggedIndex = scheduledTasks.findIndex(t => String(t.id) === String(draggedId));
    var targetIndex = scheduledTasks.findIndex(t => String(t.id) === String(targetId));

    if (draggedIndex === -1 || targetIndex === -1) {
        console.warn('moveTaskToPosition: Invalid task IDs', { draggedId, targetId });
        showToast('Error: Task not found', '❌');
        isReorderingLocked = false;
        return;
    }
    if (draggedIndex === targetIndex) {
        isReorderingLocked = false;
        return;
    }

    // For adjacent tasks, use swap instead of insert (handles one-position-down edge case)
    if (Math.abs(draggedIndex - targetIndex) === 1) {
        isReorderingLocked = false; // swapAdjacentTasks manages its own lock
        swapAdjacentTasks(draggedId, targetId);
        return;
    }

    try {
        // Create new order array by removing dragged and inserting at target
        var taskIds = scheduledTasks.map(t => t.id);
        var draggedTaskId = taskIds.splice(draggedIndex, 1)[0];

        // Insert at target position (no adjustment needed since we removed dragged first)
        taskIds.splice(targetIndex, 0, draggedTaskId);


        // Update crashOutOrder for ALL tasks based on new array order
        // Direct mutation keeps cache references valid
        taskIds.forEach((id, newIndex) => {
            tasks[id].crashOutOrder = newIndex;
        });

        recalculateScheduledTimes();
        renderCrashOutMode();
        saveData();
        showToast('Task moved!', '↕️');
    } catch (e) {
        console.error('Reorder error:', e);
        showToast('Error reordering', '❌');
    } finally {
        setTimeout(() => { isReorderingLocked = false; }, 200);
    }
}

// Legacy function for backwards compatibility
function reorderTimelineTasks(draggedId, targetId) {
    moveTaskToPosition(draggedId, targetId);
}

// SWAP two adjacent tasks (for up/down buttons)
function swapAdjacentTasks(taskId1, taskId2) {
    if (isReorderingLocked) {
        return;
    }
    isReorderingLocked = true;

    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    var index1 = scheduledTasks.findIndex(t => String(t.id) === String(taskId1));
    var index2 = scheduledTasks.findIndex(t => String(t.id) === String(taskId2));

    if (index1 === -1 || index2 === -1) {
        isReorderingLocked = false;
        showToast('Error: Task not found', '❌');
        return;
    }

    // Swap the crashOutOrder values
    var order1 = tasks[taskId1]?.crashOutOrder;
    var order2 = tasks[taskId2]?.crashOutOrder;

    if (tasks[taskId1] === undefined || tasks[taskId2] === undefined) {
        isReorderingLocked = false;
        showToast('Error: Task data missing', '❌');
        return;
    }

    try {
        // Direct mutation keeps cache references valid
        tasks[taskId1].crashOutOrder = order2;
        tasks[taskId2].crashOutOrder = order1;

        recalculateScheduledTimes();
        renderCrashOutMode();
        saveData();
        showToast('Tasks swapped!', '↕️');
    } catch (e) {
        console.error('Swap error:', e);
        showToast('Error swapping', '❌');
    } finally {
        setTimeout(() => { isReorderingLocked = false; }, 200);
    }
}

function moveTaskUp(taskId) {
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    var index = scheduledTasks.findIndex(t => String(t.id) === String(taskId));
    if (index <= 0) {
        if (index === -1) showToast('Task not found in schedule', '⚠️');
        return;
    }

    // Swap with previous task
    var targetTaskId = scheduledTasks[index - 1].id;
    swapAdjacentTasks(taskId, targetTaskId);
}

function moveTaskDown(taskId) {
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    var index = scheduledTasks.findIndex(t => String(t.id) === String(taskId));
    if (index === -1 || index >= scheduledTasks.length - 1) {
        if (index === -1) showToast('Task not found in schedule', '⚠️');
        return;
    }

    // Swap with next task
    var targetTaskId = scheduledTasks[index + 1].id;
    swapAdjacentTasks(taskId, targetTaskId);
}

// Move task to top of schedule (first position)
function moveTaskToTop(taskId) {
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    if (scheduledTasks.length < 2) {
        return;
    }

    var currentIndex = scheduledTasks.findIndex(t => String(t.id) === String(taskId));
    if (currentIndex <= 0) {
        return;
    }

    var firstTaskId = scheduledTasks[0].id;
    moveTaskToPosition(taskId, firstTaskId);
}

// Move task to bottom of schedule (last position)
function moveTaskToBottom(taskId) {
    if (isReorderingLocked) return;
    isReorderingLocked = true;
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    if (scheduledTasks.length < 2) {
        isReorderingLocked = false;
        return;
    }

    var taskIds = scheduledTasks.map(t => t.id);
    var idx = taskIds.indexOf(taskId);
    if (idx === -1 || idx === taskIds.length - 1) {
        isReorderingLocked = false;
        return;
    }

    try {
        taskIds.splice(idx, 1);
        taskIds.push(taskId);
        taskIds.forEach((id, i) => {
            tasks[id] = { ...tasks[id], crashOutOrder: i };
        });
        recalculateScheduledTimes();
        renderCrashOutMode();
        saveData();
        showToast('Task moved to bottom!', '⬇️');
    } catch (e) {
        console.error('moveTaskToBottom error:', e);
        showToast('Error moving task', '❌');
    } finally {
        setTimeout(() => { isReorderingLocked = false; }, 200);
    }
}

// Set exact position (1-indexed for user-friendliness)
function setTaskPosition(taskId, newPosition) {
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    var totalTasks = scheduledTasks.length;

    // Validate position
    if (newPosition < 1 || newPosition > totalTasks) {
        showToast(`Position must be between 1 and ${totalTasks}`, '⚠️');
        return;
    }

    var currentIndex = scheduledTasks.findIndex(t => String(t.id) === String(taskId));
    var targetIndex = newPosition - 1; // Convert to 0-indexed

    if (currentIndex === targetIndex) return; // Already in position

    // Get the task currently at target position
    var targetTaskId = scheduledTasks[targetIndex].id;
    moveTaskToPosition(taskId, targetTaskId);
}

// Prompt user for position
function promptTaskPosition(taskId) {
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    var currentIndex = scheduledTasks.findIndex(t => String(t.id) === String(taskId));
    var totalTasks = scheduledTasks.length;

    var input = prompt(`Move task to position (1-${totalTasks}):`, currentIndex + 1);
    if (input === null) return; // Cancelled

    var newPosition = parseInt(input, 10);
    if (isNaN(newPosition)) {
        showToast('Please enter a valid number', '⚠️');
        return;
    }

    setTaskPosition(taskId, newPosition);
}

// Helper to parse crash out time string back to Date
function parseCrashOutTime(timeStr) {
    if (!timeStr) return null;
    var match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;

    var hours = parseInt(match[1]);
    var minutes = parseInt(match[2]);
    var period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    var date = new Date();
    date.setHours(hours, minutes, 0, 0);

    // Handle midnight crossover: if parsed time is >12h in the past,
    // the crash out session likely spans midnight — push to tomorrow
    var now = new Date();
    if (date.getTime() < now.getTime() - 12 * 60 * 60 * 1000) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

// Direct duration set from dropdown (with cascade)
function setDurationDirect(taskId, newDuration) {
    var task = tasks[taskId];
    if (!task) return;

    // Direct mutation keeps cache references valid
    task.crashOutDuration = parseInt(newDuration);

    // Recalculate all times based on new durations (maintains order, fixes cascading)
    recalculateScheduledTimes();

    saveData();
    renderCrashOutTimeline();
}

function renderUnscheduledPool() {
    var container = document.getElementById('unscheduledTasksPool');
    var countEl = document.getElementById('unscheduledCount');
    if (!container) return;

    // Get tasks that are doToday but NOT scheduled
    var unscheduledTasks = getTodayTriageTasks().filter(t =>
        !t.completed && !t.crashOutScheduled
    );

    // Update count
    if (countEl) countEl.textContent = `${unscheduledTasks.length} task${unscheduledTasks.length !== 1 ? 's' : ''}`;

    if (unscheduledTasks.length === 0) {
        container.innerHTML = `<div style="color: #64748b; padding: 20px; text-align: center; width: 100%;">All tasks scheduled or completed!</div>`;
        return;
    }

    container.innerHTML = unscheduledTasks.map(task => {
        var isLockedIn = task.triageTier === 'lockedIn';
        var tierIcon = isLockedIn ? '🔥' : '📋';
        var defaultDuration = task.size === 'big' ? 60 : task.size === 'small' ? 15 : 30;

        return `
            <div class="pool-task-card" data-task-id="${task.id}">
                <div class="pool-task-text">${escapeHtml(task.text)}</div>
                <div class="pool-task-meta">
                    <span class="pool-task-duration">${defaultDuration}m</span>
                    <span class="pool-task-tier">${tierIcon}</span>
                </div>
                <button class="btn-add-to-timeline" onclick="sendToCrashOut('${task.id}')">+ Add to Timeline</button>
            </div>
        `;
    }).join('');
}

function openDurationModal(taskId) {
    var task = tasks[taskId];
    if (!task) return;

    var modal = document.createElement('div');
    modal.className = 'duration-modal-dark';
    modal.id = 'durationModal';
    modal.onclick = (e) => { if (e.target === modal) closeDurationModal(); };
    modal.innerHTML = `
        <div class="duration-modal-content-dark">
            <div class="duration-modal-title">⏱️ Adjust: ${escapeHtml(task.text.substring(0, 35))}${task.text.length > 35 ? '...' : ''}</div>
            <div class="duration-current">
                Current: <strong id="currentDuration">${task.crashOutDuration || 30}m</strong>
            </div>
            <div class="duration-adjust-row">
                <button onclick="adjustDuration(${taskId}, -30)">-30m</button>
                <button onclick="adjustDuration(${taskId}, -15)">-15m</button>
                <button onclick="adjustDuration(${taskId}, -5)">-5m</button>
                <button onclick="adjustDuration(${taskId}, 5)">+5m</button>
                <button onclick="adjustDuration(${taskId}, 15)">+15m</button>
                <button onclick="adjustDuration(${taskId}, 30)">+30m</button>
            </div>
            <div style="font-size: 13px; color: #64748b; text-align: center; margin-bottom: 12px;">Quick set:</div>
            <div class="duration-quick-row">
                <button onclick="setDuration(${taskId}, 15)">15m</button>
                <button onclick="setDuration(${taskId}, 30)">30m</button>
                <button onclick="setDuration(${taskId}, 45)">45m</button>
                <button onclick="setDuration(${taskId}, 60)">60m</button>
                <button onclick="setDuration(${taskId}, 90)">90m</button>
                <button onclick="setDuration(${taskId}, 120)">2h</button>
            </div>
            <div class="duration-modal-actions">
                <button class="btn-cancel" onclick="closeDurationModal()">Cancel</button>
                <button class="btn-apply" onclick="closeDurationModal()">Done</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function adjustDuration(taskId, delta) {
    var task = tasks[taskId];
    if (!task) return;

    var newDuration = Math.max(5, (task.crashOutDuration || 30) + delta);
    tasks[taskId] = { ...task, crashOutDuration: newDuration };

    var el = document.getElementById('currentDuration');
    if (el) el.textContent = `${newDuration}m`;

    recalculateCrashOutTimes();
    saveData();
}

function setDuration(taskId, duration) {
    var task = tasks[taskId];
    if (!task) return;

    tasks[taskId] = { ...task, crashOutDuration: duration };

    var el = document.getElementById('currentDuration');
    if (el) el.textContent = `${duration}m`;

    recalculateCrashOutTimes();
    saveData();
}

function closeDurationModal() {
    var modal = document.getElementById('durationModal');
    if (modal) modal.remove();
    renderCrashOutMode();
}

function recalculateCrashOutTimes() {
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    var currentTime = new Date();

    scheduledTasks.forEach(task => {
        var timeStr = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        tasks[task.id] = { ...tasks[task.id], crashOutTime: timeStr };
        currentTime = new Date(currentTime.getTime() + (task.crashOutDuration || 30) * 60 * 1000);
    });
}

function dismissOverscheduledWarning() {
    var warningEl = document.getElementById('overscheduledWarning');
    if (warningEl) {
        warningEl.classList.add('hidden');
    }
    // Set dismissed flag so it stays hidden until conditions change
    if (!commandCenterData.crashOut) commandCenterData.crashOut = {};
    commandCenterData.crashOut.warningDismissed = true;
    saveData();
}

function resetCrashOutDay() {
    if (!confirm('Reset Crash Out? This will clear all scheduled times but keep your tasks.')) return;

    // Clear crash out data from all tasks
    getValues(tasks).forEach(task => {
        if (task.crashOutScheduled) {
            tasks[task.id] = {
                ...task,
                crashOutScheduled: false
            };
            delete tasks[task.id].crashOutTime;
            delete tasks[task.id].crashOutDuration;
        }
    });

    // Reset sleep time to prompt for new one
    if (commandCenterData.crashOut) {
        commandCenterData.crashOut.sleepTime = null;
        commandCenterData.crashOut.lastReset = new Date().toISOString();
    }

    renderCrashOutMode();
    saveData();
    showToast('Crash Out reset', '🔄');
}

// ==================== WINDOW BINDINGS ====================
// Required for onclick handlers in dynamically rendered HTML

window.moveTaskUp = moveTaskUp;
window.moveTaskDown = moveTaskDown;
window.moveTaskToTop = moveTaskToTop;
window.moveTaskToBottom = moveTaskToBottom;
window.promptTaskPosition = promptTaskPosition;
window.swapAdjacentTasks = swapAdjacentTasks;
window.moveTaskToPosition = moveTaskToPosition;
window.setTaskPosition = setTaskPosition;
window.handleTimelineDragStart = handleTimelineDragStart;
window.handleTimelineDragOver = handleTimelineDragOver;
window.handleTimelineDragLeave = handleTimelineDragLeave;
window.handleTimelineDrop = handleTimelineDrop;
window.handleTimelineDragEnd = handleTimelineDragEnd;
window.setDurationDirect = setDurationDirect;
window.openDurationModal = openDurationModal;
window.adjustDuration = adjustDuration;
window.setDuration = setDuration;
window.closeDurationModal = closeDurationModal;
window.removeFromCrashOut = removeFromCrashOut;
window.sendToCrashOut = sendToCrashOut;
window.startTaskFromPrompt = startTaskFromPrompt;
window.pushAllTasks = pushAllTasks;
window.skipTask = skipTask;
window.removeTaskFromSchedule = removeTaskFromSchedule;
window.undoPush = undoPush;
window.setCrashOutSleep = setCrashOutSleep;
window.showCustomSleepPicker = showCustomSleepPicker;
window.hideCustomSleepPicker = hideCustomSleepPicker;
window.setCustomSleepTime = setCustomSleepTime;
window.changeSleepTime = changeSleepTime;
window.dismissOverscheduledWarning = dismissOverscheduledWarning;
window.resetCrashOutDay = resetCrashOutDay;
// window.startTaskInFocus set in focus-pomodoro.js (loads after this file)
// window.openTaskEditModal set in tasks.js (loads before this file)
