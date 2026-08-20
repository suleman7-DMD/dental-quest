// ============================================
// MEDICATION & CAFFEINE CRUD (Phase 4)
// ============================================

function addMedEntry(dose = 50, time = null) {
    const now = new Date();
    const defaultTime = time || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = getLocalDateString(now); // YYYY-MM-DD format

    // FIX: Use object with unique ID key instead of array
    const id = generateId('med');
    const entry = { id, dose, time: defaultTime, date: today, updatedAt: now.toISOString() };
    if (!state.medications || Array.isArray(state.medications)) {
        state.medications = migrateArrayToObject(state.medications, 'med');
    }
    state.medications[id] = entry;
    renderMedEntries();
    recalculate();
    saveState();
}

// Clean up old medications from previous days
// Called on init and day change
function cleanupOldMedications() {
    const today = getLocalDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    // FIX: Work with object instead of array
    if (!state.medications) state.medications = {};
    if (Array.isArray(state.medications)) {
        state.medications = migrateArrayToObject(state.medications, 'med');
    }

    // Keep today's meds and yesterday's meds (for overnight decay)
    // Remove anything older
    const originalCount = getCount(state.medications);
    const idsToDelete = [];
    Object.entries(state.medications).forEach(([id, med]) => {
        if (!med) return;
        if (!med.date) { med.date = today; return; } // Legacy entries: stamp today so they clean up tomorrow
        if (med.date !== today && med.date !== yesterdayStr) {
            idsToDelete.push(id);
        }
    });
    idsToDelete.forEach(id => delete state.medications[id]);

    if (getCount(state.medications) !== originalCount) {
        saveState();
    }
}

function removeMedEntry(id) {
    // FIX: Delete from object instead of filter array
    if (state.medications && state.medications[id]) {
        // Tombstone BEFORE delete so the removal survives cross-device merges
        if (!state.tombstones) state.tombstones = { meds: {}, caffeine: {}, sleepDays: {} };
        if (!state.tombstones.meds) state.tombstones.meds = {};
        state.tombstones.meds[String(id)] = new Date().toISOString();
        delete state.medications[id];
    }
    renderMedEntries();
    recalculate();
    saveState();
}

function updateMedEntry(id, field, value) {
    // FIX: Direct object access instead of .find()
    const med = state.medications ? state.medications[id] : null;
    if (med) {
        if (field === 'dose') {
            med.dose = parseInt(value);
            // Only re-render for dose changes (affects stacking warning display)
            renderMedEntries();
        } else if (field === 'time') {
            med.time = value;
            // DON'T re-render for time changes - it destroys the active input!
            // The stacking warning only depends on dose, not time
        } else if (field === 'date') {
            // FIX Bug 4: Allow date changes in All-Nighter Mode
            med.date = value;
            renderMedEntries(); // Re-render to update date selector color
            renderGhostLoad(); // Update ghost load display
        }
        med.updatedAt = new Date().toISOString();
        // Always recalculate and save
        recalculate();
        saveState();
    }
}

function renderMedEntries() {
    const container = document.getElementById('medEntries');
    const today = getLocalDateString(new Date());

    // FIX: Use getValues() to iterate object as array
    const meds = getValues(state.medications);
    // FIX (bug 11): only TODAY's meds can be "stacked" — a cloud merge can pull in yesterday's doses
    const todayMedIds = meds.filter(m => (m.date || today) === today).map(m => m.id);
    container.innerHTML = meds.map((med, index) => {
        const medDate = med.date || today;
        const isToday = medDate === today;
        // Use string ID with quotes in onclick handlers
        const dateSelector = `
            <input type="date" value="${medDate}" max="${today}" onchange="updateMedEntry('${med.id}', 'date', this.value)" style="font-size: 0.75em; padding: 4px; background: var(--sc-surface, #1A1D25); border: 1px solid var(--sc-border, rgba(255,255,255,0.08)); border-radius: 4px; color: ${isToday ? 'var(--sc-accent, #5EAA8D)' : 'var(--sc-warning, #D4A05A)'}; width: 110px;">
        `;

        return `
        <div class="med-entry sc-med-entry">
            ${dateSelector}
            <select onchange="updateMedEntry('${med.id}', 'dose', this.value)">
                <option value="20" ${med.dose === 20 ? 'selected' : ''}>20mg XR</option>
                <option value="30" ${med.dose === 30 ? 'selected' : ''}>30mg XR</option>
                <option value="40" ${med.dose === 40 ? 'selected' : ''}>40mg XR (20+20)</option>
                <option value="50" ${med.dose === 50 ? 'selected' : ''}>50mg XR (30+20)</option>
                <option value="60" ${med.dose === 60 ? 'selected' : ''}>60mg XR (30+30)</option>
                <option value="70" ${med.dose === 70 ? 'selected' : ''}>70mg XR (30+20+20)</option>
            </select>
            <input type="time" value="${med.time}" onchange="updateMedEntry('${med.id}', 'time', this.value)">
            ${todayMedIds.indexOf(med.id) > 0 ? '<span class="stacking-warning">⚠️ STACKED</span>' : ''}
            <button class="remove-btn sc-btn sc-btn--ghost" onclick="removeMedEntry('${med.id}')">×</button>
        </div>
    `}).join('');

    // Update stacking warning panel
    updateStackingWarning();
}

