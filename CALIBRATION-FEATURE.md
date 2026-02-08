# Sleep Prediction Accuracy Tracking — Implementation Plan

## 1. ARCHAEOLOGY FINDINGS

### Existing Code (Substantial — ~80% of feature already built)

| Component | Location | Status |
|-----------|----------|--------|
| `state.history` data structure | Line 3104 | Working — stores `{id, date, predictedSleep, actualSleep, medications[], caffeine[], modifiers{}}` |
| `saveDay()` — manual prediction capture | Line 7207 | Working — requires button press |
| `autoPopulateFeedback()` — auto-fills actuals | Line 7244 | Working — uses next-day sleepHistory |
| `renderHistory()` — accuracy display | Line 7280 | **DEAD CODE** — targets `#historyList` which doesn't exist in unified view |
| `suggestCalibration()` — threshold tips | Line 8512 | Working but basic (only directional) |
| Feedback modal HTML | Line 2458 | Working but rarely used |
| CSS: `.history-accuracy`, `.history-predicted`, `.history-actual` | Lines 1279-1290 | Exists |
| Accuracy summary (collapsed header) | Lines 7349-7363 | **DEAD CODE** — targets `#historyAccuracySummary` which doesn't exist |
| `cleanupHistory()` — deduplication | Line 7367 | Working |

### Critical Finding
`renderHistory()` returns immediately at line 7282 (`if (!container) return;`) because `#historyList` was removed during the unified accordion UI overhaul. All history rendering, accuracy display, and summary computation is functional code that **never executes**.

### Recommendation: HYBRID
Restore the prediction history UI as a new accordion section, add auto-save, and enhance accuracy stats.

---

## 2. DATA MODEL

### No New State Structure — Enhance Existing `state.history`

`getDefaultState()` already includes `history: {}` (line 3104). `isEmptyState()` already checks it (line 3126). **No changes needed to either.**

### New Optional Fields on History Entries

```javascript
state.history[id] = {
    // EXISTING (unchanged):
    id, date, medications, caffeine, modifiers, predictedSleep, actualSleep, autoFilled,

    // NEW (optional, null-safe):
    deltaMinutes: null,       // actualSleep - predictedSleep (+ = slept later)
    absError: null,           // Math.abs(deltaMinutes)
    predictedAt: 'ISO',       // timestamp of last prediction update
    autoSaved: true,          // true = auto-captured, false = manual Save & Log
    lastUpdated: 'ISO',       // timestamp of last update
    inputs: {                 // snapshot of prediction inputs
        wakeTime, hoursSleptLastNight, ampLoadAtPrediction, caffLoadAtPrediction,
        effectiveThreshold, sleepDebtBonus, baseThreshold, ampHalfLife, caffHalfLife,
        totalAmpDose, totalCaffDose, hasWorkout, hasSauna, hasVitC, allNighterMode
    }
};
```

### Migration (Idempotent)

```javascript
function migrateHistoryEntries() {
    const entries = getValues(state.history);
    let changed = false;
    entries.forEach(entry => {
        if (entry.deltaMinutes === undefined) {
            if (entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep)) {
                entry.deltaMinutes = entry.actualSleep - entry.predictedSleep;
                entry.absError = Math.abs(entry.deltaMinutes);
            } else {
                entry.deltaMinutes = null;
                entry.absError = null;
            }
            changed = true;
        }
        if (entry.autoSaved === undefined) { entry.autoSaved = false; changed = true; }
        if (entry.inputs === undefined) { entry.inputs = null; changed = true; }
        if (entry.predictedAt === undefined) {
            const idParts = entry.id ? entry.id.split('_') : [];
            const ts = idParts.length >= 2 ? parseInt(idParts[1]) : null;
            entry.predictedAt = (ts && !isNaN(ts) && ts > 1000000000000) ? new Date(ts).toISOString() : null;
            changed = true;
        }
        if (state.history[entry.id]) state.history[entry.id] = entry;
    });
    return changed;
}
```

---

## 3. IMPLEMENTATION PLAN — Ordered Changes

### Step 1: Add CSS (after line 1290)
Insert accuracy dashboard styles: progress bars, delta classes, hero hint.

### Step 2: Add Hero Hint HTML (after line 2508)
Insert `<div id="accuracyHeroHint">` for mini accuracy display below projected sleep time.

### Step 3: Add Prediction Accuracy Accordion (after line 2892)
New `unified-perf-section` with accuracy dashboard panel between Sleep Performance and Recommendations.

### Step 4: Add Prediction History Accordion (after line 2963, before action buttons)
Restore `#historyList` container as a new accordion section so `renderHistory()` works again.

### Step 5: Add accordion default (line 10630)
Add `accuracy: false, predictionHistory: false` to restoreAccordionStates() defaults.

### Step 6: Add module-level throttle variables (after line 3117)
`lastAutoSavePredictionTime`, `lastAutoSavePredictionMinutes`.

### Step 7: Add utility function `computeSleepDelta()` (after line 3535)
Circular arithmetic for midnight crossing.

