if (window.location.protocol === 'file:') {
    window.location.replace('http://localhost:8080/');
}

const appVersion = '20260624-drive-autobahn-price-refresh';
const DRIVE_HIGHWAY_PRICE_MAX_AGE_MS = 15 * 60 * 1000;
const USAGE_PRICE_MAX_AGE_MS = 30 * 60 * 1000;

const state = {
    map: null,
    layer: null,
    drivingRouteLayer: null,
    drivingDirectionLayer: null,
    markers: new Map(),
    userLocationMarker: null,
    selectedId: null,
    selectedLocation: null,
    stations: [],
    view: 'list',
    listMode: 'results',
    favorites: [],
    citySnapshot: null,
    cityRankings: [],
    cityStations: [],
    selectedCityId: null,
    cityMapMode: 'overview',
    cityAutoUpdateRunning: false,
    cityAutoUpdateStartedAt: null,
    cityAutoUpdateSnapshotId: null,
    cityAutoUpdateTimer: null,
    cityAutoUpdateProgress: null,
    cityAutoUpdateMessage: null,
    autobahnStations: [],
    selectedHighway: 'all',
    autobahnPriceLoadingId: null,
    autobahnLoadKey: null,
    drivingActive: false,
    drivingWatchId: null,
    drivingUpdateTimer: null,
    drivingUpdateInProgress: false,
    drivingRouteId: 'ALL',
    drivingDetectedRouteId: null,
    drivingSamples: [],
    drivingRouteTankpoints: [],
    drivingRouteLoadedAt: null,
    drivingStatus: 'inactive',
    drivingDirection: null,
    drivingSpeedKmh: null,
    drivingAccuracy: null,
    drivingNearestRouteDistanceKm: null,
    drivingCurrentRoutePosition: null,
    drivingContext: 'unknown',
    drivingCityLastLoadAt: null,
    drivingCityLastLoadKey: null,
    drivingMessage: 'Fahrmodus starten.',
    favoriteRefreshId: 0,
    navRequestId: 0,
    stationRequestId: 0,
    installPrompt: null,
    splashStartedAt: 0,
    splashHidden: false,
    activeDataRequests: 0,
    startupLocationPending: false,
};

const startupFallbackLocation = {
    label: 'Deutschland Mitte',
    lat: 51.1657,
    lng: 10.4515,
};

const els = {
    appShell: document.querySelector('#appShell'),
    searchInput: document.querySelector('#searchInput'),
    searchButton: document.querySelector('#searchButton'),
    locationButton: document.querySelector('#locationButton'),
    driveMode: document.querySelector('#driveModeButton'),
    help: document.querySelector('#helpButton'),
    helpSheet: document.querySelector('#helpSheet'),
    helpClose: document.querySelector('#helpCloseButton'),
    suggestions: document.querySelector('#suggestions'),
    settingsSheet: document.querySelector('#settingsSheet'),
    settingsBackdrop: document.querySelector('#settingsBackdrop'),
    settingsClose: document.querySelector('#settingsCloseButton'),
    shareToggle: document.querySelector('#shareToggleButton'),
    shareContent: document.querySelector('#shareContent'),
    shareLink: document.querySelector('#shareLinkInput'),
    shareCopy: document.querySelector('#shareCopyButton'),
    homeInstall: document.querySelector('#homeInstallButton'),
    splashInstall: document.querySelector('#splashInstallButton'),
    cityUpdate: document.querySelector('#cityUpdateButton'),
    cityForceUpdate: document.querySelector('#cityForceUpdateButton'),
    cityUpdateStatus: document.querySelector('#cityUpdateStatus'),
    tankprofiAddressCount: document.querySelector('#tankprofiAddressCount'),
    tankprofiStationCount: document.querySelector('#tankprofiStationCount'),
    tankprofiAutohofCount: document.querySelector('#tankprofiAutohofCount'),
    tankprofiRastCount: document.querySelector('#tankprofiRastCount'),
    tankprofiChargingCount: document.querySelector('#tankprofiChargingCount'),
    tankprofiTruckCount: document.querySelector('#tankprofiTruckCount'),
    tankprofiStatsStatus: document.querySelector('#tankprofiStatsStatus'),
    radius: document.querySelector('#radiusSelect'),
    fuel: document.querySelector('#fuelSelect'),
    limit: document.querySelector('#limitSelect'),
    sortButtons: document.querySelectorAll('.sort-toggle-button'),
    brand: document.querySelector('#brandSelect'),
    openOnly: document.querySelector('#openOnly'),
    pricedOnly: document.querySelector('#pricedOnly'),
    results: document.querySelector('#results'),
    resultCount: document.querySelector('#resultCount'),
    resultMeta: document.querySelector('#resultMeta'),
    drivingMapBack: document.querySelector('#drivingMapBackButton'),
    globalProgress: document.querySelector('#globalProgress'),
    status: document.querySelector('#statusPill'),
    splash: document.querySelector('#splashScreen'),
    refresh: document.querySelector('#refreshButton'),
    detail: document.querySelector('#stationDetail'),
    viewButtons: document.querySelectorAll('.view-button'),
    bottomNavButtons: document.querySelectorAll('.bottom-nav-button'),
    template: document.querySelector('#stationTemplate'),
};

function setupTopControls() {
    const summary = document.querySelector('.result-summary');
    if (!summary) return;

    const info = summary.querySelector('div:not(.global-progress)');
    if (info) info.classList.add('result-info');

    if (!els.status && info) {
        els.status = document.createElement('span');
        els.status.id = 'statusPill';
        els.status.className = 'status-pill';
        els.status.textContent = 'Bereit';
        info.appendChild(els.status);
    }

    let actions = summary.querySelector('.quick-actions');
    if (!actions) {
        actions = document.createElement('div');
        actions.className = 'quick-actions';
        summary.appendChild(actions);
    }

    const sortToggle = document.querySelector('.sort-toggle');
    if (els.locationButton) {
        els.locationButton.lastChild.textContent = 'Standort';
        actions.appendChild(els.locationButton);
    }
    if (sortToggle) actions.appendChild(sortToggle);
    if (els.refresh) els.refresh.remove();
}

function startSplashScreen() {
    if (!els.splash) return;
    state.splashStartedAt = Date.now();
    window.setTimeout(() => hideSplashScreen(true), 8500);
}

function hideSplashScreen(force = false) {
    if (!els.splash || state.splashHidden) return;
    const minVisibleMs = 1400;
    const elapsed = Date.now() - state.splashStartedAt;
    if (!force && elapsed < minVisibleMs) {
        window.setTimeout(() => hideSplashScreen(), minVisibleMs - elapsed);
        return;
    }

    state.splashHidden = true;
    els.splash.classList.add('hidden');
    window.setTimeout(() => els.splash?.remove(), 900);
}

function isStandaloneApp() {
    return window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function installButtonHtml(text, hint, icon = 'H') {
    return `
        <span class="home-install-icon" aria-hidden="true">${icon}</span>
        <span class="home-install-copy">
            <strong>${text}</strong>
            <small>${hint}</small>
        </span>
    `;
}

function updateInstallButtons(text) {
    [els.homeInstall, els.splashInstall].forEach((button) => {
        if (!button) return;
        if (isStandaloneApp()) {
            button.classList.add('is-installed');
            button.innerHTML = '<span aria-hidden="true">✓</span>Installiert';
            return;
        }
        button.classList.remove('is-installed');
        button.innerHTML = installButtonHtml(text, 'Als Homescreen-Lesezeichen');
    });
}

async function installToHomeScreen() {
    if (isStandaloneApp()) {
        updateInstallButtons('Installiert');
        return;
    }

    if (state.installPrompt) {
        state.installPrompt.prompt();
        await state.installPrompt.userChoice.catch(() => null);
        state.installPrompt = null;
        updateInstallButtons('Tankprofi speichern');
        return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const message = isIos
        ? 'iPhone: Teilen öffnen und "Zum Home-Bildschirm" wählen.'
        : 'Browser-Menü öffnen und "App installieren" oder "Zum Startbildschirm hinzufügen" wählen.';
    setStatus('Homescreen');
    if (els.cityUpdateStatus) els.cityUpdateStatus.textContent = message;
    window.alert(message);
}

function initInstallPrompt() {
    updateInstallButtons('Tankprofi speichern');
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        state.installPrompt = event;
        updateInstallButtons('Tankprofi speichern');
    });
    window.addEventListener('appinstalled', () => {
        state.installPrompt = null;
        updateInstallButtons('Installiert');
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                registration.update();
                if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            })
            .catch(() => {});
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        const reloadKey = `tankprofi-sw-reloaded-${appVersion}`;
        if (sessionStorage.getItem(reloadKey) === '1') return;
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
    });
}

function initMap() {
    if (state.map) return;
    if (window.L) {
        state.map = L.map('map', { zoomControl: false }).setView([51.1657, 10.4515], 6);
        L.control.zoom({ position: 'bottomright' }).addTo(state.map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(state.map);
        state.layer = L.markerClusterGroup
            ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 42 }).addTo(state.map)
            : L.layerGroup().addTo(state.map);
        return;
    }

    const map = document.querySelector('#map');
    map.classList.add('fallback-map');
    map.innerHTML = `
        <iframe class="fallback-map-frame" title="OpenStreetMap Karte" loading="lazy"></iframe>
        <div class="fallback-marker-layer"></div>
    `;
    state.map = { type: 'fallback', element: map };
}

function ensureMap() {
    initMap();
}

function refreshMapLayout() {
    if (!state.map || state.map.type === 'fallback') return;

    state.map.invalidateSize();
    setTimeout(() => state.map.invalidateSize(), 120);
    setTimeout(() => state.map.invalidateSize(), 360);
}

function setStatus(text) {
    if (els.status) els.status.textContent = text;
}

function updateGlobalProgress() {
    const active = state.activeDataRequests > 0;
    els.appShell?.classList.toggle('data-loading', active);
    els.globalProgress?.setAttribute('aria-hidden', active ? 'false' : 'true');
}

function beginDataRequest() {
    state.activeDataRequests += 1;
    updateGlobalProgress();
}

function endDataRequest() {
    state.activeDataRequests = Math.max(0, state.activeDataRequests - 1);
    updateGlobalProgress();
}

function beginNavigation() {
    state.navRequestId += 1;
    return state.navRequestId;
}

function isCurrentNavigation(requestId, listMode = null) {
    return requestId === state.navRequestId && (!listMode || state.listMode === listMode);
}

function debounce(fn, delay = 350) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function isValidPriceValue(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
}

function money(value) {
    const number = Number(value);
    return isValidPriceValue(number) ? `${number.toFixed(3).replace('.', ',')} €` : '-';
}

function autobahnPriceValue(station, fuel = els.fuel.value) {
    return station.prices?.[fuel]?.price ?? null;
}

function autobahnPriceStand(station) {
    const dates = ['diesel', 'e5', 'e10']
        .map((fuel) => station.prices?.[fuel]?.recordedAt)
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a);
    return dates[0]?.toISOString?.() || null;
}

function hasRecentAutobahnPrice(station, maxAgeMs = USAGE_PRICE_MAX_AGE_MS) {
    const stand = validDateMs(autobahnPriceStand(station) || station.last_update || station.importedAt);
    if (stand === null) return false;
    return Date.now() - stand <= maxAgeMs;
}

function autobahnPriceSummary(station) {
    if (!station.prices) return 'Keine gespeicherten Preise';
    return `Diesel ${money(station.prices.diesel?.price)} · E5 ${money(station.prices.e5?.price)} · E10 ${money(station.prices.e10?.price)}`;
}

function routePriceStand(tankpoint) {
    const dates = ['diesel', 'e5', 'e10']
        .map((fuel) => tankpoint.prices?.[fuel]?.recordedAt)
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a);
    return dates[0]?.toISOString?.() || tankpoint.lastUpdated || null;
}

function selectedFuelPriceStand(station, fuel = els.fuel.value) {
    if (!isValidPriceValue(fuelPriceValue(station, fuel))) return null;
    return station.prices?.[fuel]?.recordedAt || station.last_update || station.lastUpdated || null;
}

function validDateMs(value) {
    const ms = Date.parse(value || '');
    return Number.isFinite(ms) ? ms : null;
}

function hasCurrentDrivingPrice(station, fuel = els.fuel.value, maxAgeMs = DRIVE_HIGHWAY_PRICE_MAX_AGE_MS) {
    const stand = validDateMs(selectedFuelPriceStand(station, fuel));
    if (stand === null) return false;
    return Date.now() - stand <= maxAgeMs;
}

function hasDrivingPrice(station, fuel = els.fuel.value) {
    return isValidPriceValue(fuelPriceValue(station, fuel));
}

function autobahnDataStand(stations = state.stations) {
    const priceTimes = stations
        .map(autobahnPriceStand)
        .map(validDateMs)
        .filter((value) => value !== null)
        .sort((a, b) => a - b);
    const importTimes = stations
        .map((station) => station.importedAt || station.last_update)
        .map(validDateMs)
        .filter((value) => value !== null)
        .sort((a, b) => a - b);

    return {
        newestPrice: priceTimes[priceTimes.length - 1] || null,
        oldestPrice: priceTimes[0] || null,
        newestImport: importTimes[importTimes.length - 1] || null,
        priceCount: priceTimes.length,
    };
}

function autobahnDataStandText(stations = state.stations) {
    const stand = autobahnDataStand(stations);
    if (stand.newestPrice) {
        const oldest = stand.oldestPrice && stand.oldestPrice !== stand.newestPrice
            ? `, ältester Preis ${formatDateTime(stand.oldestPrice)}`
            : '';
        return `Preise zuletzt aktualisiert ${formatDateTime(stand.newestPrice)}${oldest}`;
    }
    if (stand.newestImport) return `Stammdaten: ${formatDateTime(stand.newestImport)}`;
    return 'Datenstand unbekannt';
}

function distanceText(station) {
    const distance = Number(station.distance);
    return Number.isFinite(distance) ? `${distance.toFixed(1).replace('.', ',')} km` : '-';
}

function address(station) {
    if (!station) return '';
    const street = station.street || station.addressStreet || '';
    const houseNumber = station.house_number || station.houseNumber || '';
    const postcode = station.postcode || station.postCode || station.zip || '';
    const city = station.city || station.place || station.town || '';

    if (station?.autobahnMode) {
        const streetAddress = [street, houseNumber].filter(Boolean).join(' ');
        const placeAddress = [postcode, city].filter(Boolean).join(' ');
        return [streetAddress, placeAddress].filter(Boolean).join(', ');
    }

    return [street, houseNumber, postcode, city]
        .filter(Boolean)
        .join(' ');
}

function compactAddress(station) {
    const value = address(station);
    if (!value) return station.city || station.brand || '';

    const name = (station.name || '').toLowerCase();
    const parts = address(station)
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => String(part).toLowerCase());
    const alreadyInName = parts.length > 0 && parts.every((part) => name.includes(part));

    return alreadyInName ? '' : value;
}

function brandInfo(station) {
    const raw = (station.brand || station.name || '').toLowerCase();
    const brands = [
        ['aral', 'Aral', 'aral'],
        ['shell', 'Shell', 'shell'],
        ['esso', 'Esso', 'esso'],
        ['total', 'Total', 'total'],
        ['jet', 'Jet', 'jet'],
        ['hem', 'HEM', 'hem'],
        ['avia', 'Avia', 'avia'],
        ['star', 'Star', 'star'],
        ['bft', 'BFT', 'bft'],
        ['agip', 'Agip', 'agip'],
        ['eni', 'Eni', 'agip'],
        ['score', 'Score', 'score'],
    ];
    const match = brands.find(([needle]) => raw.includes(needle));
    if (match) return { label: match[1], className: match[2] };

    const fallback = (station.brand || station.name || 'Tank').trim();
    return {
        label: fallback.slice(0, 4),
        className: 'generic',
    };
}

function stationBrandKey(station) {
    return brandInfo(station).className;
}

function getVisibleStations() {
    if (state.listMode === 'cities' || state.listMode === 'autobahn' || state.listMode === 'driving') return state.stations;
    const selectedBrand = els.brand.value;
    if (selectedBrand === 'all') return state.stations;
    return state.stations.filter((station) => stationBrandKey(station) === selectedBrand);
}

function brandLogoHtml(station) {
    const brand = brandInfo(station);
    return `<span class="brand-logo ${brand.className}">${escapeHtml(brand.label)}</span>`;
}

function isAutohofStation(station) {
    const type = String(station?.type || station?.directorySource || '').toLowerCase();
    const text = `${station?.name || ''} ${station?.operator || ''}`.toLowerCase();
    return type.includes('autohof') || text.includes('autohof');
}

function autobahnKindClass(station) {
    return isAutohofStation(station) ? 'autohof-rank' : 'raststaette-rank';
}

function tankRastBadgeHtml(station) {
    const operator = String(station?.operator || '').toLowerCase();
    if (isAutohofStation(station) || !operator.includes('rast')) return '';
    return '<span class="tank-rast-badge">Tank & Rast</span>';
}

function markerClass(station, thresholds) {
    if (station.priceCategory) {
        return ({ cheap: 'green-dark', medium: 'yellow-light', mid: 'yellow-light', expensive: 'red-dark', high: 'red-dark' })[station.priceCategory] || 'yellow-light';
    }
    if (!station.is_open || !isValidPriceValue(station.price)) return 'muted';
    if (thresholds?.prices?.length > 1) {
        const price = Number(station.price);
        const prices = thresholds.prices;
        let first = -1;
        let last = -1;
        for (let index = 0; index < prices.length; index += 1) {
            if (prices[index] === price) {
                if (first === -1) first = index;
                last = index;
            }
        }
        if (first !== -1) {
            const ratio = ((first + last) / 2) / Math.max(1, prices.length - 1);
            if (ratio <= 0.1667) return 'green-dark';
            if (ratio <= 0.3334) return 'green-light';
            if (ratio <= 0.5001) return 'yellow-dark';
            if (ratio <= 0.6668) return 'yellow-light';
            if (ratio <= 0.8335) return 'red-light';
            return 'red-dark';
        }
    }
    if (!Number.isFinite(thresholds.range) || thresholds.range <= 0) return 'green-dark';
    const ratio = Math.max(0, Math.min(1, (Number(station.price) - thresholds.low) / thresholds.range));
    if (ratio <= 0.1667) return 'green-dark';
    if (ratio <= 0.3334) return 'green-light';
    if (ratio <= 0.5001) return 'yellow-dark';
    if (ratio <= 0.6668) return 'yellow-light';
    if (ratio <= 0.8335) return 'red-light';
    return 'red-dark';
}

