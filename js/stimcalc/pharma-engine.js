// ============================================
// PHARMACOKINETIC ENGINE
// Extracted from stimulant-elimination-calculator.html (Phase 2)
// Dependencies: state.js (globals, time helpers)
// ============================================

// ============================================
// VITAMIN C MODEL
// ============================================
// Vitamin C acidifies urine → increases amphetamine excretion → shorter half-life
// Effect lasts ~8 hours, then urinary pH returns to normal

var VITAMIN_C_EFFECT_HOURS = 8;

function getVitaminCTimeMinutes() {
    if (!state.modifiers.vitaminC.active) return Infinity;

    const today = getLocalDateString();
    // Guard against stale "today"/"tomorrow" strings in state
    let vitCDate = state.modifiers.vitaminC.date || today;
    if (vitCDate === 'today') vitCDate = today;
    if (vitCDate === 'tomorrow') {
        const tom = new Date(); tom.setDate(tom.getDate() + 1);
        vitCDate = getLocalDateString(tom);
    }
    const baseMinutes = timeToMinutes(state.modifiers.vitaminC.time);

    // Calculate day offset from today
    const todayDate = parseLocalDate(today);
    const targetDate = parseLocalDate(vitCDate);
    const daysDiff = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

    // Calculate effective Vitamin C time (in today's minute scale)
    const vitCTimeMinutes = baseMinutes + (daysDiff * 24 * 60);

    // EXPIRATION CHECK: Vitamin C effect only lasts ~8 hours
    // After that, urinary pH returns to normal and half-life is back to baseline
    const now = getCurrentMinutes();
    const hoursSinceVitC = (now - vitCTimeMinutes) / 60;

    // If Vitamin C was taken more than 8 hours ago, it's expired
    if (hoursSinceVitC > VITAMIN_C_EFFECT_HOURS) {
        return Infinity; // Expired - no longer effective
    }

    // CRITICAL FIX: For FUTURE VitC times, return the scheduled time
    // This allows sleep predictions to factor in when VitC WILL be taken
    // The calculation `atMinutes > vitCTime` handles whether it's effective at each evaluated time
    return vitCTimeMinutes;
}

// Returns raw VitC time in minutes WITHOUT expiration check
// Used by calculateAmpLoad() which evaluates at arbitrary future times
// and needs to handle expiration per-evaluation-point, not per-current-time
function getRawVitaminCTimeMinutes() {
    if (!state.modifiers.vitaminC.active) return Infinity;

    const today = getLocalDateString();
    // Guard against stale "today"/"tomorrow" strings in state
    let vitCDate = state.modifiers.vitaminC.date || today;
    if (vitCDate === 'today') vitCDate = today;
    if (vitCDate === 'tomorrow') {
        const tom = new Date(); tom.setDate(tom.getDate() + 1);
        vitCDate = getLocalDateString(tom);
    }
    const baseMinutes = timeToMinutes(state.modifiers.vitaminC.time);

    const todayDate = parseLocalDate(today);
    const targetDate = parseLocalDate(vitCDate);
    const daysDiff = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));

    return baseMinutes + (daysDiff * 24 * 60);
}

// Check if Vitamin C is currently effective (within TTL window)
// Returns true only if VitC is active, not expired, AND not in the future
function isVitaminCEffective() {
    if (!state.modifiers.vitaminC.active) return false;
    const vitCTime = getVitaminCTimeMinutes();
    if (vitCTime === Infinity) return false; // Expired
    const now = getCurrentMinutes();
    if (now < vitCTime) return false; // Not yet taken (future)
    return true; // Currently active and within TTL window
}

// Get Vitamin C status for UI display: 'effective', 'expired', 'future', or 'inactive'
function getVitaminCStatus() {
    if (!state.modifiers.vitaminC.active) return 'inactive';

    const today = getLocalDateString();
    const vitCDate = state.modifiers.vitaminC.date || today;
    const baseMinutes = timeToMinutes(state.modifiers.vitaminC.time);

    const todayDate = parseLocalDate(today);
    const targetDate = parseLocalDate(vitCDate);
    const daysDiff = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));
    const vitCTimeMinutes = baseMinutes + (daysDiff * 24 * 60);

    const now = getCurrentMinutes();
    const hoursSinceVitC = (now - vitCTimeMinutes) / 60;

    if (hoursSinceVitC < 0) return 'future';  // Not yet taken
    if (hoursSinceVitC > VITAMIN_C_EFFECT_HOURS) return 'expired';
    return 'effective';
}

