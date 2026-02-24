# Stim Calc Synchro-Inspired UI/UX Overhaul

## Objective
Transform the Stimulant Elimination Calculator from a single-column accordion layout into a Synchro-inspired sidebar + main content layout with card-based pages. Zero logic/functionality changes. Same warm clinical colorway.

## Files Modified
- `stimulant-elimination-calculator.html` — CSS additions + HTML restructure
- `js/stimcalc/init.js` — Sidebar navigation, metrics row updates, page switching
- `js/stimcalc/firebase-sync.js` — Sidebar sync status updates

## Files NOT Modified (zero changes)
- `js/stimcalc/state.js`, `circadian.js`, `pharma-engine.js`, `sleep-prediction.js`
- `js/stimcalc/med-caffeine.js`, `ui-sections.js`, `history-calendar.js`, `graph.js`
- All Firebase save guards, all calculation logic, all DOM element IDs

---

## PHASE 1: CSS Additions (~600 new lines)

Add BEFORE the existing `.cross-app-nav` rule (line ~123). All new CSS uses existing `:root` design tokens.

### 1a. App Layout Grid
```css
.app-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    min-height: 100vh;
}
```

### 1b. Sidebar (copy pattern from index.html, adapt for stim calc)
Classes needed:
- `.sc-sidebar` — sticky, 100vh, flex column, `var(--canvas-subtle)` bg
- `.sc-sidebar-logo` — app icon + "Sleep Calc" text
- `.sc-sidebar-section` — group container
- `.sc-sidebar-section-label` — "MAIN", "INPUTS", "ANALYSIS", "APPS" labels
- `.sc-sidebar-item` — nav button (icon + label + optional badge)
- `.sc-sidebar-item.active` — accent-light bg + 3px left border
- `.sc-sidebar-item:hover` — canvas-inset bg
- `.sc-sidebar-badge` — right-aligned count/status pill
- `.sc-sidebar-footer` — margin-top: auto, data controls + sync
- `.sc-sidebar-data-controls` — 4 icon buttons (sync, save, restore, export)
- `.sc-sidebar-sync-status` — dot + text

Use `sc-` prefix to avoid conflicts with index.html styles if both loaded.

### 1c. Top Bar
- `.sc-top-bar` — sticky, backdrop-filter blur, breadcrumb
- `.sc-top-bar-left` — title + breadcrumb
- `.sc-top-bar-right` — sync dot

### 1d. Metrics Row
- `.sc-metrics-row` — flex, no gap, border dividers, shadow-sm
- `.sc-metric-card` — flex column, centered, flex:1
- `.sc-metric-label` — 10px uppercase
- `.sc-metric-value` — 20px mono bold
- `.sc-metric-sub` — 10px tertiary

### 1e. Content Area
- `.sc-content-area` — padding 24px 32px, max-width 1200px

### 1f. Page Containers
- `.sc-page` — display: none by default
- `.sc-page.active` — display: block
- Pages: `sc-page-dashboard`, `sc-page-medications`, `sc-page-caffeine`, `sc-page-modifiers`, `sc-page-calendar`, `sc-page-insights`, `sc-page-accuracy`, `sc-page-settings`

### 1g. Dashboard Card Grid
- `.sc-dashboard-grid` — CSS grid, 2 columns on desktop, 1 on mobile
- `.sc-card` — white bg, border, border-radius-lg, shadow-sm, padding 20px
- `.sc-card-title` — 13px uppercase, fg-muted, margin-bottom 12px
- `.sc-card.full-width` — grid-column: 1 / -1

### 1h. Quick Inputs Card
- `.sc-quick-inputs` — compact form layout
- `.sc-input-row` — flex, gap 12px, items centered
- `.sc-input-label` — 12px, fg-secondary
- Reuse existing input styling (44px min-height, 16px font)

### 1i. Intelligence Summary Card
- `.sc-intel-summary` — flex row of stat items
- `.sc-intel-stat` — text-center, value + label stacked

### 1j. Sidebar Backdrop (mobile)
- `.sc-sidebar-backdrop` — fixed, inset 0, rgba(0,0,0,0.3), z-index 999
- `.sc-sidebar-backdrop.open` — display: block

### 1k. Responsive Breakpoints

