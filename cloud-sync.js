// Synchronisation cloud Supabase sans compte utilisateur.
(() => {
  const ENDPOINT = "https://ebktlmglucuqyqywrtph.supabase.co/functions/v1/carnet-cloud";
  const API_KEY = "sb_publishable_UzwlLr5gb8WpLmO2yIqsuQ_oHB8CX2E";
  const KEY_NAME = "carnetCloudKey";
  const EMAIL_NAME = "carnetReminderEmail";
  let syncTimer = null;

  function makeDeviceKey() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function getDeviceKey() {
    let key = localStorage.getItem(KEY_NAME);
    if (!key || key.length < 40) {
      key = makeDeviceKey();
      localStorage.setItem(KEY_NAME, key);
    }
    return key;
  }

  async function callCloud(action, extra = {}) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "x-device-key": getDeviceKey()
      },
      body: JSON.stringify({ action, ...extra })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur cloud");
    return data;
  }

  function buildPayload() {
    return {
      version: "2.0",
      savedAt: new Date().toISOString(),
      animaux: JSON.parse(localStorage.getItem("animaux") || "[]"),
      urgences: JSON.parse(localStorage.getItem("urgences") || '{"veto":"","toiletteur":""}'),
      rendezVous: JSON.parse(localStorage.getItem("rendezVous") || "[]")
    };
  }

  async function syncNow() {
    try {
      await callCloud("sync", { payload: buildPayload() });
      localStorage.setItem("carnetCloudLastSync", new Date().toISOString());
      window.dispatchEvent(new CustomEvent("carnet:cloud-status", {detail:{ok:true}}));
    } catch (err) {
      console.warn("Synchronisation cloud impossible", err);
      window.dispatchEvent(new CustomEvent("carnet:cloud-status", {detail:{ok:false}}));
    }
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 700);
  }

  async function restoreIfNeeded() {
    const localAnimaux = JSON.parse(localStorage.getItem("animaux") || "[]");
    const localRdv = JSON.parse(localStorage.getItem("rendezVous") || "[]");
    const hasLocalData = localAnimaux.length > 0 || localRdv.length > 0;

    try {
      const data = await callCloud("load");
      if (!hasLocalData && data.snapshot && data.snapshot.payload) {
        const p = data.snapshot.payload;
        if (Array.isArray(p.animaux)) localStorage.setItem("animaux", JSON.stringify(p.animaux));
        if (p.urgences) localStorage.setItem("urgences", JSON.stringify(p.urgences));
        if (Array.isArray(p.rendezVous)) localStorage.setItem("rendezVous", JSON.stringify(p.rendezVous));
        if (window.safeMirrorAll) await window.safeMirrorAll();
        localStorage.setItem("carnetCloudRestoredAt", new Date().toISOString());
      } else if (!data.snapshot && hasLocalData) {
        await syncNow();
      }
    } catch (err) {
      console.warn("Restauration cloud indisponible", err);
    }
  }

  window.configurerEmailRappels = async function(email) {
    const value = String(email || "").trim().toLowerCase();
    if (!value) throw new Error("Adresse email obligatoire");
    await callCloud("set_email", { email: value });
    localStorage.setItem(EMAIL_NAME, value);
    return true;
  };

  window.getCarnetCloudKey = getDeviceKey;
  window.syncCarnetCloudNow = syncNow;
  window.addEventListener("carnet:data-changed", scheduleSync);

  window.cloudReady = (async () => {
    if (window.safeStorageReady) await window.safeStorageReady;
    getDeviceKey();
    await restoreIfNeeded();
  })();
})();