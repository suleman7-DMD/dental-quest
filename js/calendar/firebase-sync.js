// ============================================================================
// SULLY CALENDAR — firebase-sync.js
// Same Firebase project + PIN auth as the other 4 apps. Path:
//   users/<user_hash>/sullyCalendar = { state: {...}, lastUpdated: ISO }
// Sync model = the stim-calc engine (per-record newer-wins UNION + tombstones +
// stamped settings group). Every CRUD site stamps updatedAt; every delete writes
// a tombstone BEFORE the local write. Save guards: PIN → initial load → cloud
// load → not-empty → _dataLoaded → structural integrity.
// ============================================================================

var firebaseConfig = {
    apiKey: "AIzaSyCq0zU4Gm2kXKHDaCHzRD70p1B2NRXxKJc",
    authDomain: "dental-student-quest.firebaseapp.com",
    databaseURL: "https://dental-student-quest-default-rtdb.firebaseio.com",
    projectId: "dental-student-quest",
    storageBucket: "dental-student-quest.firebasestorage.app",
    messagingSenderId: "894381493570",
    appId: "1:894381493570:web:857d7d8fe247ef985e4cdb"
};

var firebaseInitialized = false;
var database = null;
var firebaseSyncEnabled = false;
var currentUser = null;
var userPath = null;
var userRootPath = null;
var localChangesSinceLastSync = false;
var lastKnownTimestamp = null;
var realtimeSyncEnabled = false;
var realtimeRef = null;
var mergeNeedsPush = false;
var loadAttempts = 0;
var loadRetryTimer = null;
var lastSyncStatus = { status: 'connecting', text: 'Connecting…' };

// ============================================================================
// === SYNC MERGE ENGINE (pure) ===
// [CAL-MERGE-START]

function getRecStamp(rec) {
    if (!rec || typeof rec !== 'object') return null;
    return rec.updatedAt || rec.createdAt || null;
}

// Union two tombstone maps (id -> ISO), newest per key
function mergeTombstoneMap(local, remote) {
    var out = {};
    Object.keys(local || {}).forEach(function(k) { out[k] = local[k]; });
    Object.keys(remote || {}).forEach(function(k) {
        if (!out[k] || remote[k] > out[k]) out[k] = remote[k];
    });
    return out;
}

// Per-record newer-wins UNION:
//  - one-sided records survive (never whole-collection last-write-wins)
//  - both sides: strictly-newer stamp wins; ties/unstamped keep remote (no ping-pong)
//  - a tombstone purges a record ONLY when strictly newer than the record's own
//    stamp, so re-create/restore-after-delete survives
// needsPush = after purging, the cloud lacks something we kept.
function mergeCollection(local, remote, tombstones) {
    var loc = local || {}, rem = remote || {}, tomb = tombstones || {};
    var merged = {}, keptLocal = {}, purgedFromRemote = false;
    Object.keys(rem).forEach(function(id) {
        if (rem[id] !== null && rem[id] !== undefined) merged[id] = rem[id];
    });
    Object.keys(loc).forEach(function(id) {
        if (loc[id] === null || loc[id] === undefined) return;
        if (!(id in merged)) { merged[id] = loc[id]; keptLocal[id] = true; return; }
        var ls = getRecStamp(loc[id]), rs = getRecStamp(merged[id]);
        if (ls && (!rs || ls > rs)) { merged[id] = loc[id]; keptLocal[id] = true; }
    });
    Object.keys(tomb).forEach(function(id) {
        if (!(id in merged)) return;
        var rs = getRecStamp(merged[id]);
        if (!rs || tomb[id] > rs) {
            delete merged[id];
            if (id in rem) purgedFromRemote = true;
        }
    });
    var needsPush = purgedFromRemote || Object.keys(keptLocal).some(function(id) { return id in merged; });
    return { merged: merged, needsPush: needsPush };
}

function tombstonesNeedPush(localMap, remoteMap) {
    return Object.keys(localMap || {}).some(function(k) {
        return !remoteMap || !remoteMap[k] || localMap[k] > remoteMap[k];
    });
}

// Retention: event tombstones older than 180 days are dropped (both devices converge
// to the same cap). Calendar tombstones are kept forever — they are few and they
// keep deleted seed calendars dead on fresh devices.
function applyRetentionCaps(st, nowMs) {
    var cutoff = new Date((nowMs || Date.now()) - 180 * 86400000).toISOString();
    var t = st.tombstones && st.tombstones.events;
    if (t) Object.keys(t).forEach(function(k) { if (t[k] < cutoff) delete t[k]; });
}

