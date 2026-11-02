// ============================================================================
// SULLY CALENDAR — render-agenda.js
// Schedule view (day-grouped list from the anchor date, month separators,
// now marker, inline task checkboxes, load more) and search results.
// Pure DOM build; task toggles go through userToggleDone (events.js).
// ============================================================================

var scheduleSpanDays = 60;
var searchShowPast = false;

function agendaRowHtml(inst, nowAbs, today) {
    var fmt = state.settings.timeFormat;
    var hex = instColorHex(inst);
    var time;
    if (inst.allDay) time = inst.endDate !== inst.startDate ? 'All day' : 'All day';
    else if ((inst.type === 'task' || inst.type === 'deadline') && inst.startTime === inst.endTime) time = (inst.type === 'deadline' ? 'Due ' : '') + fmtTime(inst.startTime, fmt);
    else if (inst.startDate !== inst.endDate) time = fmtTime(inst.startTime, fmt) + ' →';
    else time = fmtTimeRange(inst.startTime, inst.endTime, fmt);
    var past = state.settings.dimPastEvents && isPastInstance(inst, nowAbs);
    var isTask = inst.type === 'task' || inst.type === 'deadline';
    var cal = inst.calendarId ? getCalendar(inst.calendarId) : null;
    var sub = [];
    if (inst.type === 'appointment') {
        if (inst.procedure && inst.title) sub.push(firstLine(inst.procedure));
        if (inst.chartNumber) sub.push('Chart ' + inst.chartNumber);
        if (inst.chair) sub.push('Chair ' + inst.chair);
    }
    if (inst.location) sub.push(inst.location);
    if (inst.overlay) sub.push(OVERLAY_DEFS[inst.overlay].name);
    else if (cal && isPhone()) sub.push(cal.name);
    var lead = isTask && !inst.readOnly
        ? '<button class="gc-ag-check' + (inst.done ? ' on' : '') + '" data-toggle="' + escapeHtml(inst.key) + '" style="--c:' + hex + '" title="' + (inst.done ? 'Mark uncompleted' : 'Mark completed') + '">' + icon(inst.done ? 'check_circle' : (inst.type === 'deadline' ? 'flag' : 'radio_button_unchecked')) + '</button>'
        : '<span class="gc-ag-dot" style="background:' + hex + '"></span>';
    return '<div class="gc-ag-row ' + chipClasses(inst) + (past ? ' past' : '') + '" data-key="' + escapeHtml(inst.key) + '" tabindex="0">' +
        lead + '<span class="gc-ag-time">' + escapeHtml(time) + '</span>' +
        '<span class="gc-ag-main"><span class="gc-ag-title">' + (inst.type === 'appointment' ? icon('dentistry', 'gc-ag-ic') : '') + escapeHtml(displayTitle(inst)) +
        (isOverdue(inst) ? ' <span class="gc-overdue-pill">Overdue</span>' : '') + '</span>' +
        (sub.length ? '<span class="gc-ag-sub">' + escapeHtml(sub.join(' · ')) + '</span>' : '') + '</span></div>';
}

function agendaDayHtml(d, list, today, nowAbs) {
    var p = ymdParts(d);
    var rows = '';
    var nowPlaced = d !== today;
    list.forEach(function(inst) {
        if (!nowPlaced && !inst.allDay && instanceStartAbs(inst) > nowAbs) {
            rows += '<div class="gc-ag-now"></div>';
            nowPlaced = true;
        }
        rows += agendaRowHtml(inst, nowAbs, today);
    });
    if (!nowPlaced) rows += '<div class="gc-ag-now"></div>';
    return '<div class="gc-ag-day' + (d === today ? ' today' : '') + (d < today ? ' past' : '') + '" data-date="' + d + '">' +
        '<button class="gc-ag-date" data-goto="' + d + '"><span class="gc-ag-num">' + p.d + '</span><span class="gc-ag-dow">' + MONTHS_SHORT[p.m - 1].toUpperCase() + ', ' + DOW_SHORT[weekdayOf(d)].toUpperCase() + '</span></button>' +
        '<div class="gc-ag-list">' + rows + '</div></div>';
}

function groupByDay(insts, from, to) {
    var byDay = {};
    insts.forEach(function(i) {
        // multi-day items appear on each day they cover (within range), like Google's schedule
        var end = i.allDay ? i.endDate : i.startDate;
        var d = i.startDate < from ? from : i.startDate;
        var stop = end > to ? to : end;
        for (var k = 0; d <= stop && k < 62; d = addDays(d, 1), k++) (byDay[d] = byDay[d] || []).push(i);
    });
    return byDay;
}

