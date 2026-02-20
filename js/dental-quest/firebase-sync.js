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
// BUILD SAVE DATA — Single source of truth for save objects
// ============================================

function buildSaveData(saveTimestamp) {
    return {
        tasks: tasks || {},
        stats: stats,
        medications: medications,
        calendarNotes: calendarNotes || {},
        notebook: notebook,
        financials: financials,
        pillAssignments: pillAssignments,
        calendarEvents: calendarEvents || {},
        dailyPlanner: dailyPlanner,
        focusModeData: {
            oneThingId: focusModeData.oneThingId,
            microSteps: focusModeData.microSteps,
            todaysTasks: focusModeData.todaysTasks,
            lastPlanningDate: focusModeData.lastPlanningDate
            // Don't save timer state - it's local only
        },
        commandCenterData: {
            crashOut: commandCenterData.crashOut,
            focusStats: commandCenterData.focusStats,
            currentSession: {
                taskId: commandCenterData.currentSession.taskId,
                checklist: commandCenterData.currentSession.checklist,
                timerMinutes: commandCenterData.currentSession.timerMinutes,
                timerRemaining: commandCenterData.currentSession.timerRemaining,
                confirmedStarted: commandCenterData.currentSession.confirmedStarted,
                startedAt: commandCenterData.currentSession.startedAt
            }
        },
        lastCriticalEODReset: lastCriticalEODReset,
        _version: _version,
        _dataLoaded: true,
        lastSaved: saveTimestamp
    };
}

// ============================================
// LOAD DATA (localStorage)
// ============================================

