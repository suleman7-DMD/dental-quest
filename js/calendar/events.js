// ============================================================================
// SULLY CALENDAR — events.js
// Event + calendar CRUD, recurring edit scopes, done toggles, undo stack,
// instance queries (with holiday / roadmap overlays), commit pipeline.
// Every mutation: stamp updatedAt (or write a tombstone) → persistLocal() →
// saveState() (guarded, debounced) → render. Never call saveState from render.
// ============================================================================

var undoStack = [];
var TIMING_FIELDS = ['startDate', 'endDate', 'startTime', 'endTime', 'allDay'];
var TEXT_OCC_FIELDS = ['title', 'location', 'notes', 'color'];

var OVERLAY_DEFS = {
    holidays: { name: 'Holidays in United States', color: 'sage', icon: 'celebration' },
    rmAppointments: { name: 'Roadmap · Clinic appointments', color: 'eucalyptus', icon: 'dentistry' },
    rmDeadlines: { name: 'Roadmap · Deadlines', color: 'flamingo', icon: 'flag' },
    rmD4: { name: 'Roadmap · D4 schedule', color: 'amethyst', icon: 'school' }
};

// ---------------------------------------------------------------- commit / undo
function commit() {
    state._lastModified = nowIso();
    persistLocal();      // CRUD rule: localStorage FIRST — survives any blocked cloud save
    saveState();         // guarded + debounced Firebase push
    renderAll();
}

function snapshotCollections() {
    return { events: deepClone(state.events), calendars: deepClone(state.calendars) };
}

function beginChange(label) {
    return { label: label, before: snapshotCollections() };
}

// Records only the records this change touched, so undo never reverts
// unrelated edits that synced in from another device afterwards.
function finishChange(change, toastMsg, opts) {
    opts = opts || {};
    var touched = { events: {}, calendars: {} }, any = false;
    ['events', 'calendars'].forEach(function(coll) {
        var before = change.before[coll] || {}, after = state[coll] || {};
        var ids = {};
        Object.keys(before).forEach(function(k) { ids[k] = 1; });
        Object.keys(after).forEach(function(k) { ids[k] = 1; });
        Object.keys(ids).forEach(function(id) {
            if (stableSig(before[id] || null) !== stableSig(after[id] || null)) {
                touched[coll][id] = before[id] ? before[id] : null;
                any = true;
            }
        });
    });
    if (!any) { renderAll(); return false; }
    undoStack.push({ label: change.label, touched: touched });
    if (undoStack.length > 25) undoStack.shift();
    commit();
    if (toastMsg) showToast(toastMsg, opts.noUndo ? {} : { actionLabel: 'Undo', onAction: undoLast });
    return true;
}

function undoLast() {
    var ch = undoStack.pop();
    if (!ch) { showToast('Nothing to undo'); return; }
    var now = nowIso();
    ['events', 'calendars'].forEach(function(coll) {
        Object.keys(ch.touched[coll] || {}).forEach(function(id) {
            var prev = ch.touched[coll][id];
            if (prev) {
                var rec = deepClone(prev);
                rec.updatedAt = now; // restored copy must win every merge
                if (coll === 'calendars') rec.seeded = false;
                state[coll][id] = rec;
                delete state.tombstones[coll][id];
            } else if (state[coll][id]) {
                delete state[coll][id];
                state.tombstones[coll][id] = now;
            }
        });
    });
    commit();
    showToast('Undid: ' + ch.label);
}

// ---------------------------------------------------------------- calendars
function getCalendarList() {
    return getValues(state.calendars).sort(function(a, b) {
        return (a.order - b.order) || a.name.localeCompare(b.name);
    });
}

function getCalendar(id) { return (id && state.calendars[id]) || null; }

function calendarColorHex(id) {
    var c = getCalendar(id);
    return c ? (colorHex(c.color) || '#039be5') : '#039be5';
}

function isCalendarVisible(id) {
    var c = getCalendar(id);
    return !c || c.visible !== false; // events on a missing calendar stay visible
}

function findCalendarByName(name) {
    var n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    var list = getCalendarList();
    var norm = function(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); };
    var nn = norm(n);
    return list.find(function(c) { return c.name.toLowerCase() === n; }) ||
        list.find(function(c) { return norm(c.name) === nn; }) ||
        list.find(function(c) { return nn && norm(c.name).indexOf(nn) === 0; }) ||
        list.find(function(c) { return nn.length >= 3 && norm(c.name).indexOf(nn) !== -1; }) || null;
}

