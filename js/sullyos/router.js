// ============================================================================
// SULLY OS — Command Center shared router + Firebase relay mailbox
// Loaded by all three apps (body comp, stim calc, grad roadmap).
// This module NEVER writes any app's state path — it only classifies pasted
// block text and moves raw text through users/<user>/commandRelay/<app>.
// Each app applies relayed text through its OWN parse/guard/CRUD pipeline.
// ============================================================================

// [SULLYOS-ROUTER-START]

var SULLYOS_SYNTAX_VERSION = 'SULLYOS-1';

var SULLYOS_APP_LABELS = {
    bodyComp: 'Body Comp',
    stimCalc: 'Stim Calc',
    roadmap: 'Grad Roadmap'
};

// Body comp lines: pipe immediately after keyword
var SULLYOS_BODYCOMP_LINE = /^(MEAL|WORKOUT|WEIGHIN|FOOD|MEAL_EDIT|MEAL_DELETE|WORKOUT_EDIT|WORKOUT_DELETE|WEIGHIN_EDIT|WEIGHIN_DELETE)\|/i;

// Roadmap block headers (existing 7 + Sully OS verb blocks)
var SULLYOS_ROADMAP_HEADERS = [
    'PATIENT_RECORD', 'PATIENT_UPDATE', 'REQUIREMENTS_MATCH',
    'SPS_DASHBOARD_UPDATE', 'APPOINTMENTS', 'MISSING_NOTES', 'TODO_LIST',
    'APPOINTMENT_MOVE', 'APPOINTMENT_DELETE', 'TODO_DONE', 'TODO_DELETE',
    'NOTE_CLEARED', 'PROCEDURE_DELETE', 'PATIENT_ARCHIVE', 'PATIENT_DELETE'
];

var SULLYOS_BANNERS = {
    '@BODYCOMP': 'bodyComp',
    '@STIMCALC': 'stimCalc',
    '@ROADMAP': 'roadmap'
};

// Destructive roadmap headers never auto-apply from relay
var SULLYOS_DESTRUCTIVE_HEADERS = ['APPOINTMENT_DELETE', 'TODO_DELETE', 'PROCEDURE_DELETE', 'PATIENT_DELETE'];

function sullyClassifyBlock(blockText) {
    var lines = String(blockText).split('\n');
    var banner = null;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var upper = line.toUpperCase();
        if (SULLYOS_BANNERS[upper]) { banner = SULLYOS_BANNERS[upper]; continue; }
        if (upper.indexOf('SYNTAX:') === 0) continue;
        // First meaningful line decides
        if (SULLYOS_BODYCOMP_LINE.test(line)) return 'bodyComp';
        if (upper === 'STIM_DAY') return 'stimCalc';
        for (var h = 0; h < SULLYOS_ROADMAP_HEADERS.length; h++) {
            if (upper === SULLYOS_ROADMAP_HEADERS[h]) return 'roadmap';
        }
        return banner || 'unknown';
    }
    return banner || 'empty';
}

// Split pasted text into blocks and route them.
// Returns { byApp: {bodyComp:[], stimCalc:[], roadmap:[]}, unknown:[], syntaxWarning }
function sullyRouteBlocks(rawText) {
    var text = String(rawText || '').replace(/\r\n/g, '\n');
    // Strip a single wrapping code fence if the user pasted it
    text = text.replace(/^\s*```[a-z]*\n/i, '').replace(/\n```\s*$/i, '');
    var syntaxWarning = null;
    var syntaxMatch = text.match(/^\s*SYNTAX:\s*(\S+)\s*$/mi);
    if (syntaxMatch) {
        if (syntaxMatch[1].toUpperCase() !== SULLYOS_SYNTAX_VERSION) {
            syntaxWarning = 'Unknown syntax version "' + syntaxMatch[1] + '" (expected ' + SULLYOS_SYNTAX_VERSION + ') — parsing anyway.';
        }
        text = text.replace(/^\s*SYNTAX:\s*\S+\s*$/mi, '');
    }
    var blocks = text.split(/^---\s*$/m);
    var result = { byApp: { bodyComp: [], stimCalc: [], roadmap: [] }, unknown: [], syntaxWarning: syntaxWarning };
    for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i].trim();
        if (!block) continue;
        var app = sullyClassifyBlock(block);
        if (app === 'empty') continue;
        if (app === 'unknown') { result.unknown.push(block); continue; }
        result.byApp[app].push(block);
    }
    return result;
}

