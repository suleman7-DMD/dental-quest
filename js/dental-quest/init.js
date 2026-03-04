// ============================================
// INIT.JS — Final wiring layer
// Quick Add FAB, Compact Header, Help, App Init
// ============================================

// ==================== QUICK ADD PANEL ====================
var qaSelectedCategory = localStorage.getItem('qaLastCategory') || 'health';
var qaSelectedSize = 'medium';
var qaDoToday = false;
var qaHighLeverage = false;
var quickAddUrgency = 'inbox';

function openQuickAddPanel() {
    document.getElementById('quickAddBackdrop').classList.add('visible');
    document.getElementById('quickAddPanel').classList.add('open');
    document.getElementById('quickAddFAB').classList.add('panel-open');
    // Pre-select category from current tab (if viewing a specific category)
    var realCategories = ['financial', 'clinic', 'health', 'school', 'academic', 'future', 'life'];
    if (currentCategory && realCategories.indexOf(currentCategory) !== -1) {
        selectQACategory(currentCategory);
    }
    // Reset urgency picker to inbox on open
    quickAddUrgency = 'inbox';
    var urgPills = document.querySelectorAll('.qa-urgency-pill');
    urgPills.forEach(function(p) {
        p.classList.toggle('active', p.getAttribute('data-urgency') === 'inbox');
    });
    setTimeout(function() { document.getElementById('qaTaskInput').focus(); }, 300);
}

function closeQuickAddPanel() {
    document.getElementById('quickAddBackdrop').classList.remove('visible');
    document.getElementById('quickAddPanel').classList.remove('open');
    document.getElementById('quickAddFAB').classList.remove('panel-open');
    document.getElementById('qaTaskInput').value = '';
}

function selectQACategory(cat) {
    qaSelectedCategory = cat;
    safeLocalStorageSet('qaLastCategory', cat);
    document.querySelectorAll('#qaCategoryPills .qa-pill').forEach(function(p) {
        p.classList.toggle('selected', p.getAttribute('data-cat') === cat);
    });
}

function selectQASize(size) {
    qaSelectedSize = size;
    document.querySelectorAll('.qa-size-btn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-size') === size);
    });
}

function toggleQADoToday() {
    qaDoToday = !qaDoToday;
    document.getElementById('qaDoTodayToggle').classList.toggle('active', qaDoToday);
}

function toggleQALeverage() {
    qaHighLeverage = !qaHighLeverage;
    document.getElementById('qaHighLeverageToggle').classList.toggle('active', qaHighLeverage);
}

function submitQuickAdd() {
    var input = document.getElementById('qaTaskInput');
    var text = input.value.trim();
    if (!text) return;

    var id = generateId('task');
    var task = {
        id: id,
        text: text,
        category: qaSelectedCategory,
        completed: false,
        doToday: qaDoToday || quickAddUrgency === 'eod' || quickAddUrgency === 'soon',
        createdAt: new Date().toISOString(),
        size: qaSelectedSize,
        highLeverage: qaHighLeverage,
        sortOrder: getCount(tasks),
        urgency: quickAddUrgency || 'inbox',
        triageTier: quickAddUrgency === 'eod' ? 'lockedIn' : quickAddUrgency === 'soon' ? 'today' : quickAddUrgency === 'week' ? 'tomorrow' : null
    };

    tasks[id] = task;
    input.value = '';
    rerenderCurrentView();
    if (typeof renderFocusMode === 'function' && currentView === 'focus') renderFocusMode();
    updateStats();
    saveData();
    showToast('Task added to ' + qaSelectedCategory, '\u2705');
}

function initQuickAddPanel() {
    selectQACategory(qaSelectedCategory);
    selectQASize(qaSelectedSize);
}

function setQuickAddUrgency(urg) {
    quickAddUrgency = urg;
    var pills = document.querySelectorAll('.qa-urgency-pill');
    pills.forEach(function(p) {
        p.classList.toggle('active', p.getAttribute('data-urgency') === urg);
    });
}

// ==================== HELP MODAL ====================

function showHelp() {
    var modal = document.getElementById('helpModal');
    if (!modal) return;
    ensureModalOnBody(modal);
    _modalOpenTime = Date.now();
    modal.classList.add('show');
}

function closeHelp() {
    document.getElementById('helpModal').classList.remove('show');
}

// ==================== SIDEBAR TOGGLE (mobile) ====================

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;
    var isOpen = sidebar.classList.contains('open');
    sidebar.classList.toggle('open', !isOpen);
    if (backdrop) backdrop.classList.toggle('open', !isOpen);
    // Lock body scroll when sidebar is open on mobile
    document.body.style.overflow = !isOpen ? 'hidden' : '';
}

