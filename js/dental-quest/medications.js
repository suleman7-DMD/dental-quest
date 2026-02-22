/**
 * medications.js — Medication tracking, pill calendar, notes
 * Extracted from index.html Phase 3
 *
 * Dependencies: state.js (globals, utilities), firebase-sync.js (saveData)
 *
 * Globals used: medications, pillAssignments, calendarNotes, currentMedModal,
 *   getLocalDateString, parseLocalDate, escapeHtml, ensureModalOnBody,
 *   _modalOpenTime, saveData, showToast, generateId, getValues, getCount
 */

// ============================================
// MEDICATION DISPLAY & TRACKING
// ============================================

// Helper: Get human-readable time ago string
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    } else if (diffHours > 0) {
        return `${diffHours}h ago`;
    } else if (diffMins > 0) {
        return `${diffMins}m ago`;
    } else {
        return 'Just now';
    }
}

// Medication Tracking Functions
function updateMedicationDisplay() {
    updateMedCard('30mg');
    updateMedCard('20mg');
}

function updateMedCard(medType) {
    const med = medications[medType];
    const pillsElement = document.getElementById(`pills${medType}`);
    const refillElement = document.getElementById(`refill${medType}`);
    const progressElement = document.getElementById(`progress${medType}`);
    const statusElement = document.getElementById(`status${medType}`);
    const lastChangeElement = document.getElementById(`lastChange${medType}`);

    // Update pills count
    if (pillsElement) pillsElement.textContent = med.pills;

    // Update last manual change display
    if (lastChangeElement) {
        if (med.lastManualChange) {
            const changeDate = new Date(med.lastManualChange);
            const direction = med.lastManualChangeType === 'up' ? '↑' : '↓';
            const timeAgo = getTimeAgo(changeDate);
            lastChangeElement.textContent = `${direction} ${timeAgo}`;
            lastChangeElement.title = changeDate.toLocaleString();
        } else {
            lastChangeElement.textContent = 'Never';
        }
    }

    // Update refill date
    if (refillElement) {
        if (med.refillDate) {
            const refillDate = parseLocalDate(med.refillDate);
            refillElement.textContent = refillDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else {
            refillElement.textContent = 'Not set';
        }
    }

    // Calculate progress and status
    if (med.refillDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const refillDate = parseLocalDate(med.refillDate);

        // Calculate days from TOMORROW until refill (not including today)
        const daysFromTomorrow = Math.ceil((refillDate - tomorrow) / (1000 * 60 * 60 * 24));

        // Total days until refill including today (for display)
        const daysUntilRefill = Math.ceil((refillDate - today) / (1000 * 60 * 60 * 24));

        // Pills needed = days from tomorrow (since current pills are for tomorrow onward)
        const pillsNeeded = Math.max(0, daysFromTomorrow);
        const actualPills = med.pills;

        // Calculate surplus or deficit
        const difference = actualPills - pillsNeeded;
        const daysWithoutMeds = Math.abs(Math.min(0, difference));

        // Helper function to count weekdays between two dates
        function countWeekdays(startDate, endDate) {
            let count = 0;
            const current = new Date(startDate);
            while (current <= endDate) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday = 1, Friday = 5
                    count++;
                }
                current.setDate(current.getDate() + 1);
            }
            return count;
        }

        // Calculate total weekdays from tomorrow to refill
        const lastDayBeforeRefill = new Date(refillDate);
        lastDayBeforeRefill.setDate(lastDayBeforeRefill.getDate() - 1);
        const totalWeekdays = countWeekdays(tomorrow, lastDayBeforeRefill);

        // Calculate weekdays in deficit period (days without medication)
        let deficitWeekdays = 0;
        if (daysWithoutMeds > 0) {
            // Deficit starts when pills run out
            const deficitStartDate = new Date(tomorrow);
            deficitStartDate.setDate(deficitStartDate.getDate() + actualPills);
            deficitWeekdays = countWeekdays(deficitStartDate, lastDayBeforeRefill);
        }

        // Update progress bar (show current pills vs what's needed)
        const maxPills = Math.max(30, pillsNeeded);
        const percentage = (actualPills / maxPills) * 100;
        if (progressElement) progressElement.style.width = Math.min(100, percentage) + '%';

        // Update status with color coding and deficit warning
        if (statusElement) {
            statusElement.className = 'med-status';
            statusElement.style.cursor = 'pointer';

            if (daysUntilRefill <= 0) {
                // Refill date has passed or is today
                statusElement.classList.add('on-track');
                statusElement.innerHTML = 'Refill date reached! <span class="expand-icon" id="expandIcon' + medType + '">' + icon('chevron-down') + '</span>';
            } else if (difference >= 0) {
                // On track or ahead
                if (difference === 0) {
                    statusElement.classList.add('on-track');
                    statusElement.innerHTML = `On track - ${actualPills} pills for ${daysFromTomorrow} days (${totalWeekdays} weekdays) <span class="expand-icon" id="expandIcon${medType}">${icon('chevron-down')}</span>`;
                } else {
                    statusElement.classList.add('ahead');
                    statusElement.innerHTML = `${icon('arrow-up')} ${difference} pill${difference > 1 ? 's' : ''} ahead - ${actualPills} pills for ${daysFromTomorrow} days (${totalWeekdays} weekdays) <span class="expand-icon" id="expandIcon${medType}">${icon('chevron-down')}</span>`;
                }
            } else {
                // Behind schedule (deficit)
                const deficit = Math.abs(difference);

                if (deficit <= 3) {
                    statusElement.classList.add('slightly-behind');
                    statusElement.innerHTML = `${icon('alert-triangle')} ${deficit} pill${deficit > 1 ? 's' : ''} behind - ${actualPills} pills for ${daysFromTomorrow} days (${totalWeekdays} weekdays) <span class="expand-icon" id="expandIcon${medType}">${icon('chevron-down')}</span>`;
                } else {
                    statusElement.classList.add('behind');
                    statusElement.innerHTML = `${icon('alert-circle')} ${deficit} pill${deficit > 1 ? 's' : ''} behind - You have ${daysUntilRefill} day${daysUntilRefill > 1 ? 's' : ''} until refill (${totalWeekdays} weekdays), and you will be ${daysWithoutMeds} day${daysWithoutMeds > 1 ? 's' : ''} without medication (${deficitWeekdays} weekdays) <span class="expand-icon" id="expandIcon${medType}">${icon('chevron-down')}</span>`;
                }
            }
        }

        // Generate calendar breakdown
        generateCalendar(medType, tomorrow, refillDate, actualPills, daysFromTomorrow);
    } else {
        // No refill date set
        const percentage = (med.pills / 30) * 100;
        if (progressElement) progressElement.style.width = percentage + '%';
        if (statusElement) {
            statusElement.className = 'med-status';
            statusElement.textContent = 'Set your refill date to track progress';
        }
    }
}

