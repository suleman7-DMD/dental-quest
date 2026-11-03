// ============================================================================
// home-sw.js — service worker for the suite's Home Screen apps.
// Registered once per app page with that page as its scope (index.html,
// body-comp-tracker.html; calendar-sw.js imports it for calendar.html).
//
// Always the latest deploy: every same-origin GET goes to the network with
// cache:'no-cache' (a cheap 304 when nothing changed), so a cold launch never
// runs a stale page or module — even one whose ?v= wasn't bumped. The cache is
// only the fallback that lets the app open with no signal. Never touches
// Firebase traffic (firebaseio.com) or anything that isn't a GET.
// ============================================================================
var PAGE = (function() {
    var p = new URL(self.registration.scope).pathname.split('/').pop();
    return p && /\.html$/.test(p) ? p : 'index.html';
})();
var CACHE = 'home-' + PAGE.replace(/\.html$/, '') + '-v1';
var CROSS_ORIGIN_OK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs|unpkg\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.add(PAGE); }).catch(function() {}));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    var mine = 'home-' + PAGE.replace(/\.html$/, '') + '-';
    e.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) {
            if (k === CACHE) return false;
            return k.indexOf(mine) === 0 || (PAGE === 'calendar.html' && k.indexOf('sully-calendar-') === 0); // pre-home-sw calendar cache
        }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

function sameOrigin(url) { return url.indexOf(self.location.origin + '/') === 0; }
function cacheable(url) { return sameOrigin(url) || CROSS_ORIGIN_OK.test(url); }

// The page posts the files it already loaded so the very first visit is offline-ready
self.addEventListener('message', function(e) {
    var d = e.data || {};
    if (d.type !== 'precache' || !Array.isArray(d.urls)) return;
    var urls = d.urls.filter(function(u) { return typeof u === 'string' && cacheable(u); }).slice(0, 80);
    e.waitUntil(caches.open(CACHE).then(function(c) {
        return Promise.all(urls.map(function(u) {
            return c.match(u).then(function(hit) {
                if (hit) return null;
                return fetch(u, sameOrigin(u) ? {} : { mode: /fonts\.(googleapis|gstatic)/.test(u) ? 'cors' : 'no-cors' })
                    .then(function(r) { if (r && (r.ok || r.type === 'opaque')) return c.put(u, r); })
                    .catch(function() {});
            });
        }));
    }));
});

self.addEventListener('fetch', function(e) {
    var req = e.request;
    if (req.method !== 'GET' || !cacheable(req.url)) return;
    var isPage = req.mode === 'navigate';
    var key = isPage ? PAGE : req;
    var net = sameOrigin(req.url)
        ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function(res) {
            // a redirected response can't answer a navigation — let the browser follow it
            return res.redirected ? fetch(req) : res;
        })
        : fetch(req);
    e.respondWith(net.then(function(res) {
        if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c) { return c.put(key, copy); }).catch(function() {});
        }
        return res;
    }).catch(function() {
        return caches.match(key, { ignoreSearch: isPage }).then(function(hit) {
            return hit || Response.error();
        });
    }));
});