function loadData() {
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
                    timerRemaining: null
                }
            };
        }

        // Load last critical EOD reset date
        if (data.lastCriticalEODReset) {
            lastCriticalEODReset = data.lastCriticalEODReset;
        }

        // BUG FIX #5: Set _dataLoaded after successful localStorage load
        _dataLoaded = true;

        updateStats();
        renderTasks();
        updateMedicationDisplay();
        // Check and apply daily pill auto-reduce
        checkAndApplyDailyPillReduce();
    }
    // Check for daily reset of Critical/EOD flags
    checkCriticalEODReset();

    // Always init focus mode
    initFocusMode();
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

            const dataToSave = pendingSaveData;
            pendingSaveData = null;

            // Update lastKnownSaveTime again in case it changed
            lastKnownSaveTime = dataToSave.lastSaved;

            // Remove old indicator if exists
            const oldIndicator = document.getElementById('savingIndicator');
            if (oldIndicator) oldIndicator.remove();

            // Show saving indicator
            const savingToast = document.createElement('div');
            savingToast.id = 'savingIndicator';
            savingToast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #3b82f6; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10050; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
            savingToast.textContent = '\u2601\ufe0f Syncing...';
            document.body.appendChild(savingToast);

            database.ref('users/' + currentUser.uid + '/appData').set(dataToSave)
                .then(() => {
                    savingToast.style.background = '#10b981';
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
                    savingToast.style.background = '#dc2626';
                    savingToast.textContent = '\u2717 Sync failed - Retrying...';
                    updateSyncStatus('error', 'Save failed - retrying...');

                    // Retry after 2 seconds
                    setTimeout(() => {
                        database.ref('users/' + currentUser.uid + '/appData').set(dataToSave)
                            .then(() => {
                                savingToast.style.background = '#10b981';
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
        savingToast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #3b82f6; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10050; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        savingToast.textContent = '\u2601\ufe0f Saving...';
        document.body.appendChild(savingToast);

        database.ref('users/' + currentUser.uid + '/appData').set(data)
            .then(() => {
                savingToast.style.background = '#10b981';
                savingToast.textContent = '\u2713 Saved!';
                setTimeout(() => savingToast.remove(), 2000);
            })
            .catch(err => {
                savingToast.style.background = '#dc2626';
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
    const name = prompt('Checkpoint name (optional):') || `Checkpoint ${new Date().toLocaleString()}`;
    if (name === null) return; // User cancelled

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
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    modal.innerHTML = `
        <div style="background:#1a1a2e;border-radius:16px;max-width:600px;width:90%;max-height:80vh;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.1);">
            <div style="padding:20px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;">
                <h2 style="margin:0;color:white;">\u2601\ufe0f Checkpoint Manager</h2>
                <button onclick="this.closest('.checkpoint-modal-overlay').remove()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">\u00d7</button>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1;">
                ${checkpoints.length === 0 ?
                    '<p style="color:#888;text-align:center;padding:40px;">No checkpoints yet. Create one first!</p>' :
                    `<p style="color:#888;margin-bottom:16px;">${checkpoints.length} checkpoint(s) saved</p>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        ${checkpoints.map((cp, i) => `
                            <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                                <div style="flex:1;min-width:200px;">
                                    <strong style="color:white;">${escapeHtmlLocal(cp.name)}</strong>
                                    <div style="color:#888;font-size:0.85em;margin-top:4px;">${new Date(cp.date || cp.timestamp).toLocaleString()}</div>
                                    <div style="color:#666;font-size:0.8em;">${cp.dataCount || ''}</div>
                                </div>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button onclick="restoreCheckpointByIndex(${i})" style="padding:8px 16px;background:#4CAF50;border:none;border-radius:8px;color:white;cursor:pointer;">Restore</button>
                                    <button onclick="exportCheckpointByIndex(${i})" style="padding:8px 16px;background:#2196F3;border:none;border-radius:8px;color:white;cursor:pointer;">Export</button>
                                    <button onclick="deleteCheckpointByIndex(${i})" style="padding:8px 12px;background:#f44336;border:none;border-radius:8px;color:white;cursor:pointer;">\ud83d\uddd1\ufe0f</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
            </div>
            <div style="padding:20px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <button onclick="createCheckpoint(); document.querySelector('.checkpoint-modal-overlay')?.remove();" style="padding:12px 24px;background:rgba(74,222,128,0.2);border:1px solid rgba(74,222,128,0.4);border-radius:12px;color:#4ade80;cursor:pointer;">+ Create New</button>
                <button onclick="document.getElementById('checkpointFileImport').click()" style="padding:12px 24px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;color:white;cursor:pointer;">\ud83d\udcc2 Import File</button>
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

    if (!confirm(`Restore checkpoint "${checkpoint.name}"?\n\nThis will replace your current data.`)) {
        return;
    }

    // Restore all data
    const data = checkpoint.data;

    if (data.tasks) tasks = migrateArrayToObject(data.tasks, 'task');
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

    if (!confirm(`Delete checkpoint "${checkpoint.name}"?`)) {
        return;
    }

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

            if (!confirm(confirmMessage)) return;

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
    const confirmClear = confirm(
        '\u26a0\ufe0f WARNING: This will permanently delete ALL your data!\n\n' +
        'This includes:\n' +
        '- All tasks\n' +
        '- All progress\n' +
        '- All XP\n' +
        '- All statistics\n\n' +
        'This action CANNOT be undone!\n\n' +
        'Are you absolutely sure?'
    );

    if (!confirmClear) return;

    // Double confirmation
    const doubleConfirm = confirm(
        'FINAL CONFIRMATION\n\n' +
        'You are about to delete everything. This cannot be undone.\n\n' +
        'Click OK to DELETE ALL DATA or Cancel to keep your data.'
    );

    if (!doubleConfirm) return;

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

    showToast('All data cleared', '\ud83d\uddd1\ufe0f');
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

        if (!userPin) {
            // First time - ask for PIN
            userPin = prompt('Create a 4-digit PIN to sync across devices:\n\n(Use the same PIN on all your devices - main app, D3 Roadmap, Sleep Tracker!)');

            if (!userPin || userPin.length < 4) {
                alert('PIN must be at least 4 characters. Using localStorage only.');
                loadData();
                markInitialLoadComplete();
                updateCategoryDisplay();
                return;
            }

            // Save to BOTH keys for full compatibility
            safeLocalStorageSet('dentalQuestPin', userPin);
            safeLocalStorageSet('dentalAppPin', userPin);
        }

        // Create a consistent user ID from the PIN
        const hashedPin = 'user_' + btoa(userPin).replace(/[^a-zA-Z0-9]/g, '');

        // Create a fake user object
        currentUser = {
            uid: hashedPin
        };
        firebaseInitialized = true;
        pinValidated = true;  // CRITICAL: Mark PIN as validated before any saves

        // Load data from Firebase
        loadDataFromFirebase();

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

                // CRITICAL: Set lastKnownSaveTime FIRST to prevent realtime sync from re-processing
                lastKnownSaveTime = data.lastSaved || Date.now();

                // Load all data with ARRAY PROTECTION (Firebase converts arrays to objects)
                tasks = migrateArrayToObject(data.tasks, 'task');

                if (data.stats) {
                    stats = {
                        ...stats,
                        totalXPGained: data.stats.totalXPGained || 0,
                        totalTasks: data.stats.totalTasks || 0,
                        categoryXPGained: {
                            ...stats.categoryXPGained,
                            ...(data.stats.categoryXPGained || {})
                        }
                    };
                }

                if (data.medications) {
                    medications = {
                        ...medications,
                        ...data.medications
                    };
                    // Ensure dosesLogged objects
                    if (medications['30mg']) {
                        medications['30mg'].dosesLogged = migrateDosesLoggedToObject(medications['30mg'].dosesLogged);
                    }
                    if (medications['20mg']) {
                        medications['20mg'].dosesLogged = migrateDosesLoggedToObject(medications['20mg'].dosesLogged);
                    }
                }

                if (data.calendarNotes) {
                    calendarNotes = data.calendarNotes;
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

                // Load pill assignments from Firebase
                if (data.pillAssignments) {
                    pillAssignments = {
                        '30mg': data.pillAssignments['30mg'] || {},
                        '20mg': data.pillAssignments['20mg'] || {}
                    };
                }

                // Load calendar events from Firebase with array protection
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

                // Load daily planner from Firebase with array protection
                if (data.dailyPlanner) {
                    dailyPlanner = {
                        date: data.dailyPlanner.date || null,
                        goal: data.dailyPlanner.goal || '',
                        bedtime: data.dailyPlanner.bedtime || '23:00',
                        blocks: migrateArrayToObject(data.dailyPlanner.blocks, 'block'),
                        lastReset: data.dailyPlanner.lastReset || null
                    };
                    checkPlannerReset();
                }

                // Load Focus Mode data from Firebase with migration to objects
                if (data.focusModeData) {
                    focusModeData = {
                        oneThingId: data.focusModeData.oneThingId || null,
                        microSteps: migrateArrayToObject(data.focusModeData.microSteps, 'step'),
                        todaysTasks: {
                            big: migrateTaskIdArrayToObject(data.focusModeData.todaysTasks?.big),
                            medium: migrateTaskIdArrayToObject(data.focusModeData.todaysTasks?.medium),
                            small: migrateTaskIdArrayToObject(data.focusModeData.todaysTasks?.small)
                        },
                        focusTimerSeconds: data.focusModeData.focusTimerSeconds || 0,
                        focusTimerRunning: false,
                        focusTimerInterval: null,
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
                            timerRemaining: null
                        }
                    };
                }

                // Load last reset date from Firebase (prevents duplicate resets across devices)
                if (data.lastCriticalEODReset) {
                    lastCriticalEODReset = data.lastCriticalEODReset;
                    // Also sync to localStorage for consistency
                    safeLocalStorageSet('lastCriticalEODReset', lastCriticalEODReset);
                }

                // Check for daily reset of Critical/EOD flags
                checkCriticalEODReset();

                updateStats();
                renderTasks();
                updateMedicationDisplay();

                // Check for daily pill auto-reduce (Firebase path)
                checkAndApplyDailyPillReduce();

                // Initialize Focus Mode after data loads
                initFocusMode();

                // Setup real-time sync for ALL data (includes planner)
                setupMainDataRealtimeSync();

                // Mark that we've loaded from cloud
                hasLoadedFromCloud = true;

                // BUG FIX #5: Set _dataLoaded after successful Firebase load
                _dataLoaded = true;

                // CRITICAL: Mark initial load as complete - now saves are allowed
                markInitialLoadComplete();

                showToast('Data loaded from cloud \u2601\ufe0f', '\u2705');
                updateSyncStatus('connected', `Synced (${getCount(tasks)} tasks)`);
            } else {
                // No cloud data, check localStorage
                loadData();

                // Mark that we've loaded from cloud (even though empty)
                hasLoadedFromCloud = true;

                updateSyncStatus('connected', 'No cloud data yet');
                // Mark load complete after localStorage load
                markInitialLoadComplete();
            }
        })
        .catch((error) => {
            console.error('Firebase load error:', error);
            updateSyncStatus('error', 'Load failed: ' + error.message);
            loadData(); // Fallback

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
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    const localTasks = getValues(localData.tasks).filter(t => !t.completed).length;
    const remoteTasks = getValues(remoteData.tasks).filter(t => !t.completed).length;
    const localTime = localData.lastSaved ? new Date(localData.lastSaved).toLocaleTimeString() : 'Unknown';
    const remoteTime = remoteData.lastSaved ? new Date(remoteData.lastSaved).toLocaleTimeString() : 'Unknown';

    modal.innerHTML = `
        <div style="background:#161b22;border-radius:16px;padding:24px;max-width:450px;width:90%;border:1px solid #30363d;">
            <h3 style="color:#f0883e;margin:0 0 16px 0;font-size:1.2em;">\u26a0\ufe0f Sync Conflict Detected</h3>
            <p style="color:#8b949e;margin-bottom:20px;">Changes were made on another device. Which version do you want to keep?</p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div style="background:#21262d;padding:16px;border-radius:8px;border:2px solid transparent;cursor:pointer;" onclick="this.style.borderColor='#238636'" id="keepLocal">
                    <div style="color:#58a6ff;font-weight:600;margin-bottom:8px;">\ud83d\udcf1 This Device</div>
                    <div style="color:#8b949e;font-size:0.85em;">
                        ${localTasks} active tasks<br>
                        Last saved: ${localTime}
                    </div>
                </div>
                <div style="background:#21262d;padding:16px;border-radius:8px;border:2px solid transparent;cursor:pointer;" onclick="this.style.borderColor='#238636'" id="keepRemote">
                    <div style="color:#a371f7;font-weight:600;margin-bottom:8px;">\u2601\ufe0f Cloud</div>
                    <div style="color:#8b949e;font-size:0.85em;">
                        ${remoteTasks} active tasks<br>
                        Last saved: ${remoteTime}
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:10px;">
                <button onclick="window.resolveSyncConflict('local')" style="flex:1;padding:12px;background:#238636;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Keep This Device</button>
                <button onclick="window.resolveSyncConflict('remote')" style="flex:1;padding:12px;background:#8957e5;border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;">Keep Cloud</button>
            </div>
            <button onclick="window.resolveSyncConflict('merge')" style="width:100%;margin-top:10px;padding:10px;background:#30363d;border:1px solid #484f58;border-radius:8px;color:#8b949e;cursor:pointer;">Try to Merge Both</button>
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
            text.style.color = '#86efac';
            break;
        case 'syncing':
            icon.textContent = '\ud83d\udd04';
            text.textContent = message || 'Syncing...';
            text.style.color = '#93c5fd';
            break;
        case 'offline':
            icon.textContent = '\ud83d\udd34';
            text.textContent = message || 'Offline (local only)';
            text.style.color = '#fca5a5';
            break;
        case 'error':
            icon.textContent = '\u26a0\ufe0f';
            text.textContent = message || 'Sync error';
            text.style.color = '#fcd34d';
            break;
        default:
            icon.textContent = '\u23f3';
            text.textContent = message || 'Connecting...';
            text.style.color = 'white';
    }

    // Update compact header sync dot
    if (typeof updateSyncDot === 'function') updateSyncDot(status);
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
                timerRemaining: null
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

    // Save to localStorage as backup
    safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));

    // Re-render ALL UI
    updateStats();
    renderTasks();
    updateMedicationDisplay();

    // Check for daily pill auto-reduce (sync/pull path)
    checkAndApplyDailyPillReduce();

    if (currentView === 'focus') {
        renderFocusMode();
    }
}

// ============================================
// FORCE UPLOAD / FORCE PULL
// ============================================

function forceUploadToCloud() {
    if (!firebaseInitialized || !currentUser || !database) {
        showToast('\u274c Not connected to cloud', '\u26a0\ufe0f');
        return;
    }

    if (!confirm('\u26a0\ufe0f Force Upload\n\nThis will OVERWRITE all cloud data with your local data.\n\nAre you sure?')) {
        return;
    }

    updateSyncStatus('syncing', 'Uploading...');

    const saveTimestamp = Date.now();
    lastKnownSaveTime = saveTimestamp;

    const data = buildSaveData(saveTimestamp);

    database.ref('users/' + currentUser.uid + '/appData').set(data)
        .then(() => {
            safeLocalStorageSet('dentalStudentQuestData', JSON.stringify(data));
            updateSyncStatus('connected', 'Force uploaded \u2713');
            showToast('\u2b06\ufe0f Force uploaded to cloud', '\u2601\ufe0f');
        })
        .catch(err => {
            console.error('Force upload failed:', err);
            updateSyncStatus('error', 'Upload failed');
            showToast('\u274c Upload failed: ' + err.message, '\u26a0\ufe0f');
        });
}

function forcePullFromCloud() {
    if (!firebaseInitialized || !currentUser || !database) {
        showToast('\u274c Not connected to cloud', '\u26a0\ufe0f');
        return;
    }

    if (!confirm('\u26a0\ufe0f Force Pull\n\nThis will OVERWRITE all local data with cloud data.\n\nAre you sure?')) {
        return;
    }

    updateSyncStatus('syncing', 'Pulling...');

    database.ref('users/' + currentUser.uid + '/appData').once('value')
        .then(snapshot => {
            const data = snapshot.val();

            if (!data) {
                showToast('\u26a0\ufe0f No cloud data found', '\u2601\ufe0f');
                updateSyncStatus('connected', 'No cloud data');
                return;
            }

            // Full overwrite - apply all remote data
            applyRemoteData(data);

            updateSyncStatus('connected', 'Force pulled \u2713');
            showToast('\u2b07\ufe0f Pulled from cloud', '\u2601\ufe0f');
        })
        .catch(err => {
            console.error('Force pull failed:', err);
            updateSyncStatus('error', 'Pull failed');
            showToast('\u274c Pull failed: ' + err.message, '\u26a0\ufe0f');
        });
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
        tasksCount: getCount(tasks)
    };
};

window.resetSyncPin = function() {
    const currentPin = localStorage.getItem('dentalQuestPin') || localStorage.getItem('dentalAppPin');

    const newPin = prompt('Enter your sync PIN:\n\n\u26a0\ufe0f Use the SAME PIN on ALL devices!\n\nCurrent PIN ends with: ' + (currentPin ? currentPin.slice(-2) : 'N/A'));

    if (newPin && newPin.length >= 4) {
        safeLocalStorageSet('dentalQuestPin', newPin);
        safeLocalStorageSet('dentalAppPin', newPin);
        alert('PIN updated! The page will now reload to connect with your new PIN.');
        window.location.reload();
    } else {
        alert('PIN must be at least 4 characters. No changes made.');
    }
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

        // Only process if this is a NEW update (strictly newer timestamp)
        // Use a small buffer (100ms) to handle near-simultaneous saves
        if (incomingTime <= lastKnownSaveTime + 100) {
            return;
        }

        // CONSOLIDATION: Use applyRemoteData instead of inline merge
        applyRemoteData(data);

        showToast('\ud83d\udce5 Synced from another device', '\ud83d\udd04');
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
// CONSOLIDATION: Visibility handler uses applyRemoteData() instead of inline merge
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // Tab is being hidden - force save any pending changes
        // GUARD: Only save if we have completed initial load and have real data
        if (saveDebounceTimer) {
            clearTimeout(saveDebounceTimer);
            saveDebounceTimer = null;
        }
        if (pendingSaveData && firebaseInitialized && currentUser && database && initialLoadComplete && hasLoadedFromCloud) {
            // Don't save empty data
            if (!isEmptyState(pendingSaveData)) {
                database.ref('users/' + currentUser.uid + '/appData').set(pendingSaveData)
                    .catch(err => console.error('Hidden save failed:', err));
            }
            pendingSaveData = null;
        }
    } else if (document.visibilityState === 'visible') {
        // Tab is visible again - refresh from Firebase to get any updates
        // GUARD: Only refresh if we've completed initial load
        if (firebaseInitialized && currentUser && database && initialLoadComplete) {
            database.ref('users/' + currentUser.uid + '/appData').once('value')
                .then(snapshot => {
                    const data = snapshot.val();
                    if (!data || isEmptyState(data)) return;
                    const incomingTime = data.lastSaved || 0;
                    if (incomingTime > lastKnownSaveTime) {
                        applyRemoteData(data);
                        showToast('\ud83d\udce5 Refreshed from cloud', '\ud83d\udd04');
                    }
                })
                .catch(err => console.error('Visibility refresh failed:', err));
        }
    }
});

// Handle coming back online - sync any pending changes
window.addEventListener('online', function() {
    if (localStorage.getItem('dentalQuestOfflineSyncPending') === 'true' || offlineSyncPending) {
        showToast('\ud83d\udce4 Syncing offline changes...', '\ud83d\udd04');
        // Force a fresh save which will push all current data to Firebase
        if (firebaseInitialized && currentUser && database) {
            const data = JSON.parse(localStorage.getItem('dentalStudentQuestData') || '{}');
            if (Object.keys(data).length > 0) {
                database.ref('users/' + currentUser.uid + '/appData').set(data)
                    .then(() => {
                        offlineSyncPending = false;
                        localStorage.removeItem('dentalQuestOfflineSyncPending');
                        updateSyncStatus('connected', 'Synced');
                        showToast('\u2713 Offline changes synced!', '\u2705');
                    })
                    .catch(err => {
                        console.error('Online sync failed:', err);
                        showToast('Sync failed - will retry', '\u26a0\ufe0f');
                    });
            }
        }
    } else {
        updateSyncStatus('connected', 'Online');
    }
});

// Handle going offline
window.addEventListener('offline', function() {
    updateSyncStatus('offline', 'Offline - changes saved locally');
});

// Check on load if there are pending syncs from previous session
if (localStorage.getItem('dentalQuestOfflineSyncPending') === 'true') {
    offlineSyncPending = true;
}

// Periodic heartbeat save every 2 minutes to ensure data is synced
setInterval(() => {
    if (initialLoadComplete && firebaseInitialized) {
        saveData();
    }
}, 120000); // 2 minutes

// ============================================
// FIREBASE INIT EXECUTION
// ============================================

// Check if Firebase config is set, otherwise use localStorage
if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    initializeFirebase();
} else {
    loadData();
    markInitialLoadComplete();
    updateCategoryDisplay();
}

// DON'T call loadData() again here - it will overwrite Firebase data!
// loadData() is already called in initializeFirebase() -> loadDataFromFirebase()

// Only set up category display
updateCategoryDisplay();
