// ============================================
// tasks.js — Task CRUD, categories, dashboard, view switching,
//            focus mode planning, command center core, task edit modal
// Extracted from index.html Phase 5
// ============================================

// ==================== CATEGORY DISPLAY ====================

function updateCategoryDisplay() {
    const xpBar = document.getElementById('categoryXPBar');
    const medTracker = document.getElementById('medicationTracker');

    if (currentCategory === 'health') {
        // Show medication tracker, hide XP bar
        if (xpBar) xpBar.style.display = 'none';
        if (medTracker) medTracker.style.display = 'block';
        updateMedicationDisplay();
    } else {
        // Show XP bar, hide medication tracker
        if (xpBar) xpBar.style.display = 'block';
        if (medTracker) medTracker.style.display = 'none';
        updateCategoryXPDisplay();
    }
}

// Add task
function addTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (!text) return;

    // If adding from dotoday view, default to health category
    let taskCategory = currentCategory;
    let markDoToday = false;

    if (currentCategory === 'dotoday') {
        taskCategory = 'health'; // Default category
        markDoToday = true;
    }

    const id = generateId('task');
    const task = {
        id: id,
        text: text,
        category: taskCategory,
        completed: false,
        doToday: markDoToday,
        createdAt: new Date().toISOString(),
        size: 'medium',
        highLeverage: false,
        sortOrder: getCount(tasks)
    };

    tasks[id] = task;
    input.value = '';
    renderTasks();
    if (currentView === 'focus') renderFocusMode();
    saveData();
}

// Update category XP display
function updateCategoryXPDisplay() {
    const categoryNames = {
        financial: 'Financial Progress',
        clinic: 'Clinic Requirements Progress',
        health: 'Health & Wellbeing Progress',
        school: 'School Maintenance Progress',
        academic: 'Academic & Didactic Progress',
        future: 'Future Job & Life Progress',
        life: 'General Life Maintenance Progress'
    };

    // Get tasks for current category
    const categoryTasks = getValues(tasks).filter(t => t.category === currentCategory);
    const completedTasks = categoryTasks.filter(t => t.completed);
    const totalTasks = categoryTasks.length;

    // Calculate XP: completed tasks * 20 / total tasks * 20
    const earnedXP = completedTasks.length * 20;
    const totalXP = totalTasks * 20;
    const percentage = totalTasks > 0 ? (earnedXP / totalXP) * 100 : 0;

    const labelElement = document.getElementById('categoryXPLabel');
    const textElement = document.getElementById('categoryXPText');
    const progressElement = document.getElementById('categoryXPProgress');

    if (labelElement) labelElement.textContent = categoryNames[currentCategory];
    if (textElement) textElement.textContent = `${earnedXP} / ${totalXP} XP`;
    if (progressElement) progressElement.style.width = percentage + '%';
}

// ==================== RENDER TASKS ====================

