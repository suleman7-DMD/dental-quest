// daily-planner.js — Clock, pomodoro timer, timeline, daily events

// ==================== DAILY PLANNER STATE ====================
let dpWorkMinutes = 25;
let dpBreakMinutes = 5;
let dpCurrentSeconds = 25 * 60;
let dpIsWorkSession = true;
let dpTimerInterval = null;
let dpSelectedDuration = 30;
let dpClockInterval = null;

// ==================== DAILY PLANNER FUNCTIONS ====================

function initDailyPlanner() {
    // Check if we need to reset for a new day
    const today = getLocalDateString();
    if (!roadmapData.dailyPlanner) {
        roadmapData.dailyPlanner = {
            date: today,
            focus: '',
            notes: '',
            blocks: {},  // Object-based storage for Firebase safety
            pomodorosCompleted: 0,
            bedtime: '23:00'
        };
    }

    // DON'T auto-reset - user controls when to clear
    if (roadmapData.dailyPlanner.date !== today) {
        // Just update the date, but keep the data until user manually clears
        roadmapData.dailyPlanner.date = today;
    }

    // Load UI
    dpPopulateDeadlineDropdown();
    dpRenderTimeline();
    dpUpdateStats();
    dpStartClock();

    // Load saved focus and notes
    const focusInput = document.getElementById('dpTodayFocus');
    const notesInput = document.getElementById('dpDailyNotes');
    if (focusInput) focusInput.value = roadmapData.dailyPlanner.focus || '';
    if (notesInput) notesInput.value = roadmapData.dailyPlanner.notes || '';

    // Set default time to now
    dpSetTimeToNow();
}

function dpStartClock() {
    if (dpClockInterval) clearInterval(dpClockInterval);

    function updateClock() {
        const now = new Date();

        // Update live time
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        const liveTimeEl = document.getElementById('dpLiveTime');
        if (liveTimeEl) liveTimeEl.textContent = timeStr;

        // Update date display
        const dateEl = document.getElementById('dpDate');
        if (dateEl) {
            const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('en-US', options);
        }

        // Update midnight countdown
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msToMidnight = midnight - now;
        const hrsToMidnight = Math.floor(msToMidnight / (1000 * 60 * 60));
        const minsToMidnight = Math.floor((msToMidnight % (1000 * 60 * 60)) / (1000 * 60));
        const midnightEl = document.getElementById('dpMidnightCountdown');
        if (midnightEl) midnightEl.textContent = `${hrsToMidnight}h ${minsToMidnight}m to midnight`;

        // Update bedtime countdown (default 11 PM)
        const bedtime = roadmapData.dailyPlanner?.bedtime || '23:00';
        const [bedH, bedM] = bedtime.split(':').map(Number);
        const bedtimeDate = new Date(now);
        bedtimeDate.setHours(bedH, bedM, 0, 0);
        if (bedtimeDate < now) bedtimeDate.setDate(bedtimeDate.getDate() + 1);
        const msToBed = bedtimeDate - now;
        const hrsToBed = Math.floor(msToBed / (1000 * 60 * 60));
        const minsToBed = Math.floor((msToBed % (1000 * 60 * 60)) / (1000 * 60));
        const sleepEl = document.getElementById('dpSleepCountdown');
        if (sleepEl) sleepEl.textContent = `${hrsToBed}h ${minsToBed}m to bedtime`;

        // Update current time line
        dpUpdateCurrentTimeLine();
    }

    updateClock();
    dpClockInterval = setInterval(updateClock, 1000);
}

function dpUpdateCurrentTimeLine() {
    const line = document.getElementById('dpCurrentTimeLine');
    if (!line) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Day starts at 5 AM and ends at 1 AM next day
    let adjustedHour = hours;
    if (hours < 5) adjustedHour = hours + 24;

    const hoursSince5AM = adjustedHour - 5;
    const totalMinutes = hoursSince5AM * 60 + minutes;

    if (hoursSince5AM >= 0 && hoursSince5AM <= 20) {
        line.style.display = 'block';
        line.style.top = totalMinutes + 'px';
    } else {
        line.style.display = 'none';
    }
}

