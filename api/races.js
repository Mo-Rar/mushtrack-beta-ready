// Courses lues depuis Supabase (table mushtrack_races)
// Fallback sur le catalogue statique si Supabase n'est pas configuré

const seedRaces = [
  ["amundsen-race-2027", "Amundsen Race", "2027-02-20", "Longue distance", 350, "Suede Sweden Stromsund Strömsund Europe Scandinavia", "Stromsund, Suede", "Amundsen Race", "watch", "Neige", "https://www.amundsenrace.com/", "Formats AR180, AR250 et AR350."],
  ["finnmarkslopet-2027", "Finnmarkslopet", "2027-03-05", "Longue distance", 1200, "Norvege Norway Alta Finnmark Europe Scandinavia", "Alta, Norvege", "Finnmarkslopet", "official", "Neige", "https://finnmarkslopet.no/", "Europe longue distance. Depart 2027 le 5 mars."],
  ["grande-odyssee-2027", "La Grande Odyssee Royal Canin", "2027-01-09", "Mid-distance", 400, "France Alpes Savoie Haute-Savoie Europe", "Alpes francaises", "La Grande Odyssee", "official", "Neige", "https://www.grandeodyssee.com/home", "Course par etapes du 9 au 21 janvier 2027."],
  ["iditarod-source", "Iditarod Trail Sled Dog Race", "", "Longue distance", 1000, "USA Alaska Anchorage Nome North America", "Alaska, USA", "Iditarod", "official", "Neige", "https://iditarod.com/", "Source officielle a surveiller."],
  ["ffslc-calendar", "Calendrier FFSLC", "", "Canicross", 6, "France Europe", "France", "FFSLC", "official", "Trail", "https://ffslc.fr/", "Source officielle canicross France."],
  ["swiss-canicross-calendar", "Calendrier Swiss Canicross", "", "Canicross", 7, "Suisse Switzerland Europe", "Suisse", "Swiss Canicross", "official", "Trail", "https://swiss-canicross.ch/", "Calendrier suisse canicross."],
  ["ifss-calendar", "Calendrier IFSS", "", "Sprint", 12, "International Europe World", "Europe / monde", "IFSS", "official", "Neige Dryland", "https://sleddogsport.net/", "Source internationale sleddog."],
  ["ahotu-europe-canicross", "Ahotu Canicross Europe", "", "Canicross", 10, "Europe France Suisse UK Netherlands Ireland Italy", "Europe", "Ahotu", "calendar", "Trail", "https://www.ahotu.com/fr/calendrier/canicross/europe", "Calendrier canicross europeen."],
  ["canicross-midlands-2027", "Canicross Midlands", "2027-01-16", "Dryland", 5, "United Kingdom UK England Midlands Europe", "Midlands, Royaume-Uni", "Canicross Midlands", "calendar", "Dryland", "https://www.canicrossmidlands.co.uk/race-dates", "Series canicross UK."],
  ["mushing-cz-calendar", "Mushing.cz calendrier", "2027-02-17", "Sprint", 20, "Czech Republic Tchequie Europe", "Europe centrale", "Mushing.cz", "calendar", "Neige Dryland", "https://www.mushing.cz/", "Calendrier mushing Europe centrale."]
].map(([id, name, date, type, distance, region, location, source, reliability, surface, url, notes]) => ({
  id, name, date, type, distance, region, location, source, reliability, surface, url, notes
}));

// Clé anon publique — identique à app.js (lecture seule, déjà exposée côté client)
const SUPABASE_URL_DEFAULT = "https://ipfnldjrpocceptavvaf.supabase.co";
const SUPABASE_KEY_DEFAULT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZm5sZGpycG9jY2VwdGF2dmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDk0MTQsImV4cCI6MjA5NjYyNTQxNH0.FVkq0EooacG7lETDAwxJ-ArocxUYFVZVfhxdhyWFhrI";

// ── Détection de nouvelles éditions ────────────────────────────────────────

// Retire l'année en fin de nom : "Finnmarkslopet 2027" → "Finnmarkslopet"
function baseRaceName(name) {
  return (name || "").replace(/\s+(19|20)\d{2}\s*$/, "").trim();
}

// Détecte si pageText annonce une nouvelle édition pour nextYear.
// Stratégie prudente : exige un pattern de DATE précis pour cette année,
// pas seulement la présence de l'année (copyright, stats, etc.).
// Retourne { signals: "..." } si confiant, null sinon.
function detectNextEdition(race, pageText, nextYear) {
  const text = pageText.replace(/\s+/g, " ");
  const textLow = text.toLowerCase();
  if (!textLow.includes(nextYear)) return null;

  const datePatterns = [
    // "march 2028", "März 2028", "mars 2028"
    new RegExp(`(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[,\\s]+${nextYear}`, "i"),
    // "janvier 2028", "février 2028", etc.
    new RegExp(`(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\\s+${nextYear}`, "i"),
    // "2028-03-14" ou "14/03/2028" ou "14.03.2028"
    new RegExp(`${nextYear}[-/](0[1-9]|1[0-2])[-/]\\d{1,2}`),
    new RegExp(`\\b\\d{1,2}[./-](0[1-9]|1[0-2])[./-]${nextYear}\\b`),
    // "14 mars 2028" (francophone)
    new RegExp(`\\b\\d{1,2}\\s+(jan|f[eé]v|mar|avr|mai|juin|juil|ao[uû]t|sep|oct|nov|d[eé]c)[a-z]*\\.?\\s+${nextYear}\\b`, "i"),
  ];

  const match = datePatterns.find(p => p.test(text));
  if (!match) return null;

  const raw = text.match(match)?.[0] || nextYear;
  return { signals: `Date ${nextYear} détectée : "${raw.slice(0, 60).trim()}"` };
}