### Step 8: Add `snapshotPredictionInputs()` (after computeSleepDelta)
Captures current input state for analysis.

### Step 9: Add `calculateAccuracyMetrics()` (after snapshotPredictionInputs)
Computes deltaMinutes and absError for an entry.

### Step 10: Add `migrateHistoryEntries()` (after calculateAccuracyMetrics)
Backfills new fields for existing entries.

### Step 11: Add `autoSavePrediction()` (before saveDay at ~line 7205)
Auto-captures today's prediction with throttling.

### Step 12: Modify `saveDay()` (line 7207)
Deduplicate — find existing today entry and update instead of creating duplicate.

### Step 13: Modify `autoPopulateFeedback()` (line 7244)
Add deltaMinutes/absError calculation + feedback toast.

### Step 14: Enhance `renderHistory()` (line 7326)
Add delta line per entry showing "45 min late" etc.

### Step 15: Add toggle + render functions for accuracy dashboard (after line 7673)
`toggleAccuracyDashboard()`, `renderAccuracyDashboard()`, `renderAccuracyHeroHint()`.

### Step 16: Add accuracy calculator functions (before suggestCalibration at ~line 8510)
`calculateAccuracyStats()`, `getRecentPredictions()`, `getCalibrationRecommendation()`.

### Step 17: Hook `autoSavePrediction()` into `recalculate()` (line 5775)
After `updateForecastLogic()`, before the closing brace.

### Step 18: Call migration + accuracy render in init (after autoPopulateFeedback at line 10575)
Call `migrateHistoryEntries()`, then render accuracy dashboard.

---

## 4. CODE SNIPPETS

### 4A. CSS Additions (insert after line 1290)

```css
        /* Accuracy Dashboard */
        .accuracy-progress-bar {
            height: 6px;
            background: rgba(255,255,255,0.08);
            border-radius: 3px;
            overflow: hidden;
        }
        .accuracy-progress-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.5s ease;
        }
        .accuracy-fill-green {
            background: linear-gradient(90deg, #10b981, #34d399);
        }
        .accuracy-fill-blue {
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }
        .history-delta {
            font-size: 0.78em;
            margin-top: 2px;
        }
        .history-delta.delta-early { color: #10b981; }
        .history-delta.delta-close { color: #10b981; }
        .history-delta.delta-moderate { color: #f59e0b; }
        .history-delta.delta-late { color: #ef4444; }
        .accuracy-hero-hint {
            font-size: 0.72em;
            color: #8b9cb6;
            margin-top: 4px;
            opacity: 0.9;
        }
```

### 4B. Hero Hint HTML (insert after line 2508)

```html
            <div id="accuracyHeroHint" class="accuracy-hero-hint" style="display:none;"></div>
```

### 4C. Accuracy Dashboard Panel HTML (insert after line 2892)

```html
        <!-- ======= Prediction Accuracy Dashboard ======= -->
        <div class="unified-perf-section">
            <h3 onclick="toggleAccuracyDashboard()" style="cursor:pointer; user-select:none;">
                📊 Prediction Accuracy
                <span id="accuracyToggleIcon" style="float:right; font-size:0.7em;">▼</span>
            </h3>
            <div id="accuracyDashboardContent">
                <div id="accuracyGradeBanner" style="text-align:center; padding:12px; margin-bottom:12px; border-radius:10px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2);">
                    <div style="font-size:0.75em; color:#8b9cb6; text-transform:uppercase; letter-spacing:1px;">Overall Accuracy</div>
                    <div id="accuracyGradeValue" style="font-size:2em; font-weight:700; color:#10b981;">--</div>
                    <div id="accuracyGradeLabel" style="font-size:0.82em; color:#b0b8c4;">Need 3+ days with feedback</div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:12px;">
                    <div style="padding:10px; background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.15); border-radius:8px; text-align:center;">
                        <div style="font-size:0.75em; color:#60a5fa;">Days Tracked</div>
                        <div id="accStatDaysTracked" style="font-size:1.4em; font-weight:700; color:#e6edf3;">--</div>
                    </div>
                    <div style="padding:10px; background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.15); border-radius:8px; text-align:center;">
                        <div style="font-size:0.75em; color:#c084fc;">Avg Error</div>
                        <div id="accStatAvgError" style="font-size:1.4em; font-weight:700; color:#e6edf3;">--</div>
                    </div>
                    <div style="padding:10px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.15); border-radius:8px; text-align:center;">
                        <div style="font-size:0.75em; color:#34d399;">Within 30 min</div>
                        <div id="accStatWithin30" style="font-size:1.4em; font-weight:700; color:#e6edf3;">--</div>
                    </div>
                    <div style="padding:10px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.15); border-radius:8px; text-align:center;">
                        <div style="font-size:0.75em; color:#fbbf24;">Within 1 hour</div>
                        <div id="accStatWithin60" style="font-size:1.4em; font-weight:700; color:#e6edf3;">--</div>
                    </div>
                </div>
                <div style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.78em; color:#8b9cb6; margin-bottom:4px;">
                        <span>Within 30 min</span><span id="accBar30Label">0%</span>
                    </div>
                    <div class="accuracy-progress-bar">
                        <div class="accuracy-progress-fill accuracy-fill-green" id="accBar30Fill" style="width:0%;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.78em; color:#8b9cb6; margin-bottom:4px; margin-top:8px;">
                        <span>Within 1 hour</span><span id="accBar60Label">0%</span>
                    </div>
                    <div class="accuracy-progress-bar">
                        <div class="accuracy-progress-fill accuracy-fill-blue" id="accBar60Fill" style="width:0%;"></div>
                    </div>
                </div>
                <div id="accuracyTrendBox" style="padding:10px 12px; background:rgba(0,0,0,0.2); border-radius:8px; border-left:3px solid #10b981;">
                    <div id="accuracyTrendText" style="font-size:0.85em; color:#b0b8c4;">
                        💡 Track 3+ days to see accuracy analysis
                    </div>
                </div>
            </div>
        </div>
```

