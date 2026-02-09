# CRASH OUT Tab Redesign - UI/UX Specification

## 1. Current State Analysis

### Component Inventory

#### A. Sleep Setup Screen (Lines 7462-7498, CSS 5993-6071)
- **HTML**: `#crashOutSetup` div with `.crash-out-setup` class
- **Elements**: Fire emoji icon (72px), "CRASH OUT MODE" title (32px bold), date/time subtitle, "When are you going to sleep?" question, 3 sleep option buttons (Tonight 11PM / Late Night 2AM / Custom), custom time picker (hidden by default), hint text
- **CSS**: Centered layout, 60px padding, max-width 600px. Sleep options are flex-wrapped cards with 2px border, 24px/32px padding, 140px min-width. Custom picker is inline-flex dark panel.
- **JS**: `renderCrashOutMode()` at line 17258, `setCrashOutSleep()` at line 17290, `setCustomSleepTime()` at line 17325

#### B. Timeline Header (Lines 7503-7514, CSS 6076-6131)
- **HTML**: `<h2>CRASH OUT</h2>` with fire emoji, sleep time adjuster row (-30m, -15m, label, +15m, +30m, Reset)
- **CSS**: Flex row, space-between. Adjust buttons are 4px/8px padding, 12px font, monospace. Sleep label is 14px bold white.
- **JS**: `adjustSleepTime()` at line 17363

#### C. Time Summary Bar (Lines 7517-7528, CSS 6133-6178)
- **HTML**: Clock emoji + "Xh Ym until sleep" text, progress bar div, scheduled-time-text span
- **CSS**: Card-styled container (bg-card, 1px border, 8px radius). Progress bar is 8px height, amber gradient fill, transitions width.
- **JS**: Updated in `renderCrashOutTimeline()` at line 17385

#### D. Overscheduled Warning (Lines 7530-7535, CSS 6180-6206)
- **HTML**: Warning icon, text with bold "over" amount, dismiss button. Hidden by default.
- **CSS**: Red-tinted background (15% opacity), red border (40% opacity), flex row with gap 12px.

#### E. NOW Marker (Lines 7540-7545, CSS 6215-6244)
- **HTML**: Static version in `#timelineContent` (hidden at render), dynamic version injected by `renderCrashOutTimelineTasks()` at line 17515
- **Elements**: "NOW" label badge (positioned -80px left), time text, horizontal line
- **CSS**: NOW label is amber background, dark text, 2px/8px padding, 11px font, 700 weight. Line is 2px amber, flex-grows to fill.
- **No animation** on the NOW marker currently

#### F. Timeline Task Rows (Lines 17555-17594, CSS 6246-6442)
- **HTML**: `.timeline-task` wrapper (draggable), `.task-time-marker` (absolute -80px left), `.task-card-timeline` (flex row)
- **Inside card**: tier badge (18px icon), task text (13px, ellipsis), duration info (10px muted), reorder buttons (5 buttons: top/up/down/bottom/position), start button, duration select dropdown, edit button, remove button
- **CSS**: Task card is bg-card with 1px border, 5px/8px padding, 6px radius. Locked-in variant gets 3px amber left border. Reorder buttons are always visible, horizontal row, 10px font, 22px min-width.
- **Drag-drop**: 0.5 opacity when dragging, 3px blue top border on drag-over. Cascade shift animation on reorder.

