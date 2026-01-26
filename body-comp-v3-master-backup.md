# Body Comp Tracker v3 — Master Backup Document

**Created:** January 26, 2026  
**Purpose:** Complete reference for the Body Comp Tracker v3 project. Contains all context, specifications, science, implementation plans, and accountability frameworks. Use this if memory is lost or context needs to be restored.

---

# PART 1: USER PROFILE

## Who Is Sully

**Basic Info:**
- Age: 30 (turning 31 in 2027)
- Location: Boston (from Naperville, Illinois — Chicago suburbs)
- Education: D3 at BU Goldman School of Dental Medicine, graduating May 2027
- Career goal: Dental anesthesia, practice ownership in Chicago suburbs
- Personality: Introvert with close friendships

**Physical Stats:**
- Height: 5'8.5" (174 cm / 68.5 inches)
- Current weight: ~190 lbs
- Body fat %: ~27% (±2%)
- Fat mass: ~51.3 lbs
- Lean mass: ~138.7 lbs

**Goal:**
- Target weight: 170 lbs by June 1, 2026
- Target body fat: ~18%
- Target fat mass: ~31 lbs
- Target lean mass: ~139 lbs (preserve muscle)
- Required rate: 1.1 lbs/week over 18 weeks
- **This goal has been delayed for TEN YEARS**

**Daily Medication:**
- 50mg Adderall XR (tracked as 30mg + 20mg pills in Dental Quest)
- Typically taken ~7am
- Caffeine (supposed to be done by 10am)

**Sleep Pattern:**
- Chronic deprivation: 4-6 hours typical
- Goal: 5.5 hours minimum
- Wake anchor: 6:50am

**Key Relationships:**
- Antonio: Best friend at Harvard, gives direct advice
- Brother: Interventional radiologist
- Julia: Ex-girlfriend, blocked January 2026, maintaining no-contact

---

## Sully's Patterns & Principles

### The "Demonic Three" (What Destroys Him During Stress)
1. High-risk trading
2. Relationship rumination
3. Social isolation

**Antidote:** Career focus (dental anesthesia, practice ownership)

### The "Low-Hanging Fruit" (Non-Negotiables)
- NO trading
- 50mg Adderall max (no boosters)
- All caffeine done by 10am
- Gym 5x/week
- 5.5 hours minimum sleep
- 6:50am wake anchor

**When these slip, everything cascades.**

### The Self-Esteem Loop (Decade-Long Cycle)
```
Body dissatisfaction
    ↓
Insecure in relationships
    ↓
Poor partner selection
    ↓
Dysfunction
    ↓
Breakup
    ↓
Rumination
    ↓
No gym
    ↓
(repeat)
```

**Breaking it requires gym consistency.**

### The Death Spiral (Weekly Cycle)
```
Exam coming up
    ↓
Procrastinate all morning
    ↓
2pm panic → take extra Adderall or coffee
    ↓
Appetite gone → undereating
    ↓
Can't sleep → all-nighter
    ↓
Too wrecked to workout
    ↓
Week is cooked
```

### Core Principles
- "Action precedes hope."
- Rumination happens in bed (conditioned cue). Bed is for sleep and sex only.
- Movement breaks functional freeze.
- "Too drained" is a lie — Antonio dragged him to gym → felt invincible.
- Darkest coldest months = where turnaround is forged.
- Never decide about Julia from a low state.

### Interaction Style (How Claude Should Engage)
- Be direct, push back on rumination
- Don't feed overthinking
- Give what he needs, not what he asks for when spiraling
- Hold the line
- Don't repeatedly tell him to sleep or end conversations
- Don't constantly ask follow-up questions — let him lead

---

## Current Academic Situation (Spring 2026)

### 7 Courses
1. Oral Medicine
2. Pain Control 2
3. Critical Thinking
4. Pediatric Dentistry
5. Periodontology 2
6. Orthodontics
7. Geriatrics

### Pass Thresholds
- Most courses: 60%
- Perio 2: 65%
- Attendance severe: Perio 2 & Crit Think = letter grade drop per absence

### February 2026 Exam Gauntlet (5 Exams in 25 Days)
| Date | Exam | Course |
|------|------|--------|
| Feb 2 | Midterm | Pain Control 2 |
| Feb 6 | Final | Orthodontics |
| Feb 11 | Midterm | Geriatrics |
| Feb 18 | Exam 2 | Pediatric Dentistry |
| Feb 27 | Midterm | Oral Medicine |

