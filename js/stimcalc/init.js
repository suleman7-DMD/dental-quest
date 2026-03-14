// ============================================
// init.js — Initialization, recalculate (refactored), accordion, unified view
// LAST module loaded — depends on everything
// ============================================

// ============================================
// SIDEBAR NAVIGATION STATE
// ============================================
var currentPage = 'dashboard';

// ============================================
// RECALCULATE — Refactored into 3 phases with error isolation
// Runs every 5 seconds via setInterval. If it throws, app crashes every 5s.
// The try/catch in recalculate() prevents that crash loop.
// ============================================

/**
 * Phase 1: Read DOM inputs and update state.
 * Pure side-effect on `state` — no calculations, no DOM writes.
 */
function syncStateFromDOM() {
    const wakeTimeEl = document.getElementById('wakeTime');
    const hoursSleptEl = document.getElementById('hoursSlept');

    if (wakeTimeEl) state.wakeTime = wakeTimeEl.value || state.wakeTime;

    // FIX: Don't use || 8 as it treats 0 as falsy. Use explicit null check for all-nighter support
    const parsedHours = hoursSleptEl ? parseFloat(hoursSleptEl.value) : null;
    const newHoursSlept = (parsedHours !== null && !isNaN(parsedHours)) ? parsedHours : state.hoursSleptLastNight;

    // Check if hours slept changed - update calendar and stacking warning
    if (newHoursSlept !== state.hoursSleptLastNight) {
        state.hoursSleptLastNight = newHoursSlept;
        updateTodaySleepHistory();
        updateStackingWarning(); // Re-evaluate risk based on new sleep debt
    } else {
        state.hoursSleptLastNight = newHoursSlept;
    }

    // Safely get settings values
    // BUG FIX 5: Use isNaN check instead of || to prevent 0 being treated as falsy
    const ampHalfLifeEl = document.getElementById('ampHalfLife');
    const sleepThresholdEl = document.getElementById('sleepThreshold');
    const caffHalfLifeEl = document.getElementById('caffHalfLife');
    const caffThresholdEl = document.getElementById('caffThreshold');
    const weightEl = document.getElementById('weight');

    if (ampHalfLifeEl) { const p = parseFloat(ampHalfLifeEl.value); state.settings.ampHalfLife = !isNaN(p) ? p : state.settings.ampHalfLife; }
    if (sleepThresholdEl) { const p = parseFloat(sleepThresholdEl.value); state.settings.sleepThreshold = !isNaN(p) ? p : state.settings.sleepThreshold; }
    if (caffHalfLifeEl) { const p = parseFloat(caffHalfLifeEl.value); state.settings.caffHalfLife = !isNaN(p) ? p : state.settings.caffHalfLife; }
    if (caffThresholdEl) { const p = parseFloat(caffThresholdEl.value); state.settings.caffThreshold = !isNaN(p) ? p : state.settings.caffThreshold; }
    if (weightEl) { const p = parseFloat(weightEl.value); state.settings.weight = !isNaN(p) ? p : state.settings.weight; }
    const sleepTargetEl = document.getElementById('sleepTarget');
    if (sleepTargetEl) { const p = parseFloat(sleepTargetEl.value); state.settings.sleepTarget = !isNaN(p) ? p : (state.settings.sleepTarget ?? 8); }

    if (state.modifiers.vitaminC && state.modifiers.vitaminC.active) {
        const vitCTimeEl = document.getElementById('vitaminCTime');
        const vitCDateEl = document.getElementById('vitaminCDate');
        if (vitCTimeEl) state.modifiers.vitaminC.time = vitCTimeEl.value || state.modifiers.vitaminC.time;
        // Convert "today"/"tomorrow" select to actual date strings
        if (vitCDateEl) {
            const val = vitCDateEl.value;
            if (val === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                state.modifiers.vitaminC.date = getLocalDateString(tomorrow);
            } else if (val === 'today') {
                state.modifiers.vitaminC.date = getLocalDateString();
            }
            // If val is already a date string, keep it
        }

        // Update VitC status badge
        updateVitCBadge();
    }
    if (state.modifiers.sauna && state.modifiers.sauna.active) {
        const saunaTimeEl = document.getElementById('saunaTime');
        if (saunaTimeEl) {
            const newTime = saunaTimeEl.value || state.modifiers.sauna.time;
            // FIX: If time changed, update the date to today (user is setting new sauna time)
            if (newTime !== state.modifiers.sauna.time) {
                state.modifiers.sauna.date = getLocalDateString();
            }
            state.modifiers.sauna.time = newTime;
        }
    }
}

/**
 * Phase 2: Run all calculations, return a viewModel with computed values.
 * Pure computation — reads state, returns data. No DOM access.
 */
function runCalculations() {
    var vm = {};

    vm.now = getCurrentMinutes();
    vm.sleepDebtBonus = calculateSleepDebtBonus();
    vm.effectiveThreshold = getEffectiveThreshold();
    vm.isHyperarousal = isHyperarousalMode();
    vm.sleepDebtBreakdown = (!vm.isHyperarousal && vm.sleepDebtBonus > 0) ? getSleepDebtBreakdown() : null;

    // Circadian data
    vm.forbiddenZone = getForbiddenZone();
    vm.sleepGate = getSleepGate();
    vm.circadianAnalysis = analyzeCircadianPhase();
    vm.inForbiddenZone = isInForbiddenZone(vm.now);
    vm.inSleepGate = isInSleepGate(vm.now);
    vm.avgSleep = vm.circadianAnalysis.avgSleep;
    vm.dataPoints = vm.circadianAnalysis.dataPoints;

    // Current loads
    vm.currentAmpLoad = calculateAmpLoad(vm.now);
    vm.currentCaffLoad = calculateCaffLoad(vm.now);
    vm.caffThreshold = state.settings.caffThreshold;
    vm.ampOk = vm.currentAmpLoad < vm.effectiveThreshold;
    vm.caffOk = vm.currentCaffLoad < vm.caffThreshold;

    // Sleep time
    var sleepResult = calculateSleepTime();
    vm.sleepTime = sleepResult.sleepTime;
    vm.blockingFactors = sleepResult.blockingFactors;

    // Display sleep time (normalized)
    vm.displaySleepTime = vm.sleepTime % (24 * 60);
    if (vm.displaySleepTime < 0) vm.displaySleepTime += 24 * 60;

    // Store projected sleep time for cross-app integration
    state.projectedSleepTime = minutesToTime(vm.displaySleepTime);
    state.projectedSleepMinutes = vm.sleepTime;

    // Time remaining
    var remaining = vm.sleepTime - vm.now;
    if (remaining < 0) remaining += 24 * 60;
    vm.remainingHours = Math.floor(remaining / 60);
    vm.remainingMins = Math.floor(remaining % 60);

    // Sleep hours available
    var wakeMinutes = timeToMinutes(state.wakeTime);
    var nextWake = wakeMinutes;
    if (vm.sleepTime > wakeMinutes || vm.sleepTime < 6 * 60) {
        nextWake = wakeMinutes + 24 * 60;
    }

    var effectiveSleepTime = vm.sleepTime;
    if (vm.sleepTime < 6 * 60) {
        effectiveSleepTime = vm.sleepTime + 24 * 60;
    }

    vm.sleepHours = Math.max(0, (nextWake - effectiveSleepTime) / 60);
    var MAX_REALISTIC_SLEEP = 14;
    if (vm.sleepHours > MAX_REALISTIC_SLEEP) {
        vm.sleepHours = MAX_REALISTIC_SLEEP;
    }

    // Color class and quality text
    if (vm.sleepHours >= 8) {
        vm.colorClass = 'green';
        vm.qualityText = '\u2713 Projected Sleep Duration: ' + vm.sleepHours.toFixed(1) + ' hours';
    } else if (vm.sleepHours >= 6) {
        vm.colorClass = 'yellow';
        vm.qualityText = '\u26a0\ufe0f Projected Duration: ' + vm.sleepHours.toFixed(1) + ' hours - suboptimal but functional';
    } else if (vm.sleepHours >= 0.5) {
        vm.colorClass = 'red';
        vm.qualityText = '\ud83d\udea8 Projected Duration: ' + vm.sleepHours.toFixed(1) + ' hours - muscle catabolism risk';
    } else if (vm.sleepHours > 0) {
        vm.colorClass = 'red';
        vm.qualityText = '\ud83d\udea8 NO VALID SLEEP WINDOW - drugs clear too close to wake time (' + Math.round(vm.sleepHours * 60) + ' min available)';
    } else {
        vm.colorClass = 'red';
        vm.qualityText = '\ud83d\udea8 SLEEP IMPOSSIBLE TONIGHT - drugs won\'t clear before wake time';
    }

    // Bottleneck
    if (vm.blockingFactors.length > 0) {
        var wakeMin = timeToMinutes(state.wakeTime || '06:45');
        var normClear = function(t) { return (t || 0) < wakeMin ? (t || 0) + 1440 : (t || 0); };
        vm.primaryBottleneck = vm.blockingFactors.reduce(function(a, b) { return normClear(a.clearsAt) > normClear(b.clearsAt) ? a : b; });
    } else {
        vm.primaryBottleneck = null;
    }

    return vm;
}

