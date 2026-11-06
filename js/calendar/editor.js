// ============================================================================
// SULLY CALENDAR — editor.js
// Event details popover, quick-create popover (with live draft on the grid),
// full event editor (types, times, repeat, reminders, color, calendar,
// appointment + task fields), custom repeat dialog.
// Saves go through events.js (stamp → persistLocal → saveState → render).
// ============================================================================

var draftPreview = null;
var REMINDER_CHOICES = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];
var OCC_EDIT_FIELDS = { title: 1, location: 1, notes: 1, color: 1, done: 1, startDate: 1, endDate: 1, startTime: 1, endTime: 1, allDay: 1 };

function setDraftPreview(d) { draftPreview = d; if (typeof renderView === 'function') renderView(); }
function clearDraftPreview() { if (draftPreview) { draftPreview = null; if (typeof renderView === 'function') renderView(); } }

function reminderLabel(m, allDay) {
    if (allDay) {
        if (m === 0) return 'On the day at 9am';
        if (m % 10080 === 0) return (m / 10080) + (m === 10080 ? ' week' : ' weeks') + ' before at 9am';
        if (m % 1440 === 0) return (m / 1440) + (m === 1440 ? ' day' : ' days') + ' before at 9am';
        return m + ' minutes before 9am';
    }
    if (m === 0) return 'At time of event';
    if (m % 10080 === 0) return (m / 10080) + (m === 10080 ? ' week' : ' weeks') + ' before';
    if (m % 1440 === 0) return (m / 1440) + (m === 1440 ? ' day' : ' days') + ' before';
    if (m % 60 === 0) return (m / 60) + (m === 60 ? ' hour' : ' hours') + ' before';
    return m + ' minutes before';
}

function typeIcon(type) {
    return { task: 'task_alt', deadline: 'flag', appointment: 'dentistry', event: 'event' }[type] || 'event';
}

function whenText(inst) {
    var fmt = state.settings.timeFormat;
    if (inst.allDay) {
        if (inst.endDate && inst.endDate !== inst.startDate) return fmtDateLong(inst.startDate) + ' – ' + fmtDateLong(inst.endDate);
        return fmtDateLong(inst.startDate);
    }
    if (inst.endDate && inst.endDate !== inst.startDate) {
        return fmtDateLong(inst.startDate) + ', ' + fmtTime(inst.startTime, fmt) + ' – ' + fmtDateLong(inst.endDate) + ', ' + fmtTime(inst.endTime, fmt);
    }
    if ((inst.type === 'task' || inst.type === 'deadline') && inst.startTime === inst.endTime) {
        return fmtDateLong(inst.startDate) + ' · ' + (inst.type === 'deadline' ? 'Due ' : '') + fmtTime(inst.startTime, fmt);
    }
    return fmtDateLong(inst.startDate) + ' · ' + fmtTimeRange(inst.startTime, inst.endTime, fmt);
}

