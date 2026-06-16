// /api/clubs.js — clubs/groupes MushTrack
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return res.status(200).json({ configured: false });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const code     = url.searchParams.get("code");
      const clubId   = url.searchParams.get("clubId");
      const deviceId = url.searchParams.get("deviceId");

      // Chercher un club par code
      if (code) {
        const clubs = await sb(`mushtrack_clubs?code=eq.${encodeURIComponent(code.toUpperCase())}&limit=1`, "GET");
        if (!clubs.length) return res.status(200).json({ configured: true, club: null });
        const members = await sb(`mushtrack_club_members?club_id=eq.${clubs[0].id}&select=device_id,user_name,joined_at&order=joined_at.asc`, "GET");
        return res.status(200).json({ configured: true, club: clubs[0], members });
      }

      // Clubs d'un utilisateur
      if (deviceId) {
        const memberships = await sb(`mushtrack_club_members?device_id=eq.${encodeURIComponent(deviceId)}&select=club_id`, "GET");
        if (!memberships.length) return res.status(200).json({ configured: true, clubs: [] });
        const ids = memberships.map(m => `"${m.club_id}"`).join(",");
        const clubs = await sb(`mushtrack_clubs?id=in.(${ids})&order=created_at.desc`, "GET");
        const allMembers = await sb(`mushtrack_club_members?club_id=in.(${ids})&select=club_id,device_id,user_name`, "GET");
        const memberMap = {};
        for (const m of allMembers) {
          memberMap[m.club_id] = memberMap[m.club_id] || [];
          memberMap[m.club_id].push(m);
        }
        return res.status(200).json({ configured: true, clubs: clubs.map(c => ({ ...c, members: memberMap[c.id] || [] })) });
      }

      return res.status(400).json({ error: "code ou deviceId requis" });
    }

    if (req.method === "POST") {
      const body = await readJson(req);

      // Creer un club
      if (body.action === "create") {
        const { deviceId, userName, name, description } = body;
        if (!deviceId || !name) return res.status(400).json({ error: "deviceId et name requis" });
        const code = genCode();
        const clubs = await sb("mushtrack_clubs", "POST",
          { Prefer: "return=representation" },
          { name: name.slice(0, 60), description: (description || "").slice(0, 200), code, owner_device_id: deviceId, owner_name: userName || "Musher" }
        );
        const club = clubs[0];
        // Fondateur devient membre automatiquement
        await sb("mushtrack_club_members?on_conflict=club_id,device_id", "POST",
          { Prefer: "resolution=merge-duplicates" },
          { club_id: club.id, device_id: deviceId, user_name: userName || "Musher" }
        );
        return res.status(200).json({ configured: true, club });
      }

      // Rejoindre un club
      if (body.action === "join") {
        const { deviceId, userName, code } = body;
        if (!deviceId || !code) return res.status(400).json({ error: "deviceId et code requis" });
        const clubs = await sb(`mushtrack_clubs?code=eq.${encodeURIComponent(code.toUpperCase())}&limit=1`, "GET");
        if (!clubs.length) return res.status(200).json({ configured: true, club: null, error: "Code invalide" });
        const club = clubs[0];
        await sb("mushtrack_club_members?on_conflict=club_id,device_id", "POST",
          { Prefer: "resolution=merge-duplicates" },
          { club_id: club.id, device_id: deviceId, user_name: userName || "Musher" }
        );
        return res.status(200).json({ configured: true, club });
      }

      return res.status(400).json({ error: "action invalide" });
    }

    // Quitter un club
    if (req.method === "DELETE") {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const clubId   = url.searchParams.get("clubId");
      const deviceId = url.searchParams.get("deviceId");
      if (!clubId || !deviceId) return res.status(400).json({ error: "clubId et deviceId requis" });
      await sb(`mushtrack_club_members?club_id=eq.${clubId}&device_id=eq.${encodeURIComponent(deviceId)}`, "DELETE");
      return res.status(200).json({ configured: true, ok: true });
    }

    res.status(405).json({ error: "Methode non supportee" });
  } catch (err) {
    console.error("clubs error:", err);
    res.status(500).json({ error: err.message });
  }
};

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

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