/**
 * Phase 3: Write computed values to the DOM.
 * Takes the viewModel from runCalculations() — no recalculation here.
 */
function updateUI(vm) {
    // Always update metrics row regardless of active page
    if (typeof updateMetricsRow === 'function') updateMetricsRow(vm);

    // Skip heavy dashboard DOM updates when not on dashboard
    if (typeof currentPage !== 'undefined' && currentPage !== 'dashboard') return;

    // --- Sleep Debt Display ---
    var sleepDebtDisplay = document.getElementById('sleepDebtDisplay');
    if (sleepDebtDisplay && vm.isHyperarousal) {
        sleepDebtDisplay.innerHTML = '\n                    <div style="display: flex; justify-content: space-between; align-items: center;">\n                        <span style="color: #B85C5C; font-weight: 700;">\ud83d\udea8 ACUTE DEPRIVATION DETECTED</span>\n                        <span style="color: #B85C5C; font-weight: 600;">HIGH ADRENALINE RISK</span>\n                    </div>\n                    <div style="font-size: 0.85em; color: #C97070; margin-top: 8px; line-height: 1.5;">\n                        <strong>WARNING:</strong> You slept less than 4 hours. Your body is in survival mode.\n                        <br><br>\n                        <strong>The Paradox:</strong> Sleep pressure is high, but your HPA axis is flooding your system with cortisol and adrenaline. You will feel "tired but wired."\n                        <br><br>\n                        <strong>Action Required:</strong>\n                        <br>\u2022 Avoid ALL screens after 8 PM (blue light extends wakefulness 90-120 min)\n                        <br>\u2022 No caffeine after noon\n                        <br>\u2022 Hot shower or sauna to trigger parasympathetic response\n                        <br>\u2022 The sleep debt bonus is NEGATED - you need drugs to clear fully\n                    </div>\n                    <div style="margin-top: 10px; padding: 8px; background: rgba(184, 92, 92, 0.15); border-radius: 6px; font-size: 0.85em;">\n                        Threshold: ' + vm.effectiveThreshold.toFixed(1) + 'mg (no bonus applied - adrenaline counteracts adenosine)\n                    </div>\n                ';
        sleepDebtDisplay.style.borderLeft = '4px solid #B85C5C';
        sleepDebtDisplay.style.background = 'rgba(184, 92, 92, 0.08)';
    } else if (sleepDebtDisplay && vm.sleepDebtBonus > 0) {
        var breakdown = vm.sleepDebtBreakdown;
        var breakdownHtml = breakdown.map(function(d) {
            if (!d.hasData && d.label !== 'Today') {
                return '<span style="color: #9C948B;">' + d.label + ': no data</span>';
            }
            var deficitColor = d.deficit > 0 ? '#C4923A' : '#5E8A5E';
            return '<span style="color: ' + deficitColor + ';">' + d.label + ': ' + d.hours + 'h' + (d.deficit > 0 ? ' (-' + d.deficit + 'h \u00d7 ' + d.weight + ')' : '') + '</span>';
        }).join(' \u00b7 ');

        sleepDebtDisplay.innerHTML = '\n                    <div style="display: flex; justify-content: space-between; align-items: center;">\n                        <span style="color: #C4923A;">\ud83d\ude34 Sleep Debt Detected (3-Day Rolling)</span>\n                        <span style="color: #C4923A; font-weight: 600;">+' + vm.sleepDebtBonus.toFixed(1) + 'mg to threshold</span>\n                    </div>\n                    <div style="font-size: 0.8em; color: #6B635B; margin-top: 6px;">\n                        ' + breakdownHtml + '\n                    </div>\n                    <div style="font-size: 0.85em; color: #6B635B; margin-top: 4px;">\n                        Base threshold: ' + state.settings.sleepThreshold + 'mg \u2192 Effective: <strong style="color: #5E8A5E;">' + vm.effectiveThreshold.toFixed(1) + 'mg</strong>\n                    </div>\n                ';
        sleepDebtDisplay.style.borderLeft = '3px solid #C4923A';
        sleepDebtDisplay.style.background = '#F5F2ED';
    } else if (sleepDebtDisplay) {
        sleepDebtDisplay.innerHTML = '\n                    <div style="display: flex; justify-content: space-between; align-items: center;">\n                        <span style="color: #5E8A5E;">\u2713 Well Rested</span>\n                        <span style="color: #6B635B;">Threshold: ' + vm.effectiveThreshold.toFixed(1) + 'mg</span>\n                    </div>\n                    <div style="font-size: 0.85em; color: #6B635B; margin-top: 6px;">\n                        No sleep debt modifier applied.\n                    </div>\n                ';
        sleepDebtDisplay.style.borderLeft = '3px solid #5E8A5E';
        sleepDebtDisplay.style.background = '#F5F2ED';
    }

    // --- Circadian Timeline Display ---
    var wakeTimeDisplayEl = document.getElementById('wakeTimeDisplay');
    var forbiddenZoneTimeEl = document.getElementById('forbiddenZoneTime');
    var sleepGateTimeEl = document.getElementById('sleepGateTime');

    if (wakeTimeDisplayEl) wakeTimeDisplayEl.textContent = formatTime12(state.wakeTime);
    if (forbiddenZoneTimeEl) forbiddenZoneTimeEl.textContent =
        minutesToTime(vm.forbiddenZone.start > 24*60 ? vm.forbiddenZone.start - 24*60 : vm.forbiddenZone.start) + ' - ' + minutesToTime(vm.forbiddenZone.end > 24*60 ? vm.forbiddenZone.end - 24*60 : vm.forbiddenZone.end);
    if (sleepGateTimeEl) sleepGateTimeEl.textContent =
        minutesToTime(vm.sleepGate.start > 24*60 ? vm.sleepGate.start - 24*60 : vm.sleepGate.start) + ' - ' + minutesToTime(vm.sleepGate.end > 24*60 ? vm.sleepGate.end - 24*60 : vm.sleepGate.end);

    // --- Circadian Status ---
    var circadianStatusEl = document.getElementById('circadianStatus');
    var circadianIndicatorEl = document.getElementById('circadianIndicator');
    var circadianItem = document.getElementById('circadianStatusItem');

    if (circadianStatusEl && circadianIndicatorEl && circadianItem) {
        if (vm.dataPoints >= 2 && vm.avgSleep < 4.5) {
            circadianStatusEl.textContent = 'CRITICAL DEBT';
            circadianIndicatorEl.textContent = '\ud83d\udea8';
            circadianItem.className = 'status-item blocking';
            circadianItem.style.borderLeftColor = '#B85C5C';
        } else if (vm.dataPoints >= 2 && vm.avgSleep < 6) {
            circadianStatusEl.textContent = 'Sleep Debt';
            circadianIndicatorEl.textContent = '\u26a0\ufe0f';
            circadianItem.className = 'status-item blocking';
            circadianItem.style.borderLeftColor = '#C4923A';
        } else if (vm.circadianAnalysis.phase === 'danger-delayed' || vm.circadianAnalysis.phase === 'delayed') {
            circadianStatusEl.textContent = vm.circadianAnalysis.label;
            circadianIndicatorEl.textContent = vm.circadianAnalysis.icon;
            circadianItem.className = 'status-item blocking';
            circadianItem.style.borderLeftColor = vm.circadianAnalysis.color;
        } else if (vm.circadianAnalysis.stdDev > 120 && vm.dataPoints >= 2) {
            circadianStatusEl.textContent = 'Irregular';
            circadianIndicatorEl.textContent = '\ud83d\udd00';
            circadianItem.className = 'status-item blocking';
            circadianItem.style.borderLeftColor = '#C4923A';
        } else if (vm.inForbiddenZone) {
            circadianStatusEl.textContent = 'Forbidden Zone';
            circadianIndicatorEl.textContent = '\u26a0\ufe0f';
            circadianItem.className = 'status-item blocking';
            circadianItem.style.borderLeftColor = '#B85C5C';
        } else if (vm.inSleepGate) {
            circadianStatusEl.textContent = 'Sleep Gate Open';
            circadianIndicatorEl.textContent = '\ud83c\udf19';
            circadianItem.className = 'status-item ok';
            circadianItem.style.borderLeftColor = '#5E8A5E';
        } else if (vm.circadianAnalysis.phase === 'normal' && vm.avgSleep >= 6.5) {
            circadianStatusEl.textContent = 'Healthy';
            circadianIndicatorEl.textContent = '\u2713';
            circadianItem.className = 'status-item ok';
            circadianItem.style.borderLeftColor = '#5E8A5E';
        } else {
            circadianStatusEl.textContent = vm.circadianAnalysis.label || 'Monitoring';
            circadianIndicatorEl.textContent = vm.circadianAnalysis.icon || '\ud83d\udcca';
            circadianItem.className = 'status-item ok';
            circadianItem.style.borderLeftColor = vm.circadianAnalysis.color || '#9C948B';
        }
    }

    // --- Current load displays ---
    var currentAmpLoadEl = document.getElementById('currentAmpLoad');
    var currentCaffLoadEl = document.getElementById('currentCaffLoad');
    if (currentAmpLoadEl) currentAmpLoadEl.textContent = vm.currentAmpLoad.toFixed(1) + ' mg';
    if (currentCaffLoadEl) currentCaffLoadEl.textContent = vm.currentCaffLoad.toFixed(1) + ' mg';

    // --- Status indicators ---
    updateStatusItem('ampStatus', vm.ampOk, vm.currentAmpLoad, vm.effectiveThreshold);
    updateStatusItem('caffStatus', vm.caffOk, vm.currentCaffLoad, vm.caffThreshold);

    // --- Workout status ---
    updateWorkoutStatus();

    // --- Bottleneck indicator ---
    var bottleneckEl = document.getElementById('bottleneckIndicator');
    if (bottleneckEl && vm.primaryBottleneck) {
        bottleneckEl.textContent = '\u23f3 Bottleneck: ' + vm.primaryBottleneck.name;
        bottleneckEl.style.display = 'block';
    } else if (bottleneckEl) {
        bottleneckEl.style.display = 'none';
    }

    // --- Main countdown display ---
    var sleepTimeDisplay = document.getElementById('sleepTime');
    var timeRemainingEl = document.getElementById('timeRemaining');
    var sleepQualityEl = document.getElementById('sleepQuality');

    if (sleepTimeDisplay) sleepTimeDisplay.textContent = minutesToTime(vm.displaySleepTime);
    if (timeRemainingEl) {
        timeRemainingEl.textContent = vm.remainingHours + 'h ' + vm.remainingMins + 'm remaining';
        if (vm.remainingHours < 2 && vm.remainingHours >= 0) {
            timeRemainingEl.classList.add('urgent');
        } else {
            timeRemainingEl.classList.remove('urgent');
        }
    }
    if (sleepTimeDisplay) sleepTimeDisplay.className = 'hero-time ' + vm.colorClass;
    var heroCard = document.querySelector('.unified-hero');
    if (heroCard) { heroCard.classList.remove('state-green', 'state-yellow', 'state-red'); heroCard.classList.add('state-' + vm.colorClass); }
    if (sleepQualityEl) {
        sleepQualityEl.className = 'hero-quality ' + vm.colorClass;
        sleepQualityEl.textContent = vm.qualityText;
    }

    // --- Blocking factors ---
    var blockingContainer = document.getElementById('blockingFactors');
    var blockingList = document.getElementById('blockingList');

    if (blockingContainer && blockingList) {
        var realBlockers = vm.blockingFactors.filter(function(f) { return f.type !== 'nicotine-advisory' && f.type !== 'circadian-warning'; });
        var advisoryItems = vm.blockingFactors.filter(function(f) { return f.type === 'nicotine-advisory' || f.type === 'circadian-warning'; });

        if (realBlockers.length > 0 && !(vm.ampOk && vm.caffOk && !vm.inForbiddenZone)) {
            blockingContainer.style.display = 'block';

            var html = realBlockers.map(function(f) {
                return '\n                    <div class="blocking-factor">\n                        <span>' + f.name + (f.note ? ' <span style="font-size: 0.8em; color: #6B635B;">(' + f.note + ')</span>' : '') + '</span>\n                        <span class="clears-at">Clears at ' + minutesToTimeWithDay(f.clearsAt) + '</span>\n                    </div>\n                    ';
            }).join('');

            if (advisoryItems.length > 0) {
                html += advisoryItems.map(function(f) {
                    return '\n                        <div class="blocking-factor" style="border-left-color: #C4923A; opacity: 0.85;">\n                            <span>' + f.name + ' <span style="font-size: 0.8em; color: #C4923A;">(' + f.note + ')</span></span>\n                            <span class="clears-at" style="color: #C4923A;">' + (f.type === 'nicotine-advisory' ? 'Quality modifier' : 'Advisory') + '</span>\n                        </div>\n                        ';
                }).join('');
            }

            blockingList.innerHTML = html;
        } else if (advisoryItems.length > 0) {
            blockingContainer.style.display = 'block';
            blockingList.innerHTML = advisoryItems.map(function(f) {
                return '\n                    <div class="blocking-factor" style="border-left-color: #C4923A; opacity: 0.85;">\n                        <span>' + f.name + ' <span style="font-size: 0.8em; color: #C4923A;">(' + f.note + ')</span></span>\n                        <span class="clears-at" style="color: #C4923A;">May affect sleep quality</span>\n                    </div>\n                    ';
            }).join('');
        } else {
            blockingContainer.style.display = 'none';
        }
    }

    // --- Delegate to other UI update functions ---
    updateFeelingsTimeline();
    updateNicotineDisplay();
    updateScenarios();
    renderGhostLoad();
    updateWorkoutPlan();
    drawGraph();
    updateAccordionSummaries();
    updateHeroProgressBar();
    updateStatusPillColors();
    updateVitCBadge();
    updateForecastLogic();
    if (typeof scInvRenderDashboard === 'function') scInvRenderDashboard();
    if (typeof renderDashSleepHistoryFull === 'function') renderDashSleepHistoryFull();
}

