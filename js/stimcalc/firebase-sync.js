// ============================================
// FIREBASE SYNC LAYER
// Firebase config, auth, save/load, realtime sync, checkpoints
// ============================================

// ============================================
// FIREBASE CONFIGURATION (Same as Dental Quest)
// ============================================

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
var localChangesSinceLastSync = false;
var lastSyncTimestamp = null;
var realtimeSyncEnabled = false;
var lastKnownTimestamp = null;
var mergeNeedsPush = false; // set by mergeRemoteState: local data survived that the cloud lacks

// ============================================
// SYNC STATUS UI
// ============================================

function updateSyncStatus(status, text) {
    const iconEl = document.getElementById('syncIcon');
    const textEl = document.getElementById('syncText');
    if (iconEl && textEl) {
        if (status === 'connected') {
            iconEl.textContent = '\u{1F7E2}';
            iconEl.style.color = '#5E8A5E';
            textEl.textContent = text || 'Synced';
            textEl.style.color = '#5E8A5E';
        } else if (status === 'syncing') {
            iconEl.textContent = '\u{1F504}';
            iconEl.style.color = '#5E7A8A';
            textEl.textContent = text || 'Syncing...';
            textEl.style.color = '#5E7A8A';
        } else if (status === 'offline') {
            iconEl.textContent = '\u{1F534}';
            iconEl.style.color = '#B85C5C';
            textEl.textContent = text || 'Offline';
            textEl.style.color = '#B85C5C';
        } else if (status === 'error') {
            iconEl.textContent = '\u26A0\uFE0F';
            iconEl.style.color = '#C4923A';
            textEl.textContent = text || 'Sync error';
            textEl.style.color = '#C4923A';
        } else {
            iconEl.textContent = '\u231B';
            iconEl.style.color = '#9C948B';
            textEl.textContent = text || 'Connecting...';
            textEl.style.color = '#2C2825';
        }
    }
    // Also update sidebar + top bar sync indicators
    scUpdateSidebarSync(status, text);
}

// Update sidebar and top bar sync status indicators (Synchro layout)
function scUpdateSidebarSync(status, text) {
    var dot = document.getElementById('scSidebarSyncDot');
    var textEl = document.getElementById('scSidebarSyncText');
    var topDot = document.getElementById('scTopBarSyncDot');
    var topText = document.getElementById('scTopBarSyncText');

    [dot, topDot].forEach(function(d) {
        if (!d) return;
        d.classList.remove('syncing', 'offline', 'error');
        if (status === 'syncing') d.classList.add('syncing');
        else if (status === 'offline') d.classList.add('offline');
        else if (status === 'error') d.classList.add('error');
        // 'connected' = no extra class = default green
    });

    if (textEl) {
        textEl.textContent = text || (status === 'connected' ? 'Connected' :
            status === 'syncing' ? 'Syncing...' :
            status === 'offline' ? 'Offline' :
            status === 'error' ? 'Error' : '');
    }
    if (topText) {
        topText.textContent = text || (status === 'connected' ? 'Synced' :
            status === 'syncing' ? 'Syncing...' :
            status === 'offline' ? 'Offline' :
            status === 'error' ? 'Error' : '');
    }
}

// ============================================
// MERGE UTILITIES
// ============================================

// Track local changes for conflict detection
function markLocalChange() {
    localChangesSinceLastSync = true;
}

// ============================================
// === SYNC MERGE ENGINE (pure) ===
// Per-record newer-wins union merge + tombstone deletes + group stamps.
// Replaces the old whole-snapshot remote-wins rebuild (sync audit RC1/RC6/RC7).
// Keep this region framework-free: the replay harness
// (scripts/stimcalc-sync-replay.mjs) extracts everything between the
// SYNC MERGE ENGINE sentinels and runs it through real merge scenarios.
// ============================================

// A record's edit stamp. Collections stamp `updatedAt` at CRUD sites;
// history + sleepDailyLogs predate the engine and carry `lastUpdated`.
function getRecStamp(rec) {
    if (!rec || typeof rec !== 'object') return null;
    return rec.updatedAt || rec.lastUpdated || null;
}

// Union two tombstone maps (id -> deletion ISO timestamp), newest per key.
function mergeTombstoneMap(local, remote) {
    const out = Object.assign({}, local || {});
    Object.keys(remote || {}).forEach(k => {
        if (!out[k] || remote[k] > out[k]) out[k] = remote[k];
    });
    return out;
}

// Per-record newer-wins UNION of two collections:
// - one-sided records are kept (no more whole-collection last-write-wins);
// - id on both sides: strict-> newer stamp wins, ties/unstamped keep remote
//   (legacy behavior — prevents ping-pong);
// - a tombstone purges a record ONLY when strictly newer than the record's
//   own stamp, so re-add-after-delete survives; unstamped records lose to it.
// needsPush = the cloud is missing something we kept (local-only record,
// newer-local copy, or a purge of a record the cloud still holds).
function mergeCollection(local, remote, tombstones) {
    const loc = local || {};
    const rem = remote || {};
    const tomb = tombstones || {};
    const merged = {};
    let needsPush = false;

    Object.keys(rem).forEach(id => {
        if (rem[id] === null || rem[id] === undefined) return;
        merged[id] = rem[id];
    });

    Object.keys(loc).forEach(id => {
        if (loc[id] === null || loc[id] === undefined) return;
        if (!(id in merged)) {
            merged[id] = loc[id];
            needsPush = true;
            return;
        }
        const ls = getRecStamp(loc[id]);
        const rs = getRecStamp(merged[id]);
        if (ls && (!rs || ls > rs)) {
            merged[id] = loc[id];
            needsPush = true;
        }
    });

    Object.keys(tomb).forEach(id => {
        if (!(id in merged)) return;
        const rs = getRecStamp(merged[id]);
        if (!rs || tomb[id] > rs) {
            delete merged[id];
            if (id in rem) needsPush = true; // cloud still holds it — push the purge
        }
    });

    return { merged: merged, needsPush: needsPush };
}

// Stable stringify (sorted keys) so semantically-equal objects hash equal.
function stableSig(obj) {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableSig).join(',') + ']';
    return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + stableSig(obj[k])).join(',') + '}';
}

// The 6 stamped scalar groups. dayScalars bundles the loose top-level fields.
function getStampGroups(st) {
    return {
        dayScalars: { wakeTime: st.wakeTime, hoursSleptLastNight: st.hoursSleptLastNight, allNighterMode: st.allNighterMode },
        modifiers: st.modifiers,
        settings: st.settings,
        calibration: st.calibration,
        workoutPlan: st.workoutPlan,
        nicotine: st.nicotine
    };
}

// Called from BOTH save paths after the guards: bump a group's stamp ONLY
// when its content signature actually changed, so a no-op save can't claim
// "newer" and revert another device's edit.
function updateGroupStamps() {
    if (!state._stamps) state._stamps = {};
    if (!state._stampSigs) state._stampSigs = {};
    const groups = getStampGroups(state);
    const nowIso = new Date().toISOString();
    Object.keys(groups).forEach(g => {
        const sig = stableSig(groups[g]);
        if (state._stampSigs[g] !== sig) {
            state._stampSigs[g] = sig;
            state._stamps[g] = nowIso;
        }
    });
}

