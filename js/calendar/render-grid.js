// ============================================================================
// SULLY CALENDAR — render-grid.js
// Time-grid views (day / 3-day / 4-day / week): sticky day header, all-day
// lanes with collapse, 24h body with Google-style cascading overlap layout,
// current-time line, quick-create draft ghost. Pure DOM build — pointer
// interaction lives in dragdrop.js; no state mutation, never saves.
// ============================================================================

var instIndex = {};          // key → instance for everything currently rendered
var lastGridRangeKey = null; // re-scroll to day start only when the range changes

// ---------------------------------------------------------------- zoom (px per hour)
// ui.gridZoom (per device): null = auto (fit on phones, density on desktop) |
// 'fit' = the whole working day fills the screen | 'normal' | a pinched number.
// Every grid position is calc(var(--hh) * hours), so a zoom is one style write.
var GRID_ZOOM_MIN = 14, GRID_ZOOM_MAX = 120;
var gridFit = { hh: null, start: 7, end: 23 }; // last measured fit
var pinchHH = null;                            // live value while two fingers are down

function baseHourHeight() { return state.settings.density === 'compact' ? 36 : 48; }

function gridZoomMode() {
    var z = ui.gridZoom;
    if (z === 'fit' || z === 'normal') return z;
    if (typeof z === 'number' && isFinite(z)) return z;
    return isPhone() ? 'fit' : 'normal';
}

function hourHeight() {
    if (pinchHH) return pinchHH;
    var z = gridZoomMode();
    if (z === 'fit') return gridFit.hh || baseHourHeight();
    if (typeof z === 'number') return Math.max(GRID_ZOOM_MIN, Math.min(GRID_ZOOM_MAX, z));
    return baseHourHeight();
}

// Hours the fitted day spans: the user's day (settings) stretched to every timed item in view
function fitRangeFor(dayItems) {
    var s = state.settings.dayStartHour, e = state.settings.dayEndHour || 23;
    dayItems.forEach(function(items) {
        items.forEach(function(it) {
            s = Math.min(s, Math.floor(it.s / 60));
            e = Math.max(e, Math.ceil(it.e / 60));
        });
    });
    s = Math.max(0, Math.min(23, s));
    e = Math.max(s + 1, Math.min(24, e));
    return { start: s, end: e };
}

function setGridHourHeight(hh) {
    var body = document.querySelector('#gcMain .gc-grid-body');
    if (!body) return;
    body.style.setProperty('--hh', hh + 'px');
    var view = body.closest('.gc-grid-view');
    if (view) {
        view.classList.toggle('hh-tight', hh < 22);
        view.classList.toggle('hh-tiny', hh < 17);
    }
}

// Short times for narrow columns: 9a · 9:30a · 12p · 9–11a · 11a–1p
function fmtTimeShort(hhmm, fmt, keepMer) {
    if (!isValidHHMM(hhmm)) return '';
    if (fmt === '24h') return hhmm.replace(/^0/, '');
    var h = +hhmm.slice(0, 2), m = +hhmm.slice(3, 5);
    return (h % 12 === 0 ? 12 : h % 12) + (m ? ':' + pad2(m) : '') + (keepMer === false ? '' : (h < 12 ? 'a' : 'p'));
}
function fmtRangeShort(s, e, fmt) {
    if (!isValidHHMM(e) || e === s) return fmtTimeShort(s, fmt);
    var same = (+s.slice(0, 2) < 12) === (+e.slice(0, 2) < 12);
    return fmtTimeShort(s, fmt, fmt === '24h' ? undefined : !same) + '–' + fmtTimeShort(e, fmt);
}

function isDarkTheme() { return document.documentElement.classList.contains('dark'); }

function mixHex(a, b, t) {
    var x = colorHex(a) || '#039be5', y = colorHex(b) || '#ffffff';
    var p = function(h, i) { return parseInt(h.substr(i, 2), 16); };
    var r = Math.round(p(x, 1) * (1 - t) + p(y, 1) * t), g = Math.round(p(x, 3) * (1 - t) + p(y, 3) * t), bl = Math.round(p(x, 5) * (1 - t) + p(y, 5) * t);
    return '#' + [r, g, bl].map(function(n) { return (n < 16 ? '0' : '') + n.toString(16); }).join('');
}