/**
 * Main recalculate entry point — runs every 5 seconds.
 * Wrapped in try/catch so a single error doesn't crash the app in a loop.
 */
function recalculate() {
    try {
        syncStateFromDOM();
        var vm = runCalculations();
        updateUI(vm);
        // Auto-save today's prediction (throttled — won't spam saveState)
        autoSavePrediction(vm.sleepTime);
    } catch (e) {
        console.error('[recalculate] Error:', e);
        var heroEl = document.getElementById('sleepTime');
        if (heroEl) heroEl.textContent = 'Calc Error';
    }
    // NOTE: Do NOT call saveState() here directly!
    // recalculate() is called every 5 seconds for live UI updates.
    // autoSavePrediction() handles its own throttling (10 min / 5 min change).
}

// ============================================
// STATUS ITEM HELPER
// ============================================

function updateStatusItem(indicatorId, isOk, current, threshold) {
    var indicator = document.getElementById(indicatorId);
    if (!indicator) return;

    var statusItem = indicator.closest('.status-item');
    if (!statusItem) return;

    indicator.textContent = isOk ? '\u2713' : '\u23f3';
    statusItem.className = 'status-item ' + (isOk ? 'ok' : 'blocking');
}

// ============================================
// WORKOUT STATUS DISPLAY
// ============================================

