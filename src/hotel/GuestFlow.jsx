// src/hotel/GuestFlow.jsx
//
// Fiche du client (nuitée ou réservation) en 3 étapes :
//   1. Identité, contact et domicile, pièce d'identité
//   2. Photos de la pièce avec un cadre au format réel (CNI et permis :
//      recto + verso ; passeport : page photo)
//   3. Vérification puis validation
// Visible par la réception et le propriétaire (le technicien de surface n'y
// a pas accès). Photos conservées 12 mois.

import { useEffect, useMemo, useRef, useState } from "react";
import { H, Icon, Btn, Card, TopBar, RoomBadge, Field, inputStyle } from "./HotelUI.jsx";
import { hmOf, dayLabel, isNight } from "./hotelLogic.js";
import { ID_DOCS, cropToJpeg, fileToDocJpeg, savePhotos, loadPhotos, ageOf, docValidity, guestErrors, guestFullName, normPhone } from "./hotelPhotos.js";

const rid = () => Math.random().toString(36).slice(2, 10);
const EMPTY = { lastName: "", firstName: "", birthDate: "", birthPlace: "", phone: "", city: "", district: "", address: "", docType: "cni", docNumber: "", docExpiry: "" };

function Steps({ step }) {
  const items = ["Identité", "Photos", "Validation"];
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      {items.map((l, i) => {
        const n = i + 1;
        const done = n < step, on = n === step;
        return (
          <div key={l}>
            <div className="h-[5px] rounded-full" style={{ background: done ? H.green : on ? H.gold : H.line }} />
            <p className="mt-1.5 text-[11px] font-extrabold truncate" style={{ color: done ? H.green : on ? H.navy : "#94A3B8" }}>{n} · {l}{done ? " ✓" : ""}</p>
          </div>
        );
      })}
    </div>
  );
}

function StayBanner({ info, fmt, now }) {
  if (!info) return null;
  const { room, tariff, start, end, price } = info;
  return (
    <div className="mt-3 rounded-[18px] px-3.5 py-3 flex items-center gap-3 text-white" style={{ background: H.navy }}>
      <RoomBadge num={room.num} type={room.type} size={44} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-extrabold truncate">{tariff.name} · {fmt(price)}</p>
        <p className="text-[12px] truncate" style={{ color: "#B8C4D6" }}>{dayLabel(start, now)} {hmOf(start)} → {isNight(tariff) ? `${dayLabel(end, now)} ${hmOf(end)}` : hmOf(end)}</p>
      </div>
    </div>
  );
}

function Section({ icon, tint, ink, title, children }) {
  return (
    <>
      <div className="mt-4 mb-2 flex items-center gap-2"><span className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center" style={{ background: tint, color: ink }}><Icon name={icon} size={15} /></span><span className="text-[14px] font-extrabold">{title}</span></div>
      <Card className="p-3.5 flex flex-col gap-2.5">{children}</Card>
    </>
  );
}

function In({ label, err, show, children }) {
  return (
    <Field label={label}>
      {children}
      {show && err && <span className="block mt-1 text-[11px] font-bold" style={{ color: H.red }}>{err}</span>}
    </Field>
  );
}