function linkify(escaped) {
    return escaped.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function calendarOptionsHtml(selectedId) {
    return getCalendarList().map(function(c) {
        return '<option value="' + escapeHtml(c.id) + '"' + (c.id === selectedId ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
    }).join('');
}

// ---------------------------------------------------------------- scoped apply (editor + import)
// updateInstance()'s 'this' scope only carries timing/text/done; series-level
// fields (calendar, reminders, priority, type, patient…) go to the whole series.
function applyInstanceChanges(inst, changes, scope) {
    var ev = state.events[inst.id];
    if (!ev) return false;
    if (!ev.recurrence || !inst.occ || scope !== 'this') return updateInstance(inst, changes, scope);
    var occ = {}, series = {}, anyO = false, anyS = false;
    Object.keys(changes).forEach(function(k) {
        if (OCC_EDIT_FIELDS[k]) { occ[k] = changes[k]; anyO = true; } else { series[k] = changes[k]; anyS = true; }
    });
    if (anyS) updateInstance(inst, series, 'all');
    if (anyO) {
        var fresh = buildInstance(state.events[inst.id], inst.occ) || inst;
        updateInstance(fresh, occ, 'this');
    }
    return true;
}

// ---------------------------------------------------------------- details popover
function openEventDetails(inst, anchor) {
    if (!inst) return;
    var hex = instColorHex(inst);
    var cal = inst.calendarId ? getCalendar(inst.calendarId) : null;
    var ro = !!inst.readOnly;
    var rows = [];
    var ev = inst.id ? state.events[inst.id] : null;
    var sub = escapeHtml(whenText(inst));
    if (ev && ev.recurrence) sub += '<div class="gc-pop-sub">' + escapeHtml(describeRecurrence(ev.recurrence, ev.startDate)) + '</div>';
    if (isOverdue(inst)) sub += '<div class="gc-pop-sub overdue">' + icon('schedule') + ' Overdue</div>';
    if (inst.type === 'appointment') {
        var who = escapeHtml(inst.patientName || 'Patient') + (inst.chartNumber ? ' <span class="gc-muted">· Chart ' + escapeHtml(inst.chartNumber) + '</span>' : '');
        rows.push(['person', who]);
        if (inst.procedure) rows.push(['medical_services', escapeHtml(inst.procedure).replace(/\n/g, '<br>')]);
        if (inst.chair) rows.push(['chair', 'Chair ' + escapeHtml(inst.chair)]);
    }
    if (inst.location) {
        rows.push(['location_on', '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(inst.location) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(inst.location) + '</a>']);
    }
    if (inst.notes) rows.push(['notes', '<div class="gc-pop-notes">' + linkify(escapeHtml(inst.notes)).replace(/\n/g, '<br>') + '</div>']);
    if (inst.priority) rows.push(['priority_high', escapeHtml(inst.priority.charAt(0).toUpperCase() + inst.priority.slice(1)) + ' priority']);
    var rms = reminderMinutes(inst);
    if (rms.length && !ro) rows.push(['notifications', rms.map(function(m) { return escapeHtml(reminderLabel(m, inst.allDay)); }).join('<br>')]);
    if (cal) rows.push(['calendar_today', escapeHtml(cal.name)]);
    if (inst.overlay) rows.push(['visibility', escapeHtml(OVERLAY_DEFS[inst.overlay].name) + ' <span class="gc-muted">· read-only</span>']);
    var isTask = inst.type === 'task' || inst.type === 'deadline';

    var html = '<div class="gc-pop-actions">' +
        (ro ? '' :
            '<button class="gc-icon-btn" data-act="edit" title="Edit event (e)">' + icon('edit') + '</button>' +
            '<button class="gc-icon-btn" data-act="delete" title="Delete event (Delete)">' + icon('delete') + '</button>' +
            '<button class="gc-icon-btn" data-act="color" title="Change color">' + icon('palette') + '</button>' +
            '<button class="gc-icon-btn" data-act="more" title="Options">' + icon('more_vert') + '</button>') +
        '<button class="gc-icon-btn" data-close title="Close">' + icon('close') + '</button></div>' +
        '<div class="gc-pop-body">' +
        '<div class="gc-pop-row gc-pop-head"><span class="gc-pop-swatch ' + escapeHtml(inst.type) + '" style="background:' + hex + '"></span>' +
        '<div><div class="gc-pop-title' + (inst.done ? ' done' : '') + '">' + icon(typeIcon(inst.type), 'gc-pop-type') + escapeHtml(displayTitle(inst)) + '</div>' +
        '<div class="gc-pop-sub">' + sub + '</div></div></div>' +
        rows.map(function(r) { return '<div class="gc-pop-row">' + icon(r[0]) + '<div class="gc-pop-val">' + r[1] + '</div></div>'; }).join('') +
        '</div>' +
        (isTask && !ro ? '<div class="gc-pop-foot"><button class="gc-btn ' + (inst.done ? 'outlined' : 'tonal') + '" data-act="done">' + icon(inst.done ? 'undo' : 'check') + (inst.done ? ' Mark uncompleted' : ' Mark completed') + '</button></div>' : '');

    var el = openPopover(html, anchor, { key: inst.key, className: 'gc-details' });
    if (ro) return;
    el.querySelector('[data-act=edit]').onclick = function() { closePopover(); openEditor({ instKey: inst.key }); };
    el.querySelector('[data-act=delete]').onclick = function() { userDeleteInstance(inst); };
    el.querySelector('[data-act=color]').onclick = function(e) { openColorMenu(e.currentTarget, inst); };
    el.querySelector('[data-act=more]').onclick = function(e) {
        openMenu(e.currentTarget, [
            { label: 'Duplicate', icon: 'content_copy', onClick: function() { userDuplicateInstance(inst); } },
            { label: 'Copy as import text', icon: 'content_paste_go', onClick: function() { copyText(formatEventForImport(state.events[inst.id], inst), 'Copied — paste it into Claude to edit'); } },
            { label: 'Move to calendar…', icon: 'drive_file_move', onClick: function() { openMoveToCalendarMenu(el.querySelector('[data-act=more]'), inst); } },
            isTask ? { label: inst.done ? 'Mark uncompleted' : 'Mark completed', icon: 'check_circle', onClick: function() { closePopover(); userToggleDone(inst); } } : null,
            { divider: true },
            { label: 'Delete', icon: 'delete', danger: true, onClick: function() { userDeleteInstance(inst); } }
        ]);
    };
    var doneBtn = el.querySelector('[data-act=done]');
    if (doneBtn) doneBtn.onclick = function() { closePopover(); userToggleDone(inst); };
}

function openColorMenu(anchor, inst) {
    var ev = state.events[inst.id];
    var current = ev ? ev.color : null;
    var sw = EVENT_PALETTE_ORDER.map(function(k) {
        return '<button class="gc-swatch-btn' + (current === k ? ' sel' : '') + '" data-color="' + k + '" title="' + escapeHtml(CAL_COLORS[k].name) + '" style="background:' + CAL_COLORS[k].hex + '">' + (current === k ? icon('check') : '') + '</button>';
    }).join('');
    var calHex = calendarColorHex(inst.calendarId);
    var html = '<div class="gc-swatch-grid">' + sw + '</div><button class="gc-swatch-default' + (!current ? ' sel' : '') + '" data-color=""><span class="gc-dot" style="background:' + calHex + '"></span>Calendar color</button>';
    openMenu(anchor, [{ html: html }], {
        className: 'gc-color-menu', noFocus: true,
        onMount: function(m) {
            m.querySelectorAll('[data-color]').forEach(function(b) {
                b.addEventListener('click', function() {
                    var c = b.getAttribute('data-color') || null;
                    closeMenu();
                    closePopover();
                    userSetEventColor(inst, c);
                });
            });
        }
    });
}

function openMoveToCalendarMenu(anchor, inst) {
    var ev = state.events[inst.id];
    if (!ev) return;
    openMenu(anchor, getCalendarList().map(function(c) {
        return {
            label: c.name, checked: c.id === ev.calendarId,
            html: null,
            icon: c.id === ev.calendarId ? 'check' : 'circle',
            onClick: function() {
                if (c.id === ev.calendarId) return;
                var ch = beginChange('move to ' + c.name);
                patchEventRecord(ev.id, { calendarId: c.id });
                closePopover();
                finishChange(ch, 'Moved to ' + c.name);
            }
        };
    }));
}

function copyText(text, okMsg) {
    var done = function() { showToast(okMsg || 'Copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function() { fallbackCopy(text) ? done() : showToast('Copy failed', { type: 'error' }); });
    } else if (fallbackCopy(text)) done(); else showToast('Copy failed', { type: 'error' });
}

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
}

// ---------------------------------------------------------------- quick create
function draftForType(d, type) {
    var x = Object.assign({}, d, { type: type });
    if ((type === 'task' || type === 'deadline') && !x.allDay) { x.endDate = x.startDate; x.endTime = x.startTime; }
    if ((type === 'event' || type === 'appointment') && !x.allDay && x.startTime === x.endTime) {
        var dur = type === 'appointment' ? state.settings.apptDuration : state.settings.defaultDuration;
        var e = absToDateTime(absOf(x.startDate, x.startTime) + dur);
        x.endDate = e.date; x.endTime = e.time;
    }
    return x;
}

function openQuickCreate(draft, anchor) {
    var d = Object.assign({ type: 'event', allDay: false, title: '' }, draft);
    if (!d.allDay && !d.endTime) { var e0 = absToDateTime(absOf(d.startDate, d.startTime) + state.settings.defaultDuration); d.endDate = e0.date; d.endTime = e0.time; }
    if (!d.endDate) d.endDate = d.startDate;
    d = draftForType(d, d.type);
    d.calendarId = d.calendarId || getCalendarForTypePreview(d.type);
    var html =
        '<form class="gc-qc" autocomplete="off">' +
        '<div class="gc-pop-actions"><button type="button" class="gc-icon-btn" data-close title="Close">' + icon('close') + '</button></div>' +
        '<div class="gc-qc-main">' +
        '<input class="gc-qc-title" name="title" placeholder="Add title" maxlength="500">' +
        '<div class="gc-type-tabs" role="tablist">' + ['event', 'task', 'deadline', 'appointment'].map(function(t) {
            return '<button type="button" role="tab" class="gc-type-tab' + (t === d.type ? ' active' : '') + '" data-type="' + t + '">' + EVENT_TYPES[t] + '</button>';
        }).join('') + '</div>' +
        '<div class="gc-qc-row">' + icon('schedule') + '<button type="button" class="gc-qc-when" data-act="more"></button></div>' +
        '<div class="gc-qc-row gc-qc-appt">' + icon('person') + '<input name="patient" placeholder="Patient name"><input name="chart" class="gc-qc-chart" placeholder="Chart #"></div>' +
        '<div class="gc-qc-row gc-qc-appt">' + icon('medical_services') + '<input name="procedure" placeholder="Procedure"></div>' +
        '<div class="gc-qc-row gc-qc-loc">' + icon('location_on') + '<input name="location" placeholder="Add location"></div>' +
        '<div class="gc-qc-row">' + icon('notes') + '<input name="notes" placeholder="Add description"></div>' +
        '<div class="gc-qc-row">' + icon('calendar_today') + '<span class="gc-dot gc-qc-caldot"></span><select name="calendarId" class="gc-select-plain">' + calendarOptionsHtml(d.calendarId) + '</select></div>' +
        '</div>' +
        '<div class="gc-qc-actions"><button type="button" class="gc-btn text" data-act="more">More options</button><button type="submit" class="gc-btn filled">Save</button></div>' +
        '</form>';
    var el = openPopover(html, anchor, { className: 'gc-quick', onClose: function() { draftPreview = null; } });
    var form = el.querySelector('form');
    var titleIn = form.querySelector('[name=title]');
    function sync() {
        el.querySelector('.gc-qc-when').textContent = whenText(Object.assign({}, d, { done: false }));
        el.classList.toggle('is-appt', d.type === 'appointment');
        el.classList.toggle('is-task', d.type === 'task' || d.type === 'deadline');
        titleIn.placeholder = d.type === 'appointment' ? 'Add title (optional)' : d.type === 'task' ? 'Add task' : d.type === 'deadline' ? 'Add deadline' : 'Add title';
        var calSel = form.querySelector('[name=calendarId]');
        el.querySelector('.gc-qc-caldot').style.background = calendarColorHex(calSel.value);
        draftPreview = { type: d.type, startDate: d.startDate, endDate: d.endDate, startTime: d.allDay ? null : d.startTime, endTime: d.allDay ? null : d.endTime, allDay: d.allDay,
            title: titleIn.value.trim() || (d.type === 'appointment' ? (form.querySelector('[name=patient]').value.trim() || '(No title)') : '(No title)'), color: null, calendarId: calSel.value };
        if (typeof renderView === 'function') renderView();
    }
    el.querySelectorAll('.gc-type-tab').forEach(function(b) {
        b.addEventListener('click', function() {
            var prevDefault = getCalendarForTypePreview(d.type);
            d = draftForType(d, b.getAttribute('data-type'));
            var calSel = form.querySelector('[name=calendarId]');
            if (calSel.value === prevDefault) calSel.value = getCalendarForTypePreview(d.type) || calSel.value;
            el.querySelectorAll('.gc-type-tab').forEach(function(x) { x.classList.toggle('active', x === b); });
            sync();
            titleIn.focus();
        });
    });
    form.querySelector('[name=calendarId]').addEventListener('change', sync);
    titleIn.addEventListener('input', function() { if (draftPreview) { draftPreview.title = titleIn.value.trim() || '(No title)'; if (typeof renderView === 'function') renderView(); } });
    form.querySelector('[name=patient]').addEventListener('input', sync);
    function collect() {
        return {
            type: d.type, title: titleIn.value.trim(), allDay: d.allDay,
            startDate: d.startDate, endDate: d.endDate, startTime: d.allDay ? null : d.startTime, endTime: d.allDay ? null : d.endTime,
            location: form.querySelector('[name=location]').value.trim(), notes: form.querySelector('[name=notes]').value.trim(),
            calendarId: form.querySelector('[name=calendarId]').value,
            patientName: form.querySelector('[name=patient]').value.trim(), chartNumber: form.querySelector('[name=chart]').value.trim(),
            procedure: form.querySelector('[name=procedure]').value.trim()
        };
    }
    el.querySelectorAll('[data-act=more]').forEach(function(b) {
        b.addEventListener('click', function() { var f = collect(); closePopover(); openEditor({ draft: f }); });
    });
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var f = collect();
        if (!f.title && f.type !== 'appointment') f.title = '';
        f.reminders = defaultRemindersFor(f.allDay);
        var ch = beginChange('create');
        var ev = createEventRecord(Object.assign(f, { source: 'manual' }));
        draftPreview = null;
        closePopover(true);
        finishChange(ch, (EVENT_TYPES[ev.type] || 'Event') + ' saved');
    });
    sync();
    setTimeout(function() { try { titleIn.focus(); } catch (err) {} }, 30);
}

function getCalendarForTypePreview(type) {
    var kind = TYPE_TO_KIND[type] || 'general';
    var list = getCalendarList();
    var hit = list.find(function(c) { return c.kind === kind; }) || list.find(function(c) { return c.kind === 'general'; }) || list[0];
    return hit ? hit.id : '';
}

function defaultRemindersFor(allDay) {
    var m = allDay ? state.settings.defaultAllDayReminder : state.settings.defaultReminder;
    return (m !== null && m !== undefined && m >= 0) ? normalizeReminders([m]) : {};
}

// ---------------------------------------------------------------- full editor
// opts: { instKey } edit an existing occurrence | { draft } new event prefilled
function openEditor(opts) {
    opts = opts || {};
    closePopover(true);
    var inst = opts.instKey ? getEventInstanceByKey(opts.instKey) : (opts.eventId && state.events[opts.eventId] ? buildInstance(state.events[opts.eventId], null) : null);
    if (inst && inst.readOnly) return;
    var ev = inst ? state.events[inst.id] : null;
    var isNew = !ev;
    var today = getLocalDateString();
    var base = inst ? Object.assign({}, inst) : Object.assign({
        type: 'event', title: '', allDay: false, startDate: currentDate || today, startTime: nextHalfHour(), location: '', notes: '',
        calendarId: null, color: null, reminders: null, priority: null, done: false, patientName: '', chartNumber: '', procedure: '', chair: ''
    }, opts.draft || {});
    if (!base.endDate) base.endDate = base.startDate;
    if (!base.allDay && !base.endTime) {
        var e0 = absToDateTime(absOf(base.startDate, base.startTime) + (base.type === 'appointment' ? state.settings.apptDuration : state.settings.defaultDuration));
        base.endDate = e0.date; base.endTime = e0.time;
    }
    if (!base.calendarId) base.calendarId = getCalendarForTypePreview(base.type);
    if (!base.reminders) base.reminders = defaultRemindersFor(base.allDay);
    var rec = ev && ev.recurrence ? deepClone(ev.recurrence) : (!ev && opts.draft && opts.draft.recurrence ? normalizeRecurrence(opts.draft.recurrence) : null);
    var seriesStart = ev ? ev.startDate : base.startDate;
    var reminders = reminderMinutes(base);
    var lastTimedSpan = { startTime: base.startTime || '09:00', endTime: base.endTime || '10:00' };

    var html =
        '<form class="gc-editor" autocomplete="off">' +
        '<div class="gc-editor-top">' +
        '<button type="button" class="gc-icon-btn" data-close title="Close">' + icon('close') + '</button>' +
        '<input class="gc-editor-title" name="title" placeholder="Add title" maxlength="500">' +
        '<button type="submit" class="gc-btn filled gc-editor-save">Save</button>' +
        '</div>' +
        '<div class="gc-editor-scroll">' +
        '<div class="gc-type-tabs">' + ['event', 'task', 'deadline', 'appointment'].map(function(t) {
            return '<button type="button" class="gc-type-tab' + (t === base.type ? ' active' : '') + '" data-type="' + t + '">' + icon(typeIcon(t)) + EVENT_TYPES[t] + '</button>';
        }).join('') + '</div>' +
        '<div class="gc-ed-row gc-ed-when">' + icon('schedule') + '<div class="gc-ed-when-fields">' +
        '<div class="gc-ed-line"><input type="date" name="startDate" class="gc-input sm" required>' +
        '<input type="time" name="startTime" class="gc-input sm gc-timed" step="300">' +
        '<span class="gc-ed-to gc-span-only">to</span>' +
        '<input type="time" name="endTime" class="gc-input sm gc-timed gc-span-only" step="300">' +
        '<input type="date" name="endDate" class="gc-input sm gc-span-only"></div>' +
        '<div class="gc-ed-line"><label class="gc-check"><input type="checkbox" name="allDay"><span>All day</span></label>' +
        '<select name="repeat" class="gc-input sm gc-ed-repeat"></select></div>' +
        '<div class="gc-ed-error" hidden></div>' +
        '</div></div>' +
        '<div class="gc-ed-section gc-ed-appt">' +
        '<div class="gc-ed-row">' + icon('person') + '<input name="patientName" class="gc-input" placeholder="Patient name"><input name="chartNumber" class="gc-input gc-ed-chart" placeholder="Chart #"></div>' +
        '<div class="gc-ed-row">' + icon('medical_services') + '<textarea name="procedure" class="gc-input" rows="2" placeholder="Procedure(s)"></textarea></div>' +
        '<div class="gc-ed-row">' + icon('chair') + '<input name="chair" class="gc-input gc-ed-chair" placeholder="Chair / operatory"></div>' +
        '</div>' +
        '<div class="gc-ed-row">' + icon('location_on') + '<input name="location" class="gc-input" placeholder="Add location"></div>' +
        '<div class="gc-ed-row">' + icon('calendar_today') + '<span class="gc-dot gc-ed-caldot"></span><select name="calendarId" class="gc-input">' + calendarOptionsHtml(base.calendarId) + '</select>' +
        '<button type="button" class="gc-color-pick" data-act="color" title="Event color"><span class="gc-dot gc-ed-colordot"></span>' + icon('arrow_drop_down') + '</button></div>' +
        '<div class="gc-ed-row gc-ed-task">' + icon('priority_high') + '<select name="priority" class="gc-input"><option value="">No priority</option><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select>' +
        '<label class="gc-check gc-ed-donechk"><input type="checkbox" name="done"><span>Completed</span></label></div>' +
        '<div class="gc-ed-row gc-ed-reminders">' + icon('notifications') + '<div class="gc-ed-rem-list"></div></div>' +
        '<div class="gc-ed-row">' + icon('notes') + '<textarea name="notes" class="gc-input" rows="5" placeholder="Add description"></textarea></div>' +
        '</div>' +
        '<div class="gc-editor-foot">' +
        (isNew ? '' : '<button type="button" class="gc-btn text danger" data-act="delete">' + icon('delete') + ' Delete</button>') +
        '<span class="gc-flex"></span><button type="button" class="gc-btn text" data-close>Cancel</button><button type="submit" class="gc-btn filled">Save</button>' +
        '</div></form>';
    var box = openModal(html, { full: true, label: isNew ? 'Create event' : 'Edit event' });
    var form = box.querySelector('form');
    var F = function(n) { return form.querySelector('[name="' + n + '"]'); };
    var cur = { type: base.type, color: base.color || null };

    F('title').value = base.title || '';
    F('startDate').value = base.startDate;
    F('endDate').value = base.endDate;
    F('startTime').value = base.allDay ? lastTimedSpan.startTime : base.startTime;
    F('endTime').value = base.allDay ? lastTimedSpan.endTime : base.endTime;
    F('allDay').checked = !!base.allDay;
    F('location').value = base.location || '';
    F('notes').value = base.notes || '';
    F('patientName').value = base.patientName || '';
    F('chartNumber').value = base.chartNumber || '';
    F('procedure').value = base.procedure || '';
    F('chair').value = base.chair || '';
    F('priority').value = base.priority || '';
    F('done').checked = !!base.done;

    function isPoint() { return cur.type === 'task' || cur.type === 'deadline'; }

    function refreshRepeat() {
        var sd = F('startDate').value || base.startDate;
        var presets = recurrencePresets(sd);
        var key = presetKeyForRecurrence(rec, isNew || !ev.recurrence ? sd : seriesStart);
        var opts2 = presets.map(function(p) { return '<option value="' + p.key + '">' + escapeHtml(p.label) + '</option>'; });
        if (key === 'custom' && rec) opts2.splice(opts2.length - 1, 0, '<option value="current">' + escapeHtml(describeRecurrence(rec, sd)) + '</option>');
        F('repeat').innerHTML = opts2.join('');
        F('repeat').value = key === 'custom' && rec ? 'current' : key;
    }

    function refreshShape() {
        var allDay = F('allDay').checked, point = isPoint();
        F('startTime').hidden = allDay;
        F('endTime').hidden = point || allDay;
        F('endDate').hidden = point;
        box.querySelector('.gc-ed-to').hidden = point;
        box.classList.toggle('is-appt', cur.type === 'appointment');
        box.classList.toggle('is-task', isPoint());
        F('title').placeholder = cur.type === 'appointment' ? 'Add title (optional — patient name shows)' : cur.type === 'task' ? 'Add task' : cur.type === 'deadline' ? 'Add deadline' : 'Add title';
        box.querySelector('.gc-ed-caldot').style.background = calendarColorHex(F('calendarId').value);
        box.querySelector('.gc-ed-colordot').style.background = cur.color ? colorHex(cur.color) : calendarColorHex(F('calendarId').value);
        renderReminderRows();
    }

    function renderReminderRows() {
        var allDay = F('allDay').checked;
        var list = box.querySelector('.gc-ed-rem-list');
        var choices = REMINDER_CHOICES.slice();
        reminders.forEach(function(m) { if (choices.indexOf(m) === -1) choices.push(m); });
        choices.sort(function(a, b) { return a - b; });
        list.innerHTML = reminders.map(function(m, i) {
            return '<div class="gc-ed-rem"><select class="gc-input sm" data-i="' + i + '">' + choices.map(function(c) {
                return '<option value="' + c + '"' + (c === m ? ' selected' : '') + '>' + escapeHtml(reminderLabel(c, allDay)) + '</option>';
            }).join('') + '</select><button type="button" class="gc-icon-btn sm" data-rm="' + i + '" title="Remove notification">' + icon('close') + '</button></div>';
        }).join('') + (reminders.length < 5 ? '<button type="button" class="gc-btn text sm" data-act="addrem">Add notification</button>' : '');
        list.querySelectorAll('select').forEach(function(s) { s.onchange = function() { reminders[+s.getAttribute('data-i')] = +s.value; }; });
        list.querySelectorAll('[data-rm]').forEach(function(b) { b.onclick = function() { reminders.splice(+b.getAttribute('data-rm'), 1); renderReminderRows(); }; });
        var add = list.querySelector('[data-act=addrem]');
        if (add) add.onclick = function() { reminders.push(allDay ? 1440 : 30); renderReminderRows(); };
    }

    // keep duration when the start moves (Google behavior)
    var prevStartAbs = absOf(F('startDate').value, F('startTime').value || '00:00');
    function onStartChange() {
        var sd = F('startDate').value;
        if (!isValidYMD(sd)) return;
        var st = F('startTime').value || '09:00';
        var newAbs = absOf(sd, st);
        var delta = newAbs - prevStartAbs;
        prevStartAbs = newAbs;
        if (F('allDay').checked || isPoint()) {
            var ed = F('endDate').value;
            if (isValidYMD(ed)) F('endDate').value = addDays(ed, Math.round(delta / 1440)) < sd ? sd : addDays(ed, Math.round(delta / 1440));
            else F('endDate').value = sd;
        } else if (isValidYMD(F('endDate').value) && isValidHHMM(F('endTime').value)) {
            var e = absToDateTime(absOf(F('endDate').value, F('endTime').value) + delta);
            F('endDate').value = e.date; F('endTime').value = e.time;
        }
        // a preset repeat follows the start date ("Weekly on Thursday" → "Weekly on Friday")
        var k = F('repeat').value;
        if ((isNew || !ev.recurrence) && rec && k !== 'current' && k !== 'custom' && k !== 'none') {
            var pr = recurrencePresets(sd).find(function(x) { return x.key === k; }) || recurrencePresets(sd).find(function(x) { return x.key === 'monthly-day'; });
            if (k.indexOf('monthly') === 0 && !recurrencePresets(sd).some(function(x) { return x.key === k; })) pr = recurrencePresets(sd).find(function(x) { return x.key === 'monthly-day'; });
            if (pr && pr.rec) rec = normalizeRecurrence(pr.rec);
        }
        refreshRepeat();
        validate();
    }
    F('startDate').addEventListener('change', onStartChange);
    F('startTime').addEventListener('change', onStartChange);
    F('endDate').addEventListener('change', validate);
    F('endTime').addEventListener('change', validate);
    F('allDay').addEventListener('change', function() {
        if (!F('allDay').checked && !F('startTime').value) { F('startTime').value = lastTimedSpan.startTime; F('endTime').value = lastTimedSpan.endTime; }
        if (reminders.length === 0 || (reminders.length === 1 && (reminders[0] === state.settings.defaultReminder || reminders[0] === state.settings.defaultAllDayReminder))) {
            var def = F('allDay').checked ? state.settings.defaultAllDayReminder : state.settings.defaultReminder;
            reminders = def >= 0 ? [def] : [];
        }
        refreshShape(); validate();
    });
    F('calendarId').addEventListener('change', refreshShape);
    F('repeat').addEventListener('change', function() {
        var v = F('repeat').value;
        var sd = F('startDate').value || base.startDate;
        if (v === 'custom') {
            openCustomRepeat(rec, sd).then(function(r) { if (r !== undefined) rec = r; refreshRepeat(); });
            return;
        }
        if (v === 'current') return;
        var p = recurrencePresets(sd).find(function(x) { return x.key === v; });
        rec = p && p.rec ? normalizeRecurrence(p.rec) : null;
    });
    box.querySelectorAll('.gc-type-tab').forEach(function(b) {
        b.addEventListener('click', function() {
            var prevDefault = getCalendarForTypePreview(cur.type);
            cur.type = b.getAttribute('data-type');
            if (F('calendarId').value === prevDefault) F('calendarId').value = getCalendarForTypePreview(cur.type) || F('calendarId').value;
            box.querySelectorAll('.gc-type-tab').forEach(function(x) { x.classList.toggle('active', x === b); });
            refreshShape(); validate();
        });
    });
    box.querySelector('[data-act=color]').addEventListener('click', function(e) {
        var sw = '<div class="gc-swatch-grid">' + EVENT_PALETTE_ORDER.map(function(k) {
            return '<button type="button" class="gc-swatch-btn' + (cur.color === k ? ' sel' : '') + '" data-color="' + k + '" title="' + escapeHtml(CAL_COLORS[k].name) + '" style="background:' + CAL_COLORS[k].hex + '">' + (cur.color === k ? icon('check') : '') + '</button>';
        }).join('') + '</div><button type="button" class="gc-swatch-default' + (!cur.color ? ' sel' : '') + '" data-color=""><span class="gc-dot" style="background:' + calendarColorHex(F('calendarId').value) + '"></span>Calendar color</button>';
        openMenu(e.currentTarget, [{ html: sw }], {
            className: 'gc-color-menu', noFocus: true,
            onMount: function(m) {
                m.querySelectorAll('[data-color]').forEach(function(btn) {
                    btn.addEventListener('click', function() { cur.color = btn.getAttribute('data-color') || null; closeMenu(); refreshShape(); });
                });
            }
        });
    });
    var delBtn = box.querySelector('[data-act=delete]');
    if (delBtn) delBtn.addEventListener('click', function() {
        withScope(inst, { title: 'Delete recurring event' }).then(function(scope) {
            if (!scope) return;
            var ch = beginChange('delete "' + displayTitle(inst) + '"');
            deleteInstance(inst, scope);
            closeModal(box);
            finishChange(ch, 'Deleted');
        });
    });

    function readTiming() {
        var allDay = F('allDay').checked;
        var sd = F('startDate').value, ed = F('endDate').value || sd;
        var t = { allDay: allDay, startDate: sd };
        if (allDay) { t.endDate = isPoint() ? sd : (ed < sd ? sd : ed); t.startTime = null; t.endTime = null; }
        else if (isPoint()) { t.startTime = F('startTime').value; t.endDate = sd; t.endTime = t.startTime; }
        else { t.startTime = F('startTime').value; t.endDate = ed; t.endTime = F('endTime').value; }
        return t;
    }

    function validate() {
        var err = box.querySelector('.gc-ed-error');
        var t = readTiming();
        var msg = '';
        if (!isValidYMD(t.startDate)) msg = 'Pick a start date';
        else if (!t.allDay && !isValidHHMM(t.startTime)) msg = 'Pick a start time';
        else if (!t.allDay && !isPoint() && (!isValidYMD(t.endDate) || !isValidHHMM(t.endTime))) msg = 'Pick an end date and time';
        else if (!t.allDay && !isPoint() && absOf(t.endDate, t.endTime) < absOf(t.startDate, t.startTime)) msg = 'The event ends before it starts';
        err.textContent = msg;
        err.hidden = !msg;
        return !msg;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!validate()) return;
        var t = readTiming();
        var fields = Object.assign({
            type: cur.type, title: F('title').value.trim(), location: F('location').value.trim(), notes: F('notes').value.replace(/\s+$/, ''),
            calendarId: F('calendarId').value, color: cur.color,
            reminders: normalizeReminders(reminders),
            priority: isPoint() ? (F('priority').value || null) : null,
            patientName: cur.type === 'appointment' ? F('patientName').value.trim() : (base.patientName || ''),
            chartNumber: cur.type === 'appointment' ? F('chartNumber').value.trim() : (base.chartNumber || ''),
            procedure: cur.type === 'appointment' ? F('procedure').value.trim() : (base.procedure || ''),
            chair: cur.type === 'appointment' ? F('chair').value.trim() : (base.chair || '')
        }, t);
        if (isPoint()) fields.done = F('done').checked;
        if (isNew) {
            fields.recurrence = rec;
            fields.source = 'manual';
            // quick add's "except nov 26" survives the trip through the editor while those dates still fall on the series
            if (rec && opts.draft && opts.draft.exceptions) {
                var keep = {};
                Object.keys(opts.draft.exceptions).forEach(function(d) { if (isOccurrenceDate({ startDate: fields.startDate, recurrence: rec }, d)) keep[d] = { deleted: true }; });
                if (Object.keys(keep).length) fields.exceptions = keep;
            }
            var ch = beginChange('create');
            var created = createEventRecord(fields);
            closeModal(box);
            finishChange(ch, (EVENT_TYPES[created.type] || 'Event') + ' saved');
            return;
        }
        // diff against the occurrence being edited
        var changes = {};
        Object.keys(fields).forEach(function(k) {
            var a = fields[k], b = inst[k];
            if (k === 'reminders') { if (stableSig(a || {}) !== stableSig(ev.reminders || {})) changes[k] = a; return; }
            if (k === 'calendarId' || k === 'type' || k === 'priority' || k === 'patientName' || k === 'chartNumber' || k === 'procedure' || k === 'chair') b = ev[k];
            if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return;
            if (k === 'allDay') { if (!!a !== !!b) changes[k] = !!a; return; }
            if (k === 'done') { if (!!a !== !!inst.done) changes[k] = !!a; return; }
            if (a !== b) changes[k] = a;
        });
        if (stableSig(rec || null) !== stableSig(ev.recurrence || null)) changes.recurrence = rec;
        if (!Object.keys(changes).length) { closeModal(box); return; }
        var recurChanged = 'recurrence' in changes;
        var go = function(scope) {
            if (!scope) return;
            var ch2 = beginChange('edit "' + displayTitle(inst) + '"');
            applyInstanceChanges(inst, changes, scope);
            closeModal(box);
            finishChange(ch2, 'Saved');
        };
        if (ev.recurrence && inst.occ) askRecurringScope('Edit recurring event', !recurChanged, true).then(go);
        else go('all');
    });

    refreshRepeat();
    refreshShape();
    validate();
    setTimeout(function() { if (!isPhone() || isNew) try { F('title').focus(); } catch (err) {} }, 40);
}

