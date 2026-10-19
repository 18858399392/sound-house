const SHELL = 'sound-house-shell-v2.6.0';
const MEDIA = 'sound-house-media-v1';
const FILES = ['./','index.html','immersive.css','immersive-app.js','data.js','mixer.js','storage.js','offline.js','media-index.js','scene-view.js','scene-motion.js','scene-film.js','breathing.js','install.js','icons.js','manifest.webmanifest','assets/icon.svg','assets/icon-180.png','assets/icon-192.png','assets/icon-512.png','assets/icon-maskable.png','assets/media-manifest.json','assets/scene-v26-provenance.json','素材与授权.md'];
const scopeURL = path => new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(SHELL);
  // Limit parallel shell requests on mobile connections. A failed install keeps
  // the previous app active; successful files can be reused by the next retry.
  let nextFile=0;
  const installFile=async path=>{
   const url=scopeURL(path);if(await cache.match(url))return;
   for(let attempt=0;attempt<3;attempt++)try{
    const response=await fetch(new Request(url,{cache:'reload',signal:AbortSignal.timeout(20000)}));
    if(!response.ok)throw new Error('App shell download failed');
    await cache.put(url,response);return;
   }catch(error){if(attempt===2)throw error;}
  };
  await Promise.all(Array.from({length:4},async()=>{while(nextFile<FILES.length)await installFile(FILES[nextFile++]);}));
  // Media cache is stable across updates. Only changed media revisions are invalidated.
  const oldCaches=(await caches.keys()).filter(k=>k.startsWith('sound-house-shell-')&&k!==SHELL);
  const next=await (await cache.match(scopeURL('assets/media-manifest.json'))).json();let previous=null;
  for(const name of oldCaches){const response=await(await caches.open(name)).match(scopeURL('assets/media-manifest.json'));if(response){previous=await response.json();break;}}
  if(previous){const old=new Map(previous.files.map(f=>[f.url,f.sha256])),media=await caches.open(MEDIA);for(const file of next.files)if(old.has(file.url)&&old.get(file.url)!==file.sha256)await media.delete(scopeURL(file.url));}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('sound-house-shell-')&&key!==SHELL)await caches.delete(key);await self.clients.claim();})()));
async function rangeResponse(request,response){
 const range=request.headers.get('Range');if(!range)return response;
 const bytes=await response.arrayBuffer(),size=bytes.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
 const invalid=()=>new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 if(!match||!match[1]&&!match[2])return invalid();
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2])),end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 if(start>end||start>=size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return invalid();
 const headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // The app validates and persists these buffered downloads. Never cache the
 // same streaming response in two places or let SW storage block a sound load.
 if(request.headers.has('X-Sound-House-Media'))return;
 event.respondWith((async()=>{
  const isMedia=/\/assets\/(images|sounds|videos)\//.test(url.pathname);let cache;
  try{cache=await caches.open(isMedia?MEDIA:SHELL);}catch{}
  try{
  if(request.mode==='navigate'){
   const cached=await cache?.match(request,{ignoreSearch:true});if(cached)return cached;
   const home=await cache?.match(scopeURL('./'));if(home)return home;
  }
  const cached=await cache?.match(request);if(cached)return isMedia?rangeResponse(request,cached):cached;
  }catch{}
  try{const response=await fetch(request);if(cache&&response.ok&&response.status===200&&!/\/assets\/(sounds|videos)\//.test(url.pathname))event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));return response;}
  catch{return new Response('连接暂时中断，此素材在本机也没有可用副本。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});