var TYPE_TO_KIND = { appointment: 'appointments', deadline: 'deadlines', task: 'tasks', event: 'general' };

function getCalendarForType(type) {
    var kind = TYPE_TO_KIND[type] || 'general';
    var list = getCalendarList();
    var hit = list.find(function(c) { return c.kind === kind; });
    if (hit) return hit;
    if (kind === 'appointments') return createCalendar('Clinic Appointments', 'basil', 'appointments');
    hit = list.find(function(c) { return c.kind === 'general'; }) || list[0];
    return hit || createCalendar('My calendar', 'peacock', 'general');
}

function nextFreeColor() {
    var used = {};
    getCalendarList().forEach(function(c) { used[c.color] = true; });
    var free = CAL_PALETTE_ORDER.filter(function(k) { return !used[k]; });
    return free.length ? free[0] : CAL_PALETTE_ORDER[getCount(state.calendars) % CAL_PALETTE_ORDER.length];
}

function createCalendar(name, color, kind) {
    var id = generateId('cal');
    var now = nowIso();
    var maxOrder = getCalendarList().reduce(function(m, c) { return Math.max(m, c.order || 0); }, -1);
    state.calendars[id] = normalizeCalendar({
        id: id, name: name || 'Untitled calendar', color: color || nextFreeColor(), visible: true,
        kind: kind || 'general', order: maxOrder + 1, description: '', seeded: false,
        createdAt: now, updatedAt: now
    }, id);
    return state.calendars[id];
}

function patchCalendar(id, changes) {
    var c = state.calendars[id];
    if (!c) return null;
    var merged = Object.assign({}, c, changes, { seeded: false, updatedAt: nowIso() });
    state.calendars[id] = normalizeCalendar(merged, id);
    return state.calendars[id];
}

function removeCalendarAndEvents(id) {
    var now = nowIso();
    Object.keys(state.events).forEach(function(eid) {
        if (state.events[eid].calendarId === id) {
            state.tombstones.events[eid] = now;
            delete state.events[eid];
        }
    });
    if (state.calendars[id]) {
        state.tombstones.calendars[id] = now;
        delete state.calendars[id];
    }
}

// ---------------------------------------------------------------- event CRUD (low level)
function createEventRecord(fields) {
    var now = nowIso();
    var id = generateId('ev');
    var ev = normalizeEvent(Object.assign({}, fields, { id: id, createdAt: now, updatedAt: now }), id);
    if (!ev.calendarId || !state.calendars[ev.calendarId]) ev.calendarId = getCalendarForType(ev.type).id;
    if (!ev.startDate) ev.startDate = getLocalDateString();
    if (!ev.endDate || ev.endDate < ev.startDate) ev.endDate = ev.startDate;
    state.events[id] = ev;
    delete state.tombstones.events[id];
    return ev;
}

function patchEventRecord(id, changes) {
    var ev = state.events[id];
    if (!ev) return null;
    var merged = Object.assign(deepClone(ev), changes, { updatedAt: nowIso() });
    state.events[id] = normalizeEvent(merged, id);
    return state.events[id];
}

function removeEventRecord(id) {
    if (!state.events[id]) return false;
    state.tombstones.events[id] = nowIso(); // tombstone BEFORE the local write (commit)
    delete state.events[id];
    return true;
}

// ---------------------------------------------------------------- recurring-aware edits
function shiftByDay(byDay, delta) {
    if (!byDay) return byDay;
    var d = ((delta % 7) + 7) % 7;
    if (!d) return byDay;
    return byDay.split(',').map(function(c) {
        var i = DOW_CODES.indexOf(c);
        return i < 0 ? c : DOW_CODES[(i + d) % 7];
    }).filter(function(v, i, a) { return a.indexOf(v) === i; }).join(',');
}

