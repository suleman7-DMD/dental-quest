// ==================== FOCUS (POMODORO) MODE ====================
// Extracted from index.html Phase 6

// Current focus session state (lazy initialized)
var currentFocusTaskId = null;

function renderFocusPomodoroMode() {
    var noTaskEl = document.getElementById('focusNoTask');
    var activeEl = document.getElementById('focusActiveSession');

    currentFocusTaskId = commandCenterData.currentSession.taskId;

    if (!currentFocusTaskId || !tasks[currentFocusTaskId]) {
        // No task selected
        if (noTaskEl) noTaskEl.style.display = 'block';
        if (activeEl) activeEl.style.display = 'none';
    } else {
        // Active session
        if (noTaskEl) noTaskEl.style.display = 'none';
        if (activeEl) activeEl.style.display = 'block';
        renderActiveSession();
    }
}

function startTaskInFocus(taskId, autoStartTimer) {
    if (autoStartTimer === undefined) autoStartTimer = false;
    var task = tasks[taskId];
    if (!task) return;

    // Set up session
    commandCenterData.currentSession.taskId = taskId;
    commandCenterData.currentSession.checklist = {};
    commandCenterData.currentSession.timerRemaining = null;
    commandCenterData.currentSession.confirmedStarted = true; // Mark as actively started
    commandCenterData.currentSession.startedAt = new Date().toISOString();
    currentFocusTaskId = taskId;

    // Clear dismiss cooldown - we're now working on this task
    if (dismissedUntil[taskId]) {
        delete dismissedUntil[taskId];
    }
    lastPromptedTaskId = taskId; // Prevent prompt for this task

    // Reset timer
    focusTimerSecondsRemaining = (commandCenterData.currentSession.timerMinutes || 25) * 60;
    focusTimerRunning = false;
    if (focusTimerInterval) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
    }

    // Switch to focus mode
    switchCommandCenterMode('focus');

    // Auto-start timer if requested (from crash out prompt)
    if (autoStartTimer) {
        setTimeout(function() { startFocusTimer(); }, 100); // Small delay to ensure UI is ready
    }
    saveData();
}

function renderActiveSession() {
    var task = tasks[currentFocusTaskId];
    if (!task) return;

    // Restore ephemeral timer state if pulled from another device and not currently ticking
    if (!focusTimerRunning && commandCenterData.currentSession.timerRemaining != null) {
        focusTimerSecondsRemaining = commandCenterData.currentSession.timerRemaining;
        focusTimerDuration = commandCenterData.currentSession.timerMinutes || 25;
    }


    // Update task info
    var taskTextEl = document.getElementById('focusCurrentTaskText');
    var taskTierEl = document.getElementById('focusCurrentTaskTier');

    if (taskTextEl) taskTextEl.textContent = task.text;
    if (taskTierEl) {
        var tierLabel = task.triageTier === 'lockedIn' ? 'LOCKED IN' :
                      task.crashOutScheduled ? 'SCHEDULED' :
                      task.triageTier === 'tomorrow' ? 'TOMORROW' : 'TODAY';
        taskTierEl.textContent = `from: ${tierLabel}`;
    }

    // Update timer display
    updateFocusTimerDisplay();

    // Render checklist
    renderFocusChecklist();
}