function priceClassFor(station, thresholds) {
    return `price-rank-${markerClass(station, thresholds)}`;
}

function priceClassForFuel(station, fuel) {
    const price = Number(fuelPriceValue(station, fuel));
    if (!isValidPriceValue(price)) return 'price-rank-muted';
    const candidates = getVisibleStations()
        .filter((item) => isValidPriceValue(fuelPriceValue(item, fuel)))
        .map((item) => ({
            price: Number(fuelPriceValue(item, fuel)),
            is_open: true,
        }));
    return priceClassFor({ price, is_open: true }, thresholdsFor(candidates));
}

function visiblePriceClass(station) {
    return priceClassFor(station, thresholdsFor(getVisibleStations()));
}

function categoryForDelta(delta) {
    if (!Number.isFinite(delta)) return 'mid';
    if (delta <= -0.02) return 'cheap';
    if (delta >= 0.02) return 'high';
    return 'mid';
}

function thresholdsFor(stations) {
    const prices = stations
        .filter((station) => station.is_open && isValidPriceValue(station.price))
        .map((station) => Number(station.price))
        .filter(isValidPriceValue)
        .sort((a, b) => a - b);

    if (!prices.length) return { low: 0, high: Number.POSITIVE_INFINITY, range: 0, prices: [] };
    const low = prices[0];
    const high = prices[prices.length - 1];
    return {
        low,
        high: high > low ? high : Number.POSITIVE_INFINITY,
        range: high - low,
        prices,
    };
}

function sortStations() {
    const byDistance = document.querySelector('.sort-toggle-button.active')?.dataset.sort === 'distance';
    state.stations.sort((a, b) => {
        const distanceA = Number.isFinite(Number(a.distance)) ? Number(a.distance) : Number.MAX_VALUE;
        const distanceB = Number.isFinite(Number(b.distance)) ? Number(b.distance) : Number.MAX_VALUE;
        const priceA = isValidPriceValue(a.price) ? Number(a.price) : Number.MAX_VALUE;
        const priceB = isValidPriceValue(b.price) ? Number(b.price) : Number.MAX_VALUE;
        if (byDistance) {
            return distanceA - distanceB || priceA - priceB;
        }

        return priceA - priceB || distanceA - distanceB;
    });
}

function iconFor(station, thresholds, selected = false) {
    const price = station.price ? String(Math.round(station.price * 100)).slice(-2) : '';
    const cls = selected ? 'selected' : markerClass(station, thresholds);
    return L.divIcon({
        className: '',
        html: `<span class="price-marker ${cls}">${price}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
    });
}

function userLocationIcon() {
    return L.divIcon({
        className: '',
        html: '<span class="user-location-marker"><i></i></span>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
    });
}

function renderUserLocationMarker() {
    if (!state.map || state.map.type === 'fallback' || !state.selectedLocation) return;
    const lat = Number(state.selectedLocation.lat);
    const lng = Number(state.selectedLocation.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (state.userLocationMarker) {
        state.userLocationMarker.setLatLng([lat, lng]);
    } else {
        state.userLocationMarker = L.marker([lat, lng], {
            icon: userLocationIcon(),
            zIndexOffset: 1000,
        }).addTo(state.map);
    }
    state.userLocationMarker.bindPopup(`<strong>Dein Standort</strong><br>${escapeHtml(state.selectedLocation.label || '')}`);
}

function popupHtml(station) {
    const navUrl = `https://waze.com/ul?ll=${station.lat}%2C${station.lng}&navigate=yes`;
    const priceClass = visiblePriceClass(station);
    if (station.cityOverview) {
        const category = ({ cheap: 'günstig', mid: 'mittel', high: 'teuer' })[station.priceCategory] || 'mittel';
        return `
            <h3 class="popup-title">${escapeHtml(station.name)}</h3>
            <p class="popup-meta">${escapeHtml(fuelLabel(els.fuel.value))} im Städtevergleich: ${escapeHtml(category)}</p>
            <p class="popup-price ${priceClass}">${money(station.price)}</p>
            <p class="popup-meta">Rang ${station.rank || '-'} · ${station.stationCount || 0} Tankstellen</p>
            <p class="popup-meta">Stand ${formatDateTime(state.citySnapshot?.completedAt)}</p>
        `;
    }
    if (station.cityMode) {
        const category = ({ cheap: 'günstig', medium: 'mittel', expensive: 'teuer' })[station.priceCategory] || 'mittel';
        return `
            <h3 class="popup-title">${escapeHtml(station.name)}</h3>
            <p class="popup-meta">${escapeHtml(station.brand || 'Freie Tankstelle')}</p>
            <p class="popup-meta">${escapeHtml(address(station))}</p>
            <p class="popup-price ${priceClass}">${money(station.price)}</p>
            <p class="popup-meta">${escapeHtml(fuelLabel(els.fuel.value))}: ${escapeHtml(category)}</p>
            <p class="popup-meta">Erfasst ${formatDateTime(station.last_update)} · ${distanceText(station)} zum Suchpunkt</p>
            <a class="nav-link" href="${navUrl}" target="_blank" rel="noopener">Mit Waze starten</a>
        `;
    }
    if (station.autobahnMode) {
        const side = station.sideLabel ? ` · ${station.sideLabel}` : '';
        const direction = station.directionText ? ` · ${station.directionText}` : '';
        const features = station.features?.length ? station.features.slice(0, 4).join(', ') : 'Services nicht angegeben';
        const priceStand = autobahnPriceStand(station);
        return `
            <h3 class="popup-title">${escapeHtml(station.name)}</h3>
            <p class="popup-meta">${escapeHtml(station.highway || 'Autobahn unbekannt')}${escapeHtml(side)}${escapeHtml(direction)}</p>
            <p class="popup-meta">${escapeHtml(station.brand || 'Tankstelle')} · ${escapeHtml(station.city || '')}</p>
            <p class="popup-price ${priceClass}">${escapeHtml(fuelLabel(els.fuel.value))}: ${money(autobahnPriceValue(station))}</p>
            <p class="popup-meta">${priceStand ? `Preisdaten: ${formatDateTime(priceStand)}` : 'Keine gespeicherten Preisdaten'}</p>
            <p class="popup-meta">${escapeHtml(features)}</p>
            <a class="nav-link" href="${navUrl}" target="_blank" rel="noopener">Mit Waze starten</a>
        `;
    }
    return `
        <h3 class="popup-title">${escapeHtml(station.name)}</h3>
        <p class="popup-meta">${escapeHtml(station.brand || 'Freie Tankstelle')}</p>
        <p class="popup-meta">${escapeHtml(address(station))}</p>
        <p class="popup-meta">${station.distance.toFixed(1).replace('.', ',')} km entfernt</p>
        <p class="popup-price ${priceClass}">${money(station.price)}</p>
        <p class="popup-meta">${station.is_open ? 'Geöffnet' : 'Geschlossen'} · aktualisiert ${formatTime(station.last_update)}</p>
        <a class="nav-link" href="${navUrl}" target="_blank" rel="noopener">Mit Waze starten</a>
    `;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    }[char]));
}

function formatTime(value) {
    if (!value) return 'unbekannt';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'unbekannt';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value) {
    if (!value) return 'unbekannt';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'unbekannt';
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatCompactDateTime(value) {
    if (!value) return 'unbekannt';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'unbekannt';
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function setView(view) {
    state.view = view;
    els.appShell.classList.toggle('view-list', view === 'list');
    els.appShell.classList.toggle('view-map', view === 'map');
    els.viewButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.view === view);
    });
    updateBottomNav();

    if (view === 'map') {
        ensureMap();
        if (state.map.type !== 'fallback') {
            state.map.setView([51.1657, 10.4515], state.stations.length ? 7 : 6, { animate: false });
        }
        setTimeout(() => {
            if (state.listMode === 'cities' && state.cityMapMode === 'overview') {
                renderCityOverviewMap();
                return;
            }
            refreshMapLayout();
            renderMarkers();
            const station = state.stations.find((item) => item.tankerkoenig_id === state.selectedId);
            if (station && state.map.type !== 'fallback') {
                state.map.setView([station.lat, station.lng], Math.max(state.map.getZoom(), 14), { animate: true });
            }
        }, 180);
    }
}

function renderMarkers() {
    if (!state.map) return;

    state.markers.clear();
    const visibleStations = getVisibleStations();
    const thresholds = thresholdsFor(visibleStations);

    if (state.map.type === 'fallback') {
        renderFallbackMap(visibleStations, thresholds);
        return;
    }

    if (!state.layer) return;
    state.layer.clearLayers();

    visibleStations.forEach((station) => {
        const marker = L.marker([station.lat, station.lng], {
            icon: iconFor(station, thresholds, station.tankerkoenig_id === state.selectedId),
        }).bindPopup(popupHtml(station));

        if (window.matchMedia?.('(hover: hover)').matches) {
            marker.on('mouseover', () => marker.openPopup());
            marker.on('mouseout', () => {
                if (state.selectedId !== station.tankerkoenig_id) marker.closePopup();
            });
        }

        marker.on('click', () => {
            if (station.cityOverview) {
                state.selectedCityId = station.tankerkoenig_id;
                marker.openPopup();
                return;
            }
            if (station.cityMode) {
                state.selectedId = station.tankerkoenig_id;
                renderDetail(station);
                marker.openPopup();
                setView('list');
                return;
            }
            selectStation(station.tankerkoenig_id, true, true);
        });
        marker.addTo(state.layer);
        state.markers.set(station.tankerkoenig_id, marker);
    });

    if (visibleStations.length) {
        const bounds = L.latLngBounds(visibleStations.map((station) => [station.lat, station.lng]));
        state.map.fitBounds(bounds.pad(0.16), { maxZoom: 14 });
    }
    renderUserLocationMarker();
    renderDrivingRouteOverlay();
}

function clearDrivingRouteOverlay() {
    if (!state.map || state.map.type === 'fallback') return;
    if (state.drivingRouteLayer) {
        state.drivingRouteLayer.remove();
        state.drivingRouteLayer = null;
    }
    if (state.drivingDirectionLayer) {
        state.drivingDirectionLayer.remove();
        state.drivingDirectionLayer = null;
    }
}

function drivingDirectionTarget(position, direction) {
    if (!position || !direction) return null;
    const delta = direction === 'Berlin' ? 0.08 : -0.08;
    return {
        lat: Number(position.lat) + delta,
        lng: Number(position.lng),
    };
}

function renderDrivingRouteOverlay() {
    if (!state.map || state.map.type === 'fallback') return;
    clearDrivingRouteOverlay();
    if (state.listMode !== 'driving') return;

    const activeRouteId = state.drivingDetectedRouteId || state.drivingRouteId;
    const routePoints = routeTankpointsFor(activeRouteId)
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .sort((a, b) => routeSortValue(a) - routeSortValue(b));
    const routeLatLngs = routePoints.map((point) => [point.lat, point.lng]);

    if (routeLatLngs.length >= 2) {
        state.drivingRouteLayer = L.polyline(routeLatLngs, {
            color: '#101419',
            weight: 5,
            opacity: 0.74,
            dashArray: '10 8',
        }).addTo(state.map);
    }

    const position = state.drivingSamples[state.drivingSamples.length - 1] || state.selectedLocation;
    const target = drivingDirectionTarget(position, state.drivingDirection);
    if (position && target) {
        state.drivingDirectionLayer = L.polyline([[position.lat, position.lng], [target.lat, target.lng]], {
            color: '#1f4fbf',
            weight: 6,
            opacity: 0.86,
        }).addTo(state.map);
    }

    const fitPoints = [
        ...(position ? [[position.lat, position.lng]] : []),
        ...state.stations.map((station) => [station.lat, station.lng]),
    ].filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)));
    if (fitPoints.length) {
        state.map.fitBounds(L.latLngBounds(fitPoints).pad(0.22), { maxZoom: 13 });
    }
}

function renderFallbackMap(stations, thresholds) {
    const frame = document.querySelector('.fallback-map-frame');
    const layer = document.querySelector('.fallback-marker-layer');
    if (!frame || !layer) return;

    layer.innerHTML = '';
    const points = stations.length ? stations : [{ lat: 51.1657, lng: 10.4515 }];
    const lats = points.map((station) => station.lat);
    const lngs = points.map((station) => station.lng);
    const minLat = Math.min(...lats) - 0.015;
    const maxLat = Math.max(...lats) + 0.015;
    const minLng = Math.min(...lngs) - 0.025;
    const maxLng = Math.max(...lngs) + 0.025;
    const center = points[0];

    frame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;

    stations.forEach((station) => {
        const x = ((station.lng - minLng) / Math.max(maxLng - minLng, 0.0001)) * 100;
        const y = (1 - ((station.lat - minLat) / Math.max(maxLat - minLat, 0.0001))) * 100;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `fallback-marker ${station.tankerkoenig_id === state.selectedId ? 'selected' : markerClass(station, thresholds)}`;
        button.style.left = `${Math.max(4, Math.min(96, x))}%`;
        button.style.top = `${Math.max(4, Math.min(96, y))}%`;
        button.textContent = station.price ? String(Math.round(station.price * 100)).slice(-2) : '';
        button.title = [
            station.name || 'Tankstelle',
            station.brand || '',
            address(station),
            money(station.price),
            distanceText(station),
        ].filter(Boolean).join(' - ');
        button.addEventListener('click', () => selectStation(station.tankerkoenig_id, false, true));
        layer.appendChild(button);
        state.markers.set(station.tankerkoenig_id, button);
    });
}

function renderResults() {
    els.results.innerHTML = '';
    if (state.listMode === 'cities') {
        if (state.cityMapMode === 'stationsList') renderCityStationList();
        else renderCityRankings();
        return;
    }
    if (state.listMode === 'autobahn') {
        renderAutobahnList();
        return;
    }
    if (state.listMode === 'driving') {
        renderDrivingModeList();
        return;
    }
    sortStations();

    if (state.listMode === 'favorites') {
        renderFavoriteRows();
        els.resultCount.textContent = `${state.favorites.length} Favoriten`;
        els.resultMeta.textContent = 'Gespeicherte Tankstellen';
        if (!state.favorites.length) {
            els.results.innerHTML = '<div class="empty-state">Noch keine Favoriten gespeichert.</div>';
        }
        return;
    }

    const visibleStations = getVisibleStations();
    const listThresholds = thresholdsFor(visibleStations);
    els.resultCount.textContent = `${visibleStations.length} Treffer`;

    visibleStations.forEach((station, index) => {
        const node = els.template.content.firstElementChild.cloneNode(true);
        node.dataset.id = station.tankerkoenig_id;
        const rank = node.querySelector('.rank');
        rank.textContent = String(index + 1);
        rank.classList.add(markerClass(station, listThresholds));
        const price = node.querySelector('.station-list-price');
        price.textContent = money(fuelPriceValue(station, els.fuel.value));
        price.classList.add(priceClassForFuel(station, els.fuel.value));
        node.querySelector('.brand-logo').replaceWith(htmlToElement(brandLogoHtml(station)));
        node.querySelector('.station-name').textContent = station.name || 'Tankstelle';
        node.querySelector('.station-distance').textContent = `${station.distance.toFixed(1).replace('.', ',')} km`;
        node.querySelector('.station-list-address').textContent = compactAddress(station);
        node.addEventListener('click', () => selectStation(station.tankerkoenig_id, true));
        node.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectStation(station.tankerkoenig_id, true);
            }
        });
        els.results.appendChild(node);
    });

    if (!visibleStations.length) {
        els.results.innerHTML = '<div class="empty-state">Keine Treffer für diese Suche.</div>';
        renderDetail(null);
    }
}

function selectStation(id, pan = false, showDetailView = false) {
    if (state.selectedId === id && els.detail.classList.contains('visible')) {
        if (showDetailView) {
            setView('list');
            return;
        }
        state.selectedId = null;
        renderDetail(null);
        document.querySelectorAll('.station-item').forEach((item) => item.classList.remove('selected'));
        renderMarkers();
        return;
    }

    state.selectedId = id;
    document.querySelectorAll('.station-item').forEach((item) => {
        item.classList.toggle('selected', item.dataset.id === id);
    });

    renderMarkers();
    const station = state.stations.find((item) => item.tankerkoenig_id === id);
    renderDetail(station);
    if (station?.autobahnMode) {
        refreshAutobahnStationPrices(id).catch((error) => {
            els.resultMeta.textContent = error.message;
            setStatus('Fehler');
        });
    }
    if (showDetailView) {
        setView('list');
    }
    const marker = state.markers.get(id);
    if (station && marker && state.map?.type !== 'fallback') {
        if (pan) state.map.setView([station.lat, station.lng], Math.max(state.map.getZoom(), 14), { animate: true });
        marker.openPopup();
    }
}

function stationDetailExtraHtml(station) {
    const priceGrid = stationFuelPriceGridHtml(station);
    if (!station?.autobahnMode) return priceGrid;
    const isLoading = state.autobahnPriceLoadingId === station.tankerkoenig_id;
    const priceStand = autobahnPriceStand(station);
    const match = station.priceMatch
        ? `Zuordnung: ${escapeHtml(station.priceMatch.brand || station.priceMatch.name || 'gespeicherte Tankstelle')} (${Number(station.priceMatch.distanceKm || 0).toFixed(2).replace('.', ',')} km)`
        : 'Keine gespeicherte Preiszuordnung gefunden';
    return `
        ${tankRastBadgeHtml(station)}
        ${priceGrid}
        <p class="detail-note">${isLoading ? 'Live-Preise werden gezielt geladen ...' : priceStand ? `Preisdaten: ${formatDateTime(priceStand)}` : 'Noch keine gespeicherten Preisdaten vorhanden.'}</p>
        <p class="detail-note">${match}</p>
    `;
}

function fuelPriceValue(station, fuel) {
    if (station?.cityMode && fuel === els.fuel.value && isValidPriceValue(station.price)) {
        return Number(station.price);
    }
    return station?.prices?.[fuel]?.price ?? station?.[fuel] ?? (station?.fuel_type === fuel ? station.price : null);
}

function stationFuelPriceGridHtml(station) {
    const selectedFuel = els.fuel.value;
    const fuels = [
        ['diesel', 'Diesel'],
        ['e5', 'Super E5'],
        ['e10', 'Super E10'],
    ];
    return `
        <div class="detail-price-grid">
            ${fuels.map(([fuel, label]) => `
                <span class="${priceClassForFuel(station, fuel)}${fuel === selectedFuel ? ' selected' : ''}">
                    ${escapeHtml(label)}
                    <strong>${money(fuelPriceValue(station, fuel))}</strong>
                </span>
            `).join('')}
        </div>
    `;
}

