# CLAUDE.md - Dental Student Quest

## CRITICAL WORKFLOW RULES (READ FIRST!)

### NEVER REBUILD ENTIRE FILES
- Files are 9,000-10,000+ lines each
- Rebuilding causes token explosions and breaks things
- ALWAYS use `str_replace` for surgical, targeted edits ONLY

### str_replace Workflow (FOLLOW EXACTLY)
```
1. FIND the exact code block to change (use grep/view to locate)
2. COPY the exact existing code (old_str must match EXACTLY including whitespace)
3. WRITE the replacement code (new_str)
4. Use str_replace tool with:
   - path: /home/claude/[filename].html
   - old_str: [exact existing code]
   - new_str: [replacement code]
5. VERIFY the edit worked (view the changed section)
```

### str_replace Rules
- `old_str` must be UNIQUE in the file (appears exactly once)
- Include enough context (surrounding lines) to ensure uniqueness
- Preserve exact indentation and whitespace
- If str_replace fails with "not found", the string doesn't match exactly - recheck spacing/characters

### File Handling Workflow
```
1. Copy file from /mnt/project/ or user upload → /home/claude/
2. Make ALL edits with str_replace (multiple calls if needed)
3. Copy final file to /mnt/user-data/outputs/
4. Use present_files tool to deliver
5. Provide deployment steps (below)
```

### Deployment Steps (Give These EVERY Time)
```
1. Download the file from the link above
2. Go to github.com/suleman7-DMD/dental-quest
3. Click on the file → pencil icon
4. Select ALL (Cmd+A / Ctrl+A) → Delete
5. Paste new code (Cmd+V / Ctrl+V)
6. Scroll down → Click "Commit changes"
7. Wait for green checkmark (1-2 minutes)
8. Hard refresh the live site: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## WHO IS SULLY (The User)

### Personal Context
- **Name**: Sully
- **Age**: 29, turning 30 in January 2025
- **Location**: Boston (originally from Naperville, Chicago area)
- **School**: Boston University Goldman School of Dental Medicine
- **Year**: D3 (third-year dental student), graduating May 2027
- **Class Rank**: ~90/110, 3.5 GPA
- **ADHD**: Managed with Adderall XR (45mg max daily: 30mg + 20mg)
- **Coding Experience**: ZERO - Claude has built this entire project through iterative guidance

### Academic Situation (Spring 2026)
- **At-Risk Course**: Pediatric Dentistry (Peds) - scored 77% on Exam 1 (40% of grade)
- **Locked-in Points**: 33.3 pts in Peds (Exam 1: 30.8 + Headstart: 2.5)
- **Critical Exam**: Peds Exam 2 on Feb 18 (45% of grade) - needs ~80%+ to be comfortable
- **Brutal Month**: February 2026 has 5 exams

### Personal Challenges (Why This App Matters)
- **"Demonic Three"** destructive patterns to avoid:
  1. High-risk trading
  2. Relationship rumination
  3. Social isolation
- **Core Principle**: "Action precedes hope" - movement breaks functional freeze
- **Recovery Mode**: Recovering from financial crisis
- The app helps prevent spiraling by keeping everything organized in one place

---

## PROJECT ARCHITECTURE

### Hosting & Deployment
- **URL**: https://suleman7-dmd.github.io/dental-quest/
- **Hosting**: GitHub Pages
- **Repo**: github.com/suleman7-DMD/dental-quest
- **Pattern**: Single-file HTML apps with embedded CSS/JS (NO build system, NO npm, NO tests)

### Files (Current Versions - Updated Jan 23, 2026)
| File | Lines | Size | Purpose |
|------|-------|------|---------|
| `index.html` | ~10,500 | ~458KB | Main app: Focus Mode (1-3-5 rule), tasks/XP, dashboard, financials, notebook, calendar, medications, pomodoro |
| `d3-roadmap.html` | ~13,700 | ~628KB | Academic tracker: 7+ tabs, Clinical Tab with Competencies, Peds AT RISK, grade calculator, deadlines, monthly planner |
| `stimulant-elimination-calculator.html` | ~10,600 | ~523KB | Pharmacokinetic sleep prediction: Process S + Process C circadian modeling, caffeine tracking, sleep debt, workout planner |
| `lecture-prompt-transformer.html` | ~2,800 | ~119KB | Standalone tool: Transform lecture content for Claude study assistance |
| `body-comp-tracker.html` | ~5,200 | ~220KB | Body composition/calorie tracker: Summer cut goal, mode system (GREEN/YELLOW/ORANGE based on sleep), gamification, XP/levels/achievements, calendar heatmap, weekly insights |

### Working Directory
- Files should be copied to `/home/claude/` for editing
- Output to `/mnt/user-data/outputs/` for delivery
- Use `present_files` tool to give user download link

---

## FIREBASE CONFIGURATION

### Config (SAME Across All 3 Apps - DON'T CHANGE)
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};
```

### PIN Authentication (SAME Across All Apps)
```javascript
// All apps share the same PIN stored in localStorage
const savedPin = localStorage.getItem('dentalQuestPin');
const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
userPath = 'users/' + hashedPin + '/[appName]';
// appName = 'appData' | 'stimulantCalculator' | 'd3Roadmap'
```

