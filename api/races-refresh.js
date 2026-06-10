// Cron job quotidien — vérifie les sources de courses mondiales et met à jour Supabase
// Déclenché automatiquement chaque jour à 8h via vercel.json

const SOURCES = [
  // ── Fédérations internationales ─────────────────────────────
  { id: "ifss-calendar", name: "IFSS Competition Calendar", url: "https://sleddogsport.net/events/", keywords: ["2026", "2027", "race", "championship", "sprint", "distance", "calendar"] },
  { id: "icf-canicross", name: "ICF International Canicross Federation", url: "https://canicross.international/", keywords: ["2026", "2027", "canicross", "world", "championship", "bikejor", "scooter"] },
  { id: "asdra-source", name: "ASDRA Alaska", url: "https://asdra.org/", keywords: ["2026", "2027", "race", "sprint", "alaska", "schedule"] },
  { id: "isdra-source", name: "ISDRA", url: "https://www.isdra.org/", keywords: ["2026", "2027", "race", "sled", "dog", "calendar", "schedule"] },
  { id: "wsa-source", name: "World Sleddog Association WSA", url: "https://www.worldsleddogassociation.org/", keywords: ["2026", "2027", "race", "championship", "world"] },

  // ── Grandes courses ─────────────────────────────────────────
  { id: "iditarod-source", name: "Iditarod", url: "https://iditarod.com/", keywords: ["2027", "march", "mars", "anchorage", "registration", "musher", "2026"] },
  { id: "finnmarkslopet-2027", name: "Finnmarkslopet", url: "https://finnmarkslopet.no/", keywords: ["2027", "march", "mars", "start", "registration", "alta"] },
  { id: "yukon-quest-2027", name: "Yukon Quest", url: "https://yukonquest.com/", keywords: ["2027", "february", "fevrier", "whitehorse", "yq550", "yq300"] },
  { id: "amundsen-race-2027", name: "Amundsen Race", url: "https://www.amundsenrace.com/", keywords: ["2027", "february", "stromsund", "ar180", "ar250", "ar350"] },
  { id: "grande-odyssee-2027", name: "La Grande Odyssée", url: "https://www.grandeodyssee.com/home", keywords: ["2027", "janvier", "january", "alpes", "savoie", "depart"] },
  { id: "up200-race", name: "UP 200 Michigan", url: "https://up200.org/schedule", keywords: ["2026", "2027", "february", "marquette", "michigan", "schedule"] },
  { id: "tahquamenon-race", name: "Tahquamenon Country Sled Dog Race", url: "https://tcsdr.org/", keywords: ["2026", "2027", "race", "michigan", "sled", "dog"] },

  // ── Agrégateurs de calendriers ───────────────────────────────
  { id: "sleddogcentral-calendar", name: "Sled Dog Central Race Schedules", url: "https://sleddogcentral.com/schedules/race_schedules.htm", keywords: ["2026", "2027", "race", "schedule", "sled", "dog", "mushing"] },
  { id: "ahotu-europe-canicross", name: "Ahotu Canicross Europe", url: "https://www.ahotu.com/fr/calendrier/canicross/europe", keywords: ["2026", "2027", "canicross", "course", "km", "france", "europe"] },
  { id: "ahotu-world-canicross", name: "Ahotu Canicross Monde", url: "https://www.ahotu.com/calendar/dog-run", keywords: ["2026", "2027", "canicross", "dog", "run", "race", "world"] },
  { id: "findarace-canicross", name: "Find A Race UK Canicross", url: "https://findarace.com/canicross", keywords: ["2026", "2027", "canicross", "uk", "race", "event"] },
  { id: "finishers-canicross", name: "Finishers Canicross Europe", url: "https://www.finishers.com/en/tags/canitrail-and-canicross", keywords: ["2026", "2027", "canicross", "canitrail", "race", "course"] },
  { id: "racecalendar-canicross", name: "Race Calendar Canicross", url: "https://www.race-calendar.com/tag/cani-cross", keywords: ["2026", "2027", "canicross", "race", "event"] },
  { id: "nonstopdogwear-calendar", name: "Non-Stop Dogwear Activity Calendar", url: "https://www.nonstopdogwear.com/en/activity-calendar/", keywords: ["2026", "2027", "race", "event", "mushing", "canicross", "bikejor"] },

  // ── Fédérations nationales Europe ───────────────────────────
  { id: "ffslc-calendar", name: "FFSLC France", url: "https://ffslc.fr/", keywords: ["2026", "2027", "canicross", "calendrier", "course", "competition"] },
  { id: "swiss-canicross-calendar", name: "Swiss Canicross", url: "https://swiss-canicross.ch/", keywords: ["2026", "2027", "canicross", "calendrier", "kalender", "course"] },
  { id: "canicross-uk-calendar", name: "Canicross UK Trailrunners", url: "https://www.canicross.org.uk/racecalendar", keywords: ["2026", "2027", "canicross", "race", "uk", "calendar"] },
  { id: "canicross-ireland-2027", name: "Canicross Ireland", url: "https://www.canicross-ireland.com/upcoming-events", keywords: ["2026", "2027", "canicross", "ireland", "event"] },
  { id: "canicross-midlands-2027", name: "Canicross Midlands UK", url: "https://www.canicrossmidlands.co.uk/race-dates", keywords: ["2026", "2027", "canicross", "bikejor", "scooter", "midlands"] },
  { id: "canicross-nederland-2027", name: "Canicross Nederland", url: "https://www.canicrossnederland.nl/", keywords: ["2026", "2027", "canicross", "nederland", "kalender", "bikejor"] },
  { id: "csen-canicross-italy-2027", name: "CSEN Canicross Italie", url: "https://discipline.csencinofilia.it/calendario-gare-2027/", keywords: ["2026", "2027", "canicross", "gare", "calendario", "italia"] },
  { id: "mushing-cz-calendar", name: "Mushing.cz Europe centrale", url: "https://www.mushing.cz/", keywords: ["2026", "2027", "mushing", "race", "calendar", "czech", "europe"] },
  { id: "canicross-club-uk", name: "The Canicross Club UK", url: "https://canicross.club/races", keywords: ["2026", "2027", "canicross", "race", "uk", "event"] },

  // ── Scandinavie ──────────────────────────────────────────────
  { id: "sdsf-sweden", name: "SDSF Sweden Sled Dog", url: "https://www.sdsf.nu/", keywords: ["2026", "2027", "race", "tävling", "kalender", "sweden", "sleddog"] },
  { id: "nkk-norway", name: "NKK Norway Sleddog", url: "https://www.nkk.no/", keywords: ["2026", "2027", "race", "kalender", "sleddog", "norway", "mushing"] },

  // ── Amérique du Nord ─────────────────────────────────────────
  { id: "adma-alaska", name: "Alaska Dog Mushers Association", url: "https://sleddog.org/", keywords: ["2026", "2027", "race", "fairbanks", "alaska", "sprint", "schedule"] },
  { id: "isdvma-races", name: "ISDVMA Race Information", url: "https://isdvma.org/race-information/", keywords: ["2026", "2027", "race", "sled", "dog", "mushing", "list"] }
];