function compactFuelPriceGridHtml(station, className = 'station-list-prices') {
    const selectedFuel = els.fuel.value;
    const fuels = [
        ['diesel', 'Diesel'],
        ['e5', 'E5'],
        ['e10', 'E10'],
    ];
    return `
        <div class="${escapeHtml(className)}">
            ${fuels.map(([fuel, label]) => `
                <span class="${priceClassForFuel(station, fuel)}${fuel === selectedFuel ? ' selected' : ''}">
                    <small>${escapeHtml(label)}</small>
                    <strong>${money(fuelPriceValue(station, fuel))}</strong>
                </span>
            `).join('')}
        </div>
    `;
}

function selectedFuelPriceHtml(station, className, thresholds = null) {
    const fuel = els.fuel.value;
    const price = fuelPriceValue(station, fuel);
    const cls = thresholds
        ? priceClassFor({ price, is_open: station.is_open !== false }, thresholds)
        : priceClassForFuel(station, fuel);
    return `<span class="${escapeHtml(className)} ${cls}">${money(price)}</span>`;
}

function stationHighwayDetailHtml(station) {
    const highway = String(station?.highway || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!highway) return '';

    return `
                <div class="detail-cell">
                    <span class="detail-label">Autobahn</span>
                    <span class="detail-value detail-highway">${escapeHtml(highway)}</span>
                </div>
    `;
}

async function refreshDetailStation(station) {
    if (!station?.tankerkoenig_id) return;
    setStatus('Preise');

    if (station.autobahnMode) {
        await refreshAutobahnStationPrices(station.tankerkoenig_id);
        return;
    }

    const params = new URLSearchParams({
        lat: station.lat,
        lng: station.lng,
        radius: '2',
        fuel: els.fuel.value,
        limit: '25',
        open: els.openOnly.checked ? '1' : '0',
        priced: els.pricedOnly.checked ? '1' : '0',
        q: station.name || station.brand || '',
    });
    const data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 15000 });
    const updatedStations = data.stations || [];
    const updatedById = new Map(updatedStations.map((item) => [item.tankerkoenig_id, item]));
    const updated = updatedById.get(station.tankerkoenig_id);
    if (!updated) throw new Error('Datensatz konnte nicht aktualisiert werden.');

    state.stations = state.stations.map((item) => (
        updatedById.has(item.tankerkoenig_id)
            ? { ...item, ...updatedById.get(item.tankerkoenig_id) }
            : item
    ));
    state.favorites = state.favorites.map((item) => (
        updatedById.has(item.tankerkoenig_id)
            ? { ...item, ...updatedById.get(item.tankerkoenig_id) }
            : item
    ));
    saveFavorites();
    renderResults();
    renderMarkers();
    state.selectedId = station.tankerkoenig_id;
    renderDetail(state.stations.find((item) => item.tankerkoenig_id === station.tankerkoenig_id) || updated);
    setStatus('Aktuell');
}

function renderDetail(station) {
    if (!station) {
        els.appShell.classList.remove('detail-open');
        els.detail.classList.remove('visible');
        els.detail.innerHTML = '<div class="empty-state">Tankstelle antippen, um Details zu sehen.</div>';
        updateBottomNav();
        return;
    }

    const wazeUrl = `https://waze.com/ul?ll=${station.lat}%2C${station.lng}&navigate=yes`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    const appleUrl = `https://maps.apple.com/?daddr=${station.lat},${station.lng}`;
    const geoUrl = `geo:${station.lat},${station.lng}?q=${station.lat},${station.lng}`;
    const detailPriceClass = visiblePriceClass(station);
    els.appShell.classList.add('detail-open');
    els.detail.classList.add('visible');
    updateBottomNav();
    els.detail.innerHTML = `
        <article class="detail-panel">
            <div class="detail-closebar">
                <button class="detail-back" type="button" id="detailBackButton">← Zurueck zur Liste</button>
                <button class="detail-close" type="button" id="detailCloseButton" aria-label="Detailansicht schließen">×</button>
            </div>
            <div class="detail-header">
                ${brandLogoHtml(station)}
                <div>
                    <h2>${escapeHtml(station.name || 'Tankstelle')}</h2>
                    <p class="detail-brand">${escapeHtml(station.brand || 'Freie Tankstelle')}</p>
                </div>
            </div>
            ${stationDetailExtraHtml(station)}
            <div class="detail-grid">
                <div class="detail-cell">
                    <span class="detail-label">Entfernung</span>
                    <span class="detail-value">${distanceText(station)}</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${station.is_open === null ? 'unbekannt' : station.is_open ? 'Geöffnet' : 'Geschlossen'}</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Adresse</span>
                    <span class="detail-value">${escapeHtml(address(station) || '-')}</span>
                </div>
                ${stationHighwayDetailHtml(station)}
                <div class="detail-cell">
                    <span class="detail-label">Aktualisiert</span>
                    <span class="detail-value">${formatTime(station.last_update)}</span>
                </div>
            </div>
            <nav class="detail-footer-nav" aria-label="Detailaktionen">
                <button class="${isFavorite(station.tankerkoenig_id) ? 'active' : ''}" type="button" id="favoriteButton">Favorit</button>
                <button type="button" id="showMapButton">Karte</button>
                <details class="navigation-picker">
                    <summary>Navigation</summary>
                    <div class="navigation-options">
                        <a href="${googleUrl}" target="_blank" rel="noopener">Google Maps</a>
                        <a href="${wazeUrl}" target="_blank" rel="noopener">Waze</a>
                        <a href="${appleUrl}" target="_blank" rel="noopener">Apple Karten</a>
                        <a href="${geoUrl}" target="_blank" rel="noopener">System-Karte</a>
                    </div>
                </details>
            </nav>
        </article>
    `;

    document.querySelector('#detailBackButton')?.addEventListener('click', () => renderDetail(null));
    document.querySelector('#detailCloseButton')?.addEventListener('click', () => renderDetail(null));
    document.querySelector('#favoriteButton')?.addEventListener('click', () => toggleFavorite(station));
    document.querySelector('#showMapButton')?.addEventListener('click', () => setView('map'));
}

function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

async function fetchJson(url, options = {}) {
    const timeoutMs = Number(options.timeoutMs || 20000);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    if (options.progress !== false) beginDataRequest();
    try {
        const { timeoutMs: _timeoutMs, progress: _progress, ...fetchOptions } = options;
        const response = await fetch(url, {
            ...fetchOptions,
            signal: fetchOptions.signal || controller.signal,
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || 'Anfrage fehlgeschlagen.');
        return data;
    } finally {
        window.clearTimeout(timeout);
        if (options.progress !== false) endDataRequest();
    }
}

async function geocodeDirect(query) {
    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        countrycodes: 'de',
        limit: '6',
    });
    const data = await fetchJson(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { accept: 'application/json' },
    });
    return data.map((item) => ({
        label: String(item.display_name || ''),
        lat: Number(item.lat || 0),
        lng: Number(item.lon || 0),
        type: String(item.type || ''),
    })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

async function reverseGeocodeDirect(lat, lng) {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '18',
    });
    const data = await fetchJson(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: { accept: 'application/json' },
    });
    return data.display_name || 'Aktueller Standort';
}

async function geocode(query) {
    try {
        const data = await fetchJson(`/api/geocode.php?q=${encodeURIComponent(query)}`);
        return data.items || [];
    } catch {
        return geocodeDirect(query);
    }
}

async function reverseGeocode(lat, lng) {
    const params = new URLSearchParams({ lat, lng });
    try {
        const data = await fetchJson(`/api/reverse.php?${params.toString()}`);
        return data.label || 'Aktueller Standort';
    } catch {
        return reverseGeocodeDirect(lat, lng);
    }
}

async function loadStations() {
    if (!state.selectedLocation) {
        await chooseFirstSuggestion();
        if (!state.selectedLocation) {
            els.resultCount.textContent = 'Keine Suche';
            els.resultMeta.textContent = 'Adresse eingeben oder Standort verwenden.';
            els.results.innerHTML = '<div class="empty-state">Adresse eingeben oder Standort verwenden.</div>';
            hideSplashScreen();
            return;
        }
    }

    const requestId = state.stationRequestId + 1;
    state.stationRequestId = requestId;
    setStatus('Laedt');
    els.resultCount.textContent = 'Suche läuft';
    els.resultMeta.textContent = 'Tankstellen werden geladen ...';
    els.results.innerHTML = '<div class="empty-state">Standort wird abgefragt und Tankstellen werden geladen ...</div>';

    const params = new URLSearchParams({
        lat: state.selectedLocation.lat,
        lng: state.selectedLocation.lng,
        radius: els.radius.value,
        fuel: els.fuel.value,
        limit: els.limit.value,
        open: els.openOnly.checked ? '1' : '0',
        priced: els.pricedOnly.checked ? '1' : '0',
        sort: document.querySelector('.sort-toggle-button.active')?.dataset.sort || 'price',
        q: els.searchInput.value.trim(),
    });

    try {
        const data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 15000 });
        if (requestId !== state.stationRequestId) return;

        state.selectedId = null;
        state.listMode = 'results';
        updateFavoritesButton();
        state.stations = data.stations || [];
        sortStations();
        els.resultCount.textContent = `${state.stations.length} Treffer`;
        els.resultMeta.textContent = data.fallback
            ? `Gespeichert · ${fuelShortLabel(els.fuel.value)} · ${els.radius.value} km`
            : `${fuelShortLabel(els.fuel.value)} · ${els.radius.value} km`;
        if (state.view === 'map') renderMarkers();
        renderResults();
        renderDetail(null);
        setView('list');
        setStatus('Live');
        hideSplashScreen();
    } catch (error) {
        if (requestId !== state.stationRequestId) return;
        setStatus('Fehler');
        els.resultCount.textContent = 'Keine Daten';
        els.resultMeta.textContent = error.message;
        els.results.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        renderDetail(null);
        hideSplashScreen();
    }
}

function prepareNormalSearch(clearLocation = false) {
    if (state.drivingActive) stopDrivingMode(false);
    state.listMode = 'results';
    state.cityMapMode = 'overview';
    state.selectedCityId = null;
    state.selectedHighway = 'all';
    if (clearLocation) state.selectedLocation = null;
    setCityMode(false);
    setDirectoryMode(false);
    renderDetail(null);
    if (state.view !== 'list') setView('list');
    updateBottomNav();
}

function runManualSearch() {
    prepareNormalSearch(true);
    loadStations();
}

function runCurrentLocationSearch(options = {}) {
    prepareNormalSearch(true);
    useCurrentLocation(options);
}

function fuelLabel(value) {
    return ({ e10: 'Super E10', e5: 'Super E5', diesel: 'Diesel' })[value] || value;
}

function fuelShortLabel(value) {
    return ({ e10: 'E10', e5: 'E5', diesel: 'Diesel' })[value] || value;
}

function cityFuelKeys() {
    const fuel = els.fuel.value;
    if (fuel === 'diesel') return {
        avg: 'avgDiesel',
        min: 'minDiesel',
        max: 'maxDiesel',
        rank: 'rankDiesel',
        valid: 'validDieselCount',
        delta: 'priceDeltaDiesel',
        category: 'priceCategoryDiesel',
        price: 'diesel',
    };
    if (fuel === 'e5') return {
        avg: 'avgE5',
        min: 'minE5',
        max: 'maxE5',
        rank: 'rankE5',
        valid: 'validE5Count',
        delta: 'priceDeltaE5',
        category: 'priceCategoryE5',
        price: 'e5',
    };
    return {
        avg: 'avgE10',
        min: 'minE10',
        max: 'maxE10',
        rank: 'rankE10',
        valid: 'validE10Count',
        delta: 'priceDeltaE10',
        category: 'priceCategoryE10',
        price: 'e10',
    };
}

function setCityMode(active) {
    els.appShell.classList.toggle('city-mode', active);
    if (active) {
        els.resultCount.textContent = 'Großstädte';
        els.resultMeta.textContent = state.citySnapshot
            ? `Stand: ${formatDateTime(state.citySnapshot.completedAt)}`
            : 'Snapshot wird geladen ...';
    }
}

function setDirectoryMode(active) {
    els.appShell.classList.toggle('directory-mode', active);
}

function citySnapshotAgeMs(snapshot = state.citySnapshot) {
    const completedAt = snapshot?.completedAt ? new Date(snapshot.completedAt) : null;
    if (!completedAt || Number.isNaN(completedAt.getTime())) return Number.POSITIVE_INFINITY;
    return Date.now() - completedAt.getTime();
}

function shouldRefreshCitySnapshot(snapshot = state.citySnapshot, stale = false) {
    return stale || citySnapshotAgeMs(snapshot) >= 60 * 60 * 1000;
}

function cityUpdateProgressPercent() {
    const progress = state.cityAutoUpdateProgress;
    const cityCount = Number(progress?.cityCount || 0);
    const citiesProcessed = Number(progress?.citiesProcessed || 0);
    if (cityCount > 0) {
        return Math.max(8, Math.min(98, Math.round((citiesProcessed / cityCount) * 100)));
    }
    if (!state.cityAutoUpdateRunning || !state.cityAutoUpdateStartedAt) return 0;
    const elapsed = Date.now() - state.cityAutoUpdateStartedAt;
    return Math.max(8, Math.min(92, Math.round((elapsed / (2.5 * 60 * 1000)) * 100)));
}

function cityUpdateProgressHtml() {
    if (!state.cityAutoUpdateRunning) return '';
    const percent = cityUpdateProgressPercent();
    const progress = state.cityAutoUpdateProgress;
    const processed = Number(progress?.citiesProcessed || 0);
    const total = Number(progress?.cityCount || 0);
    const stationCount = Number(progress?.stationUniqueCount || 0);
    const step = progress?.currentStep || 'Import laeuft';
    const currentCity = progress?.currentCityIndex && progress?.currentCity
        ? `Stadt ${progress.currentCityIndex}/${total || '?'}: ${progress.currentCity}`
        : progress?.currentCity || '';
    const currentPoint = progress?.currentPointIndex && progress?.currentPointCount
        ? `Suchpunkt ${progress.currentPointIndex}/${progress.currentPointCount}${progress.currentPoint ? `: ${progress.currentPoint}` : ''}`
        : progress?.currentPoint || '';
    const detail = total > 0
        ? `${processed} von ${total} Staedten verarbeitet${stationCount ? ` - ${stationCount} Tankstellen` : ''}`
        : 'Die bisherigen Daten bleiben sichtbar, bis der Snapshot abgeschlossen ist.';
    const message = state.cityAutoUpdateMessage || detail;
    const importDetail = [
        progress?.currentDetail || '',
        currentCity,
        currentPoint,
        progress?.progressUpdatedAt ? `Stand ${formatTime(progress.progressUpdatedAt)}` : '',
    ].filter(Boolean).join(' - ');
    return `
        <div class="city-update-progress" role="status" aria-live="polite">
            <div>
                <strong>Neue Städtedaten werden geladen</strong>
                <span>${escapeHtml(message)}</span>
                <small><b>${escapeHtml(step)}</b>${importDetail ? ` - ${escapeHtml(importDetail)}` : ''}</small>
            </div>
            <div class="city-progress-bar" aria-hidden="true"><i style="width: ${percent}%"></i></div>
        </div>
    `;
}

function clearCityAutoUpdateTimer() {
    if (state.cityAutoUpdateTimer) {
        clearTimeout(state.cityAutoUpdateTimer);
        state.cityAutoUpdateTimer = null;
    }
}

async function pollCitySnapshotUntilFresh() {
    clearCityAutoUpdateTimer();
    if (!state.cityAutoUpdateRunning) return;
    try {
        const data = await fetchJson('/api/city-snapshot.php');
        state.cityAutoUpdateProgress = data.update || null;
        const nextId = data.snapshot?.snapshotId;
        const changed = nextId && nextId !== state.cityAutoUpdateSnapshotId;
        if (changed || (data.snapshot && !shouldRefreshCitySnapshot(data.snapshot, data.stale))) {
            state.citySnapshot = data.snapshot;
            state.cityRankings = data.rankings || [];
            state.cityAutoUpdateRunning = false;
            state.cityAutoUpdateStartedAt = null;
            state.cityAutoUpdateSnapshotId = null;
            state.cityAutoUpdateProgress = null;
            state.cityAutoUpdateMessage = null;
            setStatus('Aktuell');
            renderResults();
            return;
        }
        const requestStatus = data.update?.requestStatus;
        if (['completed', 'partial', 'skipped', 'failed'].includes(requestStatus) && !data.update?.running) {
            state.cityAutoUpdateRunning = false;
            state.cityAutoUpdateStartedAt = null;
            state.cityAutoUpdateSnapshotId = null;
            state.cityAutoUpdateMessage = requestStatus === 'failed'
                ? (data.update?.requestError || 'Aktualisierung fehlgeschlagen. Alte Daten bleiben sichtbar.')
                : requestStatus === 'partial'
                    ? 'Aktualisierung mit Teilfehlern beendet. Alte Daten bleiben sichtbar.'
                : 'Kein neuer Snapshot erforderlich. Alte Daten bleiben sichtbar.';
            setStatus(['failed', 'partial'].includes(requestStatus) ? 'Fehler' : 'Aktuell');
            renderResults();
            state.cityAutoUpdateMessage = null;
            state.cityAutoUpdateProgress = null;
            return;
        }
        renderResults();
    } catch {
        // Keep existing snapshot visible and poll again.
    }
    state.cityAutoUpdateTimer = setTimeout(pollCitySnapshotUntilFresh, 10000);
}

async function startCityAutoUpdateIfNeeded(stale = false) {
    if (!shouldRefreshCitySnapshot(state.citySnapshot, stale) || state.cityAutoUpdateRunning) return;
    state.cityAutoUpdateRunning = true;
    state.cityAutoUpdateStartedAt = Date.now();
    state.cityAutoUpdateSnapshotId = state.citySnapshot?.snapshotId || null;
    state.cityAutoUpdateProgress = null;
    state.cityAutoUpdateMessage = null;
    setStatus('Update');
    renderResults();
    try {
        const data = await fetchJson('/api/admin/city-prices/update.php', { method: 'POST' });
        if (els.cityUpdateStatus) {
            els.cityUpdateStatus.textContent = data.queued
                ? 'Automatische Aktualisierung gestartet.'
                : data.reason || 'Aktualisierung läuft oder ist nicht erforderlich.';
        }
    } catch (error) {
        state.cityAutoUpdateRunning = false;
        state.cityAutoUpdateStartedAt = null;
        state.cityAutoUpdateSnapshotId = null;
        state.cityAutoUpdateProgress = null;
        state.cityAutoUpdateMessage = null;
        setStatus('Fehler');
        if (els.cityUpdateStatus) els.cityUpdateStatus.textContent = error.message;
        renderResults();
        return;
    }
    pollCitySnapshotUntilFresh();
}

