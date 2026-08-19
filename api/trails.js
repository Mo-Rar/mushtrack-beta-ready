// /api/trails.js — pistes GPS partagées par les mushers
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !KEY)
    return res.status(200).json({ configured: false, trails: [] });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const region = url.searchParams.get("region") || "";
      let path = "mushtrack_trails?select=id,device_id,user_name,name,region,type,distance_km,geojson,created_at&is_public=eq.true&order=created_at.desc&limit=50";
      if (region) path += `&region=ilike.*${encodeURIComponent(region)}*`;
      const trails = await sb(path, "GET", KEY);
      return res.status(200).json({ configured: true, trails });
    }

    if (req.method === "POST") {
      const { deviceId, userName, name, region, type, distanceKm, geojson } = await readJson(req);
      if (!deviceId || !geojson) return res.status(400).json({ error: "deviceId et geojson requis" });
      await sb("mushtrack_trails", "POST", KEY,
        { Prefer: "return=minimal" },
        { device_id: deviceId, user_name: userName || "Musher", name: name || "Piste sans nom",
          region: region || "", type: type || "", distance_km: distanceKm || 0,
          geojson, is_public: true, created_at: new Date().toISOString() }
      );
      return res.status(200).json({ configured: true, ok: true });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const id = url.searchParams.get("id");
      const deviceId = url.searchParams.get("deviceId");
      if (!id || !deviceId) return res.status(400).json({ error: "id et deviceId requis" });
      await sb(`mushtrack_trails?id=eq.${id}&device_id=eq.${encodeURIComponent(deviceId)}`, "DELETE", KEY);
      return res.status(200).json({ configured: true, ok: true });
    }

    res.status(405).json({ error: "Methode non supportee" });
  } catch (err) {
    console.error("trails error:", err);
    res.status(500).json({ error: err.message });
  }
};

async function sb(path, method, KEY, extraHeaders = {}, body = null) {
  const opts = {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
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