// After a merge, re-baseline signatures to the merged content so the next
// save only bumps a group stamp on a REAL local edit.
function reseedStampSigs() {
    if (!state._stampSigs) state._stampSigs = {};
    const groups = getStampGroups(state);
    Object.keys(groups).forEach(g => {
        state._stampSigs[g] = stableSig(groups[g]);
    });
}

// Retention caps — deliberate, documented limits applied on the merged union
// so both devices converge to the same caps (no prune-then-push loss, no
// resurrection ping-pong): history + sleepDailyLogs 180d, sleepHistory 365d,
// tombstones 60d. Mirrors the loadState() localStorage prunes.
function applyRetentionCaps(st) {
    const yearAgo = new Date();
    yearAgo.setDate(yearAgo.getDate() - 365);
    const yearCutoff = getLocalDateString(yearAgo);
    const halfYearAgo = new Date();
    halfYearAgo.setDate(halfYearAgo.getDate() - 180);
    const halfYearCutoff = getLocalDateString(halfYearAgo);
    const tombAgo = new Date();
    tombAgo.setDate(tombAgo.getDate() - 60);
    const tombCutoff = tombAgo.toISOString();

    Object.keys(st.sleepHistory || {}).forEach(d => { if (d < yearCutoff) delete st.sleepHistory[d]; });
    Object.keys(st.sleepDailyLogs || {}).forEach(d => { if (d < halfYearCutoff) delete st.sleepDailyLogs[d]; });
    Object.keys(st.history || {}).forEach(id => {
        const e = st.history[id];
        if (e && e.date && e.date < halfYearCutoff) delete st.history[id];
    });
    Object.keys(st.tombstones || {}).forEach(mapName => {
        const map = st.tombstones[mapName] || {};
        Object.keys(map).forEach(k => { if (map[k] < tombCutoff) delete map[k]; });
    });
}

// Merge a remote snapshot into local state. Used by loadFromFirebase(),
// setupRealtimeSync(), the visibilitychange 'visible' handler, and
// forceCloudSync(). Sets mergeNeedsPush when local data survived that the
// cloud doesn't have — the caller schedules a fully-guarded push of the union.
function mergeRemoteState(remoteData) {
    mergeNeedsPush = false;
    if (!remoteData) return;
    const remote = remoteData.state || remoteData;

    let needsPush = false;

    // Tombstone union first — collection purges below use both sides' deletes
    const localTombs = state.tombstones || {};
    const remoteTombs = remote.tombstones || {};
    const tombstones = {
        meds: mergeTombstoneMap(localTombs.meds, remoteTombs.meds),
        caffeine: mergeTombstoneMap(localTombs.caffeine, remoteTombs.caffeine),
        sleepDays: mergeTombstoneMap(localTombs.sleepDays, remoteTombs.sleepDays)
    };

    // Collections: per-record strict-> newer-wins union + tombstone purge
    // (history has no user-facing delete — no tombstone map for it)
    const meds = mergeCollection(migrateArrayToObject(state.medications || {}, 'med'),
        migrateArrayToObject(remote.medications || {}, 'med'), tombstones.meds);
    const caff = mergeCollection(migrateArrayToObject(state.caffeine || {}, 'caf'),
        migrateArrayToObject(remote.caffeine || {}, 'caf'), tombstones.caffeine);
    const hist = mergeCollection(migrateArrayToObject(state.history || {}, 'hist'),
        migrateArrayToObject(remote.history || {}, 'hist'), {});
    const sleepHist = mergeCollection(state.sleepHistory, remote.sleepHistory, tombstones.sleepDays);
    const sleepLogs = mergeCollection(state.sleepDailyLogs, remote.sleepDailyLogs, tombstones.sleepDays);
    needsPush = meds.needsPush || caff.needsPush || hist.needsPush
        || sleepHist.needsPush || sleepLogs.needsPush;

    // Scalar groups: a strictly-newer local stamp keeps the whole local group;
    // otherwise remote-wins spread (legacy behavior for unstamped/tied stamps).
    const localStamps = state._stamps || {};
    const remoteStamps = remote._stamps || {};
    const stamps = {};
    const keepLocal = {};
    ['dayScalars', 'modifiers', 'settings', 'calibration', 'workoutPlan', 'nicotine'].forEach(g => {
        const ls = localStamps[g] || null;
        const rs = remoteStamps[g] || null;
        keepLocal[g] = !!(ls && (!rs || ls > rs));
        stamps[g] = keepLocal[g] ? ls : (rs || ls || null);
        if (keepLocal[g]) needsPush = true; // cloud lacks our newer group
    });

    state = {
        wakeTime: keepLocal.dayScalars ? state.wakeTime : (remote.wakeTime || state.wakeTime),
        hoursSleptLastNight: keepLocal.dayScalars ? state.hoursSleptLastNight
            : (remote.hoursSleptLastNight !== undefined ? remote.hoursSleptLastNight : state.hoursSleptLastNight),
        allNighterMode: keepLocal.dayScalars ? state.allNighterMode
            : (remote.allNighterMode !== undefined ? remote.allNighterMode : state.allNighterMode),
        // OBJECTS with ID keys (migrated from arrays to prevent Firebase corruption)
        medications: meds.merged,
        caffeine: caff.merged,
        history: hist.merged,
        modifiers: keepLocal.modifiers ? state.modifiers : { ...state.modifiers, ...(remote.modifiers || {}) },
        settings: keepLocal.settings ? state.settings : { ...state.settings, ...(remote.settings || {}) },
        calibration: keepLocal.calibration ? state.calibration
            : Object.assign({}, getDefaultState().calibration, state.calibration || {}, (remote.calibration || {})),
        sleepHistory: sleepHist.merged,
        sleepDailyLogs: sleepLogs.merged,
        workoutPlan: keepLocal.workoutPlan ? state.workoutPlan : { ...state.workoutPlan, ...(remote.workoutPlan || {}) },
        nicotine: keepLocal.nicotine ? state.nicotine : { ...state.nicotine, ...(remote.nicotine || {}) },
        tombstones: tombstones,
        _stamps: stamps,
        _stampSigs: state._stampSigs || {},
        // _version is cosmetic (checkpoint labels) — normalize, don't ratchet off one side
        _version: Math.max(state._version || 0, remote._version || 0) + 1,
        _lastModified: (state._lastModified && (!remote._lastModified || state._lastModified > remote._lastModified))
            ? state._lastModified : (remote._lastModified || null),
        _sleepDailyLogsMigrated: remote._sleepDailyLogsMigrated || state._sleepDailyLogsMigrated || false,
        _sleepDailyLogsMigratedV2: remote._sleepDailyLogsMigratedV2 || state._sleepDailyLogsMigratedV2 || false,
        _sleepDailyLogsMigratedV3: remote._sleepDailyLogsMigratedV3 || state._sleepDailyLogsMigratedV3 || false
    };

    // Legacy modifier migration (runs after remote state is merged in)
    migrateHeavyLiftToWorkout();

    applyRetentionCaps(state);
    reseedStampSigs();

    // CRITICAL: Always preserve _dataLoaded
    state._dataLoaded = true;

    mergeNeedsPush = needsPush;
}
// === END SYNC MERGE ENGINE ===

// ============================================
// FIREBASE INITIALIZATION & AUTH
// ============================================