function updateFocusTimerDisplay() {
    var minutes = Math.floor(focusTimerSecondsRemaining / 60);
    var seconds = focusTimerSecondsRemaining % 60;
    var displayEl = document.getElementById('focusTimerDisplay');
    if (displayEl) {
        displayEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update circle progress
    var circleEl = document.getElementById('focusTimerCircle');
    if (circleEl) {
        var totalSeconds = focusTimerDuration * 60;
        var progress = 1 - (focusTimerSecondsRemaining / totalSeconds);
        var circumference = 879.6; // 2*PI*140
        circleEl.style.strokeDashoffset = circumference * progress;
    }

    // Update timer container state classes for CSS color transitions
    var timerContainer = document.getElementById('focusTimerContainer');
    if (timerContainer) {
        var pctRemaining = focusTimerSecondsRemaining / (focusTimerDuration * 60);
        timerContainer.classList.toggle('running', focusTimerRunning);
        timerContainer.classList.toggle('warning', pctRemaining <= 0.33 && pctRemaining > 0.1);
        timerContainer.classList.toggle('critical', pctRemaining <= 0.1);

        // Switch SVG gradient
        var circle = document.getElementById('focusTimerCircle');
        if (circle) {
            if (pctRemaining <= 0.1) {
                circle.setAttribute('stroke', 'url(#timerGradientRed)');
            } else if (pctRemaining <= 0.33) {
                circle.setAttribute('stroke', 'url(#timerGradientYellow)');
            } else {
                circle.setAttribute('stroke', 'url(#timerGradientGreen)');
            }
        }
    }

    // Show/hide paused label
    var pausedLabel = document.getElementById('focusPausedLabel');
    if (pausedLabel) {
        pausedLabel.style.display = (!focusTimerRunning && focusTimerSecondsRemaining < focusTimerDuration * 60) ? 'block' : 'none';
    }

    // Update button visibility
    var startBtn = document.getElementById('focusStartBtn');
    var pauseBtn = document.getElementById('focusPauseBtn');
    var resumeBtn = document.getElementById('focusResumeBtn');

    if (focusTimerRunning) {
        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
        if (resumeBtn) resumeBtn.style.display = 'none';
    } else if (focusTimerSecondsRemaining < focusTimerDuration * 60) {
        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'inline-block';
    } else {
        if (startBtn) startBtn.style.display = 'inline-block';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'none';
    }
}

// BUG FIX #7: Save every 10 seconds instead of every 1 second
var focusTimerSaveCounter = 0;

function startFocusTimer() {
    if (focusTimerRunning) return;

    focusTimerRunning = true;
    focusTimerSaveCounter = 0;
    focusTimerInterval = setInterval(function() {
        focusTimerSecondsRemaining--;
        if (commandCenterData.currentSession) {
            commandCenterData.currentSession.timerRemaining = focusTimerSecondsRemaining;
            focusTimerSaveCounter++;
            if (focusTimerSaveCounter >= 10) {  // Save every 10 seconds, not every 1
                focusTimerSaveCounter = 0;
                saveData();
            }
        }

        updateFocusTimerDisplay();

        if (focusTimerSecondsRemaining <= 0) {
            clearInterval(focusTimerInterval);
            focusTimerInterval = null;
            focusTimerRunning = false;
            onFocusTimerComplete();
        }
    }, 1000);

    updateFocusTimerDisplay();
}

function pauseFocusTimer() {
    if (!focusTimerRunning) return;

    focusTimerRunning = false;
    if (focusTimerInterval) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
    }
    updateFocusTimerDisplay();
}

function resumeFocusTimer() {
    startFocusTimer();
}

function setFocusDuration(minutes) {
    focusTimerDuration = minutes;
    focusTimerSecondsRemaining = minutes * 60;

    // Update button styling - toggle active class
    var btn15 = document.getElementById('focus15Btn');
    var btn25 = document.getElementById('focus25Btn');
    var btn50 = document.getElementById('focus50Btn');
    [btn15, btn25, btn50].forEach(function(btn) {
        if (btn) btn.classList.remove('active');
    });
    var activeBtn = minutes === 15 ? btn15 : minutes === 25 ? btn25 : btn50;
    if (activeBtn) activeBtn.classList.add('active');

    if (commandCenterData.currentSession) {
        commandCenterData.currentSession.timerMinutes = minutes;
        commandCenterData.currentSession.timerRemaining = focusTimerSecondsRemaining;
        saveData();

    }

    updateFocusTimerDisplay();
}

