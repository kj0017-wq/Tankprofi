if (window.location.protocol === 'file:') {
    window.location.replace('http://localhost:8080/');
}

const appVersion = '20260701-autobahn-map-nonblocking';
const MAPTILER_API_KEY = 'U9TxjLpmNg3VlA1jqsRa';
const DEFAULT_VEHICLE_MODE = 'combustion';
const COMBUSTION_RADIUS_OPTIONS = ['2', '5', '10', '15', '20', '25'];
const ELECTRIC_RADIUS_OPTIONS = ['5', '10', '25'];
const COMBUSTION_LIMIT_OPTIONS = ['10', '25', '50', '100'];
const ELECTRIC_LIMIT_OPTIONS = ['20', '50', '100'];
const COMBUSTION_NORMAL_SEARCH_LIMIT = '100';
const ELECTRIC_CITY_RADIUS_KM = 20;
const ELECTRIC_RURAL_RADIUS_KM = 50;
const ELECTRIC_NEAREST_LIMIT = 100;
const ELECTRIC_ROUTE_CORRIDOR_KM = 8;
const DRIVE_HIGHWAY_PRICE_MAX_AGE_MS = 15 * 60 * 1000;
const USAGE_PRICE_MAX_AGE_MS = 30 * 60 * 1000;
const DRIVE_UPDATE_INTERVAL_MS = 5000;
const NORMAL_SEARCH_REFRESH_MS = 60 * 1000;
const CITY_DRIVE_PRICE_REFRESH_MS = 60 * 1000;
const DRIVE_HIGHWAY_LIVE_PRICE_LIMIT = 24;
const DRIVE_HIGHWAY_LIVE_CLUSTER_LIMIT = 5;
const DRIVE_HIGHWAY_LIVE_CLUSTER_RADIUS_KM = 5;
const DRIVE_HIGHWAY_LIVE_PRICE_DELAY_MS = 650;
const DRIVE_HIGHWAY_PRICE_RETRY_MS = 2 * 60 * 1000;
const DRIVE_ROUTE_DESTINATION_PREVIEW_LIMIT = 500;
const DRIVE_ROUTE_PREVIEW_CORRIDOR_KM = 8;
const DRIVE_ROUTE_PREVIEW_BEHIND_KM = 0.5;
const CITY_DRIVE_BEHIND_KEEP_KM = 0.2;
const DRIVE_RURAL_MAX_TANKPOINTS = 4;
const DRIVE_BEARING_MEMORY_MS = 3 * 60 * 1000;
const DRIVE_ROUTE_ON_ROUTE_MAX_KM = 1.5;
const DRIVE_ROUTE_STABLE_MAX_KM = 0.8;
const DRIVE_ROUTE_LEFT_AFTER_MS = 45 * 1000;
const DRIVE_ROUTE_HOLD_MS = 90 * 1000;
const DRIVE_ROUTE_HOLD_MAX_KM = 4;
const DRIVE_POSITION_STALE_MS = 15 * 1000;
const DRIVE_COMPASS_REFRESH_MS = 30 * 1000;
const DRIVE_COMPASS_RENDER_FAST_MS = 1200;
const DRIVE_MAP_FOLLOW_MIN_MS = 350;
const DRIVE_MAP_MANUAL_PAUSE_MS = 15 * 1000;
const DRIVE_MAP_INITIAL_ZOOM_DELAY_MS = 5 * 1000;
const DRIVE_MAP_NEAREST_OPEN_DELAY_MS = 1000;
const DRIVE_MAP_FOLLOW_ZOOM = 17;
const DRIVE_CITY_MAP_RADIUS_KM = 1.5;
const DRIVE_CONTROL_REVEAL_MS = 10 * 1000;
const DRIVE_CONTROL_MOVING_KMH = 5;
const DRIVE_LIST_AUTO_TOP_MS = 10 * 1000;
const NORMAL_SEARCH_STORED_CACHE_MS = 24 * 60 * 60 * 1000;
const STARTUP_LOCATION_MESSAGE_MIN_MS = 12000;
const STARTUP_SEARCH_TIMEOUT_MS = 60000;
const STARTUP_SEARCH_RETRY_TIMEOUT_MS = 60000;
const DRIVE_ROUTE_TEMPLATES = [
    { id: 'a9-muenchen', label: 'A9 Richtung Muenchen', routeIds: ['A9'], direction: 'Muenchen' },
    { id: 'a9-berlin', label: 'A9 Richtung Berlin', routeIds: ['A9'], direction: 'Berlin' },
    { id: 'berlin-salzburg', label: 'Berlin -> Salzburg', routeIds: ['A10', 'A9', 'A8'], direction: 'Muenchen' },
];

const state = {
    map: null,
    layer: null,
    drivingMarkerLayer: null,
    drivingRouteLayer: null,
    drivingDirectionLayer: null,
    autobahnRouteLayer: null,
    detailMapZoomTimer: null,
    drivingMapFocusTimer: null,
    drivingMapInitialZoomTimer: null,
    drivingMapFocusKey: null,
    drivingMapFocusActive: false,
    drivingMapNearestId: null,
    drivingMapNearestSwapTimer: null,
    drivingMapNearestDelayUntil: 0,
    drivingMapNearestDelayTimer: null,
    drivingMapFollowAt: null,
    drivingMapUserPanUntil: 0,
    drivingMapProgrammaticMove: false,
    drivingControlsVisibleUntil: 0,
    drivingControlsTimer: null,
    drivingListAutoTopTimer: null,
    markers: new Map(),
    userLocationMarker: null,
    selectedId: null,
    selectedLocation: null,
    stations: [],
    view: 'list',
    listMode: 'results',
    favorites: [],
    chargingFavorites: [],
    citySnapshot: null,
    cityRankings: [],
    cityStations: [],
    chargingCityRankings: [],
    chargingCityLoadKey: null,
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
    autobahnRouteTankpointLoadKey: null,
    chargingStations: [],
    chargingLoadKey: null,
    chargingDistributionLoadKey: null,
    chargingOperators: [],
    chargingOperatorsLimit: 40,
    chargingOperatorsLoadKey: null,
    chargingCityContext: null,
    chargingSearchContext: 'city',
    chargingSearchRadiusKm: ELECTRIC_CITY_RADIUS_KM,
    chargingShowOperators: false,
    chargingFilters: {
        operator: 'all',
        connector: 'all',
        minPower: 'all',
    },
    drivingActive: false,
    drivingWatchId: null,
    drivingUpdateTimer: null,
    drivingUpdateInProgress: false,
    drivingRouteId: 'ALL',
    drivingRouteTemplateId: 'a9-muenchen',
    drivingRouteSuggestion: null,
    drivingRouteInfo: null,
    drivingRouteInfoVisible: false,
    drivingDestinationQuery: '',
    drivingDestination: null,
    drivingDestinationOpen: false,
    drivingDestinationEdited: false,
    drivingDestinationConfirmedOpen: false,
    drivingDestinationHighwayKey: null,
    drivingDestinationHighwayReevaluatedAt: null,
    drivingDestinationReevalInProgress: false,
    drivingRoutePreviewCache: null,
    electricRoutePreviewCache: null,
    drivingRouteGeometry: [],
    autobahnRouteGeometryCache: new Map(),
    autobahnRouteGeometryLoadKey: null,
    drivingRouteLoadKey: null,
    drivingDetectedRouteId: null,
    drivingSamples: [],
    drivingRouteTankpoints: [],
    drivingRouteLoadedAt: null,
    drivingStatus: 'inactive',
    drivingDirection: null,
    drivingLastBearing: null,
    drivingLastBearingAt: null,
    drivingCompassHeading: null,
    drivingCompassHeadingAt: null,
    drivingCompassRenderAt: null,
    drivingCompassListenerActive: false,
    drivingCompassPermissionAsked: false,
    drivingCompassPermissionDenied: false,
    drivingSpeedKmh: null,
    drivingSpeedUpdatedAt: null,
    drivingAccuracy: null,
    drivingNearestRouteDistanceKm: null,
    drivingCurrentRoutePosition: null,
    drivingRouteProjection: null,
    drivingLastHighwayAt: null,
    drivingLastHighwayRouteId: null,
    drivingLastHighwayProjection: null,
    drivingRouteStartAxisKm: null,
    drivingRouteDestinationAxisKm: null,
    drivingRouteStartAccessKm: null,
    drivingStableDirection: null,
    drivingOffRouteSince: null,
    drivingContext: 'unknown',
    drivingCityLastLoadAt: null,
    drivingCityLastLoadKey: null,
    drivingRuralLastLoadAt: null,
    drivingRuralLastLoadKey: null,
    drivingRuralLastMessage: '',
    drivingLivePriceMessage: '',
    drivingPriceAttemptAt: new Map(),
    detailImportingIds: new Set(),
    detailImportAttemptAt: new Map(),
    detailReturnView: null,
    wakeLock: null,
    drivingMessage: 'Fahrmodus starten.',
    favoriteRefreshId: 0,
    navRequestId: 0,
    stationRequestId: 0,
    normalSearchLastKey: null,
    normalSearchLastLoadedAt: null,
    normalSearchLastMeta: null,
    normalSearchSnapshotBeforeDrive: null,
    normalSearchSnapshotBeforeSection: null,
    installPrompt: null,
    splashStartedAt: 0,
    splashHidden: false,
    activeDataRequests: 0,
    startupSearchRetryTimer: null,
    startupLocationPending: false,
    startupInteractionLocked: false,
    vehicleMode: DEFAULT_VEHICLE_MODE,
    drivingVehicleMode: DEFAULT_VEHICLE_MODE,
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
    brandLogo: document.querySelector('#brandLogoButton'),
    helpSheet: document.querySelector('#helpSheet'),
    helpClose: document.querySelector('#helpCloseButton'),
    vehicleChoice: document.querySelector('#vehicleChoice'),
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
    tankprofiElectricStationCount: document.querySelector('#tankprofiElectricStationCount'),
    tankprofiElectricBnetzaCount: document.querySelector('#tankprofiElectricBnetzaCount'),
    tankprofiElectricTeslaCount: document.querySelector('#tankprofiElectricTeslaCount'),
    tankprofiElectricFastCount: document.querySelector('#tankprofiElectricFastCount'),
    tankprofiKoenigSearchCount: document.querySelector('#tankprofiKoenigSearchCount'),
    tankprofiBerlinKoenigCount: document.querySelector('#tankprofiBerlinKoenigCount'),
    tankprofiKoenigAuditStats: document.querySelector('#tankprofiKoenigAuditStats'),
    tankprofiDeviceStats: document.querySelector('#tankprofiDeviceStats'),
    tankprofiStatsStatus: document.querySelector('#tankprofiStatsStatus'),
    vehicleMode: document.querySelector('#vehicleModeSelect'),
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
    drivingMapSpeed: document.querySelector('#drivingMapSpeed'),
    drivingMapNearest: document.querySelector('#drivingMapNearest'),
    globalProgress: document.querySelector('#globalProgress'),
    status: document.querySelector('#statusPill'),
    splash: document.querySelector('#splashScreen'),
    refresh: document.querySelector('#refreshButton'),
    detail: document.querySelector('#stationDetail'),
    viewButtons: document.querySelectorAll('.view-button'),
    bottomNavButtons: document.querySelectorAll('.bottom-nav-button'),
    template: document.querySelector('#stationTemplate'),
};

function updateViewportHeightVar() {
    if (!els.appShell?.classList.contains('driving-keyboard-open')) {
        document.documentElement.style.removeProperty('--app-viewport-height');
        return;
    }
    const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
    if (viewportHeight > 0) {
        document.documentElement.style.setProperty('--app-viewport-height', `${viewportHeight}px`);
    }
}

function setDrivingKeyboardOpen(open) {
    els.appShell?.classList.toggle('driving-keyboard-open', Boolean(open));
    window.setTimeout(updateViewportHeightVar, open ? 0 : 220);
}

function clearDrivingListAutoTopTimer() {
    if (!state.drivingListAutoTopTimer) return;
    clearTimeout(state.drivingListAutoTopTimer);
    state.drivingListAutoTopTimer = null;
}

function shouldAutoTopDrivingList() {
    return state.drivingActive
        && state.listMode === 'driving'
        && state.view === 'list'
        && !els.detail.classList.contains('visible')
        && !isDrivingDestinationInputActive();
}

function scheduleDrivingListAutoTop() {
    clearDrivingListAutoTopTimer();
    if (!shouldAutoTopDrivingList()) return;
    state.drivingListAutoTopTimer = window.setTimeout(() => {
        state.drivingListAutoTopTimer = null;
        if (!shouldAutoTopDrivingList() || !els.results || els.results.scrollTop <= 4) return;
        els.results.scrollTo({ top: 0, behavior: 'smooth' });
    }, DRIVE_LIST_AUTO_TOP_MS);
}

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
    if (els.locationButton) els.locationButton.hidden = true;
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
            button.innerHTML = installButtonHtml('Installiert', 'Tankprofi ist auf diesem Gerät gespeichert', '✓');
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
        state.map = L.map('map', { zoomControl: false, rotate: false, bearing: 0, rotateControl: false }).setView([51.1657, 10.4515], 6);
        state.map.on('dragstart', pauseDrivingMapFollow);
        state.map.on('zoomstart', () => {
            if (!state.drivingMapProgrammaticMove) pauseDrivingMapFollow();
        });
        L.control.zoom({ position: 'bottomright' }).addTo(state.map);
        const baseLayer = L.tileLayer(`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`, {
            maxZoom: 20,
            tileSize: 256,
            crossOrigin: true,
            attribution: '&copy; OpenStreetMap contributors &copy; MapTiler',
        }).addTo(state.map);
        let fallbackInstalled = false;
        baseLayer.on('tileerror', () => {
            if (fallbackInstalled || !state.map) return;
            fallbackInstalled = true;
            window.setTimeout(() => {
                if (!state.map || state.map.type === 'fallback') return;
                state.map.removeLayer(baseLayer);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap',
                }).addTo(state.map);
            }, 0);
        });
        state.layer = L.markerClusterGroup
            ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 42 }).addTo(state.map)
            : L.layerGroup().addTo(state.map);
        state.drivingMarkerLayer = L.layerGroup().addTo(state.map);
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

function setStartupInteractionLock(active, message = '') {
    state.startupInteractionLocked = Boolean(active);
    els.appShell?.classList.toggle('startup-interaction-locked', state.startupInteractionLocked);
    els.appShell?.classList.toggle('startup-lock-message-visible', state.startupInteractionLocked && Boolean(message));
    if (els.appShell) {
        els.appShell.style.setProperty('--startup-lock-message', `"${String(message).replace(/"/g, '\\"')}"`);
    }
}

function isInteractionLocked() {
    return Boolean(state.startupInteractionLocked);
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
    return station.prices?.[fuel]?.recordedAt
        || autobahnPriceStand(station)
        || routePriceStand(station)
        || station.last_update
        || station.lastUpdated
        || null;
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

function drivingSpeedText() {
    const isFresh = Date.now() - Number(state.drivingSpeedUpdatedAt || 0) <= 6000;
    if (!isFresh || !Number.isFinite(state.drivingSpeedKmh)) return '0 km/h';
    const displaySpeed = state.drivingContext === 'city' && state.drivingSpeedKmh > 10
        ? state.drivingSpeedKmh + 3
        : state.drivingSpeedKmh;
    return Number.isFinite(displaySpeed)
        ? `${Math.round(displaySpeed)} km/h`
        : '0 km/h';
}

function updateDrivingMapSpeed() {
    if (!els.drivingMapSpeed) return;
    els.drivingMapSpeed.textContent = drivingSpeedText();
}

function isDrivingMoving() {
    return Number(state.drivingSpeedKmh) >= DRIVE_CONTROL_MOVING_KMH;
}

function clearDrivingControlsTimer() {
    if (!state.drivingControlsTimer) return;
    clearTimeout(state.drivingControlsTimer);
    state.drivingControlsTimer = null;
}

function shouldCollapseDrivingControls() {
    if (!state.drivingActive || state.listMode !== 'driving' || state.view !== 'list') return false;
    if (state.drivingDestinationOpen || state.drivingRouteInfoVisible) return false;
    if (isDrivingDestinationInputActive()) return false;
    if (isDrivingMoving()) return true;
    return Date.now() > Number(state.drivingControlsVisibleUntil || 0);
}

function syncDrivingControlsVisibility() {
    const collapsed = shouldCollapseDrivingControls();
    els.appShell?.classList.toggle('driving-controls-collapsed', collapsed);
    clearDrivingControlsTimer();
    if (!state.drivingActive || state.listMode !== 'driving' || state.view !== 'list') return;
    const remainingMs = Number(state.drivingControlsVisibleUntil || 0) - Date.now();
    if (remainingMs > 0) {
        state.drivingControlsTimer = window.setTimeout(syncDrivingControlsVisibility, remainingMs + 40);
    }
}

function revealDrivingControls(durationMs = DRIVE_CONTROL_REVEAL_MS) {
    if (!state.drivingActive || state.listMode !== 'driving' || state.view !== 'list') return;
    state.drivingControlsVisibleUntil = Date.now() + durationMs;
    syncDrivingControlsVisibility();
}

function address(station) {
    if (!station) return '';
    const street = station.street || station.addressStreet || station.address || '';
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

function drivingStationAddress(station) {
    const value = address(station);
    if (value) return value;
    const matchedAddress = address(station?.priceMatch);
    if (matchedAddress) return matchedAddress;
    const exit = [station?.abfahrtNummer ? `AS ${station.abfahrtNummer}` : '', station?.abfahrtName].filter(Boolean).join(' ');
    const place = [station?.postcode || station?.postCode || station?.zip, station?.city || station?.place || station?.town].filter(Boolean).join(' ');
    const highway = [station?.highway || station?.autobahn || station?.routeId, station?.sideLabel || station?.richtung].filter(Boolean).join(' ');
    const fallback = [exit, place, highway].filter(Boolean).join(' - ');
    if (fallback) return fallback;
    if (Number.isFinite(Number(station?.lat)) && Number.isFinite(Number(station?.lng))) {
        return `${Number(station.lat).toFixed(5)}, ${Number(station.lng).toFixed(5)}`;
    }
    return '';
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
    const brandRaw = (station.brand || '').toLowerCase().trim();
    if (/^a\s?1(?:\b|[\s-])/.test(brandRaw)) return { label: 'A1', className: 'a1' };

    const raw = ([
        station.brand,
        station.operatorName,
        station.operator,
        station.displayName,
        station.name,
    ].filter(Boolean).join(' ')).toLowerCase();
    const operatorRaw = ([
        station.brand,
        station.operatorName,
        station.operator,
    ].filter(Boolean).join(' ')).toLowerCase();
    const brands = [
        ['aral', 'Aral', 'aral'],
        ['shell', 'Shell', 'shell'],
        ['esso', 'Esso', 'esso'],
        ['total', 'Total', 'total'],
        ['jet', 'Jet', 'jet'],
        ['hem', 'HEM', 'hem'],
        ['avia', 'Avia', 'avia'],
        ['avex', 'AVEX', 'avex'],
        ['star', 'Star', 'star'],
        ['westphal', 'Westphal', 'westphal'],
        ['freie', 'Freie', 'freie'],
        ['bavaria petrol', 'Bavaria', 'bavaria-petrol'],
        ['bavaria patrol', 'Bavaria', 'bavaria-petrol'],
        ['bavaria', 'Bavaria', 'bavaria-petrol'],
        ['sprint', 'Sprint', 'sprint'],
        ['seitz martin', 'Seitz Martin', 'seitz-martin'],
        ['martin tank', 'Seitz Martin', 'seitz-martin'],
        ['seitz', 'Seitz Martin', 'seitz-martin'],
        ['süd treibstoff', 'Sued Treibstoff', 'sued-treibstoff'],
        ['sued treibstoff', 'Sued Treibstoff', 'sued-treibstoff'],
        ['suedtreibstoff', 'Sued Treibstoff', 'sued-treibstoff'],
        ['reitmayr ts', 'Reitmayr', 'reitmayr'],
        ['reitmayr', 'Reitmayr', 'reitmayr'],
        ['baywa', 'BayWa', 'baywa'],
        ['bp', 'BP', 'bp'],
        ['bft', 'BFT', 'bft'],
        ['hoyer', 'Hoyer', 'hoyer'],
        ['honsel', 'Honsel', 'honsel'],
        ['raiffeisen', 'Raiffeisen', 'raiffeisen'],
        ['sb tank', 'SB Tank', 'sb-tank'],
        ['sb-tank', 'SB Tank', 'sb-tank'],
        ['markant', 'Markant', 'markant'],
        ['access', 'Access', 'access'],
        ['accsess', 'Access', 'access'],
        ['v-markt', 'V-Markt', 'v-markt'],
        ['v markt', 'V-Markt', 'v-markt'],
        ['elan', 'ELAN', 'elan'],
        ['bk', 'BK', 'bk'],
        ['allguth', 'Allguth', 'allguth'],
        ['svg', 'SVG', 'svg'],
        ['q1', 'Q1', 'q1'],
        ['tamoil', 'Tamoil', 'tamoil'],
        ['orlen', 'Orlen', 'orlen'],
        ['oil!', 'OIL!', 'oil'],
        ['oil ', 'OIL!', 'oil'],
        ['agip', 'Agip', 'agip'],
        ['eni', 'Eni', 'agip'],
        ['enbw', 'EnBW', 'enbw'],
        ['e.on drive', 'E.ON', 'eon'],
        ['eon drive', 'E.ON', 'eon'],
        ['e.on', 'E.ON', 'eon'],
        ['ionity', 'IONITY', 'ionity'],
        ['ewe go', 'EWE Go', 'ewe-go'],
        ['allego', 'Allego', 'allego'],
        ['mercedes-benz', 'Mercedes', 'mercedes'],
        ['westenergie', 'Westenergie', 'westenergie'],
        ['hamburger energiewerke', 'Hamburg Energie', 'hamburg-energie'],
        ['aldi süd', 'ALDI', 'aldi'],
        ['aldi sued', 'ALDI', 'aldi'],
        ['aldi', 'ALDI', 'aldi'],
        ['edeka', 'EDEKA', 'edeka'],
        ['ikea', 'IKEA', 'ikea'],
        ['netto marken-discount', 'Netto', 'netto'],
        ['netto', 'Netto', 'netto'],
        ['qwello', 'Qwello', 'qwello'],
        ['citywatt', 'Citywatt', 'citywatt'],
        ['comfortcharge', 'Comfortcharge', 'comfortcharge'],
        ['comfort charge', 'Comfortcharge', 'comfortcharge'],
        ['tesla', 'Tesla', 'tesla'],
        ['fastned', 'Fastned', 'fastned'],
        ['mer germany', 'Mer', 'mer'],
        ['deer', 'deer', 'deer'],
        ['totalenergies charging', 'TotalEnergies', 'total'],
        ['ubitricity', 'ubitricity', 'ubitricity'],
        ['berliner stadtwerke', 'Berliner Stadtwerke', 'berliner-stadtwerke'],
        ['stadtwerke kommunalpartner', 'Berliner Stadtwerke', 'berliner-stadtwerke'],
        ['score', 'Score', 'score'],
    ];
    const matchSource = station.chargingMode && operatorRaw ? operatorRaw : raw;
    const match = brands.find(([needle]) => matchSource.includes(needle));
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
    if (state.listMode === 'favorites') return state.favorites.map(stationForFavorite);
    const selectedBrand = els.brand.value;
    if (selectedBrand === 'all') return state.stations;
    return state.stations.filter((station) => stationBrandKey(station) === selectedBrand);
}

function brandLogoHtml(station) {
    const brand = brandInfo(station);
    const imageLogos = {
        aral: 'aral-logo.webp',
        shell: 'shell-logo.webp',
        esso: 'esso-logo.webp',
        jet: 'jet-logo.webp',
        hem: 'hem-logo.webp',
        avia: 'avia-logo.webp',
        avex: 'avex-logo.webp',
        star: 'star-logo.webp',
        total: 'total-logo.webp',
        agip: 'eni-logo.webp',
        westphal: 'westphal-logo.webp',
        freie: 'freie-logo.webp',
        bp: 'bp-logo.webp',
        bft: 'bft-logo.webp',
        hoyer: 'hoyer-logo.webp',
        honsel: 'honsel-logo.webp',
        raiffeisen: 'raiffeisen-logo.webp',
        'sb-tank': 'sb-tank-logo.webp',
        markant: 'markant-logo.webp',
        access: 'access-logo.webp',
        'v-markt': 'v-markt-logo.webp',
        elan: 'elan-logo.webp',
        bk: 'bk-logo.webp',
        allguth: 'allguth-logo.webp',
        svg: 'svg-logo.webp',
        q1: 'q1-logo.webp',
        a1: 'a1-logo.webp',
        tamoil: 'tamoil-logo.webp',
        orlen: 'orlen-logo.webp',
        oil: 'oil-logo.webp',
        'bavaria-petrol': 'bavaria-petrol-logo.webp',
        sprint: 'sprint-logo.webp',
        'seitz-martin': 'seitz-martin-logo.webp',
        'sued-treibstoff': 'sued-treibstoff-logo.webp',
        reitmayr: 'reitmayr-logo.webp',
        baywa: 'baywa-logo.webp',
        ubitricity: 'ubitricity-logo.webp',
        'berliner-stadtwerke': 'berliner-stadtwerke-logo.webp',
    };
    if (imageLogos[brand.className]) {
        return `<span class="brand-logo ${brand.className} image-logo"><img src="assets/img/${imageLogos[brand.className]}?v=${appVersion}" alt="${escapeHtml(brand.label)}"></span>`;
    }
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

function autobahnKindLabel(station) {
    return isAutohofStation(station) ? 'Autohof' : 'Raststätte';
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
    if (station.is_open === false || !isValidPriceValue(station.price)) return 'muted';
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
        .filter((station) => station.is_open !== false && isValidPriceValue(station.price))
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
    const selectedFuel = els.fuel.value;
    const displayPrice = isValidPriceValue(station.price)
        ? Number(station.price)
        : Number(fuelPriceValue(station, selectedFuel));
    const priceText = isValidPriceValue(displayPrice)
        ? `${displayPrice.toFixed(3).replace('.', ',')} €`
        : '-';
    const cls = selected ? 'selected' : markerClass({
        price: displayPrice,
        is_open: station.is_open ?? station.isOpen,
        priceCategory: station.priceCategory,
    }, thresholds);
    const driveStatus = station.drivingMode ? drivingPriceStatus(station).key : '';
    const statusHtml = driveStatus && driveStatus !== 'current' && driveStatus !== 'live'
        ? `<i class="marker-data-status ${driveStatus}" aria-hidden="true"></i>`
        : '';
    return L.divIcon({
        className: '',
        html: `<span class="drive-map-price-marker map-price-marker ${cls}${statusHtml ? ` drive-${driveStatus}` : ''}"><span class="drive-map-logo">${brandLogoHtml(station)}</span><strong>${escapeHtml(priceText)}</strong>${statusHtml}</span>`,
        iconSize: [108, 40],
        iconAnchor: [54, 20],
        popupAnchor: [0, -22],
    });
}

function driveMapIconFor(station, thresholds, selected = false) {
    if (station.chargingMode) {
        const power = Number(station.maxConnectorPowerKw || station.nominalPowerKw || 0);
        const powerText = power > 0 ? `${power.toLocaleString('de-DE')} kW` : (station.acDc || 'EV');
        const mode = station.acDc || (station.fastCharging ? 'DC' : 'AC');
        const cls = [
            'charging',
            station.fastCharging || mode === 'DC' ? 'fast' : 'normal',
            selected ? 'selected' : '',
        ].filter(Boolean).join(' ');
        return L.divIcon({
            className: '',
            html: `<span class="drive-map-price-marker ${cls}"><span class="drive-map-logo">${brandLogoHtml(station)}</span><strong>${escapeHtml(powerText)}</strong></span>`,
            iconSize: [118, 42],
            iconAnchor: [59, 21],
            popupAnchor: [0, -24],
        });
    }
    const selectedFuel = els.fuel.value;
    const price = fuelPriceValue(station, selectedFuel);
    const priceText = isValidPriceValue(price)
        ? `${Number(price).toFixed(3).replace('.', ',')} €`
        : '-';
    const cls = selected ? 'selected' : markerClass(station, thresholds);
    const status = drivingPriceStatus(station).key;
    const statusHtml = status && status !== 'current' && status !== 'live'
        ? `<i class="marker-data-status ${status}" aria-hidden="true"></i>`
        : '';
    return L.divIcon({
        className: '',
        html: `<span class="drive-map-price-marker ${cls}"><span class="drive-map-logo">${brandLogoHtml(station)}</span><strong>${escapeHtml(priceText)}</strong>${statusHtml}</span>`,
        iconSize: [104, 40],
        iconAnchor: [52, 20],
        popupAnchor: [0, -22],
    });
}

function chargingIconFor(station, selected = false) {
    const mode = station.acDc || (station.fastCharging ? 'DC' : 'AC');
    const power = Number(station.maxConnectorPowerKw || station.nominalPowerKw || 0);
    const label = power > 0 ? Math.round(power) : mode || 'EV';
    const cls = [
        'charging-marker',
        station.fastCharging || mode === 'DC' ? 'fast' : 'normal',
        selected ? 'selected' : '',
    ].filter(Boolean).join(' ');
    return L.divIcon({
        className: '',
        html: `<span class="${cls}"><i aria-hidden="true"></i><b>${escapeHtml(label)}</b></span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20],
    });
}

function driveMapThresholdsFor(stations) {
    const selectedFuel = els.fuel.value;
    return thresholdsFor(stations.map((station) => ({
        price: fuelPriceValue(station, selectedFuel),
        is_open: station.is_open ?? station.isOpen,
    })));
}

function userLocationIcon() {
    const bearing = state.listMode === 'driving' && state.view === 'map' ? drivingMapHeading(currentDrivingPosition()) : 0;
    const style = Number.isFinite(bearing) ? ` style="--user-bearing:${bearing}deg"` : '';
    return L.divIcon({
        className: '',
        html: `<span class="user-location-marker"${style}><i></i></span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -19],
    });
}

function renderUserLocationMarker() {
    if (!state.map || state.map.type === 'fallback') return;
    const position = state.listMode === 'driving'
        ? (state.drivingSamples[state.drivingSamples.length - 1] || state.selectedLocation)
        : state.selectedLocation;
    if (!position) return;
    const lat = Number(position.lat);
    const lng = Number(position.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (state.userLocationMarker) {
        state.userLocationMarker.setLatLng([lat, lng]);
        state.userLocationMarker.setIcon(userLocationIcon());
    } else {
        state.userLocationMarker = L.marker([lat, lng], {
            icon: userLocationIcon(),
            zIndexOffset: 1000,
        }).addTo(state.map);
    }
    state.userLocationMarker.bindPopup(`<strong>Dein Standort</strong><br>${escapeHtml(position.label || state.selectedLocation?.label || 'Aktuelle Position')}`);
}

function popupPriceGridHtml(station) {
    const fuels = [
        ['diesel', 'Diesel'],
        ['e5', 'E5'],
        ['e10', 'E10'],
    ];
    return `
        <div class="popup-price-grid">
            ${fuels.map(([fuel, label]) => `
                <span class="${priceClassForFuel(station, fuel)}${fuel === els.fuel.value ? ' selected' : ''}">
                    <small>${escapeHtml(label)}</small>
                    <strong>${money(fuelPriceValue(station, fuel))}</strong>
                </span>
            `).join('')}
        </div>
    `;
}

function popupNavigationLinksHtml(station) {
    const lat = Number(station.lat);
    const lng = Number(station.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
    const destination = `${lat},${lng}`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    const wazeUrl = `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
    const appleUrl = `https://maps.apple.com/?daddr=${destination}`;
    const geoUrl = `geo:${destination}?q=${destination}`;
    return `
        <div class="popup-nav-links" aria-label="Navigation">
            <a class="nav-link" href="${googleUrl}" target="_blank" rel="noopener">Google</a>
            <a class="nav-link" href="${wazeUrl}" target="_blank" rel="noopener">Waze</a>
            <a class="nav-link" href="${appleUrl}" target="_blank" rel="noopener">Apple</a>
            <a class="nav-link" href="${geoUrl}" target="_blank" rel="noopener">System</a>
        </div>
    `;
}

function popupDetailHtml(station, options = {}) {
    const status = station.is_open === null || station.is_open === undefined
        ? 'Status unbekannt'
        : station.is_open ? 'Geoeffnet' : 'Geschlossen';
    const addressLine = options.address || drivingStationAddress(station) || address(station) || '-';
    const distanceLine = Number.isFinite(Number(station.distance)) ? `${distanceText(station)} entfernt` : '';
    const priceStand = selectedFuelPriceStand(station, els.fuel.value) || routePriceStand(station) || station.last_update;
    return `
        <div class="popup-card">
            <h3 class="popup-title">${escapeHtml(station.name || 'Tankstelle')}</h3>
            <p class="popup-meta strong">${escapeHtml(station.brand || options.typeLabel || 'Tankstelle')}</p>
            <p class="popup-meta">${escapeHtml(addressLine)}</p>
            ${options.context ? `<p class="popup-meta">${escapeHtml(options.context)}</p>` : ''}
            ${distanceLine ? `<p class="popup-meta">${escapeHtml(distanceLine)}</p>` : ''}
            ${popupPriceGridHtml(station)}
            <p class="popup-meta">${escapeHtml(status)}${priceStand ? ` - Stand ${formatDateTime(priceStand)}` : ''}</p>
            ${popupNavigationLinksHtml(station)}
        </div>
    `;
}

function popupHtml(station) {
    const priceClass = visiblePriceClass(station);
    if (station.chargingMode) {
        const addressLine = chargingAddress(station) || '-';
        const distanceLine = Number.isFinite(Number(station.distance))
            ? `${Number(station.distance).toFixed(1).replace('.', ',')} km entfernt`
            : '';
        return `
            <div class="popup-card">
                <h3 class="popup-title">${escapeHtml(station.name || 'Ladeanlage')}</h3>
                <p class="popup-meta strong">${escapeHtml(station.operatorName || 'Betreiber unbekannt')}</p>
                <p class="popup-meta">${escapeHtml(addressLine)}</p>
                <p class="popup-price charging-popup">${escapeHtml(chargingPowerText(station))} ${escapeHtml(station.acDc || '')}</p>
                <p class="popup-meta">${escapeHtml(chargingConnectorText(station))}</p>
                ${distanceLine ? `<p class="popup-meta">${escapeHtml(distanceLine)}</p>` : ''}
                ${popupNavigationLinksHtml(station)}
            </div>
        `;
    }
    if (!station.cityOverview && !station.cityMode && !station.autobahnMode) {
        if (station.drivingMode || station.drivingContext) {
            const typeLabel = routeTankpointTypeLabel(station.typ);
            const context = [
                station.highway || station.autobahn || station.routeId,
                station.abfahrtName ? `Abfahrt ${station.abfahrtName}` : '',
            ].filter(Boolean).join(' - ');
            return popupDetailHtml(station, { typeLabel, context });
        }
        return popupDetailHtml(station);
    }
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
        <p class="popup-meta">${station.is_open === false ? 'Geschlossen' : station.is_open === true ? 'Geöffnet' : 'Status unbekannt'} · aktualisiert ${formatTime(station.last_update)}</p>
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
    const previousView = state.view;
    state.view = view;
    els.appShell.classList.toggle('view-list', view === 'list');
    els.appShell.classList.toggle('view-map', view === 'map');
    els.viewButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.view === view);
    });
    updateBottomNav();
    if (state.listMode === 'driving') {
        window.requestAnimationFrame(() => {
            if (state.listMode === 'driving') renderDrivingModeList();
        });
    }

    if (view !== 'map') {
        clearDetailMapZoomTimer();
        clearDrivingMapFocusTimer();
        clearDrivingMapInitialZoomTimer();
        clearDrivingMapNearestDelayTimer();
        state.drivingMapFocusKey = null;
        state.drivingMapFocusActive = false;
        state.drivingMapFollowAt = null;
        updateDrivingMapRotation();
        updateDrivingMapNearestBox([]);
    }

    if (view === 'map') {
        ensureMap();
        if (state.map.type !== 'fallback') {
            if (state.listMode === 'driving') {
                if (previousView !== 'map') {
                    const now = Date.now();
                    state.drivingMapUserPanUntil = now + DRIVE_MAP_INITIAL_ZOOM_DELAY_MS;
                    state.drivingMapFollowAt = now;
                    state.drivingMapNearestDelayUntil = now + DRIVE_MAP_NEAREST_OPEN_DELAY_MS;
                    clearDrivingMapNearestBox();
                    scheduleDrivingMapInitialZoom();
                }
                const anchor = drivingMapFallbackPosition(state.drivingSamples[state.drivingSamples.length - 1] || state.selectedLocation);
                const lat = Number(anchor?.lat);
                const lng = Number(anchor?.lng);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    state.drivingMapProgrammaticMove = true;
                    state.map.setView([lat, lng], Math.min(state.map.getZoom() || 12, 12), { animate: true });
                    window.setTimeout(() => {
                        state.drivingMapProgrammaticMove = false;
                    }, 0);
                }
            } else if (state.listMode !== 'autobahn') {
                state.map.setView([51.1657, 10.4515], state.stations.length ? 7 : 6, { animate: false });
            }
        }
        setTimeout(() => {
            if (state.listMode === 'cities' && state.cityMapMode === 'overview') {
                renderCityOverviewMap();
                return;
            }
            refreshMapLayout();
            renderMarkers();
        const station = getVisibleStations().find((item) => stationMapId(item) === state.selectedId)
                || state.stations.find((item) => stationMapId(item) === state.selectedId);
            if (station && state.listMode !== 'driving' && state.map.type !== 'fallback') {
                state.map.setView([station.lat, station.lng], Math.max(state.map.getZoom(), 14), { animate: true });
            }
        }, 180);
    }
}

