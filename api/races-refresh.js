// Cron job quotidien — vérifie les sources de courses et met à jour Supabase
// Déclenché automatiquement chaque jour à 8h via vercel.json

const SOURCES = [
  {
    id: "ifss-calendar",
    name: "Calendrier IFSS",
    url: "https://sleddogsport.net/",
    keywords: ["2026", "2027", "race", "calendar", "championship", "sprint", "distance"]
  },
  {
    id: "ffslc-calendar",
    name: "Calendrier FFSLC",
    url: "https://ffslc.fr/",
    keywords: ["2026", "2027", "canicross", "calendrier", "course", "competition"]
  },
  {
    id: "swiss-canicross-calendar",
    name: "Swiss Canicross",
    url: "https://swiss-canicross.ch/",
    keywords: ["2026", "2027", "canicross", "calendrier", "kalender", "course"]
  },
  {
    id: "finnmarkslopet-2027",
    name: "Finnmarkslopet",
    url: "https://finnmarkslopet.no/",
    keywords: ["2027", "march", "mars", "start", "registration", "inscriptions"]
  },
  {
    id: "grande-odyssee-2027",
    name: "La Grande Odyssée",
    url: "https://www.grandeodyssee.com/home",
    keywords: ["2027", "janvier", "january", "depart", "start", "alpes"]
  },
  {
    id: "yukon-quest-2027",
    name: "Yukon Quest",
    url: "https://yukonquest.com/",
    keywords: ["2027", "february", "fevrier", "whitehorse", "registration", "inscriptions"]
  },
  {
    id: "iditarod-source",
    name: "Iditarod",
    url: "https://iditarod.com/",
    keywords: ["2027", "march", "mars", "anchorage", "registration", "musher"]
  },
  {
    id: "ahotu-europe-canicross",
    name: "Ahotu Canicross Europe",
    url: "https://www.ahotu.com/fr/calendrier/canicross/europe",
    keywords: ["2026", "2027", "canicross", "course", "km", "france", "europe"]
  },
  {
    id: "amundsen-race-2027",
    name: "Amundsen Race",
    url: "https://www.amundsenrace.com/",
    keywords: ["2027", "february", "fevrier", "stromsund", "ar180", "ar350"]
  }
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

    // Détection des signaux
    const found = source.keywords.filter(kw => content.includes(kw.toLowerCase()));
    const signal = found.length > 0
      ? `Signaux: ${found.slice(0, 5).join(", ")}`
      : "Page accessible, aucun signal clair";

    // Extraction de dates (format yyyy-mm-dd ou dd/mm/yyyy ou Month yyyy)
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
      signal: datesFound.length > 0 ? `${signal} | Dates: ${datesFound.slice(0, 3).join(", ")}` : signal,
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

  // Vérifie toutes les sources en parallèle
  const results = await Promise.all(SOURCES.map(checkSource));

  // Met à jour Supabase avec les résultats
  const { updated, error } = await updateSupabase(results);

  const summary = results.map(r => ({
    id: r.id,
    ok: r.ok,
    signal: r.signal,
    ms: r.ms
  }));

  res.status(200).json({
    ok: true,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    sourcesChecked: results.length,
    supabaseUpdated: updated,
    supabaseError: error || null,
    results: summary
  });
};