// Background / text colors for a chip (past events fade toward the surface, like Google)
function chipColors(inst, nowAbs) {
    var hex = instColorHex(inst);
    var past = state.settings.dimPastEvents && !inst.isDraft && isPastInstance(inst, nowAbs);
    var faded = past || inst.done;
    var bg = faded ? mixHex(hex, isDarkTheme() ? '#1e1f20' : '#ffffff', isDarkTheme() ? 0.45 : 0.55) : hex;
    return { bg: bg, fg: textOnColor(bg), base: hex, past: past };
}

function chipIcon(inst) {
    if (inst.type === 'task') return icon(inst.done ? 'check_circle' : 'radio_button_unchecked', 'gc-ev-ic');
    if (inst.type === 'deadline') return icon(inst.done ? 'check_circle' : 'flag', 'gc-ev-ic');
    if (inst.type === 'appointment') return icon('dentistry', 'gc-ev-ic');
    if (inst.overlay === 'holidays') return '';
    return '';
}

function chipClasses(inst, extra) {
    var c = ['gc-t-' + inst.type];
    if (inst.done) c.push('done');
    if (inst.readOnly) c.push('ro');
    if (inst.isDraft) c.push('draft');
    if (isOverdue(inst)) c.push('overdue');
    if (extra) c.push(extra);
    return c.join(' ');
}

function getVisibleDays(view, anchor) {
    var days = [], i;
    if (view === 'day') return [anchor];
    if (view === '3day' || view === '4day') {
        var n = view === '3day' ? 3 : 4;
        for (i = 0; i < n; i++) days.push(addDays(anchor, i));
        return days;
    }
    var start = startOfWeek(anchor, state.settings.weekStart);
    for (i = 0; i < 7; i++) {
        var d = addDays(start, i);
        var wd = weekdayOf(d);
        if (!state.settings.showWeekends && (wd === 0 || wd === 6)) continue;
        days.push(d);
    }
    return days;
}

// Is this instance shown in the all-day strip (all-day or ≥ 24h) rather than the grid?
function inAllDayStrip(inst) {
    return inst.allDay || instanceDurationMin(inst) >= 1440;
}

function draftInstance() {
    if (!draftPreview) return null;
    var d = draftPreview;
    return {
        key: '__draft__', id: null, occ: null, type: d.type || 'event', title: d.title || '(No title)', calendarId: d.calendarId || null,
        color: d.color || null, allDay: !!d.allDay, startDate: d.startDate, endDate: d.endDate || d.startDate,
        startTime: d.allDay ? null : d.startTime, endTime: d.allDay ? null : d.endTime, location: '', notes: '', done: false,
        recurring: false, readOnly: true, isDraft: true, patientName: d.patientName || '', procedure: '', reminders: {}
    };
}

// ---------------------------------------------------------------- per-day overlap layout
function layoutColumn(items) {
    // items: [{inst, s, e}] minutes within the day; returns same objects with col/ncols/span
    items.sort(function(a, b) { return a.s - b.s || (b.e - b.s) - (a.e - a.s); });
    var clusters = [], cur = null;
    items.forEach(function(it) {
        if (!cur || it.s >= cur.end) { cur = { items: [], end: it.e, cols: [] }; clusters.push(cur); }
        var placed = false;
        for (var c = 0; c < cur.cols.length; c++) {
            if (cur.cols[c] <= it.s) { cur.cols[c] = it.e; it.col = c; placed = true; break; }
        }
        if (!placed) { it.col = cur.cols.length; cur.cols.push(it.e); }
        cur.end = Math.max(cur.end, it.e);
        cur.items.push(it);
    });
    clusters.forEach(function(cl) {
        var n = cl.cols.length;
        cl.items.forEach(function(it) {
            it.ncols = n;
            // expand right across free columns
            var span = 1;
            for (var c = it.col + 1; c < n; c++) {
                var blocked = cl.items.some(function(o) { return o.col === c && o.s < it.e && o.e > it.s; });
                if (blocked) break;
                span++;
            }
            it.span = span;
        });
    });
    return items;
}