function clearDetailMapZoomTimer() {
    if (!state.detailMapZoomTimer) return;
    clearTimeout(state.detailMapZoomTimer);
    state.detailMapZoomTimer = null;
}

function stationMapId(station) {
    return station?.tankerkoenig_id || station?.stationId || station?.id || '';
}

function openDetailStationMap(station) {
    if (!station || !Number.isFinite(Number(station.lat)) || !Number.isFinite(Number(station.lng))) return;
    const stationId = stationMapId(station);
    if (stationId) state.selectedId = stationId;
    clearDetailMapZoomTimer();
    renderDetail(null);
    setView('map');
    window.setTimeout(() => {
        if (state.view !== 'map' || !state.map || state.map.type === 'fallback') return;
        refreshMapLayout();
        if (state.listMode === 'driving') updateDrivingModeMapMarkers();
        else renderMarkers();
        state.map.setView([station.lat, station.lng], 12, { animate: true });
        state.detailMapZoomTimer = window.setTimeout(() => {
            state.detailMapZoomTimer = null;
            if (state.view !== 'map' || !state.map || state.map.type === 'fallback') return;
            if (stationId && state.selectedId !== stationId) return;
            state.map.setView([station.lat, station.lng], 17, { animate: true });
            const marker = stationId ? state.markers.get(stationId) : null;
            marker?.openPopup?.();
        }, 3000);
    }, 240);
}

function renderMarkers() {
    if (!state.map) return;

    state.markers.clear();
    if (state.listMode === 'driving') {
        renderDrivingMap();
        return;
    }
    if (state.drivingMarkerLayer) state.drivingMarkerLayer.clearLayers();
    const visibleStations = getVisibleStations();
    const thresholds = thresholdsFor(visibleStations);

    if (state.map.type === 'fallback') {
        renderFallbackMap(visibleStations, thresholds);
        return;
    }

    if (!state.layer) return;
    state.layer.clearLayers();

    visibleStations.forEach((station) => {
        const stationId = stationMapId(station);
        const marker = L.marker([station.lat, station.lng], {
            icon: station.chargingMode
                ? chargingIconFor(station, stationId === state.selectedId)
                : iconFor(station, thresholds, stationId === state.selectedId),
        }).bindPopup(popupHtml(station));

        if (window.matchMedia?.('(hover: hover)').matches) {
            marker.on('mouseover', () => marker.openPopup());
            marker.on('mouseout', () => {
                if (state.selectedId !== stationId) marker.closePopup();
            });
        }

        marker.on('click', () => {
            if (station.chargingMode) {
                state.selectedId = stationId;
                renderDetail(station);
                marker.openPopup();
                setView('list');
                return;
            }
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
            selectStation(stationId, true, true);
        });
        marker.addTo(state.layer);
        state.markers.set(stationId, marker);
    });

    if (visibleStations.length === 1) {
        const [station] = visibleStations;
        if (Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng))) {
            state.map.setView([station.lat, station.lng], 15, { animate: true });
        }
    } else if (visibleStations.length) {
        const bounds = L.latLngBounds(visibleStations.map((station) => [station.lat, station.lng]));
        state.map.fitBounds(bounds.pad(0.16), { maxZoom: 14 });
    }
    renderUserLocationMarker();
    renderDrivingRouteOverlay();
    renderAutobahnRouteOverlay();
}

function renderDrivingMap() {
    if (!state.map) return;
    state.markers.clear();
    updateDrivingMapSpeed();
    updateDrivingMapRotation();
    const userPosition = state.drivingSamples[state.drivingSamples.length - 1] || state.selectedLocation;
    const stationsToShow = drivingMapStationsToShow(userPosition);
    updateDrivingMapNearestBox(stationsToShow);
    if (state.map.type === 'fallback') {
        renderFallbackMap(state.drivingDestination ? stationsToShow : [], thresholdsFor(stationsToShow));
        return;
    }
    if (state.layer) state.layer.clearLayers();
    if (state.drivingMarkerLayer) state.drivingMarkerLayer.clearLayers();
    renderUserLocationMarker();
    renderDrivingRouteOverlay();

    const thresholds = driveMapThresholdsFor(stationsToShow);

    stationsToShow
        .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
        .forEach((station) => {
            const isSelected = station.tankerkoenig_id === state.selectedId;
            const marker = L.marker([station.lat, station.lng], {
                icon: driveMapIconFor(station, thresholds, isSelected),
            }).bindPopup(popupHtml(station));
            marker.on('click', () => {
                state.selectedId = station.tankerkoenig_id;
                state.detailReturnView = 'driving-map';
                renderDetail(station);
                importMissingDetailStationData(station, { force: true });
                marker.openPopup();
            });
            marker.addTo(state.drivingMarkerLayer || state.layer);
            state.markers.set(station.tankerkoenig_id, marker);
        });

    focusDrivingMapByHeading(stationsToShow, userPosition, { force: !state.drivingMapFollowAt });
}

function updateDrivingMapNearestBox(stations = state.stations) {
    if (!els.drivingMapNearest) return;
    if (state.listMode !== 'driving' || state.view !== 'map' || els.detail.classList.contains('visible')) {
        clearDrivingMapNearestBox();
        return;
    }
    const delayMs = Number(state.drivingMapNearestDelayUntil || 0) - Date.now();
    if (delayMs > 0) {
        els.drivingMapNearest.innerHTML = '';
        els.drivingMapNearest.classList.remove('visible', 'entering', 'leaving');
        clearDrivingMapNearestDelayTimer();
        state.drivingMapNearestDelayTimer = window.setTimeout(() => {
            state.drivingMapNearestDelayTimer = null;
            state.drivingMapNearestDelayUntil = 0;
            updateDrivingMapNearestBox(drivingMapStationsToShow(currentDrivingPosition() || state.selectedLocation));
        }, delayMs + 20);
        return;
    }
    const currentPosition = currentDrivingPosition() || state.selectedLocation;
    const drivingBearing = visualDrivingBearing();
    const stationsWithDistance = [...(stations || [])].map((station) => {
        const gpsDistance = currentPosition
            && Number.isFinite(Number(currentPosition.lat))
            && Number.isFinite(Number(currentPosition.lng))
            && Number.isFinite(Number(station.lat))
            && Number.isFinite(Number(station.lng))
            ? routeDistanceKm(currentPosition.lat, currentPosition.lng, station.lat, station.lng)
            : null;
        const stationBearing = currentPosition
            && Number.isFinite(Number(station.lat))
            && Number.isFinite(Number(station.lng))
            ? calculateBearing(currentPosition, station)
            : null;
        const bearingDelta = Number.isFinite(drivingBearing) && Number.isFinite(stationBearing)
            ? angularDifference(drivingBearing, stationBearing)
            : station.drivingBearingDelta;
        const behindDrivingDirection = Number.isFinite(bearingDelta)
            ? bearingDelta > 90
            : station.behindDrivingDirection;
        return {
            ...station,
            mapDistance: Number.isFinite(gpsDistance) ? gpsDistance : Number(station.distance),
            mapBearingDelta: bearingDelta,
            mapBehindDrivingDirection: behindDrivingDirection,
        };
    });
    const nearest = stationsWithDistance
        .filter((station) => (
            Number.isFinite(Number(station.mapDistance))
            && (!isLocalDrivingContext(station.drivingContext)
                || !station.mapBehindDrivingDirection
                || Number(station.mapDistance) <= CITY_DRIVE_BEHIND_KEEP_KM)
        ))
        .sort((a, b) => Number(a.mapDistance) - Number(b.mapDistance))[0];
    if (!nearest) {
        clearDrivingMapNearestBox();
        return;
    }
    renderDrivingMapNearestBox(nearest);
}

function clearDrivingMapNearestBox() {
    clearDrivingMapNearestDelayTimer();
    if (state.drivingMapNearestSwapTimer) {
        clearTimeout(state.drivingMapNearestSwapTimer);
        state.drivingMapNearestSwapTimer = null;
    }
    state.drivingMapNearestId = null;
    if (!els.drivingMapNearest) return;
    els.drivingMapNearest.innerHTML = '';
    els.drivingMapNearest.classList.remove('visible', 'entering', 'leaving');
}

function clearDrivingMapNearestDelayTimer() {
    if (!state.drivingMapNearestDelayTimer) return;
    clearTimeout(state.drivingMapNearestDelayTimer);
    state.drivingMapNearestDelayTimer = null;
}

function bindDrivingMapNearestBox(nearest) {
    if (!els.drivingMapNearest) return;
    const card = els.drivingMapNearest.querySelector('[data-driving-station-id]');
    card?.addEventListener('click', () => {
        const id = card.dataset.drivingStationId;
        state.selectedId = id;
        state.detailReturnView = 'driving-map';
        const station = state.stations.find((item) => String(item.tankerkoenig_id || item.stationId || item.id) === String(id)) || nearest;
        renderDetail(station);
        if (station.chargingMode) return;
        importMissingDetailStationData(station, { force: true });
    });
}

function renderDrivingMapNearestBox(nearest) {
    if (!els.drivingMapNearest) return;
    const nearestId = String(nearest.tankerkoenig_id || nearest.stationId || nearest.id || '');
    const currentId = state.drivingMapNearestId;
    const html = drivingMapNearestCardHtml(nearest);

    if (state.drivingMapNearestSwapTimer) {
        clearTimeout(state.drivingMapNearestSwapTimer);
        state.drivingMapNearestSwapTimer = null;
    }

    if (!currentId) {
        state.drivingMapNearestId = nearestId;
        els.drivingMapNearest.innerHTML = html;
        els.drivingMapNearest.classList.remove('leaving');
        els.drivingMapNearest.classList.add('visible', 'entering');
        window.setTimeout(() => els.drivingMapNearest?.classList.remove('entering'), 360);
        bindDrivingMapNearestBox(nearest);
        return;
    }

    if (currentId === nearestId) {
        els.drivingMapNearest.innerHTML = html;
        els.drivingMapNearest.classList.add('visible');
        els.drivingMapNearest.classList.remove('entering', 'leaving');
        bindDrivingMapNearestBox(nearest);
        return;
    }

    els.drivingMapNearest.classList.remove('entering');
    els.drivingMapNearest.classList.add('visible', 'leaving');
    state.drivingMapNearestSwapTimer = window.setTimeout(() => {
        state.drivingMapNearestSwapTimer = null;
        state.drivingMapNearestId = nearestId;
        els.drivingMapNearest.innerHTML = html;
        els.drivingMapNearest.classList.remove('leaving');
        els.drivingMapNearest.classList.add('visible', 'entering');
        window.setTimeout(() => els.drivingMapNearest?.classList.remove('entering'), 360);
        bindDrivingMapNearestBox(nearest);
    }, 220);
}

function drivingMapNearestCardHtml(station) {
    const id = station.tankerkoenig_id || station.stationId || station.id || '';
    const distance = Number.isFinite(Number(station.mapDistance))
        ? Number(station.mapDistance)
        : Number(station.distance);
    const distanceTextValue = Number.isFinite(distance)
        ? `${distance.toFixed(1).replace('.', ',')} km`
        : 'km offen';
    if (station.chargingMode) {
        const mode = station.acDc || (station.fastCharging ? 'DC' : 'AC');
        return `
            <article class="driving-map-nearest-card charging" tabindex="0" data-driving-station-id="${escapeHtml(id)}">
                <span class="nearest-logo">${brandLogoHtml(station)}</span>
                <span class="nearest-main">
                    <span><b>${escapeHtml(station.name || station.operatorName || 'Ladeanlage')}</b><i>${escapeHtml(mode)}</i></span>
                    <small>${escapeHtml(chargingAddress(station) || chargingConnectorText(station) || 'Adresse offen')}</small>
                </span>
                <span class="nearest-value"><b>${escapeHtml(chargingPowerText(station))}</b><small>${escapeHtml(distanceTextValue)}</small></span>
            </article>
        `;
    }
    const selectedFuel = els.fuel.value;
    const price = fuelPriceValue(station, selectedFuel);
    const priceText = isValidPriceValue(price) ? money(price) : '-';
    return `
        <article class="driving-map-nearest-card" tabindex="0" data-driving-station-id="${escapeHtml(id)}">
            <span class="nearest-logo">${brandLogoHtml(station)}</span>
            <span class="nearest-main">
                <span><b>${escapeHtml(station.name || station.brand || 'Tankpunkt')}</b><i>${escapeHtml(station.routeId || station.autobahn || station.highway || routeLabel())}</i></span>
                <small>${escapeHtml(drivingStationAddress(station) || compactAddress(station) || station.brand || 'Adresse offen')}</small>
            </span>
            <span class="nearest-value"><b>${escapeHtml(priceText)}</b><small>${escapeHtml(distanceTextValue)}</small></span>
        </article>
    `;
}

function drivingMapStationsToShow(position) {
    const byId = new Map();
    state.stations
        .filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng)))
        .forEach((station) => byId.set(drivingPointId(station), station));

    if (state.drivingDestination && state.drivingRouteSuggestion) {
        routePreviewStationsForDriving(position, DRIVE_ROUTE_DESTINATION_PREVIEW_LIMIT)
            .filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng)))
            .forEach((station) => {
                const id = drivingPointId(station);
                if (!byId.has(id)) byId.set(id, station);
            });
    }

    return [...byId.values()];
}

function drivingMapFallbackPosition(position) {
    const lastGpsPosition = state.drivingSamples[state.drivingSamples.length - 1];
    const candidates = [position, lastGpsPosition, state.selectedLocation, startupFallbackLocation];
    return candidates.find((candidate) => (
        candidate
        && Number.isFinite(Number(candidate.lat))
        && Number.isFinite(Number(candidate.lng))
    )) || startupFallbackLocation;
}

function drivingMapHeading(position) {
    const motionBearing = visualDrivingBearing();
    if (Number.isFinite(motionBearing)) return motionBearing;
    return 0;
}

function updateDrivingMapRotation() {
    const mapEl = document.querySelector('#map');
    if (!mapEl) return;
    const heading = state.listMode === 'driving' && state.view === 'map' ? drivingMapHeading(currentDrivingPosition()) : 0;
    mapEl.style.setProperty('--driving-map-rotation', '0deg');
    if (state.map && typeof state.map.setBearing === 'function') {
        state.map.setBearing(0);
    }
    if (state.userLocationMarker) state.userLocationMarker.setIcon(userLocationIcon());
}

function pauseDrivingMapFollow() {
    if (state.listMode !== 'driving' || state.view !== 'map') return;
    state.drivingMapUserPanUntil = Date.now() + DRIVE_MAP_MANUAL_PAUSE_MS;
}

function drivingMapBoundsAround(lat, lng, radiusKm) {
    const latDelta = radiusKm / 111.32;
    const cosLat = Math.max(0.18, Math.cos((lat * Math.PI) / 180));
    const lngDelta = radiusKm / (111.32 * cosLat);
    return L.latLngBounds(
        [lat - latDelta, lng - lngDelta],
        [lat + latDelta, lng + lngDelta],
    );
}

function focusDrivingMapByHeading(stationsToShow, userPosition, { force = false } = {}) {
    if (!state.map || state.map.type === 'fallback' || state.listMode !== 'driving' || state.view !== 'map') return;
    if (els.detail.classList.contains('visible')) return;
    const now = Date.now();
    const speed = Number(state.drivingSpeedKmh);
    const isMoving = Number.isFinite(speed) && speed >= DRIVE_CONTROL_MOVING_KMH;
    if (!force && !isMoving && now < Number(state.drivingMapUserPanUntil || 0)) return;
    if (!force && now - Number(state.drivingMapFollowAt || 0) < DRIVE_MAP_FOLLOW_MIN_MS) return;
    const anchor = drivingMapFallbackPosition(userPosition);
    const lat = Number(anchor.lat);
    const lng = Number(anchor.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    state.drivingMapFollowAt = now;
    state.drivingMapProgrammaticMove = true;
    if (isMoving) {
        state.map.setView([lat, lng], DRIVE_MAP_FOLLOW_ZOOM, { animate: true });
    } else if (state.drivingContext === 'city') {
        state.map.fitBounds(drivingMapBoundsAround(lat, lng, DRIVE_CITY_MAP_RADIUS_KM), {
            animate: false,
            padding: [18, 18],
            maxZoom: 15,
        });
    } else {
        const targetZoom = Number.isFinite(speed) && speed > 40 ? 14 : 15;
        const zoom = Math.max(state.map.getZoom() || targetZoom, targetZoom);
        state.map.setView([lat, lng], zoom, { animate: false });
    }
    window.setTimeout(() => {
        state.drivingMapProgrammaticMove = false;
    }, 0);
    updateDrivingMapRotation();
}

function clearDrivingMapFocusTimer() {
    if (state.drivingMapFocusTimer) {
        clearTimeout(state.drivingMapFocusTimer);
        state.drivingMapFocusTimer = null;
    }
}

function clearDrivingMapInitialZoomTimer() {
    if (!state.drivingMapInitialZoomTimer) return;
    clearTimeout(state.drivingMapInitialZoomTimer);
    state.drivingMapInitialZoomTimer = null;
}

function scheduleDrivingMapInitialZoom() {
    clearDrivingMapInitialZoomTimer();
    state.drivingMapInitialZoomTimer = window.setTimeout(() => {
        state.drivingMapInitialZoomTimer = null;
        if (state.listMode !== 'driving' || state.view !== 'map') return;
        const position = state.drivingSamples[state.drivingSamples.length - 1] || state.selectedLocation;
        state.drivingMapUserPanUntil = 0;
        state.drivingMapFollowAt = null;
        focusDrivingMapByHeading(drivingMapStationsToShow(position), position, { force: true });
    }, DRIVE_MAP_INITIAL_ZOOM_DELAY_MS);
}

function drivingMapFocusPointKey(point) {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng)
        ? `${lat.toFixed(4)},${lng.toFixed(4)}`
        : '';
}

function drivingMapLocalFocusKey(stations, position) {
    const firstIds = stations
        .slice(0, 3)
        .map((station) => drivingPointId(station))
        .join(',');
    return [
        state.drivingContext,
        routeLabel(),
        drivingMapFocusPointKey(position || state.selectedLocation),
        firstIds,
    ].join('|');
}

function scheduleDrivingMapLocalFocus(stationsToShow, userPosition) {
    if (state.listMode !== 'driving' || state.view !== 'map' || isLocalDrivingContext() || els.detail.classList.contains('visible')) {
        clearDrivingMapFocusTimer();
        if (!els.detail.classList.contains('visible')) {
            state.drivingMapFocusKey = null;
            state.drivingMapFocusActive = false;
        }
        return;
    }
    if (!state.map || state.map.type === 'fallback') return;
    const focusStations = stationsToShow
        .filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng)))
        .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0))
        .slice(0, 3);
    const anchor = userPosition || state.selectedLocation;
    const focusPoints = [
        ...(anchor ? [[anchor.lat, anchor.lng]] : []),
        ...focusStations.map((station) => [station.lat, station.lng]),
    ].filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)));
    if (!focusPoints.length) return;

    const focusKey = drivingMapLocalFocusKey(focusStations, anchor);
    if (state.drivingMapFocusKey === focusKey) return;
    state.drivingMapFocusKey = focusKey;
    state.drivingMapFocusActive = false;
    clearDrivingMapFocusTimer();
    state.drivingMapFocusTimer = setTimeout(() => {
        state.drivingMapFocusTimer = null;
        focusDrivingMapToLocalSegment();
    }, 1200);
}

function focusDrivingMapToLocalSegment() {
    if (els.detail.classList.contains('visible')) return;
    if (state.listMode !== 'driving' || state.view !== 'map' || isLocalDrivingContext()) return;
    if (!state.map || state.map.type === 'fallback') return;
    const anchor = state.drivingSamples[state.drivingSamples.length - 1] || state.selectedLocation;
    const focusStations = state.stations
        .filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng)))
        .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0))
        .slice(0, 3);
    const focusPoints = [
        ...(anchor ? [[anchor.lat, anchor.lng]] : []),
        ...focusStations.map((station) => [station.lat, station.lng]),
    ].filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)));
    if (!focusPoints.length) return;
    state.drivingMapFocusActive = true;
    if (focusPoints.length === 1) {
        state.map.setView(focusPoints[0], 14, { animate: true });
        return;
    }
    const bounds = L.latLngBounds(focusPoints);
    if (!bounds.isValid()) return;
    const flyToBounds = typeof state.map.flyToBounds === 'function'
        ? state.map.flyToBounds.bind(state.map)
        : state.map.fitBounds.bind(state.map);
    flyToBounds(bounds.pad(0.14), { maxZoom: 15, animate: true, duration: 0.9 });
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
    if (state.autobahnRouteLayer) {
        state.autobahnRouteLayer.remove();
        state.autobahnRouteLayer = null;
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

async function loadDrivingRouteGeometry(start, destination) {
    if (!start || !destination) return [];
    const startLat = Number(start.lat);
    const startLng = Number(start.lng);
    const endLat = Number(destination.lat);
    const endLng = Number(destination.lng);
    if (![startLat, startLng, endLat, endLng].every(Number.isFinite)) return [];
    const coords = `${startLng},${startLat};${endLng},${endLat}`;
    const params = new URLSearchParams({
        overview: 'full',
        geometries: 'geojson',
        alternatives: 'false',
        steps: 'false',
    });
    try {
        const data = await fetchJson(`https://router.project-osrm.org/route/v1/driving/${coords}?${params.toString()}`, { progress: false, timeoutMs: 12000 });
        const routeCoords = data.routes?.[0]?.geometry?.coordinates || [];
        return routeCoords
            .map(([lng, lat]) => [Number(lat), Number(lng)])
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    } catch {
        return [];
    }
}

function sampledAutobahnRouteWaypoints(points, maxPoints = 20) {
    const valid = points
        .map(([lat, lng]) => [Number(lat), Number(lng)])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (valid.length <= maxPoints) return valid;
    const sampled = [];
    for (let index = 0; index < maxPoints; index += 1) {
        const sourceIndex = Math.round((index * (valid.length - 1)) / (maxPoints - 1));
        sampled.push(valid[sourceIndex]);
    }
    return sampled.filter((point, index, list) => (
        index === 0 || point[0] !== list[index - 1][0] || point[1] !== list[index - 1][1]
    ));
}

function autobahnRouteGeometryCacheKey(highway, points) {
    const coordKey = sampledAutobahnRouteWaypoints(points)
        .map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`)
        .join(';');
    return `${highway}:${coordKey}`;
}

async function loadAutobahnRouteGeometry(points) {
    const waypoints = sampledAutobahnRouteWaypoints(points);
    if (waypoints.length < 2) return [];
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const params = new URLSearchParams({
        overview: 'full',
        geometries: 'geojson',
        alternatives: 'false',
        steps: 'false',
    });
    try {
        const data = await fetchJson(`https://router.project-osrm.org/route/v1/driving/${coords}?${params.toString()}`, { progress: false, timeoutMs: 16000 });
        const routeCoords = data.routes?.[0]?.geometry?.coordinates || [];
        return routeCoords
            .map(([lng, lat]) => [Number(lat), Number(lng)])
            .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    } catch {
        return [];
    }
}

function renderDrivingRouteOverlay() {
    if (!state.map || state.map.type === 'fallback') return;
    clearDrivingRouteOverlay();
    if (state.listMode !== 'driving') return;

    const routeLatLngs = state.drivingRouteGeometry || [];

    if (routeLatLngs.length >= 2) {
        state.drivingRouteLayer = L.polyline(routeLatLngs, {
            color: '#101419',
            weight: 5,
            opacity: 0.74,
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

    const selectedStation = state.stations.find((station) => station.tankerkoenig_id === state.selectedId);
    const visibleDrivingStations = state.listMode === 'driving'
        ? state.stations
            .filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng)))
            .map((station) => [station.lat, station.lng])
        : [];
    const fitPoints = [
        ...routeLatLngs,
        ...visibleDrivingStations,
        ...(position ? [[position.lat, position.lng]] : []),
        ...(state.drivingDestination ? [[state.drivingDestination.lat, state.drivingDestination.lng]] : []),
        ...(selectedStation ? [[selectedStation.lat, selectedStation.lng]] : []),
    ].filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)));
    if (fitPoints.length && !state.drivingMapFocusActive) {
        state.map.fitBounds(L.latLngBounds(fitPoints).pad(0.22), { maxZoom: 13 });
    }
}

function renderAutobahnRouteOverlay() {
    if (!state.map || state.map.type === 'fallback') return;
    if (state.autobahnRouteLayer) {
        state.autobahnRouteLayer.remove();
        state.autobahnRouteLayer = null;
    }
    if (state.listMode !== 'autobahn' || state.selectedHighway === 'all') return;

    syncAutobahnVisibleStations();
    const routePoints = state.autobahnStations
        .filter((station) => station.autobahnMode && station.highway === state.selectedHighway)
        .filter((station) => Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lng)))
        .sort(sortAutobahnStationsByGps)
        .map((station) => [Number(station.lat), Number(station.lng)]);
    if (routePoints.length < 2) return;
    const cacheKey = autobahnRouteGeometryCacheKey(state.selectedHighway, routePoints);
    const cachedGeometry = state.autobahnRouteGeometryCache.get(cacheKey);
    const linePoints = cachedGeometry?.length >= 2 ? cachedGeometry : routePoints;

    state.autobahnRouteLayer = L.polyline(linePoints, {
        color: '#ffd230',
        weight: 7,
        opacity: 0.72,
        lineCap: 'round',
        lineJoin: 'round',
    }).addTo(state.map);
    state.autobahnRouteLayer.bringToBack();

    const bounds = L.latLngBounds([...linePoints, ...routePoints]);
    if (bounds.isValid()) {
        state.map.fitBounds(bounds.pad(0.2), { maxZoom: 12, animate: true });
    }

    if (!cachedGeometry && state.autobahnRouteGeometryLoadKey !== cacheKey) {
        state.autobahnRouteGeometryLoadKey = cacheKey;
        loadAutobahnRouteGeometry(routePoints).then((geometry) => {
            if (geometry.length < 2) return;
            state.autobahnRouteGeometryCache.set(cacheKey, geometry);
            if (
                state.view === 'map'
                && state.listMode === 'autobahn'
                && state.selectedHighway !== 'all'
                && autobahnRouteGeometryCacheKey(state.selectedHighway, routePoints) === cacheKey
            ) {
                renderAutobahnRouteOverlay();
            }
        }).finally(() => {
            if (state.autobahnRouteGeometryLoadKey === cacheKey) state.autobahnRouteGeometryLoadKey = null;
        });
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
        if (isElectricMode()) {
            renderChargingCityRankings();
            return;
        }
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
        if (isElectricMode()) {
            renderChargingFavoriteRows();
            els.resultCount.textContent = `${state.chargingFavorites.length} EV-Favoriten`;
            els.resultMeta.textContent = 'Gespeicherte Ladeanlagen';
            if (!state.chargingFavorites.length) {
                els.results.innerHTML = '<div class="empty-state">Noch keine Elektro-Favoriten gespeichert.</div>';
            }
            return;
        }
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
    const station = state.stations.find((item) => stationMapId(item) === id);
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
    const isLoading = state.detailImportingIds.has(detailStationImportId(station))
        || state.autobahnPriceLoadingId === station.tankerkoenig_id
        || state.autobahnPriceLoadingId === station.stationId;
    if (!station?.autobahnMode && !station?.drivingMode) return priceGrid;
    const priceStand = autobahnPriceStand(station) || routePriceStand(station);
    const match = station.priceMatch
        ? `Zuordnung: ${escapeHtml(station.priceMatch.brand || station.priceMatch.name || 'gespeicherte Tankstelle')} (${Number(station.priceMatch.distanceKm || 0).toFixed(2).replace('.', ',')} km)`
        : 'Keine passende Preiszuordnung gefunden';
    return `
        ${station.autobahnMode ? tankRastBadgeHtml(station) : ''}
        ${priceGrid}
        <p class="detail-note">${isLoading ? 'Live-Daten werden gezielt geladen ...' : priceStand ? `Preisdaten: ${formatDateTime(priceStand)}` : 'Noch keine gespeicherten Preisdaten vorhanden.'}</p>
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

function stationHighwayBadgeHtml(station) {
    const highway = String(station?.highway || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!highway) return '';
    return `<span class="detail-highway" aria-label="Autobahn ${escapeHtml(highway)}">${escapeHtml(highway)}</span>`;
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

function detailStationImportId(station) {
    return String(
        station?.tankerkoenig_id
        || station?.stationId
        || station?.priceStationId
        || station?.id
        || `${station?.lat}:${station?.lng}`,
    );
}

function detailNeedsImmediateImport(station) {
    if (!station) return false;
    const hasPrice = ['diesel', 'e5', 'e10'].some((fuel) => isValidPriceValue(fuelPriceValue(station, fuel)));
    const hasDetailAddress = Boolean(address(station));
    const hasStatus = station.is_open === true || station.is_open === false;
    return !hasPrice || !hasDetailAddress || !hasStatus;
}

function canRunDetailImport(station, { force = false } = {}) {
    const id = detailStationImportId(station);
    if (!id || state.detailImportingIds.has(id)) return false;
    if (force) return true;
    const attemptedAt = state.detailImportAttemptAt.get(id);
    return !attemptedAt || Date.now() - attemptedAt >= 2 * 60 * 1000;
}

function rememberDetailImportAttempt(station) {
    const id = detailStationImportId(station);
    if (id) state.detailImportAttemptAt.set(id, Date.now());
}

function stationSameIdentity(candidate, station) {
    if (!candidate || !station) return false;
    const candidateIds = [
        candidate.tankerkoenig_id,
        candidate.stationId,
        candidate.priceStationId,
        candidate.tankerkoenigId,
        candidate.id,
    ].map(cleanTankerkoenigStationId).filter(Boolean);
    const stationIds = [
        station.tankerkoenig_id,
        station.stationId,
        station.priceStationId,
        station.tankerkoenigId,
        station.id,
    ].map(cleanTankerkoenigStationId).filter(Boolean);
    if (candidateIds.some((id) => stationIds.includes(id))) return true;
    const latA = Number(candidate.lat);
    const lngA = Number(candidate.lng);
    const latB = Number(station.lat);
    const lngB = Number(station.lng);
    return [latA, lngA, latB, lngB].every(Number.isFinite)
        && routeDistanceKm(latA, lngA, latB, lngB) <= 0.08;
}

function cleanTankerkoenigStationId(value) {
    const id = String(value || '').replace(/^tankkoenig_/i, '').trim();
    if (!id) return '';
    if (/^(node|way|relation|osm|addr|station|scan)_/i.test(id)) return '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return '';
    return id;
}

function tankerkoenigIdFromStation(station) {
    return cleanTankerkoenigStationId(
        station?.priceStationId
        || station?.tankerkoenigId
        || station?.tankerkoenig_id
        || station?.externalStationId
        || station?.stationId
        || station?.id
        || '',
    );
}

function mergeDetailStationIntoState(original, updated) {
    if (!updated) return original;
    const merged = { ...original, ...updated };
    state.stations = state.stations.map((item) => (
        stationSameIdentity(item, original) ? { ...item, ...updated } : item
    ));
    state.cityStations = state.cityStations.map((item) => (
        stationSameIdentity(item, original) ? { ...item, ...updated } : item
    ));
    state.drivingRouteTankpoints = state.drivingRouteTankpoints.map((item) => (
        stationSameIdentity(item, original) ? { ...item, ...updated } : item
    ));
    state.autobahnStations = state.autobahnStations.map((item) => (
        stationSameIdentity(item, original) ? { ...item, ...updated } : item
    ));
    state.favorites = state.favorites.map((item) => (
        stationSameIdentity(item, original) ? { ...item, ...updated } : item
    ));
    if (state.drivingRoutePreviewCache?.stations?.length) {
        state.drivingRoutePreviewCache = {
            ...state.drivingRoutePreviewCache,
            stations: state.drivingRoutePreviewCache.stations.map((item) => (
                stationSameIdentity(item, original) ? { ...item, ...updated } : item
            )),
        };
    }
    saveFavorites();
    return merged;
}

function refreshCurrentListAfterDetailUpdate(mergedStation) {
    if (!mergedStation) return;
    if (state.selectedId && stationSameIdentity(mergedStation, { tankerkoenig_id: state.selectedId, stationId: state.selectedId, id: state.selectedId })) {
        state.selectedId = mergedStation.tankerkoenig_id || mergedStation.stationId || mergedStation.id || state.selectedId;
    }

    if (state.listMode === 'driving') {
        if (state.view === 'map') updateDrivingModeMapMarkers();
        renderDrivingModeList();
    } else {
        renderResults();
        renderMarkers();
    }

    if (state.view === 'map') {
        if (state.listMode === 'driving') updateDrivingModeMapMarkers();
        else renderMarkers();
    }
}

async function loadLiveDetailForStation(station) {
    const lat = Number(station?.lat);
    const lng = Number(station?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return station;
    const stationId = drivingStationRefreshId(station);
    if (stationId) {
        const params = new URLSearchParams({
            stationId,
            prices: '1',
            refresh: '1',
        });
        const data = await fetchJson(`/api/autobahn/stations.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
        const updated = (data.stations || [])
            .map(normalizeAutobahnStation)
            .find((item) => stationSameIdentity(item, station) || item.tankerkoenig_id === stationId);
        if (updated && (updated.priceMatch || hasAnyFuelPrice(updated) || address(updated))) {
            return {
                ...station,
                ...updated,
                drivingMode: station.drivingMode,
                drivingContext: station.drivingContext,
                distance: station.distance,
                tankerkoenig_id: station.tankerkoenig_id || updated.tankerkoenig_id,
                stationId: station.stationId || updated.stationId || updated.tankerkoenig_id,
                price: fuelPriceValue(updated, els.fuel.value),
                last_update: autobahnPriceStand(updated) || updated.last_update || station.last_update,
            };
        }
    }
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: '5',
        fuel: els.fuel.value,
        limit: '25',
        open: '0',
        priced: '0',
        live: '1',
        sort: 'distance',
        q: station.name || station.brand || 'Detailimport',
    });
    const data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
    const match = bestLiveMatchForDrivingStation(station, data.stations || []);
    return match ? mergeLiveDrivingPrice(station, match) : station;
}