### 4D. Prediction History Accordion HTML (insert after line 2963, before action buttons)

```html
        <!-- ======= ACCORDION: Prediction History ======= -->
        <div class="accordion-section" data-section="predictionHistory">
            <div class="accordion-header" onclick="toggleAccordion('predictionHistory')">
                🎯 Prediction History
                <span id="historyAccuracySummary" style="font-size:0.75em; color:#8b9cb6; margin-left:auto; margin-right:8px;"></span>
                <span class="accordion-arrow">▼</span>
            </div>
            <div class="accordion-body">
                <div id="historyList"></div>
            </div>
        </div>
```

### 4E. Module-Level Variables (insert after line 3117)

```javascript
        // Auto-save prediction throttle state
        let lastAutoSavePredictionTime = 0;
        let lastAutoSavePredictionMinutes = null;
```

### 4F. Utility: `computeSleepDelta()` (insert after line ~3535, after timeToMinutes/minutesToTime)

```javascript
        // Compute signed sleep time delta handling midnight crossing
        // Returns minutes: positive = actual later than predicted, negative = earlier
        function computeSleepDelta(predicted, actual) {
            const p = ((predicted % 1440) + 1440) % 1440;
            const a = ((actual % 1440) + 1440) % 1440;
            let diff = a - p;
            if (diff > 720) diff -= 1440;
            if (diff < -720) diff += 1440;
            return diff;
        }
```

### 4G. `snapshotPredictionInputs()` (insert after computeSleepDelta)

```javascript
        function snapshotPredictionInputs() {
            const now = getCurrentMinutes();
            return {
                wakeTime: state.wakeTime,
                hoursSleptLastNight: state.hoursSleptLastNight,
                ampLoadAtPrediction: parseFloat(calculateAmpLoad(now).toFixed(1)),
                caffLoadAtPrediction: parseFloat(calculateCaffLoad(now).toFixed(1)),
                effectiveThreshold: parseFloat(getEffectiveThreshold().toFixed(1)),
                sleepDebtBonus: parseFloat(calculateSleepDebtBonus().toFixed(1)),
                baseThreshold: state.settings.sleepThreshold,
                ampHalfLife: state.settings.ampHalfLife,
                caffHalfLife: state.settings.caffHalfLife,
                totalAmpDose: getValues(state.medications).reduce((s, m) => s + m.dose, 0),
                totalCaffDose: getValues(state.caffeine).reduce((s, c) => s + c.amount, 0),
                hasWorkout: !!(state.workoutPlan && state.workoutPlan.applied),
                hasSauna: !!(state.modifiers && state.modifiers.sauna && state.modifiers.sauna.active),
                hasVitC: !!(state.modifiers && state.modifiers.vitaminC && state.modifiers.vitaminC.active),
                allNighterMode: !!state.allNighterMode
            };
        }
```

### 4H. `migrateHistoryEntries()` (insert after snapshotPredictionInputs)

See Section 2 above.

### 4I. `autoSavePrediction()` (insert before saveDay at ~line 7205)

