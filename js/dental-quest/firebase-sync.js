/**
 * firebase-sync.js — Dental Quest: Firebase, Save/Load, Sync, Checkpoints
 *
 * This module handles ALL data persistence:
 * - Save guards (5 guards prevent data wipe)
 * - localStorage load/save
 * - Firebase init, PIN auth, load from cloud
 * - Realtime sync, visibility handler, online/offline
 * - Checkpoint system (create, restore, export, import, delete)
 * - Force upload/pull, sync conflict resolution
 *
 * Dependencies: state.js (must load first — globals, utilities, helpers)
 * Script load order: state.js -> firebase-sync.js -> [remaining modules]
 */

// ============================================
// MIGRATION: Infer urgency from existing task fields
// ============================================

function migrateTaskUrgency() {
    var taskArr = getValues(tasks);
    for (var i = 0; i < taskArr.length; i++) {
        var t = taskArr[i];
        if (!t.urgency) {
            if (t.doToday || t.triageTier === 'lockedIn') {
                t.urgency = 'eod';
            } else if (t.triageTier === 'today') {
                t.urgency = 'soon';
            } else if (t.triageTier === 'tomorrow') {
                t.urgency = 'week';
            } else {
                t.urgency = 'inbox';
            }
        }
    }
}

// ============================================
// PER-TASK CHANGE STAMPING + TOMBSTONES (Aug 2026)
// ============================================
// Whole-tree .set() saves are last-writer-wins. To make merges lossless, every
// task carries its own updatedAt stamp and deletions leave tombstones. Both
// are maintained centrally here by diffing against the last-known snapshot,
// so no CRUD call site ever needs to remember to stamp anything.

// Order-insensitive canonical JSON. Two devices build objects in different key
// order — plain JSON.stringify would report false differences and make devices
// ping-pong pushes at each other forever.
function canonicalJson(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
    var keys = Object.keys(v).filter(function(k) { return v[k] !== undefined; }).sort();
    return '{' + keys.map(function(k) { return JSON.stringify(k) + ':' + canonicalJson(v[k]); }).join(',') + '}';
}

// What a value looks like after a Firebase round-trip: null/undefined are never
// stored, and objects/arrays that end up empty are stripped from the tree
// entirely. Comparing local state against a cloud tree WITHOUT this produces
// phantom differences (local nulls vs stripped cloud) that would make devices
// push at each other forever. skipKeys drops volatile top-level keys (lastSaved).
function fbEquivalent(value, skipKeys) {
    var skip = skipKeys || [];
    function strip(v) {
        if (v === null || v === undefined) return undefined;
        if (typeof v !== 'object') return v;
        var out = {};
        Object.keys(v).forEach(function(k) {
            var sv = strip(v[k]);
            if (sv !== undefined) out[k] = sv;
        });
        return Object.keys(out).length > 0 ? out : undefined;
    }
    var root = {};
    Object.keys(value || {}).forEach(function(k) {
        if (skip.indexOf(k) !== -1) return;
        var sv = strip(value[k]);
        if (sv !== undefined) root[k] = sv;
    });
    return root;
}

// Content signature for a task, ignoring the updatedAt stamp itself
function taskContentSig(t) {
    if (!t || typeof t !== 'object') return canonicalJson(t);
    var copy = Object.assign({}, t);
    delete copy.updatedAt;
    return canonicalJson(copy);
}

// Best-known "when was this task last touched" (ms). updatedAt is
// authoritative; completedAt/createdAt cover tasks from before stamping existed.
function taskEffectiveTs(t) {
    if (!t) return 0;
    if (typeof t.updatedAt === 'number' && t.updatedAt > 0) return t.updatedAt;
    var ts = 0;
    if (t.completedAt) {
        var c = (typeof t.completedAt === 'number') ? t.completedAt : Date.parse(t.completedAt);
        if (!isNaN(c)) ts = Math.max(ts, c);
    }
    if (t.createdAt) {
        var cr = (typeof t.createdAt === 'number') ? t.createdAt : Date.parse(t.createdAt);
        if (!isNaN(cr)) ts = Math.max(ts, cr);
    }
    return ts;
}

var TOMBSTONE_RETENTION_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

// Rebuild the change-detection snapshot from current tasks. MUST be called
// after every load/merge/adopt so the next diff only sees genuine local edits.
function refreshTaskSnapshot() {
    var snap = {};
    var t = tasks || {};
    Object.keys(t).forEach(function(id) { snap[id] = taskContentSig(t[id]); });
    lastTaskSnapshot = snap;
}

// Diff tasks against the last snapshot: stamp updatedAt on changed tasks,
// tombstone tasks that disappeared. Runs inside buildSaveData — the single
// choke point every save path flows through (after all guards).
function stampTaskChanges(now) {
    if (!deletedTasks || typeof deletedTasks !== 'object') deletedTasks = {};
    var t = tasks || {};
    var nextSnap = {};
    Object.keys(t).forEach(function(id) {
        if (!t[id] || typeof t[id] !== 'object') return;
        var sig = taskContentSig(t[id]);
        if (!(id in lastTaskSnapshot)) {
            // New task (or first save this session) — ensure a stamp exists,
            // but don't re-stamp unchanged pre-existing tasks with "now"
            if (typeof t[id].updatedAt !== 'number') t[id].updatedAt = taskEffectiveTs(t[id]) || now;
        } else if (lastTaskSnapshot[id] !== sig) {
            t[id].updatedAt = now;
        }
        nextSnap[id] = taskContentSig(t[id]);
        // A live local task overrides any stale tombstone for the same id
        if (deletedTasks[id]) delete deletedTasks[id];
    });
    // Tasks present at last snapshot but gone now were deleted locally
    Object.keys(lastTaskSnapshot).forEach(function(id) {
        if (!(id in t)) deletedTasks[id] = now;
    });
    lastTaskSnapshot = nextSnap;
    // Purge ancient tombstones so the tree doesn't grow forever
    var cutoff = now - TOMBSTONE_RETENTION_MS;
    Object.keys(deletedTasks).forEach(function(id) {
        if (deletedTasks[id] < cutoff) delete deletedTasks[id];
    });
}

// ============================================
// BUILD SAVE DATA — Single source of truth for save objects
// ============================================

function buildSaveData(saveTimestamp) {
    // Central stamping: updatedAt on changed tasks, tombstones for deletions
    stampTaskChanges(saveTimestamp);
    return {
        tasks: tasks || {},
        deletedTasks: deletedTasks || {},
        stats: stats,
        medications: medications,
        calendarNotes: calendarNotes || {},
        notebook: notebook,
        financials: financials,
        pillAssignments: pillAssignments,
        calendarEvents: calendarEvents || {},
        dailyPlanner: dailyPlanner,
        focusModeData: {
            oneThingId: focusModeData.oneThingId ?? null,
            microSteps: focusModeData.microSteps || {},
            todaysTasks: focusModeData.todaysTasks || {},
            lastPlanningDate: focusModeData.lastPlanningDate ?? null
            // Don't save timer state - it's local only
        },
        commandCenterData: {
            crashOut: {
                sleepTime: commandCenterData.crashOut?.sleepTime ?? null,
                lastReset: commandCenterData.crashOut?.lastReset ?? null
            },
            focusStats: {
                totalXP: commandCenterData.focusStats?.totalXP ?? 0,
                focusStreak: commandCenterData.focusStats?.focusStreak ?? 0,
                dailyStreak: commandCenterData.focusStats?.dailyStreak ?? 0,
                lockedInStreak: commandCenterData.focusStats?.lockedInStreak ?? 0
            },
            currentSession: {
                taskId: commandCenterData.currentSession.taskId ?? null,
                checklist: commandCenterData.currentSession.checklist || {},
                timerMinutes: commandCenterData.currentSession.timerMinutes ?? 25,
                timerRemaining: commandCenterData.currentSession.timerRemaining ?? null,
                confirmedStarted: commandCenterData.currentSession.confirmedStarted ?? false,
                startedAt: commandCenterData.currentSession.startedAt ?? null
            }
        },
        lastCriticalEODReset: lastCriticalEODReset ?? null,
        _version: _version,
        _dataLoaded: true,
        lastSaved: saveTimestamp
    };
}

// ============================================
// LOAD DATA (localStorage)
// ============================================