async function importMissingDetailStationData(station, options = {}) {
    const force = options.force === true;
    if (!force && !detailNeedsImmediateImport(station)) return;
    if (!canRunDetailImport(station, { force })) return;
    const importId = detailStationImportId(station);
    const loadingId = station.tankerkoenig_id || station.stationId || station.id;
    state.detailImportingIds.add(importId);
    rememberDetailImportAttempt(station);
    if (!station.autobahnMode) {
        state.autobahnPriceLoadingId = loadingId || state.autobahnPriceLoadingId;
    }
    if (state.selectedId === station.tankerkoenig_id || state.selectedId === station.stationId || state.selectedId === station.id) renderDetail(station);
    try {
        let updated = null;
        if (station.autobahnMode) {
            await refreshAutobahnStationPrices(station.tankerkoenig_id);
            return;
        }
        if (station.drivingMode || station.priceStationId || station.stationId) {
            updated = await loadLiveDetailForStation(station);
        } else {
            await refreshDetailStation(station);
            return;
        }
        if (updated && updated !== station) {
            const merged = mergeDetailStationIntoState(station, updated);
            refreshCurrentListAfterDetailUpdate(merged);
            if (state.selectedId === station.tankerkoenig_id || state.selectedId === station.stationId || state.selectedId === station.id) {
                renderDetail(merged);
            }
        }
    } catch (error) {
        if (state.selectedId === station.tankerkoenig_id) {
            els.resultMeta.textContent = error.message || 'Detaildaten konnten nicht geladen werden.';
        }
    } finally {
        state.detailImportingIds.delete(importId);
        if (state.autobahnPriceLoadingId === station.tankerkoenig_id || state.autobahnPriceLoadingId === station.stationId) {
            state.autobahnPriceLoadingId = null;
        }
        if (loadingId && (state.selectedId === station.tankerkoenig_id || state.selectedId === station.stationId || state.selectedId === station.id)) {
            const current = state.stations.find((item) => item.tankerkoenig_id === loadingId || item.stationId === loadingId || item.id === loadingId)
                || state.autobahnStations.find((item) => item.tankerkoenig_id === loadingId || item.stationId === loadingId || item.id === loadingId)
                || station;
            renderDetail(current);
        }
    }
}