### PEDS IS CRITICAL
- Midterm score: 77% (40% weight)
- Need ~70% on Exam 2 (45% weight) to pass
- AUTO-FAIL if miss: NPI Exercise, Ortho Module, IPS Session

### Clinic Schedule
- Session 1: 8:30am - 11:30am
- Session 2: 12:30pm - 3:30pm
- Session 3: 4:00pm - 7:00pm
- Monday-Friday: All 3 sessions possible
- Saturday: Sessions 1 & 2 only
- Sunday: Off
- Currently ~10 appointments over next month

---

## Sully's App Ecosystem

| App | Purpose | Firebase Path |
|-----|---------|---------------|
| Dental Student Quest | Tasks, Pomodoro, medication tracking, financial dashboard, calendar | `users/{pin}/appData/` |
| Stimulant Elimination Calculator | Sleep tracking, Adderall/caffeine timing, sleep prediction | `users/{pin}/stimulantCalculator/state` |
| D3 Roadmap | Exam schedule, deadlines, grade tracking | `users/{pin}/d3Roadmap/` |
| Body Comp Tracker | Calories, protein, workouts, weight, body composition | `users/{pin}/bodyCompTracker/state` |

All apps share the same Firebase database and PIN authentication system.

---

# PART 2: THE SCIENCE

## Adderall and Body Composition

### What Adderall Does NOT Do
- Does NOT significantly increase metabolic rate at therapeutic doses
- The "stimulant metabolism boost" is a myth for prescribed doses

### What Adderall DOES Do
- Suppresses appetite dramatically (hours 1-8 post-dose)
- Reduces NEAT (non-exercise activity thermogenesis) by 16-22%
- You fidget less, move less unconsciously
- Your "sedentary" calorie burn is actually LOWER on Adderall

### The Adderall Appetite Timeline (7am Dose)
| Time | Hours Post | Phase | What's Happening |
|------|-----------|-------|------------------|
| 7am-11am | 0-4 hrs | Peak suppression | Don't feel hungry at all |
| 11am-3pm | 4-8 hrs | Wearing off | Hunger starting to return |
| 3pm-5pm | 8-10 hrs | Crash risk | Appetite rebounds hard |
| 5pm+ | 10+ hrs | Evening | Normal appetite |

### The Adderall Trap
```
Adderall suppresses appetite
    ↓
Skip meals or severely undereat
    ↓
Body goes into conservation mode
    ↓
When Adderall wears off, appetite rebounds hard
    ↓
Binge or eat calorie-dense foods
    ↓
Net result: similar calories but WORSE timing and composition
    ↓
Plus: muscle loss from protein timing gaps
```

**Solution:** Push eating during suppression window, not just track what was eaten.

---

## Sleep Deprivation and Body Composition

### What Happens When You Sleep <6 Hours
- Muscle protein synthesis drops 18%
- Cortisol increases 37-45% (promotes visceral fat storage)
- Testosterone drops 10-15% (impairs muscle maintenance)
- Leptin drops (less satisfied from food)
- Ghrelin increases (hungrier — but masked by Adderall)
- Insulin sensitivity decreases (carbs stored as fat more easily)
- Willpower and executive function tank

### The Compounding Effect
```
Poor sleep
    ↓
Lower testosterone + higher cortisol
    ↓
Muscle breakdown accelerated
    ↓
Metabolism slows (less muscle = lower BMR)
    ↓
Same calories now create smaller deficit
    ↓
Progress stalls
    ↓
Frustration → stress → worse sleep
```

---

## Protein Timing on Stimulants

### The Problem
Adderall suppresses appetite 10am-4pm (for 7am dose). This is when muscle protein synthesis needs fuel. Skipping protein during this window = missing building blocks.

### Research Shows
- Distributing protein across 4+ meals beats eating it all at dinner
- 30-40g protein per meal is optimal for MPS stimulation
- Long gaps (>5 hours) without protein accelerate muscle breakdown, especially in a deficit

### Solution
Even if not hungry, need protein before 2pm. A shake doesn't require appetite.

---

## The Gym as Keystone Habit

For Sully, the gym serves functions beyond calorie burn:

1. **Breaks rumination** — Can't spiral about Julia while doing heavy squats
2. **Provides structure** — Fixed point in chaotic day
3. **Builds the body he wants** — Breaks self-esteem loop
4. **Signals "I'm taking care of myself"** — Cascades to other decisions
5. **Burns calories** — Almost secondary benefit