async function loadCitySnapshot(requestId = state.navRequestId) {
    if (!isCurrentNavigation(requestId, 'cities')) return;
    setCityMode(true);
    setStatus('Snapshot');
    if (!state.citySnapshot) {
        els.results.innerHTML = '<div class="empty-state">Durchschnittspreise werden geladen.</div>';
    }
    try {
        const data = await fetchJson('/api/city-snapshot.php');
        if (!isCurrentNavigation(requestId, 'cities')) return;
        state.cityAutoUpdateProgress = data.update || null;
        state.citySnapshot = data.snapshot;
        state.cityRankings = data.rankings || [];
        if (!state.selectedCityId && state.cityRankings[0]) {
            state.selectedCityId = state.cityRankings[0].cityId;
        }
        setStatus(data.stale ? 'Alt' : 'Aktuell');
        renderResults();
        startCityAutoUpdateIfNeeded(data.stale);
    } catch (error) {
        if (!isCurrentNavigation(requestId, 'cities')) return;
        setStatus('Fehler');
        els.results.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
}

function renderCityRankings() {
    setCityMode(true);
    const keys = cityFuelKeys();
    if (!state.citySnapshot) {
        els.resultCount.textContent = 'Keine Daten';
        els.resultMeta.textContent = 'Noch kein vollständiger Snapshot vorhanden.';
        els.results.innerHTML = '<div class="empty-state">Im Adminbereich die Durchschnittspreise aktualisieren.</div>';
        return;
    }

    const rankings = [...state.cityRankings]
        .filter((item) => item[keys.avg] !== null && item[keys.avg] !== undefined)
        .sort((a, b) => Number(a[keys.avg]) - Number(b[keys.avg]) || String(a.cityName).localeCompare(String(b.cityName), 'de'));
    const cheapest = rankings[0]?.cityId;
    const expensive = rankings[rankings.length - 1]?.cityId;
    const totals = rankings.reduce((acc, item) => {
        acc.stationCount += Number(item.stationCount || 0);
        ['avgDiesel', 'avgE5', 'avgE10'].forEach((key) => {
            if (Number.isFinite(Number(item[key]))) {
                acc[key].sum += Number(item[key]);
                acc[key].count += 1;
            }
        });
        return acc;
    }, {
        stationCount: 0,
        avgDiesel: { sum: 0, count: 0 },
        avgE5: { sum: 0, count: 0 },
        avgE10: { sum: 0, count: 0 },
    });

    els.resultCount.textContent = `${rankings.length} Großstädte`;
    els.resultMeta.textContent = `${formatDateTime(state.citySnapshot.completedAt)} · ${totals.stationCount} Tankstellen`;
    els.results.innerHTML = `
        <section class="city-dashboard">
            <div class="city-toolbar">
                <strong>Durchschnittspreise Großstädte</strong>
                <div class="city-view-tabs">
                    <button type="button" data-city-view="list">Liste</button>
                    <button type="button" data-city-view="map">Karte</button>
                </div>
                <div class="city-fuel-tabs">
                    <button type="button" data-city-fuel="diesel"><span>Diesel</span><strong>${averageMoney(totals.avgDiesel)}</strong></button>
                    <button type="button" data-city-fuel="e5"><span>E5</span><strong>${averageMoney(totals.avgE5)}</strong></button>
                    <button type="button" data-city-fuel="e10"><span>E10</span><strong>${averageMoney(totals.avgE10)}</strong></button>
                </div>
            </div>
            ${cityUpdateProgressHtml()}
            <div class="city-table" role="table" aria-label="Durchschnittspreise Großstädte">
                <div class="city-row city-head" role="row">
                    <span>Rang</span><span>Stadt</span><span>Diesel</span><span>E5</span><span>E10</span><span>Stationen</span><span>Min</span><span>Max</span><span>Stand</span>
                </div>
                ${rankings.map((city, index) => cityRowHtml(city, index + 1, keys, cheapest, expensive)).join('')}
            </div>
        </section>
    `;

    applyCityPriceColors(rankings, keys);

    els.results.querySelectorAll('[data-city-fuel]').forEach((button) => {
        button.classList.toggle('active', button.dataset.cityFuel === els.fuel.value);
        button.addEventListener('click', () => {
            els.fuel.value = button.dataset.cityFuel;
            renderResults();
            if (state.view === 'map') {
                if (state.cityMapMode === 'overview') renderCityOverviewMap();
                else loadCityStations(state.selectedCityId);
            }
        });
    });
    els.results.querySelectorAll('[data-city-view]').forEach((button) => {
        button.classList.toggle('active', button.dataset.cityView === 'list');
        button.addEventListener('click', () => {
            if (button.dataset.cityView === 'map') {
                openCityOverviewMap();
                return;
            }
            state.cityMapMode = 'overview';
            setView('list');
            renderResults();
        });
    });
    els.results.querySelectorAll('[data-city-id]').forEach((button) => {
        button.addEventListener('click', () => openCityStationList(button.dataset.cityId));
    });
}

function averageMoney(group) {
    if (!group.count) return '-';
    return money(group.sum / group.count);
}

function cityPriceRankClass(key, value) {
    const price = Number(value);
    if (!Number.isFinite(price)) return 'price-rank-muted';
    const candidates = state.cityRankings
        .map((city) => ({ price: Number(city[key]), is_open: true }))
        .filter((city) => Number.isFinite(city.price));
    return priceClassFor({ price, is_open: true }, thresholdsFor(candidates));
}

function cityPriceCellHtml(city, key, label) {
    return `<span class="city-data city-price-cell ${cityPriceRankClass(key, city[key])}" data-label="${escapeHtml(label)}">${money(city[key])}</span>`;
}

function applyCityPriceColors(rankings, keys) {
    const priceColumns = [
        { childIndex: 3, key: 'avgDiesel' },
        { childIndex: 4, key: 'avgE5' },
        { childIndex: 5, key: 'avgE10' },
        { childIndex: 7, key: keys.min },
        { childIndex: 8, key: keys.max },
    ];
    els.results.querySelectorAll('.city-row[data-city-id]').forEach((row) => {
        const city = rankings.find((item) => item.cityId === row.dataset.cityId);
        if (!city) return;
        priceColumns.forEach(({ childIndex, key }) => {
            const cell = row.querySelector(`span:nth-child(${childIndex})`);
            if (!cell) return;
            cell.classList.add('city-price-cell', cityPriceRankClass(key, city[key]));
        });
    });
}

function cityRowHtml(city, rank, keys, cheapest, expensive) {
    const cls = city.cityId === cheapest ? ' cheapest' : city.cityId === expensive ? ' expensive' : '';
    const rankTone = city.cityId === cheapest ? 'cheap' : city.cityId === expensive ? 'high' : 'mid';
    const fuelClass = ` fuel-${els.fuel.value}`;
    return `
        <button class="city-row${cls}${fuelClass}" type="button" data-city-id="${escapeHtml(city.cityId)}" role="row">
            <span class="rank ${rankTone}">${rank}</span>
            <strong>${escapeHtml(city.cityName)}</strong>
            <span class="city-data" data-label="Ø Diesel">${money(city.avgDiesel)}</span>
            <span class="city-data" data-label="Ø E5">${money(city.avgE5)}</span>
            <span class="city-data" data-label="Ø E10">${money(city.avgE10)}</span>
            <span class="city-data" data-label="Tankstellen">${Number(city.stationCount || 0)}</span>
            <span class="city-data" data-label="Günstigster">${money(city[keys.min])}</span>
            <span class="city-data" data-label="Teuerster">${money(city[keys.max])}</span>
            <span class="city-data" data-label="Stand">${formatCompactDateTime(city.collectedAt)}</span>
        </button>
    `;
}

async function openCityStationList(cityId) {
    state.selectedCityId = cityId;
    state.listMode = 'cities';
    state.cityMapMode = 'stationsList';
    setView('list');
    await loadCityStations(cityId, 'list');
}

async function openCityMap(cityId) {
    state.selectedCityId = cityId;
    state.listMode = 'cities';
    state.cityMapMode = 'stations';
    setView('map');
    await loadCityStations(cityId, 'map');
}

function openCityOverviewMap() {
    state.listMode = 'cities';
    state.cityMapMode = 'overview';
    setView('map');
    renderCityOverviewMap();
}

function renderCityOverviewMap() {
    if (!state.citySnapshot) return;
    ensureMap();
    refreshMapLayout();
    const keys = cityFuelKeys();
    const cityPrices = state.cityRankings
        .map((city) => Number(city[keys.avg]))
        .filter((price) => Number.isFinite(price));
    const overallAvg = cityPrices.length
        ? cityPrices.reduce((sum, price) => sum + price, 0) / cityPrices.length
        : null;

    state.stations = state.cityRankings.map((city) => {
        const price = Number(city[keys.avg]);
        const delta = Number.isFinite(price) && Number.isFinite(overallAvg) ? price - overallAvg : null;
        return {
            cityOverview: true,
            tankerkoenig_id: city.cityId,
            name: city.cityName,
            lat: Number(city.centerLat),
            lng: Number(city.centerLng),
            price,
            priceCategory: categoryForDelta(delta),
            stationCount: city.stationCount,
            rank: city[keys.rank],
            is_open: true,
            distance: 0,
        };
    }).filter((city) => Number.isFinite(city.lat) && Number.isFinite(city.lng));

    els.resultCount.textContent = 'Großstadtkarte';
    els.resultMeta.textContent = `${fuelLabel(els.fuel.value)} Ø ${money(overallAvg)} · ${state.cityRankings.length} Städte · Stand ${formatDateTime(state.citySnapshot.completedAt)}`;
    renderMarkers();
    setStatus('Karte');
}

function cityStationRankClass(station, thresholds) {
    if (!station.is_open || !isValidPriceValue(station.price)) return 'muted';
    return markerClass({ price: station.price, is_open: true }, thresholds);
}

function cityStationRowHtml(station, rank, thresholds) {
    const cls = cityStationRankClass(station, thresholds);
    const addressParts = address(station);
    const category = ({ cheap: 'günstig', mid: 'mittel', high: 'teuer', muted: 'ohne Preis' })[cls] || 'mittel';
    return `
        <button class="city-station-row" type="button" data-city-station-id="${escapeHtml(station.tankerkoenig_id)}">
            <span class="rank ${cls}">${rank}</span>
            ${brandLogoHtml(station)}
            <span class="city-station-main">
                <strong>${escapeHtml(station.name || 'Tankstelle')}</strong>
                <small>${escapeHtml(station.brand || 'Freie Tankstelle')} · ${escapeHtml(addressParts || 'Adresse unbekannt')}</small>
            </span>
            ${selectedFuelPriceHtml(station, 'city-station-price', thresholds)}
            <span class="city-station-meta">${escapeHtml(category)} · ${Number(station.distance || 0).toFixed(1).replace('.', ',')} km</span>
        </button>
    `;
}

function renderCityStationList() {
    setCityMode(true);
    const keys = cityFuelKeys();
    const city = state.cityRankings.find((item) => item.cityId === state.selectedCityId);
    const stations = [...state.stations]
        .filter((station) => station.cityMode)
        .sort((a, b) => {
            const priceA = isValidPriceValue(a.price) ? Number(a.price) : Number.MAX_VALUE;
            const priceB = isValidPriceValue(b.price) ? Number(b.price) : Number.MAX_VALUE;
            return priceA - priceB || Number(a.distance || 0) - Number(b.distance || 0) || String(a.name).localeCompare(String(b.name), 'de');
        });

    if (!city || !state.citySnapshot) {
        els.resultCount.textContent = 'Keine Stadt';
        els.resultMeta.textContent = 'Stadt-Snapshot nicht geladen.';
        els.results.innerHTML = '<div class="empty-state">Bitte die Großstadtliste neu öffnen.</div>';
        return;
    }

    const cityStationThresholds = thresholdsFor(stations);

    els.resultCount.textContent = city.cityName;
    els.resultMeta.textContent = `${fuelLabel(els.fuel.value)} Ø ${money(city[keys.avg])} · ${stations.length} Einträge · Stand ${formatDateTime(state.citySnapshot.completedAt)}`;
    els.results.innerHTML = `
        <section class="city-dashboard city-station-dashboard">
            <div class="city-toolbar">
                <button class="text-button city-back-button" type="button" data-city-back>Zurück</button>
                <strong>${escapeHtml(city.cityName)} · Tankstellen</strong>
                <div class="city-view-tabs">
                    <button type="button" class="active" data-city-station-view="list">Liste</button>
                    <button type="button" data-city-station-view="map">Karte</button>
                </div>
                <div class="city-fuel-tabs">
                    <button type="button" data-city-fuel="diesel">Diesel</button>
                    <button type="button" data-city-fuel="e5">E5</button>
                    <button type="button" data-city-fuel="e10">E10</button>
                </div>
            </div>
            <div class="city-station-list">
                ${stations.map((station, index) => cityStationRowHtml(station, index + 1, cityStationThresholds)).join('')}
            </div>
        </section>
    `;

    els.results.querySelector('[data-city-back]')?.addEventListener('click', () => {
        state.cityMapMode = 'overview';
        state.selectedCityId = null;
        state.stations = [];
        renderResults();
    });
    els.results.querySelectorAll('[data-city-station-view]').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.cityStationView === 'map') openCityMap(state.selectedCityId);
        });
    });
    els.results.querySelectorAll('[data-city-fuel]').forEach((button) => {
        button.classList.toggle('active', button.dataset.cityFuel === els.fuel.value);
        button.addEventListener('click', () => {
            els.fuel.value = button.dataset.cityFuel;
            loadCityStations(state.selectedCityId, 'list');
        });
    });
    els.results.querySelectorAll('[data-city-station-id]').forEach((button) => {
        button.addEventListener('click', () => {
            state.selectedId = button.dataset.cityStationId;
            const station = state.stations.find((item) => item.tankerkoenig_id === state.selectedId);
            renderDetail(station);
        });
    });
}

async function loadCityStations(cityId, target = 'map') {
    if (!state.citySnapshot || !cityId) return;
    setStatus(target === 'list' ? 'Liste' : 'Karte');
    const params = new URLSearchParams({
        snapshotId: state.citySnapshot.snapshotId,
        cityId,
    });
    const data = await fetchJson(`/api/city-stations.php?${params.toString()}`);
    const keys = cityFuelKeys();
    state.cityStations = data.stations || [];
    state.stations = state.cityStations.map((station) => ({
        cityMode: true,
        tankerkoenig_id: station.stationId,
        name: station.name || 'Tankstelle',
        brand: station.brand || '',
        street: station.street || station.addressStreet || '',
        house_number: station.houseNumber || station.house_number || '',
        postcode: station.postCode || station.postcode || station.zip || '',
        city: station.place || station.city || station.town || '',
        lat: Number(station.lat),
        lng: Number(station.lng),
        distance: Number(station.distanceKm || 0),
        is_open: station.isOpen !== false,
        price: isValidPriceValue(station[keys.price]) ? Number(station[keys.price]) : null,
        diesel: isValidPriceValue(station.diesel) ? Number(station.diesel) : null,
        e5: isValidPriceValue(station.e5) ? Number(station.e5) : null,
        e10: isValidPriceValue(station.e10) ? Number(station.e10) : null,
        prices: {
            diesel: isValidPriceValue(station.diesel) ? { price: Number(station.diesel), recordedAt: station.collectedAt } : null,
            e5: isValidPriceValue(station.e5) ? { price: Number(station.e5), recordedAt: station.collectedAt } : null,
            e10: isValidPriceValue(station.e10) ? { price: Number(station.e10), recordedAt: station.collectedAt } : null,
        },
        priceCategory: station[keys.category],
        last_update: station.collectedAt,
    })).filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng));

    const city = state.cityRankings.find((item) => item.cityId === cityId);
    els.resultCount.textContent = city ? city.cityName : 'Stadtkarte';
    els.resultMeta.textContent = city
        ? `${fuelLabel(els.fuel.value)} Ø ${money(city[keys.avg])} · ${city[keys.valid] || 0} Tankstellen · Stand ${formatDateTime(state.citySnapshot.completedAt)}`
        : `Stand ${formatDateTime(state.citySnapshot.completedAt)}`;
    if (target === 'list') renderCityStationList();
    else renderMarkers();
    setStatus('Aktuell');
}

