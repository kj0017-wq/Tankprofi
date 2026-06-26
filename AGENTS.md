# Tankprofi Codex Project

## Projektkontext

Tankprofi ist eine eigenstaendige Firebase-Webapp fuer Live-Tankpreise, Stadtvergleiche, Autobahn-Standorte und Drive-Modus.

- Webapp: https://tankprofi.web.app
- Firebase-Projekt: `tankprofi`
- GitHub: https://github.com/kj0017-wq/Tankprofi.git
- Hauptbranch: `main`
- Functions-Region: `europe-west3`

## Wichtige Dateien

- `public/index.html` - App-Shell, Header, Navigation, Settings und Help-Sheet
- `public/assets/js/app.js` - Hauptlogik fuer Suche, Listen, Karten, Drive-Modus, Staedte und Autobahn
- `public/assets/css/app.css` - Mobile-first UI, Karten-, Listen-, Detail- und Drive-Layout
- `public/sw.js` - Service-Worker-Cache-Version
- `functions/index.js` - Firebase Function `api` fuer Tankerkoenig, Firestore, Stadtpreise und Autobahn-Endpunkte
- `firebase.json` - Hosting-Rewrites, Functions und Emulatoren
- `firestore.rules` / `firestore.indexes.json` - Firestore-Konfiguration

## Arbeitsregeln

- Bestehende Funktionen nicht entfernen oder umbenennen, wenn sie produktiv genutzt werden.
- Firebase bleibt zentrale Datenbasis.
- Normale Suche, Staedteansicht, Autobahnansicht, Detailansicht und Drive-Modus getrennt behandeln.
- UI-Aenderungen eng begrenzen und mobile Darstellung pruefen.
- Service-Worker-Version bei Frontend-Aenderungen immer erhoehen.
- Query-Versionen in `index.html` bei Frontend-Aenderungen anpassen.
- Vor Deploy mindestens `npm.cmd run check` ausfuehren.
- Functions-Deploy kann gelegentlich mit Firebase-internen Fehlern abbrechen; Hosting separat deployen, wenn nur Frontend betroffen ist.

## Standardbefehle

```powershell
npm.cmd run check
firebase.cmd deploy --only hosting --project tankprofi
firebase.cmd deploy --only functions:api --project tankprofi
firebase.cmd deploy --project tankprofi
```

Lokaler Server:

```powershell
npm.cmd run serve:node
```

Firebase Emulatoren:

```powershell
npm.cmd run emulators
```

## Drive-Modus

Der Drive-Modus ist bewusst aktiv vom Nutzer zu starten.

- Standort nur waehrend aktivem Drive-Modus nutzen.
- Keine dauerhafte Speicherung individueller Bewegungsprofile.
- Stadt-Drive bewertet Position und Entfernung alle 5 Sekunden neu.
- Stadt-Drive zeigt Tankstellen hinter der Fahrtrichtung nur bis maximal 500 m an.
- Stadt-Drive zieht Live-Preise, nutzt aber kurze Wiederverwendung, damit nicht alle 5 Sekunden externe Preisabfragen laufen.
- Autobahn-Drive nutzt vorberechnete Tankpunkte und keine blinde Radius-Suche.
- Autobahn-Drive aktualisiert vorausliegende Tankpunkte mit 15-Minuten-Frische.
- Bei aktivem Drive-Modus wird per Screen Wake Lock versucht, das Display wach zu halten.

## Preislogik

- Listenansichten zeigen nur die in den Einstellungen gewaehlte Kraftstoffsorte.
- Detailansichten zeigen Diesel, E5 und E10.
- Farbwertung muss auf dem jeweils sichtbaren Preis basieren.
- Wenn Live-Daten nicht erreichbar sind, darf gespeicherter Fallback nicht wie frische Live-Daten wirken.

## Autobahn-Daten

Vorbereitete Tankpunkte sollen generisch fuer Autobahnen aufgebaut sein, nicht nur fuer A9.

Wichtige Felder:

- `autobahn` / `routeId`
- `richtung`
- `lat`, `lng`
- `streckenIndex` oder `kmPosition`
- `stationId` / `priceStationId`
- `typ`
- `direktAnAutobahn`
- `active`
- `lastUpdated`

## Git/Deploy-Hinweise

- Projektordner liegt in Dropbox und ist lokal synchronisierbar.
- Nach wichtigen abgeschlossenen Arbeitsbloecken committen und auf GitHub pushen.
- Aktueller produktiver Hosting-Stand nach letzter bekannter Aenderung:
  - Frontend-Version: `20260625-drive-wake-lock`
  - Service Worker: `tankprofi-shell-v115`

