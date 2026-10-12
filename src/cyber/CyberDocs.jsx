// src/cyber/CyberDocs.jsx
//
// Reçu de paiement de crédit et rapport de clôture de caisse, affichés,
// imprimés et partagés comme le reçu de vente.

import { TopBar, Empty } from "./CyberUI.jsx";
import { receiptInfo, creditPaymentGroup, creditDoc, closeDoc } from "./cyberReceipt.js";
import { DocScreen, SuccessHead } from "./CyberPaper.jsx";

export function PaymentReceiptScreen({ ctx, clientId, payKey, fresh, onBack }) {
  const { sales, clients, fmt, shop, settings } = ctx;
  const g = creditPaymentGroup(sales, clientId, payKey);
  if (!g) return <div><TopBar title="Reçu de paiement" onBack={onBack} /><Empty title="Paiement introuvable" /></div>;
  const info = receiptInfo(shop, settings);
  const client = clients.find((c) => c.id === clientId);
  const head = fresh ? <SuccessHead title="Paiement encaissé" sub={g.dueAfter > 0 ? `Reste ${fmt(g.dueAfter)} à payer` : "Crédit entièrement réglé"} /> : null;
  return <DocScreen ctx={ctx} m={creditDoc(g, info, fmt)} info={info} phone={client?.phone || g.client?.phone} head={head} title={`Reçu ${g.no}`} onBack={onBack} icon="cash" mainLabel={fresh ? "Terminer" : "Retour"} mainIcon={fresh ? "check" : "back"} />;
}

export function CloseReceiptScreen({ ctx, closeId, fresh, onBack }) {
  const { closes, fmt, shop, settings } = ctx;
  const c = closes.find((x) => x.id === closeId);
  if (!c) return <div><TopBar title="Clôture" onBack={onBack} /><Empty title="Clôture introuvable" /></div>;
  const info = receiptInfo(shop, settings);
  const gap = Number(c.gap) || 0;
  const head = fresh ? <SuccessHead title="Journée clôturée" sub={gap === 0 ? "Caisse juste" : `${gap < 0 ? "Manquant" : "Excédent"} de ${fmt(Math.abs(gap))}`} /> : null;
  return <DocScreen ctx={ctx} m={closeDoc(c, info, fmt)} info={info} head={head} title="Rapport de clôture" onBack={onBack} icon="lock" mainLabel={fresh ? "Terminer" : "Retour"} mainIcon={fresh ? "check" : "back"} />;
}
