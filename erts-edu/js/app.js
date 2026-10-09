// js/app.js : Portail ERTS EDU
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M={},J=f=>M[f]||(M[f]=fetch('data/'+f+'.json').then(r=>{if(!r.ok)throw Error(f);return r.json()}).catch(e=>{delete M[f];throw e}));
const L=async(f,r=f)=>(await J(f))[r]||[],LC=(f,r)=>L(f,r).catch(()=>[]);
const st={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const TZ='Europe/Paris',T=new Date().toLocaleDateString('sv-SE',{timeZone:TZ});
const DL=d=>new Date(d+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
const MO=d=>new Date(d+'T12:00').toLocaleDateString('fr-FR',{month:'short'}).replace('.','').toUpperCase(),DY=d=>d.slice(8,10);
const mm=h=>{const[a,b]=h.split(':');return a*60+ +b};
const nowMin=()=>mm(new Date().toLocaleTimeString('fr-FR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));
const dayName=()=>new Date().toLocaleDateString('fr-FR',{timeZone:TZ,weekday:'long'});
const byDate=(a,b)=>a.date.localeCompare(b.date),desc=(a,b)=>b.date.localeCompare(a.date);
const safe=u=>/^(https?:|mailto:|tel:|#|[\w./-]+$)/i.test(u||'')?u:'';
const ext=u=>/^https?:/i.test(u)?' target="_blank" rel="noopener"':'';
const VS=(x,s)=>!(x.sites&&x.sites.length)||x.sites.includes(s.id);
const CAT={'Conférence':'purple','Projet étudiant':'emerald','Vie du campus':'amber','Scolarité':'blue','Formation':'teal','Alerte':'rose'},tn=c=>CAT[c]||'indigo';
let SITES=[],SITE=null,RESTO=null,DEST=[],RENDERED='',IO;
const restoOn=()=>!!(RESTO&&SITE&&VS(RESTO,SITE));

/* ---------- jours fériés, fermetures, météo ---------- */
async function feries(){const c=st.get('feries',null);if(c&&c.d===T)return c.v;try{const v=await(await fetch('https://calendrier.api.gouv.fr/jours-feries/metropole.json')).json();st.set('feries',{d:T,v});return v}catch{return c?.v||{}}}
const closedWhy=(E,d,f)=>f[d]?'Jour férié : '+f[d]:(E.fermetures||[]).find(x=>d>=x.du&&d<=x.au)?.motif;
const WM=c=>c==0?['☀️','Ciel dégagé']:c<4?['⛅','Éclaircies']:c<50?['🌫️','Brouillard']:c<70?['🌧️','Pluie']:c<80?['❄️','Neige']:c<95?['🌦️','Averses']:['⛈️','Orage'];
async function wx(s){if(!(+s.lat&&+s.lon))return null;const k='meteo:'+s.id;let c=st.get(k,null);
if(!c||Date.now()-c.t>9e5){try{const v=await(await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis&forecast_days=1`)).json();c={t:Date.now(),v};st.set(k,c)}catch{if(!c)return null}}
const v=c.v,[i,d]=WM(v.current.weather_code);return{i,d,t:Math.round(v.current.temperature_2m),mn:Math.round(v.daily.temperature_2m_min[0]),mx:Math.round(v.daily.temperature_2m_max[0])}}
async function restoSt(){const[E,f]=await Promise.all([J('ecole').catch(()=>({})),feries()]),why=closedWhy(E,T,f),n=nowMin();return{why,open:!why&&(RESTO.jours||[]).includes(dayName())&&n>=mm(RESTO.debut)&&n<mm(RESTO.fin)}}
const sp=o=>`<span class="sp ${o.open?'ok':'ko'}">${o.open?'Ouvert':'Fermé'}</span>`;

/* ---------- composants ---------- */
const ie=s=>String(s||'').replace(/[\\;,]/g,'\\$&').replace(/\n/g,'\\n');
const ics=e=>'data:text/calendar;charset=utf-8,'+encodeURIComponent(['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ERTS EDU//FR','BEGIN:VEVENT','UID:'+e.id+'@erts-edu','DTSTAMP:'+new Date().toISOString().replace(/[-:]|\.\d+/g,''),e.debut?'DTSTART;TZID=Europe/Paris:'+e.date.replace(/-/g,'')+'T'+e.debut.replace(':','')+'00':'DTSTART;VALUE=DATE:'+e.date.replace(/-/g,''),'SUMMARY:'+ie(e.titre),'LOCATION:'+ie(e.lieu),'DESCRIPTION:'+ie(e.description),'END:VEVENT','END:VCALENDAR'].join('\r\n'));
const SH=(i,t,r='')=>`<div class="sh"><div class="shl"><span aria-hidden="true">${i}</span><h2>${t}</h2></div>${r}</div>`;
const CS=(i,t)=>`<div class="colh"><span aria-hidden="true">${i}</span><h2>${t}</h2></div>`;
const news=a=>`<article class="news tint t-${tn(a.categorie)}"><div class="datebox"><span>${MO(a.date)}</span><strong>${DY(a.date)}</strong></div><div class="nb"><div class="row"><span class="chip t">${esc(a.categorie)}</span><span class="mut">🕒 ${DL(a.date.slice(0,10))}</span></div><h3>${esc(a.titre)}</h3><p>${esc(a.excerpt)}</p>${a.body?`<details class="more"><summary>Lire la suite</summary><p>${esc(a.body)}</p></details>`:''}</div>${a.photo?`<img class="nimg" src="${esc(safe(a.photo))}" alt="" loading="lazy">`:''}</article>`;
const ev=e=>`<div class="ev"><div class="mdate"><span>${MO(e.date)}</span><strong>${DY(e.date)}</strong></div><div><strong>${esc(e.titre)}</strong><div class="mut">${e.debut?esc(e.debut)+' · ':''}${esc(e.lieu)}</div><a class="lnk" download="evenement.ics" href="${ics(e)}">➕ Ajouter à mon calendrier</a></div></div>`;
const lg=l=>{const i=l.indexOf(' : ');return i<0?esc(l):`<strong>${esc(l.slice(0,i+2))}</strong>${esc(l.slice(i+2))}`};
const filieres=(F,s)=>F.filter(x=>VS(x,s)).map((x,i)=>`<details class="acc"${i<2?' open':''}><summary><span>${esc(x.nom)} (${esc(x.sigle)})</span></summary><div class="acc-b">${(x.lignes||[]).map(l=>`<p>${lg(l)}</p>`).join('')}${x.email?`<p>Secrétariat : <a href="mailto:${esc(x.email)}">${esc(x.email)}</a></p>`:''}</div></details>`).join('')||'<p class="mut">Horaires de ce site : à compléter.</p>';
const docLink=d=>{const u=safe(d.url);return u?`<a class="doc" href="${esc(u)}"${ext(u)}><span>${esc(d.ico||'📄')} ${esc(d.titre)}</span><span class="dl" aria-hidden="true">⬇</span></a>`:`<span class="doc off"><span>${esc(d.ico||'📄')} ${esc(d.titre)}</span><small>bientôt disponible</small></span>`};
const telOf=s=>String(s.tel||'').replace(/\s/g,'');
const volet=(k,tone,tag,sub,title,openT,closeT,body)=>`<section id="${k=='foad'?'espace-foad':'faq-volet-encart'}" class="volet ${tone}"><div class="v-h"><div><div class="row"><span class="vtag">${tag}</span>${sub?`<span>${sub}</span>`:''}</div><h2>${title}</h2></div><button class="vbtn" type="button" data-toggle="${k}" data-o="${esc(openT)}" data-c="${esc(closeT)}" aria-expanded="false" aria-controls="${k}-c"><span class="chev" aria-hidden="true"></span><span class="vt">${esc(openT)}</span></button></div><div id="${k}-c" class="v-c" hidden>${body}</div></section>`;
function setVolet(k,open){const c=$('#'+k+'-c'),b=document.querySelector(`[data-toggle="${k}"]`);if(!c||!b)return;const o=open??c.hidden;c.hidden=!o;b.setAttribute('aria-expanded',String(o));b.querySelector('.vt').textContent=o?b.dataset.c:b.dataset.o}
const dlgBox=(ico,tone,title,sub,body)=>`<div class="dlg-in"><button class="x" data-close aria-label="Fermer">✕</button><div class="dlg-h"><div class="dlg-i tint t-${tone}" aria-hidden="true">${ico}</div><div><h2>${title}</h2><p>${sub}</p></div></div>${body}</div>`;

/* ---------- accueil (page unique, comme le portail d'origine) ---------- */
async function hero(){const s=SITE,[w,al]=await Promise.all([wx(s).catch(()=>null),alerts()]),rs=restoOn()?await restoSt().catch(()=>null):null;
return`<div class="gbox"><label for="site">📍 Sélection de votre site :</label><select id="site">${SITES.map(x=>`<option value="${esc(x.id)}"${x==SITE?' selected':''}>📍 ${esc(x.type)} — ${esc(x.nom)}</option>`).join('')}</select></div>
<div class="gcard"><div class="gc-t"><strong>${esc(s.type)} — ${esc(s.nom)}</strong><span class="chip mono">${esc(s.badge).toUpperCase()}</span></div>
<div class="gc-m"><div class="wxb">${w?`<span class="wi" aria-hidden="true">${w.i}</span><div><div class="wt">${w.t} °C</div><div class="wd">${esc(w.d)} · ${w.mn}° / ${w.mx}°</div></div>`:'<span class="wi" aria-hidden="true">🌡️</span><div><div class="wt">—</div><div class="wd">Météo indisponible</div></div>'}</div>
<div class="gc-r">${rs?`<small>Restaurant</small>${sp(rs)}`:`<small>Alertes</small><span class="sp ${al.length?'ko':'ok'}">${al.length?al.length+' en cours':'Aucune'}</span>`}</div></div>
<div class="gc-b"><span>📞 <a href="tel:${esc(telOf(s))}"><strong>${esc(s.tel)}</strong></a></span><a href="#fiches-sites">Accès &amp; plans →</a></div></div>`}
async function home(){const[E,F,A,G,P,Dc,dv,FO,FQ,al,i]=await Promise.all([J('ecole').catch(()=>({})),LC('scolarite','filieres'),LC('actus'),LC('agenda'),LC('plateformes'),LC('documents'),J('diva').catch(()=>({})),LC('foad'),LC('faq'),alerts(),J('info').catch(()=>null)]),
s=SITE,N=A.filter(a=>VS(a,s)).sort(desc),EV=G.filter(e=>VS(e,s)&&e.date>=T).sort(byDate).slice(0,4),r=RESTO,rf=dv.referent||{},rs=restoOn()?await restoSt().catch(()=>null):null,a0=al[0],gr=[...new Set(FQ.map(x=>x.groupe))];
return`<div class="stack">
${i&&i.actif?`<a class="flash" href="${esc(safe(i.lien)||'#actualites')}"><strong>${esc(i.titre)}</strong><span class="chip">${esc(i.etiquette||'Info')}</span></a>`:''}
${a0?`<div class="flash"><div class="fl-l"><div class="fl-i" aria-hidden="true">⚠️</div><div><div><h3>Flash info campus — ${esc(s.nom)}</h3><span class="chip">Information</span></div><p><strong>${esc(a0.titre)}.</strong> ${esc(a0.texte)}</p></div></div><button class="fl-b" type="button" data-alerts>${al.length>1?'Toutes les alertes ('+al.length+') →':'Voir les alertes →'}</button></div>`:''}
<section id="actualites" class="stack-s">${SH('📰','Actualités principales')}${N.map(news).join('')||'<p class="mut">Aucune actualité pour ce site.</p>'}</section>
<div class="cols3">
<div class="stack">${CS('🏛️','Accueil administratif')}
<div class="card" id="scolarite-filieres"><div class="ct"><h3>🕐 Horaires de la scolarité</h3><span class="chip">${esc(s.type)} — ${esc(s.nom)}</span></div>${E.remarque_scolarite?`<div class="note"><strong>ℹ️ Remarque :</strong> ${esc(E.remarque_scolarite)}</div>`:''}<div class="accs">${filieres(F,s)}</div>${s.centre_doc?`<div class="box" id="centre-doc-box"><div class="bh"><span>📚 Centre de documentation</span><span class="chip mono">Site ${esc(s.nom)}</span></div><p>${esc(s.centre_doc)}</p></div>`:''}</div>
<div class="card" id="fiches-sites"><div class="ct"><h3>🗺️ Localisation des sites ERTS</h3></div>${SITES.map(x=>`<button type="button" class="site-i${x.id==s.id?' on':''}" data-site="${esc(x.id)}"${x.id==s.id?' aria-current="true"':''}><span class="r"><span>📍 ${esc(x.type)} — ${esc(x.nom)}</span><span class="chip">${esc(x.badge)}</span></span><p>${esc(x.adresse)} · ${esc(x.tel)}</p></button>`).join('')}</div></div>
<div class="stack">${CS('🤲','Accompagnement &amp; services')}
${restoOn()?`<div class="card" id="resto-apajh-section"><div class="ct"><h3>🍽️ ${esc(r.nom)} (${esc(s.nom)})</h3>${rs?sp(rs):''}</div><div class="rs${r.photo?' ph':''}">${r.photo?`<img src="${esc(safe(r.photo))}" alt="" loading="lazy">`:''}<div><strong>${esc(r.titre)}</strong><p>${esc(r.texte)}</p></div></div><div class="box c"><div class="bh"><span>🕐 Service du midi :</span><span>${esc(r.debut)} — ${esc(r.fin)}</span></div><p class="mut">${esc((r.jours||[]).join(', '))}${rs&&rs.why?' · '+esc(rs.why):''}</p><p class="mut" style="margin-top:.4rem;font-size:.72rem">* ${esc(r.note)}</p></div></div>`:''}
<div class="card" id="service-diva"><div class="ct"><h3>🌍 Service DIVA &amp; inclusivité</h3><span class="chip tint t-teal t">Pôle accompagnement</span></div><p class="mut" style="margin:0;font-size:.82rem">${esc(dv.intro||'')}</p>
${(dv.services||[]).map(x=>`<div class="mini"><span class="ic" aria-hidden="true">${esc(x.ico)}</span><div><strong>${esc(x.titre)}</strong><p>${esc(x.texte)}</p></div></div>`).join('')}
<div class="box e"><div class="bh" style="color:inherit"><span>♿ ${esc(rf.titre)}</span><span class="chip" style="background:#a7f3d0;border-color:#a7f3d0;color:#064e3b">${esc(rf.prenom)}</span></div><p style="margin:.4rem 0 .6rem">${esc(rf.texte)}</p><button class="btn-e" type="button" data-contact="diva">Prendre rendez-vous avec ${esc(rf.prenom)} / DIVA</button></div></div></div>
<div class="stack">${CS('📁','Documents &amp; supports')}
<div class="card" id="documents-onboarding"><div class="ct"><h3>📕 Livrets &amp; chartes</h3></div><div class="docs">${Dc.map(docLink).join('')}</div></div>
<div class="card" id="agenda"><div class="ct"><h3>📅 Agenda</h3></div>${EV.map(ev).join('')||'<p class="mut">Aucune manifestation à venir.</p>'}</div></div></div>
${volet('foad','teal','Formation à distance','🏠 Mode hybride','Espace FOAD — Formation à distance','Ouvrir l’Espace FOAD','Fermer l’Espace FOAD',`<div class="v-2"><div class="v-w"><h3>💡 Conseils d’usage pour vos journées à distance</h3><ul>${FO.filter(x=>x.type=='conseil').map(x=>`<li>${esc(x.titre)}${x.texte?' '+esc(x.texte):''}</li>`).join('')}</ul></div><div class="v-d"><h3>⚖️ Extraits du règlement de connexion &amp; assiduité FOAD</h3>${FO.filter(x=>x.type!='conseil').map(x=>`<p><strong>${esc(x.titre)} :</strong> ${esc(x.texte)}</p>`).join('')}</div></div>`)}
${volet('faq','indigo','Assistance','','Foire aux questions','Ouvrir la Foire aux questions','Fermer la Foire aux questions',`<div class="v-s"><label for="qf" style="color:#e0e7ff;margin:0 0 .3rem">Rechercher dans la FAQ</label><input id="qf" type="search"></div><div class="v-2">${gr.map(n=>`<div class="v-w"><h3>${n=='Technique'?'🎧':'🎓'} FAQ ${esc(n)}</h3>${FQ.filter(x=>x.groupe==n).map(x=>`<details class="acc" data-q="${esc((x.q+' '+x.r).toLowerCase())}"><summary><span>${esc(x.q)}</span></summary><div class="acc-b"><p>${esc(x.r)}</p></div></details>`).join('')}</div>`).join('')}</div>`)}
<section id="plateformes" class="stack-s">${SH('💻','Accès aux plateformes','<span class="mut" style="font-size:.78rem">Identifiants institutionnels ERTS requis</span>')}<div class="pf3">${P.map((x,k)=>{const u=safe(x.url),t=['orange','emerald','blue','purple'][k%4];return`<div class="pfc tint t-${t}"><div><div class="top"><div class="pfi" aria-hidden="true">${esc(x.ico||'🔑')}</div><span class="chip t">${esc(x.tag)}</span></div><h3>${esc(x.nom)}</h3><p>${esc(x.texte)}</p></div><div class="acts">${u?`<a class="btn btn-g" href="${esc(u)}"${ext(u)}>${esc(x.bouton||'Accéder')} ↗</a>`:'<span class="btn btn-g off">Lien à compléter</span>'}<button class="btn-c" type="button" data-open="faq">💡 Conseils d’usage</button></div></div>`}).join('')}</div></section>
</div>`}

/* ---------- pages secondaires ---------- */
const P2={
async legal(){return`<section class="pg stack-s"><p><a href="#accueil">← Retour à l’accueil</a></p><h2>Mentions légales</h2><p>Éditeur : École Régionale du Travail Social (ERTS) – Association ARDEQAF, [À COMPLÉTER : adresse]. Responsable de publication : [À COMPLÉTER : nom]. Hébergeur : [À COMPLÉTER]. Droit d’accès, de rectification et d’effacement : contactez l’établissement.</p></section>`},
async privacy(){return`<section class="pg stack-s"><p><a href="#accueil">← Retour à l’accueil</a></p><h2>Vie privée et accessibilité</h2><p>Ce site n’utilise ni cookie, ni outil de mesure d’audience, ni traceur, ni police ou bibliothèque externe. Vos réglages (accessibilité, site choisi) sont stockés uniquement dans votre navigateur. Services appelés : Open-Meteo (météo, sans donnée personnelle) et calendrier.api.gouv.fr (jours fériés). Les formulaires passent par votre messagerie (mailto).</p><p><strong>Déclaration d’accessibilité (RGAA) :</strong> site en cours de mise en conformité, objectif WCAG AA. Signalez toute difficulté à l’établissement. [À COMPLÉTER : date de l’audit]</p></section>`}};

/* ---------- alertes, contact, site, routage ---------- */
const alerts=async()=>(await LC('alertes')).filter(x=>x.actif!==false&&(!x.jusqu_au||x.jusqu_au>=T)&&VS(x,SITE));
async function refreshTop(){const[a,f,E]=await Promise.all([alerts(),feries(),J('ecole').catch(()=>({}))]),b=$('#alc'),w=closedWhy(E,T,f);
b.textContent=a.length;b.hidden=!a.length;$('#banner').textContent=w?w+'. L’établissement est fermé.':''}
async function openAlerts(){const a=await alerts(),d=$('#dlg');d.setAttribute('aria-label','Alertes flash');
d.innerHTML=dlgBox('⚠️','rose','Alertes flash','Informations importantes — '+esc(SITE.nom),(a.map((x,k)=>`<div class="al tint t-${k%2?'blue':'amber'}"><strong>${esc(x.titre)}</strong><p>${esc(x.texte)}</p></div>`).join('')||'<p class="mut">Aucune alerte en cours.</p>')+'<button data-close>Fermer</button>');d.showModal()}
async function openContact(k){const[E,d,F]=await Promise.all([J('ecole').catch(()=>({})),J('diva').catch(()=>({})),LC('scolarite','filieres')]),s=SITE;
DEST=[{l:'Service DIVA / Mission Handicap',e:d.email,k:'diva'},...F.filter(x=>VS(x,s)&&x.email).map(x=>({l:'Secrétariat '+x.sigle,e:x.email,k:x.id})),{l:'Accueil '+s.nom,e:s.email||E.email,k:'accueil'}].filter(x=>x.e);
const dl=$('#dlg');dl.setAttribute('aria-label','Contacter l’ERTS');
dl.innerHTML=dlgBox('✉️','emerald','Contacter l’ERTS','Votre messagerie s’ouvrira pour valider l’envoi',`<form id="fc"><label for="dest">Destinataire</label><select id="dest">${DEST.map((x,i)=>`<option value="${i}"${x.k==k?' selected':''}>${esc(x.l)}</option>`).join('')}</select><label for="n">Nom et prénom</label><input id="n" required><label for="e">E-mail</label><input id="e" type="email" required><label for="s">Objet</label><input id="s" required><label for="m">Message</label><textarea id="m" rows="4" required></textarea><input class="hp" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true"><p style="margin:1rem 0 .5rem"><button class="btn">Envoyer</button></p><p id="ok" role="status"></p><small class="mut">RGPD : aucune donnée n’est stockée sur ce site. Pour une demande liée au handicap, ne détaillez pas d’informations de santé par e-mail : demandez un rendez-vous.</small></form>`);dl.showModal()}
function setSite(id){const s=SITES.find(x=>x.id==id);if(!s)return;SITE=s;st.set('site',s.id);go(true)}
async function init(){SITES=await L('sites');RESTO=await J('resto').catch(()=>null);SITE=SITES.find(x=>x.id==st.get('site',''))||SITES[0];
const E=await J('ecole').catch(()=>null);if(E){$('#brand-n').firstChild.textContent=E.nom+' ';$('#brand-r').textContent=E.region||'';$('#brand-a').textContent=E.association||''}}
function pills(){const o=[['scolarite-filieres','🕐','Horaires, accueil administratif'],['actualites','📰','Actualités'],['agenda','📅','Agenda'],['service-diva','🌍','Service DIVA'],['documents-onboarding','📁','Livrets & chartes'],['espace-foad','💻','Espace FOAD'],['faq-volet-encart','❓','Espace FAQ'],['plateformes','🔑','Plateformes']];if(restoOn())o.push(['resto-apajh-section','🍽️','Restaurant APAJH ('+SITE.nom+')']);
return o.map(([h,i,l])=>`<a class="pill" href="#${h}"><span aria-hidden="true">${i}</span> ${esc(l)}</a>`).join('')+'<button class="pill" type="button" data-contact="">✉️ Contact</button>'}
function spy(){IO?.disconnect();if(!('IntersectionObserver'in window))return;IO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)document.querySelectorAll('#nav a').forEach(a=>{const on=a.getAttribute('href')=='#'+e.target.id;a.classList.toggle('on',on);on?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current')})}),{rootMargin:'-15% 0px -70% 0px'});
document.querySelectorAll('#nav a').forEach(a=>{const el=document.getElementById(a.getAttribute('href').slice(1));el&&IO.observe(el)})}
const viewOf=h=>h=='legal'||h=='privacy'?h:'home';
async function go(keep){const h=location.hash.slice(1),v=viewOf(h);
try{if(!SITE)await init()}catch{$('#main').innerHTML='<p>Contenu momentanément indisponible.</p>';return}
const d=new Date().toLocaleDateString('fr-FR',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'});$('#today').textContent='📅 '+d.charAt(0).toUpperCase()+d.slice(1);
$('#nav').innerHTML=pills();$('#heroside').innerHTML=await hero().catch(()=>'');
try{$('#main').innerHTML=await(v=='home'?home():P2[v]())}catch{$('#main').innerHTML='<p>Contenu momentanément indisponible.</p>'}
RENDERED=v;spy();
if(!keep){const el=v=='home'&&h?document.getElementById(h):null;if(el)el.scrollIntoView();else{scrollTo(0,0);$('#main').focus({preventScroll:true})}}
refreshTop().catch(()=>{})}
addEventListener('hashchange',()=>{if(viewOf(location.hash.slice(1))!=RENDERED)go()});go();
document.addEventListener('input',e=>{const t=e.target;if(t.id=='qf')document.querySelectorAll('[data-q]').forEach(x=>x.hidden=!x.dataset.q.includes(t.value.toLowerCase()))});
document.addEventListener('change',e=>{if(e.target.id=='site')setSite(e.target.value)});
document.addEventListener('click',e=>{const t=e.target;if(t.tagName=='DIALOG'){t.close();return}
const b=t.closest('button,[data-open]');if(!b)return;
if(b.dataset.site)setSite(b.dataset.site);
if(b.dataset.toggle)setVolet(b.dataset.toggle);
if(b.dataset.open){setVolet(b.dataset.open);if(b.tagName=='BUTTON')document.getElementById(b.dataset.open=='faq'?'faq-volet-encart':'espace-foad')?.scrollIntoView()}
if(b.dataset.contact!=null)openContact(b.dataset.contact);
if(b.dataset.alerts!=null||b.id=='alb')openAlerts();
if(b.dataset.close!=null)b.closest('dialog').close()});
document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id!='fc'||$('#hp').value)return;const x=DEST[+$('#dest').value];if(!x)return;
$('#ok').textContent='Votre messagerie va s’ouvrir : merci de valider l’envoi.';
location.href='mailto:'+x.e+'?subject='+encodeURIComponent($('#s').value)+'&body='+encodeURIComponent($('#m').value+'\n\n'+$('#n').value+' — '+$('#e').value)});

/* ---------- accessibilité, installation, PWA ---------- */
const P=st.get('a11y',{s:0});
function applyA(){document.documentElement.className='s'+P.s;['contrast','cb','dark','lines','big'].forEach(o=>document.body.classList.toggle(o,!!P[o]));['dark','contrast','cb'].forEach(o=>document.documentElement.classList.toggle(o,!!P[o]));document.querySelectorAll('[data-o]').forEach(c=>{if(c.type=='checkbox')c.checked=!!P[c.dataset.o]})}
applyA();
$('#abtn').onclick=()=>$('#a11y').showModal();
$('#a11y').addEventListener('click',e=>{if(e.target.dataset.s!=null){P.s=+e.target.dataset.s;st.set('a11y',P);applyA()}});
$('#a11y').addEventListener('change',e=>{if(e.target.dataset.o){P[e.target.dataset.o]=e.target.checked;st.set('a11y',P);applyA()}});
$('#tts').onclick=()=>{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('#main').innerText);u.lang='fr-FR';speechSynthesis.speak(u)};
let ip;addEventListener('beforeinstallprompt',e=>{e.preventDefault();ip=e;$('#install').hidden=false});
$('#install').onclick=async()=>{if(!ip){alert('Pour installer : menu du navigateur, puis « Ajouter à l’écran d’accueil ». Sur iPhone : bouton Partager, puis « Sur l’écran d’accueil ».');return}ip.prompt();await ip.userChoice;ip=null;$('#install').hidden=true};
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