**The metric that matters most: Gym streak.** If going 5x/week consistently, weight loss follows. If not going, no amount of calorie tracking fixes the self-esteem loop.

---

## Body Fat Estimation: Navy Method

Using waist, neck, and height measurements:

```javascript
function estimateBodyFatNavy(waistInches, neckInches) {
    const heightInches = 68.5; // 5'8.5" - HARDCODED FOR SULLY
    const bf = 86.010 * Math.log10(waistInches - neckInches) 
             - 70.041 * Math.log10(heightInches) 
             + 36.76;
    return Math.round(bf * 10) / 10;
}
```

### Why This Matters More Than Scale Weight
- Scale lies: can gain 2 lbs muscle, lose 2 lbs fat = no scale change
- Waist measurement doesn't lie
- If waist shrinking + weight dropping = losing fat
- If waist unchanged + weight dropping = might be losing muscle

---

# PART 3: THE MODE SYSTEM

Based on sleep hours pulled from Stimulant Calculator:

| Mode | Sleep | Calorie Target | Protein Target | Floor | Rationale |
|------|-------|----------------|----------------|-------|-----------|
| 🟢 GREEN | 6+ hrs | TDEE - 500 | 172g | 1,900 | Full deficit safe |
| 🟡 YELLOW | 5-6 hrs | TDEE - 300 | 189g | 2,000 | Reduced deficit, more protein |
| 🟠 ORANGE | <5 hrs | Maintenance | 198g | TDEE | No nutritional stress on sleep stress |

**User doesn't manually set mode.** App calculates from sleep data.

---

# PART 4: APP SPECIFICATION

## Core Philosophy

**Body Comp Tracker is NOT a second warning system.** The Stimulant Calculator already prevents the "ruined sleep" part of the spiral. Body Comp Tracker's job is to:

1. Track calories and protein
2. Use stimulant data to give SMARTER eating recommendations
3. Track gym consistency (the keystone habit)
4. Track body composition over time

It's a calorie tracker that understands stimulant pharmacology — not a stimulant tracker that also does food.

---

## What The App Pulls (READ-ONLY)

### From Stimulant Calculator
| Data | Use |
|------|-----|
| `sleepHoursLastNight` | Determines mode |
| `wakeTime` | Context for nudges |
| `lastAdderallTime` | Calculates appetite suppression window |
| `lastAdderallDose` | Display context |
| `projectedSleepTime` | Display + late sleep guidance |
| `caffeineMg` | Display context |
| `tookBoosterToday` | Triggers aggressive warnings |

### From Dental Student Quest (Health & Wellness)
| Data | Use |
|------|-----|
| `30mg.pills` + `20mg.pills` | Total pills remaining |
| `refillDate` | Calculate if supply lasts |
| `willRunOut` | Critical warning |

### From D3 Roadmap
| Data | Use |
|------|-----|
| `nextExam` | Display countdown |
| `daysUntilExam` | Adjust recommendations |
| `isExamWeek` | Context |

---

## Stimulant-Aware Eating Nudges

**Show ONE nudge at a time (highest priority). Dismissible. Don't repeat same day.**

| Nudge | Trigger | Message |
|-------|---------|---------|
| Peak suppression | <4hr since Adderall + no food 3+ hrs | "Adderall active until ~X. Eat now." |
| Wearing off | 4-8hr since Adderall + <800 cal | "Only X cal. Eat before the crash." |
| Crash zone | 8+ hr since Adderall + <1000 cal | "X cal by Y:00. Eat a real meal." |
| Late sleep | Projected sleep >midnight | "Front-load eating before 6pm." |
| Protein behind | After 6pm + protein <50% | "Need Xg more protein tonight." |
| Time checkpoint | Behind expected pace | "Should be ~X cal by now." |

---

## Adderall Inventory Warnings

| Condition | Warning |
|-----------|---------|
| Will run out before refill | 🚨 "Only X pills left, refill in Y days. You'll be Z days short. NO BOOSTERS." |
| ≤7 pills remaining | ⚠️ "X pills remaining. Stick to 50mg daily." |
| Booster + limited supply | ⚠️ "Booster detected with only X pills left." |

---

## Exam-Aware Guidance

