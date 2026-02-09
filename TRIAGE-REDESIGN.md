# TRIAGE TAB UI/UX REDESIGN SPECIFICATION

## 1. CURRENT STATE ANALYSIS

### CSS Variable System (line ~5452)
The app uses a well-structured CSS variable system in dark theme:
```css
--bg-page: #0f172a;
--bg-card: #1e293b;
--bg-card-hover: #334155;
--border: #334155;
--border-hover: #475569;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #64748b;
--accent-blue: #3b82f6;
--accent-green: #22c55e;
--accent-amber: #f59e0b;
--accent-teal: #14b8a6;
--accent-red: #ef4444;
```

### HTML Structure (lines 7340-7459)
The Triage mode content is structured as:
1. **Greeting** (`div.triage-greeting`) -- centered h2 + date span
2. **Overall Progress** (`div.triage-overall-progress`) -- label + bar + text
3. **Three Columns** (`div.triage-columns`) -- grid of 3 `div.triage-column`
   - Each column: `div.column-header` (title row + progress row) + `div.column-tasks`
   - LOCKED IN column (`.triage-column.locked-in`) has special gradient/border
   - TODAY column (`.triage-column.today`)
   - TOMORROW column (`.triage-column.tomorrow`)
4. **SCHEDULED Section** (`div.triage-section.scheduled`) -- full-width, hidden by default
5. **ROLLED OVER Section** (`div.triage-section.rolled-over`) -- full-width, hidden by default
6. **Quick Add & Actions** (`div.triage-quick-add`) -- input + 2 action buttons

### Render Functions (lines 16257-16440)
- `renderTriageMode()` (line 16257): Orchestrator -- calls greeting, 3 columns, scheduled, rolled-over, progress, drag-drop
- `renderTriageColumn(tier)` (line 16288): Renders task cards into column, shows empty state if 0 tasks
- `renderTaskCard(task, tier)` (line 16311): Returns HTML for one task card with drag handle, checkbox, text, actions
- `renderScheduledSection()` (line 16344): Renders crash-out-scheduled tasks with time badges
- `renderRolledOverSection()` (line 16373): Renders rolled-over tasks with amber warning border
- `updateAllTriageProgress()` (line 16408): Updates overall + per-column progress bars
- `updateColumnProgress(tier)` (line 16426): Updates count, progress bar width, percentage

### Existing CSS Layers
There are **two** CSS layers for triage styles:
1. **Original styles** (lines ~1010-1410): Basic dark theme styles
2. **Override styles** (lines ~5490-6970): `!important` overrides using CSS variables -- these are the ACTIVE styles

The override layer at lines 5490-6970 is the one that matters. It overrides nearly everything with `!important`.

---

## 2. PROBLEMS IDENTIFIED

### 2.1 Mode Tabs (line 7333-7336, CSS 5498-5530)
- **Problem**: Flat, undifferentiated buttons. Active state is subtle (slightly different bg). No visual weight to indicate current tab.
- **Problem**: Inline styles on the HTML elements fight with the CSS classes.
- **Problem**: No bottom indicator or active tab accent line.

### 2.2 Greeting Section (line 7343-7346, CSS 5533-5554)
- **Problem**: Generic centered text. No personality or visual interest.
- **Problem**: Date is just plain text, no formatting sophistication.
- **Problem**: No motivational context (like streak count, % done yesterday).

### 2.3 Overall Progress Bar (line 7348-7355, CSS 5557-5600)
- **Problem**: Static bar with no animation on page load (only transitions on update).
- **Problem**: No milestone markers or visual celebration when progress is high.
- **Problem**: The gradient (blue to purple) is nice but the bar itself is thin and unremarkable.
- **Problem**: No shimmer or glow effect to draw the eye.

### 2.4 Column Headers (line 7362-7374, CSS 5652-5698)
- **Problem**: Column name is just plain uppercase text with a color override.
- **Problem**: Count badge `(0)` is a plain span with muted background -- looks like a footnote.
- **Problem**: Mini progress bar is tiny (6px/60px wide) and easy to miss.
- **Problem**: No icon styling -- emoji icons have no container/backdrop.