function loadData(skipRender) {
    const saved = localStorage.getItem('dentalStudentQuestData');
    if (saved) {
        let data;
        try {
            data = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse localStorage data:', e);
            showToast('Data corrupted - starting fresh', '\u26a0\ufe0f');
            return; // Don't crash - continue with defaults
        }
        // CRITICAL: Use ensureArray() to handle Firebase array->object conversion
        tasks = migrateArrayToObject(data.tasks, 'task');
        migrateTaskUrgency();

        // Load deletion tombstones (absent in older saves)
        deletedTasks = (data.deletedTasks && typeof data.deletedTasks === 'object') ? data.deletedTasks : {};

        // Remember when this device last saved \u2014 union merges compare against it
        if (typeof data.lastSaved === 'number') {
            lastKnownSaveTime = Math.max(lastKnownSaveTime, data.lastSaved);
        }

        // Merge saved stats with default structure to handle new categories
        if (data.stats) {
            stats = {
                ...stats,
                totalXPGained: data.stats.totalXPGained || 0,
                totalTasks: data.stats.totalTasks || 0,
                categoryXPGained: {
                    ...stats.categoryXPGained,
                    ...(data.stats.categoryXPGained || data.stats.categoryXP || {})
                }
            };
        }

        // Load medication data with array protection
        if (data.medications) {
            medications = {
                ...medications,
                ...data.medications
            };
            // Ensure dosesLogged objects are proper arrays
            if (medications['30mg']) {
                medications['30mg'].dosesLogged = migrateDosesLoggedToObject(medications['30mg'].dosesLogged);
            }
            if (medications['20mg']) {
                medications['20mg'].dosesLogged = migrateDosesLoggedToObject(medications['20mg'].dosesLogged);
            }
        }

        // Load calendar notes
        if (data.calendarNotes) {
            calendarNotes = data.calendarNotes;
        }

        // Load notebook with object migration
        if (data.notebook) {
            const migratedPages = migrateArrayToObject(data.notebook.pages, 'page');
            const pageIds = Object.keys(migratedPages);
            notebook = {
                pages: migratedPages,
                currentPageId: data.notebook.currentPageId || (pageIds.length > 0 ? pageIds[0] : null)
            };
        }

        // Load financials with migration support (old->new format)
        if (data.financials) {
            financials = migrateFinancials(data.financials);
        }

        // Load pill assignments
        if (data.pillAssignments) {
            pillAssignments = {
                '30mg': data.pillAssignments['30mg'] || {},
                '20mg': data.pillAssignments['20mg'] || {}
            };
        }

        // Load calendar events with array protection
        if (data.calendarEvents) {
            calendarEvents = migrateArrayToObject(data.calendarEvents, 'event');
            // Remove past events using local timezone
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            Object.keys(calendarEvents).forEach(id => {
                const event = calendarEvents[id];
                if (!event || !event.dateStr || typeof event.dateStr !== 'string') {
                    delete calendarEvents[id];
                    return;
                }
                const [year, month, day] = event.dateStr.split('-').map(Number);
                if (isNaN(year) || isNaN(month) || isNaN(day)) {
                    delete calendarEvents[id];
                    return;
                }
                const eventDate = new Date(year, month - 1, day);
                eventDate.setHours(0, 0, 0, 0);
                if (eventDate < today) {
                    delete calendarEvents[id];
                }
            });
        }

        // Load daily planner (parity with the cloud load path — without this,
        // a merge-based boot would see defaults here and could push them up)
        if (data.dailyPlanner) {
            dailyPlanner = {
                date: data.dailyPlanner.date || null,
                goal: data.dailyPlanner.goal || '',
                bedtime: data.dailyPlanner.bedtime || '23:00',
                blocks: migrateArrayToObject(data.dailyPlanner.blocks, 'block'),
                lastReset: data.dailyPlanner.lastReset || null
            };
            try { checkPlannerReset(); } catch (e) { console.error('checkPlannerReset error:', e); }
        }

        // Load Focus Mode data with object migration for Firebase safety
        if (data.focusModeData) {
            focusModeData = {
                ...focusModeData,
                oneThingId: data.focusModeData.oneThingId || null,
                microSteps: migrateArrayToObject(data.focusModeData.microSteps, 'step'),
                todaysTasks: {
                    big: migrateTaskIdArrayToObject(data.focusModeData.todaysTasks?.big),
                    medium: migrateTaskIdArrayToObject(data.focusModeData.todaysTasks?.medium),
                    small: migrateTaskIdArrayToObject(data.focusModeData.todaysTasks?.small)
                },
                lastPlanningDate: data.focusModeData.lastPlanningDate || null
            };
        }

        // Load Command Center data
        if (data.commandCenterData) {
            commandCenterData = {
                crashOut: {
                    sleepTime: data.commandCenterData.crashOut?.sleepTime || null,
                    lastReset: data.commandCenterData.crashOut?.lastReset || null
                },
                focusStats: {
                    totalXP: data.commandCenterData.focusStats?.totalXP || 0,
                    focusStreak: data.commandCenterData.focusStats?.focusStreak || 0,
                    dailyStreak: data.commandCenterData.focusStats?.dailyStreak || 0,
                    lockedInStreak: data.commandCenterData.focusStats?.lockedInStreak || 0
                },
                currentSession: {
                    taskId: data.commandCenterData.currentSession?.taskId || null,
                    checklist: data.commandCenterData.currentSession?.checklist || {},
                    timerMinutes: data.commandCenterData.currentSession?.timerMinutes || 25,
                    timerRemaining: null,
                    confirmedStarted: data.commandCenterData.currentSession?.confirmedStarted ?? false,
                    startedAt: data.commandCenterData.currentSession?.startedAt ?? null
                }
            };
        }

        // Load last critical EOD reset date
        if (data.lastCriticalEODReset) {
            lastCriticalEODReset = data.lastCriticalEODReset;
        }

        // BUG FIX #5: Set _dataLoaded after successful localStorage load
        _dataLoaded = true;

        // Baseline the change-detection snapshot on freshly loaded tasks
        refreshTaskSnapshot();

        // skipRender: used by the merge-based Firebase boot — it loads local
        // data into memory first, merges the cloud tree in, THEN renders once
        if (skipRender) return;

        // Rendering wrapped in try/catch so errors never leave app in broken state
        try {
            updateStats();
            renderTasks();
            if (typeof renderKanbanBoard === 'function' && typeof currentViewMode !== 'undefined' && currentViewMode === 'kanban') {
                renderKanbanBoard();
            }
            updateMedicationDisplay();
            // Check and apply daily pill auto-reduce
            checkAndApplyDailyPillReduce();
        } catch (e) {
            console.error('loadData render error (saves still enabled):', e);
        }
    } else {
        // No localStorage data — still mark as loaded (defaults are valid data)
        _dataLoaded = true;
        refreshTaskSnapshot();
        if (skipRender) return;
    }
    // Check for daily reset of Critical/EOD flags — outside try/catch (non-critical)
    try {
        checkCriticalEODReset();
        initFocusMode();
    } catch (e) {
        console.error('loadData post-render error:', e);
    }
}

// ============================================
// SAVE DATA — With 5 Sync Protection Guards
// ============================================

function saveData() {
    // ============================================
    // SYNC PROTECTION GUARDS - PREVENTS DATA WIPE
    // ============================================

    // GUARD 0: Never save before PIN is validated
    if (firebaseInitialized && !pinValidated) {
        console.warn('\u26a0\ufe0f BLOCKED: Save attempted before PIN validation');
        return;
    }

    // GUARD A: Don't save to Firebase until initial load completes
    // This prevents empty data from overwriting Firebase when a new session starts
    if (firebaseInitialized && !initialLoadComplete) {
        console.warn('\u26a0\ufe0f BLOCKED: Save attempted before initial load complete');
        return; // Don't save anything yet!
    }

    // GUARD B: Never save if we haven't loaded cloud data yet
    if (firebaseInitialized && !hasLoadedFromCloud) {
        console.warn('\u26a0\ufe0f BLOCKED: Save attempted before cloud load');
        return;
    }

    // BUG FIX #3: GUARD D: Never save before data is loaded
    if (firebaseInitialized && !_dataLoaded) {
        console.warn('\u26a0\ufe0f BLOCKED: Save attempted before data loaded');
        return;
    }

    // Build data object first to check if empty
    const saveTimestamp = Date.now();

    const data = buildSaveData(saveTimestamp);

    // GUARD C: Never save empty state to Firebase
    if (firebaseInitialized && isEmptyState(data)) {
        console.warn('\u26a0\ufe0f BLOCKED: Refusing to save empty state to Firebase');
        // Still save to localStorage as it might be a legitimate clear
        try {
            safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));
        } catch (e) {
            console.error('localStorage save failed:', e);
        }
        return;
    }

    // All guards passed — safe to save
    // Mark that local changes exist (for conflict detection)
    markLocalChange();

    // Update our known save time BEFORE saving to ignore our own updates
    lastKnownSaveTime = saveTimestamp;

    // Always save to localStorage IMMEDIATELY as backup
    try {
        safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));
    } catch (e) {
        console.error('localStorage save failed:', e);
    }

    // Debounce Firebase saves to prevent rapid fire overwrites
    // This ensures the last save wins after rapid changes
    if (firebaseInitialized && currentUser && database) {
        // Clear any pending save
        if (saveDebounceTimer) {
            clearTimeout(saveDebounceTimer);
        }

        // Store the data to be saved
        pendingSaveData = data;

        // Schedule the Firebase save after 200ms of no changes
        saveDebounceTimer = setTimeout(() => {
            if (!pendingSaveData) return;

            let dataToSave = pendingSaveData;
            pendingSaveData = null;

            // Remove old indicator if exists
            const oldIndicator = document.getElementById('savingIndicator');
            if (oldIndicator) oldIndicator.remove();

            // Show saving indicator
            const savingToast = document.createElement('div');
            savingToast.id = 'savingIndicator';
            savingToast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: var(--accent); color: white; padding: 12px 20px; border-radius: 8px; z-index: 10050; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
            savingToast.textContent = '\u2601\ufe0f Syncing...';
            document.body.appendChild(savingToast);

            const pushToCloud = () => {
                // Update lastKnownSaveTime again in case it changed
                lastKnownSaveTime = dataToSave.lastSaved;
                database.ref('users/' + currentUser.uid + '/appData').set(dataToSave)
                .then(() => {
                    lastCloudContactTs = Date.now();
                    offlineSyncPending = false;
                    localStorage.removeItem('dentalQuestOfflineSyncPending');
                    savingToast.style.background = 'var(--success)';
                    savingToast.textContent = '\u2713 Synced';
                    updateSyncStatus('connected', `Saved (${new Date().toLocaleTimeString()})`);
                    setTimeout(() => {
                        if (savingToast && savingToast.parentNode) {
                            savingToast.remove();
                        }
                    }, 2000);
                })
                .catch((error) => {
                    console.error('Firebase save error:', error);
                    savingToast.style.background = 'var(--destructive)';
                    savingToast.textContent = '\u2717 Sync failed - Retrying...';
                    updateSyncStatus('error', 'Save failed - retrying...');

                    // Retry after 2 seconds
                    setTimeout(() => {
                        database.ref('users/' + currentUser.uid + '/appData').set(dataToSave)
                            .then(() => {
                                lastCloudContactTs = Date.now();
                                savingToast.style.background = 'var(--success)';
                                savingToast.textContent = '\u2713 Synced (retry)';
                                updateSyncStatus('connected', 'Saved (retry)');
                                offlineSyncPending = false;
                                localStorage.removeItem('dentalQuestOfflineSyncPending');
                                setTimeout(() => {
                                    if (savingToast && savingToast.parentNode) {
                                        savingToast.remove();
                                    }
                                }, 2000);
                            })
                            .catch(err => {
                                console.error('Retry failed:', err);
                                savingToast.textContent = '\u2717 Offline - will sync when back online';
                                updateSyncStatus('offline', 'Pending sync');
                                // Mark for sync when back online
                                offlineSyncPending = true;
                                safeLocalStorageSet('dentalQuestOfflineSyncPending', 'true');
                                setTimeout(() => {
                                    if (savingToast && savingToast.parentNode) {
                                        savingToast.remove();
                                    }
                                }, 3000);
                            });
                    }, 2000);
                });
            };

            // STALE-TAB GUARD (Aug 2026): if this tab hasn't heard from the
            // cloud in over 5 minutes (slept laptop, backgrounded phone tab),
            // another device may have saved in the meantime \u2014 pull-merge the
            // server tree first so this write can never erase newer cloud data.
            if (Date.now() - lastCloudContactTs > 300000) {
                const staleRef = database.ref('users/' + currentUser.uid + '/appData');
                const staleFetch = (typeof staleRef.get === 'function') ? staleRef.get() : staleRef.once('value');
                staleFetch.then(snapshot => {
                        const remote = snapshot.val();
                        lastCloudContactTs = Date.now();
                        if (remote && !isEmptyState(remote) && Math.abs((remote.lastSaved || 0) - lastKnownSaveTime) > 100) {
                            try {
                                mergeRemoteAppData(remote);
                                dataToSave = buildSaveData(Date.now());
                            } catch (e) {
                                console.error('Pre-push merge error (pushing local as-is):', e);
                            }
                        }
                        pushToCloud();
                    })
                    .catch(() => pushToCloud());
            } else {
                pushToCloud();
            }
        }, 200); // 200ms debounce - fast enough to feel instant
    } else {
        console.warn('\u26a0\ufe0f Firebase not ready:', {
            firebaseInitialized,
            hasUser: !!currentUser,
            hasDatabase: !!database
        });
        // Only show offline status if we're not still initializing
        if (initialLoadComplete) {
            updateSyncStatus('offline', 'Local only');
        }
    }
}