function onFocusTimerComplete() {
    // Award XP for completing a focus session
    awardCommandCenterXP(20, 'focus session');

    // Increment focus streak
    commandCenterData.focusStats.focusStreak = (commandCenterData.focusStats.focusStreak || 0) + 1;

    // Show completion modal
    showFocusCompleteModal();

    // Play sound/vibration if available
    try {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch (e) {}

    saveData();
}

function showFocusCompleteModal() {
    var modal = document.getElementById('focusTimerCompleteModal');
    if (modal) {
        modal.style.display = 'flex';

        // Random completion message
        var FOCUS_COMPLETE_MESSAGES = [
            'CRUSHED IT!', 'LOCKED IN!', 'BEAST MODE!', 'UNSTOPPABLE!',
            'LET\'S GO!', 'ON FIRE!', 'NAILED IT!', 'PURE FOCUS!'
        ];
        var titleEl = document.getElementById('focusCompleteTitle');
        if (titleEl) {
            titleEl.textContent = FOCUS_COMPLETE_MESSAGES[Math.floor(Math.random() * FOCUS_COMPLETE_MESSAGES.length)];
        }

        // Trigger CSS confetti
        var confettiWrap = document.getElementById('focusConfettiContainer');
        if (confettiWrap) {
            confettiWrap.innerHTML = '';
            var colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
            var shapes = ['', 'circle', 'rect', 'diamond'];
            for (var i = 0; i < 40; i++) {
                var p = document.createElement('div');
                p.className = `focus-confetti-particle ${shapes[Math.floor(Math.random() * shapes.length)]}`;
                p.style.left = `${Math.random() * 100}%`;
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.setProperty('--fall-duration', `${1.5 + Math.random() * 2}s`);
                p.style.setProperty('--fall-delay', `${Math.random() * 0.4}s`);
                confettiWrap.appendChild(p);
            }
        }

        // XP float display
        var xpFloat = document.getElementById('focusXpFloat');
        if (xpFloat) {
            var xpAmount = commandCenterData?.focusStats?.lastXPGained || 20;
            xpFloat.textContent = `+${xpAmount} XP`;
        }

        // Update modal content
        var xpEl = document.getElementById('focusXpEarned');
        var streakEl = document.getElementById('focusStreakDisplay');
        var progressEl = document.getElementById('focusTodayProgress');
        var checklistEl = document.getElementById('focusChecklistSummary');

        if (xpEl) xpEl.textContent = `+${commandCenterData?.focusStats?.lastXPGained || 20} XP`;
        if (streakEl) streakEl.textContent = `🔥 Focus streak: ${commandCenterData.focusStats?.focusStreak || 1} sessions`;

        var todayTasks = getTodayTriageTasks();
        var completed = todayTasks.filter(t => t.completed).length;
        if (progressEl) progressEl.textContent = `📊 Today: ${completed}/${todayTasks.length} tasks done`;

        // Checklist summary
        if (commandCenterData.currentSession && commandCenterData.currentSession.checklist) {
            var items = Object.values(commandCenterData.currentSession.checklist);
            var completedItems = items.filter(i => i.completed).length;
            if (checklistEl) checklistEl.textContent = `Session checklist: ${completedItems}/${items.length} completed`;
        }
    }
}

function completeFocusTask() {
    if (!currentFocusTaskId) return;
    completeTriageTask(currentFocusTaskId);
    exitFocusMode();
}

function completeFocusTaskFromModal() {
    hideFocusCompleteModal();
    completeFocusTask();
}

function startNextFocusTask() {
    hideFocusCompleteModal();

    // Find next task in queue
    var scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed && t.id !== currentFocusTaskId);
    var lockedInTasks = getTasksByTier('lockedIn').filter(t => !t.completed && t.id !== currentFocusTaskId);
    var todayTasks = getTasksByTier('today').filter(t => !t.completed && t.id !== currentFocusTaskId);

    var nextTask = scheduledTasks[0] || lockedInTasks[0] || todayTasks[0];

    if (nextTask) {
        startTaskInFocus(nextTask.id);
    } else {
        showToast('No more tasks! Great work!', '🎉');
        exitFocusMode();
    }
}

function takeBreak() {
    hideFocusCompleteModal();
    showToast('Take a 5 minute break!', '☕');
    // Reset timer for break
    focusTimerSecondsRemaining = 5 * 60;
    focusTimerDuration = 5;
    updateFocusTimerDisplay();
}

function backToTriageFromModal() {
    hideFocusCompleteModal();
    switchCommandCenterMode('triage');
}

function hideFocusCompleteModal() {
    var modal = document.getElementById('focusTimerCompleteModal');
    if (modal) modal.style.display = 'none';
}

function exitFocusMode() {
    // Stop timer
    if (focusTimerInterval) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
    }
    focusTimerRunning = false;

    // Clear session
    if (commandCenterData.currentSession) {
        commandCenterData.currentSession.taskId = null;
        commandCenterData.currentSession.checklist = {};
        commandCenterData.currentSession.confirmedStarted = false;
        commandCenterData.currentSession.startedAt = null;
        commandCenterData.currentSession.timerRemaining = null;

    }
    currentFocusTaskId = null;

    switchCommandCenterMode('triage');
    saveData();
}