function routeDistanceKm(latA, lngA, latB, lngB) {
    const aLat = Number(latA);
    const aLng = Number(lngA);
    const bLat = Number(latB);
    const bLng = Number(lngB);
    if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
    const toRad = (value) => (value * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const startLat = toRad(aLat);
    const endLat = toRad(bLat);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;
    return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(from, to) {
    const lat1 = Number(from.lat) * Math.PI / 180;
    const lat2 = Number(to.lat) * Math.PI / 180;
    const dLng = (Number(to.lng) - Number(from.lng)) * Math.PI / 180;
    if (![lat1, lat2, dLng].every(Number.isFinite)) return null;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function detectDrivingDirection(samples = state.drivingSamples) {
    const usable = samples
        .filter((sample) => Number.isFinite(sample.lat) && Number.isFinite(sample.lng))
        .slice(-5);
    if (usable.length < 2) return null;
    const first = usable[0];
    const last = usable[usable.length - 1];
    const distance = routeDistanceKm(first.lat, first.lng, last.lat, last.lng);
    const elapsedHours = Math.max(0, (last.timestamp - first.timestamp) / 3600000);
    const calculatedSpeed = elapsedHours > 0 ? distance / elapsedHours : 0;
    const speedKmh = Number.isFinite(last.speedKmh) && last.speedKmh > 0 ? last.speedKmh : calculatedSpeed;
    state.drivingSpeedKmh = speedKmh;
    state.drivingAccuracy = last.accuracy;
    if (speedKmh < 20 || Number(last.accuracy) > 100 || distance < 0.08) return null;

    const bearing = calculateBearing(first, last);
    if (!Number.isFinite(bearing)) return null;
    const latDelta = Number(last.lat) - Number(first.lat);
    if (Math.abs(latDelta) > 0.00045) return latDelta > 0 ? 'Berlin' : 'Muenchen';
    if (bearing >= 315 || bearing <= 45) return 'Berlin';
    if (bearing >= 135 && bearing <= 225) return 'Muenchen';
    return null;
}

function routeSortValue(point) {
    if (point.kmPosition !== null && point.kmPosition !== undefined && point.kmPosition !== '' && Number.isFinite(Number(point.kmPosition))) return Number(point.kmPosition);
    if (point.streckenIndex !== null && point.streckenIndex !== undefined && point.streckenIndex !== '' && Number.isFinite(Number(point.streckenIndex))) return Number(point.streckenIndex);
    return Number(point.lat);
}

function routeUsesLatFallback(routeId) {
    return routeTankpointsFor(routeId).every((point) => (
        (point.kmPosition === null || point.kmPosition === undefined || point.kmPosition === '' || !Number.isFinite(Number(point.kmPosition)))
        && (point.streckenIndex === null || point.streckenIndex === undefined || point.streckenIndex === '' || !Number.isFinite(Number(point.streckenIndex)))
    ));
}

function normalizeRouteDirection(value) {
    const text = String(value || 'beide').toLowerCase();
    if (text.includes('berlin') || text.includes('nord')) return 'Berlin';
    if (text.includes('muenchen') || text.includes('münchen') || text.includes('nuernberg') || text.includes('nürnberg') || text.includes('sued') || text.includes('süd')) return 'Muenchen';
    return 'beide';
}

function distanceToSegmentKm(point, start, end) {
    const latScale = 111.32;
    const lngScale = 111.32 * Math.max(0.2, Math.cos((Number(point.lat) * Math.PI) / 180));
    const px = Number(point.lng) * lngScale;
    const py = Number(point.lat) * latScale;
    const ax = Number(start.lng) * lngScale;
    const ay = Number(start.lat) * latScale;
    const bx = Number(end.lng) * lngScale;
    const by = Number(end.lat) * latScale;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return routeDistanceKm(point.lat, point.lng, start.lat, start.lng);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
    const x = ax + t * dx;
    const y = ay + t * dy;
    return Math.sqrt((px - x) ** 2 + (py - y) ** 2);
}

function routeLabel(routeId = state.drivingDetectedRouteId || state.drivingRouteId) {
    return routeId && routeId !== 'ALL' ? routeId : 'A';
}

function routeTankpointsFor(routeId) {
    return state.drivingRouteTankpoints.filter((point) => {
        const pointRoute = String(point.routeId || point.autobahn || '').toUpperCase();
        return routeId === 'ALL' || pointRoute === routeId;
    });
}

function hasAnyFuelPrice(point) {
    return ['diesel', 'e5', 'e10'].some((fuel) => isValidPriceValue(fuelPriceValue(point, fuel)));
}

function routeHasEnoughPricedPoints(routeId, minCount = 2) {
    return routeTankpointsFor(routeId).filter(hasAnyFuelPrice).length >= minCount;
}

function detectCurrentRoute(position, routeId = state.drivingRouteId) {
    if (!position || !state.drivingRouteTankpoints.length) {
        return { onRoute: false, distanceKm: Number.POSITIVE_INFINITY, routeId };
    }
    const routeIds = routeId === 'ALL'
        ? [...new Set(state.drivingRouteTankpoints.map((point) => String(point.routeId || point.autobahn || '').toUpperCase()).filter((value) => /^A\d+$/.test(value)))]
        : [routeId];
    let best = { onRoute: false, distanceKm: Number.POSITIVE_INFINITY, routeId };

    routeIds.forEach((currentRouteId) => {
        if (!routeHasEnoughPricedPoints(currentRouteId)) return;
        const points = routeTankpointsFor(currentRouteId).sort((a, b) => routeSortValue(a) - routeSortValue(b));
        if (!points.length) return;
        let distanceKm = Math.min(...points.map((point) => routeDistanceKm(position.lat, position.lng, point.lat, point.lng)));
        for (let index = 1; index < points.length; index += 1) {
            distanceKm = Math.min(distanceKm, distanceToSegmentKm(position, points[index - 1], points[index]));
        }
        if (distanceKm < best.distanceKm) best = { onRoute: distanceKm <= 18, distanceKm, routeId: currentRouteId };
    });

    state.drivingNearestRouteDistanceKm = best.distanceKm;
    state.drivingDetectedRouteId = best.onRoute ? best.routeId : null;
    return best;
}

function estimateCurrentRoutePosition(position) {
    const points = routeTankpointsFor(state.drivingDetectedRouteId || state.drivingRouteId)
        .filter((point) => Number.isFinite(routeSortValue(point)));
    if (!position || !points.length) return null;
    let nearest = null;
    points.forEach((point) => {
        const distance = routeDistanceKm(position.lat, position.lng, point.lat, point.lng);
        if (!nearest || distance < nearest.distance) nearest = { point, distance };
    });
    if (!nearest) return null;
    state.drivingCurrentRoutePosition = routeSortValue(nearest.point);
    return state.drivingCurrentRoutePosition;
}

function routePointDistanceAheadKm(point, position) {
    if (!position) return null;
    return routeDistanceKm(position.lat, position.lng, point.lat, point.lng);
}

function getNextTankpointsOnRoute({ position, direction, limit = 5 } = {}) {
    if (!position || !direction) return [];
    const currentPosition = estimateCurrentRoutePosition(position);
    if (!Number.isFinite(currentPosition)) return [];
    const activeRouteId = state.drivingDetectedRouteId || state.drivingRouteId;
    const usesLatFallback = routeUsesLatFallback(activeRouteId);
    const candidates = routeTankpointsFor(activeRouteId)
        .filter((point) => {
            const pointDirection = normalizeRouteDirection(point.richtung);
            if (pointDirection !== 'beide' && pointDirection !== direction) return false;
            const value = routeSortValue(point);
            if (!Number.isFinite(value)) return false;
            if (usesLatFallback) return direction === 'Berlin' ? value > currentPosition : value < currentPosition;
            return direction === 'Muenchen' ? value > currentPosition : value < currentPosition;
        })
        .map((point) => ({
            ...point,
            distance: routePointDistanceAheadKm(point, position),
            is_open: point.isOpen,
            price: fuelPriceValue(point, els.fuel.value),
            last_update: routePriceStand(point),
        }))
        .filter((point) => Number.isFinite(point.distance))
        .sort((a, b) => (
            usesLatFallback
                ? (direction === 'Berlin' ? routeSortValue(a) - routeSortValue(b) : routeSortValue(b) - routeSortValue(a))
                : (direction === 'Muenchen' ? routeSortValue(a) - routeSortValue(b) : routeSortValue(b) - routeSortValue(a))
        ));
    return candidates.slice(0, limit);
}

async function loadCityDriveStations(position, limit = 5) {
    if (!position) return [];
    const lat = Number(position.lat);
    const lng = Number(position.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const loadKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${els.fuel.value}`;
    const fresh = state.drivingCityLastLoadKey === loadKey
        && state.drivingCityLastLoadAt
        && Date.now() - state.drivingCityLastLoadAt < 30000;
    if (fresh && state.stations.length && state.drivingContext === 'city') {
        return state.stations
            .map((station) => ({
                ...station,
                distance: routeDistanceKm(lat, lng, station.lat, station.lng),
            }))
            .filter((station) => Number.isFinite(station.distance))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);
    }

    const candidateLimit = Math.max(25, limit * 5);
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: '5',
        fuel: els.fuel.value,
        limit: String(candidateLimit),
        open: '1',
        priced: '1',
        q: 'Fahrmodus',
    });
    const data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 15000, progress: false });
    state.drivingCityLastLoadAt = Date.now();
    state.drivingCityLastLoadKey = loadKey;
    return (data.stations || [])
        .map((station) => ({
            ...station,
            drivingContext: 'city',
            drivingMode: true,
            distance: Number(station.distance || Number.POSITIVE_INFINITY),
        }))
        .filter((station) => Number.isFinite(station.distance))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
}

function mergeLiveDrivingPrice(station, liveStation) {
    if (!liveStation) return station;
    return {
        ...station,
        is_open: liveStation.is_open ?? station.is_open,
        price: fuelPriceValue(liveStation, els.fuel.value),
        prices: liveStation.prices || station.prices,
        last_update: liveStation.last_update || station.last_update,
        priceSource: 'live',
    };
}

function bestLiveMatchForDrivingStation(station, liveStations = []) {
    const stationId = String(station.tankerkoenigId || station.tankerkoenig_id || station.stationId || station.priceStationId || '').replace(/^tankkoenig_/, '');
    const direct = liveStations.find((candidate) => {
        const candidateId = String(candidate.tankerkoenigId || candidate.tankerkoenig_id || candidate.stationId || '').replace(/^tankkoenig_/, '');
        return stationId && candidateId && stationId === candidateId;
    });
    if (direct) return direct;

    return liveStations
        .map((candidate) => ({
            candidate,
            distance: routeDistanceKm(station.lat, station.lng, candidate.lat, candidate.lng),
        }))
        .filter((item) => Number.isFinite(item.distance) && item.distance <= 0.35)
        .sort((a, b) => a.distance - b.distance)[0]?.candidate || null;
}

async function loadLivePricesForDrivingStations(stations) {
    const staleStations = stations.filter((station) => !hasCurrentDrivingPrice(station));
    if (!staleStations.length) return stations;

    const refreshed = await Promise.all(stations.map(async (station) => {
        if (hasCurrentDrivingPrice(station)) return station;
        const lat = Number(station.lat);
        const lng = Number(station.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return station;
        const params = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            radius: '3',
            fuel: els.fuel.value,
            limit: '10',
            open: '1',
            priced: '1',
            live: '1',
            q: 'Fahrmodus Preise',
        });
        try {
            const data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 15000, progress: false });
            return mergeLiveDrivingPrice(station, bestLiveMatchForDrivingStation(station, data.stations || []));
        } catch (error) {
            return station;
        }
    }));

    return refreshed;
}

async function loadLiveCityDriveStations(position, limit = 10) {
    const lat = Number(position?.lat);
    const lng = Number(position?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: '5',
        fuel: els.fuel.value,
        limit: String(Math.max(50, limit * 8)),
        open: '1',
        priced: '1',
        live: '1',
        sort: 'distance',
        q: 'Fahrmodus Live',
    });
    let data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 15000, progress: false });
    let usedStoredFallback = data.fallback === true || data.stored === true;
    if (!(data.stations || []).length) {
        params.delete('live');
        data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 15000, progress: false });
        usedStoredFallback = true;
    }
    state.drivingCityLastLoadAt = Date.now();
    state.drivingCityLastLoadKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${els.fuel.value}`;
    state.drivingCityLastSource = usedStoredFallback ? 'fallback' : 'live';
    state.drivingCityLastMessage = usedStoredFallback
        ? (data.message || 'Live-Preise nicht erreichbar - gespeicherte Preise koennen abweichen')
        : '';
    return (data.stations || [])
        .map((station) => ({
            ...station,
            drivingContext: 'city',
            drivingMode: true,
            priceSource: usedStoredFallback ? 'fallback' : 'live',
            distance: Number(station.distance || Number.POSITIVE_INFINITY),
        }))
        .filter((station) => Number.isFinite(station.distance) && hasDrivingPrice(station))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
}

function normalizeRouteTankpoint(point) {
    return {
        drivingMode: true,
        tankerkoenig_id: point.id || point.stationId,
        id: point.id || point.stationId,
        stationId: point.stationId || point.id,
        priceStationId: point.priceStationId || '',
        name: point.name || 'Tankpunkt',
        brand: point.brand || 'Tankstelle',
        typ: point.typ || point.type || 'tankpunkt',
        autobahn: point.autobahn || point.routeId || '',
        routeId: point.routeId || point.autobahn || '',
        richtung: point.richtung || 'beide',
        direktAnAutobahn: point.direktAnAutobahn === true,
        abfahrtName: point.abfahrtName || '',
        abfahrtNummer: point.abfahrtNummer || '',
        abfahrtEntfernungKm: Number.isFinite(Number(point.abfahrtEntfernungKm)) ? Number(point.abfahrtEntfernungKm) : null,
        abfahrtEntfernungMin: Number.isFinite(Number(point.abfahrtEntfernungMin)) ? Number(point.abfahrtEntfernungMin) : null,
        streckenIndex: point.streckenIndex !== null && point.streckenIndex !== undefined && point.streckenIndex !== '' && Number.isFinite(Number(point.streckenIndex)) ? Number(point.streckenIndex) : null,
        kmPosition: point.kmPosition !== null && point.kmPosition !== undefined && point.kmPosition !== '' && Number.isFinite(Number(point.kmPosition)) ? Number(point.kmPosition) : null,
        lat: Number(point.lat),
        lng: Number(point.lng),
        distance: Number(point.distance || 0),
        is_open: point.isOpen ?? point.is_open ?? null,
        prices: point.prices || null,
        price: null,
        source: point.source || '',
        lastUpdated: point.lastUpdated || null,
        last_update: routePriceStand(point),
    };
}

async function loadRouteTankpoints(routeId = state.drivingRouteId) {
    const freshMs = state.drivingRouteLoadedAt ? Date.now() - state.drivingRouteLoadedAt : Number.POSITIVE_INFINITY;
    if (state.drivingRouteTankpoints.length && freshMs < 30 * 60 * 1000) return state.drivingRouteTankpoints;
    const data = await fetchJson(`/api/route/tankpoints.php?route=${encodeURIComponent(routeId)}`);
    state.drivingRouteTankpoints = (data.tankpoints || [])
        .map(normalizeRouteTankpoint)
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    state.drivingRouteLoadedAt = Date.now();
    return state.drivingRouteTankpoints;
}

function drivingModePriceStandText(stations = state.stations) {
    const times = stations
        .map(routePriceStand)
        .map(validDateMs)
        .filter((value) => value !== null)
        .sort((a, b) => b - a);
    return times.length ? `Preise Stand ${formatDateTime(times[0])}` : 'Keine gespeicherten Preise';
}

function drivingModeHintHtml() {
    return `
        <div class="driving-hint">
            <strong>${escapeHtml(state.drivingMessage || 'Fahrtrichtung wird ermittelt')}</strong>
            <span>GPS wird nur im aktiven Fahrmodus genutzt. Es erfolgt keine permanente externe Umkreissuche.</span>
        </div>
    `;
}

function drivingTestPanelHtml() {
    const sample = state.drivingSamples[state.drivingSamples.length - 1] || {};
    const lat = Number.isFinite(sample.lat) ? sample.lat : 51.401904;
    const lng = Number.isFinite(sample.lng) ? sample.lng : 12.18128;
    const direction = state.drivingDirection || 'Muenchen';
    return `
        <form class="driving-test-panel" data-driving-test-form>
            <strong>Testposition</strong>
            <label>
                <span>Breite</span>
                <input name="lat" type="number" step="0.000001" value="${escapeHtml(lat)}">
            </label>
            <label>
                <span>Länge</span>
                <input name="lng" type="number" step="0.000001" value="${escapeHtml(lng)}">
            </label>
            <label>
                <span>Richtung</span>
                <select name="direction">
                    <option value="Muenchen"${direction === 'Muenchen' ? ' selected' : ''}>München/Nürnberg</option>
                    <option value="Berlin"${direction === 'Berlin' ? ' selected' : ''}>Berlin</option>
                </select>
            </label>
            <button class="text-button" type="submit">Ansicht testen</button>
            <div class="driving-test-presets">
                <button type="button" data-driving-preset-lat="50.914758" data-driving-preset-lng="6.834332" data-driving-preset-direction="Berlin">A1 Frechen -> Nord</button>
                <button type="button" data-driving-preset-lat="51.406848" data-driving-preset-lng="7.478127" data-driving-preset-direction="Berlin">A1 Hagen -> Nord</button>
                <button type="button" data-driving-preset-lat="53.053350" data-driving-preset-lng="9.031812" data-driving-preset-direction="Muenchen">A1 Oyten -> Sued</button>
            </div>
        </form>
    `;
}

function routeTankpointTypeLabel(value) {
    const text = String(value || '').toLowerCase();
    if (text.includes('autohof')) return 'Autohof';
    if (text.includes('rast')) return 'Raststätte';
    if (text.includes('abfahrt')) return 'Tankstelle nahe Abfahrt';
    return 'Tankpunkt';
}

function drivingTankpointRowHtml(station, rank, thresholds) {
    const cls = markerClass(station, thresholds);
    const typeLabel = routeTankpointTypeLabel(station.typ);
    const access = station.direktAnAutobahn
        ? 'direkt an Autobahn'
        : `nahe Abfahrt${station.abfahrtEntfernungMin ? `, ca. ${station.abfahrtEntfernungMin} Min.` : ''}`;
    const exit = [station.abfahrtNummer ? `AS ${station.abfahrtNummer}` : '', station.abfahrtName].filter(Boolean).join(' ');
    return `
        <button class="driving-row" type="button" data-driving-station-id="${escapeHtml(station.tankerkoenig_id)}">
            <span class="rank ${cls}">${rank}</span>
            ${brandLogoHtml(station)}
            <span class="driving-main">
                <strong>${escapeHtml(station.name || 'Tankpunkt')}</strong>
                <small>${escapeHtml(typeLabel)} · ${escapeHtml(access)}${exit ? ` · ${escapeHtml(exit)}` : ''}</small>
                <small>Diesel ${money(fuelPriceValue(station, 'diesel'))} · E5 ${money(fuelPriceValue(station, 'e5'))} · E10 ${money(fuelPriceValue(station, 'e10'))}</small>
            </span>
            <span class="driving-distance">${Number(station.distance || 0).toFixed(1).replace('.', ',')} km</span>
            <span class="driving-status">${station.is_open === false ? 'geschlossen' : station.is_open === true ? 'geöffnet' : 'Status offen'}</span>
        </button>
    `;
}

function drivingTankpointCardHtml(station, rank, thresholds) {
    const cls = markerClass(station, thresholds);
    const typeLabel = routeTankpointTypeLabel(station.typ);
    const isCity = state.drivingContext === 'city' || station.drivingContext === 'city';
    const access = station.direktAnAutobahn
        ? 'direkt an Autobahn'
        : `nahe Abfahrt${station.abfahrtEntfernungMin ? `, ca. ${station.abfahrtEntfernungMin} Min.` : ''}`;
    const exit = [station.abfahrtNummer ? `AS ${station.abfahrtNummer}` : '', station.abfahrtName].filter(Boolean).join(' ');
    const status = station.is_open === false ? 'geschlossen' : station.is_open === true ? 'geoeffnet' : 'Status unbekannt';
    const subtitle = isCity
        ? `${escapeHtml(station.brand || 'Tankstelle')} - ${escapeHtml(address(station) || 'Umkreis')}`
        : `${escapeHtml(typeLabel)} - ${escapeHtml(access)}${exit ? ` - ${escapeHtml(exit)}` : ''}`;
    const selectedFuel = els.fuel.value;
    return `
        <button class="driving-row driving-card" type="button" data-driving-station-id="${escapeHtml(station.tankerkoenig_id)}">
            <span class="rank ${cls}">${rank}</span>
            <span class="driving-main">
                <span class="driving-titleline">
                    ${brandLogoHtml(station)}
                    <strong>${escapeHtml(station.name || 'Tankpunkt')}</strong>
                </span>
                <small>${subtitle}</small>
            </span>
            <span class="driving-distance"><strong>${Number(station.distance || 0).toFixed(1).replace('.', ',')}</strong><small>${isCity ? 'km entfernt' : 'km voraus'}</small></span>
            <span class="driving-selected-price ${priceClassForFuel(station, selectedFuel)}">
                <small>${escapeHtml(fuelLabel(selectedFuel))}</small>
                <strong>${money(fuelPriceValue(station, selectedFuel))}</strong>
            </span>
            <span class="driving-status">${escapeHtml(status)} - ${formatTime(station.last_update)}</span>
        </button>
    `;
}

function drivingPriceVisualizationHtml(thresholds) {
    if (!state.stations.length) return '';
    const selectedFuel = els.fuel.value;
    const isCity = state.drivingContext === 'city';
    const maxDistance = Math.max(...state.stations.map((station) => Number(station.distance || 0)), 1);
    const cheapestPrice = Math.min(...state.stations
        .map((station) => Number(fuelPriceValue(station, selectedFuel)))
        .filter(isValidPriceValue));
    return `
        <section class="driving-price-visual" aria-label="Preissituation der naechsten Tankstellen">
            <div class="driving-price-visual-head">
                <strong>${escapeHtml(fuelLabel(selectedFuel))}</strong>
                <span>${state.stations.length} ${isCity ? 'Tankstellen im Umkreis' : 'Tankpunkte voraus'}</span>
            </div>
            <div class="driving-price-road">
                ${state.stations.map((station, index) => {
                    const price = Number(fuelPriceValue(station, selectedFuel));
                    const isCheapest = isValidPriceValue(price) && price === cheapestPrice;
                    const left = Math.max(4, Math.min(96, (Number(station.distance || 0) / maxDistance) * 92 + 4));
                    const cls = markerClass(station, thresholds);
                    return `
                        <button class="driving-price-stop ${cls}${isCheapest ? ' cheapest' : ''}" type="button" data-driving-station-id="${escapeHtml(station.tankerkoenig_id)}" style="left:${left}%">
                            <span>${index + 1}</span>
                            <strong>${money(price)}</strong>
                            <small>${Number(station.distance || 0).toFixed(0)} km</small>
                        </button>
                    `;
                }).join('')}
            </div>
            <div class="driving-price-legend">
                <span><i class="dot cheap"></i>guenstig</span>
                <span><i class="dot mid"></i>mittel</span>
                <span><i class="dot high"></i>teuer</span>
            </div>
        </section>
    `;
}

function renderDrivingModeList() {
    setCityMode(false);
    setDirectoryMode(false);
    els.appShell.classList.add('driving-mode');
    const directionLabel = state.drivingDirection === 'Muenchen' ? 'Richtung Sueden' : state.drivingDirection === 'Berlin' ? 'Richtung Norden' : 'wird ermittelt';
    const speed = Number.isFinite(state.drivingSpeedKmh) ? `${Math.round(state.drivingSpeedKmh)} km/h` : 'Tempo unbekannt';
    const accuracy = Number.isFinite(state.drivingAccuracy) ? `GPS ${Math.round(state.drivingAccuracy)} m` : 'GPS wird ermittelt';
    const routeDistance = Number.isFinite(state.drivingNearestRouteDistanceKm)
        ? `${state.drivingNearestRouteDistanceKm.toFixed(1).replace('.', ',')} km zur Route`
        : 'Autobahn-Naehe wird geprueft';
    const thresholds = thresholdsFor(state.stations);
    const contextLabel = state.drivingContext === 'city' ? 'Stadtmodus' : `Autobahn ${routeLabel()}`;
    const visibleStations = [...state.stations]
        .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
    els.resultCount.textContent = `Drive ${state.drivingContext === 'city' ? 'Stadt' : routeLabel()}`;
    els.resultMeta.textContent = `${accuracy} · ${speed} · ${directionLabel} · ${drivingModePriceStandText(state.stations)}`;

    els.results.innerHTML = `
        <section class="driving-dashboard">
            <div class="driving-header">
                <div class="driving-header-main">
                    <span>${escapeHtml(contextLabel)} - ${escapeHtml(state.drivingContext === 'city' ? 'nah bis fern' : directionLabel)}</span>
                    <small>${escapeHtml(speed)} - ${escapeHtml(accuracy)} - ${escapeHtml(routeDistance)}</small>
                </div>
                <strong>${escapeHtml(contextLabel)}</strong>
                <span>${escapeHtml(state.drivingContext === 'city' ? '5 naechste Tankstellen' : directionLabel)}</span>
                <small>${escapeHtml(speed)} · ${escapeHtml(accuracy)} · ${escapeHtml(routeDistance)}</small>
            </div>
            ${state.drivingStatus === 'ready' && !state.drivingMessage ? '' : drivingModeHintHtml()}
            <div class="driving-actions">
                <button class="text-button" type="button" data-driving-map>Karte anzeigen</button>
            </div>
            ${drivingTestPanelHtml()}
            ${drivingPriceVisualizationHtml(thresholds)}
            <div class="city-station-list">
                ${visibleStations.length
                    ? visibleStations.map((station, index) => drivingTankpointCardHtml(station, index + 1, thresholds)).join('')
                    : '<div class="empty-state">Keine passenden Tankpunkte in Fahrtrichtung gefunden.</div>'}
            </div>
        </section>
    `;

    els.results.querySelector('[data-driving-map]')?.addEventListener('click', () => {
        setView('map');
        updateDrivingModeMapMarkers();
    });
    els.results.querySelector('[data-driving-stop]')?.addEventListener('click', stopDrivingMode);
    els.results.querySelector('[data-driving-test-form]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        applyDrivingTestPosition(new FormData(event.currentTarget)).catch((error) => {
            state.drivingStatus = 'error';
            state.drivingMessage = error.message || 'Testposition konnte nicht angewendet werden.';
            renderDrivingModeList();
        });
    });
    els.results.querySelectorAll('[data-driving-preset-lat]').forEach((button) => {
        button.addEventListener('click', () => {
            const form = button.closest('[data-driving-test-form]');
            if (!form) return;
            form.elements.lat.value = button.dataset.drivingPresetLat;
            form.elements.lng.value = button.dataset.drivingPresetLng;
            form.elements.direction.value = button.dataset.drivingPresetDirection;
            applyDrivingTestPosition(new FormData(form)).catch((error) => {
                state.drivingStatus = 'error';
                state.drivingMessage = error.message || 'Testposition konnte nicht angewendet werden.';
                renderDrivingModeList();
            });
        });
    });
    els.results.querySelectorAll('[data-driving-station-id]').forEach((button) => {
        button.addEventListener('click', () => {
            state.selectedId = button.dataset.drivingStationId;
            renderDetail(state.stations.find((item) => item.tankerkoenig_id === state.selectedId));
        });
    });
}

function updateDrivingModeMapMarkers() {
    if (state.view !== 'map') return;
    renderMarkers();
    if (!state.stations.length && state.selectedLocation && state.map?.type !== 'fallback') {
        state.map.setView([state.selectedLocation.lat, state.selectedLocation.lng], 13, { animate: true });
    }
}

async function applyDrivingTestPosition(formData) {
    const parseCoordinate = (value) => Number(String(value || '').replace(',', '.'));
    const lat = parseCoordinate(formData.get('lat'));
    const lng = parseCoordinate(formData.get('lng'));
    const direction = String(formData.get('direction') || 'Muenchen');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Bitte gültige Koordinaten eingeben.');

    if (state.drivingWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(state.drivingWatchId);
        state.drivingWatchId = null;
    }

    state.listMode = 'driving';
    state.drivingActive = true;
    state.drivingDetectedRouteId = null;
    state.drivingRouteId = state.drivingRouteId || 'ALL';
    state.drivingStatus = 'test';
    state.drivingMessage = 'Testposition aktiv';
    await loadRouteTankpoints(state.drivingRouteId);

    const now = Date.now();
    const deltaLat = direction === 'Berlin' ? 0.006 : -0.006;
    state.drivingSamples = [
        {
            lat: lat - deltaLat,
            lng,
            accuracy: 25,
            speedKmh: 85,
            timestamp: now - 25000,
        },
        {
            lat,
            lng,
            accuracy: 25,
            speedKmh: 85,
            timestamp: now,
        },
    ];
    state.selectedLocation = { label: 'Testposition', lat, lng };
    await updateDrivingMode();
}

async function updateDrivingMode() {
    if (!state.drivingActive) return;
    setStatus('Fahrt');
    await loadRouteTankpoints(state.drivingRouteId);
    const position = state.drivingSamples[state.drivingSamples.length - 1];
    if (!position) {
        state.drivingStatus = 'waiting';
        state.drivingMessage = 'Standortfreigabe erforderlich';
        renderDrivingModeList();
        return;
    }

    state.selectedLocation = { label: 'Aktuelle Position', lat: position.lat, lng: position.lng };
    const route = detectCurrentRoute(position, state.drivingRouteId);
    const direction = detectDrivingDirection();
    state.drivingDirection = direction;
    if (route.onRoute && !direction) {
        state.drivingContext = 'highway';
        state.drivingStatus = 'direction-pending';
        state.drivingMessage = 'Fahrtrichtung wird ermittelt';
        state.stations = [];
    } else if (route.onRoute && direction) {
        state.drivingContext = 'highway';
        let stationsAhead = getNextTankpointsOnRoute({ position, direction, limit: 50 });
        if (stationsAhead.some((station) => !hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS))) {
            state.stations = [];
            state.drivingStatus = 'loading-prices';
            state.drivingMessage = 'Preise werden aktualisiert';
            renderDrivingModeList();
            stationsAhead = await loadLivePricesForDrivingStations(stationsAhead);
        }
        state.stations = stationsAhead
            .filter((station) => hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS))
            .slice(0, 10);
        state.drivingStatus = state.stations.length ? 'ready' : 'empty';
        state.drivingMessage = state.stations.length
            ? ''
            : 'Keine aktuellen Preise fuer passende Tankpunkte gefunden';
    } else {
        state.drivingContext = 'city';
        state.drivingDetectedRouteId = null;
        state.stations = await loadLiveCityDriveStations(position, 10);
        state.drivingStatus = state.stations.length ? 'ready' : 'empty';
        state.drivingMessage = state.stations.length
            ? (state.drivingCityLastMessage || '')
            : 'Keine Tankstellen mit Preisinformationen im Umkreis gefunden';
    }

    if (state.view === 'map') updateDrivingModeMapMarkers();
    renderDrivingModeList();
}