### 2.5 Column Cards / Containers (lines 5611-5627, 5629-5643)
- **Problem**: All three columns look nearly identical -- only the left border color differs.
- **Problem**: Locked-In column should feel more urgent/premium -- currently it just has an amber left border.
- **Problem**: No subtle background differentiation between columns.
- **Problem**: `min-height: 180px / max-height: 550px` -- awkward fixed ranges.

### 2.6 Task Cards (lines 5716-5731, original 1178-1232)
- **Problem**: Flat cards with minimal hover effect (just border-color change, no transform).
- **Problem**: All action buttons always visible -- creates visual clutter.
- **Problem**: Drag handle (`⋮⋮`) is crude -- should be more refined.
- **Problem**: No left-border color coding per tier (locked-in task vs today task).
- **Problem**: Checkbox is default browser style with `accent-color` -- no custom animation.
- **Problem**: Task text has no truncation for very long text.
- **Problem**: No visual distinction for high-priority tasks.
- **Problem**: `transform: none !important` on hover explicitly prevents lift effect.

### 2.7 Empty States (CSS 5984-5991)
- **Problem**: Just plain text, centered. No icon, no illustration.
- **Problem**: No visual encouragement or call-to-action.
- **Problem**: All empty states use the same style regardless of column.

### 2.8 Drag and Drop (lines 7046-7060)
- **Problem**: Dragging card just gets `opacity: 0.5` -- no scale, no rotation, no shadow.
- **Problem**: Drop target just gets a subtle blue tint -- easy to miss.
- **Problem**: No drop zone indicator (dashed border, pulse, etc).

### 2.9 Scheduled Section (lines 5823-5880, HTML 7422-7432)
- **Problem**: Flat section with just a teal left border.
- **Problem**: Time badges are plain text.
- **Problem**: No visual timeline or ordering indication.

### 2.10 Rolled Over Section (lines 5823-5836, HTML 7434-7443)
- **Problem**: Amber left border but no strong "attention needed" visual.
- **Problem**: Warning icon is just inline emoji.
- **Problem**: No pulsing or glow to draw attention to overdue items.

### 2.11 Quick Add Section (lines 5882-5950, HTML 7447-7457)
- **Problem**: Input and buttons are functional but plain.
- **Problem**: No placeholder icon or animated focus state.
- **Problem**: Action buttons are generic styled.

---

## 3. PROPOSED CHANGES

### 3.1 Mode Tabs Enhancement
**Location**: CSS override block, after line ~5530

**Current CSS** (lines 5507-5530):
```css
.cc-mode-tab {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    color: var(--text-secondary) !important;
    padding: 12px 28px !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
}
.cc-mode-tab:hover {
    border-color: var(--border-hover) !important;
    color: var(--text-primary) !important;
}
.cc-mode-tab.active {
    background: var(--bg-card-hover) !important;
    border-color: var(--accent-blue) !important;
    color: var(--text-primary) !important;
}
```

**New CSS** (replace lines 5507-5530):
```css
.cc-mode-tab {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    color: var(--text-secondary) !important;
    padding: 12px 28px !important;
    border-radius: 10px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative !important;
    overflow: hidden !important;
}

.cc-mode-tab::after {
    content: '' !important;
    position: absolute !important;
    bottom: 0 !important;
    left: 50% !important;
    transform: translateX(-50%) scaleX(0) !important;
    width: 60% !important;
    height: 3px !important;
    border-radius: 3px 3px 0 0 !important;
    background: var(--accent-blue) !important;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.cc-mode-tab:hover {
    border-color: var(--border-hover) !important;
    color: var(--text-primary) !important;
    background: rgba(59, 130, 246, 0.05) !important;
}

.cc-mode-tab.active {
    background: rgba(59, 130, 246, 0.1) !important;
    border-color: var(--accent-blue) !important;
    color: var(--text-primary) !important;
    font-weight: 600 !important;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1) !important;
}

.cc-mode-tab.active::after {
    transform: translateX(-50%) scaleX(1) !important;
}
```