// ---------------------------------------------------------------- all-day lanes
function layoutAllDay(insts, days) {
    var idx = {};
    days.forEach(function(d, i) { idx[d] = i; });
    var first = days[0], last = days[days.length - 1];
    var bars = [];
    insts.forEach(function(inst) {
        var s = inst.startDate < first ? first : inst.startDate;
        var endIncl = inst.allDay ? inst.endDate : (instanceEndAbs(inst) % 1440 === 0 ? addDays(inst.endDate, -1) : inst.endDate);
        var e = endIncl > last ? last : endIncl;
        // skip hidden weekend columns: walk to the nearest visible day
        var si = null, ei = null, d;
        for (d = s; d <= e; d = addDays(d, 1)) { if (idx[d] !== undefined) { if (si === null) si = idx[d]; ei = idx[d]; } }
        if (si === null) return;
        bars.push({ inst: inst, si: si, ei: ei, contL: inst.startDate < first, contR: endIncl > last });
    });
    bars.sort(function(a, b) { return a.si - b.si || (b.ei - b.si) - (a.ei - a.si) || compareInstances(a.inst, b.inst); });
    var lanes = [];
    bars.forEach(function(b) {
        for (var l = 0; ; l++) {
            if (!lanes[l]) lanes[l] = [];
            if (!lanes[l].some(function(o) { return o.si <= b.ei && o.ei >= b.si; })) { lanes[l].push(b); b.lane = l; break; }
        }
    });
    return { bars: bars, laneCount: lanes.length };
}

function allDayChipHtml(b, nowAbs, cols, lane) {
    var inst = b.inst;
    lane = lane || 24;
    var c = chipColors(inst, nowAbs);
    var left = (b.si / cols) * 100, width = ((b.ei - b.si + 1) / cols) * 100;
    var timePrefix = (!inst.allDay && inst.startDate >= inst.startDate) ? '<span class="gc-chip-time">' + escapeHtml(fmtTime(inst.startTime, state.settings.timeFormat)) + '</span> ' : '';
    return '<div class="gc-chip gc-ad-chip ' + chipClasses(inst) + (b.contL ? ' cont-l' : '') + (b.contR ? ' cont-r' : '') + '" data-key="' + escapeHtml(inst.key) + '"' +
        ' style="left:calc(' + left + '% + ' + (lane < 24 ? 1 : 2) + 'px);width:calc(' + width + '% - ' + (lane < 24 ? 3 : 6) + 'px);top:' + (b.lane * lane + 2) + 'px;background:' + c.bg + ';color:' + c.fg + '" title="' + escapeHtml(displayTitle(inst)) + '">' +
        (b.contL ? icon('chevron_left', 'gc-cont') : '') + chipIcon(inst) + (inst.allDay ? '' : timePrefix) + '<span class="gc-chip-title">' + escapeHtml(displayTitle(inst)) + '</span>' +
        (b.contR ? icon('chevron_right', 'gc-cont') : '') + '</div>';
}

