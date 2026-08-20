# Stim Calc Revival Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 28 confirmed bugs in the Stimulant Elimination Calculator, replace the prediction model with the approved v2 design (auto-calibration, honest windowed output, binding-factor transparency, real caffeine cutoff, morning check-in), and cut the app back to basics (7 pages → 5, sauna/nicotine/inventory/week-glance/achievements removed).

**Architecture:** Vanilla JS, 12 modules under `js/stimcalc/`, no build system, no test framework. Verification = `node --check`, brace-balance counts, grep assertions, Playwright smoke tests. Firebase RTDB sync with 5 mandatory save guards. Phase 1 (Tasks 2–5) is four FILE-DISJOINT task groups that may run as parallel subagents. Phases 2–4 are sequential.

**Tech Stack:** Vanilla JS (ES2020), Firebase RTDB compat SDK, Canvas 2D, GitHub Pages deploy (push to `main` → live ~30s).

**Spec:** `docs/superpowers/specs/2026-08-19-stimcalc-revival-design.md` (approved). Bug numbers below refer to the spec's 28-bug ledger.

---

## GLOBAL RULES (every task)

1. **Surgical edits only.** Read the target function before editing. Never rewrite a whole file except where a task explicitly says "replace function wholesale."
2. **After every file edit, verify:**
   ```bash
   node --check js/stimcalc/<file>.js
   python3 -c "c=open('js/stimcalc/<file>.js').read(); print(c.count('{'), c.count('}'))"
   ```
   `node --check` must print nothing (exit 0). Brace counts must be equal (they are equal in every module today).
3. **Firebase guards are sacred.** `saveState()` and `saveStateImmediate()` in `firebase-sync.js` each have 5 guards (`pinValidated`, `isInitialLoad`, `hasLoadedFromCloud`, `isEmptyState(state)`, `state._dataLoaded`). Never remove or weaken one. Task 3 ADDS guards to `saveToFirebase()`.
4. **Date traps:** never `new Date('YYYY-MM-DD')` (use `parseLocalDate`), never `.toISOString().slice(0,10)` (use `getLocalDateString`). Never write `Date.now()` into `state._version`.
5. **Cross-app contract:** `state.projectedSleepTime` and `state.projectedSleepMinutes` writes in `runCalculations()` (init.js ~:128-129) MUST survive every change — body-comp-tracker reads them.
6. **Firebase collections are objects, not arrays.** Read with `getValues()`, count with `getCount()`.
7. **Commit after every task** with trailer:
   ```
   Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
   ```
8. **All work happens on branch `stimcalc-revival`** (Task 1). Merge to `main` only after Task 15 QA passes.
9. Line numbers in this plan are anchors from the audit read (2026-08-19). If a line moved, locate by the quoted code, not the number.

---

## PHASE 0 — SAFETY NET

### Task 1: Create working branch

**Files:** none (git only)

- [ ] **Step 1: Branch**
```bash
cd /Users/suleman/dental-quest
git checkout -b stimcalc-revival
```
Expected: `Switched to a new branch 'stimcalc-revival'`

- [ ] **Step 2: Confirm clean stimcalc tree**
```bash
git status --short -- stimulant-elimination-calculator.html js/stimcalc/
```
Expected: no output (stimcalc files unmodified; unrelated dirty files elsewhere in the repo are fine and must NOT be committed by any task in this plan).

---

## PHASE 1 — CORRECTNESS WAVE

Tasks 2–5 are file-disjoint and may run as four parallel subagents:

| Group | Task | Files owned |
|-------|------|-------------|
| A | 2 | `js/stimcalc/pharma-engine.js`, `js/stimcalc/circadian.js` |
| B | 3 | `js/stimcalc/firebase-sync.js` |
| C | 4 | `js/stimcalc/history-calendar.js`, `js/stimcalc/graph.js` |
| D | 5 | `js/stimcalc/init.js`, `js/stimcalc/ui-sections.js`, `js/stimcalc/med-caffeine.js`, `stimulant-elimination-calculator.html` |

No task may touch a file owned by another group. Each group commits only its own files.

### Task 2 (Group A): pharma-engine.js + circadian.js — bugs 7, 8, 9, 17, 18

**Files:**
- Modify: `js/stimcalc/circadian.js` (~:11-16, circular-mean loop ~:55-70)
- Modify: `js/stimcalc/pharma-engine.js` (`getVitaminCStatus` :87-105, `getEffectiveThreshold` :247, `calculateAmpLoad` :391, `findAmpClearTime` :500-561, `findCaffClearTime` :564-589)

- [ ] **Step 1: Bug 18 — add `numOr()` NaN guard helper**

At the top of `pharma-engine.js` (after any header comment, before the first function):

```javascript
function numOr(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
```

Then guard every settings read in this file:
- `getEffectiveThreshold()` (~:248): `let baseThreshold = numOr(state.settings.sleepThreshold, 14);`
- `calculateAmpLoad()` (~:393): `const baseHalfLife = numOr(state.settings.ampHalfLife, 11);`
- `findCaffClearTime()` (~:565): `const threshold = numOr(state.settings.caffThreshold, 25);`
- `calculateCaffLoad()`: caffeine half-life read → `numOr(state.settings.caffHalfLife, 5)`

Grep for any remaining unguarded reads and wrap them too:
```bash
grep -n "state\.settings\." js/stimcalc/pharma-engine.js
```

- [ ] **Step 2: Bug 17 — sanitize legacy VitC date strings**

Add below `numOr()`:

```javascript
function sanitizeModifierDate(dateStr) {
    // Legacy states stored 'today'/'tomorrow' literals; parseLocalDate() would NaN on them.
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const today = new Date();
    if (dateStr === 'tomorrow') {
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        return getLocalDateString(t);
    }
    return getLocalDateString(today);
}
```

Apply at EVERY read of `state.modifiers.vitaminC.date` in `pharma-engine.js` (`getVitaminCTimeMinutes`, `isVitaminCEffective`, `getVitaminCStatus` — find with `grep -n "vitaminC.date" js/stimcalc/pharma-engine.js`): replace direct use with `const vitcDate = sanitizeModifierDate(state.modifiers.vitaminC.date);`.

- [ ] **Step 3: Bug 9 — future IR spikes in `findAmpClearTime()`**

In the spike-collection loop (~:512-523) the code currently collects only DR release times (`const drTime = effectiveDoseTime + 240; if (drTime > now) drReleaseTimes.push(drTime);`). Rename the array `drReleaseTimes` → `spikeTimes` (all references in the function) and ALSO collect future IR onsets:

```javascript
const drTime = effectiveDoseTime + 240;
if (drTime > now) spikeTimes.push(drTime);
if (effectiveDoseTime > now) spikeTimes.push(effectiveDoseTime); // future IR onset also re-spikes load
```

The existing 10-iteration re-spike verification loop then covers both spike kinds unchanged.

- [ ] **Step 4: Bug 8 — re-spike protection in `findCaffClearTime()`**

`findCaffClearTime()` (~:564-589) is a plain binary search with no protection against future caffeine doses. Restructure it to mirror the amp function's spike architecture:

```javascript
function findCaffClearTime() {
    const threshold = numOr(state.settings.caffThreshold, 25);
    const now = getCurrentMinutes();
    const today = getLocalDateString(new Date());

    // Collect future same-day caffeine intake times (re-spike points)
    const spikeTimes = [];
    getValues(state.caffeine).forEach(c => {
        const cDate = c.date || today;
        if (cDate !== today) return;
        const t = timeToMinutes(c.time);
        if (t > now) spikeTimes.push(t);
    });
    spikeTimes.sort((a, b) => a - b);

    let searchStart = now;
    for (let iteration = 0; iteration < 10; iteration++) {
        if (calculateCaffLoad(searchStart) <= threshold) {
            // Verify no future spike pushes load back over threshold
            const violator = spikeTimes.find(t => t > searchStart && calculateCaffLoad(t + 1) > threshold);
            if (!violator) return searchStart === now ? null : searchStart;
            searchStart = violator + 1;
            continue;
        }
        // Binary search for crossing point within 24h of searchStart
        let lo = searchStart, hi = searchStart + 1440;
        if (calculateCaffLoad(hi) > threshold) return hi; // still not clear in 24h — cap
        for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            if (calculateCaffLoad(mid) > threshold) lo = mid; else hi = mid;
        }
        const candidate = Math.ceil(hi);
        const violator = spikeTimes.find(t => t > candidate && calculateCaffLoad(t + 1) > threshold);
        if (!violator) return candidate;
        searchStart = violator + 1;
    }
    return searchStart; // bounded fallback
}
```

BEFORE replacing: read the existing function and preserve its exact return-value contract (grep call sites: `grep -rn "findCaffClearTime" js/stimcalc/`). The existing function returns `null` when already clear — the rewrite above preserves that.

- [ ] **Step 5: Bug 7 — exclude today's typed wake from circular mean**

In `circadian.js` `analyzeCircadianPhase()` (~:11-16), today's entry is pushed with `wakeMinutes: timeToMinutes(state.wakeTime)` which pollutes the 7-day historical circular mean with a value the user may not have updated. Change today's push to:

```javascript
wakeTimes.push({
    date: todayStr,
    wakeMinutes: null,   // today's typed wake is a live input, not history — excluded from circular mean
    hoursSlept: state.hoursSleptLastNight
});
```