function renderDetail(station) {
    if (!station) {
        const returnView = state.detailReturnView;
        state.detailReturnView = null;
        els.appShell.classList.remove('detail-open');
        els.detail.classList.remove('visible');
        els.detail.innerHTML = '<div class="empty-state">Tankstelle antippen, um Details zu sehen.</div>';
        updateBottomNav();
        if (returnView === 'driving-map' && state.listMode === 'driving') {
            setView('map');
            window.requestAnimationFrame(() => {
                refreshMapLayout();
                state.drivingMapFocusActive = true;
                updateDrivingModeMapMarkers();
            });
        }
        return;
    }

    clearDrivingMapFocusTimer();
    const wazeUrl = `https://waze.com/ul?ll=${station.lat}%2C${station.lng}&navigate=yes`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    const appleUrl = `https://maps.apple.com/?daddr=${station.lat},${station.lng}`;
    const geoUrl = `geo:${station.lat},${station.lng}?q=${station.lat},${station.lng}`;
    if (station.chargingMode) {
        els.appShell.classList.add('detail-open');
        els.detail.classList.add('visible');
        updateBottomNav();
        els.detail.innerHTML = `
            <article class="detail-panel charging-detail">
                <div class="detail-closebar">
                    <button class="detail-back" type="button" id="detailBackButton">â† Zurueck zur Liste</button>
                    <button class="detail-close" type="button" id="detailCloseButton" aria-label="Detailansicht schlieÃŸen">Ã—</button>
                </div>
                <div class="detail-header">
                    ${brandLogoHtml(station)}
                    <div class="detail-titleblock">
                        <h2>${escapeHtml(station.name || 'Ladeanlage')}</h2>
                        <p class="detail-brand">${escapeHtml(station.operatorName || station.displayName || 'Betreiber unbekannt')}</p>
                    </div>
                    <span class="detail-highway">${escapeHtml(station.acDc || 'EV')}</span>
                </div>
                <div class="charging-detail-power">
                    <span>
                        <small>Leistung</small>
                        <strong>${escapeHtml(chargingPowerText(station))}</strong>
                    </span>
                    <span>
                        <small>Ladepunkte</small>
                        <strong>${Number(station.chargingPointCount || 0).toLocaleString('de-DE')}</strong>
                    </span>
                    <span>
                        <small>Typ</small>
                        <strong>${escapeHtml(station.fastCharging ? 'Schnellladen' : station.facilityType || 'Laden')}</strong>
                    </span>
                </div>
                <div class="detail-grid">
                    <div class="detail-cell detail-cell-inline detail-distance-cell">
                        <span class="detail-label">Entfernung</span>
                        <span class="detail-value">${Number.isFinite(Number(station.distance)) ? `${Number(station.distance).toFixed(1).replace('.', ',')} km` : '-'}</span>
                    </div>
                    <div class="detail-cell detail-cell-inline detail-updated-cell">
                        <span class="detail-label">Quelle</span>
                        <span class="detail-value">BNetzA ${escapeHtml(station.sourceUpdatedAt || '')}</span>
                    </div>
                    <div class="detail-cell detail-address-cell">
                        <span class="detail-label">Adresse</span>
                        <span class="detail-value">${escapeHtml(chargingAddress(station) || '-')}</span>
                    </div>
                    <div class="charging-detail-meta-row">
                        <span>
                            <small>Betrieb</small>
                            <strong>${escapeHtml(station.status || 'unbekannt')}</strong>
                        </span>
                        <span>
                            <small>Stecker</small>
                            <strong>${escapeHtml(chargingConnectorText(station))}</strong>
                        </span>
                        <span>
                            <small>Bezahlung</small>
                            <strong>${escapeHtml((station.paymentSystems || []).join(', ') || '-')}</strong>
                        </span>
                    </div>
                </div>
                <nav class="detail-footer-nav" aria-label="Detailaktionen">
                    <button class="${isChargingFavorite(station.stationId || station.id) ? 'active' : ''}" type="button" id="chargingFavoriteButton">Favorit</button>
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
        document.querySelector('#chargingFavoriteButton')?.addEventListener('click', () => toggleChargingFavorite(station));
        document.querySelector('#showMapButton')?.addEventListener('click', () => openDetailStationMap(station));
        return;
    }
    const detailPriceClass = visiblePriceClass(station);
    const distanceValue = Number(station.distance);
    const showDistance = !(station.autobahnMode && (!Number.isFinite(distanceValue) || distanceValue <= 0.05));
    const detailIsLoading = state.detailImportingIds.has(detailStationImportId(station))
        || state.autobahnPriceLoadingId === station.tankerkoenig_id
        || state.autobahnPriceLoadingId === station.stationId;
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
                <div class="detail-titleblock">
                    <h2>${escapeHtml(station.name || 'Tankstelle')}</h2>
                    <p class="detail-brand">${escapeHtml(station.brand || 'Freie Tankstelle')}</p>
                </div>
                ${stationHighwayBadgeHtml(station)}
            </div>
            ${stationDetailExtraHtml(station)}
            <div class="detail-grid">
                ${showDistance ? `
                    <div class="detail-cell detail-cell-inline detail-distance-cell">
                        <span class="detail-label">Entfernung</span>
                        <span class="detail-value">${distanceText(station)}</span>
                    </div>
                ` : ''}
                <div class="detail-cell detail-cell-inline detail-updated-cell${showDistance ? '' : ' full'}">
                    <span class="detail-label">Aktualisiert</span>
                    <span class="detail-value">${formatTime(station.last_update)}</span>
                </div>
                <div class="detail-cell detail-address-cell">
                    <span class="detail-label">Adresse</span>
                    <span class="detail-value">${escapeHtml(address(station) || '-')}</span>
                </div>
                <div class="detail-cell detail-status-cell">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${station.is_open === false ? 'Geschlossen' : station.is_open === true ? 'Geöffnet' : 'unbekannt'}</span>
                </div>
            </div>
            <nav class="detail-footer-nav" aria-label="Detailaktionen">
                <button class="${isFavorite(station.tankerkoenig_id) ? 'active' : ''}" type="button" id="favoriteButton">Favorit</button>
                <button type="button" id="detailUpdateButton"${detailIsLoading ? ' disabled' : ''}>${detailIsLoading ? 'Laedt' : 'Aktualisieren'}</button>
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
    document.querySelector('#detailUpdateButton')?.addEventListener('click', () => {
        importMissingDetailStationData(station, { force: true });
    });
    document.querySelector('#showMapButton')?.addEventListener('click', () => openDetailStationMap(station));
    window.setTimeout(() => importMissingDetailStationData(station), 0);
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
        let response;
        try {
            response = await fetch(url, {
                ...fetchOptions,
                signal: fetchOptions.signal || controller.signal,
            });
        } catch (error) {
            if (error?.name === 'AbortError') {
                const path = (() => {
                    try {
                        return new URL(url, window.location.href).pathname;
                    } catch {
                        return String(url);
                    }
                })();
                throw new Error(`Anfrage abgebrochen oder zu langsam: ${path}`);
            }
            throw error;
        }
        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            const path = (() => {
                try {
                    return new URL(url, window.location.href).pathname;
                } catch {
                    return String(url);
                }
            })();
            throw new Error(`API liefert keine JSON-Daten: ${path}`);
        }
        if (!response.ok || data.error) {
            const message = String(data.error || 'Anfrage fehlgeschlagen.');
            throw new Error(message.includes('Unexpected token') ? 'API liefert keine gueltigen JSON-Daten.' : message);
        }
        return data;
    } finally {
        window.clearTimeout(timeout);
        if (options.progress !== false) endDataRequest();
    }
}

function isAbortOrTimeoutError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return error?.name === 'AbortError'
        || message.includes('abgebrochen')
        || message.includes('zu langsam')
        || message.includes('abort')
        || message.includes('timeout')
        || message.includes('timed out');
}

async function fetchJsonWithRetry(url, options = {}, retryOptions = {}) {
    const attempts = Math.max(1, Number(retryOptions.attempts || 2));
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const attemptOptions = attempt > 1 && retryOptions.retryTimeoutMs
                ? { ...options, timeoutMs: retryOptions.retryTimeoutMs }
                : options;
            return await fetchJson(url, attemptOptions);
        } catch (error) {
            lastError = error;
            if (attempt >= attempts || !isAbortOrTimeoutError(error)) throw error;
            if (typeof retryOptions.onRetry === 'function') retryOptions.onRetry(error, attempt + 1);
            const delayMs = Number(retryOptions.delayMs || 650);
            await new Promise((resolve) => {
                window.setTimeout(resolve, delayMs);
            });
        }
    }
    throw lastError;
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

function normalSearchCacheKey(params) {
    const stableParams = new URLSearchParams(params);
    stableParams.delete('sort');
    stableParams.delete('q');
    return stableParams.toString();
}

function normalSearchLimitValue() {
    return isElectricMode() ? String(els.limit?.value || '50') : COMBUSTION_NORMAL_SEARCH_LIMIT;
}

function isNormalSearchStation(station) {
    return Boolean(station)
        && !station.cityOverview
        && !station.cityMode
        && !station.autobahnMode
        && !station.chargingMode
        && !station.routeMode
        && (station.tankerkoenig_id || station.id || station.stationId || station.lat);
}

function saveNormalSearchCache(cacheKey) {
    const stations = Array.isArray(state.stations)
        ? state.stations.filter(isNormalSearchStation)
        : [];
    if (!cacheKey || !stations.length) return;
    try {
        localStorage.setItem('tankprofi_normal_search_cache', JSON.stringify({
            cacheKey,
            loadedAt: state.normalSearchLastLoadedAt || Date.now(),
            meta: state.normalSearchLastMeta || null,
            selectedLocation: state.selectedLocation || null,
            searchInputValue: els.searchInput?.value || '',
            stations: stations.slice(0, 120),
        }));
    } catch {
        localStorage.removeItem('tankprofi_normal_search_cache');
    }
}

function loadNormalSearchCache(cacheKey) {
    try {
        const cache = JSON.parse(localStorage.getItem('tankprofi_normal_search_cache') || 'null');
        if (!cache || cache.cacheKey !== cacheKey || !Array.isArray(cache.stations) || !cache.stations.length) return null;
        const loadedAt = Number(cache.loadedAt || 0);
        if (!loadedAt || Date.now() - loadedAt > NORMAL_SEARCH_STORED_CACHE_MS) return null;
        return cache;
    } catch {
        localStorage.removeItem('tankprofi_normal_search_cache');
        return null;
    }
}

function renderStoredNormalSearchCache(cache) {
    state.stations = cache.stations.map((station) => ({ ...station }));
    state.selectedLocation = cache.selectedLocation ? { ...cache.selectedLocation } : state.selectedLocation;
    state.normalSearchLastKey = cache.cacheKey;
    state.normalSearchLastLoadedAt = Number(cache.loadedAt || Date.now());
    state.normalSearchLastMeta = cache.meta ? { ...cache.meta, fallback: true } : { fallback: true };
    if (cache.searchInputValue && els.searchInput) els.searchInput.value = cache.searchInputValue;
    renderCachedNormalSearch();
}

function renderNormalSearchLoading(message = 'Standortliste wird geladen ...') {
    els.resultCount.textContent = 'Standortliste';
    els.resultMeta.textContent = message;
    els.results.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
    renderDetail(null);
}

function setNormalResultSummary(countText, metaText = '') {
    const compactMeta = String(metaText || '').trim();
    els.resultCount.textContent = compactMeta ? `${countText} · ${compactMeta}` : countText;
    els.resultMeta.textContent = '';
}

function clearStartupSearchRetryTimer() {
    if (!state.startupSearchRetryTimer) return;
    window.clearTimeout(state.startupSearchRetryTimer);
    state.startupSearchRetryTimer = null;
}

function startupSearchRecoveryHtml(error, { retrying = false, final = false } = {}) {
    const errorText = String(error?.message || error || 'Tankstellenabfrage nicht erreichbar.');
    return `
        <div class="empty-state startup-recovery-state">
            <strong>Standort ist ermittelt.</strong>
            <span>Die Tankstellenliste konnte noch nicht geladen werden.</span>
            <ul class="startup-recovery-list">
                <li>GPS-Koordinaten wurden uebernommen.</li>
                <li>Die automatische Suche hat geantwortet: ${escapeHtml(errorText)}</li>
                <li>${retrying ? 'Der zweite Ladeversuch laeuft jetzt.' : final ? 'Automatik beendet. Standort oder Suche erneut antippen.' : 'Die App wartet auf den naechsten Versuch.'}</li>
            </ul>
        </div>
    `;
}

function finishStartupSearchError(error) {
    setStatus('Bereit');
    els.resultCount.textContent = 'Standort gefunden';
    els.resultMeta.textContent = 'Tankstellen konnten noch nicht geladen werden.';
    els.results.innerHTML = startupSearchRecoveryHtml(error, { final: true });
    renderDetail(null);
    hideSplashScreen();
}

function renderCachedNormalSearch() {
    state.listMode = 'results';
    updateFavoritesButton();
    sortStations();
    els.resultCount.textContent = `${state.stations.length} Treffer`;
    const meta = state.normalSearchLastMeta;
    els.resultMeta.textContent = meta?.fallback
        ? `Gespeichert · ${fuelShortLabel(els.fuel.value)} · ${els.radius.value} km`
        : `${fuelShortLabel(els.fuel.value)} · ${els.radius.value} km`;
    if (state.view === 'map') renderMarkers();
    renderResults();
    renderDetail(null);
    setView('list');
    setStatus(meta?.fallback ? 'Cache' : 'Live');
    hideSplashScreen();
}

function captureNormalSearchBeforeDrive() {
    if (state.listMode !== 'results' || !state.stations.length) return;
    state.normalSearchSnapshotBeforeDrive = {
        stations: state.stations.map((station) => ({ ...station })),
        selectedLocation: state.selectedLocation ? { ...state.selectedLocation } : null,
        searchInputValue: els.searchInput?.value || '',
        selectedId: state.selectedId,
        normalSearchLastKey: state.normalSearchLastKey,
        normalSearchLastLoadedAt: state.normalSearchLastLoadedAt,
        normalSearchLastMeta: state.normalSearchLastMeta ? { ...state.normalSearchLastMeta } : null,
    };
}

function normalSearchSnapshot() {
    if (state.listMode !== 'results' || !state.stations.length) return null;
    const stations = state.stations.filter(isNormalSearchStation);
    if (!stations.length) return null;
    return {
        stations: stations.map((station) => ({ ...station })),
        selectedLocation: state.selectedLocation ? { ...state.selectedLocation } : null,
        searchInputValue: els.searchInput?.value || '',
        selectedId: state.selectedId,
        normalSearchLastKey: state.normalSearchLastKey,
        normalSearchLastLoadedAt: state.normalSearchLastLoadedAt,
        normalSearchLastMeta: state.normalSearchLastMeta ? { ...state.normalSearchLastMeta } : null,
    };
}

function captureNormalSearchBeforeSection() {
    const snapshot = normalSearchSnapshot();
    if (snapshot) state.normalSearchSnapshotBeforeSection = snapshot;
}

function restoreNormalSearchSnapshot(snapshot) {
    if (!snapshot?.stations?.length) return false;
    state.stations = snapshot.stations.map((station) => ({ ...station }));
    state.selectedLocation = snapshot.selectedLocation ? { ...snapshot.selectedLocation } : null;
    state.selectedId = snapshot.selectedId || null;
    state.normalSearchLastKey = snapshot.normalSearchLastKey || null;
    state.normalSearchLastLoadedAt = snapshot.normalSearchLastLoadedAt || null;
    state.normalSearchLastMeta = snapshot.normalSearchLastMeta ? { ...snapshot.normalSearchLastMeta } : null;
    if (els.searchInput) els.searchInput.value = snapshot.searchInputValue || state.selectedLocation?.label || '';
    renderCachedNormalSearch();
    return true;
}

function restoreNormalSearchAfterSection() {
    return restoreNormalSearchSnapshot(state.normalSearchSnapshotBeforeSection);
}

function restoreNormalSearchAfterDrive() {
    const snapshot = state.normalSearchSnapshotBeforeDrive;
    if (!snapshot?.stations?.length) {
        restoreStoredStartState();
        return;
    }
    restoreNormalSearchSnapshot(snapshot);

    const stale = !state.normalSearchLastLoadedAt || Date.now() - state.normalSearchLastLoadedAt >= NORMAL_SEARCH_REFRESH_MS;
    if (stale && state.selectedLocation) {
        refreshNormalSearchInBackground().catch(() => null);
    }
}

async function loadStations(options = {}) {
    const startedAt = Date.now();
    if (!options.startup) clearStartupSearchRetryTimer();
    if (options.startup) setStartupInteractionLock(true);
    if (!state.selectedLocation) {
        await chooseFirstSuggestion();
        if (!state.selectedLocation) {
            els.resultCount.textContent = 'Keine Suche';
            els.resultMeta.textContent = 'Adresse eingeben oder Standort verwenden.';
            els.results.innerHTML = '<div class="empty-state">Adresse eingeben oder Standort verwenden.</div>';
            if (options.startup) setStartupInteractionLock(false);
            hideSplashScreen();
            return;
        }
    }

    const params = new URLSearchParams({
        lat: state.selectedLocation.lat,
        lng: state.selectedLocation.lng,
        radius: els.radius.value,
        fuel: els.fuel.value,
        limit: normalSearchLimitValue(),
        open: els.openOnly.checked ? '1' : '0',
        priced: els.pricedOnly.checked ? '1' : '0',
        sort: document.querySelector('.sort-toggle-button.active')?.dataset.sort || 'price',
        q: els.searchInput.value.trim(),
    });
    const cacheKey = normalSearchCacheKey(params);
    const cacheFresh = !options.force
        && state.normalSearchLastKey === cacheKey
        && state.normalSearchLastLoadedAt
        && Date.now() - state.normalSearchLastLoadedAt < NORMAL_SEARCH_REFRESH_MS
        && state.listMode === 'results';
    if (cacheFresh) {
        renderCachedNormalSearch();
        if (options.startup) setStartupInteractionLock(false);
        return;
    }
    const storedCache = options.startup ? loadNormalSearchCache(cacheKey) : null;
    if (storedCache) {
        renderStoredNormalSearchCache(storedCache);
        refreshNormalSearchInBackground().catch(() => null);
        setStartupInteractionLock(false);
        return;
    }

    const keepVisibleStations = !options.startup
        && state.listMode === 'results'
        && Array.isArray(state.stations)
        && state.stations.length > 0;
    const requestId = state.stationRequestId + 1;
    state.stationRequestId = requestId;
    setStatus('Laedt');
    els.resultCount.textContent = 'Suche läuft';
    els.resultMeta.textContent = '';
    els.results.innerHTML = '<div class="empty-state">Tankstellen werden geladen ...</div>';
    if (keepVisibleStations) {
        renderResults();
        els.resultMeta.textContent = 'Aktualisierung laeuft ...';
    }

    try {
        const data = await fetchJsonWithRetry(`/api/search.php?${params.toString()}`, { timeoutMs: options.startup ? STARTUP_SEARCH_TIMEOUT_MS : 24000 }, {
            attempts: 2,
            retryTimeoutMs: options.startup ? STARTUP_SEARCH_RETRY_TIMEOUT_MS : 42000,
            delayMs: options.startup ? 900 : 650,
            onRetry: () => {
                if (requestId !== state.stationRequestId) return;
                els.resultCount.textContent = 'Suche läuft';
                els.resultCount.textContent = options.startup ? 'Standort gefunden' : 'Suche laeuft';
                els.resultMeta.textContent = '';
                els.results.innerHTML = options.startup
                    ? '<div class="empty-state">Zweiter Ladeversuch laeuft ...</div>'
                    : '<div class="empty-state">Tankstellen werden erneut abgefragt ...</div>';
            },
        });
        if (requestId !== state.stationRequestId) return;

        state.selectedId = null;
        state.listMode = 'results';
        updateFavoritesButton();
        state.stations = data.stations || [];
        state.normalSearchLastKey = cacheKey;
        state.normalSearchLastLoadedAt = Date.now();
        state.normalSearchLastMeta = { fallback: data.fallback === true || data.stored === true };
        saveNormalSearchCache(cacheKey);
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
        if (options.startup) setStartupInteractionLock(false);
        hideSplashScreen();
    } catch (error) {
        if (requestId !== state.stationRequestId) return;
        if (options.startup) {
            const remainingMs = STARTUP_LOCATION_MESSAGE_MIN_MS - (Date.now() - startedAt);
            if (remainingMs > 0) {
                await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
            }
            finishStartupSearchError(error);
            setStartupInteractionLock(false);
            return;
        }
        if (keepVisibleStations) {
            setStatus('Cache');
            els.resultMeta.textContent = `Aktualisierung nicht erreichbar - ${error.message}`;
            hideSplashScreen();
            return;
        }
        setStatus('Fehler');
        els.resultCount.textContent = 'Keine Daten';
        els.resultMeta.textContent = error.message;
        els.results.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        renderDetail(null);
        hideSplashScreen();
    }
}

async function refreshNormalSearchInBackground() {
    if (!state.selectedLocation) return;
    const params = new URLSearchParams({
        lat: state.selectedLocation.lat,
        lng: state.selectedLocation.lng,
        radius: els.radius.value,
        fuel: els.fuel.value,
        limit: normalSearchLimitValue(),
        open: els.openOnly.checked ? '1' : '0',
        priced: els.pricedOnly.checked ? '1' : '0',
        sort: document.querySelector('.sort-toggle-button.active')?.dataset.sort || 'price',
        q: els.searchInput.value.trim(),
    });
    const cacheKey = normalSearchCacheKey(params);
    els.resultMeta.textContent = 'Gespeicherte Liste wird geprueft ...';
    try {
        const data = await fetchJsonWithRetry(`/api/search.php?${params.toString()}`, { timeoutMs: 24000 }, {
            attempts: 2,
            retryTimeoutMs: 42000,
            onRetry: () => {
                els.resultMeta.textContent = 'Aktualisierung dauert laenger - Liste bleibt sichtbar ...';
            },
        });
        state.stations = data.stations || [];
        state.normalSearchLastKey = cacheKey;
        state.normalSearchLastLoadedAt = Date.now();
        state.normalSearchLastMeta = { fallback: data.fallback === true || data.stored === true };
        saveNormalSearchCache(cacheKey);
        sortStations();
        els.resultCount.textContent = `${state.stations.length} Treffer`;
        els.resultMeta.textContent = data.fallback
            ? `Gespeichert Â· ${fuelShortLabel(els.fuel.value)} Â· ${els.radius.value} km`
            : `${fuelShortLabel(els.fuel.value)} Â· ${els.radius.value} km`;
        renderResults();
        if (state.view === 'map') renderMarkers();
        setStatus(data.fallback ? 'Cache' : 'Live');
    } catch (error) {
        setStatus('Cache');
        els.resultMeta.textContent = `Aktualisierung nicht erreichbar - ${error.message}`;
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
    els.appShell.classList.remove('city-mode', 'directory-mode', 'favorites-mode', 'charging-mode');
    renderDetail(null);
    if (state.view !== 'list') setView('list');
    updateBottomNav();
}

function isElectricMode() {
    return state.vehicleMode === 'electric';
}

function syncEffectiveVehicleMode() {
    const selectedMode = els.vehicleMode?.value === 'electric' ? 'electric' : DEFAULT_VEHICLE_MODE;
    if (selectedMode !== state.vehicleMode) {
        setVehicleMode(selectedMode, { persist: false, silent: true });
    }
}

function prepareChargingSearch(clearLocation = false) {
    if (state.drivingActive) stopDrivingMode(false);
    state.listMode = 'charging';
    state.cityMapMode = 'overview';
    state.selectedCityId = null;
    state.selectedHighway = 'all';
    state.chargingCityContext = null;
    state.chargingFilters = { operator: 'all', connector: 'all', minPower: 'all' };
    state.chargingShowOperators = false;
    if (clearLocation) state.selectedLocation = null;
    setCityMode(false);
    setDirectoryMode(false);
    els.appShell.classList.remove('city-mode', 'directory-mode', 'favorites-mode');
    renderDetail(null);
    if (state.view !== 'list') setView('list');
    updateBottomNav();
}

async function runManualSearch() {
    const startedAt = Date.now();
    beginDataRequest();
    try {
        syncEffectiveVehicleMode();
        const hasSearchText = Boolean(els.searchInput?.value?.trim());
        if (isElectricMode()) {
            prepareChargingSearch(hasSearchText);
            if (!hasSearchText) {
                await useCurrentLocation({ timeoutMs: 12000 });
                return;
            }
            await loadChargingStations(beginNavigation());
            return;
        }
        prepareNormalSearch(hasSearchText);
        if (!hasSearchText) {
            await useCurrentLocation({ timeoutMs: 12000 });
            return;
        }
        await loadStations({ force: true });
    } finally {
        const remainingMs = 360 - (Date.now() - startedAt);
        if (remainingMs > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
        }
        endDataRequest();
    }
}

function runCurrentLocationSearch(options = {}) {
    if (isElectricMode()) {
        prepareChargingSearch(true);
    } else {
        prepareNormalSearch(true);
    }
    setStatus('Laedt');
    els.resultCount.textContent = 'Standort wird ermittelt';
    els.resultMeta.textContent = '';
    els.results.innerHTML = '<div class="empty-state">Standort wird abgefragt ...</div>';
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

function updateSectionHeaderTone() {
    const isDriving = state.listMode === 'driving';
    const isRural = isDriving && state.drivingContext === 'rural';
    const isElectricDrive = isDriving && state.drivingVehicleMode === 'electric';
    const isElectricCity = state.listMode === 'cities' && state.vehicleMode === 'electric';
    const isElectricFavorites = state.listMode === 'favorites' && state.vehicleMode === 'electric';
    const isElectricResults = state.listMode === 'results' && state.vehicleMode === 'electric';
    const isAutobahn = state.listMode === 'autobahn' || (isDriving && state.drivingContext === 'highway' && !isElectricDrive);
    const isCity = (state.listMode === 'cities' && !isElectricCity) || (isDriving && state.drivingContext === 'city' && !isElectricDrive);
    const isCharging = state.listMode === 'charging' || isElectricDrive || isElectricCity || isElectricFavorites || isElectricResults;
    els.appShell.classList.toggle('section-tone-autobahn', isAutobahn);
    els.appShell.classList.toggle('section-tone-city', isCity && !isAutobahn);
    els.appShell.classList.toggle('section-tone-rural', isRural);
    els.appShell.classList.toggle('section-tone-charging', isCharging);
}

function syncHeaderVehicleMode() {
    const isElectric = state.vehicleMode === 'electric';
    const eyebrow = document.querySelector('.brand-title .eyebrow');
    if (eyebrow) eyebrow.textContent = isElectric ? 'Live Ladepreise' : 'Live Tankpreise';
    if (els.brandLogo) {
        const logoName = isElectric ? 'tankprofi-electric-icon.svg' : 'tankprofi-home-icon.png';
        els.brandLogo.src = `assets/img/${logoName}?v=${appVersion}`;
        els.brandLogo.alt = isElectric ? 'Elektro oder Verbrenner waehlen' : 'Antriebsart waehlen';
        els.brandLogo.title = 'Verbrenner oder Elektro waehlen';
    }
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
    if (isElectricMode()) {
        await loadChargingCityRankings(requestId);
        return;
    }
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

async function loadChargingCityRankings(requestId = state.navRequestId) {
    if (!isCurrentNavigation(requestId, 'cities')) return;
    setCityMode(true);
    setStatus('Laden');
    const loadKey = 'charging-cities:20:city';
    if (state.chargingCityLoadKey === loadKey) return;
    state.chargingCityLoadKey = loadKey;
    els.resultCount.textContent = 'Ladeanlagen Staedte';
    els.resultMeta.textContent = 'Top-20-Städte werden geladen ...';
    els.results.innerHTML = '<div class="empty-state">Ladeanlagen der groessten Staedte werden gezaehlt.</div>';
    try {
        const data = await fetchJson('/api/charging/cities.php?limit=20', { timeoutMs: 45000 });
        if (!isCurrentNavigation(requestId, 'cities')) return;
        state.chargingCityRankings = data.rankings || [];
        setStatus('Elektro');
        renderChargingCityRankings(data);
    } catch (error) {
        if (!isCurrentNavigation(requestId, 'cities')) return;
        setStatus('Fehler');
        els.resultCount.textContent = 'Keine Daten';
        els.resultMeta.textContent = error.message || 'Ladeanlagen-Staedte konnten nicht geladen werden.';
        els.results.innerHTML = '<div class="empty-state">Ladeanlagenliste der Staedte konnte nicht geladen werden.</div>';
    } finally {
        if (state.chargingCityLoadKey === loadKey) state.chargingCityLoadKey = null;
    }
}

function chargingCityRowHtml(city, rank) {
    return `
        <button class="city-row charging-city-row" type="button" data-charging-city-id="${escapeHtml(city.cityId)}" role="row">
            <span class="rank ${rank <= 3 ? 'cheap' : 'mid'}">${rank}</span>
            <strong>${escapeHtml(city.cityName)}</strong>
            <span class="city-data" data-label="Ladeanlagen">${Number(city.stationCount || 0).toLocaleString('de-DE')}</span>
            <span class="city-data city-price-cell price-rank-green-light" data-label="Ladepunkte">${Number(city.chargingPointCount || 0).toLocaleString('de-DE')}</span>
            <span class="city-data" data-label="Schnell">${Number(city.fastChargingCount || 0).toLocaleString('de-DE')}</span>
            <span class="city-data" data-label="Betreiber">${Number(city.operatorCount || 0).toLocaleString('de-DE')}</span>
            <span class="city-data" data-label="Max">${Number(city.maxPowerKw || 0).toLocaleString('de-DE', { maximumFractionDigits: 0 })} kW</span>
            <span class="city-data" data-label="Gebiet">Stadt</span>
            <span class="city-data" data-label="Land">${escapeHtml(city.state || '-')}</span>
        </button>
    `;
}

function renderChargingCityRankings(data = null) {
    setCityMode(true);
    updateSectionHeaderTone();
    const rankings = [...state.chargingCityRankings]
        .sort((a, b) => Number(b.chargingPointCount || 0) - Number(a.chargingPointCount || 0)
            || Number(b.stationCount || 0) - Number(a.stationCount || 0)
            || String(a.cityName).localeCompare(String(b.cityName), 'de'));
    if (!rankings.length) {
        els.resultCount.textContent = 'Ladeanlagen Staedte';
        els.resultMeta.textContent = 'Noch keine Ladeanlagendaten geladen.';
        els.results.innerHTML = '<div class="empty-state">Die Ladeanlagenliste wird geladen, sobald du Staedte im Elektro-Modus oeffnest.</div>';
        return;
    }
    const totals = rankings.reduce((acc, city) => {
        acc.stationCount += Number(city.stationCount || 0);
        acc.chargingPointCount += Number(city.chargingPointCount || 0);
        return acc;
    }, { stationCount: 0, chargingPointCount: 0 });
    els.resultCount.textContent = `${rankings.length} Städte`;
    els.resultMeta.textContent = `${totals.chargingPointCount.toLocaleString('de-DE')} Ladepunkte - ${totals.stationCount.toLocaleString('de-DE')} Ladeanlagen - Stadtgebiet`;
    els.results.innerHTML = `
        <section class="city-dashboard charging-city-dashboard">
            <div class="city-toolbar">
                <strong>Elektro-Ladeanlagen Grossstaedte</strong>
            </div>
            <div class="city-table charging-city-table" role="table" aria-label="Ladeanlagen der groessten Staedte">
                <div class="city-row city-head" role="row">
                    <span>Rang</span><span>Stadt</span><span>Ladeanlagen</span><span>Ladepunkte</span><span>Schnell</span><span>Betreiber</span><span>Max</span><span>Gebiet</span><span>Land</span>
                </div>
                ${rankings.map((city, index) => chargingCityRowHtml(city, index + 1)).join('')}
            </div>
        </section>
    `;
    els.results.querySelectorAll('[data-charging-city-id]').forEach((button) => {
        button.addEventListener('click', () => {
            const city = rankings.find((item) => item.cityId === button.dataset.chargingCityId);
            if (!city) return;
            state.selectedLocation = {
                label: city.cityName,
                lat: Number(city.centerLat),
                lng: Number(city.centerLng),
            };
            state.chargingCityContext = {
                cityId: city.cityId,
                cityName: city.cityName,
            };
            state.chargingFilters = { operator: 'all', connector: 'all', minPower: 'all' };
            state.chargingLoadKey = null;
            els.searchInput.value = city.cityName;
            state.listMode = 'charging';
            state.cityMapMode = 'overview';
            loadChargingStations(beginNavigation());
        });
    });
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
    if (station.is_open === false || !isValidPriceValue(station.price)) return 'muted';
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
            const station = state.listMode === 'driving'
                ? null
                : state.stations.find((item) => item.tankerkoenig_id === state.selectedId);
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
    if (target === 'list') {
        renderCityStationList();
    } else {
        state.cityMapMode = 'stations';
        setView('map');
        renderMarkers();
    }
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

function pointAtBearing(start, bearing, distanceKm) {
    const lat = Number(start?.lat);
    const lng = Number(start?.lng);
    const brng = Number(bearing) * Math.PI / 180;
    const distance = Number(distanceKm) / 6371;
    if (![lat, lng, brng, distance].every(Number.isFinite)) return null;
    const lat1 = lat * Math.PI / 180;
    const lng1 = lng * Math.PI / 180;
    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distance)
        + Math.cos(lat1) * Math.sin(distance) * Math.cos(brng)
    );
    const lng2 = lng1 + Math.atan2(
        Math.sin(brng) * Math.sin(distance) * Math.cos(lat1),
        Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
    );
    return {
        lat: lat2 * 180 / Math.PI,
        lng: ((lng2 * 180 / Math.PI + 540) % 360) - 180,
    };
}

function angularDifference(a, b) {
    const diff = Math.abs(Number(a) - Number(b)) % 360;
    return diff > 180 ? 360 - diff : diff;
}

function currentCompassBearing() {
    return Date.now() - Number(state.drivingCompassHeadingAt || 0) <= DRIVE_COMPASS_REFRESH_MS
        && Number.isFinite(state.drivingCompassHeading)
        ? state.drivingCompassHeading
        : null;
}

function isDrivingRestMode(samples = state.drivingSamples) {
    const usable = samples
        .filter((sample) => Number.isFinite(sample.lat) && Number.isFinite(sample.lng))
        .slice(-3);
    const last = usable.at(-1);
    if (!last) return true;
    if (Number.isFinite(last.speedKmh)) return last.speedKmh < 5;
    if (usable.length < 2) return true;
    const first = usable[0];
    const distance = routeDistanceKm(first.lat, first.lng, last.lat, last.lng);
    return !Number.isFinite(distance) || distance < 0.02;
}

function estimateDrivingSpeedKmh(samples = state.drivingSamples) {
    const usable = samples
        .filter((sample) => Number.isFinite(sample.lat) && Number.isFinite(sample.lng) && Number.isFinite(sample.timestamp))
        .slice(-6);
    const last = usable.at(-1);
    if (!last) return null;
    if (Number(last.accuracy) > 100) return Number.isFinite(state.drivingSpeedKmh) ? state.drivingSpeedKmh : 0;
    if (Number.isFinite(last.speedKmh) && last.speedKmh < 2) return 0;

    const recent = usable.filter((sample) => last.timestamp - sample.timestamp <= 15000);
    const movedKm = recent.length >= 2
        ? routeDistanceKm(recent[0].lat, recent[0].lng, last.lat, last.lng)
        : 0;
    const movedMs = recent.length >= 2 ? last.timestamp - recent[0].timestamp : 0;
    const isResting = !Number.isFinite(movedKm) || (movedMs >= 4500 && movedKm < 0.018 && Number(last.speedKmh || 0) < 4);
    if (isResting) return 0;

    const candidates = [];
    recent.forEach((sample) => {
        if (Number.isFinite(sample.speedKmh) && sample.speedKmh >= 0 && Number(sample.accuracy) <= 80) {
            candidates.push(Math.max(0, sample.speedKmh));
        }
    });
    for (let index = 1; index < recent.length; index += 1) {
        const previous = recent[index - 1];
        const current = recent[index];
        const elapsedHours = Math.max(0, (current.timestamp - previous.timestamp) / 3600000);
        const segmentKm = routeDistanceKm(previous.lat, previous.lng, current.lat, current.lng);
        if (!Number.isFinite(segmentKm) || elapsedHours <= 0 || Number(current.accuracy) > 80) continue;
        const segmentSpeed = segmentKm / elapsedHours;
        if (segmentKm >= 0.008 && segmentSpeed >= 0 && segmentSpeed <= 180) candidates.push(segmentSpeed);
    }
    if (!candidates.length) return 0;
    candidates.sort((a, b) => a - b);
    const median = candidates[Math.floor(candidates.length / 2)];
    const previousSpeed = Number(state.drivingSpeedKmh);
    if (!Number.isFinite(previousSpeed)) return Math.max(0, median);
    if (median < 3) return 0;
    return Math.max(0, (previousSpeed * 0.6) + (median * 0.4));
}

function visualDrivingBearing(samples = state.drivingSamples) {
    const compassBearing = currentCompassBearing();
    if (Number.isFinite(compassBearing)) return compassBearing;
    const motionBearing = detectDrivingBearing(samples);
    if (!isDrivingRestMode(samples)) return motionBearing;
    return motionBearing;
}

function detectDrivingBearing(samples = state.drivingSamples) {
    const usable = samples
        .filter((sample) => Number.isFinite(sample.lat) && Number.isFinite(sample.lng))
        .slice(-5);
    const last = usable.at(-1);
    if (last && Number.isFinite(last.heading) && last.heading >= 0 && last.heading <= 360 && Number(last.speedKmh || 0) >= 8) {
        state.drivingLastBearing = last.heading;
        state.drivingLastBearingAt = Date.now();
        return last.heading;
    }
    if (usable.length < 2) {
        return Date.now() - Number(state.drivingLastBearingAt || 0) <= DRIVE_BEARING_MEMORY_MS
            ? state.drivingLastBearing
            : null;
    }
    const first = usable[0];
    const distance = routeDistanceKm(first.lat, first.lng, last.lat, last.lng);
    const elapsedHours = Math.max(0, (last.timestamp - first.timestamp) / 3600000);
    const calculatedSpeed = elapsedHours > 0 ? distance / elapsedHours : 0;
    const speedKmh = Number.isFinite(last.speedKmh) && last.speedKmh > 0 ? last.speedKmh : calculatedSpeed;
    state.drivingAccuracy = last.accuracy;
    const hasRecentBearing = Date.now() - Number(state.drivingLastBearingAt || 0) <= DRIVE_BEARING_MEMORY_MS;
    if (speedKmh < 10 || Number(last.accuracy) > 100 || distance < 0.03) {
        return hasRecentBearing ? state.drivingLastBearing : null;
    }
    const bearing = calculateBearing(first, last);
    if (Number.isFinite(bearing)) {
        state.drivingLastBearing = bearing;
        state.drivingLastBearingAt = Date.now();
    }
    return bearing;
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
    state.drivingAccuracy = last.accuracy;
    if (speedKmh < 20 || Number(last.accuracy) > 100 || distance < 0.08) {
        return null;
    }

    const bearing = detectDrivingBearing(samples);
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

function routePointKey(point) {
    return String(point.id || point.tankerkoenig_id || point.stationId || `${point.lat}:${point.lng}`);
}

function drivingPointId(point) {
    return routePointKey(point);
}

function normalizeNameKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/autohof|tankstelle|totalenergies|total|shell|aral|esso|jet|avia|bft|mbh|mhb|leo/g, '')
        .replace(/autobahnraststaette|autobahnraststatte|raststaette|raststatte|rasthof|sued|nord|ost|west/g, '')
        .replace(/[^a-z0-9]+/g, '');
}

function normalizeBrandKey(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/totalenergies/g, 'total')
        .replace(/[^a-z0-9]+/g, '');
}

function normalizedNameTokens(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4)
        .filter((token) => !['tankstelle', 'autohof', 'autobahn', 'raststaette', 'raststatte', 'totalenergies'].includes(token));
}

function routeTankpointDedupKey(point) {
    const priceId = tankerkoenigIdFromStation(point);
    if (priceId) return `price:${priceId}`;
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    const coord = Number.isFinite(lat) && Number.isFinite(lng)
        ? `${lat.toFixed(3)}:${lng.toFixed(3)}`
        : routePointKey(point);
    return `near:${normalizeNameKey(point.name || point.brand)}:${coord}`;
}

function routeTankpointScore(point) {
    let score = 0;
    if (String(point.source || '').includes('tank')) score += 8;
    if (tankerkoenigIdFromStation(point)) score += 6;
    if (hasAnyFuelPrice(point)) score += 5;
    if (point.brand) score += 2;
    if (point.street || point.address) score += 1;
    return score;
}

function dedupeRouteTankpoints(points) {
    const byKey = new Map();
    points.forEach((point) => {
        const key = routeTankpointDedupKey(point);
        const current = byKey.get(key);
        if (!current || routeTankpointScore(point) > routeTankpointScore(current)) {
            byKey.set(key, point);
        }
    });
    return [...byKey.values()];
}

function routeAxisFor(routeId) {
    const points = routeTankpointsFor(routeId)
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .sort((a, b) => routeSortValue(a) - routeSortValue(b));
    let cumulativeKm = 0;
    const axisByKey = new Map();
    const nodes = points.map((point, index) => {
        if (index > 0) {
            cumulativeKm += routeDistanceKm(points[index - 1].lat, points[index - 1].lng, point.lat, point.lng);
        }
        const explicit = !routeUsesLatFallback(routeId) && Number.isFinite(routeSortValue(point));
        const axisDistanceKm = explicit ? routeSortValue(point) : cumulativeKm;
        const node = { ...point, axisDistanceKm };
        axisByKey.set(routePointKey(point), axisDistanceKm);
        return node;
    });
    return { nodes, axisByKey };
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

function projectPositionToRouteAxis(position, routeId) {
    const axis = routeAxisFor(routeId);
    const points = axis.nodes;
    if (!position || !points.length) return null;
    if (points.length === 1) {
        return {
            routeId,
            distanceKm: routeDistanceKm(position.lat, position.lng, points[0].lat, points[0].lng),
            axisDistanceKm: points[0].axisDistanceKm,
            segmentIndex: 0,
            axis,
        };
    }

    const latScale = 111.32;
    const lngScale = 111.32 * Math.max(0.2, Math.cos((Number(position.lat) * Math.PI) / 180));
    const px = Number(position.lng) * lngScale;
    const py = Number(position.lat) * latScale;
    let best = null;
    for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1];
        const end = points[index];
        const ax = Number(start.lng) * lngScale;
        const ay = Number(start.lat) * latScale;
        const bx = Number(end.lng) * lngScale;
        const by = Number(end.lat) * latScale;
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) continue;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
        const x = ax + t * dx;
        const y = ay + t * dy;
        const distanceKm = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
        const axisDistanceKm = start.axisDistanceKm + t * (end.axisDistanceKm - start.axisDistanceKm);
        if (!best || distanceKm < best.distanceKm) {
            best = {
                routeId,
                distanceKm,
                axisDistanceKm,
                segmentIndex: index - 1,
                segmentBearing: calculateBearing(start, end),
                axis,
            };
        }
    }
    return best;
}

function routeLabel(routeId = state.drivingDetectedRouteId || state.drivingRouteId) {
    return routeId && routeId !== 'ALL' ? routeId : 'A';
}

function drivingRouteTemplate() {
    if (state.drivingRouteTemplateId === 'suggested' && state.drivingRouteSuggestion) {
        return state.drivingRouteSuggestion;
    }
    return DRIVE_ROUTE_TEMPLATES.find((template) => template.id === state.drivingRouteTemplateId) || DRIVE_ROUTE_TEMPLATES[0];
}

function drivingUsesSuggestedRoute() {
    return state.drivingRouteTemplateId === 'suggested' && Boolean(state.drivingRouteSuggestion);
}

function drivingTemplateRouteIds() {
    if (!drivingUsesSuggestedRoute()) return [];
    const routeIds = drivingRouteTemplate().routeIds || ['ALL'];
    return routeIds.includes('ALL') ? [] : routeIds;
}

function drivingTemplateDirection() {
    if (!drivingUsesSuggestedRoute()) return null;
    return drivingRouteTemplate().direction || null;
}

function drivingRouteRequestId(routeId = state.drivingRouteId, ignoreTemplate = false) {
    if (ignoreTemplate || !drivingUsesSuggestedRoute()) return routeId || 'ALL';
    const routeIds = drivingTemplateRouteIds();
    if (routeIds.length === 1) return routeIds[0];
    if (routeIds.length > 1) return 'ALL';
    return routeId || 'ALL';
}

function drivingRouteTemplateOptionsHtml() {
    const templates = state.drivingRouteSuggestion
        ? [state.drivingRouteSuggestion, ...DRIVE_ROUTE_TEMPLATES]
        : DRIVE_ROUTE_TEMPLATES;
    return templates.map((template) => (
        `<option value="${escapeHtml(template.id)}"${template.id === state.drivingRouteTemplateId ? ' selected' : ''}>${escapeHtml(template.label)}</option>`
    )).join('');
}

function availableDrivingRouteIds() {
    return [...new Set(state.drivingRouteTankpoints
        .map((point) => String(point.routeId || point.autobahn || '').toUpperCase())
        .filter((value) => /^A\d+$/.test(value)))]
        .sort((a, b) => highwaySortValue(a).localeCompare(highwaySortValue(b), 'de'));
}

function nearestDrivingRouteProjection(position) {
    if (!position) return null;
    return availableDrivingRouteIds()
        .map((routeId) => projectPositionToRouteAxis(position, routeId))
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm)[0] || null;
}

function routeDistanceToLineKm(point, start, end) {
    if (!point || !start || !end) return Number.POSITIVE_INFINITY;
    return distanceToSegmentKm(point, start, end);
}

function drivingRouteCorridorIds(start, destination, startProjection, destinationProjection) {
    const required = [startProjection?.routeId, destinationProjection?.routeId].filter(Boolean);
    const routeScores = availableDrivingRouteIds().map((routeId) => {
        const points = routeTankpointsFor(routeId);
        const bestDistance = Math.min(...points.map((point) => routeDistanceToLineKm(point, start, destination)));
        return { routeId, bestDistance };
    }).filter((item) => Number.isFinite(item.bestDistance));
    const corridor = routeScores
        .filter((item) => item.bestDistance <= 18 || required.includes(item.routeId))
        .sort((a, b) => a.bestDistance - b.bestDistance)
        .slice(0, 4)
        .map((item) => item.routeId);
    return [...new Set([...required, ...corridor])];
}

function drivingRouteGeometryRouteIds(required = []) {
    if (!Array.isArray(state.drivingRouteGeometry) || state.drivingRouteGeometry.length < 2) return [];
    return availableDrivingRouteIds()
        .map((routeId) => {
            const projected = routeTankpointsFor(routeId)
                .map((point) => projectPointToRouteGeometry(point))
                .filter((projection) => projection && Number.isFinite(projection.distanceKm) && Number.isFinite(projection.routeKm))
                .sort((a, b) => a.distanceKm - b.distanceKm);
            const nearCount = projected.filter((projection) => projection.distanceKm <= 25).length;
            const best = projected[0];
            return {
                routeId,
                nearCount,
                bestDistance: best?.distanceKm ?? Number.POSITIVE_INFINITY,
                firstRouteKm: projected.find((projection) => projection.distanceKm <= 25)?.routeKm ?? Number.POSITIVE_INFINITY,
            };
        })
        .filter((item) => item.nearCount > 0 || required.includes(item.routeId))
        .sort((a, b) => (
            b.nearCount - a.nearCount
            || a.firstRouteKm - b.firstRouteKm
            || a.bestDistance - b.bestDistance
        ))
        .slice(0, 5)
        .map((item) => item.routeId);
}

function drivingDestinationFormHtml() {
    const value = state.drivingDestinationQuery || '';
    const destinationLabel = state.drivingDestination?.label || '';
    const suggestion = state.drivingRouteSuggestion;
    const visibleTarget = value || (destinationLabel ? destinationLabel.split(',')[0] : '');
    const routeText = [visibleTarget, suggestion?.label].filter(Boolean).join(' - ');
    const hasDestination = Boolean(state.drivingDestination && (state.drivingRouteGeometry.length || state.drivingRouteSuggestion));
    const modeText = state.drivingContext === 'city'
        ? 'Stadtmodus'
        : state.drivingContext === 'rural'
            ? 'Landmodus'
            : state.drivingDestination
                ? 'Autobahnmodus mit Ziel'
                : 'Autobahnmodus ohne Ziel';
    if (!state.drivingDestinationOpen) {
        return `
            <form class="driving-destination-form driving-destination-form-compact" data-driving-destination-form>
                <label>
                    <span>Ziel</span>
                    <input name="destination" type="search" value="${escapeHtml(visibleTarget)}" placeholder="Ziel eingeben" autocomplete="street-address">
                </label>
                <button class="driving-destination-action" type="button" data-driving-destination-action="ok" aria-label="Ziel bestaetigen">OK</button>
                <small>${escapeHtml(suggestion
                    ? `${suggestion.label}${destinationLabel ? ` - Ziel: ${destinationLabel}` : ''}`
                    : modeText)}</small>
            </form>
        `;
    }
    const actionLabel = state.drivingDestinationEdited
        ? 'OK'
        : (hasDestination ? 'Karte' : 'X');
    const actionAttr = state.drivingDestinationEdited
        ? 'ok'
        : (hasDestination ? 'map' : 'close');
    return `
        <form class="driving-destination-form" data-driving-destination-form>
            <label>
                <span>Ziel</span>
                <input name="destination" type="search" value="${escapeHtml(value)}" placeholder="Adresse" autocomplete="street-address">
            </label>
            <button class="driving-destination-action" type="button" data-driving-destination-action="${actionAttr}" aria-label="Zielaktion">${escapeHtml(actionLabel)}</button>
            <small>${escapeHtml(suggestion
                ? `${suggestion.label}${destinationLabel ? ` - Ziel: ${destinationLabel}` : ''}`
                : 'Adresse eingeben und Enter druecken.')}</small>
        </form>
    `;
}

function openDrivingDestinationMap() {
    state.drivingDestinationOpen = false;
    state.drivingDestinationEdited = false;
    state.drivingDestinationConfirmedOpen = false;
    state.drivingRouteInfoVisible = false;
    setView('map');
    window.requestAnimationFrame(() => {
        refreshMapLayout();
        updateDrivingModeMapMarkers();
    });
}

function drivingRouteGeometryDistanceKm(start, destination) {
    const points = Array.isArray(state.drivingRouteGeometry) ? state.drivingRouteGeometry : [];
    if (points.length > 1) {
        return points.slice(1).reduce((sum, point, index) => {
            const previous = points[index];
            return sum + routeDistanceKm(previous?.[0], previous?.[1], point?.[0], point?.[1]);
        }, 0);
    }
    return routeDistanceKm(start?.lat, start?.lng, destination?.lat, destination?.lng);
}

function showDrivingRouteInfoOverlay(start, destination, routePreviewStations = []) {
    const distanceKm = drivingRouteGeometryDistanceKm(start, destination);
    const routeLabelText = state.drivingRouteSuggestion?.label || 'Route zum Ziel';
    const destinationLabel = destination?.label || state.drivingDestinationQuery || 'Ziel';
    state.drivingRouteInfo = {
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
        tankpointCount: Array.isArray(routePreviewStations) ? routePreviewStations.length : 0,
        routeLabel: routeLabelText,
        destinationLabel,
    };
    state.drivingRouteInfoVisible = true;
}

function drivingRouteInfoOverlayHtml() {
    if (!state.drivingRouteInfoVisible || !state.drivingRouteInfo) return '';
    const info = state.drivingRouteInfo;
    const distance = Number.isFinite(info.distanceKm)
        ? `${Math.round(info.distanceKm).toLocaleString('de-DE')} km`
        : '-';
    const count = Number(info.tankpointCount || 0);
    const pointLabel = state.drivingVehicleMode === 'electric' ? 'Ladeanlagen an der Route' : 'Tankpunkte an der Route';
    return `
        <div class="driving-route-info-layer" data-driving-route-info-dismiss>
            <section class="driving-route-info-card" role="dialog" aria-modal="true" aria-label="Routenplanung">
                <button class="driving-route-info-close" type="button" data-driving-route-info-dismiss aria-label="Routeninfo schliessen">×</button>
                <span>Route geplant</span>
                <strong>${escapeHtml(info.destinationLabel)}</strong>
                <div class="driving-route-info-grid">
                    <div>
                        <small>Entfernung zum Ziel</small>
                        <b>${escapeHtml(distance)}</b>
                    </div>
                    <div>
                        <small>${escapeHtml(pointLabel)}</small>
                        <b>${count.toLocaleString('de-DE')}</b>
                    </div>
                </div>
                <p>${escapeHtml(info.routeLabel)}</p>
                <button class="driving-route-info-ok" type="button" data-driving-route-info-dismiss>OK</button>
            </section>
        </div>
    `;
}

function drivingViewToggleHtml() {
    return `
        <div class="driving-view-toggle" aria-label="Drive Ansicht">
            <button type="button" class="active" data-driving-view="list">Liste</button>
            <button type="button" data-driving-view="map">Karte</button>
        </div>
    `;
}

async function applyDrivingDestination(query, options = {}) {
    const destinationQuery = String(query || '').trim();
    if (destinationQuery.length < 3) throw new Error('Bitte ein Ziel mit mindestens 3 Zeichen eingeben.');
    const start = state.drivingSamples.at(-1) || state.selectedLocation;
    if (!start || !Number.isFinite(Number(start.lat)) || !Number.isFinite(Number(start.lng))) {
        throw new Error('Startposition noch nicht verfuegbar. Bitte Standortfreigabe abwarten.');
    }
    state.drivingDestinationQuery = destinationQuery;
    state.drivingDestinationOpen = options.keepOpen === true;
    state.drivingDestinationEdited = false;
    state.drivingDestinationConfirmedOpen = false;
    resetDrivingRoutePreviewCache();
    state.drivingMessage = 'Ziel wird gesucht';
    renderDrivingModeList();
    const [destination] = await geocode(destinationQuery);
    if (!destination) throw new Error('Zieladresse nicht gefunden.');

    state.drivingDestination = destination;
    state.drivingRouteGeometry = await loadDrivingRouteGeometry(start, destination);
    resetElectricRoutePreviewCache();
    if (state.drivingVehicleMode === 'electric' || state.vehicleMode === 'electric') {
        state.drivingRouteSuggestion = {
            id: 'electric-route',
            label: 'Ladeanlagen entlang der Route',
            routeIds: [],
            direction: null,
        };
        state.drivingRouteTemplateId = 'suggested';
        state.drivingContext = 'charging';
        state.drivingMessage = 'Ladeanlagen entlang der Route werden gesucht';
        const routeChargingStations = await electricRouteChargingStationsForDriving(start, Number(els.limit?.value || 50));
        showDrivingRouteInfoOverlay(start, destination, routeChargingStations);
        await updateDrivingMode({ force: true });
        if (options.keepOpen === true) {
            state.drivingDestinationOpen = true;
            state.drivingDestinationEdited = false;
            state.drivingDestinationConfirmedOpen = true;
            renderDrivingModeList();
        }
        return;
    }
    const previousTemplateId = state.drivingRouteTemplateId;
    const previousSuggestion = state.drivingRouteSuggestion;
    try {
        state.drivingRouteTemplateId = DRIVE_ROUTE_TEMPLATES[0].id;
        state.drivingRouteSuggestion = null;
        state.drivingRouteLoadKey = null;
        await loadRouteTankpoints('ALL', { ignoreTemplate: true });
    } finally {
        state.drivingRouteTemplateId = previousTemplateId;
        state.drivingRouteSuggestion = previousSuggestion;
    }
    const startProjection = nearestDrivingRouteProjection(start);
    const destinationProjection = nearestDrivingRouteProjection(destination);
    if (!startProjection || !destinationProjection) throw new Error('Keine passende Autobahnachse fuer diese Strecke gefunden.');

    const primaryRouteId = destinationProjection.routeId || startProjection.routeId;
    const corridorRouteIds = drivingRouteCorridorIds(start, destination, startProjection, destinationProjection);
    const geometryRouteIds = drivingRouteGeometryRouteIds(corridorRouteIds);
    const routeIds = [...new Set([...(geometryRouteIds.length ? geometryRouteIds : corridorRouteIds), primaryRouteId].filter(Boolean))];
    const routeId = routeIds[0] || primaryRouteId;
    const startOnDestinationRoute = projectPositionToRouteAxis(start, routeId);
    const canEstimateDirection = startOnDestinationRoute
        && Number.isFinite(startOnDestinationRoute.axisDistanceKm)
        && Number.isFinite(destinationProjection.axisDistanceKm);
    const direction = canEstimateDirection
        ? (destinationProjection.axisDistanceKm >= startOnDestinationRoute.axisDistanceKm ? 'Muenchen' : 'Berlin')
        : null;
    state.drivingRouteSuggestion = {
        id: 'suggested',
        label: `${routeIds.slice(0, 3).join(' / ')} zum Ziel`,
        routeIds,
        direction,
    };
    state.drivingRouteTemplateId = 'suggested';
    state.drivingRouteId = routeIds.length === 1 ? routeIds[0] : 'ALL';
    state.drivingDetectedRouteId = null;
    state.drivingStableDirection = direction;
    state.drivingRouteProjection = null;
    state.drivingRouteStartAxisKm = Number.isFinite(startOnDestinationRoute?.axisDistanceKm) ? startOnDestinationRoute.axisDistanceKm : null;
    state.drivingRouteDestinationAxisKm = Number.isFinite(destinationProjection?.axisDistanceKm) ? destinationProjection.axisDistanceKm : null;
    state.drivingRouteStartAccessKm = Number.isFinite(startOnDestinationRoute?.distanceKm) ? startOnDestinationRoute.distanceKm : 0;
    state.drivingRouteLoadedAt = null;
    state.drivingRouteLoadKey = null;
    state.drivingMessage = `Vorschlag aktiv: ${state.drivingRouteSuggestion.label}`;
    await loadRouteTankpoints(state.drivingRouteId);
    const routePreviewStations = buildDrivingRoutePreviewCache(start, DRIVE_ROUTE_DESTINATION_PREVIEW_LIMIT);
    showDrivingRouteInfoOverlay(start, destination, routePreviewStations);
    await updateDrivingMode({ force: true });
    if (options.keepOpen === true) {
        state.drivingDestinationOpen = true;
        state.drivingDestinationEdited = false;
        state.drivingDestinationConfirmedOpen = true;
        renderDrivingModeList();
    }
}

function isConfirmedDestinationHighwayRoute(route) {
    if (!state.drivingDestination || !route?.onRoute || !route.routeId || !route.projection) return false;
    if (!Number.isFinite(route.distanceKm) || route.distanceKm > DRIVE_ROUTE_STABLE_MAX_KM) return false;
    const speed = Number(state.drivingSpeedKmh);
    if (Number.isFinite(speed) && speed < 15 && route.distanceKm <= 0.4) return true;
    const bearing = detectDrivingBearing();
    const segmentBearing = Number(route.projection.segmentBearing);
    if (!Number.isFinite(bearing) || !Number.isFinite(segmentBearing)) return route.distanceKm <= 0.35;
    const parallelDelta = angularDifference(bearing, segmentBearing);
    return parallelDelta <= 35 || parallelDelta >= 145;
}

async function reevaluateDrivingDestinationFromHighway(position, route) {
    if (!state.drivingDestination || !route?.routeId || state.drivingDestinationReevalInProgress) return false;
    const destinationKey = `${state.drivingDestination.lat?.toFixed?.(3) || state.drivingDestination.label}:${state.drivingDestination.lng?.toFixed?.(3) || ''}`;
    const key = `${route.routeId}:${destinationKey}`;
    if (
        state.drivingDestinationHighwayKey === key
        && state.drivingDestinationHighwayReevaluatedAt
        && Date.now() - state.drivingDestinationHighwayReevaluatedAt < 2 * 60 * 1000
    ) {
        return false;
    }

    state.drivingDestinationReevalInProgress = true;
    try {
        const start = { label: 'Aktuelle Autobahnposition', lat: Number(position.lat), lng: Number(position.lng) };
        state.drivingRouteGeometry = await loadDrivingRouteGeometry(start, state.drivingDestination);
        const previousTemplateId = state.drivingRouteTemplateId;
        const previousSuggestion = state.drivingRouteSuggestion;
        try {
            state.drivingRouteTemplateId = DRIVE_ROUTE_TEMPLATES[0].id;
            state.drivingRouteSuggestion = null;
            state.drivingRouteLoadKey = null;
            await loadRouteTankpoints('ALL', { ignoreTemplate: true });
        } finally {
            state.drivingRouteTemplateId = previousTemplateId;
            state.drivingRouteSuggestion = previousSuggestion;
        }

        const startProjection = projectPositionToRouteAxis(start, route.routeId) || nearestDrivingRouteProjection(start);
        const destinationProjection = nearestDrivingRouteProjection(state.drivingDestination);
        if (!startProjection || !destinationProjection) return false;

        const corridorRouteIds = drivingRouteCorridorIds(start, state.drivingDestination, startProjection, destinationProjection);
        const geometryRouteIds = drivingRouteGeometryRouteIds([route.routeId, ...corridorRouteIds]);
        const routeIds = [...new Set([
            route.routeId,
            ...(geometryRouteIds.length ? geometryRouteIds : corridorRouteIds),
            destinationProjection.routeId,
        ].filter(Boolean))];
        const primaryRouteId = routeIds[0] || route.routeId;
        const startOnDestinationRoute = projectPositionToRouteAxis(start, primaryRouteId) || startProjection;
        const direction = Number.isFinite(startOnDestinationRoute?.axisDistanceKm)
            && Number.isFinite(destinationProjection?.axisDistanceKm)
            ? (destinationProjection.axisDistanceKm >= startOnDestinationRoute.axisDistanceKm ? 'Muenchen' : 'Berlin')
            : state.drivingStableDirection;

        state.drivingRouteSuggestion = {
            id: 'suggested',
            label: `${routeIds.slice(0, 3).join(' / ')} zum Ziel`,
            routeIds,
            direction,
        };
        state.drivingRouteTemplateId = 'suggested';
        state.drivingRouteId = routeIds.length === 1 ? routeIds[0] : 'ALL';
        state.drivingDetectedRouteId = route.routeId;
        state.drivingStableDirection = direction;
        state.drivingRouteProjection = startOnDestinationRoute;
        state.drivingRouteStartAxisKm = Number.isFinite(startOnDestinationRoute?.axisDistanceKm) ? startOnDestinationRoute.axisDistanceKm : null;
        state.drivingRouteDestinationAxisKm = Number.isFinite(destinationProjection?.axisDistanceKm) ? destinationProjection.axisDistanceKm : null;
        state.drivingRouteStartAccessKm = Number.isFinite(startOnDestinationRoute?.distanceKm) ? startOnDestinationRoute.distanceKm : 0;
        state.drivingRouteLoadedAt = null;
        state.drivingRouteLoadKey = null;
        state.drivingDestinationHighwayKey = key;
        state.drivingDestinationHighwayReevaluatedAt = Date.now();
        await loadRouteTankpoints(state.drivingRouteId);
        buildDrivingRoutePreviewCache(start, DRIVE_ROUTE_DESTINATION_PREVIEW_LIMIT);
        return true;
    } catch (error) {
        state.drivingMessage = `Zielroute bleibt aktiv - neue Autobahnroute konnte nicht berechnet werden: ${error.message || 'unbekannter Fehler'}`;
        return false;
    } finally {
        state.drivingDestinationReevalInProgress = false;
    }
}

function routeTankpointsFor(routeId) {
    const templateRouteIds = drivingTemplateRouteIds();
    return state.drivingRouteTankpoints.filter((point) => {
        const pointRoute = String(point.routeId || point.autobahn || '').toUpperCase();
        if (routeId === 'ALL' && drivingUsesSuggestedRoute() && templateRouteIds.length) return templateRouteIds.includes(pointRoute);
        return routeId === 'ALL' || pointRoute === routeId;
    });
}

function isDrivingDestinationInputActive() {
    const activeElement = document.activeElement;
    return Boolean(
        state.drivingDestinationOpen
        && (
            state.drivingDestinationEdited
            || activeElement?.matches?.('[data-driving-destination-form] input[name="destination"]')
        )
    );
}

function hasAnyFuelPrice(point) {
    return ['diesel', 'e5', 'e10'].some((fuel) => isValidPriceValue(fuelPriceValue(point, fuel)));
}

function routeHasEnoughDetectionPoints(routeId, minCount = 2) {
    return routeTankpointsFor(routeId)
        .filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)))
        .length >= minCount;
}

function detectCurrentRoute(position, routeId = state.drivingRouteId) {
    if (!position || !state.drivingRouteTankpoints.length) {
        return { onRoute: false, distanceKm: Number.POSITIVE_INFINITY, routeId };
    }
    const routeIds = routeId === 'ALL'
        ? (drivingTemplateRouteIds().length
            ? drivingTemplateRouteIds()
            : [...new Set(state.drivingRouteTankpoints.map((point) => String(point.routeId || point.autobahn || '').toUpperCase()).filter((value) => /^A\d+$/.test(value)))])
        : [routeId];
    let best = { onRoute: false, distanceKm: Number.POSITIVE_INFINITY, routeId, projection: null };

    routeIds.forEach((currentRouteId) => {
        if (!routeHasEnoughDetectionPoints(currentRouteId)) return;
        const projection = projectPositionToRouteAxis(position, currentRouteId);
        const distanceKm = projection?.distanceKm ?? Number.POSITIVE_INFINITY;
        if (distanceKm < best.distanceKm) {
            best = {
                onRoute: distanceKm <= DRIVE_ROUTE_ON_ROUTE_MAX_KM,
                uncertain: distanceKm > DRIVE_ROUTE_STABLE_MAX_KM && distanceKm <= DRIVE_ROUTE_ON_ROUTE_MAX_KM,
                distanceKm,
                routeId: currentRouteId,
                projection,
            };
        }
    });

    state.drivingNearestRouteDistanceKm = best.distanceKm;
    state.drivingDetectedRouteId = best.onRoute ? best.routeId : null;
    state.drivingRouteProjection = best.projection;
    return best;
}

function rememberDrivingHighwayRoute(route) {
    if (!route?.onRoute || !route.routeId || !route.projection) return;
    state.drivingLastHighwayAt = Date.now();
    state.drivingLastHighwayRouteId = route.routeId;
    state.drivingLastHighwayProjection = route.projection;
}

function stabilizedDrivingRoute(route, position) {
    if (route?.onRoute) {
        rememberDrivingHighwayRoute(route);
        return route;
    }
    const lastRouteId = state.drivingLastHighwayRouteId;
    const lastAt = Number(state.drivingLastHighwayAt || 0);
    if (!lastRouteId || !lastAt || Date.now() - lastAt > DRIVE_ROUTE_HOLD_MS) return route;

    const projection = projectPositionToRouteAxis(position, lastRouteId) || state.drivingLastHighwayProjection;
    const distanceKm = projection?.distanceKm ?? Number.POSITIVE_INFINITY;
    if (distanceKm > DRIVE_ROUTE_HOLD_MAX_KM) return route;

    state.drivingDetectedRouteId = lastRouteId;
    state.drivingRouteProjection = projection;
    return {
        ...route,
        onRoute: true,
        uncertain: true,
        held: true,
        distanceKm,
        routeId: lastRouteId,
        projection,
    };
}

function estimateCurrentRoutePosition(position) {
    const projection = state.drivingRouteProjection || projectPositionToRouteAxis(position, state.drivingDetectedRouteId || state.drivingRouteId);
    if (!projection) return null;
    state.drivingRouteProjection = projection;
    state.drivingCurrentRoutePosition = projection.axisDistanceKm;
    return state.drivingCurrentRoutePosition;
}

function routeAxisValueForPoint(point, axis) {
    return axis?.axisByKey?.get(routePointKey(point)) ?? routeSortValue(point);
}

function routePointDistanceAheadKm(point, currentPosition, axis) {
    const value = routeAxisValueForPoint(point, axis);
    if (!Number.isFinite(value) || !Number.isFinite(currentPosition)) return null;
    return Math.abs(value - currentPosition);
}

function projectPointToRouteGeometry(point, geometry = state.drivingRouteGeometry) {
    if (!point || !Array.isArray(geometry) || geometry.length < 2) return null;
    const pointLat = Number(point.lat);
    const pointLng = Number(point.lng);
    if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) return null;
    const latScale = 111.32;
    const lngScale = 111.32 * Math.max(0.2, Math.cos((pointLat * Math.PI) / 180));
    const px = pointLng * lngScale;
    const py = pointLat * latScale;
    let cumulativeKm = 0;
    let best = null;

    for (let index = 1; index < geometry.length; index += 1) {
        const previous = geometry[index - 1];
        const current = geometry[index];
        const start = { lat: Number(previous[0]), lng: Number(previous[1]) };
        const end = { lat: Number(current[0]), lng: Number(current[1]) };
        const segmentKm = routeDistanceKm(start.lat, start.lng, end.lat, end.lng);
        if (!Number.isFinite(segmentKm) || segmentKm <= 0) continue;
        const ax = start.lng * lngScale;
        const ay = start.lat * latScale;
        const bx = end.lng * lngScale;
        const by = end.lat * latScale;
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) {
            cumulativeKm += segmentKm;
            continue;
        }
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
        const x = ax + t * dx;
        const y = ay + t * dy;
        const distanceKm = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
        const routeKm = cumulativeKm + (segmentKm * t);
        if (!best || distanceKm < best.distanceKm) {
            best = { distanceKm, routeKm };
        }
        cumulativeKm += segmentKm;
    }
    return best;
}

function detectDrivingDirectionOnRoute(samples = state.drivingSamples) {
    const usable = samples
        .filter((sample) => Number.isFinite(sample.routeAxisDistanceKm))
        .slice(-5);
    const last = state.drivingSamples.at(-1);
    if (last) {
        const speedKmh = Number.isFinite(last.speedKmh) && last.speedKmh > 0 ? last.speedKmh : state.drivingSpeedKmh;
        state.drivingAccuracy = last.accuracy;
        if (Number(last.accuracy) > 100 || !Number.isFinite(speedKmh) || speedKmh < 20) return state.drivingStableDirection;
    }
    if (usable.length < 2) return state.drivingStableDirection;
    const first = usable[0];
    const current = usable[usable.length - 1];
    const delta = Number(current.routeAxisDistanceKm) - Number(first.routeAxisDistanceKm);
    if (Math.abs(delta) < 0.25) return state.drivingStableDirection;
    state.drivingStableDirection = delta > 0 ? 'Muenchen' : 'Berlin';
    return state.drivingStableDirection;
}

function getNextTankpointsOnRoute({ position, direction, limit = 5 } = {}) {
    if (!position || !direction) return [];
    const currentPosition = estimateCurrentRoutePosition(position);
    if (!Number.isFinite(currentPosition)) return [];
    const activeRouteId = state.drivingDetectedRouteId || state.drivingRouteId;
    const axis = state.drivingRouteProjection?.axis || routeAxisFor(activeRouteId);
    const candidates = routeTankpointsFor(activeRouteId)
        .filter((point) => {
            const pointDirection = normalizeRouteDirection(point.richtung);
            if (pointDirection !== 'beide' && pointDirection !== direction) return false;
            const value = routeAxisValueForPoint(point, axis);
            if (!Number.isFinite(value)) return false;
            return direction === 'Muenchen'
                ? value >= currentPosition - DRIVE_ROUTE_PREVIEW_BEHIND_KM
                : value <= currentPosition + DRIVE_ROUTE_PREVIEW_BEHIND_KM;
        })
        .map((point) => ({
            ...point,
            distance: routePointDistanceAheadKm(point, currentPosition, axis),
            is_open: point.isOpen,
            price: fuelPriceValue(point, els.fuel.value),
            last_update: routePriceStand(point),
        }))
        .filter((point) => Number.isFinite(point.distance))
        .sort((a, b) => (
            direction === 'Muenchen'
                ? routeAxisValueForPoint(a, axis) - routeAxisValueForPoint(b, axis)
                : routeAxisValueForPoint(b, axis) - routeAxisValueForPoint(a, axis)
        ));
    return candidates.slice(0, limit);
}

function getRoutePreviewTankpoints(position, limit = 120) {
    const activeRouteId = state.drivingDestination && state.drivingRouteSuggestion
        ? state.drivingRouteId
        : (state.drivingDetectedRouteId || state.drivingRouteId);
    const hasRouteGeometry = Array.isArray(state.drivingRouteGeometry) && state.drivingRouteGeometry.length >= 2;
    if (hasRouteGeometry) {
        const currentProjection = position ? projectPointToRouteGeometry(position) : null;
        const currentRouteKm = Number.isFinite(currentProjection?.routeKm) ? currentProjection.routeKm : 0;
        const projectedTankpoints = routeTankpointsFor(activeRouteId)
            .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
            .map((point) => {
                const projection = projectPointToRouteGeometry(point);
                if (!projection || !Number.isFinite(projection.routeKm) || projection.routeKm < currentRouteKm - DRIVE_ROUTE_PREVIEW_BEHIND_KM) return null;
                if (projection.distanceKm > DRIVE_ROUTE_PREVIEW_CORRIDOR_KM) return null;
                const routeDistance = Math.max(0, projection.routeKm - currentRouteKm) + projection.distanceKm;
                return {
                    ...point,
                    drivingContext: 'route-preview',
                    distance: routeDistance,
                    routePreviewKm: projection.routeKm,
                    routeDistanceFromGeometryKm: projection.distanceKm,
                    is_open: point.isOpen,
                    price: fuelPriceValue(point, els.fuel.value),
                    last_update: routePriceStand(point),
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.routePreviewKm - b.routePreviewKm)
            .slice(0, limit);
        if (projectedTankpoints.length || (state.drivingDestination && state.drivingRouteSuggestion)) return projectedTankpoints;
        if (!state.drivingDestination || !state.drivingRouteSuggestion) {
            return routeTankpointsFor(activeRouteId)
            .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
            .map((point) => ({
                ...point,
                drivingContext: 'route-preview',
                distance: position ? routeDistanceKm(position.lat, position.lng, point.lat, point.lng) : 0,
                is_open: point.isOpen,
                price: fuelPriceValue(point, els.fuel.value),
                last_update: routePriceStand(point),
            }))
            .filter((point) => Number.isFinite(point.distance))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, Math.min(limit, 20));
        }
    }

    const axis = routeAxisFor(activeRouteId);
    const currentProjection = position ? projectPositionToRouteAxis(position, activeRouteId) : null;
    const currentPosition = Number.isFinite(currentProjection?.axisDistanceKm)
        ? currentProjection.axisDistanceKm
        : (position ? estimateCurrentRoutePosition(position) : null);
    const startAxisKm = Number.isFinite(state.drivingRouteStartAxisKm)
        ? (Number.isFinite(currentPosition) ? currentPosition : state.drivingRouteStartAxisKm)
        : currentPosition;
    const accessDistanceKm = Number.isFinite(currentProjection?.distanceKm)
        ? currentProjection.distanceKm
        : (Number.isFinite(state.drivingRouteStartAccessKm) ? state.drivingRouteStartAccessKm : 0);
    const destinationAxisKm = Number.isFinite(state.drivingRouteDestinationAxisKm)
        ? state.drivingRouteDestinationAxisKm
        : null;
    const hasDestinationSegment = Number.isFinite(startAxisKm) && Number.isFinite(destinationAxisKm);
    const segmentMin = hasDestinationSegment ? Math.min(startAxisKm, destinationAxisKm) : null;
    const segmentMax = hasDestinationSegment ? Math.max(startAxisKm, destinationAxisKm) : null;
    const directionSign = hasDestinationSegment && destinationAxisKm < startAxisKm ? -1 : 1;
    return routeTankpointsFor(activeRouteId)
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .filter((point) => {
            if (!hasDestinationSegment) return true;
            const axisValue = routeAxisValueForPoint(point, axis);
            if (!Number.isFinite(axisValue)) return false;
            return axisValue >= segmentMin - 1 && axisValue <= segmentMax + 1;
        })
        .map((point) => {
            const axisValue = routeAxisValueForPoint(point, axis);
            const routeDistance = Number.isFinite(startAxisKm) && Number.isFinite(axisValue)
                ? accessDistanceKm + Math.abs(axisValue - startAxisKm)
                : (position ? routeDistanceKm(position.lat, position.lng, point.lat, point.lng) : 0);
            return {
                ...point,
                drivingContext: 'route-preview',
                distance: routeDistance,
                is_open: point.isOpen,
                price: fuelPriceValue(point, els.fuel.value),
                last_update: routePriceStand(point),
            };
        })
        .sort((a, b) => {
            const axisA = routeAxisValueForPoint(a, axis);
            const axisB = routeAxisValueForPoint(b, axis);
            return directionSign * (axisA - axisB);
        })
        .slice(0, limit);
}

function drivingRoutePreviewCacheKey() {
    const template = drivingRouteTemplate();
    const routeIds = (template.routeIds || [state.drivingRouteId || 'ALL']).join(',');
    const destination = state.drivingDestination
        ? `${Number(state.drivingDestination.lat).toFixed(4)}:${Number(state.drivingDestination.lng).toFixed(4)}`
        : '';
    const geometryKey = Array.isArray(state.drivingRouteGeometry)
        ? `${state.drivingRouteGeometry.length}:${JSON.stringify(state.drivingRouteGeometry[0] || [])}:${JSON.stringify(state.drivingRouteGeometry.at(-1) || [])}`
        : '';
    return [routeIds, destination, geometryKey].join('|');
}

function resetDrivingRoutePreviewCache() {
    state.drivingRoutePreviewCache = null;
    resetElectricRoutePreviewCache();
}

function updateRoutePreviewDistancesFromPosition(stations, position) {
    if (!position || !Array.isArray(stations)) return stations || [];
    const currentProjection = projectPointToRouteGeometry(position);
    if (!Number.isFinite(currentProjection?.routeKm)) return stations;
    return stations
        .map((station) => {
            const routePreviewKm = Number(station.routePreviewKm);
            if (!Number.isFinite(routePreviewKm)) return station;
            return {
                ...station,
                distance: Math.max(0, routePreviewKm - currentProjection.routeKm)
                    + Math.max(0, Number(station.routeDistanceFromGeometryKm || 0)),
            };
        })
        .sort((a, b) => Number(a.routePreviewKm || a.distance || 0) - Number(b.routePreviewKm || b.distance || 0));
}

function buildDrivingRoutePreviewCache(position, limit = 120) {
    const stations = getRoutePreviewTankpoints(position, limit);
    state.drivingRoutePreviewCache = {
        key: drivingRoutePreviewCacheKey(),
        createdAt: Date.now(),
        stations,
    };
    return stations;
}

function routePreviewStationsForDriving(position, limit = 120) {
    const key = drivingRoutePreviewCacheKey();
    if (!state.drivingRoutePreviewCache || state.drivingRoutePreviewCache.key !== key) {
        return buildDrivingRoutePreviewCache(position, limit);
    }
    const stations = updateRoutePreviewDistancesFromPosition(state.drivingRoutePreviewCache.stations, position)
        .slice(0, limit);
    state.drivingRoutePreviewCache = {
        ...state.drivingRoutePreviewCache,
        stations,
    };
    return stations;
}

function mergeRoutePreviewCachePrices(updatedStations) {
    if (!state.drivingRoutePreviewCache?.stations?.length || !Array.isArray(updatedStations)) return updatedStations;
    const byId = new Map(updatedStations.map((station) => [drivingPointId(station), station]));
    state.drivingRoutePreviewCache = {
        ...state.drivingRoutePreviewCache,
        stations: state.drivingRoutePreviewCache.stations.map((station) => byId.get(drivingPointId(station)) || station),
    };
    return state.drivingRoutePreviewCache.stations;
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
        street: station.street || liveStation.street || liveStation.addressStreet || liveStation.address || '',
        house_number: station.house_number || liveStation.house_number || liveStation.houseNumber || '',
        postcode: station.postcode || liveStation.postcode || liveStation.postCode || liveStation.zip || '',
        city: station.city || liveStation.city || liveStation.place || liveStation.town || '',
        priceMatch: liveStation,
        last_update: liveStation.last_update || station.last_update,
        priceSource: 'live',
    };
}

function bestLiveMatchForDrivingStation(station, liveStations = []) {
    const stationId = tankerkoenigIdFromStation(station);
    const direct = liveStations.find((candidate) => {
        const candidateId = tankerkoenigIdFromStation(candidate);
        return stationId && candidateId && stationId === candidateId;
    });
    if (direct) return direct;

    const stationText = [station.name, station.brand, station.operator].filter(Boolean).join(' ');
    const stationNameKey = normalizeNameKey(stationText);
    const stationBrandKey = normalizeBrandKey(station.brand || station.operator || station.name || '');
    const stationTokens = normalizedNameTokens(stationText);
    return liveStations
        .map((candidate) => {
            const distance = routeDistanceKm(station.lat, station.lng, candidate.lat, candidate.lng);
            const candidateText = [candidate.name, candidate.brand].filter(Boolean).join(' ');
            const candidateNameKey = normalizeNameKey(candidateText);
            const candidateBrandKey = normalizeBrandKey(candidate.brand || candidate.name || '');
            const candidateTokens = normalizedNameTokens(candidateText);
            const sharedTokens = stationTokens.filter((token) => candidateTokens.includes(token)).length;
            const brandMatches = stationBrandKey && candidateBrandKey
                && (stationBrandKey.includes(candidateBrandKey) || candidateBrandKey.includes(stationBrandKey));
            const nameMatches = stationNameKey && candidateNameKey
                && (stationNameKey.includes(candidateNameKey) || candidateNameKey.includes(stationNameKey));
            const score = (brandMatches ? 20 : 0) + (nameMatches ? 14 : 0) + (sharedTokens * 8) - distance;
            return { candidate, distance, score, sharedTokens };
        })
        .filter((item) => Number.isFinite(item.distance) && item.distance <= (item.score >= 12 || item.sharedTokens ? 5 : 0.8))
        .sort((a, b) => b.score - a.score || a.distance - b.distance)[0]?.candidate || null;
}

function canRetryDrivingPrice(station) {
    const key = drivingPointId(station);
    const attemptedAt = state.drivingPriceAttemptAt.get(key);
    return !attemptedAt || Date.now() - attemptedAt >= DRIVE_HIGHWAY_PRICE_RETRY_MS;
}

function rememberDrivingPriceAttempt(stations) {
    const now = Date.now();
    stations.forEach((station) => {
        state.drivingPriceAttemptAt.set(drivingPointId(station), now);
    });
    if (state.drivingPriceAttemptAt.size > 500) {
        [...state.drivingPriceAttemptAt.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(500)
            .forEach(([key]) => state.drivingPriceAttemptAt.delete(key));
    }
}

function buildDrivingPriceClusters(stations) {
    const clusters = [];
    stations.forEach((station) => {
        const lat = Number(station.lat);
        const lng = Number(station.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const cluster = clusters.find((item) => (
            routeDistanceKm(lat, lng, item.lat, item.lng) <= DRIVE_HIGHWAY_LIVE_CLUSTER_RADIUS_KM
        ));
        if (cluster) {
            cluster.stations.push(station);
            cluster.lat = cluster.stations.reduce((sum, item) => sum + Number(item.lat), 0) / cluster.stations.length;
            cluster.lng = cluster.stations.reduce((sum, item) => sum + Number(item.lng), 0) / cluster.stations.length;
        } else {
            clusters.push({ lat, lng, stations: [station] });
        }
    });
    return clusters
        .map((cluster) => {
            const radius = Math.min(8, Math.max(3, Math.max(...cluster.stations
                .map((station) => routeDistanceKm(cluster.lat, cluster.lng, station.lat, station.lng))
                .filter(Number.isFinite), 0) + 1.5));
            return { ...cluster, radius };
        })
        .sort((a, b) => a.stations[0].distance - b.stations[0].distance);
}

function drivingStationRefreshId(station) {
    return tankerkoenigIdFromStation(station);
}

function staleDrivingStations(stations) {
    return stations
        .filter((station) => !hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS))
        .filter(canRetryDrivingPrice);
}

function mergeRefreshedDrivingStation(original, refreshed) {
    if (!refreshed) return original;
    const selectedFuel = els.fuel.value;
    return {
        ...original,
        ...refreshed,
        drivingMode: original.drivingMode,
        drivingContext: original.drivingContext,
        distance: original.distance,
        routeDistanceKm: original.routeDistanceKm,
        routeAxisKm: original.routeAxisKm,
        aheadKm: original.aheadKm,
        stationId: original.stationId || refreshed.stationId || refreshed.tankerkoenig_id,
        priceStationId: original.priceStationId || refreshed.priceStationId || refreshed.tankerkoenigId || refreshed.tankerkoenig_id,
        tankerkoenig_id: original.tankerkoenig_id || refreshed.tankerkoenig_id || refreshed.stationId,
        price: fuelPriceValue(refreshed, selectedFuel),
        last_update: autobahnPriceStand(refreshed) || routePriceStand(refreshed) || refreshed.last_update || original.last_update,
    };
}

async function refreshDrivingStationsByKnownIds(stations) {
    const candidates = staleDrivingStations(stations)
        .filter((station) => drivingStationRefreshId(station))
        .slice(0, DRIVE_HIGHWAY_LIVE_PRICE_LIMIT);
    if (!candidates.length) return { stations, refreshedCount: 0 };

    const refreshedById = new Map();
    for (const [index, station] of candidates.entries()) {
        const stationId = drivingStationRefreshId(station);
        const params = new URLSearchParams({
            stationId,
            prices: '1',
            refresh: '1',
        });
        try {
            const data = await fetchJson(`/api/autobahn/stations.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
            const refreshed = (data.stations || [])
                .map(normalizeAutobahnStation)
                .find((item) => stationSameIdentity(item, station)
                    || item.tankerkoenig_id === stationId
                    || item.tankerkoenigId === stationId
                    || item.stationId === stationId);
            if (refreshed && hasCurrentDrivingPrice(refreshed, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS)) {
                refreshedById.set(drivingPointId(station), mergeRefreshedDrivingStation(station, refreshed));
            }
        } catch (error) {
            state.drivingLivePriceMessage = state.drivingLivePriceMessage || `Gezieltes Nachladen nicht erreichbar - ${error.message || 'unbekannter Fehler'}`;
        }
        rememberDrivingPriceAttempt([station]);
        if (index < candidates.length - 1) {
            await new Promise((resolve) => {
                window.setTimeout(resolve, Math.min(450, DRIVE_HIGHWAY_LIVE_PRICE_DELAY_MS));
            });
        }
    }

    return {
        stations: stations.map((station) => refreshedById.get(drivingPointId(station)) || station),
        refreshedCount: refreshedById.size,
    };
}

