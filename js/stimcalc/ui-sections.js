// ============================================
// UI SECTIONS (Phase 4)
// Nicotine, Modifiers, All-Nighter, Workout, What-If, Forecast
// ============================================

// ============================================
// NICOTINE TRACKING
// ============================================

// Nicotine pharmacokinetics constants
// Based on cardiovascular response research, not elimination half-life
// Key insight: nicotine is FRONT-LOADED (first 10-30 min most activating)
// Half-life ~2 hours, but subjective effects don't follow linear decay
// Sleep impact is probabilistic, not a hard blocker
var NICOTINE_CONSTANTS = {
    vape: {
        // Inhaled nicotine - rapid spike
        onsetMinutes: 0.5,       // Seconds to feel it
        peakMinutes: 5,          // Peak plasma in 1-5 min
        highImpactEnd: 30,       // HIGH arousal zone ends
        moderateImpactEnd: 60,   // MODERATE zone ends
        minimalImpactEnd: 120,   // Meaningful effects mostly gone
        description: '💨 Vape',
        shortDesc: 'Vape'
    },
    pouch: {
        // Buccal absorption - slower, flatter curve
        onsetMinutes: 5,         // Takes 5-15 min to feel
        peakMinutes: 30,         // Peak at 30-45 min
        highImpactEnd: 45,       // HIGH zone ends
        moderateImpactEnd: 75,   // MODERATE zone ends
        minimalImpactEnd: 120,   // Minimal by 2 hours
        description: '🫧 Zyn/Pouch',
        shortDesc: 'Zyn'
    }
};

function logNicotine(type) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    state.nicotine.active = true;
    state.nicotine.type = type;
    state.nicotine.lastHitTime = timeStr;

    updateNicotineDisplay();
    recalculate();
    saveState();

    showToast(`${type === 'vape' ? '💨 Vape' : '🫧 Pouch'} logged at ${minutesToTime(timeToMinutes(timeStr))}`);
}

function clearNicotine() {
    state.nicotine.active = false;
    state.nicotine.lastHitTime = null;
    state.nicotine.type = 'vape';

    updateNicotineDisplay();
    recalculate();
    saveState();
}

function updateNicotineTime() {
    const timeInput = document.getElementById('nicotineTimeInput');
    if (timeInput && timeInput.value) {
        state.nicotine.active = true;
        state.nicotine.lastHitTime = timeInput.value;
        updateNicotineDisplay();
        recalculate();
        saveState();
    }
}

function updateNicotineDisplay() {
    const statusEl = document.getElementById('nicotineStatus');
    const warningEl = document.getElementById('nicotineWarning');
    const recommendEl = document.getElementById('nicotineRecommendation');
    const lastDisplayEl = document.getElementById('lastNicotineDisplay');
    const typeDisplayEl = document.getElementById('nicotineTypeDisplay');
    const clearDisplayEl = document.getElementById('nicotineClearDisplay');
    const timeInputEl = document.getElementById('nicotineTimeInput');
    const vapeBtn = document.getElementById('logVapeBtn');
    const pouchBtn = document.getElementById('logPouchBtn');

    if (!statusEl) return;

    if (state.nicotine.active && state.nicotine.lastHitTime) {
        statusEl.style.display = 'block';

        const typeInfo = NICOTINE_CONSTANTS[state.nicotine.type] || NICOTINE_CONSTANTS.vape;
        const lastHitMins = timeToMinutes(state.nicotine.lastHitTime);
        const now = getCurrentMinutes();

        // Calculate elapsed time and impact level
        let elapsed = now - lastHitMins;
        if (elapsed < 0) elapsed += 24 * 60;

        let impactLevel = 'MINIMAL';
        let timeUntilNext = 0;
        let nextPhase = '';

        if (elapsed < typeInfo.highImpactEnd) {
            impactLevel = 'HIGH';
            timeUntilNext = typeInfo.highImpactEnd - elapsed;
            nextPhase = 'moderate';
        } else if (elapsed < typeInfo.moderateImpactEnd) {
            impactLevel = 'MODERATE';
            timeUntilNext = typeInfo.moderateImpactEnd - elapsed;
            nextPhase = 'low';
        } else if (elapsed < typeInfo.minimalImpactEnd) {
            impactLevel = 'LOW';
            timeUntilNext = typeInfo.minimalImpactEnd - elapsed;
            nextPhase = 'minimal';
        }

        if (lastDisplayEl) lastDisplayEl.textContent = minutesToTime(lastHitMins);
        if (typeDisplayEl) typeDisplayEl.textContent = typeInfo.description;

        // Show impact level instead of exact clear time
        if (clearDisplayEl) {
            const levelColors = { 'HIGH': '#B85C5C', 'MODERATE': '#C4923A', 'LOW': '#5E8A5E', 'MINIMAL': '#5E8A5E' };
            clearDisplayEl.style.color = levelColors[impactLevel];

            if (impactLevel === 'MINIMAL') {
                clearDisplayEl.textContent = '✓ Minimal';
            } else {
                clearDisplayEl.textContent = `${impactLevel} (~${Math.round(timeUntilNext)}m)`;
            }
        }
        if (timeInputEl) timeInputEl.value = state.nicotine.lastHitTime;

        // Update button styles
        if (vapeBtn && pouchBtn) {
            if (state.nicotine.type === 'vape') {
                vapeBtn.style.background = '#B85C5C';
                pouchBtn.style.background = '#F5F2ED';
            } else {
                vapeBtn.style.background = '#F5F2ED';
                pouchBtn.style.background = '#5E8A5E';
            }
        }

        // Update warnings
        updateNicotineWarnings();
    } else {
        statusEl.style.display = 'none';
        if (warningEl) warningEl.style.display = 'none';
        if (recommendEl) recommendEl.style.display = 'none';

        // Reset buttons
        if (vapeBtn) vapeBtn.style.background = '#F5F2ED';
        if (pouchBtn) pouchBtn.style.background = '#F5F2ED';
    }

    checkRLSRisk();
}

