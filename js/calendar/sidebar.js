// ============================================================================
// SULLY CALENDAR — sidebar.js
// Create menu, natural-language quick add (live preview chips), mini month,
// "Up next" + overdue card, My calendars (toggle / display only / color /
// settings / delete), Other calendars (US holidays + READ-ONLY Grad Roadmap
// feeds: clinic appointments, deadlines, D4 schedule), calendar dialog.
// ============================================================================

var miniAnchor = null;  // month shown in the mini calendar (follows currentDate unless navigated)
var roadmapOverlay = { loaded: false, loading: false, error: null, fetchedAt: 0, items: { rmAppointments: [], rmDeadlines: [], rmD4: [] } };

function renderSidebar() {
    renderMiniCal();
    renderUpNext();
    renderCalendarLists();
}

// ---------------------------------------------------------------- create menu + quick add
function openCreateMenu(anchor) {
    var today = getLocalDateString();
    var base = currentDate || today;
    var start = nextHalfHour();
    openMenu(anchor, [
        { label: 'Event', icon: 'event', hint: 'C', onClick: function() { openEditor({ draft: { type: 'event', startDate: base, startTime: start } }); } },
        { label: 'Task', icon: 'task_alt', onClick: function() { openEditor({ draft: { type: 'task', startDate: base, allDay: true } }); } },
        { label: 'Deadline', icon: 'flag', onClick: function() { openEditor({ draft: { type: 'deadline', startDate: base, allDay: false, startTime: '23:59' } }); } },
        { label: 'Patient appointment', icon: 'dentistry', onClick: function() { openEditor({ draft: { type: 'appointment', startDate: base, startTime: '09:00' } }); } },
        { divider: true },
        { label: 'Paste from Claude…', icon: 'content_paste', hint: 'I', onClick: function() { openImportDialog('paste'); } }
    ]);
}

// ---------------------------------------------------------------- quick add (shared by the sidebar box + phone sheet)
// Free text → spec with every understood piece shown as a chip before anything is saved.
function quickAddBuild(text, typeVerb) {
    var t = String(text || '').trim();
    if (!t) return null;
    var op = { verb: typeVerb || 'EVENT', fields: {}, quick: t, checked: false, line: 1, interactive: true };
    var built = buildEventSpec(op, { today: getLocalDateString(), settings: state.settings });
    // a schedule that changes partway ("…until nov 15 then tue/thu/fri until nov 29") → one part per series
    var parts = (built.specs || [built.spec]).map(function(spec) {
        if (typeVerb === 'EVENT') spec.type = 'event';
        // "#green" with no calendar called green → a color, not a new calendar
        if (spec.calendarRef && !findCalendarByName(spec.calendarRef) && quickColorKey(spec.calendarRef)) {
            spec.color = quickColorKey(spec.calendarRef);
            spec.calendarRef = null;
        }
        var cal = spec.calendarRef ? findCalendarByName(spec.calendarRef) : getCalendar(getCalendarForTypePreview(spec.type));
        var calName = spec.calendarRef && !cal ? spec.calendarRef.replace(/\b\w/g, function(x) { return x.toUpperCase(); }) + ' (new calendar)' : (cal ? cal.name : '');
        var hex = spec.color ? colorHex(spec.color) : (cal ? colorHex(cal.color) : calendarColorHex(getCalendarForTypePreview(spec.type)));
        return { spec: spec, cal: cal, calName: calName, hex: hex, when: fmtWhen(spec, state.settings, getLocalDateString()) };
    });
    var r = parts[0];
    return { op: op, spec: r.spec, parts: parts, errors: built.errors, warnings: built.warnings, cal: r.cal, calName: r.calName, hex: r.hex, when: r.when };
}

