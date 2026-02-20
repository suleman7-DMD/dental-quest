// ==================== TRIAGE MODE ====================
// Extracted from index.html Phase 6

function renderTriageMode() {
    updateTriageGreeting();
    renderTriageColumn('lockedIn');
    renderTriageColumn('today');
    renderTriageColumn('tomorrow');
    renderScheduledSection();
    renderRolledOverSection();
    updateAllTriageProgress();
    initTriageDragDrop();
}

function updateTriageGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17 && hour < 21) greeting = 'Good evening';
    if (hour >= 21 || hour < 5) greeting = 'Good night';

    const greetingEl = document.getElementById('triageGreeting');
    if (greetingEl) greetingEl.textContent = `${greeting}, Sully`;

    const dateEl = document.getElementById('triageDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        dateEl.textContent = `${dateStr} • ${timeStr}`;
    }
}

function renderTriageColumn(tier) {
    const container = document.getElementById(`${tier}Tasks`);
    if (!container) return;

    const tierTasks = getTasksByTier(tier).filter(t => !t.completed);

    if (tierTasks.length === 0) {
        container.innerHTML = `<div class="column-empty-state">${getEmptyMessage(tier)}</div>`;
    } else {
        container.innerHTML = tierTasks.map(t => renderTaskCard(t, tier)).join('');
    }
}

function getEmptyMessage(tier) {
    const messages = {
        lockedIn: 'Drag your non-negotiables here',
        today: 'Add tasks below or drag from Full View',
        tomorrow: 'Tasks that can wait',
        scheduled: 'Send tasks here from Crash Out'
    };
    return messages[tier] || 'No tasks';
}

function renderTaskCard(task, tier) {
    const isScheduled = tier === 'scheduled';

    let actionBtn = '';
    if (isScheduled) {
        actionBtn = `<button class="btn-remove" onclick="removeFromCrashOut('${task.id}')">← Remove</button>`;
    } else {
        actionBtn = `<button class="btn-crash-out" onclick="sendToCrashOut('${task.id}')">→ Crash Out</button>`;
    }

    const scheduledTime = isScheduled && task.crashOutTime ?
        `<span class="scheduled-time">${task.crashOutTime}</span>` : '';

    return `
        <div class="task-card" data-task-id="${task.id}" data-tier="${tier}" draggable="true"
             ondragstart="handleTriageDragStart(event, '${task.id}')"
             ondragend="handleTriageDragEnd(event)">
            <div class="task-card-main">
                <span class="drag-handle">⋮⋮</span>
                <input type="checkbox" class="task-checkbox"
                       ${task.completed ? 'checked' : ''}
                       onchange="toggleTaskComplete('${task.id}')">
                <span class="task-text">${escapeHtml(task.text)}</span>
                ${scheduledTime}
                <div class="task-card-actions">
                    <button class="btn-start" onclick="startFocusSession('${task.id}')" title="Start">▶</button>
                    ${actionBtn}
                </div>
            </div>
        </div>
    `;
}

function renderScheduledSection() {
    const section = document.getElementById('scheduledSection');
    const container = document.getElementById('scheduledTasks');
    const countEl = document.getElementById('scheduledCount');

    const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);

    if (scheduledTasks.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }

    if (section) section.style.display = 'block';
    if (countEl) countEl.textContent = `${scheduledTasks.length} task${scheduledTasks.length !== 1 ? 's' : ''}`;

    if (container) {
        container.innerHTML = scheduledTasks.map(task => `
            <div class="scheduled-task-card" data-task-id="${task.id}">
                <span class="scheduled-time">${task.crashOutTime || 'TBD'}</span>
                <input type="checkbox" class="task-checkbox" onchange="toggleTaskComplete('${task.id}')">
                <span class="task-text" style="flex: 1;">${escapeHtml(task.text)}</span>
                <span style="color: #8b949e; font-size: 12px;">${task.crashOutDuration || 30}m</span>
                <button class="btn-start" onclick="startFocusSession('${task.id}')">▶</button>
                <button class="btn-remove" onclick="removeFromCrashOut('${task.id}')">✕</button>
            </div>
        `).join('');
    }
}