async function evaluateDrivingModeList() {
    if (!state.drivingActive || state.drivingUpdateInProgress) return;
    state.drivingUpdateInProgress = true;
    try {
        await updateDrivingMode();
    } catch (error) {
        state.drivingStatus = 'error';
        state.drivingMessage = error.message || 'Fahrmodus konnte nicht aktualisiert werden.';
        renderDrivingModeList();
        setStatus('Fehler');
    } finally {
        state.drivingUpdateInProgress = false;
    }
}

function handleDrivingPosition(position) {
    const coords = position.coords || {};
    const sample = {
        lat: Number(coords.latitude),
        lng: Number(coords.longitude),
        accuracy: Number(coords.accuracy || Number.POSITIVE_INFINITY),
        speedKmh: Number.isFinite(coords.speed) && coords.speed !== null ? Number(coords.speed) * 3.6 : null,
        timestamp: Number(position.timestamp || Date.now()),
    };
    if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)) return;
    state.drivingSamples.push(sample);
    state.drivingSamples = state.drivingSamples.slice(-6);
    if (state.drivingSamples.length === 1) evaluateDrivingModeList();
}

async function startDrivingMode(routeId = 'ALL') {
    state.listMode = 'driving';
    state.drivingRouteId = routeId;
    state.drivingDetectedRouteId = null;
    state.drivingActive = true;
    state.drivingSamples = [];
    state.drivingStatus = 'starting';
    state.drivingMessage = 'Fahrtrichtung wird ermittelt';
    state.selectedId = null;
    setView('list');
    renderDetail(null);
    renderDrivingModeList();

    if (!navigator.geolocation) {
        state.drivingStatus = 'blocked';
        state.drivingMessage = 'Standortfreigabe erforderlich';
        renderDrivingModeList();
        return;
    }

    try {
        await loadRouteTankpoints(routeId);
    } catch (error) {
        state.drivingStatus = 'error';
        state.drivingMessage = error.message || 'Autobahn-Tankpunkte konnten nicht geladen werden.';
        renderDrivingModeList();
        return;
    }

    if (state.drivingWatchId !== null) navigator.geolocation.clearWatch(state.drivingWatchId);
    state.drivingWatchId = navigator.geolocation.watchPosition(handleDrivingPosition, () => {
        state.drivingStatus = 'blocked';
        state.drivingMessage = 'Standortfreigabe erforderlich';
        renderDrivingModeList();
    }, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000,
    });
    if (state.drivingUpdateTimer !== null) window.clearInterval(state.drivingUpdateTimer);
    state.drivingUpdateTimer = window.setInterval(evaluateDrivingModeList, 15000);
}

function stopDrivingMode(restore = true) {
    if (state.drivingWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(state.drivingWatchId);
    }
    if (state.drivingUpdateTimer !== null) window.clearInterval(state.drivingUpdateTimer);
    state.drivingWatchId = null;
    state.drivingUpdateTimer = null;
    state.drivingUpdateInProgress = false;
    state.drivingActive = false;
    state.drivingSamples = [];
    state.drivingStatus = 'inactive';
    state.drivingDirection = null;
    state.drivingDetectedRouteId = null;
    state.drivingSpeedKmh = null;
    state.drivingAccuracy = null;
    state.drivingNearestRouteDistanceKm = null;
    els.appShell.classList.remove('driving-mode');
    clearDrivingRouteOverlay();
    state.stations = [];
    state.selectedLocation = null;
    state.listMode = 'results';
    renderDetail(null);
    if (restore) restoreStoredStartState();
    updateBottomNav();
}

function autobahnStationAddress(station) {
    return [station.postcode, station.city].filter(Boolean).join(' ');
}

function highwaySortValue(highway) {
    const value = String(highway || 'ZZZ');
    const number = Number(value.match(/\d+/)?.[0] || 9999);
    return `${String(number).padStart(4, '0')}-${value}`;
}

function autobahnHighways() {
    return [...new Set(state.autobahnStations
        .map((station) => station.highway)
        .filter(Boolean))]
        .sort((a, b) => highwaySortValue(a).localeCompare(highwaySortValue(b), 'de'));
}

function highwayGpsSortValue(station) {
    const highwayNumber = Number(String(station.highway || '').match(/\d+/)?.[0] || 0);
    const lat = Number(station.lat);
    const lng = Number(station.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Number.POSITIVE_INFINITY;

    const eastWestHighways = new Set([2, 4, 6, 8, 10, 12, 14, 20, 24, 26, 28, 30, 38, 40, 44, 46, 52, 60, 62, 64, 66, 70, 72, 96]);
    if (eastWestHighways.has(highwayNumber)) return lng;
    return -lat;
}

function sortAutobahnStationsByGps(a, b) {
    const gpsA = highwayGpsSortValue(a);
    const gpsB = highwayGpsSortValue(b);
    if (gpsA !== gpsB) return gpsA - gpsB;
    return String(a.name || '').localeCompare(String(b.name || ''), 'de');
}

function syncAutobahnVisibleStations() {
    const fuel = els.fuel.value;
    state.stations = state.autobahnStations
        .filter((station) => state.selectedHighway === 'all' || station.highway === state.selectedHighway)
        .map((station) => ({
            ...station,
            price: autobahnPriceValue(station, fuel),
            last_update: autobahnPriceStand(station) || station.importedAt,
        }));
}

function normalizeAutobahnStation(station) {
    return {
        autobahnMode: true,
        tankerkoenig_id: station.stationId,
        type: station.type || '',
        directorySource: station.directorySource || '',
        name: station.name || 'Autobahn-Tankstelle',
        brand: station.primaryFuelBrand || station.fuelBrands?.[0] || station.operator || 'Tankstelle',
        operator: station.operator || 'Tank & Rast',
        street: station.street || station.address || station.highway || '',
        house_number: station.houseNumber || '',
        postcode: station.postCode || '',
        city: station.place || station.city || '',
        lat: Number(station.lat),
        lng: Number(station.lng),
        distance: 0,
        is_open: true,
        price: null,
        last_update: station.importedAt,
        importedAt: station.importedAt,
        highway: station.highway || '',
        sideLabel: station.sideLabel || '',
        directionText: station.directionText || '',
        features: Array.isArray(station.features) ? station.features : [],
        prices: station.prices || null,
        priceMatch: station.priceMatch || null,
        tankerkoenigId: station.tankerkoenigId || '',
    };
}

async function refreshSelectedAutobahnPrices(target = 'list') {
    if (state.selectedHighway === 'all') return;
    const loadKey = `prices:${state.selectedHighway}:${target}`;
    if (state.autobahnLoadKey === loadKey) return;
    state.autobahnLoadKey = loadKey;
    setStatus('Preise');
    try {
        const params = new URLSearchParams({
            hasFuel: '1',
            prices: '1',
            refresh: '1',
            highway: state.selectedHighway,
        });
        const data = await fetchJson(`/api/autobahn/stations.php?${params.toString()}`);
        let updated = (data.stations || []).map(normalizeAutobahnStation)
            .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng));
        const byId = new Map(state.autobahnStations.map((station) => [station.tankerkoenig_id, station]));
        updated.forEach((station) => byId.set(station.tankerkoenig_id, station));
        state.autobahnStations = [...byId.values()];
        syncAutobahnVisibleStations();
        const staleStations = state.stations.filter((station) => !hasRecentAutobahnPrice(station, USAGE_PRICE_MAX_AGE_MS));
        if (staleStations.length) {
            const liveUpdated = await refreshAutobahnLivePricesForStations(staleStations);
            const liveById = new Map(state.autobahnStations.map((station) => [station.tankerkoenig_id, station]));
            liveUpdated.forEach((station) => liveById.set(station.tankerkoenig_id, station));
            state.autobahnStations = [...liveById.values()];
            syncAutobahnVisibleStations();
        }
        setStatus('Aktuell');
        if (target === 'map') openAutobahnMap();
        else renderAutobahnList();
    } finally {
        if (state.autobahnLoadKey === loadKey) state.autobahnLoadKey = null;
    }
}

