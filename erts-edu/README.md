# Portail ERTS EDU

Portail d'information pour les apprenants, construit sur la même architecture que le portail Villiersfox :
HTML + JavaScript sans framework, contenu dans des fichiers JSON, page d'administration, PWA hors-ligne.
Aucun traceur, aucune bibliothèque ni police externe (plus de Tailwind/FontAwesome/Google Fonts/Unsplash en CDN).

## Structure
```
index.html  admin.html  offline.html  manifest.webmanifest  service-worker.js
css/style.css  css/theme.css      js/app.js      icons/      img/ (hero.webp facultatif)
data/  ecole sites scolarite alertes actus agenda diva documents plateformes faq foad resto info (.json)
```
Pages (routes `#...`) : accueil, actus, agenda, scolarite, diva, docs, foad, faq, plateformes, resto, contact, legal, privacy.

## Fonctionnement
- **Site choisi** (Olivet / Bourges / Chartres) : liste déroulante dans la barre, mémorisée sur l'appareil. Actualités, agenda, alertes, horaires, météo et restaurant s'adaptent au site.
  Un élément avec `"sites": []` (ou sans `sites`) s'affiche partout ; `"sites": ["olivet"]` uniquement à Olivet.
- **Alertes flash** : `data/alertes.json` (actif, site, date de fin). Bandeau rouge + pastille + fenêtre de détail.
- **Restaurant** : ouvert/fermé calculé selon `jours`, `debut`, `fin` de `resto.json` et les jours fériés.
- **Contact** : formulaire `mailto:` (rien n'est stocké). `#contact/diva` pré-sélectionne le service DIVA.
- **Accessibilité** : taille du texte, contraste, mode daltonien, thème sombre, interligne, boutons agrandis, lecture vocale.

## Administration (`admin.html`)
1. Ouvrez `admin.html`, choisissez un mot de passe (10 caractères min.), collez la ligne `const HASH="..."` proposée dans le fichier.
2. Modifiez Actualités, Agenda, Alertes, Scolarité, Sites, Livrets, Plateformes, FAQ, FOAD.
3. Cliquez « Télécharger xxx.json » et remplacez le fichier dans `data/` sur l'hébergement.

**Limite importante** : sans serveur, ce mot de passe ne protège que l'interface ; il n'empêche personne de lire les JSON (publics) ni de modifier un fichier hébergé.
Les droits d'écriture sur l'hébergement restent la vraie protection. Pour un usage réel, protégez `admin.html` côté serveur (authentification de l'hébergeur).
Fichiers à modifier à la main : `ecole.json`, `diva.json`, `resto.json`, `info.json`.

## À compléter avant mise en ligne
- E-mails : `ecole.json` (`contact@example.org`), `diva.json` (`diva@example.org`) sont des exemples.
- URL des plateformes (NABU Moodle, SoWesign, WebAurion) et des documents (Livrets & chartes) : vides.
- Horaires de scolarité de Bourges et Chartres (actuellement seulement Olivet) ; centre de documentation idem.
- Lieux/heures de l'agenda (`[À COMPLÉTER]`), jours d'ouverture du restaurant (lundi-vendredi supposé), coordonnées GPS des sites (approximatives).
- Mentions légales et déclaration d'accessibilité (`app.js`, vues `legal` et `privacy`).
- Fermetures exemple dans `ecole.json`.

## Versions
Gardez alignés « Version x.y.z » (`index.html`) et `V` dans `service-worker.js` ; changez `V` à chaque mise à jour pour renouveler le cache.
