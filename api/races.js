// Courses lues depuis Supabase (table mushtrack_races)
// Fallback sur le catalogue statique si Supabase n'est pas configuré

const seedRaces = [
  ["amundsen-race-2027", "Amundsen Race", "2027-02-20", "Longue distance", 350, "Suede Sweden Stromsund Strömsund Europe Scandinavia", "Stromsund, Suede", "Amundsen Race", "watch", "Neige", "https://www.amundsenrace.com/", "Formats AR180, AR250 et AR350."],
  ["finnmarkslopet-2027", "Finnmarkslopet", "2027-03-05", "Longue distance", 1200, "Norvege Norway Alta Finnmark Europe Scandinavia", "Alta, Norvege", "Finnmarkslopet", "official", "Neige", "https://finnmarkslopet.no/", "Europe longue distance. Depart 2027 le 5 mars."],
  ["grande-odyssee-2027", "La Grande Odyssee Royal Canin", "2027-01-09", "Mid-distance", 400, "France Alpes Savoie Haute-Savoie Europe", "Alpes francaises", "La Grande Odyssee", "official", "Neige", "https://www.grandeodyssee.com/home", "Course par etapes du 9 au 21 janvier 2027."],
  ["yukon-quest-2027", "Yukon Quest", "2027-02-06", "Longue distance", 550, "Canada Yukon Whitehorse North America", "Whitehorse, Yukon, Canada", "Yukon Quest", "official", "Neige", "https://yukonquest.com/", "Retour annonce en 2027."],
  ["iditarod-source", "Iditarod Trail Sled Dog Race", "", "Longue distance", 1000, "USA Alaska Anchorage Nome North America", "Alaska, USA", "Iditarod", "official", "Neige", "https://iditarod.com/", "Source officielle a surveiller."],
  ["ffslc-calendar", "Calendrier FFSLC", "", "Canicross", 6, "France Europe", "France", "FFSLC", "official", "Trail", "https://ffslc.fr/", "Source officielle canicross France."],
  ["swiss-canicross-calendar", "Calendrier Swiss Canicross", "", "Canicross", 7, "Suisse Switzerland Europe", "Suisse", "Swiss Canicross", "official", "Trail", "https://swiss-canicross.ch/", "Calendrier suisse canicross."],
  ["ifss-calendar", "Calendrier IFSS", "", "Sprint", 12, "International Europe USA Canada World", "Europe / monde", "IFSS", "official", "Neige Dryland", "https://sleddogsport.net/", "Source internationale sleddog."],
  ["ahotu-europe-canicross", "Ahotu Canicross Europe", "", "Canicross", 10, "Europe France Suisse UK Netherlands Ireland Italy", "Europe", "Ahotu", "calendar", "Trail", "https://www.ahotu.com/fr/calendrier/canicross/europe", "Calendrier canicross europeen."],
  ["canicross-midlands-2027", "Canicross Midlands", "2027-01-16", "Dryland", 5, "United Kingdom UK England Midlands Europe", "Midlands, Royaume-Uni", "Canicross Midlands", "calendar", "Dryland", "https://www.canicrossmidlands.co.uk/race-dates", "Series canicross UK."],
  ["mushing-cz-calendar", "Mushing.cz calendrier", "2027-02-17", "Sprint", 20, "Czech Republic Tchequie Europe", "Europe centrale", "Mushing.cz", "calendar", "Neige Dryland", "https://www.mushing.cz/", "Calendrier mushing Europe centrale."]
].map(([id, name, date, type, distance, region, location, source, reliability, surface, url, notes]) => ({
  id, name, date, type, distance, region, location, source, reliability, surface, url, notes
}));

