// Photos des pièces d'identité des clients d'hôtel.
// Envoi photo par photo (pas dans la synchronisation générale, trop lourde),
// lecture à la demande. Seuls les téléphones reliés à l'hôtel y ont accès.
// Conservation : 12 mois, purge automatique à chaque envoi.
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });
const KEEP_DAYS = 365;
const MAX_BYTES = 900_000; // une photo compressée fait ~100-200 Ko

async function verifyDevice(deviceId: string, secret: string, shopId: string) {
  if (!deviceId || !secret || !shopId) return null;
  const { data, error } = await supabase.from("devices_shop").select("shop_id, secret_hash").eq("device_id", deviceId).eq("shop_id", shopId).maybeSingle();
  if (error || !data) return null;
  if (!bcrypt.compareSync(secret, data.secret_hash)) return null;
  return data.shop_id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  let b: { device_id?: string; device_secret?: string; shop_id?: string; action?: string; id?: string; guest_id?: string; side?: string; data?: string; ids?: unknown };
  try { b = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const shopId = await verifyDevice(b.device_id ?? "", b.device_secret ?? "", b.shop_id ?? "");
  if (!shopId) return json({ error: "Appareil non reconnu" }, 401);

  if (b.action === "put") {
    const id = String(b.id ?? ""), guestId = String(b.guest_id ?? ""), side = String(b.side ?? ""), data = String(b.data ?? "");
    if (!id || !guestId || !side || !data.startsWith("data:image/")) return json({ error: "Photo invalide" }, 400);
    if (data.length > MAX_BYTES) return json({ error: "Photo trop lourde" }, 413);
    const { error } = await supabase.from("hotel_guest_photos").upsert({ id, shop_id: shopId, guest_id: guestId, side, data, size_bytes: data.length });
    if (error) return json({ error: "Enregistrement impossible" }, 500);
    const limit = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString();
    await supabase.from("hotel_guest_photos").delete().eq("shop_id", shopId).lt("created_at", limit);
    return json({ ok: true });
  }
  if (b.action === "get") {
    const ids = Array.isArray(b.ids) ? b.ids.filter((x) => typeof x === "string").slice(0, 10) : [];
    if (!ids.length) return json({ photos: [] });
    const { data, error } = await supabase.from("hotel_guest_photos").select("id, guest_id, side, data, created_at").eq("shop_id", shopId).in("id", ids);
    if (error) return json({ error: "Erreur serveur" }, 500);
    return json({ photos: data ?? [] });
  }
  if (b.action === "delete") {
    const id = String(b.id ?? "");
    if (!id) return json({ error: "Photo invalide" }, 400);
    await supabase.from("hotel_guest_photos").delete().eq("shop_id", shopId).eq("id", id);
    return json({ ok: true });
  }
  return json({ error: "Action invalide" }, 400);
});