function updateNicotineWarnings() {
    const warningEl = document.getElementById('nicotineWarning');
    const recommendEl = document.getElementById('nicotineRecommendation');
    if (!warningEl) return;

    const now = getCurrentMinutes();
    const hour = Math.floor(now / 60);
    const isLateEvening = (hour >= 21) || (hour < 3);

    if (!state.nicotine.active || !state.nicotine.lastHitTime) {
        warningEl.style.display = 'none';
        if (recommendEl) recommendEl.style.display = 'none';
        return;
    }

    const typeInfo = NICOTINE_CONSTANTS[state.nicotine.type] || NICOTINE_CONSTANTS.vape;
    const lastHitMins = timeToMinutes(state.nicotine.lastHitTime);
    let elapsed = now - lastHitMins;
    if (elapsed < 0) elapsed += 24 * 60;

    // Determine impact level
    let impactLevel = 'MINIMAL';
    let timeUntilNext = 0;

    if (elapsed < typeInfo.highImpactEnd) {
        impactLevel = 'HIGH';
        timeUntilNext = typeInfo.highImpactEnd - elapsed;
    } else if (elapsed < typeInfo.moderateImpactEnd) {
        impactLevel = 'MODERATE';
        timeUntilNext = typeInfo.moderateImpactEnd - elapsed;
    } else if (elapsed < typeInfo.minimalImpactEnd) {
        impactLevel = 'LOW';
        timeUntilNext = typeInfo.minimalImpactEnd - elapsed;
    }

    // Build visual bar
    const bars = {
        'HIGH': '<span style="color: #B85C5C;">████████</span><span style="color: #C4BCB3;">░░</span>',
        'MODERATE': '<span style="color: #C4923A;">█████</span><span style="color: #C4BCB3;">░░░░░</span>',
        'LOW': '<span style="color: #5E8A5E;">██</span><span style="color: #C4BCB3;">░░░░░░░░</span>',
        'MINIMAL': '<span style="color: #C4BCB3;">░░░░░░░░░░</span>'
    };

    warningEl.style.display = 'block';

    if (impactLevel === 'MINIMAL') {
        warningEl.style.background = 'rgba(94, 138, 94, 0.12)';
        warningEl.style.border = '1px solid rgba(94, 138, 94, 0.3)';
        warningEl.innerHTML = `
            <div style="font-weight: 600; color: #5E8A5E; margin-bottom: 8px;">
                ✅ Nicotine Impact: Minimal
            </div>
            <div style="font-family: monospace; font-size: 1.1em; margin-bottom: 8px; letter-spacing: 1px;">
                ${bars[impactLevel]}
            </div>
            <div style="color: #9C948B; font-size: 0.85em;">
                2+ hours since last hit. Effects largely cleared.
            </div>
        `;
        if (recommendEl) recommendEl.style.display = 'none';
    } else if (impactLevel === 'LOW') {
        warningEl.style.background = 'rgba(94, 138, 94, 0.1)';
        warningEl.style.border = '1px solid rgba(94, 138, 94, 0.3)';
        warningEl.innerHTML = `
            <div style="font-weight: 600; color: #5E8A5E; margin-bottom: 8px;">
                🚬 Nicotine Impact: Low
            </div>
            <div style="font-family: monospace; font-size: 1.1em; margin-bottom: 8px; letter-spacing: 1px;">
                ${bars[impactLevel]}
            </div>
            <div style="color: #2C2825; font-size: 0.9em;">
                ~${Math.round(timeUntilNext)} min until minimal. Sleep usually possible, quality may be slightly reduced.
            </div>
        `;
        if (recommendEl) recommendEl.style.display = 'none';
    } else if (impactLevel === 'MODERATE') {
        warningEl.style.background = 'rgba(196, 146, 58, 0.12)';
        warningEl.style.border = '1px solid rgba(196, 146, 58, 0.4)';
        warningEl.innerHTML = `
            <div style="font-weight: 600; color: #C4923A; margin-bottom: 8px;">
                🚬 Nicotine Impact: Moderate
            </div>
            <div style="font-family: monospace; font-size: 1.1em; margin-bottom: 8px; letter-spacing: 1px;">
                ${bars[impactLevel]}
            </div>
            <div style="color: #2C2825; font-size: 0.9em; margin-bottom: 6px;">
                ~${Math.round(timeUntilNext)} min until low impact. Arousal may delay sleep 15-45 min.
            </div>
            <div style="color: #9C948B; font-size: 0.85em;">
                Chronic users often sleep fine but may notice lighter sleep.
            </div>
        `;
        if (recommendEl && isLateEvening) {
            recommendEl.style.display = 'block';
            recommendEl.innerHTML = getRelaxationProtocol();
        } else if (recommendEl) {
            recommendEl.style.display = 'none';
        }
    } else {
        // HIGH impact
        warningEl.style.background = 'rgba(184, 92, 92, 0.12)';
        warningEl.style.border = '1px solid rgba(184, 92, 92, 0.4)';
        warningEl.innerHTML = `
            <div style="font-weight: 600; color: #C97070; margin-bottom: 8px;">
                🚬 Nicotine Impact: High
            </div>
            <div style="font-family: monospace; font-size: 1.1em; margin-bottom: 8px; letter-spacing: 1px;">
                ${bars[impactLevel]}
            </div>
            <div style="color: #2C2825; font-size: 0.9em; margin-bottom: 6px;">
                ~${Math.round(timeUntilNext)} min until moderate. Peak alertness window - sleep onset difficult.
            </div>
            <div style="color: #9C948B; font-size: 0.85em;">
                ${state.nicotine.type === 'vape' ? 'Vaping hits fast, clears fast.' : 'Pouches have a flatter, longer curve.'}
            </div>
        `;
        if (recommendEl && isLateEvening) {
            recommendEl.style.display = 'block';
            recommendEl.innerHTML = getRelaxationProtocol();
        } else if (recommendEl && hour >= 18 && state.nicotine.type === 'vape') {
            recommendEl.style.display = 'block';
            recommendEl.innerHTML = `
                <div style="font-weight: 600; color: #5E8A5E; margin-bottom: 6px;">
                    💡 EVENING STRATEGY
                </div>
                <div style="color: #2C2825; font-size: 0.9em;">
                    Consider <strong>Zyn/pouches</strong> for evening. Slower onset, flatter curve, easier to "land the plane" for sleep.
                </div>
            `;
        } else if (recommendEl) {
            recommendEl.style.display = 'none';
        }
    }
}

