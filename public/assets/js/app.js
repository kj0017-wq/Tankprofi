if (window.location.protocol === 'file:') {
    window.location.replace('http://localhost:8080/');
}

const state = {
    map: null,
    layer: null,
    markers: new Map(),
    selectedId: null,
    selectedLocation: null,
    stations: [],
    view: 'list',
    listMode: 'results',
    favorites: [],
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
    status: document.querySelector('#statusPill'),
    refresh: document.querySelector('#refreshButton'),
    detail: document.querySelector('#stationDetail'),
    viewButtons: document.querySelectorAll('.view-button'),
    bottomNavButtons: document.querySelectorAll('.bottom-nav-button'),
    template: document.querySelector('#stationTemplate'),
};

function initMap() {
    if (state.map) return;
    if (window.L) {
        state.map = L.map('map', { zoomControl: false }).setView([51.1657, 10.4515], 6);
        L.control.zoom({ position: 'bottomright' }).addTo(state.map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(state.map);
        state.layer = L.layerGroup().addTo(state.map);
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

function debounce(fn, delay = 350) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function money(value) {
    return value === null || value === undefined ? '-' : value.toFixed(3).replace('.', ',');
}

function distanceText(station) {
    const distance = Number(station.distance);
    return Number.isFinite(distance) ? `${distance.toFixed(1).replace('.', ',')} km` : '-';
}

function address(station) {
    return [station.street, station.house_number, station.postcode, station.city]
        .filter(Boolean)
        .join(' ');
}

function compactAddress(station) {
    const value = address(station);
    if (!value) return station.city || station.brand || '';

    const name = (station.name || '').toLowerCase();
    const parts = [station.street, station.house_number, station.postcode, station.city]
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
    const selectedBrand = els.brand.value;
    if (selectedBrand === 'all') return state.stations;
    return state.stations.filter((station) => stationBrandKey(station) === selectedBrand);
}

function brandLogoHtml(station) {
    const brand = brandInfo(station);
    return `<span class="brand-logo ${brand.className}">${escapeHtml(brand.label)}</span>`;
}

function markerClass(station, thresholds) {
    if (!station.is_open || station.price === null) return 'muted';
    if (station.price <= thresholds.low) return 'cheap';
    if (station.price >= thresholds.high) return 'high';
    return 'mid';
}

function thresholdsFor(stations) {
    const prices = stations
        .filter((station) => station.is_open && station.price !== null)
        .map((station) => station.price)
        .sort((a, b) => a - b);

    if (!prices.length) return { low: 0, high: Number.POSITIVE_INFINITY };
    return {
        low: prices[Math.floor((prices.length - 1) * 0.25)],
        high: prices[Math.floor((prices.length - 1) * 0.75)],
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

function popupHtml(station) {
    const navUrl = `https://waze.com/ul?ll=${station.lat}%2C${station.lng}&navigate=yes`;
    return `
        <h3 class="popup-title">${escapeHtml(station.name)}</h3>
        <p class="popup-meta">${escapeHtml(station.brand || 'Freie Tankstelle')}</p>
        <p class="popup-meta">${escapeHtml(address(station))}</p>
        <p class="popup-meta">${station.distance.toFixed(1).replace('.', ',')} km entfernt</p>
        <p class="popup-price">${money(station.price)} EUR</p>
        <p class="popup-meta">${station.is_open ? 'Geoeffnet' : 'Geschlossen'} · aktualisiert ${formatTime(station.last_update)}</p>
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

        marker.on('click', () => selectStation(station.tankerkoenig_id, true, true));
        marker.addTo(state.layer);
        state.markers.set(station.tankerkoenig_id, marker);
    });

    if (visibleStations.length) {
        const bounds = L.latLngBounds(visibleStations.map((station) => [station.lat, station.lng]));
        state.map.fitBounds(bounds.pad(0.16), { maxZoom: 14 });
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
        button.title = `${station.name} ${money(station.price)} EUR`;
        button.addEventListener('click', () => selectStation(station.tankerkoenig_id, false, true));
        layer.appendChild(button);
        state.markers.set(station.tankerkoenig_id, button);
    });
}

function renderResults() {
    els.results.innerHTML = '';
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
    els.resultCount.textContent = `${visibleStations.length} Treffer`;

    visibleStations.forEach((station, index) => {
        const node = els.template.content.firstElementChild.cloneNode(true);
        node.dataset.id = station.tankerkoenig_id;
        node.querySelector('.rank').textContent = String(index + 1);
        node.querySelector('.station-list-price').textContent = `${money(station.price)}`;
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
        els.results.innerHTML = '<div class="empty-state">Keine Treffer fuer diese Suche.</div>';
        renderDetail(null);
    }
}

function selectStation(id, pan = false, showDetailView = false) {
    if (state.selectedId === id && els.detail.classList.contains('visible')) {
        if (showDetailView) {
            state.listMode = 'results';
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
    if (showDetailView) {
        state.listMode = 'results';
        setView('list');
    }
    const marker = state.markers.get(id);
    if (station && marker && state.map?.type !== 'fallback') {
        if (pan) state.map.setView([station.lat, station.lng], Math.max(state.map.getZoom(), 14), { animate: true });
        marker.openPopup();
    }
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
    els.appShell.classList.add('detail-open');
    els.detail.classList.add('visible');
    updateBottomNav();
    els.detail.innerHTML = `
        <article class="detail-panel">
            <div class="detail-closebar">
                <button class="detail-back" type="button" id="detailBackButton">← Zurueck zur Liste</button>
                <button class="detail-close" type="button" id="detailCloseButton" aria-label="Detailansicht schliessen">×</button>
            </div>
            <div class="detail-header">
                ${brandLogoHtml(station)}
                <div>
                    <h2>${escapeHtml(station.name || 'Tankstelle')}</h2>
                    <p class="detail-brand">${escapeHtml(station.brand || 'Freie Tankstelle')}</p>
                </div>
            </div>
            <p class="detail-price">${money(station.price)} EUR</p>
            <div class="detail-grid">
                <div class="detail-cell">
                    <span class="detail-label">Entfernung</span>
                    <span class="detail-value">${distanceText(station)}</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${station.is_open === null ? 'unbekannt' : station.is_open ? 'Geoeffnet' : 'Geschlossen'}</span>
                </div>
                <div class="detail-cell">
                    <span class="detail-label">Adresse</span>
                    <span class="detail-value">${escapeHtml(address(station) || '-')}</span>
                </div>
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
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Anfrage fehlgeschlagen.');
    return data;
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
        if (!state.selectedLocation) return;
    }

    setStatus('Laedt');
    els.resultMeta.textContent = 'Tankstellen werden geladen ...';

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
        const data = await fetchJson(`/api/search.php?${params.toString()}`);

        state.selectedId = null;
        state.listMode = 'results';
        updateFavoritesButton();
        state.stations = data.stations || [];
        sortStations();
        els.resultCount.textContent = `${state.stations.length} Treffer`;
        els.resultMeta.textContent = `${fuelLabel(els.fuel.value)} im Radius ${els.radius.value} km`;
        if (state.view === 'map') renderMarkers();
        renderResults();
        renderDetail(null);
        setView('list');
        setStatus('Live');
    } catch (error) {
        setStatus('Fehler');
        els.resultCount.textContent = 'Keine Daten';
        els.resultMeta.textContent = error.message;
        els.results.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        renderDetail(null);
    }
}

function fuelLabel(value) {
    return ({ e10: 'Super E10', e5: 'Super E5', diesel: 'Diesel' })[value] || value;
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

    state.favorites.forEach((favorite) => {
        const station = stationForFavorite(favorite);
        const row = document.createElement('div');
        row.className = 'favorite-item';
        row.classList.toggle('selected', favorite.tankerkoenig_id === state.selectedId);
        row.innerHTML = `
            <div class="rank">*</div>
            ${brandLogoHtml(station)}
            <button class="favorite-open" type="button">
                <strong>${escapeHtml(station.name || 'Tankstelle')}</strong>
                <span>${escapeHtml(compactAddress(station) || station.brand || 'Favorit')}</span>
            </button>
            <div class="favorite-price">${money(station.price)}</div>
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
    els.bottomNavButtons.forEach((button) => {
        const action = button.dataset.action;
        const active = (action === 'map' && state.view === 'map')
            || (action === 'favorites' && state.view === 'list' && state.listMode === 'favorites')
            || (action === 'settings' && els.settingsSheet?.classList.contains('open'))
            || (action === 'list' && state.view === 'list' && state.listMode === 'results' && !els.detail.classList.contains('visible'));
        button.classList.toggle('active', active);
    });
}

function setSettingsOpen(open) {
    els.settingsSheet.classList.toggle('open', open);
    els.settingsBackdrop.classList.toggle('visible', open);
    updateBottomNav();
}

function setShareOpen(open) {
    if (!els.shareContent || !els.shareToggle) return;
    els.shareContent.hidden = !open;
    els.shareToggle.setAttribute('aria-expanded', String(open));
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

async function chooseFirstSuggestion() {
    const query = els.searchInput.value.trim();
    if (!query) return;
    setStatus('Sucht');
    const items = await geocode(query);
    if (items[0]) {
        state.selectedLocation = items[0];
        els.searchInput.value = items[0].label;
        saveLastLocation(items[0]);
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

function useCurrentLocation() {
    if (!navigator.geolocation) {
        els.resultMeta.textContent = 'Standortfreigabe wird nicht unterstuetzt.';
        return;
    }

    setStatus('Ortung');
    navigator.geolocation.getCurrentPosition(async (position) => {
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
        loadStations();
    }, () => {
        setStatus('Bereit');
        els.resultMeta.textContent = 'Standort konnte nicht ermittelt werden.';
    }, {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 60000,
    });
}

function autoLocateOnStart() {
    if (!navigator.geolocation) return;
    if (sessionStorage.getItem('tankprofi_auto_location_done') === '1') return;

    sessionStorage.setItem('tankprofi_auto_location_done', '1');
    useCurrentLocation();
}

function restoreStartState() {
    const lastLocation = loadLastLocation();
    if (lastLocation) {
        state.selectedLocation = lastLocation;
        els.searchInput.value = lastLocation.label;
        els.resultMeta.textContent = 'Letzte Adresse wird geladen ...';
        loadStations();
        return;
    }

    if (state.favorites.length) {
        els.resultMeta.textContent = 'Favoriten bereit. Adresse suchen oder Standort verwenden.';
        return;
    }

    autoLocateOnStart();
}

function bindEvents() {
    els.searchInput.addEventListener('input', updateSuggestions);
    els.searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') loadStations();
    });
    els.searchButton.addEventListener('click', loadStations);
    els.locationButton.addEventListener('click', useCurrentLocation);
    els.refresh.addEventListener('click', loadStations);
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
            renderDetail(null);
            if (action === 'map') {
                setView('map');
                return;
            }

            if (action === 'settings') {
                setSettingsOpen(!els.settingsSheet.classList.contains('open'));
                return;
            }

            state.listMode = action === 'favorites' ? 'favorites' : 'results';
            updateFavoritesButton();
            renderResults();
            setView('list');
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
    els.sortButtons.forEach((button) => {
        button.addEventListener('click', () => {
            els.sortButtons.forEach((item) => item.classList.toggle('active', item === button));
            sortStations();
            renderResults();
            renderMarkers();
        });
    });
    els.brand.addEventListener('change', () => {
        renderResults();
        renderMarkers();
    });
    [els.radius, els.fuel, els.limit, els.openOnly, els.pricedOnly].forEach((el) => {
        el.addEventListener('change', () => {
            if (state.selectedLocation) loadStations();
        });
    });
}

loadFavorites();
bindEvents();
setView('list');
updateFavoritesButton();
els.results.innerHTML = '<div class="empty-state">Adresse eingeben oder Standort verwenden.</div>';
restoreStartState();