function renderRolledOverSection() {
    const rolledOverTasks = getValues(tasks).filter(t =>
        t.doToday && t.rolledOver && t.rolledOver.fromDate && !t.completed
    );

    const section = document.getElementById('rolledOverSection');
    const container = document.getElementById('rolledOverTasks');
    const countEl = document.getElementById('rolledOverCount');

    if (rolledOverTasks.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }

    if (section) section.style.display = 'block';
    if (countEl) countEl.textContent = `${rolledOverTasks.length} task${rolledOverTasks.length !== 1 ? 's' : ''}`;

    if (container) {
        container.innerHTML = rolledOverTasks.map(task => `
            <div class="task-card" data-task-id="${task.id}" style="border-left: 3px solid #f59e0b;">
                <div class="task-card-main">
                    <span style="color: #f59e0b; font-size: 12px;">⚠️</span>
                    <input type="checkbox" class="task-checkbox" onchange="toggleTaskComplete('${task.id}')">
                    <span class="task-text">${escapeHtml(task.text)}</span>
                    <span style="font-size: 11px; color: #8b949e;">from ${task.rolledOver.fromDate}</span>
                    <div class="task-card-actions">
                        <button class="btn-start" onclick="startFocusSession('${task.id}')">▶</button>
                        <button class="btn-crash-out" onclick="sendToCrashOut('${task.id}')">→ Crash Out</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function updateAllTriageProgress() {
    // Overall progress
    const allTodayTasks = getValues(tasks).filter(t => t.doToday);
    const totalCompleted = allTodayTasks.filter(t => t.completed).length;
    const totalCount = allTodayTasks.length;
    const overallPercent = totalCount > 0 ? Math.round((totalCompleted / totalCount) * 100) : 0;

    const overallBar = document.getElementById('overallProgressBar');
    const overallText = document.getElementById('overallProgressText');
    if (overallBar) overallBar.style.width = `${overallPercent}%`;
    if (overallText) overallText.textContent = `${totalCompleted}/${totalCount} tasks • ${overallPercent}%`;

    // Per-column progress
    updateColumnProgress('lockedIn');
    updateColumnProgress('today');
    updateColumnProgress('tomorrow');
}

function updateColumnProgress(tier) {
    const tierTasks = getTasksByTier(tier);
    const total = tierTasks.length;
    const completed = tierTasks.filter(t => t.completed).length;
    const incomplete = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const countEl = document.getElementById(`${tier}Count`);
    const progressEl = document.getElementById(`${tier}Progress`);
    const percentEl = document.getElementById(`${tier}Percent`);

    if (countEl) countEl.textContent = `(${incomplete})`;
    if (progressEl) progressEl.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${percent}%`;
}

// Toggle task completion
function toggleTaskComplete(taskId) {
    const task = tasks[taskId];
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        // Track completion stats (mirror toggleTask behavior)
        stats.totalTasks = (stats.totalTasks || 0) + 1;

        // Award XP based on tier
        const xp = task.triageTier === 'lockedIn' ? 50 :
                   task.crashOutScheduled ? 75 :
                   task.rolledOver ? 40 : 25;

        const category = task.category || 'life';
        if (stats.categoryXPGained && category) {
            stats.categoryXPGained[category] = (stats.categoryXPGained[category] || 0) + xp;
        }
        task.completedAt = Date.now();
        // Preserve doToday so completed tasks stay in triage progress count

        awardCommandCenterXP(xp, task.triageTier === 'lockedIn' ? 'LOCKED IN task' : 'task');

        // Check if all locked in tasks done
        const lockedInTasks = getTasksByTier('lockedIn');
        if (lockedInTasks.length > 0 && lockedInTasks.every(t => t.completed)) {
            awardCommandCenterXP(100, 'All LOCKED IN cleared');
            showCelebration('big');
        } else {
            showCelebration(task.triageTier === 'lockedIn' ? 'medium' : 'small');
        }

        if (typeof showCompletionMessage === 'function') showCompletionMessage();
        document.body.classList.add('screen-pulse');
        setTimeout(() => document.body.classList.remove('screen-pulse'), 500);

        checkForPerfectDay();
        updateStreaks();
    } else {
        // Handle un-complete: reverse stats and XP
        const xp = task.triageTier === 'lockedIn' ? 50 :
                   task.crashOutScheduled ? 75 :
                   task.rolledOver ? 40 : 25;
        stats.totalTasks = Math.max(0, (stats.totalTasks || 0) - 1);
        const category = task.category || 'life';
        if (stats.categoryXPGained && category) {
            stats.categoryXPGained[category] = Math.max(0, (stats.categoryXPGained[category] || 0) - xp);
        }
        task.completedAt = null;
    }

    updateStats();
    renderFocusMode();
    renderTasks();
    saveData();
}

// Start focus session (placeholder - will be implemented in Phase 3)
function startFocusSession(taskId) {
    startTaskInFocus(taskId);
}

// Initialize drag and drop for triage columns
var triageDragDropInitialized = false;
function initTriageDragDrop() {
    // Only bind once — column containers persist in DOM, only innerHTML changes
    if (triageDragDropInitialized) return;
    const columns = document.querySelectorAll('.column-tasks');
    if (columns.length === 0) return;

    columns.forEach(column => {
        column.addEventListener('dragover', handleColumnDragOver);
        column.addEventListener('dragleave', handleColumnDragLeave);
        column.addEventListener('drop', handleColumnDrop);
    });
    triageDragDropInitialized = true;
}

function handleColumnDragOver(e) {
    e.preventDefault();
    const column = e.currentTarget.closest('.triage-column');
    if (column) column.classList.add('drag-over');
}

function handleColumnDragLeave(e) {
    const column = e.currentTarget.closest('.triage-column');
    if (column) column.classList.remove('drag-over');
}

function handleColumnDrop(e) {
    e.preventDefault();
    const column = e.currentTarget.closest('.triage-column');
    if (column) {
        column.classList.remove('drag-over');
        const newTier = column.dataset.tier;
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId && newTier) {
            setTaskTier(taskId, newTier);
        }
    }
}