Then in the circular-mean computation (~:55-70), filter: `const validWakes = wakeTimes.filter(w => w.wakeMinutes !== null && Number.isFinite(w.wakeMinutes));` and compute the atan2 mean over `validWakes`. Keep the existing `< 1 data` early-return (it falls back to `state.wakeTime`) but base it on `validWakes.length`. Any `hoursSlept` averaging in the same function keeps using the FULL `wakeTimes` array (today's sleep amount is real data).

- [ ] **Step 6: Verify + commit**

```bash
node --check js/stimcalc/pharma-engine.js && node --check js/stimcalc/circadian.js
python3 -c "c=open('js/stimcalc/pharma-engine.js').read(); print(c.count('{'), c.count('}'))"
python3 -c "c=open('js/stimcalc/circadian.js').read(); print(c.count('{'), c.count('}'))"
grep -c "numOr(" js/stimcalc/pharma-engine.js   # expect >= 5
grep -n "drReleaseTimes" js/stimcalc/pharma-engine.js   # expect NO output (renamed)
git add js/stimcalc/pharma-engine.js js/stimcalc/circadian.js
git commit -m "stimcalc P1-A: NaN guards, VitC date sanitize, amp/caff re-spike protection, circadian mean fix (bugs 7,8,9,17,18)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 3 (Group B): firebase-sync.js — bugs 3, 11(reload), 12, 13, 14, 23

**Files:**
- Modify: `js/stimcalc/firebase-sync.js` only (`mergeRemoteState` :134-161, `saveToFirebase` :353-389, `loadFromFirebase` :391-414+, realtime listener :505-549, `forceCloudSync` :568-600, `restoreCheckpoint` :746, `importAndRestoreDirectly` :966, `forceUploadToCloud` :1014, `beforeunload` :1225-1230, `saveState` :1280-1292, `saveStateImmediate` :1295-1345)

- [ ] **Step 1: Bug 3 part 1 — stamp `_lastModified` on every local save**

In BOTH `saveState()` (debounce body ~:1280) and `saveStateImmediate()` (~:1295), immediately BEFORE the `safeLocalStorageSet(...)` / localStorage write line, add:

```javascript
state._lastModified = new Date().toISOString();
```

(After the 5 guards, so an empty/unloaded state never gets stamped.)

- [ ] **Step 2: Bug 3 part 2 — preserve `_lastModified` through merge**

`mergeRemoteState(remoteData)` (~:134-161) rebuilds state field-by-field and drops unknown fields. Add to the rebuilt object:

```javascript
_lastModified: remote._lastModified || state._lastModified || null,
```

(where `remote` is the function's normalized `remoteData.state || remoteData` local). Confirm the rebuilt object still ends with `_dataLoaded: true`.

- [ ] **Step 3: Bug 3 part 3 — newer-local-wins in `loadFromFirebase()`**

`loadFromFirebase()` (~:391-414) currently calls `mergeRemoteState(data.state)` unconditionally (remote-wins), so an edit made in the beforeunload window is lost on next load. Wrap the merge:

```javascript
const remoteStamp = (data.state && data.state._lastModified) || null;
const localStamp = state._lastModified || null;
if (localStamp && remoteStamp && localStamp > remoteStamp && !isEmptyState(state)) {
    // Local is newer than cloud (e.g. beforeunload-only save) — keep local, push it up.
    state._dataLoaded = true;
    setTimeout(() => saveToFirebase(), 500);
} else {
    mergeRemoteState(data.state);
}
```

ISO strings compare lexicographically, so `>` is a valid newer-than test. Keep every flag assignment that follows in the function (`isInitialLoad = false`, `hasLoadedFromCloud = true`, render calls) OUTSIDE this branch so both paths run them.

- [ ] **Step 4: Bug 13 — seed the conflict-check timestamp**

At the end of the successful-load path in `loadFromFirebase()` (both branches from Step 3), add:

```javascript
lastSyncTimestamp = Date.now();
localChangesSinceLastSync = false;
```

Then verify `forceCloudSync()`'s conflict check (~:590) reads `localChangesSinceLastSync && lastSyncTimestamp` — with the seed it is now live. Do not change the check itself.

- [ ] **Step 5: Bug 14 — full 5-guard set on `saveToFirebase()`**

`saveToFirebase()` (~:353) has only 3 guards (isInitialLoad, hasLoadedFromCloud, isEmptyState). Add the missing two, matching the other save functions' order:

```javascript
if (!pinValidated) return false;
// ...existing three guards...
if (!state._dataLoaded) return false;
```

- [ ] **Step 6: Bug 12 — realtime listener must not clobber focused inputs**

In the realtime listener handler (~:505-549), add a file-scope helper near the listener:

```javascript
function setIfNotFocused(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (document.activeElement === el) return; // user is typing here — don't clobber
    el.value = val;
}
```

Replace direct writes `document.getElementById('wakeTime').value = ...` and the `hoursSlept` equivalent (~:532-534) with `setIfNotFocused('wakeTime', ...)` / `setIfNotFocused('hoursSlept', ...)` (verify the exact hours-slept element id by reading the surrounding code). Guard the med/caffeine re-renders:

```javascript
const active = document.activeElement;
const editingEntries = active && active.closest && (active.closest('#medEntries') || active.closest('#caffeineEntries'));
if (!editingEntries) { renderMedEntries(); renderCaffeineEntries(); }
```

(adapt to the render calls actually present in the handler). Additionally, skip the whole merge when local is newer and unsynced:

```javascript
if (localChangesSinceLastSync && state._lastModified && data.state && data.state._lastModified
    && state._lastModified > data.state._lastModified) {
    return; // our own unpushed edit is newer — debounced save will push it
}
```

- [ ] **Step 7: Bug 23 — no `Date.now()` in `_version`**

Three sites write wall-clock into `_version`, which makes a restored/forced state look "newest forever":
- `restoreCheckpoint` ~:746: `state._version = Date.now();` → `state._version = (state._version || 0) + 1;`
- `importAndRestoreDirectly` ~:966: `_version: Date.now()` → `_version: (data._version || 0) + 1`
- `forceUploadToCloud` ~:1014: `state._version = Date.now();` → `state._version = (state._version || 0) + 1;`

- [ ] **Step 8: Bug 11 (reload half) — re-clean stale meds after cloud merge**

`cleanupOldMedications()` runs in `init()` BEFORE Firebase load, so a merge can reintroduce yesterday's doses into today's list. After `mergeRemoteState(...)` in BOTH `loadFromFirebase()` and the realtime handler, add:

```javascript
if (typeof cleanupOldMedications === 'function') cleanupOldMedications();
```

Read `cleanupOldMedications()` in init.js first (read-only — do NOT edit init.js in this task) to confirm behavior; any internal `saveState()` it makes is a safe no-op until flags are set. Place the call BEFORE the render calls in each handler.

- [ ] **Step 9: Verify + commit**

```bash
node --check js/stimcalc/firebase-sync.js
python3 -c "c=open('js/stimcalc/firebase-sync.js').read(); print(c.count('{'), c.count('}'))"
# Guard integrity: each save fn must reference all 5 guard identifiers
for fn in saveState saveStateImmediate saveToFirebase; do echo "== $fn"; awk "/function $fn\(/,/^}/" js/stimcalc/firebase-sync.js | grep -oE "pinValidated|isInitialLoad|hasLoadedFromCloud|isEmptyState|_dataLoaded" | sort -u; done
grep -c "_version = Date.now()" js/stimcalc/firebase-sync.js   # expect 0
grep -c "_version: Date.now()" js/stimcalc/firebase-sync.js    # expect 0
grep -c "_lastModified" js/stimcalc/firebase-sync.js           # expect >= 6
git add js/stimcalc/firebase-sync.js
git commit -m "stimcalc P1-B: last-write-wins load, focus-safe realtime, full saveToFirebase guards, monotonic _version (bugs 3,11r,12,13,14,23)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4 (Group C): history-calendar.js + graph.js — bugs 4(defense), 15, 19, 20, 21a

**Files:**
- Modify: `js/stimcalc/history-calendar.js` (`autoPopulateFeedback` :94-134, `cleanupHistory` :332, Input Verification render :1198-1199)
- Modify: `js/stimcalc/graph.js` (`drawGraph` :5-40, `_drawSleepGraphToCanvas` :565)

- [ ] **Step 1: Bug 15 — normalize `sleepHistory` dual shape**

At the TOP of `autoPopulateFeedback()` (~:94), before any entry reads:

```javascript
Object.keys(state.sleepHistory || {}).forEach(k => {
    const v = state.sleepHistory[k];
    if (typeof v === 'number') state.sleepHistory[k] = { hoursSlept: v, wakeTime: null };
});
```

Keep the existing dual-shape read at ~:109-112 as belt-and-suspenders — do not delete it.

- [ ] **Step 2: Bug 20 — UTC trap in `cleanupHistory`**

~:332: replace `cutoffDate.toISOString().split('T')[0]` with `getLocalDateString(cutoffDate)`.

- [ ] **Step 3: Bug 21a — escape med/caffeine strings in Input Verification**

~:1198-1199: wrap the interpolated user strings in `escapeHtml()`, e.g. `escapeHtml(m.dose + 'mg @ ' + m.time)` and the caffeine equivalent (`c.name`, `c.time`). Grep the surrounding template for any other raw `${...}` of user-entered fields and escape those too.

- [ ] **Step 4: Bug 19 — DPR-scale `drawGraph()`**

In `drawGraph()` (~:5-40), replace the canvas sizing block (`canvas.width = rect.width - 40; canvas.height = ...`) with:

```javascript
const dpr = window.devicePixelRatio || 1;
const cssW = rect.width - 40;
const cssH = rect.height - 40;
canvas.width = cssW * dpr;
canvas.height = cssH * dpr;
canvas.style.width = cssW + 'px';
canvas.style.height = cssH + 'px';
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
const width = cssW;
const height = cssH;
```

All subsequent drawing in the function must use `width`/`height` (CSS pixels), NOT `canvas.width`/`canvas.height`. Then:

```bash
grep -n "canvas.width\|canvas.height" js/stimcalc/graph.js
```

For every LATER read of `canvas.width`/`canvas.height` in this file (tooltip mousemove handlers recompute `graphWidth`/`pointSpacing`), convert to CSS-pixel dims: `const cw = canvas.width / (window.devicePixelRatio || 1);` (or reuse `canvas.getBoundingClientRect().width`, matching how the mouse coords are computed in that handler — read the handler and keep coordinate spaces consistent).

- [ ] **Step 5: Bug 4 (defensive half) — null-safe sleep graph**

`_drawSleepGraphToCanvas` (~:565): `if (data.length < 2) return;` throws when `data` is `undefined` (the current calendar crash). Change to:

```javascript
if (!data || !Array.isArray(data) || data.length < 2) return;
```

(The call-site half of bug 4 is fixed in Task 5 — init.js is owned by Group D.)

- [ ] **Step 6: Verify + commit**

```bash
node --check js/stimcalc/history-calendar.js && node --check js/stimcalc/graph.js
python3 -c "c=open('js/stimcalc/history-calendar.js').read(); print(c.count('{'), c.count('}'))"
python3 -c "c=open('js/stimcalc/graph.js').read(); print(c.count('{'), c.count('}'))"
grep -c "toISOString" js/stimcalc/history-calendar.js   # expect 0 (or comment-only)
grep -c "devicePixelRatio" js/stimcalc/graph.js          # expect >= 1
git add js/stimcalc/history-calendar.js js/stimcalc/graph.js
git commit -m "stimcalc P1-C: sleepHistory shape normalize, local-date cutoff, XSS escapes, DPR canvas, null-safe graph (bugs 4d,15,19,20,21a)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5 (Group D): init.js + ui-sections.js + med-caffeine.js + HTML — bugs 2, 4(callsite), 11(STACKED), 21b, 22, 25, 28

**Files:**
- Modify: `js/stimcalc/init.js` (`scNavigate` calendar branch :1192, `updateRecommendations` :528-539)
- Modify: `js/stimcalc/ui-sections.js` (`toggleModifier` :367-390)
- Modify: `js/stimcalc/med-caffeine.js` (`renderMedEntries` :88-121, `updateStackingWarning` :136-149, `renderCaffeineEntries` :261)
- Modify: `stimulant-elimination-calculator.html` (script tag :4807, mobile CSS)

- [ ] **Step 1: Bug 2 — cache-bust firebase-sync.js NOW**

html ~:4807: the firebase-sync.js script tag still says `?v=20260315` while other tags are newer — users are running a STALE sync module. Change it to `?v=20260819`. (Task 13 bumps all remaining tags; this one cannot wait because Group B is changing the file today.)

- [ ] **Step 2: Bug 4 (callsite half) — fix the calendar crash**

init.js ~:1192 (inside `scNavigate('calendar')` branch) calls `drawSleepPerformanceGraph()` with NO argument → `data` undefined → TypeError, calendar page dead. Read `renderSleepPerformance()` in history-calendar.js first to confirm it gathers the data and calls `drawSleepPerformanceGraph(data)` internally; then replace the bare call with:

```javascript
if (typeof renderSleepPerformance === 'function') renderSleepPerformance();
```

If `renderSleepPerformance` turns out NOT to be the data-feeding caller, grep for the function that actually assembles the sleep-performance dataset (`grep -n "drawSleepPerformanceGraph(" js/stimcalc/*.js`) and call that instead. The bare no-arg call must be gone.

- [ ] **Step 3: Bug 11 (STACKED half) — today-only stacking logic**

med-caffeine.js `renderMedEntries()` (~:114) marks every med after index 0 as `⚠️ STACKED`, including yesterday's doses after a cloud merge. Fix — before the entry loop (where `meds` is the already-sorted `getValues(state.medications)` array the loop uses):

```javascript
const today = getLocalDateString(new Date());
const todayMedIds = meds.filter(m => (m.date || today) === today).map(m => m.id);
```

Badge condition becomes:

```javascript
${todayMedIds.indexOf(med.id) > 0 ? '<span class="stacking-warning">⚠️ STACKED</span>' : ''}
```

In `updateStackingWarning()` (~:136-149), filter to today's meds the same way before counting:

```javascript
const today = getLocalDateString(new Date());
const todaysMeds = getValues(state.medications).filter(m => (m.date || today) === today);
```

and base the warning on `todaysMeds.length`.

- [ ] **Step 4: Bug 21b — escape caffeine name**

med-caffeine.js ~:261: `${caff.name}` → `${escapeHtml(caff.name)}`.

- [ ] **Step 5: Bug 25 — delete the fake noon caffeine cutoff**

init.js `updateRecommendations()` ~:528-539: the block gated by `if (now < noon && getCount(state.caffeine) === 0)` emits a fabricated "stop caffeine by +3 hours" card. DELETE the entire block (the real computed cutoff ships in Task 10). Leave surrounding cards intact.

- [ ] **Step 6: Bug 28 — whitelist `toggleModifier` names**

ui-sections.js `toggleModifier(checkbox, modifierName)` (~:367): unknown names currently create `state.modifiers['undefined'] = {active:false}` garbage. Add at the top:

```javascript
const KNOWN_MODIFIERS = ['vitaminC', 'heavyLift', 'sauna'];
if (!KNOWN_MODIFIERS.includes(modifierName)) return;
```

(Task 9 updates this list to `['vitaminC', 'workout']` when the chip set changes — the whitelist mechanism itself is what this step ships.)

- [ ] **Step 7: Bug 22 — mobile 390px clipping**

In the html `<style>` block, add at the end of the stylesheet:

```css
@media (max-width: 420px) {
    .hero-time { font-size: clamp(2.2rem, 12vw, 3.5rem); }
    .med-entry, .sc-med-entry { flex-wrap: wrap; }
    .med-entry input[type="date"], .sc-med-entry input[type="date"] { max-width: 100%; min-width: 0; }
}
```

Before committing, verify the selector names against the actual markup (`grep -n "hero-time\|sc-med-entry" stimulant-elimination-calculator.html | head`) and adjust to the real classes if they differ.

- [ ] **Step 8: Verify + commit**

```bash
node --check js/stimcalc/init.js && node --check js/stimcalc/ui-sections.js && node --check js/stimcalc/med-caffeine.js
for f in init ui-sections med-caffeine; do python3 -c "c=open('js/stimcalc/$f.js').read(); print('$f', c.count('{'), c.count('}'))"; done
grep -n "firebase-sync.js?v=" stimulant-elimination-calculator.html   # expect ?v=20260819
grep -c "drawSleepPerformanceGraph()" js/stimcalc/init.js             # expect 0
git add js/stimcalc/init.js js/stimcalc/ui-sections.js js/stimcalc/med-caffeine.js stimulant-elimination-calculator.html
git commit -m "stimcalc P1-D: calendar crash fix, today-only STACKED, XSS escape, kill fake noon cutoff, modifier whitelist, mobile CSS, sync cache-bust (bugs 2,4c,11s,21b,22,25,28)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## PHASE 2 — MODEL V2 (sequential; spec D1–D7)

### Task 6: Auto-calibration module (spec D1)

**Files:**
- Create: `js/stimcalc/calibration.js`
- Modify: `js/stimcalc/state.js` (`getDefaultState()`)
- Modify: `js/stimcalc/firebase-sync.js` (`mergeRemoteState`)
- Modify: `js/stimcalc/history-calendar.js` (`autoPopulateFeedback` tail, `getCalibrationRecommendation`, delete `suggestCalibration`, Directional Bias copy :1094-1096)
- Modify: `stimulant-elimination-calculator.html` (new script tag)

- [ ] **Step 1: State — add `calibration` object**

In `getDefaultState()` (state.js :30-129), add as a sibling of `settings`:

```javascript
calibration: {
    autoFit: true,             // master switch; false = frozen
    fittedThreshold: null,     // mg; null = use settings.sleepThreshold
    lastFitDate: null,         // YYYY-MM-DD of last fit run (once per day)
    lastAdjustment: 0,         // mg delta applied by last fit (for the card)
    lastFitNights: 0,          // nights used in last fit
    manualPauseUntil: null,    // YYYY-MM-DD; manual slider edit pauses auto-fit 7 days
    fittedCaffHalfLife: null   // hours; null = use settings.caffHalfLife
},
```

**Do NOT add `calibration` to `isEmptyState()`** — it is auto-generated data and must never make an empty state look real. No `Date.now()` anywhere in defaults.

- [ ] **Step 2: Create `js/stimcalc/calibration.js`**

```javascript
// ============================================================
// AUTO-CALIBRATION (model v2, spec D1)
// Nightly decay-weighted fit of the sleep threshold from
// projected-vs-actual sleep onset deltas. 66 min ≈ 1 mg
// (one amp half-life ≈ 11h moves load by factor 2; local
// slope near threshold ≈ threshold*ln2/11h ≈ 1mg per 66min).
// ============================================================

const CALIBRATION = {
    MIN_NIGHTS: 5,
    LOOKBACK_NIGHTS: 21,
    DECAY: 0.9,               // weight = 0.9^ageDays
    MIN_PER_MG: 66,
    MAX_STEP_MG: 1,           // per-day clamp
    THRESHOLD_MIN: 8,
    THRESHOLD_MAX: 22,
    MANUAL_PAUSE_DAYS: 7,
    CAFF_MIN_NIGHTS: 10,      // caffeine-binding nights required
    CAFF_LOOKBACK: 30,
    CAFF_STEP_H: 0.25,
    CAFF_HL_MIN: 3,
    CAFF_HL_MAX: 8,
    CAFF_BIAS_MIN: 15         // |avgDelta| minutes before HL moves
};

function getActiveBaseThreshold() {
    const c = state.calibration || {};
    if (c.autoFit && Number.isFinite(c.fittedThreshold) && c.fittedThreshold !== null) {
        return c.fittedThreshold;
    }
    return numOr(state.settings.sleepThreshold, 14);
}

function getActiveCaffHalfLife() {
    const c = state.calibration || {};
    if (c.autoFit && Number.isFinite(c.fittedCaffHalfLife) && c.fittedCaffHalfLife !== null) {
        return c.fittedCaffHalfLife;
    }
    return numOr(state.settings.caffHalfLife, 5.5);
}

// Gather last-N nights with both prediction and actual; newest first.
function getCalibrationNights(lookback) {
    const entries = getValues(state.history)
        .filter(e => e && e.date && Number.isFinite(e.deltaMinutes))
        .sort((a, b) => b.date.localeCompare(a.date));
    return entries.slice(0, lookback);
}

// Shared math: decay-weighted signed delta over the lookback window.
// Positive avgDelta = user fell asleep LATER than predicted = model too optimistic.
function computeCalibrationFit() {
    const nights = getCalibrationNights(CALIBRATION.LOOKBACK_NIGHTS);
    if (nights.length < CALIBRATION.MIN_NIGHTS) {
        return { eligible: false, nights: nights.length, avgDelta: null, suggestedStep: 0 };
    }
    const newest = nights[0].date;
    const [ny, nm, nd] = newest.split('-').map(Number);
    const newestDate = new Date(ny, nm - 1, nd);
    let wSum = 0, dSum = 0;
    nights.forEach(e => {
        const [y, m, d] = e.date.split('-').map(Number);
        const ageDays = Math.max(0, Math.round((newestDate - new Date(y, m - 1, d)) / 86400000));
        const w = Math.pow(CALIBRATION.DECAY, ageDays);
        wSum += w;
        dSum += w * e.deltaMinutes;
    });
    const avgDelta = wSum > 0 ? dSum / wSum : 0;
    const rawStep = avgDelta / CALIBRATION.MIN_PER_MG;
    const step = Math.max(-CALIBRATION.MAX_STEP_MG, Math.min(CALIBRATION.MAX_STEP_MG, rawStep));
    return { eligible: true, nights: nights.length, avgDelta: avgDelta, suggestedStep: step };
}

// Runs once per local date (from autoPopulateFeedback / morning check-in).
function runAutoCalibration() {
    if (!state.calibration) return;
    const c = state.calibration;
    const today = getLocalDateString(new Date());
    if (c.lastFitDate === today) return;                       // once a day
    if (!c.autoFit) return;                                    // frozen
    if (c.manualPauseUntil && c.manualPauseUntil >= today) return; // manual edit pause

    const fit = computeCalibrationFit();
    if (!fit.eligible) return;

    const prev = Number.isFinite(c.fittedThreshold) && c.fittedThreshold !== null
        ? c.fittedThreshold
        : numOr(state.settings.sleepThreshold, 14);
    // Positive delta (slept later than predicted) → model cleared too early → LOWER threshold.
    const fitted = Math.max(CALIBRATION.THRESHOLD_MIN,
        Math.min(CALIBRATION.THRESHOLD_MAX, prev - fit.suggestedStep));

    c.fittedThreshold = Math.round(fitted * 10) / 10;
    c.lastAdjustment = Math.round((c.fittedThreshold - prev) * 10) / 10;
    c.lastFitNights = fit.nights;
    c.lastFitDate = today;

    fitCaffHalfLife();
}

// Caffeine HL second-parameter fit: only trains on nights where
// caffeine was the binding factor (stored on history entries by Task 8).
function fitCaffHalfLife() {
    const c = state.calibration;
    const caffNights = getCalibrationNights(CALIBRATION.CAFF_LOOKBACK)
        .filter(e => e.bindingFactor === 'caffeine');
    if (caffNights.length < CALIBRATION.CAFF_MIN_NIGHTS) return;
    const avgDelta = caffNights.reduce((s, e) => s + e.deltaMinutes, 0) / caffNights.length;
    if (Math.abs(avgDelta) < CALIBRATION.CAFF_BIAS_MIN) return;
    const prev = Number.isFinite(c.fittedCaffHalfLife) && c.fittedCaffHalfLife !== null
        ? c.fittedCaffHalfLife
        : numOr(state.settings.caffHalfLife, 5.5);
    // Slept later than predicted on caffeine-bound nights → caffeine lingers longer → raise HL.
    const step = avgDelta > 0 ? CALIBRATION.CAFF_STEP_H : -CALIBRATION.CAFF_STEP_H;
    c.fittedCaffHalfLife = Math.max(CALIBRATION.CAFF_HL_MIN,
        Math.min(CALIBRATION.CAFF_HL_MAX, Math.round((prev + step) * 100) / 100));
}

// ---- Calibration card (Accuracy page) ----
function renderCalibrationCard() {
    const el = document.getElementById('calibrationCard');
    if (!el) return;
    const c = state.calibration || {};
    const fit = computeCalibrationFit();
    const active = getActiveBaseThreshold();
    const paused = c.manualPauseUntil && c.manualPauseUntil >= getLocalDateString(new Date());
    let statusLine;
    if (!c.autoFit) statusLine = 'Auto-fit is <strong>frozen</strong> — using manual threshold.';
    else if (paused) statusLine = 'Paused until ' + escapeHtml(c.manualPauseUntil) + ' (manual threshold edit).';
    else if (!fit.eligible) statusLine = 'Learning — needs ' + (CALIBRATION.MIN_NIGHTS - fit.nights) + ' more logged nights.';
    else statusLine = 'Fitting nightly from your last ' + fit.nights + ' logged nights.';
    const adj = c.lastAdjustment || 0;
    const adjTxt = adj === 0 ? 'no change' : (adj > 0 ? '+' : '') + adj + ' mg';
    el.innerHTML =
        '<div class="sc-cal-value">Threshold: <strong>' + active.toFixed(1) + ' mg</strong>'
        + (c.autoFit && c.fittedThreshold !== null ? ' <span class="sc-cal-tag">auto-fit</span>' : '') + '</div>'
        + '<div class="sc-cal-status">' + statusLine + '</div>'
        + '<div class="sc-cal-last">Last adjustment: ' + adjTxt + ' (' + (c.lastFitNights || 0) + ' nights)</div>'
        + (c.fittedCaffHalfLife !== null ? '<div class="sc-cal-caff">Caffeine half-life fitted: ' + c.fittedCaffHalfLife + ' h</div>' : '')
        + '<div class="sc-cal-actions">'
        + '<label><input type="checkbox" id="calFreezeToggle" ' + (c.autoFit ? '' : 'checked') + ' onchange="calToggleFreeze(this)"> Freeze auto-fit</label> '
        + '<button class="sc-btn-sm" onclick="calResetFit()">Reset fit</button>'
        + '</div>';
}

function calToggleFreeze(cb) {
    state.calibration.autoFit = !cb.checked;
    renderCalibrationCard();
    recalculate();
    saveState();
}

function calResetFit() {
    showCustomConfirm('Reset auto-calibration? The fitted threshold and caffeine half-life will be cleared and relearned.', function() {
        state.calibration.fittedThreshold = null;
        state.calibration.fittedCaffHalfLife = null;
        state.calibration.lastAdjustment = 0;
        state.calibration.lastFitNights = 0;
        state.calibration.lastFitDate = null;
        renderCalibrationCard();
        recalculate();
        saveState();
        showToast('Calibration reset');
    });
}

// ---- Morning check-in (Dashboard strip; spec D5) ----
function renderMorningCheckin() {
    const el = document.getElementById('morningCheckin');
    if (!el) return;
    const today = getLocalDateString(new Date());
    const log = (state.sleepDailyLogs || {})[today];
    if (log && log.checkedIn) {
        el.innerHTML = '<div class="sc-checkin-done">✓ Checked in — slept ' + escapeHtml(String(log.actualSleep ?? '?')) + 'h</div>';
        return;
    }
    el.innerHTML =
        '<div class="sc-checkin-row">'
        + '<span class="sc-checkin-label">Morning check-in:</span> '
        + 'woke <input type="time" id="checkinWake" value="' + escapeHtml(state.wakeTime || '08:00') + '"> '
        + 'after <input type="number" id="checkinHours" min="0" max="14" step="0.5" value="' + escapeHtml(String(state.hoursSleptLastNight ?? 7)) + '"> h '
        + '<button class="sc-btn-sm" onclick="confirmMorningCheckin()">Confirm</button>'
        + '</div>';
}

function confirmMorningCheckin() {
    const wakeEl = document.getElementById('checkinWake');
    const hrsEl = document.getElementById('checkinHours');
    if (!wakeEl || !hrsEl) return;
    const wake = wakeEl.value;
    const hrs = Number(hrsEl.value);
    if (!wake || !Number.isFinite(hrs) || hrs < 0 || hrs > 14) { showToast('Enter a valid wake time and hours', 'error'); return; }
    const today = getLocalDateString(new Date());

    state.wakeTime = wake;
    state.hoursSleptLastNight = hrs;
    state.sleepHistory = state.sleepHistory || {};
    state.sleepHistory[today] = { hoursSlept: hrs, wakeTime: wake };
    state.sleepDailyLogs = state.sleepDailyLogs || {};
    state.sleepDailyLogs[today] = Object.assign({}, state.sleepDailyLogs[today] || {}, {
        actualSleep: hrs, wakeTime: wake, checkedIn: true, source: 'checkin'
    });

    if (typeof autoPopulateFeedback === 'function') autoPopulateFeedback();
    runAutoCalibration();
    const wakeInput = document.getElementById('wakeTime');
    if (wakeInput) wakeInput.value = wake;
    const hrsInput = document.getElementById('hoursSlept');
    if (hrsInput) hrsInput.value = hrs;
    renderMorningCheckin();
    recalculate();
    saveState();
    showToast('Checked in — calibration updated');
}
```

**Note:** `getCalibrationNights` reads `state.history` — verify the actual collection name used by `saveDay()`/`renderHistory()` in history-calendar.js (it is the archived-days collection whose entries carry `date`, `deltaMinutes`, `absError`) and use that exact name. If entries live under a different key (e.g. `state.history` vs `state.sleepDailyLogs`), adapt the gather function, not the callers.

- [ ] **Step 3: Script tag**

In the html, after the history-calendar.js tag and BEFORE the init.js tag:

```html
<script src="js/stimcalc/calibration.js?v=20260819"></script>
```

- [ ] **Step 4: Wire into feedback + merge + settings**

1. history-calendar.js `autoPopulateFeedback()`: at the end of the path that WRITES a new `deltaMinutes` entry, add `if (typeof runAutoCalibration === 'function') runAutoCalibration();`
2. firebase-sync.js `mergeRemoteState()`: add to the rebuilt object:
   ```javascript
   calibration: Object.assign({}, getDefaultState().calibration, state.calibration || {}, (remote.calibration || {})),
   ```
3. Settings page threshold input: find the `sleepThreshold` onchange handler (grep `sleepThreshold` in ui-sections.js/init.js/html) and add inside it:
   ```javascript
   const _t = new Date();
   const _pause = new Date(_t.getFullYear(), _t.getMonth(), _t.getDate() + 7);
   state.calibration.manualPauseUntil = getLocalDateString(_pause);
   state.calibration.fittedThreshold = null;
   ```

- [ ] **Step 5: Retire the old dual calibration paths**

history-calendar.js:
1. `getCalibrationRecommendation()` (:1963-2009): replace body — call `computeCalibrationFit()` and format ITS numbers (avgDelta, nights, suggested step) so the Accuracy page shows the SAME math the auto-fit uses. Keep the function signature/return shape its callers expect (read callers first: `grep -n "getCalibrationRecommendation" js/stimcalc/*.js`).
2. `suggestCalibration()` (:2012-2025): DELETE the function and all its call sites (`grep -rn "suggestCalibration" js/stimcalc/ stimulant-elimination-calculator.html`).
3. Directional Bias manual recommendation (:1094-1096): change copy to point at the Calibration card, e.g. `'Auto-calibration is handling this — see the Calibration card.'`

- [ ] **Step 6: Verify + commit**

```bash
node --check js/stimcalc/calibration.js && node --check js/stimcalc/state.js && node --check js/stimcalc/firebase-sync.js && node --check js/stimcalc/history-calendar.js
grep -rn "suggestCalibration" js/stimcalc/ stimulant-elimination-calculator.html | wc -l   # expect 0
grep -c "calibration" js/stimcalc/state.js    # expect >= 1
grep -n "isEmptyState" js/stimcalc/state.js   # READ the function: calibration must NOT appear inside it
git add js/stimcalc/calibration.js js/stimcalc/state.js js/stimcalc/firebase-sync.js js/stimcalc/history-calendar.js stimulant-elimination-calculator.html
git commit -m "stimcalc P2: auto-calibration engine — decay-weighted nightly threshold fit, caffeine HL fit, calibration card, morning check-in (spec D1, D5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 7: pharma-engine v2 — time-varying threshold, sauna death, VitC honesty (spec D2)

**Files:**
- Modify: `js/stimcalc/pharma-engine.js` (`getEffectiveThreshold` :247-334, `calculateAmpLoad` :391-453, `findAmpClearTime` :500-561, `findCaffClearTime`, `calculateCaffLoad` :457-494)
- Modify: `js/stimcalc/state.js` (`getDefaultState().settings`, `getDefaultState().modifiers`)

- [ ] **Step 1: New modifier + setting in defaults**

state.js `getDefaultState()`:
- In `modifiers`, ADD: `workout: { active: false, endTime: '18:00', intense: false, date: null },` (keep `heavyLift` and `sauna` entries for now — removal is Task 11's job; Task 8 adds the heavyLift→workout migration).
- In `settings`, ADD: `vitcHighDose: false,`

- [ ] **Step 2: `getEffectiveThresholdAt(atMinutes)` — the v2 threshold**

Replace `getEffectiveThreshold()` (:247-334) with a PAIR of functions. The sauna block dies here entirely; the workout bonus becomes time-decayed AT THE EVALUATED TIME (fixes bugs 5/6/26 structurally):

```javascript
function getEffectiveThresholdAt(atMinutes) {
    // calibration-aware (Task 6); typeof guard covers script load order
    let baseThreshold = (typeof getActiveBaseThreshold === 'function')
        ? getActiveBaseThreshold()
        : numOr(state.settings.sleepThreshold, 14);
    let threshold = baseThreshold;

    // Sleep debt bonus — time-invariant within a day
    threshold += calculateSleepDebtBonus();

    // Workout bonus (single chip, spec D4): peak +2.0mg (+1.0 more if intense)
    // holds until endTime+120min, then linear decay to 0 by endTime+360min.
    const w = state.modifiers && state.modifiers.workout;
    if (w && w.active) {
        const today = getLocalDateString(new Date());
        if ((w.date || today) === today) {
            const endMin = timeToMinutes(w.endTime || '18:00');
            const peak = w.intense ? 3.0 : 2.0;
            const rel = atMinutes - endMin;   // minutes after workout end at evaluated time
            if (rel >= 0 && rel <= 120) threshold += peak;
            else if (rel > 120 && rel <= 360) threshold += peak * (1 - (rel - 120) / 240);
            // before end or >6h after: no bonus
        }
    }

    return Math.min(threshold, baseThreshold + 8);
}

function getEffectiveThreshold() {
    return getEffectiveThresholdAt(getCurrentMinutes());
}
```

Keep `calculateSleepDebtBonus()` / `isHyperarousalMode()` untouched. Every existing call site of `getEffectiveThreshold()` keeps working (grep to confirm none passed args). Delete the sauna block (:274-328) and the legacy `heavyLift` +2.0 branch and the workoutPlan `adenosineBonus` branch — the single `workout` modifier above replaces all three.

- [ ] **Step 3: Clearance search against the time-varying threshold**

`findAmpClearTime()` (:500-561): the threshold is currently computed ONCE at :501. Keep the binary-search + spikeTimes architecture from Task 2, but every load-vs-threshold comparison becomes time-correct:
- `calculateAmpLoad(x) > threshold` → `calculateAmpLoad(x) > getEffectiveThresholdAt(x)` (all occurrences, including inside the binary search and the spike-verification checks).
- After the search converges, add a forward verification sweep:

```javascript
// Threshold now varies with time (workout decay) — sweep forward to catch
// a later re-crossing the binary search can't see.
let sweepGuard = 0;
let t = clearTime;
while (sweepGuard < 5) {
    let violated = null;
    for (let m = t; m <= t + 360; m += 15) {
        if (calculateAmpLoad(m) > getEffectiveThresholdAt(m)) { violated = m; break; }
    }
    if (violated === null) break;
    // restart search from just past the violation
    t = violated + 1;
    while (t < violated + 1440 && calculateAmpLoad(t) > getEffectiveThresholdAt(t)) t += 5;
    sweepGuard++;
}
clearTime = t;
```

(adapt variable names to the function's actual locals; the sweep must run before the final `return`).

- [ ] **Step 4: Fitted caffeine half-life**

`calculateCaffLoad()` (:457-494): replace the settings half-life read with `getActiveCaffHalfLife()`. `findCaffClearTime()`: threshold stays `numOr(state.settings.caffThreshold, 25)` (caffeine threshold is not auto-fitted; only its half-life is).

- [ ] **Step 5: VitC honesty (spec D3)**

`calculateAmpLoad()` :397: `const reducedHalfLife = baseHalfLife * 0.7;` →

```javascript
const reducedHalfLife = baseHalfLife * (state.settings.vitcHighDose ? 0.7 : 0.9);
```

init.js VitC suggestion card (~:542-549): update the copy from "30%" to "~10% faster clearance (more with the high-dose protocol — see Settings)". Add a Settings-page checkbox wired to `state.settings.vitcHighDose` labelled "High-dose vitamin C acidification protocol (2g+ with food)" — place it next to the other settings inputs, onchange `state.settings.vitcHighDose = this.checked; recalculate(); saveState();`.

- [ ] **Step 6: Verify + commit**

```bash
node --check js/stimcalc/pharma-engine.js && node --check js/stimcalc/state.js && node --check js/stimcalc/init.js
grep -c "getEffectiveThresholdAt" js/stimcalc/pharma-engine.js   # expect >= 5
grep -n "sauna" js/stimcalc/pharma-engine.js                     # expect NO output
grep -c "getActiveCaffHalfLife()" js/stimcalc/pharma-engine.js   # expect >= 1
git add js/stimcalc/pharma-engine.js js/stimcalc/state.js js/stimcalc/init.js stimulant-elimination-calculator.html
git commit -m "stimcalc P2: time-varying threshold engine, workout decay at eval time, sauna removed from model, honest VitC 0.9/0.7 (spec D2, D3)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 8: circadian v2 + calculateSleepTime v2 (spec D2)

**Files:**
- Modify: `js/stimcalc/circadian.js` (add `getSleepOnsetAnchor`, replace `getForbiddenZone` + `getSleepGate`)
- Modify: `js/stimcalc/sleep-prediction.js` (replace `calculateSleepTime()` wholesale)
- Modify: `js/stimcalc/history-calendar.js` (`saveDay` stores `bindingFactor`)
- Modify: `js/stimcalc/firebase-sync.js` or `init.js` load path (heavyLift→workout migration)

- [ ] **Step 1: `getSleepOnsetAnchor()` in circadian.js**

```javascript
// v2 anchor: 7-day circular mean of ACTUAL sleep onset. Falls back to
// avgWake + 16h when fewer than 3 onset nights exist.
function getSleepOnsetAnchor() {
    const onsets = [];
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const ds = getLocalDateString(d);
        const log = (state.sleepDailyLogs || {})[ds];
        let onset = null;
        if (log && Number.isFinite(log.sleepOnsetMinutes)) onset = log.sleepOnsetMinutes;
        if (onset !== null) onsets.push(onset);
    }
    if (onsets.length >= 3) {
        let sx = 0, sy = 0;
        onsets.forEach(m => {
            const a = (m / 1440) * 2 * Math.PI;
            sx += Math.cos(a); sy += Math.sin(a);
        });
        let mean = Math.atan2(sy, sx) / (2 * Math.PI) * 1440;
        if (mean < 0) mean += 1440;
        return { anchor: Math.round(mean), nights: onsets.length, source: 'onset-history' };
    }
    const analysis = analyzeCircadianPhase();
    const avgWake = (analysis && Number.isFinite(analysis.avgWakeMinutes))
        ? analysis.avgWakeMinutes
        : timeToMinutes(state.wakeTime || '08:00');
    return { anchor: (avgWake + 16 * 60) % 1440, nights: onsets.length, source: 'wake-fallback' };
}
```

Verify the field name `avgWakeMinutes` against what `analyzeCircadianPhase()` actually returns (read it — Task 2 modified it) and adapt. Also verify whether `sleepDailyLogs` entries store onset under `sleepOnsetMinutes` (autoPopulateFeedback mirrors `sleepOnsetMinutes` — confirmed in audit; if an entry instead has `predictedSleep`/`actualSleep` only, skip it).

- [ ] **Step 2: FZ/gate v2**

Replace `getForbiddenZone()` (:170-177) and `getSleepGate()`:

```javascript
// v2: FZ = [anchor-3h, anchor-1h] in wake-normalized space (evening alertness
// peak before natural onset). WMZ concept removed.
function getForbiddenZone() {
    const { anchor } = getSleepOnsetAnchor();
    const wakeMin = timeToMinutes(state.wakeTime || '08:00');
    let a = anchor;
    if (a < wakeMin) a += 1440;   // normalize past-midnight anchors
    return { start: a - 180, end: a - 60 };
}

function getSleepGate() {
    const fz = getForbiddenZone();
    return { start: fz.end, end: fz.end + 120 };
}
```

Existing consumers (`isInForbiddenZone`, `isInSleepGate`, `getForbiddenZoneEnd`, graph shading, init.js vm) keep working — same return shape. Note values may exceed 1440 (wake-normalized); grep each consumer (`grep -rn "getForbiddenZone\|getSleepGate" js/stimcalc/`) and confirm each already handles >1440 via `% 1440` or `minutesToTimeWithDay`; where one assumes <1440, apply `% 1440` at the display site.

- [ ] **Step 3: Replace `calculateSleepTime()` wholesale (sleep-prediction.js)**

The 7-phase function (WMZ hard blocks, nicotine advisory, workoutPlan cortisol/thermal) is replaced by:

```javascript
// ============================================================
// SLEEP PREDICTION v2 (spec D2)
// sleepTime = latest of: amp clearance, caffeine clearance,
// workout cooldown — then a SOFT circadian gate that only
// delays (never blocks) and is named, not hidden.
// Returns { sleepTime, blockingFactors, pharmacokineticFloor,
//           bindingFactor, gateTime } — superset of v1's shape.
// ============================================================
function calculateSleepTime() {
    const now = getCurrentMinutes();
    const wakeMin = timeToMinutes(state.wakeTime || '08:00');
    const norm = t => (t < wakeMin ? t + 1440 : t);   // wake-normalized ordering
    const today = getLocalDateString(new Date());
    const blockingFactors = [];

    // --- Pharmacokinetic floor ---
    let sleepTime = now;
    let bindingFactor = 'now';

    const ampClear = findAmpClearTime();
    if (ampClear !== null && norm(ampClear) > norm(sleepTime)) {
        sleepTime = ampClear;
        bindingFactor = 'adderall';
    }
    if (ampClear !== null) {
        blockingFactors.push({ type: 'amphetamine', until: ampClear,
            label: 'Adderall above threshold until ' + minutesToTimeWithDay(ampClear) });
    }

    const caffClear = findCaffClearTime();
    if (caffClear !== null && norm(caffClear) > norm(sleepTime)) {
        sleepTime = caffClear;
        bindingFactor = 'caffeine';
    }
    if (caffClear !== null) {
        blockingFactors.push({ type: 'caffeine', until: caffClear,
            label: 'Caffeine above threshold until ' + minutesToTimeWithDay(caffClear) });
    }

    const pharmacokineticFloor = sleepTime;

    // --- Workout hard blocker (intense evening sessions only) ---
    const w = state.modifiers && state.modifiers.workout;
    if (w && w.active && w.intense && (w.date || today) === today) {
        const cooldownEnd = timeToMinutes(w.endTime || '18:00') + 60;
        if (norm(cooldownEnd) > norm(sleepTime)) {
            sleepTime = cooldownEnd;
            bindingFactor = 'workout';
            blockingFactors.push({ type: 'workout', until: cooldownEnd,
                label: 'Post-workout cooldown until ' + minutesToTimeWithDay(cooldownEnd) });
        }
    }

    // --- Soft circadian gate (only when drugs clear soon enough to matter) ---
    let gateTime = null;
    const hoursUntil = (norm(sleepTime) - norm(now)) / 60;
    if (hoursUntil < 18) {
        const fz = getForbiddenZone();   // wake-normalized space
        const s = norm(sleepTime);
        if (s >= fz.start && s < fz.end) {
            sleepTime = fz.end % 1440;
            bindingFactor = 'circadian';
            gateTime = fz.end % 1440;
            blockingFactors.push({ type: 'circadian', until: fz.end % 1440,
                label: 'Circadian alertness peak — realistic onset ~' + minutesToTime(fz.end % 1440) });
        }
    }

    // --- Final verification: never return a time where load exceeds threshold ---
    let verifyGuard = 0;
    while (verifyGuard < 5) {
        const v = sleepTime;
        const ampOk = calculateAmpLoad(v) <= getEffectiveThresholdAt(v);
        const caffOk = calculateCaffLoad(v) <= numOr(state.settings.caffThreshold, 25);
        if (ampOk && caffOk) break;
        const ampRe = findAmpClearTime();
        const caffRe = findCaffClearTime();
        let next = v;
        if (!ampOk && ampRe !== null && norm(ampRe) > norm(next)) { next = ampRe; bindingFactor = 'adderall'; }
        if (!caffOk && caffRe !== null && norm(caffRe) > norm(next)) { next = caffRe; bindingFactor = 'caffeine'; }
        if (norm(next) <= norm(v)) break;   // no progress — accept
        sleepTime = next;
        verifyGuard++;
    }

    return {
        sleepTime: sleepTime % 1440,
        blockingFactors: blockingFactors,
        pharmacokineticFloor: pharmacokineticFloor % 1440,
        bindingFactor: bindingFactor,
        gateTime: gateTime
    };
}
```

BEFORE replacing: grep every consumer of the return value (`grep -rn "calculateSleepTime()" js/stimcalc/`) and confirm each only reads `sleepTime` / `blockingFactors` / `pharmacokineticFloor` (superset-safe). Nicotine advisory and workoutPlan cortisol/thermal phases are GONE by design; `state.workoutPlan` and `state.nicotine` fields stay in defaults for schema compat.

- [ ] **Step 4: Persist `bindingFactor` per night**

history-calendar.js `saveDay()` (~:62): where the archived entry is assembled, add `bindingFactor: (typeof lastPredictionBindingFactor !== 'undefined' && lastPredictionBindingFactor) || null,`. Simplest wiring: in init.js `runCalculations()`, after `const result = calculateSleepTime()`, set a module-global `lastPredictionBindingFactor = result.bindingFactor;` — declare `let lastPredictionBindingFactor = null;` at init.js top scope. (Task 10 also puts `bindingFactor` on the vm; this step is what calibration's caffeine-HL fit trains on.)

- [ ] **Step 5: heavyLift → workout migration**

In the load path (init.js `loadState()` tail or wherever legacy migrations run — grep `migrateHistoryEntries` for the pattern location), add:

```javascript
if (state.modifiers && state.modifiers.heavyLift && state.modifiers.heavyLift.active
    && state.modifiers.workout && !state.modifiers.workout.active) {
    state.modifiers.workout.active = true;
    state.modifiers.workout.intense = true;
    state.modifiers.heavyLift.active = false;
}
if (state.modifiers && !state.modifiers.workout) {
    state.modifiers.workout = { active: false, endTime: '18:00', intense: false, date: null };
}
```

- [ ] **Step 6: Verify + commit**

```bash
node --check js/stimcalc/circadian.js && node --check js/stimcalc/sleep-prediction.js && node --check js/stimcalc/history-calendar.js && node --check js/stimcalc/init.js
grep -c "bindingFactor" js/stimcalc/sleep-prediction.js    # expect >= 6
grep -n "wakeMaintenanceStart\|WMZ" js/stimcalc/sleep-prediction.js   # expect no output
grep -c "getSleepOnsetAnchor" js/stimcalc/circadian.js     # expect >= 2
git add js/stimcalc/circadian.js js/stimcalc/sleep-prediction.js js/stimcalc/history-calendar.js js/stimcalc/init.js js/stimcalc/firebase-sync.js js/stimcalc/state.js
git commit -m "stimcalc P2: circadian v2 onset anchor + soft gate, calculateSleepTime v2 with named binding factor, bindingFactor persisted (spec D2)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: Modifier chips with live effect readouts (spec D4)

**Files:**
- Modify: `js/stimcalc/ui-sections.js` (`toggleModifier`, new `getModifierEffectReadout`)
- Modify: `js/stimcalc/init.js` (`toggleModifierChip` :1135-1155, `updateUI`)
- Modify: `stimulant-elimination-calculator.html` (chip markup)

- [ ] **Step 1: Replace liftChip with workoutChip**

In the html modifier chip row: rename the heavy-lift chip to "Worked out today", id `workoutChip`, checkbox id `workoutToggle`, and add a time row (hidden by default) with an end-time input `workoutEndTime` and an "intense session" checkbox `workoutIntense`. Add empty readout spans inside each chip label:

```html
<span class="sc-chip-effect" id="vitCEffect"></span>
<span class="sc-chip-effect" id="workoutEffect"></span>
```

Update init.js `toggleModifierChip()` maps: chipMap `{vitaminC:'vitCChip', workout:'workoutChip'}`, checkboxMap `{vitaminC:'vitCToggle', workout:'workoutToggle'}`, time-row map gains `workoutTimeRow`. Update ui-sections.js `toggleModifier()`: whitelist becomes `['vitaminC', 'workout']`; the workout branch sets `state.modifiers.workout.date = getLocalDateString(new Date());`, reads `workoutEndTime`/`workoutIntense` inputs into state, shows/hides `workoutTimeRow`. Remove the sauna branch here (full sauna removal is Task 11, but this function must not reference chips that no longer exist).

- [ ] **Step 2: `getModifierEffectReadout(modName)` in ui-sections.js**

```javascript
// What does this chip actually do to TONIGHT's prediction?
// Computed by toggling the modifier off in-memory and diffing.
function getModifierEffectReadout(modName) {
    const mod = state.modifiers && state.modifiers[modName];
    if (!mod || !mod.active) return '';
    if (modName === 'vitaminC') {
        const st = getVitaminCStatus();
        if (st && st.expired) return 'expired (taken ' + st.hoursAgo + 'h ago)';
    }
    const withRes = calculateSleepTime();
    let withoutRes;
    mod.active = false;
    try {
        withoutRes = calculateSleepTime();
    } finally {
        mod.active = true;
    }
    const delta = computeSleepDelta(withRes.sleepTime, withoutRes.sleepTime);
    if (delta === 0) {
        const bf = withRes.bindingFactor;
        if (bf && bf !== 'adderall' && modName === 'vitaminC') {
            return '±0 — ' + bf + ' is the limiting factor tonight, not Adderall';
        }
        return '±0 tonight';
    }
    const sign = delta < 0 ? '−' : '+';
    return 'tonight: ' + sign + Math.abs(delta) + ' min';
}
```

Verify `getVitaminCStatus()`'s actual return fields (read it — Task 2 touched the file) and `computeSleepDelta`'s signature (state.js) before wiring; adapt field names to reality.

- [ ] **Step 3: Render readouts from `updateUI()`**

In init.js `updateUI(vm)`, add:

```javascript
const vitCEffectEl = document.getElementById('vitCEffect');
if (vitCEffectEl) vitCEffectEl.textContent = getModifierEffectReadout('vitaminC');
const workoutEffectEl = document.getElementById('workoutEffect');
if (workoutEffectEl) workoutEffectEl.textContent = getModifierEffectReadout('workout');
```

(`textContent`, not innerHTML — no escaping needed.) `updateUI` runs every 5s via `recalculate()`; `getModifierEffectReadout` costs two extra `calculateSleepTime()` calls per active chip — acceptable (binary searches are ~40 iterations of arithmetic), but ONLY compute for active chips (the early-return above handles it).

- [ ] **Step 4: Verify + commit**

```bash
node --check js/stimcalc/ui-sections.js && node --check js/stimcalc/init.js
grep -c "workoutChip" js/stimcalc/init.js stimulant-elimination-calculator.html   # expect >=1 each
grep -n "liftChip" js/stimcalc/init.js stimulant-elimination-calculator.html      # expect no output
git add js/stimcalc/ui-sections.js js/stimcalc/init.js stimulant-elimination-calculator.html
git commit -m "stimcalc P2: workout chip replaces heavyLift, live per-chip effect readouts with binding-factor explanation (spec D4)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: Honest hero, real caffeine cutoff, check-in strip (spec D5, D6, D7)

**Files:**
- Modify: `js/stimcalc/init.js` (`runCalculations` :93-183, `updateUI`)
- Modify: `js/stimcalc/calibration.js` (add `computeCaffeineCutoff` + `renderCaffeineCutoffCard`)
- Modify: `js/stimcalc/state.js` (`snapshotPredictionInputs` ~:347-349)
- Modify: `stimulant-elimination-calculator.html` (hero markup, cutoff card, check-in strip)

- [ ] **Step 1: vm gains v2 fields; cross-app writes preserved**

In `runCalculations()`: `const result = calculateSleepTime();` now also exposes:

```javascript
vm.bindingFactor = result.bindingFactor;
vm.pharmaFloor = result.pharmacokineticFloor;
vm.gateTime = result.gateTime;
lastPredictionBindingFactor = result.bindingFactor;
const acc = (typeof calculateAccuracyStats === 'function') ? calculateAccuracyStats(14) : null;
vm.windowBand = (acc && Number.isFinite(acc.avgAbsError) && acc.avgAbsError > 0) ? Math.round(acc.avgAbsError) : 45;
```

**Verify lines :128-129 are untouched:** `state.projectedSleepTime = minutesToTime(vm.displaySleepTime); state.projectedSleepMinutes = vm.sleepTime;` — body-comp reads these.

- [ ] **Step 2: Hero markup + render**

html hero block: next to the `id="sleepTime"` hero time, add:

```html
<span class="hero-window" id="heroWindowBand"></span>
<div class="hero-binding" id="heroBindingLine"></div>
```

In `updateUI(vm)`:

```javascript
const bandEl = document.getElementById('heroWindowBand');
if (bandEl) bandEl.textContent = '± ' + vm.windowBand + ' min';
const bindEl = document.getElementById('heroBindingLine');
if (bindEl) {
    const names = { adderall: 'Adderall', caffeine: 'Caffeine', workout: 'Workout cooldown', circadian: 'Circadian rhythm', now: 'Nothing — you can sleep now' };
    let line = 'Limited by: ' + (names[vm.bindingFactor] || vm.bindingFactor);
    if (vm.bindingFactor === 'circadian' && vm.gateTime !== null) {
        line = 'Drugs clear ' + minutesToTime(vm.pharmaFloor) + ' — circadian gate holds sleep to ~' + minutesToTime(vm.gateTime);
    }
    bindEl.textContent = line;
}
```

Add minimal CSS for `.hero-window` (muted, smaller) and `.hero-binding` (one-line caption under the hero time) matching the warm theme vars.

- [ ] **Step 3: Real caffeine cutoff (spec D6) — in calibration.js**

```javascript
// When must the NEXT dose of caffeine land so it's under threshold by bedtime?
function computeCaffeineCutoff(doseMg) {
    const pred = calculateSleepTime();
    const wakeMin = timeToMinutes(state.wakeTime || '08:00');
    const norm = t => (t < wakeMin ? t + 1440 : t);
    const bed = norm(pred.sleepTime);
    const caffThresh = numOr(state.settings.caffThreshold, 25);
    const hl = getActiveCaffHalfLife();
    const loadAtBed = calculateCaffLoad(pred.sleepTime);
    const allowance = caffThresh - loadAtBed;
    if (allowance <= 0) return { status: 'closed' };            // existing caffeine already fills budget
    if (doseMg <= allowance) return { status: 'anytime' };      // dose fits even at bedtime
    const minutesBefore = hl * 60 * Math.log2(doseMg / allowance);
    const cutoffNorm = bed - minutesBefore;
    const cutoff = ((cutoffNorm % 1440) + 1440) % 1440;
    if (cutoffNorm <= norm(getCurrentMinutes())) return { status: 'passed', cutoff: cutoff };
    return { status: 'open', cutoff: cutoff, minutesLeft: Math.round(cutoffNorm - norm(getCurrentMinutes())) };
}

function renderCaffeineCutoffCard() {
    const el = document.getElementById('caffeineCutoffCard');
    if (!el) return;
    const rows = [{ mg: 95, label: 'Full coffee (95mg)' }, { mg: 45, label: 'Half cup / soda (45mg)' }];
    el.innerHTML = rows.map(r => {
        const c = computeCaffeineCutoff(r.mg);
        let txt;
        if (c.status === 'closed') txt = 'budget already spent — no more today';
        else if (c.status === 'anytime') txt = 'fine anytime before bed';
        else if (c.status === 'passed') txt = 'cutoff passed (' + formatTime12(minutesToTime(c.cutoff)) + ')';
        else txt = 'last call ' + formatTime12(minutesToTime(c.cutoff)) + ' (' + Math.floor(c.minutesLeft / 60) + 'h ' + (c.minutesLeft % 60) + 'm left)';
        return '<div class="sc-cutoff-row"><span>' + r.label + '</span><span class="sc-cutoff-val sc-cutoff-' + c.status + '">' + txt + '</span></div>';
    }).join('');
}
```

html: add `<div id="caffeineCutoffCard" class="sc-card"></div>` on the Dashboard page (near the recommendations area) with a heading "Caffeine cutoff — tonight". Call `renderCaffeineCutoffCard()` from `updateUI()` (cheap: two closed-form computations) and verify `formatTime12` exists in state.js (it does per the skill map — confirm signature).

- [ ] **Step 4: Check-in strip + calibration card mount points**

html: `<div id="morningCheckin" class="sc-card"></div>` at the TOP of the Dashboard page content, and `<div id="calibrationCard" class="sc-card"></div>` on the Accuracy page. Wire renders: `renderMorningCheckin()` + `renderCalibrationCard()` called from `init()` after first `recalculate()`, and from `scNavigate('dashboard')` / `scNavigate('accuracy')` branches respectively.

- [ ] **Step 5: Snapshot ACTIVE fitted values**

state.js `snapshotPredictionInputs()` (~:347-349) snapshots `baseThreshold`/`ampHalfLife`/`caffHalfLife` from settings. Change to the ACTIVE values so accuracy attribution reflects what the model actually used:

```javascript
baseThreshold: (typeof getActiveBaseThreshold === 'function') ? getActiveBaseThreshold() : numOr(state.settings.sleepThreshold, 14),
caffHalfLife: (typeof getActiveCaffHalfLife === 'function') ? getActiveCaffHalfLife() : numOr(state.settings.caffHalfLife, 5),
```

(`typeof` guards because state.js loads before calibration.js. Also add the `numOr` helper to state.js if it's not global there — pharma-engine.js loads after state.js, so define `numOr` in state.js and DELETE the Task-2 copy in pharma-engine.js to avoid double declaration; `node --check` per-file won't catch cross-file redeclaration, so grep: `grep -c "function numOr" js/stimcalc/*.js` must total 1.)

- [ ] **Step 6: Verify + commit**

```bash
node --check js/stimcalc/init.js && node --check js/stimcalc/calibration.js && node --check js/stimcalc/state.js
grep -n "projectedSleepTime\|projectedSleepMinutes" js/stimcalc/init.js   # both writes still present
grep -rc "function numOr" js/stimcalc/ | grep -v ":0"                     # exactly one file
grep -c "computeCaffeineCutoff" js/stimcalc/calibration.js                # expect >= 2
git add js/stimcalc/init.js js/stimcalc/calibration.js js/stimcalc/state.js stimulant-elimination-calculator.html
git commit -m "stimcalc P2: honest hero window + binding line, real caffeine cutoff card, check-in mount, active-value snapshots (spec D5, D6, D7)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## PHASE 3 — BACK-TO-BASICS CUTS (sequential; spec cuts list)

**Removal discipline for every cut:** grep the symbol across `js/stimcalc/*.js` AND the html before deleting; remove UI markup, CSS-only orphans, event wiring, and call sites together; STATE FIELDS STAY in `getDefaultState()` for schema compat (remote states still carry them) unless a task says otherwise. After each task: `node --check` every touched module + reload-in-browser sanity via Task 14/15 gate.

### Task 11: Remove sauna, nicotine UI, old workout planner

**Files:**
- Modify: `js/stimcalc/state.js`, `js/stimcalc/init.js`, `js/stimcalc/ui-sections.js`, `stimulant-elimination-calculator.html`

- [ ] **Step 1: Sauna — full removal**

```bash
grep -rn "sauna\|Sauna" js/stimcalc/ stimulant-elimination-calculator.html
```
Remove every hit:
- state.js: delete `sauna: {...}` from `getDefaultState().modifiers` (a remote `sauna` key surviving in old cloud states is harmless — `mergeRemoteState` rebuilds field-by-field and will drop it).
- init.js: `saunaTime` safeSetValue (~:833), sauna suggestion card in `updateRecommendations()` (~:551-558), `saunaChip`/`saunaToggle`/`saunaTimeRow` entries in `toggleModifierChip()` maps.
- ui-sections.js: sauna branch in `toggleModifier()` (if any remains after Task 9), sauna handling in `updateModifierTimeInputs()`/`restoreModifierUI()` (grep for the actual function names).
- html: sauna chip markup, sauna time row, any sauna CSS classes now orphaned.
- pharma-engine.js: already sauna-free after Task 7 — verify with grep.

- [ ] **Step 2: Nicotine — UI removal, state kept**

```bash
grep -rn "nicotine\|Nicotine\|NICOTINE" js/stimcalc/ stimulant-elimination-calculator.html
```
- ui-sections.js: DELETE `logNicotine()`, `updateNicotineDisplay()`, `checkRLSRisk()` and helpers.
- html: nicotine card/section markup + its onclick wiring.
- sleep-prediction.js: nicotine advisory already gone (Task 8) — verify.
- state.js: `nicotine` field STAYS in defaults (schema compat). `NICOTINE_CONSTANTS` definition: delete if now referenced nowhere (grep first).

- [ ] **Step 3: Old workout planner — replaced by the single chip**

```bash
grep -rn "workoutPlan\|initWorkoutPlanner\|calculateWorkoutImpact\|applyWorkoutPlan" js/stimcalc/ stimulant-elimination-calculator.html
```
- ui-sections.js: DELETE `initWorkoutPlanner()`, `calculateWorkoutImpact()`, `applyWorkoutPlan()`, the what-if preview (bug 10 dies here) and their helpers.
- html: workout planner section markup.
- init.js: any `initWorkoutPlanner()` call.
- state.js: `workoutPlan` field STAYS in defaults (schema compat).
- pharma-engine.js: already reads only `state.modifiers.workout` after Task 7 — verify no `workoutPlan` reads remain in the threshold path.

- [ ] **Step 4: Verify + commit**

```bash
for f in js/stimcalc/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -rn "sauna" js/stimcalc/ stimulant-elimination-calculator.html | grep -v "schema compat" | wc -l   # expect 0
grep -rn "logNicotine\|initWorkoutPlanner" js/stimcalc/ stimulant-elimination-calculator.html | wc -l    # expect 0
git add js/stimcalc/ stimulant-elimination-calculator.html
git commit -m "stimcalc P3: remove sauna entirely, nicotine UI, legacy workout planner (needle test cuts)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 12: Remove Inventory, Week-glance, Achievements, Insights bloat, compat layer

**Files:**
- Modify: `stimulant-elimination-calculator.html`, `js/stimcalc/init.js`, `js/stimcalc/history-calendar.js`, `js/stimcalc/ui-sections.js`
- NOT modified (left on disk, unloaded): `js/stimcalc/med-inventory.js`, `js/stimcalc/week-glance.js`

- [ ] **Step 1: Inventory (resolves bug 16 — stale cross-app writes into index.html appData)**

- html: DELETE the `med-inventory.js` script tag, the Inventory sidebar nav item, and the `scPageInventory` page markup.
- init.js: remove `inventory` from `scNavigate()` labels/branches, remove `scInvRenderDashboard()` call (~:1208) and any `scInvLoadFromFirebase()` init call.
- `grep -rn "scInv" js/stimcalc/init.js js/stimcalc/history-calendar.js js/stimcalc/ui-sections.js stimulant-elimination-calculator.html` → remove every remaining reference in LOADED files. `med-inventory.js` itself stays on disk, unloaded.

- [ ] **Step 2: Week-glance**

Same pattern: delete script tag, dashboard card markup, `scWeekGlanceRender()` call (~:1209), all references in loaded files. `week-glance.js` stays on disk.

- [ ] **Step 3: Achievements + Insights cuts**

Consult the KEEP list in `docs/superpowers/audits/2026-08-19-stimcalc/audit-history.md` (9 Insights sections keep). DELETE from history-calendar.js + html: **Personal Records, Research Benchmarks, Modifier Impact, Dosing Windows, Reliability-by-context**, and any achievements/badge system (grep `achievement`). For each: remove the render function, its call sites, and its markup container.

- [ ] **Step 4: Compat layer + switchSITab + orphan CSS (bug 24)**

- html :4763-4800: DELETE the hidden `display:none` compat div holding legacy accordion `data-section` elements.
- Grep the 5s-interval writers that fed it (`grep -n "data-section\|compatLayer" js/stimcalc/*.js`) and delete them.
- history-calendar.js :2031: DELETE `switchSITab()` (dead) + any references.
- CSS: after all Phase 3 markup deletions, spot-grep for now-unused `sc-inv-`, `sc-wg-`, sauna, nicotine class prefixes in the stylesheet and delete those rule blocks.

- [ ] **Step 5: Verify + commit**

```bash
for f in js/stimcalc/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -n "med-inventory.js\|week-glance.js" stimulant-elimination-calculator.html | wc -l   # expect 0
grep -rn "scInv\|scWeekGlance\|switchSITab" js/stimcalc/init.js js/stimcalc/history-calendar.js js/stimcalc/ui-sections.js stimulant-elimination-calculator.html | wc -l   # expect 0
git add js/stimcalc/ stimulant-elimination-calculator.html
git commit -m "stimcalc P3: remove inventory (kills stale cross-app writes), week-glance, achievements, 5 insights sections, compat layer (bugs 16, 24)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 13: Nav 7→5, Modifiers page fold-in, cache-bust everything

**Files:**
- Modify: `stimulant-elimination-calculator.html`, `js/stimcalc/init.js`

- [ ] **Step 1: Fold the Modifiers page into Dashboard**

Audit the Modifiers page content (post-Task 11/12 it holds: modifier chips, all-nighter toggle + ghost load, VitC time row). Move ALL of it into the Dashboard page markup (chips row under the hero, all-nighter + ghost load below). Delete the `scPageModifiers` container and its sidebar item. Grep `scNavigate('modifiers')` and `'modifiers'` label entries in init.js — remove.

- [ ] **Step 2: Final nav = 5 pages**

Sidebar and `scNavigate()` labels end as exactly: **Dashboard, Calendar, Insights, Accuracy, Settings** (Settings keeps the 'Tools' internals renamed or relabeled — read the current label map at init.js :1157+ and make the visible label "Settings"). Verify every deleted page's nav branch is gone and `currentPage` defaults to `'dashboard'`.

- [ ] **Step 3: Cache-bust ALL script tags**

```bash
grep -n "js/stimcalc" stimulant-elimination-calculator.html
```
Every remaining `<script src="js/stimcalc/*.js?v=...">` → `?v=20260819` (including calibration.js if it isn't already).

- [ ] **Step 4: Final mobile pass**

Load the Dashboard markup mentally at 390px: chip row wraps (`flex-wrap: wrap` on the chip container), check-in strip inputs fit (`max-width: 100%`), cutoff card rows stack. Add CSS as needed under the Task-5 `@media (max-width: 420px)` block.

- [ ] **Step 5: Verify + commit**

```bash
node --check js/stimcalc/init.js
grep -c "?v=20260819" stimulant-elimination-calculator.html            # equals the number of stimcalc script tags
grep -n "scPageModifiers\|scPageInventory" stimulant-elimination-calculator.html | wc -l   # expect 0
git add js/stimcalc/init.js stimulant-elimination-calculator.html
git commit -m "stimcalc P3: nav 7→5, modifiers folded into dashboard, cache-bust all modules to v=20260819

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## PHASE 4 — QA GATE (sequential; merge only if ALL pass)

### Task 14: Static QA

**Files:** none modified (verification only; fix-forward commits allowed)

- [ ] **Step 1: Syntax + balance, all modules**

```bash
for f in js/stimcalc/*.js; do node --check "$f" && echo "OK $f"; done
for f in js/stimcalc/*.js; do python3 -c "c=open('$f').read(); b=c.count('{')-c.count('}'); p=c.count('(')-c.count(')'); print('$f', 'BAL' if b==0 and p==0 else f'UNBALANCED {b} {p}')"; done
```
Expected: every file OK + BAL. (Note: `med-inventory.js`/`week-glance.js` are unloaded but still on disk — they must still parse since the loop covers them.)

- [ ] **Step 2: Guard integrity**

```bash
for fn in saveState saveStateImmediate saveToFirebase; do echo "== $fn"; awk "/function $fn\(/,/^}/" js/stimcalc/firebase-sync.js | grep -oE "pinValidated|isInitialLoad|hasLoadedFromCloud|isEmptyState|_dataLoaded" | sort -u | wc -l; done
```
Expected: `5` for each of the three functions.

- [ ] **Step 3: Regression greps**

```bash
grep -rn "_version.*Date.now" js/stimcalc/ | wc -l                              # 0
grep -rn "saunaChip\|saunaToggle\|scInv\|scWeekGlance\|switchSITab" js/stimcalc/init.js js/stimcalc/ui-sections.js js/stimcalc/history-calendar.js stimulant-elimination-calculator.html | wc -l   # 0
grep -n "projectedSleepTime\|projectedSleepMinutes" js/stimcalc/init.js | wc -l # >= 2 (cross-app writes alive)
grep -rn "toISOString().split\|toISOString().slice" js/stimcalc/ | wc -l        # 0
grep -n "isEmptyState" js/stimcalc/state.js                                     # read fn: no `calibration` check inside
grep -c "function numOr" js/stimcalc/state.js js/stimcalc/pharma-engine.js      # exactly one definition total
grep -rn "drawSleepPerformanceGraph()" js/stimcalc/ | wc -l                     # 0 (no bare no-arg calls)
```

- [ ] **Step 4: Fix anything found, commit fixes**

Any failure: fix surgically, re-run the failed check, commit with message `stimcalc P4: static QA fix — <what>` + trailer. Do NOT proceed to Task 15 with failures outstanding.

### Task 15: Playwright smoke + merge

**Files:** none modified (verification; fix-forward allowed); git merge at the end

Use the Playwright MCP tools against the LOCAL file:

- [ ] **Step 1: Load + console**

Navigate to `file:///Users/suleman/dental-quest/stimulant-elimination-calculator.html`. In the PIN overlay choose Skip/offline (`skipPin()` path). Assert via `browser_console_messages`: **zero errors** (warnings from Firebase-offline are acceptable; any `TypeError`/`ReferenceError` fails the gate).

- [ ] **Step 2: Five pages render**

Click each sidebar item: Dashboard, Calendar, Insights, Accuracy, Settings. Each must render content with no new console errors. Calendar specifically must NOT throw (bug 4 regression check).

- [ ] **Step 3: Model behaviors**

1. Dashboard: add a med dose (30mg, 2h ago) → hero shows a time + `± X min` band + a "Limited by:" line.
2. Toggle VitC chip → prediction moves OR readout says which factor binds (`±0 — ... limiting factor`). Toggle workout chip → same contract. NO silent-zero chips.
3. Caffeine cutoff card shows both rows with a status each; add a 95mg caffeine entry → card and hero react.
4. Morning check-in: enter wake time + hours, Confirm → strip flips to "✓ Checked in", no console error.
5. Settings: change threshold slider → prediction updates (calibration pause is state-internal; no error).
6. Resize to 390×844 (`browser_resize`) → screenshot: hero not clipped, med rows wrap, no horizontal scroll.

- [ ] **Step 4: Cross-app regression**

```bash
grep -rn "appData" js/stimcalc/*.js | grep -v "med-inventory\|week-glance"   # expect 0 write paths in loaded modules
grep -n "projectedSleepTime" js/stimcalc/init.js                              # write still present
```

- [ ] **Step 5: Merge + push**

Only when Steps 1–4 all pass:

```bash
git checkout main
git merge --no-ff stimcalc-revival -m "stimcalc revival: 28-bug correctness wave, model v2 (auto-calibration, honest hero, real caffeine cutoff, soft circadian gate), back-to-basics UI (7→5 pages)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

Then confirm GitHub Pages deploy (~30s) and spot-load the live URL.

---

## SUCCESS CRITERIA (from the approved spec)

1. Zero console errors on load and on every page switch.
2. Every visible modifier chip either moves the prediction or displays WHY it doesn't (named binding factor).
3. Hero shows time ± error band + "Limited by:" line; circadian-gated nights show both the pharma floor and the gate time.
4. Real computed caffeine cutoff on the Dashboard, reactive to intake and predicted bedtime.
5. One-tap morning check-in feeds the sleep log AND the auto-calibration fit.
6. Main-app (index.html) medication data untouched by this app — no cross-app writes remain in loaded modules.
7. ≤ 5 pages; sauna/nicotine/inventory/week-glance/achievements gone.
8. All 5 Firebase guards intact in all three save paths; no `Date.now()` versions; cross-app `projectedSleepTime` contract preserved.