#### G. Wind-Down Block (Lines 7551-7558, CSS 6444-6480)
- **HTML**: Shield emoji badge, time range, "PROTECTED WIND-DOWN HOUR" label, hint text
- **CSS**: Gradient gray background (20% opacity), dashed border (#64748b), 6px radius, flex row. Same visual weight as task cards.

#### H. Sleep Marker (Lines 7561-7565, CSS 6482-6506)
- **HTML**: Sleep emoji, time display, "SLEEP" label
- **CSS**: Flex row, bg-card, 1px border, 6px radius. Plain styling, same as other cards.

#### I. Unscheduled Pool (Lines 7569-7579, CSS 6508-6602)
- **HTML**: Pool header with title + count badge, hint text, `.pool-tasks` flex-wrap container
- **Cards**: Each card has task text (12px, 2-line clamp), meta row (duration + tier icon), "Add to Timeline" button
- **CSS**: Cards are bg-page, 1px border, 6px radius, 120-180px width range. Add button is teal, full width. Pool container has 20px padding.
- **JS**: `renderUnscheduledPool()` at line 17983

#### J. Reset Button (Lines 7582-7584, CSS 6615-6632)
- **HTML**: Single button with reset icon + "Reset Day" text
- **CSS**: Transparent background, border, centered. Turns red on hover.

---

## 2. Problems Identified

### P1. Sleep Setup Feels Generic
- The fire emoji at 72px is visually dominant but doesn't set a "winding down" mood
- "CRASH OUT MODE" title doesn't hint at what the user should do
- Sleep option buttons are plain bordered boxes - no visual hierarchy between common choices
- No personality or urgency in the messaging
- Custom time picker appears as a jarring inline block

### P2. Timeline Has No Visual Depth or Vertical Rhythm
- Tasks are just stacked cards with no visual connection
- No vertical rail or connecting line between time markers
- No sense of time flowing from NOW toward SLEEP
- All task cards look identical regardless of how soon they are
- No gradient or color shift to indicate approaching sleep

### P3. NOW Marker Lacks Presence
- Static amber badge and line - no animation, no pulse, no glow
- Easily lost among task cards when scrolling
- No sense of urgency or "this is happening right now"
- Doesn't stand out compared to task borders and badges

### P4. Task Rows Are Cluttered
- 5 reorder buttons (top/up/down/bottom/position) always visible = visual noise
- Reorder buttons + start button + duration select + edit + remove = 9 interactive elements per row
- Duration dropdown is a native `<select>` - looks out of place in dark theme
- All actions compete for attention at the same visual weight
- No hover-reveal pattern to keep rows clean by default

### P5. Time Labels Are Hard to Scan
- Time markers are positioned absolute at -80px left with right-aligned text
- Small (12px) and muted color makes them hard to read at a glance
- No visual connection between time label and its task card
- Monospace font is good but size is too small

### P6. Wind-Down Block Blends In
- Same border-radius and similar padding as task cards
- Dashed border is the only real differentiator
- No color shift to indicate "sleep zone"
- Shield emoji doesn't strongly convey "protected relaxation time"
- Feels like just another card, not a distinct phase transition

### P7. Unscheduled Pool Lacks Urgency
- Cards are small (120-180px) and feel disconnected from the timeline
- The "Add to Timeline" teal button doesn't feel urgent
- No visual indicator of how many tasks still need scheduling
- Pool feels like an afterthought rather than an action zone

### P8. Progress Bar Is Underwhelming
- Thin 8px bar with amber fill doesn't convey status clearly
- No color transitions (stays amber until overscheduled)
- Text description is dense and hard to parse quickly
- No visual distinction between "on track", "tight", and "overloaded"

### P9. No Elapsed Time Indication
- Past tasks (before NOW) look the same as future tasks
- No dimming, strikethrough, or opacity reduction for elapsed slots
- User can't quickly see what's done vs. what's ahead

---

## 3. Proposed Changes

### 3.1 Sleep Setup Screen Overhaul

**Target**: Lines 7464-7498 (HTML), Lines 5993-6071 (CSS)

**Current HTML** (line 7466-7497):
```html
<div class="setup-icon">🔥</div>
<h2 class="setup-title">CRASH OUT MODE</h2>
<p class="setup-date" id="crashOutSetupDate">...</p>
<p class="setup-question">When are you going to sleep?</p>
<div class="sleep-options">
    <button class="sleep-option" onclick="setCrashOutSleep('tonight')">
        <span class="option-label">TONIGHT</span>
        <span class="option-time">11:00 PM</span>
    </button>
    ...
</div>
```

**New HTML** (replace lines 7466-7497):
```html
<div class="setup-icon-container">
    <div class="setup-icon-ring"></div>
    <div class="setup-icon">🌙</div>
</div>
<h2 class="setup-title">Set Your Crash Time</h2>
<p class="setup-date" id="crashOutSetupDate">...</p>
<p class="setup-question">How long can you push tonight?</p>
<div class="sleep-options">
    <button class="sleep-option sleep-option-tonight" onclick="setCrashOutSleep('tonight')">
        <span class="option-icon">🌆</span>
        <span class="option-label">TONIGHT</span>
        <span class="option-time">11:00 PM</span>
        <span class="option-tag">~Standard</span>
    </button>
    <button class="sleep-option sleep-option-late" onclick="setCrashOutSleep('latenight')">
        <span class="option-icon">🌃</span>
        <span class="option-label">LATE NIGHT</span>
        <span class="option-time">2:00 AM</span>
        <span class="option-tag">~Extended</span>
    </button>
    <button class="sleep-option sleep-option-custom" onclick="showCustomSleepPicker()">
        <span class="option-icon">⚙️</span>
        <span class="option-label">CUSTOM</span>
        <span class="option-time">Pick Time</span>
        <span class="option-tag">~Your call</span>
    </button>
</div>
```

**New CSS**:
```css
.setup-icon-container {
    position: relative;
    width: 96px;
    height: 96px;
    margin: 0 auto 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.setup-icon-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid rgba(99, 102, 241, 0.3);
    animation: setupRingPulse 3s ease-in-out infinite;
}

@keyframes setupRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.15); opacity: 0; }
}

.setup-icon {
    font-size: 56px;
    z-index: 1;
}

.setup-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
}

.setup-question {
    font-size: 16px;
    color: var(--text-muted);
    margin: 0 0 32px 0;
}

.sleep-option {
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 20px 24px;
    min-width: 150px;
    cursor: pointer;
    transition: all 0.25s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: relative;
    overflow: hidden;
}

.sleep-option::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(99, 102, 241, 0.08) 100%);
    opacity: 0;
    transition: opacity 0.25s;
}

.sleep-option:hover::before {
    opacity: 1;
}

.sleep-option:hover {
    border-color: #6366f1;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);
}

.sleep-option-tonight:hover {
    border-color: var(--accent-amber);
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15);
}

.sleep-option-late:hover {
    border-color: #8b5cf6;
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
}

.option-icon {
    font-size: 28px;
    margin-bottom: 4px;
}

.option-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
}

.option-time {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    font-family: 'SF Mono', Monaco, monospace;
}

.option-tag {
    font-size: 10px;
    color: var(--text-muted);
    opacity: 0.7;
}
```

### 3.2 Timeline Vertical Rail + Hour Grid

**Target**: Lines 6208-6213 (CSS for `.timeline-content`)

**Current CSS** (line 6209-6213):
```css
.timeline-content {
    position: relative;
    padding-left: 80px;
    margin-bottom: 16px;
}
```

**New CSS**:
```css
.timeline-content {
    position: relative;
    padding-left: 88px;
    margin-bottom: 16px;
}

/* Vertical connecting rail */
.timeline-content::before {
    content: '';
    position: absolute;
    left: 76px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
        180deg,
        var(--accent-amber) 0%,
        var(--accent-blue) 40%,
        #6366f1 70%,
        #8b5cf6 90%,
        rgba(139, 92, 246, 0.3) 100%
    );
    border-radius: 1px;
}
```

### 3.3 NOW Marker with Pulse Animation

**Target**: Lines 6215-6244 (CSS), Line 17515 (JS HTML template)

**Current CSS** (lines 6216-6244):
```css
.timeline-now {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    position: relative;
}
.now-label {
    position: absolute;
    left: -80px;
    background: var(--accent-amber);
    color: #0f172a;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
}
.now-time {
    font-size: 14px;
    color: var(--text-muted);
    margin-left: 12px;
}
.now-line {
    flex: 1;
    height: 2px;
    background: var(--accent-amber);
}
```

**New CSS**:
```css
.timeline-now {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    margin-top: 4px;
    position: relative;
    z-index: 2;
}

.now-label {
    position: absolute;
    left: -88px;
    background: var(--accent-amber);
    color: #0f172a;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
    animation: nowPulse 2s ease-in-out infinite;
}

@keyframes nowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.3); }
    50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.6); }
}

.now-label::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-left: 5px solid var(--accent-amber);
}

.now-time {
    font-size: 13px;
    color: var(--accent-amber);
    font-weight: 600;
    margin-left: 8px;
    font-family: 'SF Mono', Monaco, monospace;
}

.now-line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-amber), transparent);
    margin-left: 8px;
}
```

### 3.4 Task Row Redesign - Hover-Reveal Actions

**Target**: Lines 6246-6442 (CSS), Lines 17555-17594 (JS HTML template)

**Current behavior**: All 9 interactive elements (5 reorder + start + duration + edit + remove) always visible.

**New CSS** (replace/add to existing):
```css
/* Task card - cleaner baseline */
.task-card-timeline {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    position: relative;
}

.task-card-timeline:hover {
    border-color: var(--border-hover);
    background: var(--bg-card-hover);
}

.task-card-timeline.locked-in {
    border-left: 3px solid var(--accent-amber);
    background: linear-gradient(90deg, rgba(245, 158, 11, 0.06) 0%, var(--bg-card) 40%);
}

/* Time markers - larger, more readable */
.task-time-marker {
    position: absolute;
    left: -88px;
    width: 76px;
    text-align: right;
}

.task-start-time {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    font-family: 'SF Mono', Monaco, monospace;
}

/* Dot on the vertical rail connecting to the task */
.task-time-marker::after {
    content: '';
    position: absolute;
    right: -17px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-blue);
    border: 2px solid var(--bg-page);
    box-shadow: 0 0 0 1px var(--accent-blue);
}

.task-card-timeline.locked-in + .task-time-marker::after,
.locked-in .task-time-marker::after {
    background: var(--accent-amber);
    box-shadow: 0 0 0 1px var(--accent-amber);
}

/* Task text - slightly larger */
.task-content .task-text {
    display: inline;
    font-size: 13px;
    color: var(--text-primary);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
}

/* Duration badge - pill style */
.task-duration-info {
    font-size: 11px;
    color: var(--text-muted);
    background: rgba(100, 116, 139, 0.15);
    padding: 2px 6px;
    border-radius: 10px;
    white-space: nowrap;
    flex-shrink: 0;
}

/* Reorder buttons - HIDE by default, show on hover */
.reorder-buttons {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 2px;
    margin-right: 4px;
    align-items: center;
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    transition: all 0.2s ease;
}

.timeline-task:hover .reorder-buttons {
    opacity: 1;
    max-width: 150px;
}

/* Start button - subtle glow */
.timeline-task-actions .btn-start {
    background: var(--accent-green);
    color: white;
    border: none;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
    transition: all 0.2s;
}

.timeline-task-actions .btn-start:hover {
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
    transform: scale(1.05);
}

/* Edit and Remove - appear on hover */
.timeline-task-actions .btn-edit,
.timeline-task-actions .btn-remove {
    opacity: 0.4;
    transition: opacity 0.2s;
}

.timeline-task:hover .timeline-task-actions .btn-edit,
.timeline-task:hover .timeline-task-actions .btn-remove {
    opacity: 1;
}

/* Duration select - styled */
.duration-select {
    background: var(--bg-page);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 3px 6px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    font-family: 'SF Mono', Monaco, monospace;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%2364748b' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 4px center;
    padding-right: 14px;
}

/* Elapsed tasks (past NOW) - dimmed */
.timeline-task.elapsed .task-card-timeline {
    opacity: 0.45;
    border-color: rgba(51, 65, 85, 0.5);
}

.timeline-task.elapsed .task-start-time {
    color: var(--text-muted);
    opacity: 0.6;
}

/* Active task (currently in progress window) */
.timeline-task.active-now .task-card-timeline {
    border-color: var(--accent-amber);
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.15);
}
```

### 3.5 Wind-Down Block Redesign

**Target**: Lines 6444-6480 (CSS), Lines 7551-7558 (HTML)

**Current CSS** (lines 6445-6480):
```css
.timeline-protected {
    background: linear-gradient(135deg, rgba(100, 116, 139, 0.2), rgba(71, 85, 105, 0.2));
    border: 1px dashed #64748b;
    border-radius: 6px;
    padding: 10px 12px;
    margin: 10px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
```

**New CSS**:
```css
.timeline-protected {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(99, 102, 241, 0.05));
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-left: 3px solid rgba(139, 92, 246, 0.4);
    border-radius: 10px;
    padding: 14px 16px;
    margin: 16px 0;
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    overflow: hidden;
}

.timeline-protected::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 8px,
        rgba(139, 92, 246, 0.03) 8px,
        rgba(139, 92, 246, 0.03) 16px
    );
    pointer-events: none;
}

.protected-badge {
    font-size: 22px;
    filter: grayscale(0.2);
}

.protected-time {
    font-size: 13px;
    font-weight: 600;
    color: #a78bfa;
    font-family: 'SF Mono', Monaco, monospace;
}

.protected-label {
    font-size: 12px;
    font-weight: 700;
    color: #c4b5fd;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.protected-hint {
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
}
```

**New HTML** (replace lines 7551-7558):
```html
<div class="timeline-protected" id="windDownHour">
    <div class="protected-badge">🌙</div>
    <div class="protected-info">
        <span class="protected-time" id="windDownTimeRange">10:00 PM - 11:00 PM</span>
        <span class="protected-label">Wind-Down Hour</span>
        <span class="protected-hint">Protected time - nothing scheduled here</span>
    </div>
</div>
```

### 3.6 Sleep Marker Redesign

**Target**: Lines 6482-6506 (CSS), Lines 7561-7565 (HTML)

**Current CSS**:
```css
.timeline-sleep {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-top: 10px;
}
```

**New CSS**:
```css
.timeline-sleep {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.08));
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 10px;
    margin-top: 12px;
    position: relative;
}

.sleep-icon {
    font-size: 20px;
    animation: sleepBreathe 4s ease-in-out infinite;
}

@keyframes sleepBreathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.sleep-time {
    font-size: 16px;
    font-weight: 700;
    color: #c4b5fd;
    font-family: 'SF Mono', Monaco, monospace;
}

.sleep-label {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
}
```

### 3.7 Progress Bar Enhancement

**Target**: Lines 6133-6178 (CSS)

**Current CSS** (time-summary):
```css
.time-summary {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 12px;
}
.time-progress-bar {
    flex: 1;
    height: 8px;
    ...
}
```

**New CSS**:
```css
.time-summary {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 16px;
}

.time-until-sleep {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.time-icon {
    font-size: 16px;
}

.time-progress-bar {
    flex: 1;
    height: 10px;
    background: var(--bg-page);
    border-radius: 5px;
    overflow: hidden;
    position: relative;
}

.time-progress-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.5s ease, background 0.3s;
}

/* Color-coded progress states */
.time-progress-fill {
    background: linear-gradient(90deg, var(--accent-green), #4ade80);
}

.time-progress-fill.tight {
    background: linear-gradient(90deg, var(--accent-amber), #fbbf24);
}

.time-progress-fill.overscheduled {
    background: linear-gradient(90deg, var(--accent-red), #f87171);
}

.scheduled-time-text {
    font-size: 13px;
    color: var(--text-muted);
    white-space: nowrap;
    font-family: 'SF Mono', Monaco, monospace;
}
```

**Note**: Requires a minor JS change in `renderCrashOutTimeline()` around line 17462-17472 to add `.tight` class when buffer < 30 minutes (instead of only having default amber and `.overscheduled`). Default becomes green (on track), `.tight` = amber (tight buffer), `.overscheduled` = red.

### 3.8 Unscheduled Pool Redesign

**Target**: Lines 6508-6602 (CSS)

**New CSS**:
```css
.unscheduled-pool {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 24px;
    margin-top: 8px;
}

.pool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.pool-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.pool-count {
    font-size: 12px;
    color: #0f172a;
    background: var(--accent-amber);
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
}

.pool-hint {
    font-size: 12px;
    color: var(--text-muted);
    margin: 0 0 14px 0;
}

.pool-tasks {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.pool-task-card {
    background: var(--bg-page);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    min-width: 140px;
    max-width: 200px;
    flex: 1;
    transition: all 0.2s ease;
}

.pool-task-card:hover {
    border-color: var(--accent-teal);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(20, 184, 166, 0.1);
}

.pool-task-text {
    font-size: 12px;
    color: var(--text-primary);
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
    font-weight: 500;
}

.pool-task-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.pool-task-duration {
    font-size: 11px;
    color: var(--text-muted);
    background: rgba(100, 116, 139, 0.15);
    padding: 1px 6px;
    border-radius: 8px;
}

.btn-add-to-timeline {
    background: transparent;
    color: var(--accent-teal);
    border: 1px solid rgba(20, 184, 166, 0.3);
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    width: 100%;
    font-weight: 600;
    transition: all 0.2s;
    letter-spacing: 0.3px;
}

.btn-add-to-timeline:hover {
    background: rgba(20, 184, 166, 0.15);
    border-color: var(--accent-teal);
}
```

### 3.9 Timeline Header Refinement

**Target**: Lines 6076-6131 (CSS)

**New CSS**:
```css
.timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
}

.timeline-header h2 {
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.3px;
}

.sleep-time-adjuster {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-page);
    padding: 4px 6px;
    border-radius: 8px;
    border: 1px solid var(--border);
}

.btn-adjust-sleep {
    background: transparent;
    border: none;
    color: var(--text-muted);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-family: 'SF Mono', Monaco, monospace;
    transition: all 0.15s;
}

.btn-adjust-sleep:hover {
    background: var(--bg-card);
    color: var(--text-primary);
}

.current-sleep-label {
    color: #c4b5fd;
    font-weight: 700;
    font-size: 14px;
    padding: 0 8px;
    font-family: 'SF Mono', Monaco, monospace;
}

.btn-change-sleep {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    margin-left: 4px;
    transition: all 0.15s;
}

.btn-change-sleep:hover {
    border-color: var(--accent-red);
    color: var(--accent-red);
}
```

### 3.10 Empty Timeline State

**Target**: Lines 6604-6613 (CSS)

**New CSS**:
```css
.timeline-empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-muted);
}

.timeline-empty-icon {
    font-size: 40px;
    margin-bottom: 16px;
    opacity: 0.6;
}

.timeline-empty-text {
    font-size: 16px;
    color: var(--text-secondary);
    margin-bottom: 6px;
    font-weight: 500;
}

.timeline-empty-hint {
    font-size: 13px;
    color: var(--text-muted);
}
```

---

## 4. New CSS Classes Summary

| Class | Purpose | Section |
|-------|---------|---------|
| `.setup-icon-container` | Wrapper for icon + ring animation | Setup |
| `.setup-icon-ring` | Pulsing ring around setup icon | Setup |
| `.sleep-option-tonight` | Tonight option hover color (amber) | Setup |
| `.sleep-option-late` | Late night option hover color (purple) | Setup |
| `.sleep-option-custom` | Custom option variant | Setup |
| `.option-icon` | Icon inside sleep option card | Setup |
| `.option-tag` | Subtle tag text under time | Setup |
| `.time-progress-fill.tight` | Amber color for tight buffer | Progress |
| `.timeline-task.elapsed` | Dimmed styling for past tasks | Timeline |
| `.timeline-task.active-now` | Highlighted styling for current task | Timeline |

---

## 5. Animation Keyframes

```css
/* Setup icon ring pulse */
@keyframes setupRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.15); opacity: 0; }
}

/* NOW marker glow pulse */
@keyframes nowPulse {
    0%, 100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.3); }
    50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.6); }
}

/* Sleep emoji gentle breathe */
@keyframes sleepBreathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

/* Existing - keep as-is */
@keyframes cascadeShift {
    0% { transform: translateX(-10px); opacity: 0.7; }
    100% { transform: translateX(0); opacity: 1; }
}
```

---

## 6. Minimal JS Changes Required

These are **display-only** changes to the `renderCrashOutTimelineTasks()` function (line 17509) needed to support the new CSS classes. No logic changes.

### 6a. Add elapsed/active-now classes to task rows (line 17556)
In the existing HTML template, change:
```js
// Current:
<div class="timeline-task" data-task-id="${task.id}" ...>

// New: add elapsed/active class based on time comparison
const isElapsed = tsd && (new Date(tsd.getTime() + duration * 60 * 1000)) < now;
const isActiveNow = tsd && tsd <= now && (new Date(tsd.getTime() + duration * 60 * 1000)) > now;
// Then:
<div class="timeline-task ${isElapsed ? 'elapsed' : ''} ${isActiveNow ? 'active-now' : ''}" ...>
```

### 6b. Add `.tight` class to progress bar (inside renderCrashOutTimeline, ~line 17467)
```js
// After existing overscheduled check, add:
if (gapMinutes >= 0 && gapMinutes < 30) {
    progressEl.classList.add('tight');
    progressEl.classList.remove('overscheduled');
} else if (gapMinutes < 0) {
    progressEl.classList.add('overscheduled');
    progressEl.classList.remove('tight');
} else {
    progressEl.classList.remove('overscheduled');
    progressEl.classList.remove('tight');
}
```

---

## 7. Summary of Files to Edit

All changes are in `/Users/suleman/dental-quest/index.html`:

| Line Range | Section | Change Type |
|-----------|---------|-------------|
| 5993-6071 | Sleep setup CSS | Replace with new setup styles |
| 6076-6131 | Timeline header CSS | Replace with refined header |
| 6133-6178 | Time summary CSS | Replace with enhanced progress |
| 6208-6244 | Timeline content + NOW CSS | Replace with rail + animated NOW |
| 6246-6442 | Task rows + reorder CSS | Replace with hover-reveal actions |
| 6444-6506 | Wind-down + sleep marker CSS | Replace with themed blocks |
| 6508-6602 | Unscheduled pool CSS | Replace with card redesign |
| 6604-6632 | Empty state + reset CSS | Minor refinements |
| 7466-7497 | Sleep setup HTML | Update icon, titles, option cards |
| 7551-7558 | Wind-down HTML | Update emoji and text |
| 17515 | NOW marker HTML (JS) | No structural change needed |
| 17549-17556 | Task elapsed/active class (JS) | Add 2 computed booleans + class |
| 17462-17472 | Progress bar class (JS) | Add `.tight` class logic |