### Firebase Data Structure
```
users/user_[hashedPin]/
├── appData/                    (index.html)
│   ├── tasks[]
│   ├── stats{}
│   ├── medications{}
│   ├── calendarNotes{}
│   ├── notebook{}
│   ├── financials{}
│   │   ├── masterLiquidity{}
│   │   ├── committedBills[]
│   │   ├── recurringExpenses{}
│   │   ├── monthlyPayments{}    ← NEW: tracks Feb/Mar/Apr/May paid status
│   │   ├── creditCards[]
│   │   └── actionItems[]
│   ├── pillAssignments{}
│   ├── calendarEvents[]
│   ├── dailyPlanner{}
│   └── focusModeData{}
├── stimulantCalculator/        (stimulant-elimination-calculator.html)
│   ├── state{}
│   └── lastUpdated
└── d3Roadmap/                  (d3-roadmap.html)
    ├── pedsLockedIn (default: 33.3)
    ├── mandatoryItems{}
    ├── grades{}
    ├── editedDeadlines{}
    ├── customDeadlines[]
    ├── examStudyProgress{}
    ├── monthlyPlanner{}
    │   ├── notes[]
    │   ├── customTasks[]
    │   ├── overriddenStatic[]
    │   └── completedTasks[]
    ├── clinicalData{}           ← NEW (v31)
    │   ├── patients{}
    │   ├── appointments[]
    │   ├── completedProcedures[]
    │   └── competencies{}       ← All graduation requirements
    ├── dailyPlanner{}
    └── lastSaved
```

### Sync Pattern (CRITICAL - DON'T BREAK)
```javascript
// On load:
loadFromFirebase() → merge with defaults → initUI()

// On save:
saveData() → localStorage IMMEDIATELY → Firebase debounced (300ms)

// On visibility change:
hidden → save immediately to both
visible → refresh from Firebase

// On beforeunload:
save immediately

// Sync status indicators:
🟢 connected | 🔄 syncing | 🔴 offline | ⚠️ error | ⏳ connecting
```

### Sync Functions (All 3 Apps Have These Now)
- `updateSyncStatus(status, message)` - Updates UI indicator
- `forceCloudSync()` - Manual refresh button, fetches ALL data from Firebase
- `setupRealtimeSync()` / `setupMainDataRealtimeSync()` - Real-time listener for cross-device updates
- Visibility change handler - saves on tab hide, refreshes on tab show
- Fallback timer (3 seconds) - ensures app works even if Firebase is slow

### Firebase Security Rules (IMPORTANT)
The app uses client-side PIN authentication, not Firebase Auth. Current recommended rules:

```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "$userId.beginsWith('user_')",
        ".write": "$userId.beginsWith('user_')",
        ".validate": "newData.hasChildren()"
      }
    },
    ".read": false,
    ".write": false
  }
}
```

**To verify/update rules:**
1. Go to Firebase Console → https://console.firebase.google.com
2. Select "dental-student-quest" project
3. Build → Realtime Database → Rules tab
4. Paste rules and click "Publish"

**Security Notes:**
- Base64 PIN is NOT a cryptographic hash - it's reversible
- Anyone who guesses your PIN can access your data
- For production: consider adding Firebase Authentication

---

## CRITICAL BUGS TO AVOID

### 1. Double loadData() Calls
- Can cause race conditions and data loss
- Always check if data is already loading before calling again

### 2. Timezone Issues with Dates (VERY COMMON BUG)
```javascript
// WRONG - causes off-by-one errors
// UTC midnight = previous day in EST/local timezone!
const date = new Date('2026-02-02');

// CORRECT - parse in local timezone
const [year, month, day] = '2026-02-02'.split('-').map(Number);
const date = new Date(year, month - 1, day);
```

### 3. Missing Firebase Fields
- Always check for existence of `pillAssignments`, `calendarEvents`, etc.
- Use defaults/fallbacks when merging:
```javascript
state = {
    ...defaults,
    ...(firebaseData || {})
};
```

### 4. Breaking Cross-Sync Between Components
- Dashboard ↔ Deadlines use same `deadlines` array
- After editing: `saveData() → renderDeadlines() → renderDashboard()`
- Monthly Planner needs deep merge for nested objects

### 5. Orphan Function Calls
- Fixed in v28: `setupPlannerRealtimeSync()` was called but didn't exist
- Always verify functions exist before calling them
- Search for function definition: `grep -n "function functionName" file.html`

### 6. str_replace Failures
- If "string not found" error: whitespace/indentation doesn't match exactly
- Use `view` tool to see exact current code before replacing
- Include enough surrounding context to make old_str unique

---

## GRADE CALCULATOR MATH (D3 Roadmap)

### Formula (BULLETPROOF - DON'T CHANGE)
```javascript
// For each course component
if (grade !== null && grade !== undefined && grade !== '') {
    earnedPoints += (parseFloat(grade) / 100) * comp.weight;
    completedWeight += comp.weight;
} else {
    remainingWeight += comp.weight;
}

// Calculate needed average
const pointsNeeded = targetGrade - earnedPoints;
const avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;
```

### Peds Verification Example
- Locked in: 33.3 pts (Exam 1: 77% × 40% + Headstart: 100% × 2.5%)
- Remaining: 57.5% (Exam 2: 45% + Exam 3: 7.5% + Ortho Module: 5%)
- To get 70%: need (70-33.3)/57.5 × 100 = **63.83%** avg
- To get 80%: need (80-33.3)/57.5 × 100 = **81.22%** avg