// Pure merge of two NORMALIZED states → { state, needsPush }
function mergeStates(local, remote, nowMs) {
    var needsPush = false;
    var lt = local.tombstones || {}, rt = remote.tombstones || {};
    var tombstones = {
        events: mergeTombstoneMap(lt.events, rt.events),
        calendars: mergeTombstoneMap(lt.calendars, rt.calendars)
    };
    if (tombstonesNeedPush(lt.events, rt.events) || tombstonesNeedPush(lt.calendars, rt.calendars)) needsPush = true;

    var evs = mergeCollection(local.events, remote.events, tombstones.events);
    var cals = mergeCollection(local.calendars, remote.calendars, tombstones.calendars);
    if (evs.needsPush || cals.needsPush) needsPush = true;

    var ls = (local._stamps || {}).settings || null;
    var rs = (remote._stamps || {}).settings || null;
    var keepLocalSettings = !!(ls && (!rs || ls > rs));
    if (keepLocalSettings) needsPush = true;

    var merged = {
        events: evs.merged,
        calendars: cals.merged,
        settings: keepLocalSettings ? local.settings : (rs ? remote.settings : (ls ? local.settings : remote.settings)),
        tombstones: tombstones,
        _stamps: {},
        _version: Math.max(local._version || 0, remote._version || 0),
        _lastModified: (local._lastModified && (!remote._lastModified || local._lastModified > remote._lastModified))
            ? local._lastModified : (remote._lastModified || null),
        _dataLoaded: true
    };
    var st = keepLocalSettings ? ls : (rs || ls);
    if (st) merged._stamps.settings = st;
    applyRetentionCaps(merged, nowMs);
    return { state: merged, needsPush: needsPush };
}

// [CAL-MERGE-END]
// === END SYNC MERGE ENGINE ===

// Merge a remote snapshot into the live state (load, realtime, visible, manual sync)
function mergeRemoteState(remoteData) {
    mergeNeedsPush = false;
    if (!remoteData) return;
    var remote = normalizeState(remoteData.state || remoteData);
    var res = mergeStates(normalizeState(state), remote);
    state = res.state;
    state._dataLoaded = true; // CRITICAL: always preserve after a merge
    mergeNeedsPush = res.needsPush;
}

// ============================================================================
// SYNC STATUS UI
// ============================================================================
function updateSyncStatus(status, text) {
    lastSyncStatus = { status: status, text: text || '' };
    var btn = document.getElementById('gcSyncBtn');
    var ic = document.getElementById('gcSyncIcon');
    var map = {
        connected: { icon: 'cloud_done', cls: 'ok', label: text || 'Synced' },
        syncing: { icon: 'cloud_sync', cls: 'busy', label: text || 'Syncing…' },
        offline: { icon: 'cloud_off', cls: 'off', label: text || 'Offline' },
        error: { icon: 'sync_problem', cls: 'err', label: text || 'Sync error' },
        local: { icon: 'cloud_off', cls: 'off', label: text || 'Local only' }
    };
    var m = map[status] || { icon: 'cloud_sync', cls: 'busy', label: text || 'Connecting…' };
    if (ic) ic.textContent = m.icon;
    if (btn) {
        btn.className = 'gc-icon-btn gc-sync ' + m.cls;
        btn.title = 'Sync: ' + m.label;
        btn.setAttribute('aria-label', 'Sync status: ' + m.label);
    }
    var detail = document.getElementById('gcSyncDetail');
    if (detail) detail.textContent = m.label;
}

function markLocalChange() { localChangesSinceLastSync = true; }

// ============================================================================
// FIREBASE INITIALIZATION & PIN AUTH (identical hash to the other apps)
// ============================================================================
function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded — running local-only');
            enterLocalOnlyMode('Offline — Firebase unavailable');
            return;
        }
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        firebaseInitialized = true;

        database.ref('.info/connected').on('value', function(snap) {
            // Only reflect connectivity after the initial load (the SDK reports
            // "disconnected" once at startup, which would mask "Loading…")
            if (!firebaseSyncEnabled || !hasLoadedFromCloud) return;
            if (snap.val() === true) updateSyncStatus('connected', 'Synced');
            else updateSyncStatus('offline', 'Offline — changes saved on this device');
        });

        var savedPin = null;
        try { savedPin = localStorage.getItem('dentalQuestPin'); } catch (e) {}
        if (savedPin) {
            setupUserAuth(savedPin);
        } else {
            awaitingPinEntry = true;
            setTimeout(promptForPin, 300);
        }
    } catch (error) {
        console.error('Firebase init error:', error);
        enterLocalOnlyMode('Sync init failed — local only');
    }
}

function hashPin(pin) {
    return 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
}