// True if a roadmap block is a never-auto-apply destructive verb
function sullyBlockIsDestructive(blockText) {
    var lines = String(blockText).split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim().toUpperCase();
        if (!line || SULLYOS_BANNERS[line] || line.indexOf('SYNTAX:') === 0) continue;
        for (var h = 0; h < SULLYOS_DESTRUCTIVE_HEADERS.length; h++) {
            if (line === SULLYOS_DESTRUCTIVE_HEADERS[h]) return true;
        }
        // Body comp / stim delete verbs are line-level; detect them anywhere in the block
        break;
    }
    if (/^(MEAL_DELETE|WORKOUT_DELETE|WEIGHIN_DELETE)\|/im.test(blockText)) return true;
    if (/^(DOSE_DELETE|CAFF_DELETE|SLEEP_DELETE):/im.test(blockText)) return true;
    return false;
}

// Human summary for the routing preview table
function sullyRoutingSummary(routed, myAppKey) {
    var parts = [];
    var order = ['bodyComp', 'stimCalc', 'roadmap'];
    for (var i = 0; i < order.length; i++) {
        var key = order[i];
        var n = routed.byApp[key].length;
        if (!n) continue;
        parts.push(n + ' block' + (n === 1 ? '' : 's') + ' → ' + (key === myAppKey ? 'this app' : SULLYOS_APP_LABELS[key]));
    }
    if (routed.unknown.length) parts.push(routed.unknown.length + ' unrecognized');
    return parts.length ? parts.join(' · ') : 'Nothing recognized';
}

// [SULLYOS-ROUTER-END]

// ============================================================================
// Relay mailbox — users/<userRoot>/commandRelay/<targetApp>/<msgId>
// Node shape: { text, from, createdAt, claimedAt, appliedAt, receipt }
// Raw text only. Single consumer per app. Claim via transaction so two open
// devices never double-apply the same message.
// ============================================================================

var SULLYOS_RELAY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;   // applied nodes pruned after 14 days
var SULLYOS_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;             // stale claims reclaimable after 10 min

function sullyRelayRef(db, userRoot, appKey) {
    return db.ref(userRoot + '/commandRelay/' + appKey);
}

// Send foreign blocks to their target apps. blocksByApp = routed.byApp minus my own key.
// Returns a promise resolving to [{app, msgId}] for receipt tracking.
function sullyRelaySend(db, userRoot, fromAppKey, blocksByApp) {
    var sends = [];
    Object.keys(blocksByApp).forEach(function(appKey) {
        if (appKey === fromAppKey) return;
        var blocks = blocksByApp[appKey];
        if (!blocks || !blocks.length) return;
        var msgId = 'relay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        var node = {
            text: blocks.join('\n---\n'),
            from: fromAppKey,
            createdAt: Date.now(),
            claimedAt: null,
            appliedAt: null,
            receipt: null
        };
        sends.push(
            sullyRelayRef(db, userRoot, appKey).child(msgId).set(node)
                .then(function() { return { app: appKey, msgId: msgId, ok: true }; })
                .catch(function(err) { return { app: appKey, msgId: msgId, ok: false, error: String(err && err.message || err) }; })
        );
    });
    return Promise.all(sends);
}

// Drain my mailbox once. applyFn(text) must return (a promise of) a receipt
// object like { applied, skipped, rejected, destructivePending } — it is the
// app's OWN programmatic import entry, running behind the app's guards.
// Never call before the app's Firebase load is complete.
function sullyRelayDrain(db, userRoot, myAppKey, applyFn) {
    var ref = sullyRelayRef(db, userRoot, myAppKey);
    return ref.once('value').then(function(snap) {
        var val = snap.val() || {};
        var now = Date.now();
        var work = [];
        Object.keys(val).forEach(function(msgId) {
            var node = val[msgId] || {};
            if (node.appliedAt) {
                if (now - node.appliedAt > SULLYOS_RELAY_MAX_AGE_MS) ref.child(msgId).remove();
                return;
            }
            if (node.claimedAt && (now - node.claimedAt) < SULLYOS_CLAIM_TIMEOUT_MS) return; // another device is on it
            if (typeof node.text !== 'string' || !node.text.trim()) { ref.child(msgId).remove(); return; }
            work.push(sullyRelayProcessOne(ref, msgId, node, applyFn));
        });
        return Promise.all(work).then(function(results) {
            return results.filter(function(r) { return !!r; });
        });
    });
}

