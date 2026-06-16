// /api/feed.js — fil d'activité communautaire MushTrack
const FEED_TABLE      = "mushtrack_feed";
const REACT_TABLE     = "mushtrack_feed_reactions";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(200).json({ configured: false, posts: [] });
  }

  try {
    if (req.method === "GET") {
      const limit = 30;
      const posts = await sb(`${FEED_TABLE}?select=*&order=created_at.desc&limit=${limit}`, "GET");
      if (!posts.length) return res.status(200).json({ configured: true, posts: [] });

      const ids = posts.map(p => p.id);
      const filter = ids.map(id => `"${id}"`).join(",");
      const reactions = await sb(`${REACT_TABLE}?post_id=in.(${filter})&select=post_id,device_id`, "GET");

      const reactionMap = {};
      for (const r of reactions) {
        reactionMap[r.post_id] = reactionMap[r.post_id] || [];
        reactionMap[r.post_id].push(r.device_id);
      }

      return res.status(200).json({
        configured: true,
        posts: posts.map(p => ({
          ...p,
          reactions: reactionMap[p.id] || []
        }))
      });
    }

    if (req.method === "POST") {
      const body = await readJson(req);

      // Réaction 🐕
      if (body.kind === "react") {
        const { postId, deviceId, active } = body;
        if (!postId || !deviceId) return res.status(400).json({ error: "postId et deviceId requis" });
        if (active) {
          await sb(`${REACT_TABLE}?on_conflict=post_id,device_id`, "POST",
            { Prefer: "resolution=merge-duplicates" },
            { post_id: postId, device_id: deviceId }
          );
        } else {
          await sb(`${REACT_TABLE}?post_id=eq.${postId}&device_id=eq.${encodeURIComponent(deviceId)}`, "DELETE");
        }
        return res.status(200).json({ configured: true, ok: true });
      }

      // Nouveau post
      const { deviceId, userName, region, level, km, duration, type, dogNames, dogCount, notes, photoUrl } = body;
      if (!deviceId) return res.status(400).json({ error: "deviceId requis" });

      const row = await sb(`${FEED_TABLE}`, "POST",
        { Prefer: "return=representation" },
        {
          device_id: deviceId,
          user_name: userName || "Musher",
          region: region || "",
          level: level || "",
          km: Number(km) || 0,
          duration: Number(duration) || 0,
          type: type || "",
          dog_names: dogNames || "",
          dog_count: Number(dogCount) || 0,
          notes: (notes || "").slice(0, 300),
          photo_url: photoUrl || ""
        }
      );
      return res.status(200).json({ configured: true, post: row[0] });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const id = url.searchParams.get("id");
      const deviceId = url.searchParams.get("deviceId");
      if (!id || !deviceId) return res.status(400).json({ error: "id et deviceId requis" });
      await sb(`${FEED_TABLE}?id=eq.${id}&device_id=eq.${encodeURIComponent(deviceId)}`, "DELETE");
      return res.status(200).json({ configured: true, ok: true });
    }

    res.status(405).json({ error: "Méthode non supportée" });
  } catch (err) {
    console.error("feed error:", err);
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
    req.on("data", c => { body += c; if (body.length > 50000) req.destroy(); });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch(e) { reject(e); } });
    req.on("error", reject);
  });
}
