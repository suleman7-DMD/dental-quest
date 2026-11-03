// ============================================================================
// SULLY CALENDAR — init.js
// App shell: header/period label, view switching + navigation, search,
// sidebar toggle, keyboard shortcuts, reminder loop, timers, boot sequence.
// ============================================================================

var FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="48" rx="8" fill="#fff" stroke="#1a73e8" stroke-width="4"/><rect x="6" y="10" width="52" height="14" rx="6" fill="#1a73e8"/><rect x="18" y="4" width="6" height="12" rx="3" fill="#1a73e8"/><rect x="40" y="4" width="6" height="12" rx="3" fill="#1a73e8"/><text x="32" y="51" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" text-anchor="middle" fill="#1a73e8">S</text></svg>';

var VIEW_DEFS = {
    day: { label: 'Day', key: 'D' },
    '3day': { label: '3 days', key: '' },
    '4day': { label: '4 days', key: 'X' },
    week: { label: 'Week', key: 'W' },
    month: { label: 'Month', key: 'M' },
    year: { label: 'Year', key: 'Y' },
    schedule: { label: 'Schedule', key: 'A' }
};
var VIEW_ORDER = ['day', 'week', 'month', 'year', 'schedule', '4day', '3day'];

// ---------------------------------------------------------------- render
function renderAll() {
    renderHeader();
    renderSidebar();
    renderView();
}

function renderView() {
    var main = $('gcMain');
    if (!main) return;
    var view = ui.view || 'week';
    main.setAttribute('data-view', view);
    document.body.setAttribute('data-view', view);
    document.body.classList.toggle('gc-compact', state.settings.density === 'compact');
    document.body.classList.toggle('gc-searching', !!searchQuery);
    try {
        if (searchQuery && view !== 'year') renderSearchResults(main);
        else if (view === 'month') renderMonth(main);
        else if (view === 'year') renderYear(main);
        else if (view === 'schedule') renderSchedule(main);
        else renderTimeGrid(main, getVisibleDays(view, currentDate));
    } catch (e) {
        console.error('Render failed:', e);
        main.innerHTML = '<div class="gc-empty">' + icon('error') + '<div><b>Something went wrong drawing this view.</b><br><span class="gc-muted">' + escapeHtml(e && e.message ? e.message : String(e)) + '</span></div></div>';
    }
    main.querySelectorAll('[data-key]').forEach(function(el) { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
    if (activePopover && activePopover.anchor && !document.body.contains(activePopover.anchor)) {
        // the anchor was rebuilt — re-anchor to its replacement so the popover stays put
        if (activePopover.key) {
            var fresh = main.querySelector('[data-key="' + cssEscape(activePopover.key) + '"]');
            if (fresh) { activePopover.anchor = fresh; repositionPopover(); }
        }
    }
}

function periodLabel() {
    var view = ui.view || 'week';
    var p = ymdParts(currentDate);
    if (searchQuery && view !== 'year') return 'Search';
    if (view === 'year') return String(p.y);
    var r = visibleRange();
    var a = ymdParts(r[0]), b = ymdParts(r[1]);
    if (isPhone()) {
        // narrow header (Google mobile style): full month when one month is showing, year only when it isn't this year
        var ty = ymdParts(getLocalDateString()).y;
        var sm = function(q) { return MONTHS_SHORT[q.m - 1] + (q.y !== ty ? ' ' + q.y : ''); };
        var fm = function(q) { return q.y !== ty ? MONTHS_SHORT[q.m - 1] + ' ' + q.y : MONTHS[q.m - 1]; };
        if (view === 'day') return MONTHS_SHORT[p.m - 1] + ' ' + p.d + (p.y !== ty ? ', ' + p.y : '');
        if (view === 'month') return fm(p);
        return a.m === b.m && a.y === b.y ? fm(a) : sm(a) + ' – ' + sm(b);
    }
    if (view === 'day') return fmtDateLong(currentDate);
    if (view === 'month') return MONTHS[p.m - 1] + ' ' + p.y;
    if (view === 'schedule') {
        return a.y === b.y ? MONTHS[a.m - 1].slice(0, 3) + ' – ' + MONTHS[b.m - 1].slice(0, 3) + ' ' + b.y
            : MONTHS[a.m - 1].slice(0, 3) + ' ' + a.y + ' – ' + MONTHS[b.m - 1].slice(0, 3) + ' ' + b.y;
    }
    if (a.m === b.m) return MONTHS[a.m - 1] + ' ' + a.y;
    if (a.y === b.y) return MONTHS[a.m - 1].slice(0, 3) + ' – ' + MONTHS[b.m - 1].slice(0, 3) + ' ' + a.y;
    return MONTHS[a.m - 1].slice(0, 3) + ' ' + a.y + ' – ' + MONTHS[b.m - 1].slice(0, 3) + ' ' + b.y;
}

function renderHeader() {
    var lbl = $('gcPeriodLabel');
    if (lbl) lbl.textContent = periodLabel();
    var view = ui.view || 'week';
    var vl = $('gcViewLabel');
    if (vl) vl.textContent = (VIEW_DEFS[view] || VIEW_DEFS.week).label;
    document.querySelectorAll('[data-view-btn]').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-view-btn') === view);
        b.setAttribute('aria-pressed', b.getAttribute('data-view-btn') === view ? 'true' : 'false');
    });
    var today = getLocalDateString();
    var tb = $('gcTodayBtn');
    if (tb) tb.title = fmtDateLong(today);
    var fav = $('gcTodayNum');
    if (fav) fav.textContent = ymdParts(today).d;
    var tic = $('gcTodayIcNum');
    if (tic) tic.textContent = ymdParts(today).d;
    document.body.classList.toggle('gc-sidebar-closed', !ui.sidebarOpen);
    var si = $('gcSearchInput');
    if (si && document.activeElement !== si && si.value !== searchQuery) si.value = searchQuery;
    var pin = $('gcSearchClear');
    if (pin) pin.hidden = !searchQuery;
    document.title = (searchQuery ? 'Search · ' : '') + periodLabel() + ' · Sully Calendar';
}