function updateWorkoutStatus() {
    var workoutItem = document.getElementById('workoutStatusItem');
    var workoutStatusEl = document.getElementById('workoutStatus');
    var workoutIndicatorEl = document.getElementById('workoutIndicator');

    if (!workoutItem || !workoutStatusEl || !workoutIndicatorEl) return;

    var wp = state.workoutPlan;

    if (wp && wp.applied) {
        workoutItem.style.display = 'flex';

        // Adenosine bonus converts to threshold: 15 min ~ +1.0mg
        var thresholdBonus = Math.min(3.0, (wp.adenosineBonus || 0) / 15);

        // Time-based penalties still apply (cortisol, thermal)
        var timeDelay = (wp.cortisolDelay || 0) + (wp.thermalDelay || 0);

        if (thresholdBonus > 0 && timeDelay === 0) {
            workoutStatusEl.textContent = '+' + thresholdBonus.toFixed(1) + 'mg threshold';
            workoutIndicatorEl.textContent = '\u2713';
            workoutItem.className = 'status-item ok';
            workoutItem.style.borderLeftColor = '#5E8A5E';
        } else if (thresholdBonus > 0 && timeDelay > 0) {
            workoutStatusEl.textContent = '+' + thresholdBonus.toFixed(1) + 'mg, +' + timeDelay + 'min delay';
            workoutIndicatorEl.textContent = '\u23f3';
            workoutItem.className = 'status-item ok';
            workoutItem.style.borderLeftColor = '#C4923A';
        } else if (timeDelay > 0) {
            workoutStatusEl.textContent = '+' + timeDelay + ' min delay';
            workoutIndicatorEl.textContent = '\u26a0\ufe0f';
            workoutItem.className = 'status-item blocking';
            workoutItem.style.borderLeftColor = '#C4923A';
        } else {
            workoutStatusEl.textContent = 'Neutral';
            workoutIndicatorEl.textContent = '\u2713';
            workoutItem.className = 'status-item ok';
            workoutItem.style.borderLeftColor = '#5E8A5E';
        }
    } else {
        workoutItem.style.display = 'none';
    }
}

// ============================================
// RECOMMENDATIONS ENGINE
// ============================================