### 3.2 Greeting Section Enhancement
**Location**: CSS override block, replace lines 5533-5554

**Current CSS**:
```css
.triage-greeting { text-align: center; margin-bottom: 16px; }
.triage-greeting h2 { font-size: 20px; font-weight: 500; color: var(--text-primary); margin: 0 0 4px 0; }
.triage-date { font-size: 13px; color: var(--text-muted); }
```

**New CSS**:
```css
.triage-greeting,
[class*="greeting"],
.greeting-section {
    text-align: center !important;
    margin-bottom: 20px !important;
    padding: 8px 0 !important;
}

.triage-greeting h2,
[class*="greeting"] h2,
.greeting-section h2 {
    font-size: 22px !important;
    font-weight: 600 !important;
    color: var(--text-primary) !important;
    margin: 0 0 6px 0 !important;
    letter-spacing: -0.3px !important;
}

.triage-date,
[class*="greeting"] span,
.greeting-date {
    font-size: 13px !important;
    color: var(--text-muted) !important;
    letter-spacing: 0.3px !important;
    font-variant-numeric: tabular-nums !important;
}
```

### 3.3 Overall Progress Bar Enhancement
**Location**: CSS override block, replace lines 5557-5600

**Current CSS** (summarized): Flat bar, linear gradient, no animation effects.

**New CSS**:
```css
.triage-overall-progress,
[class*="progress-container"],
.today-progress,
.triage-progress {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    padding: 16px 20px !important;
    margin-bottom: 24px !important;
    display: flex !important;
    align-items: center !important;
    gap: 16px !important;
    width: 100% !important;
    position: relative !important;
    overflow: hidden !important;
}

.progress-label {
    font-size: 14px !important;
    font-weight: 600 !important;
    color: var(--text-secondary) !important;
    white-space: nowrap !important;
}

.progress-bar-container,
[class*="progress-bar"]:not(.mini-progress-bar):not([class*="fill"]) {
    flex: 1 !important;
    height: 10px !important;
    background: var(--bg-page) !important;
    border-radius: 5px !important;
    overflow: hidden !important;
    position: relative !important;
}

.progress-bar-fill,
[class*="progress-fill"],
[class*="progress-bar"] > div {
    height: 100% !important;
    background: linear-gradient(90deg, var(--accent-blue), #8b5cf6) !important;
    border-radius: 5px !important;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative !important;
    overflow: hidden !important;
}

.progress-bar-fill::after {
    content: '' !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.15) 50%,
        transparent 100%
    ) !important;
    animation: progressShimmer 2s ease-in-out infinite !important;
}

.progress-text {
    font-size: 13px !important;
    color: var(--text-muted) !important;
    font-variant-numeric: tabular-nums !important;
    white-space: nowrap !important;
    font-weight: 500 !important;
}
```

### 3.4 Column Container Enhancement
**Location**: CSS override block, replace lines 5603-5643

**Current CSS**:
```css
.triage-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.triage-column { background: var(--bg-card); border: 1px solid var(--border); min-height: 180px; max-height: 550px; }
.triage-column.locked-in { border-left: 4px solid var(--accent-amber); }
.triage-column.today { border-left: 4px solid var(--accent-blue); }
.triage-column.tomorrow { border-left: 4px solid var(--accent-teal); }
```