function mergeAutobahnLivePrice(station, liveStation) {
    if (!liveStation) return station;
    return {
        ...station,
        is_open: liveStation.is_open ?? station.is_open,
        prices: liveStation.prices || station.prices,
        price: fuelPriceValue(liveStation, els.fuel.value),
        last_update: liveStation.last_update || station.last_update,
        priceSource: 'live',
    };
}

async function refreshAutobahnLivePricesForStations(stations) {
    const refreshed = await Promise.all(stations.map(async (station) => {
        const lat = Number(station.lat);
        const lng = Number(station.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return station;
        const params = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            radius: '3',
            fuel: els.fuel.value,
            limit: '10',
            open: '1',
            priced: '1',
            live: '1',
            sort: 'distance',
            q: 'Autobahn Preise',
        });
        try {
            const data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 15000, progress: false });
            return mergeAutobahnLivePrice(station, bestLiveMatchForDrivingStation(station, data.stations || []));
        } catch (error) {
            return station;
        }
    }));
    return refreshed;
}

async function refreshAutobahnStationPrices(id) {
    if (!id || state.autobahnPriceLoadingId === id) return;
    state.autobahnPriceLoadingId = id;
    setStatus('Preise');

    const current = state.stations.find((station) => station.tankerkoenig_id === id);
    if (current && state.selectedId === id) renderDetail(current);

    try {
        const params = new URLSearchParams({
            stationId: id,
            prices: '1',
            refresh: '1',
        });
        const data = await fetchJson(`/api/autobahn/stations.php?${params.toString()}`);
        let updated = (data.stations || []).map(normalizeAutobahnStation)
            .find((station) => station.tankerkoenig_id === id);
        if (updated && !hasRecentAutobahnPrice(updated, USAGE_PRICE_MAX_AGE_MS)) {
            [updated] = await refreshAutobahnLivePricesForStations([updated]);
        }
        if (!updated) throw new Error('Keine Preisdaten für diese Raststätte gefunden.');

        const byId = new Map(state.autobahnStations.map((station) => [station.tankerkoenig_id, station]));
        byId.set(id, updated);
        state.autobahnStations = [...byId.values()];
        syncAutobahnVisibleStations();

        if (state.listMode === 'autobahn') renderResults();
        renderMarkers();
        if (state.selectedId === id) {
            renderDetail(state.stations.find((station) => station.tankerkoenig_id === id) || updated);
        }
        setStatus('Aktuell');
    } finally {
        state.autobahnPriceLoadingId = null;
    }
}

function autobahnGroups() {
    const groups = new Map();
    state.stations
        .filter((station) => station.autobahnMode)
        .forEach((station) => {
            const highway = station.highway || 'Ohne Autobahn';
            if (!groups.has(highway)) groups.set(highway, []);
            groups.get(highway).push(station);
        });

    return [...groups.entries()]
        .sort(([a], [b]) => highwaySortValue(a).localeCompare(highwaySortValue(b), 'de'))
        .map(([highway, stations]) => [
            highway,
            stations.sort(sortAutobahnStationsByGps),
        ]);
}

function selectAutobahnHighway(highway, target = 'list') {
    const nextHighway = String(highway || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^A\d+$/.test(nextHighway)) return;
    state.selectedHighway = nextHighway;
    syncAutobahnVisibleStations();
    renderAutobahnList();
    refreshSelectedAutobahnPrices(target).catch((error) => {
        els.resultMeta.textContent = error.message;
        setStatus('Fehler');
    });
}

function autobahnRowHtml(station, priceThresholds = thresholdsFor(state.stations)) {
    const side = station.sideLabel || 'Richtung unbekannt';
    const features = station.features?.length ? station.features.slice(0, 3).join(', ') : 'Services nicht angegeben';
    const highwayLabel = station.highway || 'A';
    const rankClass = `${markerClass(station, priceThresholds)} ${autobahnKindClass(station)}`;
    const stationAddress = address(station) || station.operator || 'Tank & Rast';
    return `
        <button class="autobahn-row" type="button" data-autobahn-station-id="${escapeHtml(station.tankerkoenig_id)}">
            <span class="rank ${escapeHtml(rankClass)}">${escapeHtml(highwayLabel)}</span>
            ${brandLogoHtml(station)}
            <span class="autobahn-main">
                <strong>${escapeHtml(station.name || 'Autobahn-Tankstelle')}</strong>
                <small>${escapeHtml(station.brand || 'Tankstelle')} · ${escapeHtml(stationAddress)}</small>
                ${tankRastBadgeHtml(station)}
            </span>
            <span class="autobahn-meta">${escapeHtml(side)}</span>
            <span class="autobahn-services">${escapeHtml(features)}</span>
        </button>
    `;
}

function autobahnRowHtmlDetailed(station, priceThresholds = thresholdsFor(state.stations)) {
    const side = station.sideLabel || 'Richtung unbekannt';
    const features = station.features?.length ? station.features.slice(0, 3).join(', ') : 'Services nicht angegeben';
    const priceStand = autobahnPriceStand(station);
    const highwayLabel = station.highway || 'A';
    const rankClass = `${markerClass(station, priceThresholds)} ${autobahnKindClass(station)}`;
    const stationAddress = address(station) || station.operator || 'Tank & Rast';
    return `
        <button class="autobahn-row" type="button" data-autobahn-station-id="${escapeHtml(station.tankerkoenig_id)}">
            <span class="rank ${escapeHtml(rankClass)}">${escapeHtml(highwayLabel)}</span>
            ${brandLogoHtml(station)}
            <span class="autobahn-main">
                <strong>${escapeHtml(station.name || 'Autobahn-Tankstelle')}</strong>
                <small>${escapeHtml(station.brand || 'Tankstelle')} - ${escapeHtml(stationAddress)}</small>
                ${tankRastBadgeHtml(station)}
                <small>${escapeHtml(autobahnPriceSummary(station))}</small>
            </span>
            ${selectedFuelPriceHtml(station, 'autobahn-meta')}
            <span class="autobahn-services">${escapeHtml(side)} - ${escapeHtml(priceStand ? `Stand ${formatDateTime(priceStand)}` : features)}</span>
        </button>
    `;
}

function renderAutobahnList() {
    setCityMode(false);
    setDirectoryMode(true);
    syncAutobahnVisibleStations();
    const highways = autobahnHighways();
    const selectedLabel = state.selectedHighway === 'all' ? 'alle Autobahnen' : state.selectedHighway;
    const dataStandText = autobahnDataStandText(state.stations);
    els.resultCount.textContent = 'Autobahn-Standorte';
    els.resultMeta.textContent = `${state.stations.length} Standorte - ${dataStandText}`;

    if (!state.autobahnStations.length) {
        els.results.innerHTML = '<div class="empty-state">Autobahn-Tankstellen werden geladen.</div>';
        return;
    }

    const groups = autobahnGroups();
    const priceThresholds = thresholdsFor(state.stations);
    els.results.innerHTML = `
        <section class="autobahn-dashboard">
            <div class="autobahn-compact-toolbar">
                <label class="autobahn-filter">
                    <select data-autobahn-filter>
                        <option value="all"${state.selectedHighway === 'all' ? ' selected' : ''}>Alle Autobahnen</option>
                        ${highways.map((highway) => `<option value="${escapeHtml(highway)}"${state.selectedHighway === highway ? ' selected' : ''}>${escapeHtml(highway)}</option>`).join('')}
                    </select>
                </label>
                <button type="button" class="autobahn-tab-button active" data-autobahn-view="list">Liste</button>
                <button type="button" class="autobahn-tab-button" data-autobahn-view="map">Karte</button>
            </div>
            <div class="autobahn-summary">
                <span>${escapeHtml(selectedLabel)}</span>
                <strong>${state.stations.length} Standorte</strong>
                <small>${escapeHtml(dataStandText)}</small>
            </div>
            <div class="autobahn-list">
                ${groups.map(([highway, stations]) => `
                    <section class="autobahn-group">
                        <h2><button type="button" class="autobahn-group-select" data-autobahn-select="${escapeHtml(highway)}">${escapeHtml(highway)} <span>${stations.length}</span></button></h2>
                        <div class="city-station-list">
                            ${stations.map((station) => autobahnRowHtmlDetailed(station, priceThresholds)).join('')}
                        </div>
                    </section>
                `).join('')}
            </div>
        </section>
    `;

    els.results.querySelector('[data-autobahn-filter]')?.addEventListener('change', (event) => {
        state.selectedHighway = event.target.value;
        renderAutobahnList();
        if (state.selectedHighway !== 'all') {
            refreshSelectedAutobahnPrices(state.view === 'map' ? 'map' : 'list').catch((error) => {
                els.resultMeta.textContent = error.message;
                setStatus('Fehler');
            });
            return;
        }
        if (state.view === 'map') openAutobahnMap();
    });
    els.results.querySelectorAll('[data-autobahn-select]').forEach((button) => {
        button.addEventListener('click', () => {
            selectAutobahnHighway(button.dataset.autobahnSelect, 'list');
        });
    });
    els.results.querySelectorAll('[data-autobahn-view]').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.autobahnView === 'map') openAutobahnMap();
        });
    });
    els.results.querySelectorAll('[data-autobahn-station-id]').forEach((button) => {
        button.addEventListener('click', () => {
            selectStation(button.dataset.autobahnStationId, true);
        });
    });
}

async function loadAutobahnStations(target = 'list', requestId = state.navRequestId) {
    if (!isCurrentNavigation(requestId, 'autobahn')) return;
    const loadKey = `initial:${target}`;
    if (state.autobahnLoadKey === loadKey) return;
    state.autobahnLoadKey = loadKey;
    state.listMode = 'autobahn';
    state.cityMapMode = 'overview';
    setCityMode(false);
    setDirectoryMode(true);
    setStatus('Autobahn');
    els.resultCount.textContent = 'Autobahn-Standorte';
    els.resultMeta.textContent = 'Standorte und Preise werden geladen ...';
    els.results.innerHTML = '<div class="empty-state">Autobahn-Tankstellen, Autohöfe und Truck Stops werden geladen.</div>';

    try {
        const data = await fetchJson('/api/autobahn/stations.php?hasFuel=1&prices=1');
        if (!isCurrentNavigation(requestId, 'autobahn')) return;
        state.autobahnStations = (data.stations || []).map(normalizeAutobahnStation)
            .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng));
        syncAutobahnVisibleStations();

        setStatus('Aktuell');
        if (target === 'map') openAutobahnMap();
        else renderAutobahnList();
    } catch (error) {
        if (!isCurrentNavigation(requestId, 'autobahn')) return;
        setStatus('Fehler');
        els.resultMeta.textContent = error.message;
        els.results.innerHTML = '<div class="empty-state">Autobahn-Tankstellen konnten nicht geladen werden.</div>';
    } finally {
        if (state.autobahnLoadKey === loadKey) state.autobahnLoadKey = null;
    }
}

function openAutobahnMap() {
    state.listMode = 'autobahn';
    setDirectoryMode(true);
    syncAutobahnVisibleStations();
    setView('map');
    renderMarkers();
    els.resultCount.textContent = 'Karte';
    els.resultMeta.textContent = `${state.stations.length} Standorte - ${autobahnDataStandText(state.stations)}`;
}

function isSavedStationLabel(label) {
    const value = String(label || '').trim().toLowerCase();
    if (!value) return false;
    if (value === 'favorit') return true;

    return state.favorites.some((favorite) => {
        const favoriteName = String(favorite.name || '').trim().toLowerCase();
        const favoriteBrand = String(favorite.brand || '').trim().toLowerCase();
        return value === favoriteName || value === favoriteBrand;
    });
}

function saveLastLocation(location) {
    if (!location) return;
    if (isSavedStationLabel(location.label)) return;

    localStorage.setItem('tankprofi_last_location', JSON.stringify({
        label: location.label,
        lat: Number(location.lat),
        lng: Number(location.lng),
    }));
}

function loadLastLocation() {
    try {
        const location = JSON.parse(localStorage.getItem('tankprofi_last_location') || 'null');
        if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
            return null;
        }

        if (isSavedStationLabel(location.label)) {
            localStorage.removeItem('tankprofi_last_location');
            return null;
        }

        return {
            label: location.label || 'Letzte Adresse',
            lat: Number(location.lat),
            lng: Number(location.lng),
        };
    } catch {
        return null;
    }
}

function saveUserSettings() {
    const settings = {
        radius: els.radius.value,
        fuel: els.fuel.value,
        limit: els.limit.value,
        brand: els.brand.value,
        openOnly: els.openOnly.checked,
        pricedOnly: els.pricedOnly.checked,
    };
    localStorage.setItem('tankprofi_user_settings', JSON.stringify(settings));
}

function restoreUserSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('tankprofi_user_settings') || 'null');
        if (!settings) return;
        if (settings.radius && [...els.radius.options].some((option) => option.value === String(settings.radius))) {
            els.radius.value = String(settings.radius);
        }
        if (settings.fuel && [...els.fuel.options].some((option) => option.value === String(settings.fuel))) {
            els.fuel.value = String(settings.fuel);
        }
        if (settings.limit && [...els.limit.options].some((option) => option.value === String(settings.limit))) {
            els.limit.value = String(settings.limit);
        }
        if (settings.brand && [...els.brand.options].some((option) => option.value === String(settings.brand))) {
            els.brand.value = String(settings.brand);
        }
        if (typeof settings.openOnly === 'boolean') els.openOnly.checked = settings.openOnly;
        if (typeof settings.pricedOnly === 'boolean') els.pricedOnly.checked = settings.pricedOnly;
    } catch {
        localStorage.removeItem('tankprofi_user_settings');
    }
}

function loadFavorites() {
    try {
        state.favorites = JSON.parse(localStorage.getItem('tankprofi_favorites') || '[]');
    } catch {
        state.favorites = [];
    }
}

function saveFavorites() {
    localStorage.setItem('tankprofi_favorites', JSON.stringify(state.favorites));
    if (state.listMode === 'favorites') renderResults();
}

function isFavorite(id) {
    return state.favorites.some((favorite) => favorite.tankerkoenig_id === id);
}

function favoriteFromStation(station) {
    return {
        tankerkoenig_id: station.tankerkoenig_id,
        name: station.name,
        brand: station.brand,
        street: station.street,
        house_number: station.house_number,
        postcode: station.postcode,
        city: station.city,
        lat: station.lat,
        lng: station.lng,
        distance: station.distance,
        is_open: station.is_open,
        price: station.price,
        last_update: station.last_update,
    };
}

function stationForFavorite(favorite) {
    const current = state.stations.find((station) => station.tankerkoenig_id === favorite.tankerkoenig_id);
    return current || {
        ...favorite,
        distance: favorite.distance ?? null,
        is_open: favorite.is_open ?? null,
        price: favorite.price ?? null,
        last_update: favorite.last_update ?? null,
    };
}

async function refreshFavoritesOnOpen() {
    if (!state.favorites.length) return;

    const refreshId = state.favoriteRefreshId + 1;
    state.favoriteRefreshId = refreshId;
    els.resultMeta.textContent = 'Favoriten werden aktualisiert ...';

    let updated = 0;
    const refreshedFavorites = [...state.favorites];

    for (let index = 0; index < refreshedFavorites.length; index += 1) {
        if (state.favoriteRefreshId !== refreshId || state.listMode !== 'favorites') return;

        const favorite = refreshedFavorites[index];
        if (!favorite?.tankerkoenig_id || !Number.isFinite(Number(favorite.lat)) || !Number.isFinite(Number(favorite.lng))) {
            continue;
        }

        const params = new URLSearchParams({
            lat: favorite.lat,
            lng: favorite.lng,
            radius: '1',
            fuel: els.fuel.value,
            limit: '20',
            open: '0',
            priced: '0',
            q: favorite.name || favorite.brand || 'Favorit',
        });

        try {
            const data = await fetchJson(`/api/search.php?${params.toString()}`);
            const freshStation = (data.stations || []).find((station) => station.tankerkoenig_id === favorite.tankerkoenig_id);
            if (!freshStation) continue;

            refreshedFavorites[index] = {
                ...favorite,
                ...favoriteFromStation(freshStation),
            };
            updated += 1;
        } catch {
            // Favoriten sollen sichtbar bleiben, auch wenn eine Live-Abfrage scheitert.
        }
    }

    if (state.favoriteRefreshId !== refreshId || state.listMode !== 'favorites') return;

    state.favorites = refreshedFavorites;
    localStorage.setItem('tankprofi_favorites', JSON.stringify(state.favorites));
    renderResults();
    els.resultMeta.textContent = updated
        ? `${updated} Favoriten aktualisiert`
        : 'Gespeicherte Tankstellen';
}

function toggleFavorite(station) {
    if (!station) return;

    if (isFavorite(station.tankerkoenig_id)) {
        state.favorites = state.favorites.filter((favorite) => favorite.tankerkoenig_id !== station.tankerkoenig_id);
    } else {
        state.favorites.unshift(favoriteFromStation(station));
    }

    saveFavorites();
    renderDetail(station);
}

function renderFavorites() {
    if (!state.favorites.length || !els.results) {
        return;
    }

    state.favorites.forEach((favorite) => {
        const row = document.createElement('div');
        row.className = 'favorite-item';
        row.classList.toggle('selected', favorite.tankerkoenig_id === state.selectedId);
        row.innerHTML = `
            <div class="rank">★</div>
            <button class="favorite-open" type="button">
                <strong>${escapeHtml(favorite.name || 'Tankstelle')}</strong>
                <span>${escapeHtml(compactAddress(favorite) || favorite.brand || 'Favorit')}</span>
            </button>
            ${brandLogoHtml(favorite)}
            <button class="favorite-remove" type="button" aria-label="Favorit entfernen">x</button>
        `;

        row.querySelector('.favorite-open').addEventListener('click', () => {
            const current = state.stations.find((station) => station.tankerkoenig_id === favorite.tankerkoenig_id);
            state.selectedLocation = {
                label: favorite.name || favorite.brand || 'Favorit',
                lat: favorite.lat,
                lng: favorite.lng,
            };
            els.searchInput.value = state.selectedLocation.label;
            saveLastLocation(state.selectedLocation);
            state.selectedId = favorite.tankerkoenig_id;
            renderFavorites();
            renderDetail(current || favorite);
            setView('list');
            state.listMode = 'results';
            updateFavoritesButton();
            loadStations();
        });

        row.querySelector('.favorite-remove').addEventListener('click', () => {
            state.favorites = state.favorites.filter((item) => item.tankerkoenig_id !== favorite.tankerkoenig_id);
            saveFavorites();
            const station = state.stations.find((item) => item.tankerkoenig_id === state.selectedId);
            if (station) renderDetail(station);
        });

        els.results.appendChild(row);
    });
}