// ============================================
// SAVE DATA IMMEDIATE — BUG FIX #4: Rewritten with 5 guards
// ============================================

function saveDataImmediate() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
    }
    pendingSaveData = null;

    // ===== SAME 5 GUARDS AS saveData() =====
    // GUARD 0: Never save before PIN is validated
    if (firebaseInitialized && !pinValidated) {
        console.warn('\u26a0\ufe0f BLOCKED: Immediate save before PIN validation');
        return;
    }
    // GUARD A: Don't save before initial load
    if (firebaseInitialized && !initialLoadComplete) {
        console.warn('\u26a0\ufe0f BLOCKED: Immediate save before initial load');
        return;
    }
    // GUARD B: Never save before cloud load
    if (firebaseInitialized && !hasLoadedFromCloud) {
        console.warn('\u26a0\ufe0f BLOCKED: Immediate save before cloud load');
        return;
    }
    // GUARD D: Never save before data loaded
    if (firebaseInitialized && !_dataLoaded) {
        console.warn('\u26a0\ufe0f BLOCKED: Immediate save before data loaded');
        return;
    }

    // Mark that local changes exist (for conflict detection)
    markLocalChange();

    const saveTimestamp = Date.now();
    const data = buildSaveData(saveTimestamp);

    // GUARD C: Empty state check
    if (firebaseInitialized && isEmptyState(data)) {
        console.warn('\u26a0\ufe0f BLOCKED: Refusing to immediate-save empty state');
        return;
    }

    lastKnownSaveTime = saveTimestamp;

    // Save to localStorage
    try {
        safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));
    } catch (e) {
        console.error('localStorage save failed:', e);
    }

    // Save to Firebase immediately (no debounce)
    if (firebaseInitialized && currentUser && database) {
        const savingToast = document.createElement('div');
        savingToast.id = 'savingIndicator';
        savingToast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: var(--accent); color: white; padding: 12px 20px; border-radius: 8px; z-index: 10050; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        savingToast.textContent = '\u2601\ufe0f Saving...';
        document.body.appendChild(savingToast);

        database.ref('users/' + currentUser.uid + '/appData').set(data)
            .then(() => {
                lastCloudContactTs = Date.now();
                savingToast.style.background = 'var(--success)';
                savingToast.textContent = '\u2713 Saved!';
                setTimeout(() => savingToast.remove(), 2000);
            })
            .catch(err => {
                savingToast.style.background = 'var(--destructive)';
                savingToast.textContent = '\u2717 Save failed';
                setTimeout(() => savingToast.remove(), 3000);
            });
    }
}

// ============================================
// CHECKPOINT SYSTEM
// ============================================

// Extract data from various wrapper formats
function extractDataFromImport(imported) {
    // Direct data - return as-is
    if (isValidAppData(imported)) {
        return imported;
    }

    // Nested under common keys
    if (imported.currentState && isValidAppData(imported.currentState)) {
        return imported.currentState;
    }
    if (imported.state && isValidAppData(imported.state)) {
        return imported.state;
    }
    if (imported.data && isValidAppData(imported.data)) {
        return imported.data;
    }
    if (imported.appState && isValidAppData(imported.appState)) {
        return imported.appState;
    }
    if (imported.dentalData && isValidAppData(imported.dentalData)) {
        return imported.dentalData;
    }

    // From a checkpoint with nested structure
    if (imported.checkpoints && Array.isArray(imported.checkpoints) && imported.checkpoints.length > 0) {
        // Use the most recent checkpoint's data
        const latest = imported.checkpoints[0];
        if (latest.state && isValidAppData(latest.state)) return latest.state;
        if (latest.data && isValidAppData(latest.data)) return latest.data;
        if (isValidAppData(latest)) return latest;
    }

    return null;
}

// Cloud Checkpoint System - helper functions
function getCheckpointKey() {
    const pin = localStorage.getItem('dentalQuestPin') || 'default';
    return `dentalQuest_checkpoints_${btoa(pin).replace(/[^a-zA-Z0-9]/g, '')}`;
}

function getDataCountForCheckpoint() {
    const taskCount = getCount(tasks);
    const completedCount = getValues(tasks).filter(t => t.completed).length;
    const notebookPages = getCount(notebook.pages);
    const calendarNotesCount = Object.keys(calendarNotes || {}).length;
    const eventsCount = getCount(calendarEvents);
    return `${taskCount} tasks (${completedCount} done), ${notebookPages} notes, ${eventsCount} events`;
}

// Create Checkpoint (saves to localStorage AND Firebase)
function createCheckpoint() {
    showCustomPrompt('Checkpoint name (optional):', '', function(rawName) {
        if (rawName === null) return; // User cancelled
        const name = rawName || `Checkpoint ${new Date().toLocaleString()}`;

        const timestamp = Date.now();
        const checkpoint = {
        id: `checkpoint_${timestamp}_${Math.random().toString(36).substr(2, 6)}`,
        name: name,
        timestamp: timestamp,
        date: new Date().toISOString(),
        dataCount: getDataCountForCheckpoint(),
        appVersion: APP_VERSION,
        data: {
            tasks: JSON.parse(JSON.stringify(tasks)),
            stats: JSON.parse(JSON.stringify(stats)),
            medications: JSON.parse(JSON.stringify(medications)),
            calendarNotes: JSON.parse(JSON.stringify(calendarNotes)),
            notebook: JSON.parse(JSON.stringify(notebook)),
            financials: JSON.parse(JSON.stringify(financials)),
            pillAssignments: JSON.parse(JSON.stringify(pillAssignments)),
            calendarEvents: JSON.parse(JSON.stringify(calendarEvents)),
            dailyPlanner: JSON.parse(JSON.stringify(dailyPlanner)),
            focusModeData: {
                oneThingId: focusModeData.oneThingId,
                microSteps: JSON.parse(JSON.stringify(focusModeData.microSteps)),
                todaysTasks: JSON.parse(JSON.stringify(focusModeData.todaysTasks)),
                lastPlanningDate: focusModeData.lastPlanningDate
            },
            commandCenterData: JSON.parse(JSON.stringify(commandCenterData))
        }
    };

    // Save to localStorage
    let checkpoints = [];
    try {
        checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    } catch (e) {
        checkpoints = [];
    }
    checkpoints.unshift(checkpoint);
    // Keep max 5 checkpoints
    if (checkpoints.length > 5) {
        checkpoints.splice(5);
    }
    safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints));

    // Save to Firebase for cross-device access
    if (firebaseInitialized && currentUser && database) {
        const cloudCheckpointPath = 'users/' + currentUser.uid + '/appData/checkpoints/' + checkpoint.id;
        database.ref(cloudCheckpointPath).set(checkpoint)
            .then(() => {
                showToast(`Checkpoint saved: ${name}`, '\u2601\ufe0f');
            })
            .catch(err => {
                console.error('Failed to save checkpoint to cloud:', err);
                showToast(`Checkpoint saved locally (cloud failed)`, '\ud83d\udcbe');
            });
    } else {
        showToast(`Checkpoint saved locally: ${name}`, '\ud83d\udcbe');
    }
    }, 'Create Checkpoint'); // end showCustomPrompt callback
}