function quickAddCardHtml(r) {
    if (r.parts && r.parts.length > 1) {
        var warn = (r.errors || []).concat(r.warnings || []);
        var warnHtml = warn.length ? '<div class="gc-qa-warn">' + warn.map(escapeHtml).join('<br>') + '</div>' : '';
        var f = r.parts[0].spec;
        // the same thing on several days ("nov 26-28 8am-7pm") → one card listing the days
        if (r.parts.every(function(p) { var x = p.spec; return !x.recurrence && x.title === f.title && x.type === f.type && x.allDay === f.allDay && x.startTime === f.startTime && x.endTime === f.endTime && x.color === f.color; })) {
            var today = getLocalDateString();
            var dayCard = quickAddCardHtml({ op: r.op, spec: f, cal: r.parts[0].cal, calName: r.parts[0].calName, hex: r.parts[0].hex, errors: [],
                when: f.allDay ? 'All day' : fmtTimeRange(f.startTime, f.endTime, (state.settings && state.settings.timeFormat) || '12h') });
            var days = '<div class="gc-qa-chips gc-qa-days">' + r.parts.map(function(p) { return '<span class="gc-qa-chip">' + icon('today') + escapeHtml(fmtDateMed(p.spec.startDate, today)) + '</span>'; }).join('') + '</div>';
            return '<div class="gc-qa-multi-head">' + icon('calendar_month') + '<span><b>' + r.parts.length + ' separate events</b> — one on each day</span></div>' +
                dayCard.replace(/<\/div><\/div>$/, days + '</div></div>') + warnHtml;
        }
        var allRepeat = r.parts.every(function(p) { return p.spec.recurrence; });
        return '<div class="gc-qa-multi-head">' + icon('event_repeat') + '<span><b>' + r.parts.length + (allRepeat ? ' repeating series' : ' items') + '</b> from one line</span></div>' +
            r.parts.map(function(p) { return quickAddCardHtml({ op: r.op, spec: p.spec, cal: p.cal, calName: p.calName, hex: p.hex, when: p.when, errors: [] }); }).join('') + warnHtml;
    }
    var spec = r.spec;
    var chip = function(ic, txt, extra) { return '<span class="gc-qa-chip">' + (extra || icon(ic)) + escapeHtml(txt) + '</span>'; };
    var chips = [];
    if (spec.recurrence) chips.push(chip('repeat', describeRecurrence(spec.recurrence, spec.startDate)));
    if (spec.exceptions && Object.keys(spec.exceptions).length) {
        chips.push(chip('event_busy', 'Skips ' + Object.keys(spec.exceptions).sort().map(fmtDateShort).join(', ')));
    }
    if (spec.color) chips.push(chip('', colorName(spec.color), '<span class="gc-dot" style="background:' + colorHex(spec.color) + '"></span>'));
    if (r.calName) chips.push(chip('calendar_today', r.calName));
    if (spec.location) chips.push(chip('location_on', spec.location));
    if (QUICK_REMINDER_RE.test(r.op.quick)) { // only when a reminder was said — defaults aren't news
        var rem = reminderMinutes(spec);
        chips.push(chip(rem.length ? 'alarm' : 'notifications_off', rem.length ? reminderLabel(rem[0], spec.allDay) : 'No reminder'));
    }
    if (spec.priority) chips.push(chip('flag', spec.priority.charAt(0).toUpperCase() + spec.priority.slice(1) + ' priority'));
    if (spec.notes) chips.push(chip('notes', spec.notes.length > 40 ? spec.notes.slice(0, 40) + '…' : spec.notes));
    return '<div class="gc-qa-card" style="--qa:' + r.hex + '"><span class="gc-qa-bar"></span><div class="gc-qa-main">' +
        '<div class="gc-qa-title">' + icon(typeIcon(spec.type), 'gc-qa-ic') + '<span>' + escapeHtml(spec.title || (spec.type === 'appointment' ? 'Patient appointment' : '(No title)')) + '</span></div>' +
        '<div class="gc-qa-when">' + escapeHtml(r.when) + '</div>' +
        (chips.length ? '<div class="gc-qa-chips">' + chips.join('') + '</div>' : '') +
        (r.errors && r.errors.length ? '<div class="gc-qa-warn">' + escapeHtml(r.errors[0]) + '</div>' : r.warnings && r.warnings.length ? '<div class="gc-qa-warn">' + escapeHtml(r.warnings[0]) + '</div>' : '') +
        '</div></div>';
}

function quickAddPreview(text) {
    var out = $('gcQuickPreview');
    if (!out) return null;
    var r = quickAddBuild(text);
    if (!r) { out.innerHTML = ''; out.hidden = true; return null; }
    out.hidden = false;
    var multi = r.parts.length > 1;
    out.innerHTML = quickAddCardHtml(r) + '<div class="gc-qa-hint">' + (multi ? 'Enter to add all ' + r.parts.length + ' · edit any one after' : 'Enter to add' + (isCoarsePointer() ? '' : ' · Shift+Enter for details')) + '</div>';
    return r;
}

function isCoarsePointer() {
    try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
}

