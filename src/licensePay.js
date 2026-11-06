// src/licensePay.js — GestiOne
//
// Achat des licences : règles Google Play.
//
// L'application Android est publiée sur le Play Store. En Côte d'Ivoire,
// Google n'autorise pas une application du Play Store à vendre l'accès à ses
// fonctions autrement qu'avec Google Play Billing, ni à orienter
// l'utilisateur vers un paiement extérieur (lien, bouton, prix avec
// « Commander », message invitant à acheter ailleurs).
//
// Donc :
//   - dans l'application Android : AUCUNE offre, aucun prix, aucun lien de
//     paiement, aucune demande de commande. Seule l'activation d'un code de
//     licence reste possible (le client a acheté son code en dehors de
//     l'application) ;
//   - dans le navigateur (version web) : les offres s'affichent, et chaque
//     bouton ouvre le lien de paiement de sa durée.
//
// Les liens de paiement se règlent ICI, une seule fois, pour toute
// l'application (caisse, hôtel, cyber, Bar Manager, Aluminium). Une durée
// sans lien garde l'ancien fonctionnement sur le web : demande envoyée à
// l'assistance, puis le code est remis au client.

import { Capacitor } from "@capacitor/core";

export const LICENSE_PAY_LINKS = {
  "1m": "https://gestione.mychariow.com/prd_r7e0ql6t", // Essentiel · 1 mois
  "3m": "https://gestione.mychariow.com/prd_3dp9i6x8", // Avancé · 3 mois
  "6m": "https://gestione.mychariow.com/prd_wlwm1chb", // Professionnel · 6 mois
  "12m": "https://gestione.mychariow.com/prd_dav9mm8m", // Entreprise · 12 mois
};

// Vrai dans l'application installée (Android / iOS), quelle que soit sa
// provenance (Play Store ou APK). Pour vérifier l'affichage dans un
// navigateur : localStorage « gestione:storeMode » = "1".
export function isStoreApp() {
  try { if (localStorage.getItem("gestione:storeMode") === "1") return true; } catch { /* stockage indisponible */ }
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// Offres, prix et commandes autorisés (version web uniquement).
export const licenseSalesAllowed = () => !isStoreApp();

// Lien de paiement d'une durée ("1m", "3m", "6m", "12m"), ou "" si aucun
// lien n'est réglé ou si l'on est dans l'application Android.
export function payLinkFor(planId) {
  if (!licenseSalesAllowed()) return "";
  const url = String(LICENSE_PAY_LINKS[planId] || "").trim();
  return /^https:\/\//i.test(url) ? url : "";
}

export function openPayLink(url) {
  if (!url) return false;
  // Nouvel onglet (sans « noopener » dans les options : sinon window.open
  // renvoie toujours null). Si le navigateur bloque l'onglet, on ouvre la
  // page de paiement dans l'onglet courant.
  try { const w = window.open(url, "_blank"); if (w) { try { w.opener = null; } catch { /* ignore */ } } else window.location.href = url; } catch { window.location.href = url; }
  return true;
}

// Phrase neutre affichée dans l'application Android (aucune invitation à
// acheter ailleurs).
export const STORE_CODE_HINT = "Saisissez le code de licence de 12 chiffres remis par GestiOne.";
