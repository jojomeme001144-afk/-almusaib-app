const CACHE='ahali-almusayyib-v31-offline-assets';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const cacheable=u.origin===location.origin||
    u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'||
    u.hostname==='cdnjs.cloudflare.com'||u.hostname==='cdn.jsdelivr.net';
  if(!cacheable)return;
  e.respondWith(
    caches.match(e.request).then(hit=>{
      const network=fetch(e.request).then(res=>{
        if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}
        return res;
      }).catch(()=>hit);
      return hit||network;
    })
  );
});