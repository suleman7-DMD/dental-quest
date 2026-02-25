// ============================================
// DAILY PLANNER MODULE
// Extracted from index.html Phase 4
// Depends on: state.js (globals, dailyPlanner, tasks, focusModeData, lastCriticalEODReset,
//             getTodayDateString, getLocalDateString, getValues, getCount, generateId, escapeHtml,
//             migrateArrayToObject, safeLocalStorageSet)
// Depends on: firebase-sync.js (saveData, firebaseInitialized, database, currentUser)
// NOTE: getLocalDateString, getTodayDateString, parseLocalDate, deepMerge, markLocalChange
//       are already in state.js — NOT duplicated here.
// ============================================

// Global planner state
let plannerSelectedDuration = 30;
let plannerSaveTimer = null;  // Debounce timer for daily planner saves
let plannerClockInterval = null;

// ============================================
// DAILY PLANNER
// ============================================

function checkPlannerReset() {
    const now = new Date();
    const hours = now.getHours();
    const todayStr = getTodayDateString();

    // Reset at 5 AM
    if (dailyPlanner.date !== todayStr && hours >= 5) {
        // New day after 5 AM - reset
        dailyPlanner = {
            date: todayStr,
            goal: '',
            bedtime: '23:00',
            blocks: [],
            lastReset: now.toISOString()
        };
        saveDailyPlanner();
        return true;
    }

    // If it's before 5 AM and the date is yesterday, don't reset yet
    if (hours < 5 && dailyPlanner.date) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        if (dailyPlanner.date === yesterdayStr) {
            // Still working on yesterday's plan
            return false;
        }
    }

    // If no date set, initialize to today
    if (!dailyPlanner.date) {
        dailyPlanner.date = todayStr;
        saveDailyPlanner();
    }

    return false;
}

// CRITICAL/EOD AUTO-RESET AT 5 AM
// Clears ONLY mustComplete (EOD) flags and Focus Mode daily
// NOTE: doToday flags are NOT reset - they persist until user removes them
function checkCriticalEODReset() {
    const now = new Date();
    const hours = now.getHours();
    const todayStr = getTodayDateString();

    // Check BOTH the global variable (synced from Firebase) AND localStorage
    // This prevents duplicate resets when opening on a new device
    const localStorageReset = localStorage.getItem('lastCriticalEODReset');
    const effectiveLastReset = lastCriticalEODReset || localStorageReset;


    // Reset at 5 AM if it's a new day
    if (effectiveLastReset !== todayStr && hours >= 5) {

        let resetCount = 0;
        getValues(tasks).forEach(task => {
            // ONLY reset mustComplete (EOD) flag
            // doToday flag is NOT touched - it persists until user removes it
            if (task.mustComplete) {
                task.mustComplete = false;
                resetCount++;
            }
        });

        // Clear Focus Mode today's tasks (this resets daily)
        if (focusModeData) {
            focusModeData.oneThingId = null;
            focusModeData.microSteps = {};  // Object for Firebase safety
            focusModeData.todaysTasks = { big: {}, medium: {}, small: {} };  // Objects for Firebase safety
            focusModeData.focusTimerSeconds = 0;
        }

        // Update BOTH the global variable AND localStorage
        lastCriticalEODReset = todayStr;
        safeLocalStorageSet('lastCriticalEODReset', todayStr);

        if (resetCount > 0) {
            saveData();
        } else {
            // Still save to sync the lastCriticalEODReset
            saveData();
        }

        return true;
    } else {
    }

    return false;
}