// Show Checkpoint Manager modal with local + cloud checkpoints
async function showCheckpointManager() {
    // Get local checkpoints
    let checkpoints = [];
    try {
        checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    } catch (e) {
        checkpoints = [];
    }

    // Also get cloud checkpoints for cross-device access
    if (firebaseInitialized && currentUser && database) {
        try {
            const snapshot = await database.ref('users/' + currentUser.uid + '/appData/checkpoints').once('value');
            const cloudCheckpoints = snapshot.val();
            if (cloudCheckpoints) {
                const cloudList = Object.values(cloudCheckpoints);
                // Merge: add cloud checkpoints not in local (by ID)
                const localIds = new Set(checkpoints.map(c => c.id));
                cloudList.forEach(cc => {
                    if (cc && cc.id && !localIds.has(cc.id)) {
                        checkpoints.push(cc);
                    }
                });
                // Sort by timestamp descending
                checkpoints.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                // Save merged list back to localStorage (keep max 5)
                safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints.slice(0, 5)));
            }
        } catch (err) {
            console.error('Failed to load cloud checkpoints:', err);
        }
    }

    // Remove existing modal if any
    document.querySelector('.checkpoint-modal-overlay')?.remove();

    const escapeHtmlLocal = (text) => {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    };

    const modal = document.createElement('div');
    modal.className = 'checkpoint-modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(44,40,37,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';

    modal.innerHTML = `
        <div style="background:var(--surface-elevated);border-radius:16px;max-width:600px;width:90%;max-height:80vh;display:flex;flex-direction:column;border:1px solid var(--border-default);">
            <div style="padding:20px;border-bottom:1px solid var(--border-default);display:flex;justify-content:space-between;align-items:center;">
                <h2 style="margin:0;color:var(--fg-primary);">\u2601\ufe0f Checkpoint Manager</h2>
                <button onclick="this.closest('.checkpoint-modal-overlay').remove()" style="background:none;border:none;color:var(--fg-primary);font-size:24px;cursor:pointer;">\u00d7</button>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1;">
                ${checkpoints.length === 0 ?
                    '<p style="color:var(--fg-muted);text-align:center;padding:40px;">No checkpoints yet. Create one first!</p>' :
                    `<p style="color:var(--fg-muted);margin-bottom:16px;">${checkpoints.length} checkpoint(s) saved</p>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        ${checkpoints.map((cp, i) => `
                            <div style="background:var(--canvas-subtle);padding:16px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                                <div style="flex:1;min-width:200px;">
                                    <strong style="color:var(--fg-primary);">${escapeHtmlLocal(cp.name)}</strong>
                                    <div style="color:var(--fg-muted);font-size:0.85em;margin-top:4px;">${new Date(cp.date || cp.timestamp).toLocaleString()}</div>
                                    <div style="color:var(--fg-tertiary);font-size:0.8em;">${cp.dataCount || ''}</div>
                                </div>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button onclick="restoreCheckpointByIndex(${i})" style="padding:8px 16px;background:var(--success);border:none;border-radius:8px;color:white;cursor:pointer;">Restore</button>
                                    <button onclick="exportCheckpointByIndex(${i})" style="padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:white;cursor:pointer;">Export</button>
                                    <button onclick="deleteCheckpointByIndex(${i})" style="padding:8px 12px;background:var(--destructive);border:none;border-radius:8px;color:white;cursor:pointer;">\ud83d\uddd1\ufe0f</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
            </div>
            <div style="padding:20px;border-top:1px solid var(--border-default);display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <button onclick="createCheckpoint(); document.querySelector('.checkpoint-modal-overlay')?.remove();" style="padding:12px 24px;background:var(--success-light);border:1px solid var(--success);border-radius:12px;color:var(--success);cursor:pointer;">+ Create New</button>
                <button onclick="document.getElementById('checkpointFileImport').click()" style="padding:12px 24px;background:var(--canvas-subtle);border:1px solid var(--border-default);border-radius:12px;color:var(--fg-primary);cursor:pointer;">\ud83d\udcc2 Import File</button>
            </div>
        </div>
        <input type="file" id="checkpointFileImport" accept=".dent,.json" style="display:none;" onchange="importCheckpointFile(event)">
    `;

    document.body.appendChild(modal);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Checkpoint action functions
function restoreCheckpointByIndex(index) {
    let checkpoints = [];
    try {
        checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    } catch (e) {
        checkpoints = [];
    }
    const checkpoint = checkpoints[index];

    if (!checkpoint || !checkpoint.data) {
        showToast('Checkpoint data not found', '\u274c');
        return;
    }

    showCustomConfirm(`Restore checkpoint "${checkpoint.name}"?\n\nThis will replace your current data.`, function() {
        // Restore all data
        const data = checkpoint.data;

        if (data.tasks) { tasks = migrateArrayToObject(data.tasks, 'task'); migrateTaskUrgency(); }
        if (data.stats) stats = { ...stats, ...data.stats };
        if (data.medications) medications = { ...medications, ...data.medications };
        if (data.calendarNotes) calendarNotes = data.calendarNotes;
        if (data.notebook) notebook = data.notebook;
        if (data.financials) financials = migrateFinancials(data.financials);
        if (data.pillAssignments) pillAssignments = data.pillAssignments;
        if (data.calendarEvents) calendarEvents = migrateArrayToObject(data.calendarEvents, 'event');
        if (data.dailyPlanner) dailyPlanner = { ...dailyPlanner, ...data.dailyPlanner };
        if (data.focusModeData) focusModeData = { ...focusModeData, ...data.focusModeData };
        if (data.commandCenterData) commandCenterData = { ...commandCenterData, ...data.commandCenterData };

        // Re-render and save
        updateStats();
        renderTasks();
        updateMedicationDisplay();
        renderFocusMode();
        saveData();

        document.querySelector('.checkpoint-modal-overlay')?.remove();
        showToast(`Restored: ${checkpoint.name}`, '\u2705');
    }, null, 'Restore Checkpoint');
}

function exportCheckpointByIndex(index) {
    let checkpoints = [];
    try {
        checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    } catch (e) {
        checkpoints = [];
    }
    const checkpoint = checkpoints[index];

    if (!checkpoint) {
        showToast('Checkpoint not found', '\u274c');
        return;
    }

    const dataStr = JSON.stringify(checkpoint, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    const safeName = (checkpoint.name || 'checkpoint').replace(/[^a-zA-Z0-9]/g, '-');
    link.download = `checkpoint-${safeName}-${getLocalDateString()}.dent`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Checkpoint exported', '\ud83d\udce5');
}

async function deleteCheckpointByIndex(index) {
    let checkpoints = [];
    try {
        checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
    } catch (e) {
        checkpoints = [];
    }
    const checkpoint = checkpoints[index];

    if (!checkpoint) return;

    showCustomConfirm(`Delete checkpoint "${checkpoint.name}"?`, async function() {
        // Remove from array
        checkpoints.splice(index, 1);
        safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints));

        // Also delete from Firebase
        if (firebaseInitialized && currentUser && database && checkpoint.id) {
            try {
                await database.ref('users/' + currentUser.uid + '/appData/checkpoints/' + checkpoint.id).remove();
            } catch (err) {
                console.error('Failed to delete checkpoint from cloud:', err);
            }
        }

        showToast('Checkpoint deleted', '\ud83d\uddd1\ufe0f');

        // Refresh the modal
        showCheckpointManager();
    }, null, 'Delete Checkpoint');
}

function importCheckpointFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            // Try to extract checkpoint data from various formats
            let checkpoint = imported;

            // If it's a full backup with checkpoints array
            if (imported.checkpoints && Array.isArray(imported.checkpoints)) {
                checkpoint = imported.checkpoints[0];
            }

            // If it has a data property, use that
            if (!checkpoint.data && imported.data) {
                checkpoint.data = imported.data;
            }

            // If no data property, assume the whole object is the data (old format)
            if (!checkpoint.data && (imported.tasks || imported.stats)) {
                checkpoint = {
                    id: `imported_${Date.now()}`,
                    name: file.name.replace(/\.(dent|json)$/i, ''),
                    timestamp: Date.now(),
                    date: new Date().toISOString(),
                    dataCount: 'Imported from file',
                    data: imported
                };
            }

            if (!checkpoint.data) {
                showToast('Invalid checkpoint format', '\u274c');
                return;
            }

            // Add to checkpoints list
            let checkpoints = [];
            try {
                checkpoints = JSON.parse(localStorage.getItem(getCheckpointKey()) || '[]');
            } catch (err) {
                checkpoints = [];
            }

            // Generate new ID if missing
            if (!checkpoint.id) {
                checkpoint.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            }

            checkpoints.unshift(checkpoint);
            safeLocalStorageSet(getCheckpointKey(), JSON.stringify(checkpoints.slice(0, 5)));

            showToast(`Imported: ${checkpoint.name}`, '\u2705');
            showCheckpointManager(); // Refresh modal

        } catch (err) {
            console.error('Import error:', err);
            showToast('Failed to import checkpoint', '\u274c');
        }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
}

// Restore Checkpoint (with version compatibility and flexible format detection)
function restoreCheckpoint(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            // ============================================
            // FLEXIBLE FORMAT DETECTION
            // ============================================
            let checkpoint = extractDataFromImport(imported);

            // If extraction failed, try the imported data directly
            // (for backward compatibility with strict format)
            if (!checkpoint) {
                checkpoint = imported;
            }

            // Final validation
            if (!isValidAppData(checkpoint)) {
                console.error('Unrecognized format. Keys found:', Object.keys(imported));
                showToast('Invalid checkpoint file. Check console for details.', '\u274c');
                return;
            }

            // Version compatibility check
            const checkpointVersion = checkpoint.appVersion || imported.appVersion || checkpoint.version || imported.version || '0.0.0';

            // Show checkpoint info
            const checkpointDate = checkpoint.checkpointDate || imported.checkpointDate || imported._exportDate || checkpoint.exportDate || imported.exportDate || 'Unknown';
            const displayDate = checkpointDate !== 'Unknown' ? new Date(checkpointDate).toLocaleString() : file.name;
            const meta = checkpoint.metadata || {};

            // Build info from data if metadata not present
            const taskCount = checkpoint.tasks ? Object.keys(checkpoint.tasks).length : 0;
            const completedCount = checkpoint.tasks ? Object.values(checkpoint.tasks).filter(t => t && t.completed).length : 0;

            let confirmMessage = `Restore data from ${displayDate}?\n\n`;

            if (meta.totalTasks !== undefined) {
                confirmMessage += `Tasks: ${meta.totalTasks} total, ${meta.completedTasks} completed\n`;
            } else if (taskCount > 0) {
                confirmMessage += `Tasks: ${taskCount} total, ${completedCount} completed\n`;
            }
            if (meta.medicationTracking) {
                confirmMessage += `30mg pills: ${meta.medicationTracking['30mg']}\n`;
                confirmMessage += `20mg pills: ${meta.medicationTracking['20mg']}\n`;
            } else if (checkpoint.medications) {
                confirmMessage += `30mg pills: ${checkpoint.medications['30mg']?.pills || 'N/A'}\n`;
                confirmMessage += `20mg pills: ${checkpoint.medications['20mg']?.pills || 'N/A'}\n`;
            }

            confirmMessage += `\nThis will replace your current data. Continue?`;

            showCustomConfirm(confirmMessage, function() {
                try {
                // Restore tasks
                tasks = migrateArrayToObject(checkpoint.tasks, 'task');

                // Restore stats with migration
                if (checkpoint.stats) {
                    stats = {
                        totalXPGained: checkpoint.stats.totalXPGained || 0,
                        totalTasks: checkpoint.stats.totalTasks || 0,
                        categoryXPGained: {
                            financial: 0,
                            clinic: 0,
                            health: 0,
                            school: 0,
                            academic: 0,
                            future: 0,
                            life: 0,
                            ...(checkpoint.stats.categoryXPGained || checkpoint.stats.categoryXP || {})
                        }
                    };
                }

                // Restore medications with migration
                if (checkpoint.medications) {
                    medications = {
                        '30mg': {
                            pills: 30,
                            refillDate: null,
                            dosesLogged: {},
                            ...(checkpoint.medications['30mg'] || {})
                        },
                        '20mg': {
                            pills: 30,
                            refillDate: null,
                            dosesLogged: {},
                            ...(checkpoint.medications['20mg'] || {})
                        }
                    };
                }

                // Restore calendar notes
                if (checkpoint.calendarNotes) {
                    calendarNotes = checkpoint.calendarNotes;
                } else {
                    calendarNotes = {};
                }

                // Restore notebook with object migration
                if (checkpoint.notebook) {
                    const migratedPages = migrateArrayToObject(checkpoint.notebook.pages, 'page');
                    const pageIds = Object.keys(migratedPages);
                    notebook = {
                        pages: migratedPages,
                        currentPageId: checkpoint.notebook.currentPageId || (pageIds.length > 0 ? pageIds[0] : null)
                    };
                } else {
                    notebook = { pages: {}, currentPageId: null };
                }

                // Restore financials (if available - backward compatible)
                if (checkpoint.financials) {
                    financials = migrateFinancials(checkpoint.financials);
                }

                // Restore pill assignments (if available - backward compatible)
                if (checkpoint.pillAssignments) {
                    pillAssignments = {
                        '30mg': checkpoint.pillAssignments['30mg'] || {},
                        '20mg': checkpoint.pillAssignments['20mg'] || {}
                    };
                } else {
                    pillAssignments = { '30mg': {}, '20mg': {} };
                }

                // Restore calendar events (if available - backward compatible)
                if (checkpoint.calendarEvents) {
                    calendarEvents = migrateArrayToObject(checkpoint.calendarEvents, 'event');
                    // Remove past events using local timezone
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    Object.keys(calendarEvents).forEach(id => {
                        const event = calendarEvents[id];
                        if (!event || !event.dateStr || typeof event.dateStr !== 'string') {
                            delete calendarEvents[id];
                            return;
                        }
                        const [year, month, day] = event.dateStr.split('-').map(Number);
                        if (isNaN(year) || isNaN(month) || isNaN(day)) {
                            delete calendarEvents[id];
                            return;
                        }
                        const eventDate = new Date(year, month - 1, day);
                        eventDate.setHours(0, 0, 0, 0);
                        if (eventDate < today) {
                            delete calendarEvents[id];
                        }
                    });
                } else {
                    calendarEvents = {};
                }
                // If no financials/pillAssignments/calendarEvents in checkpoint, keep default values (backward compatible)

                // Save and refresh
                saveData();
                updateStats();
                renderTasks();
                updateMedicationDisplay();

                showToast('Checkpoint restored successfully!', '\u2705');

                // Show version info if different
                if (checkpointVersion !== APP_VERSION) {
                    setTimeout(() => {
                        showToast(`Updated from v${checkpointVersion} to v${APP_VERSION}`, '\u2139\ufe0f');
                    }, 3500);
                }
                } catch (restoreErr) {
                    showToast('Error restoring checkpoint', '\u274c');
                    console.error('Restore error:', restoreErr);
                }
            }, null, 'Restore Checkpoint');
        } catch (error) {
            showToast('Error reading checkpoint file', '\u274c');
            console.error('Restore error:', error);
        }
    };

    reader.readAsText(file);
    event.target.value = '';
}