function nextHalfHour() {
    var d = new Date();
    var m = d.getHours() * 60 + d.getMinutes();
    m = Math.min(23 * 60, Math.ceil((m + 1) / 30) * 30);
    return minToHHMM(m);
}

// ---------------------------------------------------------------- custom repeat
// Resolves rec (object|null) on Done, undefined on cancel
function openCustomRepeat(rec, startDate) {
    return new Promise(function(resolve) {
        var done = false;
        var r = rec ? deepClone(rec) : { freq: 'weekly', interval: 1, byDay: DOW_CODES[weekdayOf(startDate)], monthlyMode: 'day', until: null, count: null };
        var wd = weekdayOf(startDate), p = ymdParts(startDate), nth = Math.ceil(p.d / 7);
        var monthOpts = '<option value="day">Monthly on day ' + p.d + '</option>' +
            (nth <= 5 ? '<option value="nth">Monthly on the ' + ORDINAL_WORDS[nth - 1] + ' ' + DOW[wd] + '</option>' : '') +
            (isLastWeekdayOfMonth(startDate) ? '<option value="last">Monthly on the last ' + DOW[wd] + '</option>' : '');
        var box = openModal(
            '<form class="gc-dialog gc-custom-repeat">' +
            '<h2 class="gc-dialog-title">Custom recurrence</h2>' +
            '<div class="gc-dialog-body">' +
            '<div class="gc-cr-line">Repeat every <input type="number" name="interval" min="1" max="99" class="gc-input sm gc-cr-num"> ' +
            '<select name="freq" class="gc-input sm"><option value="daily">day</option><option value="weekly">week</option><option value="monthly">month</option><option value="yearly">year</option></select></div>' +
            '<div class="gc-cr-week"><div class="gc-cr-label">Repeat on</div><div class="gc-cr-days">' +
            DOW_CODES.map(function(c, i) { return '<button type="button" class="gc-cr-day" data-code="' + c + '" aria-label="' + DOW[i] + '">' + DOW[i].charAt(0) + '</button>'; }).join('') +
            '</div></div>' +
            '<div class="gc-cr-month"><select name="monthlyMode" class="gc-input sm">' + monthOpts + '</select></div>' +
            '<div class="gc-cr-label">Ends</div>' +
            '<label class="gc-radio"><input type="radio" name="ends" value="never"><span>Never</span></label>' +
            '<label class="gc-radio"><input type="radio" name="ends" value="on"><span>On</span><input type="date" name="until" class="gc-input sm"></label>' +
            '<label class="gc-radio"><input type="radio" name="ends" value="after"><span>After</span><input type="number" name="count" min="1" max="999" class="gc-input sm gc-cr-num"><span>occurrences</span></label>' +
            '</div><div class="gc-dialog-actions"><button type="button" class="gc-btn text" data-act="cancel">Cancel</button><button type="submit" class="gc-btn filled">Done</button></div></form>',
            { narrow: true, onClose: function() { if (!done) { done = true; resolve(undefined); } } });
        var F = function(n) { return box.querySelector('[name="' + n + '"]'); };
        F('interval').value = r.interval || 1;
        F('freq').value = r.freq;
        F('monthlyMode').value = r.monthlyMode || 'day';
        if (!F('monthlyMode').value) F('monthlyMode').value = 'day';
        F('until').value = r.until || addMonths(startDate, 3);
        F('count').value = r.count || 13;
        box.querySelector('[name=ends][value=' + (r.until ? 'on' : r.count ? 'after' : 'never') + ']').checked = true;
        var days = {};
        String(r.byDay || DOW_CODES[wd]).split(',').forEach(function(c) { if (c) days[c] = true; });
        function paint() {
            box.querySelector('.gc-cr-week').hidden = F('freq').value !== 'weekly';
            box.querySelector('.gc-cr-month').hidden = F('freq').value !== 'monthly';
            box.querySelectorAll('.gc-cr-day').forEach(function(b) { b.classList.toggle('on', !!days[b.getAttribute('data-code')]); });
        }
        box.querySelectorAll('.gc-cr-day').forEach(function(b) {
            b.addEventListener('click', function() {
                var c = b.getAttribute('data-code');
                if (days[c] && Object.keys(days).filter(function(k) { return days[k]; }).length === 1) return; // keep at least one
                days[c] = !days[c];
                paint();
            });
        });
        F('freq').addEventListener('change', paint);
        F('until').addEventListener('focus', function() { box.querySelector('[name=ends][value=on]').checked = true; });
        F('count').addEventListener('focus', function() { box.querySelector('[name=ends][value=after]').checked = true; });
        box.querySelector('[data-act=cancel]').onclick = function() { closeModal(box); };
        box.querySelector('form').onsubmit = function(e) {
            e.preventDefault();
            var ends = box.querySelector('[name=ends]:checked').value;
            var out = {
                freq: F('freq').value, interval: Math.max(1, Math.min(99, parseInt(F('interval').value, 10) || 1)),
                byDay: F('freq').value === 'weekly' ? DOW_CODES.filter(function(c) { return days[c]; }).join(',') : '',
                monthlyMode: F('freq').value === 'monthly' ? F('monthlyMode').value : 'day',
                until: ends === 'on' && isValidYMD(F('until').value) ? F('until').value : null,
                count: ends === 'after' ? Math.max(1, Math.min(999, parseInt(F('count').value, 10) || 1)) : null
            };
            if (out.until && out.until < startDate) { showToast('End date is before the start date', { type: 'error' }); return; }
            done = true;
            closeModal(box);
            resolve(normalizeRecurrence(out));
        };
        paint();
    });
}
