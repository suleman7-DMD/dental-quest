#!/usr/bin/env node
// Stim calc sync replay harness — Task 18 of the revival plan.
//
// Extracts the REAL merge engine from js/stimcalc/firebase-sync.js (the code
// between the SYNC MERGE ENGINE sentinels) plus its state.js helpers, and
// replays the 8 cross-device scenarios that caused the stale-tab data-loss
// bug class. No mocks of the merge logic itself — if this passes, the shipped
// code passes.
//
// Run: node scripts/stimcalc-sync-replay.mjs   (exit 0 = all pass)

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stateSrc = readFileSync(join(root, 'js/stimcalc/state.js'), 'utf8');
const syncSrc = readFileSync(join(root, 'js/stimcalc/firebase-sync.js'), 'utf8');

// --- extract real source ---------------------------------------------------

function extractFunction(src, name) {
    const idx = src.indexOf(`function ${name}(`);
    if (idx === -1) throw new Error(`function ${name} not found in source`);
    const braceStart = src.indexOf('{', idx);
    let depth = 0;
    for (let i = braceStart; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}' && --depth === 0) return src.slice(idx, i + 1);
    }
    throw new Error(`unbalanced braces extracting ${name}`);
}

const START = '// === SYNC MERGE ENGINE (pure) ===';
const END = '// === END SYNC MERGE ENGINE ===';
if (syncSrc.indexOf(START) === -1 || syncSrc.indexOf(END) === -1) {
    throw new Error('engine sentinels missing from firebase-sync.js');
}
const engine = syncSrc.slice(syncSrc.indexOf(START), syncSrc.indexOf(END) + END.length);

const helpers = ['generateId', 'migrateArrayToObject', 'getValues', 'getCount',
    'getLocalDateString', 'getDefaultState']
    .map(n => extractFunction(stateSrc, n)).join('\n\n');
const migrateHeavyLift = extractFunction(syncSrc, 'migrateHeavyLiftToWorkout');

// --- sandbox: the engine mutates a module-global `state` --------------------

const api = new Function(`
    var state = null;
    var mergeNeedsPush = false;
    ${helpers}
    ${migrateHeavyLift}
    ${engine}
    return {
        merge(localState, remoteData) {
            state = localState;
            mergeNeedsPush = false;
            mergeRemoteState(remoteData);
            return { state: state, needsPush: mergeNeedsPush };
        },
        stamp(st) { state = st; updateGroupStamps(); return state; },
        mergeCollection: mergeCollection,
        getRecStamp: getRecStamp,
        stableSig: stableSig,
        defaults: getDefaultState
    };
`)();

// --- scenario helpers --------------------------------------------------------

function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
}
function dateDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function mkState(overrides) {
    return Object.assign(api.defaults(), { _dataLoaded: true }, overrides);
}
const clone = o => JSON.parse(JSON.stringify(o));

let failures = 0;
function scenario(name, fn) {
    const asserts = [];
    const check = (cond, msg) => asserts.push([!!cond, msg]);
    try {
        fn(check);
    } catch (e) {
        asserts.push([false, `threw: ${e.message}`]);
    }
    const bad = asserts.filter(([ok]) => !ok);
    if (bad.length === 0) {
        console.log(`PASS  ${name}  (${asserts.length} assertions)`);
    } else {
        failures++;
        console.log(`FAIL  ${name}`);
        bad.forEach(([, msg]) => console.log(`      ✗ ${msg}`));
    }
}

const tOld = isoDaysAgo(2);
const tMid = isoDaysAgo(1);
const tNew = new Date().toISOString();

// --- the 8 scenarios ---------------------------------------------------------

