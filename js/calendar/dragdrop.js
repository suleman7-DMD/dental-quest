// ============================================================================
// SULLY CALENDAR — dragdrop.js
// Google-style direct manipulation:
//  · time grid: drag to move (15-min snap, across days), drag bottom edge to
//    resize, drag on empty space to create, click empty slot to quick-create
//  · all-day strip + month: drag chips to other days, drag across days to
//    create multi-day all-day events, click a day to quick-create
//  · touch: long-press to pick up / select, tap to open or create
// Remote re-renders are deferred while dragState.active (firebase-sync.js).
// ============================================================================

var dragState = null;
var DRAG_THRESHOLD = 5;
var LONG_PRESS_MS = 380;
var SNAP_MIN = 15;

function initDragDrop() {
    var main = $('gcMain');
    main.addEventListener('pointerdown', onMainPointerDown);
    main.addEventListener('touchstart', onMainTouchStart, { passive: true });
    main.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var chip = e.target.closest && e.target.closest('[data-key]');
        if (!chip || chip.classList.contains('gc-ag-row')) return;
        var inst = instIndex[chip.getAttribute('data-key')];
        if (inst && !inst.isDraft) { e.preventDefault(); openEventDetails(inst, chip); }
    });
    main.addEventListener('contextmenu', function(e) { if (dragState && dragState.touch) e.preventDefault(); });
}

// ---------------------------------------------------------------- hit testing
function dragHitTest(target) {
    if (!target || !target.closest) return null;
    if (target.closest('button, a, input, select, textarea')) return null;
    var chip = target.closest('[data-key]');
    if (chip && !chip.classList.contains('gc-ag-row')) {
        var key = chip.getAttribute('data-key');
        var inst = instIndex[key] || getEventInstanceByKey(key);
        if (!inst || inst.isDraft) return null;
        var mode = 'click';
        if (!inst.readOnly) {
            if (chip.classList.contains('gc-ev')) mode = target.closest('.gc-ev-resize') ? 'grid-resize' : 'grid-move';
            else if (chip.classList.contains('gc-ad-chip')) mode = 'ad-move';
            else if (chip.closest('.gc-month-view')) mode = 'month-move';
        }
        return { mode: mode, inst: inst, el: chip };
    }
    var col = target.closest('.gc-col');
    if (col) return { mode: 'grid-create', el: col };
    if (target.closest('.gc-allday-cell') || target.classList.contains('gc-allday-area')) return { mode: 'ad-create', el: target.closest('.gc-allday-area') };
    var mcell = target.closest('.gc-month-cell');
    if (mcell) return { mode: 'month-create', el: mcell };
    return null;
}

// ---------------------------------------------------------------- geometry
function gridCols() { return Array.prototype.slice.call(document.querySelectorAll('#gcMain .gc-col')); }

function gridPointAbs(x, y, clampToCol) {
    var cols = gridCols();
    if (!cols.length) return null;
    var col = null, i;
    if (clampToCol) col = clampToCol;
    else {
        for (i = 0; i < cols.length; i++) {
            var r = cols[i].getBoundingClientRect();
            if (x >= r.left && x < r.right) { col = cols[i]; break; }
        }
        if (!col) col = x < cols[0].getBoundingClientRect().left ? cols[0] : cols[cols.length - 1];
    }
    var rc = col.getBoundingClientRect();
    var min = (y - rc.top) / hourHeight() * 60;
    min = Math.max(0, Math.min(1440, min));
    return { col: col, date: col.getAttribute('data-date'), min: min, abs: dayNum(col.getAttribute('data-date')) * 1440 + min };
}

function snap(v, step) { return Math.round(v / (step || SNAP_MIN)) * (step || SNAP_MIN); }
function snapDown(v, step) { return Math.floor(v / (step || SNAP_MIN)) * (step || SNAP_MIN); }