// ============================================
// PROCESS S: Sleep Debt / Adenosine Pressure
// ============================================
// Scientific basis: Sleep pressure (Process S) is CUMULATIVE.
// Sleeping 4 hours Mon/Tue doesn't reset with 8 hours on Wed.
// The adenosine "debt" carries forward and affects your threshold.

// BUG FIX: Previously set hyperarousalMode as a global side effect inline.
// Now explicitly sets it at the end with clear intent, return value unchanged.
function calculateSleepDebtBonus() {
    const today = new Date();
    let totalDeficit = 0;
    let daysWithData = 0;

    // Start with today's deficit
    const todayDeficit = Math.max(0, 8 - state.hoursSleptLastNight);
    totalDeficit += todayDeficit;
    daysWithData++;

    // CRITICAL: Hyperarousal detection for TODAY
    // Acute deprivation (<4 hrs) triggers cortisol/adrenaline response
    // This makes sleep HARDER, not easier - the adenosine is counteracted
    if (state.hoursSleptLastNight < 4) {
        const result = { bonus: 0, isHyperarousal: true };
        hyperarousalMode = result.isHyperarousal;  // Still set global for backward compat
        return result.bonus;
    }

    // Add deficit from previous 2 days (3-day rolling total)
    // Weight: Today = 100%, Yesterday = 70%, Day before = 40%
    // This models how sleep debt decays but doesn't fully clear
    const weights = [0.7, 0.4]; // Yesterday, day before

    for (let i = 1; i <= 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString(date);

        const entry = state.sleepHistory[dateStr];
        if (entry) {
            let hoursSlept = 8; // Default assumption

            // Handle both old format (number) and new format (object)
            if (typeof entry === 'number') {
                hoursSlept = entry;
            } else if (typeof entry === 'object' && entry.hoursSlept !== undefined) {
                hoursSlept = entry.hoursSlept;
            }
            // NaN guard: corrupted data defaults to 8h (no deficit assumed)
            if (isNaN(hoursSlept) || hoursSlept < 0) hoursSlept = 8;

            const dayDeficit = Math.max(0, 8 - hoursSlept);
            totalDeficit += dayDeficit * weights[i - 1];
            daysWithData++;
        }
    }

    // Convert deficit to threshold bonus
    // Each hour of deficit adds ~1.0mg to threshold (reduced from 1.5 since we're cumulative now)
    // Cap at +6mg to prevent unrealistic values
    const bonus = Math.min(6, totalDeficit * 1.0);

    // Log for debugging
    if (totalDeficit > 0) {
    }

    const result = { bonus: bonus, isHyperarousal: false };
    hyperarousalMode = result.isHyperarousal;  // Still set global for backward compat
    return result.bonus;  // Return value unchanged
}

// Get detailed breakdown of 3-day sleep debt for display
function getSleepDebtBreakdown() {
    const today = new Date();
    const breakdown = [];

    // Today
    const todayDeficit = Math.max(0, 8 - state.hoursSleptLastNight);
    breakdown.push({
        label: 'Today',
        hours: state.hoursSleptLastNight,
        deficit: todayDeficit,
        weight: 1.0,
        weighted: todayDeficit * 1.0
    });

    // Yesterday and day before
    const weights = [0.7, 0.4];
    const labels = ['Yesterday', '2 days ago'];

    for (let i = 1; i <= 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString(date);

        const entry = state.sleepHistory[dateStr];
        if (entry) {
            let hoursSlept = 8;
            if (typeof entry === 'number') {
                hoursSlept = entry;
            } else if (typeof entry === 'object' && entry.hoursSlept !== undefined) {
                hoursSlept = entry.hoursSlept;
            }

            const dayDeficit = Math.max(0, 8 - hoursSlept);
            breakdown.push({
                label: labels[i - 1],
                hours: hoursSlept,
                deficit: dayDeficit,
                weight: weights[i - 1],
                weighted: dayDeficit * weights[i - 1],
                hasData: true
            });
        } else {
            breakdown.push({
                label: labels[i - 1],
                hours: null,
                deficit: 0,
                weight: weights[i - 1],
                weighted: 0,
                hasData: false
            });
        }
    }

    return breakdown;
}

