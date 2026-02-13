# Mode System, Targets & Ecosystem Integration

## Table of Contents
- [Mode Determination](#mode-determination)
  - [`calculateMode(sleepHours, isBrainDay)` -- Line 8172](#calculatemodeseephours-isbrainday--line-8172)
  - [Mode Details](#mode-details)
  - [Sleep Debt Override](#sleep-debt-override)
  - [All-Nighter Mode](#all-nighter-mode)
- [Target Calculation](#target-calculation)
  - [`calculateTargets(mode, tdee, weight_lbs, isBrainDay)` -- Line 8185](#calculatetargetsmode-tdee-weight_lbs-isbrainday--line-8185)
  - [Brain Day](#brain-day)
- [Auto-Start Day](#auto-start-day)
  - [`autoStartDay()` -- Line 18583](#autostartday--line-18583)
- [Ecosystem Integration (READ-ONLY)](#ecosystem-integration-read-only)
  - [Data Sources](#data-sources)
  - [`loadEcosystemData(hashedPin)` -- Line 16211](#loadecosystemdatahashedpin--line-16211)
  - [Refresh Mechanism](#refresh-mechanism)
  - [Ecosystem Is Never Saved to Firebase](#ecosystem-is-never-saved-to-firebase)
- [Eating Nudge System](#eating-nudge-system)
  - [`getEatingNudge()` -- Line 9845](#geteatingnudge--line-9845)
  - [`getSimpleStatus()` -- Line 9791](#getsimplestatus--line-9791)
- [Nudge/Alert System](#nudgealert-system)
  - [`checkAndShowNudges()` -- Line 12364](#checkandshownudges--line-12364)
- [Sleep Debt Calculation](#sleep-debt-calculation)
- [Key Functions Reference](#key-functions-reference)

## Mode Determination

### `calculateMode(sleepHours, isBrainDay)` — Line 8172

```javascript
function calculateMode(sleepHours, isBrainDay) {
    // All-nighter mode forces ORANGE regardless of sleep
    if (state.ecosystemContext?.stimulant?.allNighterMode === true) {
        return 'ORANGE';
    }
    // Brain day doesn't change mode, just adds carb reminder
    if (sleepHours >= 6) return 'GREEN';
    if (sleepHours >= 5) return 'YELLOW';
    return 'ORANGE';
}
```

### Mode Details

| Mode | Sleep | Deficit | Protein Multiplier | Floor | Training |
|------|-------|---------|--------------------|-------|----------|
| GREEN | >= 6h | 500 cal | 1.0x (2g/kg) | 1900 | Normal |
| YELLOW | 5-6h | 300 cal | 1.10x | 2000 | Light |
| ORANGE | < 5h | 0 (maintenance) | 1.15x | TDEE | Recovery only |

### Sleep Debt Override

`applySleepDebtModeOverride()` — Applied after base mode calculation but before targets.

Sleep debt severity (from `state.ecosystemContext.sleepDebt.severity`):
- **LOW**: No override
- **MODERATE**: Warning shown but no mode change
- **HIGH**: Bumps GREEN -> YELLOW (warning)
- **SEVERE**: Forces ORANGE (override)

Note: Sleep debt is a WARNING/override, not a forced mode change for all severities.

### All-Nighter Mode

When stim calc has `allNighterMode: true`:
- Body comp forces ORANGE mode regardless of sleep hours
- This is checked first in `calculateMode()`

## Target Calculation

### `calculateTargets(mode, tdee, weight_lbs, isBrainDay)` — Line 8185

```javascript
function calculateTargets(mode, tdee, weight_lbs, isBrainDay) {
    const weight_kg = weight_lbs / 2.205;
    const protein_base = Math.round(weight_kg * 2.0);  // 2g/kg baseline

    const modes = {
        'GREEN':  { deficit: 500, proteinMultiplier: 1.0,  floor: 1900 },
        'YELLOW': { deficit: 300, proteinMultiplier: 1.10, floor: 2000 },
        'ORANGE': { deficit: 0,   proteinMultiplier: 1.15, floor: tdee }
    };

    const m = modes[mode];
    const targetCals = Math.max(tdee - m.deficit, m.floor);
    const carbTarget = isBrainDay ? 150 : 0;  // Brain day: 150g minimum

    return {
        calories: targetCals,
        protein: Math.round(protein_base * m.proteinMultiplier),
        carbs: carbTarget,
        floor: m.floor,
        deficit: m.deficit
    };
}
```

### Brain Day
`isBrainDay` (clinic day) adds a 150g carb minimum target for cognitive performance. Does NOT change mode or deficit — only adds carb tracking.

## Auto-Start Day

### `autoStartDay()` — Line 18583

Runs during `initializeUI()`. Automatically sets up the day without manual input:

```
1. Get sleep hours from ecosystem (stim calc → tryGetSleepFromStimCalc fallback → default 6h)
2. Get active calories from 7-day workout average (default 300 if no history)
3. Calculate base mode from sleep hours
4. Apply sleep debt override
5. Calculate TDEE and targets with final mode
6. Set setupComplete = true
7. saveState()
```

## Ecosystem Integration (READ-ONLY)

### Data Sources

Body comp reads from 3 other Firebase paths:

| Source | Firebase Path | What's Read |
|--------|--------------|-------------|
| Stim Calc | `/stimulantCalculator/state` | sleepHours, wakeTime, medications, caffeine, projectedSleepTime, allNighterMode |
| Dental Quest | `/appData/medications` | 30mg count, 20mg count, refill dates |
| D3 Roadmap | `/d3Roadmap/exams` + `/d3Roadmap/monthlyPlanner` | exam schedule, daily schedule |

### `loadEcosystemData(hashedPin)` — Line 16211

Reads all 3 sources in sequence. Updates `state.ecosystemContext` sub-objects.

Key behaviors:
- **Auto-sets sleep**: If `state.today.sleepHours` is null, uses stim calc's `hoursSleptLastNight`
- **Pill inventory**: Calculates days until refill, warns if will run out
- **Exam awareness**: Finds next exam in 30 days, calculates days until
- **Schedule**: Reads today's tasks, eating windows, schedule intensity

### Refresh Mechanism
- `startEcosystemRefresh()`: Polls every 60 seconds
- `setupStimulantRealtimeListener()`: Firebase `.on('value')` for live stim calc changes (instant updates)

### Ecosystem Is Never Saved to Firebase

`saveToFirebase()` explicitly excludes `ecosystemContext`:
```javascript
const stateToSave = { profile, today, frequentFoods, weighIns, ... };
// ecosystemContext NOT included
```

## Eating Nudge System

### `getEatingNudge()` — Line 9845

Context-aware nudges that factor in stimulant timing, time of day, and meal progress.

**Priority cascade:**
1. Schedule-aware nudges (from D3 roadmap tasks/eating windows)
2. Enhanced stimulant nudges (pharmacokinetic timing)
3. Adderall peak suppression + no recent food (<4h since dose, >3h since meal, <400 cal)
4. Adderall wearing off + low calories (4-8h since dose, <800 cal)
5. Crash zone + severe undereating (>8h since dose, <1000 cal)
6. Late sleep projected (projected sleep > midnight, <70% target by 6pm)
7. Protein behind in evening (>6pm, <50% protein target)
8. Time-based checkpoint (behind expected calorie pace)
9. Evening prep for tomorrow
10. Weak day warning (pattern of poor days)
11. Protein distribution warning (>% after 6pm)

Each nudge returns: `{ type, icon, title, message, verify? }`

### `getSimpleStatus()` — Line 9791

Dashboard status indicator. Returns `{ icon, label, color, subtitle }`:
- **EAT NOW** (red): >5pm, <800 cal
- **BEHIND** (yellow): calories < expected pace * 0.6
- **NEED PROTEIN** (yellow): >6pm, protein < 50%
- **ON TRACK** (green): everything on pace

## Nudge/Alert System

### `checkAndShowNudges()` — Line 12364

Time-based contextual alerts (separate from eating nudges). Displayed as dismissible banners.

Priority alerts:
1. **SEVERE UNDEREATING** (>5pm, <1000 cal): "metabolic sabotage" danger
2. **CRASH WARNING** (4-5pm, <1200 cal): "eat now" before Adderall crash
3. **MODERATE UNDEREATING** (>3pm, <600 cal)
4. **LOW INTAKE** (>3pm, <1000 cal)
5. **PROTEIN CRITICAL** (>6pm, protein < 50% target)
6. **PROTEIN REMINDER** (>8pm, protein < 80% target)
7. **BRAIN FUEL** (>6pm, brain day, <100g carbs)

Dismissed nudges tracked in `dismissedNudges` Set (resets each page load).

## Sleep Debt Calculation

Calculated in `loadEcosystemData()` from last 7 days of dailyLogs:

```javascript
sleepDebt: {
    last7Days: [],              // Array of sleep hours
    totalSleep: 0,              // Sum of last 7 days
    avgSleep: 0,                // Average
    weeklyDebt: 0,              // (baseline * 7) - totalSleep
    consecutiveBadNights: 0,    // Days below baseline (starting from most recent)
    severity: 'LOW'             // LOW | MODERATE | HIGH | SEVERE
}
```

Severity thresholds:
- **SEVERE**: weeklyDebt > 14 OR consecutiveBadNights >= 5
- **HIGH**: weeklyDebt > 7 OR consecutiveBadNights >= 3
- **MODERATE**: weeklyDebt > 3
- **LOW**: everything else

## Key Functions Reference

| Function | Line | Purpose |
|----------|------|---------|
| `calculateMode(sleep, brain)` | 8172 | Determine GREEN/YELLOW/ORANGE |
| `calculateTargets(mode, tdee, w, brain)` | 8185 | Cal/protein/carb targets |
| `autoStartDay()` | 18583 | Auto-setup using ecosystem |
| `applySleepDebtModeOverride()` | ~18615 | Sleep debt severity override |
| `loadEcosystemData(pin)` | 16211 | Read from 3 other apps |
| `getEatingNudge()` | 9845 | Stimulant-aware eating advice |
| `getSimpleStatus()` | 9791 | Dashboard status indicator |
| `checkAndShowNudges()` | 12364 | Time-based contextual alerts |
| `getWorkoutRecommendation()` | 9980 | Sleep-based workout advice |
| `getModeDisplay(mode)` | 8223 | Mode emoji/label/class |
| `getCurrentDeficit()` | 8246 | TDEE - calories eaten |