| Proximity | Guidance |
|-----------|----------|
| ≤3 days | "Skip gym. Sleep > everything." / "Light workout OK." |
| ≤7 days | "Normal gym. Don't skip — helps with stress." |
| >7 days | Just display: "Next exam: X (Y days)" |

---

## Claude Paste Integration

### Meal Format
```
MEAL|Name|Calories|Protein|Carbs|Fat
```

**Examples:**
```
MEAL|Chipotle Chicken Bowl|1035|81|90|32
MEAL|Orgain Shake (2 scoops)|320|42|16|6
MEAL|Trail Mix (2oz)|320|8|28|18
```

### Workout Format
```
WORKOUT|Type|Duration|Calories|Time
```

**Examples:**
```
WORKOUT|Lift|45|280|17:00
WORKOUT|Run|25|320|17:25
```

### Workflow
1. User takes pic of food / finishes workout
2. Opens Claude app: "What should I tell my body comp app?"
3. Claude outputs formatted line(s)
4. User copies → pastes into app's "Other" field
5. App parses automatically
6. App asks: "Add to frequent foods?" (for meals)

---

## Weekly Export Format

```
WEEKLY_SUMMARY|Jan 19-25, 2026
WEIGHT_START:190|WEIGHT_END:188.5|CHANGE:-1.5
DAYS_TRACKED:6/7|PERFECT_DAYS:4|GYM_DAYS:5
AVG_CALORIES:1920|AVG_PROTEIN:168g
AVG_SLEEP:5.8h|ORANGE_DAYS:1
GYM_STREAK:13
CUMULATIVE_DEFICIT:4200
ADDERALL_PILLS:18|NEXT_REFILL:Feb 15
NEXT_EXAM:Peds Exam 2|DAYS_UNTIL:22
---
Mon: 1850 cal, 172g pro, Gym ✓, GREEN
Tue: 1920 cal, 165g pro, Gym ✓, GREEN
Wed: 2100 cal, 145g pro, Rest, YELLOW
Thu: 1780 cal, 178g pro, Gym ✓, GREEN
Fri: 1950 cal, 182g pro, Gym ✓, GREEN
Sat: 1650 cal, 155g pro, Gym ✓, YELLOW
Sun: No data
---
FLAGS: Wed protein low, Sun not logged
```

---

## Simple View (Default Dashboard)

```
┌─────────────────────────────────────────┐
│  Good morning, Sully                    │
│                                         │
│              ✅ ON TRACK                │
│                                         │
│     1,240 / 1,900 cal                   │
│     ████████████░░░░░░░  65%            │
│                                         │
│     98g / 172g protein                  │
│     █████████░░░░░░░░░░  57%            │
│                                         │
├─────────────────────────────────────────┤
│ 💊 Adderall wearing off ~2pm            │
│    → Eat something before the crash     │
├─────────────────────────────────────────┤
│ 🏋️ Gym streak: 12 days                  │
│    Last workout: Yesterday (Lift+Run)   │
│    → Good day for rest or light cardio  │
├─────────────────────────────────────────┤
│ 📚 Peds Exam in 22 days                 │
│ 💊 23 pills remaining (refill Feb 15)   │
├─────────────────────────────────────────┤
│ 📊 Stimulant Context                    │
│    50mg Adderall (7:15am) + 150mg caff  │
│    Projected sleep: 11:30pm ✓           │
│    🟢 GREEN mode (6.2h sleep)           │
├─────────────────────────────────────────┤
│                                         │
│   [+ LOG MEAL]      [💪 WORKOUT]        │
│                                         │
│            [📊 Details]                 │
└─────────────────────────────────────────┘
```

---

## Details View (Tap 📊)

All existing features preserved:
- Weight chart / progress visualization
- Calendar heatmap of logged days
- Badges / XP / achievements system
- Refeed tracker (7000 kcal threshold)
- Body composition trends
- Export functionality
- Gamification (confetti, level-up)

---

# PART 5: IMPLEMENTATION PLAN

## 8 Phases, 40 Tasks

### Phase 1: Foundation
| Task | Description |
|------|-------------|
| 1.1 | Update state structure with new fields |
| 1.2 | Create loadEcosystemData() function (cross-app Firebase reads) |
| 1.3 | Create fallback defaults if pulls fail |
| 1.4 | Fix height constant (68.5 inches) |
| 1.5 | Update profile defaults (27% BF) |

