// ============================================
// UI SECTIONS (Phase 4)
// Modifiers, All-Nighter, Workout, What-If, Forecast
// ============================================

// ============================================
// MODIFIERS / VITAMIN C UI
// FIX 7: Only the unified view version of toggleModifier is kept
// ============================================

// Override toggleModifier for unified view checkboxes
function toggleModifier(checkbox, modifierName) {
    const KNOWN_MODIFIERS = ['vitaminC', 'workout'];
    if (!KNOWN_MODIFIERS.includes(modifierName)) return;
    if (!state.modifiers[modifierName]) {
        state.modifiers[modifierName] = { active: false };
    }
    state.modifiers[modifierName].active = checkbox.checked;

    if (modifierName === 'vitaminC') {
        const timeRow = document.getElementById('vitCTimeRow');
        if (timeRow) timeRow.style.display = checkbox.checked ? 'flex' : 'none';
        if (checkbox.checked && !state.modifiers.vitaminC.date) {
            state.modifiers.vitaminC.date = getLocalDateString();
        }
        updateVitCBadge();
    } else if (modifierName === 'workout') {
        const timeRow = document.getElementById('workoutTimeRow');
        if (timeRow) timeRow.style.display = checkbox.checked ? 'flex' : 'none';
        if (checkbox.checked) {
            state.modifiers.workout.date = getLocalDateString(new Date());
            const endEl = document.getElementById('workoutEndTime');
            if (endEl) state.modifiers.workout.endTime = endEl.value;
            const intenseEl = document.getElementById('workoutIntense');
            if (intenseEl) state.modifiers.workout.intense = intenseEl.checked;
        }
    }

    recalculate();
    saveState();
}

// What does this chip actually do to TONIGHT's prediction?
// Computed by toggling the modifier off in-memory and diffing the two sleep times.
function getModifierEffectReadout(modName) {
    const mod = state.modifiers && state.modifiers[modName];
    if (!mod || !mod.active) return '';
    if (modName === 'vitaminC') {
        // getVitaminCStatus() returns a STATUS STRING ('inactive'|'future'|'expired'|'effective'),
        // not the {expired, hoursAgo} object the original spec assumed. Adapt to the string,
        // and reconstruct hoursAgo from the same math getVitaminCStatus() uses internally.
        if (getVitaminCStatus() === 'expired') {
            const vitCDate = sanitizeModifierDate(mod.date);
            const dayOffset = Math.round((parseLocalDate(vitCDate) - parseLocalDate(getLocalDateString())) / 86400000);
            const vitCMin = timeToMinutes(mod.time) + dayOffset * 1440;
            const hoursAgo = Math.round((getCurrentMinutes() - vitCMin) / 60);
            return 'expired (taken ' + hoursAgo + 'h ago)';
        }
    }
    const withRes = calculateSleepTime();
    let withoutRes;
    mod.active = false;
    try {
        withoutRes = calculateSleepTime();
    } finally {
        mod.active = true;
    }
    const delta = computeSleepDelta(withRes.sleepTime, withoutRes.sleepTime);
    if (delta === 0) {
        const bf = withRes.bindingFactor;
        if (bf && bf !== 'adderall' && modName === 'vitaminC') {
            return '\u00b10 \u2014 ' + bf + ' is the limiting factor tonight, not Adderall';
        }
        return '\u00b10 tonight';
    }
    const sign = delta < 0 ? '\u2212' : '+';
    return 'tonight: ' + sign + Math.abs(delta) + ' min';
}

function updateModifierTimeInputs() {
    const vitCGroup = document.getElementById('vitCTimeRow');

    const showVitC = state.modifiers.vitaminC.active;

    if (vitCGroup) vitCGroup.style.display = showVitC ? 'flex' : 'none';

    // Update Vitamin C date select to match state
    const vitCDateEl = document.getElementById('vitaminCDate');
    if (vitCDateEl && state.modifiers.vitaminC.date) {
        const today = getLocalDateString();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getLocalDateString(tomorrow);
        if (state.modifiers.vitaminC.date === tomorrowStr) {
            vitCDateEl.value = 'tomorrow';
        } else {
            vitCDateEl.value = 'today';
        }
    }

    // Show/hide VitC status badge
    updateVitCBadge();
}

function updateVitaminCDate() {
    const vitCDateEl = document.getElementById('vitaminCDate');
    if (vitCDateEl) {
        const val = vitCDateEl.value;
        if (val === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            state.modifiers.vitaminC.date = getLocalDateString(tomorrow);
        } else {
            state.modifiers.vitaminC.date = getLocalDateString();
        }
        saveState();
    }
}

function updateVitCBadge() {
    const badge = document.getElementById('vitCBadge');
    if (!badge) return;
    if (!state.modifiers.vitaminC || !state.modifiers.vitaminC.active) {
        badge.style.display = 'none';
        return;
    }
    const status = getVitaminCStatus();
    badge.style.display = 'inline-block';
    if (status === 'effective') {
        badge.textContent = 'ACTIVE';
        badge.style.background = 'rgba(94,138,94,0.2)';
        badge.style.color = '#5E8A5E';
    } else if (status === 'expired') {
        badge.textContent = 'EXPIRED';
        badge.style.background = 'rgba(184,92,92,0.2)';
        badge.style.color = '#B85C5C';
    } else if (status === 'future') {
        badge.textContent = 'SCHEDULED';
        badge.style.background = 'rgba(94,122,138,0.2)';
        badge.style.color = '#5E7A8A';
    }
}