function initFirebase() {
    // FALLBACK: Ensure app works within 3 seconds even if Firebase is slow
    const fallbackTimer = setTimeout(() => {
        if (!firebaseSyncEnabled) {
            console.warn('\u26A0\uFE0F Firebase timeout - running in offline mode');
            updateSyncStatus('offline', 'Offline mode');
        }
    }, 3000);

    try {
        // Check if Firebase SDK loaded
        if (typeof firebase === 'undefined') {
            console.warn('\u26A0\uFE0F Firebase SDK not loaded - running in offline mode');
            clearTimeout(fallbackTimer);
            firebaseSyncEnabled = false;
            updateSyncStatus('offline', 'Offline mode');
            return;
        }

        // Initialize Firebase app if not already done
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();
        firebaseInitialized = true;
        clearTimeout(fallbackTimer);

        // Monitor Firebase connection state
        database.ref('.info/connected').on('value', (snapshot) => {
            const connected = snapshot.val() === true;
            if (connected) {
                if (firebaseSyncEnabled) {
                    updateSyncStatus('connected', 'Connected');
                }
            } else {
                updateSyncStatus('offline', 'Offline');
            }
        });

        // Check for saved PIN (same as Dental Quest uses)
        const savedPin = localStorage.getItem('dentalQuestPin');

        if (savedPin) {
            setupUserAuth(savedPin);
        } else {
            // No PIN - prompt user
            setTimeout(() => promptForPin(), 500);
        }
    } catch (error) {
        console.error('\u274C Firebase init error:', error);
        clearTimeout(fallbackTimer);
        firebaseSyncEnabled = false;
        updateSyncStatus('error', 'Init failed');
    }
}

function setupUserAuth(pin) {
    // Use the same user ID format as Dental Quest
    const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');
    currentUser = { uid: hashedPin };
    userPath = 'users/' + hashedPin + '/stimulantCalculator';
    firebaseSyncEnabled = true;
    pinValidated = true;  // CRITICAL: Mark PIN as validated before any saves

    updateSyncStatus('syncing', 'Syncing...');

    // Load from Firebase
    loadFromFirebase();
}