async function fetchFromSupabase(filters) {
  const SUPABASE_URL = process.env.SUPABASE_URL || SUPABASE_URL_DEFAULT;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY_DEFAULT;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    // Seulement les courses approuvées ou sans statut (catalogue officiel)
    const url = `${SUPABASE_URL}/rest/v1/mushtrack_races?select=*&or=(status.is.null,status.eq.approved)&order=reliability.asc`;
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
    if (!response.ok) return { id: source.id, ok: false, signal: `HTTP ${response.status}`, ms: Date.now() - started, pageText: null };
    const text = await response.text();
    const content = text.toLowerCase().replace(/\s+/g, " ").slice(0, 200000);
    const found = source.keywords.filter(kw => content.includes(kw));
    return {
      id: source.id,
      ok: true,
      signal: found.length > 0 ? `Signaux: ${found.slice(0,5).join(", ")}` : "Page ok, pas de signal",
      ms: Date.now() - started,
      pageText: text.slice(0, 200000)  // conservé pour la détection d'éditions
    };
  } catch (err) {
    return { id: source.id, ok: false, signal: `Inaccessible: ${err.message.slice(0,80)}`, ms: Date.now() - started, pageText: null };
  }
}

async function runRefresh(res) {
  const SB_URL = process.env.SUPABASE_URL || SUPABASE_URL_DEFAULT;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY_DEFAULT;
  const started = Date.now();
  const nextYear = (new Date().getFullYear() + 1).toString();
  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

  // 1. Charger les courses approuvées avec une URL (sources dynamiques)
  let approvedRaces = [];
  let sourcesToCheck = SOURCES; // fallback si Supabase inaccessible
  try {
    const r = await fetch(`${SB_URL}/rest/v1/mushtrack_races?select=*&or=(status.is.null,status.eq.approved)`, { headers: sbHeaders });
    if (r.ok) {
      const data = await r.json();
      approvedRaces = data.filter(race => race.url && race.url.startsWith("http"));
      if (approvedRaces.length > 0) {
        sourcesToCheck = approvedRaces.map(race => ({
          id: race.id,
          name: race.name,
          url: race.url,
          keywords: [nextYear, ...baseRaceName(race.name).split(/\s+/).filter(w => w.length > 3).slice(0, 2)]
        }));
      }
    }
  } catch {}

  // 2. Charger les IDs déjà détectés ou ignorés (pour ne pas recréer)
  const skipIds = new Set();
  try {
    const r = await fetch(`${SB_URL}/rest/v1/mushtrack_races?select=id&or=(status.eq.detected,status.eq.ignored)`, { headers: sbHeaders });
    if (r.ok) (await r.json()).forEach(row => skipIds.add(row.id));
  } catch {}

  // 3. Vérifier chaque source
  const settled = await Promise.allSettled(sourcesToCheck.map(checkSource));
  const results = settled.map((r, i) =>
    r.status === "fulfilled" ? r.value : { id: sourcesToCheck[i].id, ok: false, signal: "Erreur réseau", ms: 0, pageText: null }
  );

  let updated = 0;
  let detected = 0;

  for (const r of results) {
    // 4. Mettre à jour source_ok / source_signal sur la course parent
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/mushtrack_races?id=eq.${encodeURIComponent(r.id)}`, {
        method: "PATCH",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ last_checked: new Date().toISOString(), source_ok: r.ok, source_signal: r.signal })
      });
      if (resp.ok) updated++;
    } catch {}

    // 5. Détecter une nouvelle édition si la source est accessible et retourne du texte
    if (!r.ok || !r.pageText) continue;
    const parentRace = approvedRaces.find(race => race.id === r.id);
    if (!parentRace) continue;

    const detectedId = `detected-${r.id}-${nextYear}`;
    if (skipIds.has(detectedId)) continue; // déjà traité (détecté ou ignoré)

    const detection = detectNextEdition(parentRace, r.pageText, nextYear);
    if (!detection) continue;

    // 6. Vérifier qu'une course similaire n'existe pas déjà dans Supabase
    const proposedName = `${baseRaceName(parentRace.name)} ${nextYear}`;
    try {
      await fetch(`${SB_URL}/rest/v1/mushtrack_races`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          id: detectedId,
          name: proposedName,
          type: parentRace.type || "",
          distance: parentRace.distance || 0,
          region: parentRace.region || "",
          location: parentRace.location || "",
          url: parentRace.url,
          reliability: parentRace.reliability || "watch",
          surface: parentRace.surface || "",
          source: parentRace.id,        // lien vers la course précédente
          notes: `Détection automatique — ${detection.signals}`,
          status: "detected",
          source_signal: detection.signals,
          source_ok: true,
          last_checked: new Date().toISOString()
        })
      });
      detected++;
      skipIds.add(detectedId);
    } catch {}
  }

  return res.status(200).json({
    ok: true,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    sourcesChecked: results.length,
    supabaseUpdated: updated,
    newEditionsDetected: detected,
    results: results.map(({ pageText, ...rest }) => rest) // pageText exclu de la réponse
  });
}
// ─────────────────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const url = new URL(req.url, `https://${req.headers.host || "mushtrack.app"}`);

  if (url.searchParams.get("action") === "refresh") return runRefresh(res);

  // Pas de cache si refresh forcé (admin), sinon 5 min CDN + 1h stale
  if (url.searchParams.has("nocache")) {
    res.setHeader("Cache-Control", "no-store");
  } else {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  }

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
