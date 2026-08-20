// Sully OS relay harness — claim protocol against an in-memory Firebase mock.
// Proves: single-apply under concurrent claims, skip fresh claims, reclaim
// stale claims, failure receipts, applied-node pruning, receipts panel read.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const R = require('../../js/sullyos/router.js');

let pass = 0, fail = 0;
function eq(actual, expected, label) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a === e) { pass++; }
    else { fail++; console.error(`FAIL ${label}\n  expected ${e}\n  got      ${a}`); }
}

// ---- minimal in-memory Firebase RTDB mock ----
function makeMockDb() {
    const store = {}; // flat path -> value tree via nested objects
    function getAt(pathParts) {
        let cur = store;
        for (const p of pathParts) {
            if (cur == null || typeof cur !== 'object') return null;
            cur = cur[p];
        }
        return cur === undefined ? null : cur;
    }
    function setAt(pathParts, value) {
        let cur = store;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const p = pathParts[i];
            if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
            cur = cur[p];
        }
        const last = pathParts[pathParts.length - 1];
        if (value === null) delete cur[last];
        else cur[last] = value;
    }
    function makeRef(pathParts) {
        return {
            child(name) { return makeRef(pathParts.concat(String(name).split('/'))); },
            once(evt) {
                const val = getAt(pathParts);
                return Promise.resolve({ val: () => (val == null ? null : JSON.parse(JSON.stringify(val))) });
            },
            set(value) { setAt(pathParts, JSON.parse(JSON.stringify(value))); return Promise.resolve(); },
            update(obj) {
                for (const k of Object.keys(obj)) setAt(pathParts.concat(k.split('/')), JSON.parse(JSON.stringify(obj[k])));
                return Promise.resolve();
            },
            remove() { setAt(pathParts, null); return Promise.resolve(); },
            // Serialized like the real server: reads current value synchronously,
            // applies update fn; undefined return aborts.
            transaction(fn) {
                const cur = getAt(pathParts);
                const next = fn(cur);
                if (next === undefined) {
                    return Promise.resolve({ committed: false, snapshot: { val: () => cur } });
                }
                setAt(pathParts, next);
                return Promise.resolve({ committed: true, snapshot: { val: () => next } });
            },
            on() { /* listener registration not exercised in this harness */ }
        };
    }
    return {
        ref(path) { return makeRef(String(path).split('/')); },
        _store: store
    };
}

const USER_ROOT = 'users/user_TESTPIN';

// ---- 1. send → drain applies exactly once, receipt written ----
{
    const db = makeMockDb();
    const routedByApp = { bodyComp: ['MEAL|Chicken Bowl|650|45|60|18|12:30'], stimCalc: [], roadmap: ['APPOINTMENTS\nPATIENT: Test | 2026-08-22 | 1:00 PM | Crown prep'] };
    const sent = await R.sullyRelaySend(db, USER_ROOT, 'stimCalc', routedByApp);
    eq(sent.length, 2, 'send: two mailboxes written');
    eq(sent.every(s => s.ok), true, 'send: all ok');

    let applyCalls = [];
    const applyFn = (text) => { applyCalls.push(text); return { applied: 1, skipped: 0, rejected: [], destructivePending: [], summary: '1 meal added' }; };

    const results = await R.sullyRelayDrain(db, USER_ROOT, 'bodyComp', applyFn);
    eq(results.length, 1, 'drain: one message processed');
    eq(applyCalls.length, 1, 'drain: applyFn called once');
    eq(applyCalls[0], 'MEAL|Chicken Bowl|650|45|60|18|12:30', 'drain: raw text delivered');
    eq(results[0].receipt.applied, 1, 'drain: receipt applied=1');
    eq(results[0].from, 'stimCalc', 'drain: receipt tracks sender');

    // Second drain: appliedAt set → nothing reprocessed
    const again = await R.sullyRelayDrain(db, USER_ROOT, 'bodyComp', applyFn);
    eq(again.length, 0, 'redrain: no double-apply');
    eq(applyCalls.length, 1, 'redrain: applyFn not called again');

    // Node state check
    const box = db._store.users.user_TESTPIN.commandRelay.bodyComp;
    const node = box[Object.keys(box)[0]];
    eq(typeof node.appliedAt, 'number', 'node: appliedAt stamped');
    eq(node.receipt.summary, '1 meal added', 'node: receipt summary persisted');
}

