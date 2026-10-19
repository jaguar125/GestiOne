// src/live.js
//
// Synchronisation EN DIRECT avec le serveur Cloudflare.
// Le téléphone garde une connexion ouverte avec le « relais » de son
// entreprise. Quand un autre téléphone enregistre une vente, une dépense,
// un stock…, le relais envoie {type:"changed", keys:[…]} et l'application
// relit aussitôt ces données (une seule petite lecture groupée).
//
// - Connexion seulement quand l'application est à l'écran (économie de
//   batterie et de forfait) ; reconnexion automatique, de plus en plus
//   espacée en cas d'échec (2 s → 60 s).
// - Si le direct ne marche pas (pas de serveur Cloudflare, réseau qui bloque),
//   l'application revient simplement à la synchronisation toutes les 25 s.

const PING_MS = 45_000;

export function startLive({ baseUrl, getCredentials, onChange, onState }) {
  if (!baseUrl || typeof WebSocket === "undefined") return () => {};
  let ws = null;
  let stopped = false;
  let ready = false;
  let retry = 0;
  let retryTimer = null;
  let pingTimer = null;

  const setReady = (v) => {
    if (ready === v) return;
    ready = v;
    try { onState && onState(v); } catch { /* jamais bloquant */ }
  };
  const clearTimers = () => {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  };
  const close = () => {
    clearTimers();
    setReady(false);
    if (ws) { const w = ws; ws = null; try { w.onclose = null; w.close(1000, "bye"); } catch { /* déjà fermée */ } }
  };
  const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";

  const scheduleRetry = () => {
    if (stopped || retryTimer || !visible()) return;
    const delay = Math.min(60_000, 2_000 * Math.pow(2, retry)) + Math.floor(Math.random() * 1000);
    retry += 1;
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, delay);
  };

  function connect() {
    if (stopped || ws || !visible()) return;
    const cred = getCredentials();
    if (!cred || !cred.shop_id || !cred.device_secret) return;
    const url = `${baseUrl.replace(/^http/, "ws")}/live?shop=${encodeURIComponent(cred.shop_id)}`;
    let sock;
    try { sock = new WebSocket(url); } catch { scheduleRetry(); return; }
    ws = sock;
    sock.onopen = () => {
      if (ws !== sock) { try { sock.close(); } catch { /* déjà fermée */ } return; }
      try { sock.send(JSON.stringify({ type: "auth", ...cred })); } catch { /* fermée */ }
      pingTimer = setInterval(() => { try { sock.send("ping"); } catch { /* fermée */ } }, PING_MS);
    };
    sock.onmessage = (ev) => {
      if (ev.data === "pong") return;
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === "ready") {
        retry = 0;
        setReady(true);
        // Ce qui a pu changer pendant la déconnexion : une relecture complète.
        try { onChange && onChange([]); } catch { /* jamais bloquant */ }
      } else if (m.type === "changed") {
        try { onChange && onChange(Array.isArray(m.keys) ? m.keys : []); } catch { /* jamais bloquant */ }
      } else if (m.type === "denied") {
        stopped = true; // appareil non reconnu : inutile d'insister
      }
    };
    sock.onclose = () => {
      if (ws !== sock) return;
      ws = null;
      clearTimers();
      setReady(false);
      scheduleRetry();
    };
    sock.onerror = () => { try { sock.close(); } catch { /* déjà fermée */ } };
  }

  const onVis = () => { if (visible()) { retry = 0; connect(); } else close(); };
  const onOnline = () => { retry = 0; if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } connect(); };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);
  if (typeof window !== "undefined") window.addEventListener("online", onOnline);
  connect();

  return () => {
    stopped = true;
    close();
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
    if (typeof window !== "undefined") window.removeEventListener("online", onOnline);
  };
}
