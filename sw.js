// Online-first PWA: update application files when online, remain usable offline.
const CACHE='vygodno-v11';
const ASSETS=['./','./index.html','./app.js?v=11','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('vygodno-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  // HTML and JS are network-first. On offline failures use previously cached copies.
  const updateable=request.mode==='navigate'||/\.(?:html|js|css)$/.test(url.pathname);
  if(!updateable){
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok)await cache.put(request,response.clone());
      return response;
    }catch(error){
      const cached=await caches.match(request,{ignoreSearch:request.mode==='navigate'});
      if(cached)return cached;
      if(request.mode==='navigate'){
        const fallback=await caches.match('./index.html');
        if(fallback)return fallback;
      }
      throw error;
    }
  })());
});