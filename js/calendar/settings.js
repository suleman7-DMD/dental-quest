// ============================================================================
// SULLY CALENDAR — settings.js
// Settings dialog (synced settings are stamped so a fresh device never wins),
// per-device theme, notifications, sync/PIN + backups entry points,
// keyboard-shortcut help, go-to-date dialog.
// ============================================================================

function setSetting(key, value) {
    if (state.settings[key] === value) return;
    state.settings[key] = value;
    state.settings = normalizeSettings(state.settings);
    state._stamps.settings = nowIso();   // explicit stamp → this edit wins the settings group merge
    commit();
}

function openSettings() {
    closePopover(true);
    var s = state.settings;
    var connected = typeof firebaseSyncEnabled !== 'undefined' && firebaseSyncEnabled;
    var notifState = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
    var sel = function(name, opts, val) {
        return '<select class="gc-input sm" data-set="' + name + '">' + opts.map(function(o) {
            return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + escapeHtml(o[1]) + '</option>';
        }).join('') + '</select>';
    };
    var tog = function(name, label, val) {
        return '<label class="gc-switch-row"><span>' + escapeHtml(label) + '</span><input type="checkbox" class="gc-switch" data-set-bool="' + name + '"' + (val ? ' checked' : '') + '></label>';
    };
    var remOpts = [[-1, 'None'], [0, 'At time of event'], [5, '5 minutes before'], [10, '10 minutes before'], [15, '15 minutes before'], [30, '30 minutes before'], [60, '1 hour before'], [120, '2 hours before'], [1440, '1 day before']];
    var adRemOpts = [[-1, 'None'], [0, 'On the day at 9am'], [1440, '1 day before at 9am'], [2880, '2 days before at 9am'], [10080, '1 week before at 9am']];
    var hours = [];
    for (var h = 0; h <= 20; h++) hours.push([h, fmtHourLabel(h, s.timeFormat)]);
    var endHours = [];
    for (var eh = 12; eh <= 24; eh++) endHours.push([eh, eh === 24 ? 'Midnight' : fmtHourLabel(eh, s.timeFormat)]);
    var html =
        '<div class="gc-settings">' +
        '<div class="gc-import-head"><h2>' + icon('settings') + 'Settings</h2><button class="gc-icon-btn" data-close title="Close">' + icon('close') + '</button></div>' +
        '<div class="gc-settings-body">' +
        '<section><h3>View</h3>' +
        '<div class="gc-set-row"><span>Start week on</span>' + sel('weekStart', [[0, 'Sunday'], [1, 'Monday'], [6, 'Saturday']], s.weekStart) + '</div>' +
        '<div class="gc-set-row"><span>Time format</span>' + sel('timeFormat', [['12h', '1:00pm'], ['24h', '13:00']], s.timeFormat) + '</div>' +
        '<div class="gc-set-row"><span>Default view</span>' + sel('defaultView', [['day', 'Day'], ['3day', '3 days'], ['4day', '4 days'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['schedule', 'Schedule']], s.defaultView) + '</div>' +
        '<div class="gc-set-row"><span>Your day starts at <small class="gc-muted">(phone week view fits your day on one screen)</small></span>' + sel('dayStartHour', hours, s.dayStartHour) + '</div>' +
        '<div class="gc-set-row"><span>Your day ends at</span>' + sel('dayEndHour', endHours, s.dayEndHour) + '</div>' +
        '<div class="gc-set-row"><span>Density</span>' + sel('density', [['comfortable', 'Comfortable'], ['compact', 'Compact']], s.density) + '</div>' +
        '<div class="gc-set-row"><span>Theme <small class="gc-muted">(this device)</small></span><select class="gc-input sm" data-theme-sel><option value="system">Device default</option><option value="light">Light</option><option value="dark">Dark</option></select></div>' +
        tog('showWeekends', 'Show weekends', s.showWeekends) +
        tog('showWeekNumbers', 'Show week numbers', s.showWeekNumbers) +
        tog('dimPastEvents', 'Reduce the brightness of past events', s.dimPastEvents) +
        tog('showCompletedTasks', 'Show completed tasks & deadlines', s.showCompletedTasks) +
        '</section>' +
        '<section><h3>Event defaults</h3>' +
        '<div class="gc-set-row"><span>Default event duration</span>' + sel('defaultDuration', [[15, '15 minutes'], [30, '30 minutes'], [45, '45 minutes'], [60, '60 minutes'], [90, '90 minutes'], [120, '120 minutes']], s.defaultDuration) + '</div>' +
        '<div class="gc-set-row"><span>Appointment length (when no end time)</span>' + sel('apptDuration', [[60, '1 hour'], [90, '1.5 hours'], [120, '2 hours'], [150, '2.5 hours'], [180, '3 hours (clinic session)'], [210, '3.5 hours'], [240, '4 hours']], s.apptDuration) + '</div>' +
        '<div class="gc-set-row"><span>Default notification</span>' + sel('defaultReminder', remOpts, s.defaultReminder) + '</div>' +
        '<div class="gc-set-row"><span>Default all-day notification</span>' + sel('defaultAllDayReminder', adRemOpts, s.defaultAllDayReminder) + '</div>' +
        '</section>' +
        '<section><h3>Notifications <small class="gc-muted">(this device)</small></h3>' +
        '<div class="gc-set-row"><span>' + (notifState === 'granted' ? 'Desktop notifications are on' : notifState === 'denied' ? 'Notifications are blocked in browser settings' : notifState === 'unsupported' ? 'This browser has no notifications — reminders show in-app' : 'Get desktop notifications for reminders') + '</span>' +
        (notifState === 'default' ? '<button class="gc-btn tonal sm" data-act="notif">Turn on</button>' : notifState === 'granted' ? '<button class="gc-btn text sm" data-act="testnotif">Test</button>' : '') + '</div>' +
        '</section>' +
        '<section><h3>Sync &amp; data</h3>' +
        '<div class="gc-set-row"><span>' + (connected ? icon('cloud_done') + ' Syncing with your PIN — same as your other suite apps' : icon('cloud_off') + ' Not syncing — this device only') + '</span>' +
        (connected ? '<button class="gc-btn text sm" data-act="disconnect">Disconnect</button>' : '<button class="gc-btn tonal sm" data-act="connect">Connect PIN</button>') + '</div>' +
        '<div class="gc-set-actions">' +
        '<button class="gc-btn outlined sm" data-act="syncnow">' + icon('sync') + ' Sync now</button>' +
        '<button class="gc-btn outlined sm" data-act="backups">' + icon('history') + ' Backups &amp; checkpoints</button>' +
        '<button class="gc-btn outlined sm" data-act="import">' + icon('content_paste') + ' Import / export</button>' +
        '<button class="gc-btn outlined sm" data-act="ics">' + icon('download') + ' Download .ics</button>' +
        '</div></section>' +
        '<section><h3>' + icon('install_mobile') + ' Home Screen app</h3>' + installSectionHtml() + '</section>' +
        '<section><h3>Help</h3><div class="gc-set-actions">' +
        '<button class="gc-btn outlined sm" data-act="keys">' + icon('keyboard') + ' Keyboard shortcuts</button>' +
        '<button class="gc-btn outlined sm" data-act="guide">' + icon('smart_toy') + ' Claude paste format</button>' +
        '</div><p class="gc-muted gc-about">Sully Calendar · part of the Dental Quest suite · ' + getCount(state.events) + ' events in ' + getCount(state.calendars) + ' calendars</p></section>' +
        '</div></div>';
    var box = openModal(html, { wide: true, label: 'Settings' });
    box.querySelector('[data-theme-sel]').value = ui.theme;
    box.querySelector('[data-theme-sel]').addEventListener('change', function(e) { ui.theme = e.target.value; saveUiPrefs(); applyTheme(); renderAll(); });
    box.querySelectorAll('[data-set]').forEach(function(el) {
        el.addEventListener('change', function() {
            var k = el.getAttribute('data-set');
            var v = el.value;
            if (['weekStart', 'defaultDuration', 'apptDuration', 'defaultReminder', 'defaultAllDayReminder', 'dayStartHour', 'dayEndHour'].indexOf(k) !== -1) v = +v;
            setSetting(k, v);
            if (k === 'dayStartHour' || k === 'dayEndHour') lastGridRangeKey = null;
        });
    });
    box.querySelectorAll('[data-set-bool]').forEach(function(el) {
        el.addEventListener('change', function() { setSetting(el.getAttribute('data-set-bool'), el.checked); });
    });
    var act = function(name, fn) { var b = box.querySelector('[data-act=' + name + ']'); if (b) b.addEventListener('click', fn); };
    act('notif', function() { requestNotifications().then(function() { closeModal(box); openSettings(); }); });
    act('testnotif', function() { fireNotification('Sully Calendar', 'Notifications are working', 'test-' + Date.now()); });
    act('disconnect', function() { closeModal(box); disconnectPin(); });
    act('connect', function() { closeModal(box); promptForPin(); });
    act('syncnow', function() { forceCloudSync(); });
    act('backups', function() { closeModal(box); showCheckpointManager(); });
    act('import', function() { closeModal(box); openImportDialog('paste'); });
    act('ics', function() { downloadFile('sully-calendar-' + getLocalDateString() + '.ics', buildICS(state.events, state.calendars), 'text/calendar'); });
    act('keys', function() { openShortcutsHelp(); });
    act('guide', function() { closeModal(box); openImportDialog('guide'); });
}

var SHORTCUTS = [
    ['Navigation', [['t', 'Today'], ['j / n', 'Next period'], ['k / p', 'Previous period'], ['g', 'Go to date'], ['/', 'Search']]],
    ['Views', [['d or 1', 'Day'], ['x or 2', '4 days'], ['w or 3', 'Week'], ['m or 4', 'Month'], ['y or 5', 'Year'], ['a or 6', 'Schedule']]],
    ['Actions', [['c', 'Create event'], ['q', 'Quick add'], ['i', 'Import / paste from Claude'], ['e', 'Edit open event'], ['Delete', 'Delete open event'], ['Ctrl/⌘ + Z', 'Undo'], ['s', 'Settings'], ['Esc', 'Close']]]
];

function openShortcutsHelp() {
    var html = '<div class="gc-dialog gc-keys"><h2 class="gc-dialog-title">Keyboard shortcuts</h2><div class="gc-dialog-body gc-keys-grid">' +
        SHORTCUTS.map(function(g) {
            return '<div><h3>' + g[0] + '</h3>' + g[1].map(function(k) { return '<div class="gc-key-row"><kbd>' + escapeHtml(k[0]) + '</kbd><span>' + escapeHtml(k[1]) + '</span></div>'; }).join('') + '</div>';
        }).join('') + '<p class="gc-muted">Tip: paste anywhere on the page (Ctrl/⌘ + V) to open the import preview.</p></div>' +
        '<div class="gc-dialog-actions"><button class="gc-btn filled" data-close>Got it</button></div></div>';
    openModal(html, { label: 'Keyboard shortcuts' });
}

function openGoToDate() {
    var box = openModal('<form class="gc-dialog"><h2 class="gc-dialog-title">Go to date</h2><div class="gc-dialog-body">' +
        '<input type="date" class="gc-input" name="d" autofocus><input class="gc-input" name="t" placeholder="…or type: next friday, 12/15, March 3"></div>' +
        '<div class="gc-dialog-actions"><button type="button" class="gc-btn text" data-close>Cancel</button><button type="submit" class="gc-btn filled">Go</button></div></form>', { narrow: true });
    box.querySelector('[name=d]').value = currentDate;
    box.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        var typed = box.querySelector('[name=t]').value.trim();
        var d = box.querySelector('[name=d]').value;
        if (typed) { var f = findDateInText(typed, getLocalDateString()); if (f) d = f.date; else { showToast('Could not read that date', { type: 'error' }); return; } }
        if (!isValidYMD(d)) return;
        closeModal(box);
        goToDate(d);
    });
}

