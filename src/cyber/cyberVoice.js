// src/cyber/cyberVoice.js
//
// Voix du cyber café : petit signal sonore puis annonce en français, les
// annonces arrivant en même temps sont dites l'une après l'autre.

let queue = Promise.resolve();
let ctxAudio = null;

function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return Promise.resolve();
    ctxAudio = ctxAudio || new AC();
    if (ctxAudio.state === "suspended") ctxAudio.resume();
    const t = ctxAudio.currentTime;
    [[880, 0], [1320, 0.16]].forEach(([f, d]) => {
      const o = ctxAudio.createOscillator(); const g = ctxAudio.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.32);
      o.connect(g); g.connect(ctxAudio.destination); o.start(t + d); o.stop(t + d + 0.34);
    });
  } catch { /* son indisponible */ }
  return new Promise((r) => setTimeout(r, 520));
}

// Son de sélection : commun à toute l'application.
export { uiSound } from "../tapSound.js";

// Voix fournie par l'application (la même que celle des boutiques, qui
// fonctionne sur les téléphones). Sinon : moteur vocal du téléphone en direct.
let speaker = null;
export function setSpeaker(fn) { speaker = typeof fn === "function" ? fn : null; }

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

async function sayOnce(text, rate) {
  const longest = Math.max(8000, text.length * 120);
  if (speaker) {
    try { await withTimeout(Promise.resolve(speaker(text, rate)), longest); return; } catch { /* repli ci-dessous */ }
  }
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    // Sécurité : si le moteur vocal ne répond pas, la file ne reste pas bloquée.
    await withTimeout(TextToSpeech.speak({ text, lang: "fr-FR", rate: Number(rate) || 1, volume: 1, category: "playback" }), longest);
    return;
  } catch { /* navigateur */ }
  try {
    if (window.speechSynthesis) {
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "fr-FR"; u.rate = Number(rate) || 1;
        u.onend = resolve; u.onerror = resolve;
        window.speechSynthesis.speak(u);
        setTimeout(resolve, Math.max(2500, text.length * 85));
      });
    }
  } catch { /* synthèse indisponible */ }
}

// Promesse résolue quand toutes les annonces en cours sont dites (sert à
// lancer l'impression du reçu APRÈS la voix : la fenêtre d'impression
// d'Android mettait l'application en pause et coupait l'annonce).
export function voiceIdle(maxMs = 9000) { return withTimeout(queue, maxMs); }

export function announceVoice(text, { rate = 1, withChime = true } = {}) {
  queue = queue.then(async () => {
    // Petit signal court, puis la voix tout de suite.
    if (withChime) { chime(); await new Promise((r) => setTimeout(r, 380)); }
    await sayOnce(text, rate);
    await new Promise((r) => setTimeout(r, 250));
  }).catch(() => {});
  return queue;
}