// ---- 2. fresh claim by another device → skipped; stale claim → reclaimed ----
{
    const db = makeMockDb();
    const ref = db.ref(USER_ROOT + '/commandRelay/stimCalc');
    await ref.child('msg_fresh').set({ text: 'STIM_DAY\nDATE: 2026-08-20\nDOSE: 30 @ 07:15', from: 'roadmap', createdAt: Date.now(), claimedAt: Date.now() - 60 * 1000, appliedAt: null, receipt: null });
    await ref.child('msg_stale').set({ text: 'STIM_DAY\nDATE: 2026-08-19\nDOSE: 20 @ 13:00', from: 'roadmap', createdAt: Date.now(), claimedAt: Date.now() - 11 * 60 * 1000, appliedAt: null, receipt: null });

    let applied = [];
    const applyFn = (text) => { applied.push(text); return { applied: 1, skipped: 0, rejected: [], destructivePending: [], summary: 'ok' }; };
    const results = await R.sullyRelayDrain(db, USER_ROOT, 'stimCalc', applyFn);
    eq(results.length, 1, 'claims: only stale claim processed');
    eq(applied.length, 1, 'claims: one apply');
    eq(applied[0].includes('2026-08-19'), true, 'claims: stale message is the applied one');
    const box = db._store.users.user_TESTPIN.commandRelay.stimCalc;
    eq(box.msg_fresh.appliedAt, null, 'claims: fresh-claimed message untouched');
    eq(typeof box.msg_stale.appliedAt, 'number', 'claims: stale message applied');
}

// ---- 3. concurrent processOne on same message → exactly one applies ----
{
    const db = makeMockDb();
    const ref = db.ref(USER_ROOT + '/commandRelay/roadmap');
    const node = { text: 'TODO_LIST\nTASK: call lab | 2026-08-21', from: 'bodyComp', createdAt: Date.now(), claimedAt: null, appliedAt: null, receipt: null };
    await ref.child('msg_race').set(node);
    let applyCount = 0;
    const applyFn = () => { applyCount++; return { applied: 1, skipped: 0, rejected: [], destructivePending: [], summary: 'ok' }; };
    const [a, b] = await Promise.all([
        R.sullyRelayProcessOne(ref, 'msg_race', node, applyFn),
        R.sullyRelayProcessOne(ref, 'msg_race', node, applyFn)
    ]);
    eq(applyCount, 1, 'race: applyFn ran exactly once');
    eq([a, b].filter(Boolean).length, 1, 'race: exactly one winner');
}

// ---- 4. applyFn throws → failed receipt, appliedAt still stamped (no retry loop) ----
{
    const db = makeMockDb();
    const ref = db.ref(USER_ROOT + '/commandRelay/bodyComp');
    await ref.child('msg_bad').set({ text: 'MEAL|Broken|x|y', from: 'stimCalc', createdAt: Date.now(), claimedAt: null, appliedAt: null, receipt: null });
    const results = await R.sullyRelayDrain(db, USER_ROOT, 'bodyComp', () => { throw new Error('parser exploded'); });
    eq(results.length, 1, 'fail: result returned');
    eq(results[0].receipt.applied, 0, 'fail: applied=0');
    eq(results[0].receipt.summary.includes('parser exploded'), true, 'fail: error surfaced in receipt');
    const box = db._store.users.user_TESTPIN.commandRelay.bodyComp;
    eq(typeof box.msg_bad.appliedAt, 'number', 'fail: appliedAt stamped so no infinite retry');
}

// ---- 5. applied nodes older than 14 days pruned; empty-text nodes pruned ----
{
    const db = makeMockDb();
    const ref = db.ref(USER_ROOT + '/commandRelay/stimCalc');
    await ref.child('msg_old').set({ text: 'STIM_DAY\nDATE: 2026-08-01', from: 'roadmap', createdAt: Date.now() - 15 * 24 * 3600 * 1000, claimedAt: null, appliedAt: Date.now() - 15 * 24 * 3600 * 1000, receipt: { applied: 1 } });
    await ref.child('msg_empty').set({ text: '   ', from: 'roadmap', createdAt: Date.now(), claimedAt: null, appliedAt: null, receipt: null });
    await R.sullyRelayDrain(db, USER_ROOT, 'stimCalc', () => ({ applied: 0 }));
    const box = db._store.users.user_TESTPIN.commandRelay.stimCalc || {};
    eq(box.msg_old === undefined, true, 'prune: >14d applied node removed');
    eq(box.msg_empty === undefined, true, 'prune: empty-text node removed');
}

// ---- 6. receipts panel: origin app sees its own sends across mailboxes ----
{
    const db = makeMockDb();
    await R.sullyRelaySend(db, USER_ROOT, 'roadmap', { bodyComp: ['MEAL|A|100|10|10|2'], stimCalc: ['STIM_DAY\nDATE: 2026-08-20'] });
    await R.sullyRelaySend(db, USER_ROOT, 'bodyComp', { stimCalc: ['STIM_DAY\nDATE: 2026-08-19'] });
    await R.sullyRelayDrain(db, USER_ROOT, 'stimCalc', () => ({ applied: 1, skipped: 0, rejected: [], destructivePending: [], summary: 'ok' }));
    const receipts = await R.sullyRelayReceipts(db, USER_ROOT, 'roadmap');
    eq(receipts.length, 2, 'receipts: roadmap sees only its own 2 sends');
    eq(receipts.every(r => r.from === 'roadmap'), true, 'receipts: filtered by sender');
    const stimReceipt = receipts.find(r => r.app === 'stimCalc');
    eq(stimReceipt.receipt && stimReceipt.receipt.applied, 1, 'receipts: applied receipt visible to origin');
}

console.log(`\nrelay harness: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