function restoreModifierUI() {
    // Restore VitC toggle
    const vitCToggle = document.getElementById('vitCToggle');
    if (vitCToggle && state.modifiers.vitaminC && state.modifiers.vitaminC.active) {
        vitCToggle.checked = true;
        const vitCTimeRow = document.getElementById('vitCTimeRow');
        if (vitCTimeRow) vitCTimeRow.style.display = 'flex';
        const vitCTimeEl = document.getElementById('vitaminCTime');
        if (vitCTimeEl) vitCTimeEl.value = state.modifiers.vitaminC.time || '17:00';
        // Restore VitC date (handle past/today/tomorrow)
        const vitCDateEl = document.getElementById('vitaminCDate');
        if (vitCDateEl && state.modifiers.vitaminC.date) {
            const today = getLocalDateString();
            const tomorrow = getLocalDateString(new Date(Date.now() + 86400000));
            if (state.modifiers.vitaminC.date === today) {
                vitCDateEl.value = 'today';
            } else if (state.modifiers.vitaminC.date === tomorrow) {
                vitCDateEl.value = 'tomorrow';
            } else {
                // Past date — expired, reset to today
                vitCDateEl.value = 'today';
                state.modifiers.vitaminC.date = today;
            }
        }
        // Show VitC status badge
        updateVitCBadge();
    }

    // Restore workout toggle
    const workoutToggle = document.getElementById('workoutToggle');
    if (workoutToggle && state.modifiers.workout && state.modifiers.workout.active) {
        workoutToggle.checked = true;
        const workoutTimeRow = document.getElementById('workoutTimeRow');
        if (workoutTimeRow) workoutTimeRow.style.display = 'flex';
        const workoutEndTime = document.getElementById('workoutEndTime');
        if (workoutEndTime) workoutEndTime.value = state.modifiers.workout.endTime || '18:00';
        const workoutIntense = document.getElementById('workoutIntense');
        if (workoutIntense) workoutIntense.checked = !!state.modifiers.workout.intense;
    }

    // Sync chip visuals with checkbox states
    var chipMap = { vitaminC: 'vitCChip', workout: 'workoutChip' };
    var checkboxMap = { vitaminC: 'vitCToggle', workout: 'workoutToggle' };
    Object.keys(chipMap).forEach(function(mod) {
        var chip = document.getElementById(chipMap[mod]);
        var cb = document.getElementById(checkboxMap[mod]);
        if (chip && cb) chip.classList.toggle('active', cb.checked);
    });
}

// ============================================
// ALL-NIGHTER MODE
// ============================================

function toggleAllNighterMode() {
    state.allNighterMode = !state.allNighterMode;
    state._dataLoaded = true;
    updateAllNighterUI();
    renderGhostLoad();
    recalculate();
    saveState();

    if (state.allNighterMode) {
        showToast('🌙 All-Nighter Mode ON - 48-hour view with yesterday\'s doses');
    } else {
        showToast('☀️ All-Nighter Mode OFF - Normal 24-hour view');
    }
}

function updateAllNighterUI() {
    const btn = document.getElementById('allNighterToggleBtn');
    const icon = document.getElementById('allNighterIcon');
    const text = document.getElementById('allNighterText');
    const hint = document.getElementById('allNighterHint');

    if (state.allNighterMode) {
        if (btn) { btn.classList.add('sc-allnighter-chip', 'active'); btn.style.background = '#6B7C5E'; btn.style.borderColor = '#6B7C5E'; }
        if (icon) icon.textContent = '🔥';
        if (text) text.textContent = 'All-Nighter Mode: ON';
        if (hint) hint.style.display = 'block';
    } else {
        if (btn) { btn.classList.add('sc-allnighter-chip'); btn.classList.remove('active'); btn.style.background = '#F5F2ED'; btn.style.borderColor = 'rgba(0,0,0,0.12)'; }
        if (icon) icon.textContent = '🌙';
        if (text) text.textContent = 'All-Nighter Mode: OFF';
        if (hint) hint.style.display = 'none';
    }
}

