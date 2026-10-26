/* Service worker : ouverture hors ligne + notifications.
   - Les fichiers de l'application sont mis en cache à la première visite, puis servis depuis le cache
     et mis à jour en arrière-plan quand il y a du réseau.
   - À CHAQUE nouvelle version déposée sur GitHub, changez le numéro VERSION ci-dessous (n'importe quel texte différent du précédent).
   - Notifications : le serveur envoie un message « push » ; ce fichier l'affiche, et ouvre l'application au toucher. */
const VERSION = 'v3.026';
const CACHE = 'volley-' + VERSION;
const FONTS = 'volley-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './icon-180.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL.map(function(u){ return new Request(u, { cache: 'reload' }); })); }).then(function(){ return self.skipWaiting(); }));
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

/* ---------- Notifications ---------- */
self.addEventListener('push', function(e){
  var d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(x){ try{ d = { body: e.data.text() }; }catch(y){} }
  var opt = { body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', data: { url: d.url || './#/messages' } };
  if(d.tag){ opt.tag = d.tag; opt.renotify = true; }
  e.waitUntil(self.registration.showNotification(d.title || 'Volley-Club Commentry', opt));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './#/messages';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    for(var i = 0; i < list.length; i++){
      var c = list[i];
      if('focus' in c){ c.postMessage({ type: 'open', url: url }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