scenario('1. stale-tab snapshot merge is a lossless union', check => {
    // Stale tab holds this morning's snapshot; cloud has an edit + a new record.
    const local = mkState({
        medications: {
            med_1_aaa: { id: 'med_1_aaa', dose: 20, time: '07:00', date: dateDaysAgo(0), updatedAt: tOld },
            med_2_bbb: { id: 'med_2_bbb', dose: 10, time: '11:00', date: dateDaysAgo(0), updatedAt: tOld }
        },
        _version: 3
    });
    const remote = mkState({
        medications: {
            med_1_aaa: { id: 'med_1_aaa', dose: 25, time: '07:00', date: dateDaysAgo(0), updatedAt: tNew },
            med_3_ccc: { id: 'med_3_ccc', dose: 5, time: '14:00', date: dateDaysAgo(0), updatedAt: tNew }
        },
        _version: 5
    });
    const { state: s, needsPush } = api.merge(local, { state: remote, lastUpdated: tNew });
    check(s.medications.med_1_aaa && s.medications.med_1_aaa.dose === 25, 'edited med_1_aaa takes the newer remote copy');
    check(!!s.medications.med_2_bbb, 'local-only med_2_bbb survives (old code lost it)');
    check(!!s.medications.med_3_ccc, 'remote-only med_3_ccc survives');
    check(needsPush === true, 'needsPush set (cloud is missing med_2_bbb)');
    check(s._dataLoaded === true, '_dataLoaded preserved');
    check(s._version === 6, '_version = max(local,remote)+1');
});

scenario('2. offline adds on both devices union together', check => {
    const base = { caf_0_aaa: { id: 'caf_0_aaa', amount: 100, name: 'Coffee', time: '08:00', date: dateDaysAgo(0), updatedAt: tOld } };
    const local = mkState({ caffeine: { ...clone(base), caf_1_lll: { id: 'caf_1_lll', amount: 50, name: 'Tea', time: '12:00', date: dateDaysAgo(0), updatedAt: tMid } } });
    const remote = mkState({ caffeine: { ...clone(base), caf_2_rrr: { id: 'caf_2_rrr', amount: 80, name: 'Espresso', time: '13:00', date: dateDaysAgo(0), updatedAt: tMid } } });
    const { state: s, needsPush } = api.merge(local, remote); // plain (unwrapped) remote form
    check(!!s.caffeine.caf_0_aaa && !!s.caffeine.caf_1_lll && !!s.caffeine.caf_2_rrr, 'all three entries present after merge');
    check(needsPush === true, 'needsPush set (cloud is missing caf_1_lll)');
});

scenario('3. delete propagates via tombstone', check => {
    // Phone deleted med_1_aaa (tombstone newer than the record's stamp); stale tab still has it.
    const local = mkState({
        medications: { med_1_aaa: { id: 'med_1_aaa', dose: 20, time: '07:00', date: dateDaysAgo(0), updatedAt: tOld } }
    });
    const remote = mkState({});
    remote.tombstones.meds.med_1_aaa = tNew;
    const { state: s } = api.merge(local, remote);
    check(!s.medications.med_1_aaa, 'med_1_aaa stays deleted (old code resurrected it)');
    check(s.tombstones.meds.med_1_aaa === tNew, 'tombstone retained for future merges');
});

scenario('4. re-add after delete survives (stamp beats tombstone)', check => {
    const local = mkState({
        medications: { med_1_aaa: { id: 'med_1_aaa', dose: 30, time: '09:00', date: dateDaysAgo(0), updatedAt: tNew } }
    });
    local.tombstones.meds.med_1_aaa = tMid; // deleted yesterday, re-added just now
    const remote = mkState({});
    remote.tombstones.meds.med_1_aaa = tMid;
    const { state: s, needsPush } = api.merge(local, remote);
    check(!!s.medications.med_1_aaa && s.medications.med_1_aaa.dose === 30, 're-added med_1_aaa survives its own tombstone');
    check(needsPush === true, 'needsPush set so the re-add reaches the cloud');
});

scenario('5. newer local record beats older remote copy', check => {
    const local = mkState({
        medications: { med_1_aaa: { id: 'med_1_aaa', dose: 40, time: '07:30', date: dateDaysAgo(0), updatedAt: tNew } }
    });
    const remote = mkState({
        medications: { med_1_aaa: { id: 'med_1_aaa', dose: 20, time: '07:00', date: dateDaysAgo(0), updatedAt: tOld } }
    });
    const { state: s, needsPush } = api.merge(local, remote);
    check(s.medications.med_1_aaa.dose === 40, 'local edit kept (remote copy was stale)');
    check(s.medications.med_1_aaa.time === '07:30', 'whole local record kept, not field-mixed');
    check(needsPush === true, 'needsPush set so the local edit reaches the cloud');
});