// ---------------------------------------------------------------- timed blocks
function timedChipHtml(it, nowAbs, hourH, narrow) {
    var inst = it.inst;
    var c = chipColors(inst, nowAbs);
    var visualEnd = Math.max(it.e, it.s + 15);
    var height = Math.max(18, (visualEnd - it.s) / 60 * hourH - 2);
    // positions follow --hh so pinch / fit zoom never needs a rebuild
    var posTop = 'calc(var(--hh) * ' + (it.s / 60).toFixed(4) + ')';
    var posH = 'max(' + (narrow ? 14 : 18) + 'px, calc(var(--hh) * ' + ((visualEnd - it.s) / 60).toFixed(4) + ' - ' + (narrow ? 1 : 2) + 'px))';
    var n = it.ncols, w = it.span / n;
    var left = it.col / n;
    if (n > 1 && it.col + it.span < n) w = Math.min(1 - left, w * 1.6); // cascade like Google
    var fmt = state.settings.timeFormat;
    if (narrow) {
        // Phone week: the title owns the whole box — wrapped, then shrunk to fit (fitGridChips)
        var pt = (inst.type === 'task' || inst.type === 'deadline') && inst.startTime === inst.endTime;
        var shortTime = pt ? fmtTimeShort(inst.startTime, fmt) : (it.contTop ? 'until ' + fmtTimeShort(inst.endTime, fmt) : fmtRangeShort(inst.startTime, inst.endTime, fmt));
        var nIcon = (inst.type === 'task' || inst.type === 'deadline') ? chipIcon(inst) : '';
        var growable = pt || instanceDurationMin(inst) <= 45; // may extend into free space below to show its name
        return '<div class="gc-ev nw ' + chipClasses(inst) + '" data-key="' + escapeHtml(inst.key) + '"' + (growable ? ' data-grow="1"' : '') +
            ' style="top:' + posTop + ';height:' + posH + ';left:calc(' + (left * 100) + '% + 1px);width:calc(' + (w * 100) + '% - 2px);background:' + c.bg + ';color:' + c.fg + ';z-index:' + (2 + it.col) + '"' +
            ' title="' + escapeHtml(displayTitle(inst) + ' · ' + shortTime + (inst.location ? ' · ' + inst.location : '')) + '">' +
            '<div class="gc-ev-t">' + nIcon + escapeHtml(displayTitle(inst)) + '</div><div class="gc-ev-s">' + escapeHtml(shortTime) + '</div>' +
            (inst.readOnly ? '' : '<div class="gc-ev-resize" data-resize="1"></div>') + '</div>';
    }
    var point = (inst.type === 'task' || inst.type === 'deadline') && inst.startTime === inst.endTime;
    var timeTxt = point ? fmtTime(inst.startTime, fmt) : fmtTimeRange(inst.startTime, inst.endTime, fmt);
    if (inst.startDate !== inst.endDate && !point) {
        timeTxt = (it.contTop ? '' : fmtTime(inst.startTime, fmt)) + (it.contTop || it.contBottom ? ' – ' : '') + (it.contBottom ? '' : fmtTime(inst.endTime, fmt));
        if (it.contTop && !it.contBottom) timeTxt = 'until ' + fmtTime(inst.endTime, fmt);
        if (!it.contTop && it.contBottom) timeTxt = fmtTime(inst.startTime, fmt) + ' →';
    }
    var compact = height < 34;
    var title = escapeHtml(displayTitle(inst));
    var sub = '';
    if (!compact) {
        sub = '<div class="gc-ev-time">' + escapeHtml(timeTxt) + '</div>';
        if (height >= 52 && inst.location) sub += '<div class="gc-ev-loc">' + escapeHtml(inst.location) + '</div>';
        if (height >= 52 && inst.type === 'appointment' && inst.chair) sub += '<div class="gc-ev-loc">Chair ' + escapeHtml(inst.chair) + '</div>';
    }
    var body = compact
        ? '<div class="gc-ev-line">' + chipIcon(inst) + '<span class="gc-ev-title">' + title + '</span><span class="gc-ev-time-inline">, ' + escapeHtml(timeTxt) + '</span></div>'
        : '<div class="gc-ev-title">' + chipIcon(inst) + title + '</div>' + sub;
    var z = 2 + it.col;
    return '<div class="gc-ev ' + chipClasses(inst, compact ? 'compact' : '') + '" data-key="' + escapeHtml(inst.key) + '"' +
        ' style="top:' + posTop + ';height:' + posH + ';left:calc(' + (left * 100) + '% + 1px);width:calc(' + (w * 100) + '% - 4px);background:' + c.bg + ';color:' + c.fg + ';z-index:' + z + '"' +
        ' title="' + escapeHtml(displayTitle(inst) + ' · ' + timeTxt + (inst.location ? ' · ' + inst.location : '')) + '">' + body +
        (inst.readOnly ? '' : '<div class="gc-ev-resize" data-resize="1"></div>') + '</div>';
}