// Apply changes to a whole series (or the tail of a split series). `inst` is the
// occurrence the user acted on; date moves shift the series by the delta between
// that occurrence's ORIGINAL date and the new date.
function applySeriesChange(ev, inst, changes) {
    var c = Object.assign({}, changes);
    if ('recurrence' in c) {
        if (!c.recurrence) {
            ev.recurrence = null;
            ev.exceptions = {};
            ev.doneDates = {};
            ev.startDate = inst.startDate; ev.endDate = inst.endDate;
            ev.startTime = inst.startTime; ev.endTime = inst.endTime; ev.allDay = inst.allDay;
            ev.done = !!inst.done;
        } else {
            ev.recurrence = c.recurrence;
        }
        delete c.recurrence;
    }
    var hasTiming = TIMING_FIELDS.some(function(f) { return f in c; });
    if (hasTiming) {
        if (!ev.recurrence) {
            TIMING_FIELDS.forEach(function(f) { if (f in c) ev[f] = c[f]; });
        } else {
            var refStart = inst.occ || inst.startDate;
            var newStart = c.startDate || inst.startDate;
            var curSpan = Math.max(0, diffDays(inst.startDate, inst.endDate));
            var newEnd = c.endDate || addDays(newStart, curSpan);
            var span = Math.max(0, diffDays(newStart, newEnd));
            var delta = ('startDate' in c) ? diffDays(refStart, newStart) : 0;
            if (delta !== 0) {
                ev.startDate = addDays(ev.startDate, delta);
                var ex2 = {};
                Object.keys(ev.exceptions || {}).forEach(function(k) {
                    var x = Object.assign({}, ev.exceptions[k]);
                    if (x.startDate) x.startDate = addDays(x.startDate, delta);
                    if (x.endDate) x.endDate = addDays(x.endDate, delta);
                    ex2[addDays(k, delta)] = x;
                });
                ev.exceptions = ex2;
                var dd = {};
                Object.keys(ev.doneDates || {}).forEach(function(k) { dd[addDays(k, delta)] = ev.doneDates[k]; });
                ev.doneDates = dd;
                if (ev.recurrence.freq === 'weekly') ev.recurrence.byDay = shiftByDay(ev.recurrence.byDay, delta);
            }
            ev.endDate = addDays(ev.startDate, span);
            if ('allDay' in c) ev.allDay = c.allDay;
            if ('startTime' in c) ev.startTime = c.startTime;
            if ('endTime' in c) ev.endTime = c.endTime;
            if (inst.occ) {
                var key = addDays(inst.occ, delta);
                var x0 = ev.exceptions[key];
                if (x0 && !x0.deleted) {
                    TIMING_FIELDS.forEach(function(f) { delete x0[f]; });
                    if (!Object.keys(x0).length) delete ev.exceptions[key];
                }
            }
        }
        TIMING_FIELDS.forEach(function(f) { delete c[f]; });
    }
    if ('done' in c) {
        if (ev.recurrence && inst.occ) {
            if (c.done) ev.doneDates[inst.occ] = nowIso(); else delete ev.doneDates[inst.occ];
        } else {
            ev.done = !!c.done;
            ev.doneAt = c.done ? nowIso() : null;
        }
        delete c.done;
    }
    Object.keys(c).forEach(function(f) { ev[f] = c[f]; });
    if (inst.occ && ev.exceptions && ev.exceptions[inst.occ]) {
        var xx = ev.exceptions[inst.occ];
        TEXT_OCC_FIELDS.forEach(function(f) { if (f in changes) delete xx[f]; });
        if (!xx.deleted && !Object.keys(xx).length) delete ev.exceptions[inst.occ];
    }
}