// [from, to] of what the main view shows
function visibleRange() {
    var view = ui.view || 'week';
    if (view === 'month') {
        var w = monthWeeks(currentDate);
        var last = w[w.length - 1];
        return [w[0][0], last[last.length - 1]];
    }
    if (view === 'year') { var y = ymdParts(currentDate).y; return [makeYMD(y, 1, 1), makeYMD(y, 12, 31)]; }
    if (view === 'schedule') return [currentDate, addDays(currentDate, scheduleSpanDays - 1)];
    var days = getVisibleDays(view, currentDate);
    if (!days.length) return [currentDate, currentDate];
    if (view === 'week') return [startOfWeek(currentDate, state.settings.weekStart), addDays(startOfWeek(currentDate, state.settings.weekStart), 6)];
    return [days[0], days[days.length - 1]];
}

// ---------------------------------------------------------------- navigation
function goToDate(date, view) {
    if (!isValidYMD(date)) return;
    closePopover(true);
    closeMenu();
    if (view && VIEW_DEFS[view]) { ui.view = view; saveUiPrefs(); }
    if ((ui.view || 'week') === 'schedule') scheduleSpanDays = 60;
    currentDate = date;
    miniAnchor = null;
    if (searchQuery && view) setSearch('', true);
    renderHeader();
    renderMiniCal();
    renderView();
}

function navigate(dir) {
    var view = ui.view || 'week';
    var d = currentDate;
    if (view === 'day') {
        d = addDays(d, dir);
        if (!state.settings.showWeekends) { var g = 0; while ((weekdayOf(d) === 0 || weekdayOf(d) === 6) && g++ < 3) d = addDays(d, dir); }
    } else if (view === '3day') d = addDays(d, 3 * dir);
    else if (view === '4day') d = addDays(d, 4 * dir);
    else if (view === 'week') d = addDays(d, 7 * dir);
    else if (view === 'month') d = addMonths(startOfMonth(d), dir);
    else if (view === 'year') { var p = ymdParts(d); d = makeYMD(p.y + dir, p.m, Math.min(p.d, daysInMonth(p.y + dir, p.m - 1))); }
    else if (view === 'schedule') d = addDays(d, 30 * dir);
    goToDate(d);
}

function goToday() {
    var today = getLocalDateString();
    lastGridRangeKey = null; // re-scroll the grid to now
    goToDate(today);
}