function takeMed(medType) {
    const med = medications[medType];
    if (med.pills > 0) {
        med.pills--;

        // Log the dose for today (object keyed by date for Firebase safety)
        const today = getLocalDateString();
        if (!med.dosesLogged) med.dosesLogged = {};

        if (med.dosesLogged[today]) {
            med.dosesLogged[today].count++;
        } else {
            med.dosesLogged[today] = { date: today, count: 1 };
        }

        // Visual feedback - pulse the button
        const btn = event?.target;
        if (btn && btn.classList) {
            btn.classList.add('success');
            setTimeout(() => btn.classList.remove('success'), 600);
        }

        updateMedicationDisplay();
        saveData();
        showToast(`Logged ${medType} dose`, 'ok');
    } else {
        showToast('No pills remaining!', '!');
    }
}

function takeBothMeds() {
    if (medications['30mg'].pills > 0 && medications['20mg'].pills > 0) {
        // Take both pills
        medications['30mg'].pills--;
        medications['20mg'].pills--;

        // Log doses for today
        const today = getLocalDateString();

        ['30mg', '20mg'].forEach(medType => {
            const med = medications[medType];
            if (!med.dosesLogged) med.dosesLogged = {};

            if (med.dosesLogged[today]) {
                med.dosesLogged[today].count++;
            } else {
                med.dosesLogged[today] = { date: today, count: 1 };
            }
        });

        // Update display once for both
        updateMedicationDisplay();
        saveData();
        showToast('Logged daily dose (both pills)', 'ok');
    } else {
        showToast('Not enough pills remaining for both doses', '!');
    }
}