function updateRecommendations(sleepTime, sleepHours, blockingFactors) {
    var container = document.getElementById('insRecommendations') || document.getElementById('recommendations');
    var recommendations = [];
    var now = getCurrentMinutes();
    var noon = 12 * 60;
    var sevenPM = 19 * 60;
    var eightPM = 20 * 60;
    var forbiddenZone = getForbiddenZone();
    var sleepGate = getSleepGate();
    var effectiveThreshold = getEffectiveThreshold();
    var sleepDebtBonus = calculateSleepDebtBonus();

    // CRITICAL: Hyperarousal warning (highest priority)
    if (isHyperarousalMode()) {
        recommendations.push({
            type: 'danger',
            icon: '\ud83d\udea8',
            title: 'HYPERAROUSAL MODE ACTIVE',
            text: 'You slept < 4 hours. Your HPA axis is flooding your system with cortisol and adrenaline. The normal "sleep debt helps you sleep" rule is REVERSED. You will feel exhausted but unable to sleep. Aggressive intervention required: NO screens after ' + minutesToTime(eightPM) + ', hot shower, meditation, and avoid ALL caffeine.'
        });
    }

    // Check if predicted sleep is in forbidden zone
    var forbiddenZoneBlocking = blockingFactors.find(function(f) { return f.type === 'circadian'; });
    if (forbiddenZoneBlocking) {
        var drugClearTime = (blockingFactors.find(function(f) { return f.type === 'drug'; }) || {}).clearsAt;
        if (drugClearTime) {
            recommendations.push({
                type: 'warning',
                icon: '\ud83c\udf19',
                title: 'Forbidden Zone Impact',
                text: 'Your drugs clear at ' + minutesToTime(drugClearTime > 24*60 ? drugClearTime - 24*60 : drugClearTime) + ', but this falls in your "Forbidden Zone" (' + minutesToTime(forbiddenZone.start > 24*60 ? forbiddenZone.start - 24*60 : forbiddenZone.start) + ' - ' + minutesToTime(forbiddenZone.end > 24*60 ? forbiddenZone.end - 24*60 : forbiddenZone.end) + '). You may feel a crash then get a "second wind." True sleep onset pushed to ' + minutesToTime(sleepTime > 24*60 ? sleepTime - 24*60 : sleepTime) + '.'
            });
        }
    }

    // Sleep debt notification (only show if NOT in hyperarousal mode)
    if (!isHyperarousalMode() && sleepDebtBonus >= 4.5) {
        recommendations.push({
            type: 'warning',
            icon: '\ud83d\ude34',
            title: 'Significant Sleep Debt',
            text: 'You\'re running on ' + state.hoursSleptLastNight + ' hours of sleep. Your effective threshold is now ' + effectiveThreshold.toFixed(1) + 'mg (up from ' + state.settings.sleepThreshold + 'mg). While this means you\'ll crash earlier, chronic sleep debt has serious health consequences.'
        });
    } else if (!isHyperarousalMode() && sleepDebtBonus > 0) {
        recommendations.push({
            type: 'info',
            icon: '\ud83d\udca4',
            title: 'Sleep Debt Detected',
            text: 'Running a ' + (8 - state.hoursSleptLastNight).toFixed(1) + ' hour deficit. Your threshold is elevated to ' + effectiveThreshold.toFixed(1) + 'mg, which will help you fall asleep earlier despite the stimulants.'
        });
    }

    // Sleep gate notification
    var sleepTimeNormalized = sleepTime < timeToMinutes(state.wakeTime) ? sleepTime + 24 * 60 : sleepTime;
    if (sleepTimeNormalized >= sleepGate.start && sleepTimeNormalized <= sleepGate.end) {
        recommendations.push({
            type: 'success',
            icon: '\u2728',
            title: 'Sleep Gate Alignment',
            text: 'Your projected sleep time falls within your optimal "Sleep Gate" window (' + minutesToTime(sleepGate.start > 24*60 ? sleepGate.start - 24*60 : sleepGate.start) + ' - ' + minutesToTime(sleepGate.end > 24*60 ? sleepGate.end - 24*60 : sleepGate.end) + '). This is when your body naturally wants to sleep.'
        });
    }

    // Caffeine cutoff warning
    if (now < noon && getCount(state.caffeine) === 0) {
        var timeUntilCutoff = noon - now;
        var hours = Math.floor(timeUntilCutoff / 60);
        var mins = timeUntilCutoff % 60;
        recommendations.push({
            type: 'info',
            icon: '\u2615',
            title: 'Caffeine Window Open',
            text: 'You have ' + hours + 'h ' + mins + 'm until noon caffeine cutoff. Each coffee after 12pm adds ~3 hours to your sleep window.'
        });
    }

    // If sleep is late, suggest interventions
    if (sleepHours < 7 && !state.modifiers.vitaminC.active) {
        recommendations.push({
            type: 'warning',
            icon: '\ud83c\udf4a',
            title: 'Consider Vitamin C Flush',
            text: 'Taking 1000mg Vitamin C at 5-6pm could reduce your half-life by 30%, potentially moving sleep ~45-60 min earlier.'
        });
    }

    if (sleepHours < 7 && !state.modifiers.sauna.active) {
        recommendations.push({
            type: 'warning',
            icon: '\ud83e\uddd6',
            title: 'Sauna Could Help',
            text: '15+ minutes in the sauna triggers parasympathetic rebound, potentially allowing sleep 30 min earlier.'
        });
    }

    // Good sleep projection
    if (sleepHours >= 8 && !forbiddenZoneBlocking) {
        recommendations.push({
            type: 'success',
            icon: '\u2728',
            title: 'On Track for Quality Sleep',
            text: 'Current trajectory gives you ' + sleepHours.toFixed(1) + ' hours. Cortisol will be low, muscle will be spared.'
        });
    }

    // Critical warning
    if (sleepHours < 6) {
        recommendations.push({
            type: 'danger',
            icon: '\ud83d\udea8',
            title: 'Critical Sleep Deficit',
            text: 'Only ' + sleepHours.toFixed(1) + ' hours possible. This triggers elevated cortisol, insulin resistance, and muscle catabolism. Tomorrow will be compromised.'
        });
    }

    // CHRONIC DEBT & CIRCADIAN PHASE ANALYSIS
    var circadianAnalysis = analyzeCircadianPhase();

    if (circadianAnalysis.phase === 'danger-delayed' || circadianAnalysis.phase === 'delayed') {
        recommendations.push({
            type: 'danger',
            icon: circadianAnalysis.icon,
            title: 'Circadian Phase: ' + circadianAnalysis.label,
            text: circadianAnalysis.recommendation.split('\n\n')[0]
        });
    } else if (circadianAnalysis.phase === 'extreme-early' || circadianAnalysis.phase === 'slightly-late') {
        recommendations.push({
            type: 'warning',
            icon: circadianAnalysis.icon,
            title: 'Circadian Phase: ' + circadianAnalysis.label,
            text: circadianAnalysis.recommendation.split('\n\n')[0]
        });
    }

    if (circadianAnalysis.avgSleep && circadianAnalysis.avgSleep < 5 && circadianAnalysis.dataPoints >= 3) {
        recommendations.push({
            type: 'danger',
            icon: '\ud83d\udcc9',
            title: 'Chronic Sleep Debt Detected',
            text: 'You\'re averaging only ' + circadianAnalysis.avgSleep.toFixed(1) + ' hours over the past ' + circadianAnalysis.dataPoints + ' days. This compounds cognitive impairment and raises baseline cortisol. Your body is running on adrenaline.'
        });
    } else if (circadianAnalysis.avgSleep && circadianAnalysis.avgSleep < 6.5 && circadianAnalysis.dataPoints >= 3) {
        recommendations.push({
            type: 'warning',
            icon: '\ud83d\udcca',
            title: 'Accumulating Sleep Debt',
            text: 'Averaging ' + circadianAnalysis.avgSleep.toFixed(1) + ' hours over ' + circadianAnalysis.dataPoints + ' days. The deficit compounds \u2013 you need a recovery night (9+ hours) to clear this debt.'
        });
    }

    // Consistency warning
    if (circadianAnalysis.stdDev && circadianAnalysis.stdDev > 120 && circadianAnalysis.dataPoints >= 3) {
        recommendations.push({
            type: 'warning',
            icon: '\ud83d\udd00',
            title: 'Inconsistent Sleep Schedule',
            text: 'Your wake times vary by over 2 hours. This "social jet lag" disrupts circadian rhythms as much as actual travel. Try to keep wake times within 1 hour, even on weekends.'
        });
    }

    // No meds logged
    if (getCount(state.medications) === 0) {
        recommendations.push({
            type: 'info',
            icon: '\ud83d\udc8a',
            title: 'No Medications Logged',
            text: 'Add your medication doses to see projected sleep time.'
        });
    }

    container.innerHTML = recommendations.map(function(rec) {
        return '\n                <div class="recommendation ' + rec.type + '">\n                    <div class="recommendation-title">' + rec.icon + ' ' + rec.title + '</div>\n                    <div class="recommendation-text">' + rec.text + '</div>\n                </div>\n            ';
    }).join('');
}

// ============================================
// EXPECTED FEELINGS TIMELINE
// ============================================

