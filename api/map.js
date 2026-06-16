// /api/map.js — présence carte des mushers
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return res.status(200).json({ configured: false, mushers: [] });

  try {
    if (req.method === "GET") {
      const mushers = await sb("mushtrack_map_presence?select=user_name,region,lat,lon&order=updated_at.desc", "GET");
      return res.status(200).json({ configured: true, mushers });
    }

    if (req.method === "POST") {
      const { deviceId, userName, region, lat, lon } = await readJson(req);
      if (!deviceId || lat == null || lon == null) return res.status(400).json({ error: "deviceId, lat, lon requis" });
      // Arrondir au 0.5° (~50 km de précision)
      const roundedLat = Math.round(lat * 2) / 2;
      const roundedLon = Math.round(lon * 2) / 2;
      await sb("mushtrack_map_presence?on_conflict=device_id", "POST",
        { Prefer: "resolution=merge-duplicates" },
        { device_id: deviceId, user_name: userName || "Musher", region: region || "", lat: roundedLat, lon: roundedLon, updated_at: new Date().toISOString() }
      );
      return res.status(200).json({ configured: true, ok: true });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const deviceId = url.searchParams.get("deviceId");
      if (!deviceId) return res.status(400).json({ error: "deviceId requis" });
      await sb(`mushtrack_map_presence?device_id=eq.${encodeURIComponent(deviceId)}`, "DELETE");
      return res.status(200).json({ configured: true, ok: true });
    }

    res.status(405).json({ error: "Methode non supportee" });
  } catch (err) {
    console.error("map error:", err);
    res.status(500).json({ error: err.message });
  }
};

async function sb(path, method, extraHeaders = {}, body = null) {
  const opts = {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...extraHeaders
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!r.ok) { const t = await r.text(); throw new Error(`Supabase ${r.status}: ${t}`); }
  if (r.status === 204) return [];
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch(e) { reject(e); } });
    req.on("error", reject);
  });
}
