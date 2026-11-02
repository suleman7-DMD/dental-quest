// ============================================================================
// SULLY CALENDAR — render-grid.js
// Time-grid views (day / 3-day / 4-day / week): sticky day header, all-day
// lanes with collapse, 24h body with Google-style cascading overlap layout,
// current-time line, quick-create draft ghost. Pure DOM build — pointer
// interaction lives in dragdrop.js; no state mutation, never saves.
// ============================================================================

var instIndex = {};          // key → instance for everything currently rendered
var lastGridRangeKey = null; // re-scroll to day start only when the range changes

function hourHeight() { return state.settings.density === 'compact' ? 36 : 48; }

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

function allDayChipHtml(b, nowAbs, cols) {
    var inst = b.inst;
    var c = chipColors(inst, nowAbs);
    var left = (b.si / cols) * 100, width = ((b.ei - b.si + 1) / cols) * 100;
    var timePrefix = (!inst.allDay && inst.startDate >= inst.startDate) ? '<span class="gc-chip-time">' + escapeHtml(fmtTime(inst.startTime, state.settings.timeFormat)) + '</span> ' : '';
    return '<div class="gc-chip gc-ad-chip ' + chipClasses(inst) + (b.contL ? ' cont-l' : '') + (b.contR ? ' cont-r' : '') + '" data-key="' + escapeHtml(inst.key) + '"' +
        ' style="left:calc(' + left + '% + 2px);width:calc(' + width + '% - 6px);top:' + (b.lane * 24 + 2) + 'px;background:' + c.bg + ';color:' + c.fg + '" title="' + escapeHtml(displayTitle(inst)) + '">' +
        (b.contL ? icon('chevron_left', 'gc-cont') : '') + chipIcon(inst) + (inst.allDay ? '' : timePrefix) + '<span class="gc-chip-title">' + escapeHtml(displayTitle(inst)) + '</span>' +
        (b.contR ? icon('chevron_right', 'gc-cont') : '') + '</div>';
}

// ---------------------------------------------------------------- timed blocks
function timedChipHtml(it, nowAbs, hourH) {
    var inst = it.inst;
    var c = chipColors(inst, nowAbs);
    var top = it.s / 60 * hourH;
    var visualEnd = Math.max(it.e, it.s + 15);
    var height = Math.max(18, (visualEnd - it.s) / 60 * hourH - 2);
    var n = it.ncols, w = it.span / n;
    var left = it.col / n;
    if (n > 1 && it.col + it.span < n) w = Math.min(1 - left, w * 1.6); // cascade like Google
    var fmt = state.settings.timeFormat;
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
        ' style="top:' + top + 'px;height:' + height + 'px;left:calc(' + (left * 100) + '% + 1px);width:calc(' + (w * 100) + '% - 4px);background:' + c.bg + ';color:' + c.fg + ';z-index:' + z + '"' +
        ' title="' + escapeHtml(displayTitle(inst) + ' · ' + timeTxt + (inst.location ? ' · ' + inst.location : '')) + '">' + body +
        (inst.readOnly ? '' : '<div class="gc-ev-resize" data-resize="1"></div>') + '</div>';
}