function updateSidebarSyncStatus(status, text) {
    var dot = document.getElementById('sidebarSyncDot');
    var textEl = document.getElementById('sidebarSyncText');
    var topDot = document.getElementById('topBarSyncDot');
    var topText = document.getElementById('topBarSyncText');

    if (dot) {
        dot.classList.remove('syncing', 'offline', 'error');
        if (status === 'syncing') dot.classList.add('syncing');
        else if (status === 'offline') dot.classList.add('offline');
        else if (status === 'error') dot.classList.add('error');
    }
    if (textEl && text) textEl.textContent = text;

    if (topDot) {
        topDot.classList.remove('syncing', 'offline', 'error');
        if (status === 'syncing') topDot.classList.add('syncing');
        else if (status === 'offline') topDot.classList.add('offline');
        else if (status === 'error') topDot.classList.add('error');
    }
    if (topText) {
        if (text) topText.textContent = text;
        else if (status === 'connected') topText.textContent = 'Synced';
        else if (status === 'syncing') topText.textContent = 'Syncing...';
        else if (status === 'offline') topText.textContent = 'Offline';
        else if (status === 'error') topText.textContent = 'Error';
    }
}

// ==================== COMPACT HEADER ====================

function toggleHeaderMenu() {
    var panel = document.getElementById('headerMenuPanel');
    var backdrop = document.getElementById('headerMenuBackdrop');
    if (!panel) return;
    var isOpen = panel.classList.contains('open');
    panel.classList.toggle('open', !isOpen);
    if (backdrop) backdrop.classList.toggle('open', !isOpen);
    if (!isOpen) updateMenuStats();
}

function updateSyncDot(status) {
    var dot = document.getElementById('syncDot');
    if (!dot) return;
    dot.classList.remove('syncing', 'offline', 'error');
    if (status === 'syncing') dot.classList.add('syncing');
    else if (status === 'offline') dot.classList.add('offline');
    else if (status === 'error') dot.classList.add('error');
    // Default (connected) has no extra class = green
}

function updateMenuStats() {
    var xpEl = document.getElementById('menuXP');
    var availEl = document.getElementById('menuAvailable');
    var remEl = document.getElementById('menuRemaining');
    var compEl = document.getElementById('menuCompleted');
    if (xpEl) xpEl.textContent = (document.getElementById('totalXPGained') || {}).textContent || '0';
    if (availEl) availEl.textContent = (document.getElementById('totalXPAvailable') || {}).textContent || '0';
    if (remEl) remEl.textContent = (document.getElementById('tasksRemaining') || {}).textContent || '0';
    if (compEl) compEl.textContent = (document.getElementById('totalTasks') || {}).textContent || '0';
}

function updateCompactHeader() {
    // Mirror Do Today count
    var doTodayVal = document.getElementById('tasksToDoToday');
    var headerDoToday = document.getElementById('headerDoToday');
    if (doTodayVal && headerDoToday) headerDoToday.textContent = doTodayVal.textContent;

    // Mirror streak count
    var streakVal = document.getElementById('streakCount');
    var headerStreak = document.getElementById('headerStreakCount');
    if (streakVal && headerStreak) headerStreak.textContent = streakVal.textContent;
}

// ==================== APP INITIALIZATION ====================