// ============================================
// EFFECTIVE THRESHOLD CALCULATION
// ============================================
// Scientific basis: Modifiers don't make drugs leave faster.
// They change your TOLERANCE via different mechanisms:
// - Sleep debt → Adenosine accumulation → Higher tolerance
// - Heavy lifting → Adenosine flood → Higher tolerance
// - Sauna → Parasympathetic drive → Higher tolerance
// This means you can fall asleep with MORE drug in your system.

function getEffectiveThreshold() {
    const baseThreshold = state.settings.sleepThreshold;
    let threshold = baseThreshold;

    // 1. Sleep Debt Bonus (Process S - Adenosine pressure)
    threshold += calculateSleepDebtBonus();

    // 2. Exercise Bonus (Adenosine from muscle breakdown)
    // Heavy lifting floods the brain with adenosine, which can override
    // the dopaminergic arousal from amphetamines
    if (state.workoutPlan && state.workoutPlan.applied) {
        // Workout plan provides adenosine bonus
        if (state.workoutPlan.adenosineBonus > 0) {
            // Convert time bonus to threshold bonus
            // ~15 min adenosine bonus ≈ +1.0mg threshold
            const thresholdBonus = Math.min(3.0, state.workoutPlan.adenosineBonus / 15);
            threshold += thresholdBonus;
        }
    } else if (state.modifiers.heavyLift && state.modifiers.heavyLift.active) {
        // Legacy heavy lift modifier
        threshold += 2.0;
    }

    // 3. Sauna Bonus (Parasympathetic activation)
    // Sauna triggers heat shock proteins and subsequent parasympathetic
    // rebound, increasing sleep drive independent of adenosine
    // FIX: Now uses date tracking like Vitamin C for cross-midnight accuracy
    if (state.modifiers.sauna && state.modifiers.sauna.active) {
        const saunaTime = timeToMinutes(state.modifiers.sauna.time);
        const now = getCurrentMinutes();
        const fivePM = 17 * 60;
        const today = getLocalDateString();
        const saunaDate = state.modifiers.sauna.date || today;

        // Calculate if sauna has been taken (date-aware)
        let saunaTaken = false;

        // Parse dates to compare
        const todayDate = parseLocalDate(today);
        const saunaSetDate = parseLocalDate(saunaDate);
        const daysDiff = Math.round((todayDate - saunaSetDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            // Sauna set for today - check if time has passed
            saunaTaken = now >= saunaTime;
        } else if (daysDiff === 1) {
            // Sauna was set yesterday
            // Effect lasts until wake time of next day (~12 hours max)
            // If it's early morning (before 6 AM), yesterday's evening sauna still counts
            if (now < 6 * 60 && saunaTime >= 17 * 60) {
                saunaTaken = true;
            } else {
                saunaTaken = false; // Stale from yesterday
            }
        } else {
            // Sauna set 2+ days ago - definitely stale
            saunaTaken = false;
        }

        if (saunaTaken) {
            // Calculate hours since sauna for time-based decay
            // Parasympathetic rebound peaks ~1-2h post-sauna, decays over ~4h
            let hoursSinceSauna;
            if (daysDiff === 0) {
                hoursSinceSauna = (now - saunaTime) / 60;
            } else {
                // Cross-midnight: sauna was yesterday
                hoursSinceSauna = ((24 * 60 - saunaTime) + now) / 60;
            }

            // Peak for first 2 hours, then linear decay over next 4 hours (6h total)
            const peakDuration = 2;
            const decayDuration = 4;
            let decayFactor = 1.0;
            if (hoursSinceSauna > peakDuration) {
                decayFactor = Math.max(0, 1.0 - (hoursSinceSauna - peakDuration) / decayDuration);
            }

            const baseBonus = saunaTime >= fivePM ? 2.0 : 1.0;
            threshold += baseBonus * decayFactor;
        }
    }

    // Cap the total threshold to prevent unrealistic values
    // Max effective threshold = base + 8mg (extreme sleep debt + all modifiers)
    const maxThreshold = baseThreshold + 8;
    return Math.min(threshold, maxThreshold);
}

function isHyperarousalMode() {
    return hyperarousalMode;
}

// Calculate drug decay with proper 3-segment Vitamin C handling
// Segments: before VitC (base HL) → during VitC 8h window (reduced HL) → after VitC expiry (base HL)
// This fixes the bug where reduced half-life was applied indefinitely past the 8-hour TTL
function calculateDecayWithVitC(initialAmount, doseStartTime, atMinutes,
                                 baseHL, reducedHL, vitCTime, vitCExpireTime) {
    if (atMinutes <= doseStartTime) return initialAmount;

    const vitCActive = vitCTime !== Infinity;

    // Case 1: No VitC active, or dose started after VitC expired
    if (!vitCActive || doseStartTime >= vitCExpireTime) {
        return initialAmount * Math.pow(0.5, (atMinutes - doseStartTime) / baseHL);
    }

    // Case 2: Evaluation is before VitC kicks in
    if (atMinutes <= vitCTime) {
        return initialAmount * Math.pow(0.5, (atMinutes - doseStartTime) / baseHL);
    }

    // Case 3: Multi-segment decay (dose may span VitC boundaries)
    let remaining = initialAmount;
    let cursor = doseStartTime;

    // Segment A: Before VitC onset (base HL)
    if (cursor < vitCTime) {
        const segEnd = Math.min(vitCTime, atMinutes);
        remaining *= Math.pow(0.5, (segEnd - cursor) / baseHL);
        cursor = segEnd;
    }

    if (cursor >= atMinutes) return remaining;

    // Segment B: During VitC window (reduced HL)
    if (cursor < vitCExpireTime) {
        const segEnd = Math.min(vitCExpireTime, atMinutes);
        remaining *= Math.pow(0.5, (segEnd - cursor) / reducedHL);
        cursor = segEnd;
    }

    if (cursor >= atMinutes) return remaining;

    // Segment C: After VitC expired (base HL again)
    remaining *= Math.pow(0.5, (atMinutes - cursor) / baseHL);

    return remaining;
}

// Calculate amphetamine load at a given time (in minutes from midnight)
// FIXED: Now handles date stamps and midnight rollovers correctly
// UPDATED: Now supports Vitamin C "tomorrow" setting via getVitaminCTimeMinutes()
// FIXED: VitC 8-hour TTL now properly enforced at each evaluated time point
function calculateAmpLoad(atMinutes) {
    let totalLoad = 0;
    const baseHalfLife = state.settings.ampHalfLife * 60; // Convert to minutes
    // FIX: Use raw VitC time (no expiration check against current time)
    // Expiration is now handled per-evaluation-point inside calculateDecayWithVitC()
    const vitCTime = getRawVitaminCTimeMinutes();
    const reducedHalfLife = baseHalfLife * 0.7; // 30% reduction
    const vitCExpireTime = vitCTime + (VITAMIN_C_EFFECT_HOURS * 60); // 8-hour TTL
    const today = getLocalDateString();

    // FIX: Use getValues() for object iteration
    getValues(state.medications).forEach(med => {
        const baseDoseTime = timeToMinutes(med.time);
        const totalDose = med.dose;
        const medDate = med.date || today;

        // Calculate days offset from today (positive = past, negative = future)
        const todayDate = parseLocalDate(today);
        const doseDate = parseLocalDate(medDate);
        const daysDiff = Math.round((todayDate - doseDate) / (1000 * 60 * 60 * 24));

        // Skip future doses (daysDiff < 0)
        if (daysDiff < 0) return;

        // GHOST LOAD FIX: Always include yesterday's residual (daysDiff === 1)
        // With 11h half-life, yesterday's 60mg still has ~15mg active at 8 AM
        // Only skip doses older than yesterday in normal mode
        if (daysDiff > 1 && !state.allNighterMode) return;

        // Skip very old doses (>72 hours = ~6 half-lives, essentially zero)
        if (daysDiff > 3) return;

        // Adjust dose time by days offset (e.g., yesterday 8 PM = -240 mins from midnight today)
        const effectiveDoseTime = baseDoseTime - (daysDiff * 24 * 60);

        // For old doses (>12 hours ago), use simplified decay (XR fully released)
        const elapsed = atMinutes - effectiveDoseTime;
        if (elapsed < 0) return; // Dose hasn't happened yet

        // XR splits into two releases: 50% immediate, 50% delayed at T+4h
        const immediateRelease = totalDose * 0.5;
        const delayedRelease = totalDose * 0.5;
        const delayedReleaseTime = effectiveDoseTime + 240; // T+4 hours

        // Calculate IR component using 3-segment VitC decay (handles TTL expiration)
        if (atMinutes >= effectiveDoseTime) {
            totalLoad += calculateDecayWithVitC(
                immediateRelease, effectiveDoseTime, atMinutes,
                baseHalfLife, reducedHalfLife, vitCTime, vitCExpireTime
            );
        }

        // Calculate DR component using 3-segment VitC decay
        if (atMinutes >= delayedReleaseTime) {
            totalLoad += calculateDecayWithVitC(
                delayedRelease, delayedReleaseTime, atMinutes,
                baseHalfLife, reducedHalfLife, vitCTime, vitCExpireTime
            );
        }
    });

    return totalLoad;
}

// Calculate caffeine load at a given time
// UPDATED: Handles arbitrary past dates via days-difference calculation
function calculateCaffLoad(atMinutes) {
    let totalLoad = 0;
    const halfLife = state.settings.caffHalfLife * 60; // in minutes
    const today = getLocalDateString();

    getValues(state.caffeine).forEach(caff => {
        const baseDoseTime = timeToMinutes(caff.time);
        const caffDate = caff.date || today;

        // Calculate days offset from today (positive = past, negative = future)
        const todayDate = parseLocalDate(today);
        const doseDate = parseLocalDate(caffDate);
        const daysDiff = Math.round((todayDate - doseDate) / (1000 * 60 * 60 * 24));

        // Skip future caffeine (daysDiff < 0)
        if (daysDiff < 0) return;

        // GHOST LOAD FIX: Include yesterday's caffeine residual
        // With 5h half-life, late afternoon coffee still has ~15mg active next morning
        // Only skip doses older than yesterday in normal mode
        if (daysDiff > 1 && !state.allNighterMode) return;

        // Skip very old caffeine (>48 hours = ~10 half-lives at 5hr, essentially zero)
        if (daysDiff > 2) return;

        // Adjust dose time by days offset
        // daysDiff=1 means yesterday, so subtract 24*60 minutes
        const effectiveDoseTime = baseDoseTime - (daysDiff * 24 * 60);

        // Only count if the dose has already occurred
        if (atMinutes >= effectiveDoseTime) {
            const elapsed = atMinutes - effectiveDoseTime;
            totalLoad += caff.amount * Math.pow(0.5, elapsed / halfLife);
        }
    });

    return totalLoad;
}

// Find when amphetamine clears threshold
// FIX: DR-aware search — binary search alone assumes monotonic decrease,
// but XR delayed-release at T+4h creates non-monotonic spikes.
// After finding initial clearance, verify load stays below threshold at ALL future DR release times.
function findAmpClearTime() {
    const threshold = getEffectiveThreshold();

    if (getCount(state.medications) === 0) return null;

    const now = getCurrentMinutes();
    const maxSearchHours = state.allNighterMode ? 48 : 36;
    const maxTime = now + maxSearchHours * 60;

    // Collect ALL future DR release times (XR releases 50% at T+4h)
    const drReleaseTimes = [];
    const today = getLocalDateString();
    getValues(state.medications).forEach(med => {
        const baseDoseTime = timeToMinutes(med.time);
        const medDate = med.date || today;
        const todayDate = parseLocalDate(today);
        const doseDate = parseLocalDate(medDate);
        const daysDiff = Math.round((todayDate - doseDate) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0 || daysDiff > 3) return;
        if (daysDiff > 1 && !state.allNighterMode) return;
        const effectiveDoseTime = baseDoseTime - (daysDiff * 24 * 60);
        const drTime = effectiveDoseTime + 240;
        if (drTime > now) drReleaseTimes.push(drTime);
    });
    drReleaseTimes.sort((a, b) => a - b);

    // Check if already below threshold now AND at all future DR release points
    if (calculateAmpLoad(now) < threshold) {
        let allClear = true;
        for (const drTime of drReleaseTimes) {
            if (calculateAmpLoad(drTime) >= threshold) { allClear = false; break; }
        }
        if (allClear) return now;
    }

    // Iterative: binary search, then verify against DR spikes
    let searchStart = now;
    let clearTime = maxTime;

    for (let iteration = 0; iteration < 10; iteration++) {
        let low = searchStart;
        let high = maxTime;
        while (high - low > 1) {
            const mid = Math.floor((low + high) / 2);
            if (calculateAmpLoad(mid) > threshold) { low = mid; } else { high = mid; }
        }
        clearTime = high;

        // Verify: no DR spike after clearTime pushes load back above threshold
        let reSpike = false;
        for (const drTime of drReleaseTimes) {
            if (drTime > clearTime && calculateAmpLoad(drTime) >= threshold) {
                searchStart = drTime; // Restart search from DR spike
                reSpike = true;
                break;
            }
        }
        if (!reSpike) break;
    }

    return (calculateAmpLoad(clearTime) >= threshold) ? maxTime : clearTime;
}

// Find when caffeine clears threshold
function findCaffClearTime() {
    const threshold = state.settings.caffThreshold;

    if (getCount(state.caffeine) === 0) return null;

    // Extend to 36 hours in all-nighter mode (caffeine half-life ~5h so clears faster)
    const now = getCurrentMinutes();
    let low = now;
    const maxSearchHours = state.allNighterMode ? 36 : 24;
    let high = now + maxSearchHours * 60;

    if (calculateCaffLoad(now) < threshold) {
        return now;
    }

    while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        if (calculateCaffLoad(mid) > threshold) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return high;
}

// ============================================
// GHOST LOAD (Yesterday's Residual)
// ============================================

// Get yesterday's medications for display
function getYesterdayMedications() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    // FIX: Use getValues() for object
    return getValues(state.medications).filter(med => med.date === yesterdayStr);
}