// Focus Checklist
function renderFocusChecklist() {
    var container = document.getElementById('focusSessionChecklist');
    if (!container) return;

    // Ensure checklist exists
    if (!commandCenterData.currentSession.checklist) {
        commandCenterData.currentSession.checklist = {};
    }

    var items = Object.values(commandCenterData.currentSession.checklist);

    if (items.length === 0) {
        container.innerHTML = `<div style="color: #64748b; font-size: 0.9em; padding: 10px;">Add micro-tasks for this session</div>`;
    } else {
        container.innerHTML = items.map(item => `
            <div class="focus-checklist-item">
                <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleFocusChecklistItem('${item.id}')">
                <span class="item-text ${item.completed ? 'completed' : ''}">${escapeHtml(item.text)}</span>
                <button class="delete-item" onclick="deleteFocusChecklistItem('${item.id}')">✕</button>
            </div>
        `).join('');
    }

    // Update progress
    var completed = items.filter(i => i.completed).length;
    var total = items.length;
    var percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    var progressEl = document.getElementById('focusChecklistProgress');
    var countEl = document.getElementById('focusChecklistCount');
    var percentEl = document.getElementById('focusChecklistPercent');

    if (progressEl) progressEl.style.width = `${percent}%`;
    if (countEl) countEl.textContent = `${completed}/${total} items`;
    if (percentEl) percentEl.textContent = `${percent}%`;
}

function addFocusChecklistItem() {
    var input = document.getElementById('focusAddChecklistItem');
    if (!input || !input.value.trim()) return;

    // Ensure checklist exists
    if (!commandCenterData.currentSession.checklist) commandCenterData.currentSession.checklist = {};

    var id = generateId('chk');
    commandCenterData.currentSession.checklist[id] = {
        id: id,
        text: input.value.trim(),
        completed: false
    };

    input.value = '';
    renderFocusChecklist();
    saveData();
}

function toggleFocusChecklistItem(itemId) {
    if (commandCenterData.currentSession && commandCenterData.currentSession.checklist && commandCenterData.currentSession.checklist[itemId]) {
        commandCenterData.currentSession.checklist[itemId].completed = !commandCenterData.currentSession.checklist[itemId].completed;
        renderFocusChecklist();
        saveData();
    }
}

function deleteFocusChecklistItem(itemId) {
    if (commandCenterData.currentSession && commandCenterData.currentSession.checklist && commandCenterData.currentSession.checklist[itemId]) {
        delete commandCenterData.currentSession.checklist[itemId];
        renderFocusChecklist();
        saveData();
    }
}

// ==================== GAMIFICATION ====================

function awardCommandCenterXP(amount, reason) {
    commandCenterData.focusStats.totalXP = (commandCenterData.focusStats.totalXP || 0) + amount;
    commandCenterData.focusStats.lastXPGained = amount;

    // Also add to main stats
    if (typeof stats !== 'undefined' && stats) {
        stats.totalXPGained = (stats.totalXPGained || 0) + amount;
    }

    showToast(`+${amount} XP (${reason})`, '⭐');

    // Floating XP text
    var xpContainer = document.querySelector('.xp-display-enhanced');
    if (xpContainer) {
        var floater = document.createElement('div');
        floater.className = 'xp-float';
        floater.textContent = `+${amount}`;
        xpContainer.appendChild(floater);
        setTimeout(function() { floater.remove(); }, 1300);
    }

    // Rolling counter pop
    var counter = document.getElementById('totalXPGained');
    if (counter) {
        counter.classList.add('animating');
        setTimeout(function() { counter.classList.remove('animating'); }, 300);
    }

    // Level check (500 XP per level)
    var totalXP = commandCenterData.focusStats.totalXP || 0;
    var newLevel = Math.floor(totalXP / 500) + 1;
    var prevLevel = Math.floor((totalXP - amount) / 500) + 1;
    var levelBadge = document.getElementById('xpLevelBadge');
    var levelBar = document.getElementById('xpLevelBarFill');
    if (levelBadge) levelBadge.textContent = newLevel;
    if (levelBar) levelBar.style.width = `${((totalXP % 500) / 500) * 100}%`;

    if (newLevel > prevLevel) {
        var overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `<div class="level-up-text">LEVEL UP!</div><div class="level-number">${newLevel}</div>`;
        document.body.appendChild(overlay);
        if (typeof showCelebration === 'function') showCelebration('big');
        setTimeout(function() { overlay.remove(); }, 2200);
    }
    // Note: caller is responsible for saveData() — removed redundant save here
}