// Legacy function names for compatibility
function updateTriageSectionCounts() {
    updateAllTriageProgress();
}

// Triage task actions - complete a task from Focus Mode or Crash Out
function completeTriageTask(taskId) {
    const task = tasks[taskId];
    if (!task) return;

    const wasCompleted = task.completed;
    const nowCompleted = !wasCompleted;

    // Use spread pattern for Firebase safety
    tasks[taskId] = {
        ...task,
        completed: nowCompleted,
        completedAt: nowCompleted ? Date.now() : null,
        doToday: task.doToday  // Preserve doToday so completed tasks stay in progress count
    };

    if (nowCompleted) {
        // Track completion stats (mirror toggleTask behavior)
        stats.totalTasks = (stats.totalTasks || 0) + 1;

        // Award XP based on tier
        const xp = task.triageTier === 'lockedIn' ? 50 :
                   task.crashOutScheduled ? 75 :
                   task.rolledOver ? 40 : 25;

        const category = task.category || 'life';
        if (stats.categoryXPGained && category) {
            stats.categoryXPGained[category] = (stats.categoryXPGained[category] || 0) + xp;
        }
        awardCommandCenterXP(xp, task.triageTier === 'lockedIn' ? 'LOCKED IN task' : 'task');

        // Check if all locked in tasks done
        const lockedInTasks = getTasksByTier('lockedIn');
        if (lockedInTasks.length > 0 && lockedInTasks.every(t => t.completed)) {
            awardCommandCenterXP(100, 'All LOCKED IN cleared');
            showCelebration('big');
        } else {
            showCelebration(task.triageTier === 'lockedIn' ? 'medium' : 'small');
        }

        // Check for perfect day and update streaks
        checkForPerfectDay();
        updateStreaks();
    } else {
        // Handle un-complete: reverse stats and XP
        const xp = task.triageTier === 'lockedIn' ? 50 :
                   task.crashOutScheduled ? 75 :
                   task.rolledOver ? 40 : 25;
        stats.totalTasks = Math.max(0, (stats.totalTasks || 0) - 1);
        const category = task.category || 'life';
        if (stats.categoryXPGained && category) {
            stats.categoryXPGained[category] = Math.max(0, (stats.categoryXPGained[category] || 0) - xp);
        }
    }

    updateStats();
    renderFocusMode();
    renderTasks(); // Also update Full View
    saveData();
}