// Render the ghost load section for All-Nighter Mode
function renderGhostLoad() {
    const section = document.getElementById('ghostLoadSection');
    const medEntriesEl = document.getElementById('ghostMedEntries');
    const totalEl = document.getElementById('ghostLoadTotal');

    if (!section || !medEntriesEl || !totalEl) return;

    if (!state.allNighterMode) {
        section.style.display = 'none';
        return;
    }

    const yesterdayMeds = getYesterdayMedications();
    const yesterdayCaff = getYesterdayCaffeine();

    if (yesterdayMeds.length === 0 && yesterdayCaff.length === 0) {
        section.style.display = 'block';
        medEntriesEl.innerHTML = '<div style="color: #6B635B; font-style: italic;">No data from yesterday found. Doses need a date stamp to carry over.</div>';
        totalEl.innerHTML = '';
        return;
    }

    let medsHtml = '';
    let totalAmpRemaining = 0;
    let totalCaffRemaining = 0;

    // Medications from yesterday — use engine total for accuracy
    if (yesterdayMeds.length > 0) {
        medsHtml += '<div style="margin-bottom: 10px;"><strong style="color: #6B7C5E;">💊 Amphetamine:</strong></div>';

        yesterdayMeds.forEach(med => {
            const doseTime = timeToMinutes(med.time);
            const remaining = calculateYesterdayDoseRemaining(med.dose, doseTime, state.settings.ampHalfLife);
            totalAmpRemaining += remaining;
            medsHtml += `<div style="margin-left: 15px; margin-bottom: 4px; opacity: 0.8;">
                ${med.dose}mg XR @ ${formatTime12(med.time)} → <span style="color: #5E8A5E;">~${remaining.toFixed(1)}mg remaining</span>
            </div>`;
        });
        medsHtml += `<div style="margin-left: 15px; margin-top: 6px; font-weight: 600; color: #C4923A;">
            Total Ghost Amp: ${totalAmpRemaining.toFixed(1)}mg
        </div>`;
    }

    // Caffeine from yesterday
    if (yesterdayCaff.length > 0) {
        // Group sip entries
        const sipGroups = {};
        const regularCaff = [];

        yesterdayCaff.forEach(caff => {
            if (caff.sipGroup) {
                if (!sipGroups[caff.sipGroup]) {
                    sipGroups[caff.sipGroup] = [];
                }
                sipGroups[caff.sipGroup].push(caff);
            } else {
                regularCaff.push(caff);
            }
        });

        medsHtml += '<div style="margin-top: 12px; margin-bottom: 10px;"><strong style="color: #C4923A;">☕ Caffeine:</strong></div>';

        // Regular caffeine entries
        regularCaff.forEach(caff => {
            const doseTime = timeToMinutes(caff.time);
            const remaining = calculateYesterdayDoseRemaining(caff.amount, doseTime, state.settings.caffHalfLife);
            totalCaffRemaining += remaining;
            medsHtml += `<div style="margin-left: 15px; margin-bottom: 4px; opacity: 0.8;">
                ${caff.name} (${caff.amount}mg) @ ${formatTime12(caff.time)} → <span style="color: #5E8A5E;">${remaining.toFixed(1)}mg remaining</span>
            </div>`;
        });

        // Sip group entries (show as combined)
        Object.values(sipGroups).forEach(group => {
            const firstEntry = group.find(g => g.sipMeta) || group[0];
            const totalMg = group.reduce((sum, g) => sum + g.amount, 0);
            let groupRemaining = 0;
            group.forEach(caff => {
                const doseTime = timeToMinutes(caff.time);
                groupRemaining += calculateYesterdayDoseRemaining(caff.amount, doseTime, state.settings.caffHalfLife);
            });
            totalCaffRemaining += groupRemaining;

            const sipMeta = firstEntry.sipMeta;
            const displayName = sipMeta ? sipMeta.drinkName : firstEntry.name;
            const timeRange = sipMeta ? `${sipMeta.startTime} - ${sipMeta.endTime}` : formatTime12(firstEntry.time);

            medsHtml += `<div style="margin-left: 15px; margin-bottom: 4px; opacity: 0.8;">
                ⏱️ ${displayName} (${totalMg.toFixed(0)}mg sipped ${timeRange}) → <span style="color: #5E8A5E;">${groupRemaining.toFixed(1)}mg remaining</span>
            </div>`;
        });

        medsHtml += `<div style="margin-left: 15px; margin-top: 6px; font-weight: 600; color: #C4923A;">
            Total Ghost Caff: ${totalCaffRemaining.toFixed(1)}mg
        </div>`;
    }

    section.style.display = 'block';
    medEntriesEl.innerHTML = medsHtml;
    totalEl.innerHTML = `Ghost Load Total: ${totalAmpRemaining.toFixed(1)}mg amp + ${totalCaffRemaining.toFixed(1)}mg caff`;
}

// ============================================
// WORKOUT PLANNER
// ============================================

// Old workout planner removed (Task 11 needle-test cut). state.workoutPlan kept for schema compat.
// restoreWorkoutPlanUI() kept as a no-op stub; still referenced by firebase-sync.js.
function restoreWorkoutPlanUI() {}

function toggleSettings() {
    const content = document.getElementById('settingsContent');
    const arrow = document.getElementById('settingsArrow');
    content.classList.toggle('show');
    arrow.textContent = content.classList.contains('show') ? '▲' : '▼';
}

// ============================================
// WHAT-IF SCENARIOS
// ============================================

// BUG FIX 4: Skip when accordion is closed
function updateScenarios() {
    // In sidebar layout, check if modifiers page is active
    if (typeof currentPage !== 'undefined' && document.body.classList.contains('has-sc-sidebar')) {
        if (currentPage !== 'modifiers') return;
    } else {
        const section = document.querySelector('.accordion-section[data-section="whatif"]');
        if (section && !section.classList.contains('open')) return;
    }

    const now = getCurrentMinutes();
    const { sleepTime: baseSleepTime } = calculateSleepTime();

    // Scenario 1: Add coffee now
    const coffeeSleep = simulateCaffeineAddition(100);
    updateScenarioDisplay('Coffee', coffeeSleep, baseSleepTime);

    // Scenario 2: Add double espresso
    const espressoSleep = simulateCaffeineAddition(126);
    updateScenarioDisplay('Espresso', espressoSleep, baseSleepTime);

    // Scenario 3: Take Vitamin C now (if not already active)
    const vitcSleep = simulateVitaminC();
    updateScenarioDisplay('VitC', vitcSleep, baseSleepTime);
}

function simulateCaffeineAddition(amount) {
    // Temporarily add caffeine and calculate
    const now = getCurrentMinutes();
    const nowTime = `${Math.floor(now / 60).toString().padStart(2, '0')}:${(now % 60).toString().padStart(2, '0')}`;

    const tempId = 'temp_simulation_999999';
    const tempCaff = { id: tempId, amount, name: 'Simulated', time: nowTime, date: getLocalDateString() };
    if (!state.caffeine || Array.isArray(state.caffeine)) {
        state.caffeine = migrateArrayToObject(state.caffeine, 'caf');
    }
    state.caffeine[tempId] = tempCaff;

    // Save and restore hyperarousalMode to prevent side-effect leakage
    const savedHyperarousal = hyperarousalMode;
    try {
        const { sleepTime } = calculateSleepTime();
        return sleepTime;
    } finally {
        delete state.caffeine[tempId];
        hyperarousalMode = savedHyperarousal;
    }
}

