const seedRaces = [
  ["amundsen-race-2027", "Amundsen Race", "2027-02-20", "Longue distance", 350, "Suede Sweden Stromsund Strömsund Europe Scandinavia", "Stromsund, Suede", "Amundsen Race", "watch", "Neige", "https://www.amundsenrace.com/", "Formats AR180, AR250 et AR350. Date 2027 a verifier avec la source officielle."],
  ["finnmarkslopet-2027", "Finnmarkslopet", "2027-03-05", "Longue distance", 1200, "Norvege Norway Alta Finnmark Europe Scandinavia", "Alta, Norvege", "Finnmarkslopet", "official", "Neige", "https://finnmarkslopet.no/", "Europe longue distance. Depart 2027 annonce le 5 mars."],
  ["grande-odyssee-2027", "La Grande Odyssee Royal Canin", "2027-01-09", "Mid-distance", 400, "France Alpes Savoie Haute-Savoie Europe", "Alpes francaises", "La Grande Odyssee", "official", "Neige", "https://www.grandeodyssee.com/home", "Course par etapes du 9 au 21 janvier 2027 selon le site officiel."],
  ["yukon-quest-2027", "Yukon Quest", "2027-02-06", "Longue distance", 550, "Canada Yukon Whitehorse North America", "Whitehorse, Yukon, Canada", "Yukon Quest", "official", "Neige", "https://yukonquest.com/", "Retour annonce en 2027 avec formats YQ550 et YQ300."],
  ["iditarod-source", "Iditarod Trail Sled Dog Race", "", "Longue distance", 1000, "USA Alaska Anchorage Nome North America", "Alaska, USA", "Iditarod", "official", "Neige", "https://iditarod.com/", "Source officielle a surveiller pour dates, inscriptions et reglements."],
  ["asdra-source", "ASDRA Alaska race schedule", "", "Sprint", 12, "USA Alaska Anchorage North America", "Alaska, USA", "ASDRA", "official", "Neige", "https://asdra.org/", "Calendrier sprint et courses locales en Alaska."],
  ["ifss-calendar", "Calendrier IFSS", "", "Sprint", 12, "International Europe USA Canada World", "Europe / monde", "IFSS", "official", "Neige Dryland", "https://sleddogsport.net/", "Source internationale pour sleddog, sprint, mid-distance, dryland et championnats."],
  ["ffslc-calendar", "Calendrier FFSLC", "", "Canicross", 6, "France Europe", "France", "FFSLC", "official", "Trail", "https://ffslc.fr/", "Source officielle canicross, caniVTT, canitrottinette et ski-joering."],
  ["swiss-canicross-calendar", "Calendrier Swiss Canicross", "", "Canicross", 7, "Suisse Switzerland Europe", "Suisse", "Swiss Canicross", "official", "Trail", "https://swiss-canicross.ch/", "Calendrier suisse pour trouver les prochaines courses canicross."],
  ["ahotu-europe-canicross", "Ahotu Canicross Europe", "", "Canicross", 10, "Europe France Suisse UK Netherlands Ireland Italy", "Europe", "Ahotu", "calendar", "Trail", "https://www.ahotu.com/fr/calendrier/canicross/europe", "Calendrier public utile pour detecter de nombreuses courses canicross europeennes."],
  ["canicross-midlands-2027", "Canicross Midlands", "2027-01-16", "Dryland", 5, "United Kingdom UK England Midlands Europe", "Midlands, Royaume-Uni", "Canicross Midlands", "calendar", "Dryland", "https://www.canicrossmidlands.co.uk/race-dates", "Series canicross, bikejor et scooter avec plusieurs dates 2026/2027."],
  ["canicross-nederland-2027", "Canicross Nederland kalender", "2027-01-17", "Dryland", 5, "Netherlands Nederland Europe", "Pays-Bas", "Canicross Nederland", "calendar", "Dryland", "https://www.canicrossnederland.nl/kalender20262027.html", "Calendrier national canicross, bikejor et step."],
  ["csen-canicross-italy-2027", "Campionato Canicross CSEN", "2027-01-01", "Canicross", 6, "Italie Italy Europe", "Italie", "CSEN Cinofilia", "calendar", "Trail", "https://discipline.csencinofilia.it/calendario-gare-2027/", "Calendrier italien canicross saison 2026/2027. Dates a verifier selon manche."],
  ["canicross-ireland-2027", "Canicross Ireland events", "2027-03-21", "Canicross", 5, "Ireland Irlande Europe", "Irlande", "Canicross Ireland", "calendar", "Trail", "https://www.canicross-ireland.com/upcoming-events", "Evenements canicross irlandais saison 2026/2027."],
  ["mushing-cz-calendar", "Mushing.cz calendrier", "2027-02-17", "Sprint", 20, "Czech Republic Tchequie Europe Finland Sweden IFSS", "Europe centrale / IFSS", "Mushing.cz", "calendar", "Neige Dryland", "https://www.mushing.cz/", "Calendrier mushing d'Europe centrale avec evenements IFSS et nationaux."]
].map(([id, name, date, type, distance, region, location, source, reliability, surface, url, notes]) => ({
  id, name, date, type, distance, region, location, source, reliability, surface, url, notes
}));