function promptForPin() {
    // Check if we're already showing prompt
    if (document.getElementById('pinPromptOverlay')) return;

    // Create a nicer prompt overlay
    const overlay = document.createElement('div');
    overlay.id = 'pinPromptOverlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 10000;';

    // NOTE: This innerHTML uses only static strings — no user input
    overlay.innerHTML = `
        <div style="background: #FFFFFF; padding: 30px; border-radius: 16px; max-width: 400px; text-align: center; color: #2C2825;">
            <h3 style="margin-bottom: 15px;">\u{1F510} Enter Your PIN</h3>
            <p style="color: #6B635B; margin-bottom: 20px; font-size: 0.9em;">Use the same PIN as your main app to sync across devices.</p>
            <input type="text" id="pinInput" placeholder="Enter PIN" style="width: 100%; padding: 12px; border-radius: 8px; border: 2px solid #8A9A7B; background: #F5F2ED; color: #2C2825; font-size: 1.1em; text-align: center; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px;">
                <button onclick="skipPin()" style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: #EFECE6; color: #6B635B; cursor: pointer;">Skip (Local Only)</button>
                <button onclick="submitPin()" style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: #6B7C5E; color: white; cursor: pointer; font-weight: 600;">Connect</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Focus the input
    setTimeout(() => {
        const input = document.getElementById('pinInput');
        if (input) {
            input.focus();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitPin();
            });
        }
    }, 100);
}

function submitPin() {
    const input = document.getElementById('pinInput');
    const pin = input ? input.value.trim() : '';

    if (pin) {
        localStorage.setItem('dentalQuestPin', pin);
        setupUserAuth(pin);
        showToast('\u2705 Connected with PIN!');
    } else {
        showToast('Please enter a PIN');
        return;
    }

    // Remove overlay
    const overlay = document.getElementById('pinPromptOverlay');
    if (overlay) overlay.remove();
}

function skipPin() {
    firebaseSyncEnabled = false;
    pinValidated = true;
    hasLoadedFromCloud = true;
    isInitialLoad = false;
    state._dataLoaded = true;
    updateSyncStatus('offline', 'Local only');
    showToast('Using offline mode');

    // Remove overlay
    const overlay = document.getElementById('pinPromptOverlay');
    if (overlay) overlay.remove();
}

// ============================================
// FIREBASE PERSISTENCE
// ============================================

function saveToFirebase() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        return;
    }

    // ============================================
    // SYNC PROTECTION GUARDS - PREVENTS DATA WIPE
    // ============================================
    // Bug 14: full 5-guard set (was missing pinValidated + _dataLoaded)
    if (!pinValidated) {
        console.warn('\u26A0\uFE0F BLOCKED: Firebase save attempted before PIN validation');
        return false;
    }
    if (isInitialLoad) {
        console.warn('\u26A0\uFE0F BLOCKED: Firebase save attempted during initial load');
        return;
    }
    if (!hasLoadedFromCloud) {
        console.warn('\u26A0\uFE0F BLOCKED: Firebase save attempted before cloud load');
        return;
    }
    if (isEmptyState(state)) {
        console.warn('\u26A0\uFE0F BLOCKED: Refusing to save empty state to Firebase');
        return;
    }
    if (!state._dataLoaded) {
        console.warn('\u26A0\uFE0F BLOCKED: Firebase save attempted before data loaded');
        return false;
    }

    const saveTime = new Date().toISOString();
    lastKnownTimestamp = saveTime; // Track our own save to ignore in real-time listener

    // Clear the pending-push flag BEFORE the async write — an edit landing
    // mid-flight re-sets it (and per-record stamps protect it in any merge).
    // Restored on failure so the 'hidden'/'visible' retry paths still fire.
    localChangesSinceLastSync = false;

    // Save to Firebase
    database.ref(userPath).set({
        state: state,
        lastUpdated: saveTime
    })
    .then(() => {
        updateSyncStatus('connected', 'Saved \u2713');
    })
    .catch(error => {
        console.error('\u274C Firebase save error:', error);
        localChangesSinceLastSync = true; // push still pending — hide/visible handlers retry
        // Don't show error status, data is still saved locally
    });
}

function loadFromFirebase() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        updateSyncStatus('offline', 'Not connected');
        return;
    }


    database.ref(userPath).once('value')
        .then(snapshot => {
            const data = snapshot.val();

            if (data && data.state) {
                // ALWAYS merge — per-record + group stamps keep any newer local
                // work inside the union. The old "local newer -> skip cloud" path
                // clobbered cloud-only records (sync audit RC1).
                if (data.lastUpdated) lastKnownTimestamp = data.lastUpdated;
                mergeRemoteState(data.state);

                // Bug 11 (reload half): re-clean stale meds a cloud merge may have
                // reintroduced (cleanupOldMedications ran in init() before this load).
                if (typeof cleanupOldMedications === 'function') cleanupOldMedications();

                // Save merged state to localStorage
                safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));

                // Re-render everything
                document.getElementById('wakeTime').value = state.wakeTime;
                document.getElementById('hoursSlept').value = state.hoursSleptLastNight;
                document.getElementById('ampHalfLife').value = state.settings.ampHalfLife;
                document.getElementById('sleepThreshold').value = state.settings.sleepThreshold;
                document.getElementById('caffHalfLife').value = state.settings.caffHalfLife;
                document.getElementById('caffThreshold').value = state.settings.caffThreshold;
                document.getElementById('weight').value = state.settings.weight;

                renderMedEntries();
                renderCaffeineEntries();
                renderSleepIntelligence();

                // Restore modifier checkbox states + time rows
                restoreModifierUI();

                // FIX: Restore allNighterMode UI
                updateAllNighterUI();
                renderGhostLoad();

                recalculate();

                // Also update Focus Mode if active
                if (focusMode) {
                    renderFocusMode();
                }

                updateSyncStatus('connected', 'Synced \u2713');
                showToast('\u2601\uFE0F Synced from cloud');
            } else {
                // No Firebase data - check if we have local data
                const hasLocalData = hasRealData(state);
                state._dataLoaded = true;  // Allow saves after user starts entering data
                if (hasLocalData) {
                    // Cloud is empty but local has real data — push it up (deferred
                    // + fully guarded; isInitialLoad flips false below, before this fires)
                    setTimeout(() => { markLocalChange(); saveToFirebase(); }, 600);
                }
                updateSyncStatus('connected', 'Connected');
            }

            // Mark that we've loaded from cloud (even if empty)
            hasLoadedFromCloud = true;

            // Bug 13: seed the conflict-check baseline so forceCloudSync()'s
            // (localChangesSinceLastSync && lastSyncTimestamp) check is live.
            lastSyncTimestamp = Date.now();
            localChangesSinceLastSync = false;

            // Set up real-time listener for changes from other devices
            setupRealtimeSync();

            // NOW we can allow saves
            isInitialLoad = false;

            // Local had records the cloud lacked — push the merged union up
            // (deferred + fully guarded; strict-> stamps guarantee termination)
            if (mergeNeedsPush) {
                mergeNeedsPush = false;
                setTimeout(() => { markLocalChange(); saveToFirebase(); }, 600);
            }

            // Sully OS: drain any Command Center messages relayed to this app and
            // attach the realtime listener (runs only after load is complete).
            if (typeof SullyOS !== 'undefined' && SullyOS.onLoadComplete) {
                try { SullyOS.onLoadComplete(); } catch (e) { console.error('SullyOS drain failed:', e); }
            }
        })
        .catch(error => {
            console.error('\u274C Firebase load error:', error);
            updateSyncStatus('error', 'Load failed');

            // If we have local data, use it
            const hasLocalData = hasRealData(state);
            if (hasLocalData) {
                state._dataLoaded = true;
                hasLoadedFromCloud = true;  // Allow saves with local data
                isInitialLoad = false;
            }
        });
}

// ============================================
// REALTIME SYNC
// ============================================

// Bug 12: write a field only when the user isn't actively typing in it, so a
// remote realtime update can't clobber an input mid-edit.
function setIfNotFocused(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (document.activeElement === el) return; // user is typing here — don't clobber
    el.value = val;
}

function setupRealtimeSync() {
    if (realtimeSyncEnabled || !database || !userPath) return;
    realtimeSyncEnabled = true;


    let isFirstLoad = true;

    database.ref(userPath).on('value', snapshot => {
        // Skip the first callback (it's the initial load we already handled)
        if (isFirstLoad) {
            isFirstLoad = false;
            const data = snapshot.val();
            if (data && data.lastUpdated) {
                lastKnownTimestamp = data.lastUpdated;
            }
            return;
        }

        // Skip during initial load (we handle this separately)
        if (isInitialLoad) {
            return;
        }

        const data = snapshot.val();

        // Skip if cloud data is empty
        if (!data || !data.state || isEmptyState(data.state)) {
            return;
        }

        if (data && data.state && data.lastUpdated) {
            // Only process if this is a NEW update (different timestamp)
            if (data.lastUpdated === lastKnownTimestamp) {
                return;
            }

            lastKnownTimestamp = data.lastUpdated;

            // ALWAYS merge — record/group stamps protect unpushed local edits.
            // (The old "local newer -> skip" left a deaf window that permanently
            // dropped remote saves; sync audit RC5.)
            mergeRemoteState(data.state);

            // Bug 11 (reload half): drop stale meds a merge may have reintroduced.
            if (typeof cleanupOldMedications === 'function') cleanupOldMedications();

            // Update localStorage
            safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));

            // Re-render both Full View and Focus Mode lists (Bug 12: don't clobber focused inputs)
            setIfNotFocused('wakeTime', state.wakeTime);
            setIfNotFocused('hoursSlept', state.hoursSleptLastNight);
            const active = document.activeElement;
            const editingEntries = active && active.closest && (active.closest('#medEntries') || active.closest('#caffeineEntries'));
            if (!editingEntries) { renderMedEntries(); renderCaffeineEntries(); }
            renderFocusCaffeineList(); // FIX: Also sync Focus Mode caffeine list
            renderSleepIntelligence();

            // Restore modifier checkbox states + time rows
            restoreModifierUI();

            // FIX: Restore allNighterMode UI
            updateAllNighterUI();
            renderGhostLoad();

            recalculate();

            // Newer/local-only records survived the merge — push the union up
            // (deferred + fully guarded; our own save's echo is timestamp-suppressed)
            if (mergeNeedsPush) {
                mergeNeedsPush = false;
                setTimeout(() => { markLocalChange(); saveToFirebase(); }, 600);
            }

            // Also update Focus Mode if active
            if (focusMode) {
                renderFocusMode();
            }

            updateSyncStatus('connected', '\u{1F504} Updated');
            showToast('\u{1F4E5} Synced from another device');
        }
    });
}

// ============================================
// MANUAL SYNC
// ============================================

function forceCloudSync() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        showToast('\u274C Not connected to cloud');
        updateSyncStatus('offline', 'Not connected');
        return;
    }

    updateSyncStatus('syncing', 'Fetching...');

    database.ref(userPath).once('value')
        .then(snapshot => {
            const data = snapshot.val();
            if (!data || !data.state) {
                showToast('No cloud data found');
                updateSyncStatus('connected', 'No cloud data');
                return;
            }

            // Merge — the stamp/tombstone engine resolves conflicts (the old
            // conflict-modal path is gone), then push the union and any stuck
            // pending local edits back up.
            const hadPendingLocal = localChangesSinceLastSync;
            if (data.lastUpdated) lastKnownTimestamp = data.lastUpdated;
            mergeRemoteState(data.state);
            safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
            renderAll();
            if (mergeNeedsPush || hadPendingLocal) {
                mergeNeedsPush = false;
                markLocalChange();
                saveToFirebase();
            }
            lastSyncTimestamp = Date.now();
            updateSyncStatus('connected', 'Synced \u2713');
            showToast('\u2705 Synced from cloud');
        })
        .catch(err => {
            console.error('Force sync failed:', err);
            updateSyncStatus('error', 'Sync failed');
            showToast('\u274C Sync failed: ' + err.message);
        });
}

// ============================================
// CHECKPOINT SYSTEM - MANUAL BACKUP/RESTORE
// ============================================

function createCheckpoint(name = null) {
    const timestamp = new Date().toISOString();
    const checkpointName = name || `Checkpoint ${new Date().toLocaleString()}`;

    const checkpoint = {
        name: checkpointName,
        timestamp: timestamp,
        state: JSON.parse(JSON.stringify(state)),
        source: 'manual'
    };

    // Get existing checkpoints
    let checkpoints = JSON.parse(localStorage.getItem('stimCalcCheckpoints') || '[]');

    // Add new checkpoint at the beginning
    checkpoints.unshift(checkpoint);

    // Keep only last 5 checkpoints
    if (checkpoints.length > 5) {
        checkpoints = checkpoints.slice(0, 5);
    }

    safeLocalStorageSet('stimCalcCheckpoints', JSON.stringify(checkpoints));
    showToast('\u2705 Checkpoint created: ' + checkpointName);
    return checkpoint;
}

function showCheckpointManager() {
    const checkpoints = JSON.parse(localStorage.getItem('stimCalcCheckpoints') || '[]');

    let checkpointListHTML = '';
    if (checkpoints.length === 0) {
        checkpointListHTML = '<p style="color: #9C948B; text-align: center;">No checkpoints saved yet</p>';
    } else {
        checkpointListHTML = checkpoints.map((cp, index) => {
            const date = new Date(cp.timestamp);
            const meds = cp.state?.medications ? Object.keys(cp.state.medications).length : 0;
            const caffeine = cp.state?.caffeine ? Object.keys(cp.state.caffeine).length : 0;
            return `
                <div class="checkpoint-item">
                    <div class="checkpoint-info">
                        <div class="checkpoint-name">${escapeHtml(cp.name)}</div>
                        <div class="checkpoint-meta">
                            ${date.toLocaleDateString()} ${date.toLocaleTimeString()} \u00B7
                            ${meds} meds \u00B7 ${caffeine} caffeine
                        </div>
                    </div>
                    <div class="checkpoint-actions">
                        <button onclick="restoreCheckpoint(${index})" class="restore">Restore</button>
                        <button onclick="exportCheckpoint(${index})" class="export">Export</button>
                        <button onclick="deleteCheckpoint(${index})" class="delete">\u00D7</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'checkpoint-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    // NOTE: This innerHTML uses only static strings + checkpoint data (not user input)
    modal.innerHTML = `
        <div class="modal-content checkpoint-modal" style="background: #FFFFFF; padding: 25px; border-radius: 16px; max-width: 500px; width: 90%; color: #2C2825;">
            <h2 style="margin-bottom: 15px;">\u{1F4E6} Checkpoint Manager</h2>

            <div class="checkpoint-actions-bar">
                <button onclick="createCheckpoint(); document.getElementById('checkpoint-modal')?.remove(); showCheckpointManager();" class="action-btn">\u{1F4BE} Create</button>
                <button onclick="exportAllCheckpoints()" class="action-btn">\u{1F4E4} Export All</button>
                <label class="action-btn" style="cursor: pointer; text-align: center;">
                    \u{1F4E5} Import
                    <input type="file" accept=".json" onchange="importCheckpoint(event)" style="display: none;">
                </label>
                <button onclick="importAndRestoreDirectly()" class="action-btn" style="background: #C4923A; color: white;">\u{1F504} Restore File</button>
            </div>

            <div class="checkpoint-list">
                ${checkpointListHTML}
            </div>

            <div class="force-sync-section">
                <h3>\u26A0\uFE0F Force Sync (Use with caution)</h3>
                <div class="force-sync-buttons">
                    <button onclick="forceUploadToCloud()" class="force-btn upload">
                        \u2B06\uFE0F Force Upload (Local \u2192 Cloud)
                    </button>
                    <button onclick="forcePullFromCloud()" class="force-btn download">
                        \u2B07\uFE0F Force Pull (Cloud \u2192 Local)
                    </button>
                </div>
            </div>

            <button onclick="document.getElementById('checkpoint-modal').remove()" style="width: 100%; margin-top: 15px; padding: 12px; background: #F5F2ED; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; color: #6B635B; cursor: pointer;">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function restoreCheckpoint(index) {
    const checkpoints = JSON.parse(localStorage.getItem('stimCalcCheckpoints') || '[]');
    const checkpoint = checkpoints[index];

    if (!checkpoint) {
        showToast('\u274C Checkpoint not found');
        return;
    }

    if (!confirm(`Restore checkpoint "${checkpoint.name}"?\n\nThis will replace your current data.`)) {
        return;
    }

    // Create auto-backup before restore
    createCheckpoint('Auto-backup before restore');

    // Restore state
    state = JSON.parse(JSON.stringify(checkpoint.state));
    // Bug 23: monotonic increment, not wall-clock (Date.now() looks "newest forever")
    state._version = (state._version || 0) + 1;
    state._dataLoaded = true;

    // Save to localStorage and Firebase
    safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
    saveToFirebase();

    // Refresh UI
    renderAll();

    showToast('\u2705 Restored: ' + checkpoint.name);
    document.getElementById('checkpoint-modal')?.remove();
}

function deleteCheckpoint(index) {
    if (!confirm('Delete this checkpoint?')) return;

    let checkpoints = JSON.parse(localStorage.getItem('stimCalcCheckpoints') || '[]');
    checkpoints.splice(index, 1);
    safeLocalStorageSet('stimCalcCheckpoints', JSON.stringify(checkpoints));

    showToast('\u{1F5D1}\uFE0F Checkpoint deleted');
    document.getElementById('checkpoint-modal')?.remove();
    showCheckpointManager();
}

function exportCheckpoint(index) {
    const checkpoints = JSON.parse(localStorage.getItem('stimCalcCheckpoints') || '[]');
    const checkpoint = checkpoints[index];

    if (!checkpoint) {
        showToast('\u274C Checkpoint not found');
        return;
    }

    const blob = new Blob([JSON.stringify(checkpoint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stimcalc-checkpoint-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('\u{1F4E4} Checkpoint exported');
}

function exportAllCheckpoints() {
    const checkpoints = JSON.parse(localStorage.getItem('stimCalcCheckpoints') || '[]');

    if (checkpoints.length === 0) {
        showToast('No checkpoints to export');
        return;
    }

    const exportData = {
        _format: 'checkpoint_backup_v1',
        _app: 'stimulant-elimination-calculator',
        _exportDate: new Date().toISOString(),
        currentState: JSON.parse(JSON.stringify(state)),
        checkpoints: checkpoints
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stimcalc-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('\u{1F4E4} Full backup exported');
}

// Validate stimulant-calculator data structure
function isValidAppData(data) {
    if (!data || typeof data !== 'object') return false;
    // Valid if has ANY of these stim-calc structures
    return !!(
        data.medications ||
        data.caffeine ||
        data.history ||
        data.sleepHistory ||
        data.settings ||
        data.wakeTime ||
        data.modifiers
    );
}

function importCheckpoint(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            let checkpoints = JSON.parse(localStorage.getItem('stimCalcCheckpoints') || '[]');

            // ============================================
            // FLEXIBLE FORMAT DETECTION
            // ============================================

            // Format 1: Full backup with checkpoints array
            if (imported.checkpoints && Array.isArray(imported.checkpoints)) {
                imported.checkpoints.forEach(cp => {
                    if (cp.state || cp.data) checkpoints.unshift(cp);
                });
                showToast(`\u{1F4E5} Imported ${imported.checkpoints.length} checkpoints`);
            }
            // Format 2: Single checkpoint with proper structure
            else if (imported.name && (imported.state || imported.data)) {
                checkpoints.unshift(imported);
                showToast(`\u{1F4E5} Imported checkpoint: ${imported.name}`);
            }
            // Format 3: Raw state/data export (most common user case)
            else if (isValidAppData(imported)) {
                const newCheckpoint = {
                    name: `Imported: ${file.name}`,
                    timestamp: new Date().toISOString(),
                    state: imported,
                    source: 'import'
                };
                checkpoints.unshift(newCheckpoint);
                showToast(`\u{1F4E5} Imported raw data as checkpoint`);
            }
            // Format 4: Data nested under common keys
            else if (imported.stimulantData || imported.state || imported.data || imported.appState) {
                const data = imported.stimulantData || imported.state || imported.data || imported.appState;
                if (isValidAppData(data)) {
                    const newCheckpoint = {
                        name: `Imported: ${file.name}`,
                        timestamp: new Date().toISOString(),
                        state: data,
                        source: 'import'
                    };
                    checkpoints.unshift(newCheckpoint);
                    showToast(`\u{1F4E5} Imported nested data as checkpoint`);
                } else {
                    throw new Error('Data structure not recognized');
                }
            }
            // Format 5: currentState from full backup export
            else if (imported.currentState && isValidAppData(imported.currentState)) {
                const newCheckpoint = {
                    name: `Imported: ${file.name}`,
                    timestamp: new Date().toISOString(),
                    state: imported.currentState,
                    source: 'import'
                };
                checkpoints.unshift(newCheckpoint);
                showToast(`\u{1F4E5} Imported backup as checkpoint`);
            }
            else {
                console.error('Unrecognized format. Keys found:', Object.keys(imported));
                throw new Error('Unrecognized file format. Check console for details.');
            }

            // Keep max 5 checkpoints
            checkpoints = checkpoints.slice(0, 5);
            safeLocalStorageSet('stimCalcCheckpoints', JSON.stringify(checkpoints));

            document.getElementById('checkpoint-modal')?.remove();
            showCheckpointManager();

        } catch (err) {
            console.error('Import error:', err);
            console.error('File contents preview:', e.target.result.substring(0, 500));
            showToast('\u274C Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function importAndRestoreDirectly() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            // Find the actual data
            let data = imported;
            if (imported.currentState) data = imported.currentState;
            if (imported.state) data = imported.state;
            if (imported.data) data = imported.data;
            if (imported.stimulantData) data = imported.stimulantData;
            if (imported.appState) data = imported.appState;

            if (!isValidAppData(data)) {
                showToast('\u274C No valid data found in file');
                return;
            }

            const meds = data.medications ? Object.keys(data.medications).length : 0;
            const caffeine = data.caffeine ? Object.keys(data.caffeine).length : 0;
            const confirmMsg = `Restore data from "${file.name}"?\n\n` +
                `Found: ${meds} medications, ${caffeine} caffeine entries\n\n` +
                `This will OVERWRITE your current data.\n` +
                `A backup will be created first.`;

            if (!confirm(confirmMsg)) return;

            // Create backup first
            createCheckpoint('Auto-backup before direct restore');

            // Restore
            state = {
                ...getDefaultState(),
                ...data,
                // Bug 23: monotonic increment, not wall-clock
                _version: (data._version || 0) + 1,
                _lastModified: new Date().toISOString(),
                _dataLoaded: true
            };

            // Migrate arrays to objects
            state.medications = migrateArrayToObject(state.medications, 'med');
            state.caffeine = migrateArrayToObject(state.caffeine, 'caf');
            state.history = migrateArrayToObject(state.history, 'hist');

            // Save
            safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
            saveToFirebase();

            showToast('\u2705 Data restored from file');

            // Close modal and refresh UI
            document.getElementById('checkpoint-modal')?.remove();
            renderAll();

        } catch (err) {
            console.error('Direct restore error:', err);
            showToast('\u274C Restore failed: ' + err.message);
        }
    };

    input.click();
}

// ============================================
// FORCE SYNC
// ============================================

function forceUploadToCloud() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        showToast('\u274C Not connected to cloud');
        return;
    }

    if (!confirm('\u26A0\uFE0F Force Upload\n\nThis will OVERWRITE all cloud data with your local data.\n\nAre you sure?')) {
        return;
    }

    // Create checkpoint first
    createCheckpoint('Auto-backup before force upload');

    updateSyncStatus('syncing', 'Uploading...');

    // Bug 23: monotonic increment, not wall-clock
    state._version = (state._version || 0) + 1;
    state._lastModified = new Date().toISOString();

    database.ref(userPath).set({
        state: state,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    })
    .then(() => {
        safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
        updateSyncStatus('connected', 'Force uploaded \u2713');
        showToast('\u2B06\uFE0F Force uploaded to cloud');
        document.getElementById('checkpoint-modal')?.remove();
    })
    .catch(err => {
        console.error('Force upload failed:', err);
        updateSyncStatus('error', 'Upload failed');
        showToast('\u274C Upload failed: ' + err.message);
    });
}

function forcePullFromCloud() {
    if (!firebaseSyncEnabled || !database || !userPath) {
        showToast('\u274C Not connected to cloud');
        return;
    }

    if (!confirm('\u26A0\uFE0F Force Pull\n\nThis will OVERWRITE all local data with cloud data.\n\nAre you sure?')) {
        return;
    }

    // Create checkpoint first
    createCheckpoint('Auto-backup before force pull');

    updateSyncStatus('syncing', 'Pulling...');

    database.ref(userPath).once('value')
        .then(snapshot => {
            const data = snapshot.val();

            if (!data || !data.state) {
                showToast('\u26A0\uFE0F No cloud data found');
                updateSyncStatus('connected', 'No cloud data');
                return;
            }

            const firebaseState = data.state;

            // Full overwrite - no merging
            state = {
                ...getDefaultState(),
                ...firebaseState,
                _dataLoaded: true
            };

            // Migrate any arrays to objects
            state.medications = migrateArrayToObject(state.medications, 'med');
            state.caffeine = migrateArrayToObject(state.caffeine, 'caf');
            state.history = migrateArrayToObject(state.history, 'hist');

            // Legacy modifier migration (runs after the shallow spread that can drop workout)
            migrateHeavyLiftToWorkout();

            safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));

            renderAll();
            updateSyncStatus('connected', 'Force pulled \u2713');
            showToast('\u2B07\uFE0F Pulled from cloud');
            document.getElementById('checkpoint-modal')?.remove();
        })
        .catch(err => {
            console.error('Force pull failed:', err);
            updateSyncStatus('error', 'Pull failed');
            showToast('\u274C Pull failed: ' + err.message);
        });
}

// ============================================
// RENDER ALL (used by checkpoint restore, force pull, import)
// ============================================

function renderAll() {
    document.getElementById('wakeTime').value = state.wakeTime;
    document.getElementById('hoursSlept').value = state.hoursSleptLastNight;
    document.getElementById('ampHalfLife').value = state.settings.ampHalfLife;
    document.getElementById('sleepThreshold').value = state.settings.sleepThreshold;
    document.getElementById('caffHalfLife').value = state.settings.caffHalfLife;
    document.getElementById('caffThreshold').value = state.settings.caffThreshold;
    document.getElementById('weight').value = state.settings.weight;
    safeSetValue('sleepTarget', state.settings.sleepTarget ?? 8);

    renderMedEntries();
    renderCaffeineEntries();
    renderSleepIntelligence();

    updateAllNighterUI();
    renderGhostLoad();
    recalculate();

    if (focusMode) {
        renderFocusMode();
    }
}

// ============================================
// VISIBILITY & BEFOREUNLOAD HANDLERS
// ============================================

// Handle tab visibility changes - save on hide, refresh on show - WITH GUARDS
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // Tab is being hidden — flush localStorage unconditionally (guarded),
        // but only push to Firebase when there are UNPUSHED local changes.
        // The old unconditional .set() re-uploaded stale full snapshots that
        // clobbered newer saves from other devices (sync audit RC2 — the killer).
        if (!isInitialLoad && hasLoadedFromCloud && state._dataLoaded && !isEmptyState(state)) {
            safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
            if (localChangesSinceLastSync && firebaseSyncEnabled && database && userPath) {
                if (firebaseSaveTimeout) {
                    clearTimeout(firebaseSaveTimeout);
                    firebaseSaveTimeout = null;
                }
                saveToFirebase(); // full 5-guard path; clears the pending flag itself
            }
        }
    } else if (document.visibilityState === 'visible') {
        // Sully OS: drain relayed Command Center messages on tab focus.
        if (!isInitialLoad && hasLoadedFromCloud && typeof SullyOS !== 'undefined' && SullyOS.onVisible) {
            try { SullyOS.onVisible(); } catch (e) { /* non-fatal */ }
        }
        // Tab is visible again - refresh from Firebase and MIGRATE to objects
        // GUARD: Only refresh if we've completed initial load
        if (firebaseSyncEnabled && database && userPath && !isInitialLoad) {
            database.ref(userPath).once('value')
                .then(snapshot => {
                    const data = snapshot.val();

                    const hadPendingLocal = localChangesSinceLastSync;

                    // GUARD: Skip empty cloud data (but still retry a stuck push)
                    if (!data || !data.state || isEmptyState(data.state)) {
                        if (hadPendingLocal) saveToFirebase();
                        return;
                    }

                    if (data.lastUpdated && data.lastUpdated !== lastKnownTimestamp) {
                        // Non-echo remote copy — merge (record/group stamps protect
                        // unpushed local work), persist, render, then push the union.
                        lastKnownTimestamp = data.lastUpdated;
                        mergeRemoteState(data.state);
                        safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));

                        setIfNotFocused('wakeTime', state.wakeTime);
                        setIfNotFocused('hoursSlept', state.hoursSleptLastNight);
                        renderMedEntries();
                        renderCaffeineEntries();
                        renderSleepIntelligence();
                        restoreModifierUI();
                        updateAllNighterUI();
                        renderGhostLoad();
                        recalculate();
                        if (focusMode) renderFocusMode();

                        if (mergeNeedsPush || hadPendingLocal) {
                            mergeNeedsPush = false;
                            markLocalChange();
                            saveToFirebase();
                        }
                    } else if (hadPendingLocal) {
                        // Remote is our own echo but a local push is stuck pending
                        // (debounced save killed by tab freeze) — retry it now.
                        saveToFirebase();
                    }
                })
                .catch(err => console.error('Refresh on visible failed:', err));
        }
    }
});

// Save on page unload to prevent data loss during debounce window - WITH GUARDS
window.addEventListener('beforeunload', function() {
    // Only save if we have real data and passed initial load
    if (!isInitialLoad && hasLoadedFromCloud && state._dataLoaded && !isEmptyState(state)) {
        safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
    }
});

// ============================================
// STORAGE (Local + Firebase)
// ============================================

function saveState() {
    // ============================================
    // SYNC PROTECTION GUARDS - PREVENTS DATA WIPE
    // ============================================

    // GUARD 0: Never save before PIN is validated
    if (!pinValidated) {
        console.warn('\u26A0\uFE0F BLOCKED: Save attempted before PIN validation');
        return false;
    }

    // GUARD A: Never save during initial load
    if (isInitialLoad) {
        console.warn('\u26A0\uFE0F BLOCKED: Save attempted during initial load');
        return false;
    }

    // GUARD B: Never save if we haven't loaded cloud data yet
    if (!hasLoadedFromCloud) {
        console.warn('\u26A0\uFE0F BLOCKED: Save attempted before cloud load');
        return false;
    }

    // GUARD C: Never save empty state
    if (isEmptyState(state)) {
        console.warn('\u26A0\uFE0F BLOCKED: Refusing to save empty state');
        return false;
    }

    // GUARD D: Verify we have real data loaded
    if (!state._dataLoaded) {
        console.warn('\u26A0\uFE0F BLOCKED: Data not properly loaded yet');
        return false;
    }

    // All guards passed — safe to save
    // Mark that local changes exist (for conflict detection)
    markLocalChange();

    // Stamp scalar groups whose content actually changed (signature-based —
    // a no-op save must not claim "newer" or merges would ping-pong)
    updateGroupStamps();

    // Bug 3: stamp modification time (last-write-wins on load / realtime merge)
    state._lastModified = new Date().toISOString();

    // Always save to localStorage immediately (but not too often)
    const now = Date.now();
    if (now - lastLocalSave > 500) { // Max twice per second for localStorage
        safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));
        lastLocalSave = now;
    }

    // Debounce Firebase saves - wait 2 seconds of inactivity before saving
    if (firebaseSaveTimeout) {
        clearTimeout(firebaseSaveTimeout);
    }

    firebaseSaveTimeout = setTimeout(() => {
        saveToFirebase();
    }, 2000); // Wait 2 seconds before saving to Firebase

    return true;
}

// Force immediate save (for important actions like Save & Log)
function saveStateImmediate() {
    // ============================================
    // SYNC PROTECTION GUARDS - PREVENTS DATA WIPE
    // ============================================

    // GUARD 0: Never save before PIN validation
    if (!pinValidated) {
        console.warn('\u26A0\uFE0F BLOCKED: Immediate save attempted before PIN validation');
        return false;
    }

    // GUARD A: Never save during initial load
    if (isInitialLoad) {
        console.warn('\u26A0\uFE0F BLOCKED: Immediate save attempted during initial load');
        return false;
    }

    // GUARD B: Never save if we haven't loaded cloud data yet
    if (!hasLoadedFromCloud) {
        console.warn('\u26A0\uFE0F BLOCKED: Immediate save attempted before cloud load');
        return false;
    }

    // GUARD C: Never save empty state
    if (isEmptyState(state)) {
        console.warn('\u26A0\uFE0F BLOCKED: Refusing to immediate-save empty state');
        return false;
    }

    // GUARD D: Verify we have real data loaded
    if (!state._dataLoaded) {
        console.warn('\u26A0\uFE0F BLOCKED: Data not properly loaded yet');
        return false;
    }

    // All guards passed — safe to save
    // Mark that local changes exist (for conflict detection)
    markLocalChange();

    // Stamp scalar groups whose content actually changed (signature-based —
    // a no-op save must not claim "newer" or merges would ping-pong)
    updateGroupStamps();

    // Bug 3: stamp modification time (last-write-wins on load / realtime merge)
    state._lastModified = new Date().toISOString();

    safeLocalStorageSet('stimulantCalculatorState', JSON.stringify(state));

    // Clear any pending debounced save
    if (firebaseSaveTimeout) {
        clearTimeout(firebaseSaveTimeout);
        firebaseSaveTimeout = null;
    }

    // Save to Firebase immediately
    saveToFirebase();
    return true;
}

// Legacy migration (Task 8, spec D4): the old pre-v2 threshold modifiers
// collapsed into a single `workout` chip. Ensure the workout object exists
// FIRST (force-pull's shallow { ...defaults, ...firebaseState } spread can drop
// it when old cloud data lacks the key), THEN fold a still-active legacy
// heavyLift into it as an intense session. Idempotent — safe on every load path.
function migrateHeavyLiftToWorkout() {
    if (state.modifiers && !state.modifiers.workout) {
        state.modifiers.workout = { active: false, endTime: '18:00', intense: false, date: null };
    }
    if (state.modifiers && state.modifiers.heavyLift && state.modifiers.heavyLift.active
        && state.modifiers.workout && !state.modifiers.workout.active) {
        state.modifiers.workout.active = true;
        state.modifiers.workout.intense = true;
        state.modifiers.heavyLift.active = false;
    }
}

function loadState() {
    // First load from localStorage (immediate)
    const saved = localStorage.getItem('stimulantCalculatorState');
    if (saved) {
        let loaded;
        try {
            loaded = JSON.parse(saved);
        } catch (e) {
            console.error('\u274C Failed to parse localStorage data:', e);
            return; // Don't crash - continue with defaults
        }

        // Merge with defaults to handle new fields
        state = {
            ...state,
            ...loaded,
            modifiers: {
                ...state.modifiers,
                ...(loaded.modifiers || {}),
                // Deep merge vitaminC to preserve date field
                vitaminC: {
                    ...state.modifiers.vitaminC,
                    ...(loaded.modifiers?.vitaminC || {})
                }
            },
            settings: { ...state.settings, ...(loaded.settings || {}) },
            sleepHistory: { ...state.sleepHistory, ...(loaded.sleepHistory || {}) },
            sleepDailyLogs: { ...state.sleepDailyLogs, ...(loaded.sleepDailyLogs || {}) },
            workoutPlan: { ...state.workoutPlan, ...(loaded.workoutPlan || {}) },
            nicotine: { ...state.nicotine, ...(loaded.nicotine || {}) },
            calibration: Object.assign({}, state.calibration, (loaded.calibration || {}))
        };

        // FIX: Migrate arrays to objects to prevent Firebase corruption
        state.medications = migrateArrayToObject(state.medications, 'med');
        state.caffeine = migrateArrayToObject(state.caffeine, 'caf');
        state.history = migrateArrayToObject(state.history, 'hist');

        // Sync-engine field shape guards (pre-upgrade snapshots lack these)
        if (!state.tombstones) state.tombstones = { meds: {}, caffeine: {}, sleepDays: {} };
        if (!state.tombstones.meds) state.tombstones.meds = {};
        if (!state.tombstones.caffeine) state.tombstones.caffeine = {};
        if (!state.tombstones.sleepDays) state.tombstones.sleepDays = {};
        if (!state._stamps) state._stamps = {};
        if (!state._stampSigs) state._stampSigs = {};

        // Drop corrupt dose records (non-finite dose/amount) — one NaN poisons every
        // load calculation. Tombstone them so the removal survives cross-device merges.
        Object.keys(state.medications).forEach(id => {
            const rec = state.medications[id];
            const d = Number(rec && rec.dose);
            if (!Number.isFinite(d) || d <= 0) {
                state.tombstones.meds[String(id)] = new Date().toISOString();
                delete state.medications[id];
            }
        });
        Object.keys(state.caffeine).forEach(id => {
            const rec = state.caffeine[id];
            const a = Number(rec && rec.amount);
            if (!Number.isFinite(a) || a <= 0) {
                state.tombstones.caffeine[String(id)] = new Date().toISOString();
                delete state.caffeine[id];
            }
        });

        // Clear today's entries (fresh start each day)
        const today = getLocalDateString();
        // Get most recent history entry to check date
        const historyValues = getValues(state.history);
        const lastDate = historyValues.length > 0 ? historyValues[0]?.date : null;

        // FIX: Only clear if we HAVE a history date AND it's different from today
        // Previously, empty history (undefined !== today) would clear modifiers on every reload
        if (lastDate && lastDate !== today) {
            // New day - clear entries but keep settings and history
            state.medications = {};
            state.caffeine = {};
            Object.keys(state.modifiers).forEach(k => {
                if (state.modifiers[k]) {
                    state.modifiers[k].active = false;
                }
            });
            // Reset workout plan for new day
            state.workoutPlan = {
                active: false,
                time: null,
                duration: 45,
                type: 'lifting',
                intensity: 'medium',
                fasted: false,
                coldShower: false,
                applied: false,
                adenosineBonus: 0,
                cortisolDelay: 0,
                thermalDelay: 0,
                cooldownComplete: null
            };
            // Reset nicotine for new day
            state.nicotine = {
                active: false,
                type: 'vape',
                lastHitTime: null
            };
        }

        // Clean up old sleep history entries (keep last 365 days for long-term tracking)
        // This allows chronic sleep debt calculation while preventing unbounded growth
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);
        const cutoffDate = getLocalDateString(oneYearAgo);

        Object.keys(state.sleepHistory).forEach(dateStr => {
            if (dateStr < cutoffDate) {
                delete state.sleepHistory[dateStr];
            }
        });

        // Prune old sleepDailyLogs entries (180-day retention cap — also enforced post-merge in applyRetentionCaps so devices converge)
        if (state.sleepDailyLogs) {
            var sixMonthsAgo = new Date();
            sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
            var dailyLogCutoff = getLocalDateString(sixMonthsAgo);
            Object.keys(state.sleepDailyLogs).forEach(function(dateStr) {
                if (dateStr < dailyLogCutoff) {
                    delete state.sleepDailyLogs[dateStr];
                }
            });
        }

        // Prune tombstones older than 60 days (they only need to outlive a
        // realistic device-offline window; matching records are long pruned)
        if (state.tombstones) {
            var tombCutoffDate = new Date();
            tombCutoffDate.setDate(tombCutoffDate.getDate() - 60);
            var tombCutoffIso = tombCutoffDate.toISOString();
            Object.keys(state.tombstones).forEach(function(mapName) {
                var tombMap = state.tombstones[mapName] || {};
                Object.keys(tombMap).forEach(function(k) {
                    if (tombMap[k] < tombCutoffIso) delete tombMap[k];
                });
            });
        }

        // Remove corrupted sleep history entries (null, undefined, NaN)
        Object.keys(state.sleepHistory).forEach(key => {
            const entry = state.sleepHistory[key];
            if (entry === null || entry === undefined) {
                delete state.sleepHistory[key];
            } else if (typeof entry === 'object' && (entry.hoursSlept === null || entry.hoursSlept === undefined || isNaN(Number(entry.hoursSlept)))) {
                delete state.sleepHistory[key];
            } else if (typeof entry === 'number' && isNaN(entry)) {
                delete state.sleepHistory[key];
            }
        });

        // Legacy modifier migration (runs after stored state is merged in)
        migrateHeavyLiftToWorkout();
    }

    // Firebase will load async and override if newer
}
