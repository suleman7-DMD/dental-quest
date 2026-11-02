// ============================================================================
// SULLY CALENDAR — render-month.js
// Month view (spanning bars, dot-style timed chips, measured "+N more"),
// Year view (12 mini months with busy-day dots), and the day-list popover.
// Pure DOM build; no state mutation, never saves.
// ============================================================================

var MONTH_LANE_H = 22;
var MONTH_HEAD_H = 28;

function monthLayout(insts, days) {
    var idx = {};
    days.forEach(function(d, i) { idx[d] = i; });
    var first = days[0], last = days[days.length - 1];
    var bars = [];
    insts.forEach(function(inst) {
        var span = inAllDayStrip(inst);
        var s = inst.startDate, e;
        if (span) e = inst.allDay ? inst.endDate : (instanceEndAbs(inst) % 1440 === 0 ? addDays(inst.endDate, -1) : inst.endDate);
        else e = s;
        if (e < first || s > last) return;
        var cs = s < first ? first : s, ce = e > last ? last : e;
        var si = null, ei = null;
        for (var d = cs; d <= ce; d = addDays(d, 1)) { if (idx[d] !== undefined) { if (si === null) si = idx[d]; ei = idx[d]; } }
        if (si === null) return;
        bars.push({ inst: inst, si: si, ei: ei, span: span, contL: s < first, contR: e > last });
    });
    bars.sort(function(a, b) {
        return a.si - b.si || (b.ei - b.si) - (a.ei - a.si) || (a.span === b.span ? 0 : a.span ? -1 : 1) || compareInstances(a.inst, b.inst);
    });
    var lanes = [];
    bars.forEach(function(b) {
        for (var l = 0; ; l++) {
            if (!lanes[l]) lanes[l] = [];
            if (!lanes[l].some(function(o) { return o.si <= b.ei && o.ei >= b.si; })) { lanes[l].push(b); b.lane = l; break; }
        }
    });
    return bars;
}

function monthChipHtml(b, nowAbs, cols, top) {
    var inst = b.inst;
    var left = (b.si / cols) * 100, width = ((b.ei - b.si + 1) / cols) * 100;
    var pos = 'left:calc(' + left + '% + 2px);width:calc(' + width + '% - 5px);top:' + top + 'px;';
    var title = escapeHtml(displayTitle(inst));
    if (b.span || inst.allDay) {
        var c = chipColors(inst, nowAbs);
        return '<div class="gc-chip gc-m-chip ' + chipClasses(inst) + (b.contL ? ' cont-l' : '') + (b.contR ? ' cont-r' : '') + '" data-key="' + escapeHtml(inst.key) + '" style="' + pos + 'background:' + c.bg + ';color:' + c.fg + '" title="' + title + '">' +
            chipIcon(inst) + (inst.allDay ? '' : '<span class="gc-chip-time">' + escapeHtml(fmtTime(inst.startTime, state.settings.timeFormat)) + '</span> ') + '<span class="gc-chip-title">' + title + '</span></div>';
    }
    var hex = instColorHex(inst);
    var past = state.settings.dimPastEvents && isPastInstance(inst, nowAbs);
    var point = (inst.type === 'task' || inst.type === 'deadline');
    var dot = point ? icon(inst.type === 'deadline' && !inst.done ? 'flag' : (inst.done ? 'check_circle' : 'radio_button_unchecked'), 'gc-m-ic" style="color:' + hex)
        : '<span class="gc-dot" style="background:' + hex + '"></span>';
    return '<div class="gc-chip gc-m-timed ' + chipClasses(inst) + (past ? ' past' : '') + '" data-key="' + escapeHtml(inst.key) + '" style="' + pos + '" title="' + title + '">' +
        dot + '<span class="gc-chip-time">' + escapeHtml(fmtTime(inst.startTime, state.settings.timeFormat)) + '</span> <span class="gc-chip-title">' + title + '</span></div>';
}

function monthWeeks(anchor) {
    var first = startOfMonth(anchor), last = endOfMonth(anchor);
    var start = startOfWeek(first, state.settings.weekStart);
    var weeks = [];
    for (var w = start; w <= last; w = addDays(w, 7)) {
        var row = [];
        for (var i = 0; i < 7; i++) {
            var d = addDays(w, i), wd = weekdayOf(d);
            if (!state.settings.showWeekends && (wd === 0 || wd === 6)) continue;
            row.push(d);
        }
        weeks.push(row);
    }
    return weeks;
}