// Saves a built quick-add — every series of a changing schedule, every day of a day list — as one undo step; returns the first event
function commitQuickAdd(r) {
    var ch = beginChange('quick add');
    var made = (r.parts || [{ spec: r.spec }]).map(function(p) {
        var spec = deepClone(p.spec);
        var calId = null;
        if (spec.calendarRef) {
            var c = findCalendarByName(spec.calendarRef); // the first series may have just created it
            calId = c ? c.id : createCalendar(spec.calendarRef.replace(/\b\w/g, function(x) { return x.toUpperCase(); }), null, TYPE_TO_KIND[spec.type] || 'general').id;
        }
        delete spec.calendarRef;
        spec.calendarId = calId;
        spec.source = 'quick';
        return createEventRecord(spec);
    });
    var ev = made[0];
    var today = getLocalDateString();
    if (made.length > 1) {
        var last = made.map(function(e) { return lastOccurrenceDate(e); });
        var end = last.indexOf(null) === -1 ? last.sort().pop() : null;
        var kind = made.every(function(e) { return e.recurrence; }) ? ' repeating series' : made.some(function(e) { return e.recurrence; }) ? ' items' : ' events';
        finishChange(ch, made.length + kind + ' added · ' + fmtDateMed(ev.startDate, today) + (end ? ' → ' + fmtDateMed(end, today) : ''));
    } else {
        finishChange(ch, (EVENT_TYPES[ev.type] || 'Event') + ' added · ' + fmtWhen(buildInstance(ev, null), state.settings, today));
    }
    if (ev.startDate !== currentDate && (ui.view === 'day' || ui.view === 'week' || ui.view === '3day' || ui.view === '4day' || !ui.view)) {
        var vis = getVisibleDays(ui.view || 'week', currentDate);
        if (vis.indexOf(ev.startDate) === -1) goToDate(ev.startDate);
    }
    return ev;
}

function quickAddToEditor(r) {
    var spec = deepClone(r.spec);
    var cal = spec.calendarRef ? findCalendarByName(spec.calendarRef) : null;
    spec.calendarId = cal ? cal.id : null;
    delete spec.calendarRef;
    openEditor({ draft: spec });
}

function submitQuickAdd(openDetails) {
    var input = $('gcQuickInput');
    var text = input.value.trim();
    if (!text) return;
    var r = quickAddPreview(text);
    if (!r) return;
    input.value = '';
    quickAddPreview('');
    if (openDetails && r.parts.length === 1) { quickAddToEditor(r); return; } // the editor holds one series; several just get added
    commitQuickAdd(r);
}

