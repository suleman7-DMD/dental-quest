// ============================================================================
// SULLY CALENDAR — calendar-sw.js (scope: calendar.html only)
// Lets the Home Screen app open offline. Network-first: a fresh deploy always
// wins when online; the cache is only the fallback. Never touches Firebase
// traffic (firebaseio.com) or anything that isn't a GET.
// ============================================================================
var CACHE = 'sully-calendar-v1';
var CROSS_ORIGIN_OK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs)\//;

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(['calendar.html', 'calendar.webmanifest']); }).catch(function() {}));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k.indexOf('sully-calendar-') === 0 && k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});

function cacheable(url) {
    if (url.indexOf(self.location.origin + '/') === 0) return true;
    return CROSS_ORIGIN_OK.test(url);
}

// The page posts the files it already loaded so the very first visit is offline-ready
self.addEventListener('message', function(e) {
    var d = e.data || {};
    if (d.type !== 'precache' || !Array.isArray(d.urls)) return;
    var urls = d.urls.filter(function(u) { return typeof u === 'string' && cacheable(u); }).slice(0, 80);
    e.waitUntil(caches.open(CACHE).then(function(c) {
        return Promise.all(urls.map(function(u) {
            return c.match(u).then(function(hit) {
                if (hit) return null;
                var sameOrigin = u.indexOf(self.location.origin + '/') === 0;
                return fetch(u, sameOrigin ? {} : { mode: /fonts\.(googleapis|gstatic)/.test(u) ? 'cors' : 'no-cors' })
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
    e.respondWith(fetch(req).then(function(res) {
        if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c) { return c.put(isPage ? 'calendar.html' : req, copy); }).catch(function() {});
        }
        return res;
    }).catch(function() {
        return caches.match(isPage ? 'calendar.html' : req, { ignoreSearch: isPage }).then(function(hit) {
            return hit || Response.error();
        });
    }));
});
