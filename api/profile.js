// /api/profile.js — lecture et écriture du profil musher public
// GET  ?slug=mo-rar          → retourne le profil public
// POST { slug, data }        → crée/met à jour le profil

const TABLE = "mushtrack_profiles";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!configured) return res.status(200).json({ configured: false });

  try {
    if (req.method === "GET") {
      const url  = new URL(req.url, `https://${req.headers.host}`);
      const slug = url.searchParams.get("slug");
      if (!slug) return res.status(400).json({ error: "slug requis" });

      const rows = await supabaseFetch(`${TABLE}?slug=eq.${encodeURIComponent(slug)}&select=slug,data,updated_at&limit=1`, { method: "GET" });
      if (!rows || rows.length === 0) return res.status(404).json({ error: "Profil non trouvé" });
      return res.status(200).json({ configured: true, profile: rows[0] });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body.slug) return res.status(400).json({ error: "slug requis" });

      // Slug: lettres minuscules, chiffres, tirets, max 40 chars
      const slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40);

      await supabaseFetch(`${TABLE}?on_conflict=slug`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          slug,
          data:       body.data || {},
          updated_at: new Date().toISOString()
        })
      });
      return res.status(200).json({ configured: true, ok: true, slug });
    }

    res.status(405).json({ error: "Méthode non supportée" });
  } catch (err) {
    res.status(500).json({ configured: true, error: err.message });
  }
};

async function supabaseFetch(path, options) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
  if (response.status === 204) return [];
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 200000) req.destroy(); });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
