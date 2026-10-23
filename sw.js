/* Reliable offline shell for a free, local-first studio. */
const CACHE_PREFIX="instrument-lab-";
const CACHE_NAME="instrument-lab-v6-safe-offline";
const SHELL_FILES=["./","./index.html","./styles.css","./app.js","./enhance.js","./performance-controls.js","./pro-upgrade.js","./stability.js","./mic-viz-fix.js","./voice-studio-plus.js","./manifest.webmanifest","./icon.svg"];
const OFFLINE_PAGE=new URL('./index.html',self.registration.scope).href;

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // Optional images can fail independently without blocking the offline app shell.
    await Promise.allSettled(SHELL_FILES.map(path=>cache.add(new URL(path,self.registration.scope).href)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    // Only remove outdated caches belonging to this app.
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('range'))return;
  // Don't cache uploaded/media stream requests or backend responses.
  if(/\.(mp4|webm|mov|m4v)$/i.test(url.pathname)||url.pathname.startsWith('/api/'))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok&&response.type!=='opaque'&&!/no-store|private/i.test(response.headers.get('cache-control')||'')){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{}));
      }
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==='navigate')return (await caches.match(OFFLINE_PAGE))||Response.error();
      throw error; // HTML is not a valid fallback for a missing .js/.css asset.
    }
  })());
});