function loadDailyPlanner() {
    if (firebaseInitialized && database && currentUser) {
        database.ref('users/' + currentUser.uid + '/appData/dailyPlanner').once('value').then(snapshot => {
            const data = snapshot.val();
            if (data) {
                dailyPlanner = {
                    date: data.date || dailyPlanner.date,
                    goal: data.goal || '',
                    bedtime: data.bedtime || '23:00',
                    blocks: migrateArrayToObject(data.blocks, 'block'),
                    lastReset: data.lastReset || null
                };
            }
            checkPlannerReset();
            renderPlannerBlocks();
        }).catch(err => {
            console.error('Failed to load daily planner from Firebase:', err);
            // Fallback to localStorage on error
            checkPlannerReset();
        });
    } else {
        const saved = localStorage.getItem('dailyPlanner');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                dailyPlanner = {
                    date: data.date || null,
                    goal: data.goal || '',
                    bedtime: data.bedtime || '23:00',
                    blocks: migrateArrayToObject(data.blocks, 'block'),
                    lastReset: data.lastReset || null
                };
            } catch (e) {
                console.error('Corrupted daily planner data:', e);
                localStorage.removeItem('dailyPlanner');
            }
        }
        checkPlannerReset();
    }
}

function saveDailyPlanner() {
    // Save to localStorage immediately for responsiveness
    safeLocalStorageSet('dailyPlanner', JSON.stringify(dailyPlanner));

    // Debounce Firebase save (200ms) to prevent rapid successive writes
    if (plannerSaveTimer) {
        clearTimeout(plannerSaveTimer);
    }
    plannerSaveTimer = setTimeout(() => {
        if (firebaseInitialized && database && currentUser) {
            database.ref('users/' + currentUser.uid + '/appData/dailyPlanner').set(dailyPlanner)
                .catch(err => console.error('Firebase save error:', err));
        }
    }, 200);
}

function openDailyPlanner() {
    const modal = document.getElementById('dailyPlannerModal');
    if (!modal) {
        console.error('Daily planner modal not found');
        return;
    }
    ensureModalOnBody(modal);

    try {
        // Ensure dailyPlanner is properly initialized
        if (!dailyPlanner) {
            dailyPlanner = {
                date: getTodayDateString(),
                blocks: {}
            };
        }
        if (!dailyPlanner.blocks) {
            dailyPlanner.blocks = {};
        }

        checkPlannerReset();

        // Update date display
        const now = new Date();
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const dateEl = document.getElementById('plannerDate');
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', options);

        // Set default time to current time rounded up to next 5 min
        const minutes = Math.ceil(now.getMinutes() / 5) * 5;
        const roundedNow = new Date(now);
        roundedNow.setMinutes(minutes);
        if (roundedNow.getMinutes() === 60) {
            roundedNow.setHours(roundedNow.getHours() + 1);
            roundedNow.setMinutes(0);
        }
        const timeInput = document.getElementById('plannerNewTime');
        if (timeInput) timeInput.value = roundedNow.toTimeString().slice(0, 5);

        // Populate task dropdown with existing tasks
        populateTaskDropdown();

        // Reset duration selection
        selectDuration(30);

        // Clear inputs
        const taskInput = document.getElementById('plannerNewTask');
        if (taskInput) taskInput.value = '';

        renderPlannerTimeline();
        startPlannerClock();

        _modalOpenTime = Date.now();
        modal.classList.add('show');

        // Scroll to current time after a brief delay
        setTimeout(() => scrollToCurrentTime(), 150);
    } catch (error) {
        console.error('Error opening daily planner:', error);
    }
}

function closeDailyPlanner() {
    saveDailyPlanner();
    const modal = document.getElementById('dailyPlannerModal');
    if (modal) modal.classList.remove('show');
    if (plannerClockInterval) clearInterval(plannerClockInterval);
}

function startPlannerClock() {
    if (plannerClockInterval) clearInterval(plannerClockInterval);

    function updateClock() {
        // Update live time display
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const liveTimeEl = document.getElementById('plannerLiveTime');
        if (liveTimeEl) liveTimeEl.textContent = timeStr;

        // Update time line position
        updateCurrentTimeLine();
    }

    updateClock();
    plannerClockInterval = setInterval(updateClock, 1000); // Update every second for live clock
}

