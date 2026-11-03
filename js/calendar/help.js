// ============================================================================
// SULLY CALENDAR — help.js
// Help & tips: one scrollable page (full screen on phones) with a chip bar per
// topic. Quick-add examples are tappable — they open the quick-add sheet
// prefilled. Every example and shortcut listed here is checked against the
// real parser / key map by tests/calendar/help.test.mjs.
// ============================================================================

// [CAL-HELP-START]
// [text you type, what it makes] — shown on the Quick add section.
var HELP_QUICK_EXAMPLES = [
    ['IPPM lecture tues mornings 8-10am until dec 18 blue', 'Every Tuesday 8–10, ends Dec 18, blue'],
    ['Gym MWF 6am for 4 weeks green', 'Mon/Wed/Fri 6 AM for a month, green'],
    ['Dentist next thu 2pm @ BU Dental remind me 1 hour before', 'Place + a 1-hour reminder'],
    ['task: call the lab about Chen\'s crown fri 3pm !high', 'High-priority task'],
    ['PR2 write-up due nov 20 red', 'Red deadline'],
    ['pt Moe tue 8:30', '3-hour patient visit, 8:30–11:30'],
    ['study group every other wed 6-8pm purple', 'Every 2 weeks'],
    ['Coffee tomorrow afternoon for 90 min light blue', '2 PM, 90 minutes'],
    ['board review sat all day // bring flashcards', 'All day, with a note'],
    ['Lab cleanup daily 4pm 10 times no reminder', 'Stops after 10, silent']
];

var SHORTCUTS = [
    ['Navigation', [['t', 'Today'], ['j / n', 'Next period'], ['k / p', 'Previous period'], ['g', 'Go to date'], ['/', 'Search']]],
    ['Views', [['d or 1', 'Day'], ['x or 2', '4 days'], ['w or 3', 'Week'], ['m or 4', 'Month'], ['y or 5', 'Year'], ['a or 6', 'Schedule']]],
    ['Actions', [['c', 'Create event'], ['q', 'Quick add'], ['i', 'Import / paste from Claude'], ['e', 'Edit open event'], ['Delete', 'Delete open event'], ['Ctrl/⌘ + Z', 'Undo'], ['s', 'Settings'], ['?', 'This help'], ['Esc', 'Close']]],
    ['Typing', [['Enter', 'Quick add: add it'], ['Shift + Enter', 'Quick add: open full editor'], ['Ctrl/⌘ + V', 'Paste Claude text anywhere']]]
];
// [CAL-HELP-END]

var HELP_SECTIONS = [
    ['start', 'Start here', 'rocket_launch'],
    ['quick', 'Quick add', 'bolt'],
    ['phone', 'iPhone', 'install_mobile'],
    ['claude', 'Claude', 'smart_toy'],
    ['patients', 'Patients', 'dentistry'],
    ['keys', 'Shortcuts', 'keyboard'],
    ['data', 'Sync & data', 'cloud_sync']
];