function updateFeelingsTimeline() {
    var container = document.getElementById('feelingsList');
    var feelings = [];
    var now = getCurrentMinutes();
    var sleepResult = calculateSleepTime();
    var sleepTime = sleepResult.sleepTime;
    var blockingFactors = sleepResult.blockingFactors;
    var forbiddenZone = getForbiddenZone();
    var sleepGate = getSleepGate();

    // Find when drugs crash
    var ampClear = findAmpClearTime();
    var caffClear = findCaffClearTime();
    var effectiveThreshold = getEffectiveThreshold();

    // Get total dose for context
    var medsArray = getValues(state.medications);
    var totalAmpDose = medsArray.reduce(function(sum, m) { return sum + m.dose; }, 0);

    if (totalAmpDose === 0) {
        container.innerHTML = '<div style="color: #6B635B; font-style: italic; padding: 8px;">Log medications to see your expected feelings timeline.</div>';
        return;
    }

    // Find peak time (about 2-4 hours after last dose for XR)
    if (medsArray.length > 0) {
        var lastDoseTime = Math.max.apply(null, medsArray.map(function(m) { return timeToMinutes(m.time); }));
        var peakTime = lastDoseTime + 180; // ~3 hours after dose

        if (peakTime > now && peakTime < sleepTime) {
            feelings.push({
                time: peakTime,
                emoji: '\u26a1',
                label: 'Peak Focus',
                detail: 'Maximum drug effect - best for demanding tasks',
                color: '#5E7A8A'
            });
        }

        // Second wave for XR (T+4 from dose)
        var secondWaveTime = lastDoseTime + 240;
        if (secondWaveTime > now && secondWaveTime < sleepTime && secondWaveTime !== peakTime) {
            feelings.push({
                time: secondWaveTime,
                emoji: '\ud83d\udd04',
                label: 'Second Release',
                detail: 'XR second layer kicks in',
                color: '#6B7C5E'
            });
        }
    }

    // Crash point
    var today = getLocalDateString();
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = getLocalDateString(yesterday);

    var relevantMeds = medsArray.filter(function(m) { return m.date === today; });
    if (state.allNighterMode && relevantMeds.length === 0) {
        relevantMeds = medsArray.filter(function(m) { return m.date === yesterdayStr; });
    }

    if (relevantMeds.length > 0) {
        var latestDoseTime = -Infinity;
        relevantMeds.forEach(function(m) {
            var doseMinutes = timeToMinutes(m.time);
            if (m.date === yesterdayStr) {
                doseMinutes = doseMinutes - (24 * 60);
            }
            if (doseMinutes > latestDoseTime) {
                latestDoseTime = doseMinutes;
            }
        });

        var crashTime = latestDoseTime + (6 * 60);
        var crashTimeNormalized = crashTime < 0 ? crashTime + (24 * 60) : crashTime;

        if (crashTimeNormalized > now && crashTimeNormalized < sleepTime) {
            feelings.push({
                time: crashTimeNormalized,
                emoji: '\ud83d\udcc9',
                label: 'Crash Begins',
                detail: 'Amphetamine dropping fast - fatigue onset',
                color: '#C4923A'
            });
        }
    }

    // Forbidden Zone feelings
    var fzStart = forbiddenZone.start > 24 * 60 ? forbiddenZone.start - 24 * 60 : forbiddenZone.start;
    var fzEnd = forbiddenZone.end > 24 * 60 ? forbiddenZone.end - 24 * 60 : forbiddenZone.end;

    var sleepTimeNorm = sleepTime > 24 * 60 ? sleepTime - 24 * 60 : sleepTime;
    if (fzStart > now && fzStart < sleepTimeNorm) {
        feelings.push({
            time: fzStart,
            emoji: '\u26a0\ufe0f',
            label: 'Second Wind',
            detail: 'Circadian alerting signal - will feel awake despite exhaustion',
            color: '#B85C5C'
        });
    }

    // Sleep Gate opening
    var sgStart = sleepGate.start > 24 * 60 ? sleepGate.start - 24 * 60 : sleepGate.start;
    if (sgStart > now && sgStart < sleepTimeNorm) {
        feelings.push({
            time: sgStart,
            emoji: '\ud83c\udf19',
            label: 'Sleep Gate Opens',
            detail: 'Melatonin rising - body ready for sleep',
            color: '#5E8A5E'
        });
    }

    // Final sleep
    if (sleepTime > now) {
        var sleepTimeDisplay = sleepTime;
        if (sleepTime > 24 * 60) sleepTimeDisplay = sleepTime - 24 * 60;

        feelings.push({
            time: sleepTimeDisplay,
            emoji: '\ud83d\ude34',
            label: 'Sleep Onset',
            detail: 'Projected time you\'ll fall asleep',
            color: '#5E7A8A'
        });
    }

    // Sort by time
    feelings.sort(function(a, b) {
        var aTime = a.time;
        var bTime = b.time;
        if (aTime < 6 * 60) aTime += 24 * 60;
        if (bTime < 6 * 60) bTime += 24 * 60;
        return aTime - bTime;
    });

    // Render
    if (feelings.length === 0) {
        container.innerHTML = '<div style="color: #6B635B; font-style: italic; padding: 8px;">All events have passed or no data available.</div>';
        return;
    }

    container.innerHTML = feelings.map(function(f) {
        return '\n                <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 8px; border-left: 3px solid ' + f.color + ';">\n                    <div style="font-size: 1.4em;">' + f.emoji + '</div>\n                    <div style="flex: 1;">\n                        <div style="display: flex; justify-content: space-between; align-items: center;">\n                            <span style="font-weight: 600; color: ' + f.color + ';">' + f.label + '</span>\n                            <span style="font-size: 0.9em; color: #2C2825; font-variant-numeric: tabular-nums;">' + minutesToTime(f.time) + '</span>\n                        </div>\n                        <div style="font-size: 0.8em; color: #6B635B; margin-top: 2px;">' + f.detail + '</div>\n                    </div>\n                </div>\n            ';
    }).join('');
}

// ============================================
// INITIALIZATION
// ============================================

function scheduleEndOfDayLogicSave() {
    var now = new Date();
    var midnight = new Date(now);
    midnight.setHours(23, 59, 59, 0);
    var msUntilMidnight = midnight - now;
    if (msUntilMidnight > 0) {
        setTimeout(function() {
            saveDailyLogicLog();
            saveState();
        }, msUntilMidnight);
    }
}

function init() {
    // Add sidebar layout class to body
    document.body.classList.add('has-sc-sidebar');

    loadState();

    // Clean up old medications to prevent phantom loads
    cleanupOldMedications();

    // Initialize Firebase for cloud sync
    initFirebase();

    // Set input values from state (safely)
    safeSetValue('wakeTime', state.wakeTime);
    safeSetValue('hoursSlept', state.hoursSleptLastNight);
    safeSetValue('ampHalfLife', state.settings.ampHalfLife);
    safeSetValue('sleepThreshold', state.settings.sleepThreshold);
    safeSetValue('caffHalfLife', state.settings.caffHalfLife);
    safeSetValue('caffThreshold', state.settings.caffThreshold);
    safeSetValue('weight', state.settings.weight);
    safeSetValue('sleepTarget', state.settings.sleepTarget ?? 8);
    safeSetValue('vitaminCTime', state.modifiers.vitaminC.time || '17:00');
    safeSetValue('saunaTime', state.modifiers.sauna.time || '18:00');

    // Render existing entries
    renderMedEntries();
    renderCaffeineEntries();
    renderSleepIntelligence();

    // Initialize today's sleep in calendar
    updateTodaySleepHistory();

    // Update All-Nighter Mode UI
    updateAllNighterUI();

    // Initialize workout planner
    initWorkoutPlanner();

    // Restore workout plan UI if previously applied
    if (state.workoutPlan && state.workoutPlan.applied) {
        restoreWorkoutPlanUI();
    }

    // Initial calculation
    recalculate();

    // Save projectedSleepTime to Firebase and snapshot today's sleep log
    setTimeout(function() {
        if (state.projectedSleepTime) {
            saveSleepDayLog();
            saveState();
        }
    }, 1000);

    // Setup graph tooltip
    setupGraphTooltip();

    // Auto-populate feedback from sleep history
    setTimeout(function() {
        autoPopulateFeedback();
    }, 2000);

    // Migrate history entries, sleep daily logs, and render accuracy
    setTimeout(function() {
        migrateHistoryEntries();
        migrateSleepDailyLogs();
        migrateSleepDailyLogsV3();
        cleanupPhantomSleepLogs();
        renderSleepIntelligence();
    }, 2500);

    // Update every 5 seconds
    setInterval(recalculate, 5000);

    // Schedule end-of-day logic log save
    scheduleEndOfDayLogicSave();

    // Redraw graphs on resize
    window.addEventListener('resize', function() {
        drawGraph();
    });

    // Initialize Unified View (accordions, modifiers, recent nights)
    initUnifiedView();
}

// ============================================
// UNIFIED VIEW — FOCUS MODE STUBS (no-ops for safety)
// ============================================

function setViewMode() {}
function renderFocusMode() {}
function drawFocusGraph() {}

// ============================================
// ACCORDION MANAGEMENT
// ============================================

function toggleAccordion(sectionName) {
    var section = document.querySelector('.accordion-section[data-section="' + sectionName + '"]');
    if (section) {
        section.classList.toggle('open');
        var openSections = JSON.parse(localStorage.getItem('stimCalcAccordions') || '{}');
        openSections[sectionName] = section.classList.contains('open');
        safeLocalStorageSet('stimCalcAccordions', JSON.stringify(openSections));
    }
}

function restoreAccordionStates() {
    var openSections = JSON.parse(localStorage.getItem('stimCalcAccordions') || '{}');
    var defaults = {
        sleep: true, meds: false, caffeine: false, modifiers: false,
        nicotine: false, workout: false, circadian: false,
        sleepIntel: true,
        recs: false, forecast: false, settings: false
    };
    var merged = Object.assign({}, defaults, openSections);

    Object.entries(merged).forEach(function(entry) {
        var name = entry[0];
        var isOpen = entry[1];
        var section = document.querySelector('.accordion-section[data-section="' + name + '"]');
        if (section) {
            section.classList.toggle('open', isOpen);
        }
    });
}