// Relaxation protocol for late-night nicotine use
function getRelaxationProtocol() {
    return `
        <div style="font-weight: 600; color: #6B7C5E; margin-bottom: 10px;">
            😴 Wind-Down Protocol
        </div>
        <div style="color: #2C2825; font-size: 0.9em; line-height: 1.6;">
            <div style="margin-bottom: 8px;">
                <strong>1. Dim lights</strong>, put phone away (or night mode)
            </div>
            <div style="margin-bottom: 8px;">
                <strong>2. Physiologic sigh</strong> (5x):<br>
                <span style="color: #9C948B; font-size: 0.85em; margin-left: 12px; display: block;">
                    Inhale nose → small top-up inhale → long slow exhale
                </span>
            </div>
            <div style="margin-bottom: 8px;">
                <strong>3. If not sleepy in 20 min:</strong> get up, do something boring in dim light, return when drowsy
            </div>
        </div>
        <div style="color: #C97070; font-size: 0.85em; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06);">
            ❌ Avoid: Clock-watching, calculating when you'll sleep — this itself triggers arousal
        </div>
    `;
}

function checkRLSRisk() {
    const rlsEl = document.getElementById('rlsEmergencyProtocol');
    if (!rlsEl) return;

    const now = getCurrentMinutes();
    const hour = Math.floor(now / 60);

    // Only check after 9 PM or before 5 AM
    if (!((hour >= 21) || (hour < 5))) {
        rlsEl.style.display = 'none';
        return;
    }

    // Check amphetamine level
    const ampLoadNow = calculateAmpLoad(now);
    const effectiveThreshold = getEffectiveThreshold();
    const ampPercentage = (ampLoadNow / Math.max(effectiveThreshold, 1)) * 100;

    // Check nicotine status
    let nicotineClearing = false;
    if (state.nicotine.active && state.nicotine.lastHitTime) {
        const lastHitMins = timeToMinutes(state.nicotine.lastHitTime);
        let timeSinceNic = now - lastHitMins;
        if (timeSinceNic < 0) timeSinceNic += 24 * 60;
        nicotineClearing = timeSinceNic >= 180; // 3+ hours since last hit
    }

    // RLS risk when both are clearing
    const highRisk = (ampPercentage < 30 && nicotineClearing) ||
                    (ampPercentage < 20 && state.nicotine.active);

    rlsEl.style.display = highRisk ? 'block' : 'none';
}

// Legacy function - kept for backward compatibility
// Nicotine is now advisory-only, doesn't hard-block sleep
function getNicotineCooldownTime() {
    // Nicotine no longer blocks sleep calculation
    // Return null to indicate no blocking
    return null;
}

// ============================================
// MODIFIERS / VITAMIN C UI
// FIX 7: Only the unified view version of toggleModifier is kept
// ============================================

// Override toggleModifier for unified view checkboxes
function toggleModifier(checkbox, modifierName) {
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
    } else if (modifierName === 'sauna') {
        const timeRow = document.getElementById('saunaTimeRow');
        if (timeRow) timeRow.style.display = checkbox.checked ? 'flex' : 'none';
        if (checkbox.checked && !state.modifiers.sauna.date) {
            state.modifiers.sauna.date = getLocalDateString();
        }
    }

    recalculate();
    saveState();
}

function updateModifierTimeInputs() {
    const vitCGroup = document.getElementById('vitCTimeRow');
    const saunaGroup = document.getElementById('saunaTimeRow');

    const showVitC = state.modifiers.vitaminC.active;
    const showSauna = state.modifiers.sauna.active;

    if (vitCGroup) vitCGroup.style.display = showVitC ? 'flex' : 'none';
    if (saunaGroup) saunaGroup.style.display = showSauna ? 'flex' : 'none';

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

    // Restore lift toggle
    const liftToggle = document.getElementById('liftToggle');
    if (liftToggle && state.modifiers.heavyLift && state.modifiers.heavyLift.active) {
        liftToggle.checked = true;
    }

    // Restore sauna toggle
    const saunaToggle = document.getElementById('saunaToggle');
    if (saunaToggle && state.modifiers.sauna && state.modifiers.sauna.active) {
        saunaToggle.checked = true;
        const saunaTimeRow = document.getElementById('saunaTimeRow');
        if (saunaTimeRow) saunaTimeRow.style.display = 'flex';
        const saunaTime = document.getElementById('saunaTime');
        if (saunaTime) saunaTime.value = state.modifiers.sauna.time || '18:00';
    }
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
        if (btn) { btn.style.background = '#6B7C5E'; btn.style.borderColor = '#6B7C5E'; }
        if (icon) icon.textContent = '🔥';
        if (text) text.textContent = 'All-Nighter Mode: ON';
        if (hint) hint.style.display = 'block';
    } else {
        if (btn) { btn.style.background = '#F5F2ED'; btn.style.borderColor = 'rgba(0,0,0,0.12)'; }
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

// Note: workoutPlan is now stored in state.workoutPlan

function initWorkoutPlanner() {
    // Set default workout time to current time rounded to nearest 15 min
    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes);
    const defaultTime = now.toTimeString().slice(0, 5);

    const timeInput = document.getElementById('workoutTime');
    if (timeInput && !timeInput.value) {
        timeInput.value = defaultTime;
    }

    updateWorkoutTimeline();
    updateWorkoutPlan();
}