function cellDateAt(x, y, selector) {
    var els = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
    for (var i = 0; i < els.length; i++) {
        var c = els[i] && els[i].closest ? els[i].closest(selector) : null;
        if (c && c.getAttribute('data-date')) return c.getAttribute('data-date');
    }
    // outside the grid: clamp to nearest cell horizontally/vertically
    var cells = Array.prototype.slice.call(document.querySelectorAll('#gcMain ' + selector));
    var best = null, bestD = Infinity;
    cells.forEach(function(c) {
        var r = c.getBoundingClientRect();
        var dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
        var d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = c; }
    });
    return best ? best.getAttribute('data-date') : null;
}

// ---------------------------------------------------------------- gesture core
function beginGesture(hit, x, y, touch) {
    var ds = { mode: hit.mode, inst: hit.inst || null, el: hit.el, x0: x, y0: y, x: x, y: y, active: false, touch: !!touch, ghost: null, moved: false };
    var g;
    if (ds.mode === 'grid-move') {
        g = gridPointAbs(x, y);
        ds.offset = g ? g.abs - instanceStartAbs(ds.inst) : 0;
        ds.dur = instanceDurationMin(ds.inst);
        ds.newStart = instanceStartAbs(ds.inst);
    } else if (ds.mode === 'grid-resize') {
        ds.newEnd = instanceEndAbs(ds.inst);
    } else if (ds.mode === 'grid-create') {
        g = gridPointAbs(x, y, hit.el);
        ds.col = hit.el;
        ds.anchorAbs = g ? dayNum(g.date) * 1440 + snapDown(g.min) : 0;
        ds.clickAbs = g ? dayNum(g.date) * 1440 + snapDown(g.min, 30) : 0;
        ds.date = g ? g.date : null;
    } else if (ds.mode === 'ad-move' || ds.mode === 'month-move') {
        var sel = ds.mode === 'ad-move' ? '.gc-allday-cell' : '.gc-month-cell';
        ds.grabDate = cellDateAt(x, y, sel) || ds.inst.startDate;
        ds.cellSel = sel;
        ds.newStartDate = ds.inst.startDate;
    } else if (ds.mode === 'ad-create' || ds.mode === 'month-create') {
        ds.cellSel = ds.mode === 'ad-create' ? '.gc-allday-cell' : '.gc-month-cell';
        ds.anchorDate = cellDateAt(x, y, ds.cellSel);
        ds.curDate = ds.anchorDate;
    }
    dragState = ds;
    return ds;
}

function activateGesture() {
    var ds = dragState;
    if (!ds || ds.active) return;
    if (ds.mode === 'click') return;
    ds.active = true;
    closePopover(true);
    document.body.classList.add('gc-dragging');
    if (ds.mode === 'grid-resize') document.body.classList.add('gc-resizing');
    if (ds.inst) {
        document.querySelectorAll('#gcMain [data-key="' + cssEscape(ds.inst.key) + '"]').forEach(function(el) { el.classList.add('gc-drag-src'); });
    }
    if (ds.touch && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
}

function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\]/g, '\\$&');
}

