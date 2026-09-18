// src/ReceiptCodes.jsx (co-localisé dans App.jsx normalement, mais séparé ici
// pour la lisibilité — importé directement dans App.jsx)
//
// Affiche un CODE-BARRES (Code128) sous un reçu, encodant le numéro du
// document (vente, crédit encaissé, avoir, commande fournisseur...).
// Remplace l'ancien QR code : un code-barres Code128 est directement
// compatible avec le scanner caméra déjà utilisé ailleurs dans l'app
// (CameraScanner détecte le format "code_128"), ce qui permet de scanner un
// reçu déjà remis au client pour retrouver l'avoir ou le crédit associé.
//
// Nécessite le paquet "jsbarcode" (npm install jsbarcode).

import { useEffect, useRef } from "react";

// `label` = texte du numéro affiché ailleurs sur le reçu (ex: "N° 000123456") ;
// `qrValue` (nom conservé pour compatibilité des appels existants) = valeur à
// encoder si elle diffère du label. Seuls les chiffres sont encodés, pour
// rester cohérent avec receiptNumber() (numéros 100% numériques) côté App.jsx.
export function ReceiptCodes({ id, label, qrValue }) {
  const barcodeCanvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const JsBarcode = (await import("jsbarcode")).default;
        const raw = String(qrValue || label || id || "");
        const digitsOnly = raw.replace(/[^0-9]/g, "");
        const value = digitsOnly || String(id || "").replace(/[^0-9a-zA-Z]/g, "") || "0";
        if (!cancelled && barcodeCanvasRef.current) {
          JsBarcode(barcodeCanvasRef.current, value, {
            format: "CODE128",
            width: 1.5,
            height: 42,
            displayValue: false,
            margin: 0,
            background: "#ffffff",
            lineColor: "#1a1a1a",
          });
        }
      } catch { /* génération code-barres indisponible */ }
    })();
    return () => { cancelled = true; };
  }, [id, label, qrValue]);

  return (
    <div className="flex flex-col items-center pt-3 no-print-hide">
      <canvas ref={barcodeCanvasRef} />
    </div>
  );
}