### Course Passing Thresholds
- Most courses: 60%
- **Perio 2: 65%** (HIGHER - don't forget!)

---

## FINANCIALS SYSTEM (index.html)

### Purpose
Track loan disbursement money from Jan 5 until May 14 (next disbursement). Shows if Sully is on track to have a cushion when next disbursement arrives.

### Data Structure
```javascript
financials = {
    masterLiquidity: {
        currentCash: 0,              // Actual checking account balance
        lastUpdated: null,
        semesterEndDate: '2026-05-14', // Next disbursement date
        targetCushion: 2285          // Goal: have this much on May 14
    },
    committedBills: [...],           // One-time bills (January specific)
    recurringExpenses: {             // Monthly expense categories
        rent: { amount: 1280, category: 'housing' },
        // ... other expenses
    },
    monthlyPayments: {               // Track which months are paid
        '2026-02': { paid: false, paidDate: null, label: 'February 2026' },
        '2026-03': { paid: false, paidDate: null, label: 'March 2026' },
        '2026-04': { paid: false, paidDate: null, label: 'April 2026' },
        '2026-05': { paid: false, paidDate: null, label: 'May 1-14', partial: true, fraction: 0.45 }
    },
    creditCards: [...],              // Credit card tracking
    actionItems: [...]               // To-do items for financial tasks
};
```

### Projection Calculation (CRITICAL - DON'T BREAK)
```javascript
function calculateFinancialStatus() {
    // 1. Start with actual cash
    const liquid = financials.masterLiquidity.currentCash;

    // 2. Calculate unpaid one-time bills
    const unpaidBills = financials.committedBills.filter(bill => !bill.paid);
    const committedExpenses = unpaidBills.filter(b => b.type === 'expense').reduce(...);
    const committedIncome = unpaidBills.filter(b => b.type === 'income').reduce(...);

    // 3. Available after one-time bills
    const availableCash = liquid + committedIncome - committedExpenses;

    // 4. Calculate unpaid monthly expenses (ONLY unchecked months!)
    const monthlyBurn = Object.values(financials.recurringExpenses).reduce(...);
    let unpaidMonthsTotal = 0;
    Object.entries(financials.monthlyPayments).forEach(([key, month]) => {
        if (!month.paid) {
            const fraction = month.partial ? month.fraction : 1;
            unpaidMonthsTotal += monthlyBurn * fraction;
        }
    });

    // 5. Final projection
    const projectedBalance = availableCash - unpaidMonthsTotal;

    return { projectedBalance, healthStatus, ... };
}
```

### Key Functions
- `renderFinancialCockpit()` - Main render function
- `renderMasterCockpit()` - Current cash display
- `renderCommittedBills()` - One-time bills checklist
- `renderRecurringExpenses()` - Monthly expenses + month tracker
- `renderProjectionPanel()` - Calculation breakdown
- `toggleMonthPaid(monthKey)` - Mark month as paid/unpaid
- `toggleBillPaid(billId)` - Mark one-time bill as paid
- `addRecurringExpense()` - Add new expense category
- `deleteRecurringExpense(key)` - Remove expense category

### Health Status Colors
- 🟢 GREEN "ON TRACK": projectedBalance >= targetCushion
- 🟡 YELLOW "BELOW TARGET": projectedBalance > 0 but < targetCushion
- 🔴 RED "DEFICIT PROJECTED": projectedBalance < 0

---

## STIMULANT CALCULATOR - Pharmacokinetic Model

### XR Release Pattern
- 50% immediate release at dose time
- 50% delayed release at T+4 hours
- Each pulse decays independently via half-life formula:
  `remaining = dose × 0.5^(elapsed_hours / half_life)`

### Default Parameters
- Amphetamine half-life: 12 hours
- Sleep threshold: 15mg
- Caffeine half-life: 5 hours
- Caffeine threshold: 25mg

### Vitamin C Effect
- Reduces amphetamine half-life to 70% of normal (12h → 8.4h)
- Only applies AFTER the specified time

### Vitamin C Date Picker
- Uses `<input type="date">` instead of Today/Tomorrow dropdown
- `date` field (YYYY-MM-DD) persists to Firebase
- Calculation uses actual date difference from today
- Summaries show formatted date label when not today
- Same pattern used for med doses and caffeine in All-Nighter mode

### Circadian Rhythm (Process C)
- Wake Maintenance Zone: 2 hours before Forbidden Zone
- Forbidden Zone: 13-15 hours after wake (peak alertness, HARD BLOCKER)
- Sleep Gate: 15-17 hours after wake (optimal sleep window)

---

## RECENT UPDATES (January 2026)

### v33 Lecture Prompt v3.2-FINAL + Multi-Portion Workflow (Jan 25, 2026)

Extended session involving rigorous Analyst A/B debate to optimize lecture-to-notes prompt engineering.

---

#### BACKGROUND: The Problem Being Solved

**Sully's Original Workflow (Painful):**
1. Download audio transcript from Echo360
2. Download PDF lecture slides
3. Break 1-2 hour lectures into 15-20 minute chunks (5-8 portions per lecture)
4. Use comprehensive prompt to generate notes
5. Output too long → use condensation prompt
6. Manual markdown → Word conversion
7. Run on both LLMs (Claude and Gemini), compare outputs
8. **Pain point:** 4-6 iterations per lecture chunk, inconsistent results

**Goal:** Reduce iterations, improve consistency, create sustainable workflow for 5 exams in February.

---

#### PHASE 1: v3.2-FINAL Prompt Development

**Trial Run Results (4 trials across 2 models):**
- Original prompt vs NEW prompt comparison
- **Finding:** 61% word count reduction with no content loss
- **Finding:** 4-6 iterations → 1 iteration (70% time savings)

**Research Applied:**
| Technique | How Applied |
|-----------|-------------|
| Prompt Repetition (Dec 2025 Google Research) | Key instructions repeated, placed close to generation point |
| Step-back Prompting | "Classify first, then format" processing pattern |
| Cognitive Load Theory (7±2) | Consolidated from 13 sections to 7 sections |
| Pink Elephant Problem | Reframed negatives as positives (what TO do, not what NOT to do) |
| ReAct Framework | Classify → Format → Verify pattern |

**v3.2-FINAL Key Features:**
1. **INSTRUCTION PRIORITY section** - Clear hierarchy for conflict resolution
2. **CALIBRATION** - 500-800 words per 15-min portion (flexible)
3. **Depth Tiering** - HIGH/MEDIUM/LOW YIELD classification
4. **Algorithm Code Blocks** - For branching decisions:
   ```
   [Decision question?]
       /    \
     YES    NO
      ↓      ↓
   [Action] [Action]
   ```
5. **Protocol Code Blocks** - For prescriptions (Rx/Disp/Sig format)
6. **Format Selection Priority** - Anti-overuse clause prevents format inflation
7. **Grounding Rule** - Mark heavy inference with [INFERENCE]
8. **Synthesis Rule** - NO direct professor quotes (synthesize all content)

---

#### PHASE 2: Multi-Portion Workflow Debate (Analyst A vs B)

**The Core Question:** How to handle portions 2-N within the same chat conversation?

**Analyst B's Initial Proposal (Simple):**
- Portion 1: Full prompt
- Portions 2-N: Just paste content with `## NEXT PORTION` header
- Rationale: Instructions already in context

**Analyst A's Rebuttal:**
- Cited prompt repetition research: Instructions at END of context have stronger influence
- By Portion 5, original instructions buried under ~10,000 tokens
- "Lost in the Middle" phenomenon: Models attend less to middle of long contexts
- Simple continuation leads to DRIFT (model starts quoting directly, stops using tables)

**Analyst B's Counter-Attack:**
1. **Scope creep concern** - Reinforcement block getting bloated
2. **Arbitrary checkpoint formula** - "Portion 5" has no empirical basis
3. **Correction embedding conflicts** - Need hierarchical priority integration
4. **Adaptive Reinforcement proposal** - Only reinforce what's actually drifting

**Final Convergence (Both Analysts Agreed):**

| Element | Converged Position |
|---------|-------------------|
| Reinforcement Block needed? | ✅ Yes |
| Token budget | ~65 tokens (principled inclusion criteria) |
| Checkpoint timing | Portion 5 for 8+ portion lectures (simple rule + behavioral override) |
| Corrections | Priority-level insertion (2, 2.5, 3, 4) |
| "PORTION X of ~Y" framing | ❌ Dropped (no proven benefit, estimate errors) |
| A/B testing needed | ✅ Yes (theoretical debate has diminishing returns) |

**Principled Inclusion Criteria for Reinforcement Block:**
Include ONLY instructions that:
1. Have high drift probability (synthesis rule drifts most)
2. Are invisible in output (can't self-correct by looking)
3. Are novel to v3.2-FINAL (algorithms/protocols may be forgotten)

---

#### PHASE 3: Implementation

**Templates Added to lecture-prompt-transformer.html:**

```javascript
// Full prompt (~600 tokens)
const DEFAULT_TEMPLATE = `# LECTURE NOTES TRANSFORMATION v3.2-FINAL...`

// Reinforcement block (~65 tokens)
const STANDARD_REINFORCEMENT_TEMPLATE = `## CONTINUATION - PORTION [PORTION_NUM]

**Maintain v3.2-FINAL:**
- NO direct quotes (synthesize)
- Algorithm blocks for branching decisions
- Protocol blocks for prescriptions/dosing
- HIGH YIELD → full detail | LOW YIELD → one line or omit

**Slides:**
[SLIDE_TEXT]

---

**Transcript:**
[AUDIO_TEXT]

---

Continue notes.`

// Correction block (~80 tokens)
const CORRECTION_TEMPLATE = `## CORRECTION + CONTINUATION - PORTION [PORTION_NUM]

**Correction (Priority [CORRECTION_PRIORITY]):** [CORRECTION_TEXT]

**Maintain v3.2-FINAL:**
- NO direct quotes (synthesize)
- Algorithm blocks for branching decisions
- Protocol blocks for prescriptions/dosing
- HIGH YIELD → full detail | LOW YIELD → one line or omit

**Slides:**
[SLIDE_TEXT]

---

**Transcript:**
[AUDIO_TEXT]

---

Continue notes with correction applied.`
```

**UI Changes (Both Build + Transform Existing tabs):**
- Portion Type dropdown: First Portion / Continuation / Checkpoint / Correction
- Portion Number input (shown for non-first portions)
- Correction fields: text input + priority dropdown
- Help tooltip explaining each option

**Functions Added:**
- `updatePortionTypeUI()` - Show/hide fields based on selection
- `updateTransformPortionTypeUI()` - Same for Transform tab
- Modified `generateBuildPrompt()` and `generateTransformPrompt()` to handle all portion types

---

#### RECOMMENDED WORKFLOW

**For Sully's typical 5-8 portion lectures (each lecture = separate chat):**

```
LECTURE START (new chat)
├── Portion 1 → First Portion (full v3.2-FINAL)
├── Portion 2 → Continuation
├── Portion 3 → Continuation
├── Portion 4 → Continuation
├── Portion 5 → Checkpoint (if 6+ portions total)
├── Portion 6 → Continuation
├── Portion 7 → Continuation
└── Portion 8 → Continuation

DRIFT DETECTED AT ANY POINT?
└── Use Correction instead, specify what's wrong + priority level
```

**Correction Priority Levels:**
| Priority | Meaning | When to Use |
|----------|---------|-------------|
| 2 | HIGH | Right after synthesis rule (most important) |
| 2.5 | MID-HIGH | Default, good for most corrections |
| 3 | MEDIUM | After HIGH YIELD rule |
| 4 | LOW | Sacrifice last if conflicts |

**When to Use Each Portion Type:**
| Situation | Select |
|-----------|--------|
| Starting any new lecture | First Portion |
| Portions 2, 3, 4 in same chat | Continuation |
| Portion 5+ of long lecture (8+ portions) | Checkpoint |
| Model quoting directly, missing tables, etc. | Correction |

---

#### TESTING STATUS

**Status:** User testing in progress (Jan 25, 2026)

**What to Monitor:**
- Format consistency across portions (tables, algorithms, no direct quotes)
- Whether Continuation block maintains quality vs full prompt
- Drift patterns that trigger Correction usage
- Optimal checkpoint timing for different lecture lengths

**Post-Testing TODO:**
- Adjust Reinforcement Block content based on observed drift
- Refine checkpoint timing formula if needed
- Consider Adaptive Reinforcement (only reinforce drifting elements) as power-user option

---

#### TECHNICAL REFERENCE

**File:** `lecture-prompt-transformer.html`

**Key Constants:**
- `DEFAULT_TEMPLATE` - Full v3.2-FINAL prompt (line ~1344)
- `STANDARD_REINFORCEMENT_TEMPLATE` - Continuation block (line ~1493)
- `CORRECTION_TEMPLATE` - Correction block (line ~1512)
- `LEGACY_TEMPLATE` - Old simple format (kept for comparison)

**Key Functions:**
- `generateBuildPrompt()` - Build tab prompt generation
- `generateTransformPrompt()` - Transform tab prompt generation
- `updatePortionTypeUI()` - Build tab UI updates
- `updateTransformPortionTypeUI()` - Transform tab UI updates
- `getCurrentTemplate()` - Returns custom or default template

**Placeholders:**
- `[COURSE_NAME]` - Course name
- `[LECTURE_TOPIC]` - Lecture topic
- `[SLIDE_TEXT]` - Slide content
- `[AUDIO_TEXT]` - Transcript content
- `[PORTION_NUM]` - Portion number (continuation/correction)
- `[CORRECTION_TEXT]` - What needs fixing (correction only)
- `[CORRECTION_PRIORITY]` - Priority level (correction only)

**localStorage:**
- `lecturePromptTemplate` - Custom template storage
- User must "Reset to Default" in Template tab to get v3.2-FINAL if old template cached

---

#### COMMITS (Jan 25, 2026)

```
82cb4c5 Add portion type selector to Transform Existing tab
d9f8ab7 Add multi-portion workflow system to lecture transformer
80d3cd6 Implement v3.2-FINAL lecture prompt template
```

---

### v32.1 Deep Audit & Cross-App Enhancements (Jan 23, 2026)

Extended session with comprehensive improvements across all apps.

#### Cross-App Navigation Bar (ALL 4 APPS)
Added consistent navigation header to all apps for easy switching:
- **Files updated:** index.html, d3-roadmap.html, stimulant-elimination-calculator.html, lecture-prompt-transformer.html
- Purple gradient header with app links
- Current app highlighted, others show on hover
- Mobile responsive (stacks vertically)

#### Offline Sync Queue (index.html)
- Added `pendingSyncQueue[]` for offline operations
- Online/offline event listeners auto-process queue
- Operations saved to localStorage when offline, synced when back online
- Pattern: `queueSyncOperation(operation)` → process on `navigator.onLine`

#### Date Picker Overhaul (stimulant-elimination-calculator.html)
**Changed from Today/Tomorrow dropdown to precise date pickers:**
- All 3 components now use `<input type="date">` for max precision
- Works in BOTH regular mode AND All-Nighter mode
- Meds and caffeine have `max="${today}"` to prevent future dates
- Vitamin C allows future dates (for planning)

**State structure changes:**
```javascript
// OLD: modifiers.vitaminC.isNextDay (boolean)
// NEW: modifiers.vitaminC.date (YYYY-MM-DD string)

// Medication entries now include: { id, dose, time, date }
// Caffeine entries now include: { id, amount, time, date, ... }
```

#### Pharmacokinetic Calculation Fixes (CRITICAL)
**Bug: calculateCaffLoad() only handled today/yesterday**
- Old code silently ignored dates 2+ days ago
- Fix: Days-difference calculation handles any past date
```javascript
const daysDiff = Math.round((todayDate - doseDate) / (1000 * 60 * 60 * 24));
if (daysDiff < 0) return; // Skip future
if (daysDiff > 2) return; // Skip >48h (caffeine)
const effectiveDoseTime = baseDoseTime - (daysDiff * 24 * 60);
```

**Bug: Undefined `doseTime` variable in calculateAmpLoad()**
- XR calculation section referenced `doseTime` but only `baseDoseTime` was defined
- Would cause ReferenceError for today's fresh doses
- Fix: Changed all references to `baseDoseTime`

**Bug: calculateAmpLoad() only handled today/yesterday**
- Same pattern as caffeine - now uses days-difference
- Skips doses >72h old (~6 half-lives = negligible)

#### Deleted Redundant File
- Removed `lecture-prompt-transformer.jsx` (HTML version already exists)

#### Commits (Jan 23, 2026 Session)
```
47b483f Fix pharmacokinetic calculations for arbitrary date pickers
becb36e Show date pickers in both regular and All-Nighter modes
3dfc86c Update CLAUDE.md with Firebase rules + date picker docs
90e37fa Replace date dropdowns with proper date inputs
a37c0a6 Add offline sync queue to index.html
090d8d7 Add cross-app navigation to all 4 apps
```

---

### v32 Production Audit Bug Fixes (Jan 23, 2026)

Comprehensive production-grade audit of all 3 apps with 10 bugs fixed total.

#### stimulant-elimination-calculator.html (6 bugs fixed)

**Bug 1: Time Input Not Persisting**
- **Problem:** Changing medication time would reset the input field
- **Cause:** `updateMedEntry()` called `renderMedEntries()` for every field change, destroying the active input
- **Fix:** Added conditional to skip re-render for time-only changes (line 4276):
  ```javascript
  } else if (field === 'time') {
      med.time = value;
      // DON'T re-render for time changes - it destroys the active input!
  }
  ```

**Bug 2: Caffeine Double-Counting When Switching Views**
- **Problem:** Caffeine entries appeared twice after switching between Focus/Full view
- **Cause:** `setViewMode()` and Firebase sync didn't call `renderFocusCaffeineList()`
- **Fix:** Added missing render calls to `setViewMode('full')` and `syncStateFromFirebase()` (lines 9527, 9080)

**Bug 3: Vitamin C Toggle Reset on Reload**
- **Problem:** Vitamin C and workout modifiers cleared on every page load when history was empty
- **Cause:** Code checked `if (lastDate !== today)` without verifying lastDate existed
- **Fix:** Changed to `if (lastDate && lastDate !== today)` (line 8879)

**Bug 4: All-Nighter Mode Missing Date Selectors**
- **Problem:** Can't specify if med/caffeine was taken "yesterday" in all-nighter mode
- **Fix:** Added Today/Yesterday dropdowns when `allNighterMode = true` (lines 4315-4319, 4458-4462)
- **New function:** `updateCaffeineDate(index, newDate)` (line 4490)

**Bug 5: Focus/Full View Caffeine Desync**
- **Problem:** Adding/removing caffeine in one view didn't update the other
- **Fix:** Added `renderFocusCaffeineList()` calls to `addCaffeine()`, `removeCaffeine()`, `clearToday()` (lines 4425, 4447, 4545)

**Bug 6: Mobile Touch/Zoom Issues**
- **Problem:** Mobile interface had small touch targets, iOS auto-zoom on inputs
- **Fix:** Added CSS for 44px touch targets, 16px font size, `touch-action: manipulation` (lines 544-562)

#### index.html (4 bugs fixed)

**Bug 1: deleteTask() Orphaned References**
- **Problem:** Deleting a task didn't clean up references in `focusModeData`
- **Cause:** Task could still be referenced in `oneThingId` or `todaysTasks` after deletion
- **Fix:** Added cleanup code to `deleteTask()` (line 10722):
  ```javascript
  if (focusModeData.oneThingId === id) {
      focusModeData.oneThingId = null;
      focusModeData.microSteps = [];
  }
  ['big', 'medium', 'small'].forEach(size => {
      focusModeData.todaysTasks[size] = focusModeData.todaysTasks[size].filter(taskId => taskId !== id);
  });
  ```

**Bug 2: loadData() Crash on Corrupted localStorage**
- **Problem:** App would crash if localStorage contained invalid JSON
- **Fix:** Wrapped `JSON.parse()` in try-catch with graceful fallback (line 5674):
  ```javascript
  try {
      data = JSON.parse(saved);
  } catch (e) {
      console.error('❌ Failed to parse localStorage data:', e);
      showToast('Data corrupted - starting fresh', '⚠️');
      return;
  }
  ```

**Bug 3: Escape Key Didn't Close All Modals**
- **Problem:** Escape key only closed class-based modals, not display-based ones
- **Fix:** Extended escape handler to check `taskEditModal` and `planningModal` (line 8640)

**Bug 4: Medications Refill Date Off-by-One Day**
- **Problem:** Refill date could be wrong by 1 day in EST/local timezone
- **Cause:** `new Date("2026-02-15")` parses as UTC midnight, which is Feb 14th in EST
- **Fix:** Changed 3 locations to use `parseLocalDate()` instead of `new Date(string)`:
  - Line 6739: Display refill date
  - Line 6754: Calculate days until refill
  - Line 8502: Quick summary calculation

### v31 Clinical Tab & Competencies System (d3-roadmap.html)

#### NEW: Clinical Tracker Tab
Full clinical tracking system added to d3-roadmap.html with multiple sub-tabs:
- **Overview** - Summary dashboard of clinical progress
- **Patients** - Patient roster with status tracking
- **Appointments** - Upcoming appointments with axiUm import
- **Competencies** - Graduation requirements tracker (see below)
- **Lectures** - Lecture tracking with import from Claude

#### Competencies System (Graduation Requirements)
Tracks all clinical competencies across 10 disciplines:
- Fixed Prosthodontics, Operative, Complete Dentures, RPDs
- SRPs, Endodontics, Oral Surgery, Pediatric Dentistry
- Periodontology, Group Practice

**Data Structure:**
```javascript
clinicalData.competencies = {
    fixed: {
        name: 'Fixed Prosthodontics',
        icon: '🦷',
        color: '#3b82f6',
        notes: '',
        sections: [
            { title: 'Fixed Formatives', items: [
                { id: 'fixed-form-prov', text: '6 Provisional Restoration', required: 6, completed: 0 },
                // ... more items
            ]},
            { title: 'Fixed Summatives', items: [...] },
            // ... more sections
        ]
    },
    // ... other disciplines
};
```

**Add/Edit/Delete Requirements (NEW):**
- **➕ Add Requirement** button at bottom of each section
- **✏️ Edit** button appears on hover for ALL requirements
- **🗑️ Delete** button appears only for custom-added items (`custom: true`)
- Modal interface for adding/editing with fields: name, required count, progress, notes

**Key Functions:**
```javascript
openAddCompItemModal(catKey, sectionIndex)  // Open modal to add new requirement
openEditCompItemModal(catKey, itemId)        // Open modal to edit existing
deleteCompItem(catKey, itemId)               // Delete custom requirement (with confirm)
saveCompItem()                               // Save from modal (add or edit mode)
closeCompItemModal()                         // Close modal
```

**Dynamic Calculations:**
- `calculateCategoryStats(cat)` - Returns { completed, inProgress, planned, pending, percent, totalUnits, completedUnits }
- `calculateOverallStats(competencies)` - Aggregates all categories
- Stats automatically update when items are added/edited/deleted
- Progress ring and bars update in real-time

**Status System:**
- `pending` - Not started (gray)
- `planned` - Planning to do (blue)
- `in_progress` - Working on it (yellow)
- `completed` - Done (green)

For items with `required > 1`, shows counter buttons (−/+) instead of status toggle.

#### Task Block Height Fix (Monthly Planner)
- **Problem:** Task blocks showed content outside colored background
- **Fix:** Changed from `height: ${heightPx}px; min-height: ${minHeight}px;` to just `min-height: ${minHeight}px;`
- Background now expands to fit all content (Google Calendar style)

#### Appointment Card Fix
- **Problem:** "undefined" showing in appointment status
- **Fix:** Added fallback: `const status = apt.status || 'scheduled';`
- Status now shows proper label (Scheduled/Completed/Cancelled/No Show)

#### Firebase Data Structure Update
```
d3Roadmap/
    ├── clinicalData/           ← NEW
    │   ├── patients{}
    │   ├── appointments[]
    │   ├── completedProcedures[]
    │   └── competencies{}      ← Stores all competency progress
    ├── ...existing fields...
```

#### Removed: What's Next Panel
- Removed from Competencies UI (user feedback: "nice but not useful")
- CSS and function kept but not rendered

### v30 Financials Page Overhaul (index.html)

#### Month-by-Month Payment Tracking (NEW SYSTEM)
The financials page now tracks recurring expenses by individual month instead of estimating:
```javascript
financials.monthlyPayments = {
    '2026-02': { paid: false, paidDate: null, label: 'February 2026' },
    '2026-03': { paid: false, paidDate: null, label: 'March 2026' },
    '2026-04': { paid: false, paidDate: null, label: 'April 2026' },
    '2026-05': { paid: false, paidDate: null, label: 'May 1-14', partial: true, fraction: 0.45 }
};
```

#### New Projection Calculation Logic
**Old (broken):** `monthlyBurn × Math.floor(monthsRemaining)` - inaccurate estimate
**New (accurate):** Only subtracts months that are NOT checked off:
```javascript
// For each month in monthlyPayments:
if (!monthData.paid) {
    const fraction = monthData.partial ? monthData.fraction : 1;
    const amount = monthlyBurn * fraction;
    unpaidMonthsTotal += amount;
}
projectedBalance = availableCash - unpaidMonthsTotal;
```

#### Recurring Expenses Management
- **+ Add Expense** button - create new expense categories
- **Edit** button - change amount for any expense
- **Delete ×** button - remove expense categories
- Functions: `addRecurringExpense()`, `deleteRecurringExpense()`, `editRecurringExpense()`

#### Month Payment Tracker UI
- Visual checklist for Feb/Mar/Apr/May
- Click month to toggle paid/unpaid
- Shows paid date when checked
- Running total of unpaid months
- Function: `toggleMonthPaid(monthKey)`

#### Key Date Change
- Changed from May 15 to **May 14** (next loan disbursement date)
- `semesterEndDate: '2026-05-14'` in masterLiquidity

### v29.1 Medication Calendar & Modal Fixes (index.html)

#### Medication Calendar UI Fix
- **Problem:** + note button was overlapping/blocking date numbers
- **Fix:** Moved button to top-right corner with new `.day-note-btn` class
- Button is subtle (60% opacity) until hovering over day cell
- Date numbers now larger and bolder (1.2em, font-weight 700)
- Calendar grid has subtle background with improved spacing
- Weekday headers styled in purple with uppercase

#### Modal Close Button Consistency
- Added `.modal-close-x` class for universal × close buttons
- Added × buttons to: medModal, noteModal, addCountdownModal, helpModal, notebookModal
- Style: 32px circular button, gray background, red on hover
- Cleaned up duplicate `.planner-close-btn` CSS definition

### v29 UI/UX Accessibility & Feedback Overhaul (All 3 Apps)

#### Color Contrast Fixes (WCAG Compliance)
- Replaced all low-contrast grays across apps:
  - `#8b949e` → `#b0b8c4` (better readability)
  - `#94a3b8` → `#b0bcc8` (d3-roadmap specific)
  - `#888` → `#a3a3a3` (index.html specific)

#### Motion Accessibility (prefers-reduced-motion)
All apps now respect user's motion preferences:
```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    .pulse { animation: none; }
}
```

#### Touch Targets (Mobile Accessibility)
- All interactive elements now have 44px minimum hit areas
- Applies to: buttons, checkboxes, data-btns, task items

#### New CSS Classes Added (All Apps)
```css
.empty-state          /* Centered italic message for empty lists */
.loading-spinner      /* 24px purple spinning loader */
.btn-loading          /* Dimmed button with cursor:wait */
```

#### Visual Feedback Animations

**index.html:**
- Task checkboxes: 28px with bounce animation on completion
- Clickable cards: Purple border highlight on hover
- Medication buttons: Green success flash + pulse on log
- Button click feedback: Subtle scale(0.97) on active

**d3-roadmap.html:**
- Editable fields: Pencil icon (✏️) appears on hover
- Help tooltips: `?` icons reveal explanations on hover

**stimulant-elimination-calculator.html:**
- Caffeine buttons: Lift effect on hover + green flash on add
- Sleep prediction: Added explanatory text below result

#### Tooltip System (index.html & d3-roadmap.html)
```css
.help-icon            /* Small ? circle that reveals tooltip on hover */
.help-tooltip         /* Hidden tooltip content, shown on parent hover */
```
- Added 1-3-5 Rule explanation tooltip in Focus Mode
- Improved calendar legend with header and pill-style badges

### v28 Sync Status System (All 3 Apps)
- Added sync status bar in header
- Added "Sync Now" / refresh button for manual refresh
- Added `forceCloudSync()` function
- Added `visibilitychange` handler (save on hide, refresh on show)
- Added fallback timers (3 second timeout ensures app loads)
- Consistent status colors across all apps

### Bug Fixes
- **index.html**: Removed orphan `setupPlannerRealtimeSync()` call that crashed on load
- **All apps**: Better error handling with retry logic for Firebase saves

---

## MOBILE RESPONSIVENESS

### Breakpoints
- 768px (tablet)
- 480px (phone)

### Stimulant Calculator Special
- Container scales at 0.85 transform for less scrolling
- Focus Mode has separate mobile-optimized layout

---

## QUICK REFERENCE

### If Sully says "fix/update [app name]"
1. Ask which file if not clear
2. Copy file to /home/claude/
3. Use `grep` to find the relevant code section
4. Make surgical edits with `str_replace`
5. Copy to /mnt/user-data/outputs/
6. Use `present_files` tool
7. Give deployment steps

### If Sully mentions "at-risk" or "Peds"
- Pediatric Dentistry course
- 77% on Exam 1, needs ~80% on Exam 2 (Feb 18)
- 33.3 points locked in out of 100

### If Sully mentions "sync not working"
- Check `forceCloudSync()` exists and is called
- Check `updateSyncStatus()` exists
- Verify no orphan function calls
- Check Firebase config is correct

### If Sully seems stressed
- Remind him: "Action precedes hope"
- Gym helps clear his head
- The app prevents spiraling

---

## THINGS NOT TO CHANGE WITHOUT CAREFUL TESTING
- Firebase config
- PIN authentication pattern
- Save/sync debounce logic (300ms)
- Grade calculator math
- XR pharmacokinetic model (50/50 split at T+0/T+4)
- Date parsing (MUST use local timezone)
- Sync status indicator logic

---

## KEY DATES (Spring 2026)

### February (BRUTAL MONTH - 5 EXAMS)
- Feb 2: PC2 Midterm (30%)
- Feb 6: Ortho Final (50%)
- Feb 11: Geriatrics Midterm
- **Feb 18: PEDS EXAM 2 (45%) - SURVIVAL EXAM**
- Feb 27: Oral Med Midterm (25%)

### March
- Mar 11: Perio 2 Final (45%)
- Mar 19: PC2 Final (40%)
- Mar 30: Peds Exam 3 (7.5%)
