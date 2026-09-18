// src/printer.js
//
// Impression sur imprimante thermique Bluetooth (ticket de caisse), en
// délégant TOUTE la gestion Bluetooth à l'application tierce RawBT (ru.a402d.
// rawbtprinter, gratuite sur le Play Store) plutôt que d'implémenter
// nous-mêmes un plugin Bluetooth natif.
//
// POURQUOI CE CHANGEMENT : deux plugins Bluetooth natifs différents (Cordova
// classique, puis Capacitor BLE) ont chacun échoué sur cet appareil, pour des
// raisons différentes — la vraie cause profonde, découverte en testant le
// matériel réel, est que le MP583 est une imprimante Bluetooth CLASSIQUE
// (SPP), et qu'aucun plugin Bluetooth maintenu et fiable pour ce protocole
// n'existe dans l'écosystème Capacitor (c'est justement pour ça que RawBT,
// une app dédiée avec un vrai historique de terrain sur ce type
// d'imprimante, existe). On envoie donc les données du reçu (au format
// ESC/POS, inchangé) à RawBT via un lien "intent:", et RawBT s'occupe de la
// connexion Bluetooth avec les réglages que l'utilisateur y a configurés une
// fois pour toutes (Connexion : Bluetooth, Imprimante : MP583, Pilote :
// ESC/POS general, Format papier : 58 mm).
//
// INSTALLATION REQUISE, côté utilisateur :
//   npm install @capacitor/browser
//   npx cap sync
//   1. Installer "RawBT print service" depuis le Play Store.
//   2. Dans RawBT : Connexion Bluetooth > sélectionner MP583 > Pilote :
//      ESC/POS general > Format papier : 58 mm.
//   Si RawBT n'est pas installé, Android ouvre automatiquement sa fiche
//   Play Store au moment d'imprimer — rien à gérer dans notre code pour ce
//   cas.
//
// ATTENTION : le partage de fichier vers RawBT n'a pas pu être testé sur
// l'imprimante physique depuis cet environnement — à valider sur l'appareil
// réel ; l'extension .prn correspond à ce que RawBT reconnaît nativement
// pour de l'ESC/POS brut (voir rawbt.ru/intents.html).

import { Capacitor } from "@capacitor/core";

const STORAGE_KEY_DISABLED = "printer:bluetooth_disabled";

let nativePlatform = false;
try {
  // Détection SYNCHRONE (pas de import() dynamique ni d'attente async) —
  // évite une courte fenêtre au démarrage de l'app où isPrinterFeatureAvailable()
  // aurait répondu "non disponible" par défaut si l'utilisateur clique sur
  // Imprimer très vite après l'ouverture de l'app.
  nativePlatform = Capacitor.isNativePlatform();
} catch {
  nativePlatform = false;
}

// Interrupteur de secours (réglage Admin > Établissement > "Désactiver
// l'impression Bluetooth directe") — conservé de l'ancienne implémentation :
// permet de couper l'impression directe si besoin, sans empêcher le vendeur
// de continuer à remettre des reçus via Partager / WhatsApp.
// isPrinterFeatureAvailable() doit rester SYNCHRONE (utilisée directement
// dans des `if`/JSX un peu partout dans App.jsx) — l'état est donc mis en
// cache en mémoire, chargé une fois au démarrage du module.
let cachedDisabled = false;
(async () => {
  try {
    const r = await window.storage.get(STORAGE_KEY_DISABLED);
    cachedDisabled = JSON.parse(r.value) === true;
  } catch {
    cachedDisabled = false;
  }
})();

export function isPrinterFeatureAvailable() {
  return nativePlatform && !cachedDisabled;
}

export function isBluetoothPrintDisabled() {
  return cachedDisabled;
}

export async function setBluetoothPrintDisabled(disabled) {
  cachedDisabled = !!disabled;
  await window.storage.set(STORAGE_KEY_DISABLED, JSON.stringify(!!disabled));
}