// ============================================
// CLEAR ALL DATA
// ============================================

function clearAllData() {
    showCustomConfirm(
        'WARNING: This will permanently delete ALL your data!\n\n' +
        'This includes:\n' +
        '- All tasks\n' +
        '- All progress\n' +
        '- All XP\n' +
        '- All statistics\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Are you absolutely sure?',
        function() {
            // Double confirmation
            showCustomConfirm(
                'You are about to delete everything. This cannot be undone.\n\n' +
                'Click Yes to DELETE ALL DATA or No to keep your data.',
                function() {
                    // Clear everything
                    tasks = {};
                    stats = {
                        totalXPGained: 0,
                        totalTasks: 0,
                        categoryXPGained: {
                            financial: 0,
                            clinic: 0,
                            health: 0,
                            school: 0,
                            academic: 0,
                            future: 0,
                            life: 0
                        }
                    };

                    medications = {
                        '30mg': {
                            pills: 30,
                            refillDate: null,
                            dosesLogged: {}
                        },
                        '20mg': {
                            pills: 30,
                            refillDate: null,
                            dosesLogged: {}
                        }
                    };

                    localStorage.removeItem('dentalStudentQuestData');
                    localStorage.removeItem('lastReset');

                    saveData();
                    updateStats();
                    renderTasks();
                    updateMedicationDisplay();

                    showToast('All data cleared', '!');
                },
                null, 'FINAL CONFIRMATION'
            );
        },
        null, 'Delete All Data'
    );
}

// ============================================
// FIREBASE INIT & AUTH
// ============================================

function initializeFirebase() {
    try {
        // Check if Firebase SDK loaded
        if (typeof firebase === 'undefined') {
            console.warn('\u26a0\ufe0f Firebase SDK not loaded - running in offline mode');
            updateSyncStatus('offline', 'SDK not loaded');
            loadData();
            markInitialLoadComplete();
            updateCategoryDisplay();
            return;
        }

        // Initialize Firebase
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        database = firebase.database();

        // CRITICAL FIX: Check BOTH PIN keys for backwards compatibility
        // Satellite apps (d3-roadmap, stimulant-calculator) use 'dentalQuestPin'
        // Main app used to use 'dentalAppPin' - we're standardizing on 'dentalQuestPin'
        let userPin = localStorage.getItem('dentalQuestPin');

        // Migration: Check old key if new key not found
        if (!userPin) {
            const oldPin = localStorage.getItem('dentalAppPin');
            if (oldPin) {
                userPin = oldPin;
                safeLocalStorageSet('dentalQuestPin', userPin);
                // Keep old key for backwards compatibility but new key is source of truth
            }
        }

        // Helper: finish Firebase setup with a validated PIN
        function finishFirebaseSetup(pin) {
            // Create a consistent user ID from the PIN
            const hashedPin = 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '');

            // Create a fake user object
            currentUser = {
                uid: hashedPin
            };
            firebaseInitialized = true;
            pinValidated = true;  // CRITICAL: Mark PIN as validated before any saves

            // Load data from Firebase
            loadDataFromFirebase();
        }

        if (!userPin) {
            // First time - ask for PIN
            showCustomPrompt(
                'Create a 4-digit PIN to sync across devices:\n\n(Use the same PIN on all your devices - main app, D3 Roadmap, Sleep Tracker!)',
                '',
                function(enteredPin) {
                    if (!enteredPin || enteredPin.length < 4) {
                        showToast('PIN must be at least 4 characters. Using localStorage only.', '!');
                        loadData();
                        markInitialLoadComplete();
                        updateCategoryDisplay();
                        return;
                    }

                    // Save to BOTH keys for full compatibility
                    safeLocalStorageSet('dentalQuestPin', enteredPin);
                    safeLocalStorageSet('dentalAppPin', enteredPin);
                    finishFirebaseSetup(enteredPin);
                },
                'Sync PIN'
            );
            return; // Wait for prompt callback
        }

        finishFirebaseSetup(userPin);

    } catch (error) {
        console.error('Firebase init error:', error);
        firebaseInitialized = false;
        updateSyncStatus('offline', 'Init failed');
        loadData(); // Fallback to localStorage
        markInitialLoadComplete();
        updateCategoryDisplay();
    }
}

// ============================================
// LOAD DATA FROM FIREBASE
// ============================================

function loadDataFromFirebase() {
    if (!currentUser || !database) {
        loadData(); // Fallback
        markInitialLoadComplete();
        updateSyncStatus('offline', 'Local only');
        return;
    }

    updateSyncStatus('syncing', 'Loading from cloud...');

    database.ref('users/' + currentUser.uid + '/appData').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                // BULLETPROOF LOAD (Aug 2026): local-first + union merge.
                // The old path adopted the cloud tree wholesale, so a device
                // whose changes hadn't reached the cloud yet would wipe its
                // own local copy on next open (the exact data-loss cascade
                // from 2026-08-19). Now: load localStorage into memory first
                // (no render), then union-merge the cloud tree in. Nothing is
                // discarded — if local held content the cloud lacked, the
                // merged tree is pushed back up after load.
                try { loadData(true); } catch (e) { console.error('Pre-merge local load error:', e); }

                let localContributed = false;
                try {
                    localContributed = mergeRemoteAppData(data);
                } catch (mergeErr) {
                    // Merge must never brick the app — fall back to adopting cloud
                    console.error('Union merge failed — adopting cloud state:', mergeErr);
                    try { applyRemoteData(data); } catch (e2) { console.error('Cloud adopt fallback error:', e2); }
                }

                // CRITICAL: Set sync flags BEFORE rendering so saves are never blocked
                // by a rendering exception. Data is loaded — saves must be allowed.
                hasLoadedFromCloud = true;
                _dataLoaded = true;

                // Setup real-time sync for ALL data (includes planner)
                setupMainDataRealtimeSync();

                // CRITICAL: Mark initial load as complete - now saves are allowed
                markInitialLoadComplete();

                // Rendering and UI updates — wrapped in try/catch so a render
                // error never blocks the save system
                try {
                    checkCriticalEODReset();
                    updateStats();
                    renderTasks();
                    if (typeof renderKanbanBoard === 'function' && typeof currentViewMode !== 'undefined' && currentViewMode === 'kanban') {
                        renderKanbanBoard();
                    }
                    updateMedicationDisplay();
                    checkAndApplyDailyPillReduce();
                    initFocusMode();
                } catch (renderErr) {
                    console.error('Post-load render error (saves still enabled):', renderErr);
                }

                if (localContributed) {
                    // Local device held changes the cloud was missing \u2014 push the union up
                    saveData();
                    showToast('Merged local + cloud data \ud83d\udd00', '\u2705');
                } else {
                    showToast('Data loaded from cloud \u2601\ufe0f', '\u2705');
                }
                updateSyncStatus('connected', `Synced (${getCount(tasks)} tasks)`);
            } else {
                // No cloud data, check localStorage
                try { loadData(); } catch (e) { console.error('loadData fallback error:', e); }

                // CRITICAL: Set flags even if loadData() rendering fails
                hasLoadedFromCloud = true;
                _dataLoaded = true;
                lastCloudContactTs = Date.now(); // We did reach the server \u2014 tree is just empty

                updateSyncStatus('connected', 'No cloud data yet');
                // Mark load complete after localStorage load
                markInitialLoadComplete();
            }
        })
        .catch((error) => {
            console.error('Firebase load error:', error);
            updateSyncStatus('error', 'Load failed: ' + error.message);
            try { loadData(); } catch (e) { console.error('loadData error-fallback error:', e); }

            // CRITICAL: Set flags even if loadData() rendering fails
            _dataLoaded = true;

            // If we have local data, allow saves
            const localData = {
                tasks, stats, medications, calendarNotes, notebook, financials,
                pillAssignments, calendarEvents, dailyPlanner, focusModeData
            };
            if (hasRealData(localData)) {
                hasLoadedFromCloud = true;  // Allow saves with local data
                console.log('\u26a0\ufe0f Firebase failed but have local data - allowing saves');
            }

            // Mark load complete even on error
            markInitialLoadComplete();
        });
}

// ============================================
// SYNC CONFLICT MODAL
// ============================================

function showSyncConflictModal(localData, remoteData, onResolve) {
    const modal = document.createElement('div');
    modal.id = 'syncConflictModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(44,40,37,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';

    const localTasks = getValues(localData.tasks).filter(t => !t.completed).length;
    const remoteTasks = getValues(remoteData.tasks).filter(t => !t.completed).length;
    const localTime = localData.lastSaved ? new Date(localData.lastSaved).toLocaleTimeString() : 'Unknown';
    const remoteTime = remoteData.lastSaved ? new Date(remoteData.lastSaved).toLocaleTimeString() : 'Unknown';

    modal.innerHTML = `
        <div style="background:var(--surface-overlay);border-radius:16px;padding:24px;max-width:450px;width:90%;border:1px solid var(--border-default);">
            <h3 style="color:var(--warning);margin:0 0 16px 0;font-size:1.2em;">\u26a0\ufe0f Sync Conflict Detected</h3>
            <p style="color:var(--fg-tertiary);margin-bottom:20px;">Changes were made on another device. Which version do you want to keep?</p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div style="background:var(--canvas-subtle);padding:16px;border-radius:8px;border:2px solid transparent;cursor:pointer;" onclick="this.style.borderColor='var(--success)'" id="keepLocal">
                    <div style="color:var(--info);font-weight:600;margin-bottom:8px;">\ud83d\udcf1 This Device</div>
                    <div style="color:var(--fg-tertiary);font-size:0.85em;">
                        ${localTasks} active tasks<br>
                        Last saved: ${localTime}
                    </div>
                </div>
                <div style="background:var(--canvas-subtle);padding:16px;border-radius:8px;border:2px solid transparent;cursor:pointer;" onclick="this.style.borderColor='var(--success)'" id="keepRemote">
                    <div style="color:var(--info);font-weight:600;margin-bottom:8px;">\u2601\ufe0f Cloud</div>
                    <div style="color:var(--fg-tertiary);font-size:0.85em;">
                        ${remoteTasks} active tasks<br>
                        Last saved: ${remoteTime}
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:10px;">
                <button onclick="window.resolveSyncConflict('local')" style="flex:1;padding:12px;background:var(--success);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Keep This Device</button>
                <button onclick="window.resolveSyncConflict('remote')" style="flex:1;padding:12px;background:var(--accent);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Keep Cloud</button>
            </div>
            <button onclick="window.resolveSyncConflict('merge')" style="width:100%;margin-top:10px;padding:10px;background:var(--canvas-subtle);border:1px solid var(--border-strong);border-radius:8px;color:var(--fg-tertiary);cursor:pointer;">Try to Merge Both</button>
        </div>
    `;

    document.body.appendChild(modal);

    window.resolveSyncConflict = function(choice) {
        document.body.removeChild(modal);
        delete window.resolveSyncConflict;
        onResolve(choice);
    };
}