function adjustMed(medType, amount) {
    const med = medications[medType];
    const newAmount = med.pills + amount;

    if (newAmount >= 0 && newAmount <= 60) {
        med.pills = newAmount;
        // Track manual change
        med.lastManualChange = new Date().toISOString();
        med.lastManualChangeType = amount > 0 ? 'up' : 'down';
        updateMedicationDisplay();
        saveData();
        showToast(amount > 0 ? 'Pill added' : 'Pill removed', 'ok');
    } else {
        showToast('Invalid pill count', '!');
    }
}

// Auto-reduce pills daily (called on app load)
function checkAndApplyDailyPillReduce() {
    const today = getLocalDateString(); // YYYY-MM-DD
    let changed = false;

    ['30mg', '20mg'].forEach(medType => {
        const med = medications[medType];
        if (!med) return;

        // Check if we've already reduced today
        if (med.lastAutoReduceDate === today) return;

        // Check if this is the first day (no lastAutoReduceDate) - don't reduce on first load
        if (!med.lastAutoReduceDate) {
            med.lastAutoReduceDate = today;
            changed = true;
            return;
        }

        // Calculate days since last auto-reduce
        const [lastYear, lastMonth, lastDay] = med.lastAutoReduceDate.split('-').map(Number);
        const lastDate = new Date(lastYear, lastMonth - 1, lastDay);
        const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
        const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
        const daysDiff = Math.floor((todayDate - lastDate) / (24 * 60 * 60 * 1000));

        // Reduce pills for each day missed (catch-up if app wasn't opened for multiple days)
        if (daysDiff > 0 && med.pills > 0) {
            const reduceAmount = Math.min(daysDiff, med.pills); // Don't go below 0
            med.pills -= reduceAmount;
            med.lastAutoReduceDate = today;
            changed = true;
        } else if (daysDiff > 0) {
            med.lastAutoReduceDate = today;
            changed = true;
        }
    });

    if (changed) {
        updateMedicationDisplay();
        saveData();
    }
}

function openMedSettings(medType) {
    currentMedModal = medType;
    const med = medications[medType];

    document.getElementById('modalTitle').textContent = `${medType} Settings`;
    document.getElementById('modalPills').value = med.pills;
    document.getElementById('modalRefill').value = med.refillDate || '';

    const modal = document.getElementById('medModal');
    ensureModalOnBody(modal);
    _modalOpenTime = Date.now();
    modal.classList.add('show');
}

function closeMedModal() {
    document.getElementById('medModal').classList.remove('show');
    currentMedModal = null;
}

function saveMedSettings() {
    if (!currentMedModal) return;

    const med = medications[currentMedModal];
    const pillsInput = document.getElementById('modalPills').value;
    const refillInput = document.getElementById('modalRefill').value;

    med.pills = parseInt(pillsInput) || 0;
    med.refillDate = refillInput || null;

    updateMedicationDisplay();
    saveData();
    closeMedModal();
    showToast('Settings saved', 'ok');
}


// Interactive calendar functions (pill assignments, notes, generateCalendar)
// are in calendar.js since Phase 4 extracted them there.
