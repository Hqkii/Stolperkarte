/**
 * Map Manager
 * Verwaltet Karten-Funktionalität und Marker
 */

const MapManager = (function() {
  // Konfiguration
  const CONFIG = {
    center: [53.55, 9.99],
    zoom: 11,
    maxZoom: 18,
    clusterRadius: 80
  };

  // State
  let map = null;
  let cluster = null;
  let stolperJson = [];
  let allMarkers = [];

  // Hilfsfunktionen
  function normalizeName(name) {
    return name
      ? name.toLowerCase()
          .replace(/^dr\.?\s*/i, '')
          .replace(/\bgeb\..*$/i, '')
          .replace(/\bverh\..*$/i, '')
          .replace(/\([^)]*\)/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      : '';
  }

  function getMarkerColor(lastCleaned) {
    if (!lastCleaned) return '#d00'; // Rot: nie geputzt
    
    const daysSince = Math.floor(
      (Date.now() - new Date(lastCleaned)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSince <= 30) return '#0a0'; // Grün: ≤ 30 Tage
    if (daysSince <= 90) return '#fa0'; // Orange: 30-90 Tage
    return '#d00'; // Rot: > 90 Tage
  }

  function createPinIcon(color) {
    return L.divIcon({
      className: '',
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
        <path fill="${color}" stroke="#900" stroke-width="1" d="M12 0C7 0 3 4 3 9c0 6.5 9 27 9 27s9-20.5 9-27c0-5-4-9-9-9z"/>
        <circle fill="#fff" cx="12" cy="9" r="4"/>
      </svg>`,
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36]
    });
  }

  function createPopupContent(data) {
    const { 
      name, 
      description, 
      address, 
      cleaningData, 
      note, 
      source, 
      stoneId
    } = data;

    let html = `<div class="popup-content">`;

    // Titel und Beschreibung
    if (name) {
      html += `<div class="popup-title">${name}</div>`;
      if (description) {
        html += `<div class="popup-description">${description}</div>`;
      }
    }

    // Adresse
    if (address) {
      html += `<div class="popup-address">Adresse: ${address}</div>`;
    }

    // Putzdaten
    if (cleaningData) {
      const cleanDate = new Date(cleaningData.date).toLocaleDateString('de-DE');
      html += `<div class="cleaning-info">
        <strong>Zuletzt geputzt:</strong> ${cleanDate}`;
      if (cleaningData.comment) {
        html += `<br><em>${cleaningData.comment}</em>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="cleaning-info">Noch nicht geputzt</div>`;
    }

    // Putz-Button
    html += `<button class="btn-clean" onclick="showCleaningForm('${stoneId}', window.UIManager.getCurrentMarker())">🧹 Stolperstein putzen</button>`;

    // Anmerkung
    if (note) {
      html += `<div class="popup-note">${note}</div>`;
    }

    // Quelle
    if (source) {
      html += `<div class="popup-source"><a href="${source}" target="_blank" rel="noopener">Quelle</a></div>`;
    }

    html += `</div>`;
    return html;
  }

  function createMarker(element, jsonData) {
    if (!element.lat || !element.lon) return null;

    const tags = element.tags || {};
    const name = tags.name || tags.inscription || 'Stolperstein';
    const street = tags["addr:street"] || '';
    const houseNum = tags["addr:housenumber"] || '';
    const address = [street, houseNum].filter(Boolean).join(' ');
    const info = tags["memorial:info"] || '';
    const stoneId = `stone-${element.id}`;

    // JSON-Eintrag finden
    const jsonEntry = jsonData.find(j => {
      if (!j.name || !name) return false;
      return normalizeName(j.name) === normalizeName(name);
    });

    // Daten laden
    const cleaningData = window.StorageManager.loadCleaningData(stoneId);
    const markerColor = getMarkerColor(cleaningData?.date);

    // Popup-Daten vorbereiten
    const popupData = {
      name,
      description: (jsonEntry?.info) || info || '',
      address: (jsonEntry?.adresse) || address || '',
      cleaningData,
      note: jsonEntry?.anmerkung || '',
      source: jsonEntry?.quelle || '',
      stoneId
    };

    // Marker erstellen
    const marker = L.marker([element.lat, element.lon], {
      icon: createPinIcon(markerColor)
    }).bindPopup(createPopupContent(popupData), { maxWidth: 370 });

    // Click-Handler
    marker.on('click', function() {
      window.UIManager.setCurrentMarker(marker);
    });

    // Für Suche speichern
    allMarkers.push({
      name,
      address: popupData.address,
      marker,
      lat: element.lat,
      lon: element.lon,
      info: popupData.description
    });

    return marker;
  }

  async function loadStolpersteineJson() {
    try {
      const response = await fetch('data/stolpersteine.json');
      stolperJson = await response.json();
    } catch (error) {
      console.warn('Stolpersteine JSON konnte nicht geladen werden:', error);
      stolperJson = [];
    }
  }

  async function loadOverpassData() {
    const query = `[out:json][timeout:180];
      area["name"="Hamburg"]["admin_level"="4"]->.a;
      node(area.a)["memorial"="stolperstein"];
      out body;`;

    try {
      const response = await fetch(
        'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query)
      );
      const data = await response.json();
      
      // Marker erstellen
      data.elements.forEach(element => {
        const marker = createMarker(element, stolperJson);
        if (marker) {
          cluster.addLayer(marker);
        }
      });

      // Suche aktivieren
      window.leafletMapReady = true;
      window.getAllMarkers = () => allMarkers;
      
      console.log(`${allMarkers.length} Stolpersteine geladen`);
    } catch (error) {
      console.error('Fehler beim Laden der Overpass-Daten:', error);
    }
  }

  function initMap() {
    // Karte initialisieren
    map = L.map('map').setView(CONFIG.center, CONFIG.zoom);
    window.map = map;

    // Tile Layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { 
        attribution: '© OSM, Carto', 
        maxZoom: CONFIG.maxZoom 
      }
    ).addTo(map);

    // Zoom Control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Cluster initialisieren
    cluster = L.markerClusterGroup({
      maxClusterRadius: CONFIG.clusterRadius,
      iconCreateFunction: cluster => L.divIcon({
        html: `<span>${cluster.getChildCount()}</span>`,
        className: 'stoneSquare',
        iconSize: L.point(46, 46),
        iconAnchor: [23, 23],
      }),
    });
    
    map.addLayer(cluster);
    window.cluster = cluster;

    // Daten laden
    loadStolpersteineJson().then(loadOverpassData);
  }

  // Public API
  return {
    init: initMap,
    getMap: () => map,
    getCluster: () => cluster,
    getAllMarkers: () => allMarkers
  };
})();

// Auto-Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', MapManager.init);
} else {
  MapManager.init();
}