// ============================================
// SYNC STATUS UI
// ============================================

function updateSyncStatus(status, message) {
    const icon = document.getElementById('syncStatusIcon');
    const text = document.getElementById('syncStatusText');
    if (!icon || !text) return;

    switch(status) {
        case 'connected':
            icon.textContent = '\ud83d\udfe2';
            text.textContent = message || 'Connected to cloud';
            text.style.color = 'var(--success-light)';
            break;
        case 'syncing':
            icon.textContent = '\ud83d\udd04';
            text.textContent = message || 'Syncing...';
            text.style.color = 'var(--accent-light)';
            break;
        case 'offline':
            icon.textContent = '\ud83d\udd34';
            text.textContent = message || 'Offline (local only)';
            text.style.color = 'var(--destructive-light)';
            break;
        case 'error':
            icon.textContent = '\u26a0\ufe0f';
            text.textContent = message || 'Sync error';
            text.style.color = 'var(--warning-light)';
            break;
        default:
            icon.textContent = '\u23f3';
            text.textContent = message || 'Connecting...';
            text.style.color = 'white';
    }

    // Update compact header sync dot
    if (typeof updateSyncDot === 'function') updateSyncDot(status);

    // Update sidebar + top bar sync indicators
    if (typeof updateSidebarSyncStatus === 'function') updateSidebarSyncStatus(status, message);
}

// ============================================
// FORCE CLOUD SYNC
// ============================================

function forceCloudSync() {
    if (!firebaseInitialized || !currentUser || !database) {
        showToast('\u274c Not connected to cloud', '\u26a0\ufe0f');
        updateSyncStatus('offline', 'Not connected');
        return;
    }

    updateSyncStatus('syncing', 'Fetching from cloud...');

    database.ref('users/' + currentUser.uid + '/appData').once('value')
        .then(snapshot => {
            const remoteData = snapshot.val();
            if (!remoteData) {
                showToast('No cloud data found', '\u2601\ufe0f');
                updateSyncStatus('connected', 'No cloud data');
                return;
            }

            // Check for conflicts - if local changes exist and remote is different
            if (localChangesSinceLastSync && lastSyncTimestamp && remoteData.lastSaved > lastSyncTimestamp) {
                // Build local data snapshot for comparison
                const localData = {
                    tasks, stats, medications, calendarNotes, notebook,
                    financials, pillAssignments, calendarEvents, dailyPlanner,
                    focusModeData, lastCriticalEODReset,
                    lastSaved: lastKnownSaveTime
                };

                showSyncConflictModal(localData, remoteData, (choice) => {
                    if (choice === 'local') {
                        // Keep local - push to cloud
                        saveDataImmediate();
                        showToast('\u2705 Kept local data, pushed to cloud', '\ud83d\udcf1');
                    } else if (choice === 'remote') {
                        // Keep remote - apply cloud data
                        applyRemoteData(remoteData);
                        showToast(`\u2705 Synced ${getCount(tasks)} tasks from cloud`, '\u2601\ufe0f');
                    } else if (choice === 'merge') {
                        // Deep merge - local takes precedence for conflicts
                        const merged = deepMerge(remoteData, localData);
                        merged.lastSaved = Date.now();
                        applyRemoteData(merged);
                        saveDataImmediate(); // Push merged result to cloud
                        showToast('\u2705 Merged data from both devices', '\ud83d\udd00');
                    }
                    localChangesSinceLastSync = false;
                    lastSyncTimestamp = Date.now();
                });
                return;
            }

            // No conflict - just apply remote data
            applyRemoteData(remoteData);
            localChangesSinceLastSync = false;
            lastSyncTimestamp = Date.now();
            updateSyncStatus('connected', `Synced (${getCount(tasks)} tasks)`);
            showToast(`\u2705 Synced ${getCount(tasks)} tasks from cloud`, '\u2601\ufe0f');
        })
        .catch(err => {
            console.error('Force sync failed:', err);
            updateSyncStatus('error', 'Sync failed: ' + err.message);
            showToast('\u274c Sync failed: ' + err.message, '\u26a0\ufe0f');
        });
}

// ============================================
// APPLY REMOTE DATA — Canonical merge function
// BUG FIX #6: Handles all 14 fields
// ============================================

function applyRemoteData(data) {
    lastKnownSaveTime = data.lastSaved || Date.now();

    tasks = migrateArrayToObject(data.tasks, 'task');
    migrateTaskUrgency();

    // Adopt remote tombstones wholesale (this is an adopt-cloud path)
    deletedTasks = (data.deletedTasks && typeof data.deletedTasks === 'object') ? Object.assign({}, data.deletedTasks) : {};

    if (data.stats) {
        stats = deepMerge(stats, {
            totalXPGained: data.stats.totalXPGained || 0,
            totalTasks: data.stats.totalTasks || 0,
            categoryXPGained: data.stats.categoryXPGained || {}
        });
    }

    if (data.medications) {
        medications = deepMerge(medications, data.medications);
    }

    if (data.calendarNotes !== undefined) {
        calendarNotes = data.calendarNotes || {};
    }

    if (data.notebook) {
        const migratedPages = migrateArrayToObject(data.notebook.pages, 'page');
        const pageIds = Object.keys(migratedPages);
        notebook = {
            pages: migratedPages,
            currentPageId: data.notebook.currentPageId || (pageIds.length > 0 ? pageIds[0] : null)
        };
    }

    if (data.financials) {
        financials = migrateFinancials(data.financials);
    }

    if (data.pillAssignments) {
        pillAssignments = {
            '30mg': data.pillAssignments['30mg'] || {},
            '20mg': data.pillAssignments['20mg'] || {}
        };
    }

    if (data.calendarEvents !== undefined) {
        calendarEvents = migrateArrayToObject(data.calendarEvents, 'event');
    }

    if (data.dailyPlanner) {
        dailyPlanner = deepMerge(dailyPlanner, data.dailyPlanner);
    }

    if (data.focusModeData) {
        focusModeData = deepMerge(focusModeData, data.focusModeData);
    }

    // Load Command Center data
    if (data.commandCenterData) {
        commandCenterData = {
            crashOut: {
                sleepTime: data.commandCenterData.crashOut?.sleepTime || null,
                lastReset: data.commandCenterData.crashOut?.lastReset || null
            },
            focusStats: {
                totalXP: data.commandCenterData.focusStats?.totalXP || 0,
                focusStreak: data.commandCenterData.focusStats?.focusStreak || 0,
                dailyStreak: data.commandCenterData.focusStats?.dailyStreak || 0,
                lockedInStreak: data.commandCenterData.focusStats?.lockedInStreak || 0
            },
            currentSession: {
                taskId: data.commandCenterData.currentSession?.taskId || null,
                checklist: data.commandCenterData.currentSession?.checklist || {},
                timerMinutes: data.commandCenterData.currentSession?.timerMinutes || 25,
                timerRemaining: null,
                confirmedStarted: data.commandCenterData.currentSession?.confirmedStarted ?? false,
                startedAt: data.commandCenterData.currentSession?.startedAt ?? null
            }
        };
    }

    if (data.lastCriticalEODReset) {
        lastCriticalEODReset = data.lastCriticalEODReset;
    }

    // BUG FIX #6: Handle _version and _dataLoaded
    if (data._version !== undefined) {
        _version = data._version;
    }
    if (data._dataLoaded !== undefined) {
        _dataLoaded = data._dataLoaded;
    }

    // Rebase the change-detection snapshot on the adopted state so the next
    // stampTaskChanges() diff is against what we just accepted, and record
    // cloud contact (this data came straight from Firebase)
    refreshTaskSnapshot();
    lastCloudContactTs = Date.now();

    // Save to localStorage as backup
    safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));

    // Re-render ALL UI
    updateStats();
    renderTasks();
    if (typeof renderKanbanBoard === 'function' && typeof currentViewMode !== 'undefined' && currentViewMode === 'kanban') {
        renderKanbanBoard();
    }
    updateMedicationDisplay();

    // Check for daily pill auto-reduce (sync/pull path)
    checkAndApplyDailyPillReduce();

    if (currentView === 'focus') {
        renderFocusMode();
    }
}

// ============================================
// UNION MERGE ENGINE (Aug 2026)
// ============================================
// mergeRemoteAppData(remote) — the heart of the bulletproof sync rewrite.
// Merges a remote appData tree INTO current in-memory state. Never discards
// either side wholesale: per-task union with updatedAt winner + tombstones;
// keyed collections union with newer-side-wins on shared keys; singleton
// blocks last-writer-wins by tree timestamp. Returns TRUE if local state
// contributed anything the remote tree was missing — the caller must then
// push the union back up (saveData()) so both devices converge.
// Convergence guarantee: contribution is detected via canonicalJson content
// equality (key-order insensitive), so once the trees have identical content
// the push-back chain terminates — no ping-pong between live devices.