function renderTasks() {
    const taskList = document.getElementById('taskList');
    const allTasks = getValues(tasks); // Cache once per render
    let filteredTasks;

    if (currentCategory === 'dotoday') {
        filteredTasks = allTasks.filter(t => t.doToday && !t.completed);
    } else {
        filteredTasks = allTasks.filter(t => t.category === currentCategory && !t.completed);
    }

    filteredTasks.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Single-pass category counts (replaces 8 separate filter calls)
    const categoryCounts = {};
    let doTodayCount = 0;
    for (let i = 0; i < allTasks.length; i++) {
        const t = allTasks[i];
        if (!t.completed) {
            if (t.category) categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
            if (t.doToday) doTodayCount++;
        }
    }
    const categories = ['financial', 'clinic', 'health', 'school', 'academic', 'future', 'life'];
    categories.forEach(cat => {
        const countElement = document.getElementById(`count-${cat}`);
        if (countElement) countElement.textContent = `(${categoryCounts[cat] || 0})`;
    });

    const doTodayCountElement = document.getElementById('count-dotoday');
    if (doTodayCountElement) {
        doTodayCountElement.textContent = `(${doTodayCount})`;
    }

    if (filteredTasks.length === 0) {
        let emptyMessage = 'No tasks yet. Add one above to get started!';
        if (currentCategory === 'dotoday') {
            emptyMessage = 'No critical tasks for today. Mark tasks with "Today" to see them here!';
        }

        taskList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                <p>${emptyMessage}</p>
            </div>
        `;
        return;
    }

    taskList.innerHTML = filteredTasks.map((task, index) => {
        const isDoTodayView = currentCategory === 'dotoday';
        const categoryIcons = {
            financial: icon('wallet'),
            clinic: icon('heart'),
            health: icon('heart'),
            school: icon('clipboard-list'),
            academic: icon('graduation-cap'),
            future: icon('rocket'),
            life: icon('home')
        };
        const categoryNames = {
            financial: 'Financial',
            clinic: 'Clinic',
            health: 'Health',
            school: 'School',
            academic: 'Academic',
            future: 'Future',
            life: 'Life'
        };

        const sizeIcon = task.size === 'big' ? '<span class="size-dot size-big"></span>' : task.size === 'small' ? '<span class="size-dot size-small"></span>' : '<span class="size-dot size-medium"></span>';
        const leverageIcon = task.highLeverage ? icon('activity') : '';

        return `
            <div class="task-item ${isDoTodayView ? 'dotoday' : task.category}"
                 draggable="true"
                 data-task-id="${task.id}"
                 data-index="${index}"
                 ondragstart="handleDragStart(event, '${task.id}')"
                 ondragover="handleDragOver(event)"
                 ondragleave="handleDragLeave(event)"
                 ondrop="handleDrop(event, '${task.id}')"
                 ondragend="handleDragEnd(event)">
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <div class="task-row-top">
                    <input type="checkbox"
                           class="task-checkbox"
                           ${task.completed ? 'checked' : ''}
                           onchange="toggleTask('${task.id}')">
                    ${isDoTodayView ? `<span class="category-label">${categoryIcons[task.category]} ${categoryNames[task.category]}</span>` : ''}
                    <span style="font-size: 0.8em; flex-shrink: 0;" title="${task.size || 'medium'} task${task.highLeverage ? ' - High Leverage' : ''}">${sizeIcon}${leverageIcon}</span>
                    <div class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</div>
                </div>
                <div class="task-actions">
                    ${task.doToday && !isDoTodayView ? '<span class="today-badge"><span class="do-today-dot"></span> TODAY</span>' : ''}
                    ${!task.completed && !isDoTodayView ? `
                        <button class="do-today-btn ${task.doToday ? 'active' : ''}" onclick="toggleDoToday('${task.id}')">
                            ${task.doToday ? icon('check') + ' Today' : '<span class="do-today-dot"></span> Today'}
                        </button>
                    ` : ''}
                    ${!task.completed ? `<button class="task-timer-btn" onclick="startTaskTimer('${task.id}')">${icon('timer')}</button>` : ''}
                    ${!task.completed ? `<button class="task-timer-btn" onclick="openTaskEditModal('${task.id}')" style="background: #6366f1;">${icon('edit')}</button>` : ''}
                    <button class="task-delete-btn" onclick="deleteTask('${task.id}')">${icon('trash-2')}</button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== FULL VIEW DRAG & DROP ====================

let draggedTaskId = null;

function handleDragStart(event, taskId) {
    draggedTaskId = taskId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const taskItem = event.target.closest('.task-item');
    if (taskItem && !taskItem.classList.contains('dragging')) {
        taskItem.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const taskItem = event.target.closest('.task-item');
    if (taskItem) {
        taskItem.classList.remove('drag-over');
    }
}

function handleDrop(event, targetTaskId) {
    event.preventDefault();
    const taskItem = event.target.closest('.task-item');
    if (taskItem) {
        taskItem.classList.remove('drag-over');
    }

    if (draggedTaskId === targetTaskId) return;

    // Find indices
    const draggedTask = tasks[draggedTaskId];
    const targetTask = tasks[targetTaskId];

    if (!draggedTask || !targetTask) return;

    // Get filtered tasks for current view to determine visual order
    let filteredTasks;
    if (currentCategory === 'dotoday') {
        filteredTasks = getValues(tasks).filter(t => t.doToday && !t.completed);
    } else {
        filteredTasks = getValues(tasks).filter(t => t.category === currentCategory && !t.completed);
    }

    // Update sortOrder for all filtered tasks
    const draggedIndex = filteredTasks.findIndex(t => String(t.id) === String(draggedTaskId));
    const targetIndex = filteredTasks.findIndex(t => String(t.id) === String(targetTaskId));

    // Reorder - adjust targetIndex when dragging down (target shifts after removal)
    filteredTasks.splice(draggedIndex, 1);
    const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    filteredTasks.splice(insertIndex, 0, draggedTask);

    // Update sortOrder based on new positions
    filteredTasks.forEach((task, index) => {
        task.sortOrder = index;
    });

    renderTasks();
    saveData();
    showToast('Tasks reordered!', 'ok');
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedTaskId = null;
}

// ==================== TASK ACTIONS ====================

// Toggle task completion
function toggleTask(id) {
    const task = tasks[id];
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        // Task completed: add XP, set timestamp, remove from "Do Today" if marked
        const xpValue = task.xp || 20;

        // Store XP value on task if not already set
        if (!task.xp) {
            task.xp = xpValue;
        }

        stats.totalXPGained += xpValue;
        stats.categoryXPGained[task.category] = (stats.categoryXPGained[task.category] || 0) + xpValue;
        stats.totalTasks++;

        // Set completion timestamp
        task.completedAt = Date.now();

        // When completed, preserve doToday so completed tasks stay in triage progress count

        updateStats();

        // Clear current task if it was the one completed
        if (currentTask && currentTask.id === id) {
            currentTask = null;
            document.getElementById('currentTaskDisplay').style.display = 'none';
        }
    } else {
        // Task uncompleted: remove XP and timestamp
        const xpValue = task.xp || 20;
        stats.totalXPGained = Math.max(0, stats.totalXPGained - xpValue);
        stats.categoryXPGained[task.category] = Math.max(0, (stats.categoryXPGained[task.category] || 0) - xpValue);
        stats.totalTasks = Math.max(0, stats.totalTasks - 1);

        // Clear completion timestamp but KEEP task.xp
        task.completedAt = null;
        updateStats();
    }

    renderTasks();
    saveData();

    // Refresh any open dashboard expansions
    document.querySelectorAll('.dashboard-expansion.show').forEach(exp => {
        const expId = exp.id.replace('expansion', '').charAt(0).toLowerCase() + exp.id.replace('expansion', '').slice(1);
        updateDashboardExpansion(expId);
    });
}

// Toggle "Do Today" status
function toggleDoToday(id) {
    const task = tasks[id];
    if (!task) return;

    task.doToday = !task.doToday;
    renderTasks();
    updateStats();
    saveData();

    const message = task.doToday ? 'Marked as critical for today!' : 'Removed from today\'s list';
    showToast(message, task.doToday ? '!' : 'i');
}

// Delete task
function deleteTask(id) {
    if (tasks[id]) {
        delete tasks[id];
    }

    // FIX: Clean up orphaned references in focusModeData
    if (focusModeData.oneThingId === id) {
        focusModeData.oneThingId = null;
        focusModeData.microSteps = {};  // Object for Firebase safety
    }
    // Remove from todaysTasks objects
    ['big', 'medium', 'small'].forEach(size => {
        if (focusModeData.todaysTasks[size]) {
            delete focusModeData.todaysTasks[size][id];
        }
    });

    renderTasks();
    if (currentView === 'focus') renderFocusMode();
    saveData();
}

// ==================== FULL VIEW TIMER ====================

// Start timer for specific task
function startTaskTimer(id) {
    // Ensure id is a string for consistent lookup
    const taskId = String(id);
    const task = tasks[taskId];
    if (!task) {
        console.warn('startTaskTimer: Task not found with id:', taskId);
        return;
    }

    currentTask = task;
    const displayEl = document.getElementById('currentTaskDisplay');
    const nameEl = document.getElementById('currentTaskName');

    if (displayEl) displayEl.style.display = 'block';
    if (nameEl) nameEl.textContent = task.text;

    resetTimer();
    startTimer();
    showToast('Timer started!', 'ok');
}

// Pomodoro selection
function selectPomodoro(work, breakTime) {
    workMinutes = work;
    breakMinutes = breakTime;

    document.querySelectorAll('.pomodoro-option').forEach(opt => opt.classList.remove('active'));
    const ev = window.event || arguments[arguments.length - 1];
    if (ev && ev.target) ev.target.closest('.pomodoro-option').classList.add('active');

    resetTimer();
}

// Timer functions
function startTimer() {
    if (timerInterval) return;

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';

    timerInterval = setInterval(() => {
        currentSeconds--;
        updateTimerDisplay();

        if (currentSeconds <= 0) {
            completeSession();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isWorkSession = true;
    currentSeconds = workMinutes * 60;
    updateTimerDisplay();
    document.getElementById('timerMode').textContent = 'Work Session';
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    document.getElementById('timerClock').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function completeSession() {
    clearInterval(timerInterval);
    timerInterval = null;

    if (isWorkSession) {
        // Work session completed
        playNotification();

        // Switch to break
        isWorkSession = false;
        currentSeconds = breakMinutes * 60;
        document.getElementById('timerMode').textContent = 'Break Time!';
        updateTimerDisplay();

        alert('Great work! Time for a break!');
    } else {
        // Break completed
        isWorkSession = true;
        currentSeconds = workMinutes * 60;
        document.getElementById('timerMode').textContent = 'Work Session';
        updateTimerDisplay();

        alert('Break over! Ready for another session?');
    }

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    saveData();
}

function playNotification() {
    // Simple beep notification
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// XP system removed - was referencing non-existent stats properties

// ==================== DASHBOARD EXPANSION ====================

// Dashboard expansion functions - Modal Style
function toggleDashboardExpansion(type) {
    const expansionId = `expansion${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const expansion = document.getElementById(expansionId);
    const backdrop = document.getElementById('expansionBackdrop');

    if (!expansion) return;

    if (expansion.classList.contains('show')) {
        closeAllExpansions();
    } else {
        // Close any open expansions first
        closeAllExpansions();

        // Open this one
        expansion.classList.add('show');
        backdrop.classList.add('show');

        // Populate content
        updateDashboardExpansion(type);
    }
}

function closeAllExpansions() {
    document.querySelectorAll('.dashboard-expansion').forEach(exp => {
        exp.classList.remove('show');
    });
    document.querySelectorAll('.stat-card').forEach(card => {
        card.classList.remove('expanded');
    });
    const backdrop = document.getElementById('expansionBackdrop');
    if (backdrop) backdrop.classList.remove('show');
}

function updateDashboardExpansion(type) {
    const contentId = `content${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const content = document.getElementById(contentId);
    if (!content) return;

    let tasksToShow = [];

    if (type === 'doToday') {
        tasksToShow = getValues(tasks).filter(t => t.doToday && !t.completed);
    } else if (type === 'remaining') {
        tasksToShow = getValues(tasks).filter(t => !t.completed);
    } else if (type === 'completed') {
        tasksToShow = getValues(tasks).filter(t => t.completed);
        // Sort by completion time (newest first)
        tasksToShow.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    }

    if (tasksToShow.length === 0) {
        const emptyMessage = type === 'completed'
            ? 'No completed tasks yet. Complete a task to see it here!'
            : 'No tasks here!';
        content.innerHTML = `<div class="expansion-empty">${emptyMessage}</div>`;
        return;
    }

    const categoryIcons = {
        financial: icon('wallet'),
        clinic: icon('heart'),
        health: icon('heart'),
        school: icon('clipboard-list'),
        academic: icon('graduation-cap'),
        future: icon('rocket'),
        life: icon('home')
    };

    const categoryNames = {
        financial: 'Financial',
        clinic: 'Clinic',
        health: 'Health',
        school: 'School',
        academic: 'Academic',
        future: 'Future',
        life: 'Life'
    };

    if (type === 'completed') {
        // Completed tasks - show with uncomplete option
        content.innerHTML = tasksToShow.map(task => `
            <div class="expansion-task" style="border-left-color: #10b981;">
                <input type="checkbox"
                       class="expansion-task-check"
                       checked
                       onchange="uncompleteTaskFromDashboard('${task.id}')"
                       title="Click to mark as incomplete">
                <span class="expansion-task-text" style="text-decoration: line-through; opacity: 0.7;">
                    ${escapeHtml(task.text)}
                    <span class="expansion-task-category">${categoryIcons[task.category] || icon('clipboard-list')} ${categoryNames[task.category] || 'Task'}</span>
                </span>
            </div>
        `).join('');
    } else {
        // Incomplete tasks
        content.innerHTML = tasksToShow.map(task => `
            <div class="expansion-task">
                <input type="checkbox"
                       class="expansion-task-check"
                       onchange="toggleTaskFromDashboard(${task.id}, '${type}')"
                       ${task.completed ? 'checked' : ''}>
                <span class="expansion-task-text">
                    ${escapeHtml(task.text)}
                    <span class="expansion-task-category">${categoryIcons[task.category] || icon('clipboard-list')} ${categoryNames[task.category] || task.category || 'Task'}</span>
                </span>
            </div>
        `).join('');
    }
}

function toggleTaskFromDashboard(taskId, expansionType) {
    toggleTask(taskId);
    updateDashboardExpansion(expansionType);
    updateStats();
}

function uncompleteTaskFromDashboard(taskId) {
    const task = tasks[taskId];
    if (task && task.completed) {
        task.completed = false;
        delete task.completedAt;
        stats.totalXPGained -= 20;
        stats.totalTasks--;
        saveData();
        updateStats();
        renderTasks();
        updateDashboardExpansion('completed');
        showToast('Task marked as incomplete', 'ok');
    }
}

// Legacy function - redirect to new system
function toggleCompletedTasks() {
    toggleDashboardExpansion('completed');
}

function renderCompletedTasks() {
    updateDashboardExpansion('completed');
}

// Legacy uncomplete function - uses the new system
function uncompleteTask(taskId) {
    uncompleteTaskFromDashboard(taskId);
}

// ==================== STATS ====================

function updateStats() {
    const totalXPElement = document.getElementById('totalXPGained');
    const totalElement = document.getElementById('totalTasks');
    const remainingElement = document.getElementById('tasksRemaining');
    const availableElement = document.getElementById('totalXPAvailable');
    const doTodayElement = document.getElementById('tasksToDoToday');

    // Calculate metrics — single pass
    const allTasksArr = getValues(tasks);
    let tasksRemaining = 0;
    let doTodayTasks = 0;
    for (let i = 0; i < allTasksArr.length; i++) {
        if (!allTasksArr[i].completed) {
            tasksRemaining++;
            if (allTasksArr[i].doToday) doTodayTasks++;
        }
    }
    const totalXPAvailable = tasksRemaining * 20;

    if (totalXPElement) totalXPElement.textContent = stats.totalXPGained;
    if (totalElement) totalElement.textContent = stats.totalTasks;
    if (remainingElement) remainingElement.textContent = tasksRemaining;
    if (availableElement) availableElement.textContent = totalXPAvailable;
    if (doTodayElement) doTodayElement.textContent = doTodayTasks;

    // Update level display
    const totalXP = commandCenterData?.focusStats?.totalXP || stats.totalXPGained || 0;
    const currentLevel = Math.floor(totalXP / 500) + 1;
    const levelBadge = document.getElementById('xpLevelBadge');
    const levelBar = document.getElementById('xpLevelBarFill');
    if (levelBadge) levelBadge.textContent = currentLevel;
    if (levelBar) levelBar.style.width = `${((totalXP % 500) / 500) * 100}%`;
    if (typeof updateStreakBadge === 'function') updateStreakBadge();

    // Update current category XP display
    updateCategoryXPDisplay();

    // Update compact header (mirrors Do Today + streak counts)
    if (typeof updateCompactHeader === 'function') updateCompactHeader();
}

// ============================================
// FOCUS MODE FUNCTIONS
// ============================================

function switchToFocusMode() {
    currentView = 'focus';
    document.body.classList.add('focus-active');
    document.getElementById('focusModeContainer').style.display = 'block';
    document.getElementById('fullViewContainer').style.display = 'none';
    document.getElementById('focusModeBtn').style.background = 'rgba(255,255,255,0.95)';
    document.getElementById('focusModeBtn').style.color = '#667eea';
    document.getElementById('fullViewBtn').style.background = 'rgba(255,255,255,0.1)';
    document.getElementById('fullViewBtn').style.color = 'white';
    renderFocusMode();

    // Update compact header view toggle
    var fb = document.getElementById('compactFocusBtn');
    var tb = document.getElementById('compactFullBtn');
    if (fb) fb.classList.add('active');
    if (tb) tb.classList.remove('active');
}

function switchToFullView() {
    currentView = 'full';
    document.body.classList.remove('focus-active');
    document.getElementById('focusModeContainer').style.display = 'none';
    document.getElementById('fullViewContainer').style.display = 'block';
    document.getElementById('focusModeBtn').style.background = 'rgba(255,255,255,0.1)';
    document.getElementById('focusModeBtn').style.color = 'white';
    document.getElementById('fullViewBtn').style.background = 'rgba(255,255,255,0.95)';
    document.getElementById('fullViewBtn').style.color = '#667eea';
    // Re-render tasks so Full View shows current data
    if (typeof renderTasks === 'function') renderTasks();

    // Update compact header view toggle
    var fb = document.getElementById('compactFocusBtn');
    var tb = document.getElementById('compactFullBtn');
    if (fb) fb.classList.remove('active');
    if (tb) tb.classList.add('active');
}

// _renderFrame extracted to state.js
function renderFocusMode() {
    _renderFrame++; // Increment frame for getTodayTriageTasks cache
    // Render the new Command Center
    updateCommandCenterGreeting();
    updateOverallProgress();

    // Render based on current mode
    const currentMode = getCurrentCommandCenterMode();
    if (currentMode === 'triage') {
        renderTriageMode();
    } else if (currentMode === 'crashout') {
        renderCrashOutMode();
    } else if (currentMode === 'focus') {
        renderFocusPomodoroMode();
    }
}

function updateFocusGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17 && hour < 21) greeting = 'Good evening';
    if (hour >= 21 || hour < 5) greeting = 'Good night';

    const el = document.getElementById('focusGreeting');
    if (el) el.textContent = `${greeting}, Sully`;
}

// ==================== ONE THING / FOCUS PLANNING ====================

function renderOneThingCard() {
    const container = document.getElementById('oneThingContent');
    if (!container) return;

    const oneThingTask = focusModeData.oneThingId ?
        getValues(tasks).find(t => t.id === focusModeData.oneThingId && !t.completed) : null;

    if (!oneThingTask) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 4em; margin-bottom: 15px;">${icon('target', 48)}</div>
                <div style="color: #b0b8c4; font-size: 1.1em; margin-bottom: 20px;">
                    What's the ONE thing that would make today a success?
                </div>
                <button onclick="openOneThingPicker()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 12px; padding: 14px 28px; color: white; font-weight: 700; font-size: 1.1em; cursor: pointer;">
                    Choose Your ONE Thing
                </button>
            </div>
        `;
        return;
    }

    const catInfo = getCategoryInfo(oneThingTask.category);
    const sizeIcon = oneThingTask.size === 'big' ? '<span class="size-dot size-big"></span>' : oneThingTask.size === 'small' ? '<span class="size-dot size-small"></span>' : '<span class="size-dot size-medium"></span>';

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <div style="font-size: 2em;">${icon('flame', 24)}</div>
            <div style="color: #fbbf24; font-size: 1.4em; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">THE ONE THING</div>
            ${oneThingTask.highLeverage ? '<div style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 12px; border-radius: 12px; font-size: 0.8em; font-weight: 600;">' + icon('activity') + ' HIGH LEVERAGE</div>' : ''}
            <div style="margin-left: auto; display: flex; gap: 8px;">
                <button onclick="openOneThingPicker()" style="background: rgba(255,255,255,0.1); border: 1px solid #6b7280; border-radius: 8px; padding: 6px 12px; color: #c9d1d9; font-size: 0.85em; cursor: pointer;" title="Change to different task">${icon('refresh-cw')} Change</button>
                <button onclick="clearOneThing()" style="background: rgba(255,255,255,0.1); border: 1px solid #6b7280; border-radius: 8px; padding: 6px 12px; color: #c9d1d9; font-size: 0.85em; cursor: pointer;" title="Clear and pick later">${icon('x')}</button>
            </div>
        </div>

        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="color: #e6edf3; font-size: 1.3em; font-weight: 600; margin-bottom: 8px;">${escapeHtml(oneThingTask.text)}</div>
            <div style="display: flex; gap: 15px; font-size: 0.85em; color: #b0b8c4;">
                <span style="padding: 2px 8px; border-radius: 6px; background: ${catInfo.color}20; color: ${catInfo.color};">${catInfo.emoji} ${catInfo.name}</span>
                <span>${sizeIcon} ${oneThingTask.size || 'Medium'}</span>
            </div>
        </div>

        <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px 20px; margin-bottom: 20px;">
            <div style="color: #b0b8c4; font-size: 0.9em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                Break it down (micro-steps):
            </div>
            <div id="microStepsList">${renderMicroSteps()}</div>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                <input type="text" id="newMicroStep" placeholder="Add a tiny next step..."
                       onkeypress="if(event.key==='Enter')addMicroStep()"
                       style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 8px; padding: 10px 14px; color: #e6edf3; font-size: 0.95em;">
                <button onclick="addMicroStep()" style="background: #667eea; border: none; border-radius: 8px; padding: 10px 16px; color: white; font-weight: 600; cursor: pointer;">+ Add</button>
            </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 12px; flex-wrap: wrap;">
            <div id="oneThingTimerDisplay" style="font-family: Monaco, monospace; font-size: 2.2em; font-weight: 700; color: #e6edf3;">
                ${formatFocusTimer(focusModeData.focusTimerSeconds)}
            </div>
            <button id="oneThingTimerBtn" onclick="toggleFocusTimer()" style="padding: 12px 24px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.95em; cursor: pointer; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                ${focusModeData.focusTimerRunning ? icon('pause') + ' Pause' : icon('play') + ' Start Focus'}
            </button>
            <button onclick="completeOneThing()" style="padding: 12px 24px; border: none; border-radius: 10px; font-weight: 700; font-size: 0.95em; cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                ${icon('check')} Complete
            </button>
        </div>
    `;
}

function renderMicroSteps() {
    const steps = getValues(focusModeData.microSteps);
    if (steps.length === 0) {
        return '<div style="color: #6b7280; font-size: 0.9em; padding: 10px;">No micro-steps yet. Break your task into tiny pieces!</div>';
    }

    return steps.map(step => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; ${step.completed ? 'opacity: 0.6;' : ''}">
            <div onclick="toggleMicroStep('${step.id}')" style="width: 22px; height: 22px; border: 2px solid ${step.completed ? '#10b981' : '#667eea'}; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; background: ${step.completed ? '#10b981' : 'transparent'}; color: white; flex-shrink: 0;">
                ${step.completed ? icon('check') : ''}
            </div>
            <div style="flex: 1; color: #c9d1d9; ${step.completed ? 'text-decoration: line-through; color: #6b7280;' : ''}">${escapeHtml(step.text)}</div>
            <button onclick="removeMicroStep('${step.id}')" style="background: none; border: none; color: #6b7280; cursor: pointer; padding: 5px;">${icon('x')}</button>
        </div>
    `).join('');
}

function addMicroStep() {
    const input = document.getElementById('newMicroStep');
    if (!input || !input.value.trim()) return;

    if (!focusModeData.microSteps || Array.isArray(focusModeData.microSteps)) {
        focusModeData.microSteps = migrateArrayToObject(focusModeData.microSteps, 'step');
    }
    const stepId = generateId('step');
    focusModeData.microSteps[stepId] = { id: stepId, text: input.value.trim(), completed: false };
    input.value = '';
    renderOneThingCard();
    saveData();
}

function toggleMicroStep(stepId) {
    if (focusModeData.microSteps && focusModeData.microSteps[stepId]) {
        focusModeData.microSteps[stepId].completed = !focusModeData.microSteps[stepId].completed;
        renderOneThingCard();
        saveData();
    }
}

function removeMicroStep(stepId) {
    if (focusModeData.microSteps && focusModeData.microSteps[stepId]) {
        delete focusModeData.microSteps[stepId];
        renderOneThingCard();
        saveData();
    }
}

function formatFocusTimer(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function toggleFocusTimer() {
    if (focusModeData.focusTimerRunning) {
        clearInterval(focusModeData.focusTimerInterval);
        focusModeData.focusTimerRunning = false;
    } else {
        focusModeData.focusTimerRunning = true;
        focusModeData.focusTimerInterval = setInterval(() => {
            focusModeData.focusTimerSeconds++;
            const display = document.getElementById('focusTimerDisplay');
            if (display) display.textContent = formatFocusTimer(focusModeData.focusTimerSeconds);
        }, 1000);
    }
    const btn = document.getElementById('focusTimerBtn');
    if (btn) btn.innerHTML = focusModeData.focusTimerRunning ? icon('pause') + ' Pause' : icon('play') + ' Start Focus Session';
}

function completeOneThing() {
    if (!focusModeData.oneThingId) return;
    const task = getValues(tasks).find(t => t.id === focusModeData.oneThingId);
    if (task) {
        toggleTask(task.id);
        focusModeData.oneThingId = null;
        focusModeData.microSteps = {};  // Object for Firebase safety
        focusModeData.focusTimerSeconds = 0;
        if (focusModeData.focusTimerRunning) {
            clearInterval(focusModeData.focusTimerInterval);
            focusModeData.focusTimerRunning = false;
        }
        renderFocusMode();
        saveData();
        showToast('ONE THING completed! Great work!', 'ok');
    }
}

function openOneThingPicker() {
    planningMode = 'onething';
    selectedPlanningTaskId = null;
    const modal = document.getElementById('planningModal');
    const title = document.getElementById('planningModalTitle');
    const body = document.getElementById('planningModalBody');

    if (title) title.textContent = 'Select Your ONE THING for Today';

    const incompleteTasks = getValues(tasks).filter(t => !t.completed);
    const sortedTasks = incompleteTasks.sort((a, b) => {
        if (a.highLeverage && !b.highLeverage) return -1;
        if (!a.highLeverage && b.highLeverage) return 1;
        const sizeOrder = { big: 0, medium: 1, small: 2 };
        return (sizeOrder[a.size] || 1) - (sizeOrder[b.size] || 1);
    });

    if (body) {
        body.innerHTML = `
            <div style="margin-bottom: 30px;">
                <div style="font-size: 1.1em; font-weight: 700; margin-bottom: 15px; color: #c9d1d9;">
                    Choose the task that would make today a success if completed:
                </div>
                ${sortedTasks.length === 0 ?
                    '<div style="color: #b0b8c4; padding: 20px; text-align: center;">No tasks yet. Add some in Full View first!</div>' :
                    sortedTasks.map(task => renderPlanningTaskOption(task)).join('')
                }
            </div>
        `;
    }
    if (modal) modal.style.display = 'flex';
}

function openAddTasksModal(size) {
    planningMode = size;
    selectedPlanningTaskId = null;
    const modal = document.getElementById('planningModal');
    const title = document.getElementById('planningModalTitle');
    const body = document.getElementById('planningModalBody');

    const sizeLabels = { big: 'Big Tasks', medium: 'Medium Tasks', small: 'Small Tasks' };
    if (title) title.textContent = `Add ${sizeLabels[size]} to Today`;

    const sizeTasks = getValues(tasks).filter(t =>
        !t.completed &&
        (t.size === size || (!t.size && size === 'medium')) &&
        !hasTaskId(focusModeData.todaysTasks[size], t.id)
    );

    if (body) {
        body.innerHTML = `
            <div style="margin-bottom: 30px;">
                <div style="font-size: 1.1em; font-weight: 700; margin-bottom: 15px; color: #c9d1d9;">
                    Select tasks to add to today's ${size} tasks:
                </div>
                ${sizeTasks.length === 0 ?
                    `<div style="color: #b0b8c4; padding: 20px; text-align: center;">No ${size} tasks available.</div>` :
                    sizeTasks.map(task => renderPlanningTaskOption(task)).join('')
                }
            </div>
        `;
    }
    if (modal) modal.style.display = 'flex';
}

function renderPlanningTaskOption(task) {
    const catInfo = getCategoryInfo(task.category);
    const sizeLabel = task.size === 'big' ? 'Big' : task.size === 'small' ? 'Small' : 'Medium';
    const isSelected = selectedPlanningTaskId === task.id;

    return `
        <div onclick="selectPlanningTask('${task.id}', this)" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: ${isSelected ? 'rgba(102, 126, 234, 0.15)' : '#21262d'}; border-radius: 10px; margin-bottom: 10px; cursor: pointer; border: 2px solid ${isSelected ? '#667eea' : 'transparent'};">
            <div style="width: 20px; height: 20px; border: 2px solid ${isSelected ? '#667eea' : '#6e7681'}; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: ${isSelected ? '#667eea' : 'transparent'};">
                ${isSelected ? '<div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>' : ''}
            </div>
            <div style="flex: 1;">
                <div style="color: #e6edf3; font-weight: 500; margin-bottom: 4px;">${escapeHtml(task.text)}</div>
                <div style="font-size: 0.85em; color: #b0b8c4; display: flex; gap: 12px;">
                    <span>${catInfo.emoji} ${catInfo.name}</span>
                    <span>${sizeLabel}</span>
                    ${task.highLeverage ? '<span style="color: #fbbf24;">' + icon('activity') + ' High Leverage</span>' : ''}
                </div>
            </div>
        </div>
    `;
}

function selectPlanningTask(taskId, element) {
    selectedPlanningTaskId = taskId;
    document.querySelectorAll('#planningModalBody > div > div[onclick]').forEach(opt => {
        opt.style.background = '#21262d';
        opt.style.borderColor = 'transparent';
        opt.querySelector('div > div:first-child').style.borderColor = '#6e7681';
        opt.querySelector('div > div:first-child').style.background = 'transparent';
        opt.querySelector('div > div:first-child').innerHTML = '';
    });
    if (element) {
        element.style.background = 'rgba(102, 126, 234, 0.15)';
        element.style.borderColor = '#667eea';
        element.querySelector('div:first-child').style.borderColor = '#667eea';
        element.querySelector('div:first-child').style.background = '#667eea';
        element.querySelector('div:first-child').innerHTML = '<div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>';
    }
}

function confirmPlanningSelection() {
    if (!selectedPlanningTaskId) { showToast('Please select a task first', '!'); return; }

    const task = getValues(tasks).find(t => t.id === selectedPlanningTaskId);

    if (planningMode === 'onething') {
        focusModeData.oneThingId = selectedPlanningTaskId;
        focusModeData.microSteps = {};  // Object for Firebase safety
        focusModeData.focusTimerSeconds = 0;
        if (task && !task.doToday) task.doToday = true;
        // DON'T add to todaysTasks - ONE Thing is tracked separately
        showToast('ONE THING set! Let\'s crush it!', 'ok');
    } else {
        const size = planningMode;
        // Don't add if it's already the ONE thing
        if (selectedPlanningTaskId !== focusModeData.oneThingId) {
            if (!hasTaskId(focusModeData.todaysTasks[size], selectedPlanningTaskId)) {
                if (!focusModeData.todaysTasks[size]) focusModeData.todaysTasks[size] = {};
                focusModeData.todaysTasks[size][selectedPlanningTaskId] = true;
            }
        }
        showToast(`Added to ${size} tasks!`, 'ok');
    }

    closePlanningModal();
    renderFocusMode();
    saveData();
}

function closePlanningModal() {
    const modal = document.getElementById('planningModal');
    if (modal) modal.style.display = 'none';
    selectedPlanningTaskId = null;
}

// ==================== TASK BUDGET & TODAY'S TASKS ====================

function renderTaskBudget() {
    if (!focusModeData || !focusModeData.todaysTasks) return;

    // Filter out ONE thing from size lists to avoid double counting
    const oneThingId = focusModeData.oneThingId;
    const counts = {
        big: getTaskIds(focusModeData.todaysTasks.big).filter(id => id !== oneThingId && getValues(tasks).find(t => t.id === id && !t.completed)).length,
        medium: getTaskIds(focusModeData.todaysTasks.medium).filter(id => id !== oneThingId && getValues(tasks).find(t => t.id === id && !t.completed)).length,
        small: getTaskIds(focusModeData.todaysTasks.small).filter(id => id !== oneThingId && getValues(tasks).find(t => t.id === id && !t.completed)).length
    };

    // ONE thing always counts as the BIG task (slot 1)
    if (oneThingId) {
        const oneThingTask = getValues(tasks).find(t => t.id === oneThingId);
        if (oneThingTask && !oneThingTask.completed) {
            counts.big = 1; // ONE thing fills the big slot
        }
    }

    renderBudgetBar('budgetBarBig', counts.big, 1, '#dc2626');
    renderBudgetBar('budgetBarMedium', counts.medium, 3, '#f59e0b');
    renderBudgetBar('budgetBarSmall', counts.small, 5, '#10b981');

    const bigEl = document.getElementById('budgetCountBig');
    const medEl = document.getElementById('budgetCountMedium');
    const smallEl = document.getElementById('budgetCountSmall');
    if (bigEl) bigEl.textContent = `${Math.min(counts.big, 1)}/1`;
    if (medEl) medEl.textContent = `${Math.min(counts.medium, 3)}/3`;
    if (smallEl) smallEl.textContent = `${Math.min(counts.small, 5)}/5`;

    // Update time estimate
    updateTimeEstimate(counts);
}

function updateTimeEstimate(counts) {
    // Time estimates: Big = 60 min, Medium = 25 min, Small = 5 min
    const totalMinutes = (counts.big * 60) + (counts.medium * 25) + (counts.small * 5);
    const timeEl = document.getElementById('totalTimeEstimate');
    const contextEl = document.getElementById('timeContext');

    if (timeEl) {
        if (totalMinutes === 0) {
            timeEl.textContent = '0 min';
        } else if (totalMinutes < 60) {
            timeEl.textContent = `${totalMinutes} min`;
        } else {
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            timeEl.textContent = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
    }

    if (contextEl) {
        if (totalMinutes === 0) {
            contextEl.textContent = 'Add tasks to plan your day';
        } else if (totalMinutes <= 120) {
            contextEl.textContent = 'Light day - room for deep work';
        } else if (totalMinutes <= 240) {
            contextEl.textContent = 'Balanced workload';
        } else if (totalMinutes <= 360) {
            contextEl.textContent = 'Full day ahead';
        } else {
            contextEl.textContent = 'Heavy - consider trimming';
        }
    }
}

function quickAddFromFocus() {
    const input = document.getElementById('focusQuickAdd');
    const sizeSelect = document.getElementById('focusQuickAddSize');
    const categorySelect = document.getElementById('focusQuickAddCategory');

    if (!input || !input.value.trim()) {
        showToast('Please enter a task', '!');
        return;
    }

    const id = generateId('task');
    const task = {
        id: id,
        text: input.value.trim(),
        category: categorySelect.value,
        completed: false,
        doToday: true, // Auto-mark as do today
        createdAt: new Date().toISOString(),
        size: sizeSelect.value,
        highLeverage: false,
        sortOrder: getCount(tasks)
    };

    tasks[id] = task;

    // Add to today's focus tasks
    if (!hasTaskId(focusModeData.todaysTasks[task.size], task.id)) {
        if (!focusModeData.todaysTasks[task.size]) focusModeData.todaysTasks[task.size] = {};
        focusModeData.todaysTasks[task.size][task.id] = true;
    }

    input.value = '';
    renderFocusMode();
    saveData();
    showToast(`Added to ${task.size} tasks!`, 'ok');
}

function renderBudgetBar(containerId, filled, total, color) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    for (let i = 0; i < total; i++) {
        const isFilled = i < filled;
        html += `<div style="flex: 1; height: 100%; background: ${isFilled ? color : '#d1d5db'}; border-radius: 8px;"></div>`;
    }
    container.innerHTML = html;
}

function renderTodaysTasks() {
    renderTaskSizeSection('medium', 'mediumTasksList');
    renderTaskSizeSection('small', 'smallTasksList');
}

function renderTaskSizeSection(size, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter out the ONE thing from medium/small lists to avoid duplication
    const taskIds = getTaskIds(focusModeData.todaysTasks && focusModeData.todaysTasks[size]);
    const filteredIds = taskIds.filter(id => id !== focusModeData.oneThingId);
    const todaysTasks = filteredIds.map(id => getValues(tasks).find(t => t.id === id)).filter(t => t && !t.completed);

    if (todaysTasks.length === 0) {
        container.innerHTML = `
            <div style="color: #9ca3af; font-size: 0.9em; padding: 15px; text-align: center; background: #f9fafb; border-radius: 8px;">
                No ${size} tasks for today.
                <button onclick="openAddTasksModal('${size}')" style="background: none; border: none; color: #667eea; cursor: pointer; text-decoration: underline;">Add some →</button>
            </div>
        `;
        return;
    }

    container.innerHTML = todaysTasks.map(task => {
        const borderColor = size === 'small' ? '#10b981' : '#f59e0b';
        return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #f9fafb; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid ${borderColor};">
                <div onclick="toggleFocusTask('${task.id}')" style="width: 24px; height: 24px; border: 2px solid #10b981; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: white;" title="Complete task">
                    <span style="color: #10b981; font-size: 14px;">${icon('check')}</span>
                </div>
                <div style="flex: 1; color: #374151; font-size: 0.95em;">${escapeHtml(task.text)}</div>
                ${task.highLeverage ? '<div style="background: rgba(251, 191, 36, 0.15); color: #b45309; padding: 2px 8px; border-radius: 6px; font-size: 0.75em; font-weight: 600;">' + icon('activity') + '</div>' : ''}
                <div style="color: #9ca3af; font-size: 0.85em; white-space: nowrap;">${size === 'small' ? '~5 min' : '~20 min'}</div>
                <button onclick="removeFromToday('${task.id}', '${size}')" style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 5px; font-size: 1.1em;" title="Remove from today">${icon('x')}</button>
            </div>
        `;
    }).join('');
}

function removeFromToday(taskId, size) {
    // Remove task from today's list (doesn't delete the task, just removes from focus)
    if (focusModeData.todaysTasks && focusModeData.todaysTasks[size]) {
        delete focusModeData.todaysTasks[size][taskId];
    }
    renderFocusMode();
    saveData();
    showToast('Removed from today\'s tasks', 'ok');
}

function clearOneThing() {
    // Clear the ONE thing without completing it
    focusModeData.oneThingId = null;
    focusModeData.microSteps = {};  // Object for Firebase safety
    focusModeData.focusTimerSeconds = 0;
    if (focusModeData.focusTimerRunning) {
        clearInterval(focusModeData.focusTimerInterval);
        focusModeData.focusTimerRunning = false;
    }
    renderFocusMode();
    saveData();
    showToast('ONE Thing cleared - pick a new one!', 'ok');
}

function toggleFocusTask(taskId) {
    toggleTask(taskId);
    renderFocusMode();
}

function updateBacklogCount() {
    if (!focusModeData || !focusModeData.todaysTasks) return;

    const todaysTaskIds = [
        focusModeData.oneThingId,
        ...getTaskIds(focusModeData.todaysTasks.big),
        ...getTaskIds(focusModeData.todaysTasks.medium),
        ...getTaskIds(focusModeData.todaysTasks.small)
    ].filter(Boolean);

    const backlogTasks = getValues(tasks).filter(t => !t.completed && !todaysTaskIds.includes(t.id));
    const categories = new Set(backlogTasks.map(t => t.category));

    const countEl = document.getElementById('backlogCount');
    const catEl = document.getElementById('backlogCategories');
    if (countEl) countEl.textContent = backlogTasks.length;
    if (catEl) catEl.textContent = categories.size;
}

function getCategoryInfo(category) {
    const cats = {
        financial: { name: 'Financial', emoji: icon('wallet'), color: '#22c55e' },
        clinic: { name: 'Clinic', emoji: icon('heart'), color: '#ef4444' },
        health: { name: 'Health', emoji: icon('heart'), color: '#ec4899' },
        school: { name: 'School', emoji: icon('clipboard-list'), color: '#6b7280' },
        academic: { name: 'Academic', emoji: icon('graduation-cap'), color: '#f59e0b' },
        future: { name: 'Future', emoji: icon('rocket'), color: '#3b82f6' },
        life: { name: 'Life', emoji: icon('home'), color: '#8b5cf6' }
    };
    return cats[category] || { name: 'Task', emoji: icon('clipboard-list'), color: '#6b7280' };
}

// escapeHtml extracted to state.js

function doRandomSmallTask() {
    const smallTasks = getValues(tasks).filter(t => !t.completed && (t.size === 'small' || (!t.size && t.text && t.text.length < 50)));
    if (smallTasks.length === 0) { showToast('No small tasks found!', '!'); return; }
    const randomTask = smallTasks[Math.floor(Math.random() * smallTasks.length)];
    showToast(`Try: "${randomTask.text.substring(0, 40)}..."`, 'ok');
    if (!hasTaskId(focusModeData.todaysTasks.small, randomTask.id)) {
        if (!focusModeData.todaysTasks.small) focusModeData.todaysTasks.small = {};
        focusModeData.todaysTasks.small[randomTask.id] = true;
        renderFocusMode();
        saveData();
    }
}

function start5MinSprint() {
    showToast('5-minute sprint! GO GO GO!', 'ok');
}

// ============================================
// COMMAND CENTER FUNCTIONS
// ============================================

// commandCenterMode, focus timer vars extracted to state.js

// ==================== WELCOME OVERLAY ====================
function checkFocusViewWelcome() {
    // Check if user has seen the welcome overlay
    const hasSeenWelcome = localStorage.getItem('focusViewWelcomeSeen');
    if (!hasSeenWelcome) {
        showFocusViewWelcome();
    }
}

function showFocusViewWelcome() {
    const overlay = document.getElementById('focusViewWelcomeOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function dismissFocusViewWelcome() {
    const overlay = document.getElementById('focusViewWelcomeOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    safeLocalStorageSet('focusViewWelcomeSeen', 'true');
}

function getCurrentCommandCenterMode() {
    return commandCenterMode || 'triage';
}

function switchCommandCenterMode(mode) {
    commandCenterMode = mode;

    // Update tab styling - dark theme
    document.querySelectorAll('.cc-mode-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.background = 'transparent';
        tab.style.borderColor = '#334155';
        tab.style.color = '#94a3b8';
    });

    const activeTab = document.getElementById(mode === 'triage' ? 'triageModeTab' :
        mode === 'crashout' ? 'crashOutModeTab' : 'focusPomodoroTab');
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.background = '#1e293b';
        activeTab.style.borderColor = '#475569';
        activeTab.style.color = '#f1f5f9';
    }

    // Show/hide content
    document.getElementById('triageModeContent').style.display = mode === 'triage' ? 'block' : 'none';
    document.getElementById('crashOutModeContent').style.display = mode === 'crashout' ? 'block' : 'none';
    document.getElementById('focusPomodoroContent').style.display = mode === 'focus' ? 'block' : 'none';

    // Render the mode
    renderFocusMode();
}

function updateCommandCenterGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17 && hour < 21) greeting = 'Good evening';
    if (hour >= 21 || hour < 5) greeting = 'Good night';

    const greetingEl = document.querySelector('.cc-greeting > div:first-child');
    if (greetingEl) greetingEl.textContent = `${greeting}, Sully`;

    const dateEl = document.getElementById('ccDateDisplay');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        dateEl.textContent = `${dateStr} • ${timeStr}`;
    }
}

function updateOverallProgress() {
    const todayTasks = getTodayTriageTasks();
    const total = todayTasks.length;
    const completed = todayTasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const textEl = document.getElementById('ccOverallProgressText');
    const barEl = document.getElementById('ccOverallProgressBar');

    if (textEl) textEl.textContent = `${completed}/${total} tasks • ${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;

    // Update progress ring
    const ringFill = document.getElementById('progressRingFill');
    const ringPercent = document.getElementById('progressRingPercent');
    const circumference = 213.6;

    if (ringFill) {
        const offset = circumference - (percent / 100) * circumference;
        ringFill.style.strokeDashoffset = offset;
        ringFill.classList.remove('progress-low', 'progress-mid', 'progress-high', 'progress-complete');
        if (percent >= 100) ringFill.classList.add('progress-complete');
        else if (percent >= 75) ringFill.classList.add('progress-high');
        else if (percent >= 50) ringFill.classList.add('progress-mid');
        else ringFill.classList.add('progress-low');
    }
    if (ringPercent) ringPercent.textContent = `${percent}%`;

    // Enhanced bar color
    const bar = document.getElementById('overallProgressBar');
    if (bar) {
        bar.classList.remove('pf-low', 'pf-mid', 'pf-high', 'pf-complete');
        if (percent >= 100) bar.classList.add('pf-complete');
        else if (percent >= 75) bar.classList.add('pf-high');
        else if (percent >= 50) bar.classList.add('pf-mid');
        else bar.classList.add('pf-low');
    }

    // Milestone dots
    [25, 50, 75].forEach(m => {
        const dot = document.getElementById(`milestone${m}`);
        if (dot) {
            if (percent >= m) dot.classList.add('reached');
            else dot.classList.remove('reached');
        }
    });

    // Milestone celebration triggers
    const prevPercent = parseInt(ringPercent?.dataset?.prev || '0');
    if (ringPercent) ringPercent.dataset.prev = percent;

    if (prevPercent < 25 && percent >= 25) { if (typeof showCelebration === 'function') showCelebration('small'); if (typeof showToast === 'function') showToast('25% done! Keep going!', 'ok'); }
    if (prevPercent < 50 && percent >= 50) { if (typeof showCelebration === 'function') showCelebration('medium'); if (typeof showToast === 'function') showToast('HALFWAY THERE!', 'ok'); }
    if (prevPercent < 75 && percent >= 75) { if (typeof showCelebration === 'function') showCelebration('medium'); if (typeof showToast === 'function') showToast('75%! Almost there!', 'ok'); }
    if (prevPercent < 100 && percent >= 100) { if (typeof showCelebration === 'function') showCelebration('big'); if (typeof showToast === 'function') showToast('ALL TASKS DONE!', 'ok'); }
}

// ==================== TRIAGE CACHE ====================

// Get all tasks that should appear in Focus View (doToday = true)
// Uses frame-level cache to avoid redundant getValues+filter (called 10+ times per render cycle)
let _todayTriageCache = null;
let _todayTriageCacheFrame = -1;
function getTodayTriageTasks() {
    const frame = typeof _renderFrame !== 'undefined' ? _renderFrame : -1;
    if (_todayTriageCache && _todayTriageCacheFrame === frame && frame !== -1) {
        return _todayTriageCache;
    }
    _todayTriageCache = getValues(tasks).filter(t => t.doToday);
    _todayTriageCacheFrame = frame;
    return _todayTriageCache;
}
function invalidateTriageCache() { _todayTriageCache = null; _todayTriageCacheFrame = -1; }

// Get tasks by triage tier
function getTasksByTier(tier) {
    const filtered = getTodayTriageTasks().filter(t => {
        if (tier === 'lockedIn') return t.triageTier === 'lockedIn' && !t.crashOutScheduled;
        if (tier === 'today') return (t.triageTier === 'today' || !t.triageTier) && !t.crashOutScheduled && t.triageTier !== 'lockedIn' && t.triageTier !== 'tomorrow' && !(t.rolledOver && t.rolledOver.fromDate);
        if (tier === 'scheduled') return t.crashOutScheduled === true;
        if (tier === 'tomorrow') return t.triageTier === 'tomorrow' && !t.crashOutScheduled;
        if (tier === 'rolledOver') return t.rolledOver && t.rolledOver.fromDate;
        return false;
    });

    // For scheduled tasks, sort by crashOutOrder (timeline sequence)
    // For other tiers, sort by triageOrder
    if (tier === 'scheduled') {
        return filtered.sort((a, b) => (a.crashOutOrder ?? 999) - (b.crashOutOrder ?? 999));
    }
    return filtered.sort((a, b) => (a.triageOrder ?? 999) - (b.triageOrder ?? 999));
}

// ==================== TASK EDIT MODAL ====================

function openTaskEditModal(taskId) {
    // Ensure taskId is a string for consistent lookup
    const id = String(taskId);
    editingTaskId = id;

    // Use direct object access like other working functions (toggleDoToday, deleteTask)
    const task = tasks[id];
    if (!task) {
        console.warn('openTaskEditModal: Task not found with id:', id);
        return;
    }

    editingTaskSize = task.size || 'medium';
    editingTaskLeverage = task.highLeverage || false;

    document.getElementById('editTaskText').value = task.text;
    updateSizeSelection();
    updateLeverageToggle();
    document.getElementById('taskEditModal').style.display = 'flex';
}

function closeTaskEditModal() {
    document.getElementById('taskEditModal').style.display = 'none';
    editingTaskId = null;
}

function selectTaskSize(size) {
    editingTaskSize = size;
    updateSizeSelection();
}

function updateSizeSelection() {
    document.querySelectorAll('.size-option').forEach(opt => {
        const isSelected = opt.dataset.size === editingTaskSize;
        opt.style.borderColor = isSelected ? '#667eea' : '#30363d';
        opt.style.background = isSelected ? 'rgba(102, 126, 234, 0.2)' : '#21262d';
    });
}

function toggleLeverage() {
    editingTaskLeverage = !editingTaskLeverage;
    updateLeverageToggle();
}

function updateLeverageToggle() {
    const toggle = document.getElementById('leverageSwitch');
    if (toggle) {
        toggle.style.background = editingTaskLeverage ? '#fbbf24' : '#30363d';
        toggle.querySelector('div').style.left = editingTaskLeverage ? '23px' : '3px';
    }
}

function saveTaskEdit() {
    if (!editingTaskId) return;

    // Use direct object access like other working functions
    const id = String(editingTaskId);
    const task = tasks[id];
    if (!task) {
        console.warn('saveTaskEdit: Task not found with id:', id);
        return;
    }

    task.text = document.getElementById('editTaskText').value.trim();
    task.size = editingTaskSize;
    task.highLeverage = editingTaskLeverage;

    closeTaskEditModal();
    renderTasks();
    if (currentView === 'focus') renderFocusMode();
    saveData();
    showToast('Task updated!', 'ok');
}

// ==================== INIT FOCUS MODE ====================

function initFocusMode() {

    // Make sure containers exist and are properly set
    const focusContainer = document.getElementById('focusModeContainer');
    const fullContainer = document.getElementById('fullViewContainer');

    if (currentView === 'focus') {
        if (focusContainer) focusContainer.style.display = 'block';
        if (fullContainer) fullContainer.style.display = 'none';

        // Ensure focusModeData is properly initialized
        if (!focusModeData.todaysTasks) {
            focusModeData.todaysTasks = { big: {}, medium: {}, small: {} };
        }

        // Check for rolled over tasks from previous day
        if (typeof checkAndProcessRollovers === 'function') checkAndProcessRollovers();

        // Start the time prompt checker for Crash Out
        if (typeof startTimePromptChecker === 'function') startTimePromptChecker();

        // Handle responsive layout on resize
        window.addEventListener('resize', handleResponsiveLayout);

        // Show welcome overlay for first-time users
        checkFocusViewWelcome();

        renderFocusMode();
    } else {
        if (focusContainer) focusContainer.style.display = 'none';
        if (fullContainer) fullContainer.style.display = 'block';
    }
}

// Handle responsive layout changes
function handleResponsiveLayout() {
    const scheduledSection = document.getElementById('scheduledSection');
    if (scheduledSection) {
        const scheduledTasks = getTasksByTier('scheduled').filter(t => !t.completed);
        const isDesktop = window.innerWidth >= 768;
        scheduledSection.style.display = isDesktop || scheduledTasks.length > 0 ? 'block' : 'none';
    }
}