function simulateVitaminC() {
    // FIX: Check if VitC is scheduled (past OR future) — projection already factors it in
    if (state.modifiers.vitaminC.active && getVitaminCTimeMinutes() !== Infinity) {
        // Already scheduled (past or future, not expired) - projection includes it
        return calculateSleepTime().sleepTime;
    }

    const now = getCurrentMinutes();
    const nowTime = `${Math.floor(now / 60).toString().padStart(2, '0')}:${(now % 60).toString().padStart(2, '0')}`;
    const today = getLocalDateString();

    // Temporarily activate vitamin C with TODAY's date (fresh dose simulation)
    const wasActive = state.modifiers.vitaminC.active;
    const oldTime = state.modifiers.vitaminC.time;
    const oldDate = state.modifiers.vitaminC.date;

    state.modifiers.vitaminC.active = true;
    state.modifiers.vitaminC.time = nowTime;
    state.modifiers.vitaminC.date = today;  // FIX: Set fresh date so isVitaminCEffective() returns true

    const { sleepTime } = calculateSleepTime();

    // Restore
    state.modifiers.vitaminC.active = wasActive;
    state.modifiers.vitaminC.time = oldTime;
    state.modifiers.vitaminC.date = oldDate;

    return sleepTime;
}

function updateScenarioDisplay(scenario, newSleepTime, baseSleepTime) {
    const sleepEl = document.getElementById(`scenario${scenario}Sleep`);
    const deltaEl = document.getElementById(`scenario${scenario}Delta`);

    if (!sleepEl || !deltaEl) return;

    let displaySleep = newSleepTime;
    if (displaySleep > 24 * 60) displaySleep -= 24 * 60;

    sleepEl.textContent = minutesToTime(displaySleep);

    // Calculate delta
    let delta = newSleepTime - baseSleepTime;

    // Handle edge cases for delta display
    if (Math.abs(delta) > 12 * 60) {
        // Probably crossed midnight - adjust
        delta = delta > 0 ? delta - 24 * 60 : delta + 24 * 60;
    }

    const deltaHours = Math.floor(Math.abs(delta) / 60);
    const deltaMins = Math.abs(delta) % 60;
    const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';

    if (delta === 0) {
        deltaEl.textContent = 'No change';
        deltaEl.style.color = '#9C948B';
    } else {
        let deltaStr = '';
        if (deltaHours > 0) deltaStr += `${deltaHours}h `;
        deltaStr += `${deltaMins}m`;

        deltaEl.textContent = sign + deltaStr;
        deltaEl.style.color = delta > 0 ? '#B85C5C' : '#5E8A5E';
    }
}

function simulateScenario(type) {
    const now = getCurrentMinutes();
    const nowTime = `${Math.floor(now / 60).toString().padStart(2, '0')}:${(now % 60).toString().padStart(2, '0')}`;

    switch(type) {
        case 'coffee':
            addCaffeine(100, 'Coffee');
            showToast('☕ Coffee added!');
            break;
        case 'espresso':
            addCaffeine(126, 'Double Espresso');
            showToast('🔥 Double espresso added!');
            break;
        case 'vitc':
            if (!state.modifiers.vitaminC.active) {
                state.modifiers.vitaminC.active = true;
                state.modifiers.vitaminC.time = nowTime;
                state.modifiers.vitaminC.date = getLocalDateString();
                const vitCToggle = document.getElementById('vitCToggle');
                if (vitCToggle) vitCToggle.checked = true;
                document.getElementById('vitaminCTime').value = nowTime;
                updateModifierTimeInputs();
                showToast('🍊 Vitamin C activated!');
            } else {
                showToast('Vitamin C already active');
            }
            break;
    }
    recalculate();
}

// ============================================
// FORECAST LOGIC
// ============================================

function clearToday() {
    if (confirm('Clear all of today\'s entries?')) {
        // FIX: Use empty objects instead of arrays
        state.medications = {};
        state.caffeine = {};
        Object.keys(state.modifiers).forEach(k => {
            if (state.modifiers[k]) {
                state.modifiers[k].active = false;
            }
        });

        // Reset workout plan
        state.workoutPlan = {
            active: false,
            time: null,
            duration: 45,
            type: 'lifting',
            intensity: 'medium',
            fasted: false,
            coldShower: false,
            applied: false,
            adenosineBonus: 0,
            cortisolDelay: 0,
            thermalDelay: 0,
            cooldownComplete: null
        };

        renderMedEntries();
        renderCaffeineEntries();
        renderFocusCaffeineList(); // FIX Bug 5: Sync Focus Mode on clear
        document.querySelectorAll('.modifier-item').forEach(el => el.classList.remove('active'));
        updateModifierTimeInputs();
        recalculate();
        saveState();
        showToast('Today cleared');
    }
}

