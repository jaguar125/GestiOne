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