```javascript
        function autoSavePrediction(sleepTimeMinutes) {
            if (!state._dataLoaded || isInitialLoad || !hasLoadedFromCloud) return;

            const now = Date.now();
            const today = getLocalDateString();
            const todayEntry = getValues(state.history).find(h => h.date === today);

            // Don't overwrite manual saves
            if (todayEntry && todayEntry.autoSaved === false) return;

            // Throttle: skip if <10 min AND prediction changed <5 min
            const timeSince = now - lastAutoSavePredictionTime;
            const predDelta = lastAutoSavePredictionMinutes !== null
                ? Math.abs(sleepTimeMinutes - lastAutoSavePredictionMinutes) : Infinity;

            if (todayEntry && timeSince < 600000 && predDelta < 5) return;

            if (todayEntry) {
                state.history[todayEntry.id].predictedSleep = sleepTimeMinutes;
                state.history[todayEntry.id].medications = getValues(state.medications);
                state.history[todayEntry.id].caffeine = getValues(state.caffeine);
                state.history[todayEntry.id].modifiers = JSON.parse(JSON.stringify(state.modifiers));
                state.history[todayEntry.id].lastUpdated = new Date().toISOString();
                state.history[todayEntry.id].inputs = snapshotPredictionInputs();
            } else {
                const id = generateId('hist');
                state.history[id] = {
                    id: id,
                    date: today,
                    medications: getValues(state.medications),
                    caffeine: getValues(state.caffeine),
                    modifiers: JSON.parse(JSON.stringify(state.modifiers)),
                    predictedSleep: sleepTimeMinutes,
                    actualSleep: null,
                    autoSaved: true,
                    predictedAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    inputs: snapshotPredictionInputs()
                };
            }

            lastAutoSavePredictionTime = now;
            lastAutoSavePredictionMinutes = sleepTimeMinutes;
            saveState();
        }
```

### 4J. Modified `saveDay()` (replace lines 7207-7233)

```javascript
        function saveDay() {
            const { sleepTime } = calculateSleepTime();
            const today = getLocalDateString();
            const existingEntry = getValues(state.history).find(h => h.date === today);

            if (existingEntry) {
                state.history[existingEntry.id].predictedSleep = sleepTime;
                state.history[existingEntry.id].medications = getValues(state.medications);
                state.history[existingEntry.id].caffeine = getValues(state.caffeine);
                state.history[existingEntry.id].modifiers = JSON.parse(JSON.stringify(state.modifiers));
                state.history[existingEntry.id].autoSaved = false;
                state.history[existingEntry.id].lastUpdated = new Date().toISOString();
                state.history[existingEntry.id].inputs = snapshotPredictionInputs();
            } else {
                const id = generateId('hist');
                state.history[id] = {
                    id: id,
                    date: today,
                    medications: getValues(state.medications),
                    caffeine: getValues(state.caffeine),
                    modifiers: JSON.parse(JSON.stringify(state.modifiers)),
                    predictedSleep: sleepTime,
                    actualSleep: null,
                    autoSaved: false,
                    predictedAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    inputs: snapshotPredictionInputs()
                };
            }

            saveState();
            renderHistory();
            showToast('Day saved! Log actual sleep time tomorrow.');
        }
```

### 4K. Modified `autoPopulateFeedback()` (replace lines 7244-7278)

```javascript
        function autoPopulateFeedback() {
            const historyValues = getValues(state.history);
            let updated = false;
            let yesterdayFeedback = null;

            historyValues.forEach(entry => {
                if (entry.actualSleep !== null && entry.actualSleep !== undefined) return;
                if (!entry.date || !entry.predictedSleep) return;

                const entryDate = parseLocalDate(entry.date);
                const nextDay = new Date(entryDate);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayStr = getLocalDateString(nextDay);

                const sleepEntry = state.sleepHistory[nextDayStr];
                if (!sleepEntry) return;

                const hoursSlept = typeof sleepEntry === 'number' ? sleepEntry : (sleepEntry && sleepEntry.hoursSlept);
                const wakeTime = typeof sleepEntry === 'object' ? sleepEntry.wakeTime : null;

                if (hoursSlept != null && !isNaN(hoursSlept) && wakeTime) {
                    let wakeMinutes = timeToMinutes(wakeTime);
                    let actualSleep = wakeMinutes - (hoursSlept * 60);
                    if (actualSleep < 0) actualSleep += 24 * 60;

                    state.history[entry.id].actualSleep = actualSleep;
                    state.history[entry.id].autoFilled = true;
                    state.history[entry.id].deltaMinutes = computeSleepDelta(entry.predictedSleep, actualSleep);
                    state.history[entry.id].absError = Math.abs(state.history[entry.id].deltaMinutes);
                    updated = true;

                    // Track yesterday's feedback for toast
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (entry.date === getLocalDateString(yesterday)) {
                        const diff = computeSleepDelta(entry.predictedSleep, actualSleep);
                        yesterdayFeedback = {
                            predicted: minutesToTime(entry.predictedSleep > 24*60 ? entry.predictedSleep - 24*60 : entry.predictedSleep),
                            actual: minutesToTime(actualSleep),
                            diffMinutes: Math.round(Math.abs(diff)),
                            direction: diff > 0 ? 'later' : 'earlier'
                        };
                    }
                }
            });

            if (updated) {
                saveState();
                if (yesterdayFeedback) {
                    const fb = yesterdayFeedback;
                    if (fb.diffMinutes <= 15) {
                        showToast('Yesterday\u2019s prediction was spot on! Predicted ' + fb.predicted + ', Actual ' + fb.actual);
                    } else {
                        showToast('Yesterday: Predicted ' + fb.predicted + ' \u2192 Actual ' + fb.actual + ' (' + fb.diffMinutes + ' min ' + fb.direction + ')');
                    }
                }
            }
        }
```