function updateWorkoutTimeline() {
    const wakeMinutes = timeToMinutes(state.wakeTime);
    const forbiddenStart = wakeMinutes + (13 * 60); // Wake + 13 hours
    const sleepGateStart = wakeMinutes + (15 * 60); // Wake + 15 hours
    const goldenEnd = wakeMinutes + (11 * 60); // Wake + 11 hours (end of golden zone)

    // Calculate predicted sleep for the timeline end
    const { sleepTime } = calculateSleepTime();

    // Update labels (safely)
    const workoutWindowStartEl = document.getElementById('workoutWindowStart');
    const workoutWindowEndEl = document.getElementById('workoutWindowEnd');
    if (workoutWindowStartEl) workoutWindowStartEl.textContent = formatTime12(state.wakeTime);
    if (workoutWindowEndEl) workoutWindowEndEl.textContent = minutesToTime(sleepTime > 24*60 ? sleepTime - 24*60 : sleepTime);

    // Update timeline bar gradient based on actual wake time
    // Green: wake to golden end, Yellow: golden end to forbidden, Red: forbidden zone, Gray: after
    const totalWindow = sleepTime - wakeMinutes;
    const goldenPercent = Math.min(100, Math.max(0, ((goldenEnd - wakeMinutes) / totalWindow) * 100));
    const forbiddenPercent = Math.min(100, Math.max(0, ((forbiddenStart - wakeMinutes) / totalWindow) * 100));
    const sleepGatePercent = Math.min(100, Math.max(0, ((sleepGateStart - wakeMinutes) / totalWindow) * 100));

    const timelineBar = document.getElementById('workoutTimelineBar');
    if (timelineBar) {
        timelineBar.style.background = `linear-gradient(90deg,
            #5E8A5E 0%, #5E8A5E ${goldenPercent}%,
            #C4923A ${goldenPercent}%, #C4923A ${forbiddenPercent}%,
            #B85C5C ${forbiddenPercent}%, #B85C5C ${sleepGatePercent}%,
            #C4BCB3 ${sleepGatePercent}%)`;

        // Add current time marker
        const now = getCurrentMinutes();
        if (now >= wakeMinutes && now <= sleepTime) {
            const nowPercent = ((now - wakeMinutes) / totalWindow) * 100;
            timelineBar.innerHTML = `<div class="workout-zone-marker" style="left: ${nowPercent}%;"><div class="workout-zone-label">Now</div></div>`;
        }
    }
}