function updateCurrentTimeLine() {
    const line = document.getElementById('plannerCurrentTimeLine');
    if (!line) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Day starts at 5 AM (hour 5) and ends at 1 AM next day
    let adjustedHour = hours;
    if (hours < 5) {
        adjustedHour = hours + 24;
    }

    const hoursSince5AM = adjustedHour - 5;
    const totalMinutes = hoursSince5AM * 60 + minutes;
    const position = totalMinutes;

    if (hoursSince5AM >= 0 && hoursSince5AM <= 20) {
        line.style.display = 'block';
        line.style.top = position + 'px';
    } else {
        line.style.display = 'none';
    }
}

function scrollToCurrentTime() {
    const container = document.getElementById('plannerTimelineContainer');
    if (!container) return;

    const now = new Date();
    let adjustedHour = now.getHours();
    if (adjustedHour < 5) adjustedHour += 24;

    const hoursSince5AM = adjustedHour - 5;
    const scrollPosition = Math.max(0, (hoursSince5AM - 1) * 60);
    container.scrollTop = scrollPosition;
}

function populateTaskDropdown() {
    const dropdown = document.getElementById('plannerTaskDropdown');
    if (!dropdown || !tasks) return;

    const incompleteTasks = getValues(tasks).filter(t => !t.completed);

    // Group by category
    const categories = {
        dotoday: { name: '\u{1F534} Critical - Do Today', tasks: [] },
        financial: { name: '\u{1F4B0} Financial', tasks: [] },
        clinic: { name: '\u{1F9B7} Clinic', tasks: [] },
        health: { name: '\u2764\uFE0F Health', tasks: [] },
        school: { name: '\u{1F4CB} School', tasks: [] },
        academic: { name: '\u{1F4DA} Academic', tasks: [] },
        future: { name: '\u{1F680} Future', tasks: [] },
        life: { name: '\u{1F3E1} Life', tasks: [] }
    };

    // Sort tasks into doToday first, then by category
    incompleteTasks.forEach(task => {
        if (task.doToday) {
            categories.dotoday.tasks.push(task);
        } else if (categories[task.category]) {
            categories[task.category].tasks.push(task);
        }
    });

    let html = '<option value="">-- Select a task --</option>';

    for (const [key, cat] of Object.entries(categories)) {
        if (cat.tasks.length > 0) {
            html += `<optgroup label="${cat.name}">`;
            cat.tasks.forEach(task => {
                const truncatedText = task.text.length > 60 ? task.text.substring(0, 60) + '...' : task.text;
                html += `<option value="${task.id}">${escapeHtml(truncatedText)}</option>`;
            });
            html += '</optgroup>';
        }
    }

    dropdown.innerHTML = html;
}

function selectTaskFromDropdown() {
    const dropdown = document.getElementById('plannerTaskDropdown');
    const taskInput = document.getElementById('plannerNewTask');

    if (!dropdown || !taskInput) return;

    const taskId = parseInt(dropdown.value);
    if (!taskId) return;

    const task = tasks[taskId];
    if (task) {
        taskInput.value = task.text;
    }

    // Reset dropdown
    dropdown.value = '';
}

function setTimeToNow() {
    const timeInput = document.getElementById('plannerNewTime');
    if (!timeInput) return;

    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 5) * 5;
    now.setMinutes(minutes);
    if (now.getMinutes() >= 60) {
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
    }

    timeInput.value = now.toTimeString().slice(0, 5);
    showToast('Time set to now!', '\u26A1');
}

function selectDuration(duration) {
    plannerSelectedDuration = duration;

    // Update button styles
    document.querySelectorAll('.planner-duration-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.duration) === duration) {
            btn.classList.add('active');
        }
    });

    // Uncheck end time mode
    const endTimeCheckbox = document.getElementById('plannerUseEndTime');
    if (endTimeCheckbox) endTimeCheckbox.checked = false;
    const endTimeInput = document.getElementById('plannerEndTime');
    if (endTimeInput) endTimeInput.style.display = 'none';
}

