/**
 * Search Manager
 * Verwaltet Suchfunktionalität
 */

const SearchManager = (function() {
  // State
  let data = [];
  let lastResults = [];
  let selectedIndex = -1;

  // DOM-Elemente
  let input = null;
  let resultsBox = null;
  let searchBar = null;
  let searchBtn = null;

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

  function search(query) {
    const q = normalizeName(query);
    if (!q) return [];

    const normalized = data.map(d => ({
      ...d,
      normalized: normalizeName(d.name)
    })).filter(d => d.normalized);

    // Exakte Treffer am Anfang
    let results = normalized.filter(d => d.normalized.startsWith(q));

    // Weitere Treffer hinzufügen
    if (results.length < 7) {
      const additional = normalized.filter(
        d => !results.includes(d) && d.normalized.indexOf(q) !== -1
      );
      results = results.concat(additional);
    }

    return results.slice(0, 12);
  }

  function renderResults(results) {
    resultsBox.innerHTML = '';
    
    if (results.length === 0) {
      resultsBox.classList.remove('active');
      return;
    }

    results.forEach((result, index) => {
      const div = document.createElement('div');
      div.className = 'search-bar-result';
      if (index === selectedIndex) {
        div.classList.add('active');
      }
      
      div.textContent = result.name + (result.address ? ` – ${result.address}` : '');
      div.addEventListener('click', () => selectResult(index));
      
      resultsBox.appendChild(div);
    });

    resultsBox.classList.add('active');
  }

  function selectResult(index) {
    const result = lastResults[index];
    if (!result) return;

    resultsBox.classList.remove('active');
    input.value = result.name;
    selectedIndex = index;

    // Marker anzeigen
    if (result.marker && window.map) {
      if (window.cluster && !window.map.hasLayer(result.marker)) {
        // Marker ist im Cluster - zoomen um ihn sichtbar zu machen
        window.cluster.zoomToShowLayer(result.marker, function() {
          window.map.setView(result.marker.getLatLng(), 18, { animate: true });
          setTimeout(() => result.marker.openPopup(), 300);
        });
      } else {
        // Marker ist bereits sichtbar
        window.map.setView(result.marker.getLatLng(), 18, { animate: true });
        setTimeout(() => result.marker.openPopup(), 300);
      }
    }
  }

  function handleInput() {
    const value = input.value.trim();
    lastResults = search(value);
    selectedIndex = -1;
    renderResults(lastResults);
  }

  function handleKeyDown(e) {
    if (!lastResults.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % lastResults.length;
        renderResults(lastResults);
        break;

      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + lastResults.length) % lastResults.length;
        renderResults(lastResults);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectResult(selectedIndex);
        } else if (lastResults.length > 0) {
          selectResult(0);
        }
        break;

      case 'Escape':
        resultsBox.classList.remove('active');
        input.blur();
        break;
    }
  }

  function handleSubmit() {
    if (lastResults.length > 0) {
      selectResult(0);
    }
    resultsBox.classList.remove('active');
  }

  function handleClickOutside(e) {
    if (searchBar && !searchBar.contains(e.target)) {
      resultsBox.classList.remove('active');
    }
  }

  function handleFocus() {
    if (lastResults.length > 0) {
      resultsBox.classList.add('active');
    }
  }

  function waitForData() {
    if (window.getAllMarkers) {
      data = window.getAllMarkers();
      setupEventListeners();
    } else if (window.leafletMapReady) {
      setTimeout(waitForData, 100);
    } else {
      setTimeout(waitForData, 300);
    }
  }

  function setupEventListeners() {
    if (!input || !resultsBox || !searchBtn) return;

    // Input Events
    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeyDown);
    input.addEventListener('focus', handleFocus);

    // Button Event
    searchBtn.addEventListener('click', handleSubmit);

    // Click außerhalb
    document.addEventListener('click', handleClickOutside);

    // Auto-blur nach kurzem Delay
    setTimeout(() => {
      if (input && window.getComputedStyle(input).display !== 'none') {
        input.blur();
      }
    }, 100);
  }

  function init() {
    // DOM-Elemente holen
    input = document.getElementById('searchInput');
    resultsBox = document.getElementById('searchResults');
    searchBar = document.getElementById('searchBar');
    searchBtn = document.getElementById('searchBtn');

    if (!input || !resultsBox || !searchBar || !searchBtn) {
      console.error('Such-Elemente nicht gefunden');
      return;
    }

    // Auf Daten warten
    waitForData();
  }

  // Public API
  return {
    init,
    search,
    getResults: () => lastResults
  };
})();

// Global verfügbar machen für Legacy-Code
window.searchResultsUpdate = function() {
  const input = document.getElementById('searchInput');
  if (input) {
    input.dispatchEvent(new Event('input'));
  }
};

window.searchBarKeyDown = function(e) {
  SearchManager.handleKeyDown && SearchManager.handleKeyDown(e);
};

window.searchBarSubmit = function() {
  SearchManager.handleSubmit && SearchManager.handleSubmit();
};

// Auto-Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', SearchManager.init);
} else {
  SearchManager.init();
}