function resetDay() {
    showCustomConfirm(
        'Save today\'s prediction to history, then clear all medications, caffeine, and modifiers for a fresh start.\n\nWake time and sleep hours will NOT be cleared.',
        function() {
            // 1. Archive before clearing
            saveDay();
            saveDailyLogicLog();
            // 2. Clear daily data (same fields as clearToday + nicotine)
            state.medications = {};
            state.caffeine = {};
            Object.keys(state.modifiers).forEach(function(k) {
                if (state.modifiers[k]) state.modifiers[k].active = false;
            });
            state.workoutPlan = {
                active: false, time: null, duration: 45, type: 'lifting',
                intensity: 'medium', fasted: false, coldShower: false,
                applied: false, adenosineBonus: 0, cortisolDelay: 0,
                thermalDelay: 0, cooldownComplete: null
            };
            state.nicotine = { active: false, type: 'vape', lastHitTime: null };
            state.allNighterMode = false;
            // 3. Re-render
            renderMedEntries();
            renderCaffeineEntries();
            if (typeof renderFocusCaffeineList === 'function') renderFocusCaffeineList();
            document.querySelectorAll('.modifier-item').forEach(function(el) { el.classList.remove('active'); });
            updateModifierTimeInputs();
            if (typeof updateAllNighterUI === 'function') updateAllNighterUI();
            // 4. Save + recalculate
            recalculate();
            saveStateImmediate();
            showToast('Day reset! Previous prediction archived.');
        },
        null, 'Reset Day'
    );
}

function toggleForecastLogic() {
    forecastExpanded = !forecastExpanded;
    const content = document.getElementById('forecastLogicContent');
    const icon = document.getElementById('forecastToggleIcon');

    if (content) {
        content.style.display = forecastExpanded ? 'block' : 'none';
    }
    if (icon) {
        icon.textContent = forecastExpanded ? '▼' : '▶';
    }
}

