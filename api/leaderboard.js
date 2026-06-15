const TABLE = "mushtrack_leaderboard";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!configured) {
    return res.status(200).json({ configured: false, entries: [] });
  }

  try {
    if (req.method === "GET") {
      const url   = new URL(req.url, `https://${req.headers.host}`);
      const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
      const rows  = await supabaseFetch(
        `${TABLE}?month=eq.${month}&select=device_id,name,region,month_km&order=month_km.desc&limit=20`,
        { method: "GET" }
      );
      return res.status(200).json({ configured: true, entries: rows });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body.deviceId || !body.month) return res.status(400).json({ error: "deviceId et month requis" });
      await supabaseFetch(`${TABLE}?on_conflict=device_id,month`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          device_id: body.deviceId,
          name:      body.name || "Musher",
          region:    body.region || "",
          month_km:  body.monthKm || 0,
          month:     body.month,
          updated_at: new Date().toISOString()
        })
      });
      return res.status(200).json({ configured: true, ok: true });
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
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
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
    req.on("data", chunk => { body += chunk; if (body.length > 50000) req.destroy(); });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