// ---------- Appareil photo avec cadre au format de la pièce ----------
function DocCamera({ doc, side, onShot, onClose }) {
  const videoRef = useRef(null);
  const boxRef = useRef(null);
  const frameRef = useRef(null);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);
  const [state, setState] = useState("starting"); // starting | live | fallback
  useEffect(() => {
    let stream = null, off = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (off) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play().catch(() => {});
        setState("live");
      } catch { if (!off) setState("fallback"); }
    })();
    return () => { off = true; if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, []);
  const shoot = () => {
    const v = videoRef.current, box = boxRef.current, fr = frameRef.current;
    if (!v || !box || !fr || !v.videoWidth) return;
    const B = box.getBoundingClientRect(), F = fr.getBoundingClientRect();
    const scale = Math.max(B.width / v.videoWidth, B.height / v.videoHeight);
    const ox = (B.width - v.videoWidth * scale) / 2, oy = (B.height - v.videoHeight * scale) / 2;
    const sx = Math.max(0, (F.left - B.left - ox) / scale), sy = Math.max(0, (F.top - B.top - oy) / scale);
    const sw = Math.min(v.videoWidth - sx, F.width / scale), sh = Math.min(v.videoHeight - sy, F.height / scale);
    onShot(cropToJpeg(v, sx, sy, sw, sh));
  };
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { onShot(await fileToDocJpeg(f, doc.ratio)); } catch { /* image illisible */ }
  };
  const label = doc.id === "passeport" ? "Page photo du passeport" : `${side === "recto" ? "Recto" : "Verso"} ${doc.id === "cni" ? "de la CNI" : "du permis"}`;
  return (
    <div className="fixed inset-0 z-50 flex flex-col no-print" style={{ background: "#0B0F14", color: "#fff", paddingTop: "calc(max(40px, env(safe-area-inset-top)) + 8px)" }}>
      <div className="px-4 flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Fermer l'appareil photo" className="gb-focus w-11 h-11 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}><Icon name="x" size={18} /></button>
        <div className="flex-1 min-w-0"><p className="text-[16px] font-extrabold truncate">{label}</p><p className="text-[12px]" style={{ color: "#9AA6B8" }}>{doc.format}</p></div>
      </div>
      <div ref={boxRef} className="relative flex-1 mt-3 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full" style={{ objectFit: "cover", opacity: state === "live" ? 1 : 0 }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div ref={frameRef} className="relative w-full max-w-[420px]" style={{ aspectRatio: String(doc.ratio), borderRadius: 14, boxShadow: "0 0 0 2000px rgba(11,15,20,0.62)", border: "1.5px dashed rgba(255,255,255,0.45)" }}>
            {[["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]].map(([x, y]) => (
              <span key={x + y} className="absolute" style={{ [x]: -3, [y]: -3, width: 30, height: 30, [`border${x === "left" ? "Left" : "Right"}`]: `4px solid ${doc.accent}`, [`border${y === "top" ? "Top" : "Bottom"}`]: `4px solid ${doc.accent}`, borderRadius: 12 }} />
            ))}
            {state !== "live" && <span className="absolute inset-0 flex items-center justify-center text-center px-6 text-[13px] font-bold" style={{ color: "#C9D3E1" }}>{state === "starting" ? "Ouverture de l'appareil photo…" : "Appareil photo indisponible ici : utilisez « Prendre une photo » ou la galerie."}</span>}
          </div>
          <p className="mt-3 text-[13px] font-bold text-center rounded-full px-3.5 py-1.5" style={{ background: "rgba(11,15,20,0.75)" }}>Placez la pièce dans le cadre, les 4 coins visibles</p>
          <div className="mt-2 flex gap-1.5 flex-wrap justify-center">{["Bonne lumière", "Pas de reflet", "Bien net"].map((t) => <span key={t} className="h-7 px-2.5 rounded-full text-[11.5px] font-bold flex items-center" style={{ background: "rgba(11,15,20,0.75)", color: "#E2E8F0" }}>{t}</span>)}</div>
        </div>
      </div>
      <div className="px-6 pt-4 flex items-center justify-between" style={{ background: "#141A22", paddingBottom: "calc(22px + env(safe-area-inset-bottom))", borderRadius: "28px 28px 0 0" }}>
        <button type="button" onClick={() => galleryRef.current?.click()} aria-label="Choisir dans la galerie" className="gb-focus w-[52px] h-[52px] rounded-[16px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.10)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
        </button>
        {state === "live"
          ? <button type="button" onClick={shoot} aria-label="Prendre la photo" className="gb-focus rounded-full" style={{ width: 78, height: 78, background: "#fff", border: `5px solid ${doc.accent}`, boxShadow: "0 0 0 5px rgba(255,255,255,0.08)" }} />
          : <button type="button" onClick={() => fileRef.current?.click()} className="gb-focus min-h-[56px] px-5 rounded-[18px] text-[15px] font-extrabold whitespace-nowrap" style={{ background: H.gold, color: H.navy }}>Prendre une photo</button>}
        <span style={{ width: 52 }} />
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

// ---------- Parcours complet ----------
export default function GuestFlow({ ctx, info, mode = "night", initialGuest = null, startStep = 1, onCancel, onDone }) {
  const { fmt, now, guests = [], shopId, pushToast, by } = ctx;
  const [step, setStep] = useState(startStep);
  const [g, setG] = useState(() => ({ ...EMPTY, ...(initialGuest || {}) }));
  const [touched, setTouched] = useState(false);
  const [shots, setShots] = useState({});
  const [cam, setCam] = useState(null);
  const [newSides, setNewSides] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setG((x) => ({ ...x, [k]: v }));
  const doc = ID_DOCS[g.docType] || ID_DOCS.cni;
  const errors = guestErrors(g, now);
  const okForm = Object.keys(errors).length === 0;
  const age = ageOf(g.birthDate, now);
  const validity = docValidity(g.docExpiry, now);
  const allShots = doc.sides.every(([k]) => shots[k]);

  // Client déjà venu : reconnu par son téléphone.
  const known = useMemo(() => {
    const p = normPhone(g.phone);
    if (p.length < 8 || g.id) return null;
    return guests.find((x) => normPhone(x.phone) === p) || null;
  }, [g.phone, g.id, guests]);
  const useKnown = async () => {
    setG({ ...EMPTY, ...known });
    pushToast(`Fiche de ${guestFullName(known)} reprise`, "ok");
    if (known.photos?.length) {
      const got = await loadPhotos(shopId, known.photos);
      if (Object.keys(got).length) setShots(got);
    }
  };
  // Photos déjà enregistrées (arrivée d'une réservation, fiche reprise).
  useEffect(() => {
    if (initialGuest?.photos?.length) loadPhotos(shopId, initialGuest.photos).then((got) => { if (Object.keys(got).length) setShots(got); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nextFromForm = () => { setTouched(true); if (!okForm) { pushToast(errors.docExpiry === "Pièce expirée" ? "Pièce expirée : demandez une autre pièce" : "Complétez les champs en rouge", "error"); return; } setStep(2); };
  const changeDoc = (t) => { if (t === g.docType) return; setG((x) => ({ ...x, docType: t, photos: [] })); setShots({}); setNewSides({}); };
  const currentSide = doc.sides.find(([k]) => !shots[k]) || doc.sides[0];

  const validate = async (withPhotos = true) => {
    if (saving) return;
    setSaving(true);
    try {
      const at = new Date().toISOString();
      const id = g.id || rid();
      let photos = (g.photos || []).filter((p) => doc.sides.some(([k]) => k === p.side));
      const fresh = {};
      doc.sides.forEach(([k]) => { if (newSides[k] && shots[k]) fresh[k] = shots[k]; });
      if (withPhotos && Object.keys(fresh).length) photos = [...photos.filter((p) => !fresh[p.side]), ...(await savePhotos(shopId, id, fresh))];
      const guest = { ...g, id, lastName: g.lastName.trim().toUpperCase(), firstName: g.firstName.trim(), birthPlace: g.birthPlace.trim(), phone: g.phone.trim(), city: g.city.trim(), district: g.district.trim(), address: (g.address || "").trim(), docNumber: g.docNumber.trim().toUpperCase(), photos, photosPending: !withPhotos, visits: (g.visits || 0) + (mode === "photos" || mode === "arrival" ? 0 : 1), createdAt: g.createdAt || at, updatedAt: at, by: g.by || by };
      await onDone(guest);
    } finally { setSaving(false); }
  };

  const shotTaken = (data) => {
    const k = cam;
    setShots((s) => ({ ...s, [k]: data }));
    setNewSides((n) => ({ ...n, [k]: true }));
    setCam(null);
  };

  // ----- Étape 1 -----
  if (step === 1) {
    const show = touched;
    const bad = (k) => (show && errors[k] ? { ...inputStyle, borderColor: "#F5C2C2" } : inputStyle);
    return (
      <div>
        <TopBar title="Fiche du client" sub={mode === "resa" ? "Obligatoire pour une réservation" : mode === "arrival" ? "Arrivée du client réservé" : "Obligatoire pour une nuitée"} onBack={onCancel} />
        <Steps step={1} />
        <StayBanner info={info} fmt={fmt} now={now} />
        <Section icon="users" tint={H.goldSoft} ink={H.goldDark} title="Identité">
          <div className="grid grid-cols-2 gap-2">
            <In label="Nom *" err={errors.lastName} show={show}><input value={g.lastName} onChange={(e) => set("lastName", e.target.value)} autoCapitalize="characters" style={{ ...bad("lastName"), textTransform: "uppercase", fontWeight: 700 }} /></In>
            <In label="Prénoms *" err={errors.firstName} show={show}><input value={g.firstName} onChange={(e) => set("firstName", e.target.value)} autoCapitalize="words" style={bad("firstName")} /></In>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <In label="Date de naissance *" err={errors.birthDate} show={show}><input type="date" value={g.birthDate} max={new Date(now).toISOString().slice(0, 10)} onChange={(e) => set("birthDate", e.target.value)} style={bad("birthDate")} /></In>
            <In label="Lieu de naissance *" err={errors.birthPlace} show={show}><input value={g.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} style={bad("birthPlace")} /></In>
          </div>
          {age != null && age >= 0 && <p className="text-[11.5px] font-bold" style={{ color: age < 18 ? H.orange : H.muted }}>{age} ans{age < 18 ? " · client mineur" : " · majeur"}</p>}
        </Section>
        <Section icon="home" tint="#E2F5F2" ink="#0B7A6E" title="Contact et domicile">
          <In label="Téléphone *" err={errors.phone} show={show}>
            <span className="flex items-stretch overflow-hidden rounded-[14px]" style={{ border: `1.5px solid ${show && errors.phone ? "#F5C2C2" : H.line}`, minHeight: 48 }}>
              <span className="px-3 flex items-center text-[14px] font-extrabold" style={{ background: H.ground, color: H.ink2, borderRight: `1.5px solid ${H.line}` }}>+225</span>
              <input type="tel" inputMode="tel" value={g.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07 00 00 00 00" className="flex-1 min-w-0 px-3 outline-none text-[15px]" />
            </span>
          </In>
          {known && (
            <button type="button" onClick={useKnown} className="gb-focus w-full rounded-[14px] px-3 py-2.5 flex items-center gap-2.5 text-left" style={{ background: H.indigoSoft, border: "1.5px solid #C7CBFA" }}>
              <Icon name="users" size={18} color={H.indigo} />
              <span className="flex-1 min-w-0"><span className="block text-[13px] font-extrabold" style={{ color: "#3730A3" }}>Client connu : {guestFullName(known)}</span><span className="block text-[11.5px]" style={{ color: "#4338CA" }}>{known.visits || 1} visite{(known.visits || 1) > 1 ? "s" : ""} · reprendre sa fiche</span></span>
              <Icon name="chev" size={16} color={H.indigo} />
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <In label="Ville *" err={errors.city} show={show}><input value={g.city} onChange={(e) => set("city", e.target.value)} style={bad("city")} /></In>
            <In label="Quartier *" err={errors.district} show={show}><input value={g.district} onChange={(e) => set("district", e.target.value)} style={bad("district")} /></In>
          </div>
          <Field label="Précision du domicile (optionnel)"><input value={g.address} onChange={(e) => set("address", e.target.value)} placeholder="Ex. : près de la pharmacie, rue…" style={inputStyle} /></Field>
        </Section>
        <Section icon="key" tint={H.indigoSoft} ink={H.indigo} title="Pièce d'identité">
          <div className="grid grid-cols-3 gap-1.5">
            {Object.values(ID_DOCS).map((d) => { const on = d.id === g.docType; return (
              <button key={d.id} type="button" onClick={() => changeDoc(d.id)} aria-pressed={on} className="gb-focus min-h-[56px] rounded-[14px] px-1 flex flex-col items-center justify-center" style={{ background: on ? H.navy : "#fff", color: on ? "#fff" : H.ink2, border: `1.5px solid ${on ? H.navy : H.line}` }}>
                <span className="text-[13px] font-extrabold">{d.label}</span><span className="text-[10px] font-bold opacity-80">{d.id === "cni" ? "Carte d'identité" : d.id === "permis" ? "de conduire" : "page photo"}</span>
              </button>
            ); })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <In label={`${doc.numLabel} *`} err={errors.docNumber} show={show}><input value={g.docNumber} onChange={(e) => set("docNumber", e.target.value)} autoCapitalize="characters" style={{ ...bad("docNumber"), fontFamily: "monospace", textTransform: "uppercase" }} /></In>
            <In label="Valable jusqu'au *" err={errors.docExpiry === "Pièce expirée" ? null : errors.docExpiry} show={show}><input type="date" value={g.docExpiry} onChange={(e) => set("docExpiry", e.target.value)} style={{ ...inputStyle, borderColor: validity ? (validity.expired ? "#F5C2C2" : "#C9EBD5") : show && errors.docExpiry ? "#F5C2C2" : H.line }} /></In>
          </div>
          {validity && (
            <div className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-[12.5px] font-bold" style={{ background: validity.expired ? H.redSoft : H.greenSoft, color: validity.expired ? H.red : H.green }}>
              <Icon name={validity.expired ? "warn" : "check"} size={16} stroke={2.6} /><span>{validity.text}</span>
            </div>
          )}
        </Section>
        <Btn kind="gold" full className="mt-4 !min-h-[56px] !text-[15.5px]" onClick={nextFromForm} icon="cal">Continuer · photos de la pièce</Btn>
        <p className="mt-2 text-center text-[11px]" style={{ color: H.muted }}>* champs obligatoires · visible seulement par la réception et le propriétaire</p>
      </div>
    );
  }

  // ----- Étape 2 -----
  if (step === 2) {
    return (
      <div>
        <TopBar title="Photos de la pièce" sub={`${doc.long} · ${guestFullName(g) || "client"}`} onBack={() => (startStep === 2 ? onCancel() : setStep(1))} />
        <Steps step={2} />
        <Card className="mt-4 p-3.5">
          <p className="text-[13px] font-extrabold">{doc.sides.length > 1 ? "Photographiez le recto puis le verso" : "Photographiez la page avec la photo"}</p>
          <p className="text-[11.5px]" style={{ color: H.muted }}>{doc.format} · le cadre s'adapte à la pièce</p>
          <div className={`mt-3 grid gap-2.5 ${doc.sides.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {doc.sides.map(([k, l]) => {
              const img = shots[k];
              const cur = !img && k === currentSide[0];
              return (
                <button key={k} type="button" onClick={() => setCam(k)} className="gb-focus text-left" aria-label={img ? `Reprendre la photo ${l}` : `Photographier ${l}`}>
                  <span className="block relative overflow-hidden rounded-[12px]" style={{ aspectRatio: String(doc.ratio), background: img ? "#000" : cur ? "#FFFBF2" : H.ground, border: `2px ${img ? "solid" : "dashed"} ${img ? "#C9EBD5" : cur ? H.gold : H.line}` }}>
                    {img ? <img src={img} alt={`${doc.long} · ${l}`} className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} /> : (
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ color: cur ? H.goldDark : "#94A3B8" }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3.5" /></svg>
                        <span className="text-[12px] font-extrabold text-center px-2 leading-tight">Toucher pour photographier</span>
                      </span>
                    )}
                    {img && <span className="absolute right-1.5 bottom-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: H.green }}><Icon name="check" size={12} color="#fff" stroke={3.2} /></span>}
                  </span>
                  <span className="mt-1.5 flex justify-between text-[12px] font-extrabold"><span>{l}</span><span style={{ color: img ? H.goldDark : cur ? H.goldDark : H.muted }}>{img ? "Reprendre" : cur ? "À prendre" : "En attente"}</span></span>
                </button>
              );
            })}
          </div>
        </Card>
        <div className="mt-3 flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[12px] font-bold" style={{ background: H.indigoSoft, color: "#3730A3" }}>
          <Icon name="shield" size={18} /><span>Photos conservées 12 mois, visibles seulement par la réception et le propriétaire.</span>
        </div>
        <Btn kind="gold" full className="mt-4 !min-h-[56px] !text-[15.5px]" disabled={!allShots} onClick={() => setStep(3)}>{allShots ? "Continuer · vérification" : `Photo${doc.sides.length > 1 ? "s" : ""} à prendre : ${doc.sides.filter(([k]) => !shots[k]).map(([, l]) => l.toLowerCase()).join(" et ")}`}</Btn>
        {mode === "resa" && startStep === 1 && <button type="button" onClick={() => setStep(3)} className="gb-focus mt-2 w-full min-h-[44px] text-[13px] font-extrabold" style={{ color: H.goldDark }}>Client absent : photos à l'arrivée</button>}
        {cam && <DocCamera doc={doc} side={cam} onShot={shotTaken} onClose={() => setCam(null)} />}
      </div>
    );
  }

  // ----- Étape 3 -----
  const initials = `${(g.lastName || "?")[0] || ""}${(g.firstName || "")[0] || ""}`.toUpperCase();
  const withPhotos = allShots;
  const cta = mode === "photos" ? "Enregistrer les photos" : mode === "arrival" ? "Continuer · paiement" : mode === "resa" ? "Valider la réservation" : `Valider la nuitée · ${fmt(info?.price || 0)}`;
  return (
    <div>
      <TopBar title="Vérification" sub="Relisez avant de valider" onBack={() => setStep(2)} />
      <Steps step={3} />
      <Card className="mt-4 p-3.5">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-[15px] flex items-center justify-center text-[17px] font-extrabold shrink-0" style={{ background: H.goldSoft, color: H.goldDark }}>{initials}</span>
          <span className="flex-1 min-w-0"><span className="block text-[16px] font-extrabold truncate">{guestFullName(g)}</span><span className="block text-[12px] truncate" style={{ color: H.muted }}>Né(e) le {g.birthDate ? new Date(g.birthDate).toLocaleDateString("fr-FR") : "—"} à {g.birthPlace}{age != null ? ` · ${age} ans` : ""}</span></span>
          <button type="button" onClick={() => setStep(1)} className="gb-focus text-[12.5px] font-extrabold shrink-0" style={{ color: H.goldDark }}>Modifier</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-[12px] px-2.5 py-2 min-w-0" style={{ background: "#F7F8FA" }}><span className="block text-[10.5px] font-extrabold" style={{ color: H.muted }}>TÉLÉPHONE</span><span className="block text-[13px] font-extrabold truncate">+225 {g.phone}</span></span>
          <span className="rounded-[12px] px-2.5 py-2 min-w-0" style={{ background: "#F7F8FA" }}><span className="block text-[10.5px] font-extrabold" style={{ color: H.muted }}>DOMICILE</span><span className="block text-[13px] font-extrabold truncate">{g.city} · {g.district}</span></span>
        </div>
      </Card>
      <Card className="mt-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0"><span className="block text-[14px] font-extrabold">{doc.long}</span><span className="block text-[12px] font-mono truncate" style={{ color: H.muted }}>{g.docNumber.toUpperCase()}</span></span>
          {validity && <span className="text-[11px] font-extrabold rounded-[8px] px-2 py-1 shrink-0" style={{ background: H.greenSoft, color: H.green }}>Valide · {new Date(g.docExpiry).toLocaleDateString("fr-FR")}</span>}
        </div>
        {withPhotos ? (
          <div className={`mt-2.5 grid gap-2 ${doc.sides.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {doc.sides.map(([k, l]) => (
              <div key={k}>
                <span className="block relative overflow-hidden rounded-[10px]" style={{ aspectRatio: String(doc.ratio), border: "1.5px solid #C7D7F8" }}><img src={shots[k]} alt={`${doc.long} · ${l}`} className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} /></span>
                <span className="mt-1 flex justify-between text-[11.5px] font-extrabold"><span>{l}</span><button type="button" onClick={() => { setStep(2); setCam(k); }} className="gb-focus" style={{ color: H.goldDark }}>Reprendre</button></span>
              </div>
            ))}
          </div>
        ) : <p className="mt-2 text-[12px] font-bold" style={{ color: H.orange }}>Photos à prendre à l'arrivée du client.</p>}
      </Card>
      {info && (
        <div className="mt-2.5 rounded-[20px] px-3.5 py-3 flex items-center gap-3 text-white" style={{ background: H.navy }}>
          <RoomBadge num={info.room.num} type={info.room.type} size={44} />
          <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-extrabold truncate">{info.tariff.name} · {dayLabel(info.start, now)} {hmOf(info.start)} → {isNight(info.tariff) ? `${dayLabel(info.end, now)} ${hmOf(info.end)}` : hmOf(info.end)}</span>{info.payLabel && <span className="block text-[12px] truncate" style={{ color: "#B8C4D6" }}>Paiement : {info.payLabel}</span>}</span>
          <span className="text-[16px] font-extrabold shrink-0" style={{ color: H.gold }}>{fmt(info.price)}</span>
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[12px] font-bold" style={{ background: H.indigoSoft, color: "#3730A3" }}>
        <Icon name="shield" size={18} /><span>Visible uniquement par la réception et le propriétaire. Le client est reconnu à sa prochaine visite.</span>
      </div>
      <div className="mt-4 flex gap-2.5">
        <button type="button" onClick={() => setStep(1)} aria-label="Modifier la fiche" className="gb-focus w-14 h-14 shrink-0 rounded-[18px] flex items-center justify-center" style={{ background: "#fff", border: `1.5px solid ${H.line}`, color: H.navy }}><Icon name="edit" size={20} /></button>
        <button type="button" disabled={saving} onClick={() => validate(withPhotos)} className="gb-focus flex-1 min-w-0 h-14 rounded-[18px] px-3 flex items-center justify-center gap-2 text-[15px] font-extrabold whitespace-nowrap overflow-hidden disabled:opacity-60" style={{ background: H.gold, color: H.navy, boxShadow: "0 10px 22px rgba(201,138,30,0.30)" }}>
          <Icon name="check" size={18} stroke={2.8} /><span className="truncate">{saving ? "Enregistrement…" : cta}</span>
        </button>
      </div>
      {cam && <DocCamera doc={doc} side={cam} onShot={shotTaken} onClose={() => setCam(null)} />}
    </div>
  );
}

// ---------- Consultation de la fiche (réception et propriétaire) ----------
export function GuestView({ ctx, guest, onBack, onAddPhotos }) {
  const { shopId, now } = ctx;
  const [shots, setShots] = useState(null);
  const doc = ID_DOCS[guest.docType] || ID_DOCS.cni;
  useEffect(() => { let off = false; loadPhotos(shopId, guest.photos || []).then((got) => { if (!off) setShots(got); }); return () => { off = true; }; }, [guest.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [zoom, setZoom] = useState(null);
  const age = ageOf(guest.birthDate, now);
  const validity = docValidity(guest.docExpiry, now);
  const rows = [
    ["Né(e) le", `${guest.birthDate ? new Date(guest.birthDate).toLocaleDateString("fr-FR") : "—"} à ${guest.birthPlace || "—"}${age != null ? ` · ${age} ans` : ""}`],
    ["Téléphone", guest.phone ? `+225 ${guest.phone}` : "—"],
    ["Domicile", [guest.city, guest.district, guest.address].filter(Boolean).join(" · ") || "—"],
    [doc.numLabel, (guest.docNumber || "—").toUpperCase()],
    ["Valable jusqu'au", guest.docExpiry ? new Date(guest.docExpiry).toLocaleDateString("fr-FR") : "—"],
    ["Visites", String(guest.visits || 1)],
  ];
  const hasPhotos = (guest.photos || []).length > 0;
  return (
    <div>
      <TopBar title={guestFullName(guest)} sub="Fiche du client" onBack={onBack} />
      <Card className="mt-3 px-3.5">
        {rows.map(([k, v], i) => <div key={k} className="flex justify-between gap-3 py-2.5 text-[13.5px]" style={{ borderBottom: i === rows.length - 1 ? "none" : `1px solid ${H.line2}` }}><span className="shrink-0" style={{ color: H.muted }}>{k}</span><b className="text-right min-w-0 break-words">{v}</b></div>)}
      </Card>
      {validity && <div className="mt-2.5 flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-[12.5px] font-bold" style={{ background: validity.expired ? H.redSoft : H.greenSoft, color: validity.expired ? H.red : H.green }}><Icon name={validity.expired ? "warn" : "check"} size={16} stroke={2.6} /><span>{validity.text}</span></div>}
      <div className="mt-4 mb-2 flex items-center justify-between"><span className="text-[14px] font-extrabold">{doc.long}</span>{hasPhotos && <span className="text-[11.5px]" style={{ color: H.muted }}>conservées 12 mois</span>}</div>
      {!hasPhotos ? (
        <Card className="p-4 text-center"><p className="text-[13px] font-bold" style={{ color: H.orange }}>Aucune photo de la pièce.</p><Btn kind="gold" className="mx-auto mt-3" onClick={onAddPhotos}>Photographier la pièce</Btn></Card>
      ) : (
        <div className={`grid gap-2.5 ${doc.sides.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {doc.sides.map(([k, l]) => (
            <button key={k} type="button" onClick={() => shots?.[k] && setZoom(shots[k])} className="gb-focus text-left">
              <span className="block relative overflow-hidden rounded-[12px]" style={{ aspectRatio: String(doc.ratio), background: H.ground, border: `1.5px solid ${H.line}` }}>
                {shots?.[k] ? <img src={shots[k]} alt={`${doc.long} · ${l}`} className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} /> : <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-center px-2" style={{ color: H.muted }}>{shots ? "Photo indisponible hors connexion" : "Chargement…"}</span>}
              </span>
              <span className="mt-1 block text-[12px] font-extrabold">{l}</span>
            </button>
          ))}
        </div>
      )}
      {hasPhotos && <Btn kind="ghost" full className="mt-3" onClick={onAddPhotos}>Reprendre les photos</Btn>}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" style={{ background: "rgba(0,0,0,0.88)" }} onClick={() => setZoom(null)} role="dialog" aria-label="Photo de la pièce">
          <img src={zoom} alt="Pièce d'identité" className="max-w-full max-h-full rounded-[10px]" />
        </div>
      )}
    </div>
  );
}