function setupUserAuth(pin) {
    var hashed;
    try { hashed = hashPin(pin); } catch (e) {
        showToast('That PIN has unsupported characters', { type: 'error' });
        awaitingPinEntry = true;
        promptForPin();
        return;
    }
    // Re-pointing at a (possibly different) user path: drop any old listener first
    if (realtimeRef) { try { realtimeRef.off(); } catch (e) {} }
    realtimeRef = null;
    realtimeSyncEnabled = false;
    currentUser = { uid: hashed };
    userRootPath = 'users/' + hashed;
    userPath = userRootPath + '/' + FIREBASE_APP_NAME;
    firebaseSyncEnabled = true;
    pinValidated = true;         // GUARD 0 satisfied
    awaitingPinEntry = false;
    // A (re)connect always re-runs the full guarded load before any cloud write
    isInitialLoad = true;
    hasLoadedFromCloud = false;
    loadAttempts = 0;
    updateSyncStatus('syncing', 'Loading from cloud…');
    loadFromFirebase();
}

function promptForPin() {
    if (document.getElementById('pinPromptOverlay')) return;
    awaitingPinEntry = true;
    var overlay = document.createElement('div');
    overlay.id = 'pinPromptOverlay';
    overlay.className = 'gc-pin-overlay';
    // Static markup only — no user input interpolated
    overlay.innerHTML =
        '<div class="gc-pin-card" role="dialog" aria-modal="true" aria-labelledby="pinTitle">' +
            '<div class="gc-pin-logo">' + icon('calendar_month') + '</div>' +
            '<h2 id="pinTitle">Sync your calendar</h2>' +
            '<p>Enter the same PIN you use in Quest, Roadmap, Sleep Calc and Body Comp to sync across devices.</p>' +
            '<input type="password" id="pinInput" inputmode="text" autocomplete="off" placeholder="PIN" aria-label="PIN">' +
            '<div class="gc-pin-actions">' +
                '<button class="gc-btn text" onclick="skipPin()">Use on this device only</button>' +
                '<button class="gc-btn filled" onclick="submitPin()">Connect</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(overlay);
    setTimeout(function() {
        var input = document.getElementById('pinInput');
        if (input) {
            input.focus();
            input.addEventListener('keydown', function(e) { if (e.key === 'Enter') submitPin(); });
        }
    }, 60);
}

function submitPin() {
    var input = document.getElementById('pinInput');
    var pin = input ? input.value.trim() : '';
    if (!pin) { showToast('Enter your PIN'); return; }
    try { hashPin(pin); } catch (e) { showToast('That PIN has unsupported characters', { type: 'error' }); return; }
    safeLocalStorageSet('dentalQuestPin', pin);
    var overlay = document.getElementById('pinPromptOverlay');
    if (overlay) overlay.remove();
    if (!firebaseInitialized) {
        initFirebase();
        return;
    }
    setupUserAuth(pin);
    showToast('Connected — syncing your calendar');
}

// Local-only mode: all guards satisfied, cloud writes impossible (sync disabled)
function skipPin() {
    var overlay = document.getElementById('pinPromptOverlay');
    if (overlay) overlay.remove();
    enterLocalOnlyMode('Local only — not syncing');
    showToast('Using this device only. Connect a PIN anytime in Settings.');
}

function enterLocalOnlyMode(label) {
    firebaseSyncEnabled = false;
    awaitingPinEntry = false;
    pinValidated = true;
    hasLoadedFromCloud = true;
    isInitialLoad = false;
    state._dataLoaded = true;
    updateSyncStatus('local', label || 'Local only');
    if (typeof renderAll === 'function') { try { renderAll(); } catch (e) { console.error(e); } }
}

function disconnectPin() {
    gcConfirm({
        title: 'Disconnect sync?',
        message: 'This device will stop syncing. Your calendar stays on this device and in the cloud.',
        okLabel: 'Disconnect'
    }).then(function(ok) {
        if (!ok) return;
        try { localStorage.removeItem('dentalQuestPin'); } catch (e) {}
        if (realtimeRef) { try { realtimeRef.off(); } catch (e) {} }
        realtimeRef = null;
        realtimeSyncEnabled = false;
        userPath = null; userRootPath = null; currentUser = null;
        enterLocalOnlyMode('Local only — not syncing');
        if (typeof clearRoadmapOverlay === 'function') clearRoadmapOverlay();
        closeModal();
        showToast('Sync disconnected');
    });
}

// ============================================================================
// SAVE PATH
// ============================================================================
function passesSaveGuards(tag) {
    if (!pinValidated) { console.warn('⚠️ BLOCKED (' + tag + '): PIN not validated'); return false; }
    if (isInitialLoad) { console.warn('⚠️ BLOCKED (' + tag + '): initial load not complete'); return false; }
    if (!hasLoadedFromCloud) { console.warn('⚠️ BLOCKED (' + tag + '): cloud load incomplete'); return false; }
    if (isEmptyState(state)) { console.warn('⚠️ BLOCKED (' + tag + '): empty state'); return false; }
    if (!state._dataLoaded) { console.warn('⚠️ BLOCKED (' + tag + '): data not loaded'); return false; }
    if (!validateStateIntegrity(state)) { console.error('⚠️ BLOCKED (' + tag + '): integrity check failed'); return false; }
    return true;
}

