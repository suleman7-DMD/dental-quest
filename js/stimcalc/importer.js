// ============================================
// SULLY OS — STIM CALC TEXT IMPORTER (Task 1)
// STIM_DAY dialect: parse → build ops → apply.
// The apply layer mirrors the manual CRUD paths in med-caffeine.js /
// calibration.js / history-calendar.js EXACTLY (same id factories, same
// updatedAt/lastUpdated stamps, tombstones BEFORE removal) so imported
// entries are indistinguishable from manual entries to the sync engine.
// ============================================

// ============================================
// === SC IMPORT PURE LAYER (no DOM, no state) ===
// Everything between these sentinels is extracted by the Node harness
// (tests/sullyos/test-stimcalc-parser.mjs) via module.exports below.
// ============================================

// Accepts 'HH:MM', 'H:MM', 'H:MM AM/PM', 'HHMM'-less variants → 24h 'HH:MM' or null.
function scNormalizeTime(str) {
    if (str === null || str === undefined) return null;
    var s = String(str).trim();
    if (!s) return null;
    var m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?$/i);
    if (!m) return null;
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    if (isNaN(h) || isNaN(min) || min > 59) return null;
    var ap = m[3] ? m[3].toLowerCase().charAt(0) : null;
    if (ap) {
        if (h < 1 || h > 12) return null;
        if (ap === 'p' && h !== 12) h += 12;
        if (ap === 'a' && h === 12) h = 0;
    } else if (h > 23) {
        return null;
    }
    return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

// Strict YYYY-MM-DD validator (real calendar date, no rollover).
function scValidDateStr(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
}

// Local-date string for a Date (duplicated from state.js so the pure layer
// stays framework-free for the Node harness).
function scImpLocalDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Object-collection → array (framework-free twin of getValues()).
function scImpVals(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    var out = [];
    for (var k in obj) { if (obj[k] !== null && obj[k] !== undefined) out.push(obj[k]); }
    return out;
}

// Hours slept from fell-asleep + wake clock times (midnight-crossing safe).
function scComputeSleptHours(fellAsleep, woke) {
    var f = fellAsleep.split(':'), w = woke.split(':');
    var diff = (Number(w[0]) * 60 + Number(w[1])) - (Number(f[0]) * 60 + Number(f[1]));
    if (diff <= 0) diff += 1440;
    return Math.round(diff / 6) / 10; // 1 decimal
}

// STIM_DAY field lines that may legally appear inside a block (colon form).
var SC_STIM_FIELD_RE = /^(DATE|WOKE|FELL_ASLEEP|SLEPT|DOSE|CAFFEINE|WORKOUT|VITC|ALL_NIGHTER|PLAN_SLEEP|DOSE_MOVE|CAFF_MOVE|DOSE_DELETE|CAFF_DELETE|SLEEP_DELETE)\s*:/i;

// First non-blank, non-@banner line of a block (trimmed), or ''.
function scFirstMeaningfulLine(block) {
    var lines = String(block == null ? '' : block).split('\n');
    for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (!l || /^@/.test(l)) continue;
        return l;
    }
    return '';
}

// Robustness: some emitters (and the reference doc's own worked examples) place
// a `---` separator BETWEEN a STIM_DAY header and its own DATE:/WOKE:/... fields,
// which would split the header away from its data (fields become "unrecognized"
// and nothing applies). Fold any orphan STIM-field block back onto the preceding
// STIM_DAY block so the paste applies as one day. A non-stim block (body comp /
// roadmap / unknown) closes the absorb window.
function scReassembleStimBlocks(raw) {
    var text = String(raw == null ? '' : raw);
    if (text.indexOf('---') === -1) return text;
    var blocks = text.split(/^---\s*$/m);
    var out = [];
    var lastStimIdx = -1;
    for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        var first = scFirstMeaningfulLine(b);
        if (!first) { out.push(b); continue; }             // blank/banner-only: keep window open
        if (first.toUpperCase() === 'STIM_DAY') {
            out.push(b); lastStimIdx = out.length - 1;
        } else if (SC_STIM_FIELD_RE.test(first) && lastStimIdx >= 0) {
            out[lastStimIdx] = out[lastStimIdx].replace(/\s+$/, '') + '\n' + b.replace(/^\s+/, '');
        } else {
            out.push(b); lastStimIdx = -1;
        }
    }
    return out.join('\n---\n');
}

