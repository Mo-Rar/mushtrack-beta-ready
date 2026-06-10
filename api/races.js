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

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const url = new URL(req.url, `https://${req.headers.host || "mushtrack.app"}`);
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