async function fetchFromSupabase(filters) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    let url = `${SUPABASE_URL}/rest/v1/mushtrack_races?select=*&order=reliability.asc`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Refresh cron (fusionné depuis races-refresh.js) ──────────────────────────
const SOURCES = [
  { id: "ifss-calendar", name: "IFSS", url: "https://sleddogsport.net/", keywords: ["2026","2027","race","calendar","sprint","distance"] },
  { id: "ffslc-calendar", name: "FFSLC", url: "https://ffslc.fr/", keywords: ["2026","2027","canicross","calendrier","course"] },
  { id: "swiss-canicross-calendar", name: "Swiss Canicross", url: "https://swiss-canicross.ch/", keywords: ["2026","2027","canicross","course"] },
  { id: "finnmarkslopet-2027", name: "Finnmarkslopet", url: "https://finnmarkslopet.no/", keywords: ["2027","march","mars","start"] },
  { id: "grande-odyssee-2027", name: "La Grande Odyssée", url: "https://www.grandeodyssee.com/home", keywords: ["2027","janvier","january","alpes"] },
  { id: "yukon-quest-2027", name: "Yukon Quest", url: "https://yukonquest.com/", keywords: ["2027","february","whitehorse"] },
  { id: "iditarod-source", name: "Iditarod", url: "https://iditarod.com/", keywords: ["2027","march","anchorage"] },
  { id: "ahotu-europe-canicross", name: "Ahotu", url: "https://www.ahotu.com/fr/calendrier/canicross/europe", keywords: ["2026","2027","canicross"] },
  { id: "amundsen-race-2027", name: "Amundsen Race", url: "https://www.amundsenrace.com/", keywords: ["2027","february","stromsund"] }
];

async function checkSource(source) {
  const started = Date.now();
  try {
    const response = await fetch(source.url, { headers: { "User-Agent": "MushTrackRaceRadar/1.0" }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return { id: source.id, ok: false, signal: `HTTP ${response.status}`, ms: Date.now() - started };
    const text = await response.text();
    const content = text.toLowerCase().replace(/\s+/g, " ").slice(0, 200000);
    const found = source.keywords.filter(kw => content.includes(kw));
    return { id: source.id, ok: true, signal: found.length > 0 ? `Signaux: ${found.slice(0,5).join(", ")}` : "Page ok, pas de signal", ms: Date.now() - started };
  } catch (err) {
    return { id: source.id, ok: false, signal: `Inaccessible: ${err.message.slice(0,80)}`, ms: Date.now() - started };
  }
}

async function runRefresh(res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const started = Date.now();
  const results = await Promise.all(SOURCES.map(checkSource));
  let updated = 0;
  if (SUPABASE_URL && SUPABASE_KEY) {
    for (const r of results) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/mushtrack_races?id=eq.${encodeURIComponent(r.id)}`, {
          method: "PATCH",
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ last_checked: new Date().toISOString(), source_ok: r.ok, source_signal: r.signal })
        });
        if (resp.ok) updated++;
      } catch {}
    }
  }
  return res.status(200).json({ ok: true, checkedAt: new Date().toISOString(), durationMs: Date.now() - started, sourcesChecked: results.length, supabaseUpdated: updated, results });
}
// ─────────────────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const url = new URL(req.url, `https://${req.headers.host || "mushtrack.app"}`);

  if (url.searchParams.get("action") === "refresh") return runRefresh(res);

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const query = (url.searchParams.get("q") || "").toLowerCase();
  const type = url.searchParams.get("type") || "";
  const distance = url.searchParams.get("distance") || "";
  const surface = url.searchParams.get("surface") || "";
  const reliability = url.searchParams.get("reliability") || "";

  // Lecture depuis Supabase, fallback sur seedRaces
  const fromDb = await fetchFromSupabase();
  const allRaces = fromDb && fromDb.length > 0 ? fromDb : seedRaces;

  const races = allRaces
    .filter((race) => matchRace(race, { query, type, distance, surface, reliability }))
    .sort((a, b) => reliabilityRank(a.reliability) - reliabilityRank(b.reliability));

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    source: fromDb ? "supabase" : "catalog",
    count: races.length,
    races
  });
};

function matchRace(race, filters) {
  const haystack = `${race.name} ${race.region} ${race.location} ${race.source} ${race.notes}`.toLowerCase();
  const queryMatch = !filters.query || haystack.includes(filters.query);
  const typeMatch = !filters.type || race.type === filters.type;
  const surfaceMatch = !filters.surface || String(race.surface || "").includes(filters.surface);
  const reliabilityMatch = !filters.reliability || race.reliability === filters.reliability;
  const km = Number(race.distance || 0);
  const distanceMatch =
    !filters.distance ||
    (filters.distance === "short" && km <= 15) ||
    (filters.distance === "medium" && km > 15 && km <= 80) ||
    (filters.distance === "long" && km > 80);
  return queryMatch && typeMatch && surfaceMatch && reliabilityMatch && distanceMatch;
}

function reliabilityRank(value) {
  return { official: 1, calendar: 2, watch: 3, user: 4 }[value] || 5;
}