const sourceChecks = [
  ["amundsen", "Amundsen Race", "https://www.amundsenrace.com/"],
  ["finnmarkslopet", "Finnmarkslopet", "https://finnmarkslopet.no/"],
  ["grande-odyssee", "La Grande Odyssee", "https://www.grandeodyssee.com/home"],
  ["yukon-quest", "Yukon Quest", "https://yukonquest.com/"],
  ["ifss", "IFSS", "https://sleddogsport.net/"],
  ["ahotu-canicross", "Ahotu Canicross Europe", "https://www.ahotu.com/fr/calendrier/canicross/europe"],
  ["canicross-midlands", "Canicross Midlands", "https://www.canicrossmidlands.co.uk/race-dates"],
  ["canicross-nederland", "Canicross Nederland", "https://www.canicrossnederland.nl/kalender20262027.html"]
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");

  const url = new URL(req.url, `https://${req.headers.host || "mushtrack.app"}`);
  const query = (url.searchParams.get("q") || "").toLowerCase();
  const type = url.searchParams.get("type") || "";
  const distance = url.searchParams.get("distance") || "";
  const surface = url.searchParams.get("surface") || "";
  const reliability = url.searchParams.get("reliability") || "";
  const deep = url.searchParams.get("deep") === "1" || url.searchParams.get("refresh") === "1";

  const sourceStatus = deep ? await checkSources() : [];
  const races = seedRaces
    .filter((race) => matchRace(race, { query, type, distance, surface, reliability }))
    .sort((a, b) => reliabilityRank(a.reliability) - reliabilityRank(b.reliability));

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    mode: deep ? "deep-source-check" : "catalog",
    races,
    sourceStatus,
    note: "Cette API interroge des sources publiques connues et retourne un radar consolide. Les reseaux sociaux prives ne sont pas accessibles automatiquement."
  });
};

function matchRace(race, filters) {
  const haystack = `${race.name} ${race.region} ${race.location} ${race.source} ${race.notes}`.toLowerCase();
  const queryMatch = !filters.query || haystack.includes(filters.query);
  const typeMatch = !filters.type || race.type === filters.type || (filters.type === "Dryland" && ["Canicross", "Dryland"].includes(race.type));
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

async function checkSources() {
  const checks = sourceChecks.map(async ([id, name, url]) => {
    const started = Date.now();
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "MushTrackRaceRadar/0.1 (+https://mushtrack.app)"
        },
        signal: AbortSignal.timeout(6500)
      });
      const text = await response.text();
      return {
        id,
        name,
        url,
        ok: response.ok,
        status: response.status,
        signal: detectRaceSignal(text),
        checkedMs: Date.now() - started
      };
    } catch (error) {
      return {
        id,
        name,
        url,
        ok: false,
        status: 0,
        signal: "Source non joignable",
        error: error.message,
        checkedMs: Date.now() - started
      };
    }
  });
  return Promise.all(checks);
}

function detectRaceSignal(text) {
  const content = String(text || "").replace(/\s+/g, " ").slice(0, 120000).toLowerCase();
  const hits = ["2027", "race", "calendar", "calendrier", "canicross", "sled", "mushing", "dryland", "sprint"]
    .filter((word) => content.includes(word));
  return hits.length ? `Signaux trouves: ${hits.join(", ")}` : "Page lue, pas de signal clair";
}
