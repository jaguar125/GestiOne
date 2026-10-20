import { useEffect, useRef } from "react";
import "./aluminium.css";
import { mountAluminium } from "./aluEngine.js";

// Espace « Aluminium » : le moteur dessine son interface dans ce conteneur et
// échange avec GestiOne par les props (données, personnel, licence, synchro).
export default function AluApp(props) {
  const ref = useRef(null);
  const engine = useRef(null);
  const shopId = props.shop?.id;
  useEffect(() => {
    if (!ref.current) return undefined;
    engine.current = mountAluminium(ref.current, props);
    return () => { if (engine.current) engine.current.destroy(); engine.current = null; };
  }, [shopId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (engine.current) engine.current.update(props); });
  return <div ref={ref} />;
}