### 4L. Enhanced `renderHistory()` delta display (replace lines 7326-7337)

Replace the `return` template in the `.map()` callback:

```javascript
                // Calculate delta text for display
                let deltaHtml = '';
                if (entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep)) {
                    const rawDiff = computeSleepDelta(entry.predictedSleep, entry.actualSleep);
                    const absDiff = Math.abs(Math.round(rawDiff));
                    let deltaClass, deltaText;
                    if (absDiff <= 15) {
                        deltaClass = 'delta-close';
                        deltaText = absDiff + ' min off \u2713';
                    } else if (rawDiff > 0) {
                        deltaClass = absDiff <= 30 ? 'delta-close' : absDiff <= 60 ? 'delta-moderate' : 'delta-late';
                        deltaText = absDiff + ' min late' + (absDiff > 30 ? ' \u26a0\ufe0f' : ' \u2713');
                    } else {
                        deltaClass = absDiff <= 30 ? 'delta-early' : absDiff <= 60 ? 'delta-moderate' : 'delta-late';
                        deltaText = absDiff + ' min early' + (absDiff <= 30 ? ' \u2713' : ' \u26a0\ufe0f');
                    }
                    deltaHtml = '<div class="history-delta ' + deltaClass + '">' + deltaText + '</div>';
                }

                return `
                    <div class="history-entry">
                        <div>
                            <div class="history-date">${date}</div>
                            <div class="history-details">${totalDose}mg Adderall, ${totalCaff}mg Caffeine</div>
                        </div>
                        <div class="history-accuracy">
                            <div class="history-predicted">Predicted: ${predictedStr}</div>
                            <div class="history-actual" ${accuracyClass}>${actualStr}</div>
                            ${deltaHtml}
                        </div>
                    </div>
                `;
```

### 4M. Accuracy Calculator Functions (insert before suggestCalibration ~line 8510)

