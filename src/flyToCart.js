// src/flyToCart.js — GestiOne
//
// Quand on touche un produit sur la page Vendre, son image « se décolle » de
// la carte (elle se soulève, penche un peu), puis tombe en arc dans le panier
// (barre « Voir le panier », panier ancré sur tablette/PC ou icône Vendre du
// menu). Le panier rebondit à l'arrivée et le téléphone vibre brièvement.
//
// Aucun effet si « Réduire les animations » est activé sur l'appareil.

function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

function findTarget() {
  const cands = [
    ...document.querySelectorAll("[data-cart-target]"),
    document.querySelector(".gb-cart-dock"),
    document.querySelector('[data-nav="sell"]'),
  ].filter(Boolean);
  for (const el of cands) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return el;
  }
  return null;
}

export function vibrateTap(ms = 14) {
  try { navigator.vibrate?.(ms); } catch { /* non pris en charge */ }
}

export function flyToCart(card) {
  vibrateTap();
  if (!card || typeof document === "undefined" || reducedMotion()) return;
  const src = card.querySelector("[data-fly-src]") || card.firstElementChild || card;
  const from = src.getBoundingClientRect();
  if (!from.width || !from.height) return;

  const ghost = src.cloneNode(true);
  ghost.removeAttribute("data-fly-src");
  Object.assign(ghost.style, {
    position: "fixed", left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
    margin: "0", zIndex: "120", pointerEvents: "none", borderRadius: "16px", overflow: "hidden",
    boxShadow: "0 18px 34px -12px rgba(0,0,0,0.45), 0 0 0 2px #fff", willChange: "transform, opacity", transformOrigin: "50% 50%",
  });
  // Les badges (catégorie, ×n) ne voyagent pas : seule l'image tombe.
  ghost.querySelectorAll("span").forEach((s) => { if (s.className && /absolute/.test(String(s.className))) s.remove(); });
  document.body.appendChild(ghost);

  // L'emplacement d'origine s'efface un instant : l'image s'est décollée.
  try { src.animate([{ opacity: 0.25 }, { opacity: 0.25, offset: 0.55 }, { opacity: 1 }], { duration: 760, easing: "ease-out" }); } catch { /* ignore */ }

  const target = findTarget();
  const to = target ? target.getBoundingClientRect() : { left: window.innerWidth / 2 - 20, top: window.innerHeight - 120, width: 40, height: 40 };
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const endScale = Math.max(0.12, Math.min(0.3, 44 / from.width));
  const lift = -Math.min(26, from.height * 0.3);

  const anim = ghost.animate([
    { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
    { transform: `translate(0,${lift}px) scale(1.07) rotate(-5deg)`, opacity: 1, offset: 0.22, easing: "cubic-bezier(.4,0,.9,.5)" },
    { transform: `translate(${dx * 0.45}px,${lift + dy * 0.18}px) scale(${(1.07 + endScale) / 2}) rotate(6deg)`, opacity: 1, offset: 0.55, easing: "cubic-bezier(.3,0,1,1)" },
    { transform: `translate(${dx}px,${dy}px) scale(${endScale}) rotate(14deg)`, opacity: 1, offset: 1 },
  ], { duration: 950, fill: "forwards" });

  const done = () => {
    ghost.remove();
    if (target) {
      try { target.animate([{ transform: "scale(1)" }, { transform: "scale(1.28)" }, { transform: "scale(0.94)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" }); } catch { /* ignore */ }
    }
    vibrateTap(10);
  };
  anim.onfinish = done;
  anim.oncancel = () => ghost.remove();
  setTimeout(() => { if (ghost.isConnected) done(); }, 1400);
}
