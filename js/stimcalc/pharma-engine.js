// ============================================
// PHARMACOKINETIC ENGINE
// Extracted from stimulant-elimination-calculator.html (Phase 2)
// Dependencies: state.js (globals, time helpers)
// ============================================

// ============================================
// INPUT SANITIZERS
// ============================================
// NaN guard: a corrupted/blank settings value would poison every load
// calculation downstream (NaN propagates silently). Coerce to a sane default.
function numOr(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

// Legacy states stored 'today'/'tomorrow' literals for modifier dates;
// parseLocalDate() would NaN on them. Normalize to a real YYYY-MM-DD string.
function sanitizeModifierDate(dateStr) {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const today = new Date();
    if (dateStr === 'tomorrow') {
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        return getLocalDateString(t);
    }
    return getLocalDateString(today);
}

// ============================================
// VITAMIN C MODEL
// ============================================
// Vitamin C acidifies urine → increases amphetamine excretion → shorter half-life
// Effect lasts ~8 hours, then urinary pH returns to normal

var VITAMIN_C_EFFECT_HOURS = 8;

function getVitaminCTimeMinutes() {
    if (!state.modifiers.vitaminC.active) return Infinity;

    const today = getLocalDateString();
    const vitCDate = sanitizeModifierDate(state.modifiers.vitaminC.date);
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
    const vitCDate = sanitizeModifierDate(state.modifiers.vitaminC.date);
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
    const vitCDate = sanitizeModifierDate(state.modifiers.vitaminC.date);
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
    const sleepTarget = numOr(state.settings.sleepTarget, 8);
    const todayDeficit = Math.max(0, sleepTarget - state.hoursSleptLastNight);
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
            let hoursSlept = sleepTarget; // Default assumption

            // Handle both old format (number) and new format (object)
            if (typeof entry === 'number') {
                hoursSlept = entry;
            } else if (typeof entry === 'object' && entry.hoursSlept !== undefined) {
                hoursSlept = entry.hoursSlept;
            }
            // NaN guard: corrupted data defaults to target (no deficit assumed)
            if (isNaN(hoursSlept) || hoursSlept < 0) hoursSlept = sleepTarget;

            const dayDeficit = Math.max(0, sleepTarget - hoursSlept);
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
    const sleepTarget = numOr(state.settings.sleepTarget, 8);

    // Today
    const todayDeficit = Math.max(0, sleepTarget - state.hoursSleptLastNight);
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

            const dayDeficit = Math.max(0, sleepTarget - hoursSlept);
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
// EFFECTIVE THRESHOLD CALCULATION (v2, spec D2)
// ============================================
// Scientific basis: Modifiers don't make drugs leave faster.
// They change your TOLERANCE via adenosine pressure → Higher tolerance:
// - Sleep debt → Adenosine accumulation (time-invariant within a day)
// - Workout → Adenosine flood, then decays back over ~6h
// This means you can fall asleep with MORE drug in your system.
// v2: the threshold is TIME-VARYING. The workout bonus is evaluated at the
// requested minute so the clearance search actually sees its decay (fixes the
// old "frozen at now" bug). The three legacy exercise/heat bonuses are gone —
// a single time-decayed `workout` modifier replaces all of them.

function getEffectiveThresholdAt(atMinutes) {
    // calibration-aware base (Task 6); typeof guard covers script load order
    // (calibration.js loads after pharma-engine.js).
    let baseThreshold = (typeof getActiveBaseThreshold === 'function')
        ? getActiveBaseThreshold()
        : numOr(state.settings.sleepThreshold, 14);
    let threshold = baseThreshold;

    // Sleep Debt Bonus (Process S - Adenosine pressure) — time-invariant within a day
    threshold += calculateSleepDebtBonus();

    // Workout bonus (single chip, spec D4): peak +2.0mg (+1.0 more if intense),
    // holds until endTime+120min, then linear decay to 0 by endTime+360min.
    // Evaluated AT atMinutes so the clearance search sees the decay.
    const w = state.modifiers && state.modifiers.workout;
    if (w && w.active) {
        const today = getLocalDateString(new Date());
        if ((w.date || today) === today) {
            const endMin = timeToMinutes(w.endTime || '18:00');
            const peak = w.intense ? 3.0 : 2.0;
            const rel = atMinutes - endMin;   // minutes after workout end at evaluated time
            if (rel >= 0 && rel <= 120) threshold += peak;
            else if (rel > 120 && rel <= 360) threshold += peak * (1 - (rel - 120) / 240);
            // before end or >6h after: no bonus
        }
    }

    // Cap the total threshold to prevent unrealistic values
    // Max effective threshold = base + 8mg (extreme sleep debt + workout)
    return Math.min(threshold, baseThreshold + 8);
}

function getEffectiveThreshold() {
    return getEffectiveThresholdAt(getCurrentMinutes());
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
    const baseHalfLife = numOr(state.settings.ampHalfLife, 11) * 60; // Convert to minutes
    // FIX: Use raw VitC time (no expiration check against current time)
    // Expiration is now handled per-evaluation-point inside calculateDecayWithVitC()
    const vitCTime = getRawVitaminCTimeMinutes();
    // VitC honesty (spec D3): standard dose ~10% faster clearance; the 30% figure
    // only holds under the high-dose acidification protocol (state.settings.vitcHighDose).
    const reducedHalfLife = baseHalfLife * (state.settings.vitcHighDose ? 0.7 : 0.9);
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
    // Fitted caffeine half-life (Task 6); typeof guard covers script load order.
    const halfLife = ((typeof getActiveCaffHalfLife === 'function')
        ? getActiveCaffHalfLife()
        : numOr(state.settings.caffHalfLife, 5.5)) * 60; // in minutes
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
    // Threshold is TIME-VARYING (workout decay) — compare load against
    // getEffectiveThresholdAt(t) at every evaluated point, not a frozen value.
    if (getCount(state.medications) === 0) return null;

    const now = getCurrentMinutes();
    const maxSearchHours = state.allNighterMode ? 48 : 36;
    const maxTime = now + maxSearchHours * 60;

    // Collect ALL future re-spike times: XR delayed-release at T+4h AND future IR onsets
    const spikeTimes = [];
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
        if (drTime > now) spikeTimes.push(drTime);
        if (effectiveDoseTime > now) spikeTimes.push(effectiveDoseTime); // future IR onset also re-spikes load
    });
    spikeTimes.sort((a, b) => a - b);

    // Check if already below threshold now AND at all future DR release points
    if (calculateAmpLoad(now) < getEffectiveThresholdAt(now)) {
        let allClear = true;
        for (const drTime of spikeTimes) {
            if (calculateAmpLoad(drTime) >= getEffectiveThresholdAt(drTime)) { allClear = false; break; }
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
            if (calculateAmpLoad(mid) > getEffectiveThresholdAt(mid)) { low = mid; } else { high = mid; }
        }
        clearTime = high;

        // Verify: no DR spike after clearTime pushes load back above threshold
        let reSpike = false;
        for (const drTime of spikeTimes) {
            if (drTime > clearTime && calculateAmpLoad(drTime) >= getEffectiveThresholdAt(drTime)) {
                searchStart = drTime; // Restart search from DR spike
                reSpike = true;
                break;
            }
        }
        if (!reSpike) break;
    }

    // Threshold now varies with time (workout decay) — sweep forward to catch
    // a later re-crossing the binary search can't see.
    let sweepGuard = 0;
    let t = clearTime;
    while (sweepGuard < 5) {
        let violated = null;
        for (let m = t; m <= t + 360; m += 15) {
            if (calculateAmpLoad(m) > getEffectiveThresholdAt(m)) { violated = m; break; }
        }
        if (violated === null) break;
        // restart search from just past the violation
        t = violated + 1;
        while (t < violated + 1440 && calculateAmpLoad(t) > getEffectiveThresholdAt(t)) t += 5;
        sweepGuard++;
    }
    clearTime = t;

    return (calculateAmpLoad(clearTime) >= getEffectiveThresholdAt(clearTime)) ? maxTime : clearTime;
}