function toggleEndTimeMode() {
    const checkbox = document.getElementById('plannerUseEndTime');
    const endTimeInput = document.getElementById('plannerEndTime');
    const startTimeInput = document.getElementById('plannerNewTime');

    if (!checkbox || !endTimeInput) return;

    if (checkbox.checked) {
        endTimeInput.style.display = 'block';

        // Set default end time to start + current duration
        if (startTimeInput) {
            const [h, m] = startTimeInput.value.split(':').map(Number);
            const endMinutes = h * 60 + m + plannerSelectedDuration;
            const endH = Math.floor(endMinutes / 60) % 24;
            const endM = endMinutes % 60;
            endTimeInput.value = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
        }

        // Deselect duration buttons
        document.querySelectorAll('.planner-duration-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    } else {
        endTimeInput.style.display = 'none';
        selectDuration(plannerSelectedDuration);
    }
}

function calculateDurationFromEndTime() {
    const startInput = document.getElementById('plannerNewTime');
    const endInput = document.getElementById('plannerEndTime');

    if (!startInput || !endInput) return;

    const [startH, startM] = startInput.value.split(':').map(Number);
    const [endH, endM] = endInput.value.split(':').map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight
    if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
    }

    plannerSelectedDuration = endMinutes - startMinutes;
}