// ---------------------------------------------------------------- quick add sheet (phones: the + button)
// Drops from the top so the iPhone keyboard never covers the preview.
var QUICK_EXAMPLES = [
    'IPPM lecture tues mornings 8-10am until dec 18 blue',
    'task: call the lab about Chen\'s crown fri 3pm',
    'Dentist next thu 2pm @ BU Dental remind me 1 hour before',
    'PR2 write-up due nov 20 red',
    'Gym MWF 6am green'
];
function openQuickAddSheet(prefill) {
    closePopover(true);
    if (typeof closeMenu === 'function') closeMenu();
    var old = document.querySelector('.gc-qa-sheet-wrap');
    if (old) old.parentNode.removeChild(old);
    var typeVerb = '';
    var types = [['', 'Auto', 'auto_awesome'], ['EVENT', 'Event', 'event'], ['TASK', 'Task', 'task_alt'], ['DEADLINE', 'Deadline', 'flag'], ['APPOINTMENTS', 'Patient', 'dentistry']];
    var wrap = document.createElement('div');
    wrap.className = 'gc-qa-sheet-wrap';
    wrap.innerHTML = '<div class="gc-qa-scrim" data-close></div>' +
        '<div class="gc-qa-sheet" role="dialog" aria-modal="true" aria-label="Quick add">' +
        '<form class="gc-qa-sheet-top" autocomplete="off">' + icon('bolt') +
        '<textarea class="gc-qa-sheet-input" name="q" rows="1" enterkeyhint="done" autocomplete="off" autocapitalize="sentences" autocorrect="on" spellcheck="true" placeholder="Type or dictate — gym MWF 6am green" aria-label="Describe what to add"></textarea>' +
        '<button type="button" class="gc-icon-btn" data-close aria-label="Close">' + icon('close') + '</button></form>' +
        '<div class="gc-qa-sheet-preview"></div>' +
        '<div class="gc-qa-types" role="radiogroup" aria-label="Type">' + types.map(function(t) {
            return '<button type="button" class="gc-qa-type' + (t[0] === typeVerb ? ' sel' : '') + '" role="radio" aria-checked="' + (t[0] === typeVerb) + '" data-verb="' + t[0] + '">' + icon(t[2]) + t[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="gc-qa-sheet-actions">' +
        '<button type="button" class="gc-btn text sm" data-act="paste">' + icon('content_paste') + 'Paste from Claude</button>' +
        '<button type="button" class="gc-btn text sm" data-act="more">More options</button><span class="gc-flex"></span>' +
        '<button type="button" class="gc-btn filled" data-act="add" disabled>Add</button></div>' +
        '</div>';
    document.body.appendChild(wrap);
    document.body.classList.add('gc-qa-open');
    var input = wrap.querySelector('.gc-qa-sheet-input');
    var prev = wrap.querySelector('.gc-qa-sheet-preview');
    var addBtn = wrap.querySelector('[data-act=add]');
    var moreBtn = wrap.querySelector('[data-act=more]');
    var built = null;
    function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 132) + 'px'; }
    function refresh() {
        grow();
        built = quickAddBuild(input.value.replace(/\s*\n\s*/g, ' '), typeVerb || undefined);
        addBtn.disabled = !built;
        var multi = !!built && built.parts.length > 1;
        addBtn.textContent = multi ? 'Add all ' + built.parts.length : 'Add';
        moreBtn.hidden = multi; // the editor holds one series at a time
        if (built) { prev.innerHTML = quickAddCardHtml(built); return; }
        prev.innerHTML = '<div class="gc-qa-examples"><div class="gc-qa-ex-head">Say it the way you\'d text it — date, time, repeat, color, place, reminder:</div>' +
            QUICK_EXAMPLES.map(function(x) { return '<button type="button" class="gc-qa-ex">' + escapeHtml(x) + '</button>'; }).join('') +
            '<button type="button" class="gc-btn text sm gc-qa-tips">' + icon('help') + 'Everything quick add understands</button></div>';
        prev.querySelectorAll('.gc-qa-ex').forEach(function(b) {
            b.addEventListener('click', function() { input.value = b.textContent; refresh(); input.focus(); });
        });
        prev.querySelector('.gc-qa-tips').addEventListener('click', function() { close(); openHelp('quick'); });
    }
    function close() {
        document.body.classList.remove('gc-qa-open');
        document.removeEventListener('keydown', onKey, true);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
    function add() {
        if (!built) return;
        var r = built;
        close();
        commitQuickAdd(r);
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }
    document.addEventListener('keydown', onKey, true);
    input.addEventListener('input', refresh);
    // Return adds (iOS arms Shift after auto-capitalize, so Shift never means anything here)
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); } });
    wrap.querySelector('form').addEventListener('submit', function(e) { e.preventDefault(); add(); });
    addBtn.addEventListener('click', add);
    wrap.querySelectorAll('[data-close]').forEach(function(b) { b.addEventListener('click', close); });
    wrap.querySelector('[data-act=more]').addEventListener('click', function() {
        var r = built;
        close();
        if (r) quickAddToEditor(r);
        else openEditor({ draft: { type: (CREATE_VERBS[typeVerb] || 'event'), startDate: currentDate || getLocalDateString(), startTime: nextHalfHour() } });
    });
    wrap.querySelector('[data-act=paste]').addEventListener('click', function() { close(); openImportDialog('paste'); });
    wrap.querySelectorAll('.gc-qa-type').forEach(function(b) {
        b.addEventListener('click', function() {
            typeVerb = b.getAttribute('data-verb');
            wrap.querySelectorAll('.gc-qa-type').forEach(function(x) { var on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
            refresh();
            input.focus();
        });
    });
    if (prefill) input.value = prefill;
    refresh();
    input.focus(); // synchronous inside the tap → iOS opens the keyboard
}

// ---------------------------------------------------------------- mini calendar
function renderMiniCal() {
    var host = $('gcMiniCal');
    if (!host) return;
    if (!miniAnchor) miniAnchor = startOfMonth(currentDate);
    var today = getLocalDateString();
    var p = ymdParts(miniAnchor);
    var start = startOfWeek(miniAnchor, state.settings.weekStart);
    var range = visibleRange();
    var html = '<div class="gc-mini-head"><span class="gc-mini-title">' + MONTHS[p.m - 1] + ' ' + p.y + '</span>' +
        '<button class="gc-icon-btn sm" data-mini="-1" title="Previous month">' + icon('chevron_left') + '</button>' +
        '<button class="gc-icon-btn sm" data-mini="1" title="Next month">' + icon('chevron_right') + '</button></div><div class="gc-mini-grid">';
    for (var k = 0; k < 7; k++) html += '<span class="gc-mini-dow">' + DOW[(state.settings.weekStart + k) % 7].charAt(0) + '</span>';
    for (var i = 0; i < 42; i++) {
        var d = addDays(start, i);
        var dp = ymdParts(d);
        var cls = 'gc-mini-day' + (dp.m !== p.m ? ' other' : '') + (d === today ? ' today' : '') + (d === currentDate ? ' sel' : '') +
            (range && d >= range[0] && d <= range[1] && ui.view !== 'month' && ui.view !== 'year' && ui.view !== 'schedule' ? ' inrange' : '');
        html += '<button class="' + cls + '" data-mini-day="' + d + '" aria-label="' + escapeHtml(fmtDateLong(d)) + '">' + dp.d + '</button>';
    }
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll('[data-mini]').forEach(function(b) {
        b.addEventListener('click', function() { miniAnchor = addMonths(miniAnchor, +b.getAttribute('data-mini')); renderMiniCal(); });
    });
    host.querySelectorAll('[data-mini-day]').forEach(function(b) {
        b.addEventListener('click', function() {
            var d = b.getAttribute('data-mini-day');
            goToDate(d, ui.view === 'year' ? 'day' : null);
            if (isPhone()) toggleSidebar(false);
        });
    });
}

// ---------------------------------------------------------------- up next
function renderUpNext() {
    var host = $('gcUpNext');
    if (!host) return;
    var today = getLocalDateString();
    var nowAbs = currentNowAbs();
    var insts = getInstancesInRange(addDays(today, -30), addDays(today, 7), { noOverlays: true });
    var overdue = insts.filter(function(i) { return isOverdue(i); });
    var next = insts.filter(function(i) { return !i.done && instanceEndAbs(i) > nowAbs && i.startDate >= today; }).slice(0, 4);
    var fmt = state.settings.timeFormat;
    var html = '<div class="gc-side-title">Up next</div>';
    if (!next.length) html += '<div class="gc-muted gc-upnext-empty">Nothing in the next 7 days</div>';
    next.forEach(function(i) {
        var hex = instColorHex(i);
        var day = i.startDate === today ? 'Today' : i.startDate === addDays(today, 1) ? 'Tomorrow' : fmtDateMed(i.startDate, today);
        var t = i.allDay ? day : day + ', ' + fmtTime(i.startTime, fmt);
        var live = !i.allDay && instanceStartAbs(i) <= nowAbs && instanceEndAbs(i) > nowAbs;
        html += '<button class="gc-upnext-row" data-key="' + escapeHtml(i.key) + '"><span class="gc-upnext-bar" style="background:' + hex + '"></span><span class="gc-upnext-main">' +
            '<span class="gc-upnext-title">' + escapeHtml(displayTitle(i)) + '</span><span class="gc-upnext-when">' + (live ? '<b class="gc-live">Now</b> · ' : '') + escapeHtml(t) + '</span></span></button>';
    });
    if (overdue.length) {
        html += '<button class="gc-overdue-card" data-act="overdue">' + icon('assignment_late') + '<span>' + overdue.length + ' overdue ' + (overdue.length === 1 ? 'task' : 'tasks') + '</span>' + icon('chevron_right') + '</button>';
    }
    host.innerHTML = html;
    var idx = {};
    next.concat(overdue).forEach(function(i) { idx[i.key] = i; });
    host.querySelectorAll('.gc-upnext-row').forEach(function(b) {
        b.addEventListener('click', function() { var inst = idx[b.getAttribute('data-key')]; if (inst) openEventDetails(inst, b); });
    });
    var od = host.querySelector('[data-act=overdue]');
    if (od) od.addEventListener('click', function(e) { openOverdueMenu(e.currentTarget, overdue); });
}

function openOverdueMenu(anchor, list) {
    var fmt = state.settings.timeFormat;
    openMenu(anchor, list.slice(0, 12).map(function(i) {
        return {
            label: displayTitle(i), icon: i.type === 'deadline' ? 'flag' : 'radio_button_unchecked',
            hint: fmtDateShort(i.startDate) + (i.allDay ? '' : ' ' + fmtTime(i.startTime, fmt)),
            onClick: function() { openEventDetails(i, anchor); }
        };
    }).concat(list.length > 1 ? [{ divider: true }, {
        label: 'Mark all ' + list.length + ' completed', icon: 'done_all', onClick: function() {
            var ch = beginChange('complete overdue');
            list.forEach(function(i) { setInstanceDone(i, true); });
            finishChange(ch, list.length + ' tasks completed');
        }
    }] : []));
}

// ---------------------------------------------------------------- calendar lists
function renderCalendarLists() {
    var host = $('gcCalLists');
    if (!host) return;
    var cals = getCalendarList();
    var counts = {};
    getValues(state.events).forEach(function(e) { counts[e.calendarId] = (counts[e.calendarId] || 0) + 1; });
    var mine = cals.map(function(c) {
        var hex = colorHex(c.color);
        return '<div class="gc-cal-row" data-cal="' + escapeHtml(c.id) + '">' +
            '<label class="gc-cal-check"><input type="checkbox"' + (c.visible ? ' checked' : '') + ' data-vis="' + escapeHtml(c.id) + '"><span class="gc-box" style="--c:' + hex + '">' + icon('check') + '</span>' +
            '<span class="gc-cal-name" title="' + escapeHtml(c.name + (c.description ? ' — ' + c.description : '')) + '">' + escapeHtml(c.name) + '</span></label>' +
            '<span class="gc-cal-count">' + (counts[c.id] || '') + '</span>' +
            '<button class="gc-icon-btn sm gc-cal-more" data-calmenu="' + escapeHtml(c.id) + '" title="Options for ' + escapeHtml(c.name) + '">' + icon('more_vert') + '</button></div>';
    }).join('');
    var connected = typeof firebaseSyncEnabled !== 'undefined' && firebaseSyncEnabled;
    var other = Object.keys(OVERLAY_DEFS).map(function(k) {
        var d = OVERLAY_DEFS[k];
        var isRm = k !== 'holidays';
        var note = '';
        if (isRm && ui.overlays[k]) {
            if (!connected) note = 'Connect your PIN to load';
            else if (roadmapOverlay.loading) note = 'Loading…';
            else if (roadmapOverlay.error) note = 'Could not load';
            else if (roadmapOverlay.loaded) note = (roadmapOverlay.items[k] || []).length + ' items · read-only';
        }
        return '<div class="gc-cal-row overlay"><label class="gc-cal-check"><input type="checkbox"' + (ui.overlays[k] ? ' checked' : '') + ' data-overlay="' + k + '"><span class="gc-box" style="--c:' + colorHex(d.color) + '">' + icon('check') + '</span>' +
            '<span class="gc-cal-name">' + escapeHtml(d.name) + (note ? '<span class="gc-cal-note">' + escapeHtml(note) + '</span>' : '') + '</span></label></div>';
    }).join('');
    host.innerHTML =
        '<div class="gc-cal-section"><div class="gc-cal-head"><button class="gc-cal-toggle" data-sec="my">' + 'My calendars' + icon(ui.myCalsOpen ? 'expand_less' : 'expand_more') + '</button>' +
        '<button class="gc-icon-btn sm" data-act="addcal" title="Create new calendar">' + icon('add') + '</button></div>' +
        (ui.myCalsOpen ? '<div class="gc-cal-list">' + mine + '</div>' : '') + '</div>' +
        '<div class="gc-cal-section"><div class="gc-cal-head"><button class="gc-cal-toggle" data-sec="other">Other calendars' + icon(ui.otherCalsOpen ? 'expand_less' : 'expand_more') + '</button>' +
        (connected && (ui.overlays.rmAppointments || ui.overlays.rmDeadlines || ui.overlays.rmD4) ? '<button class="gc-icon-btn sm" data-act="rmrefresh" title="Reload Grad Roadmap data">' + icon('refresh') + '</button>' : '') + '</div>' +
        (ui.otherCalsOpen ? '<div class="gc-cal-list">' + other + '</div>' : '') + '</div>';

    host.querySelectorAll('[data-vis]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var id = cb.getAttribute('data-vis');
            // visibility is a synced calendar property (like Google) — stamp the record
            patchCalendar(id, { visible: cb.checked });
            commit();
        });
    });
    host.querySelectorAll('[data-overlay]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            ui.overlays[cb.getAttribute('data-overlay')] = cb.checked;
            saveUiPrefs();
            if (cb.checked && cb.getAttribute('data-overlay') !== 'holidays') refreshRoadmapOverlay(false);
            renderAll();
        });
    });
    host.querySelectorAll('[data-calmenu]').forEach(function(b) {
        b.addEventListener('click', function(e) { e.stopPropagation(); openCalendarMenu(b, b.getAttribute('data-calmenu')); });
    });
    host.querySelectorAll('[data-sec]').forEach(function(b) {
        b.addEventListener('click', function() {
            if (b.getAttribute('data-sec') === 'my') ui.myCalsOpen = !ui.myCalsOpen; else ui.otherCalsOpen = !ui.otherCalsOpen;
            saveUiPrefs(); renderCalendarLists();
        });
    });
    host.querySelector('[data-act=addcal]').addEventListener('click', function() { openCalendarDialog(null); });
    var rr = host.querySelector('[data-act=rmrefresh]');
    if (rr) rr.addEventListener('click', function() { refreshRoadmapOverlay(true); });
}