**New CSS**:
```css
/* === THREE COLUMNS === */
.triage-columns {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 14px !important;
    width: 100% !important;
    margin-bottom: 14px !important;
}

/* === COLUMN CARDS === */
.triage-column,
.triage-columns .cc-section,
.cc-locked-in,
.cc-today,
.cc-tomorrow,
[data-tier] {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    padding: 10px !important;
    min-height: 200px !important;
    max-height: 550px !important;
    display: flex !important;
    flex-direction: column !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15) !important;
    transition: box-shadow 0.25s ease, border-color 0.25s ease !important;
}

.triage-column.locked-in,
.cc-locked-in,
[data-tier="lockedIn"] {
    border-left: 4px solid var(--accent-amber) !important;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.04) 100%) !important;
}

.triage-column.today,
[data-tier="today"] {
    border-left: 4px solid var(--accent-blue) !important;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(59, 130, 246, 0.03) 100%) !important;
}

.triage-column.tomorrow,
[data-tier="tomorrow"] {
    border-left: 4px solid var(--accent-teal) !important;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(20, 184, 166, 0.03) 100%) !important;
}

.triage-section.scheduled,
#scheduledSection,
.cc-scheduled,
[data-tier="scheduled"] {
    border-left: 4px solid var(--accent-teal) !important;
}
```

### 3.5 Column Header Enhancement
**Location**: CSS override block, replace lines 5652-5698

**Current CSS**: Plain flex layout, text only, basic count badge.

**New CSS**:
```css
/* === COLUMN HEADERS === */
.column-header,
.cc-section-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding-bottom: 10px !important;
    margin-bottom: 10px !important;
    border-bottom: 1px solid var(--border) !important;
}

.column-name,
.cc-section-header span:first-child {
    font-size: 12px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 1px !important;
    color: var(--text-secondary) !important;
    background: none !important;
    -webkit-text-fill-color: var(--text-secondary) !important;
}

.triage-column.locked-in .column-name,
.cc-locked-in .cc-section-header span:first-child {
    color: var(--accent-amber) !important;
    -webkit-text-fill-color: var(--accent-amber) !important;
    text-shadow: 0 0 20px rgba(245, 158, 11, 0.2) !important;
}

.triage-column.today .column-name {
    color: var(--accent-blue) !important;
    -webkit-text-fill-color: var(--accent-blue) !important;
}

.triage-column.tomorrow .column-name {
    color: var(--accent-teal) !important;
    -webkit-text-fill-color: var(--accent-teal) !important;
}

/* Count badge */
.column-count,
[id$="Count"] {
    font-size: 11px !important;
    font-weight: 600 !important;
    background: var(--bg-page) !important;
    color: var(--text-muted) !important;
    padding: 3px 10px !important;
    border-radius: 10px !important;
    letter-spacing: 0.3px !important;
}

/* Icon container */
.column-icon {
    font-size: 14px !important;
    line-height: 1 !important;
}
```

### 3.6 Task Card Enhancement (MAJOR)
**Location**: CSS override block, replace lines 5716-5757

**Current CSS**:
```css
.task-card { background: var(--bg-page); border: 1px solid var(--border); padding: 6px 10px; margin-bottom: 4px; transition: all 0.15s; }
.task-card:hover { border-color: var(--accent-blue); transform: none; background: rgba(56, 139, 253, 0.04); }
```