// ---------------------------------------------------------------- main render
function renderTimeGrid(main, days) {
    var fmt = state.settings.timeFormat;
    var today = getLocalDateString();
    var nowAbs = currentNowAbs();
    var first = days[0], last = days[days.length - 1];
    var insts = getInstancesInRange(first, last);
    if (searchQuery) insts = insts.filter(function(i) { return matchesSearch(i, searchQuery); });
    var draft = draftInstance();
    if (draft && draft.startDate <= last && draft.endDate >= first) insts.push(draft);
    instIndex = {};
    insts.forEach(function(i) { instIndex[i.key] = i; });

    var allDayInsts = insts.filter(inAllDayStrip);
    var timed = insts.filter(function(i) { return !inAllDayStrip(i); });
    var ad = layoutAllDay(allDayInsts, days);
    var cols = days.length;
    var gutterW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 64;
    var narrow = (main.clientWidth - gutterW) / cols < 96; // phone week / 4-day: title-first chips
    var lane = narrow ? 20 : 24;
    var collapsedLanes = 2;
    var expandable = ad.laneCount > 3;
    var expanded = ui.allDayExpanded || !expandable;
    var shownLanes = expanded ? ad.laneCount : collapsedLanes;
    var adHeight = Math.max(1, shownLanes) * lane + (expanded ? 4 : lane + 2);
    if (!ad.laneCount) adHeight = narrow ? 4 : 8;

    // per-day timed layout, minutes within the day. Short items get a readable
    // minimum box (taller on phones); a box that would run past midnight is
    // lifted so it ends at 24:00 (an 11:59pm deadline stays on screen).
    var dayItems = days.map(function(d) {
        var dayStart = dayNum(d) * 1440, dayEnd = dayStart + 1440;
        var items = [];
        timed.forEach(function(inst) {
            var s = instanceStartAbs(inst), e = instanceEndAbs(inst);
            var point = e <= s;
            if (point ? (s < dayStart || s >= dayEnd) : (e <= dayStart || s >= dayEnd)) return;
            var ss = Math.max(s, dayStart) - dayStart, ee = Math.min(point ? s : e, dayEnd) - dayStart;
            var vis = point ? (narrow ? 60 : 30) : (narrow ? 40 : 15);
            if (ee - ss < vis) {
                ee = ss + vis;
                if (ee > 1440) { ss = Math.max(0, 1440 - vis); ee = 1440; }
            }
            items.push({ inst: inst, s: ss, e: ee, contTop: s < dayStart, contBottom: e > dayEnd });
        });
        return layoutColumn(items);
    });

    var zoom = gridZoomMode();
    var fitR = fitRangeFor(dayItems);
    var hourH;
    if (pinchHH) hourH = pinchHH;
    else if (zoom === 'fit') {
        // estimate from the last measurement; the exact value is applied right after layout
        var estAvail = gridFit.avail || Math.max(240, main.clientHeight - (narrow ? 60 : 90) - adHeight);
        hourH = Math.max(GRID_ZOOM_MIN, Math.min(160, estAvail / (fitR.end - fitR.start)));
    } else hourH = hourHeight();

    // scroll memory (a fitted grid re-anchors whenever its hour range changes)
    var oldScroll = $('gcGridScroll');
    var modeKey = (typeof zoom === 'number' ? 'z' : zoom) + '|' + state.settings.density;
    var rangeKey = modeKey + '|' + first + '|' + last + (zoom === 'fit' ? '|' + fitR.start + '-' + fitR.end : '');
    var keepTop = oldScroll && lastGridRangeKey === rangeKey ? oldScroll.scrollTop : null;
    var keepTopSameView = oldScroll && keepTop === null && zoom !== 'fit' && lastGridRangeKey && lastGridRangeKey.indexOf(modeKey + '|') === 0 ? oldScroll.scrollTop : null;

    var weekNum = state.settings.showWeekNumbers ? '<span class="gc-weeknum">W' + isoWeekNumber(first) + '</span>' : '';
    var tz = (function() {
        try { var off = -new Date().getTimezoneOffset() / 60; return 'GMT' + (off >= 0 ? '+' : '-') + pad2(Math.abs(Math.trunc(off))); } catch (e) { return ''; }
    })();
    var zoomBtn = '<button class="gc-icon-btn sm gc-zoom-btn" data-act="grid-zoom" title="' + (zoom === 'fit' ? 'Full-size hours (or pinch)' : 'Fit the whole day on screen (or pinch)') + '" aria-label="' + (zoom === 'fit' ? 'Show full-size hours' : 'Fit the whole day on screen') + '">' + icon(zoom === 'fit' ? 'unfold_more' : 'unfold_less') + '</button>';

    var head = '<div class="gc-grid-head"><div class="gc-gutter-head">' + weekNum + zoomBtn + '<span class="gc-tz">' + tz + '</span></div><div class="gc-head-days" style="--cols:' + cols + '">' +
        days.map(function(d) {
            var p = ymdParts(d);
            var cls = 'gc-head-day' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + (d === currentDate && days.length === 1 ? ' sel' : '');
            return '<div class="' + cls + '" data-date="' + d + '"><span class="gc-dow">' + DOW_SHORT[weekdayOf(d)].toUpperCase() + '</span>' +
                '<button class="gc-daynum" data-goto="' + d + '" title="' + escapeHtml(fmtDateLong(d)) + '">' + p.d + '</button></div>';
        }).join('') + '</div><div class="gc-scroll-pad"></div></div>';

    // all-day strip
    var hiddenCount = {};
    var adChips = ad.bars.map(function(b) {
        if (!expanded && b.lane >= collapsedLanes) {
            for (var i = b.si; i <= b.ei; i++) hiddenCount[i] = (hiddenCount[i] || 0) + 1;
            return '';
        }
        return allDayChipHtml(b, nowAbs, cols, lane);
    }).join('');
    var moreBtns = '';
    if (!expanded) {
        Object.keys(hiddenCount).forEach(function(i) {
            moreBtns += '<button class="gc-ad-more" data-more-date="' + days[+i] + '" style="left:calc(' + (+i / cols * 100) + '% + 2px);width:calc(' + (100 / cols) + '% - ' + (narrow ? 3 : 6) + 'px);top:' + (collapsedLanes * lane + 2) + 'px">' + (narrow ? '+' + hiddenCount[i] : hiddenCount[i] + ' more') + '</button>';
        });
    }
    var adCells = days.map(function(d, i) {
        return '<div class="gc-allday-cell' + (d === today ? ' today' : '') + '" data-date="' + d + '" data-i="' + i + '"></div>';
    }).join('');
    var allDayRow = '<div class="gc-allday-row"><div class="gc-gutter-allday">' +
        (expandable ? '<button class="gc-icon-btn sm" data-act="toggle-allday" title="' + (expanded ? 'Collapse all-day events' : 'Show all all-day events') + '">' + icon(expanded ? 'expand_less' : 'expand_more') + '</button>' : '') +
        '</div><div class="gc-allday-area" style="--cols:' + cols + ';height:' + adHeight + 'px">' + adCells + adChips + moreBtns + '</div><div class="gc-scroll-pad"></div></div>';

    // body — every vertical position is a multiple of --hh
    var hours = '';
    for (var h = 1; h < 24; h++) hours += '<div class="gc-hour-label' + (h % 2 ? ' odd' : '') + '" style="top:calc(var(--hh) * ' + h + ')"><span>' + fmtHourLabel(h, fmt) + '</span></div>';
    var colsHtml = days.map(function(d, di) {
        var dayStart = dayNum(d) * 1440;
        var evHtml = dayItems[di].map(function(it) { return timedChipHtml(it, nowAbs, hourH, narrow); }).join('');
        var nowLine = d === today ? '<div class="gc-now" style="top:calc(var(--hh) * ' + ((nowAbs - dayStart) / 60).toFixed(4) + ')"></div>' : '';
        return '<div class="gc-col' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + ([0, 6].indexOf(weekdayOf(d)) !== -1 ? ' weekend' : '') + '" data-date="' + d + '">' + evHtml + nowLine + '</div>';
    }).join('');
    var body = '<div class="gc-grid-scroll" id="gcGridScroll"><div class="gc-grid-body" style="--hh:' + hourH + 'px">' +
        '<div class="gc-hours">' + hours + '</div><div class="gc-cols" style="--cols:' + cols + '">' + colsHtml + '</div></div></div>';

    main.innerHTML = '<div class="gc-grid-view' + (cols === 1 ? ' single' : '') + (narrow ? ' narrow' : '') + (zoom === 'fit' ? ' fit' : '') + '" style="--cols:' + cols + '">' + head + allDayRow + body + '</div>';

    var scroll = $('gcGridScroll');
    // exact fit: the day's hour range fills the visible grid height
    var avail = scroll.clientHeight - 12;
    if (avail > 60) {
        gridFit.avail = avail;
        gridFit.fitHH = Math.max(GRID_ZOOM_MIN, Math.min(160, avail / (fitR.end - fitR.start)));
        gridFit.start = fitR.start; gridFit.end = fitR.end;
        if (zoom === 'fit' && !pinchHH) { gridFit.hh = gridFit.fitHH; hourH = gridFit.fitHH; }
    }
    setGridHourHeight(hourH);

    if (keepTop !== null) scroll.scrollTop = keepTop;
    else if (zoom === 'fit') scroll.scrollTop = Math.max(0, fitR.start * hourH - 8);
    else if (keepTopSameView !== null && days.length > 0) scroll.scrollTop = keepTopSameView;
    else {
        var target = state.settings.dayStartHour * hourH - 12; // keep the start hour's label fully visible
        if (days.indexOf(today) !== -1) {
            var nowMin = nowAbs - dayNum(today) * 1440;
            target = Math.max(0, Math.min(target, nowMin / 60 * hourH - 120));
            if (nowMin / 60 * hourH > target + scroll.clientHeight - 80) target = nowMin / 60 * hourH - scroll.clientHeight / 3;
        }
        scroll.scrollTop = Math.max(0, target);
    }
    lastGridRangeKey = rangeKey;
    var sbw = scroll.offsetWidth - scroll.clientWidth;
    main.querySelectorAll('.gc-scroll-pad').forEach(function(p) { p.style.width = sbw + 'px'; });

    if (narrow) {
        fitGridChips(main);
        if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(function() { fitGridChips(main); });
    }
    attachGridPinch(scroll);

    var tog = main.querySelector('[data-act=toggle-allday]');
    if (tog) tog.addEventListener('click', function() { ui.allDayExpanded = !ui.allDayExpanded; saveUiPrefs(); renderView(); });
    var zb = main.querySelector('[data-act=grid-zoom]');
    if (zb) zb.addEventListener('click', function() {
        ui.gridZoom = gridZoomMode() === 'fit' ? 'normal' : 'fit';
        saveUiPrefs();
        lastGridRangeKey = null;
        renderView();
    });
    main.querySelectorAll('[data-more-date]').forEach(function(b) {
        b.addEventListener('click', function(e) { e.stopPropagation(); openDayListPopover(b.getAttribute('data-more-date'), b); });
    });
    main.querySelectorAll('[data-goto]').forEach(function(b) {
        b.addEventListener('click', function(e) { e.stopPropagation(); goToDate(b.getAttribute('data-goto'), 'day'); });
    });
}