// Debounced, fully-guarded save. CRUD sites call persistLocal() BEFORE this
// (via commit()), so a blocked save never loses the edit.
function saveState() {
    if (!passesSaveGuards('saveState')) return false;
    markLocalChange();
    persistLocal();
    if (firebaseSaveTimeout) clearTimeout(firebaseSaveTimeout);
    firebaseSaveTimeout = setTimeout(function() {
        firebaseSaveTimeout = null;
        saveToFirebase();
    }, 600);
    return true;
}

function saveStateImmediate() {
    if (!passesSaveGuards('saveStateImmediate')) return false;
    markLocalChange();
    persistLocal();
    if (firebaseSaveTimeout) { clearTimeout(firebaseSaveTimeout); firebaseSaveTimeout = null; }
    saveToFirebase();
    return true;
}

function buildCloudPayload() {
    // JSON round-trip strips undefined (Firebase rejects it — one undefined kills the whole .set())
    var payload = JSON.parse(JSON.stringify(state));
    delete payload._dataLoaded;
    return payload;
}

function saveToFirebase() {
    if (!firebaseSyncEnabled || !database || !userPath) return;
    if (!passesSaveGuards('saveToFirebase')) return;
    var saveTime = new Date().toISOString();
    lastKnownTimestamp = saveTime; // echo suppression for our own write
    localChangesSinceLastSync = false; // re-set by any edit landing mid-flight
    updateSyncStatus('syncing', 'Saving…');
    database.ref(userPath).set({ state: buildCloudPayload(), lastUpdated: saveTime })
        .then(function() { updateSyncStatus('connected', 'Saved'); })
        .catch(function(error) {
            console.error('Firebase save error:', error);
            localChangesSinceLastSync = true; // still pending — hide/visible handlers retry
            updateSyncStatus('error', 'Save failed — kept on this device');
        });
}

function schedulePush(delay) {
    setTimeout(function() {
        if (!passesSaveGuards('schedulePush')) return;
        markLocalChange();
        saveToFirebase();
    }, delay || 600);
}

// ============================================================================
// LOAD PATH
// ============================================================================
function loadFromFirebase() {
    if (!firebaseSyncEnabled || !database || !userPath) return;
    if (loadRetryTimer) { clearTimeout(loadRetryTimer); loadRetryTimer = null; }
    loadAttempts++;
    var pathAtStart = userPath;
    database.ref(userPath).once('value')
        .then(function(snapshot) {
            if (pathAtStart !== userPath) return; // PIN changed mid-flight
            var data = snapshot.val();
            if (data && data.state && !isEmptyState(normalizeState(data.state))) {
                if (data.lastUpdated) lastKnownTimestamp = data.lastUpdated;
                // ALWAYS merge — per-record stamps keep newer local work in the union
                mergeRemoteState(data.state);
            } else {
                mergeNeedsPush = hasRealData(state); // cloud empty/poisoned → push local up
            }

            // Flags BEFORE rendering — a render error must never block saves
            state._dataLoaded = true;
            hasLoadedFromCloud = true;
            isInitialLoad = false;
            localChangesSinceLastSync = false;
            persistLocal();

            try { renderAll(); } catch (e) { console.error('Render after load failed:', e); }
            setupRealtimeSync();
            updateSyncStatus('connected', 'Synced');

            if (mergeNeedsPush) {
                mergeNeedsPush = false;
                schedulePush(600);
            }
            if (typeof refreshRoadmapOverlay === 'function') refreshRoadmapOverlay(false);
        })
        .catch(function(error) {
            console.error('Firebase load error:', error);
            // Cloud pushes stay BLOCKED (a .set() of partial local data would wipe the
            // cloud). Edits still persist to this device; retry with backoff.
            updateSyncStatus('error', 'Cloud load failed — retrying');
            var delay = Math.min(60000, 3000 * Math.pow(2, Math.min(loadAttempts, 5)));
            loadRetryTimer = setTimeout(loadFromFirebase, delay);
        });
}

