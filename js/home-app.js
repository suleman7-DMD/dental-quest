// ============================================================================
// home-app.js — the suite's Home Screen app layer (Dental Quest, Body Comp,
// Sully Calendar). Included with data attributes, e.g.
//   <script src="js/home-app.js?v=…" data-app="quest" data-name="Dental Quest"
//     data-icon="icons/quest-180.png" data-sw="home-sw.js" data-scope="index.html"
//     data-theme="light"></script>
// (data-sw omitted = the page registers its own worker; data-hint="0" = no hint)
//
// 1. Offline launch + always-fresh cold launch: registers the network-first
//    service worker (skipped under automation unless ?swtest — a worker would
//    fetch around the tests' fake-Firebase routing).
// 2. Always the latest deploy: iOS can keep a suspended Home Screen app on an
//    old page for days. On every return to the foreground (and every 30 min
//    while open) it asks the server whether a newer deploy exists — a HEAD with
//    no-store; GitHub Pages stamps every file's Last-Modified per deploy — and
//    reloads: automatically when the app was away 10+ min and nothing is open
//    or unsaved, otherwise via a "New version" chip. Apps report unsaved work
//    through window.homeAppBusy() → true.
// 3. Install hint in iPhone Safari/Chrome (once per device, dismissable).
// No app state is read or written here.
// ============================================================================
(function() {
    var me = document.currentScript;
    var cfg = me ? me.dataset : {};
    var APP = cfg.app || 'app';
    var NAME = cfg.name || document.title;
    var DARK = cfg.theme === 'dark';
    var AUTO_RELOAD_AWAY_MS = 10 * 60 * 1000;
    var POLL_MS = 30 * 60 * 1000;
    var automated = !!navigator.webdriver && !/[?&]swtest\b/.test(location.search);

    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
    function isStandalone() {
        try { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; }
    }
    function isIOS() {
        var ua = navigator.userAgent || '';
        return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // ------------------------------------------------------------ styles
    // the chip is centred with margins, never transform: host pages' button:active
    // transforms (Dental Quest scales every pressed button) would shove it mid-tap
    var css = '.ha-chip,.ha-hint,.ha-sheet{font:15px/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}' +
        '.ha-chip{position:fixed;left:0;right:0;margin:0 auto;width:max-content;max-width:calc(100% - 32px);box-sizing:border-box;bottom:calc(18px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:8px;padding:10px 16px 10px 12px;border:0;border-radius:999px;' +
        'background:' + (DARK ? '#f1f5f9;color:#0f172a' : '#2c2825;color:#fff') + ';box-shadow:0 8px 28px rgba(0,0,0,.28);font-weight:600;white-space:nowrap;cursor:pointer;animation:haUp .28s cubic-bezier(.2,.9,.3,1)}' +
        '.ha-chip svg{width:18px;height:18px;flex:none}' +
        '.ha-hint{position:fixed;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147482999;display:flex;align-items:center;gap:12px;padding:10px 10px 10px 12px;border-radius:18px;max-width:480px;margin:0 auto;' +
        'background:' + (DARK ? 'rgba(30,41,59,.96);color:#f1f5f9;border:1px solid #334155' : 'rgba(255,255,255,.97);color:#2c2825;border:1px solid #e7e1d8') + ';box-shadow:0 10px 30px rgba(0,0,0,.22);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);animation:haUp .3s cubic-bezier(.2,.9,.3,1)}' +
        '.ha-hint img{width:40px;height:40px;border-radius:10px;flex:none}' +
        '.ha-hint-t{flex:1;min-width:0;display:flex;flex-direction:column}.ha-hint-t b{font-size:15px}.ha-hint-t span{font-size:13px;opacity:.72}' +
        '.ha-btn{border:0;border-radius:999px;padding:8px 14px;font:600 14px/1 inherit;cursor:pointer;background:' + (DARK ? '#10b981;color:#04120c' : '#6B7C5E;color:#fff') + '}' +
        '.ha-x{border:0;background:transparent;color:inherit;opacity:.6;width:32px;height:32px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer}' +
        '.ha-back{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;animation:haFade .2s}' +
        '.ha-sheet{width:100%;max-width:520px;border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));' +
        'background:' + (DARK ? '#1e293b;color:#f1f5f9' : '#fff;color:#2c2825') + ';animation:haUp .28s cubic-bezier(.2,.9,.3,1)}' +
        '.ha-sheet h2{margin:0 0 6px;font-size:20px;display:flex;align-items:center;gap:12px}.ha-sheet h2 img{width:44px;height:44px;border-radius:11px}' +
        '.ha-sheet p{margin:0 0 14px;opacity:.75}.ha-sheet ol{margin:0 0 18px;padding-left:22px;display:flex;flex-direction:column;gap:10px}.ha-sheet li b{font-weight:600}' +
        '.ha-sheet .ha-btn{width:100%;padding:13px;font-size:16px}' +
        '.ha-ic{display:inline-block;width:18px;height:18px;vertical-align:-3px;margin:0 2px}' +
        '@keyframes haUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}@keyframes haFade{from{opacity:0}to{opacity:1}}';
    function injectCss() {
        if (document.getElementById('ha-css')) return;
        var s = document.createElement('style');
        s.id = 'ha-css';
        s.textContent = css;
        document.head.appendChild(s);
    }
    var SHARE_IC = '<svg class="ha-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
    var ADD_IC = '<svg class="ha-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
    var RELOAD_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';

    // ------------------------------------------------------------ service worker
    function registerWorker() {
        if (!cfg.sw || automated || !('serviceWorker' in navigator) || !window.isSecureContext) return;
        navigator.serviceWorker.register(cfg.sw, { scope: cfg.scope || './' }).then(function() {
            return navigator.serviceWorker.ready;
        }).then(function(reg) {
            if (!reg.active) return;
            var urls = [location.href.split('#')[0]];
            try { performance.getEntriesByType('resource').forEach(function(r) { urls.push(r.name); }); } catch (e) {}
            reg.active.postMessage({ type: 'precache', urls: urls });
        }).catch(function(e) { console.warn('Service worker not registered:', e && e.message); });
    }

    // ------------------------------------------------------------ latest deploy
    var bootLM = Date.parse(document.lastModified);
    var hiddenAt = document.visibilityState === 'hidden' ? Date.now() : 0;
    var checking = false, chip = null, lastPoll = Date.now();

    function busy() {
        try { if (typeof window.homeAppBusy === 'function' && window.homeAppBusy()) return true; } catch (e) {}
        var a = document.activeElement;
        if (a && (a.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !/^(checkbox|radio|button|submit|range)$/.test(a.type)))) return true;
        // any dialog / sheet on screen = the user is in the middle of something
        var open = document.querySelectorAll('[role=dialog],[aria-modal=true],[class*=modal],[id*=Modal],[class*=overlay],[id*=verlay],[class*=sheet],[id*=Panel]');
        for (var i = 0; i < open.length; i++) {
            var el = open[i];
            if (el.closest && el.closest('.ha-back')) continue;
            var r = el.getBoundingClientRect();
            if (r.width < 40 || r.height < 40 || r.bottom <= 0 || r.top >= window.innerHeight) continue;
            var st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
            if (st.position === 'fixed' || st.position === 'absolute') return true;
        }
        return false;
    }

    function serverLastModified() {
        return fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' }).then(function(r) {
            return r.ok ? Date.parse(r.headers.get('Last-Modified') || '') : NaN;
        });
    }

    function reloadNow(lm) {
        try { sessionStorage.setItem('homeAppReloadedFor', String(lm)); } catch (e) {}
        location.reload();
    }

    function showChip(lm) {
        if (chip) return;
        injectCss();
        chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ha-chip';
        chip.setAttribute('aria-label', 'A new version is ready — tap to update');
        chip.innerHTML = RELOAD_IC + '<span>New version — tap to update</span>';
        chip.addEventListener('click', function() { reloadNow(lm); });
        document.body.appendChild(chip);
    }

    // auto: a few tries to let the app finish its own foreground sync first
    function tryAutoReload(lm, attempt) {
        if (document.visibilityState !== 'visible') return;
        if (!busy()) { reloadNow(lm); return; }
        if (attempt < 3) setTimeout(function() { tryAutoReload(lm, attempt + 1); }, [1500, 3000, 5000][attempt]);
        else showChip(lm);
    }

    function checkForUpdate(awayMs) {
        if (checking || chip || !navigator.onLine || !isFinite(bootLM)) return Promise.resolve(false);
        checking = true;
        lastPoll = Date.now();
        return serverLastModified().then(function(lm) {
            checking = false;
            if (!isFinite(lm) || lm - bootLM < 2000) return false;
            var already = false;
            try { already = sessionStorage.getItem('homeAppReloadedFor') === String(lm); } catch (e) {}
            // already reloaded for this deploy but still served the old page (edge cache) — ask, don't loop
            if (!already && awayMs >= AUTO_RELOAD_AWAY_MS) setTimeout(function() { tryAutoReload(lm, 0); }, 1500);
            else showChip(lm);
            return true;
        }, function() { checking = false; return false; });
    }

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
        var away = hiddenAt ? Date.now() - hiddenAt : 0;
        hiddenAt = 0;
        checkForUpdate(away);
    });
    window.addEventListener('pageshow', function(e) { if (e.persisted) checkForUpdate(AUTO_RELOAD_AWAY_MS); });
    setInterval(function() {
        if (document.visibilityState === 'visible' && Date.now() - lastPoll >= POLL_MS) checkForUpdate(0);
    }, 60 * 1000);

    // ------------------------------------------------------------ install hint
    function installSteps() {
        var chrome = /CriOS/.test(navigator.userAgent || '');
        return '<ol>' +
            (chrome ? '<li>Tap ' + SHARE_IC + ' <b>Share</b> at the right end of Chrome\'s address bar</li>'
                : '<li>Tap ' + SHARE_IC + ' <b>Share</b> in Safari (on newer iOS it\'s inside the <b>•••</b> button)</li>') +
            '<li>Scroll the sheet and tap ' + ADD_IC + ' <b>Add to Home Screen</b></li>' +
            '<li>Leave <b>Open as Web App</b> on if you see it, then tap <b>Add</b></li>' +
            '<li>Open <b>' + NAME + '</b> from your Home Screen and enter your PIN once — it keeps its own copy and syncs like everywhere else</li></ol>';
    }
    function showInstallHelp() {
        injectCss();
        var back = document.createElement('div');
        back.className = 'ha-back';
        back.innerHTML = '<div class="ha-sheet" role="dialog" aria-modal="true" aria-label="Add to Home Screen">' +
            '<h2>' + (cfg.icon ? '<img src="' + cfg.icon + '" alt="">' : '') + 'Put ' + NAME + ' on your Home Screen</h2>' +
            '<p>It opens full-screen like a real app — no address bar, one tap away, opens with no signal, and always runs the latest version.</p>' +
            installSteps() + '<button type="button" class="ha-btn">Got it</button></div>';
        var close = function() { if (back.parentNode) back.parentNode.removeChild(back); };
        back.addEventListener('click', function(e) { if (e.target === back) close(); });
        back.querySelector('.ha-btn').addEventListener('click', close);
        document.body.appendChild(back);
    }
    var hintTries = 0;
    function maybeShowHint() {
        if (cfg.hint === '0' || !isIOS() || isStandalone() || store('homeAppHintDismissed_' + APP) || document.querySelector('.ha-hint')) return;
        // never on top of the app's own PIN prompt / welcome / editor — wait for a calm moment
        if (busy()) { if (++hintTries < 40) setTimeout(maybeShowHint, 5000); return; }
        injectCss();
        var el = document.createElement('div');
        el.className = 'ha-hint';
        el.setAttribute('role', 'status');
        el.innerHTML = (cfg.icon ? '<img src="' + cfg.icon + '" alt="">' : '') +
            '<div class="ha-hint-t"><b>Make it an app</b><span>Add ' + NAME + ' to your Home Screen</span></div>' +
            '<button type="button" class="ha-btn">How</button><button type="button" class="ha-x" aria-label="Dismiss">×</button>';
        var dismiss = function() { store('homeAppHintDismissed_' + APP, '1'); if (el.parentNode) el.parentNode.removeChild(el); };
        el.querySelector('.ha-btn').addEventListener('click', function() { dismiss(); showInstallHelp(); });
        el.querySelector('.ha-x').addEventListener('click', dismiss);
        document.body.appendChild(el);
    }

    window.HomeApp = { isStandalone: isStandalone, checkForUpdate: checkForUpdate, showInstallHelp: showInstallHelp, busy: busy };
    window.addEventListener('load', function() {
        registerWorker();
        setTimeout(maybeShowHint, 4000);
    });
})();