// ---------------------------------------------------------------- theme
function resolvedTheme() {
    if (ui.theme === 'dark' || ui.theme === 'light') return ui.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ---------------------------------------------------------------- Home Screen app (iPhone)
// iOS turns any page with a manifest + apple-touch-icon into a full-screen app
// from Share → Add to Home Screen. It gets its OWN storage, so the PIN is asked once.
function isStandaloneApp() {
    try { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; }
}

function isIOSDevice() {
    var ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function installStepsHtml() {
    var chrome = /CriOS/.test(navigator.userAgent || '');
    return '<ol class="gc-install-steps">' +
        (chrome ? '<li>Tap ' + icon('ios_share') + ' <b>Share</b> at the right end of Chrome\'s address bar</li>'
            : '<li>Tap ' + icon('ios_share') + ' <b>Share</b> in Safari (on newer iOS it\'s inside the ' + icon('more_horiz') + ' button)</li>') +
        '<li>Scroll the sheet and tap ' + icon('add_to_home_screen') + ' <b>Add to Home Screen</b></li>' +
        '<li>Leave <b>Open as Web App</b> on if you see it, then tap <b>Add</b></li>' +
        '<li>Open <b>Calendar</b> from your Home Screen and enter your PIN once — the app keeps its own copy and syncs like everywhere else</li>' +
        '</ol>';
}

function installSectionHtml() {
    if (isStandaloneApp()) return '<div class="gc-set-row"><span>' + icon('check_circle') + ' Running as a Home Screen app on this device</span></div>';
    return (isIOSDevice() ? '' : '<p class="gc-muted">On your iPhone, open this page in Safari or Chrome, then:</p>') + installStepsHtml();
}

function openInstallHelp() {
    return openModal('<div class="gc-dialog"><h2 class="gc-dialog-title">Put Calendar on your Home Screen</h2>' +
        '<div class="gc-dialog-body"><p>It opens full-screen like a real app — no address bar, one tap away, and it still opens with no signal.</p>' +
        installStepsHtml() + '</div>' +
        '<div class="gc-dialog-actions"><button class="gc-btn filled" data-close>Got it</button></div></div>', { narrow: true, label: 'Add to Home Screen' });
}

function maybeShowInstallHint() {
    if (!isIOSDevice() || isStandaloneApp() || ui.installHintDismissed || document.querySelector('.gc-install-hint')) return;
    var el = document.createElement('div');
    el.className = 'gc-install-hint';
    el.setAttribute('role', 'status');
    el.innerHTML = '<img src="icons/calendar-180.png" alt="" width="36" height="36">' +
        '<div class="gc-install-txt"><b>Make it an app</b><span>Add Calendar to your Home Screen</span></div>' +
        '<button class="gc-btn tonal sm" data-act="how">How</button>' +
        '<button class="gc-icon-btn sm" data-act="x" aria-label="Dismiss">' + icon('close') + '</button>';
    var dismiss = function() { ui.installHintDismissed = true; saveUiPrefs(); if (el.parentNode) el.parentNode.removeChild(el); };
    el.querySelector('[data-act=how]').addEventListener('click', function() { dismiss(); openInstallHelp(); });
    el.querySelector('[data-act=x]').addEventListener('click', dismiss);
    document.body.appendChild(el);
}

// Offline launch for the Home Screen app. Skipped under automation: tests route a
// fake Firebase, and a service worker would fetch around that routing.
function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    if (navigator.webdriver && !/[?&]swtest\b/.test(location.search)) return;
    navigator.serviceWorker.register('calendar-sw.js', { scope: 'calendar.html' }).then(function() {
        return navigator.serviceWorker.ready;
    }).then(function(reg) {
        if (!reg.active) return;
        var urls = [location.href.split('#')[0]];
        try { performance.getEntriesByType('resource').forEach(function(r) { urls.push(r.name); }); } catch (e) {}
        reg.active.postMessage({ type: 'precache', urls: urls });
    }).catch(function(e) { console.warn('Service worker not registered:', e && e.message); });
}

function applyTheme() {
    var t = resolvedTheme();
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#131314' : '#f8fafd');
}

// ---------------------------------------------------------------- notifications
function requestNotifications() {
    if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
    try {
        var p = Notification.requestPermission();
        return p && p.then ? p : Promise.resolve(Notification.permission);
    } catch (e) { return Promise.resolve(Notification.permission); }
}

function fireNotification(title, body, tag, inst) {
    var shown = false;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        try {
            var n = new Notification(title, { body: body, tag: tag, icon: 'data:image/svg+xml,' + encodeURIComponent(FAVICON_SVG) });
            n.onclick = function() { window.focus(); if (inst) { goToDate(inst.startDate); } n.close(); };
            shown = true;
        } catch (e) {}
    }
    if (!shown) showToast(title + ' · ' + body, inst ? { actionLabel: 'Open', onAction: function() { goToDate(inst.startDate); setTimeout(function() { var i = getEventInstanceByKey(inst.key); if (i) openEventDetails(i, null); }, 80); }, duration: 10000 } : { duration: 6000 });
}
