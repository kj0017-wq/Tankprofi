# Tankprofi

Modernes, mobiles Tankpreis-Vergleichsportal mit Firebase Hosting, Cloud Functions, Firestore, Tankerkoenig-API, Nominatim-Geocoding und Leaflet-Karte.

## Firebase Projekt

- Projektname: `Tankprofi`
- Projekt-ID: `tankprofi`
- Projektnummer: `157996476551`
- Region für Functions: `europe-west3`

## Struktur

- `public/` - Frontend mit HTML, CSS, JavaScript und Leaflet
- `public/assets/js/firebase-app.js` - Firebase Web SDK Initialisierung
- `functions/` - Firebase Cloud Function `api` für Tankerkoenig, Nominatim und Preisarchiv
- `firestore.rules` - Firestore bleibt clientseitig geschlossen; Zugriff läuft über Functions
- `firestore.indexes.json` - Index für Preisverläufe
- `firebase.json` - Hosting, Rewrites, Functions und Emulatoren

## Secrets

Der Tankerkoenig-Key wird als Firebase Secret gesetzt:

```bash
firebase functions:secrets:set TANKERKOENIG_API_KEY --project tankprofi
```

Für lokale Emulatoren liegt der Key in `functions/.secret.local`. Diese Datei wird ignoriert und nicht versioniert.

## Lokal starten

Einmalig Abhängigkeiten installieren:

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

Die App läuft dann standardmäßig unter:

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
- `/api/city-snapshot.php`
- `/api/city-stations.php?snapshotId=<id>&cityId=berlin`
- `/api/admin/city-prices/update.php`

Firebase Hosting routet `/api/**` automatisch zur Cloud Function `api`.

## Durchschnittspreise Großstädte

Das Modul vergleicht Diesel, E5 und E10 für die 15 größten deutschen Städte. Die Nutzeransicht liest nur den aktuellen vollständigen Snapshot aus Firestore. Ein neuer Lauf wird maximal stündlich ausgeführt, setzt einen Lock gegen parallele Updates und markiert erst nach fehlerfreiem Abschluss den neuen Snapshot als `isCurrent`.

Collections:

- `fuel_city_config` - erweiterbare Stadt- und Suchpunkt-Konfiguration
- `fuel_city_snapshots` - Status und Metadaten je Aktualisierungslauf
- `fuel_city_station_prices` - deduplizierte Tankstellenpreise je Snapshot und Stadt
- `fuel_city_rankings` - berechnete Durchschnitts-, Min-/Max- und Rankingwerte
- `fuel_city_update_lock` - Lock gegen parallele Aktualisierungen

Die Ampel-Schwellen für Kartenmarker liegen standardmäßig bei +/- 0,02 EUR relativ zum Stadtdurchschnitt und können über `fuel_city_config/_settings` mit `cheapDelta` und `expensiveDelta` angepasst werden.

## Datenmodell Firestore

Tankprofi verwendet eine zentrale Standort- und Adressstruktur. Autohöfe, Raststätten, Truck Stops, Ladeparks und Tankstellen werden nicht in parallelen Standortdatenbanken gepflegt, sondern als Merkmale desselben Standortdatensatzes gespeichert.

Zentrale Collections:

- `tankprofi_addresses` - kanonische Adressen mit `addressHash` als stabilem Schlüssel
- `tankprofi_stations` - zentrale Standortdatensätze für Tankstellen, Autohöfe, Raststätten, Truck Stops, Ladeparks und Service Areas
- `tankprofi_prices` - optionale Preisverläufe; aktuelle Preise liegen zusätzlich in `tankprofi_stations.currentPrices`
- `tankprofi_logs` - Import-, Scan- und Dublettenhinweise
- `tankprofi_scan_cells` / `tankprofi_scan_runs` / `tankprofi_coverage` - systematische Flächenerfassung

Service-Merkmale werden direkt auf `tankprofi_stations` ergänzt, u. a. `standortTyp`, `autohofTyp`, `autobahn`, `ausfahrt`, `tankstelleVorhanden`, `eLadesaeulen`, `lkwParkplaetze`, `pkwParkplaetze`, `serviceMerkmale`, `tankstellenReferenzen`, `quelle`, `quelleId` und `lastAutohofScan`.

Legacy-Collections wie `autobahn_station_directory` und `autohof_station_directory` werden nur noch als Lesefallback für vorhandene Altdaten verwendet. Neue Importläufe schreiben in `tankprofi_stations` und `tankprofi_addresses`.

## Optionaler lokaler Node-Server

Falls die Firebase CLI noch nicht installiert ist, kann die Oberflaeche testweise auch mit dem kleinen lokalen Fallback-Server gestartet werden:

```bash
$env:TANKERKOENIG_API_KEY="your-tankerkoenig-api-key"
npm run serve:node
```

Die Firebase-Variante ist die Zielarchitektur.