**Tablet (max-width: 1024px):**
- `.app-layout { grid-template-columns: 56px 1fr }`
- Hide sidebar labels, section labels, logo text
- Sidebar items: center icons, no text
- Badges: hidden
- Metrics row: flex-wrap

**Mobile (max-width: 768px):**
- `.app-layout { grid-template-columns: 1fr }`
- Sidebar: fixed, left: -280px, slides to 0 on `.open`
- Top bar: hidden (or compact)
- Content area: padding 16px 12px
- Dashboard grid: 1 column

### 1l. Suppress Old Chrome
```css
body.has-sc-sidebar .cross-app-nav { display: none !important; }
body.has-sc-sidebar .unified-header { display: none !important; }
body.has-sc-sidebar .status-pills { display: none !important; }
body.has-sc-sidebar .unified-container { max-width: none; padding: 0; margin: 0; }
```

---

## PHASE 2: HTML Restructure

### New Body Structure
```html
<body class="has-sc-sidebar">

<!-- Sidebar Backdrop (mobile) -->
<div class="sc-sidebar-backdrop" id="scSidebarBackdrop" onclick="scToggleSidebar()"></div>

<!-- App Layout Grid -->
<div class="app-layout" id="scAppLayout">

  <!-- SIDEBAR -->
  <aside class="sc-sidebar" id="scSidebar">
    <div class="sc-sidebar-logo">
      <span class="sc-sidebar-logo-icon">SC</span>
      <span class="sc-sidebar-logo-text">Sleep Calc</span>
    </div>

    <div class="sc-sidebar-section">
      <div class="sc-sidebar-section-label">MAIN</div>
      <button class="sc-sidebar-item active" data-page="dashboard" onclick="scNavigate('dashboard')">
        <svg><!-- home/moon icon --></svg>
        <span class="sc-sidebar-label">Dashboard</span>
      </button>
    </div>

    <div class="sc-sidebar-section">
      <div class="sc-sidebar-section-label">INPUTS</div>
      <button class="sc-sidebar-item" data-page="medications" onclick="scNavigate('medications')">
        <svg><!-- pill icon --></svg>
        <span class="sc-sidebar-label">Medications</span>
        <span class="sc-sidebar-badge" id="scMedsBadge"></span>
      </button>
      <button class="sc-sidebar-item" data-page="caffeine" onclick="scNavigate('caffeine')">
        <svg><!-- coffee icon --></svg>
        <span class="sc-sidebar-label">Caffeine</span>
        <span class="sc-sidebar-badge" id="scCaffBadge"></span>
      </button>
      <button class="sc-sidebar-item" data-page="modifiers" onclick="scNavigate('modifiers')">
        <svg><!-- settings icon --></svg>
        <span class="sc-sidebar-label">Modifiers</span>
        <span class="sc-sidebar-badge" id="scModBadge"></span>
      </button>
    </div>

    <div class="sc-sidebar-section">
      <div class="sc-sidebar-section-label">ANALYSIS</div>
      <button class="sc-sidebar-item" data-page="calendar" onclick="scNavigate('calendar')">
        <svg><!-- calendar icon --></svg>
        <span class="sc-sidebar-label">Calendar</span>
      </button>
      <button class="sc-sidebar-item" data-page="insights" onclick="scNavigate('insights')">
        <svg><!-- chart icon --></svg>
        <span class="sc-sidebar-label">Insights</span>
      </button>
      <button class="sc-sidebar-item" data-page="accuracy" onclick="scNavigate('accuracy')">
        <svg><!-- target icon --></svg>
        <span class="sc-sidebar-label">Accuracy</span>
      </button>
    </div>

    <div class="sc-sidebar-section">
      <div class="sc-sidebar-section-label">APPS</div>
      <a class="sc-sidebar-item" href="index.html">
        <svg><!-- list icon --></svg>
        <span class="sc-sidebar-label">Quest</span>
      </a>
      <a class="sc-sidebar-item" href="d3-roadmap.html">
        <svg><!-- book icon --></svg>
        <span class="sc-sidebar-label">Roadmap</span>
      </a>
      <a class="sc-sidebar-item" href="body-comp-tracker.html">
        <svg><!-- activity icon --></svg>
        <span class="sc-sidebar-label">Body Comp</span>
      </a>
    </div>

    <div class="sc-sidebar-footer">
      <div class="sc-sidebar-data-controls">
        <button onclick="forceCloudSync()" title="Sync"><svg><!-- refresh --></svg></button>
        <button onclick="createCheckpoint()" title="Checkpoint"><svg><!-- save --></svg></button>
        <button onclick="showCheckpointManager()" title="Restore"><svg><!-- folder --></svg></button>
        <button onclick="BackupManager.exportData()" title="Export"><svg><!-- download --></svg></button>
      </div>
      <div class="sc-sidebar-sync-status" id="scSidebarSyncStatus">
        <span class="sc-sync-dot" id="scSidebarSyncDot"></span>
        <span id="scSidebarSyncText">Connected</span>
      </div>
    </div>
  </aside>

  <!-- MAIN PANEL -->
  <main class="sc-main-panel" id="scMainPanel">
    <header class="sc-top-bar" id="scTopBar">
      <div class="sc-top-bar-left">
        <button class="sc-menu-btn" id="scMenuBtn" onclick="scToggleSidebar()">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none"/></svg>
        </button>
        <span class="sc-top-bar-title">Sleep Calc</span>
        <span class="sc-top-bar-breadcrumb" id="scBreadcrumb">› Dashboard</span>
      </div>
      <div class="sc-top-bar-right">
        <div class="sc-sync-inline" id="scTopBarSync">
          <span class="sc-sync-dot-mini" id="scTopBarSyncDot"></span>
          <span id="scTopBarSyncText">Synced</span>
        </div>
      </div>
    </header>

    <!-- Metrics Row -->
    <div class="sc-metrics-row" id="scMetricsRow">
      <div class="sc-metric-card">
        <span class="sc-metric-value" id="scMetricSleep">--:--</span>
        <span class="sc-metric-label">SLEEP AT</span>
      </div>
      <div class="sc-metric-card">
        <span class="sc-metric-value" id="scMetricRemaining">--</span>
        <span class="sc-metric-label">REMAINING</span>
      </div>
      <div class="sc-metric-card">
        <span class="sc-metric-value" id="scMetricAmp">--</span>
        <span class="sc-metric-label">AMP LOAD</span>
      </div>
      <div class="sc-metric-card">
        <span class="sc-metric-value" id="scMetricCaff">--</span>
        <span class="sc-metric-label">CAFF LOAD</span>
      </div>
      <div class="sc-metric-card" id="scMetricQualityCard">
        <span class="sc-metric-value" id="scMetricQuality">--</span>
        <span class="sc-metric-label">QUALITY</span>
      </div>
    </div>

    <!-- Content Area -->
    <div class="sc-content-area">

      <!-- ==================== DASHBOARD PAGE ==================== -->
      <div class="sc-page active" id="scPageDashboard">
        <div class="sc-dashboard-grid">

          <!-- Hero Card -->
          <div class="sc-card" id="scHeroCard">
            <!-- MOVE existing .unified-hero content here -->
            <!-- Keep all IDs: sleepTime, timeRemaining, sleepQuality, bottleneckIndicator, heroProgressFill, accuracyHeroHint -->
          </div>

          <!-- Quick Inputs Card -->
          <div class="sc-card" id="scQuickInputsCard">
            <div class="sc-card-title">Today's Inputs</div>
            <!-- Wake Time + Hours Slept from sleep accordion -->
            <!-- Keep IDs: wakeTime, hoursSlept, sleepDebtDisplay, recentNightsContainer, wakeTimeDisplay -->
            <!-- Meds: compact add form + entry list -->
            <!-- Keep IDs: medEntries (content injected by renderMedEntries) -->
            <!-- Caffeine: preset buttons + entry list -->
            <!-- Keep IDs: caffeineEntries (content injected by renderCaffeineEntries) -->
            <!-- VitC toggle -->
            <!-- Keep IDs: vitCToggle, vitaminCTime, vitaminCDate, vitCTimeRow, vitCBadge -->
          </div>

          <!-- Graph Card (full width) -->
          <div class="sc-card full-width" id="scGraphCard">
            <div class="sc-card-title">Drug Concentration</div>
            <!-- MOVE existing .unified-graph-wrap here -->
            <!-- Keep IDs: graphContainer, graphCanvas, graphTooltip -->
          </div>

          <!-- Blocking Factors Card (conditional) -->
          <div class="sc-card full-width" id="scBlockingCard" style="display:none">
            <!-- MOVE existing #blockingFactors content here -->
            <!-- Keep IDs: blockingFactors, blockingList -->
          </div>

          <!-- Intelligence Summary Card -->
          <div class="sc-card">
            <div class="sc-card-title">Sleep Intelligence</div>
            <!-- Mini 7-day calendar from overview tab -->
            <!-- Keep ID: sleepCalendar -->
            <!-- Key stats summary -->
          </div>

          <!-- Recommendations Card -->
          <div class="sc-card">
            <div class="sc-card-title">Recommendations</div>
            <!-- Keep ID: recommendations -->
          </div>

        </div>
      </div>

      <!-- ==================== MEDICATIONS PAGE ==================== -->
      <div class="sc-page" id="scPageMedications">
        <!-- All-Nighter Mode + Ghost Load -->
        <!-- Keep IDs: allNighterToggleBtn, allNighterIcon, allNighterText, allNighterHint, ghostLoadSection, ghostMedEntries, ghostLoadTotal -->
        <!-- Full medication CRUD (already in accordion body) -->
        <!-- Keep IDs: medEntries (SHARED with dashboard — need to handle this) -->
        <!-- Stacking Warning -->
        <!-- Keep ID: stackingWarning -->
        <!-- Sleep debt breakdown (full detail) -->
        <!-- Keep ID: sleepDebtDisplay (SHARED — may need cloning or single location) -->
      </div>

      <!-- ==================== CAFFEINE PAGE ==================== -->
      <div class="sc-page" id="scPageCaffeine">
        <!-- Full caffeine CRUD with all presets -->
        <!-- Keep IDs: caffeineEntries, coffeeStatus -->
      </div>

      <!-- ==================== MODIFIERS PAGE ==================== -->
      <div class="sc-page" id="scPageModifiers">
        <!-- VitC, Sauna, Heavy Lift toggles (full detail) -->
        <!-- Nicotine tracking -->
        <!-- Keep IDs: nicotineStatus, lastNicotineDisplay, nicotineTypeDisplay, nicotineClearDisplay, nicotineWarning, nicotineRecommendation, logVapeBtn, logPouchBtn, rlsEmergencyProtocol, nicotineTimeInput -->
        <!-- Workout Planner -->
        <!-- Keep IDs: workoutTime, workoutType, workoutDuration, workoutIntensity, workoutFasted, coldShowerToggle, workoutResult, workoutResultHeader, workoutResultText, workoutResultDetails, coldShowerOption, applyWorkoutBtn, resetWorkoutBtn -->
        <!-- What-If Scenarios (6 cards) -->
        <!-- Keep IDs: scenarioCoffeeSleep, scenarioCoffeeDelta, scenarioEspressoSleep, scenarioEspressoDelta, scenarioVitCSleep, scenarioVitCDelta, scenarioSaunaSleep, scenarioSaunaDelta, scenarioVapeSleep, scenarioVapeDelta, scenarioZynSleep, scenarioZynDelta -->
        <!-- Circadian display + Feelings Timeline -->
        <!-- Keep IDs: circadianPhaseDisplay, forbiddenZoneTime, sleepGateTime, feelingsList -->
      </div>

      <!-- ==================== CALENDAR PAGE ==================== -->
      <div class="sc-page" id="scPageCalendar">
        <!-- Full month calendar grid -->
        <!-- Keep IDs: sleepCalendarMonth, sleepCalendarMonthLabel, sleepCalendarDays, sleepCalendarLegend, sleepCalendarStats -->
        <!-- Prediction history log -->
        <!-- Keep IDs: historyAccuracySummary, historyList -->
        <!-- Sleep performance graph -->
        <!-- Keep IDs: sleepPerformanceGraph, sleepGraphTooltip, tooltipDate, tooltipHours, tooltipStatus, tooltipVsAvg -->
        <!-- Stats grid + Achievements -->
        <!-- Keep IDs: siStatsGrid, sleepAchievements, sleepHistoryList -->
      </div>

      <!-- ==================== INSIGHTS PAGE ==================== -->
      <div class="sc-page" id="scPageInsights">
        <!-- 14 collapsible sections (already rendered by history-calendar.js) -->
        <!-- Keep ID: insightsContent and all 14 sub-IDs -->
      </div>

      <!-- ==================== ACCURACY PAGE ==================== -->
      <div class="sc-page" id="scPageAccuracy">
        <!-- 7 sections (already rendered by history-calendar.js) -->
        <!-- Keep ID: accuracyContent and all 7 sub-IDs -->
      </div>

      <!-- ==================== SETTINGS PAGE ==================== -->
      <div class="sc-page" id="scPageSettings">
        <!-- Calibration Settings -->
        <!-- Keep IDs: ampHalfLife, sleepThreshold, caffHalfLife, caffThreshold, weight, sleepTarget -->
        <!-- Forecast Logic -->
        <!-- Keep IDs: forecastLogicText, forecastLogicContent, forecastToggleIcon -->
        <!-- Data Management -->
        <!-- Action buttons: clearToday, saveDay, export, import -->
      </div>

    </div><!-- end .sc-content-area -->
  </main>

</div><!-- end .app-layout -->

<!-- MODALS (stay outside layout, unchanged) -->
<!-- feedbackModal, sleepEditModal, sleepDayDetailModal -->

<!-- HIDDEN COMPAT ELEMENTS (keep for JS, display:none) -->
<!-- All status-item elements, accordion-section[data-section] elements with their IDs -->

<!-- TOAST (unchanged) -->

<!-- Scripts (unchanged order) -->
```