// Pomodoro Timer Functions
function dpSelectPomodoro(work, breakTime, el) {
    dpWorkMinutes = work;
    dpBreakMinutes = breakTime;

    document.querySelectorAll('.pomodoro-option').forEach(opt => opt.classList.remove('active'));
    if (el) el.classList.add('active');

    dpResetTimer();
}

function dpStartTimer() {
    if (dpTimerInterval) return;

    document.getElementById('dpStartBtn').style.display = 'none';
    document.getElementById('dpPauseBtn').style.display = 'inline-block';

    dpTimerInterval = setInterval(() => {
        dpCurrentSeconds--;
        dpUpdateTimerDisplay();

        if (dpCurrentSeconds <= 0) {
            dpCompleteSession();
        }
    }, 1000);
}

function dpPauseTimer() {
    clearInterval(dpTimerInterval);
    dpTimerInterval = null;
    document.getElementById('dpStartBtn').style.display = 'inline-block';
    document.getElementById('dpPauseBtn').style.display = 'none';
}

function dpResetTimer() {
    clearInterval(dpTimerInterval);
    dpTimerInterval = null;
    dpIsWorkSession = true;
    dpCurrentSeconds = dpWorkMinutes * 60;
    dpUpdateTimerDisplay();
    document.getElementById('dpTimerMode').textContent = 'Work Session';
    document.getElementById('dpStartBtn').style.display = 'inline-block';
    document.getElementById('dpPauseBtn').style.display = 'none';
}

function dpUpdateTimerDisplay() {
    const minutes = Math.floor(dpCurrentSeconds / 60);
    const seconds = dpCurrentSeconds % 60;
    const clockEl = document.getElementById('dpTimerClock');
    if (clockEl) {
        clockEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function dpCompleteSession() {
    clearInterval(dpTimerInterval);
    dpTimerInterval = null;

    // Play notification
    dpPlayNotification();

    if (dpIsWorkSession) {
        // Work session completed - increment pomodoro count
        roadmapData.dailyPlanner.pomodorosCompleted = (roadmapData.dailyPlanner.pomodorosCompleted || 0) + 1;
        dpUpdateStats();
        saveDailyPlannerData();

        // Switch to break
        dpIsWorkSession = false;
        dpCurrentSeconds = dpBreakMinutes * 60;
        document.getElementById('dpTimerMode').textContent = 'Break Time! 🎉';
        dpUpdateTimerDisplay();

        alert('Great work! Time for a break! 🎉\n\nPomodoros completed today: ' + roadmapData.dailyPlanner.pomodorosCompleted);
    } else {
        // Break completed
        dpIsWorkSession = true;
        dpCurrentSeconds = dpWorkMinutes * 60;
        document.getElementById('dpTimerMode').textContent = 'Work Session';
        dpUpdateTimerDisplay();

        alert('Break over! Ready for another session? 💪');
    }

    document.getElementById('dpStartBtn').style.display = 'inline-block';
    document.getElementById('dpPauseBtn').style.display = 'none';
}

function dpPlayNotification() {
    try {
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
    } catch(e) {
    }
}

// Task Management Functions
function dpPopulateDeadlineDropdown() {
    const dropdown = document.getElementById('dpTaskDropdown');
    if (!dropdown) return;

    // Get upcoming deadlines from the deadlines array
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day
    const upcomingDeadlines = deadlines.filter(d => {
        const deadlineDate = parseLocalDate(d.date); // FIXED: Use parseLocalDate for timezone safety
        return deadlineDate >= now && !d.done;
    }).sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date)).slice(0, 20);

    let html = '<option value="">-- Select a deadline --</option>';

    // Group by urgency
    const urgent = upcomingDeadlines.filter(d => {
        const days = Math.ceil((parseLocalDate(d.date) - now) / (1000 * 60 * 60 * 24));
        return days <= 7;
    });
    const upcoming = upcomingDeadlines.filter(d => {
        const days = Math.ceil((parseLocalDate(d.date) - now) / (1000 * 60 * 60 * 24));
        return days > 7 && days <= 14;
    });
    const later = upcomingDeadlines.filter(d => {
        const days = Math.ceil((parseLocalDate(d.date) - now) / (1000 * 60 * 60 * 24));
        return days > 14;
    });

    if (urgent.length > 0) {
        html += '<optgroup label="🔴 Due within 7 days">';
        urgent.forEach(d => {
            const truncated = d.what.length > 50 ? d.what.substring(0, 50) + '...' : d.what;
            html += `<option value="${escapeHtml(d.what)}">${truncated} (${d.course})</option>`;
        });
        html += '</optgroup>';
    }

    if (upcoming.length > 0) {
        html += '<optgroup label="🟡 Due in 1-2 weeks">';
        upcoming.forEach(d => {
            const truncated = d.what.length > 50 ? d.what.substring(0, 50) + '...' : d.what;
            html += `<option value="${escapeHtml(d.what)}">${truncated} (${d.course})</option>`;
        });
        html += '</optgroup>';
    }

    if (later.length > 0) {
        html += '<optgroup label="🟢 Due in 2+ weeks">';
        later.forEach(d => {
            const truncated = d.what.length > 50 ? d.what.substring(0, 50) + '...' : d.what;
            html += `<option value="${escapeHtml(d.what)}">${truncated} (${d.course})</option>`;
        });
        html += '</optgroup>';
    }

    dropdown.innerHTML = html;
}

