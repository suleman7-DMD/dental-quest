// ============================================================================
// SULLY CALENDAR — ui-core.js
// Shared UI primitives: modal stack, confirm / prompt dialogs, Google-style
// recurring-scope dialog, floating menus, anchored popovers (bottom sheets on
// phones). No state mutation here.
// ============================================================================

function $(id) { return document.getElementById(id); }
function isPhone() { return window.innerWidth < 720; }

// ---------------------------------------------------------------- modals
var modalStack = [];

function openModal(html, opts) {
    opts = opts || {};
    var root = $('gcModalRoot');
    var back = document.createElement('div');
    back.className = 'gc-modal-backdrop';
    if (opts.id) back.id = opts.id;
    var box = document.createElement('div');
    box.className = 'gc-modal' + (opts.wide ? ' wide' : '') + (opts.full ? ' full' : '') + (opts.narrow ? ' narrow' : '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    if (opts.label) box.setAttribute('aria-label', opts.label);
    box.innerHTML = html;
    back.appendChild(box);
    root.appendChild(back);
    var entry = { el: back, box: box, onClose: opts.onClose || null, sticky: !!opts.sticky, prevFocus: document.activeElement };
    modalStack.push(entry);
    back.addEventListener('mousedown', function(e) {
        if (e.target === back && !entry.sticky) closeModal(back);
    });
    requestAnimationFrame(function() {
        back.classList.add('show');
        var f = box.querySelector('[autofocus]') || (isPhone() ? null : box.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select'));
        if (f) { try { f.focus(); if (f.select && f.type === 'text') f.select(); } catch (e) {} }
        else { var b = box.querySelector('button'); if (b) try { b.focus({ preventScroll: true }); } catch (e2) {} }
    });
    box.querySelectorAll('[data-close]').forEach(function(b) { b.addEventListener('click', function() { closeModal(back); }); });
    return box;
}

function closeModal(el) {
    if (!modalStack.length) return false;
    var idx = modalStack.length - 1;
    if (el) {
        var target = el.classList && el.classList.contains('gc-modal-backdrop') ? el : (el.closest ? el.closest('.gc-modal-backdrop') : null);
        idx = modalStack.findIndex(function(m) { return m.el === target; });
        if (idx === -1) return false;
    }
    var entry = modalStack.splice(idx, 1)[0];
    entry.el.classList.remove('show');
    setTimeout(function() { if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el); }, 160);
    if (entry.onClose) { try { entry.onClose(); } catch (e) { console.error(e); } }
    if (entry.prevFocus && entry.prevFocus.focus && document.body.contains(entry.prevFocus)) { try { entry.prevFocus.focus({ preventScroll: true }); } catch (e3) {} }
    return true;
}

function closeAllModals() { while (modalStack.length) closeModal(); }
function topModal() { return modalStack.length ? modalStack[modalStack.length - 1] : null; }

// ---------------------------------------------------------------- dialogs
// gcConfirm('text', {title, okLabel, danger}) or gcConfirm({title, message, okLabel, danger})
function gcConfirm(message, opts) {
    if (message && typeof message === 'object') { opts = message; message = opts.message || ''; }
    opts = opts || {};
    return new Promise(function(resolve) {
        var done = false;
        var box = openModal(
            '<div class="gc-dialog">' +
            (opts.title ? '<h2 class="gc-dialog-title">' + escapeHtml(opts.title) + '</h2>' : '') +
            '<div class="gc-dialog-body">' + escapeHtml(message).replace(/\n/g, '<br>') + '</div>' +
            '<div class="gc-dialog-actions">' +
            '<button class="gc-btn text" data-act="cancel">' + escapeHtml(opts.cancelLabel || 'Cancel') + '</button>' +
            '<button class="gc-btn ' + (opts.danger ? 'danger' : 'filled') + '" data-act="ok" autofocus>' + escapeHtml(opts.okLabel || 'OK') + '</button>' +
            '</div></div>',
            { narrow: true, onClose: function() { if (!done) { done = true; resolve(false); } } });
        box.querySelector('[data-act=ok]').onclick = function() { done = true; closeModal(box); resolve(true); };
        box.querySelector('[data-act=cancel]').onclick = function() { closeModal(box); };
    });
}

function gcPrompt(title, value, opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
        var done = false;
        var box = openModal(
            '<form class="gc-dialog">' +
            '<h2 class="gc-dialog-title">' + escapeHtml(title) + '</h2>' +
            '<div class="gc-dialog-body"><input class="gc-input" name="v" type="' + (opts.type || 'text') + '" maxlength="' + (opts.maxLength || 200) + '" placeholder="' + escapeHtml(opts.placeholder || '') + '" autofocus></div>' +
            '<div class="gc-dialog-actions"><button type="button" class="gc-btn text" data-act="cancel">Cancel</button>' +
            '<button type="submit" class="gc-btn filled">' + escapeHtml(opts.okLabel || 'Save') + '</button></div></form>',
            { narrow: true, onClose: function() { if (!done) { done = true; resolve(null); } } });
        var input = box.querySelector('input');
        input.value = value || '';
        box.querySelector('form').onsubmit = function(e) {
            e.preventDefault();
            var v = input.value.trim();
            if (!v && !opts.allowEmpty) { input.focus(); return; }
            done = true; closeModal(box); resolve(v);
        };
        box.querySelector('[data-act=cancel]').onclick = function() { closeModal(box); };
    });
}