// ---------------------------------------------------------------- phone chip text fitting
// Each narrow chip shows as much of its title as its box allows: wrap first,
// then step the font down (11 → 8px); only a title that still overflows at
// the smallest size gets a line clamp. The time line appears when it fits.
var FIT_FONT_STEPS = [11, 10, 9, 8];
function fitGridChips(root) {
    var chips = Array.prototype.slice.call((root || document).querySelectorAll('.gc-ev.nw'));
    if (!chips.length) return;
    var info = chips.map(function(el) {
        el.classList.remove('show-time', 'clamped');
        var t = el.querySelector('.gc-ev-t');
        if (t) t.style.webkitLineClamp = '';
        return { el: el, t: t, h: el.clientHeight, done: !t };
    });
    // Largest size where the title fits the box AND no word has to split mid-word;
    // failing that, the largest size that fits the box; failing that, clamp.
    var setFs = function(list, fs) { list.forEach(function(x) { x.el.style.setProperty('--fs', fs + 'px'); }); };
    for (var k = 0; k < FIT_FONT_STEPS.length; k++) {
        var fs = FIT_FONT_STEPS[k];
        var pend = info.filter(function(x) { return !x.done; });
        if (!pend.length) break;
        setFs(pend, fs);                                                             // write…
        pend.forEach(function(x) { x.t.classList.add('mw'); });
        pend.forEach(function(x) { x.wordsFit = x.t.scrollWidth <= x.t.clientWidth + 1; }); // …read
        pend.forEach(function(x) { x.t.classList.remove('mw'); });
        pend.forEach(function(x) { x.need = x.t.scrollHeight; });                    // …read
        pend.forEach(function(x) {
            var fits = x.need <= x.h - 2;
            if (fits && x.boxFs === undefined) x.boxFs = fs;
            if (fits && x.wordsFit) { x.done = true; x.fs = fs; }
        });
    }
    var rest = info.filter(function(x) { return !x.done; });
    rest.forEach(function(x) { x.fs = x.boxFs !== undefined ? x.boxFs : FIT_FONT_STEPS[FIT_FONT_STEPS.length - 1]; });
    var byFs = {};
    rest.forEach(function(x) { (byFs[x.fs] = byFs[x.fs] || []).push(x); });
    Object.keys(byFs).forEach(function(f) { setFs(byFs[f], +f); });
    rest.forEach(function(x) { x.need = x.t.scrollHeight; });
    info.forEach(function(x) {
        if (!x.t) return;
        var avail = x.h - 3, lh = x.fs * 1.16;
        if (x.need > avail + 1) {
            x.t.style.webkitLineClamp = String(Math.max(1, Math.floor(avail / lh)));
            x.el.classList.add('clamped');
        } else if (avail - x.need >= x.fs * 1.15) x.el.classList.add('show-time');
    });
    // Tasks, deadlines and short events whose name still doesn't fit grow down
    // into the free space below them (never over another chip in their lane).
    var grow = info.filter(function(x) { return x.el.classList.contains('clamped') && x.el.getAttribute('data-grow'); });
    if (!grow.length) return;
    grow.forEach(function(x) {
        var el = x.el, col = el.parentNode;
        var top = el.offsetTop, left = el.offsetLeft, right = left + el.offsetWidth;
        var limit = col.offsetHeight;
        Array.prototype.forEach.call(col.children, function(o) {
            if (o === el || !o.classList || !o.classList.contains('gc-ev')) return;
            var ot = o.offsetTop, ol = o.offsetLeft, orr = ol + o.offsetWidth;
            if (ot > top && ol < right && orr > left) limit = Math.min(limit, ot);
        });
        x.room = limit - top - 2;
    });
    grow.forEach(function(x) {
        x.el.classList.remove('clamped');
        x.t.style.webkitLineClamp = '';
        x.el.style.setProperty('--fs', '9px');
    });
    grow.forEach(function(x) { x.need = x.t.scrollHeight; });
    grow.forEach(function(x) {
        var h = Math.min(x.room, x.need + 4);
        if (h <= x.h) { x.el.style.setProperty('--fs', '8px'); x.t.style.webkitLineClamp = String(Math.max(1, Math.floor((x.h - 3) / 9.3))); x.el.classList.add('clamped'); return; }
        x.el.style.height = h + 'px';
        x.el.classList.add('grown');
        if (x.need + 4 > x.room) { x.t.style.webkitLineClamp = String(Math.max(1, Math.floor((h - 3) / 10.4))); x.el.classList.add('clamped'); }
    });
}