// ============================================================================
// REALTIME
// ============================================================================
function setupRealtimeSync() {
    if (realtimeSyncEnabled || !database || !userPath) return;
    realtimeSyncEnabled = true;
    var isFirst = true;
    realtimeRef = database.ref(userPath);
    realtimeRef.on('value', function(snapshot) {
        var data = snapshot.val();
        if (isFirst) {
            isFirst = false;
            if (data && data.lastUpdated) lastKnownTimestamp = data.lastUpdated;
            return;
        }
        if (isInitialLoad || !hasLoadedFromCloud) return;
        if (!data || !data.state || isEmptyState(normalizeState(data.state))) return;
        if (!data.lastUpdated || data.lastUpdated === lastKnownTimestamp) return; // our own echo
        lastKnownTimestamp = data.lastUpdated;
        mergeRemoteState(data.state);
        persistLocal();
        requestRender();
        if (mergeNeedsPush) {
            mergeNeedsPush = false;
            schedulePush(600);
        }
        updateSyncStatus('connected', 'Updated from another device');
    });
}

// Defer re-render while the user is mid-drag or typing in an inline field
var pendingRemoteRender = false;
function requestRender() {
    if ((typeof dragState !== 'undefined' && dragState && dragState.active) || isUserTypingInline()) {
        pendingRemoteRender = true;
        return;
    }
    pendingRemoteRender = false;
    try { renderAll(); } catch (e) { console.error(e); }
}

function flushPendingRender() {
    if (pendingRemoteRender) requestRender();
}

function isUserTypingInline() {
    var a = document.activeElement;
    if (!a) return false;
    // Inputs inside the quick-create popover hold an unsaved draft — don't rebuild under them
    return !!(a.closest && a.closest('.gc-popover') && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'));
}

// Server-confirmed read. Firebase 9.22 answers once() AND get() on userPath from
// its LOCAL cache while the realtime listener is attached — after iOS suspends
// the Home Screen app that cache predates the sleep, and merge + push against it
// erases other devices' newer edits. A get() of an UNLISTENED path is always a
// server round trip; the server answers in order (re-listens → queued writes →
// gets), so once it returns the listener's cache matches the cloud.
function readCloudFresh(ref, timeoutMs) {
    return new Promise(function(resolve, reject) {
        var done = false;
        var timer = setTimeout(function() { if (!done) { done = true; reject(new Error('cloud did not answer — offline?')); } }, timeoutMs || 15000);
        var proceed = function() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            ref.once('value').then(resolve, reject);
        };
        // any server reply (even permission_denied) proves the round trip
        var barrier = database.ref(userRootPath + '/_syncBarrier');
        (typeof barrier.get === 'function' ? barrier.get() : barrier.once('value')).then(proceed, proceed);
    });
}

// Manual "Sync now"
function forceCloudSync() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        showToast('Not connected — add your PIN in Settings → Sync');
        return;
    }
    updateSyncStatus('syncing', 'Syncing…');
    readCloudFresh(database.ref(userPath)).then(function(snapshot) {
        var data = snapshot.val();
        var hadPending = localChangesSinceLastSync;
        if (data && data.state && !isEmptyState(normalizeState(data.state))) {
            if (data.lastUpdated) lastKnownTimestamp = data.lastUpdated;
            mergeRemoteState(data.state);
            persistLocal();
            renderAll();
        }
        if (!isInitialLoad && hasLoadedFromCloud && (mergeNeedsPush || hadPending || !data)) {
            mergeNeedsPush = false;
            markLocalChange();
            saveToFirebase();
        }
        updateSyncStatus('connected', 'Synced');
        showToast('Calendar synced');
    }).catch(function(err) {
        console.error('Sync failed:', err);
        updateSyncStatus('error', 'Sync failed');
        showToast('Sync failed: ' + (err && err.message ? err.message : 'network error'), { type: 'error' });
    });
}

// ============================================================================
// VISIBILITY + UNLOAD
// ============================================================================
// Home Screen app layer (js/home-app.js): never auto-reload onto a newer deploy
// while a change is unpushed or an event's details are open
window.homeAppBusy = function() { return localChangesSinceLastSync || (typeof activePopover !== 'undefined' && !!activePopover); };

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        if (!isInitialLoad && hasLoadedFromCloud && state._dataLoaded && !isEmptyState(state)) {
            persistLocal();
            // Push ONLY unpushed local changes — an unconditional .set() of a stale
            // snapshot on tab-hide clobbers other devices' newer saves.
            if (localChangesSinceLastSync && firebaseSyncEnabled && database && userPath) {
                if (firebaseSaveTimeout) { clearTimeout(firebaseSaveTimeout); firebaseSaveTimeout = null; }
                saveToFirebase();
            }
        }
    } else if (document.visibilityState === 'visible') {
        if (typeof onAppVisible === 'function') { try { onAppVisible(); } catch (e) {} }
        if (!firebaseSyncEnabled || !database || !userPath || isInitialLoad || !hasLoadedFromCloud) return;
        readCloudFresh(database.ref(userPath)).then(function(snapshot) {
            var data = snapshot.val();
            var hadPending = localChangesSinceLastSync;
            if (!data || !data.state || isEmptyState(normalizeState(data.state))) {
                if (hadPending) saveToFirebase();
                return;
            }
            if (data.lastUpdated && data.lastUpdated !== lastKnownTimestamp) {
                lastKnownTimestamp = data.lastUpdated;
                mergeRemoteState(data.state);
                persistLocal();
                requestRender();
                if (mergeNeedsPush || hadPending) {
                    mergeNeedsPush = false;
                    markLocalChange();
                    saveToFirebase();
                }
            } else if (hadPending) {
                saveToFirebase(); // our echo, but a debounced push died with the frozen tab
            }
        }).catch(function(err) { console.error('Refresh on visible failed:', err); });
        if (typeof refreshRoadmapOverlay === 'function') refreshRoadmapOverlay(false);
    }
});