function setView(view) {
    if (!VIEW_DEFS[view]) return;
    ui.view = view;
    saveUiPrefs();
    if (view === 'schedule') scheduleSpanDays = 60;
    if (searchQuery) setSearch('', true);
    closePopover(true);
    renderHeader();
    renderMiniCal();
    renderView();
}

function openViewMenu(anchor) {
    var view = ui.view || 'week';
    var items = VIEW_ORDER.map(function(v) {
        return { label: VIEW_DEFS[v].label, hint: VIEW_DEFS[v].key, checked: v === view, onClick: function() { setView(v); } };
    });
    items.push({ divider: true });
    items.push({ label: 'Show weekends', checked: state.settings.showWeekends, onClick: function() { setSetting('showWeekends', !state.settings.showWeekends); } });
    items.push({ label: 'Show completed tasks', checked: state.settings.showCompletedTasks, onClick: function() { setSetting('showCompletedTasks', !state.settings.showCompletedTasks); } });
    items.push({ label: 'Show week numbers', checked: state.settings.showWeekNumbers, onClick: function() { setSetting('showWeekNumbers', !state.settings.showWeekNumbers); } });
    openMenu(anchor, items, { checks: true, className: 'gc-view-menu' });
}

var searchTimer = null;
function setSearch(q, silent) {
    searchQuery = String(q || '').trim();
    searchShowPast = false;
    var si = $('gcSearchInput');
    if (si && si.value.trim() !== searchQuery) si.value = searchQuery;
    if (!searchQuery) document.body.classList.remove('gc-search-open');
    if (silent) return;
    renderHeader();
    renderView();
}

function toggleSidebar(open) {
    ui.sidebarOpen = typeof open === 'boolean' ? open : !ui.sidebarOpen;
    if (!isPhone()) saveUiPrefs();
    document.body.classList.toggle('gc-sidebar-closed', !ui.sidebarOpen);
    // grid widths changed — re-measure month lanes / grid scroll pad after the transition
    setTimeout(function() { if (!isPhone()) renderView(); }, 220);
}

// Called by the visibility handler (firebase-sync.js) when the tab returns
var lastVisibleDay = getLocalDateString();
function onAppVisible() {
    var today = getLocalDateString();
    if (today !== lastVisibleDay) {
        // the date rolled over while hidden — keep "today" views honest
        if (currentDate === lastVisibleDay) currentDate = today;
        lastVisibleDay = today;
        renderAll();
    } else {
        updateNowLine();
        renderUpNext();
    }
    checkReminders();
}

// ---------------------------------------------------------------- reminders
var REMINDER_GRACE_MIN = 15;  // a reminder missed by more than this (tab asleep) is skipped

