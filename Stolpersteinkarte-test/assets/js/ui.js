/**
 * UI Manager
 * Verwaltet alle UI-Interaktionen
 */

const UIManager = (function() {
  let currentMarker = null;

  // Event Listeners initialisieren
  function init() {
    // Info Button
    const infoBtn = document.getElementById('infoBtn');
    const infoOverlay = document.getElementById('infoOverlay');
    const closeBtn = document.querySelector('.close-info');

    if (infoBtn) {
      infoBtn.addEventListener('click', showInfo);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeInfo);
    }

    // Overlay schließen bei Klick außerhalb
    if (infoOverlay) {
      infoOverlay.addEventListener('click', (e) => {
        if (e.target === infoOverlay) {
          closeInfo();
        }
      });
    }

    // Info Tabs
    const tabs = document.querySelectorAll('.info-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        showTab(tabName);
      });
    });
  }

  function showInfo() {
    const overlay = document.getElementById('infoOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  function closeInfo() {
    const overlay = document.getElementById('infoOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  function showTab(tabName) {
    // Alle Tabs deaktivieren
    document.querySelectorAll('.info-tab').forEach(t => {
      t.classList.remove('active');
    });
    document.querySelectorAll('.info-content').forEach(c => {
      c.classList.remove('active');
    });

    // Gewählten Tab aktivieren
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(tabName);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  }

  function showCleaningForm(stoneId, marker) {
    currentMarker = marker;
    
    const overlay = document.createElement('div');
    overlay.className = 'cleaning-overlay';
    overlay.innerHTML = `
      <div class="cleaning-form">
        <h3>Stolperstein reinigen</h3>
        <label>Datum der Reinigung: <span style="color: #d00;">*</span></label>
        <input type="date" id="cleaning-date" value="${new Date().toISOString().split('T')[0]}" required>
        <label>Kommentar (optional):</label>
        <textarea id="cleaning-comment" placeholder="z.B. mit Wasser und Bürste gereinigt" maxlength="500"></textarea>
        <div class="cleaning-buttons">
          <button class="btn-save" id="cleaningSaveBtn">Speichern</button>
          <button class="btn-cancel" id="cleaningCancelBtn">Abbrechen</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);

    // Event Listeners für Form
    document.getElementById('cleaningSaveBtn').addEventListener('click', () => {
      submitCleaning(stoneId);
    });

    document.getElementById('cleaningCancelBtn').addEventListener('click', () => {
      overlay.remove();
    });

    // ESC zum Schließen
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Overlay schließen bei Klick außerhalb
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  function submitCleaning(stoneId) {
    const dateInput = document.getElementById('cleaning-date');
    const commentInput = document.getElementById('cleaning-comment');
    const date = dateInput.value;

    if (!date) {
      alert('Bitte geben Sie ein Datum ein.');
      return;
    }

    const comment = commentInput.value.trim();
    
    const cleaningData = {
      date: date,
      comment: comment || '',
      timestamp: Date.now()
    };

    const saveBtn = document.getElementById('cleaningSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Speichere...';

    try {
      const saved = window.StorageManager.saveCleaningData(stoneId, cleaningData);
      if (saved) {
        alert('Reinigung erfolgreich gespeichert!');
        document.querySelector('.cleaning-overlay').remove();
        location.reload();
      } else {
        throw new Error('Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es später erneut.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Speichern';
    }
  }

  // Public API
  return {
    init,
    showInfo,
    closeInfo,
    showTab,
    showCleaningForm,
    submitCleaning,
    setCurrentMarker(marker) {
      currentMarker = marker;
    },
    getCurrentMarker() {
      return currentMarker;
    }
  };
})();

// Global verfügbar machen
window.UIManager = UIManager;
window.showCleaningForm = UIManager.showCleaningForm;
window.submitCleaning = UIManager.submitCleaning;

// UI initialisieren wenn DOM bereit
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', UIManager.init);
} else {
  UIManager.init();
}