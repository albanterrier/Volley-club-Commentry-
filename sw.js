/* Service worker : permet d'ouvrir l'application sans réseau.
   - Les fichiers de l'application sont mis en cache à la première visite.
   - Ensuite ils sont servis depuis le cache, et mis à jour en arrière-plan quand il y a du réseau.
   - Pour forcer une mise à jour complète, changez le numéro de version ci-dessous. */
const VERSION = 'v1';
const CACHE = 'volley-' + VERSION;
const FONTS = 'volley-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './icon-180.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE && k !== FONTS; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  if(url.origin === self.location.origin){
    e.respondWith(
      caches.match(req).then(function(hit){
        var net = fetch(req).then(function(res){
          if(res && res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
          return res;
        }).catch(function(){
          if(hit) return hit;
          if(req.mode === 'navigate') return caches.match(new URL('./index.html', self.location.href).href);
          return Response.error();
        });
        return hit || net;
      })
    );
    return;
  }

  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(
      caches.open(FONTS).then(function(c){
        return c.match(req).then(function(hit){
          return hit || fetch(req).then(function(res){ c.put(req, res.clone()); return res; }).catch(function(){ return hit || Response.error(); });
        });
      })
    );
  }
});
