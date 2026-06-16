// /api/challenges.js — defis hebdomadaires MushTrack
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return res.status(200).json({ configured: false });

  try {
    if (req.method === "GET") {
      // Defi actif (semaine courante)
      const today = new Date().toISOString().slice(0, 10);
      const challenges = await sb(
        `mushtrack_challenges?week_start=lte.${today}&week_end=gte.${today}&order=week_start.desc&limit=1`,
        "GET"
      );
      if (!challenges.length) return res.status(200).json({ configured: true, challenge: null });

      const challenge = challenges[0];
      const entries = await sb(
        `mushtrack_challenge_entries?challenge_id=eq.${challenge.id}&order=km.desc&limit=20&select=device_id,user_name,km`,
        "GET"
      );
      return res.status(200).json({ configured: true, challenge, entries });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const { challengeId, deviceId, userName, km } = body;
      if (!challengeId || !deviceId) return res.status(400).json({ error: "challengeId et deviceId requis" });

      await sb(
        `mushtrack_challenge_entries?on_conflict=challenge_id,device_id`,
        "POST",
        { Prefer: "resolution=merge-duplicates" },
        { challenge_id: challengeId, device_id: deviceId, user_name: userName || "Musher", km: Number(km) || 0, updated_at: new Date().toISOString() }
      );
      return res.status(200).json({ configured: true, ok: true });
    }

    res.status(405).json({ error: "Methode non supportee" });
  } catch (err) {
    console.error("challenges error:", err);
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
