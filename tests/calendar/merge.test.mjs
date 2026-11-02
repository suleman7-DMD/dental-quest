// Sully Calendar — sync merge engine + save guards.  Run: node --test tests/calendar/
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCalendar } from './load.mjs';

const c = loadCalendar();
const ev = (id, title, updatedAt) => c.normalizeEvent({ id, type: 'event', title, startDate: '2026-11-05', endDate: '2026-11-05', startTime: '09:00', endTime: '10:00', createdAt: '2026-11-01T00:00:00.000Z', updatedAt });
function st(events, tombs, extra) {
    const s = c.getDefaultState();
    events.forEach(e => { s.events[e.id] = e; });
    Object.assign(s.tombstones.events, tombs || {});
    return c.normalizeState(Object.assign(s, extra || {}));
}
const T1 = '2026-11-02T10:00:00.000Z', T2 = '2026-11-02T11:00:00.000Z', T3 = '2026-11-02T12:00:00.000Z';

test('union: records on only one side survive (never whole-collection last-write-wins)', () => {
    const r = c.mergeStates(st([ev('a', 'Local only', T1)]), st([ev('b', 'Remote only', T1)]));
    assert.deepEqual(Object.keys(r.state.events).sort(), ['a', 'b']);
    assert.equal(r.needsPush, true, 'cloud lacks the local-only record');
});

test('per-record newer stamp wins on both sides; ties keep remote with no push', () => {
    let r = c.mergeStates(st([ev('a', 'Local newer', T2)]), st([ev('a', 'Remote older', T1)]));
    assert.equal(r.state.events.a.title, 'Local newer');
    assert.equal(r.needsPush, true);
    r = c.mergeStates(st([ev('a', 'Local older', T1)]), st([ev('a', 'Remote newer', T2)]));
    assert.equal(r.state.events.a.title, 'Remote newer');
    r = c.mergeStates(st([ev('a', 'Same', T1)]), st([ev('a', 'Same', T1)]));
    assert.equal(r.needsPush, false, 'equal stamps converge — no ping-pong');
});

test('a tombstone deletes on the other device only when strictly newer than the record', () => {
    let r = c.mergeStates(st([], { a: T2 }), st([ev('a', 'Edited before delete', T1)]));
    assert.equal(r.state.events.a, undefined, 'delete wins over an older edit');
    assert.equal(r.needsPush, true);
    r = c.mergeStates(st([], { a: T1 }), st([ev('a', 'Re-created after delete', T3)]));
    assert.equal(r.state.events.a.title, 'Re-created after delete', 'newer re-create/undo survives');
});

test('tombstones union across devices and old event tombstones expire after 180 days', () => {
    const old = '2026-01-01T00:00:00.000Z';
    const r = c.mergeStates(st([], { a: T1, z: old }), st([], { b: T2 }), Date.parse('2026-11-02T00:00:00.000Z'));
    assert.deepEqual(Object.keys(r.state.tombstones.events).sort(), ['a', 'b']);
});

test('settings merge as a group by explicit stamp; an unstamped fresh device never wins', () => {
    const local = st([ev('a', 'x', T1)], null, { settings: Object.assign(c.getDefaultSettings(), { weekStart: 1 }), _stamps: { settings: T2 } });
    const remote = st([ev('a', 'x', T1)], null, { settings: Object.assign(c.getDefaultSettings(), { weekStart: 0, timeFormat: '24h' }), _stamps: { settings: T1 } });
    let r = c.mergeStates(local, remote);
    assert.equal(r.state.settings.weekStart, 1);
    assert.equal(r.state.settings.timeFormat, '12h');
    const fresh = st([], null);
    r = c.mergeStates(fresh, remote);
    assert.equal(r.state.settings.timeFormat, '24h');
});

test('save guards: default state is empty, real data is not; _version is 0; integrity check', () => {
    const d = c.getDefaultState();
    assert.equal(d._version, 0);
    assert.equal(d._dataLoaded, false);
    assert.equal(c.isEmptyState(d), true, 'seed calendars alone never count as data');
    assert.equal(c.isEmptyState(st([ev('a', 'x', T1)])), false);
    assert.equal(c.isEmptyState(st([], { a: T1 })), false, 'a delete is real data that must sync');
    assert.equal(c.validateStateIntegrity(c.normalizeState(d)), true);
    assert.equal(c.validateStateIntegrity({ events: null }), false);
});

test('normalizeState repairs Firebase array/sparse shapes and strips undefined', () => {
    const raw = { events: [null, { id: 'e1', type: 'event', title: 'A', startDate: '2026-11-05', startTime: '09:00', endTime: '10:00' }], calendars: {}, settings: {} };
    const n = c.normalizeState(raw);
    assert.ok(n.events.e1);
    assert.equal(JSON.stringify(n).includes('undefined'), false);
    assert.equal(n.events.e1.endDate, '2026-11-05');
});