// ---------------------------------------------------------------- main render
function renderTimeGrid(main, days) {
    var hourH = hourHeight();
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
    var collapsedLanes = 2;
    var expandable = ad.laneCount > 3;
    var expanded = ui.allDayExpanded || !expandable;
    var shownLanes = expanded ? ad.laneCount : collapsedLanes;
    var adHeight = Math.max(1, shownLanes) * 24 + (expanded ? 4 : 26);
    if (!ad.laneCount) adHeight = 8;

    // scroll memory
    var oldScroll = $('gcGridScroll');
    var rangeKey = state.settings.density + '|' + first + '|' + last;
    var keepTop = oldScroll && lastGridRangeKey === rangeKey ? oldScroll.scrollTop : null;
    var keepTopSameView = oldScroll && keepTop === null && lastGridRangeKey && lastGridRangeKey.split('|')[0] === state.settings.density ? oldScroll.scrollTop : null;

    var weekNum = state.settings.showWeekNumbers ? '<span class="gc-weeknum">W' + isoWeekNumber(first) + '</span>' : '';
    var tz = (function() {
        try { var off = -new Date().getTimezoneOffset() / 60; return 'GMT' + (off >= 0 ? '+' : '-') + pad2(Math.abs(Math.trunc(off))); } catch (e) { return ''; }
    })();

    var head = '<div class="gc-grid-head"><div class="gc-gutter-head">' + weekNum + '<span class="gc-tz">' + tz + '</span></div><div class="gc-head-days" style="--cols:' + cols + '">' +
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
        return allDayChipHtml(b, nowAbs, cols);
    }).join('');
    var moreBtns = '';
    if (!expanded) {
        Object.keys(hiddenCount).forEach(function(i) {
            moreBtns += '<button class="gc-ad-more" data-more-date="' + days[+i] + '" style="left:calc(' + (+i / cols * 100) + '% + 2px);width:calc(' + (100 / cols) + '% - 6px);top:' + (collapsedLanes * 24 + 2) + 'px">' + hiddenCount[i] + ' more</button>';
        });
    }
    var adCells = days.map(function(d, i) {
        return '<div class="gc-allday-cell' + (d === today ? ' today' : '') + '" data-date="' + d + '" data-i="' + i + '"></div>';
    }).join('');
    var allDayRow = '<div class="gc-allday-row"><div class="gc-gutter-allday">' +
        (expandable ? '<button class="gc-icon-btn sm" data-act="toggle-allday" title="' + (expanded ? 'Collapse all-day events' : 'Show all all-day events') + '">' + icon(expanded ? 'expand_less' : 'expand_more') + '</button>' : '') +
        '</div><div class="gc-allday-area" style="--cols:' + cols + ';height:' + adHeight + 'px">' + adCells + adChips + moreBtns + '</div><div class="gc-scroll-pad"></div></div>';

    // body
    var hours = '';
    for (var h = 1; h < 24; h++) hours += '<div class="gc-hour-label" style="top:' + (h * hourH) + 'px"><span>' + fmtHourLabel(h, fmt) + '</span></div>';
    var colsHtml = days.map(function(d) {
        var dayStart = dayNum(d) * 1440, dayEnd = dayStart + 1440;
        var items = [];
        timed.forEach(function(inst) {
            var s = instanceStartAbs(inst), e = instanceEndAbs(inst);
            var point = e <= s;
            if (point ? (s < dayStart || s >= dayEnd) : (e <= dayStart || s >= dayEnd)) return;
            var ss = Math.max(s, dayStart) - dayStart, ee = Math.min(point ? s + 30 : e, dayEnd) - dayStart;
            if (point) ee = Math.min(ss + 30, 1440);
            items.push({ inst: inst, s: ss, e: Math.max(ee, ss + 15), contTop: s < dayStart, contBottom: e > dayEnd });
        });
        layoutColumn(items);
        var evHtml = items.map(function(it) { return timedChipHtml(it, nowAbs, hourH); }).join('');
        var nowLine = d === today ? '<div class="gc-now" style="top:' + ((nowAbs - dayStart) / 60 * hourH) + 'px"></div>' : '';
        return '<div class="gc-col' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + ([0, 6].indexOf(weekdayOf(d)) !== -1 ? ' weekend' : '') + '" data-date="' + d + '">' + evHtml + nowLine + '</div>';
    }).join('');
    var body = '<div class="gc-grid-scroll" id="gcGridScroll"><div class="gc-grid-body" style="height:' + (24 * hourH) + 'px;--hour-h:' + hourH + 'px">' +
        '<div class="gc-hours">' + hours + '</div><div class="gc-cols" style="--cols:' + cols + '">' + colsHtml + '</div></div></div>';

    main.innerHTML = '<div class="gc-grid-view' + (cols === 1 ? ' single' : '') + '" style="--cols:' + cols + '">' + head + allDayRow + body + '</div>';

    var scroll = $('gcGridScroll');
    if (keepTop !== null) scroll.scrollTop = keepTop;
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

    var tog = main.querySelector('[data-act=toggle-allday]');
    if (tog) tog.addEventListener('click', function() { ui.allDayExpanded = !ui.allDayExpanded; saveUiPrefs(); renderView(); });
    main.querySelectorAll('[data-more-date]').forEach(function(b) {
        b.addEventListener('click', function(e) { e.stopPropagation(); openDayListPopover(b.getAttribute('data-more-date'), b); });
    });
    main.querySelectorAll('[data-goto]').forEach(function(b) {
        b.addEventListener('click', function(e) { e.stopPropagation(); goToDate(b.getAttribute('data-goto'), 'day'); });
    });
}

// Move the red now-line without a full re-render (called every minute)
function updateNowLine() {
    var line = document.querySelector('.gc-col.today .gc-now');
    if (!line) return;
    var today = getLocalDateString();
    var col = line.parentNode;
    if (col.getAttribute('data-date') !== today) { renderView(); return; }
    var nowAbs = currentNowAbs();
    line.style.top = ((nowAbs - dayNum(today) * 1440) / 60 * hourHeight()) + 'px';
}

function matchesSearch(inst, q) {
    var s = String(q || '').trim().toLowerCase();
    if (!s) return true;
    var cal = inst.calendarId ? getCalendar(inst.calendarId) : null;
    var hay = [displayTitle(inst), inst.location, inst.notes, inst.patientName, inst.chartNumber, inst.procedure, inst.chair, cal ? cal.name : '', EVENT_TYPES[inst.type]].join(' ').toLowerCase();
    return s.split(/\s+/).every(function(tok) { return hay.indexOf(tok) !== -1; });
}
