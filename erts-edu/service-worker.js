// Version du cache : à garder alignée avec « Version x.y.z » du pied de page (index.html).
const V='erts-edu-v1.0.0',
F=['./','index.html','offline.html','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','css/style.css','css/theme.css','js/app.js',
'data/ecole.json','data/sites.json','data/scolarite.json','data/alertes.json','data/actus.json','data/agenda.json','data/diva.json','data/documents.json','data/plateformes.json','data/faq.json','data/foad.json','data/resto.json','data/info.json'];
// Un fichier manquant n'empêche plus l'installation : chaque ajout est tenté séparément.
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>Promise.all(F.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r})
 .catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('offline.html'):Response.error()))))});
