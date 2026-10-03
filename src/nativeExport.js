// src/nativeExport.js
//
// `window.print()` et les liens `<a download>` (l'ancienne approche) ne
// déclenchent RIEN dans une app Android empaquetée avec Capacitor : il n'y a
// pas de gestionnaire de téléchargement ni de boîte de dialogue d'impression
// système branchés par défaut dans la WebView native. Ici, on écrit un vrai
// fichier via le plugin Filesystem, puis on ouvre le menu de partage natif
// (Share) pour que l'utilisateur choisisse où l'enregistrer ou l'envoyer.
//
// En dehors de l'app native (aperçu web, navigateur), on retombe sur les
// méthodes classiques du navigateur.

async function isNative() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Convertit un ArrayBuffer en base64 (nécessaire pour Filesystem.writeFile
// avec un contenu binaire comme un PDF).
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function saveAndShare(fileName, data, isBase64) {
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  await Filesystem.writeFile({
    path: fileName,
    data,
    directory: Directory.Cache,
    encoding: isBase64 ? undefined : Encoding.UTF8,
  });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  await Share.share({ title: fileName, url: uri });
}

// Exporte un texte CSV. `csvString` doit déjà inclure le BOM UTF-8 (\uFEFF)
// pour un affichage correct des accents dans Excel.
export async function exportCsvFile(fileName, csvString) {
  if (await isNative()) {
    await saveAndShare(fileName, csvString, false);
    return;
  }
  // Repli navigateur (aperçu web hors app native) : ancienne méthode.
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Exporte un document jsPDF (l'objet retourné par `new jsPDF()`).
export async function exportPdfDoc(fileName, doc) {
  if (await isNative()) {
    const base64 = arrayBufferToBase64(doc.output("arraybuffer"));
    await saveAndShare(fileName, base64, true);
    return;
  }
  // Repli navigateur : téléchargement direct du PDF.
  doc.save(fileName);
}

// Partage un simple texte (ex : le contenu d'un reçu) via le menu de partage
// natif — utilisé notamment comme repli du bouton "Imprimer" quand
// l'impression Bluetooth directe est indisponible ou désactivée :
// `window.print()` ne fait rien dans l'app native, alors que ce partage,
// lui, ouvre effectivement une vraie boîte de dialogue (SMS, WhatsApp,
// e-mail, Bluetooth, etc.) que l'utilisateur peut utiliser pour remettre le
// reçu au client.
export async function shareText(title, text) {
  if (await isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text });
    return;
  }
  // Repli navigateur : Web Share API si disponible, sinon impression classique.
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title, text });
    return;
  }
  window.print();
}

// Exporte un fichier binaire (ex : classeur Excel .xlsx) à partir d'un
// Uint8Array : partage natif dans l'app, téléchargement dans le navigateur.
export async function exportBinaryFile(fileName, bytes, mime = "application/octet-stream") {
  if (await isNative()) {
    await saveAndShare(fileName, arrayBufferToBase64(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), true);
    return;
  }
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Partage une image (ex : facture / bon de commande en PNG) avec une légende.
// App native : fichier écrit dans le cache puis menu de partage (WhatsApp,
// e-mail…). Navigateur : Web Share API avec fichier si disponible, sinon
// téléchargement de l'image puis ouverture de WhatsApp avec la légende.
// Retourne "shared" | "downloaded".
export async function shareImage(fileName, dataUrl, text = "", phone = "", dialogTitle = "Envoyer") {
  const base64 = String(dataUrl).split(",")[1] || "";
  const mime = /^data:([^;]+);/.exec(String(dataUrl))?.[1] || "image/png";
  if (await isNative()) {
    const num = whatsappNumber(phone);
    if (num) {
      // Envoi direct dans la discussion WhatsApp du numéro indiqué.
      try {
        const { registerPlugin } = await import("@capacitor/core");
        const WhatsAppShare = registerPlugin("WhatsAppShare");
        await WhatsAppShare.shareFile({ base64, fileName, mimeType: mime, phone: num, text });
        return "direct";
      } catch (e) {
        // APK sans le module WhatsApp (pas encore reconstruit) : on ouvre
        // quand même directement la discussion du numéro, avec le texte.
        if (isUnimplemented(e)) { await openWhatsAppChat(num, text); return "chat"; }
        /* WhatsApp absent : menu de partage */
      }
    }
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({ title: fileName, text, url: uri, dialogTitle });
    return "shared";
  }
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], fileName, { type: mime });
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName, text });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "shared";
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.open(`https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`, "_blank");
  return "downloaded";
}