window.addEventListener('beforeunload', function() {
    if (state && state._dataLoaded && hasRealData(state)) persistLocal();
});

// ============================================================================
// LOCAL LOAD (runs first at boot; Firebase merges on top)
// ============================================================================
function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!raw) {
        state = getDefaultState();
        return;
    }
    try {
        var parsed = JSON.parse(raw);
        var n = normalizeState(parsed);
        // A stored state with zero calendars and no calendar tombstones is a
        // pre-seed/corrupt snapshot — fall back to the seeds (deterministic ids).
        if (getCount(n.calendars) === 0 && getCount(n.tombstones.calendars) === 0) n.calendars = getDefaultCalendars();
        n._dataLoaded = false; // only a cloud load / local-only mode may confirm data
        state = n;
    } catch (e) {
        console.error('Failed to parse stored calendar:', e);
        state = getDefaultState();
    }
}

// ============================================================================
// CHECKPOINTS (localStorage only, max 5) + FORCE SYNC
// ============================================================================
function getCheckpoints() {
    try { return JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || '[]') || []; } catch (e) { return []; }
}

function createCheckpoint(name, silent) {
    var list = getCheckpoints();
    var nowMs = Date.now();
    // 60s dedup for automatic checkpoints with the same name
    if (list[0] && list[0].name === name && nowMs - new Date(list[0].timestamp).getTime() < 60000) return list[0];
    var cp = {
        name: name || ('Checkpoint ' + new Date().toLocaleString()),
        timestamp: new Date(nowMs).toISOString(),
        state: deepClone(state)
    };
    delete cp.state._dataLoaded;
    list.unshift(cp);
    if (list.length > 5) list = list.slice(0, 5);
    safeLocalStorageSet(CHECKPOINT_KEY, JSON.stringify(list));
    if (!silent) showToast('Checkpoint saved');
    return cp;
}

function showCheckpointManager() {
    var open = document.getElementById('checkpointModal');
    if (open) closeModal(open);
    var list = getCheckpoints();
    var rows = list.length ? list.map(function(cp, i) {
        var d = new Date(cp.timestamp);
        var nEv = getCount(cp.state && cp.state.events);
        var nCal = getCount(cp.state && cp.state.calendars);
        return '<div class="gc-cp-row">' +
            '<div class="gc-cp-info"><div class="gc-cp-name">' + escapeHtml(cp.name) + '</div>' +
            '<div class="gc-cp-meta">' + escapeHtml(d.toLocaleString()) + ' · ' + nEv + ' events · ' + nCal + ' calendars</div></div>' +
            '<div class="gc-cp-actions">' +
                '<button class="gc-btn tonal sm" onclick="restoreCheckpoint(' + i + ')">Restore</button>' +
                '<button class="gc-icon-btn sm" title="Download" onclick="exportCheckpoint(' + i + ')">' + icon('download') + '</button>' +
                '<button class="gc-icon-btn sm" title="Delete" onclick="deleteCheckpoint(' + i + ')">' + icon('delete') + '</button>' +
            '</div></div>';
    }).join('') : '<div class="gc-empty-sm">No checkpoints yet. Checkpoints are saved on this device only.</div>';

    openModal(
        '<div class="gc-modal-head"><h2>Backups & sync</h2><button class="gc-icon-btn" onclick="closeModal()" aria-label="Close">' + icon('close') + '</button></div>' +
        '<div class="gc-modal-body">' +
            '<div class="gc-cp-toolbar">' +
                '<button class="gc-btn tonal" onclick="createCheckpoint(\'Manual checkpoint\'); showCheckpointManager();">' + icon('bookmark_add') + 'Save checkpoint</button>' +
                '<button class="gc-btn tonal" onclick="exportAllCheckpoints()">' + icon('download') + 'Export backup</button>' +
                '<label class="gc-btn tonal">' + icon('upload_file') + 'Import backup<input type="file" accept=".json" onchange="importCheckpoint(event)" hidden></label>' +
                '<button class="gc-btn tonal" onclick="importAndRestoreDirectly()">' + icon('restore') + 'Restore from file</button>' +
            '</div>' +
            '<div class="gc-cp-list">' + rows + '</div>' +
            '<div class="gc-danger-zone"><h3>' + icon('warning') + 'Force sync (use with caution)</h3>' +
                '<p>Normal syncing is automatic. Use these only to recover from a problem — a checkpoint is saved first.</p>' +
                '<div class="gc-row-wrap">' +
                    '<button class="gc-btn outlined" onclick="forceCloudSync()">' + icon('sync') + 'Sync now</button>' +
                    '<button class="gc-btn outlined danger" onclick="forceUploadToCloud()">' + icon('cloud_upload') + 'Force upload (this device → cloud)</button>' +
                    '<button class="gc-btn outlined danger" onclick="forcePullFromCloud()">' + icon('cloud_download') + 'Force pull (cloud → this device)</button>' +
                '</div></div>' +
        '</div>', { wide: true, id: 'checkpointModal' });
}

