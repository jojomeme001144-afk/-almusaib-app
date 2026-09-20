const CACHE='ahali-almusayyib-v32';
const SHELL=['./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
async function networkFirst(req){
  const c=await caches.open(CACHE);
  try{
    const res=await fetch(req,{cache:'no-store'});
    if(res&&res.ok)await c.put(req,res.clone());
    return res;
  }catch(e){
    return (await c.match(req))||(await c.match('./index.html'))||Response.error();
  }
}
async function cacheFirst(req){
  const c=await caches.open(CACHE);
  const hit=await c.match(req);
  if(hit)return hit;
  const res=await fetch(req);
  if(res&&res.ok)await c.put(req,res.clone());
  return res;
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(event.request.mode==='navigate'||(u.origin===location.origin&&u.pathname.endsWith('/index.html'))){
    event.respondWith(networkFirst(event.request));return;
  }
  const asset=u.origin===location.origin||
    u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'||
    u.hostname==='cdnjs.cloudflare.com'||u.hostname==='cdn.jsdelivr.net';
  if(asset)event.respondWith(cacheFirst(event.request));
});