### Phase 2: Simple View
| Task | Description |
|------|-------------|
| 2.1 | Create Simple View HTML structure |
| 2.2 | Implement getSimpleStatus() function |
| 2.3 | Create progress bar components |
| 2.4 | Remove morning setup screen requirement |
| 2.5 | Add stimulant context display panel |

### Phase 3: Nudge System
| Task | Description |
|------|-------------|
| 3.1 | Implement checkEatingNudges() |
| 3.2 | Implement checkAdderallInventoryWarning() |
| 3.3 | Implement getExamAwareGuidance() |
| 3.4 | Create nudge display component |
| 3.5 | Add nudge dismissal + don't-repeat logic |

### Phase 4: Meal Logging
| Task | Description |
|------|-------------|
| 4.1 | Create quick-tap food grid UI |
| 4.2 | Sort frequent foods by usage |
| 4.3 | Implement parseClaudeInput() |
| 4.4 | Create "Other" input with paste detection |
| 4.5 | Add "Save to frequent foods?" prompt |

### Phase 5: Workout Logging
| Task | Description |
|------|-------------|
| 5.1 | Create workout logging modal |
| 5.2 | Implement multi-activity parsing |
| 5.3 | Implement getWorkoutRecommendation() |
| 5.4 | Track lastWorkoutDate and lastWorkoutType |
| 5.5 | Integrate with gym streak tracking |

### Phase 6: Monthly Body Composition
| Task | Description |
|------|-------------|
| 6.1 | Create measurement input modal |
| 6.2 | Implement Navy method with correct height |
| 6.3 | Create results display with trends |
| 6.4 | Add monthly reminder trigger |
| 6.5 | Store measurement history |

### Phase 7: Weekly Export
| Task | Description |
|------|-------------|
| 7.1 | Create generateWeeklyExport() function |
| 7.2 | Include ecosystem data (pills, exams) |
| 7.3 | Add export button to Details view |
| 7.4 | Create copy-to-clipboard functionality |

### Phase 8: Polish & Testing
| Task | Description |
|------|-------------|
| 8.1 | Test cross-app Firebase reads |
| 8.2 | Test fallback behavior when pulls fail |
| 8.3 | Test all nudge trigger conditions |
| 8.4 | Mobile responsiveness pass |
| 8.5 | Final QA on all flows |

---

# PART 6: ACCOUNTABILITY FRAMEWORK

## Roles

**Sully (User):**
- Forwards status reports from coder to Claude
- Answers questions about app usage
- Tests app at checkpoints

**Coder:**
- Builds the app in 8 phases
- Sends status reports after each work session
- Flags blockers

**Claude (Consultant):**
- Reviews status reports
- Verifies work matches spec
- Catches missing items
- Approves checkpoints or requests fixes
- Creates Claude Instructions Document after build

---

## 4 Checkpoints

| Checkpoint | After Phase | What Gets Reviewed |
|------------|-------------|-------------------|
| CP1 | Phase 2 | Simple View works, cross-app data pulls work |
| CP2 | Phase 4 | Meal logging complete, paste parser works |
| CP3 | Phase 6 | Monthly body comp works with Navy method |
| CP4 | Phase 8 | Full app ready for production |

---

## Status Report Format

Coder sends this after each work session:

```
BODY COMP v3 STATUS REPORT
Date: [date]
Phase: [which phase]

COMPLETED:
- [Task X.X]: [Description] ✅

IN PROGRESS:
- [Task X.X]: [Description] — [% complete]

BLOCKERS:
- [Any issues needing input]

NEXT:
- [What's planned next]

OVERALL PROGRESS:
Phase 1: ████████░░ 80%
Phase 2: ██░░░░░░░░ 20%
Phase 3: ░░░░░░░░░░ 0%
...
```

---

## Feature Checklist (For Consultant Review)

### Core Infrastructure
- [ ] Pulls sleep hours from Stimulant Calculator
- [ ] Pulls Adderall timing from Stimulant Calculator
- [ ] Pulls projected sleep from Stimulant Calculator
- [ ] Pulls pills remaining from Dental Quest
- [ ] Pulls refill date from Dental Quest
- [ ] Pulls exam schedule from D3 Roadmap
- [ ] Graceful fallback if pulls fail
- [ ] 7-day rolling TDEE average
- [ ] Workout calories adjust daily TDEE ceiling