function moveGesture(x, y) {
    var ds = dragState;
    if (!ds) return;
    ds.x = x; ds.y = y;
    if (!ds.active) {
        if (ds.touch) return; // touch activates by long press only
        if (Math.abs(x - ds.x0) + Math.abs(y - ds.y0) < DRAG_THRESHOLD) return;
        activateGesture();
        if (!ds.active) return;
    }
    ds.moved = true;
    if (ds.mode.indexOf('grid') === 0) autoScrollGrid(y);
    if (ds.mode === 'grid-move') {
        var g = gridPointAbs(x, y);
        if (!g) return;
        var ns = snap(g.abs - ds.offset);
        ds.newStart = ns;
        drawGridGhost(ns, ns + Math.max(ds.dur, 0), ds.inst);
    } else if (ds.mode === 'grid-resize') {
        var startAbs = instanceStartAbs(ds.inst);
        var col = ds.el.closest('.gc-col');
        var gr = gridPointAbs(x, y, col);
        if (!gr) return;
        var ne = Math.max(startAbs + SNAP_MIN, snap(gr.abs));
        ds.newEnd = ne;
        var segStart = Math.max(startAbs, dayNum(col.getAttribute('data-date')) * 1440);
        ds.el.style.height = Math.max(18, (ne - segStart) / 60 * hourHeight() - 2) + 'px';
        var tl = ds.el.querySelector('.gc-ev-time, .gc-ev-time-inline');
        if (tl) tl.textContent = (tl.classList.contains('gc-ev-time-inline') ? ', ' : '') + fmtTimeRange(ds.inst.startTime, absToDateTime(ne).time, state.settings.timeFormat);
    } else if (ds.mode === 'grid-create') {
        var gc = gridPointAbs(x, y, ds.col);
        if (!gc) return;
        var cur = dayNum(ds.date) * 1440 + snap(gc.min);
        var a = Math.min(ds.anchorAbs, cur), b = Math.max(ds.anchorAbs + SNAP_MIN, cur);
        if (cur < ds.anchorAbs) b = ds.anchorAbs + SNAP_MIN;
        ds.range = [a, Math.max(b, a + SNAP_MIN)];
        drawGridGhost(ds.range[0], ds.range[1], null);
    } else if (ds.mode === 'ad-move' || ds.mode === 'month-move') {
        var d = cellDateAt(x, y, ds.cellSel);
        if (!d) return;
        ds.newStartDate = addDays(ds.inst.startDate, diffDays(ds.grabDate, d));
        var span = Math.max(0, diffDays(ds.inst.startDate, ds.inst.allDay ? ds.inst.endDate : ds.inst.startDate));
        if (!ds.inst.allDay && inAllDayStrip(ds.inst)) span = Math.max(0, diffDays(ds.inst.startDate, ds.inst.endDate));
        highlightCells(ds.cellSel, ds.newStartDate, addDays(ds.newStartDate, span));
    } else if (ds.mode === 'ad-create' || ds.mode === 'month-create') {
        var d2 = cellDateAt(x, y, ds.cellSel);
        if (!d2) return;
        ds.curDate = d2;
        var lo = d2 < ds.anchorDate ? d2 : ds.anchorDate, hi = d2 < ds.anchorDate ? ds.anchorDate : d2;
        highlightCells(ds.cellSel, lo, hi);
    }
}

function endGesture(x, y) {
    var ds = dragState;
    if (!ds) return;
    var wasActive = ds.active;
    cleanupGesture();
    if (!wasActive) { clickGesture(ds, x, y); return; }
    var fmtOk = true;
    if (ds.mode === 'grid-move') {
        var nd = absToDateTime(ds.newStart);
        if (ds.newStart !== instanceStartAbs(ds.inst)) userMoveInstance(ds.inst, nd.date, nd.time).then(flushPendingRender);
        else renderView();
    } else if (ds.mode === 'grid-resize') {
        var ne = absToDateTime(ds.newEnd);
        if (ds.newEnd !== instanceEndAbs(ds.inst)) userResizeInstance(ds.inst, ne.date, ne.time).then(flushPendingRender);
        else renderView();
    } else if (ds.mode === 'grid-create') {
        var r = ds.range || [ds.anchorAbs, ds.anchorAbs + state.settings.defaultDuration];
        var s = absToDateTime(r[0]), e = absToDateTime(r[1]);
        openQuickCreate({ startDate: s.date, startTime: s.time, endDate: e.date, endTime: e.time, allDay: false }, { left: x, top: y, right: x, bottom: y, width: 0, height: 0 });
    } else if (ds.mode === 'ad-move' || ds.mode === 'month-move') {
        if (ds.newStartDate !== ds.inst.startDate) userMoveInstance(ds.inst, ds.newStartDate, ds.inst.allDay ? null : ds.inst.startTime).then(flushPendingRender);
        else renderView();
    } else if (ds.mode === 'ad-create' || ds.mode === 'month-create') {
        var lo = ds.curDate < ds.anchorDate ? ds.curDate : ds.anchorDate, hi = ds.curDate < ds.anchorDate ? ds.anchorDate : ds.curDate;
        if (lo && hi) openQuickCreate({ startDate: lo, endDate: hi, allDay: true }, { left: x, top: y, right: x, bottom: y, width: 0, height: 0 });
    }
    return fmtOk;
}

