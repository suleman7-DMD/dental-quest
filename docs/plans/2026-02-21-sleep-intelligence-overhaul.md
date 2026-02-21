# Sleep Intelligence Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Insights tab with a 14-section analytics dashboard and the Accuracy tab with a transparent, verifiable accuracy system.

**Architecture:** All new code goes into `js/stimcalc/history-calendar.js` (render + analytics functions) and `stimulant-elimination-calculator.html` (HTML containers + CSS). Data comes from existing `state.history`, `state.sleepDailyLogs`, `state.sleepHistory`. No new Firebase fields needed.

**Tech Stack:** Vanilla JS, inline HTML generation, CSS in HTML `<style>` block. No build system.

---

## Task 1: HTML — Replace Insights Tab Container

**Files:**
- Modify: `stimulant-elimination-calculator.html` lines 2667-2671

**Replace the current Insights tab HTML:**
```html
<!-- OLD: -->
<div id="siTabInsights" class="si-tab-content" style="display:none">
    <div id="siInsightsList">
        <p style="color:#b0b8c4; text-align:center; padding:20px;">Save predictions and log actual sleep to see insights.</p>
    </div>
</div>
```

**With new Insights tab containers (14 collapsible sections):**
```html
<div id="siTabInsights" class="si-tab-content" style="display:none">
    <div id="insightsContent">
        <div id="insKeyMetrics" class="ins-section ins-section--open"></div>
        <div id="insDoseResponse" class="ins-section"></div>
        <div id="insCaffeineImpact" class="ins-section"></div>
        <div id="insSleepPatterns" class="ins-section"></div>
        <div id="insModifierImpact" class="ins-section"></div>
        <div id="insDosingWindows" class="ins-section"></div>
        <div id="insCaffeineTiming" class="ins-section"></div>
        <div id="insSleepEfficiency" class="ins-section"></div>
        <div id="insPredictionReliability" class="ins-section"></div>
        <div id="insCircadianConsistency" class="ins-section"></div>
        <div id="insStimulantTrends" class="ins-section"></div>
        <div id="insRiskIndicators" class="ins-section"></div>
        <div id="insPersonalRecords" class="ins-section"></div>
        <div id="insResearchBenchmarks" class="ins-section"></div>
    </div>
</div>
```

---

## Task 2: HTML — Replace Accuracy Tab Container

**Files:**
- Modify: `stimulant-elimination-calculator.html` lines 2674-2726

**Replace the entire Accuracy tab HTML with:**
```html
<div id="siTabAccuracy" class="si-tab-content" style="display:none">
    <div id="accuracyContent">
        <div id="accOverallGrade"></div>
        <div id="accMethodology" class="ins-section"></div>
        <div id="accErrorDistribution" class="ins-section"></div>
        <div id="accDirectionalBias" class="ins-section"></div>
        <div id="accContextBreakdowns" class="ins-section"></div>
        <div id="accDataInventory" class="ins-section"></div>
        <div id="accInputVerification" class="ins-section"></div>
    </div>
</div>
```

---

## Task 3: CSS — Add Styles for New Sections

**Files:**
- Modify: `stimulant-elimination-calculator.html` — insert after line ~1053 (after `.si-cal-context__stat`)