```javascript
        function calculateAccuracyStats(days) {
            if (days === undefined) days = 30;
            const entries = getValues(state.history);
            const emptyResult = {
                totalEntries: 0, entriesWithFeedback: 0,
                avgError: null, avgAbsError: null,
                within30min: null, within60min: null,
                trend: null, recentBias: null
            };
            if (entries.length === 0) return emptyResult;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = getLocalDateString(cutoffDate);
            const inRange = entries.filter(e => e.date && e.date >= cutoffStr);
            const withFeedback = inRange.filter(e =>
                e.actualSleep !== null && e.actualSleep !== undefined && !isNaN(e.actualSleep) &&
                e.predictedSleep !== null && e.predictedSleep !== undefined && !isNaN(e.predictedSleep)
            );

            if (withFeedback.length === 0) return Object.assign({}, emptyResult, { totalEntries: inRange.length });

            const deltas = withFeedback.map(e => computeSleepDelta(e.predictedSleep, e.actualSleep));
            const absErrors = deltas.map(d => Math.abs(d));
            const avgError = deltas.reduce((s, d) => s + d, 0) / deltas.length;
            const avgAbsError = absErrors.reduce((s, d) => s + d, 0) / absErrors.length;
            const within30 = absErrors.filter(e => e <= 30).length / absErrors.length;
            const within60 = absErrors.filter(e => e <= 60).length / absErrors.length;

            let trend = null;
            if (withFeedback.length >= 6) {
                const sorted = withFeedback.slice().sort((a, b) => b.date.localeCompare(a.date));
                const recent3 = sorted.slice(0, 3).map(e => Math.abs(computeSleepDelta(e.predictedSleep, e.actualSleep)));
                const older3 = sorted.slice(3, 6).map(e => Math.abs(computeSleepDelta(e.predictedSleep, e.actualSleep)));
                const recentAvg = recent3.reduce((s, v) => s + v, 0) / 3;
                const olderAvg = older3.reduce((s, v) => s + v, 0) / 3;
                const trendDiff = recentAvg - olderAvg;
                trend = trendDiff < -10 ? 'improving' : trendDiff > 10 ? 'worsening' : 'stable';
            }

            return {
                totalEntries: inRange.length,
                entriesWithFeedback: withFeedback.length,
                avgError: Math.round(avgError),
                avgAbsError: Math.round(avgAbsError),
                within30min: Math.round(within30 * 100),
                within60min: Math.round(within60 * 100),
                trend: trend,
                recentBias: avgError > 15 ? 'late' : avgError < -15 ? 'early' : 'neutral'
            };
        }

        function getRecentPredictions(n) {
            if (n === undefined) n = 7;
            const entries = getValues(state.history);
            if (entries.length === 0) return [];
            const sorted = entries.slice().sort((a, b) => b.date.localeCompare(a.date));
            return sorted.slice(0, n).map(entry => {
                const hasActual = entry.actualSleep !== null && entry.actualSleep !== undefined && !isNaN(entry.actualSleep);
                const hasPredicted = entry.predictedSleep !== null && entry.predictedSleep !== undefined && !isNaN(entry.predictedSleep);
                let delta = null, absError = null;
                if (hasActual && hasPredicted) {
                    delta = computeSleepDelta(entry.predictedSleep, entry.actualSleep);
                    absError = Math.abs(delta);
                }
                return {
                    id: entry.id, date: entry.date,
                    predictedSleep: hasPredicted ? entry.predictedSleep : null,
                    predictedStr: hasPredicted ? minutesToTime(entry.predictedSleep > 24*60 ? entry.predictedSleep - 24*60 : entry.predictedSleep) : '--:--',
                    actualSleep: hasActual ? entry.actualSleep : null,
                    actualStr: hasActual ? minutesToTime(entry.actualSleep) : null,
                    delta: delta, absError: absError,
                    status: hasActual ? (absError <= 30 ? 'accurate' : absError <= 60 ? 'close' : 'off') : 'pending'
                };
            });
        }

        function getCalibrationRecommendation() {
            const allWithFeedback = getValues(state.history).filter(e =>
                e.actualSleep !== null && e.actualSleep !== undefined && !isNaN(e.actualSleep) &&
                e.predictedSleep !== null && e.predictedSleep !== undefined && !isNaN(e.predictedSleep)
            );
            const entries = allWithFeedback.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

            if (entries.length === 0) return {
                recommendation: 'No feedback data yet. Save a prediction and log actual sleep to start calibrating.',
                confidence: 'none', adjustmentMg: null, details: null
            };
            if (entries.length < 3) return {
                recommendation: 'Only ' + entries.length + ' data point(s). Need 3+ for calibration advice.',
                confidence: 'none', adjustmentMg: null, details: null
            };

            const deltas = entries.map(e => computeSleepDelta(e.predictedSleep, e.actualSleep));
            const avgDelta = deltas.reduce((s, v) => s + v, 0) / deltas.length;
            const absErrors = deltas.map(d => Math.abs(d));
            const avgAbsError = absErrors.reduce((s, v) => s + v, 0) / absErrors.length;
            const confidence = allWithFeedback.length >= 15 ? 'high' : allWithFeedback.length >= 5 ? 'medium' : 'low';
            const currentThreshold = state.settings.sleepThreshold;

            if (avgAbsError <= 30) return {
                recommendation: 'Predictions are accurate (avg ' + Math.round(avgAbsError) + ' min off). No adjustment needed.',
                confidence: confidence, adjustmentMg: 0,
                details: { avgDelta: Math.round(avgDelta), avgAbsError: Math.round(avgAbsError), sampleSize: entries.length, currentThreshold: currentThreshold, suggestedThreshold: currentThreshold }
            };

            let adjustmentMg = null, recommendation = '';
            if (avgDelta > 30) {
                adjustmentMg = avgDelta > 60 ? -2 : -1;
                const newTh = Math.max(8, currentThreshold + adjustmentMg);
                recommendation = 'You fall asleep ' + Math.round(avgDelta) + ' min later than predicted. Try lowering Sleep Threshold from ' + currentThreshold + 'mg to ' + newTh + 'mg (you\'re more sensitive than assumed).';
            } else if (avgDelta < -30) {
                adjustmentMg = avgDelta < -60 ? 2 : 1;
                const newTh = Math.min(25, currentThreshold + adjustmentMg);
                recommendation = 'You fall asleep ' + Math.round(Math.abs(avgDelta)) + ' min earlier than predicted. Try raising Sleep Threshold from ' + currentThreshold + 'mg to ' + newTh + 'mg (you\'re less sensitive than assumed).';
            } else {
                recommendation = 'Predictions vary by ' + Math.round(avgAbsError) + ' min avg without consistent direction. May be due to variable sleep debt or exercise timing. Keep logging.';
            }

            return {
                recommendation: recommendation, confidence: confidence, adjustmentMg: adjustmentMg,
                details: { avgDelta: Math.round(avgDelta), avgAbsError: Math.round(avgAbsError), sampleSize: entries.length, currentThreshold: currentThreshold, suggestedThreshold: adjustmentMg !== null ? Math.max(8, Math.min(25, currentThreshold + adjustmentMg)) : currentThreshold }
            };
        }
```

### 4N. Toggle + Render Functions (insert after line 7673, after toggleSleepPerformance)