function clickGesture(ds, x, y) {
    var rect = { left: x, top: y, right: x, bottom: y, width: 0, height: 0 };
    if (ds.inst) {
        openEventDetails(ds.inst, ds.el);
        return;
    }
    if (activePopover) { closePopover(); return; } // first click outside just dismisses (Google behavior)
    if (ds.mode === 'grid-create') {
        var s = absToDateTime(ds.clickAbs);
        var e = absToDateTime(ds.clickAbs + state.settings.defaultDuration);
        openQuickCreate({ startDate: s.date, startTime: s.time, endDate: e.date, endTime: e.time, allDay: false }, rect);
    } else if ((ds.mode === 'ad-create' || ds.mode === 'month-create') && ds.anchorDate) {
        openQuickCreate({ startDate: ds.anchorDate, endDate: ds.anchorDate, allDay: true }, rect);
    }
}

function cancelGesture() {
    if (!dragState) return false;
    var had = dragState.active;
    cleanupGesture();
    if (had) renderView();
    flushPendingRender();
    return true;
}

function cleanupGesture() {
    var ds = dragState;
    dragState = null;
    if (scrollTimer) { cancelAnimationFrame(scrollTimer); scrollTimer = null; }
    document.body.classList.remove('gc-dragging', 'gc-resizing');
    if (ds && ds.ghost && ds.ghost.parentNode) ds.ghost.parentNode.removeChild(ds.ghost);
    document.querySelectorAll('#gcMain .gc-drag-src').forEach(function(el) { el.classList.remove('gc-drag-src'); });
    document.querySelectorAll('#gcMain .gc-drop').forEach(function(el) { el.classList.remove('gc-drop'); });
    if (ds && ds.longTimer) clearTimeout(ds.longTimer);
    document.removeEventListener('pointermove', onDocPointerMove);
    document.removeEventListener('pointerup', onDocPointerUp);
    document.removeEventListener('pointercancel', onDocPointerCancel);
    document.removeEventListener('touchmove', onDocTouchMove, { passive: false });
    document.removeEventListener('touchend', onDocTouchEnd);
    document.removeEventListener('touchcancel', onDocTouchCancel);
}

// ---------------------------------------------------------------- visuals
function drawGridGhost(startAbs, endAbs, inst) {
    var ds = dragState;
    var cols = gridCols();
    var hourH = hourHeight();
    var startDate = absToDateTime(startAbs).date;
    var col = cols.find(function(c) { return c.getAttribute('data-date') === startDate; });
    if (!ds.ghost) {
        ds.ghost = document.createElement('div');
        ds.ghost.className = 'gc-ev gc-ghost' + (inst ? ' ' + chipClasses(inst) : ' draft');
        var c = inst ? chipColors(inst) : { bg: colorHex(getCalendar(getCalendarForTypePreview('event')) ? getCalendar(getCalendarForTypePreview('event')).color : 'peacock'), fg: '#fff' };
        ds.ghost.style.background = c.bg;
        ds.ghost.style.color = c.fg;
    }
    if (!col) { ds.ghost.style.display = 'none'; return; }
    ds.ghost.style.display = '';
    if (ds.ghost.parentNode !== col) col.appendChild(ds.ghost);
    var dayStart = dayNum(startDate) * 1440;
    var s = startAbs - dayStart, e = Math.min(endAbs - dayStart, 1440);
    var visualEnd = Math.max(e, s + (inst && endAbs === startAbs ? 30 : 15));
    ds.ghost.style.top = (s / 60 * hourH) + 'px';
    ds.ghost.style.height = Math.max(18, (visualEnd - s) / 60 * hourH - 2) + 'px';
    ds.ghost.style.left = '1px';
    ds.ghost.style.width = 'calc(100% - 6px)';
    ds.ghost.style.zIndex = 50;
    var st = absToDateTime(startAbs).time, en = absToDateTime(endAbs).time;
    var label = (inst ? displayTitle(inst) : '(No title)');
    var time = endAbs === startAbs ? fmtTime(st, state.settings.timeFormat) : fmtTimeRange(st, en, state.settings.timeFormat);
    ds.ghost.innerHTML = '<div class="gc-ev-title">' + escapeHtml(label) + '</div><div class="gc-ev-time">' + escapeHtml(time) + '</div>';
}