function updateAccordionSummaries() {
    // Sleep summary
    var sleepSummary = document.getElementById('sleepAccordionSummary');
    if (sleepSummary) {
        sleepSummary.textContent = state.hoursSleptLastNight + 'h | Wake ' + formatTime12(state.wakeTime);
    }

    // Meds summary
    var medsSummary = document.getElementById('medsAccordionSummary');
    if (medsSummary) {
        var medCount = getCount(state.medications);
        if (medCount === 0) {
            medsSummary.textContent = 'No meds logged';
            medsSummary.style.color = '#9C948B';
        } else {
            var totalDose = getValues(state.medications).reduce(function(sum, m) { return sum + m.dose; }, 0);
            medsSummary.textContent = medCount + (medCount === 1 ? ' dose' : ' doses') + ' \u2022 ' + totalDose + 'mg';
            medsSummary.style.color = '#6B7C5E';
        }
    }

    // Caffeine summary
    var caffSummary = document.getElementById('caffeineAccordionSummary');
    if (caffSummary) {
        var caffCount = getCount(state.caffeine);
        if (caffCount === 0) {
            caffSummary.textContent = 'No caffeine';
            caffSummary.style.color = '#9C948B';
        } else {
            var totalCaff = getValues(state.caffeine).reduce(function(sum, c) { return sum + c.amount; }, 0);
            caffSummary.textContent = totalCaff + 'mg' + (caffCount > 1 ? ' \u2022 ' + caffCount + ' drinks' : '');
            caffSummary.style.color = '#C4923A';
        }
    }

    // Modifiers summary
    var modSummary = document.getElementById('modifiersAccordionSummary');
    if (modSummary) {
        var active = [];
        if (state.modifiers.vitaminC && state.modifiers.vitaminC.active) active.push('VitC');
        if (state.modifiers.heavyLift && state.modifiers.heavyLift.active) active.push('Lifting');
        if (state.modifiers.sauna && state.modifiers.sauna.active) active.push('Sauna');
        if (state.allNighterMode) active.push('All-Nighter');
        modSummary.textContent = active.length > 0 ? active.join(', ') : 'None active';
        modSummary.style.color = active.length > 0 ? '#5E8A5E' : '#9C948B';
    }

    // Nicotine summary
    var nicSummary = document.getElementById('nicotineAccordionSummary');
    if (nicSummary) {
        if (state.nicotine && state.nicotine.active) {
            nicSummary.textContent = state.nicotine.type === 'vape' ? 'Vape hit logged' : 'Pouch logged';
            nicSummary.style.color = '#C97070';
        } else {
            nicSummary.textContent = 'Not tracked';
            nicSummary.style.color = '#9C948B';
        }
    }

    // Workout summary
    var workoutSummary = document.getElementById('workoutAccordionSummary');
    if (workoutSummary) {
        if (state.workoutPlan && state.workoutPlan.applied) {
            workoutSummary.textContent = 'Applied (' + (state.workoutPlan.type || 'workout') + ')';
            workoutSummary.style.color = '#5E8A5E';
        } else {
            workoutSummary.textContent = 'Not planned';
            workoutSummary.style.color = '#9C948B';
        }
    }

    // Circadian summary
    var circSummary = document.getElementById('circadianAccordionSummary');
    if (circSummary) {
        var now = getCurrentMinutes();
        if (isInForbiddenZone(now)) {
            circSummary.textContent = 'Forbidden Zone';
            circSummary.style.color = '#B85C5C';
        } else if (isInSleepGate(now)) {
            circSummary.textContent = 'Sleep Gate Open';
            circSummary.style.color = '#5E8A5E';
        } else {
            circSummary.textContent = 'Normal';
            circSummary.style.color = '#9C948B';
        }
    }

    // Sleep Intelligence summary
    if (typeof updateSleepIntelSummary === 'function') {
        updateSleepIntelSummary();
    }

    // Update has-content indicators on accordion sections
    var sections = {
        meds: getCount(state.medications) > 0,
        caffeine: getCount(state.caffeine) > 0,
        modifiers: (state.modifiers.vitaminC && state.modifiers.vitaminC.active) ||
                   (state.modifiers.heavyLift && state.modifiers.heavyLift.active) ||
                   (state.modifiers.sauna && state.modifiers.sauna.active) ||
                   state.allNighterMode,
        nicotine: state.nicotine && state.nicotine.active,
        workout: state.workoutPlan && state.workoutPlan.applied
    };
    Object.keys(sections).forEach(function(key) {
        var el = document.querySelector('.accordion-section[data-section="' + key + '"]');
        if (el) {
            if (sections[key]) {
                el.classList.add('has-content');
            } else {
                el.classList.remove('has-content');
            }
        }
    });
}

function updateHeroProgressBar() {
    var bar = document.getElementById('heroProgressFill');
    if (!bar) return;
    var wakeMinutes = timeToMinutes(state.wakeTime);
    var now = getCurrentMinutes();
    var sleepResult = calculateSleepTime();
    var st = sleepResult.sleepTime;
    var normalizedNow = now < wakeMinutes ? now + 24 * 60 : now;
    var normalizedSleep = st < wakeMinutes ? st + 24 * 60 : st;
    var totalDay = normalizedSleep - wakeMinutes;
    var elapsed = normalizedNow - wakeMinutes;
    var progress = totalDay > 0 ? Math.min(100, Math.max(0, (elapsed / totalDay) * 100)) : 0;
    bar.style.width = progress + '%';
}

function updateStatusPillColors() {
    var now = getCurrentMinutes();
    var ampLoad = calculateAmpLoad(now);
    var caffLoad = calculateCaffLoad(now);
    var threshold = getEffectiveThreshold();
    var caffThreshold = state.settings.caffThreshold;

    var ampPill = document.getElementById('ampStatusPill');
    var caffPill = document.getElementById('caffStatusPill');
    if (ampPill) {
        ampPill.classList.toggle('pill-safe', ampLoad < threshold);
        ampPill.classList.toggle('pill-danger', ampLoad >= threshold);
    }
    if (caffPill) {
        caffPill.classList.toggle('pill-safe', caffLoad < caffThreshold);
        caffPill.classList.toggle('pill-danger', caffLoad >= caffThreshold);
    }
}

function renderRecentNights() {
    var container = document.getElementById('recentNightsContainer');
    if (!container) return;

    var today = new Date();
    var html = '';
    for (var i = 1; i <= 7; i++) {
        var date = new Date(today);
        date.setDate(date.getDate() - i);
        var dateStr = getLocalDateString(date);
        var entry = state.sleepHistory[dateStr];
        var hours = null;
        if (entry) {
            hours = typeof entry === 'number' ? entry : (entry.hoursSlept || null);
        }
        var dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        var color = hours === null ? 'rgba(0,0,0,0.03)' :
            hours >= 6.5 ? 'rgba(94,138,94,0.15)' :
            hours >= 4.5 ? 'rgba(196,146,58,0.15)' : 'rgba(184,92,92,0.15)';
        var borderColor = hours === null ? 'rgba(0,0,0,0.08)' :
            hours >= 6.5 ? 'rgba(94,138,94,0.3)' :
            hours >= 4.5 ? 'rgba(196,146,58,0.3)' : 'rgba(184,92,92,0.3)';
        html += '<div class="recent-night-pill" onclick="openSleepEditModal(\'' + dateStr + '\')" style="background:' + color + '; border-color:' + borderColor + ';">' +
            dayName + (hours !== null ? ' ' + hours + 'h' : ' --') + '</div>';
    }
    container.innerHTML = html;
}

function initUnifiedView() {
    restoreAccordionStates();
    restoreModifierUI();
    renderRecentNights();
    updateAccordionSummaries();
}

// ============================================
// SIDEBAR NAVIGATION
// ============================================

function scToggleCalibration() {
    // Calibration now always visible — no-op for backward compat
}