function helpSay(t) { return '<code class="gc-help-say">' + escapeHtml(t) + '</code>'; }
function helpRows(rows) {
    return '<dl class="gc-help-rows">' + rows.map(function(r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
}
function helpBtn(act, ic, label) { return '<button type="button" class="gc-btn tonal sm" data-help-act="' + act + '">' + icon(ic) + label + '</button>'; }

function helpSectionHtml(id) {
    var s = helpSay;
    switch (id) {
    case 'start':
        return '<ol class="gc-help-steps">' +
            '<li><b>Add by typing.</b> Tap <b>+</b> (or press <kbd>Q</kbd>) and write it like a text — ' + s('gym MWF 6am green') + '. The card shows exactly what you\'ll get before you add it.</li>' +
            '<li><b>Change by talking.</b> Tell your Claude project what changed — “my 10am Thursday patient cancelled” — then paste its reply here. You tick what lands.</li>' +
            '<li><b>Refresh patients from axiUm.</b> Screenshot the schedule, send it to Claude with the dates it covers, paste. Moves, 3-hour fixes and cancellations are worked out for you.</li>' +
            '<li><b>Undo anything.</b> Every change shows <b>Undo</b>; <kbd>Ctrl/⌘ Z</kbd> goes back 25 steps. Big imports save a backup first.</li>' +
            '<li><b>One PIN, every device.</b> Same PIN as your other suite apps. Works offline and catches up.</li>' +
            '</ol><div class="gc-help-acts">' + helpBtn('quickadd', 'bolt', 'Try quick add') + helpBtn('guide', 'smart_toy', 'Set up Claude') + '</div>';
    case 'quick':
        return '<p>Where: the <b>+</b> button, the box at the top of the sidebar, or <kbd>Q</kbd>. Words can go in any order.</p>' +
            helpRows([
                ['When', s('tomorrow') + ' ' + s('fri') + ' ' + s('next thu') + ' ' + s('nov 20') + ' ' + s('12/15') + ' ' + s('in 2 hours') + ' ' + s('noon') + ' ' + s('8-10am') + ' ' + s('all day') + ' ' + s('dec 4 to dec 6')],
                ['Part of day', s('morning') + ' 9 AM · ' + s('afternoon') + ' 2 PM · ' + s('evening') + ' 6 PM · ' + s('night') + ' 8 PM'],
                ['How long', s('for 90 min') + ' ' + s('for two hours') + ' ' + s('for half an hour')],
                ['Repeat', s('every tuesday') + ' ' + s('tues mornings') + ' ' + s('MWF') + ' ' + s('T/Th') + ' ' + s('tuesdays and thursdays') + ' ' + s('weekdays') + ' ' + s('daily') + ' ' + s('every other wed')],
                ['Stop repeating', s('until dec 18') + ' ' + s('for 6 weeks') + ' ' + s('10 times')],
                ['Color', 'Say it anywhere: red, orange, yellow, gold, green, teal, blue, light blue, navy, purple, pink, gray, brown. Palette names need a cue — ' + s('color mango') + ' or ' + s('#mango') + '. Names stay names (Dr. Green, Red Sox).'],
                ['Place', s('@ BU Dental') + ' — put it last'],
                ['Reminder', s('remind me 1 hour before') + ' ' + s('remind me the day before') + ' ' + s('no reminder')],
                ['Notes', s('// bring flashcards')],
                ['Calendar', s('#school') + ' or ' + s('on my school calendar')],
                ['Priority', s('!high') + ' ' + s('!low') + ' ' + s('!!!')],
                ['Type', s('task: …') + ' or ' + s('remind me to …') + ' → task · ' + s('… due nov 20') + ' → deadline · ' + s('pt Moe tue 8:30') + ' → patient visit']
            ]) +
            '<p class="gc-help-sub">On the phone sheet, the <b>Event / Task / Deadline / Patient</b> chips force the type and <b>More options</b> opens the full editor (<kbd>Shift Enter</kbd> on a computer). Tap an example to try it:</p>' +
            '<div class="gc-help-exs">' + HELP_QUICK_EXAMPLES.map(function(x, i) {
                return '<button type="button" class="gc-help-ex" data-help-ex="' + i + '"><span>' + escapeHtml(x[0]) + '</span><small>' + escapeHtml(x[1]) + '</small></button>';
            }).join('') + '</div>';
    case 'phone':
        return helpRows([
            ['Home Screen app', 'Share → <b>Add to Home Screen</b>. Opens full screen, launches with no signal. It has its own storage, so enter your PIN once there.'],
            ['Whole day on screen', 'The week fits your day — set it in Settings → <b>Your day starts / ends at</b>. Pinch to zoom the hours; ' + icon('unfold_more') + ' above the hours flips fit ↔ full size.'],
            ['Move around', 'Swipe left / right for the next or previous week (day, 4-day, month too). Tap a date number for that day. Tap <b>Today</b> to jump back.'],
            ['Menu', 'Tap the month name at the top for the mini calendar, your calendars, Import, Backups and Help.'],
            ['Create', 'Tap an empty time → new event there. Hold empty time, then drag to draw a longer one. In month view, drag across days for a multi-day event.'],
            ['Change', 'Tap an event for details. Hold it, then drag to move. Hold its bottom edge to resize.'],
            ['Busy days', 'Narrow columns show the title first and shrink the text to fit. In month view tap <b>N more</b> for the full day.']
        ]) + '<div class="gc-help-acts">' + helpBtn('install', 'add_to_home_screen', 'Add to Home Screen') + '</div>';
    case 'claude':
        return helpRows([
            ['Set up once', 'Import → <b>Format guide</b> → <b>Copy Claude project instructions</b>, then paste them into a Claude project\'s Instructions.'],
            ['Then just talk', 'Voice works. ' + s('move John to Friday at 1') + ' ' + s('cancel gym next week') + ' ' + s('IPPM lecture every Tuesday 8–10 until Dec 18') + '. Copy Claude\'s code block and paste it here — Import, <kbd>I</kbd>, or paste anywhere on a computer.'],
            ['No IDs needed', 'Existing items are found by date, time, name and title — typos and nicknames are fine.'],
            ['Preview first', 'Nothing changes until you tap <b>Apply</b>. Unticked rows are ones the app isn\'t sure about — read the note, tick if right. <b>Copy issues for Claude</b> sends the problems back for a fix.'],
            ['Date safety', 'Claude starts with a <b>TODAY:</b> line. If it doesn\'t match your device, or a weekday doesn\'t match its date, those rows stay unticked.'],
            ['Re-paste is safe', 'Changes already applied show as <b>Already done</b>.'],
            ['Exact edits', 'Import → <b>Export for Claude</b> copies your schedule with IDs — e.g. “all of these are patient appointments, make them 3 hours”. One item: event ' + icon('more_vert') + ' → <b>Copy as import text</b>. One calendar: calendar ' + icon('more_vert') + ' → <b>Copy events for Claude</b>.'],
            ['Other calendars', 'Import → <b>.ics file</b> brings in Google, Outlook or Apple exports (previewed first).']
        ]) + '<div class="gc-help-acts">' + helpBtn('guide', 'content_copy', 'Get the Claude instructions') + helpBtn('import', 'content_paste', 'Open Import') + '</div>';
    case 'patients':
        return helpRows([
            ['Quick add a visit', s('pt Moe tue 8:30') + ' (also ' + s('apt') + ', ' + s('patient') + ') → 8:30–11:30 on Clinic. Nicknames are fine. Length: Settings → <b>Appointment length</b>.'],
            ['Full refresh from axiUm', 'Screenshot the schedule → send it to your Claude project: “full refresh, Nov 3 to Nov 13” → paste the reply. Its <b>BOOK:</b> line tells the app those days are the whole book.'],
            ['What it works out', 'Same visit → skipped. Time or procedure changed → updated. Moved to another booked day → moved, not duplicated. New → added. On those days but gone from the book → delete, ticked.'],
            ['Your quick-adds', 'Personal entries like “Moe 8:30–9:30” become proper 3-hour visits with the full name. A partial-name match is flagged <b>Loose match</b>. Colored or “pt” weekday events with no match are offered for delete, unticked.'],
            ['Small changes', 'No full refresh? Just say what changed — “Jane cancelled Thursday”. Nothing else is touched.'],
            ['Grad Roadmap', 'Sidebar → Other calendars → <b>Roadmap · Clinic appointments</b> shows the Roadmap\'s visits, read-only.']
        ]) +
            '<div class="gc-help-card"><b>For a reliable refresh</b><ol>' +
            '<li>Screenshot <b>every</b> day in the range — anything missing from those days counts as cancelled.</li>' +
            '<li>Give Claude the exact first and last date.</li>' +
            '<li>Before Apply, check rows marked <b>Loose match</b> and anything unticked.</li>' +
            '</ol></div>';
    case 'keys':
        return '<div class="gc-keys-grid">' + SHORTCUTS.map(function(g) {
            return '<div><h3>' + g[0] + '</h3>' + g[1].map(function(k) { return '<div class="gc-key-row"><kbd>' + escapeHtml(k[0]) + '</kbd><span>' + escapeHtml(k[1]) + '</span></div>'; }).join('') + '</div>';
        }).join('') + '</div><p class="gc-help-sub">Keys work whenever you\'re not typing in a box. On a computer, tap the month title to jump to any date (' + s('next friday') + ', ' + s('3/12') + ').</p>';
    case 'data':
        return helpRows([
            ['Sync', 'Settings → <b>Connect PIN</b> — the same PIN as Quest, Roadmap, Sleep Calc and Body Comp. Saves to the device first, then the cloud; offline edits catch up. The cloud icon in the header syncs now.'],
            ['Undo', '<b>Undo</b> on any toast or <kbd>Ctrl/⌘ Z</kbd> — 25 steps.'],
            ['Backups', 'Sidebar → <b>Backups</b>. One is saved automatically before big or destructive imports; restore any time.'],
            ['Calendars', 'Calendar ' + icon('more_vert') + ' → Display this only · Show all · color · settings · Copy events for Claude. ' + icon('add') + ' next to My calendars makes a new one.'],
            ['Other calendars', 'US holidays and your Grad Roadmap (clinic appointments, deadlines, D4 schedule). Read-only — tick to show.'],
            ['Tasks & deadlines', 'Open one → <b>Mark completed</b>, or tick the circle in Schedule view. The overdue card in the sidebar can complete them all at once.'],
            ['Search', '<kbd>/</kbd> or ' + icon('search') + ' — matches titles, patients, procedures, places, notes and calendar names.'],
            ['Reminders', 'Fire while the calendar is open — as a notification (Settings → Notifications) or an in-app alert.'],
            ['Export', 'Settings → <b>Download .ics</b> opens in any calendar app.'],
            ['Worth setting', 'Settings: week start, your day start / end, default length, appointment length, default reminder, theme.']
        ]);
    }
    return '';
}

function openHelp(sectionId) {
    closePopover(true);
    if (typeof closeMenu === 'function') closeMenu();
    var old = document.getElementById('gcHelp');
    if (old) closeModal(old);
    if (isPhone() && ui.sidebarOpen) toggleSidebar(false); // opened from the drawer
    var html = '<div class="gc-help">' +
        '<div class="gc-import-head"><h2>' + icon('help') + 'Help &amp; tips</h2><button class="gc-icon-btn" data-close title="Close" aria-label="Close">' + icon('close') + '</button></div>' +
        '<nav class="gc-help-nav" aria-label="Help topics">' + HELP_SECTIONS.map(function(x) {
            return '<button type="button" class="gc-help-chip" data-help-go="' + x[0] + '">' + icon(x[2]) + x[1] + '</button>';
        }).join('') + '</nav>' +
        '<div class="gc-help-body">' + HELP_SECTIONS.map(function(x) {
            return '<section class="gc-help-sec" id="gcHelp-' + x[0] + '" data-help-sec="' + x[0] + '"><h3>' + icon(x[2]) + x[1] + '</h3>' + helpSectionHtml(x[0]) + '</section>';
        }).join('') + '</div></div>';
    var box = openModal(html, { full: true, id: 'gcHelp', label: 'Help & tips' });
    var body = box.querySelector('.gc-help-body');
    var chips = box.querySelectorAll('[data-help-go]');
    var mark = function(id) {
        chips.forEach(function(c) {
            var on = c.getAttribute('data-help-go') === id;
            c.classList.toggle('on', on);
            if (on && c.scrollIntoView && c.parentNode.scrollWidth > c.parentNode.clientWidth) {
                var p = c.parentNode;
                p.scrollLeft = Math.max(0, c.offsetLeft - (p.clientWidth - c.offsetWidth) / 2);
            }
        });
    };
    var go = function(id, smooth) {
        var sec = box.querySelector('[data-help-sec="' + id + '"]');
        if (!sec) return;
        body.scrollTo({ top: sec.offsetTop - body.offsetTop, behavior: smooth ? 'smooth' : 'auto' });
        mark(id);
    };
    chips.forEach(function(c) { c.addEventListener('click', function() { go(c.getAttribute('data-help-go'), true); }); });
    var ticking = false;
    body.addEventListener('scroll', function() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function() {
            ticking = false;
            var top = body.scrollTop + 24, cur = HELP_SECTIONS[0][0];
            if (body.scrollTop + body.clientHeight >= body.scrollHeight - 4) cur = HELP_SECTIONS[HELP_SECTIONS.length - 1][0];
            else box.querySelectorAll('[data-help-sec]').forEach(function(sec) { if (sec.offsetTop - body.offsetTop <= top) cur = sec.getAttribute('data-help-sec'); });
            mark(cur);
        });
    }, { passive: true });
    box.querySelectorAll('[data-help-ex]').forEach(function(b) {
        b.addEventListener('click', function() {
            var ex = HELP_QUICK_EXAMPLES[+b.getAttribute('data-help-ex')];
            closeModal(box);
            openQuickAddSheet(ex[0]);
        });
    });
    var acts = {
        quickadd: function() { closeModal(box); openQuickAddSheet(); },
        guide: function() { closeModal(box); openImportDialog('guide'); },
        import: function() { closeModal(box); openImportDialog('paste'); },
        install: function() { openInstallHelp(); }
    };
    box.querySelectorAll('[data-help-act]').forEach(function(b) {
        b.addEventListener('click', function() { var fn = acts[b.getAttribute('data-help-act')]; if (fn) fn(); });
    });
    mark(sectionId && box.querySelector('[data-help-sec="' + sectionId + '"]') ? sectionId : HELP_SECTIONS[0][0]);
    if (sectionId) requestAnimationFrame(function() { go(sectionId, false); });
    return box;
}

function openShortcutsHelp() { return openHelp('keys'); }
