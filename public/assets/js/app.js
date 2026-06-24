if (window.location.protocol === 'file:') {
    window.location.replace('http://localhost:8080/');
}

const appVersion = '20260624-search-gps-fix-3';

const state = {
    map: null,
    layer: null,
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
    autobahnStations: [],
    selectedHighway: 'all',
    autobahnPriceLoadingId: null,
    autobahnLoadKey: null,
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
    globalProgress: document.querySelector('#globalProgress'),
    status: document.querySelector('#statusPill'),
    splash: document.querySelector('#splashScreen'),
    refresh: document.querySelector('#refreshButton'),
    detail: document.querySelector('#stationDetail'),
    viewButtons: document.querySelectorAll('.view-button'),
    bottomNavButtons: document.querySelectorAll('.bottom-nav-button'),
    template: document.querySelector('#stationTemplate'),
};

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
    els.status.textContent = text;
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

function money(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(3).replace('.', ',')} €` : '-';
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

function autobahnPriceSummary(station) {
    if (!station.prices) return 'Keine gespeicherten Preise';
    return `Diesel ${money(station.prices.diesel?.price)} · E5 ${money(station.prices.e5?.price)} · E10 ${money(station.prices.e10?.price)}`;
}

function validDateMs(value) {
    const ms = Date.parse(value || '');
    return Number.isFinite(ms) ? ms : null;
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
            ? `, aelteste ${formatDateTime(stand.oldestPrice)}`
            : '';
        return `Preisdaten: neueste ${formatDateTime(stand.newestPrice)}${oldest}`;
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
    if (state.listMode === 'cities' || state.listMode === 'autobahn') return state.stations;
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
    if (!station.is_open || station.price === null) return 'muted';
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
    if (!Number.isFinite(price)) return 'price-rank-muted';
    const candidates = state.stations
        .filter((item) => Number.isFinite(Number(fuelPriceValue(item, fuel))))
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
        .filter((station) => station.is_open && station.price !== null)
        .map((station) => Number(station.price))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

    if (!prices.length) return { low: 0, high: Number.POSITIVE_INFINITY };
    const low = prices[0];
    const high = prices[prices.length - 1];
    return {
        low,
        high: high > low ? high : Number.POSITIVE_INFINITY,
        range: high - low,
    };
}

function sortStations() {
    const byDistance = document.querySelector('.sort-toggle-button.active')?.dataset.sort === 'distance';
    state.stations.sort((a, b) => {
        if (byDistance) {
            return a.distance - b.distance || (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE);
        }

        return (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE) || a.distance - b.distance;
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
        price.textContent = `${money(station.price)}`;
        price.classList.add(priceClassFor(station, listThresholds));
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
                <a class="nav-link nav-link-waze" href="${wazeUrl}" target="_blank" rel="noopener">Waze</a>
                <a class="nav-link" href="${googleUrl}" target="_blank" rel="noopener">Maps</a>
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
            ? `Gespeicherte Daten · ${fuelLabel(els.fuel.value)} im Radius ${els.radius.value} km`
            : `${fuelLabel(els.fuel.value)} im Radius ${els.radius.value} km`;
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
    if (!state.cityAutoUpdateRunning || !state.cityAutoUpdateStartedAt) return 0;
    const elapsed = Date.now() - state.cityAutoUpdateStartedAt;
    return Math.max(8, Math.min(92, Math.round((elapsed / (2.5 * 60 * 1000)) * 100)));
}

function cityUpdateProgressHtml() {
    if (!state.cityAutoUpdateRunning) return '';
    const percent = cityUpdateProgressPercent();
    return `
        <div class="city-update-progress" role="status" aria-live="polite">
            <div>
                <strong>Neue Städtedaten werden geladen</strong>
                <span>Die bisherigen Daten bleiben sichtbar, bis der Snapshot vollständig abgeschlossen ist.</span>
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
        const nextId = data.snapshot?.snapshotId;
        const changed = nextId && nextId !== state.cityAutoUpdateSnapshotId;
        if (changed || (data.snapshot && !shouldRefreshCitySnapshot(data.snapshot, data.stale))) {
            state.citySnapshot = data.snapshot;
            state.cityRankings = data.rankings || [];
            state.cityAutoUpdateRunning = false;
            state.cityAutoUpdateStartedAt = null;
            state.cityAutoUpdateSnapshotId = null;
            setStatus('Aktuell');
            renderResults();
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
    els.resultMeta.textContent = `Stand: ${formatDateTime(state.citySnapshot.completedAt)}`;
    els.results.innerHTML = `
        <section class="city-dashboard">
            <div class="city-toolbar">
                <strong>Durchschnittspreise Großstädte</strong>
                <div class="city-view-tabs">
                    <button type="button" data-city-view="list">Liste</button>
                    <button type="button" data-city-view="map">Karte</button>
                </div>
                <div class="city-fuel-tabs">
                    <button type="button" data-city-fuel="diesel">Diesel</button>
                    <button type="button" data-city-fuel="e5">E5</button>
                    <button type="button" data-city-fuel="e10">E10</button>
                </div>
            </div>
            <div class="city-overview">
                <span>Ø Diesel <strong>${averageMoney(totals.avgDiesel)}</strong></span>
                <span>Ø E5 <strong>${averageMoney(totals.avgE5)}</strong></span>
                <span>Ø E10 <strong>${averageMoney(totals.avgE10)}</strong></span>
                <span>Tankstellen <strong>${totals.stationCount}</strong></span>
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

function cityStationRankClass(station) {
    if (!station.is_open || station.price === null || station.price === undefined) return 'muted';
    return markerClass(station, { low: 0, high: 0 });
}

function cityStationRowHtml(station, rank) {
    const cls = cityStationRankClass(station);
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
            <span class="city-station-price price-rank-${cls}">${money(station.price)}</span>
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
            const priceA = Number.isFinite(Number(a.price)) ? Number(a.price) : Number.MAX_VALUE;
            const priceB = Number.isFinite(Number(b.price)) ? Number(b.price) : Number.MAX_VALUE;
            return priceA - priceB || Number(a.distance || 0) - Number(b.distance || 0) || String(a.name).localeCompare(String(b.name), 'de');
        });

    if (!city || !state.citySnapshot) {
        els.resultCount.textContent = 'Keine Stadt';
        els.resultMeta.textContent = 'Stadt-Snapshot nicht geladen.';
        els.results.innerHTML = '<div class="empty-state">Bitte die Großstadtliste neu öffnen.</div>';
        return;
    }

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
            <div class="city-overview">
                <span>Durchschnitt <strong>${money(city[keys.avg])}</strong></span>
                <span>Gültige Preise <strong>${city[keys.valid] || 0}</strong></span>
                <span>Günstigster Preis <strong>${money(city[keys.min])}</strong></span>
                <span>Teuerster Preis <strong>${money(city[keys.max])}</strong></span>
            </div>
            <div class="city-station-list">
                ${stations.map((station, index) => cityStationRowHtml(station, index + 1)).join('')}
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
        price: station[keys.price],
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
        const updated = (data.stations || []).map(normalizeAutobahnStation)
            .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng));
        const byId = new Map(state.autobahnStations.map((station) => [station.tankerkoenig_id, station]));
        updated.forEach((station) => byId.set(station.tankerkoenig_id, station));
        state.autobahnStations = [...byId.values()];
        syncAutobahnVisibleStations();
        setStatus('Aktuell');
        if (target === 'map') openAutobahnMap();
        else renderAutobahnList();
    } finally {
        if (state.autobahnLoadKey === loadKey) state.autobahnLoadKey = null;
    }
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
        const updated = (data.stations || []).map(normalizeAutobahnStation)
            .find((station) => station.tankerkoenig_id === id);
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
    const selectedPrice = autobahnPriceValue(station);
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
            <span class="autobahn-meta ${priceClassFor(station, priceThresholds)}">${money(selectedPrice)}</span>
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
                        <h2>${escapeHtml(highway)} <span>${stations.length}</span></h2>
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
                setView('map');
                return;
            }

            if (action === 'settings') {
                setSettingsOpen(!els.settingsSheet.classList.contains('open'));
                return;
            }

            if (action === 'cities') {
                state.listMode = 'cities';
                state.cityMapMode = 'overview';
                renderDetail(null);
                setView('list');
                updateBottomNav();
                loadCitySnapshot(navRequestId);
                return;
            }

            if (action === 'autobahn') {
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
            state.listMode = showFavorites ? 'favorites' : 'results';
            updateFavoritesButton();
            renderResults();
            setView('list');
            if (showFavorites) refreshFavoritesOnOpen();
        });
    });
    els.settingsBackdrop.addEventListener('click', () => setSettingsOpen(false));
    els.settingsClose.addEventListener('click', () => setSettingsOpen(false));
    els.shareToggle?.addEventListener('click', async () => {
        const link = els.shareLink?.value || 'https://tankprofi.web.app';
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Tankprofi',
                    text: 'Tankprofi Webapp',
                    url: link,
                });
                return;
            } catch {
                // Fall through and show QR panel.
            }
        }

        setShareOpen(els.shareContent?.hidden ?? true);
    });
    els.shareCopy?.addEventListener('click', copyShareLink);
    els.homeInstall?.addEventListener('click', installToHomeScreen);
    els.splashInstall?.addEventListener('click', installToHomeScreen);
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
            if (state.selectedLocation) loadStations();
        });
    });
}

loadFavorites();
startSplashScreen();
restoreUserSettings();
initInstallPrompt();
registerServiceWorker();
bindEvents();
setView('list');
updateFavoritesButton();
els.results.innerHTML = '<div class="empty-state">Adresse eingeben oder Standort verwenden.</div>';
restoreStartState();