### Critical: Shared Element IDs Between Dashboard and Detail Pages

Several IDs appear on the dashboard AND on detail pages (e.g., `medEntries` shown on both Dashboard and Medications page). Solutions:

**Option A (Recommended): Keep elements in ONE location, show on active page**
- `medEntries`, `caffeineEntries`, `vitCToggle` etc. live ONLY in the dashboard quick inputs card
- The Medications detail page shows additional context (all-nighter, stacking, ghost load) but links back to dashboard for actual CRUD
- This avoids duplicate ID issues

**Option B: Move elements between pages on navigation**
- When navigating to Medications, the medEntries DOM node gets moved from dashboard to medications page
- Complex but avoids duplication

**Option C (Simplest): Dashboard has compact summary, detail pages have full elements**
- Dashboard shows a READ-ONLY summary of meds/caffeine (no editable IDs)
- Full CRUD stays in Medications/Caffeine pages
- Dashboard has its own compact add buttons that call addMedEntry()/addCaffeine() then redirect

**DECISION: Use Option A** — Keep all input IDs in Dashboard. Detail pages show additional context/analysis around those inputs. This is the simplest approach and preserves all DOM contracts.

The detail pages (Medications, Caffeine) will contain:
- Medications: All-nighter mode, ghost load, stacking warnings — these DON'T overlap with dashboard
- Caffeine: No unique content beyond what dashboard shows → merge into Modifiers page