// Google's "Edit recurring event" radio dialog → 'this' | 'following' | 'all' | null
function askRecurringScope(title, allowThis, allowFollowing) {
    return new Promise(function(resolve) {
        var done = false;
        var opts = [];
        if (allowThis !== false) opts.push(['this', 'This event']);
        if (allowFollowing !== false) opts.push(['following', 'This and following events']);
        opts.push(['all', 'All events']);
        var box = openModal(
            '<form class="gc-dialog">' +
            '<h2 class="gc-dialog-title">' + escapeHtml(title || 'Edit recurring event') + '</h2>' +
            '<div class="gc-dialog-body gc-radio-list">' +
            opts.map(function(o, i) {
                return '<label class="gc-radio"><input type="radio" name="scope" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
            }).join('') +
            '</div><div class="gc-dialog-actions"><button type="button" class="gc-btn text" data-act="cancel">Cancel</button>' +
            '<button type="submit" class="gc-btn filled" autofocus>OK</button></div></form>',
            { narrow: true, onClose: function() { if (!done) { done = true; resolve(null); } } });
        box.querySelector('form').onsubmit = function(e) {
            e.preventDefault();
            var v = box.querySelector('input[name=scope]:checked');
            done = true; closeModal(box); resolve(v ? v.value : 'this');
        };
        box.querySelector('[data-act=cancel]').onclick = function() { closeModal(box); };
    });
}

// ---------------------------------------------------------------- floating positioning
function rectOf(anchor) {
    if (!anchor) return { left: window.innerWidth / 2, top: window.innerHeight / 3, right: window.innerWidth / 2, bottom: window.innerHeight / 3, width: 0, height: 0 };
    if (anchor.getBoundingClientRect) return anchor.getBoundingClientRect();
    return anchor; // already a rect-like {left, top, right, bottom}
}

// Place el beside the anchor (right, else left), or below/above for menus; clamp to viewport
function positionFloating(el, anchor, prefer) {
    var r = rectOf(anchor);
    el.style.left = '0px'; el.style.top = '0px';
    el.style.maxHeight = (window.innerHeight - 24) + 'px';
    var w = el.offsetWidth, hgt = el.offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight, m = 8;
    var left, top;
    if (prefer === 'below') {
        left = r.left; top = r.bottom + 4;
        if (left + w > vw - m) left = Math.max(m, r.right - w);
        if (top + hgt > vh - m) top = Math.max(m, r.top - hgt - 4);
    } else {
        left = r.right + 8;
        if (left + w > vw - m) left = r.left - w - 8;
        if (left < m) left = Math.max(m, Math.min(vw - w - m, r.left + (r.width || 0) / 2 - w / 2));
        top = r.top + (r.height || 0) / 2 - hgt / 2;
        if (left < r.right && left + w > r.left && !(r.top > hgt + m)) top = r.bottom + 6; // overlapped horizontally → go below
    }
    top = Math.max(m, Math.min(top, vh - hgt - m));
    left = Math.max(m, Math.min(left, vw - w - m));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
}

// ---------------------------------------------------------------- menus
var activeMenu = null;