// scope: 'this' | 'following' | 'all' (ignored for single events)
function updateInstance(inst, changes, scope) {
    var ev = state.events[inst.id];
    if (!ev) return false;
    var now = nowIso();
    var copy = deepClone(ev);
    if (!copy.exceptions) copy.exceptions = {};
    if (!copy.doneDates) copy.doneDates = {};

    if (!copy.recurrence || !inst.occ) {
        applySeriesChange(copy, inst, changes);
    } else if (scope === 'this') {
        var ex = Object.assign({}, copy.exceptions[inst.occ] || {});
        if (TIMING_FIELDS.some(function(f) { return f in changes; })) {
            TIMING_FIELDS.forEach(function(f) { ex[f] = (f in changes) ? changes[f] : inst[f]; });
            if (ex.allDay) { delete ex.startTime; delete ex.endTime; }
        }
        TEXT_OCC_FIELDS.forEach(function(f) { if (f in changes) ex[f] = changes[f]; });
        if ('done' in changes) {
            if (changes.done) copy.doneDates[inst.occ] = now; else delete copy.doneDates[inst.occ];
        }
        if (Object.keys(ex).length) copy.exceptions[inst.occ] = ex;
    } else if (scope === 'following' && inst.occ > copy.startDate) {
        var occ = inst.occ;
        var tail = deepClone(copy);
        tail.id = generateId('ev');
        tail.createdAt = now;
        tail.extKey = null;
        if (copy.recurrence.count) {
            tail.recurrence.count = Math.max(1, copy.recurrence.count - countOccurrencesBefore(ev, occ));
        }
        copy.recurrence.count = null;
        copy.recurrence.until = addDays(occ, -1);
        var spanDays = Math.max(0, diffDays(copy.startDate, copy.endDate));
        tail.startDate = occ;
        tail.endDate = addDays(occ, spanDays);
        tail.exceptions = {};
        tail.doneDates = {};
        Object.keys(copy.exceptions).forEach(function(k) {
            if (k >= occ) { tail.exceptions[k] = copy.exceptions[k]; delete copy.exceptions[k]; }
        });
        Object.keys(copy.doneDates).forEach(function(k) {
            if (k >= occ) { tail.doneDates[k] = copy.doneDates[k]; delete copy.doneDates[k]; }
        });
        applySeriesChange(tail, inst, changes);
        tail.updatedAt = now;
        state.events[tail.id] = normalizeEvent(tail, tail.id);
    } else {
        applySeriesChange(copy, inst, changes);
    }
    copy.updatedAt = now;
    state.events[ev.id] = normalizeEvent(copy, ev.id);
    return true;
}

function deleteInstance(inst, scope) {
    var ev = state.events[inst.id];
    if (!ev) return false;
    if (!ev.recurrence || !inst.occ || scope === 'all' || (scope === 'following' && inst.occ <= ev.startDate)) {
        return removeEventRecord(ev.id);
    }
    var copy = deepClone(ev);
    if (!copy.exceptions) copy.exceptions = {};
    if (scope === 'this') {
        copy.exceptions[inst.occ] = { deleted: true };
    } else {
        copy.recurrence.until = addDays(inst.occ, -1);
        copy.recurrence.count = null;
        Object.keys(copy.exceptions).forEach(function(k) { if (k >= inst.occ) delete copy.exceptions[k]; });
        Object.keys(copy.doneDates || {}).forEach(function(k) { if (k >= inst.occ) delete copy.doneDates[k]; });
    }
    copy.updatedAt = nowIso();
    state.events[ev.id] = normalizeEvent(copy, ev.id);
    return true;
}

function setInstanceDone(inst, done) {
    return updateInstance(inst, { done: !!done }, 'this');
}

function computeMoveChanges(inst, newStartDate, newStartTime) {
    if (inst.allDay || !newStartTime) {
        var span = Math.max(0, diffDays(inst.startDate, inst.endDate));
        return { startDate: newStartDate, endDate: addDays(newStartDate, span) };
    }
    var dur = instanceDurationMin(inst);
    var s = absOf(newStartDate, newStartTime);
    var e = absToDateTime(s + dur);
    return { startDate: newStartDate, startTime: newStartTime, endDate: e.date, endTime: e.time };
}

function duplicateInstance(inst) {
    var ev = state.events[inst.id];
    if (!ev) return null;
    var c = deepClone(ev);
    delete c.id;
    c.extKey = null;
    c.exceptions = {};
    c.doneDates = {};
    c.done = false;
    c.doneAt = null;
    c.source = 'manual';
    if (!c.recurrence) {
        c.startDate = inst.startDate; c.endDate = inst.endDate;
        c.startTime = inst.startTime; c.endTime = inst.endTime; c.allDay = inst.allDay;
    }
    return createEventRecord(c);
}

// ---------------------------------------------------------------- queries
function getEventInstanceByKey(key) {
    if (!key) return null;
    var parts = String(key).split('::');
    var ev = state.events[parts[0]];
    if (!ev) return lookupOverlayInstance(key);
    if (parts[1]) return buildInstance(ev, parts[1]);
    return buildInstance(ev, null);
}