function initApp() {
    try {
        // Initialize Firebase (or fall back to localStorage)
        // This must run here (not at firebase-sync.js parse time) because
        // initializeFirebase() calls functions defined in later-loaded modules
        if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
            initializeFirebase();
        } else {
            loadData();
            markInitialLoadComplete();
        }

        // Set up initial category display (matches original monolith line 1933)
        updateCategoryDisplay();

        // Failsafe: Hide loading overlay after 10 seconds no matter what
        setTimeout(function() {
            var overlay = document.getElementById('loadingOverlay');
            if (overlay && overlay.style.display !== 'none') {
                console.warn('Loading timeout - forcing overlay hide');
                overlay.style.display = 'none';
                if (!initialLoadComplete) {
                    loadData();
                    // CRITICAL: Set ALL sync flags so saves work with localStorage data
                    hasLoadedFromCloud = true;
                    markInitialLoadComplete();
                    updateSyncStatus('offline', 'Loaded locally (timeout)');
                    try {
                        updateStats();
                        renderTasks();
                        if (typeof renderKanbanBoard === 'function' && currentViewMode === 'kanban') {
                            renderKanbanBoard();
                        }
                        if (typeof initFocusMode === 'function') initFocusMode();
                    } catch (e) {
                        console.error('Failsafe render error:', e);
                    }
                }
            }
        }, 10000);

        // Create backup every 5 minutes
        setInterval(function() { BackupManager.createBackup(); }, 5 * 60 * 1000);

        // Global escape key handler to close any open modal (priority-ordered)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // 1. Custom alert/confirm/prompt (highest priority — topmost layer)
                var customModal = document.querySelector('.custom-modal-overlay');
                if (customModal) { customModal.remove(); return; }

                // 2. Checkpoint manager
                var checkpoint = document.querySelector('.checkpoint-modal-overlay');
                if (checkpoint) { checkpoint.remove(); return; }

                // 3. Task details modal
                var taskDetails = document.getElementById('taskDetailsModal');
                if (taskDetails) { taskDetails.remove(); return; }

                // 4. Task edit modal
                var taskEditModal = document.getElementById('taskEditModal');
                if (taskEditModal && taskEditModal.style.display !== 'none') { closeTaskEditModal(); return; }

                // 5. Planning modal
                var planningModal = document.getElementById('planningModal');
                if (planningModal && planningModal.style.display !== 'none') { closePlanningModal(); return; }

                // 6. Time prompt
                var timePrompt = document.getElementById('timePromptModal');
                if (timePrompt) { if (typeof dismissTimePrompt === 'function') dismissTimePrompt(); else timePrompt.remove(); return; }

                // 7. Duration modal
                var durationModal = document.querySelector('.duration-modal');
                if (durationModal) { if (typeof closeDurationModal === 'function') closeDurationModal(); else durationModal.remove(); return; }

                // 8. Focus timer complete
                var focusComplete = document.getElementById('focusTimerCompleteModal');
                if (focusComplete && focusComplete.style.display !== 'none') { if (typeof hideFocusCompleteModal === 'function') hideFocusCompleteModal(); return; }

                // 9. Static modals (.modal-overlay.show)
                var modals = document.querySelectorAll('.modal-overlay.show, .help-modal-overlay.show');
                if (modals.length > 0) { modals.forEach(function(m) { m.classList.remove('show'); }); return; }

                // 10. Dashboard expansions (lowest priority)
                closeAllExpansions();
            }
        });

        // Category selection tab listeners
        document.querySelectorAll('.category-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.category-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                currentCategory = tab.dataset.category;
                updateCategoryDisplay();
                renderTasks();
            });
        });

        // Enter key to add task
        var taskInputElement = document.getElementById('taskInput');
        if (taskInputElement) {
            taskInputElement.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') addTask();
            });
        }

        // Restore persisted view state (category filter pills, view mode buttons)
        if (currentCategory && currentCategory !== 'all') {
            document.querySelectorAll('#categoryFilters .cfp').forEach(function(p) {
                p.classList.toggle('active', p.getAttribute('data-category') === currentCategory);
            });
        }
        if (currentViewMode) {
            var listBtn = document.getElementById('listViewBtn');
            var kanbanBtn = document.getElementById('kanbanViewBtn');
            if (listBtn) listBtn.classList.toggle('active', currentViewMode === 'list');
            if (kanbanBtn) kanbanBtn.classList.toggle('active', currentViewMode === 'kanban');
        }

        // Focus mode init
        if (typeof initFocusMode === 'function') initFocusMode();
        if (typeof handleResponsiveLayout === 'function') {
            handleResponsiveLayout();
            window.addEventListener('resize', handleResponsiveLayout);
        }

        // Daily reset checks
        if (typeof checkCriticalEODReset === 'function') checkCriticalEODReset();
        if (typeof checkPlannerReset === 'function') checkPlannerReset();
        if (typeof checkAndProcessRollovers === 'function') checkAndProcessRollovers();

        // Quick Add panel
        initQuickAddPanel();

        // Compact header initial update
        updateCompactHeader();

        // Sidebar responsive setup
        initSidebarResponsive();
        window.addEventListener('resize', initSidebarResponsive);

        // Initialize Lucide icons (replaces emoji with SVG icons)
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

    } catch (e) {
        console.error('Init error:', e);
        try { loadData(); markInitialLoadComplete(); } catch (e2) { /* last resort */ }
    }
}

// ==================== SIDEBAR RESPONSIVE ====================

function initSidebarResponsive() {
    var menuBtn = document.getElementById('sidebarMenuBtn');
    if (window.innerWidth <= 768) {
        // Mobile: show hamburger in top bar
        if (menuBtn) menuBtn.style.display = 'flex';
    } else {
        // Desktop/tablet: hide hamburger, ensure sidebar is closed (not in drawer mode)
        if (menuBtn) menuBtn.style.display = 'none';
        var sidebar = document.getElementById('sidebar');
        var backdrop = document.getElementById('sidebarBackdrop');
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
    }
}

// Register init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