**New CSS**:
```css
/* === TASK CARDS === */
.task-card,
.cc-task-item {
    background: var(--bg-page) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    padding: 8px 12px !important;
    margin-bottom: 6px !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    position: relative !important;
}

.task-card:hover,
.cc-task-item:hover {
    border-color: rgba(59, 130, 246, 0.4) !important;
    transform: translateY(-1px) !important;
    background: rgba(59, 130, 246, 0.04) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

/* Tier-specific left accent on task cards */
.triage-column.locked-in .task-card {
    border-left: 3px solid rgba(245, 158, 11, 0.3) !important;
}

.triage-column.locked-in .task-card:hover {
    border-left-color: var(--accent-amber) !important;
    border-color: rgba(245, 158, 11, 0.3) !important;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1) !important;
}

.triage-column.today .task-card {
    border-left: 3px solid rgba(59, 130, 246, 0.2) !important;
}

.triage-column.today .task-card:hover {
    border-left-color: var(--accent-blue) !important;
}

.triage-column.tomorrow .task-card {
    border-left: 3px solid rgba(20, 184, 166, 0.2) !important;
}

.triage-column.tomorrow .task-card:hover {
    border-left-color: var(--accent-teal) !important;
    border-color: rgba(20, 184, 166, 0.3) !important;
}

/* Drag handle */
.drag-handle {
    color: var(--text-muted) !important;
    cursor: grab !important;
    margin-right: 4px !important;
    font-size: 11px !important;
    opacity: 0.3 !important;
    transition: opacity 0.15s !important;
}

.task-card:hover .drag-handle {
    opacity: 0.8 !important;
}

/* === TASK TEXT === */
.task-card .task-text,
.cc-task-item span:not([style]):not([class*="badge"]),
.cc-task-item > div:first-child > span:last-child {
    font-size: 13px !important;
    line-height: 1.5 !important;
    color: var(--text-primary) !important;
    display: inline !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
}
```

### 3.7 Task Button Enhancement (Actions on Hover)
**Location**: CSS override block, replace lines 5770-5821

**Current CSS**: All buttons always visible, basic styling.

**New CSS**:
```css
/* === TASK BUTTONS === */
.task-card-actions {
    display: flex !important;
    gap: 4px !important;
    margin-left: auto !important;
    flex-shrink: 0 !important;
    opacity: 0 !important;
    transition: opacity 0.2s ease !important;
}

.task-card:hover .task-card-actions {
    opacity: 1 !important;
}

/* Keep actions visible on touch devices */
@media (hover: none) {
    .task-card-actions {
        opacity: 1 !important;
    }
}

.task-card button,
.task-card-actions button,
.cc-task-item button,
.btn-start,
.btn-crash-out,
button[onclick*="startFocus"],
button[onclick*="Crash"] {
    padding: 4px 10px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    white-space: nowrap !important;
}

.btn-start,
button[onclick*="startFocus"],
button[onclick*="startTaskInFocus"] {
    background: var(--accent-green) !important;
    color: white !important;
    border: none !important;
    box-shadow: 0 1px 3px rgba(34, 197, 94, 0.3) !important;
}

.btn-start:hover,
button[onclick*="startFocus"]:hover {
    background: #16a34a !important;
    box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4) !important;
    transform: translateY(-1px) !important;
}

.btn-crash-out,
button[onclick*="sendToCrashOut"],
button[onclick*="Crash"] {
    background: transparent !important;
    color: var(--accent-teal) !important;
    border: 1px solid rgba(20, 184, 166, 0.3) !important;
}

.btn-crash-out:hover,
button[onclick*="sendToCrashOut"]:hover {
    background: rgba(20, 184, 166, 0.12) !important;
    border-color: var(--accent-teal) !important;
    transform: translateY(-1px) !important;
}

.btn-remove {
    background: transparent !important;
    color: var(--text-muted) !important;
    border: 1px solid var(--border) !important;
}

.btn-remove:hover {
    border-color: var(--accent-red) !important;
    color: var(--accent-red) !important;
    background: rgba(239, 68, 68, 0.08) !important;
}
```

### 3.8 Checkbox Enhancement
**Location**: CSS override block, replace lines 5760-5768

**Current CSS**: Basic browser checkbox with accent-color.

**New CSS**:
```css
/* === CHECKBOX === */
.task-card input[type="checkbox"],
.cc-task-item input[type="checkbox"],
.task-checkbox {
    width: 16px !important;
    height: 16px !important;
    accent-color: var(--accent-blue) !important;
    cursor: pointer !important;
    flex-shrink: 0 !important;
    transition: transform 0.15s ease !important;
}

.task-card input[type="checkbox"]:hover,
.task-checkbox:hover {
    transform: scale(1.15) !important;
}

.task-card input[type="checkbox"]:checked,
.task-checkbox:checked {
    animation: checkPop 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
```

