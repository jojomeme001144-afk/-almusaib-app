const CACHE='ahali-almusayyib-v17-20260919';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url); if(u.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(r=>{if(r&&r.ok){const x=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',x));}return r;}).catch(()=>caches.match('./index.html')));return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(r=>{if(r&&r.ok){const x=r.clone();caches.open(CACHE).then(c=>c.put(event.request,x));}return r;})));
});
