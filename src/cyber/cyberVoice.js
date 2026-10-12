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

async function sayOnce(text, rate) {
  const started = Date.now();
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.speak({ text, lang: "fr-FR", rate: rate || 1, volume: 1, category: "playback" });
    return;
  } catch { /* navigateur */ }
  try {
    if (window.speechSynthesis) {
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "fr-FR"; u.rate = rate || 1;
        u.onend = resolve; u.onerror = resolve;
        window.speechSynthesis.speak(u);
        setTimeout(resolve, Math.max(2500, text.length * 85));
      });
    }
  } catch { /* synthèse indisponible */ }
  const min = Math.min(6000, text.length * 55);
  const left = min - (Date.now() - started);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}

export function announceVoice(text, { rate = 1, withChime = true } = {}) {
  queue = queue.then(async () => {
    if (withChime) await chime();
    await sayOnce(text, rate);
    await new Promise((r) => setTimeout(r, 350));
  }).catch(() => {});
  return queue;
}