function setTaskTier(taskId, tier) {
    const task = tasks[taskId];
    if (!task) return;

    const oldTier = task.triageTier || 'today';

    // Use spread operator to preserve existing properties
    tasks[taskId] = {
        ...task,
        triageTier: tier,
        triageOrder: getTasksByTier(tier).length + 1
    };

    // Remove from crash out if moving to different tier
    if (tier !== 'scheduled' && task.crashOutScheduled) {
        tasks[taskId].crashOutScheduled = false;
        delete tasks[taskId].crashOutTime;
        delete tasks[taskId].crashOutDuration;
    }

    // Targeted re-render: only affected columns + progress
    invalidateTriageCache();
    _renderFrame++;
    renderTriageColumn(tier);
    if (oldTier !== tier) renderTriageColumn(oldTier);
    renderScheduledSection();
    updateAllTriageProgress();
    updateOverallProgress();
    saveData();
    showToast(`Moved to ${tier === 'lockedIn' ? 'LOCKED IN' : tier.toUpperCase()}`, '✓');
}

function sendToCrashOut(taskId) {
    const task = tasks[taskId];
    if (!task) return;

    // If no sleep time set, switch to Crash Out mode for setup
    if (!commandCenterData.crashOut.sleepTime) {
        switchCommandCenterMode('crashout');
        showToast('Set your sleep time first', '⏰');
        return;
    }

    // Reset warning dismissed flag when tasks change
    if (commandCenterData.crashOut) {
        commandCenterData.crashOut.warningDismissed = false;
    }

    // Get existing scheduled tasks sorted by crashOutOrder
    const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);

    // Calculate next order number (add to end of list)
    const maxOrder = scheduledTasks.length > 0
        ? Math.max(...scheduledTasks.map(t => t.crashOutOrder ?? 0))
        : -1;
    const newOrder = maxOrder + 1;

    // Calculate the duration for this task
    const duration = task.size === 'big' ? 60 : task.size === 'small' ? 15 : 30;

    // Calculate start time: if there are existing tasks, start after the last one ends
    let nextTime = new Date();
    if (scheduledTasks.length > 0) {
        const lastTask = scheduledTasks[scheduledTasks.length - 1];
        if (lastTask.crashOutTime) {
            const lastStartDate = parseCrashOutTime(lastTask.crashOutTime);
            if (lastStartDate) {
                const lastDuration = lastTask.crashOutDuration || 30;
                nextTime = new Date(lastStartDate.getTime() + lastDuration * 60 * 1000);
            }
        }
    }

    const timeStr = nextTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Use spread operator to preserve existing properties
    // Also set doToday: true so task counts in progress
    tasks[taskId] = {
        ...task,
        crashOutScheduled: true,
        crashOutTime: timeStr,
        crashOutDuration: duration,
        crashOutOrder: newOrder,
        doToday: true  // Ensures task counts in dashboard progress
    };

    renderFocusMode();
    saveData();
    showToast(`Scheduled for ${timeStr}`, '⏰');
}

// Recalculate all scheduled task times based on their order
// Uses direct mutation to keep cache references valid
function recalculateScheduledTimes() {
    invalidateTriageCache();
    const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
    if (scheduledTasks.length === 0) return;

    var currentTime = new Date();

    // Fix: Anchor to the first task's scheduled time if it exists, to prevent time drift
    if (scheduledTasks[0] && scheduledTasks[0].crashOutTime) {
        const firstTaskTime = parseCrashOutTime(scheduledTasks[0].crashOutTime);
        if (firstTaskTime) {
            currentTime = firstTaskTime;

            // But if the anchor is massively in the past (e.g. >1 hour ago and not active), maybe warn or snap to now.
            // For now, we just respect the user's explicit anchor.
        }
    }


    scheduledTasks.forEach((task, index) => {
        task.crashOutOrder = index;
        task.crashOutTime = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        // Calculate next task's start time (current task's end time)
        const duration = task.crashOutDuration || 30;
        currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);
    });
}

