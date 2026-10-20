// src/bar/BarApp.jsx
//
// Point d'entrée React de Bar Manager (entreprises de type « bar »).
// L'interface est dessinée par barEngine.js dans ce conteneur ; GestiOne
// fournit les données synchronisées, le personnel, la licence et la session.

import { useEffect, useRef } from "react";
import "./barManager.css";
import { mountBarManager } from "./barEngine.js";

export default function BarApp(props) {
  const ref = useRef(null);
  const engine = useRef(null);
  const shopId = props.shop?.id;
  useEffect(() => {
    if (!ref.current) return undefined;
    engine.current = mountBarManager(ref.current, props);
    return () => { if (engine.current) engine.current.destroy(); engine.current = null; };
  }, [shopId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (engine.current) engine.current.update(props); });
  return <div ref={ref} />;
}