function renderSchedule(main) {
    if (searchQuery) { renderSearchResults(main); return; }
    var today = getLocalDateString();
    var nowAbs = currentNowAbs();
    var from = currentDate, to = addDays(currentDate, scheduleSpanDays - 1);
    var insts = getInstancesInRange(from, to);
    instIndex = {};
    insts.forEach(function(i) { instIndex[i.key] = i; });
    var byDay = groupByDay(insts, from, to);
    var html = '<div class="gc-agenda" id="gcAgenda">';
    var lastMonth = null;
    var any = false;
    Object.keys(byDay).sort().forEach(function(d) {
        var p = ymdParts(d);
        var mk = p.y + '-' + p.m;
        if (mk !== lastMonth) {
            html += '<div class="gc-ag-month">' + MONTHS[p.m - 1] + ' ' + p.y + '</div>';
            lastMonth = mk;
        }
        html += agendaDayHtml(d, byDay[d], today, nowAbs);
        any = true;
    });
    if (!any) html += '<div class="gc-empty">' + icon('event_available') + '<div><b>Nothing planned</b><br><span class="gc-muted">' + escapeHtml(fmtDateMed(from) + ' – ' + fmtDateMed(to)) + '. Press C to create, or paste from Claude.</span></div></div>';
    html += '<div class="gc-ag-more"><button class="gc-btn outlined sm" data-act="more">' + icon('expand_more') + ' Show more (through ' + escapeHtml(fmtDateMed(addDays(to, 60))) + ')</button></div></div>';
    main.innerHTML = html;
    wireAgenda(main);
    main.querySelector('[data-act=more]').addEventListener('click', function() {
        var sc = main.querySelector('.gc-agenda');
        var top = sc ? sc.scrollTop : 0;
        scheduleSpanDays += 60;
        renderView();
        var sc2 = main.querySelector('.gc-agenda');
        if (sc2) sc2.scrollTop = top;
    });
}

function renderSearchResults(main) {
    var today = getLocalDateString();
    var nowAbs = currentNowAbs();
    var from = addDays(today, -365), to = addDays(today, 730);
    var insts = getInstancesInRange(from, to, { includeDone: true }).filter(function(i) { return matchesSearch(i, searchQuery); });
    instIndex = {};
    insts.forEach(function(i) { instIndex[i.key] = i; });
    var upcoming = insts.filter(function(i) { return (i.allDay ? i.endDate >= today : instanceEndAbs(i) > nowAbs); });
    var past = insts.filter(function(i) { return upcoming.indexOf(i) === -1; });
    var html = '<div class="gc-agenda gc-search-results">' +
        '<div class="gc-search-head">' + icon('search') + '<span><b>' + insts.length + '</b> result' + (insts.length === 1 ? '' : 's') + ' for “' + escapeHtml(searchQuery) + '”</span>' +
        '<button class="gc-btn text sm" data-act="clearsearch">Clear search</button></div>';
    function block(list) {
        var byDay = {};
        list.forEach(function(i) { (byDay[i.startDate] = byDay[i.startDate] || []).push(i); });
        return Object.keys(byDay).sort().map(function(d) { return agendaDayHtml(d, byDay[d], today, nowAbs); }).join('');
    }
    if (past.length) {
        html += '<button class="gc-btn text sm gc-past-toggle" data-act="past">' + icon(searchShowPast ? 'expand_less' : 'expand_more') + (searchShowPast ? ' Hide ' : ' Show ') + past.length + ' past result' + (past.length === 1 ? '' : 's') + '</button>';
        if (searchShowPast) html += '<div class="gc-past-block">' + block(past) + '</div>';
    }
    html += upcoming.length ? block(upcoming) : '<div class="gc-empty">' + icon('search_off') + '<div><b>No upcoming results</b></div></div>';
    html += '</div>';
    main.innerHTML = html;
    wireAgenda(main);
    main.querySelector('[data-act=clearsearch]').addEventListener('click', function() { setSearch(''); });
    var pt = main.querySelector('[data-act=past]');
    if (pt) pt.addEventListener('click', function() { searchShowPast = !searchShowPast; renderView(); });
}

function wireAgenda(main) {
    main.querySelectorAll('[data-toggle]').forEach(function(b) {
        b.addEventListener('click', function(e) {
            e.stopPropagation();
            var inst = instIndex[b.getAttribute('data-toggle')];
            if (inst) userToggleDone(inst);
        });
    });
    main.querySelectorAll('.gc-ag-row').forEach(function(r) {
        var open = function() {
            var inst = instIndex[r.getAttribute('data-key')];
            if (inst) openEventDetails(inst, r.querySelector('.gc-ag-title') || r);
        };
        r.addEventListener('click', open);
        r.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); open(); } });
    });
    main.querySelectorAll('[data-goto]').forEach(function(b) {
        b.addEventListener('click', function() { goToDate(b.getAttribute('data-goto'), 'day'); });
    });
}
