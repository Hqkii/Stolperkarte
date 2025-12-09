/**
 * Storage Manager
 * Verwaltet Speicherung von Stolperstein-Daten
 */

const StorageManager = (function() {
  const memoryStorage = {};
  const isLocalStorageAvailable = checkLocalStorage();

  function checkLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage nicht verfügbar, nutze Memory-Storage');
      return false;
    }
  }

  function loadData(key) {
    try {
      if (isLocalStorageAvailable) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
      return memoryStorage[key] || null;
    } catch (e) {
      console.error('Fehler beim Laden:', e);
      return memoryStorage[key] || null;
    }
  }

  function saveData(key, data) {
    try {
      if (isLocalStorageAvailable) {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      }
      memoryStorage[key] = data;
      return true;
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      memoryStorage[key] = data;
      return true;
    }
  }

  function deleteData(key) {
    try {
      if (isLocalStorageAvailable) {
        localStorage.removeItem(key);
      }
      delete memoryStorage[key];
      return true;
    } catch (e) {
      console.error('Fehler beim Löschen:', e);
      return false;
    }
  }

  // Public API
  return {
    // Putzdaten
    loadCleaningData(stoneId) {
      return loadData(`cleaning:${stoneId}`);
    },

    saveCleaningData(stoneId, data) {
      return saveData(`cleaning:${stoneId}`, data);
    },

    // Utility
    clear(prefix) {
      if (!prefix) return false;
      
      if (isLocalStorageAvailable) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        });
      }
      
      Object.keys(memoryStorage).forEach(key => {
        if (key.startsWith(prefix)) {
          delete memoryStorage[key];
        }
      });
      
      return true;
    }
  };
})();

// Global verfügbar machen
window.StorageManager = StorageManager;