function getInstancesInRange(fromYmd, toYmd, opts) {
    opts = opts || {};
    var out = [];
    getValues(state.events).forEach(function(ev) {
        if (!opts.includeHidden && !isCalendarVisible(ev.calendarId)) return;
        var list = getEventInstances(ev, fromYmd, toYmd);
        for (var i = 0; i < list.length; i++) out.push(list[i]);
    });
    if (!state.settings.showCompletedTasks && !opts.includeDone) {
        out = out.filter(function(i) { return !(i.done && (i.type === 'task' || i.type === 'deadline')); });
    }
    if (!opts.noOverlays) out = out.concat(getOverlayInstances(fromYmd, toYmd));
    out.sort(compareInstances);
    return out;
}

function getOverlayInstances(fromYmd, toYmd) {
    var out = [];
    if (ui.overlays.holidays) {
        var y0 = ymdParts(fromYmd).y, y1 = ymdParts(toYmd).y;
        for (var y = y0; y <= y1; y++) {
            getUSHolidays(y).forEach(function(h) {
                if (h.date < fromYmd || h.date > toYmd) return;
                out.push(makeOverlayInstance('holidays', 'hol::' + h.date + '::' + h.title, {
                    title: h.title, allDay: true, startDate: h.date, endDate: h.date,
                    notes: h.federal ? 'Public holiday' : 'Observance'
                }));
            });
        }
    }
    if (typeof roadmapOverlay !== 'undefined' && roadmapOverlay.loaded) {
        ['rmAppointments', 'rmDeadlines', 'rmD4'].forEach(function(k) {
            if (!ui.overlays[k]) return;
            (roadmapOverlay.items[k] || []).forEach(function(it) {
                var end = it.endDate || it.startDate;
                if (end < fromYmd || it.startDate > toYmd) return;
                out.push(makeOverlayInstance(k, it.key, it));
            });
        });
    }
    return out;
}

function makeOverlayInstance(overlay, key, f) {
    var allDay = f.allDay !== false && !isValidHHMM(f.startTime);
    var startTime = allDay ? null : f.startTime;
    var endTime = allDay ? null : (isValidHHMM(f.endTime) ? f.endTime : minToHHMM(Math.min(1439, timeToMin(f.startTime) + 60)));
    return {
        key: key, id: null, occ: null, overlay: overlay, readOnly: true,
        type: f.type || 'event', title: f.title || '', calendarId: null, color: OVERLAY_DEFS[overlay].color,
        allDay: allDay, startDate: f.startDate, endDate: f.endDate || f.startDate,
        startTime: startTime, endTime: endTime, location: f.location || '', notes: f.notes || '',
        done: !!f.done, recurring: false, exception: false,
        patientName: f.patientName || '', chartNumber: f.chartNumber || '', procedure: f.procedure || '', chair: f.chair || '',
        priority: null, reminders: {}, source: overlay
    };
}

function lookupOverlayInstance(key) {
    if (!key) return null;
    if (key.indexOf('hol::') === 0) {
        var parts = key.split('::');
        var date = parts[1];
        if (!isValidYMD(date)) return null;
        var h = getUSHolidays(ymdParts(date).y).find(function(x) { return x.date === date && x.title === parts.slice(2).join('::'); });
        return h ? makeOverlayInstance('holidays', key, { title: h.title, allDay: true, startDate: h.date, endDate: h.date, notes: h.federal ? 'Public holiday' : 'Observance' }) : null;
    }
    if (typeof roadmapOverlay !== 'undefined' && roadmapOverlay.loaded) {
        var found = null;
        Object.keys(roadmapOverlay.items).forEach(function(k) {
            (roadmapOverlay.items[k] || []).forEach(function(it) { if (it.key === key) found = makeOverlayInstance(k, key, it); });
        });
        return found;
    }
    return null;
}

function instColorHex(inst) {
    if (!inst) return '#039be5';
    if (inst.overlay) return colorHex(OVERLAY_DEFS[inst.overlay].color);
    return colorHex(inst.color) || calendarColorHex(inst.calendarId);
}

function isPastInstance(inst, nowAbs) {
    return instanceEndAbs(inst) <= (nowAbs !== undefined ? nowAbs : currentNowAbs());
}

