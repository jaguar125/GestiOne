import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Identifiants de l'éditeur : lus dans les secrets Supabase (les mêmes que
// la fonction owner-shops), plus aucune valeur en dur dans le code.
function normalize(s: string | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}
const OWNER_EMAIL = normalize(Deno.env.get("OWNER_EMAIL"));
const OWNER_SECRET = normalize(Deno.env.get("OWNER_SECRET"));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const failures = new Map<string, { count: number; resetAt: number }>();
function isBlocked(ip: string): boolean {
  const e = failures.get(ip);
  return !!e && Date.now() < e.resetAt && e.count >= 10;
}
function recordFailure(ip: string) {
  const now = Date.now();
  const e = failures.get(ip);
  if (!e || now > e.resetAt) failures.set(ip, { count: 1, resetAt: now + 60_000 });
  else e.count += 1;
}

const ONLINE_THRESHOLD_MS = 90_000;

let lastAgentBeat = 0;
function agentBeat() {
  const now = Date.now();
  if (now - lastAgentBeat < 15_000) return;
  lastAgentBeat = now;
  supabase.from("support_agent_presence").upsert({ id: "owner", last_seen_at: new Date(now).toISOString() }).then(() => {});
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Mot de passe personnel de l'éditeur (créé depuis l'espace propriétaire).
async function passwordOk(password: string | undefined): Promise<"ok" | "setup" | "bad"> {
  const { data: row } = await supabase.from("app_owner_auth").select("password_hash").eq("id", 1).maybeSingle();
  if (!row?.password_hash) return "setup";
  return (await bcrypt.compare(String(password ?? ""), row.password_hash)) ? "ok" : "bad";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Méthode non autorisée" }, 405);
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (isBlocked(ip)) return jsonResponse({ error: "Trop de tentatives, réessayez plus tard." }, 429);

  let body: { email?: string; secret?: string; password?: string; action?: string; device_id?: string; message?: string; since?: string; token?: string };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Requête invalide" }, 400); }

  // Nombre de nouveaux messages des boutiques, avec le jeton de l'appareil du
  // propriétaire. Ne renvoie AUCUN nom ni contenu : seulement un nombre.
  if (body.action === "count") {
    if (!body.token || body.token.length < 32) return jsonResponse({ invalid: true });
    try {
      const hash = await sha256(body.token);
      const { data: tok } = await supabase.from("support_owner_tokens").select("expires_at").eq("token_hash", hash).maybeSingle();
      if (!tok || new Date(tok.expires_at).getTime() < Date.now()) { recordFailure(ip); return jsonResponse({ invalid: true }); }
      const since = body.since && !Number.isNaN(Date.parse(body.since)) ? new Date(body.since).toISOString() : new Date(Date.now() - 86_400_000).toISOString();
      const { data, count, error } = await supabase.from("support_messages")
        .select("created_at", { count: "exact" })
        .eq("sender", "user").gt("created_at", since)
        .order("created_at", { ascending: false }).limit(1);
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      return jsonResponse({ count: count ?? 0, latest: data?.[0]?.created_at ?? null });
    } catch (_e) {
      return jsonResponse({ error: "Erreur serveur" }, 500);
    }
  }

  if (!OWNER_EMAIL || !OWNER_SECRET) return jsonResponse({ error: "Configuration serveur incomplète" }, 500);
  if (normalize(body.email) !== OWNER_EMAIL || normalize(body.secret) !== OWNER_SECRET) {
    recordFailure(ip);
    return jsonResponse({ error: "Accès refusé" }, 403);
  }
  const pw = await passwordOk(body.password);
  if (pw === "setup") return jsonResponse({ error: "PASSWORD_SETUP_REQUIRED" }, 428);
  if (pw === "bad") { recordFailure(ip); return jsonResponse({ error: "Accès refusé" }, 403); }
  agentBeat();

  try {
    if (body.action === "issue-token") {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      await supabase.from("support_owner_tokens").delete().lt("expires_at", new Date().toISOString());
      const { error } = await supabase.from("support_owner_tokens").insert({ token_hash: await sha256(token) });
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      return jsonResponse({ token });
    }

    if (body.action === "list") {
      const [pres, msgs] = await Promise.all([
        supabase.from("support_presence").select("*").order("last_seen_at", { ascending: false }),
        supabase.from("support_messages").select("device_id, body, sender, created_at")
          .order("created_at", { ascending: false }).limit(5000),
      ]);
      if (pres.error) return jsonResponse({ error: "Erreur serveur" }, 500);
      const last = new Map<string, { body: string; created_at: string }>();
      const counts = new Map<string, number>();
      for (const m of msgs.data ?? []) {
        if (!last.has(m.device_id)) last.set(m.device_id, m);
        if (m.sender === "user") counts.set(m.device_id, (counts.get(m.device_id) ?? 0) + 1);
      }
      const now = Date.now();
      const conversations = (pres.data ?? []).map((p) => ({
        ...p,
        online: now - new Date(p.last_seen_at).getTime() < ONLINE_THRESHOLD_MS,
        last_message: last.get(p.device_id)?.body ?? null,
        last_message_at: last.get(p.device_id)?.created_at ?? null,
        message_count: counts.get(p.device_id) ?? 0,
      }));
      return jsonResponse({ conversations });
    }

    if (body.action === "messages") {
      if (!body.device_id) return jsonResponse({ error: "device_id requis" }, 400);
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, sender, body, created_at")
        .eq("device_id", body.device_id)
        .order("created_at", { ascending: true });
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      return jsonResponse({ messages: data ?? [] });
    }

    if (body.action === "reply") {
      if (!body.device_id || !body.message?.trim()) return jsonResponse({ error: "device_id et message requis" }, 400);
      const { data, error } = await supabase.from("support_messages")
        .insert({ device_id: body.device_id, sender: "owner", body: body.message.trim() })
        .select("id, sender, body, created_at")
        .single();
      if (error) return jsonResponse({ error: "Erreur serveur" }, 500);
      return jsonResponse({ ok: true, message: data });
    }

    if (body.action === "delete") {
      if (!body.device_id) return jsonResponse({ error: "device_id requis" }, 400);
      await Promise.all([
        supabase.from("support_messages").delete().eq("device_id", body.device_id),
        supabase.from("support_presence").delete().eq("device_id", body.device_id),
      ]);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Action inconnue" }, 400);
  } catch (_e) {
    return jsonResponse({ error: "Erreur serveur" }, 500);
  }
});