async function loadLivePricesForDrivingStations(stations) {
    const targeted = await refreshDrivingStationsByKnownIds(stations);
    const staleStations = staleDrivingStations(targeted.stations)
        .slice(0, DRIVE_HIGHWAY_LIVE_PRICE_LIMIT);
    if (!staleStations.length) {
        if (targeted.refreshedCount) state.drivingLivePriceMessage = `${targeted.refreshedCount} Tankpunkte gezielt aktualisiert`;
        return targeted.stations;
    }
    const refreshedById = new Map();
    let firstErrorMessage = '';
    const clusters = buildDrivingPriceClusters(staleStations).slice(0, DRIVE_HIGHWAY_LIVE_CLUSTER_LIMIT);

    for (const [index, cluster] of clusters.entries()) {
        const params = new URLSearchParams({
            lat: String(cluster.lat),
            lng: String(cluster.lng),
            radius: String(cluster.radius),
            fuel: els.fuel.value,
            limit: String(Math.max(15, cluster.stations.length * 6)),
            open: '0',
            priced: '1',
            live: '1',
            q: 'Fahrmodus Preise',
        });
        try {
            const data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
            cluster.stations.forEach((station) => {
                const match = bestLiveMatchForDrivingStation(station, data.stations || []);
                if (match) refreshedById.set(drivingPointId(station), mergeLiveDrivingPrice(station, match));
            });
            rememberDrivingPriceAttempt(cluster.stations);
        } catch (error) {
            rememberDrivingPriceAttempt(cluster.stations);
            firstErrorMessage = firstErrorMessage || error.message || 'Live-Preise nicht erreichbar';
            break;
        }
        if (index < clusters.length - 1) {
            await new Promise((resolve) => {
                window.setTimeout(resolve, DRIVE_HIGHWAY_LIVE_PRICE_DELAY_MS);
            });
        }
    }

    if (!refreshedById.size && !targeted.refreshedCount && !firstErrorMessage) {
        state.drivingLivePriceMessage = 'Live-Preise abgefragt - keine passende Tankerkoenig-Zuordnung gefunden';
    } else if (targeted.refreshedCount || refreshedById.size) {
        state.drivingLivePriceMessage = `${targeted.refreshedCount + refreshedById.size} Tankpunkte aktualisiert`;
    }

    if (firstErrorMessage) {
        state.drivingLivePriceMessage = firstErrorMessage.includes('Rate')
            ? 'Tankerkoenig Rate-Limit erreicht - gespeicherte Preise werden weiter genutzt'
            : `Live-Preise nicht erreichbar - ${firstErrorMessage}`;
    }

    return targeted.stations.map((station) => refreshedById.get(drivingPointId(station)) || station);
}

function cityDriveStationWithDirection(station, position, drivingBearing) {
    const lat = Number(position?.lat);
    const lng = Number(position?.lng);
    const distance = routeDistanceKm(lat, lng, station.lat, station.lng);
    const stationBearing = calculateBearing(position, station);
    const bearingDelta = Number.isFinite(drivingBearing) && Number.isFinite(stationBearing)
        ? angularDifference(drivingBearing, stationBearing)
        : null;
    const behind = bearingDelta !== null && bearingDelta > 90;
    return {
        ...station,
        distance,
        drivingBearingDelta: bearingDelta,
        behindDrivingDirection: behind,
    };
}

function isLocalDrivingContext(context = state.drivingContext) {
    return context === 'city' || context === 'rural';
}

function localDriveContextFor(stations = []) {
    return stations.length > 0 && stations.length <= DRIVE_RURAL_MAX_TANKPOINTS ? 'rural' : 'city';
}

function applyLocalDriveContext(stations = []) {
    const context = localDriveContextFor(stations);
    state.drivingContext = context;
    return stations.map((station) => ({
        ...station,
        drivingContext: context,
    }));
}

function filterCityDriveStations(stations, position, limit = 10) {
    const drivingBearing = visualDrivingBearing();
    return stations
        .map((station) => cityDriveStationWithDirection(station, position, drivingBearing))
        .filter((station) => (
            Number.isFinite(station.distance)
            && hasDrivingPrice(station)
            && (!station.behindDrivingDirection || station.distance <= CITY_DRIVE_BEHIND_KEEP_KM)
        ))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
}

function filterRuralDriveStations(stations, position, limit = 10) {
    const drivingBearing = visualDrivingBearing();
    return stations
        .map((station) => cityDriveStationWithDirection(station, position, drivingBearing))
        .filter((station) => (
            Number.isFinite(station.distance)
            && station.distance <= 25
            && hasDrivingPrice(station)
            && (!station.behindDrivingDirection || station.distance <= CITY_DRIVE_BEHIND_KEEP_KM)
        ))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
}

function currentDrivingPosition() {
    return state.drivingSamples.at(-1) || state.selectedLocation || null;
}

function drivingTankpointDirectionHtml(station, rank = 0) {
    const position = currentDrivingPosition();
    const drivingBearing = visualDrivingBearing();
    if (!position || !Number.isFinite(drivingBearing)) {
        return '<span class="driving-direction-arrow preview" aria-label="Pfeilvorschau" title="Pfeilvorschau" style="--direction-angle:0deg">↑</span>';
    }
    const stationBearing = calculateBearing(position, station);
    if (!Number.isFinite(stationBearing)) {
        return '<span class="driving-direction-arrow unknown" aria-label="Richtung wird ermittelt" title="Richtung wird ermittelt">•</span>';
    }
    const relative = (stationBearing - drivingBearing + 360) % 360;
    const label = relative <= 25 || relative >= 335
        ? 'Tankpunkt voraus'
        : relative < 155
            ? 'Tankpunkt rechts'
            : relative <= 205
                ? 'Tankpunkt hinter dir'
                : 'Tankpunkt links';
    return `<span class="driving-direction-arrow" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" style="--direction-angle:${relative}deg">↑</span>`;
}

async function loadLiveCityDriveStations(position, limit = 10) {
    const lat = Number(position?.lat);
    const lng = Number(position?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const loadKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${els.fuel.value}`;
    const fresh = state.drivingCityLastLoadKey === loadKey
        && state.drivingCityLastLoadAt
        && Date.now() - state.drivingCityLastLoadAt < CITY_DRIVE_PRICE_REFRESH_MS;
    if (fresh && state.stations.length && state.drivingContext === 'city') {
        return filterCityDriveStations(state.stations, position, limit);
    }
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
    let data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
    let usedStoredFallback = data.fallback === true || data.stored === true;
    if (!(data.stations || []).length) {
        params.delete('live');
        data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
        usedStoredFallback = true;
    }
    state.drivingCityLastLoadAt = Date.now();
    state.drivingCityLastLoadKey = loadKey;
    state.drivingCityLastSource = usedStoredFallback ? 'fallback' : 'live';
    state.drivingCityLastMessage = usedStoredFallback
        ? (data.message || 'Live-Preise nicht erreichbar - gespeicherte Preise koennen abweichen')
        : '';
    const stations = (data.stations || [])
        .map((station) => ({
            ...station,
            drivingContext: 'city',
            drivingMode: true,
            priceSource: usedStoredFallback ? 'fallback' : 'live',
        }));
    return filterCityDriveStations(stations, position, limit);
}

async function loadLiveRuralDriveStations(position, limit = 10) {
    const lat = Number(position?.lat);
    const lng = Number(position?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const loadKey = `${lat.toFixed(2)}:${lng.toFixed(2)}:${els.fuel.value}`;
    const fresh = state.drivingRuralLastLoadKey === loadKey
        && state.drivingRuralLastLoadAt
        && Date.now() - state.drivingRuralLastLoadAt < CITY_DRIVE_PRICE_REFRESH_MS;
    if (fresh && state.stations.length && state.drivingContext === 'rural') {
        return filterRuralDriveStations(state.stations, position, limit);
    }
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: '25',
        fuel: els.fuel.value,
        limit: String(Math.max(100, limit * 12)),
        open: '1',
        priced: '1',
        live: '1',
        sort: 'distance',
        q: 'Fahrmodus Land',
    });
    let data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
    let usedStoredFallback = data.fallback === true || data.stored === true;
    if (!(data.stations || []).length) {
        params.delete('live');
        data = await fetchJson(`/api/search.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
        usedStoredFallback = true;
    }
    state.drivingRuralLastLoadAt = Date.now();
    state.drivingRuralLastLoadKey = loadKey;
    state.drivingRuralLastMessage = usedStoredFallback
        ? (data.message || 'Live-Preise nicht erreichbar - gespeicherte Landpreise koennen abweichen')
        : '';
    const stations = (data.stations || [])
        .map((station) => ({
            ...station,
            drivingContext: 'rural',
            drivingMode: true,
            priceSource: usedStoredFallback ? 'fallback' : 'live',
        }));
    return filterRuralDriveStations(stations, position, limit);
}

async function loadLocalDriveStations(position, limit = 10) {
    const cityStations = await loadLiveCityDriveStations(position, limit);
    if (localDriveContextFor(cityStations) !== 'rural') {
        return applyLocalDriveContext(cityStations);
    }
    const ruralStations = await loadLiveRuralDriveStations(position, limit);
    if (ruralStations.length) {
        state.drivingContext = 'rural';
        return ruralStations.map((station) => ({
            ...station,
            drivingContext: 'rural',
        }));
    }
    return applyLocalDriveContext(cityStations);
}

function normalizeRouteTankpoint(point) {
    const tankerkoenigId = tankerkoenigIdFromStation(point);
    const fallbackId = point.id || point.stationId || point.sourceDocId || `${point.routeId || point.autobahn || 'route'}:${point.lat}:${point.lng}`;
    const stationId = tankerkoenigId || fallbackId;
    return {
        drivingMode: true,
        tankerkoenig_id: stationId,
        id: stationId,
        stationId,
        priceStationId: tankerkoenigId,
        missingPriceStationId: point.missingPriceStationId === true || !tankerkoenigId,
        name: point.name || 'Tankpunkt',
        brand: point.brand || 'Tankstelle',
        typ: point.typ || point.type || 'tankpunkt',
        autobahn: point.autobahn || point.routeId || '',
        routeId: point.routeId || point.autobahn || '',
        richtung: point.richtung || 'beide',
        direktAnAutobahn: point.direktAnAutobahn === true,
        abfahrtName: point.abfahrtName || point.exitName || point.ausfahrt || point.exitRef || '',
        abfahrtNummer: point.abfahrtNummer || point.exitNumber || point.exitRef || '',
        abfahrtEntfernungKm: Number.isFinite(Number(point.abfahrtEntfernungKm)) ? Number(point.abfahrtEntfernungKm) : null,
        abfahrtEntfernungMin: Number.isFinite(Number(point.abfahrtEntfernungMin)) ? Number(point.abfahrtEntfernungMin) : null,
        streckenIndex: point.streckenIndex !== null && point.streckenIndex !== undefined && point.streckenIndex !== '' && Number.isFinite(Number(point.streckenIndex)) ? Number(point.streckenIndex) : null,
        kmPosition: point.kmPosition !== null && point.kmPosition !== undefined && point.kmPosition !== '' && Number.isFinite(Number(point.kmPosition)) ? Number(point.kmPosition) : null,
        street: point.street || point.addressStreet || point.address || '',
        house_number: point.house_number || point.houseNumber || '',
        postcode: point.postcode || point.postCode || point.zip || '',
        city: point.city || point.place || point.town || '',
        highway: point.highway || point.autobahn || point.routeId || '',
        sideLabel: point.sideLabel || '',
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

async function loadRouteTankpoints(routeId = state.drivingRouteId, options = {}) {
    const requestRouteId = drivingRouteRequestId(routeId, options.ignoreTemplate);
    const loadKey = `route:${requestRouteId}`;
    const freshMs = state.drivingRouteLoadedAt ? Date.now() - state.drivingRouteLoadedAt : Number.POSITIVE_INFINITY;
    if (state.drivingRouteTankpoints.length && state.drivingRouteLoadKey === loadKey && freshMs < 30 * 60 * 1000) return state.drivingRouteTankpoints;
    const data = await fetchJson(`/api/route/tankpoints.php?route=${encodeURIComponent(requestRouteId)}`);
    state.drivingRouteTankpoints = dedupeRouteTankpoints((data.tankpoints || [])
        .map(normalizeRouteTankpoint)
        .filter((point) => point.tankerkoenig_id && Number.isFinite(point.lat) && Number.isFinite(point.lng)));
    state.drivingRouteLoadKey = loadKey;
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

function routeExitNumberLabel(station) {
    const raw = String(station?.abfahrtNummer || station?.exitNumber || station?.exitRef || '').trim();
    const match = raw.match(/\d+[a-z]?/i);
    return match ? `AS ${match[0].toUpperCase()}` : '';
}

function drivingTankpointRowHtml(station, rank, thresholds) {
    const cls = markerClass(station, thresholds);
    const typeLabel = routeTankpointTypeLabel(station.typ);
    const access = station.direktAnAutobahn
        ? 'direkt an Autobahn'
        : `nahe Abfahrt${station.abfahrtEntfernungMin ? `, ca. ${station.abfahrtEntfernungMin} Min.` : ''}`;
    const exitNumber = routeExitNumberLabel(station);
    const exit = [exitNumber, station.abfahrtName && station.abfahrtName !== station.abfahrtNummer ? station.abfahrtName : ''].filter(Boolean).join(' ');
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
    if (station.chargingMode) {
        const mode = station.acDc || (station.fastCharging ? 'DC' : 'AC');
        const isRouteCharging = station.drivingContext === 'charging-route';
        const directionHtml = `<span class="driving-direction">${drivingTankpointDirectionHtml(station, rank)}</span>`;
        const statusClass = /betrieb/i.test(station.status || '') ? 'live' : 'missing';
        const chargingName = station.name || station.displayName || station.operatorName || 'Ladeanlage';
        const chargingDescription = [
            station.operatorName && station.operatorName !== chargingName ? station.operatorName : '',
            chargingAddress(station) || station.city || chargingConnectorText(station),
        ].filter(Boolean).join(' - ');
        return `
            <article class="driving-row driving-card driving-card-charging" tabindex="0" data-driving-station-id="${escapeHtml(station.tankerkoenig_id || station.stationId || station.id)}">
                <span class="driving-main">
                    <span class="driving-titleline">
                        ${brandLogoHtml(station)}
                        <span class="driving-route-badge">${escapeHtml(mode)}</span>
                    </span>
                    <span class="driving-data-status ${statusClass}">${escapeHtml(station.status || 'Status offen')}</span>
                    <small class="driving-charging-name">${escapeHtml(chargingName)}</small>
                    <small class="driving-charging-address">${escapeHtml(chargingDescription || 'Beschreibung offen')}</small>
                </span>
                ${directionHtml}
                <span class="driving-distance">
                    <strong>${Number(station.distance || 0).toFixed(1).replace('.', ',')}</strong>
                    <small>${isRouteCharging ? 'km voraus' : 'km entfernt'}</small>
                </span>
                <span class="driving-selected-price price-rank-green-light">
                    <small>${escapeHtml(chargingConnectorText(station))}</small>
                    <strong>${escapeHtml(chargingPowerText(station))}</strong>
                </span>
            </article>
        `;
    }
    const cls = markerClass(station, thresholds);
    const typeLabel = routeTankpointTypeLabel(station.typ);
    const isCity = isLocalDrivingContext() || isLocalDrivingContext(station.drivingContext);
    const isRoutePreview = station.drivingContext === 'route-preview';
    const access = station.direktAnAutobahn
        ? 'direkt an Autobahn'
        : `nahe Abfahrt${station.abfahrtEntfernungMin ? `, ca. ${station.abfahrtEntfernungMin} Min.` : ''}`;
    const exitNumber = routeExitNumberLabel(station);
    const exit = [exitNumber, station.abfahrtName && station.abfahrtName !== station.abfahrtNummer ? station.abfahrtName : ''].filter(Boolean).join(' ');
    const addressLine = drivingStationAddress(station);
    const routeDetail = `${escapeHtml(typeLabel)} - ${escapeHtml(access)}${exit ? ` - ${escapeHtml(exit)}` : ''}`;
    const subtitle = isCity
        ? `${escapeHtml(addressLine || 'Umkreis')}`
        : `${routeDetail}${addressLine ? ` - ${escapeHtml(addressLine)}` : ''}`;
    const selectedFuel = els.fuel.value;
    const hasCurrentHighwayPrice = isCity || hasCurrentDrivingPrice(station, selectedFuel, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS);
    const selectedPrice = hasCurrentHighwayPrice ? fuelPriceValue(station, selectedFuel) : null;
    const selectedPriceClass = hasCurrentHighwayPrice
        ? priceClassForFuel(station, selectedFuel)
        : 'price-rank-unknown';
    const dataStatus = drivingPriceStatus(station);
    const directionHtml = isCity
        ? `<span class="driving-direction">${drivingTankpointDirectionHtml(station, rank)}</span>`
        : '';
    const dataStatusHtml = dataStatus.key === 'current' || dataStatus.key === 'live'
        ? ''
        : `<span class="driving-data-status ${dataStatus.key}">${escapeHtml(dataStatus.label)}</span>`;
    const highwayBadgeHtml = isCity
        ? ''
        : `<span class="driving-route-badge">${escapeHtml(station.routeId || station.autobahn || station.highway || routeLabel())}</span>`;
    return `
        <article class="driving-row driving-card${isCity ? ` driving-card-${state.drivingContext === 'rural' ? 'rural' : 'city'}` : ' driving-card-highway'}" tabindex="0" data-driving-station-id="${escapeHtml(station.tankerkoenig_id)}">
            <span class="driving-main">
                <span class="driving-titleline">
                    ${brandLogoHtml(station)}
                    ${highwayBadgeHtml}
                </span>
                ${dataStatusHtml}
                <small>${subtitle}</small>
            </span>
            ${directionHtml}
            <span class="driving-distance">
                <strong>${Number(station.distance || 0).toFixed(1).replace('.', ',')}</strong>
                <small>${isCity || isRoutePreview ? 'km entfernt' : 'km voraus'}</small>
            </span>
            <span class="driving-selected-price ${selectedPriceClass}">
                <small>${escapeHtml(fuelLabel(selectedFuel))}</small>
                <strong>${money(selectedPrice)}</strong>
            </span>
        </article>
    `;
}

function drivingPriceStatus(station) {
    const selectedFuel = els.fuel.value;
    const isCity = isLocalDrivingContext() || isLocalDrivingContext(station?.drivingContext);
    if (isCity) {
        return hasCurrentDrivingPrice(station, selectedFuel, NORMAL_SEARCH_REFRESH_MS * 5)
            ? { key: 'live', label: 'Live' }
            : { key: 'missing', label: 'keine Daten' };
    }
    if (hasCurrentDrivingPrice(station, selectedFuel, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS)) {
        return { key: 'current', label: 'aktuell' };
    }
    if (state.drivingStatus === 'loading-prices' && canRetryDrivingPrice(station)) {
        return { key: 'loading', label: 'l\u00e4dt' };
    }
    if (routePriceStand(station)) {
        return { key: 'stale', label: 'alt' };
    }
    return { key: 'missing', label: 'keine Zuordnung' };
}

function drivingRefreshVisualizationHtml(stations = state.stations) {
    if (state.drivingVehicleMode === 'electric') return '';
    if (isLocalDrivingContext() || !stations.length) return '';
    const counts = stations.reduce((result, station) => {
        const key = drivingPriceStatus(station).key;
        result[key] = (result[key] || 0) + 1;
        return result;
    }, {});
    const maxAgeMinutes = Math.round(DRIVE_HIGHWAY_PRICE_MAX_AGE_MS / 60000);
    const items = [
        ['current', 'aktuell', counts.current || 0],
        ['loading', 'l\u00e4dt', counts.loading || 0],
        ['stale', 'alt', counts.stale || 0],
        ['missing', 'fehlt', counts.missing || 0],
    ];
    return `
        <section class="driving-refresh-visual" aria-label="Aktualitaet der Drive-Preise">
            <strong>Preise</strong>
            <span>Alt ab ${maxAgeMinutes} min</span>
            <div>
                ${items.map(([key, label, count]) => `
                    <span class="driving-refresh-chip ${key}">
                        <i aria-hidden="true"></i>
                        ${escapeHtml(label)} ${count}
                    </span>
                `).join('')}
            </div>
        </section>
    `;
}

function drivingPriceVisualizationHtml(thresholds) {
    if (state.drivingVehicleMode === 'electric') return '';
    if (!state.stations.length) return '';
    const selectedFuel = els.fuel.value;
    const isCity = isLocalDrivingContext();
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

function drivingCalibrationOverlayHtml() {
    if (!state.drivingActive) return '';
    const status = String(state.drivingStatus || '');
    const hasPosition = Boolean(currentDrivingPosition());
    const hasCompass = Number.isFinite(currentCompassBearing());
    const hasVisibleStations = Array.isArray(state.stations) && state.stations.length > 0;
    const isCalibrating = ['starting', 'waiting', 'direction-pending'].includes(status)
        && (!hasPosition || (!hasVisibleStations && !hasCompass));
    if (!isCalibrating) return '';
    const details = isLocalDrivingContext()
        ? 'Standort wird stabilisiert. Tankstellen werden gleich nach Entfernung und Richtung sortiert.'
        : 'GPS und Fahrtrichtung werden abgeglichen. Tankpunkte werden gleich in Fahrtrichtung gefiltert.';
    return `
        <div class="driving-calibration-overlay" role="status" aria-live="polite">
            <span class="driving-calibration-spinner" aria-hidden="true"></span>
            <strong>Drive wird kalibriert</strong>
            <small>${escapeHtml(details)}</small>
        </div>
    `;
}

function drivingEmptyStateMessage() {
    const status = String(state.drivingStatus || '');
    if (state.drivingUpdateInProgress || ['starting', 'waiting', 'direction-pending', 'loading-prices'].includes(status)) {
        if (status === 'loading-prices') return 'Aktuelle Preise und Tankpunkte werden geladen ...';
        if (status === 'direction-pending') return 'Fahrtrichtung wird ermittelt. Tankpunkte werden gleich gefiltert ...';
        return 'Standort und Tankpunkte werden gesucht ...';
    }
    if (state.drivingMessage && !/keine .*gefunden/i.test(state.drivingMessage)) {
        return state.drivingMessage;
    }
    return isLocalDrivingContext()
        ? 'Keine Tankstellen im aktuellen Suchbereich gefunden.'
        : 'Keine Tankpunkte in Fahrtrichtung gefunden.';
}

function renderDrivingModeList() {
    setCityMode(false);
    setDirectoryMode(false);
    els.appShell.classList.add('driving-mode');
    const activeElement = document.activeElement;
    const destinationInputFocused = activeElement?.matches?.('[data-driving-destination-form] input[name="destination"]');
    const destinationFocusState = destinationInputFocused
        ? {
            value: activeElement.value,
            selectionStart: activeElement.selectionStart,
            selectionEnd: activeElement.selectionEnd,
        }
        : null;
    if (destinationFocusState) state.drivingDestinationQuery = destinationFocusState.value;
    const directionLabel = state.drivingDirection === 'Muenchen' ? 'Richtung Sueden' : state.drivingDirection === 'Berlin' ? 'Richtung Norden' : 'wird ermittelt';
    const speed = drivingSpeedText();
    const accuracy = Number.isFinite(state.drivingAccuracy) ? `GPS ${Math.round(state.drivingAccuracy)} m` : 'GPS wird ermittelt';
    const routeDistance = Number.isFinite(state.drivingNearestRouteDistanceKm)
        ? `${state.drivingNearestRouteDistanceKm.toFixed(1).replace('.', ',')} km zur Route`
        : 'Autobahn-Naehe wird geprueft';
    const axisPosition = Number.isFinite(state.drivingCurrentRoutePosition)
        ? `km ${state.drivingCurrentRoutePosition.toFixed(1).replace('.', ',')}`
        : 'km offen';
    const thresholds = thresholdsFor(state.stations);
    const contextLabel = state.drivingContext === 'rural'
        ? 'Landmodus'
        : state.drivingContext === 'city'
            ? 'Stadtmodus'
            : state.drivingContext === 'charging'
                ? 'Elektro Drive'
                : `Autobahn ${routeLabel()}`;
    const template = drivingRouteTemplate();
    const visibleStations = [...state.stations]
        .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
    const currentPriceCount = isLocalDrivingContext()
        ? visibleStations.length
        : visibleStations.filter((station) => hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS)).length;
    const driveTitle = 'Drive Mode';
    const isDriveMapView = state.view === 'map' || els.appShell.classList.contains('view-map');
    const mapListButton = isDriveMapView
        ? '<button class="drive-header-list-button" type="button" data-driving-header-view="list">Liste</button>'
        : '<button class="drive-header-list-button" type="button" data-driving-header-view="map">Karte</button>';
    els.resultCount.innerHTML = `
        <span class="drive-title-text">${escapeHtml(driveTitle)}</span>
        <span class="drive-speed-chip" aria-label="Geschwindigkeit">${escapeHtml(speed)}</span>
        ${mapListButton}
    `;
    updateSectionHeaderTone();
    const priceMeta = state.drivingVehicleMode === 'electric'
        ? `${visibleStations.length} Ladeanlagen`
        : isLocalDrivingContext()
        ? drivingModePriceStandText(state.stations)
        : `${currentPriceCount}/${visibleStations.length} aktuelle Preise`;
    els.resultMeta.textContent = '';

    els.results.innerHTML = `
        <section class="driving-dashboard">
            ${drivingRouteInfoOverlayHtml()}
            ${drivingCalibrationOverlayHtml()}
            <div class="driving-control-drawer">
                ${drivingDestinationFormHtml()}
                ${drivingRefreshVisualizationHtml(visibleStations)}
            </div>
            ${drivingTestPanelHtml()}
            ${drivingPriceVisualizationHtml(thresholds)}
            <div class="city-station-list">
                ${visibleStations.length
                    ? visibleStations.map((station, index) => drivingTankpointCardHtml(station, index + 1, thresholds)).join('')
                    : `<div class="empty-state">${escapeHtml(drivingEmptyStateMessage())}</div>`}
            </div>
        </section>
    `;
    syncDrivingControlsVisibility();

    els.resultCount.querySelector('[data-driving-header-view]')?.addEventListener('click', (event) => {
        const targetView = event.currentTarget.dataset.drivingHeaderView;
        if (targetView === 'map') {
            openDrivingDestinationMap();
            return;
        }
        setView('list');
        renderDrivingModeList();
    });
    els.results.querySelectorAll('[data-driving-route-info-dismiss]').forEach((element) => {
        element.addEventListener('click', (event) => {
            if (event.currentTarget !== event.target && !event.target.closest('.driving-route-info-close, .driving-route-info-ok')) return;
            state.drivingRouteInfoVisible = false;
            renderDrivingModeList();
        });
    });
    els.results.querySelector('[data-driving-route-template]')?.addEventListener('change', (event) => {
        state.drivingRouteTemplateId = event.target.value;
        state.drivingRouteId = 'ALL';
        state.drivingDetectedRouteId = null;
        state.drivingRouteProjection = null;
        state.drivingStableDirection = drivingTemplateDirection();
        state.drivingRouteLoadedAt = null;
        state.drivingRouteLoadKey = null;
        state.drivingMessage = 'Fahrstrecke wird angewendet';
        evaluateDrivingModeList();
        renderDrivingModeList();
    });
    const destinationForm = els.results.querySelector('[data-driving-destination-form]');
    const destinationInput = destinationForm?.querySelector('input[name="destination"]');
    const destinationAction = destinationForm?.querySelector('[data-driving-destination-action]');
    setDrivingKeyboardOpen(Boolean(destinationFocusState));
    destinationInput?.addEventListener('focus', () => {
        state.drivingDestinationOpen = true;
        state.drivingDestinationConfirmedOpen = false;
        setDrivingKeyboardOpen(true);
    });
    destinationInput?.addEventListener('blur', () => {
        window.setTimeout(() => setDrivingKeyboardOpen(false), 180);
    });
    destinationInput?.addEventListener('input', (event) => {
        state.drivingDestinationQuery = event.target.value;
        state.drivingDestinationEdited = true;
        state.drivingDestinationConfirmedOpen = false;
        if (destinationAction) {
            destinationAction.dataset.drivingDestinationAction = 'ok';
            destinationAction.textContent = 'OK';
        }
    });
    if (destinationFocusState && destinationInput) {
        window.requestAnimationFrame(() => {
            destinationInput.focus({ preventScroll: true });
            const start = Math.min(destinationFocusState.selectionStart ?? destinationInput.value.length, destinationInput.value.length);
            const end = Math.min(destinationFocusState.selectionEnd ?? start, destinationInput.value.length);
            destinationInput.setSelectionRange(start, end);
        });
    }
    destinationForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        applyDrivingDestination(new FormData(event.currentTarget).get('destination'), { keepOpen: true }).catch((error) => {
            state.drivingStatus = 'error';
            state.drivingMessage = error.message || 'Route konnte nicht vorgeschlagen werden.';
            renderDrivingModeList();
        });
    });
    destinationAction?.addEventListener('click', () => {
        const action = destinationAction.dataset.drivingDestinationAction;
        if (action === 'ok') {
            destinationForm?.requestSubmit();
            return;
        }
        if (action === 'map') {
            openDrivingDestinationMap();
            return;
        }
        state.drivingDestinationOpen = false;
        state.drivingDestinationEdited = false;
        state.drivingDestinationConfirmedOpen = false;
        setDrivingKeyboardOpen(false);
        renderDrivingModeList();
        evaluateDrivingModeList();
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
        if (button.tagName !== 'BUTTON') {
            button.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                state.selectedId = button.dataset.drivingStationId;
                renderDetail(state.stations.find((item) => item.tankerkoenig_id === state.selectedId));
            });
        }
    });
}

