// ============================================================
//  POS DZ - sync.js  v6.0.0
//  مزامنة LAN من جانب العميل
// ============================================================

const SYNC_CLIENT = {
  _es: null, _retryTimer: null, _handlers: {},

  async initSSE() {
    if (await getSetting("syncEnabled") !== "1") return;
    const ip   = await getSetting("syncServerIP")   || "192.168.1.1";
    const port = await getSetting("syncServerPort") || "3000";
    const url  = "http://" + ip + ":" + port + "/api/subscribe";
    if (this._es) { this._es.close(); this._es = null; }
    try {
      this._es = new EventSource(url);
      this._es.onopen = () => { SYNC._ind(true); };
      this._es.onmessage = (e) => {
        try {
          const { action, store, data } = JSON.parse(e.data);
          (this._handlers[store] || []).forEach(cb => { try { cb(action, data); } catch(x) {} });
          this._applyLocally(action, store, data);
        } catch(x) {}
      };
      this._es.onerror = () => {
        SYNC._ind(false);
        this._es.close(); this._es = null;
        clearTimeout(this._retryTimer);
        this._retryTimer = setTimeout(() => this.initSSE(), 15000);
      };
    } catch(e) { SYNC._ind(false); }
  },

  async _applyLocally(action, store, data) {
    if (!db || !data) return;
    try {
      if (action === "delete") await dbDelete(store, data.id);
      else                     await dbPut(store, data);
    } catch(e) {}
  },

  on(store, cb)  { if (!this._handlers[store]) this._handlers[store]=[]; this._handlers[store].push(cb); },
  off(store, cb) { if (this._handlers[store]) this._handlers[store]=this._handlers[store].filter(x=>x!==cb); },

  disconnect() {
    clearTimeout(this._retryTimer);
    if (this._es) { this._es.close(); this._es = null; }
    SYNC._ind(false);
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  if (await getSetting("syncEnabled") === "1") {
    setTimeout(() => SYNC_CLIENT.initSSE(), 2000);
  }
});