function renderPlannerTimeline() {
    const timeline = document.getElementById('plannerTimeline');
    if (!timeline) return;

    // Generate hours from 5 AM to 1 AM (21 hours)
    const hours = [];
    for (let h = 5; h <= 24; h++) hours.push(h % 24);
    hours.push(1);

    let html = '';
    for (let i = 0; i < 21; i++) {
        const hour = hours[i];
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 || hour === 24 ? 'AM' : 'PM';
        const top = i * 60;

        html += `
            <div class="planner-hour-row" style="top: ${top}px;">
                <div class="planner-hour-label">${displayHour} ${ampm}</div>
                <div class="planner-hour-slot" onclick="quickAddAtHour(${hour})"></div>
            </div>
        `;
    }

    // Add current time line
    html += '<div class="planner-current-time-line" id="plannerCurrentTimeLine"></div>';

    // Add events (sorted by time)
    const blocks = getValues(dailyPlanner.blocks);
    if (blocks.length > 0) {
        const sortedBlocks = [...blocks].sort((a, b) => {
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        sortedBlocks.forEach(block => {
            if (block.startTime && block.task) {
                html += renderPlannerEvent(block, block.id);
            }
        });
    }

    timeline.innerHTML = html;
    updateCurrentTimeLine();
    updatePlannerFooterStats();
}

function renderPlannerEvent(block, blockId) {
    const [startH, startM] = block.startTime.split(':').map(Number);
    const duration = block.duration || 30;

    // Adjust for 5 AM start
    let adjustedStartH = startH;
    if (startH < 5) adjustedStartH = startH + 24;

    const top = (adjustedStartH - 5) * 60 + startM;
    const height = Math.max(24, duration);

    // Calculate end time for display
    const endMinutes = startH * 60 + startM + duration;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const endTimeStr = formatTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);

    return `
        <div class="planner-event ${block.completed ? 'completed' : ''}"
             style="top: ${top}px; height: ${height}px;"
             onclick="togglePlannerEvent('${blockId}')"
             title="Click to mark ${block.completed ? 'incomplete' : 'complete'}. Right-click to delete.">
            <div class="planner-event-actions">
                <button class="planner-event-btn" onclick="event.stopPropagation(); deletePlannerEvent(event, '${blockId}')" title="Delete">\u00D7</button>
            </div>
            <div class="planner-event-title">${escapeHtml(block.task)}</div>
            ${height >= 40 ? `<div class="planner-event-time">${formatTime(block.startTime)} - ${endTimeStr}</div>` : ''}
        </div>
    `;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function addPlannerEvent() {
    const taskInput = document.getElementById('plannerNewTask');
    const timeInput = document.getElementById('plannerNewTime');

    const task = taskInput?.value?.trim();
    const time = timeInput?.value;
    const duration = plannerSelectedDuration;

    if (!task) {
        taskInput?.focus();
        showToast('Please enter a task!', '\u26A0\uFE0F');
        return;
    }

    if (!time) {
        showToast('Please select a time!', '\u26A0\uFE0F');
        return;
    }

    const blockId = generateId('block');
    dailyPlanner.blocks[blockId] = {
        id: blockId,
        startTime: time,
        duration: duration,
        task: task,
        completed: false
    };

    // Clear input
    if (taskInput) taskInput.value = '';

    // Advance time by duration for next entry
    if (timeInput) {
        const [h, m] = time.split(':').map(Number);
        const newMinutes = h * 60 + m + duration;
        const newH = Math.floor(newMinutes / 60) % 24;
        const newM = newMinutes % 60;
        timeInput.value = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    }

    saveDailyPlanner();
    renderPlannerTimeline();

    showToast('Task added!', '\u2705');

    // Focus back to input for quick entry
    taskInput?.focus();
}

function quickAddAtHour(hour) {
    const timeInput = document.getElementById('plannerNewTime');
    const taskInput = document.getElementById('plannerNewTask');

    if (timeInput) {
        timeInput.value = `${hour.toString().padStart(2, '0')}:00`;
    }
    if (taskInput) {
        taskInput.focus();
    }
}

function togglePlannerEvent(blockId) {
    if (dailyPlanner.blocks[blockId]) {
        dailyPlanner.blocks[blockId].completed = !dailyPlanner.blocks[blockId].completed;
        saveDailyPlanner();
        renderPlannerTimeline();

        if (dailyPlanner.blocks[blockId].completed) {
            showToast('Task completed!', '\u2705');
        }
    }
}

function deletePlannerEvent(event, blockId) {
    event.preventDefault();
    event.stopPropagation();

    delete dailyPlanner.blocks[blockId];
    saveDailyPlanner();
    renderPlannerTimeline();
    showToast('Task deleted', '\u{1F5D1}\uFE0F');
}

function updatePlannerFooterStats() {
    if (!dailyPlanner.blocks) return;

    const blocks = getValues(dailyPlanner.blocks);
    const total = blocks.length;
    const completed = blocks.filter(b => b.completed).length;
    const totalMinutes = blocks.reduce((sum, b) => sum + (b.duration || 30), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    const taskCountEl = document.getElementById('plannerTaskCount');
    const totalTimeEl = document.getElementById('plannerTotalTime');
    const completedCountEl = document.getElementById('plannerCompletedCount');

    if (taskCountEl) taskCountEl.textContent = total;
    if (totalTimeEl) totalTimeEl.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    if (completedCountEl) completedCountEl.textContent = completed;
}

function clearDailyPlanner() {
    showCustomConfirm('Clear all tasks for today?', function() {
        dailyPlanner.blocks = {};
        saveDailyPlanner();
        renderPlannerTimeline();
        showToast('Planner cleared', '\u{1F5D1}\uFE0F');
    }, null, 'Clear Planner');
}

// Legacy function stubs for compatibility
function renderPlannerBlocks() { renderPlannerTimeline(); }
function updatePlannerProgress() { updatePlannerFooterStats(); }
function updatePlannerStats() { updatePlannerFooterStats(); }
function addPlannerBlock() { document.getElementById('plannerNewTask')?.focus(); }
function addQuickBreak() {
    const timeInput = document.getElementById('plannerNewTime');
    const time = timeInput?.value || '12:00';
    const blockId = generateId('block');
    dailyPlanner.blocks[blockId] = {
        id: blockId,
        startTime: time,
        duration: 15,
        task: '\u2615 Break',
        completed: false
    };
    saveDailyPlanner();
    renderPlannerTimeline();
    showToast('Break added!', '\u2615');
}
function addQuickPomodoro() {
    const timeInput = document.getElementById('plannerNewTime');
    const time = timeInput?.value || '12:00';
    const blockId = generateId('block');
    dailyPlanner.blocks[blockId] = {
        id: blockId,
        startTime: time,
        duration: 25,
        task: '\u{1F345} Focus',
        completed: false
    };
    saveDailyPlanner();
    renderPlannerTimeline();
    showToast('Focus block added!', '\u{1F345}');
}