function sullyRelayProcessOne(ref, msgId, node, applyFn) {
    // Claim via transaction: only one device wins
    return ref.child(msgId).child('claimedAt').transaction(function(cur) {
        var now = Date.now();
        if (cur && (now - cur) < SULLYOS_CLAIM_TIMEOUT_MS) return; // abort — someone else has it
        return now;
    }).then(function(res) {
        if (!res.committed) return null;
        return Promise.resolve()
            .then(function() { return applyFn(node.text); })
            .then(function(receipt) {
                var clean = {
                    applied: (receipt && receipt.applied) || 0,
                    skipped: (receipt && receipt.skipped) || 0,
                    rejected: (receipt && receipt.rejected && receipt.rejected.length) || 0,
                    destructivePending: (receipt && receipt.destructivePending && receipt.destructivePending.length) || 0,
                    summary: (receipt && receipt.summary) || ''
                };
                return ref.child(msgId).update({ appliedAt: Date.now(), receipt: clean })
                    .then(function() { return { msgId: msgId, from: node.from, receipt: clean }; });
            })
            .catch(function(err) {
                var failed = { applied: 0, skipped: 0, rejected: 0, destructivePending: 0, summary: 'apply failed: ' + String(err && err.message || err) };
                return ref.child(msgId).update({ appliedAt: Date.now(), receipt: failed })
                    .then(function() { return { msgId: msgId, from: node.from, receipt: failed }; });
            });
    }).catch(function() { return null; });
}

// Realtime listener: reacts to messages arriving while the app is open.
// Attach only after load-complete. Uses the same claim protocol, so the
// initial child_added replay is harmless.
function sullyRelayListen(db, userRoot, myAppKey, applyFn, onReceipt) {
    var ref = sullyRelayRef(db, userRoot, myAppKey);
    ref.on('child_added', function(snap) {
        var node = snap.val() || {};
        if (node.appliedAt) return;
        if (node.claimedAt && (Date.now() - node.claimedAt) < SULLYOS_CLAIM_TIMEOUT_MS) return;
        if (typeof node.text !== 'string' || !node.text.trim()) return;
        sullyRelayProcessOne(ref, snap.key, node, applyFn).then(function(result) {
            if (result && typeof onReceipt === 'function') onReceipt(result);
        });
    });
}

// One-shot read of messages I sent, for the origin app's receipts panel.
// Returns [{app, msgId, createdAt, appliedAt, receipt}] sorted newest first.
function sullyRelayReceipts(db, userRoot, fromAppKey) {
    var apps = Object.keys(SULLYOS_APP_LABELS).filter(function(k) { return k !== fromAppKey; });
    return Promise.all(apps.map(function(appKey) {
        return sullyRelayRef(db, userRoot, appKey).once('value').then(function(snap) {
            var val = snap.val() || {};
            return Object.keys(val).map(function(msgId) {
                var n = val[msgId] || {};
                return { app: appKey, msgId: msgId, from: n.from, createdAt: n.createdAt || 0, appliedAt: n.appliedAt || null, receipt: n.receipt || null };
            }).filter(function(r) { return r.from === fromAppKey; });
        }).catch(function() { return []; });
    })).then(function(lists) {
        var all = [];
        lists.forEach(function(l) { all = all.concat(l); });
        all.sort(function(a, b) { return b.createdAt - a.createdAt; });
        return all;
    });
}

// Node test shim
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sullyRouteBlocks: sullyRouteBlocks,
        sullyClassifyBlock: sullyClassifyBlock,
        sullyBlockIsDestructive: sullyBlockIsDestructive,
        sullyRoutingSummary: sullyRoutingSummary,
        sullyRelayRef: sullyRelayRef,
        sullyRelaySend: sullyRelaySend,
        sullyRelayDrain: sullyRelayDrain,
        sullyRelayProcessOne: sullyRelayProcessOne,
        sullyRelayListen: sullyRelayListen,
        sullyRelayReceipts: sullyRelayReceipts,
        SULLYOS_ROADMAP_HEADERS: SULLYOS_ROADMAP_HEADERS,
        SULLYOS_SYNTAX_VERSION: SULLYOS_SYNTAX_VERSION,
        SULLYOS_RELAY_MAX_AGE_MS: SULLYOS_RELAY_MAX_AGE_MS,
        SULLYOS_CLAIM_TIMEOUT_MS: SULLYOS_CLAIM_TIMEOUT_MS
    };
}