function openCalendarMenu(anchor, calId) {
    var c = getCalendar(calId);
    if (!c) return;
    var sw = '<div class="gc-swatch-grid cal">' + CAL_PALETTE_ORDER.map(function(k) {
        return '<button class="gc-swatch-btn' + (c.color === k ? ' sel' : '') + '" data-color="' + k + '" title="' + escapeHtml(CAL_COLORS[k].name) + '" style="background:' + CAL_COLORS[k].hex + '">' + (c.color === k ? icon('check') : '') + '</button>';
    }).join('') + '</div>';
    openMenu(anchor, [
        { label: 'Display this only', icon: 'visibility', onClick: function() {
            getCalendarList().forEach(function(x) { if (x.visible !== (x.id === calId)) patchCalendar(x.id, { visible: x.id === calId }); });
            commit();
        } },
        { label: 'Show all calendars', icon: 'select_all', onClick: function() {
            getCalendarList().forEach(function(x) { if (!x.visible) patchCalendar(x.id, { visible: true }); });
            commit();
        } },
        { label: 'Settings', icon: 'tune', onClick: function() { openCalendarDialog(calId); } },
        { label: 'Copy events for Claude', icon: 'content_copy', onClick: function() {
            var list = getValues(state.events).filter(function(e) { return e.calendarId === calId; });
            copyText(list.map(function(e) { return formatEventForImport(e); }).join('\n---\n') || '(empty calendar)', list.length + ' events copied');
        } },
        { divider: true },
        { html: sw }
    ], {
        className: 'gc-cal-menu',
        onMount: function(m) {
            m.querySelectorAll('[data-color]').forEach(function(b) {
                b.addEventListener('click', function() {
                    var col = b.getAttribute('data-color');
                    closeMenu();
                    var ch = beginChange('calendar color');
                    patchCalendar(calId, { color: col });
                    finishChange(ch, c.name + ' is now ' + CAL_COLORS[col].name);
                });
            });
        }
    });
}