function currentNowAbs() {
    var d = new Date();
    return absOf(getLocalDateString(d), pad2(d.getHours()) + ':' + pad2(d.getMinutes()));
}

function isOverdue(inst) {
    if (inst.done || (inst.type !== 'task' && inst.type !== 'deadline')) return false;
    var due = inst.allDay ? (dayNum(inst.endDate) + 1) * 1440 : instanceStartAbs(inst);
    return due <= currentNowAbs();
}

// ---------------------------------------------------------------- user-facing helpers
// Runs a scoped instance mutation with the recurring-scope prompt when needed.
function withScope(inst, opts) {
    opts = opts || {};
    var ev = inst && inst.id ? state.events[inst.id] : null;
    if (!ev) return Promise.resolve(null);
    if (!ev.recurrence || !inst.occ) return Promise.resolve('all');
    return askRecurringScope(opts.title || 'Edit recurring event', opts.allowThis !== false, opts.allowFollowing !== false);
}

function userDeleteInstance(inst) {
    if (!inst || inst.readOnly) return;
    withScope(inst, { title: 'Delete recurring event' }).then(function(scope) {
        if (!scope) return;
        var ch = beginChange('delete "' + displayTitle(inst) + '"');
        deleteInstance(inst, scope);
        closePopover();
        finishChange(ch, (inst.type === 'task' ? 'Task' : inst.type === 'deadline' ? 'Deadline' : 'Event') + ' deleted');
    });
}

function userToggleDone(inst) {
    if (!inst || inst.readOnly) return;
    var ch = beginChange(inst.done ? 'mark not done' : 'mark done');
    setInstanceDone(inst, !inst.done);
    finishChange(ch, inst.done ? 'Marked not completed' : 'Marked completed');
}

function userMoveInstance(inst, newStartDate, newStartTime, extraChanges) {
    if (!inst || inst.readOnly) return Promise.resolve(false);
    var changes = Object.assign(computeMoveChanges(inst, newStartDate, newStartTime), extraChanges || {});
    var same = TIMING_FIELDS.every(function(f) { return !(f in changes) || changes[f] === inst[f]; });
    if (same) { renderAll(); return Promise.resolve(false); }
    return withScope(inst, { title: 'Move recurring event' }).then(function(scope) {
        if (!scope) { renderAll(); return false; }
        var ch = beginChange('move "' + displayTitle(inst) + '"');
        updateInstance(inst, changes, scope);
        finishChange(ch, 'Moved to ' + fmtDateMed(changes.startDate) + (changes.startTime ? ', ' + fmtTime(changes.startTime, state.settings.timeFormat) : ''));
        return true;
    });
}

function userResizeInstance(inst, newEndDate, newEndTime) {
    if (!inst || inst.readOnly) return Promise.resolve(false);
    if (newEndDate === inst.endDate && newEndTime === inst.endTime) { renderAll(); return Promise.resolve(false); }
    return withScope(inst, { title: 'Change recurring event' }).then(function(scope) {
        if (!scope) { renderAll(); return false; }
        var ch = beginChange('resize "' + displayTitle(inst) + '"');
        updateInstance(inst, { endDate: newEndDate, endTime: newEndTime }, scope);
        finishChange(ch, 'Ends ' + fmtTime(newEndTime, state.settings.timeFormat));
        return true;
    });
}

function userDuplicateInstance(inst) {
    if (!inst || inst.readOnly) return;
    var ch = beginChange('duplicate');
    var copy = duplicateInstance(inst);
    closePopover();
    finishChange(ch, 'Duplicated');
    if (copy) setTimeout(function() { openEditor({ eventId: copy.id }); }, 50);
}

function userSetEventColor(inst, colorKey) {
    if (!inst || inst.readOnly) return;
    var ch = beginChange('change color');
    // Google applies a color change to the whole series
    var ev = state.events[inst.id];
    if (!ev) return;
    patchEventRecord(inst.id, { color: colorKey || null });
    if (inst.occ && ev.exceptions && ev.exceptions[inst.occ] && ev.exceptions[inst.occ].color) {
        var x = deepClone(state.events[inst.id]);
        delete x.exceptions[inst.occ].color;
        state.events[inst.id] = normalizeEvent(x, inst.id);
    }
    finishChange(ch, 'Color changed');
}