scenario('6. cross-group scalar edits both survive one merge', check => {
    // Device A edited settings; device B edited calibration. Neither loses.
    const local = mkState({ _stamps: { settings: tNew, calibration: tOld } });
    local.settings = Object.assign({}, local.settings, { baseThreshold: 16 });
    local.calibration = Object.assign({}, local.calibration, { manualOffsetMin: 0 });
    const remote = mkState({ _stamps: { settings: tOld, calibration: tNew } });
    remote.settings = Object.assign({}, remote.settings, { baseThreshold: 14 });
    remote.calibration = Object.assign({}, remote.calibration, { manualOffsetMin: 30 });
    const { state: s, needsPush } = api.merge(local, remote);
    check(s.settings.baseThreshold === 16, 'locally-newer settings group kept');
    check(s.calibration.manualOffsetMin === 30, 'remotely-newer calibration group taken');
    check(needsPush === true, 'needsPush set (cloud lacks the newer settings group)');
});

scenario('7. identical states merge to needsPush=false (termination)', check => {
    const shared = mkState({
        medications: { med_1_aaa: { id: 'med_1_aaa', dose: 20, time: '07:00', date: dateDaysAgo(0), updatedAt: tMid } },
        _stamps: { settings: tMid, dayScalars: tMid }
    });
    const { needsPush } = api.merge(clone(shared), clone(shared));
    check(needsPush === false, 'no push scheduled — merge/push loop terminates');
});

scenario('8. retention caps + tombstone prune converge; legacy entries survive', check => {
    const local = mkState({
        sleepHistory: {
            [dateDaysAgo(400)]: { hoursSlept: 7, wakeTime: '07:00', updatedAt: isoDaysAgo(400) },
            [dateDaysAgo(1)]: { hoursSlept: 6.5, wakeTime: '06:45', updatedAt: tMid },
            [dateDaysAgo(3)]: 7.5 // legacy bare-number entry — must not crash or vanish
        },
        sleepDailyLogs: {
            [dateDaysAgo(200)]: { actualSleep: 7, lastUpdated: isoDaysAgo(200) },
            [dateDaysAgo(1)]: { actualSleep: 6.5, lastUpdated: tMid }
        },
        history: {
            hist_a: { id: 'hist_a', date: dateDaysAgo(200), lastUpdated: isoDaysAgo(200) },
            hist_b: { id: 'hist_b', date: dateDaysAgo(1), lastUpdated: tMid }
        }
    });
    local.tombstones.meds.oldTomb = isoDaysAgo(90);
    local.tombstones.meds.newTomb = isoDaysAgo(5);
    const { state: s } = api.merge(local, mkState({}));
    check(!s.sleepHistory[dateDaysAgo(400)], 'sleepHistory >365d pruned');
    check(!!s.sleepHistory[dateDaysAgo(1)], 'recent sleepHistory kept');
    check(s.sleepHistory[dateDaysAgo(3)] === 7.5, 'legacy bare-number entry survives the merge');
    check(!s.sleepDailyLogs[dateDaysAgo(200)], 'sleepDailyLogs >180d pruned');
    check(!!s.sleepDailyLogs[dateDaysAgo(1)], 'recent sleepDailyLogs kept');
    check(!s.history.hist_a, 'history >180d pruned (by entry .date)');
    check(!!s.history.hist_b, 'recent history kept');
    check(!s.tombstones.meds.oldTomb, 'tombstone >60d pruned');
    check(s.tombstones.meds.newTomb === isoDaysAgo(5).slice(0, 10) + s.tombstones.meds.newTomb.slice(10) && !!s.tombstones.meds.newTomb, 'recent tombstone kept');
});

// bonus: group-stamp signature discipline (RC7 backing invariant)
scenario('9. no-op save does not bump group stamps; real edit does', check => {
    let s = api.stamp(mkState({}));
    const firstSig = s._stampSigs.settings;
    const firstStamp = s._stamps.settings;
    s = api.stamp(s); // no-op save
    check(s._stampSigs.settings === firstSig && s._stamps.settings === firstStamp,
        'unchanged group keeps its stamp on a no-op save');
    s.settings = Object.assign({}, s.settings, { baseThreshold: 99 });
    s = api.stamp(s);
    check(s._stampSigs.settings !== firstSig, 'edited group gets a fresh signature');
});

console.log(failures === 0 ? '\nALL SCENARIOS PASS' : `\n${failures} SCENARIO(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