// Helper function to format date labels
function formatDateLabel(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = parseLocalDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === getLocalDateString(yesterday)) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateStackingWarning() {
    const warningEl = document.getElementById('stackingWarning');
    if (!warningEl) return;

    // FIX (bug 11): only count TODAY's meds — a cloud merge can pull in yesterday's doses
    const today = getLocalDateString(new Date());
    const meds = getValues(state.medications).filter(m => (m.date || today) === today);
    const totalDose = meds.reduce((sum, m) => sum + m.dose, 0);
    const numDoses = meds.length;
    const sleepDebt = Math.max(0, 8 - state.hoursSleptLastNight);

    if (numDoses > 1) {
        let riskLevel = 'moderate';
        let riskColor = '#D4A05A';

        // High risk if: stacking + no sleep debt (fighting drug "naked")
        if (sleepDebt < 2 && totalDose >= 60) {
            riskLevel = 'high';
            riskColor = '#C76B6B';
        }

        warningEl.style.display = 'block';
        warningEl.style.borderColor = `rgba(${riskLevel === 'high' ? '199, 107, 107' : '212, 160, 90'}, 0.4)`;
        warningEl.style.background = `rgba(${riskLevel === 'high' ? '199, 107, 107' : '212, 160, 90'}, 0.15)`;

        warningEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="font-weight: 700; color: ${riskColor};">
                    ⚠️ DOSE STACKING DETECTED
                </div>
                <div style="font-size: 0.9em; color: ${riskColor};">
                    Total: ${totalDose}mg
                </div>
            </div>
            <div style="color: #8B92A0; line-height: 1.5;">
                <strong>The Math:</strong> Adding a second dose doesn't just raise the peak – it <em>widens the base</em> of the elimination curve.
                That ${meds[1]?.dose || 20}mg "booster" often adds <strong>4-6+ hours</strong> of wakefulness, not just more focus.
            </div>
            ${sleepDebt < 2 ? `
                <div style="margin-top: 10px; padding: 8px; background: rgba(184, 92, 92, 0.15); border-radius: 6px; color: #B85C5C;">
                    <strong>🚨 HIGH RISK:</strong> You're well-rested (${sleepDebt.toFixed(1)}hr debt). Your brain has NO adenosine pressure to fight this extra drug. You're fighting it "naked."
                </div>
            ` : ''}
            <div style="margin-top: 10px; font-size: 0.85em; color: #8B92A0;">
                <strong>Escape hatches:</strong> Vitamin C flush at 5 PM
            </div>
        `;
    } else if (totalDose >= 60) {
        // Single high dose warning
        warningEl.style.display = 'block';
        warningEl.style.borderColor = 'rgba(196, 146, 58, 0.3)';
        warningEl.style.background = 'rgba(196, 146, 58, 0.1)';

        warningEl.innerHTML = `
            <div style="color: #C4923A; font-weight: 600; margin-bottom: 6px;">
                💊 High Dose Warning: ${totalDose}mg
            </div>
            <div style="color: #8B92A0; font-size: 0.9em;">
                Doses above 50mg extend clearance time disproportionately. Consider if you really need this much today.
            </div>
        `;
    } else {
        warningEl.style.display = 'none';
    }
}

function addCaffeine(amount, name) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = getLocalDateString(now);
    // FIX: Use object with ID key instead of array push
    const id = generateId('caf');
    if (!state.caffeine || Array.isArray(state.caffeine)) {
        state.caffeine = migrateArrayToObject(state.caffeine, 'caf');
    }
    state.caffeine[id] = { id, amount, name, time, date: today, updatedAt: now.toISOString() };
    renderCaffeineEntries();
    renderFocusCaffeineList(); // FIX Bug 5: Keep Focus Mode in sync
    recalculate();
    saveState();
}

function addCustomCaffeine() {
    const amount = prompt('Enter caffeine amount in mg:');
    if (!amount) return;
    const mg = parseFloat(amount);
    if (isNaN(mg) || mg <= 0 || mg > 1000) {
        showToast('Invalid amount');
        return;
    }
    addCaffeine(mg, 'Custom');
}

function removeCaffeine(id) {
    // FIX: Delete from object instead of filter array
    if (state.caffeine && state.caffeine[id]) {
        // Tombstone BEFORE delete so the removal survives cross-device merges
        if (!state.tombstones) state.tombstones = { meds: {}, caffeine: {}, sleepDays: {} };
        if (!state.tombstones.caffeine) state.tombstones.caffeine = {};
        state.tombstones.caffeine[String(id)] = new Date().toISOString();
        delete state.caffeine[id];
    }
    renderCaffeineEntries();
    renderFocusCaffeineList(); // FIX Bug 5: Keep Focus Mode in sync
    recalculate();
    saveState();
}

function renderCaffeineEntries() {
    const container = document.getElementById('caffeineEntries');
    if (!container) return;
    const today = getLocalDateString(new Date());

    // FIX: Use getValues() to iterate object
    const caffArray = getValues(state.caffeine);
    container.innerHTML = caffArray.map((caff, index) => {
        const isSipPart = caff.sipGroup !== undefined;
        const sipBadge = isSipPart ? `<span style="font-size: 0.7em; color: #6B7C5E; margin-left: 6px;">(sip ${caff.sipPart}/${caff.sipTotal})</span>` : '';

        // Always show date picker for max precision
        const caffDate = caff.date || today;
        const isToday = caffDate === today;
        // Use string ID in onclick handlers
        const dateSelector = `
            <input type="date" value="${caffDate}" max="${today}" onchange="updateCaffeineDate('${caff.id}', this.value)" style="font-size: 0.7em; padding: 3px; background: var(--sc-surface-warm, #F5F2ED); border: 1px solid var(--sc-border, rgba(0,0,0,0.12)); border-radius: 4px; color: ${isToday ? 'var(--sc-accent-green, #5E8A5E)' : 'var(--sc-warning, #C4923A)'}; width: 100px;">
        `;

        return `
        <div class="caffeine-entry sc-caff-entry" ${isSipPart ? 'style="background: rgba(107, 124, 94, 0.08); border-color: rgba(107, 124, 94, 0.15);"' : ''}>
            ${dateSelector}
            <span class="caffeine-info">${escapeHtml(caff.name)} (${caff.amount}mg)${sipBadge}</span>
            <input type="time" value="${caff.time}" onchange="updateCaffeineTime('${caff.id}', this.value)"
                   style="padding: 4px 8px; background: var(--sc-surface-warm, #F5F2ED); border: 1px solid var(--sc-border, rgba(0,0,0,0.12)); border-radius: 6px; color: var(--sc-text, #2C2825); font-size: 0.85em; width: 100px;">
            <button class="remove-btn sc-btn sc-btn--ghost" style="width: 24px; height: 24px; font-size: 1em;" onclick="removeCaffeine('${caff.id}')">×</button>
        </div>
    `}).join('');
}

// FIX: Change from index-based to ID-based access
function updateCaffeineTime(id, newTime) {
    if (state.caffeine && state.caffeine[id]) {
        state.caffeine[id].time = newTime;
        state.caffeine[id].updatedAt = new Date().toISOString();
        recalculate();
        saveState();

        // Update Focus View if active
        if (focusMode) {
            renderFocusCaffeineList();
            updateFocusSleepDisplay();
        }
    }
}

// FIX Bug 4: Allow date changes for caffeine in All-Nighter Mode
// FIX: Change from index-based to ID-based access
function updateCaffeineDate(id, newDate) {
    if (state.caffeine && state.caffeine[id]) {
        state.caffeine[id].date = newDate;
        state.caffeine[id].updatedAt = new Date().toISOString();
        renderCaffeineEntries(); // Re-render to update date selector color
        renderFocusCaffeineList(); // Keep Focus Mode in sync
        renderGhostLoad(); // Update ghost load display
        recalculate();
        saveState();
    }
}