function dpSelectFromDropdown() {
    const dropdown = document.getElementById('dpTaskDropdown');
    const taskInput = document.getElementById('dpNewTask');

    if (!dropdown || !taskInput) return;

    if (dropdown.value) {
        taskInput.value = dropdown.value;
    }

    dropdown.value = '';
}

function dpSetTimeToNow() {
    const timeInput = document.getElementById('dpNewTime');
    if (!timeInput) return;

    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 5) * 5;
    now.setMinutes(minutes);
    if (now.getMinutes() >= 60) {
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
    }

    timeInput.value = now.toTimeString().slice(0, 5);
}

function dpSelectDuration(duration) {
    dpSelectedDuration = duration;

    document.querySelectorAll('.planner-duration-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.duration) === duration) {
            btn.classList.add('active');
        }
    });
}

function dpAddEvent() {
    const taskInput = document.getElementById('dpNewTask');
    const timeInput = document.getElementById('dpNewTime');

    const task = taskInput?.value?.trim();
    const time = timeInput?.value;
    const duration = dpSelectedDuration;

    if (!task) {
        taskInput?.focus();
        alert('Please enter a task!');
        return;
    }

    if (!time) {
        alert('Please select a time!');
        return;
    }

    if (!roadmapData.dailyPlanner.blocks || Array.isArray(roadmapData.dailyPlanner.blocks)) {
        roadmapData.dailyPlanner.blocks = migrateArrayToObject(roadmapData.dailyPlanner.blocks, 'block');
    }

    const blockId = generateId('block');
    roadmapData.dailyPlanner.blocks[blockId] = {
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

    saveDailyPlannerData();
    dpRenderTimeline();
    dpUpdateStats();

    taskInput?.focus();
}

function dpRenderTimeline() {
    const timeline = document.getElementById('dpTimeline');
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
                <div class="planner-hour-slot" onclick="dpQuickAddAtHour(${hour})"></div>
            </div>
        `;
    }

    // Add current time line
    html += '<div class="planner-current-time-line" id="dpCurrentTimeLine"></div>';

    // Add events (sorted by time) - use getValues() for object-based storage
    const blocksObj = roadmapData.dailyPlanner?.blocks || {};
    const blocksArray = getValues(blocksObj);
    if (blocksArray.length > 0) {
        const sortedBlocks = blocksArray.sort((a, b) => {
            return (a.startTime || '').localeCompare(b.startTime || '');
        });

        sortedBlocks.forEach(block => {
            if (block.startTime && block.task && block.id) {
                html += dpRenderEvent(block);
            }
        });
    }

    timeline.innerHTML = html;
    dpUpdateCurrentTimeLine();
}

function dpRenderEvent(block) {
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
    const endTimeStr = dpFormatTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);

    // Use block.id for toggle/delete operations (object-based storage)
    const blockIdEscaped = escapeHtml(block.id);
    return `
        <div class="planner-event ${block.completed ? 'completed' : ''}"
             style="top: ${top}px; height: ${height}px;"
             onclick="dpToggleEvent('${blockIdEscaped}')"
             title="Click to mark ${block.completed ? 'incomplete' : 'complete'}">
            <div class="planner-event-actions">
                <button class="planner-event-btn" onclick="event.stopPropagation(); dpDeleteEvent('${blockIdEscaped}')" title="Delete">×</button>
            </div>
            <div class="planner-event-title">${escapeHtml(block.task)}</div>
            ${height >= 40 ? `<div class="planner-event-time">${dpFormatTime(block.startTime)} - ${endTimeStr}</div>` : ''}
        </div>
    `;
}

function dpFormatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function dpQuickAddAtHour(hour) {
    const timeInput = document.getElementById('dpNewTime');
    const taskInput = document.getElementById('dpNewTask');

    if (timeInput) {
        timeInput.value = `${hour.toString().padStart(2, '0')}:00`;
    }
    if (taskInput) {
        taskInput.focus();
    }
}

function dpToggleEvent(blockId) {
    const blocks = roadmapData.dailyPlanner?.blocks;
    if (blocks && blocks[blockId]) {
        blocks[blockId].completed = !blocks[blockId].completed;
        saveDailyPlannerData();
        dpRenderTimeline();
        dpUpdateStats();
    }
}

function dpDeleteEvent(blockId) {
    const blocks = roadmapData.dailyPlanner?.blocks;
    if (blocks && blocks[blockId]) {
        delete blocks[blockId];
        saveDailyPlannerData();
        dpRenderTimeline();
        dpUpdateStats();
    }
}

function dpUpdateStats() {
    const blocksArray = getValues(roadmapData.dailyPlanner?.blocks);
    const total = blocksArray.length;
    const completed = blocksArray.filter(b => b.completed).length;
    const totalMinutes = blocksArray.reduce((sum, b) => sum + (b.duration || 30), 0);
    const hours = (totalMinutes / 60).toFixed(1);
    const pomodoros = roadmapData.dailyPlanner?.pomodorosCompleted || 0;

    const statTasks = document.getElementById('dpStatTasks');
    const statPlanned = document.getElementById('dpStatPlanned');
    const statCompleted = document.getElementById('dpStatCompleted');
    const statPomodoros = document.getElementById('dpStatPomodoros');
    const summary = document.getElementById('dpTaskSummary');

    if (statTasks) statTasks.textContent = total;
    if (statPlanned) statPlanned.textContent = hours + 'h';
    if (statCompleted) statCompleted.textContent = completed;
    if (statPomodoros) statPomodoros.textContent = pomodoros;
    if (summary) summary.textContent = `${total} tasks • ${hours}h planned • ${completed} done`;
}

function dpScrollToNow() {
    const container = document.getElementById('dpTimelineContainer');
    if (!container) return;

    const now = new Date();
    let adjustedHour = now.getHours();
    if (adjustedHour < 5) adjustedHour += 24;

    const hoursSince5AM = adjustedHour - 5;
    const scrollPosition = Math.max(0, (hoursSince5AM - 1) * 60);
    container.scrollTop = scrollPosition;
}

function dpClearDay() {
    if (!confirm('Are you sure you want to clear all tasks and reset the day?\n\nThis will remove all scheduled tasks, notes, and reset the pomodoro count.')) {
        return;
    }

    roadmapData.dailyPlanner = {
        date: getLocalDateString(),
        focus: '',
        notes: '',
        blocks: {},  // Object-based storage for Firebase safety
        pomodorosCompleted: 0,
        bedtime: '23:00'
    };

    // Clear UI
    const focusInput = document.getElementById('dpTodayFocus');
    const notesInput = document.getElementById('dpDailyNotes');
    if (focusInput) focusInput.value = '';
    if (notesInput) notesInput.value = '';

    saveDailyPlannerData();
    dpRenderTimeline();
    dpUpdateStats();

    alert('Day cleared! Start fresh. 💪');
}

function saveDailyPlannerData() {
    // Save focus and notes from inputs
    const focusInput = document.getElementById('dpTodayFocus');
    const notesInput = document.getElementById('dpDailyNotes');

    if (focusInput) roadmapData.dailyPlanner.focus = focusInput.value;
    if (notesInput) roadmapData.dailyPlanner.notes = notesInput.value;

    // Trigger main save
    saveData();
}