function showCelebration(size) {
    var container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    var colors = ['#ff6b35', '#f7931e', '#ffd700', '#667eea', '#10b981', '#ec4899'];
    var count = size === 'big' ? 100 : size === 'medium' ? 50 : 20;

    for (var i = 0; i < count; i++) {
        var confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s ease-out forwards`;
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);
    }

    setTimeout(function() { container.remove(); }, 3000);
}

// Completion message rotation
var COMPLETION_MESSAGES = [
    'Crushed it!', 'Locked in!', 'One down!', 'Lets go!',
    'On fire!', 'Beast mode!', 'Unstoppable!', 'Nailed it!',
    'Money!', 'Easy work!', 'Too smooth!', 'No sweat!'
];

function showCompletionMessage() {
    var msg = document.createElement('div');
    msg.className = 'completion-message';
    msg.textContent = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
    document.body.appendChild(msg);
    setTimeout(function() { msg.remove(); }, 2000);
}

function updateStreakBadge() {
    var badge = document.getElementById('streakBadge');
    var countEl = document.getElementById('streakCount');
    if (!badge || !countEl) return;

    var streak = commandCenterData?.focusStats?.dailyStreak || 0;
    countEl.textContent = streak;

    badge.classList.remove('streak-cold', 'streak-warm', 'streak-hot', 'streak-blazing', 'streak-at-risk');

    if (streak >= 8) badge.classList.add('streak-blazing');
    else if (streak >= 4) badge.classList.add('streak-hot');
    else if (streak >= 1) badge.classList.add('streak-warm');
    else badge.classList.add('streak-cold');

    var hour = new Date().getHours();
    var todayTasks = typeof getTodayTriageTasks === 'function' ? getTodayTriageTasks() : [];
    var completedToday = todayTasks.some(t => t.completed);
    if (hour >= 21 && !completedToday && streak > 0) {
        badge.classList.add('streak-at-risk');
    }

    // Update compact header streak count
    if (typeof updateCompactHeader === 'function') updateCompactHeader();
}

function adjustFocusTimer(seconds) {
    if (typeof focusTimerSecondsRemaining !== 'undefined') {
        focusTimerSecondsRemaining = Math.max(0, focusTimerSecondsRemaining + seconds);
        if (typeof updateFocusTimerDisplay === 'function') updateFocusTimerDisplay();
    }
}

function skipFocusTask() {
    if (typeof exitFocusMode === 'function') exitFocusMode();
}

// ==================== ROLLOVER LOGIC ====================

function checkAndProcessRollovers() {
    var today = getTodayDateString();
    var lastRolloverCheck = localStorage.getItem('lastRolloverCheck');

    // Only process once per day
    if (lastRolloverCheck === today) return;

    // Find tasks that were LOCKED IN and not completed from previous day
    getValues(tasks).forEach(task => {
        if (task.triageTier === 'lockedIn' && !task.completed && task.doToday) {
            // Check if task has a triageDate that's before today
            if (task.triageDate && task.triageDate !== today) {
                // Mark as rolled over
                tasks[task.id] = {
                    ...task,
                    rolledOver: {
                        fromDate: task.triageDate,
                        wasTier: 'lockedIn'
                    },
                    triageTier: 'today' // Move out of locked in
                };
            }
        }
    });

    // Update triage date for current LOCKED IN tasks
    getValues(tasks).forEach(task => {
        if (task.triageTier === 'lockedIn' && !task.completed && task.doToday) {
            tasks[task.id] = { ...task, triageDate: today };
        }
    });

    safeLocalStorageSet('lastRolloverCheck', today);
    saveData();
}

// Check for perfect day (all tasks completed)
function checkForPerfectDay() {
    var todayTasks = getTodayTriageTasks();
    if (todayTasks.length === 0) return;

    var allCompleted = todayTasks.every(t => t.completed);
    if (allCompleted && todayTasks.length >= 3) {
        // Perfect day!
        var today = getTodayDateString();
        var lastPerfectDay = localStorage.getItem('lastPerfectDayAward');
        if (lastPerfectDay !== today) {
            safeLocalStorageSet('lastPerfectDayAward', today);
            awardCommandCenterXP(200, 'Perfect Day');
            showPerfectDayBadge();
        }
    }
}

function showPerfectDayBadge() {
    var badge = document.createElement('div');
    badge.className = 'perfect-day-badge';

    // Add background flash overlay
    var overlay = document.createElement('div');
    overlay.className = 'perfect-day-overlay';
    document.body.appendChild(overlay);

    var todayTasks = typeof getTodayTriageTasks === 'function' ? getTodayTriageTasks() : [];

    badge.innerHTML = `
        <div class="trophy-glow"></div>
        <div class="trophy">&#x1F3C6;</div>
        <div class="text">PERFECT DAY!</div>
        <div class="perfect-day-stats">${todayTasks.length} tasks completed &middot; +200 XP</div>
    `;
    document.body.appendChild(badge);
    setTimeout(function() {
        badge.remove();
        overlay.remove();
    }, 3500);
}

// Update streaks
function updateStreaks() {
    var today = getTodayDateString();
    var lastActiveDay = localStorage.getItem('lastActiveDay');

    // Daily streak - any task completed today
    var todayTasks = getTodayTriageTasks();
    var completedToday = todayTasks.some(t => t.completed);

    if (completedToday) {
        if (lastActiveDay) {
            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            var yesterdayStr = getLocalDateString(yesterday);

            if (lastActiveDay === yesterdayStr) {
                // Consecutive day
                commandCenterData.focusStats.dailyStreak = (commandCenterData.focusStats.dailyStreak || 0) + 1;
            } else if (lastActiveDay !== today) {
                // Streak broken
                commandCenterData.focusStats.dailyStreak = 1;
            }
        } else {
            commandCenterData.focusStats.dailyStreak = 1;
        }
        safeLocalStorageSet('lastActiveDay', today);
    }

    // LOCKED IN streak - all LOCKED IN tasks done today
    var lockedInTasks = getTasksByTier('lockedIn');
    if (lockedInTasks.length > 0 && lockedInTasks.every(t => t.completed)) {
        var lastLockedInComplete = localStorage.getItem('lastLockedInComplete');
        if (lastLockedInComplete !== today) {
            commandCenterData.focusStats.lockedInStreak = (commandCenterData.focusStats.lockedInStreak || 0) + 1;
            safeLocalStorageSet('lastLockedInComplete', today);
        }
    }

    if (typeof updateStreakBadge === 'function') updateStreakBadge();
    // Note: caller is responsible for saveData() — removed redundant save here
}

// ==================== WINDOW BINDINGS ====================
// Required for onclick handlers in HTML and dynamically rendered templates

window.startFocusTimer = startFocusTimer;
window.pauseFocusTimer = pauseFocusTimer;
window.resumeFocusTimer = resumeFocusTimer;
window.setFocusDuration = setFocusDuration;
window.completeFocusTask = completeFocusTask;
window.completeFocusTaskFromModal = completeFocusTaskFromModal;
window.startNextFocusTask = startNextFocusTask;
window.takeBreak = takeBreak;
window.backToTriageFromModal = backToTriageFromModal;
window.exitFocusMode = exitFocusMode;
window.addFocusChecklistItem = addFocusChecklistItem;
window.toggleFocusChecklistItem = toggleFocusChecklistItem;
window.deleteFocusChecklistItem = deleteFocusChecklistItem;
window.adjustFocusTimer = adjustFocusTimer;
window.skipFocusTask = skipFocusTask;
window.startTaskInFocus = startTaskInFocus;
window.toggleTaskComplete = toggleTaskComplete;
window.startFocusSession = startFocusSession;
window.closeTaskDetailsModal = closeTaskDetailsModal;
window.triageQuickAddTask = triageQuickAddTask;
window.editTriageTaskText = editTriageTaskText;
window.unflagFromToday = unflagFromToday;
window.completeTriageTask = completeTriageTask;