// Restoring in a union-merge world: restored records get fresh stamps (so they win
// every merge) and records absent from the checkpoint get tombstones (so the
// deletion propagates instead of being re-unioned back from other devices).
function applyRestoredState(source, label) {
    var restored = normalizeState(source);
    var now = nowIso();
    var tomb = mergeTombstoneMap(state.tombstones.events, {});
    var tombCal = mergeTombstoneMap(state.tombstones.calendars, {});
    Object.keys(state.events).forEach(function(id) { if (!restored.events[id]) tomb[id] = now; });
    Object.keys(state.calendars).forEach(function(id) { if (!restored.calendars[id]) tombCal[id] = now; });
    Object.keys(restored.events).forEach(function(id) { restored.events[id].updatedAt = now; delete tomb[id]; });
    Object.keys(restored.calendars).forEach(function(id) { restored.calendars[id].updatedAt = now; restored.calendars[id].seeded = false; delete tombCal[id]; });
    if (getCount(restored.calendars) === 0) restored.calendars = getDefaultCalendars();
    restored.tombstones = { events: tomb, calendars: tombCal };
    restored._stamps = { settings: now };
    restored._version = (state._version || 0) + 1;
    restored._dataLoaded = true;
    restored._lastModified = now;
    state = restored;
    persistLocal();
    if (!isInitialLoad && hasLoadedFromCloud && firebaseSyncEnabled) {
        markLocalChange();
        saveToFirebase();
    }
    undoStack.length = 0;
    renderAll();
    showToast(label || 'Restored');
}

function restoreCheckpoint(index) {
    var cp = getCheckpoints()[index];
    if (!cp || !cp.state) { showToast('Checkpoint not found', { type: 'error' }); return; }
    gcConfirm({
        title: 'Restore checkpoint?',
        message: 'Replace your calendar with "' + cp.name + '"? Your current calendar is saved as a checkpoint first.',
        okLabel: 'Restore', danger: true
    }).then(function(ok) {
        if (!ok) return;
        var target = deepClone(cp.state);
        createCheckpoint('Auto-backup before restore', true);
        applyRestoredState(target, 'Restored "' + cp.name + '"');
        closeModal();
    });
}

function deleteCheckpoint(index) {
    gcConfirm({ title: 'Delete checkpoint?', okLabel: 'Delete', danger: true }).then(function(ok) {
        if (!ok) return;
        var list = getCheckpoints();
        list.splice(index, 1);
        safeLocalStorageSet(CHECKPOINT_KEY, JSON.stringify(list));
        showCheckpointManager();
    });
}

function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function exportCheckpoint(index) {
    var cp = getCheckpoints()[index];
    if (!cp) return;
    downloadFile('sully-calendar-checkpoint-' + getLocalDateString() + '.json', JSON.stringify(cp, null, 2));
}

function exportAllCheckpoints() {
    var data = {
        _format: 'checkpoint_backup_v1',
        _app: 'sully-calendar',
        _exportDate: new Date().toISOString(),
        currentState: (function() { var s = deepClone(state); delete s._dataLoaded; return s; })(),
        checkpoints: getCheckpoints()
    };
    downloadFile('sully-calendar-backup-' + getLocalDateString() + '.json', JSON.stringify(data, null, 2));
    showToast('Backup downloaded');
}

function isValidCalendarData(d) {
    return !!(d && typeof d === 'object' && (d.events || d.calendars) && !d.medications && !d.clinicalData && !d.weighIns);
}