function copyForecastLogic() {
    const text = document.getElementById('forecastLogicText');
    if (text) {
        navigator.clipboard.writeText(text.textContent).then(() => {
            showToast('📋 Forecast logic copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const range = document.createRange();
            range.selectNode(text);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
            showToast('📋 Forecast logic copied!');
        });
    }
}

function generateForecastLogic() {
    const now = new Date();
    const currentTime = minutesToTime(getCurrentMinutes());
    const { sleepTime, blockingFactors } = calculateSleepTime();
    const effectiveThreshold = getEffectiveThreshold();
    const baseThreshold = (typeof getActiveBaseThreshold === 'function')
        ? getActiveBaseThreshold()
        : numOr(state.settings.sleepThreshold, 14);
    const sleepDebtBonus = calculateSleepDebtBonus();
    const ampLoad = calculateAmpLoad(getCurrentMinutes());
    const caffLoad = calculateCaffLoad(getCurrentMinutes());
    const forbiddenZone = getForbiddenZone();
    const sleepGate = getSleepGate();

    // Workout's current contribution, derived from the engine so the
    // breakdown always sums to the effective threshold (incl. cap/decay).
    const workoutBonus = Math.max(0, effectiveThreshold - baseThreshold - sleepDebtBonus);

    // Calculate rolling sleep debt details
    const today = new Date();
    let debtDetails = [];
    const todayDeficit = Math.max(0, 8 - state.hoursSleptLastNight);
    debtDetails.push(`Today: ${state.hoursSleptLastNight}h slept → ${todayDeficit.toFixed(1)}h deficit (100% weight)`);

    const weights = [0.7, 0.4];
    for (let i = 1; i <= 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString(date);
        const entry = state.sleepHistory[dateStr];

        if (entry) {
            let hoursSlept = 8;
            if (typeof entry === 'number') hoursSlept = entry;
            else if (typeof entry === 'object' && entry.hoursSlept !== undefined) hoursSlept = entry.hoursSlept;

            const dayDeficit = Math.max(0, 8 - hoursSlept);
            const weighted = dayDeficit * weights[i - 1];
            const dayName = i === 1 ? 'Yesterday' : '2 days ago';
            debtDetails.push(`${dayName}: ${hoursSlept}h slept → ${dayDeficit.toFixed(1)}h deficit × ${weights[i-1]} = ${weighted.toFixed(1)}h`);
        } else {
            const dayName = i === 1 ? 'Yesterday' : '2 days ago';
            debtDetails.push(`${dayName}: No data (assumed 8h)`);
        }
    }

    // Compute raw weighted deficit for display (independent of hyperarousal)
    let rawWeightedDeficit = todayDeficit; // today at 100% weight
    for (let i = 1; i <= 2; i++) {
        const date2 = new Date(today);
        date2.setDate(date2.getDate() - i);
        const dateStr2 = getLocalDateString(date2);
        const entry2 = state.sleepHistory[dateStr2];
        if (entry2) {
            let hs = 8;
            if (typeof entry2 === 'number') hs = entry2;
            else if (typeof entry2 === 'object' && entry2.hoursSlept !== undefined) hs = entry2.hoursSlept;
            if (isNaN(hs) || hs < 0) hs = 8;
            rawWeightedDeficit += Math.max(0, 8 - hs) * weights[i - 1];
        }
    }

    // Build caffeine details
    let caffeineDetails = [];
    if (getCount(state.caffeine) === 0) {
        caffeineDetails.push('None logged');
    } else {
        // Group sip mode entries
        const sipGroups = {};
        const regularEntries = [];

        getValues(state.caffeine).forEach((c, i) => {
            if (c.sipGroup) {
                if (!sipGroups[c.sipGroup]) {
                    sipGroups[c.sipGroup] = { entries: [], meta: null };
                }
                sipGroups[c.sipGroup].entries.push(c);
                if (c.sipMeta) {
                    sipGroups[c.sipGroup].meta = c.sipMeta;
                }
            } else {
                regularEntries.push({ ...c, index: i + 1 });
            }
        });

        // Add regular entries
        let entryNum = 1;
        regularEntries.forEach(c => {
            caffeineDetails.push(`${entryNum}. ${c.name || 'Cup'}: ${c.amount}mg at ${c.time}`);
            entryNum++;
        });

        // Add sip mode groups with EXPLICIT rolling absorption language
        Object.values(sipGroups).forEach(group => {
            const entries = group.entries;
            const meta = group.meta;
            const totalMg = entries.reduce((sum, c) => sum + c.amount, 0);
            const startTime = entries[0].time;
            const endTime = entries[entries.length - 1].time;
            const drinkName = entries[0].name;

            caffeineDetails.push(`${entryNum}. ⏱️ ${drinkName}: ${Math.round(totalMg)}mg (Sipped ${startTime} - ${endTime})`);
            caffeineDetails.push(`   └─ ✓ MODELED AS ROLLING ABSORPTION (${entries.length} micro-doses @ 10-min intervals)`);
            caffeineDetails.push(`   └─ Each micro-dose calculated with individual decay curve`);

            // Show first, middle, and last dose as examples
            if (entries.length > 3) {
                caffeineDetails.push(`   └─ Sample: ${entries[0].amount}mg@${entries[0].time} → ... → ${entries[entries.length-1].amount}mg@${entries[entries.length-1].time}`);
            } else {
                entries.forEach((c, i) => {
                    caffeineDetails.push(`      ${i+1}/${entries.length}: ${c.amount}mg at ${c.time}`);
                });
            }
            entryNum++;
        });
    }

    // Build medication details
    let medDetails = [];
    const medsForDetails = getValues(state.medications);
    if (medsForDetails.length === 0) {
        medDetails.push('None logged');
    } else {
        medsForDetails.forEach((m, i) => {
            const type = m.dose >= 20 ? 'XR' : 'IR';
            medDetails.push(`${i+1}. ${m.dose}mg ${type} at ${m.time}`);
        });
    }

    // Build modifiers summary
    let modifierDetails = [];
    if (state.modifiers.vitaminC && state.modifiers.vitaminC.active) {
        const vitCDate = state.modifiers.vitaminC.date || getLocalDateString();
        const today = getLocalDateString();
        const vitCDateLabel = vitCDate !== today ? ` (${formatDateLabel(vitCDate)})` : '';
        const vitCStatus = getVitaminCStatus();
        if (vitCStatus === 'effective') {
            modifierDetails.push(`• Vitamin C: Active at ${state.modifiers.vitaminC.time}${vitCDateLabel} → Half-life reduced to 70% after this time`);
        } else if (vitCStatus === 'future') {
            modifierDetails.push(`• Vitamin C: SCHEDULED for ${state.modifiers.vitaminC.time}${vitCDateLabel} → Not yet taken, no effect on half-life`);
        } else {
            modifierDetails.push(`• Vitamin C: EXPIRED (taken at ${state.modifiers.vitaminC.time}${vitCDateLabel}, >8 hours ago) → No longer affecting half-life`);
        }
    }
    if (state.modifiers.workout && state.modifiers.workout.active) {
        const wMod = state.modifiers.workout;
        modifierDetails.push(`• Workout: ends ${wMod.endTime || '18:00'}${wMod.intense ? ' (intense)' : ''} → +${workoutBonus.toFixed(1)}mg threshold right now`);
        if (wMod.intense) {
            modifierDetails.push(`  - Intense session: 60-min post-workout cooldown blocker after end`);
        }
    }
    if (modifierDetails.length === 0) {
        modifierDetails.push('None active');
    }

    // Build blocking factors
    let blockingDetails = [];
    blockingFactors.forEach(f => {
        const clearTime = f.clearsAt !== null ? minutesToTimeWithDay(f.clearsAt) : 'N/A';
        blockingDetails.push(`• ${f.name}: Clears at ${clearTime}${f.note ? ' - ' + f.note : ''}`);
    });
    if (blockingDetails.length === 0) {
        blockingDetails.push('None - sleep possible now');
    }

    // Calculate crash time
    let crashTime = null;
    const todayStr = getLocalDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterdayDate);

    let medsForCrash = getValues(state.medications).filter(m => m.date === todayStr);
    if (state.allNighterMode && medsForCrash.length === 0) {
        medsForCrash = getValues(state.medications).filter(m => m.date === yesterdayStr);
    }

    if (medsForCrash.length > 0) {
        let latestDose = -Infinity;
        medsForCrash.forEach(m => {
            let t = timeToMinutes(m.time);
            if (m.date === yesterdayStr) {
                t = t - (24 * 60);
            }
            if (t > latestDose) latestDose = t;
        });
        crashTime = latestDose + (6 * 60);
        if (crashTime < 0) crashTime += 24 * 60;
    }

    // Format sleep time (normalize to 0-1439 range)
    let sleepTimeDisplay = sleepTime % (24 * 60);
    if (sleepTimeDisplay < 0) sleepTimeDisplay += 24 * 60;

    // Calculate Wake Maintenance Zone
    const wmzStart = forbiddenZone.start - (2 * 60);

    // Build All-Nighter Mode section if active
    let allNighterSection = '';
    if (state.allNighterMode) {
        const yesterdayMeds = getYesterdayMedications();
        const yesterdayCaff = getYesterdayCaffeine();
        let ghostAmpTotal = 0;
        let ghostCaffTotal = 0;

        // FIX: Use reduced half-life if Vitamin C is currently effective
        const effectiveHalfLifeForGhost = isVitaminCEffective()
            ? state.settings.ampHalfLife * 0.7
            : state.settings.ampHalfLife;

        yesterdayMeds.forEach(med => {
            const doseTime = timeToMinutes(med.time);
            ghostAmpTotal += calculateYesterdayDoseRemaining(med.dose, doseTime, effectiveHalfLifeForGhost);
        });

        yesterdayCaff.forEach(caff => {
            const doseTime = timeToMinutes(caff.time);
            ghostCaffTotal += calculateYesterdayDoseRemaining(caff.amount, doseTime, state.settings.caffHalfLife);
        });

        allNighterSection = `
┌─────────────────────────────────────────────────────────────┐
│ 🔥 ALL-NIGHTER MODE ACTIVE (48-HOUR VIEW)                   │
└─────────────────────────────────────────────────────────────┘
  Yesterday's medications: ${yesterdayMeds.length} doses
  Yesterday's caffeine: ${yesterdayCaff.length} entries

  GHOST LOAD (Already included in Current Load below):
  • Amphetamine: ~${ghostAmpTotal.toFixed(1)}mg from yesterday (of ${ampLoad.toFixed(1)}mg total)
  • Caffeine: ~${ghostCaffTotal.toFixed(1)}mg from yesterday (of ${caffLoad.toFixed(0)}mg total)

  NOTE: These values are ALREADY FACTORED INTO all calculations.
  Today's new doses contribute: ~${Math.max(0, ampLoad - ghostAmpTotal).toFixed(1)}mg amp, ~${Math.max(0, caffLoad - ghostCaffTotal).toFixed(0)}mg caffeine.

`;
    }

    // Build Vitamin C info
    let vitCInfo = '';
    if (state.modifiers.vitaminC.active) {
        const vitCDate = state.modifiers.vitaminC.date || getLocalDateString();
        const today = getLocalDateString();
        const dayLabel = vitCDate !== today ? formatDateLabel(vitCDate) : 'today';
        const vitCStatus = getVitaminCStatus();
        if (vitCStatus === 'effective') {
            vitCInfo = `  • Vitamin C: Active at ${state.modifiers.vitaminC.time} ${dayLabel} → Half-life reduced to 70% after this time\n`;
        } else if (vitCStatus === 'future') {
            vitCInfo = `  • Vitamin C: SCHEDULED for ${state.modifiers.vitaminC.time} ${dayLabel} → Not yet taken, using normal 12h half-life\n`;
        } else {
            vitCInfo = `  • Vitamin C: EXPIRED (taken at ${state.modifiers.vitaminC.time} ${dayLabel}, >8 hours ago) → Using normal 12h half-life\n`;
        }
    }

    // Build the forecast text
    const forecastText = `
═══════════════════════════════════════════════════════════════
TODAY'S FORECAST LOGIC — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
Generated at: ${currentTime}
═══════════════════════════════════════════════════════════════
${allNighterSection}
┌─────────────────────────────────────────────────────────────┐
│ 1. PERSONAL CALIBRATION SETTINGS                            │
└─────────────────────────────────────────────────────────────┘
  • Amphetamine half-life: ${state.settings.ampHalfLife} hours
  • Sleep threshold (base): ${baseThreshold} mg
  • Caffeine half-life: ${state.settings.caffHalfLife} hours
  • Caffeine threshold: ${state.settings.caffThreshold} mg
  • Body weight: ${state.settings.weight} lbs

  HOW THIS IS USED:
  → Half-life determines decay rate: Drug = Dose × 0.5^(elapsed_hours / half_life)
  → Threshold is the drug level below which sleep becomes possible
  → Weight affects drug distribution volume (heavier = slightly faster clearance)

┌─────────────────────────────────────────────────────────────┐
│ 2. TODAY'S SLEEP CONTEXT                                    │
└─────────────────────────────────────────────────────────────┘
  • Wake time: ${state.wakeTime}
  • Hours slept last night: ${state.hoursSleptLastNight}
  • Hyperarousal mode: ${isHyperarousalMode() ? 'YES (< 4 hrs sleep negates sleep pressure!)' : 'No'}

  ROLLING 3-DAY SLEEP DEBT CALCULATION:
  ${debtDetails.join('\n  ')}
  ─────────────────────────────────
  Total weighted deficit: ${rawWeightedDeficit.toFixed(1)}h${isHyperarousalMode() ? ' → ⚠️ HYPERAROUSAL ACTIVE (< 4h sleep) → bonus NEGATED → +0.0mg' : ` → +${sleepDebtBonus.toFixed(1)}mg threshold bonus`}

  HOW THIS IS USED:
  → Sleep debt increases adenosine (Process S)
  → Higher adenosine = can sleep with more drug in system
  → Threshold raised by ~1.0mg per hour of deficit (capped at +6mg)
  → CRITICAL: If < 4 hours sleep, hyperarousal kicks in (cortisol surge)
    This NEGATES the bonus - you feel wired despite exhaustion

┌─────────────────────────────────────────────────────────────┐
│ 3. TODAY'S MEDICATIONS                                      │
└─────────────────────────────────────────────────────────────┘
  ${medDetails.join('\n  ')}

  CURRENT AMPHETAMINE LOAD: ${ampLoad.toFixed(1)} mg

  HOW THIS IS USED:
  → XR releases 50% immediately, 50% at T+4 hours
  → Each pulse decays independently via half-life
  → Sleep possible when load drops below effective threshold
  → Vitamin C (if active) reduces half-life to 70% after specified time

┌─────────────────────────────────────────────────────────────┐
│ 4. TODAY'S CAFFEINE                                         │
└─────────────────────────────────────────────────────────────┘
  ${caffeineDetails.join('\n  ')}

  CURRENT CAFFEINE LOAD: ${caffLoad.toFixed(0)} mg

  HOW THIS IS USED:
  → Caffeine blocks adenosine receptors (counteracts sleep pressure)
  → Sleep possible when load drops below ${state.settings.caffThreshold}mg threshold
  → Decays via half-life: ~${state.settings.caffHalfLife} hours

┌─────────────────────────────────────────────────────────────┐
│ 5. ACTIVE MODIFIERS                                         │
└─────────────────────────────────────────────────────────────┘
  ${modifierDetails.join('\n  ')}

  HOW MODIFIERS AFFECT THE PREDICTION:
  → Vitamin C acidifies urine → amphetamine clears FASTER (half-life ×0.70)
  → A workout floods the brain with adenosine → threshold +2mg (+1 if intense),
    holding 2h after the workout ends, then decaying to 0 by 6h
  → Higher threshold = drug curve crosses it EARLIER = earlier sleep

┌─────────────────────────────────────────────────────────────┐
│ 6. EFFECTIVE THRESHOLD CALCULATION                          │
└─────────────────────────────────────────────────────────────┘
  Base threshold:              ${baseThreshold.toFixed(1)} mg
  + Sleep debt bonus:          +${sleepDebtBonus.toFixed(1)} mg
  + Workout bonus:             +${workoutBonus.toFixed(1)} mg
  ─────────────────────────────────
  EFFECTIVE THRESHOLD:         ${effectiveThreshold.toFixed(1)} mg

  (Capped at base + 8mg max = ${baseThreshold + 8} mg)

┌─────────────────────────────────────────────────────────────┐
│ 7. CIRCADIAN RHYTHM (Process C)                             │
└─────────────────────────────────────────────────────────────┘
  Wake Maintenance Zone: ${minutesToTime(wmzStart > 24*60 ? wmzStart - 24*60 : wmzStart)} - ${minutesToTime(forbiddenZone.start > 24*60 ? forbiddenZone.start - 24*60 : forbiddenZone.start)}
  Forbidden Zone:        ${minutesToTime(forbiddenZone.start > 24*60 ? forbiddenZone.start - 24*60 : forbiddenZone.start)} - ${minutesToTime(forbiddenZone.end > 24*60 ? forbiddenZone.end - 24*60 : forbiddenZone.end)}
  Sleep Gate (optimal):  ${minutesToTime(sleepGate.start > 24*60 ? sleepGate.start - 24*60 : sleepGate.start)} - ${minutesToTime(sleepGate.end > 24*60 ? sleepGate.end - 24*60 : sleepGate.end)}

  HOW THIS IS USED:
  → Wake Maintenance Zone: 2 hours before Forbidden Zone
    Your brain's alerting signal is ramping up - HARD BLOCKER
  → Forbidden Zone: 13-15 hours after wake time
    Peak circadian alertness - CANNOT fall asleep - HARD BLOCKER
  → Sleep Gate: 15-17 hours after wake time
    Circadian trough - optimal sleep onset window
  → Both WMZ and FZ push sleep time to AFTER Forbidden Zone ends

┌─────────────────────────────────────────────────────────────┐
│ 8. BLOCKING FACTORS                                         │
└─────────────────────────────────────────────────────────────┘
  ${blockingDetails.join('\n  ')}

┌─────────────────────────────────────────────────────────────┐
│ 9. WHAT YOU'LL FEEL TONIGHT                                 │
└─────────────────────────────────────────────────────────────┘
  ${crashTime && (crashTime < sleepTime || crashTime - 1440 < sleepTime) ? `• Crash begins: ~${minutesToTime(crashTime > 24*60 ? crashTime - 24*60 : crashTime)} (amphetamine dropping fast)` : '• No medication crash expected before sleep'}
  • Sleep onset: ${minutesToTime(sleepTimeDisplay)}
  ${(() => { const fzStartNorm = forbiddenZone.start > 24*60 ? forbiddenZone.start - 24*60 : forbiddenZone.start; return fzStartNorm < sleepTimeDisplay || (fzStartNorm > 20*60 && sleepTimeDisplay < 6*60) ? `• Second wind: ~${minutesToTime(fzStartNorm)} (circadian alerting peak - may feel awake despite exhaustion)` : '• Second wind: occurs after predicted sleep onset'; })()}

═══════════════════════════════════════════════════════════════
FINAL PROJECTED SLEEP WINDOW: ${minutesToTime(sleepTimeDisplay)}
═══════════════════════════════════════════════════════════════

ALGORITHM SUMMARY:
1. Calculate drug clearance times (when amp < threshold AND caff < threshold)
2. Apply circadian constraints (WMZ and FZ are hard blockers)
3. Apply thermal cooldown if workout active
4. The LATEST of all these factors determines your sleep window

Current status at ${currentTime}:
  • Amphetamine: ${ampLoad.toFixed(1)}mg (threshold: ${effectiveThreshold.toFixed(1)}mg) ${ampLoad < effectiveThreshold ? '✓ BELOW' : '✗ ABOVE'}
  • Caffeine: ${caffLoad.toFixed(0)}mg (threshold: ${state.settings.caffThreshold}mg) ${caffLoad < state.settings.caffThreshold ? '✓ BELOW' : '✗ ABOVE'}
  • Circadian: ${(() => {
      const nowNorm = getCurrentMinutes() + (getCurrentMinutes() < timeToMinutes(state.wakeTime) ? 24*60 : 0);
      if (nowNorm >= wmzStart && nowNorm < forbiddenZone.start) return '⚠️ IN WAKE MAINTENANCE ZONE';
      if (nowNorm >= forbiddenZone.start && nowNorm < forbiddenZone.end) return '🚫 IN FORBIDDEN ZONE';
      if (nowNorm >= sleepGate.start && nowNorm < sleepGate.end) return '✓ IN SLEEP GATE';
      return '○ Normal phase';
  })()}
`.trim();

    return forecastText;
}

function updateForecastLogic() {
    const container = document.getElementById('forecastLogicText');
    if (container) {
        container.textContent = generateForecastLogic();
    }
}