function removeFromCrashOut(taskId) {
    const task = tasks[taskId];
    if (!task) return;

    // Reset warning dismissed flag when tasks change
    if (commandCenterData.crashOut) {
        commandCenterData.crashOut.warningDismissed = false;
    }

    // Direct mutation to keep cache references valid
    task.crashOutScheduled = false;
    delete task.crashOutTime;
    delete task.crashOutDuration;
    delete task.crashOutOrder;

    // Recalculate times for remaining tasks (they shift up)
    recalculateScheduledTimes();

    renderFocusMode();
    saveData();
    showToast('Removed from schedule', '✓');
}

function editTriageTaskText(taskId) {
    const task = tasks[taskId];
    if (!task) return;

    const newText = prompt('Edit task:', task.text);
    if (newText && newText.trim() && newText.trim() !== task.text) {
        tasks[taskId] = { ...task, text: newText.trim() };
        renderFocusMode();
        renderTasks();
        saveData();
    }
}

function triageQuickAddTask() {
    const input = document.getElementById('triageQuickAdd');
    if (!input || !input.value.trim()) {
        showToast('Please enter a task', '⚠️');
        return;
    }

    const id = generateId('task');
    tasks[id] = {
        id: id,
        text: input.value.trim(),
        category: 'health',
        completed: false,
        doToday: true,
        triageTier: 'today',
        triageOrder: getTasksByTier('today').length + 1,
        createdAt: new Date().toISOString(),
        size: 'medium',
        highLeverage: false,
        sortOrder: getCount(tasks)
    };

    input.value = '';
    renderFocusMode();
    renderTasks();
    saveData();
    showToast('Task added to TODAY', '✓');
}

// Triage Drag & Drop
var triageDraggedTaskId = null;

function handleTriageDragStart(event, taskId) {
    triageDraggedTaskId = taskId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId.toString());
}

function handleTriageDragOver(event) {
    event.preventDefault();
    const taskItem = event.target.closest('.cc-task-item');
    if (taskItem && !taskItem.classList.contains('dragging')) {
        taskItem.classList.add('drag-over');
    }
}

function handleTriageDragLeave(event) {
    const taskItem = event.target.closest('.cc-task-item');
    if (taskItem) taskItem.classList.remove('drag-over');
}

function handleTriageDrop(event, targetTaskId, targetTier) {
    event.preventDefault();
    const taskItem = event.target.closest('.cc-task-item');
    if (taskItem) taskItem.classList.remove('drag-over');

    if (triageDraggedTaskId === targetTaskId) return;

    // If dropping on a different tier, change the tier
    const draggedTask = tasks[triageDraggedTaskId];
    if (draggedTask && draggedTask.triageTier !== targetTier) {
        setTaskTier(triageDraggedTaskId, targetTier);
    } else {
        // Reorder within same tier
        reorderTriageTasks(triageDraggedTaskId, targetTaskId, targetTier);
    }

    triageDraggedTaskId = null;
}

function handleTriageDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.task-card.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.triage-column.drag-over').forEach(el => el.classList.remove('drag-over'));
    triageDraggedTaskId = null;
}

function reorderTriageTasks(draggedId, targetId, tier) {
    const tierTasks = getTasksByTier(tier);
    const draggedIndex = tierTasks.findIndex(t => String(t.id) === String(draggedId));
    const targetIndex = tierTasks.findIndex(t => String(t.id) === String(targetId));

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder
    tierTasks.forEach((task, i) => {
        var newOrder = i;
        if (i === draggedIndex) {
            newOrder = targetIndex;
        } else if (draggedIndex < targetIndex && i > draggedIndex && i <= targetIndex) {
            newOrder = i - 1;
        } else if (draggedIndex > targetIndex && i >= targetIndex && i < draggedIndex) {
            newOrder = i + 1;
        }
        task.triageOrder = newOrder;
    });

    // Targeted re-render: only the affected column
    invalidateTriageCache();
    _renderFrame++;
    renderTriageColumn(tier);
    saveData();
}

// Section drag handlers for moving between columns
function handleSectionDragOver(event, tier) {
    event.preventDefault();
    const section = event.target.closest('.cc-section');
    if (section && triageDraggedTaskId) {
        section.classList.add('drop-target');
    }
}

function handleSectionDragLeave(event) {
    const section = event.target.closest('.cc-section');
    if (section) section.classList.remove('drop-target');
}