function extractCalendarData(imported) {
    if (!imported || typeof imported !== 'object') return null;
    var candidates = [imported.currentState, imported.state, imported.data, imported.calendarData, imported];
    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        if (c && c.state && isValidCalendarData(c.state)) return c.state;
        if (isValidCalendarData(c)) return c;
    }
    return null;
}

function importCheckpoint(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var imported = JSON.parse(e.target.result);
            var list = getCheckpoints();
            if (Array.isArray(imported.checkpoints)) {
                imported.checkpoints.forEach(function(cp) { if (cp && cp.state && isValidCalendarData(cp.state)) list.unshift(cp); });
            } else {
                var data = extractCalendarData(imported);
                if (!data) throw new Error('Not a Sully Calendar backup');
                list.unshift({ name: 'Imported: ' + file.name, timestamp: new Date().toISOString(), state: data });
            }
            safeLocalStorageSet(CHECKPOINT_KEY, JSON.stringify(list.slice(0, 5)));
            showToast('Backup imported as checkpoint');
            showCheckpointManager();
        } catch (err) {
            console.error(err);
            showToast('Import failed: ' + err.message, { type: 'error' });
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function importAndRestoreDirectly() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        file.text().then(function(text) {
            var data = extractCalendarData(JSON.parse(text));
            if (!data) { showToast('No calendar data in that file', { type: 'error' }); return; }
            var n = getCount(data.events);
            gcConfirm({
                title: 'Restore from file?',
                message: 'Found ' + n + ' events in "' + file.name + '". This replaces your calendar (a checkpoint is saved first).',
                okLabel: 'Restore', danger: true
            }).then(function(ok) {
                if (!ok) return;
                createCheckpoint('Auto-backup before file restore', true);
                applyRestoredState(data, 'Restored from ' + file.name);
                closeModal();
            });
        }).catch(function(err) { showToast('Restore failed: ' + err.message, { type: 'error' }); });
    };
    input.click();
}

function forceUploadToCloud() {
    if (!firebaseSyncEnabled || !database || !userPath) { showToast('Not connected to the cloud'); return; }
    if (isInitialLoad || !hasLoadedFromCloud) { showToast('Still loading from the cloud — try again in a moment'); return; }
    gcConfirm({
        title: 'Force upload?',
        message: 'Overwrite the CLOUD copy with this device\'s calendar. Other devices will receive this version.',
        okLabel: 'Upload', danger: true
    }).then(function(ok) {
        if (!ok) return;
        createCheckpoint('Auto-backup before force upload', true);
        state._version = (state._version || 0) + 1;
        var saveTime = new Date().toISOString();
        lastKnownTimestamp = saveTime;
        updateSyncStatus('syncing', 'Uploading…');
        database.ref(userPath).set({ state: buildCloudPayload(), lastUpdated: saveTime }).then(function() {
            localChangesSinceLastSync = false;
            persistLocal();
            updateSyncStatus('connected', 'Force uploaded');
            showToast('Uploaded to cloud');
        }).catch(function(err) {
            updateSyncStatus('error', 'Upload failed');
            showToast('Upload failed: ' + err.message, { type: 'error' });
        });
    });
}

function forcePullFromCloud() {
    if (!firebaseSyncEnabled || !database || !userPath) { showToast('Not connected to the cloud'); return; }
    gcConfirm({
        title: 'Force pull?',
        message: 'Replace this device\'s calendar with the CLOUD copy (no merge). A checkpoint is saved first.',
        okLabel: 'Pull', danger: true
    }).then(function(ok) {
        if (!ok) return;
        createCheckpoint('Auto-backup before force pull', true);
        updateSyncStatus('syncing', 'Pulling…');
        readCloudFresh(database.ref(userPath)).then(function(snapshot) {
            var data = snapshot.val();
            if (!data || !data.state) { showToast('No cloud data found'); updateSyncStatus('connected', 'No cloud data'); return; }
            var n = normalizeState(data.state);
            if (getCount(n.calendars) === 0) n.calendars = getDefaultCalendars();
            n._dataLoaded = true;
            state = n;
            if (data.lastUpdated) lastKnownTimestamp = data.lastUpdated;
            hasLoadedFromCloud = true;
            isInitialLoad = false;
            localChangesSinceLastSync = false;
            persistLocal();
            undoStack.length = 0;
            renderAll();
            updateSyncStatus('connected', 'Pulled from cloud');
            showToast('Pulled from cloud');
        }).catch(function(err) {
            updateSyncStatus('error', 'Pull failed');
            showToast('Pull failed: ' + err.message, { type: 'error' });
        });
    });
}

// Read-only helper for cross-app overlays (never writes outside our own path)
function readOtherAppPath(relPath) {
    if (!database || !userRootPath) return Promise.resolve(null);
    return database.ref(userRootPath + '/' + relPath).once('value').then(function(s) { return s.val(); });
}