function openCalendarDialog(calId) {
    var c = calId ? getCalendar(calId) : null;
    var isNew = !c;
    var color = c ? c.color : nextFreeColor();
    var nEvents = c ? getValues(state.events).filter(function(e) { return e.calendarId === calId; }).length : 0;
    var box = openModal(
        '<form class="gc-dialog gc-cal-dialog">' +
        '<h2 class="gc-dialog-title">' + (isNew ? 'Create new calendar' : 'Calendar settings') + '</h2>' +
        '<div class="gc-dialog-body">' +
        '<label class="gc-field"><span>Name</span><input class="gc-input" name="name" maxlength="120" required autofocus></label>' +
        '<label class="gc-field"><span>Description</span><textarea class="gc-input" name="description" rows="2" maxlength="1000"></textarea></label>' +
        '<label class="gc-field"><span>Default for</span><select class="gc-input" name="kind"><option value="general">General events</option><option value="appointments">Patient appointments</option><option value="deadlines">Deadlines</option><option value="tasks">Tasks</option></select></label>' +
        '<div class="gc-field"><span>Color</span><div class="gc-swatch-grid cal big">' + CAL_PALETTE_ORDER.map(function(k) {
            return '<button type="button" class="gc-swatch-btn" data-color="' + k + '" title="' + escapeHtml(CAL_COLORS[k].name) + '" style="background:' + CAL_COLORS[k].hex + '"></button>';
        }).join('') + '</div></div>' +
        (isNew ? '' : '<div class="gc-field gc-danger-zone"><span>' + nEvents + ' event' + (nEvents === 1 ? '' : 's') + '</span><button type="button" class="gc-btn outlined danger sm" data-act="delete">' + icon('delete') + ' Delete calendar</button></div>') +
        '</div><div class="gc-dialog-actions"><button type="button" class="gc-btn text" data-close>Cancel</button><button type="submit" class="gc-btn filled">' + (isNew ? 'Create calendar' : 'Save') + '</button></div></form>',
        { narrow: true });
    var F = function(n) { return box.querySelector('[name=' + n + ']'); };
    F('name').value = c ? c.name : '';
    F('description').value = c ? c.description : '';
    F('kind').value = c ? c.kind : 'general';
    function paint() {
        box.querySelectorAll('[data-color]').forEach(function(b) {
            var on = b.getAttribute('data-color') === color;
            b.classList.toggle('sel', on);
            b.innerHTML = on ? icon('check') : '';
        });
    }
    box.querySelectorAll('[data-color]').forEach(function(b) { b.addEventListener('click', function() { color = b.getAttribute('data-color'); paint(); }); });
    paint();
    box.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        var name = F('name').value.trim();
        if (!name) return;
        var ch = beginChange(isNew ? 'create calendar' : 'edit calendar');
        if (isNew) {
            var nc = createCalendar(name, color, F('kind').value);
            if (F('description').value.trim()) patchCalendar(nc.id, { description: F('description').value.trim() });
        } else {
            patchCalendar(calId, { name: name, color: color, kind: F('kind').value, description: F('description').value.trim() });
        }
        closeModal(box);
        finishChange(ch, isNew ? 'Calendar "' + name + '" created' : 'Calendar saved');
    });
    var del = box.querySelector('[data-act=delete]');
    if (del) del.addEventListener('click', function() {
        if (getCalendarList().length <= 1) { showToast('Keep at least one calendar', { type: 'error' }); return; }
        gcConfirm('Delete "' + c.name + '" and its ' + nEvents + ' event' + (nEvents === 1 ? '' : 's') + '? A checkpoint is saved first, and you can Undo.', { title: 'Delete calendar?', okLabel: 'Delete', danger: true }).then(function(ok) {
            if (!ok) return;
            createCheckpoint('pre-delete-calendar', true);
            var ch = beginChange('delete calendar "' + c.name + '"');
            removeCalendarAndEvents(calId);
            closeModal(box);
            finishChange(ch, 'Deleted "' + c.name + '"');
        });
    });
}