function renderMonth(main) {
    var weeks = monthWeeks(currentDate);
    var cols = weeks[0].length;
    var today = getLocalDateString();
    var month = ymdParts(currentDate).m;
    var nowAbs = currentNowAbs();
    var showWk = state.settings.showWeekNumbers;
    var head = '<div class="gc-month-head' + (showWk ? ' wk' : '') + '" style="--cols:' + cols + '">' + (showWk ? '<div class="gc-wk-col"></div>' : '') +
        weeks[0].map(function(d) { return '<div class="gc-month-dow">' + DOW_SHORT[weekdayOf(d)].toUpperCase() + '</div>'; }).join('') + '</div>';
    var rows = weeks.map(function(row, ri) {
        return '<div class="gc-month-row' + (showWk ? ' wk' : '') + '" data-row="' + ri + '">' +
            (showWk ? '<div class="gc-wk-col">' + isoWeekNumber(row[0]) + '</div>' : '') +
            '<div class="gc-month-inner" style="--cols:' + cols + '"><div class="gc-month-cells">' + row.map(function(d) {
                var p = ymdParts(d);
                var label = p.d === 1 ? MONTHS_SHORT[p.m - 1] + ' ' + p.d : String(p.d);
                return '<div class="gc-month-cell' + (p.m !== month ? ' other' : '') + (d === today ? ' today' : '') + (d < today ? ' past' : '') + '" data-date="' + d + '">' +
                    '<button class="gc-mdate" data-goto="' + d + '" title="' + escapeHtml(fmtDateLong(d)) + '">' + label + '</button></div>';
            }).join('') + '</div><div class="gc-month-bars"></div></div></div>';
    }).join('');
    main.innerHTML = '<div class="gc-month-view">' + head + '<div class="gc-month-grid" style="--rows:' + weeks.length + '">' + rows + '</div></div>';

    var first = weeks[0][0], last = weeks[weeks.length - 1][weeks[weeks.length - 1].length - 1];
    var insts = getInstancesInRange(first, last);
    if (searchQuery) insts = insts.filter(function(i) { return matchesSearch(i, searchQuery); });
    var draft = draftInstance();
    if (draft) insts.push(draft);
    instIndex = {};
    insts.forEach(function(i) { instIndex[i.key] = i; });

    var rowEls = main.querySelectorAll('.gc-month-row');
    var rowH = rowEls.length ? rowEls[0].clientHeight : 120;
    var maxLanes = Math.max(1, Math.floor((rowH - MONTH_HEAD_H - 2) / MONTH_LANE_H));
    weeks.forEach(function(row, ri) {
        var bars = monthLayout(insts, row);
        var perDay = {};
        bars.forEach(function(b) { for (var i = b.si; i <= b.ei; i++) perDay[i] = Math.max(perDay[i] || 0, b.lane + 1); });
        var hidden = {};
        var html = bars.map(function(b) {
            // a day that overflows keeps (maxLanes - 1) lanes and shows "+N more" in the last
            var overflow = false;
            for (var i = b.si; i <= b.ei; i++) if ((perDay[i] || 0) > maxLanes && b.lane >= maxLanes - 1) overflow = true;
            if (overflow) {
                for (var j = b.si; j <= b.ei; j++) hidden[j] = (hidden[j] || 0) + 1;
                return '';
            }
            return monthChipHtml(b, nowAbs, row.length, MONTH_HEAD_H + b.lane * MONTH_LANE_H);
        }).join('');
        Object.keys(hidden).forEach(function(i) {
            html += '<button class="gc-m-more" data-more-date="' + row[+i] + '" style="left:calc(' + (+i / row.length * 100) + '% + 2px);width:calc(' + (100 / row.length) + '% - 5px);top:' + (MONTH_HEAD_H + (maxLanes - 1) * MONTH_LANE_H) + 'px">' + hidden[i] + ' more</button>';
        });
        rowEls[ri].querySelector('.gc-month-bars').innerHTML = html;
    });
    main.querySelectorAll('[data-more-date]').forEach(function(b) {
        b.addEventListener('click', function(e) { e.stopPropagation(); openDayListPopover(b.getAttribute('data-more-date'), b); });
    });
    main.querySelectorAll('[data-goto]').forEach(function(b) {
        b.addEventListener('click', function(e) { e.stopPropagation(); goToDate(b.getAttribute('data-goto'), 'day'); });
    });
}