// Partage un PDF (jsPDF) avec une légende : menu de partage natif dans l'app
// (choisir WhatsApp puis le contact), Web Share API dans le navigateur, sinon
// téléchargement du PDF puis ouverture de WhatsApp avec la légende.
// Numéro au format international sans « + » (WhatsApp) : 0140575147 → 2250140575147.
function isUnimplemented(e) {
  const m = `${e?.code || ""} ${e?.message || e || ""}`;
  return /UNIMPLEMENTED|not implemented/i.test(m);
}

// Ouvre DIRECTEMENT la discussion WhatsApp d'un numéro, message pré-rempli
// (sans photo). Fonctionne toujours, même si le numéro n'est pas enregistré
// dans les contacts du téléphone.
// Avec `image` (data URL) : la photo est aussi copiée dans le presse-papiers
// pour être collée dans la discussion (résultat "chat+photo").
export async function openWhatsAppChat(phone, text = "", image = null, fileName = "photo.jpg") {
  const num = whatsappNumber(phone);
  if (await isNative()) {
    try {
      const { registerPlugin } = await import("@capacitor/core");
      const WhatsAppShare = registerPlugin("WhatsAppShare");
      const opts = { phone: num, text };
      if (image) { opts.base64 = String(image).split(",")[1] || ""; opts.fileName = fileName; }
      const r = await WhatsAppShare.openChat(opts);
      return r && r.photoCopied ? "chat+photo" : "chat";
    } catch { /* ancienne version de l'APK : lien wa.me ci-dessous */ }
  }
  window.open(`https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`, "_blank");
  return "chat";
}

// "+225 01 41 29 97 10" — numéro international lisible (affichage).
export function whatsappDisplay(phone) {
  const n = whatsappNumber(phone);
  if (!n) return "";
  if (n.startsWith("225") && n.length === 13) return "+225 " + n.slice(3).replace(/(\d{2})(?=\d)/g, "$1 ");
  return "+" + n;
}

export function whatsappNumber(phone, defaultCountry = "225") {
  const raw = String(phone || "").trim();
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (raw.startsWith("+")) return d;
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith(defaultCountry) && d.length > 10) return d;
  if (d.length === 10 || d.length === 8) return defaultCountry + d;
  return d;
}

export async function sharePdfDoc(fileName, doc, text = "", phone = "") {
  if (await isNative()) {
    const num = whatsappNumber(phone);
    if (num) {
      // Envoi direct dans la discussion WhatsApp du fournisseur.
      try {
        const { registerPlugin } = await import("@capacitor/core");
        const WhatsAppShare = registerPlugin("WhatsAppShare");
        await WhatsAppShare.shareFile({ base64: arrayBufferToBase64(doc.output("arraybuffer")), fileName, mimeType: "application/pdf", phone: num, text });
        return "direct";
      } catch { /* ancienne version de l'app ou WhatsApp absent : menu de partage */ }
    }
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    await Filesystem.writeFile({ path: fileName, data: arrayBufferToBase64(doc.output("arraybuffer")), directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    try {
      await Share.share({ title: fileName, text, url: uri, dialogTitle: "Envoyer la facture" });
    } catch (e) {
      if (/cancel/i.test(String(e?.message || e))) return "cancelled";
      throw e;
    }
    return "shared";
  }
  try {
    const file = new File([doc.output("blob")], fileName, { type: "application/pdf" });
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName, text });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "shared";
  }
  doc.save(fileName);
  window.open(`https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`, "_blank");
  return "downloaded";
}