function calculateWorkoutImpact() {
    const workoutTimeEl = document.getElementById('workoutTime');
    const workoutDurationEl = document.getElementById('workoutDuration');
    const workoutTypeEl = document.getElementById('workoutType');
    const workoutIntensityEl = document.getElementById('workoutIntensity');
    const workoutFastedEl = document.getElementById('workoutFasted');
    const coldShowerEl = document.getElementById('coldShowerToggle');

    if (!workoutTimeEl || !workoutTimeEl.value) return null;

    const workoutStart = timeToMinutes(workoutTimeEl.value);
    const duration = workoutDurationEl ? (parseInt(workoutDurationEl.value) || 45) : 45;
    const type = workoutTypeEl ? workoutTypeEl.value : 'lifting';
    const intensity = workoutIntensityEl ? workoutIntensityEl.value : 'medium';
    const isFasted = workoutFastedEl ? workoutFastedEl.checked : false;
    const coldShower = coldShowerEl ? coldShowerEl.checked : false;

    const wakeMinutes = timeToMinutes(state.wakeTime);
    const workoutEnd = workoutStart + duration;

    // Define zones
    const goldenStart = wakeMinutes + (3 * 60);  // Wake + 3 hours
    const goldenEnd = wakeMinutes + (11 * 60);   // Wake + 11 hours
    const forbiddenStart = wakeMinutes + (13 * 60); // Wake + 13 hours
    const forbiddenEnd = wakeMinutes + (15 * 60);   // Wake + 15 hours

    // Get base drug clear time (without workout effects)
    // Use pharmacokineticFloor for "drugs only" - this is when drugs actually clear
    // NOT sleepTime which includes circadian constraints
    const { sleepTime: finalSleepTime, pharmacokineticFloor } = calculateSleepTime();
    const baseSleepTime = pharmacokineticFloor; // Raw drug clearance, no circadian

    // Check for hyperarousal state (acute sleep deprivation)
    const isHyperaroused = state.hoursSleptLastNight < 4;

    // Initialize impact values
    let adenosineBonus = 0;
    let cortisolDelay = 0;
    let thermalDelay = 0;
    let warnings = [];
    let status = 'optimal'; // optimal, caution, danger

    // RULE 1: Adenosine Bonus (flat -15 min for lifting/zone2, -5 for walk)
    if (duration >= 20) {
        if (type === 'lifting' || type === 'zone2') {
            adenosineBonus = 15;
        } else if (type === 'walk') {
            adenosineBonus = 5;
        }
        // HIIT gets no adenosine bonus - cortisol cancels it out
    }

    // RULE 2: Fasted Penalty
    if (isFasted && intensity !== 'low' && type !== 'walk') {
        cortisolDelay += 45;
        warnings.push({
            type: 'danger',
            icon: '🍽️',
            title: 'GLYCOGEN PANIC',
            text: 'Lifting fasted will spike cortisol. Eat rapid carbs (fruit/oatmeal) NOW to neutralize this risk.'
        });
        status = 'caution';
    }

    // RULE 3: HIIT in bad conditions
    const isLateDay = workoutStart >= forbiddenStart || isHyperaroused;
    if (type === 'hiit') {
        if (isLateDay) {
            cortisolDelay += 90;
            warnings.push({
                type: 'danger',
                icon: '⚡',
                title: 'ADRENALINE TRAP',
                text: 'High intensity now will stack with your "Second Wind" or Sleep Debt. You will be wired until very late. Switch to heavy lifting or walking.'
            });
            status = 'danger';
        } else if (workoutStart >= goldenEnd) {
            cortisolDelay += 45;
            warnings.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Late HIIT Risk',
                text: 'HIIT after your Golden Window raises evening cortisol. Consider Zone 2 or lifting instead.'
            });
            status = 'caution';
        }
    }

    // RULE 4: Thermal cooldown (2 hours, or 45 min with cold shower)
    // SCIENTIFIC NOTE: Core temp drops ~0.5°C/hour post-exercise
    // Research shows 90-180 min for return to baseline
    // Cold water immersion accelerates this significantly
    let cooldownHours = 2;
    if (coldShower) cooldownHours = 0.75; // 45 minutes
    if (type === 'walk') cooldownHours = 0; // Walk/yoga doesn't raise core temp significantly

    const cooldownComplete = workoutEnd + (cooldownHours * 60);

    // RULE 5: Check zone timing
    if (workoutStart >= forbiddenStart && workoutStart < forbiddenEnd && type !== 'walk') {
        warnings.push({
            type: 'danger',
            icon: '🚫',
            title: 'FORBIDDEN ZONE WORKOUT',
            text: 'Exercising during your Forbidden Zone will stack exercise cortisol with your natural "Second Wind". Only walking/yoga is safe here.'
        });
        status = 'danger';
    } else if (workoutStart >= goldenEnd && workoutStart < forbiddenStart) {
        if (type !== 'walk' && status !== 'danger') {
            status = 'caution';
        }
    } else if (workoutStart >= goldenStart && workoutStart <= goldenEnd) {
        if (status !== 'danger' && status !== 'caution') {
            status = 'optimal';
        }
    }

    // Calculate final sleep time
    let predictedSleep = baseSleepTime - adenosineBonus + cortisolDelay;

    // Thermal hard stop - can't sleep until cooled down
    let thermalBlocked = false;
    if (cooldownComplete > predictedSleep) {
        thermalDelay = cooldownComplete - predictedSleep;
        predictedSleep = cooldownComplete;
        thermalBlocked = true;

        if (thermalDelay > 30 && !coldShower && type !== 'walk') {
            warnings.push({
                type: 'warning',
                icon: '🌡️',
                title: 'THERMAL BLOCK',
                text: `Drugs will clear, but your core temp won't drop until ${minutesToTime(cooldownComplete > 24*60 ? cooldownComplete - 24*60 : cooldownComplete)}. Consider a cold shower to cut cooldown time.`
            });
        }
    }

    // Special case: Walk/yoga is always OK
    if (type === 'walk') {
        status = warnings.length > 0 ? 'caution' : 'optimal';
        if (workoutStart >= forbiddenStart) {
            warnings = [{
                type: 'success',
                icon: '✅',
                title: 'SAFE ACTIVITY',
                text: 'Walking and yoga are the only "green light" activities during the Forbidden Zone or late evening. Good choice!'
            }];
            status = 'optimal';
        }
    }

    // Build recommendation text
    let recommendation = '';
    if (status === 'optimal') {
        if (workoutStart >= goldenStart && workoutStart <= goldenEnd) {
            recommendation = `Perfect timing! This ${type === 'lifting' ? 'lifting session' : type === 'zone2' ? 'cardio session' : type === 'walk' ? 'activity' : 'workout'} will maximize sleep pressure without spiking evening cortisol.`;
        } else {
            recommendation = 'This workout should have minimal negative impact on your sleep.';
        }
    } else if (status === 'caution') {
        recommendation = 'This workout may delay sleep. Review the warnings and consider adjustments.';
    } else {
        recommendation = 'This workout will significantly harm your sleep. Strongly consider rescheduling or changing type.';
    }

    return {
        status,
        workoutStart,
        workoutEnd,
        cooldownComplete,
        baseSleepTime,
        predictedSleep,
        adenosineBonus,
        cortisolDelay,
        thermalDelay,
        thermalBlocked,
        warnings,
        recommendation,
        showColdShowerOption: thermalBlocked && !coldShower && type !== 'walk'
    };
}