function loadFired() {
    try { return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function checkReminders() {
    if (!state || !state.events) return;
    var nowAbs = currentNowAbs();
    var today = getLocalDateString();
    var fired = loadFired();
    var changed = false;
    var insts;
    try { insts = getInstancesInRange(addDays(today, -1), addDays(today, 8), { noOverlays: true, includeDone: true }); } catch (e) { return; }
    insts.forEach(function(inst) {
        if (inst.readOnly || inst.isDraft) return;
        if (inst.done && (inst.type === 'task' || inst.type === 'deadline')) return;
        var mins = reminderMinutes(inst);
        if (!mins.length) return;
        var startAbs = inst.allDay ? dayNum(inst.startDate) * 1440 + 9 * 60 : instanceStartAbs(inst);
        mins.forEach(function(m) {
            var at = startAbs - m;
            if (nowAbs < at || nowAbs - at > REMINDER_GRACE_MIN) return;
            var fk = inst.key + '|' + m;
            if (fired[fk]) return;
            fired[fk] = Date.now();
            changed = true;
            var when = inst.allDay ? (inst.startDate === today ? 'Today' : fmtDateMed(inst.startDate, today))
                : (m === 0 ? 'Now' : fmtTime(inst.startTime, state.settings.timeFormat) + (inst.startDate === today ? '' : ' · ' + fmtDateMed(inst.startDate, today)));
            var body = when + (inst.location ? ' · ' + inst.location : '') + (inst.patientName ? ' · ' + inst.patientName : '');
            fireNotification(displayTitle(inst), body, fk, inst);
        });
    });
    if (changed) {
        var cutoff = Date.now() - 10 * 86400000;
        Object.keys(fired).forEach(function(k) { if (fired[k] < cutoff) delete fired[k]; });
        safeLocalStorageSet(FIRED_KEY, JSON.stringify(fired));
    }
}

// ---------------------------------------------------------------- keyboard
function isTypingTarget(el) {
    if (!el) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
}

function onGlobalKeydown(e) {
    if (e.key === 'Escape') {
        if (typeof dragState !== 'undefined' && dragState && dragState.active) { cancelGesture(); e.preventDefault(); return; }
        if (closeMenu()) { e.preventDefault(); return; }
        if (topModal()) { if (!topModal().sticky) closeModal(); e.preventDefault(); return; }
        if (closePopover()) { e.preventDefault(); return; }
        if (document.getElementById('pinPromptOverlay')) return;
        if (isTypingTarget(document.activeElement)) { document.activeElement.blur(); return; }
        if (searchQuery) { setSearch(''); return; }
        if (isPhone() && ui.sidebarOpen) toggleSidebar(false);
        return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        if (isTypingTarget(document.activeElement) || topModal()) return;
        e.preventDefault();
        undoLast();
        return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(e.target) || topModal() || document.getElementById('pinPromptOverlay')) return;
    var k = e.key;
    // event-scoped keys while a details popover is open
    if (activePopover && activePopover.key) {
        var inst = getEventInstanceByKey(activePopover.key);
        if (inst && !inst.readOnly) {
            if (k === 'e') { e.preventDefault(); closePopover(); openEditor({ instKey: inst.key }); return; }
            if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); userDeleteInstance(inst); return; }
        }
    }
    var map = {
        d: function() { setView('day'); }, '1': function() { setView('day'); },
        x: function() { setView('4day'); }, '2': function() { setView('4day'); },
        w: function() { setView('week'); }, '3': function() { setView('week'); },
        m: function() { setView('month'); }, '4': function() { setView('month'); },
        y: function() { setView('year'); }, '5': function() { setView('year'); },
        a: function() { setView('schedule'); }, '6': function() { setView('schedule'); },
        t: goToday,
        j: function() { navigate(1); }, n: function() { navigate(1); },
        k: function() { navigate(-1); }, p: function() { navigate(-1); },
        c: function() { closePopover(true); openEditor({ draft: { type: 'event', startDate: currentDate, startTime: nextHalfHour() } }); },
        q: function() { if (isPhone() || !ui.sidebarOpen) { openQuickAddSheet(); return; } var qi = $('gcQuickInput'); if (qi) qi.focus(); },
        i: function() { openImportDialog('paste'); },
        g: openGoToDate,
        s: openSettings,
        '/': function() { openSearch(); },
        '?': function() { openHelp(); }
    };
    var fn = map[k];
    if (!fn && !e.shiftKey && k && k.length === 1) fn = map[k.toLowerCase()]; // caps lock
    if (fn) { e.preventDefault(); fn(); }
}

function openSearch() {
    document.body.classList.add('gc-search-open');
    var si = $('gcSearchInput');
    if (si) { si.focus(); si.select(); }
}

