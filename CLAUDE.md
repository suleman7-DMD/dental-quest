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

### Files (Current Versions)
| File | Lines | Size | Purpose |
|------|-------|------|---------|
| `index.html` | ~9,900 | ~420KB | Main app: Focus Mode (1-3-5 rule), tasks/XP, dashboard, financials, notebook, calendar, medications, pomodoro |
| `d3-roadmap.html` | ~9,600 | ~444KB | Academic tracker: 6+ tabs, Peds AT RISK, grade calculator, deadlines, monthly planner with collapsible weeks |
| `stimulant-elimination-calculator.html` | ~9,900 | ~494KB | Pharmacokinetic sleep prediction: Process S + Process C circadian modeling, caffeine tracking, sleep debt, workout planner |

### Working Directory
- Files should be copied to `/home/claude/` for editing
- Output to `/mnt/user-data/outputs/` for delivery
- Use `present_files` tool to give user download link

---

## FIREBASE CONFIGURATION

### Config (SAME Across All 3 Apps - DON'T CHANGE)
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCgh1lT7fA8d-O7r9t_9KwYb6p9Y8JvLMo",
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

### Known Bug: Vitamin C is "Day-Blind" (NEEDS FIX)
- App only accepts HH:MM format (no date)
- Always assumes the time is TODAY
- If you enter "08:00" at 3 PM, app thinks Vitamin C was taken 7 hours ago
- **Cannot model "take Vitamin C tomorrow at 8 AM"**
- **Workaround**: Keep Vitamin C OFF while planning, set it after midnight when "tomorrow" becomes "today"

### Circadian Rhythm (Process C)
- Wake Maintenance Zone: 2 hours before Forbidden Zone
- Forbidden Zone: 13-15 hours after wake (peak alertness, HARD BLOCKER)
- Sleep Gate: 15-17 hours after wake (optimal sleep window)

---

## RECENT UPDATES (January 2026)

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