// BUG FIX 3: Early return if workout not applied
function updateWorkoutPlan() {
    if (!state.workoutPlan || !state.workoutPlan.applied) {
        return;
    }

    const impact = calculateWorkoutImpact();
    if (!impact) return;

    const resultDiv = document.getElementById('workoutResult');
    const headerDiv = document.getElementById('workoutResultHeader');
    const textDiv = document.getElementById('workoutResultText');
    const detailsDiv = document.getElementById('workoutResultDetails');
    const coldShowerDiv = document.getElementById('coldShowerOption');
    const applyBtn = document.getElementById('applyWorkoutBtn');

    // Show result divs
    if (resultDiv) resultDiv.style.display = 'block';
    if (headerDiv) headerDiv.style.display = 'block';
    if (textDiv) textDiv.style.display = 'block';
    if (detailsDiv) detailsDiv.style.display = 'block';

    // Update styling based on status
    resultDiv.className = `workout-result-${impact.status}`;
    resultDiv.style.borderLeftColor = impact.status === 'optimal' ? '#5E8A5E' : impact.status === 'caution' ? '#C4923A' : '#B85C5C';
    resultDiv.style.background = impact.status === 'optimal' ? 'rgba(94, 138, 94, 0.1)' : impact.status === 'caution' ? 'rgba(196, 146, 58, 0.1)' : 'rgba(184, 92, 92, 0.1)';

    // Update header
    const statusIcons = { optimal: '✅ GOLDEN SLOT', caution: '⚠️ PROCEED WITH CAUTION', danger: '🚫 NOT RECOMMENDED' };
    const statusColors = { optimal: '#5E8A5E', caution: '#C4923A', danger: '#B85C5C' };
    headerDiv.textContent = statusIcons[impact.status];
    headerDiv.style.color = statusColors[impact.status];

    // Build text content
    let textContent = `<div style="margin-bottom: 10px;">${impact.recommendation}</div>`;

    // Add warnings
    if (impact.warnings.length > 0) {
        impact.warnings.forEach(w => {
            const wColor = w.type === 'danger' ? '#B85C5C' : w.type === 'warning' ? '#C4923A' : '#5E8A5E';
            textContent += `
                <div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 8px; border-left: 3px solid ${wColor};">
                    <div style="font-weight: 600; color: ${wColor};">${w.icon} ${w.title}</div>
                    <div style="font-size: 0.9em; margin-top: 4px;">${w.text}</div>
                </div>
            `;
        });
    }

    textDiv.innerHTML = textContent;

    // Build details
    const sleepTimeFormatted = minutesToTime(impact.predictedSleep > 24*60 ? impact.predictedSleep - 24*60 : impact.predictedSleep);
    const baseSleepFormatted = minutesToTime(impact.baseSleepTime > 24*60 ? impact.baseSleepTime - 24*60 : impact.baseSleepTime);

    // Convert adenosine bonus to threshold bonus for display
    const thresholdBonus = Math.min(3.0, (impact.adenosineBonus || 0) / 15);

    let detailsContent = `
        <div class="workout-impact-item">
            <span>Base Sleep Time (drugs only)</span>
            <span>${baseSleepFormatted}</span>
        </div>
    `;

    if (thresholdBonus > 0) {
        detailsContent += `
            <div class="workout-impact-item">
                <span>Adenosine Bonus (threshold↑)</span>
                <span class="workout-impact-positive">+${thresholdBonus.toFixed(1)}mg tolerance</span>
            </div>
        `;
    }

    if (impact.cortisolDelay > 0) {
        detailsContent += `
            <div class="workout-impact-item">
                <span>Cortisol Delay</span>
                <span class="workout-impact-negative">+${impact.cortisolDelay} min</span>
            </div>
        `;
    }

    if (impact.thermalDelay > 0) {
        detailsContent += `
            <div class="workout-impact-item">
                <span>Thermal Cooldown Block</span>
                <span class="workout-impact-negative">+${Math.round(impact.thermalDelay)} min</span>
            </div>
        `;
    }

    detailsContent += `
        <div class="workout-impact-item" style="font-weight: 600; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06);">
            <span>Predicted Sleep After Workout</span>
            <span style="color: ${statusColors[impact.status]};">${sleepTimeFormatted}</span>
        </div>
    `;

    detailsDiv.innerHTML = detailsContent;

    // Show/hide cold shower option
    coldShowerDiv.style.display = impact.showColdShowerOption ? 'block' : 'none';

    // Show apply button
    applyBtn.style.display = 'block';

    // Update timeline
    updateWorkoutTimeline();
}

function toggleFastedState() {
    // Just trigger update - checkbox handles its own state
}

function applyWorkoutPlan() {
    const impact = calculateWorkoutImpact();
    if (!impact) return;

    const type = document.getElementById('workoutType').value;

    // Store ALL workout impacts in state (CRITICAL FIX)
    state.workoutPlan = {
        active: true,
        time: document.getElementById('workoutTime').value,
        duration: parseInt(document.getElementById('workoutDuration').value),
        type: type,
        intensity: document.getElementById('workoutIntensity').value,
        fasted: document.getElementById('workoutFasted').checked,
        coldShower: document.getElementById('coldShowerToggle').checked,
        applied: true,
        // Store calculated impacts for use in calculateSleepTime
        adenosineBonus: impact.adenosineBonus || 0,
        cortisolDelay: impact.cortisolDelay || 0,
        thermalDelay: impact.thermalDelay || 0,
        cooldownComplete: impact.cooldownComplete || null
    };

    // Also update the heavyLift modifier for backward compatibility
    if (type === 'lifting' || type === 'zone2') {
        state.modifiers.heavyLift.active = true;
        const liftToggle = document.getElementById('liftToggle');
        if (liftToggle) liftToggle.checked = true;
    }

    // Save and recalculate - THIS NOW ACTUALLY AFFECTS THE MAIN COUNTDOWN
    saveState();
    recalculate();

    // Show success with actual impact
    const netImpact = (impact.cortisolDelay + impact.thermalDelay) - impact.adenosineBonus;
    const impactText = netImpact > 0 ? `+${netImpact} min` : `${netImpact} min`;
    showToast(`Workout applied! Net impact: ${impactText} to sleep time`, '🏋️');

    // Update button to show it's applied
    const btn = document.getElementById('applyWorkoutBtn');
    btn.textContent = '✓ Workout Applied';
    btn.style.background = '#5E8A5E';

    // Show reset button
    const resetBtn = document.getElementById('resetWorkoutBtn');
    if (resetBtn) resetBtn.style.display = 'block';
}