async function checkSource(source) {
  const started = Date.now();
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "MushTrackRaceRadar/1.0 (+https://mushtrack.app; race calendar bot)"
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!response.ok) {
      return { id: source.id, ok: false, signal: `HTTP ${response.status}`, ms: Date.now() - started };
    }

    const text = await response.text();
    const content = text.toLowerCase().replace(/\s+/g, " ").slice(0, 200000);

    const found = source.keywords.filter(kw => content.includes(kw.toLowerCase()));
    const signal = found.length > 0
      ? `Signaux: ${found.slice(0, 6).join(", ")}`
      : "Page accessible, aucun signal clair";

    // Extraction de dates
    const datePatterns = [
      /202[6-9]-\d{2}-\d{2}/g,
      /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]202[6-9]/g,
      /(january|february|march|april|november|december|janvier|fevrier|mars|novembre|decembre)\s+202[6-9]/gi
    ];
    const datesFound = [];
    for (const pattern of datePatterns) {
      const matches = content.match(pattern) || [];
      datesFound.push(...matches.slice(0, 3));
    }

    return {
      id: source.id,
      ok: true,
      signal: datesFound.length > 0
        ? `${signal} | Dates: ${[...new Set(datesFound)].slice(0, 4).join(", ")}`
        : signal,
      ms: Date.now() - started
    };
  } catch (err) {
    return {
      id: source.id,
      ok: false,
      signal: `Inaccessible: ${err.message.slice(0, 80)}`,
      ms: Date.now() - started
    };
  }
}

async function updateSupabase(results) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return { updated: 0, error: "Supabase non configuré" };

  const now = new Date().toISOString();
  let updated = 0;

  for (const result of results) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/mushtrack_races?id=eq.${encodeURIComponent(result.id)}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          last_checked: now,
          source_ok: result.ok,
          source_signal: result.signal
        })
      });
      if (res.ok) updated++;
    } catch {
      // Continue même si une mise à jour échoue
    }
  }

  return { updated };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const startedAt = Date.now();

  // Vérifie toutes les sources en parallèle (par lots de 10 pour éviter timeout)
  const results = [];
  for (let i = 0; i < SOURCES.length; i += 10) {
    const batch = SOURCES.slice(i, i + 10);
    const batchResults = await Promise.all(batch.map(checkSource));
    results.push(...batchResults);
  }

  // Met à jour Supabase
  const { updated, error } = await updateSupabase(results);

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  res.status(200).json({
    ok: true,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    sourcesChecked: results.length,
    sourcesOk: ok,
    sourcesFailed: failed,
    supabaseUpdated: updated,
    supabaseError: error || null,
    results: results.map(r => ({ id: r.id, ok: r.ok, signal: r.signal, ms: r.ms }))
  });
};
