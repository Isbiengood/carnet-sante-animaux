// Sauvegarde de secours locale : localStorage + IndexedDB
// Les données restent dans le navigateur, mais sont dupliquées dans deux stockages distincts.
(() => {
  const DB_NAME = "carnet-sante-animaux-securise";
  const STORE = "sauvegardes";
  const VERSION = 1;
  const KEYS = ["animaux", "urgences", "rendezVous"];

  function ouvrirDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB indisponible"));
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function lireSecours(key) {
    const db = await ouvrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async function ecrireSecours(key, value) {
    const db = await ouvrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  window.safeSetItem = function(key, value) {
    localStorage.setItem(key, value);
    if (KEYS.includes(key)) {
      ecrireSecours(key, value).catch(err => console.warn("Sauvegarde IndexedDB impossible", err));
      window.dispatchEvent(new CustomEvent("carnet:data-changed", { detail: { key } }));
    }
  };

  window.safeMirrorAll = async function() {
    for (const key of KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) await ecrireSecours(key, value);
    }
  };

  window.safeStorageReady = (async () => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        try { await navigator.storage.persist(); } catch (_) {}
      }

      for (const key of KEYS) {
        const principal = localStorage.getItem(key);
        const secours = await lireSecours(key);
        if (principal === null && secours !== null) {
          localStorage.setItem(key, secours);
        } else if (principal !== null) {
          await ecrireSecours(key, principal);
        }
      }
    } catch (err) {
      console.warn("Mode sauvegarde de secours non disponible", err);
    }
  })();
})();