```javascript
        let accuracyDashExpanded = true;

        function toggleAccuracyDashboard() {
            accuracyDashExpanded = !accuracyDashExpanded;
            const content = document.getElementById('accuracyDashboardContent');
            const icon = document.getElementById('accuracyToggleIcon');
            if (content) content.style.display = accuracyDashExpanded ? 'block' : 'none';
            if (icon) icon.textContent = accuracyDashExpanded ? '\u25bc' : '\u25b6';
        }

        function renderAccuracyDashboard() {
            const stats = calculateAccuracyStats(30);
            const cal = getCalibrationRecommendation();

            const avgErr = stats.avgAbsError;
            const hasData = stats.entriesWithFeedback >= 1;
            const hasEnough = stats.entriesWithFeedback >= 3;

            let gradeColor = '#10b981', gradeBg = 'rgba(16,185,129,0.1)', gradeBorder = 'rgba(16,185,129,0.2)';
            if (avgErr > 60) { gradeColor = '#ef4444'; gradeBg = 'rgba(239,68,68,0.1)'; gradeBorder = 'rgba(239,68,68,0.2)'; }
            else if (avgErr > 30) { gradeColor = '#f59e0b'; gradeBg = 'rgba(245,158,11,0.1)'; gradeBorder = 'rgba(245,158,11,0.2)'; }

            const banner = document.getElementById('accuracyGradeBanner');
            if (banner) { banner.style.background = gradeBg; banner.style.borderColor = gradeBorder; }

            const gradeVal = document.getElementById('accuracyGradeValue');
            if (gradeVal) {
                gradeVal.textContent = hasEnough ? '\u00b1' + avgErr + ' min' : '--';
                gradeVal.style.color = gradeColor;
            }
            const gradeLabel = document.getElementById('accuracyGradeLabel');
            if (gradeLabel) gradeLabel.textContent = hasData ? stats.entriesWithFeedback + ' predictions tracked' : 'Need 3+ days with feedback';

            const daysEl = document.getElementById('accStatDaysTracked');
            if (daysEl) daysEl.textContent = hasData ? stats.entriesWithFeedback : '--';

            const avgEl = document.getElementById('accStatAvgError');
            if (avgEl) { avgEl.textContent = hasEnough ? '\u00b1' + avgErr + 'm' : '--'; avgEl.style.color = gradeColor; }

            const w30El = document.getElementById('accStatWithin30');
            if (w30El) {
                w30El.textContent = hasEnough ? stats.within30min + '%' : '--';
                if (hasEnough) w30El.style.color = stats.within30min >= 50 ? '#10b981' : stats.within30min >= 30 ? '#f59e0b' : '#ef4444';
            }
            const w60El = document.getElementById('accStatWithin60');
            if (w60El) {
                w60El.textContent = hasEnough ? stats.within60min + '%' : '--';
                if (hasEnough) w60El.style.color = stats.within60min >= 70 ? '#10b981' : stats.within60min >= 50 ? '#f59e0b' : '#ef4444';
            }

            const bar30Fill = document.getElementById('accBar30Fill');
            const bar30Label = document.getElementById('accBar30Label');
            if (bar30Fill) bar30Fill.style.width = (hasEnough ? stats.within30min : 0) + '%';
            if (bar30Label) bar30Label.textContent = (hasEnough ? stats.within30min : 0) + '%';

            const bar60Fill = document.getElementById('accBar60Fill');
            const bar60Label = document.getElementById('accBar60Label');
            if (bar60Fill) bar60Fill.style.width = (hasEnough ? stats.within60min : 0) + '%';
            if (bar60Label) bar60Label.textContent = (hasEnough ? stats.within60min : 0) + '%';

            const trendBox = document.getElementById('accuracyTrendBox');
            const trendText = document.getElementById('accuracyTrendText');
            if (trendBox && trendText) {
                trendBox.style.borderLeftColor = gradeColor;
                if (!hasEnough) {
                    trendText.innerHTML = '\ud83d\udca1 Track 3+ days to see accuracy analysis';
                } else {
                    const trendLabel = stats.trend === 'improving' ? 'Improving \u2191' : stats.trend === 'worsening' ? 'Worsening \u2193' : 'Stable';
                    const recIcon = avgErr <= 30 ? '\u2713' : avgErr <= 60 ? '\u26a0\ufe0f' : '\ud83d\udd27';
                    trendText.innerHTML = '<strong>' + trendLabel + '</strong> ' + recIcon + '<br><span style="font-size:0.9em; color:#8b9cb6;">\ud83d\udca1 ' + cal.recommendation + '</span>';
                }
            }

            // Update hero hint
            renderAccuracyHeroHint(stats);
        }

        function renderAccuracyHeroHint(stats) {
            const el = document.getElementById('accuracyHeroHint');
            if (!el) return;
            if (!stats || stats.entriesWithFeedback < 3) { el.style.display = 'none'; return; }
            const avgErr = stats.avgAbsError;
            const color = avgErr <= 30 ? '#10b981' : avgErr <= 60 ? '#f59e0b' : '#ef4444';
            el.innerHTML = 'Historical accuracy: <span style="color:' + color + '; font-weight:600;">\u00b1' + avgErr + ' min</span> (' + stats.entriesWithFeedback + ' days)';
            el.style.display = 'block';
        }
```

### 4O. Hook in recalculate() (insert at line 5775, after updateForecastLogic)

```javascript
            // Auto-save today's prediction (throttled)
            autoSavePrediction(sleepTime);
```

### 4P. Accordion defaults update (line 10630)

Add to the defaults object:
```javascript
                predictionHistory: false
```

### 4Q. Init hooks (after autoPopulateFeedback call at line 10575)