### 3.9 Empty State Enhancement
**Location**: CSS override block, replace lines 5984-5991

**Current CSS**:
```css
.column-empty-state { color: var(--text-muted); text-align: center; padding: 20px 12px; font-size: 12px; }
```

**New CSS**:
```css
/* Empty state */
.column-empty-state {
    color: var(--text-muted) !important;
    background: transparent !important;
    text-align: center !important;
    padding: 32px 16px !important;
    font-size: 12px !important;
    line-height: 1.6 !important;
    opacity: 0.7 !important;
    border: 2px dashed rgba(100, 116, 139, 0.2) !important;
    border-radius: 8px !important;
    margin: 8px 4px !important;
    transition: border-color 0.2s ease, opacity 0.2s ease !important;
}

.column-empty-state:hover {
    border-color: rgba(100, 116, 139, 0.35) !important;
    opacity: 0.9 !important;
}

/* Tier-specific empty states */
.triage-column.locked-in .column-empty-state {
    border-color: rgba(245, 158, 11, 0.15) !important;
}

.triage-column.locked-in .column-empty-state:hover {
    border-color: rgba(245, 158, 11, 0.3) !important;
}

.triage-column.today .column-empty-state {
    border-color: rgba(59, 130, 246, 0.15) !important;
}

.triage-column.tomorrow .column-empty-state {
    border-color: rgba(20, 184, 166, 0.15) !important;
}
```

### 3.10 Drag and Drop Enhancement
**Location**: CSS override block, replace lines 7046-7060

**Current CSS**:
```css
.task-card.dragging { opacity: 0.5; }
.triage-column.drag-over { background: rgba(59, 130, 246, 0.1); border-color: var(--accent-blue); }
```

**New CSS**:
```css
/* === DRAG AND DROP === */
.task-card.dragging {
    opacity: 0.4 !important;
    transform: scale(0.97) rotate(1deg) !important;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
    transition: all 0.15s ease !important;
}

.triage-column.drag-over,
.column-tasks.drag-over {
    background: rgba(59, 130, 246, 0.08) !important;
    border-color: var(--accent-blue) !important;
    box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.06), 0 0 15px rgba(59, 130, 246, 0.08) !important;
    transition: all 0.2s ease !important;
}

/* Locked-in column drag over keeps amber theme */
.triage-column.locked-in.drag-over {
    background: rgba(245, 158, 11, 0.08) !important;
    border-color: var(--accent-amber) !important;
    box-shadow: inset 0 0 20px rgba(245, 158, 11, 0.06), 0 0 15px rgba(245, 158, 11, 0.08) !important;
}

.cc-section.drop-target {
    background: rgba(59, 130, 246, 0.08) !important;
    border-color: var(--accent-blue) !important;
    box-shadow: inset 0 0 15px rgba(59, 130, 246, 0.05) !important;
}
```

### 3.11 Scheduled Section Enhancement
**Location**: CSS override block, replace lines 5823-5880

**Current CSS**: Basic card with teal left border.

**New CSS**:
```css
/* === SCHEDULED & ROLLED OVER SECTIONS === */
.triage-section.scheduled,
#scheduledSection,
#rolledOverSection {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 10px !important;
    padding: 12px 16px !important;
    margin-bottom: 12px !important;
    width: 100% !important;
    transition: border-color 0.2s ease !important;
}

#scheduledSection {
    border-left: 4px solid var(--accent-teal) !important;
}

#rolledOverSection {
    border-left: 4px solid var(--accent-amber) !important;
    background: linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.04) 100%) !important;
    animation: subtlePulse 3s ease-in-out infinite !important;
}

.section-header {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin-bottom: 10px !important;
}

.section-title {
    font-size: 12px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.8px !important;
    color: var(--text-secondary) !important;
}

.section-subtitle {
    font-size: 11px !important;
    color: var(--text-muted) !important;
    font-style: italic !important;
}

.section-count {
    font-size: 11px !important;
    font-weight: 600 !important;
    color: var(--text-muted) !important;
    margin-left: auto !important;
    background: var(--bg-page) !important;
    padding: 2px 8px !important;
    border-radius: 8px !important;
}

.scheduled-task-card {
    background: var(--bg-page) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    padding: 8px 12px !important;
    margin-bottom: 6px !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    transition: all 0.2s ease !important;
}

.scheduled-task-card:hover {
    border-color: rgba(20, 184, 166, 0.4) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

.scheduled-time {
    font-size: 11px !important;
    font-weight: 700 !important;
    color: var(--accent-teal) !important;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace !important;
    min-width: 60px !important;
    background: rgba(20, 184, 166, 0.08) !important;
    padding: 3px 8px !important;
    border-radius: 6px !important;
    text-align: center !important;
}
```