### Simple View Dashboard
- [ ] Big status indicator (ON TRACK / BEHIND / EAT NOW)
- [ ] Calorie progress bar with numbers
- [ ] Protein progress bar with numbers
- [ ] Current nudge display (one at a time)
- [ ] Gym streak + last workout info
- [ ] Workout recommendation (info + advice)
- [ ] Exam countdown
- [ ] Adderall inventory display
- [ ] Stimulant context display (dose, caffeine, projected sleep, mode)
- [ ] Log Meal button
- [ ] Log Workout button
- [ ] Details button

### Nudge System
- [ ] Peak suppression nudge
- [ ] Wearing off nudge
- [ ] Crash zone nudge
- [ ] Late sleep nudge
- [ ] Protein behind nudge
- [ ] Time-based backup nudges
- [ ] Nudges dismissible, don't repeat same day

### Adderall Inventory Warnings
- [ ] Warning if will run out before refill
- [ ] Warning if ≤7 pills remaining
- [ ] Warning if booster taken when supply limited

### Exam-Aware Guidance
- [ ] ≤3 days messaging
- [ ] ≤7 days messaging
- [ ] >7 days messaging
- [ ] Affects workout recommendations

### Meal Logging
- [ ] Quick-tap grid (top 9 by frequency)
- [ ] "Other" button opens text input
- [ ] Paste parser handles MEAL|...|...|...
- [ ] "Add to frequent foods?" prompt
- [ ] Frequency tracking (most-used bubble to top)

### Workout Logging
- [ ] Quick buttons: Lift / Run / Cardio / Walk
- [ ] Paste parser handles WORKOUT|...|...|...
- [ ] Multi-activity support
- [ ] Tracks last workout date
- [ ] Recommendation combines info + advice