function mergeRemoteAppData(remote) {
    if (!remote || typeof remote !== 'object') return false;

    var localContributed = false;
    var remoteLastSaved = (typeof remote.lastSaved === 'number') ? remote.lastSaved : 0;
    // Which side is "newer" overall — used only for singleton blocks and ties
    var remoteNewer = remoteLastSaved >= (lastKnownSaveTime || 0);

    // ---- Tombstones: union (max timestamp per id) ----
    var remoteDeleted = (remote.deletedTasks && typeof remote.deletedTasks === 'object') ? remote.deletedTasks : {};
    var localDeleted = (deletedTasks && typeof deletedTasks === 'object') ? deletedTasks : {};
    var mergedDeleted = {};
    Object.keys(remoteDeleted).forEach(function(id) {
        var v = remoteDeleted[id];
        if (typeof v === 'number' && v > 0) mergedDeleted[id] = v;
    });
    Object.keys(localDeleted).forEach(function(id) {
        var v = localDeleted[id];
        if (typeof v !== 'number' || v <= 0) return;
        if (!mergedDeleted[id] || v > mergedDeleted[id]) mergedDeleted[id] = v;
    });

    // ---- Tasks: per-task union, higher effective timestamp wins ----
    var remoteTasks = migrateArrayToObject(remote.tasks, 'task');
    var localTasks = tasks || {};
    var mergedTasks = {};
    var allIds = {};
    Object.keys(localTasks).forEach(function(id) { allIds[id] = true; });
    Object.keys(remoteTasks).forEach(function(id) { allIds[id] = true; });

    Object.keys(allIds).forEach(function(id) {
        var loc = localTasks[id];
        var rem = remoteTasks[id];
        var winner;
        if (loc && rem) {
            var locTs = taskEffectiveTs(loc);
            var remTs = taskEffectiveTs(rem);
            if (locTs > remTs) winner = loc;
            else if (remTs > locTs) winner = rem;
            else winner = remoteNewer ? rem : loc;
        } else {
            winner = loc || rem;
        }
        if (!winner || typeof winner !== 'object') return;

        // Tombstone check: a deletion at-or-after the task's last edit wins;
        // an edit AFTER the deletion resurrects the task and clears the stone
        var tombTs = mergedDeleted[id];
        if (typeof tombTs === 'number' && tombTs > 0) {
            if (tombTs >= taskEffectiveTs(winner)) {
                return; // stays deleted
            }
            delete mergedDeleted[id]; // resurrected by later edit
        }
        mergedTasks[id] = winner;
    });

    tasks = mergedTasks;
    deletedTasks = mergedDeleted;
    migrateTaskUrgency();

    // ---- Keyed-collection union: newer side's entries win on shared keys ----
    function unionKeyed(localObj, remoteObj) {
        var lo = (localObj && typeof localObj === 'object') ? localObj : {};
        var ro = (remoteObj && typeof remoteObj === 'object') ? remoteObj : {};
        var base = remoteNewer ? lo : ro;   // older side underneath
        var top = remoteNewer ? ro : lo;    // newer side on top
        var merged = Object.assign({}, base, top);
        return merged;
    }

    calendarNotes = unionKeyed(calendarNotes, remote.calendarNotes || {});

    calendarEvents = unionKeyed(calendarEvents, migrateArrayToObject(remote.calendarEvents, 'event'));

    var remotePages = migrateArrayToObject(remote.notebook && remote.notebook.pages, 'page');
    var mergedPages = unionKeyed(notebook && notebook.pages, remotePages);
    var mergedPageIds = Object.keys(mergedPages);
    var wantPageId = remoteNewer
        ? ((remote.notebook && remote.notebook.currentPageId) || (notebook && notebook.currentPageId))
        : ((notebook && notebook.currentPageId) || (remote.notebook && remote.notebook.currentPageId));
    notebook = {
        pages: mergedPages,
        currentPageId: (wantPageId && mergedPages[wantPageId]) ? wantPageId : (mergedPageIds.length > 0 ? mergedPageIds[0] : null)
    };

    // ---- Singleton blocks: last-writer-wins by tree timestamp ----
    // Adopt the remote block only when the remote tree is newer overall AND
    // the block exists in it (Firebase strips blocks that serialize empty).
    // No contribution tracking here — that's judged authoritatively at
    // finalize by comparing the real save payload against the remote tree.
    function adoptRemote(remoteVal) {
        if (remoteVal === undefined || remoteVal === null) return false;
        return remoteNewer;
    }

    if (adoptRemote(remote.stats)) {
        stats = {
            ...stats,
            totalXPGained: remote.stats.totalXPGained || 0,
            totalTasks: remote.stats.totalTasks || 0,
            categoryXPGained: {
                ...stats.categoryXPGained,
                ...(remote.stats.categoryXPGained || {})
            }
        };
    }

    if (adoptRemote(remote.medications)) {
        medications = { ...medications, ...remote.medications };
        if (medications['30mg']) {
            medications['30mg'].dosesLogged = migrateDosesLoggedToObject(medications['30mg'].dosesLogged);
        }
        if (medications['20mg']) {
            medications['20mg'].dosesLogged = migrateDosesLoggedToObject(medications['20mg'].dosesLogged);
        }
    }

    if (adoptRemote(remote.financials)) {
        financials = migrateFinancials(remote.financials);
    }

    if (adoptRemote(remote.pillAssignments)) {
        pillAssignments = {
            '30mg': remote.pillAssignments['30mg'] || {},
            '20mg': remote.pillAssignments['20mg'] || {}
        };
    }

    if (adoptRemote(remote.dailyPlanner)) {
        dailyPlanner = {
            date: remote.dailyPlanner.date || null,
            goal: remote.dailyPlanner.goal || '',
            bedtime: remote.dailyPlanner.bedtime || '23:00',
            blocks: migrateArrayToObject(remote.dailyPlanner.blocks, 'block'),
            lastReset: remote.dailyPlanner.lastReset || null
        };
        try { checkPlannerReset(); } catch (e) { console.error('checkPlannerReset error:', e); }
    }

    if (adoptRemote(remote.focusModeData)) {
        focusModeData = {
            oneThingId: remote.focusModeData.oneThingId || null,
            microSteps: migrateArrayToObject(remote.focusModeData.microSteps, 'step'),
            todaysTasks: {
                big: migrateTaskIdArrayToObject(remote.focusModeData.todaysTasks?.big),
                medium: migrateTaskIdArrayToObject(remote.focusModeData.todaysTasks?.medium),
                small: migrateTaskIdArrayToObject(remote.focusModeData.todaysTasks?.small)
            },
            focusTimerSeconds: remote.focusModeData.focusTimerSeconds || 0,
            focusTimerRunning: false,
            focusTimerInterval: null,
            lastPlanningDate: remote.focusModeData.lastPlanningDate || null
        };
    }

    if (adoptRemote(remote.commandCenterData)) {
        // Preserve LOCAL live timer — it's runtime-only and never synced
        var localTimerRemaining = commandCenterData && commandCenterData.currentSession
            ? commandCenterData.currentSession.timerRemaining : null;
        commandCenterData = {
            crashOut: {
                sleepTime: remote.commandCenterData.crashOut?.sleepTime || null,
                lastReset: remote.commandCenterData.crashOut?.lastReset || null
            },
            focusStats: {
                totalXP: remote.commandCenterData.focusStats?.totalXP || 0,
                focusStreak: remote.commandCenterData.focusStats?.focusStreak || 0,
                dailyStreak: remote.commandCenterData.focusStats?.dailyStreak || 0,
                lockedInStreak: remote.commandCenterData.focusStats?.lockedInStreak || 0
            },
            currentSession: {
                taskId: remote.commandCenterData.currentSession?.taskId || null,
                checklist: remote.commandCenterData.currentSession?.checklist || {},
                timerMinutes: remote.commandCenterData.currentSession?.timerMinutes || 25,
                timerRemaining: localTimerRemaining ?? null,
                confirmedStarted: remote.commandCenterData.currentSession?.confirmedStarted ?? false,
                startedAt: remote.commandCenterData.currentSession?.startedAt ?? null
            }
        };
    }

    // ---- lastCriticalEODReset: newest date string wins (prevents double resets) ----
    var remoteEOD = remote.lastCriticalEODReset || null;
    if (remoteEOD && (!lastCriticalEODReset || remoteEOD > lastCriticalEODReset)) {
        lastCriticalEODReset = remoteEOD;
        safeLocalStorageSet('lastCriticalEODReset', lastCriticalEODReset);
    }

    if (typeof remote._version === 'number') {
        _version = Math.max(_version || 0, remote._version);
    }

    // ---- Finalize ----
    lastKnownSaveTime = Math.max(lastKnownSaveTime || 0, remoteLastSaved);
    _dataLoaded = true;
    lastCloudContactTs = Date.now();
    // Rebase change-detection snapshot on the MERGED state — anything the user
    // edits from here on gets a fresh updatedAt stamp on next save
    refreshTaskSnapshot();

    // Authoritative contribution check: would pushing our merged state actually
    // change the cloud tree? Compare the real save payload (some blocks are
    // projections — e.g. focusModeData timer fields never serialize) against
    // the remote tree, both in Firebase-equivalent form, ignoring the volatile
    // lastSaved stamp. This is the convergence loop-breaker: no content
    // difference means no push-back.
    var payload = buildSaveData(lastKnownSaveTime);
    localContributed = canonicalJson(fbEquivalent(payload, ['lastSaved'])) !==
                       canonicalJson(fbEquivalent(remote, ['lastSaved']));

    // Persist the union locally so a crash/refresh right now loses nothing
    try {
        safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(payload));
    } catch (e) {
        console.error('Post-merge localStorage persist error:', e);
    }

    // Re-render — wrapped so a render error never corrupts the merge result
    try {
        updateStats();
        renderTasks();
        if (typeof renderKanbanBoard === 'function' && typeof currentViewMode !== 'undefined' && currentViewMode === 'kanban') {
            renderKanbanBoard();
        }
        updateMedicationDisplay();
        checkAndApplyDailyPillReduce();
        if (currentView === 'focus') {
            renderFocusMode();
        }
    } catch (renderErr) {
        console.error('Post-merge render error (state is intact):', renderErr);
    }

    return localContributed;
}

// ============================================
// FORCE UPLOAD / FORCE PULL
// ============================================

function forceUploadToCloud() {
    if (!firebaseInitialized || !currentUser || !database) {
        showToast('\u274c Not connected to cloud', '\u26a0\ufe0f');
        return;
    }

    showCustomConfirm('Force Upload\n\nThis will OVERWRITE all cloud data with your local data.\n\nAre you sure?', function() {
        updateSyncStatus('syncing', 'Uploading...');

        const saveTimestamp = Date.now();
        lastKnownSaveTime = saveTimestamp;

        const data = buildSaveData(saveTimestamp);

        database.ref('users/' + currentUser.uid + '/appData').set(data)
            .then(() => {
                safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));
                updateSyncStatus('connected', 'Force uploaded \u2713');
                showToast('Force uploaded to cloud', '!');
            })
            .catch(err => {
                console.error('Force upload failed:', err);
                updateSyncStatus('error', 'Upload failed');
                showToast('Upload failed: ' + err.message, '!');
            });
    }, null, 'Force Upload');
}

function forcePullFromCloud() {
    if (!firebaseInitialized || !currentUser || !database) {
        showToast('\u274c Not connected to cloud', '\u26a0\ufe0f');
        return;
    }

    showCustomConfirm('Force Pull\n\nThis will OVERWRITE all local data with cloud data.\n\nAre you sure?', function() {
        updateSyncStatus('syncing', 'Pulling...');

        database.ref('users/' + currentUser.uid + '/appData').once('value')
            .then(snapshot => {
                const data = snapshot.val();

                if (!data) {
                    showToast('No cloud data found', '!');
                    updateSyncStatus('connected', 'No cloud data');
                    return;
                }

                // Full overwrite - apply all remote data
                applyRemoteData(data);

                updateSyncStatus('connected', 'Force pulled \u2713');
                showToast('Pulled from cloud', '!');
            })
            .catch(err => {
                console.error('Force pull failed:', err);
                updateSyncStatus('error', 'Pull failed');
                showToast('Pull failed: ' + err.message, '!');
            });
    }, null, 'Force Pull');
}