function updateDrivingModeMapMarkers() {
    if (state.view !== 'map') return;
    renderMarkers();
    const routePoints = Array.isArray(state.drivingRouteGeometry) ? state.drivingRouteGeometry : [];
    const fallbackPoints = [
        ...routePoints,
        ...(state.selectedLocation ? [[state.selectedLocation.lat, state.selectedLocation.lng]] : []),
        ...(state.drivingDestination ? [[state.drivingDestination.lat, state.drivingDestination.lng]] : []),
    ].filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)));
    if (!state.stations.length && fallbackPoints.length && state.map?.type !== 'fallback') {
        if (fallbackPoints.length === 1) {
            state.map.setView(fallbackPoints[0], 13, { animate: true });
        } else {
            state.map.fitBounds(L.latLngBounds(fallbackPoints).pad(0.22), { maxZoom: 13, animate: true });
        }
        return;
    }
    if (!state.stations.length && state.selectedLocation && state.map?.type !== 'fallback') {
        state.map.setView([state.selectedLocation.lat, state.selectedLocation.lng], 13, { animate: true });
    }
}

function updateDrivingMapPositionOnly() {
    if (state.view !== 'map' || state.listMode !== 'driving') return;
    updateDrivingMapSpeed();
    updateDrivingMapRotation();
    const position = state.drivingSamples[state.drivingSamples.length - 1];
    if (position) {
        state.selectedLocation = { label: 'Aktuelle Position', lat: position.lat, lng: position.lng };
    }
    renderUserLocationMarker();
    focusDrivingMapByHeading(drivingMapStationsToShow(position || state.selectedLocation), position || state.selectedLocation);
    updateDrivingMapNearestBox(drivingMapStationsToShow(position || state.selectedLocation));
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
    state.drivingStableDirection = direction;
    state.drivingOffRouteSince = null;
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

async function updateElectricDrivingMode(position) {
    state.drivingContext = 'charging';
    state.drivingDirection = Number.isFinite(visualDrivingBearing()) ? 'Elektro' : null;
    state.drivingNearestRouteDistanceKm = null;
    state.drivingCurrentRoutePosition = null;
    state.drivingLivePriceMessage = '';
    const hasRoute = Boolean(state.drivingDestination && Array.isArray(state.drivingRouteGeometry) && state.drivingRouteGeometry.length >= 2);
    const stations = hasRoute
        ? await electricRouteChargingStationsForDriving(position, ELECTRIC_NEAREST_LIMIT)
        : await loadElectricDriveStations(position, ELECTRIC_NEAREST_LIMIT);
    const localRadius = state.drivingContext === 'rural' ? ELECTRIC_RURAL_RADIUS_KM : ELECTRIC_CITY_RADIUS_KM;
    const localContextLabel = state.drivingContext === 'rural' ? 'Landmodus' : 'Stadtmodus';
    state.stations = stations;
    state.drivingStatus = stations.length ? 'ready' : 'empty';
    state.drivingMessage = stations.length
        ? (hasRoute
            ? `${stations.length} Ladeanlagen entlang des Korridors`
            : `${stations.length} Ladeanlagen im ${localContextLabel} bis ${localRadius} km${Number.isFinite(visualDrivingBearing()) ? ' in Fahrtrichtung' : ''}`)
        : (hasRoute
            ? 'Keine Ladeanlagen entlang des Korridors gefunden'
            : `Keine Ladeanlagen im ${localContextLabel} bis ${localRadius} km gefunden`);
    if (state.view === 'map') updateDrivingModeMapMarkers();
    if (!isDrivingDestinationInputActive()) renderDrivingModeList();
}

async function updateDrivingMode(options = {}) {
    if (!state.drivingActive) return;
    setStatus('Fahrt');
    if (!options.force && isDrivingDestinationInputActive()) return;
    let position = state.drivingSamples[state.drivingSamples.length - 1];
    const positionStale = !position || Date.now() - Number(position.timestamp || 0) > DRIVE_POSITION_STALE_MS;
    if (positionStale) {
        const refreshedPosition = await refreshDrivingCurrentPosition();
        if (refreshedPosition) position = refreshedPosition;
    }
    if (!position) {
        state.drivingStatus = 'waiting';
        state.drivingMessage = 'Standort wird ermittelt';
        renderDrivingModeList();
        return;
    }

    state.selectedLocation = { label: 'Aktuelle Position', lat: position.lat, lng: position.lng };
    if (state.drivingVehicleMode === 'electric') {
        await updateElectricDrivingMode(position);
        return;
    }
    await loadRouteTankpoints(state.drivingRouteId);
    const route = stabilizedDrivingRoute(detectCurrentRoute(position, state.drivingRouteId), position);
    if (route.projection && state.drivingSamples.length) {
        state.drivingSamples[state.drivingSamples.length - 1] = {
            ...state.drivingSamples[state.drivingSamples.length - 1],
            routeId: route.routeId,
            routeAxisDistanceKm: route.projection.axisDistanceKm,
            routeDistanceKm: route.distanceKm,
        };
    }
    const templateDirection = drivingTemplateDirection();
    const direction = route.onRoute ? (detectDrivingDirectionOnRoute() || templateDirection) : detectDrivingDirection();
    state.drivingDirection = direction;
    const hasDestinationRoute = Boolean(state.drivingDestination && state.drivingRouteSuggestion);
    const hasRoutePreviewCache = Boolean(state.drivingRoutePreviewCache?.stations?.length);
    const confirmedDestinationHighway = isConfirmedDestinationHighwayRoute(route);
    const showRoutePreview = hasDestinationRoute && (route.onRoute || route.held || confirmedDestinationHighway);
    let offRouteTooLong = !route.onRoute
        && state.drivingOffRouteSince
        && Date.now() - state.drivingOffRouteSince >= DRIVE_ROUTE_LEFT_AFTER_MS;

    if (showRoutePreview) {
        if (route.onRoute || confirmedDestinationHighway) {
            state.drivingOffRouteSince = null;
        } else if (!state.drivingOffRouteSince) {
            state.drivingOffRouteSince = Date.now();
            offRouteTooLong = false;
        }
        state.drivingContext = 'highway';
        state.drivingLivePriceMessage = '';
        if (confirmedDestinationHighway) await reevaluateDrivingDestinationFromHighway(position, route);
        if (offRouteTooLong) resetDrivingRoutePreviewCache();
        let routePreviewStations = routePreviewStationsForDriving(position, state.drivingDestination ? DRIVE_ROUTE_DESTINATION_PREVIEW_LIMIT : 120);
        const routePreviewDisplayLimit = state.drivingDestination ? routePreviewStations.length : 10;
        if (routePreviewStations.some((station) => !hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS))) {
            state.stations = routePreviewStations.slice(0, routePreviewDisplayLimit);
            state.drivingStatus = 'loading-prices';
            state.drivingMessage = 'Preise werden aktualisiert';
            if (!isDrivingDestinationInputActive()) renderDrivingModeList();
            routePreviewStations = await loadLivePricesForDrivingStations(routePreviewStations);
            routePreviewStations = mergeRoutePreviewCachePrices(routePreviewStations);
        }
        const currentRoutePreviewStations = routePreviewStations
            .filter((station) => hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS));
        state.stations = routePreviewStations.slice(0, routePreviewDisplayLimit);
        state.drivingStatus = state.stations.length ? 'ready' : 'empty';
        state.drivingMessage = state.stations.length
            ? (state.drivingLivePriceMessage || `${currentRoutePreviewStations.length}/${state.stations.length} Tankpunkte mit aktuellen Preisen an der Strecke`)
            : (state.drivingLivePriceMessage || 'Keine Tankpunkte mit aktuellen Preisen an der vorbereiteten Strecke gefunden');
    } else if (route.onRoute && !direction) {
        state.drivingOffRouteSince = null;
        state.stations = await loadLocalDriveStations(position, 10);
        state.drivingStatus = state.stations.length ? 'ready' : 'direction-pending';
        state.drivingMessage = state.stations.length
            ? (hasDestinationRoute
                ? `Ziel aktiv - ${state.drivingContext === 'rural' ? 'Landmodus' : 'Stadtmodus'} bis zur Autobahn`
                : 'Keine Bewegung erkannt - Standortumkreis aktiv')
            : (route.uncertain ? 'Route unsicher - Standort erkannt, Fahrtrichtung offen' : 'Standort erkannt - Fahrtrichtung offen');
    } else if (route.onRoute && direction && !hasDestinationRoute) {
        state.drivingOffRouteSince = null;
        state.drivingContext = 'highway';
        state.drivingLivePriceMessage = '';
        let stationsAhead = getNextTankpointsOnRoute({ position, direction, limit: 50 });
        if (stationsAhead.some((station) => !hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS))) {
            state.stations = [];
            state.drivingStatus = 'loading-prices';
            state.drivingMessage = 'Preise werden aktualisiert';
            if (!isDrivingDestinationInputActive()) renderDrivingModeList();
            stationsAhead = await loadLivePricesForDrivingStations(stationsAhead);
        }
        const currentStationsAhead = stationsAhead
            .filter((station) => hasCurrentDrivingPrice(station, els.fuel.value, DRIVE_HIGHWAY_PRICE_MAX_AGE_MS));
        state.stations = stationsAhead.slice(0, 10);
        state.drivingStatus = state.stations.length ? 'ready' : 'empty';
        state.drivingMessage = state.stations.length
            ? (state.drivingLivePriceMessage || (currentStationsAhead.length
                ? (route.held ? 'GPS springt - Autobahnmodus bleibt aktiv' : (route.uncertain ? 'GPS/Route unsicher - Tankpunkte werden weiter entlang der erkannten Achse angezeigt' : ''))
                : 'Tankpunkte gefunden - aktuelle Preise fehlen noch'))
            : (state.drivingLivePriceMessage || 'Keine passenden Tankpunkte mit aktuellen Preisen gefunden');
    } else {
        if (!state.drivingOffRouteSince) state.drivingOffRouteSince = Date.now();
        state.drivingDetectedRouteId = null;
        state.stations = await loadLocalDriveStations(position, 10);
        state.drivingStatus = state.stations.length ? 'ready' : 'empty';
        state.drivingMessage = state.stations.length
            ? ((state.drivingContext === 'rural' ? state.drivingRuralLastMessage : state.drivingCityLastMessage) || (state.drivingContext === 'rural'
                ? (hasDestinationRoute ? 'Ziel aktiv - Landmodus bis zur Autobahn' : 'Landmodus - wenige Tankpunkte im Umkreis, keine Autobahn erkannt')
                : (hasDestinationRoute ? 'Ziel aktiv - Stadtmodus bis zur Autobahn' : (offRouteTooLong ? 'Vorbereitete Strecke verlassen - Umgebungssuche aktiv' : 'Umgebungssuche aktiv - nicht entlang der vorbereiteten Autobahn'))))
            : (offRouteTooLong ? 'Vorbereitete Strecke verlassen' : 'Keine Tankstellen mit Preisinformationen im Umkreis gefunden');
    }

    if (state.view === 'map') updateDrivingModeMapMarkers();
    if (isDrivingDestinationInputActive()) return;
    renderDrivingModeList();
}

async function evaluateDrivingModeList() {
    if (!state.drivingActive || state.drivingUpdateInProgress) return;
    if (state.drivingDestinationOpen) return;
    if (isDrivingRestMode() && state.stations.length) {
        state.drivingMessage = state.drivingMessage || 'Ruhemodus - Liste bleibt stabil';
        if (state.view === 'map') updateDrivingMapPositionOnly();
        return;
    }
    state.drivingUpdateInProgress = true;
    try {
        await updateDrivingMode();
    } catch (error) {
        state.drivingStatus = 'error';
        state.drivingMessage = error.message || 'Fahrmodus konnte nicht aktualisiert werden.';
        if (!isDrivingDestinationInputActive()) renderDrivingModeList();
        setStatus('Fehler');
    } finally {
        state.drivingUpdateInProgress = false;
    }
}

function drivingSampleFromPosition(position) {
    const coords = position.coords || {};
    return {
        lat: Number(coords.latitude),
        lng: Number(coords.longitude),
        accuracy: Number(coords.accuracy || Number.POSITIVE_INFINITY),
        speedKmh: Number.isFinite(coords.speed) && coords.speed !== null ? Number(coords.speed) * 3.6 : null,
        heading: Number.isFinite(coords.heading) && coords.heading !== null ? Number(coords.heading) : null,
        timestamp: Number(position.timestamp || Date.now()),
    };
}

function rememberDrivingPosition(position, { triggerInitialUpdate = true } = {}) {
    const sample = drivingSampleFromPosition(position);
    if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)) return;
    const previousCount = state.drivingSamples.length;
    state.drivingSamples.push(sample);
    state.drivingSamples = state.drivingSamples.slice(-6);
    state.drivingAccuracy = sample.accuracy;
    const speedKmh = estimateDrivingSpeedKmh();
    if (Number.isFinite(speedKmh)) {
        state.drivingSpeedKmh = speedKmh;
        state.drivingSpeedUpdatedAt = Date.now();
        updateDrivingMapSpeed();
    }
    if (triggerInitialUpdate && previousCount === 0 && !isDrivingDestinationInputActive()) evaluateDrivingModeList();
    return sample;
}

function handleDrivingPosition(position) {
    rememberDrivingPosition(position);
    syncDrivingControlsVisibility();
    updateDrivingMapPositionOnly();
}

function refreshDrivingCurrentPosition() {
    if (!navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition((position) => {
            resolve(rememberDrivingPosition(position, { triggerInitialUpdate: false }) || null);
        }, () => {
            resolve(null);
        }, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
        });
    });
}

async function requestDriveWakeLock() {
    if (!state.drivingActive || state.wakeLock || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    try {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', () => {
            state.wakeLock = null;
        });
    } catch {
        state.wakeLock = null;
    }
}

async function requestPortraitOrientationLock() {
    const orientation = screen?.orientation;
    if (!orientation || typeof orientation.lock !== 'function') return;
    try {
        await orientation.lock('portrait');
    } catch {
        // Browser may allow orientation lock only in installed PWA/fullscreen mode.
    }
}

async function releaseDriveWakeLock() {
    const wakeLock = state.wakeLock;
    state.wakeLock = null;
    if (!wakeLock) return;
    try {
        await wakeLock.release();
    } catch {
        // Wake Lock may already be released by the browser.
    }
}

function handleDriveWakeLockVisibility() {
    if (document.visibilityState === 'visible' && state.drivingActive) {
        requestDriveWakeLock();
    }
}

function handleDrivingOrientation(event) {
    const webkitHeading = Number(event.webkitCompassHeading);
    const alpha = Number(event.alpha);
    const heading = Number.isFinite(webkitHeading)
        ? webkitHeading
        : Number.isFinite(alpha)
            ? (360 - alpha + 360) % 360
            : null;
    if (!Number.isFinite(heading)) return;
    state.drivingCompassHeading = heading;
    state.drivingCompassHeadingAt = Date.now();
    if (isDrivingDestinationInputActive()) return;
    if (Date.now() - Number(state.drivingCompassRenderAt || 0) < DRIVE_COMPASS_RENDER_FAST_MS) return;
    state.drivingCompassRenderAt = Date.now();
    if (state.listMode === 'driving' && state.view === 'list') renderDrivingModeList();
    if (state.listMode === 'driving' && state.view === 'map') updateDrivingMapPositionOnly();
}

async function startDrivingCompass() {
    if (
        state.drivingCompassListenerActive
        || state.drivingCompassPermissionDenied
        || typeof window === 'undefined'
        || !window.DeviceOrientationEvent
    ) return;
    try {
        if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
            if (state.drivingCompassPermissionAsked) return;
            state.drivingCompassPermissionAsked = true;
            const permission = await window.DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                state.drivingCompassPermissionDenied = true;
                return;
            }
        }
        window.addEventListener('deviceorientationabsolute', handleDrivingOrientation, true);
        window.addEventListener('deviceorientation', handleDrivingOrientation, true);
        state.drivingCompassListenerActive = true;
    } catch {
        state.drivingCompassPermissionDenied = true;
        state.drivingCompassListenerActive = false;
    }
}

function stopDrivingCompass() {
    if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', handleDrivingOrientation, true);
        window.removeEventListener('deviceorientation', handleDrivingOrientation, true);
    }
    state.drivingCompassListenerActive = false;
    state.drivingCompassHeading = null;
    state.drivingCompassHeadingAt = null;
    state.drivingCompassRenderAt = null;
}

async function startDrivingMode(routeId = 'ALL', options = {}) {
    captureNormalSearchBeforeDrive();
    requestPortraitOrientationLock();
    const requestedVehicleMode = options.vehicleMode || state.vehicleMode || DEFAULT_VEHICLE_MODE;
    state.drivingControlsVisibleUntil = Date.now() + DRIVE_CONTROL_REVEAL_MS;
    state.listMode = 'driving';
    state.drivingVehicleMode = requestedVehicleMode === 'electric' ? 'electric' : 'combustion';
    state.drivingRouteId = routeId;
    state.drivingDetectedRouteId = null;
    state.drivingActive = true;
    state.stations = [];
    state.drivingSamples = [];
    state.drivingSpeedKmh = null;
    state.drivingSpeedUpdatedAt = null;
    state.drivingAccuracy = null;
    state.drivingRouteGeometry = [];
    resetDrivingRoutePreviewCache();
    state.drivingStableDirection = drivingTemplateDirection();
    state.drivingRouteProjection = null;
    state.drivingLastHighwayAt = null;
    state.drivingLastHighwayRouteId = null;
    state.drivingLastHighwayProjection = null;
    state.drivingOffRouteSince = null;
    state.drivingStatus = 'starting';
    state.drivingMessage = 'Standort wird ermittelt';
    state.selectedId = null;
    setView('list');
    renderDetail(null);
    renderDrivingModeList();
    requestDriveWakeLock();
    startDrivingCompass();

    if (!navigator.geolocation) {
        state.drivingStatus = 'blocked';
        state.drivingMessage = 'Standortfreigabe erforderlich';
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
    state.drivingUpdateTimer = window.setInterval(evaluateDrivingModeList, DRIVE_UPDATE_INTERVAL_MS);
    refreshDrivingCurrentPosition().then(() => evaluateDrivingModeList());

    if (state.drivingVehicleMode === 'electric') {
        evaluateDrivingModeList();
    } else {
        try {
            await loadRouteTankpoints(routeId);
            evaluateDrivingModeList();
        } catch (error) {
            state.drivingStatus = 'error';
            state.drivingMessage = error.message || 'Autobahn-Tankpunkte konnten nicht geladen werden.';
            renderDrivingModeList();
        }
    }
}

function stopDrivingMode(restore = true) {
    releaseDriveWakeLock();
    stopDrivingCompass();
    if (state.drivingWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(state.drivingWatchId);
    }
    if (state.drivingUpdateTimer !== null) window.clearInterval(state.drivingUpdateTimer);
    state.drivingWatchId = null;
    state.drivingUpdateTimer = null;
    state.drivingUpdateInProgress = false;
    state.drivingActive = false;
    state.drivingVehicleMode = DEFAULT_VEHICLE_MODE;
    clearDrivingControlsTimer();
    state.drivingControlsVisibleUntil = 0;
    state.drivingSamples = [];
    state.drivingRouteGeometry = [];
    resetDrivingRoutePreviewCache();
    state.drivingStatus = 'inactive';
    state.drivingDirection = null;
    state.drivingDetectedRouteId = null;
    state.drivingLastBearing = null;
    state.drivingLastBearingAt = null;
    state.drivingSpeedKmh = null;
    state.drivingSpeedUpdatedAt = null;
    state.drivingAccuracy = null;
    state.drivingNearestRouteDistanceKm = null;
    state.drivingCurrentRoutePosition = null;
    state.drivingRouteProjection = null;
    state.drivingLastHighwayAt = null;
    state.drivingLastHighwayRouteId = null;
    state.drivingLastHighwayProjection = null;
    state.drivingStableDirection = null;
    state.drivingOffRouteSince = null;
    els.appShell.classList.remove('driving-mode');
    els.appShell.classList.remove('driving-controls-collapsed');
    clearDrivingRouteOverlay();
    state.listMode = 'results';
    renderDetail(null);
    if (restore) {
        restoreNormalSearchAfterDrive();
    } else {
        state.stations = [];
        state.selectedLocation = null;
    }
    updateBottomNav();
}

function autobahnStationAddress(station) {
    return [station.postcode, station.city].filter(Boolean).join(' ');
}

function chargingAddress(station) {
    return [
        station.addressLine || [station.street, station.houseNumber].filter(Boolean).join(' '),
        [station.postcode, station.city].filter(Boolean).join(' '),
    ].filter(Boolean).join(' ');
}

function chargingConnectorText(station) {
    const types = Array.isArray(station.connectorTypes) ? station.connectorTypes : [];
    if (!types.length) return station.acDc || 'Stecker unbekannt';
    return types.slice(0, 2).join(' / ');
}

function chargingPowerText(station) {
    const power = Number(station.maxConnectorPowerKw || station.nominalPowerKw || 0);
    return power > 0 ? `${power.toLocaleString('de-DE')} kW` : 'kW offen';
}

function chargingPowerValue(station) {
    return Number(station.maxConnectorPowerKw || station.nominalPowerKw || 0);
}

function chargingConnectorValues(station) {
    const values = [
        ...(Array.isArray(station.connectorTypes) ? station.connectorTypes : []),
        ...(Array.isArray(station.connectors) ? station.connectors.map((connector) => connector?.type) : []),
        station.acDc,
    ].filter(Boolean);
    return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function chargingMatchesFilters(station, filters = state.chargingFilters || {}, ignore = '') {
    if (ignore !== 'operator' && filters.operator && filters.operator !== 'all') {
        const filterOperator = normalizeText(filters.operator);
        const operatorText = normalizeText([
            station.operatorName,
            station.displayName,
            station.name,
            station.brand,
        ].filter(Boolean).join(' '));
        if (!operatorText || !operatorText.includes(filterOperator)) return false;
    }
    if (ignore !== 'connector' && filters.connector && filters.connector !== 'all' && !chargingConnectorValues(station).includes(filters.connector)) return false;
    const minPower = Number(filters.minPower || 0);
    if (ignore !== 'minPower' && Number.isFinite(minPower) && minPower > 0 && chargingPowerValue(station) < minPower) return false;
    return true;
}

function chargingSearchTextOperatorFilter() {
    const query = String(els.searchInput?.value || '').trim();
    if (query.length < 3) return '';
    if (!/[a-zäöüß]/i.test(query)) return '';
    const selectedLabel = String(state.selectedLocation?.label || '').trim();
    if (selectedLabel && query === selectedLabel) return '';
    return query;
}

function chargingFilteredStations() {
    return state.chargingStations.filter((station) => chargingMatchesFilters(station));
}

function chargingFilterActiveText(filters = state.chargingFilters || {}) {
    const parts = [];
    if (filters.operator && filters.operator !== 'all') parts.push(filters.operator);
    if (filters.connector && filters.connector !== 'all') parts.push(filters.connector);
    if (filters.minPower && filters.minPower !== 'all') parts.push(`ab ${filters.minPower} kW`);
    return parts.length ? parts.join(' + ') : 'alle Anlagen';
}

function chargingFilterOptionsHtml(stations) {
    const filters = state.chargingFilters || {};
    const operators = [...new Map(stations
        .map((station) => String(station.operatorName || station.displayName || station.name || 'Betreiber unbekannt').trim())
        .filter(Boolean)
        .map((operator) => [operator, stations.filter((station) => String(station.operatorName || station.displayName || station.name || 'Betreiber unbekannt') === operator).length]))]
        .sort((a, b) => a[0].localeCompare(b[0], 'de'));
    const connectorBase = stations.filter((station) => chargingMatchesFilters(station, filters, 'connector'));
    const connectors = [...new Map(connectorBase
        .flatMap((station) => chargingConnectorValues(station).map((connector) => [connector, connectorBase.filter((item) => chargingConnectorValues(item).includes(connector)).length])))]
        .sort((a, b) => a[0].localeCompare(b[0], 'de'));
    const powerBase = stations.filter((station) => chargingMatchesFilters(station, filters, 'minPower'));
    const powerOptions = [
        ['all', 'alle kW'],
        ['11', 'ab 11 kW'],
        ['22', 'ab 22 kW'],
        ['50', 'ab 50 kW'],
        ['150', 'ab 150 kW'],
        ['300', 'ab 300 kW'],
    ].map(([value, label]) => [
        value,
        label,
        value === 'all' ? powerBase.length : powerBase.filter((station) => chargingPowerValue(station) >= Number(value)).length,
    ]);
    const active = chargingFilterActiveText(filters);
    return `
        <section class="charging-filterbar ${active === 'alle Anlagen' ? '' : 'is-active'}" aria-label="Ladeanlagen filtern">
            <strong class="charging-filterbar-status">${escapeHtml(active)}</strong>
            <label><span>Betreiber</span><select data-charging-filter="operator">
                <option value="all">alle Betreiber</option>
                ${operators.map(([operator, count]) => `<option value="${escapeHtml(operator)}" ${filters.operator === operator ? 'selected' : ''}>${escapeHtml(operator)} (${count})</option>`).join('')}
            </select></label>
            <label><span>Stecker</span><select data-charging-filter="connector">
                <option value="all">alle Stecker</option>
                ${connectors.map(([connector, count]) => `<option value="${escapeHtml(connector)}" ${filters.connector === connector ? 'selected' : ''}>${escapeHtml(connector)} (${count})</option>`).join('')}
            </select></label>
            <label><span>Leistung</span><select data-charging-filter="minPower">
                ${powerOptions.map(([value, label, count]) => `<option value="${value}" ${String(filters.minPower || 'all') === value ? 'selected' : ''}>${label} (${count})</option>`).join('')}
            </select></label>
        </section>
    `;
}

function normalizeChargingStation(station) {
    const stationId = station.stationId || station.id;
    return {
        ...station,
        stationId,
        tankerkoenig_id: stationId,
        chargingMode: true,
        price: null,
        is_open: /betrieb/i.test(station.status || ''),
    };
}

function electricRoutePreviewCacheKey() {
    const destination = state.drivingDestination
        ? `${Number(state.drivingDestination.lat).toFixed(4)}:${Number(state.drivingDestination.lng).toFixed(4)}`
        : '';
    const geometryKey = Array.isArray(state.drivingRouteGeometry)
        ? `${state.drivingRouteGeometry.length}:${JSON.stringify(state.drivingRouteGeometry[0] || [])}:${JSON.stringify(state.drivingRouteGeometry.at(-1) || [])}`
        : '';
    return [destination, geometryKey, els.radius?.value || '25', els.limit?.value || '50'].join('|');
}

function resetElectricRoutePreviewCache() {
    state.electricRoutePreviewCache = null;
}

function routeGeometrySamplePoints(stepKm = 25) {
    const geometry = Array.isArray(state.drivingRouteGeometry) ? state.drivingRouteGeometry : [];
    if (geometry.length < 2) return [];
    const samples = [];
    let nextAtKm = 0;
    let routeKm = 0;
    for (let index = 0; index < geometry.length; index += 1) {
        const current = { lat: Number(geometry[index]?.[0]), lng: Number(geometry[index]?.[1]) };
        if (!Number.isFinite(current.lat) || !Number.isFinite(current.lng)) continue;
        if (index === 0) samples.push({ ...current, routeKm: 0 });
        if (index === 0) continue;
        const previous = { lat: Number(geometry[index - 1]?.[0]), lng: Number(geometry[index - 1]?.[1]) };
        const segmentKm = routeDistanceKm(previous.lat, previous.lng, current.lat, current.lng);
        if (!Number.isFinite(segmentKm) || segmentKm <= 0) continue;
        while (nextAtKm + stepKm <= routeKm + segmentKm) {
            nextAtKm += stepKm;
            const t = Math.max(0, Math.min(1, (nextAtKm - routeKm) / segmentKm));
            samples.push({
                lat: previous.lat + (current.lat - previous.lat) * t,
                lng: previous.lng + (current.lng - previous.lng) * t,
                routeKm: nextAtKm,
            });
        }
        routeKm += segmentKm;
    }
    const last = geometry.at(-1);
    const lastPoint = { lat: Number(last?.[0]), lng: Number(last?.[1]) };
    if (Number.isFinite(lastPoint.lat) && Number.isFinite(lastPoint.lng)) samples.push({ ...lastPoint, routeKm });
    return samples.filter((sample, index, list) => (
        index === 0 || routeDistanceKm(sample.lat, sample.lng, list[index - 1].lat, list[index - 1].lng) > 1
    ));
}

async function buildElectricRouteChargingCache(position, limit = 100) {
    const samples = routeGeometrySamplePoints(35);
    const byId = new Map();
    const querySamples = samples.slice(0, 24);
    const fetchSample = async (sample) => {
        const params = new URLSearchParams({
            lat: String(sample.lat),
            lng: String(sample.lng),
            radius: String(ELECTRIC_ROUTE_CORRIDOR_KM),
            limit: '80',
        });
        try {
            const data = await fetchJson(`/api/charging/stations.php?${params.toString()}`, { timeoutMs: 22000, progress: false });
            return data.stations || [];
        } catch {
            return [];
        }
    };
    for (let index = 0; index < querySamples.length; index += 4) {
        const batch = querySamples.slice(index, index + 4);
        const results = await Promise.all(batch.map(fetchSample));
        results.flat().map(normalizeChargingStation).forEach((station) => {
                const id = station.stationId || station.id;
                if (!id || byId.has(id)) return;
                const projection = projectPointToRouteGeometry(station);
                if (!projection || !Number.isFinite(projection.routeKm) || projection.distanceKm > ELECTRIC_ROUTE_CORRIDOR_KM) return;
                byId.set(id, {
                    ...station,
                    drivingContext: 'charging-route',
                    routePreviewKm: projection.routeKm,
                    routeDistanceFromGeometryKm: projection.distanceKm,
                });
            });
    }
    const stations = updateElectricRouteChargingDistances([...byId.values()], position)
        .slice(0, limit);
    state.electricRoutePreviewCache = {
        key: electricRoutePreviewCacheKey(),
        createdAt: Date.now(),
        stations,
    };
    return stations;
}

function updateElectricRouteChargingDistances(stations, position) {
    if (!Array.isArray(stations)) return [];
    const currentProjection = position ? projectPointToRouteGeometry(position) : null;
    const currentRouteKm = Number.isFinite(currentProjection?.routeKm) ? currentProjection.routeKm : 0;
    return stations
        .map((station) => {
            const routeKm = Number(station.routePreviewKm);
            const distanceFromRoute = Math.max(0, Number(station.routeDistanceFromGeometryKm || 0));
            return {
                ...station,
                distance: Number.isFinite(routeKm)
                    ? Math.max(0, routeKm - currentRouteKm) + distanceFromRoute
                    : Number(station.distance || 0),
                drivingBearingDelta: 0,
                drivingDirectionRelative: 0,
            };
        })
        .filter((station) => Number(station.distance) >= -0.2)
        .sort((a, b) => Number(a.routePreviewKm || a.distance || 0) - Number(b.routePreviewKm || b.distance || 0));
}

async function electricRouteChargingStationsForDriving(position, limit = 100) {
    if (!Array.isArray(state.drivingRouteGeometry) || state.drivingRouteGeometry.length < 2) return [];
    const key = electricRoutePreviewCacheKey();
    if (!state.electricRoutePreviewCache || state.electricRoutePreviewCache.key !== key) {
        return buildElectricRouteChargingCache(position, limit);
    }
    const stations = updateElectricRouteChargingDistances(state.electricRoutePreviewCache.stations, position)
        .slice(0, limit);
    state.electricRoutePreviewCache = {
        ...state.electricRoutePreviewCache,
        stations,
    };
    return stations;
}

async function fetchElectricDriveStations(position, radiusKm, limit = ELECTRIC_NEAREST_LIMIT) {
    if (!position || !Number.isFinite(Number(position.lat)) || !Number.isFinite(Number(position.lng))) return [];
    const params = new URLSearchParams({
        lat: String(position.lat),
        lng: String(position.lng),
        radius: String(radiusKm),
        limit: String(Math.max(limit, ELECTRIC_NEAREST_LIMIT)),
    });
    const data = await fetchJson(`/api/charging/stations.php?${params.toString()}`, { timeoutMs: 30000 });
    const bearing = visualDrivingBearing();
    return (data.stations || [])
        .map(normalizeChargingStation)
        .map((station) => {
            const stationBearing = calculateBearing(position, station);
            const bearingDelta = Number.isFinite(bearing) && Number.isFinite(stationBearing)
                ? angularDifference(bearing, stationBearing)
                : null;
            return {
                ...station,
                drivingContext: 'charging',
                drivingBearingDelta: bearingDelta,
                drivingDirectionRelative: bearingDelta,
            };
        })
        .filter((station) => {
            if (!Number.isFinite(bearing)) return true;
            if (Number(station.distance || 0) <= 0.35) return true;
            return station.drivingBearingDelta === null || station.drivingBearingDelta <= 115;
        })
        .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0))
        .slice(0, limit);
}

