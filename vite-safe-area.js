// vite-safe-area.js — GestiOne
//
// Marge de sécurité automatique en bas (et en haut) de TOUTES les fenêtres,
// pour que les boutons ne passent jamais sous la barre du téléphone
// (boutons ◁ ○ ▢ ou barre de gestes).
//
// Pourquoi : sur Android, l'app est affichée « bord à bord » (sous la barre
// du téléphone). La hauteur de cette barre est donnée par
// env(safe-area-inset-bottom)… sauf dans les WebView Android plus anciennes
// que la version 140, où elle vaut 0. Capacitor 8 fournit alors la bonne
// valeur dans la variable CSS --safe-area-inset-bottom, mais l'app ne lisait
// que env(). Résultat : marge de 20–28 px au lieu de ~48 px, boutons cachés.
//
// Ce plugin agit à la compilation, sur tout le code, y compris les fenêtres
// ajoutées plus tard :
//   1. env(safe-area-inset-X)  →  var(--safe-area-inset-X, env(safe-area-inset-X, 0px))
//      (valeur Capacitor d'abord, valeur du navigateur ensuite)
//   2. max(Npx, <marge du bas>) → calc(Npx + <marge du bas>)
//      (la marge s'AJOUTE à la barre : les boutons ne la touchent plus)
//   3. Feuilles / fenêtres qui n'avaient AUCUNE marge de sécurité : une marge
//      est ajoutée par une règle CSS injectée dans la page.
//   4. Filet de sécurité : si Android ne donne aucune hauteur de barre alors
//      que l'app est bord à bord, 48 px sont réservés.

const SIDES = "top|bottom|left|right";

// env(safe-area-inset-X) sans valeur de secours, hors classes Tailwind « [ … ] »
const ENV_RE = new RegExp(`(?<!\\[)env\\(\\s*safe-area-inset-(${SIDES})\\s*\\)`, "g");
// max(Npx, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))
const MAX_BOTTOM_RE = /max\(\s*(\d+(?:\.\d+)?px)\s*,\s*(var\(--safe-area-inset-bottom, env\(safe-area-inset-bottom, 0px\)\))\s*\)/g;

export function rewriteSafeArea(code) {
  if (!code.includes("safe-area-inset")) return code;
  return code
    .replace(ENV_RE, (_, side) => `var(--safe-area-inset-${side}, env(safe-area-inset-${side}, 0px))`)
    .replace(MAX_BOTTOM_RE, (_, px, inset) => `calc(${px} + ${inset})`);
}

// --gb-sab : hauteur de la barre du bas, utilisée par les règles ci-dessous.
const SAB = "var(--gb-sab, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))";
const HAS_SAFE = '[style*="safe-area-inset-bottom"]';

export const SAFE_AREA_CSS = `
/* GestiOne — marge de sécurité automatique (vite-safe-area.js) */
:root { --gb-safe-gap: 16px; }

/* Feuilles qui montent du bas (bon de commande, panier, ventes…) */
.fixed.inset-0.items-end > [class*="rounded-t-"]:not(${HAS_SAFE}):not(:has(${HAS_SAFE})) {
  padding-bottom: calc(var(--gb-safe-gap) + ${SAB}) !important;
}
/* Fenêtres plein écran qui défilent */
.fixed.inset-0.overflow-y-auto:not(${HAS_SAFE}):not(:has(${HAS_SAFE})) {
  padding-bottom: calc(var(--gb-safe-gap) + ${SAB}) !important;
}
/* Pages plein écran en colonne (en-tête + contenu + boutons en bas) */
.fixed.inset-0.flex-col:not(${HAS_SAFE}):not(:has(${HAS_SAFE})) {
  padding-bottom: ${SAB} !important;
}
/* Contenu qui défile dans une feuille : laisse voir le dernier bouton */
.fixed.inset-0 .overflow-y-auto { scroll-padding-bottom: calc(var(--gb-safe-gap) + ${SAB}); }
`;

// Mesure la vraie hauteur de la barre et applique le filet de sécurité.
export const SAFE_AREA_JS = `
(function () {
  var root = document.documentElement;
  function measure(side) {
    var d = document.createElement("div");
    d.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;height:0;padding-bottom:var(--safe-area-inset-" + side + ", env(safe-area-inset-" + side + ", 0px))";
    root.appendChild(d);
    var n = parseFloat(getComputedStyle(d).paddingBottom) || 0;
    d.remove();
    return n;
  }
  var last = "";
  function update() {
    var bottom = measure("bottom");
    var C = window.Capacitor;
    var nativeAndroid = !!(C && C.isNativePlatform && C.isNativePlatform() && C.getPlatform && C.getPlatform() === "android");
    // Bord à bord (barre d'état sous l'app) mais aucune hauteur de barre du bas : filet de 48 px.
    if (nativeAndroid && bottom < 1 && measure("top") > 0) bottom = 48;
    var v = bottom + "px";
    if (v !== last) { last = v; root.style.setProperty("--gb-sab", v); }
  }
  update();
  document.addEventListener("DOMContentLoaded", update);
  window.addEventListener("load", update);
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", function () { setTimeout(update, 300); });
  // Capacitor écrit ses variables sur <html> après le démarrage.
  try {
    new MutationObserver(function () { update(); }).observe(root, { attributes: true, attributeFilter: ["style"] });
  } catch (e) {}
  setTimeout(update, 500);
  setTimeout(update, 2000);
})();
`;

export default function safeArea() {
  return {
    name: "gestione-safe-area",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (file.includes("node_modules") || !/\.(jsx?|tsx?|css)$/.test(file)) return null;
      const out = rewriteSafeArea(code);
      return out === code ? null : { code: out, map: null };
    },
    transformIndexHtml() {
      return [
        { tag: "style", attrs: { "data-gestione": "safe-area" }, children: SAFE_AREA_CSS, injectTo: "head" },
        { tag: "script", children: SAFE_AREA_JS, injectTo: "head" },
      ];
    },
  };
}