// Get yesterday's caffeine for display
function getYesterdayCaffeine() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    return getValues(state.caffeine).filter(caff => caff.date === yesterdayStr);
}

// Calculate remaining load from a yesterday dose
// FIX: Now uses XR IR/DR split for accuracy and consistent with calculateAmpLoad()
// FIX: Calculates real elapsed time using Date objects to handle DST transitions (23h or 25h days)
// BUG FIX: Now uses calculateDecayWithVitC() for amphetamine when VitC was active yesterday
function calculateYesterdayDoseRemaining(dose, doseTimeMinutes, halfLifeHours, isXR = true) {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(Math.floor(doseTimeMinutes / 60), doseTimeMinutes % 60, 0, 0);

    const realElapsed = (now.getTime() - yesterday.getTime()) / 60000;
    const halfLifeMinutes = halfLifeHours * 60;

    // FIX: Handle XR formulation (50% immediate, 50% delayed at T+4)
    if (isXR && halfLifeHours >= 10) {  // Only XR for amphetamines (long half-life)
        const immediateRelease = dose * 0.5;
        const delayedRelease = dose * 0.5;

        // BUG FIX: Use calculateDecayWithVitC() for consistency with main engine
        // Calculate yesterday's dose time in today's minute scale
        const effectiveDoseTime = doseTimeMinutes - (24 * 60); // Yesterday = -1440 offset
        const delayedReleaseTime = effectiveDoseTime + 240; // T+4 hours
        const vitCTime = getRawVitaminCTimeMinutes();
        const reducedHalfLife = halfLifeMinutes * 0.7;
        const vitCExpireTime = vitCTime + (VITAMIN_C_EFFECT_HOURS * 60);
        const atMinutes = getCurrentMinutes();

        const irRemaining = calculateDecayWithVitC(
            immediateRelease, effectiveDoseTime, atMinutes,
            halfLifeMinutes, reducedHalfLife, vitCTime, vitCExpireTime
        );

        const drRemaining = atMinutes >= delayedReleaseTime
            ? calculateDecayWithVitC(
                delayedRelease, delayedReleaseTime, atMinutes,
                halfLifeMinutes, reducedHalfLife, vitCTime, vitCExpireTime
            )
            : 0;  // DR not yet released — still in capsule, not in bloodstream

        return irRemaining + drRemaining;
    }

    // Simple decay for caffeine or non-XR
    const effectiveElapsed = realElapsed;
    return dose * Math.pow(0.5, effectiveElapsed / halfLifeMinutes);
}