// ---------------------------------------------------------------- Grad Roadmap overlay (READ-ONLY)
function rmSanitizeKey(k) { return String(k).replace(/[.#$\/\[\]'"\\]/g, ''); }

function refreshRoadmapOverlay(force) {
    if (!(ui.overlays.rmAppointments || ui.overlays.rmDeadlines || ui.overlays.rmD4)) return;
    if (typeof firebaseSyncEnabled === 'undefined' || !firebaseSyncEnabled || !database || !userRootPath) { renderCalendarLists(); return; }
    if (roadmapOverlay.loading) return;
    if (!force && roadmapOverlay.loaded && Date.now() - roadmapOverlay.fetchedAt < 5 * 60 * 1000) return;
    roadmapOverlay.loading = true;
    roadmapOverlay.error = null;
    renderCalendarLists();
    var base = 'graduationRoadmap/';
    Promise.all([
        ui.overlays.rmAppointments ? readOtherAppPath(base + 'clinicalData/appointments') : Promise.resolve(null),
        ui.overlays.rmAppointments ? readOtherAppPath(base + 'clinicalData/patientRecords') : Promise.resolve(null),
        ui.overlays.rmDeadlines ? readOtherAppPath(base + 'customDeadlines') : Promise.resolve(null),
        ui.overlays.rmDeadlines ? readOtherAppPath(base + 'completedDeadlines') : Promise.resolve(null),
        ui.overlays.rmD4 ? readOtherAppPath(base + 'd4Events') : Promise.resolve(null)
    ]).then(function(r) {
        var appts = r[0] || {}, pts = r[1] || {}, dls = r[2] || {}, done = r[3] || {}, d4 = r[4] || {};
        var items = { rmAppointments: [], rmDeadlines: [], rmD4: [] };
        Object.keys(appts).forEach(function(id) {
            var a = appts[id];
            if (!a || !isValidYMD(a.date) || a.status === 'cancelled') return;
            var pt = (a.patientId && pts[a.patientId]) || null;
            var name = (pt && pt.name) || a.patientName || 'Patient';
            var start = isValidHHMM(a.time) ? a.time : null;
            var end = start ? absToDateTime(absOf(a.date, start) + (+a.duration > 0 ? +a.duration : 180)) : null;
            items.rmAppointments.push({
                key: 'rma::' + id, type: 'appointment', title: name + (a.procedures ? ' — ' + firstLine(a.procedures) : ''),
                startDate: a.date, endDate: end ? end.date : a.date, allDay: !start, startTime: start, endTime: end ? end.time : null,
                patientName: name, chartNumber: (pt && pt.chartNumber) || '', procedure: a.procedures || '', chair: a.chair || '',
                notes: a.notes || '', done: a.status === 'completed'
            });
        });
        Object.keys(dls).forEach(function(id) {
            var d = dls[id];
            if (!d || !isValidYMD(d.date) || d.clinicalAptId) return;
            items.rmDeadlines.push({
                key: 'rmd::' + id, type: 'deadline', title: String(d.what || 'Deadline'), startDate: d.date, endDate: d.date, allDay: true,
                notes: [d.course, d.type].filter(Boolean).join(' · '), done: !!(d.done || done[rmSanitizeKey(d.id || id)])
            });
        });
        Object.keys(d4).forEach(function(id) {
            var e = d4[id];
            if (!e || !isValidYMD(e.startDate)) return;
            var t = isValidHHMM(e.time) ? e.time : null;
            var en = t ? absToDateTime(absOf(e.startDate, t) + 60) : null;
            items.rmD4.push({
                key: 'rm4::' + id, type: 'event', title: String(e.title || 'D4 event'), startDate: e.startDate,
                endDate: t ? en.date : (isValidYMD(e.endDate) && e.endDate >= e.startDate ? e.endDate : e.startDate),
                allDay: !t, startTime: t, endTime: t ? en.time : null, location: e.location || '', notes: e.notes || ''
            });
        });
        roadmapOverlay.items = items;
        roadmapOverlay.loaded = true;
        roadmapOverlay.loading = false;
        roadmapOverlay.fetchedAt = Date.now();
        requestRender();
    }).catch(function(err) {
        console.warn('Roadmap overlay load failed', err);
        roadmapOverlay.loading = false;
        roadmapOverlay.error = String(err && err.message || err);
        renderCalendarLists();
    });
}

function clearRoadmapOverlay() {
    roadmapOverlay = { loaded: false, loading: false, error: null, fetchedAt: 0, items: { rmAppointments: [], rmDeadlines: [], rmD4: [] } };
}