// Find when caffeine clears threshold
// Re-spike aware: a future same-day caffeine dose can push load back over
// threshold after an initial clearance, so we verify against those spike points.
function findCaffClearTime() {
    const threshold = numOr(state.settings.caffThreshold, 25);
    const now = getCurrentMinutes();
    const today = getLocalDateString(new Date());

    // Collect future same-day caffeine intake times (re-spike points)
    const spikeTimes = [];
    getValues(state.caffeine).forEach(c => {
        const cDate = c.date || today;
        if (cDate !== today) return;
        const t = timeToMinutes(c.time);
        if (t > now) spikeTimes.push(t);
    });
    spikeTimes.sort((a, b) => a - b);

    let searchStart = now;
    for (let iteration = 0; iteration < 10; iteration++) {
        if (calculateCaffLoad(searchStart) <= threshold) {
            // Verify no future spike pushes load back over threshold
            const violator = spikeTimes.find(t => t > searchStart && calculateCaffLoad(t + 1) > threshold);
            if (!violator) return searchStart === now ? null : searchStart;
            searchStart = violator + 1;
            continue;
        }
        // Binary search for crossing point within 24h of searchStart
        let lo = searchStart, hi = searchStart + 1440;
        if (calculateCaffLoad(hi) > threshold) return hi; // still not clear in 24h — cap
        for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            if (calculateCaffLoad(mid) > threshold) lo = mid; else hi = mid;
        }
        const candidate = Math.ceil(hi);
        const violator = spikeTimes.find(t => t > candidate && calculateCaffLoad(t + 1) > threshold);
        if (!violator) return candidate;
        searchStart = violator + 1;
    }
    return searchStart; // bounded fallback
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