// Envoie les octets bruts (commandes ESC/POS) à RawBT en écrivant un fichier
// temporaire (.prn) puis en ouvrant le menu de partage natif Android dessus
// — même mécanisme, déjà fiable, que l'export CSV/PDF (voir nativeExport.js).
// C'est plus robuste que d'essayer de déclencher RawBT directement par un
// lien technique ("intent:") : Android n'intercepte pas toujours ce genre de
// lien de façon fiable depuis une webview Capacitor (limitation connue du
// framework), alors que le partage de fichier, lui, fonctionne de façon
// prouvée chez cet utilisateur. Contrepartie : il faut choisir RawBT une
// fois dans la fenêtre de partage — Android propose généralement de mémoriser
// ce choix ("Toujours"), après quoi ça devient automatique.
async function sendToRawBt(bytes, fileName) {
  if (!nativePlatform) throw new Error("L'impression n'est disponible que dans l'application installée sur le téléphone.");
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  await Share.share({ title: fileName, url: uri });
}

// Les imprimantes tickets bon marché gèrent rarement l'UTF-8 correctement —
// on retire les accents pour le texte imprimé afin d'éviter des caractères
// illisibles, quel que soit le modèle. L'écran, lui, garde les accents.
// On remplace aussi les espaces "spéciales" (espace insécable normale ou
// fine \u00A0/\u202F, utilisées par le formatage des nombres type "1 500")
// par une espace ASCII normale : l'imprimante ne les reconnaît pas et les
// affiche comme "/" — d'où "1/500" au lieu de "1 500" constaté à l'impression.
function stripAccents(str) {
  return String(str ?? "")
    .replace(/[\u00A0\u202F\u2000-\u200A\u2028\u2029]/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const ESC = 0x1b, GS = 0x1d;
function encodeLine(text) {
  return Array.from(stripAccents(text) + "\n").map((c) => c.charCodeAt(0));
}
// Aligne deux morceaux de texte sur une ligne de largeur donnée (nom à
// gauche, prix à droite) — modèle classique de ticket de caisse.
function twoCol(left, right, width = 32) {
  const l = stripAccents(left);
  const r = stripAccents(right);
  const space = Math.max(1, width - l.length - r.length);
  return l + " ".repeat(space) + r;
}

// Numéro de reçu 100% numérique — identique à receiptNumber() côté App.jsx,
// dupliqué ici car ce fichier est un module séparé.
function receiptNumber(id) {
  if (!id) return "";
  const clean = String(id).replace(/[^a-z0-9]/gi, "");
  const n = parseInt(clean, 36);
  const digits = Number.isFinite(n) ? String(n) : clean.replace(/\D/g, "");
  return digits.slice(-9).padStart(6, "0");
}

// Type d'établissement affiché juste avant le nom de la boutique, sur la
// même ligne (ex : "Cave Majestic") — identique aux ids utilisés côté
// App.jsx (ESTABLISHMENT_TYPES). Si shop.type ne correspond à aucun id
// connu, c'est déjà un libellé personnalisé ("autre" avec une précision
// saisie par l'utilisateur) : on l'utilise tel quel.
const ESTABLISHMENT_LABELS = { maquis: "Maquis", cave: "Cave", buvette: "Buvette", bar: "Bar" };
function establishmentLabel(type) {
  if (!type || type === "autre") return "";
  return ESTABLISHMENT_LABELS[type] || type;
}
function shopHeaderLine(shop) {
  const label = establishmentLabel(shop.type);
  return label ? `${label} ${shop.name}` : shop.name;
}

// Imprime un code-barres CODE128 (même contenu — le numéro de reçu tout en
// chiffres — que le code-barres affiché à l'écran via ReceiptCodes/JsBarcode).
// Cette partie n'avait jamais été ajoutée au flux d'impression ESC/POS
// jusqu'ici : le code-barres n'existait que sur le reçu affiché à l'écran,
// jamais sur le papier imprimé.
function pushBarcode(push, digits) {
  if (!digits) return;
  push(ESC, 0x61, 0x01); // centré
  push(GS, 0x48, 0x02); // texte lisible (HRI) imprimé sous le code-barres
  push(GS, 0x68, 0x50); // hauteur du code-barres (80 points)
  push(GS, 0x77, 0x02); // largeur des barres
  const codeB = "{B" + digits; // sélection du sous-ensemble B (CODE128)
  const codeBytes = Array.from(codeB).map((c) => c.charCodeAt(0));
  push(GS, 0x6b, 0x49, codeBytes.length, ...codeBytes); // GS k 73 n d1...dn
  push(0x0a); // saut de ligne après le code-barres
}

// Construit la suite d'octets ESC/POS pour un ticket de vente.
export function buildReceiptEscPos(receipt, shop, fmt) {
  const bytes = [];
  const push = (...arr) => bytes.push(...arr);
  const line = (text = "") => push(...encodeLine(text));
  const clientName = receipt.clientName || receipt.avoirClientName;
  const hasProductAvoir = receipt.isProductAvoir || receipt.hasProductAvoir;

  push(ESC, 0x40); // reset imprimante
  push(ESC, 0x61, 0x01); // centré
  push(ESC, 0x45, 0x01); // gras ON
  line(shopHeaderLine(shop));
  push(ESC, 0x45, 0x00); // gras OFF
  line(receipt.isProductAvoir ? (receipt.avoirMonnaie ? "AVOIR PRODUIT + MONNAIE" : "AVOIR PRODUIT") : "REÇU DE VENTE");
  line("");
  push(ESC, 0x61, 0x00); // aligné à gauche
  line(`N ${receiptNumber(receipt.id)}   ${new Date(receipt.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`);
  line(`Servi par : ${receipt.vendor}`);
  if (clientName) line(`Client : ${clientName}`);
  line("--------------------------------");
  receipt.items.forEach((i) => {
    const itemTotal = i.product.bulkQty > 0 && i.product.bulkPrice > 0 && i.qty >= i.product.bulkQty
      ? Math.floor(i.qty / i.product.bulkQty) * i.product.bulkPrice + (i.qty % i.product.bulkQty) * i.product.price
      : i.qty * i.product.price;
    line(twoCol(i.product.name, fmt(itemTotal)));
    line(`  ${i.qty} x ${fmt(i.product.price)}`);
  });
  line("--------------------------------");
  push(ESC, 0x45, 0x01);
  line(twoCol(receipt.isProductAvoir ? "VALEUR EN AVOIR" : "TOTAL", fmt(receipt.total)));
  push(ESC, 0x45, 0x00);
  if (!receipt.isProductAvoir) line(PAYMENT_LABEL(receipt.paymentMethod));
  if (receipt.amountReceived != null) {
    line(twoCol("Recu", fmt(receipt.amountReceived)));
    if (receipt.paymentMethod === "credit" && receipt.total > receipt.amountReceived) {
      push(ESC, 0x45, 0x01);
      line(twoCol("Reste a payer", fmt(receipt.total - receipt.amountReceived)));
      push(ESC, 0x45, 0x00);
    } else if (!receipt.avoirMonnaie) {
      line(twoCol("Rendu", fmt(receipt.changeDue)));
    }
  }
  // Blocs d'avis — mêmes conditions et mêmes montants que les encarts
  // affichés à l'écran (solde en crédit, avoir monnaie, avoir produit).
  if (receipt.paymentMethod === "credit" && receipt.total > (receipt.amountReceived || 0)) {
    line("");
    line(`Solde en credit : ${fmt(receipt.total - (receipt.amountReceived || 0))}`);
    line(`Client : ${clientName || "Client"} - visible dans`);
    line("Credits clients jusqu'au reglement complet.");
  }
  if (receipt.avoirMonnaie) {
    line("");
    line(`Monnaie en avoir : ${fmt(receipt.avoirAmount)}`);
    line(`Client : ${clientName || "Client"} - a recuperer lors`);
    line("d'un prochain passage.");
  }
  if (hasProductAvoir) {
    line("");
    line(`Client : ${clientName || "Client"}`);
    line("Produits en avoir (a retirer ou consommer");
    line("sur place lors d'un prochain passage) :");
    receipt.items.forEach((i) => line(twoCol(`  ${i.qty} x ${i.product.name}`, fmt(i.qty * i.product.price))));
  }
  line("");
  pushBarcode(push, receiptNumber(receipt.id));
  push(ESC, 0x61, 0x01);
  line("Merci pour votre confiance.");
  line("A tres bientot !");
  line("");
  line("");
  push(GS, 0x56, 0x42, 0x00); // découpe papier (si supportée)
  return new Uint8Array(bytes);
}

function PAYMENT_LABEL(method) {
  return { especes: "Especes", mobile: "Mobile Money", credit: "Credit client" }[method] || method;
}

// Imprime le reçu via RawBT. Lève une erreur explicite si l'app n'est pas
// dans un contexte natif (aperçu web).
export async function printReceipt(receipt, shop, fmt) {
  const data = buildReceiptEscPos(receipt, shop, fmt);
  await sendToRawBt(data, `recu-${receipt.id.slice(0, 6)}.prn`);
}

// Construit et imprime un reçu de crédit encaissé (total ou dernier
// versement partiel) — plus court qu'un ticket de vente complet.
export function buildCreditReceiptEscPos(receipt, shop, fmt) {
  const bytes = [];
  const push = (...arr) => bytes.push(...arr);
  const line = (text = "") => push(...encodeLine(text));

  push(ESC, 0x40);
  push(ESC, 0x61, 0x01);
  push(ESC, 0x45, 0x01);
  line(shopHeaderLine(shop));
  push(ESC, 0x45, 0x00);
  line("CREDIT ENCAISSE");
  line("");
  push(ESC, 0x61, 0x00);
  line(`N ${receiptNumber(receipt.id)}   ${new Date(receipt.paidDate).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`);
  line("--------------------------------");
  line(twoCol("Client", receipt.clientName || "Client"));
  line(twoCol("Vente initiale", new Date(receipt.date).toLocaleDateString("fr-FR")));
  line(twoCol("Encaisse par", receipt.paidBy || ""));
  line("--------------------------------");
  push(ESC, 0x45, 0x01);
  line(twoCol("MONTANT ENCAISSE", fmt(receipt.total)));
  push(ESC, 0x45, 0x00);
  line("");
  pushBarcode(push, receiptNumber(receipt.id));
  push(ESC, 0x61, 0x01);
  line("Merci pour votre confiance.");
  line("A tres bientot !");
  line("");
  line("");
  push(GS, 0x56, 0x42, 0x00);
  return new Uint8Array(bytes);
}

export async function printCreditReceipt(receipt, shop, fmt) {
  const data = buildCreditReceiptEscPos(receipt, shop, fmt);
  await sendToRawBt(data, `credit-${receipt.id.slice(0, 6)}.prn`);
}

// Reçu d'avoir (produit OU monnaie, soldé ou en remise partielle) — même
// contenu que AvoirReceiptModal à l'écran : articles/montant d'origine,
// historique des remises, total récupéré.
export function buildAvoirReceiptEscPos(avoir, shop, fmt) {
  const bytes = [];
  const push = (...arr) => bytes.push(...arr);
  const line = (text = "") => push(...encodeLine(text));
  const isProduit = avoir.type === "produit";
  const events = isProduit ? (avoir.history || []) : (avoir.redemptions || []);
  const totalRecovered = isProduit
    ? events.reduce((s, e) => s + e.items.reduce((s2, i) => s2 + i.qty * i.price, 0), 0)
    : events.reduce((s, e) => s + e.amount, 0);

  push(ESC, 0x40);
  push(ESC, 0x61, 0x01);
  push(ESC, 0x45, 0x01);
  line(shopHeaderLine(shop));
  push(ESC, 0x45, 0x00);
  line(avoir.settled ? (isProduit ? "AVOIR PRODUIT SOLDE" : "AVOIR MONNAIE SOLDE") : (isProduit ? "REMISE PARTIELLE - PRODUIT" : "REMISE PARTIELLE - MONNAIE"));
  line("");
  push(ESC, 0x61, 0x00);
  line(`N ${receiptNumber(avoir.id)}`);
  line(`Client : ${avoir.clientName}`);
  line(`Avoir cree le ${new Date(avoir.date).toLocaleDateString("fr-FR")} par ${avoir.vendor}`);
  line("--------------------------------");
  line(isProduit ? "Articles d'origine" : "Montant d'origine");
  if (isProduit) {
    (avoir.items || []).forEach((it) => line(twoCol(`${it.qty} x ${it.name}`, fmt(it.qty * it.price))));
  } else {
    line(twoCol("Monnaie due", fmt(avoir.amount)));
  }
  line("--------------------------------");
  line("Historique des remises");
  events.forEach((e) => {
    line(`${new Date(e.date).toLocaleDateString("fr-FR")} ${e.by}`);
    if (isProduit) {
      e.items.forEach((it) => line(twoCol(`  ${it.qty} x ${it.name}`, fmt(it.qty * it.price))));
    } else {
      line(twoCol("  Rendue", fmt(e.amount)));
    }
  });
  if (events.length === 0) line("Aucune remise enregistree.");
  line("--------------------------------");
  push(ESC, 0x45, 0x01);
  line(twoCol("TOTAL RECUPERE", fmt(totalRecovered)));
  push(ESC, 0x45, 0x00);
  line("");
  pushBarcode(push, receiptNumber(avoir.id));
  push(ESC, 0x61, 0x01);
  line("Merci pour votre confiance.");
  line("A tres bientot !");
  line("");
  line("");
  push(GS, 0x56, 0x42, 0x00);
  return new Uint8Array(bytes);
}

export async function printAvoirReceipt(avoir, shop, fmt) {
  const data = buildAvoirReceiptEscPos(avoir, shop, fmt);
  await sendToRawBt(data, `avoir-${avoir.id.slice(0, 6)}.prn`);
}

// Reçu d'avoir combiné (produit + monnaie soldés ensemble) — même contenu
// que CombinedAvoirReceiptModal à l'écran.
export function buildCombinedAvoirReceiptEscPos(produit, monnaie, shop, fmt) {
  const bytes = [];
  const push = (...arr) => bytes.push(...arr);
  const line = (text = "") => push(...encodeLine(text));
  const productEvents = produit.history || [];
  const moneyEvents = monnaie.redemptions || [];
  const productValue = productEvents.reduce((s, e) => s + e.items.reduce((s2, i) => s2 + i.qty * i.price, 0), 0);
  const moneyValue = moneyEvents.reduce((s, e) => s + e.amount, 0);
  const totalRecovered = productValue + moneyValue;

  push(ESC, 0x40);
  push(ESC, 0x61, 0x01);
  push(ESC, 0x45, 0x01);
  line(shopHeaderLine(shop));
  push(ESC, 0x45, 0x00);
  line("AVOIR SOLDE - PRODUIT + MONNAIE");
  line("");
  push(ESC, 0x61, 0x00);
  line(`N ${receiptNumber(produit.id)}`);
  line(`Client : ${produit.clientName}`);
  line(`Avoir cree le ${new Date(produit.date).toLocaleDateString("fr-FR")} par ${produit.vendor}`);
  line("--------------------------------");
  line("PRODUITS - tous recus");
  (produit.items || []).forEach((it) => line(twoCol(`${it.qty} x ${it.name}`, fmt(it.qty * it.price))));
  productEvents.forEach((e) => {
    line(`  Retrait ${new Date(e.date).toLocaleDateString("fr-FR")} ${e.by}`);
    e.items.forEach((it) => line(twoCol(`    ${it.qty} x ${it.name}`, fmt(it.qty * it.price))));
  });
  line("--------------------------------");
  line(twoCol("MONNAIE due", fmt(monnaie.amount)) + " - rendue");
  moneyEvents.forEach((e) => line(twoCol(`  ${new Date(e.date).toLocaleDateString("fr-FR")} ${e.by}`, fmt(e.amount))));
  line("--------------------------------");
  push(ESC, 0x45, 0x01);
  line(twoCol("TOTAL RECUPERE", fmt(totalRecovered)));
  push(ESC, 0x45, 0x00);
  line("");
  pushBarcode(push, receiptNumber(produit.id));
  push(ESC, 0x61, 0x01);
  line("Merci pour votre confiance.");
  line("A tres bientot !");
  line("");
  line("");
  push(GS, 0x56, 0x42, 0x00);
  return new Uint8Array(bytes);
}

export async function printCombinedAvoirReceipt(produit, monnaie, shop, fmt) {
  const data = buildCombinedAvoirReceiptEscPos(produit, monnaie, shop, fmt);
  await sendToRawBt(data, `avoir-${produit.id.slice(0, 6)}.prn`);
}