function resetWorkoutPlan() {
    // Reset workout plan in state
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

    // Also reset the heavyLift modifier
    state.modifiers.heavyLift.active = false;
    const liftingEl = document.querySelector('[data-modifier="heavyLift"]');
    if (liftingEl) liftingEl.classList.remove('active');

    // Reset UI
    const applyBtn = document.getElementById('applyWorkoutBtn');
    if (applyBtn) {
        applyBtn.textContent = '✓ Apply This Workout to Calculation';
        applyBtn.style.background = '#5E8A5E';
    }

    const resetBtn = document.getElementById('resetWorkoutBtn');
    if (resetBtn) resetBtn.style.display = 'none';

    // Reset form
    document.getElementById('workoutFasted').checked = false;
    document.getElementById('coldShowerToggle').checked = false;

    // Save and recalculate
    saveState();
    recalculate();
    initWorkoutPlanner(); // Re-initialize preview

    showToast('Workout plan reset', '🔄');
}

function restoreWorkoutPlanUI() {
    const wp = state.workoutPlan;
    if (!wp || !wp.applied) return;

    // Restore form values
    const timeInput = document.getElementById('workoutTime');
    const durationInput = document.getElementById('workoutDuration');
    const typeSelect = document.getElementById('workoutType');
    const intensitySelect = document.getElementById('workoutIntensity');
    const fastedCheckbox = document.getElementById('workoutFasted');
    const coldShowerCheckbox = document.getElementById('coldShowerToggle');

    if (timeInput && wp.time) timeInput.value = wp.time;
    if (durationInput && wp.duration) durationInput.value = wp.duration;
    if (typeSelect && wp.type) typeSelect.value = wp.type;
    if (intensitySelect && wp.intensity) intensitySelect.value = wp.intensity;
    if (fastedCheckbox) fastedCheckbox.checked = wp.fasted || false;
    if (coldShowerCheckbox) coldShowerCheckbox.checked = wp.coldShower || false;

    // Update button to show applied state
    const btn = document.getElementById('applyWorkoutBtn');
    if (btn) {
        btn.textContent = '✓ Workout Applied';
        btn.style.background = '#5E8A5E';
        btn.style.display = 'block';
    }

    // Show reset button
    const resetBtn = document.getElementById('resetWorkoutBtn');
    if (resetBtn) resetBtn.style.display = 'block';

    // Update the workout preview
    updateWorkoutPlan();
}

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
    const section = document.querySelector('.accordion-section[data-section="whatif"]');
    if (section && !section.classList.contains('open')) return;

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

    // Scenario 4: Sauna session (if not already active)
    const saunaSleep = simulateSauna();
    updateScenarioDisplay('Sauna', saunaSleep, baseSleepTime);

    // Scenario 5: One more vape hit
    const vapeSleep = simulateNicotineHit('vape');
    updateScenarioDisplay('Vape', vapeSleep, baseSleepTime);

    // Scenario 6: Switch to Zyn
    const zynSleep = simulateNicotineHit('pouch');
    updateScenarioDisplay('Zyn', zynSleep, baseSleepTime);
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

function simulateSauna() {
    if (state.modifiers.sauna.active) {
        return calculateSleepTime().sleepTime;
    }

    // Temporarily activate sauna
    const wasActive = state.modifiers.sauna.active;

    state.modifiers.sauna.active = true;

    const { sleepTime } = calculateSleepTime();

    // Restore
    state.modifiers.sauna.active = wasActive;

    return sleepTime;
}

