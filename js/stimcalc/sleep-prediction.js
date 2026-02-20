// ============================================
// SLEEP PREDICTION ENGINE
// Extracted from stimulant-elimination-calculator.html (Phase 2)
// Dependencies: state.js, circadian.js, pharma-engine.js
// ============================================

// Calculate projected sleep time
// 7-phase algorithm combining pharmacokinetics, circadian rhythm,
// workout effects, and nicotine to predict earliest possible sleep onset
function calculateSleepTime() {
    const ampClear = findAmpClearTime();
    const caffClear = findCaffClearTime();
    const effectiveThreshold = getEffectiveThreshold();
    const now = getCurrentMinutes();

    let sleepTime = now;
    let blockingFactors = [];

    // =============================================
    // PHASE 1: ESTABLISH HARD PHARMACOKINETIC FLOOR
    // =============================================
    // This is the EARLIEST possible sleep time based on drug clearance
    // NO modifier can push sleep time earlier than this
    let pharmacokineticFloor = now;

    // FIX: Always add substances as blockers when above threshold (even if not the bottleneck)
    // so users see both amp AND caffeine in the blocking factors list
    if (ampClear !== null && ampClear > now) {
        blockingFactors.push({
            name: 'Amphetamine',
            clearsAt: ampClear,
            type: 'drug'
        });
        if (ampClear > pharmacokineticFloor) {
            pharmacokineticFloor = ampClear;
            sleepTime = ampClear;
        }
    }

    if (caffClear !== null && caffClear > now) {
        blockingFactors.push({
            name: 'Caffeine',
            clearsAt: caffClear,
            type: 'drug'
        });
        if (caffClear > pharmacokineticFloor) {
            pharmacokineticFloor = caffClear;
            sleepTime = caffClear;
        }
    }

    // =============================================
    // PHASE 2: CIRCADIAN CONSTRAINTS
    // =============================================
    // CRITICAL: Both Forbidden Zone AND Wake Maintenance Zone are HARD BLOCKERS
    // You CANNOT fall asleep during these periods - biology prevents it
    //
    // Timeline (example with 9:50 AM wake):
    // - Wake Maintenance Zone: 8:50 PM - 10:50 PM (2 hours before FZ)
    // - Forbidden Zone: 10:50 PM - 12:50 AM (13-15 hours after wake)
    // - Sleep Gate: 12:50 AM+ (optimal window opens)

    const forbiddenZone = getForbiddenZone();
    const wakeMaintenanceStart = forbiddenZone.start - (2 * 60); // 2 hours before forbidden zone

    // CRITICAL FIX: Calculate hours until drug clearance
    // If drugs won't clear for 18+ hours, today's circadian rhythm doesn't apply
    // (user will likely sleep and wake before then, resetting their rhythm)
    const hoursUntilClearance = (sleepTime - now) / 60;
    const applyCircadianConstraints = hoursUntilClearance < 18;

    let sleepTimeNormalized = sleepTime;
    if (sleepTime < timeToMinutes(state.wakeTime)) {
        sleepTimeNormalized = sleepTime + 24 * 60;
    }

    // Check if in Wake Maintenance Zone - this is a HARD BLOCKER
    // During WMZ, circadian alerting signal is at maximum
    // ONLY apply if drug clearance is within current circadian cycle
    if (applyCircadianConstraints && sleepTimeNormalized >= wakeMaintenanceStart && sleepTimeNormalized < forbiddenZone.start) {
        const forbiddenEnd = forbiddenZone.end;
        blockingFactors.push({
            name: 'Wake Maintenance Zone',
            clearsAt: forbiddenEnd > 24 * 60 ? forbiddenEnd - 24 * 60 : forbiddenEnd,
            type: 'circadian',
            note: 'Pre-forbidden zone - circadian alerting prevents sleep onset'
        });
        sleepTime = forbiddenEnd;
    }
    // Check if in Forbidden Zone - push to after it ends
    else if (applyCircadianConstraints && sleepTimeNormalized >= forbiddenZone.start && sleepTimeNormalized < forbiddenZone.end) {
        const forbiddenEnd = forbiddenZone.end;
        blockingFactors.push({
            name: 'Forbidden Zone (Circadian)',
            clearsAt: forbiddenEnd > 24 * 60 ? forbiddenEnd - 24 * 60 : forbiddenEnd,
            type: 'circadian',
            note: 'Peak alertness period - your body strongly resists sleep'
        });
        sleepTime = forbiddenEnd;
    }

    // =============================================
    // PHASE 3: TIME-BASED BLOCKERS ONLY
    // =============================================
    // SCIENTIFIC NOTE: The threshold-based modifiers (lifting, sauna) have
    // been moved to getEffectiveThreshold(). This section now only handles
    // TRUE TIME-BASED BLOCKERS - things that physically prevent sleep onset.
    //
    // Threshold modifiers (now in getEffectiveThreshold):
    //   - Sleep debt → raises threshold (adenosine accumulation)
    //   - Lifting → raises threshold (adenosine from muscle)
    //   - Sauna → raises threshold (parasympathetic drive)
    //
    // Time-based blockers (kept here):
    //   - Cortisol delay → pushes sleep later (HPA axis activation)
    //   - Thermal cooldown → pushes sleep later (can't sleep while hot)

    // WORKOUT PLAN - TIME-BASED BLOCKERS ONLY
    if (state.workoutPlan && state.workoutPlan.applied) {
        const wp = state.workoutPlan;

        // Cortisol delay (increases sleep time - this is a REAL time blocker)
        // Fasted training or intense exercise elevates cortisol for ~2-3 hours
        if (wp.cortisolDelay > 0) {
            sleepTime += wp.cortisolDelay;
            blockingFactors.push({
                name: 'Workout Cortisol',
                clearsAt: sleepTime,
                type: 'workout',
                note: `+${wp.cortisolDelay} min from ${wp.fasted ? 'fasted training' : 'exercise stress'}`
            });
        }

        // Thermal cooldown is a HARD BLOCKER (can't sleep until cooled down)
        // Core body temperature must drop for sleep onset - this is physics, not chemistry
        if (wp.cooldownComplete !== null) {
            let cooldownTime = wp.cooldownComplete;

            // Normalize cooldown time for comparison
            let normalizedCooldown = cooldownTime;
            let normalizedNow = now;

            // Handle times that cross midnight
            if (cooldownTime < 6 * 60 && now > 18 * 60) {
                normalizedCooldown += 24 * 60;
            }
            if (now < 6 * 60 && cooldownTime > 18 * 60) {
                normalizedNow += 24 * 60;
            }

            // Only apply thermal block if cooldown is STILL IN THE FUTURE
            if (normalizedCooldown > normalizedNow) {
                let normalizedSleep = sleepTime;
                if (sleepTime < 6 * 60 && now > 18 * 60) {
                    normalizedSleep += 24 * 60;
                }

                if (normalizedCooldown > normalizedSleep) {
                    sleepTime = cooldownTime;
                    blockingFactors.push({
                        name: 'Thermal Cooldown',
                        clearsAt: sleepTime,
                        type: 'thermal',
                        note: `Core temp won't drop until ${minutesToTime(sleepTime)}${wp.coldShower ? ' (cold shower helped)' : ''}`
                    });
                }
            }
        }
    }

    // NOTE: Sauna and Heavy Lift bonuses are NO LONGER applied as time modifiers.
    // They now raise the sleep threshold in getEffectiveThreshold(), which
    // naturally causes the drug curve to cross the (higher) threshold earlier.
    // This is the scientifically accurate model - these activities don't make
    // drugs leave your body faster, they increase your tolerance to sleep
    // with higher drug levels.

    // =============================================
    // NICOTINE INTEGRATION - ADVISORY ONLY
    // =============================================
    // Nicotine is a QUALITY MODIFIER, not a hard blocker
    // Sleep IS possible with recent nicotine, just may be lighter or delayed
    if (state.nicotine && state.nicotine.active && state.nicotine.lastHitTime) {
        const typeInfo = NICOTINE_CONSTANTS[state.nicotine.type] || NICOTINE_CONSTANTS.vape;
        const lastHitMins = timeToMinutes(state.nicotine.lastHitTime);
        let elapsed = now - lastHitMins;
        if (elapsed < 0) elapsed += 24 * 60;

        // Only show as advisory if within impact window
        if (elapsed < typeInfo.minimalImpactEnd) {
            let impactLevel = 'MINIMAL';
            if (elapsed < typeInfo.highImpactEnd) impactLevel = 'HIGH';
            else if (elapsed < typeInfo.moderateImpactEnd) impactLevel = 'MODERATE';
            else if (elapsed < typeInfo.minimalImpactEnd) impactLevel = 'LOW';

            if (impactLevel === 'HIGH' || impactLevel === 'MODERATE') {
                blockingFactors.push({
                    name: `Nicotine (${typeInfo.description})`,
                    clearsAt: null,
                    type: 'nicotine-advisory',
                    impact: impactLevel,
                    note: impactLevel === 'HIGH' ? 'Peak arousal' : 'Moderate arousal'
                });
            }
        }
    }

    // =============================================
    // PHASE 5: FINAL CIRCADIAN CLAMP
    // =============================================
    // After all other factors (cortisol, thermal), re-check circadian constraints
    // Sleep time should NEVER be in WMZ or FZ after all adjustments
    let normalizedFinalSleep = sleepTime;
    if (sleepTime < timeToMinutes(state.wakeTime)) {
        normalizedFinalSleep = sleepTime + 24 * 60;
    }

    // Check both Wake Maintenance Zone AND Forbidden Zone
    // FIX: Gate on applyCircadianConstraints (same as Phase 2) to prevent
    // overriding pharmacokinetic floor when clearance is >18h away
    if (applyCircadianConstraints && normalizedFinalSleep >= wakeMaintenanceStart && normalizedFinalSleep < forbiddenZone.end) {
        sleepTime = forbiddenZone.end;

        // Add blocking factor if not already present
        const hasCircadianBlocker = blockingFactors.some(f => f.type === 'circadian');
        if (!hasCircadianBlocker) {
            blockingFactors.push({
                name: normalizedFinalSleep < forbiddenZone.start ? 'Wake Maintenance Zone' : 'Forbidden Zone',
                clearsAt: sleepTime,
                type: 'circadian',
                note: 'Circadian alerting prevents sleep in this window'
            });
        }
    }

    // =============================================
    // PHASE 6: PHARMACOKINETIC FLOOR ENFORCEMENT
    // =============================================
    // Circadian adjustments must NEVER push sleep time before drug clearance.
    // Compare in normalized space to handle midnight wrapping correctly.
    const wakeMin = timeToMinutes(state.wakeTime);
    let sleepNorm = sleepTime < wakeMin ? sleepTime + 1440 : sleepTime;
    let floorNorm = pharmacokineticFloor < wakeMin ? pharmacokineticFloor + 1440 : pharmacokineticFloor;
    if (sleepNorm < floorNorm) {
        sleepTime = pharmacokineticFloor;
    }

    // =============================================
    // PHASE 7: FINAL DRUG VERIFICATION
    // =============================================
    // Confirm both substances are actually below threshold at the predicted sleep time.
    // Uses raw minutes for accurate load calculation.
    const verifyTime = sleepTime;
    if (calculateAmpLoad(verifyTime) >= effectiveThreshold) {
        // Drugs haven't cleared — fall back to pharmacokinetic floor
        sleepTime = pharmacokineticFloor;
    }
    const caffThresh = state.settings.caffThreshold;
    if (calculateCaffLoad(verifyTime) >= caffThresh) {
        const caffClearCheck = findCaffClearTime();
        if (caffClearCheck !== null) {
            const caffClearNorm = caffClearCheck < wakeMin ? caffClearCheck + 1440 : caffClearCheck;
            const curSleepNorm = sleepTime < wakeMin ? sleepTime + 1440 : sleepTime;
            if (caffClearNorm > curSleepNorm) {
                sleepTime = caffClearCheck;
            }
        }
    }

    // Sort blocking factors by clear time
    blockingFactors.sort((a, b) => {
        let aTime = a.clearsAt || 0;
        let bTime = b.clearsAt || 0;
        // Normalize for comparison
        if (aTime < 6 * 60) aTime += 24 * 60;
        if (bTime < 6 * 60) bTime += 24 * 60;
        return bTime - aTime;
    });

    // Return both the final sleep time AND the raw drug clearance time
    // pharmacokineticFloor = when drugs clear (no circadian constraints)
    // sleepTime = final sleep time (after all constraints including circadian)
    return { sleepTime, blockingFactors, pharmacokineticFloor };
}