function highlightCells(sel, lo, hi) {
    document.querySelectorAll('#gcMain ' + sel).forEach(function(c) {
        var d = c.getAttribute('data-date');
        c.classList.toggle('gc-drop', d >= lo && d <= hi);
    });
}

var scrollTimer = null;
function autoScrollGrid(y) {
    var sc = $('gcGridScroll');
    if (!sc) return;
    var r = sc.getBoundingClientRect();
    var dir = y < r.top + 36 ? -1 : y > r.bottom - 36 ? 1 : 0;
    if (!dir) { if (scrollTimer) { cancelAnimationFrame(scrollTimer); scrollTimer = null; } return; }
    if (scrollTimer) return;
    var step = function() {
        if (!dragState || !dragState.active) { scrollTimer = null; return; }
        var r2 = sc.getBoundingClientRect();
        var d = dragState.y < r2.top + 36 ? -1 : dragState.y > r2.bottom - 36 ? 1 : 0;
        if (!d) { scrollTimer = null; return; }
        sc.scrollTop += d * 12;
        moveGestureNoScroll();
        scrollTimer = requestAnimationFrame(step);
    };
    scrollTimer = requestAnimationFrame(step);
}

function moveGestureNoScroll() {
    // re-run the geometry for the current pointer after the grid scrolled under it
    var ds = dragState;
    if (!ds) return;
    var keep = scrollTimer;
    scrollTimer = -1;
    moveGesture(ds.x, ds.y);
    scrollTimer = keep;
}

// ---------------------------------------------------------------- mouse / pen
function onMainPointerDown(e) {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    if (dragState) cleanupGesture();
    var hit = dragHitTest(e.target);
    if (!hit) return;
    if (hit.el && hit.el.closest && hit.el.closest('.gc-popover')) return;
    e.preventDefault();
    beginGesture(hit, e.clientX, e.clientY, false);
    document.addEventListener('pointermove', onDocPointerMove);
    document.addEventListener('pointerup', onDocPointerUp);
    document.addEventListener('pointercancel', onDocPointerCancel);
}
function onDocPointerMove(e) { if (e.pointerType !== 'touch') moveGesture(e.clientX, e.clientY); }
function onDocPointerUp(e) { if (e.pointerType !== 'touch') endGesture(e.clientX, e.clientY); }
function onDocPointerCancel() { cancelGesture(); }

// ---------------------------------------------------------------- touch (long press)
function onMainTouchStart(e) {
    if (e.touches.length !== 1) { if (dragState && !dragState.active) cleanupGesture(); return; }
    var t = e.touches[0];
    var hit = dragHitTest(e.target);
    if (!hit) return;
    if (dragState) cleanupGesture();
    var ds = beginGesture(hit, t.clientX, t.clientY, true);
    ds.longTimer = setTimeout(function() {
        if (dragState !== ds || ds.cancelled) return;
        if (ds.mode === 'click') return;
        activateGesture();
        moveGesture(ds.x, ds.y);
    }, LONG_PRESS_MS);
    document.addEventListener('touchmove', onDocTouchMove, { passive: false });
    document.addEventListener('touchend', onDocTouchEnd);
    document.addEventListener('touchcancel', onDocTouchCancel);
}

function onDocTouchMove(e) {
    var ds = dragState;
    if (!ds) return;
    var t = e.touches[0];
    if (!t) return;
    if (!ds.active) {
        if (Math.abs(t.clientX - ds.x0) + Math.abs(t.clientY - ds.y0) > 10) {
            // the user is scrolling — give the gesture back to the browser
            ds.cancelled = true;
            cleanupGesture();
        }
        return;
    }
    e.preventDefault(); // holding an event: stop the page from scrolling
    moveGesture(t.clientX, t.clientY);
}

function onDocTouchEnd(e) {
    var ds = dragState;
    if (!ds) return;
    var t = e.changedTouches && e.changedTouches[0];
    var x = t ? t.clientX : ds.x, y = t ? t.clientY : ds.y;
    if (e.cancelable) e.preventDefault(); // suppress the synthetic click under the new popover
    endGesture(x, y);
}

function onDocTouchCancel() { cancelGesture(); }