function openMenu(anchor, items, opts) {
    opts = opts || {};
    closeMenu();
    var el = document.createElement('div');
    el.className = 'gc-menu' + (opts.className ? ' ' + opts.className : '');
    el.setAttribute('role', 'menu');
    var html = '';
    items.forEach(function(it, i) {
        if (!it) return;
        if (it.divider) { html += '<div class="gc-menu-divider"></div>'; return; }
        if (it.header) { html += '<div class="gc-menu-header">' + escapeHtml(it.header) + '</div>'; return; }
        if (it.html) { html += '<div class="gc-menu-custom" data-i="' + i + '">' + it.html + '</div>'; return; }
        html += '<button class="gc-menu-item' + (it.danger ? ' danger' : '') + (it.checked ? ' checked' : '') + '" role="menuitem" data-i="' + i + '"' + (it.disabled ? ' disabled' : '') + '>' +
            (it.icon ? icon(it.icon) : (opts.checks ? icon(it.checked ? 'check' : 'blank', 'gc-check-slot') : '')) +
            '<span class="gc-menu-label">' + escapeHtml(it.label) + '</span>' +
            (it.hint ? '<span class="gc-menu-hint">' + escapeHtml(it.hint) + '</span>' : '') + '</button>';
    });
    el.innerHTML = html;
    document.body.appendChild(el);
    el.addEventListener('click', function(e) {
        var b = e.target.closest('.gc-menu-item');
        if (!b || b.disabled) return;
        var it = items[+b.getAttribute('data-i')];
        closeMenu();
        if (it && it.onClick) it.onClick();
    });
    if (opts.onMount) opts.onMount(el);
    positionFloating(el, anchor, 'below');
    activeMenu = { el: el, anchor: anchor };
    setTimeout(function() {
        var first = el.querySelector('.gc-menu-item:not([disabled])');
        if (first && !opts.noFocus) try { first.focus({ preventScroll: true }); } catch (e) {}
    }, 0);
    return el;
}

function closeMenu() {
    if (!activeMenu) return false;
    if (activeMenu.el.parentNode) activeMenu.el.parentNode.removeChild(activeMenu.el);
    activeMenu = null;
    return true;
}

document.addEventListener('mousedown', function(e) {
    if (activeMenu && !activeMenu.el.contains(e.target) && !(activeMenu.anchor && activeMenu.anchor.contains && activeMenu.anchor.contains(e.target))) closeMenu();
}, true);

// ---------------------------------------------------------------- popovers (event details / quick create)
var activePopover = null;

function openPopover(html, anchor, opts) {
    opts = opts || {};
    closePopover(true);
    var sheet = isPhone();
    var el = document.createElement('div');
    el.className = 'gc-popover' + (sheet ? ' sheet' : '') + (opts.className ? ' ' + opts.className : '');
    el.setAttribute('role', 'dialog');
    el.innerHTML = html;
    var host = $('gcPopoverRoot');
    var scrim = null;
    if (sheet) {
        scrim = document.createElement('div');
        scrim.className = 'gc-sheet-scrim';
        scrim.addEventListener('click', function() { closePopover(); });
        host.appendChild(scrim);
    }
    host.appendChild(el);
    if (!sheet) positionFloating(el, anchor, opts.prefer || 'side');
    requestAnimationFrame(function() { el.classList.add('show'); if (scrim) scrim.classList.add('show'); });
    activePopover = { el: el, scrim: scrim, anchor: anchor, onClose: opts.onClose || null, key: opts.key || null };
    el.querySelectorAll('[data-close]').forEach(function(b) { b.addEventListener('click', function() { closePopover(); }); });
    return el;
}

function closePopover(silent) {
    if (!activePopover) return false;
    var p = activePopover;
    activePopover = null;
    if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
    if (p.scrim && p.scrim.parentNode) p.scrim.parentNode.removeChild(p.scrim);
    if (p.onClose) { try { p.onClose(!!silent); } catch (e) { console.error(e); } }
    if (typeof clearDraftPreview === 'function') clearDraftPreview();
    if (typeof flushPendingRender === 'function') setTimeout(flushPendingRender, 0);
    return true;
}

function repositionPopover() {
    if (activePopover && !activePopover.el.classList.contains('sheet') && activePopover.anchor) {
        var a = activePopover.anchor;
        if (a.getBoundingClientRect && !document.body.contains(a)) return;
        positionFloating(activePopover.el, a, 'side');
    }
}

document.addEventListener('mousedown', function(e) {
    if (!activePopover) return;
    if (activePopover.el.contains(e.target)) return;
    if (e.target.closest && (e.target.closest('.gc-menu') || e.target.closest('.gc-modal-backdrop'))) return;
    // clicks on events / grid open their own popover — let their handlers decide
    if (e.target.closest && e.target.closest('[data-key], .gc-col, .gc-month-cell, .gc-allday-cell')) return;
    closePopover();
}, true);
