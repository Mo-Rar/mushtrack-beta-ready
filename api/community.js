const TABLE = "mushtrack_race_interests";
const OPEN_RUNS_TABLE = "mushtrack_open_runs";
const OPEN_RUN_PARTICIPANTS_TABLE = "mushtrack_open_run_participants";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!configured) {
    res.status(200).json({
      configured: false,
      interests: {},
      message: "Supabase non configure. La beta garde les interets localement sur l'appareil."
    });
    return;
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host || "mushtrack.app"}`);
      const kind = url.searchParams.get("kind") || "race-interests";
      if (kind === "open-runs") {
        const region = url.searchParams.get("region") || "";
        const openRuns = await getOpenRuns(region);
        res.status(200).json({ configured: true, openRuns });
        return;
      }

      const raceIds = (url.searchParams.get("raceIds") || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 80);

      const interests = raceIds.length ? await getRaceInterests(raceIds) : {};
      res.status(200).json({ configured: true, interests });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      if (body.kind === "open-run") {
        const openRun = await createOpenRun(body);
        res.status(200).json({ configured: true, openRun });
        return;
      }

      if (body.kind === "open-run-join") {
        if (body.joined === false) {
          await deleteOpenRunJoin(body.openRunId, body.deviceId);
        } else {
          await upsertOpenRunJoin(body);
        }
        res.status(200).json({ configured: true, ok: true });
        return;
      }

      if (!body.raceId || !body.deviceId) {
        res.status(400).json({ error: "raceId et deviceId sont requis." });
        return;
      }

      if (body.interested === false) {
        await deleteInterest(body.raceId, body.deviceId);
      } else {
        await upsertInterest(body);
      }

      const interests = await getRaceInterests([body.raceId]);
      res.status(200).json({ configured: true, interests });
      return;
    }

    res.status(405).json({ error: "Methode non supportee." });
  } catch (error) {
    res.status(500).json({ configured: true, error: error.message });
  }
};

async function getRaceInterests(raceIds) {
  const filter = raceIds.map((id) => JSON.stringify(id)).join(",");
  const rows = await supabaseFetch(
    `${TABLE}?race_id=in.(${filter})&select=race_id,profile_name,region,level,disciplines,status,updated_at&order=updated_at.desc`,
    { method: "GET" }
  );

  return rows.reduce((acc, row) => {
    acc[row.race_id] ||= { count: 0, people: [] };
    acc[row.race_id].count += 1;
    if (acc[row.race_id].people.length < 8) {
      acc[row.race_id].people.push({
        name: row.profile_name || "Musher",
        region: row.region || "",
        level: row.level || "",
        disciplines: row.disciplines || "",
        status: row.status || "interesse"
      });
    }
    return acc;
  }, {});
}

async function getOpenRuns(region) {
  const filter = region ? `&region=ilike.*${encodeURIComponent(region)}*` : "";
  const rows = await supabaseFetch(
    `${OPEN_RUNS_TABLE}?select=id,title,date,type,level,distance,location,region,notes,owner_name,created_at${filter}&order=date.asc&limit=80`,
    { method: "GET" }
  );
  const ids = rows.map((row) => row.id);
  const joins = ids.length ? await getOpenRunParticipants(ids) : {};
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    type: row.type,
    level: row.level,
    distance: row.distance,
    location: row.location,
    region: row.region,
    notes: row.notes,
    owner: row.owner_name,
    createdAt: row.created_at,
    participants: joins[row.id] || []
  }));
}

async function getOpenRunParticipants(openRunIds) {
  const filter = openRunIds.map((id) => JSON.stringify(id)).join(",");
  const rows = await supabaseFetch(
    `${OPEN_RUN_PARTICIPANTS_TABLE}?open_run_id=in.(${filter})&select=open_run_id,profile_name,region,level,disciplines&order=created_at.asc`,
    { method: "GET" }
  );
  return rows.reduce((acc, row) => {
    acc[row.open_run_id] ||= [];
    if (acc[row.open_run_id].length < 12) {
      acc[row.open_run_id].push({
        name: row.profile_name || "Musher",
        region: row.region || "",
        level: row.level || "",
        disciplines: row.disciplines || ""
      });
    }
    return acc;
  }, {});
}

async function createOpenRun(body) {
  const profile = body.profile || {};
  const id = body.id || `open-run-${Date.now()}`;
  const rows = await supabaseFetch(`${OPEN_RUNS_TABLE}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      title: body.title,
      date: body.date,
      type: body.type,
      level: body.level,
      distance: Number(body.distance || 0),
      location: body.location || "",
      region: body.region || profile.region || "",
      notes: body.notes || "",
      owner_device_id: body.deviceId,
      owner_name: profile.name || "Musher"
    })
  });
  await upsertOpenRunJoin({ openRunId: id, deviceId: body.deviceId, profile });
  return rows[0] || { id };
}

async function upsertOpenRunJoin(body) {
  const profile = body.profile || {};
  await supabaseFetch(`${OPEN_RUN_PARTICIPANTS_TABLE}?on_conflict=open_run_id,device_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      open_run_id: body.openRunId,
      device_id: body.deviceId,
      profile_name: profile.name || "Musher",
      region: profile.region || "",
      level: profile.level || "",
      disciplines: profile.disciplines || ""
    })
  });
}

async function deleteOpenRunJoin(openRunId, deviceId) {
  await supabaseFetch(`${OPEN_RUN_PARTICIPANTS_TABLE}?open_run_id=eq.${encodeURIComponent(openRunId)}&device_id=eq.${encodeURIComponent(deviceId)}`, {
    method: "DELETE"
  });
}

async function upsertInterest(body) {
  const profile = body.profile || {};
  await supabaseFetch(`${TABLE}?on_conflict=race_id,device_id`, {
    method: "POST",
    headers: {
      "Prefer": "resolution=merge-duplicates"
    },
    body: JSON.stringify({
      race_id: body.raceId,
      race_name: body.raceName || "",
      device_id: body.deviceId,
      profile_name: profile.name || "Musher",
      region: profile.region || "",
      level: profile.level || "",
      disciplines: profile.disciplines || "",
      status: body.status || "interesse",
      updated_at: new Date().toISOString()
    })
  });
}

async function deleteInterest(raceId, deviceId) {
  await supabaseFetch(`${TABLE}?race_id=eq.${encodeURIComponent(raceId)}&device_id=eq.${encodeURIComponent(deviceId)}`, {
    method: "DELETE"
  });
}

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
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