// ---------------------------------------------------------------- pinch to zoom hours
function attachGridPinch(scroll) {
    var p = null;
    var dist = function(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy) || 1; };
    scroll.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 2) return;
        var r = scroll.getBoundingClientRect();
        var midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
        var hh0 = hourHeight();
        p = { d0: dist(e.touches), hh0: hh0, midY: midY, anchor: (scroll.scrollTop + midY) / hh0 };
        pinchHH = hh0;
        document.body.classList.add('gc-pinching');
    }, { passive: true });
    scroll.addEventListener('touchmove', function(e) {
        if (!p || e.touches.length !== 2) return;
        if (e.cancelable) e.preventDefault();
        var hh = Math.max(GRID_ZOOM_MIN, Math.min(GRID_ZOOM_MAX, p.hh0 * dist(e.touches) / p.d0));
        pinchHH = hh;
        setGridHourHeight(hh);
        scroll.scrollTop = p.anchor * hh - p.midY;
    }, { passive: false });
    var end = function(e) {
        if (!p || (e.touches && e.touches.length >= 2)) return;
        var hh = pinchHH || p.hh0;
        p = null;
        pinchHH = null;
        document.body.classList.remove('gc-pinching');
        var fit = gridFit.fitHH || hh;
        // released near the fitted size → snap to Fit (and stay fitted as the week changes)
        if (Math.abs(hh - fit) / fit < 0.08) {
            ui.gridZoom = 'fit';
            gridFit.hh = fit;
            setGridHourHeight(fit);
            scroll.scrollTop = Math.max(0, gridFit.start * fit - 8);
        } else ui.gridZoom = Math.round(hh * 10) / 10;
        saveUiPrefs();
        var view = scroll.closest('.gc-grid-view');
        lastGridRangeKey = null;
        var keep = scroll.scrollTop;
        renderView(); // rebuild compact/fit markup at the new size, same scroll position
        var sc = $('gcGridScroll');
        if (sc && ui.gridZoom !== 'fit') sc.scrollTop = keep;
        if (view && !document.body.contains(view)) return;
    };
    scroll.addEventListener('touchend', end);
    scroll.addEventListener('touchcancel', end);
    // Safari's own page-zoom gesture never fires inside the grid
    scroll.addEventListener('gesturestart', function(e) { e.preventDefault(); });
    scroll.addEventListener('gesturechange', function(e) { e.preventDefault(); });
}

// Move the red now-line without a full re-render (called every minute)
function updateNowLine() {
    var line = document.querySelector('.gc-col.today .gc-now');
    if (!line) return;
    var today = getLocalDateString();
    var col = line.parentNode;
    if (col.getAttribute('data-date') !== today) { renderView(); return; }
    var nowAbs = currentNowAbs();
    line.style.top = 'calc(var(--hh) * ' + ((nowAbs - dayNum(today) * 1440) / 60).toFixed(4) + ')';
}

function matchesSearch(inst, q) {
    var s = String(q || '').trim().toLowerCase();
    if (!s) return true;
    var cal = inst.calendarId ? getCalendar(inst.calendarId) : null;
    var hay = [displayTitle(inst), inst.location, inst.notes, inst.patientName, inst.chartNumber, inst.procedure, inst.chair, cal ? cal.name : '', EVENT_TYPES[inst.type]].join(' ').toLowerCase();
    return s.split(/\s+/).every(function(tok) { return hay.indexOf(tok) !== -1; });
}