// ---- scParseImportText(text, opts) ----
// Returns { days: [...], errors: [{line, reason}], warnings: [string], unrecognized: [string] }.
// Never throws on user text; never mutates anything.
function scParseImportText(text, opts) {
    opts = opts || {};
    var todayStr = opts.today || scImpLocalDate();
    var res = { days: [], errors: [], warnings: [], unrecognized: [] };
    if (typeof text !== 'string' || !text.trim()) {
        res.errors.push({ line: '', reason: 'Nothing to parse' });
        return res;
    }

    // Strip code fences and SYNTAX header
    var raw = text.replace(/```[a-z]*\n?/gi, '').trim();
    var lines0 = raw.split('\n');
    if (lines0.length && /^SYNTAX:/i.test(lines0[0].trim())) {
        var ver = lines0[0].split(':')[1] ? lines0[0].split(':')[1].trim() : '';
        if (ver && ver.toUpperCase() !== 'SULLYOS-1') {
            res.warnings.push('Unknown syntax version "' + ver + '" — parsed as SULLYOS-1');
        }
        lines0 = lines0.slice(1);
    }
    raw = lines0.join('\n');

    // Fold any STIM_DAY header that was split from its own fields by a stray --- .
    raw = scReassembleStimBlocks(raw);

    // Split into blocks on --- separators
    var blocks = raw.split(/^---\s*$/m).map(function(b) { return b.trim(); }).filter(Boolean);

    blocks.forEach(function(block) {
        var lines = block.split('\n').map(function(l) { return l.trim(); })
            .filter(function(l) { return l && !/^@/.test(l); }); // skip cosmetic @STIMCALC banners
        if (!lines.length) return;
        var header = lines[0].toUpperCase();
        if (header !== 'STIM_DAY') {
            res.unrecognized.push(lines[0]);
            return;
        }

        var day = {
            date: null, woke: null, fellAsleep: null, slept: null,
            doses: [], caffeine: [], workout: undefined, vitc: undefined,
            allNighter: null, planSleep: null, verbs: [], warnings: []
        };

        lines.slice(1).forEach(function(line) {
            var ci = line.indexOf(':');
            if (ci < 1) { res.errors.push({ line: line, reason: 'Not a FIELD: value line' }); return; }
            var key = line.slice(0, ci).trim().toUpperCase();
            var val = line.slice(ci + 1).trim();
            var t, parts, mm;

            switch (key) {
                case 'DATE':
                    if (!scValidDateStr(val)) { res.errors.push({ line: line, reason: 'DATE must be a real YYYY-MM-DD date' }); return; }
                    day.date = val;
                    break;
                case 'WOKE':
                    t = scNormalizeTime(val);
                    if (!t) { res.errors.push({ line: line, reason: 'Invalid time' }); return; }
                    day.woke = t;
                    break;
                case 'FELL_ASLEEP':
                    t = scNormalizeTime(val);
                    if (!t) { res.errors.push({ line: line, reason: 'Invalid time' }); return; }
                    day.fellAsleep = t;
                    break;
                case 'SLEPT':
                    mm = Number(val);
                    if (!Number.isFinite(mm) || mm < 0 || mm > 14) { res.errors.push({ line: line, reason: 'SLEPT must be 0–14 hours' }); return; }
                    day.slept = mm;
                    break;
                case 'DOSE':
                    parts = val.split('@');
                    if (parts.length !== 2) { res.errors.push({ line: line, reason: 'Format: DOSE: <mg> @ <time>' }); return; }
                    mm = Number(parts[0].trim());
                    t = scNormalizeTime(parts[1].trim());
                    if (!Number.isFinite(mm) || mm <= 0 || mm > 200) { res.errors.push({ line: line, reason: 'Dose must be 1–200 mg' }); return; }
                    if (!t) { res.errors.push({ line: line, reason: 'Invalid dose time' }); return; }
                    day.doses.push({ dose: mm, time: t });
                    break;
                case 'CAFFEINE':
                    parts = val.split('|').map(function(p) { return p.trim(); });
                    if (parts.length === 2) parts = [parts[0], 'Caffeine', parts[1]];
                    if (parts.length !== 3) { res.errors.push({ line: line, reason: 'Format: CAFFEINE: <mg> | <name> | <time>' }); return; }
                    mm = Number(parts[0]);
                    t = scNormalizeTime(parts[2]);
                    if (!Number.isFinite(mm) || mm <= 0 || mm > 1000) { res.errors.push({ line: line, reason: 'Caffeine must be 1–1000 mg' }); return; }
                    if (!t) { res.errors.push({ line: line, reason: 'Invalid caffeine time' }); return; }
                    day.caffeine.push({ amount: mm, name: parts[1] || 'Caffeine', time: t });
                    break;
                case 'WORKOUT':
                    if (/^(none|off|no)$/i.test(val)) { day.workout = null; return; }
                    parts = val.split('|').map(function(p) { return p.trim(); });
                    t = scNormalizeTime(parts[0]);
                    if (!t) { res.errors.push({ line: line, reason: 'Format: WORKOUT: <end time> | intense?' }); return; }
                    day.workout = { endTime: t, intense: /^intense$/i.test(parts[1] || '') };
                    break;
                case 'VITC':
                    if (/^(none|off|no)$/i.test(val)) { day.vitc = null; return; }
                    parts = val.split('|').map(function(p) { return p.trim(); });
                    t = scNormalizeTime(parts[0]);
                    if (!t) { res.errors.push({ line: line, reason: 'Format: VITC: <time> | high?' }); return; }
                    day.vitc = { time: t, high: /^high$/i.test(parts[1] || '') };
                    break;
                case 'ALL_NIGHTER':
                    if (/^(yes|true|on)$/i.test(val)) day.allNighter = true;
                    else if (/^(no|false|off)$/i.test(val)) day.allNighter = false;
                    else { res.errors.push({ line: line, reason: 'ALL_NIGHTER must be yes or no' }); return; }
                    break;
                case 'PLAN_SLEEP':
                    t = scNormalizeTime(val);
                    if (!t) { res.errors.push({ line: line, reason: 'Invalid time' }); return; }
                    day.planSleep = t;
                    break;
                case 'DOSE_MOVE':
                case 'CAFF_MOVE':
                    parts = val.split('->').map(function(p) { return scNormalizeTime(p.trim()); });
                    if (parts.length !== 2 || !parts[0] || !parts[1]) { res.errors.push({ line: line, reason: 'Format: ' + key + ': <from time> -> <to time>' }); return; }
                    day.verbs.push({ verb: key, from: parts[0], to: parts[1] });
                    break;
                case 'DOSE_DELETE':
                case 'CAFF_DELETE':
                    t = scNormalizeTime(val);
                    if (!t) { res.errors.push({ line: line, reason: 'Invalid time' }); return; }
                    day.verbs.push({ verb: key, time: t });
                    break;
                case 'SLEEP_DELETE':
                    if (!scValidDateStr(val)) { res.errors.push({ line: line, reason: 'SLEEP_DELETE needs a YYYY-MM-DD date' }); return; }
                    day.verbs.push({ verb: 'SLEEP_DELETE', date: val });
                    break;
                default:
                    res.errors.push({ line: line, reason: 'Unknown field "' + key + '"' });
            }
        });

        if (!day.date) {
            day.date = todayStr;
            day.warnings.push('No DATE — assumed today (' + todayStr + ')');
            res.warnings.push('No DATE — assumed today (' + todayStr + ')');
        }
        // FELL_ASLEEP + WOKE → hours, unless SLEPT explicitly given (SLEPT wins)
        if (day.slept === null && day.fellAsleep && day.woke) {
            day.slept = scComputeSleptHours(day.fellAsleep, day.woke);
            if (day.slept > 14) {
                res.errors.push({ line: 'FELL_ASLEEP ' + day.fellAsleep + ' / WOKE ' + day.woke, reason: 'Computed sleep ' + day.slept + 'h is implausible (>14h) — check the times' });
                day.slept = null;
            }
        }
        res.days.push(day);
    });

    if (!res.days.length && !res.errors.length) {
        res.errors.push({ line: '', reason: 'No STIM_DAY block found' });
    }
    return res;
}

// [SC-IMPORT-OPS-LAYER]
// ---- scBuildImportOps(parsed, st, opts) ----
// Pure resolver: turns parsed days into concrete ops against a state snapshot.
// Upsert-by-(date,time) for doses/caffeine; verbs resolve by human match keys;
// 0 matches or >1 matches -> loud reject (never guess). Idempotent: an exact
// re-paste produces only 'skip' ops.
function scBuildImportOps(parsed, st, opts) {
    opts = opts || {};
    var todayStr = opts.today || scImpLocalDate();
    var yesterday = (function() {
        var p = todayStr.split('-').map(Number);
        return scImpLocalDate(new Date(p[0], p[1] - 1, p[2] - 1));
    })();
    var ops = [];
    var meds = scImpVals(st.medications);
    var caffs = scImpVals(st.caffeine);

    function medsAt(date, time) { return meds.filter(function(m) { return m && m.date === date && m.time === time; }); }
    function caffsAt(date, time) { return caffs.filter(function(c) { return c && c.date === date && c.time === time; }); }

    (parsed.days || []).forEach(function(day) {
        var d = day.date;
        var isToday = d === todayStr;
        var dateOk = isToday || d === yesterday; // med/caffeine log only keeps today+yesterday (cleanupOldMedications)

        // --- doses (upsert by date+time) ---
        day.doses.forEach(function(x) {
            var label = x.dose + 'mg @ ' + x.time + ' (' + d + ')';
            if (!dateOk) { ops.push({ kind: 'reject', destructive: false, label: 'DOSE ' + label, reason: 'Doses can only be logged for today or yesterday (med log auto-purges older days)' }); return; }
            var hits = medsAt(d, x.time);
            if (hits.length > 1) { ops.push({ kind: 'reject', destructive: false, label: 'DOSE ' + label, reason: 'Ambiguous - ' + hits.length + ' doses already at that date+time' }); return; }
            if (hits.length === 1) {
                if (Number(hits[0].dose) === x.dose) ops.push({ kind: 'skip', destructive: false, label: 'DOSE ' + label, reason: 'Already logged (exact duplicate)' });
                else ops.push({ kind: 'update-med', destructive: false, label: 'DOSE ' + label + ': ' + hits[0].dose + 'mg -> ' + x.dose + 'mg', id: hits[0].id, detail: { dose: x.dose } });
            } else {
                ops.push({ kind: 'add-med', destructive: false, label: 'DOSE ' + label, detail: { dose: x.dose, time: x.time, date: d } });
            }
        });

        // --- caffeine (upsert by date+time) ---
        day.caffeine.forEach(function(x) {
            var label = x.amount + 'mg ' + x.name + ' @ ' + x.time + ' (' + d + ')';
            if (!dateOk) { ops.push({ kind: 'reject', destructive: false, label: 'CAFFEINE ' + label, reason: 'Caffeine can only be logged for today or yesterday (log auto-purges older days)' }); return; }
            var hits = caffsAt(d, x.time);
            if (hits.length > 1) { ops.push({ kind: 'reject', destructive: false, label: 'CAFFEINE ' + label, reason: 'Ambiguous - ' + hits.length + ' entries already at that date+time' }); return; }
            if (hits.length === 1) {
                if (Number(hits[0].amount) === x.amount && hits[0].name === x.name) ops.push({ kind: 'skip', destructive: false, label: 'CAFFEINE ' + label, reason: 'Already logged (exact duplicate)' });
                else ops.push({ kind: 'update-caff', destructive: false, label: 'CAFFEINE @ ' + x.time + ': ' + hits[0].amount + 'mg ' + hits[0].name + ' -> ' + x.amount + 'mg ' + x.name, id: hits[0].id, detail: { amount: x.amount, name: x.name } });
            } else {
                ops.push({ kind: 'add-caff', destructive: false, label: 'CAFFEINE ' + label, detail: { amount: x.amount, name: x.name, time: x.time, date: d } });
            }
        });

        // --- sleep upsert (WOKE and/or SLEPT/FELL_ASLEEP) ---
        if (day.woke !== null || day.slept !== null) {
            if (d > todayStr) {
                ops.push({ kind: 'reject', destructive: false, label: 'SLEEP ' + d, reason: 'Cannot log sleep for a future date (only PLAN_SLEEP may target the future)' });
            } else {
            var ex = (st.sleepHistory || {})[d];
            var exH = ex && typeof ex === 'object' ? ex.hoursSlept : ex;
            var exW = ex && typeof ex === 'object' ? ex.wakeTime : null;
            var newH = day.slept !== null ? day.slept : (Number.isFinite(exH) ? exH : null);
            var newW = day.woke || exW || null;
            if (ex && exH === newH && exW === newW) {
                ops.push({ kind: 'skip', destructive: false, label: 'SLEEP ' + d + ': ' + newH + 'h, woke ' + newW, reason: 'Already logged (exact duplicate)' });
            } else {
                ops.push({ kind: 'sleep-upsert', destructive: false, isToday: isToday,
                    label: 'SLEEP ' + d + ': ' + (newH !== null ? newH + 'h' : 'keep hours') + (day.woke ? ', woke ' + day.woke : ''),
                    detail: { date: d, hours: newH, wake: newW, wokeGiven: !!day.woke, hoursGiven: day.slept !== null } });
            }
            }
        }

        // --- plan sleep (any date - sleepDailyLogs is date-keyed) ---
        if (day.planSleep) {
            var exLog = (st.sleepDailyLogs || {})[d];
            if (exLog && exLog.plannedBedtime === day.planSleep) {
                ops.push({ kind: 'skip', destructive: false, label: 'PLAN_SLEEP ' + d + ' ' + day.planSleep, reason: 'Already set' });
            } else {
                ops.push({ kind: 'plan-sleep', destructive: false, label: 'PLAN_SLEEP ' + d + ': target bedtime ' + day.planSleep, detail: { date: d, time: day.planSleep } });
            }
        }

        // --- live modifiers / all-nighter: today only ---
        if (day.workout !== undefined) {
            if (!isToday) ops.push({ kind: 'skip', destructive: false, label: 'WORKOUT (' + d + ')', reason: 'Workout modifier is live today-only state - past days are read from history' });
            else ops.push({ kind: 'set-workout', destructive: false, label: day.workout ? 'WORKOUT ends ' + day.workout.endTime + (day.workout.intense ? ' (intense)' : '') : 'WORKOUT off', detail: day.workout });
        }
        if (day.vitc !== undefined) {
            if (!isToday) ops.push({ kind: 'skip', destructive: false, label: 'VITC (' + d + ')', reason: 'Vitamin C modifier is live today-only state' });
            else ops.push({ kind: 'set-vitc', destructive: false, label: day.vitc ? 'VITC @ ' + day.vitc.time + (day.vitc.high ? ' (high-dose protocol)' : '') : 'VITC off', detail: day.vitc });
        }
        if (day.allNighter !== null) {
            if (!isToday) ops.push({ kind: 'skip', destructive: false, label: 'ALL_NIGHTER (' + d + ')', reason: 'All-nighter mode is live today-only state' });
            else if (!!st.allNighterMode === day.allNighter) ops.push({ kind: 'skip', destructive: false, label: 'ALL_NIGHTER ' + (day.allNighter ? 'on' : 'off'), reason: 'Already ' + (day.allNighter ? 'on' : 'off') });
            else ops.push({ kind: 'set-allnighter', destructive: false, label: 'ALL_NIGHTER ' + (day.allNighter ? 'ON' : 'OFF'), detail: { value: day.allNighter } });
        }

        // --- verbs ---
        day.verbs.forEach(function(v) {
            if (v.verb === 'DOSE_MOVE' || v.verb === 'CAFF_MOVE') {
                var isMed = v.verb === 'DOSE_MOVE';
                var atFn = isMed ? medsAt : caffsAt;
                var noun = isMed ? 'dose' : 'caffeine';
                var label = v.verb + ' ' + v.from + ' -> ' + v.to + ' (' + d + ')';
                var hits = atFn(d, v.from);
                if (hits.length === 0) {
                    // re-paste safety: already at target?
                    if (atFn(d, v.to).length) ops.push({ kind: 'skip', destructive: false, label: label, reason: 'Nothing at ' + v.from + ' but an entry exists at ' + v.to + ' - looks already moved' });
                    else ops.push({ kind: 'reject', destructive: false, label: label, reason: 'No ' + noun + ' at ' + v.from + ' on ' + d });
                    return;
                }
                if (hits.length > 1) { ops.push({ kind: 'reject', destructive: false, label: label, reason: 'Ambiguous - ' + hits.length + ' ' + noun + ' entries at ' + v.from }); return; }
                if (atFn(d, v.to).length) { ops.push({ kind: 'reject', destructive: false, label: label, reason: 'Another ' + noun + ' already sits at ' + v.to }); return; }
                ops.push({ kind: isMed ? 'update-med' : 'update-caff', destructive: false, label: label, id: hits[0].id, detail: { time: v.to } });
            } else if (v.verb === 'DOSE_DELETE' || v.verb === 'CAFF_DELETE') {
                var isMed2 = v.verb === 'DOSE_DELETE';
                var hits2 = (isMed2 ? medsAt : caffsAt)(d, v.time);
                var label2 = v.verb + ' @ ' + v.time + ' (' + d + ')';
                if (hits2.length === 0) { ops.push({ kind: 'reject', destructive: false, label: label2, reason: 'No entry at that time on ' + d + ' (already deleted?) - nothing changed' }); return; }
                if (hits2.length > 1) { ops.push({ kind: 'reject', destructive: false, label: label2, reason: 'Ambiguous - ' + hits2.length + ' entries at ' + v.time }); return; }
                ops.push({ kind: isMed2 ? 'delete-med' : 'delete-caff', destructive: true, label: label2 + (isMed2 ? ' - ' + hits2[0].dose + 'mg' : ' - ' + hits2[0].amount + 'mg ' + hits2[0].name), id: hits2[0].id });
            } else if (v.verb === 'SLEEP_DELETE') {
                if (!(st.sleepHistory || {})[v.date] && !(st.sleepDailyLogs || {})[v.date]) {
                    ops.push({ kind: 'skip', destructive: false, label: 'SLEEP_DELETE ' + v.date, reason: 'No sleep entry for that date' });
                } else {
                    ops.push({ kind: 'sleep-delete', destructive: true, label: 'SLEEP_DELETE ' + v.date + ' - clears logged sleep', detail: { date: v.date, isToday: v.date === todayStr } });
                }
            }
        });
    });

    return ops;
}

// ============================================
// === END SC IMPORT PURE LAYER ===
// ============================================

// ============================================
// APPLY LAYER — mirrors manual CRUD paths exactly.
// add-med    == addMedEntry()            (generateId('med'), updatedAt stamp)
// update-*   == updateMedEntry()/updateCaffeineTime() (field + updatedAt)
// delete-*   == removeMedEntry()/removeCaffeine()     (tombstone BEFORE delete)
// sleep today == confirmMorningCheckin(); sleep past == saveSleepEdit()
// sleep-delete == clearSleepEntry(); modifiers == toggleModifier()
// ============================================
function scApplyImportOps(ops) {
    var counts = { applied: 0, skipped: 0, rejected: 0 };
    var sleepTouched = false;
    var nowIso = function() { return new Date().toISOString(); };

    ops.forEach(function(op) {
        switch (op.kind) {
            case 'skip': counts.skipped++; return;
            case 'reject': counts.rejected++; return;

            case 'add-med': {
                if (!state.medications || Array.isArray(state.medications)) {
                    state.medications = migrateArrayToObject(state.medications, 'med');
                }
                var mid = generateId('med');
                state.medications[mid] = { id: mid, dose: op.detail.dose, time: op.detail.time, date: op.detail.date, updatedAt: nowIso() };
                break;
            }
            case 'update-med': {
                var med = state.medications ? state.medications[op.id] : null;
                if (!med) { counts.rejected++; return; }
                if (op.detail.dose !== undefined) med.dose = op.detail.dose;
                if (op.detail.time !== undefined) med.time = op.detail.time;
                med.updatedAt = nowIso();
                break;
            }
            case 'delete-med': {
                if (state.medications && state.medications[op.id]) {
                    if (!state.tombstones) state.tombstones = { meds: {}, caffeine: {}, sleepDays: {} };
                    if (!state.tombstones.meds) state.tombstones.meds = {};
                    state.tombstones.meds[String(op.id)] = nowIso();
                    delete state.medications[op.id];
                } else { counts.skipped++; return; }
                break;
            }
            case 'add-caff': {
                if (!state.caffeine || Array.isArray(state.caffeine)) {
                    state.caffeine = migrateArrayToObject(state.caffeine, 'caf');
                }
                var cid = generateId('caf');
                state.caffeine[cid] = { id: cid, amount: op.detail.amount, name: op.detail.name || 'Caffeine', time: op.detail.time, date: op.detail.date, updatedAt: nowIso() };
                break;
            }
            case 'update-caff': {
                var caf = state.caffeine ? state.caffeine[op.id] : null;
                if (!caf) { counts.rejected++; return; }
                if (op.detail.amount !== undefined) caf.amount = op.detail.amount;
                if (op.detail.name !== undefined) caf.name = op.detail.name;
                if (op.detail.time !== undefined) caf.time = op.detail.time;
                caf.updatedAt = nowIso();
                break;
            }
            case 'delete-caff': {
                if (state.caffeine && state.caffeine[op.id]) {
                    if (!state.tombstones) state.tombstones = { meds: {}, caffeine: {}, sleepDays: {} };
                    if (!state.tombstones.caffeine) state.tombstones.caffeine = {};
                    state.tombstones.caffeine[String(op.id)] = nowIso();
                    delete state.caffeine[op.id];
                } else { counts.skipped++; return; }
                break;
            }
            case 'sleep-upsert': {
                var d = op.detail.date;
                var hrs = op.detail.hours;
                var wake = op.detail.wake;
                state.sleepHistory = state.sleepHistory || {};
                state.sleepDailyLogs = state.sleepDailyLogs || {};
                var prev = state.sleepHistory[d];
                var prevH = prev && typeof prev === 'object' ? prev.hoursSlept : prev;
                var prevW = prev && typeof prev === 'object' ? prev.wakeTime : null;
                var finalH = hrs !== null ? hrs : (Number.isFinite(prevH) ? prevH : (op.isToday ? state.hoursSleptLastNight : 7));
                var finalW = wake || prevW || state.wakeTime || '06:45';
                state.sleepHistory[d] = { hoursSlept: finalH, wakeTime: finalW, updatedAt: nowIso() };
                if (op.isToday) {
                    // mirror confirmMorningCheckin()
                    state.wakeTime = finalW;
                    state.hoursSleptLastNight = finalH;
                    state.sleepDailyLogs[d] = Object.assign({}, state.sleepDailyLogs[d] || {}, {
                        actualSleep: finalH, wakeTime: finalW, checkedIn: true, source: 'import',
                        lastUpdated: nowIso()
                    });
                } else {
                    // mirror saveSleepEdit()
                    state.sleepDailyLogs[d] = Object.assign({}, state.sleepDailyLogs[d] || {}, {
                        date: d, hoursSlept: finalH, wakeTime: finalW,
                        status: (typeof computeSleepStatus === 'function') ? computeSleepStatus(finalH) : null,
                        sleepDeficit: Math.max(0, ((state.settings && state.settings.sleepTarget) ?? 8) - finalH),
                        source: 'import', lastUpdated: nowIso()
                    });
                }
                sleepTouched = true;
                break;
            }
            case 'sleep-delete': {
                // mirror clearSleepEntry()
                var dd = op.detail.date;
                if (!state.tombstones) state.tombstones = { meds: {}, caffeine: {}, sleepDays: {} };
                if (!state.tombstones.sleepDays) state.tombstones.sleepDays = {};
                state.tombstones.sleepDays[dd] = nowIso();
                if (state.sleepHistory) delete state.sleepHistory[dd];
                if (state.sleepDailyLogs) delete state.sleepDailyLogs[dd];
                if (op.detail.isToday) state.hoursSleptLastNight = 7;
                sleepTouched = true;
                break;
            }
            case 'plan-sleep': {
                state.sleepDailyLogs = state.sleepDailyLogs || {};
                state.sleepDailyLogs[op.detail.date] = Object.assign({}, state.sleepDailyLogs[op.detail.date] || {}, {
                    date: op.detail.date, plannedBedtime: op.detail.time, lastUpdated: nowIso()
                });
                break;
            }
            case 'set-workout': {
                // mirror toggleModifier(checkbox, 'workout')
                if (!state.modifiers.workout) state.modifiers.workout = { active: false };
                if (op.detail) {
                    state.modifiers.workout.active = true;
                    state.modifiers.workout.date = getLocalDateString(new Date());
                    state.modifiers.workout.endTime = op.detail.endTime;
                    state.modifiers.workout.intense = !!op.detail.intense;
                } else {
                    state.modifiers.workout.active = false;
                }
                break;
            }
            case 'set-vitc': {
                // mirror toggleModifier(checkbox, 'vitaminC')
                if (!state.modifiers.vitaminC) state.modifiers.vitaminC = { active: false };
                if (op.detail) {
                    state.modifiers.vitaminC.active = true;
                    state.modifiers.vitaminC.time = op.detail.time;
                    if (!state.modifiers.vitaminC.date) state.modifiers.vitaminC.date = getLocalDateString();
                    if (op.detail.high) state.settings.vitcHighDose = true;
                } else {
                    state.modifiers.vitaminC.active = false;
                }
                break;
            }
            case 'set-allnighter': {
                // mirror toggleAllNighterMode()
                state.allNighterMode = !!op.detail.value;
                state._dataLoaded = true;
                break;
            }
            default:
                counts.rejected++;
                return;
        }
        counts.applied++;
    });

    // ---- Batched refresh (once, after all ops) — every call typeof-guarded ----
    if (counts.applied > 0) {
        if (typeof safeSetValue === 'function') {
            safeSetValue('wakeTime', state.wakeTime);
            safeSetValue('hoursSlept', state.hoursSleptLastNight);
        }
        var vitcEl = (typeof document !== 'undefined') ? document.getElementById('vitcHighDose') : null;
        if (vitcEl) vitcEl.checked = !!state.settings.vitcHighDose;
        if (typeof renderMedEntries === 'function') renderMedEntries();
        if (typeof renderCaffeineEntries === 'function') renderCaffeineEntries();
        if (typeof renderFocusCaffeineList === 'function') renderFocusCaffeineList();
        if (typeof updateAllNighterUI === 'function') updateAllNighterUI();
        if (typeof renderGhostLoad === 'function') renderGhostLoad();
        if (typeof updateModifierTimeInputs === 'function') updateModifierTimeInputs();
        if (sleepTouched) {
            if (typeof autoPopulateFeedback === 'function') autoPopulateFeedback();
            if (typeof runAutoCalibration === 'function') runAutoCalibration();
            if (typeof renderMorningCheckin === 'function') renderMorningCheckin();
            if (typeof renderSleepIntelligence === 'function') renderSleepIntelligence();
        }
        if (typeof recalculate === 'function') recalculate();
        if (typeof saveState === 'function') saveState();
    }

    return counts;
}

// ============================================
// UI LAYER — import card (#scImportCard) preview/apply.
// Apply stays disabled until a clean preview of the CURRENT textarea text exists.
// ============================================
var scImportPending = null; // { text, ops, errors, warnings, unrecognized }

function scImpEsc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(String(s ?? ''));
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function scImportOpRowClass(op) {
    if (op.kind === 'reject') return 'sc-imp-reject';
    if (op.kind === 'skip') return 'sc-imp-skip';
    if (op.destructive) return 'sc-imp-del';
    if (op.kind.indexOf('update-') === 0) return 'sc-imp-edit';
    return 'sc-imp-add';
}

function scImportOpTag(op) {
    if (op.kind === 'reject') return 'REJECT';
    if (op.kind === 'skip') return 'SKIP';
    if (op.destructive) return 'DELETE';
    if (op.kind.indexOf('update-') === 0) return 'EDIT';
    return 'ADD';
}

function scImportRenderPreview(parsedMeta) {
    var list = document.getElementById('scImportPreviewList');
    var status = document.getElementById('scImportStatus');
    var btn = document.getElementById('scImportApplyBtn');
    if (!list || !status || !btn) return;

    var html = '';
    (parsedMeta.errors || []).forEach(function(e) {
        html += '<div class="sc-imp-row sc-imp-reject"><span class="sc-imp-tag">ERROR</span> line ' + scImpEsc(e.line) + ': ' + scImpEsc(e.reason) + '</div>';
    });
    (parsedMeta.unrecognized || []).forEach(function(u) {
        html += '<div class="sc-imp-row sc-imp-skip"><span class="sc-imp-tag">IGNORED</span> unrecognized block: ' + scImpEsc(u) + '</div>';
    });
    (parsedMeta.warnings || []).forEach(function(w) {
        html += '<div class="sc-imp-row sc-imp-warn"><span class="sc-imp-tag">NOTE</span> ' + scImpEsc(w) + '</div>';
    });
    (parsedMeta.ops || []).forEach(function(op) {
        html += '<div class="sc-imp-row ' + scImportOpRowClass(op) + '"><span class="sc-imp-tag">' + scImportOpTag(op) + '</span> ' + scImpEsc(op.label) + (op.reason ? ' — ' + scImpEsc(op.reason) : '') + '</div>';
    });
    list.innerHTML = html || '<div class="sc-imp-row sc-imp-skip">Nothing to do.</div>';

    var hasErrors = (parsedMeta.errors || []).length > 0;
    var actionable = (parsedMeta.ops || []).filter(function(o) { return o.kind !== 'skip' && o.kind !== 'reject'; });
    if (hasErrors) {
        status.textContent = 'Parse errors — fix the text and preview again. Nothing will be changed.';
        btn.disabled = true;
        scImportPending = null;
    } else if (actionable.length === 0) {
        status.textContent = 'Nothing to apply (all duplicates/skips/rejects).';
        btn.disabled = true;
        scImportPending = null;
    } else {
        var nDestructive = actionable.filter(function(o) { return o.destructive; }).length;
        status.textContent = actionable.length + ' change' + (actionable.length === 1 ? '' : 's') + ' ready' + (nDestructive ? ' (' + nDestructive + ' destructive)' : '') + '.';
        btn.disabled = false;
    }
}

function scImportInvalidate() {
    scImportPending = null;
    var btn = document.getElementById('scImportApplyBtn');
    if (btn) btn.disabled = true;
    var status = document.getElementById('scImportStatus');
    if (status) status.textContent = 'Text changed — preview again before applying.';
}

function scImportPreview() {
    var ta = document.getElementById('scImportText');
    if (!ta) return;
    var text = ta.value || '';
    if (!text.trim()) {
        scImportInvalidate();
        var status = document.getElementById('scImportStatus');
        if (status) status.textContent = 'Paste a STIM_DAY block first.';
        return;
    }
    var parsed = scParseImportText(text);
    var ops = parsed.errors.length ? [] : scBuildImportOps(parsed, state);
    var meta = { text: text, ops: ops, errors: parsed.errors, warnings: parsed.warnings, unrecognized: parsed.unrecognized };
    scImportRenderPreview(meta);
    scImportPending = parsed.errors.length ? null : meta;
}

function scImportPlanDeltaNote() {
    try {
        var today = getLocalDateString(new Date());
        var log = state.sleepDailyLogs && state.sleepDailyLogs[today];
        if (!log || !log.plannedBedtime || typeof minutesToTime !== 'function') return '';
        var entries = scImpVals(state.history || {}).filter(function(e) { return e && e.date === today && Number.isFinite(e.predictedSleep); });
        if (!entries.length) return '';
        var predMin = entries[entries.length - 1].predictedSleep % 1440;
        var pp = log.plannedBedtime.split(':');
        var planMin = parseInt(pp[0], 10) * 60 + parseInt(pp[1], 10);
        var delta = predMin - planMin;
        if (delta > 720) delta -= 1440;
        if (delta < -720) delta += 1440;
        var dir = delta > 0 ? 'later than plan' : 'earlier than plan';
        return ' Plan ' + log.plannedBedtime + ' vs predicted ' + minutesToTime(predMin) + (delta === 0 ? ' (on plan)' : ' (' + Math.abs(delta) + 'm ' + dir + ')');
    } catch (e) { return ''; }
}

function scImportApply() {
    var ta = document.getElementById('scImportText');
    if (!scImportPending || !ta || ta.value !== scImportPending.text) {
        scImportInvalidate();
        if (typeof showToast === 'function') showToast('Preview first — text changed since last preview', 'error');
        return;
    }
    var meta = scImportPending;
    scImportPending = null;
    var counts = scApplyImportOps(meta.ops);
    var btn = document.getElementById('scImportApplyBtn');
    if (btn) btn.disabled = true;
    var status = document.getElementById('scImportStatus');
    var receipt = 'Applied ' + counts.applied + ', skipped ' + counts.skipped + ', rejected ' + counts.rejected + '.' + scImportPlanDeltaNote();
    if (status) status.textContent = receipt;
    if (typeof showToast === 'function') showToast(counts.applied > 0 ? ('Import applied: ' + counts.applied + ' change' + (counts.applied === 1 ? '' : 's')) : 'Nothing applied', counts.applied > 0 ? 'success' : 'error');
    if (counts.applied > 0 && ta) ta.value = '';
}

// ============================================
// PROGRAMMATIC ENTRY — future Sully OS relay path.
// autoApply applies ONLY non-destructive ops; destructive ops are queued into
// the import card preview for manual confirmation. Parse errors => zero mutation.
// ============================================
function scImportApplyText(text, opts) {
    opts = opts || {};
    var parsed = scParseImportText(text, opts);
    if (parsed.errors.length) {
        return { ok: false, applied: 0, skipped: 0, rejected: 0, pendingDestructive: 0, errors: parsed.errors, summary: 'Parse errors — nothing changed.' };
    }
    var ops = scBuildImportOps(parsed, (typeof state !== 'undefined' ? state : opts.state), opts);
    var destructive = ops.filter(function(o) { return o.destructive; });
    var safe = ops.filter(function(o) { return !o.destructive; });
    var counts = { applied: 0, skipped: 0, rejected: 0 };
    if (opts.autoApply) {
        counts = scApplyImportOps(safe);
        if (destructive.length && typeof document !== 'undefined') {
            var ta = document.getElementById('scImportText');
            if (ta) {
                ta.value = text;
                scImportPreview();
            }
        }
    } else if (typeof document !== 'undefined') {
        var ta2 = document.getElementById('scImportText');
        if (ta2) {
            ta2.value = text;
            scImportPreview();
        }
    }
    return {
        ok: true,
        applied: counts.applied,
        skipped: counts.skipped,
        rejected: counts.rejected,
        pendingDestructive: destructive.length,
        errors: [],
        warnings: parsed.warnings,
        summary: 'Applied ' + counts.applied + ', skipped ' + counts.skipped + ', rejected ' + counts.rejected + (destructive.length ? ', ' + destructive.length + ' destructive pending manual confirm' : '') + '.'
    };
}

// Node test-harness shim (browser: module is undefined, this is a no-op)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        scNormalizeTime: scNormalizeTime,
        scValidDateStr: scValidDateStr,
        scImpLocalDate: scImpLocalDate,
        scComputeSleptHours: scComputeSleptHours,
        scReassembleStimBlocks: scReassembleStimBlocks,
        scParseImportText: scParseImportText,
        scBuildImportOps: scBuildImportOps,
        scApplyImportOps: scApplyImportOps,
        scImportApplyText: scImportApplyText
    };
}