**New CSS to add:**
```css
/* Insights collapsible sections */
.ins-section { margin-bottom: 8px; border-radius: 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.06); overflow: hidden; }
.ins-section-hdr { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; cursor: pointer; user-select: none; }
.ins-section-hdr:hover { background: rgba(255,255,255,0.03); }
.ins-section-title { font-weight: 600; font-size: 0.9em; color: #e6edf3; display: flex; align-items: center; gap: 8px; }
.ins-section-arrow { color: #6e7681; font-size: 0.8em; transition: transform 0.2s; }
.ins-section--open .ins-section-arrow { transform: rotate(180deg); }
.ins-section-body { display: none; padding: 0 14px 14px; }
.ins-section--open .ins-section-body { display: block; }

/* Metric rows */
.ins-metric-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.ins-metric-row:last-child { border-bottom: none; }
.ins-metric-label { font-size: 0.82em; color: #9ca3af; }
.ins-metric-value { font-size: 0.92em; font-weight: 600; color: #e6edf3; text-align: right; }

/* Comparison cards */
.ins-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.ins-compare-card { padding: 10px; border-radius: 8px; text-align: center; }
.ins-compare-card__label { font-size: 0.72em; color: #9ca3af; margin-bottom: 4px; }
.ins-compare-card__value { font-size: 1.2em; font-weight: 700; }
.ins-compare-card__sub { font-size: 0.72em; color: #6e7681; margin-top: 2px; }

/* Bucket bars (dose-response, error distribution) */
.ins-bucket { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.ins-bucket__label { font-size: 0.78em; color: #9ca3af; min-width: 72px; text-align: right; }
.ins-bucket__bar-wrap { flex: 1; height: 22px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; position: relative; }
.ins-bucket__bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; min-width: 2px; }
.ins-bucket__value { font-size: 0.78em; color: #b0b8c4; min-width: 60px; }

/* Data inventory table */
.ins-table-wrap { max-height: 400px; overflow-y: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
.ins-table { width: 100%; border-collapse: collapse; font-size: 0.78em; }
.ins-table th { position: sticky; top: 0; background: rgba(30,30,40,0.98); color: #9ca3af; text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: 600; }
.ins-table td { padding: 7px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #b0b8c4; }
.ins-table tr:hover td { background: rgba(255,255,255,0.03); }

/* Risk indicators */
.ins-risk-card { padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; display: flex; align-items: center; gap: 10px; }
.ins-risk-card__icon { font-size: 1.3em; }
.ins-risk-card__text { flex: 1; }
.ins-risk-card__label { font-size: 0.82em; color: #e6edf3; font-weight: 500; }
.ins-risk-card__detail { font-size: 0.75em; color: #9ca3af; }

/* Research benchmark bars */
.ins-benchmark { margin-bottom: 12px; }
.ins-benchmark__label { font-size: 0.78em; color: #9ca3af; margin-bottom: 4px; }
.ins-benchmark__bar { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; position: relative; overflow: visible; }
.ins-benchmark__fill { height: 100%; border-radius: 4px; }
.ins-benchmark__marker { position: absolute; top: -4px; width: 3px; height: 16px; background: #fff; border-radius: 2px; }
.ins-benchmark__range { display: flex; justify-content: space-between; font-size: 0.7em; color: #6e7681; margin-top: 2px; }

/* Methodology steps */
.ins-method-step { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.ins-method-step:last-child { border-bottom: none; }
.ins-method-num { width: 24px; height: 24px; border-radius: 50%; background: rgba(139,92,246,0.2); color: #a78bfa; display: flex; align-items: center; justify-content: center; font-size: 0.78em; font-weight: 700; flex-shrink: 0; }
.ins-method-text { font-size: 0.82em; color: #b0b8c4; line-height: 1.5; }
.ins-method-text code { background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px; font-size: 0.9em; color: #e6edf3; }

/* Overall accuracy hero (simplified) */
.acc-hero { text-align: center; padding: 16px; margin-bottom: 12px; border-radius: 12px; }
.acc-hero__value { font-size: 2.4em; font-weight: 700; }
.acc-hero__label { font-size: 0.82em; color: #b0b8c4; margin-top: 4px; }
.acc-hero__sub { font-size: 0.75em; color: #6e7681; margin-top: 2px; }
```

---

## Task 4: JS — Analytics Engine (Pure Data Functions)

**Files:**
- Modify: `js/stimcalc/history-calendar.js` — insert BEFORE the `renderPredictionInsights` function (before line 1813)

**Add these pure computation functions that all render functions will use:**

### `gatherAllDayData()` — Master data collector
Returns array of normalized day objects from all sources (history + sleepDailyLogs + sleepHistory), deduplicated by date, sorted newest first.

### `computeInsightsData()` — Aggregate analytics
Takes the gathered data and computes ALL analytics metrics in one pass:
- Key metrics (avgs, ratios, counts)
- Dose-response buckets
- Caffeine impact stats
- Weekday/weekend patterns
- Modifier impact comparisons
- Dosing window analysis
- Caffeine timing analysis
- Sleep efficiency scores
- Prediction reliability by context
- Circadian consistency metrics
- Stimulant load trends
- Risk indicators
- Personal records

### `computeAccuracyTransparency()` — Full accuracy breakdown
Returns the complete accuracy calculation with every intermediate step visible.

---

## Task 5: JS — Insights Tab Render Functions (14 sections)

**Files:**
- Modify: `js/stimcalc/history-calendar.js` — replace `renderPredictionInsights()` and `getInsightExplanation()`

Each section has its own render function: `renderInsKeyMetrics()`, `renderInsDoseResponse()`, etc.
A master `renderInsightsTab()` calls all 14.

---

## Task 6: JS — Accuracy Tab Render Functions (7 sections)

**Files:**
- Modify: `js/stimcalc/history-calendar.js` — replace `renderAccuracyDashboard()`

Each section has its own render function: `renderAccOverallGrade()`, `renderAccMethodology()`, etc.
A master `renderAccuracyTab()` calls all 7.

---

## Task 7: JS — Integration (Wire Up Tab Switching)

**Files:**
- Modify: `js/stimcalc/history-calendar.js` — update `switchSITab()` and `renderSleepIntelligence()`

Replace:
- `renderPredictionInsights()` calls → `renderInsightsTab()`
- `renderAccuracyDashboard()` calls → `renderAccuracyTab()`
- Remove `drawAccuracyTimeline` references

Also update `renderSleepIntelligence()` to call the new functions.

---

## Task 8: Verification

- Brace balance check on history-calendar.js
- Brace balance check on HTML
- Verify all 5 Firebase save guards still present
- Verify `recalculate()` still works (no references to removed functions)
- Verify all new HTML element IDs match JS getElementById calls
- Verify no `undefined` values could leak into Firebase
