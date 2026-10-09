// js/app.js : Portail ERTS EDU
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M={},J=f=>M[f]||(M[f]=fetch('data/'+f+'.json').then(r=>{if(!r.ok)throw Error(f);return r.json()}).catch(e=>{delete M[f];throw e}));
const L=async(f,r=f)=>(await J(f))[r]||[];
const st={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const TZ='Europe/Paris',T=new Date().toLocaleDateString('sv-SE',{timeZone:TZ});
const D=d=>new Date(d+'T12:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const mm=h=>{const[a,b]=h.split(':');return a*60+ +b};
const nowMin=()=>mm(new Date().toLocaleTimeString('fr-FR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
const dayName=()=>new Date().toLocaleDateString('fr-FR',{timeZone:TZ,weekday:'long'});
const byDate=(a,b)=>a.date.localeCompare(b.date);
const safe=u=>/^(https?:|mailto:|tel:|#|[\w./-]+$)/i.test(u||'')?u:'';
const ext=u=>/^https?:/i.test(u)?' target="_blank" rel="noopener"':'';
const VS=(x,s)=>!(x.sites&&x.sites.length)||x.sites.includes(s.id);
const NAV=[['accueil','Accueil','🏠'],['actus','Actualités','📰'],['agenda','Agenda','📅'],['scolarite','Scolarité & sites','🏫'],['diva','DIVA','🤝'],['docs','Livrets & chartes','📄'],['foad','FOAD','💻'],['faq','FAQ','❓'],['plateformes','Plateformes','🔑'],['resto','Restaurant','🍽️'],['contact','Contact','✉️']];
const EMO={'Conférence':'🎤','Projet étudiant':'🌱','Vie du campus':'🏫','Scolarité':'🎓','Formation':'📚','Alerte':'⚠️'};
let SITES=[],SITE=null,RESTO=null,DEST=[];
const restoOn=()=>!!(RESTO&&SITE&&VS(RESTO,SITE));

/* ---------- jours fériés, fermetures, météo ---------- */
async function feries(){const c=st.get('feries',null);if(c&&c.d===T)return c.v;try{const v=await(await fetch('https://calendrier.api.gouv.fr/jours-feries/metropole.json')).json();st.set('feries',{d:T,v});return v}catch{return c?.v||{}}}
const closedWhy=(E,d,f)=>f[d]?'Jour férié : '+f[d]:(E.fermetures||[]).find(x=>d>=x.du&&d<=x.au)?.motif;
const WM=c=>c==0?'☀️':c<4?'⛅':c<50?'🌫️':c<70?'🌧️':c<80?'❄️':c<95?'🌦️':'⛈️';
async function meteo(s){if(!(+s.lat&&+s.lon))return'<p>Météo indisponible : coordonnées GPS à compléter pour ce site.</p>';
const k='meteo:'+s.id;let c=st.get(k,null);
if(!c||Date.now()-c.t>9e5){try{const v=await(await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis&forecast_days=3`)).json();c={t:Date.now(),v};st.set(k,c)}catch{if(!c)throw 0}}
const v=c.v;return`<p class="wx">${WM(v.current.weather_code)} ${Math.round(v.current.temperature_2m)} °C <small>à ${esc(s.nom)}</small></p><ul class="clean">${v.daily.time.map((d,i)=>`<li>${new Date(d+'T12:00').toLocaleDateString('fr-FR',{weekday:'long'})} ${WM(v.daily.weather_code[i])} ${Math.round(v.daily.temperature_2m_min[i])}° / ${Math.round(v.daily.temperature_2m_max[i])}°</li>`).join('')}</ul>`}
async function restoStatus(){const[E,f]=await Promise.all([J('ecole'),feries()]),why=closedWhy(E,T,f),n=nowMin(),open=!why&&(RESTO.jours||[]).includes(dayName())&&n>=mm(RESTO.debut)&&n<mm(RESTO.fin);
return`<p class="${open?'ok':'ko'}">${open?'Ouvert maintenant':'Fermé actuellement'}${why?' ('+esc(why)+')':''}</p>`}

/* ---------- composants ---------- */
const ie=s=>String(s||'').replace(/[\\;,]/g,'\\$&').replace(/\n/g,'\\n');
const ics=e=>'data:text/calendar;charset=utf-8,'+encodeURIComponent(['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ERTS EDU//FR','BEGIN:VEVENT','UID:'+e.id+'@erts-edu','DTSTAMP:'+new Date().toISOString().replace(/[-:]|\.\d+/g,''),e.debut?'DTSTART;TZID=Europe/Paris:'+e.date.replace(/-/g,'')+'T'+e.debut.replace(':','')+'00':'DTSTART;VALUE=DATE:'+e.date.replace(/-/g,''),'SUMMARY:'+ie(e.titre),'LOCATION:'+ie(e.lieu),'DESCRIPTION:'+ie(e.description),'END:VEVENT','END:VCALENDAR'].join('\r\n'));
const newsCard=a=>`<article class="card news"><div class="th">${a.photo?`<img src="${esc(safe(a.photo))}" alt="" loading="lazy">`:`<span aria-hidden="true">${EMO[a.categorie]||'📰'}</span>`}</div><div><span class="tag">${esc(a.categorie)}</span><h3>${esc(a.titre)}</h3><p><small>${D(a.date.slice(0,10))}</small></p><p>${esc(a.excerpt)}</p>${a.body?`<details><summary>Lire la suite</summary><p>${esc(a.body)}</p></details>`:''}<a class="btn alt" href="mailto:?subject=${encodeURIComponent(a.titre)}&body=${encodeURIComponent(a.excerpt+' — '+location.origin)}">Partager</a></div></article>`;
const evCard=e=>`<article class="card ${e.date<T?'past':''}" data-m="${e.date.slice(0,7)}"><h3>${esc(e.titre)}</h3><p>${D(e.date)}${e.debut?' à '+esc(e.debut):''}<br>${esc(e.lieu)}</p><p>${esc(e.description)}</p>${e.date<T?'<p>Événement passé</p>':`<a class="btn alt" download="evenement.ics" href="${ics(e)}">Ajouter à mon calendrier</a>`}</article>`;
const CH=(t,l,h)=>`<div class="ch"><h3>${t}</h3><a href="${h}">${l}</a></div>`;
const lg=l=>{const i=l.indexOf(' : ');return i<0?esc(l):`<strong>${esc(l.slice(0,i+2))}</strong>${esc(l.slice(i+2))}`};
const filieres=(F,s,open)=>F.filter(x=>VS(x,s)).map((x,i)=>`<details${open&&i<2?' open':''}><summary>${esc(x.nom)} (${esc(x.sigle)})</summary>${(x.lignes||[]).map(l=>`<p>${lg(l)}</p>`).join('')}${x.email?`<p>Secrétariat : <a href="mailto:${esc(x.email)}">${esc(x.email)}</a></p>`:''}</details>`).join('')||'<p>Horaires de ce site : à compléter.</p>';
const docLink=d=>{const u=safe(d.url);return u?`<a href="${esc(u)}"${ext(u)}>${esc(d.ico||'📄')} ${esc(d.titre)}</a>`:`<span>${esc(d.ico||'📄')} ${esc(d.titre)} <small>(bientôt disponible)</small></span>`};
const telOf=s=>String(s.tel||'').replace(/\s/g,'');

/* ---------- vues ---------- */
const V={
async accueil(){const[F,A,G,P,Dc,i]=await Promise.all([L('scolarite','filieres'),L('actus'),L('agenda'),L('plateformes'),L('documents'),J('info').catch(()=>null)]),s=SITE,
n=G.filter(e=>VS(e,s)&&e.date>=T).sort(byDate)[0],news=A.filter(a=>VS(a,s)).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,3),wx=await meteo(s).catch(()=>'<p>Météo indisponible.</p>');
return`${i&&i.actif?`<a class="info" href="${esc(safe(i.lien)||'#actus')}"><span>${esc(i.titre)}</span><span class="tag">${esc(i.etiquette||'Info')}</span></a>`:''}<div class="cols">
<div><h2 class="sec">Accueil administratif</h2>
<section class="card">${CH('📍 '+esc(s.type)+' — '+esc(s.nom),'Tous les sites →','#scolarite')}<span class="tag">${esc(s.badge)}</span><p>${esc(s.adresse)}</p><div class="acts"><a class="btn" href="tel:${esc(telOf(s))}">📞 ${esc(s.tel)}</a><a class="btn" href="#contact">✉️ Écrire</a></div>${wx}</section>
<section class="card">${CH('Horaires de la scolarité','Détail →','#scolarite')}${filieres(F,s,false)}${s.centre_doc?`<p><strong>📚 Centre de documentation :</strong><br>${esc(s.centre_doc)}</p>`:''}</section></div>
<div><h2 class="sec">Accompagnement & services</h2>
${restoOn()?`<section class="card">${CH('🍽️ '+esc(RESTO.nom),'Détail →','#resto')}${await restoStatus()}<p>Service du midi : <strong>${esc(RESTO.debut)} — ${esc(RESTO.fin)}</strong></p></section>`:''}
<section class="card accent">${CH('🤝 Service DIVA','Découvrir →','#diva')}<p>Mobilité internationale, écoute, orientation et mission handicap.</p></section>
<section class="card foad">${CH('💻 Espace FOAD','Ouvrir →','#foad')}<p>Conseils et règles pour vos journées à distance.</p></section>
<section class="card">${CH('🔑 Plateformes','Accès →','#plateformes')}<div class="acts">${P.map(p=>safe(p.url)?`<a class="btn alt" href="${esc(safe(p.url))}"${ext(p.url)}>${esc(p.nom)}</a>`:'').join('')||'<p>Liens à compléter.</p>'}</div></section>
<section class="card">${CH('❓ Foire aux questions','Consulter →','#faq')}<p>Connexion, émargement, plannings, absences.</p></section></div>
<div><h2 class="sec">Actualités & documents</h2>
<section class="card">${CH('Prochaine manifestation','Agenda →','#agenda')}${n?`<strong>${esc(n.titre)}</strong><p>${D(n.date)}${n.debut?' à '+esc(n.debut):''}<br>${esc(n.lieu)}</p>`:'<p>Aucune manifestation à venir.</p>'}</section>
${news.map(newsCard).join('')}<p><a class="btn" href="#actus">Toutes les actualités</a></p>
<section class="card">${CH('📄 Livrets & chartes','Tout voir →','#docs')}<ul class="clean">${Dc.map(d=>`<li>${docLink(d)}</li>`).join('')}</ul></section></div></div>`},
async actus(){const a=(await L('actus')).filter(x=>VS(x,SITE)).sort((x,y)=>y.date.localeCompare(x.date));return`<h2>Actualités principales</h2><div class="grid">${a.map(newsCard).join('')||'<p>Aucune actualité pour ce site.</p>'}</div>`},
async agenda(){const g=(await L('agenda')).filter(e=>VS(e,SITE)).sort(byDate),ms=[...new Set(g.map(e=>e.date.slice(0,7)))];
return`<h2>Agenda</h2><label for="mois">Filtrer par mois</label><select id="mois"><option value="">Tous</option>${ms.map(x=>`<option value="${x}">${new Date(x+'-15').toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</option>`).join('')}</select><div class="grid" style="margin-top:1rem">${g.map(evCard).join('')||'<p>Aucun événement.</p>'}</div>`},
async scolarite(){const[E,F]=await Promise.all([J('ecole'),L('scolarite','filieres')]),s=SITE;
return`<h2>Accueil administratif</h2><div class="cols"><section class="card"><h3>Horaires de la scolarité <span class="tag">${esc(s.type)} — ${esc(s.nom)}</span></h3><p><small>${esc(E.remarque_scolarite||'')}</small></p>${filieres(F,s,true)}${s.centre_doc?`<h3>📚 Centre de documentation</h3><p>${esc(s.centre_doc)}</p>`:''}</section>
<section class="card"><h3>📍 Localisation des sites</h3>${SITES.map(x=>`<div class="card${x.id==s.id?' accent':''}" style="margin-bottom:.8rem"><strong>${esc(x.type)} — ${esc(x.nom)}</strong> <span class="tag">${esc(x.badge)}</span><p>${esc(x.adresse)}<br><a href="tel:${esc(telOf(x))}">📞 ${esc(x.tel)}</a></p>${x.id==s.id?'<p class="ok">Site sélectionné</p>':`<button class="alt" data-site="${esc(x.id)}">Choisir ce site</button>`}</div>`).join('')}</section></div>`},
async diva(){const d=await J('diva'),r=d.referent||{};
return`<h2>Service DIVA & inclusivité</h2><p>${esc(d.intro)}</p><div class="grid">${(d.services||[]).map(x=>`<article class="card"><div class="pf"><span class="ico" aria-hidden="true">${esc(x.ico)}</span><div><h3>${esc(x.titre)}</h3><p>${esc(x.texte)}</p></div></div></article>`).join('')}
<article class="card accent"><h3>♿ ${esc(r.titre)} <span class="tag">${esc(r.prenom)}</span></h3><p>${esc(r.texte)}</p><a class="btn" href="#contact/diva">Prendre rendez-vous avec ${esc(r.prenom)} / DIVA</a></article></div>`},
async docs(){const d=await L('documents');return`<h2>Livrets & chartes</h2><section class="card"><ul class="clean">${d.map(x=>`<li>${docLink(x)}</li>`).join('')}</ul></section>`},
async foad(){const f=await L('foad');return`<h2>Espace FOAD — Formation à distance</h2><div class="cols"><section class="card foad"><h3>Conseils d’usage pour vos journées à distance</h3><ul>${f.filter(x=>x.type=='conseil').map(x=>`<li>${esc(x.titre)}${x.texte?' '+esc(x.texte):''}</li>`).join('')}</ul></section>
<section class="card foad"><h3>Extraits du règlement de connexion & d’assiduité</h3>${f.filter(x=>x.type!='conseil').map(x=>`<p><strong>${esc(x.titre)} :</strong> ${esc(x.texte)}</p>`).join('')}</section></div>`},
async faq(){const f=await L('faq'),g=[...new Set(f.map(x=>x.groupe))];
return`<h2>Foire aux questions</h2><label for="qf">Rechercher</label><input id="qf" type="search">${g.map(n=>`<section class="card" style="margin:1rem 0"><h3>FAQ ${esc(n)}</h3>${f.filter(x=>x.groupe==n).map(x=>`<details data-q="${esc((x.q+' '+x.r).toLowerCase())}"><summary>${esc(x.q)}</summary><p>${esc(x.r)}</p></details>`).join('')}</section>`).join('')}`},
async plateformes(){const p=await L('plateformes');
return`<h2>Accès aux plateformes</h2><p>Identifiants institutionnels ERTS requis.</p><div class="grid">${p.map(x=>{const u=safe(x.url);return`<article class="card"><div class="pf"><span class="ico" aria-hidden="true">${esc(x.ico||'🔑')}</span><div><span class="tag">${esc(x.tag)}</span><h3>${esc(x.nom)}</h3><p>${esc(x.texte)}</p></div></div><div class="acts">${u?`<a class="btn" href="${esc(u)}"${ext(u)}>${esc(x.bouton||'Accéder')}</a>`:'<span class="btn" aria-disabled="true">Lien à compléter</span>'}<a class="btn alt" href="#faq">Conseils d’usage</a></div></article>`}).join('')}</div>`},
async resto(){if(!restoOn())return`<h2>Restaurant</h2><p>Le restaurant APAJH est disponible uniquement sur le site d’Olivet. <button class="alt" data-site="olivet">Choisir le site d’Olivet</button></p>`;
const r=RESTO;return`<h2>${esc(r.nom)}</h2><section class="card">${r.photo?`<img class="photo" src="${esc(safe(r.photo))}" alt="" loading="lazy">`:''}<h3>${esc(r.titre)}</h3><p>${esc(r.texte)}</p>${await restoStatus()}<p>Service du midi : <strong>${esc(r.debut)} — ${esc(r.fin)}</strong> (${esc((r.jours||[]).join(', '))})</p><p><small>* ${esc(r.note)}</small></p></section>`},
async contact(arg){const[E,d,F]=await Promise.all([J('ecole'),J('diva'),L('scolarite','filieres')]),s=SITE;
DEST=[{l:'Service DIVA / Mission Handicap',e:d.email,k:'diva'},...F.filter(x=>VS(x,s)&&x.email).map(x=>({l:'Secrétariat '+x.sigle,e:x.email,k:x.id})),{l:'Accueil '+s.nom,e:s.email||E.email,k:'accueil'}].filter(x=>x.e);
return`<h2>Contact</h2><form id="fc" class="card"><label for="dest">Destinataire</label><select id="dest">${DEST.map((x,i)=>`<option value="${i}"${x.k==arg?' selected':''}>${esc(x.l)}</option>`).join('')}</select><label for="n">Nom et prénom</label><input id="n" required><label for="e">E-mail</label><input id="e" type="email" required><label for="s">Objet</label><input id="s" required><label for="m">Message</label><textarea id="m" rows="6" required></textarea><input class="hp" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true"><p><button>Envoyer</button></p><p id="ok" role="status"></p><small>RGPD : votre message est envoyé depuis votre messagerie, qui l’adresse au service concerné ; il n’est utilisé que pour vous répondre. Aucune donnée n’est stockée sur ce site. Pour une demande liée au handicap, ne détaillez pas d’informations de santé par e-mail : demandez un rendez-vous.</small></form>`},
async legal(){return`<h2>Mentions légales</h2><p>Éditeur : École Régionale du Travail Social (ERTS) – Association ARDEQAF, [À COMPLÉTER : adresse]. Responsable de publication : [À COMPLÉTER : nom]. Hébergeur : [À COMPLÉTER]. Droit d’accès, de rectification et d’effacement : contactez l’établissement.</p>`},
async privacy(){return`<h2>Vie privée et accessibilité</h2><p>Ce site n’utilise ni cookie, ni outil de mesure d’audience, ni traceur, ni police ou bibliothèque externe. Vos réglages (accessibilité, site choisi) sont stockés uniquement dans votre navigateur. Services appelés : Open-Meteo (météo, sans donnée personnelle) et calendrier.api.gouv.fr (jours fériés). Les formulaires passent par votre messagerie (mailto).</p><p><strong>Déclaration d’accessibilité (RGAA) :</strong> site en cours de mise en conformité, objectif WCAG AA. Signalez toute difficulté à l’établissement. [À COMPLÉTER : date de l’audit]</p>`}};

/* ---------- alertes flash, site, routage ---------- */
const alerts=async()=>(await L('alertes').catch(()=>[])).filter(x=>x.actif!==false&&(!x.jusqu_au||x.jusqu_au>=T)&&VS(x,SITE));
async function refreshTop(){const[a,f,E]=await Promise.all([alerts(),feries(),J('ecole').catch(()=>({}))]),b=$('#alc'),w=closedWhy(E,T,f);
b.textContent=a.length;b.hidden=!a.length;
$('#banner').textContent=[w?w+'. L’établissement est fermé.':'',a[0]?'🔔 '+a[0].titre+' — '+a[0].texte:''].filter(Boolean).join(' · ')}
function setSite(id){const s=SITES.find(x=>x.id==id);if(!s)return;SITE=s;st.set('site',s.id);$('#site').value=s.id;go(true)}
async function init(){SITES=await L('sites');RESTO=await J('resto').catch(()=>null);SITE=SITES.find(x=>x.id==st.get('site',''))||SITES[0];
$('#site').innerHTML=SITES.map(x=>`<option value="${esc(x.id)}"${x==SITE?' selected':''}>${esc(x.type)} — ${esc(x.nom)}</option>`).join('')}
async function go(keep){const[r,arg]=(location.hash.slice(1)||'accueil').split('/');
try{if(!SITE)await init()}catch{$('#main').innerHTML='<p>Contenu momentanément indisponible.</p>';return}
const d=new Date().toLocaleDateString('fr-FR',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'});$('#today').textContent='📅 '+d.charAt(0).toUpperCase()+d.slice(1);
$('#nav').innerHTML=NAV.filter(([h])=>h!='resto'||restoOn()).map(([h,l,i])=>`<a href="#${h}"${h==r?' aria-current="page"':''}><span aria-hidden="true">${i}</span> ${l}</a>`).join('');
const f=V[r]||V.accueil;
try{$('#main').innerHTML=await f(arg)}catch{$('#main').innerHTML='<p>Contenu momentanément indisponible.</p>'}
if(!keep){$('#main').focus();scrollTo(0,0)}refreshTop().catch(()=>{})}
addEventListener('hashchange',()=>go());go();
document.addEventListener('input',e=>{const t=e.target;
if(t.id=='mois')document.querySelectorAll('[data-m]').forEach(x=>x.hidden=t.value&&x.dataset.m!=t.value);
if(t.id=='qf')document.querySelectorAll('[data-q]').forEach(x=>x.hidden=!x.dataset.q.includes(t.value.toLowerCase()))});
document.addEventListener('change',e=>{if(e.target.id=='site')setSite(e.target.value)});
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
if(t.dataset.site)setSite(t.dataset.site);
if(t.id=='close')$('#dlg').close();
if(t.id=='alb'){const a=await alerts(),d=$('#dlg');d.setAttribute('aria-label','Alertes flash');
d.innerHTML=`<h3>🔔 Alertes flash — ${esc(SITE.nom)}</h3>${a.map(x=>`<p><strong>${esc(x.titre)}</strong><br>${esc(x.texte)}</p>`).join('')||'<p>Aucune alerte en cours.</p>'}<button id="close">Fermer</button>`;d.showModal()}});
document.addEventListener('submit',e=>{e.preventDefault();if($('#hp').value)return;const x=DEST[+$('#dest').value];if(!x)return;
$('#ok').textContent='Votre messagerie va s’ouvrir : merci de valider l’envoi.';
location.href='mailto:'+x.e+'?subject='+encodeURIComponent($('#s').value)+'&body='+encodeURIComponent($('#m').value+'\n\n'+$('#n').value+' — '+$('#e').value)});

/* ---------- accessibilité, installation, PWA ---------- */
const P=st.get('a11y',{s:0});
function applyA(){document.documentElement.className='s'+P.s;['contrast','cb','dark','lines','big'].forEach(o=>document.body.classList.toggle(o,!!P[o]));['dark','contrast','cb'].forEach(o=>document.documentElement.classList.toggle(o,!!P[o]));document.querySelectorAll('[data-o]').forEach(c=>c.checked=!!P[c.dataset.o])}
applyA();
$('#abtn').onclick=()=>{const h=$('#a11y').hidden;$('#a11y').hidden=!h;$('#abtn').setAttribute('aria-expanded',h)};
$('#a11y').addEventListener('click',e=>{if(e.target.dataset.s!=null){P.s=+e.target.dataset.s;st.set('a11y',P);applyA()}});
$('#a11y').addEventListener('change',e=>{if(e.target.dataset.o){P[e.target.dataset.o]=e.target.checked;st.set('a11y',P);applyA()}});
$('#tts').onclick=()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('#main').innerText);u.lang='fr-FR';speechSynthesis.speak(u)};
let ip;addEventListener('beforeinstallprompt',e=>{e.preventDefault();ip=e;$('#install').hidden=false});
$('#install').onclick=async()=>{if(!ip){alert('Pour installer : menu du navigateur, puis « Ajouter à l’écran d’accueil ». Sur iPhone : bouton Partager, puis « Sur l’écran d’accueil ».');return}ip.prompt();await ip.userChoice;ip=null;$('#install').hidden=true};
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