function simulateNicotineHit(type) {
    const now = getCurrentMinutes();
    const nowTime = `${Math.floor(now / 60).toString().padStart(2, '0')}:${(now % 60).toString().padStart(2, '0')}`;

    // Store current state
    const wasActive = state.nicotine.active;
    const oldType = state.nicotine.type;
    const oldTime = state.nicotine.lastHitTime;

    // Temporarily set nicotine
    state.nicotine.active = true;
    state.nicotine.type = type;
    state.nicotine.lastHitTime = nowTime;

    const { sleepTime } = calculateSleepTime();

    // Restore
    state.nicotine.active = wasActive;
    state.nicotine.type = oldType;
    state.nicotine.lastHitTime = oldTime;

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
        case 'sauna':
            if (!state.modifiers.sauna.active) {
                state.modifiers.sauna.active = true;
                state.modifiers.sauna.time = nowTime;
                state.modifiers.sauna.date = getLocalDateString();
                const saunaToggle = document.getElementById('saunaToggle');
                if (saunaToggle) saunaToggle.checked = true;
                document.getElementById('saunaTime').value = nowTime;
                updateModifierTimeInputs();
                showToast('🧖 Sauna session added!');
            } else {
                showToast('Sauna already active');
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

        // Reset workout planner UI
        const applyBtn = document.getElementById('applyWorkoutBtn');
        if (applyBtn) {
            applyBtn.textContent = '✓ Apply This Workout to Calculation';
            applyBtn.style.background = '#5E8A5E';
            applyBtn.style.display = 'none';
        }

        renderMedEntries();
        renderCaffeineEntries();
        renderFocusCaffeineList(); // FIX Bug 5: Sync Focus Mode on clear
        document.querySelectorAll('.modifier-item').forEach(el => el.classList.remove('active'));
        updateModifierTimeInputs();
        initWorkoutPlanner(); // Re-initialize workout planner
        recalculate();
        saveState();
        showToast('Today cleared');
    }
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
    const baseThreshold = state.settings.sleepThreshold;
    const sleepDebtBonus = calculateSleepDebtBonus();
    const ampLoad = calculateAmpLoad(getCurrentMinutes());
    const caffLoad = calculateCaffLoad(getCurrentMinutes());
    const forbiddenZone = getForbiddenZone();
    const sleepGate = getSleepGate();

    // Calculate modifier bonuses
    let liftBonus = 0;
    let saunaBonus = 0;
    let workoutBonus = 0;

    if (state.workoutPlan && state.workoutPlan.applied && state.workoutPlan.adenosineBonus > 0) {
        workoutBonus = Math.min(3.0, state.workoutPlan.adenosineBonus / 15);
    } else if (state.modifiers.heavyLift && state.modifiers.heavyLift.active) {
        liftBonus = 2.0;
    }

    if (state.modifiers.sauna && state.modifiers.sauna.active) {
        const saunaTime = timeToMinutes(state.modifiers.sauna.time);
        const nowMins = getCurrentMinutes();
        const fivePM = 17 * 60;
        const todayStr = getLocalDateString();
        const saunaDate = state.modifiers.sauna.date || todayStr;
        let saunaTaken = false;

        // Date-aware sauna check (matches getEffectiveThreshold logic)
        const todayDate = parseLocalDate(todayStr);
        const saunaSetDate = parseLocalDate(saunaDate);
        const daysDiff = Math.round((todayDate - saunaSetDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            saunaTaken = nowMins >= saunaTime;
        } else if (daysDiff === 1) {
            if (nowMins < 6 * 60 && saunaTime >= 17 * 60) {
                saunaTaken = true;
            } else {
                saunaTaken = false;
            }
        } else {
            saunaTaken = false;
        }

        if (saunaTaken) {
            // Mirror decay logic from getEffectiveThreshold()
            let hoursSinceSauna;
            if (daysDiff === 0) {
                hoursSinceSauna = (nowMins - saunaTime) / 60;
            } else {
                hoursSinceSauna = ((24 * 60 - saunaTime) + nowMins) / 60;
            }
            const peakDuration = 2;
            const decayDuration = 4;
            let decayFactor = 1.0;
            if (hoursSinceSauna > peakDuration) {
                decayFactor = Math.max(0, 1.0 - (hoursSinceSauna - peakDuration) / decayDuration);
            }
            const baseBonus = saunaTime >= fivePM ? 2.0 : 1.0;
            saunaBonus = baseBonus * decayFactor;
        }
    }

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
    if (state.modifiers.sauna && state.modifiers.sauna.active) {
        modifierDetails.push(`• Sauna: Scheduled at ${state.modifiers.sauna.time} → +${saunaBonus.toFixed(1)}mg threshold (parasympathetic)`);
    }
    if (state.modifiers.heavyLift && state.modifiers.heavyLift.active && !state.workoutPlan?.applied) {
        modifierDetails.push(`• Heavy Lifting: Active → +${liftBonus.toFixed(1)}mg threshold (adenosine)`);
    }
    if (state.workoutPlan && state.workoutPlan.applied) {
        modifierDetails.push(`• Workout Plan: Applied`);
        if (state.workoutPlan.adenosineBonus > 0) {
            modifierDetails.push(`  - Adenosine bonus: ${state.workoutPlan.adenosineBonus} min → +${workoutBonus.toFixed(1)}mg threshold`);
        }
        if (state.workoutPlan.cortisolDelay > 0) {
            modifierDetails.push(`  - Cortisol delay: +${state.workoutPlan.cortisolDelay} min (HPA axis)`);
        }
        if (state.workoutPlan.cooldownComplete) {
            modifierDetails.push(`  - Thermal cooldown until: ${minutesToTime(state.workoutPlan.cooldownComplete)}`);
        }
    }
    if (state.nicotine && state.nicotine.active && state.nicotine.lastHitTime) {
        const typeInfo = NICOTINE_CONSTANTS[state.nicotine.type] || NICOTINE_CONSTANTS.vape;
        const lastHitMins = timeToMinutes(state.nicotine.lastHitTime);
        let elapsed = getCurrentMinutes() - lastHitMins;
        if (elapsed < 0) elapsed += 24 * 60;

        let impact = 'MINIMAL';
        if (elapsed < typeInfo.highImpactEnd) impact = 'HIGH';
        else if (elapsed < typeInfo.moderateImpactEnd) impact = 'MODERATE';
        else if (elapsed < typeInfo.minimalImpactEnd) impact = 'LOW';

        modifierDetails.push(`• Nicotine (${state.nicotine.type}): Last at ${state.nicotine.lastHitTime} → ${impact} impact (advisory only)`);
    }
    if (modifierDetails.length === 0) {
        modifierDetails.push('None active');
    }

    // Build blocking factors
    let blockingDetails = [];
    blockingFactors.forEach(f => {
        if (f.type === 'nicotine-advisory') {
            blockingDetails.push(`• ${f.name}: ${f.impact} impact (quality modifier, not blocker)`);
        } else {
            const clearTime = f.clearsAt !== null ? minutesToTimeWithDay(f.clearsAt) : 'N/A';
            blockingDetails.push(`• ${f.name}: Clears at ${clearTime}${f.note ? ' - ' + f.note : ''}`);
        }
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

  HOW MODIFIERS AFFECT THRESHOLD:
  → Modifiers do NOT make drugs leave faster
  → They RAISE your tolerance (effective threshold goes UP)
  → Heavy lifting floods brain with adenosine from muscle breakdown
  → Sauna triggers parasympathetic rebound
  → Higher threshold = drug curve crosses it EARLIER = earlier sleep

┌─────────────────────────────────────────────────────────────┐
│ 6. EFFECTIVE THRESHOLD CALCULATION                          │
└─────────────────────────────────────────────────────────────┘
  Base threshold:              ${baseThreshold.toFixed(1)} mg
  + Sleep debt bonus:          +${sleepDebtBonus.toFixed(1)} mg
  + Workout/Lift bonus:        +${(workoutBonus + liftBonus).toFixed(1)} mg
  + Sauna bonus:               +${saunaBonus.toFixed(1)} mg
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