function toggleModifierChip(modName) {
    var chipMap = { vitaminC: 'vitCChip', heavyLift: 'liftChip', sauna: 'saunaChip' };
    var checkboxMap = { vitaminC: 'vitCToggle', heavyLift: 'liftToggle', sauna: 'saunaToggle' };

    var cb = document.getElementById(checkboxMap[modName]);
    if (cb) {
        cb.checked = !cb.checked;
        toggleModifier(cb, modName);
    }

    var chip = document.getElementById(chipMap[modName]);
    if (chip) chip.classList.toggle('active', cb && cb.checked);

    if (modName === 'vitaminC') {
        var row = document.getElementById('vitCTimeRow');
        if (row) row.style.display = (cb && cb.checked) ? 'flex' : 'none';
    } else if (modName === 'sauna') {
        var row = document.getElementById('saunaTimeRow');
        if (row) row.style.display = (cb && cb.checked) ? 'flex' : 'none';
    }
}

function scNavigate(page) {
    currentPage = page;

    // Update sidebar active states
    document.querySelectorAll('.sc-sidebar-item[data-page]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update breadcrumb
    var bc = document.getElementById('scBreadcrumb');
    if (bc) {
        var labels = {
            dashboard: 'Dashboard',
            modifiers: 'Modifiers & Timing',
            calendar: 'Calendar',
            insights: 'Insights',
            accuracy: 'Accuracy',
            settings: 'Tools',
            inventory: 'Medication Inventory'
        };
        bc.textContent = '\u203A ' + (labels[page] || page);
    }

    // Show/hide pages
    document.querySelectorAll('.sc-page').forEach(function(p) {
        p.classList.remove('active');
    });
    var targetId = 'scPage' + page.charAt(0).toUpperCase() + page.slice(1);
    var target = document.getElementById(targetId);
    if (target) target.classList.add('active');

    // Trigger renders for the target page
    if (page === 'calendar') {
        if (typeof renderSleepCalendarMonth === 'function') renderSleepCalendarMonth();
        if (typeof renderHistory === 'function') renderHistory();
        if (typeof drawSleepPerformanceGraph === 'function') drawSleepPerformanceGraph();
        if (typeof renderSleepCalendar === 'function') renderSleepCalendar();
    } else if (page === 'insights') {
        if (typeof renderInsightsTab === 'function') renderInsightsTab();
        if (typeof updateRecommendations === 'function') {
            try {
                var vm = runCalculations();
                updateRecommendations(vm.sleepTime, vm.sleepHours, vm.blockingFactors);
            } catch(e) { console.error('Recommendations error:', e); }
        }
    } else if (page === 'accuracy') {
        if (typeof renderAccuracyTab === 'function') renderAccuracyTab();
    } else if (page === 'dashboard') {
        recalculate();
        if (typeof drawGraph === 'function') drawGraph();
        if (typeof renderSleepCalendar === 'function') renderSleepCalendar();
        if (typeof scInvRenderDashboard === 'function') scInvRenderDashboard();
        if (typeof renderDashSleepHistoryFull === 'function') renderDashSleepHistoryFull();
    } else if (page === 'inventory') {
        if (typeof scInvRender === 'function') scInvRender();
    }

    // Auto-close mobile sidebar
    var sidebar = document.getElementById('scSidebar');
    if (sidebar && sidebar.classList.contains('open')) scToggleSidebar();

    // Scroll to top of content
    var mainPanel = document.getElementById('scMainPanel');
    if (mainPanel) mainPanel.scrollTop = 0;
}

function scToggleSidebar() {
    var sidebar = document.getElementById('scSidebar');
    var backdrop = document.getElementById('scSidebarBackdrop');
    if (!sidebar) return;
    var isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isOpen);
    if (backdrop) backdrop.classList.toggle('open', !isOpen);
    document.body.classList.toggle('sc-sidebar-open', !isOpen);
}

// ============================================
// METRICS ROW UPDATES
// ============================================

function updateMetricsRow(vm) {
    if (!vm) return;

    var el;

    // Sleep time
    el = document.getElementById('scMetricSleep');
    if (el) {
        el.textContent = minutesToTime(vm.predictedSleepMinutes ?? vm.displaySleepTime);
        el.style.color = vm.colorClass === 'green' ? 'var(--success)' :
            vm.colorClass === 'yellow' ? 'var(--warning)' : 'var(--destructive)';
    }

    // Remaining time
    el = document.getElementById('scMetricRemaining');
    if (el) {
        var hrs = vm.remainingHours ?? 0;
        var mins = vm.remainingMins ?? 0;
        el.textContent = hrs + 'h ' + mins + 'm';
        if (hrs < 2) el.style.color = 'var(--destructive)';
        else el.style.color = '';
    }

    // Amp load
    el = document.getElementById('scMetricAmp');
    if (el) {
        el.textContent = vm.currentAmpLoad.toFixed(1);
        el.style.color = vm.ampOk ? 'var(--success)' : 'var(--warning)';
    }

    // Caff load
    el = document.getElementById('scMetricCaff');
    if (el) {
        el.textContent = vm.currentCaffLoad.toFixed(1);
        el.style.color = vm.caffOk ? 'var(--success)' : 'var(--warning)';
    }

    // Quality
    el = document.getElementById('scMetricQuality');
    if (el) {
        var qualityLabel = vm.sleepHours >= 8 ? 'Good' :
            vm.sleepHours >= 6 ? 'Fair' : 'Poor';
        el.textContent = qualityLabel;
        el.style.color = vm.colorClass === 'green' ? 'var(--success)' :
            vm.colorClass === 'yellow' ? 'var(--warning)' : 'var(--destructive)';
    }

    // Update sidebar badges
    updateSidebarBadges();
}

// ============================================
// SIDEBAR BADGE UPDATES
// ============================================

function updateSidebarBadges() {
    // Meds badge
    var medsBadge = document.getElementById('scMedsBadge');
    if (medsBadge) {
        var medCount = state && state.medications ? Object.keys(state.medications).length : 0;
        medsBadge.textContent = medCount > 0 ? medCount : '';
        medsBadge.style.display = medCount > 0 ? 'flex' : 'none';
    }

    // Caffeine badge
    var caffBadge = document.getElementById('scCaffBadge');
    if (caffBadge) {
        var caffCount = state && state.caffeine ? Object.keys(state.caffeine).length : 0;
        caffBadge.textContent = caffCount > 0 ? caffCount : '';
        caffBadge.style.display = caffCount > 0 ? 'flex' : 'none';
    }

    // Modifiers badge
    var modBadge = document.getElementById('scModBadge');
    if (modBadge) {
        var activeCount = 0;
        if (state && state.modifiers) {
            if (state.modifiers.vitaminC && state.modifiers.vitaminC.active) activeCount++;
            if (state.modifiers.sauna && state.modifiers.sauna.active) activeCount++;
            if (state.modifiers.heavyLift && state.modifiers.heavyLift.active) activeCount++;
        }
        if (state && state.nicotine && state.nicotine.active) activeCount++;
        if (state && state.workoutPlan && state.workoutPlan.applied) activeCount++;
        modBadge.textContent = activeCount > 0 ? activeCount : '';
        modBadge.style.display = activeCount > 0 ? 'flex' : 'none';
    }
}

// ============================================
// FOCUS MODE NO-OP STUBS
// Prevent "undefined function" errors from any remaining references
// ============================================

function focusConfirmMeds() {}
function focusEditMeds() {}
function focusAddCaffeine() {}
function focusRemoveCaffeine() {}
function updateFocusMedsStatus() {}
function updateFocusCoffeeStatus() {}
function renderFocusCaffeineList() {}
function initFocusMode() {}

// ============================================
// EVENT REGISTRATION — MUST BE LAST
// ============================================

document.addEventListener('DOMContentLoaded', init);
