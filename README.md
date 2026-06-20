# Tankprofi

Modernes, mobiles Tankpreis-Vergleichsportal mit Firebase Hosting, Cloud Functions, Firestore, Tankerkoenig-API, Nominatim-Geocoding und Leaflet-Karte.

## Firebase Projekt

- Projektname: `Tankprofi`
- Projekt-ID: `tankprofi`
- Projektnummer: `157996476551`
- Region fuer Functions: `europe-west3`

## Struktur

- `public/` - Frontend mit HTML, CSS, JavaScript und Leaflet
- `public/assets/js/firebase-app.js` - Firebase Web SDK Initialisierung
- `functions/` - Firebase Cloud Function `api` fuer Tankerkoenig, Nominatim und Preisarchiv
- `firestore.rules` - Firestore bleibt clientseitig geschlossen; Zugriff laeuft ueber Functions
- `firestore.indexes.json` - Index fuer Preisverlaeufe
- `firebase.json` - Hosting, Rewrites, Functions und Emulatoren

## Secrets

Der Tankerkoenig-Key wird als Firebase Secret gesetzt:

```bash
firebase functions:secrets:set TANKERKOENIG_API_KEY --project tankprofi
```

Fuer lokale Emulatoren liegt der Key in `functions/.secret.local`. Diese Datei wird ignoriert und nicht versioniert.

## Lokal starten

Einmalig Abhaengigkeiten installieren:

```bash
npm install
cd functions
npm install
cd ..
```

Firebase Emulatoren starten:

```bash
npm run emulators
```

Die App laeuft dann standardmaessig unter:

```text
http://localhost:5000
```

## Deploy

```bash
npm run deploy
```

## API-Endpunkte

Das Frontend spricht weiterhin stabile App-Endpunkte an:

- `/api/geocode.php?q=Berlin`
- `/api/search.php?lat=52.52&lng=13.405&radius=5&fuel=e10`
- `/api/history.php?tankerkoenig_id=<id>&fuel=e10`

Firebase Hosting routet `/api/**` automatisch zur Cloud Function `api`.

## Datenmodell Firestore

```text
stations/{tankerkoenig_id}
stations/{tankerkoenig_id}/price_history/{entry}
searches/{entry}
```

Preisverlaeufe werden nur bei Preiswechsel gespeichert.

## Optionaler lokaler Node-Server

Falls die Firebase CLI noch nicht installiert ist, kann die Oberflaeche testweise auch mit dem kleinen lokalen Fallback-Server gestartet werden:

```bash
$env:TANKERKOENIG_API_KEY="your-tankerkoenig-api-key"
npm run serve:node
```

Die Firebase-Variante ist die Zielarchitektur.