```javascript
            // Migrate history entries and render accuracy dashboard
            setTimeout(() => {
                migrateHistoryEntries();
                renderHistory();
                renderAccuracyDashboard();
            }, 2500);
```

### 4R. Enhanced submitFeedback() — add delta calculation (modify line 8501)

After `state.history[recent.id].actualSleep = timeToMinutes(actualTime);` add:
```javascript
                state.history[recent.id].deltaMinutes = computeSleepDelta(recent.predictedSleep, timeToMinutes(actualTime));
                state.history[recent.id].absError = Math.abs(state.history[recent.id].deltaMinutes);
```

---

## 5. HOOK POINTS SUMMARY

| What | Where | Line | Action |
|------|-------|------|--------|
| CSS | After `.history-actual` | 1290 | Insert accuracy styles |
| Hero hint HTML | After `bottleneckIndicator` | 2508 | Insert `accuracyHeroHint` div |
| Accuracy dashboard HTML | After Sleep Performance section | 2892 | Insert unified-perf-section |
| Prediction History accordion | After Sleep History Log accordion | 2963 | Insert accordion with `#historyList` |
| Module vars | After `pinValidated` | 3117 | Insert throttle vars |
| `computeSleepDelta()` | After time utilities | ~3535 | Insert utility function |
| `snapshotPredictionInputs()` | After computeSleepDelta | ~3540 | Insert helper |
| `migrateHistoryEntries()` | After snapshotPredictionInputs | ~3560 | Insert migration |
| `autoSavePrediction()` | Before `saveDay()` | ~7205 | Insert new function |
| `saveDay()` | Lines 7207-7233 | 7207 | Replace with dedup-aware version |
| `autoPopulateFeedback()` | Lines 7244-7278 | 7244 | Replace with toast+metrics version |
| `renderHistory()` entry template | Lines 7326-7337 | 7326 | Replace with delta-enhanced version |
| Toggle + render functions | After `toggleSleepPerformance()` | ~7673 | Insert accuracy UI functions |
| Accuracy stats functions | Before `suggestCalibration()` | ~8510 | Insert 3 calculator functions |
| `submitFeedback()` delta calc | After line 8501 | 8501 | Add delta/absError calculation |
| Hook in `recalculate()` | After `updateForecastLogic()` | 5775 | Insert `autoSavePrediction(sleepTime)` |
| Accordion defaults | In defaults object | 10630 | Add `predictionHistory: false` |
| Init hooks | After autoPopulateFeedback timeout | 10575 | Add migration + render calls |

---

## 6. TESTING CHECKLIST

- [ ] App loads without errors (check console)
- [ ] Predicted sleep time still displays correctly in hero
- [ ] Auto-save creates history entry after 10 min (or on med change)
- [ ] `saveDay()` button still works, doesn't create duplicates
- [ ] Prediction History accordion appears and shows entries
- [ ] Accuracy Dashboard panel renders with stats (or "need 3+ days")
- [ ] Hero hint shows when 3+ days tracked
- [ ] Auto-populate fills in yesterday's actual on next app load
- [ ] Toast shows "Yesterday: Predicted X → Actual Y (Z min late)"
- [ ] Delta display per history entry shows colored "45 min late ⚠️"
- [ ] Calibration recommendation appears in trend box
- [ ] Midnight crossing: predicted 11:30 PM vs actual 12:30 AM = 60 min
- [ ] First-time user sees "need 3+ days" messages (graceful empty state)
- [ ] Firebase sync still works (save, reload, data persists)
- [ ] Existing history entries get migrated (deltaMinutes backfilled)
- [ ] No duplicate entries per day
- [ ] Brace/paren balance check passes

---

## 7. FIREBASE COMPLIANCE

- [x] No new arrays in state (all objects with generated ID keys)
- [x] All saves go through `saveState()` / `saveStateImmediate()`
- [x] `isEmptyState()` — no changes needed (already checks history)
- [x] `getDefaultState()` — no changes needed (already has `history: {}`)
- [x] Migration handles existing users (idempotent, checks `=== undefined`)
- [x] Sync protection flags untouched
- [x] `autoSavePrediction()` checks `_dataLoaded`, `isInitialLoad`, `hasLoadedFromCloud`
- [x] No direct Firebase calls
- [x] `cleanupHistory()` still works as safety net for deduplication

---

## 8. ARCHITECTURE NOTES

### Why Not a New `predictionHistory` Object?
`state.history` already stores predictions with actuals. Adding optional fields is cleaner than maintaining two parallel tracking systems.

### Throttling Strategy
- **10 min timer OR 5 min prediction change**, whichever comes first
- Worst case: 6 `saveState()` calls/hour from auto-save
- Manual saves (`autoSaved: false`) are never overwritten by auto-save

### Midnight Crossing
`computeSleepDelta()` uses circular arithmetic with ±720 min window. Sleep times cluster around 9 PM - 4 AM, so max realistic diff is ~720 min. Any diff beyond that wraps around.