async function loadElectricDriveStations(position, limit = ELECTRIC_NEAREST_LIMIT) {
    const cityStations = await fetchElectricDriveStations(position, ELECTRIC_CITY_RADIUS_KM, limit);
    if (localDriveContextFor(cityStations) !== 'rural') {
        state.drivingContext = 'city';
        return cityStations.map((station) => ({ ...station, drivingContext: 'city' }));
    }
    const ruralStations = await fetchElectricDriveStations(position, ELECTRIC_RURAL_RADIUS_KM, limit);
    state.drivingContext = 'rural';
    return ruralStations.map((station) => ({ ...station, drivingContext: 'rural' }));
}

function chargingRowHtml(station, index) {
    const distance = Number.isFinite(station.distance)
        ? `${station.distance.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km`
        : station.city || '';
    const mode = station.acDc || (station.fastCharging ? 'DC' : 'AC');
    const statusClass = /betrieb/i.test(station.status || '') ? 'live' : 'muted';
    return `
        <button class="charging-row" type="button" data-charging-id="${escapeHtml(station.stationId || station.id)}">
            <span class="charging-logo branded" aria-hidden="true">${brandLogoHtml(station)}</span>
            <span class="charging-main">
                <strong>${escapeHtml(station.name || station.operatorName || 'Ladeanlage')}</strong>
                <small>${escapeHtml(station.operatorName || station.displayName || 'Betreiber unbekannt')}</small>
                <small>${escapeHtml(chargingAddress(station) || 'Adresse offen')}</small>
            </span>
            <span class="charging-power">
                <b>${escapeHtml(chargingPowerText(station))}</b>
                <small>${escapeHtml(mode)}</small>
            </span>
            <span class="charging-distance">${escapeHtml(distance)}</span>
            <span class="charging-connectors">${escapeHtml(chargingConnectorText(station))}</span>
            <span class="charging-status ${statusClass}">${escapeHtml(station.status || 'Status offen')}</span>
        </button>
    `;
}

function chargingOperatorHtml(operator, index) {
    const operatorName = operator.operatorName || '';
    return `
        <button class="charging-operator-row" type="button" data-charging-operator="${escapeHtml(operatorName)}">
            <span class="rank ${index < 3 ? 'cheap' : 'mid'}">${index + 1}</span>
            <strong>${escapeHtml(operator.operatorName || 'Betreiber unbekannt')}</strong>
            <span>${Number(operator.chargingPointCount || 0).toLocaleString('de-DE')} Ladepunkte</span>
            <small>${Number(operator.stationCount || 0).toLocaleString('de-DE')} Orte · ${Number(operator.fastChargingCount || 0).toLocaleString('de-DE')} Schnell · ${Number(operator.cityCount || 0).toLocaleString('de-DE')} Städte</small>
        </button>
    `;
}

function chargingOperatorsPanelHtml() {
    if (!state.chargingShowOperators) return '';
    if (state.chargingFilters?.operator && state.chargingFilters.operator !== 'all') return '';
    if (!state.chargingOperators.length) {
        return `
            <section class="charging-operators-panel">
                <div class="charging-operators-head">
                    <strong>Ladeanlagenbetreiber</strong>
                    <button type="button" data-charging-operators>Laden</button>
                </div>
                <p>Betreiberliste nach Ladeanlagen laden.</p>
            </section>
        `;
    }
    return `
        <section class="charging-operators-panel">
            <div class="charging-operators-head">
                <strong>Ladeanlagenbetreiber</strong>
                <button type="button" data-charging-operators>Aktualisieren</button>
            </div>
            <div class="charging-operator-list">
                ${state.chargingOperators.map(chargingOperatorHtml).join('')}
            </div>
            ${state.chargingOperators.length >= state.chargingOperatorsLimit && state.chargingOperatorsLimit < 200
                ? '<button class="charging-distribution-button" type="button" data-charging-operators-more>Weitere Betreiber laden</button>'
                : ''}
        </section>
    `;
}

async function loadChargingOperators(force = false) {
    const limit = Math.min(Math.max(Number(state.chargingOperatorsLimit || 40), 40), 200);
    const loadKey = `operators:${limit}`;
    if (!force && state.chargingOperators.length) return;
    if (state.chargingOperatorsLoadKey === loadKey) return;
    state.chargingOperatorsLoadKey = loadKey;
    try {
        const data = await fetchJson(`/api/charging/operators.php?limit=${limit}`, { timeoutMs: 45000, progress: false });
        state.chargingOperators = data.operators || [];
        if (state.listMode === 'charging' && state.view === 'list') renderChargingList();
    } catch (error) {
        if (state.listMode === 'charging') els.resultMeta.textContent = error.message || 'Betreiber konnten nicht geladen werden.';
    } finally {
        if (state.chargingOperatorsLoadKey === loadKey) state.chargingOperatorsLoadKey = null;
    }
}

function loadMoreChargingOperators() {
    state.chargingOperatorsLimit = Math.min(Number(state.chargingOperatorsLimit || 40) + 40, 200);
    loadChargingOperators(true);
}

async function loadChargingDistributionStations(requestId = beginNavigation()) {
    const data = await fetchJson('/api/charging/stations.php?distribution=1&limit=30000', { timeoutMs: 45000 });
    if (!isCurrentNavigation(requestId, 'charging')) return null;
    state.chargingStations = (data.stations || []).map(normalizeChargingStation);
    state.chargingSearchContext = 'distribution';
    state.chargingSearchRadiusKm = null;
    state.stations = chargingFilteredStations();
    return data;
}

async function applyChargingOperatorFilter(operatorName) {
    const operator = String(operatorName || '').trim();
    if (!operator) return;
    const requestId = beginNavigation();
    if (!isElectricMode()) setVehicleMode('electric');
    state.listMode = 'charging';
    state.view = 'list';
    state.cityMapMode = 'overview';
    state.chargingCityContext = null;
    state.chargingFilters = { operator, connector: 'all', minPower: 'all' };
    renderDetail(null);
    updateBottomNav();
    updateSectionHeaderTone();
    els.resultCount.textContent = operator;
    els.resultMeta.textContent = 'Alle Betreiberstandorte werden geladen ...';
    els.results.innerHTML = '<div class="empty-state">Standorte werden deutschlandweit geladen.</div>';
    try {
        await loadChargingDistributionStations(requestId);
        if (!isCurrentNavigation(requestId, 'charging')) return;
        renderChargingList();
        renderMarkers();
    } catch (error) {
        if (!isCurrentNavigation(requestId, 'charging')) return;
        els.resultMeta.textContent = error.message || 'Betreiberstandorte konnten nicht geladen werden.';
    }
}

function resetChargingOperatorFilter() {
    state.chargingFilters = { operator: 'all', connector: 'all', minPower: 'all' };
    state.chargingShowOperators = true;
    renderChargingList();
    renderMarkers();
}

function renderChargingList() {
    updateSectionHeaderTone();
    updateBottomNav();
    if (!state.chargingStations.length) {
        els.resultCount.textContent = 'Laden';
        els.resultMeta.textContent = 'Noch keine Ladeanlagen geladen.';
        els.results.innerHTML = '<div class="empty-state">Ladeanlagen werden geladen oder sind noch nicht importiert.</div>';
        return;
    }
    const visibleChargingStations = chargingFilteredStations();
    state.stations = visibleChargingStations;
    const pointCount = visibleChargingStations.reduce((sum, station) => sum + Number(station.chargingPointCount || 0), 0);
    const unitCount = visibleChargingStations.reduce((sum, station) => sum + Number(station.chargingUnitCount || 1), 0);
    const contextLabel = state.chargingCityContext?.cityName ? `${state.chargingCityContext.cityName} - ` : '';
    const activeOperator = state.chargingFilters?.operator && state.chargingFilters.operator !== 'all'
        ? state.chargingFilters.operator
        : '';
    const chargingRangeLabel = !state.chargingCityContext && Number.isFinite(Number(state.chargingSearchRadiusKm))
        ? `${state.chargingSearchContext === 'rural' ? 'Landmodus' : 'Stadtmodus'} - ${state.chargingSearchRadiusKm} km - `
        : '';
    els.resultCount.textContent = `${contextLabel}${visibleChargingStations.length}/${state.chargingStations.length} Ladeanlagen`;
    els.resultMeta.textContent = `${chargingRangeLabel}${pointCount} Ladepunkte - ${unitCount} Ladeeinrichtungen - Quelle Bundesnetzagentur, CC BY 4.0`;
    els.results.innerHTML = `
        <section class="charging-dashboard">
            <div class="charging-source-note">
                <div>
                    <strong>Elektro Laden</strong>
                    <span>Stammdaten: Bundesnetzagentur Ladesaeulenregister. Keine Live-Preise.</span>
                </div>
                <button class="charging-distribution-button" type="button" data-charging-distribution>Deutschlandkarte</button>
            </div>
            ${state.chargingCityContext ? chargingFilterOptionsHtml(state.chargingStations) : ''}
            ${chargingOperatorsPanelHtml()}
            ${activeOperator ? `
                <div class="charging-active-operator">
                    <strong>${escapeHtml(activeOperator)}</strong>
                    <button type="button" data-charging-operators-reset>Alle Betreiber</button>
                </div>
            ` : ''}
            <div class="charging-list">
                ${visibleChargingStations.length
                    ? visibleChargingStations.map((station, index) => chargingRowHtml(station, index)).join('')
                    : '<div class="empty-state">Keine Ladeanlage passt zu diesem Filter.</div>'}
            </div>
        </section>
    `;
    els.results.querySelector('[data-charging-distribution]')?.addEventListener('click', () => {
        openChargingDistributionMap(beginNavigation());
    });
    els.results.querySelector('[data-charging-operators]')?.addEventListener('click', () => loadChargingOperators(true));
    els.results.querySelector('[data-charging-operators-more]')?.addEventListener('click', () => loadMoreChargingOperators());
    els.results.querySelector('[data-charging-operators-reset]')?.addEventListener('click', resetChargingOperatorFilter);
    els.results.querySelectorAll('[data-charging-operator]').forEach((button) => {
        button.addEventListener('click', () => applyChargingOperatorFilter(button.dataset.chargingOperator));
    });
    els.results.querySelectorAll('[data-charging-filter]').forEach((select) => {
        const applyFilter = () => {
            const key = select.dataset.chargingFilter;
            state.chargingFilters = {
                ...state.chargingFilters,
                [key]: select.value,
            };
            if (key === 'operator') {
                state.chargingFilters.connector = 'all';
                state.chargingFilters.minPower = 'all';
            }
            if (key === 'connector') state.chargingFilters.minPower = 'all';
            renderChargingList();
            renderMarkers();
        };
        select.addEventListener('input', applyFilter);
        select.addEventListener('change', applyFilter);
    });
    els.results.querySelectorAll('[data-charging-id]').forEach((button) => {
        button.addEventListener('click', () => selectChargingStation(button.dataset.chargingId, true));
    });
    loadChargingOperators(false);
}

function selectChargingStation(id, pan = false) {
    const station = state.chargingStations.find((item) => (item.stationId || item.id) === id);
    if (!station) return;
    state.selectedId = id;
    state.stations = chargingFilteredStations();
    document.querySelectorAll('[data-charging-id]').forEach((item) => {
        item.classList.toggle('selected', item.dataset.chargingId === id);
    });
    renderDetail(station);
    renderMarkers();
    const marker = state.markers.get(id);
    if (pan && marker && state.map?.type !== 'fallback') {
        state.map.setView([station.lat, station.lng], Math.max(state.map.getZoom(), 15), { animate: true });
        marker.openPopup();
    }
}

async function openChargingDistributionMap(requestId = beginNavigation()) {
    if (!isElectricMode()) setVehicleMode('electric');
    state.listMode = 'charging';
    state.cityMapMode = 'overview';
    state.chargingCityContext = null;
    renderDetail(null);
    updateBottomNav();
    updateSectionHeaderTone();
    const loadKey = 'distribution';
    if (state.chargingDistributionLoadKey === loadKey) return;
    state.chargingDistributionLoadKey = loadKey;
    els.resultCount.textContent = 'Deutschlandkarte';
    els.resultMeta.textContent = 'Ladeanlagen werden deutschlandweit geladen ...';
    try {
        const data = await loadChargingDistributionStations(requestId);
        if (!isCurrentNavigation(requestId, 'charging')) return;
        state.stations = chargingFilteredStations();
        setView('map');
        renderMarkers();
        const pointCount = state.stations.reduce((sum, station) => sum + Number(station.chargingPointCount || 0), 0);
        els.resultCount.textContent = `${state.stations.length} Ladeanlagen`;
        els.resultMeta.textContent = `${chargingFilterActiveText()} - ${pointCount.toLocaleString('de-DE')} Ladepunkte deutschlandweit`;
    } catch (error) {
        if (!isCurrentNavigation(requestId, 'charging')) return;
        els.resultCount.textContent = 'Keine Deutschlandkarte';
        els.resultMeta.textContent = error.message || 'Deutschlandweite Ladeanlagen konnten nicht geladen werden.';
    } finally {
        if (state.chargingDistributionLoadKey === loadKey) state.chargingDistributionLoadKey = null;
    }
}