// ---------------------------------------------------------------- year view
function renderYear(main) {
    var y = ymdParts(currentDate).y;
    var today = getLocalDateString();
    var insts = getInstancesInRange(makeYMD(y, 1, 1), makeYMD(y, 12, 31));
    if (searchQuery) insts = insts.filter(function(i) { return matchesSearch(i, searchQuery); });
    var busy = {};
    insts.forEach(function(i) {
        var end = i.allDay ? i.endDate : i.startDate;
        var cap = addDays(i.startDate, 62);
        if (end > cap) end = cap;
        for (var d = i.startDate; d <= end; d = addDays(d, 1)) {
            if (!busy[d]) busy[d] = [];
            if (busy[d].length < 3) busy[d].push(instColorHex(i));
        }
    });
    var ws = state.settings.weekStart;
    var html = '<div class="gc-year-view">';
    for (var m = 1; m <= 12; m++) {
        var first = makeYMD(y, m, 1);
        var start = startOfWeek(first, ws);
        html += '<div class="gc-ymonth"><button class="gc-ymonth-name" data-month="' + first + '">' + MONTHS[m - 1] + '</button><div class="gc-ygrid">';
        for (var k = 0; k < 7; k++) html += '<div class="gc-ydow">' + DOW[(ws + k) % 7].charAt(0) + '</div>';
        for (var i = 0; i < 42; i++) {
            var d = addDays(start, i);
            var p = ymdParts(d);
            if (p.m !== m) { html += '<div class="gc-yday out"></div>'; continue; }
            var dots = busy[d] ? '<span class="gc-ydots">' + busy[d].map(function(c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' : '';
            html += '<button class="gc-yday' + (d === today ? ' today' : '') + (busy[d] ? ' busy' : '') + '" data-yday="' + d + '" title="' + escapeHtml(fmtDateLong(d)) + '">' + p.d + dots + '</button>';
        }
        html += '</div></div>';
    }
    html += '</div>';
    main.innerHTML = html;
    instIndex = {};
    main.querySelectorAll('[data-yday]').forEach(function(b) {
        b.addEventListener('click', function() { openDayListPopover(b.getAttribute('data-yday'), b); });
    });
    main.querySelectorAll('[data-month]').forEach(function(b) {
        b.addEventListener('click', function() { goToDate(b.getAttribute('data-month'), 'month'); });
    });
}

// ---------------------------------------------------------------- day list popover ("+N more", year view)
function openDayListPopover(date, anchor) {
    var insts = getInstancesInRange(date, date);
    if (searchQuery) insts = insts.filter(function(i) { return matchesSearch(i, searchQuery); });
    insts.forEach(function(i) { instIndex[i.key] = i; });
    var nowAbs = currentNowAbs();
    var p = ymdParts(date);
    var fmt = state.settings.timeFormat;
    var list = insts.map(function(i) {
        var c = chipColors(i, nowAbs);
        if (i.allDay || inAllDayStrip(i)) {
            return '<div class="gc-chip gc-dl-chip ' + chipClasses(i) + '" data-key="' + escapeHtml(i.key) + '" style="background:' + c.bg + ';color:' + c.fg + '">' + chipIcon(i) + '<span class="gc-chip-title">' + escapeHtml(displayTitle(i)) + '</span></div>';
        }
        return '<div class="gc-chip gc-dl-chip gc-m-timed ' + chipClasses(i) + '" data-key="' + escapeHtml(i.key) + '"><span class="gc-dot" style="background:' + instColorHex(i) + '"></span><span class="gc-chip-time">' + escapeHtml(fmtTime(i.startTime, fmt)) + '</span> <span class="gc-chip-title">' + escapeHtml(displayTitle(i)) + '</span></div>';
    }).join('');
    var html = '<div class="gc-pop-actions"><button class="gc-icon-btn" data-close title="Close">' + icon('close') + '</button></div>' +
        '<div class="gc-daylist"><div class="gc-daylist-head"><div class="gc-dow">' + DOW_SHORT[weekdayOf(date)].toUpperCase() + '</div>' +
        '<button class="gc-daylist-num' + (date === getLocalDateString() ? ' today' : '') + '" data-goto="' + date + '">' + p.d + '</button></div>' +
        '<div class="gc-daylist-items">' + (list || '<div class="gc-muted gc-daylist-empty">No events</div>') + '</div>' +
        '<button class="gc-btn text sm gc-daylist-add" data-add="' + date + '">' + icon('add') + ' Add event</button></div>';
    var el = openPopover(html, anchor, { className: 'gc-daylist-pop' });
    el.querySelector('[data-goto]').addEventListener('click', function() { closePopover(); goToDate(date, 'day'); });
    el.querySelector('[data-add]').addEventListener('click', function() {
        closePopover();
        openEditor({ draft: { startDate: date, endDate: date, allDay: false, startTime: '09:00', type: 'event' } });
    });
    el.querySelectorAll('[data-key]').forEach(function(chip) {
        chip.addEventListener('click', function(e) {
            e.stopPropagation();
            var inst = instIndex[chip.getAttribute('data-key')] || getEventInstanceByKey(chip.getAttribute('data-key'));
            var r = chip.getBoundingClientRect();
            closePopover(true);
            openEventDetails(inst, r);
        });
    });
}
