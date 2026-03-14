// ============================================
// med-inventory.js — Medication Inventory Module
// Cross-app shared data from index.html's appData/medications path
// Loaded AFTER graph.js, BEFORE init.js
//
// Dependencies: state.js (globals, utilities), firebase-sync.js (Firebase vars)
//
// Globals used: scInvMedications, scInvPillAssignments, scInvCalendarNotes,
//   scInvCurrentMedModal, scInvCurrentNoteDate, firebaseSyncEnabled, database,
//   userPath, getLocalDateString, parseLocalDate, escapeHtml, showToast,
//   generateId, getValues, getCount
// ============================================

// ============================================
// FIREBASE CROSS-APP READ/WRITE
// ============================================

function scInvLoadFromFirebase() {
    // Only load if Firebase is connected
    if (!firebaseSyncEnabled || !database || !userPath) return;

    // Compute the appData medications path (same user, different app path)
    var pin = localStorage.getItem('dentalQuestPin');
    if (!pin) return;
    var hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
    var medsPath = 'users/' + hashedPin + '/appData/medications';
    var pillsPath = 'users/' + hashedPin + '/appData/pillAssignments';
    var notesPath = 'users/' + hashedPin + '/appData/calendarNotes';

    // Read medications
    database.ref(medsPath).once('value').then(function(snapshot) {
        var data = snapshot.val();
        if (data) {
            ['30mg', '20mg'].forEach(function(key) {
                if (data[key]) {
                    scInvMedications[key] = Object.assign({}, scInvMedications[key], data[key]);
                    // Ensure dosesLogged is an object
                    if (!scInvMedications[key].dosesLogged || Array.isArray(scInvMedications[key].dosesLogged)) {
                        scInvMedications[key].dosesLogged = {};
                    }
                }
            });
        }
        scInvCheckAndApplyDailyPillReduce();
        scInvRender();
    }).catch(function(err) {
        console.error('Failed to load medication inventory:', err);
    });

    // Read pill assignments
    database.ref(pillsPath).once('value').then(function(snapshot) {
        var data = snapshot.val();
        if (data) {
            if (data['30mg']) scInvPillAssignments['30mg'] = data['30mg'];
            if (data['20mg']) scInvPillAssignments['20mg'] = data['20mg'];
        }
    }).catch(function(err) {
        console.error('Failed to load pill assignments:', err);
    });

    // Read calendar notes
    database.ref(notesPath).once('value').then(function(snapshot) {
        var data = snapshot.val();
        if (data) {
            scInvCalendarNotes = data;
        }
    }).catch(function(err) {
        console.error('Failed to load calendar notes:', err);
    });
}

function scInvSaveMedInventory() {
    // Save medications back to the SHARED appData path
    if (!firebaseSyncEnabled || !database) return;

    var pin = localStorage.getItem('dentalQuestPin');
    if (!pin) return;
    var hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
    var medsPath = 'users/' + hashedPin + '/appData/medications';
    var pillsPath = 'users/' + hashedPin + '/appData/pillAssignments';
    var notesPath = 'users/' + hashedPin + '/appData/calendarNotes';

    // Write medications
    database.ref(medsPath).set(scInvMedications).catch(function(err) {
        console.error('Failed to save medication inventory:', err);
    });

    // Write pill assignments
    database.ref(pillsPath).set(scInvPillAssignments).catch(function(err) {
        console.error('Failed to save pill assignments:', err);
    });

    // Write calendar notes
    database.ref(notesPath).set(scInvCalendarNotes).catch(function(err) {
        console.error('Failed to save calendar notes:', err);
    });
}

// ============================================
// MAIN RENDER
// ============================================

function scInvRender() {
    scInvUpdateMedCard('30mg');
    scInvUpdateMedCard('20mg');
}

// ============================================
// HELPER: Time ago string
// ============================================