**Revised sidebar:**
- Dashboard (hero + quick inputs + graph + intelligence + recs)
- Modifiers (nicotine, workout, sauna, what-if, circadian, feelings)
- Calendar
- Insights
- Accuracy
- Settings

This means 6 pages, not 8. The dashboard is the primary input surface.

---

## PHASE 3: JS Changes

### init.js Additions (~80 lines)

```javascript
// === SIDEBAR NAVIGATION ===

var currentPage = 'dashboard';

function scNavigate(page) {
    currentPage = page;

    // Update sidebar active states
    document.querySelectorAll('.sc-sidebar-item[data-page]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update breadcrumb
    var bc = document.getElementById('scBreadcrumb');
    if (bc) {
        var labels = {
            dashboard: 'Dashboard', modifiers: 'Modifiers & Timing',
            calendar: 'Calendar', insights: 'Insights',
            accuracy: 'Accuracy', settings: 'Settings'
        };
        bc.textContent = '› ' + (labels[page] || page);
    }

    // Show/hide pages
    document.querySelectorAll('.sc-page').forEach(function(p) {
        p.classList.toggle('active', p.id === 'scPage' + page.charAt(0).toUpperCase() + page.slice(1));
    });

    // Trigger renders for the target page
    if (page === 'calendar') {
        if (typeof renderSleepCalendarMonth === 'function') renderSleepCalendarMonth();
        if (typeof renderHistory === 'function') renderHistory();
    } else if (page === 'insights') {
        if (typeof renderInsightsTab === 'function') renderInsightsTab();
    } else if (page === 'accuracy') {
        if (typeof renderAccuracyTab === 'function') renderAccuracyTab();
    } else if (page === 'dashboard') {
        recalculate();
    }

    // Auto-close mobile sidebar
    var sidebar = document.getElementById('scSidebar');
    if (sidebar && sidebar.classList.contains('open')) scToggleSidebar();
}

function scToggleSidebar() {
    var sidebar = document.getElementById('scSidebar');
    var backdrop = document.getElementById('scSidebarBackdrop');
    if (!sidebar) return;
    var isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isOpen);
    if (backdrop) backdrop.classList.toggle('open', !isOpen);
}

function updateMetricsRow(vm) {
    var el;
    el = document.getElementById('scMetricSleep');
    if (el) el.textContent = vm ? minutesToTime(vm.predictedSleepMinutes) : '--:--';

    el = document.getElementById('scMetricRemaining');
    if (el && vm) {
        var hrs = vm.remainingHours || 0;
        var mins = vm.remainingMinutes || 0;
        el.textContent = hrs + 'h ' + mins + 'm';
    }

    el = document.getElementById('scMetricAmp');
    if (el) el.textContent = vm ? vm.currentAmpLoad.toFixed(1) : '--';

    el = document.getElementById('scMetricCaff');
    if (el) el.textContent = vm ? vm.currentCaffLoad.toFixed(1) : '--';

    el = document.getElementById('scMetricQuality');
    if (el && vm) el.textContent = vm.qualityLabel || '--';

    // Color the quality card
    var card = document.getElementById('scMetricQualityCard');
    if (card && vm) {
        card.style.borderBottomColor = vm.colorClass === 'green' ? 'var(--success)' :
            vm.colorClass === 'yellow' ? 'var(--warning)' : 'var(--destructive)';
    }
}
```

