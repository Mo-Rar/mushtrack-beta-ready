// Suivi GPS en direct — GET (lire position) · POST (écrire position) · DELETE (arrêter)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase non configuré" });

  const url = new URL(req.url, `https://${req.headers.host}`);
  const token = url.searchParams.get("token");

  // GET — lire la position d'un tracker
  if (req.method === "GET") {
    if (!token) return res.status(400).json({ error: "token manquant" });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mushtrack_live_tracking?token=eq.${encodeURIComponent(token)}&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await r.json();
    if (!rows.length) return res.status(404).json({ error: "Session introuvable" });
    return res.status(200).json(rows[0]);
  }

  // POST — upsert position
  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { token: t, device_id, user_name, lat, lon, accuracy, sos } = body || {};
    if (!t || lat == null || lon == null) return res.status(400).json({ error: "Données manquantes" });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/mushtrack_live_tracking`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({ token: t, device_id: device_id || t, user_name: user_name || "Musher", lat, lon, accuracy: accuracy || 0, sos: sos || false, active: true, updated_at: new Date().toISOString() })
    });
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  // DELETE — désactiver la session
  if (req.method === "DELETE") {
    if (!token) return res.status(400).json({ error: "token manquant" });
    await fetch(`${SUPABASE_URL}/rest/v1/mushtrack_live_tracking?token=eq.${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ active: false, updated_at: new Date().toISOString() })
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Méthode non supportée" });
};