function renderFavoriteRows() {
    if (!state.favorites.length || !els.results) {
        return;
    }

    const favoriteStations = state.favorites.map(stationForFavorite);
    const favoriteThresholds = thresholdsFor(favoriteStations);

    state.favorites.forEach((favorite) => {
        const station = stationForFavorite(favorite);
        const row = document.createElement('div');
        row.className = 'favorite-item';
        row.classList.toggle('selected', favorite.tankerkoenig_id === state.selectedId);
        row.innerHTML = `
            <div class="rank">*</div>
            <button class="favorite-open" type="button">
                <strong>${escapeHtml(station.name || 'Tankstelle')}</strong>
                <span>${escapeHtml(compactAddress(station) || station.brand || 'Favorit')}</span>
            </button>
            ${brandLogoHtml(station)}
            <div class="favorite-price ${priceClassFor(station, favoriteThresholds)}">${money(station.price)}</div>
            <button class="favorite-remove" type="button" aria-label="Favorit entfernen">x</button>
        `;

        row.querySelector('.favorite-open').addEventListener('click', () => {
            state.selectedId = favorite.tankerkoenig_id;
            setView('list');
            state.listMode = 'favorites';
            renderResults();
            renderDetail(stationForFavorite(favorite));
            updateFavoritesButton();
        });

        row.querySelector('.favorite-remove').addEventListener('click', (event) => {
            event.stopPropagation();
            state.favorites = state.favorites.filter((item) => item.tankerkoenig_id !== favorite.tankerkoenig_id);
            saveFavorites();
            if (state.selectedId === favorite.tankerkoenig_id) renderDetail(null);
        });

        els.results.appendChild(row);
    });
}

function updateFavoritesButton() {
    const active = state.listMode === 'favorites';
    updateBottomNav();
}

function updateBottomNav() {
    setCityMode(state.listMode === 'cities');
    setDirectoryMode(state.listMode === 'autobahn');
    els.appShell.classList.toggle('driving-mode', state.listMode === 'driving');
    els.driveMode?.classList.toggle('active', state.listMode === 'driving');
    if (els.driveMode) {
        const label = state.drivingActive ? 'No Drive' : 'Drive';
        els.driveMode.replaceChildren();
        const badge = document.createElement('span');
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = 'A';
        els.driveMode.append(badge, document.createTextNode(label));
        els.driveMode.setAttribute('aria-pressed', state.drivingActive ? 'true' : 'false');
    }
    els.bottomNavButtons.forEach((button) => {
        const action = button.dataset.action;
        const active = (action === 'map' && state.view === 'map')
            || (action === 'favorites' && state.view === 'list' && state.listMode === 'favorites')
            || (action === 'cities' && state.listMode === 'cities')
            || (action === 'autobahn' && state.listMode === 'autobahn')
            || (action === 'settings' && els.settingsSheet?.classList.contains('open'))
            || (action === 'list' && state.view === 'list' && state.listMode === 'results' && !els.detail.classList.contains('visible'));
        button.classList.toggle('active', active);
    });
}

function setSettingsOpen(open) {
    els.settingsSheet.classList.toggle('open', open);
    els.settingsBackdrop.classList.toggle('visible', open);
    updateBottomNav();
    if (open) loadTankprofiStats();
}

function setHelpOpen(open) {
    els.helpSheet?.classList.toggle('open', open);
    els.settingsBackdrop?.classList.toggle('visible', open || els.settingsSheet?.classList.contains('open'));
}

function setShareOpen(open) {
    if (!els.shareContent || !els.shareToggle) return;
    els.shareContent.hidden = !open;
    els.shareToggle.setAttribute('aria-expanded', String(open));
}

async function loadTankprofiStats() {
    if (!els.tankprofiAddressCount) return;

    els.tankprofiStatsStatus.textContent = 'Datenbestand wird geladen ...';
    try {
        const data = await fetchJson('/api/admin/stats.php');
        const format = (value) => new Intl.NumberFormat('de-DE').format(Number(value || 0));
        els.tankprofiAddressCount.textContent = format(data.addresses);
        if (els.tankprofiStationCount) els.tankprofiStationCount.textContent = format(data.stations);
        if (els.tankprofiAutohofCount) els.tankprofiAutohofCount.textContent = format(data.autohoefe);
        if (els.tankprofiRastCount) els.tankprofiRastCount.textContent = format(data.raststaetten);
        if (els.tankprofiChargingCount) els.tankprofiChargingCount.textContent = format(data.ladeparks);
        if (els.tankprofiTruckCount) els.tankprofiTruckCount.textContent = format(data.truckStops);
        els.tankprofiStatsStatus.textContent = Number.isFinite(Date.parse(data.updatedAt))
            ? `Stand ${new Date(data.updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
            : 'Aktualisiert';
    } catch (error) {
        els.tankprofiStatsStatus.textContent = error.message || 'Datenbestand konnte nicht geladen werden.';
    }
}

async function copyShareLink() {
    const link = els.shareLink?.value || 'https://tankprofi.web.app';
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(link);
        } else if (els.shareLink) {
            els.shareLink.select();
            document.execCommand('copy');
        }

        if (els.shareCopy) {
            els.shareCopy.textContent = 'Kopiert';
            setTimeout(() => {
                els.shareCopy.textContent = 'Link kopieren';
            }, 1400);
        }
    } catch {
        els.shareLink?.select();
    }
}

async function runCityUpdate(force = false) {
    if (!els.cityUpdateStatus) return;
    els.cityUpdateStatus.textContent = 'Aktualisierung läuft ...';
    setStatus('Update');
    try {
        const data = await fetchJson(`/api/admin/city-prices/update.php${force ? '?force=1' : ''}`, { method: 'POST' });
        els.cityUpdateStatus.textContent = data.queued
            ? `Aktualisierung gestartet: ${data.requestId}`
            : data.started === false
            ? data.reason
            : `Snapshot ${data.status}: ${data.snapshotId}`;
        await loadCitySnapshot();
    } catch (error) {
        els.cityUpdateStatus.textContent = error.message;
        setStatus('Fehler');
    }
}

async function chooseFirstSuggestion() {
    const query = els.searchInput.value.trim();
    if (!query) return;
    setStatus('Sucht');
    try {
        const items = await geocode(query);
        if (items[0]) {
            state.selectedLocation = items[0];
            els.searchInput.value = items[0].label;
            saveLastLocation(items[0]);
            return;
        }
        els.resultCount.textContent = 'Keine Adresse';
        els.resultMeta.textContent = 'Zur Eingabe wurde kein Standort gefunden.';
        els.results.innerHTML = '<div class="empty-state">Bitte Adresse, Ort oder PLZ pruefen.</div>';
        hideSplashScreen();
    } catch (error) {
        setStatus('Fehler');
        els.resultCount.textContent = 'Keine Adresse';
        els.resultMeta.textContent = error.message || 'Standort konnte nicht gefunden werden.';
        els.results.innerHTML = '<div class="empty-state">Adresse konnte nicht aufgeloest werden.</div>';
        hideSplashScreen();
    }
}

function renderSuggestions(items) {
    els.suggestions.innerHTML = '';
    items.forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggestion-item';
        button.textContent = item.label;
        button.addEventListener('click', () => {
            state.selectedLocation = item;
            els.searchInput.value = item.label;
            saveLastLocation(item);
            els.suggestions.innerHTML = '';
            prepareNormalSearch(false);
            loadStations();
        });
        els.suggestions.appendChild(button);
    });
}

const updateSuggestions = debounce(async () => {
    const query = els.searchInput.value.trim();
    state.selectedLocation = null;
    if (query.length < 3) {
        els.suggestions.innerHTML = '';
        return;
    }

    try {
        const items = await geocode(query);
        renderSuggestions(items);
    } catch {
        els.suggestions.innerHTML = '';
    }
}, 400);

function clearDeliveredSearchText() {
    const currentValue = els.searchInput.value.trim();
    const deliveredLabel = String(state.selectedLocation?.label || '').trim();
    if (!currentValue || !deliveredLabel || currentValue !== deliveredLabel) return;
    state.selectedLocation = null;
    els.searchInput.value = '';
    els.suggestions.innerHTML = '';
}

function currentPosition(options = {}) {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: options.enableHighAccuracy !== false,
            timeout: Number(options.timeoutMs || 9000),
            maximumAge: Number(options.maximumAgeMs ?? 60000),
        });
    });
}

async function useCurrentLocation(options = {}) {
    if (!navigator.geolocation) {
        if (typeof options.onFail === 'function') {
            options.onFail();
            return;
        }
        els.resultMeta.textContent = 'Standortfreigabe wird nicht unterstützt.';
        return;
    }

    if (options.startup) state.startupLocationPending = true;
    setStatus('Ortung');
    if (options.startup && !options.hasImmediateFallback) {
        els.resultMeta.textContent = 'Standort wird waehrend des Ladens ermittelt ...';
    } else if (!options.startup) {
        els.resultMeta.textContent = 'Aktueller Standort wird ermittelt ...';
    }

    try {
        const position = await currentPosition({
            timeoutMs: options.startup ? Number(options.timeoutMs || 3200) : Number(options.timeoutMs || 12000),
            maximumAgeMs: options.startup ? 300000 : 0,
            enableHighAccuracy: !options.startup,
        });
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let label = 'Aktueller Standort';

        try {
            label = await reverseGeocode(lat, lng);
        } catch {
            label = 'Aktueller Standort';
        }

        state.selectedLocation = {
            label,
            lat,
            lng,
        };
        saveLastLocation(state.selectedLocation);
        els.searchInput.value = label;
        els.suggestions.innerHTML = '';
        state.listMode = 'results';
        state.cityMapMode = 'overview';
        state.selectedCityId = null;
        state.selectedHighway = 'all';
        renderDetail(null);
        await loadStations();
    } catch {
        setStatus('Bereit');
        els.resultMeta.textContent = 'Standort konnte nicht ermittelt werden.';
        if (typeof options.onFail === 'function') options.onFail();
    } finally {
        if (options.startup) state.startupLocationPending = false;
    }
}

function autoLocateOnStart() {
    if (!navigator.geolocation) return;
    if (sessionStorage.getItem('tankprofi_auto_location_done') === '1') return;

    sessionStorage.setItem('tankprofi_auto_location_done', '1');
    useCurrentLocation();
}

function restoreStoredStartState(lastLocation = loadLastLocation()) {
    if (lastLocation) {
        state.selectedLocation = lastLocation;
        els.searchInput.value = lastLocation.label;
        els.resultMeta.textContent = 'Letzte Adresse wird geladen ...';
        loadStations();
        return;
    }

    if (state.favorites.length) {
        els.resultMeta.textContent = 'Favoriten bereit. Adresse suchen oder Standort verwenden.';
        hideSplashScreen();
        return;
    }

    loadStartupFallbackList();
}

function loadStartupFallbackList() {
    if (state.startupLocationPending) return;
    if (state.listMode !== 'results' || els.detail.classList.contains('visible')) return;
    if (state.stations.length && state.stations.every((station) => !station.cityMode && !station.autobahnMode)) return;
    if (state.selectedLocation) return;

    state.selectedLocation = { ...startupFallbackLocation };
    els.searchInput.value = state.selectedLocation.label;
    els.resultMeta.textContent = 'Startliste wird geladen ...';
    loadStations();
}

function restoreStartState() {
    const lastLocation = loadLastLocation();
    if (lastLocation) {
        state.selectedLocation = lastLocation;
        els.searchInput.value = lastLocation.label;
        els.resultMeta.textContent = 'Letzter Standort wird geladen ...';
        loadStations();
    } else {
        els.resultMeta.textContent = 'Standort wird waehrend des Ladens ermittelt ...';
    }

    useCurrentLocation({
        startup: true,
        hasImmediateFallback: Boolean(lastLocation),
        timeoutMs: lastLocation ? 6500 : 8500,
        onFail: () => {
            if (!lastLocation) restoreStoredStartState(lastLocation);
        },
    });

    window.setTimeout(loadStartupFallbackList, lastLocation ? 7600 : 9500);
}

function bindEvents() {
    els.searchInput.addEventListener('focus', clearDeliveredSearchText);
    els.searchInput.addEventListener('pointerdown', clearDeliveredSearchText);
    els.searchInput.addEventListener('input', updateSuggestions);
    els.searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') runManualSearch();
    });
    els.searchButton.addEventListener('click', runManualSearch);
    els.locationButton.addEventListener('click', () => runCurrentLocationSearch({ timeoutMs: 12000 }));
    els.refresh.addEventListener('click', () => {
        prepareNormalSearch(false);
        loadStations();
    });
    els.detail.addEventListener('click', (event) => {
        if (event.target === els.detail) renderDetail(null);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && els.detail.classList.contains('visible')) {
            renderDetail(null);
        }
        if (event.key === 'Escape' && els.settingsSheet.classList.contains('open')) {
            setSettingsOpen(false);
        }
        if (event.key === 'Escape' && els.helpSheet?.classList.contains('open')) {
            setHelpOpen(false);
        }
    });
    els.viewButtons.forEach((button) => {
        button.addEventListener('click', () => setView(button.dataset.view));
    });
    els.bottomNavButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const navRequestId = beginNavigation();
            renderDetail(null);
            if (action === 'map') {
                if (state.listMode === 'cities') {
                    openCityOverviewMap();
                    return;
                }
                if (state.listMode === 'autobahn') {
                    openAutobahnMap();
                    return;
                }
                if (state.listMode === 'driving') {
                    setView('map');
                    updateDrivingModeMapMarkers();
                    return;
                }
                setView('map');
                return;
            }

            if (action === 'settings') {
                setSettingsOpen(!els.settingsSheet.classList.contains('open'));
                return;
            }

            if (action === 'cities') {
                if (state.drivingActive) stopDrivingMode(false);
                state.listMode = 'cities';
                state.cityMapMode = 'overview';
                renderDetail(null);
                setView('list');
                updateBottomNav();
                loadCitySnapshot(navRequestId);
                return;
            }

            if (action === 'autobahn') {
                if (state.drivingActive) stopDrivingMode(false);
                state.listMode = 'autobahn';
                state.cityMapMode = 'overview';
                renderDetail(null);
                setView('list');
                updateBottomNav();
                if (state.autobahnStations.length) {
                    renderAutobahnList();
                    return;
                }
                loadAutobahnStations('list', navRequestId);
                return;
            }

            if (action === 'list') {
                if (state.drivingActive) stopDrivingMode(false);
                state.listMode = 'results';
                state.cityMapMode = 'overview';
                state.selectedCityId = null;
                state.selectedHighway = 'all';
                renderDetail(null);
                setView('list');
                updateBottomNav();
                if (state.selectedLocation) {
                    loadStations();
                } else {
                    state.stations = [];
                    restoreStoredStartState();
                }
                return;
            }

            const showFavorites = action === 'favorites';
            if (state.drivingActive) stopDrivingMode(false);
            state.listMode = showFavorites ? 'favorites' : 'results';
            updateFavoritesButton();
            renderResults();
            setView('list');
            if (showFavorites) refreshFavoritesOnOpen();
        });
    });
    els.settingsBackdrop.addEventListener('click', () => {
        setSettingsOpen(false);
        setHelpOpen(false);
    });
    els.settingsClose.addEventListener('click', () => setSettingsOpen(false));
    els.help?.addEventListener('click', () => {
        setSettingsOpen(false);
        setHelpOpen(!els.helpSheet?.classList.contains('open'));
    });
    els.helpClose?.addEventListener('click', () => setHelpOpen(false));
    els.shareToggle?.addEventListener('click', () => {
        setShareOpen(els.shareContent?.hidden ?? true);
    });
    els.shareCopy?.addEventListener('click', copyShareLink);
    els.homeInstall?.addEventListener('click', installToHomeScreen);
    els.splashInstall?.addEventListener('click', installToHomeScreen);
    els.drivingMapBack?.addEventListener('click', () => {
        if (state.listMode !== 'driving') return;
        setView('list');
        renderDrivingModeList();
    });
    els.driveMode?.addEventListener('click', () => {
        if (state.drivingActive) {
            stopDrivingMode(true);
            return;
        }
        startDrivingMode('ALL');
    });
    els.cityUpdate?.addEventListener('click', () => runCityUpdate(false));
    els.cityForceUpdate?.addEventListener('click', () => runCityUpdate(true));
    els.sortButtons.forEach((button) => {
        button.addEventListener('click', () => {
            els.sortButtons.forEach((item) => item.classList.toggle('active', item === button));
            if (state.listMode === 'results' && state.selectedLocation) {
                loadStations();
                return;
            }
            sortStations();
            renderResults();
            renderMarkers();
        });
    });
    els.brand.addEventListener('change', () => {
        saveUserSettings();
        if (state.listMode === 'autobahn') {
            renderResults();
            renderMarkers();
            return;
        }
        renderResults();
        renderMarkers();
    });
    [els.radius, els.fuel, els.limit, els.openOnly, els.pricedOnly].forEach((el) => {
        el.addEventListener('change', () => {
            saveUserSettings();
            if (state.listMode === 'cities') {
                if (state.cityMapMode === 'stationsList') {
                    loadCityStations(state.selectedCityId, 'list');
                    return;
                }
                renderResults();
                if (state.view === 'map') {
                    if (state.cityMapMode === 'overview') renderCityOverviewMap();
                    else loadCityStations(state.selectedCityId);
                }
                return;
            }
            if (state.listMode === 'autobahn') {
                renderResults();
                if (state.view === 'map') renderMarkers();
                return;
            }
            if (state.listMode === 'driving') {
                updateDrivingMode();
                return;
            }
            if (state.selectedLocation) loadStations();
        });
    });
}

loadFavorites();
startSplashScreen();
restoreUserSettings();
initInstallPrompt();
registerServiceWorker();
setupTopControls();
bindEvents();
setView('list');
updateFavoritesButton();
els.results.innerHTML = '<div class="empty-state">Adresse eingeben oder Standort verwenden.</div>';
restoreStartState();