### 3.12 Quick Add Section Enhancement
**Location**: CSS override block, replace lines 5882-5950

**Current CSS**: Basic input + button styling.

**New CSS**:
```css
/* === QUICK ADD === */
.triage-quick-add,
[class*="quick-add"] {
    background: var(--bg-card) !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    padding: 14px !important;
    margin-top: 14px !important;
}

.triage-quick-add-row {
    display: flex !important;
    gap: 12px !important;
    margin-bottom: 12px !important;
}

.triage-quick-add input,
#triageQuickAdd {
    flex: 1 !important;
    background: var(--bg-page) !important;
    border: 1px solid var(--border) !important;
    color: var(--text-primary) !important;
    padding: 12px 16px !important;
    border-radius: 10px !important;
    font-size: 14px !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}

.triage-quick-add input:focus,
#triageQuickAdd:focus {
    border-color: var(--accent-blue) !important;
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12) !important;
}

.triage-quick-add-btn {
    background: var(--accent-blue) !important;
    color: white !important;
    border: none !important;
    padding: 12px 24px !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3) !important;
}

.triage-quick-add-btn:hover {
    background: #2563eb !important;
    box-shadow: 0 3px 8px rgba(59, 130, 246, 0.4) !important;
    transform: translateY(-1px) !important;
}

.triage-action-btns {
    display: flex !important;
    gap: 12px !important;
}

.triage-action-btn {
    flex: 1 !important;
    background: transparent !important;
    border: 1px solid var(--border) !important;
    color: var(--text-secondary) !important;
    padding: 10px 16px !important;
    border-radius: 10px !important;
    font-size: 13px !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
}

.triage-action-btn:hover {
    border-color: var(--accent-blue) !important;
    color: var(--text-primary) !important;
    background: rgba(59, 130, 246, 0.05) !important;
}

.triage-action-btn.primary {
    background: var(--accent-amber) !important;
    border-color: var(--accent-amber) !important;
    color: #0f172a !important;
    font-weight: 600 !important;
    box-shadow: 0 1px 3px rgba(245, 158, 11, 0.3) !important;
}

.triage-action-btn.primary:hover {
    box-shadow: 0 3px 8px rgba(245, 158, 11, 0.4) !important;
    transform: translateY(-1px) !important;
}
```

### 3.13 Mini Progress Bar Enhancement
**Location**: CSS override block, replace lines 5953-5982

**Current CSS**: Simple 60px wide bar.

**New CSS**:
```css
/* === MINI PROGRESS BARS === */
.column-progress {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}

.mini-progress-bar {
    width: 60px !important;
    height: 6px !important;
    background: var(--bg-page) !important;
    border-radius: 3px !important;
    overflow: hidden !important;
}

.mini-progress-fill {
    height: 100% !important;
    background: var(--accent-blue) !important;
    border-radius: 3px !important;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.triage-column.locked-in .mini-progress-fill {
    background: linear-gradient(90deg, var(--accent-amber), #fbbf24) !important;
}

.triage-column.today .mini-progress-fill {
    background: linear-gradient(90deg, var(--accent-blue), #60a5fa) !important;
}

.triage-column.tomorrow .mini-progress-fill {
    background: linear-gradient(90deg, var(--accent-teal), #2dd4bf) !important;
}

.mini-progress-text {
    font-size: 11px !important;
    color: var(--text-muted) !important;
    font-weight: 500 !important;
    font-variant-numeric: tabular-nums !important;
}
```