function scInvGetTimeAgo(date) {
    var now = new Date();
    var diffMs = now - date;
    var diffSecs = Math.floor(diffMs / 1000);
    var diffMins = Math.floor(diffSecs / 60);
    var diffHours = Math.floor(diffMins / 60);
    var diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return diffDays === 1 ? 'Yesterday' : diffDays + ' days ago';
    if (diffHours > 0) return diffHours + 'h ago';
    if (diffMins > 0) return diffMins + 'm ago';
    return 'Just now';
}

// Helper function to count weekdays between two dates
function scInvCountWeekdays(startDate, endDate) {
    var count = 0;
    var current = new Date(startDate);
    while (current <= endDate) {
        var dayOfWeek = current.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

// ============================================
// MEDICATION CARD RENDERING
// ============================================

function scInvUpdateMedCard(medType) {
    var med = scInvMedications[medType];
    var pillsElement = document.getElementById('sc-inv-pills-' + medType);
    var refillElement = document.getElementById('sc-inv-refill-' + medType);
    var progressElement = document.getElementById('sc-inv-progress-' + medType);
    var statusElement = document.getElementById('sc-inv-status-' + medType);
    var lastChangeElement = document.getElementById('sc-inv-lastChange-' + medType);

    // Update pills count
    if (pillsElement) pillsElement.textContent = med.pills;

    // Update last manual change display
    if (lastChangeElement) {
        if (med.lastManualChange) {
            var changeDate = new Date(med.lastManualChange);
            var direction = med.lastManualChangeType === 'up' ? '\u2191' : '\u2193';
            var timeAgo = scInvGetTimeAgo(changeDate);
            lastChangeElement.textContent = direction + ' ' + timeAgo;
            lastChangeElement.title = changeDate.toLocaleString();
        } else {
            lastChangeElement.textContent = 'Never';
        }
    }

    // Update refill date
    if (refillElement) {
        if (med.refillDate) {
            var refillDate = parseLocalDate(med.refillDate);
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
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var refillDateObj = parseLocalDate(med.refillDate);

        // Calculate days from TOMORROW until refill (not including today)
        var daysFromTomorrow = Math.ceil((refillDateObj - tomorrow) / (1000 * 60 * 60 * 24));

        // Total days until refill including today (for display)
        var daysUntilRefill = Math.ceil((refillDateObj - today) / (1000 * 60 * 60 * 24));

        // Pills needed = days from tomorrow (since current pills are for tomorrow onward)
        var pillsNeeded = Math.max(0, daysFromTomorrow);
        var actualPills = med.pills;

        // Calculate surplus or deficit
        var difference = actualPills - pillsNeeded;
        var daysWithoutMeds = Math.abs(Math.min(0, difference));

        // Calculate total weekdays from tomorrow to refill
        var lastDayBeforeRefill = new Date(refillDateObj);
        lastDayBeforeRefill.setDate(lastDayBeforeRefill.getDate() - 1);
        var totalWeekdays = scInvCountWeekdays(tomorrow, lastDayBeforeRefill);

        // Calculate weekdays in deficit period (days without medication)
        var deficitWeekdays = 0;
        if (daysWithoutMeds > 0) {
            var deficitStartDate = new Date(tomorrow);
            deficitStartDate.setDate(deficitStartDate.getDate() + actualPills);
            deficitWeekdays = scInvCountWeekdays(deficitStartDate, lastDayBeforeRefill);
        }

        // Update progress bar
        var maxPills = Math.max(30, pillsNeeded);
        var percentage = (actualPills / maxPills) * 100;
        if (progressElement) progressElement.style.width = Math.min(100, percentage) + '%';

        // Update status with color coding and deficit warning
        if (statusElement) {
            statusElement.className = 'sc-inv-status';
            statusElement.style.cursor = 'pointer';

            if (daysUntilRefill <= 0) {
                statusElement.classList.add('on-track');
                statusElement.textContent = 'Refill date reached!';
            } else if (difference >= 0) {
                if (difference === 0) {
                    statusElement.classList.add('on-track');
                    statusElement.textContent = 'On track - ' + actualPills + ' pills for ' + daysFromTomorrow + ' days (' + totalWeekdays + ' weekdays)';
                } else {
                    statusElement.classList.add('ahead');
                    statusElement.textContent = '\u2191 ' + difference + ' pill' + (difference > 1 ? 's' : '') + ' ahead - ' + actualPills + ' pills for ' + daysFromTomorrow + ' days (' + totalWeekdays + ' weekdays)';
                }
            } else {
                var deficit = Math.abs(difference);
                if (deficit <= 3) {
                    statusElement.classList.add('slightly-behind');
                    statusElement.textContent = '\u26A0 ' + deficit + ' pill' + (deficit > 1 ? 's' : '') + ' behind - ' + actualPills + ' pills for ' + daysFromTomorrow + ' days (' + totalWeekdays + ' weekdays)';
                } else {
                    statusElement.classList.add('behind');
                    statusElement.textContent = '\u26A0 ' + deficit + ' pill' + (deficit > 1 ? 's' : '') + ' behind - You have ' + daysUntilRefill + ' day' + (daysUntilRefill > 1 ? 's' : '') + ' until refill (' + totalWeekdays + ' weekdays), ' + daysWithoutMeds + ' day' + (daysWithoutMeds > 1 ? 's' : '') + ' without medication (' + deficitWeekdays + ' weekdays)';
                }
            }
        }

        // Generate calendar breakdown
        scInvGenerateCalendar(medType, tomorrow, refillDateObj, actualPills, daysFromTomorrow);
    } else {
        // No refill date set
        var pctNoRefill = (med.pills / 30) * 100;
        if (progressElement) progressElement.style.width = pctNoRefill + '%';
        if (statusElement) {
            statusElement.className = 'sc-inv-status';
            statusElement.textContent = 'Set your refill date to track progress';
        }
    }
}

// ============================================
// TAKE / ADJUST MEDICATIONS
// ============================================

function scInvTakeMed(medType) {
    var med = scInvMedications[medType];
    if (med.pills > 0) {
        med.pills--;

        // Log the dose for today
        var today = getLocalDateString();
        if (!med.dosesLogged) med.dosesLogged = {};

        if (med.dosesLogged[today]) {
            med.dosesLogged[today].count++;
        } else {
            med.dosesLogged[today] = { date: today, count: 1 };
        }

        scInvRender();
        scInvSaveMedInventory();
        showToast('Logged ' + medType + ' dose');
    } else {
        showToast('No pills remaining!');
    }
}

function scInvTakeBothMeds() {
    if (scInvMedications['30mg'].pills > 0 && scInvMedications['20mg'].pills > 0) {
        scInvMedications['30mg'].pills--;
        scInvMedications['20mg'].pills--;

        var today = getLocalDateString();

        ['30mg', '20mg'].forEach(function(medType) {
            var med = scInvMedications[medType];
            if (!med.dosesLogged) med.dosesLogged = {};

            if (med.dosesLogged[today]) {
                med.dosesLogged[today].count++;
            } else {
                med.dosesLogged[today] = { date: today, count: 1 };
            }
        });

        scInvRender();
        scInvSaveMedInventory();
        showToast('Logged daily dose (both pills)');
    } else {
        showToast('Not enough pills for both doses');
    }
}

function scInvAdjustMed(medType, amount) {
    var med = scInvMedications[medType];
    var newAmount = med.pills + amount;

    if (newAmount >= 0 && newAmount <= 60) {
        med.pills = newAmount;
        med.lastManualChange = new Date().toISOString();
        med.lastManualChangeType = amount > 0 ? 'up' : 'down';
        scInvRender();
        scInvSaveMedInventory();
        showToast(amount > 0 ? 'Pill added' : 'Pill removed');
    } else {
        showToast('Invalid pill count');
    }
}

// ============================================
// AUTO-REDUCE PILLS DAILY
// ============================================

function scInvCheckAndApplyDailyPillReduce() {
    var today = getLocalDateString();
    var changed = false;

    ['30mg', '20mg'].forEach(function(medType) {
        var med = scInvMedications[medType];
        if (!med) return;

        // Check if we've already reduced today
        if (med.lastAutoReduceDate === today) return;

        // First day — don't reduce on first load
        if (!med.lastAutoReduceDate) {
            med.lastAutoReduceDate = today;
            changed = true;
            return;
        }

        // Calculate days since last auto-reduce (safe date parsing)
        var parts = med.lastAutoReduceDate.split('-').map(Number);
        var lastDate = new Date(parts[0], parts[1] - 1, parts[2]);
        var todayParts = today.split('-').map(Number);
        var todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
        var daysDiff = Math.floor((todayDate - lastDate) / (24 * 60 * 60 * 1000));

        // Reduce pills for each day missed
        if (daysDiff > 0 && med.pills > 0) {
            var reduceAmount = Math.min(daysDiff, med.pills);
            med.pills -= reduceAmount;
            med.lastAutoReduceDate = today;
            changed = true;
        } else if (daysDiff > 0) {
            med.lastAutoReduceDate = today;
            changed = true;
        }
    });

    if (changed) {
        scInvRender();
        scInvSaveMedInventory();
    }
}

// ============================================
// MEDICATION SETTINGS MODAL
// ============================================

function scInvOpenMedSettings(medType) {
    scInvCurrentMedModal = medType;
    var med = scInvMedications[medType];

    var titleEl = document.getElementById('sc-inv-modalTitle');
    if (titleEl) titleEl.textContent = medType + ' Settings';

    var pillsInput = document.getElementById('sc-inv-modalPills');
    if (pillsInput) pillsInput.value = med.pills;

    var refillInput = document.getElementById('sc-inv-modalRefill');
    if (refillInput) refillInput.value = med.refillDate || '';

    var modal = document.getElementById('scInvMedModal');
    if (modal) modal.classList.add('show');
}

function scInvCloseMedModal() {
    var modal = document.getElementById('scInvMedModal');
    if (modal) modal.classList.remove('show');
    scInvCurrentMedModal = null;
}

function scInvSaveMedSettings() {
    if (!scInvCurrentMedModal) return;

    var med = scInvMedications[scInvCurrentMedModal];
    var pillsInput = document.getElementById('sc-inv-modalPills');
    var refillInput = document.getElementById('sc-inv-modalRefill');

    med.pills = parseInt(pillsInput.value) || 0;
    med.refillDate = refillInput.value || null;

    scInvRender();
    scInvSaveMedInventory();
    scInvCloseMedModal();
    showToast('Settings saved');
}

// ============================================
// TOGGLE CALENDAR
// ============================================

function scInvToggleCalendar(medType) {
    var calendar = document.getElementById('sc-inv-calendar-' + medType);

    if (calendar) {
        var isShowing = calendar.style.display !== 'none';
        calendar.style.display = isShowing ? 'none' : 'block';
    }
}

// ============================================
// CALENDAR GENERATION
// ============================================

function scInvGenerateCalendar(medType, startDate, refillDate, pillsAvailable, daysNeeded, targetElementId) {
    var contentElement = document.getElementById(targetElementId || ('sc-inv-calendarContent-' + medType));
    if (!contentElement) return;

    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Build calendar using DOM methods for safety
    var gridDiv = document.createElement('div');
    gridDiv.className = 'calendar-grid';

    // Add day headers
    dayNames.forEach(function(day) {
        var header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        gridDiv.appendChild(header);
    });

    // Figure out what day of week to start
    var firstDay = new Date(startDate);
    var startDayOfWeek = firstDay.getDay();

    // Add empty cells for alignment
    for (var i = 0; i < startDayOfWeek; i++) {
        var emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        gridDiv.appendChild(emptyCell);
    }

    // Collect all days first
    var allDays = [];
    var current = new Date(startDate);
    var lastDay = new Date(refillDate);

    while (current <= lastDay) {
        var dateStr = getLocalDateString(current);
        var dayOfWeek = current.getDay();
        var isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        var isRefillDay = current.getTime() === lastDay.getTime();

        allDays.push({
            date: new Date(current),
            dateStr: dateStr,
            dayNum: current.getDate(),
            dayOfWeek: dayOfWeek,
            isWeekday: isWeekday,
            isRefillDay: isRefillDay
        });

        current.setDate(current.getDate() + 1);
    }

    // Check if we have custom assignments, otherwise use default
    var hasCustomAssignments = Object.keys(scInvPillAssignments[medType]).length > 0;

    if (!hasCustomAssignments) {
        // Initialize default assignments (first N days get pills)
        for (var j = 0; j < allDays.length && j < pillsAvailable; j++) {
            if (!allDays[j].isRefillDay) {
                scInvPillAssignments[medType][allDays[j].dateStr] = true;
            }
        }
    }

    // Render each day
    var pillsRemaining = pillsAvailable;
    allDays.forEach(function(day) {
        var note = scInvCalendarNotes[day.dateStr] || '';
        var hasPill = scInvPillAssignments[medType][day.dateStr] === true;

        var dayClass = '';
        var dayIcon = '';
        var title = '';

        if (day.isRefillDay) {
            dayClass = 'refill';
            dayIcon = 'R';
            title = 'Refill Day!';
        } else if (hasPill) {
            dayClass = 'has-pill';
            dayIcon = '\u25CF';
            title = 'Take pill - Click to unassign';
            pillsRemaining--;
        } else {
            if (day.isWeekday) {
                dayClass = 'no-pill-weekday';
                dayIcon = '\u2717';
                title = 'No medication - WEEKDAY - Click to assign pill';
            } else {
                dayClass = 'no-pill-weekend';
                dayIcon = '\u2013';
                title = 'No medication - Weekend - Click to assign pill';
            }
        }

        if (note) {
            title += ' | Note: ' + note.replace(/\n/g, ' ');
        }

        var cell = document.createElement('div');
        cell.className = 'calendar-day ' + dayClass;
        cell.title = title;

        // Closure to capture day variables
        (function(mt, ds, dd, isR, tp) {
            cell.addEventListener('click', function(event) {
                scInvHandleCalendarDayClick(event, mt, ds, dd, isR, tp);
            });
        })(medType, day.dateStr, day.date.toDateString(), day.isRefillDay, pillsAvailable);

        // Note button
        var noteBtn = document.createElement('button');
        noteBtn.className = 'sc-inv-day-note-btn';
        noteBtn.textContent = '+';
        noteBtn.title = 'Add/edit note';
        (function(ds, dd) {
            noteBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                scInvOpenNoteModal(ds, dd);
            });
        })(day.dateStr, day.date.toDateString());
        cell.appendChild(noteBtn);

        var numDiv = document.createElement('div');
        numDiv.className = 'calendar-day-num';
        numDiv.textContent = day.dayNum;
        cell.appendChild(numDiv);

        var iconDiv = document.createElement('div');
        iconDiv.className = 'calendar-day-icon';
        iconDiv.textContent = dayIcon;
        cell.appendChild(iconDiv);

        if (note) {
            var noteDiv = document.createElement('div');
            noteDiv.className = 'calendar-day-note';
            noteDiv.textContent = note;
            cell.appendChild(noteDiv);
        }

        gridDiv.appendChild(cell);
    });

    // Legend
    var legendDiv = document.createElement('div');
    legendDiv.className = 'sc-inv-calendar-legend';

    var legendItems = [
        { cls: 'has-pill', label: 'Have pill' },
        { cls: 'no-pill-weekday', label: 'No pill (weekday)' },
        { cls: 'no-pill-weekend', label: 'No pill (weekend)' },
        { cls: 'refill', label: 'Refill day' }
    ];

    legendItems.forEach(function(item) {
        var li = document.createElement('div');
        li.className = 'sc-inv-legend-item';
        var box = document.createElement('div');
        box.className = 'sc-inv-legend-box ' + item.cls;
        var span = document.createElement('span');
        span.textContent = item.label;
        li.appendChild(box);
        li.appendChild(span);
        legendDiv.appendChild(li);
    });

    // Clear and append
    contentElement.textContent = '';
    contentElement.appendChild(gridDiv);
    contentElement.appendChild(legendDiv);
}

// ============================================
// CALENDAR DAY CLICK HANDLER
// ============================================

function scInvHandleCalendarDayClick(event, medType, dateStr, displayDate, isRefillDay, totalPills) {
    // Right-click or ctrl-click opens note modal
    if (event.ctrlKey || event.metaKey || event.button === 2) {
        scInvOpenNoteModal(dateStr, displayDate);
        return;
    }

    // Can't modify refill day
    if (isRefillDay) {
        scInvOpenNoteModal(dateStr, displayDate);
        return;
    }

    // Toggle pill assignment
    var currentlyHas = scInvPillAssignments[medType][dateStr] === true;

    if (currentlyHas) {
        scInvAssignPillToNearestAvailableDay(medType, dateStr, totalPills);
    } else {
        scInvRemovePillFromNearestAssignedDay(medType, dateStr, totalPills);
    }

    scInvSaveMedInventory();
    scInvRender();
}

function scInvAssignPillToNearestAvailableDay(medType, excludeDate, totalPills) {
    // Remove pill from this day
    delete scInvPillAssignments[medType][excludeDate];

    // Find nearest available day to assign pill (prioritize weekdays, then nearest)
    var allDates = Object.keys(scInvPillAssignments[medType]).sort();
    var weekdays = allDates.filter(function(date) {
        var d = parseLocalDate(date);
        var dow = d.getDay();
        return dow >= 1 && dow <= 5 && !scInvPillAssignments[medType][date];
    });

    var weekends = allDates.filter(function(date) {
        var d = parseLocalDate(date);
        var dow = d.getDay();
        return (dow === 0 || dow === 6) && !scInvPillAssignments[medType][date];
    });

    // Try weekdays first, then weekends
    var targetDate = weekdays[0] || weekends[0];
    if (targetDate) {
        scInvPillAssignments[medType][targetDate] = true;
    }
}

function scInvRemovePillFromNearestAssignedDay(medType, targetDate, totalPills) {
    // Count current assignments
    var currentAssignments = Object.values(scInvPillAssignments[medType]).filter(function(v) { return v === true; }).length;

    // Can't exceed total pills
    if (currentAssignments >= totalPills) {
        var assignedDates = Object.keys(scInvPillAssignments[medType])
            .filter(function(date) { return scInvPillAssignments[medType][date] === true && date !== targetDate; })
            .sort();

        if (assignedDates.length > 0) {
            delete scInvPillAssignments[medType][assignedDates[0]];
        }
    }

    // Assign pill to target day
    scInvPillAssignments[medType][targetDate] = true;
}

function scInvResetPillAssignments(medType) {
    if (!confirm('Reset pill assignments to default (first available days)?')) {
        return;
    }

    scInvPillAssignments[medType] = {};
    scInvSaveMedInventory();
    scInvRender();
    showToast('Pill assignments reset');
}

// ============================================
// CALENDAR NOTE FUNCTIONS
// ============================================

function scInvOpenNoteModal(dateStr, displayDate) {
    scInvCurrentNoteDate = dateStr;
    var noteInput = document.getElementById('sc-inv-noteInput');
    var charCount = document.getElementById('sc-inv-noteCharCount');
    var modalTitle = document.getElementById('sc-inv-noteModalTitle');

    if (modalTitle) modalTitle.textContent = 'Note for ' + displayDate;

    if (noteInput) {
        noteInput.value = scInvCalendarNotes[dateStr] || '';
        if (charCount) charCount.textContent = noteInput.value.length;

        noteInput.oninput = function() {
            if (charCount) charCount.textContent = this.value.length;
        };
    }

    var modal = document.getElementById('scInvNoteModal');
    if (modal) modal.classList.add('show');
}

function scInvCloseNoteModal() {
    var modal = document.getElementById('scInvNoteModal');
    if (modal) modal.classList.remove('show');
    scInvCurrentNoteDate = null;
}

function scInvSaveNote() {
    if (!scInvCurrentNoteDate) return;

    var noteInput = document.getElementById('sc-inv-noteInput');
    var noteText = noteInput ? noteInput.value.trim() : '';

    if (noteText) {
        scInvCalendarNotes[scInvCurrentNoteDate] = noteText;
        showToast('Note saved');
    } else {
        delete scInvCalendarNotes[scInvCurrentNoteDate];
        showToast('Note removed');
    }

    scInvSaveMedInventory();
    scInvRender();
    scInvCloseNoteModal();
}

function scInvDeleteNote() {
    if (!scInvCurrentNoteDate) return;

    if (confirm('Delete this note?')) {
        delete scInvCalendarNotes[scInvCurrentNoteDate];
        scInvSaveMedInventory();
        scInvRender();
        scInvCloseNoteModal();
        showToast('Note deleted');
    }
}

// ============================================
// DASHBOARD COMPACT INVENTORY CARD
// ============================================

function scInvRenderDashboard() {
    var container = document.getElementById('scDashInvContent');
    if (!container) return;

    var todayStr = getLocalDateString(new Date());
    var allTakenToday = true;
    var todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    var tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    container.textContent = '';

    ['30mg', '20mg'].forEach(function(medType) {
        var med = scInvMedications[medType];
        if (!med) return;

        var pills = med.pills ?? 0;
        var dailyDose = med.dailyDose ?? 1;
        var daysSupply = dailyDose > 0 ? Math.floor(pills / dailyDose) : 0;
        var label = med.label ?? ('Adderall XR ' + medType);
        var takenToday = (med.dosesLogged && med.dosesLogged[todayStr]);

        if (!takenToday) allTakenToday = false;

        // Main row: label + pills count
        var row = document.createElement('div');
        row.className = 'sc-inv-dash-row';

        var infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';

        var labelDiv = document.createElement('div');
        labelDiv.className = 'sc-inv-dash-label';
        labelDiv.textContent = label;
        infoDiv.appendChild(labelDiv);

        var daysDiv = document.createElement('div');
        daysDiv.className = 'sc-inv-dash-days';
        daysDiv.textContent = daysSupply + ' day' + (daysSupply !== 1 ? 's' : '') + ' supply';
        infoDiv.appendChild(daysDiv);

        // Refill countdown + deficit/surplus
        if (med.refillDate) {
            var refillDateObj = parseLocalDate(med.refillDate);
            var daysUntilRefill = Math.ceil((refillDateObj - todayDate) / (1000 * 60 * 60 * 24));
            var daysFromTomorrow = Math.ceil((refillDateObj - tomorrowDate) / (1000 * 60 * 60 * 24));
            var pillsNeeded = Math.max(0, daysFromTomorrow);
            var difference = pills - pillsNeeded;

            // Refill line
            var refillDiv = document.createElement('div');
            refillDiv.className = 'sc-inv-dash-refill';
            if (daysUntilRefill <= 0) {
                refillDiv.textContent = 'Refill date reached!';
                refillDiv.style.color = 'var(--success)';
            } else {
                refillDiv.textContent = 'Refill in ' + daysUntilRefill + ' day' + (daysUntilRefill !== 1 ? 's' : '');
            }
            infoDiv.appendChild(refillDiv);

            // Status badge
            var statusSpan = document.createElement('span');
            statusSpan.className = 'sc-inv-dash-status';
            if (daysUntilRefill <= 0) {
                statusSpan.className += ' on-track';
                statusSpan.textContent = 'Refill ready';
            } else if (difference >= 0) {
                if (difference === 0) {
                    statusSpan.className += ' on-track';
                    statusSpan.textContent = 'On track';
                } else {
                    statusSpan.className += ' ahead';
                    statusSpan.textContent = '+' + difference + ' ahead';
                }
            } else {
                var deficit = Math.abs(difference);
                if (deficit <= 3) {
                    statusSpan.className += ' slightly-behind';
                    statusSpan.textContent = '-' + deficit + ' behind';
                } else {
                    statusSpan.className += ' behind';
                    statusSpan.textContent = '-' + deficit + ' behind';
                }
            }
            infoDiv.appendChild(statusSpan);
        } else {
            var noRefillDiv = document.createElement('div');
            noRefillDiv.className = 'sc-inv-dash-refill';
            noRefillDiv.textContent = 'No refill date set';
            infoDiv.appendChild(noRefillDiv);
        }

        row.appendChild(infoDiv);

        var pillsDiv = document.createElement('div');
        pillsDiv.className = 'sc-inv-dash-pills';
        pillsDiv.textContent = String(pills);
        row.appendChild(pillsDiv);

        container.appendChild(row);

        // Collapsible calendar toggle
        if (med.refillDate) {
            var calToggle = document.createElement('button');
            calToggle.className = 'sc-inv-dash-cal-toggle';
            calToggle.textContent = 'Planning Calendar \u25B6';
            var calWrapId = 'sc-inv-dashCal-' + medType;

            var calWrap = document.createElement('div');
            calWrap.className = 'sc-inv-dash-cal-wrap';
            calWrap.id = calWrapId;
            calWrap.style.display = 'none';

            calToggle.addEventListener('click', (function(mt, wrapId, toggleBtn) {
                return function() {
                    var wrap = document.getElementById(wrapId);
                    if (!wrap) return;
                    var isShowing = wrap.style.display !== 'none';
                    wrap.style.display = isShowing ? 'none' : 'block';
                    toggleBtn.textContent = isShowing ? 'Planning Calendar \u25B6' : 'Planning Calendar \u25BC';
                    // Lazy-render calendar on first open
                    if (!isShowing && wrap.children.length === 0) {
                        var m = scInvMedications[mt];
                        if (m && m.refillDate) {
                            var td = new Date();
                            td.setHours(0, 0, 0, 0);
                            var tmrw = new Date(td);
                            tmrw.setDate(tmrw.getDate() + 1);
                            var rDate = parseLocalDate(m.refillDate);
                            var dFromTmrw = Math.ceil((rDate - tmrw) / (1000 * 60 * 60 * 24));
                            var calContentId = 'sc-inv-dashCalContent-' + mt;
                            var contentDiv = document.createElement('div');
                            contentDiv.id = calContentId;
                            wrap.appendChild(contentDiv);
                            scInvGenerateCalendar(mt, tmrw, rDate, m.pills ?? 0, dFromTmrw, calContentId);
                        }
                    }
                };
            })(medType, calWrapId, calToggle));

            container.appendChild(calToggle);
            container.appendChild(calWrap);
        }
    });

    // Take Daily Dose button or Taken Today indicator
    var actionDiv = document.createElement('div');
    actionDiv.style.marginTop = '8px';

    if (allTakenToday) {
        actionDiv.style.textAlign = 'center';
        actionDiv.style.color = '#4caf50';
        actionDiv.style.fontWeight = '600';
        var checkSpan = document.createElement('span');
        checkSpan.style.marginRight = '4px';
        checkSpan.textContent = '\u2713';
        actionDiv.appendChild(checkSpan);
        var takenText = document.createTextNode('Taken Today');
        actionDiv.appendChild(takenText);
    } else {
        var btn = document.createElement('button');
        btn.className = 'sc-btn sc-btn--primary sc-btn--sm';
        btn.style.width = '100%';
        btn.setAttribute('onclick', 'scInvTakeBothMeds(); scInvRenderDashboard();');
        btn.textContent = 'Take Daily Dose';
        actionDiv.appendChild(btn);
    }

    container.appendChild(actionDiv);
}