async function loadChargingStations(requestId = state.navRequestId) {
    if (!isCurrentNavigation(requestId, 'charging')) return;
    if (!state.selectedLocation && els.searchInput?.value?.trim()) {
        await chooseFirstSuggestion();
        if (!isCurrentNavigation(requestId, 'charging')) return;
    }
    const location = state.selectedLocation;
    const cityContext = state.chargingCityContext;
    const hasLocalLocation = !cityContext?.cityId
        && location
        && Number.isFinite(Number(location.lat))
        && Number.isFinite(Number(location.lng));
    const params = new URLSearchParams({ limit: cityContext?.cityId ? '30000' : String(ELECTRIC_NEAREST_LIMIT) });
    if (cityContext?.cityId) {
        params.set('city', cityContext.cityId);
        state.chargingSearchContext = 'city';
        state.chargingSearchRadiusKm = null;
    } else if (hasLocalLocation) {
        params.set('lat', location.lat);
        params.set('lng', location.lng);
        state.chargingSearchContext = 'city';
        state.chargingSearchRadiusKm = null;
    } else if (!cityContext?.cityId) {
        state.chargingLoadKey = null;
        els.resultCount.textContent = 'Keine Adresse';
        els.resultMeta.textContent = 'Bitte PLZ, Ort oder Adresse pruefen.';
        els.results.innerHTML = '<div class="empty-state">Zur Eingabe wurde kein Standort gefunden.</div>';
        setStatus('Bereit');
        return;
    }
    const loadKey = params.toString();
    if (state.chargingLoadKey === loadKey) {
        if (state.chargingStations.length) renderChargingList();
        else els.resultMeta.textContent = 'Ladeanlagen werden noch geladen ...';
        return;
    }
    state.chargingLoadKey = loadKey;
    state.listMode = 'charging';
    setView('list');
    updateBottomNav();
    updateSectionHeaderTone();
    els.resultCount.textContent = 'Laden';
    els.resultMeta.textContent = 'Ladeanlagen werden geladen ...';
    els.results.innerHTML = '<div class="empty-state">Elektro-Ladeanlagen werden geladen.</div>';
    try {
        let stations = [];
        if (hasLocalLocation) {
            const radiusSteps = [5, 10, ELECTRIC_CITY_RADIUS_KM];
            for (const radiusKm of radiusSteps) {
                params.set('radius', String(radiusKm));
                state.chargingSearchContext = 'city';
                state.chargingSearchRadiusKm = radiusKm;
                els.resultMeta.textContent = `Ladeanlagen bis ${radiusKm} km werden geladen ...`;
                const data = await fetchJson(`/api/charging/stations.php?${params.toString()}`, { timeoutMs: 24000 });
                if (!isCurrentNavigation(requestId, 'charging')) return;
                stations = (data.stations || []).map(normalizeChargingStation);
                if (stations.length >= ELECTRIC_NEAREST_LIMIT) break;
            }
            if (localDriveContextFor(stations) === 'rural') {
                params.set('radius', String(ELECTRIC_RURAL_RADIUS_KM));
                state.chargingSearchContext = 'rural';
                state.chargingSearchRadiusKm = ELECTRIC_RURAL_RADIUS_KM;
                els.resultMeta.textContent = `Landmodus - Ladeanlagen bis ${ELECTRIC_RURAL_RADIUS_KM} km werden geladen ...`;
                const data = await fetchJson(`/api/charging/stations.php?${params.toString()}`, { timeoutMs: 30000 });
                if (!isCurrentNavigation(requestId, 'charging')) return;
                stations = (data.stations || []).map(normalizeChargingStation);
            }
        } else {
            const data = await fetchJson(`/api/charging/stations.php?${params.toString()}`, { timeoutMs: 30000 });
            if (!isCurrentNavigation(requestId, 'charging')) return;
            stations = (data.stations || []).map(normalizeChargingStation);
        }
        state.chargingStations = stations;
        renderChargingList();
    } catch (error) {
        if (!isCurrentNavigation(requestId, 'charging')) return;
        state.chargingStations = [];
        els.resultCount.textContent = 'Keine Ladeanlagen';
        els.resultMeta.textContent = error.message || 'Ladeanlagen konnten nicht geladen werden.';
        els.results.innerHTML = '<div class="empty-state">Ladeanlagen konnten nicht geladen werden. Import eventuell noch nicht gestartet.</div>';
    } finally {
        if (state.chargingLoadKey === loadKey) state.chargingLoadKey = null;
    }
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

function highwayFromText(value) {
    const match = String(value || '').trim().toUpperCase().replace(/\s+/g, '').match(/^A\d+$/);
    return match ? match[0] : '';
}

function inferSelectedAutobahnFromSearch() {
    const highway = highwayFromText(els.searchInput?.value);
    if (!highway) return false;
    state.selectedHighway = highway;
    return true;
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
    const tankerkoenigId = tankerkoenigIdFromStation(station);
    const stationId = station.stationId || station.id || station.externalStationId || tankerkoenigId;
    return {
        autobahnMode: true,
        tankerkoenig_id: tankerkoenigId,
        stationId,
        priceStationId: tankerkoenigId,
        type: station.type || '',
        directorySource: station.directorySource || '',
        name: station.name || 'Autobahn-Tankstelle',
        brand: station.primaryFuelBrand || station.fuelBrands?.[0] || station.operator || 'Tankstelle',
        operator: station.operator || '',
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
        tankerkoenigId,
    };
}

function normalizeRouteTankpointForAutobahn(point) {
    const tankerkoenigId = String(point.priceStationId || point.tankerkoenig_id || '').replace(/^tankkoenig_/, '');
    const stationId = point.stationId || point.id || tankerkoenigId;
    const highway = String(point.routeId || point.autobahn || '').trim().toUpperCase().replace(/\s+/g, '');
    return {
        autobahnMode: true,
        routeMode: true,
        tankerkoenig_id: tankerkoenigId,
        stationId,
        priceStationId: tankerkoenigId,
        type: point.typ || '',
        directorySource: point.sourceCollection || point.source || '',
        name: point.name || 'Autobahn-Tankpunkt',
        brand: point.brand || 'Tankstelle',
        operator: point.operator || '',
        street: point.street || point.address || highway,
        house_number: point.house_number || point.houseNumber || '',
        postcode: point.postcode || point.postCode || '',
        city: point.city || '',
        lat: Number(point.lat),
        lng: Number(point.lng),
        distance: 0,
        is_open: point.isOpen ?? point.is_open ?? true,
        price: autobahnPriceValue(point, els.fuel.value),
        last_update: point.lastUpdated,
        importedAt: point.lastUpdated,
        highway,
        sideLabel: point.richtung || '',
        directionText: point.richtung || '',
        features: Array.isArray(point.features) ? point.features : [],
        typ: point.typ || '',
        direktAnAutobahn: point.direktAnAutobahn,
        abfahrtName: point.abfahrtName || null,
        abfahrtNummer: point.abfahrtNummer || null,
        streckenIndex: point.streckenIndex,
        kmPosition: point.kmPosition,
        prices: point.prices || null,
        priceMatch: point.priceMatch || null,
        tankerkoenigId,
    };
}

function mergeAutobahnStations(stations) {
    const byId = new Map(state.autobahnStations.map((station) => [stationMapId(station), station]));
    stations.forEach((station) => {
        const key = stationMapId(station);
        if (!key) return;
        byId.set(key, { ...byId.get(key), ...station });
    });
    state.autobahnStations = [...byId.values()];
    syncAutobahnVisibleStations();
}

async function loadSelectedAutobahnRouteTankpoints(target = 'map') {
    if (state.selectedHighway === 'all') return false;
    const loadKey = `route:${state.selectedHighway}:${target}`;
    if (state.autobahnRouteTankpointLoadKey === loadKey) {
        return state.stations.some((station) => station.highway === state.selectedHighway);
    }
    state.autobahnRouteTankpointLoadKey = loadKey;
    setStatus('Route');
    els.resultMeta.textContent = `${state.selectedHighway} Tankpunkte werden geladen ... Karte bleibt nutzbar.`;
    try {
        const params = new URLSearchParams({ route: state.selectedHighway });
        const data = await fetchJson(`/api/route/tankpoints.php?${params.toString()}`, { timeoutMs: 12000 });
        const routeStations = (data.tankpoints || [])
            .map(normalizeRouteTankpointForAutobahn)
            .filter((station) => stationMapId(station) && Number.isFinite(station.lat) && Number.isFinite(station.lng));
        mergeAutobahnStations(routeStations);
        setStatus('Aktuell');
        if (target === 'map' && state.view === 'map' && state.listMode === 'autobahn') {
            renderMarkers();
            els.resultCount.textContent = `${state.selectedHighway} Karte`;
            els.resultMeta.textContent = `${state.stations.length} Standorte - ${autobahnDataStandText(state.stations)}`;
        }
        return routeStations.length > 0;
    } catch (error) {
        setStatus('Route offen');
        els.resultMeta.textContent = `${state.selectedHighway} Route konnte noch nicht nachgeladen werden. Vorhandene Standorte werden angezeigt.`;
        return false;
    } finally {
        if (state.autobahnRouteTankpointLoadKey === loadKey) state.autobahnRouteTankpointLoadKey = null;
    }
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
            .filter((station) => stationMapId(station) && Number.isFinite(station.lat) && Number.isFinite(station.lng));
        const byId = new Map(state.autobahnStations.map((station) => [stationMapId(station), station]));
        updated.forEach((station) => byId.set(stationMapId(station), station));
        state.autobahnStations = [...byId.values()];
        syncAutobahnVisibleStations();
        const staleStations = state.stations.filter((station) => !hasRecentAutobahnPrice(station, USAGE_PRICE_MAX_AGE_MS));
        if (staleStations.length) {
            const liveUpdated = await refreshAutobahnLivePricesForStations(staleStations);
            const liveById = new Map(state.autobahnStations.map((station) => [stationMapId(station), station]));
            liveUpdated.forEach((station) => liveById.set(stationMapId(station), station));
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

    const current = state.stations.find((station) => stationMapId(station) === id);
    if (current && state.selectedId === id) renderDetail(current);

    try {
        const params = new URLSearchParams({
            stationId: id,
            prices: '1',
            refresh: '1',
        });
        const data = await fetchJson(`/api/autobahn/stations.php?${params.toString()}`);
        let updated = (data.stations || []).map(normalizeAutobahnStation)
            .find((station) => stationMapId(station) === id);
        if (updated && !hasRecentAutobahnPrice(updated, USAGE_PRICE_MAX_AGE_MS)) {
            [updated] = await refreshAutobahnLivePricesForStations([updated]);
        }
        if (!updated) throw new Error('Keine Preisdaten für diese Raststätte gefunden.');

        const byId = new Map(state.autobahnStations.map((station) => [stationMapId(station), station]));
        byId.set(id, updated);
        state.autobahnStations = [...byId.values()];
        syncAutobahnVisibleStations();

        if (state.listMode === 'autobahn') renderResults();
        renderMarkers();
        if (state.selectedId === id) {
            renderDetail(state.stations.find((station) => stationMapId(station) === id) || updated);
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

function activateAutobahnHighway(highway, target = 'list') {
    const nextHighway = String(highway || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^A\d+$/.test(nextHighway)) return;
    state.selectedHighway = nextHighway;
    syncAutobahnVisibleStations();
    renderAutobahnList();
    loadSelectedAutobahnRouteTankpoints(target).then((loaded) => {
        if (target === 'map' && loaded) openAutobahnMap({ skipRouteLoad: true });
        else if (target !== 'map' && loaded) renderAutobahnList();
    }).catch(() => null);
    refreshSelectedAutobahnPrices(target).catch((error) => {
        els.resultMeta.textContent = error.message;
        setStatus('Fehler');
    });
}

function activateAllAutobahns() {
    state.selectedHighway = 'all';
    syncAutobahnVisibleStations();
    renderAutobahnList();
    if (state.view === 'map') openAutobahnMap();
}

function autobahnDirectionLabel(station) {
    const raw = String(station?.sideLabel || station?.directionText || station?.richtung || '').trim();
    if (!raw) return '';
    const normalized = raw
        .replace(/^richtung\s*/i, '')
        .replace(/^rg[:\s]*/i, '')
        .trim();
    if (!normalized || normalized === '-' || /^unbekannt$/i.test(normalized) || /^\.+$/.test(normalized)) return '';
    return `RG: ${normalized}`;
}

function autobahnDirectionMetaHtml(station, className = 'autobahn-meta') {
    const directionLabel = autobahnDirectionLabel(station);
    return `<span class="${className}"${directionLabel ? '' : ' aria-hidden="true"'}>${escapeHtml(directionLabel)}</span>`;
}

function autobahnRowHtml(station, priceThresholds = thresholdsFor(state.stations)) {
    const features = station.features?.length ? station.features.slice(0, 3).join(', ') : 'Services nicht angegeben';
    const highwayLabel = station.highway || 'A';
    const rankClass = `${markerClass(station, priceThresholds)} ${autobahnKindClass(station)}`;
    const kindLabel = autobahnKindLabel(station);
    const stationAddress = address(station) || station.operator || (isAutohofStation(station) ? 'Autohof' : 'Tankstelle');
    return `
        <button class="autobahn-row" type="button" data-autobahn-station-id="${escapeHtml(stationMapId(station))}">
            <span class="rank ${escapeHtml(rankClass)}">${escapeHtml(highwayLabel)}</span>
            ${brandLogoHtml(station)}
            <span class="autobahn-main">
                <strong>${escapeHtml(station.name || 'Autobahn-Tankstelle')}</strong>
                <small>${escapeHtml(kindLabel)} - ${escapeHtml(station.brand || 'Tankstelle')} - ${escapeHtml(stationAddress)}</small>
                ${tankRastBadgeHtml(station)}
            </span>
            ${autobahnDirectionMetaHtml(station)}
            <span class="autobahn-services">${escapeHtml(features)}</span>
        </button>
    `;
}

function autobahnRowHtmlDetailed(station, priceThresholds = thresholdsFor(state.stations)) {
    const features = station.features?.length ? station.features.slice(0, 3).join(', ') : 'Services nicht angegeben';
    const priceStand = autobahnPriceStand(station);
    const directionLabel = autobahnDirectionLabel(station);
    const serviceText = [directionLabel, priceStand ? `Stand ${formatDateTime(priceStand)}` : features].filter(Boolean).join(' - ');
    const highwayLabel = station.highway || 'A';
    const rankClass = `${markerClass(station, priceThresholds)} ${autobahnKindClass(station)}`;
    const kindLabel = autobahnKindLabel(station);
    const stationAddress = address(station) || station.operator || (isAutohofStation(station) ? 'Autohof' : 'Tankstelle');
    return `
        <button class="autobahn-row" type="button" data-autobahn-station-id="${escapeHtml(stationMapId(station))}">
            <span class="rank ${escapeHtml(rankClass)}">${escapeHtml(highwayLabel)}</span>
            ${brandLogoHtml(station)}
            <span class="autobahn-main">
                <strong>${escapeHtml(station.name || 'Autobahn-Tankstelle')}</strong>
                <small>${escapeHtml(kindLabel)} - ${escapeHtml(station.brand || 'Tankstelle')} - ${escapeHtml(stationAddress)}</small>
                ${tankRastBadgeHtml(station)}
                <small>${escapeHtml(autobahnPriceSummary(station))}</small>
            </span>
            ${selectedFuelPriceHtml(station, 'autobahn-meta')}
            <span class="autobahn-services">${escapeHtml(serviceText)}</span>
        </button>
    `;
}

function renderAutobahnList() {
    setCityMode(false);
    setDirectoryMode(true);
    syncAutobahnVisibleStations();
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
    const highways = autobahnHighways();
    els.results.innerHTML = `
        <section class="autobahn-dashboard">
            <div class="autobahn-compact-toolbar">
                <label class="autobahn-filter">
                    <select data-autobahn-filter>
                        <option value="all"${state.selectedHighway === 'all' ? ' selected' : ''}>Alle Autobahnen</option>
                        ${highways.map((highway) => `<option value="${escapeHtml(highway)}"${state.selectedHighway === highway ? ' selected' : ''}>${escapeHtml(highway)}</option>`).join('')}
                    </select>
                </label>
            </div>
            <div class="autobahn-list">
                ${groups.map(([highway, stations]) => `
                    <section class="autobahn-group">
                        <button class="autobahn-group-title" type="button" data-autobahn-highway="${escapeHtml(highway)}">
                            <strong>${escapeHtml(highway)}</strong>
                            <span>${stations.length} Standorte</span>
                        </button>
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
            loadSelectedAutobahnRouteTankpoints(state.view === 'map' ? 'map' : 'list').then((loaded) => {
                if (state.view === 'map' && loaded) openAutobahnMap({ skipRouteLoad: true });
                else if (state.view !== 'map' && loaded) renderAutobahnList();
            }).catch(() => null);
            refreshSelectedAutobahnPrices(state.view === 'map' ? 'map' : 'list').catch((error) => {
                els.resultMeta.textContent = error.message;
                setStatus('Fehler');
            });
            return;
        }
        if (state.view === 'map') openAutobahnMap();
    });
    els.results.querySelectorAll('[data-autobahn-highway]').forEach((button) => {
        button.addEventListener('click', () => {
            activateAutobahnHighway(button.dataset.autobahnHighway, state.view === 'map' ? 'map' : 'list');
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
            .filter((station) => stationMapId(station) && Number.isFinite(station.lat) && Number.isFinite(station.lng));
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

async function openAutobahnMap(options = {}) {
    state.listMode = 'autobahn';
    setDirectoryMode(true);
    if (state.selectedHighway === 'all') inferSelectedAutobahnFromSearch();
    if (!state.autobahnStations.length) {
        loadAutobahnStations('map', beginNavigation());
        return;
    }
    syncAutobahnVisibleStations();
    setView('map');
    renderMarkers();
    els.resultCount.textContent = state.selectedHighway === 'all' ? 'Autobahn-Karte' : `${state.selectedHighway} Karte`;
    els.resultMeta.textContent = `${state.stations.length} Standorte - ${autobahnDataStandText(state.stations)}`;
    if (state.selectedHighway !== 'all' && !options.skipRouteLoad) {
        loadSelectedAutobahnRouteTankpoints('map').then((loaded) => {
            if (loaded && state.view === 'map' && state.listMode === 'autobahn') renderMarkers();
        }).catch(() => null);
    }
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
        vehicleMode: els.vehicleMode?.value || state.vehicleMode || DEFAULT_VEHICLE_MODE,
        radius: els.radius.value,
        fuel: els.fuel.value,
        limit: els.limit.value,
        brand: els.brand.value,
        openOnly: els.openOnly.checked,
        pricedOnly: els.pricedOnly.checked,
    };
    localStorage.setItem('tankprofi_user_settings', JSON.stringify(settings));
}

function setSelectOptions(select, values, suffix = '') {
    if (!select) return;
    const current = String(select.value || '');
    select.replaceChildren(...values.map((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = suffix ? `${value} ${suffix}` : value;
        return option;
    }));
    select.value = values.includes(current) ? current : values[0];
}

function syncVehicleOptionSets({ preferredRadius = null, preferredLimit = null } = {}) {
    const isElectric = state.vehicleMode === 'electric';
    const radiusOptions = isElectric ? ELECTRIC_RADIUS_OPTIONS : COMBUSTION_RADIUS_OPTIONS;
    const limitOptions = isElectric ? ELECTRIC_LIMIT_OPTIONS : COMBUSTION_LIMIT_OPTIONS;
    setSelectOptions(els.radius, radiusOptions, 'km');
    setSelectOptions(els.limit, limitOptions, isElectric ? 'Ladeanlagen' : '');
    if (preferredRadius && radiusOptions.includes(String(preferredRadius))) {
        els.radius.value = String(preferredRadius);
    } else if (isElectric && !radiusOptions.includes(String(els.radius.value))) {
        els.radius.value = '25';
    }
    if (preferredLimit && limitOptions.includes(String(preferredLimit))) {
        els.limit.value = String(preferredLimit);
    } else if (isElectric && !limitOptions.includes(String(els.limit.value))) {
        els.limit.value = '50';
    }
}

function restoreUserSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('tankprofi_user_settings') || 'null');
        if (!settings) return;
        if (settings.vehicleMode) {
            setVehicleMode(settings.vehicleMode, { persist: false, silent: true });
        }
        syncVehicleOptionSets({ preferredRadius: settings.radius, preferredLimit: settings.limit });
        if (settings.fuel && [...els.fuel.options].some((option) => option.value === String(settings.fuel))) {
            els.fuel.value = String(settings.fuel);
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

function setVehicleMode(mode, options = {}) {
    const nextMode = mode === 'electric' ? 'electric' : DEFAULT_VEHICLE_MODE;
    const modeChanged = state.vehicleMode !== nextMode;
    state.vehicleMode = nextMode;
    if (modeChanged) {
        beginNavigation();
        state.chargingLoadKey = null;
        state.chargingDistributionLoadKey = null;
        state.chargingOperatorsLoadKey = null;
    }
    if (els.vehicleMode) els.vehicleMode.value = nextMode;
    els.appShell?.classList.toggle('vehicle-electric', nextMode === 'electric');
    els.appShell?.classList.toggle('vehicle-combustion', nextMode !== 'electric');
    syncHeaderVehicleMode();
    updateSectionHeaderTone();
    syncVehicleOptionSets();
    if (options.persist !== false) {
        saveUserSettings();
    }
    if (!options.silent && nextMode === 'electric') {
        setStatus('Elektro vorgemerkt');
        if (els.resultMeta && state.listMode === 'results' && !state.stations.length) {
            els.resultMeta.textContent = 'Ladesaeulen-Modus ist vorgemerkt. Die Datenquelle wird als naechster Schritt angebunden.';
        }
    }
}

function clearListForVehicleSwitch(nextMode) {
    state.selectedId = null;
    state.stations = [];
    state.chargingStations = [];
    state.chargingLoadKey = null;
    state.chargingDistributionLoadKey = null;
    state.chargingOperatorsLoadKey = null;
    state.cityMapMode = 'overview';
    state.selectedCityId = null;
    state.selectedHighway = 'all';
    state.chargingCityContext = null;
    state.chargingFilters = { operator: 'all', connector: 'all', minPower: 'all' };
    state.chargingShowOperators = false;
    renderDetail(null);
    setView('list');
    if (nextMode === 'electric') {
        state.listMode = 'charging';
        updateBottomNav();
        updateSectionHeaderTone();
        els.resultCount.textContent = 'Laden';
        els.resultMeta.textContent = 'Ladeanlagen werden neu geladen ...';
        els.results.innerHTML = '<div class="empty-state">Elektro-Ladeanlagen werden neu geladen.</div>';
        return;
    }
    state.listMode = 'results';
    updateBottomNav();
    updateSectionHeaderTone();
    renderNormalSearchLoading('Tankstellen werden neu geladen ...');
}

function releaseStartupVehicleChoicePending() {
    state.startupLocationPending = false;
    setStartupInteractionLock(false);
}

function hasUsableLocation(location) {
    return Boolean(location)
        && Number.isFinite(Number(location.lat))
        && Number.isFinite(Number(location.lng));
}

function vehicleSwitchSearchText() {
    const query = String(els.searchInput?.value || '').trim();
    if (!query) return '';
    const reservedLabels = new Set([
        'aktueller standort',
        'deutschland mitte',
    ]);
    return reservedLabels.has(query.toLowerCase()) ? '' : query;
}

async function resolveVehicleSwitchSearchLocation() {
    if (state.selectedLocation
        && Number.isFinite(Number(state.selectedLocation.lat))
        && Number.isFinite(Number(state.selectedLocation.lng))) {
        return true;
    }
    if (vehicleSwitchSearchText()) {
        await chooseFirstSuggestion();
        if (hasUsableLocation(state.selectedLocation)) return true;
    }
    const lastLocation = loadLastLocation();
    if (hasUsableLocation(lastLocation)) {
        state.selectedLocation = lastLocation;
        if (els.searchInput) els.searchInput.value = lastLocation.label || '';
        if (els.suggestions) els.suggestions.innerHTML = '';
        return true;
    }
    return false;
}

function resetCombustionSearchBeforeReload() {
    state.normalSearchLastKey = null;
    state.normalSearchLastLoadedAt = null;
    state.normalSearchLastMeta = null;
    state.normalSearchSnapshotBeforeDrive = null;
    state.normalSearchSnapshotBeforeSection = null;
    if (els.brand) els.brand.value = 'all';
    if (els.radius && !COMBUSTION_RADIUS_OPTIONS.includes(String(els.radius.value))) {
        els.radius.value = '25';
    }
}

async function reloadListAfterVehicleSwitch(nextMode) {
    if (nextMode === 'electric') {
        loadNearestChargingStationsFromCurrentLocation().catch(() => null);
        return;
    }
    resetCombustionSearchBeforeReload();
    const hasLocation = await resolveVehicleSwitchSearchLocation();
    if (!hasLocation) {
        els.resultCount.textContent = 'Standort';
        els.resultMeta.textContent = 'Aktueller Standort wird ermittelt ...';
        els.results.innerHTML = '<div class="empty-state">Standort wird ermittelt, dann werden Tankstellen geladen.</div>';
        await useCurrentLocation({
            timeoutMs: 12000,
            onFail: () => {
                els.resultCount.textContent = 'Standort offen';
                els.resultMeta.textContent = 'Standort konnte nicht ermittelt werden.';
                els.results.innerHTML = '<div class="empty-state">Bitte Standortfreigabe erlauben oder eine PLZ eingeben.</div>';
            },
        });
        return;
    }
    els.resultMeta.textContent = 'Tankstellen werden geladen ...';
    loadStations({ force: true }).catch((error) => {
        setStatus('Fehler');
        els.resultCount.textContent = 'Keine Daten';
        els.resultMeta.textContent = error?.message || 'Tankstellen konnten nicht geladen werden.';
        els.results.innerHTML = '<div class="empty-state">Tankstellen konnten nicht geladen werden.</div>';
    });
}

function chooseVehicleMode(mode) {
    const nextMode = mode === 'electric' ? 'electric' : DEFAULT_VEHICLE_MODE;
    releaseStartupVehicleChoicePending();
    setVehicleMode(nextMode);
    if (els.vehicleChoice) els.vehicleChoice.hidden = true;
    clearListForVehicleSwitch(nextMode);
    reloadListAfterVehicleSwitch(nextMode).catch(() => null);
}

function openVehicleChoice() {
    if (!els.vehicleChoice) return;
    setSettingsOpen(false);
    setHelpOpen(false);
    els.vehicleChoice.hidden = false;
    window.setTimeout(() => {
        const activeChoice = els.vehicleChoice.querySelector(`[data-vehicle-choice="${state.vehicleMode}"]`)
            || els.vehicleChoice.querySelector('[data-vehicle-choice]');
        activeChoice?.focus?.();
    }, 0);
}

function showVehicleChoiceIfNeeded() {
    if (!els.vehicleChoice) return;
    els.vehicleChoice.hidden = false;
}

function loadFavorites() {
    try {
        state.favorites = JSON.parse(localStorage.getItem('tankprofi_favorites') || '[]');
    } catch {
        state.favorites = [];
    }
    try {
        state.chargingFavorites = JSON.parse(localStorage.getItem('tankprofi_charging_favorites') || '[]');
    } catch {
        state.chargingFavorites = [];
    }
}

function saveFavorites() {
    localStorage.setItem('tankprofi_favorites', JSON.stringify(state.favorites));
    if (state.listMode === 'favorites' && !isElectricMode()) renderResults();
}

function saveChargingFavorites() {
    localStorage.setItem('tankprofi_charging_favorites', JSON.stringify(state.chargingFavorites));
    if (state.listMode === 'favorites' && isElectricMode()) renderResults();
}

function isFavorite(id) {
    return state.favorites.some((favorite) => favorite.tankerkoenig_id === id);
}

function isChargingFavorite(id) {
    return state.chargingFavorites.some((favorite) => (favorite.stationId || favorite.id) === id);
}

function chargingFavoriteFromStation(station) {
    return {
        ...station,
        stationId: station.stationId || station.id,
        savedAt: new Date().toISOString(),
    };
}

function stationForChargingFavorite(favorite) {
    const id = favorite.stationId || favorite.id;
    const current = state.chargingStations.find((station) => (station.stationId || station.id) === id);
    return current || {
        ...favorite,
        chargingMode: true,
    };
}

function toggleChargingFavorite(station) {
    if (!station) return;
    const id = station.stationId || station.id;
    if (!id) return;

    if (isChargingFavorite(id)) {
        state.chargingFavorites = state.chargingFavorites.filter((favorite) => (favorite.stationId || favorite.id) !== id);
    } else {
        state.chargingFavorites.unshift(chargingFavoriteFromStation(station));
    }

    saveChargingFavorites();
    renderDetail(station);
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
            ${brandLogoHtml(station)}
            <button class="favorite-open" type="button">
                <strong>${escapeHtml(station.name || 'Tankstelle')}</strong>
                <span>${escapeHtml(compactAddress(station) || station.brand || 'Favorit')}</span>
            </button>
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

function renderChargingFavoriteRows() {
    if (!state.chargingFavorites.length || !els.results) {
        return;
    }

    const favoriteStations = state.chargingFavorites.map(stationForChargingFavorite);
    els.results.innerHTML = `
        <section class="charging-dashboard">
            <div class="charging-source-note">
                <div>
                    <strong>Elektro-Favoriten</strong>
                    <span>Eigene Favoriten fuer Ladeanlagen.</span>
                </div>
            </div>
            <div class="charging-list">
                ${favoriteStations.map((station, index) => chargingRowHtml(station, index)).join('')}
            </div>
        </section>
    `;
    els.results.querySelectorAll('[data-charging-id]').forEach((button) => {
        button.addEventListener('click', () => {
            state.listMode = 'favorites';
            selectChargingFavorite(button.dataset.chargingId);
        });
    });
}

function selectChargingFavorite(id) {
    const favorite = state.chargingFavorites.find((item) => (item.stationId || item.id) === id);
    if (!favorite) return;
    state.selectedId = id;
    renderDetail(stationForChargingFavorite(favorite));
    updateFavoritesButton();
}

function updateFavoritesButton() {
    const active = state.listMode === 'favorites';
    updateBottomNav();
}

function updateBottomNav() {
    setCityMode(state.listMode === 'cities');
    setDirectoryMode(state.listMode === 'autobahn');
    els.appShell.classList.toggle('driving-mode', state.listMode === 'driving');
    els.appShell.classList.toggle('favorites-mode', state.listMode === 'favorites');
    els.appShell.classList.toggle('charging-mode', state.listMode === 'charging');
    updateSectionHeaderTone();
    els.driveMode?.classList.toggle('active', state.listMode === 'driving');
    if (els.driveMode) {
        els.driveMode.replaceChildren();
        const badge = document.createElement('span');
        badge.setAttribute('aria-hidden', 'true');
        if (state.drivingActive) {
            const icon = document.createElement('span');
            icon.className = 'drive-back-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = '←';
            els.driveMode.append(icon, document.createTextNode('Zurück'));
            els.driveMode.setAttribute('aria-label', 'Drive beenden und zurück');
            els.driveMode.title = 'Zurück';
        } else {
            badge.textContent = 'A';
            els.driveMode.append(badge, document.createTextNode('Drive'));
            els.driveMode.setAttribute('aria-label', 'Drive starten');
            els.driveMode.title = 'Drive starten';
        }
        els.driveMode.setAttribute('aria-pressed', state.drivingActive ? 'true' : 'false');
    }
    els.bottomNavButtons.forEach((button) => {
        const action = button.dataset.action;
        const active = (action === 'map' && state.view === 'map')
            || (action === 'favorites' && state.view === 'list' && state.listMode === 'favorites')
            || (action === 'cities' && state.listMode === 'cities')
            || (action === 'autobahn' && state.view === 'list' && state.listMode === 'autobahn')
            || (action === 'charging' && state.listMode === 'charging' && state.chargingShowOperators)
            || (action === 'settings' && els.settingsSheet?.classList.contains('open'))
            || (action === 'list' && state.view === 'list' && !els.detail.classList.contains('visible') && (
                state.listMode === 'results'
                || (state.listMode === 'charging' && !state.chargingShowOperators)
            ));
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
        const quickData = await fetchJson('/api/admin/stats.php?quick=1', { timeoutMs: 20000 });
        renderTankprofiStatsData(quickData);
        if (els.tankprofiKoenigAuditStats) els.tankprofiKoenigAuditStats.textContent = 'Audit und Logs werden geladen ...';
        if (els.tankprofiDeviceStats) els.tankprofiDeviceStats.textContent = 'Geraetedaten werden geladen ...';
        els.tankprofiStatsStatus.textContent = 'Basisdaten geladen - Logs werden nachgeladen ...';
        const fullData = await fetchJson('/api/admin/stats.php', { timeoutMs: 90000 });
        renderTankprofiStatsData(fullData);
    } catch (error) {
        els.tankprofiStatsStatus.textContent = error.message || 'Datenbestand konnte nicht geladen werden.';
    }
}

function renderTankprofiStatsData(data) {
    const format = (value) => new Intl.NumberFormat('de-DE').format(Number(value || 0));
    els.tankprofiAddressCount.textContent = format(data.addresses);
    if (els.tankprofiStationCount) els.tankprofiStationCount.textContent = format(data.stations);
    if (els.tankprofiAutohofCount) els.tankprofiAutohofCount.textContent = format(data.autohoefe);
    if (els.tankprofiRastCount) els.tankprofiRastCount.textContent = format(data.raststaetten);
    if (els.tankprofiChargingCount) els.tankprofiChargingCount.textContent = format(data.ladeparks);
    if (els.tankprofiTruckCount) els.tankprofiTruckCount.textContent = format(data.truckStops);
    if (els.tankprofiElectricStationCount) els.tankprofiElectricStationCount.textContent = format(data.electric?.chargingStations);
    if (els.tankprofiElectricBnetzaCount) els.tankprofiElectricBnetzaCount.textContent = format(data.electric?.bnetzaStations);
    if (els.tankprofiElectricTeslaCount) els.tankprofiElectricTeslaCount.textContent = format(data.electric?.teslaSuperchargers);
    if (els.tankprofiElectricFastCount) els.tankprofiElectricFastCount.textContent = format(data.electric?.fastChargingStations);
    if (els.tankprofiKoenigSearchCount) els.tankprofiKoenigSearchCount.textContent = format(data.tankkoenig?.appSearches);
    if (els.tankprofiBerlinKoenigCount) {
        const berlinStats = (data.tankkoenig?.cityStats || []).find((item) => item.city === 'berlin');
        els.tankprofiBerlinKoenigCount.textContent = data.partial ? '...' : format(berlinStats?.uniqueKoenigIds);
    }
    if (!data.partial && els.tankprofiKoenigAuditStats) {
        const audit = data.tankkoenig?.audit || {};
        const topSource = audit.sourceCounts?.[0];
        els.tankprofiKoenigAuditStats.innerHTML = [
            ['Koenig-IDs', audit.uniqueKoenigIds],
            ['Preis <= 2h', audit.freshPrice2h],
            ['Preis <= 24h', audit.freshPrice24h],
            ['ohne Preis', audit.noStoredPrice],
            ['ohne ID', audit.withoutKoenigId],
            ['ID doppelt', audit.duplicateKoenigIdGroups],
            ['Adressgruppen >1', audit.multiAddressGroups],
            ['Koordinaten >1', audit.multiCoordinateGroups],
            [topSource ? `Top Quelle ${topSource.label}` : 'Top Quelle', topSource?.count],
        ].map(([label, value]) => `<span><b>${escapeHtml(format(value))}</b>${escapeHtml(label)}</span>`).join('');
    }
    if (!data.partial && els.tankprofiDeviceStats) {
        const devices = data.tankkoenig?.deviceStats || [];
        els.tankprofiDeviceStats.innerHTML = devices.length
            ? devices.map((item) => `<span><b>${escapeHtml(format(item.count))}</b>${escapeHtml(item.label)}</span>`).join('')
            : 'Noch keine Geraetedaten.';
    }
    els.tankprofiStatsStatus.textContent = Number.isFinite(Date.parse(data.updatedAt))
        ? `Stand ${new Date(data.updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr${data.partial ? ' - Logs folgen' : ''}`
        : 'Aktualisiert';
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
            if (isElectricMode()) {
                prepareChargingSearch(false);
                loadChargingStations(beginNavigation());
                return;
            }
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

async function loadNearestChargingStationsFromCurrentLocation() {
    setVehicleMode('electric', { persist: false, silent: true });
    prepareChargingSearch(false);
    state.chargingCityContext = null;
    state.chargingFilters = { operator: 'all', connector: 'all', minPower: 'all' };
    state.chargingShowOperators = false;
    state.chargingStations = [];
    renderDetail(null);
    updateBottomNav();
    updateSectionHeaderTone();
    const query = String(els.searchInput?.value || '').trim();
    const selectedLabel = String(state.selectedLocation?.label || '').trim();
    if (query && query !== selectedLabel) {
        state.selectedLocation = null;
        state.chargingLoadKey = null;
        els.resultCount.textContent = 'Laden';
        els.resultMeta.textContent = 'Adresse wird gesucht ...';
        els.results.innerHTML = '<div class="empty-state">Ladeanlagen zur eingegebenen Adresse werden geladen.</div>';
        await loadChargingStations(beginNavigation());
        return;
    }
    els.resultCount.textContent = 'Laden';
    els.resultMeta.textContent = 'Aktueller Standort wird ermittelt ...';
    els.results.innerHTML = '<div class="empty-state">Die 100 naechsten Ladepunkte werden geladen.</div>';
    await useCurrentLocation({
        timeoutMs: 12000,
        onFail: () => {
            els.resultCount.textContent = 'Standort offen';
            els.resultMeta.textContent = 'Standort konnte nicht ermittelt werden.';
            els.results.innerHTML = '<div class="empty-state">Bitte Standortfreigabe erlauben, damit die naechsten Ladepunkte geladen werden koennen.</div>';
        },
    });
}

function clearListSearchInputForManualEntry() {
    if (state.listMode !== 'results' || state.view !== 'list') return;
    if (!els.searchInput.value.trim()) return;
    els.searchInput.value = '';
    els.suggestions.innerHTML = '';
}

function currentPosition(options = {}) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timeoutMs = Number(options.timeoutMs || 9000);
        const safetyTimer = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error('Standortabfrage dauert zu lange.'));
        }, timeoutMs + 1800);
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(safetyTimer);
            callback(value);
        };
        navigator.geolocation.getCurrentPosition(
            (position) => finish(resolve, position),
            (error) => finish(reject, error),
            {
                enableHighAccuracy: options.enableHighAccuracy !== false,
                timeout: timeoutMs,
                maximumAge: Number(options.maximumAgeMs ?? 60000),
            },
        );
    });
}

async function useCurrentLocation(options = {}) {
    const startedAt = Date.now();
    if (!navigator.geolocation) {
        if (typeof options.onFail === 'function') {
            options.onFail();
            return;
        }
        els.resultMeta.textContent = 'Standortfreigabe wird nicht unterstützt.';
        return;
    }

    if (options.startup) state.startupLocationPending = true;
    if (options.startup) setStartupInteractionLock(true, 'Standort wird ermittelt ...');
    setStatus('Ortung');
    if (options.startup && !options.hasImmediateFallback) {
        els.resultMeta.textContent = 'Standort wird waehrend des Ladens ermittelt ...';
    } else if (!options.startup) {
        els.resultMeta.textContent = 'Aktueller Standort wird ermittelt ...';
    }

    let position;
    try {
        position = await currentPosition({
            timeoutMs: options.startup ? Number(options.timeoutMs || 3200) : Number(options.timeoutMs || 12000),
            maximumAgeMs: options.startup ? 300000 : 0,
            enableHighAccuracy: !options.startup,
        });
    } catch {
        if (options.startup) {
            const remainingMs = STARTUP_LOCATION_MESSAGE_MIN_MS - (Date.now() - startedAt);
            if (remainingMs > 0) {
                await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
            }
        }
        setStatus('Bereit');
        els.resultCount.textContent = 'Standort offen';
        els.resultMeta.textContent = 'Standort konnte nicht ermittelt werden.';
        els.results.innerHTML = '<div class="empty-state">Standort konnte nicht ermittelt werden. Bitte erneut versuchen oder eine PLZ eingeben.</div>';
        if (typeof options.onFail === 'function') options.onFail();
    } finally {
        if (options.startup) state.startupLocationPending = false;
    }

    if (!position) {
        if (options.startup) setStartupInteractionLock(false);
        return;
    }

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const previousLocation = state.selectedLocation ? { ...state.selectedLocation } : null;
    const movementKm = previousLocation
        && Number.isFinite(Number(previousLocation.lat))
        && Number.isFinite(Number(previousLocation.lng))
        ? routeDistanceKm(previousLocation.lat, previousLocation.lng, lat, lng)
        : Number.POSITIVE_INFINITY;
    const minimumMoveKm = Number(options.updateOnlyIfMovedKm || 0);
    if (minimumMoveKm > 0 && Number.isFinite(movementKm) && movementKm < minimumMoveKm) {
        if (options.startup) hideSplashScreen();
        setStatus('Bereit');
        return;
    }

    let label = options.fastLabel || 'Aktueller Standort';
    state.selectedLocation = {
        label,
        lat,
        lng,
    };
    saveLastLocation(state.selectedLocation);
    els.searchInput.value = label;
    els.suggestions.innerHTML = '';
    if (isElectricMode()) {
        state.listMode = 'charging';
        state.cityMapMode = 'overview';
        state.selectedCityId = null;
        state.selectedHighway = 'all';
        renderDetail(null);
        try {
            await loadChargingStations(beginNavigation());
        } catch (error) {
            els.resultCount.textContent = 'Standort gefunden';
            els.resultMeta.textContent = error?.message || 'Ladepunkte konnten noch nicht geladen werden.';
            hideSplashScreen();
        } finally {
            if (options.startup) setStartupInteractionLock(false);
        }
        return;
    }
    state.listMode = 'results';
    state.cityMapMode = 'overview';
    state.selectedCityId = null;
    state.selectedHighway = 'all';
    els.resultCount.textContent = 'Standort gefunden';
    els.resultMeta.textContent = 'Tankstellen werden geladen ...';
    renderDetail(null);
    try {
        await loadStations({
            force: !options.startup,
            startup: Boolean(options.startup),
        });
    } catch (error) {
        els.resultCount.textContent = 'Standort gefunden';
        els.resultMeta.textContent = error?.message || 'Tankstellen konnten noch nicht geladen werden.';
        hideSplashScreen();
    } finally {
        if (options.startup) setStartupInteractionLock(false);
    }
    reverseGeocode(lat, lng).then((resolvedLabel) => {
        if (!resolvedLabel || state.selectedLocation?.lat !== lat || state.selectedLocation?.lng !== lng) return;
        state.selectedLocation = { label: resolvedLabel, lat, lng };
        saveLastLocation(state.selectedLocation);
        if (els.searchInput) els.searchInput.value = resolvedLabel;
    }).catch(() => null);
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
        if (isElectricMode()) {
            state.listMode = 'charging';
            loadChargingStations(beginNavigation());
            return;
        }
        loadStations({ startup: true });
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
    if (isElectricMode()) {
        state.listMode = 'charging';
        loadChargingStations(beginNavigation());
        return;
    }
    loadStations({ startup: true });
}

function restoreStartState() {
    const lastLocation = loadLastLocation();
    if (lastLocation) {
        els.searchInput.value = '';
        els.resultMeta.textContent = 'Aktueller Standort wird ermittelt ...';
    } else {
        els.resultMeta.textContent = 'Standort wird waehrend des Ladens ermittelt ...';
    }

    useCurrentLocation({
        startup: true,
        hasImmediateFallback: false,
        timeoutMs: lastLocation ? 6200 : 6800,
        updateOnlyIfMovedKm: 0,
        onFail: () => {
            state.selectedLocation = null;
            if (els.searchInput) els.searchInput.value = '';
            setStatus('Bereit');
            els.resultCount.textContent = 'Standort offen';
            els.resultMeta.textContent = 'Standort konnte nicht ermittelt werden.';
            els.results.innerHTML = '<div class="empty-state">Bitte Standort antippen. Die letzte Adresse wird beim Start nicht automatisch geladen.</div>';
            hideSplashScreen();
        },
    });

    window.setTimeout(() => {
        if (state.startupLocationPending && lastLocation) {
            state.startupLocationPending = false;
            state.selectedLocation = null;
            if (els.searchInput) els.searchInput.value = '';
            setStartupInteractionLock(false);
            setStatus('Bereit');
            els.resultCount.textContent = 'Standort offen';
            els.resultMeta.textContent = 'Standort dauert zu lange.';
            els.results.innerHTML = '<div class="empty-state">Bitte Standort antippen. Keine alte Adresse wird automatisch geladen.</div>';
            hideSplashScreen();
            return;
        }
        loadStartupFallbackList();
    }, lastLocation ? 7000 : 7600);
}

function bindEvents() {
    updateViewportHeightVar();
    window.addEventListener('resize', updateViewportHeightVar);
    window.visualViewport?.addEventListener('resize', updateViewportHeightVar);
    window.visualViewport?.addEventListener('scroll', updateViewportHeightVar);
    els.searchInput.addEventListener('focus', clearDeliveredSearchText);
    els.searchInput.addEventListener('pointerdown', clearListSearchInputForManualEntry);
    els.searchInput.addEventListener('input', updateSuggestions);
    els.searchInput.addEventListener('keydown', (event) => {
        if (isInteractionLocked()) {
            event.preventDefault();
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            runManualSearch().catch(() => null);
        }
    });
    els.searchButton.addEventListener('click', () => {
        if (isInteractionLocked()) return;
        runManualSearch().catch(() => null);
    });
    els.locationButton.addEventListener('click', () => {
        if (isInteractionLocked()) return;
        runCurrentLocationSearch({ timeoutMs: 12000 });
    });
    els.refresh.addEventListener('click', () => {
        prepareNormalSearch(false);
        loadStations({ force: true });
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
    document.addEventListener('visibilitychange', handleDriveWakeLockVisibility);
    els.results.addEventListener('pointerdown', () => {
        if (state.listMode === 'driving' && state.view === 'list') revealDrivingControls();
    });
    els.results.addEventListener('scroll', () => {
        if (els.results.scrollTop > 4) scheduleDrivingListAutoTop();
    }, { passive: true });
    els.viewButtons.forEach((button) => {
        button.addEventListener('click', () => setView(button.dataset.view));
    });
    els.resultCount.addEventListener('click', (event) => {
        if (!event.target.closest('[data-driving-header-view="list"]')) return;
        if (state.listMode !== 'driving') return;
        setView('list');
        renderDrivingModeList();
    });
    els.bottomNavButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (isInteractionLocked()) return;
            const action = button.dataset.action;
            const navRequestId = beginNavigation();
            syncEffectiveVehicleMode();
            renderDetail(null);
            if (action === 'map') {
                if (isElectricMode() && state.listMode !== 'driving' && state.listMode !== 'cities' && state.listMode !== 'autobahn') {
                    const operatorSearch = chargingSearchTextOperatorFilter();
                    if (operatorSearch) {
                        state.chargingFilters = { operator: operatorSearch, connector: 'all', minPower: 'all' };
                        state.chargingShowOperators = false;
                    }
                    openChargingDistributionMap(navRequestId);
                    return;
                }
                if (state.listMode === 'cities') {
                    openCityOverviewMap();
                    return;
                }
                if (state.listMode === 'autobahn') {
                    if (!state.autobahnStations.length) {
                        loadAutobahnStations('map', navRequestId);
                        return;
                    }
                    openAutobahnMap();
                    return;
                }
                if (state.listMode === 'charging') {
                    state.stations = state.chargingStations;
                    setView('map');
                    renderMarkers();
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
                captureNormalSearchBeforeSection();
                state.listMode = 'cities';
                state.cityMapMode = 'overview';
                renderDetail(null);
                setView('list');
                updateBottomNav();
                if (isElectricMode() && state.chargingCityRankings.length) {
                    renderChargingCityRankings();
                    return;
                }
                if (!isElectricMode() && state.citySnapshot) {
                    renderCityRankings();
                    return;
                }
                loadCitySnapshot(navRequestId);
                return;
            }

            if (action === 'autobahn') {
                if (state.drivingActive) stopDrivingMode(false);
                captureNormalSearchBeforeSection();
                inferSelectedAutobahnFromSearch();
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

            if (action === 'charging') {
                if (state.drivingActive) stopDrivingMode(false);
                setVehicleMode('electric');
                state.listMode = 'charging';
                state.cityMapMode = 'overview';
                state.chargingCityContext = null;
                state.chargingFilters = { operator: 'all', connector: 'all', minPower: 'all' };
                state.chargingShowOperators = true;
                renderDetail(null);
                setView('list');
                updateBottomNav();
                if (state.chargingStations.length) {
                    renderChargingList();
                    return;
                }
                loadChargingStations(navRequestId);
                return;
            }

            if (action === 'list') {
                const fromAutobahn = state.listMode === 'autobahn';
                const fromCities = state.listMode === 'cities';
                if (state.drivingActive) stopDrivingMode(false);
                if (fromAutobahn) {
                    if (isElectricMode()) {
                        loadNearestChargingStationsFromCurrentLocation().catch(() => null);
                        return;
                    }
                    prepareNormalSearch(false);
                    updateBottomNav();
                    if (restoreNormalSearchAfterSection()) return;
                    renderNormalSearchLoading();
                    if (state.selectedLocation) {
                        loadStations();
                    } else {
                        state.stations = [];
                        useCurrentLocation({
                            timeoutMs: 12000,
                            onFail: () => restoreStoredStartState(),
                        });
                    }
                    return;
                }
                if (fromCities) {
                    if (isElectricMode()) {
                        loadNearestChargingStationsFromCurrentLocation().catch(() => null);
                        return;
                    }
                    prepareNormalSearch(false);
                    updateBottomNav();
                    if (restoreNormalSearchAfterSection()) return;
                    renderNormalSearchLoading();
                    if (state.selectedLocation) {
                        loadStations();
                    } else {
                        state.stations = [];
                        useCurrentLocation({
                            timeoutMs: 12000,
                            onFail: () => restoreStoredStartState(),
                        });
                    }
                    return;
                }
                if (isElectricMode()) {
                    loadNearestChargingStationsFromCurrentLocation().catch(() => null);
                    return;
                }
                state.listMode = 'results';
                state.cityMapMode = 'overview';
                state.selectedCityId = null;
                state.selectedHighway = 'all';
                renderDetail(null);
                setView('list');
                updateBottomNav();
                if (state.stations.length && state.listMode === 'results') {
                    renderCachedNormalSearch();
                } else if (restoreNormalSearchAfterSection()) {
                    return;
                } else if (state.selectedLocation) {
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
            if (showFavorites && !isElectricMode()) refreshFavoritesOnOpen();
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
    els.brandLogo?.addEventListener('click', openVehicleChoice);
    els.brandLogo?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openVehicleChoice();
    });
    els.helpClose?.addEventListener('click', () => setHelpOpen(false));
    els.vehicleChoice?.querySelectorAll('[data-vehicle-choice]').forEach((button) => {
        button.addEventListener('click', () => chooseVehicleMode(button.dataset.vehicleChoice));
    });
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
            if (state.listMode === 'driving' && state.view === 'map') {
                setView('list');
                renderDrivingModeList();
                return;
            }
            stopDrivingMode(true);
            return;
        }
        const startsFromElectricArea = state.listMode === 'charging'
            || (state.listMode === 'cities' && state.vehicleMode === 'electric');
        startDrivingMode('ALL', {
            vehicleMode: startsFromElectricArea ? 'electric' : 'combustion',
        });
    });
    els.cityUpdate?.addEventListener('click', () => runCityUpdate(false));
    els.cityForceUpdate?.addEventListener('click', () => runCityUpdate(true));
    els.sortButtons.forEach((button) => {
        button.addEventListener('click', () => {
            els.sortButtons.forEach((item) => item.classList.toggle('active', item === button));
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
    [els.vehicleMode, els.radius, els.fuel, els.limit, els.openOnly, els.pricedOnly].filter(Boolean).forEach((el) => {
        el.addEventListener('change', () => {
            if (el === els.vehicleMode) {
                const nextMode = els.vehicleMode.value === 'electric' ? 'electric' : DEFAULT_VEHICLE_MODE;
                releaseStartupVehicleChoicePending();
                setVehicleMode(nextMode);
                clearListForVehicleSwitch(nextMode);
                reloadListAfterVehicleSwitch(nextMode).catch(() => null);
                return;
            } else {
                saveUserSettings();
            }
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
            if (state.listMode === 'charging') {
                state.chargingLoadKey = null;
                loadChargingStations(state.navRequestId);
                return;
            }
            if (state.selectedLocation) loadStations();
        });
    });
}

loadFavorites();
startSplashScreen();
restoreUserSettings();
setVehicleMode(state.vehicleMode, { persist: false, silent: true });
initInstallPrompt();
registerServiceWorker();
setupTopControls();
bindEvents();
setView('list');
updateFavoritesButton();
els.results.innerHTML = '<div class="empty-state">Adresse eingeben oder Standort verwenden.</div>';
restoreStartState();
showVehicleChoiceIfNeeded();