function handleSectionDrop(event, targetTier) {
    event.preventDefault();
    const section = event.target.closest('.cc-section');
    if (section) section.classList.remove('drop-target');

    if (!triageDraggedTaskId) return;

    const draggedTask = tasks[triageDraggedTaskId];
    if (!draggedTask) return;

    // If dropping on scheduled section, send to crash out
    if (targetTier === 'scheduled') {
        sendToCrashOut(triageDraggedTaskId);
    } else {
        // Move to new tier
        setTaskTier(triageDraggedTaskId, targetTier);
    }

    triageDraggedTaskId = null;
}

// Long press for task details modal
var longPressTimer = null;
var longPressTaskId = null;

function startLongPress(event, taskId) {
    longPressTaskId = taskId;
    const taskItem = event.target.closest('.cc-task-item');
    longPressTimer = setTimeout(() => {
        if (taskItem) taskItem.classList.add('long-pressing');
        showTaskDetailsModal(taskId);
    }, 500);
}

function endLongPress(event) {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    const taskItem = event.target.closest('.cc-task-item');
    if (taskItem) taskItem.classList.remove('long-pressing');
}

function showTaskDetailsModal(taskId) {
    const task = tasks[taskId];
    if (!task) return;

    const tierLabels = {
        lockedIn: '🔥 LOCKED IN',
        today: '📋 TODAY',
        scheduled: '⏰ SCHEDULED',
        tomorrow: '📅 TOMORROW'
    };
    const tierLabel = tierLabels[task.triageTier] || tierLabels.today;
    const catInfo = getCategoryInfo(task.category);

    const modal = document.createElement('div');
    modal.className = 'task-details-modal';
    modal.id = 'taskDetailsModal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="task-details-content">
            <div class="task-details-header">
                <div class="task-details-title">${escapeHtml(task.text)}</div>
                <button class="task-details-close" onclick="closeTaskDetailsModal()">×</button>
            </div>
            <div class="task-details-info">
                <div class="task-details-row">
                    <span class="task-details-label">Tier</span>
                    <span class="task-details-value">${tierLabel}</span>
                </div>
                <div class="task-details-row">
                    <span class="task-details-label">Category</span>
                    <span class="task-details-value">${catInfo.icon} ${catInfo.label}</span>
                </div>
                ${task.crashOutScheduled ? `
                <div class="task-details-row">
                    <span class="task-details-label">Scheduled</span>
                    <span class="task-details-value">${task.crashOutTime || 'TBD'} (${task.crashOutDuration || 30}m)</span>
                </div>
                ` : ''}
                ${task.rolledOver ? `
                <div class="task-details-row">
                    <span class="task-details-label">Rolled Over</span>
                    <span class="task-details-value">From ${task.rolledOver.fromDate}</span>
                </div>
                ` : ''}
                <div class="task-details-row">
                    <span class="task-details-label">Created</span>
                    <span class="task-details-value">${task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
            </div>
            <div class="task-details-actions">
                <button onclick="startTaskInFocus('${taskId}'); closeTaskDetailsModal();">
                    <span>▶</span> Start Focus Session
                </button>
                <button onclick="sendToCrashOut('${taskId}'); closeTaskDetailsModal();">
                    <span>🔥</span> Send to Crash Out
                </button>
                <button onclick="editTriageTaskText('${taskId}'); closeTaskDetailsModal();">
                    <span>✏️</span> Edit Task Text
                </button>
                <button class="danger-btn" onclick="unflagFromToday('${taskId}'); closeTaskDetailsModal();">
                    <span>🚫</span> Remove from Today (unflag)
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeTaskDetailsModal() {
    const modal = document.getElementById('taskDetailsModal');
    if (modal) modal.remove();
}

// Unflag task from today (remove from Focus View)
function unflagFromToday(taskId) {
    const task = tasks[taskId];
    if (!task) return;

    tasks[taskId] = {
        ...task,
        doToday: false,
        triageTier: null,
        crashOutScheduled: false
    };
    delete tasks[taskId].crashOutTime;
    delete tasks[taskId].crashOutDuration;

    renderFocusMode();
    renderTasks();
    saveData();
    showToast('Removed from today', '✓');
}