### Modify existing updateUI() in init.js
Add `updateMetricsRow(vm)` call at the end of `updateUI()`.

### Modify existing init() in init.js
Add `document.body.classList.add('has-sc-sidebar')` at bootstrap.

### firebase-sync.js Additions (~20 lines)

Add to existing `updateSyncStatus()` or create `scUpdateSidebarSync()`:
```javascript
function scUpdateSidebarSync(status, text) {
    var dot = document.getElementById('scSidebarSyncDot');
    var textEl = document.getElementById('scSidebarSyncText');
    var topDot = document.getElementById('scTopBarSyncDot');
    var topText = document.getElementById('scTopBarSyncText');

    [dot, topDot].forEach(function(d) {
        if (!d) return;
        d.classList.remove('syncing', 'offline', 'error');
        if (status === 'syncing') d.classList.add('syncing');
        else if (status === 'offline') d.classList.add('offline');
        else if (status === 'error') d.classList.add('error');
    });
    if (textEl) textEl.textContent = text || '';
    if (topText) topText.textContent = text || 'Synced';
}
```

Call `scUpdateSidebarSync()` from existing sync status update points.

---

## PHASE 4: Verification Checklist

1. All 150+ element IDs still present in HTML
2. All `onclick` handlers still call globally accessible functions
3. All `data-section` accordion attributes preserved (hidden compat layer)
4. All 5 Firebase save guards in both save functions
5. Brace balance in all modified files
6. `recalculate()` still fires every 5s, writes to all DOM targets
7. Graph canvas still has `graphContainer` parent with `position: relative`
8. Modals still positioned fixed, outside main layout
9. Toast still positioned fixed
10. iOS input sizing preserved (44px min-height, 16px font)
11. No new element IDs conflict with existing ones (sc- prefix ensures this)

---

## Implementation Order

1. CSS additions to HTML file (new sidebar/layout styles)
2. HTML body restructure (add sidebar, wrap content in app-layout grid)
3. Hidden compatibility layer (keep accordion data-sections in DOM, display:none)
4. JS init.js: navigation functions + metrics row updates
5. JS firebase-sync.js: sidebar sync status
6. Responsive breakpoints
7. Verification pass
