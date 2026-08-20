// ============================================================================
// SULLY OS — Command Center glue (loaded by all three apps AFTER router.js)
//
// Additive layer. It NEVER touches any app's state path directly. It:
//   1. Renders a routing summary next to the app's paste box (what stays here,
//      what will relay to the other apps).
//   2. On Apply, applies the LOCAL-app blocks through the app's OWN native
//      import handler (unchanged, already merge/tombstone/stamp-correct), then
//      relays the FOREIGN blocks to their apps via the Firebase mailbox.
//   3. On load-complete + tab-visible + realtime child_added, drains this app's
//      mailbox and applies any relayed text through the app's OWN programmatic
//      entry (scImportApplyText / bcApplySullyText / grApplySullyText), which
//      runs behind the app's normal save/sync guards.
//   4. Shows a receipts panel of what this app relayed and whether it applied.
//
// Wiring is done by monkey-patching the app's existing preview/apply globals so
// no button HTML changes. The relay-apply path uses the raw programmatic
// entries (not the patched handlers), so a received message never re-relays.
// ============================================================================

// [SULLYOS-CC-START]
window.SullyOS = (function () {
    var cfg = null;
    var listenerAttached = false;
    var APP_KEYS = ['bodyComp', 'stimCalc', 'roadmap'];
    var APP_LABELS = { bodyComp: 'Body Comp', stimCalc: 'Stim Calc', roadmap: 'Grad Roadmap' };

    function ccEsc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    function getDb() { try { return cfg && cfg.getDb ? cfg.getDb() : null; } catch (e) { return null; } }
    function getRoot() { try { return cfg && cfg.getUserRoot ? cfg.getUserRoot() : null; } catch (e) { return null; } }
    function textareaEl() { return cfg && cfg.els && cfg.els.textarea ? document.getElementById(cfg.els.textarea) : null; }
    function toast(msg, type) {
        if (typeof showToast === 'function') { try { showToast(msg, type || 'info'); return; } catch (e) {} }
        try { console.log('[SullyOS] ' + msg); } catch (e) {}
    }

    function route(raw) {
        if (typeof sullyRouteBlocks !== 'function') return null;
        try { return sullyRouteBlocks(raw); } catch (e) { return null; }
    }
    function foreignCount(routed) {
        if (!routed) return 0;
        var n = 0;
        APP_KEYS.forEach(function (k) { if (k !== cfg.appKey && routed.byApp[k]) n += routed.byApp[k].length; });
        return n;
    }
    function localCount(routed) {
        return routed && routed.byApp[cfg.appKey] ? routed.byApp[cfg.appKey].length : 0;
    }

    // ---- routing summary element (use configured id, else create after textarea) ----
    function routingEl() {
        var el = cfg.els && cfg.els.routing ? document.getElementById(cfg.els.routing) : null;
        if (el) return el;
        var ta = textareaEl();
        if (!ta || !ta.parentNode) return null;
        el = document.createElement('div');
        el.id = (cfg.appKey || 'sully') + 'SullyRouting';
        el.style.cssText = 'margin-top:8px; font-size:0.8em; line-height:1.4;';
        ta.parentNode.insertBefore(el, ta.nextSibling);
        if (!cfg.els) cfg.els = {};
        cfg.els.routing = el.id;
        return el;
    }

    function renderRouting(routed) {
        var el = routingEl();
        if (!el) return;
        if (!routed) { el.innerHTML = ''; return; }
        var lc = localCount(routed), fc = foreignCount(routed), uk = routed.unknown.length;
        if (!lc && !fc && !uk && !routed.syntaxWarning) { el.innerHTML = ''; return; }
        var rows = [];
        if (routed.syntaxWarning) {
            rows.push('<div style="color:#f59e0b;">⚠ ' + ccEsc(routed.syntaxWarning) + '</div>');
        }
        APP_KEYS.forEach(function (k) {
            var n = routed.byApp[k] ? routed.byApp[k].length : 0;
            if (!n) return;
            var mine = (k === cfg.appKey);
            var where = mine ? 'applied here' : 'relay to ' + APP_LABELS[k];
            var color = mine ? '#34c759' : '#60a5fa';
            rows.push('<div style="color:' + color + ';">' + (mine ? '▸' : '↗') + ' ' + n +
                ' block' + (n === 1 ? '' : 's') + ' → ' + ccEsc(where) + '</div>');
        });
        if (uk) rows.push('<div style="color:#94a3b8;">• ' + uk + ' unrecognized block' + (uk === 1 ? '' : 's') + ' — ignored</div>');
        el.innerHTML = '<div style="padding:6px 8px; border:1px solid rgba(96,165,250,0.35); border-radius:8px; background:rgba(96,165,250,0.08);">' +
            '<div style="font-weight:700; color:#93c5fd; margin-bottom:2px;">Sully OS routing</div>' + rows.join('') + '</div>';
    }

    // ---- relay foreign blocks to their apps ----
    function relayForeign(routed) {
        var db = getDb(), root = getRoot();
        if (!db || !root || !routed || typeof sullyRelaySend !== 'function') return Promise.resolve([]);
        var foreign = {};
        var any = false;
        APP_KEYS.forEach(function (k) {
            if (k !== cfg.appKey && routed.byApp[k] && routed.byApp[k].length) { foreign[k] = routed.byApp[k]; any = true; }
        });
        if (!any) return Promise.resolve([]);
        return sullyRelaySend(db, root, cfg.appKey, foreign).then(function (sent) {
            var ok = sent.filter(function (s) { return s.ok; });
            var bad = sent.filter(function (s) { return !s.ok; });
            if (ok.length) {
                var apps = ok.map(function (s) { return APP_LABELS[s.app] || s.app; });
                toast('Relayed to ' + apps.join(' + ') + ' — open that app to apply', 'success');
            }
            if (bad.length) toast('Relay failed for ' + bad.length + ' message(s)', 'error');
            setTimeout(renderReceipts, 400);
            return sent;
        }).catch(function (err) {
            toast('Relay error: ' + (err && err.message || err), 'error');
            return [];
        });
    }

    // Coerce the three apps' divergent native return shapes into the exact
    // shape router.js#sullyRelayProcessOne expects: applied/skipped as ints,
    // rejected/destructivePending as arrays (it reads `.length`). Handles
    // stimcalc (ints, key `pendingDestructive`), bodycomp (arrays, key
    // `destructivePending`), and roadmap (ints, key `destructivePending`).
    function numOf(v) { return Array.isArray(v) ? v.length : (typeof v === 'number' ? v : 0); }
    function arrOf(v) {
        if (Array.isArray(v)) return v;
        var n = (typeof v === 'number' && v > 0) ? v : 0, a = [];
        for (var i = 0; i < n; i++) a.push(1);
        return a;
    }
    function canonicalizeReceipt(r) {
        r = r || {};
        var dp = (r.destructivePending != null) ? r.destructivePending : r.pendingDestructive;
        return {
            applied: numOf(r.applied),
            skipped: numOf(r.skipped),
            rejected: arrOf(r.rejected),
            destructivePending: arrOf(dp),
            summary: r.summary || ''
        };
    }

    // ---- programmatic apply of a RELAYED message (this app is the target) ----
    function applyRelayed(text) {
        return Promise.resolve()
            .then(function () { return cfg.applyLocal(text, { autoApply: true, source: 'relay' }); })
            .then(function (res) { return cfg.normalizeReceipt ? cfg.normalizeReceipt(res) : canonicalizeReceipt(res); });
    }

    function summarizeReceipt(r) {
        if (!r) return 'no changes';
        var bits = [];
        if (r.applied) bits.push(r.applied + ' applied');
        if (r.skipped) bits.push(r.skipped + ' skipped');
        if (r.rejected) bits.push(r.rejected + ' rejected');
        if (r.destructivePending) bits.push(r.destructivePending + ' need manual confirm');
        return bits.length ? bits.join(', ') : (r.summary || 'no changes');
    }

    function notifyDrain(results) {
        if (!results || !results.length) return;
        var total = { applied: 0, skipped: 0, rejected: 0, destructivePending: 0 };
        var fromSet = {};
        results.forEach(function (res) {
            var rc = res && res.receipt ? res.receipt : {};
            total.applied += rc.applied || 0;
            total.skipped += rc.skipped || 0;
            total.rejected += rc.rejected || 0;
            total.destructivePending += rc.destructivePending || 0;
            if (res && res.from) fromSet[res.from] = true;
        });
        var froms = Object.keys(fromSet).map(function (k) { return APP_LABELS[k] || k; });
        var srcTxt = froms.length ? ' from ' + froms.join(' + ') : '';
        if (total.applied) toast('📥 Applied ' + total.applied + ' relayed change' + (total.applied === 1 ? '' : 's') + srcTxt, 'success');
        if (total.destructivePending) toast('📥 ' + total.destructivePending + ' relayed delete(s) queued — confirm in the Import tab', 'info');
        if (!total.applied && !total.destructivePending && total.rejected) toast('📥 ' + total.rejected + ' relayed change(s) rejected' + srcTxt, 'error');
    }

    // ---- receipts panel: what THIS app has relayed to others ----
    function receiptsEl() {
        var el = cfg.els && cfg.els.receipts ? document.getElementById(cfg.els.receipts) : null;
        if (el) return el;
        var rEl = routingEl();
        if (!rEl || !rEl.parentNode) return null;
        el = document.createElement('div');
        el.id = (cfg.appKey || 'sully') + 'SullyReceipts';
        el.style.cssText = 'margin-top:8px; font-size:0.78em;';
        rEl.parentNode.insertBefore(el, rEl.nextSibling);
        if (!cfg.els) cfg.els = {};
        cfg.els.receipts = el.id;
        return el;
    }

    function renderReceipts() {
        var el = receiptsEl();
        var db = getDb(), root = getRoot();
        if (!el || !db || !root || typeof sullyRelayReceipts !== 'function') return;
        sullyRelayReceipts(db, root, cfg.appKey).then(function (list) {
            if (!list || !list.length) { el.innerHTML = ''; return; }
            var recent = list.slice(0, 6);
            var rows = recent.map(function (r) {
                var target = APP_LABELS[r.app] || r.app;
                var status, color;
                if (r.appliedAt && r.receipt) { status = summarizeReceipt(r.receipt); color = '#34c759'; }
                else if (r.appliedAt) { status = 'applied'; color = '#34c759'; }
                else { status = 'waiting — open ' + target; color = '#94a3b8'; }
                return '<div style="padding:3px 0; border-top:1px solid rgba(148,163,184,0.18);">' +
                    '<span style="color:#93c5fd;">↗ ' + ccEsc(target) + '</span> · ' +
                    '<span style="color:' + color + ';">' + ccEsc(status) + '</span></div>';
            });
            el.innerHTML = '<div style="font-weight:700; color:#93c5fd; margin-bottom:2px;">Relay receipts</div>' + rows.join('');
        }).catch(function () {});
    }

    // ---- wrapped preview: render routing + gate native preview ----
    function wrapPreview(nativeFn) {
        return function () {
            var ta = textareaEl();
            var raw = ta ? ta.value : '';
            var routed = route(raw);
            renderRouting(routed);
            var lc = localCount(routed);
            if (lc > 0 || !raw.trim()) {
                // Local blocks present (foreign blocks are non-blocking "unrecognized"
                // in every native parser) — run the native preview untouched.
                if (typeof nativeFn === 'function') return nativeFn.apply(this, arguments);
            } else if (foreignCount(routed) > 0) {
                // All-foreign paste: skip native preview (would say "nothing found").
                // Enable the app's apply button so the relay can be triggered.
                if (cfg.els && cfg.els.applyBtn) {
                    var btn = document.getElementById(cfg.els.applyBtn);
                    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
                }
                if (cfg.els && cfg.els.status) {
                    var st = document.getElementById(cfg.els.status);
                    if (st) st.textContent = foreignCount(routed) + ' block(s) will relay to other app(s) on Apply.';
                }
            } else {
                if (typeof nativeFn === 'function') return nativeFn.apply(this, arguments);
            }
        };
    }

    // ---- wrapped apply/confirm: apply local via native, relay foreign ----
    function wrapApply(nativeFn) {
        return function () {
            var ta = textareaEl();
            var raw = ta ? ta.value : '';
            var routed = route(raw);        // capture BEFORE native apply may clear the box
            var lc = localCount(routed);
            var ret;
            if (lc > 0 && typeof nativeFn === 'function') {
                ret = nativeFn.apply(this, arguments);   // applies LOCAL blocks; ignores foreign
            } else if (lc === 0 && foreignCount(routed) > 0 && ta) {
                ta.value = '';                            // all-foreign: nothing to apply locally
                if (cfg.els && cfg.els.applyBtn) {
                    var btn = document.getElementById(cfg.els.applyBtn);
                    if (btn) { btn.disabled = true; if (btn.style) btn.style.opacity = '0.5'; }
                }
            } else if (typeof nativeFn === 'function') {
                ret = nativeFn.apply(this, arguments);    // nothing recognized — let native message
            }
            if (foreignCount(routed) > 0) relayForeign(routed);
            return ret;
        };
    }

    // ---- lifecycle ----
    function drainOnce() {
        var db = getDb(), root = getRoot();
        if (!db || !root || typeof sullyRelayDrain !== 'function') return;
        sullyRelayDrain(db, root, cfg.appKey, applyRelayed).then(function (results) {
            notifyDrain(results);
        }).catch(function () {});
    }

    function onLoadComplete() {
        if (!cfg) return;
        drainOnce();
        if (!listenerAttached && getDb() && getRoot() && typeof sullyRelayListen === 'function') {
            listenerAttached = true;
            try {
                sullyRelayListen(getDb(), getRoot(), cfg.appKey, applyRelayed, function (result) {
                    if (result) notifyDrain([result]);
                });
            } catch (e) { listenerAttached = false; }
        }
    }

    function onVisible() { drainOnce(); }

    function init(c) {
        cfg = c || {};
        if (!cfg.appKey) return;
        // Monkey-patch the app's native preview/apply globals (idempotent).
        try {
            if (cfg.previewName && typeof window[cfg.previewName] === 'function' && !window[cfg.previewName]._sullyWrapped) {
                var np = window[cfg.previewName];
                var wp = wrapPreview(np);
                wp._sullyWrapped = true;
                window[cfg.previewName] = wp;
            }
            if (cfg.applyName && typeof window[cfg.applyName] === 'function' && !window[cfg.applyName]._sullyWrapped) {
                var na = window[cfg.applyName];
                var wa = wrapApply(na);
                wa._sullyWrapped = true;
                window[cfg.applyName] = wa;
            }
        } catch (e) { try { console.error('[SullyOS] wrap failed:', e); } catch (e2) {} }
    }

    return {
        init: init,
        onLoadComplete: onLoadComplete,
        onVisible: onVisible,
        renderRouting: function () { var ta = textareaEl(); renderRouting(route(ta ? ta.value : '')); },
        renderReceipts: renderReceipts,
        _applyRelayed: applyRelayed,
        _route: route
    };
})();
// [SULLYOS-CC-END]