---

## 4. NEW ANIMATION KEYFRAMES

These keyframes should be added to the CSS override block (after line ~5465, before the first rule):

```css
/* === ANIMATIONS === */
@keyframes progressShimmer {
    0% { transform: translateX(-200%); }
    100% { transform: translateX(200%); }
}

@keyframes checkPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}

@keyframes subtlePulse {
    0%, 100% { border-left-color: var(--accent-amber); }
    50% { border-left-color: rgba(245, 158, 11, 0.6); }
}
```

---

## 5. SUMMARY OF CHANGES BY LINE NUMBER

| Section | Current Lines | What Changes |
|---------|--------------|--------------|
| New keyframes | Insert after ~5465 | Add 3 new @keyframes |
| Mode Tabs | 5507-5530 | Enhanced active state, bottom indicator, subtle glow |
| Greeting | 5533-5554 | Better typography, letter spacing |
| Overall Progress | 5557-5600 | Shimmer effect on fill, smoother transitions |
| Three Columns | 5603-5650 | Subtle gradient backgrounds, better shadows/rounding |
| Column Headers | 5652-5698 | Bolder weight, text-shadow on locked-in, better count badge |
| Task Cards | 5716-5757 | Hover lift, tier-specific borders, reveal-on-hover actions |
| Checkbox | 5760-5768 | Scale on hover, pop animation on check |
| Task Buttons | 5770-5821 | Hidden by default, show on hover, button shadows |
| Scheduled/Rolled | 5823-5880 | Rolled-over pulse, time badge pill, better spacing |
| Quick Add | 5882-5950 | Focus ring glow, hover elevate on buttons |
| Mini Progress | 5953-5982 | Per-column gradients, smoother easing |
| Empty States | 5984-5991 | Dashed border, tier-specific colors, hover effect |
| Drag and Drop | 7046-7060 | Rotate+scale on drag, glow on drop zone |

---

## 6. HTML STRUCTURE CHANGES

**No HTML structure changes required.** All improvements are CSS-only.

The existing HTML at lines 7340-7459 is well-structured. The class names and IDs provide sufficient hooks for all proposed CSS enhancements. The `renderTaskCard()` function at line 16311 outputs good semantic HTML that supports all the new CSS selectors.

---

## 7. JAVASCRIPT CHANGES

**No JavaScript changes required.** All render functions remain identical. The CSS-only approach means:
- `renderTriageMode()` (line 16257) -- unchanged
- `renderTriageColumn()` (line 16288) -- unchanged
- `renderTaskCard()` (line 16311) -- unchanged
- `renderScheduledSection()` (line 16344) -- unchanged
- `renderRolledOverSection()` (line 16373) -- unchanged
- `updateAllTriageProgress()` (line 16408) -- unchanged
- Drag-and-drop handlers (lines 16500-16820) -- unchanged

---

## 8. DESIGN PRINCIPLES FOLLOWED

1. **Subtle, not flashy** -- Small transforms (1-2px), muted shadows, low-opacity glows
2. **Tier-consistent coloring** -- Amber for LOCKED IN, Blue for TODAY, Teal for TOMORROW everywhere
3. **Progressive disclosure** -- Action buttons hidden until hover, reducing visual noise
4. **Easing curves** -- `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard) for smooth motion
5. **Touch-friendly** -- Actions always visible on touch devices via `@media (hover: none)`
6. **Performance** -- CSS-only animations, no JS repaints, hardware-accelerated transforms
7. **Dark theme native** -- All colors tuned for OLED-friendly dark backgrounds
8. **Existing variable system** -- Uses `var(--*)` tokens throughout for consistency
