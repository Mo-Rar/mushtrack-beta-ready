# MushTrack Beta

MushTrack est une application web mobile/PWA pour mushers : suivi GPS, chiens, team, agenda de courses, plans d'entrainement, conseils et analyse de charge.

## Tester en local

```bash
npm run dev
```

Puis ouvrir :

```text
http://127.0.0.1:4401/
```

## Deployer sur Vercel

1. Creer un compte sur Vercel.
2. Mettre ce dossier dans un depot GitHub.
3. Dans Vercel, choisir **Add New Project** puis importer le depot.
4. Framework preset : **Other**.
5. Build command : laisser vide ou utiliser `npm run build`.
6. Output directory : laisser vide.
7. Deploy.

Le fichier `vercel.json` configure le projet comme site statique et evite le cache agressif sur `index.html`, `app.js`, `styles.css` et `sw.js`.

## Version beta

Version actuelle : `0.1.0-beta.1`

Fonctions incluses :

- Accueil saison avec objectif km
- Modes hiver / ete
- GPS simule avec bilan post-entrainement
- Detection automatique du type d'entrainement
- Meteo auto via geolocalisation et Open-Meteo
- Chiens + team active dans le meme onglet
- Profils chiens
- Analyse de charge
- Agenda de courses
- Mode course
- Conseils sante/performance

## Avant Play Store

Pour publier sur le Play Store, il faudra ensuite transformer cette PWA en application Android avec une enveloppe native, par exemple Capacitor ou Bubblewrap/TWA.

Elements a preparer :

- nom officiel : MushTrack
- icone haute resolution
- captures d'ecran telephone
- politique de confidentialite
- description courte et longue
- compte Google Play Console
- version beta fermee ou ouverte