// ============================================
// DEBUG / PIN RESET (window-attached)
// ============================================

window.debugSyncStatus = function() {
    const pin = localStorage.getItem('dentalQuestPin') || localStorage.getItem('dentalAppPin');
    const hashedPin = pin ? 'user_' + btoa(pin).replace(/[^a-zA-Z0-9]/g, '') : 'NO PIN';


    return {
        firebaseInitialized,
        currentUser: currentUser?.uid,
        hasDatabase: !!database,
        initialLoadComplete,
        pinSet: !!pin,
        userPath: hashedPin !== 'NO PIN' ? 'users/' + hashedPin + '/appData' : null,
        lastKnownSaveTime,
        mainDataSyncEnabled,
        hasRealtimeListener: !!realtimeSyncListener,
        tasksCount: getCount(tasks),
        deletedTasksCount: getCount(deletedTasks),
        lastCloudContactTs,
        secondsSinceCloudContact: lastCloudContactTs ? Math.round((Date.now() - lastCloudContactTs) / 1000) : null
    };
};

window.resetSyncPin = function() {
    const currentPin = localStorage.getItem('dentalQuestPin') || localStorage.getItem('dentalAppPin');

    showCustomPrompt(
        'Enter your sync PIN:\n\nUse the SAME PIN on ALL devices!\n\nCurrent PIN ends with: ' + (currentPin ? currentPin.slice(-2) : 'N/A'),
        '',
        function(newPin) {
            if (newPin && newPin.length >= 4) {
                safeLocalStorageSet('dentalQuestPin', newPin);
                safeLocalStorageSet('dentalAppPin', newPin);
                showCustomAlert('PIN updated! The page will now reload to connect with your new PIN.', 'PIN Updated', function() {
                    window.location.reload();
                });
            } else {
                showToast('PIN must be at least 4 characters. No changes made.', '!');
            }
        },
        'Change Sync PIN'
    );
};

// ============================================
// REALTIME SYNC — Consolidated with applyRemoteData()
// ============================================

function setupMainDataRealtimeSync() {
    if (!firebaseInitialized || !database || !currentUser) {
        console.warn('\u26a0\ufe0f Cannot setup realtime sync - Firebase not ready');
        return;
    }

    // If already enabled, detach old listener first to prevent duplicates
    if (mainDataSyncEnabled && realtimeSyncListener) {
        database.ref('users/' + currentUser.uid + '/appData').off('value', realtimeSyncListener);
    }

    mainDataSyncEnabled = true;

    // Track if this is the very first callback (during initial setup)
    let isInitialSetup = true;

    realtimeSyncListener = database.ref('users/' + currentUser.uid + '/appData').on('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            return;
        }

        const incomingTime = data.lastSaved || 0;

        // On first callback, just establish the baseline timestamp
        if (isInitialSetup) {
            isInitialSetup = false;
            lastKnownSaveTime = Math.max(lastKnownSaveTime, incomingTime);
            return;
        }

        // Skip during initial load (we handle this separately)
        if (!initialLoadComplete) {
            return;
        }

        // Skip if cloud data is empty
        if (isEmptyState(data)) {
            console.warn('\u26a0\ufe0f Realtime: Ignoring empty cloud update');
            return;
        }

        // Skip our own echo (same tree we just pushed, within jitter window)
        if (Math.abs(incomingTime - lastKnownSaveTime) <= 100) {
            lastCloudContactTs = Date.now();
            return;
        }

        // BULLETPROOF SYNC (Aug 2026): union-merge instead of adopt-wholesale.
        // Handles BOTH directions: a genuinely newer remote tree merges in
        // without discarding local-only edits, and a STALE tree pushed by a
        // woken old-code device gets our newer content merged over it \u2014 then
        // pushed back up, actively repairing the clobber.
        try {
            if (mergeRemoteAppData(data)) {
                saveData(); // local held content the pusher lacked \u2014 push union up
            } else {
                showToast('\ud83d\udce5 Synced from another device', '\ud83d\udd04');
            }
        } catch (e) {
            console.error('Realtime merge error:', e);
        }
    });
}

// ============================================
// EVENT HANDLERS — Visibility, Online/Offline, Beforeunload
// ============================================

// Save data before user leaves the page - WITH GUARDS
window.addEventListener('beforeunload', function(e) {
    // GUARD: Only save if we have real data and passed initial load
    if (pendingSaveData && firebaseInitialized && currentUser && database && initialLoadComplete && hasLoadedFromCloud) {
        // Force a synchronous save on exit - do a final localStorage save at minimum
        try {
            const finalData = buildSaveData(Date.now());
            // Don't save empty data
            if (!isEmptyState(finalData)) {
                safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(finalData));
            }
        } catch (e) {}
    }
});

// Handle visibility changes - save when hiding, refresh when showing - WITH GUARDS
// BULLETPROOF SYNC (Aug 2026): hidden flush shared with pagehide; visible path
// uses a SERVER-FIRST fetch (.get()) \u2014 the old .once('value') was answered
// from the SDK's local cache while the realtime listener was attached, so the
// "refresh" never actually saw newer cloud data (root-cause contributor).
function flushPendingSaveOnHide() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
    }
    if (pendingSaveData && firebaseInitialized && currentUser && database && initialLoadComplete && hasLoadedFromCloud) {
        // Don't save empty data
        if (!isEmptyState(pendingSaveData)) {
            lastKnownSaveTime = pendingSaveData.lastSaved || lastKnownSaveTime;
            database.ref('users/' + currentUser.uid + '/appData').set(pendingSaveData)
                .then(() => { lastCloudContactTs = Date.now(); })
                .catch(err => console.error('Hidden save failed:', err));
        }
        pendingSaveData = null;
    }
}

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // Tab is being hidden - force save any pending changes
        flushPendingSaveOnHide();
    } else if (document.visibilityState === 'visible') {
        // Tab is visible again \u2014 pull-MERGE from the server. This tab may have
        // slept through hours of updates from other devices.
        if (firebaseInitialized && currentUser && database && initialLoadComplete) {
            const ref = database.ref('users/' + currentUser.uid + '/appData');
            const fetch = (typeof ref.get === 'function') ? ref.get() : ref.once('value');
            fetch.then(snapshot => {
                    const data = snapshot.val();
                    if (!data || isEmptyState(data)) return;
                    lastCloudContactTs = Date.now();
                    if (Math.abs((data.lastSaved || 0) - lastKnownSaveTime) <= 100) return;
                    try {
                        if (mergeRemoteAppData(data)) {
                            saveData(); // we held content the cloud lacked \u2014 push union up
                        } else {
                            showToast('\ud83d\udce5 Refreshed from cloud', '\ud83d\udd04');
                        }
                    } catch (e) {
                        console.error('Visibility merge error:', e);
                    }
                })
                .catch(err => console.error('Visibility refresh failed:', err));
        }
    }
});

// iOS Safari/Chrome often fire pagehide WITHOUT visibilitychange when the app
// is swiped away \u2014 the exact path that stranded the iPhone's morning edits
window.addEventListener('pagehide', flushPendingSaveOnHide);

// Handle coming back online - MERGE with cloud, then push if we owe changes.
// BULLETPROOF SYNC (Aug 2026): the old handler blind-`.set()` localStorage
// over the cloud \u2014 if another device saved while this one was offline, that
// wiped its changes. Now: server-first fetch \u2192 union merge \u2192 push the union.
window.addEventListener('online', function() {
    if (!firebaseInitialized || !currentUser || !database || !initialLoadComplete) {
        updateSyncStatus('connected', 'Online');
        return;
    }
    const owedPush = offlineSyncPending || localStorage.getItem('dentalQuestOfflineSyncPending') === 'true';
    if (owedPush) {
        showToast('\ud83d\udce4 Syncing offline changes...', '\ud83d\udd04');
    }
    const ref = database.ref('users/' + currentUser.uid + '/appData');
    const fetch = (typeof ref.get === 'function') ? ref.get() : ref.once('value');
    fetch.then(snapshot => {
            const data = snapshot.val();
            lastCloudContactTs = Date.now();
            let contributed = false;
            if (data && !isEmptyState(data) && Math.abs((data.lastSaved || 0) - lastKnownSaveTime) > 100) {
                try {
                    contributed = mergeRemoteAppData(data);
                } catch (e) {
                    console.error('Online-merge error:', e);
                }
            }
            if (contributed || owedPush) {
                offlineSyncPending = false;
                localStorage.removeItem('dentalQuestOfflineSyncPending');
                saveData();
                showToast('\u2713 Back online \u2014 changes synced!', '\u2705');
            }
            updateSyncStatus('connected', 'Online');
        })
        .catch(err => {
            console.error('Online sync fetch failed:', err);
            // Couldn't read the cloud \u2014 if we owe a push, still try the normal
            // guarded save path (it retries and keeps the offline flag on failure)
            if (owedPush) saveData();
        });
});

// Handle going offline
window.addEventListener('offline', function() {
    updateSyncStatus('offline', 'Offline - changes saved locally');
});

// Check on load if there are pending syncs from previous session
if (localStorage.getItem('dentalQuestOfflineSyncPending') === 'true') {
    offlineSyncPending = true;
}

// Periodic heartbeat every 2 minutes.
// BULLETPROOF SYNC (Aug 2026): the old heartbeat was an UNCONDITIONAL PUSH
// (saveData) — a tab waking from hours of sleep would stamp its stale state
// with a fresh lastSaved and clobber the cloud before ever pulling. That was
// THE root cause of the 2026-08-19 iPhone data loss. The heartbeat is now a
// PULL-MERGE: fetch server-first, union-merge any divergence, and only push
// when this device actually holds content the cloud lacks.
setInterval(() => {
    if (!initialLoadComplete || !firebaseInitialized || !currentUser || !database) return;

    // A pending/owed local save takes priority — flush it through the normal
    // guarded path (the stale-tab guard inside saveData pre-merges if needed)
    if (offlineSyncPending || pendingSaveData) {
        saveData();
        return;
    }

    const ref = database.ref('users/' + currentUser.uid + '/appData');
    const fetch = (typeof ref.get === 'function') ? ref.get() : ref.once('value');
    fetch.then(snapshot => {
            const data = snapshot.val();
            lastCloudContactTs = Date.now();
            if (!data || isEmptyState(data)) return;
            if (Math.abs((data.lastSaved || 0) - lastKnownSaveTime) <= 100) return;
            try {
                if (mergeRemoteAppData(data)) {
                    saveData(); // we held content the cloud lacked — push union up
                }
            } catch (e) {
                console.error('Heartbeat merge error:', e);
            }
        })
        .catch(() => { /* offline or transient — next beat retries */ });
}, 120000); // 2 minutes

// ============================================
// FIREBASE INIT EXECUTION
// ============================================
// NOTE: Firebase initialization is triggered from initApp() in init.js
// (after DOMContentLoaded, when all modules are loaded).
// Do NOT add auto-execution code here — it runs before later modules load.
