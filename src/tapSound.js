// src/tapSound.js
//
// Sons de confirmation communs à toutes les entreprises (boutique, bar,
// cave, cyber café…) : article ou prestation choisi, ajouté au panier,
// vente validée, erreur. WebAudio direct (fiable dans la webview Android),
// avec une petite vibration.
//   kind : "select" | "add" | "sale" | "error"

let ac = null;
const NOTES = {
  select: [[988, 0, 0.09]],
  add: [[784, 0, 0.12], [1175, 0.08, 0.2]],
  sale: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.26]],
  error: [[260, 0, 0.14], [196, 0.12, 0.2]],
};
export function uiSound(kind = "select") {
  try { navigator.vibrate?.(kind === "error" ? [40, 50, 40] : kind === "select" ? 10 : 18); } catch { /* ignore */ }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = ac || new AC();
    if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime + 0.01;
    (NOTES[kind] || NOTES.select).forEach(([f, d, len]) => {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = kind === "error" ? "square" : "triangle"; o.frequency.value = f;
      const peak = kind === "error" ? 0.08 : 0.22;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(peak, t + d + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
      o.connect(g); g.connect(ac.destination); o.start(t + d); o.stop(t + d + len + 0.02);
    });
  } catch { /* son indisponible */ }
}