// ---------------------------------------------------------------- header wiring
function wireHeader() {
    var on = function(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); };
    on('gcMenuBtn', 'click', function() { toggleSidebar(); });
    on('gcTodayBtn', 'click', goToday);
    on('gcPrevBtn', 'click', function() { navigate(-1); });
    on('gcNextBtn', 'click', function() { navigate(1); });
    on('gcPeriodLabel', 'click', function() { if (isPhone()) toggleSidebar(); else openGoToDate(); });
    on('gcViewBtn', 'click', function(e) { openViewMenu(e.currentTarget); });
    document.querySelectorAll('[data-view-btn]').forEach(function(b) {
        b.addEventListener('click', function() { setView(b.getAttribute('data-view-btn')); });
    });
    on('gcImportBtn', 'click', function() { openImportDialog('paste'); });
    on('gcSettingsBtn', 'click', openSettings);
    on('gcSyncBtn', 'click', function() {
        if (typeof firebaseSyncEnabled !== 'undefined' && firebaseSyncEnabled) forceCloudSync();
        else promptForPin();
    });
    on('gcHelpBtn', 'click', function() { openHelp(); });
    on('gcAppsBtn', 'click', function(e) {
        e.stopPropagation();
        var p = $('gcAppsPanel');
        if (!p) return;
        var open = p.hidden;
        p.hidden = !open;
        e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('mousedown', function(e) {
        var p = $('gcAppsPanel');
        if (p && !p.hidden && !p.contains(e.target) && !e.target.closest('#gcAppsBtn')) { p.hidden = true; $('gcAppsBtn').setAttribute('aria-expanded', 'false'); }
    });
    on('gcSearchBtn', 'click', openSearch);
    var si = $('gcSearchInput');
    if (si) {
        si.addEventListener('input', function() {
            if (searchTimer) clearTimeout(searchTimer);
            searchTimer = setTimeout(function() { setSearch(si.value); }, 160);
        });
        si.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { if (searchTimer) clearTimeout(searchTimer); setSearch(si.value); }
            if (e.key === 'Escape') { e.stopPropagation(); setSearch(''); si.blur(); }
        });
        si.addEventListener('blur', function() { if (!si.value.trim()) document.body.classList.remove('gc-search-open'); });
    }
    on('gcSearchClear', 'click', function() { setSearch(''); });
    on('gcCreateBtn', 'click', function(e) { openCreateMenu(e.currentTarget); });
    on('gcFab', 'click', function() { openQuickAddSheet(); });
    on('gcScrim', 'click', function() { toggleSidebar(false); });
    var qi = $('gcQuickInput');
    if (qi) {
        qi.addEventListener('input', function() { quickAddPreview(qi.value); });
        qi.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); submitQuickAdd(e.shiftKey && !isCoarsePointer()); } // iOS arms Shift after auto-capitalize
            if (e.key === 'Escape') { e.stopPropagation(); qi.value = ''; quickAddPreview(''); qi.blur(); }
        });
    }
    // horizontal swipe on the main view (phones) → prev/next period
    var main = $('gcMain');
    var sx = null, sy = null, st = 0;
    main.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) { sx = null; return; }
        sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
    }, { passive: true });
    main.addEventListener('touchend', function(e) {
        if (sx === null || (typeof dragState !== 'undefined' && dragState)) { sx = null; return; }
        var t = e.changedTouches[0];
        var dx = t.clientX - sx, dy = t.clientY - sy;
        sx = null;
        var v = ui.view || 'week';
        if (v === 'schedule' || v === 'year') return;
        if (Date.now() - st < 600 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) navigate(dx < 0 ? 1 : -1);
    }, { passive: true });
}

// ---------------------------------------------------------------- boot
var resizeTimer = null;
var lastWasPhone = null;

function boot() {
    loadState();
    applyTheme();
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var onScheme = function() { if (ui.theme === 'system') { applyTheme(); renderView(); } };
        if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
    }
    lastWasPhone = isPhone();
    if (!ui.view || !VIEW_DEFS[ui.view]) ui.view = state.settings.defaultView || 'week';
    if (lastWasPhone) ui.sidebarOpen = false;
    // deep links: calendar.html#date=2026-11-05&view=day
    try {
        var h = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
        if (isValidYMD(h.get('date'))) currentDate = h.get('date');
        if (VIEW_DEFS[h.get('view')]) ui.view = h.get('view');
    } catch (e) {}
    wireHeader();
    try { renderAll(); } catch (e) { console.error('Initial render failed:', e); }
    initDragDrop();
    document.addEventListener('keydown', onGlobalKeydown);
    window.addEventListener('resize', function() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            var ph = isPhone();
            if (ph !== lastWasPhone) {
                lastWasPhone = ph;
                closePopover(true);
                if (ph) ui.sidebarOpen = false;
                renderAll();
            } else if ((ui.view || 'week') === 'month') renderView();
            else repositionPopover();
        }, 120);
    });
    setInterval(function() {
        var today = getLocalDateString();
        if (today !== lastVisibleDay) { onAppVisible(); return; }
        updateNowLine();
        renderUpNext();
    }, 60000);
    setInterval(checkReminders, 30000);
    setTimeout(checkReminders, 4000);
    initFirebase();
    if (document.readyState === 'complete') registerServiceWorker();
    else window.addEventListener('load', registerServiceWorker);
    setTimeout(maybeShowInstallHint, 2500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