### Monthly Measurements
- [ ] First Sunday prompt
- [ ] Waist + neck input fields
- [ ] Navy method with correct height (68.5")
- [ ] Fat mass vs lean mass trend
- [ ] Projection to goal

### Details View
- [ ] All existing features preserved
- [ ] Accessible via 📊 button
- [ ] Not the default view

### Export
- [ ] Weekly summary format
- [ ] Includes pills + refill
- [ ] Includes exam + days
- [ ] Claude-parseable structure

---

# PART 7: FIREBASE PATHS

| App | Path | Key Fields |
|-----|------|------------|
| Stimulant Calculator | `users/{pin}/stimulantCalculator/state` | `hoursSleptLastNight`, `wakeTime`, `medications[]`, `caffeine[]`, `projectedSleepTime` |
| Dental Quest | `users/{pin}/appData/medications` | `30mg.pills`, `30mg.refillDate`, `20mg.pills`, `20mg.refillDate` |
| D3 Roadmap | `users/{pin}/d3Roadmap/` | `deadlines[]` (filter for exams) |
| Body Comp Tracker | `users/{pin}/bodyCompTracker/state` | Own data |

**Path pattern for cross-app reads:**
```javascript
const stimPath = userPath.replace('/bodyCompTracker', '/stimulantCalculator');
const questPath = userPath.replace('/bodyCompTracker', '/appData');
const roadmapPath = userPath.replace('/bodyCompTracker', '/d3Roadmap');
```

---

# PART 8: CLAUDE INSTRUCTIONS DOCUMENT (DRAFT)

**To be finalized after app is built.**

## Purpose
Instructions for any Claude instance to properly format data for Sully's Body Comp Tracker.

## Meal Format
```
MEAL|Name|Calories|Protein|Carbs|Fat
```

## Workout Format
```
WORKOUT|Type|Duration|Calories|Time
```

## Common Foods Reference
| Food | Format |
|------|--------|
| Chipotle Chicken Bowl | `MEAL|Chipotle Chicken Bowl|1035|81|90|32` |
| Orgain Shake (1 scoop) | `MEAL|Orgain Shake|160|21|8|3` |
| Orgain Shake (2 scoops) | `MEAL|Orgain Shake (2 scoops)|320|42|16|6` |
| Greek Yogurt (Fage 2%) | `MEAL|Fage Greek Yogurt|140|20|6|4` |
| Scrambled Eggs (3) | `MEAL|Scrambled Eggs (3)|210|18|2|15` |
| Grilled Chicken Breast (6oz) | `MEAL|Grilled Chicken Breast|280|52|0|6` |
| Salmon Fillet (6oz) | `MEAL|Grilled Salmon|350|40|0|20` |
| Trail Mix (2oz) | `MEAL|Trail Mix (2oz)|320|8|28|18` |
| Quest Protein Bar | `MEAL|Quest Protein Bar|200|21|22|8` |

## Key Context
- Height: 5'8.5"
- Goal: 170 lbs by June 2026
- Takes 50mg Adderall XR ~7am
- GREEN mode: 1,900 cal / 172g protein
- YELLOW mode: 2,000 cal / 189g protein
- ORANGE mode: Maintenance / 198g protein

## Key Reminders
- Adderall peak suppression: 1-4 hours post-dose
- If 1pm and hasn't eaten, that's concerning
- Gym streak is THE metric
- Don't lecture about sleep

---

# PART 9: GOD MODE FEATURES (Phase 8A)

**Added January 26, 2026** — Expansion to make the app predictive, not just reactive.

## 8A.1: Schedule-Aware Eating Windows
Pulls today's schedule from D3 Roadmap Monthly Planner to calculate:
- Blocked windows (clinic, lecture, exam times)
- Eating windows (inverse of blocked)
- Total eating hours
- Front-load flag (if <6 hours eating time)
- Schedule intensity (EASY/MEDIUM/HARD)

**UI:** Schedule card in Simple View showing blocked windows and eating hours.

## 8A.2: Tomorrow Preview
Evening nudge (7-10pm) if tomorrow is brutal:
- Pulls tomorrow's schedule
- Detects back-to-back sessions
- Shows meal prep reminder for brutal days

## 8A.3: Exam Day Protocol
Detects exam in today's schedule and provides phase-specific guidance:
- MORNING_PREP: Complex carbs, steady caffeine
- PRE_EXAM: Light snack, hydrate, no new caffeine
- FINAL_HOUR: Deep breaths, trust prep
- POST_EXAM: Full meal, celebrate appropriately

**UI:** Exam day card in Simple View with phase-specific nutrition guidance.

## 8A.4: Sleep Debt Accumulation
Pulls last 7 days of sleep from Stimulant Calculator:
- Calculates cumulative debt vs 49hr/week target
- Counts consecutive bad nights
- Determines severity: LOW/MODERATE/HIGH/SEVERE
- SEVERE debt forces ORANGE mode override
- HIGH debt bumps GREEN → YELLOW

**UI:** Sleep debt indicator when MODERATE or worse.

## 8A.5: Exam Stress Multiplier
Checks days until next exam:
- ≤3 days: raises calorie target +20%
- 4-7 days: raises calorie target +10%
- Stores multiplier reason for display

## 8A.6: Protein Distribution Warning
After 8pm, checks if >50% of protein consumed after 6pm:
- Warns about back-loaded protein distribution
- Suggests moving protein to morning

## 8A.7: Weekly Rhythm Analysis
Aggregates historical data by day of week:
- Calculates avg calories, protein, gym rate per day
- Identifies weak days (below average)
- Shows nudge on weak days ("Wednesday is your weak day")

## 8A.8: Caffeine × Adderall Modeling
Models combined stimulant effect:
- Calculates Adderall effect curve (hours since dose)
- Calculates caffeine effect (mg and half-life)
- Models combined/synergistic effect
- Determines suppression level and end time
- Calculates crash risk window (time + intensity)

**Enhanced nudges reference combined effect.**

---

## God Mode State Structure

```javascript
state.ecosystemContext = {
  // ... existing fields ...

  // Schedule data
  schedule: {
    todayTasks: [],
    tomorrowTasks: [],
    blockedWindows: [],
    eatingWindows: [],
    totalEatingHours: 0,
    frontLoadRequired: false,
    frontLoadDeadline: null,
    scheduleIntensity: 'EASY' | 'MEDIUM' | 'HARD'
  },

  // Sleep debt
  sleepDebt: {
    last7Days: [],
    totalSleep: 0,
    avgSleep: 0,
    weeklyDebt: 0,
    consecutiveBadNights: 0,
    severity: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE'
  },

  // Combined stimulant effect
  stimulantEffect: {
    adderallEffect: 0,
    caffeineEffect: 0,
    combinedEffect: 0,
    suppressionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE',
    suppressionEnd: null,
    crashRiskWindow: { start, end, intensity }
  },

  // Exam day
  examDay: {
    isExamDay: false,
    examName: null,
    examTime: null,
    phase: null // 'MORNING_PREP' | 'PRE_EXAM' | 'FINAL_HOUR' | 'POST_EXAM'
  }
};
```

---

# PART 10: PROJECT STATUS

**As of January 26, 2026:**

| Phase | Status | Tasks |
|-------|--------|-------|
| Phase 1: Foundation | ✅ COMPLETE | 1.1-1.8 |
| Phase 2: Simple View | ✅ COMPLETE | 2.1-2.5, consolidated 3 & 5 |
| Phase 3: Nudge System | ✅ COMPLETE | Consolidated into Phase 2 |
| Phase 4: Meal Logging | ✅ COMPLETE | 4.1-4.5 |
| Phase 5: Workout Logging | ✅ COMPLETE | Consolidated into Phase 2 |
| Phase 6: Monthly Body Comp | ✅ COMPLETE | 6.1-6.5 |
| Phase 7: Weekly Export | ✅ COMPLETE | 7.1-7.4 |
| **Phase 8A: God Mode** | ✅ COMPLETE | 8A.1-8A.8 |
| **Phase 8B: Polish & Testing** | ✅ COMPLETE | 8B.1-8B.5 |

**Overall Progress:**
```
Phase 1-7: ██████████ 100% ✅
Phase 8A:  ██████████ 100% ✅ (God Mode Features)
Phase 8B:  ██████████ 100% ✅ (Polish & Testing)
```

**Checkpoints:**
- CP1 ✅ PASSED — Simple View works, data pulls work
- CP2 ✅ PASSED — God mode features working, schedule integration verified
- CP3 ✅ PASSED — Full app ready for production

**Final Commit:** `c879e25 Body Comp Tracker v3 God Mode: 8 predictive intelligence features`

**Deployed:** January 26, 2026

---

# PART 11: DOCUMENT HISTORY

| Date | Event |
|------|-------|
| Jan 26, 2026 | Initial specification created |
| Jan 26, 2026 | Coder submitted 8-phase implementation plan |
| Jan 26, 2026 | Consultant cross-referenced and signed off |
| Jan 26, 2026 | Master backup document created |
| Jan 26, 2026 | Phases 1-7 completed |
| Jan 26, 2026 | God Mode expansion scope added (Phase 8A) |
| Jan 26, 2026 | Phase 8A completed (8 predictive intelligence features) |
| Jan 26, 2026 | Phase 8B completed (polish & testing, 2 bugs fixed) |
| Jan 26, 2026 | **PROJECT COMPLETE** — Deployed to production |

---

# PART 12: PHASE 8B TESTING RESULTS

## 8B.1: Cross-App Firebase Reads ✅
All 6 Firebase operations verified to have proper try-catch error handling:
- `loadEcosystemData()` — main data loader
- `loadScheduleData()` — D3 Roadmap schedule
- `loadSleepDebtData()` — Stimulant Calculator 7-day history
- `loadStimulantData()` — Adderall/caffeine timing
- `loadExamData()` — D3 Roadmap exams
- `loadMedicationData()` — Dental Quest pills

## 8B.2: Fallback Behavior ✅
All render functions verified to hide elements gracefully when data is null:
- `renderScheduleCard()` — returns empty string if no schedule
- `renderExamDayCard()` — returns empty string if not exam day
- `renderSleepDebtIndicator()` — hides for LOW severity
- `renderStimulantContext()` — shows "No data" fallback

## 8B.3: Nudge Trigger Conditions ✅
All 9 priority levels verified with null checks:
1. SEVERE sleep debt → ORANGE mode
2. Exam day protocol
3. Crash risk window
4. Front-load warning
5. Schedule-aware eating
6. Stimulant-aware timing
7. Protein distribution
8. Weekly rhythm weak day
9. Tomorrow preview

## 8B.4: Mobile Responsiveness ✅
Added CSS for God Mode cards at 480px breakpoint:
- Schedule card header stacks vertically
- Blocked item text scales down
- Exam day card text responsive
- Sleep debt card responsive

## 8B.5: Bugs Fixed
1. **saveData() → saveState()**: 5 occurrences of `saveData()` changed to `saveState()` (the actual function name)
2. **XSS vulnerability**: Exam name now escaped with `escapeHtml()` before rendering in innerHTML

---

**END OF DOCUMENT**

*Body Comp Tracker v3 with God Mode is now complete and deployed. The app pulls data from 3 other apps (Stimulant Calculator, D3 Roadmap, Dental Quest) to provide predictive, schedule-aware nutrition guidance.*
